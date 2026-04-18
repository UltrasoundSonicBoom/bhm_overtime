import { Hono } from 'hono'
import { generateCardNewsDecks, normalizeKeywords, summarizeArticle } from '../services/cardNews'

const cardNewsRoutes = new Hono()

// SSRF 방어: https만 허용, private IP 차단
function isSafeUrl(raw: string): boolean {
  let parsed: URL
  try { parsed = new URL(raw) } catch { return false }
  if (parsed.protocol !== 'https:') return false
  const h = parsed.hostname
  if (
    h === 'localhost' ||
    h.endsWith('.local') ||
    /^(127\.|10\.|0\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(h) ||
    h === '::1' || h === '[::1]'
  ) return false
  return true
}

async function resolveKeywords(requestBody: unknown, queryValue: string | undefined): Promise<string[]> {
  if (Array.isArray((requestBody as Record<string, unknown> | null)?.keywords)) {
    return normalizeKeywords(
      ((requestBody as Record<string, unknown>).keywords as unknown[]).map((item) => String(item || '')),
    )
  }

  if (typeof (requestBody as Record<string, unknown> | null)?.keywords === 'string') {
    return normalizeKeywords([String((requestBody as Record<string, unknown>).keywords || '')])
  }

  if (queryValue) {
    return normalizeKeywords([queryValue])
  }

  return []
}

cardNewsRoutes.get('/', async (c) => {
  const keywords = await resolveKeywords(null, c.req.query('keywords'))
  if (!keywords.length) {
    return c.json({ error: 'keywords is required' }, 400)
  }

  const decks = await generateCardNewsDecks(keywords)
  return c.json({
    decks,
    generatedAt: new Date().toISOString(),
  })
})

cardNewsRoutes.post('/', async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}))
  const keywords = await resolveKeywords(body, c.req.query('keywords'))

  if (!keywords.length) {
    return c.json({ error: 'keywords is required' }, 400)
  }

  const decks = await generateCardNewsDecks(keywords)
  return c.json({
    decks,
    generatedAt: new Date().toISOString(),
  })
})

cardNewsRoutes.post('/resolve', async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}))
  const url = String(body.url || '').trim()
  if (!url) {
    return c.json({ error: 'url is required' }, 400)
  }
  if (!isSafeUrl(url)) {
    return c.json({ error: 'Invalid or disallowed URL' }, 400)
  }

  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SNUHMateCardNews/1.0; +https://snuhmate.com)',
      },
    })
    return c.json({ url, finalUrl: res.url || url })
  } catch {
    return c.json({ url, finalUrl: url })
  }
})

cardNewsRoutes.post('/summarize', async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}))
  const url = String(body.url || '').trim()
  const title = String(body.title || '').trim()
  const fallbackText = String(body.fallbackText || body.summary || '').trim()

  if (!url) {
    return c.json({ error: 'url is required' }, 400)
  }
  if (!isSafeUrl(url)) {
    return c.json({ error: 'Invalid or disallowed URL' }, 400)
  }

  const result = await summarizeArticle(url, title || undefined, fallbackText || undefined)
  return c.json(result)
})

export default cardNewsRoutes
