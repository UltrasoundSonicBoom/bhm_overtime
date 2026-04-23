# Plan B: index.html 탭 HTML 분할

> **상태:** 초안 (작성일 2026-04-23). 실행 승인 대기.
> **선행 조건:** Plan C Phase 1 완료 권장 (코드 기반 정리 후 탭 분할이 더 안전).
> **가장 큰 블래스트 — 회귀 위험 높음.**

**Goal:** `index.html`의 8개 탭 콘텐츠(현재 body 내 1,895줄)를 탭별 외부 HTML 파일로 분할해 런타임 lazy-load. 결과적으로 index.html을 약 300~500줄의 **shell**로 축소.

**Architecture:**
- `index.html`은 `<header>`, `<footer>`, `<main>` 껍데기 + 각 탭의 **빈 placeholder** (`<div class="tab-content" id="tab-X"></div>`)만 유지.
- 새 디렉토리 `tabs/`에 `tab-home.html`, `tab-payroll.html` 등 **HTML fragment** (wrapper `<div>` 없음, 내부 markup만).
- `switchTab(name)`이 최초 호출 시 `fetch('tabs/tab-' + name + '.html')` → placeholder에 HTML 주입 + 기존 init 함수 호출.
- 로드 캐시: 한 번 로드한 탭은 재사용. 메모리 캐시만 (localStorage 미사용).

**Tech Stack:** 기존. 번들러 없음. Fetch API (현대 브라우저 전부 지원).

**Branch:** `refactor/index-tab-split`

---

## 🔒 보안: 신뢰된 HTML 주입 원칙

이 플랜은 `placeholder.innerHTML = fetchedHtml` 패턴을 사용합니다. **평소에는 XSS 위험으로 경계 대상이지만, 여기서는 안전**합니다. 이유:

| 조건 | 현재 플랜 | XSS 위험 여부 |
|------|----------|---------------|
| HTML 출처 | same-origin `tabs/*.html` — 개발자가 직접 작성, 저장소 버전관리 | 안전 |
| URL 변조 가능성 | `loadTab(name)`의 name은 `switchTab` 내부 상수 리터럴 (`'home'`, `'payroll'` 등)만 호출 | 안전 (단, 검증 필요) |
| 사용자 입력 반영 | fragment 내부에 사용자 데이터를 보간하지 않음 | 안전 |

**강제 가드 (Task 1에서 반드시 적용):**

1. `loadTab(name)`의 `name` 인자는 **whitelist** 검증:
   ```javascript
   var ALLOWED = ['home', 'payroll', 'overtime', 'leave', 'reference', 'profile', 'settings', 'feedback'];
   if (ALLOWED.indexOf(name) === -1) throw new Error('invalid tab name');
   ```
2. CSP `default-src 'self'` 가 fragment URL을 same-origin으로 제한 (index.html:15-27 기존 설정).
3. 프래그먼트 안에 서버에서 받아 삽입하는 사용자 데이터 없음 — 모두 정적 개발자 작성 markup.
4. 향후 **어떤 사용자 입력도 `tabs/*.html` 파일에 포함 금지**. 사용자 값은 기존대로 각 init 함수가 `textContent`/`escapeHtml` 경로로 주입.

**Plan C의 `escapeHtml` 통합 완료 후** 이 플랜을 시작해야 합니다 — 사용자 값 렌더 경로의 일관성이 전제 조건.

---

## 리스크 평가 (중요)

1. **파일:// 프로토콜 테스트 불가** — `fetch()`는 `file:///` 에서 CORS 차단. 개발자는 `python3 -m http.server` 같은 로컬 서버 필요. 프로덕션(snuhmate.com)은 HTTP 서빙 → 정상.
2. **최초 탭 전환 지연** — fetch + parse + 주입이 사용자에게 "느림"으로 체감될 수 있음 (로컬 네트워크 50~200ms).
3. **탭 내 inline `onclick=` 핸들러** — 외부 HTML의 `onclick="functionName()"`는 global scope에 함수가 이미 있어야 동작. 로드 순서 의존성.
4. **초기 렌더 flicker** — placeholder 빈 상태에서 콘텐츠 주입까지 시간 차. 스켈레톤 UI 권장.
5. **CSP 영향** — `default-src 'self'` 이미 허용 상태. 추가 수정 불필요.

**결론:** 단계별 실행 + 각 단계 후 수동 QA.

---

## 실행 전 결정 필요 (Decision Points)

### D1: 로딩 전략

| 전략 | 장점 | 단점 |
|------|------|------|
| 즉시 lazy (모두 외부) | index.html 최대 감량 | 최초 탭 전환 체감 지연 |
| **홈만 inline + 나머지 lazy** | 첫 화면 빠름, 점진 로드 | 균일성 약함 |
| 모두 inline + idle prefetch | UX 지연 없음 | **감량 효과 없음** — 플랜 목적 달성 실패 |

**권장: 홈만 inline + 나머지 lazy + DOMContentLoaded 후 ~500ms에 idle prefetch.**

### D2: Fragment 저장 방식

| 방식 | 비고 |
|------|------|
| **`tabs/tab-*.html` (순수 fragment)** | 권장. wrapper 없이 내부 markup만. 에디터 HTML 하이라이트. |
| `tabs/tab-*.js` (문자열 export) | file:// 테스트 가능하나 800+줄 HTML 문자열은 가독성 낮음 |

**권장: 순수 HTML fragment.**

### D3: Plan 분할

| 접근 | 비고 |
|------|------|
| 한 번에 8개 탭 | 블래스트 과대 — 비권장 |
| **Phase 4단계** | pilot → 소형 → profile → payroll |

**권장: 4단계.**

---

## 파일 구조

### 생성
- `tabs/` 디렉토리
- `tabs/tab-home.html` (113줄, Phase 2에서 이관 — **또는** D1 채택 시 inline 유지)
- `tabs/tab-payroll.html` (829줄, Phase 4)
- `tabs/tab-overtime.html` (206줄, Phase 2)
- `tabs/tab-leave.html` (148줄, Phase 2)
- `tabs/tab-reference.html` (17줄, Phase 1 pilot)
- `tabs/tab-profile.html` (428줄, Phase 3)
- `tabs/tab-settings.html` (125줄, Phase 2)
- `tabs/tab-feedback.html` (29줄, Phase 2)
- `tab-loader.js` — `loadTab()`, `prefetchTabs()` 헬퍼 + whitelist 가드

### 수정
- `index.html` — 탭 콘텐츠 제거, 빈 `<div>` placeholder 유지, `tab-loader.js` 로드 태그 추가
- `app.js:346` — `switchTab` 함수에 `loadTab()` 통합 (async/Promise 처리)

---

## Phase 1: 인프라 + Pilot 탭 (reference)

**목표:** `loadTab()` 헬퍼 구축 + 가장 작은 탭(reference, 17줄)로 패턴 검증.

### Task 1: `tab-loader.js` 생성

**Files:** `tab-loader.js` (신규)

- [ ] **Step 1: 파일 생성 — whitelist 가드 포함**

```javascript
// tab-loader.js — 탭 HTML fragment lazy loader
// 보안: ALLOWED_TABS whitelist로 name 검증. fragment는 same-origin 정적 파일만.
(function () {
  'use strict';

  var ALLOWED_TABS = [
    'home', 'payroll', 'overtime', 'leave',
    'reference', 'profile', 'settings', 'feedback'
  ];

  var cache = Object.create(null);
  var inflight = Object.create(null);

  function loadTab(name) {
    if (ALLOWED_TABS.indexOf(name) === -1) {
      return Promise.reject(new Error('invalid tab name: ' + name));
    }
    if (cache[name]) return Promise.resolve(true);
    if (inflight[name]) return inflight[name];

    var placeholder = document.getElementById('tab-' + name);
    if (!placeholder) return Promise.reject(new Error('placeholder not found: tab-' + name));
    if (placeholder.dataset.loaded === '1') {
      cache[name] = true;
      return Promise.resolve(true);
    }

    var url = 'tabs/tab-' + name + '.html?v=1.0';
    inflight[name] = fetch(url, { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('fetch failed: ' + url + ' (' + r.status + ')');
        return r.text();
      })
      .then(function (html) {
        // 주입 직전 ALLOWED 재확인 — defense in depth.
        if (ALLOWED_TABS.indexOf(name) === -1) throw new Error('guard failed');
        placeholder.innerHTML = html;
        placeholder.dataset.loaded = '1';
        cache[name] = true;
        delete inflight[name];
        return true;
      })
      .catch(function (err) {
        delete inflight[name];
        console.error('[tab-loader]', err);
        placeholder.textContent = '탭을 불러오지 못했습니다. 새로고침을 시도해주세요.';
        throw err;
      });
    return inflight[name];
  }

  function prefetchTabs(names) {
    var valid = names.filter(function (n) { return ALLOWED_TABS.indexOf(n) !== -1; });
    if (typeof window.requestIdleCallback === 'function') {
      requestIdleCallback(function () { valid.forEach(loadTab); }, { timeout: 3000 });
    } else {
      setTimeout(function () { valid.forEach(loadTab); }, 1500);
    }
  }

  window.loadTab = loadTab;
  window.prefetchTabs = prefetchTabs;
})();
```

- [ ] **Step 2: `index.html`에 로드 태그 추가**

`<script src="shared-layout.js?v=1.6" defer></script>` 바로 뒤에 삽입:
```html
<script src="tab-loader.js?v=1.0" defer></script>
```

- [ ] **Step 3: 커밋**

```bash
git add tab-loader.js index.html
git commit -m "feat(tab-loader): lazy-load 인프라 (whitelist 가드 + idle prefetch)"
```

### Task 2: Pilot — reference 탭 외부화

**Files:**
- Create: `tabs/tab-reference.html`
- Modify: `index.html` (tab-reference 콘텐츠 → placeholder)
- Modify: `app.js:346` `switchTab` — reference 케이스 async

- [ ] **Step 1: `tabs/tab-reference.html` 생성**

```bash
mkdir -p tabs
```

index.html에서 `<div class="tab-content" id="tab-reference">...</div>` 내부 markup (17줄)을 잘라 `tabs/tab-reference.html`에 저장. wrapper 없이 내부 콘텐츠만.

- [ ] **Step 2: index.html placeholder로 축소**

index.html의 tab-reference 블록을 다음으로 교체:
```html
<div class="tab-content" id="tab-reference"></div>
```

- [ ] **Step 3: `app.js:switchTab`에서 reference 케이스 async 처리**

기존:
```javascript
if (tabName === 'reference') renderWikiToc();
```

교체:
```javascript
if (tabName === 'reference') {
  loadTab('reference').then(function () { renderWikiToc(); });
}
```

- [ ] **Step 4: 로컬 서버로 테스트**

```bash
python3 -m http.server 8080
# http://localhost:8080/ 열고 reference 탭 클릭
```

확인:
- 최초 클릭 시 DevTools Network에 `tabs/tab-reference.html` 요청
- 재클릭 시 fetch 재요청 없음
- `renderWikiToc`가 DOM 주입 **후** 실행되는지

- [ ] **Step 5: 커밋**

```bash
git add tabs/tab-reference.html index.html app.js
git commit -m "refactor(tabs): reference 탭 외부 fragment로 분리 (pilot)"
```

---

## Phase 2: 작은 탭 5개 외부화

Pattern은 Task 2 동일. 반복:

- [ ] **Task 3**: `tab-home` (113줄) — switchTab 케이스: `initHomeTab` / **D1 권장에 따라 건너뛸 수도 있음** (홈 inline 유지)
- [ ] **Task 4**: `tab-settings` (125줄) — switchTab 케이스: `updateAppLockUI`
- [ ] **Task 5**: `tab-feedback` (29줄) — switchTab 케이스 없음
- [ ] **Task 6**: `tab-leave` (148줄) — switchTab 케이스: `applyProfileToLeave`, `initLeaveTab`
- [ ] **Task 7**: `tab-overtime` (206줄) — switchTab 케이스: `applyProfileToOvertime`, `initOvertimeTab`, `profileSavedCTA` hide

**각 Task 공통 단계** (Phase 1 Task 2 패턴):
1. `tabs/tab-{name}.html` 추출
2. `index.html`에서 블록 제거 + placeholder 유지
3. `switchTab` 케이스를 `loadTab(name).then(...)` 로 변경
4. 로컬 서버 스모크
5. 커밋

### Prefetch 워밍업 (Task 7 이후)

**Files:** `inline-ui-helpers.js` DOMContentLoaded 핸들러

```javascript
if (window.prefetchTabs) {
  prefetchTabs(['overtime', 'leave', 'profile', 'settings']);
}
```

홈은 기본 노출이므로 포함 불필요. payroll은 Phase 4 완료 후 prefetch 명단에 추가.

---

## Phase 3: profile 탭 외부화

**Files:**
- Create: `tabs/tab-profile.html` (428줄)
- Modify: `index.html`, `app.js`

profile 탭은 `profileSavedCTABtn`, `pfPayslipLink` 등 여러 inline onclick 핸들러 포함. 모두 global scope 함수에 의존하므로 순서만 맞으면 동작. 테스트 가혹도 상승 필요.

- [ ] **Task 8 (profile)**: 패턴 동일. 추가 확인:
  - 프로필 저장 → 시간외/휴가 탭 반영
  - 가족 수당 입력 UI (동적 DOM 생성)
  - 경력 타임라인 렌더링

커밋: `refactor(tabs): profile 탭 외부 fragment로 분리 (428줄)`

---

## Phase 4: payroll 탭 외부화 (별도 플랜 권장)

**가장 복잡.** payroll 탭은:
- 3개 서브탭 (계산 / 명세서 / 퇴직금) = 829줄
- 서브탭별 동적 렌더 (`renderPayPayslip`, `PAYROLL.init`, `initPayEstimate`, retirement-engine.js 연동)
- 카드 기반 계산기 구조 — 탭 로드 후 카드 메타데이터 init 필요

**권장: Plan B-payroll 별도 플랜 작성.** 여기서는 placeholder만 남김.

---

## 최종 검증 + merge

- [ ] **라인 카운트 대비**

```bash
wc -l index.html tabs/*.html tab-loader.js
```

예상 (Phase 1~3 완료 시):
- `index.html`: ~700줄 (payroll 아직 inline)
- `tabs/*.html` 합: ~1,100줄
- `tab-loader.js`: ~50줄

Phase 4까지 완료 시 `index.html`: ~300줄.

- [ ] **회귀 체크리스트** (전체 탭 × 주요 기능)

  - [ ] 홈 탭 요약 카드
  - [ ] 급여 탭 3개 서브탭 + 카드 계산
  - [ ] 시간외 탭 계산 + 시급 경고
  - [ ] 휴가 탭 연차 계산
  - [ ] 찾아보기 탭 위키 TOC
  - [ ] 개인정보 탭 프로필 저장/불러오기 + 가족수당
  - [ ] 설정 탭 AppLock
  - [ ] 피드백 탭 Tally 폼
  - [ ] `?tab=overtime` URL 파라미터 진입 → 해당 탭 fragment 로드 후 활성
  - [ ] `?demo=1` 데모 배너
  - [ ] `?tutorial=1` 리다이렉트
  - [ ] 콘솔 에러 0건
  - [ ] 네트워크 탭에서 각 fragment가 단 1회만 fetch

- [ ] **main 합류**

```bash
git checkout main
git merge --no-ff refactor/index-tab-split
```

---

## 리스크 완화 전략

1. **Phase 단위로 배포** — Phase 1, 2, 3 각각 merge 후 1주 모니터링.
2. **Feature flag (선택):** `localStorage.bhm_lazy_tabs = '0'` 설정 시 모든 탭을 sync 로드 (fallback). 초기 롤아웃만.
3. **스켈레톤 UI**: 빈 placeholder에 간단한 로딩 인디케이터.
4. **회귀 체크리스트 각 Phase마다 전수 실행.**
5. **롤백 쉬움**: 각 Phase가 독립 커밋 + revert 가능.

---

## Self-Review

- [x] Scope check: payroll(829줄) 별도 플랜 분리 명시
- [x] Placeholder 없음: 각 태스크에 실제 코드·커맨드·커밋 메시지 포함
- [x] Risk 의식: 실행 전 결정 포인트(D1, D2, D3) 사전 합의 필요
- [x] 보안: `innerHTML` 사용 정당화 + whitelist 가드 + same-origin 제약 명시

## 후속

Phase 4 (payroll) 별도 플랜 — Phase 1~3 안정화 후 작성.
