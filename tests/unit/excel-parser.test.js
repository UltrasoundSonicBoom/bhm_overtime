// tests/unit/excel-parser.test.js — Excel 파서 단위 테스트
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseExcelFile } from '../../apps/web/src/client/schedule-parser/excel-parser.js';

/** Helper: 2D 배열 → ArrayBuffer (in-memory xlsx) */
function _gridToBuffer(grid, sheetName = 'Sheet1') {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(grid);
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}

describe('parseExcelFile — 정상 케이스', () => {
  it('일자 헤더 + 이름 열 + 듀티 셀 → DutyGrid', async () => {
    const grid = [
      ['간호사', '1', '2', '3', '4', '5', '6', '7'],
      ['김민지', 'D', 'E', 'N', 'O', 'D', 'D', 'E'],
      ['이수연', 'N', 'O', 'D', 'E', 'D', 'D', 'E'],
    ];
    const buf = _gridToBuffer(grid);
    const result = await parseExcelFile(buf);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].name).toBe('김민지');
    expect(result.rows[0].days['1']).toBe('D');
    expect(result.rows[0].days['3']).toBe('N');
    expect(result.rows[1].name).toBe('이수연');
    expect(result.rows[1].days['1']).toBe('N');
    expect(result.confidence).toBe(1.0);
  });

  it('한국어 듀티 코드 정규화', async () => {
    const grid = [
      ['이름', '1', '2', '3', '4', '5', '6', '7'],
      ['김민지', '데이', '이브닝', '나이트', '오프', '연차', '리커버리', '데이'],
    ];
    const buf = _gridToBuffer(grid);
    const result = await parseExcelFile(buf);
    expect(result.rows[0].days['1']).toBe('D');
    expect(result.rows[0].days['2']).toBe('E');
    expect(result.rows[0].days['3']).toBe('N');
    expect(result.rows[0].days['4']).toBe('O');
    expect(result.rows[0].days['5']).toBe('AL');
    expect(result.rows[0].days['6']).toBe('RD');
  });

  it('"1일" 형식의 헤더도 인식', async () => {
    const grid = [
      ['간호사', '1일', '2일', '3일', '4일', '5일', '6일', '7일'],
      ['김민지', 'D', 'E', 'N', 'O', 'D', 'D', 'E'],
    ];
    const buf = _gridToBuffer(grid);
    const result = await parseExcelFile(buf);
    expect(result.rows[0].days['1']).toBe('D');
    expect(result.rows[0].days['7']).toBe('E');
  });

  it('부분 매핑 실패 시 confidence 감소', async () => {
    const grid = [
      ['간호사', '1', '2', '3', '4', '5', '6', '7'],
      ['김민지', 'D', '???', 'N', 'O', 'D', 'D', 'E'],
    ];
    const buf = _gridToBuffer(grid);
    const result = await parseExcelFile(buf);
    expect(result.rows[0].days['2']).toBe('');  // 매핑 실패 → 빈 셀
    expect(result.confidence).toBeLessThan(1.0);
    expect(result.notes).toContain('매핑 실패');
  });
});

describe('parseExcelFile — 메타데이터 행 제외', () => {
  it('"합계", "비고" 행은 무시', async () => {
    const grid = [
      ['간호사', '1', '2', '3', '4', '5', '6', '7'],
      ['김민지', 'D', 'E', 'N', 'O', 'D', 'D', 'E'],
      ['합계', '', '', '', '', '', '', ''],
      ['비고', '특이사항', '', '', '', '', '', ''],
    ];
    const buf = _gridToBuffer(grid);
    const result = await parseExcelFile(buf);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe('김민지');
  });
});

describe('parseExcelFile — 월/부서 추론', () => {
  it('시트명 "2026-04 ICU" → month + dept 추론', async () => {
    const grid = [
      ['간호사', '1', '2', '3', '4', '5', '6', '7'],
      ['김민지', 'D', 'E', 'N', 'O', 'D', 'D', 'E'],
    ];
    const buf = _gridToBuffer(grid, '2026-04 ICU');
    const result = await parseExcelFile(buf);
    expect(result.month).toBe('2026-04');
    expect(result.dept).toBe('ICU');
  });

  it('시트명 "2026년 4월 병동" → 한국어 추론', async () => {
    const grid = [
      ['간호사', '1', '2', '3', '4', '5', '6', '7'],
      ['김민지', 'D', 'E', 'N', 'O', 'D', 'D', 'E'],
    ];
    const buf = _gridToBuffer(grid, '2026년 4월 병동');
    const result = await parseExcelFile(buf);
    expect(result.month).toBe('2026-04');
    expect(result.dept).toBe('병동');
  });
});

describe('parseExcelFile — 엣지 케이스', () => {
  it('빈 시트 → confidence 0 + reason', async () => {
    const buf = _gridToBuffer([[]]);
    const result = await parseExcelFile(buf);
    expect(result.rows).toHaveLength(0);
    expect(result.confidence).toBe(0);
  });

  it('일자 헤더 없으면 (5일 미만) → no_day_header', async () => {
    const grid = [
      ['이름', '1', '2', '3'],  // 일자 3개만 — 헤더 인정 안 함 (최소 7개)
      ['김민지', 'D', 'E', 'N'],
    ];
    const buf = _gridToBuffer(grid);
    const result = await parseExcelFile(buf);
    expect(result.notes).toBe('no_day_header');
    expect(result.rows).toHaveLength(0);
  });
});
