import type { IncomingMessage, ServerResponse } from 'http'

export const config = { api: { bodyParser: false } }

const API_BASE = 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService'

type CalendarItem = { name: string; date: string; isHoliday: boolean; dateKind: string }

async function fetchHolidayItems(year: number, serviceKey: string): Promise<CalendarItem[]> {
  const fetchOp = async (operation: string): Promise<CalendarItem[]> => {
    const url = new URL(`${API_BASE}/${operation}`)
    url.searchParams.set('ServiceKey', serviceKey)
    url.searchParams.set('solYear', String(year))
    url.searchParams.set('numOfRows', '100')
    url.searchParams.set('_type', 'json')

    const res = await fetch(url)
    if (!res.ok) throw new Error(`${operation} failed ${res.status}`)

    const data = await res.json() as {
      response?: { body?: { items?: { item?: unknown } } }
    }
    const raw = data?.response?.body?.items?.item
    if (!raw) return []
    const list = Array.isArray(raw) ? raw : [raw]
    return (list as Record<string, unknown>[]).map((item) => ({
      name: String(item.dateName ?? ''),
      date: String(item.locdate ?? ''),
      isHoliday: item.isHoliday === 'Y' || item.isHoliday === true,
      dateKind: String(item.dateKind ?? ''),
    }))
  }

  const [restDays, holiDays] = await Promise.all([fetchOp('getRestDeInfo'), fetchOp('getHoliDeInfo')])
  const merged = new Map<string, CalendarItem>()
  for (const item of [...restDays, ...holiDays]) {
    if (item.isHoliday !== false) merged.set(`${item.date}_${item.name}`, item)
  }
  return Array.from(merged.values())
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Vercel Cron은 Authorization: Bearer CRON_SECRET 헤더를 자동으로 추가
  const authHeader = (req.headers as Record<string, string>).authorization
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Unauthorized' }))
    return
  }

  const serviceKey = process.env.PUBLIC_DATA_API_KEY || process.env.DATA_GO_KR_SERVICE_KEY || ''
  const connectionString = process.env.DATABASE_URL
  if (!serviceKey || !connectionString) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Missing PUBLIC_DATA_API_KEY or DATABASE_URL' }))
    return
  }

  const { neon } = await import('@neondatabase/serverless')
  const sql = neon(connectionString)

  const currentYear = new Date().getFullYear()
  const years = [currentYear, currentYear + 1]
  const results: Record<number, { count: number; error?: string }> = {}

  for (const year of years) {
    try {
      const items = await fetchHolidayItems(year, serviceKey)
      await sql`
        INSERT INTO calendar_snapshots (year, kind, items, source, refreshed_at)
        VALUES (${year}, 'holidays', ${JSON.stringify(items)}::jsonb, 'cron', now())
        ON CONFLICT (year, kind)
        DO UPDATE SET
          items = EXCLUDED.items,
          source = EXCLUDED.source,
          refreshed_at = EXCLUDED.refreshed_at
      `
      results[year] = { count: items.length }
    } catch (err: unknown) {
      console.error(`[cron/calendar-refresh] year=${year} failed:`, err)
      results[year] = { count: 0, error: String((err as Error)?.message ?? err) }
    }
  }

  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ ok: true, refreshed: results }))
}
