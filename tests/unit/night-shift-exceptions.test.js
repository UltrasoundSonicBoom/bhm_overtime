// 단협 제32조(8)·제38조(6) — 야간금지 예외
// Plan dazzling-booping-kettle Task A4
import { describe, it, expect } from 'vitest';
import { CALC } from '../../packages/calculators/src/index.js';

describe('calcNightShiftBonus — 야간금지 예외 (제32조8·제38조6)', () => {
  it('40세 이상 간호직 야간 미배치 원칙 — bonus 0 + age_40_nurse_night_block warning', () => {
    const r = CALC.calcNightShiftBonus(5, 0, '간호직', {
      birthDate: '1983-01-01',
      referenceDate: '2026-05-04', // 만 43세
    });
    expect(r.야간근무가산금).toBe(0);
    expect(r.리커버리데이).toBe(0);
    expect(r.warnings).toContain('age_40_nurse_night_block');
    expect(r.policyHits[0].rule).toBe('제32조(8)');
  });

  it('40세 미만 간호직 — 게이트 미적용, 정상 계산', () => {
    const r = CALC.calcNightShiftBonus(5, 0, '간호직', {
      birthDate: '1995-01-01',
      referenceDate: '2026-05-04', // 만 31세
    });
    expect(r.야간근무가산금).toBe(50000); // 5 × 10,000
    expect(r.warnings).toEqual([]);
    expect(r.policyHits).toEqual([]);
  });

  it('40세 이상이지만 간호직이 아니면 게이트 미적용 (시설직)', () => {
    const r = CALC.calcNightShiftBonus(5, 0, '시설직', {
      birthDate: '1980-01-01',
      referenceDate: '2026-05-04', // 만 46세
    });
    expect(r.야간근무가산금).toBe(50000);
    expect(r.warnings).toEqual([]);
  });

  it('산후 1년 미만 산부 — bonus 0 + postpartum_night_block warning (제38조6)', () => {
    const r = CALC.calcNightShiftBonus(5, 0, '간호직', {
      postpartumMonthsElapsed: 8,
    });
    expect(r.야간근무가산금).toBe(0);
    expect(r.warnings).toContain('postpartum_night_block');
  });

  it('산후 12개월 이상 — 게이트 미적용', () => {
    const r = CALC.calcNightShiftBonus(5, 0, '간호직', {
      postpartumMonthsElapsed: 13,
    });
    expect(r.야간근무가산금).toBe(50000);
    expect(r.warnings).toEqual([]);
  });

  it('임신부 — bonus 0 + pregnancy_night_block warning (제38조6)', () => {
    const r = CALC.calcNightShiftBonus(3, 0, '간호직', { pregnancy: true });
    expect(r.야간근무가산금).toBe(0);
    expect(r.warnings).toContain('pregnancy_night_block');
  });

  it('opts 미전달 (positional 3 args) — 기존 동작 회귀', () => {
    const r = CALC.calcNightShiftBonus(15, 0, '간호직');
    expect(r.야간근무가산금).toBe(150000);
    expect(r.리커버리데이).toBeGreaterThan(0);
    expect(r.warnings).toEqual([]);
  });

  it('여러 게이트 동시 적중 시 모든 warning 누적', () => {
    const r = CALC.calcNightShiftBonus(5, 0, '간호직', {
      birthDate: '1983-01-01',
      referenceDate: '2026-05-04',
      pregnancy: true,
      postpartumMonthsElapsed: 5,
    });
    expect(r.야간근무가산금).toBe(0);
    expect(r.warnings).toEqual(
      expect.arrayContaining([
        'pregnancy_night_block',
        'postpartum_night_block',
        'age_40_nurse_night_block',
      ])
    );
    expect(r.policyHits.length).toBe(3);
  });
});
