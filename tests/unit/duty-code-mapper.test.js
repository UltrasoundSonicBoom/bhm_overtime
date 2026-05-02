// tests/unit/duty-code-mapper.test.js — 듀티 코드 매핑 단위 테스트
import { describe, it, expect } from 'vitest';
import {
  mapDutyCode,
  mapDutyConfidence,
  mapDutyRow,
  STANDARD_CODES,
} from '../../apps/web/src/client/schedule-parser/duty-code-mapper.js';

describe('mapDutyCode — 영문 1글자', () => {
  it('D/E/N/O 그대로 매핑', () => {
    expect(mapDutyCode('D')).toBe('D');
    expect(mapDutyCode('E')).toBe('E');
    expect(mapDutyCode('N')).toBe('N');
    expect(mapDutyCode('O')).toBe('O');
  });

  it('소문자도 매핑', () => {
    expect(mapDutyCode('d')).toBe('D');
    expect(mapDutyCode('n')).toBe('N');
  });

  it('AL/RD 약어', () => {
    expect(mapDutyCode('AL')).toBe('AL');
    expect(mapDutyCode('al')).toBe('AL');
    expect(mapDutyCode('RD')).toBe('RD');
    expect(mapDutyCode('R')).toBe('RD');
  });

  it('9A 고정근무 코드도 보존한다', () => {
    expect(mapDutyCode('9A')).toBe('9A');
    expect(mapDutyCode('9a')).toBe('9A');
  });
});

describe('mapDutyCode — 한국어', () => {
  it('한국어 풀 명칭', () => {
    expect(mapDutyCode('데이')).toBe('D');
    expect(mapDutyCode('이브닝')).toBe('E');
    expect(mapDutyCode('나이트')).toBe('N');
    expect(mapDutyCode('오프')).toBe('O');
    expect(mapDutyCode('연차')).toBe('AL');
    expect(mapDutyCode('리커버리')).toBe('RD');
    expect(mapDutyCode('리커버리데이')).toBe('RD');
  });

  it('한국어 단축형', () => {
    expect(mapDutyCode('주간')).toBe('D');
    expect(mapDutyCode('야간')).toBe('N');
    expect(mapDutyCode('휴무')).toBe('O');
    expect(mapDutyCode('휴')).toBe('O');
  });

  it('공백·이모지 제거 후 매핑', () => {
    expect(mapDutyCode(' D ')).toBe('D');
    expect(mapDutyCode('🌙 야간')).toBe('N');
    expect(mapDutyCode('데 이')).toBe('D');
  });
});

describe('mapDutyCode — 빈 셀 처리', () => {
  it('빈 문자열·null·undefined → ""', () => {
    expect(mapDutyCode('')).toBe('');
    expect(mapDutyCode(null)).toBe('');
    expect(mapDutyCode(undefined)).toBe('');
  });

  it('대시·점 등 빈 셀 토큰 → ""', () => {
    expect(mapDutyCode('-')).toBe('');
    expect(mapDutyCode('·')).toBe('');
    expect(mapDutyCode('없음')).toBe('');
  });
});

describe('mapDutyCode — 부분 매칭', () => {
  it('"이브닝근무" 등 키워드 포함 매칭', () => {
    expect(mapDutyCode('이브닝근무')).toBe('E');
    expect(mapDutyCode('나이트근무')).toBe('N');
  });

  it('알 수 없는 값 → ""', () => {
    expect(mapDutyCode('???')).toBe('');
    expect(mapDutyCode('foo')).toBe('');
  });
});

describe('mapDutyConfidence', () => {
  it('정확 매핑 → 1.0', () => {
    expect(mapDutyConfidence('D')).toBe(1.0);
    expect(mapDutyConfidence('데이')).toBe(1.0);
  });

  it('부분 매칭 → 0.7 (정확 매핑 없는 키워드 포함)', () => {
    // 'evening shift'는 정확 매핑에 없지만 'evening' 키워드 부분 매칭
    expect(mapDutyConfidence('evening shift')).toBe(0.7);
    expect(mapDutyConfidence('야간특근')).toBe(0.7);
  });

  it('실패 → 0.0', () => {
    expect(mapDutyConfidence('foo')).toBe(0.0);
  });

  it('빈 셀 → 1.0 (명확 빈 값)', () => {
    expect(mapDutyConfidence('')).toBe(1.0);
    expect(mapDutyConfidence(null)).toBe(1.0);
  });
});

describe('mapDutyRow — 일괄 변환', () => {
  it('전체 행 매핑 + 신뢰도 평균', () => {
    const result = mapDutyRow(['D', 'E', 'N', '오프', '연차']);
    expect(result.codes).toEqual(['D', 'E', 'N', 'O', 'AL']);
    expect(result.confidence).toBe(1.0);
    expect(result.unmappedCount).toBe(0);
  });

  it('일부 매핑 실패 → unmappedCount 증가', () => {
    const result = mapDutyRow(['D', '???', 'N']);
    expect(result.codes).toEqual(['D', '', 'N']);
    expect(result.unmappedCount).toBe(1);
    expect(result.confidence).toBeCloseTo(2 / 3, 2);
  });

  it('빈 행', () => {
    const result = mapDutyRow([]);
    expect(result.codes).toEqual([]);
    expect(result.confidence).toBe(1.0);
  });
});

describe('STANDARD_CODES', () => {
  it('표준 7종', () => {
    expect(STANDARD_CODES).toEqual(['D', 'E', 'N', 'O', 'AL', 'RD', '9A']);
  });
});
