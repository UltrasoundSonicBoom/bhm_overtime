from __future__ import annotations

import json
import os
import re
import time
from decimal import Decimal
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError

from lmstudio_schemas import (
    EmployeeSchedule,
    ExtractedSchedule,
    ExtractedTable,
    KNOWN_SCHEDULE_CODES,
    NormalizedPayslip,
    NormalizedSchedule,
    ParsePipelineResult,
    ParseRequest,
    ReviewDecisionRequest,
    ReviewRecord,
    ScheduleEntry,
    SchedulePeriod,
    SchedulePipelineResult,
    ScheduleReviewRecord,
    ValidationIssue,
    ValidationResult,
)


LMSTUDIO_BASE_URL = os.getenv("LMSTUDIO_BASE_URL", "http://127.0.0.1:1234/v1").rstrip("/")
QWEN_VL_MODEL = os.getenv("SNUHMATE_QWEN_VL_MODEL", "qwen/qwen3-vl-8b")
GEMMA_MODEL = os.getenv("SNUHMATE_GEMMA_MODEL", "google/gemma-4-e4b")
REVIEW_STORE = Path(os.getenv("SNUHMATE_LMSTUDIO_REVIEW_STORE", "data/lmstudio-review-queue.json"))
SCHEDULE_REVIEW_STORE = Path(os.getenv("SNUHMATE_SCHEDULE_REVIEW_STORE", "data/schedule-review-queue.json"))
REQUEST_TIMEOUT_SECONDS = int(os.getenv("LMSTUDIO_TIMEOUT_SECONDS", "180"))


class MarkdownFormatRequest(BaseModel):
    title: str = "PDF Markdown 변환"
    source_text: str = Field(min_length=1)
    source_file: str | None = None


class MarkdownFormatResponse(BaseModel):
    title: str
    markdown: str
    metrics: dict[str, Any]


app = FastAPI(title="SNUH Mate LM Studio Gateway", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


def _json_default(value: Any) -> Any:
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral() else float(value)
    raise TypeError(f"{type(value).__name__} is not JSON serializable")


def _lmstudio_request(path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    url = f"{LMSTUDIO_BASE_URL}{path}"
    data = None
    method = "GET"
    headers = {"Content-Type": "application/json"}
    if payload is not None:
        data = json.dumps(payload, default=_json_default).encode("utf-8")
        method = "POST"
    request = Request(url, data=data, headers=headers, method=method)
    try:
        with urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            return json.loads(response.read().decode("utf-8"))
    except URLError as exc:
        raise HTTPException(status_code=503, detail=f"LM Studio is not reachable at {url}: {exc}") from exc
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail=f"LM Studio request timed out at {url}") from exc
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail=f"LM Studio returned invalid JSON from {url}") from exc


def _extract_json_object(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start >= 0 and end > start:
            return json.loads(cleaned[start : end + 1])
        raise


def _chat_completion(
    model: str,
    messages: list[dict[str, Any]],
    temperature: float = 0.1,
    max_tokens: int = 2200,
) -> str:
    response = _lmstudio_request(
        "/chat/completions",
        {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
        },
    )
    msg = response.get("choices", [{}])[0].get("message", {})
    content = msg.get("content", "") or ""
    if content.strip():
        return content
    # 추론 모델 (gemma-4-e4b 등): content 가 비면 reasoning_content 반환
    return msg.get("reasoning_content", "") or ""


def _is_markdown_heading(line: str) -> str | None:
    compact = re.sub(r"\s+", " ", line.strip())
    if re.fullmatch(r"제\s*\d+\s*장\s+.+", compact):
        return f"# {compact}"
    if re.fullmatch(r"제\d+조\(.+\).*", compact):
        return f"## {compact}"
    if re.fullmatch(r"<\d{4}\.\d{2}>\s*.+", compact):
        return f"### {compact}"
    if re.fullmatch(r"<.+>", compact):
        return f"## {compact}"
    return None


def _is_paragraph_breaker(line: str) -> bool:
    compact = line.strip()
    return bool(
        _is_markdown_heading(compact)
        or re.match(r"^\(?\d+\)|^①|^②|^③|^④|^⑤|^⑥|^⑦|^⑧|^⑨|^⑩", compact)
        or re.match(r"^[-*•▶▣]\s*", compact)
    )


def _normalize_pdf_text_to_markdown(title: str, source_text: str, source_file: str | None = None) -> str:
    pages = source_text.replace("\r\n", "\n").replace("\r", "\n").split("\f")
    output: list[str] = [f"# {title.strip() or 'PDF Markdown 변환'}", ""]
    if source_file:
        output.extend([f"> 원본: `{source_file}`", ""])

    def flush_paragraph(paragraph: list[str]) -> None:
        if not paragraph:
            return
        text = " ".join(part.strip() for part in paragraph if part.strip())
        text = re.sub(r"\s+", " ", text).strip()
        if text:
            output.append(text)
            output.append("")
        paragraph.clear()

    for page_index, page in enumerate(pages, start=1):
        paragraph: list[str] = []
        page_had_content = False
        for raw_line in page.splitlines():
            line = raw_line.strip()
            if not line:
                flush_paragraph(paragraph)
                continue

            footer_match = re.fullmatch(r"-\s*(\d+)\s*-", line)
            if footer_match:
                flush_paragraph(paragraph)
                output.append(f"<!-- PDF page {page_index}, source page {footer_match.group(1)} -->")
                output.append("")
                continue

            heading = _is_markdown_heading(line)
            if heading:
                flush_paragraph(paragraph)
                output.append(heading)
                output.append("")
                page_had_content = True
                continue

            if _is_paragraph_breaker(line):
                flush_paragraph(paragraph)
                if re.match(r"^[-*•▶▣]\s*", line):
                    output.append(re.sub(r"^[-*•▶▣]\s*", "- ", line))
                else:
                    output.append(line)
                output.append("")
                page_had_content = True
                continue

            paragraph.append(line)
            page_had_content = True
        flush_paragraph(paragraph)
        if page_had_content and page_index != len(pages):
            output.append("---")
            output.append("")

    return "\n".join(output).strip() + "\n"


def _markdown_quality_metrics(source_text: str, markdown: str, elapsed_seconds: float) -> dict[str, Any]:
    source_compact = re.sub(r"\s+", "", source_text)
    markdown_compact = re.sub(r"\s+", "", markdown)
    source_articles = re.findall(r"제\d+조\(", source_text)
    markdown_articles = re.findall(r"제\d+조\(", markdown)
    source_agreements = re.findall(r"<\d{4}\.\d{2}>", source_text)
    markdown_agreements = re.findall(r"<\d{4}\.\d{2}>", markdown)
    source_pages = len([page for page in source_text.split("\f") if page.strip()])
    retention_ratio = len(markdown_compact) / len(source_compact) if source_compact else 0.0
    return {
        "elapsed_seconds": round(elapsed_seconds, 3),
        "source_pages": source_pages,
        "source_chars": len(source_text),
        "markdown_chars": len(markdown),
        "nonspace_retention_ratio": round(retention_ratio, 3),
        "source_article_count": len(source_articles),
        "markdown_article_count": len(markdown_articles),
        "article_count_match": len(source_articles) == len(markdown_articles),
        "source_agreement_date_count": len(source_agreements),
        "markdown_agreement_date_count": len(markdown_agreements),
        "agreement_date_count_match": len(source_agreements) == len(markdown_agreements),
    }


def _run_qwen_table_extract(request: ParseRequest) -> ExtractedTable:
    prompt = f"""
You are extracting a Korean hospital payslip image into machine-readable table rows.
Return JSON only with this shape:
{{
  "document_type": "{request.document_type}",
  "rows": [
    {{"label": "항목명", "value": "원문 값", "unit": "원|시간|일|null", "confidence": 0.0}}
  ],
  "warnings": ["uncertain OCR or layout issue"],
  "raw_text": "short OCR-like text summary"
}}
Rules:
- Preserve Korean labels exactly when visible.
- Do not invent missing money values.
- Set confidence below 0.7 for cropped, blurry, or ambiguous cells.
"""
    if request.prompt_context:
        prompt += f"\nAdditional context from operator: {request.prompt_context}\n"

    content = _chat_completion(
        QWEN_VL_MODEL,
        [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": request.as_data_url()}},
                ],
            }
        ],
    )
    try:
        return ExtractedTable.model_validate(_extract_json_object(content))
    except (json.JSONDecodeError, ValidationError) as exc:
        raise HTTPException(status_code=502, detail=f"Qwen table extraction returned unusable JSON: {exc}") from exc


def _run_gemma_normalize(extracted: ExtractedTable) -> NormalizedPayslip:
    prompt = f"""
Normalize these extracted Korean payslip rows into SNUH Mate DB-ready JSON.
Return JSON only with this exact shape:
{{
  "employee": {{"name": null, "employee_id": null, "department": null, "role": null}},
  "period": {{"year": null, "month": null, "label": null}},
  "earnings": [{{"code": "base_pay", "label": "기본급", "amount": 0, "confidence": 0.0, "source_label": "기본급"}}],
  "deductions": [{{"code": "income_tax", "label": "소득세", "amount": 0, "confidence": 0.0, "source_label": "소득세"}}],
  "totals": {{"gross_pay": null, "total_deductions": null, "net_pay": null}},
  "notes": [],
  "source_document_type": "{extracted.document_type}"
}}
Rules:
- Use numbers only for amounts, without comma separators.
- Classify 지급/수당 as earnings and 공제/세금/보험 as deductions.
- If a total row is visible, put it in totals instead of duplicating it as a line item.
- If uncertain, keep the item but lower confidence and add a note.

Extracted rows:
{extracted.model_dump_json(indent=2)}
"""
    content = _chat_completion(GEMMA_MODEL, [{"role": "user", "content": prompt}])
    try:
        return NormalizedPayslip.model_validate(_extract_json_object(content))
    except (json.JSONDecodeError, ValidationError) as exc:
        raise HTTPException(status_code=502, detail=f"Gemma normalization returned unusable JSON: {exc}") from exc


def validate_payslip(normalized: NormalizedPayslip) -> ValidationResult:
    issues: list[ValidationIssue] = []
    earning_sum = sum((item.amount for item in normalized.earnings), Decimal("0"))
    deduction_sum = sum((item.amount for item in normalized.deductions), Decimal("0"))

    if normalized.totals.gross_pay is not None and earning_sum and normalized.totals.gross_pay != earning_sum:
        issues.append(
            ValidationIssue(
                severity="warning",
                code="gross_mismatch",
                message="지급 합계와 항목 합산이 일치하지 않습니다.",
                path="totals.gross_pay",
                expected=str(earning_sum),
                actual=str(normalized.totals.gross_pay),
            )
        )
    if normalized.totals.total_deductions is not None and deduction_sum and normalized.totals.total_deductions != deduction_sum:
        issues.append(
            ValidationIssue(
                severity="warning",
                code="deduction_mismatch",
                message="공제 합계와 항목 합산이 일치하지 않습니다.",
                path="totals.total_deductions",
                expected=str(deduction_sum),
                actual=str(normalized.totals.total_deductions),
            )
        )
    if (
        normalized.totals.gross_pay is not None
        and normalized.totals.total_deductions is not None
        and normalized.totals.net_pay is not None
    ):
        expected_net = normalized.totals.gross_pay - normalized.totals.total_deductions
        if expected_net != normalized.totals.net_pay:
            issues.append(
                ValidationIssue(
                    severity="error",
                    code="net_pay_mismatch",
                    message="실지급액이 지급총액-공제총액과 일치하지 않습니다.",
                    path="totals.net_pay",
                    expected=str(expected_net),
                    actual=str(normalized.totals.net_pay),
                )
            )

    low_confidence = [
        item for item in [*normalized.earnings, *normalized.deductions] if item.confidence < 0.72
    ]
    if low_confidence:
        issues.append(
            ValidationIssue(
                severity="warning",
                code="low_confidence_items",
                message=f"신뢰도 0.72 미만 항목이 {len(low_confidence)}개 있습니다.",
                path="earnings,deductions",
            )
        )

    if normalized.period.year is None or normalized.period.month is None:
        issues.append(
            ValidationIssue(
                severity="warning",
                code="missing_period",
                message="급여 귀속 연월을 확정하지 못했습니다.",
                path="period",
            )
        )

    confidence_values = [item.confidence for item in [*normalized.earnings, *normalized.deductions]]
    confidence = sum(confidence_values) / len(confidence_values) if confidence_values else 0.0
    manual_review_required = any(issue.severity in {"warning", "error"} for issue in issues) or confidence < 0.8
    return ValidationResult(
        ok=not any(issue.severity == "error" for issue in issues),
        manual_review_required=manual_review_required,
        confidence=max(0.0, min(1.0, confidence)),
        issues=issues,
    )


def _read_reviews() -> list[ReviewRecord]:
    if not REVIEW_STORE.exists():
        return []
    raw = json.loads(REVIEW_STORE.read_text(encoding="utf-8"))
    return [ReviewRecord.model_validate(item) for item in raw]


def _write_reviews(records: list[ReviewRecord]) -> None:
    REVIEW_STORE.parent.mkdir(parents=True, exist_ok=True)
    REVIEW_STORE.write_text(
        json.dumps([record.model_dump(mode="json") for record in records], ensure_ascii=False, indent=2, default=_json_default),
        encoding="utf-8",
    )


def _append_review(result: ParsePipelineResult) -> ReviewRecord:
    records = _read_reviews()
    record = ReviewRecord.model_validate(result.model_dump())
    records.insert(0, record)
    _write_reviews(records[:200])
    return record


@app.get("/api/lmstudio/health")
def health() -> dict[str, Any]:
    models_payload = _lmstudio_request("/models")
    model_ids = [item.get("id") for item in models_payload.get("data", [])]
    return {
        "ok": QWEN_VL_MODEL in model_ids and GEMMA_MODEL in model_ids,
        "base_url": LMSTUDIO_BASE_URL,
        "required_models": {
            "qwen_vl": QWEN_VL_MODEL,
            "gemma": GEMMA_MODEL,
        },
        "available_models": model_ids,
    }


@app.post("/api/lmstudio/validate")
def validate_only(payload: dict[str, Any]) -> dict[str, Any]:
    try:
        normalized = NormalizedPayslip.model_validate(payload)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc
    return {
        "normalized": normalized.model_dump(mode="json"),
        "validation": validate_payslip(normalized).model_dump(mode="json"),
    }


@app.post("/api/lmstudio/pdf/markdown")
def format_pdf_markdown(request: MarkdownFormatRequest) -> dict[str, Any]:
    started = time.perf_counter()
    markdown = _normalize_pdf_text_to_markdown(
        title=request.title,
        source_text=request.source_text,
        source_file=request.source_file,
    )
    elapsed = time.perf_counter() - started
    response = MarkdownFormatResponse(
        title=request.title,
        markdown=markdown,
        metrics=_markdown_quality_metrics(request.source_text, markdown, elapsed),
    )
    return response.model_dump(mode="json")


@app.post("/api/lmstudio/payslip/parse")
def parse_payslip(request: ParseRequest) -> dict[str, Any]:
    extracted = _run_qwen_table_extract(request)
    normalized = _run_gemma_normalize(extracted)
    validation = validate_payslip(normalized)
    result = ParsePipelineResult(
        qwen_model=QWEN_VL_MODEL,
        gemma_model=GEMMA_MODEL,
        extracted=extracted,
        normalized=normalized,
        validation=validation,
        review_status="pending" if validation.manual_review_required else "approved",
    )
    if request.create_review or validation.manual_review_required:
        record = _append_review(result)
        return record.model_dump(mode="json")
    return result.model_dump(mode="json")


@app.get("/api/admin/lmstudio/reviews")
def list_reviews(status: str | None = None) -> dict[str, Any]:
    records = _read_reviews()
    if status:
        records = [record for record in records if record.review_status == status]
    return {"items": [record.model_dump(mode="json") for record in records]}


@app.post("/api/admin/lmstudio/reviews/{review_id}/decision")
def decide_review(review_id: str, decision: ReviewDecisionRequest) -> dict[str, Any]:
    records = _read_reviews()
    for index, record in enumerate(records):
        if record.id != review_id:
            continue
        normalized = record.normalized
        if decision.normalized_override:
            normalized = NormalizedPayslip.model_validate(decision.normalized_override)
            record.normalized = normalized
            record.validation = validate_payslip(normalized)
        record.review_status = decision.status
        record.reviewer = decision.reviewer
        record.reviewer_note = decision.note
        from datetime import datetime, timezone

        record.reviewed_at = datetime.now(timezone.utc).isoformat()
        records[index] = record
        _write_reviews(records)
        return record.model_dump(mode="json")
    raise HTTPException(status_code=404, detail="review not found")


# ── Schedule pipeline ─────────────────────────────────────────────────────────

def _run_qwen_schedule_table_extract(request: ParseRequest) -> ExtractedSchedule:
    """Stage 1: 이미지 → raw 표 셀 (직원/헤더/셀 텍스트). 정규화는 Stage 2 에서."""
    prompt = """이 근무표 이미지의 표 구조를 그대로 raw JSON으로 추출하세요.
설명 없이 JSON만 반환:
{
  "document_type": "schedule",
  "period_label": "2026년 4월" 또는 null,
  "header_dates": ["1", "2", "3", ...],
  "rows": [
    {
      "employee_label": "직원 이름 또는 라벨",
      "role_label": "직책 또는 null",
      "cells": [
        {"row_idx": 0, "col_idx": 0, "text": "셀 텍스트 그대로", "confidence": 0.95}
      ],
      "confidence": 0.9
    }
  ],
  "warnings": [],
  "raw_text": "표 짧은 요약"
}
규칙:
- 셀 텍스트는 보이는 그대로 (정규화 금지)
- 빈 셀은 text=""
- 흐림/잘림은 confidence 0.7 미만"""
    if request.prompt_context:
        prompt += f"\n운영자 추가 힌트: {request.prompt_context}\n"

    content = _chat_completion(
        QWEN_VL_MODEL,
        [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": request.as_data_url()}},
                ],
            }
        ],
        temperature=0.05,
        max_tokens=8000,
    )
    try:
        return ExtractedSchedule.model_validate(_extract_json_object(content))
    except (json.JSONDecodeError, ValidationError) as exc:
        raise HTTPException(status_code=502, detail=f"Qwen schedule table extraction returned unusable JSON: {exc}") from exc


def _compact_extracted_for_gemma(extracted: ExtractedSchedule) -> str:
    """ExtractedSchedule → CSV-like 압축 (gemma-4-e4b 4k context 제약)."""
    lines = [
        f"period={extracted.period_label or '?'}",
        f"header={','.join(extracted.header_dates)}",
    ]
    for ri, row in enumerate(extracted.rows):
        cell_texts = ["" for _ in range(len(extracted.header_dates))]
        for c in row.cells:
            if 0 <= c.col_idx < len(cell_texts):
                cell_texts[c.col_idx] = c.text or ""
        lines.append(f"r{ri}|{row.employee_label}|{','.join(cell_texts)}")
    return "\n".join(lines)


_HEADER_LIKE_LABELS = {"HPPD 총책", "HPPD 총족", "HPPD", "간호사", "내", "이름", ""}


def _run_gemma_schedule_normalize(extracted: ExtractedSchedule) -> NormalizedSchedule:
    """Stage 2: gemma-4 추론 모델로 헤더/날짜 매핑 + 코드 정규화."""
    compact = _compact_extracted_for_gemma(extracted)
    prompt = f"""근무표 정규화. CSV-like 입출력 (4k 컨텍스트 제약).

출력 (이 형식만, 다른 설명 금지):
PERIOD: YYYY-MM
DATES: YYYY-MM-DD,YYYY-MM-DD,...   (각 col_idx 의 날짜)
ROWS:
r0|<정규화된이름 또는 SKIP>|코드1,코드2,...
r1|...

코드 정규화: 데이/d→D, 이브닝/e→E, 나이트/n→N, 오프/o/off→OFF, 연차/al→AL, 리커버리/rd→RD, 빈셀→"-", 알수없음→원문 유지
헤더성 라벨 (HPPD/간호사/이름) 은 SKIP

입력:
{compact}
"""
    content = _chat_completion(
        GEMMA_MODEL,
        [{"role": "user", "content": prompt}],
        temperature=0.05,
        max_tokens=2000,
    )
    return _parse_gemma_compact_output(content, extracted)


def _parse_gemma_compact_output(text: str, extracted: ExtractedSchedule) -> NormalizedSchedule:
    """gemma CSV-like 응답 → NormalizedSchedule. reasoning_content 도 처리."""
    text = (text or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        nl = text.find("\n")
        if nl > 0 and text[:nl].strip().lower() in {"text", "csv", "json"}:
            text = text[nl + 1 :]

    period_year: int | None = None
    period_month: int | None = None
    period_label: str | None = None
    dates: list[str] = []
    rows_data: dict[str, tuple[str, list[str]]] = {}

    in_rows = False
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        upper = line.upper()
        if upper.startswith("PERIOD:"):
            v = line.split(":", 1)[1].strip()
            m = re.match(r"(\d{4})-(\d{1,2})", v)
            if m:
                period_year = int(m.group(1))
                period_month = int(m.group(2))
                period_label = v
            in_rows = False
        elif upper.startswith("DATES:"):
            v = line.split(":", 1)[1].strip()
            dates = [d.strip() for d in v.split(",") if d.strip()]
            in_rows = False
        elif upper.startswith("ROWS"):
            in_rows = True
        elif in_rows and "|" in line:
            parts = line.split("|", 2)
            if len(parts) == 3:
                row_id, name, codes_csv = parts
                rows_data[row_id.strip()] = (name.strip(), [c.strip() for c in codes_csv.split(",")])

    employees: list[EmployeeSchedule] = []
    codes_found: set[str] = set()
    warnings: list[str] = []

    for ri, row in enumerate(extracted.rows):
        row_id = f"r{ri}"
        gemma_data = rows_data.get(row_id)
        name = (gemma_data[0] if gemma_data else row.employee_label) or ""
        if name.upper() == "SKIP" or name in _HEADER_LIKE_LABELS:
            continue
        codes = gemma_data[1] if gemma_data else []
        entries: list[ScheduleEntry] = []
        for ci, code in enumerate(codes):
            if not code or code == "-":
                continue
            if ci >= len(dates):
                warnings.append(f"{name} col {ci} has no mapped date")
                continue
            try:
                entry = ScheduleEntry(date=dates[ci], code=code, confidence=0.85)
                entries.append(entry)
                codes_found.add(entry.code)
            except ValidationError as exc:
                warnings.append(f"{name} {dates[ci]} {code}: {exc.errors()[0]['msg']}")
        if entries:
            employees.append(EmployeeSchedule(name=name, entries=entries))

    if not employees:
        raise HTTPException(
            status_code=502,
            detail="Gemma schedule normalization yielded no employees (compact output unparseable)",
        )

    return NormalizedSchedule(
        period=SchedulePeriod(year=period_year, month=period_month, label=period_label),
        employees=employees,
        codes_found=sorted(codes_found),
        warnings=warnings,
        notes=[],
    )


def validate_schedule(normalized: NormalizedSchedule) -> ValidationResult:
    issues: list[ValidationIssue] = []

    for emp in normalized.employees:
        for entry in emp.entries:
            if entry.code not in KNOWN_SCHEDULE_CODES:
                issues.append(ValidationIssue(
                    severity="warning",
                    code="unknown_code",
                    message=f"알 수 없는 근무 코드: {entry.code!r} (직원: {emp.name})",
                    path=f"employees[{emp.name}].entries",
                    actual=entry.code,
                ))

    low_conf = [
        e for emp in normalized.employees for e in emp.entries if e.confidence < 0.7
    ]
    if low_conf:
        issues.append(ValidationIssue(
            severity="warning",
            code="low_confidence_cells",
            message=f"신뢰도 0.7 미만 셀 {len(low_conf)}개",
            path="employees[*].entries",
        ))

    if normalized.period.year is None or normalized.period.month is None:
        issues.append(ValidationIssue(
            severity="warning",
            code="missing_period",
            message="귀속 연월을 확정하지 못했습니다.",
            path="period",
        ))

    all_conf = [e.confidence for emp in normalized.employees for e in emp.entries]
    avg_conf = sum(all_conf) / len(all_conf) if all_conf else 0.0
    manual = any(i.severity in {"warning", "error"} for i in issues) or avg_conf < 0.8
    return ValidationResult(
        ok=not any(i.severity == "error" for i in issues),
        manual_review_required=manual,
        confidence=max(0.0, min(1.0, avg_conf)),
        issues=issues,
    )


def _read_schedule_reviews() -> list[ScheduleReviewRecord]:
    if not SCHEDULE_REVIEW_STORE.exists():
        return []
    raw = json.loads(SCHEDULE_REVIEW_STORE.read_text(encoding="utf-8"))
    return [ScheduleReviewRecord.model_validate(item) for item in raw]


def _write_schedule_reviews(records: list[ScheduleReviewRecord]) -> None:
    SCHEDULE_REVIEW_STORE.parent.mkdir(parents=True, exist_ok=True)
    SCHEDULE_REVIEW_STORE.write_text(
        json.dumps([r.model_dump(mode="json") for r in records], ensure_ascii=False, indent=2, default=_json_default),
        encoding="utf-8",
    )


def _append_schedule_review(result: SchedulePipelineResult) -> ScheduleReviewRecord:
    records = _read_schedule_reviews()
    record = ScheduleReviewRecord.model_validate(result.model_dump())
    records.insert(0, record)
    _write_schedule_reviews(records[:200])
    return record


@app.post("/api/lmstudio/schedule/parse")
def parse_schedule(request: ParseRequest) -> dict[str, Any]:
    extracted = _run_qwen_schedule_table_extract(request)
    normalized = _run_gemma_schedule_normalize(extracted)
    validation = validate_schedule(normalized)
    result = SchedulePipelineResult(
        qwen_model=QWEN_VL_MODEL,
        gemma_model=GEMMA_MODEL,
        extracted=extracted,
        normalized=normalized,
        validation=validation,
        review_status="pending" if validation.manual_review_required else "approved",
    )
    if request.create_review or validation.manual_review_required:
        record = _append_schedule_review(result)
        return record.model_dump(mode="json")
    return result.model_dump(mode="json")


@app.get("/api/admin/lmstudio/schedule-reviews")
def list_schedule_reviews(status: str | None = None) -> dict[str, Any]:
    records = _read_schedule_reviews()
    if status:
        records = [r for r in records if r.review_status == status]
    return {"items": [r.model_dump(mode="json") for r in records]}


@app.post("/api/admin/lmstudio/schedule-reviews/{review_id}/decision")
def decide_schedule_review(review_id: str, decision: ReviewDecisionRequest) -> dict[str, Any]:
    records = _read_schedule_reviews()
    for index, record in enumerate(records):
        if record.id != review_id:
            continue
        if decision.normalized_override:
            record.normalized = NormalizedSchedule.model_validate(decision.normalized_override)
            record.validation = validate_schedule(record.normalized)
        record.review_status = decision.status
        record.reviewer = decision.reviewer
        record.reviewer_note = decision.note
        from datetime import datetime, timezone
        record.reviewed_at = datetime.now(timezone.utc).isoformat()
        records[index] = record
        _write_schedule_reviews(records)
        return record.model_dump(mode="json")
    raise HTTPException(status_code=404, detail="schedule review not found")


if __name__ == "__main__":
    uvicorn.run(app, host=os.getenv("HOST", "127.0.0.1"), port=int(os.getenv("PORT", "3001")))
