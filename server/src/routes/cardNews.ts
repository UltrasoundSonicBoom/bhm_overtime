import { Hono } from 'hono'
import { generateCardNewsDecks, normalizeKeywords } from '../services/cardNews'

const cardNewsRoutes = new Hono()

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

export default cardNewsRoutes
