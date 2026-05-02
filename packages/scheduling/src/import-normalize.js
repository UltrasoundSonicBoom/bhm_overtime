import { clonePlain, deepFreeze, normalizeDayKey, normalizeDutyCode, toIsoDate } from './schema.js';

function assertImportInput(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError('normalizeImportSnapshot requires an input object');
  }
  if (!input.teamId) {
    throw new TypeError('normalizeImportSnapshot requires teamId');
  }
  if (!input.period) {
    throw new TypeError('normalizeImportSnapshot requires period');
  }
  if (!Array.isArray(input.rows)) {
    throw new TypeError('normalizeImportSnapshot requires rows');
  }
}

function stableSnapshotId(teamId, period, assignments) {
  const identity = assignments
    .map(assignment => `${assignment.employeeId}:${assignment.date}:${assignment.dutyCode}`)
    .join('|');
  let hash = 0;
  for (const char of identity) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) >>> 0;
  }
  return `${teamId}:${period}:${hash.toString(36)}`;
}

function normalizeImportedAt(input) {
  const importedAt = input.importedAt ?? input.source?.importedAt ?? `${input.period}-01T00:00:00.000Z`;
  return new Date(importedAt).toISOString();
}

export function normalizeImportSnapshot(input) {
  assertImportInput(input);

  const teamId = String(input.teamId).trim();
  const period = String(input.period).trim();
  const assignments = [];

  for (const row of input.rows) {
    const employeeId = String(row?.employeeId ?? '').trim();
    const employeeName = String(row?.employeeName ?? '').trim();
    const days = row?.days ?? {};

    for (const day of Object.keys(days).sort((a, b) => Number(a) - Number(b))) {
      const dutyCode = normalizeDutyCode(days[day]);
      if (!dutyCode) continue;

      const dayKey = normalizeDayKey(day);
      assignments.push({
        cellId: `${teamId}:${period}:${employeeId || 'missing'}:${dayKey}`,
        teamId,
        period,
        employeeId,
        employeeName,
        date: toIsoDate(period, dayKey),
        day: Number(dayKey),
        dutyCode,
      });
    }
  }

  const snapshot = {
    snapshotId: stableSnapshotId(teamId, period, assignments),
    teamId,
    period,
    source: clonePlain(input.source ?? { type: 'manual' }),
    importedAt: normalizeImportedAt({ ...input, period }),
    assignments,
    originalRows: clonePlain(input.rows),
    overlays: [],
  };

  return deepFreeze(snapshot);
}
