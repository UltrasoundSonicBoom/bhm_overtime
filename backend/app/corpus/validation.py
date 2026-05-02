"""Server-side corpus payload validation and sanitization."""
from __future__ import annotations

from fastapi import HTTPException

ALLOWED_DEPTS = {"ICU", "CCU", "NICU", "응급실", "병동", "수술실", "외래", "기타"}
ALLOWED_TOP_LEVEL = {
    "deptCategory",
    "confidence",
    "parserVersion",
    "consentVersion",
    "rows",
    "codesFound",
    "month",
}
ALLOWED_ROW_FIELDS = {"days", "role", "confidence"}


def sanitize_corpus_payload(payload: object) -> dict:
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="corpus_json must be an object")

    dept = payload.get("deptCategory")
    if dept and dept not in ALLOWED_DEPTS:
        raise HTTPException(status_code=400, detail=f"deptCategory not allowed: {dept}")

    confidence = payload.get("confidence", 0)
    if (
        not isinstance(confidence, (int, float))
        or isinstance(confidence, bool)
        or not 0 <= confidence <= 1
    ):
        raise HTTPException(
            status_code=400, detail="confidence must be a number between 0 and 1"
        )

    rows = payload.get("rows", [])
    if not isinstance(rows, list):
        raise HTTPException(status_code=400, detail="rows must be an array")

    clean = {k: payload[k] for k in ALLOWED_TOP_LEVEL if k in payload and k != "rows"}
    clean["confidence"] = float(confidence)
    clean["rows"] = []
    for row in rows[:200]:
        if not isinstance(row, dict):
            continue
        clean_row = {k: row[k] for k in ALLOWED_ROW_FIELDS if k in row}
        if "days" in clean_row and not isinstance(clean_row["days"], dict):
            clean_row.pop("days", None)
        clean["rows"].append(clean_row)
    return clean
