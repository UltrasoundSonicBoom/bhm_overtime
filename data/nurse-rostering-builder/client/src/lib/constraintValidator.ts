export interface ScheduleCell {
  nurseId: number;
  date: number;
  shift: "day" | "evening" | "night" | "off";
}

export interface ConstraintViolation {
  type: string;
  severity: "error" | "warning" | "info";
  nurseId: number;
  dates: number[];
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  violations: ConstraintViolation[];
  summary: {
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
}

export class ConstraintValidator {
  private schedule: ScheduleCell[];
  private daysInMonth: number;

  constructor(schedule: ScheduleCell[], daysInMonth: number = 30) {
    this.schedule = schedule;
    this.daysInMonth = daysInMonth;
  }

  validate(): ValidationResult {
    const violations: ConstraintViolation[] = [];

    // Get unique nurse IDs
    const nurseIds = Array.from(new Set(this.schedule.map((c) => c.nurseId)));

    nurseIds.forEach((nurseId) => {
      violations.push(...this.validateMinimumRestDays(nurseId));
      violations.push(...this.validateConsecutiveNightShifts(nurseId));
      violations.push(...this.validateMinimumRestHours(nurseId));
      violations.push(...this.validateWeekendDistribution(nurseId));
    });

    const summary = {
      errorCount: violations.filter((v) => v.severity === "error").length,
      warningCount: violations.filter((v) => v.severity === "warning").length,
      infoCount: violations.filter((v) => v.severity === "info").length,
    };

    return {
      isValid: summary.errorCount === 0,
      violations,
      summary,
    };
  }

  private getShift(nurseId: number, date: number): "day" | "evening" | "night" | "off" {
    const cell = this.schedule.find((c) => c.nurseId === nurseId && c.date === date);
    return cell?.shift || "off";
  }

  private validateMinimumRestDays(nurseId: number): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    let consecutiveWorkDays = 0;
    let workStartDate = 0;

    for (let date = 1; date <= this.daysInMonth; date++) {
      const shift = this.getShift(nurseId, date);

      if (shift !== "off") {
        if (consecutiveWorkDays === 0) {
          workStartDate = date;
        }
        consecutiveWorkDays++;
      } else {
        if (consecutiveWorkDays > 0 && consecutiveWorkDays > 6) {
          violations.push({
            type: "minimum_rest_days",
            severity: "error",
            nurseId,
            dates: Array.from(
              { length: consecutiveWorkDays },
              (_, i) => workStartDate + i
            ),
            message: `연속 근무 ${consecutiveWorkDays}일 (최대 6일)`,
          });
        }
        consecutiveWorkDays = 0;
      }
    }

    // Check last sequence
    if (consecutiveWorkDays > 6) {
      violations.push({
        type: "minimum_rest_days",
        severity: "error",
        nurseId,
        dates: Array.from(
          { length: consecutiveWorkDays },
          (_, i) => workStartDate + i
        ),
        message: `연속 근무 ${consecutiveWorkDays}일 (최대 6일)`,
      });
    }

    return violations;
  }

  private validateConsecutiveNightShifts(nurseId: number): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    let consecutiveNights = 0;
    let nightStartDate = 0;

    for (let date = 1; date <= this.daysInMonth; date++) {
      const shift = this.getShift(nurseId, date);

      if (shift === "night") {
        if (consecutiveNights === 0) {
          nightStartDate = date;
        }
        consecutiveNights++;
      } else {
        if (consecutiveNights > 3) {
          violations.push({
            type: "consecutive_night_shifts",
            severity: "error",
            nurseId,
            dates: Array.from(
              { length: consecutiveNights },
              (_, i) => nightStartDate + i
            ),
            message: `연속 야간근무 ${consecutiveNights}회 (최대 3회)`,
          });
        }
        consecutiveNights = 0;
      }
    }

    if (consecutiveNights > 3) {
      violations.push({
        type: "consecutive_night_shifts",
        severity: "error",
        nurseId,
        dates: Array.from(
          { length: consecutiveNights },
          (_, i) => nightStartDate + i
        ),
        message: `연속 야간근무 ${consecutiveNights}회 (최대 3회)`,
      });
    }

    return violations;
  }

  private validateMinimumRestHours(nurseId: number): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const restHours = {
      day: 8,
      evening: 8,
      night: 11,
      off: 24,
    };

    for (let date = 1; date < this.daysInMonth; date++) {
      const currentShift = this.getShift(nurseId, date);
      const nextShift = this.getShift(nurseId, date + 1);

      if (currentShift === "off" || nextShift === "off") continue;

      // Simplified check: night to day should have 11+ hours
      if (currentShift === "night" && nextShift === "day") {
        violations.push({
          type: "minimum_rest_hours",
          severity: "warning",
          nurseId,
          dates: [date, date + 1],
          message: `야간 다음날 주간근무 (최소 11시간 휴식 필요)`,
        });
      }
    }

    return violations;
  }

  private validateWeekendDistribution(nurseId: number): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    let weekendCount = 0;
    const weekendDates: number[] = [];

    for (let date = 1; date <= this.daysInMonth; date++) {
      const dayOfWeek = new Date(2026, 3, date).getDay(); // April 2026
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        const shift = this.getShift(nurseId, date);
        if (shift !== "off") {
          weekendCount++;
          weekendDates.push(date);
        }
      }
    }

    // Expected weekends in a month: ~8-9
    if (weekendCount > 9) {
      violations.push({
        type: "weekend_distribution",
        severity: "warning",
        nurseId,
        dates: weekendDates,
        message: `주말 근무 ${weekendCount}회 (권장 8-9회)`,
      });
    } else if (weekendCount < 6) {
      violations.push({
        type: "weekend_distribution",
        severity: "info",
        nurseId,
        dates: weekendDates,
        message: `주말 근무 ${weekendCount}회 (권장 8-9회)`,
      });
    }

    return violations;
  }
}

export function validateSchedule(
  schedule: ScheduleCell[],
  daysInMonth: number = 30
): ValidationResult {
  const validator = new ConstraintValidator(schedule, daysInMonth);
  return validator.validate();
}
