import { test, expect } from '@playwright/test';

test.describe('Team Plan schedules routes', () => {
  test('loads overview and operational child routes', async ({ page }) => {
    await page.goto('/team/schedules');
    await expect(page.getByRole('heading', { name: /Team Plan|팀 스케줄/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: '101 병동 5월 초안' })).toBeVisible();
    await expect(page.getByText('Angio', { exact: true })).toBeVisible();
    await expect(page.getByText(/Import/)).toBeVisible();
    await expect(page.getByText(/Validate/)).toBeVisible();
    await expect(page.getByText(/Overlay/)).toBeVisible();
    await expect(page.getByText(/Publish/)).toBeVisible();

    for (const path of ['admin', 'import', 'rules', 'approvals', 'audit', 'me', 'swaps']) {
      await page.goto(`/team/schedules/${path}`);
      await expect(page.locator('main')).toBeVisible();
    }
  });
});
