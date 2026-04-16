# Union Regulation Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `union_regulation_2026.json`을 raw 기준본으로 정리하고 여기서 재생성 가능한 `union_regulation_cal_2026.json`과 alias/variable_key 레이어를 만들어 parser, calculators, regulation UI, app 설명이 같은 변수와 같은 계산식을 공유하도록 만든다.

**Architecture:** 원문 규정은 `/Users/momo/Documents/GitHub/bhm_overtime/data/union_regulation_2026.json`에 유지하고, 브라우저/Node 공용 생성기 `scripts/build-union-regulation-cal.mjs`가 이를 읽어 `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data/union_regulation_cal_2026.json`과 `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data/union_regulation_aliases_2026.json`을 만든다. 런타임 코드는 generated cal graph를 직접 읽거나 thin adapter를 통해 읽고, parser는 alias graph의 compact-label 룰로 `급식 보조비`, `급 식 보 조 비`, 줄바꿈/괄호 변형까지 같은 항목으로 식별한다.

**Tech Stack:** Vanilla browser JavaScript, Node.js ESM scripts, JSON fixtures, pdf.js parser, localStorage, existing regression tests

---

## File Structure

### Create

- `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/scripts/build-union-regulation-cal.mjs`
  - raw union JSON에서 generated cal graph와 alias graph를 만든다.
- `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data/union_regulation_cal_2026.json`
  - generated canonical calculation graph.
- `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data/union_regulation_aliases_2026.json`
  - generated label normalization/alias dictionary.
- `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data/test-union-regulation-cal.mjs`
  - generator/regression test.
- `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/payroll-label-utils.js`
  - compact label, punctuation normalization, alias lookup 유틸.

### Modify

- `/Users/momo/Documents/GitHub/bhm_overtime/data/union_regulation_2026.json`
  - raw 규정 품질 보강.
- `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/salary-parser.js`
  - generated alias graph 기반 라벨 식별.
- `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/regulation-constants.js`
  - generated cal graph를 읽는 thin adapter로 이동 시작.
- `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/calculators.js`
  - generated cal graph 기반 수치/수식 사용.
- `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data.js`
  - FAQ와 handbook를 canonical graph 기준으로 교정.
- `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/app.js`
  - 설명/비교/표시 메시지의 규칙명/계산 근거를 canonical graph와 일치.
- `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/regulation.js`
  - regulation browse/chat helper가 generated graph와 같은 근거문구를 쓰게 조정.

## Critical Review Before Starting

- 이미 존재하는 `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/content/policies/2026/nurse_regulation.json`과 `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data/hospital_rule_master_2026.json`은 참고본으로만 사용한다.
- generated file은 raw source에서 재생성 가능해야 하므로 수동 편집을 기본값으로 두지 않는다.
- `명절지원비`와 `명절지원비(월할)`은 서로 다른 노드다.
- `급식보조비`와 `급식 보조비`는 같은 노드다.
- 기존 브라우저 로딩 순서 때문에 새 util 파일이 필요하면 `index.html`에서 parser보다 먼저 로드해야 한다.

### Task 1: Create Generator Regression Test

**Files:**
- Create: `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data/test-union-regulation-cal.mjs`
- Test: `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data/test-union-regulation-cal.mjs`

- [ ] **Step 1: Write the failing generator regression test**

```js
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const script = resolve(root, 'scripts', 'build-union-regulation-cal.mjs');
const calPath = resolve(root, 'data', 'union_regulation_cal_2026.json');
const aliasPath = resolve(root, 'data', 'union_regulation_aliases_2026.json');

const run = spawnSync('node', [script], { cwd: root, encoding: 'utf8' });
assert.equal(run.status, 0, run.stderr || run.stdout);

const cal = JSON.parse(readFileSync(calPath, 'utf8'));
const aliases = JSON.parse(readFileSync(aliasPath, 'utf8'));

assert.equal(cal._meta.source, 'union_regulation_2026.json');
assert.equal(cal.fixed_allowances.meal_subsidy.amount, 150000);
assert.equal(cal.fixed_allowances.transport_subsidy.amount, 150000);
assert.equal(cal.ordinary_wage.included_variable_keys.includes('meal_subsidy'), true);
assert.equal(cal.formulas.holiday_bonus_event.expression, '(base_salary + adjust_pay * 0.5) * 0.5');
assert.equal(cal.wage_tables.general_j_grade.J3.base_salary_by_year[0], 32379600);
assert.equal(cal.petition_leave_and_congrats.marriage_self.leave_days, 5);
assert.equal(aliases.variable_key_by_compact_label['급식보조비'], 'meal_subsidy');
assert.equal(aliases.variable_key_by_compact_label['급식보조비정산'] ?? null, null);
```

- [ ] **Step 2: Run the test to verify it fails because the script does not exist yet**

Run: `node data/test-union-regulation-cal.mjs`
Expected: FAIL with module-not-found or non-zero exit from missing `build-union-regulation-cal.mjs`

- [ ] **Step 3: Commit nothing yet; keep the test red**

Expected: working tree contains only the new failing test

### Task 2: Build The First Generated Calculation Graph

**Files:**
- Create: `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/scripts/build-union-regulation-cal.mjs`
- Create: `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data/union_regulation_cal_2026.json`
- Create: `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data/union_regulation_aliases_2026.json`
- Test: `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data/test-union-regulation-cal.mjs`

- [ ] **Step 1: Create the generator script with deterministic extraction**

```js
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const workspaceRoot = resolve(import.meta.dirname, '..');
const rawPath = '/Users/momo/Documents/GitHub/bhm_overtime/data/union_regulation_2026.json';
const nursePath = resolve(workspaceRoot, 'content', 'policies', '2026', 'nurse_regulation.json');
const outCalPath = resolve(workspaceRoot, 'data', 'union_regulation_cal_2026.json');
const outAliasPath = resolve(workspaceRoot, 'data', 'union_regulation_aliases_2026.json');

const raw = JSON.parse(readFileSync(rawPath, 'utf8'));
const nurse = JSON.parse(readFileSync(nursePath, 'utf8'));

function compactLabel(text) {
  return String(text || '')
    .trim()
    .replace(/[()（）]/g, (ch) => ch === '（' ? '(' : ch === '）' ? ')' : ch)
    .replace(/\s+/g, '')
    .replace(/\n+/g, '');
}
```

- [ ] **Step 2: Extract the wage tables from the raw union appendix**

```js
function findTableByTitle(title) {
  for (const section of raw) {
    for (const table of section.tables || []) {
      if (table.title === title) return table;
    }
  }
  return null;
}

function parseMoney(value) {
  return Number(String(value).replace(/[^\d.-]/g, '')) || 0;
}

const generalTable = findTableByTitle('2025년 일반직 보수표(연간)');
const operationTable = findTableByTitle('2025년 운영기능직 보수표(연간)');
const environmentTable = findTableByTitle('2025년 환경유지지원직 보수표(연간)');
```

- [ ] **Step 3: Build the first cal graph using raw values and nurse structure as a shape reference**

```js
const cal = {
  _meta: {
    source: 'union_regulation_2026.json',
    version: '2026.1.0-generated',
    generated_at: new Date().toISOString()
  },
  fixed_allowances: {
    meal_subsidy: { amount: 150000, refs: [{ source: 'union_regulation_2026', article: '제43조', clause: '(3)' }] },
    transport_subsidy: { amount: 150000, refs: [{ source: 'union_regulation_2026', article: '제43조', clause: '(4)' }] },
    military_service_pay: { amount: 45000, max_months: 24 },
    training_allowance: { amount: 40000 }
  },
  formulas: {
    holiday_bonus_event: {
      expression: '(base_salary + adjust_pay * 0.5) * 0.5',
      payment_months: ['lunar_new_year_month', 'chuseok_month', 5, 7]
    }
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
      'training_allowance'
    ]
  },
  wage_tables: buildWageTables(generalTable, operationTable, environmentTable),
  petition_leave_and_congrats: buildPetitionAndCongrats(raw)
};
```

- [ ] **Step 4: Generate the alias graph with compact-label keys**

```js
const aliasEntries = [
  ['meal_subsidy', ['급식보조비', '급식 보조비', '급 식 보 조 비', '급식\n보조비']],
  ['transport_subsidy', ['교통보조비', '교통 보조비', '교통\n보조비']],
  ['position_pay', ['직책수당', '직책급', '직 책 수 당', '직 책 급']],
  ['special_duty_pay', ['별정수당(직무)', '별정수당 (직무)', '별정수당（직무）']],
  ['income_tax', ['소득세']],
  ['income_tax_settlement', ['소득세(정산)', '소득세 (정산)', '소 득 세 ( 정 산 )']]
];

const aliases = {
  _meta: { source: 'union_regulation_2026.json', version: '2026.1.0-generated' },
  variable_key_by_compact_label: Object.fromEntries(
    aliasEntries.flatMap(([variableKey, labels]) =>
      labels.map((label) => [compactLabel(label), variableKey])
    )
  )
};
```

- [ ] **Step 5: Write the outputs and rerun the test**

Run: `node data/test-union-regulation-cal.mjs`
Expected: PASS

- [ ] **Step 6: Commit the generator baseline**

```bash
git add scripts/build-union-regulation-cal.mjs data/union_regulation_cal_2026.json data/union_regulation_aliases_2026.json data/test-union-regulation-cal.mjs
git commit -m "feat: generate canonical union regulation calculation graph"
```

### Task 3: Add Shared Label Normalization Utility And Wire The Parser

**Files:**
- Create: `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/payroll-label-utils.js`
- Modify: `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/index.html`
- Modify: `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/salary-parser.js`
- Modify: `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data/test-payroll-parser-v2.mjs`
- Test: `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data/test-payroll-parser-v2.mjs`

- [ ] **Step 1: Write a failing parser normalization test**

```js
assert.equal(
  parserDebug.lookupVariableKeyByLabel('급식 보조비', 'earning'),
  'meal_subsidy'
);
assert.equal(
  parserDebug.lookupVariableKeyByLabel('별정수당 (직무)', 'earning'),
  'special_duty_pay'
);
```

- [ ] **Step 2: Run the parser regression suite and confirm the lookup is missing**

Run: `node data/test-payroll-parser-v2.mjs`
Expected: FAIL with missing function or undefined variable key

- [ ] **Step 3: Add the shared compact-label util**

```js
const PAYROLL_LABEL_UTILS = (() => {
  function compact_label_ko(text) {
    return String(text || '')
      .trim()
      .replace(/[（）]/g, (ch) => (ch === '（' ? '(' : ')'))
      .replace(/\s+/g, '')
      .replace(/\n+/g, '');
  }

  function build_lookup(aliasMap) {
    return function lookup(label) {
      return aliasMap[compact_label_ko(label)] || null;
    };
  }

  return { compact_label_ko, build_lookup };
})();
```

- [ ] **Step 4: Load the util before the parser**

```html
<script src="payroll-label-utils.js?v=1.0"></script>
<script src="salary-parser.js?v=2.5"></script>
```

- [ ] **Step 5: Wire generated aliases into the parser fallback lookup**

```js
const GENERATED_ALIASES = (() => {
  try {
    return window.UNION_REGULATION_ALIASES_2026 || null;
  } catch (_) {
    return null;
  }
})();

const lookupGeneratedVariableKey =
  GENERATED_ALIASES && PAYROLL_LABEL_UTILS
    ? PAYROLL_LABEL_UTILS.build_lookup(GENERATED_ALIASES.variable_key_by_compact_label)
    : function() { return null; };
```

- [ ] **Step 6: Re-run parser regression**

Run: `node data/test-payroll-parser-v2.mjs`
Expected: PASS

- [ ] **Step 7: Commit the parser label normalization**

```bash
git add payroll-label-utils.js index.html salary-parser.js data/test-payroll-parser-v2.mjs
git commit -m "feat: normalize payslip labels with generated alias graph"
```

### Task 4: Replace Fixed Constants With Generated Cal Reads

**Files:**
- Modify: `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/regulation-constants.js`
- Modify: `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/calculators.js`
- Test: `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data/test-union-regulation-cal.mjs`

- [ ] **Step 1: Write a failing assertion that constants and generated cal agree**

```js
import RC from '../regulation-constants.js';
assert.equal(RC.MEAL_SUBSIDY, cal.fixed_allowances.meal_subsidy.amount);
assert.equal(RC.TRANSPORT_SUBSIDY, cal.fixed_allowances.transport_subsidy.amount);
```

- [ ] **Step 2: Run the test to confirm the adapter is not present**

Run: `node data/test-union-regulation-cal.mjs`
Expected: FAIL

- [ ] **Step 3: Add a generated-cal loader to regulation constants**

```js
let GENERATED_CAL = null;
try {
  GENERATED_CAL = require('./data/union_regulation_cal_2026.json');
} catch (_) {
  GENERATED_CAL = null;
}

const MEAL_SUBSIDY =
  GENERATED_CAL?.fixed_allowances?.meal_subsidy?.amount ?? 150000;
```

- [ ] **Step 4: Use generated cal in calculators before DATA fallback**

```js
const generatedFixed = (typeof window !== 'undefined' && window.UNION_REGULATION_CAL_2026?.fixed_allowances) || null;
const mealSubsidy =
  rsAllowances.meal_subsidy ??
  generatedFixed?.meal_subsidy?.amount ??
  DATA.allowances.mealSubsidy;
```

- [ ] **Step 5: Re-run the tests**

Run: `node data/test-union-regulation-cal.mjs && node data/test-payroll-parser-v2.mjs`
Expected: PASS

- [ ] **Step 6: Commit the constants/calculator bridge**

```bash
git add regulation-constants.js calculators.js
git commit -m "refactor: read payroll constants from generated union cal graph"
```

### Task 5: Align FAQ And Regulation Display With The Canonical Graph

**Files:**
- Modify: `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data.js`
- Modify: `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/app.js`
- Modify: `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/regulation.js`
- Test: browser/manual smoke + `node --check`

- [ ] **Step 1: Write a snapshot-style assertion for FAQ strings if possible, or document exact targets**

Targets:

- `교통보조비·급식보조비는?`
- `통상임금이 뭐에요?`
- `미사용 연차 보상금은?`
- `퇴직금은 어떻게 계산하나요?`

- [ ] **Step 2: Replace hard-coded prose that diverges from canonical graph**

```js
const ordinaryWageKeys = UNION_REGULATION_CAL_2026.ordinary_wage.included_variable_keys;
const ordinaryWageLabels = ordinaryWageKeys.map((key) => UNION_REGULATION_CAL_2026.items[key].display_name_ko);
```

- [ ] **Step 3: Run syntax checks**

Run: `node --check data.js && node --check app.js && node --check regulation.js`
Expected: PASS

- [ ] **Step 4: Commit the consumer text alignment**

```bash
git add data.js app.js regulation.js
git commit -m "refactor: align regulation text with canonical union rule graph"
```

### Task 6: Verify End-To-End Consistency

**Files:**
- Test: `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data/test-union-regulation-cal.mjs`
- Test: `/Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2/data/test-payroll-parser-v2.mjs`

- [ ] **Step 1: Run all relevant tests**

Run:

```bash
node data/test-union-regulation-cal.mjs
node data/test-payroll-parser-v2.mjs
node --check salary-parser.js
node --check calculators.js
node --check regulation-constants.js
node --check data.js
node --check app.js
node --check regulation.js
```

Expected: all PASS

- [ ] **Step 2: Regenerate files and verify no diff**

Run:

```bash
node scripts/build-union-regulation-cal.mjs
git diff -- data/union_regulation_cal_2026.json data/union_regulation_aliases_2026.json
```

Expected: no diff after a clean rebuild

- [ ] **Step 3: Browser smoke test one spacing-variant label path**

Manual smoke target:

- upload fixture with synthetic alias or parser unit test proving `급식 보조비` -> `meal_subsidy`

- [ ] **Step 4: Commit the verification pass**

```bash
git add data/union_regulation_cal_2026.json data/union_regulation_aliases_2026.json
git commit -m "test: verify generated union regulation graph consistency"
```

