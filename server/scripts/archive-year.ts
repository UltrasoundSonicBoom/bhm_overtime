/**
 * Task D5: 연도별 시간외/휴가 기록 아카이빙
 *
 * 사용법:
 *   npx tsx scripts/archive-year.ts --year=2025            # dry-run (기본값)
 *   npx tsx scripts/archive-year.ts --year=2025 --apply    # 실제 DB 아카이빙
 *
 * 주요 동작:
 *   - 대상 연도의 app_events에서 사용자별 시간외/휴가 통계를 집계한다.
 *   - yearly_archives 테이블에 upsert (재실행 안전).
 *   - 아카이빙 후 해당 연도의 원본 레코드는 읽기 전용으로 간주 (삭제하지 않음).
 *   - --apply 없이는 예정 row 수만 출력하고 종료한다.
 */

import { fileURLToPath } from 'url'
import path from 'path'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq, and, gte, sql } from 'drizzle-orm'
import { yearlyArchives, ruleVersions } from '../src/db/schema'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
void __dirname // suppress unused warning

const APPLY = process.argv.includes('--apply')
const YEAR_ARG = process.argv.find((a) => a.startsWith('--year='))
const YEAR = YEAR_ARG ? parseInt(YEAR_ARG.split('=')[1], 10) : new Date().getFullYear() - 1

if (isNaN(YEAR) || YEAR < 2020 || YEAR > 2100) {
  console.error(`[ERROR] --year 값이 유효하지 않습니다: ${YEAR_ARG}`)
  process.exit(1)
}

// ── 아카이브 요약 타입 ───────────────────────────────────────────────────────

interface MonthlySummary {
  month: number          // 1-12
  overtimeHours: number
  totalAllowances: number
  payslipCount: number
}

interface YearlySummary {
  year: number
  totalOvertimeHours: number
  totalAllowances: number
  payslipCount: number
  monthlyBreakdown: MonthlySummary[]
}

// ── 메인 ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n[D5 Archive] 연도 ${YEAR} 아카이빙`)
  console.log(`  모드: ${APPLY ? '실제 적재' : 'dry-run'}`)

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('[ERROR] DATABASE_URL 환경변수가 설정되지 않았습니다.')
    process.exit(1)
  }

  const client = postgres(connectionString, { max: 1 })
  const db = drizzle(client)

  try {
    // 1) 해당 연도의 활성 규정 버전 조회
    const yearStart = `${YEAR}-01-01`

    const activeRule = await db
      .select({ version: ruleVersions.version })
      .from(ruleVersions)
      .where(
        and(
          eq(ruleVersions.isActive, true),
          gte(ruleVersions.effectiveFrom, yearStart),
        ),
      )
      .limit(1)

    const ruleVersion = activeRule.length > 0 ? activeRule[0].version : `${YEAR}.1.0`
    console.log(`  적용 규정 버전: ${ruleVersion}`)

    // 2) app_events에서 연도별 통계 집계 (overtime_calc, payslip_parse 이벤트 기준)
    //    app_events 테이블 구조: id, anon_id, user_id, event_type, payload, ts
    type AggRow = { user_id: string; month: number; overtime_hours: number; allowances: number; payslip_count: number }
    const rows = await db.execute<AggRow>(sql`
      SELECT
        user_id::text,
        EXTRACT(MONTH FROM ts)::int AS month,
        COALESCE(SUM((payload->>'overtimeHours')::float), 0)::float AS overtime_hours,
        COALESCE(SUM((payload->>'totalAllowances')::float), 0)::float AS allowances,
        COUNT(*) FILTER (WHERE event_type = 'payslip_parse') AS payslip_count
      FROM app_events
      WHERE
        user_id IS NOT NULL
        AND ts >= ${yearStart}::date
        AND ts < ${String(YEAR + 1) + '-01-01'}::date
        AND event_type IN ('overtime_calc', 'payslip_parse')
      GROUP BY user_id, EXTRACT(MONTH FROM ts)
      ORDER BY user_id, month
    `)

    // 3) 사용자별 집계
    const byUser = new Map<string, MonthlySummary[]>()
    for (const row of rows) {
      if (!row.user_id) continue
      const uid = String(row.user_id)
      if (!byUser.has(uid)) byUser.set(uid, [])
      byUser.get(uid)!.push({
        month: Number(row.month),
        overtimeHours: Number(row.overtime_hours),
        totalAllowances: Number(row.allowances),
        payslipCount: Number(row.payslip_count),
      })
    }

    console.log(`\n  집계 대상 사용자 수: ${byUser.size}`)

    if (byUser.size === 0) {
      console.log('  [INFO] 아카이빙할 데이터가 없습니다.')
      await client.end()
      return
    }

    if (!APPLY) {
      console.log('\n[dry-run] --apply 플래그 없음. DB 변경 없이 종료합니다.')
      console.log(`실제 적재하려면: npx tsx scripts/archive-year.ts --year=${YEAR} --apply\n`)

      // 예시 요약 출력
      let sample = 0
      for (const [uid, months] of byUser) {
        if (sample++ >= 3) break
        const total = months.reduce((s, m) => ({ ...s, overtimeHours: s.overtimeHours + m.overtimeHours, payslipCount: s.payslipCount + m.payslipCount }), { overtimeHours: 0, payslipCount: 0 })
        console.log(`  user=${uid.slice(0, 8)}... months=${months.length} overtimeH=${total.overtimeHours.toFixed(1)} payslips=${total.payslipCount}`)
      }
      await client.end()
      return
    }

    // 4) yearly_archives upsert
    let upserted = 0
    let skipped = 0

    for (const [userId, months] of byUser) {
      const summary: YearlySummary = {
        year: YEAR,
        totalOvertimeHours: months.reduce((s, m) => s + m.overtimeHours, 0),
        totalAllowances: months.reduce((s, m) => s + m.totalAllowances, 0),
        payslipCount: months.reduce((s, m) => s + m.payslipCount, 0),
        monthlyBreakdown: months,
      }

      // 이미 존재하면 업데이트, 없으면 삽입 (upsert)
      const existing = await db
        .select({ id: yearlyArchives.id })
        .from(yearlyArchives)
        .where(and(eq(yearlyArchives.userId, userId), eq(yearlyArchives.year, YEAR)))
        .limit(1)

      if (existing.length > 0) {
        await db
          .update(yearlyArchives)
          .set({
            summaryJson: summary as unknown as Record<string, unknown>,
            ruleVersion,
            archivedAt: new Date(),
          })
          .where(eq(yearlyArchives.id, existing[0].id))
        skipped++
      } else {
        await db.insert(yearlyArchives).values({
          userId,
          year: YEAR,
          summaryJson: summary as unknown as Record<string, unknown>,
          ruleVersion,
        })
        upserted++
      }
    }

    console.log(`\n[완료] yearly_archives 적재`)
    console.log(`  신규: ${upserted}건 / 업데이트: ${skipped}건`)
    console.log(`  대상 연도 ${YEAR}의 데이터는 이제 yearly_archives에서 읽기 전용으로 조회 가능합니다.`)
    console.log(`\n  다음 단계:`)
    console.log(`    - Supabase Studio에서 SELECT * FROM yearly_archives WHERE year = ${YEAR} 확인`)
    console.log(`    - 아카이빙 완료 후 새 규정 버전(${YEAR + 1}.1.0)을 active로 전환하세요.`)
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('[FATAL]', err)
  process.exit(1)
})
