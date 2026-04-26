// Phase 2-B 진입 기준: Layer 0 모듈이 ESM import 로 동작
// data.js / regulation-constants.js / shared-utils.js 변환 후 모두 PASS.
import { describe, it, expect } from 'vitest';

describe('Layer 0 — Foundation ESM exports', () => {
  it('data.js: import { DATA, DATA_STATIC } 동작', async () => {
    const { DATA, DATA_STATIC } = await import('../../data.js');
    expect(DATA).toBeDefined();
    expect(DATA_STATIC).toBeDefined();
    expect(DATA.allowances).toBeDefined();
    expect(DATA.allowances.overtimeRates).toBeDefined();
  });

  it('regulation-constants.js: import { ORDINARY_WAGE_HOURS, ... } 동작', async () => {
    const RC = await import('../../regulation-constants.js');
    expect(RC.ORDINARY_WAGE_HOURS).toBe(209);
    expect(RC.OVERTIME_UNIT_MINUTES).toBe(15);
    expect(RC.OVERTIME_MULTIPLIER).toBe(1.5);
  });

  it('shared-utils.js: import { escapeHtml } 동작', async () => {
    const { escapeHtml } = await import('../../shared-utils.js');
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml(null)).toBe('');
  });
});
