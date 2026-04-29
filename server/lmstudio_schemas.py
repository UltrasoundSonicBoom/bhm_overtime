from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


ReviewStatus = Literal["pending", "approved", "rejected", "needs_more_info"]


class ExtractedTableCell(BaseModel):
    text: str = ""
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class ExtractedTableRow(BaseModel):
    label: str
    value: str
    unit: str | None = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    source_cells: list[ExtractedTableCell] = Field(default_factory=list)


class ExtractedTable(BaseModel):
    document_type: str = "payslip"
    rows: list[ExtractedTableRow] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    raw_text: str = ""


class MoneyItem(BaseModel):
    code: str
    label: str
    amount: Decimal
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    source_label: str | None = None

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        return value.strip().lower().replace(" ", "_")


class PayslipEmployee(BaseModel):
    name: str | None = None
    employee_id: str | None = None
    department: str | None = None
    role: str | None = None


class PayslipPeriod(BaseModel):
    year: int | None = Field(default=None, ge=2000, le=2100)
    month: int | None = Field(default=None, ge=1, le=12)
    label: str | None = None


class PayslipTotals(BaseModel):
    gross_pay: Decimal | None = None
    total_deductions: Decimal | None = None
    net_pay: Decimal | None = None


class NormalizedPayslip(BaseModel):
    model_config = ConfigDict(extra="allow")

    employee: PayslipEmployee = Field(default_factory=PayslipEmployee)
    period: PayslipPeriod = Field(default_factory=PayslipPeriod)
    earnings: list[MoneyItem] = Field(default_factory=list)
    deductions: list[MoneyItem] = Field(default_factory=list)
    totals: PayslipTotals = Field(default_factory=PayslipTotals)
    notes: list[str] = Field(default_factory=list)
    source_document_type: str = "payslip"

    @model_validator(mode="after")
    def require_some_financial_content(self) -> "NormalizedPayslip":
        if not self.earnings and not self.deductions and not any(
            value is not None
            for value in (
                self.totals.gross_pay,
                self.totals.total_deductions,
                self.totals.net_pay,
            )
        ):
            raise ValueError("at least one earning, deduction, or total is required")
        return self


class ValidationIssue(BaseModel):
    severity: Literal["info", "warning", "error"]
    code: str
    message: str
    path: str | None = None
    expected: str | None = None
    actual: str | None = None


class ValidationResult(BaseModel):
    ok: bool
    manual_review_required: bool
    confidence: float = Field(ge=0.0, le=1.0)
    issues: list[ValidationIssue] = Field(default_factory=list)


class ParseRequest(BaseModel):
    image_data_url: str | None = None
    image_base64: str | None = None
    mime_type: str = "image/png"
    document_type: str = "payslip"
    prompt_context: str | None = None
    create_review: bool = True

    @model_validator(mode="after")
    def require_image(self) -> "ParseRequest":
        if not self.image_data_url and not self.image_base64:
            raise ValueError("image_data_url or image_base64 is required")
        return self

    def as_data_url(self) -> str:
        if self.image_data_url:
            return self.image_data_url
        return f"data:{self.mime_type};base64,{self.image_base64}"


class ParsePipelineResult(BaseModel):
    id: str = Field(default_factory=lambda: f"lm-{uuid4().hex[:12]}")
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    qwen_model: str
    gemma_model: str
    extracted: ExtractedTable
    normalized: NormalizedPayslip
    validation: ValidationResult
    review_status: ReviewStatus = "pending"


class ReviewDecisionRequest(BaseModel):
    status: ReviewStatus
    reviewer: str = "admin"
    note: str | None = None
    normalized_override: dict[str, Any] | None = None


class ReviewRecord(ParsePipelineResult):
    reviewed_at: str | None = None
    reviewer: str | None = None
    reviewer_note: str | None = None


# ── Schedule schemas ──────────────────────────────────────────────────────────

KNOWN_SCHEDULE_CODES = frozenset({
    "D", "E", "N", "O", "OFF", "AL", "RD",
    "d", "e", "n", "o", "off", "al", "rd",
})


class SchedulePeriod(BaseModel):
    year: int | None = Field(default=None, ge=2000, le=2100)
    month: int | None = Field(default=None, ge=1, le=12)
    label: str | None = None


class ScheduleEntry(BaseModel):
    date: str
    code: str
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)

    @field_validator("code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        return value.strip().upper()

    @field_validator("date")
    @classmethod
    def validate_date_format(cls, value: str) -> str:
        import re
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", value):
            raise ValueError(f"date must be YYYY-MM-DD, got: {value!r}")
        return value


class EmployeeSchedule(BaseModel):
    name: str | None = None
    employee_id: str | None = None
    role: str | None = None
    entries: list[ScheduleEntry] = Field(default_factory=list)


# ── Stage 1: qwen3-vl raw cell extraction ────────────────────────────────────

class ExtractedScheduleCell(BaseModel):
    row_idx: int = Field(ge=0)
    col_idx: int = Field(ge=0)
    text: str = ""
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class ExtractedScheduleRow(BaseModel):
    employee_label: str = ""
    role_label: str | None = None
    cells: list[ExtractedScheduleCell] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class ExtractedSchedule(BaseModel):
    document_type: str = "schedule"
    period_label: str | None = None
    header_dates: list[str] = Field(default_factory=list)
    rows: list[ExtractedScheduleRow] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    raw_text: str = ""


# ── Stage 2: gemma normalization ─────────────────────────────────────────────

class NormalizedSchedule(BaseModel):
    period: SchedulePeriod = Field(default_factory=SchedulePeriod)
    employees: list[EmployeeSchedule] = Field(default_factory=list)
    codes_found: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def require_some_employees(self) -> "NormalizedSchedule":
        if not self.employees:
            raise ValueError("at least one employee schedule entry is required")
        return self


class SchedulePipelineResult(BaseModel):
    id: str = Field(default_factory=lambda: f"sch-{uuid4().hex[:12]}")
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    qwen_model: str
    gemma_model: str
    extracted: ExtractedSchedule
    normalized: NormalizedSchedule
    validation: ValidationResult
    review_status: ReviewStatus = "pending"


class ScheduleReviewRecord(SchedulePipelineResult):
    reviewed_at: str | None = None
    reviewer: str | None = None
    reviewer_note: str | None = None
    normalized_override: NormalizedSchedule | None = None
