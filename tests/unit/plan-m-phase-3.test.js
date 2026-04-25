// Plan M Phase 3 (잔여) — M3-4/5/6 단위 테스트
// 실행: npm run test:unit -- plan-m-phase-3
import { describe, it, expect } from 'vitest';

const { DATA } = require('../../data.js');
globalThis.DATA = DATA;
const { CALC } = require('../../calculators.js');

describe('M3-4 예비간호인력 대체근무가산금 (<2022.12>)', () => {
  it('DATA.allowances.nurseSubstituteBonus = 20,000원/일', () => {
    expect(DATA.allowances.nurseSubstituteBonus).toBe(20000);
  });

  it('calcNurseSubstituteBonus(0): 0원', () => {
    expect(CALC.calcNurseSubstituteBonus(0)).toBe(0);
  });

  it('calcNurseSubstituteBonus(5): 100,000원 (5일 × 2만)', () => {
    expect(CALC.calcNurseSubstituteBonus(5)).toBe(100000);
  });

  it('null/음수 → 0 (방어)', () => {
    expect(CALC.calcNurseSubstituteBonus(null)).toBe(0);
    expect(CALC.calcNurseSubstituteBonus(-1)).toBe(0);
  });
});

describe('M3-5 감정노동 특별휴가 (제31조의2 <2020.10>)', () => {
  it('leaveQuotas.types 에 emotional_labor 항목 존재', () => {
    const t = DATA.leaveQuotas.types.find(x => x.id === 'emotional_labor');
    expect(t).toBeTruthy();
    expect(t.label).toBe('감정노동 특별휴가');
    expect(t.quota).toBe(2);
    expect(t.isPaid).toBe(true);
  });
});

describe('M3-6 A1 경력수당 (<2022.01>)', () => {
  it('DATA.allowances.a1Career: yearlyAmount=120000, monthly=10000', () => {
    expect(DATA.allowances.a1Career).toBeTruthy();
    expect(DATA.allowances.a1Career.yearlyAmount).toBe(120000);
    expect(DATA.allowances.a1Career.monthlyAmount).toBe(10000);
    expect(DATA.allowances.a1Career.eligibleGrades).toContain('A1');
    expect(DATA.allowances.a1Career.eligibleGrades).toContain('A2');
  });

  it('calcA1CareerAllowance(A1, 1년): 10,000원/월 (= 120k/12)', () => {
    expect(CALC.calcA1CareerAllowance('A1', 1)).toBe(10000);
  });

  it('calcA1CareerAllowance(A2, 3년): 10,000원/월 (월할 1년분만)', () => {
    // 경력 1년 기준 — 추가 연차에 따라 누적 산정 안 함 (단가 고정)
    expect(CALC.calcA1CareerAllowance('A2', 3)).toBe(10000);
  });

  it('A1 미달 (1년 미만): 월할 — 6개월 → 5,000원', () => {
    // monthly = 10000 × (months/12), 6개월 → 5000
    expect(CALC.calcA1CareerAllowance('A1', 0.5)).toBe(5000);
  });

  it('대상 등급 외 (M1/L1/SL1): 0', () => {
    expect(CALC.calcA1CareerAllowance('M1', 5)).toBe(0);
    expect(CALC.calcA1CareerAllowance('L1', 5)).toBe(0);
    expect(CALC.calcA1CareerAllowance('SL1', 5)).toBe(0);
  });

  it('null/잘못된 등급 → 0', () => {
    expect(CALC.calcA1CareerAllowance(null, 1)).toBe(0);
    expect(CALC.calcA1CareerAllowance('XYZ', 1)).toBe(0);
  });
});
