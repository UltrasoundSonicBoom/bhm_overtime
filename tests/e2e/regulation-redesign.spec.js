// Plan dazzling-booping-kettle redesign — 규정 sub-tab 분리 + 전체규정 MD 렌더 + 검색 확장
import { test, expect } from '@playwright/test';

const IGNORED = [
  /localhost:3001\/api\/data\/bundle/,
  /Content Security Policy directive.*connect-src/,
  /504.*Outdated Optimize Dep/,
  /Failed to load resource.*504/,
  /Failed to fetch dynamically imported module/,
];
const isIgnorable = (m) => IGNORED.some((r) => r.test(m));

test.describe('규정 sub-tab + 전체규정 + 검색 확장', () => {
  test('규정 탭 진입 → 두 sub-tab(규정·검색 / 전체 규정) 노출', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => { if (!isIgnorable(e.message)) errors.push(e.message); });
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isIgnorable(msg.text())) errors.push(msg.text());
    });

    await page.goto('/app?tab=reference');
    await page.waitForFunction(() => document.querySelector('.reg-article'));

    const subtabs = await page.locator('#regSubTabs .reg-bookmark-tab').count();
    expect(subtabs).toBe(2);
    await expect(page.locator('#regSubTabs .reg-bookmark-tab[data-subtab="full"]')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('전체 규정 sub-tab — 마크다운 → HTML 렌더 (h2 장 헤더 + h3 조항 anchor + 표)', async ({ page }) => {
    await page.goto('/app?tab=reference');
    await page.waitForFunction(() => document.querySelector('.reg-article'));
    await page.locator('#regSubTabs .reg-bookmark-tab[data-subtab="full"]').click();
    await page.waitForSelector('#fullRegulationDoc h2', { timeout: 10000 });
    // 제32조 anchor 존재
    const art32 = await page.locator('#fullRegulationDoc h3#art-32').count();
    expect(art32).toBeGreaterThanOrEqual(1);
    // h2 (장)
    const chapters = await page.locator('#fullRegulationDoc h2').count();
    expect(chapters).toBeGreaterThanOrEqual(5);
    // h3 (조항) 다수
    const articles = await page.locator('#fullRegulationDoc h3').count();
    expect(articles).toBeGreaterThanOrEqual(50);
  });

  test('검색 확장 — 누락 키워드 5종 모두 매칭', async ({ page }) => {
    await page.goto('/app?tab=reference');
    await page.waitForFunction(() => document.querySelector('.reg-article'));
    const keywords = ['장기재직', '자기계발', '배우자출산', '임신검진', '보건휴가'];
    for (const kw of keywords) {
      await page.fill('#browseSearch', kw);
      // 확장 결과 박스 또는 기본 결과 중 하나가 키워드 포함
      await expect.poll(async () => {
        const text = await page.locator('#browseArticles').textContent();
        return text || '';
      }, { timeout: 3000 }).toContain(kw);
    }
  });

  test('검색 결과의 본문 매치 링크 클릭 → 전체 규정 sub-tab 으로 이동 + 강조', async ({ page }) => {
    await page.goto('/app?tab=reference');
    await page.waitForFunction(() => document.querySelector('.reg-article'));
    await page.fill('#browseSearch', '임신검진');
    await page.waitForSelector('.reg-extended-results a', { timeout: 5000 });
    await page.locator('.reg-extended-results a').first().click();
    // sub-tab 'full' 활성화
    await expect(page.locator('#regSubTabs .reg-bookmark-tab[data-subtab="full"]')).toHaveClass(/active/);
    await expect(page.locator('#subtab-full')).toHaveClass(/active/);
  });
});
