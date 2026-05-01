"""SQLite 기반 파싱 캐시 + (dept, month) 호출 카운터.

캐시 키 우선순위:
  1차: sha256(파일 binary) — 정확 매치
  2차: (dept, month, normalizedTitle) — 제목 기반 매칭
  3차: (dept, month) — 동일 부서·월 카운터로 4회 이상 차단

만료: 7일 (실제 근무표가 갱신될 가능성 고려).
"""
import json
import os
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Optional

from app.schemas.schedule import DutyGrid

CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000  # 7일
DEPT_MONTH_CALL_LIMIT = 3  # 같은 부서·월에 LLM 호출 최대 3회

DEFAULT_DB_PATH = Path.home() / ".snuhmate-backend" / "data.db"


def _resolve_db_path() -> Path:
    return Path(os.environ.get("SNUHMATE_BACKEND_DB", str(DEFAULT_DB_PATH)))


@contextmanager
def _conn(db_path: Optional[Path] = None):
    path = db_path or _resolve_db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db(db_path: Optional[Path] = None) -> None:
    """테이블 생성 (idempotent)."""
    with _conn(db_path) as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS parse_cache (
                sha256       TEXT PRIMARY KEY,
                dept         TEXT,
                month        TEXT,
                title_norm   TEXT,
                result_json  TEXT NOT NULL,
                created_at   INTEGER NOT NULL,
                expires_at   INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_dept_month
                ON parse_cache(dept, month);
            CREATE INDEX IF NOT EXISTS idx_title
                ON parse_cache(dept, month, title_norm);

            CREATE TABLE IF NOT EXISTS dept_month_calls (
                dept        TEXT NOT NULL,
                month       TEXT NOT NULL,
                call_count  INTEGER NOT NULL DEFAULT 0,
                last_called INTEGER NOT NULL,
                PRIMARY KEY (dept, month)
            );
            """
        )


def ping_db(db_path: Optional[Path] = None) -> bool:
    """Return True when SQLite is reachable and can execute a simple query."""
    try:
        with _conn(db_path) as conn:
            conn.execute("SELECT 1").fetchone()
        return True
    except (sqlite3.Error, OSError):
        return False


def normalize_title(title: Optional[str]) -> str:
    """제목 정규화 — 공백·확장자·특수문자 제거 후 lowercase."""
    if not title:
        return ""
    import re
    s = title.lower()
    s = re.sub(r"\.(pdf|xlsx?|csv|png|jpe?g)$", "", s)
    s = re.sub(r"[\s_\-\.]+", "", s)
    return s


def get_cache(sha256: str, db_path: Optional[Path] = None) -> Optional[DutyGrid]:
    """sha256 정확 매치 → DutyGrid (만료된 항목은 None)."""
    with _conn(db_path) as conn:
        row = conn.execute(
            "SELECT result_json, expires_at FROM parse_cache WHERE sha256 = ?",
            (sha256,),
        ).fetchone()
        if not row:
            return None
        if row["expires_at"] < int(time.time() * 1000):
            return None  # 만료
        return DutyGrid.model_validate_json(row["result_json"])


def get_cache_by_title(
    dept: str, month: str, title_norm: str, db_path: Optional[Path] = None
) -> Optional[DutyGrid]:
    """(dept, month, title_norm) 매치 → 가장 최근 결과."""
    with _conn(db_path) as conn:
        row = conn.execute(
            """SELECT result_json FROM parse_cache
               WHERE dept = ? AND month = ? AND title_norm = ?
                 AND expires_at >= ?
               ORDER BY created_at DESC LIMIT 1""",
            (dept, month, title_norm, int(time.time() * 1000)),
        ).fetchone()
        if not row:
            return None
        return DutyGrid.model_validate_json(row["result_json"])


def put_cache(
    sha256: str,
    grid: DutyGrid,
    title_norm: str = "",
    db_path: Optional[Path] = None,
) -> None:
    """캐시 저장."""
    now = int(time.time() * 1000)
    with _conn(db_path) as conn:
        conn.execute(
            """INSERT OR REPLACE INTO parse_cache
                 (sha256, dept, month, title_norm, result_json, created_at, expires_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                sha256,
                grid.dept or "",
                grid.month or "",
                title_norm,
                grid.model_dump_json(),
                now,
                now + CACHE_TTL_MS,
            ),
        )


def get_dept_month_call_count(dept: str, month: str, db_path: Optional[Path] = None) -> int:
    """같은 (dept, month) LLM 호출 횟수."""
    with _conn(db_path) as conn:
        row = conn.execute(
            "SELECT call_count FROM dept_month_calls WHERE dept = ? AND month = ?",
            (dept, month),
        ).fetchone()
        return row["call_count"] if row else 0


def increment_dept_month_call(dept: str, month: str, db_path: Optional[Path] = None) -> int:
    """LLM 호출 카운터 증가 → 새 카운트 반환."""
    now = int(time.time() * 1000)
    with _conn(db_path) as conn:
        conn.execute(
            """INSERT INTO dept_month_calls (dept, month, call_count, last_called)
               VALUES (?, ?, 1, ?)
               ON CONFLICT(dept, month) DO UPDATE SET
                 call_count = call_count + 1, last_called = ?""",
            (dept, month, now, now),
        )
        row = conn.execute(
            "SELECT call_count FROM dept_month_calls WHERE dept = ? AND month = ?",
            (dept, month),
        ).fetchone()
        return row["call_count"] if row else 0


def is_dept_month_blocked(dept: str, month: str, db_path: Optional[Path] = None) -> bool:
    """4회 이상이면 차단."""
    count = get_dept_month_call_count(dept, month, db_path)
    return count >= DEPT_MONTH_CALL_LIMIT
