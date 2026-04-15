/**
 * Task E2: AI 이력서 생성 엔드포인트
 *
 * POST /api/resume
 *   - 로그인 필수 (Supabase JWT)
 *   - 월 1회 제한 (user_resume_usage.resume_generated_at)
 *   - Body: { workHistory: WorkEntry[] }
 *   - 응답: { markdown: string, generatedAt: string }
 */

import { Hono } from 'hono'
import postgres from 'postgres'
import OpenAI from 'openai'
import { optionalAuth } from '../middleware/auth'

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const resumeRoutes = new Hono()

interface WorkEntry {
  dept: string
  from: string      // YYYY-MM
  to: string        // YYYY-MM or ''
  role?: string
  desc?: string
}

function isSameYearMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function formatWorkHistory(items: WorkEntry[]): string {
  if (!items.length) return '(근무이력 없음)'
  return items
    .map((e) => {
      const period = e.to ? `${e.from} ~ ${e.to}` : `${e.from} ~ 현재`
      const role = e.role ? ` / 직무: ${e.role}` : ''
      const desc = e.desc ? `\n  주요역할: ${e.desc}` : ''
      return `- ${e.dept} (${period})${role}${desc}`
    })
    .join('\n')
}

/**
 * POST /api/resume
 */
resumeRoutes.post('/', optionalAuth, async (c) => {
  const userId = (c as any).get('userId') as string | null
  if (!userId) {
    return c.json({ error: '로그인 후 이용 가능합니다' }, 401)
  }

  let body: { workHistory?: WorkEntry[] }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const workHistory = body.workHistory
  if (!Array.isArray(workHistory) || workHistory.length === 0) {
    return c.json({ error: '근무이력이 없습니다. 프로필 탭에서 먼저 근무이력을 추가해주세요.' }, 400)
  }

  // ── 월 1회 제한 확인 ──────────────────────────────────────────────────────
  const [usageRow] = await sql<{ resume_generated_at: Date | null }[]>`
    SELECT resume_generated_at
    FROM user_resume_usage
    WHERE user_id = ${userId}
    LIMIT 1
  `

  const now = new Date()
  if (usageRow?.resume_generated_at) {
    const lastGenerated = new Date(usageRow.resume_generated_at)
    if (isSameYearMonth(lastGenerated, now)) {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const nextDate = `${nextMonth.getFullYear()}년 ${nextMonth.getMonth() + 1}월 1일`
      return c.json({
        error: '이번 달 생성 횟수를 모두 사용했어요.',
        nextAvailableAt: nextDate,
        limitExceeded: true,
      }, 429)
    }
  }

  // ── OpenAI gpt-4o-mini 호출 ───────────────────────────────────────────────
  const historyText = formatWorkHistory(workHistory)

  let markdown: string
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 한국 의료계 종사자의 이력서를 작성하는 전문가입니다.
입력받은 근무이력을 바탕으로 자연스럽고 전문적인 한국어 이력서를 마크다운 형식으로 작성해주세요.

형식 요구사항:
- # 제목 없이 ## 섹션부터 시작
- ## 경력 요약 (3-4줄 서술형)
- ## 주요 경력 (각 직책별 기간, 부서, 주요 업무/성과)
- ## 핵심 역량 (글머리 기호로 3-5가지)
- 병원명/기관명을 제외한 개인정보(이름, 연락처 등)는 포함하지 않음
- 전문적이고 간결한 표현 사용`,
        },
        {
          role: 'user',
          content: `다음 근무이력을 바탕으로 이력서를 작성해주세요:\n\n${historyText}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    })

    markdown = response.choices[0]?.message?.content ?? ''
    if (!markdown) throw new Error('Empty response from OpenAI')
  } catch (err) {
    console.error('[resume] OpenAI error:', err)
    return c.json({
      error: 'AI 생성에 실패했어요. 근무이력을 바탕으로 직접 작성하시겠어요?',
      fallback: true,
    }, 500)
  }

  // ── 사용 기록 upsert ─────────────────────────────────────────────────────
  await sql`
    INSERT INTO user_resume_usage (user_id, resume_generated_at)
    VALUES (${userId}, ${now.toISOString()})
    ON CONFLICT (user_id) DO UPDATE
      SET resume_generated_at = ${now.toISOString()}
  `

  return c.json({ markdown, generatedAt: now.toISOString() })
})

export default resumeRoutes
