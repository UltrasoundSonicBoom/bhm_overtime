import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
let src; beforeAll(() => { src = readFileSync('apps/web/src/components/ui/Tabs.astro', 'utf-8'); });

describe('Tabs.astro', () => {
  it('items prop: TabItem[] 정의', () => {
    expect(src).toMatch(/items:\s*TabItem\[\]/);
  });
  it('TabItem interface: id/label/icon', () => {
    expect(src).toMatch(/interface\s+TabItem\s*\{[\s\S]*?id:\s*string[\s\S]*?label:\s*string/);
  });
  it('role="tablist" + role="tab"', () => {
    expect(src).toMatch(/role=["']tablist["']/);
    expect(src).toMatch(/role=["']tab["']/);
  });
  it('variant: top/sub (legacy .nav-tabs / .sub-tabs 매핑)', () => {
    expect(src).toMatch(/variant\?:\s*['"]top['"]\s*\|\s*['"]sub['"]/);
    expect(src).toMatch(/\b(nav-tabs|sub-tabs)\b/);
  });
  it('aria-selected string 캐스팅 + aria-controls', () => {
    expect(src).toMatch(/aria-selected=\{[^}]*\?\s*['"]true['"]\s*:\s*['"]false['"]\}/);
    expect(src).toMatch(/aria-controls/);
  });
  it('focus-visible ring 토큰', () => {
    expect(src).toMatch(/focus-visible:ring-ds/);
  });
});
