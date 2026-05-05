from __future__ import annotations

from pathlib import Path
import sys

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app import _infer_document_type, _safe_filename


def test_safe_filename_removes_path_and_unusual_chars():
    assert _safe_filename(r"C:\Users\me\급여명세서?.pdf") == "_.pdf"


def test_auto_document_type_defaults_images_to_work_schedule():
    assert _infer_document_type("82_2603.jpeg", "auto") == "work_schedule"


def test_auto_document_type_detects_payroll_keywords():
    assert _infer_document_type("2024-12-payslip.pdf", "auto") == "payroll"
