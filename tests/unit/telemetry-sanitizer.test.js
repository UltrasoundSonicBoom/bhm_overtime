// telemetry-sanitizer 단위 테스트 — defense in depth 검증
// 핵심: 금액/이름/사번이 어떤 경로로도 통과하지 않을 것
import { describe, it, expect } from 'vitest';
import { sanitize, sanitizeBatch, PATTERNS } from '../../apps/web/src/client/telemetry-sanitizer.js';

describe('sanitize — 거부 케이스 (금액/이름/사번)', () => {
  it('금액 패턴 라벨 거부 — "1,234,567"', () => {
    expect(sanitize({ type: 'new_label', label: '1,234,567' })).toBeNull();
  });

  it('금액 포함 라벨 거부 — "기본급 3,500,000"', () => {
    expect(sanitize({ type: 'new_label', label: '기본급 3,500,000' })).toBeNull();
  });

  it('짧은 한글 이름 거부 — "김철수"', () => {
    expect(sanitize({ type: 'new_label', label: '김철수' })).toBeNull();
  });

  it('짧은 한글 이름 거부 — "박서연"', () => {
    expect(sanitize({ type: 'new_label', label: '박서연' })).toBeNull();
  });

  it('사번 거부 — "12345"', () => {
    expect(sanitize({ type: 'new_label', label: '12345' })).toBeNull();
  });

  it('주민번호 거부 — "900101-1234567"', () => {
    expect(sanitize({ type: 'new_label', label: '900101-1234567' })).toBeNull();
  });

  it('user_correction 의 before 에 이름 거부', () => {
    expect(sanitize({ type: 'user_correction', before: '홍길동', after: '기본급' })).toBeNull();
  });

  it('user_correction 의 after 에 금액 거부', () => {
    expect(sanitize({ type: 'user_correction', before: '기본급', after: '500,000' })).toBeNull();
  });

  it('reason 필드에 금액 거부', () => {
    expect(sanitize({ type: 'new_label', label: '추가수당', reason: '5,000,000원' })).toBeNull();
  });

  it('column_labels 에 금액 포함 시 전체 reject (보수적)', () => {
    // 정상 라벨 + 금액 라벨 섞이면 column_labels 에서 금액 라벨이 필터링되어 정상 라벨만 통과
    // 단, 모든 라벨이 거부되면 column_labels 키 자체가 빠지고 이벤트는 통과
    const r = sanitize({
      type: 'structure_pattern',
      column_labels: ['기본급', '1,234,567', '직책수당']
    });
    expect(r).not.toBeNull();
    expect(r.column_labels).toEqual(['기본급', '직책수당']); // 금액만 필터됨
  });
});

describe('sanitize — 허용 케이스 (정상)', () => {
  it('정상 라벨 통과 — "야간근로수당"', () => {
    const r = sanitize({ type: 'new_label', label: '야간근로수당', source: 'payslip' });
    expect(r).not.toBeNull();
    expect(r.label).toBe('야간근로수당');
    expect(r.source).toBe('payslip');
    expect(r.timestamp).toBeDefined();
  });

  it('user_correction 라벨 매핑', () => {
    const r = sanitize({
      type: 'user_correction',
      before: '추가야근',
      after: '야간근로수당',
      field: 'label',
    });
    expect(r).toEqual(expect.objectContaining({
      type: 'user_correction',
      before: '추가야근',
      after: '야간근로수당',
      field: 'label',
    }));
  });

  it('parse_failure — fallback 식별자', () => {
    const r = sanitize({ type: 'parse_failure', fallback: 'parsePDFText', stage: 'grid_match' });
    expect(r).toEqual(expect.objectContaining({
      fallback: 'parsePDFText',
      stage: 'grid_match',
    }));
  });

  it('confidence_low — 0~1 범위', () => {
    expect(sanitize({ type: 'confidence_low', score: 0.42 })?.score).toBe(0.42);
    expect(sanitize({ type: 'confidence_low', score: 0 })?.score).toBe(0);
    expect(sanitize({ type: 'confidence_low', score: 1 })?.score).toBe(1);
  });

  it('schedule_code — 변형 코드', () => {
    expect(sanitize({ type: 'schedule_code', code: 'OD' })?.code).toBe('OD');
    expect(sanitize({ type: 'schedule_code', code: '주' })?.code).toBe('주');
  });

  it('structure_pattern — shape + 정상 라벨', () => {
    const r = sanitize({
      type: 'structure_pattern',
      shape: { rows: 12, cols: 6, merged_cells: 2 },
      column_labels: ['기본급', '직책수당', '시간외수당'],
    });
    expect(r.shape).toEqual({ rows: 12, cols: 6, merged_cells: 2 });
    expect(r.column_labels).toEqual(['기본급', '직책수당', '시간외수당']);
  });

  it('position 인덱스 통과', () => {
    const r = sanitize({ type: 'new_label', label: '추가수당', position: [9, 5] });
    expect(r.position).toEqual([9, 5]);
  });
});

describe('sanitize — 입력 형식 거부', () => {
  it('null/undefined/원시값 거부', () => {
    expect(sanitize(null)).toBeNull();
    expect(sanitize(undefined)).toBeNull();
    expect(sanitize('string')).toBeNull();
    expect(sanitize(42)).toBeNull();
  });

  it('알 수 없는 type 거부', () => {
    expect(sanitize({ type: 'unknown_type', label: '기본급' })).toBeNull();
    expect(sanitize({ type: 'amount_value', value: 100000 })).toBeNull();
  });

  it('label 누락 거부', () => {
    expect(sanitize({ type: 'new_label' })).toBeNull();
    expect(sanitize({ type: 'new_label', label: '' })).toBeNull();
  });

  it('label 30자 초과 거부 (긴 텍스트는 의심)', () => {
    expect(sanitize({ type: 'new_label', label: '가'.repeat(31) })).toBeNull();
  });

  it('confidence 범위 외 거부', () => {
    expect(sanitize({ type: 'confidence_low', score: 1.5 })).toBeNull();
    expect(sanitize({ type: 'confidence_low', score: -0.1 })).toBeNull();
    expect(sanitize({ type: 'confidence_low', score: NaN })).toBeNull();
  });

  it('parse_failure fallback 비식별자 거부 (인젝션 방지)', () => {
    expect(sanitize({ type: 'parse_failure', fallback: 'rm -rf /' })).toBeNull();
    expect(sanitize({ type: 'parse_failure', fallback: 'with spaces' })).toBeNull();
  });

  it('position 인덱스 범위 외 거부', () => {
    expect(sanitize({ type: 'new_label', label: '수당', position: [9, 999] })?.position).toBeUndefined();
    expect(sanitize({ type: 'new_label', label: '수당', position: [-1, 5] })?.position).toBeUndefined();
  });
});

describe('sanitize — 부수 안전망', () => {
  it('source 화이트리스트 외 → unknown', () => {
    expect(sanitize({ type: 'new_label', label: '수당', source: 'malicious' })?.source).toBe('unknown');
  });

  it('field 화이트리스트 외 → 누락', () => {
    const r = sanitize({ type: 'user_correction', before: '전', after: '후', field: 'amount' });
    expect(r.field).toBeUndefined();
  });

  it('타임스탬프 자동 생성 (raw에 없을 때)', () => {
    const r = sanitize({ type: 'new_label', label: '수당' });
    expect(r.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('sanitizeBatch', () => {
  it('일괄 처리 + null 필터', () => {
    const out = sanitizeBatch([
      { type: 'new_label', label: '야간수당' },
      { type: 'new_label', label: '500,000' },  // 거부
      { type: 'unknown', label: 'x' },          // 거부
      { type: 'schedule_code', code: 'OD' },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].label).toBe('야간수당');
    expect(out[1].code).toBe('OD');
  });

  it('비배열 입력 빈 배열 반환', () => {
    expect(sanitizeBatch(null)).toEqual([]);
    expect(sanitizeBatch('not array')).toEqual([]);
  });
});

describe('PATTERNS export — Firestore Rules 동기화', () => {
  it('정규식과 화이트리스트 export 됨', () => {
    expect(PATTERNS.MONEY_RE).toBeInstanceOf(RegExp);
    expect(PATTERNS.NAME_RE).toBeInstanceOf(RegExp);
    expect(PATTERNS.EMP_NUM_RE).toBeInstanceOf(RegExp);
    expect(PATTERNS.RRN_RE).toBeInstanceOf(RegExp);
    expect(PATTERNS.ALLOWED_TYPES).toContain('new_label');
    expect(PATTERNS.ALLOWED_TYPES).toContain('user_correction');
  });
});
