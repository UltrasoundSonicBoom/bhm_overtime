from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

try:
    from .payroll_parser import DEDUCTION_GROUPS, PAY_GROUPS, compact_text
    from .repositories import stable_id, utc_now
except ImportError:  # pragma: no cover - script execution fallback
    from payroll_parser import DEDUCTION_GROUPS, PAY_GROUPS, compact_text
    from repositories import stable_id, utc_now


def default_codebook_terms() -> list[dict[str, Any]]:
    terms: list[dict[str, Any]] = []
    for category, labels in PAY_GROUPS:
        for label in labels:
            terms.append(
                {
                    "domain": "payroll",
                    "term_type": "earning",
                    "canonical_label": label,
                    "aliases": [label],
                    "category": category,
                    "value_kind": "money",
                    "active": True,
                }
            )
    for category, labels in DEDUCTION_GROUPS:
        for label in labels:
            terms.append(
                {
                    "domain": "payroll",
                    "term_type": "deduction",
                    "canonical_label": label,
                    "aliases": [label],
                    "category": category,
                    "value_kind": "money",
                    "active": True,
                }
            )
    for label in ["야간근무가산횟수", "무급생휴일", "대체근무가산횟수", "대체근무통상야근시간"]:
        terms.append(
            {
                "domain": "payroll",
                "term_type": "work_metric",
                "canonical_label": label,
                "aliases": [label],
                "category": "근무지표",
                "value_kind": "count",
                "active": True,
            }
        )
    return terms


def build_term_lookup(terms: list[dict[str, Any]]) -> dict[tuple[str, str], dict[str, Any]]:
    lookup: dict[tuple[str, str], dict[str, Any]] = {}
    for term in terms:
        if not term.get("active", True):
            continue
        term_type = str(term.get("term_type") or "")
        aliases = [term.get("canonical_label"), *list(term.get("aliases") or [])]
        for alias in aliases:
            key = (term_type, compact_text(alias))
            if key[1]:
                lookup[key] = term
    return lookup


def enrich_statement_with_codebook(statement: dict[str, Any], terms: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    terms = terms or default_codebook_terms()
    lookup = build_term_lookup(terms)
    enriched = dict(statement)

    def enrich_item(item: dict[str, Any], term_type: str) -> dict[str, Any]:
        item = dict(item)
        term = lookup.get((term_type, compact_text(item.get("label"))))
        if term:
            item["normalized_label"] = term.get("canonical_label")
            item["category"] = term.get("category")
            item["value_kind"] = term.get("value_kind")
        else:
            item.setdefault("normalized_label", item.get("label"))
            item.setdefault("category", "기타")
            item.setdefault("value_kind", "money" if term_type in {"earning", "deduction"} else "text")
        return item

    enriched["earnings"] = [enrich_item(item, "earning") for item in statement.get("earnings", [])]
    enriched["deductions"] = [enrich_item(item, "deduction") for item in statement.get("deductions", [])]
    supplemental = dict(statement.get("supplemental", {}))
    supplemental["work_metrics"] = [enrich_item(item, "work_metric") for item in supplemental.get("work_metrics", [])]
    enriched["supplemental"] = supplemental
    return enriched


def correction_kind(correction: dict[str, Any]) -> str:
    field_path = compact_text(correction.get("field_path")).lower()
    if "label" in field_path:
        return "alias"
    if "section" in field_path or "category" in field_path:
        return "classification"
    if "amount" in field_path or "value" in field_path:
        return "ocr_value"
    return "field_value"


def infer_term_type(correction: dict[str, Any]) -> str:
    field_path = compact_text(correction.get("field_path")).lower()
    section = compact_text(correction.get("section")).lower()
    if "deduction" in field_path or section == "deduction":
        return "deduction"
    if "earning" in field_path or section == "earning":
        return "earning"
    if "work_metric" in field_path or "workmetrics" in field_path:
        return "work_metric"
    return "unknown"


def analyze_corrections(corrections: list[dict[str, Any]], min_evidence: int = 2) -> list[dict[str, Any]]:
    grouped: dict[tuple[str, str, str, str], list[dict[str, Any]]] = defaultdict(list)
    for correction in corrections:
        old_value = str(correction.get("old_value") or "")
        new_value = str(correction.get("new_value") or "")
        if old_value == new_value or not new_value:
            continue
        key = (correction_kind(correction), infer_term_type(correction), old_value.strip(), new_value.strip())
        grouped[key].append(correction)

    candidates: list[dict[str, Any]] = []
    for (kind, term_type, old_value, new_value), evidence in grouped.items():
        if len(evidence) < min_evidence:
            continue
        source_formats = Counter(item.get("source_format") for item in evidence if item.get("source_format"))
        departments = Counter(item.get("department") for item in evidence if item.get("department"))
        candidate = {
            "id": stable_id("candidate", kind, term_type, old_value, new_value),
            "domain": "payroll",
            "candidate_type": kind,
            "term_type": term_type,
            "old_value": old_value,
            "new_value": new_value,
            "evidence_count": len(evidence),
            "evidence_correction_ids": [item.get("id") for item in evidence if item.get("id")],
            "source_formats": dict(source_formats),
            "departments": dict(departments),
            "recommendation": recommendation_for(kind, term_type, old_value, new_value),
            "created_at": utc_now(),
        }
        candidates.append(candidate)
    return sorted(candidates, key=lambda item: (-int(item.get("evidence_count") or 0), item.get("candidate_type") or ""))


def recommendation_for(kind: str, term_type: str, old_value: str, new_value: str) -> str:
    if kind == "alias":
        return f"Add alias `{old_value}` -> `{new_value}` for payroll {term_type} codebook after admin review."
    if kind == "classification":
        return f"Review classification change `{old_value}` -> `{new_value}` for payroll {term_type}."
    if kind == "ocr_value":
        return f"Add OCR normalization candidate `{old_value}` -> `{new_value}` if repeated in the same template."
    return f"Review repeated field correction `{old_value}` -> `{new_value}`."
