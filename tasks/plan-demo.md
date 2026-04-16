# Implementation Plan: Demo Mode (`?demo=1` 쿼리 플래그 방식)

> 상태: **DRAFT — 사용자 결정 대기 중**
> 작성: 2026-04-16
> 트리거: "사람들에게 demo 데이터를 보여주고 간단한 기능을 보여주게 하고자 한다"

---

## Overview

실사용자 데이터·GA·OAuth·AppLock에 영향 없이, 소개·영업·QA·투자자 시연에 쓸 수 있는 **읽기 중심 데모 경험**을 제공한다. 별도 `demo.html`을 만들지 않고 기존 `index.html`에 `?demo=1` 쿼리 플래그를 추가해 **단일 소스** 유지.

## Architecture Decisions

- **단일 파일 유지**: `index.html`을 복사하지 않는다. `?demo=1` 쿼리 감지 → 부팅 시 데모 부트스트랩.
- **네임스페이스 격리**: 데모 모드에서 `window.getUserStorageKey(base)`가 `demo:<base>` prefix 반환. 실사용자 `bhm_hr_profile` / `payslip_*` / `overtimeRecords` / `bhm_leave` 절대 건드리지 않음.
- **외부 서비스 no-op**: Google OAuth 버튼 숨김, SyncManager push 비활성, GA 이벤트 차단, AppLock 강제 off.
- **휘발성 데이터**: 기본은 `localStorage(demo:*)` (리프레시 후에도 유지해 UX 자연스럽게) + 명시적 "데모 초기화" 버튼 제공. 세션 격리가 더 필요하면 옵션 B (sessionStorage) 고려.
- **진입 UI**: 우측 상단 배지 "데모 모드 · 데이터 저장 안 됨" + "실앱으로 이동" + "데모 초기화".

## Dependency Graph

```text
URL param detect (index.html head)
  → window.BHM_DEMO flag 설정
    → getUserStorageKey prefix 분기
    → GA/OAuth/AppLock gate
      → demo-seed.js (PROFILE/OVERTIME/LEAVE/SALARY_PARSER 주입)
        → 기존 initHomeTab/switchTab 흐름 그대로 동작
          → 데모 배지 + 초기화 UI
```

## Task List

### Phase 1: Foundation (격리 기반)

## Task D1: 데모 플래그 감지 + 스토리지 네임스페이스 격리

**Description:** `?demo=1` 쿼리를 감지하여 `window.BHM_DEMO = true`를 설정하고, 모든 `getUserStorageKey` 호출이 `demo:` prefix를 반환하도록 한다.

**Acceptance criteria:**
- [ ] `index.html` `<head>` 인라인 스크립트가 `?demo=1` 감지 시 `window.BHM_DEMO = true` 설정
- [ ] `syncManager.js` (또는 `getUserStorageKey` 정의 위치) 가 `BHM_DEMO === true` 면 `'demo:' + base` 반환
- [ ] 비데모 경로에서 기존 키 동작 변경 없음 (phase0-audit.js 재실행 PASS)
- [ ] `payslip_YYYY_MM` 키는 `storageKey()`가 별도로 만들므로 추가 래퍼 필요 → `demo:payslip_YYYY_MM` 으로 분기

**Verification:**
- [ ] `?demo=1` 붙여 진입 → DevTools `localStorage` 확인 → 신규 키 전부 `demo:` prefix
- [ ] 비데모 진입 → 기존 키 (`bhm_hr_profile`) 그대로 사용
- [ ] 기존 회귀 테스트 `tests/calc-regression.js` + `tests/phase0-audit.js` PASS

**Dependencies:** None

**Files likely touched:**
- `index.html` (head 인라인 스크립트)
- `syncManager.js` (getUserStorageKey 분기 — 또는 정의 위치)
- `salary-parser.js` (storageKey 함수 분기)

**Estimated scope:** Small (1-2 files)

## Task D2: 외부 서비스 no-op (OAuth / GA / AppLock / Sync)

**Description:** 데모 모드에서 Google 로그인, GA 이벤트, AppLock FOUC 가드, SyncManager push를 비활성화한다.

**Acceptance criteria:**
- [ ] `index.html` head AppLock FOUC 가드: `BHM_DEMO` 면 `pinEnabled` 무시
- [ ] `googleAuth.js` init/signIn 호출이 데모 모드에서 early return
- [ ] `syncManager.js` enqueuePush/pushAll이 데모 모드에서 no-op
- [ ] GA `gtag()` 호출이 데모 모드에서 차단 (wrapper 또는 config)
- [ ] 데모 모드에서 Google 로그인 버튼 / AppLock 설정 카드 숨김 (`display:none`)

**Verification:**
- [ ] `?demo=1` 진입 시 DevTools Network에 GA/OAuth 요청 없음
- [ ] AppLock 설정 카드 비노출
- [ ] 프로필 탭 "Google 연결" 버튼 비노출

**Dependencies:** D1

**Files likely touched:**
- `index.html` (head guard + UI 숨김 CSS)
- `googleAuth.js`, `syncManager.js` (gate 추가)
- `app.js` (GA gtag 호출 지점 gate)

**Estimated scope:** Small-Medium (3-4 files)

### Checkpoint 1: 격리 검증

- [ ] `?demo=1` 진입 후 프로필 저장 → DevTools에서 `demo:bhm_hr_profile` 확인
- [ ] 비데모 탭에서 새로고침 → 실사용자 `bhm_hr_profile` 값 영향 없음
- [ ] Network 탭에 외부 요청(GA/OAuth/Drive) 없음

---

### Phase 2: Demo Seed 데이터

## Task D3: 데모 seed 파일 작성 (`demo-seed.js`)

**Description:** 데모 진입 시 일회성으로 주입할 페르소나 데이터 번들을 만든다. 이미 seed가 주입되어 있으면 재주입 skip.

**Acceptance criteria:**
- [ ] `demo-seed.js` 신규 생성, `window.DemoSeed.install()` 함수 노출
- [ ] 기본 페르소나: 간호직 J3, 3년차, 서울대병원 (추후 페르소나 전환 기능은 D6으로 분리)
- [ ] PROFILE: name="박데모", hireDate, adjustPay, numFamily=2 등
- [ ] OVERTIME: 최근 30일 중 8-12건 (야간 3건, 휴일 2건, 주중 평일 5건, oncall 1건)
- [ ] LEAVE: 올해 연차 잔여/사용 예시 3-4건
- [ ] SALARY_PARSER: 최근 3개월 명세서 (grossPay/deduction/netPay 구조) — 실제 파싱 output 스키마 그대로
- [ ] `demo:bhm_demo_installed = '1'` 플래그로 멱등성 보장 (초기화 버튼만 다시 넣음)

**Verification:**
- [ ] `?demo=1` 진입 → 홈 탭에 프로필 + 급여 카드 즉시 표시
- [ ] 시간외 탭 진입 → 10건 내외 기록 카드 표시
- [ ] 급여 탭 → 3개월 명세서 archive + 비교 차트 표시

**Dependencies:** D1

**Files likely touched:**
- `demo-seed.js` (신규)
- `index.html` (`<script src="demo-seed.js">` 로드 + 부팅 시 install 호출)

**Estimated scope:** Medium (데이터 구조 정확히 맞춰야 함)

## Task D4: 데모 배지 + 초기화 버튼 UI

**Description:** 데모 모드임을 상시 알리고 언제든 초기 상태로 돌아갈 수 있게 한다.

**Acceptance criteria:**
- [ ] 우측 상단 고정 배지: "🎬 데모 모드 · 저장 안 됨" (neo 테마 2px border 준수)
- [ ] 클릭 시 메뉴: [데모 초기화] [실앱으로 이동 (`/?app=1`)] [이 화면 공유]
- [ ] 데모 초기화 = `demo:` prefix 모든 키 삭제 + `location.reload()`
- [ ] 모바일에서 배지가 하단 네비 가리지 않음

**Verification:**
- [ ] 배지 표시 확인, 초기화 버튼 동작 확인
- [ ] 배지 숨김이 비데모 모드에서 CSS/DOM 모두 없음

**Dependencies:** D1, D3

**Files likely touched:**
- `index.html` (배지 DOM + 메뉴)
- `app.js` (또는 inline) 메뉴 핸들러

**Estimated scope:** Small

### Checkpoint 2: 데모 UX end-to-end

- [ ] `?demo=1` 첫 진입 → 데모 프로필·시간외·급여 모두 채워진 상태
- [ ] 홈 → 시간외 → 급여 → 프로필 탭 이동 정상
- [ ] "데모 초기화" → 리프레시 → seed 재주입 정상
- [ ] "실앱으로 이동" → `?app=1` 진입 → 실사용자 데이터 그대로

---

### Phase 3: (선택) 페르소나 전환 & 공유

## Task D5: 페르소나 전환 (간호직/보건직/사무직)

**Description:** 데모 배지 메뉴에서 페르소나 전환 시 seed 재주입으로 jobType별 화면 차이 시연.

**Acceptance criteria:**
- [ ] 배지 메뉴에 "페르소나: [간호직 ▼]" 드롭다운
- [ ] 전환 시 `demo:*` 초기화 후 해당 페르소나 seed 주입
- [ ] jobType별 CTA 문구 분기 (app.js C4 로직) 시연 가능

**Verification:**
- [ ] 간호직 → 보건직 전환 시 홈 CTA "온콜 대기·출동 수당 계산하기 →" 표시
- [ ] 급여 탭에서 jobType별 카드 차이 확인

**Dependencies:** D3, D4

**Files likely touched:**
- `demo-seed.js` (페르소나별 번들 3개)
- `index.html` (드롭다운)

**Estimated scope:** Small

## Task D6: 데모 진입 링크 공유 UX

**Description:** onboarding.html 또는 snuhmate.com 홈에서 "먼저 체험해보기" 버튼으로 `?demo=1` 경로 노출.

**Acceptance criteria:**
- [ ] `onboarding.html` 히어로 또는 CTA 옆에 "30초 체험 →" 보조 버튼
- [ ] 클릭 시 `/?demo=1` 로 이동
- [ ] 버튼 GA 이벤트 1개 (`demo_entry_click`) — 실앱 GA로 기록

**Verification:**
- [ ] onboarding.html 수동 확인
- [ ] GA 이벤트 DebugView 확인

**Dependencies:** D1

**Files likely touched:**
- `onboarding.html`

**Estimated scope:** Small

### Checkpoint 3: 완성

- [ ] 페르소나 3종 전환 동작
- [ ] onboarding.html에서 데모 진입 가능
- [ ] 회귀 테스트 전수 PASS (phase0 + calc-regression + phase37 G1)

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| getUserStorageKey 분기가 이미 로그인 로직과 엮여 있어 가이드가 꼬일 수 있음 | High | D1 구현 전 기존 함수 전체 참조 지점 grep → 단일 분기점 확인 |
| salary-parser.js `storageKey()`가 별도 경로라 데모 prefix 누락 위험 | High | D1 acceptance에 `payslip_*` 명시 포함 |
| AppLock FOUC 가드가 body visibility hidden을 걸어두면 데모 진입 시 블랭크 | Medium | D2에서 `BHM_DEMO` 조건 먼저 체크 |
| GA 데모 트래픽 섞임 | Medium | D2에서 gtag wrapper gate. 또는 config.js에 demo GA id 분리 |
| 데모 seed 구조가 실제 SALARY_PARSER output과 달라 UI 깨짐 | Medium | D3 구현 시 실제 업로드 후 DevTools에서 키 구조 복사 |

## Open Questions (구현 시작 전 확정 필요)

1. **데모 범위** — 4개 탭 전부 vs 홈+시간외만? (전부 권장)
2. **페르소나** — 초기 간호직만 (D5 나중)? 아니면 초기부터 3종?
3. **진입 경로** — `?demo=1` 만? 아니면 D6까지?
4. **격리 수준** — localStorage `demo:` prefix (권장) vs sessionStorage (탭 닫으면 사라짐)?
5. **공유 URL** — `snuhmate.com/?demo=1` 그대로? 아니면 `snuhmate.com/demo` 리라이팅?
6. **GA** — 데모 트래픽 완전 차단 vs 별도 GA property?

## Phase 구현 권고 순서

1. **D1 → D2** 먼저 (격리 + no-op) — 회귀 위험 가장 큰 구간, 여기서 실수하면 실사용자 데이터 오염
2. **D3 → D4** (seed + UI) — 시각적 진척
3. **D5, D6**은 선택, 수요 확인 후

## Estimated Effort

- D1: Small — `getUserStorageKey` 분기 1개, salary-parser storageKey 분기 1개
- D2: Small-Medium — 4개 파일 gate 추가
- D3: Medium — 페르소나 데이터 설계가 가장 오래 걸림 (실제 SALARY_PARSER schema 맞추기)
- D4: Small — 배지 + 메뉴
- D5, D6: Small each
