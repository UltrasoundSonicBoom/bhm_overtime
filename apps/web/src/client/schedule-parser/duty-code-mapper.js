// duty-code-mapper.js — 한국어/영어 듀티 코드 → 표준 코드 매핑.
// 모든 파서(Excel, CSV, Vision, iCal)가 공용으로 사용하는 단일 진입점.
//
// 표준 코드: D | E | N | O | AL | RD | 9A | ''(빈 셀)
// 입력: 자유 형식 문자열 (한국어/영어/약어/이모지)

export const STANDARD_CODES = ['D', 'E', 'N', 'O', 'AL', 'RD', '9A'];

// 정확 매핑 (대소문자 무시, 양쪽 trim 후 비교).
// key는 소문자 normalized, value는 표준 코드.
const EXACT_MAP = {
  // 영문 1글자
  'd': 'D', 'e': 'E', 'n': 'N', 'o': 'O', '9a': '9A',
  // 한국어 1글자
  '데': 'D', '이': 'E', '나': 'N', '오': 'O',
  // 한국어 풀 명칭
  '데이': 'D', '데이근무': 'D', '주간': 'D', '주간근무': 'D',
  '이브닝': 'E', '이브닝근무': 'E', '저녁': 'E', '석': 'E', '석간': 'E',
  '나이트': 'N', '나이트근무': 'N', '야간': 'N', '야': 'N', '야간근무': 'N',
  '오프': 'O', '휴': 'O', '휴무': 'O', '휴일': 'O', 'off': 'O', 'rest': 'O',
  // 연차
  'al': 'AL', '연차': 'AL', '연': 'AL', '연차휴가': 'AL',
  'annual': 'AL', 'leave': 'AL',
  // 리커버리데이
  'rd': 'RD', '리커버리': 'RD', '리커버리데이': 'RD',
  'recovery': 'RD', 'recoveryday': 'RD', 'r': 'RD',
};

// 빈 셀로 처리할 값 (트림 후).
const EMPTY_TOKENS = new Set(['', '-', '–', '—', '·', '.', 'x', 'X', '없음', 'none']);

/**
 * 자유 형식 문자열을 표준 듀티 코드로 변환.
 * @param {string} raw - 원본 셀 값
 * @returns {string} - 'D' | 'E' | 'N' | 'O' | 'AL' | 'RD' | '9A' | ''
 */
export function mapDutyCode(raw) {
  if (raw == null) return '';
  const s = String(raw).trim();
  if (EMPTY_TOKENS.has(s)) return '';

  // 양쪽 공백/이모지 제거 후 lowercase
  const normalized = s
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')  // 이모지 제거
    .replace(/\s+/g, '')
    .toLowerCase();

  if (EMPTY_TOKENS.has(normalized)) return '';
  if (EXACT_MAP[normalized]) return EXACT_MAP[normalized];

  // 부분 매칭 (정확 매핑 실패 시 키워드 검색)
  // 우선순위: 긴 키워드 먼저
  const keywords = [
    ['리커버리', 'RD'], ['recovery', 'RD'],
    ['연차', 'AL'], ['annual', 'AL'],
    ['데이', 'D'], ['주간', 'D'], ['day', 'D'],
    ['이브닝', 'E'], ['저녁', 'E'], ['evening', 'E'],
    ['나이트', 'N'], ['야간', 'N'], ['night', 'N'],
    ['오프', 'O'], ['휴무', 'O'], ['off', 'O'],
  ];
  for (const [kw, code] of keywords) {
    if (normalized.includes(kw)) return code;
  }

  return '';  // 매칭 실패 → 빈 셀 (사용자 검수에서 수동 매핑)
}

/**
 * 매핑 신뢰도 (0.0~1.0): 정확 매핑이면 1.0, 부분 매칭이면 0.7, 실패면 0.0.
 * @param {string} raw
 * @returns {number}
 */
export function mapDutyConfidence(raw) {
  if (raw == null) return 1.0;  // 빈 셀은 명확 (실패 아님)
  const s = String(raw).trim();
  if (EMPTY_TOKENS.has(s)) return 1.0;

  const normalized = s
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, '')
    .toLowerCase();

  if (EMPTY_TOKENS.has(normalized)) return 1.0;
  if (EXACT_MAP[normalized]) return 1.0;

  // 부분 매칭 신뢰도
  const code = mapDutyCode(raw);
  if (code) return 0.7;
  return 0.0;
}

/**
 * 셀 배열을 일괄 변환 + 전체 신뢰도 평균 반환.
 * @param {string[]} rawCells
 * @returns {{ codes: string[], confidence: number, unmappedCount: number }}
 */
export function mapDutyRow(rawCells) {
  if (!Array.isArray(rawCells)) return { codes: [], confidence: 1.0, unmappedCount: 0 };
  let totalConf = 0;
  let unmapped = 0;
  const codes = rawCells.map(c => {
    const code = mapDutyCode(c);
    const conf = mapDutyConfidence(c);
    totalConf += conf;
    if (conf === 0.0) unmapped++;
    return code;
  });
  const avgConf = rawCells.length === 0 ? 1.0 : totalConf / rawCells.length;
  return { codes, confidence: avgConf, unmappedCount: unmapped };
}
