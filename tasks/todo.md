# BHM Overtime — 작업 체크리스트

> 상세 플랜: [tasks/plan-regulation-unification.md](plan-regulation-unification.md)  
> **v1.4 업데이트 (2026-04-14)**: App Lock 트랙 추가. 런칭 게이트(G3/G5) 병행 작업.

---

## 🔒 App Lock 트랙 — PIN / 생체인증 (런칭 전 선택적)

> 상세 플랜: [tasks/plan-app-lock.md](plan-app-lock.md)  
> 목적: G5 First-run 경험 + G3 민감 데이터 보호 신호 강화

### Phase 1: 핵심 잠금 모듈

- [ ] **L1** `appLock.js` 신규 파일 — PIN setup/verify/lockout 핵심 로직
  - [ ] `AppLock.setupPin(pin)` — SHA-256(pin+salt), bhm_settings 저장
  - [ ] `AppLock.verifyPin(pin)` — 검증 + 5회 실패 → lockUntil 설정
  - [ ] `AppLock.isLocked()` / `AppLock.unlock()` / `AppLock.disablePin()`
- [ ] **L2** FOUC 방지 인라인 스크립트 + 잠금 오버레이 렌더링
  - [ ] `index.html` `<head>` 인라인: pinEnabled → body visibility:hidden
  - [ ] `shared-layout.js` AppLock.checkAndPrompt() 훅
  - [ ] `style.css` `.app-lock-overlay` 스타일 (모바일 키패드 포함)

#### Checkpoint 1
- [ ] PIN 설정 → 새로고침 → 잠금 오버레이 표시 확인
- [ ] FOUC 없음 (콘텐츠 flash 없음) 확인
- [ ] PIN 없는 상태에서 앱 로드 지연 없음 확인

### Phase 2: 설정 UI + PIN 재설정

- [ ] **L3** 프로필 탭 "앱 잠금" 설정 카드
  - [ ] PIN 미설정 → "PIN 설정하기" 버튼
  - [ ] PIN 설정 → "켜짐" 뱃지 + 변경/해제 버튼
  - [ ] PIN 설정 모달 (숫자 키패드, 4-6자리, 확인 재입력)
- [ ] **L4** PIN 분실 → Google 재인증 재설정 경로
  - [ ] 잠금 오버레이 "PIN을 잊으셨나요?" 링크
  - [ ] OAuth 성공 → 기존 PIN 삭제 + 새 PIN 설정 모달

#### Checkpoint 2
- [ ] PIN 설정 → 잠금 → 해제 → 변경 → 해제 전체 흐름 확인
- [ ] 5회 실패 → 카운트다운 표시 확인
- [ ] Google 미로그인 상태에서 앱 정상 동작 확인

### Phase 3: 생체인증 + 넛지 + Drive 연동

- [ ] **L5** 생체인증 (WebAuthn) 등록/인증 UI
  - [ ] `AppLock.BiometricLock.register()` / `.authenticate()`
  - [ ] 잠금 오버레이 "Face ID / 지문으로 열기" 버튼
  - [ ] 생체인증 취소 → PIN 화면 자동 전환
- [ ] **L6** Google 로그인 직후 PIN 설정 넛지 바텀시트
  - [ ] 로그인 성공 후 → 넛지 모달 (1회, dismissible)
  - [ ] "설정할게요" → PIN 설정 즉시 / "나중에" → pinNudgeDismissed:true
- [ ] **L7** PIN 설정을 Google Drive에 백업
  - [ ] syncManager.js DATA_MAP에 bhm_settings (pinEnabled/Hash/Salt) 추가

#### Checkpoint 3 (완성)
- [ ] 첫 설치 → Google 로그인 → 넛지 → PIN 설정 → 잠금 → 생체인증 전체 흐름
- [ ] Drive 복원 후 PIN 설정 유지 확인
- [ ] regulation.html 등 타 페이지에서도 잠금 동작 확인

---

## 🔵 Phase 0: 런칭 게이트 잔여 (LAUNCH.md 기준)

- [ ] **G3** 데이터 복구 UX — orphan 백업 키 "복구" 메뉴 (프로필 탭 접이식)
- [ ] **G4** 법무 체크 (상표/로고/개인정보처리방침 검수)
- [ ] **G5** First-run — 권한 요청 전 "왜 이 권한인가" 한 줄 안내 모달
- [ ] **G6** 관측 대시보드 — supabase_launch_views.sql 실행
- [ ] **G8** 공유 루프 — 앱 내 "공유하기" 버튼 (URL + QR)

---

> **v1.3 업데이트 (2026-04-12)**: Phase 0-5 완료. Phase 6-10 실행 순서: 6 → 7 → 9 → 8 → 10

---

## ✅ Phase 0-5 완료 (2026-04-12, 106 PASS / 0 FAIL)

| Phase | 테스트 | 결과 |
|-------|--------|------|
| Phase 0: 전수 감사 | tests/phase0-audit.js (20) | ✅ PASS |
| Phase 1: regulation-constants.js | tests/phase1-constants.js (28) | ✅ PASS |
| Phase 2: 버그 수정 6종 | tests/phase2-bugfix.js (14) | ✅ PASS |
| Phase 3: 회귀 검증 | tests/calc-regression.js (31) | ✅ PASS |
| Phase 4: 표시 일관성 | tests/phase4-display.js (5) | ✅ PASS |
| Phase 5: 데드코드 정리 | tests/phase5-cleanup.js (8) | ✅ PASS |

생성 파일: `regulation-constants.js`, `docs/regulation-audit-2026.md`, `docs/bugfix-impact-2026.md`, `data/archive/PayrollEngine.legacy.js`

---

## 🔵 Phase 6: Union Regulation Admin UI — **실행 1순위 (독립)**

> 테스트: `tests/phase6-admin-ui.js` | 파일: `admin/union_regulation_admin.html`

- [ ] **R11-a** `admin/union_regulation_admin.html` 골격 + 상수 목록 테이블 렌더링
  - [ ] `regulation-constants.js` script 태그 로드 → 조항/키/값 테이블 표시
- [ ] **R11-b** `nurse_regulation.json` 동기화 상태 비교 패널
  - [ ] fetch로 nurse_regulation.json 로드 → 불일치 항목 🔴 표시
- [ ] **R11-c** 인라인 편집 + 변경 내용 클립보드 복사 (DB 연결 전 개발자 전달용)
- [ ] **R12** `nurse_regulation.json` BUG-N-01 수정 (야간 2.0 / 휴일 1.5 분리)
  - [ ] `night_22_to_06: 2.0`, `holiday_within_8h: 1.5`, `holiday_over_8h: 2.0`

### Phase 6 체크포인트
- [ ] `admin/union_regulation_admin.html` 브라우저에서 열리고 31개+ 상수 목록 표시
- [ ] nurse_regulation.json 불일치 항목 시각 경고 확인
- [ ] phase6-admin-ui.js PASS

---

## ✅ 이미 완료된 항목 (2026-04-10 체크포인트 기준)

> 새로 구현할 필요 없음

- [x] **Track A**: RAG 완료 (145 chunks + 145 embeddings, FAQ 50개 임베딩)
- [x] **Track B**: Admin & Content API 완료 (`adminOps.ts` — draft/review/published 워크플로우)
- [x] **ops-orchestrator 에이전트**: 자연어 → 운영팀 라우팅 에이전트 구현 완료
- [x] **admin/index.html**: 버전/FAQ/시나리오 관리 UI 기존 구현

---

## 🔵 Phase 7: 역계산 검증 시스템 — **실행 2순위 (독립, Phase 8 선행 필수)**

> 테스트: `tests/phase7-verify.js` | 수정: `calculators.js` + `app.js`

- [ ] **R13** `CALC.verifyPayslip(parsedData, calcResult, {tolerance})` 구현
  - [ ] 시그니처: `({items:[{name,amount}], totalGross}, calcResult, {tolerance:0.01})`
  - [ ] 항목별 비교: 실제 vs 예상, diffPct, 상태(일치/오차/불일치)
  - [ ] 허용오차: Math.abs(diff)/expected ≤ 0.01 또는 ≤ 500원
  - [ ] 반환: `{matched, discrepancies:[{item,expected,actual,diffPct}]}`
- [ ] **R14** 역계산 검증 UI (app.js 섹션 추가)
  - [ ] 항목별 비교 테이블 (일치 ✅ / 오차 🟡 / 불일치 🔴)
  - [ ] 불일치 항목에 버그 번호 링크 표시

### Phase 7 체크포인트
- [ ] 실제 명세서 2512/2601 역계산 결과 브라우저 확인
- [ ] BUG-01(리프레시), BUG-02(장기근속) 역계산에서 탐지됨 확인
- [ ] phase7-verify.js PASS

---

## 🔵 Phase 8: AI 인사이트 엔진 — **실행 4순위 (Phase 7 완료 후)**

> 테스트: `tests/phase8-insight.js` | 신규: `insight-engine.js`

- [ ] **R15** `insight-engine.js` 신규 생성
  - [ ] `INSIGHT.generateAIReport(payslips)` → `{period, summary, anomalies, trend}`
  - [ ] 이상 탐지 규칙: ① 수당 소멸 ② 시간외 급증(>40h) ③ 장기근속 계단 이상
- [ ] **R16** 인사이트 대시보드 UI (app.js 또는 신규 dashboard.js)
  - [ ] 월별 통상임금 트렌드 차트/테이블
  - [ ] 이상 탐지 알림 카드
  - [ ] "AI에게 설명하기" JSON 복사 버튼

### Phase 8 체크포인트
- [ ] 3개월 명세서 집계 트렌드 브라우저 표시
- [ ] AI 리포트 JSON.parse 가능 확인
- [ ] phase8-insight.js PASS

---

## 🔵 Phase 9: 간호사 규정 CALC 통합 — **실행 3순위 (독립)**

> 테스트: `tests/phase9-nurse.js` | 수정: `calculators.js`, `content/policies/2026/nurse_regulation.json`

| 항목 | 규정 출처 | 현황 |
|-----|----------|------|
| 프리셉터 수당 (200,000원/2주) | `new_hire_training.preceptor_allowance` | ❌ CALC 없음 |
| 프라임팀 대체 (20,000원/일) | `shift_worker_rules.substitute_work.prime_team_allowance` | ❌ CALC 없음 |
| 리커버리데이 (야간 7회 초과 시 1일) | `shift_worker_rules.recovery_day` | ❌ CALC 없음 |
| 40세 이상 야간 제외 경고 | `shift_worker_rules.age_based_night_exclusion` | ❌ 없음 |
| BUG-N-01 야간/휴일 배율 분리 | 제47조(2.0) / 제34조(1.5) | ❌ 미수정 |

- [ ] **R17** `CALC.calcNursePay({preceptorWeeks, primeTeamDays})` 구현 (`calculators.js`)
  - [ ] 프리셉터: preceptorWeeks × 100,000
  - [ ] 프라임팀: primeTeamDays × 20,000
- [ ] **R17-b** `CALC.checkNurseScheduleRules({nightShifts, age, pattern})` 구현
  - [ ] 리커버리데이: nightShifts > 7 → recoveryDays = nightShifts - 7
  - [ ] 40세+ 야간: age ≥ 40 && nightShifts > 0 → warnings 추가
  - [ ] N-OFF-D 패턴 탐지
- [ ] **R18** 급여 시뮬레이터에 간호사 전용 입력 추가 (app.js)
- [ ] **R19** `nurse_regulation.json` BUG-N-01 수정
  - [ ] Phase 6에서 R12로 처리됐으면 skip

### Phase 9 체크포인트
- [ ] nightShifts=7 → recoveryDays=0 / nightShifts=8 → recoveryDays=1 확인
- [ ] 프리셉터 2주 → 200,000원 확인
- [ ] phase9-nurse.js PASS

---

## 🔵 Phase 10: 퇴직금 강화 — **실행 5순위**

> 테스트: `tests/phase10-retirement.js` | 수정: `retirement-engine.js`

| 문제 | 현황 |
|-----|------|
| 3개월 평균임금 | 명세서 1개 grossPay만 사용 |
| ARCH-01 DATA 참조 | 하드코딩 SEV_PAY/SEV_MULTI 잔존 |
| 운영기능직 임금피크 보호 | 미구현 (최저임금 120% 기준) |

- [ ] **R20** `RetirementEngine.getThreeMonthAverage(payslips)` 구현
  - [ ] 반환: `{average, months:3, warning: null|'insufficient_data'|'wage_peak_protection'}`
  - [ ] 3개월 미만 데이터 → `warning: 'insufficient_data'`
  - [ ] 평균 < 최저임금×209h×1.2 → `warning: 'wage_peak_protection'`
- [ ] **R21** ARCH-01 완결: `retirement-engine.js` SEV_PAY/SEV_MULTI 하드코딩 제거 → DATA 참조
  - [ ] fallback 유지 (DATA 미존재 시 기존 하드코딩값 사용)
  - [ ] 퇴직금 계산 결과 변경 없음 확인 (calc-regression.js 재실행)
- [ ] **R22** 운영기능직 임금피크 보호: 2026 최저임금 9,860원 × 209h × 1.2 = 2,472,120원 기준
- [ ] **R23** 퇴직금 UI — 평균임금 breakdown 탭 + 명세서 기반 vs 수동입력 비교

### Phase 10 체크포인트
- [ ] getThreeMonthAverage() 3개월 평균 정확도 확인
- [ ] ARCH-01: retirement-engine.js에 SEV_PAY 하드코딩 없음 확인 (grep)
- [ ] phase10-retirement.js PASS

---

## ✅ 최종 체크포인트 — DB 연결 준비 완료

- [ ] 규정 원문 ↔ 코드 전수 검증 완료
- [ ] 모든 계산 엔진 DATA 단일 참조
- [ ] `retirement-engine.js` DATA 참조 확인 (R21)
- [ ] 회귀 검증 PASS (R6)
- [ ] `nurse_regulation.json` 야간 배율 분리 완료 (R19)
- [ ] `union_regulation_admin.html` 동작 확인 (R11)
- [ ] 역계산 검증 시스템 동작 확인 (R13-14)
- [ ] 간호사 규정 CALC 통합 완료 (R17-18)
- [ ] 퇴직금 3개월 평균 계산 완료 (R20)
- [ ] Track A/B 진행 가능 상태 확인

---

## ⏭️ 이후 작업 (DB 연결 후)

> 이 섹션은 규정 단일화 완료 후 진행

- [ ] Supabase DB 연결: DATA_STATIC → DB API 응답으로 교체
- [ ] nurse_regulation.json → DB regulation_versions 테이블로 이전
- [ ] 두 시스템(프론트/백) 동일한 DB 출처 연결
- [ ] 운영팀 에이전트 실사용 활성화

---

*상세 내용은 [tasks/plan-regulation-unification.md](plan-regulation-unification.md) 참조*
