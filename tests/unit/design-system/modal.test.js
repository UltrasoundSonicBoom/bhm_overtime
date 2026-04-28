import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
let src; beforeAll(() => { src = readFileSync('apps/web/src/components/ui/Modal.astro', 'utf-8'); });

describe('Modal.astro', () => {
  it('id required + size: sm/md/lg', () => {
    expect(src).toMatch(/id:\s*string/);
    expect(src).toMatch(/size\?:\s*['"]sm['"]\s*\|\s*['"]md['"]\s*\|\s*['"]lg['"]/);
  });
  it('role="dialog" + aria-modal="true"', () => {
    expect(src).toMatch(/role=["']dialog["']/);
    expect(src).toMatch(/aria-modal=["']true["']/);
  });
  it('aria-labelledby 조건부 (title 있을 때만) + aria-label 폴백', () => {
    // aria-labelledby={title ? titleId : undefined} 패턴
    expect(src).toMatch(/aria-labelledby=\{\s*title\s*\?/);
    // aria-label fallback when title undefined
    expect(src).toMatch(/aria-label=\{\s*title\s*\?\s*undefined/);
  });
  it('legacy .modal-overlay / .modal-content 호환', () => {
    expect(src).toMatch(/\bmodal-overlay\b/);
    expect(src).toMatch(/\bmodal-content\b/);
  });
  it('open boolean prop + active 클래스 토글', () => {
    expect(src).toMatch(/open\?:\s*boolean/);
    expect(src).toMatch(/\bactive\b/);
  });
  it('footer slot 지원', () => {
    expect(src).toMatch(/<slot\s+name=["']footer["']/);
  });
});
