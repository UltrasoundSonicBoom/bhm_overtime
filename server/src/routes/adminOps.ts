import { Hono } from 'hono'
import postgres from 'postgres'
import { requireAdmin } from '../middleware/auth'
import { canTransitionStatus, normalizeSlug } from '../services/admin-ops'

const adminOpsRoutes = new Hono()
const sql = postgres(process.env.DATABASE_URL!, { prepare: false })

type AdminContext = {
  userId: string | null
  adminRole: string | null
}

function getAdminContext(c: any): AdminContext {
  return {
    userId: c.get('userId') as string | null,
    adminRole: c.get('adminRole') as string | null,
  }
}

async function writeAuditLog(input: {
  actorUserId: string | null
  actorRole: string | null
  action: string
  entityType: string
  entityId: string
  diff?: Record<string, unknown>
}) {
  await sql`
    insert into audit_logs (
      actor_user_id,
      actor_role,
      action,
      entity_type,
      entity_id,
      diff
    )
    values (
      ${input.actorUserId},
      ${input.actorRole as any},
      ${input.action},
      ${input.entityType},
      ${input.entityId},
      ${sql.json((input.diff || {}) as any)}
    )
  `
}

adminOpsRoutes.use('*', requireAdmin)

adminOpsRoutes.get('/versions', async (c) => {
  const rows = await sql`
    select
      id,
      year,
      title,
      status,
      effective_date,
      source_files,
      created_at
    from regulation_versions
    order by year desc, id desc
  `

  return c.json({ results: rows })
})

adminOpsRoutes.post('/versions', async (c) => {
  const body = await c.req.json<{
    year: number
    title: string
    effectiveDate?: string | null
    sourceFiles?: string[]
  }>()

  const admin = getAdminContext(c)
  const [version] = await sql`
    insert into regulation_versions (
      year,
      title,
      status,
      effective_date,
      source_files,
      created_by
    )
    values (
      ${body.year},
      ${body.title.trim()},
      'draft',
      ${body.effectiveDate || null},
      ${sql.json(body.sourceFiles || [])},
      ${admin.userId}
    )
    returning *
  `

  await writeAuditLog({
    actorUserId: admin.userId,
    actorRole: admin.adminRole,
    action: 'regulation_version.created',
    entityType: 'regulation_version',
    entityId: String(version.id),
    diff: { after: version },
  })

  return c.json({ result: version }, 201)
})

adminOpsRoutes.patch('/versions/:id/status', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ status: 'draft' | 'active' | 'archived' }>()
  const admin = getAdminContext(c)

  const [current] = await sql`
    select id, status
    from regulation_versions
    where id = ${id}
    limit 1
  `
  if (!current) {
    return c.json({ error: 'Version not found' }, 404)
  }

  if (body.status === 'active') {
    await sql`
      update regulation_versions
      set status = 'archived'
      where status = 'active' and id <> ${id}
    `
  }

  const [updated] = await sql`
    update regulation_versions
    set status = ${body.status}
    where id = ${id}
    returning *
  `

  await writeAuditLog({
    actorUserId: admin.userId,
    actorRole: admin.adminRole,
    action: 'regulation_version.status_changed',
    entityType: 'regulation_version',
    entityId: String(id),
    diff: { before: current.status, after: updated.status },
  })

  return c.json({ result: updated })
})

adminOpsRoutes.get('/faqs', async (c) => {
  const versionId = Number(c.req.query('versionId'))

  if (!Number.isInteger(versionId)) {
    return c.json({ error: 'versionId is required' }, 400)
  }

  const rows = await sql`
    select
      id,
      version_id,
      category,
      question,
      answer,
      article_ref,
      sort_order,
      is_published
    from faq_entries
    where version_id = ${versionId}
    order by sort_order asc, id asc
  `

  return c.json({ results: rows })
})

adminOpsRoutes.post('/faqs', async (c) => {
  const body = await c.req.json<{
    versionId: number
    category: string
    question: string
    answer: string
    articleRef?: string | null
    sortOrder?: number
    isPublished?: boolean
  }>()
  const admin = getAdminContext(c)

  const [row] = await sql`
    insert into faq_entries (
      version_id,
      category,
      question,
      answer,
      article_ref,
      sort_order,
      is_published
    )
    values (
      ${body.versionId},
      ${body.category.trim()},
      ${body.question.trim()},
      ${body.answer.trim()},
      ${body.articleRef || null},
      ${body.sortOrder ?? 0},
      ${body.isPublished ?? false}
    )
    returning *
  `

  await writeAuditLog({
    actorUserId: admin.userId,
    actorRole: admin.adminRole,
    action: 'faq.created',
    entityType: 'faq_entry',
    entityId: String(row.id),
    diff: { after: row },
  })

  return c.json({ result: row }, 201)
})

adminOpsRoutes.put('/faqs/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{
    category: string
    question: string
    answer: string
    articleRef?: string | null
    sortOrder?: number
    isPublished?: boolean
  }>()
  const admin = getAdminContext(c)

  const [before] = await sql`select * from faq_entries where id = ${id} limit 1`
  if (!before) {
    return c.json({ error: 'FAQ not found' }, 404)
  }

  const [updated] = await sql`
    update faq_entries
    set
      category = ${body.category.trim()},
      question = ${body.question.trim()},
      answer = ${body.answer.trim()},
      article_ref = ${body.articleRef || null},
      sort_order = ${body.sortOrder ?? before.sort_order ?? 0},
      is_published = ${body.isPublished ?? before.is_published}
    where id = ${id}
    returning *
  `

  await writeAuditLog({
    actorUserId: admin.userId,
    actorRole: admin.adminRole,
    action: 'faq.updated',
    entityType: 'faq_entry',
    entityId: String(id),
    diff: { before, after: updated },
  })

  return c.json({ result: updated })
})

adminOpsRoutes.get('/content', async (c) => {
  const rows = await sql`
    select
      id,
      content_type,
      slug,
      title,
      status,
      current_revision_id,
      published_revision_id,
      metadata,
      created_at,
      updated_at
    from content_entries
    order by updated_at desc nulls last, id desc
  `

  return c.json({ results: rows })
})

adminOpsRoutes.post('/content', async (c) => {
  const body = await c.req.json<{
    contentType: 'policy' | 'faq' | 'notice' | 'landing' | 'dataset'
    title: string
    slug?: string
    body: string
    summary?: string
    metadata?: Record<string, unknown>
  }>()
  const admin = getAdminContext(c)
  const slug = normalizeSlug(body.slug || body.title)

  const result = await sql.begin(async (tx) => {
    const [entry] = await tx`
      insert into content_entries (
        content_type,
        slug,
        title,
        status,
        metadata,
        created_by,
        updated_by
      )
      values (
        ${body.contentType as any},
        ${slug},
        ${body.title.trim()},
        'draft',
        ${tx.json((body.metadata || {}) as any)},
        ${admin.userId},
        ${admin.userId}
      )
      returning *
    `

    const [revision] = await tx`
      insert into content_revisions (
        entry_id,
        revision_number,
        status,
        summary,
        body,
        metadata,
        created_by
      )
      values (
        ${entry.id},
        1,
        'draft',
        ${body.summary || null},
        ${body.body},
        ${tx.json((body.metadata || {}) as any)},
        ${admin.userId}
      )
      returning *
    `

    const [updatedEntry] = await tx`
      update content_entries
      set
        current_revision_id = ${revision.id},
        updated_at = now()
      where id = ${entry.id}
      returning *
    `

    return { entry: updatedEntry, revision }
  })

  await writeAuditLog({
    actorUserId: admin.userId,
    actorRole: admin.adminRole,
    action: 'content.created',
    entityType: 'content_entry',
    entityId: String(result.entry.id),
    diff: {
      after: {
        entry: result.entry,
        revision: result.revision,
      },
    },
  })

  return c.json({ result }, 201)
})

adminOpsRoutes.post('/content/:id/revisions', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{
    body: string
    summary?: string
    metadata?: Record<string, unknown>
  }>()
  const admin = getAdminContext(c)

  const [entry] = await sql`
    select id, current_revision_id, status
    from content_entries
    where id = ${id}
    limit 1
  `
  if (!entry) {
    return c.json({ error: 'Content entry not found' }, 404)
  }

  const [lastRevision] = await sql`
    select revision_number
    from content_revisions
    where entry_id = ${id}
    order by revision_number desc
    limit 1
  `

  const nextRevisionNumber = Number(lastRevision?.revision_number || 0) + 1
  const [revision] = await sql`
    insert into content_revisions (
      entry_id,
      revision_number,
      status,
      summary,
      body,
      metadata,
      created_by
    )
    values (
      ${id},
      ${nextRevisionNumber},
      'draft',
      ${body.summary || null},
      ${body.body},
      ${sql.json((body.metadata || {}) as any)},
      ${admin.userId}
    )
    returning *
  `

  const [updatedEntry] = await sql`
    update content_entries
    set
      current_revision_id = ${revision.id},
      updated_by = ${admin.userId},
      updated_at = now(),
      status = 'draft'
    where id = ${id}
    returning *
  `

  await writeAuditLog({
    actorUserId: admin.userId,
    actorRole: admin.adminRole,
    action: 'content.revision_created',
    entityType: 'content_entry',
    entityId: String(id),
    diff: { revisionId: revision.id, revisionNumber: nextRevisionNumber },
  })

  return c.json({ result: { entry: updatedEntry, revision } }, 201)
})

adminOpsRoutes.patch('/content/:id/status', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ status: 'draft' | 'review' | 'published' | 'archived' }>()
  const admin = getAdminContext(c)

  const [entry] = await sql`
    select *
    from content_entries
    where id = ${id}
    limit 1
  `
  if (!entry) {
    return c.json({ error: 'Content entry not found' }, 404)
  }

  if (!canTransitionStatus(entry.status, body.status)) {
    return c.json({ error: `Invalid status transition: ${entry.status} -> ${body.status}` }, 400)
  }

  const publishedRevisionId =
    body.status === 'published'
      ? entry.current_revision_id
      : entry.published_revision_id

  const [updated] = await sql`
    update content_entries
    set
      status = ${body.status},
      published_revision_id = ${publishedRevisionId},
      updated_by = ${admin.userId},
      updated_at = now()
    where id = ${id}
    returning *
  `

  if (entry.current_revision_id) {
    await sql`
      update content_revisions
      set status = ${body.status}
      where id = ${entry.current_revision_id}
    `
  }

  await writeAuditLog({
    actorUserId: admin.userId,
    actorRole: admin.adminRole,
    action: 'content.status_changed',
    entityType: 'content_entry',
    entityId: String(id),
    diff: { before: entry.status, after: updated.status },
  })

  return c.json({ result: updated })
})

adminOpsRoutes.post('/content/:id/request-review', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{ assignedTo?: string | null }>().catch(() => ({ assignedTo: null }))
  const admin = getAdminContext(c)

  const [entry] = await sql`
    select id, current_revision_id, status
    from content_entries
    where id = ${id}
    limit 1
  `
  if (!entry || !entry.current_revision_id) {
    return c.json({ error: 'Reviewable content entry not found' }, 404)
  }

  if (!canTransitionStatus(entry.status, 'review')) {
    return c.json({ error: `Invalid status transition: ${entry.status} -> review` }, 400)
  }

  const [task] = await sql`
    insert into approval_tasks (
      entry_id,
      revision_id,
      status,
      requested_by,
      assigned_to
    )
    values (
      ${id},
      ${entry.current_revision_id},
      'pending',
      ${admin.userId},
      ${body.assignedTo || null}
    )
    returning *
  `

  await sql`
    update content_entries
    set status = 'review', updated_by = ${admin.userId}, updated_at = now()
    where id = ${id}
  `

  await writeAuditLog({
    actorUserId: admin.userId,
    actorRole: admin.adminRole,
    action: 'content.review_requested',
    entityType: 'content_entry',
    entityId: String(id),
    diff: { approvalTaskId: task.id, revisionId: entry.current_revision_id },
  })

  return c.json({ result: task }, 201)
})

adminOpsRoutes.get('/approvals', async (c) => {
  const status = c.req.query('status')
  const rows = status
    ? await sql`
        select *
        from approval_tasks
        where status = ${status}
        order by created_at desc
      `
    : await sql`
        select *
        from approval_tasks
        order by created_at desc
      `

  return c.json({ results: rows })
})

adminOpsRoutes.post('/approvals/:id/decision', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{
    decision: 'approved' | 'rejected'
    note?: string
  }>()
  const admin = getAdminContext(c)

  const [task] = await sql`
    select *
    from approval_tasks
    where id = ${id}
    limit 1
  `
  if (!task) {
    return c.json({ error: 'Approval task not found' }, 404)
  }

  const [updatedTask] = await sql`
    update approval_tasks
    set
      status = ${body.decision},
      decision_note = ${body.note || null},
      decision_by = ${admin.userId},
      decided_at = now()
    where id = ${id}
    returning *
  `

  const nextStatus = body.decision === 'approved' ? 'published' : 'draft'
  await sql`
    update content_entries
    set
      status = ${nextStatus},
      published_revision_id = case when ${body.decision} = 'approved' then ${task.revision_id} else published_revision_id end,
      updated_by = ${admin.userId},
      updated_at = now()
    where id = ${task.entry_id}
  `

  if (task.revision_id) {
    await sql`
      update content_revisions
      set status = ${nextStatus}
      where id = ${task.revision_id}
    `
  }

  await writeAuditLog({
    actorUserId: admin.userId,
    actorRole: admin.adminRole,
    action: 'approval.decided',
    entityType: 'approval_task',
    entityId: String(id),
    diff: { decision: body.decision, note: body.note || null },
  })

  return c.json({ result: updatedTask })
})

adminOpsRoutes.get('/audit-logs', async (c) => {
  const entityType = c.req.query('entityType')
  const entityId = c.req.query('entityId')

  const rows =
    entityType && entityId
      ? await sql`
          select *
          from audit_logs
          where entity_type = ${entityType}
            and entity_id = ${entityId}
          order by created_at desc
        `
      : await sql`
          select *
          from audit_logs
          order by created_at desc
          limit 200
        `

  return c.json({ results: rows })
})

export default adminOpsRoutes
