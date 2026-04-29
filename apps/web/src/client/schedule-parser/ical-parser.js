// ical-parser.js — .ics 파일 / 텍스트 → DutyGrid (결정론, AI 미사용)
//
// 사용 라이브러리: ical.js (Mozilla, ~30KB gzip)
// 입력:
//   - .ics 파일 (File 또는 텍스트)
//   - iCal URL (직접 fetch → CORS 실패 시 /api/ics-proxy 자동 폴백)
//
// 매핑:
//   - VEVENT.SUMMARY → 듀티 코드 (duty-code-mapper.js)
//   - VEVENT.DTSTART → 일자
//   - 매핑 실패한 SUMMARY는 빈 셀 + notes에 기록

import ICAL from 'ical.js';
import { mapDutyCode, mapDutyConfidence } from './duty-code-mapper.js';

/**
 * .ics 텍스트 → DutyGrid
 * @param {string} icsText
 * @param {Object} [opts]
 * @param {string} [opts.profileName]
 * @param {string} [opts.deptHint]
 * @param {string} [opts.monthHint]  YYYY-MM
 * @returns {DutyGrid}
 */
export function parseIcsText(icsText, opts = {}) {
  if (!icsText || typeof icsText !== 'string') {
    return _emptyGrid('empty_ics');
  }

  let component;
  try {
    const jcal = ICAL.parse(icsText);
    component = new ICAL.Component(jcal);
  } catch (e) {
    return _emptyGrid(`ical_parse_error: ${e?.message?.slice(0, 100)}`);
  }

  const events = component.getAllSubcomponents('vevent');
  if (events.length === 0) {
    return _emptyGrid('no_events');
  }

  // monthHint 또는 가장 많은 이벤트가 있는 월 사용
  const month = opts.monthHint || _detectDominantMonth(events);
  if (!month) return _emptyGrid('no_month_detected');

  // 본인 1행만 추출 (iCal은 보통 개인 캘린더이므로)
  const days = {};
  const unmappedSummaries = new Set();
  let totalConfSum = 0;
  let totalCount = 0;

  for (const veventNode of events) {
    const vevent = new ICAL.Event(veventNode);
    const startDate = vevent.startDate;
    if (!startDate) continue;

    const eventMonth = `${startDate.year}-${String(startDate.month).padStart(2, '0')}`;
    if (eventMonth !== month) continue;

    const day = String(startDate.day);
    const summary = vevent.summary || '';
    const code = mapDutyCode(summary);
    const conf = mapDutyConfidence(summary);

    if (code) {
      // 같은 일에 여러 이벤트 있으면 첫 번째 우선 (또는 더 긴 이벤트)
      if (!days[day]) {
        days[day] = code;
        totalConfSum += conf;
        totalCount++;
      }
    } else if (summary) {
      unmappedSummaries.add(summary);
    }
  }

  if (Object.keys(days).length === 0) {
    return _emptyGrid('no_mapped_events');
  }

  const confidence = totalCount === 0 ? 0 : totalConfSum / totalCount;
  const name = opts.profileName || '내';

  const notes = unmappedSummaries.size > 0
    ? `매핑 실패 SUMMARY: ${[...unmappedSummaries].slice(0, 5).join(', ')}`
    : '';

  return {
    month,
    dept: opts.deptHint || null,
    rows: [{ name, days }],
    confidence,
    notes,
    parser_version: 'ical-v1.0',
    source: 'ical',
  };
}

/**
 * .ics 파일 → DutyGrid
 * @param {File} file
 * @param {Object} opts
 */
export async function parseIcsFile(file, opts = {}) {
  if (!file) return _emptyGrid('no_file');
  const text = await file.text();
  return parseIcsText(text, opts);
}

/**
 * iCal URL → DutyGrid.
 * 1차: 브라우저 직접 fetch (공개 URL 일부)
 * 2차: 서버 프록시 /api/ics-proxy?url=... (CORS 차단 시 자동 폴백)
 * @param {string} url
 * @param {Object} opts
 * @returns {Promise<{ grid: DutyGrid | null, error?: string }>}
 */
export async function fetchAndParseIcsUrl(url, opts = {}) {
  if (!url || !/^https?:\/\//.test(url)) {
    return { grid: null, error: 'URL이 유효하지 않습니다 (https://...로 시작해야 함)' };
  }

  // 1차 시도: 직접 fetch
  try {
    const resp = await fetch(url, { method: 'GET', mode: 'cors', credentials: 'omit' });
    if (resp.ok) {
      const text = await resp.text();
      if (text.includes('BEGIN:VCALENDAR')) {
        return { grid: parseIcsText(text, opts), error: undefined };
      }
      return { grid: null, error: '응답이 iCal 형식이 아닙니다.' };
    }
  } catch (_corsErr) {
    // CORS → 프록시로 폴백
  }

  // 2차 시도: 서버 프록시
  try {
    const proxyUrl = `/api/ics-proxy?url=${encodeURIComponent(url)}`;
    const resp = await fetch(proxyUrl);
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      return { grid: null, error: body.error || `프록시 오류: HTTP ${resp.status}` };
    }
    const text = await resp.text();
    if (!text.includes('BEGIN:VCALENDAR')) {
      return { grid: null, error: '응답이 iCal 형식이 아닙니다.' };
    }
    return { grid: parseIcsText(text, opts), error: undefined };
  } catch (e) {
    return {
      grid: null,
      error: `URL 가져오기 실패: ${e?.message?.slice(0, 80) || '알 수 없는 오류'}`,
    };
  }
}

// ── 헬퍼 ──

function _detectDominantMonth(events) {
  const counts = {};
  for (const veventNode of events) {
    const vevent = new ICAL.Event(veventNode);
    const startDate = vevent.startDate;
    if (!startDate) continue;
    const ym = `${startDate.year}-${String(startDate.month).padStart(2, '0')}`;
    counts[ym] = (counts[ym] || 0) + 1;
  }
  let bestMonth = null;
  let bestCount = 0;
  for (const [m, c] of Object.entries(counts)) {
    if (c > bestCount) {
      bestCount = c;
      bestMonth = m;
    }
  }
  return bestMonth;
}

function _emptyGrid(reason) {
  return {
    month: null,
    dept: null,
    rows: [],
    confidence: 0,
    notes: reason,
    parser_version: 'ical-v1.0',
    source: 'ical',
  };
}
