import {
  applyWardEventCoverage,
  buildDatasetScenarioReport,
  buildEventLocks,
  buildLeaveLedger,
  validateDataset,
} from './team-dataset'
import { runScheduleSolver } from './team-schedule-worker'
import {
  buildSolverPayload,
  type AssignmentLock,
  type CoverageDay,
  type DatasetValidationReport,
  type ScheduleEvent,
  type ScheduleGenerationContext,
  type SolverCandidate,
} from './team-schedules'

export type TeamScenarioCheck = {
  label: string
  passed: boolean
  expected: string
  actual: string
}

export type TeamScenarioItem = {
  id: string
  title: string
  description: string
  status: 'passed' | 'failed'
  solverStatus: string
  candidateCount: number
  selectedCandidateKey: string | null
  validation: DatasetValidationReport['summary']
  checks: TeamScenarioCheck[]
}

export type TeamScenarioLabReport = {
  teamSlug: string
  teamName: string
  year: number
  month: number
  generatedAt: string
  total: number
  passed: number
  failed: number
  items: TeamScenarioItem[]
}

type ScenarioBaseContext = ScheduleGenerationContext & {
  baseCoverage?: CoverageDay[]
}

type ScenarioBuilder = {
  id: string
  title: string
  description: string
  mutate: (context: ScenarioBaseContext) => ScenarioBaseContext
  evaluate: (
    context: ScenarioBaseContext,
    selectedCandidate: SolverCandidate | null,
  ) => TeamScenarioCheck[]
}

function cloneContext(context: ScenarioBaseContext): ScenarioBaseContext {
  return {
    team: { ...context.team },
    members: context.members.map((member) => ({
      ...member,
      fairness: { ...member.fairness },
      skillTags: [...member.skillTags],
      previousAssignments: [...member.previousAssignments],
    })),
    shiftTypes: context.shiftTypes.map((shift) => ({ ...shift })),
    baseCoverage: (context.baseCoverage || context.coverage).map((day) => ({
      ...day,
      requirements: { ...day.requirements },
    })),
    coverage: context.coverage.map((day) => ({
      ...day,
      requirements: { ...day.requirements },
    })),
    approvedLeaves: context.approvedLeaves.map((leave) => ({ ...leave })),
    preferredOffRequests: context.preferredOffRequests.map((request) => ({ ...request })),
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
      summary: { ...context.datasetValidation.summary },
      items: context.datasetValidation.items.map((item) => ({
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
    previousPublishedAssignments: context.previousPublishedAssignments.map((assignment) => ({
      ...assignment,
    })),
    rules: {
      ...context.rules,
      forbiddenPatterns: context.rules.forbiddenPatterns.map((pattern) => [...pattern]),
      weights: { ...context.rules.weights },
    },
  }
}

function makeLockKey(lock: AssignmentLock): string {
  return `${lock.memberId}:${lock.date}`
}

function nextEventId(context: ScenarioBaseContext): number {
  const ids = [...context.memberEvents, ...context.wardEvents].map((event) => event.id)
  return (ids.length ? Math.max(...ids) : 0) + 1
}

function nextScenarioDate(context: ScenarioBaseContext, offset = 5): string {
  return context.coverage[Math.min(offset, context.coverage.length - 1)]?.date || context.coverage[0]?.date || `${context.team.year}-${String(context.team.month).padStart(2, '0')}-01`
}

function findScenarioDate(
  context: ScenarioBaseContext,
  offset = 5,
  predicate: (date: string) => boolean = () => true,
): string {
  const start = Math.min(offset, Math.max(context.coverage.length - 1, 0))
  for (let index = start; index < context.coverage.length; index += 1) {
    const date = context.coverage[index]?.date
    if (date && predicate(date)) {
      return date
    }
  }
  return nextScenarioDate(context, offset)
}

function makeEvent(
  context: ScenarioBaseContext,
  overrides: Partial<ScheduleEvent> & Pick<ScheduleEvent, 'scope' | 'eventType' | 'title'>,
): ScheduleEvent {
  const startDate = overrides.startDate || nextScenarioDate(context)
  const endDate = overrides.endDate || startDate
  return {
    id: overrides.id || nextEventId(context),
    teamId: context.team.id,
    periodId: null,
    memberId: overrides.memberId ?? null,
    scope: overrides.scope,
    eventType: overrides.eventType,
    title: overrides.title,
    startDate,
    endDate,
    startMinutes: overrides.startMinutes ?? null,
    endMinutes: overrides.endMinutes ?? null,
    allDay: overrides.allDay ?? true,
    blocksWork: overrides.blocksWork ?? false,
    preferredShiftCode: overrides.preferredShiftCode ?? null,
    coverageDelta: overrides.coverageDelta ?? {},
    notes: overrides.notes ?? null,
    source: overrides.source ?? 'manual',
    dates: overrides.dates || [startDate],
  }
}

function refreshDerivedState(base: ScenarioBaseContext, context: ScenarioBaseContext): ScenarioBaseContext {
  const baseCoverage = (base.baseCoverage || base.coverage).map((day) => ({
    ...day,
    requirements: { ...day.requirements },
  }))
  const baseDerivedLocks = new Set(buildEventLocks(base.memberEvents).map(makeLockKey))
  const manualLocks = base.locks.filter((lock) => !baseDerivedLocks.has(makeLockKey(lock)))
  const derivedLocks = buildEventLocks(context.memberEvents)
  const mergedLocks = new Map<string, AssignmentLock>()
  for (const lock of manualLocks) {
    mergedLocks.set(makeLockKey(lock), { ...lock })
  }
  for (const lock of derivedLocks) {
    mergedLocks.set(makeLockKey(lock), { ...lock })
  }

  context.baseCoverage = baseCoverage
  context.coverage = applyWardEventCoverage(baseCoverage, context.wardEvents)
  context.locks = Array.from(mergedLocks.values())
  context.leaveLedger = buildLeaveLedger({
    members: context.members,
    shiftTypes: context.shiftTypes,
    approvedLeaves: context.approvedLeaves,
    memberEvents: context.memberEvents,
    currentPublishedAssignments: context.previousPublishedAssignments,
  })
  context.datasetValidation = validateDataset({
    members: context.members,
    shiftTypes: context.shiftTypes,
    approvedLeaves: context.approvedLeaves,
    memberEvents: context.memberEvents,
    wardEvents: context.wardEvents,
    leaveLedger: context.leaveLedger,
    assignments: context.previousPublishedAssignments,
  })
  context.datasetScenarioReport = buildDatasetScenarioReport({
    members: context.members,
    memberEvents: context.memberEvents,
    wardEvents: context.wardEvents,
    leaveLedger: context.leaveLedger,
    validation: context.datasetValidation,
    coverage: baseCoverage,
    adjustedCoverage: context.coverage,
    assignments: context.previousPublishedAssignments,
  })

  return context
}

function buildScenarioBuilders(base: ScenarioBaseContext): ScenarioBuilder[] {
  const firstLeave = base.approvedLeaves[0]
  const firstNewGrad = base.members.find((member) => member.skillTags.includes('new-grad'))
  const fixedShiftMember = base.members.find((member) => member.canNight) || base.members[0]
  const coverageScenarioDate = findScenarioDate(
    base,
    15,
    (date) => !base.wardEvents.some(
      (event) => (event.dates || []).includes(date) && Object.keys(event.coverageDelta || {}).length > 0,
    ),
  )

  return [
    {
      id: `${base.team.slug}-baseline`,
      title: `${base.team.name} baseline`,
      description: '현재 팀원, 승인 휴가, 이벤트셋으로 솔버와 검증을 그대로 실행합니다.',
      mutate: (context) => refreshDerivedState(base, context),
      evaluate: (context, selectedCandidate) => [
        {
          label: 'solver completed',
          passed: Boolean(selectedCandidate),
          expected: 'candidate >= 1',
          actual: selectedCandidate ? 'candidate generated' : 'no candidate',
        },
        {
          label: 'dataset not blocking',
          passed: !context.datasetValidation.summary.blocking,
          expected: 'blocking = false',
          actual: `blocking = ${String(context.datasetValidation.summary.blocking)}`,
        },
      ],
    },
    {
      id: `${base.team.slug}-leave-overlap`,
      title: `${base.team.name} leave overlap detection`,
      description: '승인 휴가 날짜에 교육 이벤트를 겹쳐서 validation이 overlap을 잡는지 확인합니다.',
      mutate: (context) => {
        if (firstLeave) {
          context.memberEvents.push(makeEvent(context, {
            memberId: firstLeave.memberId,
            scope: 'member',
            eventType: 'education',
            title: '테스트 교육 중복',
            startDate: firstLeave.date,
            endDate: firstLeave.date,
            blocksWork: true,
            preferredShiftCode: 'EDU',
            allDay: false,
            startMinutes: 540,
            endMinutes: 1020,
            dates: [firstLeave.date],
          }))
        }
        return refreshDerivedState(base, context)
      },
      evaluate: (context) => [
        {
          label: 'overlap warning emitted',
          passed: context.datasetValidation.items.some((item) => item.code === 'event.leave_overlap'),
          expected: 'event.leave_overlap',
          actual: context.datasetValidation.items.map((item) => item.code).join(', ') || 'none',
        },
      ],
    },
    {
      id: `${base.team.slug}-fixed-shift`,
      title: `${base.team.name} fixed shift enforcement`,
      description: 'fixed_shift 이벤트가 EDU 배정으로 강제되는지 확인합니다.',
      mutate: (context) => {
        const date = nextScenarioDate(context, 7)
        context.memberEvents.push(makeEvent(context, {
          memberId: fixedShiftMember?.id ?? null,
          scope: 'member',
          eventType: 'fixed_shift',
          title: '테스트 고정 교육',
          startDate: date,
          endDate: date,
          blocksWork: true,
          preferredShiftCode: 'EDU',
          allDay: false,
          startMinutes: 540,
          endMinutes: 1020,
          dates: [date],
        }))
        return refreshDerivedState(base, context)
      },
      evaluate: (context, selectedCandidate) => {
        const date = nextScenarioDate(context, 7)
        const assignment = selectedCandidate?.assignments.find((item) => item.memberId === fixedShiftMember?.id && item.date === date)
        return [
          {
            label: 'fixed shift matched',
            passed: assignment?.shiftCode === 'EDU',
            expected: 'EDU',
            actual: assignment?.shiftCode || 'none',
          },
        ]
      },
    },
    {
      id: `${base.team.slug}-team-dinner`,
      title: `${base.team.name} dinner non-blocking`,
      description: '팀 회식은 경고 정보로만 남고 근무 차단으로 번지지 않는지 확인합니다.',
      mutate: (context) => {
        const date = nextScenarioDate(context, 11)
        context.wardEvents.push(makeEvent(context, {
          scope: 'team',
          eventType: 'dinner',
          title: '테스트 팀 회식',
          startDate: date,
          endDate: date,
          blocksWork: false,
          allDay: false,
          startMinutes: 1080,
          endMinutes: 1200,
          dates: [date],
        }))
        return refreshDerivedState(base, context)
      },
      evaluate: (context) => [
        {
          label: 'dinner kept non-blocking',
          passed: !context.datasetValidation.items.some((item) => item.code === 'event.assignment_on_blocked_day'),
          expected: 'no blocked-day error from dinner',
          actual: context.datasetValidation.items.map((item) => item.code).join(', ') || 'none',
        },
      ],
    },
    {
      id: `${base.team.slug}-coverage-newgrad`,
      title: `${base.team.name} coverage delta + new-grad protection`,
      description: 'coverage delta와 신규간호사 orientation을 같이 넣고, 신규간호사가 해당 날짜 night에서 밀리는지 확인합니다.',
      mutate: (context) => {
        const date = coverageScenarioDate
        context.wardEvents.push(makeEvent(context, {
          scope: 'team',
          eventType: 'ward_event',
          title: '테스트 커버리지 증분',
          startDate: date,
          endDate: date,
          blocksWork: false,
          coverageDelta: { D: 1 },
          dates: [date],
        }))
        if (firstNewGrad) {
          context.memberEvents.push(makeEvent(context, {
            memberId: firstNewGrad.id,
            scope: 'member',
            eventType: 'orientation',
            title: '테스트 신규간호사 교육',
            startDate: date,
            endDate: date,
            blocksWork: true,
            preferredShiftCode: 'EDU',
            allDay: false,
            startMinutes: 540,
            endMinutes: 1020,
            dates: [date],
          }))
        }
        return refreshDerivedState(base, context)
      },
      evaluate: (context, selectedCandidate) => {
        const date = coverageScenarioDate
        const before = (base.baseCoverage || base.coverage).find((day) => day.date === date)?.requirements.D || 0
        const after = context.coverage.find((day) => day.date === date)?.requirements.D || 0
        const assignment = selectedCandidate?.assignments.find((item) => item.memberId === firstNewGrad?.id && item.date === date)
        return [
          {
            label: 'coverage delta applied',
            passed: after === before + 1,
            expected: `D ${before + 1}`,
            actual: `D ${after}`,
          },
          {
            label: 'new-grad protected from N',
            passed: !firstNewGrad || assignment?.shiftCode !== 'N',
            expected: 'not N',
            actual: assignment?.shiftCode || 'none',
          },
        ]
      },
    },
  ]
}

export async function buildTeamScenarioLab(
  baseContext: ScenarioBaseContext,
): Promise<TeamScenarioLabReport> {
  const scenarios = buildScenarioBuilders(baseContext)
  const items: TeamScenarioItem[] = []

  for (const scenario of scenarios) {
    const mutated = scenario.mutate(cloneContext(baseContext))
    const result = await runScheduleSolver(buildSolverPayload(mutated))
    const selectedCandidate = result.status === 'completed'
      ? result.candidates.find((candidate) => candidate.candidateKey === result.selectedCandidateKey) || result.candidates[0] || null
      : null
    const checks = scenario.evaluate(mutated, selectedCandidate)
    const passed = checks.every((check) => check.passed) && result.status === 'completed'
    items.push({
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      status: passed ? 'passed' : 'failed',
      solverStatus: result.status,
      candidateCount: result.status === 'completed' ? result.candidates.length : 0,
      selectedCandidateKey: result.status === 'completed' ? result.selectedCandidateKey : null,
      validation: mutated.datasetValidation.summary,
      checks,
    })
  }

  return {
    teamSlug: baseContext.team.slug,
    teamName: baseContext.team.name,
    year: baseContext.team.year,
    month: baseContext.team.month,
    generatedAt: new Date().toISOString(),
    total: items.length,
    passed: items.filter((item) => item.status === 'passed').length,
    failed: items.filter((item) => item.status === 'failed').length,
    items,
  }
}

export function buildScenarioBlueprints(baseContext: ScenarioBaseContext) {
  return buildScenarioBuilders(baseContext).map((scenario) => ({
    id: scenario.id,
    title: scenario.title,
    description: scenario.description,
  }))
}
