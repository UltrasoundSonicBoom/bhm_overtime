import { expect, test } from '@playwright/test';

const IGNORED_ERROR_PATTERNS = [
  /localhost:3001\/api\/data\/bundle/,
  /Content Security Policy directive.*connect-src/,
];

const PAYSLIP_FIXTURE = {
  metadata: {
    payPeriod: '2026년 5월',
    payslipType: '급여',
    payDate: '2026-05-25',
  },
  employeeInfo: {
    name: '테스트간호사',
    employeeNumber: 'E2E-001',
    department: '핵의학과',
    jobType: '간호',
    payGrade: 'J3-5',
    hireDate: '2020-03-01',
  },
  salaryItems: [
    { name: '조정급', amount: 10000 },
    { name: '업무보조비', amount: 20000 },
    { name: '시간외수당', amount: 123000 },
    { name: '야간근무가산금', amount: 45000 },
  ],
  deductionItems: [],
  workStats: [
    { name: '시간외근무시간', value: 4.5 },
    { name: '야간근무시간', value: 2 },
  ],
  summary: {
    grossPay: 178000,
    totalDeduction: 0,
    netPay: 178000,
  },
};

function isIgnorableError(text) {
  return IGNORED_ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

function installErrorGuard(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    const text = message.text();
    if (message.type() === 'error' && !isIgnorableError(text)) {
      errors.push(text);
    }
  });
  return errors;
}

test.describe('Payslip lifecycle', () => {
  test('visible payroll upload saves once and immediately propagates profile, overtime, and work history data', async ({ page }) => {
    const errors = installErrorGuard(page);

    await page.goto('/app?tab=payroll');
    await page.waitForFunction(() => (
      typeof window.switchTab === 'function' &&
      typeof window.loadTab === 'function' &&
      typeof window.renderPayPayslip === 'function' &&
      typeof window.SALARY_PARSER?.parseFile === 'function'
    ));

    await page.evaluate(async (fixture) => {
      localStorage.clear();
      window.SALARY_PARSER.parseFile = async () => JSON.parse(JSON.stringify(fixture));
      window.switchTab('payroll');
      await window.loadTab('payroll');
      window.renderPayPayslip();
    }, PAYSLIP_FIXTURE);

    await expect(page.locator('#payslipUploadFileInput')).toBeAttached();
    await page.locator('#payslipUploadFileInput').setInputFiles({
      name: 'mock-payslip.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('mock payroll fixture'),
    });

    await expect.poll(async () => page.evaluate(() => {
      return localStorage.getItem('payslip_guest_2026_05') !== null;
    }), { timeout: 5000 }).toBe(true);

    const state = await page.evaluate(() => {
      const readJson = (key) => JSON.parse(localStorage.getItem(key) || 'null');
      const profileKey = window.getUserStorageKey('snuhmate_hr_profile');
      const overtimeKey = window.getUserStorageKey('overtimePayslipData');
      const workHistoryKey = window.getUserStorageKey('snuhmate_work_history');
      return {
        payslip: readJson('payslip_guest_2026_05'),
        profile: readJson(profileKey),
        overtime: readJson(overtimeKey),
        workHistory: readJson(workHistoryKey),
        payslipLastEdit: localStorage.getItem('snuhmate_last_edit_payslip_guest_2026_05'),
        profileLastEdit: localStorage.getItem('snuhmate_last_edit_snuhmate_hr_profile'),
        overtimeLastEdit: localStorage.getItem('snuhmate_last_edit_overtimePayslipData'),
        workHistoryLastEdit: localStorage.getItem('snuhmate_last_edit_snuhmate_work_history'),
      };
    });

    expect(state.payslip?.employeeInfo?.department).toBe('핵의학과');
    expect(state.payslip?.salaryItems?.some((item) => item.name === '시간외수당')).toBe(true);

    expect(state.profile).toMatchObject({
      name: '테스트간호사',
      employeeNumber: 'E2E-001',
      department: '핵의학과',
      jobType: '간호직',
      grade: 'J3',
      year: 5,
      adjustPay: 10000,
      workSupportPay: 20000,
    });

    expect(state.overtime?.['2026-05']?.workStats).toEqual([
      { name: '시간외근무시간', value: 4.5 },
      { name: '야간근무시간', value: 2 },
    ]);
    expect(state.overtime?.['2026-05']?.overtimeItems).toEqual([
      { name: '시간외수당', amount: 123000 },
      { name: '야간근무가산금', amount: 45000 },
    ]);

    expect(state.workHistory).toHaveLength(1);
    expect(state.workHistory?.[0]).toMatchObject({
      dept: '핵의학과',
      from: '2020-03-01',
      to: '',
      source: 'auto',
    });

    expect(state.payslipLastEdit).toBeTruthy();
    expect(state.profileLastEdit).toBeTruthy();
    expect(state.overtimeLastEdit).toBeTruthy();
    expect(state.workHistoryLastEdit).toBeTruthy();
    expect(errors, 'console/page errors').toEqual([]);
  });
});
