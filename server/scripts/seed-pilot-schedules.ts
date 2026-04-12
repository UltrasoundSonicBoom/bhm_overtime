import 'dotenv/config'
import postgres from 'postgres'
import {
  applyWardEventCoverage,
  buildDatasetScenarioReport,
  buildEventLocks,
  buildLeaveLedger,
  expandScheduleEvents,
  validateDataset,
} from '../src/services/team-dataset'
import {
  buildSolverPayload,
  summarizePublishDiff,
  type ApprovedLeave,
  type AssignmentLock,
  type CoverageDay,
  type PreferredOffRequest,
  type ScheduleEvent,
  type ScheduleGenerationContext,
  type ShiftTypeDefinition,
} from '../src/services/team-schedules'
import { runScheduleSolver } from '../src/services/team-schedule-worker'

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })

type SeedMemberInput = {
  employeeCode: string
  displayName: string
  externalUserId: string
  age: number
  roleLabel: string
  skillTags: string[]
  teamRole: 'head_nurse' | 'scheduler' | 'staff' | 'viewer'
  canNight: boolean
  previousAssignments: string[]
}

type TeamSeedEventInput = {
  employeeCode?: string
  scope: 'member' | 'team'
  eventType: ScheduleEvent['eventType']
  title: string
  startDate: string
  endDate: string
  startMinutes?: number | null
  endMinutes?: number | null
  allDay?: boolean
  blocksWork?: boolean
  preferredShiftCode?: string | null
  coverageDelta?: Record<string, number>
  notes?: string | null
  source?: ScheduleEvent['source']
}

type TeamSeedInput = {
  slug: string
  name: string
  description: string
  members: SeedMemberInput[]
  shiftTypes: ShiftTypeDefinition[]
  coverage: CoverageDay[]
  requests: Array<{ employeeCode: string; dates: string[]; note?: string }>
  leaves: Array<{ employeeCode: string; startDate: string; endDate: string; leaveType: string }>
  locks: Array<{ employeeCode: string; date: string; shiftCode: string; reason?: string }>
  events: TeamSeedEventInput[]
  rules: ScheduleGenerationContext['rules']
  publish: boolean
}

const pilotPeriod = { year: 2026, month: 5 }

const teamSeeds: TeamSeedInput[] = [
  {
    slug: '101',
    name: '101 병동',
    description: '일반병동 파일럿. Toss식 운영 화면 데모와 AI 초안 검토 흐름 검증용.',
    members: [
      { employeeCode: 'N101-01', displayName: '김하늘', externalUserId: '10000000-0000-0000-0000-000000000101', age: 42, roleLabel: 'Head Nurse', skillTags: ['charge', 'preceptor'], teamRole: 'head_nurse', canNight: false, previousAssignments: ['OFF', 'OFF', 'D', 'E', 'OFF', 'D', 'OFF'] },
      { employeeCode: 'N101-02', displayName: '박서연', externalUserId: '10000000-0000-0000-0000-000000000102', age: 36, roleLabel: 'Charge RN', skillTags: ['charge', 'iv'], teamRole: 'scheduler', canNight: true, previousAssignments: ['N', 'OFF', 'OFF', 'D', 'E', 'OFF', 'D'] },
      { employeeCode: 'N101-03', displayName: '이수민', externalUserId: '10000000-0000-0000-0000-000000000103', age: 33, roleLabel: 'RN', skillTags: ['iv'], teamRole: 'staff', canNight: true, previousAssignments: ['E', 'OFF', 'D', 'D', 'OFF', 'N', 'OFF'] },
      { employeeCode: 'N101-04', displayName: '최유진', externalUserId: '10000000-0000-0000-0000-000000000104', age: 31, roleLabel: 'RN', skillTags: ['icu-transfer'], teamRole: 'staff', canNight: true, previousAssignments: ['D', 'D', 'OFF', 'E', 'OFF', 'D', 'N'] },
      { employeeCode: 'N101-05', displayName: '정민지', externalUserId: '10000000-0000-0000-0000-000000000105', age: 29, roleLabel: 'RN', skillTags: ['preceptor'], teamRole: 'staff', canNight: true, previousAssignments: ['OFF', 'D', 'N', 'OFF', 'OFF', 'D', 'E'] },
      { employeeCode: 'N101-06', displayName: '한소희', externalUserId: '10000000-0000-0000-0000-000000000106', age: 28, roleLabel: 'RN', skillTags: ['ward'], teamRole: 'staff', canNight: true, previousAssignments: ['D', 'OFF', 'E', 'D', 'OFF', 'N', 'OFF'] },
      { employeeCode: 'N101-07', displayName: '윤지아', externalUserId: '10000000-0000-0000-0000-000000000107', age: 27, roleLabel: 'RN', skillTags: ['ward'], teamRole: 'staff', canNight: true, previousAssignments: ['OFF', 'E', 'D', 'OFF', 'N', 'OFF', 'OFF'] },
      { employeeCode: 'N101-08', displayName: '송채은', externalUserId: '10000000-0000-0000-0000-000000000108', age: 26, roleLabel: 'RN', skillTags: ['new-grad'], teamRole: 'staff', canNight: true, previousAssignments: ['OFF', 'D', 'OFF', 'E', 'D', 'OFF', 'N'] },
      { employeeCode: 'N101-09', displayName: '오다은', externalUserId: '10000000-0000-0000-0000-000000000109', age: 25, roleLabel: 'RN', skillTags: ['new-grad'], teamRole: 'staff', canNight: true, previousAssignments: ['D', 'OFF', 'OFF', 'N', 'OFF', 'D', 'E'] },
      { employeeCode: 'N101-10', displayName: '장예린', externalUserId: '10000000-0000-0000-0000-000000000110', age: 24, roleLabel: 'RN', skillTags: ['new-grad'], teamRole: 'staff', canNight: true, previousAssignments: ['OFF', 'OFF', 'D', 'OFF', 'E', 'N', 'OFF'] },
    ],
    shiftTypes: [
      { code: 'D', label: 'Day', startMinutes: 420, endMinutes: 900, isWork: true },
      { code: 'E', label: 'Evening', startMinutes: 840, endMinutes: 1320, isWork: true },
      { code: 'N', label: 'Night', startMinutes: 1260, endMinutes: 1860, isWork: true },
      { code: 'OFF', label: 'Off', startMinutes: 0, endMinutes: 0, isWork: false },
      { code: 'LEAVE', label: 'Leave', startMinutes: 0, endMinutes: 0, isWork: false },
      { code: 'EDU', label: 'Education', startMinutes: 540, endMinutes: 1020, isWork: false },
    ],
    coverage: buildMonthCoverage(2026, 5, { D: 3, E: 2, N: 2 }, { weekend: { D: 2, E: 2, N: 2 }, holidays: { D: 2, E: 2, N: 2 } }),
    requests: [
      { employeeCode: 'N101-03', dates: ['2026-05-06', '2026-05-18'], note: '가족 일정' },
      { employeeCode: 'N101-05', dates: ['2026-05-12'], note: '외래 예약' },
      { employeeCode: 'N101-08', dates: ['2026-05-20', '2026-05-21'], note: '교육 전 컨디션 조정' },
    ],
    leaves: [
      { employeeCode: 'N101-02', startDate: '2026-05-14', endDate: '2026-05-15', leaveType: 'annual' },
      { employeeCode: 'N101-07', startDate: '2026-05-27', endDate: '2026-05-27', leaveType: 'annual' },
    ],
    locks: [
      { employeeCode: 'N101-01', date: '2026-05-08', shiftCode: 'EDU', reason: '수간호사 회의' },
      { employeeCode: 'N101-04', date: '2026-05-09', shiftCode: 'EDU', reason: '병동 교육' },
    ],
    events: [
      { employeeCode: 'N101-01', scope: 'member', eventType: 'fixed_shift', title: '수간호사 회의', startDate: '2026-05-08', endDate: '2026-05-08', blocksWork: true, preferredShiftCode: 'EDU', allDay: false, startMinutes: 540, endMinutes: 1020 },
      { employeeCode: 'N101-04', scope: 'member', eventType: 'education', title: '병동 교육', startDate: '2026-05-09', endDate: '2026-05-09', blocksWork: true, preferredShiftCode: 'EDU', allDay: false, startMinutes: 540, endMinutes: 1020 },
      { employeeCode: 'N101-08', scope: 'member', eventType: 'orientation', title: '신규간호사 오리엔테이션', startDate: '2026-05-20', endDate: '2026-05-21', blocksWork: true, preferredShiftCode: 'EDU', allDay: false, startMinutes: 540, endMinutes: 1020, notes: '교육 주간에는 night 후보에서 후순위' },
      { employeeCode: 'N101-09', scope: 'member', eventType: 'education', title: '프리셉터 동행 교육', startDate: '2026-05-13', endDate: '2026-05-13', blocksWork: true, preferredShiftCode: 'EDU', allDay: false, startMinutes: 540, endMinutes: 1020 },
      { employeeCode: 'N101-02', scope: 'member', eventType: 'education', title: 'CS 교육', startDate: '2026-05-14', endDate: '2026-05-14', blocksWork: true, preferredShiftCode: 'EDU', allDay: false, startMinutes: 540, endMinutes: 1020, notes: '연차와 의도적 중복 시나리오' },
      { scope: 'team', eventType: 'dinner', title: '101 병동 회식', startDate: '2026-05-22', endDate: '2026-05-22', blocksWork: false, allDay: false, startMinutes: 1080, endMinutes: 1200 },
      { scope: 'team', eventType: 'meeting', title: '다학제 컨퍼런스', startDate: '2026-05-18', endDate: '2026-05-18', blocksWork: false, allDay: false, startMinutes: 900, endMinutes: 1020, coverageDelta: { E: 1 } },
      { scope: 'team', eventType: 'ward_event', title: '감염관리 라운딩', startDate: '2026-05-26', endDate: '2026-05-26', blocksWork: false, allDay: true, coverageDelta: { D: 1 }, notes: '주간 커버리지 1명 추가 필요' },
    ],
    rules: {
      ruleProfileId: 1,
      hospitalRuleVersion: '2026.1',
      minRestHours: 16,
      maxNightShiftsPerMonth: 6,
      forbiddenPatterns: [['N', 'OFF', 'D']],
      weights: { request: 10, fairness: 25, nightCap: 100, continuity: 15 },
    },
    publish: true,
  },
  {
    slug: 'angio',
    name: 'Angio Team',
    description: '특수검사팀 파일럿. 배포 전 검토 중심으로 남겨둔 초안 상태 데모.',
    members: [
      { employeeCode: 'ANG-01', displayName: '김도윤', externalUserId: '20000000-0000-0000-0000-000000000201', age: 40, roleLabel: 'Head Nurse', skillTags: ['angio', 'charge'], teamRole: 'head_nurse', canNight: false, previousAssignments: ['OFF', 'OFF', 'D', 'D', 'OFF', 'D', 'OFF'] },
      { employeeCode: 'ANG-02', displayName: '윤서진', externalUserId: '20000000-0000-0000-0000-000000000202', age: 34, roleLabel: 'RN', skillTags: ['angio'], teamRole: 'scheduler', canNight: true, previousAssignments: ['E', 'OFF', 'D', 'OFF', 'N', 'OFF', 'D'] },
      { employeeCode: 'ANG-03', displayName: '최다현', externalUserId: '20000000-0000-0000-0000-000000000203', age: 32, roleLabel: 'RN', skillTags: ['angio', 'sedation'], teamRole: 'staff', canNight: true, previousAssignments: ['D', 'OFF', 'E', 'OFF', 'D', 'N', 'OFF'] },
      { employeeCode: 'ANG-04', displayName: '이예나', externalUserId: '20000000-0000-0000-0000-000000000204', age: 30, roleLabel: 'RN', skillTags: ['angio'], teamRole: 'staff', canNight: true, previousAssignments: ['OFF', 'D', 'OFF', 'E', 'OFF', 'D', 'N'] },
      { employeeCode: 'ANG-05', displayName: '장지후', externalUserId: '20000000-0000-0000-0000-000000000205', age: 28, roleLabel: 'RN', skillTags: ['angio', 'new-grad'], teamRole: 'staff', canNight: true, previousAssignments: ['D', 'OFF', 'OFF', 'N', 'OFF', 'D', 'E'] },
      { employeeCode: 'ANG-06', displayName: '서민아', externalUserId: '20000000-0000-0000-0000-000000000206', age: 27, roleLabel: 'RN', skillTags: ['angio', 'new-grad'], teamRole: 'staff', canNight: true, previousAssignments: ['OFF', 'D', 'N', 'OFF', 'OFF', 'D', 'OFF'] },
    ],
    shiftTypes: [
      { code: 'D', label: 'Day', startMinutes: 450, endMinutes: 930, isWork: true },
      { code: 'E', label: 'Evening', startMinutes: 870, endMinutes: 1290, isWork: true },
      { code: 'N', label: 'Night', startMinutes: 1260, endMinutes: 1860, isWork: true },
      { code: 'OFF', label: 'Off', startMinutes: 0, endMinutes: 0, isWork: false },
      { code: 'LEAVE', label: 'Leave', startMinutes: 0, endMinutes: 0, isWork: false },
      { code: 'EDU', label: 'Education', startMinutes: 540, endMinutes: 1020, isWork: false },
    ],
    coverage: buildMonthCoverage(2026, 5, { D: 2, E: 1, N: 1 }, { weekend: { D: 1, E: 1, N: 1 }, holidays: { D: 1, E: 1, N: 1 } }),
    requests: [
      { employeeCode: 'ANG-03', dates: ['2026-05-08'], note: '학회 발표' },
      { employeeCode: 'ANG-05', dates: ['2026-05-22'], note: '개인 일정' },
    ],
    leaves: [
      { employeeCode: 'ANG-02', startDate: '2026-05-19', endDate: '2026-05-19', leaveType: 'annual' },
    ],
    locks: [
      { employeeCode: 'ANG-01', date: '2026-05-02', shiftCode: 'EDU', reason: '장비 점검 리허설' },
    ],
    events: [
      { employeeCode: 'ANG-01', scope: 'member', eventType: 'fixed_shift', title: '장비 점검 리허설', startDate: '2026-05-02', endDate: '2026-05-02', blocksWork: true, preferredShiftCode: 'EDU', allDay: false, startMinutes: 540, endMinutes: 1020 },
      { employeeCode: 'ANG-03', scope: 'member', eventType: 'conference', title: '학회 발표', startDate: '2026-05-08', endDate: '2026-05-08', blocksWork: true, preferredShiftCode: 'EDU', allDay: false, startMinutes: 540, endMinutes: 1020 },
      { employeeCode: 'ANG-05', scope: 'member', eventType: 'education', title: '신규 장비 교육', startDate: '2026-05-22', endDate: '2026-05-22', blocksWork: true, preferredShiftCode: 'EDU', allDay: false, startMinutes: 540, endMinutes: 1020 },
      { scope: 'team', eventType: 'dinner', title: 'Angio 팀 회식', startDate: '2026-05-14', endDate: '2026-05-14', blocksWork: false, allDay: false, startMinutes: 1080, endMinutes: 1200 },
      { scope: 'team', eventType: 'meeting', title: '시술실 운영 회의', startDate: '2026-05-12', endDate: '2026-05-12', blocksWork: false, allDay: false, startMinutes: 900, endMinutes: 960 },
      { scope: 'team', eventType: 'ward_event', title: '조영제 교육 라운딩', startDate: '2026-05-16', endDate: '2026-05-16', blocksWork: false, allDay: true, coverageDelta: { D: 1 } },
    ],
    rules: {
      ruleProfileId: 1,
      hospitalRuleVersion: '2026.1',
      minRestHours: 16,
      maxNightShiftsPerMonth: 5,
      forbiddenPatterns: [['N', 'OFF', 'D']],
      weights: { request: 12, fairness: 20, nightCap: 120, continuity: 12 },
    },
    publish: false,
  },
]

function buildMonthCoverage(
  year: number,
  month: number,
  weekday: Record<string, number>,
  options: {
    weekend?: Record<string, number>
    holidays?: Record<string, number>
  } = {},
): CoverageDay[] {
  const holidays = new Set(['2026-05-05'])
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const coverage: CoverageDay[] = []
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(year, month - 1, day))
    const dateStr = date.toISOString().slice(0, 10)
    const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6
    const isHoliday = holidays.has(dateStr)
    coverage.push({
      date: dateStr,
      requirements: isHoliday
        ? { ...weekday, ...(options.holidays || options.weekend || {}) }
        : isWeekend
          ? { ...weekday, ...(options.weekend || {}) }
          : { ...weekday },
      isWeekend,
      isHoliday,
    })
  }
  return coverage
}

function teamScoreWeights(rules: ScheduleGenerationContext['rules']) {
  return {
    request: rules.weights.request,
    fairness: rules.weights.fairness,
    nightCap: rules.weights.nightCap,
    continuity: rules.weights.continuity,
  }
}

async function ensureCalendarSnapshot() {
  await sql`
    create table if not exists calendar_snapshots (
      id serial primary key,
      year integer not null,
      kind text not null,
      items jsonb not null default '[]'::jsonb,
      source text not null default 'manual',
      refreshed_at timestamptz not null default now(),
      refreshed_by uuid
    )
  `
  await sql`
    create unique index if not exists calendar_snapshots_year_kind_idx
    on calendar_snapshots (year, kind)
  `
  await sql`
    insert into calendar_snapshots (year, kind, items, source)
    values (
      ${pilotPeriod.year},
      'holidays',
      ${sql.json([
        { name: '어린이날', date: '2026-05-05', isHoliday: true, dateKind: '01' },
      ] as any)},
      'seed'
    )
    on conflict (year, kind)
    do update set items = excluded.items, source = excluded.source, refreshed_at = now()
  `
}

async function resetExistingSeed() {
  const allExternalUserIds = teamSeeds.flatMap((team) => team.members.map((member) => member.externalUserId))
  await sql`
    delete from leave_records
    where user_id::text = any(${sql.array(allExternalUserIds)})
  `
  await sql`
    delete from teams
    where slug = any(${sql.array(teamSeeds.map((team) => team.slug))})
  `
}

async function seedTeam(teamSeed: TeamSeedInput) {
  const [teamRow] = await sql<Array<{ id: number }>>`
    insert into teams (
      slug,
      name,
      description,
      is_active,
      metadata
    )
    values (
      ${teamSeed.slug},
      ${teamSeed.name},
      ${teamSeed.description},
      true,
      ${sql.json({
        demoMode: true,
        defaultPeriod: `${pilotPeriod.year}-${String(pilotPeriod.month).padStart(2, '0')}`,
        designTone: 'toss-operations',
      } as any)}
    )
    returning id
  `
  const teamId = teamRow.id

  await sql`
    insert into team_subdomains (team_id, slug, hostname, is_active)
    values (${teamId}, ${teamSeed.slug}, ${`${teamSeed.slug}.snuhmate.com`}, true)
  `

  const [ruleProfileRow] = await sql<Array<{ id: number }>>`
    insert into team_rule_profiles (
      team_id,
      version,
      name,
      hospital_rule_version,
      structured_rules,
      scoring_weights,
      is_active
    )
    values (
      ${teamId},
      1,
      ${`${teamSeed.name} 기본 규칙`},
      ${teamSeed.rules.hospitalRuleVersion},
      ${sql.json({
        minRestHours: teamSeed.rules.minRestHours,
        maxNightShiftsPerMonth: teamSeed.rules.maxNightShiftsPerMonth,
        forbiddenPatterns: teamSeed.rules.forbiddenPatterns,
      } as any)},
      ${sql.json(teamScoreWeights(teamSeed.rules) as any)},
      true
    )
    returning id
  `

  await sql`
    insert into coverage_templates (
      team_id,
      name,
      is_active,
      rules
    )
    values (
      ${teamId},
      ${`${teamSeed.name} 기본 커버리지`},
      true,
      ${sql.json({
        defaultRequirements: teamSeed.coverage[0]?.requirements || { D: 2, E: 1, N: 1 },
        weekend: teamSeed.coverage.find((day) => day.isWeekend)?.requirements,
        holidays: teamSeed.coverage.find((day) => day.isHoliday)?.requirements,
        specificDates: Object.fromEntries(
          teamSeed.coverage
            .filter((day) => day.isHoliday)
            .map((day) => [day.date, day.requirements]),
        ),
      } as any)}
    )
  `

  for (const [index, shiftType] of teamSeed.shiftTypes.entries()) {
    await sql`
      insert into shift_types (
        team_id,
        code,
        label,
        start_minutes,
        end_minutes,
        is_work,
        category,
        sort_order,
        metadata
      )
      values (
        ${teamId},
        ${shiftType.code},
        ${shiftType.label},
        ${shiftType.startMinutes},
        ${shiftType.endMinutes},
        ${shiftType.isWork},
        ${shiftType.isWork ? 'work' : 'off'},
        ${index},
        ${sql.json({ demo: true } as any)}
      )
    `
  }

  const insertedMembers = []
  for (const member of teamSeed.members) {
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
        ${member.externalUserId},
        ${member.employeeCode},
        ${member.displayName},
        ${member.age},
        ${member.roleLabel},
        ${sql.json(member.skillTags as any)},
        1000,
        ${member.canNight},
        ${sql.json({
          persona: member.skillTags.join(','),
          previousAssignments: member.previousAssignments,
        } as any)}
      )
      returning id
    `
    insertedMembers.push({
      ...member,
      id: memberRow.id,
    })

    await sql`
      insert into team_memberships (
        team_id,
        member_id,
        team_role,
        is_primary,
        metadata
      )
      values (
        ${teamId},
        ${memberRow.id},
        ${member.teamRole},
        true,
        ${sql.json({ seeded: true } as any)}
      )
    `
  }

  const periodKey = `${pilotPeriod.year}-${String(pilotPeriod.month).padStart(2, '0')}`
  const [periodRow] = await sql<Array<{ id: number }>>`
    insert into schedule_periods (
      team_id,
      year,
      month,
      status,
      active_rule_profile_id
    )
    values (
      ${teamId},
      ${pilotPeriod.year},
      ${pilotPeriod.month},
      ${teamSeed.publish ? 'published' : 'review'},
      ${ruleProfileRow.id}
    )
    returning id
  `

  const memberIdByEmployeeCode = new Map(insertedMembers.map((member) => [member.employeeCode, member.id]))
  const approvedLeaves: ApprovedLeave[] = []
  for (const leave of teamSeed.leaves) {
    const member = insertedMembers.find((item) => item.employeeCode === leave.employeeCode)
    if (!member) continue
    await sql`
      insert into leave_records (
        id,
        user_id,
        "startDate",
        "endDate",
        type,
        days,
        hours,
        memo,
        "isPaid",
        "usesAnnual",
        category,
        "deductType",
        "salaryImpact",
        "hourlyRate",
        "monthlyBasePay"
      )
      values (
        ${`seed_${teamSeed.slug}_${leave.employeeCode}_${leave.startDate}`},
        ${member.externalUserId},
        ${leave.startDate},
        ${leave.endDate},
        ${leave.leaveType},
        ${1},
        ${0},
        ${'파일럿 시드 연차'},
        true,
        ${leave.leaveType === 'annual'},
        ${'연차'},
        'none',
        ${0},
        ${0},
        ${0}
      )
    `
    for (const date of enumerateDates(leave.startDate, leave.endDate)) {
      approvedLeaves.push({
        memberId: member.id,
        date,
        leaveType: leave.leaveType,
      })
    }
  }

  const preferredOffRequests: PreferredOffRequest[] = []
  for (const request of teamSeed.requests) {
    const memberId = memberIdByEmployeeCode.get(request.employeeCode)
    if (!memberId) continue
    for (const date of request.dates) {
      await sql`
        insert into schedule_requests (
          team_id,
          period_id,
          member_id,
          request_type,
          request_date,
          note,
          metadata
        )
        values (
          ${teamId},
          ${periodRow.id},
          ${memberId},
          'preferred_off',
          ${date},
          ${request.note || null},
          ${sql.json({ seeded: true } as any)}
        )
      `
      preferredOffRequests.push({
        memberId,
        date,
        requestType: 'preferred_off',
        note: request.note || null,
      })
    }
  }

  const locks: AssignmentLock[] = []
  for (const lock of teamSeed.locks) {
    const memberId = memberIdByEmployeeCode.get(lock.employeeCode)
    if (!memberId) continue
    await sql`
      insert into assignment_locks (
        period_id,
        member_id,
        work_date,
        locked_shift_code,
        reason
      )
      values (
        ${periodRow.id},
        ${memberId},
        ${lock.date},
        ${lock.shiftCode},
        ${lock.reason || null}
      )
    `
    locks.push({
      memberId,
      date: lock.date,
      shiftCode: lock.shiftCode,
      reason: lock.reason || null,
    })
  }

  const seededEvents: ScheduleEvent[] = []
  for (const event of teamSeed.events) {
    const memberId = event.employeeCode ? (memberIdByEmployeeCode.get(event.employeeCode) || null) : null
    const [eventRow] = await sql<Array<{ id: number }>>`
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
        source
      )
      values (
        ${teamId},
        ${periodRow.id},
        ${memberId},
        ${event.scope},
        ${event.eventType},
        ${event.title},
        ${event.startDate},
        ${event.endDate},
        ${event.startMinutes ?? null},
        ${event.endMinutes ?? null},
        ${event.allDay ?? true},
        ${event.blocksWork ?? false},
        ${event.preferredShiftCode ?? null},
        ${sql.json((event.coverageDelta || {}) as any)},
        ${event.notes ?? null},
        ${event.source || 'seed'}
      )
      returning id
    `
    seededEvents.push({
      id: eventRow.id,
      teamId,
      periodId: periodRow.id,
      memberId,
      scope: event.scope,
      eventType: event.eventType,
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      startMinutes: event.startMinutes ?? null,
      endMinutes: event.endMinutes ?? null,
      allDay: event.allDay ?? true,
      blocksWork: event.blocksWork ?? false,
      preferredShiftCode: event.preferredShiftCode ?? null,
      coverageDelta: event.coverageDelta || {},
      notes: event.notes ?? null,
      source: event.source || 'seed',
      dates: [],
    })
  }

  const members: ScheduleGenerationContext['members'] = insertedMembers.map((member, index) => ({
    id: member.id,
    name: member.displayName,
    age: member.age,
    roleLabel: member.roleLabel,
    canNight: member.canNight,
    ftePermille: 1000,
    skillTags: member.skillTags,
    fairness: {
      night: index % 3,
      weekend: index % 2,
      holiday: index % 2,
      undesirable: (index + 1) % 4,
    },
      previousAssignments: member.previousAssignments,
  }))

  const coverageStart = teamSeed.coverage[0]?.date || `${pilotPeriod.year}-${String(pilotPeriod.month).padStart(2, '0')}-01`
  const coverageEnd = teamSeed.coverage[teamSeed.coverage.length - 1]?.date || coverageStart
  const expandedEvents = expandScheduleEvents(seededEvents, {
    start: coverageStart,
    end: coverageEnd,
  })
  const memberEvents = expandedEvents.filter((event) => event.scope === 'member')
  const wardEvents = expandedEvents.filter((event) => event.scope === 'team')
  const adjustedCoverage = applyWardEventCoverage(teamSeed.coverage, wardEvents)
  const mergedLocks = new Map(
    buildEventLocks(memberEvents).map((lock) => [`${lock.memberId}:${lock.date}`, lock] as const),
  )
  for (const lock of locks) {
    mergedLocks.set(`${lock.memberId}:${lock.date}`, lock)
  }
  const leaveLedger = buildLeaveLedger({
    members,
    shiftTypes: teamSeed.shiftTypes,
    approvedLeaves,
    memberEvents,
    historicalPublishedAssignments: [],
    currentPublishedAssignments: [],
    previousVersionAssignments: [],
  })
  const datasetValidation = validateDataset({
    members,
    shiftTypes: teamSeed.shiftTypes,
    approvedLeaves,
    memberEvents,
    wardEvents,
    leaveLedger,
  })
  const datasetScenarioReport = buildDatasetScenarioReport({
    members,
    memberEvents,
    wardEvents,
    leaveLedger,
    validation: datasetValidation,
    coverage: teamSeed.coverage,
    adjustedCoverage,
  })

  const payload = buildSolverPayload({
    team: {
      id: teamId,
      slug: teamSeed.slug,
      name: teamSeed.name,
      year: pilotPeriod.year,
      month: pilotPeriod.month,
    },
    members,
    shiftTypes: teamSeed.shiftTypes,
    coverage: adjustedCoverage,
    approvedLeaves,
    preferredOffRequests,
    locks: Array.from(mergedLocks.values()),
    memberEvents,
    wardEvents,
    leaveLedger,
    datasetValidation,
    datasetScenarioReport,
    previousPublishedAssignments: [],
    rules: {
      ...teamSeed.rules,
      ruleProfileId: ruleProfileRow.id,
    },
  })

  const [runRow] = await sql<Array<{ id: number }>>`
    insert into schedule_runs (
      period_id,
      run_type,
      status,
      input_snapshot,
      solver_engine,
      started_at
    )
    values (
      ${periodRow.id},
      'generate',
      'running',
      ${sql.json(payload as any)},
      'seed',
      now()
    )
    returning id
  `

  const solverResult = await runScheduleSolver(payload)
  if (solverResult.status !== 'completed') {
    throw new Error(`${teamSeed.slug} seed failed: ${solverResult.reasons.join(', ')}`)
  }

  let selectedCandidateId: number | null = null
  for (const candidate of solverResult.candidates) {
    const diff = summarizePublishDiff([], candidate.assignments)
    const [candidateRow] = await sql<Array<{ id: number }>>`
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
        ${runRow.id},
        ${candidate.candidateKey},
        ${candidate.rank},
        ${candidate.candidateKey === solverResult.selectedCandidateKey ? 'selected' : 'draft'},
        ${sql.json(candidate.score as any)},
        ${sql.json(candidate.explanation as any)},
        ${sql.json(candidate.assignments as any)},
        ${sql.json(candidate.violations as any)},
        ${sql.json(diff as any)}
      )
      returning id
    `
    if (candidate.candidateKey === solverResult.selectedCandidateKey) {
      selectedCandidateId = candidateRow.id
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
          ${candidateRow.id},
          ${assignment.memberId},
          ${assignment.date},
          ${assignment.shiftCode},
          'seed',
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
          ${candidateRow.id},
          ${violation.severity},
          ${violation.ruleCode},
          ${violation.message},
          ${violation.date || null},
          ${violation.memberId || null},
          ${sql.json((violation.details || {}) as any)}
        )
      `
    }
  }

  await sql`
    update schedule_runs
    set
      status = 'completed',
      selected_candidate_id = ${selectedCandidateId},
      solver_engine = ${solverResult.engine},
      summary = ${sql.json((solverResult.summary || {}) as any)},
      finished_at = now()
    where id = ${runRow.id}
  `

  let publishVersionId: number | null = null
  if (teamSeed.publish && selectedCandidateId) {
    const selected = solverResult.candidates.find((candidate) => candidate.candidateKey === solverResult.selectedCandidateKey)!
    const [publishRow] = await sql<Array<{ id: number }>>`
      insert into publish_versions (
        period_id,
        candidate_id,
        version_number,
        status,
        assignments_snapshot,
        diff_summary,
        calendar_sync_state
      )
      values (
        ${periodRow.id},
        ${selectedCandidateId},
        1,
        'published',
        ${sql.json(selected.assignments as any)},
        ${sql.json(summarizePublishDiff([], selected.assignments) as any)},
        ${sql.json({ status: 'pilot_seed_ready', calendarMode: 'ics' } as any)}
      )
      returning id
    `
    publishVersionId = publishRow.id

    await sql`
      update schedule_periods
      set
        status = 'published',
        latest_run_id = ${runRow.id},
        current_candidate_id = ${selectedCandidateId},
        current_publish_version_id = ${publishVersionId},
        request_snapshot = ${sql.json({
          requestCount: preferredOffRequests.length,
          leaveCount: approvedLeaves.length,
          eventCount: expandedEvents.length,
          validationErrors: datasetValidation.summary.errors,
          validationWarnings: datasetValidation.summary.warnings,
          periodKey,
        } as any)},
        updated_at = now()
      where id = ${periodRow.id}
    `

    const selectedAssignments = selected.assignments
    const requester = selectedAssignments.find((assignment) => assignment.memberName === '정민지' && assignment.shiftCode === 'D')
    const counterparty = selectedAssignments.find((assignment) => assignment.memberName === '한소희' && assignment.date === requester?.date && assignment.shiftCode === 'E')
    if (requester && counterparty) {
      const [swapRow] = await sql<Array<{ id: number }>>`
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
          status
        )
        values (
          ${periodRow.id},
          ${publishVersionId},
          ${requester.memberId},
          ${counterparty.memberId},
          ${requester.date},
          ${requester.shiftCode},
          ${counterparty.date},
          ${counterparty.shiftCode},
          '육아 등원 이슈로 교대 요청',
          'pending'
        )
        returning id
      `
      await sql`
        insert into swap_events (
          swap_request_id,
          event_type,
          payload
        )
        values (
          ${swapRow.id},
          'requested',
          ${sql.json({ seeded: true } as any)}
        )
      `
    }
  } else {
    await sql`
      update schedule_periods
      set
        status = 'review',
        latest_run_id = ${runRow.id},
        current_candidate_id = ${selectedCandidateId},
        request_snapshot = ${sql.json({
          requestCount: preferredOffRequests.length,
          leaveCount: approvedLeaves.length,
          eventCount: expandedEvents.length,
          validationErrors: datasetValidation.summary.errors,
          validationWarnings: datasetValidation.summary.warnings,
          periodKey,
        } as any)},
        updated_at = now()
      where id = ${periodRow.id}
    `
  }

  console.log(`Seeded ${teamSeed.slug} team with period ${periodKey}. publish=${teamSeed.publish} publishVersionId=${publishVersionId}`)
}

function enumerateDates(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const cursor = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

async function main() {
  await ensureCalendarSnapshot()
  await resetExistingSeed()
  for (const teamSeed of teamSeeds) {
    await seedTeam(teamSeed)
  }
  await sql.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
