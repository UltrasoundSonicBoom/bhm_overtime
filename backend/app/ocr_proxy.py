from __future__ import annotations

import os
from typing import Literal

import httpx
from fastapi import APIRouter, File, Form, HTTPException, UploadFile


router = APIRouter(prefix="/ocr", tags=["ocr"])


DocumentType = Literal["auto", "payroll", "work_schedule"]


def _worker_url() -> str:
    return os.environ.get("SNUHMATE_OCR_SERVICE_URL", "http://127.0.0.1:8030").rstrip("/")


@router.get("/health")
async def ocr_health() -> dict:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(f"{_worker_url()}/health")
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail=f"OCR worker unavailable: {exc}") from exc


@router.post("/parse")
async def ocr_parse(
    file: UploadFile = File(...),
    doc_type: DocumentType = Form("auto"),
    uid: str = Form("anonymous"),
    department_id: str | None = Form(None),
) -> dict:
    if not file.filename:
        raise HTTPException(status_code=400, detail="filename required")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="empty file")

    files = {"file": (file.filename, data, file.content_type or "application/octet-stream")}
    form = {"doc_type": doc_type, "uid": uid}
    if department_id:
        form["department_id"] = department_id

    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(f"{_worker_url()}/api/ocr/parse", data=form, files=files)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text
        try:
            detail = exc.response.json().get("detail", detail)
        except Exception:
            pass
        raise HTTPException(status_code=exc.response.status_code, detail=detail) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail=f"OCR worker unavailable: {exc}") from exc
