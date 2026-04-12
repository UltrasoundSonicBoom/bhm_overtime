/**
 * Seed script: nurse_regulation.json -> DB
 *
 * nurse_regulation.json의 구조화된 데이터를
 * regulation_versions + calculation_rules 테이블에 적재한다.
 *
 * 사용법:
 *   npx tsx server/scripts/seed-nurse-regulation.ts              # dry-run
 *   npx tsx server/scripts/seed-nurse-regulation.ts --write       # 실제 적재
 *   npx tsx server/scripts/seed-nurse-regulation.ts --write --force  # sha256 무시 강제 적재
 *   npx tsx server/scripts/seed-nurse-regulation.ts --write --version-id=5  # 특정 버전에 적재
 *
 * 동작:
 * 1. nurse_regulation.json 파싱
 * 2. regulation_versions에서 대상 버전 결정 (active 또는 --version-id)
 * 3. source_sha256 비교하여 변경 여부 확인
 * 4. calculation_rules에 구조화 데이터 적재 (idempotent: 기존 삭제 후 재삽입)
 * 5. regulation_versions.source_files 업데이트
 */
import 'dotenv/config'
import postgres from 'postgres'
import { readFileSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { createHash } from 'node:crypto'

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })
const repoRoot = resolve(import.meta.dirname, '..', '..')

const NURSE_REGULATION_PATH = 'content/policies/2026/nurse_regulation.json'
const SOURCE_FILE_KEY = NURSE_REGULATION_PATH

type CliOptions = {
  write: boolean
  force: boolean
  versionId?: number
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { write: false, force: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--write') options.write = true
    if (arg === '--force') options.force = true
    if (arg.startsWith('--version-id=')) options.versionId = Number(arg.split('=')[1])
    if (arg === '--version-id') options.versionId = Number(argv[++i])
  }
  return options
}

type RuleMapping = {
  ruleType: string
  ruleKey: string
  ruleData: unknown
  description: string
}

function extractRules(regulation: Record<string, any>): RuleMapping[] {
  const rules: RuleMapping[] = []

  // working_hours_and_shift_rules -> shift_rules
  if (regulation.working_hours_and_shift_rules) {
    const shiftRules = regulation.working_hours_and_shift_rules
    rules.push({
      ruleType: 'shift_rules',
      ruleKey: 'standard_hours',
      ruleData: shiftRules.standard_hours || {},
      description: '표준 근로시간 및 교대근무 시간표',
    })
    rules.push({
      ruleType: 'shift_rules',
      ruleKey: 'shift_worker_rules',
      ruleData: shiftRules.shift_worker_rules || {},
      description: '교대근무자 근로규칙 (최소휴식, 야간상한, 금지패턴)',
    })
    rules.push({
      ruleType: 'shift_rules',
      ruleKey: 'overtime_and_on_call',
      ruleData: shiftRules.overtime_and_on_call || {},
      description: '시간외/온콜 규칙',
    })
    if (shiftRules.taxi_support) {
      rules.push({
        ruleType: 'shift_rules',
        ruleKey: 'taxi_support',
        ruleData: shiftRules.taxi_support,
        description: '심야 택시 지원',
      })
    }
  }

  // wage_structure_and_allowances -> wage_structure
  if (regulation.wage_structure_and_allowances) {
    const wage = regulation.wage_structure_and_allowances
    rules.push({
      ruleType: 'wage_structure',
      ruleKey: 'wage_components',
      ruleData: wage.wage_components || {},
      description: '임금 구성항목',
    })
    rules.push({
      ruleType: 'wage_structure',
      ruleKey: 'fixed_allowances',
      ruleData: wage.fixed_allowances || {},
      description: '고정 수당 (급식/교통/리프레시 등)',
    })
    rules.push({
      ruleType: 'wage_structure',
      ruleKey: 'family_allowance',
      ruleData: wage.family_allowance || {},
      description: '가족수당',
    })
    rules.push({
      ruleType: 'wage_structure',
      ruleKey: 'long_service_allowance',
      ruleData: wage.long_service_allowance || {},
      description: '장기근속수당',
    })
    rules.push({
      ruleType: 'wage_structure',
      ruleKey: 'conditional_wages',
      ruleData: wage.conditional_wages || {},
      description: '조건부 임금 (명절/가계지원비 등)',
    })
  }

  // leaves_and_holidays -> leaves
  if (regulation.leaves_and_holidays) {
    const leaves = regulation.leaves_and_holidays
    for (const [key, value] of Object.entries(leaves)) {
      if (key === 'page_refs') continue
      rules.push({
        ruleType: 'leaves',
        ruleKey: key,
        ruleData: value,
        description: `휴가/휴일: ${key}`,
      })
    }
  }

  // welfare_and_training -> welfare
  if (regulation.welfare_and_training) {
    const welfare = regulation.welfare_and_training
    for (const [key, value] of Object.entries(welfare)) {
      if (key === 'page_refs') continue
      rules.push({
        ruleType: 'welfare',
        ruleKey: key,
        ruleData: value,
        description: `복지/교육: ${key}`,
      })
    }
  }

  // wage_tables_2025 -> wage_table_raw
  if (regulation.wage_tables_2025) {
    const wageTables = regulation.wage_tables_2025
    for (const [key, value] of Object.entries(wageTables)) {
      if (key === 'page_refs') continue
      rules.push({
        ruleType: 'wage_table_raw',
        ruleKey: key,
        ruleData: value,
        description: `보수표: ${key}`,
      })
    }
  }

  // medical_support -> medical_support
  if (regulation.medical_support) {
    rules.push({
      ruleType: 'medical_support',
      ruleKey: 'medical_support',
      ruleData: regulation.medical_support,
      description: '의료비 지원/감면',
    })
  }

  // leave_of_absence_and_retirement -> leave_of_absence
  if (regulation.leave_of_absence_and_retirement) {
    rules.push({
      ruleType: 'leave_of_absence',
      ruleKey: 'leave_of_absence_and_retirement',
      ruleData: regulation.leave_of_absence_and_retirement,
      description: '휴직 및 퇴직 규정',
    })
  }

  // document_outline (메타데이터)
  if (regulation.document_outline) {
    rules.push({
      ruleType: 'metadata',
      ruleKey: 'document_outline',
      ruleData: regulation.document_outline,
      description: '문서 목차',
    })
  }

  // ui_quick_facts (메타데이터)
  if (regulation.ui_quick_facts) {
    rules.push({
      ruleType: 'metadata',
      ruleKey: 'ui_quick_facts',
      ruleData: regulation.ui_quick_facts,
      description: 'UI 퀵팩트',
    })
  }

  return rules
}

async function resolveVersion(versionId?: number) {
  if (versionId) {
    const rows = await sql`
      select id, year, title, status, source_files,
             (metadata->>'source_sha256') as stored_sha256
      from regulation_versions
      where id = ${versionId}
      limit 1
    `
    if (rows.length === 0) throw new Error(`Version ${versionId} not found`)
    return rows[0]
  }

  const rows = await sql`
    select id, year, title, status, source_files,
           (metadata->>'source_sha256') as stored_sha256
    from regulation_versions
    where status = 'active'
    order by year desc, id desc
    limit 1
  `
  if (rows.length === 0) throw new Error('No active regulation version found')
  return rows[0]
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  // 1. Load and parse nurse_regulation.json
  const absolutePath = resolve(repoRoot, NURSE_REGULATION_PATH)
  const rawContent = readFileSync(absolutePath, 'utf8')
  const regulation = JSON.parse(rawContent) as Record<string, any>
  const meta = regulation._meta || {}

  // 2. Compute sha256
  const currentSha256 = createHash('sha256').update(rawContent).digest('hex')
  const source_sha256 = meta.source_sha256 || currentSha256

  console.log(`\nSource: ${NURSE_REGULATION_PATH}`)
  console.log(`Version: ${meta.version || 'unknown'}`)
  console.log(`Title: ${meta.title || 'unknown'}`)
  console.log(`SHA256 (file): ${currentSha256.slice(0, 16)}...`)
  console.log(`SHA256 (meta): ${source_sha256.slice(0, 16)}...`)

  // 3. Extract rules
  const rules = extractRules(regulation)
  const ruleTypeSummary = rules.reduce<Record<string, number>>((acc, r) => {
    acc[r.ruleType] = (acc[r.ruleType] || 0) + 1
    return acc
  }, {})

  console.log(`\nExtracted ${rules.length} rules:`)
  for (const [type, count] of Object.entries(ruleTypeSummary)) {
    console.log(`  ${type}: ${count}`)
  }

  if (!options.write) {
    console.log('\n[dry-run] Re-run with --write to insert into DB.')
    console.log(JSON.stringify({
      mode: 'dry-run',
      source: NURSE_REGULATION_PATH,
      meta: { version: meta.version, title: meta.title },
      ruleCount: rules.length,
      ruleTypeSummary,
      sampleRules: rules.slice(0, 3).map(r => ({
        ruleType: r.ruleType,
        ruleKey: r.ruleKey,
        description: r.description,
      })),
    }, null, 2))
    return
  }

  // 4. Resolve target version
  const version = await resolveVersion(options.versionId)
  console.log(`\nTarget version: id=${version.id}, year=${version.year}, status=${version.status}`)

  // 5. Check sha256 for skip
  if (!options.force && version.stored_sha256 === currentSha256) {
    console.log(`\nSHA256 unchanged (${currentSha256.slice(0, 16)}...). Skipping.`)
    console.log('Use --force to override.')
    return
  }

  // 6. Write to DB (idempotent: delete + re-insert)
  await sql.begin(async (tx) => {
    // Delete existing rules from this source
    const deleted = await tx`
      delete from calculation_rules
      where version_id = ${version.id}
        and description like '%nurse_regulation%'
        or (version_id = ${version.id} and rule_key in (
          select rule_key from calculation_rules
          where version_id = ${version.id}
            and rule_type in (${sql(Object.keys(ruleTypeSummary))})
            and (rule_scope = ${SOURCE_FILE_KEY} or rule_scope is null)
        ))
    `
    console.log(`Deleted existing rules for version ${version.id}`)

    // Insert new rules
    for (const rule of rules) {
      await tx`
        insert into calculation_rules (
          version_id, rule_type, rule_key, rule_data,
          rule_scope, description
        )
        values (
          ${version.id},
          ${rule.ruleType},
          ${rule.ruleKey},
          ${tx.json(rule.ruleData as any)},
          ${SOURCE_FILE_KEY},
          ${rule.description}
        )
      `
    }
    console.log(`Inserted ${rules.length} rules`)

    // Update source_files in regulation_versions
    const existingFiles: string[] = (version.source_files as string[]) || []
    const updatedFiles = Array.from(new Set([...existingFiles, SOURCE_FILE_KEY]))
    await tx`
      update regulation_versions
      set source_files = ${tx.json(updatedFiles)}
      where id = ${version.id}
    `
    console.log(`Updated source_files: ${JSON.stringify(updatedFiles)}`)
  })

  // 7. Verification
  const [countRow] = await sql`
    select count(*)::int as total
    from calculation_rules
    where version_id = ${version.id}
      and rule_scope = ${SOURCE_FILE_KEY}
  `
  console.log(`\nVerification: ${countRow.total} rules with source=${SOURCE_FILE_KEY}`)
  console.log('Done.')
}

main()
  .catch((error) => {
    console.error(error?.stack || error?.message || error)
    process.exitCode = 1
  })
  .finally(async () => {
    await sql.end({ timeout: 1 })
  })
