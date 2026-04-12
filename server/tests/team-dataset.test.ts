import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyWardEventCoverage,
  buildDatasetScenarioReport,
  buildEventLocks,
  buildLeaveLedger,
  expandScheduleEvents,
  validateDataset,
} from '../src/services/team-dataset'
import type {
  ApprovedLeave,
  CoverageDay,
  PublishedAssignment,
  ScheduleEvent,
  ScheduleMember,
  ShiftTypeDefinition,
} from '../src/services/team-schedules'

const shiftTypes: ShiftTypeDefinition[] = [
  { code: 'D', label: 'Day', startMinutes: 420, endMinutes: 900, isWork: true },
  { code: 'E', label: 'Evening', startMinutes: 840, endMinutes: 1320, isWork: true },
  { code: 'N', label: 'Night', startMinutes: 1260, endMinutes: 1860, isWork: true },
  { code: 'OFF', label: 'Off', startMinutes: 0, endMinutes: 0, isWork: false },
  { code: 'LEAVE', label: 'Leave', startMinutes: 0, endMinutes: 0, isWork: false },
  { code: 'EDU', label: 'Education', startMinutes: 540, endMinutes: 1020, isWork: false },
]

const members: ScheduleMember[] = [
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
    age: 41,
    roleLabel: 'Charge RN',
    canNight: true,
    ftePermille: 1000,
    skillTags: ['charge'],
    fairness: { night: 0, weekend: 0, holiday: 0, undesirable: 0 },
    previousAssignments: ['N', 'OFF', 'OFF', 'D', 'E', 'OFF', 'D'],
  },
]

function makeMemberEvent(event: Partial<ScheduleEvent> & Pick<ScheduleEvent, 'id' | 'title'>): ScheduleEvent {
  return {
    id: event.id,
    teamId: 7,
    periodId: 70,
    memberId: event.memberId ?? 11,
    scope: event.scope ?? 'member',
    eventType: event.eventType ?? 'education',
    title: event.title,
    startDate: event.startDate ?? '2026-05-14',
    endDate: event.endDate ?? '2026-05-14',
    startMinutes: event.startMinutes ?? 540,
    endMinutes: event.endMinutes ?? 1020,
    allDay: event.allDay ?? false,
    blocksWork: event.blocksWork ?? true,
    preferredShiftCode: event.preferredShiftCode ?? 'EDU',
    coverageDelta: event.coverageDelta ?? {},
    notes: event.notes ?? null,
    source: event.source ?? 'seed',
    dates: event.dates ?? ['2026-05-14'],
  }
}

test('expandScheduleEvents clips dates to the requested month and ward coverage deltas are applied', () => {
  const coverage: CoverageDay[] = [
    { date: '2026-05-14', requirements: { D: 3, E: 2, N: 2 } },
    { date: '2026-05-15', requirements: { D: 3, E: 2, N: 2 } },
  ]
  const [wardEvent] = expandScheduleEvents([
    {
      id: 1,
      teamId: 7,
      periodId: 70,
      memberId: null,
      scope: 'team',
      eventType: 'ward_event',
      title: '감염관리 라운딩',
      startDate: '2026-05-14',
      endDate: '2026-05-16',
      startMinutes: null,
      endMinutes: null,
      allDay: true,
      blocksWork: false,
      preferredShiftCode: null,
      coverageDelta: { D: 1 },
      notes: null,
      source: 'seed',
    },
  ], { start: '2026-05-01', end: '2026-05-15' })

  assert.deepEqual(wardEvent?.dates, ['2026-05-14', '2026-05-15'])

  const adjusted = applyWardEventCoverage(coverage, [wardEvent!])
  assert.equal(adjusted[0]?.requirements.D, 4)
  assert.equal(adjusted[1]?.requirements.D, 4)
})

test('buildEventLocks, buildLeaveLedger, and validateDataset reflect blocking events and fairness warnings', () => {
  const approvedLeaves: ApprovedLeave[] = [
    { memberId: 12, date: '2026-05-14', leaveType: 'annual' },
    { memberId: 12, date: '2026-05-15', leaveType: 'annual' },
  ]
  const memberEvents = [
    makeMemberEvent({
      id: 11,
      memberId: 11,
      title: '신규간호사 오리엔테이션',
      eventType: 'orientation',
      startDate: '2026-05-20',
      endDate: '2026-05-21',
      dates: ['2026-05-20', '2026-05-21'],
    }),
    makeMemberEvent({
      id: 12,
      memberId: 12,
      title: '학회 교육',
      eventType: 'education',
      startDate: '2026-05-14',
      endDate: '2026-05-14',
      dates: ['2026-05-14'],
    }),
    makeMemberEvent({
      id: 13,
      memberId: 11,
      title: '고정 교육',
      eventType: 'fixed_shift',
      dates: ['2026-05-23'],
      preferredShiftCode: 'EDU',
    }),
  ]

  const derivedLocks = buildEventLocks(memberEvents)
  assert.equal(derivedLocks.length, 4)
  assert.equal(derivedLocks[0]?.shiftCode, 'EDU')

  const historicalAssignments: PublishedAssignment[] = [
    { memberId: 11, memberName: '송채은', date: '2026-04-27', shiftCode: 'N', teamSlug: '101' },
    { memberId: 12, memberName: '박서연', date: '2026-04-26', shiftCode: 'N', teamSlug: '101' },
  ]
  const currentAssignments: PublishedAssignment[] = [
    { memberId: 11, memberName: '송채은', date: '2026-05-14', shiftCode: 'D', teamSlug: '101' },
    { memberId: 11, memberName: '송채은', date: '2026-05-23', shiftCode: 'EDU', teamSlug: '101' },
    { memberId: 12, memberName: '박서연', date: '2026-05-14', shiftCode: 'D', teamSlug: '101' },
  ]

  const leaveLedger = buildLeaveLedger({
    members,
    shiftTypes,
    approvedLeaves,
    memberEvents,
    historicalPublishedAssignments: historicalAssignments,
    currentPublishedAssignments: currentAssignments,
  })

  assert.equal(leaveLedger.find((item) => item.memberId === 11)?.educationDays, 2)
  assert.equal(leaveLedger.find((item) => item.memberId === 11)?.recentNightCount, 1)
  assert.equal(leaveLedger.find((item) => item.memberId === 12)?.annualLeaveDays, 2)

  const validation = validateDataset({
    members,
    shiftTypes,
    approvedLeaves,
    memberEvents,
    wardEvents: [],
    leaveLedger,
    assignments: currentAssignments,
  })

  assert.equal(validation.summary.errors, 1)
  assert.ok(validation.items.some((item) => item.code === 'event.leave_overlap'))
  assert.ok(validation.items.some((item) => item.code === 'event.assignment_on_blocked_day'))
  assert.ok(validation.items.some((item) => item.code === 'fairness.leave_skew'))
  assert.ok(validation.items.some((item) => item.code === 'member.age_night_capability'))
})

test('buildDatasetScenarioReport summarizes dataset and solver-facing checks', () => {
  const coverage: CoverageDay[] = [
    { date: '2026-05-22', requirements: { D: 3, E: 2, N: 2 } },
  ]
  const wardEvents = [
    {
      id: 31,
      teamId: 7,
      periodId: 70,
      memberId: null,
      scope: 'team',
      eventType: 'dinner',
      title: '팀 회식',
      startDate: '2026-05-22',
      endDate: '2026-05-22',
      startMinutes: 1080,
      endMinutes: 1200,
      allDay: false,
      blocksWork: false,
      preferredShiftCode: null,
      coverageDelta: {},
      notes: null,
      source: 'seed',
      dates: ['2026-05-22'],
    },
    {
      id: 32,
      teamId: 7,
      periodId: 70,
      memberId: null,
      scope: 'team',
      eventType: 'ward_event',
      title: '감염관리 라운딩',
      startDate: '2026-05-22',
      endDate: '2026-05-22',
      startMinutes: null,
      endMinutes: null,
      allDay: true,
      blocksWork: false,
      preferredShiftCode: null,
      coverageDelta: { D: 1 },
      notes: null,
      source: 'seed',
      dates: ['2026-05-22'],
    },
  ]
  const adjustedCoverage = applyWardEventCoverage(coverage, [wardEvents[1]!])
  const memberEvents = [
    makeMemberEvent({
      id: 41,
      memberId: 11,
      title: '신규간호사 교육',
      eventType: 'education',
      startDate: '2026-05-22',
      endDate: '2026-05-22',
      dates: ['2026-05-22'],
    }),
    makeMemberEvent({
      id: 42,
      memberId: 12,
      title: '학회 교육',
      eventType: 'education',
      dates: ['2026-05-14'],
    }),
    makeMemberEvent({
      id: 43,
      memberId: 11,
      title: '고정 교육',
      eventType: 'fixed_shift',
      dates: ['2026-05-23'],
      preferredShiftCode: 'EDU',
    }),
  ]
  const leaveLedger = [
    {
      memberId: 11,
      memberName: '송채은',
      annualLeaveDays: 0,
      educationDays: 2,
      blockedEventDays: 2,
      recentNightCount: 1,
      recentWeekendCount: 0,
      recentPublishedChanges: 0,
      lastLeaveDate: null,
    },
    {
      memberId: 12,
      memberName: '박서연',
      annualLeaveDays: 3,
      educationDays: 1,
      blockedEventDays: 1,
      recentNightCount: 1,
      recentWeekendCount: 0,
      recentPublishedChanges: 0,
      lastLeaveDate: '2026-05-14',
    },
  ]
  const validation = {
    summary: { total: 2, errors: 0, warnings: 2, info: 0, blocking: false },
    items: [
      {
        code: 'event.leave_overlap',
        severity: 'warning' as const,
        title: '휴가와 교육 일정 중복',
        message: '중복 발생',
      },
      {
        code: 'fairness.leave_skew',
        severity: 'warning' as const,
        title: '휴가 편중',
        message: '편중 발생',
      },
    ],
  }
  const assignments: PublishedAssignment[] = [
    { memberId: 11, memberName: '송채은', date: '2026-05-23', shiftCode: 'EDU', teamSlug: '101' },
  ]

  const report = buildDatasetScenarioReport({
    members,
    memberEvents,
    wardEvents,
    leaveLedger,
    validation,
    coverage,
    adjustedCoverage,
    assignments,
  })

  assert.equal(report.total, 6)
  assert.equal(report.failed, 0)
  assert.ok(report.items.every((item) => item.passed))
})
