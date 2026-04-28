import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';

let cfg;
beforeAll(() => {
  cfg = readFileSync('apps/web/tailwind.config.js', 'utf-8');
});

describe('Tailwind config — module loadability', () => {
  it('tailwind.config.js loads as a valid ES module with default export', async () => {
    // Resolve absolute path so test works regardless of cwd
    const cfgPath = resolve(process.cwd(), 'apps/web/tailwind.config.js');
    const mod = await import(cfgPath);
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('object');
    expect(Array.isArray(mod.default.content)).toBe(true);
    expect(mod.default.theme).toBeDefined();
    expect(mod.default.theme.extend).toBeDefined();
  });
});

describe('Tailwind config — design system extensions', () => {
  it('theme.extend.spacing 안 --space-* token 참조', () => {
    expect(cfg).toMatch(/spacing:\s*\{[^}]*'1':\s*'var\(--space-1\)'/s);
    expect(cfg).toMatch(/'12':\s*'var\(--space-12\)'/);
  });
  it('theme.extend.fontSize 안 ds-* 키 10개 모두 정의', () => {
    for (const k of ['ds-display', 'ds-h1', 'ds-h2', 'ds-h3', 'ds-h4', 'ds-body-lg', 'ds-body-md', 'ds-body-sm', 'ds-label', 'ds-caption']) {
      expect(cfg).toMatch(new RegExp("'" + k + "':"));
    }
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
  it('ring tokens (focus-ring 토큰 참조)', () => {
    expect(cfg).toMatch(/ringColor:\s*\{[^}]*'ds-focus':\s*'var\(--focus-ring-color\)'/s);
    expect(cfg).toMatch(/ringWidth:\s*\{[^}]*'ds':\s*'var\(--focus-ring-width\)'/s);
    expect(cfg).toMatch(/ringOffsetWidth:\s*\{[^}]*'ds':\s*'var\(--focus-ring-offset\)'/s);
  });
});

describe('Tailwind JIT — extended utilities present in dist CSS (build smoke)', () => {
  // 이 테스트는 build 후 dist/_astro/*.css 를 읽어서 extended utility 가
  // 실제로 generate 되었는지 확인한다. build 가 없으면 skip.
  it('dist CSS 에 gap-12 / my-4 / mx-4 / grid-cols-3 등 extended class 존재 (Slice 6 JIT 검증)', () => {
    const distDir = 'apps/web/dist/_astro';
    if (!existsSync(distDir)) {
      console.warn('[skip] dist 없음 — pnpm --filter @snuhmate/web build 후 다시 실행하세요.');
      return;
    }
    const files = readdirSync(distDir).filter(f => f.endsWith('.css'));
    if (files.length === 0) {
      console.warn('[skip] dist CSS 없음.');
      return;
    }
    const allCss = files.map(f => readFileSync(join(distDir, f), 'utf-8')).join('\n');
    // Stack/Grid/Divider 의 explicit map 으로 인해 generate 되어야 하는 utility
    for (const cls of ['.gap-12', '.my-4', '.mx-4', '.grid-cols-3']) {
      expect(allCss).toContain(cls);
    }
  });
});
