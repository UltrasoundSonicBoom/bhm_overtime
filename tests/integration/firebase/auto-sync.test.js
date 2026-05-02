import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

const mockWriteProfile = vi.fn();
const mockWriteOvertimeMonth = vi.fn();
const mockWriteLeaveYear = vi.fn();
const mockWritePayslip = vi.fn();
const mockWriteAllPayslips = vi.fn();
const mockWriteAllWorkHistory = vi.fn();
const mockWriteSettings = vi.fn();
const mockWriteManualHourly = vi.fn();
const mockWriteFavorites = vi.fn();

vi.mock('/src/firebase/sync/profile-sync.js', () => ({ writeProfile: mockWriteProfile }));
vi.mock('/src/firebase/sync/overtime-sync.js', () => ({ writeOvertimeMonth: mockWriteOvertimeMonth }));
vi.mock('/src/firebase/sync/leave-sync.js', () => ({ writeLeaveYear: mockWriteLeaveYear }));
vi.mock('/src/firebase/sync/payslip-sync.js', () => ({
  writePayslip: mockWritePayslip,
  writeAllPayslips: mockWriteAllPayslips,
}));
vi.mock('/src/firebase/sync/work-history-sync.js', () => ({ writeAllWorkHistory: mockWriteAllWorkHistory }));
vi.mock('/src/firebase/sync/settings-sync.js', () => ({
  writeSettings: mockWriteSettings,
  writeManualHourly: mockWriteManualHourly,
}));
vi.mock('/src/firebase/sync/favorites-sync.js', () => ({ writeFavorites: mockWriteFavorites }));

beforeAll(async () => {
  const dom = new JSDOM('<!DOCTYPE html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  await import('../../../apps/web/src/firebase/auto-sync.js');
});

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  window.__firebaseUid = 'uid_1';
  vi.clearAllMocks();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

async function flushDebounce() {
  await vi.advanceTimersByTimeAsync(250);
  await Promise.resolve();
  await Promise.resolve();
}

describe('auto-sync — missing sync keys regression guards', () => {
  it('syncs otManualHourly through profile/payroll manualHourly', async () => {
    localStorage.setItem('otManualHourly_uid_uid_1', '17500');
    window.dispatchEvent(new CustomEvent('app:local-edit', { detail: { base: 'otManualHourly' } }));

    await flushDebounce();

    expect(mockWriteManualHourly).toHaveBeenCalledWith(null, 'uid_1', 17500);
  });

  it('syncs overtimePayslipData through payslip collection', async () => {
    const all = { '2026-04': { hourlyRate: 17000, workStats: [] } };
    localStorage.setItem('overtimePayslipData_uid_uid_1', JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('app:local-edit', { detail: { base: 'overtimePayslipData' } }));

    await flushDebounce();

    expect(mockWriteAllPayslips).toHaveBeenCalledWith(null, 'uid_1', all, 'overtimePayslipData');
  });

  it('parses typed payslip keys even when uid contains underscores', async () => {
    const data = { summary: { grossPay: 5000000 } };
    localStorage.setItem('payslip_uid_1_2026_04_상여', JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('app:local-edit', { detail: { base: 'payslip_uid_1_2026_04_상여' } }));

    await flushDebounce();

    expect(mockWritePayslip).toHaveBeenCalledWith(null, 'uid_1', '2026-04', data, undefined, '상여');
  });
});
