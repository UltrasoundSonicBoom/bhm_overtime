import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyApprovedSwapToAssignments,
  buildPersonalScheduleView,
  buildSolverPayload,
  summarizePublishDiff,
  type PublishedAssignment,
  type ScheduleGenerationContext,
} from '../src/services/team-schedules'

test('buildSolverPayload folds leaves, requests, locks, and previous assignments into solver input', () => {
  const context: ScheduleGenerationContext = {
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
        name: '김간호',
        age: 31,
        roleLabel: 'RN',
        canNight: true,
        ftePermille: 1000,
        skillTags: ['charge'],
        fairness: { night: 4, weekend: 2, holiday: 1, undesirable: 3 },
        previousAssignments: ['OFF', 'N', 'OFF', 'D', 'E', 'OFF', 'D'],
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
    coverage: [
      {
        date: '2026-05-01',
        requirements: { D: 3, E: 3, N: 2 },
      },
    ],
    approvedLeaves: [
      { memberId: 11, date: '2026-05-03', leaveType: 'annual' },
    ],
    preferredOffRequests: [
      { memberId: 11, date: '2026-05-04', requestType: 'preferred_off' },
    ],
    locks: [
      { memberId: 11, date: '2026-05-05', shiftCode: 'D', reason: '교육 고정' },
    ],
    memberEvents: [
      {
        id: 1,
        teamId: 7,
        periodId: 70,
        memberId: 11,
        scope: 'member',
        eventType: 'education',
        title: '신규 EMR 교육',
        startDate: '2026-05-05',
        endDate: '2026-05-05',
        startMinutes: 540,
        endMinutes: 1020,
        allDay: false,
        blocksWork: true,
        preferredShiftCode: 'EDU',
        coverageDelta: {},
        notes: null,
        source: 'seed',
        dates: ['2026-05-05'],
      },
    ],
    wardEvents: [
      {
        id: 2,
        teamId: 7,
        periodId: 70,
        memberId: null,
        scope: 'team',
        eventType: 'ward_event',
        title: '감염관리 라운딩',
        startDate: '2026-05-06',
        endDate: '2026-05-06',
        startMinutes: null,
        endMinutes: null,
        allDay: true,
        blocksWork: false,
        preferredShiftCode: null,
        coverageDelta: { D: 1 },
        notes: null,
        source: 'seed',
        dates: ['2026-05-06'],
      },
    ],
    leaveLedger: [
      {
        memberId: 11,
        memberName: '김간호',
        annualLeaveDays: 1,
        educationDays: 1,
        blockedEventDays: 1,
        recentNightCount: 4,
        recentWeekendCount: 2,
        recentPublishedChanges: 0,
        lastLeaveDate: '2026-05-03',
      },
    ],
    datasetValidation: {
      summary: {
        total: 1,
        errors: 0,
        warnings: 1,
        info: 0,
        blocking: false,
      },
      items: [
        {
          code: 'event.leave_overlap',
          severity: 'warning',
          title: '휴가와 교육 일정 중복',
          message: '테스트용 경고',
          memberId: 11,
          eventId: 1,
          date: '2026-05-05',
        },
      ],
    },
    datasetScenarioReport: {
      total: 1,
      passed: 1,
      failed: 0,
      items: [
        {
          id: 'dataset.leave_education_overlap',
          title: '휴가/교육 중복',
          category: 'dataset',
          passed: true,
          expected: { code: 'event.leave_overlap' },
          actual: { count: 1 },
        },
      ],
    },
    previousPublishedAssignments: [
      { memberId: 11, date: '2026-04-30', shiftCode: 'N' },
    ],
    rules: {
      ruleProfileId: 3,
      hospitalRuleVersion: '2026.1',
      minRestHours: 16,
      maxNightShiftsPerMonth: 6,
      forbiddenPatterns: [['N', 'OFF', 'D']],
      weights: {
        request: 10,
        fairness: 25,
        nightCap: 100,
        continuity: 15,
      },
    },
  }

  const payload = buildSolverPayload(context)

  assert.equal(payload.team.slug, '101')
  assert.deepEqual(payload.variants, ['balanced', 'request_friendly', 'continuity_friendly'])
  assert.equal(payload.members[0]?.fairness.night, 4)
  assert.equal(payload.approvedLeaves[0]?.date, '2026-05-03')
  assert.equal(payload.requests[0]?.requestType, 'preferred_off')
  assert.equal(payload.locks[0]?.shiftCode, 'D')
  assert.equal(payload.memberEvents[0]?.preferredShiftCode, 'EDU')
  assert.equal(payload.wardEvents[0]?.coverageDelta.D, 1)
  assert.equal(payload.leaveLedger[0]?.educationDays, 1)
  assert.equal(payload.datasetValidation.summary.warnings, 1)
  assert.equal(payload.datasetScenarioReport?.items[0]?.passed, true)
  assert.equal(payload.previousPublished[0]?.shiftCode, 'N')
  assert.equal(payload.rules.forbiddenPatterns[0]?.join('>'), 'N>OFF>D')
})

test('summarizePublishDiff reports changed days and affected members', () => {
  const previous: PublishedAssignment[] = [
    { memberId: 11, memberName: '김간호', date: '2026-05-01', shiftCode: 'D', teamSlug: '101' },
    { memberId: 12, memberName: '박간호', date: '2026-05-01', shiftCode: 'E', teamSlug: '101' },
  ]
  const next: PublishedAssignment[] = [
    { memberId: 11, memberName: '김간호', date: '2026-05-01', shiftCode: 'E', teamSlug: '101' },
    { memberId: 12, memberName: '박간호', date: '2026-05-01', shiftCode: 'E', teamSlug: '101' },
    { memberId: 11, memberName: '김간호', date: '2026-05-02', shiftCode: 'OFF', teamSlug: '101' },
  ]

  const summary = summarizePublishDiff(previous, next)

  assert.equal(summary.totalChangedAssignments, 2)
  assert.equal(summary.affectedMemberIds.length, 1)
  assert.equal(summary.affectedMemberIds[0], 11)
  assert.equal(summary.addedAssignments, 1)
})

test('applyApprovedSwapToAssignments swaps the two published duties and emits a diff summary', () => {
  const published: PublishedAssignment[] = [
    { memberId: 11, memberName: '김간호', date: '2026-05-10', shiftCode: 'D', teamSlug: '101' },
    { memberId: 12, memberName: '박간호', date: '2026-05-10', shiftCode: 'E', teamSlug: '101' },
  ]

  const result = applyApprovedSwapToAssignments(published, {
    requesterMemberId: 11,
    counterpartyMemberId: 12,
    requesterDate: '2026-05-10',
    counterpartyDate: '2026-05-10',
  })

  assert.equal(result.assignments[0]?.shiftCode, 'E')
  assert.equal(result.assignments[1]?.shiftCode, 'D')
  assert.equal(result.diff.totalChangedAssignments, 2)
})

test('buildPersonalScheduleView returns published shifts and synced leave blocks for the signed-in user', () => {
  const schedule = buildPersonalScheduleView({
    userId: 'user-1',
    teams: [
      {
        teamId: 7,
        teamSlug: '101',
        teamName: '101 병동',
        memberId: 11,
        externalUserId: 'user-1',
      },
    ],
    publishedAssignments: [
      {
        memberId: 11,
        memberName: '김간호',
        date: '2026-05-01',
        shiftCode: 'D',
        teamSlug: '101',
      },
    ],
    shiftTypes: [
      { code: 'D', label: 'Day', startMinutes: 420, endMinutes: 900, isWork: true },
    ],
    leaveRecords: [
      {
        userId: 'user-1',
        type: 'annual',
        startDate: '2026-05-02',
        endDate: '2026-05-02',
      },
    ],
  })

  assert.equal(schedule.entries.length, 2)
  assert.equal(schedule.entries[0]?.source, 'published_shift')
  assert.equal(schedule.entries[1]?.source, 'approved_leave')
})
