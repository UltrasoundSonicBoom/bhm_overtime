import { Hono } from 'hono'
import { stream } from 'hono/streaming'
import postgres from 'postgres'
import 'dotenv/config'
import { retrieve, streamRagAnswer } from '../services/rag/index.js'

let _sql: ReturnType<typeof postgres> | null = null
function sql(): ReturnType<typeof postgres> {
  if (!_sql) _sql = postgres(process.env.DATABASE_URL!, { prepare: false })
  return _sql
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
  const sessionId = body.sessionId ?? `anon-${Date.now()}`
  const articleHint = body.articleHint?.trim() || undefined

  if (!question) return c.json({ error: 'question is required' }, 400)
  if (question.length > MAX_QUESTION) return c.json({ error: 'question too long' }, 400)
  if (!(await checkRateLimit(sessionId))) return c.json({ error: 'rate limit exceeded' }, 429)

  const results = await retrieve(question, 6)

  const s = sql()
  await s`
    INSERT INTO chat_history (session_id, role, content)
    VALUES (${sessionId}, 'user', ${question})
  `

  const result = streamRagAnswer({ question, results, articleHint })

  return stream(c, async (writer) => {
    let fullAnswer = ''
    for await (const delta of result.textStream) {
      fullAnswer += delta
      await writer.write(`data: ${JSON.stringify({ type: 'delta', text: delta })}\n\n`)
    }
    const sources = results.map((r) => ({
      title: r.articleTitle,
      ref: r.docId,
      score: r.score,
    }))
    await writer.write(`data: ${JSON.stringify({ type: 'done', sources })}\n\n`)

    await s`
      INSERT INTO chat_history (session_id, role, content, source_docs, model)
      VALUES (${sessionId}, 'assistant', ${fullAnswer}, ${s.json(sources)}, 'gpt-4o-mini')
    `
  })
})

export default route
