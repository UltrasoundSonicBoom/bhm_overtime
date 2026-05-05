from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient


class _FakeResponse:
    def __init__(self, payload: dict, status_code: int = 200):
        self._payload = payload
        self.status_code = status_code
        self.text = str(payload)

    def json(self) -> dict:
        return self._payload

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            import httpx

            raise httpx.HTTPStatusError("bad", request=None, response=self)


class _FakeAsyncClient:
    last_post = None

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def get(self, url):
        return _FakeResponse({"ok": True, "url": url})

    async def post(self, url, data=None, files=None):
        _FakeAsyncClient.last_post = {"url": url, "data": data, "files": files}
        return _FakeResponse({"ok": True, "document_type": data["doc_type"]})


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SNUHMATE_BACKEND_DB", str(tmp_path / "ocr_proxy.db"))
    monkeypatch.setenv("SNUHMATE_OCR_SERVICE_URL", "http://ocr-worker.local")
    monkeypatch.setattr("app.ocr_proxy.httpx.AsyncClient", _FakeAsyncClient)
    from app.main import app

    with TestClient(app) as c:
        yield c


def test_ocr_health_proxies_worker(client: TestClient):
    response = client.get("/ocr/health")

    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert response.json()["url"] == "http://ocr-worker.local/health"


def test_ocr_parse_proxies_file_and_doc_type(client: TestClient):
    response = client.post(
        "/ocr/parse",
        data={"doc_type": "work_schedule", "uid": "user-1", "department_id": "82"},
        files={"file": ("82_2603.jpeg", b"fake-image", "image/jpeg")},
    )

    assert response.status_code == 200
    assert response.json()["document_type"] == "work_schedule"
    assert _FakeAsyncClient.last_post["url"] == "http://ocr-worker.local/api/ocr/parse"
    assert _FakeAsyncClient.last_post["data"] == {
        "doc_type": "work_schedule",
        "uid": "user-1",
        "department_id": "82",
    }
    assert _FakeAsyncClient.last_post["files"]["file"][0] == "82_2603.jpeg"
