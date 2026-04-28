# SNUH Mate Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SNUH Mate 의 공통 디자인 언어를 코드화한다 — 2-tier 토큰(primitive→semantic), 22개 Astro 컴포넌트(UI/Layout/Pattern), `/design-system` 쇼케이스, 거버넌스 lint, HomeIsland 레퍼런스 마이그레이션.

**Architecture:** 기존 Phase 7 Tailwind+CSS-var bridge 위에 누적 빌드. 토큰은 `apps/web/src/styles/tokens/*.css` 4개 파일로 분리, 컴포넌트는 `apps/web/src/components/{ui,layout,patterns}/` 에 Astro 파일로 작성. 기존 globals.css 의 클래스(`.btn`, `.card` 등)는 유지하면서 신규 컴포넌트가 동일 클래스를 출력 → 시각 회귀 0. 거버넌스는 통합 테스트로 강제.

**Tech Stack:** Astro v4 + @astrojs/tailwind + Tailwind v3 (JIT) + Vitest + Playwright. zero-JS first.

**SPEC:** [docs/superpowers/specs/2026-04-28-design-system.md](../specs/2026-04-28-design-system.md)

**Branch:** `design-system` (이미 worktree `.worktrees/design-system` 에 생성됨)

---

## File Structure

생성:
- `apps/web/src/styles/tokens/primitive.css` — gray/blue/red/amber/emerald 100~900 raw values
- `apps/web/src/styles/tokens/semantic.css` — color-text/bg/border/status, focus-ring
- `apps/web/src/styles/tokens/spacing.css` — space-0 ~ space-20
- `apps/web/src/styles/tokens/typography.css` — font-size/weight/line-height
- `apps/web/src/components/ui/{Button,Input,Select,Textarea,Checkbox,Radio,Switch,FormField,Card,Badge,Alert,Modal,Tabs}.astro` — 13 컴포넌트
- `apps/web/src/components/layout/{Container,Stack,Section,Grid,Divider}.astro` — 5 컴포넌트
- `apps/web/src/components/patterns/{PageHeader,EmptyState,FormSection,LoadingSkeleton,ErrorState}.astro` — 5 컴포넌트
- `apps/web/src/pages/design-system.astro` — main showcase
- `apps/web/src/pages/design-system/{tokens,components,patterns,guidelines}.astro` — sub pages
- `docs/design-system/{usage,components,changelog}.md`
- `tests/unit/design-system/{button,badge,form,card,alert,modal,tabs,layout,patterns}.test.js`
- `tests/integration/design-tokens-contract.test.js`
- `tests/integration/design-system-governance.test.js`
- `tests/integration/design-system-showcase.test.js`

수정:
- `apps/web/src/styles/globals.css` — 상단에 4개 token import 추가
- `apps/web/tailwind.config.js` — `theme.extend.spacing`, `theme.extend.fontSize`, `colors.ds`, ring tokens 추가
- `apps/web/src/components/tabs/HomeIsland.astro` — 신규 컴포넌트로 리팩토링 (Slice 8)

---

## Slice 1: Foundation Tokens (Primitive + Semantic 2-tier)

**Files:**
- Create: `apps/web/src/styles/tokens/primitive.css`
- Create: `apps/web/src/styles/tokens/semantic.css`
- Create: `apps/web/src/styles/tokens/spacing.css`
- Create: `apps/web/src/styles/tokens/typography.css`
- Modify: `apps/web/src/styles/globals.css` (line 1-15 영역, `@tailwind` 디렉티브 위에 import 추가)
- Test: `tests/integration/design-tokens-contract.test.js`

### Task 1.1: 토큰 contract 테스트 작성 (RED)

- [ ] **Step 1: 실패하는 토큰 contract 테스트 작성**

`tests/integration/design-tokens-contract.test.js`:

```javascript
// Design System Tokens Contract — primitive + semantic 2-tier 검증
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';

let primitive, semantic, spacing, typography;

beforeAll(() => {
  primitive = readFileSync('apps/web/src/styles/tokens/primitive.css', 'utf-8');
  semantic  = readFileSync('apps/web/src/styles/tokens/semantic.css', 'utf-8');
  spacing   = readFileSync('apps/web/src/styles/tokens/spacing.css', 'utf-8');
  typography= readFileSync('apps/web/src/styles/tokens/typography.css', 'utf-8');
});

describe('Primitive tokens', () => {
  it('gray scale 50~900 정의', () => {
    for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]) {
      expect(primitive).toMatch(new RegExp('--gray-' + step + ':\\s*#'));
    }
  });
  it('brand-blue, status (red, amber, emerald) scale', () => {
    expect(primitive).toMatch(/--blue-500:\s*#/);
    expect(primitive).toMatch(/--red-500:\s*#/);
    expect(primitive).toMatch(/--amber-500:\s*#/);
    expect(primitive).toMatch(/--emerald-500:\s*#/);
  });
});

describe('Semantic tokens', () => {
  const required = [
    '--color-text-primary', '--color-text-secondary', '--color-text-muted',
    '--color-bg-page', '--color-bg-surface', '--color-bg-elevated',
    '--color-border-default', '--color-border-strong', '--color-border-focus',
    '--color-brand-primary',
    '--color-status-success', '--color-status-warning', '--color-status-error', '--color-status-info',
    '--focus-ring-color', '--focus-ring-width', '--focus-ring-offset',
  ];
  for (const t of required) {
    it(t + ' 정의됨', () => {
      expect(semantic).toContain(t);
    });
  }
  it('semantic 토큰은 primitive var() 를 참조한다', () => {
    expect(semantic).toMatch(/--color-text-primary:\s*var\(--gray-\d+\)|--color-text-primary:\s*var\(--neo-ink/);
    expect(semantic).toMatch(/--color-brand-primary:\s*var\(--blue-\d+\)/);
  });
});

describe('Spacing scale', () => {
  it('--space-0 ~ --space-12 정의 + 4px 기반', () => {
    for (const i of [0, 1, 2, 3, 4, 5, 6, 8, 10, 12]) {
      expect(spacing).toMatch(new RegExp('--space-' + i + ':\\s*\\d'));
    }
    expect(spacing).toMatch(/--space-1:\s*4px/);
    expect(spacing).toMatch(/--space-4:\s*16px/);
    expect(spacing).toMatch(/--space-12:\s*48px/);
  });
});

describe('Typography scale', () => {
  const sizes = ['display', 'h1', 'h2', 'h3', 'h4', 'body-lg', 'body-md', 'body-sm', 'label', 'caption'];
  for (const s of sizes) {
    it('--font-size-' + s + ' 정의', () => {
      expect(typography).toMatch(new RegExp('--font-size-' + s + ':'));
    });
  }
  it('weight + line-height 토큰 정의', () => {
    expect(typography).toMatch(/--font-weight-regular:\s*400/);
    expect(typography).toMatch(/--font-weight-bold:\s*700/);
    expect(typography).toMatch(/--line-height-tight:/);
    expect(typography).toMatch(/--line-height-normal:/);
  });
});

describe('Globals.css imports tokens', () => {
  it('globals.css 가 4개 token 파일을 import 한다', () => {
    const g = readFileSync('apps/web/src/styles/globals.css', 'utf-8');
    expect(g).toMatch(/@import\s+['"]\.?\/?tokens\/primitive\.css['"]/);
    expect(g).toMatch(/@import\s+['"]\.?\/?tokens\/semantic\.css['"]/);
    expect(g).toMatch(/@import\s+['"]\.?\/?tokens\/spacing\.css['"]/);
    expect(g).toMatch(/@import\s+['"]\.?\/?tokens\/typography\.css['"]/);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run tests/integration/design-tokens-contract.test.js`
Expected: FAIL — 4개 토큰 파일 미존재 (ENOENT).

### Task 1.2: Primitive token 파일 작성 (GREEN — 1단계)

- [ ] **Step 3: `apps/web/src/styles/tokens/primitive.css` 작성**

```css
/* SNUH Mate Design System — Primitive Tokens
 * Raw color/value scale. Semantic 토큰만 직접 사용한다.
 */
:root {
  /* Gray scale (Linear/Raycast inspired) */
  --gray-50:  #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;

  /* Brand blue (indigo) */
  --blue-50:  #eef2ff;
  --blue-100: #e0e7ff;
  --blue-300: #a5b4fc;
  --blue-500: #6366f1;
  --blue-600: #5558e6;
  --blue-700: #4f46e5;

  /* Status — red */
  --red-50:  #fef2f2;
  --red-300: #fca5a5;
  --red-500: #ef4444;
  --red-600: #dc2626;

  /* Status — amber */
  --amber-50:  #fffbeb;
  --amber-300: #fcd34d;
  --amber-500: #f59e0b;
  --amber-600: #d97706;

  /* Status — emerald */
  --emerald-50:  #ecfdf5;
  --emerald-300: #6ee7b7;
  --emerald-500: #10b981;
  --emerald-600: #059669;

  /* Neo cream (legacy palette — alias only) */
  --neo-cream-50:  #FFFDF5;
  --neo-cream-100: #FFF8E7;
  --neo-cream-200: #F5F0E1;
  --neo-cream-300: #EDE7D3;
  --neo-ink:       #1a1a1a;
  --neo-ink-soft:  #4a4a4a;
  --neo-ink-mute:  #7a7a7a;
}
```

- [ ] **Step 4: `apps/web/src/styles/tokens/semantic.css` 작성**

```css
/* SNUH Mate Design System — Semantic Tokens
 * UI 의미별 alias. 모든 신규 컴포넌트는 이 layer 만 참조한다.
 */
:root {
  /* Text */
  --color-text-primary:   var(--neo-ink);
  --color-text-secondary: var(--neo-ink-soft);
  --color-text-muted:     var(--neo-ink-mute);
  --color-text-inverse:   #ffffff;
  --color-text-link:      var(--blue-700);

  /* Background */
  --color-bg-page:     var(--neo-cream-50);
  --color-bg-surface:  #ffffff;
  --color-bg-elevated: var(--neo-cream-100);
  --color-bg-muted:    var(--neo-cream-200);
  --color-bg-hover:    var(--neo-cream-300);

  /* Border */
  --color-border-default: var(--gray-200);
  --color-border-strong:  var(--neo-ink);
  --color-border-focus:   var(--blue-500);

  /* Brand */
  --color-brand-primary:        var(--blue-500);
  --color-brand-primary-hover:  var(--blue-600);
  --color-brand-secondary:      var(--gray-700);

  /* Status */
  --color-status-success: var(--emerald-500);
  --color-status-warning: var(--amber-500);
  --color-status-error:   var(--red-500);
  --color-status-info:    var(--blue-500);

  --color-status-success-bg: var(--emerald-50);
  --color-status-warning-bg: var(--amber-50);
  --color-status-error-bg:   var(--red-50);
  --color-status-info-bg:    var(--blue-50);

  /* Focus ring (모든 인터랙티브 요소 공용) */
  --focus-ring-color:  var(--blue-500);
  --focus-ring-width:  2px;
  --focus-ring-offset: 2px;
}

html[data-theme="dark"] {
  --color-text-primary:   #ececef;
  --color-text-secondary: #a0a0ab;
  --color-text-muted:     #63636e;

  --color-bg-page:     #09090b;
  --color-bg-surface:  #141416;
  --color-bg-elevated: #1c1c1e;
  --color-bg-muted:    rgba(255, 255, 255, 0.03);
  --color-bg-hover:    rgba(255, 255, 255, 0.06);

  --color-border-default: rgba(255, 255, 255, 0.06);
  --color-border-strong:  rgba(255, 255, 255, 0.15);
  --color-border-focus:   var(--blue-500);
}
```

- [ ] **Step 5: `apps/web/src/styles/tokens/spacing.css` 작성**

```css
/* SNUH Mate Design System — Spacing Scale (4px grid) */
:root {
  --space-0:  0;
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
}
```

- [ ] **Step 6: `apps/web/src/styles/tokens/typography.css` 작성**

```css
/* SNUH Mate Design System — Typography Scale */
:root {
  /* Font size */
  --font-size-display: 40px;
  --font-size-h1:      32px;
  --font-size-h2:      24px;
  --font-size-h3:      20px;
  --font-size-h4:      18px;
  --font-size-body-lg: 16px;
  --font-size-body-md: 14px;
  --font-size-body-sm: 13px;
  --font-size-label:   13px;
  --font-size-caption: 12px;

  /* Font weight */
  --font-weight-regular:  400;
  --font-weight-medium:   500;
  --font-weight-semibold: 600;
  --font-weight-bold:     700;

  /* Line height */
  --line-height-tight:    1.2;
  --line-height-snug:     1.4;
  --line-height-normal:   1.5;
  --line-height-relaxed:  1.6;

  /* Font family */
  --font-family-sans: 'Inter', 'Noto Sans KR', -apple-system, sans-serif;
  --font-family-mono: 'Space Grotesk', 'Menlo', monospace;
}
```

- [ ] **Step 7: `apps/web/src/styles/globals.css` 상단에 import 추가**

기존 `@tailwind base;` **위에** 4줄 삽입.

기존 (line 7-13 영역):
```css
@import url('https://fonts.googleapis.com/css2?family=Bakbak+One...');

@tailwind base;
```

변경 후:
```css
@import url('https://fonts.googleapis.com/css2?family=Bakbak+One...');

/* Design System tokens — 2-tier */
@import './tokens/primitive.css';
@import './tokens/semantic.css';
@import './tokens/spacing.css';
@import './tokens/typography.css';

@tailwind base;
```

- [ ] **Step 8: 토큰 contract 테스트 통과 확인**

Run: `pnpm vitest run tests/integration/design-tokens-contract.test.js`
Expected: PASS — 모든 토큰 contract 통과.

- [ ] **Step 9: 기존 design-tokens 회귀 가드 통과 확인**

Run: `pnpm vitest run tests/integration/design-tokens.test.js`
Expected: PASS — 기존 neo `:root` `#6C5CE7` `#FFFDF5` 마커는 globals.css 에서 그대로 유지되므로 영향 없음.

- [ ] **Step 10: 빌드 확인**

Run: `pnpm --filter @snuhmate/web build`
Expected: 빌드 성공, `dist/` 안 CSS에 토큰 4개 파일 내용 포함.

- [ ] **Step 11: 커밋**

Run:
```
git add apps/web/src/styles/tokens/ apps/web/src/styles/globals.css tests/integration/design-tokens-contract.test.js
git commit -m "feat(ds-1): foundation tokens — primitive + semantic 2-tier (gray/blue/status, spacing 4px grid, typography scale)"
```

---

## Slice 2: Tailwind Config Integration

**Files:**
- Modify: `apps/web/tailwind.config.js` (전체 — extend 추가)
- Test: `tests/integration/design-system-governance.test.js` (Tailwind config 부분만 우선)

### Task 2.1: Tailwind config 확장 — spacing/fontSize/status colors

- [ ] **Step 1: 실패하는 Tailwind config 검증 테스트 작성**

`tests/integration/design-system-governance.test.js`:

```javascript
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';

let cfg;
beforeAll(() => {
  cfg = readFileSync('apps/web/tailwind.config.js', 'utf-8');
});

describe('Tailwind config — design system extensions', () => {
  it('theme.extend.spacing 안 --space-* token 참조', () => {
    expect(cfg).toMatch(/spacing:\s*\{[^}]*'1':\s*'var\(--space-1\)'/s);
    expect(cfg).toMatch(/'12':\s*'var\(--space-12\)'/);
  });
  it('theme.extend.fontSize 안 ds-* 키 정의', () => {
    expect(cfg).toMatch(/'ds-display':/);
    expect(cfg).toMatch(/'ds-h1':/);
    expect(cfg).toMatch(/'ds-body-md':/);
    expect(cfg).toMatch(/'ds-caption':/);
  });
  it('theme.extend.colors.ds 안 status + text + bg 토큰 참조', () => {
    expect(cfg).toMatch(/ds:\s*\{[^}]*'text-primary':\s*'var\(--color-text-primary\)'/s);
    expect(cfg).toMatch(/'status-success':\s*'var\(--color-status-success\)'/);
    expect(cfg).toMatch(/'status-error':\s*'var\(--color-status-error\)'/);
    expect(cfg).toMatch(/'border-focus':\s*'var\(--color-border-focus\)'/);
  });
  it('기존 brand-* 키 유지 (호환)', () => {
    expect(cfg).toContain("'bg-primary': 'var(--bg-primary)'");
    expect(cfg).toContain("'accent-indigo': 'var(--accent-indigo)'");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run tests/integration/design-system-governance.test.js`
Expected: FAIL — `ds:` 키 없음, `spacing.1` 없음.

- [ ] **Step 3: `apps/web/tailwind.config.js` 확장**

```javascript
/** @type {import('tailwindcss').Config} */
// Phase 7-1: Tailwind v3 + neo/dark token bridge.
// design-system: ds.* color/spacing/fontSize 토큰 추가 (primitive→semantic 참조).
export default {
  content: ['./src/**/*.{astro,html,js,ts,jsx,tsx}'],
  darkMode: ['selector', 'html[data-theme="dark"]'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        // ── Design System (semantic) — 신규 ──
        ds: {
          'text-primary':   'var(--color-text-primary)',
          'text-secondary': 'var(--color-text-secondary)',
          'text-muted':     'var(--color-text-muted)',
          'text-inverse':   'var(--color-text-inverse)',
          'text-link':      'var(--color-text-link)',
          'bg-page':        'var(--color-bg-page)',
          'bg-surface':     'var(--color-bg-surface)',
          'bg-elevated':    'var(--color-bg-elevated)',
          'bg-muted':       'var(--color-bg-muted)',
          'bg-hover':       'var(--color-bg-hover)',
          'border-default': 'var(--color-border-default)',
          'border-strong':  'var(--color-border-strong)',
          'border-focus':   'var(--color-border-focus)',
          'brand-primary':       'var(--color-brand-primary)',
          'brand-primary-hover': 'var(--color-brand-primary-hover)',
          'brand-secondary':     'var(--color-brand-secondary)',
          'status-success': 'var(--color-status-success)',
          'status-warning': 'var(--color-status-warning)',
          'status-error':   'var(--color-status-error)',
          'status-info':    'var(--color-status-info)',
          'status-success-bg': 'var(--color-status-success-bg)',
          'status-warning-bg': 'var(--color-status-warning-bg)',
          'status-error-bg':   'var(--color-status-error-bg)',
          'status-info-bg':    'var(--color-status-info-bg)',
        },
        // ── Legacy brand-* (Phase 7) — 호환 유지 ──
        brand: {
          'bg-primary': 'var(--bg-primary)',
          'bg-secondary': 'var(--bg-secondary)',
          'bg-card': 'var(--bg-card)',
          'bg-glass': 'var(--bg-glass)',
          'bg-glass-hover': 'var(--bg-glass-hover)',
          'border-glass': 'var(--border-glass)',
          'border-active': 'var(--border-active)',
          'text-primary': 'var(--text-primary)',
          'text-secondary': 'var(--text-secondary)',
          'text-muted': 'var(--text-muted)',
          'text-accent': 'var(--text-accent)',
          'accent-indigo': 'var(--accent-indigo)',
          'accent-blue': 'var(--accent-blue)',
          'accent-cyan': 'var(--accent-cyan)',
          'accent-emerald': 'var(--accent-emerald)',
          'accent-amber': 'var(--accent-amber)',
          'accent-amber-text': 'var(--accent-amber-text)',
          'accent-rose': 'var(--accent-rose)',
          'accent-violet': 'var(--accent-violet)',
          'gradient-primary': 'var(--gradient-primary)',
          'gradient-success': 'var(--gradient-success)',
          'gradient-warning': 'var(--gradient-warning)',
          'gradient-info': 'var(--gradient-info)',
        },
      },
      spacing: {
        '0':  'var(--space-0)',
        '1':  'var(--space-1)',
        '2':  'var(--space-2)',
        '3':  'var(--space-3)',
        '4':  'var(--space-4)',
        '5':  'var(--space-5)',
        '6':  'var(--space-6)',
        '8':  'var(--space-8)',
        '10': 'var(--space-10)',
        '12': 'var(--space-12)',
        '16': 'var(--space-16)',
        '20': 'var(--space-20)',
      },
      fontSize: {
        'ds-display': ['var(--font-size-display)', { lineHeight: 'var(--line-height-tight)', fontWeight: 'var(--font-weight-bold)' }],
        'ds-h1':      ['var(--font-size-h1)',      { lineHeight: 'var(--line-height-tight)', fontWeight: 'var(--font-weight-bold)' }],
        'ds-h2':      ['var(--font-size-h2)',      { lineHeight: 'var(--line-height-snug)',  fontWeight: 'var(--font-weight-bold)' }],
        'ds-h3':      ['var(--font-size-h3)',      { lineHeight: 'var(--line-height-snug)',  fontWeight: 'var(--font-weight-semibold)' }],
        'ds-h4':      ['var(--font-size-h4)',      { lineHeight: 'var(--line-height-snug)',  fontWeight: 'var(--font-weight-semibold)' }],
        'ds-body-lg': ['var(--font-size-body-lg)', { lineHeight: 'var(--line-height-relaxed)' }],
        'ds-body-md': ['var(--font-size-body-md)', { lineHeight: 'var(--line-height-normal)' }],
        'ds-body-sm': ['var(--font-size-body-sm)', { lineHeight: 'var(--line-height-normal)' }],
        'ds-label':   ['var(--font-size-label)',   { lineHeight: 'var(--line-height-snug)',  fontWeight: 'var(--font-weight-medium)' }],
        'ds-caption': ['var(--font-size-caption)', { lineHeight: 'var(--line-height-snug)' }],
        // Legacy
        'brand-amount-huge': 'var(--text-amount-huge)',
        'brand-amount-large': 'var(--text-amount-large)',
        'brand-title-large': 'var(--text-title-large)',
        'brand-body-large': 'var(--text-body-large)',
        'brand-body-normal': 'var(--text-body-normal)',
        'brand-label-small': 'var(--text-label-small)',
      },
      boxShadow: {
        'brand-sm': 'var(--shadow-sm)',
        'brand-md': 'var(--shadow-md)',
        'brand-lg': 'var(--shadow-lg)',
        'brand-glow': 'var(--shadow-glow)',
      },
      borderRadius: {
        'brand-sm': 'var(--radius-sm)',
        'brand-md': 'var(--radius-md)',
        'brand-lg': 'var(--radius-lg)',
        'brand-xl': 'var(--radius-xl)',
        'brand-full': 'var(--radius-full)',
      },
      ringColor: {
        'ds-focus': 'var(--focus-ring-color)',
      },
      ringWidth: {
        'ds': 'var(--focus-ring-width)',
      },
      ringOffsetWidth: {
        'ds': 'var(--focus-ring-offset)',
      },
      transitionProperty: {
        brand: 'all',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run tests/integration/design-system-governance.test.js`
Expected: PASS — Tailwind config 검증 4개 모두 통과.

- [ ] **Step 5: 빌드 + 기존 회귀 가드 확인**

Run: `pnpm --filter @snuhmate/web build && pnpm test:integration`
Expected: 빌드 OK, 통합 테스트 PASS.

- [ ] **Step 6: 커밋**

Run:
```
git add apps/web/tailwind.config.js tests/integration/design-system-governance.test.js
git commit -m "feat(ds-2): Tailwind config — ds.* color, spacing scale, fontSize ds-*, ring tokens"
```

---

## Slice 3: UI Component Primitives — Button + Badge

**Files:**
- Create: `apps/web/src/components/ui/Button.astro`
- Create: `apps/web/src/components/ui/Badge.astro`
- Test: `tests/unit/design-system/button.test.js`
- Test: `tests/unit/design-system/badge.test.js`

### Task 3.1: Button 컴포넌트 (RED → GREEN)

- [ ] **Step 1: Button 단위 테스트 작성**

`tests/unit/design-system/button.test.js`:

```javascript
// Button 컴포넌트 contract — variant/size/state 출력 클래스 검증
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';

let src;
beforeAll(() => {
  src = readFileSync('apps/web/src/components/ui/Button.astro', 'utf-8');
});

describe('Button.astro', () => {
  it('5 variant Props 정의: primary/secondary/tertiary/danger/ghost', () => {
    expect(src).toMatch(/variant\?:\s*['"]primary['"]\s*\|\s*['"]secondary['"]\s*\|\s*['"]tertiary['"]\s*\|\s*['"]danger['"]\s*\|\s*['"]ghost['"]/);
  });
  it('3 size Props 정의: sm/md/lg', () => {
    expect(src).toMatch(/size\?:\s*['"]sm['"]\s*\|\s*['"]md['"]\s*\|\s*['"]lg['"]/);
  });
  it('disabled / loading / fullWidth Props 정의', () => {
    expect(src).toMatch(/disabled\?:\s*boolean/);
    expect(src).toMatch(/loading\?:\s*boolean/);
    expect(src).toMatch(/fullWidth\?:\s*boolean/);
  });
  it('iconLeft / iconRight prop 지원', () => {
    expect(src).toMatch(/iconLeft\?:\s*string/);
    expect(src).toMatch(/iconRight\?:\s*string/);
  });
  it('출력 root class 가 .btn (legacy 호환) + ds-button (신규) 둘 다 포함', () => {
    expect(src).toMatch(/\bbtn\b/);
    expect(src).toMatch(/\bds-button\b/);
  });
  it('focus-visible ring 출력', () => {
    expect(src).toMatch(/focus-visible:ring-ds|focus:ring-ds/);
  });
  it('disabled / loading 시 aria-disabled / aria-busy 출력', () => {
    expect(src).toMatch(/aria-disabled/);
    expect(src).toMatch(/aria-busy/);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run tests/unit/design-system/button.test.js`
Expected: FAIL — `Button.astro` ENOENT.

- [ ] **Step 3: `apps/web/src/components/ui/Button.astro` 작성**

```astro
---
/**
 * Button — Action component
 * 사용 시점: 사용자가 액션을 트리거할 때 (저장, 삭제, 다음, 닫기 등).
 * 사용 금지: 페이지 이동에는 <a> 우선.
 */
interface Props {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: string;
  iconRight?: string;
  id?: string;
  name?: string;
  value?: string;
  ariaLabel?: string;
  onclick?: string;
}

const {
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  fullWidth = false,
  iconLeft,
  iconRight,
  id,
  name,
  value,
  ariaLabel,
  onclick,
} = Astro.props;

const variantClass = {
  primary:   'bg-ds-brand-primary text-ds-text-inverse hover:bg-ds-brand-primary-hover',
  secondary: 'bg-ds-bg-muted text-ds-text-primary border border-ds-border-default hover:bg-ds-bg-hover',
  tertiary:  'bg-transparent text-ds-text-primary hover:bg-ds-bg-muted',
  danger:    'bg-ds-status-error text-ds-text-inverse hover:opacity-90',
  ghost:     'bg-transparent text-ds-text-secondary hover:bg-ds-bg-muted',
}[variant];

const sizeClass = {
  sm: 'px-3 py-1 text-ds-body-sm min-h-[32px] rounded-brand-sm',
  md: 'px-5 py-2 text-ds-body-md min-h-[40px] rounded-brand-md',
  lg: 'px-6 py-3 text-ds-body-lg min-h-[48px] rounded-brand-md',
}[size];

const widthClass = fullWidth ? 'w-full flex' : 'inline-flex';
const stateClass = (disabled || loading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

// Legacy .btn .btn-primary 등 클래스를 함께 출력 → 기존 globals.css 셀렉터 호환.
const legacyVariant = variant === 'primary' ? 'btn-primary'
  : variant === 'secondary' ? 'btn-secondary'
  : variant === 'ghost' ? 'btn-outline'
  : '';
const legacyClass = ['btn', legacyVariant, fullWidth ? 'btn-full' : ''].filter(Boolean).join(' ');
---
<button
  type={type}
  id={id}
  name={name}
  value={value}
  disabled={disabled || loading}
  aria-disabled={disabled || loading}
  aria-busy={loading}
  aria-label={ariaLabel}
  onclick={onclick}
  class={`ds-button ${legacyClass} ${widthClass} items-center justify-center gap-2 font-semibold transition-all focus-visible:outline-none focus-visible:ring-ds focus-visible:ring-ds-focus focus-visible:ring-offset-ds ${variantClass} ${sizeClass} ${stateClass}`}
>
  {loading && <span aria-hidden="true">⏳</span>}
  {!loading && iconLeft && <span aria-hidden="true">{iconLeft}</span>}
  <slot />
  {!loading && iconRight && <span aria-hidden="true">{iconRight}</span>}
</button>
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm vitest run tests/unit/design-system/button.test.js`
Expected: PASS — 7 검증 통과.

### Task 3.2: Badge 컴포넌트

- [ ] **Step 5: Badge 단위 테스트 작성**

`tests/unit/design-system/badge.test.js`:

```javascript
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';

let src;
beforeAll(() => {
  src = readFileSync('apps/web/src/components/ui/Badge.astro', 'utf-8');
});

describe('Badge.astro', () => {
  it('variant: neutral/info/success/warning/error', () => {
    expect(src).toMatch(/variant\?:\s*['"]neutral['"]\s*\|\s*['"]info['"]\s*\|\s*['"]success['"]\s*\|\s*['"]warning['"]\s*\|\s*['"]error['"]/);
  });
  it('size: sm/md', () => {
    expect(src).toMatch(/size\?:\s*['"]sm['"]\s*\|\s*['"]md['"]/);
  });
  it('legacy .badge 클래스 호환 출력', () => {
    expect(src).toMatch(/\bbadge\b/);
  });
});
```

- [ ] **Step 6: 실패 확인 → `apps/web/src/components/ui/Badge.astro` 작성**

```astro
---
/**
 * Badge — 짧은 상태/카테고리 라벨
 */
interface Props {
  variant?: 'neutral' | 'info' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
}

const { variant = 'neutral', size = 'md' } = Astro.props;

const variantClass = {
  neutral: 'bg-ds-bg-muted text-ds-text-secondary',
  info:    'bg-ds-status-info-bg text-ds-status-info',
  success: 'bg-ds-status-success-bg text-ds-status-success',
  warning: 'bg-ds-status-warning-bg text-ds-status-warning',
  error:   'bg-ds-status-error-bg text-ds-status-error',
}[variant];

const sizeClass = {
  sm: 'px-2 py-0.5 text-ds-caption',
  md: 'px-2.5 py-1 text-ds-body-sm',
}[size];

// Legacy .badge.indigo|emerald|amber|rose 와 매핑.
const legacyVariant = {
  neutral: '', info: 'indigo', success: 'emerald', warning: 'amber', error: 'rose',
}[variant];
---
<span class={`badge ${legacyVariant} inline-flex items-center font-semibold rounded-brand-full ${variantClass} ${sizeClass}`}>
  <slot />
</span>
```

- [ ] **Step 7: 테스트 + 빌드 통과 확인**

Run: `pnpm vitest run tests/unit/design-system/ && pnpm --filter @snuhmate/web build`
Expected: PASS, 빌드 OK.

- [ ] **Step 8: 커밋**

Run:
```
git add apps/web/src/components/ui/Button.astro apps/web/src/components/ui/Badge.astro tests/unit/design-system/
git commit -m "feat(ds-3): Button (5 variant × 3 size) + Badge (5 variant × 2 size) — legacy class 호환"
```

---

## Slice 4: Form Components — FormField/Input/Select/Textarea/Checkbox/Radio/Switch

**Files:**
- Create: `apps/web/src/components/ui/{FormField,Input,Select,Textarea,Checkbox,Radio,Switch}.astro`
- Test: `tests/unit/design-system/form.test.js`

### Task 4.1: form 테스트 + 작성

- [ ] **Step 1: form 단위 테스트 작성**

`tests/unit/design-system/form.test.js`:

```javascript
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';

const read = (p) => readFileSync(p, 'utf-8');

describe('FormField wrapper', () => {
  let src; beforeAll(() => { src = read('apps/web/src/components/ui/FormField.astro'); });
  it('label / helper / error / required 지원', () => {
    expect(src).toMatch(/label\?:\s*string/);
    expect(src).toMatch(/helper\?:\s*string/);
    expect(src).toMatch(/error\?:\s*string/);
    expect(src).toMatch(/required\?:\s*boolean/);
  });
  it('legacy .form-group 클래스 호환', () => {
    expect(src).toMatch(/\bform-group\b/);
  });
});

describe('Input', () => {
  let src; beforeAll(() => { src = read('apps/web/src/components/ui/Input.astro'); });
  it('type 6종 (text/email/tel/number/date/password)', () => {
    expect(src).toMatch(/['"]text['"]\s*\|\s*['"]email['"]\s*\|\s*['"]tel['"]\s*\|\s*['"]number['"]\s*\|\s*['"]date['"]\s*\|\s*['"]password['"]/);
  });
  it('focus-ring 토큰 사용', () => {
    expect(src).toMatch(/focus.*ring-ds-focus|border-ds-border-focus/);
  });
});

describe('Select', () => {
  let src; beforeAll(() => { src = read('apps/web/src/components/ui/Select.astro'); });
  it('options prop 지원', () => {
    expect(src).toMatch(/options\??:/);
  });
});

describe('Checkbox / Radio / Switch', () => {
  it('Checkbox.astro 존재 + input type checkbox', () => {
    const s = read('apps/web/src/components/ui/Checkbox.astro');
    expect(s).toMatch(/type=["']checkbox["']/);
  });
  it('Radio.astro 존재 + name prop', () => {
    const s = read('apps/web/src/components/ui/Radio.astro');
    expect(s).toMatch(/type=["']radio["']/);
    expect(s).toMatch(/name:\s*string/);
  });
  it('Switch.astro 존재 + role switch + aria-checked', () => {
    const s = read('apps/web/src/components/ui/Switch.astro');
    expect(s).toMatch(/role=["']switch["']/);
    expect(s).toMatch(/aria-checked/);
  });
});

describe('Textarea', () => {
  let src; beforeAll(() => { src = read('apps/web/src/components/ui/Textarea.astro'); });
  it('rows / maxLength prop', () => {
    expect(src).toMatch(/rows\??:\s*number/);
    expect(src).toMatch(/maxLength\??:\s*number/);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run tests/unit/design-system/form.test.js`
Expected: FAIL — 7 파일 모두 미존재.

- [ ] **Step 3: `apps/web/src/components/ui/FormField.astro` 작성**

```astro
---
/**
 * FormField — Input/Select/Textarea wrapper
 * label + helper + error + required 표시 일관성.
 */
interface Props {
  label?: string;
  helper?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  id?: string;
}
const { label, helper, error, required, htmlFor, id } = Astro.props;
const fieldId = htmlFor ?? id;
const errorId = fieldId ? fieldId + '-error' : undefined;
const helperId = fieldId ? fieldId + '-helper' : undefined;
---
<div class="form-group flex flex-col gap-1 mb-4">
  {label && (
    <label for={htmlFor} class="block text-ds-label text-ds-text-secondary font-medium">
      {label}
      {required && <span class="text-ds-status-error ml-0.5" aria-hidden="true">*</span>}
    </label>
  )}
  <slot />
  {helper && !error && (
    <p id={helperId} class="text-ds-caption text-ds-text-muted">{helper}</p>
  )}
  {error && (
    <p id={errorId} class="text-ds-caption text-ds-status-error" role="alert">{error}</p>
  )}
</div>
```

- [ ] **Step 4: `apps/web/src/components/ui/Input.astro` 작성**

```astro
---
interface Props {
  type?: 'text' | 'email' | 'tel' | 'number' | 'date' | 'password';
  id?: string;
  name?: string;
  value?: string | number;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  autocomplete?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  pattern?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  invalid?: boolean;
}
const {
  type = 'text', id, name, value, placeholder,
  required, disabled, readonly, autocomplete,
  min, max, step, pattern, ariaLabel, ariaDescribedBy, invalid,
} = Astro.props;
const borderClass = invalid ? 'border-ds-status-error' : 'border-ds-border-default';
---
<input
  type={type}
  id={id}
  name={name}
  value={value}
  placeholder={placeholder}
  required={required}
  disabled={disabled}
  readonly={readonly}
  autocomplete={autocomplete}
  min={min}
  max={max}
  step={step}
  pattern={pattern}
  aria-label={ariaLabel}
  aria-describedby={ariaDescribedBy}
  aria-invalid={invalid}
  class={`w-full min-h-[44px] px-3 py-2 bg-ds-bg-muted text-ds-text-primary border rounded-brand-sm text-ds-body-md transition-colors focus:outline-none focus:border-ds-border-focus focus:ring-ds focus:ring-ds-focus focus:ring-offset-ds disabled:opacity-50 disabled:cursor-not-allowed ${borderClass}`}
/>
```

- [ ] **Step 5: `apps/web/src/components/ui/Select.astro` 작성**

```astro
---
interface Option { value: string; label: string; disabled?: boolean }
interface Props {
  id?: string;
  name?: string;
  value?: string;
  options?: Option[];
  required?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  invalid?: boolean;
}
const { id, name, value, options = [], required, disabled, ariaLabel, ariaDescribedBy, invalid } = Astro.props;
const borderClass = invalid ? 'border-ds-status-error' : 'border-ds-border-default';
---
<select
  id={id}
  name={name}
  required={required}
  disabled={disabled}
  aria-label={ariaLabel}
  aria-describedby={ariaDescribedBy}
  aria-invalid={invalid}
  class={`w-full min-h-[44px] px-3 py-2 bg-ds-bg-muted text-ds-text-primary border rounded-brand-sm text-ds-body-md transition-colors focus:outline-none focus:border-ds-border-focus focus:ring-ds focus:ring-ds-focus focus:ring-offset-ds disabled:opacity-50 ${borderClass}`}
>
  {options.length > 0
    ? options.map(o => (
        <option value={o.value} disabled={o.disabled} selected={o.value === value}>{o.label}</option>
      ))
    : <slot />
  }
</select>
```

- [ ] **Step 6: `apps/web/src/components/ui/Textarea.astro` 작성**

```astro
---
interface Props {
  id?: string;
  name?: string;
  value?: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  required?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  invalid?: boolean;
}
const { id, name, value, placeholder, rows = 4, maxLength, required, disabled, ariaLabel, ariaDescribedBy, invalid } = Astro.props;
const borderClass = invalid ? 'border-ds-status-error' : 'border-ds-border-default';
---
<textarea
  id={id}
  name={name}
  placeholder={placeholder}
  rows={rows}
  maxlength={maxLength}
  required={required}
  disabled={disabled}
  aria-label={ariaLabel}
  aria-describedby={ariaDescribedBy}
  aria-invalid={invalid}
  class={`w-full px-3 py-2 bg-ds-bg-muted text-ds-text-primary border rounded-brand-sm text-ds-body-md transition-colors focus:outline-none focus:border-ds-border-focus focus:ring-ds focus:ring-ds-focus focus:ring-offset-ds disabled:opacity-50 resize-y ${borderClass}`}
>{value}</textarea>
```

- [ ] **Step 7: `apps/web/src/components/ui/Checkbox.astro` 작성**

```astro
---
interface Props {
  id?: string;
  name?: string;
  value?: string;
  checked?: boolean;
  disabled?: boolean;
  required?: boolean;
  label?: string;
}
const { id, name, value, checked, disabled, required, label } = Astro.props;
---
<label class="inline-flex items-center gap-2 cursor-pointer text-ds-body-md text-ds-text-primary">
  <input
    type="checkbox"
    id={id}
    name={name}
    value={value}
    checked={checked}
    disabled={disabled}
    required={required}
    class="w-4 h-4 rounded-brand-sm border border-ds-border-default text-ds-brand-primary focus:ring-ds focus:ring-ds-focus focus:ring-offset-ds"
  />
  {label && <span>{label}</span>}
  <slot />
</label>
```

- [ ] **Step 8: `apps/web/src/components/ui/Radio.astro` 작성**

```astro
---
interface Props {
  id?: string;
  name: string;
  value: string;
  checked?: boolean;
  disabled?: boolean;
  required?: boolean;
  label?: string;
}
const { id, name, value, checked, disabled, required, label } = Astro.props;
---
<label class="inline-flex items-center gap-2 cursor-pointer text-ds-body-md text-ds-text-primary">
  <input
    type="radio"
    id={id}
    name={name}
    value={value}
    checked={checked}
    disabled={disabled}
    required={required}
    class="w-4 h-4 border border-ds-border-default text-ds-brand-primary focus:ring-ds focus:ring-ds-focus focus:ring-offset-ds"
  />
  {label && <span>{label}</span>}
  <slot />
</label>
```

- [ ] **Step 9: `apps/web/src/components/ui/Switch.astro` 작성**

```astro
---
interface Props {
  id?: string;
  name?: string;
  checked?: boolean;
  disabled?: boolean;
  label?: string;
  ariaLabel?: string;
}
const { id, name, checked, disabled, label, ariaLabel } = Astro.props;
---
<label class="inline-flex items-center gap-2 cursor-pointer">
  <input type="checkbox" id={id} name={name} checked={checked} disabled={disabled} class="sr-only peer" />
  <span
    role="switch"
    aria-checked={checked ? 'true' : 'false'}
    aria-label={ariaLabel}
    class="relative w-10 h-6 bg-ds-bg-muted rounded-brand-full transition-colors peer-checked:bg-ds-brand-primary peer-disabled:opacity-50"
  >
    <span class="absolute top-0.5 left-0.5 w-5 h-5 bg-ds-bg-surface rounded-brand-full shadow-brand-sm transition-transform peer-checked:translate-x-4"></span>
  </span>
  {label && <span class="text-ds-body-md text-ds-text-primary">{label}</span>}
</label>
```

- [ ] **Step 10: 테스트 + 빌드 통과 확인**

Run: `pnpm vitest run tests/unit/design-system/form.test.js && pnpm --filter @snuhmate/web build`
Expected: PASS, 빌드 OK.

- [ ] **Step 11: 커밋**

Run:
```
git add apps/web/src/components/ui/FormField.astro apps/web/src/components/ui/Input.astro apps/web/src/components/ui/Select.astro apps/web/src/components/ui/Textarea.astro apps/web/src/components/ui/Checkbox.astro apps/web/src/components/ui/Radio.astro apps/web/src/components/ui/Switch.astro tests/unit/design-system/form.test.js
git commit -m "feat(ds-4): form primitives — FormField + Input/Select/Textarea/Checkbox/Radio/Switch (focus-ring + aria)"
```

---

## Slice 5: Display + Feedback — Card / Alert / Modal / Tabs

**Files:**
- Create: `apps/web/src/components/ui/{Card,Alert,Modal,Tabs}.astro`
- Test: `tests/unit/design-system/{card,alert,modal,tabs}.test.js`

### Task 5.1: Card

- [ ] **Step 1: Card 테스트 작성**

`tests/unit/design-system/card.test.js`:

```javascript
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';

let src; beforeAll(() => { src = readFileSync('apps/web/src/components/ui/Card.astro', 'utf-8'); });

describe('Card.astro', () => {
  it('header / body / footer slot 지원', () => {
    expect(src).toMatch(/<slot\s+name=["']header["']/);
    expect(src).toMatch(/<slot\s+name=["']footer["']/);
    expect(src).toMatch(/<slot\s*\/>/);
  });
  it('legacy .card 클래스 출력', () => {
    expect(src).toMatch(/\bcard\b/);
  });
  it('padding/elevated variant', () => {
    expect(src).toMatch(/elevated\?:\s*boolean/);
    expect(src).toMatch(/padding\?:\s*['"]none['"]\s*\|\s*['"]sm['"]\s*\|\s*['"]md['"]\s*\|\s*['"]lg['"]/);
  });
});
```

- [ ] **Step 2: 실패 확인 → `Card.astro` 작성**

```astro
---
interface Props {
  elevated?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  as?: 'div' | 'section' | 'article';
  ariaLabel?: string;
}
const { elevated = false, padding = 'md', as: Tag = 'div', ariaLabel } = Astro.props;
const padClass = { none: 'p-0', sm: 'p-3', md: 'p-6', lg: 'p-8' }[padding];
const shadowClass = elevated ? 'shadow-brand-md' : '';
---
<Tag class={`card bg-ds-bg-surface border border-ds-border-default rounded-brand-md transition-colors hover:border-ds-border-strong ${padClass} ${shadowClass}`} aria-label={ariaLabel}>
  {Astro.slots.has('header') && (
    <header class="card-title text-ds-h4 text-ds-text-primary mb-3">
      <slot name="header" />
    </header>
  )}
  <slot />
  {Astro.slots.has('footer') && (
    <footer class="mt-4 pt-3 border-t border-ds-border-default">
      <slot name="footer" />
    </footer>
  )}
</Tag>
```

### Task 5.2: Alert

- [ ] **Step 3: Alert 테스트 + 작성**

`tests/unit/design-system/alert.test.js`:

```javascript
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
let src; beforeAll(() => { src = readFileSync('apps/web/src/components/ui/Alert.astro', 'utf-8'); });

describe('Alert.astro', () => {
  it('variant: info/success/warning/error', () => {
    expect(src).toMatch(/variant\?:\s*['"]info['"]\s*\|\s*['"]success['"]\s*\|\s*['"]warning['"]\s*\|\s*['"]error['"]/);
  });
  it('role alert + aria-live 출력', () => {
    expect(src).toMatch(/role=["']alert["']/);
  });
  it('dismissible prop', () => {
    expect(src).toMatch(/dismissible\?:\s*boolean/);
  });
});
```

`apps/web/src/components/ui/Alert.astro`:

```astro
---
interface Props {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  dismissible?: boolean;
  icon?: string;
}
const { variant = 'info', title, dismissible, icon } = Astro.props;
const styles = {
  info:    { bg: 'bg-ds-status-info-bg',    fg: 'text-ds-status-info',    border: 'border-ds-status-info',    defaultIcon: 'ℹ️' },
  success: { bg: 'bg-ds-status-success-bg', fg: 'text-ds-status-success', border: 'border-ds-status-success', defaultIcon: '✅' },
  warning: { bg: 'bg-ds-status-warning-bg', fg: 'text-ds-status-warning', border: 'border-ds-status-warning', defaultIcon: '⚠️' },
  error:   { bg: 'bg-ds-status-error-bg',   fg: 'text-ds-status-error',   border: 'border-ds-status-error',   defaultIcon: '⛔' },
}[variant];
const displayIcon = icon ?? styles.defaultIcon;
---
<div role="alert" aria-live="polite" class={`flex items-start gap-3 p-3 rounded-brand-md border ${styles.bg} ${styles.border}`}>
  <span aria-hidden="true" class={`text-ds-body-lg ${styles.fg}`}>{displayIcon}</span>
  <div class="flex-1 text-ds-body-md text-ds-text-primary">
    {title && <strong class={`block mb-1 ${styles.fg}`}>{title}</strong>}
    <slot />
  </div>
  {dismissible && (
    <button type="button" class="text-ds-text-muted hover:text-ds-text-primary px-2" aria-label="닫기" data-ds-alert-dismiss>×</button>
  )}
</div>
```

### Task 5.3: Modal

- [ ] **Step 4: Modal 테스트 + 작성**

`tests/unit/design-system/modal.test.js`:

```javascript
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
let src; beforeAll(() => { src = readFileSync('apps/web/src/components/ui/Modal.astro', 'utf-8'); });

describe('Modal.astro', () => {
  it('size: sm/md/lg', () => {
    expect(src).toMatch(/size\?:\s*['"]sm['"]\s*\|\s*['"]md['"]\s*\|\s*['"]lg['"]/);
  });
  it('role dialog + aria-modal + aria-labelledby', () => {
    expect(src).toMatch(/role=["']dialog["']/);
    expect(src).toMatch(/aria-modal=["']true["']/);
    expect(src).toMatch(/aria-labelledby/);
  });
  it('legacy .modal-overlay / .modal-content 호환', () => {
    expect(src).toMatch(/\bmodal-overlay\b/);
    expect(src).toMatch(/\bmodal-content\b/);
  });
});
```

`apps/web/src/components/ui/Modal.astro`:

```astro
---
interface Props {
  id: string;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  open?: boolean;
}
const { id, size = 'md', title, open = false } = Astro.props;
const sizeClass = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }[size];
const titleId = id + '-title';
const visibleClass = open ? 'active' : 'hidden';
---
<div
  id={id}
  class={`modal-overlay ${visibleClass} fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50`}
  role="dialog"
  aria-modal="true"
  aria-labelledby={titleId}
  data-ds-modal
>
  <div class={`modal-content w-full ${sizeClass} bg-ds-bg-surface border border-ds-border-default rounded-brand-lg p-6 shadow-brand-lg`}>
    {title && (
      <header class="modal-header flex items-center justify-between mb-4">
        <h2 id={titleId} class="text-ds-h3 text-ds-text-primary">{title}</h2>
        <button type="button" aria-label="닫기" class="text-ds-text-muted hover:text-ds-text-primary text-ds-h3" data-ds-modal-close>×</button>
      </header>
    )}
    <div class="modal-body text-ds-body-md text-ds-text-primary">
      <slot />
    </div>
    {Astro.slots.has('footer') && (
      <footer class="mt-6 flex justify-end gap-2">
        <slot name="footer" />
      </footer>
    )}
  </div>
</div>
```

### Task 5.4: Tabs

- [ ] **Step 5: Tabs 테스트 + 작성**

`tests/unit/design-system/tabs.test.js`:

```javascript
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
let src; beforeAll(() => { src = readFileSync('apps/web/src/components/ui/Tabs.astro', 'utf-8'); });

describe('Tabs.astro', () => {
  it('items prop 배열', () => {
    expect(src).toMatch(/items:\s*TabItem\[\]|items:\s*Array/);
  });
  it('role tablist + role tab', () => {
    expect(src).toMatch(/role=["']tablist["']/);
    expect(src).toMatch(/role=["']tab["']/);
  });
  it('legacy .nav-tabs 또는 .sub-tabs 호환', () => {
    expect(src).toMatch(/\b(nav-tabs|sub-tabs)\b/);
  });
});
```

`apps/web/src/components/ui/Tabs.astro`:

```astro
---
interface TabItem { id: string; label: string; icon?: string }
interface Props {
  items: TabItem[];
  activeId?: string;
  variant?: 'top' | 'sub';
  ariaLabel?: string;
}
const { items, activeId, variant = 'top', ariaLabel = '탭' } = Astro.props;
const containerClass = variant === 'top' ? 'nav-tabs nav-tabs-inner' : 'sub-tabs';
const itemClass = variant === 'top' ? 'nav-tab' : 'sub-tab';
---
<div class={`${containerClass} flex gap-2`} role="tablist" aria-label={ariaLabel}>
  {items.map(it => (
    <button
      type="button"
      class={`${itemClass} ${activeId === it.id ? 'active' : ''} flex-1 px-3 py-2 rounded-brand-sm text-ds-body-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-ds focus-visible:ring-ds-focus`}
      role="tab"
      id={`tab-${it.id}`}
      aria-controls={`panel-${it.id}`}
      aria-selected={activeId === it.id ? 'true' : 'false'}
      data-tab-id={it.id}
    >
      {it.icon && <span aria-hidden="true">{it.icon}</span>}
      {it.label}
    </button>
  ))}
</div>
```

- [ ] **Step 6: 모든 Slice 5 테스트 + 빌드 통과 확인**

Run: `pnpm vitest run tests/unit/design-system/ && pnpm --filter @snuhmate/web build`
Expected: PASS, 빌드 OK.

- [ ] **Step 7: 커밋**

Run:
```
git add apps/web/src/components/ui/Card.astro apps/web/src/components/ui/Alert.astro apps/web/src/components/ui/Modal.astro apps/web/src/components/ui/Tabs.astro tests/unit/design-system/card.test.js tests/unit/design-system/alert.test.js tests/unit/design-system/modal.test.js tests/unit/design-system/tabs.test.js
git commit -m "feat(ds-5): Card + Alert + Modal + Tabs (a11y dialog/tab roles, legacy class 호환)"
```

---

## Slice 6: Layout + Pattern Components

**Files:**
- Create: `apps/web/src/components/layout/{Container,Stack,Section,Grid,Divider}.astro`
- Create: `apps/web/src/components/patterns/{PageHeader,EmptyState,FormSection,LoadingSkeleton,ErrorState}.astro`
- Test: `tests/unit/design-system/{layout,patterns}.test.js`

### Task 6.1: Layout primitives

- [ ] **Step 1: layout 테스트 작성**

`tests/unit/design-system/layout.test.js`:

```javascript
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
const read = (p) => readFileSync(p, 'utf-8');

describe('Container', () => {
  let s; beforeAll(() => { s = read('apps/web/src/components/layout/Container.astro'); });
  it('size: sm/md/lg/full', () => {
    expect(s).toMatch(/size\?:\s*['"]sm['"]\s*\|\s*['"]md['"]\s*\|\s*['"]lg['"]\s*\|\s*['"]full['"]/);
  });
});

describe('Stack', () => {
  let s; beforeAll(() => { s = read('apps/web/src/components/layout/Stack.astro'); });
  it('direction + gap + align/justify', () => {
    expect(s).toMatch(/direction\?:\s*['"]row['"]\s*\|\s*['"]column['"]/);
    expect(s).toMatch(/gap\?:\s*number/);
  });
});

describe('Section', () => {
  let s; beforeAll(() => { s = read('apps/web/src/components/layout/Section.astro'); });
  it('title prop + heading semantic', () => {
    expect(s).toMatch(/title\?:\s*string/);
    expect(s).toMatch(/<h[2-3]/);
  });
});

describe('Grid', () => {
  let s; beforeAll(() => { s = read('apps/web/src/components/layout/Grid.astro'); });
  it('cols prop', () => {
    expect(s).toMatch(/cols\?:\s*number/);
  });
});

describe('Divider', () => {
  let s; beforeAll(() => { s = read('apps/web/src/components/layout/Divider.astro'); });
  it('orientation: horizontal/vertical', () => {
    expect(s).toMatch(/orientation\?:\s*['"]horizontal['"]\s*\|\s*['"]vertical['"]/);
  });
});
```

- [ ] **Step 2: 실패 확인 → 5 layout 컴포넌트 작성**

`apps/web/src/components/layout/Container.astro`:

```astro
---
interface Props {
  size?: 'sm' | 'md' | 'lg' | 'full';
  as?: string;
}
const { size = 'md', as: Tag = 'div' } = Astro.props;
const widthClass = { sm: 'max-w-screen-sm', md: 'max-w-[640px]', lg: 'max-w-screen-lg', full: 'max-w-full' }[size];
---
<Tag class={`${widthClass} mx-auto w-full px-4`}>
  <slot />
</Tag>
```

`apps/web/src/components/layout/Stack.astro`:

```astro
---
interface Props {
  direction?: 'row' | 'column';
  gap?: number;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
  as?: string;
}
const { direction = 'column', gap = 4, align, justify, wrap = false, as: Tag = 'div' } = Astro.props;
const dirClass = direction === 'row' ? 'flex-row' : 'flex-col';
const alignClass = align ? { start: 'items-start', center: 'items-center', end: 'items-end', stretch: 'items-stretch' }[align] : '';
const justifyClass = justify ? { start: 'justify-start', center: 'justify-center', end: 'justify-end', between: 'justify-between', around: 'justify-around' }[justify] : '';
const wrapClass = wrap ? 'flex-wrap' : '';
---
<Tag class={`flex ${dirClass} gap-${gap} ${alignClass} ${justifyClass} ${wrapClass}`}>
  <slot />
</Tag>
```

`apps/web/src/components/layout/Section.astro`:

```astro
---
interface Props {
  title?: string;
  description?: string;
  level?: 2 | 3;
  spacing?: 'sm' | 'md' | 'lg';
}
const { title, description, level = 2, spacing = 'md' } = Astro.props;
const spacingClass = { sm: 'mb-4', md: 'mb-6', lg: 'mb-8' }[spacing];
---
<section class={spacingClass}>
  {title && (level === 2
    ? <h2 class="text-ds-h2 text-ds-text-primary mb-2">{title}</h2>
    : <h3 class="text-ds-h3 text-ds-text-primary mb-2">{title}</h3>)}
  {description && <p class="text-ds-body-md text-ds-text-secondary mb-4">{description}</p>}
  <slot />
</section>
```

`apps/web/src/components/layout/Grid.astro`:

```astro
---
interface Props {
  cols?: number;
  gap?: number;
  responsive?: boolean;
}
const { cols = 2, gap = 4, responsive = true } = Astro.props;
const colClass = responsive
  ? `grid-cols-1 sm:grid-cols-${cols}`
  : `grid-cols-${cols}`;
---
<div class={`grid ${colClass} gap-${gap}`}>
  <slot />
</div>
```

`apps/web/src/components/layout/Divider.astro`:

```astro
---
interface Props {
  orientation?: 'horizontal' | 'vertical';
  spacing?: number;
}
const { orientation = 'horizontal', spacing = 4 } = Astro.props;
const orientClass = orientation === 'horizontal'
  ? `border-t border-ds-border-default my-${spacing}`
  : `border-l border-ds-border-default mx-${spacing} self-stretch`;
---
<hr role="separator" aria-orientation={orientation} class={orientClass} />
```

### Task 6.2: Pattern components

- [ ] **Step 3: patterns 테스트 작성**

`tests/unit/design-system/patterns.test.js`:

```javascript
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
const read = (p) => readFileSync(p, 'utf-8');

describe('PageHeader', () => {
  let s; beforeAll(() => { s = read('apps/web/src/components/patterns/PageHeader.astro'); });
  it('title (required) + actions slot', () => {
    expect(s).toMatch(/title:\s*string/);
    expect(s).toMatch(/<slot\s+name=["']actions["']/);
  });
});

describe('EmptyState', () => {
  let s; beforeAll(() => { s = read('apps/web/src/components/patterns/EmptyState.astro'); });
  it('icon + title + description prop', () => {
    expect(s).toMatch(/title:\s*string/);
    expect(s).toMatch(/icon\?:\s*string/);
    expect(s).toMatch(/description\?:\s*string/);
  });
});

describe('FormSection', () => {
  let s; beforeAll(() => { s = read('apps/web/src/components/patterns/FormSection.astro'); });
  it('title + collapsible prop', () => {
    expect(s).toMatch(/collapsible\?:\s*boolean/);
  });
});

describe('LoadingSkeleton', () => {
  let s; beforeAll(() => { s = read('apps/web/src/components/patterns/LoadingSkeleton.astro'); });
  it('count + shape prop', () => {
    expect(s).toMatch(/count\?:\s*number/);
    expect(s).toMatch(/shape\?:\s*['"]rect['"]\s*\|\s*['"]circle['"]\s*\|\s*['"]text['"]/);
  });
});

describe('ErrorState', () => {
  let s; beforeAll(() => { s = read('apps/web/src/components/patterns/ErrorState.astro'); });
  it('title + action slot', () => {
    expect(s).toMatch(/title:\s*string/);
    expect(s).toMatch(/<slot\s+name=["']action["']/);
  });
});
```

- [ ] **Step 4: 5개 pattern 컴포넌트 작성**

`apps/web/src/components/patterns/PageHeader.astro`:

```astro
---
interface Props {
  title: string;
  description?: string;
  level?: 1 | 2;
}
const { title, description, level = 1 } = Astro.props;
---
<header class="mb-6">
  <div class="flex items-start justify-between gap-4">
    <div class="flex-1 min-w-0">
      {level === 1
        ? <h1 class="text-ds-h1 text-ds-text-primary">{title}</h1>
        : <h2 class="text-ds-h2 text-ds-text-primary">{title}</h2>
      }
      {description && <p class="mt-2 text-ds-body-md text-ds-text-secondary">{description}</p>}
    </div>
    {Astro.slots.has('actions') && (
      <div class="flex items-center gap-2">
        <slot name="actions" />
      </div>
    )}
  </div>
</header>
```

`apps/web/src/components/patterns/EmptyState.astro`:

```astro
---
interface Props {
  icon?: string;
  title: string;
  description?: string;
}
const { icon = '📭', title, description } = Astro.props;
---
<div class="flex flex-col items-center justify-center text-center py-12 px-4">
  <span aria-hidden="true" class="text-5xl mb-3">{icon}</span>
  <h3 class="text-ds-h4 text-ds-text-primary mb-1">{title}</h3>
  {description && <p class="text-ds-body-md text-ds-text-muted max-w-md">{description}</p>}
  {Astro.slots.has('action') && (
    <div class="mt-6">
      <slot name="action" />
    </div>
  )}
</div>
```

`apps/web/src/components/patterns/FormSection.astro`:

```astro
---
interface Props {
  title: string;
  description?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  id?: string;
}
const { title, description, collapsible = false, defaultOpen = true, id } = Astro.props;
---
{collapsible ? (
  <details class="mb-4 border border-ds-border-default rounded-brand-md p-4" open={defaultOpen}>
    <summary class="cursor-pointer text-ds-h4 text-ds-text-primary">{title}</summary>
    {description && <p class="mt-2 text-ds-body-sm text-ds-text-muted">{description}</p>}
    <div class="mt-4">
      <slot />
    </div>
  </details>
) : (
  <fieldset class="mb-6" id={id}>
    <legend class="text-ds-h4 text-ds-text-primary mb-2">{title}</legend>
    {description && <p class="text-ds-body-sm text-ds-text-muted mb-4">{description}</p>}
    <slot />
  </fieldset>
)}
```

`apps/web/src/components/patterns/LoadingSkeleton.astro`:

```astro
---
interface Props {
  count?: number;
  width?: string;
  height?: string;
  shape?: 'rect' | 'circle' | 'text';
}
const { count = 1, width = '100%', height = '16px', shape = 'rect' } = Astro.props;
const shapeClass = { rect: 'rounded-brand-sm', circle: 'rounded-full', text: 'rounded-brand-sm' }[shape];
const items = Array.from({ length: count }, (_, i) => i);
---
<div class="flex flex-col gap-2" aria-busy="true" aria-live="polite">
  {items.map(() => (
    <span class={`block bg-ds-bg-muted ${shapeClass} animate-pulse`} style={`width:${width};height:${height};`} />
  ))}
</div>
```

`apps/web/src/components/patterns/ErrorState.astro`:

```astro
---
interface Props {
  title: string;
  message?: string;
  icon?: string;
}
const { title, message, icon = '⚠️' } = Astro.props;
---
<div role="alert" class="flex flex-col items-center justify-center text-center py-8 px-4">
  <span aria-hidden="true" class="text-4xl mb-2">{icon}</span>
  <h3 class="text-ds-h4 text-ds-status-error mb-1">{title}</h3>
  {message && <p class="text-ds-body-md text-ds-text-secondary max-w-md">{message}</p>}
  {Astro.slots.has('action') && (
    <div class="mt-4">
      <slot name="action" />
    </div>
  )}
</div>
```

- [ ] **Step 5: 테스트 + 빌드 통과 확인**

Run: `pnpm vitest run tests/unit/design-system/ && pnpm --filter @snuhmate/web build`
Expected: PASS, 빌드 OK.

- [ ] **Step 6: 커밋**

Run:
```
git add apps/web/src/components/layout/ apps/web/src/components/patterns/ tests/unit/design-system/layout.test.js tests/unit/design-system/patterns.test.js
git commit -m "feat(ds-6): layout primitives (Container/Stack/Section/Grid/Divider) + patterns (PageHeader/EmptyState/FormSection/LoadingSkeleton/ErrorState)"
```

---

## Slice 7: /design-system Showcase Route + Docs

**Files:**
- Create: `apps/web/src/pages/design-system.astro`
- Create: `apps/web/src/pages/design-system/{tokens,components,patterns,guidelines}.astro`
- Create: `docs/design-system/{usage,components,changelog}.md`
- Test: `tests/integration/design-system-showcase.test.js`

### Task 7.1: Showcase 라우트

- [ ] **Step 1: showcase 통합 테스트 작성**

`tests/integration/design-system-showcase.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';

describe('/design-system route', () => {
  it('5 페이지 모두 생성됨', () => {
    expect(existsSync('apps/web/src/pages/design-system.astro')).toBe(true);
    expect(existsSync('apps/web/src/pages/design-system/tokens.astro')).toBe(true);
    expect(existsSync('apps/web/src/pages/design-system/components.astro')).toBe(true);
    expect(existsSync('apps/web/src/pages/design-system/patterns.astro')).toBe(true);
    expect(existsSync('apps/web/src/pages/design-system/guidelines.astro')).toBe(true);
  });
  it('main page에 4 sub-page 링크', () => {
    const main = readFileSync('apps/web/src/pages/design-system.astro', 'utf-8');
    expect(main).toMatch(/href=["']\/design-system\/tokens["']/);
    expect(main).toMatch(/href=["']\/design-system\/components["']/);
    expect(main).toMatch(/href=["']\/design-system\/patterns["']/);
    expect(main).toMatch(/href=["']\/design-system\/guidelines["']/);
  });
  it('components page 가 12 UI 컴포넌트 모두 import', () => {
    const c = readFileSync('apps/web/src/pages/design-system/components.astro', 'utf-8');
    for (const name of ['Button', 'Badge', 'Input', 'Select', 'Textarea', 'Checkbox', 'Radio', 'Switch', 'Card', 'Alert', 'Modal', 'Tabs']) {
      expect(c).toContain('import ' + name + ' from');
    }
  });
  it('tokens page에 4 영역 (color/typography/spacing/radius) section', () => {
    const t = readFileSync('apps/web/src/pages/design-system/tokens.astro', 'utf-8');
    for (const heading of ['Color', 'Typography', 'Spacing', 'Radius']) {
      expect(t).toContain(heading);
    }
  });
  it('docs/design-system/usage.md 존재 + 체크리스트 포함', () => {
    expect(existsSync('docs/design-system/usage.md')).toBe(true);
    const u = readFileSync('docs/design-system/usage.md', 'utf-8');
    expect(u).toMatch(/체크리스트|checklist/i);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run tests/integration/design-system-showcase.test.js`
Expected: FAIL — 모든 파일 미존재.

- [ ] **Step 3: `apps/web/src/pages/design-system.astro` 작성**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Container from '../components/layout/Container.astro';
import Section from '../components/layout/Section.astro';
import Card from '../components/ui/Card.astro';
import PageHeader from '../components/patterns/PageHeader.astro';
---
<BaseLayout title="SNUH Mate Design System" showFooterNav={false}>
  <main class="min-h-screen bg-ds-bg-page py-8">
    <Container>
      <PageHeader
        title="SNUH Mate Design System"
        description="공통 디자인 언어. 새 페이지·기능은 정해진 토큰·컴포넌트·패턴을 조합해 만든다."
      />
      <Section title="둘러보기" level={2}>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href="/design-system/tokens" class="block hover:opacity-90">
            <Card>
              <span slot="header">🎨 Foundation Tokens</span>
              <p class="text-ds-body-md text-ds-text-secondary">색상·타이포·간격·radius·shadow — primitive + semantic 2-tier.</p>
            </Card>
          </a>
          <a href="/design-system/components" class="block hover:opacity-90">
            <Card>
              <span slot="header">🧩 Components</span>
              <p class="text-ds-body-md text-ds-text-secondary">Button / Form / Card / Alert / Modal / Tabs.</p>
            </Card>
          </a>
          <a href="/design-system/patterns" class="block hover:opacity-90">
            <Card>
              <span slot="header">📐 Layout & Patterns</span>
              <p class="text-ds-body-md text-ds-text-secondary">Container / Stack / Grid + PageHeader / EmptyState / FormSection.</p>
            </Card>
          </a>
          <a href="/design-system/guidelines" class="block hover:opacity-90">
            <Card>
              <span slot="header">📖 Guidelines</span>
              <p class="text-ds-body-md text-ds-text-secondary">새 페이지 만들 때 체크리스트 + 컴포넌트 선택 트리.</p>
            </Card>
          </a>
        </div>
      </Section>
    </Container>
  </main>
</BaseLayout>
```

- [ ] **Step 4: `apps/web/src/pages/design-system/tokens.astro` 작성**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Container from '../../components/layout/Container.astro';
import Section from '../../components/layout/Section.astro';
import PageHeader from '../../components/patterns/PageHeader.astro';

const colorGroups = [
  { title: 'Text', tokens: ['--color-text-primary', '--color-text-secondary', '--color-text-muted', '--color-text-inverse', '--color-text-link'] },
  { title: 'Background', tokens: ['--color-bg-page', '--color-bg-surface', '--color-bg-elevated', '--color-bg-muted', '--color-bg-hover'] },
  { title: 'Border', tokens: ['--color-border-default', '--color-border-strong', '--color-border-focus'] },
  { title: 'Brand', tokens: ['--color-brand-primary', '--color-brand-primary-hover', '--color-brand-secondary'] },
  { title: 'Status', tokens: ['--color-status-success', '--color-status-warning', '--color-status-error', '--color-status-info'] },
];
const typographyTokens = ['display', 'h1', 'h2', 'h3', 'h4', 'body-lg', 'body-md', 'body-sm', 'label', 'caption'];
const spacingTokens = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20];
const radiusTokens = ['sm', 'md', 'lg', 'xl', 'full'];
---
<BaseLayout title="Tokens — Design System" showFooterNav={false}>
  <main class="min-h-screen bg-ds-bg-page py-8">
    <Container>
      <PageHeader title="Foundation Tokens" description="primitive (raw value) → semantic (UI 의미별 alias) 2-tier" />

      <Section title="Color" level={2}>
        {colorGroups.map(g => (
          <div class="mb-6">
            <h3 class="text-ds-h4 text-ds-text-primary mb-2">{g.title}</h3>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {g.tokens.map(t => (
                <div class="border border-ds-border-default rounded-brand-md p-3">
                  <div class="w-full h-12 rounded-brand-sm mb-2" style={`background:var(${t})`}></div>
                  <code class="text-ds-caption text-ds-text-muted block">{t}</code>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Section>

      <Section title="Typography" level={2}>
        <div class="space-y-3">
          {typographyTokens.map(t => (
            <div class="flex items-baseline gap-4 border-b border-ds-border-default pb-3">
              <code class="text-ds-caption text-ds-text-muted w-32 flex-shrink-0">{`--font-size-${t}`}</code>
              <span class={`text-ds-${t} text-ds-text-primary`}>The quick brown fox · 빠른 갈색 여우</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Spacing" level={2}>
        <div class="space-y-2">
          {spacingTokens.map(s => (
            <div class="flex items-center gap-3">
              <code class="text-ds-caption text-ds-text-muted w-24">{`--space-${s}`}</code>
              <div class="bg-ds-brand-primary h-6" style={`width:var(--space-${s})`}></div>
              <span class="text-ds-body-sm text-ds-text-muted">{`var(--space-${s})`}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Radius" level={2}>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {radiusTokens.map(r => (
            <div class="border border-ds-border-default p-3 text-center">
              <div class={`w-16 h-16 bg-ds-bg-muted mx-auto mb-2 rounded-brand-${r}`}></div>
              <code class="text-ds-caption text-ds-text-muted">{`--radius-${r}`}</code>
            </div>
          ))}
        </div>
      </Section>
    </Container>
  </main>
</BaseLayout>
```

- [ ] **Step 5: `apps/web/src/pages/design-system/components.astro` 작성**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Container from '../../components/layout/Container.astro';
import Section from '../../components/layout/Section.astro';
import Card from '../../components/ui/Card.astro';
import PageHeader from '../../components/patterns/PageHeader.astro';
import Button from '../../components/ui/Button.astro';
import Badge from '../../components/ui/Badge.astro';
import Input from '../../components/ui/Input.astro';
import Select from '../../components/ui/Select.astro';
import Textarea from '../../components/ui/Textarea.astro';
import Checkbox from '../../components/ui/Checkbox.astro';
import Radio from '../../components/ui/Radio.astro';
import Switch from '../../components/ui/Switch.astro';
import Alert from '../../components/ui/Alert.astro';
import Modal from '../../components/ui/Modal.astro';
import Tabs from '../../components/ui/Tabs.astro';
import FormField from '../../components/ui/FormField.astro';
---
<BaseLayout title="Components — Design System" showFooterNav={false}>
  <main class="min-h-screen bg-ds-bg-page py-8">
    <Container>
      <PageHeader title="Components" description="UI primitives — variant × size × state 매트릭스" />

      <Section title="Button" level={2}>
        <Card>
          <span slot="header">Variant × Size</span>
          <div class="flex flex-wrap gap-3 mb-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="tertiary">Tertiary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
          <div class="flex flex-wrap gap-3 items-center mb-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          <div class="flex flex-wrap gap-3 mb-3">
            <Button disabled>Disabled</Button>
            <Button loading>Loading</Button>
            <Button iconLeft="📥">With icon</Button>
          </div>
          <pre class="bg-ds-bg-muted p-3 rounded-brand-sm text-ds-caption overflow-x-auto"><code>&lt;Button variant="primary" size="md"&gt;저장&lt;/Button&gt;</code></pre>
        </Card>
      </Section>

      <Section title="Badge" level={2}>
        <Card>
          <div class="flex flex-wrap gap-2 mb-3">
            <Badge variant="neutral">Neutral</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="success">저장됨</Badge>
            <Badge variant="warning">주의</Badge>
            <Badge variant="error">오류</Badge>
          </div>
        </Card>
      </Section>

      <Section title="Form" level={2}>
        <Card>
          <FormField label="이름" required helper="성을 제외한 이름만 입력">
            <Input id="example-name" placeholder="홍길동" />
          </FormField>
          <FormField label="직종">
            <Select id="example-role" options={[
              { value: '', label: '선택' },
              { value: 'rn', label: '간호사' },
              { value: 'pt', label: '물리치료사' },
            ]} />
          </FormField>
          <FormField label="메모">
            <Textarea id="example-memo" rows={3} placeholder="추가 메모" />
          </FormField>
          <FormField>
            <Checkbox id="example-agree" label="개인정보 수집에 동의합니다" />
          </FormField>
          <FormField label="성별">
            <div class="flex gap-4">
              <Radio name="example-gender" value="M" label="남성" />
              <Radio name="example-gender" value="F" label="여성" />
            </div>
          </FormField>
          <FormField label="알림">
            <Switch id="example-switch" label="이메일 알림 받기" />
          </FormField>
        </Card>
      </Section>

      <Section title="Alert" level={2}>
        <Card>
          <div class="flex flex-col gap-3">
            <Alert variant="info" title="안내">정보 메시지입니다.</Alert>
            <Alert variant="success" title="성공">저장이 완료되었습니다.</Alert>
            <Alert variant="warning" title="주의">시급이 평균보다 낮습니다.</Alert>
            <Alert variant="error" title="오류" dismissible>파일을 업로드하지 못했습니다.</Alert>
          </div>
        </Card>
      </Section>

      <Section title="Modal" level={2}>
        <Card>
          <Modal id="example-modal" size="md" title="삭제 확인" open>
            <p>정말 삭제하시겠습니까?</p>
            <Button slot="footer" variant="ghost">취소</Button>
            <Button slot="footer" variant="danger">삭제</Button>
          </Modal>
        </Card>
      </Section>

      <Section title="Tabs" level={2}>
        <Card>
          <Tabs items={[
            { id: 'home', label: '홈', icon: '🏠' },
            { id: 'pay', label: '급여', icon: '💰' },
            { id: 'leave', label: '휴가', icon: '🌴' },
          ]} activeId="home" variant="top" />
        </Card>
      </Section>
    </Container>
  </main>
</BaseLayout>
```

- [ ] **Step 6: `apps/web/src/pages/design-system/patterns.astro` 작성**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Container from '../../components/layout/Container.astro';
import Section from '../../components/layout/Section.astro';
import Card from '../../components/ui/Card.astro';
import Button from '../../components/ui/Button.astro';
import PageHeader from '../../components/patterns/PageHeader.astro';
import EmptyState from '../../components/patterns/EmptyState.astro';
import FormSection from '../../components/patterns/FormSection.astro';
import LoadingSkeleton from '../../components/patterns/LoadingSkeleton.astro';
import ErrorState from '../../components/patterns/ErrorState.astro';
import Stack from '../../components/layout/Stack.astro';
import Grid from '../../components/layout/Grid.astro';
import Divider from '../../components/layout/Divider.astro';
---
<BaseLayout title="Patterns — Design System" showFooterNav={false}>
  <main class="min-h-screen bg-ds-bg-page py-8">
    <Container>
      <PageHeader title="Layout & Patterns" description="페이지 단위의 반복 구조" />

      <Section title="PageHeader" level={2}>
        <Card padding="md">
          <PageHeader title="페이지 제목" description="설명 문구">
            <Button slot="actions" variant="primary">새로 만들기</Button>
          </PageHeader>
        </Card>
      </Section>

      <Section title="EmptyState" level={2}>
        <Card>
          <EmptyState icon="📭" title="아직 명세서가 없습니다" description="급여 탭에서 PDF를 업로드하면 자동으로 채워집니다.">
            <Button slot="action" variant="primary">명세서 업로드</Button>
          </EmptyState>
        </Card>
      </Section>

      <Section title="FormSection" level={2}>
        <Card>
          <FormSection title="기본 정보" description="필수로 입력하는 항목">
            <p class="text-ds-body-md">… 폼 필드 …</p>
          </FormSection>
          <FormSection title="추가 정보 (선택)" collapsible defaultOpen={false}>
            <p class="text-ds-body-md">… 펼쳐서 입력 …</p>
          </FormSection>
        </Card>
      </Section>

      <Section title="LoadingSkeleton" level={2}>
        <Card>
          <LoadingSkeleton count={3} height="20px" />
        </Card>
      </Section>

      <Section title="ErrorState" level={2}>
        <Card>
          <ErrorState title="데이터를 불러오지 못했습니다" message="네트워크를 확인하고 다시 시도해 주세요.">
            <Button slot="action" variant="secondary">다시 시도</Button>
          </ErrorState>
        </Card>
      </Section>

      <Section title="Layout primitives" level={2}>
        <Card>
          <Stack direction="row" gap={3}>
            <Button variant="primary">A</Button>
            <Button variant="secondary">B</Button>
            <Button variant="tertiary">C</Button>
          </Stack>
          <Divider />
          <Grid cols={3} gap={3}>
            <Card padding="sm"><p>1</p></Card>
            <Card padding="sm"><p>2</p></Card>
            <Card padding="sm"><p>3</p></Card>
          </Grid>
        </Card>
      </Section>
    </Container>
  </main>
</BaseLayout>
```

- [ ] **Step 7: `apps/web/src/pages/design-system/guidelines.astro` 작성**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Container from '../../components/layout/Container.astro';
import Section from '../../components/layout/Section.astro';
import Card from '../../components/ui/Card.astro';
import Alert from '../../components/ui/Alert.astro';
import PageHeader from '../../components/patterns/PageHeader.astro';
---
<BaseLayout title="Guidelines — Design System" showFooterNav={false}>
  <main class="min-h-screen bg-ds-bg-page py-8">
    <Container>
      <PageHeader title="Guidelines" description="새 페이지·기능을 만들 때 지켜야 할 규칙" />

      <Section title="규칙 7가지" level={2}>
        <Card>
          <ol class="list-decimal pl-6 space-y-2 text-ds-body-md text-ds-text-primary">
            <li>색상은 <code>--color-*</code> 토큰만 사용한다 (raw hex 금지).</li>
            <li>폰트 크기는 <code>text-ds-*</code> 또는 <code>--font-size-*</code> 만 사용한다.</li>
            <li>margin/padding 은 <code>--space-*</code> 또는 Tailwind <code>p-1..20</code> 만 사용한다.</li>
            <li>버튼은 <code>&lt;Button /&gt;</code> 컴포넌트만 사용한다.</li>
            <li>입력 필드는 <code>&lt;FormField /&gt;</code> 안에 <code>&lt;Input /&gt;</code> 또는 <code>&lt;Select /&gt;</code> 를 둔다.</li>
            <li>새 컴포넌트가 필요하면 <code>components/ui/</code> 또는 <code>components/patterns/</code> 에 추가하고 본 페이지에 등록한다.</li>
            <li>페이지는 <code>PageHeader</code> + <code>Container</code> + <code>Section</code> 패턴을 우선 사용한다.</li>
          </ol>
        </Card>
      </Section>

      <Section title="새 페이지 만들기 — 체크리스트" level={2}>
        <Card>
          <Alert variant="info">코드 PR 전에 아래 항목을 확인하세요.</Alert>
          <ul class="list-disc pl-6 mt-3 space-y-1 text-ds-body-md text-ds-text-primary">
            <li>색상이 토큰을 사용했는가? (raw hex 0개)</li>
            <li>폰트 크기가 typography scale 을 따르는가?</li>
            <li>간격이 spacing scale 을 따르는가?</li>
            <li>버튼은 <code>Button</code> 컴포넌트인가?</li>
            <li>입력은 <code>FormField + Input/Select</code> 인가?</li>
            <li>빈 화면 / 로딩 / 오류 상태가 정의되었는가?</li>
            <li>키보드 조작 가능한가? (Tab / Enter / Esc)</li>
            <li>focus 링이 보이는가?</li>
            <li>색상 대비가 충분한가? (WCAG AA)</li>
            <li>다크 모드에서도 정상인가?</li>
          </ul>
        </Card>
      </Section>

      <Section title="컴포넌트 선택 트리" level={2}>
        <Card>
          <pre class="text-ds-caption text-ds-text-secondary overflow-x-auto"><code>사용자 액션이 필요하다 → Button (variant: primary/secondary/tertiary/danger/ghost)
사용자 입력이 필요하다 → FormField + (Input/Select/Textarea/Checkbox/Radio/Switch)
정보 그룹화가 필요하다 → Card (header/body/footer slot)
짧은 라벨이 필요하다 → Badge (status 변경 표시)
사용자 안내가 필요하다 → Alert (variant: info/success/warning/error)
모달/확인 대화가 필요하다 → Modal (size: sm/md/lg)
탭 전환이 필요하다 → Tabs (variant: top/sub)
페이지 헤더 → PageHeader (actions slot)
빈 상태 → EmptyState
폼 그룹 → FormSection (collapsible 옵션)
로딩 중 → LoadingSkeleton
오류 화면 → ErrorState</code></pre>
        </Card>
      </Section>
    </Container>
  </main>
</BaseLayout>
```

### Task 7.2: usage / components / changelog 마크다운

- [ ] **Step 8: `docs/design-system/usage.md` 작성**

```markdown
# SNUH Mate Design System — Usage Guide

> 새 페이지·기능을 만들 때 참고하세요. 라이브 쇼케이스: `/design-system`

## 핵심 원칙

새 페이지·기능에서 임의 디자인을 만들지 않는다. 정해진 토큰·컴포넌트·패턴만 조합한다.

## 새 페이지 체크리스트

### 토큰
- [ ] 색상은 `--color-*` 토큰만 사용했는가? (raw hex 금지)
- [ ] 폰트 크기는 `text-ds-*` 유틸 또는 `--font-size-*` 만 사용했는가?
- [ ] 간격은 `--space-*` (4px 그리드) 만 사용했는가?
- [ ] radius / shadow 는 토큰을 사용했는가?

### 컴포넌트
- [ ] 버튼은 `<Button />` 컴포넌트인가?
- [ ] 입력은 `<FormField>` + `<Input/Select/Textarea>` 조합인가?
- [ ] 카드/박스는 `<Card />` 컴포넌트인가?
- [ ] 모달은 `<Modal />` 컴포넌트인가?
- [ ] 탭은 `<Tabs />` 컴포넌트인가?

### 패턴
- [ ] 페이지에 `<PageHeader />` 가 있는가?
- [ ] 빈 상태에 `<EmptyState />` 가 있는가?
- [ ] 로딩 중 `<LoadingSkeleton />` 또는 `aria-busy` 가 있는가?
- [ ] 오류 상태에 `<ErrorState />` 가 있는가?

### 접근성
- [ ] 키보드 조작 가능한가?
- [ ] focus 링이 보이는가?
- [ ] 폼 필드에 `<label>` 이 연결되었는가?
- [ ] 아이콘만 있는 버튼에 `aria-label` 이 있는가?
- [ ] 색상 대비 WCAG AA 이상인가?
- [ ] 다크 모드에서도 정상인가?

### 거버넌스
- [ ] inline `style="..."` 안 raw 값을 사용하지 않았는가?
- [ ] 새 컴포넌트가 필요하면 `components/ui/` 또는 `components/patterns/` 에 추가하고 `/design-system` 쇼케이스에 등록했는가?

## 컴포넌트 선택 트리

```
사용자 액션이 필요하다 → Button
사용자 입력이 필요하다 → FormField + Input/Select/Textarea/Checkbox/Radio/Switch
정보 그룹화가 필요하다 → Card
짧은 라벨이 필요하다 → Badge
사용자 안내가 필요하다 → Alert
모달/확인 대화가 필요하다 → Modal
탭 전환이 필요하다 → Tabs
페이지 헤더 → PageHeader
빈 상태 → EmptyState
폼 그룹 → FormSection
로딩 중 → LoadingSkeleton
오류 화면 → ErrorState
```
```

- [ ] **Step 9: `docs/design-system/components.md` 작성**

```markdown
# SNUH Mate Design System — Components

각 컴포넌트는 `/design-system/components` 라이브 쇼케이스에서 확인하세요.

## UI Primitives (13)

| 컴포넌트 | Variant | Size | 사용 시점 |
|---|---|---|---|
| Button | primary / secondary / tertiary / danger / ghost | sm / md / lg | 사용자 액션 트리거 |
| Badge | neutral / info / success / warning / error | sm / md | 상태 라벨 |
| Input | text / email / tel / number / date / password | (md) | 단일 줄 입력 |
| Select | — | (md) | 드롭다운 선택 |
| Textarea | — | (rows) | 다중 줄 입력 |
| Checkbox | — | — | 다중 선택 |
| Radio | — | — | 단일 선택 (그룹) |
| Switch | — | — | on/off 토글 |
| FormField | — | — | label + helper + error wrapper |
| Card | — | none / sm / md / lg padding | 콘텐츠 그룹 |
| Alert | info / success / warning / error | — | 사용자 안내 |
| Modal | — | sm / md / lg | 모달 / 확인 대화 |
| Tabs | top / sub | — | 탭 전환 |

## Layout (5)

| 컴포넌트 | 용도 |
|---|---|
| Container | 페이지 콘텐츠 폭 (sm/md/lg/full) |
| Stack | flex row/column + gap |
| Section | 헤딩 + 본문 그룹 |
| Grid | 균등 그리드 |
| Divider | 가로/세로 구분선 |

## Patterns (5)

| 패턴 | 용도 |
|---|---|
| PageHeader | 페이지 제목 + 설명 + actions |
| EmptyState | 데이터 없음 안내 |
| FormSection | 폼 필드 그룹 (collapsible 옵션) |
| LoadingSkeleton | 로딩 중 placeholder |
| ErrorState | 오류 안내 + 재시도 |

## 사용 금지

- raw `<button>` 직접 사용 금지 — `<Button />` 사용.
- `style="color: ..."` 직접 색 지정 금지 — token 사용.
- `padding: 13px` 같은 임의 값 금지 — spacing scale 사용.
- 새로운 모달/카드 스타일을 별도로 만들지 말 것 — 기존 컴포넌트 확장.
```

- [ ] **Step 10: `docs/design-system/changelog.md` 작성**

```markdown
# Design System Changelog

## 2026-04-28 — v0.1 (Initial)

신규:
- 4 token 파일 (primitive, semantic, spacing, typography)
- 13 UI 컴포넌트 (Button, Badge, Input, Select, Textarea, Checkbox, Radio, Switch, FormField, Card, Alert, Modal, Tabs)
- 5 layout 컴포넌트 (Container, Stack, Section, Grid, Divider)
- 5 pattern 컴포넌트 (PageHeader, EmptyState, FormSection, LoadingSkeleton, ErrorState)
- /design-system 쇼케이스 라우트 (4 sub-page)
- 거버넌스 lint (raw hex / inline style 금지)
- HomeIsland 레퍼런스 마이그레이션

호환:
- 기존 globals.css `.btn`, `.card`, `.badge`, `.modal-overlay` 등 클래스 유지.
- 기존 `brand-*` Tailwind utility 유지.

## 다음 단계

- 6 island (Profile, Payroll, Overtime, Leave, Reference, Settings, Feedback) 마이그레이션 — 별도 plan.
- Toast / Tooltip / Avatar 추가 — 별도 plan.
- Figma 라이브러리 동기화 — 별도 plan.
```

- [ ] **Step 11: 테스트 + 빌드 통과 확인**

Run: `pnpm vitest run tests/integration/design-system-showcase.test.js && pnpm --filter @snuhmate/web build`
Expected: PASS, 빌드 OK, `dist/design-system/index.html` 및 `dist/design-system/{tokens,components,patterns,guidelines}/index.html` 생성됨.

- [ ] **Step 12: 커밋**

Run:
```
git add apps/web/src/pages/design-system.astro apps/web/src/pages/design-system/ docs/design-system/ tests/integration/design-system-showcase.test.js
git commit -m "feat(ds-7): /design-system showcase route (4 sub-page) + usage/components/changelog docs"
```

---

## Slice 8: Governance Lint + HomeIsland Reference Migration

**Files:**
- Modify: `tests/integration/design-system-governance.test.js` (lint rule 추가)
- Modify: `apps/web/src/components/tabs/HomeIsland.astro` (신규 컴포넌트로 리팩토링)

### Task 8.1: 거버넌스 lint 규칙 추가

- [ ] **Step 1: lint 테스트 추가**

`tests/integration/design-system-governance.test.js` 파일 끝에 추가:

```javascript
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (p.endsWith('.astro')) files.push(p);
  }
  return files;
}

describe('Governance — design system lint', () => {
  // 본 lint 는 page-level + tabs island 만 대상.
  // 컴포넌트 정의 (ui/, layout/, patterns/) 는 토큰 사용이 정상이므로 면제.
  const TARGET_DIRS = [
    'apps/web/src/pages',
    'apps/web/src/components/tabs',
  ];
  const SKIP_PREFIX = ['apps/web/src/pages/design-system'];

  function getTargets() {
    const out = [];
    for (const d of TARGET_DIRS) {
      for (const f of walk(d)) {
        if (SKIP_PREFIX.some(s => f.startsWith(s))) continue;
        out.push(f);
      }
    }
    return out;
  }

  it('inline style 안 raw hex 금지 (HomeIsland 만 검증, 나머지 island 는 후속 plan)', () => {
    const files = getTargets().filter(f => f.includes('HomeIsland.astro'));
    const violations = [];
    const STYLE_RX = /style=["']([^"']*)["']/g;
    const HEX_RX = /#[0-9a-fA-F]{3,8}/;
    for (const f of files) {
      const src = readFileSync(f, 'utf-8');
      let m;
      while ((m = STYLE_RX.exec(src)) !== null) {
        const styleVal = m[1];
        if (HEX_RX.test(styleVal)) {
          violations.push(f + ': style="' + styleVal + '"');
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('inline style 안 px 단위 spacing/font-size 직접 값 금지 (HomeIsland)', () => {
    const files = getTargets().filter(f => f.includes('HomeIsland.astro'));
    const violations = [];
    const STYLE_RX = /style=["']([^"']*)["']/g;
    const RAW_PX_RX = /(font-size|padding|margin|gap):\s*\d+px/i;
    for (const f of files) {
      const src = readFileSync(f, 'utf-8');
      let m;
      while ((m = STYLE_RX.exec(src)) !== null) {
        const styleVal = m[1];
        const stripped = styleVal.replace(/var\([^)]*\)/g, '');
        if (RAW_PX_RX.test(stripped)) {
          violations.push(f + ': style="' + styleVal + '"');
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm vitest run tests/integration/design-system-governance.test.js`
Expected: FAIL — `HomeIsland.astro` 의 5개 inline style 중 raw hex/px 가 위반.

### Task 8.2: HomeIsland 리팩토링

- [ ] **Step 3: HomeIsland.astro 의 inline style 5개 위치 파악**

Run: `grep -n 'style="' apps/web/src/components/tabs/HomeIsland.astro`
Expected: 5 라인 위치 출력.

- [ ] **Step 4: 시각 baseline 캡처 (변경 전) — Playwright MCP 또는 수동**

CLAUDE.md 규약에 따라 Playwright MCP 사용:

```
mcp__plugin_playwright_playwright__browser_navigate(url='http://localhost:4321/app')
mcp__plugin_playwright_playwright__browser_take_screenshot(filename='/tmp/home-before.png', fullPage=true)
```

Playwright MCP 가 비활성이면 사용자에게 한 번 수동 캡처 요청.

- [ ] **Step 5: HomeIsland.astro 의 inline style → 신규 컴포넌트 / Tailwind utility 변환**

각 inline style 을 다음 패턴으로 교체:
- `style="background: #xxx"` → `class="bg-ds-bg-elevated"` 또는 의미에 맞는 ds.* color
- `style="padding: 12px"` → `class="p-3"` (4px 그리드 매핑: 4=p-1, 8=p-2, 12=p-3, 16=p-4, 20=p-5, 24=p-6, 32=p-8)
- `style="font-size: 12px"` → `class="text-ds-caption"`
- `style="font-size: 14px"` → `class="text-ds-body-md"`
- `style="display: flex; gap: 8px"` → `<Stack direction="row" gap={2}>...</Stack>` 또는 `class="flex gap-2"`
- `style="color: #xxx"` → `class="text-ds-status-info"` 등

엔지니어 가이드: 변환 시 시각 결과가 동일하도록 색/간격을 매핑하되, 기존이 임의 값이면 가장 가까운 토큰값으로 정규화 (이번 phase 의 목적은 통일).

- [ ] **Step 6: 변환 후 governance lint 통과 확인**

Run: `pnpm vitest run tests/integration/design-system-governance.test.js`
Expected: PASS — HomeIsland inline style 위반 0.

- [ ] **Step 7: 시각 baseline 캡처 (변경 후) + diff**

```
mcp__plugin_playwright_playwright__browser_navigate(url='http://localhost:4321/app')
mcp__plugin_playwright_playwright__browser_take_screenshot(filename='/tmp/home-after.png', fullPage=true)
```

`/tmp/home-before.png` vs `/tmp/home-after.png` 시각 diff 확인. 의도되지 않은 차이가 있으면 보고하고 사용자 결정 대기.

- [ ] **Step 8: 5 critical 회귀 가드 통과 확인**

Run: `pnpm test:integration && pnpm test:unit`
Expected: 모든 테스트 PASS (175+ unit / 37+ integration).

- [ ] **Step 9: HomeIsland 콘솔 에러 0건 검증**

```
mcp__plugin_playwright_playwright__browser_navigate(url='http://localhost:4321/app')
mcp__plugin_playwright_playwright__browser_console_messages()
```

Expected: error 0건.

- [ ] **Step 10: 커밋**

Run:
```
git add tests/integration/design-system-governance.test.js apps/web/src/components/tabs/HomeIsland.astro
git commit -m "feat(ds-8): governance lint + HomeIsland reference migration (inline style 5개 → 토큰/컴포넌트)"
```

- [ ] **Step 11: 최종 통합 검증**

Run: `pnpm test:unit && pnpm test:integration && pnpm --filter @snuhmate/web build`
Expected:
- unit ≥ 195 PASS (기존 175 + 신규 ~20)
- integration ≥ 41 PASS (기존 37 + 신규 4)
- 빌드 OK
- `dist/design-system/index.html` + 4 sub-page 생성

- [ ] **Step 12: PR 생성 (사용자 승인 후)**

`gh pr create` 호출. 본문은 별도 작성. 다음 정보 포함:
- Summary: 4 token + 23 컴포넌트 + 쇼케이스 + governance + HomeIsland reference
- Test plan: 위 Step 11 결과
- 스크린샷: /design-system, /design-system/tokens, /design-system/components 3장

---

## Self-Review Checklist (작성자 사후 점검)

- [x] **Spec coverage** — F1~F12 12개 deliverable 모두 task 매핑됨:
  - F1 (2-tier token) → Slice 1
  - F2 (spacing) → Slice 1+2
  - F3 (typography) → Slice 1+2
  - F4 (status) → Slice 1+2
  - F5 (focus-ring) → Slice 1+2
  - F6 (UI components) → Slice 3+4+5
  - F7 (layout) → Slice 6
  - F8 (patterns) → Slice 6
  - F9 (showcase) → Slice 7
  - F10 (governance) → Slice 8
  - F11 (HomeIsland reference) → Slice 8
  - F12 (usage guide) → Slice 7
- [x] **Placeholder scan** — TBD/TODO 없음, 모든 step 에 실제 코드/명령 포함.
- [x] **Type consistency** — props 이름 (variant, size, disabled, loading, fullWidth, iconLeft, iconRight) Slice 3 부터 끝까지 일관.
- [x] **Class 호환** — 신규 컴포넌트는 `.btn`, `.card`, `.badge`, `.modal-overlay`, `.modal-content`, `.form-group`, `.nav-tabs`, `.sub-tabs` legacy 클래스를 함께 출력 → 시각 회귀 0.
- [x] **다크 모드** — semantic.css 안 `html[data-theme="dark"]` block 으로 모든 신규 토큰 dark override.
- [x] **거버넌스 scope** — lint 는 HomeIsland.astro 만 우선 검증. 나머지 6 island 는 후속 plan.
