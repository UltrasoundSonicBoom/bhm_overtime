# Design Tokens Split — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** style.css 1~3,160줄 (Linear/Raycast 다크 베이스 토큰 + 일반 컴포넌트) 를 `style.dark.css` 로 분리하고, neo 토큰을 default `:root` 로 승격. 디자인 시스템 작업이 neo 베이스에서 자연스럽게 진행되도록 정리.

**Architecture:**
- `style.css` (default `:root` = neo 토큰) → 메인 entry, 모든 HTML 에서 로드
- `style.dark.css` (옛 다크 토큰 + neo 외 컴포넌트) → `data-theme="dark"` 명시 시만 로드 (선택적)
- 빌드 변화 0 (별도 entry 추가 — Vite 가 dist/assets/ 로 hash 빌드)

**Tech Stack:** Vanilla CSS + CSS variable cascading.

**SPEC reference:** docs/superpowers/specs/2026-04-27-design-tokens-split.md (이 plan 과 함께 작성됨)

**Branch / Worktree:**
```bash
git worktree add ../bhm_overtime-tokens -b feat/design-tokens-split
cd ../bhm_overtime-tokens
npm install
```

---

## Task 1: 인벤토리 + 회귀 가드 시각 baseline

**Files:**
- Create: `docs/superpowers/plans/2026-04-27-design-tokens-inventory.md`
- Create: `tests/integration/design-tokens.test.js`

- [ ] **Step 1.1: 토큰 인벤토리 생성**

```bash
{
  echo "# 토큰 인벤토리 — $(date '+%Y-%m-%d')"
  echo ""
  echo "## 다크 :root 토큰 (style.css 1~60)"
  awk '/^:root \{/,/^\}/' style.css | head -60
  echo ""
  echo "## neo 토큰 (style.css 3162~3199)"
  awk '/html\[data-theme="neo"\] \{/,/^\}/' style.css | head -50
  echo ""
  echo "## neo overrides (3201 이후)"
  grep -n 'html\[data-theme="neo"\]' style.css | wc -l
} > docs/superpowers/plans/2026-04-27-design-tokens-inventory.md
```

- [ ] **Step 1.2: 시각 회귀 baseline (Playwright)**

빌드 후 preview 서버 실행:
```bash
npm run build
npm run preview &
sleep 3
```

Playwright MCP 로 현재 모습 스크린샷 (baseline):
- `/index.html?app=1` (홈/info/시간외/규정/휴가/급여 6 탭)
- `/regulation.html`
- `/retirement.html`
- 결과 → `/tmp/baseline-<page>.png`

스크린샷 비교 자동화 어려움 → 수동 시각 검증 + diff 도구 사용 (대안: percy/Chromatic 도입은 별도 plan)

- [ ] **Step 1.3: data-theme 토큰 선언 단위 테스트**

`tests/integration/design-tokens.test.js`:

```js
import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';

let cssMain;
let cssDark;

beforeAll(() => {
  cssMain = readFileSync('style.css', 'utf-8');
  // Task 2 이후 생성됨 — Task 1 시점에는 빈 파일 또는 미존재
  try { cssDark = readFileSync('style.dark.css', 'utf-8'); } catch (e) { cssDark = ''; }
});

describe('Design Tokens Split (Phase 5-followup)', () => {
  it('style.css :root 가 neo 토큰을 default 로 가짐', () => {
    // Task 2 이후 PASS — 현재는 RED (아직 다크 토큰이 :root)
    const rootMatch = cssMain.match(/^:root\s*\{([\s\S]*?)^\}/m);
    expect(rootMatch).toBeTruthy();
    const rootBody = rootMatch[1];
    // neo 토큰 마커: --accent-indigo: #6C5CE7 (neo) vs #6366f1 (dark)
    expect(rootBody).toContain('#6C5CE7');  // neo indigo
    expect(rootBody).toContain('#FFFDF5');  // neo bg-primary
  });

  it('style.dark.css 가 data-theme="dark" 토큰을 가짐', () => {
    if (!cssDark) {
      // Task 2 전 — 파일 미존재 = expected RED
      expect(cssDark).toBe('');
      return;
    }
    expect(cssDark).toContain('html[data-theme="dark"]');
    expect(cssDark).toContain('#6366f1');  // dark indigo
    expect(cssDark).toContain('#09090b');  // dark bg-primary
  });

  it('html[data-theme="neo"] override block 은 제거됨 (default 가 neo 이므로)', () => {
    // Task 2 후 PASS
    if (cssDark) {
      const neoOverridesInMain = cssMain.match(/html\[data-theme="neo"\]\s*\{/g);
      // neo 토큰 정의 block 1개 → 0개 (default 로 승격)
      // neo override (.cal-badge 등) 는 유지 — 단 component 별 selector 만 (변수 재정의 X)
      const tokenBlock = cssMain.match(/html\[data-theme="neo"\]\s*\{[\s\S]*?--accent-indigo/);
      expect(tokenBlock).toBeNull();
    }
  });
});
```

- [ ] **Step 1.4: 테스트 RED 확인**

```bash
npx vitest run tests/integration/design-tokens.test.js
```

Expected: 첫 두 케이스 FAIL (아직 분리 안 됨).

- [ ] **Step 1.5: 커밋**

```bash
git add tests/integration/design-tokens.test.js docs/superpowers/plans/2026-04-27-design-tokens-inventory.md
git commit -m "feat(design-tokens-1): 인벤토리 + 회귀 가드 (RED — 분리 전)"
```

---

## Task 2: 다크 토큰을 style.dark.css 로 분리

**Files:**
- Create: `style.dark.css`
- Modify: `style.css` (1~60줄 다크 :root → 삭제, 3162~3199 neo → :root 승격)

- [ ] **Step 2.1: style.dark.css 신규 작성**

다크 토큰을 `html[data-theme="dark"]` selector 안으로 이동. 일반 :root 가 아닌 명시적 dark theme 으로.

`style.dark.css`:

```css
/* ============================================
   SNUH Mate — Dark Theme Tokens (Linear/Raycast)
   data-theme="dark" 명시 시만 활성화
   기본 (default :root) 은 neo 토큰 (style.css)
   ============================================ */

html[data-theme="dark"] {
  /* ── Linear Palette: Deep solid darks, no transparency ── */
  --bg-primary: #09090b;
  --bg-secondary: #0f0f11;
  --bg-card: #141416;
  --bg-glass: rgba(255, 255, 255, 0.03);
  --bg-glass-hover: rgba(255, 255, 255, 0.06);
  --border-glass: rgba(255, 255, 255, 0.06);
  --border-active: rgba(255, 255, 255, 0.15);

  --text-primary: #ececef;
  --text-secondary: #a0a0ab;
  --text-muted: #63636e;
  --text-accent: #a0a0ab;

  --accent-indigo: #6366f1;
  --accent-blue: #3b82f6;
  --accent-cyan: #06b6d4;
  --accent-emerald: #10b981;
  --accent-amber: #f59e0b;
  --accent-amber-text: #F97316;
  --accent-rose: #f43f5e;
  --accent-violet: #8b5cf6;

  --gradient-primary: #6366f1;
  --gradient-success: #10b981;
  --gradient-warning: #f59e0b;
  --gradient-info: #3b82f6;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.6);
  --shadow-glow: none;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 12px;
  --radius-full: 9999px;
}
```

- [ ] **Step 2.2: style.css :root 를 neo 토큰으로 교체**

style.css 의 1~60 줄 (옛 다크 :root) 을 다음으로 교체:

```css
/* ============================================
   SNUH Mate — Default Theme (Neo)
   neo 토큰을 default :root 로 승격
   다크 모드: <html data-theme="dark"> + style.dark.css 로드
   ============================================ */

@import url('https://fonts.googleapis.com/css2?family=Bakbak+One&family=Black+Han+Sans&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap');

:root {
  /* ── Typography Scale (공통) ── */
  --text-amount-huge: 32px;
  --text-amount-large: 24px;
  --text-title-large: 20px;
  --text-body-large: 16px;
  --text-body-normal: 14px;
  --text-label-small: 12px;

  /* ── Neo Palette (default) ── */
  --bg-primary: #FFFDF5;
  --bg-secondary: #FFF8E7;
  --bg-card: #FFFFFF;
  --bg-glass: #F5F0E1;
  --bg-glass-hover: #EDE7D3;
  --border-glass: #1a1a1a;
  --border-active: #1a1a1a;

  --text-primary: #1a1a1a;
  --text-secondary: #4a4a4a;
  --text-muted: #7a7a7a;
  --text-accent: #1a1a1a;

  --accent-indigo: #6C5CE7;
  --accent-blue: #74B9FF;
  --accent-cyan: #00CEC9;
  --accent-emerald: #00B894;
  --accent-amber: #FDCB6E;
  --accent-amber-text: #F97316;
  --accent-rose: #FD79A8;
  --accent-violet: #A29BFE;

  --gradient-primary: #6C5CE7;
  --gradient-success: #00B894;
  --gradient-warning: #FDCB6E;
  --gradient-info: #74B9FF;

  --shadow-sm: 2px 2px 0px #1a1a1a;
  --shadow-md: 4px 4px 0px #1a1a1a;
  --shadow-lg: 6px 6px 0px #1a1a1a;
  --shadow-glow: none;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-full: 9999px;

  --transition: all 0.15s ease-out;
  --app-tabbar-height-desktop: 82px;
  --app-tabbar-height-mobile: 96px;
}
```

- [ ] **Step 2.3: style.css 안의 `html[data-theme="neo"] { --... }` 토큰 정의 block 삭제**

3162~3199 줄의 토큰 정의 block 제거 (이미 :root 로 승격됨). neo 컴포넌트 selector (`html[data-theme="neo"] .nav-tab` 등) 는 **유지** — 변수 재정의 X, 컴포넌트 스타일만.

```bash
# 검증: 3162~3199 토큰 block 만 제거됐는지 grep
grep -n 'html\[data-theme="neo"\]\s*\{$' style.css | head -3
# Expected: 토큰 block (3162) 제거. 다른 selector block 은 유지
```

- [ ] **Step 2.4: 테스트 GREEN 확인**

```bash
npx vitest run tests/integration/design-tokens.test.js
```

Expected: 3 케이스 모두 PASS.

- [ ] **Step 2.5: 커밋**

```bash
git add style.css style.dark.css
git commit -m "feat(design-tokens-2): neo 토큰을 default :root 로 승격 + 다크 토큰 → style.dark.css 분리"
```

---

## Task 3: HTML entry 에서 dark 모드 선택 로드 + neo 기본화

**Files:**
- Modify: `index.html`, `regulation.html`, `retirement.html`, `dashboard.html`, `schedule_suite.html`, `tutorial.html`, `terms.html`, `privacy.html`, `onboarding.html`

- [ ] **Step 3.1: 모든 entry HTML 에 dark 조건부 로드 추가**

각 HTML 의 `<link rel="stylesheet" href="style.css">` 직후:

```html
<!-- 다크 모드: localStorage.theme === 'dark' 일 때만 로드 (default neo) -->
<script>
  (function () {
    var theme = localStorage.getItem('theme');
    if (theme === 'dark' || theme === 'linear') {
      document.documentElement.setAttribute('data-theme', 'dark');
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'style.dark.css';
      document.head.appendChild(link);
    } else {
      document.documentElement.setAttribute('data-theme', 'neo');
    }
  })();
</script>
```

(neo data-theme attribute 도 명시 — neo 컴포넌트 override selector 가 작동하도록)

- [ ] **Step 3.2: shared-layout.js 의 initTheme 정리**

```bash
grep -n "initTheme\|setAttribute.*data-theme" shared-layout.js *.js | head -10
```

기존 initTheme 가 'neo' 강제라면 그대로 두고, dark 모드 토글 UI 가 있다면 'dark' 로 매핑.

- [ ] **Step 3.3: 빌드 + Playwright 시각 검증**

```bash
npm run build
npm run preview &
sleep 3
```

Playwright MCP 로:
1. `/index.html?app=1` 진입 → neo 디자인 (밝은 베이지 배경) 확인 ✓
2. `localStorage.setItem('theme', 'dark'); location.reload();` → 다크 디자인 ✓
3. baseline 스크린샷 (Task 1.2) 와 비교

- [ ] **Step 3.4: 회귀 가드 통합 테스트**

```bash
npm run test:integration
```

Expected: 모든 테스트 PASS (data-theme 토큰 분리 영향 0).

- [ ] **Step 3.5: 커밋**

```bash
git add index.html regulation.html retirement.html dashboard.html schedule_suite.html tutorial.html terms.html privacy.html onboarding.html shared-layout.js
git commit -m "feat(design-tokens-3): HTML entry — dark 조건부 로드 + neo data-theme 명시"
```

---

## Task 4: 회귀 검증 + main 머지

- [ ] **Step 4.1: 종합 검증**

```bash
npm run test:unit       # 175+ passed
npm run test:integration # 62+ passed
npm run lint            # 0 error
npm run build           # 빌드 성공
```

- [ ] **Step 4.2: Playwright 9 HTML 스모크**

```bash
npm run preview &
sleep 3
```

Playwright MCP 로 9 entry HTML 순회 — 콘솔 에러 0 + 시각적으로 깨진 곳 없음.

- [ ] **Step 4.3: main 머지 + push**

```bash
cd /Users/momo/Documents/GitHub/bhm_overtime
git checkout main
git merge --ff-only feat/design-tokens-split
git push origin main
git worktree remove ../bhm_overtime-tokens
git branch -d feat/design-tokens-split
```

---

## Self-Review

- [ ] :root 가 neo 토큰 (default)
- [ ] style.dark.css = data-theme="dark" 토큰만
- [ ] html[data-theme="neo"] 토큰 재정의 block 제거
- [ ] 9 HTML entry — neo data-theme 기본 + dark 조건부 로드
- [ ] 시각 회귀 0 (baseline 비교)
- [ ] Unit/Integration/lint/build GREEN

---

## 산출물

- `style.dark.css` — 다크 테마 토큰 (data-theme="dark" 시 활성화)
- `style.css` — neo default :root + 공통 컴포넌트 + neo 컴포넌트 override
- 9 HTML entry — 조건부 dark 로드 + data-theme 명시
- `tests/integration/design-tokens.test.js` — 토큰 선언 회귀 가드
- `docs/superpowers/plans/2026-04-27-design-tokens-inventory.md` — 분리 전 인벤토리
