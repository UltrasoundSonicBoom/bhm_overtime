import { Hono } from 'hono'
import { faqEntries } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { embed } from '../services/embedding'
import { db } from '../db/client'
import postgres from 'postgres'
import 'dotenv/config'

const sqlRaw = postgres(process.env.DATABASE_URL!, { prepare: false })

const faqRoutes = new Hono()

/**
 * GET /api/faq?category=온콜
 * FAQ 목록 (카테고리 필터)
 */
faqRoutes.get('/', async (c) => {
  const category = c.req.query('category')

  const conditions = [eq(faqEntries.isPublished, true)]
  if (category) {
    conditions.push(eq(faqEntries.category, category))
  }

  const rows = await db
    .select({
      id: faqEntries.id,
      category: faqEntries.category,
      question: faqEntries.question,
      answer: faqEntries.answer,
      articleRef: faqEntries.articleRef,
      sortOrder: faqEntries.sortOrder,
    })
    .from(faqEntries)
    .where(and(...conditions))
    .orderBy(faqEntries.sortOrder)

  return c.json({ results: rows })
})

/**
 * GET /api/faq/search?q=온콜수당
 * FAQ 시맨틱 검색 (pgvector cosine distance)
 */
faqRoutes.get('/search', async (c) => {
  const query = c.req.query('q')
  if (!query) {
    return c.json({ error: 'q parameter required' }, 400)
  }

  const queryEmbedding = await embed(query)
  const vecStr = `[${queryEmbedding.join(',')}]`

  const results = await sqlRaw`
    SELECT
      id,
      category,
      question,
      answer,
      article_ref,
      1 - (embedding <=> ${vecStr}::vector) as score
    FROM faq_entries
    WHERE embedding IS NOT NULL AND is_published = true
    ORDER BY embedding <=> ${vecStr}::vector
    LIMIT 5
  `

  return c.json({
    results: results.map((r: any) => ({
      id: r.id,
      category: r.category,
      question: r.question,
      answer: r.answer,
      articleRef: r.article_ref,
      score: Number(r.score),
    })),
  })
})

export default faqRoutes
