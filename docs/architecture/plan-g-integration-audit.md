# Plan G 통합 경로 검증 리포트

> 작성일: 2026-04-25
> 워크트리: `.worktrees/plan-g-integ` (브랜치 `audit/plan-g-integration`)
> 대상: known-issues.md "🟡 검증 공백 — 통합 경로" 8건 중 4번~8번 (1~3번은 fix/profile-sync 에서 검증 완료).

## 검증 결과 매트릭스

| # | 경로 | 결과 | 비고 |
|---|------|------|------|
| 1 | 프로필 입사일 → 휴가 연차 재계산 | ✅ | data-flow-audit 검증 완료 |
| 2 | 프로필 직종/호봉 → 시간외 시급 자동 갱신 | ✅ | fix/profile-sync (#10 해소) |
| 3 | 프로필 직종/호봉 → 급여예상 재계산 | ✅ | 본 검증 — 배너 "J3 5년차" 자동 갱신 + applyProfileToPayroll + initPayrollTab 호출 |
| 4 | 시간외 기록 추가/삭제 → 프로필 요약 카드 갱신 | ✅ **개념 정정** | profileSummary 는 시간외/휴가 무관 (직급/통상임금만). overtimeChanged 는 홈 카드를 갱신 (기존 fix 검증 완료) |
| 5 | 휴가 기록 추가/삭제 → 프로필 요약 카드 갱신 | ✅ **개념 정정** | 동일. leaveChanged 는 홈 카드를 갱신 |
| 6 | 명세서 업로드 → 프로필 이름/부서/직종/입사일 반영 | ✅ **정적 검증** | `salary-parser.js:1230-1280` `applyStableItemsToProfile` 코드 경로 존재. employeeInfo.{hireDate, department, jobType, employeeNumber, payGrade(grade/year)} 모두 매핑/반영 |
| 7 | 명세서 업로드 → 근무이력 카드 자동 추가 | ✅ **정적 검증** | `app.js:3856` + `window._propagatePayslipToWorkHistory` 함수 노출 확인 (실제 PDF 업로드 흐름 의존이라 E2E 미검증) |
| 8 | 수동 시급 입력 vs 프로필 우선순위 | ⚠️ **정책 결정 필요** | 수동 입력 50,000원 → 프로필 재저장 시 자동 덮어쓰기 (31,071원). 의도된 동작? |

## 상세

### ① 프로필 직종/호봉 → 급여예상 재계산
- 시나리오: 프로필 S1 → 급여 탭 진입 → 등급 J3 변경.
- 결과: `psProfileBanner` 가 "J3 5년차" 로 즉시 갱신. 통상임금 6,493,759 → 5,740,891 자동 재계산 (`PROFILE.calcWage`).
- 트리거: `setupLiveSyncListeners` 의 `profileChanged` → `applyProfileToPayroll() + initPayrollTab()`.

### ②③ 시간외/휴가 기록 → 프로필 요약 카드
- 시나리오: 시간외/휴가 기록 추가 후 프로필 탭의 `profileSummary` 갱신 여부.
- **결과**: 프로필 요약 카드는 시간외/휴가 통계를 표시하지 않음 (직급/호봉/통상임금/시급/breakdown 만). 
- **결론**: 원래 의도된 설계. 시간외/휴가 통계는 **홈 탭의 책임** (이미 검증 완료). known-issues 항목이 모호한 표현이었음 — "프로필 탭" 이 아닌 "홈 탭" 으로 갱신 대상이 명확해야 함.

### ④⑤ 명세서 업로드 → 프로필 메타데이터 + 근무이력
- **정적 검증** (E2E PDF 의존이라 자동화 어려움).
- `salary-parser.js:1230-1280` `applyStableItemsToProfile` 함수가 다음을 매핑:
  - `employeeInfo.hireDate` → `profile.hireDate` (변경 시 갱신)
  - `employeeInfo.department` → `profile.department`
  - `employeeInfo.jobType` → 매핑 테이블 (간호 → 간호직 등) → `profile.jobType`
  - `employeeInfo.employeeNumber` → `profile.employeeNumber` (신규 시만, 오탈자 보호)
  - `employeeInfo.name` → `profile.name` (신규 시만)
  - `employeeInfo.payGrade` → 정규식 파싱 → `profile.grade` + `profile.year`
- `app.js:3856` 주석 "업로드로 부서/입사일이 새로 들어왔으면 근무이력 자동 시드 다시 시도".
- `window._propagatePayslipToWorkHistory` 함수 전역 노출 확인.

### ⑥ 수동 시급 입력 우선순위 — ⚠️ 정책 결정
| 단계 | otHourly 값 |
|------|-------------|
| 초기 (프로필 J3 → 자동 채움) | 27,468 |
| 사용자 수동 입력 | **50,000** |
| 프로필 재저장 (S1) | **31,071** ← 수동 50k 가 자동 덮어써짐 |
| 다른 탭 → 시간외 재진입 | 31,071 (프로필 우선 유지) |

**해석:**
- "프로필 = SoT" 정책 → 자동 덮어쓰기는 정상.
- "사용자 수동 입력은 일시적 시뮬레이션 (예: 다른 직급 시급으로 임시 계산)" 시나리오 → 덮어쓰기는 결함.

**권장 조치:**
- 옵션 A: 현재 동작 유지 + UI에 "내 정보 자동반영" 텍스트로 사용자에게 명시 (이미 `otHourlyHint` 에 표시됨 ✅).
- 옵션 B: 수동 입력 추적 플래그 추가 — 사용자가 직접 입력하면 `data-manual="true"` 설정, 라이브 동기화 시 이 플래그가 있으면 덮어쓰지 않음.

옵션 A 권장 (현 UX 가 명시적). 옵션 B 는 사용자 요청 시 추가.

## 콘솔 + 테스트
- 콘솔 에러: 0건
- Tests: 153 passed (회귀 없음)

## 산출물
- 본 리포트: `docs/architecture/plan-g-integration-audit.md`
- known-issues.md "🟡 검증 공백" 섹션의 8개 체크박스 갱신
