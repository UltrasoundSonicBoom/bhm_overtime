# Plan F: Plan D 발견 Latent 버그 수정 + Plan E 스킵 해제

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plan D 에서 발견된 12개 latent 버그 중 **8개**를 수정하고, Plan E 가 `.skip` 으로 등록한 7개 테스트를 PASS 로 승격시킨다. 각 수정은 registry 테스트 변화로 검증된다 (test-driven fix).

**Architecture:**
- 각 버그 = 1 task. 범위: 해당 파일 grep → 원인 확인 → 수정 → `calc-registry.json` 엔트리 제거 또는 status 변경 → Vitest 재실행 → skip 수 감소 확인.
- Plan F 에서 Bug #10/#11 (이벤트 수신자 희소) 는 **제외** → Plan G. Bug #9 (leaveRecords 격리) + Bug #12 (급여명세서 체인 중복) 도 **제외** → 별도 판단 필요.
- Bug #7 (장기재직 휴가 값 모순) 은 **사용자 결정 필요** — Task 에서 STOP + 질문.

**Tech Stack:** 기존 (Vitest, 바닐라 JS). 새 의존성 0.

**Branch:** `fix/plan-f-latent-bugs` (worktree 필수)

---

## 배경 — Plan E 현재 상태 (baseline)

- `npm run test:unit`: 57 passed + 7 skipped (64 total)
- 스킵 7개:
  - `calcSeverancePay` (dead export, Bug #8)
  - `calcUnionStepAdjust` (dead export, Bug #8)
  - `calcPromotionDate` (dead export, Bug #8)
  - `calcNursePay` (dead export + 하드코딩 Bug #5 + Bug #8)
  - `checkNurseScheduleRules` (dead export, Bug #8)
  - `calcRetirement` (broken, Bug #3)
  - `calcServiceYears` (wrong_namespace, Bug #4)

**Plan F 목표 상태:** 57 passed + 0 skipped (또는 Plan F2 로 이연된 것만 skip 유지).

---

## 범위 외 (별도 플랜)

| Bug | 내용 | 이연 사유 | 후속 플랜 |
|-----|------|----------|----------|
| #9 | `leaveRecords` 키 격리 미적용 | 주석에 의도된 설계 명시 — 판단 + 마이그레이션 고려 필요 | 별도 결정 |
| #10 | `applyProfileToOvertime` profileChanged 미수신 | 이벤트 시스템 변경 + 통합 테스트 | Plan G |
| #11 | `profileChanged` 수신자 1곳뿐 | 위와 동일 — 수신자 보강 | Plan G |
| #12 | 급여명세서 체인 중복 구현 | 리팩토링 범위 — 통합 테스트 필요 | Plan G 또는 별도 |

---

## 파일 구조

### 수정
- `calculators.js` — Bug #5, #6, #8
- `app.js` — Bug #1, #3
- `salary-parser.js` — Bug #4
- `profile.js` — Bug #4 (CommonJS export 추가, Vitest 가 PROFILE 로드하기 위해)
- `data.js` — Bug #2, Bug #7 (사용자 판단 후)
- `data/calc-registry.json` — 각 버그 수정마다 엔트리 제거/status 변경
- `tests/unit/calc-registry.test.js` — `.skip` 제거

### 생성
- 없음 (순수 수정 플랜)

---

## Task 1: 워크트리 + baseline

**Files:** 없음 (인프라)

- [ ] **Step 1: 워크트리 생성**

```bash
cd /Users/momo/Documents/GitHub/bhm_overtime
git worktree add .worktrees/plan-f -b fix/plan-f-latent-bugs
cd .worktrees/plan-f
npm install
```

- [ ] **Step 2: baseline 테스트 실행 — 현재 상태 확인**

```bash
npm run test:unit 2>&1 | tail -5
```

Expected: `Tests  57 passed | 7 skipped (64)`. 다르면 STOP + 원인 조사.

- [ ] **Step 3: baseline 태그**

```bash
git tag baseline-plan-f
```

---

## Task 2: Bug #1 수정 — showOtToast 시그니처 불일치

**근거:** known-issues.md Bug #1. `app.js:3598` 근처 `showOtToast('메시지', 4500)` 호출이 `(message, type)` 시그니처에 `4500` 을 type 자리에 전달.

**Files:**
- Modify: `app.js` (호출부 근처)

- [ ] **Step 1: 호출부 확인**

```bash
grep -nE "showOtToast\(.*,\s*4500" app.js
```

Expected: 1건 (라인 번호 기록).

- [ ] **Step 2: 호출부 컨텍스트 읽기**

Read 툴로 해당 라인 ±10 줄 읽어 무슨 상황인지 파악. 호출 직전에 상태 (성공/실패 등) 에 따라 분기가 있다면 `type` 인자 결정.

예: 경고 상황이면 `'warning'`, 정보성이면 `'info'`, 기본 성공이면 두 번째 인자 생략.

- [ ] **Step 3: 수정**

`4500` 을 적절한 type 으로 교체 또는 제거. 구체 수정 내용은 Step 2 에서 파악한 맥락 의존:

```javascript
// Before
showOtToast('⚠️ 직급/호봉이 자동 설정되지 않았습니다. 내 정보에서 확인해주세요.', 4500);

// After (경고 맥락으로 판단되면)
showOtToast('⚠️ 직급/호봉이 자동 설정되지 않았습니다. 내 정보에서 확인해주세요.', 'warning');
```

**주의**: `4500` 이 duration 의도라면 `showOtToast` 정의(`app.js:2374` 근처)에 duration 인자 추가하는 것도 선택지. 단, 모든 호출부 영향 파악 후 결정.

- [ ] **Step 4: 테스트 실행**

```bash
npm run test:unit
```

Expected: 변화 없음 (57 passed + 7 skipped) — 이 버그는 registry 테스트로 잡을 수 없음. `npm run test:smoke` 도 확인:

```bash
npm run test:smoke
```

Expected: 3 passed.

- [ ] **Step 5: 커밋**

```bash
git add app.js
git commit -m "fix(app): showOtToast 시그니처 맞추기 — 4500 → type 인자 (Bug #1)"
```

---

## Task 3: Bug #2 수정 — localhost:3001 CSP 오염 제거

**근거:** known-issues.md Bug #2. 매 페이지 로드 10초 후 `fetch('http://localhost:3001/api/data/bundle')` 시도 → CSP 차단 에러 2건.

**Files:**
- Modify: `data.js` (loadDataFromAPI 근처)

- [ ] **Step 1: 현재 로직 읽기**

```bash
grep -nB2 -A20 "function loadDataFromAPI" data.js
```

- [ ] **Step 2: 환경 감지 가드 추가**

`loadDataFromAPI` 함수 본문 시작에 다음 가드 삽입:

```javascript
async function loadDataFromAPI() {
  // API 백엔드가 운영 가능할 때만 호출. localhost 는 dev 환경 — 실제 백엔드 URL 로 바뀌면 제거.
  var apiBase = (typeof _apiBase !== 'undefined' ? _apiBase : '');
  if (!apiBase || apiBase.startsWith('http://localhost')) {
    // 백엔드 URL 미설정 또는 localhost 포인팅 → 조용히 스킵 (CSP 오염 방지)
    return;
  }

  if (dataLoadPromise) return dataLoadPromise;
  // ... 기존 로직
```

**주의:** `_apiBase` 변수의 정의 위치 확인 후 가드 로직 조정. 변수명이 다르면 실제 이름으로 교체.

- [ ] **Step 3: setTimeout 도 조건부로**

파일 끝의 `if (typeof window !== 'undefined') { setTimeout(loadDataFromAPI, 10000); }` 내부에 동일 조건 추가:

```javascript
if (typeof window !== 'undefined') {
  // API 엔드포인트가 실제로 운영중일 때만 지연 호출 (지금은 localhost 기본값이므로 스킵)
  // TODO: 백엔드 배포 후 이 조건 제거.
  var skipApiCall = true;
  if (!skipApiCall) setTimeout(loadDataFromAPI, 10000);
}
```

또는 Step 2 의 가드만으로 충분하면 setTimeout 은 유지 (loadDataFromAPI 내부에서 즉시 return).

- [ ] **Step 4: 브라우저 스모크 — CSP 에러 0건 확인**

```bash
npm run test:smoke 2>&1 | tail -5
```

Expected: 3 passed. 추가로 smoke 테스트의 IGNORED_ERROR_PATTERNS 에서 `localhost:3001` 제외 가능한지 확인:

```bash
grep -n "IGNORED_ERROR_PATTERNS\|localhost:3001" tests/e2e/smoke.spec.js
```

- [ ] **Step 5: 커밋**

```bash
git add data.js
git commit -m "fix(data): localhost:3001 fetch 스킵 — dev 환경 CSP 오염 제거 (Bug #2)"
```

---

## Task 4: Bug #3 수정 — CALC.calcRetirement 호출처 정리

**근거:** known-issues.md Bug #3. `app.js:1347` 에서 `CALC.calcRetirement` 호출하나 `calculators.js` 에 정의 없음. try/catch 로 silent fail.

**Files:**
- Modify: `app.js:1347` 근처 (호출부)
- Modify: `data/calc-registry.json` (calc_references 엔트리 제거)
- Modify: `tests/unit/calc-registry.test.js` (해당 skip 제거)

- [ ] **Step 1: 호출부 맥락 확인**

```bash
grep -nB5 -A15 "CALC\.calcRetirement" app.js
```

옆에 `calcRetirementEmbedded()` 가 있으면 그걸 쓰면 됨 (실제 퇴직금 계산 함수).

- [ ] **Step 2: 호출 삭제 또는 대체**

**옵션 A (안전):** 호출을 제거하고 `calcRetirementEmbedded` 로 대체 (이미 같은 라인 근처에서 쓰고 있음).

**옵션 B (덜 안전):** `calculators.js` 에 `CALC.calcRetirement` 스텁 추가 → `calcRetirementEmbedded` 호출로 위임.

Step 1 의 맥락 보고 결정. 보통 옵션 A.

예시 (옵션 A):

```javascript
// Before
try {
  ret = typeof CALC !== 'undefined' ? CALC.calcRetirement({...}) : null;
} catch (e) { /* silent */ }

// After
try {
  ret = (typeof calcRetirementEmbedded === 'function') ? calcRetirementEmbedded({...}) : null;
} catch (e) { /* silent */ }
```

- [ ] **Step 3: calc-registry.json 업데이트**

`data/calc-registry.json` 의 `calc_references` 배열에서 `calcRetirement` 엔트리 삭제:

```json
// Before
"calc_references": [
  { "name": "calcRetirement", "status": "broken", ... },
  { "name": "calcServiceYears", "status": "wrong_namespace", ... }
]

// After
"calc_references": [
  { "name": "calcServiceYears", "status": "wrong_namespace", ... }
]
```

- [ ] **Step 4: 재확인 grep**

```bash
grep -rn "CALC\.calcRetirement" --include="*.js" . | grep -v worktrees | grep -v node_modules | grep -v tests/
```

Expected: 0건.

- [ ] **Step 5: 테스트 실행 — skip 1 감소 확인**

```bash
npm run test:unit 2>&1 | tail -5
```

Expected: `Tests  57 passed | 6 skipped` (Bug #3 skip 하나 제거됨 = 엔트리 삭제).

- [ ] **Step 6: 커밋**

```bash
git add app.js data/calc-registry.json
git commit -m "fix(app): CALC.calcRetirement 미존재 호출 제거 → calcRetirementEmbedded 사용 (Bug #3)"
```

---

## Task 5: Bug #4 수정 — CALC.calcServiceYears → PROFILE.calcServiceYears

**근거:** known-issues.md Bug #4. `salary-parser.js:1352` 에서 `CALC.calcServiceYears` 호출하나 실제는 `PROFILE.calcServiceYears` (profile.js:129). 삼항 폴백으로 serviceYears=0 고정.

**Files:**
- Modify: `salary-parser.js:1352` (호출 네임스페이스 변경)
- Modify: `profile.js` (CommonJS export 추가 — Vitest 에서 PROFILE 로드 위해)
- Modify: `data/calc-registry.json` (calc_references 엔트리 제거)

- [ ] **Step 1: 호출부 확인**

```bash
grep -nB3 -A5 "CALC\.calcServiceYears" salary-parser.js
```

- [ ] **Step 2: 네임스페이스 변경**

```javascript
// Before
const serviceYears = CALC.calcServiceYears ? CALC.calcServiceYears(profile.hireDate) : 0;

// After
const serviceYears = (typeof PROFILE !== 'undefined' && PROFILE.calcServiceYears)
  ? PROFILE.calcServiceYears(profile.hireDate)
  : 0;
```

- [ ] **Step 3: profile.js 에 CommonJS export 추가**

`profile.js` 최하단에 다음 블록 추가 (Node/Vitest 호환):

```javascript
// Node (Vitest) 환경에서 require 가능하도록 CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PROFILE };
}
```

파일 전체 구조가 IIFE 이거나 다른 패턴이면 `PROFILE` 변수를 module 스코프에서 접근 가능하도록 조정. 구조는 실제 읽고 확인:

```bash
head -10 profile.js
tail -10 profile.js
```

- [ ] **Step 4: calc-registry.json 업데이트**

`calc_references` 에서 `calcServiceYears` 엔트리 삭제 (Task 4 에서 `calcRetirement` 삭제 후이면 배열이 빈 배열 `[]` 이 됨):

```json
"calc_references": []
```

- [ ] **Step 5: 재확인 grep**

```bash
grep -rn "CALC\.calcServiceYears" --include="*.js" . | grep -v worktrees | grep -v node_modules | grep -v tests/
```

Expected: 0건.

- [ ] **Step 6: 테스트 실행 — skip 1 감소**

```bash
npm run test:unit 2>&1 | tail -5
```

Expected: `Tests  57 passed | 5 skipped`.

- [ ] **Step 7: 커밋**

```bash
git add salary-parser.js profile.js data/calc-registry.json
git commit -m "fix(parser): CALC.calcServiceYears → PROFILE.calcServiceYears (Bug #4)

- salary-parser.js:1352 네임스페이스 정정
- profile.js: CommonJS export 추가 (Vitest 호환)
- registry: calc_references 엔트리 제거 → skip 1 감소"
```

---

## Task 6: Bug #7 — 장기재직 휴가 값 모순 (**사용자 판단 필요**)

**근거:** known-issues.md Bug #7. data.js 내부에 20년+ 장기재직 휴가 값이 두 군데 다르게 기재 (7일 vs 10일).

**Files:**
- Read first: `data.js` (두 언급 위치)
- Modify: `data.js` 하나를 canonical 로 선택해 다른 쪽 수정

- [ ] **Step 1: 두 언급 위치 정확히 확인**

```bash
grep -nB2 -A2 "20년" data.js | head -30
```

Step 1 결과에서 어느 라인이 구조화된 데이터(DATA_STATIC.leaveQuotas 같은) 인지, 어느 라인이 FAQ 텍스트인지 판단.

- [ ] **Step 2: ⚠️ 사용자에게 질문 STOP**

**구조화된 data 와 FAQ 문자열이 다르면 어느 쪽이 canonical 인지 모름.**

다음 정보를 정리해서 사용자에게 결정 요청:

```
Bug #7 — 장기재직 휴가 20년 이상 일수:
  data.js line {N1}: "{n1}일" ({context — 어떤 구조에 있는지})
  data.js line {N2}: "{n2}일" ({context})

  hospital_guidelines_2026.md 제42조: "20년 이상 7일"

어느 값이 맞나요? (a) 7일이 맞고 {라인 2} 를 7로 수정 / (b) 10일이 맞고 hospital_guidelines 와 {라인 1} 을 10으로 / (c) 단협 원문 확인 필요 → 다음 Plan 으로 이연.
```

- [ ] **Step 3: 사용자 답변에 따라 수정**

사용자 답변대로 한 쪽 값 교체. 예시 (사용자가 "7일이 canonical" 로 판단):

```javascript
// data.js line {N2} 변경
// Before: "20년 이상: 10일"
// After:  "20년 이상: 7일"
```

- [ ] **Step 4: 테스트**

```bash
npm run test:unit
```

Expected: 변화 없음 (registry 에는 이 값이 assert 되어 있지 않음 — FAQ 문자열이라 data_values 엔트리 없음). 단 눈으로 교정 완료 확인.

- [ ] **Step 5: 커밋**

```bash
git add data.js
git commit -m "fix(data): 장기재직 휴가 20년+ 값 일원화 — canonical = {X}일 (Bug #7)"
```

- [ ] **Step 6: (선택) registry 에 assert 추가**

만약 이 값이 어떤 DATA 경로에 존재한다면 `calc-registry.json` 의 `data_values` 에 추가해 향후 재발 방지:

```json
{ "path": "longServiceLeave.over20", "expected": 7, "article": "제42조", "summary": "20년 이상 장기재직 휴가 7일" }
```

단 실제 DATA 구조에 해당 필드가 없다면 스킵.

---

## Task 7: Bug #8 수정 — dead export 5개 제거

**근거:** known-issues.md Bug #8. `calcSeverancePay`, `calcUnionStepAdjust`, `calcPromotionDate`, `calcNursePay`, `checkNurseScheduleRules` 모두 외부 호출 0.

**Files:**
- Modify: `calculators.js` (5개 함수 삭제)
- Modify: `data/calc-registry.json` (`calc_functions` 에서 해당 5개 엔트리 제거)

- [ ] **Step 1: 5개 함수 각각 호출자 0 재확인**

```bash
for fn in calcSeverancePay calcUnionStepAdjust calcPromotionDate calcNursePay checkNurseScheduleRules; do
  echo "=== $fn ==="
  grep -rn "$fn" --include="*.js" --include="*.html" . | grep -v worktrees | grep -v node_modules | grep -v tests/ | grep -v calculators.js
done
```

Expected: 각 함수마다 0건 (calculators.js 내부 정의 외). 발견되면 STOP + 사용처 분석.

- [ ] **Step 2: calculators.js 에서 함수 본문 삭제**

각 함수 정의 블록 (시그니처부터 닫는 `}` + 뒤의 쉼표 `,` 까지) 삭제. 총 5개.

`calcNursePay` 는 Bug #5 의 하드코딩 문제와 같이 해결됨 — 삭제하면 문제 자체 소멸.

수정 후 grep 재확인:

```bash
grep -nE "^    (calcSeverancePay|calcUnionStepAdjust|calcPromotionDate|calcNursePay|checkNurseScheduleRules)" calculators.js
```

Expected: 0건.

- [ ] **Step 3: calc-registry.json 업데이트**

`calc_functions` 배열에서 5개 엔트리 삭제 (required: false 로 표시돼 있던 것들):

```json
// Before: 20 entries (15 required + 5 skip)
// After: 15 entries (15 required, all active)
```

- [ ] **Step 4: calculators.test.js 기존 단위 테스트 확인**

`tests/unit/calculators.test.js` 가 위 5개 함수를 호출하는지 확인:

```bash
grep -n "calcSeverancePay\|calcUnionStepAdjust\|calcPromotionDate\|calcNursePay\|checkNurseScheduleRules" tests/unit/calculators.test.js
```

Expected: 0건 (Plan A/B/C 의 테스트는 정상 함수만 다뤘음).

- [ ] **Step 5: 테스트 실행**

```bash
npm run test:unit 2>&1 | tail -5
```

Expected: `Tests  57 passed | 0 skipped` (5개 `required: false` skip 이 사라지고 — calc_functions 배열에서 삭제됐으니 iteration 안 됨).

단, Task 4, 5 이후 추적하면 7 → 6 → 5 → 0 (Task 7 에서 5 skip 제거).

- [ ] **Step 6: 커밋**

```bash
git add calculators.js data/calc-registry.json
git commit -m "chore(calc): dead export 5개 제거 — calcSeverancePay/Union/Promotion/NursePay/checkNurseSchedule (Bug #8)

외부 호출 0. Bug #5 (calcNursePay 하드코딩) 동시 해소 (함수 제거로).
registry skip 5 → 0 — 전 테스트 active."
```

---

## Task 8: Bug #6 수정 — recoveryDay otherCumulativeTrigger (시설직 리커버리 데이)

**근거:** known-issues.md Bug #6. `DATA.recoveryDay.otherCumulativeTrigger` (20회) 가 data.js 에 있으나 `calcNightShiftBonus` 는 `nurseCumulativeTrigger` (15) 만 참조.

**Files:**
- Modify: `calculators.js` `calcNightShiftBonus`

- [ ] **Step 1: 현재 함수 본문 확인**

```bash
grep -nA30 "calcNightShiftBonus" calculators.js | head -40
```

함수가 `jobType` 인자를 받는지 확인. 받지 않으면 인자 추가 필요.

- [ ] **Step 2: 시설직 판정 로직 확인**

직종 코드 중 시설/이송/미화 에 해당하는 값 확인:

```bash
grep -nE "'시설'|'이송'|'미화'|jobTypes" data.js | head
```

Step 1 과 Step 2 결과로 분기 조건 결정.

- [ ] **Step 3: 분기 추가**

예시:

```javascript
// Before
calcNightShiftBonus(nightShiftCount, prevCumulative = 0) {
  const trigger = DATA.recoveryDay.nurseCumulativeTrigger; // 15
  // ...
}

// After
calcNightShiftBonus(nightShiftCount, prevCumulative = 0, jobType = null) {
  // 시설/이송/미화 등은 누적 20회 기준, 그 외 간호직은 15회
  const isFacilityJob = jobType && ['시설', '이송', '미화', '시설직', '환경미화직'].some(k => jobType.indexOf(k) !== -1);
  const trigger = isFacilityJob
    ? DATA.recoveryDay.otherCumulativeTrigger  // 20
    : DATA.recoveryDay.nurseCumulativeTrigger; // 15
  // ... 이하 기존 로직 (trigger 변수만 이미 DATA.nurseCumulativeTrigger 하드 참조였으면 교체)
}
```

**주의**: 호출부 (`app.js` 의 `calculateNightBonus` 근처) 가 새 `jobType` 인자를 전달하도록 호출 시점의 `profile.jobType` 이나 `PROFILE.load().jobType` 참조 추가:

```bash
grep -n "calcNightShiftBonus" calculators.js app.js | grep -v calculators.js
```

호출부 수정:

```javascript
// Before
const r = CALC.calcNightShiftBonus(count, prevCumulative);

// After
const profile = PROFILE.load();
const r = CALC.calcNightShiftBonus(count, prevCumulative, profile && profile.jobType);
```

- [ ] **Step 4: registry 업데이트 — otherCumulativeTrigger assert 추가**

`data/calc-registry.json` 의 `data_values` 에 2개 엔트리 추가 (재발 방지):

```json
{ "path": "recoveryDay.nurseCumulativeTrigger", "expected": 15, "article": "제32조 야간 부속합의", "summary": "간호직 누적 야간 15회당 리커버리 1일", "consumers": ["CALC.calcNightShiftBonus"] },
{ "path": "recoveryDay.otherCumulativeTrigger", "expected": 20, "article": "제32조 야간 부속합의", "summary": "시설/이송/미화 누적 야간 20회당 리커버리 1일", "consumers": ["CALC.calcNightShiftBonus"] }
```

- [ ] **Step 5: calculators.test.js 추가 assert (선택)**

기존 `tests/unit/calculators.test.js` 의 calcNightShiftBonus 섹션 확장:

```javascript
describe('CALC.calcNightShiftBonus 시설직 분기 (Bug #6)', () => {
  it('간호직 15회 누적 시 리커버리 1일', () => {
    const r = CALC.calcNightShiftBonus(15, 0, '간호직');
    expect(r.recoveryDays || r.리커버리데이 || 0).toBe(1);
  });

  it('시설직 15회 누적 시 리커버리 0일 (20 도달 전)', () => {
    const r = CALC.calcNightShiftBonus(15, 0, '시설직');
    expect(r.recoveryDays || r.리커버리데이 || 0).toBe(0);
  });

  it('시설직 20회 누적 시 리커버리 1일', () => {
    const r = CALC.calcNightShiftBonus(20, 0, '시설직');
    expect(r.recoveryDays || r.리커버리데이 || 0).toBe(1);
  });
});
```

**주의**: 실제 반환 필드명 (`recoveryDays` vs `리커버리데이`) 을 함수 확인 후 정확히 사용. 가드로 `||` 처리.

- [ ] **Step 6: 테스트 실행**

```bash
npm run test:unit
```

Expected: 이전 57 passed + 신규 3 (시설직 분기) = 60 passed + 0 skipped (+ Task 8 에서 registry 에 2 assertion 추가해 62 passed).

- [ ] **Step 7: 커밋**

```bash
git add calculators.js app.js data/calc-registry.json tests/unit/calculators.test.js
git commit -m "fix(calc): calcNightShiftBonus 시설직 20회 누적 분기 추가 (Bug #6)

- calculators.js: jobType 인자 추가 + nurseCumulativeTrigger / otherCumulativeTrigger 분기
- app.js 호출부: profile.jobType 전달
- registry: otherCumulativeTrigger assert 추가 (재발 방지)
- calculators.test.js: 시설직 분기 검증 3개"
```

---

## Task 9: 최종 검증 + main merge

**Files:** 없음 (검증 단계)

- [ ] **Step 1: 전체 테스트**

```bash
npm test
```

Expected:
- `test:unit`: 57 기본 + 3 (Task 8 신규) + 2 (Task 8 registry 신규 assert) + 약간의 드리프트 테스트 증가 = **약 62 passed + 0 skipped**
- `test:smoke`: 3 passed

- [ ] **Step 2: diff 요약**

```bash
git log --oneline baseline-plan-f..HEAD
git diff --stat baseline-plan-f..HEAD
```

수정 파일 예상: `app.js, calculators.js, data.js, profile.js, salary-parser.js, data/calc-registry.json, tests/unit/calculators.test.js, tests/unit/calc-registry.test.js (필요시)`

- [ ] **Step 3: 브라우저 스모크 (Playwright)**

```bash
npm run test:smoke 2>&1 | tail -5
```

Expected: 3 passed. 콘솔 에러 0건 (localhost:3001 CSP 에러가 Bug #2 수정으로 사라졌어야).

- [ ] **Step 4: main merge + push**

```bash
cd /Users/momo/Documents/GitHub/bhm_overtime
git checkout main
git merge --no-ff fix/plan-f-latent-bugs -m "Merge Plan F — Latent 버그 8건 수정 + skip 전부 해제"
git worktree remove .worktrees/plan-f
git branch -d fix/plan-f-latent-bugs
git push origin main
```

---

## Self-Review

**1. Spec 커버리지:**
- Bug #1 (Task 2) ✅
- Bug #2 (Task 3) ✅
- Bug #3 (Task 4) ✅
- Bug #4 (Task 5) ✅
- Bug #7 (Task 6 — 사용자 판단) ✅
- Bug #8 + #5 (Task 7 — calcNursePay 삭제로 동시 해소) ✅
- Bug #6 (Task 8) ✅
- **제외 (Plan G)**: Bug #10, #11
- **제외 (별도)**: Bug #9, #12

**2. Placeholder 없음:**
- Task 2 는 사용자 맥락 파악이 필요해 "Step 2 에서 결정" 문구 있음 — 이는 합리적 분기 (대안 코드 2가지 제시).
- Task 6 은 사용자 STOP 을 **공식화**. 그 외 단계는 결정 후 구체 커밋 메시지 포함.
- Task 8 은 호출부 파라미터 시그니처 확인 후 구체 코드 제시 — 가드 (`r.recoveryDays || r.리커버리데이`) 사용.

**3. Type consistency:**
- Task 4/5 의 registry `calc_references` 조작은 일관성 있게 "엔트리 삭제" 로 통일.
- Task 7 의 `calc_functions` 도 "엔트리 삭제" 로 통일.
- Skip 수 감소 순서: 7 → 6 (T4) → 5 (T5) → 0 (T7).

---

## 리스크 완화

| 리스크 | 완화 |
|-------|------|
| Task 2 `showOtToast` 맥락 오판 | Step 2 에서 ±10 줄 읽고 경고/정보/성공 분기 중 선택. 의심 시 사용자에게 질문. |
| Task 3 `_apiBase` 변수명 차이 | Step 1 grep 으로 실제 이름 확인 후 수정. |
| Task 4 옵션 A vs B | Step 1 의 주변 함수 유무로 판정. calcRetirementEmbedded 있으면 옵션 A. |
| Task 5 profile.js CommonJS export 실패 | Step 3 에서 IIFE 구조 확인 후 조정. `PROFILE` 접근 불가면 `module.exports.PROFILE = window.PROFILE` 폴백. |
| Task 6 사용자 답변 지연 | Task 6 만 스킵하고 Task 7/8 진행, 최종 merge 시점에 결정 요청. |
| Task 7 dead export 삭제 중 호출자 발견 | Step 1 에서 0 확인 필수. 발견 시 STOP + 사용처 분석 후 재판정. |
| Task 8 jobType 인자 추가로 호출부 파손 | 호출부 1곳만 (app.js) — Step 3 에서 수정. 누락 여부 grep 재확인. |

---

## 예상 작업량

- Task 1 (인프라): 5분
- Task 2 (showOtToast): 10분
- Task 3 (localhost:3001): 10분
- Task 4 (calcRetirement): 15분
- Task 5 (calcServiceYears): 15분 (profile.js export 포함)
- Task 6 (장기재직 휴가 — 사용자 판단): 5분 (작업) + 사용자 답변 대기
- Task 7 (dead exports): 15분 (5개 함수 + registry)
- Task 8 (recoveryDay): 25분 (로직 + 테스트)
- Task 9 (merge): 10분

**총 약 2시간** + 사용자 답변 대기 시간.

---

## Plan F 이후

- Plan G: Bug #10, #11 (이벤트 시스템 + 통합 e2e 테스트 — 사용자 "연동 안 됨" 체감 원인 해소)
- 별도 판단: Bug #9 (leaveRecords 키 격리 유지 vs 변경), Bug #12 (급여명세서 체인 dedup)
- 이연: Plan E2 (DATA_STATIC → JSON 분리), Plan H (미검증 페이지)
