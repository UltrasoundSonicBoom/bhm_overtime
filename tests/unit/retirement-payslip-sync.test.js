import { beforeEach, describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  collectPayslipMonthlyGrosses,
  getRetirementPayslipWageSource,
  shouldAutoRefreshRetirementCalc,
} from '../../apps/web/src/client/retirement-payslip-sync.js';

function fakeSalaryParser(entries) {
  return {
    listSavedMonths() {
      return entries.map(({ year, month, type }) => ({ year, month, type }));
    },
    loadMonthlyData(year, month, type) {
      const entry = entries.find(item =>
        item.year === year && item.month === month && (item.type || '급여') === (type || '급여')
      );
      if (!entry) return null;
      return { summary: { grossPay: entry.grossPay } };
    },
  };
}

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  localStorage.clear();
});

describe('retirement payslip sync helpers', () => {
  it('최근 3개 월 명세서를 월별 합산한 뒤 퇴직금 평균임금 소스로 반환한다', () => {
    const parser = fakeSalaryParser([
      { year: 2026, month: 1, type: '급여', grossPay: 3000000 },
      { year: 2026, month: 3, type: '급여', grossPay: 6000000 },
      { year: 2026, month: 2, type: '급여', grossPay: 4500000 },
      { year: 2026, month: 3, type: '성과급', grossPay: 1500000 },
      { year: 2026, month: 4, type: '급여', grossPay: 0 },
      { year: 2025, month: 12, type: '급여', grossPay: 9000000 },
    ]);

    expect(collectPayslipMonthlyGrosses(parser)).toEqual([
      { year: 2026, month: 3, grossPay: 7500000, types: ['급여', '성과급'] },
      { year: 2026, month: 2, grossPay: 4500000, types: ['급여'] },
      { year: 2026, month: 1, grossPay: 3000000, types: ['급여'] },
      { year: 2025, month: 12, grossPay: 9000000, types: ['급여'] },
    ]);

    const source = getRetirementPayslipWageSource(parser);
    expect(source.monthlyWage).toBe(5000000);
    expect(source.monthsUsed).toBe(3);
    expect(source.periodLabel).toBe('2026년 03월, 2026년 02월, 2026년 01월');
    expect(source.label).toBe('✓ 명세서 평균 (최근 3개월)');
  });

  it('명세서가 3개월 미만이어도 업로드 직후 반영할 수 있는 소스를 만든다', () => {
    const parser = fakeSalaryParser([
      { year: 2026, month: 4, type: '급여', grossPay: '6200000' },
    ]);

    const source = getRetirementPayslipWageSource(parser);
    expect(source.monthlyWage).toBe(6200000);
    expect(source.monthsUsed).toBe(1);
    expect(source.label).toBe('✓ 명세서 반영 (최근 1개월, 3개월 미만)');
  });

  it('SALARY_PARSER 저장 경로의 uid 스토리지 키도 퇴직금 임금 소스로 읽는다', async () => {
    localStorage.setItem('snuhmate_settings', JSON.stringify({ googleSub: 'uid-123' }));
    const { SALARY_PARSER } = await import('../../apps/web/src/client/salary-parser.js');

    SALARY_PARSER.saveMonthlyData(2026, 4, {
      salaryItems: [{ name: '본봉', amount: 6200000 }],
      deductionItems: [],
      employeeInfo: {},
      summary: { grossPay: 6200000, totalDeduction: 0, netPay: 6200000 },
      metadata: { payslipType: '급여' },
    }, '급여', true);

    const source = getRetirementPayslipWageSource(SALARY_PARSER);
    expect(localStorage.getItem('payslip_uid-123_2026_04')).toBeTruthy();
    expect(source.monthlyWage).toBe(6200000);
    expect(source.periodLabel).toBe('2026년 04월');
  });

  it('계산 탭의 기존 결과나 강제 갱신이 있을 때만 내 예상액을 자동 재계산한다', () => {
    expect(shouldAutoRefreshRetirementCalc({
      activeTab: 'calc',
      force: true,
      hasVisibleResult: false,
      canCalculate: true,
    })).toBe(true);
    expect(shouldAutoRefreshRetirementCalc({
      activeTab: 'calc',
      force: false,
      hasVisibleResult: true,
      canCalculate: true,
    })).toBe(true);
    expect(shouldAutoRefreshRetirementCalc({
      activeTab: 'calc',
      force: false,
      hasVisibleResult: false,
      canCalculate: true,
    })).toBe(false);
    expect(shouldAutoRefreshRetirementCalc({
      activeTab: 'peak',
      force: true,
      hasVisibleResult: true,
      canCalculate: true,
    })).toBe(false);
    expect(shouldAutoRefreshRetirementCalc({
      activeTab: 'calc',
      force: true,
      hasVisibleResult: true,
      canCalculate: false,
    })).toBe(false);
  });
});
