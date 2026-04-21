import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { Context, Next } from 'hono'
import 'dotenv/config'

const NEON_AUTH_BASE_URL = process.env.NEON_AUTH_BASE_URL

const JWKS = NEON_AUTH_BASE_URL
  ? createRemoteJWKSet(new URL(`${NEON_AUTH_BASE_URL}/.well-known/jwks.json`))
  : null

async function verifyJwt(token: string): Promise<{ sub?: string; email?: string } | null> {
  if (JWKS) {
    try {
      const { payload } = await jwtVerify(token, JWKS)
      return payload as { sub?: string; email?: string }
    } catch {
      return null
    }
  }
  // NEON_AUTH_BASE_URL 미설정 시: base64 디코딩만 (로컬 개발 한정)
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    return payload
  } catch {
    return null
  }
}

export async function optionalAuth(c: Context, next: Next) {
  const token = c.req.header('Authorization')?.slice(7)
  if (token) {
    const payload = await verifyJwt(token)
    c.set('userId', payload?.sub ?? null)
  } else {
    c.set('userId', null)
  }
  await next()
}

export async function requireAdmin(c: Context, next: Next) {
  const token = c.req.header('Authorization')?.slice(7)
  if (!token) return c.json({ error: 'Unauthorized' }, 401)
  const payload = await verifyJwt(token)
  if (!payload?.sub) return c.json({ error: 'Unauthorized' }, 401)

  const { db } = await import('../db/client')
  const { adminUsers } = await import('../db/schema')
  const { or, eq } = await import('drizzle-orm')

  const [admin] = await db.select().from(adminUsers).where(
    or(eq(adminUsers.userId, payload.sub as any), eq(adminUsers.email, payload.email ?? ''))
  )
  if (!admin) return c.json({ error: 'Forbidden' }, 403)

  c.set('userId', admin.userId)
  await next()
}
