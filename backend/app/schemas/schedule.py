"""근무표 파싱 결과 Pydantic 스키마.

클라이언트의 Zod 스키마와 1:1 미러. 서버 측에서 결정론적 검증을 수행.
"""
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


# 표준 듀티 코드 + 빈 셀
DutyCode = Literal["D", "E", "N", "O", "AL", "RD", ""]


class ScheduleRow(BaseModel):
    """간호사 1명의 월간 듀티."""

    name: str = Field(min_length=1, max_length=20)
    days: Dict[str, DutyCode] = Field(default_factory=dict)

    @field_validator("days")
    @classmethod
    def days_in_range(cls, v: Dict[str, DutyCode]) -> Dict[str, DutyCode]:
        for k in v:
            try:
                day = int(k)
            except ValueError:
                raise ValueError(f"day key must be int-like: {k}")
            if not (1 <= day <= 31):
                raise ValueError(f"day must be 1-31: {day}")
        return v


class DutyGrid(BaseModel):
    """파싱된 근무표 전체."""

    month: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}$")
    dept: Optional[str] = None
    rows: List[ScheduleRow] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0, default=0.0)
    notes: str = ""
    parser_version: str = "v1.0"
    source: str = ""  # "excel" | "csv" | "vision" | "ical"


class ParseRequest(BaseModel):
    """Vision 파싱 요청 (POST /parse/vision)."""

    image_base64: str
    profile_name: Optional[str] = None
    dept_hint: Optional[str] = None
    month_hint: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}$")


class CacheEntry(BaseModel):
    """캐시 엔트리."""

    sha256: str = Field(min_length=64, max_length=64, pattern=r"^[0-9a-f]+$")
    dept: Optional[str] = None
    month: Optional[str] = None
    title_norm: Optional[str] = None
    result: DutyGrid
    created_at: int  # epoch millis
    expires_at: int


class HealthResponse(BaseModel):
    ok: bool
    lm_studio: bool = False
    models: List[str] = Field(default_factory=list)
    db: bool = True
