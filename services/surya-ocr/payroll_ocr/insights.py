from __future__ import annotations

import json
import os
from typing import Any
from urllib import request


class OllamaInsightService:
    def __init__(self, base_url: str | None = None, model: str | None = None, enabled: bool | None = None) -> None:
        self.base_url = (base_url or os.environ.get("OLLAMA_BASE_URL") or "http://127.0.0.1:11434").rstrip("/")
        self.model = model or os.environ.get("OLLAMA_MODEL") or "qwen3-vl:8b"
        self.enabled = enabled if enabled is not None else os.environ.get("PAYROLL_OLLAMA_INSIGHTS", "false").lower() == "true"

    def summarize_candidates(self, candidates: list[dict[str, Any]]) -> str:
        if not self.enabled or not candidates:
            return ""
        prompt = (
            "Summarize these payroll OCR correction candidates for an admin. "
            "Be concise, Korean, and focus on what should be approved first.\n\n"
            + json.dumps(candidates[:20], ensure_ascii=False, indent=2)
        )
        payload = json.dumps({"model": self.model, "prompt": prompt, "stream": False}, ensure_ascii=False).encode("utf-8")
        req = request.Request(
            f"{self.base_url}/api/generate",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with request.urlopen(req, timeout=30) as response:  # noqa: S310 - local configurable service.
                body = json.loads(response.read().decode("utf-8"))
                return str(body.get("response") or "").strip()
        except Exception:
            return ""
