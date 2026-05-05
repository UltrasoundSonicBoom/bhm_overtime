from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
from typing import Any
import uuid


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def json_ready(value: Any) -> Any:
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(key): json_ready(item) for key, item in value.items()}
    if isinstance(value, list | tuple):
        return [json_ready(item) for item in value]
    return value


def clean_id(value: Any, fallback: str = "unknown") -> str:
    text = str(value or fallback)
    text = re.sub(r"[^A-Za-z0-9가-힣_-]+", "_", text).strip("_")
    return text[:120] or fallback


def stable_id(prefix: str, *parts: Any) -> str:
    digest = hashlib.sha1("|".join(str(part) for part in parts).encode("utf-8")).hexdigest()[:16]
    return f"{prefix}_{digest}"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def statement_id_for(job_id: str, statement: dict[str, Any]) -> str:
    employee = statement.get("employee", {})
    metadata = statement.get("metadata", {})
    return stable_id(
        "stmt",
        job_id,
        metadata.get("pay_period"),
        employee.get("personal_number"),
        statement.get("source_format"),
    )


def item_id_for(section: str, index: int, item: dict[str, Any]) -> str:
    return stable_id("item", section, index, item.get("label"), item.get("amount"), item.get("row"), item.get("col"))


class PayrollRepository(ABC):
    @abstractmethod
    def create_job(self, job_id: str, uid: str, upload: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def save_success(
        self,
        job_id: str,
        uid: str,
        statement: dict[str, Any],
        parse_result: dict[str, Any],
        upload: dict[str, Any],
    ) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def save_failure(self, job_id: str, uid: str, error_message: str) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def record_correction(self, correction: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def list_corrections(self, limit: int | None = None) -> list[dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    def create_codebook_candidate(self, candidate: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def record_batch_run(self, run: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError


class FilePayrollRepository(PayrollRepository):
    def __init__(self, root: Path) -> None:
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def _write_json(self, relative: str, payload: dict[str, Any]) -> str:
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(json_ready(payload), ensure_ascii=False, indent=2), encoding="utf-8")
        return str(path)

    def create_job(self, job_id: str, uid: str, upload: dict[str, Any]) -> dict[str, Any]:
        payload = {
            "id": job_id,
            "uid": uid,
            "status": "processing",
            "upload": upload,
            "created_at": utc_now(),
            "updated_at": utc_now(),
        }
        path = self._write_json(f"payrollParseJobs/{job_id}.json", payload)
        return {"job_id": job_id, "job_path": path}

    def save_success(
        self,
        job_id: str,
        uid: str,
        statement: dict[str, Any],
        parse_result: dict[str, Any],
        upload: dict[str, Any],
    ) -> dict[str, Any]:
        statement_id = statement_id_for(job_id, statement)
        employee = statement.get("employee", {})
        metadata = statement.get("metadata", {})
        totals = statement.get("totals", {})
        quality = statement.get("quality", {})
        validation = statement.get("validation", {})
        uploaded_file_id = stable_id("file", job_id, upload.get("sha256"), upload.get("original_filename"))

        job_payload = {
            "id": job_id,
            "uid": uid,
            "status": "succeeded",
            "statement_id": statement_id,
            "source_format": statement.get("source_format"),
            "quality_score": quality.get("score"),
            "validation": validation,
            "completed_at": utc_now(),
            "updated_at": utc_now(),
        }
        statement_payload = {
            "id": statement_id,
            "job_id": job_id,
            "uid": uid,
            "document_type": statement.get("document_type"),
            "metadata": metadata,
            "employee": employee,
            "totals": totals,
            "quality": quality,
            "validation": validation,
            "source_format": statement.get("source_format"),
            "generated_at": statement.get("generated_at"),
            "created_at": utc_now(),
        }
        base = f"users/{clean_id(uid)}/payrollStatements/{statement_id}"
        paths = {
            "job": self._write_json(f"payrollParseJobs/{job_id}.json", job_payload),
            "uploaded_file": self._write_json(f"payrollUploadedFiles/{uploaded_file_id}.json", {**upload, "id": uploaded_file_id, "job_id": job_id, "uid": uid}),
            "statement": self._write_json(f"{base}/document.json", statement_payload),
        }
        for index, item in enumerate(statement.get("earnings", [])):
            paths[f"earning_{index}"] = self._write_json(f"{base}/items/{item_id_for('earning', index, item)}.json", {**item, "id": item_id_for("earning", index, item), "statement_id": statement_id, "section": "earning"})
        for index, item in enumerate(statement.get("deductions", [])):
            paths[f"deduction_{index}"] = self._write_json(f"{base}/items/{item_id_for('deduction', index, item)}.json", {**item, "id": item_id_for("deduction", index, item), "statement_id": statement_id, "section": "deduction"})

        supplemental = statement.get("supplemental", {})
        paths["supplemental"] = self._write_json(f"{base}/supplemental/document.json", {"statement_id": statement_id, **supplemental})
        paths["validation"] = self._write_json(f"payrollValidations/{statement_id}.json", {"statement_id": statement_id, **validation, "quality": quality})
        paths["artifacts"] = self._write_json(
            f"payrollArtifacts/{stable_id('artifact', job_id)}.json",
            {"job_id": job_id, "statement_id": statement_id, "files": parse_result, "created_at": utc_now()},
        )
        return {"statement_id": statement_id, "paths": paths}

    def save_failure(self, job_id: str, uid: str, error_message: str) -> dict[str, Any]:
        payload = {
            "id": job_id,
            "uid": uid,
            "status": "failed",
            "error_message": error_message,
            "completed_at": utc_now(),
            "updated_at": utc_now(),
        }
        path = self._write_json(f"payrollParseJobs/{job_id}.json", payload)
        return {"job_id": job_id, "job_path": path}

    def record_correction(self, correction: dict[str, Any]) -> dict[str, Any]:
        correction_id = correction.get("id") or uuid.uuid4().hex
        payload = {"id": correction_id, "status": "pending", "created_at": utc_now(), **correction}
        path = self._write_json(f"payrollCorrections/{correction_id}.json", payload)
        return {"correction_id": correction_id, "path": path}

    def list_corrections(self, limit: int | None = None) -> list[dict[str, Any]]:
        paths = sorted((self.root / "payrollCorrections").glob("*.json"))
        if limit is not None:
            paths = paths[-limit:]
        return [json.loads(path.read_text(encoding="utf-8")) for path in paths]

    def create_codebook_candidate(self, candidate: dict[str, Any]) -> dict[str, Any]:
        candidate_id = candidate.get("id") or stable_id("candidate", candidate.get("term_type"), candidate.get("old_value"), candidate.get("new_value"))
        payload = {"id": candidate_id, "status": "pending_admin_approval", "created_at": utc_now(), **candidate}
        path = self._write_json(f"payrollCodebookCandidates/{candidate_id}.json", payload)
        return {"candidate_id": candidate_id, "path": path}

    def record_batch_run(self, run: dict[str, Any]) -> dict[str, Any]:
        run_id = run.get("id") or uuid.uuid4().hex
        payload = {"id": run_id, "created_at": utc_now(), **run}
        path = self._write_json(f"payrollBatchRuns/{run_id}.json", payload)
        return {"run_id": run_id, "path": path}


class FirestorePayrollRepository(PayrollRepository):
    def __init__(self, project_id: str | None = None) -> None:
        try:
            import firebase_admin
            from firebase_admin import credentials, firestore
        except ImportError as exc:  # pragma: no cover - depends on deployment environment.
            raise RuntimeError("Firestore repository requires `pip install firebase-admin`.") from exc

        if not firebase_admin._apps:
            service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
            service_account_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
            if service_account_json:
                cred = credentials.Certificate(json.loads(service_account_json))
                firebase_admin.initialize_app(cred, {"projectId": project_id} if project_id else None)
            elif service_account_path:
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred, {"projectId": project_id} if project_id else None)
            else:
                firebase_admin.initialize_app(options={"projectId": project_id} if project_id else None)
        self.db = firestore.client()

    def create_job(self, job_id: str, uid: str, upload: dict[str, Any]) -> dict[str, Any]:
        payload = json_ready({"id": job_id, "uid": uid, "status": "processing", "upload": upload, "created_at": utc_now(), "updated_at": utc_now()})
        self.db.collection("payrollParseJobs").document(job_id).set(payload, merge=True)
        return {"job_id": job_id, "job_path": f"payrollParseJobs/{job_id}"}

    def save_success(
        self,
        job_id: str,
        uid: str,
        statement: dict[str, Any],
        parse_result: dict[str, Any],
        upload: dict[str, Any],
    ) -> dict[str, Any]:
        statement_id = statement_id_for(job_id, statement)
        statement_ref = self.db.collection("users").document(uid).collection("payrollStatements").document(statement_id)
        uploaded_file_id = stable_id("file", job_id, upload.get("sha256"), upload.get("original_filename"))
        batch = self.db.batch()
        batch.set(
            self.db.collection("payrollParseJobs").document(job_id),
            json_ready(
                {
                    "id": job_id,
                    "uid": uid,
                    "status": "succeeded",
                    "statement_id": statement_id,
                    "source_format": statement.get("source_format"),
                    "quality_score": statement.get("quality", {}).get("score"),
                    "validation": statement.get("validation", {}),
                    "completed_at": utc_now(),
                    "updated_at": utc_now(),
                }
            ),
            merge=True,
        )
        batch.set(self.db.collection("payrollUploadedFiles").document(uploaded_file_id), json_ready({**upload, "id": uploaded_file_id, "job_id": job_id, "uid": uid}), merge=True)
        batch.set(
            statement_ref,
            json_ready(
                {
                    "id": statement_id,
                    "job_id": job_id,
                    "uid": uid,
                    "document_type": statement.get("document_type"),
                    "metadata": statement.get("metadata", {}),
                    "employee": statement.get("employee", {}),
                    "totals": statement.get("totals", {}),
                    "quality": statement.get("quality", {}),
                    "validation": statement.get("validation", {}),
                    "source_format": statement.get("source_format"),
                    "generated_at": statement.get("generated_at"),
                    "created_at": utc_now(),
                }
            ),
            merge=True,
        )
        for index, item in enumerate(statement.get("earnings", [])):
            batch.set(statement_ref.collection("items").document(item_id_for("earning", index, item)), json_ready({**item, "section": "earning", "statement_id": statement_id}), merge=True)
        for index, item in enumerate(statement.get("deductions", [])):
            batch.set(statement_ref.collection("items").document(item_id_for("deduction", index, item)), json_ready({**item, "section": "deduction", "statement_id": statement_id}), merge=True)
        batch.set(statement_ref.collection("supplemental").document("document"), json_ready({"statement_id": statement_id, **statement.get("supplemental", {})}), merge=True)
        batch.set(self.db.collection("payrollValidations").document(statement_id), json_ready({"statement_id": statement_id, **statement.get("validation", {}), "quality": statement.get("quality", {})}), merge=True)
        batch.set(self.db.collection("payrollArtifacts").document(stable_id("artifact", job_id)), json_ready({"job_id": job_id, "statement_id": statement_id, "files": parse_result, "created_at": utc_now()}), merge=True)
        batch.commit()
        return {
            "statement_id": statement_id,
            "paths": {
                "job": f"payrollParseJobs/{job_id}",
                "statement": f"users/{uid}/payrollStatements/{statement_id}",
                "uploaded_file": f"payrollUploadedFiles/{uploaded_file_id}",
            },
        }

    def save_failure(self, job_id: str, uid: str, error_message: str) -> dict[str, Any]:
        payload = json_ready({"id": job_id, "uid": uid, "status": "failed", "error_message": error_message, "completed_at": utc_now(), "updated_at": utc_now()})
        self.db.collection("payrollParseJobs").document(job_id).set(payload, merge=True)
        return {"job_id": job_id, "job_path": f"payrollParseJobs/{job_id}"}

    def record_correction(self, correction: dict[str, Any]) -> dict[str, Any]:
        correction_id = correction.get("id") or uuid.uuid4().hex
        payload = json_ready({"id": correction_id, "status": "pending", "created_at": utc_now(), **correction})
        self.db.collection("payrollCorrections").document(correction_id).set(payload, merge=True)
        return {"correction_id": correction_id, "path": f"payrollCorrections/{correction_id}"}

    def list_corrections(self, limit: int | None = None) -> list[dict[str, Any]]:
        query = self.db.collection("payrollCorrections").order_by("created_at")
        if limit is not None:
            query = query.limit_to_last(limit)
        return [doc.to_dict() for doc in query.stream()]

    def create_codebook_candidate(self, candidate: dict[str, Any]) -> dict[str, Any]:
        candidate_id = candidate.get("id") or stable_id("candidate", candidate.get("term_type"), candidate.get("old_value"), candidate.get("new_value"))
        payload = json_ready({"id": candidate_id, "status": "pending_admin_approval", "created_at": utc_now(), **candidate})
        self.db.collection("payrollCodebookCandidates").document(candidate_id).set(payload, merge=True)
        return {"candidate_id": candidate_id, "path": f"payrollCodebookCandidates/{candidate_id}"}

    def record_batch_run(self, run: dict[str, Any]) -> dict[str, Any]:
        run_id = run.get("id") or uuid.uuid4().hex
        payload = json_ready({"id": run_id, "created_at": utc_now(), **run})
        self.db.collection("payrollBatchRuns").document(run_id).set(payload, merge=True)
        return {"run_id": run_id, "path": f"payrollBatchRuns/{run_id}"}


def build_repository(default_root: Path) -> PayrollRepository:
    repository_type = os.environ.get("PAYROLL_REPOSITORY", "file").strip().lower()
    if repository_type == "firestore":
        return FirestorePayrollRepository(project_id=os.environ.get("FIREBASE_PROJECT_ID"))
    if repository_type != "file":
        raise ValueError(f"Unsupported PAYROLL_REPOSITORY={repository_type!r}")
    root = Path(os.environ.get("PAYROLL_FILE_REPOSITORY_DIR", str(default_root)))
    return FilePayrollRepository(root)
