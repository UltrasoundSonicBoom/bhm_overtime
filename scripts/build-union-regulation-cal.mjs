import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const workspaceRoot = resolve(import.meta.dirname, '..');
const rawPath = '/Users/momo/Documents/GitHub/bhm_overtime/data/union_regulation_2026.json';
const nursePath = resolve(workspaceRoot, 'content', 'policies', '2026', 'nurse_regulation.json');
const outCalPath = resolve(workspaceRoot, 'data', 'union_regulation_cal_2026.json');
const outAliasPath = resolve(workspaceRoot, 'data', 'union_regulation_aliases_2026.json');
const outCalJsPath = resolve(workspaceRoot, 'data', 'union_regulation_cal_2026.js');
const outAliasJsPath = resolve(workspaceRoot, 'data', 'union_regulation_aliases_2026.js');

const raw = JSON.parse(readFileSync(rawPath, 'utf8'));
const nurse = JSON.parse(readFileSync(nursePath, 'utf8'));

function normalizeParen(ch) {
  if (ch === '（') return '(';
  if (ch === '）') return ')';
  return ch;
}

function compactLabel(text) {
  return String(text || '')
    .trim()
    .replace(/[（）]/g, normalizeParen)
    .replace(/\s+/g, '')
    .replace(/\n+/g, '');
}

function parseMoney(value) {
  const rawText = String(value || '').trim();
  const noSpace = rawText.replace(/\s+/g, '');

  const wonMatch = noSpace.match(/([\d,]+)원/);
  if (wonMatch) {
    return Number(wonMatch[1].replace(/,/g, '')) || 0;
  }

  const manwonMatch = noSpace.match(/([\d,]+)만원/);
  if (manwonMatch) {
    return (Number(manwonMatch[1].replace(/,/g, '')) || 0) * 10000;
  }

  const plainNumberMatch = noSpace.match(/^-?[\d,]+(?:\.\d+)?$/);
  if (plainNumberMatch) {
    return Number(noSpace.replace(/,/g, '')) || 0;
  }

  return 0;
}

function parseDayCount(value) {
  const text = String(value || '').trim();
  const match = text.match(/(\d+)\s*일/);
  if (match) return Number(match[1]) || 0;
  return 0;
}

function findSectionByTitle(title) {
  return raw.find((section) => section.title === title) || null;
}

function findTableByTitle(title) {
  for (const section of raw) {
    for (const table of section.tables || []) {
      if (table.title === title) return table;
    }
  }
  return null;
}

function findClauseIncludes(text) {
  for (const section of raw) {
    for (const clause of section.clauses || []) {
      if (String(clause).includes(text)) {
        return {
          section,
          clause,
        };
      }
    }
  }
  return null;
}

function buildWageTableKey(title) {
  if (title.includes('일반직')) return 'general_j_grade';
  if (title.includes('운영기능직')) return 'operation_a_grade';
  if (title.includes('환경유지지원직')) return 'environment_sa_grade';
  return title;
}

function buildGroupedTableKey(groupCode, title) {
  const lower = String(groupCode || '').toUpperCase();
  if (title.includes('일반직')) return `general_${lower.toLowerCase()}_grade`;
  if (title.includes('운영기능직')) return `operation_${lower.toLowerCase()}_grade`;
  if (title.includes('환경유지지원직')) return `environment_${lower.toLowerCase()}_grade`;
  return `${buildWageTableKey(title)}_${lower.toLowerCase()}`;
}

function buildWageTables(...tables) {
  const wageTables = {};

  for (const table of tables.filter(Boolean)) {
    for (const row of table.rows || []) {
      const groupCode = row[0];
      const grade = row[1];
      const tableKey = buildGroupedTableKey(groupCode, table.title);
      if (!wageTables[tableKey]) wageTables[tableKey] = {};
      wageTables[tableKey][grade] = {
        base_salary_by_year: row.slice(2, 10).map(parseMoney),
        ability_pay: parseMoney(row[10]),
        bonus: parseMoney(row[11]),
        family_support: parseMoney(row[12]),
      };
    }
  }

  return wageTables;
}

function buildPetitionAndCongrats() {
  const table = findTableByTitle('청원휴가 및 경조금 표');
  const result = {};

  const mapping = [
    ['본인 결혼', 'marriage_self'],
    ['자녀 결혼', 'marriage_child'],
    ['배우자 출산', 'childbirth_spouse'],
    ['본인 사망', 'death_self'],
    ['배우자 사망', 'death_spouse'],
    ['(본인, 배우자)의 부모 사망', 'death_parents'],
    ['자녀 및 그 배우자 사망', 'death_child_and_spouse'],
    ['(본인, 배우자)의 조부모, 외조부모 사망', 'death_grandparents'],
    ['(본인, 배우자)의 형제, 자매 사망', 'death_siblings'],
  ];

  for (const [rowTitle, key] of mapping) {
    const row = (table?.rows || []).find((entry) => entry[0] === rowTitle);
    if (!row) continue;
    const leaveValue = parseDayCount(row[1]);
    result[key] = {
      leave_days: leaveValue || String(row[1] || ''),
      hospital_amount: parseMoney(row[2]),
      pension_support: row[3] || '',
      coop_support: row[4] || '',
      refs: [{ source: 'union_regulation_2026', title: '청원휴가 및 경조금 표', row_title: rowTitle }],
    };
  }

  return result;
}

function buildAliases() {
  const aliasEntries = [
    ['meal_subsidy', ['급식보조비', '급식 보조비', '급 식 보 조 비', '급식\n보조비']],
    ['transport_subsidy', ['교통보조비', '교통 보조비', '교 통 보 조 비', '교통\n보조비']],
    ['military_service_pay', ['군복무수당', '군 복무 수당']],
    ['position_pay', ['직책수당', '직책급', '직 책 수 당', '직 책 급']],
    ['special_duty_pay', ['별정수당(직무)', '별정수당 (직무)', '별 정 수 당 ( 직 무 )', '별정수당（직무）']],
    ['training_allowance', ['자기계발별정수당', '자기계발 별정수당', '교육훈련비']],
    ['holiday_bonus_event', ['명절지원비', '명절 지원비']],
    ['holiday_bonus_monthly_accrual', ['명절지원비(월할)', '명절지원비 (월할)']],
    ['income_tax', ['소득세']],
    ['income_tax_settlement', ['소득세(정산)', '소득세 (정산)', '소 득 세 ( 정 산 )']],
    ['resident_tax', ['주민세']],
    ['resident_tax_settlement', ['주민세(정산)', '주민세 (정산)']],
    ['health_insurance_employee', ['국민건강', '건강보험', '국민건강보험']],
    ['health_insurance_settlement', ['국민건강(정산)', '건강보험(정산)', '국민건강보험(정산)']],
    ['long_term_care_employee', ['장기요양', '장기요양보험']],
    ['long_term_care_settlement', ['장기요양(정산)', '장기요양보험(정산)']],
  ];

  const displayNameByVariableKey = {
    meal_subsidy: '급식보조비',
    transport_subsidy: '교통보조비',
    military_service_pay: '군복무수당',
    position_pay: '직책수당',
    special_duty_pay: '별정수당(직무)',
    training_allowance: '자기계발별정수당',
    holiday_bonus_event: '명절지원비',
    holiday_bonus_monthly_accrual: '명절지원비(월할)',
    income_tax: '소득세',
    income_tax_settlement: '소득세(정산)',
    resident_tax: '주민세',
    resident_tax_settlement: '주민세(정산)',
    health_insurance_employee: '국민건강',
    health_insurance_settlement: '국민건강(정산)',
    long_term_care_employee: '장기요양',
    long_term_care_settlement: '장기요양(정산)',
  };

  return {
    _meta: {
      source: 'union_regulation_2026.json',
      version: '2026.1.0-generated',
    },
    display_name_by_variable_key: displayNameByVariableKey,
    variable_key_by_compact_label: Object.fromEntries(
      aliasEntries.flatMap(([variableKey, labels]) =>
        labels.map((label) => [compactLabel(label), variableKey])
      )
    ),
  };
}

function buildCalGraph() {
  const mealClause = findClauseIncludes('급식보조비');
  const transportClause = findClauseIncludes('교통보조비');
  const annualLeaveClause = findClauseIncludes('연차휴가는');
  const militaryAgreement = (findSectionByTitle('제51조(상여금)')?.related_agreements || [])
    .find((entry) => String(entry.title || '').includes('군복무수당')) || null;

  const wageTables = buildWageTables(
    findTableByTitle('2025년 일반직 보수표(연간)'),
    findTableByTitle('2025년 운영기능직 보수표(연간)'),
    findTableByTitle('2025년 환경유지지원직 보수표(연간)')
  );

  return {
    _meta: {
      source: 'union_regulation_2026.json',
      version: '2026.1.0-generated',
      reference_shape: 'nurse_regulation.json',
    },
    fixed_allowances: {
      meal_subsidy: {
        amount: parseMoney(mealClause?.clause),
        refs: [{ source: 'union_regulation_2026', title: mealClause?.section?.title || '', clause: mealClause?.clause || '' }],
      },
      transport_subsidy: {
        amount: nurse?.wage_structure_and_allowances?.fixed_allowances?.transportation_subsidy ?? 150000,
        refs: [{ source: 'union_regulation_2026', title: transportClause?.section?.title || '', clause: transportClause?.clause || '' }],
      },
      military_service_pay: {
        amount: nurse?.wage_structure_and_allowances?.fixed_allowances?.military_service?.amount ?? 45000,
        max_months: 24,
        refs: [{ source: 'union_regulation_2026', title: militaryAgreement?.title || '', clause: militaryAgreement?.content || '' }],
      },
      training_allowance: {
        amount: nurse?.wage_structure_and_allowances?.fixed_allowances?.training_monthly ?? 40000,
        refs: [{ source: 'nurse_regulation.json', path: 'wage_structure_and_allowances.fixed_allowances.training_monthly' }],
      },
      refresh_support_allowance: {
        monthly_amount: 30000,
        annual_amount: 360000,
        effective_date: '2026-01-01',
        refs: [{ source: 'nurse_regulation.json', path: 'scenarios.refresh-support.expected.annual_support' }],
      },
    },
    formulas: {
      holiday_bonus_event: {
        expression: '(base_salary + adjust_pay * 0.5) * 0.5',
        payment_months: ['lunar_new_year_month', 'chuseok_month', 5, 7],
        refs: [{ source: 'nurse_regulation.json', path: 'wage_structure_and_allowances.conditional_wages.holiday_support' }],
      },
    },
    ordinary_wage: {
      included_variable_keys: [
        'base_salary',
        'seniority_base_salary',
        'military_service_pay',
        'ability_pay',
        'bonus_monthly',
        'family_support_pay',
        'adjust_pay',
        'upgrade_adjust_pay',
        'long_service_pay',
        'special_duty_pay',
        'position_pay',
        'work_support_pay',
        'meal_subsidy',
        'transport_subsidy',
        'holiday_bonus_event',
        'training_allowance',
        'refresh_support_allowance',
      ],
      refs: [{ source: 'nurse_regulation.json', path: 'wage_structure_and_allowances.wage_components.ordinary_wage' }],
    },
    annual_leave: {
      unused_compensation_rule: String(annualLeaveClause?.clause || ''),
      refs: [{ source: 'union_regulation_2026', title: annualLeaveClause?.section?.title || '', clause: annualLeaveClause?.clause || '' }],
    },
    wage_tables: wageTables,
    petition_leave_and_congrats: buildPetitionAndCongrats(),
  };
}

const cal = buildCalGraph();
const aliases = buildAliases();

mkdirSync(dirname(outCalPath), { recursive: true });
writeFileSync(outCalPath, JSON.stringify(cal, null, 2) + '\n');
writeFileSync(outAliasPath, JSON.stringify(aliases, null, 2) + '\n');
writeFileSync(
  outCalJsPath,
  `window.UNION_REGULATION_CAL_2026 = ${JSON.stringify(cal, null, 2)};\n`
);
writeFileSync(
  outAliasJsPath,
  `window.UNION_REGULATION_ALIASES_2026 = ${JSON.stringify(aliases, null, 2)};\n`
);

console.log(`Wrote ${outCalPath}`);
console.log(`Wrote ${outAliasPath}`);
console.log(`Wrote ${outCalJsPath}`);
console.log(`Wrote ${outAliasJsPath}`);
