import type { IncomingMessage, ServerResponse } from 'http'

export const config = { api: { bodyParser: false } }

const API_BASE = 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService'

type CalendarItem = { name: string; date: string; isHoliday: boolean; dateKind: string }

async function fetchOperation(operation: string, year: number, serviceKey: string): Promise<CalendarItem[]> {
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

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url!, `http://${(req.headers as Record<string, string>).host}`)
  const year = Number(url.searchParams.get('year'))

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Invalid year' }))
    return
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'DATABASE_URL missing' }))
    return
  }

  try {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(connectionString)

    // calendar_snapshots 먼저 확인
    const rows = await sql`
      SELECT items, source, refreshed_at
      FROM calendar_snapshots
      WHERE year = ${year} AND kind = 'holidays'
      LIMIT 1
    `

    if (rows.length > 0) {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400',
      })
      res.end(JSON.stringify({
        source: rows[0].source || 'snapshot',
        items: Array.isArray(rows[0].items) ? rows[0].items : [],
        refreshedAt: rows[0].refreshed_at,
      }))
      return
    }

    // 스냅샷 없으면 서버에서 직접 fetch
    const serviceKey = process.env.PUBLIC_DATA_API_KEY || process.env.DATA_GO_KR_SERVICE_KEY || ''
    if (!serviceKey) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' })
      res.end(JSON.stringify({ source: 'fallback', items: [] }))
      return
    }

    const [restDays, holiDays] = await Promise.all([
      fetchOperation('getRestDeInfo', year, serviceKey).catch(() => [] as CalendarItem[]),
      fetchOperation('getHoliDeInfo', year, serviceKey).catch(() => [] as CalendarItem[]),
    ])

    const merged = new Map<string, CalendarItem>()
    for (const item of [...restDays, ...holiDays]) {
      if (item.isHoliday !== false) merged.set(`${item.date}_${item.name}`, item)
    }
    const items = Array.from(merged.values())

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=86400',
    })
    res.end(JSON.stringify({ source: 'api', items }))
  } catch (err: unknown) {
    console.error('[holidays] error:', err)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: String((err as Error)?.message ?? err) }))
  }
}
