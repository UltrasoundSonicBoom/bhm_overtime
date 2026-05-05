from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import os
import re
import shutil
import time
from pathlib import Path
from typing import Any, Sequence

os.environ.setdefault("DISABLE_TQDM", "true")

import cv2
import numpy as np
from PIL import Image

from surya.common.surya.schema import TaskNames
from surya.foundation import FoundationPredictor
from surya.recognition import RecognitionPredictor

from schedule_quality import (
    Codebook,
    GROUP_HOMOGLYPHS,
    SUMMARY_KEYS,
    UNASSIGNED_GROUP_LABEL,
    active_days_from_title,
    blocking_mismatches,
    normalize_code_token,
    split_staff_name,
    staff_role_from_name,
    validate_column_profile,
    validate_employee_summary,
)


DEFAULT_IMAGE = Path("82_2603.jpeg")
DEFAULT_OUTPUT = Path(__file__).resolve().parent / "output"
DEFAULT_CODEBOOK = Path(__file__).resolve().parent / "work_codebook.json"
DEFAULT_CORRECTIONS_DIR = Path(__file__).resolve().parent / "corrections"
DEFAULT_SCHEDULE_PROFILE_DIR = Path(__file__).resolve().parent / "schedule_profiles" / "departments"

SUMMARY_COLUMNS = SUMMARY_KEYS
HARD_VALIDATION_COLUMNS = [key for key in SUMMARY_COLUMNS if key != "T"]
LOW_CONFIDENCE = 0.75
N_BEST_MAX = 5
WORK_GROUP_LABELS = {"A", "B", "C", "D"}


def centers_from_projection(mask: np.ndarray, axis: int, min_count: int) -> list[float]:
    projection = (mask > 0).sum(axis=axis)
    indexes = np.where(projection >= min_count)[0]
    groups: list[tuple[int, int]] = []
    if len(indexes) == 0:
        return []

    start = prev = int(indexes[0])
    for value in indexes[1:]:
        value = int(value)
        if value <= prev + 2:
            prev = value
        else:
            groups.append((start, prev))
            start = prev = value
    groups.append((start, prev))
    return [round((start + end) / 2, 1) for start, end in groups]


def detect_grid(image_path: Path) -> dict[str, Any]:
    image = cv2.imread(str(image_path))
    if image is None:
        raise FileNotFoundError(f"Unable to read image: {image_path}")

    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    candidates: list[dict[str, Any]] = []
    # The first candidate is tuned for the attached 40-column work schedule.
    params = [
        (150, 5, 180, 18, 40),
        (150, 8, 120, 18, 40),
        (180, 8, 120, 18, 40),
        (180, 5, 250, 18, 40),
        (150, 5, 120, 12, 40),
    ]

    for threshold, h_kernel_size, h_min, v_kernel_size, v_min in params:
        _, binary = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY_INV)
        h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (h_kernel_size, 1))
        v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, v_kernel_size))
        h_mask = cv2.morphologyEx(binary, cv2.MORPH_OPEN, h_kernel, iterations=1)
        v_mask = cv2.morphologyEx(binary, cv2.MORPH_OPEN, v_kernel, iterations=1)

        y_lines = [
            y
            for y in centers_from_projection(h_mask, axis=1, min_count=h_min)
            if 90 <= y <= height - 5
        ]
        x_lines = [
            x
            for x in centers_from_projection(v_mask, axis=0, min_count=v_min)
            if 0 <= x <= width
        ]

        score = abs(len(x_lines) - 41) * 5 + abs(len(y_lines) - 35)
        candidates.append(
            {
                "score": score,
                "threshold": threshold,
                "h_kernel_size": h_kernel_size,
                "h_min": h_min,
                "v_kernel_size": v_kernel_size,
                "v_min": v_min,
                "x_lines": x_lines,
                "y_lines": y_lines,
            }
        )

    best = sorted(candidates, key=lambda item: item["score"])[0]
    x_lines = best["x_lines"]
    y_lines = best["y_lines"]

    if len(x_lines) != 41:
        raise RuntimeError(f"Expected 41 vertical grid lines for 40 columns, got {len(x_lines)}")
    if len(y_lines) < 8:
        raise RuntimeError(f"Could not detect enough horizontal grid lines, got {len(y_lines)}")

    return {
        "image_size": {"width": width, "height": height},
        "x_lines": x_lines,
        "y_lines": y_lines,
        "rows": len(y_lines) - 1,
        "columns": len(x_lines) - 1,
        "detection_params": {
            key: best[key]
            for key in ["threshold", "h_kernel_size", "h_min", "v_kernel_size", "v_min"]
        },
    }


def cell_bbox(x_lines: list[float], y_lines: list[float], row: int, col: int) -> list[int]:
    # Inset avoids feeding grid lines to OCR.
    return [
        int(round(x_lines[col] + 2)),
        int(round(y_lines[row] + 2)),
        int(round(x_lines[col + 1] - 2)),
        int(round(y_lines[row + 1] - 2)),
    ]


def rgb_to_hex(rgb: np.ndarray) -> str:
    channels = [int(max(0, min(255, round(float(value))))) for value in rgb]
    return "#" + "".join(f"{channel:02x}" for channel in channels)


def extract_cell_style(image_bgr: np.ndarray, bbox: list[int]) -> dict[str, Any]:
    x1, y1, x2, y2 = bbox
    height, width = image_bgr.shape[:2]
    x1 = max(0, min(width - 1, x1))
    x2 = max(0, min(width, x2))
    y1 = max(0, min(height - 1, y1))
    y2 = max(0, min(height, y2))
    if x2 <= x1 or y2 <= y1:
        return {}

    crop = image_bgr[y1:y2, x1:x2]
    if crop.size == 0:
        return {}

    rgb = crop.reshape(-1, 3)[:, ::-1].astype(np.float32)
    brightness = rgb.mean(axis=1)
    yellow_mask = (rgb[:, 0] > 180) & (rgb[:, 1] > 165) & (rgb[:, 2] < 110)
    yellow_ratio = float(yellow_mask.mean())

    if yellow_ratio >= 0.025:
        background = np.median(rgb[yellow_mask], axis=0)
        return {
            "background": rgb_to_hex(background),
            "text_color": "#111827",
            "highlight": True,
            "yellow_ratio": round(yellow_ratio, 4),
        }

    bg_mask = brightness > 120
    if int(bg_mask.sum()) < 10:
        bg_mask = brightness > 80
    if int(bg_mask.sum()) == 0:
        background = np.median(rgb, axis=0)
    else:
        background = np.median(rgb[bg_mask], axis=0)

    bg_hex = rgb_to_hex(background)
    text_color = "#111827" if float(np.mean(background)) > 145 else "#ffffff"
    return {
        "background": bg_hex,
        "text_color": text_color,
        "highlight": False,
        "yellow_ratio": round(yellow_ratio, 4),
    }


def normalize_for_display(text: str) -> str:
    return (
        text.replace("<br>", "\n")
        .replace("\r", "\n")
        .replace("\u200b", "")
        .strip()
    )


def normalize_cell(raw_text: str, role: str) -> tuple[str, list[str]]:
    flags: list[str] = []
    raw = normalize_for_display(raw_text)
    if not raw:
        return "", flags

    text = raw
    replacements = {
        "Ε": "E",
        "Е": "E",
        "Ν": "N",
        "⋆": "*",
        "★": "*",
        "∗": "*",
    }
    for old, new in replacements.items():
        if old in text:
            text = text.replace(old, new)
            flags.append("char-normalized")

    if role != "name":
        compact = re.sub(r"\s+", "", text.replace("\n", ""))
        if compact != text:
            flags.append("space-normalized")
        text = compact

    if role == "day":
        if text == "212":
            text = "리2"
            flags.append("heuristic-212-to-ri2")
        elif re.fullmatch(r"P-[0OQ]r/[0OQ]1", text, flags=re.IGNORECASE):
            text = "P-9r/91"
            flags.append("heuristic-p-0r-to-p-9r")
        elif re.fullmatch(r"[0OQ]r", text, flags=re.IGNORECASE):
            text = "9r"
            flags.append("heuristic-0r-to-9r")
        elif text == "7/45":
            text = "P-7/45"
            flags.append("heuristic-p-prefix-restored")
        elif text == "P-F/82":
            text = "P-E/82"
            flags.append("heuristic-f-to-e")
        elif text in {"En", "Fo"}:
            text = "Eo"
            flags.append("heuristic-eo-suffix")
        elif text == "1":
            text = "/"
            flags.append("heuristic-1-to-slash")
        elif text == "1*":
            text = "/*"
            flags.append("heuristic-1star-to-slashstar")

    return text, sorted(set(flags))


def n_best_candidates_for_cell(
    cell: dict[str, Any],
    codebook: Codebook | None = None,
    max_candidates: int = N_BEST_MAX,
) -> list[dict[str, Any]]:
    raw_text = str(cell.get("raw_text") or "")
    current = str(cell.get("value") or cell.get("text") or "").strip()
    if not current and raw_text:
        current = normalize_cell(raw_text, "day")[0]

    flags = set(cell.get("flags", []))
    try:
        confidence = float(cell.get("confidence") if cell.get("confidence") is not None else 0)
    except (TypeError, ValueError):
        confidence = 0.0
    low_confidence = "low-confidence" in flags or (0 < confidence < LOW_CONFIDENCE)

    candidates_by_key: dict[str, dict[str, Any]] = {}

    def add_candidate(value: str, source: str, score: float, reason: str) -> None:
        normalized_value = normalize_cell(value, "day")[0] if value else ""
        if not normalized_value:
            return
        key = normalize_code_token(normalized_value)
        if not key:
            return
        entry = codebook.lookup(normalized_value) if codebook else None
        candidate = {
            "value": normalized_value,
            "normalized": key,
            "score": round(max(0.0, min(float(score), 0.999)), 3),
            "source": source,
            "reason": reason,
            "summary_key": entry.summary_key if entry else None,
        }
        previous = candidates_by_key.get(key)
        if previous is None or candidate["score"] > previous["score"]:
            candidates_by_key[key] = candidate

    if current:
        add_candidate(
            current,
            "current",
            confidence if confidence else 0.95,
            "current normalized OCR value",
        )

    observed_tokens = {
        normalize_code_token(raw_text),
        normalize_code_token(current),
    }
    for token in sorted(token for token in observed_tokens if token):
        if re.fullmatch(r"P-[0OQ]r/[0OQ]1", token, flags=re.IGNORECASE):
            add_candidate("P-9r/91", "heuristic", 0.98, "P-0r/P-Or/P-Qr OCR confusion")
        elif re.fullmatch(r"[0OQ]r", token, flags=re.IGNORECASE):
            add_candidate("9r", "heuristic", 0.96, "0/O/Q read as 9 in 9r")
        elif token == "7/45":
            add_candidate("P-7/45", "heuristic", 0.96, "Prime prefix restored")
        elif token == "P-F/82":
            add_candidate("P-E/82", "heuristic", 0.96, "F/E confusion in Prime code")
        elif token in {"En", "Fo"}:
            add_candidate("Eo", "heuristic", 0.94, "Eo suffix OCR confusion")
        elif token == "1":
            add_candidate("/", "heuristic", 0.86, "1/slash confusion in day cell")
        elif token == "1*":
            add_candidate("/*", "heuristic", 0.86, "1*/slash-star confusion in day cell")

    current_key = normalize_code_token(current)
    if low_confidence or flags.intersection({"char-normalized", "heuristic-eo-suffix"}):
        confusable_pairs = {
            "E": "N",
            "N": "E",
            "Eo": "No",
            "No": "Eo",
        }
        alternate = confusable_pairs.get(current_key)
        if alternate:
            add_candidate(
                alternate,
                "confusable",
                max(0.05, (confidence if confidence else 0.5) - 0.11),
                f"{current_key}/{alternate} visual or OCR confusion",
            )

    candidates = sorted(
        candidates_by_key.values(),
        key=lambda item: (
            item["source"] != "current",
            -float(item["score"]),
            item["value"],
        ),
    )
    return candidates[:max_candidates]


def parse_int(value: str) -> int | None:
    value = value.strip()
    if re.fullmatch(r"-?\d+", value):
        return int(value)
    matches = re.findall(r"-?\d+", value)
    if len(matches) == 1:
        return int(matches[0])
    return None


def column_role(col: int) -> str:
    if col == 0:
        return "name"
    if col in (1, 2):
        return "number"
    if 3 <= col <= 33:
        return "day"
    return "summary"


def column_key(col: int) -> str:
    if col == 0:
        return "name"
    if col == 1:
        return "previous"
    if col == 2:
        return "remaining"
    if 3 <= col <= 33:
        return str(col - 2)
    return SUMMARY_COLUMNS[col - 34]


def clean_employee_name(value: str) -> tuple[str, str]:
    return split_staff_name(value)


def create_predictor() -> RecognitionPredictor:
    foundation = FoundationPredictor()
    predictor = RecognitionPredictor(foundation)
    for item in (foundation, predictor):
        if hasattr(item, "disable_tqdm"):
            item.disable_tqdm = True
    return predictor


def ocr_bboxes(
    predictor: RecognitionPredictor,
    image: Image.Image,
    bboxes: list[list[int]],
    task_name: str = TaskNames.ocr_without_boxes,
) -> list[dict[str, Any]]:
    prediction = predictor(
        [image],
        task_names=[task_name],
        bboxes=[bboxes],
        math_mode=False,
        sort_lines=False,
    )[0]

    if len(prediction.text_lines) != len(bboxes):
        raise RuntimeError(
            f"Surya returned {len(prediction.text_lines)} OCR lines for {len(bboxes)} boxes"
        )

    rows: list[dict[str, Any]] = []
    for bbox, line in zip(bboxes, prediction.text_lines):
        rows.append(
            {
                "bbox": bbox,
                "raw_text": normalize_for_display(line.text or ""),
                "confidence": round(float(line.confidence or 0), 4),
            }
        )
    return rows


def build_raw_grid(
    grid: dict[str, Any],
    ocr_rows: list[dict[str, Any]],
    image_bgr: np.ndarray,
) -> list[dict[str, Any]]:
    result_rows: list[dict[str, Any]] = []
    columns = grid["columns"]
    index = 0
    for row_idx in range(grid["rows"]):
        cells: list[dict[str, Any]] = []
        for col_idx in range(columns):
            ocr = ocr_rows[index]
            role = column_role(col_idx)
            text, flags = normalize_cell(ocr["raw_text"], role)
            if ocr["raw_text"] and ocr["confidence"] < LOW_CONFIDENCE:
                flags.append("low-confidence")
            cells.append(
                {
                    "row_index": row_idx,
                    "col_index": col_idx,
                    "key": column_key(col_idx),
                    "bbox": ocr["bbox"],
                    "raw_text": ocr["raw_text"],
                    "text": text,
                    "confidence": ocr["confidence"],
                    "flags": sorted(set(flags)),
                    "style": extract_cell_style(image_bgr, ocr["bbox"]),
                }
            )
            index += 1
        result_rows.append({"row_index": row_idx, "cells": cells})
    return result_rows


def correction_stem_candidates(image_path: Path) -> list[str]:
    stem = image_path.stem
    candidates = [stem]
    without_copy_suffix = re.sub(r"\s*\(\d+\)$", "", stem).strip()
    if without_copy_suffix and without_copy_suffix not in candidates:
        candidates.append(without_copy_suffix)
    return candidates


def load_cell_corrections(image_path: Path, corrections_dir: Path = DEFAULT_CORRECTIONS_DIR) -> list[dict[str, Any]]:
    for stem in correction_stem_candidates(image_path):
        path = corrections_dir / f"{stem}.json"
        if path.exists():
            data = json.loads(path.read_text(encoding="utf-8"))
            return list(data.get("cells", []))
    return []


def apply_cell_corrections(raw_rows: list[dict[str, Any]], corrections: list[dict[str, Any]]) -> None:
    by_position = {
        (int(item["row"]), int(item["col"])): item
        for item in corrections
        if "row" in item and "col" in item and "value" in item
    }
    for row in raw_rows:
        for cell in row["cells"]:
            correction = by_position.get((row["row_index"], cell["col_index"]))
            if not correction:
                continue
            role = column_role(cell["col_index"])
            text, flags = normalize_cell(str(correction["value"]), role)
            cell["text"] = text
            cell["flags"] = sorted(set([*cell.get("flags", []), *flags, "human-corrected"]))
            cell["correction"] = {
                "value": correction["value"],
                "reason": correction.get("reason", ""),
            }


def department_id_from_image(image_path: Path) -> str | None:
    digits: list[str] = []
    for char in image_path.stem:
        if char.isdigit():
            digits.append(char)
            continue
        break
    return "".join(digits) or None


def schedule_profile_path_for_image(
    image_path: Path,
    profile_dir: Path = DEFAULT_SCHEDULE_PROFILE_DIR,
) -> Path | None:
    department_id = department_id_from_image(image_path)
    if not department_id:
        return None
    path = profile_dir / f"{department_id}.json"
    return path if path.exists() else None


def load_schedule_profile(path: Path | None) -> dict[str, Any]:
    if path and path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {}


def normalized_value(cell: dict[str, Any]) -> str:
    return str(cell.get("text") or "").strip()


def build_column_stats(
    employees: list[dict[str, Any]],
    codebook: Codebook,
    active_days: int,
) -> list[dict[str, Any]]:
    stats: list[dict[str, Any]] = []
    for day in range(1, active_days + 1):
        day_key = str(day)
        counts = {key: 0 for key in SUMMARY_COLUMNS}
        code_counts: dict[str, int] = {}
        unknown_codes: set[str] = set()
        for employee in employees:
            value = employee["days"].get(day_key, "")
            normalized = normalize_code_token(value)
            if not normalized:
                continue
            code_counts[normalized] = code_counts.get(normalized, 0) + 1
            entry = codebook.lookup(value)
            if entry and entry.summary_key in counts:
                counts[entry.summary_key] += 1
            elif entry is None:
                unknown_codes.add(normalized)
        stats.append(
            {
                "day": day,
                "counts": counts,
                "work_total": counts["D"] + counts["E"] + counts["N"],
                "code_counts": dict(sorted(code_counts.items())),
                "unknown_codes": sorted(unknown_codes),
            }
        )
    return stats


def validation_hard_distance(validation: dict[str, Any]) -> int:
    distance = 0
    for key, mismatch in validation.get("blocking_mismatches", {}).items():
        if key not in HARD_VALIDATION_COLUMNS:
            continue
        computed = mismatch.get("computed")
        printed = mismatch.get("printed")
        if computed is None or printed is None:
            distance += 5
        else:
            distance += abs(int(computed) - int(printed))
    distance += len(validation.get("unknown_codes", [])) * 5
    return distance


def refresh_employee_validation(employee: dict[str, Any], codebook: Codebook, active_days: int) -> None:
    validation_day_values = {
        day: value
        for day, value in employee["days"].items()
        if int(day) <= active_days
    }
    validation = validate_employee_summary(validation_day_values, employee["summary"], codebook)
    hard_mismatches = blocking_mismatches(validation, HARD_VALIDATION_COLUMNS)
    advisory_mismatches = {
        key: value
        for key, value in validation.mismatches.items()
        if key not in HARD_VALIDATION_COLUMNS
    }
    employee["validation"] = {
        "is_valid": not hard_mismatches and not validation.unknown_codes,
        "computed_summary": validation.computed,
        "printed_summary": validation.printed,
        "mismatches": validation.mismatches,
        "blocking_mismatches": hard_mismatches,
        "advisory_mismatches": advisory_mismatches,
        "unknown_codes": validation.unknown_codes,
    }


def is_low_confidence_cell(cell: dict[str, Any]) -> bool:
    try:
        confidence = float(cell.get("confidence") if cell.get("confidence") is not None else 0)
    except (TypeError, ValueError):
        confidence = 0.0
    return "low-confidence" in set(cell.get("flags", [])) or (0 < confidence < LOW_CONFIDENCE)


def summary_support_cells(
    employee: dict[str, Any],
    summary_key: str,
    codebook: Codebook,
    active_days: int,
) -> list[dict[str, Any]]:
    cells: list[dict[str, Any]] = []
    for day in range(1, active_days + 1):
        day_key = str(day)
        value = employee.get("days", {}).get(day_key, "")
        entry = codebook.lookup(value)
        if entry and entry.summary_key == summary_key:
            cell = employee.get("day_cells", {}).get(day_key)
            if cell:
                cells.append(cell)
    return cells


def apply_summary_guided_repairs(
    employees: list[dict[str, Any]],
    codebook: Codebook,
    active_days: int,
) -> list[dict[str, Any]]:
    repairs: list[dict[str, Any]] = []
    for employee in employees:
        for key, mismatch in list(employee.get("validation", {}).get("blocking_mismatches", {}).items()):
            if key not in HARD_VALIDATION_COLUMNS:
                continue
            summary_cell = employee.get("summary_cells", {}).get(key)
            if not summary_cell or not is_low_confidence_cell(summary_cell):
                continue
            computed = mismatch.get("computed")
            printed = mismatch.get("printed")
            if not isinstance(computed, int) or computed == printed:
                continue

            support_cells = summary_support_cells(employee, key, codebook, active_days)
            strong_support = sum(
                1
                for cell in support_cells
                if not is_low_confidence_cell(cell)
            )
            if computed > 0 and strong_support < computed:
                continue

            employee["summary"][key] = computed
            summary_cell["value"] = str(computed)
            summary_cell["flags"] = sorted(set([*summary_cell.get("flags", []), "summary-guided-repair"]))
            repair = {
                "employee": employee.get("display_name", ""),
                "source_row_index": employee.get("source_row_index"),
                "summary_key": key,
                "from": printed,
                "to": computed,
                "summary_confidence": summary_cell.get("confidence"),
                "support_cells": len(support_cells),
                "strong_support_cells": strong_support,
            }
            repairs.append(repair)
            employee["warnings"] = sorted(set([*employee.get("warnings", []), "summary-guided-repair"]))
            refresh_employee_validation(employee, codebook, active_days)
    return repairs


def profile_score(employees: list[dict[str, Any]], codebook: Codebook, active_days: int, profile: dict[str, Any] | None) -> int:
    return int(validate_column_profile(build_column_stats(employees, codebook, active_days), profile).get("profile_score", 0))


def profile_repair_candidates(cell: dict[str, Any]) -> list[str]:
    value = normalize_code_token(cell.get("value", ""))
    candidates = [
        candidate["value"]
        for candidate in n_best_candidates_for_cell(cell)
        if normalize_code_token(candidate.get("value", "")) != value
    ]
    return list(dict.fromkeys(candidates))


def apply_profile_guided_repairs(
    employees: list[dict[str, Any]],
    codebook: Codebook,
    active_days: int,
    profile: dict[str, Any] | None,
) -> list[dict[str, Any]]:
    repairs: list[dict[str, Any]] = []
    if not profile:
        return repairs

    for employee in employees:
        base_distance = validation_hard_distance(employee["validation"])
        if base_distance == 0:
            continue

        base_profile_score = profile_score(employees, codebook, active_days, profile)
        best: dict[str, Any] | None = None
        for day in range(1, active_days + 1):
            day_key = str(day)
            cell = employee["day_cells"][day_key]
            original_value = employee["days"].get(day_key, "")
            for candidate in profile_repair_candidates(cell):
                employee["days"][day_key] = candidate
                cell["value"] = candidate
                refresh_employee_validation(employee, codebook, active_days)
                candidate_distance = validation_hard_distance(employee["validation"])
                candidate_profile_score = profile_score(employees, codebook, active_days, profile)

                if candidate_distance < base_distance and candidate_profile_score <= base_profile_score:
                    candidate_repair = {
                        "employee": employee["display_name"],
                        "source_row_index": employee["source_row_index"],
                        "day": day,
                        "from": original_value,
                        "to": candidate,
                        "row_distance_before": base_distance,
                        "row_distance_after": candidate_distance,
                        "profile_score_before": base_profile_score,
                        "profile_score_after": candidate_profile_score,
                    }
                    if best is None or (
                        candidate_distance,
                        candidate_profile_score,
                    ) < (
                        best["row_distance_after"],
                        best["profile_score_after"],
                    ):
                        best = candidate_repair

                employee["days"][day_key] = original_value
                cell["value"] = original_value
                refresh_employee_validation(employee, codebook, active_days)

        if best:
            day_key = str(best["day"])
            cell = employee["day_cells"][day_key]
            employee["days"][day_key] = best["to"]
            cell["value"] = best["to"]
            cell["flags"] = sorted(set([*cell.get("flags", []), "profile-guided-repair"]))
            cell["candidates"] = n_best_candidates_for_cell(cell, codebook)
            refresh_employee_validation(employee, codebook, active_days)
            employee["warnings"] = sorted(set([*employee.get("warnings", []), "profile-guided-repair"]))
            repairs.append(best)

    return repairs


def row_nonempty_count(cells: list[dict[str, Any]]) -> int:
    return sum(1 for cell in cells if normalized_value(cell))


def is_blank_row(cells: list[dict[str, Any]]) -> bool:
    return row_nonempty_count(cells) == 0


def is_work_group_row(cells: list[dict[str, Any]]) -> str | None:
    first = re.sub(r"\s+", "", normalized_value(cells[0])).upper()
    first = GROUP_HOMOGLYPHS.get(first, first)
    noisy_non_first = [
        cell
        for cell in cells[1:]
        if normalized_value(cell) and cell.get("confidence", 0) >= LOW_CONFIDENCE
    ]
    if first in WORK_GROUP_LABELS and not noisy_non_first:
        return first
    return None


def build_schedule_json(
    image_path: Path,
    copied_image_name: str,
    grid: dict[str, Any],
    raw_grid: list[dict[str, Any]],
    header_ocr: list[dict[str, Any]],
    elapsed_seconds: float,
    codebook: Codebook,
    applied_codebook_paths: list[str] | None = None,
    schedule_profile: dict[str, Any] | None = None,
    applied_schedule_profile_path: str | None = None,
) -> dict[str, Any]:
    title = header_ocr[0]["raw_text"] if header_ocr else ""
    printed_at = header_ocr[1]["raw_text"] if len(header_ocr) > 1 else ""
    active_days = active_days_from_title(title)
    current_group: str | None = None
    section_index = 0
    employees: list[dict[str, Any]] = []

    for row in raw_grid:
        for cell in row["cells"]:
            if column_role(int(cell["col_index"])) == "day":
                candidates = n_best_candidates_for_cell(
                    {
                        "raw_text": cell.get("raw_text", ""),
                        "value": normalized_value(cell),
                        "confidence": cell.get("confidence", 0),
                        "flags": cell.get("flags", []),
                    },
                    codebook,
                )
                if candidates:
                    cell["candidates"] = candidates

    for row in raw_grid:
        cells = row["cells"]
        first = normalized_value(cells[0])
        group_label = is_work_group_row(cells)

        if group_label is not None:
            current_group = group_label
            section_index += 1
            continue

        if is_blank_row(cells):
            current_group = None
            section_index += 1
            continue

        if not staff_role_from_name(first):
            continue

        role, name = clean_employee_name(first)
        day_cells = {
            str(day): cells[day + 2]
            for day in range(1, 32)
        }
        summary_cells = {
            summary_key: cells[col_idx]
            for summary_key, col_idx in zip(SUMMARY_COLUMNS, range(34, 40))
        }
        day_values = {
            day: normalized_value(cell)
            for day, cell in day_cells.items()
        }
        validation_day_values = {
            day: value
            for day, value in day_values.items()
            if int(day) <= active_days
        }
        printed_summary = {
            key: parse_int(normalized_value(cell))
            for key, cell in summary_cells.items()
        }
        validation = validate_employee_summary(validation_day_values, printed_summary, codebook)
        hard_mismatches = blocking_mismatches(validation, HARD_VALIDATION_COLUMNS)
        advisory_mismatches = {
            key: value
            for key, value in validation.mismatches.items()
            if key not in hard_mismatches
        }
        validation_is_valid = not hard_mismatches and not validation.unknown_codes

        employee_warnings = sorted(
            {
                flag
                for cell in cells
                for flag in cell.get("flags", [])
                if normalized_value(cell)
            }
        )

        employees.append(
            {
                "group": current_group,
                "group_display": current_group or UNASSIGNED_GROUP_LABEL,
                "section_index": section_index,
                "role": role,
                "name": name,
                "display_name": f"{role} {name}".strip() if role else first,
                "previous": parse_int(normalized_value(cells[1])),
                "remaining": parse_int(normalized_value(cells[2])),
                "name_cell": {
                    "value": normalized_value(cells[0]),
                    "raw_text": cells[0]["raw_text"],
                    "confidence": cells[0]["confidence"],
                    "bbox": cells[0]["bbox"],
                    "flags": cells[0]["flags"],
                    "style": cells[0]["style"],
                },
                "previous_cell": {
                    "value": normalized_value(cells[1]),
                    "raw_text": cells[1]["raw_text"],
                    "confidence": cells[1]["confidence"],
                    "bbox": cells[1]["bbox"],
                    "flags": cells[1]["flags"],
                    "style": cells[1]["style"],
                },
                "remaining_cell": {
                    "value": normalized_value(cells[2]),
                    "raw_text": cells[2]["raw_text"],
                    "confidence": cells[2]["confidence"],
                    "bbox": cells[2]["bbox"],
                    "flags": cells[2]["flags"],
                    "style": cells[2]["style"],
                },
                "days": {
                    day: value
                    for day, value in day_values.items()
                },
                "summary": printed_summary,
                "validation": {
                    "is_valid": validation_is_valid,
                    "computed_summary": validation.computed,
                    "printed_summary": validation.printed,
                    "mismatches": validation.mismatches,
                    "blocking_mismatches": hard_mismatches,
                    "advisory_mismatches": advisory_mismatches,
                    "unknown_codes": validation.unknown_codes,
                },
                "day_cells": {
                    day: {
                        "value": normalized_value(cell),
                        "raw_text": cell["raw_text"],
                        "confidence": cell["confidence"],
                        "bbox": cell["bbox"],
                        "flags": cell["flags"],
                        "style": cell["style"],
                        "candidates": cell.get("candidates", []),
                    }
                    for day, cell in day_cells.items()
                },
                "summary_cells": {
                    key: {
                        "value": normalized_value(cell),
                        "raw_text": cell["raw_text"],
                        "confidence": cell["confidence"],
                        "bbox": cell["bbox"],
                        "flags": cell["flags"],
                        "style": cell["style"],
                    }
                    for key, cell in summary_cells.items()
                },
                "source_row_index": row["row_index"],
                "warnings": employee_warnings,
            }
        )

    summary_guided_repairs = apply_summary_guided_repairs(employees, codebook, active_days)
    profile_guided_repairs = apply_profile_guided_repairs(employees, codebook, active_days, schedule_profile)

    invalid_rows = [
        employee for employee in employees if not employee["validation"]["is_valid"]
    ]
    advisory_rows = [
        employee for employee in employees if employee["validation"].get("advisory_mismatches")
    ]
    unknown_codes = sorted(
        {
            code
            for employee in employees
            for code in employee["validation"]["unknown_codes"]
        }
    )
    column_stats = build_column_stats(employees, codebook, active_days)
    column_validation = validate_column_profile(column_stats, schedule_profile)
    n_best_candidate_cells = sum(
        1
        for employee in employees
        for day, cell in employee["day_cells"].items()
        if int(day) <= active_days and len(cell.get("candidates", [])) > 1
    )
    n_best_candidates_total = sum(
        len(cell.get("candidates", []))
        for employee in employees
        for day, cell in employee["day_cells"].items()
        if int(day) <= active_days and len(cell.get("candidates", [])) > 1
    )

    return {
        "document_type": "nurse_work_schedule",
        "source_image": str(image_path),
        "image_asset": copied_image_name,
        "generated_at": dt.datetime.now().isoformat(timespec="seconds"),
        "elapsed_seconds": round(elapsed_seconds, 2),
        "title": title,
        "printed_at": printed_at,
        "active_days": active_days,
        "grid": {
            "rows": grid["rows"],
            "columns": grid["columns"],
            "x_lines": grid["x_lines"],
            "y_lines": grid["y_lines"],
            "detection_params": grid["detection_params"],
        },
        "quality": {
            "employee_count": len(employees),
            "valid_employee_rows": len(employees) - len(invalid_rows),
            "invalid_employee_rows": len(invalid_rows),
            "advisory_employee_rows": len(advisory_rows),
            "unknown_codes": unknown_codes,
            "codebook_paths": applied_codebook_paths or [],
            "schedule_profile_path": applied_schedule_profile_path,
            "column_profile_issue_count": column_validation["issue_count"],
            "column_profile_score": column_validation["profile_score"],
            "summary_guided_repairs": summary_guided_repairs,
            "profile_guided_repairs": profile_guided_repairs,
            "n_best_candidate_cells": n_best_candidate_cells,
            "n_best_candidates_total": n_best_candidates_total,
            "validation_rule": "Compare computed D/E/N/slash/필/T counts from active day cells against printed summary columns.",
            "hard_validation_columns": HARD_VALIDATION_COLUMNS,
            "advisory_validation_columns": ["T"],
        },
        "columns": [
            {"index": 0, "key": "name", "label": "성명"},
            {"index": 1, "key": "previous", "label": "전달"},
            {"index": 2, "key": "remaining", "label": "누적"},
            *[
                {"index": day + 2, "key": str(day), "label": str(day)}
                for day in range(1, 32)
            ],
            *[
                {"index": idx, "key": key, "label": key}
                for idx, key in zip(range(34, 40), SUMMARY_COLUMNS)
            ],
        ],
        "column_stats": column_stats,
        "column_validation": column_validation,
        "employees": employees,
    }


def cell_class(cell: dict[str, Any] | None) -> str:
    if not cell:
        return ""
    classes: list[str] = []
    flags = cell.get("flags", [])
    if "low-confidence" in flags:
        classes.append("low-confidence")
    if any(flag != "low-confidence" for flag in flags):
        classes.append("normalized")
    if len(cell.get("candidates", [])) > 1:
        classes.append("n-best")
    if not cell.get("value") and not cell.get("text"):
        classes.append("blank")
    return " ".join(classes)


def validation_label(validation: dict[str, Any]) -> str:
    if validation.get("is_valid"):
        if validation.get("advisory_mismatches"):
            return "OK/T확인"
        return "OK"
    parts: list[str] = []
    if validation.get("blocking_mismatches") or validation.get("mismatches"):
        parts.append("집계")
    if validation.get("unknown_codes"):
        parts.append("미등록")
    return ", ".join(parts) or "확인"


def inline_style(cell: dict[str, Any] | None) -> str:
    if not cell:
        return ""
    style = cell.get("style") or {}
    declarations: list[str] = []
    if style.get("background"):
        declarations.append(f"background-color: {style['background']}")
    if style.get("text_color"):
        declarations.append(f"color: {style['text_color']}")
    if not declarations:
        return ""
    return f" style=\"{html.escape('; '.join(declarations))}\""


def render_html(schedule: dict[str, Any], raw_grid: dict[str, Any], output_path: Path) -> None:
    def esc(value: Any) -> str:
        return html.escape("" if value is None else str(value))

    def editable_attrs(cell: dict[str, Any], row: int, col: int, field: str, value: Any | None = None) -> str:
        original = cell.get("value", "") if value is None else value
        return (
            ' contenteditable="true" spellcheck="false" data-editable-cell="true"'
            f' data-row="{esc(row)}" data-col="{esc(col)}" data-field="{esc(field)}"'
            f' data-original="{esc(original)}" data-raw="{esc(cell.get("raw_text", ""))}"'
            f' data-confidence="{esc(cell.get("confidence", ""))}"'
        )

    def candidate_attrs(cell: dict[str, Any]) -> str:
        candidates = cell.get("candidates") or []
        if not candidates:
            return ""
        payload = json.dumps(candidates, ensure_ascii=False, separators=(",", ":"))
        return f' data-candidates="{esc(payload)}"'

    def candidate_hint(cell: dict[str, Any]) -> str:
        candidates = cell.get("candidates") or []
        if len(candidates) <= 1:
            return ""
        parts = [
            f"{candidate.get('value')}({candidate.get('score')})"
            for candidate in candidates
        ]
        return " | N-BEST: " + " > ".join(parts)

    employees = schedule["employees"]
    low_conf_cells = sum(
        1
        for row in raw_grid["rows"]
        for cell in row["cells"]
        if "low-confidence" in cell["flags"] and cell["text"]
    )
    normalized_cells = sum(
        1
        for row in raw_grid["rows"]
        for cell in row["cells"]
        if any(flag != "low-confidence" for flag in cell["flags"]) and cell["text"]
    )
    invalid_rows = sum(
        1 for employee in employees if not employee["validation"]["is_valid"]
    )
    column_validation = schedule.get("column_validation", {})
    column_issue_count = int(column_validation.get("issue_count", 0))
    column_profile_score = int(column_validation.get("profile_score", 0))
    profile_guided_repairs = schedule.get("quality", {}).get("profile_guided_repairs", [])
    n_best_candidate_cells = int(schedule.get("quality", {}).get("n_best_candidate_cells", 0) or 0)
    n_best_candidates_total = int(schedule.get("quality", {}).get("n_best_candidates_total", 0) or 0)
    if not n_best_candidate_cells:
        n_best_candidate_cells = sum(
            1
            for employee in employees
            for cell in employee.get("day_cells", {}).values()
            if len(cell.get("candidates", [])) > 1
        )
        n_best_candidates_total = sum(
            len(cell.get("candidates", []))
            for employee in employees
            for cell in employee.get("day_cells", {}).values()
            if len(cell.get("candidates", [])) > 1
        )
    column_issues_by_day: dict[int, list[dict[str, Any]]] = {}
    for issue in column_validation.get("issues", []):
        if issue.get("day") is not None:
            column_issues_by_day.setdefault(int(issue["day"]), []).append(issue)
    document_id = Path(str(schedule.get("source_image") or output_path.stem)).stem

    day_headers = "".join(f"<th>{day}</th>" for day in range(1, 32))
    summary_headers = "".join(f"<th>{esc(key)}</th>" for key in SUMMARY_COLUMNS)

    employee_rows: list[str] = []
    for employee in employees:
        day_tds: list[str] = []
        for day in range(1, 32):
            key = str(day)
            cell = employee["day_cells"][key]
            flags = ", ".join(cell["flags"])
            title = f"raw={cell['raw_text']} | conf={cell['confidence']} | {flags}{candidate_hint(cell)}"
            day_tds.append(
                f"<td class=\"editable-cell {cell_class(cell)}\" title=\"{esc(title)}\"{inline_style(cell)}"
                f"{editable_attrs(cell, employee['source_row_index'], day + 2, f'day:{key}')}{candidate_attrs(cell)}>"
                f"{esc(cell['value'])}</td>"
            )

        summary_tds: list[str] = []
        for key in SUMMARY_COLUMNS:
            cell = employee["summary_cells"][key]
            flags = ", ".join(cell["flags"])
            title = f"raw={cell['raw_text']} | conf={cell['confidence']} | {flags}"
            summary_col = 34 + SUMMARY_COLUMNS.index(key)
            summary_tds.append(
                f"<td class=\"editable-cell summary-cell {cell_class(cell)}\" title=\"{esc(title)}\"{inline_style(cell)}"
                f"{editable_attrs(cell, employee['source_row_index'], summary_col, f'summary:{key}')}>"
                f"{esc(cell['value'])}</td>"
            )

        warnings = ", ".join(employee["warnings"])
        name_cell = employee["name_cell"]
        previous_cell = employee["previous_cell"]
        remaining_cell = employee["remaining_cell"]
        validation = employee["validation"]
        validation_title = json.dumps(
            {
                "computed": validation["computed_summary"],
                "printed": validation["printed_summary"],
                "mismatches": validation["mismatches"],
                "blocking_mismatches": validation.get("blocking_mismatches", {}),
                "advisory_mismatches": validation.get("advisory_mismatches", {}),
                "unknown_codes": validation["unknown_codes"],
            },
            ensure_ascii=False,
        )
        row_class = "" if validation["is_valid"] else "validation-failed"
        name_edit_cell = {**name_cell, "value": employee["display_name"]}
        employee_rows.append(
            f"<tr class=\"{row_class}\">"
            f"<th class=\"name-cell\"{inline_style(name_cell)}><span class=\"group-pill\">{esc(employee['group_display'])}</span> "
            f"<span class=\"editable-value\"{editable_attrs(name_edit_cell, employee['source_row_index'], 0, 'name', employee['display_name'])}>{esc(employee['display_name'])}</span></th>"
            f"<td class=\"editable-cell {cell_class(previous_cell)}\"{inline_style(previous_cell)}"
            f"{editable_attrs(previous_cell, employee['source_row_index'], 1, 'previous')}>{esc(employee['previous'])}</td>"
            f"<td class=\"editable-cell {cell_class(remaining_cell)}\"{inline_style(remaining_cell)}"
            f"{editable_attrs(remaining_cell, employee['source_row_index'], 2, 'remaining')}>{esc(employee['remaining'])}</td>"
            + "".join(day_tds)
            + "".join(summary_tds)
            + f"<td class=\"validation-cell\" title=\"{esc(validation_title)}\">{esc(validation_label(validation))}</td>"
            + f"<td class=\"warning-cell\">{esc(warnings)}</td>"
            "</tr>"
        )

    column_stat_rows: list[str] = []
    for stat in schedule.get("column_stats", []):
        counts = stat["counts"]
        unknown = ", ".join(stat.get("unknown_codes", []))
        issues = column_issues_by_day.get(int(stat["day"]), [])
        issue_text = "; ".join(
            f"{issue['metric']}={issue['value']}"
            for issue in issues
        )
        row_class = "profile-warning" if issues else ""
        column_stat_rows.append(
            f"<tr class=\"{row_class}\">"
            f"<th>{esc(stat['day'])}</th>"
            f"<td>{esc(counts.get('D', 0))}</td>"
            f"<td>{esc(counts.get('E', 0))}</td>"
            f"<td>{esc(counts.get('N', 0))}</td>"
            f"<td>{esc(counts.get('/', 0))}</td>"
            f"<td>{esc(counts.get('필', 0))}</td>"
            f"<td>{esc(counts.get('T', 0))}</td>"
            f"<td>{esc(stat.get('work_total', 0))}</td>"
            f"<td class=\"warning-cell\">{esc(unknown)}</td>"
            f"<td class=\"validation-cell\">{esc(issue_text or 'OK')}</td>"
            "</tr>"
        )

    raw_rows: list[str] = []
    for row in raw_grid["rows"]:
        cells = []
        for cell in row["cells"]:
            flags = ", ".join(cell["flags"])
            title = f"raw={cell['raw_text']} | conf={cell['confidence']} | {flags}{candidate_hint(cell)}"
            cells.append(
                f"<td class=\"{cell_class(cell)}\" title=\"{esc(title)}\"{inline_style(cell)}{candidate_attrs(cell)}>{esc(cell['text'])}</td>"
            )
        raw_rows.append(
            f"<tr><th class=\"row-index\">{row['row_index']}</th>{''.join(cells)}</tr>"
        )

    html_text = f"""<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{esc(schedule['title'] or '근무표 OCR')}</title>
  <style>
    :root {{
      --bg: #f6f7f9;
      --panel: #ffffff;
      --line: #d7dbe2;
      --text: #111827;
      --muted: #5b6472;
      --low: #fff2a8;
      --normalized: #dff7ea;
      --sticky: #eef2f7;
      --accent: #2f6f73;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Arial, "Malgun Gothic", sans-serif;
      font-size: 13px;
    }}
    header {{
      padding: 18px 22px 12px;
      border-bottom: 1px solid var(--line);
      background: var(--panel);
    }}
    h1 {{
      margin: 0 0 6px;
      font-size: 22px;
      letter-spacing: 0;
    }}
    .meta {{
      display: flex;
      flex-wrap: wrap;
      gap: 8px 16px;
      color: var(--muted);
      line-height: 1.5;
    }}
    main {{ padding: 18px 22px 32px; }}
    .stats {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }}
    .stat {{
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px 12px;
    }}
    .stat strong {{
      display: block;
      font-size: 18px;
      margin-top: 2px;
    }}
    .image-wrap {{
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 18px;
      overflow: auto;
    }}
    .source-image {{
      display: block;
      max-width: 100%;
      height: auto;
      border: 1px solid var(--line);
    }}
    section {{ margin-top: 18px; }}
    h2 {{
      margin: 0 0 8px;
      font-size: 16px;
    }}
    .table-scroll {{
      max-height: 72vh;
      overflow: auto;
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
    }}
    table {{
      border-collapse: separate;
      border-spacing: 0;
      min-width: 1600px;
      width: 100%;
    }}
    th, td {{
      border-right: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      padding: 5px 6px;
      min-width: 34px;
      height: 28px;
      text-align: center;
      white-space: nowrap;
      vertical-align: middle;
    }}
    thead th {{
      position: sticky;
      top: 0;
      z-index: 3;
      background: var(--sticky);
      font-weight: 700;
    }}
    .name-cell {{
      position: sticky;
      left: 0;
      z-index: 2;
      min-width: 132px;
      max-width: 180px;
      background: #fafafa;
      text-align: left;
    }}
    thead .name-cell {{ z-index: 4; background: var(--sticky); }}
    .group-pill {{
      display: inline-block;
      min-width: 18px;
      padding: 1px 5px;
      margin-right: 5px;
      border-radius: 8px;
      color: #fff;
      background: var(--accent);
      text-align: center;
      font-size: 11px;
    }}
    .summary-cell {{ background: #f8fafc; }}
    .low-confidence {{ box-shadow: inset 0 0 0 9999px rgba(255, 210, 0, 0.32); }}
    .normalized {{ outline: 2px solid rgba(47, 111, 115, 0.35); outline-offset: -2px; }}
    .n-best {{ border-bottom: 3px solid rgba(29, 78, 216, 0.45); }}
    .editable-cell, .editable-value {{
      cursor: text;
    }}
    .edited {{
      outline: 2px solid rgba(29, 78, 216, 0.5);
      outline-offset: -2px;
      background-image: linear-gradient(rgba(219, 234, 254, 0.55), rgba(219, 234, 254, 0.55));
    }}
    .warning-cell {{
      min-width: 180px;
      text-align: left;
      color: var(--muted);
      background: var(--panel);
    }}
    .validation-cell {{
      min-width: 72px;
      font-weight: 700;
      color: #0f5132;
      background: #eef8f0;
    }}
    .validation-failed .validation-cell {{
      color: #842029;
      background: #f8d7da;
    }}
    .profile-warning .validation-cell {{
      color: #842029;
      background: #fff3cd;
    }}
    .review-panel {{
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 18px;
    }}
    .review-actions {{
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 10px 0;
    }}
    button {{
      border: 1px solid #9aa4b2;
      background: #ffffff;
      border-radius: 6px;
      padding: 7px 10px;
      color: var(--text);
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }}
    button:hover {{ background: #eef2f7; }}
    .review-status {{ color: var(--muted); }}
    #correction-payload {{
      width: 100%;
      max-height: 180px;
      overflow: auto;
      margin: 0;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #f8fafc;
      white-space: pre-wrap;
      font-family: Consolas, "Courier New", monospace;
      font-size: 12px;
    }}
    .row-index {{
      position: sticky;
      left: 0;
      z-index: 2;
      background: #fafafa;
      min-width: 44px;
    }}
    .legend {{
      color: var(--muted);
      margin: 4px 0 10px;
      line-height: 1.5;
    }}
  </style>
</head>
<body>
  <header>
    <h1>{esc(schedule['title'] or '근무표 OCR')}</h1>
    <div class="meta">
      <span>출력 OCR: {esc(schedule.get('printed_at'))}</span>
      <span>생성: {esc(schedule['generated_at'])}</span>
      <span>소스: {esc(schedule['source_image'])}</span>
    </div>
  </header>
  <main>
    <div class="stats">
      <div class="stat">직원 행<strong>{len(employees)}</strong></div>
      <div class="stat">감지 격자<strong>{schedule['grid']['rows']} x {schedule['grid']['columns']}</strong></div>
      <div class="stat">보정 셀<strong>{normalized_cells}</strong></div>
      <div class="stat">낮은 confidence<strong>{low_conf_cells}</strong></div>
      <div class="stat">검증 필요 행<strong>{invalid_rows}</strong></div>
      <div class="stat">컬럼 교차검증<strong>{column_issue_count}</strong></div>
      <div class="stat">프로파일 점수<strong>{column_profile_score}</strong></div>
      <div class="stat">자동 후보수정<strong>{len(profile_guided_repairs)}</strong></div>
      <div class="stat">N-BEST 후보셀<strong>{n_best_candidate_cells}</strong><span>{n_best_candidates_total} candidates</span></div>
    </div>

    <div class="image-wrap">
      <img class="source-image" src="{esc(schedule['image_asset'])}" alt="source work schedule">
    </div>

    <section class="review-panel">
      <h2>검수 수정</h2>
      <div class="review-actions">
        <button type="button" id="copy-corrections">복사</button>
        <button type="button" id="download-corrections">내보내기</button>
        <button type="button" id="save-corrections">저장</button>
        <button type="button" id="reset-corrections">초기화</button>
        <span class="review-status" id="review-status">수정 0개</span>
      </div>
      <pre id="correction-payload"></pre>
    </section>

    <section>
      <h2>직원별 OCR 결과</h2>
      <p class="legend">노란색은 confidence 낮음, 녹색 테두리는 문자/기호 보정 적용 셀입니다. 파란 밑줄은 N-BEST 후보가 있는 셀이며, 셀에 마우스를 올리면 raw OCR과 후보를 볼 수 있습니다.</p>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th class="name-cell">성명</th>
              <th>전달</th>
              <th>누적</th>
              {day_headers}
              {summary_headers}
              <th>검증</th>
              <th>Warnings</th>
            </tr>
          </thead>
          <tbody>
            {''.join(employee_rows)}
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h2>일자별 타입 집계</h2>
      <p class="legend">직원별 근무코드를 코드북 기준으로 D/E/N/휴무/필/T로 다시 센 결과입니다. 행 끝 집계와 다르면 직원별 OCR 결과의 검증 칸에 표시됩니다.</p>
      <div class="table-scroll">
        <table class="compact-table">
          <thead>
            <tr>
              <th>일자</th>
              <th>D</th>
              <th>E</th>
              <th>N</th>
              <th>/</th>
              <th>필</th>
              <th>T</th>
              <th>D+E+N</th>
              <th>미등록</th>
              <th>교차검증</th>
            </tr>
          </thead>
          <tbody>
            {''.join(column_stat_rows)}
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h2>Raw Grid</h2>
      <p class="legend">디버그용 원본 격자 OCR입니다. 행/열 밀림을 확인할 때 사용합니다.</p>
      <div class="table-scroll">
        <table>
          <tbody>
            {''.join(raw_rows)}
          </tbody>
        </table>
      </div>
    </section>
  </main>
  <script>
    const scheduleDocumentId = {json.dumps(document_id, ensure_ascii=False)};
    const scheduleSourceImage = {json.dumps(str(schedule.get('source_image') or ''), ensure_ascii=False)};
    const correctionStorageKey = `work-schedule-corrections:${{scheduleDocumentId}}`;
    const editableCells = Array.from(document.querySelectorAll('[data-editable-cell="true"]'));
    const payloadEl = document.getElementById('correction-payload');
    const statusEl = document.getElementById('review-status');
    const copyButton = document.getElementById('copy-corrections');
    const downloadButton = document.getElementById('download-corrections');
    const saveButton = document.getElementById('save-corrections');
    const resetButton = document.getElementById('reset-corrections');

    function cellKey(cell) {{
      return `${{cell.dataset.row}}:${{cell.dataset.col}}`;
    }}

    function readStoredCorrections() {{
      try {{
        return JSON.parse(localStorage.getItem(correctionStorageKey) || '{{}}');
      }} catch {{
        return {{}};
      }}
    }}

    let corrections = readStoredCorrections();

    function correctionPayload() {{
      return {{
        version: 1,
        document: scheduleDocumentId,
        source_image: scheduleSourceImage,
        generated_at: new Date().toISOString(),
        cells: Object.values(corrections).sort((a, b) => (a.row - b.row) || (a.col - b.col)),
      }};
    }}

    function renderCorrectionPayload() {{
      const payload = correctionPayload();
      payloadEl.textContent = JSON.stringify(payload, null, 2);
      statusEl.textContent = `수정 ${{payload.cells.length}}개`;
    }}

    function persistCorrections() {{
      localStorage.setItem(correctionStorageKey, JSON.stringify(corrections));
      renderCorrectionPayload();
    }}

    function setCellState(cell) {{
      const key = cellKey(cell);
      const value = cell.textContent.trim();
      const original = (cell.dataset.original || '').trim();
      if (value && value !== original) {{
        corrections[key] = {{
          row: Number(cell.dataset.row),
          col: Number(cell.dataset.col),
          field: cell.dataset.field,
          value,
          original,
          raw_text: cell.dataset.raw || '',
          confidence: Number(cell.dataset.confidence || 0),
          source: 'review_html',
        }};
        cell.classList.add('edited');
      }} else {{
        delete corrections[key];
        cell.classList.remove('edited');
      }}
      persistCorrections();
    }}

    function applyStoredCorrections() {{
      for (const cell of editableCells) {{
        const saved = corrections[cellKey(cell)];
        if (saved) {{
          cell.textContent = saved.value;
          cell.classList.add('edited');
        }}
        cell.addEventListener('input', () => setCellState(cell));
        cell.addEventListener('blur', () => setCellState(cell));
        cell.addEventListener('keydown', (event) => {{
          if (event.key === 'Enter') {{
            event.preventDefault();
            cell.blur();
          }}
        }});
      }}
      renderCorrectionPayload();
    }}

    copyButton.addEventListener('click', async () => {{
      await navigator.clipboard.writeText(payloadEl.textContent);
      statusEl.textContent = '복사됨';
    }});

    downloadButton.addEventListener('click', () => {{
      const blob = new Blob([payloadEl.textContent], {{ type: 'application/json;charset=utf-8' }});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${{scheduleDocumentId}}_corrections.json`;
      link.click();
      URL.revokeObjectURL(url);
    }});

    saveButton.addEventListener('click', async () => {{
      try {{
        const response = await fetch('/api/corrections', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: payloadEl.textContent,
        }});
        statusEl.textContent = response.ok ? '저장됨' : `저장 실패 ${{response.status}}`;
      }} catch {{
        statusEl.textContent = '저장 API 없음';
      }}
    }});

    resetButton.addEventListener('click', () => {{
      corrections = {{}};
      localStorage.removeItem(correctionStorageKey);
      for (const cell of editableCells) {{
        cell.textContent = cell.dataset.original || '';
        cell.classList.remove('edited');
      }}
      renderCorrectionPayload();
    }});

    applyStoredCorrections();
  </script>
</body>
</html>
"""
    output_path.write_text(html_text, encoding="utf-8")


CodebookPath = Path | str


def codebook_path_list(path: CodebookPath | Sequence[CodebookPath] | None) -> list[Path]:
    if path is None:
        return []
    return [Path(item) for item in path] if isinstance(path, (list, tuple)) else [Path(path)]


def load_codebook(path: CodebookPath | Sequence[CodebookPath] | None) -> Codebook:
    existing_paths = [item for item in codebook_path_list(path) if item.exists()]
    if existing_paths:
        return Codebook.from_json_files(existing_paths)
    return Codebook.default()


def parse_schedule(
    image_path: Path,
    output_dir: Path,
    codebook_path: CodebookPath | Sequence[CodebookPath] | None = DEFAULT_CODEBOOK,
    schedule_profile_path: Path | None = None,
) -> dict[str, Any]:
    start = time.time()
    output_dir.mkdir(parents=True, exist_ok=True)

    copied_image = output_dir / image_path.name
    shutil.copy2(image_path, copied_image)

    grid = detect_grid(image_path)
    image = Image.open(image_path).convert("RGB")
    predictor = create_predictor()
    codebook = load_codebook(codebook_path)
    applied_codebook_paths = [
        str(path)
        for path in codebook_path_list(codebook_path)
        if path.exists()
    ]
    resolved_schedule_profile_path = schedule_profile_path or schedule_profile_path_for_image(image_path)
    schedule_profile = load_schedule_profile(resolved_schedule_profile_path)

    header_bboxes = [
        [330, 3, 830, 42],
        [1015, 58, 1278, 88],
    ]
    header_ocr = ocr_bboxes(predictor, image, header_bboxes)

    cell_bboxes: list[list[int]] = []
    for row in range(grid["rows"]):
        for col in range(grid["columns"]):
            cell_bboxes.append(cell_bbox(grid["x_lines"], grid["y_lines"], row, col))

    cell_ocr = ocr_bboxes(predictor, image, cell_bboxes)
    image_bgr = cv2.imread(str(image_path))
    if image_bgr is None:
        raise FileNotFoundError(f"Unable to read image for style extraction: {image_path}")
    raw_rows = build_raw_grid(grid, cell_ocr, image_bgr)
    cell_corrections = load_cell_corrections(image_path)
    apply_cell_corrections(raw_rows, cell_corrections)

    elapsed_seconds = time.time() - start
    schedule = build_schedule_json(
        image_path=image_path,
        copied_image_name=copied_image.name,
        grid=grid,
        raw_grid=raw_rows,
        header_ocr=header_ocr,
        elapsed_seconds=elapsed_seconds,
        codebook=codebook,
        applied_codebook_paths=applied_codebook_paths,
        schedule_profile=schedule_profile,
        applied_schedule_profile_path=str(resolved_schedule_profile_path) if resolved_schedule_profile_path else None,
    )

    raw_grid = {
        "source_image": str(image_path),
        "image_asset": copied_image.name,
        "generated_at": schedule["generated_at"],
        "grid": schedule["grid"],
        "header_ocr": header_ocr,
        "cell_corrections": cell_corrections,
        "rows": raw_rows,
    }

    schedule_path = output_dir / "schedule.json"
    raw_grid_path = output_dir / "schedule_raw_grid.json"
    html_path = output_dir / "index.html"

    schedule_path.write_text(json.dumps(schedule, ensure_ascii=False, indent=2), encoding="utf-8")
    raw_grid_path.write_text(json.dumps(raw_grid, ensure_ascii=False, indent=2), encoding="utf-8")
    render_html(schedule, raw_grid, html_path)

    return {
        "schedule": schedule_path,
        "raw_grid": raw_grid_path,
        "html": html_path,
        "employee_count": len(schedule["employees"]),
        "grid_rows": grid["rows"],
        "grid_columns": grid["columns"],
        "elapsed_seconds": round(elapsed_seconds, 2),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Parse a Korean nurse work schedule image with Surya OCR.")
    parser.add_argument("--image", type=Path, default=DEFAULT_IMAGE)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--codebook", type=Path, default=DEFAULT_CODEBOOK)
    args = parser.parse_args()

    result = parse_schedule(args.image, args.output_dir, args.codebook)
    print(json.dumps({key: str(value) for key, value in result.items()}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
