# Phase 5: Cross-module 명시 ESM import/export 전환 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 30+ ESM 모듈의 cross-module bare identifier 참조 → 명시 `import`/`export` 변환. window 호환층은 KEEP allowlist 만 유지. ESLint no-undef strict 도입으로 회귀 영구 차단.

**Architecture:** Phase 2 layer 그래프 유지 (Layer 0 → 5 의존성 방향 보존). PROFILE_FIELDS 만 app.js → profile.js 이동 (entry → leaf 역방향 import 회피). window.X 노출은 inline onclick / sw.js 외부 참조만 KEEP.

**Tech Stack:** ES Module + Vitest jsdom + Playwright e2e + ESLint v9 flat config.

**SPEC:** [docs/superpowers/specs/2026-04-27-phase5-cross-module-esm.md]

**Branch / Worktree:**
```bash
git worktree add ../bhm_overtime-phase5 -b feat/phase5-cross-module-esm
cd ../bhm_overtime-phase5
```

---

## Inventory Summary (사전)

- 총 cross-module bare 참조 grep hit: **729건** (UPPER_CASE 기준; tests/dist 제외 포함)
- 핵심 위반 모듈 (참조 수 기준 top 10):
  - app.js (136) — entry 이지만 자체 정의 + 호환층 노출 큰 비중
  - payroll.js (126) — 일부 import 완료, 나머지 보강
  - regulation.js (53), profile-tab.js (52), leave-tab.js (48), pay-estimation.js (31)
  - calculators.js (36), payslip-tab.js (13), salary-parser.js (9), payroll-views.js (9), data.js (9)
  - settings-ui.js (8), overtime.js (6), leave.js (6), retirement-engine.js (2), profile.js (2)
- 공개 호출 함수 (window 노출 후보): inline onclick 대상 + data-action 핸들러 + sw.js
- KEEP allowlist 산출: Task 5-1 의 첫 step 으로 grep 자동 산출

---

## Task 1: 인벤토리 + 회귀 가드 통합 테스트 + ESLint setup

**Files:**
- Create: `docs/superpowers/plans/2026-04-27-phase5-inventory.md` (자동 생성 인벤토리 결과 저장)
- Create: `tests/integration/cross-module-imports.test.js` (회귀 가드)
- Create: `eslint.config.js` (flat config)
- Modify: `package.json` (lint script + devDependencies)

- [ ] **Step 1.1: 인벤토리 자동 생성**

```bash
{
  echo "# Phase 5 인벤토리 — $(date '+%Y-%m-%d')"
  echo ""
  echo "## Top-level identifiers (per file)"
  echo ""
  for f in *.js; do
    ids=$(grep -hE '^(export\s+)?(const|let|var|function|class)\s+([A-Z_][A-Z0-9_]*|[a-z_][a-zA-Z0-9_]*)' "$f" \
      | sed -E 's/^(export\s+)?(const|let|var|function|class)\s+([A-Za-z_][A-Za-z0-9_]*).*/\3/' | sort -u | tr '\n' ',' | sed 's/,$//')
    [ -n "$ids" ] && echo "- \`$f\`: $ids"
  done
  echo ""
  echo "## Cross-module bare 참조 (per file, sorted)"
  echo ""
  grep -rEn '\b(PROFILE|CALC|DATA|HOLIDAYS|LEAVE|OVERTIME|PAYROLL|AppLock|SALARY_PARSER|RetirementEngine|PROFILE_FIELDS|DATA_STATIC)\.' --include='*.js' . 2>/dev/null \
    | grep -v 'window\.' | grep -v 'typeof ' | grep -v 'node_modules' | grep -v '^\./tests/' | grep -v '^\./dist/' | grep -v '^\./archive/' \
    | awk -F: '{print $1}' | sort | uniq -c | sort -rn | sed 's/^ */- /'
  echo ""
  echo "## HTML inline onclick 대상 (KEEP allowlist 후보)"
  echo ""
  grep -hEo 'onclick="[^"]+"' *.html public/tabs/*.html public/admin/*.html 2>/dev/null \
    | sed -E 's/.*onclick="([a-zA-Z_][a-zA-Z0-9_]*).*/\1/' | sort -u | sed 's/^/- /'
  echo ""
  echo "## sw.js 참조 함수 (KEEP allowlist 보강)"
  echo ""
  [ -f public/sw.js ] && grep -hEo '\b[A-Za-z_][A-Za-z0-9_]*\(' public/sw.js | sort -u | sed 's/^/- /'
} > docs/superpowers/plans/2026-04-27-phase5-inventory.md
```

- [ ] **Step 1.2: 회귀 가드 통합 테스트 작성**

`tests/integration/cross-module-imports.test.js` (jsdom 환경에서 안전 DOM 빌더로 form 시드):

```js
import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';

beforeAll(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.HTMLElement = dom.window.HTMLElement;
});

function seedFormFields(ids) {
  for (const id of ids) {
    const input = document.createElement('input');
    input.id = id;
    document.body.appendChild(input);
  }
}

describe('Phase 5: cross-module ESM imports', () => {
  it('Layer 0 (data / regulation-constants / shared-utils) → no throw', async () => {
    await expect(import('../../data.js')).resolves.toBeTruthy();
    await expect(import('../../regulation-constants.js')).resolves.toBeTruthy();
    await expect(import('../../shared-utils.js')).resolves.toBeTruthy();
  });

  it('Layer 1 (calculators / holidays / retirement-engine) → no throw', async () => {
    await expect(import('../../calculators.js')).resolves.toBeTruthy();
    await expect(import('../../holidays.js')).resolves.toBeTruthy();
    await expect(import('../../retirement-engine.js')).resolves.toBeTruthy();
  });

  it('Layer 2 (profile / overtime / leave / payroll) → no throw', async () => {
    await expect(import('../../profile.js')).resolves.toBeTruthy();
    await expect(import('../../overtime.js')).resolves.toBeTruthy();
    await expect(import('../../leave.js')).resolves.toBeTruthy();
    await expect(import('../../payroll.js')).resolves.toBeTruthy();
  });

  it('Layer 3 (appLock) → no throw', async () => {
    await expect(import('../../appLock.js')).resolves.toBeTruthy();
  });

  it('Layer 4 UI 모듈 → no throw + named export 노출 검증', async () => {
    await expect(import('../../profile-tab.js')).resolves.toBeTruthy();
    await expect(import('../../work-history.js')).resolves.toBeTruthy();
    await expect(import('../../salary-parser.js')).resolves.toBeTruthy();
    await expect(import('../../payslip-tab.js')).resolves.toBeTruthy();
    await expect(import('../../payroll-views.js')).resolves.toBeTruthy();
    await expect(import('../../pay-estimation.js')).resolves.toBeTruthy();
    await expect(import('../../leave-tab.js')).resolves.toBeTruthy();
    await expect(import('../../settings-ui.js')).resolves.toBeTruthy();
    await expect(import('../../resume.js')).resolves.toBeTruthy();
    await expect(import('../../job-templates.js')).resolves.toBeTruthy();
  });

  it('PROFILE_FIELDS 가 profile.js 에서 named export 으로 노출 (Phase 5 D3)', async () => {
    const mod = await import('../../profile.js');
    expect(mod.PROFILE_FIELDS).toBeDefined();
    expect(typeof mod.PROFILE_FIELDS).toBe('object');
    expect(mod.PROFILE_FIELDS.name).toBe('pfName');
  });

  it('profile-tab.js 가 PROFILE_FIELDS 를 명시 import — applyToForm 호출 시 throw 0', async () => {
    seedFormFields(['pfName', 'pfEmployeeNumber', 'pfDepartment', 'pfHireDate', 'pfJobType']);
    const profileMod = await import('../../profile.js');
    profileMod.PROFILE.save({ name: '홍길동', employeeNumber: '12345', department: '간호본부', hireDate: '2020-03-01', jobType: '간호' });
    await import('../../profile-tab.js');
    expect(() => {
      const saved = profileMod.PROFILE.load();
      profileMod.PROFILE.applyToForm(saved, profileMod.PROFILE_FIELDS);
    }).not.toThrow();
    expect(document.getElementById('pfName').value).toBe('홍길동');
  });
});
```

- [ ] **Step 1.3: 테스트 실패 확인**

```bash
npx vitest run tests/integration/cross-module-imports.test.js
```

Expected: PROFILE_FIELDS named export 검증 FAIL (아직 profile.js 에 정의 없음).

- [ ] **Step 1.4: ESLint setup**

```bash
npm install --save-dev eslint globals
```

`eslint.config.js`:

```js
import globals from 'globals';

export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        // Vitest globals (테스트 파일 전용 — 글로벌 fallback)
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'archive/**',
      'public/legacy/**',
      'shorts-studio/**',
      'public/admin/**',  // 별도 admin UI — Phase 5 범위 외
    ],
  },
];
```

`package.json` scripts 추가:
```json
"lint": "eslint .",
"lint:fix": "eslint . --fix"
```

- [ ] **Step 1.5: 베이스라인 lint 실행 (예상 — 수많은 에러)**

```bash
npm run lint 2>&1 | tail -20
npm run lint 2>&1 | grep "no-undef" | wc -l
```

베이스라인 (Task 6 에서 0 까지 줄임).

- [ ] **Step 1.6: 커밋**

```bash
git add tests/integration/cross-module-imports.test.js eslint.config.js package.json package-lock.json docs/superpowers/plans/2026-04-27-phase5-inventory.md
git commit -m "feat(phase5-1): 인벤토리 + cross-module-imports 회귀 가드 테스트 + ESLint flat config"
```

---

## Task 2: Layer 0/1/2 import 보강 (consumer side) + PROFILE_FIELDS 이동

대부분 이미 import 완료 (calculators / overtime / leave / payroll). 미보강 부분만 정리.

**Files:**
- Modify: `regulation.js` (Layer 0/1 의존을 named import 로 명시)
- Modify: `retirement.js`, `retirement-engine.js` (외부 참조 정리)
- Modify: `profile.js` (D3 — PROFILE_FIELDS 정의 이동)
- Modify: `app.js` (PROFILE_FIELDS 정의 잘라내기 + import)

- [ ] **Step 2.1: PROFILE_FIELDS 를 profile.js 로 이동 (D3)**

`app.js:83` 의 PROFILE_FIELDS 정의 블록을 잘라내어 `profile.js` 끝부분으로 이동.

profile.js 끝부분 (export 이후, window 호환층 이전):
```js
// PROFILE_FIELDS — form id ↔ profile property 매핑 (Phase 5 D3: app.js → profile.js 이동)
export const PROFILE_FIELDS = {
  /* app.js 의 기존 정의 본문 그대로 복사 */
};
```

(주의: app.js 의 정확한 PROFILE_FIELDS 본문을 그대로 옮길 것 — Step 2.2 에서 grep 으로 확인)

- [ ] **Step 2.2: app.js 정의 → import 으로 변경**

`app.js`:
```js
// Before
const PROFILE_FIELDS = { /* ... */ };

// After (정의 제거 + import 추가)
import { PROFILE_FIELDS } from './profile.js';
```

`window.PROFILE_FIELDS = PROFILE_FIELDS` 호환층은 Task 5 (KEEP allowlist) 까지 유지 — 이번 task 에서 동작 보존.

- [ ] **Step 2.3: regulation.js / retirement.js entry import 보강**

regulation.js 가 사용하는 identifier 모두 named import:
```js
// 기존 side-effect import 옆에 named import 추가
import { CALC } from './calculators.js';
import { DATA } from './data.js';
import { PROFILE } from './profile.js';
// regulation 내부 사용 분 모두 cover
```

retirement.js 도 동일.

- [ ] **Step 2.4: 테스트 + lint 변화 확인**

```bash
npm run test:unit
npm run test:integration
npm run lint 2>&1 | grep "no-undef" | wc -l   # 베이스라인 대비 감소 확인
```

Expected: 회귀 0 + PROFILE_FIELDS 통합 테스트 PASS.

- [ ] **Step 2.5: 커밋**

```bash
git add app.js profile.js regulation.js retirement.js retirement-engine.js
git commit -m "feat(phase5-2): PROFILE_FIELDS profile.js 이동 + Layer 0/1/2 import 보강"
```

---

## Task 3: Layer 4 UI part 1 — profile-tab / pay-estimation / salary-parser / work-history

**Files:**
- Modify: `profile-tab.js`, `pay-estimation.js`, `salary-parser.js`, `work-history.js`

- [ ] **Step 3.1: profile-tab.js 상단에 named import 추가**

```js
// 파일 최상단 (기존 코멘트 뒤)
import { PROFILE, PROFILE_FIELDS } from './profile.js';
// _loadWorkHistory 등은 work-history.js export 후 import (Step 3.4 에서 처리)
```

- [ ] **Step 3.2: profile-tab.js typeof 가드 제거**

```bash
grep -n "typeof PROFILE_FIELDS" profile-tab.js
grep -n "typeof PROFILE\b" profile-tab.js
```

각 가드 line 을 직접 호출로 변경:
```js
// Before
if (typeof PROFILE_FIELDS !== 'undefined') PROFILE.applyToForm(saved, PROFILE_FIELDS);
// After
PROFILE.applyToForm(saved, PROFILE_FIELDS);
```

- [ ] **Step 3.3: pay-estimation.js / salary-parser.js 동일 변환**

상단 import 추가 + typeof 가드 제거:
```js
import { PROFILE, PROFILE_FIELDS } from './profile.js';
import { CALC } from './calculators.js';
```

- [ ] **Step 3.4: work-history.js → named export 추가**

work-history.js 의 함수들이 다른 모듈에서 호출되므로 named export 화:
```js
// Before
function _loadWorkHistory() { /* ... */ }
function _saveWorkHistory(records) { /* ... */ }
function renderWorkHistory() { /* ... */ }

// After (export 추가)
export function _loadWorkHistory() { /* ... */ }
export function _saveWorkHistory(records) { /* ... */ }
export function renderWorkHistory() { /* ... */ }
export function _showWorkHistoryUpdateBanner(segments) { /* ... */ }
export function rebuildWorkHistoryFromPayslipsForceReplace() { /* ... */ }
```

profile-tab.js 에 import 추가:
```js
import {
  _loadWorkHistory, _saveWorkHistory, renderWorkHistory,
  _showWorkHistoryUpdateBanner,
} from './work-history.js';
```

salary-parser.js 의 applyStableItemsToProfile 트리거 (Phase 4-A) 에서 `window._loadWorkHistory` 사용 → named import 으로 교체:
```js
// salary-parser.js 상단
import { _loadWorkHistory, _saveWorkHistory, renderWorkHistory, _showWorkHistoryUpdateBanner } from './work-history.js';

// 트리거 본체 (Phase 4-A)
const existing = _loadWorkHistory();
const result = rebuildWorkHistoryFromPayslips({ profile, existing, hospital });
if (result.mode === 'replace') {
  _saveWorkHistory(result.records);
  renderWorkHistory();
} else if (result.mode === 'banner') {
  _showWorkHistoryUpdateBanner(result.segments);
}
```

- [ ] **Step 3.5: 테스트 + 회귀**

```bash
npm run test:unit
npm run test:integration
```

Expected:
- 168 unit + 37 integration PASS
- 통합 테스트 cross-module-imports 의 profile-tab applyToForm 케이스 PASS (사용자 보고 회귀 자동 해결!)

- [ ] **Step 3.6: 커밋**

```bash
git add profile-tab.js pay-estimation.js salary-parser.js work-history.js
git commit -m "feat(phase5-3): Layer 4 UI part 1 — profile-tab/pay-estimation/salary-parser/work-history 명시 import + 사용자 보고 form 비어 있음 회귀 해결"
```

---

## Task 4: Layer 4 UI part 2 — leave-tab / payslip-tab / payroll-views / settings-ui / resume / job-templates

**Files:**
- Modify: `leave-tab.js`, `payslip-tab.js`, `payroll-views.js`, `settings-ui.js`, `resume.js`, `job-templates.js`

- [ ] **Step 4.1: 각 모듈 상단 named import 추가**

`leave-tab.js`:
```js
import { CALC } from './calculators.js';
import { DATA } from './data.js';
import { PROFILE } from './profile.js';
import { LEAVE } from './leave.js';
// 등 — 사용 identifier 전부
```

`payslip-tab.js`:
```js
import { PROFILE, PROFILE_FIELDS } from './profile.js';
import { SALARY_PARSER } from './salary-parser.js';
import { CALC } from './calculators.js';
```

`payroll-views.js`:
```js
import { PAYROLL } from './payroll.js';
import { PROFILE } from './profile.js';
import { CALC } from './calculators.js';
import { DATA } from './data.js';
```

`settings-ui.js`:
```js
import { PROFILE } from './profile.js';
import { AppLock } from './appLock.js';
// 외 사용 분
```

`resume.js`, `job-templates.js`: 사용 identifier grep 으로 산출 → import.

- [ ] **Step 4.2: typeof 가드 제거**

```bash
grep -nE "typeof (PROFILE|CALC|DATA|HOLIDAYS|LEAVE|OVERTIME|PAYROLL|AppLock|SALARY_PARSER|RetirementEngine|PROFILE_FIELDS|DATA_STATIC)\b" leave-tab.js payslip-tab.js payroll-views.js settings-ui.js resume.js job-templates.js
```

각 hit 의 가드 제거.

- [ ] **Step 4.3: SALARY_PARSER named export 보강 (필요 시)**

salary-parser.js 끝의 `const SALARY_PARSER = { ... }; window.SALARY_PARSER = SALARY_PARSER;` 를 `export const SALARY_PARSER = { ... };` 로 변경.

window 노출은 Task 5 KEEP allowlist 결정 후 처리.

- [ ] **Step 4.4: 테스트 + 회귀**

```bash
npm run test:unit
npm run test:integration
npm run lint 2>&1 | grep "no-undef" | wc -l
```

Expected: 회귀 0 + lint no-undef 큰 폭 감소.

- [ ] **Step 4.5: 커밋**

```bash
git add leave-tab.js payslip-tab.js payroll-views.js settings-ui.js resume.js job-templates.js salary-parser.js
git commit -m "feat(phase5-4): Layer 4 UI part 2 — leave-tab/payslip-tab/payroll-views/settings-ui/resume/job-templates 명시 import"
```

---

## Task 5: Layer 5 entry + KEEP allowlist 산출 + window 호환층 정리

**Files:**
- Modify: `app.js`, `regulation.js`, `retirement.js`
- Modify: 모든 `*.js` (window.X 호환층 정리)
- Create: `docs/superpowers/plans/2026-04-27-phase5-keep-allowlist.md`

- [ ] **Step 5.1: KEEP allowlist 자동 산출**

```bash
{
  echo "# Phase 5 KEEP allowlist — $(date '+%Y-%m-%d')"
  echo ""
  echo "## 출처: HTML inline onclick"
  grep -hEo 'onclick="[^"]+"' *.html public/tabs/*.html public/admin/*.html 2>/dev/null \
    | sed -E 's/.*onclick="([a-zA-Z_][a-zA-Z0-9_]*).*/\1/' | sort -u | sed 's/^/- /'
  echo ""
  echo "## 출처: HTML data-action (registerActions 로 등록 — KEEP 불필요)"
  grep -hEo 'data-action="[^"]+"' *.html public/tabs/*.html public/admin/*.html 2>/dev/null \
    | sed -E 's/.*data-action="([a-zA-Z_][a-zA-Z0-9_]*).*/\1/' | sort -u | sed 's/^/- /'
  echo ""
  echo "## 출처: sw.js (있으면)"
  [ -f public/sw.js ] && grep -hEo '\b[A-Za-z_][A-Za-z0-9_]*\(' public/sw.js | sort -u | sed 's/^/- /'
  echo ""
  echo "## 출처: HTML inline <script> (entry bridging)"
  grep -hEozZ '<script>[^<]+</script>' *.html 2>/dev/null | tr '\0' '\n' | grep -oE '\b[A-Za-z_][A-Za-z0-9_]+\(' | sort -u | sed 's/^/- /'
} > docs/superpowers/plans/2026-04-27-phase5-keep-allowlist.md
```

수동 검증: 이 목록만 `window.X = X` 유지. 그 외 제거.

- [ ] **Step 5.2: app.js 의 window.X 호환층 정리**

```bash
grep -nE "^\s*window\.[A-Za-z_][A-Za-z0-9_]*\s*=" app.js
```

KEEP allowlist 외 라인 모두 제거. inline onclick 에서만 호출되는 함수만 남김. 예시:
```js
// KEEP — index.html inline onclick 에서 호출
window.switchTab = switchTab;
window.acceptSeededWorkHistory = acceptSeededWorkHistory;
// ... (allowlist 기준으로만 유지)

// DROP — 모든 cross-module 용도 (이미 import 으로 전환됨)
// window.PROFILE = PROFILE;       // import { PROFILE } 으로 대체
// window._loadWorkHistory = ...;  // 마찬가지
```

- [ ] **Step 5.3: 다른 모듈의 window 호환층 정리**

각 .js 의 끝부분 `if (typeof window !== 'undefined') { window.X = X; ... }` 블록 점검:
```bash
for f in profile.js calculators.js data.js holidays.js overtime.js leave.js payroll.js retirement-engine.js appLock.js \
         profile-tab.js leave-tab.js payslip-tab.js payroll-views.js pay-estimation.js settings-ui.js \
         work-history.js salary-parser.js resume.js job-templates.js; do
  echo "=== $f ==="
  awk '/if \(typeof window !== .undefined.\)/,/^}$/' "$f"
done
```

KEEP allowlist 외 항목 모두 drop. 단, 다음은 KEEP:
- inline onclick 직접 호출 함수
- 다른 외부 진입 (sw.js, 인라인 `<script>` 등)

- [ ] **Step 5.4: 빌드 + 테스트 + lint**

```bash
npm run build
npm run test:unit
npm run test:integration
npm run lint 2>&1 | grep "no-undef" | wc -l   # 0 또는 매우 적음 기대
```

빌드 출력의 dist 확인:
```bash
grep -E "window\." dist/assets/*.js | head -10
```

- [ ] **Step 5.5: 커밋**

```bash
git add app.js regulation.js retirement.js profile.js calculators.js data.js holidays.js overtime.js leave.js payroll.js retirement-engine.js appLock.js \
        profile-tab.js leave-tab.js payslip-tab.js payroll-views.js pay-estimation.js settings-ui.js work-history.js salary-parser.js resume.js job-templates.js \
        docs/superpowers/plans/2026-04-27-phase5-keep-allowlist.md
git commit -m "feat(phase5-5): Layer 5 entry 정리 + window 호환층 KEEP allowlist 적용 (33→N 감소)"
```

---

## Task 6: ESLint no-undef strict + Playwright 회귀 + main 머지

**Files:**
- 잔여 lint 에러 수정 (모듈별)
- 회귀 검증

- [ ] **Step 6.1: ESLint no-undef strict — 잔여 0 까지**

```bash
npm run lint 2>&1 | grep "no-undef" > /tmp/phase5-lint.txt
wc -l /tmp/phase5-lint.txt
head -30 /tmp/phase5-lint.txt
```

남은 hit 별로 1개씩 import 추가 또는 정의 모듈 명시. 0 까지 반복.

`tests/**/*.js` 에서 vitest globals 외 정의되지 않은 식별자 hit 시:
- 도메인 import 추가 (예: `import { CALC } from '../../calculators.js'`)
- 또는 `globalThis.X` 명시

- [ ] **Step 6.2: 회귀 종합 검증**

```bash
npm run lint                    # 0 error
npm run test:unit               # 168 passed
npm run test:integration        # 37+1 passed (cross-module-imports 추가)
npm run check:regulation        # 0 issue
npm run check:paytable          # drift 0/297
npm run build                   # 빌드 성공
```

- [ ] **Step 6.3: Playwright 9 HTML 스모크**

```bash
npm run preview &
sleep 4
```

Playwright MCP 로 9 HTML 순회:
- 9 entry HTML 모두 200 OK + 콘솔 에러 0
- index.html 의 6 핵심 탭 (홈/휴가/시간외/급여/규정/개인정보) 클릭
- info 탭 → 사용자 보고 회귀 검증: PROFILE 저장 → 다른 탭 갔다가 돌아오기 → form 모든 필드 채워짐
- 명세서 업로드 mock → applyStableItemsToProfile 트리거 동작 확인

- [ ] **Step 6.4: main 머지 + push + worktree 정리**

```bash
cd /Users/momo/Documents/GitHub/bhm_overtime
git checkout main
git merge --ff-only feat/phase5-cross-module-esm
git push origin main
git worktree remove ../bhm_overtime-phase5
git branch -d feat/phase5-cross-module-esm
```

- [ ] **Step 6.5: Vercel 자동 배포 모니터링**

```bash
# Vercel 로그 확인 또는 https://bhm-overtime.vercel.app 직접 검증
```

---

## Self-Review

- [ ] cross-module bare identifier 참조 grep hit 0 (window.X / inline onclick 제외)
- [ ] ESLint no-undef 0 error
- [ ] 168 unit + 37+1 integration + Playwright 스모크 PASS
- [ ] 사용자 보고 form 비어 있음 회귀 자동 해결 (통합 테스트 + Playwright 양쪽 검증)
- [ ] window.X 호환층 KEEP allowlist 만 (Phase 3-F 33 → 5~10)
- [ ] localStorage 키 변경 0
- [ ] Vite 번들 entry 변경 0 (vite.config.js 손대지 않음)
- [ ] regulation.html / retirement.html 별도 entry 정상

---

## 산출물

- `docs/superpowers/plans/2026-04-27-phase5-inventory.md` — 인벤토리 스냅샷
- `docs/superpowers/plans/2026-04-27-phase5-keep-allowlist.md` — KEEP allowlist 자동 산출
- `tests/integration/cross-module-imports.test.js` — 8+ 시나리오 회귀 가드
- `eslint.config.js` — flat config + no-undef strict
- `package.json` — `lint` / `lint:fix` script + eslint, globals devDep
- 30+ ESM 모듈: 명시 import + typeof 가드 제거 + window 호환층 KEEP allowlist 적용
- profile.js: PROFILE_FIELDS named export (app.js 에서 이동)

---

## Commit history (예상)

```
feat(phase5-1): 인벤토리 + cross-module-imports 회귀 가드 테스트 + ESLint flat config
feat(phase5-2): PROFILE_FIELDS profile.js 이동 + Layer 0/1/2 import 보강
feat(phase5-3): Layer 4 UI part 1 — profile-tab/pay-estimation/salary-parser/work-history 명시 import
feat(phase5-4): Layer 4 UI part 2 — leave-tab/payslip-tab/payroll-views/settings-ui/resume/job-templates 명시 import
feat(phase5-5): Layer 5 entry 정리 + window 호환층 KEEP allowlist 적용
feat(phase5-6): ESLint no-undef strict + Playwright 9 HTML 스모크 검증
```
