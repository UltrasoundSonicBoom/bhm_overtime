#!/usr/bin/env node
// JSON(computation_refs + appendix.pay_tables) 과 data.js(DATA_STATIC) 의 값이 일치하는지 검증.
// 불일치 발견 시 리포트. T2 기반: 향후 완전 자동 생성 전에 "일관성 보장" 용도.
//
// Exit 0: 모든 값 일치. Exit 1: 불일치 발견.

import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// 1) JSON 로드
const reg = JSON.parse(await readFile(resolve(ROOT, 'data/union_regulation_2026.json'), 'utf-8'))

// 2) data.js 의 DATA_STATIC 를 VM 으로 추출 (브라우저 API 없는 환경에서)
const dataJsSource = await readFile(resolve(ROOT, 'data.js'), 'utf-8')
// DATA_STATIC 정의부만 추출 (line 7 ~ `};` 종료 line 604 근처)
const match = dataJsSource.match(/const DATA_STATIC = (\{[\s\S]*?\n\});/)
if (!match) {
  console.error('data.js 에서 DATA_STATIC 을 찾지 못했습니다.')
  process.exit(2)
}
const DATA_STATIC = vm.runInNewContext('(' + match[1] + ')', {})

// 3) 검증 케이스 — computation_refs → data.js 경로
const checks = [
  { ref: 'annual_leave.base_days', dataPath: 'annualLeave.baseLeave' },
  { ref: 'overtime.rate_multiplier', dataPath: 'allowances.overtimeRates.extended' },
  { ref: 'ordinary_wage.hours_per_month', dataPath: 'allowances.weeklyHours' },
  { ref: 'meal_subsidy.monthly_won', dataPath: 'allowances.mealSubsidy' },
  { ref: 'transport_subsidy.monthly_won', dataPath: 'allowances.transportSubsidy' },
  { ref: 'family_allowance.spouse_won', dataPath: 'familyAllowance.spouse' },
  { ref: 'family_allowance.dependent_won', dataPath: 'familyAllowance.generalFamily' },
  { ref: 'overtime.night_bonus_won', dataPath: 'allowances.nightShiftBonus' },
]

// 4) pay_tables 검증: JSON appendix → DATA.payTables
const payTableCheck = () => {
  const appWage = reg.appendix.find((a) => a.id === 'app_wage')
  if (!appWage) return ['app_wage 없음']
  const ilban = appWage.tables.find((t) => t.title?.includes('일반직'))
  if (!ilban) return ['일반직 보수표 없음']
  // M3 1년차 비교
  const m3Row = ilban.rows.find((r) => r[1] === 'M3')
  if (!m3Row) return ['M3 row 없음']
  const m3Y1Json = Number(m3Row[2].replace(/,/g, ''))
  const m3Y1Data = DATA_STATIC.payTables?.['일반직']?.basePay?.M3?.[0]
  if (m3Y1Json !== m3Y1Data) {
    return [`M3 1년차 불일치: JSON=${m3Y1Json}, data.js=${m3Y1Data}`]
  }
  return []
}

// 5) 실행
const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)

let errors = []
for (const check of checks) {
  const refVal = reg.computation_refs[check.ref]?.value
  const dataVal = getPath(DATA_STATIC, check.dataPath)
  if (refVal !== dataVal) {
    errors.push(
      `✗ ${check.ref}=${refVal} (JSON) vs ${check.dataPath}=${dataVal} (data.js)`,
    )
  } else {
    console.log(`✓ ${check.ref} = ${refVal}`)
  }
}

const payErrors = payTableCheck()
if (payErrors.length === 0) {
  console.log('✓ 보수표 M3 1년차 일치')
} else {
  errors.push(...payErrors.map((e) => `✗ ${e}`))
}

if (errors.length) {
  console.error('\n=== 불일치 ===')
  errors.forEach((e) => console.error(e))
  console.error(`\n${errors.length}개 불일치. data.js 또는 JSON 중 하나를 업데이트 필요.`)
  process.exit(1)
}

console.log(`\n✓ 전체 ${checks.length + 1}개 검증 통과. JSON ↔ data.js 일치.`)
process.exit(0)
