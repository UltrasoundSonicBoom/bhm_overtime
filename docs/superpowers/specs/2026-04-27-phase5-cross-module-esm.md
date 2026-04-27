# Phase 5 SPEC — Cross-module 명시 ESM import/export 전환 + ESLint no-undef

> 작성: 2026-04-27
> 범위: 30+ ESM 모듈의 cross-module bare identifier 참조 전수 변환
> 목적: profile-tab.js 류 회귀 패턴 영구 종결 + Phase 6 (Astro/Turbo) / Firebase 도입 발판
> 비전: **앱 동작·계산 결과 그대로 + cross-module bare identifier 0 + window 노출 최소화 + ESLint no-undef strict**

---

## 1. 배경

### Phase 4-A 완료 직후 사용자 보고
> "info 탭의 form 에 명세서 데이터 중 이름만 있고 다른 부분이 비어 있다."

### 분석 결과 (회귀 패턴)
- `profile-tab.js:213, 352, 508, 563` 등 4곳에서 `PROFILE_FIELDS` **bare 참조**
- `app.js` 만 `const PROFILE_FIELDS = {…}` 정의 + `window.PROFILE_FIELDS = PROFILE_FIELDS` 호환층 노출
- ESM 환경에서 다른 모듈은 `window.` prefix 없이 `PROFILE_FIELDS` 를 참조 → ReferenceError
- 부분적으로 `typeof PROFILE_FIELDS !== 'undefined'` 가드는 있으나 일관성 없음 → `applyToForm` 호출이 silently skip 됨
- **결과**: 사용자는 form 이 비어 있는 것만 보고 원인 모름

### 동일 패턴 누적 위험
- `PROFILE_FIELDS` 외에도 `_loadWorkHistory`, `_saveWorkHistory`, `renderWorkHistory`, `SALARY_PARSER`, `PROFILE` 등이 **defining 모듈 외부에서 bare 참조** 상태
- 작년 회귀 (Phase 3-F window.X 80개 제거) → 부분적 fix → 또 회귀 → 부분 fix … 무한 반복
- 한 두 군데 patch 로는 끝나지 않음 (729개 cross-module bare 참조 grep hit)

### 근본 원인
1. **Phase 3-F 의 window.X 제거가 너무 공격적** — inline onclick / cross-module 참조 구분 없이 일괄 제거
2. **Phase 2 (ESM 변환) 가 import 명시화를 강제하지 않음** — `window.X` 호환층에 의존 + bare 참조 허용
3. **ESLint no-undef 검증 없음** — bare 참조 회귀가 빌드 타임에 잡히지 않음

### Phase 4-B-fix 결정 (사용자)
- Phase 4-B-fix 는 **SKIP** — Phase 5 가 자동 해결
- Phase 5 작업 중 `PROFILE_FIELDS` import 추가하는 즉시 form 비어 있는 회귀 자동 해결

---

## 2. 목표

### 기능
1. **명시 export**: 30+ 모듈의 모든 top-level identifier 가 `export const X` / `export function f` 형태
2. **명시 import**: 모든 cross-module 참조가 `import { X } from './Y.js'` 형태
3. **window 호환층 KEEP allowlist**: HTML inline `onclick` / `data-action` 위임에서 참조되는 함수만 `window.X = X` 노출 유지 (대다수 제거)
4. **ESLint no-undef strict**: cross-module bare 참조 빌드 타임 에러
5. **회귀 가드 통합 테스트**: 모듈별 import-only 동작 검증 (typeof window 가드 제거 시 안전)

### 비기능
- 회귀 0: 168 unit + 37 integration tests + check:regulation/paytable + Playwright 9 HTML 모두 PASS
- localStorage 키 변경 0
- 콘솔 에러 0건
- 사용자 보고 form 비어 있음 회귀 자동 해결 (Phase 4-A SPEC 의 1번 트리거 정상 작동)

### 비목표 (scope 외)
- TypeScript 도입 (별도 phase)
- Tailwind / Astro 마이그레이션 (Phase 6/7)
- inline onclick 제거 (Phase 3 에서 일부 위임 — KEEP allowlist 유지)
- Firebase 도입 (Phase 5 완료 후 별도)

---

## 3. 요구사항

### R1. Top-level identifier 인벤토리
모든 `*.js` 의 top-level (module-scope) `const|let|var|function|class` 를 수집 → 각 identifier 의 정의 모듈 1곳 매핑.

### R2. Cross-module 참조 매핑
각 identifier 가 **정의 모듈 외부에서 어디서 어떻게** 참조되는지 매핑:
- bare 참조 (no `window.` prefix, no `typeof` 가드)
- `typeof X !== 'undefined'` 가드 참조 → 가드 제거 + import 으로 대체
- `window.X` 참조 → import 으로 대체 (inline onclick 외)

### R3. 명시 export 추가
정의 모듈에 `export` 키워드 추가:

```js
// Before (app.js)
const PROFILE_FIELDS = { name: 'pfName', … };

// After
export const PROFILE_FIELDS = { name: 'pfName', … };
```

### R4. 명시 import 추가
참조 모듈 상단에 `import` 추가:

```js
// Before (profile-tab.js)
PROFILE.applyToForm(saved, PROFILE_FIELDS);

// After (top of file)
import { PROFILE } from './profile.js';
import { PROFILE_FIELDS } from './app.js';
```

### R5. typeof 가드 제거
import 으로 보장되므로 `typeof X !== 'undefined'` 가드 제거:

```js
// Before
if (typeof PROFILE_FIELDS !== 'undefined') PROFILE.applyToForm(updated, PROFILE_FIELDS);

// After
PROFILE.applyToForm(updated, PROFILE_FIELDS);
```

### R6. window.X 호환층 정리 (KEEP allowlist)

**KEEP 조건**:
- HTML 안 inline `onclick="X(…)"` 또는 `<button data-action="X">` 가 참조 (위임 핸들러 통과)
- service worker `sw.js` 같은 외부 진입점이 참조

**DROP**:
- 모듈 간 호출 전용
- typeof window 가드 안에서만 사용

**검증 방식**: HTML grep + data-action grep 으로 KEEP 목록 자동 산출 → 그 외 `window.X = X` 라인 제거.

### R7. ESLint no-undef
- `eslint.config.js` 추가 (flat config, ESLint v9+)
- `globals.browser` + `globals.node` 만 enable
- ESM `import`/`export` 인식
- `no-undef: error`
- npm script `lint` + `lint:fix`
- CI 가드 (vitest 와 함께 실행)

### R8. 통합 회귀 테스트
- `tests/integration/cross-module-imports.test.js`: 각 ESM 모듈을 import 하여 throw 0 검증
- jsdom 환경에서 모든 모듈 ‘sequential import → no ReferenceError’

---

## 4. 설계 결정

### D1. 변환 단위 = 모듈 1개
- task 단위는 단일 .js 파일 (또는 같은 layer 의 작은 묶음)
- 각 task: import 추가 → typeof 가드 제거 → window 노출 정리 → 단위 테스트 → 커밋

### D2. Layer 순서 (Phase 2 그대로)
- Layer 0/1: 이미 export 형태이므로 import 추가만 (consumer side)
- Layer 2: 일부 import 누락 보강
- Layer 4 (UI): 핵심 작업 — profile-tab.js, leave-tab.js, payslip-tab.js, payroll-views.js, pay-estimation.js, settings-ui.js, salary-parser.js, work-history.js, resume.js, job-templates.js
- Layer 5 (entry): app.js 가 정의하는 PROFILE_FIELDS 등을 export → 하위 모듈이 import

### D3. PROFILE_FIELDS 의 위치
현재 `app.js` 에 정의되어 있어 entry → leaf 역방향 import 구조. 두 가지 선택지:

**Option A (선택)**: PROFILE_FIELDS 를 `profile.js` 로 이동
- 이유: profile field 메타데이터는 PROFILE 도메인 모듈의 책임 (entry 가 아님)
- consumer (profile-tab.js, salary-parser.js, pay-estimation.js, payroll.js) 모두 이미 PROFILE 을 import — 같은 모듈에서 PROFILE_FIELDS 도 import 하면 일관

**Option B**: app.js 에 두고 export — 기각 (entry → leaf 역방향)

→ Option A 채택. app.js 의 정의 → profile.js 로 이동 + `window.PROFILE_FIELDS = PROFILE_FIELDS` 호환층은 app.js 에서 1줄 호환 (HTML inline 참조 0건이지만 안전 마진).

### D4. window 호환층 KEEP allowlist 산출
```bash
# HTML inline onclick 안의 함수명 추출
grep -hEo 'onclick="[^"]+"' *.html public/tabs/*.html public/admin/*.html 2>/dev/null \
  | sed -E 's/.*onclick="([a-zA-Z_][a-zA-Z0-9_]*).*/\1/' | sort -u

# data-action 안의 핸들러 (registerActions 로 등록되므로 KEEP 불필요)
# → 최종 KEEP = inline onclick 함수명 ∪ sw.js 참조
```

산출된 목록만 `window.X = X` 유지.

### D5. ESLint flat config (ESLint v9+)
```js
// eslint.config.js
import globals from 'globals';
export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: { 'no-undef': 'error', 'no-unused-vars': 'off' },
  },
  { ignores: ['dist/**', 'node_modules/**', 'archive/**', 'public/legacy/**'] },
];
```

`devDependencies`: `eslint`, `globals`.

### D6. 회귀 안전망
- 매 task: 단위 테스트 168 passed + 새 통합 테스트 PASS
- Layer 단위 commit + push
- Layer 4 끝 + Layer 5 끝 시 Playwright 9 HTML 스모크
- 사용자 보고 회귀 (form 비어 있음) 자동 해결 검증: profile-tab.js import 후 jsdom unit test 로 form 채워짐 확인

### D7. Worktree
- branch: `feat/phase5-cross-module-esm`
- worktree: `../bhm_overtime-phase5`
- main 직접 변경 0 → 한 번에 머지

---

## 5. 핵심 변환 패턴

### Pattern A — leaf module 에 import 추가
```js
// profile-tab.js (top of file)
import { PROFILE } from './profile.js';
import { PROFILE_FIELDS } from './profile.js';   // D3 결정 후
import { _loadWorkHistory, _saveWorkHistory, renderWorkHistory } from './work-history.js';
import { SALARY_PARSER } from './salary-parser.js';
```

### Pattern B — typeof 가드 제거
```js
// Before
if (typeof PROFILE_FIELDS !== 'undefined') PROFILE.applyToForm(updated, PROFILE_FIELDS);
// After
PROFILE.applyToForm(updated, PROFILE_FIELDS);
```

### Pattern C — window.X 노출 정리
```js
// 모듈 끝부분
// Before (Phase 3-F 호환층 — 33+ entries)
if (typeof window !== 'undefined') {
  window.PROFILE = PROFILE;
  window._loadWorkHistory = _loadWorkHistory;
  window._saveWorkHistory = _saveWorkHistory;
  window.renderWorkHistory = renderWorkHistory;
  …
}
// After (KEEP allowlist 만 — 예: inline onclick 에서만 호출)
if (typeof window !== 'undefined') {
  // KEEP: index.html inline onclick="renderWorkHistory()" 1건 (TODO Phase 6 onclick 위임 후 제거)
  window.renderWorkHistory = renderWorkHistory;
}
```

### Pattern D — 정의 모듈 이동 (D3)
```js
// app.js (Before)
const PROFILE_FIELDS = { … };
window.PROFILE_FIELDS = PROFILE_FIELDS;

// profile.js (After — 이동)
export const PROFILE_FIELDS = { … };

// app.js (After — 호환층만)
import { PROFILE_FIELDS } from './profile.js';
if (typeof window !== 'undefined') window.PROFILE_FIELDS = PROFILE_FIELDS; // 안전 마진
```

---

## 6. Edge Cases / 위험

| 위험 | 강도 | 완화 |
|------|------|------|
| import 추가 누락 (회귀 재발) | 🔴 높음 | ESLint no-undef + 통합 테스트 자동 검출 |
| 호환층 제거로 inline onclick 깨짐 | 🔴 높음 | KEEP allowlist 자동 산출 + Playwright 스모크 |
| 모듈 간 circular dependency | 🟡 중 | Phase 2 layer 그래프 유지 (D3 의 PROFILE_FIELDS 이동도 layer 보존) |
| jsdom 테스트의 import 순서 | 🟡 중 | 통합 테스트는 entry-style import (import './profile.js' 부터) |
| sw.js 외부 노출 누락 | 🟡 중 | sw.js grep 으로 KEEP allowlist 보강 |
| Layer 4 UI 모듈의 enormous file (예: payroll.js 1300줄) | 🟡 중 | task 단위로 1 파일씩 변환 + commit |
| Phase 3-F 회귀 fix 의 KEEP 33개 호환층 | 🟢 낮음 | 모두 제거 + KEEP allowlist 로 재산출 (대부분 drop) |

---

## 7. 성공 지표

빌드 + 배포 후:
- ✅ `npm run lint` 0 error (no-undef)
- ✅ `npm test` 168 unit + 37 integration + smoke PASS
- ✅ `npm run check:regulation` ❌ 0
- ✅ `npm run check:paytable` drift 0/297
- ✅ Playwright 9 HTML + 6 핵심 탭 + 콘솔 에러 0건
- ✅ 사용자 보고 회귀 (info 탭 form 비어 있음) 해결
- ✅ cross-module bare 참조 grep hit ≈ 0 (window.X / inline onclick 제외)
- ✅ window.X 호환층 line 수 80% ↓ (Phase 3-F 33 → 5~10)

---

## 8. 마이그레이션 순서 — 6 Task

| Task | 범위 | 공수 | 산출물 |
|------|------|------|------|
| **5-1** | 인벤토리 + 회귀 가드 통합 테스트 + ESLint setup | 2-3h | 인벤토리 doc + tests/integration/cross-module-imports.test.js + eslint.config.js |
| **5-2** | Layer 0/1/2 import 보강 (consumer side) | 2-3h | calculators/holidays/regulation-constants/data/profile/overtime/leave/payroll/retirement-engine import 정리 |
| **5-3** | Layer 4 UI part 1 — profile-tab / pay-estimation / salary-parser / work-history | 3-4h | 4 파일 import + typeof 가드 제거 + window 정리 |
| **5-4** | Layer 4 UI part 2 — leave-tab / payslip-tab / payroll-views / settings-ui / resume / job-templates | 3-4h | 6 파일 import + 정리 |
| **5-5** | Layer 5 entry — app.js / regulation.js / retirement.js + PROFILE_FIELDS 이동 + KEEP allowlist 산출 + window 호환층 정리 | 2-3h | entry 정리 + KEEP allowlist 적용 |
| **5-6** | ESLint no-undef strict + Playwright 회귀 + 머지 | 2-3h | lint 통과 + 9 HTML 스모크 + main 머지 |

**총 14~20h** (사용자 권장 12-16h 일치 — 약간 보수적).

---

## 9. 다음 단계

본 SPEC 기반 implementation plan: [docs/superpowers/plans/2026-04-27-phase5-cross-module-esm.md]

Plan 은 6 task 분할 (TDD subagent-driven-development).

Phase 6 (Astro + Turbo) / Phase 7 (Tailwind) SPEC stub:
- [docs/superpowers/specs/2026-04-27-phase6-astro-turbo-stub.md]
- [docs/superpowers/specs/2026-04-27-phase7-tailwind-stub.md]
