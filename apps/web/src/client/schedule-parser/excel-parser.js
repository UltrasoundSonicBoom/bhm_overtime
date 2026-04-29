// excel-parser.js — Excel/CSV 파일 → DutyGrid (결정론적, LLM 미사용)
// SheetJS (xlsx) 사용. 클라이언트 사이드.
//
// 지원 형식:
//   - .xlsx, .xls (binary)
//   - .csv (공백/콤마 분리, papaparse 별도 파서)
//
// 시트 구조 (heuristic):
//   첫 행: 일자 헤더 (1, 2, 3, ... 31 또는 1일, 2일, ...)
//   첫 열: 간호사 이름
//   교차 셀: 듀티 코드 (D/E/N/O/AL/RD 또는 한국어 동의어)
//
// 헤더 추론:
//   - 일자 행: 첫 5행 중에서 숫자 1~31이 가장 많이 등장하는 행
//   - 이름 열: 일자 헤더 행 아래에서 한국어 이름 정규식 매치

import * as XLSX from 'xlsx';
import { mapDutyCode, mapDutyConfidence } from './duty-code-mapper.js';

/**
 * Excel 파일 → DutyGrid
 * @param {File|ArrayBuffer} fileOrBuffer
 * @returns {Promise<DutyGrid>}
 */
export async function parseExcelFile(fileOrBuffer) {
  const buf = fileOrBuffer instanceof ArrayBuffer
    ? fileOrBuffer
    : await fileOrBuffer.arrayBuffer();
  const workbook = XLSX.read(buf, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return _emptyGrid('no_sheets');
  }
  const sheet = workbook.Sheets[firstSheetName];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  return _parseGrid(grid, firstSheetName, fileOrBuffer?.name);
}

/**
 * 2D 배열 grid → DutyGrid
 * @param {Array<Array<string>>} grid
 * @param {string} sheetName
 * @param {string} [fileName]
 * @returns {DutyGrid}
 */
function _parseGrid(grid, sheetName, fileName) {
  if (!grid || grid.length === 0) {
    return _emptyGrid('empty_sheet');
  }

  // 1. 일자 헤더 행 탐색 (첫 5행 중에서)
  const headerInfo = _findDayHeaderRow(grid);
  if (!headerInfo) {
    return _emptyGrid('no_day_header');
  }
  const { rowIndex: headerRow, dayMap } = headerInfo;
  // dayMap: { columnIndex: dayNumber }

  // 2. 이름 열 탐색
  const nameCol = _findNameColumn(grid, headerRow);

  // 3. 각 데이터 행 → ScheduleRow
  const rows = [];
  let totalConfSum = 0;
  let totalCellCount = 0;
  let unmappedCount = 0;

  for (let r = headerRow + 1; r < grid.length; r++) {
    const row = grid[r];
    if (!row) continue;
    const name = String(row[nameCol] || '').trim();
    if (!name || _looksLikeMetadata(name)) continue;

    const days = {};
    for (const [colStr, dayNum] of Object.entries(dayMap)) {
      const col = parseInt(colStr, 10);
      const raw = row[col];
      const code = mapDutyCode(raw);
      const conf = mapDutyConfidence(raw);
      if (raw != null && String(raw).trim() !== '') {
        totalConfSum += conf;
        totalCellCount++;
        if (conf === 0.0) unmappedCount++;
      }
      days[String(dayNum)] = code;
    }
    if (Object.keys(days).length > 0) {
      rows.push({ name, days });
    }
  }

  // 4. 신뢰도: Excel은 결정론이므로 매핑 실패만 confidence 깎음
  const confidence = totalCellCount === 0
    ? 1.0
    : Math.max(0, totalConfSum / totalCellCount);

  // 5. 월 추론 (sheet name 또는 fileName에서)
  const month = _inferMonth(sheetName) || _inferMonth(fileName) || null;
  const dept = _inferDept(sheetName) || _inferDept(fileName) || null;

  return {
    month,
    dept,
    rows,
    confidence,
    notes: unmappedCount > 0 ? `매핑 실패 ${unmappedCount}셀` : '',
    parser_version: 'excel-v1.0',
    source: 'excel',
  };
}

/**
 * 일자 헤더 행 탐색.
 * 첫 5행 중에서 숫자 1~31이 가장 많이 등장하는 행.
 * @param {Array<Array<string>>} grid
 * @returns {{ rowIndex: number, dayMap: Object } | null}
 */
function _findDayHeaderRow(grid) {
  let bestRow = -1;
  let bestDayMap = {};
  let bestScore = 0;

  const maxRows = Math.min(5, grid.length);
  for (let r = 0; r < maxRows; r++) {
    const row = grid[r];
    if (!row) continue;
    const dayMap = {};
    let score = 0;
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').trim();
      const m = cell.match(/^(\d{1,2})(일)?$/);
      if (m) {
        const day = parseInt(m[1], 10);
        if (day >= 1 && day <= 31) {
          dayMap[c] = day;
          score++;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestRow = r;
      bestDayMap = dayMap;
    }
  }

  // 최소 7일 이상이어야 헤더로 인정 (1주 이상)
  if (bestScore < 7) return null;
  return { rowIndex: bestRow, dayMap: bestDayMap };
}

/**
 * 이름 열 탐색.
 * 헤더 아래 행에서 한국어 이름 정규식 매치되는 셀이 가장 많은 컬럼.
 * @param {Array<Array<string>>} grid
 * @param {number} headerRow
 * @returns {number}
 */
function _findNameColumn(grid, headerRow) {
  const koreanNameRe = /^[가-힣]{2,5}$/;
  const colCounts = {};
  for (let r = headerRow + 1; r < Math.min(headerRow + 20, grid.length); r++) {
    const row = grid[r];
    if (!row) continue;
    for (let c = 0; c < Math.min(row.length, 5); c++) {
      const cell = String(row[c] || '').trim();
      if (koreanNameRe.test(cell)) {
        colCounts[c] = (colCounts[c] || 0) + 1;
      }
    }
  }
  let bestCol = 0;
  let bestCount = 0;
  for (const [col, count] of Object.entries(colCounts)) {
    if (count > bestCount) {
      bestCount = count;
      bestCol = parseInt(col, 10);
    }
  }
  return bestCol;
}

/**
 * "합계", "비고", "총", "Total" 등 메타데이터 행 판별.
 */
function _looksLikeMetadata(name) {
  const metaTokens = ['합계', '비고', '총', '소계', 'Total', 'Sum', '합', '총계'];
  return metaTokens.some(t => name.includes(t));
}

/**
 * 시트명/파일명에서 'YYYY-MM' 추론.
 */
function _inferMonth(text) {
  if (!text) return null;
  // "2026-04", "2026.04", "2026년 4월", "26-04"
  const m1 = text.match(/(\d{4})[\-.년\s]+(\d{1,2})월?/);
  if (m1) {
    const y = m1[1];
    const m = String(m1[2]).padStart(2, '0');
    return `${y}-${m}`;
  }
  // "26-04"
  const m2 = text.match(/(\d{2})[\-.](\d{1,2})/);
  if (m2) {
    const y = '20' + m2[1];
    const m = String(m2[2]).padStart(2, '0');
    return `${y}-${m}`;
  }
  return null;
}

/**
 * 시트명/파일명에서 부서 추론 (화이트리스트).
 */
function _inferDept(text) {
  if (!text) return null;
  const depts = ['ICU', 'CCU', 'NICU', '응급실', '병동', '수술실', '외래'];
  for (const d of depts) {
    if (text.includes(d)) return d;
  }
  return null;
}

function _emptyGrid(reason) {
  return {
    month: null,
    dept: null,
    rows: [],
    confidence: 0,
    notes: reason,
    parser_version: 'excel-v1.0',
    source: 'excel',
  };
}
