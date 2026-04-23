# index.html 인라인 CSS/스크립트 분리 Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `index.html` 2,346줄에서 인라인 `<style>` 196줄 + 인라인 `<script>` 약 95줄을 외부 파일로 분리해 약 291줄 감량. 시각/동작 변화 없음.

**Architecture:**
- 인라인 `<style>` 블록(46–242줄) → `style.css` 말미에 섹션 주석과 함께 추가
- DOMContentLoaded 기반 인라인 `<script>`(2237–2335) → `inline-ui-helpers.js` 새 파일
- FOUC 가드 스크립트(5줄, 7줄)와 Tally 임베드(2337줄)는 **유지** — body 렌더 전/3rd-party embed 규약으로 인라인 유지가 정당함

**Tech Stack:** 기존 — Vanilla HTML/CSS/JS, 번들러 없음, 스크립트 defer 로드

**Branch:** `refactor/index-html-cleanup` (worktree: `.worktrees/refactor-index-html/`)

**검증 방법:** 모든 태스크 공통 — `index.html`을 브라우저에서 열어 시각·인터랙션 회귀 확인. 자동화된 테스트 없으므로 **수동 스모크**.

---

## 파일 구조

### 생성
- `inline-ui-helpers.js` — 테마 토글, capture title, hourly warning 3개 기능 통합

### 수정
- `style.css` — 끝에 5개 CSS 섹션 append (기존 6,221줄 뒤)
- `index.html` — 인라인 `<style>`/`<script>` 블록 제거, `inline-ui-helpers.js` 로드 태그 추가

---

## Task 1: 베이스라인 스냅샷

**Files:**
- Read: `index.html`, `style.css`

- [ ] **Step 1: 줄 수 기록**

```bash
wc -l index.html style.css > /tmp/baseline-refactor.txt
cat /tmp/baseline-refactor.txt
```

Expected:
```
   2346 index.html
   6221 style.css
```

- [ ] **Step 2: 브라우저 스모크 (수동)**

`index.html`을 브라우저에서 열고 다음을 확인:
1. 홈 탭에서 시간외/휴가 요약 카드 표시
2. 하단 푸터에서 시간외 탭 클릭 → 시급 0원일 때 주황 경고 배너 노출
3. 개인정보 탭에서 👤 프로필 폼 로드
4. 설정 탭 → 테마 토글 버튼 동작 (🌙 ↔ 🎨)
5. 도메인 이전 모달은 `snuhmate.com` 외 도메인에서만 뜨므로 로컬 파일에선 미발생 — 스킵

스크린샷 또는 메모로 상태 고정.

- [ ] **Step 3: 커밋 (베이스라인 태그)**

```bash
git tag baseline-before-inline-extraction
```

---

## Task 2: Shared Modal CSS 이관 (46–64줄)

**Files:**
- Modify: `style.css:6221` — 말미에 append
- Modify: `index.html:46-64` — 해당 블록 삭제

- [ ] **Step 1: style.css 말미에 추가**

`style.css` 파일 끝(6,221줄 뒤)에 아래 추가:

```css

/* ─────────────────────────────────────────────
   Migration/Onboarding Modal (migrationOverlay에서 사용)
   원래 index.html 46-64줄에 인라인으로 존재
   ───────────────────────────────────────────── */
.onboarding-icon {
  font-size: 52px;
  margin-bottom: -4px;
}

.onboarding-title {
  font-size: var(--text-title-large);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.onboarding-sub {
  font-size: var(--text-body-normal);
  color: var(--text-muted);
  margin-bottom: 20px;
}
```

- [ ] **Step 2: index.html에서 46–64줄 삭제**

`index.html`에서 `/* ── Shared Modal Styles (used by migrationOverlay) ── */` 주석 줄부터 `.onboarding-sub { ... margin-bottom: 20px; }` 닫는 `}` 까지 삭제 (빈 줄 포함 19줄).

- [ ] **Step 3: 브라우저 확인**

로컬 개발 환경이 `snuhmate.com`이면 모달 뜨므로 아이콘 크기/타이틀 서체 확인. 아니면 Chrome DevTools에서 `document.getElementById('migrationOverlay').style.display = 'flex'`로 강제 표시 후 시각 확인.

- [ ] **Step 4: 커밋**

```bash
git add style.css index.html
git commit -m "refactor(index): shared modal 인라인 CSS → style.css 이관"
```

---

## Task 3: Hourly Warning / Info Note Banner CSS 이관 (66–121줄)

**Files:**
- Modify: `style.css` (append)
- Modify: `index.html:66-121` — 삭제

- [ ] **Step 1: style.css에 추가**

Task 2에서 추가한 블록 뒤에:

```css

/* ─────────────────────────────────────────────
   시간외 시급 미입력 경고 배너
   원래 index.html 66-93줄에 인라인으로 존재
   ───────────────────────────────────────────── */
.hourly-warning-banner {
  display: none;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  font-size: var(--text-body-normal);
  color: var(--accent-amber);
  margin-bottom: 8px;
  line-height: 1.5;
}

html[data-theme="neo"] .hourly-warning-banner {
  border: 2px solid #1a1a1a;
  box-shadow: 2px 2px 0 #1a1a1a;
  background: #fff8e1;
  color: #000000;
}

.hourly-warning-banner a {
  color: var(--accent-indigo);
  text-decoration: underline;
  cursor: pointer;
  font-weight: 600;
}

/* ─────────────────────────────────────────────
   정보 안내 배너 (홈 프로필 nudge 등)
   원래 index.html 95-121줄에 인라인으로 존재
   ───────────────────────────────────────────── */
.info-note-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(99, 102, 241, 0.07);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 8px;
  font-size: var(--text-body-normal);
  color: var(--text-secondary);
  margin-bottom: 12px;
  line-height: 1.5;
}

html[data-theme="neo"] .info-note-banner {
  border: 2px solid #1a1a1a;
  background: #ede9fe;
  color: #3730a3;
}

.info-note-banner a {
  color: var(--accent-indigo);
  text-decoration: underline;
  cursor: pointer;
  font-weight: 600;
}
```

- [ ] **Step 2: index.html에서 66–121줄 삭제**

`/* ── Hourly Warning Banner ── */` 주석부터 `.info-note-banner a { ... }` 닫는 `}` 까지 삭제.

- [ ] **Step 3: 브라우저 확인**

- 시간외 탭에서 시급 0원 → 주황 배너 노출
- 홈 탭 첫 진입(프로필 미입력 시) → 보라 info-note 노출

- [ ] **Step 4: 커밋**

```bash
git add style.css index.html
git commit -m "refactor(index): hourly-warning/info-note 배너 CSS → style.css 이관"
```

---

## Task 4: 시간외 도움말(ot-help) CSS 이관 (123–181줄)

**Files:**
- Modify: `style.css` (append)
- Modify: `index.html:123-181` — 삭제

- [ ] **Step 1: style.css에 추가**

```css

/* ─────────────────────────────────────────────
   시간외 도움말 아코디언
   원래 index.html 123-181줄에 인라인으로 존재
   ───────────────────────────────────────────── */
.ot-help-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ot-help-item {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(99, 102, 241, 0.12);
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  transition: background 0.2s;
}

.ot-help-item:active {
  background: rgba(99, 102, 241, 0.08);
}

.ot-help-q {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  font-size: var(--text-body-normal);
  font-weight: 600;
  color: var(--text-primary);
  gap: 6px;
}

.ot-help-a {
  display: none;
  padding: 0 12px 10px 12px;
  font-size: 12px;
  line-height: 1.65;
  color: var(--text-secondary);
  border-top: 1px solid rgba(99, 102, 241, 0.08);
}

.ot-help-item.open .ot-help-a {
  display: block;
}

.ot-help-ref {
  display: inline-block;
  margin-top: 4px;
  font-size: 11px;
  color: var(--accent-indigo);
  opacity: 0.7;
}

html[data-theme="neo"] .ot-help-item {
  background: #f5f3ff;
  border: 1.5px solid #c4b5fd;
}

html[data-theme="neo"] .ot-help-a {
  border-top: 1.5px solid #c4b5fd;
}
```

- [ ] **Step 2: index.html에서 123–181줄 삭제**

`/* ── 시간외 도움말 ── */` 주석부터 `html[data-theme="neo"] .ot-help-a { border-top: 1.5px solid #c4b5fd; }` 닫는 `}` 까지 삭제.

- [ ] **Step 3: 브라우저 확인**

시간외 탭 → 도움말 아코디언 항목 클릭 → 답변 접힘/펼침 정상 동작.

- [ ] **Step 4: 커밋**

```bash
git add style.css index.html
git commit -m "refactor(index): ot-help 아코디언 CSS → style.css 이관"
```

---

## Task 5: Migration Modal CSS 이관 (183–241줄)

**Files:**
- Modify: `style.css` (append)
- Modify: `index.html:183-241` — 삭제

- [ ] **Step 1: style.css에 추가**

```css

/* ─────────────────────────────────────────────
   도메인 이전 안내 모달 (migration-overlay.js에서 표시)
   원래 index.html 183-241줄에 인라인으로 존재
   ───────────────────────────────────────────── */
.migration-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.migration-card {
  background: var(--bg-card);
  border: 3px solid #1a1a1a;
  box-shadow: 8px 8px 0px #1a1a1a;
  border-radius: 24px;
  padding: 32px 24px;
  max-width: 460px;
  width: 100%;
  text-align: center;
  animation: modalSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.migration-btn {
  padding: 14px 20px;
  border-radius: 12px;
  font-weight: 800;
  cursor: pointer;
  border: 2px solid #1a1a1a;
  box-shadow: 4px 4px 0px #1a1a1a;
  transition: all 0.1s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: var(--text-body-large);
}

.migration-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0px #1a1a1a;
}

.migration-btn.primary {
  background: #fbbf24;
  color: #1a1a1a;
}

.migration-btn.secondary {
  background: #ffffff;
  color: #1a1a1a;
}
```

- [ ] **Step 2: index.html에서 183–241줄 + `<style>`/`</style>` 래퍼 삭제**

이제 `<style>` 블록 내부가 비므로 다음 구조를 모두 삭제:
- 46줄: `  <style>` 여는 태그
- 183–241줄: 모든 migration 관련 규칙
- 242줄: `  </style>` 닫는 태그

**주의:** `index.html` 뒤쪽(2339–2344줄)에 있는 `#ch-plugin-script-iframe` 스타일 블록은 **건드리지 않는다** — ChannelIO 3rd-party embed 제약상 인라인 유지가 관행.

- [ ] **Step 3: 브라우저 확인**

로컬에서는 모달이 자동으로 뜨지 않음. DevTools 콘솔에서:
```js
document.getElementById('migrationOverlay').style.display = 'flex';
```
→ 카드 그림자(`8px 8px 0 #1a1a1a`), 버튼 primary/secondary 색상, 백드롭 블러 모두 확인.

- [ ] **Step 4: 줄 수 중간 점검**

```bash
wc -l index.html style.css
```

Expected:
```
   2150 index.html   # 2346 − 196 = 2150
   6421 style.css    # 6221 + 200 = 6421 내외
```

- [ ] **Step 5: 커밋**

```bash
git add style.css index.html
git commit -m "refactor(index): migration modal CSS 이관 + 빈 <style> 블록 제거"
```

---

## Task 6: `inline-ui-helpers.js` 신규 파일 생성

**Files:**
- Create: `inline-ui-helpers.js`

- [ ] **Step 1: 새 파일 생성**

`/Users/momo/Documents/GitHub/bhm_overtime/inline-ui-helpers.js`:

```javascript
// inline-ui-helpers.js — index.html 인라인 스크립트를 통합
// 1) 테마 토글 (linear ↔ neo)
// 2) capture 파라미터 기반 문서 타이틀
// 3) 시간외 시급 0원 경고 배너

(function () {
  // ── (사전 반영) 테마: DOMContentLoaded 전에 즉시 적용해 flicker 방지 ──
  try {
    var savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'linear') document.documentElement.removeAttribute('data-theme');
  } catch (e) {}

  // ── capture 타이틀: DOM 준비 전에 document.title 갱신 (head에서 실행되므로 안전) ──
  function getCaptureParams() {
    return new URLSearchParams(window.location.search);
  }

  function applyCaptureTitle() {
    var params = getCaptureParams();
    var titleMap = {
      home: 'SNUH 메이트 - 홈',
      leave: 'SNUH 메이트 - 휴가',
      overtime: 'SNUH 메이트 - 시간외·온콜',
      profile: 'SNUH 메이트 - 개인정보',
      feedback: 'SNUH 메이트 - 피드백'
    };
    var tab = params.get('tab');
    if (tab && titleMap[tab]) document.title = titleMap[tab];
  }
  applyCaptureTitle();

  // ── 시간외 시급 경고 ──
  function updateHourlyWarning() {
    var val = parseInt(document.getElementById('otHourly')?.value) || 0;
    var warning = document.getElementById('otHourlyWarning');
    if (!warning) return;
    if (localStorage.getItem('hwBannerDismissed')) { warning.style.display = 'none'; return; }
    warning.style.display = val === 0 ? 'flex' : 'none';
  }

  function dismissHwBanner() {
    localStorage.setItem('hwBannerDismissed', '1');
    var w = document.getElementById('otHourlyWarning');
    if (w) w.style.display = 'none';
  }

  // 전역 노출 (index.html 인라인 onclick 핸들러 호환)
  window.updateHourlyWarning = updateHourlyWarning;
  window.dismissHwBanner = dismissHwBanner;

  // ── 테마 토글 (설정 탭 버튼에서 호출) ──
  function toggleTheme() {
    var html = document.documentElement;
    var btn = document.getElementById('themeToggle');
    var isNeo = html.getAttribute('data-theme') === 'neo';
    if (isNeo) {
      html.removeAttribute('data-theme');
      if (btn) btn.textContent = '🌙';
      localStorage.setItem('theme', 'linear');
    } else {
      html.setAttribute('data-theme', 'neo');
      if (btn) btn.textContent = '🎨';
      localStorage.setItem('theme', 'neo');
    }
  }
  window.toggleTheme = toggleTheme;

  // ── DOMContentLoaded 후 초기화 ──
  document.addEventListener('DOMContentLoaded', function () {
    // 테마 버튼 초기 아이콘
    var saved = localStorage.getItem('theme');
    if (saved === 'linear') {
      var tgl = document.getElementById('themeToggle');
      if (tgl) tgl.textContent = '🌙';
    }

    // 데모 배너
    var isDemoUrl = new URLSearchParams(window.location.search).get('demo') === '1';
    var isDemoFlag = localStorage.getItem('bhm_demo_mode') === '1';
    if (isDemoUrl || isDemoFlag) {
      var banner = document.getElementById('demoBanner');
      if (banner) banner.style.display = 'flex';
    }

    // 튜토리얼 리다이렉트
    if (getCaptureParams().get('tutorial') === '1') {
      window.location.href = './tutorial.html';
    }

    // 시급 경고 리스너
    document.getElementById('otHourly')?.addEventListener('input', updateHourlyWarning);
    setTimeout(updateHourlyWarning, 800);
  });
})();
```

- [ ] **Step 2: 파일 저장 확인**

```bash
wc -l inline-ui-helpers.js
```

Expected: 약 80줄

- [ ] **Step 3: 커밋**

```bash
git add inline-ui-helpers.js
git commit -m "feat: inline-ui-helpers.js — index.html 인라인 스크립트 통합"
```

---

## Task 7: index.html 인라인 스크립트 블록 제거 + 새 파일 로드

**Files:**
- Modify: `index.html` — 인라인 `<script>` 블록 4개 삭제 + 로드 태그 추가

- [ ] **Step 1: 테마 토글 스크립트 블록 제거 (원본 2237–2273줄)**

Task 5 이후 줄 번호가 바뀌어 있으므로 내용 기준으로 식별:

삭제 대상: `<script>` 태그 내부에 `// 테마 속성은 DOM 생성 전에 즉시 반영 (flicker 방지)` 주석으로 시작하는 약 37줄 블록과 그 `<script>`/`</script>` 래퍼.

- [ ] **Step 2: capture/hourly warning 스크립트 블록 제거 (원본 2280–2324줄)**

삭제 대상: `function getCaptureParams()`로 시작하고 `function dismissHwBanner() { ... }` 로 끝나는 약 45줄 블록과 그 `<script>`/`</script>` 래퍼.

- [ ] **Step 3: 시간외 input 리스너 블록 제거 (원본 2328–2335줄)**

삭제 대상:
```html
<script>
  // 시간외 탭 전환 시 경고 확인
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('otHourly')?.addEventListener('input', updateHourlyWarning);
    // 초기 로드 시 체크 (프로필 자동반영 후 약간 딜레이)
    setTimeout(updateHourlyWarning, 800);
  });
</script>
```

(기능은 `inline-ui-helpers.js`의 DOMContentLoaded 핸들러로 이관 완료)

- [ ] **Step 4: `inline-ui-helpers.js` 로드 태그 추가**

`<script src="settings-ui.js?v=1.1" defer></script>` 줄 바로 **뒤**에 추가:

```html
  <script src="inline-ui-helpers.js?v=1.0" defer></script>
```

위치를 `settings-ui.js` 뒤로 두는 이유: `shared-layout.js`가 `#themeToggle`/`#demoBanner`를 렌더하므로, 그 이후 defer 체인에서 실행돼야 초기 아이콘 세팅이 맞는다.

- [ ] **Step 5: 유지 대상 확인 (삭제 금지)**

다음은 **유지**:
- 5줄: 도메인 리다이렉트 (`location.replace` 사전 실행 — `defer` 불가)
- 7줄: AppLock FOUC 가드 (body 렌더 전 실행 필요)
- 39–45줄: Google Tag Manager gtag init (표준 패턴)
- 2337줄(이동 가능): Tally 임베드 (3rd-party loader 관행)
- 2339–2344줄: ChannelIO iframe 스타일 (3rd-party 제약)

- [ ] **Step 6: 브라우저 스모크 (전체 회귀)**

Task 1의 5개 항목 모두 재확인:
1. 홈 탭 요약 카드
2. 시간외 탭 시급 경고
3. 개인정보 탭 프로필
4. 설정 탭 테마 토글 (🌙 ↔ 🎨, 새로고침 후 유지)
5. 튜토리얼 리다이렉트 (`?tutorial=1`)

추가:
6. URL `?tab=overtime`로 접속 시 document.title이 "SNUH 메이트 - 시간외·온콜"로 변경
7. URL `?demo=1`로 접속 시 상단 노랑 데모 배너 표시

- [ ] **Step 7: 최종 줄 수 확인**

```bash
wc -l index.html
```

Expected:
```
   2055 index.html   # 2346 − 196(CSS) − 95(script) = 2055 내외
```

- [ ] **Step 8: 커밋**

```bash
git add index.html
git commit -m "refactor(index): 인라인 스크립트 4블록 → inline-ui-helpers.js"
```

---

## Task 8: 최종 검증 & worktree 합류 준비

**Files:** 없음 (검증 단계)

- [ ] **Step 1: 전체 diff 요약**

```bash
git log --oneline baseline-before-inline-extraction..HEAD
git diff --stat baseline-before-inline-extraction
```

Expected: 약 7개 커밋, `index.html` 약 −291줄, `style.css` 약 +200줄, `inline-ui-helpers.js` +80줄.

- [ ] **Step 2: 회귀 체크리스트 재실행**

브라우저에서 앱을 새로 열고 아래 모두 확인:

- [ ] 홈 탭: 시간외/휴가 요약 카드 렌더링
- [ ] 홈 탭: 프로필 미입력 시 info-note 배너
- [ ] 시간외 탭: 시급 0원 경고 배너 + 닫기
- [ ] 시간외 탭: 도움말 아코디언 펼침/접힘
- [ ] 휴가 탭 진입
- [ ] 개인정보 탭 진입
- [ ] 설정 탭: 🌙/🎨 토글 + 새로고침 후 유지
- [ ] `?tutorial=1` 접속 → tutorial.html 리다이렉트
- [ ] `?tab=leave` 접속 → 타이틀 "SNUH 메이트 - 휴가"
- [ ] `?demo=1` 접속 → 데모 배너 표시
- [ ] 콘솔 에러 0건

- [ ] **Step 3: 콘솔 에러 확인**

Chrome DevTools → Console → 새로고침. 빨간 에러 0건이어야 함.  
특히 `ReferenceError: toggleTheme is not defined` / `updateHourlyWarning is not defined` 없어야 함 — 있다면 `inline-ui-helpers.js`의 `window.*` 노출 확인.

- [ ] **Step 4: main 합류 준비**

```bash
# main에서 최근 변경사항 확인
git fetch origin main
git log --oneline main..HEAD  # refactor 브랜치 커밋 목록

# rebase로 깔끔한 히스토리 유지 (선택)
# git rebase main

# 푸시 + PR 생성은 사용자 승인 후
```

- [ ] **Step 5: 정리 커밋 (있다면)**

`inline-ui-helpers.js` 버전 번호 업데이트, 주석 다듬기 등. 없으면 스킵.

---

## Self-Review 체크

- [x] Spec 커버리지: 인라인 CSS 196줄 + 인라인 JS 95줄 모두 태스크에 배정됨
- [x] Placeholder 없음: 모든 코드 블록 실체 포함
- [x] 타입/네임 일관성: `toggleTheme`, `updateHourlyWarning`, `dismissHwBanner` 이름 원본 그대로 유지
- [x] 회귀 체크리스트 존재 (Task 1, 7, 8)

## 후속 플랜 (별도 문서)

- **Plan B**: 8개 탭 HTML → 런타임 로드 분할 (예상 −1,500줄)
- **Plan C**: `app.js` (3,904줄) / `regulation.js` (1,149줄) dead code 감사 + 모듈 분할

---

## 완료 후 main 합류 시나리오

worktree 내 브랜치가 완성되면:

```bash
# 메인 레포에서
cd /Users/momo/Documents/GitHub/bhm_overtime
git checkout main
git merge refactor/index-html-cleanup   # no-ff로 머지 커밋 유지 고려
git worktree remove .worktrees/refactor-index-html
git branch -d refactor/index-html-cleanup
```
