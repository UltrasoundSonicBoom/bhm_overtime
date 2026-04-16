# Payroll Parser V2 Normalization and Parsing Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 브라우저 온디바이스 급여명세서 파서를 V2 구조로 완성하고, 한국어 라벨 exact-match 의존을 제거한 뒤, 규정/계산/UI/unknown 보정까지 하나의 안정적인 `variable_key` 체계로 연결한다.

**Architecture:** `salary-parser.js`는 `raw document model -> normalized payroll model -> legacy adapter` 3층으로 유지한다. 항목 식별은 새 shared dictionary가 담당하고, `calculators.js`, `app.js`, `payroll.js`, `regulation.js`는 `variable_key` 중심 구조를 사용하되 기존 한국어 UI/저장 구조는 호환 어댑터로 유지한다. 깨진 라벨과 unknown 항목은 로컬 registry와 CRUD UI로 관리하고, 규정 검증은 별도 bindings/validator layer에서 수행한다.

**Tech Stack:** Vanilla browser JavaScript, pdf.js, local Tesseract.js, localStorage, Node regression tests, browser smoke tests

---

## Current Verified Baseline

이 아래 항목들은 이미 현재 worktree에서 맞춰진 상태다. 이후 작업은 반드시 이 baseline을 보존해야 한다.

- `salary-parser.js`
  - `extractPdfTokensV2()`
  - `mergeTokensToWordsV2()`
  - `clusterWordsToRowsV2()`
  - `detectBlocksV2()`
  - `buildMatrixV2()`
  - `normalizeSectionRowsV2()`
  - `extractDetailLinesV2()`
  - `adaptLegacyResult()`
- 브라우저 pdf.js에서 숫자가 `2,9 0 7,5 0 0`처럼 띄어져도 금액으로 복구하도록 `normalizeNumericText()` 경로가 추가되어 있다.
- `지 급`, `공 제`, `연 차 수 당`처럼 띄어진 상세 라벨도 `cleanCellText()` 기반으로 일부 복구된다.
- `data/test-payroll-parser-v2.mjs`는 현재 5개 fixture에 대해 PASS 상태여야 한다.
- 브라우저 스모크 테스트로 최소 아래 2개 업로드 경로는 확인된 상태다.
  - `2512 일반직 급여.pdf`
  - `2601 일반직연차수당.pdf`

## Hard Constraints

- PDF/이미지/파싱 결과는 외부 API, 외부 AI, 외부 서버로 전송하지 않는다.
- 파서 경로에서는 `fetch`, `XMLHttpRequest`, `navigator.sendBeacon`, 업로드 SDK를 사용하지 않는다.
- OCR이 필요하면 기존 로컬 `Tesseract.js`만 사용한다.
- 내부 식별자에는 특별한 이유가 없으면 한국어를 직접 쓰지 않는다.
- 새 내부 식별자는 모두 `snake_case`의 `variable_key`를 기본으로 한다.
- 사용자 화면에 보여주는 표시명은 계속 한국어를 유지할 수 있다.
- 기존 저장 구조와 UI는 한 번에 부수지 말고, key-based 내부 모델 위에 legacy adapter를 얹는다.

## What Is Actually Broken

### 1. Parser / Calculator / UI naming mismatch

현재 코드는 여러 지점에서 한국어 문자열 exact match에 의존한다.

- `salary-parser.js`
  - `PAYSLIP_TO_PROFILE_MAP`
  - `compareWithApp()`에서 `appWage.breakdown[item.name]`
- `app.js`
  - `buildPayComparison()`가 실제 항목명을 문자열로 비교
- `calculators.js`
  - `지급내역`, `공제내역`, `breakdown`을 한국어 label 기반으로 구성

이 구조에서는 아래 같은 경우가 계속 깨진다.

- `직책수당` vs `직책급`
- `별정수당(직무)` vs `별정수당`
- `국민건강` vs `국민건강보험`
- `장기요양` vs `장기요양보험`
- `자기계발별정수당` vs `교육훈련비`
- `명절지원비` vs `명절지원비(월할)`

### 2. Broken labels are still treated too late

아래 같은 케이스는 파서가 raw를 충분히 보존하지 않거나, 조기 정규화 때문에 뒤에서 복구하기 어렵다.

- `지 급`
- `구 분`
- `연 차 수 당`
- 줄바꿈/괄호/공백/한글 한 글자씩 분리된 셀

### 3. Unknown items are not a first-class object

현재는 unknown이 남더라도 반복 패턴 관리, 사용자 수정, 재사용 가능한 alias 저장, 문서 유형별 빈도 관리를 못 한다.

### 4. Regulation binding is informal

현재 실제 계산 로직은 `data.js`, `regulation-constants.js`, `regulation.js`, `calculators.js`에 분산돼 있고, `data/union_regulation_2026.json`은 감사/참조용에 가깝다. 충돌도 있다.

대표 충돌 예:

- `union_regulation_2026.json:572`의 급식보조비 `120,000`
- `data.js`, `regulation-constants.js`의 급식보조비 `150,000`

즉, 규정 JSON을 곧바로 runtime single source of truth로 쓰면 안 되고, source precedence를 먼저 정의해야 한다.

## File Map

### Create

- `payroll-item-dictionary.js`
  - 모든 급여 항목의 안정적인 `variable_key`, 한국어 canonical name, alias, profile mapping, validation metadata를 정의한다.
- `payroll-rule-bindings.js`
  - `variable_key`를 규정/계산식/월별 지급 규칙과 연결한다.
- `payroll-label-registry.js`
  - unknown/broken label registry와 localStorage CRUD를 담당한다.
- `data/payroll-variable-key-fixtures.json`
  - fixture별 기대 `variable_key`, `category`, `amount_or_value`를 저장한다.
- `data/test-payroll-item-dictionary.mjs`
  - dictionary alias/repair lookup 테스트.
- `data/test-payroll-validation.mjs`
  - 규정 binding과 validator 테스트.
- `docs/salary-parser-v2-privacy.md`
  - 파서가 온디바이스로만 동작한다는 보장 문서.

### Modify

- `salary-parser.js`
  - normalized item에 `variable_key`, `canonical_name_ko`, `repair`, `source_refs`를 추가하고, broken label repair/unknown registration을 연결한다.
- `calculators.js`
  - `breakdown_by_key`, `earnings_by_key`, `deductions_by_key`, `summary_by_key`를 추가한다.
- `payroll.js`
  - key-based breakdown과 legacy breakdown을 모두 읽을 수 있도록 보강한다.
- `app.js`
  - `buildPayComparison()`와 급여명세서 비교/렌더 경로를 `variable_key` 기반으로 전환한다.
- `payroll-views.js`
  - unknown 항목 badge, correction modal, registry 관리 UI를 추가한다.
- `regulation.js`
  - key-based rule lookup helper가 필요한 경우 연결한다.
- `regulation-constants.js`
  - key-based binding과 source metadata를 연결한다.
- `data.js`
  - display FAQ/summary는 유지하되, 새 key mapping을 참고하도록 최소 보강한다.
- `index.html`
  - 새 script 파일들을 `calculators.js`/`salary-parser.js`보다 먼저 로드한다.
- `regulation.html`
  - 규정 화면에서 계산/검증 helper를 재사용한다면 새 script를 로드한다.
- `data/test-payroll-parser-v2.mjs`
  - 새 normalized item/repair/unknown 동작을 회귀 테스트에 추가한다.
- `data/payroll-parser-fixtures.json`
  - 필요한 expected normalized outputs를 확장한다.

## Internal Model To Standardize

새 내부 normalized item은 아래 구조를 기본으로 한다.

```js
{
  block: "parsed",
  category: "earning",
  variable_key: "base_salary",
  name: "기준기본급",
  original_name_ko: "기 준 기 본 급",
  canonical_name_ko: "기준기본급",
  amount_or_value: 3085900,
  unit_or_formula: null,
  row: 0,
  col: 0,
  source_refs: ["p1:r2:c0"],
  repair: {
    applied: true,
    repair_type: "unique_alias_match",
    original_compact: "기준기본급"
  },
  confidence: 0.98
}
```

legacy adapter는 필요하면 아래 alias를 추가로 제공한다.

```js
{
  variableKey: "base_salary",
  originalName: "기 준 기 본 급",
  canonicalName: "기준기본급",
  amount: 3085900
}
```

즉, **내부 표준은 snake_case**, **기존 UI 호환은 camelCase/한국어 alias**로 유지한다.

## Required First Batch Of `variable_key`

아래 항목들은 첫 구현 라운드에서 반드시 dictionary에 들어가야 한다.

### Earnings

- `base_salary` -> `기준기본급`
- `seniority_base_salary` -> `근속가산기본급`
- `ability_pay` -> `능력급`
- `bonus_monthly` -> `상여금`
- `adjust_pay` -> `조정급`
- `upgrade_adjust_pay` -> `승급조정급`, `승급호봉분`
- `meal_subsidy` -> `급식보조비`
- `transport_subsidy` -> `교통보조비`
- `holiday_bonus_event` -> `명절지원비`
- `holiday_bonus_monthly_accrual` -> `명절지원비(월할)`
- `family_support_pay` -> `가계지원비`
- `position_pay` -> `직책수당`, `직책급`
- `work_support_pay` -> `업무보조비`
- `special_duty_pay` -> `별정수당(직무)`, `별정수당`
- `special_pay_5` -> `별정수당5`
- `long_service_pay` -> `장기근속수당`
- `family_allowance` -> `가족수당`
- `annual_leave_pay` -> `연차수당`, `연차보전수당`
- `overtime_pay` -> `시간외수당`
- `night_pay` -> `야간수당`
- `holiday_work_pay` -> `휴일수당`
- `night_shift_bonus` -> `야간근무가산금`
- `substitute_work_bonus` -> `대체근무가산금`
- `statutory_holiday_pay` -> `법정공휴일수당`
- `education_training_allowance` -> `자기계발별정수당`, `교육훈련비`
- `unpaid_family_care_leave_adjustment` -> `무급가족돌봄휴가`

### Deductions

- `income_tax` -> `소득세`
- `resident_tax` -> `주민세`
- `rural_special_tax` -> `농특세`
- `health_insurance_employee` -> `국민건강`, `건강보험`
- `long_term_care_employee` -> `장기요양`, `장기요양보험`
- `national_pension_employee` -> `국민연금`
- `employment_insurance_employee` -> `고용보험`
- `meal_deduction` -> `식대공제`
- `labor_union_fee` -> `노동조합비`, `조합비`
- `teachers_pension_long_term_benefit` -> `교원장기급여`
- `teachers_loan_repayment` -> `교원대출상환`
- `private_school_pension_contribution` -> `사학연금부담금`
- `private_school_pension_loan_repayment` -> `사학연금대여상환금`
- `parking_fee` -> `주차료`

### Settlements

- `income_tax_settlement` -> `소득세(정산)`
- `resident_tax_settlement` -> `주민세(정산)`
- `rural_special_tax_settlement` -> `농특세(정산)`
- `health_insurance_settlement` -> `국민건강(정산)`
- `long_term_care_settlement` -> `장기요양(정산)`

### Work Records

- `total_work_hours` -> `총근로시간`
- `regular_work_hours` -> `통상근로시간`
- `overtime_hours` -> `시간외근무시간`
- `night_work_hours` -> `야간근무시간`
- `holiday_work_hours` -> `휴일근무시간`
- `night_shift_bonus_count` -> `야간근무가산횟수`
- `substitute_work_bonus_count` -> `대체근무가산횟수`
- `paid_holiday_days` -> `유급휴일`
- `unpaid_menstrual_leave_days` -> `무급생휴일`
- `annual_leave_granted_days` -> `지급연차`, `지급연차갯수`
- `annual_leave_used_days` -> `사용연차`
- `annual_leave_accrued_days` -> `발생연차`

### Summary

- `gross_pay` -> `급여총액`, `총지급액`
- `total_deduction` -> `공제총액`, `총공제액`
- `net_pay` -> `실지급액`, `차인지급액`

## Task 1: Freeze The Current V2 Baseline Before Renaming Anything

**Files:**
- Modify: `data/test-payroll-parser-v2.mjs`
- Modify: `data/payroll-parser-fixtures.json`
- Test: `data/test-payroll-parser-v2.mjs`

- [ ] **Step 1: Add a characterization test for the current 5 fixtures**

```js
const expectedSummaries = {
  "2512 일반직 급여.pdf": { gross: 5756720, deduction: 2219550, net: 3537170 },
  "2512 일반직 소급.pdf": { gross: 6742230, deduction: 377340, net: 6364890 },
  "2601 일반직 급여.pdf": { gross: 7212070, deduction: 3539620, net: 3672450 },
  "2601 일반직연차수당.pdf": { gross: 3124740, deduction: 328730, net: 2796010 },
  "2602 salary.pdf": { gross: 8093360, deduction: 1618490, net: 6474870 }
};

for (const [fileName, summary] of Object.entries(expectedSummaries)) {
  assert.equal(results[fileName].summary.grossPay, summary.gross, fileName + " gross");
  assert.equal(results[fileName].summary.totalDeductions, summary.deduction, fileName + " deduction");
  assert.equal(results[fileName].summary.netPay, summary.net, fileName + " net");
}
```

- [ ] **Step 2: Run the existing parser regression suite**

Run: `node data/test-payroll-parser-v2.mjs`
Expected: `All payroll parser v2 checks passed.` 또는 동일 의미의 PASS 출력

- [ ] **Step 3: Extend the fixture file with a normalized-item placeholder array that is still empty today**

```json
{
  "2602 salary.pdf": {
    "expected_summary": {
      "gross_pay": 8093360,
      "total_deduction": 1618490,
      "net_pay": 6474870
    },
    "expected_variable_items": []
  }
}
```

- [ ] **Step 4: Re-run the same regression suite and keep it green**

Run: `node data/test-payroll-parser-v2.mjs`
Expected: PASS

- [ ] **Step 5: Commit the baseline freeze**

```bash
git add data/test-payroll-parser-v2.mjs data/payroll-parser-fixtures.json
git commit -m "test: freeze payroll parser v2 baseline"
```

## Task 2: Introduce The Shared Payroll Item Dictionary

**Files:**
- Create: `payroll-item-dictionary.js`
- Modify: `index.html`
- Modify: `regulation.html`
- Create: `data/test-payroll-item-dictionary.mjs`
- Test: `data/test-payroll-item-dictionary.mjs`

- [ ] **Step 1: Write the failing dictionary lookup test**

```js
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PAYROLL_ITEM_DICTIONARY } = require("../payroll-item-dictionary.js");

assert.equal(
  PAYROLL_ITEM_DICTIONARY.find_item_by_label("지 급 식 보 조 비", "earning").variable_key,
  "meal_subsidy"
);
assert.equal(
  PAYROLL_ITEM_DICTIONARY.find_item_by_label("국민건강", "deduction").variable_key,
  "health_insurance_employee"
);
assert.equal(
  PAYROLL_ITEM_DICTIONARY.find_item_by_label("소득세(정산)", "settlement").variable_key,
  "income_tax_settlement"
);
```

- [ ] **Step 2: Run the new test and confirm it fails because the file does not exist yet**

Run: `node data/test-payroll-item-dictionary.mjs`
Expected: FAIL with module-not-found or missing export

- [ ] **Step 3: Create the dictionary module with compact-label normalization and alias lookup**

```js
const PAYROLL_ITEM_DICTIONARY = (() => {
  const ITEMS = {
    base_salary: {
      category: "earning",
      display_name_ko: "기준기본급",
      canonical_name_ko: "기준기본급",
      aliases_ko: ["기준기본급", "기본급", "기본기준급"],
      profile_key: null
    },
    meal_subsidy: {
      category: "earning",
      display_name_ko: "급식보조비",
      canonical_name_ko: "급식보조비",
      aliases_ko: ["급식보조비", "식대보조비", "중식보조비", "식비"],
      profile_key: null
    },
    health_insurance_employee: {
      category: "deduction",
      display_name_ko: "국민건강",
      canonical_name_ko: "국민건강",
      aliases_ko: ["국민건강", "건강보험", "국민건강보험"],
      profile_key: null
    },
    income_tax_settlement: {
      category: "settlement",
      display_name_ko: "소득세(정산)",
      canonical_name_ko: "소득세(정산)",
      aliases_ko: ["소득세(정산)", "소득세 정산", "소득세정산"],
      profile_key: null
    }
  };

  function compact_label_ko(text) {
    return String(text || "")
      .trim()
      .replace(/\s+/g, "")
      .replace(/[‐‑‒–—―]/g, "-")
      .replace(/[()]/g, function(ch) { return ch; });
  }

  function find_item_by_label(rawLabel, category) {
    const compact = compact_label_ko(rawLabel);
    for (const [variable_key, item] of Object.entries(ITEMS)) {
      if (category && item.category !== category) continue;
      if (item.aliases_ko.some(alias => compact_label_ko(alias) === compact)) {
        return { variable_key, ...item };
      }
    }
    return null;
  }

  return { ITEMS, compact_label_ko, find_item_by_label };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { PAYROLL_ITEM_DICTIONARY };
}
```

- [ ] **Step 4: Load the new dictionary before calculators and parser**

```html
<script src="payroll-item-dictionary.js?v=1.0"></script>
<script src="calculators.js?v=1.4"></script>
<script src="payroll.js?v=1.4"></script>
<script src="salary-parser.js?v=2.4"></script>
```

- [ ] **Step 5: Run the dictionary test and keep it green**

Run: `node data/test-payroll-item-dictionary.mjs`
Expected: PASS

- [ ] **Step 6: Commit the dictionary layer**

```bash
git add payroll-item-dictionary.js index.html regulation.html data/test-payroll-item-dictionary.mjs
git commit -m "feat: add shared payroll item dictionary"
```

## Task 3: Attach `variable_key` To Parser Output Without Breaking The Legacy API

**Files:**
- Modify: `salary-parser.js`
- Modify: `data/test-payroll-parser-v2.mjs`
- Create: `data/payroll-variable-key-fixtures.json`
- Test: `data/test-payroll-parser-v2.mjs`

- [ ] **Step 1: Write the failing parser test for normalized items**

```js
const parsed = await parseFixture("2602 salary.pdf");
const earning = parsed.salaryItems.find(item => item.name === "급식보조비");
assert.equal(earning.variable_key, "meal_subsidy");
assert.equal(earning.canonical_name_ko, "급식보조비");
assert.equal(earning.original_name_ko, "급식보조비");
```

- [ ] **Step 2: Run the parser test to confirm `variable_key` is currently missing**

Run: `node data/test-payroll-parser-v2.mjs`
Expected: FAIL with `undefined !== "meal_subsidy"`

- [ ] **Step 3: Add a single normalized-item constructor and use it everywhere items are emitted**

```js
function create_normalized_item(input) {
  const lookup = PAYROLL_ITEM_DICTIONARY.find_item_by_label(input.raw_name, input.category);
  return {
    block: input.block,
    category: input.category,
    variable_key: lookup ? lookup.variable_key : null,
    name: lookup ? lookup.display_name_ko : cleanCellText(input.raw_name),
    original_name_ko: input.raw_name,
    canonical_name_ko: lookup ? lookup.canonical_name_ko : cleanCellText(input.raw_name),
    amount_or_value: input.amount_or_value,
    unit_or_formula: input.unit_or_formula || null,
    row: input.row,
    col: input.col,
    source_refs: input.source_refs || [],
    repair: input.repair || { applied: false, repair_type: null, original_compact: null },
    confidence: input.confidence == null ? 1 : input.confidence
  };
}
```

- [ ] **Step 4: Keep the legacy shape but map it from the normalized item**

```js
function to_legacy_item(item) {
  return {
    name: item.name,
    amount: item.amount_or_value,
    variable_key: item.variable_key,
    variableKey: item.variable_key,
    originalName: item.original_name_ko,
    original_name_ko: item.original_name_ko,
    canonicalName: item.canonical_name_ko,
    canonical_name_ko: item.canonical_name_ko,
    row: item.row,
    col: item.col
  };
}
```

- [ ] **Step 5: Re-run the parser regression suite and keep the previous 5 fixtures green**

Run: `node data/test-payroll-parser-v2.mjs`
Expected: PASS

- [ ] **Step 6: Commit the parser key attachment**

```bash
git add salary-parser.js data/test-payroll-parser-v2.mjs data/payroll-variable-key-fixtures.json
git commit -m "feat: attach variable keys to parsed payroll items"
```

## Task 4: Add Broken-Label Repair And Unknown Registry

**Files:**
- Create: `payroll-label-registry.js`
- Modify: `salary-parser.js`
- Modify: `index.html`
- Create: `data/test-payroll-label-registry.mjs`
- Test: `data/test-payroll-label-registry.mjs`

- [ ] **Step 1: Write a failing test for unique repair and unknown registration**

```js
const repaired = repair_label_candidate("지 급 식 보 조 비", "earning", new Set());
assert.equal(repaired.variable_key, "meal_subsidy");

const unknown = register_unknown_label({
  raw_label: "별 정 수 당 약 제 부",
  category: "earning",
  document_type: "salary_pdf"
});
assert.equal(unknown.count, 1);
```

- [ ] **Step 2: Run the test and confirm missing functions**

Run: `node data/test-payroll-label-registry.mjs`
Expected: FAIL

- [ ] **Step 3: Implement registry helpers with duplicate-safe repair**

```js
function repair_label_candidate(raw_label, category, seen_keys) {
  const lookup = PAYROLL_ITEM_DICTIONARY.find_item_by_label(raw_label, category);
  if (!lookup) return null;
  if (seen_keys.has(lookup.variable_key)) return null;
  return {
    variable_key: lookup.variable_key,
    canonical_name_ko: lookup.canonical_name_ko,
    repair_type: "unique_alias_match",
    original_compact: PAYROLL_ITEM_DICTIONARY.compact_label_ko(raw_label)
  };
}

function register_unknown_label(entry) {
  const store = load_unknown_registry();
  const fingerprint = [
    PAYROLL_ITEM_DICTIONARY.compact_label_ko(entry.raw_label),
    entry.category,
    entry.document_type
  ].join("::");
  const current = store[fingerprint] || { ...entry, count: 0 };
  current.count += 1;
  store[fingerprint] = current;
  save_unknown_registry(store);
  return current;
}
```

- [ ] **Step 4: Wire repair first, unknown second, drop neither**

```js
const repair = repair_label_candidate(rawName, category, seenKeys);
const normalized = create_normalized_item({
  block,
  category,
  raw_name: rawName,
  amount_or_value: amount,
  row,
  col,
  repair: repair ? { applied: true, ...repair } : { applied: false, repair_type: null, original_compact: null }
});

if (!normalized.variable_key) {
  register_unknown_label({
    raw_label: rawName,
    category,
    document_type: parsedData.metadata?.documentType || "unknown"
  });
}
```

- [ ] **Step 5: Run the registry test and parser regression together**

Run: `node data/test-payroll-label-registry.mjs && node data/test-payroll-parser-v2.mjs`
Expected: both PASS

- [ ] **Step 6: Commit the repair/unknown layer**

```bash
git add payroll-label-registry.js salary-parser.js index.html data/test-payroll-label-registry.mjs
git commit -m "feat: add broken label repair and unknown registry"
```

## Task 5: Move Calculator Internals To Key-Based Structures With Legacy Adapters

**Files:**
- Modify: `calculators.js`
- Modify: `payroll.js`
- Create: `data/test-payroll-validation.mjs`
- Test: `data/test-payroll-validation.mjs`

- [ ] **Step 1: Write the failing calculator output test**

```js
const wage = CALC.calcOrdinaryWage("general_J_grade", "J3", 4, { adjustPay: 603400 });
assert.equal(wage.breakdown_by_key.base_salary, wage.breakdown["기준기본급"]);
assert.equal(wage.breakdown_by_key.meal_subsidy, wage.breakdown["급식보조비"]);
assert.equal(wage.breakdown_by_key.transport_subsidy, wage.breakdown["교통보조비"]);
```

- [ ] **Step 2: Run the test and confirm `breakdown_by_key` is absent**

Run: `node data/test-payroll-validation.mjs`
Expected: FAIL

- [ ] **Step 3: Build a key-first breakdown and derive Korean display labels from the dictionary**

```js
const breakdown_by_key = {
  base_salary: monthlyBase,
  seniority_base_salary: seniorityBasePay,
  ability_pay: monthlyAbility,
  bonus_monthly: monthlyBonus,
  adjust_pay: adjustPay,
  meal_subsidy: mealSubsidy,
  transport_subsidy: transportSubsidy,
  holiday_bonus_monthly_accrual: monthlyHolidayBonus
};

const breakdown = Object.fromEntries(
  Object.entries(breakdown_by_key)
    .filter(([, value]) => value != null && value !== 0)
    .map(([variable_key, value]) => {
      const item = PAYROLL_ITEM_DICTIONARY.ITEMS[variable_key];
      return [item.display_name_ko, value];
    })
);
```

- [ ] **Step 4: Preserve old return fields and add new ones**

```js
return {
  monthlyWage,
  hourlyRate,
  breakdown_by_key,
  breakdown,
  displayInfo
};
```

- [ ] **Step 5: Update `payroll.js` consumers to prefer key-based access**

```js
const breakdownByKey = wage.breakdown_by_key || {};
const baseSalary = breakdownByKey.base_salary || wage.breakdown["기준기본급"] || 0;
const adjustPay = breakdownByKey.adjust_pay || wage.breakdown["조정급"] || 0;
```

- [ ] **Step 6: Run the validation test and keep existing parser tests green**

Run: `node data/test-payroll-validation.mjs && node data/test-payroll-parser-v2.mjs`
Expected: PASS

- [ ] **Step 7: Commit the calculator migration layer**

```bash
git add calculators.js payroll.js data/test-payroll-validation.mjs
git commit -m "refactor: add key-based payroll calculator outputs"
```

## Task 6: Switch App Comparison, Profile Sync, And Payslip Rendering To `variable_key`

**Files:**
- Modify: `salary-parser.js`
- Modify: `app.js`
- Modify: `payroll-views.js`
- Test: `data/test-payroll-parser-v2.mjs`

- [ ] **Step 1: Write a failing comparison test around `compareWithApp()`**

```js
const comparison = SALARY_PARSER.compareWithApp({
  salaryItems: [
    { name: "직책수당", variable_key: "position_pay", amount: 120000 }
  ]
});

assert.equal(comparison.payItems[0].appValue, 120000);
```

- [ ] **Step 2: Run the parser test and confirm the comparison still uses Korean label exact match**

Run: `node data/test-payroll-parser-v2.mjs`
Expected: FAIL or mismatched comparison value

- [ ] **Step 3: Replace name-based lookup with key-based lookup plus fallback**

```js
function build_item_map_from_array(items) {
  const map = {};
  for (const item of items || []) {
    const key = item.variable_key || item.variableKey || null;
    if (key) map[key] = item.amount ?? item.amount_or_value ?? 0;
  }
  return map;
}

function build_item_map_from_object(itemsObject) {
  const map = {};
  for (const [label, amount] of Object.entries(itemsObject || {})) {
    const lookup = PAYROLL_ITEM_DICTIONARY.find_item_by_label(label);
    if (lookup) map[lookup.variable_key] = amount;
  }
  return map;
}
```

- [ ] **Step 4: Move profile auto-fill to dictionary metadata instead of hard-coded map**

```js
const itemMeta = PAYROLL_ITEM_DICTIONARY.ITEMS[item.variable_key];
const profileKey = itemMeta && itemMeta.profile_key;
if (profileKey && !profile[profileKey]) {
  profile[profileKey] = item.amount;
}
```

- [ ] **Step 5: Rebuild `buildPayComparison()` around `variable_key`**

```js
const estimatedMap = build_item_map_from_object(estimatedItems);
const actualMap = build_item_map_from_array(actualItems);
const allKeys = new Set([...Object.keys(estimatedMap), ...Object.keys(actualMap)]);

for (const variable_key of allKeys) {
  const item = PAYROLL_ITEM_DICTIONARY.ITEMS[variable_key];
  rows.push({
    variable_key,
    name: item ? item.display_name_ko : variable_key,
    estimated: estimatedMap[variable_key] || 0,
    actual: actualMap[variable_key] || 0
  });
}
```

- [ ] **Step 6: Run regression tests and browser smoke test after the app migration**

Run: `node data/test-payroll-parser-v2.mjs`
Expected: PASS

Run: `python3 -m http.server 4173`
Expected: local server starts for browser smoke testing

- [ ] **Step 7: Commit the app key migration**

```bash
git add salary-parser.js app.js payroll-views.js
git commit -m "refactor: use variable keys in payslip comparison and sync"
```

## Task 7: Add Rule Bindings And Validation Checks Tied To `variable_key`

**Files:**
- Create: `payroll-rule-bindings.js`
- Modify: `regulation-constants.js`
- Modify: `regulation.js`
- Create: `data/test-payroll-validation.mjs`
- Test: `data/test-payroll-validation.mjs`

- [ ] **Step 1: Write failing tests for fixed amount, month gate, and formula validation**

```js
assert.deepEqual(
  validate_parsed_item("meal_subsidy", 150000, { year: 2026, month: 2 }).status,
  "ok"
);
assert.deepEqual(
  validate_parsed_item("holiday_bonus_event", 0, { year: 2026, month: 3 }).status,
  "ok_not_applicable"
);
assert.deepEqual(
  validate_formula_item("holiday_bonus_event", 1500000, {
    base_salary: 2907500,
    adjust_pay: 603400
  }).status,
  "mismatch"
);
```

- [ ] **Step 2: Run the validation test and confirm missing binding functions**

Run: `node data/test-payroll-validation.mjs`
Expected: FAIL

- [ ] **Step 3: Create explicit rule bindings instead of guessing from UI strings**

```js
const PAYROLL_RULE_BINDINGS = {
  meal_subsidy: {
    validation_kind: "fixed_amount",
    source: "regulation-constants.js",
    effective_year: 2026,
    amount: 150000
  },
  transport_subsidy: {
    validation_kind: "fixed_amount",
    source: "regulation-constants.js",
    effective_year: 2026,
    amount: 150000
  },
  holiday_bonus_event: {
    validation_kind: "formula_month_gate",
    source: "regulation.js",
    months: [1, 2, 5, 7, 9],
    formula: "(base_salary + adjust_pay / 2) * 0.5"
  }
};
```

- [ ] **Step 4: Add a validator that returns structured evidence instead of boolean only**

```js
function validate_parsed_item(variable_key, actual_amount, context) {
  const binding = PAYROLL_RULE_BINDINGS[variable_key];
  if (!binding) return { status: "no_rule", variable_key };

  if (binding.validation_kind === "fixed_amount") {
    return {
      status: actual_amount === binding.amount ? "ok" : "mismatch",
      variable_key,
      expected_amount: binding.amount,
      actual_amount
    };
  }

  if (binding.validation_kind === "formula_month_gate") {
    if (!binding.months.includes(context.month)) {
      return { status: "ok_not_applicable", variable_key };
    }
  }

  return { status: "no_rule", variable_key };
}
```

- [ ] **Step 5: Add an audit helper for source conflicts**

```js
function audit_source_conflicts() {
  return [
    {
      variable_key: "meal_subsidy",
      runtime_amount: DATA.allowances.mealSubsidy,
      union_json_note: 120000,
      status: DATA.allowances.mealSubsidy === 120000 ? "aligned" : "conflict"
    }
  ];
}
```

- [ ] **Step 6: Run validation tests**

Run: `node data/test-payroll-validation.mjs`
Expected: PASS

- [ ] **Step 7: Commit the rule-binding layer**

```bash
git add payroll-rule-bindings.js regulation-constants.js regulation.js data/test-payroll-validation.mjs
git commit -m "feat: add payroll rule bindings and validators"
```

## Task 8: Add Unknown Label CRUD In The Payslip UI

**Files:**
- Modify: `payroll-views.js`
- Modify: `app.js`
- Modify: `index.html`
- Test: browser smoke test only

- [ ] **Step 1: Add a small unknown summary block to the payslip detail view**

```js
function renderUnknownItems(unknownItems) {
  if (!unknownItems || !unknownItems.length) return "";
  return `
    <section class="card">
      <div class="card-title">Unknown 항목</div>
      <div class="stack">
        ${unknownItems.map(function(item) {
          return `
            <button class="unknown-item-btn" data-raw-label="${escapeHtml(item.original_name_ko)}">
              ${escapeHtml(item.original_name_ko)}
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `;
}
```

- [ ] **Step 2: Add a correction modal that saves a local override**

```js
function saveUnknownCorrection(rawLabel, variableKey, scope) {
  upsert_label_override({
    raw_label: rawLabel,
    variable_key: variableKey,
    scope: scope || "global"
  });
}
```

- [ ] **Step 3: Show dictionary suggestions first, manual key search second**

```js
const suggestions = PAYROLL_ITEM_DICTIONARY.search_items_by_compact_label(rawLabel);
```

- [ ] **Step 4: Reload the current payslip after saving an override**

```js
saveUnknownCorrection(rawLabel, variableKey, scope);
const reparsed = SALARY_PARSER.reparseSavedPayslip(currentMonthlyKey);
renderPayslipTab(reparsed);
```

- [ ] **Step 5: Smoke test the unknown flow in the browser**

Run: start local server, upload a payslip with an intentionally broken label fixture, save a correction, refresh, and confirm the item moves from `unknownItems` to the parsed block

Expected: corrected item is no longer shown in Unknown, and the same broken label is auto-repaired on the next parse

- [ ] **Step 6: Commit the CRUD UI**

```bash
git add payroll-views.js app.js index.html
git commit -m "feat: add unknown label correction UI"
```

## Task 9: End-To-End Verification, Privacy Audit, And Cutover Rules

**Files:**
- Modify: `docs/salary-parser-v2-privacy.md`
- Test: `data/test-payroll-parser-v2.mjs`
- Test: `data/test-payroll-item-dictionary.mjs`
- Test: `data/test-payroll-label-registry.mjs`
- Test: `data/test-payroll-validation.mjs`

- [ ] **Step 1: Run the full local test suite**

Run:

```bash
node data/test-payroll-parser-v2.mjs
node data/test-payroll-item-dictionary.mjs
node data/test-payroll-label-registry.mjs
node data/test-payroll-validation.mjs
node --check salary-parser.js
node --check calculators.js
node --check app.js
```

Expected: all commands PASS with exit code 0

- [ ] **Step 2: Run a static privacy search on parser paths**

Run:

```bash
rg -n "fetch\\(|XMLHttpRequest|sendBeacon|FormData|axios|upload" salary-parser.js payroll-item-dictionary.js payroll-label-registry.js app.js payroll-views.js
```

Expected: parser-specific files return no upload path; if `app.js` has unrelated network code, document it as outside parser flow

- [ ] **Step 3: Re-run the browser upload smoke tests**

Run through browser:

- `2512 일반직 급여.pdf`
- `2512 일반직 소급.pdf`
- `2601 일반직 급여.pdf`
- `2601 일반직연차수당.pdf`
- `2602 salary.pdf`

Expected:

- each upload completes
- `saveMonthlyData()` persists
- `급여 명세서` 탭 renders salary/deduction items
- `unknownItems` only contains genuinely unresolved labels
- `workRecords` may be zero and is not treated as error
- `(정산)` 항목 is separated from general deduction rows

- [ ] **Step 4: Write the privacy note**

```md
# Salary Parser V2 Privacy

- All parsing runs in the browser
- PDF/image bytes never leave the device
- OCR uses local Tesseract.js only
- Parsed outputs are stored in localStorage only
```

- [ ] **Step 5: Commit the verification/documentation pass**

```bash
git add docs/salary-parser-v2-privacy.md
git commit -m "docs: record payroll parser v2 privacy guarantees"
```

## Execution Order Rules

아래 순서는 바꾸지 않는다.

1. **Baseline freeze**
2. **Dictionary**
3. **Parser normalized item + variable_key**
4. **Broken-label repair + unknown registry**
5. **Calculator key migration**
6. **App comparison/profile migration**
7. **Rule bindings + validator**
8. **Unknown CRUD UI**
9. **Full verification**

즉, **A4 HTML preview**, **vision 비교 UI**, **엑셀 export**는 이 core migration이 끝나기 전까지 다시 파고들지 않는다.

## Explicitly Deferred Until Core Migration Is Stable

이전 대화에서 나왔지만, 지금 당장 core parser completion보다 우선순위가 낮은 작업들이다.

### Deferred A: PDF-like A4 HTML Preview

- 원본 PDF 셀/그리드와 1:1 대응하는 preview
- 이건 parser data model이 안정된 뒤에 다시 붙인다.
- 지금 먼저 하면 표 fidelity에 시간을 다 쓰고 정작 내부 key/validation이 또 흔들린다.

### Deferred B: Vision Comparison Harness

- 고해상도 렌더 + 사람이 OCR 하듯 검수하는 비교 리포트
- 이건 parser 품질 검증 수단으로 계속 유효하지만, parser 구조가 바뀌는 동안 주 개발 트랙으로 끌고 가면 산만해진다.

### Deferred C: Excel Export Of Parsed/Calculated/Rendered Rows

- `parsed`, `calculated`, `rendered to payslip tab` 3계층 비교 엑셀
- parser key migration 이후에 만들면 열 이름과 매핑이 훨씬 안정적이다.

## Next Session Start Checklist

다음 세션에서는 아래 순서로 재개한다.

1. `cd /Users/momo/.config/superpowers/worktrees/bhm_overtime/codex/salary-parser-v2`
2. `git status --short --branch`
3. `node data/test-payroll-parser-v2.mjs`
4. 이 plan 문서를 다시 읽고 **Task 1부터 순서대로** 시작
5. UI 작업으로 바로 가지 말고 dictionary와 parser key attach부터 끝낸다

## Completion Criteria

아래가 모두 만족되면 이번 계획 범위는 완료다.

- parser output의 모든 known item에 `variable_key`가 있다
- broken label이 unique alias match면 자동 복구된다
- unresolved label은 `unknownItems`와 registry에 남는다
- 사용자가 unknown label을 UI에서 수정하고 재사용할 수 있다
- `compareWithApp()`와 `buildPayComparison()`가 `variable_key`로 비교한다
- `calculators.js`가 key-based breakdown을 제공한다
- 규정/상수/계산식 검증이 `variable_key` 단위로 가능하다
- 5개 fixture가 PASS한다
- 업로드 -> `saveMonthlyData()` -> `급여 명세서` 탭 렌더 스모크 테스트가 PASS한다
- 파서 경로에서 외부 전송이 없다

