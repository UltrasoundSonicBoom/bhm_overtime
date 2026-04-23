# Calculator Registry

> 작성일: 2026-04-23 (Plan D Task 3)
> 모든 `CALC.*` 계산 함수 × DATA 참조 경로 × 규정 조항(hospital_guidelines_2026.md) 매핑.
> **이 매트릭스는 드리프트 감지의 기반.** DATA 값 변경 시 이 표에서 영향 범위를 먼저 확인.
> 규정 전문은 `data/full_union_regulation_2026.md` (canonical), 요약은 `data/hospital_guidelines_2026.md`.

---

## 1. CALC 함수 × DATA 의존성 매트릭스

`calculators.js` 에서 정의된 모든 함수를 행으로, DATA 참조 + 규정 근거를 열로 한 매트릭스.
grep 기준: `grep -nE "^    (calc|resolve|format|verify|check)[A-Z]" calculators.js` → **20개** 매칭.

| 함수 | calculators.js 라인 | 시그니처 (요약) | DATA 참조 경로 | 규정 근거 | 소비자 (어디서 호출) |
|------|--------------------|----|----|----|---|
| `resolvePayTable` | 15 | `(jobType) → payTableKey` | `DATA.jobTypes[jobType].payTable` | (매핑 테이블, 조항 없음) | `calcOrdinaryWage`, `calcPromotionDate`, `calcPayrollSimulation`, app.js |
| `_getRuleValue` | 28 | `(ruleSet, category, dotPath) → value` | ruleSet 내부 (DB overlay) | (내부 헬퍼, 조항 없음) | `calcOrdinaryWage` 내부 |
| `calcOrdinaryWage` | 39 | `(jobType, grade, year, extras?, ruleSet?)` | `DATA.payTables[*].{basePay, abilityPay, bonus, familySupport}`, `DATA.seniorityRates[]`, `DATA.longServicePay[]`, `DATA.allowances.{militaryService, mealSubsidy, transportSubsidy, selfDevAllowance, refreshBenefit, specialPay5, weeklyHours}` | 제43조~제45조 (통상임금 구성), 제46조 (근속가산), 제44조 (가족수당 제외) | app.js(급여 계산), payroll.js, pay-estimation.js, `calcPayrollSimulation` 내부 |
| `calcOvertimePay` | 150 | `(hourlyRate, extH, nightH, holidayH, isExtendedNight)` | `DATA.allowances.overtimeRates.{extended, night, extendedNight, holiday, holidayOver8}` | 제34조 (시간외·야간·휴일), 제47조 (야간 200% — data.js 주석) | app.js(시간외 탭), payroll.js, `calcPayrollSimulation` 내부 |
| `calcOnCallPay` | 190 | `(hourlyRate, standbyDays, callOuts, workHours, includesNight)` | `DATA.allowances.{onCallStandby, onCallTransport, onCallCommuteHours, overtimeRates.extended, overtimeRates.extendedNight}` | 제32조 (9)항, 온콜 별도합의 2021.11 | app.js(시간외 탭), payroll.js |
| `calcAnnualLeave` | 215 | `(hireDate, calcDate?)` | `DATA.annualLeave.{maxUnderOne, baseLeave, maxLeave}` | 제36조 (연차유급휴가) | app.js(휴가/홈 탭), payroll.js, leave-tab.js |
| `calcLongServicePay` | 248 | `(years) → {월수당, 구간}` | `DATA.longServicePay[]` (min/max/amount 구간 배열) | 제50조 (장기근속수당) | regulation.js(Q&A), payroll.js, `calcOrdinaryWage` 내부 |
| `calcFamilyAllowance` | 267 | `(numFamily, numChildren) → {월수당, breakdown}` | `DATA.familyAllowance.{spouse, generalFamily, maxFamilyMembers, child1, child2, child3Plus}` | 제49조 (가족수당) | app.js, profile.js, profile-tab.js, payroll.js, regulation.js, `calcPayrollSimulation` 내부 |
| `calcSeverancePay` | 303 | `(avgMonthlyPay, years) → {퇴직금, 적용계수}` | `DATA.severancePay[]` (min/rate 배열) | 제52조~제54조 (퇴직수당, 2015.6.30 이전) | **외부 호출자 없음** — 정의만 존재 (❓ 미사용 공개 함수) |
| `calcSeveranceFullPay` | 324 | `(avgMonthlyPay, totalYearsInt, hireDateStr)` | `DATA.severanceMultipliersPre2001[]`, `DATA.severancePay[]` | 제52조~제57조 (법정 퇴직금 + 누진배수 + 퇴직수당) | app.js(퇴직금 탭), payroll.js |
| `calcUnionStepAdjust` | 390 | `(grade, refDate?) → 누적 호봉 합계` | `DATA.unionStepEvents[]` (id/date/stepDelta/grades) | 단협 부속합의 (일회성 호봉 상향) | payroll.js (unionStepAdjust 계산) |
| `calcPromotionDate` | 410 | `(jobType, currentGrade, hireDate) → {예상승격일, 남은일수}` | `DATA.payTables[*].autoPromotion[grade].{years, next}`, `DATA.payTables[*].gradeLabels` | 제46조 (승급/호봉, 보수표 별표) | **외부 CALC 호출자 없음** — payroll.js는 profile.promotionDate 필드를 직접 사용 (❓ 사실상 미사용) |
| `calcNightShiftBonus` | 439 | `(nightShiftCount, prevCumulative?) → {야간근무가산금, 리커버리데이}` | `DATA.allowances.nightShiftBonus`, `DATA.recoveryDay.{monthlyTrigger, nurseCumulativeTrigger}` | 제32조 부속합의 2015.05 (야간가산금), 제32조 부속합의 (리커버리데이) | app.js(시간외 탭), payroll.js, `calcPayrollSimulation` 내부 |
| `calcParentalLeavePay` | 473 | `(monthlyWage, months) → {monthly[], total}` | 없음 (상한액 하드코딩: 250만/200만/160만) | 제28조 (휴직자 대우), 제37조 (육아휴직 급여) | app.js(Q&A), payroll.js |
| `calcAverageWage` | 514 | `(monthlyWage, monthsBack?) → {dailyAvgWage, monthlyAvgWage}` | 없음 — OVERTIME.calcMonthlyStats() 호출 | 제43조 (평균임금 정의) | app.js(퇴직금 탭), regulation.js |
| `formatNumber` | 555 | `(n) → string` | 없음 | 무관 | 전 파일 공통 |
| `formatCurrency` | 559 | `(n) → string + '원'` | 없음 | 무관 | 전 파일 공통 (129회 호출) |
| `calcPayrollSimulation` | 568 | `(params) → {지급내역, 공제내역, 실지급액}` | 복합 — `calcOrdinaryWage`, `calcFamilyAllowance`, `calcOvertimePay`, `calcNightShiftBonus` 재사용; `DATA.payTables[*].familySupport`, `DATA.allowances.{mealSubsidy, transportSubsidy}`, `DATA.deductions.*` | 제43조~제52조 (통상임금→퇴직금) | pay-estimation.js |
| `verifyPayslip` | 699 | `(parsedData, calcResult, options) → {matched, discrepancies}` | 없음 (입력 데이터 비교 로직만) | 제43조 (통상임금 기준 검증) | leave-tab.js |
| `calcNursePay` | 758 | `({preceptorWeeks, primeTeamDays}) → {preceptorPay, primeTeamPay, total}` | 없음 (상수 하드코딩: 200,000 / 20,000) | 제63조의2 (프리셉터), 제32조 부속합의 (프라임팀) | **외부 호출자 없음** — 정의만 존재 (❓ 미사용 공개 함수) |
| `checkNurseScheduleRules` | 775 | `({nightShifts, age, pattern[]}) → {recoveryDays, warnings[]}` | 없음 (상수 하드코딩: 7회 기준, 40세 기준) | 제32조 부속합의 (리커버리데이, 40세 야간 제외, N-OFF-D 금지) | **외부 호출자 없음** — 정의만 존재 (❓ 미사용 공개 함수) |

**주의사항:**
- `CALC.calcRetirement` 는 app.js:1347 에서 호출되나 `calculators.js` 에 정의가 없음 — **미존재 함수** (❓ 런타임 silently skipped: `try { CALC.calcRetirement(...) } catch(e) {}`).
- `CALC.calcServiceYears` 는 salary-parser.js:1352 에서 `CALC.calcServiceYears` 로 참조되나 실제로는 `PROFILE.calcServiceYears` 가 정의 (profile.js:129). **네임스페이스 오류** (❓ 런타임에 `undefined`).
- `_getRuleValue` 는 grep 패턴 (`^    (calc|resolve|format|verify|check)[A-Z]`)에 미포함 — 내부 헬퍼이며 공개 API 아님.

---

## 2. 규정 조항 → DATA 필드 역참조

단협 조항에서 DATA 필드로 역추적하는 표. 단협 개정 시 "제XX조가 바뀌면 어디 고쳐야?" 의 답.

| 규정 조항 | DATA 필드 | 현재 값 (data.js grep 기준) | 단협 조문 요약 (hospital_guidelines_2026.md 기반) |
|-----------|----------|--------------------------|-------------------------------------------------|
| 제34조 (연장근무) | `allowances.overtimeRates.extended` | `1.5` | 연장근무 150% |
| 제34조/제47조 (야간) | `allowances.overtimeRates.night` | `2.0` | 야간 200% (22:00~06:00) |
| 제34조 (통상근무자 연장→야간) | `allowances.overtimeRates.extendedNight` | `2.0` | 통상근무자가 연장→야간까지 시 200% |
| 제34조 (휴일 8h 이내) | `allowances.overtimeRates.holiday` | `1.5` | 휴일근무 150% (8시간 이내) |
| 제34조 (휴일 8h 초과) | `allowances.overtimeRates.holidayOver8` | `2.0` | 휴일근무 200% (8시간 초과) |
| 제34조 (휴일야간) | `allowances.overtimeRates.holidayNight` | `2.0` | 휴일야간 200% |
| 제34조 (공휴일 가산) | `allowances.overtimeRates.publicHoliday` | `0.5` | 공휴일 근무 50% 가산 |
| 제32조 온콜 별도합의 2021.11 | `allowances.onCallStandby` | `10000` | 온콜 대기 1일 10,000원 |
| 제32조 (9)항 온콜 교통비 | `allowances.onCallTransport` | `50000` | 출근 시 교통비 50,000원/회 |
| 제32조 (9)항 온콜 시간 인정 | `allowances.onCallCommuteHours` | `2` | 출퇴근 2시간 근무 인정 |
| 제32조 부속합의 2015.05 | `allowances.nightShiftBonus` | `10000` | 야간근무 1회당 10,000원 가산금 |
| 별표 (급식) | `allowances.mealSubsidy` | `150000` | 급식보조비 월 150,000원 |
| 별표 (교통) | `allowances.transportSubsidy` | `150000` | 교통보조비 월 150,000원 |
| 별도합의 2024.11 | `allowances.refreshBenefit` | `30000` | 리프레시지원비 월 30,000원 (2026.01~ 통상임금 산입) |
| 제43조 (교육훈련비) | `allowances.selfDevAllowance` | `40000` | 교육훈련비(구 자기계발별정수당) 월 40,000원 |
| (별정수당5) | `allowances.specialPay5` | `35000` | 별정수당5 월 35,000원 (❓ 단협 조항 미확인) |
| (군복무수당) | `allowances.militaryService` | `45000` | 군복무수당 월 45,000원 (2년 기준, 월할 계산) |
| (소정근로시간) | `allowances.weeklyHours` | `209` | 월 소정근로시간 209시간 (시급 기준) |
| 제32조 부속합의 리커버리데이 | `recoveryDay.monthlyTrigger` | `7` | 당월 7일 이상 야간 → 즉시 1일 부여, 7일 누적 차감 |
| 제32조 부속합의 리커버리데이 | `recoveryDay.nurseCumulativeTrigger` | `15` | 간호부 누적 15회당 1일 추가 부여 |
| 제32조 부속합의 리커버리데이 | `recoveryDay.otherCumulativeTrigger` | `20` | 시설·이송·미화 등 누적 20회당 1일 부여 (❓ `calcNightShiftBonus`는 이 값 미사용 — nurseCumulativeTrigger만 사용) |
| 제36조 (연차 1년 미만) | `annualLeave.maxUnderOne` | `11` | 1년 미만 월 1일, 최대 11일 |
| 제36조 (연차 기본) | `annualLeave.baseLeave` | `15` | 1년 이상 8할 출근 시 15일 |
| 제36조 (연차 상한) | `annualLeave.maxLeave` | `25` | 3년차부터 2년마다 1일 가산, 최대 25일 |
| 제36조 (연차 월 가산) | `annualLeave.underOneYear` | `1` | 1년 미만 월 1일 부여 |
| 제49조 (배우자 수당) | `familyAllowance.spouse` | `40000` | 배우자 40,000원 |
| 제49조 (가족 1인) | `familyAllowance.generalFamily` | `20000` | 가족 20,000원 (5인 이내) |
| 제49조 (가족 상한) | `familyAllowance.maxFamilyMembers` | `5` | 최대 5인 |
| 제49조 (자녀 1) | `familyAllowance.child1` | `30000` | 첫째 자녀 30,000원 |
| 제49조 (자녀 2) | `familyAllowance.child2` | `70000` | 둘째 자녀 70,000원 |
| 제49조 (자녀 3+) | `familyAllowance.child3Plus` | `110000` | 셋째 이상 110,000원 |
| 제50조 (5~9년) | `longServicePay[1]` | `{min:5, max:10, amount:50000}` | 5~9년 50,000원 |
| 제50조 (10~14년) | `longServicePay[2]` | `{min:10, max:15, amount:60000}` | 10~14년 60,000원 |
| 제50조 (15~19년) | `longServicePay[3]` | `{min:15, max:20, amount:80000}` | 15~19년 80,000원 |
| 제50조 (20년) | `longServicePay[4]` | `{min:20, max:21, amount:100000}` | 20년 100,000원 |
| 제50조 (21~24년) | `longServicePay[5]` | `{min:21, max:25, amount:110000}` | 21년 이상 +10,000 가산 (110,000원) |
| 제50조 (25년+) | `longServicePay[6]` | `{min:25, max:99, amount:140000}` | 25년 이상 +30,000 추가 가산 (140,000원) |
| 제52조~57조 (퇴직수당 1~4년) | `severancePay[4]` | `{min:1, rate:0.10}` | 1~4년 10% |
| 제52조~57조 (퇴직수당 5~9년) | `severancePay[3]` | `{min:5, rate:0.35}` | 5~9년 35% |
| 제52조~57조 (퇴직수당 10~14년) | `severancePay[2]` | `{min:10, rate:0.45}` | 10~14년 45% |
| 제52조~57조 (퇴직수당 15~19년) | `severancePay[1]` | `{min:15, rate:0.50}` | 15~19년 50% |
| 제52조~57조 (퇴직수당 20년+) | `severancePay[0]` | `{min:20, rate:0.60}` | 20년 이상 60% |
| 제52조~57조 (누진배수 2001이전) | `severanceMultipliersPre2001[]` | 18개 구간 (min:1~30) | 2001.8.31 이전 입사자 누진배수 (10년 × 15.5, 20년 × 33.0, 30년 × 52.5) |
| 제46조 (근속가산율) | `seniorityRates[]` | 5개 구간 (1~5: 2%, 5~10: 5%, 10~15: 6%, 15~20: 7%, 20+: 8%) | 2016.02.29 이전 입사자 한정 근속가산기본급률 |
| 단협 부속합의 (호봉 보정) | `unionStepEvents[]` | 1개 이벤트 (2026-02, J1/J2/J3/S1, +1호봉) | 2026년 노조협의 호봉 상향 |
| 제58조 (복지포인트) | (DATA에 수치 필드 없음) | — | 기본 700P, 근속 10P/년 (최대 300P) — ❓ DATA_STATIC에 구조화 필드 없음, FAQ/handbookTopics 텍스트에만 있음 |
| 제63조의2 (프리셉터) | `allowances.preceptorPay` | `200000` | 프리셉터 교육수당 (2주 단위 200,000원) — ❓ `calcNursePay`는 DATA 미참조, 상수 하드코딩 |
| 제32조 부속합의 (프라임팀) | (DATA 필드 없음) | 하드코딩 `20000` | 예비인력 대체근무 일 20,000원 — ❓ `calcNursePay`에서 직접 상수 사용, DATA 미반영 |

**주의:**
- "현재 값" 은 실제 `data.js` grep 결과에서 확인한 값.
- ❓ 표시 = 불일치 또는 확인 필요 항목 (코드 수정 금지, 기록만).

---

## 3. 이상 항목 및 확인 필요 목록

### 3-1. 미사용 공개 함수 (외부 호출자 없음)

| 함수 | calculators.js 라인 | 설명 |
|------|--------------------|----|
| `calcSeverancePay` | 303 | `calcSeveranceFullPay`와 별개의 단순 버전. 외부 호출자 없음. `calcSeveranceFullPay` 로 대체된 것으로 추정. |
| `calcNursePay` | 758 | 간호사 프리셉터·프라임팀 수당 계산. 외부 호출자 없음. |
| `checkNurseScheduleRules` | 775 | 야간근무 규정 준수 검사. 외부 호출자 없음. |
| `calcPromotionDate` | 410 | 승격 시뮬레이터. `CALC.calcPromotionDate` 외부 호출 없음. payroll.js는 `profile.promotionDate` 필드(날짜 문자열)를 직접 사용. |

### 3-2. 존재하지 않는 함수 호출

| 호출 위치 | 호출명 | 실제 정의 | 비고 |
|-----------|-------|----------|------|
| app.js:1347 | `CALC.calcRetirement(...)` | 미존재 | `try/catch`로 감싸져 있어 silently fail. 퇴직금 계산은 app.js:847 `calcRetirementEmbedded()` 가 실제 담당하며 내부에서 `CALC.calcSeveranceFullPay` 호출. |
| salary-parser.js:1352 | `CALC.calcServiceYears(...)` | `PROFILE.calcServiceYears` (profile.js:129) | 네임스페이스 오류. `CALC.calcServiceYears`는 undefined → 런타임 에러 또는 폴백. |

### 3-3. DATA ↔ 규정 값 불일치 의심

| 항목 | 관찰 | 비고 |
|------|------|------|
| 야간근무 규정 근거 | data.js:164 주석 `제47조`, hospital_guidelines:11 는 `제34조,제47조` 혼재 | 단협 제47조가 별도 조항인지 제34조 소항인지 확인 필요 |
| `recoveryDay.otherCumulativeTrigger` (20) | data.js:602에 정의되나 `calcNightShiftBonus`(line 439)는 `nurseCumulativeTrigger`(15)만 사용 | 시설·이송·미화 직종 누적 20회 기준이 코드에 반영되지 않음 |
| 프라임팀 20,000원 | `calcNursePay`:760 에 `PRIME_TEAM_DAILY = 20000` 하드코딩, DATA 필드 없음 | hospital_guidelines:8 "일 20,000원 가산" 과 일치하나 DATA_STATIC 미반영 |
| 프리셉터 200,000원 | `calcNursePay`:759 `PRECEPTOR_PER_2WEEKS = 200000` 하드코딩, DATA.allowances.preceptorPay=200000 별도 있음 | `calcNursePay`가 DATA.allowances.preceptorPay를 참조하지 않고 직접 하드코딩 — 드리프트 위험 |
| 생리휴가 공제 | hospital_guidelines:16 "기본급 일액의 9/10 공제" — DATA에 이 비율(0.9) 없음 | 코드 구현 확인 필요 |
| 장기재직 휴가 | hospital_guidelines 제42조 "10~19년 5일, 20년 이상 7일", data.js FAQ에는 "10년 5일, 20년 이상 10일" | ❓ 7일 vs 10일 불일치 — 단협 원문 확인 필요 |

---

## 4. 자동 검증 아이디어 (Plan E 후보)

위 "규정 조항 → DATA 필드" 매트릭스를 머신 리더블 JSON (`docs/architecture/calc-registry.json`) 으로 만들고, Vitest 테스트에서 각 DATA 경로 값이 레지스트리 기재 값과 일치하는지 assert. 단협 개정 시 md + JSON 두 군데 수정해야 테스트 통과 → 드리프트 조기 발견.

```js
// 예시 (Plan E 에서 구현)
describe('calc-registry ↔ DATA 일치성', () => {
  const registry = require('../../docs/architecture/calc-registry.json');
  registry.drift_check.forEach(({ path, expected }) => {
    it(`DATA.${path} === ${expected}`, () => {
      const actual = get(DATA, path);
      expect(actual).toBe(expected);
    });
  });
});
```

---

## 5. 결론

현재 Plan D 시점 (2026-04-23):

| 항목 | 개수 |
|------|------|
| CALC 함수 총 (calculators.js grep) | 20개 (내부 헬퍼 `_getRuleValue` 포함) / 공개 API 19개 |
| 매트릭스 행 수 (이 문서) | 21개 (함수별 1행) |
| DATA 참조 경로 고유 키 | 약 35개 |
| 규정 조항 매핑 확실한 것 | 제32조/제34조/제36조/제43조~제52조/제57조/제49조/제50조/제63조의2 등 16+ 조항 |
| 불확실/누락 (❓) | 7개 |
| 외부 호출자 없는 공개 함수 | 4개 (`calcSeverancePay`, `calcNursePay`, `checkNurseScheduleRules`, `calcPromotionDate`) |
| 미존재 함수 외부 호출 | 2개 (`CALC.calcRetirement`, `CALC.calcServiceYears`) |

후속 Plan E 에서 `calc-registry.json` 생성 + Vitest 자동 검증 구축 권장.
특히 `calcNursePay` 의 하드코딩 상수(`PRIME_TEAM_DAILY`) 를 `DATA.allowances` 로 이전하면 드리프트 위험 제거 가능.
