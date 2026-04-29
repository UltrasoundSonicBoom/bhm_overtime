"""backend/tests/test_excel_parser.py — Excel/CSV 파서 단위 테스트."""
import io

import openpyxl
import pytest

from app.parsers.excel import parse_csv_text, parse_excel_bytes


def _build_excel(grid: list[list[str]], sheet_name: str = "Sheet1") -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = sheet_name
    for row in grid:
        ws.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def test_excel_basic_parse():
    grid = [
        ["간호사", "1", "2", "3", "4", "5", "6", "7"],
        ["김민지", "D", "E", "N", "O", "D", "D", "E"],
        ["이수연", "N", "O", "D", "E", "D", "D", "E"],
    ]
    data = _build_excel(grid)
    result = parse_excel_bytes(data, file_name="test.xlsx")
    assert len(result.rows) == 2
    assert result.rows[0].name == "김민지"
    assert result.rows[0].days["1"] == "D"
    assert result.rows[0].days["3"] == "N"
    assert result.confidence == 1.0


def test_excel_korean_codes():
    grid = [
        ["이름", "1", "2", "3", "4", "5", "6", "7"],
        ["김민지", "데이", "이브닝", "나이트", "오프", "연차", "리커버리", "데이"],
    ]
    data = _build_excel(grid)
    result = parse_excel_bytes(data)
    assert result.rows[0].days["1"] == "D"
    assert result.rows[0].days["2"] == "E"
    assert result.rows[0].days["5"] == "AL"
    assert result.rows[0].days["6"] == "RD"


def test_excel_metadata_rows_skipped():
    grid = [
        ["간호사", "1", "2", "3", "4", "5", "6", "7"],
        ["김민지", "D", "E", "N", "O", "D", "D", "E"],
        ["합계", "", "", "", "", "", "", ""],
        ["비고", "특이사항", "", "", "", "", "", ""],
    ]
    data = _build_excel(grid)
    result = parse_excel_bytes(data)
    assert len(result.rows) == 1
    assert result.rows[0].name == "김민지"


def test_excel_month_dept_inference():
    grid = [
        ["간호사", "1", "2", "3", "4", "5", "6", "7"],
        ["김민지", "D", "E", "N", "O", "D", "D", "E"],
    ]
    data = _build_excel(grid, sheet_name="2026-04 ICU")
    result = parse_excel_bytes(data, file_name="2026-04 ICU.xlsx")
    assert result.month == "2026-04"
    assert result.dept == "ICU"


def test_excel_no_day_header():
    grid = [
        ["이름", "1", "2", "3"],  # 일자 3개만 — 헤더 인정 안 함
        ["김민지", "D", "E", "N"],
    ]
    data = _build_excel(grid)
    result = parse_excel_bytes(data)
    assert result.notes == "no_day_header"
    assert len(result.rows) == 0


def test_csv_basic():
    csv_text = "간호사,1,2,3,4,5,6,7\n김민지,D,E,N,O,D,D,E"
    result = parse_csv_text(csv_text, file_name="test.csv")
    assert len(result.rows) == 1
    assert result.rows[0].days["1"] == "D"


def test_csv_partial_mapping_failure():
    csv_text = "간호사,1,2,3,4,5,6,7\n김민지,D,???,N,O,D,D,E"
    result = parse_csv_text(csv_text)
    assert result.rows[0].days["2"] == ""
    assert result.confidence < 1.0
    assert "매핑 실패" in result.notes
