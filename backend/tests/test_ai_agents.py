from pathlib import Path

from fastapi.testclient import TestClient
import pytest


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SNUHMATE_BACKEND_DB", str(tmp_path / "ai_agents.db"))
    monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)
    monkeypatch.delenv("LMSTUDIO_URL_24B", raising=False)
    monkeypatch.delenv("LMSTUDIO_URL_4B", raising=False)
    from app.main import app

    with TestClient(app) as c:
        yield c


def test_ai_catalog_contains_product_agents_without_prompt_leak(client: TestClient):
    response = client.get("/ai/agents")
    assert response.status_code == 200

    catalog = response.json()
    by_id = {agent["id"]: agent for agent in catalog}

    assert "snuhmate-user-copilot" in by_id
    assert "snuhmate-ops-admin-copilot" in by_id
    assert by_id["snuhmate-ops-admin-copilot"]["requires_admin"] is True

    for agent in catalog:
        assert "system_prompt" not in agent
        assert "user_prompt_template" not in agent


def test_ai_run_validates_required_inputs(client: TestClient):
    response = client.post(
        "/ai/agent/run",
        json={"agent_id": "snuhmate-user-copilot", "inputs": {}},
    )
    assert response.status_code == 422
    assert response.json()["detail"] == "input 'question' required"


def test_admin_ai_agent_fails_closed_without_token(client: TestClient):
    response = client.post(
        "/ai/agent/run",
        json={
            "agent_id": "snuhmate-ops-admin-copilot",
            "inputs": {
                "incident_summary": "Firebase sync fails",
                "affected_area": "Firebase/Firestore",
            },
        },
    )
    assert response.status_code == 503
    assert response.json()["detail"] == "admin auth not configured"


def test_admin_ai_agent_rejects_missing_and_wrong_token(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    monkeypatch.setenv("SNUHMATE_BACKEND_DB", str(tmp_path / "ai_agents_auth.db"))
    monkeypatch.setenv("SNUHMATE_ADMIN_TOKEN", "secret-token")
    from app.main import app

    payload = {
        "agent_id": "snuhmate-ops-admin-copilot",
        "inputs": {
            "incident_summary": "Firestore rules reject profile sync",
            "affected_area": "Firebase/Firestore",
        },
    }

    with TestClient(app) as c:
        missing = c.post("/ai/agent/run", json=payload)
        wrong = c.post(
            "/ai/agent/run",
            json=payload,
            headers={"Authorization": "Bearer wrong"},
        )

    assert missing.status_code == 401
    assert wrong.status_code == 403
