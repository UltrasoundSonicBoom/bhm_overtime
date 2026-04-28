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
  it('ring tokens (focus-ring 토큰 참조)', () => {
    expect(cfg).toMatch(/ringColor:\s*\{[^}]*'ds-focus':\s*'var\(--focus-ring-color\)'/s);
    expect(cfg).toMatch(/ringWidth:\s*\{[^}]*'ds':\s*'var\(--focus-ring-width\)'/s);
    expect(cfg).toMatch(/ringOffsetWidth:\s*\{[^}]*'ds':\s*'var\(--focus-ring-offset\)'/s);
  });
});
