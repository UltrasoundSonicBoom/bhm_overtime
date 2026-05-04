// 단협 제24조 — 정년퇴직 hero 카드에 12월 31일 표시 검증
// Plan dazzling-booping-kettle Task A1
import { test, expect } from '@playwright/test';

const IGNORED = [
  /localhost:3001\/api\/data\/bundle/,
  /Content Security Policy directive.*connect-src/,
  /504.*Outdated Optimize Dep/,
  /Failed to load resource.*504/,
  /Failed to fetch dynamically imported module/,
];
const isIgnorable = (m) => IGNORED.some((r) => r.test(m));

test('정년퇴직 D-day 카드 — 생년월일 입력 시 YYYY.12.31 가시화 (제24조)', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => { if (!isIgnorable(e.message)) errors.push(e.message); });
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !isIgnorable(msg.text())) errors.push(msg.text());
  });

  await page.goto('/app');
  await page.waitForFunction(() => typeof window.switchTab === 'function');

  // payroll 탭 로드
  await page.evaluate(async () => {
    window.switchTab('payroll');
    try { await window.loadTab('payroll'); } catch {}
  });

  // pay-retirement 서브탭 클릭 → 수동 입력 모드 토글
  await page.locator('.pay-bookmark-tab[data-subtab="pay-retirement"]').click();
  await page.waitForSelector('#retModeManualBtn', { timeout: 5000 });
  await page.locator('#retModeManualBtn').click();
  await page.waitForFunction(() => {
    const el = document.getElementById('retBirthDate');
    return el && el.offsetParent !== null;
  }, { timeout: 5000 });

  // 생년월일 입력 → input 이벤트 → retUpdateQuickDates() 가 D-day 카드 갱신
  await page.fill('#retBirthDate', '1980-06-15');
  await page.dispatchEvent('#retBirthDate', 'input');

  // D-day 카드의 정년퇴직 예정일 값
  await expect.poll(async () => {
    const txt = await page.locator('#retDdayRetire').textContent();
    return txt || '';
  }, { timeout: 3000 }).toContain('2040.12.31');

  expect(errors).toEqual([]);
});
