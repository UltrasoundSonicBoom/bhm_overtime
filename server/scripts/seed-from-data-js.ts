/**
 * Seed script: data.js → Supabase PostgreSQL
 * DATA 객체의 모든 데이터를 10개 테이블에 삽입
 * 멱등: 재실행 시 해당 버전 데이터 삭제 후 재삽입
 */
import 'dotenv/config'
import postgres from 'postgres'
import { readFileSync } from 'fs'
import { join } from 'path'
import vm from 'node:vm'

const sqlClient = postgres(process.env.DATABASE_URL!, { prepare: false })

// data.js에서 DATA 객체를 Node.js vm 모듈로 안전하게 로드
function loadDataFromFile(): Record<string, unknown> {
  const dataPath = join(import.meta.dirname, '..', '..', 'data.js')
  const content = readFileSync(dataPath, 'utf-8')
  // 첫 번째 { 부터 마지막 }; 까지 추출
  const start = content.indexOf('{')
  const end = content.lastIndexOf('};')
  const objStr = content.slice(start, end + 1)
  const script = new vm.Script('var result = ' + objStr)
  const context = vm.createContext({ result: null })
  script.runInContext(context)
  return context.result as Record<string, unknown>
}

async function main() {
  console.log('Loading DATA from data.js...')
  const DATA = loadDataFromFile() as any

  // 1. regulation_version 생성 (또는 기존 삭제 후 재생성)
  console.log('\n── regulation_versions ──')
  await sqlClient`DELETE FROM regulation_versions WHERE year = 2026`
  const [version] = await sqlClient`
    INSERT INTO regulation_versions (year, title, status, effective_date)
    VALUES (2026, '2026 조합원 수첩', 'active', '2025-10-23')
    RETURNING id
  `
  const vId = version.id
  console.log(`✓ Version created: id=${vId}, year=2026, status=active`)

  // 2. pay_tables (3 보수표 × 9 등급 = 27건)
  console.log('\n── pay_tables ──')
  let payCount = 0
  for (const [tableName, tableData] of Object.entries(DATA.payTables) as any) {
    for (const grade of tableData.grades) {
      await sqlClient`
        INSERT INTO pay_tables (version_id, pay_table_name, grade, grade_label, base_pay, ability_pay, bonus, family_support)
        VALUES (
          ${vId},
          ${tableName},
          ${grade},
          ${tableData.gradeLabels[grade]},
          ${sqlClient.json(tableData.basePay[grade])},
          ${tableData.abilityPay[grade]},
          ${tableData.bonus[grade]},
          ${tableData.familySupport[grade]}
        )
      `
      payCount++
    }
  }
  console.log(`✓ ${payCount} pay_tables rows`)

  // 3. allowances
  console.log('\n── allowances ──')
  let allowCount = 0
  const allowanceLabels: Record<string, [string, string]> = {
    mealSubsidy: ['급식보조비', 'fixed'],
    transportSubsidy: ['교통보조비', 'fixed'],
    refreshBenefit: ['리프레시지원비', 'fixed'],
    selfDevAllowance: ['자기계발별정수당', 'fixed'],
    specialPay5: ['별정수당5', 'fixed'],
    militaryService: ['군복무수당', 'fixed'],
    onCallStandby: ['온콜대기수당', 'fixed'],
    onCallTransport: ['온콜교통비', 'fixed'],
    onCallCommuteHours: ['온콜출퇴근인정시간', 'fixed'],
    nightShiftBonus: ['야간근무가산금', 'fixed'],
    dutyAllowance: ['일직/숙직비', 'fixed'],
    overtimeUnit: ['시간외근무 계산단위(분)', 'fixed'],
    weeklyHours: ['월 소정근로시간', 'fixed'],
    preceptorPay: ['프리셉터 교육수당', 'fixed'],
    callCenterPay: ['콜센터 근무수당', 'fixed'],
    overtimeRates: ['시간외할증률', 'rate'],
  }
  for (const [key, value] of Object.entries(DATA.allowances)) {
    const [label, category] = allowanceLabels[key] || [key, 'fixed']
    await sqlClient`
      INSERT INTO allowances (version_id, key, value, label, category)
      VALUES (${vId}, ${key}, ${sqlClient.json(value)}, ${label}, ${category})
    `
    allowCount++
  }
  console.log(`✓ ${allowCount} allowances rows`)

  // 4. calculation_rules — 모든 규칙/참조 데이터를 rule_type으로 분류
  console.log('\n── calculation_rules ──')
  let ruleCount = 0

  const rules: Array<{ type: string; key: string; data: unknown; desc: string }> = []

  // jobTypes
  for (const [jobName, jobData] of Object.entries(DATA.jobTypes)) {
    rules.push({ type: 'jobType', key: jobName, data: jobData, desc: `직종: ${jobName}` })
  }

  // autoPromotion (per pay table)
  for (const [tableName, tableData] of Object.entries(DATA.payTables) as any) {
    if (tableData.autoPromotion) {
      for (const [grade, promo] of Object.entries(tableData.autoPromotion) as any) {
        rules.push({
          type: 'autoPromotion',
          key: `${tableName}_${grade}`,
          data: promo,
          desc: `${tableName} ${grade}→${promo.next} (${promo.years}년)`,
        })
      }
    }
  }

  // 단일 rule_key 규칙들
  const singleRules: Array<[string, string, unknown, string]> = [
    ['longServicePay', 'tiers', DATA.longServicePay, '장기근속수당 구간'],
    ['familyAllowance', 'rates', DATA.familyAllowance, '가족수당'],
    ['seniorityRate', 'tiers', DATA.seniorityRates, '근속가산율'],
    ['annualLeave', 'rules', DATA.annualLeave, '연차 규정'],
    ['severancePay', 'tiers', DATA.severancePay, '퇴직수당 (2015.6.30 이전)'],
    ['severanceMultipliersPre2001', 'tiers', DATA.severanceMultipliersPre2001, '퇴직금 누진배수 (2001.08.31 이전)'],
    ['shiftSchedule', 'shifts', DATA.shiftSchedule, '교대근무 시간표'],
    ['medicalDiscount', 'rates', DATA.medicalDiscount, '진료비 감면'],
    ['refreshCategories', 'categories', DATA.refreshCategories, '리프레시 사용범위'],
    ['deductions', 'rates', DATA.deductions, '공제 항목 비율'],
    ['familySupportMonths', 'months', DATA.familySupportMonths, '가계지원비 지급 월'],
    ['recoveryDay', 'params', DATA.recoveryDay, '리커버리 데이 파라미터'],
    ['leaveOfAbsence', 'types', DATA.leaveOfAbsence, '휴직 제도'],
    ['leaveQuotasMeta', 'categories', DATA.leaveQuotas.categories, '휴가 카테고리'],
    ['leaveQuotasMeta', 'miscarriageLeave', DATA.leaveQuotas.miscarriageLeave, '유산/사산 휴가'],
    ['leaveQuotasMeta', 'sickLeaveRef', DATA.leaveQuotas.sickLeaveRef, '병가 참조'],
    ['handbook', 'sections', DATA.handbook, '규정 핸드북 (위키용)'],
  ]
  for (const [type, key, data, desc] of singleRules) {
    rules.push({ type, key, data, desc })
  }

  for (const r of rules) {
    await sqlClient`
      INSERT INTO calculation_rules (version_id, rule_type, rule_key, rule_data, description)
      VALUES (${vId}, ${r.type}, ${r.key}, ${sqlClient.json(r.data)}, ${r.desc})
    `
    ruleCount++
  }
  console.log(`✓ ${ruleCount} calculation_rules rows`)

  // 5. faq_entries
  console.log('\n── faq_entries ──')
  let faqCount = 0
  for (let i = 0; i < DATA.faq.length; i++) {
    const f = DATA.faq[i]
    await sqlClient`
      INSERT INTO faq_entries (version_id, category, question, answer, article_ref, sort_order, is_published)
      VALUES (${vId}, ${f.category}, ${f.q}, ${f.a}, ${f.ref || null}, ${i}, true)
    `
    faqCount++
  }
  console.log(`✓ ${faqCount} faq_entries rows`)

  // 6. leave_types
  console.log('\n── leave_types ──')
  let leaveCount = 0
  for (const lt of DATA.leaveQuotas.types) {
    await sqlClient`
      INSERT INTO leave_types (version_id, type_id, label, category, is_paid, quota, uses_annual, deduct_type, gender, article_ref, extra_data)
      VALUES (
        ${vId}, ${lt.id}, ${lt.label}, ${lt.category}, ${lt.isPaid},
        ${lt.quota || null}, ${lt.usesAnnual}, ${lt.deductType || 'none'},
        ${lt.gender || null}, ${lt.ref || null},
        ${sqlClient.json({
          note: lt.note || null,
          ceremonyDays: lt.ceremonyDays || null,
          ceremonyPay: lt.ceremonyPay || null,
          docs: lt.docs || null,
          extra: lt.extra || null,
          isTimeBased: lt.isTimeBased || null,
        })}
      )
    `
    leaveCount++
  }
  console.log(`✓ ${leaveCount} leave_types rows`)

  // 7. ceremonies
  console.log('\n── ceremonies ──')
  let ceremonyCount = 0
  for (const c of DATA.ceremonies) {
    await sqlClient`
      INSERT INTO ceremonies (version_id, event_type, leave_days, hospital_pay, pension_pay, coop_pay, docs)
      VALUES (
        ${vId}, ${c.type}, ${String(c.leave)}, ${c.hospitalPay || null},
        ${c.pensionPay || null}, ${c.coopPay || null}, ${c.docs || null}
      )
    `
    ceremonyCount++
  }
  console.log(`✓ ${ceremonyCount} ceremonies rows`)

  // ── 검증 ──
  console.log('\n══ Verification ══')
  const counts = await sqlClient`
    SELECT
      (SELECT COUNT(*)::int FROM pay_tables WHERE version_id = ${vId}) as pay_tables,
      (SELECT COUNT(*)::int FROM allowances WHERE version_id = ${vId}) as allowances,
      (SELECT COUNT(*)::int FROM calculation_rules WHERE version_id = ${vId}) as rules,
      (SELECT COUNT(*)::int FROM faq_entries WHERE version_id = ${vId}) as faq,
      (SELECT COUNT(*)::int FROM leave_types WHERE version_id = ${vId}) as leave_types,
      (SELECT COUNT(*)::int FROM ceremonies WHERE version_id = ${vId}) as ceremonies
  `
  const ct = counts[0]
  console.log(`  pay_tables:        ${ct.pay_tables} (expected 27)`)
  console.log(`  allowances:        ${ct.allowances} (expected 16)`)
  console.log(`  calculation_rules: ${ct.rules}`)
  console.log(`  faq_entries:       ${ct.faq} (expected 68)`)
  console.log(`  leave_types:       ${ct.leave_types}`)
  console.log(`  ceremonies:        ${ct.ceremonies} (expected 11)`)

  // Spot check: M3 basePay
  const m3 = await sqlClient`
    SELECT base_pay FROM pay_tables
    WHERE version_id = ${vId} AND pay_table_name = '일반직' AND grade = 'M3'
  `
  const m3Expected = [54482400, 54944400, 55411200, 55874400, 56349600, 56824800, 57310800, 57796800]
  const m3Match = JSON.stringify(m3[0].base_pay) === JSON.stringify(m3Expected)
  console.log(`  M3 basePay check:  ${m3Match ? '✓ MATCH' : '✗ MISMATCH'}`)

  await sqlClient.end()
  console.log('\nDone! 🎉')
}

main().catch(e => { console.error(e); process.exit(1) })
