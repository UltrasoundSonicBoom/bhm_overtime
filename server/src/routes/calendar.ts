import { Hono } from 'hono'

const calendarRoutes = new Hono()

const API_BASE = 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService'
const DEFAULT_API_KEY = '590ecdf5a2e2ea517c853271d834f47f0d0cef966ec408e467106f063aa49e2c'

type CalendarItem = {
  name: string
  date: string
  isHoliday: boolean
  dateKind: string
}

const getServiceKey = () =>
  process.env.PUBLIC_DATA_API_KEY ||
  process.env.DATA_GO_KR_SERVICE_KEY ||
  DEFAULT_API_KEY

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
