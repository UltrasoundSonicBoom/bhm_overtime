# Plan C: JS Dead Code 감사 + 중복 제거

> **상태:** 초안 (작성일 2026-04-23). 실행 승인 대기.
> **의존성:** Plan A(main merge 완료), #3 테마 통일(완료).
> **다음 플랜:** Plan B (탭 HTML 분할) — Plan C 이후 착수 권장.

**Goal:** 런타임 코드에서 참조되지 않는 JS 함수·중복 정의·개발 로그 잔해를 정리한다. 구조 변경은 하지 않음 (모듈 분할은 Plan C 2단계로 유보).

**Architecture:**
- 각 파일 내부 정리만 (Phase 1). 파일 경계·로드 순서 유지.
- 전역 `window.*` 노출 검증. 중복 함수는 1곳으로 통합.
- 모듈 분할(Phase 2)은 별도 플랜 — 현재 플랜 범위 밖.

**Tech Stack:** 기존. 번들러 없음. Vanilla JS.

**Branch:** `refactor/js-dead-code` (main에서 분기, 작업 완료 후 merge)

**검증:** 자동 테스트 없음 → 각 태스크 후 브라우저 수동 스모크. 회귀 체크리스트는 Plan A와 동일 (홈/급여/시간외/휴가/개인정보/설정 탭 + 핵심 플로우).

---

## 근거 — 리서치 결과 요약

전체 프로젝트 스캔(2026-04-23):

| 카테고리 | 수량 | 예시 |
|---------|------|------|
| `// REMOVED auth:` 주석 | 32개 | app.js:3534, appLock.js:162, profile-tab.js:249 등 |
| console.log 개발 잔해 | 18개 | salary-parser.js(15), app.js(3) |
| 중복 함수 정의 | 4개 | `escapeHtml` ×4, `showOtToast` ×2 등 |
| 호출 0회 함수 (dead 의심) | 5개 | `calculateFamily`, `calculatePromotion`, `calculateLongService`, `renderOtStats` 등 |

파일 크기: `app.js` 3,904 / `salary-parser.js` 1,403 / `payroll.js` 1,249 / `leave-tab.js` 1,141 / `regulation.js` 1,148.

---

## 파일 구조

### 수정만
- `app.js` — dead 계산 함수 제거, renderOtStats 정리
- `settings-ui.js` — 구식 `showOtToast` 제거
- `salary-parser.js` — console.log를 DEBUG 플래그로 가드
- `appLock.js`, `leave.js`, `overtime.js`, `profile-tab.js` — `// REMOVED auth:` 주석 중 의미 없는 것 정리 (보존할지 판정 필요)

### 생성
- 없음 (Phase 1). Phase 2에서 `shared-utils.js` 등 고려.

---

## Task 1: 베이스라인 + 브랜치

- [ ] **Step 1: 워크트리에서 작업 (선호)**

```bash
cd /Users/momo/Documents/GitHub/bhm_overtime
git worktree add .worktrees/refactor-js-cleanup -b refactor/js-dead-code
cd .worktrees/refactor-js-cleanup
```

- [ ] **Step 2: 베이스라인 라인 카운트**

```bash
wc -l app.js salary-parser.js regulation.js leave-tab.js payroll.js settings-ui.js appLock.js > /tmp/plan-c-baseline.txt
git tag baseline-plan-c
```

- [ ] **Step 3: 브라우저 베이스라인 스모크** — 주요 탭 5개 + 급여 탭 내 3 서브탭 (계산/명세서/퇴직금) 이동하며 콘솔 에러 없음 확인.

---

## Task 2: 중복 `showOtToast` 제거

**Files:**
- Modify: `app.js:2374` — 이 버전이 2-parameter 표준
- Modify: `settings-ui.js:3-10` — 1-parameter 구식 버전 제거

- [ ] **Step 1: `app.js:2374`의 `showOtToast` 시그니처 확인**

```bash
grep -nA5 "^function showOtToast" app.js
```

- [ ] **Step 2: `settings-ui.js`의 `showOtToast` 함수 블록 제거**

`settings-ui.js`의 1~10줄 범위를 읽어 `function showOtToast(message) { ... }` 정의(약 8줄)를 삭제. 파일 최상단의 주석 `// settings-ui.js — 설정 탭 UI (AppLock 전용)`는 유지.

- [ ] **Step 3: settings-ui.js에서 showOtToast 호출이 모두 app.js 구현을 사용하는지 확인**

```bash
grep -n "showOtToast(" settings-ui.js
```

모든 호출이 app.js의 2-parameter 시그니처와 호환되는지 확인 (두 번째 인자 optional이면 안전).

- [ ] **Step 4: 브라우저에서 설정 탭 진입 → 앱 잠금 토글/PIN 변경 시 토스트 나오는지 확인**

- [ ] **Step 5: 커밋**

```bash
git add settings-ui.js
git commit -m "refactor(settings-ui): 중복된 showOtToast 제거 (app.js 버전 사용)"
```

---

## Task 3: 호출 0회 `calculate*` 함수 제거

**Files:**
- Modify: `app.js:1453, 1474, 1521`

- [ ] **Step 1: 각 함수가 진짜 호출되지 않는지 재확인**

```bash
for fn in calculateFamily calculateLongService calculatePromotion; do
  echo "=== $fn ==="
  grep -rn "$fn" --include="*.js" --include="*.html" .
done
```

기대: 각 함수 정의 1줄만 나옴 (호출 0회).

- [ ] **Step 2: 정의 블록 3개 삭제**

각 함수 본문 전체 (함수 시그니처부터 닫는 `}`까지) 삭제. Edit 도구로 정확히 매칭.

- [ ] **Step 3: 브라우저 스모크** — 급여 탭에서 가족수당/장기근속/승진수당 관련 계산 UI가 있으면 확인 (없으면 dead 확정).

- [ ] **Step 4: 커밋**

```bash
git add app.js
git commit -m "chore(app): 호출 없는 calculate* 함수 3개 제거

- calculateFamily, calculateLongService, calculatePromotion
- 전체 프로젝트에서 호출 없음 (정의 외 참조 0회)"
```

---

## Task 4: `renderOtStats` 정리

**Files:**
- Modify: `app.js:3288`

- [ ] **Step 1: `renderOtStats` 정의와 호출처 확인**

```bash
grep -nB2 -A8 "function renderOtStats" app.js
grep -n "renderOtStats" app.js
```

- [ ] **Step 2: alias 제거**

만약 `renderOtStats`가 단순 `renderOtDashboard` 호출 alias이면, alias 삭제하고 호출처를 직접 `renderOtDashboard`로 교체.

만약 실체가 있으면 dead 여부 재검토 — 리서치 요약이 틀렸을 수 있으므로 STOP 후 재평가.

- [ ] **Step 3: 커밋**

```bash
git add app.js
git commit -m "refactor(app): renderOtStats alias 제거, 호출처 직접 renderOtDashboard 호출"
```

---

## Task 5: `escapeHtml` 통합

**Files:**
- Create or pick: `shared-utils.js` (새 파일, 또는 기존 공용 파일 재사용)
- Modify: `app.js:7`, `dashboard.js:37`, `regulation.js:790`, `schedule_suite.js:18`

- [ ] **Step 1: 4개 구현 비교**

```bash
grep -nA8 "function escapeHtml" app.js dashboard.js regulation.js schedule_suite.js
```

정규식 패턴 차이 확인. 가장 견고한 구현(보통 5개 문자 모두 처리) 선택.

- [ ] **Step 2: 표준 버전 결정 + `shared-utils.js` 생성 (또는 기존 파일에 넣기)**

예시 표준:
```javascript
// shared-utils.js — 여러 파일에서 공유되는 유틸리티 함수
(function () {
  'use strict';

  function escapeHtml(unsafe) {
    if (unsafe == null) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  window.escapeHtml = escapeHtml;
})();
```

- [ ] **Step 3: HTML 파일 4곳에 로드 태그 추가**

`index.html`, `regulation.html`, `dashboard.html`, `schedule_suite.html`에 `<script src="shared-utils.js?v=1.0" defer></script>`를 각 파일의 스크립트 로드 체인 최상단에 추가.

- [ ] **Step 4: 4개 파일에서 중복 정의 제거**

각 파일에서 `function escapeHtml(...) { ... }` 블록 삭제. `window.escapeHtml`로 대체됨.

- [ ] **Step 5: 브라우저 스모크** — 각 페이지에서 escapeHtml이 쓰이는 UI(예: 프로필 이름 표시, 규정 검색 결과)가 XSS 테스트 입력 `<script>alert(1)</script>` 받았을 때 안전한지 확인.

- [ ] **Step 6: 커밋**

```bash
git add shared-utils.js index.html regulation.html dashboard.html schedule_suite.html \
        app.js dashboard.js regulation.js schedule_suite.js
git commit -m "refactor(utils): escapeHtml 중복 4개 → shared-utils.js 단일 구현"
```

---

## Task 6: salary-parser.js console.log를 DEBUG 플래그로 가드

**Files:**
- Modify: `salary-parser.js` (15개 `console.log` 지점)

- [ ] **Step 1: 디버그 플래그 정의**

`salary-parser.js` IIFE 상단에 추가:
```javascript
var DEBUG = (function () {
  try { return localStorage.getItem('bhm_debug_parser') === '1'; }
  catch (e) { return false; }
})();
function debug() {
  if (DEBUG) console.log.apply(console, arguments);
}
```

- [ ] **Step 2: 15개 `console.log(` → `debug(` 일괄 치환**

⚠️ 단순 치환이 아니라 각 로그의 의도를 확인. 일부는 `console.warn`/`console.error`여야 할 수도.

- [ ] **Step 3: 브라우저에서 확인**
- `localStorage.bhm_debug_parser = '1'; location.reload()` → 로그 보임
- 기본 상태 → 조용함

- [ ] **Step 4: 커밋**

```bash
git add salary-parser.js
git commit -m "chore(parser): console.log을 DEBUG 플래그로 가드

localStorage.bhm_debug_parser = '1'로 켬. 평상시 production 조용함."
```

---

## Task 7: `// REMOVED auth:` 주석 판정 + 정리

**Files:**
- Modify: `app.js`, `appLock.js`, `leave.js`, `overtime.js`, `profile-tab.js`

- [ ] **Step 1: 32개 주석 위치 나열**

```bash
grep -rn "^[[:space:]]*//[[:space:]]*REMOVED auth" --include="*.js" .
```

- [ ] **Step 2: 각각 검토 — 2개 범주로 분류**

(a) 함수/블록 자리에 남은 placeholder 주석 (예: `// REMOVED auth: _renderSignInButton — 로컬 전용 앱`) — 가치 없음, **제거 가능**.
(b) 문맥 힌트가 남겨진 주석 (예: "여기 과거에 Drive sync 있었음, 재도입 시 위치 참고") — **보존**.

범주 나누기는 사람 판단이 필요함. 각 파일 2~5줄씩 context 확인 후 판정.

- [ ] **Step 3: 판정 결과 기록 → 제거 대상만 삭제**

- [ ] **Step 4: 커밋**

```bash
git add -u
git commit -m "chore: 가치 없는 // REMOVED auth 주석 제거

보존 대상: 재도입 시 위치 힌트로 유용한 것
제거 대상: 단순 placeholder"
```

---

## Task 8: 최종 검증 + merge

- [ ] **Step 1: 라인 카운트 대비**

```bash
wc -l app.js salary-parser.js regulation.js leave-tab.js payroll.js settings-ui.js appLock.js
```

예상 감량: 200~400줄.

- [ ] **Step 2: 전체 브라우저 스모크** (Plan A와 동일 체크리스트)

- [ ] **Step 3: main 합류**

```bash
cd /Users/momo/Documents/GitHub/bhm_overtime
git checkout main
git merge --no-ff refactor/js-dead-code -m "Merge Plan C Phase 1: JS dead code 감사"
git worktree remove .worktrees/refactor-js-cleanup
git branch -d refactor/js-dead-code
```

---

## Phase 2 (별도 플랜, 추후)

- `payroll.js` 재구성 (card-driven 구조를 card-registry + calculator-engine + UI로 분할)
- `app.js` 3,904줄 → 도메인별 분할 (Overtime 로직 → `overtime.js`로 완전 이관, Reference/Wiki → `regulation.js`와 중복 제거 등)

Phase 2는 블래스트가 크므로 Plan A/B 완료 후 별도 계획.

---

## Self-Review

- [x] Spec 커버리지: 리서치 8개 카테고리 모두 태스크에 배정 (REMOVED 주석, dead 함수, 중복, console.log 등)
- [x] Placeholder 없음: 각 태스크에 실제 grep 명령·커밋 메시지 포함
- [x] 의존성: Task 5(escapeHtml 통합)는 HTML 파일 수정 포함 → Plan B 이전 완료 권장

## 예상 효과

- 코드 라인: -200 ~ -400줄
- 유지보수성: 중복 함수 제거로 단일 진실 공급원(SSOT)
- 디버깅 경험: DEBUG 플래그로 로그 on/off 가능
- Plan B 준비: 탭 HTML 분할 전 코드 기반이 더 깔끔해짐
