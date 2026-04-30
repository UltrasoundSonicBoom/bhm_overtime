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
    for (const name of ['Button', 'Badge', 'Input', 'Select', 'Textarea', 'Checkbox', 'Radio', 'Switch', 'Card', 'Alert', 'Modal', 'Tabs', 'FormField']) {
      expect(c).toContain('import ' + name + ' from');
    }
  });
  it('patterns page 가 layout + patterns 컴포넌트 import', () => {
    const p = readFileSync('apps/web/src/pages/design-system/patterns.astro', 'utf-8');
    for (const name of ['Container', 'Stack', 'Grid', 'Divider', 'PageHeader', 'EmptyState', 'FormSection', 'LoadingSkeleton', 'ErrorState']) {
      expect(p).toContain('import ' + name + ' from');
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
    expect(u).toContain('동적 DOM');
    expect(u).toContain('bg-ds-*');
    expect(u).toContain('getComputedStyle()');
  });
  it('docs/design-system/components.md 존재', () => {
    expect(existsSync('docs/design-system/components.md')).toBe(true);
  });
  it('docs/design-system/changelog.md 존재 + Initial 표기', () => {
    expect(existsSync('docs/design-system/changelog.md')).toBe(true);
    const cl = readFileSync('docs/design-system/changelog.md', 'utf-8');
    expect(cl).toMatch(/Initial|v0\.1/);
  });
});
