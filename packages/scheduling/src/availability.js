export function groupAssignmentsByEmployee(assignments = []) {
  const grouped = new Map();

  for (const assignment of assignments) {
    const key = assignment.employeeId || 'missing';
    const current = grouped.get(key) ?? [];
    current.push(assignment);
    grouped.set(key, current);
  }

  for (const entries of grouped.values()) {
    entries.sort((a, b) => a.date.localeCompare(b.date));
  }

  return grouped;
}

export function summarizeCoverage(snapshot) {
  const days = new Map();

  for (const assignment of snapshot.assignments ?? []) {
    const daySummary = days.get(assignment.date) ?? {
      date: assignment.date,
      total: 0,
      duties: {},
      employees: [],
    };
    daySummary.total += 1;
    daySummary.duties[assignment.dutyCode] = (daySummary.duties[assignment.dutyCode] ?? 0) + 1;
    daySummary.employees.push(assignment.employeeId);
    days.set(assignment.date, daySummary);
  }

  return Array.from(days.values()).sort((a, b) => a.date.localeCompare(b.date));
}
