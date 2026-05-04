"""Agent template registry — JSON 파일에서 에이전트 카탈로그를 로드."""
import json
from pathlib import Path
from typing import Any

_TEMPLATES_DIR = Path(__file__).parent / "templates"

_catalog: list[dict[str, Any]] = []


def _load() -> list[dict[str, Any]]:
    result = []
    for path in sorted(_TEMPLATES_DIR.glob("*.json")):
        try:
            result.append(json.loads(path.read_text(encoding="utf-8")))
        except Exception:
            pass
    return result


def get_catalog() -> list[dict[str, Any]]:
    global _catalog
    if not _catalog:
        _catalog = _load()
    return _catalog


def get_template(agent_id: str) -> dict[str, Any] | None:
    for t in get_catalog():
        if t.get("id") == agent_id:
            return t
    return None
