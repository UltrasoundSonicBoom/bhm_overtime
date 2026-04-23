# Integration Points — 탭 간 데이터 흐름

> 작성일: 2026-04-23 (Plan D Task 4)
> "한 탭 변경이 다른 탭에 어떻게 전파되는가" 를 명시. Plan G (통합 e2e) 의 근거.
> 모든 경로는 실제 grep 결과 기반 — 추론 없음.

## 1. 이벤트 버스 (CustomEvent)

프로젝트는 `window.dispatchEvent(new CustomEvent('<event>'))` 패턴으로 탭 간 통신.

### 1.1 이벤트 발신자

| 이벤트 | 발신 파일:줄 | 트리거 |
|--------|-----------|--------|
| `profileChanged` | `profile.js:56` | `PROFILE.save()` 호출 시 (프로필 저장, 급여명세서 업로드 시 포함) |
| `overtimeChanged` | `overtime.js:48` | 시간외 기록 추가 (`addRecord`) |
| `overtimeChanged` | `overtime.js:61` | 시간외 기록 삭제 (단건) |
| `overtimeChanged` | `overtime.js:77` | 시간외 기록 일괄 삭제 |
| `leaveChanged` | `leave.js:183` | 휴가 기록 추가 (`addRecord`) |
| `leaveChanged` | `leave.js:218` | 휴가 기록 삭제 (단건) |
| `leaveChanged` | `leave.js:234` | 휴가 기록 일괄 삭제 |

**고유 이벤트 수: 3개** (`profileChanged`, `overtimeChanged`, `leaveChanged`)
**총 발신 지점: 7개**

### 1.2 이벤트 수신자

| 이벤트 | 수신 파일:줄 | 효과 |
|--------|-----------|------|
| `leaveChanged` | `profile-tab.js:927` | `_refreshProfile` → `updateProfileSummary()` 호출 — 프로필 탭 요약 카드 갱신 |
| `overtimeChanged` | `profile-tab.js:928` | `_refreshProfile` → `updateProfileSummary()` 호출 — 프로필 탭 요약 카드 갱신 |
| `overtimeChanged` | `pay-estimation.js:871` | `_refreshPayEstIfActive` → 급여 예상 탭이 활성일 때 `initPayEstimate()` 재실행 |
| `leaveChanged` | `pay-estimation.js:872` | `_refreshPayEstIfActive` → 급여 예상 탭이 활성일 때 `initPayEstimate()` 재실행 |
| `profileChanged` | `pay-estimation.js:873` | `_refreshPayEstIfActive` → 급여 예상 탭이 활성일 때 `initPayEstimate()` 재실행 |

**수신자 총수: 5개 (addEventListener 5건)**

**관찰:**
- `profileChanged` 수신자가 `pay-estimation.js` 1곳뿐임. profile-tab.js는 `profileChanged`를 수신하지 않음 — 프로필 저장 직후 동기적으로 `updateProfileSummary(profile)` 를 호출(`profile-tab.js:510`)하기 때문에 이벤트 수신 불필요.
- Dead event 없음. 3개 이벤트 모두 수신자가 존재함.

## 2. 프로필 → 타 탭 주입 함수 (`applyProfileTo*`)

| 함수 | 정의 파일:줄 | 호출 시점 | 주입 대상 DOM |
|------|-------------|----------|--------------|
| `applyProfileToOvertime` | `profile-tab.js:855` | `switchTab('overtime')` (app.js:365), 프로필 저장 직후 (profile-tab.js:361) | `#otHourly` 시급 입력값, `#otHourlyHint` 힌트 텍스트 |
| `applyProfileToPayroll` | `profile-tab.js:865` | `switchTab('payroll')` (app.js:359) | `#psProfileBanner` 프로필 배너, `#psManualSection` 수동 입력 섹션 토글 |
| `applyProfileToLeave` | `profile-tab.js:880` | `switchTab('leave')` (app.js:369), 프로필 저장 직후 (profile-tab.js:521) | `#lvHireDate` 입사일, `#lvAnnualInfoNote` 배너, `lvTotalAnnual` 변수 (연차 계산 결과) |

**applyProfileTo* 함수 수: 3개**

## 3. switchTab 핸들러의 init 체인

`app.js` 의 `switchTab(tabName)` 내부 로직 (app.js:338~385 발췌):

```javascript
// app.js:356~383
if (tabName === 'home') _afterLoad('home', initHomeTab);
if (tabName === 'payroll') {
  _afterLoad('payroll', function () { applyProfileToPayroll(); initPayrollTab(); });
}
if (tabName === 'overtime') {
  _afterLoad('overtime', function () {
    const savedCTA = document.getElementById('profileSavedCTA');
    if (savedCTA) savedCTA.style.display = 'none';
    applyProfileToOvertime(); initOvertimeTab();
  });
}
if (tabName === 'leave') {
  _afterLoad('leave', function () { applyProfileToLeave(); initLeaveTab(); });
}
if (tabName === 'reference') _afterLoad('reference', renderWikiToc);
if (tabName === 'profile') {
  _afterLoad('profile', function () {
    if (typeof window._bootstrapProfileTab === 'function') window._bootstrapProfileTab();
    initProfileTab();
  });
}
if (tabName === 'settings') {
  _afterLoad('settings', function () {
    if (typeof updateAppLockUI === 'function') updateAppLockUI();
  });
}
if (tabName === 'feedback') _afterLoad('feedback', function () {});
```

각 탭 진입 시 프로필 자동 주입 → init 순서. **프로필이 localStorage에 저장되어 있어야 자동 주입이 의미 있음.**

## 4. 급여명세서 PDF 업로드 → 프로필 자동 채움 체인

경로 (app.js + salary-parser.js + payroll-views.js):

1. 사용자가 PDF 업로드 → `salary-parser.js` 파싱 (`parseFile`).
2. `SALARY_PARSER.saveMonthlyData(ym.year, ym.month, parsed, ym.type)` 호출 → localStorage 저장 (키: `payslip_<uid>_<YYYY>_<MM>`, salary-parser.js:1092 참조).
3. `SALARY_PARSER.applyStableItemsToProfile(parsed)` 호출 (`app.js:3591`):
   - 내부에서 `PROFILE.load()` → 필드 merge → `PROFILE.save()` 실행 (`salary-parser.js:1213`)
   - `PROFILE.save()` 는 반드시 `profileChanged` 이벤트를 발행 (`profile.js:56`)
4. `_propagatePayslipToWorkHistory(parsed, ym)` 호출 (`app.js:3632`):
   - `bhm_work_history_<uid>` localStorage에 월별 근무이력 엔트리 추가 (`app.js:3436~3477`)
   - 같은 부서·같은 월 엔트리가 이미 있으면 skip (중복 방지)
5. `renderWorkHistory()` → 프로필 탭 근무이력 카드 갱신 (app.js:3829, work-history.js:96)

**payroll-views.js 도 동일 체인 실행** (payroll-views.js:577~586):
- `SALARY_PARSER.saveMonthlyData(...)` → `SALARY_PARSER.applyStableItemsToProfile(result)` → `window._propagatePayslipToWorkHistory(result, ym)`

**실패 모드:** `applyStableItemsToProfile` 내부 `PROFILE.save()` 미실행 시 `profileChanged` 이벤트 미발행 → pay-estimation.js 갱신 단절.

## 5. 근무이력 시드 (work history seeding)

경로: `profile-tab.js` `renderWorkHistory` 호출 → `work-history.js:renderWorkHistory`.

`renderWorkHistory` 호출 지점:
- `profile-tab.js:11, 33, 81, 177, 201, 513` (프로필 탭 초기화·저장 직후)
- `work-history.js:414, 433, 720, 736` (근무이력 CRUD 직후)
- `app.js:3829` (급여명세서 업로드 완료 후)

시드 플래그 키: `bhm_work_history_seeded_<uid>` (app.js:3827).

**알려진 패턴:** 급여명세서 업로드로 새 부서·입사일이 들어오면 `_propagatePayslipToWorkHistory` 가 직접 localStorage에 엔트리를 push. 별도 시드 플래그 리셋 없이 중복 체크(overlap)로 처리.

## 6. 시급(hourlyRate) 산출 경로

1. `PROFILE.load()` → `PROFILE.calcWage(profile)` (profile.js:201)
2. `calcWage` 내부에서 `CALC.calcOrdinaryWage(profile.jobType, profile.grade, profile.year, ...)` 호출 → `{ monthlyWage, hourlyRate, breakdown }` 반환 (profile.js:214)
3. `applyProfileToOvertime` (profile-tab.js:855~863) 가 `wage.hourlyRate` 를 `#otHourly` 에 주입
4. 사용자 수동 입력 시 `localStorage[getUserStorageKey('otManualHourly')]` 에 저장 (app.js:2358) → 다음 로드 시 읽음 (app.js:2004)

**확인 필요:**
- 직종/호봉 변경 후 시간외 탭으로 이동해야 시급 갱신됨 (`switchTab` 경유). 프로필 저장만으로는 시간외 탭 `#otHourly` 가 자동 갱신되지 않음 (`applyProfileToOvertime` 이 `profileChanged` 수신자가 아님).
- 수동 시급 입력 후 프로필 저장 시: 탭 재진입하면 `applyProfileToOvertime` 이 계산값으로 덮어씌움 (수동 입력값 유실 가능성).

## 7. localStorage 키 맵 (탭 간 공유 데이터)

`window.getUserStorageKey(base)` 헬퍼로 사용자별 prefix 적용 (사용자 A, B 데이터 격리). 헬퍼가 없으면 `<base>_guest` fallback.

| 용도 | 키 base | 실제 키 패턴 | 사용처 |
|------|---------|------------|--------|
| 프로필 | `bhm_hr_profile` | `getUserStorageKey('bhm_hr_profile')` | profile.js:7 |
| 시간외 기록 | `overtimeRecords` | `getUserStorageKey('overtimeRecords')` | overtime.js:8 |
| 시간외 명세서 캐시 | `overtimePayslipData` | `getUserStorageKey('overtimePayslipData')` | overtime.js:481 |
| 휴가 기록 | `leaveRecords` | 고정키 `leaveRecords` (사용자 구분 없음) | leave.js:9 |
| 근무이력 | `bhm_work_history` | `getUserStorageKey('bhm_work_history')` | work-history.js:5, app.js:3441 |
| 근무이력 시드 플래그 | `bhm_work_history_seeded` | `getUserStorageKey('bhm_work_history_seeded')` | work-history.js:8, app.js:3827 |
| 급여명세서 (월별) | `payslip_<uid>_<YYYY>_<MM>` | 직접 uid 삽입 (getUserStorageKey 미사용) | salary-parser.js:1092 |
| 수동 시급 | `otManualHourly` | `getUserStorageKey('otManualHourly')` | app.js:2004, 2358 |
| 즐겨찾기 (찾아보기) | `snuhmate_reg_favorites` | `getUserStorageKey('snuhmate_reg_favorites')` | regulation.js:161 |
| 테마 | `theme` | 고정키 (사용자 구분 없음) | regulation.js:72 |
| 데모 모드 | `bhm_demo_mode` | 고정키 | inline-ui-helpers.js:58 |

**특이 발견:** `leaveRecords` 키는 `getUserStorageKey` 를 사용하지 않고 고정 문자열. 다중 사용자 환경에서 휴가 기록이 공유될 수 있음 (leave.js:9).

## 8. 미검증 통합 경로 (Plan G 후보)

본 감사 시점 **자동 테스트 0%**:

- [ ] 프로필 입사일 수정 → 휴가 탭 연차 자동 재계산 (`applyProfileToLeave` 재호출 여부)
- [ ] 프로필 직종/호봉 수정 → 시간외 탭 시급 자동 갱신 (현재 탭 재진입 시에만 갱신됨)
- [ ] 프로필 직종/호봉 수정 → 급여 예산 탭 자동 재계산 (`profileChanged` → `_refreshPayEstIfActive`)
- [ ] 시간외 기록 추가/삭제 → 프로필 탭 요약 카드 갱신 (`overtimeChanged` → `_refreshProfile`)
- [ ] 휴가 기록 추가/삭제 → 프로필 탭 요약 카드 갱신 (`leaveChanged` → `_refreshProfile`)
- [ ] 급여명세서 업로드 → 프로필 이름/부서/직종/입사일 반영 (`applyStableItemsToProfile` 체인)
- [ ] 급여명세서 업로드 → 근무이력 카드 자동 추가 (`_propagatePayslipToWorkHistory`)
- [ ] 수동 시급 입력 후 프로필 저장 → 시간외 탭 재진입 시 시급 덮어씌움 여부

## 9. 결론

- 이벤트 수: **3개** (`profileChanged`, `overtimeChanged`, `leaveChanged`)
- 발신 지점 총수: **7개**
- 수신자 총수: **5개** (addEventListener 5건)
- Dead event (수신자 0): **없음** — 3개 모두 수신자 존재
- `applyProfileTo*` 주입 함수 수: **3개** (`applyProfileToOvertime`, `applyProfileToPayroll`, `applyProfileToLeave`)
- 미검증 경로: **8개** (Plan G 범위)

**특이 발견:**
1. `leaveRecords` localStorage 키가 `getUserStorageKey` 없이 고정값 — 다중 사용자 데이터 격리 구멍.
2. `applyProfileToOvertime` 은 `profileChanged` 이벤트를 수신하지 않음. 프로필 저장 후 시간외 탭을 재진입해야만 시급이 갱신됨.
3. `profileChanged` 수신자가 `pay-estimation.js` 단 1곳. 다른 탭(home 요약 카드 등)은 이벤트 미구독.
4. 급여명세서 업로드 체인이 `app.js`(파일업로드 핸들러)와 `payroll-views.js`(수동 재적용) 두 경로에 중복 구현됨.
