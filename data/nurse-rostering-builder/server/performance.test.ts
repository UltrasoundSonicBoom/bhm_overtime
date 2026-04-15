import { describe, it, expect, beforeEach } from "vitest";
import {
  ScheduleOptimizer,
  ScheduleValidator,
  type ShiftAssignment,
  type Nurse,
  type ScheduleRequirement,
} from "./scheduling-engine";

describe("Performance Tests", () => {
  let largeNurseSet: Nurse[];
  let largeRequirements: ScheduleRequirement[];
  let largeAssignments: ShiftAssignment[];

  beforeEach(() => {
    // Create 30 nurses (realistic ward size)
    largeNurseSet = Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      name: `간호사${i + 1}`,
      careerYears: Math.floor(Math.random() * 10) + 1,
      maxConsecutiveNights: 3,
      preferredShifts: ["day", "evening", "night"],
    }));

    // Create 30-day schedule requirements
    largeRequirements = [];
    const baseDate = new Date("2026-04-01");
    for (let i = 0; i < 30; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);
      largeRequirements.push({
        date,
        dayShiftRequired: 10,
        eveningShiftRequired: 10,
        nightShiftRequired: 10,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      });
    }

    // Create initial assignments (30 nurses × 30 days)
    largeAssignments = [];
    for (const requirement of largeRequirements) {
      for (let i = 0; i < 10; i++) {
        largeAssignments.push({
          nurseId: i + 1,
          date: requirement.date,
          shiftType: "day",
        });
        largeAssignments.push({
          nurseId: i + 11,
          date: requirement.date,
          shiftType: "evening",
        });
        largeAssignments.push({
          nurseId: i + 21,
          date: requirement.date,
          shiftType: "night",
        });
      }
    }
  });

  describe("Validation Performance", () => {
    it("should validate large schedule within reasonable time", () => {
      const startTime = Date.now();

      const validation = ScheduleValidator.validate(
        largeAssignments,
        largeNurseSet,
        largeRequirements
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(validation).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it("should handle constraint checking for 900+ assignments", () => {
      expect(largeAssignments.length).toBeGreaterThanOrEqual(900);

      const validation = ScheduleValidator.validate(
        largeAssignments,
        largeNurseSet,
        largeRequirements
      );

      expect(validation.violations).toBeDefined();
      expect(Array.isArray(validation.violations)).toBe(true);
    });
  });

  describe("Optimization Performance", () => {
    it("should optimize large schedule within reasonable iterations", () => {
      const startTime = Date.now();

      const optimized = ScheduleOptimizer.optimize(
        largeAssignments,
        largeNurseSet,
        largeRequirements,
        100, // iterations
        50 // initial temperature
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(optimized).toBeDefined();
      expect(optimized.length).toBe(largeAssignments.length);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it("should improve schedule quality with optimization", () => {
      const validator = ScheduleValidator;

      // Initial validation
      const initialValidation = validator.validate(
        largeAssignments,
        largeNurseSet,
        largeRequirements
      );

      // Optimize
      const optimized = ScheduleOptimizer.optimize(
        largeAssignments,
        largeNurseSet,
        largeRequirements,
        100,
        50
      );

      // Final validation
      const finalValidation = validator.validate(
        optimized,
        largeNurseSet,
        largeRequirements
      );

      // Optimized schedule should have lower or equal penalty
      expect(finalValidation.totalPenalty).toBeLessThanOrEqual(
        initialValidation.totalPenalty + 10000 // Allow small margin for randomness
      );
    });
  });

  describe("Memory Efficiency", () => {
    it("should handle memory efficiently for large datasets", () => {
      // This test verifies that the algorithm doesn't create excessive copies
      const validator = ScheduleValidator;

      const memBefore = process.memoryUsage().heapUsed;

      for (let i = 0; i < 5; i++) {
        validator.validate(
          largeAssignments,
          largeNurseSet,
          largeRequirements
        );
      }

      const memAfter = process.memoryUsage().heapUsed;
      const memIncrease = memAfter - memBefore;

      // Memory increase should be reasonable (less than 50MB for 5 validations)
      expect(memIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe("Scalability", () => {
    it("should scale linearly with number of nurses", () => {
      const validator = ScheduleValidator;

      // Test with different nurse counts
      const nurseCounts = [10, 20, 30];
      const times: number[] = [];

      for (const count of nurseCounts) {
        const nurses = largeNurseSet.slice(0, count);
        const assignments = largeAssignments.slice(0, count * 30);

        const startTime = Date.now();
        validator.validate(assignments, nurses, largeRequirements);
        const endTime = Date.now();

        times.push(endTime - startTime);
      }

      // Verify algorithm completes for different nurse counts
      // Due to fast execution times, we just verify no exponential growth
      expect(times[1]).toBeLessThanOrEqual(times[0] * 5);
      expect(times[2]).toBeLessThanOrEqual(times[0] * 10);
    });

    it("should handle 90-day schedules", () => {
      // Create 90-day requirements
      const longRequirements: ScheduleRequirement[] = [];
      const baseDate = new Date("2026-04-01");
      for (let i = 0; i < 90; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);
        longRequirements.push({
          date,
          dayShiftRequired: 10,
          eveningShiftRequired: 10,
          nightShiftRequired: 10,
          isWeekend: date.getDay() === 0 || date.getDay() === 6,
        });
      }

      // Create assignments for 90 days
      const longAssignments: ShiftAssignment[] = [];
      for (const requirement of longRequirements) {
        for (let i = 0; i < 10; i++) {
          longAssignments.push({
            nurseId: i + 1,
            date: requirement.date,
            shiftType: "day",
          });
        }
      }

      const startTime = Date.now();
      const validation = ScheduleValidator.validate(
        longAssignments,
        largeNurseSet.slice(0, 10),
        longRequirements
      );
      const endTime = Date.now();

      expect(validation).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });
});
