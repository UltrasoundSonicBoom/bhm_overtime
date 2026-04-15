# Implementation Plan: 런칭 UX — 앱 잠금 + 온보딩 퍼널

> Created: 2026-04-14
> Scope:
>   - Track 1 (App Lock): Layer 1 기기 접근 보호 — PIN / 생체인증
>   - Track 2 (Funnel Fix): 개인정보 → 시간외 전환율 개선 (현재 7% → 30% 목표)
> Out of scope: 패턴(줄긋기) 잠금, 서버 사이드 WebAuthn 검증, nurse_admin 별도 PIN

---

## 왜 지금인가

LAUNCH.md G5 (First-run 경험)와 G3 (데이터 손실 방지) 게이트 모두에서
"민감한 의료 급여 데이터를 진지하게 다루는 앱"이라는 신호가 필요하다.
PIN/생체인증(Track 1)은 그 신호를 첫 방문자에게 자연스럽게 전달한다.

**추가 문제 (Track 2):** GA 기준 개인정보 56 views → 시간외 4 views — **전환율 7%**.
`saveProfile()` 성공 후 다음 단계 안내가 없어 사용자가 이탈한다.
UX 문제이며 기능 문제가 아니다. 3곳의 CTA 추가로 해결 가능하다.

---

## UX 설계 원칙

### 이중 로그인 문제 해결

```
[ 첫 설치 흐름 ]
onboarding.html
  → index.html?app=1          (앱 로드, 잠금 없음, Google 버튼 보임)
  → Google 연결 클릭           (OAuth 1번만 발생)
  → 성공 토스트 + 넛지 바텀시트  (PIN 설정 제안, 스킵 가능)
    ├─ "설정할게요" → PIN 입력 (fullscreen, 즉시)
    └─ "나중에"    → 앱 바로 사용 (다시 안 물어봄 if dismissed)

[ 일상 사용 흐름 (PIN 설정된 경우) ]
앱 열기
  → <head> 인라인 스크립트: pinEnabled? → body visibility:hidden
  → shared-layout.js: 잠금 오버레이 렌더
  → 생체인증 팝업 (설정된 경우) → 통과 → 앱 사용
  → 또는 PIN 입력 → 통과 → 앱 사용
  → Google 로그인: 이미 bhm_settings에 저장 → 묻지 않음
```

**핵심 인사이트:** Google 로그인과 PIN 설정은 동일 세션에서 자연스럽게 이어지되,
Google = 데이터 신원(1회), PIN = 기기 접근 보호(매 방문). 두 개는 목적이 달라서
"2번 로그인"이 아니라 "연결 + 보호"의 단계다. 넛지 바텀시트가 이를 명확히 표현한다.

### 패턴(줄긋기) 잠금 제외 이유

| 방식 | 보안 | 구현 비용 | 모바일 UX |
|------|------|-----------|-----------|
| PIN (4-6자리) | 중 | 낮음 (1일) | 익숙함 |
| 패턴 | 낮음 (어깨 너머 취약) | 높음 (canvas custom, 3일) | 피로감 |
| 생체인증 (WebAuthn) | 높음 | 중간 (1일) | 최상 |

패턴은 PIN보다 보안이 낮고 구현 비용이 3배다. 생체인증을 Phase 3에서 지원하면
PIN + 생체인증으로 충분하다. 패턴은 다음 이터레이션으로 보류.

---

## 아키텍처 결정

1. **appLock.js 단일 신규 파일** — PIN/WebAuthn 로직 완전 캡슐화
2. **전체 앱 잠금, 특정 탭 잠금 아님** — UX 직관성, shared-layout.js 훅으로 처리
3. **PIN hash는 localStorage (bhm_settings)** — 위협 모델: "동료가 잠깐 봄" (DevTools 공격 아님)
4. **WebAuthn client-only 검증** — 서버 없이 가능 (로컬 UI 보호 목적)
5. **생체인증은 PIN 이후에만 허용** — 폴백 없는 단독 생체인증 차단
6. **PIN hash는 Drive sync에 포함** — 새 기기에서도 PIN 설정 유지

---

## 의존성 그래프

```
bhm_settings (localStorage 기존)
  └── appLock.js (신규)
        ├── PinLock: setup/verify/change/disable/lockout
        └── BiometricLock: register/authenticate (WebAuthn)

shared-layout.js (기존)
  └── AppLock.checkAndPrompt() 훅 추가

index.html <head> (기존)
  └── FOUC 방지 인라인 스크립트 추가

index.html profile 탭 (기존)
  └── 앱 잠금 설정 카드 추가

index.html updateAuthUI (기존)
  └── 넛지 바텀시트 (Google 로그인 성공 후)

syncManager.js DATA_MAP (기존)
  └── bhm_settings 싱크 추가 (pinEnabled/pinHash/pinSalt)
```

**구현 순서:** 하단 의존성부터. appLock.js → FOUC guard → overlay → settings UI → nudge → sync

---

## Task List

### Phase 1: 핵심 잠금 모듈

---

## Task L1: appLock.js — PIN 잠금 핵심

**Description:**
`appLock.js` 신규 파일을 생성한다. PIN 설정/검증/잠금 해제/잠금아웃 로직을 포함한다.
WebCrypto API로 SHA-256 해시. 실패 5회→5분 지연. 모든 상태는 `bhm_settings`에 저장.
`window.AppLock` 전역 객체로 노출.

**Acceptance criteria:**
- [x] `AppLock.setupPin(pin)` → SHA-256(pin+salt) 저장, `pinEnabled:true`
- [x] `AppLock.verifyPin(pin)` → 일치 시 `true`, 불일치 시 failCount++, 5회→lockUntil 설정
- [x] `AppLock.isLocked()` → `pinEnabled && !_appUnlocked`
- [x] `AppLock.unlock()` → `_appUnlocked = true` (in-memory, 탭/세션 내 지속)
- [x] `AppLock.disablePin()` → `pinEnabled:false`, hash/salt 삭제
- [x] 5회 실패 후 `lockUntil` 이전 입력 시 남은 시간 반환
- [x] lockUntil이 localStorage에 저장되어 새로고침 후도 유지

**Verification:**
- [ ] 브라우저 콘솔: `AppLock.setupPin('1234'); AppLock.verifyPin('1234')` → `true`
- [ ] `AppLock.verifyPin('0000')` 5회 → 이후 입력 차단 확인 (콘솔)
- [ ] localStorage 'bhm_settings' 에 `pinEnabled:true`, `pinHash`, `pinSalt` 확인
- [ ] 새로고침 후 `AppLock.isLocked()` → `true` 확인

**Dependencies:** None

**Files likely touched:**
- `appLock.js` (신규 파일)

**Estimated scope:** M (1 신규 파일, ~200줄)

---

## Task L2: FOUC 방지 인라인 스크립트 + 잠금 오버레이 렌더

**Description:**
`index.html`의 `<head>` 최상단에 5줄 인라인 스크립트를 삽입해
`pinEnabled` 확인 후 `document.documentElement.style.visibility='hidden'`으로 즉시 차단.
`shared-layout.js`에 `AppLock.checkAndPrompt()` 훅을 추가해 오버레이를 렌더링.
오버레이 스타일은 `style.css`에 추가 (`.app-lock-overlay`).

PIN 입력 UI: 숫자 6개 도트 표시기 + 1-9/0 키패드 + 빠른 지우기. 모바일 최적화.

**Acceptance criteria:**
- [x] `pinEnabled:true` 상태로 index.html 로드 시 앱 콘텐츠가 보이지 않고 잠금 오버레이만 표시
- [x] FOUC 없음: 앱 콘텐츠가 0.1초라도 보인 뒤 덮이는 현상 없음
- [x] PIN 입력 후 올바르면 오버레이 사라지고 앱 사용 가능
- [x] 키패드 숫자 탭/클릭 모두 동작 (터치 + 마우스)
- [x] `pinEnabled:false` 상태에서는 오버레이 렌더 없음 (앱 즉시 로드)

**Verification:**
- [ ] 브라우저에서 PIN 설정 후 새로고침 → 오버레이 확인
- [ ] DevTools Network 탭에서 index.html 로드 시 Content flash 없음
- [ ] 모바일 Chrome/Safari 터치 입력 동작 확인

**Dependencies:** L1 (AppLock.isLocked() 필요)

**Files likely touched:**
- `index.html` (`<head>` 인라인 스크립트, `<script src="appLock.js">` 추가)
- `shared-layout.js` (checkAndPrompt 훅, ~30줄)
- `style.css` (`.app-lock-overlay` 스타일, ~60줄)

**Estimated scope:** M (3 파일)

---

### Checkpoint 1: Phase 1 기본 잠금 흐름

- [x] `AppLock.setupPin('1234')` 후 페이지 새로고침 → 잠금 오버레이 표시 (Playwright 검증)
- [x] '1234' 입력 → 앱 정상 사용 (Playwright 검증)
- [x] FOUC 없음 육안 확인 (Playwright 스크린샷)
- [x] 잠금 없는 상태에서 앱 로드 지연 없음 (코드 검증)

---

### Phase 2: 설정 UI + PIN 재설정

---

## Task L3: 프로필 탭 "앱 잠금" 설정 카드

**Description:**
`index.html`의 프로필 탭 끝에 "앱 잠금" 카드를 추가한다.
PIN 미설정 상태: "PIN 설정하기" 버튼만 표시.
PIN 설정 상태: 현재 상태 뱃지("켜짐") + "PIN 변경" + "잠금 해제" 버튼.
생체인증 지원 기기이고 PIN이 설정된 경우: "생체인증 추가" 버튼 표시.
PIN 설정 시 4-6자리 입력 모달(숫자 키패드) → 확인 재입력 → 저장.

**Acceptance criteria:**
- [x] 프로필 탭에 "🔒 앱 잠금" 카드가 렌더됨
- [x] PIN 미설정 → "PIN 설정하기" 버튼만 표시
- [x] PIN 설정 → "켜짐" 뱃지 + 변경/해제 버튼 표시
- [x] PIN 설정 모달: 4-6자리 입력 → 확인 재입력 불일치 시 에러 표시
- [x] PIN 해제 시 confirm 다이얼로그 → 확인 후 `AppLock.disablePin()`
- [x] `navigator.credentials` 미지원 기기에서 생체인증 버튼 미표시 (graceful degrade)

**Verification:**
- [ ] 프로필 탭에서 PIN 설정 → 저장 → 새로고침 → 잠금 오버레이 확인
- [ ] 설정 카드에 "켜짐" 상태 표시 확인
- [ ] PIN 해제 후 새로고침 → 잠금 없음 확인

**Dependencies:** L1, L2

**Files likely touched:**
- `index.html` (프로필 탭 잠금 카드 HTML + JS 핸들러, ~80줄)

**Estimated scope:** S (1 파일)

---

## Task L4: PIN 분실 → Google 재인증 재설정 경로

**Description:**
잠금 오버레이에 "PIN을 잊으셨나요?" 링크를 추가한다.
클릭 시 "Google 계정으로 신원 확인 후 PIN을 재설정합니다" 안내 → `GoogleAuth.signIn()` 호출.
OAuth 성공 콜백에서 `AppLock.resetViaReauth()` 호출 → 기존 PIN 삭제 → 새 PIN 설정 모달.
Guest 모드(googleSub 없음)에서는 링크 미표시 (데이터 초기화만 가능, 별도 안내 문구).

**Acceptance criteria:**
- [x] 잠금 오버레이에 "PIN을 잊으셨나요?" 링크 표시 (Google 로그인된 경우)
- [x] 링크 클릭 → 안내 모달 → Google OAuth 팝업
- [x] OAuth 성공 → 기존 PIN 삭제 + 새 PIN 설정 모달 표시
- [x] Guest 모드에서는 링크 대신 "로컬 데이터만 삭제 가능합니다" 안내
- [x] OAuth 취소 → 기존 잠금 화면으로 복귀 (데이터 변경 없음)

**Verification:**
- [ ] PIN 설정 후 새로고침 → "PIN을 잊으셨나요?" 클릭 → Google 팝업 → 성공 → PIN 재설정 확인
- [ ] OAuth 취소 시 기존 화면 복귀 확인

**Dependencies:** L1, L2, L3

**Files likely touched:**
- `appLock.js` (`resetViaReauth()` 추가, ~20줄)
- `index.html` (잠금 오버레이 링크 + OAuth 콜백 연결, ~15줄)

**Estimated scope:** S (2 파일)

---

### Checkpoint 2: End-to-end PIN 플로우

- [x] PIN 설정 → 잠금 → 해제 → 정상 사용 전체 흐름 확인 (Playwright 검증)
- [x] PIN 변경 → 새 PIN으로만 해제됨 확인 (코드 검증)
- [x] PIN 해제 → 잠금 없이 앱 로드 확인 (Playwright 검증)
- [ ] PIN 분실 → Google 재인증 → 재설정 확인 (실기기 수동 필요)
- [x] 5회 실패 → 5분 지연 → 카운트다운 표시 확인 (Playwright 검증)
- [x] Google 로그인 없는 상태에서 앱 동작 정상 (PIN 기능과 독립) (코드 검증)

---

### Phase 3: 생체인증 + 넛지 + Drive 연동

---

## Task L5: 생체인증 (WebAuthn) 등록/인증 UI

**Description:**
`appLock.js`에 `BiometricLock.register()` / `BiometricLock.authenticate()` 추가.
프로필 탭 잠금 카드의 "생체인증 추가" 버튼 활성화.
잠금 오버레이: PIN 입력 위에 "Face ID / 지문으로 열기" 버튼 표시 (생체 등록된 경우).
생체인증 실패/취소 → PIN 입력 화면으로 전환.
생체인증 제거 버튼 추가 (설정 카드).

iOS Safari 16+, Android Chrome 67+ 지원. 미지원 브라우저에서 조용히 fallback.

**Acceptance criteria:**
- [x] PIN 설정 후 "생체인증 추가" 버튼 표시
- [x] 버튼 클릭 → `navigator.credentials.create()` 팝업 → 성공 시 `biometricEnabled:true`
- [x] 잠금 오버레이에 생체인증 버튼 표시 (등록된 경우)
- [x] 생체인증 성공 → 앱 잠금 해제
- [x] 생체인증 취소/실패 → PIN 키패드로 자동 전환
- [x] "생체인증 제거" → `biometricEnabled:false`, credId 삭제

**Verification:**
- [ ] iOS Safari 또는 Android Chrome에서 생체인증 등록 → 재방문 시 Face ID/지문 팝업 확인
- [ ] 취소 시 PIN 화면 전환 확인
- [ ] WebAuthn 미지원 브라우저에서 에러 없이 PIN만 표시 확인

**Dependencies:** L1, L2, L3

**Files likely touched:**
- `appLock.js` (BiometricLock 추가, ~80줄)
- `index.html` (생체인증 버튼 + 오버레이 버튼, ~20줄)

**Estimated scope:** M (2 파일)

---

## Task L6: Google 로그인 직후 PIN 설정 넛지

**Description:**
`index.html`의 `handleTokenResponse` 성공 콜백(구글 로그인 완료 시점) 이후
`bhm_settings.pinNudgeDismissed`가 `false`이고 `pinEnabled`도 `false`인 경우
바텀시트 모달을 표시: "🔒 앱을 잠가서 내 정보를 보호하세요"
"설정할게요" → 즉시 PIN 설정 모달, "나중에" → `pinNudgeDismissed:true` 저장.
한 번 거부하면 다시 표시되지 않음.

**Acceptance criteria:**
- [x] Google 로그인 성공 후 바텀시트가 표시됨 (PIN 미설정, 넛지 미거부인 경우)
- [x] "설정할게요" → PIN 입력 모달 즉시 표시
- [x] "나중에" → `pinNudgeDismissed:true` 저장 → 이후 로그인에서 미표시
- [x] PIN 이미 설정된 경우 넛지 표시 안 함
- [x] 모달 디자인: 기존 `.onboarding-modal` 스타일과 일관성

**Verification:**
- [ ] 새 브라우저(혹은 localStorage 초기화) → Google 로그인 → 넛지 바텀시트 확인
- [ ] "나중에" → 재로그인 시 미표시 확인
- [ ] "설정할게요" → PIN 입력 → 저장 → 넛지 더 이상 표시 안 됨 확인

**Dependencies:** L1, L3

**Files likely touched:**
- `index.html` (넛지 바텀시트 HTML + JS, ~40줄)

**Estimated scope:** S (1 파일)

---

## Task L7: PIN 설정을 Drive에 백업

**Description:**
`syncManager.js`의 `DATA_MAP`에 `bhm_settings` 싱크를 추가하거나
별도 `settings.json` Drive 파일로 `pinEnabled / pinHash / pinSalt`를 포함한다.
`biometricCredId`는 기기 귀속이므로 제외.
syncManager의 풀싱크 대상에 포함시켜 Google Drive 백업 시 자동 반영.

**Acceptance criteria:**
- [x] PIN 설정 후 Drive fullSync() 실행 시 `settings.json` 파일에 `pinEnabled/pinHash/pinSalt` 포함
- [x] 다른 기기에서 Drive 복원 시 PIN 설정이 살아있음
- [x] `biometricCredId`는 Drive에 저장되지 않음
- [x] syncManager.js 기존 fullSync 동작 회귀 없음

**Verification:**
- [ ] PIN 설정 후 SyncManager.fullSync() 호출 → Drive 앱폴더 내 `settings.json` 내용 확인
- [ ] 다른 브라우저(시크릿 탭) → 같은 Google 계정 로그인 → 복원 후 PIN 잠금 동작 확인

**Dependencies:** L1

**Files likely touched:**
- `syncManager.js` (DATA_MAP 또는 settings sync 추가, ~15줄)

**Estimated scope:** XS (1 파일, 소폭 수정)

---

### Checkpoint 3: 전체 기능 완성

- [ ] 전체 플로우: 첫 설치 → Google 로그인 → 넛지 → PIN 설정 → 잠금 → 해제
- [ ] 생체인증 등록 → 재방문 시 자동 팝업 → 통과
- [ ] PIN 분실 → Google 재인증 → 재설정
- [ ] 다른 기기에서 Drive 복원 → PIN 설정 유지
- [ ] PIN 없이 Google 로그인한 경우 앱 정상 동작 (앱 잠금 optional 확인)
- [ ] regulation.html, cardnews.html 등 타 페이지에서도 잠금 동작 (shared-layout.js 훅)

---

## Track 2: 온보딩 퍼널 전환율 개선

> Source: `/office-hours` 세션 (2026-04-14), Status: APPROVED
> 목표: 개인정보 → 시간외 전환율 7% → 30% (GA 30일 비교)

### 배경 데이터

| 지표 | 수치 |
|------|------|
| 홈 views / 30일 | 424 |
| 개인정보 탭 views | 56 |
| 시간외 탭 views | **4** (전환율 **7%**) |
| Direct 세션 | 159 (마케팅 없이 지인 소개) |

**진단:** `saveProfile()` 성공 후 다음 단계 안내 없음. UX 문제, 기능 문제 아님.

### 직종별 CTA 문구 분기 (saveProfile 성공 시)

| 직종 | 추천 문구 |
|------|----------|
| 간호직 | "이번 달 야간·리커버리데이 확인하기 →" |
| 보건직 | "온콜 대기·출동 수당 계산하기 →" |
| 사무직 | "연차 현황 확인하기 →" |
| 그 외 | "시간외 수당 계산하러 가기 →" |

### 사전 조건 (구현 전)

> **관찰 세션 1회 필수:** 실제 사용자 1명을 옆에 앉히고 아무 도움 없이
> 첫 진입 → 시간외 계산까지 지켜본다. 막히는 지점 1곳 확인 후 아래 3가지
> 중 어디를 먼저 구현할지 결정한다. 관찰 없이 코드부터 건드리지 말 것.

---

## Task F1: saveProfile() 성공 직후 CTA 표시

**Description:**
`saveProfile()` 함수 끝부분에 `profileSavedCTA` div를 보이게 하는 1줄을 추가한다.
CTA 문구는 저장 시점의 `jobType`으로 분기한다 (간호직/보건직/사무직/기타).
`switchTab()` 호출 시 CTA를 자동으로 숨긴다.

**Acceptance criteria:**
- [x] 개인정보 저장 후 CTA 카드 표시: "⏰ [직종별 문구] →" 버튼
- [x] 버튼 클릭 시 해당 탭으로 이동하고 CTA가 사라짐
- [x] 탭 이동 시 (`switchTab()`) CTA 자동 숨김
- [x] 직종별 4가지 문구 정확히 분기됨
- [x] 재저장 시에도 매번 CTA 표시 (중복 저장 케이스 포함)

**Verification:**
- [ ] 개인정보 입력 → 저장 → CTA 카드 표시 확인
- [ ] 직종 "간호직" 선택 후 저장 → "야간·리커버리데이" 문구 표시 확인
- [ ] CTA 버튼 클릭 → 해당 탭 이동 + CTA 사라짐 확인

**Dependencies:** None

**Files likely touched:**
- `index.html` (line ~1574 저장버튼 아래 `profileSavedCTA` div 추가, ~15줄)
- `app.js` (saveProfile() 끝 CTA 표시 로직 + switchTab() CTA 숨김, ~10줄)

**Estimated scope:** S (2 파일, ~25줄)

---

## Task F2: 시간외 탭 "시급 0원" 경고 강화

**Description:**
`index.html` line 1107의 단순 텍스트 경고를 시각적 배너 + CTA 버튼으로 교체한다.
기존: `<span>시급이 0원이에요. <a>개인정보 탭</a>...`
변경: 노란 배너 카드 + "👤 개인정보 입력하기 →" 버튼.

**Acceptance criteria:**
- [x] 시간외 탭 진입 시 프로필 미저장이면 노란 배너 표시
- [x] 배너 내 버튼 클릭 → 개인정보 탭으로 이동
- [x] 프로필 저장 후 시간외 탭 재방문 시 배너 미표시 (시급 > 0)
- [x] 기존 `hourlyRate` 계산 로직 회귀 없음

**Verification:**
- [ ] 프로필 미저장 → 시간외 탭 진입 → 노란 배너 + 버튼 표시 확인
- [ ] 버튼 클릭 → 개인정보 탭 이동 확인
- [ ] 프로필 저장 후 시간외 탭 → 배너 없고 시급 정상 표시 확인

**Dependencies:** None (독립)

**Files likely touched:**
- `index.html` (line 1107, HTML 20줄 교체)

**Estimated scope:** XS (1 파일, ~20줄 교체)

---

## Task F3: 홈 화면 프로필 미완성 힌트

**Description:**
홈 탭 카드 영역 상단에 `homeProfileNudge` div 추가.
조건: `PROFILE.load()` 결과의 `jobType`이 없으면(미저장) 힌트 표시.
"아직 개인정보가 없어요 — 직종·호봉을 입력하면 시간외 수당이 자동 계산됩니다."
`saveProfile()` 완료 후 힌트 자동 숨김.

**Acceptance criteria:**
- [x] 홈 탭 초기 진입 시 프로필 미저장이면 힌트 배너 표시
- [x] 힌트 내 "지금 입력 →" 버튼 클릭 → 개인정보 탭 이동
- [x] 프로필 저장 완료 후 힌트 사라짐 (페이지 리로드 없이)
- [x] 프로필 저장된 상태에서 홈 탭 진입 시 힌트 미표시

**Verification:**
- [ ] localStorage 초기화 → 홈 탭 → 힌트 배너 표시 확인
- [ ] 개인정보 저장 → 홈 탭 재방문 → 힌트 없음 확인
- [ ] PROFILE.load() 기존 동작 회귀 없음

**Dependencies:** None (독립)

**Files likely touched:**
- `index.html` (홈 탭 힌트 div 추가, ~12줄)
- `app.js` (DOMContentLoaded 힌트 표시 로직 + saveProfile() 숨김, ~8줄)

**Estimated scope:** XS (2 파일, ~20줄)

---

### Checkpoint 4: 퍼널 개선 완성

- [x] F1: 저장 직후 CTA 카드 표시 + 직종별 문구 분기 확인 (코드 검증)
- [x] F2: 시간외 탭 노란 배너 + 버튼 확인 (코드 검증)
- [x] F3: 홈 탭 힌트 배너 표시/숨김 확인 (코드 검증)
- [x] 기존 계산 기능 회귀 없음 (saveProfile, switchTab, hourlyRate) (tests PASS)
- [ ] 30일 후 GA에서 시간외 views 및 전환율 측정 (배포 후)

**Open Questions (구현 전 관찰 세션에서 확인):**
1. 개인정보 필드 중 어디서 이탈하나? 사번? 호봉 선택?
2. PDF 자동 채움 실패 케이스 — 이게 장벽이면 변경 범위 확대 필요
3. `jobType` 말고 미저장 판단 기준으로 더 reliable한 필드가 있는지

---

## 위험 및 대응

| 위험 | 영향 | 대응 |
|------|------|------|
| FOUC (잠금 전 콘텐츠 노출) | 보안 신뢰 훼손 | `<head>` 인라인 스크립트로 즉시 차단 |
| WebAuthn rpId 불일치 | 생체인증 등록 실패 | `window.location.hostname` 동적 사용 |
| 5회 실패 카운터 새로고침 우회 | 잠금 우회 가능 | failCount/lockUntil을 localStorage 저장 |
| Drive 복원 시 새 기기 생체 CredId 불일치 | 생체인증 안 됨 | CredId를 sync 제외, PIN만 복원 → 재등록 안내 |
| Google 로그인 팝업 + 넛지가 연속 표시 | UX 혼란 | 토스트 사라진 후 300ms 딜레이로 넛지 표시 |
| 오래된 iOS Safari (WebAuthn 미지원) | 생체인증 불가 | graceful degrade → PIN만 표시 |

---

## 미포함 항목 (명시적 보류)

- **패턴(줄긋기) 잠금** — canvas 커스텀, 보안 낮음, 다음 이터레이션
- **nurse_admin 별도 PIN** — allowlist 기반 접근이 더 적합
- **급여 탭만 선택적 잠금** — 전체 잠금이 더 직관적
- **서버 사이드 WebAuthn 검증** — 로컬 UI 보호 목적에 불필요

---

## 예상 파일 변경 요약

### Track 1 (App Lock)

| 파일 | 변경 유형 | 줄 수 |
|------|----------|-------|
| `appLock.js` | 신규 | ~300줄 |
| `index.html` | 수정 (FOUC guard + 오버레이 + 설정 카드 + 넛지) | +~200줄 |
| `shared-layout.js` | 수정 (lock hook) | +~30줄 |
| `style.css` | 수정 (overlay 스타일) | +~60줄 |
| `syncManager.js` | 수정 (settings sync) | +~15줄 |

### Track 2 (Funnel Fix)

| 파일 | 변경 유형 | 줄 수 |
|------|----------|-------|
| `index.html` | 수정 (CTA 카드 + 배너 + 힌트 HTML) | +~47줄 |
| `app.js` | 수정 (CTA 표시/숨김 로직) | +~18줄 |

**전체 합계:** ~670줄, 파일 6개 (신규 1 + 수정 5)
