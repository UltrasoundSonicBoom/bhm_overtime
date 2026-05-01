from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SNUHMATE_BACKEND_DB", str(tmp_path / "admin_auth.db"))
    monkeypatch.delenv("SNUHMATE_ADMIN_TOKEN", raising=False)
    from app.main import app

    with TestClient(app) as c:
        yield c


def test_admin_reviews_fail_closed_without_configured_token(client: TestClient):
    response = client.get("/admin/reviews")
    assert response.status_code == 503
    assert response.json()["detail"] == "admin auth not configured"


def test_admin_reviews_reject_missing_bearer_token(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setenv("SNUHMATE_BACKEND_DB", str(tmp_path / "admin_auth_configured.db"))
    monkeypatch.setenv("SNUHMATE_ADMIN_TOKEN", "secret-token")
    from app.main import app

    with TestClient(app) as c:
        response = c.get("/admin/reviews")

    assert response.status_code == 401
    assert response.json()["detail"] == "admin token required"


def test_admin_reviews_accept_valid_bearer_token(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setenv("SNUHMATE_BACKEND_DB", str(tmp_path / "admin_auth_ok.db"))
    monkeypatch.setenv("SNUHMATE_ADMIN_TOKEN", "secret-token")
    from app.main import app

    with TestClient(app) as c:
        response = c.get(
            "/admin/reviews", headers={"Authorization": "Bearer secret-token"}
        )

    assert response.status_code == 200
    assert response.json() == {"reviews": []}


def test_admin_review_status_requires_valid_token(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setenv("SNUHMATE_BACKEND_DB", str(tmp_path / "admin_auth_status.db"))
    monkeypatch.setenv("SNUHMATE_ADMIN_TOKEN", "secret-token")
    from app.main import app

    with TestClient(app) as c:
        missing = c.post("/admin/reviews/1/status", data={"status": "verified"})
        wrong = c.post(
            "/admin/reviews/1/status",
            data={"status": "verified"},
            headers={"Authorization": "Bearer wrong"},
        )

    assert missing.status_code == 401
    assert wrong.status_code == 403
