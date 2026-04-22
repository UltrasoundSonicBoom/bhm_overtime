import {
  type ApprovedLeave,
  type AssignmentLock,
  type CoverageDay,
  type DatasetScenarioReport,
  type DatasetScenarioResult,
  type DatasetValidationItem,
  type DatasetValidationReport,
  type DatasetValidationSeverity,
  type MemberLeaveLedger,
  type PublishedAssignment,
  type ScheduleEvent,
  type ScheduleMember,
  type ShiftTypeDefinition,
} from './team-schedules.js'

type DateBounds = {
  start: string
  end: string
}

type ScheduleEventInput = Omit<ScheduleEvent, 'dates'> & {
  dates?: string[]
}

type BuildLeaveLedgerInput = {
  members: ScheduleMember[]
  shiftTypes: ShiftTypeDefinition[]
  approvedLeaves: ApprovedLeave[]
  memberEvents: ScheduleEvent[]
  historicalPublishedAssignments?: PublishedAssignment[]
  currentPublishedAssignments?: PublishedAssignment[]
  previousVersionAssignments?: PublishedAssignment[]
}

type ValidateDatasetInput = {
  members: ScheduleMember[]
  shiftTypes: ShiftTypeDefinition[]
  approvedLeaves: ApprovedLeave[]
  memberEvents: ScheduleEvent[]
  wardEvents: ScheduleEvent[]
  leaveLedger?: MemberLeaveLedger[]
  assignments?: PublishedAssignment[]
}

type DatasetScenarioReportInput = {
  members: ScheduleMember[]
  memberEvents: ScheduleEvent[]
  wardEvents: ScheduleEvent[]
  leaveLedger: MemberLeaveLedger[]
  validation: DatasetValidationReport
  coverage: CoverageDay[]
  adjustedCoverage: CoverageDay[]
  assignments?: PublishedAssignment[]
}

const TRAINING_EVENT_TYPES = new Set(['education', 'orientation', 'conference'])
const NON_WORK_SHIFT_CODES = new Set(['OFF', 'LEAVE', 'EDU'])

function compareDates(left: string, right: string): number {
  return left.localeCompare(right)
}

function pushValidationItem(
  items: DatasetValidationItem[],
  seen: Set<string>,
  item: DatasetValidationItem,
) {
  const dedupeKey = [
    item.code,
    item.memberId ?? '',
    item.eventId ?? '',
    item.date ?? '',
  ].join(':')
  if (seen.has(dedupeKey)) {
    return
  }
  seen.add(dedupeKey)
  items.push(item)
}

export function listDatesBetween(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const cursor = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return dates
}

export function expandScheduleEvents(
  events: ScheduleEventInput[],
  bounds: DateBounds,
): ScheduleEvent[] {
  return events
    .map((event) => {
      const dates = listDatesBetween(event.startDate, event.endDate)
        .filter((date) => date >= bounds.start && date <= bounds.end)

      return {
        ...event,
        dates,
      }
    })
    .filter((event) => event.dates.length > 0)
}

export function applyWardEventCoverage(
  coverage: CoverageDay[],
  wardEvents: ScheduleEvent[],
): CoverageDay[] {
  const nextCoverage = coverage.map((day) => ({
    ...day,
    requirements: { ...day.requirements },
  }))
  const dayMap = new Map(nextCoverage.map((day) => [day.date, day]))

  for (const event of wardEvents) {
    for (const date of event.dates) {
      const day = dayMap.get(date)
      if (!day) {
        continue
      }
      for (const [shiftCode, delta] of Object.entries(event.coverageDelta || {})) {
        const current = Number(day.requirements[shiftCode] || 0)
        day.requirements[shiftCode] = Math.max(0, current + Number(delta || 0))
      }
    }
  }

  return nextCoverage
}

export function buildEventLocks(memberEvents: ScheduleEvent[]): AssignmentLock[] {
  const locks: AssignmentLock[] = []

  for (const event of memberEvents) {
    if (!event.memberId || !event.preferredShiftCode) {
      continue
    }
    if (event.eventType !== 'fixed_shift' && !event.blocksWork) {
      continue
    }
    for (const date of event.dates) {
      locks.push({
        memberId: event.memberId,
        date,
        shiftCode: event.preferredShiftCode,
        reason: event.title,
      })
    }
  }

  return locks
}

function summarizeValidation(items: DatasetValidationItem[]): DatasetValidationReport['summary'] {
  const summary = {
    total: items.length,
    errors: items.filter((item) => item.severity === 'error').length,
    warnings: items.filter((item) => item.severity === 'warning').length,
    info: items.filter((item) => item.severity === 'info').length,
    blocking: items.some((item) => item.severity === 'error'),
  }

  return summary
}

function isWorkAssignment(shiftCode: string, shiftTypes: ShiftTypeDefinition[]): boolean {
  return shiftTypes.some((shift) => shift.code === shiftCode && shift.isWork)
}

function isWeekend(date: string): boolean {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
  return weekday === 0 || weekday === 6
}

export function buildLeaveLedger(input: BuildLeaveLedgerInput): MemberLeaveLedger[] {
  const {
    members,
    shiftTypes,
    approvedLeaves,
    memberEvents,
    historicalPublishedAssignments = [],
    currentPublishedAssignments = [],
    previousVersionAssignments = [],
  } = input

  const workShiftCodes = new Set(
    shiftTypes.filter((shift) => shift.isWork).map((shift) => shift.code),
  )
  const previousVersionMap = new Map(
    previousVersionAssignments.map((assignment) => [
      `${assignment.memberId}:${assignment.date}`,
      assignment.shiftCode,
    ]),
  )

  return members.map((member) => {
    const leaves = approvedLeaves
      .filter((leave) => leave.memberId === member.id)
      .sort((left, right) => compareDates(left.date, right.date))
    const trainingDates = new Set<string>()
    const blockedDates = new Set<string>()
    for (const event of memberEvents.filter((item) => item.memberId === member.id)) {
      for (const date of event.dates) {
        if (TRAINING_EVENT_TYPES.has(event.eventType)) {
          trainingDates.add(date)
        }
        if (event.blocksWork) {
          blockedDates.add(date)
        }
      }
    }

    const publishedAssignments = [...historicalPublishedAssignments, ...currentPublishedAssignments]
      .filter((assignment) => assignment.memberId === member.id)
    const recentNightCount = publishedAssignments
      .filter((assignment) => assignment.shiftCode === 'N')
      .length
    const recentWeekendCount = publishedAssignments
      .filter((assignment) => workShiftCodes.has(assignment.shiftCode) && isWeekend(assignment.date))
      .length
    const recentPublishedChanges = currentPublishedAssignments
      .filter((assignment) => assignment.memberId === member.id)
      .filter((assignment) => previousVersionMap.get(`${assignment.memberId}:${assignment.date}`) !== assignment.shiftCode)
      .length

    return {
      memberId: member.id,
      memberName: member.name,
      annualLeaveDays: leaves.filter((leave) => leave.leaveType === 'annual').length,
      educationDays: trainingDates.size,
      blockedEventDays: blockedDates.size,
      recentNightCount,
      recentWeekendCount,
      recentPublishedChanges,
      lastLeaveDate: leaves.length ? leaves[leaves.length - 1]!.date : null,
    }
  })
}

export function validateDataset(input: ValidateDatasetInput): DatasetValidationReport {
  const {
    members,
    shiftTypes,
    approvedLeaves,
    memberEvents,
    wardEvents,
    leaveLedger = [],
    assignments = [],
  } = input

  const items: DatasetValidationItem[] = []
  const seen = new Set<string>()
  const memberMap = new Map(members.map((member) => [member.id, member]))
  const shiftCodeSet = new Set(shiftTypes.map((shift) => shift.code))
  const leaveSet = new Set(approvedLeaves.map((leave) => `${leave.memberId}:${leave.date}`))
  const blockedEventsByDay = new Map<string, ScheduleEvent[]>()

  for (const event of [...memberEvents, ...wardEvents]) {
    if (event.scope === 'member' && !event.memberId) {
      pushValidationItem(items, seen, {
        code: 'event.member_required',
        severity: 'error',
        title: '대상 간호사 누락',
        message: '개인 이벤트에는 간호사 지정이 필요합니다.',
        eventId: event.id,
      })
    }

    if (event.eventType === 'fixed_shift' && !event.preferredShiftCode) {
      pushValidationItem(items, seen, {
        code: 'event.fixed_shift_missing_code',
        severity: 'error',
        title: '고정 근무 코드 누락',
        message: 'fixed_shift 이벤트에는 preferredShiftCode가 필요합니다.',
        eventId: event.id,
      })
    }

    if (event.preferredShiftCode && !shiftCodeSet.has(event.preferredShiftCode)) {
      pushValidationItem(items, seen, {
        code: 'event.unknown_shift_code',
        severity: 'warning',
        title: '정의되지 않은 근무 코드',
        message: `${event.title} 이벤트가 알 수 없는 근무 코드 ${event.preferredShiftCode}를 참조합니다.`,
        eventId: event.id,
      })
    }

    for (const shiftCode of Object.keys(event.coverageDelta || {})) {
      if (!shiftCodeSet.has(shiftCode)) {
        pushValidationItem(items, seen, {
          code: 'event.unknown_shift_code',
          severity: 'warning',
          title: '정의되지 않은 커버리지 코드',
          message: `${event.title} 이벤트의 coverage delta가 알 수 없는 코드 ${shiftCode}를 사용합니다.`,
          eventId: event.id,
          details: { shiftCode },
        })
      }
    }

    if (event.memberId && event.blocksWork) {
      for (const date of event.dates) {
        const key = `${event.memberId}:${date}`
        const events = blockedEventsByDay.get(key) || []
        events.push(event)
        blockedEventsByDay.set(key, events)
        if (leaveSet.has(key)) {
          pushValidationItem(items, seen, {
            code: 'event.leave_overlap',
            severity: 'warning',
            title: '휴가와 운영 이벤트 중복',
            message: `${memberMap.get(event.memberId)?.name || '간호사'}의 휴가와 ${event.title} 일정이 겹칩니다.`,
            memberId: event.memberId,
            eventId: event.id,
            date,
          })
        }
      }
    }
  }

  for (const [key, events] of blockedEventsByDay) {
    if (events.length < 2) {
      continue
    }
    const [memberIdRaw, date] = key.split(':')
    pushValidationItem(items, seen, {
      code: 'event.blocking_overlap',
      severity: 'warning',
      title: '차단 이벤트 중복',
      message: `${memberMap.get(Number(memberIdRaw))?.name || '간호사'}에게 같은 날 차단 이벤트가 ${events.length}건 있습니다.`,
      memberId: Number(memberIdRaw),
      eventId: events[0]?.id,
      date,
      details: {
        eventIds: events.map((event) => event.id),
      },
    })
  }

  const blockingEvents = memberEvents.filter((event) => event.memberId && event.blocksWork)
  const blockingEventByDay = new Map<string, ScheduleEvent[]>()
  for (const event of blockingEvents) {
    for (const date of event.dates) {
      const key = `${event.memberId}:${date}`
      const events = blockingEventByDay.get(key) || []
      events.push(event)
      blockingEventByDay.set(key, events)
    }
  }
  for (const assignment of assignments) {
    const events = blockingEventByDay.get(`${assignment.memberId}:${assignment.date}`) || []
    if (events.length === 0) {
      continue
    }
    const allowedCodes = new Set(
      events
        .map((event) => event.preferredShiftCode)
        .filter((value): value is string => Boolean(value)),
    )
    if (allowedCodes.has(assignment.shiftCode)) {
      continue
    }
    if (isWorkAssignment(assignment.shiftCode, shiftTypes)) {
      pushValidationItem(items, seen, {
        code: 'event.assignment_on_blocked_day',
        severity: 'error',
        title: '차단 일정과 근무 충돌',
        message: `${memberMap.get(assignment.memberId)?.name || '간호사'}에게 차단 일정이 있는 날 근무가 배정되었습니다.`,
        memberId: assignment.memberId,
        date: assignment.date,
        details: {
          assignedShiftCode: assignment.shiftCode,
          eventIds: events.map((event) => event.id),
        },
      })
    }
  }

  for (const member of members) {
    if (!(member.skillTags || []).includes('new-grad')) {
      continue
    }
    const hasTrainingEvent = memberEvents.some((event) => (
      event.memberId === member.id && TRAINING_EVENT_TYPES.has(event.eventType)
    ))
    if (!hasTrainingEvent) {
      pushValidationItem(items, seen, {
        code: 'member.new_grad_no_training',
        severity: 'warning',
        title: '신규 간호사 교육 일정 누락',
        message: `${member.name}에게 이번 기간 교육 또는 오리엔테이션 일정이 없습니다.`,
        memberId: member.id,
      })
    }
  }

  for (const member of members) {
    if ((member.age || 0) >= 40 && member.canNight) {
      pushValidationItem(items, seen, {
        code: 'member.age_night_capability',
        severity: 'info',
        title: '40세 이상 야간 가능 인력',
        message: `${member.name}은 40세 이상이면서 야간 가능으로 설정되어 있습니다.`,
        memberId: member.id,
      })
    }
  }

  if (leaveLedger.length > 1) {
    const annualLeaveDays = leaveLedger.map((item) => item.annualLeaveDays)
    const maxAnnualLeave = Math.max(...annualLeaveDays)
    const minAnnualLeave = Math.min(...annualLeaveDays)
    if (maxAnnualLeave - minAnnualLeave >= 2) {
      const member = leaveLedger.find((item) => item.annualLeaveDays === maxAnnualLeave)
      pushValidationItem(items, seen, {
        code: 'fairness.leave_skew',
        severity: 'warning',
        title: '휴가 사용 편중',
        message: '최근 3개월 기준 휴가 사용량이 팀 내에서 크게 벌어져 있습니다.',
        memberId: member?.memberId,
        details: {
          maxAnnualLeave,
          minAnnualLeave,
        },
      })
    }
  }

  return {
    summary: summarizeValidation(items),
    items: items.sort((left, right) => {
      const severityRank: Record<DatasetValidationSeverity, number> = {
        error: 0,
        warning: 1,
        info: 2,
      }
      const severityDiff = severityRank[left.severity] - severityRank[right.severity]
      if (severityDiff !== 0) {
        return severityDiff
      }
      return compareDates(left.date || '9999-99-99', right.date || '9999-99-99')
    }),
  }
}

export function buildDatasetScenarioReport(
  input: DatasetScenarioReportInput,
): DatasetScenarioReport {
  const {
    members,
    memberEvents,
    wardEvents,
    leaveLedger,
    validation,
    coverage,
    adjustedCoverage,
    assignments = [],
  } = input

  const scenarios: DatasetScenarioResult[] = []

  const overlapWarnings = validation.items.filter((item) => item.code === 'event.leave_overlap')
  scenarios.push({
    id: 'dataset.leave_education_overlap',
    title: '승인 휴가와 교육 이벤트 중복 감지',
    category: 'dataset',
    passed: overlapWarnings.length > 0,
    expected: { validationCode: 'event.leave_overlap', minimum: 1 },
    actual: { count: overlapWarnings.length },
  })

  const dinnerEvents = wardEvents.filter((event) => event.eventType === 'dinner')
  scenarios.push({
    id: 'dataset.team_dinner_is_non_blocking',
    title: '회식은 안내만 하고 근무를 막지 않음',
    category: 'dataset',
    passed: dinnerEvents.length > 0 && dinnerEvents.every((event) => !event.blocksWork),
    expected: { blocksWork: false },
    actual: { count: dinnerEvents.length, blocksWorkFlags: dinnerEvents.map((event) => event.blocksWork) },
  })

  const fixedShiftEvents = memberEvents.filter((event) => event.eventType === 'fixed_shift' && Boolean(event.preferredShiftCode))
  const fixedShiftMatches = fixedShiftEvents.flatMap((event) => event.dates.map((date) => {
    const assignment = assignments.find((item) => item.memberId === event.memberId && item.date === date)
    return assignment?.shiftCode === event.preferredShiftCode
  }))
  scenarios.push({
    id: 'dataset.fixed_shift_enforced',
    title: '고정 shift 이벤트가 실제 배정에 반영됨',
    category: 'solver',
    passed: fixedShiftEvents.length > 0 && (assignments.length === 0 || fixedShiftMatches.every(Boolean)),
    expected: { fixedShiftCount: fixedShiftEvents.length },
    actual: {
      assignmentChecked: assignments.length > 0,
      matchedCount: fixedShiftMatches.filter(Boolean).length,
    },
  })

  const coverageDeltaEvents = wardEvents.filter((event) => Object.keys(event.coverageDelta || {}).length > 0)
  const coverageDeltaApplied = coverageDeltaEvents.some((event) => event.dates.some((date) => {
    const before = coverage.find((day) => day.date === date)
    const after = adjustedCoverage.find((day) => day.date === date)
    if (!before || !after) {
      return false
    }
    return Object.entries(event.coverageDelta).some(([shiftCode, delta]) => (
      Number(after.requirements[shiftCode] || 0) === Number(before.requirements[shiftCode] || 0) + Number(delta || 0)
    ))
  }))
  scenarios.push({
    id: 'dataset.coverage_delta_applied',
    title: '공용 이벤트 coverage delta 반영',
    category: 'solver',
    passed: coverageDeltaEvents.length > 0 && coverageDeltaApplied,
    expected: { eventCount: coverageDeltaEvents.length },
    actual: { applied: coverageDeltaApplied },
  })

  const leaveSkewWarnings = validation.items.filter((item) => item.code === 'fairness.leave_skew')
  const maxAnnualLeave = leaveLedger.length ? Math.max(...leaveLedger.map((item) => item.annualLeaveDays)) : 0
  const minAnnualLeave = leaveLedger.length ? Math.min(...leaveLedger.map((item) => item.annualLeaveDays)) : 0
  scenarios.push({
    id: 'dataset.leave_fairness_warning',
    title: '휴가 편중이 크면 fairness 경고 표시',
    category: 'validation',
    passed: maxAnnualLeave - minAnnualLeave < 2 || leaveSkewWarnings.length > 0,
    expected: { warningWhenSpreadAtLeast: 2 },
    actual: { spread: maxAnnualLeave - minAnnualLeave, warningCount: leaveSkewWarnings.length },
  })

  const newGradIds = new Set(
    members
      .filter((member) => (member.skillTags || []).includes('new-grad'))
      .map((member) => member.id),
  )
  const newGradTrainingCount = memberEvents.filter((event) => (
    Boolean(event.memberId)
    && newGradIds.has(event.memberId as number)
    && TRAINING_EVENT_TYPES.has(event.eventType)
  )).length
  scenarios.push({
    id: 'dataset.new_grad_training_present',
    title: '신규 간호사 교육 주간 데이터 보유',
    category: 'dataset',
    passed: newGradIds.size === 0 || newGradTrainingCount > 0,
    expected: { newGradCount: newGradIds.size, trainingEvents: '>= 1' },
    actual: { newGradTrainingCount },
  })

  return {
    total: scenarios.length,
    passed: scenarios.filter((item) => item.passed).length,
    failed: scenarios.filter((item) => !item.passed).length,
    items: scenarios,
  }
}

export function isNonWorkLikeShift(shiftCode: string): boolean {
  return NON_WORK_SHIFT_CODES.has(shiftCode)
}
