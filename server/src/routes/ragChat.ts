import { Hono } from 'hono'
import { stream } from 'hono/streaming'
import postgres from 'postgres'
import { randomUUID } from 'node:crypto'
import 'dotenv/config'
import {
  retrieve,
  streamRagAnswer,
  getArticleByDocId,
  type RegulationArticle,
} from '../services/rag/index.js'

let _sql: ReturnType<typeof postgres> | null = null
function sql(): ReturnType<typeof postgres> {
  if (!_sql) _sql = postgres(process.env.DATABASE_URL!, { prepare: false })
  return _sql
}

// Strip implementation-internal fields from the article payload.
function pickArticle(a: RegulationArticle) {
  return {
    id: a.id,
    chapter: a.chapter,
    title: a.title,
    content: a.content,
    clauses: a.clauses,
    tables: a.tables,
    related_agreements: a.related_agreements,
  }
}

const route = new Hono()

const MAX_QUESTION = 2000
const RATE_LIMIT_PER_MIN = 20

async function checkRateLimit(sessionId: string): Promise<boolean> {
  const s = sql()
  const [row] = await s<{ cnt: number }[]>`
    SELECT count(*)::int AS cnt
    FROM chat_history
    WHERE session_id = ${sessionId}
      AND created_at > now() - interval '1 minute'
  `
  return (row?.cnt ?? 0) < RATE_LIMIT_PER_MIN
}

route.post('/', async (c) => {
  const body = await c.req.json<{ question: string; sessionId?: string; articleHint?: string }>()
  const question = (body.question ?? '').trim()
  const sessionId = body.sessionId ?? `anon-${randomUUID()}`
  const articleHint = body.articleHint?.trim() || undefined

  if (!question) return c.json({ error: 'question is required' }, 400)
  if (question.length > MAX_QUESTION) return c.json({ error: 'question too long' }, 400)
  if (!(await checkRateLimit(sessionId))) return c.json({ error: 'rate limit exceeded' }, 429)

  const results = await retrieve(question, 6)

  const s = sql()
  // Fire-and-forget user row so we don't block time-to-first-token.
  void s`
    INSERT INTO chat_history (session_id, role, content)
    VALUES (${sessionId}, 'user', ${question})
  `.catch((e) => console.error('chat_history user insert failed:', e))

  const result = streamRagAnswer({ question, results, articleHint })

  return stream(c, async (writer) => {
    let fullAnswer = ''
    try {
      for await (const delta of result.textStream) {
        fullAnswer += delta
        await writer.write(`data: ${JSON.stringify({ type: 'delta', text: delta })}\n\n`)
      }
      // Enrich sources with structured article data so the frontend can
      // inline-expand the original regulation text when the user clicks a chip.
      const sources = await Promise.all(
        results.map(async (r) => {
          const art = await getArticleByDocId(r.docId)
          return {
            title: r.articleTitle,
            ref: r.docId,
            score: r.score,
            kind: (r.metadata as { kind?: string } | null)?.kind ?? null,
            // Include the full article so the client can render content + clauses + tables.
            // Keep the payload small: omit embedding, metadata noise.
            article: art ? pickArticle(art) : null,
          }
        }),
      )
      await writer.write(`data: ${JSON.stringify({ type: 'done', sources })}\n\n`)

      void s`
        INSERT INTO chat_history (session_id, role, content, source_docs, model)
        VALUES (${sessionId}, 'assistant', ${fullAnswer}, ${s.json(sources)}, 'gpt-4o-mini')
      `.catch((e) => console.error('chat_history assistant insert failed:', e))
    } catch (err) {
      console.error('rag-chat stream error:', err)
      await writer.write(
        `data: ${JSON.stringify({ type: 'error', message: '응답 생성 중 오류가 발생했습니다.' })}\n\n`,
      )
    }
  })
})

export default route
