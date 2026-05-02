import { test, expect } from '@playwright/test';

const IGNORED_ERROR_PATTERNS = [
  /localhost:3001\/api\/data\/bundle/,
  /Content Security Policy directive.*connect-src/,
];

const FIREBASE_LIVE_ENDPOINT_RE = /firestore\.googleapis\.com|identitytoolkit\.googleapis\.com/;

const SCHEDULE_FIXTURE = {
  '2026-05': {
    mine: { 1: 'D', 2: 'N' },
    team: { '테스트 동료': { 1: 'E' } },
    lastEditAt: 1777593600000,
    sourceFile: 'playwright-readiness-fixture',
  },
};

const SENSITIVE_FIXTURES = {
  snuhmate_hr_profile_guest: {
    name: '로컬게스트',
    employeeId: 'PW-LOCAL-001',
    department: '보안운영',
    hireDate: '2020-03-01',
  },
  overtimeRecords_guest: {
    '2026-05': [{ id: 'ot-local-1', date: '2026-05-02', hours: 2.5, reason: 'local fixture' }],
  },
  leaveRecords: {
    2026: [{ id: 'leave-local-1', type: 'annual', date: '2026-05-03', days: 1 }],
  },
  payslip_guest_2026_05: {
    employeeId: 'PW-LOCAL-001',
    payMonth: '2026-05',
    netPay: 1234567,
  },
  snuhmate_settings: {
    pinHash: 'playwright-local-pin-hash',
    googleEmail: 'guest-only@example.invalid',
    displayName: '로컬 게스트',
  },
};

function isIgnorableError(text) {
  return IGNORED_ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

function installReadinessGuards(page) {
  const errors = [];
  const liveFirebaseRequests = [];

  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    const text = message.text();
    if (message.type() === 'error' && !isIgnorableError(text)) {
      errors.push(text);
    }
  });
  page.on('request', (request) => {
    if (FIREBASE_LIVE_ENDPOINT_RE.test(request.url())) {
      liveFirebaseRequests.push(request.url());
    }
  });

  return { errors, liveFirebaseRequests };
}

async function waitForAppShell(page) {
  await page.waitForFunction(() => (
    typeof window.switchTab === 'function' &&
    typeof window.loadTab === 'function' &&
    typeof window.getUserStorageKey === 'function'
  ));
}

async function openTab(page, tabName) {
  await page.evaluate(async (tab) => {
    window.switchTab(tab);
    await window.loadTab(tab);
  }, tabName);
  await expect(page.locator(`#tab-${tabName}`)).toHaveClass(/active/);
}

test.describe('Firebase sync readiness', () => {
  test('guest mode survives local schedule data and exposes sync controls', async ({ page }) => {
    const { errors, liveFirebaseRequests } = installReadinessGuards(page);

    await page.addInitScript((schedule) => {
      localStorage.setItem('snuhmate_schedule_records', JSON.stringify(schedule));
    }, SCHEDULE_FIXTURE);

    await page.goto('/app?tab=settings');
    await waitForAppShell(page);
    await openTab(page, 'settings');
    await expect(page.locator('#snuhmateAuthCard')).toBeVisible();
    await expect(page.locator('#snuhmateAuthPill')).toContainText(/로그인/);
    await expect(page.getByText(/다기기 동기화|클라우드 백업|로그인 안 해도 100% 사용/)).toBeVisible();

    const readiness = await page.evaluate(async () => {
      const schedule = JSON.parse(localStorage.getItem('snuhmate_schedule_records') || '{}');
      const migration = await import('/src/firebase/migration-dialog.js');
      const scheduleSync = await import('/src/firebase/sync/schedule-sync.js');

      return {
        seededDuty: schedule?.['2026-05']?.mine?.['1'],
        seededTeamDuty: schedule?.['2026-05']?.team?.['테스트 동료']?.['1'],
        migrationLoaded: typeof migration.shouldShowMigration === 'function',
        scheduleSyncLoaded: (
          typeof scheduleSync.writeScheduleMonth === 'function' &&
          typeof scheduleSync.readScheduleMonth === 'function'
        ),
        firebaseUid: window.__firebaseUid || null,
      };
    });

    expect(readiness).toEqual({
      seededDuty: 'D',
      seededTeamDuty: 'E',
      migrationLoaded: true,
      scheduleSyncLoaded: true,
      firebaseUid: null,
    });
    expect(liveFirebaseRequests, 'no live Firebase Auth/Firestore requests in readiness test').toEqual([]);
    expect(errors, 'page errors').toEqual([]);
  });

  test('local sensitive fixtures stay intact across tab navigation in guest readiness mode', async ({ page }) => {
    const { errors, liveFirebaseRequests } = installReadinessGuards(page);

    await page.addInitScript(({ schedule, sensitive }) => {
      localStorage.setItem('snuhmate_schedule_records', JSON.stringify(schedule));
      for (const [key, value] of Object.entries(sensitive)) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    }, { schedule: SCHEDULE_FIXTURE, sensitive: SENSITIVE_FIXTURES });

    await page.goto('/app?tab=settings');
    await waitForAppShell(page);

    for (const tab of ['schedule', 'profile', 'payroll', 'settings']) {
      await openTab(page, tab);
    }

    const persisted = await page.evaluate(() => {
      const readJson = (key) => JSON.parse(localStorage.getItem(key) || 'null');
      return {
        profileEmployeeId: readJson('snuhmate_hr_profile_guest')?.employeeId,
        overtimeId: readJson('overtimeRecords_guest')?.['2026-05']?.[0]?.id,
        leaveId: readJson('leaveRecords')?.['2026']?.[0]?.id,
        payslipNetPay: readJson('payslip_guest_2026_05')?.netPay,
        settingsPinHash: readJson('snuhmate_settings')?.pinHash,
        scheduleDuty: readJson('snuhmate_schedule_records')?.['2026-05']?.mine?.['1'],
      };
    });

    expect(persisted).toEqual({
      profileEmployeeId: 'PW-LOCAL-001',
      overtimeId: 'ot-local-1',
      leaveId: 'leave-local-1',
      payslipNetPay: 1234567,
      settingsPinHash: 'playwright-local-pin-hash',
      scheduleDuty: 'D',
    });
    expect(liveFirebaseRequests, 'tab navigation must not call live Firebase endpoints').toEqual([]);
    expect(errors, 'page errors').toEqual([]);
  });

  test('simulated auth state scopes localStorage keys without live credentials', async ({ page }) => {
    const { errors, liveFirebaseRequests } = installReadinessGuards(page);

    await page.goto('/app?tab=settings');
    await waitForAppShell(page);

    const scoped = await page.evaluate(() => {
      const guestKey = window.getUserStorageKey('snuhmate_hr_profile');
      localStorage.setItem(guestKey, JSON.stringify({ employeeId: 'guest-scope', department: 'local' }));

      window.__firebaseUid = 'playwright-user-1';
      window.dispatchEvent(new CustomEvent('app:auth-changed', {
        detail: { user: { uid: 'playwright-user-1', email: 'playwright@example.invalid' } },
      }));

      const uidKey = window.getUserStorageKey('snuhmate_hr_profile');
      localStorage.setItem(uidKey, JSON.stringify({ employeeId: 'uid-scope', department: 'cloud mirror' }));
      window.recordLocalEdit('snuhmate_hr_profile');

      const guestProfileBeforeLogout = JSON.parse(localStorage.getItem(guestKey) || 'null');
      const uidProfileBeforeLogout = JSON.parse(localStorage.getItem(uidKey) || 'null');

      delete window.__firebaseUid;
      window.dispatchEvent(new CustomEvent('app:auth-changed', { detail: { user: null } }));

      return {
        guestKey,
        uidKey,
        postLogoutKey: window.getUserStorageKey('snuhmate_hr_profile'),
        guestEmployeeId: guestProfileBeforeLogout?.employeeId,
        uidEmployeeId: uidProfileBeforeLogout?.employeeId,
        uidStillPresent: localStorage.getItem(uidKey) !== null,
        lastEditPresent: localStorage.getItem('snuhmate_last_edit_snuhmate_hr_profile') !== null,
      };
    });

    expect(scoped).toEqual({
      guestKey: 'snuhmate_hr_profile_guest',
      uidKey: 'snuhmate_hr_profile_uid_playwright-user-1',
      postLogoutKey: 'snuhmate_hr_profile_guest',
      guestEmployeeId: 'guest-scope',
      uidEmployeeId: 'uid-scope',
      uidStillPresent: true,
      lastEditPresent: true,
    });
    expect(liveFirebaseRequests, 'simulated auth scoping must not call live Firebase endpoints').toEqual([]);
    expect(errors, 'page errors').toEqual([]);
  });
});
