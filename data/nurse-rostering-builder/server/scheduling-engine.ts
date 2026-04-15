/**
 * Nurse Rostering Scheduling Engine
 * Implements Korean hospital 3-shift scheduling rules with constraint validation
 * and penalty-based optimization using simulated annealing
 */

export type ShiftType = "day" | "evening" | "night" | "off";

export interface Nurse {
  id: number;
  name: string;
  careerYears: number;
  maxConsecutiveNights: number;
  preferredShifts: ShiftType[];
}

export interface ScheduleRequirement {
  date: Date;
  dayShiftRequired: number;
  eveningShiftRequired: number;
  nightShiftRequired: number;
  isWeekend: boolean;
}

export interface ShiftAssignment {
  nurseId: number;
  date: Date;
  shiftType: ShiftType;
}

export interface ConstraintViolation {
  type: string;
  severity: "hard" | "soft";
  nurseId: number;
  date: Date;
  penalty: number;
  message: string;
}

export interface ScheduleScore {
  totalPenalty: number;
  violations: ConstraintViolation[];
  isFeasible: boolean;
}

/**
 * Hard Constraints (Must be satisfied)
 */
export class HardConstraints {
  // Minimum 11 hours rest between shifts
  static validateMinimumRest(
    assignments: ShiftAssignment[],
    nurseId: number
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const nurseAssignments = assignments
      .filter((a) => a.nurseId === nurseId)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    for (let i = 0; i < nurseAssignments.length - 1; i++) {
      const current = nurseAssignments[i];
      const next = nurseAssignments[i + 1];

      if (current.shiftType === "off" || next.shiftType === "off") continue;

      const shiftEndTime = this.getShiftEndTime(current.shiftType);
      const nextShiftStartTime = this.getShiftStartTime(next.shiftType);
      const restHours = this.calculateRestHours(
        current.date,
        shiftEndTime,
        next.date,
        nextShiftStartTime
      );

      if (restHours < 11) {
        violations.push({
          type: "MINIMUM_REST_VIOLATION",
          severity: "hard",
          nurseId,
          date: next.date,
          penalty: 1000,
          message: `Insufficient rest: ${restHours} hours (minimum 11 required)`,
        });
      }
    }

    return violations;
  }

  // Verify minimum staff requirements are met
  static validateStaffRequirements(
    assignments: ShiftAssignment[],
    requirements: ScheduleRequirement[]
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    for (const req of requirements) {
      const dayAssignments = assignments.filter(
        (a) => a.date.getTime() === req.date.getTime()
      );

      const dayCount = dayAssignments.filter((a) => a.shiftType === "day").length;
      const eveningCount = dayAssignments.filter((a) => a.shiftType === "evening").length;
      const nightCount = dayAssignments.filter((a) => a.shiftType === "night").length;

      if (dayCount < req.dayShiftRequired) {
        violations.push({
          type: "STAFF_REQUIREMENT_VIOLATION",
          severity: "hard",
          nurseId: 0,
          date: req.date,
          penalty: 500 * (req.dayShiftRequired - dayCount),
          message: `Day shift: ${dayCount}/${req.dayShiftRequired} required`,
        });
      }

      if (eveningCount < req.eveningShiftRequired) {
        violations.push({
          type: "STAFF_REQUIREMENT_VIOLATION",
          severity: "hard",
          nurseId: 0,
          date: req.date,
          penalty: 500 * (req.eveningShiftRequired - eveningCount),
          message: `Evening shift: ${eveningCount}/${req.eveningShiftRequired} required`,
        });
      }

      if (nightCount < req.nightShiftRequired) {
        violations.push({
          type: "STAFF_REQUIREMENT_VIOLATION",
          severity: "hard",
          nurseId: 0,
          date: req.date,
          penalty: 500 * (req.nightShiftRequired - nightCount),
          message: `Night shift: ${nightCount}/${req.nightShiftRequired} required`,
        });
      }
    }

    return violations;
  }

  // No consecutive night shifts exceeding limit
  static validateConsecutiveNights(
    assignments: ShiftAssignment[],
    nurseId: number,
    maxConsecutive: number
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const nurseAssignments = assignments
      .filter((a) => a.nurseId === nurseId)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    let consecutiveNights = 0;
    let startDate: Date | null = null;

    for (const assignment of nurseAssignments) {
      if (assignment.shiftType === "night") {
        if (consecutiveNights === 0) {
          startDate = assignment.date;
        }
        consecutiveNights++;

        if (consecutiveNights > maxConsecutive) {
          violations.push({
            type: "CONSECUTIVE_NIGHT_VIOLATION",
            severity: "hard",
            nurseId,
            date: assignment.date,
            penalty: 500,
            message: `Exceeded maximum consecutive nights: ${consecutiveNights} (max ${maxConsecutive})`,
          });
        }
      } else {
        consecutiveNights = 0;
        startDate = null;
      }
    }

    return violations;
  }

  // No double shifts in a single day
  static validateNoDayDoubleShifts(
    assignments: ShiftAssignment[]
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const byNurseAndDate = new Map<string, ShiftAssignment[]>();

    for (const assignment of assignments) {
      const key = `${assignment.nurseId}-${assignment.date.toISOString().split("T")[0]}`;
      if (!byNurseAndDate.has(key)) {
        byNurseAndDate.set(key, []);
      }
      byNurseAndDate.get(key)!.push(assignment);
    }

    for (const [key, assignmentsForDay] of Array.from(byNurseAndDate)) {
      const nonOffShifts = assignmentsForDay.filter((a: ShiftAssignment) => a.shiftType !== "off");
      if (nonOffShifts.length > 1) {
        const [nurseId, dateStr] = key.split("-");
        violations.push({
          type: "DOUBLE_SHIFT_VIOLATION",
          severity: "hard",
          nurseId: parseInt(nurseId),
          date: new Date(dateStr),
          penalty: 1000,
          message: `Multiple shifts assigned on same day`,
        });
      }
    }

    return violations;
  }

  private static getShiftStartTime(shift: ShiftType): number {
    switch (shift) {
      case "day":
        return 8;
      case "evening":
        return 16;
      case "night":
        return 22;
      default:
        return 0;
    }
  }

  private static getShiftEndTime(shift: ShiftType): number {
    switch (shift) {
      case "day":
        return 16;
      case "evening":
        return 22;
      case "night":
        return 6;
      default:
        return 0;
    }
  }

  private static calculateRestHours(
    currentDate: Date,
    currentEndTime: number,
    nextDate: Date,
    nextStartTime: number
  ): number {
    const currentEnd = new Date(currentDate);
    currentEnd.setHours(currentEndTime, 0, 0, 0);

    const nextStart = new Date(nextDate);
    nextStart.setHours(nextStartTime, 0, 0, 0);

    const diffMs = nextStart.getTime() - currentEnd.getTime();
    return diffMs / (1000 * 60 * 60);
  }
}

/**
 * Soft Constraints (Preferably satisfied, violations incur penalties)
 */
export class SoftConstraints {
  // Minimize Night-Off-Evening (NOE) pattern
  static calculateNOEPenalty(
    assignments: ShiftAssignment[],
    nurseId: number
  ): number {
    const nurseAssignments = assignments
      .filter((a) => a.nurseId === nurseId)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    let penalty = 0;
    for (let i = 0; i < nurseAssignments.length - 2; i++) {
      const pattern = [
        nurseAssignments[i].shiftType,
        nurseAssignments[i + 1].shiftType,
        nurseAssignments[i + 2].shiftType,
      ];

      if (
        pattern[0] === "night" &&
        pattern[1] === "off" &&
        pattern[2] === "evening"
      ) {
        penalty += 50;
      }
    }
    return penalty;
  }

  // Maximize minimum 2 consecutive days off
  static calculateMinimumDaysOffPenalty(
    assignments: ShiftAssignment[],
    nurseId: number
  ): number {
    const nurseAssignments = assignments
      .filter((a) => a.nurseId === nurseId)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    let penalty = 0;
    let consecutiveOffs = 0;

    for (const assignment of nurseAssignments) {
      if (assignment.shiftType === "off") {
        consecutiveOffs++;
      } else {
        if (consecutiveOffs === 1) {
          penalty += 30; // Single day off is penalized
        }
        consecutiveOffs = 0;
      }
    }

    return penalty;
  }

  // Maximize weekend off
  static calculateWeekendOffPenalty(
    assignments: ShiftAssignment[],
    nurseId: number
  ): number {
    const nurseAssignments = assignments.filter((a) => a.nurseId === nurseId);

    let penalty = 0;
    for (const assignment of nurseAssignments) {
      const dayOfWeek = assignment.date.getDay();
      if ((dayOfWeek === 0 || dayOfWeek === 6) && assignment.shiftType !== "off") {
        penalty += 20;
      }
    }

    return penalty;
  }

  // Distribute night shifts fairly
  static calculateNightShiftDistributionPenalty(
    assignments: ShiftAssignment[],
    nurses: Nurse[]
  ): number {
    const nightShiftCounts = new Map<number, number>();

    for (const nurse of nurses) {
      nightShiftCounts.set(
        nurse.id,
        assignments.filter(
          (a) => a.nurseId === nurse.id && a.shiftType === "night"
        ).length
      );
    }

    const counts = Array.from(nightShiftCounts.values());
    const average = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance = counts.reduce((sum, count) => sum + Math.pow(count - average, 2), 0) / counts.length;

    return Math.sqrt(variance) * 10;
  }

  // Mix experienced and new nurses in shifts
  static calculateExperienceMixPenalty(
    assignments: ShiftAssignment[],
    nurses: Nurse[],
    requirements: ScheduleRequirement[]
  ): number {
    let penalty = 0;

    for (const requirement of requirements) {
      const dateStr = requirement.date.toISOString().split("T")[0];

      // Check day shift
      const dayShiftNurses = assignments
        .filter(
          (a) =>
            a.shiftType === "day" &&
            a.date.toISOString().split("T")[0] === dateStr
        )
        .map((a) => nurses.find((n) => n.id === a.nurseId))
        .filter((n) => n !== undefined) as Nurse[];

      const newNursesInDay = dayShiftNurses.filter((n) => n.careerYears < 1).length;
      if (newNursesInDay > dayShiftNurses.length / 2) {
        penalty += 25;
      }
    }

    return penalty;
  }
}

/**
 * Schedule Validator
 */
export class ScheduleValidator {
  static validate(
    assignments: ShiftAssignment[],
    nurses: Nurse[],
    requirements?: ScheduleRequirement[]
  ): ScheduleScore {
    const violations: ConstraintViolation[] = [];

    // Check hard constraints
    for (const nurse of nurses) {
      violations.push(
        ...HardConstraints.validateMinimumRest(assignments, nurse.id)
      );
      violations.push(
        ...HardConstraints.validateConsecutiveNights(
          assignments,
          nurse.id,
          nurse.maxConsecutiveNights
        )
      );
    }

    violations.push(...HardConstraints.validateNoDayDoubleShifts(assignments));

    const hardViolations = violations.filter((v) => v.severity === "hard");
    const isFeasible = hardViolations.length === 0;

    // Calculate soft constraint penalties
    let totalSoftPenalty = 0;

    for (const nurse of nurses) {
      totalSoftPenalty += SoftConstraints.calculateNOEPenalty(assignments, nurse.id);
      totalSoftPenalty += SoftConstraints.calculateMinimumDaysOffPenalty(
        assignments,
        nurse.id
      );
      totalSoftPenalty += SoftConstraints.calculateWeekendOffPenalty(
        assignments,
        nurse.id
      );
    }

    totalSoftPenalty += SoftConstraints.calculateNightShiftDistributionPenalty(
      assignments,
      nurses
    );
    // Only call with requirements if available
    if (requirements) {
      totalSoftPenalty += SoftConstraints.calculateExperienceMixPenalty(
        assignments,
        nurses,
        requirements
      );
    }

    // Check staff requirements if provided
    if (requirements) {
      violations.push(...HardConstraints.validateStaffRequirements(assignments, requirements));
    }

    const totalPenalty = violations.reduce((sum, v) => sum + v.penalty, 0) + totalSoftPenalty;

    return {
      totalPenalty,
      violations,
      isFeasible,
    };
  }
}

/**
 * Simple Simulated Annealing Optimizer
 */
export class ScheduleOptimizer {
  static optimize(
    initialAssignments: ShiftAssignment[],
    nurses: Nurse[],
    requirements: ScheduleRequirement[],
    iterations: number = 1000,
    initialTemperature: number = 100
  ): ShiftAssignment[] {
    let currentAssignments = [...initialAssignments];
    let bestAssignments = [...initialAssignments];
    let currentScore = ScheduleValidator.validate(
      currentAssignments,
      nurses,
      requirements
    );
    let bestScore = currentScore;

    let temperature = initialTemperature;
    const coolingRate = 0.95;

    for (let i = 0; i < iterations; i++) {
      // Generate neighbor solution
      const neighborAssignments = this.generateNeighbor(currentAssignments);
      const neighborScore = ScheduleValidator.validate(
        neighborAssignments,
        nurses,
        requirements
      );

      // Accept or reject
      const delta = neighborScore.totalPenalty - currentScore.totalPenalty;
      const acceptanceProbability = Math.exp(-delta / temperature);

      if (delta < 0 || Math.random() < acceptanceProbability) {
        currentAssignments = neighborAssignments;
        currentScore = neighborScore;

        if (neighborScore.totalPenalty < bestScore.totalPenalty) {
          bestAssignments = neighborAssignments;
          bestScore = neighborScore;
        }
      }

      temperature *= coolingRate;
    }

    return bestAssignments;
  }

  private static generateNeighbor(assignments: ShiftAssignment[]): ShiftAssignment[] {
    const neighbor = [...assignments];
    const shiftTypes: ShiftType[] = ["day", "evening", "night", "off"];

    // Random swap
    const idx = Math.floor(Math.random() * neighbor.length);
    const currentShift = neighbor[idx].shiftType;
    let newShift = shiftTypes[Math.floor(Math.random() * shiftTypes.length)];

    while (newShift === currentShift) {
      newShift = shiftTypes[Math.floor(Math.random() * shiftTypes.length)];
    }

    neighbor[idx].shiftType = newShift;
    return neighbor;
  }
}
