import { Hono } from 'hono'
import postgres from 'postgres'
import { requireAdmin } from '../middleware/auth'
import {
  canRequestReview,
  canTransitionStatus,
  normalizeSlug,
  resolveApprovalDecision,
} from '../services/admin-ops'

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

adminOpsRoutes.get('/dashboard', async (c) => {
  const [versionCounts] = await sql`
    select
      count(*)::int as total_versions,
      count(*) filter (where status = 'active')::int as active_versions,
      count(*) filter (where status = 'draft')::int as draft_versions
    from regulation_versions
  `
  const [contentCounts] = await sql`
    select
      count(*)::int as total_content_entries,
      count(*) filter (where status = 'review')::int as review_entries,
      count(*) filter (where status = 'published')::int as published_entries
    from content_entries
  `
  const [approvalCounts] = await sql`
    select
      count(*)::int as total_approvals,
      count(*) filter (where status = 'pending')::int as pending_approvals
    from approval_tasks
  `
  const [auditCounts] = await sql`
    select count(*)::int as total_audit_logs
    from audit_logs
  `

  return c.json({
    result: {
      ...versionCounts,
      ...contentCounts,
      ...approvalCounts,
      ...auditCounts,
    },
  })
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

adminOpsRoutes.post('/versions/:id/duplicate', async (c) => {
  const id = Number(c.req.param('id'))
  const admin = getAdminContext(c)

  const [source] = await sql`
    select * from regulation_versions where id = ${id} limit 1
  `
  if (!source) {
    return c.json({ error: 'Source version not found' }, 404)
  }

  const [newVersion] = await sql`
    insert into regulation_versions (
      year,
      title,
      status,
      effective_date,
      source_files,
      created_by
    )
    values (
      ${source.year + 1},
      ${`${source.title} (복제)`},
      'draft',
      ${null},
      ${sql.json(source.source_files || [])},
      ${admin.userId}
    )
    returning *
  `

  // Copy FAQ entries from the source version
  const sourceFaqs = await sql`
    select category, question, answer, article_ref, sort_order, is_published
    from faq_entries
    where version_id = ${id}
    order by sort_order asc, id asc
  `

  for (const faq of sourceFaqs) {
    await sql`
      insert into faq_entries (
        version_id, category, question, answer, article_ref, sort_order, is_published
      )
      values (
        ${newVersion.id},
        ${faq.category},
        ${faq.question},
        ${faq.answer},
        ${faq.article_ref},
        ${faq.sort_order},
        false
      )
    `
  }

  await writeAuditLog({
    actorUserId: admin.userId,
    actorRole: admin.adminRole,
    action: 'regulation_version.duplicated',
    entityType: 'regulation_version',
    entityId: String(newVersion.id),
    diff: { sourceVersionId: id, copiedFaqCount: sourceFaqs.length },
  })

  return c.json({ result: newVersion }, 201)
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

adminOpsRoutes.get('/content/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const [entry] = await sql`
    select *
    from content_entries
    where id = ${id}
    limit 1
  `

  if (!entry) {
    return c.json({ error: 'Content entry not found' }, 404)
  }

  const [revisions, approvals, auditLogs] = await Promise.all([
    sql`
      select *
      from content_revisions
      where entry_id = ${id}
      order by revision_number desc
    `,
    sql`
      select *
      from approval_tasks
      where entry_id = ${id}
      order by created_at desc
    `,
    sql`
      select *
      from audit_logs
      where entity_type = 'content_entry'
        and entity_id = ${String(id)}
      order by created_at desc
      limit 50
    `,
  ])

  return c.json({
    result: {
      entry,
      revisions,
      approvals,
      auditLogs,
    },
  })
})

adminOpsRoutes.get('/content/:id/revisions', async (c) => {
  const id = Number(c.req.param('id'))
  const [entry] = await sql`
    select id
    from content_entries
    where id = ${id}
    limit 1
  `

  if (!entry) {
    return c.json({ error: 'Content entry not found' }, 404)
  }

  const revisions = await sql`
    select *
    from content_revisions
    where entry_id = ${id}
    order by revision_number desc
  `

  return c.json({ results: revisions })
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

  const [pendingCountRow] = await sql`
    select count(*)::int as pending_count
    from approval_tasks
    where entry_id = ${id}
      and revision_id = ${entry.current_revision_id}
      and status = 'pending'
  `

  const pendingApprovalCount = Number(pendingCountRow?.pending_count || 0)

  if (
    !canRequestReview({
      status: entry.status,
      currentRevisionId: entry.current_revision_id,
      pendingApprovalCount,
    })
  ) {
    const message =
      pendingApprovalCount > 0
        ? 'Approval already pending for current revision'
        : `Invalid status transition: ${entry.status} -> review`
    return c.json({ error: message }, pendingApprovalCount > 0 ? 409 : 400)
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

  await sql`
    update content_revisions
    set status = 'review'
    where id = ${entry.current_revision_id}
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
  // content_type, title, status를 JOIN으로 함께 반환하여 클라이언트 N+1 호출을 방지
  const rows = status
    ? await sql`
        select
          at.*,
          ce.title        as entry_title,
          ce.content_type as entry_content_type,
          ce.status       as entry_status,
          cr.body         as revision_body_preview
        from approval_tasks at
        left join content_entries ce on ce.id = at.entry_id
        left join content_revisions cr on cr.id = at.revision_id
        where at.status = ${status}
        order by at.created_at desc
      `
    : await sql`
        select
          at.*,
          ce.title        as entry_title,
          ce.content_type as entry_content_type,
          ce.status       as entry_status,
          cr.body         as revision_body_preview
        from approval_tasks at
        left join content_entries ce on ce.id = at.entry_id
        left join content_revisions cr on cr.id = at.revision_id
        order by at.created_at desc
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

  if (task.status !== 'pending') {
    return c.json({ error: 'Approval task already decided' }, 409)
  }

  const [entry] = await sql`
    select id, published_revision_id
    from content_entries
    where id = ${task.entry_id}
    limit 1
  `
  if (!entry) {
    return c.json({ error: 'Content entry not found' }, 404)
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

  const outcome = resolveApprovalDecision({
    decision: body.decision,
    currentRevisionId: task.revision_id,
    existingPublishedRevisionId: entry.published_revision_id ?? null,
  })

  await sql`
    update content_entries
    set
      status = ${outcome.entryStatus},
      published_revision_id = ${outcome.publishedRevisionId},
      updated_by = ${admin.userId},
      updated_at = now()
    where id = ${task.entry_id}
  `

  if (task.revision_id) {
    await sql`
      update content_revisions
      set status = ${outcome.revisionStatus}
      where id = ${task.revision_id}
    `
  }

  if (outcome.closeOtherPendingTasks) {
    await sql`
      update approval_tasks
      set
        status = 'cancelled',
        decision_note = 'Superseded by final decision on the same revision',
        decision_by = ${admin.userId},
        decided_at = now()
      where entry_id = ${task.entry_id}
        and revision_id = ${task.revision_id}
        and status = 'pending'
        and id <> ${id}
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

adminOpsRoutes.get('/regulation-rules', async (c) => {
  const versionId = Number(c.req.query('versionId'))
  const ruleType = c.req.query('ruleType')

  if (!Number.isInteger(versionId)) {
    return c.json({ error: 'versionId is required' }, 400)
  }

  const rows = ruleType
    ? await sql`
        select
          id,
          version_id,
          rule_type,
          rule_key,
          rule_data,
          rule_scope,
          description
        from calculation_rules
        where version_id = ${versionId}
          and rule_type = ${ruleType}
        order by id asc
      `
    : await sql`
        select
          id,
          version_id,
          rule_type,
          rule_key,
          rule_data,
          rule_scope,
          description
        from calculation_rules
        where version_id = ${versionId}
        order by id asc
      `

  return c.json({ results: rows })
})

adminOpsRoutes.post('/regulation-rules', async (c) => {
  const body = await c.req.json<{
    versionId: number
    ruleType: string
    ruleKey: string
    ruleData: unknown
    ruleScope?: string
    description?: string
  }>()
  const admin = getAdminContext(c)

  const [row] = await sql`
    insert into calculation_rules (
      version_id,
      rule_type,
      rule_key,
      rule_data,
      rule_scope,
      description
    )
    values (
      ${body.versionId},
      ${body.ruleType},
      ${body.ruleKey},
      ${sql.json(body.ruleData as any)},
      ${body.ruleScope || null},
      ${body.description || null}
    )
    returning *
  `

  await writeAuditLog({
    actorUserId: admin.userId,
    actorRole: admin.adminRole,
    action: 'regulation_rule.created',
    entityType: 'regulation_rule',
    entityId: String(row.id),
    diff: { after: row },
  })

  return c.json({ result: row }, 201)
})

adminOpsRoutes.put('/regulation-rules/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{
    ruleType?: string
    ruleKey?: string
    ruleData?: unknown
    ruleScope?: string
    description?: string
  }>()
  const admin = getAdminContext(c)

  const [before] = await sql`
    select * from calculation_rules where id = ${id} limit 1
  `
  if (!before) {
    return c.json({ error: 'Regulation rule not found' }, 404)
  }

  const [updated] = await sql`
    update calculation_rules
    set
      rule_type = ${body.ruleType || before.rule_type},
      rule_key = ${body.ruleKey || before.rule_key},
      rule_data = ${sql.json((body.ruleData ?? before.rule_data) as any)},
      rule_scope = ${body.ruleScope !== undefined ? body.ruleScope : before.rule_scope},
      description = ${body.description !== undefined ? body.description : before.description}
    where id = ${id}
    returning *
  `

  await writeAuditLog({
    actorUserId: admin.userId,
    actorRole: admin.adminRole,
    action: 'regulation_rule.updated',
    entityType: 'regulation_rule',
    entityId: String(id),
    diff: { before, after: updated },
  })

  return c.json({ result: updated })
})

// ── Track D: 연도별 규정 버전 관리 API ────────────────────────────────────────

// GET /admin/rule-versions — 버전 목록
adminOpsRoutes.get('/rule-versions', requireAdmin, async (c) => {
  const rows = await sql`
    select id, version, effective_from, effective_to, is_active, change_note, created_at
    from rule_versions
    order by effective_from desc
  `
  return c.json({ versions: rows })
})

// POST /admin/rule-versions — 신규 버전 생성
adminOpsRoutes.post('/rule-versions', requireAdmin, async (c) => {
  const admin = getAdminContext(c)
  const body = await c.req.json<{
    version: string
    effectiveFrom: string
    effectiveTo?: string
    changeNote?: string
    copyFromVersionId?: number
  }>()

  if (!body.version || !body.effectiveFrom) {
    return c.json({ error: 'version과 effectiveFrom은 필수입니다' }, 400)
  }

  const [created] = await sql`
    insert into rule_versions (version, effective_from, effective_to, is_active, change_note, created_by)
    values (
      ${body.version},
      ${body.effectiveFrom},
      ${body.effectiveTo ?? null},
      false,
      ${body.changeNote ?? null},
      ${admin.userId}
    )
    returning *
  `

  // copyFromVersionId가 있으면 해당 버전의 entries를 복사
  if (body.copyFromVersionId) {
    await sql`
      insert into rule_entries (version_id, category, key, value_json, changed_by)
      select ${created.id}, category, key, value_json, ${admin.userId}
      from rule_entries
      where version_id = ${body.copyFromVersionId}
    `
  }

  await writeAuditLog({
    actorUserId: admin.userId,
    actorRole: admin.adminRole,
    action: 'rule_version.created',
    entityType: 'rule_version',
    entityId: String(created.id),
    diff: { created },
  })

  return c.json({ result: created }, 201)
})

// POST /admin/rule-versions/simulate — 두 버전 간 급여 시뮬레이션용 ruleSet 반환
adminOpsRoutes.post('/rule-versions/simulate', requireAdmin, async (c) => {
  const body = await c.req.json<{ fromVersionId: number; toVersionId: number }>()
  const fromId = Number(body.fromVersionId)
  const toId = Number(body.toVersionId)
  if (isNaN(fromId) || isNaN(toId)) {
    return c.json({ error: 'fromVersionId, toVersionId 필수' }, 400)
  }

  const [fromEntries, toEntries, fromRows, toRows] = await Promise.all([
    sql`SELECT category, key, value_json FROM rule_entries WHERE version_id = ${fromId}`,
    sql`SELECT category, key, value_json FROM rule_entries WHERE version_id = ${toId}`,
    sql`SELECT version FROM rule_versions WHERE id = ${fromId}`,
    sql`SELECT version FROM rule_versions WHERE id = ${toId}`,
  ])

  function buildRuleSet(entries: { category: string; key: string; value_json: unknown }[]) {
    const rs: Record<string, any> = {}
    for (const entry of entries) {
      if (!rs[entry.category]) rs[entry.category] = {}
      const parts = String(entry.key).split('.')
      let cur = rs[entry.category]
      for (let i = 0; i < parts.length - 1; i++) {
        if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) cur[parts[i]] = {}
        cur = cur[parts[i]]
      }
      cur[parts[parts.length - 1]] = entry.value_json
    }
    return rs
  }

  return c.json({
    fromRuleSet: buildRuleSet(fromEntries as any),
    toRuleSet: buildRuleSet(toEntries as any),
    fromVersion: (fromRows[0] as any)?.version ?? String(fromId),
    toVersion: (toRows[0] as any)?.version ?? String(toId),
  })
})

// PUT /admin/rule-versions/:id/activate — 버전 활성화 (기존 active는 해제)
adminOpsRoutes.put('/rule-versions/:id/activate', requireAdmin, async (c) => {
  const admin = getAdminContext(c)
  const id = Number(c.req.param('id'))
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400)

  const [target] = await sql`select * from rule_versions where id = ${id}`
  if (!target) return c.json({ error: '버전을 찾을 수 없습니다' }, 404)

  // 기존 active 해제 후 새 버전 활성화 (트랜잭션 없음 — 단일 문장 두 개)
  await sql`update rule_versions set is_active = false where is_active = true`
  const [activated] = await sql`
    update rule_versions set is_active = true where id = ${id} returning *
  `

  await writeAuditLog({
    actorUserId: admin.userId,
    actorRole: admin.adminRole,
    action: 'rule_version.activated',
    entityType: 'rule_version',
    entityId: String(id),
    diff: { before: target, after: activated },
  })

  return c.json({ result: activated })
})

// GET /admin/rule-versions/:id/entries — 버전 내 항목 목록 (category 필터 가능)
adminOpsRoutes.get('/rule-versions/:id/entries', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'))
  const category = c.req.query('category')
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400)

  const rows = category
    ? await sql`select * from rule_entries where version_id = ${id} and category = ${category} order by key`
    : await sql`select * from rule_entries where version_id = ${id} order by category, key`

  return c.json({ entries: rows })
})

// PUT /admin/rule-versions/:id/entries/:entryId — 항목 값 수정
adminOpsRoutes.put('/rule-versions/:id/entries/:entryId', requireAdmin, async (c) => {
  const admin = getAdminContext(c)
  const versionId = Number(c.req.param('id'))
  const entryId = Number(c.req.param('entryId'))
  if (isNaN(versionId) || isNaN(entryId)) return c.json({ error: 'Invalid id' }, 400)

  const body = await c.req.json<{ valueJson: unknown }>()
  if (body.valueJson === undefined) return c.json({ error: 'valueJson은 필수입니다' }, 400)

  const [before] = await sql`
    select * from rule_entries where id = ${entryId} and version_id = ${versionId}
  `
  if (!before) return c.json({ error: '항목을 찾을 수 없습니다' }, 404)

  const [updated] = await sql`
    update rule_entries
    set value_json = ${sql.json(body.valueJson as any)},
        changed_by = ${admin.userId},
        updated_at = now()
    where id = ${entryId}
    returning *
  `

  await writeAuditLog({
    actorUserId: admin.userId,
    actorRole: admin.adminRole,
    action: 'rule_entry.updated',
    entityType: 'rule_entry',
    entityId: String(entryId),
    diff: { before, after: updated },
  })

  return c.json({ result: updated })
})

// GET /admin/rule-versions/diff?from=&to= — 두 버전 간 diff
adminOpsRoutes.get('/rule-versions/diff', requireAdmin, async (c) => {
  const fromId = Number(c.req.query('from'))
  const toId = Number(c.req.query('to'))
  if (isNaN(fromId) || isNaN(toId)) return c.json({ error: 'from, to 파라미터 필요' }, 400)

  const fromEntries = await sql`
    select key, value_json from rule_entries where version_id = ${fromId} order by key
  `
  const toEntries = await sql`
    select key, value_json from rule_entries where version_id = ${toId} order by key
  `

  const fromMap = new Map(fromEntries.map((e: any) => [e.key, e.value_json]))
  const toMap = new Map(toEntries.map((e: any) => [e.key, e.value_json]))
  const allKeys = new Set([...fromMap.keys(), ...toMap.keys()])

  const diff: { key: string; type: 'added' | 'removed' | 'changed'; from?: unknown; to?: unknown }[] = []
  for (const key of allKeys) {
    const f = fromMap.get(key)
    const t = toMap.get(key)
    if (f === undefined) diff.push({ key, type: 'added', to: t })
    else if (t === undefined) diff.push({ key, type: 'removed', from: f })
    else if (JSON.stringify(f) !== JSON.stringify(t)) diff.push({ key, type: 'changed', from: f, to: t })
  }

  return c.json({ fromId, toId, diff })
})

// ── Track D5: 연도별 아카이브 조회 API ────────────────────────────────────────

// GET /admin/yearly-archives?year= — 연도별 아카이브 요약 목록
adminOpsRoutes.get('/yearly-archives', requireAdmin, async (c) => {
  const yearParam = c.req.query('year')
  const yearFilter = yearParam ? Number(yearParam) : null

  let rows
  if (yearFilter && !isNaN(yearFilter)) {
    rows = await sql`
      select id, user_id, year, rule_version, archived_at,
             summary_json->>'totalOvertimeHours' as total_overtime_hours,
             summary_json->>'totalAllowances' as total_allowances,
             summary_json->>'payslipCount' as payslip_count
      from yearly_archives
      where year = ${yearFilter}
      order by archived_at desc
    `
  } else {
    rows = await sql`
      select id, user_id, year, rule_version, archived_at,
             summary_json->>'totalOvertimeHours' as total_overtime_hours,
             summary_json->>'totalAllowances' as total_allowances,
             summary_json->>'payslipCount' as payslip_count
      from yearly_archives
      order by year desc, archived_at desc
      limit 500
    `
  }

  return c.json({ archives: rows })
})

// GET /admin/yearly-archives/:userId/:year — 특정 사용자 연도 아카이브 상세
adminOpsRoutes.get('/yearly-archives/:userId/:year', requireAdmin, async (c) => {
  const userId = c.req.param('userId') ?? ''
  const year = Number(c.req.param('year'))
  if (!userId) return c.json({ error: 'Invalid userId' }, 400)
  if (isNaN(year)) return c.json({ error: 'Invalid year' }, 400)

  const [row] = await sql`
    select * from yearly_archives
    where user_id = ${userId} and year = ${year}
    limit 1
  `
  if (!row) return c.json({ error: '아카이브 없음' }, 404)

  return c.json({ archive: row })
})

// ── Track D6: 규정 변경 diff → review queue draft 등록 ────────────────────

// POST /admin/regulation-diff
// Body: { newJson: Record<string, unknown>, newVersion: string, createDrafts?: boolean }
// 현행 활성 버전과 diff 후 draft 등록 (createDrafts: true 시)
adminOpsRoutes.post('/regulation-diff', requireAdmin, async (c) => {
  const admin = getAdminContext(c)
  const body = await c.req.json<{
    newJson: Record<string, unknown>
    newVersion: string
    createDrafts?: boolean
  }>()

  if (!body.newJson || !body.newVersion) {
    return c.json({ error: 'newJson, newVersion 필수' }, 400)
  }

  // 현행 활성 버전 조회
  const [activeVersion] = await sql<{ id: number; version: string }[]>`
    SELECT id, version FROM rule_versions WHERE is_active = true LIMIT 1
  `
  if (!activeVersion) {
    return c.json({ error: '현행 활성 규정 버전이 없습니다. 먼저 규정을 적재하세요.' }, 404)
  }

  // 현행 rule_entries 조회 → Map 생성
  const currentRows = await sql<{ key: string; value_json: unknown; category: string }[]>`
    SELECT key, value_json, category FROM rule_entries WHERE version_id = ${activeVersion.id}
  `
  const currentMap = new Map(currentRows.map((r) => [`${r.category}.${r.key}`, r.value_json]))

  // 신규 JSON 파싱 → flat entries
  type Entry = { category: string; key: string; value: unknown }
  function flattenForDiff(obj: unknown, prefix: string): { key: string; value: unknown }[] {
    if (obj === null || typeof obj !== 'object') return [{ key: prefix, value: obj }]
    if (Array.isArray(obj)) return [{ key: prefix, value: obj }]
    const entries: { key: string; value: unknown }[] = []
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const childKey = prefix ? `${prefix}.${k}` : k
      if (v === null || typeof v !== 'object' || Array.isArray(v)) {
        entries.push({ key: childKey, value: v })
      } else {
        entries.push(...flattenForDiff(v, childKey))
      }
    }
    return entries
  }

  const newEntries: Entry[] = []
  for (const [category, subtree] of Object.entries(body.newJson)) {
    if (category === '_meta') continue
    for (const { key, value } of flattenForDiff(subtree, '')) {
      newEntries.push({ category, key, value })
    }
  }

  // diff 계산
  const diff: { category: string; key: string; type: 'added' | 'removed' | 'changed'; oldValue?: unknown; newValue?: unknown }[] = []
  const newMap = new Map(newEntries.map((e) => [`${e.category}.${e.key}`, e]))

  for (const [fullKey, entry] of newMap) {
    const cur = currentMap.get(fullKey)
    if (cur === undefined) {
      diff.push({ category: entry.category, key: entry.key, type: 'added', newValue: entry.value })
    } else if (JSON.stringify(cur) !== JSON.stringify(entry.value)) {
      diff.push({ category: entry.category, key: entry.key, type: 'changed', oldValue: cur, newValue: entry.value })
    }
  }
  for (const [fullKey] of currentMap) {
    if (!newMap.has(fullKey)) {
      const [category, ...rest] = fullKey.split('.')
      diff.push({ category, key: rest.join('.'), type: 'removed', oldValue: currentMap.get(fullKey) })
    }
  }

  // draft 등록 옵션
  let draftsCreated = 0
  if (body.createDrafts && diff.length > 0) {
    const byCategory = new Map<string, typeof diff>()
    for (const d of diff) {
      if (!byCategory.has(d.category)) byCategory.set(d.category, [])
      byCategory.get(d.category)!.push(d)
    }

    for (const [category, items] of byCategory) {
      const title = `[규정 변경] ${body.newVersion} — ${category} (${items.length}개 항목)`
      const bodyLines = items.map((d) => {
        if (d.type === 'added') return `- **추가** \`${d.key}\`: ${JSON.stringify(d.newValue)}`
        if (d.type === 'removed') return `- **삭제** \`${d.key}\` (이전 값: ${JSON.stringify(d.oldValue)})`
        return `- **변경** \`${d.key}\`: ${JSON.stringify(d.oldValue)} → ${JSON.stringify(d.newValue)}`
      })
      const bodyText = `## ${category} 변경 사항\n\n` + bodyLines.join('\n')

      await sql`
        INSERT INTO content_entries (
          content_type, slug, title, status, body, metadata, created_by, updated_by
        ) VALUES (
          'notice',
          ${`regulation-diff-${body.newVersion}-${category}-${Date.now()}`},
          ${title},
          'draft',
          ${bodyText},
          ${JSON.stringify({ sourceVersion: body.newVersion, category, diffCount: items.length, type: 'regulation_change_draft' })},
          ${admin.userId},
          ${admin.userId}
        )
        ON CONFLICT DO NOTHING
      `
      draftsCreated++
    }

    await writeAuditLog({
      actorUserId: admin.userId,
      actorRole: admin.adminRole,
      action: 'regulation_diff.drafts_created',
      entityType: 'rule_version',
      entityId: activeVersion.id.toString(),
      diff: { newVersion: body.newVersion, diffCount: diff.length, draftsCreated },
    })
  }

  return c.json({
    baseVersion: activeVersion.version,
    newVersion: body.newVersion,
    summary: {
      added: diff.filter((d) => d.type === 'added').length,
      changed: diff.filter((d) => d.type === 'changed').length,
      removed: diff.filter((d) => d.type === 'removed').length,
    },
    diff,
    draftsCreated,
  })
})

export default adminOpsRoutes
