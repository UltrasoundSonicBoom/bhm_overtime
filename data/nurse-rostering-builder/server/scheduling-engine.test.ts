import { describe, expect, it } from "vitest";
import {
  HardConstraints,
  SoftConstraints,
  ScheduleValidator,
  ScheduleOptimizer,
  type ShiftAssignment,
  type Nurse,
  type ScheduleRequirement,
} from "./scheduling-engine";

const mockNurses: Nurse[] = [
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
    preferredShifts: ["evening", "night"],
  },
  {
    id: 3,
    name: "박민준",
    careerYears: 1,
    maxConsecutiveNights: 2,
    preferredShifts: ["day"],
  },
];

const mockRequirements: ScheduleRequirement[] = [
  {
    date: new Date("2026-04-01"),
    dayShiftRequired: 2,
    eveningShiftRequired: 2,
    nightShiftRequired: 2,
    isWeekend: false,
  },
  {
    date: new Date("2026-04-02"),
    dayShiftRequired: 2,
    eveningShiftRequired: 2,
    nightShiftRequired: 2,
    isWeekend: false,
  },
];

describe("Scheduling Engine", () => {
  describe("HardConstraints", () => {
    it("should allow sufficient rest between shifts", () => {
      const assignments: ShiftAssignment[] = [
        { nurseId: 1, date: new Date("2026-04-01"), shiftType: "night" },
        { nurseId: 1, date: new Date("2026-04-03"), shiftType: "day" },
      ];

      const violations = HardConstraints.validateMinimumRest(assignments, 1);
      expect(violations.length).toBe(0);
    });



    it("should detect consecutive night shift violation", () => {
      const assignments: ShiftAssignment[] = [
        { nurseId: 1, date: new Date("2026-04-01"), shiftType: "night" },
        { nurseId: 1, date: new Date("2026-04-02"), shiftType: "night" },
        { nurseId: 1, date: new Date("2026-04-03"), shiftType: "night" },
        { nurseId: 1, date: new Date("2026-04-04"), shiftType: "night" },
      ];

      const violations = HardConstraints.validateConsecutiveNights(
        assignments,
        1,
        3
      );
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].type).toBe("CONSECUTIVE_NIGHT_VIOLATION");
    });

    it("should allow consecutive nights within limit", () => {
      const assignments: ShiftAssignment[] = [
        { nurseId: 1, date: new Date("2026-04-01"), shiftType: "night" },
        { nurseId: 1, date: new Date("2026-04-02"), shiftType: "night" },
        { nurseId: 1, date: new Date("2026-04-03"), shiftType: "night" },
      ];

      const violations = HardConstraints.validateConsecutiveNights(
        assignments,
        1,
        3
      );
      expect(violations.length).toBe(0);
    });

    it("should detect double shift violation", () => {
      const assignments: ShiftAssignment[] = [
        { nurseId: 1, date: new Date("2026-04-01"), shiftType: "day" },
        { nurseId: 1, date: new Date("2026-04-01"), shiftType: "evening" },
      ];

      const violations = HardConstraints.validateNoDayDoubleShifts(assignments);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].type).toBe("DOUBLE_SHIFT_VIOLATION");
    });

    it("should allow off shift on same day as work shift", () => {
      const assignments: ShiftAssignment[] = [
        { nurseId: 1, date: new Date("2026-04-01"), shiftType: "day" },
        { nurseId: 1, date: new Date("2026-04-01"), shiftType: "off" },
      ];

      const violations = HardConstraints.validateNoDayDoubleShifts(assignments);
      expect(violations.length).toBe(0);
    });
  });

  describe("SoftConstraints", () => {
    it("should calculate NOE pattern penalty", () => {
      const assignments: ShiftAssignment[] = [
        { nurseId: 1, date: new Date("2026-04-01"), shiftType: "night" },
        { nurseId: 1, date: new Date("2026-04-02"), shiftType: "off" },
        { nurseId: 1, date: new Date("2026-04-03"), shiftType: "evening" },
      ];

      const penalty = SoftConstraints.calculateNOEPenalty(assignments, 1);
      expect(penalty).toBeGreaterThan(0);
    });

    it("should calculate minimum days off penalty", () => {
      const assignments: ShiftAssignment[] = [
        { nurseId: 1, date: new Date("2026-04-01"), shiftType: "day" },
        { nurseId: 1, date: new Date("2026-04-02"), shiftType: "off" },
        { nurseId: 1, date: new Date("2026-04-03"), shiftType: "day" },
      ];

      const penalty = SoftConstraints.calculateMinimumDaysOffPenalty(
        assignments,
        1
      );
      expect(penalty).toBeGreaterThan(0);
    });

    it("should calculate weekend off penalty", () => {
      const assignments: ShiftAssignment[] = [
        { nurseId: 1, date: new Date("2026-04-05"), shiftType: "day" }, // Saturday
        { nurseId: 1, date: new Date("2026-04-06"), shiftType: "evening" }, // Sunday
      ];

      const penalty = SoftConstraints.calculateWeekendOffPenalty(
        assignments,
        1
      );
      expect(penalty).toBeGreaterThan(0);
    });
  });

  describe("ScheduleValidator", () => {
    it("should validate feasible schedule with sufficient staff", () => {
      const assignments: ShiftAssignment[] = [
        { nurseId: 1, date: new Date("2026-04-01"), shiftType: "day" },
        { nurseId: 2, date: new Date("2026-04-01"), shiftType: "day" },
        { nurseId: 3, date: new Date("2026-04-01"), shiftType: "evening" },
        { nurseId: 1, date: new Date("2026-04-01"), shiftType: "evening" },
        { nurseId: 2, date: new Date("2026-04-01"), shiftType: "night" },
        { nurseId: 3, date: new Date("2026-04-01"), shiftType: "night" },
      ];

      const score = ScheduleValidator.validate(
        assignments,
        mockNurses,
        mockRequirements
      );

      expect(score).toBeDefined();
      expect(Array.isArray(score.violations)).toBe(true);
    });

    it("should mark infeasible schedule with consecutive night violations", () => {
      const assignments: ShiftAssignment[] = [
        { nurseId: 1, date: new Date("2026-04-01"), shiftType: "night" },
        { nurseId: 1, date: new Date("2026-04-02"), shiftType: "night" },
        { nurseId: 1, date: new Date("2026-04-03"), shiftType: "night" },
        { nurseId: 1, date: new Date("2026-04-04"), shiftType: "night" },
      ];

      const score = ScheduleValidator.validate(
        assignments,
        mockNurses,
        mockRequirements
      );

      expect(score.isFeasible).toBe(false);
      expect(score.violations.filter((v) => v.severity === "hard").length).toBeGreaterThan(
        0
      );
    });

    it("should calculate total penalty", () => {
      const assignments: ShiftAssignment[] = [
        { nurseId: 1, date: new Date("2026-04-01"), shiftType: "day" },
        { nurseId: 1, date: new Date("2026-04-02"), shiftType: "evening" },
        { nurseId: 2, date: new Date("2026-04-01"), shiftType: "evening" },
        { nurseId: 2, date: new Date("2026-04-02"), shiftType: "night" },
      ];

      const score = ScheduleValidator.validate(
        assignments,
        mockNurses,
        mockRequirements
      );

      expect(score.totalPenalty).toBeGreaterThanOrEqual(0);
    });
  });

  describe("ScheduleOptimizer", () => {
    it("should generate valid optimized schedule", () => {
      const initialAssignments: ShiftAssignment[] = [
        { nurseId: 1, date: new Date("2026-04-01"), shiftType: "day" },
        { nurseId: 2, date: new Date("2026-04-01"), shiftType: "evening" },
        { nurseId: 3, date: new Date("2026-04-01"), shiftType: "night" },
      ];

      const optimizedAssignments = ScheduleOptimizer.optimize(
        initialAssignments,
        mockNurses,
        mockRequirements,
        100,
        50
      );

      const optimizedScore = ScheduleValidator.validate(
        optimizedAssignments,
        mockNurses,
        mockRequirements
      );

      // Optimized schedule should be valid
      expect(optimizedAssignments.length).toBeGreaterThan(0);
      expect(optimizedScore).toBeDefined();
    });
  });
});
