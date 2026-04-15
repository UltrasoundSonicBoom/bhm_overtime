import { useState, useCallback, useMemo } from "react";

export interface ScheduleCell {
  nurseId: number;
  date: number;
  shift: "day" | "evening" | "night" | "off";
}

export interface ScheduleChange {
  timestamp: number;
  nurseId: number;
  date: number;
  oldShift: "day" | "evening" | "night" | "off";
  newShift: "day" | "evening" | "night" | "off";
}

export interface ScheduleEditorState {
  schedule: ScheduleCell[];
  originalSchedule: ScheduleCell[];
  changes: ScheduleChange[];
  hasChanges: boolean;
  changeCount: number;
}

export function useScheduleEditor(initialSchedule: ScheduleCell[] = []) {
  const [schedule, setSchedule] = useState<ScheduleCell[]>(initialSchedule);
  const [originalSchedule] = useState<ScheduleCell[]>(initialSchedule);
  const [changes, setChanges] = useState<ScheduleChange[]>([]);

  const getShift = useCallback(
    (nurseId: number, date: number): "day" | "evening" | "night" | "off" => {
      const cell = schedule.find((c) => c.nurseId === nurseId && c.date === date);
      return cell?.shift || "off";
    },
    [schedule]
  );

  const updateShift = useCallback(
    (nurseId: number, date: number, newShift: "day" | "evening" | "night" | "off") => {
      const oldShift = getShift(nurseId, date);

      if (oldShift === newShift) return; // No change

      // Update schedule
      setSchedule((prev) => {
        const existing = prev.find((c) => c.nurseId === nurseId && c.date === date);
        if (existing) {
          return prev.map((c) =>
            c.nurseId === nurseId && c.date === date ? { ...c, shift: newShift } : c
          );
        } else {
          return [...prev, { nurseId, date, shift: newShift }];
        }
      });

      // Track change
      setChanges((prev) => [
        ...prev,
        {
          timestamp: Date.now(),
          nurseId,
          date,
          oldShift,
          newShift,
        },
      ]);
    },
    [getShift]
  );

  const swapShifts = useCallback(
    (
      nurse1Id: number,
      date1: number,
      nurse2Id: number,
      date2: number
    ) => {
      const shift1 = getShift(nurse1Id, date1);
      const shift2 = getShift(nurse2Id, date2);

      updateShift(nurse1Id, date1, shift2);
      updateShift(nurse2Id, date2, shift1);
    },
    [getShift, updateShift]
  );

  const reset = useCallback(() => {
    setSchedule(JSON.parse(JSON.stringify(originalSchedule)));
    setChanges([]);
  }, [originalSchedule]);

  const undo = useCallback(() => {
    if (changes.length === 0) return;

    const lastChange = changes[changes.length - 1];
    setSchedule((prev) =>
      prev.map((c) =>
        c.nurseId === lastChange.nurseId && c.date === lastChange.date
          ? { ...c, shift: lastChange.oldShift }
          : c
      )
    );
    setChanges((prev) => prev.slice(0, -1));
  }, [changes]);

  const hasChanges = useMemo(() => {
    return changes.length > 0;
  }, [changes]);

  const changeCount = useMemo(() => {
    return changes.length;
  }, [changes]);

  const getChangesSummary = useCallback(() => {
    const summary = {
      totalChanges: changes.length,
      byNurse: new Map<number, number>(),
      byShift: {
        day: 0,
        evening: 0,
        night: 0,
        off: 0,
      },
    };

    changes.forEach((change) => {
      const count = (summary.byNurse.get(change.nurseId) || 0) + 1;
      summary.byNurse.set(change.nurseId, count);
      summary.byShift[change.newShift]++;
    });

    return summary;
  }, [changes]);

  return {
    schedule,
    originalSchedule,
    changes,
    hasChanges,
    changeCount,
    getShift,
    updateShift,
    swapShifts,
    reset,
    undo,
    getChangesSummary,
  };
}
