"""backend/tests/test_corpus.py — 코퍼스 + 리뷰 큐 테스트."""
import os
import time
from pathlib import Path

import pytest

from app.corpus.store import (
    add_corpus_entry,
    init_corpus_db,
    list_pending_reviews,
    update_review_status,
)


@pytest.fixture
def db_path(tmp_path: Path) -> Path:
    p = tmp_path / "corpus_test.db"
    os.environ["SNUHMATE_BACKEND_DB"] = str(p)
    init_corpus_db(p)
    yield p
    os.environ.pop("SNUHMATE_BACKEND_DB", None)


def _payload(confidence: float = 0.95, dept: str = "ICU") -> dict:
    return {
        "deptCategory": dept,
        "rows": [
            {"anonName": "간호사1", "days": {"1": "D", "2": "E", "3": "N"}},
        ],
        "confidence": confidence,
        "parserVersion": "test-v1",
        "submittedAt": int(time.time() * 1000),
        "consentVersion": "2026-04-29-v1",
    }


def test_high_confidence_corpus_no_review_queue(db_path: Path):
    """confidence ≥ 0.9 → 리뷰 큐에 안 들어감."""
    cid = add_corpus_entry(_payload(confidence=0.95))
    assert cid > 0
    reviews = list_pending_reviews(db_path=db_path)
    assert len(reviews) == 0


def test_low_confidence_corpus_auto_review(db_path: Path):
    """confidence < 0.9 → 리뷰 큐 자동 추가."""
    add_corpus_entry(_payload(confidence=0.7))
    reviews = list_pending_reviews(db_path=db_path)
    assert len(reviews) == 1
    assert reviews[0]["confidence"] == 0.7
    assert reviews[0]["status"] == "pending"
    assert reviews[0]["payload"]["deptCategory"] == "ICU"


def test_review_status_update(db_path: Path):
    add_corpus_entry(_payload(confidence=0.7))
    reviews = list_pending_reviews(db_path=db_path)
    review_id = reviews[0]["id"]

    # verify
    ok = update_review_status(review_id, "verified")
    assert ok

    # pending 큐에서 제거됨
    pending = list_pending_reviews(db_path=db_path)
    assert len(pending) == 0


def test_review_status_invalid(db_path: Path):
    add_corpus_entry(_payload(confidence=0.7))
    with pytest.raises(ValueError):
        update_review_status(1, "weird_status")
