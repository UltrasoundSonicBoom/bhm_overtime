import { describe, expect, it } from 'vitest';
import { normalizeImportSnapshot } from '../../../packages/scheduling/src/import-normalize.js';

describe('normalizeImportSnapshot', () => {
  it('normalizes parser rows into immutable schedule snapshot assignments', () => {
    const snapshot = normalizeImportSnapshot({
      teamId: 'ward-101',
      period: '2026-05',
      source: { type: 'csv', name: 'ward-101.csv' },
      rows: [
        { employeeId: 'n1', employeeName: '김민지', days: { 1: 'D', 2: 'E', 3: 'N', 4: 'O' } },
      ],
    });

    expect(snapshot.teamId).toBe('ward-101');
    expect(snapshot.assignments).toHaveLength(4);
    expect(snapshot.assignments[0]).toMatchObject({
      cellId: 'ward-101:2026-05:n1:01',
      employeeId: 'n1',
      date: '2026-05-01',
      dutyCode: 'D',
    });
    expect(snapshot.source).toMatchObject({ type: 'csv', name: 'ward-101.csv' });
  });
});
