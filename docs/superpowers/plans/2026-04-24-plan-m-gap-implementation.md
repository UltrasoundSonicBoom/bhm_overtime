# Plan M: 규정 커버리지 누락 계산기 구현

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plan L Tier 4 감사(244행)에서 도출된 ❌ 누락 56건 + 🟡 부분 56건 중 사용자 가치가 있는 항목을 우선순위대로 구현해 **strict coverage 41% → 70%+ 로 끌어올린다**.

**Architecture:**
- 기존 `calculators.js CALC` 객체에 메서드 추가 (Phase 1/2 대부분).
- 별도 순수 함수가 필요한 경우 `calculators.js` 내 신규 export.
- UI 진입점은 각 기능 특성에 맞는 탭 (tab-overtime/tab-payroll/tab-leave/tab-browse) 의 기존 카드 슬롯 재활용.
- `calc-registry.json` 에 새 항목 추가 → Vitest drift 자동 감지로 유지.
- 신규 상수는 `data.js DATA_STATIC` 아래 계열별 그룹 (allowances/leaveQuotas/ceremonies 등) 에 편입.

**Tech Stack:** Vanilla JS (ES6) · Vitest 4.1.5 · Playwright MCP (UI 스모크). 새 런타임 의존성 0.

**Branch:** 각 Phase 당 단일 브랜치 (`feat/plan-m-phase-1`, `feat/plan-m-phase-2`, `feat/plan-m-phase-3`). 워크트리 필수.

---

## 배경 — Plan L T4 핵심 발견

- **커버리지:** 전체 244행 / non-N/A 190행 / 완전 구현 78 / 부분 56 / 누락 56.
- **strict coverage 41.1%** — "규정 수치 중 앱이 끝단(UI)까지 완성한 비율".
- **High 우선순위 ❌ 누락 = 0** (Plan A~K 가 핵심 조항은 이미 커버).
- **누락은 모두 Medium/Low** — 조건부 케이스·드문 케이스.
- **선제 해소 (2026-04-24):** 사용자 지시로 2건 drift 해소 — 급식보조비 본문 120k→150k + 배우자 출산 10일→20일. Plan M Phase 1 의 M1-2 / Phase 2 의 M2-3 은 이 단계에서 이미 완료되어 본 Plan 범위에서 제거.

## Phase 구조 (3단계)

| Phase | 범위 | 항목 수 | 총 공수 | 목표 strict 커버리지 |
|-------|------|---------|---------|---------------------|
| **Phase 1 (High)** | 월례/연례 영향 — 공휴일 가산·생리휴가 공제·연차 수당화·명절지원/별정수당·육아휴직 UI | **5** | **11h** | 41% → 52% |
| ~~제외~~ | ~~M1-4 사학연금 2016 컷오프~~ — **사용자 자체 확인 (사학연금 홈페이지)**, 앱 scope 밖 | — | — | — |
| ~~제외~~ | ~~M1-8 복지포인트~~ — **사람마다 달라** 일괄 계산기 부적합 | — | — | — |
| **Phase 2 (Medium)** | 조건부 — 장기재직·휴직 70%·쌍둥이·유산 5구간·온콜 UI·휴업·한도 경고·휴게 변환·진료감면 | 9 | 24h | 55% → 65% |
| **Phase 3 (Low)** | 희귀 — 임금피크·운영기능직 9/7년·보수표 전수·별정수당·예비간호인력·감정노동 | 6 | 21h | 65% → 70%+ |

Phase 간 의존성 최소. 각 Phase 독립 실행 가능.

---

## 파일 구조

### 생성 (예상)

- `tests/unit/plan-m-phase-1.test.js` — Phase 1 신규 계산기 단위 테스트
- `tests/unit/plan-m-phase-2.test.js`
- `tests/unit/plan-m-phase-3.test.js`

### 수정 (예상)

- `calculators.js` — CALC 객체에 신규 메서드 (~8개)
- `data.js DATA_STATIC` — 신규 상수 그룹 (welfarePoints, wagePeakRates, specialAllowances 등)
- `data/calc-registry.json` — 신규 data_values + calc_functions 항목
- `tabs/tab-overtime.html`·`tabs/tab-payroll.html`·`tabs/tab-leave.html` — UI 진입점
- `docs/architecture/regulation-coverage-audit.md` — 구현 완료 행 상태 갱신 (🟡/❌ → ✅)
- `docs/architecture/known-issues.md` — drift 클로즈 (D4~D11 추적)
- `docs/architecture/calc-registry.md` — 신규 함수 매트릭스 행

---

## Task 1: 워크트리 + baseline

**Files:** 없음 (인프라)

- [ ] **Step 1: 워크트리**

```bash
cd /Users/momo/Documents/GitHub/bhm_overtime
git worktree add .worktrees/plan-m-phase-1 -b feat/plan-m-phase-1
cd .worktrees/plan-m-phase-1
npm install
```

- [ ] **Step 2: baseline**

```bash
npm run test:unit 2>&1 | tail -5
# Expected: 66 passed
```

- [ ] **Step 3: tag**

```bash
git tag baseline-plan-m-phase-1
```

---

## Task 2: M1-1 — 공휴일 50% 가산 연동 (제32조(6), D5)

**Files:**
- Modify: `calculators.js` — `CALC.calcOvertimePay` 시그니처 확장
- Modify: `tabs/tab-overtime.html` — 공휴일 입력 분리 토글
- Modify: `data/calc-registry.json` — `overtimeRates.publicHoliday` consumer 연결
- Create/Modify: `tests/unit/plan-m-phase-1.test.js` — 신규 테스트 블록

### 현재 상태

- `DATA.allowances.overtimeRates.publicHoliday = 0.5` 존재 (data.js:169)
- `CALC.calcOvertimePay` 는 `extended` / `night` / `holiday` / `holidayOver8` 만 참조 — publicHoliday 미참조.
- 사용자가 법정공휴일에 근무해도 휴일근무 가산(150%/200%)만 적용되어 추가 50% 가산이 누락.

### 스펙

규정 제32조(6): "법정공휴일에 근무하면 통상임금의 50% 가산금 추가 지급." 휴일근무 가산(150%)과 **별개** — 법정공휴일은 `150% + 50% = 200%` 효과.

- [ ] **Step 1: 실패 테스트 작성**

```js
// tests/unit/plan-m-phase-1.test.js
import { describe, test, expect } from 'vitest';
import { DATA } from '../../data.js';
import { CALC } from '../../calculators.js';

describe('M1-1 publicHoliday 50% 가산', () => {
  test('법정공휴일 근무는 휴일 150% + 공휴일 50% = 200% 적용', () => {
    const hourlyRate = 10000;
    const holidayHours = 8;
    const result = CALC.calcOvertimePay(hourlyRate, 0, 0, holidayHours, false, {
      isPublicHoliday: true  // 신규 옵션
    });
    // 기존 holiday 150% (8h × 10000 × 1.5 = 120,000)
    // 신규 publicHoliday 50% 추가 (8h × 10000 × 0.5 = 40,000)
    // 합 = 160,000
    expect(result.holiday).toBe(160000);
  });

  test('isPublicHoliday false 시 기존 동작 유지', () => {
    const result = CALC.calcOvertimePay(10000, 0, 0, 8, false, { isPublicHoliday: false });
    expect(result.holiday).toBe(120000);
  });
});
```

```bash
npm run test:unit -- plan-m-phase-1 2>&1 | tail -5
# Expected: 2 failing
```

- [ ] **Step 2: 구현**

`calculators.js` 의 `calcOvertimePay` 에 6번째 파라미터 `extras = {}` 추가. `extras.isPublicHoliday === true` 일 때 `holiday` 시간에 `DATA.allowances.overtimeRates.publicHoliday` 만큼 추가 지급.

```js
calcOvertimePay(hourlyRate, extHours = 0, nightHours = 0, holidayHours = 0, isExtendedNight = false, extras = {}) {
  // ... 기존 로직
  let holiday = Math.round(hourlyRate * holidayHours * DATA.allowances.overtimeRates.holiday);
  if (extras.isPublicHoliday && holidayHours > 0) {
    holiday += Math.round(hourlyRate * holidayHours * DATA.allowances.overtimeRates.publicHoliday);
  }
  // ...
}
```

- [ ] **Step 3: 테스트 통과 확인 + UI 토글**

`tab-overtime.html` 의 휴일근무 입력 섹션에 "법정공휴일 여부" 체크박스 추가.

- [ ] **Step 4: registry 등록**

```json
// data/calc-registry.json → data_values 추가
{ "path": "allowances.overtimeRates.publicHoliday", "expected": 0.5, "article": "제32조(6)", "summary": "법정공휴일 50% 추가 가산", "consumers": ["CALC.calcOvertimePay"] }
```

- [ ] **Step 5: 커밋**

```bash
git add calculators.js data.js tabs/tab-overtime.html data/calc-registry.json tests/unit/plan-m-phase-1.test.js
git commit -m "feat(M1-1): 법정공휴일 50% 가산 연동 (제32조(6) D5 해소)"
```

---

## Task 3: M1-3 — 생리휴가 9/10 공제 (제37조, D4)

**Files:**
- Modify: `leave.js` — 공제 계산 9/10 적용
- Create: `tests/unit/plan-m-phase-1.test.js` (기존 파일에 블록 추가)

### 현재 상태

- `leave.js:244~` 주석: "basePay 공제: 기본급 월액 / 30 × 일수 (생리휴가 등)" — 100% 공제.
- 규정 제37조(2026.01~ 시행): 기본급 일액의 **9/10 (90%) 공제**.

### 스펙

```
공제액 = basePay / 30 × useDays × 0.9
```

- [ ] **Step 1: 실패 테스트 작성**

```js
test('M1-3 생리휴가는 기본급 일액의 90% 공제 (2026.01~)', () => {
  const basePay = 3_000_000;
  const useDays = 1;
  // 일액 = 100,000 × 90% = 90,000 공제
  expect(LEAVE.calcMenstrualDeduction(basePay, useDays)).toBe(90000);
});
```

- [ ] **Step 2: leave.js 수정**

기존 공제 로직 찾아 `× 0.9` 또는 `× DATA.leaveQuotas.menstrual.deductRate` 곱. registry 에 `deductRate: 0.9` 추가.

- [ ] **Step 3: 테스트 통과 확인 + 커밋**

```bash
git commit -m "feat(M1-3): 생리휴가 공제율 9/10 적용 (제37조 2026.01~ D4 해소)"
```

---

## Task 4: M1-4 — 사학연금 2016.03.01 컷오프 (제52조(4), D6)

**Files:**
- Modify: `calculators.js` — `calcSeveranceFullPay` cutoff2016 분기 추가
- Modify: `data.js` — `severanceMultipliersPre2016` / `severanceMultipliersPost2016` 배열 (사학연금 적용 여부에 따라)
- Create test

### 현재 상태

- 기존 `calcSeveranceFullPay` 는 cutoff2001 (퇴직금법) / cutoff2015 (지급률표 변경) 분기만.
- 제52조(4) + `<2016.05>`: 2016.03.01 이후 사학연금 가입자는 병원 퇴직금에서 **사학연금 본인부담 역산분 제외**.
- 현재 구현: 사학연금 가입 여부 무시 → 2016.03 이후 가입자 퇴직금 과다 산정.

### 스펙

`calcSeveranceFullPay(avgMonthlyPay, totalYearsInt, hireDateStr, retireDateStr, options = {})` 에 `options.pensionSubscribeDate` 추가. `pensionSubscribeDate >= '2016-03-01'` 인 경우 해당 기간 퇴직금 산정에 사학연금 승계분 차감 공식 적용.

- [ ] **Step 1-5: TDD 루프** (상세는 Phase 1 실행 시 세부)

**핵심 주의:** 사학연금 승계분 계산 공식은 **한국사학진흥재단 공식** 에 따름 — 병원 인사팀 / 법무팀 확인 필요. Plan M 실행 시 재단 공식 문서 확보 선행.

```bash
git commit -m "feat(M1-4): 사학연금 2016.03 컷오프 분리 산정 (제52조(4) D6 해소)"
```

---

## Task 5: M1-5 — 명절지원비·별정수당 35,000원 (<2025.10>)

**Files:**
- Create: `CALC.calcSpecialAllowance` (calculators.js)
- Modify: `data.js` — `specialAllowances` 그룹 신규
- Modify: `tab-payroll.html` — 급여 예상 카드에 명절지원비 4회 반영
- Create test

### 현재 상태

- `<2025.10>` 합의: S1·C1·SC1 이하 직급 2026.01~ 월 35,000원 별정수당.
- 제49조: 설·추석·5월·7월 4회 명절지원비 = (기본급 + 조정급/2) × 50%.
- 현재 구현: 둘 다 없음.

### 스펙

```js
CALC.calcHolidayBonus(baseMonthlyPay, adjustPay = 0) {
  return Math.round((baseMonthlyPay + adjustPay / 2) * 0.5);
}

CALC.calcSpecialAllowance(grade) {
  const lowGrades = ['S1', 'C1', 'SC1', 'A1', 'A2', 'A3'];
  return lowGrades.includes(grade) ? DATA.allowances.specialAllowances.lowGradeBonus : 0;
}
```

- [ ] **Step 1-5: TDD 루프**

```bash
git commit -m "feat(M1-5): 명절지원비 + 별정수당 (<2025.10> 신설)"
```

---

## Task 6: M1-6 — 육아휴직 급여 UI 노출 (제28조(5))

**Files:**
- Modify: `tabs/tab-leave.html` — 육아휴직 카드에 급여 계산 버튼 추가
- Modify: `leave.js` 또는 `payroll.js` — `calcParentalLeavePay` 결과 렌더링 함수

### 현재 상태

- `CALC.calcParentalLeavePay` (calculators.js:432) 존재, 고용보험 3구간(100%/100%/80%) + 상한(250/200/160만) 로직 완료.
- UI 진입점 부재 — 사용자가 계산 결과를 볼 수 없음.

### 스펙

육아휴직 개월 수 입력 → 전체 예상 지급액 + 월별 분포 표.

- [ ] **Step 1-5** — 계산기는 기존 재사용. UI 만 추가. Playwright 스모크로 브라우저 검증.

```bash
git commit -m "feat(M1-6): 육아휴직 급여 계산 UI 노출 (제28조(5))"
```

---

## Task 7: M1-7 — 연차 미사용 수당화 (제36조(4))

**Files:**
- Create: `CALC.calcAnnualLeaveBonus` (calculators.js)
- Modify: `leave.js` 또는 `tab-leave.html` — 잔여 연차 × 일액 자동 표시

### 현재 상태

- 기존 `calcAnnualLeave` 는 **부여 일수만 계산**. 미사용 연차 금전화 없음.
- 규정 제36조(4): 매년 1월 미사용 연차 × 통상임금 일액 지급.

### 스펙

```js
CALC.calcAnnualLeaveBonus(unusedDays, monthlyWage) {
  const dailyWage = Math.round(monthlyWage / DATA.allowances.weeklyHours * 8);
  return Math.round(unusedDays * dailyWage);
}
```

+ 제36조(2) "연차보전수당" (구법 대비 축소분 ÷ 23 × 통상임금 × 150%, 2004.6.30 이전 근무자 한정) 는 Phase 2 로 분리.

- [ ] **Step 1-5: TDD 루프**

```bash
git commit -m "feat(M1-7): 연차 미사용 수당화 계산 (제36조(4))"
```

---

## Task 8: M1-8 — 맞춤형 복지포인트 계산기 (제58조(1)-1)

**Files:**
- Create: `CALC.calcWelfarePoints` (calculators.js)
- Modify: `data.js` — `DATA.welfarePoints` 그룹 (기본/근속/가족 분기 테이블)
- Modify: `tab-payroll.html` — 복지포인트 카드 신규
- Create test

### 현재 상태

- 규정 제58조(1)-1 / `<2017.12>` / `<2020.xx>` 여러 합의로 단계적 조정.
- 현재 기준 (2025~):
  - **기본 포인트:** 700P (1P = 1,000원)
  - **근속 포인트:** 10P × 근속년수 (상한 30만원 = 300P)
  - **가족 포인트:** 배우자 100P / 첫째·둘째 100P / 셋째↑ 200P / 기타 5P × 4인 이내
  - **자녀 학자금 포인트:** 16세↑ 고교·대학 자녀 7년간 120만원/년 (<2017.12>)
  - **출산 축하 포인트:** 첫째 500P / 둘째 1000P / 셋째↑ 2000P
- 계산기·DATA 구조·UI 모두 부재.

### 스펙

```js
CALC.calcWelfarePoints({
  tenureYears,
  hasSpouse = false,
  numChildren = 0,       // 일반 자녀 수 (셋째 이상 별도)
  numThirdPlusChildren = 0,  // 셋째 이상
  numOtherFamily = 0,    // 기타 가족 (부모 등)
  childrenEducation = [], // [{ age, grade }]
  recentBirth = null,    // { order: 1|2|3+ }
}) {
  const { basePoints, tenurePointPerYear, maxTenurePoints, familyPoints } = DATA.welfarePoints;
  const points =
    basePoints +
    Math.min(tenureYears * tenurePointPerYear, maxTenurePoints) +
    (hasSpouse ? familyPoints.spouse : 0) +
    numChildren * familyPoints.childFirstSecond +
    numThirdPlusChildren * familyPoints.childThirdPlus +
    Math.min(numOtherFamily, 4) * familyPoints.other +
    // ... 교육/출산 축하 계산
    0;
  return { points, won: points * 1000 };
}
```

- [ ] **Step 1-5: TDD 루프** — 7~8 테스트 케이스 (기본/근속/가족/교육/출산 조합)

```bash
git commit -m "feat(M1-8): 맞춤형 복지포인트 계산기 (제58조(1)-1 <2017.12>)"
```

---

## Phase 1 마무리

- [ ] **Step 1: Phase 1 전수 테스트**

```bash
npm run test:unit 2>&1 | tail -5
# Expected: 66 + 신규 테스트 (~15) passed
```

- [ ] **Step 2: registry 전체 갱신**

```bash
# data/calc-registry.json 신규 항목 검증
npm run test:unit -- calc-registry 2>&1 | tail -5
```

- [ ] **Step 3: Playwright 스모크**

```bash
npm run test:smoke 2>&1 | tail -5
# Expected: 3 passed (회귀 없음)
```

- [ ] **Step 4: audit 문서 상태 갱신**

`docs/architecture/regulation-coverage-audit.md` 에서 Phase 1 항목 행 상태를 🟡/❌ → ✅ 로 수정.

- [ ] **Step 5: main merge + push**

```bash
cd /Users/momo/Documents/GitHub/bhm_overtime
git checkout main
git merge --no-ff feat/plan-m-phase-1 -m "Merge Plan M Phase 1 — 7 gap items"
git worktree remove .worktrees/plan-m-phase-1
git branch -d feat/plan-m-phase-1
```

---

## Phase 2 — Medium (9항목, 24h)

별도 워크트리 `feat/plan-m-phase-2`.

| # | 항목 | 조항 | 산출물 | 공수 |
|---|------|-------|--------|------|
| M2-1 | 장기재직휴가 5/7일 자동부여 | `<2025.10>` | `calcLongServiceLeave` + DATA 구간 | 2h |
| M2-2 | 질병·공상 휴직 70% 계산 | 제28조(2) | `calcLeaveOfAbsencePay` | 3h |
| M2-4 | 쌍둥이 출산 120일 분기 | 제38조(1) | `ceremony_birth` 플래그 + UI | 2h |
| M2-5 | 유산·사산 5구간 UI | 제38조(2) | `leaveQuotas.miscarriage` + UI | 2h |
| M2-6 | 온콜 입력 UI 명시 | 제32조(9) | tab-overtime 온콜 섹션 | 3h |
| M2-7 | 휴업·유족·장례 보상 | 제57/73조 | 3개 계산기 + 산재 진입점 | 4h |
| M2-8 | 연장근로 한도 경고 | 제34조(1) | tab-overtime 배너 | 2h |
| M2-9 | 휴게 미사용 시간외 변환 | 제33조(2)(4) | `calcOvertimePay` 분기 | 3h |
| M2-10 | 진료비 감면 시뮬레이터 | 제67조 | tab-browse 카드 | 3h |

각 항목 Phase 1 템플릿 동일 (TDD → UI → registry → 커밋).

---

## Phase 3 — Low (6항목, 21h)

별도 워크트리 `feat/plan-m-phase-3`.

| # | 항목 | 조항 | 공수 |
|---|------|-------|------|
| M3-1 | 임금피크제 60% + 운영기능직 최저임금 120% 보호 | 제45조 | 4h |
| M3-2 | 운영기능직 자동승급 9/7년 drift 확인 | `<2008.09>` + `<2026.01>` | 2h (조사) |
| M3-3 | 별첨 보수표 전수 대조 (27직급 × 8호봉) | 별첨 | 5h (값 대조) — Plan L Tier 2 와 결합 |
| M3-4 | 예비간호인력 대체근무가산금 2만/일 | `<2022.12>` | 2h |
| M3-5 | 감정노동 특별휴가 2일 | 제31조의2 `<2020.10>` | 2h |
| M3-6 | 운영기능직 A1→A2 경력 수당 12만/년 | `<2022.01>` | 2h |

---

## Task 9: 최종 통합 + audit 문서 갱신

**Files:**
- Modify: `docs/architecture/regulation-coverage-audit.md` — Phase 1/2/3 완료 후 통계 재계산
- Create: `docs/superpowers/plans/2026-XX-XX-plan-m-retro.md` (옵션)

- [ ] **Step 1: 통계 재계산**

```bash
grep -cE "^\|.*✅ 구현" docs/architecture/regulation-coverage-audit.md
grep -cE "^\|.*🟡 부분" docs/architecture/regulation-coverage-audit.md
grep -cE "^\|.*❌ 누락" docs/architecture/regulation-coverage-audit.md
```

Expected (Plan M 완료 후): ✅ ~155 / 🟡 ~25 / ❌ ~10 / N/A 54 → **strict coverage 81%+**

- [ ] **Step 2: 통계 반영 커밋**

```bash
git commit -m "docs(audit): Plan M 완료 후 커버리지 통계 갱신"
```

---

## Self-Review

**1. Spec 커버리지:**
- Phase 1 의 7항목 모두 Plan L T4 누락/drift 목록에서 유래 ✅
- Phase 2 의 9항목 — M2-3 은 선제 해소되어 제외 ✅
- Phase 3 의 6항목 — 범위 확장용 ✅
- 총 22항목 = 56 누락 중 **22개 해소** + drift 9건 추가 해소 → 사실상 앱이 규정 요소 대부분 커버

**2. Placeholder 없음:**
- 각 Task 는 CALC 함수 시그니처 + 산식 + 등록 경로 명시
- 사학연금 공식은 외부 확인 필요 (재단 문서) — Plan M 실행 시 선행 조사로 명시

**3. Type consistency:**
- `CALC.calc*` 신규 함수 이름 일관 (동사+명사 단수형)
- `DATA.*` 계열별 그룹 (allowances / leaveQuotas / welfarePoints / wagePeakRates / specialAllowances)
- `data/calc-registry.json` 스키마 유지 (path / expected / article / summary / consumers)

---

## 리스크 및 완화

| 리스크 | 완화 |
|-------|------|
| 사학연금 승계분 공식 불명 | Plan M 실행 전 재단 문서 + 병원 인사팀 확인 필수. 미확인 시 M1-4 보류. |
| 복지포인트 가족 포인트 조합 복잡 | 7~8 테스트 케이스로 조합 검증. 단계적 점진 구현. |
| UI 진입점 다수 추가 시 탭 혼잡 | 기존 카드 슬롯 재활용. 신규 탭 추가 금지. |
| 회귀 위험 (overtimePay 시그니처 변경) | 기존 호출 전수 grep 후 옵션 파라미터 호환성 유지 (extras 기본값 `{}`). |
| drift D8 (운영기능직 9/7년) 규정 재해석 필요 | M3-2 로 분리. Phase 1/2 blocker 아님. |

---

## 예상 작업량

- Phase 1: 19h (2~3 sprint days)
- Phase 2: 24h (3 sprint days)
- Phase 3: 21h (2~3 sprint days)

**총 64시간** (약 2주 내 완료 가능, Subagent-Driven 병렬 실행 시 1주 이내).

---

## 후속 (Plan M 이후)

- **Plan N** (선택): Plan L Tier 2 — 별첨 보수표 전수 대조 (27×8 864셀). M3-3 과 결합.
- **Plan O** (선택): Plan L Tier 1 — 남은 수치 drift 전수 정정. Plan M 과정에서 자연 해소된 항목 제외.
- **Plan J** (선택): `full_union ↔ registry` 자동 링크 스크립트 — 향후 단협 개정 시 수동 동기화 부담 최소화.
