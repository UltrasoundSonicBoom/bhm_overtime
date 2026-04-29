// telemetry-sanitizer.js — 파싱 텔레메트리 익명화 (defense in depth)
//
// 원칙: 라벨/구조/수정 이력만 수집. 금액·이름·사번 절대 미수집.
// 클라이언트 + 게이트웨이 + Firestore Rules 3중 검증의 1단계.
//
// 사용:
//   import { sanitize } from './telemetry-sanitizer.js';
//   const event = sanitize({ type:'new_label', label:'추가야간수당', position:[9,5] });
//   if (event) telemetrySync.write(event);

// 허용 이벤트 타입 화이트리스트
const ALLOWED_TYPES = new Set([
  'new_label',         // 신규 항목 발견 (라벨만)
  'user_correction',   // 사용자 수정 (전→후 라벨 쌍)
  'parse_failure',     // 파싱 실패 모드 (어떤 fallback 발화했는지)
  'confidence_low',    // 신뢰도 낮음 — LLM 폴백 트리거
  'schedule_code',     // 스케줄 코드 변형 (D/E/N 외)
  'structure_pattern', // 표 구조 패턴 (행/열 인덱스, 머지셀 패턴)
]);

// 거부 패턴: 금액·이름·사번 — 어디든 발견 시 이벤트 자체 reject
// MONEY_RE: 콤마 구분 또는 "원" 접미 — ISO timestamp(2026-04-29) 같은 false positive 회피
const MONEY_RE = /(?:-?\d{1,3}(?:,\d{3})+|\b\d{4,}\s*원)/;
const EMP_NUM_RE = /\b\d{5,}\b/;       // 5자리+ 숫자 (사번)
const RRN_RE = /\d{6}-\d{7}/;          // 주민번호

// 한국 성씨 화이트리스트 — 라벨 첫 글자가 이 중 하나 + 정확히 2-4자 한글이면 이름으로 간주
// 이유: '기본급'(기) 처럼 비-성씨로 시작하는 라벨은 통과시키고, '김철수'처럼 성씨+이름은 거부
const KOREAN_SURNAMES_RE = /^(김|이|박|최|정|강|조|윤|장|임|한|신|오|송|류|홍|권|황|안|유|손|배|백|허|남|심|노|하|곽|성|진|차|문|양|구|민|지|마|길|연|원|왕|반|함|선|독|남궁|선우|황보|제갈|사공|서문|동방)/;
// NAME_RE: '정확히 2-4자 한글이며 성씨로 시작' — 짧은 일반 라벨('수당','식대','기본급')은 비-성씨로 시작하므로 통과
const NAME_RE = /^[가-힣]{2,4}$/;

// 라벨 길이 제한 (정상 항목명은 30자 이하)
const MAX_LABEL_LEN = 30;

function _looksLikeMoney(s) {
  if (typeof s !== 'string') return false;
  return MONEY_RE.test(s);
}

function _looksLikeName(s) {
  if (typeof s !== 'string') return false;
  const t = s.trim();
  // 2-4자 한글 + 한국 성씨로 시작하면 이름으로 판단
  return NAME_RE.test(t) && KOREAN_SURNAMES_RE.test(t);
}

function _looksLikeEmpNum(s) {
  if (typeof s !== 'string') return false;
  return EMP_NUM_RE.test(s) || RRN_RE.test(s);
}

function _isSafeLabel(label) {
  if (typeof label !== 'string') return false;
  if (label.length === 0 || label.length > MAX_LABEL_LEN) return false;
  // 금액·사번·주민번호 패턴 거부
  if (_looksLikeMoney(label)) return false;
  if (_looksLikeEmpNum(label)) return false;
  // 한글 이름 패턴 거부 (성씨 시작 + 2-4자)
  if (_looksLikeName(label)) return false;
  return true;
}

function _isSafeNumber(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return false;
  return true;
}

function _isSafeIndex(n) {
  return _isSafeNumber(n) && n >= 0 && n < 200 && Number.isInteger(n);
}

function _isSafeConfidence(n) {
  return _isSafeNumber(n) && n >= 0 && n <= 1;
}

function _isSafeCode(s) {
  // 스케줄 코드: 영문 대문자 1-4자 또는 한글 1-3자
  return typeof s === 'string' &&
    s.length >= 1 && s.length <= 4 &&
    /^[A-Z가-힣]+$/.test(s) &&
    !_looksLikeName(s);
}

// 메인 sanitize. 반환: cleanEvent 또는 null (rejected)
export function sanitize(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!ALLOWED_TYPES.has(raw.type)) return null;

  const out = {
    type: raw.type,
    timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : new Date().toISOString(),
    source: raw.source === 'payslip' || raw.source === 'schedule' ? raw.source : 'unknown',
  };

  switch (raw.type) {
    case 'new_label':
      if (!_isSafeLabel(raw.label)) return null;
      out.label = raw.label;
      if (raw.position && Array.isArray(raw.position) && raw.position.length === 2) {
        if (_isSafeIndex(raw.position[0]) && _isSafeIndex(raw.position[1])) {
          out.position = [raw.position[0], raw.position[1]];
        }
      }
      // reason 이 제공됐으면 검증해서 통과해야 함. 통과 못하면 fail-closed (전체 reject)
      if (raw.reason !== undefined && raw.reason !== null) {
        if (!_isSafeLabel(raw.reason)) return null;
        out.reason = raw.reason;
      }
      break;

    case 'user_correction':
      // 라벨 단위 매핑만 (예: "야근수당" → "야간근로수당")
      if (!_isSafeLabel(raw.before) || !_isSafeLabel(raw.after)) return null;
      out.before = raw.before;
      out.after = raw.after;
      if (raw.field === 'label' || raw.field === 'code') out.field = raw.field;
      break;

    case 'parse_failure':
      // 어떤 fallback path 발화했는지 (코드명만)
      if (typeof raw.fallback !== 'string' || raw.fallback.length > 50) return null;
      if (!/^[a-zA-Z_][\w-]*$/.test(raw.fallback)) return null;  // 식별자만
      out.fallback = raw.fallback;
      if (raw.stage && /^[a-zA-Z_][\w-]*$/.test(raw.stage) && raw.stage.length <= 30) {
        out.stage = raw.stage;
      }
      break;

    case 'confidence_low':
      if (!_isSafeConfidence(raw.score)) return null;
      out.score = raw.score;
      if (raw.parser && /^[a-zA-Z_][\w-]*$/.test(raw.parser)) out.parser = raw.parser;
      break;

    case 'schedule_code':
      if (!_isSafeCode(raw.code)) return null;
      out.code = raw.code;
      if (typeof raw.frequency === 'number' && _isSafeIndex(raw.frequency)) {
        out.frequency = raw.frequency;
      }
      break;

    case 'structure_pattern':
      // 표 구조 메타: 행수, 열수, 머지셀 개수 등
      if (raw.shape && typeof raw.shape === 'object') {
        const shape = {};
        if (_isSafeIndex(raw.shape.rows)) shape.rows = raw.shape.rows;
        if (_isSafeIndex(raw.shape.cols)) shape.cols = raw.shape.cols;
        if (_isSafeIndex(raw.shape.merged_cells)) shape.merged_cells = raw.shape.merged_cells;
        if (Object.keys(shape).length > 0) out.shape = shape;
      }
      if (Array.isArray(raw.column_labels)) {
        const safe = raw.column_labels.filter(l => _isSafeLabel(l));
        if (safe.length > 0 && safe.length <= 30) out.column_labels = safe;
      }
      break;

    default:
      return null;
  }

  // 최종 안전망: out 의 어떤 string 필드에도 금액/사번/주민번호/이름 패턴 없을 것
  for (const v of Object.values(out)) {
    if (typeof v === 'string' && (_looksLikeMoney(v) || _looksLikeEmpNum(v) || _looksLikeName(v))) {
      return null;
    }
    if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === 'string' && (_looksLikeMoney(item) || _looksLikeEmpNum(item) || _looksLikeName(item))) {
          return null;
        }
      }
    }
  }

  return out;
}

// 다수 이벤트 일괄 처리 헬퍼
export function sanitizeBatch(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList.map(sanitize).filter(e => e !== null);
}

// 테스트 / Firestore Rules 정규식 동기화용 export
export const PATTERNS = {
  MONEY_RE,
  NAME_RE,
  KOREAN_SURNAMES_RE,
  EMP_NUM_RE,
  RRN_RE,
  ALLOWED_TYPES: Array.from(ALLOWED_TYPES),
};
