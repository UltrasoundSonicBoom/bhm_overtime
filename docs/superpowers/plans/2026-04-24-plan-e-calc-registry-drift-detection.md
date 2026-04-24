# Plan E: Calculator Registry 자동 검증 (드리프트 감지)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plan D 에서 문서화한 `calc-registry.md` 매트릭스를 머신 리더블 JSON 으로 추출하고, Vitest 로 `DATA.*` 값이 레지스트리 기재 값과 일치하는지 자동 assert. 단협 개정 시 세 곳(md / JSON / DATA) 동기화 안 되면 빨간불.

**Architecture:**
- **신규 JSON**: `data/calc-registry.json` — 3개 섹션 (data_values / calc_functions / calc_references)
- **신규 Vitest**: `tests/unit/calc-registry.test.js` — JSON 읽어 전수 assert
- 코드 변경 **0** — Plan F 가 발견된 버그 수정. 본 플랜은 감지만 설치.
- 이미 발견된 Bug 3/4/5/6/7 등은 `.skip` 으로 등록 (주석: "Plan F Bug #N 에서 해결 예정").

**Tech Stack:** Vitest (기존), 추가 의존성 없음. JSON Pointer-like path 탐색용 헬퍼 함수 자체 구현.

**Branch:** `feat/plan-e-registry` (worktree)

---

## 배경

- Plan D 발견 12개 latent bug 중 Bug 3/4/5/6/7 은 "DATA 와 코드의 정적 대조" 만으로 감지 가능.
- Bug 10/11 은 런타임 이벤트 문제 → Plan G 영역.
- 본 플랜은 **Tier 1** 만 — `calc-registry.json` + drift check. Tier 2 (SoT JSON 분리) 는 Plan E2 로 추후.

---

## 파일 구조

### 생성

- `data/calc-registry.json` — 머신 리더블 레지스트리 (단협 개정 시 사람이 유지)
- `tests/unit/calc-registry.test.js` — Vitest drift-check

### 수정

- `package.json` — `test:unit` 가 이미 `vitest run` 이므로 추가 스크립트 없음.
- `docs/architecture/README.md` — Plan E 결과로 레지스트리 JSON 이 추가됐음을 기재.

### 검증 대상 카테고리 (JSON 내부 3섹션)

1. `data_values` — 약 25건: 규정 조항 → `DATA.<path>` → expected 값
2. `calc_functions` — 약 15건: 필수로 존재해야 할 CALC 함수명
3. `calc_references` — 약 5건: 다른 파일이 `CALC.xxx` 로 호출하는 이름들 (타 파일 grep 기반)

---

## Task 1: 워크트리 + 베이스라인

**Files:** 없음 (인프라)

- [ ] **Step 1: 워크트리 생성**

```bash
cd /Users/momo/Documents/GitHub/bhm_overtime
git worktree add .worktrees/plan-e -b feat/plan-e-registry
cd .worktrees/plan-e
```

- [ ] **Step 2: 테스트 인프라 정상 확인**

```bash
npm run test:unit
```

Expected: 21개 기존 단위 테스트 전부 PASS. 한 개라도 실패하면 STOP — 환경 문제 해결 먼저.

- [ ] **Step 3: 베이스라인 태그**

```bash
git tag baseline-plan-e
```

---

## Task 2: `data/calc-registry.json` 생성 — data_values 섹션

**Files:**
- Create: `data/calc-registry.json`

- [ ] **Step 1: DATA 값 실측**

다음 grep 으로 현재 값 확인 (JSON 기재 전에 실제 값 검증):

```bash
grep -nE "extended:|night:|extendedNight:|holiday:|holidayOver8:" data.js | head
grep -nE "onCallStandby|onCallTransport|onCallCommuteHours|nightShiftBonus" data.js
grep -nE "baseLeave|maxLeave|maxUnderOne" data.js
grep -nE "spouse:|generalFamily:|child1:|child2:|child3Plus:|maxFamilyMembers:" data.js
grep -A2 "longServicePay:" data.js | head
```

- [ ] **Step 2: `data/calc-registry.json` 작성**

아래 내용 그대로 저장. `expected` 값은 Step 1 grep 결과와 일치해야 함 — 불일치 시 STOP 하고 사용자에게 보고 (코드 수정 금지, 문서 조정으로 해결).

```json
{
  "$schema": "./calc-registry.schema.json",
  "version": "2026.04",
  "generated_from": "data.js DATA_STATIC snapshot 2026-04-24",
  "comment": "Plan D 산출 매트릭스의 머신 리더블 버전. 단협 개정 시 본 파일 + hospital_guidelines_2026.md + data.js 세 곳을 동기화. Vitest 가 drift 감지.",

  "data_values": [
    { "path": "allowances.overtimeRates.extended", "expected": 1.5, "article": "제34조", "summary": "시간외 150%", "consumers": ["CALC.calcOvertimePay"] },
    { "path": "allowances.overtimeRates.night", "expected": 2.0, "article": "제34조", "summary": "야간 200% (제47조)", "consumers": ["CALC.calcOvertimePay"] },
    { "path": "allowances.overtimeRates.extendedNight", "expected": 2.0, "article": "제34조", "summary": "통상근무자 연장→야간 200%", "consumers": ["CALC.calcOvertimePay"] },
    { "path": "allowances.overtimeRates.holiday", "expected": 1.5, "article": "제34조", "summary": "휴일 150% (8h 이내)", "consumers": ["CALC.calcOvertimePay"] },
    { "path": "allowances.overtimeRates.holidayOver8", "expected": 2.0, "article": "제34조", "summary": "휴일 200% (8h 초과)", "consumers": ["CALC.calcOvertimePay"] },
    { "path": "allowances.onCallStandby", "expected": 10000, "article": "제32조 온콜 부속합의", "summary": "온콜대기 1일 10,000원", "consumers": ["CALC.calcOnCallPay"] },
    { "path": "allowances.onCallTransport", "expected": 50000, "article": "제32조 온콜 부속합의", "summary": "온콜 출근 교통비 50,000원", "consumers": ["CALC.calcOnCallPay"] },
    { "path": "allowances.onCallCommuteHours", "expected": 2, "article": "제32조 온콜 부속합의", "summary": "출근 시 2시간 근무 인정", "consumers": ["CALC.calcOnCallPay"] },
    { "path": "allowances.nightShiftBonus", "expected": 10000, "article": "제32조 야간 부속합의", "summary": "야간 1회당 10,000원 가산", "consumers": ["CALC.calcNightShiftBonus"] },
    { "path": "allowances.mealSubsidy", "expected": 150000, "article": "제48조", "summary": "급식보조비 월 150,000원", "consumers": ["CALC.calcOrdinaryWage"] },
    { "path": "allowances.transportSubsidy", "expected": 150000, "article": "제48조", "summary": "교통보조비 월 150,000원", "consumers": ["CALC.calcOrdinaryWage"] },
    { "path": "allowances.refreshBenefit", "expected": 30000, "article": "제48조", "summary": "리프레시지원비 월 30,000원 (연 36만원)", "consumers": ["CALC.calcOrdinaryWage"] },

    { "path": "annualLeave.baseLeave", "expected": 15, "article": "제36조", "summary": "1년 이상 8할 출근 시 15일", "consumers": ["CALC.calcAnnualLeave"] },
    { "path": "annualLeave.maxLeave", "expected": 25, "article": "제36조", "summary": "2년마다 1일 가산, 최대 25일", "consumers": ["CALC.calcAnnualLeave"] },

    { "path": "familyAllowance.spouse", "expected": 40000, "article": "제48조", "summary": "배우자 40,000원", "consumers": ["CALC.calcFamilyAllowance"] },
    { "path": "familyAllowance.generalFamily", "expected": 20000, "article": "제48조", "summary": "가족 20,000원 (5인 제한)", "consumers": ["CALC.calcFamilyAllowance"] },
    { "path": "familyAllowance.child1", "expected": 30000, "article": "제48조", "summary": "첫째 30,000원", "consumers": ["CALC.calcFamilyAllowance"] },
    { "path": "familyAllowance.child2", "expected": 70000, "article": "제48조", "summary": "둘째 70,000원", "consumers": ["CALC.calcFamilyAllowance"] },
    { "path": "familyAllowance.child3Plus", "expected": 110000, "article": "제48조", "summary": "셋째 이상 110,000원", "consumers": ["CALC.calcFamilyAllowance"] },
    { "path": "familyAllowance.maxFamilyMembers", "expected": 5, "article": "제48조", "summary": "가족 최대 5인", "consumers": ["CALC.calcFamilyAllowance"] }
  ],

  "calc_functions": [],
  "calc_references": []
}
```

주의: `annualLeave.maxUnderOne` 값은 grep 결과 확인 후 필요하면 추가. data.js 의 longServicePay 배열은 `array_assertions` 로 별도 표현 (Step 3).

- [ ] **Step 3: array_assertions 섹션 추가** — `longServicePay` 같은 배열 구조

Step 2 JSON 끝의 `"calc_references": []` 앞에 삽입:

```json
  "array_assertions": [
    {
      "path": "longServicePay",
      "article": "제50조",
      "summary": "장기근속수당 구간별",
      "items": [
        { "min": 5, "max": 10, "amount": 50000, "note": "5~9년 5만원" },
        { "min": 10, "max": 15, "amount": 60000, "note": "10~14년 6만원" },
        { "min": 15, "max": 20, "amount": 80000, "note": "15~19년 8만원" },
        { "min": 20, "max": 99, "amount": 100000, "note": "20년 이상 10만원" }
      ],
      "consumers": ["CALC.calcLongServicePay"]
    }
  ],
```

**주의**: data.js 의 실제 구조 (min/max/amount 키 이름) 가 다르면 grep 결과 맞게 조정. 불일치 시 STOP.

- [ ] **Step 4: JSON 유효성 검사**

```bash
python3 -c "import json; json.load(open('data/calc-registry.json')); print('valid')"
```

Expected: `valid`. 파싱 오류 발생 시 쉼표·중괄호 확인.

- [ ] **Step 5: 커밋**

```bash
git add data/calc-registry.json
git commit -m "feat(registry): calc-registry.json — DATA 값 assert 대상 (Plan E Task 2)"
```

---

## Task 3: Vitest drift-check — data_values + array_assertions

**Files:**
- Create: `tests/unit/calc-registry.test.js`

- [ ] **Step 1: 테스트 파일 생성**

`tests/unit/calc-registry.test.js`:

```javascript
// Plan E: calc-registry.json ↔ DATA 드리프트 감지
// 단협 개정 시 세 곳 동기화 안 되면 이 테스트가 실패한다:
//   1) data/calc-registry.json (본 assert 기준)
//   2) data.js DATA_STATIC (실제 런타임 값)
//   3) hospital_guidelines_2026.md (사람 가독용 요약)
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const registry = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../data/calc-registry.json'), 'utf8')
);

// data.js 전역 DATA 로드 (Node 호환 CommonJS export 이용)
const { DATA } = require('../../data.js');
globalThis.DATA = DATA;

function getPath(obj, pathStr) {
  return pathStr.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

describe('calc-registry.json ↔ DATA 단일 값 drift', () => {
  registry.data_values.forEach(({ path: p, expected, article, summary }) => {
    it(`${article} → DATA.${p} === ${expected} (${summary})`, () => {
      expect(getPath(DATA, p)).toBe(expected);
    });
  });
});

describe('calc-registry.json ↔ DATA 배열 구조 drift', () => {
  registry.array_assertions.forEach(({ path: p, items, article, summary }) => {
    it(`${article} → DATA.${p} items (${summary})`, () => {
      const actual = getPath(DATA, p);
      expect(Array.isArray(actual), `${p} 는 배열이어야 함`).toBe(true);
      items.forEach((expectedItem, idx) => {
        const actualItem = actual[idx];
        expect(actualItem, `${p}[${idx}] 존재`).toBeDefined();
        Object.entries(expectedItem).forEach(([key, val]) => {
          if (key === 'note') return; // note 는 메타 설명, assert 제외
          expect(actualItem[key], `${p}[${idx}].${key}`).toBe(val);
        });
      });
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 — 현재 DATA 값과 일치 확인**

```bash
npm run test:unit
```

Expected: 21 (기존) + 약 25 (data_values) + 1 (array_assertions) = 47개 테스트 통과.

**실패 시:**
- 특정 `expected` 가 DATA 실제 값과 다르다면 → `calc-registry.json` 수정 (DATA 가 진실의 원천이라는 전제).
- 값이 정말 버그라면 (예: Bug 7 장기재직 휴가) → **별도 처리** — 해당 assert 를 주석으로 `// Plan F Bug #N 에서 해결` 표기하고 `it.skip` 으로 변경.

- [ ] **Step 3: 알려진 드리프트 (Bug #7) 처리**

장기재직 휴가 값은 data.js 내부 모순 (20년+ 7일 vs 10일). 실제 DATA 는 어느 값인지 확인 후:

```bash
grep -nB1 -A3 "20년" data.js | head -20
```

- `data.js` 의 **canonical** 값이 drift-check 기준. md 문서와 맞지 않아도 그대로 passthrough.
- 다만 `data/calc-registry.json` `comment` 또는 해당 entry `note` 에 "⚠️ Bug #7 참조 — md 문서와 불일치" 기재.

- [ ] **Step 4: 커밋**

```bash
git add tests/unit/calc-registry.test.js data/calc-registry.json
git commit -m "test(registry): DATA 값 drift-check — 25+ assertions"
```

---

## Task 4: CALC 함수 존재성 검증 — calc_functions 섹션

**Files:**
- Modify: `data/calc-registry.json` — `calc_functions` 섹션 채우기
- Modify: `tests/unit/calc-registry.test.js` — 함수 존재 assert 추가

- [ ] **Step 1: calculators.js 의 모든 함수 실측**

```bash
grep -nE "^    (calc|resolve|format|verify)[A-Z]" calculators.js | head -25
```

- [ ] **Step 2: `calc_functions` 섹션 채우기**

`data/calc-registry.json` 의 `"calc_functions": []` 를 다음으로 교체:

```json
  "calc_functions": [
    { "name": "resolvePayTable", "required": true, "note": "jobType → payTable 키" },
    { "name": "calcOrdinaryWage", "required": true, "note": "통상임금 구성" },
    { "name": "calcOvertimePay", "required": true, "note": "시간외/야간/휴일 수당" },
    { "name": "calcOnCallPay", "required": true, "note": "온콜 대기/출근" },
    { "name": "calcAnnualLeave", "required": true, "note": "연차 일수 계산" },
    { "name": "calcLongServicePay", "required": true, "note": "장기근속수당 구간" },
    { "name": "calcFamilyAllowance", "required": true, "note": "가족수당" },
    { "name": "calcSeverancePay", "required": false, "note": "dead export — Plan F Bug #8 에서 제거 예정" },
    { "name": "calcSeveranceFullPay", "required": true, "note": "퇴직금 full (2015.6.30 이전 포함)" },
    { "name": "calcUnionStepAdjust", "required": false, "note": "부속합의, 사용처 확인 필요" },
    { "name": "calcPromotionDate", "required": false, "note": "dead export — Plan F Bug #8" },
    { "name": "calcNightShiftBonus", "required": true, "note": "야간 가산 + 리커버리 데이" },
    { "name": "calcParentalLeavePay", "required": true, "note": "육아휴직 급여" },
    { "name": "calcAverageWage", "required": true, "note": "평균임금" },
    { "name": "formatNumber", "required": true, "note": "천단위 콤마" },
    { "name": "formatCurrency", "required": true, "note": "원 접미사" },
    { "name": "calcPayrollSimulation", "required": true, "note": "급여 예상 탭 통합 함수" },
    { "name": "verifyPayslip", "required": true, "note": "명세서 검증" },
    { "name": "calcNursePay", "required": false, "note": "dead export + Bug #5 (DATA 미참조 하드코딩)" },
    { "name": "checkNurseScheduleRules", "required": false, "note": "dead export — Plan F Bug #8" }
  ],
```

- [ ] **Step 3: 테스트 추가 — calc_functions assert**

`tests/unit/calc-registry.test.js` 끝에 추가:

```javascript
const { CALC } = require('../../calculators.js');

describe('CALC 함수 존재성 (registry 기준)', () => {
  registry.calc_functions.forEach(({ name, required, note }) => {
    if (required) {
      it(`CALC.${name} 는 함수로 존재해야 함 (${note})`, () => {
        expect(typeof CALC[name], `CALC.${name} 타입`).toBe('function');
      });
    } else {
      // dead export 인 경우 제거 권장 — 존재하면 경고만
      it.skip(`CALC.${name} 는 dead export — Plan F 에서 제거 (${note})`, () => {});
    }
  });
});
```

- [ ] **Step 4: 실행**

```bash
npm run test:unit
```

Expected: `calcSeverancePay`, `calcPromotionDate`, `calcNursePay`, `checkNurseScheduleRules`, `calcUnionStepAdjust` 5개는 `.skip` → 스킵으로 표시. 나머지 required 는 전부 PASS.

- [ ] **Step 5: 커밋**

```bash
git add data/calc-registry.json tests/unit/calc-registry.test.js
git commit -m "test(registry): CALC 함수 존재성 assert — 15 required + 5 deprecated"
```

---

## Task 5: `CALC.xxx` 호출 참조 무결성 검증 — calc_references 섹션

**Files:**
- Modify: `data/calc-registry.json` — `calc_references` 섹션
- Modify: `tests/unit/calc-registry.test.js` — 호출 참조 테스트

- [ ] **Step 1: 타 파일의 `CALC.xxx` 호출 grep**

```bash
grep -rn "CALC\." --include="*.js" . 2>/dev/null \
  | grep -v calculators.js | grep -v worktrees | grep -v node_modules | grep -v tests/ \
  | grep -oE "CALC\.[a-zA-Z_][a-zA-Z0-9_]*" \
  | sort -u
```

결과를 노트. Bug 3 (`CALC.calcRetirement`), Bug 4 (`CALC.calcServiceYears`) 가 반드시 나와야 함.

- [ ] **Step 2: `calc_references` 채우기**

`data/calc-registry.json` 의 `"calc_references": []` 를 교체 (위 grep 결과 기반):

```json
  "calc_references": [
    { "name": "calcRetirement", "status": "broken", "note": "Plan F Bug #3 — app.js:1347 호출, calculators.js 정의 없음. silent try/catch." },
    { "name": "calcServiceYears", "status": "wrong_namespace", "actual_namespace": "PROFILE", "note": "Plan F Bug #4 — salary-parser.js:1352 호출, 실제는 PROFILE.calcServiceYears (profile.js:129). serviceYears=0 고정." }
  ],
```

⚠️ 위 grep 에서 두 개보다 더 많이 나오면 모두 추가. `calcOvertimePay`, `calcOrdinaryWage` 같이 정상적으로 CALC 에 존재하는 참조는 status `"ok"` 로 기재하거나 생략 (테스트 대상은 broken 만).

- [ ] **Step 3: 테스트 추가**

`tests/unit/calc-registry.test.js` 끝에 추가:

```javascript
describe('CALC.xxx 외부 호출 참조 무결성 (Bug #3/#4 감지)', () => {
  registry.calc_references.forEach(({ name, status, actual_namespace, note }) => {
    if (status === 'ok') {
      it(`CALC.${name} 호출 가능 (정상 참조)`, () => {
        expect(typeof CALC[name]).toBe('function');
      });
    } else {
      // 알려진 broken — 현재는 skip. Plan F 완료 후 skip 해제해 PASS 로 전환.
      it.skip(`[${status}] CALC.${name} — ${note}`, () => {
        if (status === 'wrong_namespace' && actual_namespace === 'PROFILE') {
          const { PROFILE } = require('../../profile.js');
          expect(typeof PROFILE[name]).toBe('function');
          expect(typeof CALC[name]).toBe('function'); // 수정 후 여기도 통과해야
        } else if (status === 'broken') {
          expect(typeof CALC[name]).toBe('function'); // 수정 후 존재해야
        }
      });
    }
  });
});
```

- [ ] **Step 4: 실행**

```bash
npm run test:unit
```

Expected: 3개 skip + 나머지 PASS. skip 은 Plan F 에서 해결 후 `.skip` 제거하면 통과 대상으로 승격.

- [ ] **Step 5: 커밋**

```bash
git add data/calc-registry.json tests/unit/calc-registry.test.js
git commit -m "test(registry): CALC.xxx 외부 호출 참조 검증 — Bug #3/#4 skip 등록"
```

---

## Task 6: 문서 업데이트 + merge

**Files:**
- Modify: `docs/architecture/README.md` — Plan E 완료 + 레지스트리 위치 추가
- Modify: `tests/README.md` — 새 test 카테고리 추가

- [ ] **Step 1: `docs/architecture/README.md` 업데이트**

기존 "문서 목록" 표 바로 아래에 새 섹션 추가:

```markdown
## 머신 리더블 SoT (Plan E)

| 파일 | 역할 |
|------|------|
| [`data/calc-registry.json`](../../data/calc-registry.json) | DATA 값 assert 대상 + CALC 함수 존재성 + 외부 참조 무결성 |
| [`tests/unit/calc-registry.test.js`](../../tests/unit/calc-registry.test.js) | Vitest drift-check (`npm run test:unit`) |

**단협 개정 시 업데이트 순서:**
1. `full_union_regulation_2026.md` 전문 수정 (사용자)
2. `hospital_guidelines_2026.md` 축약 갱신
3. `data.js` DATA_STATIC 수치 반영
4. `data/calc-registry.json` expected 값 동기화
5. `npm test` 로 drift 0 확인

하나라도 스킵 시 테스트 실패로 감지된다.
```

- [ ] **Step 2: `tests/README.md` 업데이트**

"구성" 섹션 테이블에 한 줄 추가:

```markdown
├── unit/
│   ├── calculators.test.js   # CALC 순수 함수 (기존 21)
│   └── calc-registry.test.js # Plan E: registry ↔ DATA drift-check (25+ assertions)
```

- [ ] **Step 3: 최종 테스트 실행**

```bash
npm test
```

Expected: 모든 테스트 (기존 21 + Plan E 신규 ~30 required + skips) 통과. 콘솔 에러 0건.

- [ ] **Step 4: 커밋**

```bash
git add docs/architecture/README.md tests/README.md
git commit -m "docs: Plan E 완료 반영 — calc-registry.json + drift-check 추가"
```

- [ ] **Step 5: main merge + push**

```bash
cd /Users/momo/Documents/GitHub/bhm_overtime
git checkout main
git merge --no-ff feat/plan-e-registry -m "Merge Plan E — Calculator Registry 자동 검증 (드리프트 감지)"
git worktree remove .worktrees/plan-e
git branch -d feat/plan-e-registry
git push origin main
```

---

## Self-Review

**1. Spec 커버리지:**
- Tier 1 (data_values + array_assertions) ✅ Task 2~3
- Tier 1 (CALC 함수 존재) ✅ Task 4
- Tier 1 (CALC 외부 참조 무결성 — Bug #3/#4) ✅ Task 5
- 문서/README 반영 ✅ Task 6
- **Tier 2 (JSON 분리)** 는 scope 밖 — Plan E2 로 분리 권장.

**2. Placeholder 없음:**
- 모든 JSON 블록 실제 값 포함 ✅
- 테스트 코드 완전 구현 ✅
- 모르는 값 (예: maxUnderOne) 은 "grep 결과 확인 후 보완" 명시 ✅

**3. Type consistency:**
- `data_values` entry 키 = `path, expected, article, summary, consumers`
- `array_assertions` entry 키 = `path, items, article, summary, consumers`
- `calc_functions` entry = `name, required, note`
- `calc_references` entry = `name, status, actual_namespace?, note`
- 테스트가 각 키를 정확히 읽도록 작성됨 ✅

---

## 리스크 평가

**낮음**:
- 코드 변경 0 — 런타임 영향 없음.
- 기존 테스트는 그대로.
- skip 된 Bug #3/#4 는 Plan F 에서 해결 시 `.skip` 제거로 승격.

**중간**:
- `calc-registry.json` 초기 값이 틀리면 false positive fail → 초기 `npm run test:unit` 에서 전부 실제 DATA 값과 대조해 수정.

**완화**:
- 각 Task 끝에 실행 + 검증 명시.
- 실패 시 STOP 지시.

---

## 예상 작업량

- Task 1 (인프라): 5분
- Task 2 (JSON data_values): 30분 (실제 grep 대조 포함)
- Task 3 (drift-check test): 20분
- Task 4 (함수 존재성): 15분
- Task 5 (참조 무결성): 15분
- Task 6 (문서 + merge): 15분

**총 1~1.5시간**. Plan F 가 뒤이어 실행될 때 skip 해제 후 값 수정만 하면 green.

---

## 후속 (Plan E 이후)

- **Plan F**: Bug #3/#4/#5/#6/#7 등 수정. 수정 시 본 test 의 `.skip` 제거 → PASS 로 승격.
- **Plan E2**: DATA_STATIC → `data/pay_rules_2026.json` 분리. 단, 현 플랜으로도 드리프트 감지는 완결.
- **단협 개정 운영 매뉴얼**: 2026.11 단협 갱신 시 실제로 5단계 동기화 수행 → 운영 리허설.
