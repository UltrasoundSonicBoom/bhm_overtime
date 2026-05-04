// 단협 제52조(4)·제53조(2) — 만60세 직전 평균임금 보호
// Plan dazzling-booping-kettle Task A2
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DATA } from '../../packages/data/src/index.js';

describe('RetirementEngine.peakWageGuard', () => {
  let RetirementEngine;
  const originalWindow = globalThis.window;

  beforeAll(async () => {
    globalThis.window = { DATA };
    ({ RetirementEngine } = await import('../../packages/calculators/src/retirement-engine.js'));
  });

  afterAll(() => {
    globalThis.window = originalWindow;
  });

  it('만60세 이후 퇴직 + 입력 wage < peakWage → peakWage 로 잠금', () => {
    const r = RetirementEngine.peakWageGuard({
      birthDate: '1965-06-15',
      retireDate: '2027-12-31',
      wage: 4500000,
      peakWage: 5800000,
    });
    expect(r.protectedWage).toBe(5800000);
    expect(r.applied).toBe(true);
    expect(r.reason).toBe('peak_wage_protection');
  });

  it('만60세 이전 퇴직 → 입력 wage 그대로 (보호 미적용)', () => {
    const r = RetirementEngine.peakWageGuard({
      birthDate: '1965-06-15',
      retireDate: '2024-12-31',
      wage: 4500000,
      peakWage: 5000000,
    });
    expect(r.protectedWage).toBe(4500000);
    expect(r.applied).toBe(false);
    expect(r.reason).toBe('before_age60');
  });

  it('만60세 도달일 동일 — wage > peakWage 이면 wage 유지', () => {
    const r = RetirementEngine.peakWageGuard({
      birthDate: '1965-06-15',
      retireDate: '2025-06-15',
      wage: 6000000,
      peakWage: 5800000,
    });
    expect(r.protectedWage).toBe(6000000);
    expect(r.applied).toBe(false);
    expect(r.reason).toBe('no_peak_wage_lower');
  });

  it('잘못된 birthDate → invalid_input 반환', () => {
    const r = RetirementEngine.peakWageGuard({
      birthDate: 'not-a-date',
      retireDate: '2027-12-31',
      wage: 4500000,
      peakWage: 5800000,
    });
    expect(r.applied).toBe(false);
    expect(r.reason).toBe('invalid_input');
  });

  it('peakWage 누락 → 보호 미적용 (no_peak_wage_lower)', () => {
    const r = RetirementEngine.peakWageGuard({
      birthDate: '1965-06-15',
      retireDate: '2027-12-31',
      wage: 4500000,
    });
    expect(r.protectedWage).toBe(4500000);
    expect(r.applied).toBe(false);
  });
});
