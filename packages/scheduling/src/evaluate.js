import { groupAssignmentsByEmployee } from './availability.js';
import { SCHEDULING_RULE_IDS, SNUH_NURSE_MVP_RULE_PACK } from './rules.js';
import { isValidDutyCode } from './schema.js';

function makeIssue(ruleId, severity, employeeId, affectedCells, message) {
  return {
    ruleId,
    severity,
    employeeId,
    affectedCells,
    message,
  };
}

function getRule(rulePack, ruleId) {
  return rulePack.rules.find(rule => rule.ruleId === ruleId);
}

function addIdentityIssues(snapshot, issues, rulePack) {
  const rule = getRule(rulePack, SCHEDULING_RULE_IDS.EMPLOYEE_IDENTITY_REQUIRED);
  if (!rule) return;

  for (const assignment of snapshot.assignments ?? []) {
    if (!assignment.employeeId || !assignment.employeeName) {
      issues.push(makeIssue(
        rule.ruleId,
        rule.severity,
        assignment.employeeId,
        [assignment.cellId],
        'Employee id and name are required for every imported assignment.',
      ));
    }
  }
}

function addDutyCodeIssues(snapshot, issues, rulePack) {
  const rule = getRule(rulePack, SCHEDULING_RULE_IDS.VALID_DUTY_CODE);
  if (!rule) return;

  for (const assignment of snapshot.assignments ?? []) {
    if (!isValidDutyCode(assignment.dutyCode)) {
      issues.push(makeIssue(
        rule.ruleId,
        rule.severity,
        assignment.employeeId,
        [assignment.cellId],
        `Invalid duty code: ${assignment.dutyCode}`,
      ));
    }
  }
}

function addRecoveryPatternIssues(grouped, issues, rulePack) {
  const rule = getRule(rulePack, SCHEDULING_RULE_IDS.NO_N_OFF_D);
  if (!rule) return;

  for (const [employeeId, assignments] of grouped) {
    for (let index = 0; index <= assignments.length - 3; index += 1) {
      const window = assignments.slice(index, index + 3);
      const [first, second, third] = window;
      if (first.dutyCode === 'N' && second.dutyCode === 'OFF' && ['D', '9A'].includes(third.dutyCode)) {
        issues.push(makeIssue(
          rule.ruleId,
          rule.severity,
          employeeId,
          window.map(assignment => assignment.cellId),
          'Night duty followed by one off day cannot recover directly into D or 9A.',
        ));
      }
    }
  }
}

function addConsecutiveNightIssues(grouped, issues, rulePack) {
  const rule = getRule(rulePack, SCHEDULING_RULE_IDS.MAX_CONSECUTIVE_NIGHTS);
  if (!rule) return;

  for (const [employeeId, assignments] of grouped) {
    let streak = [];
    for (const assignment of assignments) {
      if (assignment.dutyCode === 'N') {
        streak.push(assignment);
      } else {
        if (streak.length > rule.maxConsecutiveNights) {
          issues.push(makeIssue(
            rule.ruleId,
            rule.severity,
            employeeId,
            streak.map(item => item.cellId),
            `More than ${rule.maxConsecutiveNights} consecutive night duties are assigned.`,
          ));
        }
        streak = [];
      }
    }

    if (streak.length > rule.maxConsecutiveNights) {
      issues.push(makeIssue(
        rule.ruleId,
        rule.severity,
        employeeId,
        streak.map(item => item.cellId),
        `More than ${rule.maxConsecutiveNights} consecutive night duties are assigned.`,
      ));
    }
  }
}

function addMonthlyNightCapIssues(grouped, issues, rulePack) {
  const rule = getRule(rulePack, SCHEDULING_RULE_IDS.MONTHLY_NIGHT_CAP);
  if (!rule) return;

  for (const [employeeId, assignments] of grouped) {
    const nights = assignments.filter(assignment => assignment.dutyCode === 'N');
    if (nights.length > rule.maxMonthlyNights) {
      issues.push(makeIssue(
        rule.ruleId,
        rule.severity,
        employeeId,
        nights.map(item => item.cellId),
        `More than ${rule.maxMonthlyNights} night duties are assigned in this period.`,
      ));
    }
  }
}

function summarizeIssues(issues) {
  const summary = {
    block: 0,
    warn: 0,
    info: 0,
    total: issues.length,
    canPublish: true,
  };

  for (const issue of issues) {
    summary[issue.severity] = (summary[issue.severity] ?? 0) + 1;
  }

  summary.canPublish = summary.block === 0;
  return summary;
}

export function evaluateSchedule(snapshot, rulePack = SNUH_NURSE_MVP_RULE_PACK) {
  if (!snapshot || !Array.isArray(snapshot.assignments)) {
    throw new TypeError('evaluateSchedule requires a schedule snapshot');
  }

  const issues = [];
  const grouped = groupAssignmentsByEmployee(snapshot.assignments);

  addDutyCodeIssues(snapshot, issues, rulePack);
  addIdentityIssues(snapshot, issues, rulePack);
  addRecoveryPatternIssues(grouped, issues, rulePack);
  addConsecutiveNightIssues(grouped, issues, rulePack);
  addMonthlyNightCapIssues(grouped, issues, rulePack);

  return {
    summary: summarizeIssues(issues),
    issues,
  };
}
