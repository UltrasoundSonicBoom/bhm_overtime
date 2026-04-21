import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  date,
  jsonb,
  uniqueIndex,
  index,
  uuid,
  pgEnum,
  timestamp,
} from 'drizzle-orm/pg-core'
// pgvector 커스텀 타입
import { customType } from 'drizzle-orm/pg-core'

const vector = customType<{ data: number[]; driverParam: string }>({
  dataType() {
    return 'vector(1536)'
  },
  toDriver(value: number[]) {
    return `[${value.join(',')}]`
  },
  fromDriver(value: unknown) {
    const str = value as string
    return str
      .slice(1, -1)
      .split(',')
      .map(Number)
  },
})

// ── Enums ──

export const regulationStatusEnum = pgEnum('regulation_status', [
  'draft',
  'active',
  'archived',
])

export const adminRoleEnum = pgEnum('admin_role', [
  'super_admin',
  'hr_admin',
  'union_admin',
  'viewer',
])

export const teamRoleEnum = pgEnum('team_role', [
  'head_nurse',
  'scheduler',
  'staff',
  'viewer',
])

export const contentStatusEnum = pgEnum('content_status', [
  'draft',
  'review',
  'published',
  'archived',
])

export const contentTypeEnum = pgEnum('content_type', [
  'policy',
  'faq',
  'notice',
  'landing',
  'dataset',
])

export const approvalStatusEnum = pgEnum('approval_status', [
  'pending',
  'approved',
  'rejected',
  'cancelled',
])

export const schedulePeriodStatusEnum = pgEnum('schedule_period_status', [
  'draft',
  'review',
  'published',
])

export const scheduleRunTypeEnum = pgEnum('schedule_run_type', [
  'generate',
  'repair',
])

export const scheduleRunStatusEnum = pgEnum('schedule_run_status', [
  'queued',
  'running',
  'completed',
  'infeasible',
  'failed',
])

export const scheduleCandidateStatusEnum = pgEnum('schedule_candidate_status', [
  'draft',
  'selected',
  'published',
  'discarded',
])

export const publishVersionStatusEnum = pgEnum('publish_version_status', [
  'published',
  'superseded',
])

export const swapRequestStatusEnum = pgEnum('swap_request_status', [
  'pending',
  'approved',
  'rejected',
  'cancelled',
])

// ── 3.0 organization context ──

export const orgDomains = pgTable(
  'org_domains',
  {
    id: serial('id').primaryKey(),
    hospitalKey: text('hospital_key').notNull(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    uniqueIndex('org_domains_hospital_code_uidx').on(table.hospitalKey, table.code),
    index('org_domains_hospital_idx').on(table.hospitalKey, table.isActive),
  ],
)

export const orgDepartments = pgTable(
  'org_departments',
  {
    id: serial('id').primaryKey(),
    domainId: integer('domain_id')
      .notNull()
      .references(() => orgDomains.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    departmentType: text('department_type'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    uniqueIndex('org_departments_domain_code_uidx').on(table.domainId, table.code),
    index('org_departments_domain_idx').on(table.domainId, table.isActive),
  ],
)

export const orgUnits = pgTable(
  'org_units',
  {
    id: serial('id').primaryKey(),
    departmentId: integer('department_id')
      .notNull()
      .references(() => orgDepartments.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    unitType: text('unit_type'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    uniqueIndex('org_units_department_code_uidx').on(table.departmentId, table.code),
    index('org_units_department_idx').on(table.departmentId, table.isActive),
  ],
)

export const orgTeams = pgTable(
  'org_teams',
  {
    id: serial('id').primaryKey(),
    unitId: integer('unit_id')
      .notNull()
      .references(() => orgUnits.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    teamType: text('team_type'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    uniqueIndex('org_teams_unit_code_uidx').on(table.unitId, table.code),
    index('org_teams_unit_idx').on(table.unitId, table.isActive),
  ],
)

export const jobFamilies = pgTable(
  'job_families',
  {
    id: serial('id').primaryKey(),
    code: text('code').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    uniqueIndex('job_families_code_uidx').on(table.code),
  ],
)

export const jobTitles = pgTable(
  'job_titles',
  {
    id: serial('id').primaryKey(),
    jobFamilyId: integer('job_family_id')
      .notNull()
      .references(() => jobFamilies.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    gradeBand: text('grade_band'),
    isManagerial: boolean('is_managerial').notNull().default(false),
  },
  (table) => [
    uniqueIndex('job_titles_family_title_uidx').on(table.jobFamilyId, table.title),
  ],
)

export const personaProfiles = pgTable(
  'persona_profiles',
  {
    id: serial('id').primaryKey(),
    code: text('code').notNull(),
    profileName: text('profile_name').notNull(),
    hospitalKey: text('hospital_key').notNull().default('snuh'),
    jobFamilyId: integer('job_family_id').references(() => jobFamilies.id, {
      onDelete: 'set null',
    }),
    domainId: integer('domain_id').references(() => orgDomains.id, {
      onDelete: 'set null',
    }),
    departmentId: integer('department_id').references(() => orgDepartments.id, {
      onDelete: 'set null',
    }),
    unitId: integer('unit_id').references(() => orgUnits.id, {
      onDelete: 'set null',
    }),
    teamId: integer('team_id').references(() => orgTeams.id, {
      onDelete: 'set null',
    }),
    titleId: integer('title_id').references(() => jobTitles.id, {
      onDelete: 'set null',
    }),
    workPattern: text('work_pattern'),
    communicationStyle: text('communication_style'),
    painPoints: jsonb('pain_points').$type<string[]>().default([]),
    aiNeeds: jsonb('ai_needs').$type<string[]>().default([]),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    uniqueIndex('persona_profiles_code_uidx').on(table.code),
    index('persona_profiles_scope_idx').on(
      table.jobFamilyId,
      table.domainId,
      table.departmentId,
    ),
  ],
)

// ── 3.1 regulation_versions ──

export const regulationVersions = pgTable('regulation_versions', {
  id: serial('id').primaryKey(),
  year: integer('year').notNull(),
  title: text('title').notNull(),
  status: regulationStatusEnum('status').notNull().default('draft'),
  effectiveDate: date('effective_date'),
  sourceFiles: jsonb('source_files').$type<string[]>().default([]),
  applicableDomainIds: jsonb('applicable_domain_ids').$type<number[]>().default([]),
  applicableJobFamilyIds: jsonb('applicable_job_family_ids').$type<number[]>().default([]),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

// ── 3.2 regulation_documents (RAG vector store) ──

export const regulationDocuments = pgTable(
  'regulation_documents',
  {
    id: serial('id').primaryKey(),
    versionId: integer('version_id')
      .notNull()
      .references(() => regulationVersions.id, { onDelete: 'cascade' }),
    domainId: integer('domain_id').references(() => orgDomains.id, {
      onDelete: 'set null',
    }),
    departmentId: integer('department_id').references(() => orgDepartments.id, {
      onDelete: 'set null',
    }),
    jobFamilyId: integer('job_family_id').references(() => jobFamilies.id, {
      onDelete: 'set null',
    }),
    chunkIndex: integer('chunk_index').notNull(),
    sourceFile: text('source_file'),
    sectionTitle: text('section_title'),
    content: text('content').notNull(),
    embedding: vector('embedding'),
    tokenCount: integer('token_count'),
    articleScope: text('article_scope'),
    metadata: jsonb('metadata').$type<{
      page?: number
      category?: string
      article_ref?: string
    }>(),
  },
  (table) => [
    index('reg_docs_version_idx').on(table.versionId),
    index('reg_docs_scope_idx').on(table.domainId, table.departmentId, table.jobFamilyId),
  ],
)

// ── 3.3 pay_tables ──

export const payTables = pgTable(
  'pay_tables',
  {
    id: serial('id').primaryKey(),
    versionId: integer('version_id')
      .notNull()
      .references(() => regulationVersions.id, { onDelete: 'cascade' }),
    payTableName: text('pay_table_name').notNull(),
    grade: text('grade').notNull(),
    gradeLabel: text('grade_label'),
    basePay: jsonb('base_pay').$type<number[]>().notNull(),
    abilityPay: integer('ability_pay'),
    bonus: integer('bonus'),
    familySupport: integer('family_support'),
  },
  (table) => [
    index('pay_tables_version_idx').on(table.versionId),
  ],
)

// ── 3.4 allowances ──

export const allowances = pgTable(
  'allowances',
  {
    id: serial('id').primaryKey(),
    versionId: integer('version_id')
      .notNull()
      .references(() => regulationVersions.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    label: text('label'),
    category: text('category'),
  },
  (table) => [
    index('allowances_version_idx').on(table.versionId),
  ],
)

// ── 3.5 calculation_rules ──

export const calculationRules = pgTable(
  'calculation_rules',
  {
    id: serial('id').primaryKey(),
    versionId: integer('version_id')
      .notNull()
      .references(() => regulationVersions.id, { onDelete: 'cascade' }),
    domainId: integer('domain_id').references(() => orgDomains.id, {
      onDelete: 'set null',
    }),
    jobFamilyId: integer('job_family_id').references(() => jobFamilies.id, {
      onDelete: 'set null',
    }),
    ruleType: text('rule_type').notNull(),
    ruleKey: text('rule_key').notNull(),
    ruleData: jsonb('rule_data').notNull(),
    ruleScope: text('rule_scope'),
    description: text('description'),
  },
  (table) => [
    index('calc_rules_version_idx').on(table.versionId),
    index('calc_rules_scope_idx').on(table.domainId, table.jobFamilyId),
  ],
)

// ── 3.6 faq_entries ──

export const faqEntries = pgTable(
  'faq_entries',
  {
    id: serial('id').primaryKey(),
    versionId: integer('version_id').references(() => regulationVersions.id, {
      onDelete: 'set null',
    }),
    domainId: integer('domain_id').references(() => orgDomains.id, {
      onDelete: 'set null',
    }),
    departmentId: integer('department_id').references(() => orgDepartments.id, {
      onDelete: 'set null',
    }),
    jobFamilyId: integer('job_family_id').references(() => jobFamilies.id, {
      onDelete: 'set null',
    }),
    personaProfileId: integer('persona_profile_id').references(() => personaProfiles.id, {
      onDelete: 'set null',
    }),
    category: text('category').notNull(),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    articleRef: text('article_ref'),
    audienceScope: text('audience_scope'),
    embedding: vector('embedding'),
    sortOrder: integer('sort_order').default(0),
    isPublished: boolean('is_published').default(true),
  },
  (table) => [
    index('faq_version_idx').on(table.versionId),
    index('faq_category_idx').on(table.category),
    index('faq_scope_idx').on(table.domainId, table.departmentId, table.jobFamilyId),
  ],
)

// ── 3.7 chat_history ──

export const chatHistory = pgTable(
  'chat_history',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id'),
    sessionId: text('session_id').notNull(),
    role: text('role').notNull(), // 'user' | 'assistant'
    content: text('content').notNull(),
    sourceDocs: jsonb('source_docs').$type<
      { chunkId: number; score: number; snippet: string }[]
    >(),
    model: text('model'),
    tokenUsage: jsonb('token_usage').$type<{
      prompt?: number
      completion?: number
    }>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('chat_session_idx').on(table.sessionId),
    index('chat_user_idx').on(table.userId),
  ],
)

// ── 3.8 admin_users ──

export const adminUsers = pgTable(
  'admin_users',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id').notNull().unique(),
    email: text('email').notNull(),
    role: adminRoleEnum('role').notNull().default('viewer'),
    managedDomainIds: jsonb('managed_domain_ids').$type<number[]>().default([]),
    managedDepartmentIds: jsonb('managed_department_ids').$type<number[]>().default([]),
    isActive: boolean('is_active').default(true),
  },
  (table) => [
    uniqueIndex('admin_users_uid_idx').on(table.userId),
  ],
)

// ── 3.9 leave_types ──

export const leaveTypes = pgTable(
  'leave_types',
  {
    id: serial('id').primaryKey(),
    versionId: integer('version_id')
      .notNull()
      .references(() => regulationVersions.id, { onDelete: 'cascade' }),
    typeId: text('type_id').notNull(),
    label: text('label').notNull(),
    category: text('category'),
    isPaid: boolean('is_paid').default(true),
    quota: integer('quota'),
    usesAnnual: boolean('uses_annual').default(false),
    deductType: text('deduct_type').default('none'),
    gender: text('gender'),
    articleRef: text('article_ref'),
    extraData: jsonb('extra_data'),
  },
  (table) => [
    index('leave_types_version_idx').on(table.versionId),
  ],
)

// ── 3.10 ceremonies ──

export const ceremonies = pgTable(
  'ceremonies',
  {
    id: serial('id').primaryKey(),
    versionId: integer('version_id')
      .notNull()
      .references(() => regulationVersions.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    leaveDays: text('leave_days'),
    hospitalPay: integer('hospital_pay'),
    pensionPay: text('pension_pay'),
    coopPay: text('coop_pay'),
    docs: text('docs'),
  },
  (table) => [
    index('ceremonies_version_idx').on(table.versionId),
  ],
)

// ── 3.11 content_entries ──

export const contentEntries = pgTable(
  'content_entries',
  {
    id: serial('id').primaryKey(),
    contentType: contentTypeEnum('content_type').notNull(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    status: contentStatusEnum('status').notNull().default('draft'),
    currentRevisionId: integer('current_revision_id'),
    publishedRevisionId: integer('published_revision_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('content_entries_type_slug_uidx').on(table.contentType, table.slug),
    index('content_entries_status_idx').on(table.status),
  ],
)

// ── 3.12 content_revisions ──

export const contentRevisions = pgTable(
  'content_revisions',
  {
    id: serial('id').primaryKey(),
    entryId: integer('entry_id')
      .notNull()
      .references(() => contentEntries.id, { onDelete: 'cascade' }),
    revisionNumber: integer('revision_number').notNull(),
    status: contentStatusEnum('status').notNull().default('draft'),
    summary: text('summary'),
    body: text('body').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('content_revisions_entry_revision_uidx').on(
      table.entryId,
      table.revisionNumber,
    ),
    index('content_revisions_entry_idx').on(table.entryId),
  ],
)

// ── 3.13 approval_tasks ──

export const approvalTasks = pgTable(
  'approval_tasks',
  {
    id: serial('id').primaryKey(),
    entryId: integer('entry_id')
      .notNull()
      .references(() => contentEntries.id, { onDelete: 'cascade' }),
    revisionId: integer('revision_id')
      .notNull()
      .references(() => contentRevisions.id, { onDelete: 'cascade' }),
    status: approvalStatusEnum('status').notNull().default('pending'),
    requestedBy: uuid('requested_by'),
    assignedTo: uuid('assigned_to'),
    decisionBy: uuid('decision_by'),
    decisionNote: text('decision_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
  },
  (table) => [
    index('approval_tasks_entry_idx').on(table.entryId),
    index('approval_tasks_status_idx').on(table.status),
  ],
)

// ── 3.14 audit_logs ──

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    actorUserId: uuid('actor_user_id'),
    actorRole: adminRoleEnum('actor_role'),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    diff: jsonb('diff').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('audit_logs_entity_idx').on(table.entityType, table.entityId),
    index('audit_logs_actor_idx').on(table.actorUserId),
  ],
)

// ── 3.15 teams ──

export const teams = pgTable(
  'teams',
  {
    id: serial('id').primaryKey(),
    orgTeamId: integer('org_team_id').references(() => orgTeams.id, {
      onDelete: 'set null',
    }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    isActive: boolean('is_active').default(true),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('teams_slug_uidx').on(table.slug),
    index('teams_org_team_idx').on(table.orgTeamId),
  ],
)

// ── 3.16 team_members ──

export const teamMembers = pgTable(
  'team_members',
  {
    id: serial('id').primaryKey(),
    externalUserId: uuid('external_user_id'),
    employeeCode: text('employee_code'),
    displayName: text('display_name').notNull(),
    age: integer('age'),
    roleLabel: text('role_label'),
    skillTags: jsonb('skill_tags').$type<string[]>().default([]),
    ftePermille: integer('fte_permille').notNull().default(1000),
    canNight: boolean('can_night').default(true),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('team_members_external_uid_idx').on(table.externalUserId),
  ],
)

// ── 3.17 team_memberships ──

export const teamMemberships = pgTable(
  'team_memberships',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    memberId: integer('member_id')
      .notNull()
      .references(() => teamMembers.id, { onDelete: 'cascade' }),
    teamRole: teamRoleEnum('team_role').notNull().default('staff'),
    isPrimary: boolean('is_primary').default(true),
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  },
  (table) => [
    uniqueIndex('team_memberships_team_member_uidx').on(table.teamId, table.memberId),
    index('team_memberships_role_idx').on(table.teamRole),
  ],
)

// ── 3.18 team_rule_profiles ──

export const teamRuleProfiles = pgTable(
  'team_rule_profiles',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    version: integer('version').notNull().default(1),
    name: text('name').notNull(),
    hospitalRuleVersion: text('hospital_rule_version'),
    structuredRules: jsonb('structured_rules')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    scoringWeights: jsonb('scoring_weights')
      .$type<Record<string, number>>()
      .default({}),
    isActive: boolean('is_active').default(true),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('team_rule_profiles_team_version_uidx').on(table.teamId, table.version),
    index('team_rule_profiles_active_idx').on(table.teamId, table.isActive),
  ],
)

// ── 3.19 team_subdomains ──

export const teamSubdomains = pgTable(
  'team_subdomains',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    hostname: text('hostname'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('team_subdomains_slug_uidx').on(table.slug),
    uniqueIndex('team_subdomains_hostname_uidx').on(table.hostname),
  ],
)

// ── 3.20 shift_types ──

export const shiftTypes = pgTable(
  'shift_types',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    label: text('label').notNull(),
    startMinutes: integer('start_minutes').notNull(),
    endMinutes: integer('end_minutes').notNull(),
    isWork: boolean('is_work').default(true),
    category: text('category').default('work'),
    sortOrder: integer('sort_order').default(0),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  },
  (table) => [
    uniqueIndex('shift_types_team_code_uidx').on(table.teamId, table.code),
  ],
)

// ── 3.21 coverage_templates ──

export const coverageTemplates = pgTable(
  'coverage_templates',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    isActive: boolean('is_active').default(true),
    rules: jsonb('rules').$type<Record<string, unknown>>().notNull().default({}),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('coverage_templates_team_active_idx').on(table.teamId, table.isActive),
  ],
)

// ── 3.22 schedule_periods ──

export const schedulePeriods = pgTable(
  'schedule_periods',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    year: integer('year').notNull(),
    month: integer('month').notNull(),
    status: schedulePeriodStatusEnum('status').notNull().default('draft'),
    activeRuleProfileId: integer('active_rule_profile_id'),
    latestRunId: integer('latest_run_id'),
    currentCandidateId: integer('current_candidate_id'),
    currentPublishVersionId: integer('current_publish_version_id'),
    requestSnapshot: jsonb('request_snapshot')
      .$type<Record<string, unknown>>()
      .default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('schedule_periods_team_month_uidx').on(table.teamId, table.year, table.month),
    index('schedule_periods_status_idx').on(table.status),
  ],
)

// ── 3.23 schedule_runs ──

export const scheduleRuns = pgTable(
  'schedule_runs',
  {
    id: serial('id').primaryKey(),
    periodId: integer('period_id')
      .notNull()
      .references(() => schedulePeriods.id, { onDelete: 'cascade' }),
    runType: scheduleRunTypeEnum('run_type').notNull(),
    status: scheduleRunStatusEnum('status').notNull().default('queued'),
    initiatedBy: uuid('initiated_by'),
    inputSnapshot: jsonb('input_snapshot')
      .$type<Record<string, unknown>>()
      .default({}),
    selectedCandidateId: integer('selected_candidate_id'),
    solverEngine: text('solver_engine'),
    summary: jsonb('summary').$type<Record<string, unknown>>().default({}),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('schedule_runs_period_idx').on(table.periodId),
    index('schedule_runs_status_idx').on(table.status),
  ],
)

// ── 3.24 schedule_candidates ──

export const scheduleCandidates = pgTable(
  'schedule_candidates',
  {
    id: serial('id').primaryKey(),
    runId: integer('run_id')
      .notNull()
      .references(() => scheduleRuns.id, { onDelete: 'cascade' }),
    candidateKey: text('candidate_key').notNull(),
    ranking: integer('ranking').notNull().default(0),
    status: scheduleCandidateStatusEnum('status').notNull().default('draft'),
    score: jsonb('score').$type<Record<string, unknown>>().default({}),
    explanation: jsonb('explanation')
      .$type<Record<string, unknown>>()
      .default({}),
    assignmentsSnapshot: jsonb('assignments_snapshot')
      .$type<Record<string, unknown>[]>()
      .default([]),
    violationsSnapshot: jsonb('violations_snapshot')
      .$type<Record<string, unknown>[]>()
      .default([]),
    publishedDiff: jsonb('published_diff')
      .$type<Record<string, unknown>>()
      .default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('schedule_candidates_run_key_uidx').on(table.runId, table.candidateKey),
    index('schedule_candidates_status_idx').on(table.status),
  ],
)

// ── 3.25 shift_assignments ──

export const shiftAssignments = pgTable(
  'shift_assignments',
  {
    id: serial('id').primaryKey(),
    candidateId: integer('candidate_id')
      .notNull()
      .references(() => scheduleCandidates.id, { onDelete: 'cascade' }),
    memberId: integer('member_id')
      .notNull()
      .references(() => teamMembers.id, { onDelete: 'cascade' }),
    workDate: date('work_date').notNull(),
    shiftCode: text('shift_code').notNull(),
    source: text('source').default('solver'),
    isLocked: boolean('is_locked').default(false),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  },
  (table) => [
    uniqueIndex('shift_assignments_candidate_member_date_uidx').on(
      table.candidateId,
      table.memberId,
      table.workDate,
    ),
    index('shift_assignments_member_idx').on(table.memberId, table.workDate),
  ],
)

// ── 3.26 assignment_locks ──

export const assignmentLocks = pgTable(
  'assignment_locks',
  {
    id: serial('id').primaryKey(),
    periodId: integer('period_id')
      .notNull()
      .references(() => schedulePeriods.id, { onDelete: 'cascade' }),
    memberId: integer('member_id')
      .notNull()
      .references(() => teamMembers.id, { onDelete: 'cascade' }),
    workDate: date('work_date').notNull(),
    lockedShiftCode: text('locked_shift_code').notNull(),
    reason: text('reason'),
    lockedBy: uuid('locked_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('assignment_locks_period_member_date_uidx').on(
      table.periodId,
      table.memberId,
      table.workDate,
    ),
  ],
)

// ── 3.27 team_schedule_events ──

export const teamScheduleEvents = pgTable(
  'team_schedule_events',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    periodId: integer('period_id').references(() => schedulePeriods.id, {
      onDelete: 'cascade',
    }),
    memberId: integer('member_id').references(() => teamMembers.id, {
      onDelete: 'set null',
    }),
    scope: text('scope').notNull(),
    eventType: text('event_type').notNull(),
    title: text('title').notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    startMinutes: integer('start_minutes'),
    endMinutes: integer('end_minutes'),
    allDay: boolean('all_day').notNull().default(true),
    blocksWork: boolean('blocks_work').notNull().default(false),
    preferredShiftCode: text('preferred_shift_code'),
    coverageDelta: jsonb('coverage_delta')
      .$type<Record<string, number>>()
      .notNull()
      .default({}),
    notes: text('notes'),
    source: text('source').notNull().default('manual'),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('team_schedule_events_team_period_idx').on(table.teamId, table.periodId),
    index('team_schedule_events_member_date_idx').on(table.memberId, table.startDate, table.endDate),
    index('team_schedule_events_scope_idx').on(table.teamId, table.scope, table.eventType),
  ],
)

// ── 3.28 constraint_violations ──

export const constraintViolations = pgTable(
  'constraint_violations',
  {
    id: serial('id').primaryKey(),
    candidateId: integer('candidate_id')
      .notNull()
      .references(() => scheduleCandidates.id, { onDelete: 'cascade' }),
    severity: text('severity').notNull(),
    ruleCode: text('rule_code').notNull(),
    message: text('message').notNull(),
    workDate: date('work_date'),
    memberId: integer('member_id').references(() => teamMembers.id, {
      onDelete: 'set null',
    }),
    details: jsonb('details').$type<Record<string, unknown>>().default({}),
  },
  (table) => [
    index('constraint_violations_candidate_idx').on(table.candidateId),
    index('constraint_violations_rule_idx').on(table.ruleCode),
  ],
)

// ── 3.29 publish_versions ──

export const publishVersions = pgTable(
  'publish_versions',
  {
    id: serial('id').primaryKey(),
    periodId: integer('period_id')
      .notNull()
      .references(() => schedulePeriods.id, { onDelete: 'cascade' }),
    candidateId: integer('candidate_id').references(() => scheduleCandidates.id, {
      onDelete: 'set null',
    }),
    versionNumber: integer('version_number').notNull(),
    status: publishVersionStatusEnum('status').notNull().default('published'),
    publishedBy: uuid('published_by'),
    assignmentsSnapshot: jsonb('assignments_snapshot')
      .$type<Record<string, unknown>[]>()
      .notNull()
      .default([]),
    diffSummary: jsonb('diff_summary').$type<Record<string, unknown>>().default({}),
    calendarSyncState: jsonb('calendar_sync_state')
      .$type<Record<string, unknown>>()
      .default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('publish_versions_period_version_uidx').on(table.periodId, table.versionNumber),
    index('publish_versions_status_idx').on(table.status),
  ],
)

// ── 3.30 schedule_requests ──

export const scheduleRequests = pgTable(
  'schedule_requests',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    periodId: integer('period_id')
      .notNull()
      .references(() => schedulePeriods.id, { onDelete: 'cascade' }),
    memberId: integer('member_id')
      .notNull()
      .references(() => teamMembers.id, { onDelete: 'cascade' }),
    requestType: text('request_type').notNull(),
    requestDate: date('request_date').notNull(),
    note: text('note'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('schedule_requests_team_period_member_date_type_uidx').on(
      table.teamId,
      table.periodId,
      table.memberId,
      table.requestDate,
      table.requestType,
    ),
    index('schedule_requests_member_idx').on(table.memberId, table.requestDate),
  ],
)

// ── 3.31 swap_requests ──

export const swapRequests = pgTable(
  'swap_requests',
  {
    id: serial('id').primaryKey(),
    periodId: integer('period_id')
      .notNull()
      .references(() => schedulePeriods.id, { onDelete: 'cascade' }),
    publishVersionId: integer('publish_version_id')
      .notNull()
      .references(() => publishVersions.id, { onDelete: 'cascade' }),
    requesterMemberId: integer('requester_member_id')
      .notNull()
      .references(() => teamMembers.id, { onDelete: 'cascade' }),
    counterpartyMemberId: integer('counterparty_member_id')
      .notNull()
      .references(() => teamMembers.id, { onDelete: 'cascade' }),
    requesterDate: date('requester_date').notNull(),
    requesterShiftCode: text('requester_shift_code').notNull(),
    counterpartyDate: date('counterparty_date').notNull(),
    counterpartyShiftCode: text('counterparty_shift_code').notNull(),
    reason: text('reason'),
    status: swapRequestStatusEnum('status').notNull().default('pending'),
    requestedBy: uuid('requested_by'),
    decidedBy: uuid('decided_by'),
    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
  },
  (table) => [
    index('swap_requests_period_idx').on(table.periodId, table.status),
    index('swap_requests_publish_idx').on(table.publishVersionId),
  ],
)

// ── 3.31 swap_events ──

export const swapEvents = pgTable(
  'swap_events',
  {
    id: serial('id').primaryKey(),
    swapRequestId: integer('swap_request_id')
      .notNull()
      .references(() => swapRequests.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    actorUserId: uuid('actor_user_id'),
    payload: jsonb('payload').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('swap_events_request_idx').on(table.swapRequestId, table.createdAt),
  ],
)

// ── Track D: 연도별 규정 버전 아카이빙 ──

// D.1 rule_versions: hospital_rule_master_YYYY.json 단위 버전 관리
export const ruleVersions = pgTable(
  'rule_versions',
  {
    id: serial('id').primaryKey(),
    version: text('version').notNull().unique(),        // e.g. "2026.1.0"
    effectiveFrom: date('effective_from').notNull(),    // 적용 시작일
    effectiveTo: date('effective_to'),                  // 적용 종료일 (null = 현행)
    isActive: boolean('is_active').notNull().default(false),
    changeNote: text('change_note'),                    // 개정 사유 / 요약
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    createdBy: uuid('created_by'),                      // admin user_id
  },
  (table) => [
    index('rule_versions_active_idx').on(table.isActive),
    index('rule_versions_effective_idx').on(table.effectiveFrom),
  ],
)

// D.2 rule_entries: rule_versions의 항목별 row
export const ruleEntries = pgTable(
  'rule_entries',
  {
    id: serial('id').primaryKey(),
    versionId: integer('version_id')
      .notNull()
      .references(() => ruleVersions.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),   // e.g. "wage_tables", "allowances", "night_shift"
    key: text('key').notNull(),             // flat dot-path: "general_J_grade.J3.base_salary_by_year.1"
    valueJson: jsonb('value_json').notNull(), // 원본 값 (숫자, 배열, 객체 모두 허용)
    changedBy: uuid('changed_by'),           // 수정한 admin user_id (null = migration)
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('rule_entries_version_idx').on(table.versionId),
    index('rule_entries_category_idx').on(table.versionId, table.category),
    uniqueIndex('rule_entries_version_key_idx').on(table.versionId, table.key),
  ],
)

// E.2 user_resume_usage: AI 이력서 생성 월 1회 제한 추적
export const userResumeUsage = pgTable(
  'user_resume_usage',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id').notNull().unique(), // Supabase auth.users.id
    resumeGeneratedAt: timestamp('resume_generated_at', { withTimezone: true }),
    // 마지막 생성 시각. null = 한번도 생성 안함. 월 1회 제한 = 현재 월과 다르면 허용
  },
  (table) => [
    index('user_resume_usage_user_idx').on(table.userId),
  ],
)

// D.5 yearly_archives: 연도별 시간외/휴가 통계 스냅샷 (읽기 전용 보관)
export const yearlyArchives = pgTable(
  'yearly_archives',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id').notNull(),        // 아카이빙 대상 사용자
    year: integer('year').notNull(),          // 아카이빙 연도 (e.g. 2025)
    summaryJson: jsonb('summary_json').notNull(), // 연간 통계 스냅샷
    // summaryJson 구조: { totalOvertimeHours, totalAllowances, monthlyBreakdown, payslipCount }
    ruleVersion: text('rule_version'),        // 해당 연도에 적용된 규정 버전 (e.g. "2025.1.0")
    archivedAt: timestamp('archived_at', { withTimezone: true }).defaultNow(),
    archivedBy: uuid('archived_by'),          // 아카이빙 실행한 admin user_id (null = 자동)
  },
  (table) => [
    index('yearly_archives_user_year_idx').on(table.userId, table.year),
    uniqueIndex('yearly_archives_user_year_unique').on(table.userId, table.year),
  ],
)

export const leaveRecords = pgTable(
  'leave_records',
  {
    id: serial('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    type: text('type').notNull(),
    startDate: text('startDate').notNull(),
    endDate: text('endDate').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('leave_records_user_idx').on(table.userId),
    index('leave_records_date_idx').on(table.startDate, table.endDate),
  ],
)
