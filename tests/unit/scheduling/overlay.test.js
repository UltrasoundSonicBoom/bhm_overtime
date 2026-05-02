import { describe, expect, it } from 'vitest';
import { applyScheduleOverlay, normalizeImportSnapshot } from '../../../packages/scheduling/src/index.js';

describe('applyScheduleOverlay', () => {
  it('creates a candidate schedule without mutating the imported snapshot', () => {
    const snapshot = normalizeImportSnapshot({
      teamId: 'ward-101',
      period: '2026-05',
      rows: [{ employeeId: 'n1', employeeName: '김민지', days: { 1: 'D' } }],
    });
    const originalDuty = snapshot.assignments[0].dutyCode;

    const candidate = applyScheduleOverlay(snapshot, {
      overlayId: 'ov1',
      actorId: 'manager1',
      reason: '야간 회복 확보',
      changes: [{ cellId: snapshot.assignments[0].cellId, dutyCode: 'OFF' }],
    });

    expect(snapshot.assignments[0].dutyCode).toBe(originalDuty);
    expect(candidate.assignments[0].dutyCode).toBe('OFF');
    expect(candidate.overlays[0]).toMatchObject({ overlayId: 'ov1', actorId: 'manager1' });
  });
});
