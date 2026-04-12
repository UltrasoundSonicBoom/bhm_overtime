import { Hono } from 'hono'
import postgres from 'postgres'
import { optionalAuth } from '../middleware/auth'
import {
  buildPersonalScheduleView,
  type PublishedAssignment,
  type ShiftTypeDefinition,
} from '../services/team-schedules'
import { buildIcsCalendar } from '../services/calendar-ics'

const meRoutes = new Hono()
const sql = postgres(process.env.DATABASE_URL!, { prepare: false })

function getUserId(c: any): string | null {
  return (c.get('userId') as string | null) ?? null
}

function monthBoundsFromDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toISOString().slice(0, 10)
}

function minutesToIso(dateStr: string, minutes: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`)
  date.setUTCMinutes(minutes)
  return date.toISOString()
}

meRoutes.use('*', optionalAuth)

meRoutes.get('/schedule', async (c) => {
  const userId = getUserId(c)
  if (!userId) {
    return c.json({ error: 'Authorization required' }, 401)
  }

  const start = monthBoundsFromDate(c.req.query('start') || new Date().toISOString().slice(0, 10))
  const end = monthBoundsFromDate(c.req.query('end') || start)

  const teamRows = await sql<Array<{
    team_id: number
    team_slug: string
    team_name: string
    member_id: number
    external_user_id: string | null
  }>>`
    select
      t.id as team_id,
      t.slug as team_slug,
      t.name as team_name,
      m.id as member_id,
      m.external_user_id::text as external_user_id
    from team_members m
    inner join team_memberships tm on tm.member_id = m.id
    inner join teams t on t.id = tm.team_id
    where m.external_user_id = ${userId}::uuid
      and tm.ended_at is null
      and t.is_active = true
  `
  const periodRows = teamRows.length > 0
    ? await sql<Array<{ current_publish_version_id: number | null }>>`
        select current_publish_version_id
        from schedule_periods
        where team_id::text = any(${sql.array(teamRows.map((row) => String(row.team_id)))})
          and current_publish_version_id is not null
      `
    : []
  const publishVersionIds = periodRows
    .map((row) => row.current_publish_version_id)
    .filter((value): value is number => value != null)
  const publishRows = publishVersionIds.length > 0
    ? await sql<Array<{ assignments_snapshot: PublishedAssignment[] }>>`
        select assignments_snapshot
        from publish_versions
        where id::text = any(${sql.array(publishVersionIds.map(String))})
      `
    : []
  const shiftTypeRows = teamRows.length > 0
    ? await sql<Array<{
        code: string
        label: string
        start_minutes: number
        end_minutes: number
        is_work: boolean
      }>>`
        select distinct code, label, start_minutes, end_minutes, is_work
        from shift_types
        where team_id::text = any(${sql.array(teamRows.map((row) => String(row.team_id)))})
      `
    : []
  const leaveRows = await sql<Array<{
    userId: string
    type: string
    startDate: string
    endDate: string
  }>>`
    select
      user_id::text as "userId",
      type,
      "startDate",
      "endDate"
    from leave_records
    where user_id = ${userId}::uuid
      and "startDate" <= ${end}
      and "endDate" >= ${start}
  `

  const view = buildPersonalScheduleView({
    userId,
    teams: teamRows.map((row) => ({
      teamId: row.team_id,
      teamSlug: row.team_slug,
      teamName: row.team_name,
      memberId: row.member_id,
      externalUserId: row.external_user_id,
    })),
    publishedAssignments: publishRows.flatMap((row) => row.assignments_snapshot || []),
    shiftTypes: shiftTypeRows.map<ShiftTypeDefinition>((row) => ({
      code: row.code,
      label: row.label,
      startMinutes: row.start_minutes,
      endMinutes: row.end_minutes,
      isWork: row.is_work,
    })),
    leaveRecords: leaveRows.map((row) => ({
      userId: row.userId,
      type: row.type,
      startDate: row.startDate,
      endDate: row.endDate,
    })),
  })

  const filteredEntries = view.entries.filter((entry) => entry.date >= start && entry.date <= end)

  return c.json({
    result: {
      userId,
      entries: filteredEntries,
    },
  })
})

meRoutes.get('/schedule.ics', async (c) => {
  const userId = getUserId(c)
  if (!userId) {
    return c.json({ error: 'Authorization required' }, 401)
  }

  const start = monthBoundsFromDate(c.req.query('start') || new Date().toISOString().slice(0, 10))
  const end = monthBoundsFromDate(c.req.query('end') || start)

  const teamRows = await sql<Array<{
    team_id: number
    team_slug: string
    team_name: string
    member_id: number
    external_user_id: string | null
  }>>`
    select
      t.id as team_id,
      t.slug as team_slug,
      t.name as team_name,
      m.id as member_id,
      m.external_user_id::text as external_user_id
    from team_members m
    inner join team_memberships tm on tm.member_id = m.id
    inner join teams t on t.id = tm.team_id
    where m.external_user_id = ${userId}::uuid
      and tm.ended_at is null
      and t.is_active = true
  `

  const periodRows = teamRows.length > 0
    ? await sql<Array<{ current_publish_version_id: number | null }>>`
        select current_publish_version_id
        from schedule_periods
        where team_id::text = any(${sql.array(teamRows.map((row) => String(row.team_id)))})
          and current_publish_version_id is not null
      `
    : []
  const publishVersionIds = periodRows
    .map((row) => row.current_publish_version_id)
    .filter((value): value is number => value != null)
  const publishRows = publishVersionIds.length > 0
    ? await sql<Array<{ assignments_snapshot: PublishedAssignment[] }>>`
        select assignments_snapshot
        from publish_versions
        where id::text = any(${sql.array(publishVersionIds.map(String))})
      `
    : []
  const shiftTypeRows = teamRows.length > 0
    ? await sql<Array<{
        code: string
        label: string
        start_minutes: number
        end_minutes: number
        is_work: boolean
      }>>`
        select distinct code, label, start_minutes, end_minutes, is_work
        from shift_types
        where team_id::text = any(${sql.array(teamRows.map((row) => String(row.team_id)))})
      `
    : []
  const leaveRows = await sql<Array<{
    userId: string
    type: string
    startDate: string
    endDate: string
  }>>`
    select
      user_id::text as "userId",
      type,
      "startDate",
      "endDate"
    from leave_records
    where user_id = ${userId}::uuid
      and "startDate" <= ${end}
      and "endDate" >= ${start}
  `

  const view = buildPersonalScheduleView({
    userId,
    teams: teamRows.map((row) => ({
      teamId: row.team_id,
      teamSlug: row.team_slug,
      teamName: row.team_name,
      memberId: row.member_id,
      externalUserId: row.external_user_id,
    })),
    publishedAssignments: publishRows.flatMap((row) => row.assignments_snapshot || []),
    shiftTypes: shiftTypeRows.map<ShiftTypeDefinition>((row) => ({
      code: row.code,
      label: row.label,
      startMinutes: row.start_minutes,
      endMinutes: row.end_minutes,
      isWork: row.is_work,
    })),
    leaveRecords: leaveRows.map((row) => ({
      userId: row.userId,
      type: row.type,
      startDate: row.startDate,
      endDate: row.endDate,
    })),
  })

  const filteredEntries = view.entries.filter((entry) => entry.date >= start && entry.date <= end)
  const shiftEvents = filteredEntries.flatMap((entry) => {
    if (entry.startMinutes == null || entry.endMinutes == null) {
      return []
    }
    return [{
      uid: `shift-${userId}-${entry.teamSlug}-${entry.date}-${entry.shiftCode}`,
      summary: `${entry.teamName} ${entry.shiftCode}`,
      description: `${entry.teamName} ${entry.label}`,
      start: minutesToIso(entry.date, entry.startMinutes),
      end: minutesToIso(entry.date, entry.endMinutes),
    }]
  })

  const leaveEvents = new Map<string, Parameters<typeof buildIcsCalendar>[0]['events'][number]>()
  for (const entry of filteredEntries) {
    if (entry.source !== 'approved_leave') {
      continue
    }
    const nextDate = new Date(`${entry.date}T00:00:00Z`)
    nextDate.setUTCDate(nextDate.getUTCDate() + 1)
    leaveEvents.set(entry.date, {
      uid: `leave-${userId}-${entry.date}`,
      summary: `${entry.teamName} ${entry.label}`,
      description: `${entry.teamName} 휴가 일정`,
      start: entry.date,
      end: nextDate.toISOString().slice(0, 10),
      allDay: true,
    })
  }

  for (const leave of leaveRows) {
    const cursor = new Date(`${leave.startDate}T00:00:00Z`)
    const last = new Date(`${leave.endDate}T00:00:00Z`)
    while (cursor <= last) {
      const date = cursor.toISOString().slice(0, 10)
      if (date >= start && date <= end && !leaveEvents.has(date)) {
        const nextDate = new Date(`${date}T00:00:00Z`)
        nextDate.setUTCDate(nextDate.getUTCDate() + 1)
        const teamName = filteredEntries.find((entry) => entry.date === date)?.teamName || teamRows[0]?.team_name || 'SNUH Mate'
        leaveEvents.set(date, {
          uid: `leave-${userId}-${date}`,
          summary: `${teamName} ${leave.type}`,
          description: `${teamName} 휴가 일정`,
          start: date,
          end: nextDate.toISOString().slice(0, 10),
          allDay: true,
        })
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
  }

  const calendar = buildIcsCalendar({
    calendarName: 'SNUH Mate 개인 근무표',
    events: [...shiftEvents, ...Array.from(leaveEvents.values())],
  })

  c.header('Content-Type', 'text/calendar; charset=utf-8')
  c.header('Content-Disposition', `attachment; filename="snuhmate-schedule-${start}-${end}.ics"`)
  return c.body(calendar)
})

export default meRoutes
