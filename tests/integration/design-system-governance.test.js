import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

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
