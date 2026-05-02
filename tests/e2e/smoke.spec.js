// Playwright e2e 스모크 — 9개 탭 + 4개 payroll 서브탭 + 콘솔 에러 0건
// 실행: npm run test:smoke
import { test, expect } from '@playwright/test';

const MAIN_TABS = ['home', 'payroll', 'overtime', 'leave', 'schedule', 'reference', 'profile', 'settings', 'feedback'];
const PAYROLL_SUBS = ['pay-payslip', 'pay-calc', 'pay-qa', 'pay-retirement'];
const SCHEDULE_STAT_CODES = ['D', 'E', 'N', 'O', 'AL', 'RD'];
const SCHEDULE_STAT_DS = {
  D:  { cardBg: 'bg-ds-duty-day-bg',      border: 'border-l-ds-duty-day',      codeBg: 'bg-ds-duty-day',      num: 'text-ds-duty-day' },
  E:  { cardBg: 'bg-ds-duty-evening-bg',  border: 'border-l-ds-duty-evening',  codeBg: 'bg-ds-duty-evening',  num: 'text-ds-duty-evening' },
  N:  { cardBg: 'bg-ds-duty-night-bg',    border: 'border-l-ds-duty-night',    codeBg: 'bg-ds-duty-night',    num: 'text-ds-duty-night' },
  O:  { cardBg: 'bg-ds-duty-off-bg',      border: 'border-l-ds-duty-off',      codeBg: 'bg-ds-duty-off',      num: 'text-ds-duty-off' },
  AL: { cardBg: 'bg-ds-duty-leave-bg',    border: 'border-l-ds-duty-leave',    codeBg: 'bg-ds-duty-leave',    num: 'text-ds-duty-leave' },
  RD: { cardBg: 'bg-ds-duty-recovery-bg', border: 'border-l-ds-duty-recovery', codeBg: 'bg-ds-duty-recovery', num: 'text-ds-duty-recovery' },
};

// 기존 코드에 선재하는(pre-existing) CSP 경고 — localhost:3001 backend 부재가 원인.
// Vite dev server 내부 캐시 만료(504) / Astro dev-toolbar 모듈 로드 실패도 앱과 무관.
// 테스트 목적과 무관하므로 검증 시 제외.
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

test.describe('SNUH Mate 구조 스모크', () => {
  test('페이지 로드 + 9개 메인 탭 lazy-load + 콘솔 에러 0건', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => { if (!isIgnorableError(e.message)) errors.push(e.message); });
    page.on('console', msg => {
      if (msg.type() === 'error' && !isIgnorableError(msg.text())) {
        errors.push(msg.text());
      }
    });

    await page.goto('/app');
    await page.waitForFunction(() => typeof window.switchTab === 'function' && typeof window.loadTab === 'function');

    // 초기 home 탭 렌더 대기
    // Phase 6 이후 Astro Island 가 서버 사이드 렌더 → data-loaded flag 없이도 콘텐츠 존재.
    // 둘 중 하나만 만족하면 OK (JS lazy-load 또는 Astro pre-render).
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const el = document.getElementById('tab-home');
        return el && (el.dataset.loaded === '1' || el.children.length > 0);
      });
    }, { timeout: 3000 }).toBe(true);

    // 9개 메인 탭 순회
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
      // Astro Island pre-render 또는 JS lazy-load 둘 중 하나만 만족하면 OK.
      expect(result.loaded || result.childCount > 0, `${name} 콘텐츠 로드`).toBe(true);
      expect(result.childCount, `${name} 콘텐츠 주입`).toBeGreaterThan(0);
    }

    expect(errors, '콘솔 에러').toEqual([]);
  });

  test('payroll 서브탭 4개 전부 전환 + 콘텐츠 주입 (퇴직금 내부 3탭)', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => { if (!isIgnorableError(e.message)) errors.push(e.message); });
    page.on('console', msg => {
      if (msg.type() === 'error' && !isIgnorableError(msg.text())) {
        errors.push(msg.text());
      }
    });

    await page.goto('/app');
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

    // 퇴직금 서브탭 내부 3탭(시뮬레이터/타임라인/알아두기) 로드 확인 (재설계 2026-04-30)
    const retButtons = await page.locator('#retTabs .ret-bookmark-tab').count();
    expect(retButtons, '퇴직금 내부 탭 버튼 수').toBe(3);
    const retTabNames = await page.locator('#retTabs .ret-bookmark-tab').evaluateAll(
      btns => btns.map(b => b.getAttribute('data-tab'))
    );
    expect(retTabNames, '퇴직금 서브탭 이름').toEqual(['sim', 'timeline', 'learn']);

    expect(errors, '콘솔 에러').toEqual([]);
  });

  test('URL 파라미터 진입 — ?tab=overtime 타이틀 반영', async ({ page }) => {
    await page.goto('/app?tab=overtime');
    await expect(page).toHaveTitle(/시간외/);
  });

  test('근무 통계 카드가 duty design token 색을 실제 DOM에 반영', async ({ page }) => {
    await page.goto('/app?tab=schedule');
    await page.waitForFunction(() => document.querySelectorAll('#schStatsGrid .sch-stat-card').length >= 6);

    const shellClass = await page.locator('#schStatsCard').getAttribute('class');
    expect(shellClass).toContain('card');
    expect(shellClass).toContain('bg-ds-bg-surface');
    expect(shellClass).toContain('border-ds-border-default');
    expect(shellClass).toContain('rounded-brand-md');

    const stats = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#schStatsGrid .sch-stat-card')).map((el) => {
        const style = getComputedStyle(el);
        const code = el.querySelector('.sch-stat-code');
        const label = el.querySelector('.lbl');
        const num = el.querySelector('.num');
        const codeStyle = code ? getComputedStyle(code) : null;
        const numStyle = num ? getComputedStyle(num) : null;
        return {
          className: el.className,
          codeClass: code?.className || '',
          numClass: num?.className || '',
          labelClass: label?.className || '',
          code: code?.textContent?.trim() || '',
          text: el.textContent?.trim().replace(/\s+/g, ' ') || '',
          cardBg: style.backgroundColor,
          cardBorderLeft: style.borderLeftColor,
          cardBorderLeftWidth: style.borderLeftWidth,
          codeBg: codeStyle?.backgroundColor || '',
          numColor: numStyle?.color || ''
        };
      });
    });

    const codes = stats.map((stat) => stat.code);
    expect(codes).toEqual(expect.arrayContaining(SCHEDULE_STAT_CODES));

    const dutyStats = stats.filter((stat) => SCHEDULE_STAT_CODES.includes(stat.code));
    expect(new Set(dutyStats.map((stat) => stat.codeBg)).size, '코드 pill 배경색 다양성').toBeGreaterThanOrEqual(5);

    for (const stat of dutyStats) {
      const expected = SCHEDULE_STAT_DS[stat.code];
      expect(stat.className, `${stat.code} duty class`).toContain(`sch-stat-${stat.code}`);
      expect(stat.className, `${stat.code} card bg utility`).toContain(expected.cardBg);
      expect(stat.className, `${stat.code} left border utility`).toContain(expected.border);
      expect(stat.className, `${stat.code} default border utility`).toContain('border-ds-border-default');
      expect(stat.className, `${stat.code} radius utility`).toContain('rounded-brand-md');
      expect(stat.codeClass, `${stat.code} badge base`).toContain('badge');
      expect(stat.codeClass, `${stat.code} code bg utility`).toContain(expected.codeBg);
      expect(stat.codeClass, `${stat.code} code text utility`).toContain('text-ds-caption');
      expect(stat.numClass, `${stat.code} number typography utility`).toContain('text-ds-h3');
      expect(stat.numClass, `${stat.code} number color utility`).toContain(expected.num);
      expect(stat.labelClass, `${stat.code} label utility`).toContain('text-ds-text-secondary');
      expect(stat.codeBg, `${stat.code} code chip background`).not.toBe('rgba(0, 0, 0, 0)');
      expect(stat.codeBg, `${stat.code} code chip background`).not.toBe(stat.cardBg);
      expect(stat.numColor, `${stat.code} number color`).not.toBe('rgb(17, 24, 39)');
      expect(stat.cardBorderLeftWidth, `${stat.code} left border width`).toBe('4px');
      expect(stat.cardBorderLeft, `${stat.code} left border color`).toBe(stat.numColor);
    }
  });

  test('reference 탭이 단체협약 전체 장을 표시한다', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => {
      if (msg.type() === 'error' && !isIgnorableError(msg.text())) {
        errors.push(msg.text());
      }
    });

    await page.goto('/app?tab=reference');
    await page.waitForFunction(() => typeof window.switchTab === 'function' && typeof window.loadTab === 'function');
    await page.evaluate(async () => {
      window.switchTab('reference');
      await window.loadTab('reference');
    });

    const tabs = page.locator('#browseChapterTabs .reg-chapter-tab');
    await expect(tabs).toHaveCount(13);
    for (const label of [
      '전체',
      '제1장 총칙',
      '제2장 조합 활동',
      '제3장 인사',
      '제4장 근로시간',
      '제5장 임금 및 퇴직금',
      '제6장 복리후생 및 교육훈련',
      '제7장 안전보건, 재해보상',
      '제8장 단체교섭',
      '제9장 노사협의회',
      '제10장 부칙',
      '별도 합의사항',
      '별첨',
    ]) {
      await expect(tabs.filter({ hasText: label }).first()).toBeVisible();
    }
    await expect(page.getByText('2026 단체협약 원문')).toBeVisible();
    expect(errors, '콘솔 에러').toEqual([]);
  });
});
