"""Agent runner — LM Studio(프로덕션) / DeepSeek API(테스트) SSE 스트리밍 실행.

우선순위:
1. LMSTUDIO_URL_{MODEL} 환경변수 → 홈랩 LM Studio 직접 호출
2. DEEPSEEK_API_KEY 환경변수 → DeepSeek API 폴백 (테스트/개발)
"""
import json
import os
import re
from typing import AsyncGenerator, Any

import httpx

_DEEPSEEK_BASE = "https://api.deepseek.com/v1"
_DEEPSEEK_MODEL = "deepseek-chat"

_LMSTUDIO_URLS: dict[str, str] = {
    "gemma4-24b": "",
    "gemma4-4b": "",
    "qwen3-vl": "",
}
_urls_loaded = False


def _load_urls() -> None:
    global _urls_loaded
    if _urls_loaded:
        return
    _LMSTUDIO_URLS["gemma4-24b"] = os.getenv("LMSTUDIO_URL_24B", "")
    _LMSTUDIO_URLS["gemma4-4b"] = os.getenv("LMSTUDIO_URL_4B", "")
    _LMSTUDIO_URLS["qwen3-vl"] = os.getenv("LMSTUDIO_URL_VL", "")
    _urls_loaded = True


def _deepseek_key() -> str:
    return os.getenv("DEEPSEEK_API_KEY", "")


def _render_prompt(template: str, inputs: dict[str, str]) -> str:
    """{{key}} 치환 + 조건 블록 {{#key}}...{{/key}} 처리."""
    result = template
    for k, v in inputs.items():
        result = result.replace(f"{{{{{k}}}}}", str(v) if v else "")

    def _strip_block(m: re.Match) -> str:
        key = m.group(1)
        content = m.group(2)
        return content if inputs.get(key) else ""

    result = re.sub(r"\{\{#(\w+)\}\}(.*?)\{\{/\1\}\}", _strip_block, result, flags=re.DOTALL)
    return result


async def stream_agent(template: dict[str, Any], inputs: dict[str, str]) -> AsyncGenerator[str, None]:
    """에이전트 실행 결과를 SSE 텍스트 chunk로 스트리밍."""
    _load_urls()

    model_key = template.get("model", "gemma4-4b")
    system_prompt = template.get("system_prompt", "")
    user_prompt = _render_prompt(template.get("user_prompt_template", ""), inputs)

    lmstudio_url = _LMSTUDIO_URLS.get(model_key, "")
    deepseek_key = _deepseek_key()

    if not lmstudio_url and not deepseek_key:
        raise ValueError("LM Studio URL과 DEEPSEEK_API_KEY 모두 미설정. .env 파일을 확인하세요.")

    if lmstudio_url:
        url = lmstudio_url.rstrip("/") + "/v1/chat/completions"
        headers = {"Content-Type": "application/json"}
        req_model = model_key
    else:
        url = f"{_DEEPSEEK_BASE}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {deepseek_key}",
        }
        req_model = _DEEPSEEK_MODEL

    payload = {
        "model": req_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "stream": True,
        "temperature": 0.4,
        "max_tokens": 2048,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", url, json=payload, headers=headers) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.startswith("data: "):
                    continue
                raw = line[6:].strip()
                if raw == "[DONE]":
                    break
                try:
                    chunk = json.loads(raw)
                    delta = chunk["choices"][0]["delta"].get("content", "")
                    if delta:
                        yield delta
                except Exception:
                    continue
