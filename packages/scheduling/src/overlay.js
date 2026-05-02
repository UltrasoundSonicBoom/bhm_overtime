import { clonePlain, deepFreeze, normalizeDutyCode } from './schema.js';

function assertOverlay(overlay) {
  if (!overlay || typeof overlay !== 'object') {
    throw new TypeError('applyScheduleOverlay requires an overlay object');
  }
  if (!overlay.actorId) {
    throw new TypeError('applyScheduleOverlay requires actorId');
  }
  if (!overlay.reason) {
    throw new TypeError('applyScheduleOverlay requires reason');
  }
  if (!Array.isArray(overlay.changes)) {
    throw new TypeError('applyScheduleOverlay requires changes');
  }
}

export function applyScheduleOverlay(snapshot, overlay) {
  if (!snapshot || !Array.isArray(snapshot.assignments)) {
    throw new TypeError('applyScheduleOverlay requires a schedule snapshot');
  }
  assertOverlay(overlay);

  const changesByCellId = new Map();
  for (const change of overlay.changes) {
    if (!change?.cellId) {
      throw new TypeError('Every overlay change requires cellId');
    }
    changesByCellId.set(change.cellId, {
      ...change,
      dutyCode: normalizeDutyCode(change.dutyCode),
    });
  }

  const assignments = snapshot.assignments.map(assignment => {
    const change = changesByCellId.get(assignment.cellId);
    if (!change) return { ...assignment };

    return {
      ...assignment,
      dutyCode: change.dutyCode,
      overlay: {
        overlayId: overlay.overlayId,
        actorId: overlay.actorId,
        reason: overlay.reason,
      },
    };
  });

  const normalizedOverlay = {
    overlayId: overlay.overlayId ?? `overlay:${snapshot.snapshotId}:${snapshot.overlays?.length ?? 0}`,
    actorId: String(overlay.actorId),
    reason: String(overlay.reason),
    changes: overlay.changes.map(change => ({
      ...clonePlain(change),
      dutyCode: normalizeDutyCode(change.dutyCode),
    })),
  };

  return deepFreeze({
    ...snapshot,
    assignments,
    overlays: [...(snapshot.overlays ?? []), normalizedOverlay],
  });
}
