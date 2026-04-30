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
  it('id / class pass-through 지원', () => {
    expect(src).toMatch(/id\?:\s*string/);
    expect(src).toMatch(/class\?:\s*string/);
    expect(src).toMatch(/<Tag id=\{id\}/);
    expect(src).toMatch(/extraClass/);
  });
  it('elevated boolean prop', () => {
    expect(src).toMatch(/elevated\?:\s*boolean/);
  });
  it('padding variant: none/sm/md/lg', () => {
    expect(src).toMatch(/padding\?:\s*['"]none['"]\s*\|\s*['"]sm['"]\s*\|\s*['"]md['"]\s*\|\s*['"]lg['"]/);
  });
  it('as prop: div/section/article (semantic root)', () => {
    expect(src).toMatch(/as\?:\s*['"]div['"]\s*\|\s*['"]section['"]\s*\|\s*['"]article['"]/);
  });
});
