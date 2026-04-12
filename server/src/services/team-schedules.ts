export type SolverVariant =
  | 'balanced'
  | 'request_friendly'
  | 'continuity_friendly'

export type FairnessCounters = {
  night: number
  weekend: number
  holiday: number
  undesirable: number
}

export type ScheduleMember = {
  id: number
  name: string
  age: number | null
  roleLabel: string | null
  canNight: boolean
  ftePermille: number
  skillTags: string[]
  fairness: FairnessCounters
  previousAssignments: string[]
}

export type ShiftTypeDefinition = {
  code: string
  label: string
  startMinutes: number
  endMinutes: number
  isWork: boolean
}

export type CoverageDay = {
  date: string
  requirements: Record<string, number>
  isWeekend?: boolean
  isHoliday?: boolean
}

export type ApprovedLeave = {
  memberId: number
  date: string
  leaveType: string
}

export type PreferredOffRequest = {
  memberId: number
  date: string
  requestType: string
  note?: string | null
}

export type AssignmentLock = {
  memberId: number
  date: string
  shiftCode: string
  reason?: string | null
}

export type ScheduleEventScope = 'member' | 'team'

export type ScheduleEventType =
  | 'education'
  | 'meeting'
  | 'dinner'
  | 'conference'
  | 'orientation'
  | 'ward_event'
  | 'restriction'
  | 'fixed_shift'

export type ScheduleEventSource = 'manual' | 'seed' | 'imported'

export type ScheduleEvent = {
  id: number
  teamId: number
  periodId: number | null
  memberId: number | null
  scope: ScheduleEventScope
  eventType: ScheduleEventType
  title: string
  startDate: string
  endDate: string
  startMinutes: number | null
  endMinutes: number | null
  allDay: boolean
  blocksWork: boolean
  preferredShiftCode: string | null
  coverageDelta: Record<string, number>
  notes: string | null
  source: ScheduleEventSource
  dates: string[]
}

export type MemberLeaveLedger = {
  memberId: number
  memberName: string
  annualLeaveDays: number
  educationDays: number
  blockedEventDays: number
  recentNightCount: number
  recentWeekendCount: number
  recentPublishedChanges: number
  lastLeaveDate: string | null
}

export type DatasetValidationSeverity = 'error' | 'warning' | 'info'

export type DatasetValidationItem = {
  code: string
  severity: DatasetValidationSeverity
  title: string
  message: string
  memberId?: number | null
  eventId?: number | null
  date?: string | null
  details?: Record<string, unknown>
}

export type DatasetValidationSummary = {
  total: number
  errors: number
  warnings: number
  info: number
  blocking: boolean
}

export type DatasetValidationReport = {
  summary: DatasetValidationSummary
  items: DatasetValidationItem[]
}

export type DatasetScenarioResult = {
  id: string
  title: string
  category: string
  passed: boolean
  expected: Record<string, unknown>
  actual: Record<string, unknown>
}

export type DatasetScenarioReport = {
  total: number
  passed: number
  failed: number
  items: DatasetScenarioResult[]
}

export type PublishedAssignment = {
  memberId: number
  memberName?: string | null
  date: string
  shiftCode: string
  teamSlug: string
}

export type ScheduleRules = {
  ruleProfileId: number | null
  hospitalRuleVersion: string | null
  minRestHours: number
  maxNightShiftsPerMonth: number
  forbiddenPatterns: string[][]
  weights: {
    request: number
    fairness: number
    nightCap: number
    continuity: number
  }
}

export type ScheduleGenerationContext = {
  team: {
    id: number
    slug: string
    name: string
    year: number
    month: number
  }
  members: ScheduleMember[]
  shiftTypes: ShiftTypeDefinition[]
  coverage: CoverageDay[]
  approvedLeaves: ApprovedLeave[]
  preferredOffRequests: PreferredOffRequest[]
  locks: AssignmentLock[]
  memberEvents: ScheduleEvent[]
  wardEvents: ScheduleEvent[]
  leaveLedger: MemberLeaveLedger[]
  datasetValidation: DatasetValidationReport
  datasetScenarioReport?: DatasetScenarioReport
  previousPublishedAssignments: PublishedAssignment[]
  rules: ScheduleRules
}

export type SolverPayload = {
  team: ScheduleGenerationContext['team']
  members: ScheduleMember[]
  shiftTypes: ShiftTypeDefinition[]
  coverage: CoverageDay[]
  approvedLeaves: ApprovedLeave[]
  requests: PreferredOffRequest[]
  locks: AssignmentLock[]
  memberEvents: ScheduleEvent[]
  wardEvents: ScheduleEvent[]
  leaveLedger: MemberLeaveLedger[]
  datasetValidation: DatasetValidationReport
  datasetScenarioReport?: DatasetScenarioReport
  previousPublished: PublishedAssignment[]
  rules: ScheduleRules
  variants: SolverVariant[]
}

export type PublishDiffSummary = {
  totalChangedAssignments: number
  affectedMemberIds: number[]
  addedAssignments: number
  removedAssignments: number
}

export type SwapDescriptor = {
  requesterMemberId: number
  counterpartyMemberId: number
  requesterDate: string
  counterpartyDate: string
}

export type ConstraintViolation = {
  severity: 'hard' | 'soft'
  ruleCode: string
  message: string
  date?: string | null
  memberId?: number | null
  details?: Record<string, unknown>
}

export type SolverCandidate = {
  candidateKey: SolverVariant
  rank: number
  score: Record<string, number>
  explanation: {
    headline: string
    reasons: string[]
    tradeoffs: string[]
  }
  assignments: PublishedAssignment[]
  violations: ConstraintViolation[]
}

export type SolverRunResult =
  | {
      status: 'completed'
      engine: string
      selectedCandidateKey: SolverVariant
      candidates: SolverCandidate[]
      summary?: Record<string, unknown>
    }
  | {
      status: 'infeasible'
      engine: string
      reasons: string[]
      suggestions: string[]
      summary?: Record<string, unknown>
    }

export type PersonalScheduleViewInput = {
  userId: string
  teams: Array<{
    teamId: number
    teamSlug: string
    teamName: string
    memberId: number
    externalUserId: string | null
  }>
  publishedAssignments: PublishedAssignment[]
  shiftTypes: ShiftTypeDefinition[]
  leaveRecords: Array<{
    userId: string
    type: string
    startDate: string
    endDate: string
  }>
}

export type PersonalScheduleEntry = {
  teamSlug: string
  teamName: string
  date: string
  label: string
  shiftCode: string
  startMinutes: number | null
  endMinutes: number | null
  source: 'published_shift' | 'approved_leave'
}

function assignmentKey(memberId: number, date: string): string {
  return `${memberId}:${date}`
}

function shiftCodeKey(memberId: number, date: string, shiftCode: string): string {
  return `${memberId}:${date}:${shiftCode}`
}

export function parsePeriodKey(period: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(period)
  if (!match) {
    throw new Error('Period must be YYYY-MM')
  }

  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Invalid period')
  }

  return { year, month }
}

export function makePeriodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function buildSolverPayload(
  context: ScheduleGenerationContext,
): SolverPayload {
  const datasetValidation = context.datasetValidation ?? {
    summary: {
      total: 0,
      errors: 0,
      warnings: 0,
      info: 0,
      blocking: false,
    },
    items: [],
  }

  return {
    team: context.team,
    members: context.members.map((member) => ({
      ...member,
      skillTags: [...member.skillTags],
      previousAssignments: [...member.previousAssignments],
      fairness: { ...member.fairness },
    })),
    shiftTypes: context.shiftTypes.map((shift) => ({ ...shift })),
    coverage: context.coverage.map((day) => ({
      date: day.date,
      requirements: { ...day.requirements },
    })),
    approvedLeaves: context.approvedLeaves.map((leave) => ({ ...leave })),
    requests: context.preferredOffRequests.map((request) => ({ ...request })),
    locks: context.locks.map((lock) => ({ ...lock })),
    memberEvents: context.memberEvents.map((event) => ({
      ...event,
      coverageDelta: { ...event.coverageDelta },
      dates: [...event.dates],
    })),
    wardEvents: context.wardEvents.map((event) => ({
      ...event,
      coverageDelta: { ...event.coverageDelta },
      dates: [...event.dates],
    })),
    leaveLedger: context.leaveLedger.map((item) => ({ ...item })),
    datasetValidation: {
      summary: { ...datasetValidation.summary },
      items: datasetValidation.items.map((item) => ({
        ...item,
        details: item.details ? { ...item.details } : undefined,
      })),
    },
    datasetScenarioReport: context.datasetScenarioReport
      ? {
          total: context.datasetScenarioReport.total,
          passed: context.datasetScenarioReport.passed,
          failed: context.datasetScenarioReport.failed,
          items: context.datasetScenarioReport.items.map((item) => ({
            ...item,
            expected: { ...item.expected },
            actual: { ...item.actual },
          })),
        }
      : undefined,
    previousPublished: context.previousPublishedAssignments.map((assignment) => ({
      ...assignment,
    })),
    rules: {
      ...context.rules,
      forbiddenPatterns: context.rules.forbiddenPatterns.map((pattern) => [...pattern]),
      weights: { ...context.rules.weights },
    },
    variants: ['balanced', 'request_friendly', 'continuity_friendly'],
  }
}

export function summarizePublishDiff(
  previous: PublishedAssignment[],
  next: PublishedAssignment[],
): PublishDiffSummary {
  const previousMap = new Map(previous.map((assignment) => [
    assignmentKey(assignment.memberId, assignment.date),
    assignment,
  ]))
  const nextMap = new Map(next.map((assignment) => [
    assignmentKey(assignment.memberId, assignment.date),
    assignment,
  ]))
  const allKeys = new Set([...previousMap.keys(), ...nextMap.keys()])
  const affected = new Set<number>()
  let addedAssignments = 0
  let removedAssignments = 0
  let totalChangedAssignments = 0

  for (const key of allKeys) {
    const before = previousMap.get(key)
    const after = nextMap.get(key)

    if (!before && after) {
      addedAssignments += 1
      totalChangedAssignments += 1
      affected.add(after.memberId)
      continue
    }

    if (before && !after) {
      removedAssignments += 1
      totalChangedAssignments += 1
      affected.add(before.memberId)
      continue
    }

    if (before && after && before.shiftCode !== after.shiftCode) {
      totalChangedAssignments += 1
      affected.add(before.memberId)
    }
  }

  return {
    totalChangedAssignments,
    affectedMemberIds: Array.from(affected).sort((left, right) => left - right),
    addedAssignments,
    removedAssignments,
  }
}

export function applyApprovedSwapToAssignments(
  assignments: PublishedAssignment[],
  swap: SwapDescriptor,
): { assignments: PublishedAssignment[]; diff: PublishDiffSummary } {
  const nextAssignments = assignments.map((assignment) => ({ ...assignment }))
  const requesterKey = assignmentKey(swap.requesterMemberId, swap.requesterDate)
  const counterpartyKey = assignmentKey(
    swap.counterpartyMemberId,
    swap.counterpartyDate,
  )
  const requesterIndex = nextAssignments.findIndex((assignment) => (
    assignmentKey(assignment.memberId, assignment.date) === requesterKey
  ))
  const counterpartyIndex = nextAssignments.findIndex((assignment) => (
    assignmentKey(assignment.memberId, assignment.date) === counterpartyKey
  ))

  if (requesterIndex === -1 || counterpartyIndex === -1) {
    throw new Error('Swap targets must exist in the published schedule')
  }

  const requester = nextAssignments[requesterIndex]
  const counterparty = nextAssignments[counterpartyIndex]
  if (!requester || !counterparty) {
    throw new Error('Swap targets must exist in the published schedule')
  }

  nextAssignments[requesterIndex] = {
    ...requester,
    shiftCode: counterparty.shiftCode,
  }
  nextAssignments[counterpartyIndex] = {
    ...counterparty,
    shiftCode: requester.shiftCode,
  }

  return {
    assignments: nextAssignments,
    diff: summarizePublishDiff(assignments, nextAssignments),
  }
}

export function buildPersonalScheduleView(
  input: PersonalScheduleViewInput,
): { entries: PersonalScheduleEntry[] } {
  const shiftTypeMap = new Map(
    input.shiftTypes.map((shiftType) => [shiftType.code, shiftType]),
  )
  const memberToTeam = new Map(
    input.teams.map((teamMembership) => [teamMembership.memberId, teamMembership]),
  )
  const teamEntries: PersonalScheduleEntry[] = []
  const seenShiftAssignments = new Set<string>()

  for (const assignment of input.publishedAssignments) {
    const teamMembership = memberToTeam.get(assignment.memberId)
    if (!teamMembership || teamMembership.externalUserId !== input.userId) {
      continue
    }

    const shiftType = shiftTypeMap.get(assignment.shiftCode)
    seenShiftAssignments.add(
      shiftCodeKey(assignment.memberId, assignment.date, assignment.shiftCode),
    )
    teamEntries.push({
      teamSlug: teamMembership.teamSlug,
      teamName: teamMembership.teamName,
      date: assignment.date,
      label: shiftType?.label || assignment.shiftCode,
      shiftCode: assignment.shiftCode,
      startMinutes: shiftType?.isWork ? shiftType.startMinutes : null,
      endMinutes: shiftType?.isWork ? shiftType.endMinutes : null,
      source: 'published_shift',
    })
  }

  for (const leave of input.leaveRecords) {
    if (leave.userId !== input.userId) {
      continue
    }

    const teamMembership = input.teams[0]
    if (!teamMembership) {
      continue
    }

    const current = new Date(`${leave.startDate}T00:00:00Z`)
    const end = new Date(`${leave.endDate}T00:00:00Z`)
    while (current <= end) {
      const date = current.toISOString().slice(0, 10)
      const dedupeKey = shiftCodeKey(teamMembership.memberId, date, 'LEAVE')
      if (!seenShiftAssignments.has(dedupeKey)) {
        teamEntries.push({
          teamSlug: teamMembership.teamSlug,
          teamName: teamMembership.teamName,
          date,
          label: leave.type,
          shiftCode: 'LEAVE',
          startMinutes: null,
          endMinutes: null,
          source: 'approved_leave',
        })
      }
      current.setUTCDate(current.getUTCDate() + 1)
    }
  }

  teamEntries.sort((left, right) => (
    left.date.localeCompare(right.date) || left.teamSlug.localeCompare(right.teamSlug)
  ))

  return { entries: teamEntries }
}
