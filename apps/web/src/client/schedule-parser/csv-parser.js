// csv-parser.js — CSV 파일 → DutyGrid (결정론적, LLM 미사용)
// PapaParse 사용 (UTF-8 BOM 자동 처리, RFC4180 호환).
//
// CSV는 Excel과 동일한 grid 추론 로직을 공유. 시트 → CSV 텍스트만 변환 후 위임.

import Papa from 'papaparse';
import { mapDutyCode, mapDutyConfidence } from './duty-code-mapper.js';

/**
 * CSV 파일 → DutyGrid
 * @param {File|string} fileOrText
 * @returns {Promise<DutyGrid>}
 */
export async function parseCsvFile(fileOrText) {
  const text = typeof fileOrText === 'string'
    ? fileOrText
    : await fileOrText.text();

  // PapaParse: header: false → 2D 배열 반환
  const parsed = Papa.parse(text, {
    header: false,
    skipEmptyLines: true,
    transform: (val) => String(val == null ? '' : val).trim(),
  });

  if (parsed.errors && parsed.errors.length > 0) {
    return _emptyGrid('csv_parse_error: ' + parsed.errors[0].message);
  }

  const grid = parsed.data || [];
  return _parseGrid(grid, fileOrText?.name || '');
}

function _parseGrid(grid, fileName) {
  if (!grid || grid.length === 0) {
    return _emptyGrid('empty_csv');
  }

  const headerInfo = _findDayHeaderRow(grid);
  if (!headerInfo) {
    return _emptyGrid('no_day_header');
  }
  const { rowIndex: headerRow, dayMap } = headerInfo;
  const nameCol = _findNameColumn(grid, headerRow);

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

  const confidence = totalCellCount === 0
    ? 1.0
    : Math.max(0, totalConfSum / totalCellCount);

  return {
    month: _inferMonth(fileName),
    dept: _inferDept(fileName),
    rows,
    confidence,
    notes: unmappedCount > 0 ? `매핑 실패 ${unmappedCount}셀` : '',
    parser_version: 'csv-v1.0',
    source: 'csv',
  };
}

// ── 헬퍼 (excel-parser.js와 동일 로직) ──

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
  if (bestScore < 7) return null;
  return { rowIndex: bestRow, dayMap: bestDayMap };
}

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

function _looksLikeMetadata(name) {
  const metaTokens = ['합계', '비고', '총', '소계', 'Total', 'Sum', '합', '총계'];
  return metaTokens.some(t => name.includes(t));
}

function _inferMonth(text) {
  if (!text) return null;
  const m1 = text.match(/(\d{4})[\-.년\s]+(\d{1,2})월?/);
  if (m1) {
    return `${m1[1]}-${String(m1[2]).padStart(2, '0')}`;
  }
  const m2 = text.match(/(\d{2})[\-.](\d{1,2})/);
  if (m2) {
    return `20${m2[1]}-${String(m2[2]).padStart(2, '0')}`;
  }
  return null;
}

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
    parser_version: 'csv-v1.0',
    source: 'csv',
  };
}
