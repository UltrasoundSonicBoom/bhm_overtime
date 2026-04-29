"""backend/tests/test_cache.py — SQLite 캐시 + 카운터 테스트."""
import os
import tempfile
import time
from pathlib import Path

import pytest

from app.cache.sqlite import (
    DEPT_MONTH_CALL_LIMIT,
    get_cache,
    get_cache_by_title,
    get_dept_month_call_count,
    increment_dept_month_call,
    init_db,
    is_dept_month_blocked,
    normalize_title,
    put_cache,
)
from app.schemas.schedule import DutyGrid, ScheduleRow


@pytest.fixture
def db_path(tmp_path: Path) -> Path:
    """임시 DB 경로 (테스트마다 새로 생성)."""
    p = tmp_path / "test.db"
    os.environ["SNUHMATE_BACKEND_DB"] = str(p)
    init_db(p)
    yield p
    os.environ.pop("SNUHMATE_BACKEND_DB", None)


def _make_grid() -> DutyGrid:
    return DutyGrid(
        month="2026-04",
        dept="ICU",
        rows=[ScheduleRow(name="김민지", days={"1": "D", "2": "E"})],
        confidence=0.95,
        notes="",
        parser_version="test-v1",
        source="excel",
    )


def test_normalize_title():
    assert normalize_title("2026-04 ICU 근무표.pdf") == "202604icu근무표"
    assert normalize_title("ICU.xlsx") == "icu"
    assert normalize_title(None) == ""


def test_cache_round_trip(db_path: Path):
    grid = _make_grid()
    put_cache("a" * 64, grid, "icu202604")

    fetched = get_cache("a" * 64)
    assert fetched is not None
    assert fetched.dept == "ICU"
    assert fetched.rows[0].name == "김민지"


def test_cache_miss(db_path: Path):
    assert get_cache("b" * 64) is None


def test_cache_by_title(db_path: Path):
    grid = _make_grid()
    put_cache("c" * 64, grid, "icu202604")
    fetched = get_cache_by_title("ICU", "2026-04", "icu202604")
    assert fetched is not None


def test_dept_month_counter(db_path: Path):
    assert get_dept_month_call_count("ICU", "2026-04") == 0
    assert not is_dept_month_blocked("ICU", "2026-04")

    n = increment_dept_month_call("ICU", "2026-04")
    assert n == 1
    n = increment_dept_month_call("ICU", "2026-04")
    assert n == 2
    n = increment_dept_month_call("ICU", "2026-04")
    assert n == 3

    # 3회 도달 → 차단
    assert is_dept_month_blocked("ICU", "2026-04")


def test_dept_month_isolation(db_path: Path):
    """ICU 카운터가 다른 부서에 영향 없음."""
    increment_dept_month_call("ICU", "2026-04")
    increment_dept_month_call("ICU", "2026-04")
    increment_dept_month_call("ICU", "2026-04")
    assert is_dept_month_blocked("ICU", "2026-04")
    assert not is_dept_month_blocked("병동", "2026-04")
    assert not is_dept_month_blocked("ICU", "2026-05")
