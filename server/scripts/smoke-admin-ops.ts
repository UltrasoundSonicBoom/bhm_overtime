import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import postgres from 'postgres'

process.env.NODE_ENV = 'production'

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })

function makeAuthToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ sub: userId })).toString('base64url')
  return `smoke.${payload}.sig`
}

async function requestJson(
  app: { request: (input: string, init?: RequestInit) => Response | Promise<Response> },
  path: string,
  init: RequestInit & { token: string },
) {
  const response = await app.request(`http://local${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${init.token}`,
      ...(init.headers || {}),
    },
  })

  const text = await response.text()
  const body = text ? JSON.parse(text) : null

  return { response, body }
}

async function main() {
  const { default: app } = await import('../src/index')
  const adminUserId = randomUUID()
  const slug = `smoke-notice-${Date.now()}`
  const email = `${slug}@example.com`
  const token = makeAuthToken(adminUserId)

  let entryId: number | null = null
  let approvalTaskId: number | null = null

  await sql`
    insert into admin_users (user_id, email, role, is_active)
    values (${adminUserId}, ${email}, 'super_admin', true)
  `

  try {
    const dashboard = await requestJson(app, '/api/admin/dashboard', {
      method: 'GET',
      token,
    })
    assert.equal(dashboard.response.status, 200)
    assert.ok(dashboard.body?.result)

    const created = await requestJson(app, '/api/admin/content', {
      method: 'POST',
      token,
      body: JSON.stringify({
        contentType: 'notice',
        title: 'Smoke Admin Notice',
        slug,
        body: 'Track B smoke test body',
        summary: 'smoke summary',
        metadata: { source: 'smoke-admin-ops' },
      }),
    })
    assert.equal(created.response.status, 201)
    entryId = Number(created.body?.result?.entry?.id)
    assert.ok(entryId)

    const review = await requestJson(app, `/api/admin/content/${entryId}/request-review`, {
      method: 'POST',
      token,
      body: JSON.stringify({}),
    })
    assert.equal(review.response.status, 201)
    approvalTaskId = Number(review.body?.result?.id)
    assert.ok(approvalTaskId)

    const approved = await requestJson(app, `/api/admin/approvals/${approvalTaskId}/decision`, {
      method: 'POST',
      token,
      body: JSON.stringify({
        decision: 'approved',
        note: 'Smoke test approval',
      }),
    })
    assert.equal(approved.response.status, 200)

    const detail = await requestJson(app, `/api/admin/content/${entryId}`, {
      method: 'GET',
      token,
    })
    assert.equal(detail.response.status, 200)
    assert.equal(detail.body?.result?.entry?.status, 'published')
    assert.equal(
      detail.body?.result?.approvals?.[0]?.status,
      'approved',
    )
    assert.ok((detail.body?.result?.auditLogs || []).length >= 2)

    console.log(
      JSON.stringify(
        {
          ok: true,
          entryId,
          approvalTaskId,
          dashboard: dashboard.body?.result,
          finalStatus: detail.body?.result?.entry?.status,
          auditLogCount: detail.body?.result?.auditLogs?.length || 0,
        },
        null,
        2,
      ),
    )
  } finally {
    if (approvalTaskId) {
      await sql`
        delete from audit_logs
        where entity_type = 'approval_task'
          and entity_id = ${String(approvalTaskId)}
      `
    }

    if (entryId) {
      await sql`
        delete from audit_logs
        where entity_type = 'content_entry'
          and entity_id = ${String(entryId)}
      `
      await sql`delete from content_entries where id = ${entryId}`
    }

    await sql`delete from admin_users where user_id = ${adminUserId}`
  }
}

main()
  .catch((error) => {
    console.error(error?.stack || error?.message || error)
    process.exitCode = 1
  })
  .finally(async () => {
    await sql.end({ timeout: 1 })
  })
