"""FastAPI 진입점.

- POST /parse/excel  : Excel 결정론적 파싱
- POST /parse/csv    : CSV 결정론적 파싱
- GET  /cache/get    : sha256 기반 캐시 조회
- POST /cache/put    : 캐시 저장
- GET  /cache/dept-month-status : (dept, month) 호출 카운터
- GET  /health       : 헬스체크
"""
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.cache.sqlite import (
    DEPT_MONTH_CALL_LIMIT,
    get_cache,
    get_cache_by_title,
    get_dept_month_call_count,
    increment_dept_month_call,
    init_db,
    is_dept_month_blocked,
    normalize_title,
    put_cache,
)
from app.corpus.store import (
    add_corpus_entry,
    init_corpus_db,
    list_pending_reviews,
    update_review_status,
)
from app.parsers.excel import parse_csv_text, parse_excel_bytes
from app.schemas.schedule import DutyGrid, HealthResponse


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

# CORS — Cloudflare Pages 도메인 + localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4321",
        "http://localhost:4323",
        "http://localhost:8088",
        "https://snuhmate.com",
        "https://snuhmate.pages.dev",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

    return HealthResponse(ok=True, lm_studio=lm_ok, models=models, db=True)


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
    grid = DutyGrid.model_validate_json(grid_json)
    put_cache(hash, grid, normalize_title(title))
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

    try:
        payload = _json.loads(corpus_json)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"invalid corpus_json: {e}")

    # 화이트리스트 검증 (이중 안전망 — 클라이언트 anonymize.js와 별개)
    dept = payload.get("deptCategory")
    allowed = {"ICU", "CCU", "NICU", "응급실", "병동", "수술실", "외래", "기타"}
    if dept and dept not in allowed:
        raise HTTPException(status_code=400, detail=f"deptCategory not allowed: {dept}")

    cid = add_corpus_entry(payload)
    return {"ok": True, "id": cid}


@app.get("/admin/reviews")
async def admin_reviews():
    """confidence < 0.9 리뷰 큐. (Phase 3에서 Firebase admin claim 검증 추가)"""
    items = list_pending_reviews(limit=50)
    return {"reviews": items}


@app.post("/admin/reviews/{review_id}/status")
async def admin_review_update(review_id: int, status: str = Form(...)):
    """리뷰 상태 변경 (verified/rejected)."""
    try:
        ok = update_review_status(review_id, status)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not ok:
        raise HTTPException(status_code=404, detail="review not found")
    return {"ok": True}
