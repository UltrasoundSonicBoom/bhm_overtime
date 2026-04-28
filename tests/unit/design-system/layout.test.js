import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
const read = (p) => readFileSync(p, 'utf-8');

describe('Container', () => {
  let s; beforeAll(() => { s = read('apps/web/src/components/layout/Container.astro'); });
  it('size: sm/md/lg/full', () => {
    expect(s).toMatch(/size\?:\s*['"]sm['"]\s*\|\s*['"]md['"]\s*\|\s*['"]lg['"]\s*\|\s*['"]full['"]/);
  });
  it('mx-auto + px-4 (콘텐츠 폭 + horizontal padding)', () => {
    expect(s).toMatch(/mx-auto/);
    expect(s).toMatch(/px-4/);
  });
});

describe('Stack', () => {
  let s; beforeAll(() => { s = read('apps/web/src/components/layout/Stack.astro'); });
  it('direction + gap + align/justify Props', () => {
    expect(s).toMatch(/direction\?:\s*['"]row['"]\s*\|\s*['"]column['"]/);
    expect(s).toMatch(/gap\?:\s*number/);
    expect(s).toMatch(/align\?:\s*['"]start['"]\s*\|\s*['"]center['"]\s*\|\s*['"]end['"]\s*\|\s*['"]stretch['"]/);
    expect(s).toMatch(/justify\?:\s*['"]start['"]\s*\|\s*['"]center['"]\s*\|\s*['"]end['"]\s*\|\s*['"]between['"]\s*\|\s*['"]around['"]/);
  });
  it('flex root + dir/align/justify class 매핑', () => {
    expect(s).toMatch(/\bflex\b/);
    expect(s).toMatch(/flex-row/);
    expect(s).toMatch(/flex-col/);
  });
});

describe('Section', () => {
  let s; beforeAll(() => { s = read('apps/web/src/components/layout/Section.astro'); });
  it('title prop + level 2|3 + heading semantic 출력', () => {
    expect(s).toMatch(/title\?:\s*string/);
    expect(s).toMatch(/level\?:\s*2\s*\|\s*3/);
    expect(s).toMatch(/<h2/);
    expect(s).toMatch(/<h3/);
  });
  it('description prop + spacing variant', () => {
    expect(s).toMatch(/description\?:\s*string/);
    expect(s).toMatch(/spacing\?:\s*['"]sm['"]\s*\|\s*['"]md['"]\s*\|\s*['"]lg['"]/);
  });
});

describe('Grid', () => {
  let s; beforeAll(() => { s = read('apps/web/src/components/layout/Grid.astro'); });
  it('cols prop + gap + responsive boolean', () => {
    expect(s).toMatch(/cols\?:\s*number/);
    expect(s).toMatch(/gap\?:\s*number/);
    expect(s).toMatch(/responsive\?:\s*boolean/);
  });
  it('grid display + grid-cols 토큰', () => {
    expect(s).toMatch(/\bgrid\b/);
    expect(s).toMatch(/grid-cols-/);
  });
});

describe('Divider', () => {
  let s; beforeAll(() => { s = read('apps/web/src/components/layout/Divider.astro'); });
  it('orientation: horizontal/vertical', () => {
    expect(s).toMatch(/orientation\?:\s*['"]horizontal['"]\s*\|\s*['"]vertical['"]/);
  });
  it('role="separator" + aria-orientation', () => {
    expect(s).toMatch(/role=["']separator["']/);
    expect(s).toMatch(/aria-orientation/);
  });
});
