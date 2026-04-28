import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
let src; beforeAll(() => { src = readFileSync('apps/web/src/components/ui/Alert.astro', 'utf-8'); });

describe('Alert.astro', () => {
  it('variant: info/success/warning/error', () => {
    expect(src).toMatch(/variant\?:\s*['"]info['"]\s*\|\s*['"]success['"]\s*\|\s*['"]warning['"]\s*\|\s*['"]error['"]/);
  });
  it('role="alert" + aria-live', () => {
    expect(src).toMatch(/role=["']alert["']/);
    expect(src).toMatch(/aria-live=["'](polite|assertive)["']/);
  });
  it('dismissible boolean prop', () => {
    expect(src).toMatch(/dismissible\?:\s*boolean/);
  });
  it('icon prop (optional, default per variant)', () => {
    expect(src).toMatch(/icon\?:\s*string/);
  });
  it('각 variant 가 ds-status-*-bg + text-ds-status-* 토큰', () => {
    expect(src).toMatch(/bg-ds-status-success-bg/);
    expect(src).toMatch(/text-ds-status-error/);
    expect(src).toMatch(/border-ds-status-warning/);
  });
});
