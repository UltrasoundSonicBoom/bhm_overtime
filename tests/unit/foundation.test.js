// Phase 2-B 진입 기준: Layer 0 모듈이 ESM import 로 동작
// data.js / regulation-constants.js / shared-utils.js 변환 후 모두 PASS.
import { describe, it, expect } from 'vitest';

describe('Layer 0 — Foundation ESM exports', () => {
  it('@snuhmate/data: import { DATA, DATA_STATIC } 동작', async () => {
    const { DATA, DATA_STATIC } = await import('@snuhmate/data');
    expect(DATA).toBeDefined();
    expect(DATA_STATIC).toBeDefined();
    expect(DATA.allowances).toBeDefined();
    expect(DATA.allowances.overtimeRates).toBeDefined();
  });

  it('@snuhmate/regulation-constants: import { ORDINARY_WAGE_HOURS, ... } 동작', async () => {
    const RC = await import('@snuhmate/regulation-constants');
    expect(RC.ORDINARY_WAGE_HOURS).toBe(209);
    expect(RC.OVERTIME_UNIT_MINUTES).toBe(15);
    expect(RC.OVERTIME_MULTIPLIER).toBe(1.5);
  });

  it('@snuhmate/shared-utils: import { escapeHtml } 동작', async () => {
    const { escapeHtml } = await import('@snuhmate/shared-utils');
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml(null)).toBe('');
  });
});
