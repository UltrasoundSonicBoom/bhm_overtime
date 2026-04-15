import { describe, it, expect } from "vitest";
import { validateSchedule, ConstraintValidator } from "./constraintValidator";

describe("ConstraintValidator", () => {
  const mockSchedule = [
    { nurseId: 1, date: 1, shift: "day" as const },
    { nurseId: 1, date: 2, shift: "day" as const },
    { nurseId: 1, date: 3, shift: "evening" as const },
    { nurseId: 1, date: 4, shift: "night" as const },
    { nurseId: 1, date: 5, shift: "off" as const },
    { nurseId: 2, date: 1, shift: "night" as const },
    { nurseId: 2, date: 2, shift: "night" as const },
    { nurseId: 2, date: 3, shift: "night" as const },
    { nurseId: 2, date: 4, shift: "off" as const },
  ];

  it("should validate schedule without violations", () => {
    const result = validateSchedule(mockSchedule, 30);
    expect(result).toBeDefined();
    expect(result.violations).toBeDefined();
    expect(Array.isArray(result.violations)).toBe(true);
  });

  it("should detect consecutive night shift violations", () => {
    const scheduleWithViolation = [
      { nurseId: 1, date: 1, shift: "night" as const },
      { nurseId: 1, date: 2, shift: "night" as const },
      { nurseId: 1, date: 3, shift: "night" as const },
      { nurseId: 1, date: 4, shift: "night" as const }, // 4 consecutive nights
    ];

    const result = validateSchedule(scheduleWithViolation, 30);
    const nightViolations = result.violations.filter(
      (v) => v.type === "consecutive_night_shifts"
    );
    expect(nightViolations.length).toBeGreaterThan(0);
  });

  it("should detect minimum rest days violations", () => {
    const scheduleWithViolation = Array.from({ length: 8 }, (_, i) => ({
      nurseId: 1,
      date: i + 1,
      shift: (i < 7 ? "day" : "off") as any,
    }));

    const result = validateSchedule(scheduleWithViolation, 30);
    const restViolations = result.violations.filter(
      (v) => v.type === "minimum_rest_days"
    );
    expect(restViolations.length).toBeGreaterThan(0);
  });

  it("should return summary with error/warning/info counts", () => {
    const result = validateSchedule(mockSchedule, 30);
    expect(result.summary).toBeDefined();
    expect(result.summary.errorCount).toBeGreaterThanOrEqual(0);
    expect(result.summary.warningCount).toBeGreaterThanOrEqual(0);
    expect(result.summary.infoCount).toBeGreaterThanOrEqual(0);
  });

  it("should mark schedule as valid when no errors", () => {
    const result = validateSchedule(mockSchedule, 30);
    expect(result.isValid).toBe(result.summary.errorCount === 0);
  });

  it("should handle empty schedule", () => {
    const result = validateSchedule([], 30);
    expect(result).toBeDefined();
    expect(result.violations).toBeDefined();
  });

  it("should include nurse ID and dates in violations", () => {
    const scheduleWithViolation = [
      { nurseId: 5, date: 1, shift: "night" as const },
      { nurseId: 5, date: 2, shift: "night" as const },
      { nurseId: 5, date: 3, shift: "night" as const },
      { nurseId: 5, date: 4, shift: "night" as const },
    ];

    const result = validateSchedule(scheduleWithViolation, 30);
    const violations = result.violations.filter((v) => v.nurseId === 5);
    
    violations.forEach((v) => {
      expect(v.nurseId).toBe(5);
      expect(Array.isArray(v.dates)).toBe(true);
      expect(v.dates.length).toBeGreaterThan(0);
    });
  });
});
