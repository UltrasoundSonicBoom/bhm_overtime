import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const buildScript = resolve(root, 'scripts', 'build-union-regulation-cal.mjs');
const rawUnionPath = '/Users/momo/Documents/GitHub/bhm_overtime/data/union_regulation_2026.json';
const calPath = resolve(root, 'data', 'union_regulation_cal_2026.json');
const dataJsPath = resolve(root, 'data.js');
const calculatorsJsPath = resolve(root, 'calculators.js');
const appJsPath = resolve(root, 'app.js');
const regulationJsPath = resolve(root, 'regulation.js');

const build = spawnSync('node', [buildScript], { cwd: root, encoding: 'utf8' });
assert.equal(build.status, 0, build.stderr || build.stdout);

const raw = JSON.parse(readFileSync(rawUnionPath, 'utf8'));
const generatedCal = JSON.parse(readFileSync(calPath, 'utf8'));
const regulationConstants = await import(resolve(root, 'regulation-constants.js'));
const RC = regulationConstants.default || regulationConstants;

function findRawSection(title) {
  return raw.find((section) => section.title === title) || null;
}

function findRawTable(title) {
  for (const section of raw) {
    for (const table of section.tables || []) {
      if (table.title === title) return table;
    }
  }
  return null;
}

const spouseBirthClause = (findRawSection('제41조(청원휴가)')?.clauses || []).find((clause) => clause.includes('배우자 출산'));
assert.equal(spouseBirthClause, '(3) 배우자 출산 : 20일', 'raw union clause should be updated to 20 days');

const spouseBirthRow = (findRawTable('청원휴가 및 경조금 표')?.rows || []).find((row) => row[0] === '배우자 출산');
assert.equal(spouseBirthRow?.[1], '20일', 'raw union table should be updated to 20 days');
assert.equal(spouseBirthRow?.[2], '10만원', 'raw union table spouse childbirth amount should stay 10만원');

assert.equal(generatedCal.petition_leave_and_congrats.childbirth_spouse.leave_days, 20, 'generated rulebook should inherit spouse childbirth leave days');
assert.equal(generatedCal.petition_leave_and_congrats.childbirth_spouse.hospital_amount, 100000, 'generated rulebook should inherit spouse childbirth amount');

const dataJs = readFileSync(dataJsPath, 'utf8');
const calculatorsJs = readFileSync(calculatorsJsPath, 'utf8');

const storage = new Map();
const context = {
  console,
  Date,
  Math,
  JSON,
  Promise,
  setTimeout: () => 0,
  clearTimeout: () => {},
  localStorage: {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
    removeItem(key) {
      storage.delete(key);
    },
  },
  location: {
    protocol: 'http:',
    hostname: '127.0.0.1',
    port: '4173',
  },
  fetch: async () => ({
    ok: false,
    status: 500,
    headers: { get() { return 'application/json'; } },
    json: async () => ({}),
  }),
  window: {
    UNION_REGULATION_CAL_2026: generatedCal,
  },
};

context.globalThis = context;

vm.runInNewContext(
  `${dataJs}\n;globalThis.__DATA_STATIC__ = DATA_STATIC; globalThis.__DATA__ = DATA;`,
  context,
  { filename: dataJsPath }
);

context.DATA = context.__DATA__;
context.window.DATA = context.__DATA__;

vm.runInNewContext(
  `${calculatorsJs}\n;globalThis.__CALC__ = CALC;`,
  context,
  { filename: calculatorsJsPath }
);

const DATA = context.__DATA_STATIC__;
const CALC = context.__CALC__;

assert.equal(DATA.allowances.mealSubsidy, generatedCal.fixed_allowances.meal_subsidy.amount, 'data.js meal subsidy should match generated rulebook');
assert.equal(DATA.allowances.transportSubsidy, generatedCal.fixed_allowances.transport_subsidy.amount, 'data.js transport subsidy should match generated rulebook');
assert.equal(DATA.allowances.selfDevAllowance, generatedCal.fixed_allowances.training_allowance.amount, 'data.js self development allowance should match generated rulebook');
assert.equal(DATA.allowances.refreshBenefit, generatedCal.fixed_allowances.refresh_support_allowance.monthly_amount, 'data.js refresh support should match generated rulebook');
assert.equal(DATA.allowances.militaryService, generatedCal.fixed_allowances.military_service_pay.amount, 'data.js military service allowance should match generated rulebook');

assert.equal(RC.MEAL_SUBSIDY, DATA.allowances.mealSubsidy, 'regulation constants meal subsidy should match data.js');
assert.equal(RC.TRANSPORT_SUBSIDY, DATA.allowances.transportSubsidy, 'regulation constants transport subsidy should match data.js');
assert.equal(RC.EDUCATION_ALLOWANCE_MONTHLY, DATA.allowances.selfDevAllowance, 'regulation constants training allowance should match data.js');
assert.equal(RC.REFRESH_BENEFIT_MONTHLY, DATA.allowances.refreshBenefit, 'regulation constants refresh support should match data.js');
assert.equal(RC.MILITARY_SERVICE_PAY_MONTHLY, DATA.allowances.militaryService, 'regulation constants military pay should match data.js');

const ceremonyMap = Object.fromEntries((DATA.ceremonies || []).map((item) => [item.type, item]));
assert.equal(ceremonyMap['배우자 출산'].leave, 20, 'data.js ceremonies should use 20-day spouse childbirth leave');
assert.equal(ceremonyMap['배우자 출산'].hospitalPay, 100000, 'data.js ceremonies should use 10만원 spouse childbirth pay');

const leaveTypeMap = Object.fromEntries((DATA.leaveQuotas?.types || []).map((item) => [item.id, item]));
assert.equal(leaveTypeMap.ceremony_spouse_birth.ceremonyDays, 20, 'leave quota spouse childbirth type should use 20 days');
assert.equal(leaveTypeMap.ceremony_spouse_birth.ceremonyPay, 100000, 'leave quota spouse childbirth type should use 10만원');

const faqMap = Object.fromEntries((DATA.faq || []).map((item) => [item.q, item]));
assert.match(faqMap['배우자 출산휴가는?'].a, /20일/, 'FAQ should use 20-day spouse childbirth leave');
assert.match(faqMap['통상임금이 뭐에요?'].a, /자기계발별정수당/, 'FAQ should use canonical payroll item names');
assert.match(faqMap['통상임금이 뭐에요?'].a, /리프레시지원비/, 'FAQ should include refresh support allowance');

const handbookMap = new Map();
(DATA.handbook || []).forEach((section) => {
  (section.articles || []).forEach((article) => {
    handbookMap.set(`${section.category}::${article.title}`, article);
  });
});

assert.match(handbookMap.get('연차·휴가::배우자 출산휴가').body, /20일/, 'handbook spouse childbirth article should use 20 days');
assert.match(handbookMap.get('청원·경조::경조비 일람').body, /배우자 출산: 20일 \+ 100,000원/, 'handbook ceremony summary should use synced spouse childbirth values');

const wage = CALC.calcOrdinaryWage('보건직', 'S1', 2, { adjustPay: 120000, hasMilitary: true, militaryMonths: 24, longServiceYears: 20 });
assert.ok(wage, 'calculator should return an ordinary wage result');
assert.equal(wage.breakdown['급식보조비'], DATA.allowances.mealSubsidy, 'calculator meal subsidy should match synced data');
assert.equal(wage.breakdown['교통보조비'], DATA.allowances.transportSubsidy, 'calculator transport subsidy should match synced data');
assert.equal(wage.breakdown['자기계발별정수당'], DATA.allowances.selfDevAllowance, 'calculator training allowance label/value should match synced data');
assert.equal(wage.breakdown['리프레시지원비'], DATA.allowances.refreshBenefit, 'calculator refresh support label/value should match synced data');
assert.ok(Object.hasOwn(wage.breakdown, '명절지원비(월할)'), 'calculator breakdown should expose monthly holiday bonus accrual');
assert.equal(wage.displayInfo.holidayBonusMonths, '설·추석·5월·7월', 'calculator display should keep normalized holiday bonus month labels');

const appJs = readFileSync(appJsPath, 'utf8');
const regulationJs = readFileSync(regulationJsPath, 'utf8');
assert.match(appJs, /DATA\.ceremonies\.forEach/, 'app.js ceremony table should consume synced DATA.ceremonies');
assert.match(regulationJs, /DATA\.faq\.filter/, 'regulation.js FAQ answers should consume synced DATA.faq');
assert.match(regulationJs, /DATA\.handbook/, 'regulation.js browse view should consume synced DATA.handbook');

console.log('Union regulation cross-validation checks passed.');
