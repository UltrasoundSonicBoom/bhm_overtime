/**
 * Task D2: hospital_rule_master_2026.json → rule_versions / rule_entries 적재
 *
 * 사용법:
 *   npx tsx scripts/migrate-rules-from-json.ts            # dry-run (기본값)
 *   npx tsx scripts/migrate-rules-from-json.ts --apply    # 실제 DB 적재
 *
 * 주요 동작:
 *   - 최상위 키를 category로, 내부 경로를 flat dot-path key로 변환
 *   - rule_versions에 "2026.1.0" 행 upsert
 *   - rule_entries에 category + key 단위로 upsert
 *   - --apply 없이는 예정 row 수만 출력하고 종료
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq, and } from 'drizzle-orm'
import { ruleVersions, ruleEntries } from '../src/db/schema'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const APPLY = process.argv.includes('--apply')
const VERSION = '2026.1.0'
const EFFECTIVE_FROM = '2026-01-01'
const CHANGE_NOTE = '2026년 단체협약 기반 마스터 룰 초기 적재 (hospital_rule_master_2026.json)'

// ── flat-key 변환 ──────────────────────────────────────────────────────────────

type Entry = { category: string; key: string; value: unknown }

/**
 * 중첩 객체를 dot-path entries 배열로 전개한다.
 * 배열은 인덱스를 키로 사용 (예: "base_salary_by_year.0").
 * 리프 값(숫자, 문자열, boolean, null)이면 entry를 생성한다.
 * 배열/객체가 작은 경우 전체를 하나의 jsonb value로 저장할 수도 있지만,
 * 여기서는 조회 편의를 위해 리프 레벨까지 분해한다.
 */
function flatten(obj: unknown, prefix: string): { key: string; value: unknown }[] {
  if (obj === null || typeof obj !== 'object') {
    return [{ key: prefix, value: obj }]
  }
  if (Array.isArray(obj)) {
    // 배열은 전체를 하나의 jsonb value로 저장 (개별 인덱스 분해 시 key 폭발)
    return [{ key: prefix, value: obj }]
  }
  const entries: { key: string; value: unknown }[] = []
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const childKey = prefix ? `${prefix}.${k}` : k
    if (v === null || typeof v !== 'object') {
      entries.push({ key: childKey, value: v })
    } else if (Array.isArray(v)) {
      entries.push({ key: childKey, value: v })
    } else {
      entries.push(...flatten(v, childKey))
    }
  }
  return entries
}

function buildEntries(json: Record<string, unknown>): Entry[] {
  const result: Entry[] = []
  for (const [category, subtree] of Object.entries(json)) {
    if (category === '_meta') continue
    for (const { key, value } of flatten(subtree, '')) {
      result.push({ category, key, value })
    }
  }
  return result
}

// ── 메인 ──────────────────────────────────────────────────────────────────────

async function main() {
  const jsonPath = path.resolve(__dirname, '../../data/hospital_rule_master_2026.json')
  if (!fs.existsSync(jsonPath)) {
    console.error(`[ERROR] 파일 없음: ${jsonPath}`)
    process.exit(1)
  }

  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as Record<string, unknown>
  const entries = buildEntries(raw)

  console.log(`\n[D2 Migration] hospital_rule_master_2026.json → DB`)
  console.log(`  버전: ${VERSION}  적용일: ${EFFECTIVE_FROM}`)
  console.log(`  변환된 row 수: ${entries.length}`)

  // 카테고리별 row 수 미리보기
  const byCat: Record<string, number> = {}
  for (const e of entries) {
    byCat[e.category] = (byCat[e.category] || 0) + 1
  }
  console.log('\n  카테고리별 row 수:')
  for (const [cat, cnt] of Object.entries(byCat)) {
    console.log(`    ${cat.padEnd(40)} ${cnt}`)
  }

  if (!APPLY) {
    console.log('\n[dry-run] --apply 플래그 없음. DB 변경 없이 종료합니다.')
    console.log('실제 적재하려면: npx tsx scripts/migrate-rules-from-json.ts --apply\n')
    return
  }

  // ── DB 연결 ──
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('[ERROR] DATABASE_URL 환경변수가 설정되지 않았습니다.')
    process.exit(1)
  }
  const client = postgres(connectionString, { max: 1 })
  const db = drizzle(client)

  try {
    // 1) rule_versions upsert
    console.log('\n[적재 중] rule_versions upsert...')
    const existing = await db
      .select()
      .from(ruleVersions)
      .where(eq(ruleVersions.version, VERSION))
    let versionId: number
    if (existing.length > 0) {
      versionId = existing[0].id
      console.log(`  기존 버전 발견 (id=${versionId}), 재사용합니다.`)
    } else {
      const [inserted] = await db
        .insert(ruleVersions)
        .values({
          version: VERSION,
          effectiveFrom: EFFECTIVE_FROM,
          isActive: false,
          changeNote: CHANGE_NOTE,
        })
        .returning({ id: ruleVersions.id })
      versionId = inserted.id
      console.log(`  신규 버전 생성 (id=${versionId})`)
    }

    // 2) rule_entries upsert (배치 처리)
    const BATCH = 200
    let inserted = 0
    let updated = 0
    console.log(`\n[적재 중] rule_entries (${entries.length}행, 배치=${BATCH})...`)

    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH)
      for (const e of batch) {
        const existing = await db
          .select({ id: ruleEntries.id })
          .from(ruleEntries)
          .where(and(eq(ruleEntries.versionId, versionId), eq(ruleEntries.key, `${e.category}.${e.key}`)))
        if (existing.length > 0) {
          await db
            .update(ruleEntries)
            .set({ valueJson: e.value as Record<string, unknown>, updatedAt: new Date() })
            .where(eq(ruleEntries.id, existing[0].id))
          updated++
        } else {
          await db.insert(ruleEntries).values({
            versionId,
            category: e.category,
            key: `${e.category}.${e.key}`,
            valueJson: e.value as Record<string, unknown>,
          })
          inserted++
        }
      }
      process.stdout.write(`\r  진행: ${Math.min(i + BATCH, entries.length)}/${entries.length}`)
    }
    console.log()

    // 3) 검증 쿼리
    const countResult = await db
      .select()
      .from(ruleEntries)
      .where(eq(ruleEntries.versionId, versionId))
    console.log(`\n[검증] DB 내 version_id=${versionId} 행 수: ${countResult.length}`)
    console.log(`  신규 삽입: ${inserted}, 업데이트: ${updated}`)
    if (countResult.length !== entries.length) {
      console.warn(`  [경고] 기대=${entries.length}, 실제=${countResult.length} — 불일치 확인 필요`)
    } else {
      console.log('  [OK] JSON vs DB 행 수 일치')
    }
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error('[FATAL]', e)
  process.exit(1)
})
