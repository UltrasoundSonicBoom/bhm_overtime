import { Hono } from 'hono'
import { db } from '../db/client.js'
import {
  regulationVersions,
  payTables,
  allowances,
  calculationRules,
  faqEntries,
  leaveTypes,
  ceremonies,
} from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import {
  evaluateNurseRegulationScenarios,
  loadNurseRegulation,
} from '../services/nurse-regulation.js'

const dataRoutes = new Hono()

dataRoutes.get('/nurse-regulation', async (c) => {
  const year = Number(c.req.query('year') || 2026)

  try {
    const regulation = loadNurseRegulation(year)
    const scenarioReport = evaluateNurseRegulationScenarios(regulation)
    c.header('Cache-Control', 'public, max-age=3600')
    return c.json({
      ...regulation,
      scenarioReport,
    })
  } catch (error) {
    console.error('[data] nurse regulation load failed:', error)
    return c.json({
      error: 'Failed to load nurse regulation',
    }, 404)
  }
})

/**
 * GET /api/data/bundle?year=2026
 * active 버전의 모든 데이터를 DATA 객체와 동일한 JSON 형태로 반환
 */
dataRoutes.get('/bundle', async (c) => {
  const yearParam = c.req.query('year')

  // active 버전 조회 (year 지정 시 해당 연도, 아니면 active)
  const versions = yearParam
    ? await db.select().from(regulationVersions)
        .where(and(eq(regulationVersions.year, Number(yearParam)), eq(regulationVersions.status, 'active')))
    : await db.select().from(regulationVersions)
        .where(eq(regulationVersions.status, 'active'))

  if (versions.length === 0) {
    return c.json({ error: 'No active regulation version found' }, 404)
  }
  const vId = versions[0].id

  // 병렬 조회
  const [payRows, allowRows, ruleRows, faqRows, leaveRows, ceremonyRows] = await Promise.all([
    db.select().from(payTables).where(eq(payTables.versionId, vId)),
    db.select().from(allowances).where(eq(allowances.versionId, vId)),
    db.select().from(calculationRules).where(eq(calculationRules.versionId, vId)),
    db.select().from(faqEntries).where(eq(faqEntries.versionId, vId)),
    db.select().from(leaveTypes).where(eq(leaveTypes.versionId, vId)),
    db.select().from(ceremonies).where(eq(ceremonies.versionId, vId)),
  ])

  // ── payTables 복원 ──
  const payTablesObj: Record<string, any> = {}
  for (const row of payRows) {
    if (!payTablesObj[row.payTableName]) {
      payTablesObj[row.payTableName] = {
        grades: [],
        gradeLabels: {},
        basePay: {},
        abilityPay: {},
        bonus: {},
        familySupport: {},
        autoPromotion: {},
      }
    }
    const pt = payTablesObj[row.payTableName]
    pt.grades.push(row.grade)
    pt.gradeLabels[row.grade] = row.gradeLabel
    pt.basePay[row.grade] = row.basePay
    pt.abilityPay[row.grade] = row.abilityPay
    pt.bonus[row.grade] = row.bonus
    pt.familySupport[row.grade] = row.familySupport
  }

  // ── allowances 복원 ──
  const allowancesObj: Record<string, any> = {}
  for (const row of allowRows) {
    allowancesObj[row.key] = row.value
  }

  // ── calculation_rules → 개별 필드 복원 ──
  const ruleMap = new Map<string, Map<string, any>>()
  for (const row of ruleRows) {
    if (!ruleMap.has(row.ruleType)) ruleMap.set(row.ruleType, new Map())
    ruleMap.get(row.ruleType)!.set(row.ruleKey, row.ruleData)
  }

  // jobTypes
  const jobTypes: Record<string, any> = {}
  const jobTypeRules = ruleMap.get('jobType')
  if (jobTypeRules) {
    for (const [key, data] of jobTypeRules) {
      jobTypes[key] = data
    }
  }

  // autoPromotion → payTables에 병합
  const autoPromoRules = ruleMap.get('autoPromotion')
  if (autoPromoRules) {
    for (const [key, data] of autoPromoRules) {
      const [tableName, grade] = key.split('_')
      if (payTablesObj[tableName]) {
        payTablesObj[tableName].autoPromotion[grade] = data
      }
    }
  }

  // 단일 값 규칙
  const getRule = (type: string, key: string) => ruleMap.get(type)?.get(key)

  // ── faq 복원 ──
  const faq = faqRows
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map(f => ({
      category: f.category,
      q: f.question,
      a: f.answer,
      ref: f.articleRef,
    }))

  // ── leaveQuotas 복원 ──
  const leaveQuotasTypes = leaveRows.map(lt => {
    const extra = lt.extraData as any || {}
    return {
      id: lt.typeId,
      label: lt.label,
      category: lt.category,
      isPaid: lt.isPaid,
      quota: lt.quota,
      usesAnnual: lt.usesAnnual,
      deductType: lt.deductType,
      gender: lt.gender,
      ref: lt.articleRef,
      note: extra.note || undefined,
      ceremonyDays: extra.ceremonyDays || undefined,
      ceremonyPay: extra.ceremonyPay || undefined,
      docs: extra.docs || undefined,
      extra: extra.extra || undefined,
      isTimeBased: extra.isTimeBased || undefined,
    }
  })

  // ── ceremonies 복원 ──
  const ceremoniesArr = ceremonyRows.map(cr => ({
    type: cr.eventType,
    leave: isNaN(Number(cr.leaveDays)) ? cr.leaveDays : Number(cr.leaveDays),
    hospitalPay: cr.hospitalPay,
    pensionPay: cr.pensionPay,
    coopPay: cr.coopPay,
    docs: cr.docs,
  }))

  // ── DATA 객체 조립 ──
  const DATA = {
    jobTypes,
    payTables: payTablesObj,
    allowances: allowancesObj,
    longServicePay: getRule('longServicePay', 'tiers'),
    familyAllowance: getRule('familyAllowance', 'rates'),
    seniorityRates: getRule('seniorityRate', 'tiers'),
    annualLeave: getRule('annualLeave', 'rules'),
    leaveQuotas: {
      year: versions[0].year,
      categories: getRule('leaveQuotasMeta', 'categories'),
      types: leaveQuotasTypes,
      miscarriageLeave: getRule('leaveQuotasMeta', 'miscarriageLeave'),
      sickLeaveRef: getRule('leaveQuotasMeta', 'sickLeaveRef'),
    },
    ceremonies: ceremoniesArr,
    leaveOfAbsence: getRule('leaveOfAbsence', 'types'),
    severancePay: getRule('severancePay', 'tiers'),
    shiftSchedule: getRule('shiftSchedule', 'shifts'),
    medicalDiscount: getRule('medicalDiscount', 'rates'),
    refreshCategories: getRule('refreshCategories', 'categories'),
    deductions: getRule('deductions', 'rates'),
    faq,
    handbook: getRule('handbook', 'sections'),
    severanceMultipliersPre2001: getRule('severanceMultipliersPre2001', 'tiers'),
    familySupportMonths: getRule('familySupportMonths', 'months'),
    recoveryDay: getRule('recoveryDay', 'params'),
  }

  c.header('Cache-Control', 'public, max-age=3600')
  return c.json(DATA)
})

export default dataRoutes
