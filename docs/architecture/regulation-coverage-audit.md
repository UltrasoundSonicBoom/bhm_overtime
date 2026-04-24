# Regulation → Calculator/UI Coverage Audit

> 작성일: 2026-04-24 (Plan L Tier 4)
> 소스: `data/full_union_regulation_2026.md` (2025.10.23 단협 전문 전사 · 3,145 lines / 95 조), `data/2026_handbook.pdf` (canonical PDF)
> 목적: 규정의 모든 수치/공식 항목을 `calculators.js` + `DATA_STATIC` + UI 와 대조해 **구현 유무 + 누락 리스트** 산출. Plan M (누락 계산기 신규 구현) 의 입력 문서.

## 범례

- **상태 컬럼**:
  - ✅ **구현** — 계산기 + UI 노출 있음
  - 🟡 **부분** — DATA 또는 계산은 있으나 UI 노출/사용자 발견 경로 없음
  - ❌ **누락** — 계산기·UI 둘 다 없음
  - `N/A` — 수치 없는 서술적 조항 (계산 불필요) · HR 내부 절차 · 조직 운영
- **우선순위**:
  - **High** — 모든 조합원이 자주 사용 (시간외·연차·급여·퇴직금)
  - **Medium** — 조건부 사용 (휴직·가족수당 변경·특별휴가)
  - **Low** — 드물게 사용 (경조금 계산·보건직 특수 항목)

## 테이블 컬럼 규약

모든 감사 행은 다음 컬럼을 가진다:

| 조항 | 규정 내용 (요약) | 수치/공식 | 현재 구현 | UI 탭 | 상태 | 우선순위 |
|------|-----------------|-----------|----------|-------|------|---------|

- **조항**: `제XX조` 또는 `제XX조의Y` 또는 `<YYYY.MM>` 합의 이름
- **수치/공식**: 규정에 명시된 숫자/산식
- **현재 구현**: `CALC.함수명` 또는 `DATA.경로` 또는 `❌`
- **UI 탭**: `tab-overtime` 등 또는 `❌`
- **상태**: ✅ / 🟡 / ❌ / `N/A`
- **우선순위**: High / Medium / Low / `N/A`

## 목차

1. [제3장 인사](#제3장-인사)
2. [제4장 근로시간](#제4장-근로시간)
3. [제5장 임금 및 퇴직금](#제5장-임금-및-퇴직금)
4. [제6장 복리후생 및 교육훈련](#제6장-복리후생-및-교육훈련)
5. [제7장 안전보건 및 재해보상](#제7장-안전보건-및-재해보상)
6. [제8~10장](#제8-10장)
7. [별도 합의사항](#별도-합의사항)
8. [별첨](#별첨)
9. [요약 — 누락 리스트 (Plan M 입력)](#요약--누락-리스트)
10. [Plan M 초안 — 우선순위별 구현 후보](#plan-m-초안)

## 제3장 인사

> 출처: `data/full_union_regulation_2026.md` L92–351. 제3장은 대부분 서술적 인사원칙/조직 절차 조항이며, 수치·공식은 제한적이다.

| 조항 | 규정 내용 (요약) | 수치/공식 | 현재 구현 | UI 탭 | 상태 | 우선순위 |
|------|-----------------|-----------|----------|-------|------|---------|
| 제18조(12) 간호본부 배치전환 교육 | 간호직 동일/이종계열/병동→중환자실 교육일수 | 3일 / 6일 / 14일 | ❌ | ❌ | ❌ 누락 | Low |
| 제18조(12) 간호운영기능직 배치전환 교육 | 교대/비교대/수술장 교육일수 | 각 듀티별 1일 / 2일 / 10일 | ❌ | ❌ | ❌ 누락 | Low |
| 제18조(13) 야간 배치 제한 (간호운영기능직) | 야간근무 10년 이상 배치 금지 (희망자 예외) | 10년 | ❌ | ❌ | ❌ 누락 | Low |
| <2024.11> 장애인 처우개선수당 | 월 110시간 이하 단시간 장애인 | 30,000원/월 | ❌ | ❌ | ❌ 누락 | Low |
| 제19조(1) 조건부기간 | 신규 채용자 수습기간 | 3개월 | ❌ | ❌ | ❌ 누락 | Low |
| <2003.07> 단시간→정규직 경력 인정 | 6개월↑ 근무 시 경력 50% 인정 / 1년↑ 조건부 면제 | 50% / 1년 | ❌ | ❌ | ❌ 누락 | Low |
| 제20조(1) 승진 T/O | 4급 이하 T/O 발생 시 승진발령 한도 | 1개월 | ❌ | ❌ | N/A (HR 절차) | N/A |
| 제21조 명단통지 | 신규·퇴직자 명단 통보 기한 | 7일 / 1개월 | ❌ | ❌ | N/A (HR 절차) | N/A |
| 제23조 이의제기 | 부당 인사처분 이의제기 기한 | 10일 | ❌ | ❌ | N/A (HR 절차) | N/A |
| 제24조 정년 | 정년 연령 / 퇴직일 | 만 60세 / 12월 말일 | 🟡 retirement.js `_retPeakDate` 계산 (만 60세 + 임금피크 만 61세) | tab-payroll (퇴직금) | 🟡 부partial | Medium |
| 제26조(2)(2) 병가 후 공상휴직 | 업무상 상병 6개월간 병가 후 복직 불가 시 휴직 | 6개월 | 🟡 DATA.leaveOfAbsence '공상휴직' `tenure:true` | tab-leave (읽기 전용 표) | 🟡 부분 | Low |
| 제26조(1)(4) 육아휴직 대상 연령 | 만 8세 이하 또는 초2 이하 자녀 | 만 8세 / 초2 | 🟡 DATA.leaveOfAbsence '육아휴직' 설명 문자열 | tab-leave | 🟡 부분 | Low |
| 제26조(2)(6) 국외유학 재직요건 | 국외유학휴직 최소 재직기간 | 8년 | 🟡 DATA.leaveOfAbsence '국외유학휴직' condition | tab-leave | 🟡 부분 | Low |
| 제26조(2)(7) 자기계발휴직 재직요건 | 단계적 단축: 11→9→7→5년 | 5년 (2022~) / 10년↑ +6개월 | 🟡 DATA.leaveOfAbsence '자기계발휴직' condition="재직 5년 이상" | tab-leave | 🟡 부분 | Low |
| 제28조(2) 휴직자 대우 — 질병/공상 | (기본급+능력급+조정급+상여금) × 70% | 70% | 🟡 DATA.leaveOfAbsence '질병휴직'/'공상휴직' pay 문자열만 | tab-leave (표) | 🟡 부분 — 계산 미연동 | Medium |
| 제28조(5) 육아휴직 | 만 8세 이하, 3년 이내, 최초 1년 근속 산입, 무급 | 3년 / 최초 1년 산입 | 🟡 DATA.leaveOfAbsence '육아휴직' period/tenure; `CALC.calcParentalLeavePay` (고용보험 급여 계산) | tab-leave (표) · tab-payroll 미연동 | 🟡 부분 | Medium |
| 제28조(5) 육아휴직 급여 (고용보험) | 1~3개월 100% (상한 250만) / 4~6 100% (200만) / 7~12 80% (160만) | 250/200/160만 | ✅ `CALC.calcParentalLeavePay` (`calculators.js:432`) + DATA.leaveOfAbsence pay 문자열 | UI 진입점 없음 (계산기 존재) | 🟡 부분 — UI 미노출 | Medium |
| 제31조의2 <2020.10> 감정노동자 특별휴가 | 환자·보호자 폭언·폭행 피해 시 | 2일 이내 | 🟡 DATA.leaveQuotas `special_disaster` note="재해 3일, 교통차단 등"이지만 감정노동 2일 구분 없음 | tab-leave | 🟡 부분 — 유형 미분리 | Low |

**제3장 행 수: 17행** (수치 조항 13 + N/A 4)

각주:
- 나머지 제18조 (1)~(11), 제25조, 제27조, 제29조, 제30조, 제31조, 제31조의3 등은 모두 서술적·조직적 조항 (차별 금지·협의 원칙·인권보호 등)으로 수치 없음 → 행 미포함.
- <1999.06>~<2025.10> 다수 별도합의 사항 중 수치가 없는 협의·TF·홍보 관련 항목은 N/A로 행 미포함.

---

## 제4장 근로시간

> 출처: `data/full_union_regulation_2026.md` L352–651. **본 앱 핵심 계산 영역** — 시간외·온콜·리커버리·연차·특별휴가·청원휴가·유산휴가.

| 조항 | 규정 내용 (요약) | 수치/공식 | 현재 구현 | UI 탭 | 상태 | 우선순위 |
|------|-----------------|-----------|----------|-------|------|---------|
| **제32조(1) 기준근로시간** | 1일 8시간 / 주 40시간 / 주 5일 | 8h / 40h / 월 209h | ✅ `DATA.allowances.weeklyHours=209` + `CALC.calcOrdinaryWage` L130 `hourlyRate = monthlyWage / 209` | tab-overtime · tab-payroll | ✅ 구현 | **High** |
| **제32조(2)-1 간호직 리커버리데이** | 월 ≤6일 / 월 7일↑ → 1일 부여 + 누적 7일 차감 / 누적 15일 → 1일 | 6/7/15 | ✅ `CALC.calcNightShiftBonus` (`calculators.js:390`) + `DATA.recoveryDay.{monthlyTrigger:7, nurseCumulativeTrigger:15}` | tab-overtime · payroll.js L143 안내 | ✅ 구현 | **High** |
| **제32조(2)-2 시설·이송·미화 리커버리** | 누적 20일 야간마다 1일 | 20일 | ✅ `DATA.recoveryDay.otherCumulativeTrigger=20` + `CALC.calcNightShiftBonus` jobType 분기 | tab-overtime | ✅ 구현 (Plan F #6) | **High** |
| 제32조(3) 유해위험작업 단축 | 1일 6시간 / 주 35시간 (인가시 +2h/+12h) | 6h / 35h | ❌ | ❌ | ❌ 누락 | Low |
| 제32조(4) 통상근무 시간 | 9시 ~ 18시 | 09:00–18:00 | ❌ (상수 없음, UI 서술만) | ❌ | N/A (서술) | N/A |
| **제32조(6) 공휴일 근무 가산** | 법정공휴일 근무 시 통상임금 50% | 50% | 🟡 `DATA.allowances.overtimeRates.publicHoliday=0.5` — **but 미사용** (drift: `CALC.calcOvertimePay`는 holiday 1.5/2.0만 참조) | tab-overtime 안내만 | 🟡 부분 — DATA 있으나 calc 미연동 ¹ | **High** |
| 제32조(8) 간호부 야간 연령 제한 | 만 40세↑ 야간근무 미배치 원칙 | 40세 | ❌ | ❌ | N/A (HR 정책) | N/A |
| **제32조(9) 온콜 교통비** | 1회 5만원 | 50,000원 | ✅ `DATA.allowances.onCallTransport=50000` + `CALC.calcOnCallPay` (`calculators.js:193`) | tab-overtime (계산 진입점은 overtime 계산기 내) | 🟡 부분 — DATA/calc 있으나 UI 명시적 온콜 입력 없음 ² | Medium |
| 제32조(9) 온콜 출퇴근 인정시간 | 출퇴근 2시간 근무시간 인정 | 2시간 | ✅ `DATA.allowances.onCallCommuteHours=2` + `CALC.calcOnCallPay` | tab-overtime | 🟡 부분 | Medium |
| <2019.11> 온콜대기수당 | 1일당 1만원 (2022.01~) | 10,000원/일 | ✅ `DATA.allowances.onCallStandby=10000` + `CALC.calcOnCallPay` | UI 미노출 | 🟡 부분 | Medium |
| <2004.08> 야간근무가산금 (근본 6,000원) → <2015.05> 10,000원 | 야간근무 1일당 | 10,000원/회 | ✅ `DATA.allowances.nightShiftBonus=10000` + `CALC.calcNightShiftBonus` L391 | tab-overtime | ✅ 구현 | **High** |
| <2022.12> 예비간호인력 대체근무가산금 | 근무일당 2만원 | 20,000원/일 | ❌ | ❌ | ❌ 누락 | Low |
| <2021.11> 긴급 대체근무 통상 150% | 휴일 긴급 대체 시 | 150% | 🟡 `overtimeRates.holiday=1.5` 로 계산 가능하나 명시적 대체근무 입력 경로 없음 | ❌ | 🟡 부분 | Low |
| 제33조(1) 휴게시간 | 정오 1시간 | 60분 | ❌ (상수 없음) | tab-overtime 안내 | N/A (서술) | N/A |
| 제33조(2)(4) 휴게시간 미사용 → 시간외수당 | 미사용분 시간외 인정 | 수당화 | ❌ (자동 변환 로직 없음) | ❌ | ❌ 누락 | Medium |
| <2001.07> 교대 근무간 휴식 | 근무-근무 사이 16시간 보장 | 16시간 | ❌ | ❌ | N/A (정책) | N/A |
| <2020.10> 야간→다음근무 시차 | 최소 30시간 | 30시간 | ❌ | ❌ | N/A (정책) | N/A |
| **제34조(1) 연장근로 한도** | 1일 2시간 / 주 10시간 (부득이 시 1일 초과, 주 12h 상한) | 1일 2h / 주 10~12h | 🟡 `CALC.calcOvertimePay` 시간 계산은 되지만 한도 검증 없음 | tab-overtime | 🟡 부분 — 한도 경고 없음 | Medium |
| **제34조(5) 시급 공식** | 시급 = 통상임금 × 1/209 | 월급 ÷ 209 | ✅ `CALC.calcOrdinaryWage` L130 `hourlyRate = Math.round(monthlyWage / weeklyHours)` | tab-overtime · tab-payroll | ✅ 구현 | **High** |
| **제34조 + <2019.11> 시간외 15분 단위** | 15분 단위 계산 | 15분 | ✅ `DATA.allowances.overtimeUnit=15` | tab-overtime | ✅ 구현 | **High** |
| **제34조 연장 150%** | 연장근무 가산 | 150% | ✅ `overtimeRates.extended=1.5` + `CALC.calcOvertimePay` L161 | tab-overtime | ✅ 구현 | **High** |
| **제34조 야간 200%** | 야간근무 (22:00~06:00) 가산 | 200% | ✅ `overtimeRates.night=2.0` + `CALC.calcOvertimePay` L162 | tab-overtime | ✅ 구현 | **High** |
| **제34조 휴일근무** | 8h 이내 150% / 8h 초과 200% | 150% / 200% | ✅ `overtimeRates.holiday=1.5` / `holidayOver8=2.0` + `CALC.calcOvertimePay` L167-168 | tab-overtime | ✅ 구현 | **High** |
| **제35조 유급휴일** | 주휴·공휴일·근로자의 날·개원기념일·조합설립일 | 서술 | 🟡 제32조(6) 가산율로 부분 커버, 휴일 목록 자체는 캘린더 미노출 | tab-overtime (법정공휴일 버튼) | 🟡 부분 | Low |
| <2015.05>·<2025.10> 조합설립일 | 8/1 오전 반일 (복무 휴일 겹치면 그 주 금요일) | 9–13시 | ❌ | ❌ | N/A (HR 운영) | N/A |
| <2017.12>~<2018.12> 교육연수 공가 | 연 3일 (2019~) | 3일 | ✅ `DATA.leaveQuotas edu_training.quota=3` | tab-leave | ✅ 구현 | Low |
| <2022.12> 병원 온라인 필수교육 공가 | 연 3일 | 3일 | ✅ `DATA.leaveQuotas edu_mandatory.quota=3` | tab-leave | ✅ 구현 | Low |
| <2023.11> 헌혈 공가 | 연 1일 | 1일 | ✅ `DATA.leaveQuotas blood_donation.quota=1` | tab-leave | ✅ 구현 | Low |
| **제36조(1) 연차** | 8할 이상 출근 시 15일, 2년마다 +1일, 상한 25일 | 15 / +1/2y / 25 | ✅ `CALC.calcAnnualLeave` (`calculators.js:215`) + `DATA.annualLeave.{baseLeave:15, addPerTwoYears:1, maxLeave:25}` | tab-leave | ✅ 구현 | **High** |
| **제36조(2) 연차보전수당** | (기존-신법 산정일수) ÷ 23 × 통상임금 × 150% | ÷23 × 1.5 | ❌ | ❌ | ❌ 누락 ³ | Low |
| 제36조(5) 1년 미만 월차 | 월 개근 시 1일 부여, 최대 11일 | 1일/월, max 11 | ✅ `DATA.annualLeave.{underOneYear:1, maxUnderOne:11}` + `CALC.calcAnnualLeave` | tab-leave | ✅ 구현 | Medium |
| 제36조(4) 미사용 연차 수당화 | 다음해 1월 평균임금 지급 | 일액 × 미사용일수 | ❌ (자동 지급 계산 없음) | ❌ | ❌ 누락 | Medium |
| **제37조 생리휴가** | 월 1회 무급, 기본급 일액 9/10 공제 (2026.01~) | 12일/년 · 공제 90% | 🟡 `DATA.leaveQuotas menstrual.quota=12` + `leave.js` 공제 로직은 기본급 일액 100% 공제 (drift: 규정 9/10) ⁴ | tab-leave | 🟡 부분 — 공제율 drift | Medium |
| **제38조(1) 산전후 휴가** | 산전 90일 (쌍둥이 120) / 산후 45일 (쌍둥이 60) 보장 | 90/120, 45/60 | 🟡 `DATA.leaveQuotas maternity` note 문자열; `ceremony_birth.ceremonyDays=90` | tab-leave | 🟡 부분 — 쌍둥이 120일 분기 없음 | Medium |
| **제38조(2) 유산·사산** | 주수별 90/60/30/10/5일 | 28주↑90 / 22~27주60 / 16~21주30 / 12~15주10 / ≤11주5 | ✅ `DATA.leaveQuotas.miscarriageLeave` (5단계) | UI 미노출 (leaveQuotas.types에 유산/사산 id 없음) | 🟡 부분 — DATA만 존재 | Medium |
| 제38조(4) 임부 정기검진 | 월 1일 유급 | 1일/월 | ✅ `DATA.leaveQuotas pregnancy_checkup` note="월 1일 유급" | tab-leave | ✅ 구현 | Low |
| 제38조(7) 산전후 임금차액 보전 | 3개월째 차액 (병원급여 − 고용보험) | 차액 | ❌ | ❌ | ❌ 누락 | Low |
| 제39조 수유시간 | 1일 2회 × 30분 유급 | 2×30분 | ❌ (DATA·leaveQuotas에 항목 없음) | ❌ | ❌ 누락 | Low |
| <2017.12> 임신기 근로시간 단축 | 12주 이내/36주 이후, 1일 2시간 단축 | 2시간/일 | ❌ | ❌ | ❌ 누락 | Low |
| <2025.10> 배우자 임신검진 동행 | 10일 범위 (2026.01~) | 10일 | ✅ `DATA.leaveQuotas spouse_pregnancy.quota=10` | tab-leave | ✅ 구현 | Low |
| **제40조(1) 특별휴가 재해** | 수화재·중대재해 | 3일 | 🟡 `DATA.leaveQuotas special_disaster` note="재해 3일, 교통차단 등" | tab-leave | 🟡 부분 — 유형 미세분 | Low |
| 제40조(2) 교통차단 | 당국 지시/증명 기간 | 가변 | 🟡 `special_disaster` note 에 포괄 | tab-leave | 🟡 부분 | Low |
| **제40조(4) 공로연수** | 정년 퇴직자 1년 공로연수 (기준임금 × 60%) | 1년 · 60% | 🟡 `tab-payroll.html` L279-413 임금피크 옵션 A UI 존재. 계산 공식은 retirement.js에 `기준임금 × 0.6` 로 하드코딩 | tab-payroll (퇴직금 시나리오) | 🟡 부분 — DATA 상수 없음 ⁵ | Medium |
| **제41조(1) 본인결혼** | 5일 | 5일 + 경조금 30만 | ✅ `DATA.leaveQuotas ceremony_marriage_self.ceremonyDays=5, ceremonyPay=300000` + `DATA.ceremonies` | tab-leave | ✅ 구현 | **High** |
| **제41조(2) 자녀결혼** | 1일 | 1일 + 10만 | ✅ `DATA.leaveQuotas ceremony_marriage_child` (1일 / 10만) | tab-leave | ✅ 구현 | Medium |
| **제41조(3) 배우자 출산** | 10일 | 10일 + 10만 | ✅ `DATA.leaveQuotas ceremony_spouse_birth` (10일 / 10만) | tab-leave | ✅ 구현 | **High** |
| **제41조(4) 배우자/부모 사망** | 5일 | 5일 + 30만 (배우자 100만) | ✅ `DATA.leaveQuotas ceremony_death_spouse` (5일/100만) + `ceremony_death_parent` (5일/30만) | tab-leave | ✅ 구현 | **High** |
| **제41조(5) 자녀·자녀배우자 사망** | 3일 | 3일 + 30만 | ✅ `DATA.leaveQuotas ceremony_death_child` (3일/30만, 자녀배우자 경조금 없음) | tab-leave | ✅ 구현 | Medium |
| **제41조(6) 조부모·외조부모 / 형제자매 사망** | 3일 | 3일 + 5만 | ✅ `DATA.leaveQuotas ceremony_death_grandparent` / `ceremony_death_sibling` (3일/5만) | tab-leave | ✅ 구현 | Medium |
| **제41조(7) 입양** | 20일 | 20일 | ✅ `DATA.leaveQuotas ceremony_adoption.ceremonyDays=20` | tab-leave | ✅ 구현 | Low |
| 제42조(1)(2)(3) 예비군·민방위·법원 | 소집·출두·야간훈련 익일 휴가 | 해당일 | 🟡 `DATA.leaveQuotas military_reserve` note 포괄 | tab-leave | 🟡 부분 — 법원 출두 미분리 | Low |
| <2021.11> 가족돌봄휴가 | 연 2일 유급 (다자녀/장애·한부모 3일) | 2일 / 3일 | ✅ `DATA.leaveQuotas family_care_paid.quota=2` note="다자녀/장애아 3일" | tab-leave | ✅ 구현 | Medium |
| 보수규정 가족돌봄 무급 | 연 최대 10일 | 10일 | ✅ `DATA.leaveQuotas family_care_unpaid.quota=10` | tab-leave | ✅ 구현 | Low |
| **<2025.10> 장기재직휴가** | 10~19년 5일 / 20년↑ 7일 (2026.01~) | 5일 / 7일 | 🟡 `DATA.leaveQuotas long_service` note="10년↑ 5일, 20년↑ 7일" (quota 미지정) | tab-leave | 🟡 부분 — 구간별 자동 부여 미구현 | Medium |

**제4장 행 수: 52행** (수치·공식 45 + N/A 7)

각주:
- ¹ `overtimeRates.publicHoliday=0.5` 는 `data.js:169` 에 정의되어 있으나 `calculators.js` 어디서도 참조되지 않음 → **DATA drift**. 제32조(6) 공휴일 50% 가산은 현재 계산기에서 별도 처리 없음.
- ² 온콜 계산은 `CALC.calcOnCallPay` 로 완비되어 있으나 tab-overtime UI에 온콜 입력 폼(standbyDays / callOuts)이 없음. `calcPayrollSimulation` 내부에서만 호출 가능 추정.
- ³ 제36조(2) 연차보전수당은 2004.6.30 재직자 경과규정이므로 현 시점 신규 사용 없음 → Low 우선순위지만 역사적 미구현.
- ⁴ `leave.js:244-245` 주석상 "basePay 공제: 기본급 월액 / 30 × 일수 (생리휴가 등)" 이지만 2026.01 시행된 9/10 공제율이 반영되어 있는지 `leave.js` 실제 계산 로직을 추가 확인 필요. 본 감사에서는 주석 기준 drift로 표시.
- ⁵ 공로연수 60% 는 `retirement.js` 에 하드코딩된 것으로 추정되며 `DATA_STATIC` 에 상수로 분리되어 있지 않음 → SoT 관점에서 drift.

---
