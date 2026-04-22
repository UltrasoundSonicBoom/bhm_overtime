import type { IncomingMessage, ServerResponse } from 'http'

export const config = { api: { bodyParser: false } }

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const { neon } = await import('@neondatabase/serverless')
    const url = new URL(req.url!, `http://${req.headers.host}`)
    const yearParam = url.searchParams.get('year')

    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'DATABASE_URL missing' }))
      return
    }

    const sql = neon(connectionString)

    // Get active regulation version
    const versions = yearParam
      ? await sql`SELECT * FROM regulation_versions WHERE year = ${Number(yearParam)} AND status = 'active' LIMIT 1`
      : await sql`SELECT * FROM regulation_versions WHERE status = 'active' LIMIT 1`

    if (versions.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'No active regulation version found' }))
      return
    }

    const vId = versions[0].id

    const [payRows, allowRows, ruleRows, faqRows, leaveRows, ceremonyRows] = await Promise.all([
      sql`SELECT * FROM pay_tables WHERE version_id = ${vId}`,
      sql`SELECT * FROM allowances WHERE version_id = ${vId}`,
      sql`SELECT * FROM calculation_rules WHERE version_id = ${vId}`,
      sql`SELECT * FROM faq_entries WHERE version_id = ${vId} ORDER BY sort_order ASC`,
      sql`SELECT * FROM leave_types WHERE version_id = ${vId}`,
      sql`SELECT * FROM ceremonies WHERE version_id = ${vId}`,
    ])

    // ── payTables 복원 ──
    const payTablesObj: Record<string, any> = {}
    for (const row of payRows) {
      if (!payTablesObj[row.pay_table_name]) {
        payTablesObj[row.pay_table_name] = {
          grades: [],
          gradeLabels: {},
          basePay: {},
          abilityPay: {},
          bonus: {},
          familySupport: {},
          autoPromotion: {},
        }
      }
      const pt = payTablesObj[row.pay_table_name]
      pt.grades.push(row.grade)
      pt.gradeLabels[row.grade] = row.grade_label
      pt.basePay[row.grade] = row.base_pay
      pt.abilityPay[row.grade] = row.ability_pay
      pt.bonus[row.grade] = row.bonus
      pt.familySupport[row.grade] = row.family_support
    }

    // ── allowances 복원 ──
    const allowancesObj: Record<string, any> = {}
    for (const row of allowRows) {
      allowancesObj[row.key] = row.value
    }

    // ── calculation_rules ──
    const ruleMap = new Map<string, Map<string, any>>()
    for (const row of ruleRows) {
      if (!ruleMap.has(row.rule_type)) ruleMap.set(row.rule_type, new Map())
      ruleMap.get(row.rule_type)!.set(row.rule_key, row.rule_data)
    }

    const jobTypes: Record<string, any> = {}
    const jobTypeRules = ruleMap.get('jobType')
    if (jobTypeRules) {
      for (const [key, data] of jobTypeRules) {
        jobTypes[key] = data
      }
    }

    const autoPromoRules = ruleMap.get('autoPromotion')
    if (autoPromoRules) {
      for (const [key, data] of autoPromoRules) {
        const [tableName, grade] = key.split('_')
        if (payTablesObj[tableName]) {
          payTablesObj[tableName].autoPromotion[grade] = data
        }
      }
    }

    const getRule = (type: string, key: string) => ruleMap.get(type)?.get(key)

    // ── faq 복원 ──
    const faq = faqRows.map((f: any) => ({
      category: f.category,
      q: f.question,
      a: f.answer,
      ref: f.article_ref,
    }))

    // ── leaveQuotas 복원 ──
    const leaveQuotasTypes = leaveRows.map((lt: any) => {
      const extra = lt.extra_data || {}
      return {
        id: lt.type_id,
        label: lt.label,
        category: lt.category,
        isPaid: lt.is_paid,
        quota: lt.quota,
        usesAnnual: lt.uses_annual,
        deductType: lt.deduct_type,
        gender: lt.gender,
        ref: lt.article_ref,
        note: extra.note || undefined,
        ceremonyDays: extra.ceremonyDays || undefined,
        ceremonyPay: extra.ceremonyPay || undefined,
        docs: extra.docs || undefined,
        extra: extra.extra || undefined,
        isTimeBased: extra.isTimeBased || undefined,
      }
    })

    // ── ceremonies 복원 ──
    const ceremoniesArr = ceremonyRows.map((cr: any) => ({
      type: cr.event_type,
      leave: isNaN(Number(cr.leave_days)) ? cr.leave_days : Number(cr.leave_days),
      hospitalPay: cr.hospital_pay,
      pensionPay: cr.pension_pay,
      coopPay: cr.coop_pay,
      docs: cr.docs,
    }))

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

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    })
    res.end(JSON.stringify(DATA))
  } catch (err: any) {
    console.error('[bundle] error:', err)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: String(err?.message || err) }))
  }
}
