import type { Context, Next } from 'hono'
import postgres from 'postgres'
import 'dotenv/config'

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })

/**
 * JWT에서 user_id 추출 (optional — 없어도 통과)
 * Supabase JWT의 sub 필드가 user_id
 */
export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7)
      // Supabase JWT 디코딩 (base64 payload)
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString(),
      )
      c.set('userId', payload.sub || null)
    } catch {
      c.set('userId', null)
    }
  } else {
    c.set('userId', null)
  }
  await next()
}

/**
 * Admin 전용 미들웨어 — JWT 필수 + admin_users 테이블 확인
 */
export async function requireAdmin(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Authorization required' }, 401)
  }

  try {
    const token = authHeader.slice(7)
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString(),
    )
    const userId = payload.sub
    if (!userId) {
      return c.json({ error: 'Invalid token' }, 401)
    }

    const admins = await sql`
      SELECT role FROM admin_users
      WHERE user_id = ${userId} AND is_active = true
    `
    if (admins.length === 0) {
      return c.json({ error: 'Admin access required' }, 403)
    }

    c.set('userId', userId)
    c.set('adminRole', admins[0].role)
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }

  await next()
}
