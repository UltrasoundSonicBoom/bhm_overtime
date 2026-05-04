// 단협 제33조(2)(4) — 시간외 탭에 휴게시간 미사용분 안내 카드 노출
// Plan dazzling-booping-kettle Task A5
import { test, expect } from '@playwright/test';

const IGNORED = [
  /localhost:3001\/api\/data\/bundle/,
  /Content Security Policy directive.*connect-src/,
  /504.*Outdated Optimize Dep/,
  /Failed to load resource.*504/,
  /Failed to fetch dynamically imported module/,
];
const isIgnorable = (m) => IGNORED.some((r) => r.test(m));

test('시간외 탭 — 휴게시간 미사용분 안내 카드 (제33조2·4)', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => { if (!isIgnorable(e.message)) errors.push(e.message); });
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !isIgnorable(msg.text())) errors.push(msg.text());
  });

  await page.goto('/app');
  await page.waitForFunction(() => typeof window.switchTab === 'function');

  await page.evaluate(async () => {
    window.switchTab('overtime');
    try { await window.loadTab('overtime'); } catch {}
  });

  const card = page.locator('[data-test="rest-time-notice"]');
  await expect(card).toBeVisible();
  await expect(card).toContainText('단협 제33조');
  await expect(card).toContainText('시간외수당');
  expect(errors).toEqual([]);
});
