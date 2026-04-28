import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';

let src;
beforeAll(() => {
  src = readFileSync('apps/web/src/components/ui/Badge.astro', 'utf-8');
});

describe('Badge.astro', () => {
  it('variant: neutral/info/success/warning/error', () => {
    expect(src).toMatch(/variant\?:\s*['"]neutral['"]\s*\|\s*['"]info['"]\s*\|\s*['"]success['"]\s*\|\s*['"]warning['"]\s*\|\s*['"]error['"]/);
  });
  it('size: sm/md', () => {
    expect(src).toMatch(/size\?:\s*['"]sm['"]\s*\|\s*['"]md['"]/);
  });
  it('legacy .badge 클래스 호환 출력', () => {
    expect(src).toMatch(/\bbadge\b/);
  });
  it('각 variant 가 ds-status-*-bg / text-ds-status-* 토큰 사용', () => {
    expect(src).toMatch(/bg-ds-status-success-bg/);
    expect(src).toMatch(/text-ds-status-error/);
  });
  it('legacy variant 매핑: success→emerald, warning→amber, error→rose, info→indigo', () => {
    expect(src).toMatch(/success.*emerald/);
    expect(src).toMatch(/warning.*amber/);
    expect(src).toMatch(/error.*rose/);
    expect(src).toMatch(/info.*indigo/);
  });
  it('class 출력에 double space 없음 (neutral variant 케이스)', () => {
    // class={[...].filter(Boolean).join(' ')} 패턴 사용 검증
    expect(src).toMatch(/class=\{?\[.*\.filter\(Boolean\)\.join/s);
  });
});
