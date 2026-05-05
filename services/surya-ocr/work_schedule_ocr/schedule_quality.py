from __future__ import annotations

from dataclasses import dataclass
import calendar
import json
from pathlib import Path
import re
from typing import Any


SUMMARY_KEYS = ["D", "E", "N", "/", "필", "T"]
WORK_GROUP_LABELS = {"A", "B", "C", "D"}
STAFF_ROLES = ("PRIME RN", "RN", "HN")
UNASSIGNED_GROUP_LABEL = "미지정"
GROUP_HOMOGLYPHS = {
    "Α": "A",
    "А": "A",
    "Β": "B",
    "В": "B",
    "С": "C",
    "Ϲ": "C",
}


@dataclass(frozen=True)
class CodebookEntry:
    code: str
    kind: str
    summary_key: str | None = None
    aliases: tuple[str, ...] = ()


@dataclass(frozen=True)
class Codebook:
    entries: dict[str, CodebookEntry]

    @classmethod
    def default(cls) -> "Codebook":
        entries = [
            CodebookEntry(
                "D",
                "work",
                "D",
                (
                    "D*",
                    "Do",
                    "7",
                    "7*",
                    "9",
                    "9*",
                    "10",
                    "0r",
                    "Or",
                    "Qr",
                    "7r",
                    "11",
                    "12",
                    "P-7/45",
                    "7/45",
                    "9r",
                    "P-D/82",
                    "P-0/82",
                    "P-0r/01",
                    "P-9r/91",
                ),
            ),
            CodebookEntry("E", "work", "E", ("E*", "Eo", "En", "Fo", "15", "15*", "P-E/82", "P-F/82")),
            CodebookEntry("N", "work", "N", ("N*", "No")),
            CodebookEntry("/", "off", "/", ("/*",)),
            CodebookEntry("T", "special", "T", ("T*",)),
            CodebookEntry("필", "required", "필", ("필*",)),
            CodebookEntry("연*", "leave", None, ("연",)),
            CodebookEntry("생*", "leave", None, ("생", "생⋆", "생★")),
            CodebookEntry("보*", "leave", None, ("보",)),
            CodebookEntry("청*", "leave", None, ("청", "청★", "청⋆")),
            CodebookEntry("교*", "leave", None, ("교",)),
            CodebookEntry("병", "leave", None, ()),
            CodebookEntry("김", "leave", None, ()),
            CodebookEntry("디", "leave", None, ()),
            CodebookEntry("ignore", "ignore", None, ("2|2", "Î", "Ï")),
            CodebookEntry("리2", "special", None, ("212", "리")),
        ]
        return cls.from_entries(entries)

    @classmethod
    def from_entries(cls, entries: list[CodebookEntry]) -> "Codebook":
        mapped: dict[str, CodebookEntry] = {}
        for entry in entries:
            mapped[normalize_code_token(entry.code)] = entry
            for alias in entry.aliases:
                mapped[normalize_code_token(alias)] = entry
        return cls(mapped)

    @classmethod
    def from_json(cls, path: str | Path) -> "Codebook":
        return cls.from_json_files([path])

    @classmethod
    def from_json_files(cls, paths: list[str | Path] | tuple[str | Path, ...]) -> "Codebook":
        entries_by_code: dict[str, CodebookEntry] = {}
        for path in paths:
            data = json.loads(Path(path).read_text(encoding="utf-8"))
            for code, item in data.get("codes", {}).items():
                previous = entries_by_code.get(code)
                aliases = tuple(item.get("aliases", []))
                if previous and not item.get("replace_aliases", False):
                    aliases = tuple(dict.fromkeys((*previous.aliases, *aliases)))
                entries_by_code[code] = CodebookEntry(
                    code=code,
                    kind=str(item.get("kind", previous.kind if previous else "unknown")),
                    summary_key=item.get(
                        "summary_key",
                        previous.summary_key if previous else None,
                    ),
                    aliases=aliases,
                )
        return cls.from_entries(list(entries_by_code.values()))

    def lookup(self, value: str) -> CodebookEntry | None:
        return self.entries.get(normalize_code_token(value))


@dataclass(frozen=True)
class GroupedRow:
    group: str | None
    name: str
    row_index: int


@dataclass(frozen=True)
class SummaryValidation:
    is_valid: bool
    computed: dict[str, int]
    printed: dict[str, int | None]
    mismatches: dict[str, dict[str, int | None]]
    unknown_codes: list[str]


def normalize_code_token(value: str) -> str:
    text = str(value or "").strip()
    text = text.replace("Ε", "E").replace("Е", "E").replace("Ν", "N")
    text = text.replace("⋆", "*").replace("★", "*").replace("∗", "*")
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", "", text.replace("<br>", ""))
    return text


def active_days_from_title(title: str) -> int:
    match = re.search(r"(\d{4})\s*년\s*(\d{1,2})\s*월", title)
    if not match:
        return 31
    year = int(match.group(1))
    month = int(match.group(2))
    if not 1 <= month <= 12:
        return 31
    return calendar.monthrange(year, month)[1]


def normalize_group_label(value: str) -> str:
    text = re.sub(r"\s+", "", str(value or "")).upper()
    return GROUP_HOMOGLYPHS.get(text, text)


def row_is_blank(row: list[str]) -> bool:
    return all(not str(cell or "").strip() for cell in row)


def row_group_label(row: list[str]) -> str | None:
    first = normalize_group_label(row[0] if row else "")
    rest_has_content = any(is_meaningful_group_noise(cell) for cell in row[1:])
    if first in WORK_GROUP_LABELS and not rest_has_content:
        return first
    return None


def is_meaningful_group_noise(value: str) -> bool:
    text = normalize_code_token(value)
    if not text:
        return False
    return bool(re.search(r"[A-Za-z가-힣0-9/]", text))


def group_rows(rows: list[list[str]]) -> list[GroupedRow]:
    current_group: str | None = None
    grouped: list[GroupedRow] = []
    for row_index, row in enumerate(rows):
        group = row_group_label(row)
        if group is not None:
            current_group = group
            continue
        if row_is_blank(row):
            current_group = None
            continue
        first = str(row[0] if row else "").strip()
        if staff_role_from_name(first):
            grouped.append(GroupedRow(current_group, first, row_index))
    return grouped


def staff_role_from_name(value: str) -> str | None:
    text = re.sub(r"\s+", " ", str(value or "").strip().upper())
    for role in STAFF_ROLES:
        role_pattern = r"\s+".join(re.escape(part) for part in role.split())
        if re.match(rf"^{role_pattern}\b", text):
            return role
    return None


def normalize_staff_person_name(value: str) -> str:
    text = re.sub(r"\s+", " ", str(value or "").strip())
    if re.fullmatch(r"[가-힣 ]+", text):
        return text.replace(" ", "")
    return text


def split_staff_name(value: str) -> tuple[str, str]:
    text = re.sub(r"\s+", " ", str(value or "").strip())
    for role in STAFF_ROLES:
        role_pattern = r"\s+".join(re.escape(part) for part in role.split())
        match = re.match(rf"^({role_pattern})\s+(.+)$", text, flags=re.IGNORECASE)
        if match:
            return role, normalize_staff_person_name(match.group(2))
    return "", normalize_staff_person_name(text)


def parse_int(value: Any) -> int | None:
    if value is None:
        return None
    text = str(value).strip()
    if re.fullmatch(r"-?\d+", text):
        return int(text)
    matches = re.findall(r"-?\d+", text)
    if len(matches) == 1:
        return int(matches[0])
    return None


def compute_summary(days: dict[str, str], codebook: Codebook) -> dict[str, int]:
    summary = {key: 0 for key in SUMMARY_KEYS}
    for value in days.values():
        if not value:
            continue
        entry = codebook.lookup(value)
        if entry and entry.summary_key in summary:
            summary[entry.summary_key] += 1
    return summary


def unknown_codes(days: dict[str, str], codebook: Codebook) -> list[str]:
    unknown = sorted(
        {
            normalize_code_token(value)
            for value in days.values()
            if normalize_code_token(value) and codebook.lookup(value) is None
        }
    )
    return unknown


def validate_employee_summary(
    days: dict[str, str],
    printed: dict[str, int | str | None],
    codebook: Codebook,
) -> SummaryValidation:
    computed = compute_summary(days, codebook)
    printed_ints = {key: parse_int(printed.get(key)) for key in SUMMARY_KEYS}
    mismatches: dict[str, dict[str, int | None]] = {}
    for key in SUMMARY_KEYS:
        if printed_ints.get(key) is None:
            continue
        if computed[key] != printed_ints[key]:
            mismatches[key] = {"computed": computed[key], "printed": printed_ints[key]}

    unknown = unknown_codes(days, codebook)
    return SummaryValidation(
        is_valid=not mismatches and not unknown,
        computed=computed,
        printed=printed_ints,
        mismatches=mismatches,
        unknown_codes=unknown,
    )


def blocking_mismatches(
    validation: SummaryValidation,
    hard_keys: list[str] | tuple[str, ...] = tuple(SUMMARY_KEYS),
) -> dict[str, dict[str, int | None]]:
    hard_key_set = set(hard_keys)
    return {
        key: value
        for key, value in validation.mismatches.items()
        if key in hard_key_set
    }


def validate_column_profile(
    column_stats: list[dict[str, Any]],
    profile: dict[str, Any] | None,
) -> dict[str, Any]:
    expectations = (profile or {}).get("column_expectations", {})
    issues: list[dict[str, Any]] = []
    stat_scores: list[dict[str, Any]] = []
    profile_score = 0
    for stat in column_stats:
        day = stat.get("day")
        counts = stat.get("counts", {})
        day_score = 0
        preferred_deviations: list[dict[str, Any]] = []
        for metric, expectation in expectations.items():
            value = stat.get(metric) if metric == "work_total" else counts.get(metric)
            if value is None:
                continue
            minimum = expectation.get("min")
            maximum = expectation.get("max")
            preferred = expectation.get("preferred")
            if minimum is not None and value < minimum:
                penalty = (minimum - value) * 100
                day_score += penalty
                issues.append(
                    {
                        "day": day,
                        "metric": metric,
                        "value": value,
                        "expected": expectation,
                        "message": f"{metric} {value} is below expected minimum {minimum}",
                    }
                )
            elif maximum is not None and value > maximum:
                penalty = (value - maximum) * 100
                day_score += penalty
                issues.append(
                    {
                        "day": day,
                        "metric": metric,
                        "value": value,
                        "expected": expectation,
                        "message": f"{metric} {value} is above expected maximum {maximum}",
                    }
                )
            if preferred is not None and value != preferred:
                distance = abs(value - preferred)
                day_score += distance
                preferred_deviations.append(
                    {
                        "metric": metric,
                        "value": value,
                        "preferred": preferred,
                        "distance": distance,
                    }
                )
        profile_score += day_score
        stat_scores.append(
            {
                "day": day,
                "score": day_score,
                "preferred_deviations": preferred_deviations,
            }
        )

    return {
        "profile_id": (profile or {}).get("profile_id"),
        "issue_count": len(issues),
        "profile_score": profile_score,
        "stat_scores": stat_scores,
        "issues": issues,
    }
