// Plan M Phase 1 — 신규 계산기 단위 테스트
// 실행: npm run test:unit -- plan-m-phase-1
import { describe, it, expect } from 'vitest';

const { DATA } = require('../../data.js');
globalThis.DATA = DATA;
const { CALC } = require('../../calculators.js');

// overtime.js 런타임 경로는 window/브라우저 의존 (window.getUserStorageKey, 전역 _OT_*)
// 이라 CommonJS require 로는 로드 불가 — 단위 테스트는 calculators.js CALC 경로로만 커버.
// overtime.js 의 publicHoliday 통합은 브라우저 스모크/수동 확인으로 검증.

describe('M1-1 공휴일 50% 가산 (제32조(6))', () => {
  it('isPublicHoliday=true: 휴일 150% + 공휴일 추가 50% = 200% 효과', () => {
    // hourlyRate 10,000 × 8h 휴일 × 150% = 120,000 (기존 휴일 가산)
    // + 10,000 × 8h × 50% = 40,000 (공휴일 추가 가산)
    // 합 160,000
    const r = CALC.calcOvertimePay(10000, 0, 0, 8, false, { isPublicHoliday: true });
    expect(r.휴일근무수당).toBe(160000);
    expect(r.합계).toBe(160000);
  });

  it('isPublicHoliday=false: 기존 휴일 150% 만 적용', () => {
    const r = CALC.calcOvertimePay(10000, 0, 0, 8, false, { isPublicHoliday: false });
    expect(r.휴일근무수당).toBe(120000);
  });

  it('extras 인자 생략 시 기존 동작 (하위 호환)', () => {
    const r = CALC.calcOvertimePay(10000, 0, 0, 8, false);
    expect(r.휴일근무수당).toBe(120000);
  });

  it('8시간 초과 휴일근무 + 공휴일: 8h 150% + 초과 200% + 전체 공휴일 50%', () => {
    // 10h 휴일 + 공휴일:
    // 기본: 8h × 1.5 + 2h × 2.0 = 120,000 + 40,000 = 160,000
    // 추가 공휴일: 10h × 0.5 = 50,000
    // 합 210,000
    const r = CALC.calcOvertimePay(10000, 0, 0, 10, false, { isPublicHoliday: true });
    expect(r.휴일근무수당).toBe(210000);
  });

  it('휴일근무 시간 0 + 공휴일 플래그: 추가 지급 없음 (holidayHours 0)', () => {
    const r = CALC.calcOvertimePay(10000, 1, 0, 0, false, { isPublicHoliday: true });
    expect(r.휴일근무수당).toBe(0);
    expect(r.연장근무수당).toBe(15000);
  });
});
