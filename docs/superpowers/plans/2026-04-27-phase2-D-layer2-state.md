# Phase 2-D: Layer 2 — State Stores ESM 전환

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** localStorage 기반 4개 state store (profile / overtime / leave / payroll) 를 ESM 으로 전환. 의존 그래프: `profile → leave / payroll`, `overtime → payroll`, `leave → payroll`. **localStorage 키 1글자도 변경 금지** (사용자 데이터 손실 직결).

**Architecture:** profile.js (234줄, 가장 단순) → overtime.js (656줄) → leave.js (518줄, profile 의존) → payroll.js (1,249줄, 모든 Layer 2 의존) 순서. window.getUserStorageKey 는 Layer 4 (auth) 의존이므로 그대로 유지 (Phase 2-E 완료 후에도 필요).

**Tech Stack:** ES Module, Vitest 4.x, Vite 5.x.

**SPEC:** `docs/superpowers/specs/2026-04-27-phase2-modularization-spec.md` §2 Layer 2, §6 위험 (localStorage 키)

---

## File Structure

```
profile.js    ← export const PROFILE + import { CALC, DATA } + window.PROFILE 호환층
overtime.js   ← export const OVERTIME + import { CALC, DATA } + window.OVERTIME 호환층
leave.js      ← export const LEAVE + import { CALC, DATA, PROFILE } + window.LEAVE 호환층
payroll.js    ← export const PAYROLL + import { CALC, DATA, PROFILE, OVERTIME, LEAVE } + window 호환층
tests/unit/foundation.test.js  ← Layer 2 import 케이스 추가
tests/unit/state-stores.test.js  ← 신규 (선택) — localStorage round-trip 회귀 방지
```

---

## Task 0: worktree + baseline

- [ ] **Step 0.1: worktree**

```bash
git worktree add -b feat/phase2-D-layer2 ../bhm_overtime-phase2-D
cd ../bhm_overtime-phase2-D
```

- [ ] **Step 0.2: baseline + localStorage 키 인벤토리**

```bash
npm run test:unit
grep -rn "localStorage\.\(get\|set\)Item\|getUserStorageKey" profile.js overtime.js leave.js payroll.js | sort -u > /tmp/storage-keys-before.txt
cat /tmp/storage-keys-before.txt
```

> **이 파일은 Phase 2-D 종료 시점에 비교** (1글자도 변경되면 안됨).

---

## Task 1: profile.js → ESM

**Files:**
- Modify: `profile.js`
- Modify: `tests/unit/foundation.test.js`

- [ ] **Step 1.1: 실패 테스트 추가**

`tests/unit/foundation.test.js`:

```js
describe('Layer 2 — State Stores ESM exports', () => {
  it('profile.js: import { PROFILE } 동작', async () => {
    const { PROFILE } = await import('../../profile.js');
    expect(PROFILE).toBeDefined();
    expect(typeof PROFILE.load).toBe('function');
    expect(typeof PROFILE.parseDate).toBe('function');
    expect(typeof PROFILE.calcWage).toBe('function');
  });
});
```

- [ ] **Step 1.2: 테스트 실패 확인**

```bash
npx vitest run tests/unit/foundation.test.js -t "profile"
```

Expected: FAIL.

- [ ] **Step 1.3: profile.js 변환**

```js
// profile.js 첫 줄
import { CALC } from './calculators.js';
import { DATA } from './data.js';

const PROFILE = {
    _key() {
        return window.getUserStorageKey ? window.getUserStorageKey('bhm_hr_profile') : 'bhm_hr_profile';
    },
    // ... 기존 본문 (CALC.* 참조는 import 으로 받은 것 사용)
};

export { PROFILE };

if (typeof window !== 'undefined') {
  window.PROFILE = PROFILE;
}
```

`module.exports` 블록 제거.

> **localStorage 키 검증**: `'bhm_hr_profile'` 문자열 그대로 보존. `window.getUserStorageKey` 호출도 그대로 보존.

- [ ] **Step 1.4: 테스트 PASS**

```bash
npx vitest run tests/unit/foundation.test.js -t "profile"  # PASS
npm run test:unit                                          # 160 passed
```

- [ ] **Step 1.5: 브라우저 검증 — 개인정보 탭 round-trip**

```bash
npm run dev &
DEV_PID=$!
sleep 3
```

Playwright MCP:
- http://localhost:5173 접속 → 개인정보 탭 클릭
- 직급 / 호봉 / 입사일 입력 + 저장
- 페이지 reload → 값 복원되는지 확인 (localStorage round-trip)
- `browser_evaluate` 로 `localStorage.getItem('bhm_hr_profile')` 확인

```bash
kill $DEV_PID
```

- [ ] **Step 1.6: 커밋**

```bash
git add profile.js tests/unit/foundation.test.js
git commit -m "feat(phase2-D): profile.js → ESM exports

- import { CALC, DATA } + export { PROFILE } + window.PROFILE 호환층
- localStorage 키 'bhm_hr_profile' 보존
- foundation.test.js profile 케이스 PASS
- 개인정보 탭 round-trip 회귀 0"
```

---

## Task 2: overtime.js → ESM

**Files:**
- Modify: `overtime.js`
- Modify: `tests/unit/foundation.test.js`

- [ ] **Step 2.1: 실패 테스트 추가**

```js
it('overtime.js: import { OVERTIME } 동작', async () => {
  const { OVERTIME } = await import('../../overtime.js');
  expect(OVERTIME).toBeDefined();
  expect(typeof OVERTIME.calcMonthlyStats).toBe('function');
  expect(typeof OVERTIME.getMonthRecords).toBe('function');
});
```

- [ ] **Step 2.2: 테스트 실패 확인**

```bash
npx vitest run tests/unit/foundation.test.js -t "overtime"
```

- [ ] **Step 2.3: overtime.js 변환**

```js
// overtime.js 첫 줄
import { CALC } from './calculators.js';
import { DATA } from './data.js';

const OVERTIME = {
    _key() { return window.getUserStorageKey ? window.getUserStorageKey('overtimeRecords') : 'overtimeRecords'; },
    // ... 기존 본문 (CALC, DATA 참조)
    _payslipKey() { return window.getUserStorageKey ? window.getUserStorageKey('overtimePayslipData') : 'overtimePayslipData'; },
    // ...
};

export { OVERTIME };

if (typeof window !== 'undefined') {
  window.OVERTIME = OVERTIME;
}
```

> **localStorage 키 검증**: `'overtimeRecords'`, `'overtimePayslipData'` 보존.

- [ ] **Step 2.4: 테스트 PASS + 브라우저 검증**

```bash
npm run test:unit  # 161 passed
```

```bash
npm run dev &
DEV_PID=$!
sleep 3
```

Playwright MCP:
- 시간외 탭 → 기록 추가 + 저장
- reload → 기록 복원
- 시급 경고 배너 동작
- `browser_evaluate` localStorage 키 확인

```bash
kill $DEV_PID
```

- [ ] **Step 2.5: 커밋**

```bash
git add overtime.js tests/unit/foundation.test.js
git commit -m "feat(phase2-D): overtime.js → ESM exports

- import { CALC, DATA } + export { OVERTIME } + window.OVERTIME 호환층
- localStorage 키 'overtimeRecords' / 'overtimePayslipData' 보존
- foundation.test.js overtime 케이스 PASS"
```

---

## Task 3: leave.js → ESM (profile 의존)

**Files:**
- Modify: `leave.js`
- Modify: `tests/unit/foundation.test.js`

- [ ] **Step 3.1: 실패 테스트 추가**

```js
it('leave.js: import { LEAVE } + PROFILE 의존 import 동작', async () => {
  const { LEAVE } = await import('../../leave.js');
  expect(LEAVE).toBeDefined();
  expect(typeof LEAVE.calcAnnualSummary).toBe('function');
  // calcAnnualSummary 가 내부적으로 PROFILE.load() 호출 — import 으로 받아야
  const summary = LEAVE.calcAnnualSummary(2026, []);
  expect(summary).toBeDefined();
});
```

- [ ] **Step 3.2: 테스트 실패 확인**

```bash
npx vitest run tests/unit/foundation.test.js -t "leave"
```

- [ ] **Step 3.3: leave.js 변환**

```js
// leave.js 첫 줄
import { CALC } from './calculators.js';
import { DATA } from './data.js';
import { PROFILE } from './profile.js';

const LEAVE = {
    _key() { return window.getUserStorageKey ? window.getUserStorageKey('leaveRecords') : 'leaveRecords'; },
    // ...
    calcAnnualSummary(year, records) {
        // 기존: const profile = typeof PROFILE !== 'undefined' ? PROFILE.load() : null;
        // 변경: const profile = PROFILE.load();
        const profile = PROFILE.load();
        // ... 기존 로직
    },
    // ...
};

export { LEAVE };

if (typeof window !== 'undefined') {
  window.LEAVE = LEAVE;
}
```

> **localStorage 키 검증**: leave 관련 키 ('leaveRecords' 등) 보존.

> **typeof PROFILE !== 'undefined'** 패턴 (line 340, 361) 은 import 후 안전하게 제거 가능.

- [ ] **Step 3.4: 테스트 PASS + 브라우저 검증**

```bash
npm run test:unit  # 162 passed
```

```bash
npm run dev &
DEV_PID=$!
sleep 3
```

Playwright MCP:
- 휴가 탭 → 연차 입력 + 저장
- reload → 연차 잔여일 표시
- 홈 탭 → 휴가 요약 카드 표시 (LEAVE.calcAnnualSummary 의존)

```bash
kill $DEV_PID
```

- [ ] **Step 3.5: 커밋**

```bash
git add leave.js tests/unit/foundation.test.js
git commit -m "feat(phase2-D): leave.js → ESM exports + PROFILE import

- import { CALC, DATA, PROFILE } + export { LEAVE } + window.LEAVE 호환층
- typeof PROFILE !== undefined 가드 제거 (ESM 보장)
- localStorage 키 보존
- foundation.test.js leave 케이스 PASS"
```

---

## Task 4: payroll.js → ESM (가장 큰 1,249줄 — 모든 Layer 2 의존)

**Files:**
- Modify: `payroll.js`
- Modify: `tests/unit/foundation.test.js`

- [ ] **Step 4.1: 실패 테스트 추가**

```js
it('payroll.js: import { PAYROLL } 동작 — 모든 Layer 2 의존', async () => {
  const { PAYROLL } = await import('../../payroll.js');
  expect(PAYROLL).toBeDefined();
  // payroll 의 핵심 함수 검증
  expect(typeof PAYROLL.recalc).toBe('function');
});
```

- [ ] **Step 4.2: 테스트 실패 확인**

```bash
npx vitest run tests/unit/foundation.test.js -t "payroll"
```

- [ ] **Step 4.3: payroll.js 변환**

```js
// payroll.js 첫 줄
import { CALC } from './calculators.js';
import { DATA } from './data.js';
import { PROFILE } from './profile.js';
import { OVERTIME } from './overtime.js';
import { LEAVE } from './leave.js';

const PAYROLL = {
  // ... 기존 본문 (CALC, DATA, PROFILE, OVERTIME, LEAVE 참조 — 그대로 동작)
};

export { PAYROLL };

if (typeof window !== 'undefined') {
  window.PAYROLL = PAYROLL;
}
```

> **inline onclick 보존**: `payroll.js:102-105` 의 `onclick="PAYROLL._otStep(...)"` 같은 inline 핸들러는 `window.PAYROLL` 참조 → 호환층으로 동작 유지.

- [ ] **Step 4.4: 테스트 PASS + 브라우저 검증**

```bash
npm run test:unit  # 163 passed
```

```bash
npm run dev &
DEV_PID=$!
sleep 3
```

Playwright MCP — **급여 탭 전체 검증**:
- 급여 탭 → 계산 서브탭: 급여 계산 결과 표시
- 명세서 서브탭: 명세서 업로드 + 파싱
- 퇴직금 서브탭: 시뮬레이션
- inline onclick (`PAYROLL._otStep`) 동작 검증 — +/− 버튼 클릭

```bash
kill $DEV_PID
```

- [ ] **Step 4.5: 커밋**

```bash
git add payroll.js tests/unit/foundation.test.js
git commit -m "feat(phase2-D): payroll.js → ESM exports — 모든 Layer 2 import 완성

- import { CALC, DATA, PROFILE, OVERTIME, LEAVE } + export { PAYROLL }
- window.PAYROLL 호환층 (inline onclick 의존성 보존)
- foundation.test.js payroll 케이스 PASS
- 급여 탭 3 서브탭 (계산/명세서/퇴직금) 콘솔 에러 0"
```

---

## Task 5: 통합 검증 + Playwright 스모크

- [ ] **Step 5.1: localStorage 키 인벤토리 비교 (변경 0 확인)**

```bash
grep -rn "localStorage\.\(get\|set\)Item\|getUserStorageKey" profile.js overtime.js leave.js payroll.js | sort -u > /tmp/storage-keys-after.txt
diff /tmp/storage-keys-before.txt /tmp/storage-keys-after.txt
```

Expected: diff 0 (1글자도 안 바뀜) — **사용자 데이터 손실 위험 0 검증**.

- [ ] **Step 5.2: 단위 테스트 + audit 0**

```bash
npm run test:unit                # 163 passed
npm run check:regulation         # 0 issue
npm run check:paytable           # 0 issue
```

- [ ] **Step 5.3: Vite production 빌드 + Playwright 전체 스모크**

```bash
npm run build
npm run preview &
PREVIEW_PID=$!
sleep 3
```

Playwright MCP — **CLAUDE.md 필수 체크리스트 전부**:

- [ ] 홈 탭 요약 카드 (휴가/시간외/급여 모두)
- [ ] 급여 탭 3개 서브탭
- [ ] 시간외 탭 시급 경고
- [ ] 휴가 탭 연차
- [ ] 찾아보기 탭
- [ ] 개인정보 탭 round-trip
- [ ] 설정 탭
- [ ] 피드백 탭
- [ ] regulation.html
- [ ] retirement.html
- [ ] **localStorage round-trip**: 모든 데이터 저장 → reload → 복원
- [ ] **inline onclick 동작**: PAYROLL._otStep, PROFILE.\* 등
- [ ] 콘솔 에러 0건

```bash
kill $PREVIEW_PID
```

- [ ] **Step 5.4: 커밋 (검증 메모)**

```bash
git commit --allow-empty -m "test(phase2-D): Layer 2 ESM 전환 검증

- 163 unit tests passed (foundation 10: Layer 0+1+2)
- localStorage 키 변경 0 (diff 검증)
- Playwright: 9 화면 + round-trip + inline onclick 콘솔 에러 0"
```

---

## Task 6: PR + 머지

- [ ] **Step 6.1: PR**

```bash
git push -u origin feat/phase2-D-layer2
gh pr create --title "Phase 2-D: Layer 2 State Stores ESM 전환" --body "$(cat <<'EOF'
## Summary
- profile.js / overtime.js / leave.js / payroll.js → ESM
- import 그래프: profile → leave/payroll, overtime → payroll, leave → payroll
- localStorage 키 1글자 변경 0 (diff 검증 통과)

## Test plan
- [x] 163 unit tests passed
- [x] localStorage round-trip 회귀 0 (diff 0)
- [x] check:regulation / check:paytable 0 issue
- [x] Playwright 9 화면 + inline onclick 콘솔 에러 0
- [ ] Vercel preview 배포 검증 (실제 사용자 데이터 손실 위험 0)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 6.2: Vercel preview 검증 — 실제 데이터 round-trip**

PR Vercel preview URL → 6개 핵심 탭 + localStorage round-trip 정상 동작 확인.

- [ ] **Step 6.3: 머지**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull
git worktree remove ../bhm_overtime-phase2-D
```

---

## Self-Review Checklist

- [ ] 4개 state store: `import` 그래프 + `export` + `window.X` 호환층
- [ ] localStorage 키 (bhm_hr_profile / overtimeRecords / overtimePayslipData / leaveRecords / ...) 1글자 변경 0
- [ ] window.getUserStorageKey 의존 보존 (Layer 4 까지)
- [ ] 163 unit tests passed
- [ ] foundation.test.js Layer 0+1+2 = 10/10 PASS
- [ ] Playwright 9 화면 + inline onclick 콘솔 에러 0
- [ ] localStorage round-trip 정상

---

## 다음 단계

Phase 2-E: Layer 3 AppLock (auth/lock 단일 모듈, 의존 0). PIN + WebAuthn 모듈을 ESM 으로.
