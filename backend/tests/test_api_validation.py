import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.corpus.store import list_pending_reviews


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SNUHMATE_BACKEND_DB", str(tmp_path / "api_validation.db"))
    from app.main import app

    with TestClient(app) as c:
        yield c


def test_cache_put_rejects_invalid_sha256(client: TestClient):
    response = client.post(
        "/cache/put",
        data={
            "hash": "x",
            "title": "bad",
            "grid_json": json.dumps(
                {"dept": "ICU", "month": "2026-04", "rows": [], "confidence": 1}
            ),
        },
    )
    assert response.status_code == 422
    assert response.json()["detail"] == "hash must be a 64-character sha256 hex string"


def test_cache_put_rejects_invalid_grid_json(client: TestClient):
    response = client.post(
        "/cache/put",
        data={
            "hash": "a" * 64,
            "title": "bad",
            "grid_json": "{not-json",
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"].startswith("invalid grid_json")


def test_corpus_submit_rejects_non_object(client: TestClient):
    response = client.post("/corpus/submit", data={"corpus_json": "[]"})
    assert response.status_code == 400
    assert response.json()["detail"] == "corpus_json must be an object"


def test_corpus_submit_rejects_non_numeric_confidence(client: TestClient):
    response = client.post(
        "/corpus/submit",
        data={
            "corpus_json": json.dumps(
                {"deptCategory": "ICU", "confidence": "high", "rows": []}
            )
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "confidence must be a number between 0 and 1"


def test_corpus_submit_sanitizes_rows(client: TestClient):
    payload = {
        "deptCategory": "ICU",
        "confidence": 0.5,
        "parserVersion": "v1",
        "consentVersion": "v1",
        "rows": [{"name": "실명", "days": {"1": "D"}, "note": "secret"}],
        "rawText": "should not persist",
    }
    response = client.post(
        "/corpus/submit",
        data={"corpus_json": json.dumps(payload, ensure_ascii=False)},
    )
    assert response.status_code == 200

    reviews = list_pending_reviews()
    assert len(reviews) == 1
    stored = reviews[0]["payload"]
    assert stored["rows"] == [{"days": {"1": "D"}}]
    assert "rawText" not in stored
    assert "name" not in stored["rows"][0]
    assert "note" not in stored["rows"][0]


def test_health_reports_real_db_status(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["db"] is True
    assert response.json()["ok"] is True


def test_health_reports_db_false_when_sqlite_unreachable(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    not_a_dir = tmp_path / "not-a-dir"
    not_a_dir.write_text("file", encoding="utf-8")
    monkeypatch.setenv("SNUHMATE_BACKEND_DB", str(not_a_dir / "db.sqlite"))

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["db"] is False
    assert response.json()["ok"] is False
