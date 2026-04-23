// Playwright e2e 스모크 — 8개 탭 + 4개 payroll 서브탭 + 콘솔 에러 0건
// 실행: npm run test:smoke
import { test, expect } from '@playwright/test';

const MAIN_TABS = ['home', 'payroll', 'overtime', 'leave', 'reference', 'profile', 'settings', 'feedback'];
const PAYROLL_SUBS = ['pay-payslip', 'pay-calc', 'pay-qa', 'pay-retirement'];

// 기존 코드에 선재하는(pre-existing) CSP 경고 — localhost:3001 backend 부재가 원인.
// 테스트 목적과 무관하므로 검증 시 제외.
const IGNORED_ERROR_PATTERNS = [
  /localhost:3001\/api\/data\/bundle/,
  /Content Security Policy directive.*connect-src/
];

function isIgnorableError(msg) {
  return IGNORED_ERROR_PATTERNS.some(r => r.test(msg));
}

test.describe('SNUH Mate 구조 스모크', () => {
  test('페이지 로드 + 8개 메인 탭 lazy-load + 콘솔 에러 0건', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => {
      if (msg.type() === 'error' && !isIgnorableError(msg.text())) {
        errors.push(msg.text());
      }
    });

    await page.goto('/index.html?app=1');
    await page.waitForFunction(() => typeof window.switchTab === 'function' && typeof window.loadTab === 'function');

    // 초기 home 탭 렌더 대기
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const el = document.getElementById('tab-home');
        return el && el.dataset.loaded === '1';
      });
    }, { timeout: 3000 }).toBe(true);

    // 8개 메인 탭 순회
    for (const name of MAIN_TABS) {
      const result = await page.evaluate(async (tab) => {
        window.switchTab(tab);
        try { await window.loadTab(tab); } catch (e) {}
        await new Promise(r => setTimeout(r, 80));
        const el = document.getElementById('tab-' + tab);
        return {
          active: el.classList.contains('active'),
          loaded: el.dataset.loaded === '1',
          childCount: el.children.length
        };
      }, name);
      expect(result.active, `${name} active`).toBe(true);
      expect(result.loaded, `${name} loaded=1`).toBe(true);
      expect(result.childCount, `${name} 콘텐츠 주입`).toBeGreaterThan(0);
    }

    expect(errors, '콘솔 에러').toEqual([]);
  });

  test('payroll 서브탭 4개 전부 전환 + 콘텐츠 주입', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => {
      if (msg.type() === 'error' && !isIgnorableError(msg.text())) {
        errors.push(msg.text());
      }
    });

    await page.goto('/index.html?app=1');
    await page.waitForFunction(() => typeof window.switchTab === 'function');

    // payroll 탭 로드
    await page.evaluate(async () => {
      window.switchTab('payroll');
      await window.loadTab('payroll');
    });

    for (const sub of PAYROLL_SUBS) {
      const btn = page.locator(`.pay-bookmark-tab[data-subtab="${sub}"]`);
      await btn.click();
      const activeInfo = await page.evaluate((s) => {
        const subEl = document.getElementById('sub-' + s);
        return {
          active: subEl?.classList.contains('active'),
          childCount: subEl?.children.length || 0
        };
      }, sub);
      expect(activeInfo.active, `서브탭 ${sub} active`).toBe(true);
      expect(activeInfo.childCount, `서브탭 ${sub} 콘텐츠`).toBeGreaterThan(0);
    }

    // 퇴직금 서브탭 내부 4개 retTabs 버튼 로드 확인
    const retButtons = await page.locator('#retTabs .ret-bookmark-tab').count();
    expect(retButtons, '퇴직금 내부 탭 버튼 수').toBe(4);

    expect(errors, '콘솔 에러').toEqual([]);
  });

  test('URL 파라미터 진입 — ?tab=overtime 타이틀 반영', async ({ page }) => {
    await page.goto('/index.html?app=1&tab=overtime');
    await expect(page).toHaveTitle(/시간외/);
  });
});
