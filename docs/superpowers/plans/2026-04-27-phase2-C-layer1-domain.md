# Phase 2-C: Layer 1 — Domain 모듈 ESM 전환

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 순수 계산 모듈 3개 (calculators.js / holidays.js / retirement-engine.js) 를 ESM 으로 전환. `import { CALC } from './calculators.js'` + Layer 0 의 DATA 를 직접 import → **테스트의 `globalThis.DATA = DATA` hack 영구 제거**.

**Architecture:** Layer 1 = Layer 0 만 의존. calculators.js 는 36회 DATA 참조 → import 로 전환. retirement-engine.js 는 `window.DATA.severancePay` 폴백 → import 로 직접 받음. 호환층: `window.CALC = CALC`, `window.HOLIDAYS = HOLIDAYS`, `window.RetirementEngine = RetirementEngine` (Layer 2~5 IIFE 가 아직 사용).

**Tech Stack:** ES Module, Vitest 4.x, Vite 5.x.

**SPEC:** `docs/superpowers/specs/2026-04-27-phase2-modularization-spec.md` §2 Layer 1, §4 변환 패턴

---

## File Structure

```
calculators.js              ← export const CALC + import { DATA } + window.CALC 호환층
holidays.js                 ← export const HOLIDAYS + window.HOLIDAYS 호환층
retirement-engine.js        ← export const RetirementEngine + import { DATA } + window 호환층
tests/unit/calculators.test.js          ← const { CALC } = require → import { CALC }
tests/unit/calc-registry.test.js        ← require → import + globalThis.DATA hack 제거
tests/unit/plan-l-tier1.test.js         ← 동일
tests/unit/plan-m-phase-1.test.js       ← 동일
tests/unit/plan-m-phase-2.test.js       ← 동일
tests/unit/plan-m-phase-3.test.js       ← 동일
tests/unit/plan-m-phase-3-extra.test.js ← 동일
tests/unit/foundation.test.js           ← Layer 1 import 케이스 추가
```

---

## Task 0: worktree + baseline

- [ ] **Step 0.1: worktree**

```bash
git worktree add -b feat/phase2-C-layer1 ../bhm_overtime-phase2-C
cd ../bhm_overtime-phase2-C
```

- [ ] **Step 0.2: baseline**

```bash
npm run test:unit  # 156 passed (Phase 2-B 후 기준)
```

---

## Task 1: holidays.js → ESM (가장 단순, 의존성 0)

**Files:**
- Modify: `holidays.js`
- Modify: `tests/unit/foundation.test.js`

- [ ] **Step 1.1: 실패 테스트 추가**

`tests/unit/foundation.test.js` 에 케이스 추가:

```js
describe('Layer 1 — Domain ESM exports', () => {
  it('holidays.js: import { HOLIDAYS } 동작', async () => {
    const { HOLIDAYS } = await import('../../holidays.js');
    expect(HOLIDAYS).toBeDefined();
    expect(typeof HOLIDAYS._getApiBase).toBe('function');
  });
});
```

- [ ] **Step 1.2: 테스트 실패 확인**

```bash
npx vitest run tests/unit/foundation.test.js -t "holidays"
```

Expected: FAIL — `HOLIDAYS is not defined`.

- [ ] **Step 1.3: holidays.js 변환**

```js
// holidays.js 변경
// Before:
//   const HOLIDAYS = {
//     ...
//   };
// After:
export const HOLIDAYS = {
    _getApiBase() { ... },
    // ... (기존 본문 그대로)
};

// 호환층 (IIFE 모듈용)
if (typeof window !== 'undefined') {
  window.HOLIDAYS = HOLIDAYS;
}
```

- [ ] **Step 1.4: 테스트 PASS + 회귀 0**

```bash
npx vitest run tests/unit/foundation.test.js -t "holidays"  # PASS
npm run test:unit                                           # 157 passed
```

- [ ] **Step 1.5: 커밋**

```bash
git add holidays.js tests/unit/foundation.test.js
git commit -m "feat(phase2-C): holidays.js → ESM exports

- export const HOLIDAYS + window.HOLIDAYS 호환층
- foundation.test.js holidays 케이스 PASS"
```

---

## Task 2: calculators.js → ESM (가장 큰 영향 — 6 테스트 모두 사용)

**Files:**
- Modify: `calculators.js`
- Modify: `tests/unit/calculators.test.js`
- Modify: `tests/unit/calc-registry.test.js`
- Modify: `tests/unit/plan-l-tier1.test.js`
- Modify: `tests/unit/plan-m-phase-1.test.js`
- Modify: `tests/unit/plan-m-phase-2.test.js`
- Modify: `tests/unit/plan-m-phase-3.test.js`
- Modify: `tests/unit/plan-m-phase-3-extra.test.js`
- Modify: `tests/unit/foundation.test.js`

- [ ] **Step 2.1: 실패 테스트 추가**

`tests/unit/foundation.test.js` 에 추가:

```js
it('calculators.js: import { CALC } + 직접 DATA import 동작', async () => {
  const { CALC } = await import('../../calculators.js');
  expect(CALC).toBeDefined();
  expect(typeof CALC.calcOvertimePay).toBe('function');
  // globalThis.DATA hack 없이 — calculators.js 가 자체 import { DATA } 해야 함
  delete globalThis.DATA;
  const r = CALC.calcOvertimePay(10000, 1, 0, 0, false);
  expect(r.연장근무수당).toBe(15000);
});
```

- [ ] **Step 2.2: 테스트 실패 확인**

```bash
npx vitest run tests/unit/foundation.test.js -t "calculators"
```

Expected: FAIL — `CALC is not defined` (또는 `Cannot read property 'allowances' of undefined` — DATA 못 찾음).

- [ ] **Step 2.3: calculators.js 변환**

calculators.js 시작 부분에 import 추가:

```js
// calculators.js 첫 줄 (기존 주석 위에)
import { DATA } from './data.js';

const CALC = {
  // ... 기존 본문 그대로 (DATA.allowances.* 등 36회 참조 — 변경 0)
};

export { CALC };

// 호환층 (IIFE 모듈용 — Layer 2~4 가 아직 window.CALC 사용)
if (typeof window !== 'undefined') {
  window.CALC = CALC;
}
```

`module.exports` 블록 제거.

- [ ] **Step 2.4: 6개 단위 테스트 import 전환**

각 테스트 파일 (calculators.test.js / calc-registry.test.js / plan-l-tier1.test.js / plan-m-phase-1~3.test.js / plan-m-phase-3-extra.test.js) 상단 변환:

**Before** (Phase 2-B 후 상태):
```js
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { DATA } from '../../data.js';
globalThis.DATA = DATA;
const { CALC } = require('../../calculators.js');
```

**After**:
```js
import { describe, it, expect, beforeAll } from 'vitest';
import { DATA } from '../../data.js';   // 일부 테스트에서 DATA 직접 사용
import { CALC } from '../../calculators.js';
// globalThis.DATA hack 제거 — calculators.js 가 자체 import
```

> calculators.test.js 안에서 DATA 를 직접 참조하는 테스트가 있다면 (예: `expect(...).toBe(Math.round(10000 * DATA.allowances.overtimeRates.extendedNight * 2))`) `import { DATA }` 보존.

- [ ] **Step 2.5: 단위 테스트 통과**

```bash
npm run test:unit
```

Expected: 158 passed (157 + foundation calculators 1).

- [ ] **Step 2.6: Vite dev 검증 (브라우저)**

```bash
npm run dev &
DEV_PID=$!
sleep 3
```

Playwright MCP:
- http://localhost:5173 접속
- `browser_console_messages` — 에러 0
- 시간외 탭 클릭 → 시급 경고 배너 동작 (CALC.calcOvertimePay 의존)
- 급여 탭 → 급여 계산 표시 (CALC.calcAllowances 의존)
- 휴가 탭 → 연차 계산 표시

```bash
kill $DEV_PID
```

- [ ] **Step 2.7: 커밋**

```bash
git add calculators.js tests/unit/*.test.js
git commit -m "feat(phase2-C): calculators.js → ESM + 6 단위 테스트 globalThis.DATA hack 제거

- import { DATA } from './data.js' (직접 참조)
- export { CALC } + window.CALC 호환층
- 6 테스트: createRequire/globalThis.DATA → import { DATA, CALC }"
```

---

## Task 3: retirement-engine.js → ESM

**Files:**
- Modify: `retirement-engine.js`
- Modify: `tests/unit/foundation.test.js`

- [ ] **Step 3.1: 실패 테스트 추가**

```js
it('retirement-engine.js: import { RetirementEngine } 동작', async () => {
  const { RetirementEngine } = await import('../../retirement-engine.js');
  expect(RetirementEngine).toBeDefined();
  expect(typeof RetirementEngine.calcSev).toBe('function');
  expect(typeof RetirementEngine.calcAllScenarios).toBe('function');
});
```

- [ ] **Step 3.2: 테스트 실패 확인**

```bash
npx vitest run tests/unit/foundation.test.js -t "retirement-engine"
```

Expected: FAIL.

- [ ] **Step 3.3: retirement-engine.js 변환**

`retirement-engine.js` 첫 줄:

```js
import { DATA } from './data.js';

const RetirementEngine = (function () {
  // 기존 IIFE 안: window.DATA && window.DATA.severancePay → DATA.severancePay
  const SEV_PAY = DATA && DATA.severancePay ? DATA.severancePay : [
    /* 정적 폴백 */
  ];
  // ... (다른 window.DATA → DATA 변환)
  // ARCH-01 주석 정리: "ESM import 으로 직접 참조"
  // ...
  return { autoLoad, calcAllScenarios, calcSingle, ... };
})();

export { RetirementEngine };

// 호환층 (retirement.html 에서 IIFE 로 사용)
if (typeof window !== 'undefined') {
  window.RetirementEngine = RetirementEngine;
}
```

> **주의**: `window.getUserStorageKey` 참조 (line 47-48) — 이건 Layer 4 (auth/profile) 의존. 이 단계에선 window 참조 그대로 유지 (다음 Layer 에서 import 로 전환).

- [ ] **Step 3.4: 테스트 PASS + retirement.html 스모크**

```bash
npm run test:unit            # 159 passed
```

```bash
npm run dev &
DEV_PID=$!
sleep 3
```

Playwright MCP:
- http://localhost:5173/retirement.html 접속
- 콘솔 에러 0
- 입력 폼 렌더 + autoLoad 동작
- 시뮬레이션 버튼 클릭 → 결과 표시

```bash
kill $DEV_PID
```

- [ ] **Step 3.5: 커밋**

```bash
git add retirement-engine.js tests/unit/foundation.test.js
git commit -m "feat(phase2-C): retirement-engine.js → ESM exports

- import { DATA } from './data.js' (window.DATA 폴백 패턴 제거)
- export { RetirementEngine } + window.RetirementEngine 호환층
- ARCH-01 주석 갱신
- foundation.test.js retirement-engine 케이스 PASS
- retirement.html 스모크 통과"
```

---

## Task 4: 통합 검증 + Playwright 스모크

**Files:** 검증만

- [ ] **Step 4.1: 단위 테스트 회귀 0**

```bash
npm run test:unit  # 159 passed
```

- [ ] **Step 4.2: audit 0**

```bash
npm run check:regulation
npm run check:paytable
```

Expected: 0 issue.

- [ ] **Step 4.3: Vite production 빌드 + Playwright 스모크**

```bash
npm run build
npm run preview &
PREVIEW_PID=$!
sleep 3
```

Playwright MCP — CLAUDE.md 필수 체크리스트:

- [ ] 홈 탭 요약 카드
- [ ] 급여 탭 3개 서브탭 (계산/명세서/퇴직금) 동작 — **Layer 1 의존도 큼**
- [ ] 시간외 탭 시급 경고 배너 동작
- [ ] 휴가 탭 연차 계산
- [ ] 찾아보기 탭
- [ ] 개인정보 탭
- [ ] 설정 탭
- [ ] 피드백 탭
- [ ] regulation.html 본문 렌더
- [ ] retirement.html 시뮬레이션
- [ ] 콘솔 에러 0건

```bash
kill $PREVIEW_PID
```

- [ ] **Step 4.4: 커밋 (검증 메모)**

```bash
git commit --allow-empty -m "test(phase2-C): Layer 1 ESM 전환 검증

- 159 unit tests passed (foundation 6: data/RC/utils/holidays/CALC/RetirementEngine)
- check:regulation / check:paytable 0 issue
- Playwright 9 탭 + regulation/retirement 콘솔 에러 0"
```

---

## Task 5: PR + 머지

- [ ] **Step 5.1: PR**

```bash
git push -u origin feat/phase2-C-layer1
gh pr create --title "Phase 2-C: Layer 1 Domain ESM 전환" --body "$(cat <<'EOF'
## Summary
- calculators.js / holidays.js / retirement-engine.js → ESM
- 6 단위 테스트: globalThis.DATA hack 영구 제거 (import 만 사용)
- window.CALC / HOLIDAYS / RetirementEngine 호환층 보존

## Test plan
- [x] 159 unit tests passed
- [x] check:regulation / check:paytable 0 issue
- [x] Playwright 9 탭 + 콘솔 에러 0
- [ ] Vercel preview 배포 검증

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5.2: Vercel preview 검증**

PR 의 Vercel preview URL 로 9 탭 + 콘솔 에러 0 확인.

- [ ] **Step 5.3: 머지**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull
git worktree remove ../bhm_overtime-phase2-C
```

---

## Self-Review Checklist

- [ ] calculators.js / holidays.js / retirement-engine.js: `import { DATA }` + `export ...` + `window.X` 호환층
- [ ] 6 단위 테스트: `globalThis.DATA` 흔적 0 + createRequire 흔적 0
- [ ] foundation.test.js 6/6 PASS
- [ ] Playwright 9 화면 콘솔 에러 0
- [ ] retirement.html 시뮬레이션 동작

---

## 다음 단계

Phase 2-D: Layer 2 State (profile / overtime / leave / payroll). State store 4개 → ESM. localStorage 키 절대 변경 금지 (사용자 데이터 손실 직결).
