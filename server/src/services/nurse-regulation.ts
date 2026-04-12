import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type RegulationData = {
  _meta?: {
    version?: string
    title?: string
  }
  working_hours_and_shift_rules?: {
    standard_hours?: {
      shift_templates?: Record<string, { start_minutes: number; end_minutes: number; is_work: boolean }>
    }
    shift_worker_rules?: {
      min_rest_between_shifts?: number
      max_night_shifts_per_month?: number
      age_based_night_exclusion?: { age?: number }
      forbidden_patterns?: string[][]
      recovery_day?: {
        monthly_over_7_days?: { trigger?: number }
      }
      substitute_work?: { prime_team_allowance?: number }
      night_shift_bonus?: number
    }
    overtime_and_on_call?: {
      on_call?: {
        standby_per_day?: number
        dispatch_transport?: number
        dispatch_recognized_hours?: number
      }
    }
  }
  wage_structure_and_allowances?: {
    fixed_allowances?: {
      refresh_support_yearly?: number
    }
  }
  leaves_and_holidays?: {
    petition_and_special_leaves?: {
      childbirth_spouse?: number
    }
  }
  welfare_and_training?: {
    new_hire_training?: {
      nurse_duration_weeks?: number
      icu_nurse_duration_weeks?: number
      nurse_pay_first_4_weeks_rate?: number
      preceptor_allowance?: number
    }
    congratulatory_money?: {
      birthday_gift?: number
    }
  }
  scenario_fixtures?: Array<Record<string, any>>
}

type ScenarioResult = {
  id: string
  title: string
  category: string
  passed: boolean
  expected: Record<string, unknown>
  actual: Record<string, unknown>
}

type ScenarioReport = {
  total: number
  passed: number
  failed: number
  items: ScenarioResult[]
}

const regulationCache = new Map<number, RegulationData>()

function regulationPath(year: number): string {
  return resolve(import.meta.dirname, '..', '..', '..', 'content', 'policies', String(year), 'nurse_regulation.json')
}

function normalizeShiftTemplates(regulation: RegulationData) {
  return regulation.working_hours_and_shift_rules?.standard_hours?.shift_templates ?? {
    D: { start_minutes: 420, end_minutes: 900, is_work: true },
    E: { start_minutes: 840, end_minutes: 1320, is_work: true },
    N: { start_minutes: 1260, end_minutes: 1860, is_work: true },
    OFF: { start_minutes: 0, end_minutes: 0, is_work: false },
    LEAVE: { start_minutes: 0, end_minutes: 0, is_work: false },
    EDU: { start_minutes: 540, end_minutes: 1020, is_work: false },
    '9A': { start_minutes: 540, end_minutes: 1020, is_work: false },
  }
}

function shiftEndAbsolute(shift: { start_minutes: number; end_minutes: number; is_work: boolean }) {
  if (!shift.is_work) return shift.end_minutes
  return shift.end_minutes <= shift.start_minutes ? shift.end_minutes + 1440 : shift.end_minutes
}

function restHoursBetween(
  previous: { start_minutes: number; end_minutes: number; is_work: boolean },
  current: { start_minutes: number; end_minutes: number; is_work: boolean },
) {
  if (!previous.is_work || !current.is_work) return 999
  return (current.start_minutes + 1440 - shiftEndAbsolute(previous)) / 60
}

function evaluateScheduleScenario(regulation: RegulationData, fixture: Record<string, any>): ScenarioResult {
  const rules = regulation.working_hours_and_shift_rules?.shift_worker_rules ?? {}
  const templates = normalizeShiftTemplates(regulation)
  const sequence = Array.isArray(fixture.input?.sequence) ? fixture.input.sequence as string[] : []
  const memberAge = Number(fixture.input?.member?.age ?? 0)
  const expectedFlags = Array.isArray(fixture.expected?.flags) ? fixture.expected.flags as string[] : []
  const flags = new Set<string>()
  const minRest = Number(rules.min_rest_between_shifts ?? 16)
  const maxNight = Number(rules.max_night_shifts_per_month ?? 6)
  const hardNightCap = Number((rules as { hard_monthly_night_cap?: number }).hard_monthly_night_cap ?? 9)
  const recoveryTrigger = Number(rules.recovery_day?.monthly_over_7_days?.trigger ?? 7)
  const ageCutoff = Number(rules.age_based_night_exclusion?.age ?? 40)

  let nightCount = 0
  sequence.forEach((code) => {
    if (code === 'N') nightCount += 1
  })
  if (nightCount > maxNight) flags.add('night_limit_exceeded')
  if (nightCount > hardNightCap) flags.add('night_hard_cap_exceeded')
  if (nightCount >= recoveryTrigger) flags.add('recovery_day_due')
  if (memberAge >= ageCutoff && sequence.includes('N')) flags.add('age_night_restriction')

  for (const pattern of rules.forbidden_patterns ?? []) {
    for (let index = 0; index <= sequence.length - pattern.length; index += 1) {
      const slice = sequence.slice(index, index + pattern.length)
      if (slice.join('>') === pattern.join('>')) {
        flags.add('forbidden_pattern')
      }
    }
  }

  for (let index = 1; index < sequence.length; index += 1) {
    const previous = templates[sequence[index - 1]]
    const current = templates[sequence[index]]
    if (!previous || !current) continue
    if (restHoursBetween(previous, current) < minRest) {
      flags.add('rest_gap_violation')
    }
  }

  return {
    id: String(fixture.id),
    title: String(fixture.title),
    category: String(fixture.category || 'scenario'),
    passed: expectedFlags.length === flags.size && expectedFlags.every((flag) => flags.has(flag)),
    expected: { flags: expectedFlags },
    actual: { flags: Array.from(flags).sort() },
  }
}

function evaluateAllowanceScenario(regulation: RegulationData, fixture: Record<string, any>): ScenarioResult {
  const eventType = String(fixture.input?.event_type || '')
  const actual: Record<string, unknown> = {}
  const wage = regulation as any

  switch (eventType) {
    case 'on_call_callout':
      actual.standby_pay = regulation.working_hours_and_shift_rules?.overtime_and_on_call?.on_call?.standby_per_day ?? null
      actual.transport_pay = regulation.working_hours_and_shift_rules?.overtime_and_on_call?.on_call?.dispatch_transport ?? null
      actual.recognized_hours = regulation.working_hours_and_shift_rules?.overtime_and_on_call?.on_call?.dispatch_recognized_hours ?? null
      break
    case 'prime_team_substitute':
      actual.allowance = regulation.working_hours_and_shift_rules?.shift_worker_rules?.substitute_work?.prime_team_allowance ?? null
      break
    case 'night_bonus':
      actual.allowance = regulation.working_hours_and_shift_rules?.shift_worker_rules?.night_shift_bonus ?? null
      break
    case 'preceptor_allowance':
      actual.allowance = regulation.welfare_and_training?.new_hire_training?.preceptor_allowance ?? null
      break
    case 'refresh_support':
      actual.annual_support = regulation.wage_structure_and_allowances?.fixed_allowances?.refresh_support_yearly ?? null
      break
    case 'spouse_childbirth_leave':
      actual.days = regulation.leaves_and_holidays?.petition_and_special_leaves?.childbirth_spouse ?? null
      break
    case 'birthday_gift':
      actual.gift = regulation.welfare_and_training?.congratulatory_money?.birthday_gift ?? null
      break
    case 'new_nurse_program':
      actual.duration_weeks = regulation.welfare_and_training?.new_hire_training?.nurse_duration_weeks ?? null
      actual.icu_duration_weeks = regulation.welfare_and_training?.new_hire_training?.icu_nurse_duration_weeks ?? null
      actual.initial_pay_rate = regulation.welfare_and_training?.new_hire_training?.nurse_pay_first_4_weeks_rate ?? null
      break
    case 'annual_leave_cap':
      actual.base = wage.leaves_and_holidays?.annual_leave?.base ?? null
      actual.max = wage.leaves_and_holidays?.annual_leave?.max ?? null
      break
    case 'family_allowance_spouse':
      actual.allowance = wage.wage_structure_and_allowances?.family_allowance?.spouse ?? null
      break
    case 'family_allowance_third_child':
      actual.allowance = wage.wage_structure_and_allowances?.family_allowance?.child_tiers?.third_and_above ?? null
      break
    case 'medical_discount_self':
      actual.insurance_percent = wage.medical_support?.self?.insurance_percent ?? null
      actual.select_doctor_percent = wage.medical_support?.self?.select_doctor_percent ?? null
      break
    case 'medical_discount_family':
      actual.insurance_percent = wage.medical_support?.family?.insurance_percent ?? null
      actual.non_covered_percent = wage.medical_support?.family?.non_covered_percent ?? null
      break
    case 'childcare_leave_pay':
      actual.months_1_to_6_rate = wage.leave_of_absence_and_retirement?.leave_pay_rates?.childcare_months_1_to_6?.rate ?? null
      actual.months_7_to_12_rate = wage.leave_of_absence_and_retirement?.leave_pay_rates?.childcare_months_7_to_12?.rate ?? null
      break
    case 'sick_leave_pay':
      actual.rate = wage.leave_of_absence_and_retirement?.leave_pay_rates?.sick_and_injury_leave?.rate ?? null
      break
    case 'maternity_leave_twins':
      actual.total_days = wage.leaves_and_holidays?.maternity_and_protection?.maternity_leave?.twins ?? null
      actual.postpartum_min = wage.leaves_and_holidays?.maternity_and_protection?.maternity_leave?.postpartum_min_twins ?? null
      break
    case 'congratulatory_marriage_self':
      actual.hospital_paid = wage.welfare_and_training?.congratulatory_money?.hospital_paid?.marriage_self ?? null
      actual.union_paid = wage.welfare_and_training?.congratulatory_money?.union_paid?.marriage_self ?? null
      break
    case 'welfare_points_childbirth_second':
      actual.points = wage.welfare_and_training?.welfare_points?.childbirth_bonus?.second ?? null
      break
    case 'long_service_20y':
      actual.allowance = wage.wage_structure_and_allowances?.long_service_allowance?.tiers?.['20y_over'] ?? null
      break
    default:
      break
  }

  const expected = fixture.expected ?? {}
  const passed = Object.entries(expected).every(([key, value]) => actual[key] === value)

  return {
    id: String(fixture.id),
    title: String(fixture.title),
    category: String(fixture.category || 'scenario'),
    passed,
    expected,
    actual,
  }
}

export function loadNurseRegulation(year = 2026): RegulationData {
  if (regulationCache.has(year)) {
    return regulationCache.get(year)!
  }
  const raw = readFileSync(regulationPath(year), 'utf8')
  const parsed = JSON.parse(raw) as RegulationData
  regulationCache.set(year, parsed)
  return parsed
}

export function evaluateNurseRegulationScenarios(regulation: RegulationData): ScenarioReport {
  const fixtures = regulation.scenario_fixtures ?? []
  const items = fixtures.map((fixture) => {
    if (fixture.type === 'schedule') {
      return evaluateScheduleScenario(regulation, fixture)
    }
    return evaluateAllowanceScenario(regulation, fixture)
  })
  const passed = items.filter((item) => item.passed).length
  return {
    total: items.length,
    passed,
    failed: items.length - passed,
    items,
  }
}
