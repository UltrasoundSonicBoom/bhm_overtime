import { Hono } from 'hono'
import postgres from 'postgres'
import 'dotenv/config'
import { ragAnswer } from '../services/rag'
import { optionalAuth } from '../middleware/auth'

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })
const chatRoutes = new Hono()

// 세션별 rate limit — DB 기반 (서버리스 인스턴스 간 공유)
const RATE_LIMIT = 20 // 분당 최대 요청

async function checkRateLimit(sessionId: string): Promise<boolean> {
  const [row] = await sql`
    SELECT count(*)::int AS cnt
    FROM chat_history
    WHERE session_id = ${sessionId}
      AND created_at > now() - interval '1 minute'
  `
  return (row?.cnt ?? 0) < RATE_LIMIT
}

/**
 * POST /api/chat
 * Body: { message, sessionId }
 */
chatRoutes.post('/', optionalAuth, async (c) => {
  const body = await c.req.json<{ message: string; sessionId?: string }>()
  const { message, sessionId = `anon-${Date.now()}` } = body

  const MAX_MESSAGE_LENGTH = 2000
  if (!message?.trim()) {
    return c.json({ error: 'message is required' }, 400)
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return c.json({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} chars)` }, 400)
  }

  if (!(await checkRateLimit(sessionId))) {
    return c.json({ error: 'Rate limit exceeded (20/min)' }, 429)
  }

  const userId = (c as any).get('userId') as string | null

  // 사용자 메시지 저장
  await sql`
    INSERT INTO chat_history (user_id, session_id, role, content)
    VALUES (${userId}, ${sessionId}, 'user', ${message.trim()})
  `

  // RAG 답변 생성
  const result = await ragAnswer(message.trim(), sessionId)

  // 어시스턴트 답변 저장
  await sql`
    INSERT INTO chat_history (user_id, session_id, role, content, source_docs, model, token_usage)
    VALUES (
      ${userId},
      ${sessionId},
      'assistant',
      ${result.answer},
      ${sql.json(result.sources)},
      ${result.model},
      ${sql.json(result.tokenUsage || {})}
    )
  `

  return c.json({
    answer: result.answer,
    sources: result.sources,
    isFaqMatch: result.isFaqMatch,
    model: result.model,
  })
})

/**
 * GET /api/chat/history?sessionId=xxx
 */
chatRoutes.get('/history', optionalAuth, async (c) => {
  const sessionId = c.req.query('sessionId')
  if (!sessionId) {
    return c.json({ error: 'sessionId required' }, 400)
  }

  const userId = (c as any).get('userId') as string | null

  // 세션 격리: 인증 사용자는 본인 세션만, 비인증은 anon 세션만 조회
  const messages = userId
    ? await sql`
        SELECT role, content, source_docs, model, created_at
        FROM chat_history
        WHERE session_id = ${sessionId} AND user_id = ${userId}
        ORDER BY created_at ASC
      `
    : await sql`
        SELECT role, content, source_docs, model, created_at
        FROM chat_history
        WHERE session_id = ${sessionId} AND user_id IS NULL
        ORDER BY created_at ASC
      `

  return c.json({ messages })
})

export default chatRoutes
