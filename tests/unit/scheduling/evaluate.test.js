import { describe, expect, it } from 'vitest';
import { evaluateSchedule, normalizeImportSnapshot, SNUH_NURSE_MVP_RULE_PACK } from '../../../packages/scheduling/src/index.js';

describe('evaluateSchedule', () => {
  it('blocks N-OFF-D recovery pattern and summarizes issues', () => {
    const snapshot = normalizeImportSnapshot({
      teamId: 'ward-101',
      period: '2026-05',
      rows: [
        { employeeId: 'n1', employeeName: '김민지', days: { 1: 'N', 2: 'O', 3: 'D' } },
      ],
    });

    const result = evaluateSchedule(snapshot, SNUH_NURSE_MVP_RULE_PACK);
    expect(result.summary.block).toBe(1);
    expect(result.summary.canPublish).toBe(false);
    expect(result.issues[0]).toMatchObject({
      ruleId: 'snuh.nurse.no_n_off_d',
      severity: 'block',
      employeeId: 'n1',
    });
  });
});
