"""FastAPI 진입점.

- POST /parse/excel  : Excel 결정론적 파싱
- POST /parse/csv    : CSV 결정론적 파싱
- GET  /cache/get    : sha256 기반 캐시 조회
- POST /cache/put    : 캐시 저장
- GET  /cache/dept-month-status : (dept, month) 호출 카운터
- GET  /health       : 헬스체크
- GET  /ai/agents    : 에이전트 카탈로그
- POST /ai/agent/run : 에이전트 SSE 스트리밍 실행
"""
from contextlib import asynccontextmanager
from pathlib import Path
import re
from typing import Optional

# .env 로드 (python-dotenv 없이 직접 파싱)
def _load_dotenv() -> None:
    env_path = Path(__file__).parent.parent / ".env"
    if not env_path.exists():
        return
    import os
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = val

_load_dotenv()

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ValidationError

from app.cache.sqlite import (
    DEPT_MONTH_CALL_LIMIT,
    get_cache,
    get_cache_by_title,
    get_dept_month_call_count,
    increment_dept_month_call,
    init_db,
    is_dept_month_blocked,
    normalize_title,
    ping_db,
    put_cache,
)
from app.corpus.store import (
    add_corpus_entry,
    init_corpus_db,
    list_pending_reviews,
    update_review_status,
)
from app.corpus.validation import sanitize_corpus_payload
from app.parsers.excel import parse_csv_text, parse_excel_bytes
from app.ocr_proxy import router as ocr_router
from app.schemas.schedule import DutyGrid, HealthResponse
from app.security import require_admin_token


SHA256_RE = re.compile(r"^[0-9a-fA-F]{64}$")
MAX_FORM_TEXT_BYTES = 2 * 1024 * 1024


def _validate_sha256(value: str) -> str:
    if not SHA256_RE.fullmatch(value or ""):
        raise HTTPException(
            status_code=422,
            detail="hash must be a 64-character sha256 hex string",
        )
    return value.lower()


def _reject_large_text(value: str, label: str) -> None:
    if len(value.encode("utf-8")) > MAX_FORM_TEXT_BYTES:
        raise HTTPException(status_code=413, detail=f"{label} too large")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    init_corpus_db()
    yield


app = FastAPI(
    title="SNUH Mate Backend",
    version="0.1.0",
    description="근무표 파싱 + 캐시 + LLM 라우팅",
    lifespan=lifespan,
)

# CORS — Cloudflare Pages 도메인 + localhost (모든 포트 허용)
_LOCALHOST_PORTS = [str(p) for p in range(4320, 4340)] + ["8088"]
_ALLOW_ORIGINS = (
    [f"http://localhost:{p}" for p in _LOCALHOST_PORTS] +
    ["https://snuhmate.com", "https://snuhmate.pages.dev"]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOW_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ocr_router)


# ── AI 에이전트 갤러리 ──────────────────────────────────────────

MAX_INPUT_BYTES = 8 * 1024


class AgentRunRequest(BaseModel):
    agent_id: str
    inputs: dict[str, str]


@app.get("/ai/agents")
async def list_agents():
    from app.agents.registry import get_catalog
    return get_catalog()


@app.post("/ai/agent/run")
async def run_agent(req: AgentRunRequest):
    from app.agents.registry import get_template
    from app.agents.runner import stream_agent

    template = get_template(req.agent_id)
    if template is None:
        raise HTTPException(status_code=404, detail=f"agent not found: {req.agent_id}")

    for key, val in req.inputs.items():
        if len(val.encode("utf-8")) > MAX_INPUT_BYTES:
            raise HTTPException(status_code=413, detail=f"input '{key}' too large")

    async def _sse():
        try:
            async for chunk in stream_agent(template, req.inputs):
                yield f"data: {chunk}\n\n"
        except ValueError as e:
            yield f"data: [ERROR] {e}\n\n"
        except Exception as e:
            yield f"data: [ERROR] LM Studio 연결 실패: {e}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(_sse(), media_type="text/event-stream")


# ── 기존 엔드포인트 ──────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """LM Studio + DB 헬스체크."""
    import requests

    lm_ok = False
    models: list[str] = []
    try:
        r = requests.get("http://localhost:1234/v1/models", timeout=1)
        if r.status_code == 200:
            data = r.json()
            models = [m.get("id", "") for m in data.get("data", [])]
            lm_ok = True
    except Exception:
        pass

    db_ok = ping_db()
    return HealthResponse(ok=db_ok, lm_studio=lm_ok, models=models, db=db_ok)


@app.post("/parse/excel", response_model=DutyGrid)
async def parse_excel(file: UploadFile = File(...)) -> DutyGrid:
    """Excel(.xlsx/.xls) → DutyGrid (결정론적)."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="filename required")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="empty file")
    return parse_excel_bytes(data, file_name=file.filename)


@app.post("/parse/csv", response_model=DutyGrid)
async def parse_csv(text: str = Form(...), file_name: str = Form("")) -> DutyGrid:
    """CSV 텍스트 → DutyGrid (결정론적)."""
    return parse_csv_text(text, file_name=file_name or None)


@app.get("/cache/get")
async def cache_get(
    hash: Optional[str] = None,
    dept: Optional[str] = None,
    month: Optional[str] = None,
    title: Optional[str] = None,
):
    """캐시 조회 — hash 우선, 다음 (dept, month, title)."""
    if hash:
        result = get_cache(hash)
        if result:
            return {"hit": True, "via": "sha256", "result": result.model_dump()}
    if dept and month and title:
        title_norm = normalize_title(title)
        result = get_cache_by_title(dept, month, title_norm)
        if result:
            return {"hit": True, "via": "title", "result": result.model_dump()}
    return {"hit": False}


@app.post("/cache/put")
async def cache_put(
    hash: str = Form(...),
    title: str = Form(""),
    grid_json: str = Form(...),
):
    """캐시 저장."""
    sha256 = _validate_sha256(hash)
    _reject_large_text(grid_json, "grid_json")
    try:
        grid = DutyGrid.model_validate_json(grid_json)
    except ValidationError as e:
        raise HTTPException(
            status_code=400, detail=f"invalid grid_json: {e.errors()[0]['msg']}"
        )
    put_cache(sha256, grid, normalize_title(title))
    return {"ok": True}


@app.get("/cache/dept-month-status")
async def dept_month_status(dept: str, month: str):
    """(dept, month) 호출 카운터 + 차단 여부."""
    count = get_dept_month_call_count(dept, month)
    return {
        "count": count,
        "limit": DEPT_MONTH_CALL_LIMIT,
        "blocked": count >= DEPT_MONTH_CALL_LIMIT,
    }


@app.post("/cache/dept-month-increment")
async def dept_month_increment(dept: str = Form(...), month: str = Form(...)):
    """LLM 호출 시 호출되는 카운터 증가."""
    if is_dept_month_blocked(dept, month):
        raise HTTPException(
            status_code=429,
            detail=f"이 부서·월은 이미 {DEPT_MONTH_CALL_LIMIT}회 파싱되었습니다. 기존 결과를 사용하세요.",
        )
    new_count = increment_dept_month_call(dept, month)
    return {"count": new_count, "limit": DEPT_MONTH_CALL_LIMIT}


# ── 코퍼스 ──

@app.post("/corpus/submit")
async def corpus_submit(corpus_json: str = Form(...)):
    """익명화된 코퍼스 항목 저장. confidence < 0.9면 자동으로 리뷰 큐에도 추가."""
    import json as _json

    _reject_large_text(corpus_json, "corpus_json")
    try:
        payload = _json.loads(corpus_json)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"invalid corpus_json: {e}")

    payload = sanitize_corpus_payload(payload)
    cid = add_corpus_entry(payload)
    return {"ok": True, "id": cid}


@app.get("/admin/reviews")
async def admin_reviews(_admin: None = Depends(require_admin_token)):
    """confidence < 0.9 리뷰 큐."""
    items = list_pending_reviews(limit=50)
    return {"reviews": items}


@app.post("/admin/reviews/{review_id}/status")
async def admin_review_update(
    review_id: int,
    status: str = Form(...),
    _admin: None = Depends(require_admin_token),
):
    """리뷰 상태 변경 (verified/rejected)."""
    try:
        ok = update_review_status(review_id, status)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not ok:
        raise HTTPException(status_code=404, detail="review not found")
    return {"ok": True}
