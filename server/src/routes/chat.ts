import { Hono } from 'hono'
import postgres from 'postgres'
import 'dotenv/config'
import { ragAnswer } from '../services/rag'
import { optionalAuth } from '../middleware/auth'

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })
const chatRoutes = new Hono()

// 세션별 rate limit (메모리 기반, 서버리스에서는 제한적)
const rateLimits = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 20 // 분당 최대 요청
const RATE_WINDOW = 60_000 // 1분

function checkRateLimit(sessionId: string): boolean {
  const now = Date.now()
  const entry = rateLimits.get(sessionId)
  if (!entry || now > entry.resetAt) {
    rateLimits.set(sessionId, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

/**
 * POST /api/chat
 * Body: { message, sessionId }
 */
chatRoutes.post('/', optionalAuth, async (c) => {
  const body = await c.req.json<{ message: string; sessionId?: string }>()
  const { message, sessionId = `anon-${Date.now()}` } = body

  if (!message?.trim()) {
    return c.json({ error: 'message is required' }, 400)
  }

  if (!checkRateLimit(sessionId)) {
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

  const messages = await sql`
    SELECT role, content, source_docs, model, created_at
    FROM chat_history
    WHERE session_id = ${sessionId}
    ORDER BY created_at ASC
  `

  return c.json({ messages })
})

export default chatRoutes
