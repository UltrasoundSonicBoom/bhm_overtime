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

// ── 3.1 regulation_versions ──

export const regulationVersions = pgTable('regulation_versions', {
  id: serial('id').primaryKey(),
  year: integer('year').notNull(),
  title: text('title').notNull(),
  status: regulationStatusEnum('status').notNull().default('draft'),
  effectiveDate: date('effective_date'),
  sourceFiles: jsonb('source_files').$type<string[]>().default([]),
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
    chunkIndex: integer('chunk_index').notNull(),
    sourceFile: text('source_file'),
    sectionTitle: text('section_title'),
    content: text('content').notNull(),
    embedding: vector('embedding'),
    tokenCount: integer('token_count'),
    metadata: jsonb('metadata').$type<{
      page?: number
      category?: string
      article_ref?: string
    }>(),
  },
  (table) => [
    index('reg_docs_version_idx').on(table.versionId),
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
    ruleType: text('rule_type').notNull(),
    ruleKey: text('rule_key').notNull(),
    ruleData: jsonb('rule_data').notNull(),
    description: text('description'),
  },
  (table) => [
    index('calc_rules_version_idx').on(table.versionId),
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
    category: text('category').notNull(),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    articleRef: text('article_ref'),
    embedding: vector('embedding'),
    sortOrder: integer('sort_order').default(0),
    isPublished: boolean('is_published').default(true),
  },
  (table) => [
    index('faq_version_idx').on(table.versionId),
    index('faq_category_idx').on(table.category),
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
