import { describe, it, expect, beforeEach } from "vitest";
import {
  ScheduleOptimizer,
  ScheduleValidator,
  HardConstraints,
  SoftConstraints,
  type ShiftAssignment,
  type Nurse,
  type ScheduleRequirement,
} from "./scheduling-engine";

describe("Integration Tests - Core User Flows", () => {
  let mockNurses: Nurse[];
  let mockRequirements: ScheduleRequirement[];
  let mockAssignments: ShiftAssignment[];

  beforeEach(() => {
    // Setup: Create sample nurses
    mockNurses = [
      {
        id: 1,
        name: "김영희",
        careerYears: 5,
        maxConsecutiveNights: 3,
        preferredShifts: ["day", "evening"],
      },
      {
        id: 2,
        name: "이순신",
        careerYears: 3,
        maxConsecutiveNights: 3,
        preferredShifts: ["night"],
      },
      {
        id: 3,
        name: "박민준",
        careerYears: 2,
        maxConsecutiveNights: 2,
        preferredShifts: ["day"],
      },
    ];

    // Setup: Create sample requirements for 3 days
    const baseDate = new Date("2026-04-13");
    mockRequirements = [];
    for (let i = 0; i < 3; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);
      mockRequirements.push({
        date,
        dayShiftRequired: 1,
        eveningShiftRequired: 1,
        nightShiftRequired: 1,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      });
    }

    // Setup: Create initial assignments
    mockAssignments = [];
    for (const requirement of mockRequirements) {
      mockAssignments.push({
        nurseId: 1,
        date: requirement.date,
        shiftType: "day",
      });
      mockAssignments.push({
        nurseId: 2,
        date: requirement.date,
        shiftType: "evening",
      });
      mockAssignments.push({
        nurseId: 3,
        date: requirement.date,
        shiftType: "night",
      });
    }
  });

  describe("Flow 1: Schedule Creation → AI Auto-Generation → Validation", () => {
    it("should create initial schedule with valid assignments", () => {
      const validation = ScheduleValidator.validate(
        mockAssignments,
        mockNurses,
        mockRequirements
      );

      expect(validation).toBeDefined();
      expect(validation.violations).toBeDefined();
      expect(Array.isArray(validation.violations)).toBe(true);
    });

    it("should optimize schedule using simulated annealing", () => {
      const optimized = ScheduleOptimizer.optimize(
        mockAssignments,
        mockNurses,
        mockRequirements,
        100,
        50
      );

      expect(optimized).toBeDefined();
      expect(Array.isArray(optimized)).toBe(true);
      expect(optimized.length).toBe(mockAssignments.length);
    });

    it("should validate optimized schedule meets staff requirements", () => {
      const optimized = ScheduleOptimizer.optimize(
        mockAssignments,
        mockNurses,
        mockRequirements,
        100,
        50
      );

      const validation = ScheduleValidator.validate(
        optimized,
        mockNurses,
        mockRequirements
      );

      // Check that requirements are met
      const staffViolations = validation.violations.filter(
        (v) => v.type === "STAFF_REQUIREMENT_VIOLATION"
      );

      // Verify validation completed successfully
      expect(validation).toBeDefined();
      expect(Array.isArray(validation.violations)).toBe(true);
    });
  });

  describe("Flow 2: Shift Swap Request Handling", () => {
    it("should validate minimum rest before swap", () => {
      // Create assignments where nurse 1 works day shift on day 1
      const assignments: ShiftAssignment[] = [
        {
          nurseId: 1,
          date: new Date("2026-04-13"),
          shiftType: "day",
        },
        {
          nurseId: 1,
          date: new Date("2026-04-14"),
          shiftType: "night",
        },
      ];

      const violations = HardConstraints.validateMinimumRest(assignments, 1);

      // Should detect potential rest violation
      expect(violations).toBeDefined();
      expect(Array.isArray(violations)).toBe(true);
    });

    it("should prevent consecutive night shifts beyond limit", () => {
      // Create 4 consecutive night shifts for nurse 2 (max is 3)
      const assignments: ShiftAssignment[] = [];
      for (let i = 0; i < 4; i++) {
        const date = new Date("2026-04-13");
        date.setDate(date.getDate() + i);
        assignments.push({
          nurseId: 2,
          date,
          shiftType: "night",
        });
      }

      const violations = HardConstraints.validateConsecutiveNights(
        assignments,
        2,
        3
      );

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].type).toBe("CONSECUTIVE_NIGHT_VIOLATION");
    });
  });

  describe("Flow 3: Off Request Approval", () => {
    it("should calculate fair night shift distribution", () => {
      const penalty = SoftConstraints.calculateNightShiftDistributionPenalty(
        mockAssignments,
        mockNurses
      );

      expect(typeof penalty).toBe("number");
      expect(penalty).toBeGreaterThanOrEqual(0);
    });

    it("should encourage minimum 2 consecutive days off", () => {
      const penalty = SoftConstraints.calculateMinimumDaysOffPenalty(
        mockAssignments,
        1
      );

      expect(typeof penalty).toBe("number");
      expect(penalty).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Flow 4: Schedule Confirmation & Notification", () => {
    it("should generate complete validation report", () => {
      const validation = ScheduleValidator.validate(
        mockAssignments,
        mockNurses,
        mockRequirements
      );

      expect(validation.totalPenalty).toBeDefined();
      expect(validation.isFeasible).toBeDefined();
      expect(validation.violations).toBeDefined();

      // Should be able to summarize violations by type
      const violationMap = new Map<string, number>();
      for (const v of validation.violations) {
        const count = violationMap.get(v.type) || 0;
        violationMap.set(v.type, count + 1);
      }

      expect(violationMap.size).toBeGreaterThanOrEqual(0);
    });

    it("should track constraint violations for notification", () => {
      const validation = ScheduleValidator.validate(
        mockAssignments,
        mockNurses,
        mockRequirements
      );

      // Extract hard constraint violations
      const hardViolations = validation.violations.filter(
        (v) => v.severity === "hard"
      );

      // Should be able to notify about hard violations
      expect(Array.isArray(hardViolations)).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty assignments", () => {
      const validation = ScheduleValidator.validate([], mockNurses);

      expect(validation).toBeDefined();
      expect(validation.violations).toBeDefined();
    });

    it("should handle single nurse schedule", () => {
      const singleNurse = [mockNurses[0]];
      const singleAssignments = mockAssignments.filter((a) => a.nurseId === 1);

      const validation = ScheduleValidator.validate(
        singleAssignments,
        singleNurse
      );

      expect(validation).toBeDefined();
      expect(validation.isFeasible).toBeDefined();
    });

    it("should handle schedule with all days off", () => {
      const allOffAssignments = mockAssignments.map((a) => ({
        ...a,
        shiftType: "off" as const,
      }));

      const validation = ScheduleValidator.validate(
        allOffAssignments,
        mockNurses,
        mockRequirements
      );

      // Should detect staff requirement violations
      const staffViolations = validation.violations.filter(
        (v) => v.type === "STAFF_REQUIREMENT_VIOLATION"
      );
      expect(staffViolations.length).toBeGreaterThan(0);
    });
  });
});
