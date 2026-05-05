from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import shutil
import sys
from typing import Any, Literal
import uuid

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware


SERVICE_ROOT = Path(__file__).resolve().parent
PAYROLL_ROOT = SERVICE_ROOT / "payroll_ocr"
SCHEDULE_ROOT = SERVICE_ROOT / "work_schedule_ocr"
RUNTIME_ROOT = SERVICE_ROOT / "runtime"
UPLOAD_ROOT = RUNTIME_ROOT / "uploads"
PAYROLL_OUTPUT_ROOT = RUNTIME_ROOT / "payroll"
SCHEDULE_OUTPUT_ROOT = RUNTIME_ROOT / "schedules"
REPOSITORY_ROOT = RUNTIME_ROOT / "repository"

if str(PAYROLL_ROOT) not in sys.path:
    sys.path.insert(0, str(PAYROLL_ROOT))
from repositories import FilePayrollRepository  # noqa: E402
from services import PayrollParseService, surya_runtime_info  # noqa: E402

if str(SCHEDULE_ROOT) not in sys.path:
    sys.path.insert(0, str(SCHEDULE_ROOT))
from file_ingest import parse_any_upload  # noqa: E402


DocumentType = Literal["auto", "payroll", "work_schedule"]


app = FastAPI(
    title="SNUH Mate Surya OCR Worker",
    version="0.1.0",
    description="GPU OCR worker for payroll statements and nurse work schedules.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4320",
        "http://localhost:4321",
        "http://localhost:8001",
        "https://snuhmate.com",
        "https://snuhmate.pages.dev",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _safe_filename(name: str | None) -> str:
    raw = Path(name or "upload.bin").name
    return re.sub(r"[^A-Za-z0-9._() -]+", "_", raw).strip(" .") or "upload.bin"


def _infer_document_type(filename: str, requested: DocumentType) -> Literal["payroll", "work_schedule"]:
    if requested != "auto":
        return requested
    lowered = filename.lower()
    payroll_terms = ("pay", "salary", "payslip", "급여", "명세")
    schedule_terms = ("schedule", "근무", "duty", "roster")
    if any(term in lowered for term in payroll_terms):
        return "payroll"
    if any(term in lowered for term in schedule_terms):
        return "work_schedule"
    # SNUH work schedule files often look like 82_2603.jpeg. Payroll files are
    # more commonly PDF/XLS/XLSX with a month title, so image auto defaults to schedule.
    suffix = Path(lowered).suffix
    if suffix in {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}:
        return "work_schedule"
    return "payroll"


def _json_file(path: str | None) -> dict[str, Any] | None:
    if not path:
        return None
    p = Path(path)
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8"))


async def _save_upload(file: UploadFile) -> Path:
    safe = _safe_filename(file.filename)
    job_dir = UPLOAD_ROOT / uuid.uuid4().hex
    job_dir.mkdir(parents=True, exist_ok=True)
    target = job_dir / safe
    with target.open("wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
    if target.stat().st_size == 0:
        raise HTTPException(status_code=400, detail="empty file")
    return target


def _parse_payroll(path: Path, uid: str) -> dict[str, Any]:
    repository = FilePayrollRepository(REPOSITORY_ROOT)
    service = PayrollParseService(repository)
    return service.parse_and_store(path, PAYROLL_OUTPUT_ROOT, uid=uid)


def _parse_schedule(path: Path, department_id: str | None) -> dict[str, Any]:
    output_dir = SCHEDULE_OUTPUT_ROOT / path.stem
    result = parse_any_upload(path, output_dir, department_id=department_id)
    schedule = _json_file(result.get("schedule"))
    raw_grid = _json_file(result.get("raw_grid"))
    return {
        "job_id": uuid.uuid4().hex,
        "document_type": "work_schedule",
        "source_format": (
            (schedule or {}).get("source_format")
            or result.get("source_format")
            or Path(path).suffix.lower().lstrip(".")
        ),
        "quality": schedule.get("quality") if schedule else None,
        "validation": schedule.get("validation_summary") if schedule else None,
        "schedule": schedule,
        "raw_grid": raw_grid,
        "artifacts": result,
    }


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "ok": True,
        "service": "snuhmate-surya-ocr-worker",
        "runtime_root": str(RUNTIME_ROOT),
        "surya": surya_runtime_info(),
        "parsers": {
            "payroll": ["pdf-text", "pdf-scan", "image", "csv", "xls", "xlsx"],
            "work_schedule": ["image", "pdf-table", "pdf-scan", "csv", "xlsx", "xls-html"],
        },
    }


@app.post("/api/ocr/parse")
async def parse_ocr(
    file: UploadFile = File(...),
    doc_type: DocumentType = Form("auto"),
    uid: str = Form("anonymous"),
    department_id: str | None = Form(None),
) -> dict[str, Any]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="filename required")

    saved = await _save_upload(file)
    resolved_type = _infer_document_type(saved.name, doc_type)

    try:
        if resolved_type == "payroll":
            parsed = _parse_payroll(saved, uid=uid)
        else:
            parsed = _parse_schedule(saved, department_id=department_id)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    finally:
        # Keep a short-lived copy under runtime/uploads for debugging only when explicitly enabled.
        if not (RUNTIME_ROOT / ".keep-uploads").exists():
            shutil.rmtree(saved.parent, ignore_errors=True)

    return {
        "ok": True,
        "document_type": resolved_type,
        "filename": saved.name,
        "uid": uid,
        "result": parsed,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the SNUH Mate Surya OCR worker.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8030)
    args = parser.parse_args()

    import uvicorn

    uvicorn.run("app:app", host=args.host, port=args.port, reload=False)


if __name__ == "__main__":
    main()
