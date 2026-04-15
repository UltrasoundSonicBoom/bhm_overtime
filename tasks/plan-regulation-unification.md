# Implementation Plan: 규정 및 계산식 단일화 (Regulation Data Unification)

> Version: 1.1 | Date: 2026-04-12 | Status: Updated — 2중 시스템 구조 반영  
> 선행 조건: 이 플랜은 기존 Track A/B(tasks/plan.md)보다 **먼저** 실행되어야 한다. DB 연결 전에 완료 필수.  
> **2026-04-10 체크포인트 기준**: Track B (Admin API + ops 테이블) 완료. Track A (RAG 145 chunks) 완료.

---

## Overview

현재 `data.js`, `calculators.js`, `retirement-engine.js`, `data/PayrollEngine.js` 등 다수의 파일에 규정 데이터와 계산 공식이 중복·불일치 상태로 존재한다. **각 페이지마다 계산 결과가 달라지는 근본 원인**이다. Supabase DB를 연결하기 전에 이 구조적 문제를 반드시 해결해야 한다.

규정 원문(`data/hospital_guidelines_2026.md`)을 단일 진실 출처(Single Source of Truth)로 삼아, 모든 계산 엔진이 **동일한 데이터와 동일한 공식**을 통해 계산하도록 통일한다.

---

## ⚠️ 2중 규정 시스템 — 핵심 아키텍처 발견 (v1.1 추가)

이 앱에는 **독립적으로 동작하는 두 개의 규정 시스템**이 공존한다. 이것이 페이지마다 계산값이 달라지는 근본 원인이다.

```text
규정 원문
data/hospital_guidelines_2026.md
          │
          ├─── 【프론트엔드 시스템】 ──────────────────────────────
          │    data.js (DATA_STATIC)          ← 실사용자 화면 데이터
          │      └─ calculators.js (CALC)    ← 실사용자 계산 엔진
          │           ├─ app.js              ← 메인 계산기
          │           ├─ payroll.js          ← 급여 계산기
          │           └─ leave.js            ← 휴가 계산기
          │
          └─── 【백엔드 시스템】 ───────────────────────────────────
               content/policies/2026/nurse_regulation.json  ← 기계가독 규정 마스터
                 └─ server/src/services/nurse-regulation.ts ← 서버사이드 계산 엔진
                      ├─ evaluateAllowanceScenario()        ← 수당 시나리오 검증
                      └─ evaluateNurseRegulationScenarios() ← 전체 시나리오 배치 검증
```

### 시스템별 역할과 현재 상태

| 구분 | 프론트엔드 시스템 | 백엔드 시스템 |
|------|----------------|-------------|
| **데이터 소스** | `data.js` DATA_STATIC | `nurse_regulation.json` |
| **계산 엔진** | `calculators.js` (CALC) | `nurse-regulation.ts` |
| **사용처** | 실사용자 화면 (app.js, payroll.js 등) | 간호 스케줄 어드민 (nurse_admin) |
| **장기근속 구조** | ❌ TIER (잘못됨) | ✅ ADDITIVE (올바름) |
| **야간수당 배율** | ✅ 2.0 (제47조) | ⚠️ 1.5 (night_22_to_06_and_holiday — 검증 필요) |
| **리프레시지원비** | ❌ 통상임금 미반영 | ✅ 360,000원/년으로 기록 |
| **데이터 동기화** | ❌ 없음 | ❌ 없음 |

### 통합 전략 (R 시리즈 완료 후)

1. 프론트엔드 시스템을 먼저 수정 (Phase 0~5, 이 플랜의 R 태스크)
2. 백엔드 `nurse_regulation.json`의 불일치 항목 수정 (BUG-N-01)
3. DB 연결 후: `regulation-constants.js` → DB → 양쪽 시스템이 동일한 출처 사용
4. `union_regulation_admin.html` (Phase 6)로 비개발자가 단일 화면에서 양쪽 시스템 모두 갱신

---

## 왜 문제가 발생했는가 — 현재 데이터 흐름

```text
data/hospital_guidelines_2026.md    ← 규정 원문 (인간 가독, 어떤 코드도 참조 안 함)
        │
        ├─ data.js (DATA_STATIC)             ← 실행 앱 데이터 소스
        │       │
        │       └─ calculators.js (CALC)    ← 실행 앱 계산 엔진 (DATA 참조)
        │               │
        │               ├── payroll.js      ← 급여 카드 계산기
        │               ├── app.js          ← 메인 계산기
        │               └── leave.js        ← 휴가 계산기
        │
        ├─ retirement-engine.js             ← 퇴직금 엔진
        │   (DATA 미참조 — 독자적 하드코딩)  ← ⚠️ 이중화 위험
        │
        └─ data/PayrollEngine.js            ← 미사용 프로토타입
            (hospital_rule_master_2026.json  ← ⚠️ 존재하지 않는 파일 참조
             참조, 실행 앱과 미연결)
```

### 문제의 핵심

- 규정이 바뀌어도 **어디를 고쳐야 하는지 알 수 없다**.
- 같은 규정 항목이 **2~3개 파일에 각각 다른 형식으로** 존재한다.
- DB 데이터가 들어와도, 일부 엔진이 하드코딩 값을 쓰면 DB 값이 무시된다.

---

## 백엔드 시스템 전용 불일치 (nurse_regulation.json)

### 🔴 BUG-N-01: 야간수당 배율 불명확 (nurse_regulation.json)

| 항목 | 내용 |
|------|------|
| **파일** | `content/policies/2026/nurse_regulation.json` |
| **현재 값** | `overtime.multipliers.night_22_to_06_and_holiday: 1.5` |
| **규정 근거** | 제47조: 야간가산 200%(2.0), 제34조: 휴일 8h 이내 150%(1.5) |
| **문제** | 야간(2.0)과 휴일(1.5)을 하나의 키로 합쳐 1.5로 기록 — 야간 시나리오에서 오류 가능 |
| **영향** | 백엔드 `evaluateAllowanceScenario()`의 야간 온콜 출근 케이스 |
| **수정 방법** | `night_22_to_06: 2.0`, `holiday_within_8h: 1.5`로 분리 또는 명확화 |

---

### 🟡 BUG-N-02: nurse_regulation.json ↔ data.js 데이터 동기화 없음

| 항목 | 내용 |
|------|------|
| **문제** | 두 시스템에 동일한 규정이 각자 기록되어 있어 한쪽만 수정하면 불일치 발생 |
| **수정 전략** | DB 연결 후: 두 시스템 모두 DB를 단일 출처로 참조 |
| **단기 조치** | R3(장기근속) 수정 시 `nurse_regulation.json`도 동일하게 수정 |

---

## 발견된 불일치 전체 목록

> 규정 원문: `data/hospital_guidelines_2026.md`  
> 심각도: 🔴 버그(계산 오류) | 🟡 아키텍처(이중화) | 🟢 표시(UI 텍스트)

---

### 🔴 BUG-01: 리프레시지원비 통상임금 미포함

| 항목 | 내용 |
|------|------|
| **파일** | `calculators.js` L89 |
| **현재 코드** | `// '리프레시지원비': DATA.allowances.refreshBenefit // 통상임금 제외 확인` |
| **규정 근거** | 별도합의 2024.11: "월 30,000원, 2026.01.01부터 통상임금 산입" |
| **현재 값** | `DATA.allowances.refreshBenefit = 30000` (data.js L147) |
| **영향** | 통상임금 월 30,000원 과소 계산 → 시간외수당 시급 오류 |
| **예시 오류** | M1-S1 시급 약 60원 미만 차이, 월 연장 40시간 기준 약 3,600원 과소지급 |
| **수정 방법** | 주석 해제, FAQ/표시 텍스트와 함께 반영 |

---

### 🔴 BUG-02: 장기근속수당 25년+ 금액 오류

| 항목 | 내용 |
|------|------|
| **파일** | `data.js` L181 |
| **현재 코드** | `{ min: 25, max: 99, amount: 130000 }` |
| **규정 근거** | 제50조: "20년 이상 10만원. 21년 이상 1만 가산, 25년 이상 3만 가산" |
| **올바른 계산** | 100,000(20년+) + 10,000(21년 가산) + 30,000(25년 가산) = **140,000원** |
| **현재 값** | 130,000원 (21년 가산분 10,000원 누락) |
| **영향** | 25년 이상 재직자 장기근속수당 월 10,000원 과소 계산 |

---

### 🔴 BUG-03: 장기근속수당 계산 구조 불일치 (TIER vs ADDITIVE)

| 항목 | 내용 |
|------|------|
| **파일A** | `data.js` L173~182 (TIER 방식 — 연수 범위로 단일 금액 조회) |
| **파일B** | `data/PayrollEngine.js` L92~106 (ADDITIVE 방식 — 임계값 초과 시 합산) |
| **규정 근거** | 제50조: "가산" 표현은 ADDITIVE (기존 금액에 더하는 방식) |
| **올바른 구조** | ADDITIVE: 20년+기준액 + 21년 이상이면 +10,000 + 25년 이상이면 +30,000 |
| **현재 data.js** | TIER 방식으로 구현되어 있어 가산 개념이 왜곡됨 |
| **수정 방법** | data.js longServicePay 구조를 ADDITIVE로 변경 또는 TIER 값을 합계로 수정 |

> **참고**: BUG-02와 BUG-03은 연결된 문제. 구조(BUG-03)를 먼저 결정한 후 값(BUG-02)을 수정.

---

### 🟡 ARCH-01: retirement-engine.js 데이터 이중화

| 항목 | 내용 |
|------|------|
| **파일A** | `retirement-engine.js` L10~37 (SEV_PAY, SEV_MULTI 하드코딩) |
| **파일B** | `data.js` L349~356 (severancePay), L542~561 (severanceMultipliersPre2001) |
| **위험** | data.js 또는 DB 업데이트 시 retirement-engine.js에 미반영 |
| **현재 상태** | 두 파일의 값은 현재 일치하나, 구조적 위험 |
| **조항** | 제52~57조: 퇴직수당 요율표, 2001.08.31 이전 누진배수 |
| **수정 방법** | retirement-engine.js가 `DATA.severancePay`, `DATA.severanceMultipliersPre2001` 참조하도록 변경 |

---

### 🟡 ARCH-02: data/PayrollEngine.js 미연결 프로토타입

| 항목 | 내용 |
|------|------|
| **파일** | `data/PayrollEngine.js` |
| **상태** | `hospital_rule_master_2026.json`을 참조하나 해당 파일이 없음 |
| **실행 앱과 연결** | 없음 — 어떤 HTML/JS도 import 안 함 |
| **위험** | 혼란 유발 (다른 계산 방식이 공존하는 것처럼 보임) |
| **수정 방법** | `data/legacy/` 또는 `data/archive/`로 이동하고 README 주석 추가 |

---

### 🟡 ARCH-03: hourlyRate 반올림 정책 불일치

| 항목 | 내용 |
|------|------|
| **파일A** | `calculators.js` L94: `Math.round(monthlyWage / weeklyHours)` |
| **파일B** | `data/PayrollEngine.js` L158: `Math.floor(ordinaryWageMonthly / 209)` |
| **영향** | 시급에서 발생하는 차이가 시간외수당 계산에 누적됨 |
| **규정 근거** | 제34조: 시급 계산 기준 명시 없음 — 관행적으로 **버림(floor)** 적용 |
| **수정 방법** | 실행 앱(`calculators.js`)의 정책을 `Math.floor`로 통일 |

> **중요**: 이 변경은 시급이 올림에서 버림으로 바뀌는 것이므로 일부 직원 케이스에서 시간외수당이 소폭 감소할 수 있다. 적용 전 경영진 확인 필요.

---

### 🟢 DISPLAY-01: 가계지원비 미지급월 표시 오류

| 항목 | 내용 |
|------|------|
| **파일** | `app.js` L2158 |
| **현재 텍스트** | `"연간 11개월 균등 지급 (1·2·9월 미지급, 단 설/추석월은 지급)"` |
| **올바른 텍스트** | `"연간 11개월 균등 지급 (1·9월은 설/추석 해당월 시 지급, 그 외 미지급)"` |
| **규정 근거** | 별표: 지급월 3,4,5,6,7,8,10,11,12월 + 설/추석 해당 2개월 = 11개월 |
| **실제 계산** | `Math.round(annualFamily / 11)` — 계산 자체는 올바름, 표시만 오류 |
| **문제** | 2월을 미지급월로 잘못 표시 (2월이 설인 해에는 지급됨) |

---

### 🟢 DISPLAY-02: FAQ 가계지원비 설명 vs app.js 표시 불일치

| 항목 | 내용 |
|------|------|
| **파일A** | `data.js` L435 FAQ: "미지급월: 1월, 9월" |
| **파일B** | `app.js` L2158: "1·2·9월 미지급" |
| **올바른 표현** | "미지급 기준월: 1월, 9월 (단, 설/추석 해당 월은 지급)" |

---

### 🔴 BUG-04: 연차 계산 공식 잠재 오류 (검증 필요)

| 항목 | 내용 |
|------|------|
| **파일** | `calculators.js` L193~195 |
| **현재 코드** | `if (diffYears >= 3) { const extra = Math.floor((diffYears - 1) / 2); }` |
| **규정 근거** | 제36조: "2년마다 1일 가산(최대 25일)" |
| **수식 검증** | 3년차 extra = floor((3-1)/2) = 1 → 16일 ✅; 5년차 extra = floor((5-1)/2) = 2 → 17일 ✅ |
| **잠재 문제** | `diffYears`가 `Math.floor(diffDays / 365)` 기반 — 윤년 미보정으로 경계값에서 오류 가능 |
| **수정 방법** | 윤년 보정 포함한 정확한 연수 계산으로 교체 |

---

### 🔴 BUG-05: 군복무수당 통상임금 산입 시 월할 계산 불일치

| 항목 | 내용 |
|------|------|
| **파일** | `calculators.js` L49~52 |
| **현재 코드** | `Math.round(DATA.allowances.militaryService * Math.floor(militaryMonths) / 24)` |
| **규정 근거** | 별표: "군복무수당 월 45,000원(월할 계산, 2년 기준)" |
| **DATA 값** | `militaryService: 45000` (data.js L150) |
| **현재 산식** | 45,000 × 실복무개월 / 24 — 월할 계산 맞음 |
| **확인 사항** | 입력 없을 경우 기본 24개월 적용 — 규정상 최대 2년(24개월) 지원 맞음 ✅ |
| **상태** | 계산 자체는 올바름, 프로필 미입력 시 기본값 적용 로직 확인 필요 |

---

### 🟡 ARCH-04: 명절지원비 통상임금 산입 공식 — 규정 근거 명확화 필요

| 항목 | 내용 |
|------|------|
| **파일** | `calculators.js` L67~68 |
| **현재 코드** | `holidayBonusPerTime = Math.round((monthlyBase + adjustPay / 2) * 0.5)` → 월할: `×4 / 12` |
| **규정 근거** | 제48조: "설, 추석, 5월, 7월에 (기본급+조정급1/2)의 50% 지급" |
| **계산 확인** | 연 4회 × (기본급+조정급/2) × 50% → 월할 = ×4/12 ✅ |
| **주석 표기** | `// 명절지원비 (연 4회): (기준기본급 + 조정급/2) × 50%` |
| **상태** | 올바름. 조항 번호(`제48조`) 주석 추가 필요 |

---

### 🔴 BUG-06: 근속가산기본급 계산식 — 조항 미명시 및 버림/반올림 불일치

| 항목 | 내용 |
|------|------|
| **파일** | `calculators.js` L43~45 |
| **현재 코드** | `Math.floor((monthlyBase + adjustPay / 2) * rate.rate)` |
| **규정 근거** | 제46조: "(기준기본급 + 조정급/2) × 근속가산율" |
| **규정 조건** | 2016.02.29 이전 입사자에 한해 적용 |
| **비교 파일** | `data/PayrollEngine.js` L53: `Math.floor(formulaBase * rate)` — 동일 산식 ✅ |
| **상태** | 계산 자체는 올바름. 조항 번호 주석 필요. |

---

### 🔴 BUG-07: 자기계발별정수당 / 별정수당5 조항 미명시

| 항목 | 내용 |
|------|------|
| **파일** | `data.js` L148~149, `calculators.js` L87~88 |
| **현재 값** | `selfDevAllowance: 40000`, `specialPay5: 35000` |
| **규정 근거** | 수첩 별표 (명칭·금액 확인 필요) |
| **문제** | 어떤 조항/별표에서 유래하는지 주석 없음 |
| **영향** | 통상임금에 포함되어 있음 — 조항 불명확 시 연도 변경 시 누락 위험 |

---

### 🟢 DISPLAY-03: 시간외수당 FAQ 조항 번호 불일치

| 항목 | 내용 |
|------|------|
| **파일A** | `data.js` L393 FAQ: `ref: '제47조'` |
| **파일B** | `data.js` L469 핸드북: `ref: '제34조, 제47조'` |
| **규정 원문** | `hospital_guidelines_2026.md`: 제34조(시간외/연장근로), 제47조(야간/휴일 가산) |
| **올바른 ref** | 두 조항을 모두 표기: "제34조, 제47조" |

---

### 🔴 BUG-08: 가족수당 통상임금 제외 — 계산서에 포함될 가능성

| 항목 | 내용 |
|------|------|
| **파일** | `calculators.js` L64, L85 |
| **현재 코드** | `// 가족수당은 통상임금 산정 제외 (보수규정 제44조 2항 미포함)` |
| **규정 근거** | 제44조 2항: 가족수당은 통상임금 구성 항목에 명시되지 않음 |
| **상태** | 주석으로 명시되어 있고 breakdown에 미포함 ✅ |
| **확인 사항** | payroll.js L291에서 "월 가족수당 (비통상임금)"으로 표시 — 올바름 ✅ |

---

### 🔴 BUG-09: 교통보조비/급식보조비 통상임금 포함 여부 — 연도별 변동 대응 필요

| 항목 | 내용 |
|------|------|
| **파일** | `data.js` L145~146, `calculators.js` L82~83 |
| **현재 값** | `mealSubsidy: 150000`, `transportSubsidy: 150000` |
| **현재 상태** | breakdown에 포함 (`'급식보조비', '교통보조비'`) |
| **규정 근거** | 제43조: 교통보조비·급식보조비 통상임금 포함 항목 열거 ✅ |
| **주의** | 연도별 단체협약에서 변동 가능 — DB 연결 후 버전별 관리 필요 |

---

### 🔴 BUG-10: 이브닝 근무자 야간 가산 미반영 여부

| 항목 | 내용 |
|------|------|
| **파일** | `calculators.js`, `payroll.js` |
| **규정 근거** | 제32조: "이브닝 근무자 자정 이후 퇴근 시 업무용 택시 제공" |
| **현재 상태** | 택시 지원은 현물 복리후생 — 수당 계산 대상 아님 |
| **교대근무 야간가산금** | `nightShiftBonus: 10000` (회당) — 별도 payroll 카드로 별도 처리 ✅ |
| **상태** | 계산 누락 없음. 단, 교대근무 야간가산금과 22:00~06:00 야간수당을 혼동하지 않도록 UI 명확화 필요 |

---

### 🟡 ARCH-05: 온콜 출근 시간 계산 — 시간외수당 중복 적용 위험

| 항목 | 내용 |
|------|------|
| **파일** | `calculators.js` L143~170 (calcOnCallPay) |
| **규정 근거** | 제32조: "출근 시 2시간 근무 인정 및 교통비 50,000원 지급, 온콜 출근 시 대기수당 중복 지급 안 됨" |
| **현재 코드** | `onCallCommuteHours: 2` — 출퇴근 2시간 시간외 산정에 포함 |
| **확인 사항** | 야간 온콜 출근 시 2시간이 야간시간대(22:00~06:00)에 포함되면 야간수당 적용 여부 |
| **수정 방법** | 온콜 출근 시간이 야간 시간대인지 확인하는 로직 필요 여부 명확화 |

---

### 🔴 BUG-11: 퇴직금 계산 — averageMonthlyPay 구성 항목 불명확

| 항목 | 내용 |
|------|------|
| **파일** | `retirement-engine.js` L51~65 (getLatestWage) |
| **현재 상태** | 최근 명세서의 `grossPay`를 평균임금으로 사용 |
| **규정 근거** | 제52조: 퇴직금 기준은 "최근 3개월 평균임금" |
| **문제** | 단일 명세서의 grossPay ≠ 3개월 평균임금 |
| **추가 문제** | grossPay에 비통상임금(가족수당, 복지포인트 등) 포함 여부 불명확 |
| **수정 방법** | 최근 3개월 명세서 평균 사용 + 평균임금 구성 항목 명확화 |

---

### 🟢 DISPLAY-04: 육아휴직 급여 상한액 불일치

| 항목 | 내용 |
|------|------|
| **파일A** | `data.js` L449 FAQ: "1~3개월 상한 2,500,000원, 4~6개월 2,000,000원" |
| **파일B** | `data.js` L515 핸드북: "1~6개월: 통상임금 100% (상한 250만원)" |
| **규정 근거** | 제38조 / 고용보험법: 2024년 기준 상한액 변경 — 단협과 법정 기준 구분 필요 |
| **확인 사항** | 병원 자체 지급(단협)과 고용보험 지원금을 명확히 구분하는 표기 필요 |

---

## Architecture Decision — 해결 전략

### 선택: regulation-constants.js 분리 + data.js 참조 통일

**목표 구조:**

```text
regulation-constants.js             ← 신규: 순수 규정 상수 파일 (조항 주석 포함)
  ↓ (참조)
data.js (DATA_STATIC)               ← 기존: regulation-constants의 값을 가져다 쓰거나
  ↓ (참조)                             직접 값으로 내장 (fallback 역할 유지)
calculators.js (CALC)               ← 기존: DATA만 참조 (변경 없음)
retirement-engine.js                ← 수정: DATA.severancePay 참조 (하드코딩 제거)
```

**선택 근거:**
- `regulation-constants.js`를 분리하면 조항별 주석을 체계화할 수 있다.
- `data.js`의 `DATA` 객체 구조(fallback + API override)는 그대로 유지 — DB 연결 시 API 응답으로 자동 교체된다.
- `retirement-engine.js`가 `DATA`를 참조하면 DB override 후에도 자동으로 최신 규정 사용.

---

## Dependency Graph

```text
Task R0 (전수 감사)
  │
  ├── Task R1 (regulation-constants.js 생성)
  │       │
  │       ├── Task R2 (리프레시지원비 버그 수정)
  │       ├── Task R3 (장기근속수당 구조/값 수정)
  │       └── Task R4 (retirement-engine.js DATA 참조 전환)
  │               │
  │               └── Task R5 (회귀 검증 도구 생성)
  │                       │
  │                       ├── Task R6 (표시 텍스트 수정)
  │                       └── Task R7 (데드코드 정리)
```

---

## Task List

---

### Phase 0: 전수 감사 문서화

---

#### Task R0: 규정 원문 기준 전수 감사 — 모든 계산 항목 검증

**Description:**
`data/hospital_guidelines_2026.md` 원문을 기준으로 현재 코드의 모든 계산 항목(수당 금액, 배율, 조건)을 1:1 대조 검증한다. 이 플랜에서 발견된 11개 이슈 외에 추가 불일치가 없는지 확인하고 감사 보고서를 작성한다.

**검증 대상 항목 전체 목록:**

| 항목 | 파일:위치 | 조항 | 검증 기준 |
|------|-----------|------|-----------|
| 근로시간 (1일 8h, 주 40h) | data.js allowances.weeklyHours | 제32조 | 209h/월 |
| 통상임금 구성 항목 열거 | calculators.js L70~90 | 제43조 | 14개 항목 전체 |
| 기준기본급 (직급별 호봉) | data.js payTables | — | 2026 수첩 별표 |
| 근속가산기본급 공식 | calculators.js L43 | 제46조 | (기본급+조정급/2)×율 |
| 근속가산율 구간 | data.js seniorityRates | — | 1~5년2%, 5~10년5%, 10~15년6%, 15~20년7%, 20년+8% |
| 2016.02.29 입사 기준일 | calculators.js L42 | — | 이전 입사자만 적용 |
| 군복무수당 금액/월할 | data.js allowances.militaryService | — | 45,000원/월 (2년 기준) |
| 능력급 (직급별) | data.js payTables.abilityPay | — | 별표 |
| 상여금 (직급별) | data.js payTables.bonus | — | 별표 |
| 가계지원비 (직급별, 11개월) | data.js payTables.familySupport | 별표 | ÷11 |
| 가계지원비 지급월 기준 | data.js familySupportMonths | 별표 | 9개월+설추석 |
| 조정급 (입력값) | calculators.js L38 | — | 개인별 |
| 승급조정급 (입력값) | calculators.js L60 | — | 개인별 |
| 명절지원비 (연 4회, 월할) | calculators.js L67 | 제48조 | (기본급+조정급/2)×50%×4/12 |
| 장기근속수당 구간별 금액 | data.js longServicePay | 제50조 | 5만/6만/8만/10만+가산 |
| 별정수당 (직책급) | calculators.js L62 | — | 개인별 |
| 업무보조비 | calculators.js L63 | — | 개인별 |
| 급식보조비 | data.js allowances.mealSubsidy | 별표 | 150,000원 |
| 교통보조비 | data.js allowances.transportSubsidy | 별표 | 150,000원 |
| 자기계발별정수당 | data.js allowances.selfDevAllowance | 별표 | 40,000원 |
| 별정수당5 | data.js allowances.specialPay5 | 별표 | 35,000원 |
| 리프레시지원비 | data.js allowances.refreshBenefit | 별도합의 2024.11 | 30,000원 (2026.01~통상) |
| 교육훈련비 (포함 여부) | 핸드북 텍스트 | 제43조 | 통상임금 포함 |
| 시간외수당율 (연장 150%) | data.js overtimeRates.extended | 제34조 | 1.5 |
| 야간수당율 (200%) | data.js overtimeRates.night | 제47조 | 2.0 |
| 통상근무자 연장→야간 (200%) | data.js overtimeRates.extendedNight | 제34조 | 2.0 |
| 휴일수당율 8h이내 (150%) | data.js overtimeRates.holiday | 제34조 | 1.5 |
| 휴일수당율 8h초과 (200%) | data.js overtimeRates.holidayOver8 | 제34조 | 2.0 |
| 휴일야간 (200%) | data.js overtimeRates.holidayNight | 제47조 | 2.0 |
| 15분 단위 절삭 | calculators.js L118 | 제34조 | `Math.floor(h*4)/4` |
| 일직/숙직비 | data.js allowances.dutyAllowance | 제32조 | 50,000원/일 |
| 온콜대기수당 | data.js allowances.onCallStandby | 제32조 | 10,000원/일 |
| 온콜교통비 | data.js allowances.onCallTransport | 제32조 | 50,000원/회 |
| 온콜 출퇴근 인정시간 | data.js allowances.onCallCommuteHours | 제32조 | 2시간 |
| 교대야간가산금 | data.js allowances.nightShiftBonus | 별도합의 | 10,000원/회 |
| 리커버리데이 월 7일 기준 | data.js recoveryDay.monthlyTrigger | 별도합의 | 7일 |
| 리커버리데이 누적 15일 (간호부) | data.js recoveryDay.nurseCumulativeTrigger | 별도합의 | 15일 |
| 리커버리데이 누적 20일 (시설 등) | data.js recoveryDay.otherCumulativeTrigger | 별도합의 | 20일 |
| 가족수당 배우자 | data.js familyAllowance.spouse | 별표 | 40,000원 |
| 가족수당 일반 가족 | data.js familyAllowance.generalFamily | 별표 | 20,000원 |
| 가족수당 최대 5인 | data.js familyAllowance.maxFamilyMembers | 별표 | 5명 |
| 자녀수당 첫째 | data.js familyAllowance.child1 | 별표 | 30,000원 |
| 자녀수당 둘째 | data.js familyAllowance.child2 | 별표 | 70,000원 |
| 자녀수당 셋째+ | data.js familyAllowance.child3Plus | 별표 | 110,000원 |
| 연차 1년 미만 (월 1일) | data.js annualLeave | 제36조 | max 11일 |
| 연차 1년 이상 (15일 기준) | data.js annualLeave | 제36조 | 최대 25일 |
| 연차 가산 (3년차부터 2년마다 1일) | calculators.js L193 | 제36조 | `floor((y-1)/2)` |
| 퇴직수당 요율 (2015.06.30 이전) | data.js severancePay | 제57조 | 5단계 요율 |
| 퇴직금 누진배수 (2001.08.31 이전) | data.js severanceMultipliersPre2001 | 제52조 | 18단계 배수 |
| 임금피크제 적용 시점 | retirement-engine.js L86~91 | 제45조 | 만 60세 해당월 말일 |
| 임금피크제 감액율 | (현재 미구현) | 제45조 | 60% 지급 |
| 공로연수 기간 | (현재 미구현) | 제40조 | 정년 전 1년 |
| 병가 유급 기간 | data.js leaveQuotas | 제71조 | 14일 이내 유급 |
| 생리휴가 공제 기준 | data.js leaveQuotas | 제37조 | 기본급 ÷ 30 × 9/10 |
| 가족돌봄 유급 | data.js leaveQuotas | 2021단협 | 2일 (다자녀 3일) |
| 경조사 본인결혼 | data.js leaveQuotas | 제41조 | 5일, 병원경조금 30만 |
| 경조사 배우자출산 | data.js leaveQuotas | 제41조 | 20일 |
| 공제율 건강보험 | data.js deductions | — | 3.545% |
| 공제율 장기요양 | data.js deductions | — | 건강보험의 12.95% |
| 공제율 국민연금 | data.js deductions | — | 4.5% |
| 공제율 고용보험 | data.js deductions | — | 0.9% |

**Acceptance criteria:**
- [ ] 위 전체 항목에 대해 규정 원문과 코드 값이 일치하는지 확인 완료
- [ ] 불일치 항목은 이 플랜의 BUG/ARCH 섹션에 추가 기록
- [ ] 확인 완료 항목은 `✅ 확인`, 불일치는 `❌ 불일치 [설명]` 표기

**Verification:**
- [ ] 감사 보고서 작성 (`docs/regulation-audit-2026.md`)
- [ ] 모든 항목에 ✅ 또는 ❌ 표기

**Dependencies:** None

**Files likely touched:**
- `docs/regulation-audit-2026.md` (신규)
- `data/hospital_guidelines_2026.md` (읽기만)

**Estimated scope:** Medium (코드 수정 없음, 읽기·검증·문서화만)

---

### Checkpoint R0: 감사 완료

- [x] `docs/regulation-audit-2026.md` 작성 완료
- [x] 추가 불일치 없음 또는 플랜에 반영
- [x] 수정 범위 확정

---

### Phase 1: 단일 출처 파일 생성

---

#### Task R1: regulation-constants.js 생성

**Description:**
모든 규정 상수를 하나의 파일에 모으고, 각 값에 출처 조항 번호를 주석으로 달아 관리 가능하게 한다. 이 파일은 `data.js`의 `DATA_STATIC`이 참조하거나 동일한 값을 내장하기 위한 출처 기록 역할을 한다. 실행 앱은 기존과 동일하게 `DATA` 객체를 통해 접근한다.

**구조:**
```js
// regulation-constants.js
// 기준: 2026 단체협약 (2025.10.23 갱신)
// 모든 값은 규정 원문 조항 번호와 함께 기록된다.

const REGULATION = {
  // ─── 근로시간 ─── 제32조
  weeklyHours: 209,              // 월 소정근로시간
  dailyHours: 8,                 // 1일 소정근로시간
  weeklyLimit: 40,               // 주 소정근로시간
  extendedLimit: 12,             // 주 최대 연장 한도

  // ─── 시간외수당 배율 ─── 제34조, 제47조
  overtimeRates: {
    extended: 1.5,               // 연장근무 150%
    night: 2.0,                  // 야간가산(22~06시) 200%
    extendedNight: 2.0,          // 통상근무자 연장→야간 200%
    holiday: 1.5,                // 휴일근무 150% (8h 이내)
    holidayOver8: 2.0,           // 휴일근무 200% (8h 초과)
    holidayNight: 2.0,           // 휴일야간 200%
  },

  // ─── 수당 금액 ─── 별표, 별도합의
  allowances: {
    mealSubsidy: 150000,         // 급식보조비 月
    transportSubsidy: 150000,    // 교통보조비 月
    selfDevAllowance: 40000,     // 자기계발별정수당 月 [별표]
    specialPay5: 35000,          // 별정수당5 月 [별표]
    refreshBenefit: 30000,       // 리프레시지원비 月 (2026.01~ 통상임금 산입) [별도합의 2024.11]
    militaryService: 45000,      // 군복무수당 月 (2년 기준 월할) [별표]
    onCallStandby: 10000,        // 온콜대기수당 日당 [제32조]
    onCallTransport: 50000,      // 온콜교통비 回당 [제32조]
    onCallCommuteHours: 2,       // 온콜 출퇴근 인정시간 [제32조]
    nightShiftBonus: 10000,      // 교대야간가산금 回당 [별도합의]
    dutyAllowance: 50000,        // 일직/숙직비 日당 [제32조]
  },

  // ─── 장기근속수당 ─── 제50조
  // 구조: ADDITIVE (임계값 달성 시 항목별 가산)
  longService: {
    base: [                      // 기본 구간
      { min: 0,  max: 5,  amount: 0 },
      { min: 5,  max: 10, amount: 50000 },
      { min: 10, max: 15, amount: 60000 },
      { min: 15, max: 20, amount: 80000 },
      { min: 20, max: 99, amount: 100000 },  // 20년 이상 기준액
    ],
    addOns: [
      { threshold: 21, extra: 10000 },        // 21년 이상 +1만
      { threshold: 25, extra: 30000 },        // 25년 이상 +3만 (누계: +4만)
    ]
    // 계산 방법: base[years].amount + addOns.filter(a => years >= a.threshold).sum(a.extra)
    // 25년+: 100,000 + 10,000 + 30,000 = 140,000원
  },

  // ─── 가족수당 ─── 별표
  familyAllowance: {
    spouse: 40000,
    generalFamily: 20000,
    maxFamilyMembers: 5,
    child1: 30000,
    child2: 70000,
    child3Plus: 110000,
  },

  // ─── 근속가산율 ─── 2016.02.29 이전 입사자 한정
  seniorityRates: [
    { min: 1,  max: 5,  rate: 0.02 },
    { min: 5,  max: 10, rate: 0.05 },
    { min: 10, max: 15, rate: 0.06 },
    { min: 15, max: 20, rate: 0.07 },
    { min: 20, max: 99, rate: 0.08 },
  ],

  // ─── 퇴직수당 ─── 제57조 (2015.06.30 이전 입사자)
  severancePay: [
    { min: 20, rate: 0.60 },
    { min: 15, rate: 0.50 },
    { min: 10, rate: 0.45 },
    { min: 5,  rate: 0.35 },
    { min: 1,  rate: 0.10 },
  ],

  // ─── 퇴직금 누진배수 ─── 제52조 (2001.08.31 이전 입사자)
  severanceMultipliersPre2001: [
    { min: 30, multiplier: 52.5 },
    // ... (data.js와 동일)
  ],

  // ─── 가계지원비 지급월 기준 ─── 별표
  familySupportMonths: [3, 4, 5, 6, 7, 8, 10, 11, 12],  // 고정 9개월 + 설/추석 2개월 = 11개월

  // ─── 연차 기준 ─── 제36조
  annualLeave: {
    underOneYear: 1,      // 1년 미만: 월 1일
    maxUnderOne: 11,      // 1년 미만 최대 11일
    baseLeave: 15,        // 1년 이상: 15일
    addPerTwoYears: 1,    // 3년차 이상: 2년마다 1일 가산
    maxLeave: 25,         // 최대 25일
  },

  // ─── 리커버리데이 ─── 별도합의
  recoveryDay: {
    monthlyTrigger: 7,
    nurseCumulativeTrigger: 15,
    otherCumulativeTrigger: 20,
  },
};
```

**Acceptance criteria:**
- [ ] 이 플랜에 나열된 모든 규정 항목이 포함된다
- [ ] 각 값에 출처 조항 번호 주석 포함
- [ ] data.js의 `DATA_STATIC`과 이 파일의 값이 일치
- [ ] `regulation-constants.js`가 실행 앱과 독립된 참조 문서로 기능

**Verification:**
- [ ] `data.js` 값과 1:1 비교 확인
- [ ] 조항 번호 누락 항목 없음 확인

**Dependencies:** Task R0

**Files likely touched:**
- `regulation-constants.js` (신규)

**Estimated scope:** Medium

---

### Checkpoint R1: 단일 출처 확립

- [x] `regulation-constants.js` 생성 완료
- [x] 모든 수당·배율 항목에 조항 주석 포함

---

### Phase 2: 버그 수정

---

#### Task R2: 리프레시지원비 통상임금 산입 반영 (BUG-01)

**Description:**
`calculators.js` L89에서 주석 처리된 리프레시지원비를 2026년 기준으로 통상임금에 반영한다. FAQ 및 핸드북 표시 텍스트와 일관성을 유지한다.

**Acceptance criteria:**
- [ ] `calculators.js` breakdown에 `'리프레시지원비': DATA.allowances.refreshBenefit` 포함
- [ ] 통상임금 월액이 30,000원 증가 (모든 직급/호봉 동일)
- [ ] 변경 후 시급 = `Math.round(monthlyWage / 209)` (리프레시지원비 포함)
- [ ] payroll.js 표시 카드에서 "2026.01~통상임금 포함" 표기 확인

**Verification:**
- [ ] J1-1호봉 통상임금 계산 before/after 비교 (예시 수치 기록)
- [ ] 시간외수당 40h 기준 변화량 기록
- [ ] 브라우저에서 수동 계산 확인

**Dependencies:** Task R1

**Files likely touched:**
- `calculators.js` L89

**Estimated scope:** Small (1줄 수정, 영향 검증)

---

#### Task R3: 장기근속수당 구조·금액 수정 (BUG-02, BUG-03)

**Description:**
`data.js`의 `longServicePay`를 ADDITIVE 구조로 변경하고 25년+ 금액을 140,000원으로 수정한다. `calculators.js`의 `calcLongServicePay`와 통상임금 breakdown의 계산 로직도 함께 수정한다.

**Acceptance criteria:**
- [ ] `data.js` `longServicePay` → `longService` (base + addOns 구조) 또는 TIER 값을 올바른 누계로 수정
- [ ] 25년+ = 140,000원 (100,000 + 10,000 + 30,000)
- [ ] `calculators.js` `calcLongServicePay` 업데이트
- [ ] `calculators.js` `calcOrdinaryWage` 내 장기근속수당 계산 업데이트
- [ ] `payroll.js` 장기근속수당 카드 표시 업데이트

**규정별 올바른 값 (검증 기준):**
| 근속연수 | 올바른 금액 | 현재 data.js | 차이 |
|---------|------------|-------------|------|
| 5~9년   | 50,000     | 50,000      | 없음 |
| 10~14년 | 60,000     | 60,000      | 없음 |
| 15~19년 | 80,000     | 80,000      | 없음 |
| 20년    | 100,000    | 100,000     | 없음 |
| 21~24년 | 110,000    | 110,000     | 없음 |
| 25년+   | **140,000**| 130,000     | **-10,000 오류** |

**Verification:**
- [ ] 5/10/15/20/21/25/30년 재직자 장기근속수당 before/after 비교
- [ ] 통상임금에 반영 확인 (25년+ 직원 기준 10,000원 증가)
- [ ] 브라우저 수동 확인

**Dependencies:** Task R1

**Files likely touched:**
- `data.js` L173~182
- `calculators.js` L54~57, L204~214
- `payroll.js` L789~800

**Estimated scope:** Small

---

#### Task R4: retirement-engine.js DATA 참조 전환 (ARCH-01)

**Description:**
`retirement-engine.js`의 하드코딩된 `SEV_PAY`와 `SEV_MULTI` 상수를 제거하고, `DATA.severancePay`와 `DATA.severanceMultipliersPre2001`을 직접 참조하도록 변경한다.

**주의:** `retirement-engine.js`는 `data.js`보다 먼저 로드될 수 있으므로, 로드 순서와 `DATA` 접근 타이밍을 검증해야 한다. HTML 스크립트 로드 순서 확인 필요.

**Acceptance criteria:**
- [ ] `retirement-engine.js` 내 `SEV_PAY`, `SEV_MULTI` 상수 제거
- [ ] 계산 함수가 `DATA.severancePay`, `DATA.severanceMultipliersPre2001` 사용
- [ ] HTML에서 `data.js`가 `retirement-engine.js`보다 먼저 로드됨을 확인
- [ ] 또는 `getterFunction` 패턴으로 지연 참조 처리

**Verification:**
- [ ] `retirement.html`에서 퇴직금 계산 결과가 변경 전후 동일
- [ ] 2001.08.31 이전 입사자 시나리오 확인
- [ ] 2015.06.30 이전 입사자 시나리오 확인
- [ ] DATA API override 시에도 올바른 값 사용 확인

**Dependencies:** Task R2, Task R3

**Files likely touched:**
- `retirement-engine.js` L10~37
- `retirement.html` (script 순서 확인)

**Estimated scope:** Small

---

#### Task R4-b: hourlyRate 반올림 정책 통일 (ARCH-03) — 결정 필요

**Description:**
`calculators.js`의 `Math.round`를 `Math.floor`로 통일할지 결정하고, 결정에 따라 변경 또는 주석으로 근거 명시.

**⚠️ 주의:** 이 변경은 일부 직원의 시간외수당을 소폭 감소시킬 수 있다. 변경 전 영향 범위를 반드시 계산하고 확인 후 적용.

**Acceptance criteria:**
- [ ] 반올림 정책 결정 (floor/round 중 선택)
- [ ] 결정 근거를 코드 주석에 명시
- [ ] 선택에 따라 코드 수정 또는 유지

**Verification:**
- [ ] J1-1호봉 시급 변화량 계산 (round vs floor 차이)
- [ ] 시간외 40h 기준 수당 차이 계산

**Dependencies:** Task R2

**Files likely touched:**
- `calculators.js` L94

**Estimated scope:** XS

---

#### Task R5: 연차 계산 윤년 보정 (BUG-04)

**Description:**
`calculators.js` L182의 연수 계산을 `Math.floor(diffDays / 365)` 대신 정확한 날짜 기반 연수 계산으로 교체한다.

**Acceptance criteria:**
- [ ] 입사일과 기준일 사이의 정확한 연수를 계산 (윤년 포함)
- [ ] 3년차, 5년차, 7년차 등 연차 가산 경계값에서 올바른 결과 반환
- [ ] 1년 미만 경계값 (364일, 365일, 366일) 검증

**Verification:**
- [ ] 2021-02-28 입사 → 2025-02-28 기준: 4년차 → 17일 (3년차부터 가산 시작, 2년마다 1일)
- [ ] 2021-02-28 입사 → 2024-02-29 기준 (윤년): 3년차 → 16일
- [ ] 엣지케이스 5개 이상 확인

**Dependencies:** Task R1

**Files likely touched:**
- `calculators.js` L177~200

**Estimated scope:** Small

---

### Checkpoint R2: 핵심 버그 수정 완료

- [x] 리프레시지원비 통상임금 포함 (BUG-01)
- [x] 장기근속수당 25년+ 수정 (BUG-02, BUG-03)
- [x] retirement-engine.js DATA 참조 (ARCH-01)
- [x] 연차 윤년 보정 (BUG-04)

---

### Phase 3: 회귀 검증

---

#### Task R6: 계산 결과 회귀 검증 도구 생성

**Description:**
수정 전/후 계산 결과를 비교할 수 있는 검증 스크립트를 만든다. 각 직급·호봉·근속연수 조합에 대한 예상 결과를 기록하고, 수정 후에도 일치하는지 확인한다.

**검증 시나리오 (최소 20개):**

| # | 직종 | 직급 | 호봉 | 근속 | 시나리오 | 확인 항목 |
|---|------|------|------|------|---------|-----------|
| 1 | 사무직 | J1 | 1 | 0년 | 기본 | 통상임금, 시급 |
| 2 | 사무직 | S1 | 4 | 10년 | 근속가산+장기근속 | 통상임금, 장기근속수당 |
| 3 | 사무직 | M3 | 8 | 25년 | 장기근속 25년+ | 장기근속수당 140,000 확인 |
| 4 | 기능직 | A1 | 1 | 0년 | 운영기능직 | 통상임금, 시급 |
| 5 | 사무직 | J2 | 3 | 5년 | 장기근속 5년+ | 50,000 |
| 6 | 사무직 | S2 | 5 | 21년 | 장기근속 21년+ | 110,000 |
| 7 | 사무직 | S1 | 4 | 10년 | 시간외 연장 8h | 시간외수당 |
| 8 | 사무직 | S1 | 4 | 10년 | 야간 4h | 야간수당 |
| 9 | 사무직 | S1 | 4 | 10년 | 휴일 10h (8h+2h) | 휴일+휴일초과수당 |
| 10 | 사무직 | J1 | 1 | 0년 | 온콜 대기 5일 | 온콜수당 |
| 11 | 사무직 | J1 | 1 | 0년 | 온콜 출근 2회 | 온콜+시간외 |
| 12 | 사무직 | S2 | 3 | 0년 | 리프레시지원비 포함 | 통상임금+30,000 확인 |
| 13 | 사무직 | M1 | 1 | 15년 | 2016 이후 입사 | 근속가산기본급 = 0 |
| 14 | 사무직 | M1 | 1 | 15년 | 2010년 입사 | 근속가산기본급 > 0 |
| 15 | (any) | J1 | 1 | 0년 | 연차 3개월차 | 3일 |
| 16 | (any) | J1 | 1 | 0년 | 연차 1년 | 15일 |
| 17 | (any) | J1 | 1 | 0년 | 연차 3년 | 16일 |
| 18 | (any) | J1 | 1 | 0년 | 연차 5년 | 17일 |
| 19 | (퇴직) | S1 | 5 | 10년 | 퇴직수당 2015이전 | 퇴직수당 요율 45% |
| 20 | (퇴직) | M3 | 8 | 25년 | 퇴직금 누진배수 | 2001이전 입사자 |

**Acceptance criteria:**
- [ ] `tests/calc-regression.js` 또는 `tests/calc-regression.html` 작성
- [ ] 20개 이상 시나리오 통과
- [ ] 수정 후 결과가 수정 전과 다른 경우 명시적으로 기록 (의도된 변경만)

**Verification:**
- [ ] 스크립트 실행 후 PASS/FAIL 목록 확인
- [ ] FAIL 항목이 의도된 버그 수정인지 확인

**Dependencies:** Task R4

**Files likely touched:**
- `tests/calc-regression.js` (신규)

**Estimated scope:** Medium

---

### Checkpoint R3: 회귀 검증 통과

- [x] 모든 회귀 시나리오 PASS (calc-regression.js 31 PASS)
- [x] 의도된 변경 항목 목록 작성 완료

---

### Phase 4: 표시 일관성 수정

---

#### Task R7: 가계지원비 표시 오류 수정 (DISPLAY-01, DISPLAY-02)

**Description:**
`app.js` L2158의 가계지원비 표시 텍스트를 올바른 규정에 맞게 수정한다. FAQ 텍스트와 통일한다.

**Acceptance criteria:**
- [ ] `app.js` L2158: "1·2·9월 미지급" → "1·9월(설/추석월 제외) 미지급"으로 수정
- [ ] `data.js` L435 FAQ 텍스트와 일관성 확인

**Dependencies:** Task R6

**Files likely touched:**
- `app.js` L2158

**Estimated scope:** XS

---

#### Task R8: 시간외수당 FAQ 조항 번호 통일 (DISPLAY-03)

**Description:**
`data.js` FAQ의 시간외수당 항목 `ref`를 "제34조, 제47조"로 통일한다.

**Acceptance criteria:**
- [ ] `data.js` L393: `ref: '제47조'` → `ref: '제34조, 제47조'`

**Dependencies:** Task R6

**Files likely touched:**
- `data.js` L393

**Estimated scope:** XS

---

#### Task R9: 육아휴직 급여 표시 통일 (DISPLAY-04)

**Description:**
FAQ와 핸드북의 육아휴직 상한액 표기를 병원 단협 기준과 고용보험 기준으로 구분하여 명확화한다.

**Acceptance criteria:**
- [ ] 병원 자체 지급분 vs 고용보험 지원금이 명확히 구분 표기
- [ ] 두 항목 간 상충하는 숫자 없음

**Dependencies:** Task R6

**Files likely touched:**
- `data.js` L449, L515

**Estimated scope:** XS

---

### Checkpoint R4: 표시 일관성 완료

- [x] 모든 수당 항목의 표시 텍스트가 계산식과 일치 (phase4-display.js 5 PASS)
- [x] 조항 번호 누락 없음

---

### Phase 5: 데드코드 정리

---

#### Task R10: data/PayrollEngine.js 격리 및 아카이브 (ARCH-02)

**Description:**
`data/PayrollEngine.js`를 `data/archive/PayrollEngine.legacy.js`로 이동하고, 왜 실행 앱과 연결되지 않는지 주석을 남긴다.

**Acceptance criteria:**
- [ ] 파일이 `data/archive/` 하위로 이동
- [ ] 헤더에 "ARCHIVED: 실행 앱과 미연결, hospital_rule_master_2026.json 참조 (미존재), 참조용 프로토타입" 주석 추가
- [ ] 실행 앱에서 이 파일을 참조하는 코드가 없음을 확인

**Dependencies:** Task R8

**Files likely touched:**
- `data/PayrollEngine.js` (이동)
- `data/archive/PayrollEngine.legacy.js` (신규 위치)

**Estimated scope:** XS

---

### Checkpoint R5: 완전 정리 완료 (Phase 5)

- [x] 데드코드 없음 (phase5-cleanup.js 8 PASS)
- [x] 이중화 데이터 없음
- [x] 모든 계산 엔진이 DATA 단일 경로로 규정 데이터 접근

---

### Final Checkpoint: DB 연결 준비 완료

- [x] 규정 원문 ↔ 코드 값 전수 검증 완료
- [x] 모든 계산 엔진이 `DATA` 객체를 통해 동일한 규정 참조
- [x] `retirement-engine.js`가 DATA 참조 → DB override 자동 적용 가능
- [x] `regulation-constants.js`가 fallback 참조 문서로 존재
- [x] 회귀 검증 PASS
- [x] 기존 Track A/B 플랜 진행 가능 상태

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| hourlyRate 반올림 변경이 실제 급여 차이 유발 | High | Task R4-b에서 영향 계산 선행, 결정 후 적용 |
| 리프레시지원비 반영이 기존 사용자 기대치와 달라짐 | Medium | 변경 로그 작성, FAQ/UI에 "2026.01~" 명시 |
| 장기근속수당 25년+ 수정이 이미 계산된 결과와 달라짐 | Medium | 회귀 검증으로 before/after 명시 |
| retirement-engine.js 로드 순서 문제 | High | HTML 스크립트 로드 순서 확인 선행 |
| 감사 중 발견된 추가 불일치가 범위를 확대 | Medium | Phase 0 체크포인트에서 추가 범위 동결 |
| 윤년 보정이 기존 연차 계산과 차이 유발 | Low | 경계값 엣지케이스 집중 검증 |

---

## Open Questions

1. **hourlyRate 반올림**: `Math.round` 유지 vs `Math.floor` 통일 — 경영진 확인 필요
2. **리프레시지원비 2026년 이전 사용자**: 과거 계산 결과와 다른 값이 나오는 상황에 대한 안내 방법
3. **자기계발별정수당/별정수당5 출처**: 정확한 조항 또는 별표 번호 확인 필요
4. **퇴직금 평균임금 기준**: 최근 3개월 명세서 평균 사용 시 명세서 보관 구조 변경 필요 여부

---

---

### Phase 6: union_regulation_admin.html — 비개발자 규정 관리 인터페이스

---

#### Task R11: union_regulation_admin.html 설계 및 구현

**Background:**
현재 `admin/index.html`은 버전 관리, 공휴일, FAQ, 시나리오 탭을 제공하지만, 수당 금액·계산 배율·급여표 같은 **규정 핵심 수치**를 수정하는 UI가 없다. 비개발자가 json 파일을 직접 편집하거나 자연어로 변경 요청을 할 수 있는 인터페이스가 필요하다.

**이미 존재하는 기반:**

| 기반 | 위치 | 역할 |
|------|------|------|
| 규정 어드민 UI | `admin/index.html` | 버전/FAQ/시나리오 탭 이미 구현 |
| 운영팀 자연어 라우터 | `.claude/agents/ops-orchestrator.md` | 한국어 지시 → content-editor, regulation-ingestor, ops-reviewer 라우팅 |
| 규정 적재 에이전트 | `.claude/agents/regulation-ingestor.md` | PDF/MD 청킹 + 임베딩 DB 적재 |
| 백엔드 운영 API | `server/src/routes/adminOps.ts` | draft→review→published 워크플로우 완비 |
| 규정 원문 마스터 | `content/policies/2026/nurse_regulation.json` | 백엔드 계산의 단일 진실 출처 |

**구현 목표:**

```text
union_regulation_admin.html
  ├─ 탭 1: 수당 금액 편집
  │    ├─ 리프레시지원비, 장기근속수당, 각종 보조비 금액 폼
  │    └─ "저장" → nurse_regulation.json draft 생성 + adminOps API 호출
  ├─ 탭 2: 계산 배율 편집
  │    ├─ 시간외/야간/휴일 배율 폼
  │    └─ "저장" → 동일
  ├─ 탭 3: 급여표 편집
  │    ├─ 직급별 기본급/호봉 테이블 인라인 편집
  │    └─ "저장" → 동일
  ├─ 탭 4: 자연어 변경 요청
  │    ├─ 텍스트 입력창: "25년 이상 장기근속수당을 14만원으로 변경해줘"
  │    └─ → ops-orchestrator 에이전트 호출
  └─ 탭 5: 변경 이력 (audit_log 연동)
```

**Acceptance criteria:**
- [ ] `admin/union_regulation_admin.html` 생성 (기존 admin/index.html과 동일한 디자인 시스템 사용)
- [ ] 수당 금액 폼: nurse_regulation.json의 fixed_allowances, long_service_allowance 항목 편집 가능
- [ ] 계산 배율 폼: overtime.multipliers 편집 가능
- [ ] 자연어 탭: 입력 → ops-orchestrator API 호출 → 결과 표시
- [ ] 모든 저장 동작은 `draft` 상태로만 생성 (published 직접 전환 불가)
- [ ] 저장 후 감사 로그(`audit_logs`) 자동 기록
- [ ] 기존 `admin/index.html` 네비게이션에 "규정 수치 편집" 링크 추가

**구현 순서:**

1. `admin/union_regulation_admin.html` 기본 구조 (탭 레이아웃)
2. nurse_regulation.json 항목별 폼 렌더링 (GET /api/admin/regulation-config 신규 엔드포인트 또는 기존 버전 API 활용)
3. 저장 버튼 → POST /api/admin/versions (draft) 호출
4. 자연어 탭 → POST /api/agent/ops 호출 (ops-orchestrator 프록시)
5. 변경 이력 탭 → GET /api/admin/audit-logs 연동
6. 기존 admin/index.html에 탭 추가 또는 링크 삽입

**Dependencies:** Phase 0~5 완료, Track B API 완료 (✅ 이미 완료)

**Files likely touched:**
- `admin/union_regulation_admin.html` (신규)
- `admin/union_regulation_admin.js` (신규)
- `admin/index.html` (네비 링크 추가)
- `server/src/routes/adminOps.ts` (필요 시 엔드포인트 추가)

**Estimated scope:** Large

---

#### Task R12: nurse_regulation.json BUG-N-01 수정

**Description:**
`nurse_regulation.json`의 야간/휴일 배율 키를 명확히 분리하여 백엔드 계산 정확성을 확보한다.

**Acceptance criteria:**
- [ ] `night_22_to_06_and_holiday: 1.5` → `night_22_to_06: 2.0` + `holiday_within_8h: 1.5` 분리
- [ ] `evaluateAllowanceScenario()` 내 참조 키 업데이트
- [ ] 야간 온콜 출근 시나리오 재검증 통과

**Dependencies:** Task R11 이전에 처리 권장 (UI가 이 구조를 노출하므로)

**Files likely touched:**
- `content/policies/2026/nurse_regulation.json`
- `server/src/services/nurse-regulation.ts`

**Estimated scope:** Small

---

### Checkpoint R6: union_regulation_admin 완료

- [x] `union_regulation_admin.html` 로컬에서 동작 확인 (phase6-admin-ui.js 14 PASS)
- [ ] 수당 금액 폼 저장 → API draft 생성 확인 (DB 연결 후)
- [ ] 자연어 탭 → ops-orchestrator 라우팅 확인 (DB 연결 후)
- [ ] audit_log에 변경 이력 기록 확인 (DB 연결 후)

---

---

## Phase 7: 역계산 검증 시스템 (실제 명세서 → 예상값 비교)

> 목표: 파싱된 실제 명세서를 역계산하여 계산 엔진의 정확도를 자동 검증한다.  
> 기반: `salary-parser.js` (이미 완성), `calculators.js` CALC 엔진  

---

### 현황 분석

| 구성요소 | 상태 | 비고 |
|---------|------|------|
| `salary-parser.js` | ✅ 완성 (1164줄) | Excel/CSV/PDF 지원, 신뢰도 점수 포함 |
| `salary-parser-test.js` | ✅ 완성 (604줄) | 파싱 **정확도** 검증 (기대값 고정) |
| 역계산 비교 엔진 | ❌ 없음 | 파싱값 vs CALC 계산값 비교 미구현 |
| `CALC.calcAverageWage()` | ⚠️ 부분 구현 | OVERTIME 모듈 사용, 실제 명세서 미활용 |

### 필요한 역계산 흐름

```text
실제 명세서 업로드 (salary-parser.js)
        │
        ▼
파싱 결과: salaryItems (항목별 실제 지급액)
        │
        ├── profile (직종/직급/호봉/근속연수) 입력
        │         │
        │         ▼
        │   CALC.calcOrdinaryWage() → 예상 지급액 (항목별)
        │
        ▼
역계산 비교:
  항목별 (실제 - 예상) 차이 계산
        │
        ├── 차이 0: ✅ 일치
        ├── 차이 소폭 (±500원): 🟡 반올림 오차 (무시)
        └── 차이 대폭 (±1000원+): 🔴 불일치 → 원인 분석

검증 결과 저장:
  payslip_verify_{YYYY}_{MM}_result → localStorage
```

---

#### Task R13: 역계산 비교 엔진 구현

**Description:**
`salary-parser.js`의 파싱 결과와 `CALC.calcOrdinaryWage()`의 계산 결과를 항목별로 비교하는 함수를 구현한다. 동일 항목명 매핑, 허용 오차 처리, 결과 저장을 포함한다.

**항목 매핑 테이블 (명세서 항목명 → CALC 항목명):**

| 명세서 항목명 | CALC 항목명 | 비고 |
|------------|-----------|------|
| 기준기본급 | 기준기본급 | 직접 비교 |
| 근속가산기본급 | 근속가산기본급 | hasSeniority + seniorityYears 필요 |
| 능력급 | 능력급 | 직접 비교 |
| 상여금 | 상여금 | 직접 비교 |
| 가계지원비 | 가계지원비 | 지급월 여부 확인 |
| 장기근속수당 | 장기근속수당 | longServiceYears 필요 |
| 명절지원비 | 명절지원비(월할) | 명절 지급월만 존재 |
| 급식보조비 | 급식보조비 | DATA.allowances.mealSubsidy 비교 |
| 교통보조비 | 교통보조비 | DATA.allowances.transportSubsidy 비교 |
| 조정급 | 조정급 | profile.adjustPay 필요 |
| 자기계발별정수당 | 자기계발별정수당 | DATA.allowances.selfDevAllowance |
| 별정수당5 | 별정수당5 | DATA.allowances.specialPay5 |
| 리프레시지원비 | 리프레시지원비 | 2026~, 현재 CALC 미반영 (BUG-01) |

**Acceptance criteria:**
- [ ] `CALC.verifyPayslip(parsedData, profile)` 함수 구현
- [ ] 항목별 `{ name, actual, expected, diff, status }` 배열 반환
- [ ] status: '일치' / '허용오차' (±500원 이내) / '불일치' / '항목없음(실제만)' / '항목없음(예상만)'
- [ ] 역계산 결과를 `payslip_verify_{year}_{month}` 키로 localStorage 저장
- [ ] 총액 일치 여부 별도 표시

**Verification:**
- [ ] `2512 일반직 급여.pdf` 파싱 → 역계산 결과 콘솔 확인
- [ ] `2601 일반직 급여.pdf` 파싱 → 역계산 결과 콘솔 확인
- [ ] 기준기본급 일치 확인 (프로필과 명세서가 일치하면 정확히 0원 차이)

**Dependencies:** Phase 2 (BUG-01~05 수정 완료 후 역계산 정확도 향상)

**Files likely touched:**
- `calculators.js` (verifyPayslip 함수 추가)
- `salary-parser.js` (변경 없음, 입력만)

**Estimated scope:** Medium

---

#### Task R14: 역계산 검증 UI 구현

**Description:**
명세서 업로드 → 역계산 → 결과 시각화 화면을 구현한다. 기존 payroll 카드 시스템과 통합하거나 별도 패널로 구현한다.

**화면 구성:**
```text
[명세서 업로드] → 파싱 완료 (신뢰도: 85/100)
  ─────────────────────────────────────────
  항목별 비교                    실제    예상      차이
  ──────────────────────────────────────────────────
  ✅ 기준기본급               3,027,300  3,027,300    0
  ✅ 능력급                   1,075,700  1,075,700    0
  🔴 장기근속수당               110,000    130,000  -20,000 ← BUG-02
  🟡 근속가산기본급             214,080    214,000      +80 (반올림 오차)
  🔵 리프레시지원비              30,000         0  +30,000 (미반영 항목)
  ─────────────────────────────────────────
  📊 통상임금 합계             6,234,000  6,204,000  +30,000
  💡 시급 차이: 실제 29,828원 / 예상 29,685원 (+143원)
```

**Acceptance criteria:**
- [ ] 파싱 신뢰도 점수 표시
- [ ] 항목별 비교 테이블 (실제/예상/차이/상태 컬러)
- [ ] 총 통상임금 및 시급 비교
- [ ] "이 차이가 왜 발생했는지" 원인 링크 (알려진 버그면 버그 번호 표시)
- [ ] 불일치 항목이 있으면 "계산 오류 발견" 알림 표시

**Dependencies:** Task R13

**Files likely touched:**
- `payroll.js` (검증 카드 추가)
- `payroll-views.js` (검증 패널 렌더링)

**Estimated scope:** Medium

---

### Checkpoint R7: 역계산 검증 시스템 완료

- [x] 실제 명세서 업로드 → 역계산 → 결과 표시 동작 확인 (phase7-verify.js 23 PASS)
- [x] 알려진 버그(BUG-01~04)가 역계산에서 탐지됨 확인 (코드 검증)
- [ ] 신뢰도 95 이상 명세서 기준 핵심 항목 일치율 90% 이상 (실 명세서 필요)

---

## Phase 8: AI 인사이트 엔진 (다중 명세서 분석 → 패턴/이상 탐지)

> 목표: 여러 달의 명세서 역계산 결과를 집계하여 트렌드·이상 탐지·AI 리포트 생성  

---

#### Task R15: 다중 명세서 집계 및 이상 탐지

**Description:**
저장된 다중 명세서(payslip_verify_*)를 집계하여 월별 변화, 이상값, 규정 위반 가능성을 탐지한다.

**탐지 시나리오:**

| 시나리오 | 탐지 방법 | 심각도 |
|---------|---------|------|
| 특정 수당 갑자기 사라짐 | 전월 대비 100% 감소 | 🔴 High |
| 시간외수당 급증 (월 50h+ 초과) | 주 52h 한도 위반 가능성 | 🔴 High |
| 장기근속수당 금액 오류 | 예상값 vs 실제값 ±5% 이상 | 🔴 High |
| 리프레시지원비 미반영 (2026~) | 명세서에 없음 | 🟡 Medium |
| 가계지원비 홀수달 지급 이상 | 지급월 규정(3,4,5,6,7,8,10,11,12월) 불일치 | 🟡 Medium |
| 통상임금 월별 변동 5%+ | 규정 변경 없는 급격한 변동 | 🟡 Medium |

**Acceptance criteria:**
- [ ] `INSIGHT.analyzeHistory()` — 모든 payslip_verify_* 데이터 집계
- [ ] 월별 통상임금 트렌드 배열 반환
- [ ] 이상 탐지 결과 `{ type, month, detail, severity }` 배열 반환
- [ ] AI 리포트용 JSON 생성: `INSIGHT.generateAIReport()` → 구조화된 텍스트

**AI 리포트 형식:**
```json
{
  "period": "2025-10 ~ 2026-03",
  "employee": { "name": "...", "grade": "S1", "years": 10 },
  "summary": {
    "avgOrdinaryWage": 6200000,
    "avgOvertime": 350000,
    "discrepanciesFound": 2
  },
  "discrepancies": [
    { "month": "2026-01", "item": "리프레시지원비", "actual": 30000, "expected": 0, "diff": 30000, "cause": "BUG-01: 통상임금 미반영" },
    { "month": "2025-12", "item": "장기근속수당", "actual": 130000, "expected": 140000, "diff": -10000, "cause": "BUG-02: 25년+ 금액 오류" }
  ],
  "insights": [
    "10월~12월 시간외수당이 전월 대비 40% 증가. 연말 업무 증가로 추정.",
    "리프레시지원비가 2026-01부터 명세서에 등장. 통상임금 산입 확인 필요."
  ]
}
```

**Dependencies:** Task R14

**Files likely touched:**
- `insight-engine.js` (신규)

**Estimated scope:** Medium

---

#### Task R16: 인사이트 대시보드 UI

**Description:**
`dashboard.html` 또는 별도 패널에 인사이트 결과를 시각화한다.

**Acceptance criteria:**
- [ ] 월별 통상임금 트렌드 차트 (이미 있으면 연동)
- [ ] 이상 탐지 알림 카드 (심각도별 컬러)
- [ ] "AI에게 설명하기" 버튼 → JSON 리포트 클립보드 복사
- [ ] 탐지된 이슈별 "해결 방법" 링크 (해당 FAQ 또는 버그 번호로 이동)

**Dependencies:** Task R15

**Files likely touched:**
- `dashboard.js`, `dashboard.html`
- `insight-engine.js`

**Estimated scope:** Small

---

### Checkpoint R8: 인사이트 엔진 완료

- [ ] 3개월 이상 명세서 집계 시 트렌드 표시 확인 (실 명세서 필요)
- [x] 알려진 이상값(BUG-01, BUG-02) 자동 탐지 확인 (phase8-insight.js 18 PASS)
- [x] AI 리포트 JSON 형식 검증 (phase8-insight.js 18 PASS)

---

## Phase 9: 간호사 규정 강화 (Nurse-Specific Calculation)

> 목표: `nurse_regulation.json`의 간호사 전용 규정을 프론트엔드 CALC에 통합  
> 대상: 프리셉터 수당, 프라임팀 대체, 콜센터, 리커버리데이, 3교대 야간 규칙  

---

### 간호사 규정 현황

#### nurse_regulation.json에 있으나 CALC에 없는 항목

| 항목 | JSON 값 | CALC 현황 | 조항 |
|-----|--------|---------|------|
| 프리셉터 수당 | 200,000원/2주 | ❌ 없음 | 제63조의2 |
| 프라임팀 대체 가산 | 20,000원/일 | ❌ 없음 | 별도합의 |
| 콜센터 근무수당 | 30,000원/월 | ⚠️ DATA에만 있음 (allowances.callCenterPay) | 별도합의 |
| 리커버리데이 발생 조건 | 월 7일 초과 시 1일 | ❌ 없음 | 제32조 |
| 리커버리데이 누적 | 15일(간호부)/20일(타) | ❌ 없음 | 제32조 |
| 40세 이상 야간 제외 | age >= 40 → 야간 불가 | ❌ 검증 없음 | 제32조 |
| N-OFF-D 편성 금지 | forbidden_patterns | ❌ 없음 | 부속합의 |
| 야간 최대 월 9회 | hard_monthly_night_cap | ❌ 없음 | 부속합의 |
| 신규 간호사 교육 8주 급여 80% | 첫 4주 80% | ❌ 없음 | 제63조의2 |

---

#### Task R17: CALC 간호사 수당 항목 추가

**Description:**
`calculators.js`에 간호사 전용 수당 계산 함수를 추가한다.

```js
// 추가할 함수들:
CALC.calcNursePay(params)
  // 프리셉터 수당: isPreceptor(bool) × 200,000 × (weeks/2)
  // 프라임팀 대체: primeTeamDays × 20,000
  // 콜센터: isCallCenter(bool) × 30,000
  // 리커버리데이: nightShiftCount >= 7 → recoveryDays += 1
  //              누적 nightCount 15일마다 1일 추가

CALC.checkNurseScheduleRules(schedule)
  // 야간 9회 초과 경고
  // 40세 이상 야간 편성 경고
  // N-OFF-D 패턴 탐지
  // 교대 간격 16시간 미만 탐지
```

**Acceptance criteria:**
- [ ] `CALC.calcNursePay({ isPreceptor, preceptorWeeks, primeTeamDays, isCallCenter, nightShiftCount, cumulativeNightCount })` 구현
- [ ] 프리셉터: 2주 교육 → 200,000원 (일할 계산 포함)
- [ ] 프라임팀: 대체 일수 × 20,000원
- [ ] 리커버리데이 계산: `{ currentMonth: days, cumulative: days }` 반환
- [ ] `CALC.checkNurseScheduleRules(schedule)` — 위반 패턴 탐지 배열 반환
- [ ] `DATA`에 간호사 수당 상수 추가 (data.js 또는 별도 nurse-allowances.js)

**Verification:**
- [ ] 7회 야간근무 → recoveryDay 1일 발생 확인
- [ ] 15일 누적 → 추가 recoveryDay 확인
- [ ] N-OFF-D 패턴 → 경고 반환 확인

**Dependencies:** Phase 0 (R0 감사 완료) 후 진행

**Files likely touched:**
- `calculators.js` (calcNursePay, checkNurseScheduleRules 추가)
- `data.js` (간호사 수당 상수 추가)

**Estimated scope:** Medium

---

#### Task R18: 간호사 급여 시뮬레이터 강화

**Description:**
payroll.js의 급여 시뮬레이터 카드에 간호사 전용 입력 항목을 추가한다.

**추가 입력 항목:**
- 교대근무자 여부 (toggle)
- 야간근무 횟수 (이달)
- 프리셉터 여부 + 교육 주수
- 프라임팀 대체 일수
- 콜센터 근무 여부
- 누적 야간근무 횟수 (리커버리데이 계산용)

**Acceptance criteria:**
- [ ] 교대근무자 선택 시 간호사 전용 입력 폼 표시
- [ ] 리커버리데이 발생 여부 자동 계산 및 표시
- [ ] 간호사 수당 breakdown에 추가 항목 표시
- [ ] nurse_regulation.json 야간 배율 불일치(BUG-N-01) 수정 포함

**Dependencies:** Task R17

**Files likely touched:**
- `payroll.js` (카드 입력 추가)
- `payroll-views.js` (렌더링 추가)

**Estimated scope:** Medium

---

#### Task R19: nurse_regulation.json 야간수당 배율 수정 (BUG-N-01)

**Description:**
`night_22_to_06_and_holiday: 1.5`를 야간(2.0)과 휴일(1.5)로 분리한다.

**Acceptance criteria:**
- [ ] `"night_22_to_06": 2.0` + `"holiday_within_8h": 1.5` 분리
- [ ] `nurse-regulation.ts`의 `evaluateAllowanceScenario()` 참조 키 업데이트
- [ ] 시나리오 재검증 통과

**Dependencies:** None (독립 수정)

**Files likely touched:**
- `content/policies/2026/nurse_regulation.json`
- `server/src/services/nurse-regulation.ts`

**Estimated scope:** Small

---

### Checkpoint R9: 간호사 규정 강화 완료

- [x] 프리셉터/프라임팀/리커버리데이 계산 동작 확인 (phase9-nurse.js 23 PASS)
- [x] 40세 이상 야간 경고 표시 확인 (phase9-nurse.js)
- [x] BUG-N-01 수정 완료

---

## Phase 10: 퇴직금 강화 (Retirement Enhancement)

> 목표: 실제 명세서 기반 3개월 평균임금 계산, 평균임금 vs 통상임금 구분, 시나리오 정확도 향상  

---

### 퇴직금 현황 분석

| 구성요소 | 현재 상태 | 문제점 |
|---------|---------|------|
| `getLatestWage()` | 최근 명세서 1개의 grossPay 사용 | 3개월 평균 아님 |
| `calcAverageWage()` | OVERTIME 모듈 기반 계산 | 실제 명세서 미활용 |
| `ARCH-01` | SEV_PAY, SEV_MULTI 하드코딩 | DATA 참조 전환 미완료 |
| 평균임금 구성 | grossPay 전체 사용 | 비통상임금(가족수당 등) 포함 가능 |
| 임금피크 감액 | calcAllScenarios에 w60 = wage×0.6 | 운영기능직 보호 조항 미구현 |

### 퇴직금 관련 규정 핵심

| 조항 | 내용 | 현재 구현 |
|-----|-----|---------|
| 제52조 | 기본 퇴직금 = 1일 평균임금 × 30 × 근속연수 | ✅ |
| 평균임금 | (3개월 총 임금 + 시간외수당) / 역일수 | ⚠️ 부분 구현 |
| 제52조 누진배수 | 2001.08.31 이전 구간별 배수 | ✅ |
| 제57조 퇴직수당 | 2015.06.30 이전 요율별 가산 | ✅ |
| 제45조 임금피크 | 만 60세 공로연수 60% | ✅ |
| 운영기능직 보호 | 최저임금 120% 이하 감액 금지 | ❌ 미구현 |
| 중간정산 후 연속성 | 정산 이후 근속 리셋 | ✅ |

---

#### Task R20: 실제 명세서 기반 3개월 평균임금 계산

**Description:**
`retirement-engine.js`의 `getLatestWage()`를 개선하여 저장된 실제 명세서에서 3개월 평균임금을 자동 계산한다.

**평균임금 계산 공식 (제52조):**
```
평균임금 = (퇴직 전 3개월 총 임금) / (해당 기간 역일수)
월 기준 = 평균임금 × 30

포함: 기본급, 각종 수당, 시간외수당, 명절지원비, 가계지원비
제외: 실비 변상성 (출장비, 직책수당 중 실비 성격)
주의: 가족수당은 통상임금 제외지만 평균임금에는 포함
```

**Acceptance criteria:**
- [ ] `RetirementEngine.getThreeMonthAverage()` 구현
  - 저장된 payslip_* 데이터 중 최근 3개월 검색
  - 월별 grossPay 합계 / 역일수 합계
  - 3개월 미만 데이터 있을 때 경고 표시
- [ ] `autoLoad()` 업데이트: `getLatestWage()` → `getThreeMonthAverage()` 우선 사용
- [ ] 평균임금 구성 항목별 breakdown 표시
- [ ] "명세서 1개 기준" vs "3개월 평균 기준" 비교 표시

**Verification:**
- [ ] 2512/2601 두 개 명세서 있을 때 → 2개월 평균 계산 확인
- [ ] 3개월 미만 시 "데이터 부족" 경고 확인
- [ ] 단일 명세서와 평균 기준 퇴직금 차이 확인

**Dependencies:** Task R13 (payslip_verify 저장 구조 확립 후)

**Files likely touched:**
- `retirement-engine.js` (getThreeMonthAverage 추가, autoLoad 업데이트)

**Estimated scope:** Small

---

#### Task R21: ARCH-01 — retirement-engine.js DATA 참조 전환

**Description:**
`retirement-engine.js`의 하드코딩된 SEV_PAY, SEV_MULTI를 DATA 참조로 전환한다.  
(Phase 2의 Task R4와 동일하나, retirement-engine.js가 독립 모듈이라 별도 처리)

**현재 코드:**
```js
const SEV_PAY  = [ { min: 20, rate: 0.60 }, ... ];  // 하드코딩
const SEV_MULTI = [ { min: 30, multiplier: 52.5 }, ... ];  // 하드코딩
```

**목표 코드:**
```js
// DATA 접근을 지연 참조로 처리 (로드 순서 독립)
function getSevPay()   { return (typeof DATA !== 'undefined') ? DATA.severancePay : SEV_PAY_FALLBACK; }
function getSevMulti() { return (typeof DATA !== 'undefined') ? DATA.severanceMultipliersPre2001 : SEV_MULTI_FALLBACK; }
```

**Acceptance criteria:**
- [ ] SEV_PAY_FALLBACK, SEV_MULTI_FALLBACK으로 이름 변경 (fallback 명시)
- [ ] 실제 계산 시 DATA 우선 참조
- [ ] HTML 스크립트 로드 순서 확인 (data.js가 먼저)
- [ ] 퇴직금 계산 결과 변경 없음 확인

**Dependencies:** Phase 1 (R1 완료 후)

**Files likely touched:**
- `retirement-engine.js` L10~37

**Estimated scope:** Small

---

#### Task R22: 운영기능직 임금피크 보호 조항 구현

**Description:**
임금피크 시 운영기능직의 직무능력급이 최저임금 120% 이하로 감액되지 않도록 보호 로직을 추가한다.

**규정:** 제45조 단서 — "운영기능직은 당해 직무능력급이 최저임금의 120% 이하로 감액되지 않도록 한다"

**Acceptance criteria:**
- [ ] 2026년 최저임금 기준 DATA에 추가 (9,860원/시간 → 월 2,060,740원)
- [ ] `calcAllScenarios()`에서 `w60` 계산 시 운영기능직 최저임금 120% 체크
- [ ] 보호 조항 적용 시 실제 감액 제한값으로 대체
- [ ] 시나리오 결과에 "최저임금 보호 적용됨" 표시

**Dependencies:** Task R21

**Files likely touched:**
- `retirement-engine.js` (calcAllScenarios 수정)
- `data.js` (minimumWage 추가)

**Estimated scope:** Small

---

#### Task R23: 퇴직금 시나리오 UI 강화

**Description:**
`retirement.html`에 평균임금 계산 근거, 명세서 기반 데이터 표시, 운영기능직 보호 표시를 추가한다.

**추가 UI:**
- "평균임금 계산 근거" 접힘/펼침 상세 (3개월 명세서별 금액)
- "명세서 기반" vs "수동 입력" 탭 전환
- 보호 조항 적용 시 감액 제한 설명 표시
- 중간정산 권장 여부 자동 판단 알림

**Acceptance criteria:**
- [ ] 평균임금 breakdown 펼침 표시
- [ ] 명세서 자동 불러오기 / 수동 입력 전환
- [ ] 운영기능직이면 "최저임금 보호 적용됨" 뱃지 표시

**Dependencies:** Task R20, Task R22

**Files likely touched:**
- `retirement.html`, `retirement.js`

**Estimated scope:** Medium

---

### Checkpoint R10: 퇴직금 강화 완료

- [x] 3개월 평균임금 자동 계산 확인 (phase10-retirement.js 18 PASS)
- [x] DATA 참조 전환 완료 (ARCH-01)
- [x] 운영기능직 임금피크 보호 로직 동작 확인 (phase10-retirement.js)
- [x] 5가지 퇴직 시나리오 정확도 향상 확인 (phase10-retirement.js)

---

## 이 플랜과 기존 Track A/B 관계

```text
【2026-04-10 기준 완료】
✅ Track A: RAG Completion
   - regulation_versions (id=5 active), 145 chunks, 145/145 embeddings
   - FAQ 50개 임베딩 완료
✅ Track B: Admin & Content Operations
   - content_entries, content_revisions, approval_tasks, audit_logs 테이블 완비
   - adminOps.ts 전체 API 구현 + smoke-test 완료
   - draft→review→published 워크플로우 작동

【현재 진행 중】
🔴 Plan-Regulation-Unification (이 문서)
   Phase 0~5: 프론트엔드 계산 버그 수정 + 단일화
   Phase 6: union_regulation_admin.html

【다음 단계】
⏭️ DB 연결 (Supabase)
   - DATA_STATIC을 DB API 응답으로 교체
   - nurse_regulation.json을 DB regulation_versions 테이블로 이전
   - 두 시스템이 동일한 DB 출처 사용

⏭️ 운영팀 에이전트 실사용 (ops-orchestrator 활성화)
   - 비개발자가 union_regulation_admin.html 또는 자연어로 규정 수정
   - ops-reviewer 승인 후 published 전환
```

---

*이 플랜은 living document입니다. Phase 0 감사 결과에 따라 추가 버그가 발견되면 업데이트하세요.*

---

## Phase 6-10 상세 구현 계획 (2026-04-12 추가)

> **선행 완료**: Phase 0-5 (106 PASS / 0 FAIL)  
> **실행 순서**: Phase 6 → Phase 7 → Phase 9 → Phase 8 → Phase 10  
> **이유**: Phase 8은 Phase 7 데이터 구조에 의존, Phase 6/7/9는 독립

---

### 의존 관계 그래프

```text
regulation-constants.js (Phase 1 완료)
  ├─ Phase 6: Admin UI ─────────────────────────── 독립
  ├─ Phase 7: verifyPayslip() ──────────────────── 독립
  │   └─ Phase 8: insight-engine.js ─────────────── Phase 7 payslip 데이터 구조 의존
  ├─ Phase 9: calcNursePay() ───────────────────── 독립 (nurse-regulation.ts 참조)
  └─ Phase 10: RetirementEngine.getThreeMonthAverage()
       └─ ARCH-01 DATA 참조 (Phase 2에서 부분 완료) 의존
```

---

### Phase 6: Union Regulation Admin UI

**목표**: 비개발자가 단일 화면에서 프론트/백엔드 규정 상수를 확인하고 갱신

**수직 슬라이스 (기능 단위)**:
1. 규정 상수 목록 표시 (regulation-constants.js → HTML 렌더링)
2. nurse_regulation.json 동기화 상태 비교 패널
3. 값 수정 프리뷰 (data.js fallback 변경 내용 미리보기, DB 저장은 Phase DB연결 후)

**파일**:
- 신규: `admin/union_regulation_admin.html`
- 신규: `admin/union_regulation_admin.js` (독립 스크립트)
- 참조: `regulation-constants.js`, `content/policies/2026/nurse_regulation.json`

**아키텍처 결정**: DB 없이 file:// 또는 로컬서버에서 동작하는 순수 HTML+JS로 구현.
Supabase 연결은 DB 연결 Phase로 위임.

**수직 슬라이스 구현 순서**:
```
1. HTML 골격 + 상수 목록 테이블 렌더링
   → regulation-constants.js를 script태그로 로드 → 테이블에 조항/키/값 표시
2. nurse_regulation.json 항목과 대응 상수 비교 표시
   → fetch('/content/policies/2026/nurse_regulation.json') → 불일치 🔴 표시
3. 인라인 편집 + 클립보드 복사 (규정 수정 시 개발자에게 전달)
```

**TDD**: `tests/phase6-admin-ui.js`
```js
// 파일 존재 확인
assert(fs.existsSync('admin/union_regulation_admin.html'))
// regulation-constants.js의 모든 키가 테이블에 렌더링 대상으로 포함
const html = fs.readFileSync('admin/union_regulation_admin.html', 'utf8')
assert(html.includes('LONG_SERVICE_PAY'))
assert(html.includes('NIGHT_ALLOWANCE_MULTIPLIER'))
// nurse_regulation.json 동기화 비교 로직 존재
assert(html.includes('nurse_regulation') || html.includes('syncStatus'))
```

**완료 기준**:
- [ ] `admin/union_regulation_admin.html` 브라우저에서 열리고 상수 목록 표시
- [ ] nurse_regulation.json 불일치 항목에 시각적 경고 표시
- [ ] phase6-admin-ui.js PASS

---

### Phase 7: 역계산 검증 (verifyPayslip)

**목표**: 명세서 PDF 파싱값 vs CALC 계산값 비교로 오류 자동 탐지

**수직 슬라이스 (기능 단위)**:
1. `verifyPayslip(parsedData, calcResult)` 핵심 함수 — calculators.js에 추가
2. 단위 테스트로 BUG-01(리프레시), BUG-02(장기근속) 탐지 확인
3. app.js에 검증 결과 UI 섹션 추가 (오차 테이블)

**파일**:
- 수정: `calculators.js` — `verifyPayslip()` 함수 추가
- 수정: `app.js` — 역계산 검증 패널 추가

**함수 시그니처**:
```js
// parsedData: { items: [{name, amount}], totalGross }
// calcResult: CALC.calcAll(profile) 반환값
// returns: { matched: bool, discrepancies: [{item, expected, actual, diffPct}] }
CALC.verifyPayslip(parsedData, calcResult, { tolerance: 0.01 })
```

**허용 오차**: Math.abs(expected - actual) / expected ≤ 0.01 (1%) 또는 ≤ 500원

**TDD**: `tests/phase7-verify.js`
```js
// BUG-01 미수정 명세서로 테스트 시 리프레시 항목에서 불일치 탐지
const result = CALC.verifyPayslip(payslipWithoutRefresh, calcWithRefresh, {})
assert(result.discrepancies.some(d => d.item.includes('리프레시')))
// 일치하는 케이스는 matched: true
const perfect = CALC.verifyPayslip(correctPayslip, matchingCalc, {})
assert(perfect.matched === true)
```

**완료 기준**:
- [ ] `verifyPayslip()` 함수 구현, 1% 오차 내 일치 판정
- [ ] 오차 리스트 UI가 app.js에 표시
- [ ] phase7-verify.js PASS

**Phase 7 체크포인트**:
- [ ] 실제 명세서 2512/2601 역계산 결과 확인 (브라우저 검증)
- [ ] BUG-01(리프레시), BUG-02(장기근속) 역계산에서 탐지됨 확인

---

### Phase 9: 간호사 규정 CALC 통합

**Phase 7보다 먼저 실행 가능 (독립 슬라이스)**

**목표**: 프리셉터/프라임팀/리커버리데이/40세+ 야간 제외를 CALC에 구현

**수직 슬라이스**:
1. `CALC.calcNursePay(profile)` — 프리셉터·프라임팀·콜센터 수당 계산
2. `CALC.checkNurseScheduleRules(schedule)` — 야간 9회 초과/N-OFF-D/40세+ 경고
3. nurse_regulation.json BUG-N-01 수정 (야간 2.0 / 휴일 1.5 분리)
4. 급여 시뮬레이터 간호사 전용 입력 추가

**nurse_regulation.json 수정 (BUG-N-01)**:
```json
// Before
"night_22_to_06_and_holiday": 1.5
// After
"night_22_to_06": 2.0,
"holiday_within_8h": 1.5,
"holiday_over_8h": 2.0
```

**`calcNursePay` 규정 근거**:
| 항목 | 금액 | 근거 |
|------|------|------|
| 프리셉터 수당 | 200,000원 / 2주 | `welfare_and_training.new_hire_training.preceptor_allowance` |
| 프라임팀 대체 | 20,000원 / 일 | `shift_worker_rules.substitute_work.prime_team_allowance` |
| 리커버리데이 발생 | 7일 초과 야간 | `shift_worker_rules.recovery_day.monthly_over_7_days.trigger` |
| 40세+ 야간 제외 | 야간 배제 권고 | `shift_worker_rules.age_based_night_exclusion.age` |

**TDD**: `tests/phase9-nurse.js`
```js
// 프리셉터 2주 = 200,000원
assert(CALC.calcNursePay({ preceptorWeeks: 2 }).preceptorPay === 200000)
// 프라임팀 3일 = 60,000원
assert(CALC.calcNursePay({ primeTeamDays: 3 }).primeTeamPay === 60000)
// 야간 7회 → 리커버리데이 없음, 8회 → 1일 발생
assert(CALC.checkNurseScheduleRules({ nightShifts: 7 }).recoveryDays === 0)
assert(CALC.checkNurseScheduleRules({ nightShifts: 8 }).recoveryDays === 1)
// 40세 이상 야간 경고
assert(CALC.checkNurseScheduleRules({ age: 40, nightShifts: 1 }).warnings.length > 0)
// BUG-N-01 수정 확인
const reg = JSON.parse(fs.readFileSync('content/policies/2026/nurse_regulation.json'))
assert(reg...overtime.multipliers.night_22_to_06 === 2.0)
assert(reg...overtime.multipliers.holiday_within_8h === 1.5)
```

**완료 기준**:
- [ ] `calcNursePay()` 구현 완료
- [ ] `checkNurseScheduleRules()` 구현 완료
- [ ] BUG-N-01 nurse_regulation.json 수정
- [ ] phase9-nurse.js PASS

**Phase 9 체크포인트**:
- [ ] 7회 야간 → 리커버리데이 0일 / 8회 → 1일 확인
- [ ] 프리셉터 2주 → 200,000원 계산 확인
- [ ] BUG-N-01 수정 완료 및 기존 시나리오 회귀 없음

---

### Phase 8: AI 인사이트 엔진

**Phase 7 완료 후 실행 (payslip 데이터 구조 의존)**

**목표**: 다중 명세서 집계 + 이상 탐지 + AI 리포트 생성

**수직 슬라이스**:
1. `insight-engine.js` — 집계 함수 (월별 통상임금 추이, 항목별 이상 탐지)
2. 이상 탐지 규칙: 수당 소멸 / 시간외 급증(>40h) / 장기근속 계단 이상
3. `INSIGHT.generateAIReport(payslips)` → AI 가독 JSON
4. 대시보드 UI (`dashboard.js` + 인라인 HTML 섹션)

**파일**:
- 신규: `insight-engine.js`
- 수정: `app.js` 또는 신규 `dashboard.js` — 대시보드 UI

**`generateAIReport` 출력 구조**:
```json
{
  "period": "2025-10 ~ 2026-01",
  "summary": { "avgOrdinaryWage": 3200000, "anomalyCount": 2 },
  "anomalies": [
    { "month": "2025-12", "item": "장기근속수당", "expected": 140000, "actual": 130000, "rule": "BUG-02" }
  ],
  "trend": [{ "month": "2025-10", "ordinaryWage": 3180000 }]
}
```

**TDD**: `tests/phase8-insight.js`
```js
const { INSIGHT } = require('../insight-engine.js')
// 3개월 명세서 집계
const report = INSIGHT.generateAIReport(threeMonthPayslips)
assert(report.period.includes('~'))
assert(Array.isArray(report.anomalies))
// 장기근속 130,000 (BUG-02 미수정) → 이상 탐지
const bugPayslips = makeBugPayslips({ longServicePay: 130000 })
const r2 = INSIGHT.generateAIReport(bugPayslips)
assert(r2.anomalies.some(a => a.item.includes('장기근속')))
```

**완료 기준**:
- [ ] `INSIGHT.generateAIReport()` 구현
- [ ] 3가지 이상 탐지 규칙 작동 (수당 소멸, 시간외 급증, 장기근속)
- [ ] 대시보드 UI 브라우저 표시
- [ ] phase8-insight.js PASS

**Phase 8 체크포인트**:
- [ ] 3개월 명세서 집계 트렌드 표시 확인
- [ ] AI 리포트 JSON 유효성 확인 (JSON.parse 가능)

---

### Phase 10: 퇴직금 강화

**목표**: 3개월 평균임금 자동 계산, ARCH-01 DATA 참조, 운영기능직 임금피크 보호

**수직 슬라이스**:
1. `RetirementEngine.getThreeMonthAverage(payslips)` — 최근 3개월 payslip에서 평균임금 자동 추출
2. 데이터 부족 시 경고 + 수동 입력 fallback
3. ARCH-01 완결: `retirement-engine.js` SEV_PAY/SEV_MULTI → DATA 참조 (Phase 2에서 부분 진행)
4. 운영기능직 임금피크 보호: 평균임금이 최저임금 120% 미만 시 경고 + 보정 로직
5. UI: 퇴직금 계산화면에 평균임금 breakdown 탭 + 명세서 기반 vs 수동입력 비교

**핵심 함수**:
```js
// retirement-engine.js에 추가
RetirementEngine.getThreeMonthAverage = function(payslips) {
  // payslips: [{month, grossPay, ...}] 최근 순 정렬
  // returns: { average, months: 3, warning: null | 'insufficient_data' }
  const recent3 = payslips.slice(0, 3)
  if (recent3.length < 3) return { average: null, warning: 'insufficient_data' }
  return { average: Math.floor(recent3.reduce((s, p) => s + p.grossPay, 0) / 3), months: 3 }
}
```

**운영기능직 임금피크 보호**:
- 기준: 최저임금(2026: 9,860원) × 209h × 1.2 = 약 2,472,120원/월
- 평균임금이 이 기준 미만이면 `{ warning: 'wage_peak_protection', minWage: 2472120 }` 반환

**TDD**: `tests/phase10-retirement.js`
```js
const RE = require('../retirement-engine.js')
// 3개월 평균 계산
const result = RE.getThreeMonthAverage([{grossPay:3000000},{grossPay:3100000},{grossPay:2900000}])
assert(result.average === 3000000)
assert(result.warning === null)
// 데이터 부족 경고
const short = RE.getThreeMonthAverage([{grossPay:3000000}])
assert(short.warning === 'insufficient_data')
// DATA 참조 확인 (ARCH-01)
const DATA = require('./data.js').DATA
assert(RE.SEV_PAY === undefined || RE._usesDataRef === true) // 하드코딩 제거됨
// 운영기능직 임금피크 보호
const lowWage = RE.getThreeMonthAverage([{grossPay:2000000},{grossPay:2000000},{grossPay:2000000}])
assert(lowWage.warning === 'wage_peak_protection')
```

**완료 기준**:
- [ ] `getThreeMonthAverage()` 구현
- [ ] ARCH-01 DATA 참조 완결 (SEV_PAY/SEV_MULTI 하드코딩 제거)
- [ ] 운영기능직 임금피크 보호 로직 구현
- [ ] 퇴직금 UI 평균임금 breakdown 탭 추가
- [ ] phase10-retirement.js PASS

**Phase 10 체크포인트**:
- [ ] 3개월 평균임금 자동 계산 UI 확인
- [ ] ARCH-01 완결: retirement-engine.js에 하드코딩 SEV_PAY 없음 확인
- [ ] 5가지 시나리오 정확도 향상 확인

---

### 최종 체크포인트 (Phase 6-10 완료)

- [ ] `admin/union_regulation_admin.html` — 규정 상수 목록 + 동기화 상태 표시
- [ ] `CALC.verifyPayslip()` — 1% 오차 역계산 검증 작동
- [ ] `CALC.calcNursePay()` + `checkNurseScheduleRules()` — 간호사 수당 CALC 통합
- [ ] `insight-engine.js` — 3개월 집계 + 이상 탐지 + AI JSON 출력
- [ ] `RetirementEngine.getThreeMonthAverage()` — 명세서 기반 평균임금 계산
- [ ] nurse_regulation.json BUG-N-01 수정 완료
- [ ] 모든 phase6~10 테스트 PASS
- [ ] DB 연결 준비 완료: 두 시스템(프론트/백) 모두 단일 DB 출처 사용 가능 상태
