// anonymize.js — 파싱 결과의 PII (개인 식별 정보) 제거.
//
// 코퍼스 수집 시 단일 진입점. 절대 우회 금지:
//   - 이름 → '간호사1', '간호사2', ...
//   - 부서 → 화이트리스트 6종으로 정규화
//   - 날짜 → 일자만 보존 (요일 분포 유지), 연/월은 익명화
//   - 파일명·메모·sourceFile 등 → 폐기
//
// 출력은 순수 패턴 데이터 + 약간의 메타. 누가 어디서 언제 만든 건지 식별 불가.

const DEPT_WHITELIST = ['ICU', 'CCU', 'NICU', '응급실', '병동', '수술실', '외래', '기타'];

const KOREAN_NAME_RE = /[가-힣]{2,5}/;

/**
 * @param {DutyGrid} grid
 * @returns {AnonymizedCorpus}
 */
export function anonymize(grid) {
  if (!grid || !Array.isArray(grid.rows)) {
    return _emptyCorpus();
  }

  // 1. 부서: 화이트리스트로 정규화
  const dept = _normalizeDept(grid.dept);

  // 2. 이름: 인덱스 기반 익명화
  const rows = grid.rows.map((row, idx) => ({
    anonName: `간호사${idx + 1}`,
    days: _filterDays(row.days),
  }));

  // 3. 검증: 출력에 PII 누출 없는지 확인 (단위 테스트가 강제하는 invariant)
  _assertNoPII({ dept, rows });

  return {
    deptCategory: dept,
    rows,
    confidence: typeof grid.confidence === 'number' ? grid.confidence : 0,
    parserVersion: grid.parser_version || 'unknown',
    submittedAt: Date.now(),
    consentVersion: CURRENT_CONSENT_VERSION,
  };
}

/**
 * 코퍼스 동의 버전. 동의 문구 변경 시 업.
 */
export const CURRENT_CONSENT_VERSION = '2026-04-29-v1';

/**
 * @param {Object} corpus
 * @throws PII 노출 시
 */
function _assertNoPII(corpus) {
  // 부서명 화이트리스트 외 값 차단 (먼저 검사)
  if (corpus.deptCategory && !DEPT_WHITELIST.includes(corpus.deptCategory)) {
    throw new Error(`[anonymize] dept not in whitelist: ${corpus.deptCategory}`);
  }

  // 출력 검사 — 익명화된 이름·부서·동의 버전은 의도된 한국어 → 제거 후 PII 검사
  let blob = JSON.stringify(corpus);
  blob = blob.replace(/간호사\d+/g, '');               // 익명화 이름
  for (const d of DEPT_WHITELIST) blob = blob.replaceAll(d, '');  // 부서 화이트리스트
  if (KOREAN_NAME_RE.test(blob)) {
    throw new Error('[anonymize] PII leak detected: korean name pattern in output');
  }
}

function _normalizeDept(dept) {
  if (!dept || typeof dept !== 'string') return '기타';
  for (const d of DEPT_WHITELIST) {
    if (dept.includes(d)) return d;
  }
  return '기타';
}

function _filterDays(days) {
  if (!days || typeof days !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(days)) {
    const day = parseInt(k, 10);
    if (!Number.isFinite(day) || day < 1 || day > 31) continue;
    if (typeof v !== 'string') continue;
    if (!['D', 'E', 'N', 'O', 'AL', 'RD', ''].includes(v)) continue;
    out[String(day)] = v;
  }
  return out;
}

function _emptyCorpus() {
  return {
    deptCategory: '기타',
    rows: [],
    confidence: 0,
    parserVersion: 'unknown',
    submittedAt: Date.now(),
    consentVersion: CURRENT_CONSENT_VERSION,
  };
}

/**
 * 사용자 동의 상태 조회.
 * @returns {{ granted: boolean, version: string|null }}
 */
export function getCorpusConsent() {
  try {
    const raw = localStorage.getItem('snuhmate_corpus_consent');
    if (!raw) return { granted: false, version: null };
    return { granted: true, version: raw };
  } catch (_e) {
    return { granted: false, version: null };
  }
}

/**
 * 사용자 동의 저장 (현재 버전).
 */
export function setCorpusConsent(granted) {
  try {
    if (granted) {
      localStorage.setItem('snuhmate_corpus_consent', CURRENT_CONSENT_VERSION);
    } else {
      localStorage.removeItem('snuhmate_corpus_consent');
    }
  } catch (e) {
    console.warn('[anonymize] consent persist failed', e?.message);
  }
}

export { DEPT_WHITELIST };
