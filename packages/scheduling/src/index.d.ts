export type DutySeverity = 'block' | 'warn' | 'info';

export interface ScheduleAssignment {
  cellId: string;
  teamId: string;
  period: string;
  employeeId: string;
  employeeName: string;
  date: string;
  day: number;
  dutyCode: string;
  [key: string]: unknown;
}

export interface ScheduleSnapshot {
  snapshotId: string;
  teamId: string;
  period: string;
  source: Record<string, unknown>;
  importedAt: string;
  assignments: ScheduleAssignment[];
  originalRows: unknown[];
  overlays: unknown[];
  [key: string]: unknown;
}

export interface ScheduleIssue {
  ruleId: string;
  severity: DutySeverity;
  employeeId?: string;
  affectedCells?: string[];
  message: string;
}

export interface ScheduleEvaluation {
  summary: {
    block: number;
    warn: number;
    info: number;
    total: number;
    canPublish: boolean;
  };
  issues: ScheduleIssue[];
}

export interface ScheduleRule {
  ruleId: string;
  severity: DutySeverity;
  label: string;
  maxConsecutiveNights?: number;
  maxMonthlyNights?: number;
}

export interface ScheduleRulePack {
  rulePackId: string;
  version: string;
  rules: readonly ScheduleRule[];
}

export const DEFAULT_SHIFT_TEMPLATES: Record<string, Record<string, unknown>>;
export const DUTY_CODES: readonly string[];
export const SCHEDULING_RULE_IDS: Record<string, string>;
export const SNUH_NURSE_MVP_RULE_PACK: ScheduleRulePack;

export function isValidDutyCode(dutyCode: string): boolean;
export function normalizeDutyCode(value: unknown): string;
export function toIsoDate(period: string, day: string | number): string;
export function normalizeImportSnapshot(input: unknown): ScheduleSnapshot;
export function evaluateSchedule(snapshot: ScheduleSnapshot, rulePack?: ScheduleRulePack): ScheduleEvaluation;
export function applyScheduleOverlay(snapshot: ScheduleSnapshot, overlay: Record<string, unknown>): ScheduleSnapshot;
export function groupAssignmentsByEmployee(assignments?: ScheduleAssignment[]): Map<string, ScheduleAssignment[]>;
export function summarizeCoverage(snapshot: ScheduleSnapshot): Array<Record<string, unknown>>;
