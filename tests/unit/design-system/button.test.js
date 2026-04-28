// Button 컴포넌트 contract — variant/size/state 출력 클래스 검증
// Astro container API 가 워크스페이스에서 사용 불가 → .astro source text 검증으로 대체.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';

let src;
beforeAll(() => {
  src = readFileSync('apps/web/src/components/ui/Button.astro', 'utf-8');
});

describe('Button.astro', () => {
  it('5 variant Props 정의: primary/secondary/tertiary/danger/ghost', () => {
    expect(src).toMatch(/variant\?:\s*['"]primary['"]\s*\|\s*['"]secondary['"]\s*\|\s*['"]tertiary['"]\s*\|\s*['"]danger['"]\s*\|\s*['"]ghost['"]/);
  });
  it('3 size Props 정의: sm/md/lg', () => {
    expect(src).toMatch(/size\?:\s*['"]sm['"]\s*\|\s*['"]md['"]\s*\|\s*['"]lg['"]/);
  });
  it('disabled / loading / fullWidth Props 정의', () => {
    expect(src).toMatch(/disabled\?:\s*boolean/);
    expect(src).toMatch(/loading\?:\s*boolean/);
    expect(src).toMatch(/fullWidth\?:\s*boolean/);
  });
  it('iconLeft / iconRight prop 지원', () => {
    expect(src).toMatch(/iconLeft\?:\s*string/);
    expect(src).toMatch(/iconRight\?:\s*string/);
  });
  it('출력 root class 가 .btn (legacy 호환) + ds-button (신규) 둘 다 포함', () => {
    expect(src).toMatch(/\bbtn\b/);
    expect(src).toMatch(/\bds-button\b/);
  });
  it('focus-visible ring 출력', () => {
    expect(src).toMatch(/focus-visible:ring-ds|focus:ring-ds/);
  });
  it('disabled / loading 시 aria-disabled / aria-busy 출력', () => {
    expect(src).toMatch(/aria-disabled/);
    expect(src).toMatch(/aria-busy/);
  });
  it('각 variant 클래스가 ds.* 토큰 참조', () => {
    expect(src).toMatch(/bg-ds-brand-primary/);
    expect(src).toMatch(/bg-ds-status-error/);
  });
});
