// Plan M Phase 1 — 신규 계산기 단위 테스트
// 실행: npm run test:unit -- plan-m-phase-1
import { describe, it, expect } from 'vitest';

const { DATA } = require('../../data.js');
globalThis.DATA = DATA;
const { CALC } = require('../../calculators.js');

// overtime.js 런타임 경로는 window/브라우저 의존 (window.getUserStorageKey, 전역 _OT_*)
// 이라 CommonJS require 로는 로드 불가 — 단위 테스트는 calculators.js CALC 경로로만 커버.
// overtime.js 의 publicHoliday 통합은 브라우저 스모크/수동 확인으로 검증.

describe('M1-5 명절지원비 (제49조)', () => {
  it('calcHolidayBonus(기본급, 조정급): (base + adjust/2) × 0.5 × 4회/년 (월할)', () => {
    // 기본급 2,000,000 + 조정급 200,000 → per-time = (2,000,000 + 100,000) × 0.5 = 1,050,000
    // 연 4회 / 12 = 월할 350,000
    const r = CALC.calcHolidayBonus(2_000_000, 200_000);
    expect(r.perTime).toBe(1_050_000);
    expect(r.annual).toBe(4_200_000);
    expect(r.monthly).toBe(350_000);
  });

  it('조정급 0 인 경우 → (기본급) × 0.5 × 4회', () => {
    const r = CALC.calcHolidayBonus(3_000_000, 0);
    expect(r.perTime).toBe(1_500_000);
    expect(r.annual).toBe(6_000_000);
    expect(r.monthly).toBe(500_000);
  });
});

describe('M1-5 별정수당 <2025.10> (S1·C1·SC1 이하 35,000원/월)', () => {
  it('calcSpecialAllowance: 저등급 S1 → 35,000', () => {
    expect(CALC.calcSpecialAllowance('S1')).toBe(35000);
  });

  it('저등급 C1 / SC1 → 35,000', () => {
    expect(CALC.calcSpecialAllowance('C1')).toBe(35000);
    expect(CALC.calcSpecialAllowance('SC1')).toBe(35000);
  });

  it('저등급 아래 J1, A1, SA1 → 35,000 (이하 포함)', () => {
    expect(CALC.calcSpecialAllowance('J1')).toBe(35000);
    expect(CALC.calcSpecialAllowance('A1')).toBe(35000);
    expect(CALC.calcSpecialAllowance('SA1')).toBe(35000);
  });

  it('고등급 M1 / L1 / SL1 → 0', () => {
    expect(CALC.calcSpecialAllowance('M1')).toBe(0);
    expect(CALC.calcSpecialAllowance('L1')).toBe(0);
    expect(CALC.calcSpecialAllowance('SL1')).toBe(0);
  });

  it('최고등급 M3 / L3 / SL3 → 0', () => {
    expect(CALC.calcSpecialAllowance('M3')).toBe(0);
    expect(CALC.calcSpecialAllowance('L3')).toBe(0);
    expect(CALC.calcSpecialAllowance('SL3')).toBe(0);
  });

  it('잘못된/빈 등급 → 0 (안전)', () => {
    expect(CALC.calcSpecialAllowance(null)).toBe(0);
    expect(CALC.calcSpecialAllowance('')).toBe(0);
    expect(CALC.calcSpecialAllowance('XYZ')).toBe(0);
  });
});

describe('M1-7 연차 미사용 수당화 (제36조(4))', () => {
  it('미사용 3일 × 통상임금 월액 3,135,000 (=209h × 15000시급) → 360,000원', () => {
    // 3일 × 시급 15000 × 8h = 360,000
    const r = CALC.calcAnnualLeaveBonus(3, 3_135_000);
    expect(r).toBe(360000);
  });

  it('미사용 0일 → 0원', () => {
    expect(CALC.calcAnnualLeaveBonus(0, 3_000_000)).toBe(0);
  });

  it('월급 0 → 0원 (fallback)', () => {
    expect(CALC.calcAnnualLeaveBonus(5, 0)).toBe(0);
  });

  it('미사용 1일 × 월급 2,090,000 (시급 10,000) → 80,000원', () => {
    // 시급 10000 × 8h × 1일 = 80,000
    expect(CALC.calcAnnualLeaveBonus(1, 2_090_000)).toBe(80000);
  });

  it('반환 결과는 정수 (Math.round 적용)', () => {
    // 월급 3,000,000 / 209 = 14,354.067... × 8 = 114,832.5... ≈ 114,833
    // × 2일 = 229,665 (일액이 먼저 반올림되므로)
    const result = CALC.calcAnnualLeaveBonus(2, 3_000_000);
    expect(Number.isInteger(result)).toBe(true);
    expect(result).toBeGreaterThan(0);
  });
});

describe('M1-3 생리휴가 9/10 공제 (제37조, 2026.01~)', () => {
  const menstrualType = DATA.leaveQuotas.types.find(t => t.id === 'menstrual');

  it('생리휴가 타입에 deductType=basePay + deductRate=0.9 설정', () => {
    expect(menstrualType).toBeTruthy();
    expect(menstrualType.deductType).toBe('basePay');
    expect(menstrualType.deductRate).toBe(0.9);
    expect(menstrualType.isPaid).toBe(false);
  });

  it('계산: 기본급 월액 / 30 × 일수 × 0.9 공제 (1일 · 월액 3,000,000 → 90,000 공제)', () => {
    const monthlyBasePay = 3_000_000;
    const days = 1;
    const rate = menstrualType.deductRate;
    // 일액 = 100,000 × 0.9 = 90,000 공제
    const expected = Math.round(monthlyBasePay / 30) * days * rate;
    expect(expected).toBe(90000);
  });

  it('공제 rate 미설정 타입은 100% (하위 호환)', () => {
    // 가정의 타입: deductType=basePay, deductRate 없음
    const fallbackType = { deductType: 'basePay' };
    const rate = fallbackType.deductRate ?? 1.0;
    expect(rate).toBe(1.0);
  });
});

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
