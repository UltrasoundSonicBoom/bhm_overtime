// Phase 8 — migration-dialog 검증
//
// 검증:
//   1. shouldShowMigration: uid 없으면 false
//   2. shouldShowMigration: FLAG 있으면 false (idempotent)
//   3. shouldShowMigration: 게스트 데이터 있으면 true
//   4. uploadCategories: 선택 카테고리만 sync 모듈 호출
//   5. uploadCategories: FLAG_KEY 설정
//   6. 두 번째 호출 → shouldShowMigration false (idempotency)

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

const mockWriteProfile = vi.fn();
const mockWriteAllOvertime = vi.fn();
const mockWriteAllLeave = vi.fn();
const mockWriteAllWorkHistory = vi.fn();
const mockWriteSettings = vi.fn();
const mockWriteManualHourly = vi.fn();
const mockWriteFavorites = vi.fn();
const mockWritePayslip = vi.fn();
const mockWriteAllPayslips = vi.fn();

vi.mock('/src/firebase/sync/profile-sync.js', () => ({ writeProfile: mockWriteProfile }));
vi.mock('/src/firebase/sync/overtime-sync.js', () => ({ writeAllOvertime: mockWriteAllOvertime }));
vi.mock('/src/firebase/sync/leave-sync.js', () => ({ writeAllLeave: mockWriteAllLeave }));
vi.mock('/src/firebase/sync/work-history-sync.js', () => ({ writeAllWorkHistory: mockWriteAllWorkHistory }));
vi.mock('/src/firebase/sync/settings-sync.js', () => ({
  writeSettings: mockWriteSettings,
  writeManualHourly: mockWriteManualHourly,
}));
vi.mock('/src/firebase/sync/favorites-sync.js', () => ({ writeFavorites: mockWriteFavorites }));
vi.mock('/src/firebase/sync/payslip-sync.js', () => ({
  writePayslip: mockWritePayslip,
  writeAllPayslips: mockWriteAllPayslips,
}));

beforeAll(async () => {
  const dom = new JSDOM('<!DOCTYPE html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
});

beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
  mockWriteProfile.mockResolvedValue();
  mockWriteAllOvertime.mockResolvedValue();
  mockWriteAllLeave.mockResolvedValue();
  mockWriteAllWorkHistory.mockResolvedValue();
  mockWriteSettings.mockResolvedValue();
  mockWriteManualHourly.mockResolvedValue();
  mockWriteFavorites.mockResolvedValue();
  mockWritePayslip.mockResolvedValue();
  mockWriteAllPayslips.mockResolvedValue();
});

describe('shouldShowMigration', () => {
  it('uid 없으면 false', async () => {
    const { shouldShowMigration } = await import('../../../apps/web/src/firebase/migration-dialog.js');
    expect(await shouldShowMigration(null)).toBe(false);
    expect(await shouldShowMigration('')).toBe(false);
  });

  it('게스트 데이터 없으면 false', async () => {
    const { shouldShowMigration } = await import('../../../apps/web/src/firebase/migration-dialog.js');
    expect(await shouldShowMigration('uid1')).toBe(false);
  });

  it('게스트 프로필 데이터 있으면 true', async () => {
    localStorage.setItem('snuhmate_hr_profile_guest', JSON.stringify({ name: '테스트', hourlyWage: 12000 }));
    const { shouldShowMigration } = await import('../../../apps/web/src/firebase/migration-dialog.js');
    expect(await shouldShowMigration('uid1')).toBe(true);
  });

  it('FLAG 있으면 false (idempotent)', async () => {
    localStorage.setItem('snuhmate_hr_profile_guest', JSON.stringify({ name: '테스트' }));
    localStorage.setItem('snuhmate_migration_done_v1', new Date().toISOString());
    const { shouldShowMigration } = await import('../../../apps/web/src/firebase/migration-dialog.js');
    expect(await shouldShowMigration('uid1')).toBe(false);
  });
});

describe('uploadCategories', () => {
  it('identity 선택 → writeProfile 호출', async () => {
    const profile = { name: '김간호', hourlyWage: 15000 };
    localStorage.setItem('snuhmate_hr_profile_guest', JSON.stringify(profile));
    const { uploadCategories } = await import('../../../apps/web/src/firebase/migration-dialog.js');
    await uploadCategories('uid1', ['identity']);
    expect(mockWriteProfile).toHaveBeenCalled();
    const [, uidArg] = mockWriteProfile.mock.calls[0];
    expect(uidArg).toBe('uid1');
  });

  it('overtime 선택 → writeAllOvertime 호출', async () => {
    const data = { '2026-04': [{ id: 'ot1', totalHours: 3 }] };
    localStorage.setItem('overtimeRecords_guest', JSON.stringify(data));
    const { uploadCategories } = await import('../../../apps/web/src/firebase/migration-dialog.js');
    await uploadCategories('uid1', ['overtime']);
    expect(mockWriteAllOvertime).toHaveBeenCalled();
  });

  it('미선택 카테고리 sync 호출 0', async () => {
    localStorage.setItem('overtimeRecords_guest', JSON.stringify({ '2026-04': [] }));
    const { uploadCategories } = await import('../../../apps/web/src/firebase/migration-dialog.js');
    await uploadCategories('uid1', ['identity']);
    expect(mockWriteAllOvertime).not.toHaveBeenCalled();
  });

  it('uploadCategories 후 FLAG_KEY 설정 → shouldShowMigration false', async () => {
    localStorage.setItem('snuhmate_hr_profile_guest', JSON.stringify({ name: 'X' }));
    const { uploadCategories, shouldShowMigration } =
      await import('../../../apps/web/src/firebase/migration-dialog.js');
    await uploadCategories('uid1', ['identity']);
    expect(localStorage.getItem('snuhmate_migration_done_v1')).toBeTruthy();
    expect(await shouldShowMigration('uid1')).toBe(false);
  });

  it('payroll 선택 → 수동 시급과 typed 급여명세서도 동기화', async () => {
    localStorage.setItem('otManualHourly_guest', '17500');
    localStorage.setItem('payslip_guest_2026_04_상여', JSON.stringify({ summary: { grossPay: 7000000 } }));

    const { uploadCategories } = await import('../../../apps/web/src/firebase/migration-dialog.js');
    await uploadCategories('uid1', ['payroll']);

    expect(mockWriteManualHourly).toHaveBeenCalledWith(null, 'uid1', 17500);
    expect(mockWritePayslip).toHaveBeenCalledWith(
      null,
      'uid1',
      '2026-04',
      { summary: { grossPay: 7000000 } },
      undefined,
      '상여'
    );
  });

  it('빈 카테고리 배열 → sync 호출 0 + FLAG 설정', async () => {
    const { uploadCategories } = await import('../../../apps/web/src/firebase/migration-dialog.js');
    await uploadCategories('uid1', []);
    expect(mockWriteProfile).not.toHaveBeenCalled();
    expect(localStorage.getItem('snuhmate_migration_done_v1')).toBeTruthy();
  });
});
