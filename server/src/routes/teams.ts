import { Hono } from 'hono'
import postgres from 'postgres'
import { optionalAuth } from '../middleware/auth'
import { buildIcsCalendar } from '../services/calendar-ics'
import {
  applyWardEventCoverage,
  buildDatasetScenarioReport,
  buildEventLocks,
  buildLeaveLedger,
  expandScheduleEvents,
  validateDataset,
} from '../services/team-dataset'
import {
  applyApprovedSwapToAssignments,
  buildSolverPayload,
  parsePeriodKey,
  summarizePublishDiff,
  type ApprovedLeave,
  type AssignmentLock,
  type CoverageDay,
  type DatasetScenarioReport,
  type DatasetValidationReport,
  type MemberLeaveLedger,
  type PreferredOffRequest,
  type PublishedAssignment,
  type ScheduleEvent,
  type ScheduleGenerationContext,
  type ScheduleRules,
  type ShiftTypeDefinition,
} from '../services/team-schedules'
import { runScheduleSolver } from '../services/team-schedule-worker'
import { buildTeamScenarioLab } from '../services/team-scenario-lab'

const teamRoutes = new Hono()
const sql = postgres(process.env.DATABASE_URL!, { prepare: false })

const roleRank: Record<string, number> = {
  viewer: 0,
  staff: 1,
  scheduler: 2,
  head_nurse: 3,
}

type TeamRow = {
  id: number
  slug: string
  name: string
  description: string | null
  metadata: Record<string, unknown> | null
}

type MembershipRow = {
  team_role: string
  member_id: number
}

type TeamMemberRow = {
  id: number
  external_user_id: string | null
  display_name: string
  age: number | null
  role_label: string | null
  can_night: boolean | null
  fte_permille: number
  skill_tags: string[] | null
}

type TeamContextRecord = {
  team: ScheduleGenerationContext['team']
  periodId: number
  currentPublishVersionId: number | null
  currentCandidateId: number | null
  members: ScheduleGenerationContext['members']
  shiftTypes: ShiftTypeDefinition[]
  baseCoverage: CoverageDay[]
  coverage: CoverageDay[]
  approvedLeaves: ApprovedLeave[]
  preferredOffRequests: PreferredOffRequest[]
  locks: AssignmentLock[]
  memberEvents: ScheduleEvent[]
  wardEvents: ScheduleEvent[]
  leaveLedger: MemberLeaveLedger[]
  datasetValidation: DatasetValidationReport
  datasetScenarioReport: DatasetScenarioReport
  previousPublishedAssignments: PublishedAssignment[]
  rules: ScheduleRules
}

type PeriodRow = {
  id: number
  team_id: number
  year: number
  month: number
  status: string
  current_candidate_id: number | null
  current_publish_version_id: number | null
  latest_run_id: number | null
}

type TeamScheduleEventRow = {
  id: number
  team_id: number
  period_id: number | null
  member_id: number | null
  scope: 'member' | 'team'
  event_type: ScheduleEvent['eventType']
  title: string
  start_date: string
  end_date: string
  start_minutes: number | null
  end_minutes: number | null
  all_day: boolean
  blocks_work: boolean
  preferred_shift_code: string | null
  coverage_delta: Record<string, number> | null
  notes: string | null
  source: ScheduleEvent['source']
}

function getUserId(c: any): string | null {
  return (c.get('userId') as string | null) ?? null
}

function normalizeJson<T>(value: unknown, fallback: T): T {
  if (value == null) {
    return fallback
  }
  return value as T
}

function monthBounds(year: number, month: number): { start: string; end: string } {
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 0))
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const base = new Date(Date.UTC(year, month - 1, 1))
  base.setUTCMonth(base.getUTCMonth() + delta)
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
  }
}

function listDatesBetween(start: string, end: string): string[] {
  const dates: string[] = []
  const cursor = new Date(`${start}T00:00:00Z`)
  const last = new Date(`${end}T00:00:00Z`)
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

function pilotYear(): number {
  return new Date().getUTCFullYear()
}

function pilotMonth(): number {
  return new Date().getUTCMonth() + 1
}

function buildCoverageCalendar(
  year: number,
  month: number,
  templateRules: Record<string, unknown>,
  holidaySet: Set<string>,
): CoverageDay[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const defaultRequirements = normalizeJson<Record<string, number>>(
    templateRules.defaultRequirements ?? templateRules.default ?? { D: 3, E: 3, N: 2 },
    { D: 3, E: 3, N: 2 },
  )
  const weekdayRules = normalizeJson<Record<string, Record<string, number>>>(
    templateRules.weekdayRules ?? templateRules.weekdays ?? {},
    {},
  )
  const specificDates = normalizeJson<Record<string, Record<string, number>>>(
    templateRules.specificDates ?? templateRules.byDate ?? {},
    {},
  )
  const coverage: CoverageDay[] = []

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateValue = new Date(Date.UTC(year, month - 1, day))
    const dateStr = dateValue.toISOString().slice(0, 10)
    const dayOfWeek = String(dateValue.getUTCDay())
    const requirements = {
      ...defaultRequirements,
      ...(weekdayRules[dayOfWeek] || {}),
      ...(specificDates[dateStr] || {}),
    }
    coverage.push({
      date: dateStr,
      requirements,
      isWeekend: dateValue.getUTCDay() === 0 || dateValue.getUTCDay() === 6,
      isHoliday: holidaySet.has(dateStr),
    })
  }

  return coverage
}

function buildMemberHistory(
  members: TeamMemberRow[],
  snapshots: Array<{ assignments_snapshot: PublishedAssignment[] }>,
  activeShiftCodes: Set<string>,
  holidaySet: Set<string>,
): Map<number, { fairness: ScheduleGenerationContext['members'][number]['fairness']; previousAssignments: string[] }> {
  const history = new Map<number, { fairness: ScheduleGenerationContext['members'][number]['fairness']; previousAssignments: string[] }>()

  for (const member of members) {
    history.set(member.id, {
      fairness: {
        night: 0,
        weekend: 0,
        holiday: 0,
        undesirable: 0,
      },
      previousAssignments: [],
    })
  }

  const assignments = snapshots
    .flatMap((snapshot) => normalizeJson<PublishedAssignment[]>(snapshot.assignments_snapshot, []))
    .filter((assignment) => history.has(assignment.memberId))
    .sort((left, right) => left.date.localeCompare(right.date))

  for (const assignment of assignments) {
    const record = history.get(assignment.memberId)
    if (!record) {
      continue
    }
    record.previousAssignments.push(assignment.shiftCode)
    if (record.previousAssignments.length > 7) {
      record.previousAssignments = record.previousAssignments.slice(-7)
    }
    if (assignment.shiftCode === 'N') {
      record.fairness.night += 1
      record.fairness.undesirable += 1
    }
    if (activeShiftCodes.has(assignment.shiftCode) && (holidaySet.has(assignment.date) || isWeekendDate(assignment.date))) {
      record.fairness.weekend += 1
    }
    if (activeShiftCodes.has(assignment.shiftCode) && holidaySet.has(assignment.date)) {
      record.fairness.holiday += 1
    }
    if (assignment.shiftCode === 'E') {
      record.fairness.undesirable += 1
    }
  }

  return history
}

function isWeekendDate(dateStr: string): boolean {
  const weekday = new Date(`${dateStr}T00:00:00Z`).getUTCDay()
  return weekday === 0 || weekday === 6
}

function minutesToIso(dateStr: string, minutes: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`)
  date.setUTCMinutes(minutes)
  return date.toISOString()
}

function nextDateString(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

async function getTeamBySlug(teamSlug: string): Promise<TeamRow | null> {
  const rows = await sql<TeamRow[]>`
    select distinct
      t.id,
      t.slug,
      t.name,
      t.description,
      t.metadata
    from teams t
    left join team_subdomains ts on ts.team_id = t.id and ts.is_active = true
    where t.is_active = true
      and (t.slug = ${teamSlug} or ts.slug = ${teamSlug})
    limit 1
  `
  return rows[0] || null
}

teamRoutes.get('/', async (c) => {
  const year = Number(c.req.query('year') || pilotYear())
  const month = Number(c.req.query('month') || pilotMonth())
  const rows = await sql<Array<{
    id: number
    slug: string
    name: string
    description: string | null
    metadata: Record<string, unknown> | null
    current_status: string | null
    current_publish_version_id: number | null
    current_candidate_id: number | null
  }>>`
    select
      t.id,
      t.slug,
      t.name,
      t.description,
      t.metadata,
      sp.status as current_status,
      sp.current_publish_version_id,
      sp.current_candidate_id
    from teams t
    left join schedule_periods sp
      on sp.team_id = t.id
      and sp.year = ${year}
      and sp.month = ${month}
    where t.is_active = true
    order by t.slug asc
  `

  return c.json({ results: rows })
})

teamRoutes.post('/:teamSlug/claim-demo-access', async (c) => {
  const userId = getUserId(c)
  if (!userId) {
    return c.json({ error: 'Authorization required' }, 401)
  }

  const team = await getTeamBySlug(c.req.param('teamSlug'))
  if (!team) {
    return c.json({ error: 'Team not found' }, 404)
  }
  if (!team.metadata?.demoMode) {
    return c.json({ error: 'Demo claim is disabled for this team' }, 403)
  }

  const existing = await getMembership(team.id, userId)
  if (existing) {
    return c.json({ result: { memberId: existing.member_id, teamRole: existing.team_role } })
  }

  const body: {
    displayName?: string
    employeeCode?: string
    roleLabel?: string
  } = await c.req.json().catch(() => ({}))
  const displayName = (body.displayName || '파일럿 관리자').trim()
  const employeeCode = body.employeeCode || `DEMO-${team.slug.toUpperCase()}`
  const roleLabel = body.roleLabel || 'Pilot Scheduler'
  const existingMemberRows = await sql<Array<{ id: number }>>`
    select id
    from team_members
    where external_user_id = ${userId}::uuid
    limit 1
  `
  let memberId = existingMemberRows[0]?.id || null
  if (memberId) {
    await sql`
      update team_members
      set
        display_name = ${displayName},
        employee_code = ${employeeCode},
        role_label = ${roleLabel},
        metadata = ${sql.json({ claimedDemoAccess: true } as any)},
        updated_at = now()
      where id = ${memberId}
    `
  } else {
    const [memberRow] = await sql<Array<{ id: number }>>`
      insert into team_members (
        external_user_id,
        employee_code,
        display_name,
        age,
        role_label,
        skill_tags,
        fte_permille,
        can_night,
        metadata
      )
      values (
        ${userId},
        ${employeeCode},
        ${displayName},
        35,
        ${roleLabel},
        ${sql.json(['pilot', 'scheduler'] as any)},
        1000,
        true,
        ${sql.json({ claimedDemoAccess: true } as any)}
      )
      returning id
    `
    memberId = memberRow.id
  }

  await sql`
    insert into team_memberships (
      team_id,
      member_id,
      team_role,
      is_primary,
      metadata
    )
    values (
      ${team.id},
      ${memberId},
      'head_nurse',
      true,
      ${sql.json({ claimedDemoAccess: true } as any)}
    )
    on conflict (team_id, member_id) do update
      set team_role = 'head_nurse',
          metadata = excluded.metadata
  `

  return c.json({
    result: {
      memberId,
      teamRole: 'head_nurse',
    },
  }, 201)
})

async function getMembership(teamId: number, userId: string): Promise<MembershipRow | null> {
  const rows = await sql<MembershipRow[]>`
    select
      tm.team_role,
      tm.member_id
    from team_memberships tm
    inner join team_members m on m.id = tm.member_id
    where tm.team_id = ${teamId}
      and tm.ended_at is null
      and m.external_user_id = ${userId}::uuid
    limit 1
  `
  return rows[0] || null
}

async function requireTeamRole(
  c: any,
  teamId: number,
  minimumRole: keyof typeof roleRank,
): Promise<{ membership: MembershipRow | null; status: number | null; error: string | null }> {
  const userId = getUserId(c)
  if (!userId) {
    return {
      membership: null,
      status: 401,
      error: 'Authorization required',
    }
  }

  const membership = await getMembership(teamId, userId)
  if (!membership || roleRank[membership.team_role] < roleRank[minimumRole]) {
    return {
      membership: null,
      status: 403,
      error: 'Team access required',
    }
  }
  return {
    membership,
    status: null,
    error: null,
  }
}

function respondAccessError(
  c: any,
  access: { status: number | null; error: string | null },
) {
  return c.json(
    { error: access.error || 'Team access required' },
    (access.status || 403) as 401 | 403,
  )
}

async function upsertPeriod(teamId: number, year: number, month: number, activeRuleProfileId: number | null): Promise<PeriodRow> {
  const rows = await sql<PeriodRow[]>`
    insert into schedule_periods (
      team_id,
      year,
      month,
      status,
      active_rule_profile_id
    )
    values (
      ${teamId},
      ${year},
      ${month},
      'draft',
      ${activeRuleProfileId}
    )
    on conflict (team_id, year, month)
    do update set
      updated_at = now(),
      active_rule_profile_id = coalesce(excluded.active_rule_profile_id, schedule_periods.active_rule_profile_id)
    returning
      id,
      team_id,
      year,
      month,
      status,
      current_candidate_id,
      current_publish_version_id,
      latest_run_id
  `
  return rows[0]!
}

async function getHolidaySet(year: number): Promise<Set<string>> {
  const rows = await sql<Array<{ items: Array<{ date: string }> | null }>>`
    select items
    from calendar_snapshots
    where year = ${year} and kind = 'holidays'
    limit 1
  `
  const holidayDates = new Set<string>()
  const items = normalizeJson<Array<{ date: string }>>(rows[0]?.items, [])
  for (const item of items) {
    if (item.date) {
      const date = item.date.length === 8
        ? `${item.date.slice(0, 4)}-${item.date.slice(4, 6)}-${item.date.slice(6, 8)}`
        : item.date
      holidayDates.add(date)
    }
  }
  return holidayDates
}

async function buildTeamContext(team: TeamRow, year: number, month: number): Promise<TeamContextRecord> {
  const [ruleRows, shiftRows, coverageRows, memberRows] = await Promise.all([
    sql<Array<{ id: number; hospital_rule_version: string | null; structured_rules: Record<string, unknown> | null; scoring_weights: Record<string, number> | null }>>`
      select id, hospital_rule_version, structured_rules, scoring_weights
      from team_rule_profiles
      where team_id = ${team.id} and is_active = true
      order by version desc
      limit 1
    `,
    sql<Array<{ code: string; label: string; start_minutes: number; end_minutes: number; is_work: boolean }>>`
      select code, label, start_minutes, end_minutes, is_work
      from shift_types
      where team_id = ${team.id}
      order by sort_order asc, code asc
    `,
    sql<Array<{ rules: Record<string, unknown> | null }>>`
      select rules
      from coverage_templates
      where team_id = ${team.id} and is_active = true
      order by id desc
      limit 1
    `,
    sql<TeamMemberRow[]>`
      select
        m.id,
        m.external_user_id,
        m.display_name,
        m.age,
        m.role_label,
        m.can_night,
        m.fte_permille,
        m.skill_tags
      from team_memberships tm
      inner join team_members m on m.id = tm.member_id
      where tm.team_id = ${team.id}
        and tm.ended_at is null
      order by tm.team_role desc, m.display_name asc
    `,
  ])

  const shiftTypes: ShiftTypeDefinition[] = shiftRows.map((row) => ({
    code: row.code,
    label: row.label,
    startMinutes: row.start_minutes,
    endMinutes: row.end_minutes,
    isWork: row.is_work,
  }))
  const activeShiftCodes = new Set(shiftTypes.filter((item) => item.isWork).map((item) => item.code))
  const holidays = await getHolidaySet(year)
  const activeRuleProfileId = ruleRows[0]?.id ?? null
  const period = await upsertPeriod(team.id, year, month, activeRuleProfileId)
  const baseCoverage = buildCoverageCalendar(
    year,
    month,
    normalizeJson<Record<string, unknown>>(coverageRows[0]?.rules, {}),
    holidays,
  )

  const historyPeriods = [1, 2, 3].map((delta) => addMonths(year, month, -delta))
  const priorYearMonths = historyPeriods.map((item) => `${item.year}-${item.month}`)
  const historyRows = priorYearMonths.length > 0
    ? await sql<Array<{ assignments_snapshot: PublishedAssignment[] }>>`
        select pv.assignments_snapshot
        from schedule_periods sp
        inner join publish_versions pv on pv.id = sp.current_publish_version_id
        where sp.team_id = ${team.id}
          and concat(sp.year, '-', sp.month) = any(${sql.array(priorYearMonths)})
      `
    : []
  const historicalPublishedAssignments = historyRows.flatMap((row) => (
    normalizeJson<PublishedAssignment[]>(row.assignments_snapshot, [])
  ))
  const history = buildMemberHistory(memberRows, historyRows, activeShiftCodes, holidays)

  const userIdToMemberId = new Map<string, number>()
  for (const member of memberRows) {
    if (member.external_user_id) {
      userIdToMemberId.set(member.external_user_id, member.id)
    }
  }

  const { start, end } = monthBounds(year, month)
  const leaveRows = userIdToMemberId.size > 0
    ? await sql<Array<{ user_id: string; type: string; startDate: string; endDate: string }>>`
        select
          user_id::text as user_id,
          type,
          "startDate",
          "endDate"
        from leave_records
        where user_id::text = any(${sql.array(Array.from(userIdToMemberId.keys()))})
          and "startDate" <= ${end}
          and "endDate" >= ${start}
      `
    : []
  const approvedLeaves: ApprovedLeave[] = []
  for (const leave of leaveRows) {
    const memberId = userIdToMemberId.get(leave.user_id)
    if (!memberId) {
      continue
    }
    for (const leaveDate of listDatesBetween(leave.startDate, leave.endDate)) {
      if (leaveDate >= start && leaveDate <= end) {
        approvedLeaves.push({
          memberId,
          date: leaveDate,
          leaveType: leave.type,
        })
      }
    }
  }

  const requestRows = await sql<Array<{ member_id: number; request_date: string; request_type: string; note: string | null }>>`
    select member_id, request_date::text, request_type, note
    from schedule_requests
    where period_id = ${period.id}
    order by request_date asc, member_id asc
  `
  const lockRows = await sql<Array<{ member_id: number; work_date: string; locked_shift_code: string; reason: string | null }>>`
    select member_id, work_date::text, locked_shift_code, reason
    from assignment_locks
    where period_id = ${period.id}
    order by work_date asc, member_id asc
  `
  const [publishVersionRows, eventRows] = await Promise.all([
    sql<Array<{ id: number; version_number: number; assignments_snapshot: PublishedAssignment[] }>>`
      select id, version_number, assignments_snapshot
      from publish_versions
      where period_id = ${period.id}
      order by version_number desc
      limit 2
    `,
    sql<TeamScheduleEventRow[]>`
      select
        id,
        team_id,
        period_id,
        member_id,
        scope,
        event_type,
        title,
        start_date::text,
        end_date::text,
        start_minutes,
        end_minutes,
        all_day,
        blocks_work,
        preferred_shift_code,
        coverage_delta,
        notes,
        source
      from team_schedule_events
      where team_id = ${team.id}
        and (period_id is null or period_id = ${period.id})
        and start_date <= ${end}
        and end_date >= ${start}
      order by start_date asc, id asc
    `,
  ])
  const currentPublishedAssignments = normalizeJson<PublishedAssignment[]>(
    publishVersionRows.find((row) => row.id === period.current_publish_version_id)?.assignments_snapshot,
    [],
  )
  const previousVersionAssignments = normalizeJson<PublishedAssignment[]>(
    publishVersionRows.find((row) => row.id !== period.current_publish_version_id)?.assignments_snapshot,
    [],
  )
  const expandedEvents = expandScheduleEvents(eventRows.map((row) => ({
    id: row.id,
    teamId: row.team_id,
    periodId: row.period_id,
    memberId: row.member_id,
    scope: row.scope,
    eventType: row.event_type,
    title: row.title,
    startDate: row.start_date,
    endDate: row.end_date,
    startMinutes: row.start_minutes,
    endMinutes: row.end_minutes,
    allDay: row.all_day,
    blocksWork: row.blocks_work,
    preferredShiftCode: row.preferred_shift_code,
    coverageDelta: normalizeJson<Record<string, number>>(row.coverage_delta, {}),
    notes: row.notes,
    source: row.source,
  })), { start, end })
  const memberEvents = expandedEvents.filter((event) => event.scope === 'member')
  const wardEvents = expandedEvents.filter((event) => event.scope === 'team')
  const coverage = applyWardEventCoverage(baseCoverage, wardEvents)
  const existingLocks = lockRows.map((row) => ({
    memberId: row.member_id,
    date: row.work_date,
    shiftCode: row.locked_shift_code,
    reason: row.reason,
  }))
  const mergedLocks = new Map(
    buildEventLocks(memberEvents).map((lock) => [`${lock.memberId}:${lock.date}`, lock] as const),
  )
  for (const lock of existingLocks) {
    mergedLocks.set(`${lock.memberId}:${lock.date}`, lock)
  }

  const members = memberRows.map((member) => {
    const memberHistory = history.get(member.id)
    return {
      id: member.id,
      name: member.display_name,
      age: member.age,
      roleLabel: member.role_label,
      canNight: member.can_night ?? true,
      ftePermille: member.fte_permille,
      skillTags: normalizeJson<string[]>(member.skill_tags, []),
      fairness: memberHistory?.fairness ?? { night: 0, weekend: 0, holiday: 0, undesirable: 0 },
      previousAssignments: memberHistory?.previousAssignments ?? [],
    }
  })
  const leaveLedger = buildLeaveLedger({
    members,
    shiftTypes,
    approvedLeaves,
    memberEvents,
    historicalPublishedAssignments,
    currentPublishedAssignments,
    previousVersionAssignments,
  })
  const datasetValidation = validateDataset({
    members,
    shiftTypes,
    approvedLeaves,
    memberEvents,
    wardEvents,
    leaveLedger,
    assignments: currentPublishedAssignments,
  })
  const datasetScenarioReport = buildDatasetScenarioReport({
    members,
    memberEvents,
    wardEvents,
    leaveLedger,
    validation: datasetValidation,
    coverage: baseCoverage,
    adjustedCoverage: coverage,
    assignments: currentPublishedAssignments,
  })

  return {
    team: {
      ...team,
      year,
      month,
    },
    periodId: period.id,
    currentPublishVersionId: period.current_publish_version_id,
    currentCandidateId: period.current_candidate_id,
    members,
    shiftTypes,
    baseCoverage,
    coverage,
    approvedLeaves,
    preferredOffRequests: requestRows.map((row) => ({
      memberId: row.member_id,
      date: row.request_date,
      requestType: row.request_type,
      note: row.note,
    })),
    locks: Array.from(mergedLocks.values()),
    memberEvents,
    wardEvents,
    leaveLedger,
    datasetValidation,
    datasetScenarioReport,
    previousPublishedAssignments: currentPublishedAssignments,
    rules: {
      ruleProfileId: activeRuleProfileId,
      hospitalRuleVersion: ruleRows[0]?.hospital_rule_version ?? null,
      minRestHours: Number(ruleRows[0]?.structured_rules?.minRestHours ?? 16),
      maxNightShiftsPerMonth: Number(ruleRows[0]?.structured_rules?.maxNightShiftsPerMonth ?? 6),
      forbiddenPatterns: normalizeJson<string[][]>(
        ruleRows[0]?.structured_rules?.forbiddenPatterns ?? [['N', 'OFF', 'D']],
        [['N', 'OFF', 'D']],
      ),
      weights: {
        request: Number(ruleRows[0]?.scoring_weights?.request ?? 10),
        fairness: Number(ruleRows[0]?.scoring_weights?.fairness ?? 25),
        nightCap: Number(ruleRows[0]?.scoring_weights?.nightCap ?? 100),
        continuity: Number(ruleRows[0]?.scoring_weights?.continuity ?? 15),
      },
    },
  }
}

async function persistSolverResult(periodId: number, runId: number, result: Awaited<ReturnType<typeof runScheduleSolver>>, previousAssignments: PublishedAssignment[]) {
  if (result.status !== 'completed') {
    return { selectedCandidateId: null as number | null, candidates: [] as Array<Record<string, unknown>> }
  }

  const savedCandidates: Array<Record<string, unknown>> = []
  let selectedCandidateId: number | null = null
  for (const candidate of result.candidates) {
    const diff = summarizePublishDiff(previousAssignments, candidate.assignments)
    const candidateRows = await sql<Array<{ id: number }>>`
      insert into schedule_candidates (
        run_id,
        candidate_key,
        ranking,
        status,
        score,
        explanation,
        assignments_snapshot,
        violations_snapshot,
        published_diff
      )
      values (
        ${runId},
        ${candidate.candidateKey},
        ${candidate.rank},
        ${candidate.candidateKey === result.selectedCandidateKey ? 'selected' : 'draft'},
        ${sql.json(candidate.score as any)},
        ${sql.json(candidate.explanation as any)},
        ${sql.json(candidate.assignments as any)},
        ${sql.json(candidate.violations as any)},
        ${sql.json(diff as any)}
      )
      returning id
    `
    const candidateId = candidateRows[0]!.id
    if (candidate.candidateKey === result.selectedCandidateKey) {
      selectedCandidateId = candidateId
    }

    for (const assignment of candidate.assignments) {
      await sql`
        insert into shift_assignments (
          candidate_id,
          member_id,
          work_date,
          shift_code,
          source,
          is_locked,
          metadata
        )
        values (
          ${candidateId},
          ${assignment.memberId},
          ${assignment.date},
          ${assignment.shiftCode},
          'solver',
          false,
          ${sql.json({ teamSlug: assignment.teamSlug } as any)}
        )
      `
    }

    for (const violation of candidate.violations) {
      await sql`
        insert into constraint_violations (
          candidate_id,
          severity,
          rule_code,
          message,
          work_date,
          member_id,
          details
        )
        values (
          ${candidateId},
          ${violation.severity},
          ${violation.ruleCode},
          ${violation.message},
          ${violation.date || null},
          ${violation.memberId || null},
          ${sql.json((violation.details || {}) as any)}
        )
      `
    }

    savedCandidates.push({
      id: candidateId,
      key: candidate.candidateKey,
      rank: candidate.rank,
      score: candidate.score,
      explanation: candidate.explanation,
      diff,
    })
  }

  await sql`
    update schedule_runs
    set
      selected_candidate_id = ${selectedCandidateId},
      status = 'completed',
      summary = ${sql.json((result.summary || {}) as any)},
      solver_engine = ${result.engine},
      finished_at = now()
    where id = ${runId}
  `
  await sql`
    update schedule_periods
    set
      latest_run_id = ${runId},
      current_candidate_id = ${selectedCandidateId},
      updated_at = now()
    where id = ${periodId}
  `

  return { selectedCandidateId, candidates: savedCandidates }
}

teamRoutes.use('*', optionalAuth)

teamRoutes.get('/:teamSlug/context', async (c) => {
  const team = await getTeamBySlug(c.req.param('teamSlug'))
  if (!team) {
    return c.json({ error: 'Team not found' }, 404)
  }

  const year = Number(c.req.query('year') || new Date().getUTCFullYear())
  const month = Number(c.req.query('month') || new Date().getUTCMonth() + 1)
  const context = await buildTeamContext(team, year, month)

  return c.json({
    result: {
      team: context.team,
      periodId: context.periodId,
      members: context.members,
      shiftTypes: context.shiftTypes,
      coverage: context.coverage,
      approvedLeaves: context.approvedLeaves,
      preferredOffRequests: context.preferredOffRequests,
      locks: context.locks,
      rules: context.rules,
      currentCandidateId: context.currentCandidateId,
      currentPublishVersionId: context.currentPublishVersionId,
    },
  })
})

teamRoutes.get('/:teamSlug/dataset', async (c) => {
  const team = await getTeamBySlug(c.req.param('teamSlug'))
  if (!team) {
    return c.json({ error: 'Team not found' }, 404)
  }

  const year = Number(c.req.query('year') || new Date().getUTCFullYear())
  const month = Number(c.req.query('month') || new Date().getUTCMonth() + 1)
  const context = await buildTeamContext(team, year, month)

  return c.json({
    result: {
      team: context.team,
      periodId: context.periodId,
      members: context.members,
      shiftTypes: context.shiftTypes,
      baseCoverage: context.baseCoverage,
      coverage: context.coverage,
      approvedLeaves: context.approvedLeaves,
      preferredOffRequests: context.preferredOffRequests,
      locks: context.locks,
      memberEvents: context.memberEvents,
      wardEvents: context.wardEvents,
      leaveLedger: context.leaveLedger,
      datasetValidation: context.datasetValidation,
      validation: context.datasetValidation,
      datasetScenarioReport: context.datasetScenarioReport,
      scenarioReport: context.datasetScenarioReport,
      rules: context.rules,
      currentCandidateId: context.currentCandidateId,
      currentPublishVersionId: context.currentPublishVersionId,
    },
  })
})

teamRoutes.get('/:teamSlug/test-report', async (c) => {
  const team = await getTeamBySlug(c.req.param('teamSlug'))
  if (!team) {
    return c.json({ error: 'Team not found' }, 404)
  }

  const year = Number(c.req.query('year') || new Date().getUTCFullYear())
  const month = Number(c.req.query('month') || new Date().getUTCMonth() + 1)
  const context = await buildTeamContext(team, year, month)
  const report = await buildTeamScenarioLab(context)

  return c.json({ result: report })
})

teamRoutes.post('/:teamSlug/requests', async (c) => {
  const team = await getTeamBySlug(c.req.param('teamSlug'))
  if (!team) {
    return c.json({ error: 'Team not found' }, 404)
  }

  const access = await requireTeamRole(c, team.id, 'staff')
  if (!access.membership) {
    return respondAccessError(c, access)
  }
  const membership = access.membership

  const body = await c.req.json<{
    year: number
    month: number
    memberId?: number
    requestType?: string
    dates: string[]
    note?: string | null
    metadata?: Record<string, unknown>
  }>()

  const memberId = body.memberId ?? membership.member_id
  if (memberId !== membership.member_id && roleRank[membership.team_role] < roleRank.scheduler) {
    return c.json({ error: 'Cannot create requests for another team member' }, 403)
  }

  const ruleRows = await sql<Array<{ id: number }>>`
    select id from team_rule_profiles
    where team_id = ${team.id} and is_active = true
    order by version desc
    limit 1
  `
  const period = await upsertPeriod(team.id, body.year, body.month, ruleRows[0]?.id ?? null)
  const requestType = body.requestType || 'preferred_off'
  const createdBy = getUserId(c)

  for (const date of body.dates) {
    await sql`
      insert into schedule_requests (
        team_id,
        period_id,
        member_id,
        request_type,
        request_date,
        note,
        metadata,
        created_by
      )
      values (
        ${team.id},
        ${period.id},
        ${memberId},
        ${requestType},
        ${date},
        ${body.note || null},
        ${sql.json((body.metadata || {}) as any)},
        ${createdBy}
      )
      on conflict (team_id, period_id, member_id, request_date, request_type)
      do update set
        note = excluded.note,
        metadata = excluded.metadata,
        created_by = excluded.created_by
    `
  }

  return c.json({
    result: {
      teamId: team.id,
      periodId: period.id,
      memberId,
      count: body.dates.length,
      requestType,
    },
  }, 201)
})

teamRoutes.post('/:teamSlug/events/upsert', async (c) => {
  const team = await getTeamBySlug(c.req.param('teamSlug'))
  if (!team) {
    return c.json({ error: 'Team not found' }, 404)
  }

  const access = await requireTeamRole(c, team.id, 'scheduler')
  if (!access.membership) {
    return respondAccessError(c, access)
  }

  const body: Record<string, unknown> = await c.req.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>))
  const rawEvents = Array.isArray(body.events)
    ? body.events
    : body.event
      ? [body.event]
      : Object.keys(body).length > 0
        ? [body]
        : []
  if (rawEvents.length === 0) {
    return c.json({ error: 'At least one event is required' }, 400)
  }

  const teamMemberRows = await sql<Array<{ member_id: number }>>`
    select member_id
    from team_memberships
    where team_id = ${team.id}
      and ended_at is null
  `
  const teamMemberIds = new Set(teamMemberRows.map((row) => row.member_id))
  const ruleRows = await sql<Array<{ id: number }>>`
    select id
    from team_rule_profiles
    where team_id = ${team.id} and is_active = true
    order by version desc
    limit 1
  `
  const periodCache = new Map<string, number>()
  const upsertedIds: number[] = []

  for (const rawEvent of rawEvents) {
    const event = (rawEvent || {}) as Record<string, unknown>
    const eventId = Number(event.id)
    const memberId = event.memberId == null ? null : Number(event.memberId)
    const scope = (event.scope || (memberId ? 'member' : 'team')) as ScheduleEvent['scope']
    const title = String(event.title || '').trim()
    const eventType = String(event.eventType || '').trim() as ScheduleEvent['eventType']
    const startDate = String(event.startDate || '').trim()
    const endDate = String(event.endDate || '').trim()
    const preferredShiftCode = event.preferredShiftCode == null || event.preferredShiftCode === ''
      ? null
      : String(event.preferredShiftCode)
    const coverageDelta = normalizeJson<Record<string, number>>(
      event.coverageDelta,
      {},
    )
    const source = (event.source || 'manual') as ScheduleEvent['source']

    if (!title || !eventType || !startDate || !endDate) {
      return c.json({ error: 'title, eventType, startDate, and endDate are required' }, 400)
    }
    if (scope !== 'member' && scope !== 'team') {
      return c.json({ error: 'scope must be member or team' }, 400)
    }
    if (scope === 'member' && !memberId) {
      return c.json({ error: 'member scope requires memberId' }, 400)
    }
    if (memberId && !teamMemberIds.has(memberId)) {
      return c.json({ error: `memberId ${memberId} does not belong to team ${team.slug}` }, 400)
    }

    const eventYear = Number(event.year ?? body.year)
    const eventMonth = Number(event.month ?? body.month)
    let periodId = event.periodId == null ? null : Number(event.periodId)
    if (!periodId && Number.isInteger(eventYear) && Number.isInteger(eventMonth) && eventMonth >= 1 && eventMonth <= 12) {
      const periodKey = `${eventYear}-${eventMonth}`
      if (!periodCache.has(periodKey)) {
        const period = await upsertPeriod(team.id, eventYear, eventMonth, ruleRows[0]?.id ?? null)
        periodCache.set(periodKey, period.id)
      }
      periodId = periodCache.get(periodKey) || null
    }

    const payload = {
      teamId: team.id,
      periodId,
      memberId,
      scope,
      eventType,
      title,
      startDate,
      endDate,
      startMinutes: event.startMinutes == null ? null : Number(event.startMinutes),
      endMinutes: event.endMinutes == null ? null : Number(event.endMinutes),
      allDay: event.allDay == null ? true : Boolean(event.allDay),
      blocksWork: Boolean(event.blocksWork),
      preferredShiftCode,
      coverageDelta,
      notes: event.notes == null ? null : String(event.notes),
      source,
      createdBy: getUserId(c),
    }

    if (Number.isInteger(eventId) && eventId > 0) {
      const updatedRows = await sql<Array<{ id: number }>>`
        update team_schedule_events
        set
          period_id = ${payload.periodId},
          member_id = ${payload.memberId},
          scope = ${payload.scope},
          event_type = ${payload.eventType},
          title = ${payload.title},
          start_date = ${payload.startDate},
          end_date = ${payload.endDate},
          start_minutes = ${payload.startMinutes},
          end_minutes = ${payload.endMinutes},
          all_day = ${payload.allDay},
          blocks_work = ${payload.blocksWork},
          preferred_shift_code = ${payload.preferredShiftCode},
          coverage_delta = ${sql.json(payload.coverageDelta as any)},
          notes = ${payload.notes},
          source = ${payload.source},
          updated_at = now()
        where id = ${eventId} and team_id = ${team.id}
        returning id
      `
      if (updatedRows[0]?.id) {
        upsertedIds.push(updatedRows[0].id)
        continue
      }
    }

    const insertedRows = await sql<Array<{ id: number }>>`
      insert into team_schedule_events (
        team_id,
        period_id,
        member_id,
        scope,
        event_type,
        title,
        start_date,
        end_date,
        start_minutes,
        end_minutes,
        all_day,
        blocks_work,
        preferred_shift_code,
        coverage_delta,
        notes,
        source,
        created_by
      )
      values (
        ${payload.teamId},
        ${payload.periodId},
        ${payload.memberId},
        ${payload.scope},
        ${payload.eventType},
        ${payload.title},
        ${payload.startDate},
        ${payload.endDate},
        ${payload.startMinutes},
        ${payload.endMinutes},
        ${payload.allDay},
        ${payload.blocksWork},
        ${payload.preferredShiftCode},
        ${sql.json(payload.coverageDelta as any)},
        ${payload.notes},
        ${payload.source},
        ${payload.createdBy}
      )
      returning id
    `
    upsertedIds.push(insertedRows[0]!.id)
  }

  return c.json({
    result: {
      teamId: team.id,
      upsertedIds,
      count: upsertedIds.length,
    },
  }, 201)
})

teamRoutes.delete('/:teamSlug/events/:id', async (c) => {
  const team = await getTeamBySlug(c.req.param('teamSlug'))
  if (!team) {
    return c.json({ error: 'Team not found' }, 404)
  }

  const access = await requireTeamRole(c, team.id, 'scheduler')
  if (!access.membership) {
    return respondAccessError(c, access)
  }

  const eventId = Number(c.req.param('id'))
  if (!Number.isInteger(eventId)) {
    return c.json({ error: 'Invalid event id' }, 400)
  }

  const deletedRows = await sql<Array<{ id: number }>>`
    delete from team_schedule_events
    where id = ${eventId} and team_id = ${team.id}
    returning id
  `
  if (!deletedRows[0]) {
    return c.json({ error: 'Event not found' }, 404)
  }

  return c.json({
    result: {
      id: deletedRows[0].id,
      deleted: true,
    },
  })
})

teamRoutes.post('/:teamSlug/schedules/generate', async (c) => {
  const team = await getTeamBySlug(c.req.param('teamSlug'))
  if (!team) {
    return c.json({ error: 'Team not found' }, 404)
  }

  const access = await requireTeamRole(c, team.id, 'scheduler')
  if (!access.membership) {
    return respondAccessError(c, access)
  }

  const body = await c.req.json<{ year: number; month: number }>()
  const context = await buildTeamContext(team, body.year, body.month)
  const payload = buildSolverPayload(context)

  const runRows = await sql<Array<{ id: number }>>`
    insert into schedule_runs (
      period_id,
      run_type,
      status,
      initiated_by,
      input_snapshot,
      started_at
    )
    values (
      ${context.periodId},
      'generate',
      'running',
      ${getUserId(c)},
      ${sql.json(payload as any)},
      now()
    )
    returning id
  `
  const runId = runRows[0]!.id

  try {
    const result = await runScheduleSolver(payload)
    if (result.status === 'infeasible') {
      await sql`
        update schedule_runs
        set
          status = 'infeasible',
          solver_engine = ${result.engine},
          summary = ${sql.json((result.summary || {}) as any)},
          finished_at = now()
        where id = ${runId}
      `
      return c.json({
        error: 'Schedule generation is infeasible',
        result,
      }, 422)
    }

    const persisted = await persistSolverResult(
      context.periodId,
      runId,
      result,
      context.previousPublishedAssignments,
    )

    return c.json({
      result: {
        runId,
        periodId: context.periodId,
        selectedCandidateId: persisted.selectedCandidateId,
        engine: result.engine,
        candidates: persisted.candidates,
      },
    }, 201)
  } catch (error) {
    await sql`
      update schedule_runs
      set
        status = 'failed',
        summary = ${sql.json({ error: String(error) } as any)},
        finished_at = now()
      where id = ${runId}
    `
    return c.json({ error: 'Schedule generation failed', detail: String(error) }, 500)
  }
})

teamRoutes.get('/:teamSlug/schedules/:period', async (c) => {
  const team = await getTeamBySlug(c.req.param('teamSlug'))
  if (!team) {
    return c.json({ error: 'Team not found' }, 404)
  }

  const { year, month } = parsePeriodKey(c.req.param('period'))
  const periods = await sql<PeriodRow[]>`
    select
      id,
      team_id,
      year,
      month,
      status,
      current_candidate_id,
      current_publish_version_id,
      latest_run_id
    from schedule_periods
    where team_id = ${team.id}
      and year = ${year}
      and month = ${month}
    limit 1
  `
  const period = periods[0]
  if (!period) {
    return c.json({ error: 'Schedule period not found' }, 404)
  }

  const [candidateRows, publishRows] = await Promise.all([
    sql<Array<{
      id: number
      candidate_key: string
      ranking: number
      status: string
      score: Record<string, unknown>
      explanation: Record<string, unknown>
      published_diff: Record<string, unknown>
      assignments_snapshot: PublishedAssignment[]
      violations_snapshot: Record<string, unknown>[]
    }>>`
      select
        id,
        candidate_key,
        ranking,
        status,
        score,
        explanation,
        published_diff,
        assignments_snapshot,
        violations_snapshot
      from schedule_candidates
      where run_id = ${period.latest_run_id || -1}
      order by ranking asc, id asc
    `,
    period.current_publish_version_id
      ? sql<Array<{
          id: number
          version_number: number
          status: string
          diff_summary: Record<string, unknown>
          assignments_snapshot: PublishedAssignment[]
          created_at: string
        }>>`
          select
            id,
            version_number,
            status,
            diff_summary,
            assignments_snapshot,
            created_at::text
          from publish_versions
          where id = ${period.current_publish_version_id}
          limit 1
        `
      : Promise.resolve([]),
  ])

  return c.json({
    result: {
      period,
      candidates: candidateRows,
      published: publishRows[0] || null,
    },
  })
})

teamRoutes.get('/:teamSlug/schedules/:period/calendar.ics', async (c) => {
  const team = await getTeamBySlug(c.req.param('teamSlug'))
  if (!team) {
    return c.json({ error: 'Team not found' }, 404)
  }

  const memberId = Number(c.req.query('memberId'))
  if (!Number.isInteger(memberId)) {
    return c.json({ error: 'memberId is required' }, 400)
  }

  const { year, month } = parsePeriodKey(c.req.param('period'))
  const { start, end } = monthBounds(year, month)
  const periodRows = await sql<Array<{ id: number; current_publish_version_id: number | null }>>`
    select id, current_publish_version_id
    from schedule_periods
    where team_id = ${team.id}
      and year = ${year}
      and month = ${month}
    limit 1
  `
  const period = periodRows[0]
  if (!period?.current_publish_version_id) {
    return c.json({ error: 'Published schedule not found' }, 404)
  }

  const [publishRow, shiftTypeRows, memberRows, leaveRows] = await Promise.all([
    sql<Array<{ assignments_snapshot: PublishedAssignment[] }>>`
      select assignments_snapshot
      from publish_versions
      where id = ${period.current_publish_version_id}
      limit 1
    `,
    sql<Array<{ code: string; label: string; start_minutes: number; end_minutes: number; is_work: boolean }>>`
      select code, label, start_minutes, end_minutes, is_work
      from shift_types
      where team_id = ${team.id}
    `,
    sql<Array<{ id: number; display_name: string; external_user_id: string | null }>>`
      select
        m.id,
        m.display_name,
        m.external_user_id::text
      from team_members m
      inner join team_memberships tm on tm.member_id = m.id
      where m.id = ${memberId}
        and tm.team_id = ${team.id}
        and tm.ended_at is null
      limit 1
    `,
    sql<Array<{ type: string; "startDate": string; "endDate": string }>>`
      select type, "startDate", "endDate"
      from leave_records
      where user_id = (
        select external_user_id
        from team_members
        where id = ${memberId}
        limit 1
      )
        and "startDate" <= ${end}
        and "endDate" >= ${start}
    `,
  ])

  const member = memberRows[0]
  if (!member) {
    return c.json({ error: 'Team member not found' }, 404)
  }

  const shiftTypeMap = new Map(
    shiftTypeRows.map((row) => [row.code, row]),
  )
  const assignments = normalizeJson<PublishedAssignment[]>(
    publishRow[0]?.assignments_snapshot,
    [],
  ).filter((assignment) => assignment.memberId === memberId)

  const events: Parameters<typeof buildIcsCalendar>[0]['events'] = assignments.flatMap((assignment) => {
    const shiftType = shiftTypeMap.get(assignment.shiftCode)
    if (!shiftType || !shiftType.is_work) {
      return []
    }
    return [{
      uid: `team-${team.slug}-${memberId}-${assignment.date}-${assignment.shiftCode}`,
      summary: `${team.name} ${assignment.shiftCode}`,
      description: `${member.display_name} ${shiftType.label}`,
      start: minutesToIso(assignment.date, shiftType.start_minutes),
      end: minutesToIso(assignment.date, shiftType.end_minutes),
    }]
  })

  for (const leave of leaveRows) {
    for (const date of listDatesBetween(leave.startDate, leave.endDate)) {
      events.push({
        uid: `leave-${team.slug}-${memberId}-${date}`,
        summary: `${team.name} ${leave.type}`,
        description: `${member.display_name} 휴가`,
        start: date,
        end: nextDateString(date),
        allDay: true,
      })
    }
  }

  const calendar = buildIcsCalendar({
    calendarName: `${team.name} ${member.display_name}`,
    events,
  })

  c.header('Content-Type', 'text/calendar; charset=utf-8')
  c.header(
    'Content-Disposition',
    `attachment; filename="${team.slug}-member-${memberId}-${year}-${String(month).padStart(2, '0')}.ics"`,
  )
  return c.body(calendar)
})

teamRoutes.post('/:teamSlug/schedules/:id/repair', async (c) => {
  const team = await getTeamBySlug(c.req.param('teamSlug'))
  if (!team) {
    return c.json({ error: 'Team not found' }, 404)
  }

  const access = await requireTeamRole(c, team.id, 'scheduler')
  if (!access.membership) {
    return respondAccessError(c, access)
  }

  const periodId = Number(c.req.param('id'))
  const periodRows = await sql<PeriodRow[]>`
    select
      id,
      team_id,
      year,
      month,
      status,
      current_candidate_id,
      current_publish_version_id,
      latest_run_id
    from schedule_periods
    where id = ${periodId} and team_id = ${team.id}
    limit 1
  `
  const period = periodRows[0]
  if (!period) {
    return c.json({ error: 'Schedule period not found' }, 404)
  }

  const body = await c.req.json<{ locks: Array<{ memberId: number; date: string; shiftCode: string; reason?: string | null }> }>()
  for (const lock of body.locks) {
    await sql`
      insert into assignment_locks (
        period_id,
        member_id,
        work_date,
        locked_shift_code,
        reason,
        locked_by
      )
      values (
        ${period.id},
        ${lock.memberId},
        ${lock.date},
        ${lock.shiftCode},
        ${lock.reason || null},
        ${getUserId(c)}
      )
      on conflict (period_id, member_id, work_date)
      do update set
        locked_shift_code = excluded.locked_shift_code,
        reason = excluded.reason,
        locked_by = excluded.locked_by
    `
  }

  const context = await buildTeamContext(team, period.year, period.month)
  const payload = buildSolverPayload(context)

  const runRows = await sql<Array<{ id: number }>>`
    insert into schedule_runs (
      period_id,
      run_type,
      status,
      initiated_by,
      input_snapshot,
      started_at
    )
    values (
      ${period.id},
      'repair',
      'running',
      ${getUserId(c)},
      ${sql.json(payload as any)},
      now()
    )
    returning id
  `
  const runId = runRows[0]!.id

  try {
    const result = await runScheduleSolver(payload)
    if (result.status === 'infeasible') {
      await sql`
        update schedule_runs
        set
          status = 'infeasible',
          solver_engine = ${result.engine},
          summary = ${sql.json((result.summary || {}) as any)},
          finished_at = now()
        where id = ${runId}
      `
      return c.json({
        error: 'Repair solve is infeasible',
        result,
      }, 422)
    }

    const persisted = await persistSolverResult(
      period.id,
      runId,
      result,
      context.previousPublishedAssignments,
    )
    return c.json({
      result: {
        runId,
        periodId: period.id,
        selectedCandidateId: persisted.selectedCandidateId,
        candidates: persisted.candidates,
      },
    })
  } catch (error) {
    await sql`
      update schedule_runs
      set
        status = 'failed',
        summary = ${sql.json({ error: String(error) } as any)},
        finished_at = now()
      where id = ${runId}
    `
    return c.json({ error: 'Repair solve failed', detail: String(error) }, 500)
  }
})

teamRoutes.post('/:teamSlug/schedules/:id/publish', async (c) => {
  const team = await getTeamBySlug(c.req.param('teamSlug'))
  if (!team) {
    return c.json({ error: 'Team not found' }, 404)
  }

  const access = await requireTeamRole(c, team.id, 'scheduler')
  if (!access.membership) {
    return respondAccessError(c, access)
  }

  const periodId = Number(c.req.param('id'))
  const body: { candidateId?: number } = await c.req.json().catch(() => ({}))
  const periodRows = await sql<PeriodRow[]>`
    select
      id,
      team_id,
      year,
      month,
      status,
      current_candidate_id,
      current_publish_version_id,
      latest_run_id
    from schedule_periods
    where id = ${periodId} and team_id = ${team.id}
    limit 1
  `
  const period = periodRows[0]
  if (!period) {
    return c.json({ error: 'Schedule period not found' }, 404)
  }

  const candidateId = body.candidateId ?? period.current_candidate_id
  if (!candidateId) {
    return c.json({ error: 'No candidate available for publish' }, 400)
  }

  const candidateRows = await sql<Array<{ assignments_snapshot: PublishedAssignment[] }>>`
    select sc.assignments_snapshot
    from schedule_candidates sc
    inner join schedule_runs sr on sr.id = sc.run_id
    where sc.id = ${candidateId}
      and sr.period_id = ${period.id}
    limit 1
  `
  const nextAssignments = normalizeJson<PublishedAssignment[]>(
    candidateRows[0]?.assignments_snapshot,
    [],
  )
  if (nextAssignments.length === 0) {
    return c.json({ error: 'Candidate assignments not found' }, 404)
  }

  const previousAssignmentsRows = period.current_publish_version_id
    ? await sql<Array<{ assignments_snapshot: PublishedAssignment[] }>>`
        select assignments_snapshot
        from publish_versions
        where id = ${period.current_publish_version_id}
        limit 1
      `
    : []
  const previousAssignments = normalizeJson<PublishedAssignment[]>(
    previousAssignmentsRows[0]?.assignments_snapshot,
    [],
  )
  const diff = summarizePublishDiff(previousAssignments, nextAssignments)

  await sql`
    update publish_versions
    set status = 'superseded'
    where period_id = ${period.id} and status = 'published'
  `
  const versionRows = await sql<Array<{ id: number; version_number: number; created_at: string }>>`
    with next_version as (
      select coalesce(max(version_number), 0) + 1 as version_number
      from publish_versions
      where period_id = ${period.id}
    )
    insert into publish_versions (
      period_id,
      candidate_id,
      version_number,
      status,
      published_by,
      assignments_snapshot,
      diff_summary,
      calendar_sync_state
    )
    select
      ${period.id},
      ${candidateId},
      version_number,
      'published',
      ${getUserId(c)},
      ${sql.json(nextAssignments as any)},
      ${sql.json(diff as any)},
      ${sql.json({ status: 'pending_client_sync' } as any)}
    from next_version
    returning id, version_number, created_at::text
  `
  const publishVersion = versionRows[0]!

  await sql`
    update schedule_periods
    set
      status = 'published',
      current_candidate_id = ${candidateId},
      current_publish_version_id = ${publishVersion.id},
      updated_at = now()
    where id = ${period.id}
  `
  await sql`
    update schedule_candidates
    set status = case when id = ${candidateId} then 'published' else status end
    where run_id = ${period.latest_run_id || -1}
  `

  return c.json({
    result: {
      publishVersion: {
        ...publishVersion,
        diff,
      },
    },
  })
})

teamRoutes.post('/:teamSlug/swaps', async (c) => {
  const team = await getTeamBySlug(c.req.param('teamSlug'))
  if (!team) {
    return c.json({ error: 'Team not found' }, 404)
  }

  const access = await requireTeamRole(c, team.id, 'staff')
  if (!access.membership) {
    return respondAccessError(c, access)
  }
  const membership = access.membership

  const body = await c.req.json<{
    publishVersionId: number
    requesterMemberId?: number
    counterpartyMemberId: number
    requesterDate: string
    counterpartyDate: string
    reason?: string | null
  }>()
  const requesterMemberId = body.requesterMemberId ?? membership.member_id
  if (requesterMemberId !== membership.member_id && roleRank[membership.team_role] < roleRank.scheduler) {
    return c.json({ error: 'Cannot request swap for another team member' }, 403)
  }

  const publishRows = await sql<Array<{ period_id: number; assignments_snapshot: PublishedAssignment[] }>>`
    select pv.period_id, pv.assignments_snapshot
    from publish_versions pv
    inner join schedule_periods sp on sp.id = pv.period_id
    where pv.id = ${body.publishVersionId}
      and sp.team_id = ${team.id}
    limit 1
  `
  const publish = publishRows[0]
  if (!publish) {
    return c.json({ error: 'Published schedule not found' }, 404)
  }
  const publishedAssignments = normalizeJson<PublishedAssignment[]>(publish.assignments_snapshot, [])
  const requesterAssignment = publishedAssignments.find((assignment) => (
    assignment.memberId === requesterMemberId && assignment.date === body.requesterDate
  ))
  const counterpartyAssignment = publishedAssignments.find((assignment) => (
    assignment.memberId === body.counterpartyMemberId && assignment.date === body.counterpartyDate
  ))
  if (!requesterAssignment || !counterpartyAssignment) {
    return c.json({ error: 'Swap assignments not found in published schedule' }, 404)
  }

  const swapRows = await sql<Array<{ id: number }>>`
    insert into swap_requests (
      period_id,
      publish_version_id,
      requester_member_id,
      counterparty_member_id,
      requester_date,
      requester_shift_code,
      counterparty_date,
      counterparty_shift_code,
      reason,
      status,
      requested_by
    )
    values (
      ${publish.period_id},
      ${body.publishVersionId},
      ${requesterMemberId},
      ${body.counterpartyMemberId},
      ${body.requesterDate},
      ${requesterAssignment.shiftCode},
      ${body.counterpartyDate},
      ${counterpartyAssignment.shiftCode},
      ${body.reason || null},
      'pending',
      ${getUserId(c)}
    )
    returning id
  `
  const swapId = swapRows[0]!.id

  await sql`
    insert into swap_events (
      swap_request_id,
      event_type,
      actor_user_id,
      payload
    )
    values (
      ${swapId},
      'requested',
      ${getUserId(c)},
      ${sql.json({
        requesterMemberId,
        counterpartyMemberId: body.counterpartyMemberId,
        requesterDate: body.requesterDate,
        counterpartyDate: body.counterpartyDate,
      } as any)}
    )
  `

  return c.json({
    result: {
      swapRequestId: swapId,
      status: 'pending',
    },
  }, 201)
})

teamRoutes.post('/:teamSlug/swaps/:id/approve', async (c) => {
  const team = await getTeamBySlug(c.req.param('teamSlug'))
  if (!team) {
    return c.json({ error: 'Team not found' }, 404)
  }

  const access = await requireTeamRole(c, team.id, 'scheduler')
  if (!access.membership) {
    return respondAccessError(c, access)
  }

  const swapId = Number(c.req.param('id'))
  const swapRows = await sql<Array<{
    id: number
    period_id: number
    publish_version_id: number
    requester_member_id: number
    counterparty_member_id: number
    requester_date: string
    counterparty_date: string
    status: string
    assignments_snapshot: PublishedAssignment[]
  }>>`
    select
      sr.id,
      sr.period_id,
      sr.publish_version_id,
      sr.requester_member_id,
      sr.counterparty_member_id,
      sr.requester_date::text,
      sr.counterparty_date::text,
      sr.status,
      pv.assignments_snapshot
    from swap_requests sr
    inner join publish_versions pv on pv.id = sr.publish_version_id
    inner join schedule_periods sp on sp.id = sr.period_id
    where sr.id = ${swapId}
      and sp.team_id = ${team.id}
    limit 1
  `
  const swap = swapRows[0]
  if (!swap) {
    return c.json({ error: 'Swap request not found' }, 404)
  }
  if (swap.status !== 'pending') {
    return c.json({ error: 'Swap request is no longer pending' }, 409)
  }

  const periodRows = await sql<PeriodRow[]>`
    select
      id,
      team_id,
      year,
      month,
      status,
      current_candidate_id,
      current_publish_version_id,
      latest_run_id
    from schedule_periods
    where id = ${swap.period_id}
    limit 1
  `
  const period = periodRows[0]
  if (!period) {
    return c.json({ error: 'Schedule period not found' }, 404)
  }
  if (period.current_publish_version_id !== swap.publish_version_id) {
    return c.json({ error: 'Swap request is stale because a newer publish exists' }, 409)
  }

  const currentAssignments = normalizeJson<PublishedAssignment[]>(
    swap.assignments_snapshot,
    [],
  )
  const next = applyApprovedSwapToAssignments(currentAssignments, {
    requesterMemberId: swap.requester_member_id,
    counterpartyMemberId: swap.counterparty_member_id,
    requesterDate: swap.requester_date,
    counterpartyDate: swap.counterparty_date,
  })

  await sql`
    update publish_versions
    set status = 'superseded'
    where id = ${swap.publish_version_id}
  `
  const versionRows = await sql<Array<{ id: number; version_number: number }>>`
    with next_version as (
      select coalesce(max(version_number), 0) + 1 as version_number
      from publish_versions
      where period_id = ${period.id}
    )
    insert into publish_versions (
      period_id,
      candidate_id,
      version_number,
      status,
      published_by,
      assignments_snapshot,
      diff_summary,
      calendar_sync_state
    )
    select
      ${period.id},
      null,
      version_number,
      'published',
      ${getUserId(c)},
      ${sql.json(next.assignments as any)},
      ${sql.json(next.diff as any)},
      ${sql.json({ status: 'pending_client_sync', swapRequestId: swap.id } as any)}
    from next_version
    returning id, version_number
  `
  const publishVersion = versionRows[0]!

  await sql`
    update schedule_periods
    set
      status = 'published',
      current_publish_version_id = ${publishVersion.id},
      updated_at = now()
    where id = ${period.id}
  `
  await sql`
    update swap_requests
    set
      status = 'approved',
      decided_by = ${getUserId(c)},
      decided_at = now()
    where id = ${swap.id}
  `
  await sql`
    insert into swap_events (
      swap_request_id,
      event_type,
      actor_user_id,
      payload
    )
    values (
      ${swap.id},
      'approved',
      ${getUserId(c)},
      ${sql.json({
        publishVersionId: publishVersion.id,
        diff: next.diff,
      } as any)}
    )
  `

  return c.json({
    result: {
      publishVersion,
      diff: next.diff,
    },
  })
})

teamRoutes.post('/:teamSlug/swaps/:id/reject', async (c) => {
  const team = await getTeamBySlug(c.req.param('teamSlug'))
  if (!team) {
    return c.json({ error: 'Team not found' }, 404)
  }

  const access = await requireTeamRole(c, team.id, 'scheduler')
  if (!access.membership) {
    return respondAccessError(c, access)
  }

  const swapId = Number(c.req.param('id'))
  const rows = await sql<Array<{ id: number }>>`
    update swap_requests sr
    set
      status = 'rejected',
      decided_by = ${getUserId(c)},
      decided_at = now()
    from schedule_periods sp
    where sr.id = ${swapId}
      and sr.period_id = sp.id
      and sp.team_id = ${team.id}
      and sr.status = 'pending'
    returning sr.id
  `
  if (!rows[0]) {
    return c.json({ error: 'Swap request not found or already processed' }, 404)
  }

  await sql`
    insert into swap_events (
      swap_request_id,
      event_type,
      actor_user_id,
      payload
    )
    values (
      ${swapId},
      'rejected',
      ${getUserId(c)},
      ${sql.json({ rejected: true } as any)}
    )
  `

  return c.json({ result: { swapRequestId: swapId, status: 'rejected' } })
})

export default teamRoutes
