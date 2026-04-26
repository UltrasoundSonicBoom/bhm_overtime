# Phase 2-B: Layer 0 — Foundation 모듈 ESM 전환

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 의존성 0인 3개 Foundation 모듈을 ESM 으로 전환. `import { DATA } from './data.js'` 가 **Vitest 와 브라우저 양쪽에서 동작**.

**Architecture:** Layer 0 모듈 (data.js / regulation-constants.js / shared-utils.js) 을 IIFE/CJS 에서 `export` 로 변환. 기존 `window.X` 노출은 호환층으로 유지 (다른 .js 가 아직 IIFE — 6개 단위 테스트도 require → import). `package.json type: "commonjs"` → `"module"` 전환.

**Tech Stack:** ES Module (import/export), Vitest 4.x (이미 ESM 호환), Vite 5.x (Phase 2-A 완료).

**SPEC:** `docs/superpowers/specs/2026-04-27-phase2-modularization-spec.md` §2 Layer 0, §4 변환 패턴, §5 TDD

---

## File Structure

```
data.js                     ← export const DATA, DATA_STATIC, loadDataFromAPI + window 호환층
regulation-constants.js     ← 모든 const → export const + window.RC 호환층
shared-utils.js             ← export function escapeHtml + window.escapeHtml 호환층
package.json                ← "type": "module" 로 변경
tests/unit/calculators.test.js          ← require → import
tests/unit/calc-registry.test.js        ← require → import
tests/unit/plan-l-tier1.test.js         ← require → import
tests/unit/plan-m-phase-1.test.js       ← require → import
tests/unit/plan-m-phase-2.test.js       ← require → import
tests/unit/plan-m-phase-3.test.js       ← require → import
tests/unit/plan-m-phase-3-extra.test.js ← require → import
tests/unit/foundation.test.js           ← 신규 — Layer 0 import 검증
scripts/check-regulation-link.js        ← require 사용 시 import 또는 createRequire
scripts/check-paytable.js               ← require 사용 시 import 또는 createRequire
scripts/build.mjs                       ← (이미 mjs — 그대로)
```

---

## Task 0: worktree 생성 + baseline

**Files:** none

- [ ] **Step 0.1: worktree 생성**

```bash
git worktree add -b feat/phase2-B-layer0 ../bhm_overtime-phase2-B
cd ../bhm_overtime-phase2-B
```

- [ ] **Step 0.2: 기존 테스트 baseline**

```bash
npm run test:unit  # 153 passed 기록
npm run check:regulation
npm run check:paytable
```

---

## Task 1: package.json type: module 전환

**Files:**
- Modify: `package.json`

**왜 먼저?** "type": "module" 로 바꿔야 .js 가 ESM 으로 해석됨. 이 단계에선 일부 스크립트가 깨질 수 있으나, 본 plan 내에서 모두 수정.

- [ ] **Step 1.1: 실패 테스트 — Layer 0 ESM import 검증**

Create `tests/unit/foundation.test.js`:

```js
// Phase 2-B 진입 기준: Layer 0 모듈이 ESM import 로 동작
import { describe, it, expect } from 'vitest';

describe('Layer 0 — Foundation ESM exports', () => {
  it('data.js: import { DATA, DATA_STATIC } 동작', async () => {
    const { DATA, DATA_STATIC } = await import('../../data.js');
    expect(DATA).toBeDefined();
    expect(DATA_STATIC).toBeDefined();
    expect(DATA.allowances).toBeDefined();
    expect(DATA.allowances.overtimeRates).toBeDefined();
  });

  it('regulation-constants.js: import { ORDINARY_WAGE_HOURS, ... } 동작', async () => {
    const RC = await import('../../regulation-constants.js');
    expect(RC.ORDINARY_WAGE_HOURS).toBe(209);
    expect(RC.OVERTIME_UNIT_MINUTES).toBe(15);
    expect(RC.OVERTIME_MULTIPLIER).toBe(1.5);
  });

  it('shared-utils.js: import { escapeHtml } 동작', async () => {
    const { escapeHtml } = await import('../../shared-utils.js');
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    expect(escapeHtml(null)).toBe('');
  });
});
```

- [ ] **Step 1.2: 테스트 실패 확인**

```bash
npx vitest run tests/unit/foundation.test.js
```

Expected: FAIL — `DATA is not defined` 또는 `escapeHtml is not a function` (현재는 IIFE/CJS).

- [ ] **Step 1.3: package.json 수정**

```json
{
  "type": "module",
  ...
}
```

> 이후 .cjs / .mjs 충돌 가능. node 스크립트 (`scripts/check-*.js`) 가 require 사용한다면 이 task 안에서 `.cjs` 로 rename 또는 `createRequire` 도입.

- [ ] **Step 1.4: scripts/check-*.js 호환성 확인**

```bash
node scripts/check-regulation-link.js
node scripts/check-paytable.js
```

만약 `require is not defined` 에러:
- 옵션 A: 파일을 `.cjs` 로 rename (단순)
- 옵션 B: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);` 도입
- 옵션 C: ESM import 으로 변환

**선택**: 옵션 A (가장 안전 + 짧음). `scripts/check-regulation-link.cjs`, `scripts/check-paytable.cjs` 로 rename, `package.json` scripts 도 `.cjs` 로 갱신.

```bash
git mv scripts/check-regulation-link.js scripts/check-regulation-link.cjs
git mv scripts/check-paytable.js scripts/check-paytable.cjs
```

`package.json`:
```json
"check:regulation": "node scripts/check-regulation-link.cjs",
"check:paytable": "node scripts/check-paytable.cjs"
```

- [ ] **Step 1.5: 검증 — 단위 테스트 + audit 회귀 0**

```bash
npm run test:unit          # 기존 153 + 새 foundation.test.js (3 fail 예상 — Layer 0 미변환)
npm run check:regulation   # 0 issue
npm run check:paytable     # 0 issue
```

> foundation.test.js 3개는 아직 fail 인 상태로 OK (다음 task 에서 통과시킴).

- [ ] **Step 1.6: 커밋**

```bash
git add package.json scripts/check-regulation-link.cjs scripts/check-paytable.cjs tests/unit/foundation.test.js
git rm scripts/check-regulation-link.js scripts/check-paytable.js 2>/dev/null || true
git commit -m "feat(phase2-B): package.json type: module + check 스크립트 .cjs 격리

- type: module 전환 (Layer 0 ESM 진입)
- scripts/check-*.cjs: require 보존 (Node CommonJS 격리)
- tests/unit/foundation.test.js: Layer 0 import 진입 기준 (현재 fail)"
```

---

## Task 2: regulation-constants.js → ESM (가장 단순)

**Files:**
- Modify: `regulation-constants.js`

> **왜 먼저?** 248줄, export 만 하면 끝. 의존성 0. 회귀 위험 최소.

- [ ] **Step 2.1: 현재 구조 확인**

```bash
sed -n '1,20p' regulation-constants.js
sed -n '230,248p' regulation-constants.js
```

현재: `const X = ...` + 마지막에 `module.exports = {...}` + `window.RC = module.exports`.

- [ ] **Step 2.2: ESM 전환**

`regulation-constants.js` 끝 부분 (`if (typeof module !== 'undefined' ...)` 블록) 을 ESM export 로 변환:

```js
// 모든 const X = ... 앞에 export 키워드 추가
export const ORDINARY_WAGE_HOURS = 209;
export const OVERTIME_UNIT_MINUTES = 15;
export const OVERTIME_MULTIPLIER = 1.5;
export const NIGHT_ALLOWANCE_MULTIPLIER = 2.0;
// ... (나머지 모든 const 동일)
export const _refs = { ... };

// 호환층: window.RC (다른 .js 아직 IIFE)
if (typeof window !== 'undefined') {
  window.RC = {
    ORDINARY_WAGE_HOURS, OVERTIME_UNIT_MINUTES, OVERTIME_MULTIPLIER,
    NIGHT_ALLOWANCE_MULTIPLIER, EXTENDED_NIGHT_MULTIPLIER,
    HOLIDAY_MULTIPLIER, HOLIDAY_OVER8_MULTIPLIER,
    DUTY_ALLOWANCE_DAILY, MEAL_SUBSIDY, TRANSPORT_SUBSIDY,
    EDUCATION_ALLOWANCE_MONTHLY, SPECIAL_PAY5_MONTHLY, REFRESH_BENEFIT_MONTHLY,
    MILITARY_SERVICE_PAY_MONTHLY, MILITARY_SERVICE_MAX_MONTHS,
    ON_CALL_STANDBY_DAILY, ON_CALL_TRANSPORT, ON_CALL_COMMUTE_HOURS,
    NIGHT_SHIFT_BONUS_PER_SHIFT, PRIME_TEAM_SUBSTITUTE_DAILY,
    PRECEPTOR_ALLOWANCE, LONG_SERVICE_PAY,
    SENIORITY_RATES, SENIORITY_CUT_DATE, FAMILY_SUPPORT_SKIP_MONTHS,
    SEVERANCE_PAY_RATES, SEVERANCE_CUT_DATE_2015,
    SEVERANCE_MULTIPLIERS_PRE2001, SEVERANCE_CUT_DATE_2001,
    ANNUAL_LEAVE, FAMILY_ALLOWANCE, _refs
  };
}
```

`'use strict';` 줄은 제거 (ESM 은 자동 strict).

- [ ] **Step 2.3: 테스트**

```bash
npx vitest run tests/unit/foundation.test.js -t "regulation-constants"
```

Expected: PASS — `ORDINARY_WAGE_HOURS === 209` 검증.

- [ ] **Step 2.4: 회귀 테스트**

```bash
npm run test:unit          # 기존 153 + foundation 1 = 154 passed (data, escapeHtml 아직 fail)
npm run check:regulation   # 0 issue
```

- [ ] **Step 2.5: 커밋**

```bash
git add regulation-constants.js
git commit -m "feat(phase2-B): regulation-constants.js → ESM exports

- 모든 const → export const
- window.RC 호환층 보존 (다른 IIFE 모듈용)
- foundation.test.js regulation-constants 케이스 PASS"
```

---

## Task 3: shared-utils.js → ESM

**Files:**
- Modify: `shared-utils.js`

- [ ] **Step 3.1: ESM 전환**

`shared-utils.js` (17줄) 전체 교체:

```js
// shared-utils.js — 여러 파일에서 공유되는 유틸리티
// 가장 먼저 로드되어야 하는 공용 헬퍼만. 도메인 로직 금지.

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 호환층 (IIFE 모듈이 window.escapeHtml 참조)
if (typeof window !== 'undefined') {
  window.escapeHtml = escapeHtml;
}
```

- [ ] **Step 3.2: 테스트**

```bash
npx vitest run tests/unit/foundation.test.js -t "shared-utils"
```

Expected: PASS.

- [ ] **Step 3.3: 회귀 + 커밋**

```bash
npm run test:unit  # 155 passed (data 만 fail)
git add shared-utils.js
git commit -m "feat(phase2-B): shared-utils.js → ESM exports

- export function escapeHtml + window 호환층
- foundation.test.js shared-utils 케이스 PASS"
```

---

## Task 4: data.js → ESM (가장 위험 — 800줄, 6개 테스트가 require)

**Files:**
- Modify: `data.js`
- Modify: `tests/unit/calculators.test.js`
- Modify: `tests/unit/calc-registry.test.js`
- Modify: `tests/unit/plan-l-tier1.test.js`
- Modify: `tests/unit/plan-m-phase-1.test.js`
- Modify: `tests/unit/plan-m-phase-2.test.js`
- Modify: `tests/unit/plan-m-phase-3.test.js`
- Modify: `tests/unit/plan-m-phase-3-extra.test.js`

> **왜 마지막?** 6개 단위 테스트가 `require('../../data.js')` + `globalThis.DATA = DATA` 패턴 사용. 한꺼번에 변환.

- [ ] **Step 4.1: data.js ESM 전환**

`data.js` 끝 부분 (마지막 ~10줄) 교체:

```js
// 변경 전:
//   if (typeof window !== 'undefined') { setTimeout(loadDataFromAPI, 10000); }
//   if (typeof module !== 'undefined' && module.exports) {
//     module.exports = { DATA, DATA_STATIC };
//   }

// 변경 후:
export { DATA_STATIC };
export let DATA = DATA_STATIC;  // mutable — loadDataFromAPI 가 갱신
export async function loadDataFromAPI() { /* 기존 본문 그대로 */ }

// 호환층: 기존 IIFE 모듈이 window.DATA / window.DATA_STATIC 참조
if (typeof window !== 'undefined') {
  window.DATA_STATIC = DATA_STATIC;
  window.DATA = DATA;
  // bootstrap (기존 setTimeout 자리)
  setTimeout(() => {
    loadDataFromAPI().then(() => {
      window.DATA = DATA;  // API 갱신 후 window 에도 반영
    });
  }, 10000);
}
```

> **주의**: `let DATA = DATA_STATIC` 로 선언 (loadDataFromAPI 가 재할당 가능해야 함). `export let` 은 ESM 표준.

> **주의**: `loadDataFromAPI` 내부에 `DATA = ...` 재할당이 있는데, ESM 안에서 `DATA` 는 `let` 으로 선언되었으므로 가능. 단, **import 한 쪽 (calculators.js 등) 은 `DATA` 를 read-only 로 받음 → 값 변경 즉시 동기화 (live binding)**.

- [ ] **Step 4.2: 6개 테스트 require → import 전환**

각 테스트 파일 상단 변환:

**Before** (`tests/unit/calculators.test.js` 등):
```js
import { describe, it, expect, beforeAll } from 'vitest';
const { DATA } = require('../../data.js');
globalThis.DATA = DATA;
const { CALC } = require('../../calculators.js');
```

**After**:
```js
import { describe, it, expect, beforeAll } from 'vitest';
import { DATA } from '../../data.js';
// CALC 는 아직 IIFE → globalThis.DATA 가 필요 (Layer 1 까지)
globalThis.DATA = DATA;
const { CALC } = require('../../calculators.js');
```

> **주의**: ESM 안에서는 `require` 가 기본적으로 정의되지 않음. 6개 테스트 파일 상단에 `createRequire` 추가:

```js
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
```

이 `require` 는 Phase 2-C (calculators.js → ESM) 에서 import 로 교체됨.

- [ ] **Step 4.3: 테스트 통과 확인**

```bash
npx vitest run tests/unit/foundation.test.js
# Expected: PASS — 3/3 (data, regulation-constants, shared-utils)
npm run test:unit
# Expected: 156 passed (153 기존 + foundation 3)
```

- [ ] **Step 4.4: 브라우저 호환성 검증 — Vite dev**

```bash
npm run dev &
DEV_PID=$!
sleep 3
```

Playwright MCP:
- `browser_navigate` http://localhost:5173
- `browser_console_messages` — 에러 0건 확인
- 6개 핵심 탭 클릭 → 콘솔 에러 0
- 휴가 탭 진입 → 연차 표시 정상 (DATA 의존)
- 시간외 탭 → 시급 경고 배너 동작 (DATA.allowances)

```bash
kill $DEV_PID
```

> **이 단계에서 회귀 발생 가능성 높음**: data.js 의 `let DATA` 가 다른 IIFE 모듈에서 `window.DATA` 를 참조할 때 timing 문제 발생 가능. 반드시 Playwright 스모크 통과 필요.

- [ ] **Step 4.5: 빌드 검증 — Vite production**

```bash
npm run build
ls dist/assets/ | grep -E 'data-[a-f0-9]+\.js'
# data.js 가 dist/assets/data-[hash].js 로 hash 부여됐는지

npm run preview &
PREVIEW_PID=$!
sleep 3
```

Playwright MCP 로 http://localhost:4173 6개 탭 + 콘솔 에러 0 확인.

```bash
kill $PREVIEW_PID
```

- [ ] **Step 4.6: 커밋**

```bash
git add data.js tests/unit/*.test.js
git commit -m "feat(phase2-B): data.js → ESM exports + 6 단위 테스트 import 전환

- export const DATA_STATIC, export let DATA (live binding)
- export async function loadDataFromAPI
- window.DATA / window.DATA_STATIC 호환층 보존
- bootstrap: setTimeout(loadDataFromAPI, 10000) 호환층 안 유지
- tests/unit/*: const { DATA } = require → import { DATA }
- (calculators.js 는 아직 IIFE → createRequire + globalThis.DATA 잔존)"
```

---

## Task 5: 통합 검증 + Playwright 스모크

**Files:** 검증만

- [ ] **Step 5.1: 단위 테스트 회귀 0**

```bash
npm run test:unit
```

Expected: 156 passed.

- [ ] **Step 5.2: audit 0**

```bash
npm run check:regulation
npm run check:paytable
```

Expected: 0 issue.

- [ ] **Step 5.3: Vite 프로덕션 빌드 + Playwright 스모크 (6개 핵심 탭)**

```bash
npm run build
npm run preview &
PREVIEW_PID=$!
sleep 3
```

Playwright MCP 로 http://localhost:4173 접속, **CLAUDE.md 의 필수 체크리스트** 전부:

- [ ] 홈 탭 요약 카드 표시
- [ ] 급여 탭 3개 서브탭 (계산/명세서/퇴직금) 동작
- [ ] 시간외 탭 시급 경고 배너 동작
- [ ] 휴가 탭 연차 계산 표시
- [ ] 찾아보기 탭 진입
- [ ] 개인정보 탭 프로필 저장/불러오기
- [ ] 설정 탭 AppLock 토스트
- [ ] 피드백 탭
- [ ] 콘솔 에러 0건

```bash
kill $PREVIEW_PID
```

- [ ] **Step 5.4: regulation.html / retirement.html 스모크**

Playwright MCP:
- http://localhost:4173/regulation.html → 콘솔 에러 0, 본문 렌더 (placeholder 사라짐)
- http://localhost:4173/retirement.html → 콘솔 에러 0, 입력 폼 렌더

> regulation.js 가 `window.RC` 참조하는지 확인 필요. Phase 2-B 시점엔 아직 IIFE 라 window.RC 호환층으로 동작.

- [ ] **Step 5.5: 커밋 (검증 메모)**

```bash
git commit --allow-empty -m "test(phase2-B): Layer 0 ESM 전환 검증

- 156 unit tests passed (foundation 3 추가)
- check:regulation / check:paytable 0 issue
- Playwright 6 탭 + regulation/retirement 콘솔 에러 0"
```

---

## Task 6: PR + 머지

**Files:** none

- [ ] **Step 6.1: PR**

```bash
git push -u origin feat/phase2-B-layer0
gh pr create --title "Phase 2-B: Layer 0 Foundation ESM 전환" --body "$(cat <<'EOF'
## Summary
- data.js / regulation-constants.js / shared-utils.js → ESM exports
- package.json type: module, scripts/check-*.cjs 격리
- 6 단위 테스트 require → import (createRequire + globalThis.DATA 잔존, Layer 1 에서 제거)

## Test plan
- [x] 156 unit tests passed
- [x] check:regulation / check:paytable 0 issue
- [x] Playwright 6 핵심 탭 + 콘솔 에러 0
- [ ] Vercel preview 배포 검증

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 6.2: Vercel preview 검증**

PR 의 Vercel preview URL 로 6개 탭 + 콘솔 에러 0 확인.

- [ ] **Step 6.3: 머지**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull
git worktree remove ../bhm_overtime-phase2-B
```

---

## Self-Review Checklist

- [ ] data.js / regulation-constants.js / shared-utils.js: `export ...` + `window.X` 호환층 양립
- [ ] package.json `"type": "module"`
- [ ] check 스크립트 .cjs 분리
- [ ] 6 단위 테스트 import 전환 (createRequire 잔존 OK)
- [ ] foundation.test.js 3 PASS
- [ ] 156 unit tests passed
- [ ] Playwright 스모크 통과
- [ ] regulation.html / retirement.html 콘솔 에러 0

---

## 다음 단계

Phase 2-C: Layer 1 Domain (calculators / holidays / retirement-engine ESM 전환). Layer 0 가 ESM 이므로 Layer 1 은 직접 `import { DATA } from './data.js'` 사용 가능 → globalThis.DATA hack 영구 제거.
