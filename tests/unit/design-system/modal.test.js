import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
let src; beforeAll(() => { src = readFileSync('apps/web/src/components/ui/Modal.astro', 'utf-8'); });

describe('Modal.astro', () => {
  it('id required + size: sm/md/lg', () => {
    expect(src).toMatch(/id:\s*string/);
    expect(src).toMatch(/size\?:\s*['"]sm['"]\s*\|\s*['"]md['"]\s*\|\s*['"]lg['"]/);
  });
  it('role="dialog" + aria-modal="true" + aria-labelledby', () => {
    expect(src).toMatch(/role=["']dialog["']/);
    expect(src).toMatch(/aria-modal=["']true["']/);
    expect(src).toMatch(/aria-labelledby/);
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
