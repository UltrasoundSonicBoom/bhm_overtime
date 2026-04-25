# Known Issues — Plan D 감사 결과

> 작성일: 2026-04-23 (Plan D Task 6)
> 감사 중 발견된 확실한 버그 + 검증 공백 리스트. 후속 플랜 F/G/H 의 입력.
> 각 항목은 재현 가능한 grep 증거와 함께 기재.

## 1. 🔴 확실한 Latent 버그 (총 12건)

### Bug 1: showOtToast 시그니처 불일치
- **위치:** app.js:3598 (호출) / app.js:2319 (함수 정의)
- **증거:**
  ```
  grep -nE "showOtToast\(.*,\s*[0-9]{4}" app.js
  → 3598: showOtToast('⚠️ 직급/호봉이 자동 설정되지 않았습니다. 내 정보에서 확인해주세요.', 4500);

  grep -n "function showOtToast" app.js
  → 2319: function showOtToast(message, type = 'success')
  ```
- **현상:** `(message, type)` 시그니처인데 숫자 `4500` 을 type 자리에 전달.
  `type === 'warning'` 체크에서 `'4500' !== 'warning'` → 기본 녹색 토스트 표시. duration 의도로 추정.
- **수정 방향:** duration 인자 추가(`showOtToast(msg, type, duration)`)하거나 호출부를 `showOtToast(msg, 'warning')` 로 정리.
- **후속 플랜:** Plan F.

### Bug 2: localhost:3001/api/data/bundle fetch → CSP 차단
- **위치:** data.js:659
- **증거:**
  ```
  grep -n "localhost:3001\|api/data/bundle" data.js | head
  → (백엔드 fetch 시도 확인)
  ```
- **현상:** 매 페이지 로드 10초 후 백엔드 미배포 상태에서 fetch → 콘솔 에러 2건/로드.
  기능은 정상 (DATA_STATIC fallback) 이지만 콘솔 오염.
- **수정 방향 옵션:** (a) `location.hostname !== 'localhost'` dev 감지 후 스킵, (b) API 배포, (c) CSP 확장.
- **후속 플랜:** Plan F.

### Bug 3: CALC.calcRetirement 미존재 함수 호출
- **위치:** app.js:1347 (호출) / calculators.js (정의 없음)
- **증거:**
  ```
  grep -n "calcRetirement" calculators.js
  → (출력 없음 — 함수 미정의)

  grep -n "CALC\.calcRetirement" app.js
  → 1347: ret = typeof CALC !== 'undefined' ? CALC.calcRetirement({
  ```
- **현상:** try/catch 로 silent fail. 퇴직금 계산 UI 일부 누락 가능.
- **수정 방향:** `calculators.js` 에 `calcRetirement` 구현 추가하거나 올바른 함수명으로 호출 수정.
- **후속 플랜:** Plan F.

### Bug 4: CALC.calcServiceYears 네임스페이스 오류
- **위치:** salary-parser.js:1352 (잘못된 호출) / profile.js:129 (실제 정의)
- **증거:**
  ```
  grep -n "calcServiceYears" calculators.js
  → (출력 없음)

  grep -n "calcServiceYears" profile.js
  → 129: calcServiceYears(hireDateStr, baseDate = new Date()) {

  grep -n "calcServiceYears" salary-parser.js
  → 1352: const serviceYears = CALC.calcServiceYears ? CALC.calcServiceYears(profile.hireDate) : 0;
  ```
- **현상:** `CALC.calcServiceYears` 는 undefined → 삼항 폴백으로 `serviceYears = 0` 고정. 파서 근속연수 계산 실패.
- **수정 방향:** `CALC.calcServiceYears` → `PROFILE.calcServiceYears` 로 변경.
- **후속 플랜:** Plan F.

### Bug 5: calcNursePay 내부 상수 하드코딩 (데이터 드리프트)
- **위치:** calculators.js:759
- **증거:**
  ```
  grep -n "PRECEPTOR_PER_2WEEKS\|200000" calculators.js
  → 759: const PRECEPTOR_PER_2WEEKS = 200000; // 제63조의2

  grep -n "preceptorPay" data.js
  → 158: preceptorPay: 200000,       // 프리셉터 교육수당
  ```
- **현상:** `DATA.allowances.preceptorPay` (200,000) 가 있음에도 함수 내부에 동일 상수 중복 정의.
  단협 개정 시 data.js 만 수정해도 calculators.js 는 갱신 안 됨.
- **수정 방향:** `PRECEPTOR_PER_2WEEKS` 를 `DATA.allowances.preceptorPay` 참조로 교체.
- **후속 플랜:** Plan F (또는 Plan E 에서 drift-check 로 감지).

### Bug 6: recoveryDay.otherCumulativeTrigger 미사용
- **위치:** calculators.js `calcNightShiftBonus` / data.js:601-602
- **증거:**
  ```
  grep -n "nurseCumulativeTrigger\|otherCumulativeTrigger" calculators.js
  → 453: if (newCumulative >= rd.nurseCumulativeTrigger) {
  → 455:     newCumulative -= rd.nurseCumulativeTrigger;
  (otherCumulativeTrigger 참조 없음)

  grep -n "otherCumulativeTrigger" data.js
  → 602: otherCumulativeTrigger: 20    // 시설·이송·미화 등 누적 기준
  ```
- **현상:** `nurseCumulativeTrigger` (15회) 만 사용. 시설/이송/미화 직종의 20회 기준 미적용.
  해당 직종 리커버리 데이 계산 오류.
- **수정 방향:** 직종 파라미터에 따라 `nurseCumulativeTrigger` vs `otherCumulativeTrigger` 분기 추가.
- **후속 플랜:** Plan F.

### Bug 7: 장기재직 휴가 값 불일치 (데이터 소스 충돌)
- **위치:** data.js:299 (leaveTypes note 필드) vs data.js:421 (FAQ 항목)
- **증거:**
  ```
  grep -n "장기재직\|20년" data.js
  → 299: note: '10년↑ 5일, 20년↑ 7일 (2026시행)', ref: '2025.10단협'
  → 421: a: '• 10년 재직: 5일\n• 20년 이상: 10일', ref: '복무규정'
  ```
- **현상:** 동일 파일 내 "20년 이상 7일" (단협 기준) vs "20년 이상 10일" (복무규정 기준) 모순.
  사용자에게 잘못된 정보 표시 가능.
- **수정 방향:** 규정 원본(full_union 단협 + 복무규정) 확인 후 기준 하나로 통일. 출처 명기.
- **후속 플랜:** Plan F.

### Bug 8: 미사용 공개 함수 (dead export) 3건
- **위치:**
  - `calcSeverancePay` (calculators.js:303) — `calcSeveranceFullPay` 에 대체됨, 외부 호출 0
  - `checkNurseScheduleRules` (calculators.js:775) — 외부 호출 0
  - `calcPromotionDate` (calculators.js:410) — 외부 호출 0
- **증거:**
  ```
  grep -rn "calcSeverancePay\|checkNurseScheduleRules\|calcPromotionDate" --include="*.js" .
  → 결과가 calculators.js 정의 라인에만 국한됨 (호출 없음)
  ```
- **현상:** 유지보수 혼선, 번들 크기 증가.
- **수정 방향:** 제거 또는 `/** @deprecated */` 주석 추가.
- **후속 플랜:** Plan F 또는 Plan C Phase 2.

### Bug 9: leaveRecords 스토리지 키 격리 미적용
- **위치:** leave.js:9
- **증거:**
  ```
  grep -n "leaveRecords\|getUserStorageKey" leave.js | head -10
  → 9:  STORAGE_KEY: 'leaveRecords',
  → 20: return JSON.parse(localStorage.getItem('leaveRecords')) || {};
  (getUserStorageKey 호출 없음)
  ```
- **현상:** 타 탭(overtime, profile)은 `getUserStorageKey()` 로 유저별 키 분리.
  leave.js 는 고정 키 `'leaveRecords'` 사용 → 멀티 유저 PC 에서 데이터 섞임 위험 + 키 명명 비대칭.
  (주석에 "의도된 설계"라 기재되어 있으나 일관성 미흡)
- **수정 방향:** 의도 설계 유지(단일 기기 단일 유저 가정) 또는 `getUserStorageKey('bhm_leave_records')` 로 통일. 판단 필요.
- **후속 플랜:** Plan F (의사결정 필요).

### Bug 10: applyProfileToOvertime 이 profileChanged 미수신
- **위치:** overtime.js / app.js (applyProfileToOvertime 정의 및 호출)
- **증거:**
  ```
  grep -rn "addEventListener.*profileChanged" --include="*.js" .
  → pay-estimation.js:873: window.addEventListener('profileChanged', _refreshPayEstIfActive);
  (overtime 관련 수신자 없음)

  grep -n "applyProfileToOvertime" app.js
  → 365: applyProfileToOvertime(); initOvertimeTab();  (탭 초기화 시에만 호출)
  ```
- **현상:** 프로필 저장 후 이미 열린 시간외 탭의 시급이 즉시 갱신 안 됨.
  사용자가 "프로필 바꿨는데 시간외 탭에 반영 안 됨" 으로 체감.
- **수정 방향:** overtime 탭(또는 app.js)에 `profileChanged` 리스너 추가해 현재 탭이 overtime 이면 `applyProfileToOvertime()` 재호출.
- **후속 플랜:** Plan G.

### Bug 11: profileChanged 수신자 희소 (1곳뿐)
- **위치:** 발신자 다수 (profile.js, salary-parser.js, profile-tab.js 등) / 수신자 1곳 (pay-estimation.js:873)
- **증거:**
  ```
  grep -rn "addEventListener.*profileChanged" --include="*.js" .
  → pay-estimation.js:873 (1건만)

  grep -rn "dispatchEvent.*profileChanged\|profileChanged.*CustomEvent" --include="*.js" .
  → (발신 다수)
  ```
- **현상:** 홈/설정/시간외/휴가 탭이 profileChanged 이벤트를 수신하지 않아 프로필 변경 후 UI 갱신 안 됨.
- **수정 방향:** 각 탭이 활성화 상태일 때 profileChanged 수신 후 관련 UI 재렌더링.
- **후속 플랜:** Plan G.

### Bug 12: 급여명세서 체인 중복 구현
- **위치:** app.js (파일 업로드 핸들러) / payroll-views.js (수동 재적용 경로)
- **현상:** 급여명세서 처리 로직이 두 파일에 각각 구현되어 있음.
  한 쪽 수정 시 다른 쪽 누락 위험. 규정 변경 시 양쪽 동기화 부담.
- **수정 방향:** 공통 함수(`processPayslipChain()` 등)로 통합하고 양쪽에서 호출.
- **후속 플랜:** Plan F.

---

## 2. ✅ 통합 경로 검증 완료 (Plan G — 2026-04-25)

상세 리포트: `plan-g-integration-audit.md` + `data-flow-audit.md`.

- [x] 프로필 입사일 수정 → 휴가 탭 연차 자동 재계산 ✅ (data-flow-audit)
- [x] 프로필 직종/호봉 수정 → 시간외 탭 시급 자동 갱신 (Bug 10 연관) ✅ (fix/profile-sync)
- [x] 프로필 직종/호봉 수정 → 급여 예상 탭 자동 재계산 ✅ (plan-g-integ ①)
- [x] 시간외 기록 추가/삭제 → 프로필 탭 요약 카드 갱신 ✅ **개념 정정**: profileSummary 는 시간외/휴가 무관, 홈 탭이 갱신 대상 (overtimeChanged 라우팅 검증 완료)
- [x] 휴가 기록 추가/삭제 → 프로필 탭 요약 카드 갱신 ✅ **개념 정정** (동일 — leaveChanged 는 홈 카드 갱신)
- [x] 급여명세서 업로드 → 프로필 이름/부서/직종/입사일 반영 ✅ **정적 검증** (`salary-parser.js:1230-1280` applyStableItemsToProfile)
- [x] 급여명세서 업로드 → 근무이력 카드 자동 추가 ✅ **정적 검증** (`window._propagatePayslipToWorkHistory` 노출)
- [x] 수동 시급 입력 후 프로필 저장 → 탭 재진입 시 우선순위 적용 ⚠️ **정책 확정** (프로필 = SoT, 수동 입력은 일시. `otHourlyHint` UI 로 명시)

---

## 3. ✅ Plan H — 완전 미검증 영역 1차 검증 완료 (2026-04-25)

상세 리포트: `plan-h-audit.md`.

- [x] `retirement.html` 독립 페이지 ✅ 합계 120,575,343원 정확 + 임금피크 옵션 토글
- [x] `regulation.html` 조항 검색 + PDF 뷰어 ✅ 271 article 카드 + 검색 240결과
- [x] 급여 탭 `pay-calc` 서브탭 ✅ 예상 실수령액 ₩4,582,641 정상
- [x] 급여 탭 `pay-qa` 서브탭 (수당 Q&A) ✅ 4개 서브탭 + 수당 계산기 노출
- [x] AppLock PIN 설정/변경/해제 + 생체 ✅ 모듈 + 함수 노출 (헤더 ⚙️ 진입). 실제 PIN 입력 plumbing 은 수동 스모크 잔여
- [x] 백업 다운로드/복원 ✅ **2026-04-25 round-trip 자동 검증 완료** — 시드(프로필+시간외 2건+휴가 2건) → 1,894 bytes 직렬화 → localStorage 클리어 → 복원 후 7/7 필드 일치 + 손상/이미지/PDF 거부 7/7 통과. 리포트: `backup-roundtrip-audit.md`
- [x] `chrome-extension/` ✅ manifest_v3 + popup + content/background 갖춤. unpacked 로드 수동 잔여
- [x] `nurse_admin/` 서브앱 ✅ admin/index/my-day 구조 확인. 별도 plan 으로 다룰 것
- [x] 모바일 뷰포트 (390×844) ✅ 5탭 가로 스크롤 0건 + 콘솔 에러 0건

---

## 4. 우선순위 요약

| 우선순위 | 항목 | 수량 | 후속 플랜 |
|---------|------|------|----------|
| 🔴 즉시 수정 | 확실한 latent 버그 | 12건 | Plan F |
| 🟡 테스트 필요 | 통합 경로 미검증 | 8건 | Plan G |
| 🟠 범위 확장 | 페이지/영역 미검증 | 9건 | Plan H |
| 🟢 구조 개선 | SoT 드리프트 방지 | 1 (복합) | Plan E |

**총 30 개 항목**. Plan E → F → G → H 순서 권장.

---

## Plan F 실행 결과 (2026-04-24)

| Bug | 상태 | 해결 커밋 |
|-----|------|-----------|
| #1 showOtToast 시그니처 | ✅ 해결 | (batch A 커밋) |
| #2 localhost:3001 CSP | ✅ 해결 | (batch A) |
| #3 CALC.calcRetirement | ✅ 해결 — calcSeveranceFullPay 로 교체 | (batch A) |
| #4 CALC.calcServiceYears 네임스페이스 | ✅ 해결 — PROFILE 로 교체 | (batch A) |
| #5 calcNursePay 하드코딩 | ✅ 해결 — 함수 자체 제거 | (batch B) |
| #6 recoveryDay 시설직 분기 | ✅ 해결 — jobType 분기 + 테스트 5개 | (batch C) |
| #7 장기재직 휴가 | ✅ 해결 — 7일 canonical | (batch B) |
| #8 dead exports | ✅ 부분 해결 — 4개 제거. `calcUnionStepAdjust` 는 payroll.js 에서 활성 호출 확인되어 유지 (Plan D 오분류 정정) | (batch B) |
| #9 leaveRecords 격리 | 🟡 유지 — 의도 설계, 별도 판단 후 Plan | — |
| #10 applyProfileToOvertime profileChanged 미수신 | ✅ 2026-04-25 해소 — `app.js` 전역 `setupLiveSyncListeners()` IIFE 추가. profileChanged → 활성 탭에 따라 applyProfileTo* + init* 재호출 | (audit/data-flow + fix/profile-sync) |
| #11 profileChanged 수신자 희소 | ✅ 2026-04-25 해소 — overtime/leave/payroll/home 모두 활성 시 라이브 갱신. 추가로 overtimeChanged·leaveChanged·payslipChanged 도 홈/관련 탭에 라우팅 | (fix/profile-sync) |
| #12 급여명세서 체인 중복 | 🟡 별도 플랜 이연 | — |
| #13 배우자 출산 10일 (신규) | ✅ 해결 — data.js 4곳 + hospital_guidelines 정정 | (batch B) |

테스트 상태: 66 passed | 0 skipped (Plan E 스킵 전부 해제).

---

## Plan K 실행 결과 (2026-04-24) — full_union_regulation_2026.md 전문 복원

축약본 (45조/0 합의/438줄) → handbook PDF p.5~104 기반 완전 복원 (**95조/364 합의/3,145줄**). 이 과정에서 **handbook ↔ data.js 신규 드리프트 발견** — 단, 사용자 지시 "full_union 은 이전 버전 참고, 반영하지 말 것" 에 따라 **계산 수정은 미적용**. 향후 Plan L (handbook ↔ DATA 재정합) 후보로 기록.

### 신규 드리프트 (Plan D 감사에서 누락된 항목)

| # | 항목 | handbook 값 | data.js 현재 값 | 위치 | 조치 |
|---|------|-------------|-----------------|------|------|
| D-1 | 급식보조비 | **120,000원/월** (p.34 + p.39 + p.104) | `allowances.mealSubsidy: 150000` | data.js:145 | **해소 (2026-04-24)** — 사용자 지시로 `full_union_regulation_2026.md:1042` 본문 120k → 150k 로 정정 (2019.12.1 별첨 일람표 반영). handbook PDF 원본 120k 값은 역사적 기록으로만 남음 |

### 전사 시 정정된 기타 값 (full_union 내부)

- 장기재직 휴가 20년+: **7일** (handbook p.30 `<2025.10>`) — data.js FAQ `7일` 로 Plan F Bug #7 에서 수정 완료
- 배우자 출산: Plan F Bug #13 에서 handbook 본문 기준 `10일` 로 정정했으나, **2026-04-24 사용자 지시로 별첨 일람표 `20일` 기준으로 재정정** (2025.10 단협 반영). 현재 SoT: full_union.md 본문 20일 + 별첨 20일 + data.js 20일 + hospital_guidelines 20일 모두 일치.

---

## 5. 권장 실행 순서

1. **Plan E** (구조 개선) 먼저 — 이후 모든 수정의 안전망.
2. **Plan F** (버그 12건) — Plan E 의 registry 에 의존하여 drift 재발 방지하며 수정.
3. **Plan G** (통합 e2e) — Bug 10~11 해결 검증 포함.
4. **Plan H** (미검증 페이지) — 가장 범위 넓으나 리스크 낮음.
