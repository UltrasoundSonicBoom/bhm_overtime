# Plan F: Plan D 발견 Latent 버그 수정 + Plan E 스킵 해제

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plan D 에서 발견된 12개 latent 버그 중 **9개** (Bug #1~8, 신규 #13) 를 수정하고, Plan E 의 7개 skip 을 PASS 로 승격. 추가로 **SoT 갱신 운영 매뉴얼** (2027.md 들어올 때 경로) 을 문서화하여 단협 개정 회귀 방지 체계를 완성.

**Architecture:**
- **Part A — 버그 수정**: 각 버그 = 1 task. 해당 파일 grep → 원인 확인 → 수정 → `calc-registry.json` 엔트리 제거/status 변경 → Vitest 재실행 → skip 감소 확인.
- **Part B — Plan D 문서 보정**: `full_union_regulation_2026.md` 가 이제 채워진 사실을 `data-sources.md` 등에 반영. "0바이트 placeholder" 기술 교체.
- **Part C — SoT 갱신 매뉴얼**: `docs/architecture/sot-update-runbook.md` 신규. 2027 단협 개정 시 full_union_2027.md 수신 → registry 갱신 → DATA 갱신 → 테스트 순 5단계. **버전드 SoT 개념 도입** (2026 기준 계산 vs 2027 기준).
- Plan F 에서 Bug #10/#11 (이벤트 수신자) 는 **제외** → Plan G. Bug #9 (leaveRecords) + Bug #12 (명세서 체인 dedup) 도 **제외** → 별도 판단.
- **Bug #7 확정**: `data/2026_handbook.pdf` p.30 <2025.10> 합의 기준 "10년 이상 20년 미만 **5일**, 20년 이상 **7일**, 각 1회" (2026.01.01. 시행). data.js FAQ 의 "20년 이상 10일" 이 오기재. STOP 불필요.
- **Bug #13 신규**: 배우자 출산 휴가 — handbook 제41조(청원휴가) canonical **10일**, hospital_guidelines 의 "20일" 이 오기재. 유사 드리프트.

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

## Task 6: Bug #7 수정 — 장기재직 휴가 값 일원화 (canonical 확정)

**근거:** known-issues.md Bug #7. data.js 내부에 20년+ 장기재직 휴가 값이 두 군데 다르게 기재 (7일 vs 10일).

**Canonical 결정 (handbook p.30 <2025.10> 합의 기준):**

> 병원은 10년 이상 재직한 직원에 대하여 다음 각 호의 구분에 따라 해당 호에 따른 재직기간 중에 사용할 수 있는 장기 재직휴가를 각 1회 부여한다.
> 1. 재직기간 10년 이상 20년 미만 : **5일**
> 2. 재직기간 20년 이상 : **7일**
> (2026.01.01.부터 시행)

data.js FAQ 의 "20년 이상 10일" 은 **오기재** (아마 복무규정의 별도 체계와 혼동된 값).

**Files:**
- Modify: `data.js` (FAQ 문자열의 "10일" → "7일", 그리고 "10-19년 5일" 문구 정합성 확인)
- Modify: `data/calc-registry.json` (새 data_values 또는 array_assertions 추가 — 재발 방지)

- [ ] **Step 1: data.js 의 두 언급 위치 정확히 확인**

```bash
grep -nB2 -A2 "장기재직\|장기 재직" data.js
grep -nB2 -A2 "20년" data.js | head -30
```

두 언급 각각 라인 번호 기록.

- [ ] **Step 2: data.js 수정 — "10일" → "7일"**

FAQ 또는 문자열 답변 내부에서 "20년 이상 10일" 패턴을 "20년 이상 7일" 로 교체.

예시 변경 (실제 라인 번호는 Step 1 결과 사용):

```javascript
// Before (data.js 라인 NNN 근처 FAQ 답변)
"... 20년 이상: 10일 ..."

// After
"... 20년 이상: 7일 ..."
```

동시에 같은 문자열 내 "10-19년 5일" 은 handbook 과 일치하므로 유지 (확인만).

- [ ] **Step 3: calc-registry.json 에 assert 추가 — 재발 방지**

`data/calc-registry.json` 의 `array_assertions` 에 신규 항목 추가 (DATA 에 `longServiceLeave` 같은 필드가 있으면), 또는 `data_values` 에 직접 추가. 구체 DATA 구조는 Step 1 에서 파악 후 결정.

만약 DATA 에 구조화된 필드가 없고 FAQ 문자열뿐이라면 assert 불가 — **Plan F 의 사후 조치 (Task 9 의 Plan E2 후보)** 로 "DATA 에 longServiceLeaveDays 필드 추가 + FAQ 문자열을 이 값에서 렌더링" 제안.

- [ ] **Step 4: 테스트**

```bash
npm run test:unit
```

Expected: 변화 없음 (단, Step 3 에서 assert 를 추가했다면 +1 passed). 눈으로 교정 완료 확인.

- [ ] **Step 5: 커밋**

```bash
git add data.js data/calc-registry.json
git commit -m "fix(data): 장기재직 휴가 20년+ '10일' → '7일' (handbook canonical) — Bug #7

근거: 2026_handbook.pdf p.30 <2025.10> 합의
  - 재직 10년 이상 20년 미만: 5일
  - 재직 20년 이상: 7일 (2026.01.01. 시행)
data.js FAQ 의 '10일' 은 복무규정 별도 체계와의 혼선으로 판단."
```

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

## Task 8.5: Bug #13 신규 — 배우자 출산 휴가 값 정정

**근거:** handbook p.30 제41조(청원휴가)(3) 배우자 출산 **10일** ↔ hospital_guidelines_2026.md 의 "20일 (출산 후 120일 이내)" 모순. handbook 이 canonical.

**Files:**
- Modify: `data/hospital_guidelines_2026.md` (20일 → 10일)
- Modify: `data.js` (만약 청원휴가 관련 FAQ/ceremonies 필드에 해당 값이 있다면)

- [ ] **Step 1: 모든 언급처 확인**

```bash
grep -rn "배우자 출산\|배우자출산\|spouseBirth" --include="*.js" --include="*.md" . | grep -v worktrees | grep -v node_modules
```

- [ ] **Step 2: hospital_guidelines_2026.md 수정**

`제41조(청원휴가)` 섹션에서 "배우자 출산 20일" → "배우자 출산 10일" 교체. "출산 후 120일 이내" 부가 조건이 있으면 유지 (handbook 과 대조 필요).

- [ ] **Step 3: data.js 확인**

`DATA_STATIC.ceremonies` 또는 FAQ 에 관련 수치 있으면 10일로 정정.

- [ ] **Step 4: 커밋**

```bash
git add data/hospital_guidelines_2026.md data.js
git commit -m "fix(data): 배우자 출산 휴가 20일 → 10일 (handbook canonical) — Bug #13

근거: 2026_handbook.pdf p.30 제41조(청원휴가)(3) '배우자 출산: 10일'
hospital_guidelines_2026.md 의 '20일' 이 오기재."
```

---

## Task 8.7: Plan D 문서 보정 — full_union 이 실제로 채워진 사실 반영

**근거:** Plan D 작성 시점에 `data/full_union_regulation_2026.md` 는 0바이트 placeholder 였으나 사용자가 채웠음. `docs/architecture/data-sources.md` 등의 "0바이트 placeholder" 기술을 정정해야 함.

**Files:**
- Modify: `docs/architecture/data-sources.md`
- Modify: `docs/architecture/sot-drift-risk.md`
- Modify: `docs/architecture/README.md`

- [ ] **Step 1: full_union_regulation_2026.md 현 상태 기록**

```bash
wc -l data/full_union_regulation_2026.md
head -5 data/full_union_regulation_2026.md
```

- [ ] **Step 2: data-sources.md 업데이트**

다음 문구 교체:
- "0바이트 placeholder" → "{N} lines, 제1조~제92조 + 별도합의 + 별첨 임금표 포함" (실제 상태 기술)
- "0바이트 placeholder 상태 (단협 전문 작성 대기)" → "전문 작성 완료 (2026-04-24 기준), 단협 개정 시 사용자 갱신"
- "런타임 미사용 (사람이 읽는 마스터 문서)" 은 그대로 유지 (사실관계 동일)

- [ ] **Step 3: sot-drift-risk.md 업데이트**

"canonical SoT: `data/full_union_regulation_2026.md`" 아래의 "0바이트 placeholder 상태" 또는 유사 문구 정정.

- [ ] **Step 4: 커밋**

```bash
git add docs/architecture/data-sources.md docs/architecture/sot-drift-risk.md docs/architecture/README.md
git commit -m "docs(arch): full_union_regulation_2026.md 채워진 상태 반영 (Plan D 보정)"
```

---

## Task 8.8: SoT 갱신 운영 매뉴얼 — 2027.md 들어왔을 때 경로

**근거:** 사용자 질문 — 2027 단협 개정 시 full_union_2027.md → registry → DATA 동기화를 어떻게 운영하나?

**Files:**
- Create: `docs/architecture/sot-update-runbook.md`

- [ ] **Step 1: 파일 작성**

`docs/architecture/sot-update-runbook.md`:

````markdown
# SoT Update Runbook — 단협 개정 시 동기화 절차

> 새 단협 (예: 2027.md) 이 들어왔을 때 registry/DATA/테스트가 모두 정합을 유지하도록 하는 운영 매뉴얼.
> 담당: 유지보수자. 빈도: 연 1회 (통상 11월 단협 갱신).

## 1. 전체 흐름

```
full_union_YYYY.md (canonical 단협 전문, 사용자가 채움)
   ↓ (Step A) 축약 요약 갱신
hospital_guidelines_YYYY.md (개발자 참고용)
   ↓ (Step B) 조항 배열 구조화
data/union_regulation_YYYY.json (regulation.html 표시용)
   ↓ (Step C) 수치 추출
data.js DATA_STATIC (계산 상수)
   ↓ (Step D) assert 값 업데이트
data/calc-registry.json (Vitest drift-check 기준)
```

## 2. 5단계 절차

### Step A: 단협 전문 수신 (사용자)

- 새 단협 `data/full_union_regulation_YYYY.md` 생성.
- 기존 `full_union_regulation_{YYYY-1}.md` 는 아카이브 (삭제하지 말고 버전 보존).

### Step B: 파생 문서 갱신 (개발자/자동화)

순서 중요 (위 → 아래):

1. **hospital_guidelines_YYYY.md** 축약: 제4~6장 위주로 요약.
2. **union_regulation_YYYY.json** 구조화: 조항별 id/title/content/clauses 배열로 변환.
3. **data.js DATA_STATIC** 수치 갱신: 변경된 overtimeRates, allowances, familyAllowance, longServicePay 등.
4. **data/calc-registry.json** expected 값 동기화.

### Step C: 자동 검증

```bash
npm test
```

Expected: 모든 테스트 PASS. drift 감지 시 해당 테스트 실패 메시지로 어느 수치가 불일치인지 표시.

### Step D: 버전드 SoT (선택 — 역사적 계산 필요 시)

**질문: 퇴직자가 2025년 당시 기준으로 계산을 원하면?**

현재 구조는 "최신 DATA" 만 가짐. 해결 옵션:

- **옵션 1 (지금, 간단)**: `DATA_STATIC` 만 최신 유지. 과거 계산은 과거 커밋 (git 태그) 으로 되돌아가 실행.
- **옵션 2 (중기, Plan I)**: `data/pay_rules_YYYY.json` 연도별 분리. `calcSeveranceFullPay` 같은 과거 기준 계산 함수가 `year` 인자로 해당 연도 룰 선택.
- **옵션 3 (장기)**: 효력 발생일별 룰 선택 로직 내장.

2027 단협 개정 시점의 권장: 옵션 1 로 충분. 퇴직 계산 같은 과거 기준이 실제 문제되면 옵션 2 로 전환.

### Step E: 문서화

- `docs/architecture/sot-drift-risk.md` 에 "YYYY 단협 개정" 항목 추가 (날짜, 주요 변경 수치).
- `calc-registry.json` 의 `generated_from` 과 `version` 필드 업데이트.
- CHANGELOG 혹은 릴리스 노트 작성.

## 3. 체크리스트 (2027.md 예시)

- [ ] `data/full_union_regulation_2027.md` 생성 (사용자 승인)
- [ ] `data/hospital_guidelines_2027.md` 축약본 작성 (또는 기존 업데이트)
- [ ] `data/union_regulation_2027.json` 구조화
- [ ] `data.js DATA_STATIC` 값 갱신 (payTables / allowances / rates 등)
- [ ] `data/calc-registry.json` 의 `version` → "2027.XX" + expected 값 동기화
- [ ] `npm test` 모두 PASS
- [ ] `regulation.js:257` fetch URL 이 2027 JSON 을 가리키는지 확인 (파일명 패턴 변경 시)
- [ ] `docs/architecture/sot-drift-risk.md` 개정 이력 추가
- [ ] PR 생성 — 리뷰어가 단협 전문 ↔ registry 값 spot check
- [ ] 2026.md 와 diff 내는 툴/스크립트가 있으면 실행 (없으면 개정 요약 수동 작성)

## 4. 자동화 아이디어 (미래 개선)

- **스크립트 1**: `scripts/validate-registry.js` — registry.json 의 각 entry 의 `article` 필드를 full_union.md 내 해당 조항 위치로 매핑 + 정규식으로 수치 추출 후 dual-check.
- **스크립트 2**: `scripts/extract-data-from-md.js` — full_union.md 특정 섹션에서 숫자 자동 추출해 data.js 비교 리포트 출력.
- **CI 후크**: Vitest 에 full_union.md 파싱 assert 추가 → 개정 시 어느 수치가 drift 인지 자동 리스팅.

이 자동화는 **Plan J** (단협 개정 자동 검증) 로 별도 플랜 필요. 현재는 사람이 체크리스트로 수동 검증.

## 5. 실패 시나리오

- **"registry 테스트 실패 — DATA 가 달라짐":** 개정 전후 diff 에서 의도된 변경이면 registry 업데이트. 의도치 않은 변경이면 DATA 로 복구.
- **"regulation.html 이 여전히 2026 조항 표시":** `union_regulation_2027.json` 이 `union_regulation_2026.json` 을 완전 대체했는지 확인. regulation.js:257 fetch 경로 점검.
- **"퇴직 계산이 새 기준으로 적용됨":** 의도된 동작이면 OK. 과거 기준 필요하면 Step D 의 옵션 2 고려.

## 6. 담당자 인수인계 체크

- 이 runbook 의 "최근 갱신 일자" 를 매년 업데이트.
- 담당자 교체 시 다음 세 문서를 함께 인계:
  - `docs/architecture/README.md` (전체 구조 index)
  - `docs/architecture/sot-drift-risk.md` (드리프트 리스크)
  - 본 runbook (개정 절차)
````

- [ ] **Step 2: README.md 에 runbook 링크 추가**

`docs/architecture/README.md` 의 "문서 목록" 표에 행 추가:

```markdown
| 6 | [sot-update-runbook.md](./sot-update-runbook.md) | 단협 개정 시 5단계 동기화 절차 (2027.md 경로 등) |
```

- [ ] **Step 3: 커밋**

```bash
git add docs/architecture/sot-update-runbook.md docs/architecture/README.md
git commit -m "docs(arch): sot-update-runbook.md — 단협 개정 운영 매뉴얼 (2027.md 경로)

Step A (전문 수신) → B (파생 3종 갱신) → C (Vitest 자동 검증) → D (버전드 SoT 옵션) → E (문서화).
사용자 질문 '2027 들어왔을 때 어떻게?' 의 공식 답변."
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
- Bug #7 (Task 6 — handbook canonical 확정 7일) ✅
- Bug #8 + #5 (Task 7 — calcNursePay 삭제로 동시 해소) ✅
- Bug #6 (Task 8) ✅
- Bug #13 신규 (Task 8.5 — 배우자 출산 10일) ✅
- Plan D 보정 (Task 8.7) ✅
- SoT 운영 매뉴얼 (Task 8.8) ✅
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
- Task 6 (장기재직 휴가 — handbook 기준 7일 확정): 10분
- Task 7 (dead exports): 15분 (5개 함수 + registry)
- Task 8 (recoveryDay 시설직 분기): 25분 (로직 + 테스트)
- Task 8.5 (Bug #13 배우자 출산): 10분
- Task 8.7 (Plan D 문서 보정): 15분
- Task 8.8 (SoT 운영 매뉴얼): 25분 (runbook 작성)
- Task 9 (merge): 10분

**총 약 2.5~3시간**.

---

## Plan F 이후

- Plan G: Bug #10, #11 (이벤트 시스템 + 통합 e2e 테스트 — 사용자 "연동 안 됨" 체감 원인 해소)
- 별도 판단: Bug #9 (leaveRecords 키 격리 유지 vs 변경), Bug #12 (급여명세서 체인 dedup)
- 이연: Plan E2 (DATA_STATIC → JSON 분리), Plan H (미검증 페이지)
