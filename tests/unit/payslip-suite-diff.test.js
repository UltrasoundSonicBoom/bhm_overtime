import { describe, it, expect } from 'vitest';
import { comparePayslipToSuite } from '../../packages/calculators/src/payslip-suite-diff.js';

describe('comparePayslipToSuite', () => {
  it('정확히 일치하면 match=true, missing=[]', () => {
    const r = comparePayslipToSuite({ extHours: 5, nightHours: 8, holidayHours: 0, payMonth: '2026-04' }, 13);
    expect(r.match).toBe(true);
    expect(r.diff).toBe(0);
    expect(r.missing).toEqual([]);
  });

  it('15분 미만 차이는 일치 (TOLERANCE_HOURS)', () => {
    const r = comparePayslipToSuite({ extHours: 5.1, nightHours: 0, holidayHours: 0 }, 5);
    expect(r.match).toBe(true);
  });

  it('명세서 > suite → missing 사유 기록', () => {
    const r = comparePayslipToSuite({ extHours: 5, nightHours: 8, holidayHours: 4, payMonth: '2026-04' }, 9);
    expect(r.match).toBe(false);
    expect(r.diff).toBe(8);
    expect(r.missing.length).toBeGreaterThan(0);
    expect(r.missing.some(m => m.includes('야간'))).toBe(true);
  });

  it('suite > 명세서 (수당 미지급 의심) — missing 비어있음 (역방향)', () => {
    const r = comparePayslipToSuite({ extHours: 2, nightHours: 0, holidayHours: 0 }, 10);
    expect(r.match).toBe(false);
    expect(r.diff).toBeLessThan(0);
    expect(r.missing).toEqual([]);
  });

  it('빈 입력은 0/0 일치', () => {
    const r = comparePayslipToSuite(null, 0);
    expect(r.match).toBe(true);
  });
});
