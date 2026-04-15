import type { Context, Next } from 'hono'
import postgres from 'postgres'
import { jwtVerify } from 'jose'
import 'dotenv/config'

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })

// Supabase JWT secret — HS256 서명 검증에 사용
// SUPABASE_JWT_SECRET 환경변수가 없으면 서명 미검증 모드로 동작 (개발 환경 한정)
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET
  ? new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET)
  : null

/**
 * Supabase JWT를 검증하고 payload를 반환한다.
 * SUPABASE_JWT_SECRET이 없으면 서명 미검증으로 base64 디코딩만 수행.
 * 검증 실패 시 null 반환.
 */
async function verifyJwt(token: string): Promise<{ sub?: string } | null> {
  if (JWT_SECRET) {
    try {
      // jose v5+: Uint8Array는 직접 secret으로 사용 가능 (HS256)
      const { payload } = await jwtVerify(token, JWT_SECRET, {
        algorithms: ['HS256'],
      })
      return payload as { sub?: string }
    } catch {
      return null
    }
  }

  // 개발 환경: 서명 미검증 (production에서는 SUPABASE_JWT_SECRET 반드시 설정)
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    // base64url → base64 변환 후 파싱
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/') + '=='.slice((parts[1].length % 4) || 4)
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8')) as { sub?: string }
  } catch {
    return null
  }
}

/**
 * JWT에서 user_id 추출 (optional — 없어도 통과)
 * Supabase JWT의 sub 필드가 user_id
 */
export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const payload = await verifyJwt(token)
    c.set('userId', payload?.sub ?? null)
  } else {
    c.set('userId', null)
  }
  await next()
}

/**
 * Admin 전용 미들웨어 — JWT 필수 + 서명 검증 + admin_users 테이블 확인
 */
export async function requireAdmin(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Authorization required' }, 401)
  }

  const token = authHeader.slice(7)
  const payload = await verifyJwt(token)

  if (!payload?.sub) {
    return c.json({ error: 'Invalid token' }, 401)
  }

  const userId = payload.sub

  try {
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
    return c.json({ error: 'Server error during auth' }, 500)
  }

  await next()
}
