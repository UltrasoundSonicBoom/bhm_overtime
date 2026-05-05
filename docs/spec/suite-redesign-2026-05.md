# SUITE 재설계 — 사용자 요구 5건 (2026-05-05 캡처)

> 이 세션에서는 **5번(책갈피 탭 바텀시트)** 만 구현 완료.
> 1·2·3·4 는 다음 세션에서 spec 기반으로 진행.

---

## 1. 근무표 듀티 → 휴가 자동 매핑 (간호직 통합 탭)

### 사용자 요구
> "근무표에 연*, 생*으로 근무표가 있으면, 해당 휴가로 카운트 되어서 반영이 되어야 한다(연* = 연차, 생*=생리휴가 등). 시간외가 있다면 입력해서 dot으로 표기하고 캘린더 하단 정보칸에 기록"

### 현재 상태
- `apps/web/src/client/schedule-parser/duty-code-mapper.js` 의 `EXACT_MAP` 은 `연차/연/AL → 'AL'` 만 매핑.
- `생*` (생리휴가) / `병*` (병가) 등 한 글자 prefix + 별표 패턴은 매핑 없음.
- `apps/web/src/client/schedule-calc.js:265` 의 `mineMapToRecords` 가 AL 코드만 LEAVE.annual 레코드로 변환. 다른 휴가 유형 (menstrual/sick) 은 미지원.

### 제안 설계
1. **duty-code-mapper.js 확장**: `EXACT_MAP` 에 한글 prefix + `*` 패턴 추가:
   ```
   '연*': 'AL',  '생*': 'MENSTRUAL',  '병*': 'SICK',
   '경*': 'CEREMONY',  '교*': 'EDUCATION',  '출*': 'MATERNITY',
   ```
   → `STANDARD_CODES` 에 `MENSTRUAL/SICK/CEREMONY/EDUCATION/MATERNITY` 추가.
2. **DUTY → LEAVE.types 매핑 테이블**:
   ```js
   const DUTY_TO_LEAVE_TYPE = {
     AL: 'annual',
     MENSTRUAL: 'menstrual',
     SICK: 'sick',
     CEREMONY: 'family_event',
     EDUCATION: 'edu_training',
     MATERNITY: 'maternity',
   };
   ```
   `mineMapToRecords()` 가 위 테이블로 LEAVE.types id 결정.
3. **packages/data/src/index.js leaveQuotas** 의 기존 type id 사용 — 추가 type 정의 불필요.

### 수정 대상
- `apps/web/src/client/schedule-parser/duty-code-mapper.js`
- `apps/web/src/client/schedule-calc.js` (mineMapToRecords + DUTY_CODES)
- `apps/web/src/client/schedule-suite.js` (loadUnifiedCells: 듀티-기반 휴가 사용 인식)

---

## 2. 리커버리데이(RD) 트래커 — 간호직 핵심

### 단협/지침 규정 (이미 코드에 반영)
- `packages/data/src/index.js:638-643`:
  ```
  recoveryDay: {
    monthlyTrigger: 7,           // 월 7일 이상 야간 → 즉시 1일 부여, 누적 7 차감
    nurseCumulativeTrigger: 15,  // 간호부 누적 15회 → 1일 추가
    otherCumulativeTrigger: 20,  // 시설/이송/미화 등 20회
  }
  ```
- `packages/calculators/src/index.js:660` `calcNightShiftBonus()` 가 위 룰을 구현.
  - 입력: `nightShiftCount`, `prevCumulative`, `jobType`, `opts(birthDate/pregnancy/postpartum)`
  - 출력: `{ 야간근무가산금, 횟수, 리커버리데이, 누적리커버리데이, warnings, policyHits }`
- 야간 금지 게이트 (제32조8 만 40세+ 간호 / 제38조6 임신·산후 1년) 도 처리.

### 현재 누락
- 통합 탭에 RD 트래커 UI 없음.
- `OVERTIME.calcUnrewardedNightShifts()` (overtime.js:60) 가 24개월 누적을 계산하지만, schedule-suite 에서 안 쓰고 있음.
- `profile.nightShiftsUnrewarded` 필드와 schedule-tab 의 N 카운트 동기화는 schedule-tab.js 의 `_syncDutyToOvertime` 에서 일어나는데, suite 에서는 자체 cells 만 보고 있어 분리됨.

### 제안 설계
1. **deriveSuite() 확장** (packages/calculators/src/derive-suite.js):
   - 새 필드 추가: `nCount`, `recoveryDay: { thisMonth, cumulative24mo, threshold }`
   - 입력에 `jobType` + `prevCumulative` 옵션 추가. `calcNightShiftBonus()` 호출.
2. **통합 탭 우측 컨텍스트 패널** 에 새 카드 추가:
   ```
   🛌 리커버리데이 (RD)
   이번 달 N: 6회        | RD 발생: 0
   누적: 11회 / 15회 (간호) | 다음 RD: 4회 더
   ```
3. **간호직 게이트**: 직종이 간호직이 아니면 RD 카드 숨김 (통합2 와 분리).
4. **단위 테스트**: RD 트래커 12+ 케이스 (월 7회 / 누적 15·20 / 게이트).

### 수정 대상
- `packages/calculators/src/derive-suite.js` (RD 도출 추가)
- `apps/web/src/components/tabs/ScheduleSuiteIsland.astro` (우측 컨텍스트에 RD 카드)
- `apps/web/src/client/schedule-suite.js` (renderKPIs → RD 표시)
- `tests/unit/derive-suite.test.js` (RD 케이스 추가)

---

## 3. 통합2 — 간호직/특정 부서 외 직종용 (시간외 + 휴가)

### 사용자 요구
> "간호사나 특정부서를 제외한 직종은 '통합2' = '시간외'+'휴가'를 쓰면 된다"

### 차이점 (통합 vs 통합2)
| 영역 | 통합 (간호직) | 통합2 (그 외) |
|---|---|---|
| 듀티 | D/E/N/AL/RD/연*·생* | 없음 (근무표 안 씀) |
| 캘린더 셀 | 듀티 + ot dot + leave dot | ot dot + leave dot 만 |
| RD 트래커 | 핵심 | 없음 |
| 야간 가산 | 표시 | 없음 |
| 시간외 한도 | 표시 | 표시 |
| 연차 잔여 | 표시 | 표시 |

### 제안 설계
1. **통합2 = 통합 의 `mode='compact'` 모드**. 별도 탭 ID `tab-schedule-suite-2` (또는 동일 탭 + jobType 게이트로 자동 분기).
2. 간단한 분기 — `loadUnifiedCells(year, month, { mode })` 옵션:
   - `mode='full'` (간호직): SCHEDULE.mine + OVERTIME + LEAVE
   - `mode='compact'` (통합2): OVERTIME + LEAVE 만 (SCHEDULE 무시)
3. 캘린더 cell 렌더에서 `mode==='compact'` 면 day-duty letter 안 보이고 dot 만.
4. 직종 자동 라우팅:
   - jobType === '간호직' && department 가 특정 병동(추후 정의) → 통합
   - 그 외 → 통합2
5. 둘 다 같은 ESM 모듈/Astro Island 가 mode prop 으로 분기.

### 수정 대상
- `apps/web/src/client/schedule-suite.js` (mode 분기)
- `apps/web/src/components/tabs/ScheduleSuiteIsland.astro` (조건부 cell 렌더)
- `apps/web/src/pages/app.astro` (탭 노출 조건)
- nav (좌측/하단) — 간호직/그 외 분기

---

## 4. 통합·통합2 가 SoT — 기존 근무·휴가·시간외 탭 데이터 사용 금지

### 사용자 요구
> "통합,통합2를 제외한 현재의 근무,휴가,시간외는 차후에 기능이 안정화되면 삭제할 것이다. 따라서, 그곳에서 데이터를 참고하거나 가져오면 안되고, 통합, 통합2가 기본이 되어야 한다"

### 현재 상태 (위반 사항)
- `dashboard-home.js` 의 `_last6MonthsOt()` 가 `OVERTIME.calcMonthlyStats()` 직접 호출 → 통합 도출 거치지 않음. ✗
- `dashboard-home.js` 의 `_thisMonthDuty()` 가 `SCHEDULE.getMonth()` 직접 호출. ✗
- `_nextActions()` 가 `OVERTIME.getDateRecords()` / `SCHEDULE.getMonth()` 직접. ✗

### 핵심: 통합/통합2 가 **단일 진실의 원천(Single Source of Truth)**
- 모든 read 는 `loadUnifiedCells(year, month)` + `deriveSuite()` 경유.
- 쓰기 (편집) 는 `saveCellEntry(...)` 경유. 다른 모듈은 SCHEDULE/OVERTIME/LEAVE 를 직접 건드리지 않음.

### 제안 설계
1. **`packages/calculators/src/derive-suite.js` 확장** — 월 단위 / 6개월 시리즈 도출 함수 추가:
   ```js
   export function deriveSuiteSeries(monthsBack, profile) {
     // suite-cells 를 월별로 모아 deriveSuite() 적용한 series 반환
   }
   ```
2. **`dashboard-home.js` 수정** — 모든 read 를 `window.scheduleSuite.loadUnifiedCells()` + `deriveSuite()` 경유.
3. **다른 탭들도 점진적 마이그레이션**: `payroll-views.js`, `retirement-redesign.js` 등이 OVERTIME 직접 호출 시 → suite-derived API 로 교체.
4. **삭제 일정**: 통합/통합2 안정화 후 기존 ScheduleIsland/OvertimeIsland/LeaveIsland 의 자체 입력 폼은 통합 패널에서만 portal 형태로 재사용 (현재 5번 구현이 이 방향).
5. **장기**: 기존 탭 자체 제거. nav 에서 노출 안 함.

### 수정 대상
- `packages/calculators/src/derive-suite.js` (series 함수)
- `apps/web/src/client/dashboard-home.js` (suite 경유로 변경)
- 기타 OVERTIME/LEAVE/SCHEDULE 직접 호출하는 모듈들 grep 후 마이그레이션

---

## 5. 책갈피 탭 바텀시트 (구현 완료 — 이 세션)

✅ 통합 셀 클릭 → 모달 패널 + 책갈피 탭 헤더 (휴가 / 시간외·온콜).
✅ 휴가 = 기본 active. 시간외 탭 클릭 시 폼 전환.
✅ 두 폼은 LeaveIsland·OvertimeIsland 기존 BottomSheet 노드를 통째로 portal — DRY 보장.
✅ 패널 닫기 시 노드를 body 직속 원위치로 복귀. 두 BottomSheet 의 close 함수 호출.
✅ overtimeChanged / leaveChanged 이벤트 발생 시 패널 자동 닫힘.

### 구현 위치
- `apps/web/src/components/tabs/ScheduleSuiteIsland.astro` (마크업 + portal 무력화 CSS)
- `apps/web/src/client/schedule-suite.js` (`_portalIn` / `_portalOut` / `_setActiveTab` / `_onTabClick`)

---

## 다음 세션 진행 순서 권장

1. **Phase 1**: 1번 (듀티 → 휴가 매핑) — 단협 spec 명확, 단위 테스트 가능.
2. **Phase 2**: 2번 (RD 트래커) — `calcNightShiftBonus` 이미 있으므로 derive-suite 통합만.
3. **Phase 3**: 4번 (suite SoT 마이그레이션) — dashboard-home, 기타 모듈.
4. **Phase 4**: 3번 (통합2) — 가장 큰 분기 작업, mode prop 도입.

각 Phase 별 단위 테스트 ≥10건. Playwright 멀티 폭 검증.
