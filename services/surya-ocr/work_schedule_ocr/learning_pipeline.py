from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
from pathlib import Path
from typing import Any, Iterable


PROJECT_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT_DIR = PROJECT_DIR / "data" / "training"
DEFAULT_CORRECTIONS_DIR = PROJECT_DIR / "corrections"
DEFAULT_PARSED_OUTPUT_DIR = PROJECT_DIR / "output"

HIGH_VALUE_CONFUSIONS: dict[str, list[tuple[str, str]]] = {
    "P-9r/91": [
        ("P-0r/01", "prime-9r-zero-confusion"),
        ("P-Or/O1", "prime-9r-letter-o-confusion"),
        ("P-Qr/91", "prime-9r-q-confusion"),
    ],
    "9r": [
        ("0r", "9r-zero-confusion"),
        ("Or", "9r-letter-o-confusion"),
        ("Qr", "9r-q-confusion"),
    ],
    "P-E/82": [
        ("P-F/82", "prime-e-f-confusion"),
        ("P-Ε/82", "prime-e-greek-confusion"),
        ("P-Е/82", "prime-e-cyrillic-confusion"),
    ],
    "P-7/45": [
        ("7/45", "missing-prime-prefix"),
        ("P-7/4S", "five-s-confusion"),
        ("P-7/4SE", "suffix-noise"),
    ],
    "E": [
        ("N", "e-n-confusion"),
        ("F", "e-f-confusion"),
        ("Ε", "e-greek-confusion"),
        ("Е", "e-cyrillic-confusion"),
    ],
    "N": [
        ("E", "n-e-confusion"),
        ("Ν", "n-greek-confusion"),
    ],
    "D": [
        ("0", "d-zero-confusion"),
        ("O", "d-letter-o-confusion"),
    ],
    "/": [
        ("1", "slash-one-confusion"),
        ("I", "slash-i-confusion"),
    ],
    "Do": [
        ("D0", "suffix-o-zero-confusion"),
        ("D", "missing-o-suffix"),
    ],
    "Eo": [
        ("E0", "suffix-o-zero-confusion"),
        ("E", "missing-o-suffix"),
    ],
    "No": [
        ("N0", "suffix-o-zero-confusion"),
        ("N", "missing-o-suffix"),
    ],
}


def now_iso() -> str:
    return dt.datetime.now().isoformat(timespec="seconds")


def document_id_from_schedule(schedule: dict[str, Any], fallback: str = "document") -> str:
    source = str(schedule.get("source_image") or schedule.get("image_asset") or fallback)
    source = source.replace("\\", "/").rstrip("/")
    name = source.rsplit("/", 1)[-1] or fallback
    return Path(name).stem


def clean_ocr_text(value: Any) -> str:
    return str(value or "").replace("\r", "\n").replace("\n", "").replace(" ", "").strip()


def stable_split(example: dict[str, Any]) -> str:
    key = "|".join(
        [
            str(example.get("document_id", "")),
            str(example.get("employee", "")),
            str(example.get("field", "")),
            str(example.get("raw_text", "")),
            str(example.get("target_text", "")),
        ]
    )
    digest = hashlib.sha1(key.encode("utf-8")).hexdigest()
    return "dev" if int(digest[:2], 16) % 10 == 0 else "train"


def make_example(
    *,
    source: str,
    document_id: str,
    employee: str,
    role: str | None,
    row: int | None,
    field: str,
    raw_text: str,
    target_text: str,
    bbox: Any = None,
    confidence: float | None = None,
    rule: str | None = None,
) -> dict[str, Any]:
    example = {
        "schema_version": 1,
        "task": "cell_ocr_correction",
        "source": source,
        "document_id": document_id,
        "employee": employee,
        "role": role,
        "row": row,
        "field": field,
        "raw_text": clean_ocr_text(raw_text),
        "target_text": clean_ocr_text(target_text),
        "bbox": bbox,
        "confidence": confidence,
        "rule": rule,
        "created_at": now_iso(),
    }
    example["split"] = stable_split(example)
    return example


def iter_schedule_day_cells(schedule: dict[str, Any]) -> Iterable[dict[str, Any]]:
    document_id = document_id_from_schedule(schedule)
    for employee in schedule.get("employees", []):
        employee_name = str(employee.get("display_name") or employee.get("name") or "")
        role = employee.get("role")
        row = employee.get("source_row_index")
        for day, cell in sorted(employee.get("day_cells", {}).items(), key=lambda item: int(item[0])):
            target = str(cell.get("value") or employee.get("days", {}).get(day) or "")
            if not target:
                continue
            yield {
                "document_id": document_id,
                "employee": employee_name,
                "role": role,
                "row": row,
                "field": f"day:{day}",
                "target": target,
                "cell": cell,
            }


def build_simulated_cell_examples(
    schedule: dict[str, Any],
    max_variants_per_cell: int = 2,
) -> list[dict[str, Any]]:
    examples: list[dict[str, Any]] = []
    for item in iter_schedule_day_cells(schedule):
        target = clean_ocr_text(item["target"])
        variants = HIGH_VALUE_CONFUSIONS.get(target, [])[:max_variants_per_cell]
        cell = item["cell"]
        for raw_text, rule in variants:
            if clean_ocr_text(raw_text) == target:
                continue
            examples.append(
                make_example(
                    source="simulation",
                    document_id=item["document_id"],
                    employee=item["employee"],
                    role=item["role"],
                    row=item["row"],
                    field=item["field"],
                    raw_text=raw_text,
                    target_text=target,
                    bbox=cell.get("bbox"),
                    confidence=cell.get("confidence"),
                    rule=rule,
                )
            )
    return deduplicate_examples(examples)


def build_parser_observation_examples(schedule: dict[str, Any]) -> list[dict[str, Any]]:
    examples: list[dict[str, Any]] = []
    for item in iter_schedule_day_cells(schedule):
        cell = item["cell"]
        raw_text = clean_ocr_text(cell.get("raw_text"))
        target = clean_ocr_text(item["target"])
        if not raw_text or raw_text == target:
            continue
        examples.append(
            make_example(
                source="parser_observation",
                document_id=item["document_id"],
                employee=item["employee"],
                role=item["role"],
                row=item["row"],
                field=item["field"],
                raw_text=raw_text,
                target_text=target,
                bbox=cell.get("bbox"),
                confidence=cell.get("confidence"),
                rule="normalized-by-parser",
            )
        )
    return deduplicate_examples(examples)


def iter_review_correction_examples(corrections_dir: Path) -> Iterable[dict[str, Any]]:
    if not corrections_dir.exists():
        return
    for path in sorted(corrections_dir.glob("*.json")):
        if path.name == "learned_candidates.json":
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        document_id = str(payload.get("document") or path.stem)
        for cell in payload.get("cells", []):
            raw_text = clean_ocr_text(cell.get("raw_text") or cell.get("original"))
            target = clean_ocr_text(cell.get("value"))
            if not raw_text or not target or raw_text == target:
                continue
            field = str(cell.get("field") or infer_field_from_col(cell.get("col")))
            yield make_example(
                source="review_correction",
                document_id=document_id,
                employee=str(cell.get("employee") or ""),
                role=cell.get("role"),
                row=cell.get("row"),
                field=field,
                raw_text=raw_text,
                target_text=target,
                bbox=cell.get("bbox"),
                confidence=cell.get("confidence"),
                rule=str(cell.get("reason") or "human-review"),
            )


def infer_field_from_col(col: Any) -> str:
    try:
        col_num = int(col)
    except (TypeError, ValueError):
        return "unknown"
    if 3 <= col_num <= 33:
        return f"day:{col_num - 2}"
    summary = {34: "summary:D", 35: "summary:E", 36: "summary:N", 37: "summary:/", 38: "summary:required", 39: "summary:T"}
    return summary.get(col_num, "unknown")


def deduplicate_examples(examples: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    deduped: dict[tuple[str, str, str, str, str, str], dict[str, Any]] = {}
    for example in examples:
        key = (
            str(example.get("source")),
            str(example.get("document_id")),
            str(example.get("row")),
            str(example.get("field")),
            str(example.get("raw_text")),
            str(example.get("target_text")),
        )
        deduped.setdefault(key, example)
    return list(deduped.values())


def count_by_source(examples: Iterable[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for example in examples:
        source = str(example.get("source") or "unknown")
        counts[source] = counts.get(source, 0) + 1
    return counts


def export_training_dataset(
    schedule_paths: Iterable[Path],
    corrections_dir: Path = DEFAULT_CORRECTIONS_DIR,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
    max_simulated_per_cell: int = 2,
) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    all_examples: list[dict[str, Any]] = []
    schedule_path_list = [Path(path) for path in schedule_paths if Path(path).exists()]

    for schedule_path in schedule_path_list:
        schedule = json.loads(schedule_path.read_text(encoding="utf-8"))
        all_examples.extend(build_parser_observation_examples(schedule))
        all_examples.extend(build_simulated_cell_examples(schedule, max_simulated_per_cell))
    all_examples.extend(iter_review_correction_examples(corrections_dir) or [])
    all_examples = deduplicate_examples(all_examples)

    dataset_path = output_dir / "cell_dataset.jsonl"
    manifest_path = output_dir / "manifest.json"
    dataset_path.write_text(
        "\n".join(json.dumps(example, ensure_ascii=False) for example in all_examples) + ("\n" if all_examples else ""),
        encoding="utf-8",
    )

    counts = count_by_source(all_examples)
    manifest = {
        "generated_at": now_iso(),
        "schema_version": 1,
        "dataset_path": str(dataset_path),
        "manifest_path": str(manifest_path),
        "schedule_paths": [str(path) for path in schedule_path_list],
        "corrections_dir": str(corrections_dir),
        "counts": {
            "total_examples": len(all_examples),
            "by_source": counts,
            "train": sum(1 for example in all_examples if example.get("split") == "train"),
            "dev": sum(1 for example in all_examples if example.get("split") == "dev"),
        },
        "notes": [
            "Simulated examples are weak labels for pre-finetuning and regression tests.",
            "Review corrections are strong labels and should be weighted higher during training.",
            "Promote repeated corrections to codebooks before model finetuning when deterministic rules are enough.",
        ],
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest


def default_schedule_paths(output_dir: Path = DEFAULT_PARSED_OUTPUT_DIR) -> list[Path]:
    return sorted(output_dir.glob("*/schedule.json"))


def main() -> None:
    parser = argparse.ArgumentParser(description="Build OCR correction training data from schedules and review events.")
    parser.add_argument("--schedules", nargs="*", type=Path, default=None)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--corrections-dir", type=Path, default=DEFAULT_CORRECTIONS_DIR)
    parser.add_argument("--max-simulated-per-cell", type=int, default=2)
    args = parser.parse_args()

    schedule_paths = args.schedules if args.schedules else default_schedule_paths()
    manifest = export_training_dataset(
        schedule_paths,
        args.corrections_dir,
        args.output_dir,
        args.max_simulated_per_cell,
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
