import test from 'node:test'
import assert from 'node:assert/strict'
import { buildScenarioBlueprints } from '../src/services/team-scenario-lab'
import type { ScheduleGenerationContext } from '../src/services/team-schedules'

const context: ScheduleGenerationContext & { baseCoverage: ScheduleGenerationContext['coverage'] } = {
  team: {
    id: 7,
    slug: '101',
    name: '101 병동',
    year: 2026,
    month: 5,
  },
  members: [
    {
      id: 11,
      name: '송채은',
      age: 26,
      roleLabel: 'RN',
      canNight: true,
      ftePermille: 1000,
      skillTags: ['new-grad'],
      fairness: { night: 0, weekend: 0, holiday: 0, undesirable: 0 },
      previousAssignments: ['OFF', 'D', 'OFF', 'E', 'OFF', 'D', 'OFF'],
    },
    {
      id: 12,
      name: '박서연',
      age: 36,
      roleLabel: 'Charge RN',
      canNight: true,
      ftePermille: 1000,
      skillTags: ['charge'],
      fairness: { night: 1, weekend: 0, holiday: 0, undesirable: 1 },
      previousAssignments: ['N', 'OFF', 'OFF', 'D', 'E', 'OFF', 'D'],
    },
  ],
  shiftTypes: [
    { code: 'D', label: 'Day', startMinutes: 420, endMinutes: 900, isWork: true },
    { code: 'E', label: 'Evening', startMinutes: 840, endMinutes: 1320, isWork: true },
    { code: 'N', label: 'Night', startMinutes: 1260, endMinutes: 1860, isWork: true },
    { code: 'OFF', label: 'Off', startMinutes: 0, endMinutes: 0, isWork: false },
    { code: 'LEAVE', label: 'Leave', startMinutes: 0, endMinutes: 0, isWork: false },
    { code: 'EDU', label: 'Education', startMinutes: 540, endMinutes: 1020, isWork: false },
  ],
  baseCoverage: [
    { date: '2026-05-01', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-02', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-03', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-04', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-05', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-06', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-07', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-08', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-09', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-10', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-11', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-12', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-13', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-14', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-15', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-16', requirements: { D: 3, E: 2, N: 2 } },
  ],
  coverage: [
    { date: '2026-05-01', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-02', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-03', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-04', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-05', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-06', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-07', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-08', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-09', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-10', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-11', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-12', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-13', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-14', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-15', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-16', requirements: { D: 3, E: 2, N: 2 } },
  ],
  approvedLeaves: [
    { memberId: 12, date: '2026-05-14', leaveType: 'annual' },
  ],
  preferredOffRequests: [],
  locks: [],
  memberEvents: [],
  wardEvents: [],
  leaveLedger: [],
  datasetValidation: {
    summary: { total: 0, errors: 0, warnings: 0, info: 0, blocking: false },
    items: [],
  },
  previousPublishedAssignments: [],
  rules: {
    ruleProfileId: 1,
    hospitalRuleVersion: '2026.1',
    minRestHours: 16,
    maxNightShiftsPerMonth: 6,
    forbiddenPatterns: [['N', 'OFF', 'D']],
    weights: { request: 10, fairness: 25, nightCap: 100, continuity: 15 },
  },
}

test('buildScenarioBlueprints defines five scenario testsets for a team context', () => {
  const blueprints = buildScenarioBlueprints(context)

  assert.equal(blueprints.length, 5)
  assert.equal(blueprints[0]?.id, '101-baseline')
  assert.ok(blueprints.some((item) => item.id === '101-coverage-newgrad'))
})
