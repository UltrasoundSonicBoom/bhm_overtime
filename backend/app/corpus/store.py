"""익명화된 코퍼스 + 리뷰 큐 저장소."""
import json
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Optional

from app.cache.sqlite import _resolve_db_path


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


def init_corpus_db(db_path: Optional[Path] = None) -> None:
    """코퍼스/리뷰 테이블 생성 (idempotent)."""
    with _conn(db_path) as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS corpus_entries (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                payload_json TEXT NOT NULL,
                dept_category TEXT,
                confidence   REAL,
                parser_version TEXT,
                consent_version TEXT,
                created_at   INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_corpus_dept ON corpus_entries(dept_category);
            CREATE INDEX IF NOT EXISTS idx_corpus_conf ON corpus_entries(confidence);

            CREATE TABLE IF NOT EXISTS reviews (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                payload_json TEXT NOT NULL,
                confidence   REAL,
                status       TEXT DEFAULT 'pending',  -- 'pending' | 'verified' | 'rejected'
                created_at   INTEGER NOT NULL,
                reviewed_at  INTEGER
            );
            CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
            """
        )


def add_corpus_entry(payload: dict, db_path: Optional[Path] = None) -> int:
    """코퍼스 항목 저장. confidence < 0.9면 reviews 큐에도 자동 추가."""
    init_corpus_db(db_path)
    now = int(time.time() * 1000)
    payload_json = json.dumps(payload, ensure_ascii=False)
    confidence = payload.get("confidence", 0)

    with _conn(db_path) as conn:
        cur = conn.execute(
            """INSERT INTO corpus_entries
                (payload_json, dept_category, confidence, parser_version, consent_version, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                payload_json,
                payload.get("deptCategory"),
                confidence,
                payload.get("parserVersion"),
                payload.get("consentVersion"),
                now,
            ),
        )
        corpus_id = cur.lastrowid

        if confidence < 0.9:
            conn.execute(
                """INSERT INTO reviews (payload_json, confidence, status, created_at)
                   VALUES (?, ?, 'pending', ?)""",
                (payload_json, confidence, now),
            )

    return corpus_id


def list_pending_reviews(limit: int = 50, db_path: Optional[Path] = None) -> list[dict]:
    """pending 상태 리뷰 큐."""
    init_corpus_db(db_path)
    with _conn(db_path) as conn:
        rows = conn.execute(
            """SELECT id, payload_json, confidence, status, created_at, reviewed_at
               FROM reviews
               WHERE status = 'pending'
               ORDER BY created_at DESC
               LIMIT ?""",
            (limit,),
        ).fetchall()
        result = []
        for r in rows:
            data = dict(r)
            try:
                data["payload"] = json.loads(data.pop("payload_json"))
            except Exception:
                data["payload"] = None
            result.append(data)
        return result


def update_review_status(
    review_id: int, status: str, db_path: Optional[Path] = None
) -> bool:
    """리뷰 상태 업데이트 (verified/rejected)."""
    if status not in ("pending", "verified", "rejected"):
        raise ValueError(f"invalid status: {status}")
    with _conn(db_path) as conn:
        cur = conn.execute(
            "UPDATE reviews SET status = ?, reviewed_at = ? WHERE id = ?",
            (status, int(time.time() * 1000), review_id),
        )
        return cur.rowcount > 0
