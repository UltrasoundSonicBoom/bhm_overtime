---
name: calc-flow-audit
description: SNUH Mate 계산값 전체 흐름을 5-Layer 아키텍처로 검증. 연결 끊김·규정 불일치·동기화 누락을 탐지한다.
user_invocable: true
---

# Calculation Flow Audit

SNUH Mate의 모든 급여·시간외·수당 계산값의 흐름을 추적하고, 연결 끊김·규정 불일치·동기화 누락을 체계적으로 검증한다.

## 5-Layer 계산 아키텍처

```
Layer 1: 규정 상수 (data.js)
   │  overtimeRates, allowances, payTables, deductions
   ▼
Layer 2: 시급 산출 (calculators.js)
   │  calcOrdinaryWage() → { monthlyWage, hourlyRate, breakdown }
   ▼
Layer 3: 레코드 생성 (overtime.js)
   │  createRecord() → { estimatedPay, breakdown: { extended, night, holiday } }
   │  savePayslipData() → { workStats, overtimeItems, hourlyRate }
   ▼
Layer 4: 월간 집계 (overtime.js)
   │  calcMonthlyStats() → { totalPay, byType, payslipSupplement }
   │  calcYearlyStats() → supplement 포함 연간 합산
   ▼
Layer 5: 소비자 (여러 파일)
   ├── app.js: renderOtDashboard(), _renderHomeOtMonth(), renderOtVerification()
   ├── pay-estimation.js: calcMonthEstimate() → 급여 예상
   ├── calculators.js: calcAverageWage() → 퇴직금 평균임금
   ├── payroll.js: overtimeCalc._getThisMonthStats() → 계산기 카드
   └── syncManager.js: DATA_MAP → Google Drive 동기화
```

## 검증 체크리스트

### A. payslipSupplement 전파 검증

모든 Layer 5 소비자가 `stats.payslipSupplement`를 사용하는지 확인.

```bash
# 1. calcMonthlyStats를 호출하는 모든 위치 찾기
grep -rn "calcMonthlyStats" --include="*.js" .

# 2. 각 호출 위치에서 payslipSupplement를 참조하는지 확인
grep -rn "payslipSupplement" --include="*.js" .

# 3. totalPay만 사용하고 supplement.pay를 더하지 않는 곳 = 끊김
```

**확인 대상:**
- [ ] `app.js` — `renderOtDashboard()` → effectiveOtHours/effectivePay 사용
- [ ] `app.js` — `_renderHomeOtMonth()` → effectiveOtHours 사용
- [ ] `app.js` — `_renderOvertimeAlertBanner()` → supplemented extHours
- [ ] `pay-estimation.js` — `calcMonthEstimate()` → supp.extended/night/holiday 가산
- [ ] `calculators.js` — `calcAverageWage()` → suppPay 가산
- [ ] `payroll.js` — `_getThisMonthStats()` → supp 시간 가산
- [ ] `overtime.js` — `calcYearlyStats()` → supplement 합산

### B. overtimeRates 일관성 검증

모든 수당 계산에서 동일한 배율 상수를 사용하는지 확인.

```bash
# overtimeRates를 참조하는 모든 위치
grep -rn "overtimeRates\|rates\.extended\|rates\.night\|rates\.holiday" --include="*.js" .

# 하드코딩된 배율 (1.5, 2.0 등) 없는지 확인
grep -rn "\* 1\.5\|\* 2\.0\|\* 1\.5\b" --include="*.js" .
```

**기대값:**
| 타입 | 배율 | 소스 |
|------|------|------|
| extended | 1.5 | `DATA.allowances.overtimeRates.extended` |
| night | 2.0 | `DATA.allowances.overtimeRates.night` |
| holiday (≤8h) | 1.5 | `DATA.allowances.overtimeRates.holiday` |
| holidayOver8 | 2.0 | `DATA.allowances.overtimeRates.holidayOver8` |
| holidayNight | 2.0 | `DATA.allowances.overtimeRates.holidayNight` |

### C. hourlyRate 유일 소스 검증

시급은 반드시 `calcOrdinaryWage()`를 통해서만 계산되어야 한다.

```bash
# hourlyRate를 직접 계산하는 코드가 있으면 끊김
grep -rn "hourlyRate\s*=" --include="*.js" . | grep -v "calcOrdinaryWage\|extras\|param\|wage\.\|r\.\|result\."
```

### D. 동기화 완전성 검증

localStorage에 저장되는 모든 중요 데이터가 SyncManager DATA_MAP에 등록되어 있는지.

```bash
# localStorage에 저장하는 키 목록
grep -rn "localStorage\.setItem" --include="*.js" . | grep -v "bhm_lastEdit\|bhm_deviceId\|__"

# DATA_MAP에 등록된 키 확인
grep -A5 "DATA_MAP" syncManager.js
```

**필수 동기화 대상:**
- [x] `leaveRecords` → leave.json
- [x] `overtimeRecords` → overtime.json
- [x] `bhm_hr_profile` → profile.json
- [x] `overtimePayslipData` → overtime_payslip.json
- [x] `salary_YYYY_MM` → payslips/ (별도 처리)
- [x] PIN 설정 → applock.json (별도 처리)

### E. 규정 조항 연결 검증

각 계산 함수가 참조하는 규정 조항이 코드 주석이나 data.js에 명시되어 있는지.

| 계산 | 규정 | 파일 |
|------|------|------|
| 시간외수당 15분 절삭 | 제34조·제47조 | calculators.js, payroll.js |
| 휴일 8h 초과 200% | 제34조 | calculators.js |
| 가계지원비 11개월 | 제48조 | calculators.js |
| 명절지원비 4회 | 제48조 | calculators.js |
| 근속가산기본급 | 제46조 | calculators.js |
| 리커버리데이 | 제32조 부속합의 | calculators.js |
| 40세 야간제외 | 제32조 부속합의 | calculators.js |

## 출력 형식

검증 결과를 다음 형식으로 보고:

```
=== SNUH Mate Calculation Flow Audit ===
Date: YYYY-MM-DD

[Layer 1 → 2] 규정상수 → 시급
  ✅ overtimeRates: data.js → calculators.js (일관)
  ✅ payTables: data.js → calcOrdinaryWage (정상)

[Layer 2 → 3] 시급 → 레코드
  ✅ hourlyRate: calcOrdinaryWage → createRecord (유일 소스)

[Layer 3 → 4] 레코드 → 월간집계
  ✅ calcMonthlyStats: records + payslipSupplement (정상)

[Layer 4 → 5] 월간집계 → 소비자
  ✅ pay-estimation.js: supplement 반영 (연결됨)
  ✅ calculators.js: suppPay 가산 (연결됨)
  ✅ payroll.js: supplement 시간 가산 (연결됨)
  ✅ syncManager.js: overtimePayslipData 등록 (연결됨)

[동기화] DATA_MAP 완전성
  ✅ 4/4 데이터 타입 등록

TOTAL: N nodes, M edges, 0 disconnections
```

## 사용 시점

- 새로운 계산 소비자 추가 시
- `data.js` 규정 상수 변경 시
- `calcMonthlyStats` 또는 `calcOrdinaryWage` 시그니처 변경 시
- SyncManager 데이터 타입 추가 시
- 급여명세서 파싱 로직 변경 시
