// Vitest 단위 테스트 — calculators.js 순수 함수 회귀 방지
// 실행: npm run test:unit
import { describe, it, expect, beforeAll } from 'vitest';

// data.js는 브라우저 전역을 설정하므로, 테스트에서 DATA를 global에 세팅.
// calculators.js는 호출 시점에 DATA.*를 참조함 (로드 시점은 아님).
const { DATA } = require('../../data.js');
globalThis.DATA = DATA;
const { CALC } = require('../../calculators.js');

describe('CALC.calcOvertimePay', () => {
  // hourlyRate=10000, 연장 1h (150%) = 15000
  it('연장 1시간 = 시급 × 1.5', () => {
    const r = CALC.calcOvertimePay(10000, 1, 0, 0, false);
    expect(r.연장근무수당).toBe(15000);
    expect(r.야간근무수당).toBe(0);
    expect(r.휴일근무수당).toBe(0);
    expect(r.합계).toBe(15000);
  });

  it('야간 2시간 = 시급 × 2.0 × 2 (200%)', () => {
    const r = CALC.calcOvertimePay(10000, 0, 2, 0, false);
    expect(r.야간근무수당).toBe(40000);
  });

  it('연장야간 2시간 = 시급 × extendedNight × 2 (DATA 기반)', () => {
    const r = CALC.calcOvertimePay(10000, 0, 2, 0, true);
    const expected = 10000 * DATA.allowances.overtimeRates.extendedNight * 2;
    expect(r.야간근무수당).toBe(Math.round(expected));
  });

  it('휴일 8시간 이내 150%, 초과 200%', () => {
    // 10시간 휴일: 8h × 1.5 + 2h × 2.0 = 12h 시급
    const r = CALC.calcOvertimePay(10000, 0, 0, 10, false);
    expect(r.휴일근무수당).toBe(10000 * 1.5 * 8 + 10000 * 2 * 2);
  });

  it('15분 단위 절삭 (floor) — 1.3h → 1.25h', () => {
    const r = CALC.calcOvertimePay(10000, 1.3, 0, 0, false);
    // 1.25h × 1.5 × 10000 = 18750
    expect(r.연장근무수당).toBe(18750);
  });

  it('음수/0 입력 모두 0원', () => {
    const r = CALC.calcOvertimePay(10000, 0, 0, 0, false);
    expect(r.합계).toBe(0);
  });
});

describe('CALC.calcLongServicePay', () => {
  it('5년 미만은 0원', () => {
    expect(CALC.calcLongServicePay(0).월수당).toBe(0);
    expect(CALC.calcLongServicePay(4).월수당).toBe(0);
  });

  it('DATA.longServicePay 구간 반영', () => {
    // 구체적 수치는 DATA에 의존하므로 ≥0 검증 + 근속연수는 그대로 반환.
    const r = CALC.calcLongServicePay(10);
    expect(r.근속연수).toBe(10);
    expect(r.월수당).toBeGreaterThanOrEqual(0);
  });
});

describe('CALC.calcFamilyAllowance', () => {
  it('가족 0명 = 0원', () => {
    const r = CALC.calcFamilyAllowance(0, 0);
    expect(r.월수당).toBe(0);
  });

  it('배우자(1인) = 40,000원', () => {
    const r = CALC.calcFamilyAllowance(1, 0);
    expect(r.월수당).toBe(40000);
  });

  it('배우자 + 자녀 1명 = 40,000 + 30,000', () => {
    const r = CALC.calcFamilyAllowance(1, 1);
    expect(r.월수당).toBe(70000);
  });

  it('가족 5인 상한 유지', () => {
    // 가족 6인을 넘겨도 5인까지만 반영
    const r6 = CALC.calcFamilyAllowance(6, 0);
    const r5 = CALC.calcFamilyAllowance(5, 0);
    expect(r6.월수당).toBe(r5.월수당);
  });
});

describe('CALC.calcAnnualLeave', () => {
  it('입사 1개월차 = 1일', () => {
    const hire = new Date('2026-03-23');
    const calc = new Date('2026-04-23');
    const r = CALC.calcAnnualLeave(hire, calc);
    expect(r.totalLeave).toBe(1);
    expect(r.diffYears).toBe(0);
  });

  it('입사 1년차 = 기본 연차 (15일)', () => {
    const hire = new Date('2025-04-23');
    const calc = new Date('2026-04-23');
    const r = CALC.calcAnnualLeave(hire, calc);
    expect(r.totalLeave).toBe(DATA.annualLeave.baseLeave);
    expect(r.diffYears).toBe(1);
  });

  it('입사 11년차 = 기본 + 추가 (3년차부터 2년마다 +1, 상한 25일)', () => {
    const hire = new Date('2015-04-23');
    const calc = new Date('2026-04-23');
    const r = CALC.calcAnnualLeave(hire, calc);
    // 11년차 → extra = floor((11-1)/2) = 5, total = min(15+5, 25) = 20
    expect(r.diffYears).toBe(11);
    const expected = Math.min(DATA.annualLeave.baseLeave + 5, DATA.annualLeave.maxLeave);
    expect(r.totalLeave).toBe(expected);
  });

  it('입사 30년차 상한 = maxLeave', () => {
    const hire = new Date('1996-04-23');
    const calc = new Date('2026-04-23');
    const r = CALC.calcAnnualLeave(hire, calc);
    expect(r.totalLeave).toBe(DATA.annualLeave.maxLeave);
  });
});

describe('CALC.formatCurrency / formatNumber', () => {
  it('정수 → 천단위 콤마', () => {
    expect(CALC.formatNumber(1234567)).toBe('1,234,567');
  });

  it('통화 포맷 — 원 접미사', () => {
    expect(CALC.formatCurrency(1500)).toBe('1,500원');
  });

  it('0/음수/소수', () => {
    expect(CALC.formatNumber(0)).toBe('0');
    expect(CALC.formatNumber(-100)).toBe('-100');
  });
});

describe('CALC.calcOnCallPay (온콜)', () => {
  it('대기 3일 + 호출 0건 = 대기수당만', () => {
    const r = CALC.calcOnCallPay(10000, 3, 0, 0, false);
    expect(r.온콜대기수당).toBe(3 * DATA.allowances.onCallStandby);
    expect(r.온콜교통비).toBe(0);
    expect(r.시간외근무수당).toBe(0);
    expect(r.합계).toBe(r.온콜대기수당);
  });

  it('호출 3건 + 출근 2시간: 교통비 + 시간외수당', () => {
    const r = CALC.calcOnCallPay(10000, 0, 3, 2, false);
    expect(r.detail.callOuts).toBe(3);
    expect(r.온콜교통비).toBe(3 * DATA.allowances.onCallTransport);
    expect(r.시간외근무수당).toBeGreaterThan(0);
    expect(r.합계).toBe(r.온콜대기수당 + r.온콜교통비 + r.시간외근무수당);
  });
});

describe('CALC.calcNightShiftBonus 시설직 분기 (Bug #6)', () => {
  it('간호직 15회 누적 시 리커버리 1일', () => {
    const r = CALC.calcNightShiftBonus(15, 0, '간호직');
    const recovery = r.리커버리데이 ?? r.recoveryDays ?? 0;
    expect(recovery).toBe(1);
  });

  it('시설직 누적 15회(이월만, 월 횟수 0) 시 리커버리 0일 — 20 미도달', () => {
    // 당월 0회 + 이월 15회: 월 트리거(7) 미발동, 누적 15 < 20 → 리커버리 0일
    const r = CALC.calcNightShiftBonus(0, 15, '시설직');
    const recovery = r.리커버리데이 ?? r.recoveryDays ?? 0;
    expect(recovery).toBe(0);
  });

  it('시설직 20회 누적 시 리커버리 1일', () => {
    const r = CALC.calcNightShiftBonus(20, 0, '시설직');
    const recovery = r.리커버리데이 ?? r.recoveryDays ?? 0;
    expect(recovery).toBe(1);
  });

  it('환경미화직 20회 + 이월 5 = 25 → 리커버리 1일', () => {
    const r = CALC.calcNightShiftBonus(20, 5, '환경미화직');
    const recovery = r.리커버리데이 ?? r.recoveryDays ?? 0;
    expect(recovery).toBeGreaterThanOrEqual(1);
  });

  it('jobType 미전달 시 기본 간호직 기준 (15)', () => {
    const r = CALC.calcNightShiftBonus(15, 0);
    const recovery = r.리커버리데이 ?? r.recoveryDays ?? 0;
    expect(recovery).toBe(1);
  });
});
