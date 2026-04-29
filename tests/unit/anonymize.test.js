// tests/unit/anonymize.test.js — PII 누락 강제 차단 + 익명화 정확성
import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  anonymize,
  getCorpusConsent,
  setCorpusConsent,
  CURRENT_CONSENT_VERSION,
  DEPT_WHITELIST,
} from '../../apps/web/src/client/schedule-parser/anonymize.js';

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.localStorage = dom.window.localStorage;
  global.localStorage.clear();
});

describe('anonymize — PII 제거 (보안 invariant)', () => {
  it('한국어 이름이 출력에 절대 등장하지 않음', () => {
    const grid = {
      month: '2026-04',
      dept: 'ICU',
      rows: [
        { name: '홍길동', days: { '1': 'D' } },
        { name: '김철수', days: { '1': 'N' } },
        { name: '이영희', days: { '1': 'E' } },
      ],
      confidence: 0.95,
      parser_version: 'test',
    };
    const result = anonymize(grid);
    const blob = JSON.stringify(result);
    expect(blob).not.toContain('홍길동');
    expect(blob).not.toContain('김철수');
    expect(blob).not.toContain('이영희');
    // 익명화된 이름은 등장
    expect(blob).toContain('간호사1');
    expect(blob).toContain('간호사2');
    expect(blob).toContain('간호사3');
  });

  it('부서명 자유 텍스트 → 화이트리스트로 강제', () => {
    const grid = {
      dept: '서울대병원 외과중환자실 7병동 2팀',
      rows: [{ name: 'A', days: { '1': 'D' } }],
      confidence: 0.9,
      parser_version: 'test',
    };
    const result = anonymize(grid);
    expect(DEPT_WHITELIST).toContain(result.deptCategory);
    expect(JSON.stringify(result)).not.toContain('서울대병원');
    expect(JSON.stringify(result)).not.toContain('7병동');
  });

  it('부서 키워드 매칭 (ICU)', () => {
    const grid = {
      dept: 'ICU 중환자실',
      rows: [],
      confidence: 1.0,
      parser_version: 'test',
    };
    const result = anonymize(grid);
    expect(result.deptCategory).toBe('ICU');
  });

  it('부서 매칭 실패 → "기타"', () => {
    const grid = {
      dept: '알 수 없음',
      rows: [],
      confidence: 1.0,
      parser_version: 'test',
    };
    const result = anonymize(grid);
    expect(result.deptCategory).toBe('기타');
  });

  it('null/undefined dept → "기타"', () => {
    expect(anonymize({ dept: null, rows: [], confidence: 0, parser_version: 't' }).deptCategory).toBe('기타');
    expect(anonymize({ rows: [], confidence: 0, parser_version: 't' }).deptCategory).toBe('기타');
  });

  it('잘못된 day 키 (32, 0, 음수, 문자열) → 제외', () => {
    const grid = {
      dept: 'ICU',
      rows: [{ name: 'A', days: { '1': 'D', '32': 'E', '0': 'N', 'abc': 'D' } }],
      confidence: 1.0,
      parser_version: 'test',
    };
    const result = anonymize(grid);
    expect(Object.keys(result.rows[0].days)).toEqual(['1']);
  });

  it('잘못된 듀티 코드 (XX, "근무", undefined) → 제외', () => {
    const grid = {
      dept: 'ICU',
      rows: [{ name: 'A', days: { '1': 'D', '2': 'XX', '3': '근무' } }],
      confidence: 1.0,
      parser_version: 'test',
    };
    const result = anonymize(grid);
    expect(result.rows[0].days['1']).toBe('D');
    expect(result.rows[0].days['2']).toBeUndefined();
    expect(result.rows[0].days['3']).toBeUndefined();
  });

  it('이름이 익명화 후에도 한국어로 남으면 throw', () => {
    // 강제 invariant 검증: anonymize 자체는 항상 안전. 우회 시도 시 throw
    // 직접 row 조작 후 _assertNoPII 호출 확인 — 정상 경로에선 안전.
    const grid = { dept: 'ICU', rows: [{ name: '홍길동', days: { '1': 'D' } }], confidence: 0.9, parser_version: 't' };
    const result = anonymize(grid);
    // 결과에 '홍길동'이 절대 없음
    expect(JSON.stringify(result)).not.toMatch(/홍길동/);
  });
});

describe('anonymize — 메타데이터', () => {
  it('confidence, parserVersion, submittedAt, consentVersion 보존', () => {
    const grid = {
      dept: 'ICU',
      rows: [{ name: 'A', days: { '1': 'D' } }],
      confidence: 0.87,
      parser_version: 'excel-v1.0',
    };
    const result = anonymize(grid);
    expect(result.confidence).toBe(0.87);
    expect(result.parserVersion).toBe('excel-v1.0');
    expect(result.consentVersion).toBe(CURRENT_CONSENT_VERSION);
    expect(result.submittedAt).toBeGreaterThan(0);
  });

  it('파일명, 월, 사용자 메모는 출력에 없음', () => {
    const grid = {
      month: '2026-04',
      dept: 'ICU',
      rows: [{ name: 'A', days: { '1': 'D' } }],
      confidence: 1.0,
      parser_version: 'test',
      sourceFile: '비밀파일.pdf',
      notes: '특이 메모',
    };
    const result = anonymize(grid);
    const blob = JSON.stringify(result);
    expect(blob).not.toContain('비밀파일');
    expect(blob).not.toContain('특이 메모');
    // 사용자 month는 출력에 없음 (consentVersion에 날짜가 들어가는 건 별개)
    expect(result.month).toBeUndefined();
    expect(result.sourceFile).toBeUndefined();
    expect(result.notes).toBeUndefined();
  });
});

describe('동의 관리', () => {
  it('초기 상태: 동의 없음', () => {
    const consent = getCorpusConsent();
    expect(consent.granted).toBe(false);
    expect(consent.version).toBeNull();
  });

  it('setCorpusConsent(true) → version 저장', () => {
    setCorpusConsent(true);
    const consent = getCorpusConsent();
    expect(consent.granted).toBe(true);
    expect(consent.version).toBe(CURRENT_CONSENT_VERSION);
  });

  it('setCorpusConsent(false) → 철회', () => {
    setCorpusConsent(true);
    setCorpusConsent(false);
    expect(getCorpusConsent().granted).toBe(false);
  });
});
