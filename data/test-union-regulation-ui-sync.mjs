import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const buildScript = resolve(root, 'scripts', 'build-union-regulation-cal.mjs');
const dataJsPath = resolve(root, 'data.js');
const calPath = resolve(root, 'data', 'union_regulation_cal_2026.json');

const build = spawnSync('node', [buildScript], { cwd: root, encoding: 'utf8' });
assert.equal(build.status, 0, build.stderr || build.stdout);

const dataJs = readFileSync(dataJsPath, 'utf8');
const generatedCal = JSON.parse(readFileSync(calPath, 'utf8'));

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
    headers: {
      get() {
        return 'application/json';
      },
    },
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

const data = context.__DATA_STATIC__;
assert.ok(data, 'DATA_STATIC should be available after evaluating data.js');

const faqMap = Object.fromEntries((data.faq || []).map((item) => [item.q, item]));
const handbookMap = new Map();
(data.handbook || []).forEach((section) => {
  (section.articles || []).forEach((article) => {
    handbookMap.set(`${section.category}::${article.title}`, article);
  });
});
const ceremonyMap = Object.fromEntries((data.ceremonies || []).map((item) => [item.type, item]));
const leaveTypeMap = Object.fromEntries((data.leaveQuotas?.types || []).map((item) => [item.id, item]));

assert.equal(data.allowances.mealSubsidy, 150000, 'meal subsidy should follow generated rulebook');
assert.equal(data.allowances.transportSubsidy, 150000, 'transport subsidy should follow generated rulebook');
assert.equal(data.allowances.refreshBenefit, 30000, 'refresh benefit should follow generated rulebook');

assert.match(faqMap['통상임금이 뭐에요?'].a, /자기계발별정수당/, 'ordinary wage FAQ should use canonical Korean item names');
assert.match(faqMap['통상임금이 뭐에요?'].a, /리프레시지원비/, 'ordinary wage FAQ should include refresh support allowance');
assert.match(faqMap['명절지원비는 언제?'].a, /설이 속하는 달/, 'holiday bonus FAQ should use generated payment months');
assert.match(faqMap['명절지원비는 언제?'].a, /조정급의 1\/2/, 'holiday bonus FAQ should use normalized formula text');

assert.equal(ceremonyMap['배우자 출산'].leave, 20, 'spouse childbirth leave should follow generated rulebook');
assert.equal(ceremonyMap['배우자 출산'].hospitalPay, 100000, 'spouse childbirth congratulatory pay should stay synced');
assert.equal(leaveTypeMap.ceremony_spouse_birth.ceremonyDays, 20, 'leave quota ceremony type should match ceremony table');
assert.equal(leaveTypeMap.ceremony_spouse_birth.ceremonyPay, 100000, 'leave quota ceremony pay should match ceremony table');

assert.match(
  handbookMap.get('임금·수당::통상임금 구성').body,
  /리프레시지원비/,
  'handbook ordinary wage article should include refresh support allowance'
);
assert.match(
  handbookMap.get('청원·경조::경조비 일람').body,
  /배우자 출산: 20일 \+ 100,000원/,
  'handbook ceremony article should be generated from synced ceremony rules'
);

console.log('Union regulation UI sync checks passed.');
