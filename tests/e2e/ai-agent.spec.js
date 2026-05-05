import { test, expect } from '@playwright/test';

const IGNORED_ERROR_PATTERNS = [
  /localhost:3001\/api\/data\/bundle/,
  /Content Security Policy directive.*connect-src/,
  /504.*Outdated Optimize Dep/,
  /Failed to load resource.*504/,
  /Failed to fetch dynamically imported module/,
];

function isIgnorableError(msg) {
  return IGNORED_ERROR_PATTERNS.some(r => r.test(msg));
}

test('AI tab exposes runnable user agent and streams output', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => { if (!isIgnorableError(e.message)) errors.push(e.message); });
  page.on('console', msg => {
    if (msg.type() === 'error' && !isIgnorableError(msg.text())) errors.push(msg.text());
  });

  await page.route('https://snuhmate-ai-gateway.kgh1379.workers.dev/ai/agent/run', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: `data: ${JSON.stringify('시간외 탭과 급여 탭을 같이 확인하세요.')}\n\ndata: [DONE]\n\n`,
    });
  });

  await page.goto('/app?tab=ai');
  await page.waitForFunction(() => typeof window.switchTab === 'function' && typeof window.loadTab === 'function');
  await page.evaluate(async () => {
    window.switchTab('ai');
    await window.loadTab('ai');
  });

  await page.locator('.ai-btab[data-aitab="portfolio"]').click();
  await expect(page.locator('#aiAgentGrid .ai-agent-card')).toHaveCount(12);
  await expect(page.locator('#aiAgentGrid').getByText('SNUHmate 사용자 코파일럿')).toBeVisible();
  await expect(page.locator('#aiAgentGrid').getByText('운영 관리자 에이전트')).toHaveCount(0);

  await page.locator('#aiAgentGrid').getByText('SNUHmate 사용자 코파일럿').click();
  await expect(page.locator('#aiRunPanel')).toBeVisible();
  await page.locator('#ai-input-question').fill('이번 달 시간외와 급여명세서가 다른 이유를 알려줘');
  await page.locator('#aiRunBtn').click();
  await expect(page.locator('#aiOutput')).toContainText('시간외 탭과 급여 탭');

  expect(errors, '콘솔 에러').toEqual([]);
});
