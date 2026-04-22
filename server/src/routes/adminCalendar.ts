import { Hono } from 'hono'
import postgres from 'postgres'
import { requireAdmin } from '../middleware/auth.js'

const adminCalendarRoutes = new Hono()
const sql = postgres(process.env.DATABASE_URL!, { prepare: false })

const API_BASE = 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService'

const staticAnniversaries = [
  { name: '식목일', month: 4, day: 5 },
  { name: '스승의날', month: 5, day: 15 },
  { name: '제헌절', month: 7, day: 17 },
  { name: '국군의날', month: 10, day: 1 },
  { name: '한글날', month: 10, day: 9 },
]

async function fetchHolidayItems(year: number) {
  const serviceKey =
    process.env.PUBLIC_DATA_API_KEY ||
    process.env.DATA_GO_KR_SERVICE_KEY ||
    ''

  const fetchOperation = async (operation: string) => {
    const url = new URL(`${API_BASE}/${operation}`)
    url.searchParams.set('ServiceKey', serviceKey)
    url.searchParams.set('solYear', String(year))
    url.searchParams.set('numOfRows', '100')
    url.searchParams.set('_type', 'json')

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`${operation} failed with ${response.status}`)
    }

    const data = await response.json() as {
      response?: {
        body?: {
          items?: {
            item?: Array<Record<string, unknown>> | Record<string, unknown>
          }
        }
      }
    }

    const items = data?.response?.body?.items?.item
    if (!items) return []

    const list = Array.isArray(items) ? items : [items]
    return list.map((item) => ({
      name: String(item.dateName ?? ''),
      date: String(item.locdate ?? ''),
      isHoliday: item.isHoliday === 'Y' || item.isHoliday === true,
      dateKind: String(item.dateKind ?? ''),
    }))
  }

  const [restDays, holiDays] = await Promise.all([
    fetchOperation('getRestDeInfo'),
    fetchOperation('getHoliDeInfo'),
  ])

  const merged = new Map<string, { name: string; date: string; isHoliday: boolean; dateKind: string }>()
  for (const item of [...restDays, ...holiDays]) {
    if (item.isHoliday !== false) {
      merged.set(`${item.date}_${item.name}`, item)
    }
  }
  return Array.from(merged.values())
}

function buildAnniversaryItems(year: number) {
  return staticAnniversaries.map((item) => ({
    name: item.name,
    date: `${year}${String(item.month).padStart(2, '0')}${String(item.day).padStart(2, '0')}`,
    isHoliday: false,
    dateKind: '기념일',
  }))
}

adminCalendarRoutes.get('/snapshots', requireAdmin, async (c) => {
  const year = Number(c.req.query('year'))

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return c.json({ error: 'Valid year is required' }, 400)
  }


  const rows = await sql`
    select year, kind, items, source, refreshed_at
    from calendar_snapshots
    where year = ${year}
    order by kind asc
  `

  const result = {
    year,
    holidays: rows.find((row) => row.kind === 'holidays') || null,
    anniversaries: rows.find((row) => row.kind === 'anniversaries') || null,
  }

  return c.json({ result })
})

adminCalendarRoutes.post('/refresh', requireAdmin, async (c) => {
  const body = await c.req.json<{ year?: number | string }>().catch(
    () => ({ year: undefined } as { year?: number | string }),
  )
  const year = Number(body.year)

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return c.json({ error: 'Valid year is required' }, 400)
  }


  const holidays = await fetchHolidayItems(year)
  const anniversaries = buildAnniversaryItems(year)
  const userId = (c as any).get('userId') as string | null

  await sql`
    INSERT INTO calendar_snapshots (year, kind, items, source, refreshed_at, refreshed_by)
    VALUES (${year}, 'holidays', ${sql.json(holidays)}, 'admin-refresh', now(), ${userId})
    ON CONFLICT (year, kind)
    DO UPDATE SET
      items = EXCLUDED.items,
      source = EXCLUDED.source,
      refreshed_at = EXCLUDED.refreshed_at,
      refreshed_by = EXCLUDED.refreshed_by
  `

  await sql`
    INSERT INTO calendar_snapshots (year, kind, items, source, refreshed_at, refreshed_by)
    VALUES (${year}, 'anniversaries', ${sql.json(anniversaries)}, 'static-admin-refresh', now(), ${userId})
    ON CONFLICT (year, kind)
    DO UPDATE SET
      items = EXCLUDED.items,
      source = EXCLUDED.source,
      refreshed_at = EXCLUDED.refreshed_at,
      refreshed_by = EXCLUDED.refreshed_by
  `

  return c.json({
    success: true,
    year,
    holidayCount: holidays.length,
    anniversaryCount: anniversaries.length,
  })
})

export default adminCalendarRoutes
