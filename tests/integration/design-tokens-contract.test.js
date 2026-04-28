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
