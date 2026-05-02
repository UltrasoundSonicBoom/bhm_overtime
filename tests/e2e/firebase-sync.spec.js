import { test, expect } from '@playwright/test';

const IGNORED_ERROR_PATTERNS = [
  /localhost:3001\/api\/data\/bundle/,
  /Content Security Policy directive.*connect-src/,
];

function isIgnorableError(text) {
  return IGNORED_ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

test.describe('Firebase sync readiness', () => {
  test('guest mode survives local schedule data and exposes sync controls', async ({ page }) => {
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
      if (/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com/.test(request.url())) {
        liveFirebaseRequests.push(request.url());
      }
    });

    await page.addInitScript(() => {
      localStorage.setItem('snuhmate_schedule_records', JSON.stringify({
        '2026-05': {
          mine: { 1: 'D', 2: 'N' },
          team: { '테스트 동료': { 1: 'E' } },
          lastEditAt: 1777593600000,
          sourceFile: 'playwright-readiness-fixture',
        },
      }));
    });

    await page.goto('/app?tab=settings');
    await page.waitForFunction(() => (
      typeof window.switchTab === 'function' &&
      typeof window.loadTab === 'function'
    ));

    await page.evaluate(async () => {
      window.switchTab('settings');
      await window.loadTab('settings');
    });

    await expect(page.locator('#tab-settings')).toHaveClass(/active/);
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
});
