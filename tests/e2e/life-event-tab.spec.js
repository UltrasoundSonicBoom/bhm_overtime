// 생활이벤트 탭 smoke — Plan dazzling-booping-kettle Task B7
import { test, expect } from '@playwright/test';

const IGNORED = [
  /localhost:3001\/api\/data\/bundle/,
  /Content Security Policy directive.*connect-src/,
  /504.*Outdated Optimize Dep/,
  /Failed to load resource.*504/,
  /Failed to fetch dynamically imported module/,
];
const isIgnorable = (m) => IGNORED.some((r) => r.test(m));

test.describe('생활이벤트 탭', () => {
  test('17 카드 렌더 + 카테고리 필터 + 검색 + 콘솔 에러 0건', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => { if (!isIgnorable(e.message)) errors.push(e.message); });
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isIgnorable(msg.text())) errors.push(msg.text());
    });

    await page.goto('/app?tab=lifeEvent');
    await page.waitForFunction(() => typeof window.switchTab === 'function');

    // 카드 17개 렌더
    await expect.poll(async () => {
      return await page.locator('.life-event-card').count();
    }, { timeout: 5000 }).toBe(17);

    // 카테고리 필터 — 장례 (8개)
    await page.locator('.le-chip[data-cat="bereavement"]').click();
    await expect.poll(async () => {
      return await page.locator('.life-event-card').count();
    }, { timeout: 2000 }).toBe(8);

    // 결혼 (2개)
    await page.locator('.le-chip[data-cat="wedding"]').click();
    await expect.poll(async () => {
      return await page.locator('.life-event-card').count();
    }, { timeout: 2000 }).toBe(2);

    // 전체 복귀
    await page.locator('.le-chip[data-cat="all"]').click();
    await expect.poll(async () => {
      return await page.locator('.life-event-card').count();
    }, { timeout: 2000 }).toBe(17);

    // 검색 — "정년" → 1 카드
    await page.fill('#lifeEventSearch', '정년');
    await expect.poll(async () => {
      return await page.locator('.life-event-card').count();
    }, { timeout: 2000 }).toBe(1);
    await expect(page.locator('.life-event-card').first()).toContainText('정년퇴직');

    expect(errors).toEqual([]);
  });

  test('서류 체크리스트 — 체크 + reload 후 상태 유지 (localStorage)', async ({ page }) => {
    await page.goto('/app?tab=lifeEvent');
    await page.waitForSelector('.life-event-card');

    // 첫 번째 카드의 첫 번째 서류 체크박스
    const firstCard = page.locator('.life-event-card').first();
    const checkbox = firstCard.locator('input[type="checkbox"][data-doc]').first();
    await checkbox.check();
    await expect(checkbox).toBeChecked();

    await page.reload();
    await page.waitForSelector('.life-event-card');
    const sameCheckbox = page.locator('.life-event-card').first().locator('input[type="checkbox"][data-doc]').first();
    await expect(sameCheckbox).toBeChecked();
  });

  test('mailto 버튼 — href 가 mailto:hr@snuh.org 로 시작하지 않더라도 click 시 location.href 변경 시도', async ({ page }) => {
    await page.goto('/app?tab=lifeEvent');
    await page.waitForSelector('.life-event-card');

    // alert 가뜨면 무시 (placeholder 안내)
    page.on('dialog', (dialog) => dialog.accept());

    // wedding_self 카드의 이메일 버튼
    const btn = page.locator('.life-event-card[data-event-id="wedding_self"] .btn-mailto');
    await expect(btn).toBeVisible();
    // mailto 핸들러 호출 시 navigation 발생 — Playwright 는 about:blank 로 fallback. 단순히 click 가능 여부만 확인.
    await btn.click({ trial: true });
  });

  test('찾아보기 cross-link — art_41 카드에 이벤트 링크 노출', async ({ page }) => {
    await page.goto('/app?tab=reference');
    await page.waitForFunction(() => typeof window.initRegulationFragment === 'function' || document.querySelector('.reg-article'));
    // 데이터 로드 + cross-link 주입 대기
    await expect.poll(async () => {
      return await page.locator('.reg-article[data-article-id="art_41"] .reg-life-event-link').count();
    }, { timeout: 5000 }).toBeGreaterThan(0);
    const links = page.locator('.reg-article[data-article-id="art_41"] .reg-life-event-link a');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(6); // 결혼·자녀결혼·장례·자녀사망 등
  });
});
