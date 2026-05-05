from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import sys
from typing import Any
import uuid

try:
    from .corrections import analyze_corrections, enrich_statement_with_codebook
    from .insights import OllamaInsightService
    from .payroll_parser import parse_payroll_file
    from .repositories import PayrollRepository, json_ready, sha256_file, utc_now
except ImportError:  # pragma: no cover - script execution fallback
    from corrections import analyze_corrections, enrich_statement_with_codebook
    from insights import OllamaInsightService
    from payroll_parser import parse_payroll_file
    from repositories import PayrollRepository, json_ready, sha256_file, utc_now


def surya_runtime_info() -> dict[str, Any]:
    info: dict[str, Any] = {
        "python_executable": sys.executable,
        "python_version": sys.version.split()[0],
        "surya_module": None,
        "torch_module": None,
        "cuda_available": False,
        "cuda_version": None,
        "device_count": 0,
        "device_0": None,
    }
    surya_spec = importlib.util.find_spec("surya")
    torch_spec = importlib.util.find_spec("torch")
    info["surya_module"] = surya_spec.origin if surya_spec else None
    info["torch_module"] = torch_spec.origin if torch_spec else None
    if torch_spec:
        try:
            import torch

            info["cuda_available"] = bool(torch.cuda.is_available())
            info["cuda_version"] = torch.version.cuda
            info["device_count"] = int(torch.cuda.device_count())
            if torch.cuda.is_available() and torch.cuda.device_count():
                info["device_0"] = torch.cuda.get_device_name(0)
        except Exception as exc:  # pragma: no cover - diagnostic only.
            info["torch_error"] = repr(exc)
    return info


class PayrollParseService:
    def __init__(self, repository: PayrollRepository, insights: OllamaInsightService | None = None) -> None:
        self.repository = repository
        self.insights = insights or OllamaInsightService()

    def parse_and_store(
        self,
        upload_path: Path,
        output_dir: Path,
        uid: str = "local-dev",
        job_id: str | None = None,
        original_filename: str | None = None,
        content_type: str = "",
        storage_path: str | None = None,
    ) -> dict[str, Any]:
        job_id = job_id or uuid.uuid4().hex
        upload = {
            "original_filename": original_filename or upload_path.name,
            "content_type": content_type,
            "size_bytes": upload_path.stat().st_size,
            "storage_path": storage_path or str(upload_path),
            "sha256": sha256_file(upload_path),
            "retention_policy": {"source_file_delete_after_days": 30, "structured_result": "retain"},
        }
        self.repository.create_job(job_id, uid, upload)
        try:
            parse_result = parse_payroll_file(upload_path, output_dir)
            statement_path = Path(parse_result["json"])
            statement = json.loads(statement_path.read_text(encoding="utf-8"))
            statement = enrich_statement_with_codebook(statement)
            statement_path.write_text(json.dumps(statement, ensure_ascii=False, indent=2), encoding="utf-8")
            save_result = self.repository.save_success(job_id, uid, statement, parse_result, upload)
            return json_ready(
                {
                    "job_id": job_id,
                    "status": "succeeded",
                    "statement_id": save_result.get("statement_id"),
                    "source_format": statement.get("source_format"),
                    "quality": statement.get("quality"),
                    "validation": statement.get("validation"),
                    "totals": statement.get("totals"),
                    "employee": statement.get("employee"),
                    "statement": statement,
                    "supplemental": statement.get("supplemental", {}),
                    "files": parse_result,
                    "storage": save_result,
                }
            )
        except Exception as exc:
            self.repository.save_failure(job_id, uid, str(exc))
            raise

    def record_correction(self, payload: dict[str, Any]) -> dict[str, Any]:
        correction = {
            "uid": payload.get("uid") or payload.get("user_id") or "local-dev",
            "statement_id": payload.get("statement_id"),
            "field_path": payload.get("field_path"),
            "old_value": payload.get("old_value"),
            "new_value": payload.get("new_value"),
            "section": payload.get("section"),
            "source_format": payload.get("source_format"),
            "department": payload.get("department"),
            "reason": payload.get("reason"),
            "reviewer_id": payload.get("reviewer_id") or payload.get("uid") or payload.get("user_id"),
            "created_at": utc_now(),
        }
        if not correction["statement_id"] or not correction["field_path"]:
            raise ValueError("Correction requires statement_id and field_path")
        if correction["old_value"] == correction["new_value"]:
            raise ValueError("Correction old_value and new_value must differ")
        return self.repository.record_correction(correction)

    def analyze_corrections(self, min_evidence: int = 2, limit: int | None = None) -> dict[str, Any]:
        corrections = self.repository.list_corrections(limit=limit)
        candidates = analyze_corrections(corrections, min_evidence=min_evidence)
        saved = [self.repository.create_codebook_candidate(candidate) for candidate in candidates]
        summary = self.insights.summarize_candidates(candidates)
        run = {
            "status": "succeeded",
            "correction_count": len(corrections),
            "candidate_count": len(candidates),
            "min_evidence": min_evidence,
            "ollama_summary": summary,
            "created_at": utc_now(),
        }
        run_result = self.repository.record_batch_run(run)
        return {"run": run_result, "correction_count": len(corrections), "candidate_count": len(candidates), "candidates": candidates, "saved": saved, "ollama_summary": summary}
