import { Hono } from 'hono'
import postgres from 'postgres'

const calendarRoutes = new Hono()
const sql = postgres(process.env.DATABASE_URL!, { prepare: false })

const API_BASE = 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService'

type CalendarItem = {
  name: string
  date: string
  isHoliday: boolean
  dateKind: string
}

async function readSnapshot(year: number, kind: 'holidays' | 'anniversaries') {
  const rows = await sql`
    SELECT items, source, refreshed_at
    FROM calendar_snapshots
    WHERE year = ${year} AND kind = ${kind}
    LIMIT 1
  `
  return rows[0] || null
}

const getServiceKey = () =>
  process.env.PUBLIC_DATA_API_KEY ||
  process.env.DATA_GO_KR_SERVICE_KEY ||
  ''

async function fetchOperation(operation: string, year: number): Promise<CalendarItem[] | null> {
  const url = new URL(`${API_BASE}/${operation}`)
  url.searchParams.set('ServiceKey', getServiceKey())
  url.searchParams.set('solYear', String(year))
  url.searchParams.set('numOfRows', '100')
  url.searchParams.set('_type', 'json')

  const response = await fetch(url)
  if (!response.ok) {
    if (response.status === 403) return null
    throw new Error(`External API ${operation} failed with ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('json')) {
    throw new Error(`External API ${operation} returned ${contentType || 'unknown content-type'}`)
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

calendarRoutes.get('/holidays', async (c) => {
  const year = Number(c.req.query('year'))
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return c.json({ error: 'Invalid year' }, 400)
  }

  try {
    const snapshot = await readSnapshot(year, 'holidays')
    if (snapshot) {
      return c.json({
        source: snapshot.source || 'snapshot',
        items: Array.isArray(snapshot.items) ? snapshot.items : [],
        refreshedAt: snapshot.refreshed_at,
      })
    }

    const [restDays, holiDays] = await Promise.all([
      fetchOperation('getRestDeInfo', year),
      fetchOperation('getHoliDeInfo', year),
    ])

    const merged = new Map<string, CalendarItem>()
    for (const item of [...(restDays || []), ...(holiDays || [])]) {
      if (item.isHoliday !== false) {
        merged.set(`${item.date}_${item.name}`, item)
      }
    }

    return c.json({
      source: merged.size > 0 ? 'api' : 'fallback',
      items: Array.from(merged.values()),
    })
  } catch (error) {
    console.error('[calendar] holidays fetch failed:', error)
    return c.json({ source: 'fallback', items: [] })
  }
})

calendarRoutes.get('/anniversaries', async (c) => {
  const year = Number(c.req.query('year'))
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return c.json({ error: 'Invalid year' }, 400)
  }

  try {
    const snapshot = await readSnapshot(year, 'anniversaries')
    if (snapshot) {
      return c.json({
        source: snapshot.source || 'snapshot',
        items: Array.isArray(snapshot.items) ? snapshot.items : [],
        refreshedAt: snapshot.refreshed_at,
      })
    }

    const items = await fetchOperation('getAnniversaryInfo', year)
    return c.json({
      source: items ? 'api' : 'fallback',
      items: items || [],
    })
  } catch (error) {
    console.error('[calendar] anniversaries fetch failed:', error)
    return c.json({ source: 'fallback', items: [] })
  }
})

export default calendarRoutes
