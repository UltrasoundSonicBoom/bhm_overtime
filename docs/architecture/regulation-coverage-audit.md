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
| 제24조 정년 | 정년 연령 / 퇴직일 | 만 60세 / 12월 말일 | 🟡 retirement.js `_retPeakDate` 계산 (만 60세 + 임금피크 만 61세) | tab-payroll (퇴직금) | 🟡 부분 | Medium |
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

## 제5장 임금 및 퇴직금

> 출처: `data/full_union_regulation_2026.md` L652–988. **급여·시간외·퇴직금의 SoT 영역** — 통상임금 정의, 가족수당, 장기근속, 상여금, 퇴직금 지급률, 퇴직수당.

| 조항 | 규정 내용 (요약) | 수치/공식 | 현재 구현 | UI 탭 | 상태 | 우선순위 |
|------|-----------------|-----------|----------|-------|------|---------|
| 제43조 임금의 정의 | 임금 = 노동력 대가 일체 | 서술 | N/A | ❌ | N/A (정의) | N/A |
| **<2016.05>·<2018.12> 기본급 구성** | 기준기본급 + 근속가산기본급 + (승급조정급 또는 군복무수당) | 3개 구성 | ✅ `CALC.calcOrdinaryWage` breakdown 에 `기준기본급`·`근속가산기본급`·`군복무수당`·`승급조정급` 분리 | tab-payroll | ✅ 구현 | **High** |
| **제44조 통상임금 구성 (16요소)** | 기준기본급·근속가산·군복무·능력급·상여·가계지원·조정급·승급조정·장기근속·별정·직책·업무보조·급식·교통·명절·교육훈련 | 16개 | ✅ `CALC.calcOrdinaryWage` breakdown (`calculators.js:106-126`) 에 16개 모두 산입 (가족수당 제외 — 제44조 2항) | tab-payroll | ✅ 구현 | **High** |
| 제45조(1) 임금인상 | 매년 1월 단체교섭 | N/A | N/A (연례 갱신 프로세스) | ❌ | N/A (HR 절차) | N/A |
| <2005.09> 단시간근무자 인상률 | 정규직 인상률 이상 | ≥ 정규직 | ❌ | ❌ | N/A (HR 정책) | N/A |
| **<2019.11> 임금피크제** | 정년 이전 1년, 보수 60% 지급 (공로연수 1년) | 1년 · 60% | 🟡 `retirement.js:148` 임금피크 시뮬레이터에서 60% 하드코딩 — DATA 상수 없음 ¹ | tab-payroll (퇴직금 탭) | 🟡 부분 | Medium |
| <2019.11> 임금피크 적용 제외 | 입사일로부터 5년 이내 정년 도달자 | 5년 | ❌ | ❌ | ❌ 누락 | Low |
| <2021.11> 운영기능직 임금피크 하한 | 직무능력급이 최저임금 120% 이하로 미감액 | 120% | ❌ | ❌ | ❌ 누락 | Low |
| **<2022.12> 임금피크 선택제** | 옵션A: 공로연수 1년+60% / 옵션B: 공로연수 미부여+100% (2024~) | A/B 선택 | 🟡 `tab-payroll.html` L279-413 옵션 A/B UI 존재 (retirement.js) · DATA 상수 없음 ¹ | tab-payroll | 🟡 부분 — 하드코딩 | Medium |
| 제46조 정기승급 | 입사 익월 1호봉씩 | 월 1호봉 | 🟡 `DATA.payTables[직군].autoPromotion` 연차 테이블 + `calcOrdinaryWage` yearIdx | tab-payroll | 🟡 부분 — 자동승급 연수는 있으나 입사 익월 트리거는 없음 | Medium |
| <2005.09>·<2012.09> 운영기능직 한계호봉 | 10→8→6호봉 | 6호봉 (최종) | ❌ (DATA.payTables 에는 8년치 호봉 배열; 한계호봉 상수 없음) | ❌ | ❌ 누락 | Low |
| <2008.09> 운영기능직 자동승급제 | 5등급 4년 / 4등급 7년 / 3등급 9년 초과 자동승진 | 4/7/9년 | 🟡 `DATA.payTables.운영기능직.autoPromotion` (A1→A2: 4년, A2→A3: 7년, A3→C1: 7년) — 규정 9년과 drift ² | tab-payroll | 🟡 부분 — drift 의심 | Medium |
| <2021.11> 운영기능직 경력수당 | 2015.7.1 이후 입사, A1→A2 소멸경력 120,000원/연 | 120,000원/연 | ❌ | ❌ | ❌ 누락 | Low |
| <2024.11> 환경유지지원직 경력수당 | SA1→SA2 소멸경력 105,600원/연 (2025~) | 105,600원/연 | ❌ | ❌ | ❌ 누락 | Low |
| **제47조 연장·야간·휴일수당** | 통상임금 가산 지급 | 150/200/150% | ✅ 제34조와 동일 — `overtimeRates` + `CALC.calcOvertimePay` | tab-overtime | ✅ 구현 | **High** |
| **제47조 일직·숙직비** | 1일 50,000원 | 50,000원 | ✅ `DATA.allowances.dutyAllowance=50000` | UI 진입점 없음 | 🟡 부분 — DATA 만 존재 | Low |
| **제48조(1) 임금지급일** | 매월 17일 (의사직 25일 / 단시간 익월 5일) | 17일 | 🟡 `DATA.faqs`/`handbook` 텍스트 안내만. 상수/계산 로직 없음 | tab-payroll 안내 | 🟡 부분 — 상수 없음 | Low |
| **제49조 가족수당** | 배우자 40k / 일반가족 20k / 자녀 1째 30k · 2째 70k · 3째+ 110k / 최대 5인 | 40k/20k/30k/70k/110k | ✅ `DATA.familyAllowance.{spouse:40000, generalFamily:20000, maxFamilyMembers:5, child1:30000, child2:70000, child3Plus:110000}` + `CALC.calcFamilyAllowance` (`calculators.js:267`) | tab-payroll (계산) | ✅ 구현 | **High** |
| **제50조 장기근속수당** | 5~9년 5만 / 10~14년 6만 / 15~19년 8만 / 20년+ 10만 | 5/6/8/10만 | ✅ `DATA.longServicePay` (`data.js:177-185`) + `CALC.calcLongServicePay` (`calculators.js:248`) + `calcOrdinaryWage` L83-87 | tab-payroll | ✅ 구현 | **High** |
| **제50조 장기근속 가산금** | 21년+ +1만 / 25년+ +3만 (ADDITIVE) | 11만 / 14만 | ✅ `DATA.longServicePay` 21~24년 110,000원 / 25년+ 140,000원 (BUG-02/03 수정 완료) | tab-payroll | ✅ 구현 | **High** |
| **제51조 상여금 (27직급 연 금액표)** | 일반직 9 + 운영기능 9 + 환경유지 9 직급별 연 상여 | 834,000~2,908,800 | ✅ `DATA.payTables[직군].bonus[grade]` 27셀 모두 정의 (`data.js:47-51, 86-90, 125-129`) + `calcOrdinaryWage` 월할 반영 | tab-payroll | ✅ 구현 | **High** |
| <2017.12>~<2024.11> 군복무수당 | 36k→45k/월, 2018~ 직급연차 미산입, 2018/2015이후 월할 지급 | 45,000원/월 | ✅ `DATA.allowances.militaryService=45000` + `calcOrdinaryWage` L76-81 월할 로직 | tab-payroll | ✅ 구현 | Medium |
| <2017.12>·<2020.10> 5월 명절지원비 | 정액 500,000원 → (기본급+조정급1/2)×50% | (기본급+조정급/2)×50% | ✅ `calcOrdinaryWage` L103 `holidayBonusPerTime = (monthlyBase + adjustPay/2) × 0.5` + `calcPayrollSimulation` isHolidayMonth 플래그 | tab-payroll | ✅ 구현 | **High** |
| <2022.12>~<2024.11> 교육훈련비 | 10만 일시 → 25,000원 → 40,000원/월 (2024~ 통상 산입) | 40,000원/월 | ✅ `DATA.allowances.selfDevAllowance=40000` + `calcOrdinaryWage` L97,123 breakdown `교육훈련비` | tab-payroll | ✅ 구현 | Medium |
| <2025.10> 리프레시지원비 | 매년 360,000원 (월 30,000원 환산) | 30,000원/월 | ✅ `DATA.allowances.refreshBenefit=30000` + `calcOrdinaryWage` L98-100,125 | tab-payroll | ✅ 구현 | Medium |
| **제52조(1) 퇴직금 지급률 표** | 근속 1~30년 지급률 1~52.5개월 (2001.08.31 이전 누진배수) | 1 / 2 / 3.5 / ... / 52.5 | ✅ `DATA.severanceMultipliersPre2001` 18행 (`data.js:562-581`) + `CALC.calcSeveranceFullPay` (`calculators.js:305`) | tab-payroll (퇴직금) | ✅ 구현 | **High** |
| **제52조(1) 법정 퇴직금** | 1년+ 1개월분 평균임금 × 근속년수 | 평균임금 × N | ✅ `CALC.calcSeveranceFullPay` L323 `baseSeverance = avgMonthlyPay × preciseYears` | tab-payroll | ✅ 구현 | **High** |
| 제52조(1) 단수 계산 | 6개월↑ = 1년 / 6개월 미만 월할 | 6개월 경계 | 🟡 `calcSeveranceFullPay` 은 일 단위 정밀 (`preciseYears = totalDays/365`) — 규정의 6개월 반올림과 비교 drift 가능 ³ | tab-payroll | 🟡 부분 | Low |
| 제52조(2) 퇴직금 지급기한 | 퇴직일로부터 15일 이내 | 15일 | N/A (사용자 계산 불필요, HR 절차) | ❌ | N/A (HR 절차) | N/A |
| 제52조(3) 중간정산 재원 | 전년 충당금의 12% | 12% | ❌ | ❌ | ❌ 누락 | Low |
| **제52조(4) 사학연금 2016.03+ 분리** | 사학연금 가입일 전일까지 근속+평균임금으로 분리 산정 | 2016.03.01 | ❌ (`calcSeveranceFullPay` 는 cutoff2001/cutoff2015 만 분기, 2016 사학연금 컷오프 없음) | tab-payroll | ❌ 누락 | Medium |
| **제53조(1) 퇴직수당 5구간** | 20년↑ 60% / 15~19 50% / 10~14 45% / 5~9 35% / 1~4 10% | 10/35/45/50/60% | ✅ `DATA.severancePay` (`data.js:353-359`) + `calcSeveranceFullPay` L341-347 (2015.06.30 이전 입사자) | tab-payroll | ✅ 구현 | **High** |
| 제53조(2) 만 60세 이후 퇴직자 | 만 60세 직전 평균임금 기준 | 만 60세 컷오프 | 🟡 `retirement.js` 임금피크 전후 평균임금 분기 로직은 있으나 제53조(2) 명시적 구현 여부 추가확인 필요 | tab-payroll | 🟡 부분 | Low |
| <2016.05> 근속가산기본급/명절지원비 조정급 가산 | 조정급 1/2 가산 | +조정급/2 | ✅ `calcOrdinaryWage` L69 `(monthlyBase + adjustPay/2) × rate` + L103 명절지원비 동일 적용 | tab-payroll | ✅ 구현 | Medium |
| 제54조 공제금 | 소득세·주민세·조합비·사학연금·건강보험 등 | 다항목 | 🟡 `calcPayrollSimulation` L608-634 에 건강보험·장기요양·국민연금·고용보험·소득세·주민세 구현 — 조합비·새마을금고는 미포함 | tab-payroll | 🟡 부분 | Medium |
| 제55조 비상시 지불 | 결혼·출산·사망·입학·휴직·퇴직·해고·재해 시 임금 선지급 | 사유 6가지 | N/A (HR 절차) | ❌ | N/A (HR 절차) | N/A |
| 제56조 임금인하 금지 | 기본급여 수준 인하 금지 | N/A | N/A (정책) | ❌ | N/A (정책) | N/A |
| **제57조 휴업수당** | 정전·단수·기계보수·병원 귀책 휴업 시 평균임금 100% | 100% | ❌ (`calcAverageWage` 존재하나 휴업 시나리오 진입점 없음) | ❌ | ❌ 누락 | Low |

**제5장 행 수: 30행** (수치·공식 22 + N/A 8)

각주:
- ¹ 임금피크제 60% 지급률이 `retirement.js` 코드에 하드코딩됨 (제4장 각주 ⁵와 동일) — `DATA.wagePeak` 상수 분리 필요.
- ² 제45조(1) <2008.09> 에는 "3등급 9년 초과자" 자동승진이고, `DATA.payTables.운영기능직.autoPromotion.A3.years=7` 은 "A3→C1 7년" 으로 설정되어 있음. A3가 3등급에 해당한다면 9년과 drift. 추가 규정-코드 매핑 검증 필요 (Plan M 후보).
- ³ `calcSeveranceFullPay` 의 `preciseYears = totalDays / 365` 는 규정의 "6월 이상은 1년, 6월 미만 월할" 과 다르게 일 단위 정밀 계산. 사용자에게 더 유리할 수도 불리할 수도 있는 미세 drift.

---

## 제6장 복리후생 및 교육훈련

> 출처: `data/full_union_regulation_2026.md` L989–1398. **수당 안내·경조금·복지포인트·교육** 영역 — 일부 규정 텍스트 표현만 노출되고 계산기 없는 항목이 많다.

| 조항 | 규정 내용 (요약) | 수치/공식 | 현재 구현 | UI 탭 | 상태 | 우선순위 |
|------|-----------------|-----------|----------|-------|------|---------|
| **제58조(1) 가계지원비 (27직급 연 금액표)** | 일반직 7,634,410~15,941,330 / 운영 4,962,370~10,361,870 / 환경유지 1,686,500~2,548,900 | 27셀 (연) | ✅ `DATA.payTables[직군].familySupport[grade]` 27셀 (`data.js:52-56, 91-95, 130-134`) + `calcOrdinaryWage` L55 `monthlyFamilyPaid = annualFamily/11` + `calcPayrollSimulation` L583 11개월 지급 분기 | tab-payroll | ✅ 구현 | **High** |
| **제58조(1) 가계지원비 지급월** | 3,4,5,6,7,8,10,11,12월 + 설·추석월 = 11개월 (1월·9월 미지급) | 11개월 | ✅ `DATA.familySupportMonths=[3,4,5,6,7,8,10,11,12]` (`data.js:596`) + `calcPayrollSimulation` isFamilySupportMonth / isHolidayMonth 플래그 | tab-payroll | ✅ 구현 | **High** |
| **제58조(1)-1 맞춤형 복지 기본포인트** | 40만원 → (2020) 60만P → (2025) +10만P = 700P | 700P (2025~) | 🟡 `DATA.faqs`/`handbook` 에 "기본 700P" 텍스트만 (`data.js:464, 544`) — 계산기/DATA 구조화 항목 없음 ¹ | tab-browse | 🟡 부분 — 설명만 | Medium |
| **제58조(1)-1 맞춤형 복지 근속포인트** | 1년당 1만원 (최대 30만원) | 10P/년 · max 300P | 🟡 텍스트만 (`data.js:464,544`) — 계산기 없음 | tab-browse | 🟡 부분 | Medium |
| **제58조(1)-1 맞춤형 복지 가족포인트** | 배우자 10만 / 1·2자녀 10만 / 3자녀+ 20만/인 / 기타가족 5만/인 (4인 이내) | 10/10/20/5만 | ❌ (DATA/CALC 모두 없음) | ❌ | ❌ 누락 | Medium |
| <2019.11> 자녀출산축하포인트 | 첫째 1,000P / 둘째 2,000P / 셋째+ 3,000P (2020~) | 100~300만 | ❌ | ❌ | ❌ 누락 | Low |
| <2017.12> 자녀학자금포인트 | 만 16세+ 7년간 연 1,200P(120만원) | 120만/년 | 🟡 `DATA.faqs`/`handbook` 텍스트 안내만 — 계산기 없음 | tab-browse | 🟡 부분 | Medium |
| <2023.11> 생일 축하 상품권 | 온누리상품권 50,000원 (2024~) | 50,000원 | ❌ | ❌ | ❌ 누락 | Low |
| <2020.10>~<2025.10> 환경유지지원직 가계지원비 인상 누적 | +200k/+200k/+200k/+100k/+200k (연단위 누적) | 연 총 +900k | 🟡 `DATA.payTables.환경유지지원직.familySupport` 에는 최신 금액 반영 추정. 추가 검증 필요 | tab-payroll | 🟡 부분 | Low |
| **제58조(2) 학비 지원** | 중·고·대학 자녀 국가공무원 동일 | 공무원 수준 | ❌ | ❌ | ❌ 누락 | Low |
| **제58조(3) 급식보조비** | **120,000원/월** (규정) | 120,000원 | 🟡 `DATA.allowances.mealSubsidy=150000` (`data.js:145`) — **150k 하드코딩, 규정 120k와 drift** ² | tab-payroll | 🟡 부분 — **drift** | **High** |
| **제58조(4) 교통보조비** | 매월 일정액 (규정은 금액 미명시) | 150,000원 (현재값) | ✅ `DATA.allowances.transportSubsidy=150000` + `calcOrdinaryWage` L96,120 | tab-payroll | ✅ 구현 | Medium |
| 제58조(5)~(7) 휴게실·콘도·직원식당 시설 | 설치·운영 의무 | N/A | N/A (시설) | ❌ | N/A (시설) | N/A |
| 제59조 식사 제공 (야간·예비군·보라매 밤번) | 식비 수준 식사 현물 제공 | N/A | N/A (현물) | ❌ | N/A (현물) | N/A |
| 제60조 제복지급 | 양질의 제복 + 주1회 외부세탁 | N/A | N/A (현물·서비스) | ❌ | N/A (현물) | N/A |
| 제61조 간호사 기숙사 | 기숙사 마련·합의 운영 | N/A | N/A (시설) | ❌ | N/A (시설) | N/A |
| 제62조 어린이집 | 수유실·어린이집 설치·운영 | N/A | N/A (시설) | ❌ | N/A (시설) | N/A |
| **제63조(1) 본인결혼 경조금** | 300,000원 | 300,000원 | ✅ `DATA.leaveQuotas.ceremony_marriage_self.ceremonyPay=300000` + `DATA.ceremonies` (`data.js:324`) | tab-leave | ✅ 구현 | **High** |
| **제63조(2) 자녀결혼 경조금** | 100,000원 | 100,000원 | ✅ `DATA.leaveQuotas.ceremony_marriage_child.ceremonyPay=100000` | tab-leave | ✅ 구현 | Medium |
| **제63조(3) 자녀출산 경조금** | 100,000원 (+ 공제회 첫째·둘째 10만/셋째+ 30만) | 100,000원 | ✅ `DATA.ceremonies` 본인출산 100k (`data.js:326`) + `DATA.leaveQuotas.ceremony_birth.ceremonyPay=100000` | tab-leave | ✅ 구현 | **High** |
| **제63조(4) 본인사망** | 1,000,000원 | 1,000,000원 | ✅ `DATA.ceremonies` 본인사망 1,000,000 (`data.js:329`) | tab-leave / tab-browse | ✅ 구현 (사용자 입장에서는 유족 지급이라 UI 진입 제한적) | Low |
| **제63조(5) 배우자사망** | 1,000,000원 | 1,000,000원 | ✅ `DATA.leaveQuotas.ceremony_death_spouse.ceremonyPay=1000000` | tab-leave | ✅ 구현 | **High** |
| **제63조(6) 본인·배우자 부모 사망** | 300,000원 | 300,000원 | ✅ `DATA.leaveQuotas.ceremony_death_parent.ceremonyPay=300000` | tab-leave | ✅ 구현 | **High** |
| **제63조(7) 자녀사망** | 300,000원 | 300,000원 | ✅ `DATA.leaveQuotas.ceremony_death_child.ceremonyPay=300000` (자녀배우자 사망은 경조금 없음) | tab-leave | ✅ 구현 | Medium |
| **제63조(8) 조부모·외조부모·형제·자매 사망** | 50,000원 | 50,000원 | ✅ `DATA.leaveQuotas.ceremony_death_grandparent`/`ceremony_death_sibling.ceremonyPay=50000` | tab-leave | ✅ 구현 | Medium |
| **제63조의2(1) 신규간호사 교육** | 8주 (중환자실 10주), 신규 간호운영기능직 5일, 프리셉터 +2주 팀 | 8/10주 / 5일 / 2주 | ❌ (DATA/CALC 없음; 텍스트 안내도 미확인) | ❌ | ❌ 누락 | Low |
| **<2017.12> 신규간호사 교육기간 급여** | 첫 4주간 간호사 신규초임의 80% | 초임 × 80% | ❌ | ❌ | ❌ 누락 | Low |
| **<2021.11> 프리셉터 교육수당** | 월 200,000원 (2022~) | 200,000원 | ✅ `DATA.allowances.preceptorPay=200000` | UI 진입점 없음 | 🟡 부분 — DATA만 존재 | Low |
| 제63조의2(2) 인권교육 | 전 직원 대상 | N/A | N/A (교육 절차) | ❌ | N/A | N/A |
| 제63조의2(3) 발령 전 인수인계 | 발령일 전 5일 업무 인수인계 (2026.01~) | 5일 | ❌ | ❌ | N/A (HR 절차) | N/A |
| <2012.09> 교대근무자 전보 교육시간 | 유급 부여 | N/A | N/A (유급 여부 판단) | ❌ | N/A | N/A |
| <2009.10> 보건직 보수교육 등록비 지원 | 면허유지 이수시간 범위 | 범위 내 | ❌ | ❌ | ❌ 누락 | Low |

**제6장 행 수: 32행** (수치·공식 21 + N/A 11)

각주:
- ¹ 복지포인트는 규정상 "기본 400P → 600P(2020) → 700P(2025)" 단계적 인상이었고 1P=1,000원 환산이 `data.js:544` 에 명시되어 있으나 `DATA.welfarePoints` 같은 구조화 상수나 `CALC.calcWelfarePoint` 계산기가 없음. FAQ/handbook 설명만 노출됨.
- ² **급식보조비 drift (known-issues D-1):** 규정(제58조(3) · 2026 handbook p.34/39/104)은 **120,000원/월** 이지만 `data.js:145` 에는 `mealSubsidy: 150000` 으로 하드코딩되어 통상임금 계산 시 매달 30,000원 과다 산정. Plan K 에서 발견 → Plan L/M 에서 수정 대상. 본 감사에서는 🟡 부분 (DATA 존재하나 값 불일치) 로 표기.

---

## 제7장 안전보건 및 재해보상

> 출처: `data/full_union_regulation_2026.md` L1399–1646. 대부분 조항이 절차·시설·산업안전보건위 운영 조항이며, 계산 가능한 수치는 진료비 감면율·휴업보상·유족보상 일수에 집중.

| 조항 | 규정 내용 (요약) | 수치/공식 | 현재 구현 | UI 탭 | 상태 | 우선순위 |
|------|-----------------|-----------|----------|-------|------|---------|
| 제64조(1) 병원안전보건위원회 | 병원·조합 각 5명 위원 구성 | 5명 × 2 | ❌ | ❌ | N/A (조직 구성) | N/A |
| 제64조(2) 정기회의 주기 | 6개월마다 정기 소집 | 6개월 | ❌ | ❌ | N/A (조직 운영) | N/A |
| 제64조의2(2) 근골격계 실무위 공가 | 예방 실무위원 월 1일 공가 | 1일/월 | ❌ (DATA.leaveQuotas 없음) | ❌ | ❌ 누락 | Low |
| 제64조의2(4) 체력증진센터 운영시간 | 주중 07:30~20:00 | 07:30–20:00 | ❌ (상수·서술 없음) | ❌ | N/A (시설 운영) | N/A |
| **제64조의3(1) 조합 주관 안전보건교육** | 연 4시간 | 4시간/년 | ❌ | ❌ | ❌ 누락 | Low |
| **제64조의3(2) 신규직원 안전보건교육** | 8시간 | 8시간 | ❌ | ❌ | ❌ 누락 | Low |
| 제65조(1) 정기 건강진단 | 전 직원 연 1회 이상 | 1회/년 | 🟡 `DATA.faqs` 내 "건강검진 1일 유급" 안내 (`<2019.11>`) | tab-browse FAQ | 🟡 부분 — 검사 항목 미구조화 | Low |
| 제65조(2) 유해위험·감염 부서 특수 건강진단 | 연 2회 이상 | 2회/년 | ❌ | ❌ | ❌ 누락 | Low |
| 제65조(3) HIV/VDRL/콜레스테롤 검사 | 전 직원 1회/1년 | 1/년 | ❌ (DATA 없음) | ❌ | ❌ 누락 | Low |
| 제65조(3) 유방촬영(양측) | 만 40세↑ 여성 1회/2년 | 40세 / 2년 | ❌ | ❌ | ❌ 누락 | Low |
| 제65조(3) 대장검사 (분변잠혈) | 만 50세↑ 1회/1년 | 50세 / 1년 | ❌ | ❌ | ❌ 누락 | Low |
| 제65조(3) 대장 내시경 | 분변잠혈 양성자 1회/1년 | 조건부 | ❌ | ❌ | ❌ 누락 | Low |
| 제65조(3) 위 내시경 | 만 40세↑ 1회/2년 | 40세 / 2년 | ❌ | ❌ | ❌ 누락 | Low |
| **<2019.11> 건강검진 유급 휴일** | 검진 당일 유급 1일 | 1일 | 🟡 `DATA.faqs` 검진휴가 "연 1일 유급" (`data.js:416`) — DATA.leaveQuotas 전용 id 없음 | tab-browse | 🟡 부분 | Low |
| <2024.11> 25년차 종합검진 | 25년차 당해연도 1회 / 26년차↑ 희망 시 5년 내 1회 | 25년 / 5년 | ❌ | ❌ | ❌ 누락 | Low |
| 제66조 건강관리실 설치 | 본원 2007·보라매 2009 | N/A | N/A (시설) | ❌ | N/A (시설) | N/A |
| **제67조(1) 본인·배우자 진료비 감면** | 선택진료 100% / 접수·보험·비보험·비급여 50% | 100% / 50% | ✅ `DATA.medicalDiscount.self`·`.spouse` (`data.js:369-373`) | UI 진입점 불명 (tab-browse 참조) | 🟡 부분 — DATA만 존재 ¹ | Medium |
| **제67조(2) 부모·자녀 진료비 감면** | 보험·비보험·비급여 50% | 50% | ✅ `DATA.medicalDiscount.family` (`data.js:372`) | UI 진입점 불명 | 🟡 부분 — DATA만 존재 ¹ | Medium |
| 제67조(3) 단시간 진료비 감면 | 3개월↑ 재직, 정규직 동률 | 동률 | ❌ (단시간 분기 플래그 없음) | ❌ | ❌ 누락 | Low |
| <2011.09>·<2013.11> 용역직원 진료비 감면 | 1인당 연 300만원 한도 | 300만원 | ❌ | ❌ | ❌ 누락 | Low |
| 제69조 업무상 질병·재해 범위 | 근로기준법 준용 | N/A | N/A (법령 위임) | ❌ | N/A | N/A |
| 제70조(1) 요양보상 | 근로기준법 제78조 기준 + 개호비 | N/A | ❌ (계산기 부재) | ❌ | ❌ 누락 | Low |
| **제71조 휴업보상** | 업무상 부상·질병 6개월 유급 → 이후 직무능력급 70% (산재가입자 평균임금 70%) | 6개월 / 70% | ❌ (`calcAverageWage` 존재하나 휴업보상 시나리오 진입점 없음) | ❌ | ❌ 누락 | Low |
| 제72조 장해보상 | 근로기준법 + 산재보상보험법 등급 판정 | N/A | ❌ (장해등급 입력 UI 없음) | ❌ | ❌ 누락 | Low |
| **제73조 유족보상** | 평균임금 × 1,300일분 | 1,300일 | ❌ (산정 UI/계산기 없음) | ❌ | ❌ 누락 | Medium |
| **제73조 장례비** | 평균임금 × 120일분 | 120일 | ❌ | ❌ | ❌ 누락 | Medium |
| 제74조 지급시기 | 등급 확정일부터 즉시·유족보상은 사망일로부터 10일 이내 | 10일 | N/A (HR 절차) | ❌ | N/A (HR 절차) | N/A |
| <2013.11> 병가인정 기준 | 14일 이내 2차 기관 진단서 / 15일↑ 본원·타병원 확인 후 인정 | 14일 / 15일 | 🟡 `DATA.faqs`/`handbook` "병가 연 통산 2개월" 안내 (`data.js:413`) · 진단서 일수 구간 미구조화 | tab-browse | 🟡 부분 | Low |

**제7장 행 수: 28행** (수치·공식 17 + N/A 7 + 시설·운영 4)

각주:
- ¹ `DATA.medicalDiscount` 는 `data.js:369` 에 정의되어 있지만 앱 전반(`index.html`, payroll/leave/overtime 탭)에서 사용자가 본인·가족 진료 시 감면 금액을 계산하는 UI 가 없음. `data-sources.md` 에도 soft 참조만 있음. 진료비 계산기 `CALC.calcMedicalDiscount` 는 미구현 → Plan M 후보.

---

## 제8~10장

> 출처: `data/full_union_regulation_2026.md` L1647–1723 (제8장 단체교섭 / 제9장 노사협의회 / 제10장 부칙). 대부분 **절차·운영·효력 조항** 으로 계산기와 무관하다. 숫자는 교섭·회의체 구성·유효기간 위주.

| 조항 | 규정 내용 (요약) | 수치/공식 | 현재 구현 | UI 탭 | 상태 | 우선순위 |
|------|-----------------|-----------|----------|-------|------|---------|
| 제75조 교섭요구 | 문서 요구 (일시·장소·안건·위원명단) | N/A | N/A (서면 절차) | ❌ | N/A (HR 절차) | N/A |
| 제77조 신속교섭 의무 | 일방 요구 시 상대방은 5일 이내 교섭 임함 | 5일 | ❌ | ❌ | N/A (HR 절차) | N/A |
| 제78조 교섭위원 구성 | 노사 각 8인 이내, 타임오프 외 교섭위원 5인 범위 / 3개월 경과시 재논의 | 8인 / 5인 / 3개월 | ❌ | ❌ | N/A (조직 구성) | N/A |
| 제81조(1) 노사협의회 구성 | 노사 각 5명, 대표자 참석 | 5명 × 2 | ❌ | ❌ | N/A (조직 구성) | N/A |
| 제81조(2) 고충처리위 | 해결 안 될 시 7일 이내 노사협의회 결정 | 7일 | ❌ | ❌ | N/A (HR 절차) | N/A |
| 제82조(1) 노사협의회 주기 | 매년 3/6/9/12월 정기 + 임시 가능 | 분기별 | ❌ | ❌ | N/A (조직 운영) | N/A |
| 제82조(3) 노사협의회 위원 공가 | 협의 당일 직종별 1인 공가 | 1일 | ❌ | ❌ | N/A (HR 절차) | N/A |
| 제85조 노사협의회 합의 효력 | 단체협약과 같은 효력 | N/A | N/A (법리) | ❌ | N/A | N/A |
| **제86조 협약 유효기간** | 체결일로부터 1년 | 1년 | ❌ (만료 경고·배너 없음) | ❌ | N/A (조직 운영) | N/A |
| 제87조 효력유지 | 만료 후 갱신교섭 진행 중 효력 지속 | N/A | N/A (법리) | ❌ | N/A | N/A |
| 제89조 갱신요구 기한 | 유효기간 만료 30일 전 갱신안 제출 | 30일 | ❌ | ❌ | N/A (HR 절차) | N/A |
| 제92조 시행시기 | 2015년 단협 갱신조항 적용시기: 2015.07.01. | 2015.07.01. | ✅ `CALC.calcSeveranceFullPay` 에 `cutoff2015 = 2015-06-30` 퇴직수당 분기 (`calculators.js:316` 부근) | tab-payroll (퇴직금) | ✅ 구현 | **High** |

**제8~10장 행 수: 12행** (수치·경계일 1 + 대부분 N/A 11)

각주:
- 제76조·제79조·제80조·제83조·제84조·제88조·제90조·제91조는 수치 없는 순수 서술·절차 조항 → 행 미포함.

---

## 별도 합의사항

> 출처: `data/full_union_regulation_2026.md` L1724–2931. **대부분이 역사적·일회성 합의** (연도별 정규직 전환 인원, 인력 충원표, 시설 개선 등) 로 현재 앱 계산과 무관. 현재 effective 상태로 유지되며 수치 계산 가능한 항목만 행으로 수록.

| 조항 | 규정 내용 (요약) | 수치/공식 | 현재 구현 | UI 탭 | 상태 | 우선순위 |
|------|-----------------|-----------|----------|-------|------|---------|
| <2004.08>·<2005.09> 의료민주화 주 40시간 | 2004년 주 40시간제 도입 시점 | 주 40시간 | ✅ 제32조(1)와 동일 — `DATA.allowances.weeklyHours=209` | tab-overtime · tab-payroll | ✅ 구현 | **High** |
| <2008.09> 보라매 야간주차 | 22:00~07:00 1일당 1,000원 | 1,000원 | ❌ | ❌ | N/A (환자/직원 대상 외부 제도) | N/A |
| <2021.11> 간호사 배치 기준 (코로나) | 중증 1.80 / 준중증 0.90 / 중등증 0.36~0.2 | 1.80/0.90/0.36 | ❌ | ❌ | N/A (정부지침·현장 운영) | N/A |
| <2006.12>~<2019.11> 비정규직 정규직 전환 | 연도별 인원 수 (100명/66명/130시간↑ 등) | N/A (역사적) | N/A | ❌ | N/A (역사적) | N/A |
| <2016.10> 비정규직 경력 인정 | 6개월↑ 근무 시 연차 인정 (2015.7.1. 이후 전환자) | 6개월 | 🟡 제3장 <2003.07> 단시간 경력 인정 행과 중복 — cross-ref | ❌ | 🟡 부분 | Low |
| **<2008.09> 콜센터 근무수당** | 매월 30,000원 (2008.10~) | 30,000원/월 | ❌ (DATA.allowances 항목 없음) | ❌ | ❌ 누락 | Low |
| <2019.09> 환경유지지원직 임금피크 제외 | 기준기본급 ≤ 최저임금 150% 인 경우 공로연수·임금피크 미적용 | 150% | ❌ | ❌ | ❌ 누락 ¹ | Low |
| <2019.09> 환경유지지원직 사학연금 전환 | 정년 잔여 10년↑ 전환 / 10년 미만 무기 촉탁 | 10년 | ❌ | ❌ | N/A (HR 절차) | N/A |
| **<2025.10> 임금체계 개선 별정수당** | S1·C1·SC1 이하 월 35,000원 신설 (퇴직 시까지) | 35,000원/월 | ❌ (DATA 항목 없음) | ❌ | ❌ 누락 ² | Medium |
| **<2025.10> 자동승격 연수 (2026.01 입사자)** | 일반직 J1/J2/J3 = 4/7/8년 / 운영기능 A1/A2/A3 = 4/7/7년 / 환경유지 SA1/SA2/SA3 = 4/7/7년 | 4/7/8 & 4/7/7 | ✅ `DATA.payTables.*.autoPromotion` 수치 일치 (일반직 J3=8·운영기능 A3=7·환경유지 SA3=7) | tab-payroll | ✅ 구현 | Medium |
| **<2025.10> 기존 재직자 자격등급 상향** | 2025.12.31. 기준 S2·C2·SC2 이하 연차 +1년 | +1년 | ❌ (전환 시나리오 계산기 없음) | ❌ | ❌ 누락 ² | Low |
| **<2015.07> 신 취업규칙 근속가산율** | 1~5년 2% / 5~10년 5% / 10~15년 6% / 15~20년 7% / 20년↑ 8% | 2/5/6/7/8% | ✅ `CALC.calcOrdinaryWage` L69 근속가산기본급 5구간 분기 (제5장 각주와 동일) | tab-payroll | ✅ 구현 | **High** |
| **<2015.07> 신 취업규칙 자동 승진 기본** | 일반직 J·운영기능직 C↑ 최소 4년, 자동 8년 | 4/8년 | 🟡 `DATA.payTables.autoPromotion` 에는 J1/J2/J3/A1/A2/A3 만 정의, S·C·SC 자동승진 미수록 — 2025 합의로 J3/A3/SA3 은 8년/7년/7년 세분화됨 (위 행과 중복) | tab-payroll | 🟡 부분 | Medium |
| <2015.07> 퇴직수당 폐지 → 1호봉 가산 | 2015.6.30 기준 | 1호봉 | N/A (경과 조치) | ❌ | N/A (일회성) | N/A |
| **<2016.05> 사학연금 2016.03.01+ 분리 퇴직금** | 사학연금 가입일 전일까지 근속연수·평균임금으로 분리 계산 | 2016.03.01 | ❌ (제5장 각주와 중복 — `calcSeveranceFullPay` 는 cutoff2001/cutoff2015 만 지원, 2016 컷오프 없음) | tab-payroll | ❌ 누락 | Medium |
| <2016.05> 사학연금 만59세 퇴직 | 만59세 직전 평균임금 기준 (제53조(2)와 연동) | 만 59세 | 🟡 `retirement.js` 임금피크 전후 평균임금 로직은 있으나 "만59세 사학연금 전용" 분기 확인 필요 | tab-payroll | 🟡 부분 | Low |
| <2001.07> 재정자립기금 지원 | 2001·2002 각 1.5억원 | 역사적 | N/A (일회성) | ❌ | N/A | N/A |
| <2002.08> 산별교섭 노력 | 산별교섭 정착 노력 | N/A | N/A (선언적) | ❌ | N/A | N/A |
| <2003.07>~<2005.09> 치과병원 분립 | 이동 희망자 동일직무 배치·신분 보장 | N/A | N/A (일회성 조직 변경) | ❌ | N/A | N/A |
| <2001.07>~<2025.10> 인력충원 합의 | 연도별 인원수 (2025.10 총 20명 등) | 연도별 | N/A (HR 운영 계획) | ❌ | N/A | N/A |

**별도 합의사항 행 수: 20행** (수치·수당 4 · 🟡 부분 3 · ❌ 누락 4 · N/A 9)

각주:
- ¹ 환경유지지원직 임금피크 제외는 `retirement.js` 시뮬레이터 입력에 "임금피크 미적용" 플래그가 있는지 추가 확인 필요. 본 감사에서는 DATA 상수 부재 → ❌ 처리.
- ² 2025.10 별정수당 35,000원 신설·자격등급 +1년 상향은 2026.01 시행 — Plan L Tier 2 (2025 보수표 갱신) 과 연결되는 drift 후보. `DATA.allowances` 에 `specialAllowance2025` 같은 항목 신설 검토 필요.

---

## 별첨

> 출처: `data/full_union_regulation_2026.md` L2937–3155. 임금 구성 요약표·2025 보수표 (3직군 × 9등급 × 8호봉)·청원휴가 경조금 일람·휴직제도 일람·리프레시 지원비 범위.

| 조항 | 규정 내용 (요약) | 수치/공식 | 현재 구현 | UI 탭 | 상태 | 우선순위 |
|------|-----------------|-----------|----------|-------|------|---------|
| 별첨 임금구성표 — 근속가산율 | 1~5년 2% / 5~10년 5% / 10~15년 6% / 15~20년 7% / 20년↑ 8% | 2/5/6/7/8% | ✅ `CALC.calcOrdinaryWage` L69 근속가산기본급 5구간 분기 | tab-payroll | ✅ 구현 | **High** |
| 별첨 임금구성표 — 군복무수당 | 45,000원 · 직급연차 미산입 · 2년 기준 월할 | 45,000원 | ✅ `DATA.allowances.militaryService=45000` + `calcOrdinaryWage` L76-81 (제5장 중복) | tab-payroll | ✅ 구현 | Medium |
| **별첨 수당표 — 급식보조비** | 150,000원 (2019.12~) ← **핸드북 p.34/39/104 는 120,000원** | 150k ↔ 120k | 🟡 `DATA.allowances.mealSubsidy=150000` — 내부 별첨(L2963)은 150k, 본문 handbook p.34/39/104 는 120k ¹ | tab-payroll | 🟡 부분 — SoT 내부 drift | **High** |
| 별첨 수당표 — 교통보조비 | 150,000원 | 150,000원 | ✅ `DATA.allowances.transportSubsidy=150000` | tab-payroll | ✅ 구현 | Medium |
| 별첨 수당표 — 가족수당 | 배우자 40k / 일반 20k / 첫째 30k / 둘째 70k / 셋째↑ 110k (5인 이내) | 제49조 중복 | ✅ 제49조와 동일 | tab-payroll | ✅ 구현 | **High** |
| 별첨 수당표 — 온콜대기수당 | 1일 10,000원 | 10,000원 | ✅ 제32조(9)·<2019.11>과 중복 — `DATA.allowances.onCallStandby=10000` | tab-overtime | ✅ 구현 | Medium |
| 별첨 수당표 — 연차보전수당 | 통상임금 × 150% (2004.6.30 이전 근무자) | 150% | ❌ (제36조(2)와 중복 — `÷23 × 1.5` 계산기 없음) | ❌ | ❌ 누락 | Low |
| 별첨 퇴직수당 5구간 | 20년↑ 60% / 15~19 50% / 10~14 45% / 5~9 35% / 1~4 10% | 10/35/45/50/60% | ✅ `DATA.severancePay` + `calcSeveranceFullPay` (제53조(1)와 중복) | tab-payroll | ✅ 구현 | **High** |
| 별첨 연차보전수당 일람 | 입사연수별 기존-현재 일수 차이 7~21일 | 표 9행 | ❌ (`DATA` 항목 없음) | ❌ | ❌ 누락 | Low |
| **별첨 2025 보수표 (3직군 × 9등급 × 8호봉)** | 기본급·능력급·상여금·가계지원비 4계열 × 27등급 × 8호봉 | 전수 표 | ✅ `DATA.payTables.{일반직,운영기능직,환경유지지원직}.{basePay,abilityPay,bonus,familySupport}` 구조 일치 (수치 전수 대조는 Plan L Tier 2 범위) ² | tab-payroll | ✅ 구현 (구조) | `N/A` |
| 별첨 경조사 — 본인 결혼 | 5일 / 30만 | 5일 / 30만 | ✅ 제41조(1)·제63조(1) 중복 — `DATA.leaveQuotas.ceremony_marriage_self` | tab-leave | ✅ 구현 | **High** |
| 별첨 경조사 — 자녀 결혼 | 1일 / 10만 | 1일 / 10만 | ✅ 제41조(2)·제63조(2) 중복 — `DATA.leaveQuotas.ceremony_marriage_child` | tab-leave | ✅ 구현 | Medium |
| **별첨 경조사 — 본인 출산** | 90일 (쌍둥이 120일) / 10만 / 교직원공제회 첫째·둘째 10만·셋째+ 30만 | 90/120일 | 🟡 `DATA.ceremonies` 본인출산 90일 + `ceremony_birth.ceremonyDays=90` · 쌍둥이 120일 분기 미구현 · 공제회 금액 미구조화 | tab-leave | 🟡 부분 — 쌍둥이 분기 없음 ³ | Medium |
| **별첨 경조사 — 배우자 출산** | 20일 / 10만 (본문 제41조는 10일) ← **내부 drift** | 20일 ↔ 10일 | 🟡 `DATA.leaveQuotas.ceremony_spouse_birth.ceremonyDays=10` — 별첨(L3070) 20일과 **drift** ⁴ | tab-leave | 🟡 부분 — SoT 내부 drift | Medium |
| 별첨 경조사 — 입양 | 20일 / 0원 | 20일 | ✅ `DATA.leaveQuotas.ceremony_adoption.ceremonyDays=20` | tab-leave | ✅ 구현 | Low |
| 별첨 경조사 — 본인 사망 | 100만 | 100만 | ✅ `DATA.ceremonies` 본인사망 1,000,000 | (유족용) | ✅ 구현 | Low |
| 별첨 경조사 — 배우자 사망 | 5일 / 100만 | 5일/100만 | ✅ `DATA.leaveQuotas.ceremony_death_spouse` (5일/100만) | tab-leave | ✅ 구현 | **High** |
| 별첨 경조사 — (본인·배우자)부모 사망 | 5일 / 30만 | 5일/30만 | ✅ `DATA.leaveQuotas.ceremony_death_parent` | tab-leave | ✅ 구현 | **High** |
| 별첨 경조사 — 자녀 사망 | 3일 / 30만 (자녀 배우자 경조금 없음) | 3일/30만 | ✅ `DATA.leaveQuotas.ceremony_death_child` | tab-leave | ✅ 구현 | Medium |
| 별첨 경조사 — 조부모·외조부모 사망 | 3일 / 5만 | 3일/5만 | ✅ `DATA.leaveQuotas.ceremony_death_grandparent` | tab-leave | ✅ 구현 | Medium |
| 별첨 경조사 — 형제·자매 사망 | 3일 / 5만 | 3일/5만 | ✅ `DATA.leaveQuotas.ceremony_death_sibling` | tab-leave | ✅ 구현 | Medium |
| **별첨 유산·사산 5구간** | ≤11주 5일 / 12~15주 10일 / 16~21주 30일 / 22~27주 60일 / 28주↑ 90일 | 5/10/30/60/90 | ✅ `DATA.leaveQuotas.miscarriageLeave` 5단계 (제38조(2)와 중복) | ❌ (`leaveQuotas.types` 에 유산/사산 id 없음) | 🟡 부분 — DATA 존재, UI 미노출 | Medium |
| 별첨 병가 3구간 | ≤4일 부서장 재량 / 5~14일 2차기관 진단서 / 15일↑ 본원 확인 | 4/14/15일 | ❌ (구간별 구조화 없음) | ❌ | ❌ 누락 | Low |
| 별첨 병가 상한 | 연 통산 2개월 / 공무상 6개월 연장 | 60일 / 180일 | 🟡 `DATA.faqs` 안내 텍스트 (`data.js:413`) — 계산기 없음 | tab-browse | 🟡 부분 | Low |
| 별첨 노조 경조금 | 본인결혼 10만/자녀결혼 5만/사망 5~10만 | 5~10만 | ❌ (`DATA.ceremonies` 는 병원 지급액만, 노조 지급액 없음) | ❌ | ❌ 누락 | Low |
| **별첨 휴직 — 육아휴직** | 3년 이내 / 만 8세↓ / 최초 1년 근속산입 / 1~3개월 250만·4~6개월 200만·7~12개월 160만·+6+6 첫달 250만 | 3년 / 250/200/160만 | ✅ `DATA.leaveOfAbsence` 육아휴직 + `6+6 육아휴직` + `CALC.calcParentalLeavePay` (`calculators.js:432`) | tab-leave (표) · 계산기 UI 미노출 | 🟡 부분 — 표만 노출, 계산기 진입점 없음 | Medium |
| 별첨 휴직 — 임신휴직 | 임신기간 무급 | N/A | ✅ `DATA.leaveOfAbsence` 임신휴직 | tab-leave | ✅ 구현 | Low |
| 별첨 휴직 — 요양휴직 | 1년 이내 무급 | 1년 | ✅ `DATA.leaveOfAbsence` 요양휴직 | tab-leave | ✅ 구현 | Low |
| 별첨 휴직 — 간병휴직 | 1년 이내 무급 · 임신·요양·간병 합산 3년 상한 | 1년 / 3년 | 🟡 `DATA.leaveOfAbsence` 간병휴직 period 문자열 — **합산 3년 상한 검증 로직 없음** | tab-leave | 🟡 부분 | Low |
| **별첨 휴직 — 가족돌봄휴직** | 연 90일 / 근속산입 / 무급 | 90일 | ✅ `DATA.leaveOfAbsence` 가족돌봄휴직 `period:"연 90일"` | tab-leave | ✅ 구현 | Medium |
| 별첨 휴직 — 질병휴직 | 1년 이내 · 기본급+능력급+상여+조정급 70% | 1년 / 70% | 🟡 `DATA.leaveOfAbsence` 질병휴직 pay 문자열만 — 계산 연동 없음 (제28조(2)와 중복) | tab-leave | 🟡 부분 | Medium |
| 별첨 휴직 — 공상휴직 | 1년 이내 / 근속산입 / 70% | 1년 / 70% | 🟡 `DATA.leaveOfAbsence` 공상휴직 `tenure:true` / 계산 미연동 | tab-leave | 🟡 부분 | Low |
| 별첨 휴직 — 자기계발휴직 | 5년 재직 / 1년 (6개월×2) / 10년↑ +6개월 | 5년 / 1년 | ✅ `DATA.leaveOfAbsence` 자기계발휴직 condition="재직 5년 이상" | tab-leave | ✅ 구현 | Low |
| 별첨 휴직 — 연수휴직 | 2년 이내 무급 | 2년 | ❌ (DATA.leaveOfAbsence 에 연수휴직 항목 없음 — 국외유학휴직만 존재) | ❌ | ❌ 누락 | Low |
| 별첨 휴직 — 국외유학휴직 | 8년 재직 / 3년 이내 / 근속산입 | 8년 / 3년 | ✅ `DATA.leaveOfAbsence` 국외유학휴직 | tab-leave | ✅ 구현 | Low |
| 별첨 휴직 — 배우자동반휴직 | 3년 이내 무급 | 3년 | ✅ `DATA.leaveOfAbsence` 배우자동반휴직 | tab-leave | ✅ 구현 | Low |
| 별첨 리프레시 — 건강관리 | 스포츠센터 체력단련 (골프레슨 강습료) | N/A | ✅ `DATA.refreshCategories` 건강관리 항목 | tab-browse | ✅ 구현 | Low |
| 별첨 리프레시 — 능력계발 | 도서·학원·온라인·대학(원)·공연·시험료 | N/A | ✅ `DATA.refreshCategories` 능력계발 항목 | tab-browse | ✅ 구현 | Low |

**별첨 행 수: 36행** (수치·금액 23 + 보수표 구조 1 + 기타 12)

각주:
- ¹ **급식보조비 drift (known-issues D-1 · 제6장 각주 ²):** 규정 본문 제58조(3) 은 120,000원 / 별첨 수당표(L2963) 및 `data.js:145` 는 150,000원 — **단협 내부 drift**. 핸드북 p.34/39/104 와 별첨이 상충하므로 SoT 재정비 필요 (Plan L/M).
- ² 2025 보수표 전수 대조 (3직군 × 9등급 × 8호봉 × 4계열 = 864셀)는 Plan L Tier 2 범위. 본 감사에서는 DATA 구조(키 이름, 9×8 배열 차원)가 별첨 구조와 일치함을 확인.
- ³ `DATA.ceremonies` 본인 출산 항목은 extra 문자열에 "다자녀 120일"을 포함하지만 `DATA.leaveQuotas.ceremony_birth.ceremonyDays=90` 은 쌍둥이 분기가 없어 계산 시 단태아 기준만 적용됨. 제38조(1) 각주와 동일 drift.
- ⁴ **배우자 출산휴가 drift:** 단협 제41조(3) 본문(L1225경)은 **10일** / 별첨 경조사 일람(L3070)은 **20일** 로 서로 **내부 drift**. `DATA.leaveQuotas.ceremony_spouse_birth.ceremonyDays=10` 은 본문 쪽을 따름. 2026.01 개정·<2025.10> 합의 이후 별첨이 선행 반영됐을 가능성 있음 → regulation SoT 재확인 필요.

---
