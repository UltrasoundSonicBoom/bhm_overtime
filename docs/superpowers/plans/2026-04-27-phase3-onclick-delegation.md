# Phase 3: Inline onclick → addEventListener 위임 + window.X 호환층 제거

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모든 inline `onclick=` (HTML + JS 동적 markup 안) 를 `data-action` 속성 + 부모 위임 (`addEventListener`) 패턴으로 전환. 113라인 `window.X = X` 호환층 제거. CSP `script-src 'self'` 적용 (XSS 방어 강화).

**Architecture:** 정적 HTML 13개 onclick + 동적 JS markup 안 onclick 52곳 (총 ~99 호출 + 18 메서드 호출 = ~117). 위임 패턴: 부모 컨테이너에 단일 click listener → `event.target.closest('[data-action]')` 로 dispatch. 모듈 별 점진 전환 (worktree per phase). Phase 2-regression 의 64개 window 노출은 위임 완료 후 제거 (호환층 → 무용).

**Tech Stack:** ES Module, addEventListener event delegation, data-* attributes, Vite 5 (변경 없음).

**SPEC 참조:** [docs/architecture/2026-04-27-phase2-assumptions-actual.md] §7 (window 호환층 fragility) → Phase 3 의 직접적 동인

---

## File Structure

```
docs/architecture/2026-04-27-phase3-spec.md          ← 신규 — Phase 3 SPEC + 위임 패턴 표준
shared-utils.js                                       ← delegateActions(rootElement, handlers) 추가
                                                        부모 위임 패턴 통일 헬퍼
tests/integration/onclick-delegation.test.js         ← 신규 — onclick 인벤토리 회귀 차단 (인라인 onclick 0)
tests/integration/csp-script-src.test.js              ← 신규 — vercel.json CSP 검증
vercel.json                                            ← Content-Security-Policy: script-src 'self' 추가
index.html                                             ← 정적 onclick 3 → data-action
regulation.html                                        ← 정적 onclick 6 → data-action
onboarding.html                                        ← 정적 onclick 1 → data-action
tutorial.html                                          ← 정적 onclick 3 → data-action
app.js                                                 ← 동적 markup onclick 13 → data-action + 위임 listener
payroll.js                                             ← 동적 markup onclick 21 → data-action
pay-estimation.js                                      ← 6 → data-action
leave-tab.js                                           ← 6 → data-action
regulation.js                                          ← 4 → data-action
payslip-tab.js                                         ← 1 → data-action
profile-tab.js                                         ← 1 → data-action
                                                        모든 모듈에서 `window.X = X` 호환층 제거
                                                        (위임 완료 후 → 113라인 삭제)
```

---

## Task 0: SPEC 문서 + 첫 worktree

**Files:**
- Create: `docs/architecture/2026-04-27-phase3-spec.md`

- [ ] **Step 0.1: worktree**

```bash
git worktree add -b feat/phase3-A-html-static ../bhm_overtime-phase3-A
cd ../bhm_overtime-phase3-A
npm install
npm run test:unit && npm run test:integration  # baseline 156 + 30 PASS
```

- [ ] **Step 0.2: SPEC 문서 작성**

`docs/architecture/2026-04-27-phase3-spec.md` 에 위임 패턴 표준 + 8 sub-phase 분할 명시:

- 표준 패턴: data-action + data-{module}-{param} attribute → 부모 listener 에서 closest('[data-action]') dispatch
- 회귀 안전망: 단계별 Playwright + onclick-delegation test (skip → enable)
- 8 sub-phase: 3-A 정적 HTML / 3-B payroll / 3-C app / 3-D leave+payest / 3-E 나머지 / 3-F 호환층 제거 / 3-G CSP / 3-H 회고

- [ ] **Step 0.3: 커밋 + main 머지**

```bash
git add docs/architecture/2026-04-27-phase3-spec.md
git commit -m "docs(phase3): SPEC + 위임 패턴 표준 + 8 sub-phase 분할"
git checkout main && git merge --ff-only feat/phase3-A-html-static
git push origin main
git checkout feat/phase3-A-html-static  # worktree 유지
```

---

## Task 1: shared-utils.js 위임 헬퍼 추가

**Files:**
- Modify: `shared-utils.js`
- Create: `tests/unit/delegate-actions.test.js`

- [ ] **Step 1.1: 실패 테스트 작성**

`tests/unit/delegate-actions.test.js`:

```js
// shared-utils.js 의 delegateActions 헬퍼 단위 테스트
import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';

beforeAll(async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
});

describe('delegateActions', () => {
  it('data-action 클릭 → handlers[action] 호출', async () => {
    const { delegateActions } = await import('../../shared-utils.js');
    let called = null;
    document.body.innerHTML = '<button id="b1" data-action="saveProfile">save</button>';
    delegateActions(document.body, {
      saveProfile: (el) => { called = el.id; },
    });
    document.getElementById('b1').click();
    expect(called).toBe('b1');
  });

  it('data-action 없으면 무시', async () => {
    const { delegateActions } = await import('../../shared-utils.js');
    let called = false;
    document.body.innerHTML = '<button id="b2">no action</button>';
    delegateActions(document.body, {
      saveProfile: () => { called = true; },
    });
    document.getElementById('b2').click();
    expect(called).toBe(false);
  });

  it('미등록 action 클릭 → console.warn 1회', async () => {
    const { delegateActions } = await import('../../shared-utils.js');
    document.body.innerHTML = '<button id="b3" data-action="unknownAction">x</button>';
    let warned = false;
    const origWarn = console.warn;
    console.warn = () => { warned = true; };
    delegateActions(document.body, { saveProfile: () => {} });
    document.getElementById('b3').click();
    console.warn = origWarn;
    expect(warned).toBe(true);
  });
});
```

> **참고**: jsdom 이 vitest 의존성에 포함되지 않으면 `npm install -D jsdom` 필요. 검사 후 결정.

- [ ] **Step 1.2: 의존성 점검**

```bash
node -e "require('jsdom')" 2>&1
```

만약 `Cannot find module 'jsdom'` → 설치:
```bash
npm install -D jsdom
```

- [ ] **Step 1.3: 테스트 실패 확인**

```bash
npx vitest run tests/unit/delegate-actions.test.js
```

Expected: FAIL — `delegateActions is not a function`

- [ ] **Step 1.4: shared-utils.js 에 헬퍼 추가**

`shared-utils.js` 끝에 export 추가:

```js
// Phase 3: data-action 부모 위임 헬퍼
//
// 사용:
//   delegateActions(document.body, {
//     saveProfile: (el, e) => saveProfile(),
//     payrollOtStep: (el, e) => PAYROLL._otStep(el.dataset.payrollId, ...),
//   });
//
// el = closest('[data-action]') 결과 element, e = MouseEvent
// 미등록 action 은 console.warn (마이그레이션 누락 자동 검출)
export function delegateActions(root, handlers) {
  if (typeof root === 'undefined' || !root) return;
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || !root.contains(el)) return;
    const action = el.dataset.action;
    if (!action) return;
    const handler = handlers[action];
    if (handler) {
      handler(el, e);
    } else {
      // eslint-disable-next-line no-console
      console.warn('[delegateActions] 미등록 action: "' + action + '"');
    }
  });
}

// 호환층 (IIFE 잔존 — Phase 3 종료 후 제거 가능)
if (typeof window !== 'undefined') {
  window.delegateActions = delegateActions;
}
```

- [ ] **Step 1.5: 테스트 PASS 확인**

```bash
npx vitest run tests/unit/delegate-actions.test.js
```

Expected: PASS — 3/3

- [ ] **Step 1.6: 통합 테스트 회귀 0**

```bash
npm run test:unit && npm run test:integration
```

Expected: 159 unit (156 + 3) + 30 integration PASS

- [ ] **Step 1.7: 커밋**

```bash
git add shared-utils.js tests/unit/delegate-actions.test.js package.json package-lock.json
git commit -m "feat(phase3): delegateActions 위임 헬퍼 (shared-utils.js)

- root + handlers 맵 으로 data-action 위임 등록
- 미등록 action 은 console.warn (마이그레이션 누락 자동 검출)
- jsdom 의존성 추가 (단위 테스트 DOM 환경)"
```

---

## Task 2: 정적 HTML onclick 위임 (Phase 3-A)

**Files:**
- Modify: `index.html` (3 onclick)
- Modify: `regulation.html` (6 onclick)
- Modify: `onboarding.html` (1 onclick)
- Modify: `tutorial.html` (3 onclick)
- Modify: `app.js` (delegateActions 등록)
- Modify: `regulation.js` (delegateActions 등록)
- Create: `tests/integration/onclick-delegation.test.js`

> **목표**: HTML 직접 inline onclick 13개 모두 제거.

- [ ] **Step 2.1: 실패 테스트 작성**

`tests/integration/onclick-delegation.test.js`:

```js
// 빌드 결과의 inline onclick 인벤토리 — Phase 3 진행에 따라 0 으로 수렴.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const DIST = join(ROOT, 'dist');

describe('onclick delegation — Phase 3', () => {
  beforeAll(() => {
    const r = spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) throw new Error('build failed');
  }, 120_000);

  // ── 정적 HTML 9 화면에 inline onclick 0 ──
  it('정적 HTML inline onclick 0 — Phase 3-A 완료 기준', () => {
    const HTMLS = readdirSync(DIST).filter(f => f.endsWith('.html'));
    const offenders = [];
    for (const html of HTMLS) {
      const content = readFileSync(join(DIST, html), 'utf8');
      const matches = content.match(/onclick="[^"]+"/g) || [];
      if (matches.length > 0) offenders.push(html + ': ' + matches.length);
    }
    expect(offenders, 'HTML inline onclick 잔존').toEqual([]);
  });

  // ── Phase 3-E 후 enable: JS bundle 안 onclick=" 문자열 0 ──
  it.skip('[Phase 3-E 후 enable] dist/assets/*.js 안 onclick=" 문자열 0', () => {
    const assets = readdirSync(join(DIST, 'assets')).filter(f => f.endsWith('.js'));
    const offenders = [];
    for (const f of assets) {
      const content = readFileSync(join(DIST, 'assets', f), 'utf8');
      const count = (content.match(/onclick=/g) || []).length;
      if (count > 0) offenders.push(f + ': ' + count);
    }
    expect(offenders).toEqual([]);
  });

  // ── Phase 3-F 후 enable: window.X = X 호환층 0 ──
  it.skip('[Phase 3-F 후 enable] root .js 에 window.X = X 호환층 0 (KEEP 제외)', () => {
    const rootJs = readdirSync(ROOT).filter(f => f.endsWith('.js') && !f.startsWith('vite'));
    const offenders = [];
    for (const f of rootJs) {
      const content = readFileSync(join(ROOT, f), 'utf8');
      const matches = content.match(/^\s*window\.[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*[a-zA-Z_]/gm) || [];
      if (matches.length > 0) offenders.push(f + ': ' + matches.length);
    }
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2.2: 테스트 실행 — FAIL 확인**

```bash
npx vitest run tests/integration/onclick-delegation.test.js
```

Expected: FAIL — 정적 HTML 4개 (index/regulation/onboarding/tutorial) 에 13 onclick.

- [ ] **Step 2.3: index.html — 3 onclick 위임**

```bash
grep -nE 'onclick="[^"]+"' index.html
```

원본 (예시):
```html
<button onclick="closeMigrationModal()">닫기</button>
<button onclick="downloadBackupAndStay()">백업</button>
<button onclick="window.exitDemoMode()">종료</button>
```

→ data-action 변경:
```html
<button data-action="closeMigrationModal">닫기</button>
<button data-action="downloadBackupAndStay">백업</button>
<button data-action="exitDemoMode">종료</button>
```

- [ ] **Step 2.4: app.js entry 에 delegateActions 등록**

`app.js` 안 IIFE 부트스트랩 (DOMContentLoaded 등록 위치) 에 추가:

```js
// Phase 3-A: 정적 HTML inline onclick 위임
import { delegateActions } from './shared-utils.js';

delegateActions(document.body, {
  closeMigrationModal: () => closeMigrationModal(),
  downloadBackupAndStay: () => downloadBackupAndStay(),
  exitDemoMode: () => window.exitDemoMode && window.exitDemoMode(),
  // ── Phase 3-B/C/D 진행하면서 추가 등록 ──
});
```

> **주의**: app.js 가 이미 entry 라서 import 추가 가능. delegateActions 는 shared-utils.js 가 이미 entry 의 import 그래프에 있으므로 추가 import 만으로 OK.

- [ ] **Step 2.5: regulation.html — 6 onclick 위임 + regulation.js delegateActions 등록**

```bash
grep -nE 'onclick="[^"]+"' regulation.html
```

원본 (예시):
```html
<button onclick="pdfPrevPage()">◀</button>
<button onclick="pdfNextPage()">▶</button>
<button onclick="pdfZoom(0.1)">+</button>
<button onclick="pdfZoom(-0.1)">−</button>
<button onclick="scrollChapterTabs(-1)">◀</button>
<button onclick="scrollChapterTabs(1)">▶</button>
```

→ data-action + 인자:
```html
<button data-action="pdfPrevPage">◀</button>
<button data-action="pdfNextPage">▶</button>
<button data-action="pdfZoom" data-zoom-delta="0.1">+</button>
<button data-action="pdfZoom" data-zoom-delta="-0.1">−</button>
<button data-action="scrollChapterTabs" data-scroll-direction="-1">◀</button>
<button data-action="scrollChapterTabs" data-scroll-direction="1">▶</button>
```

`regulation.js` 안 부트스트랩에 등록:

```js
import { delegateActions } from './shared-utils.js';

delegateActions(document.body, {
  pdfPrevPage: () => pdfPrevPage(),
  pdfNextPage: () => pdfNextPage(),
  pdfZoom: (el) => pdfZoom(parseFloat(el.dataset.zoomDelta)),
  scrollChapterTabs: (el) => scrollChapterTabs(parseInt(el.dataset.scrollDirection, 10)),
  // ── Phase 3-E 에서 regulation.js 의 4 동적 onclick 추가 등록 ──
});
```

- [ ] **Step 2.6: onboarding.html (1) + tutorial.html (3)**

```bash
grep -nE 'onclick="[^"]+"' onboarding.html tutorial.html
```

원본 (예시):
```html
<!-- onboarding.html -->
<button onclick="window.scrollTo(0, document.body.scrollHeight)">아래로</button>

<!-- tutorial.html (3) -->
<button onclick="goToApp()">시작</button>
<button onclick="nextStep()">▶</button>
<button onclick="prevStep()">◀</button>
```

→ data-action:
```html
<!-- onboarding.html -->
<button data-action="scrollToBottom">아래로</button>

<!-- tutorial.html -->
<button data-action="goToApp">시작</button>
<button data-action="nextStep">▶</button>
<button data-action="prevStep">◀</button>
```

각 HTML 의 inline `<script>` 블록 안에서 위임 등록 (entry 모듈 없는 페이지):

```html
<!-- onboarding.html -->
<script>
  document.body.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    if (el.dataset.action === 'scrollToBottom') window.scrollTo(0, document.body.scrollHeight);
  });
</script>

<!-- tutorial.html — 기존 nextStep/prevStep/goToApp 정의 후 -->
<script>
  document.body.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    if (a === 'goToApp') goToApp();
    else if (a === 'nextStep') nextStep();
    else if (a === 'prevStep') prevStep();
  });
</script>
```

- [ ] **Step 2.7: 빌드 + 테스트**

```bash
npm run build
npx vitest run tests/integration/onclick-delegation.test.js
```

Expected: 정적 HTML inline onclick 0 — PASS.

- [ ] **Step 2.8: Playwright 검증**

```bash
npm run preview &
sleep 4
```

Playwright MCP:
- index.html?app=1 → 마이그레이션 배너 닫기 버튼 (closeMigrationModal) → 동작 확인
- regulation.html → PIN unlock → PDF 뷰어 +/− 버튼 → 동작 확인
- onboarding.html → "아래로" 버튼 클릭 → scroll 이동 확인
- tutorial.html → 시작 / next / prev → 동작 확인
- 콘솔 에러 0건

- [ ] **Step 2.9: 커밋 + 머지**

```bash
git add index.html regulation.html onboarding.html tutorial.html app.js regulation.js tests/integration/onclick-delegation.test.js
git commit -m "feat(phase3-A): 정적 HTML inline onclick 13 → data-action 위임

- index.html: 3 onclick (closeMigrationModal/downloadBackupAndStay/exitDemoMode)
- regulation.html: 6 onclick (PDF/chapter 버튼)
- onboarding.html: 1 onclick (scrollToBottom)
- tutorial.html: 3 onclick (goToApp/nextStep/prevStep)
- app.js / regulation.js: delegateActions 부트스트랩 등록
- onboarding/tutorial: inline script 안 위임 (entry 모듈 없음)
- tests/integration/onclick-delegation.test.js: 정적 HTML onclick 0 회귀 가드"

git checkout main && git merge --ff-only feat/phase3-A-html-static
git push origin main
git worktree remove ../bhm_overtime-phase3-A
```

---

## Task 3: payroll.js — 21 동적 markup onclick 위임 (Phase 3-B)

**Files:**
- Modify: `payroll.js` (21 동적 onclick → data-action)
- Modify: `app.js` 또는 payroll 부트스트랩 (delegateActions 확장)
- Modify: `shared-utils.js` (delegateInput 헬퍼 추가)

> **payroll.js 가 가장 많은 동적 onclick — 21회. PAYROLL 객체 메서드 호출이 18회.**

- [ ] **Step 3.1: worktree + 인벤토리**

```bash
git worktree add -b feat/phase3-B-payroll ../bhm_overtime-phase3-B
cd ../bhm_overtime-phase3-B && npm install
grep -nE 'onclick=|oninput=' payroll.js | head -30
```

- [ ] **Step 3.2: shared-utils.js 에 delegateInput 추가**

```js
// shared-utils.js 끝에 추가
export function delegateInput(root, handlers) {
  if (!root) return;
  root.addEventListener('input', (e) => {
    const el = e.target.closest('[data-input-action]');
    if (!el || !root.contains(el)) return;
    const action = el.dataset.inputAction;
    const handler = handlers[action];
    if (handler) handler(el, e);
    else console.warn('[delegateInput] 미등록 action: "' + action + '"');
  });
}

if (typeof window !== 'undefined') {
  window.delegateInput = delegateInput;
}
```

- [ ] **Step 3.3: payroll.js 동적 markup 변환**

각 onclick 의 함수 + 인자를 data-* 로 매핑. 예:

```js
// Before:
htmlStr += '<button class="ot-step-btn" onclick="PAYROLL._otStep(\'' + id + '\',-0.25,\'overtimeCalc\')">−</button>';

// After:
htmlStr += '<button class="ot-step-btn" data-action="payrollOtStep" data-payroll-id="' + id + '" data-payroll-delta="-0.25" data-payroll-section="overtimeCalc">−</button>';

// Before (oninput):
htmlStr += '<input id="' + id + '" oninput="PAYROLL.recalc(\'overtimeCalc\')">';

// After:
htmlStr += '<input id="' + id + '" data-input-action="payrollRecalc" data-payroll-section="overtimeCalc">';
```

> 21회 변환은 sed/IDE 패턴 검색-치환 + 수동 검증 (정규식 복잡).

- [ ] **Step 3.4: app.js delegateActions 확장**

```js
delegateActions(document.body, {
  // (Phase 3-A 기존)
  closeMigrationModal: () => closeMigrationModal(),
  downloadBackupAndStay: () => downloadBackupAndStay(),
  exitDemoMode: () => window.exitDemoMode && window.exitDemoMode(),
  // Phase 3-B (payroll)
  payrollOtStep: (el) => PAYROLL._otStep(el.dataset.payrollId, parseFloat(el.dataset.payrollDelta), el.dataset.payrollSection),
  payrollRecalc: (el) => PAYROLL.recalc(el.dataset.payrollSection),
  // ... 나머지 PAYROLL 메서드 호출 종류 별
});

import { delegateInput } from './shared-utils.js';
delegateInput(document.body, {
  payrollRecalc: (el) => PAYROLL.recalc(el.dataset.payrollSection),
});
```

- [ ] **Step 3.5: 빌드 + Playwright 검증**

```bash
npm run build
npm run preview &
sleep 4
```

Playwright MCP — 급여 탭 핵심 시나리오:
- 시간외 +/− 버튼 클릭 → 값 0.25 단위 증감
- 시간외 input 직접 타이핑 → 자동 재계산
- 야간/휴일 동일
- 상여금 / 가족수당 / 군경력 입력 → 결과 갱신
- 콘솔 에러 0건 + 미등록 action warn 0

- [ ] **Step 3.6: 커밋 + 머지**

```bash
git add payroll.js app.js shared-utils.js
git commit -m "feat(phase3-B): payroll.js — 21 동적 markup onclick → data-action 위임

- PAYROLL._otStep / .recalc / 기타 21회 → data-action + data-payroll-* 인자
- shared-utils.js: delegateInput 헬퍼 추가 (oninput 대응)
- app.js: 21 handler 등록
- 급여 탭 +/− 버튼 + input 즉시 재계산 회귀 0"

git checkout main && git merge --ff-only feat/phase3-B-payroll
git push origin main
git worktree remove ../bhm_overtime-phase3-B
```

---

## Task 4: app.js — 13 동적 markup onclick (Phase 3-C)

**Files:**
- Modify: `app.js`

- [ ] **Step 4.1: worktree + 인벤토리**

```bash
git worktree add -b feat/phase3-C-app ../bhm_overtime-phase3-C
cd ../bhm_overtime-phase3-C && npm install
grep -nE 'onclick=' app.js
```

13 호출 — 함수별 분류 (실제 grep 결과 따름):
- toggleOtHelpDetail (6회 동일 함수)
- 기타 7회

- [ ] **Step 4.2: data-action 변환**

```js
// Before:
htmlStr += '<button onclick="toggleOtHelpDetail(\'' + key + '\')">자세히</button>';

// After:
htmlStr += '<button data-action="toggleOtHelpDetail" data-help-key="' + key + '">자세히</button>';
```

- [ ] **Step 4.3: app.js delegateActions handler 추가**

```js
delegateActions(document.body, {
  // (Phase 3-A/B 기존)
  toggleOtHelpDetail: (el) => toggleOtHelpDetail(el.dataset.helpKey),
  // ... 다른 onclick 종류 별 (실제 grep 결과 따라 추가)
});
```

- [ ] **Step 4.4: 빌드 + Playwright + 커밋**

```bash
npm run build
npm run preview &
sleep 4
# Playwright: 시간외 자세히 / 휴가 / 홈 → 동작 확인
git add app.js
git commit -m "feat(phase3-C): app.js — 13 동적 markup onclick → data-action 위임"
git checkout main && git merge --ff-only feat/phase3-C-app
git push origin main
git worktree remove ../bhm_overtime-phase3-C
```

---

## Task 5: leave-tab + pay-estimation — 12 onclick (Phase 3-D)

**Files:**
- Modify: `leave-tab.js` (6 onclick)
- Modify: `pay-estimation.js` (6 onclick)
- Modify: `shared-utils.js` (registerActions 통합 패턴)

- [ ] **Step 5.1: worktree + 인벤토리**

```bash
git worktree add -b feat/phase3-D-leave-payest ../bhm_overtime-phase3-D
cd ../bhm_overtime-phase3-D && npm install
grep -nE 'onclick=' leave-tab.js pay-estimation.js
```

- [ ] **Step 5.2: registerActions 전역 통합 패턴 도입 (shared-utils.js)**

```js
// shared-utils.js 끝에 추가
let _globalHandlers = null;
export function registerActions(newHandlers) {
  if (!_globalHandlers) {
    _globalHandlers = {};
    if (typeof document !== 'undefined') {
      delegateActions(document.body, _globalHandlers);
    }
  }
  Object.assign(_globalHandlers, newHandlers);
}

if (typeof window !== 'undefined') {
  window.registerActions = registerActions;
}
```

- [ ] **Step 5.3: 각 모듈에서 registerActions 호출**

```js
// leave-tab.js
import { registerActions } from './shared-utils.js';

if (typeof document !== 'undefined') {
  registerActions({
    lvNavMonth: (el) => lvNavMonth(parseInt(el.dataset.navDelta, 10)),
    lvGoToday: () => lvGoToday(),
    onLvDateClick: (el) => onLvDateClick(el.dataset.dateIso),
    openLvTypeBottomSheet: () => openLvTypeBottomSheet(),
    saveLvRecord: () => saveLvRecord(),
    deleteLvRecord: (el) => deleteLvRecord(el.dataset.recordId),
    closeLvBottomSheet: () => closeLvBottomSheet(),
    closeLvTypeBottomSheet: () => closeLvTypeBottomSheet(),
    editLvRecord: (el) => editLvRecord(el.dataset.recordId),
  });
}

// pay-estimation.js — 동일 패턴으로 6 handler 등록
```

- [ ] **Step 5.4: 동적 markup 안 onclick 변환 + 빌드 + Playwright + 커밋**

```bash
npm run build
npm run preview &
sleep 4
# Playwright: 휴가/급여예상 탭 → 모든 버튼 동작 확인
git add leave-tab.js pay-estimation.js shared-utils.js
git commit -m "feat(phase3-D): leave-tab + pay-estimation — 12 onclick → data-action

- shared-utils.js: registerActions 전역 handlers 패턴 도입 (모듈 별 등록)
- leave-tab/pay-estimation 자체 부트스트랩"
git checkout main && git merge --ff-only feat/phase3-D-leave-payest
git push origin main
git worktree remove ../bhm_overtime-phase3-D
```

---

## Task 6: regulation + payslip-tab + profile-tab — 6 onclick (Phase 3-E)

**Files:**
- Modify: `regulation.js` (4 동적 onclick)
- Modify: `payslip-tab.js` (1 onclick)
- Modify: `profile-tab.js` (1 onclick)

- [ ] **Step 6.1: worktree**

```bash
git worktree add -b feat/phase3-E-rest ../bhm_overtime-phase3-E
cd ../bhm_overtime-phase3-E && npm install
```

- [ ] **Step 6.2: 각 모듈 onclick 변환 + registerActions 등록**

동일 패턴.

- [ ] **Step 6.3: Phase 3-E 후 통합 테스트 enable**

`tests/integration/onclick-delegation.test.js` 의 `it.skip` 첫 번째 블록을 `it` 로 변경:

```js
it('dist/assets/*.js 안 onclick=" 문자열 0', () => { ... });
```

- [ ] **Step 6.4: 빌드 + 테스트**

```bash
npm run build
npx vitest run tests/integration/onclick-delegation.test.js
```

Expected: 정적 HTML 0 + dist/assets/*.js onclick=" 0 — 둘 다 PASS.

- [ ] **Step 6.5: 커밋 + 머지**

```bash
git add regulation.js payslip-tab.js profile-tab.js tests/integration/onclick-delegation.test.js
git commit -m "feat(phase3-E): regulation + payslip + profile — 6 onclick → data-action

- 모든 inline onclick 마이그레이션 완료 (HTML + JS markup 모두)
- onclick-delegation.test.js: dist/assets/*.js onclick=\" 0 검증 enable"
git checkout main && git merge --ff-only feat/phase3-E-rest
git push origin main
git worktree remove ../bhm_overtime-phase3-E
```

---

## Task 7: window.X 호환층 제거 (Phase 3-F)

**Files:**
- Modify: 113라인 `window.X = X` 가 있는 20개 모듈

> **목표**: Phase 2-regression 의 64 노출 + 기존 49 노출 = 113라인 모두 검토. KEEP 만 남기고 나머지 제거.

- [ ] **Step 7.1: worktree + 호환층 인벤토리**

```bash
git worktree add -b feat/phase3-F-cleanup ../bhm_overtime-phase3-F
cd ../bhm_overtime-phase3-F && npm install
grep -nE '^\s*window\.[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*[a-zA-Z_]' *.js > /tmp/window-exports.txt
wc -l /tmp/window-exports.txt
```

- [ ] **Step 7.2: 의존성 검증 — window.X 가 외부에서 참조되나?**

```bash
# 각 window.fn 이름이 다른 모듈에서 window.fn 으로 참조되는지
while IFS=: read -r file line content; do
  fn=$(echo "$content" | grep -oE 'window\.[a-zA-Z_][a-zA-Z0-9_]*' | head -1 | sed 's/window\.//')
  count=$(grep -rn "window\.${fn}\b" --include='*.js' . | grep -v "${file}" | grep -v node_modules | grep -v dist | wc -l)
  if [ "$count" -gt 0 ]; then
    echo "KEEP window.${fn} (used in $count places)"
  else
    echo "REMOVE window.${fn} from ${file}:${line}"
  fi
done < /tmp/window-exports.txt | tee /tmp/window-decisions.txt
```

> KEEP 항목은 호환층 유지 (다른 IIFE / inline script 가 참조). REMOVE 항목은 안전하게 제거.

- [ ] **Step 7.3: REMOVE 가능한 호환층 일괄 제거**

각 모듈의 `window.X = X` 블록 정리. ESM import 으로 대체 가능한 것 위주.

- [ ] **Step 7.4: 빌드 + Playwright 회귀**

전체 시나리오 재실행. 콘솔 에러 0건 + 미등록 action warn 0건.

- [ ] **Step 7.5: tests/integration/onclick-delegation.test.js 의 Phase 3-F 검증 enable**

```js
it('root .js 에 window.X = X 호환층 0 (KEEP 제외)', () => { ... });
```

> **참고**: KEEP 항목은 별도 allowlist 로 관리하거나, 검증을 "REMOVE 후 추가 호환층 0" 식으로 약하게 둘지 결정.

- [ ] **Step 7.6: 커밋 + 머지**

```bash
git add *.js tests/integration/onclick-delegation.test.js
git commit -m "feat(phase3-F): window.X 호환층 제거 (113라인 → KEEP 만)

- onclick 위임 완료 후 무용한 window.fn = fn 일괄 제거
- inline script / 미참조 호환층 KEEP (allowlist 별도 관리)
- onclick-delegation.test.js: window.X 회귀 가드 enable"
git checkout main && git merge --ff-only feat/phase3-F-cleanup
git push origin main
git worktree remove ../bhm_overtime-phase3-F
```

---

## Task 8: vercel.json — Content-Security-Policy 도입 (Phase 3-G)

**Files:**
- Modify: `vercel.json`
- Create: `tests/integration/csp-script-src.test.js`

- [ ] **Step 8.1: worktree + 실패 테스트**

```bash
git worktree add -b feat/phase3-G-csp ../bhm_overtime-phase3-G
cd ../bhm_overtime-phase3-G && npm install
```

`tests/integration/csp-script-src.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

describe('CSP — Phase 3-G', () => {
  it('vercel.json: HTML 에 Content-Security-Policy: script-src \'self\'', () => {
    const cfg = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
    const htmlHeader = (cfg.headers || []).find(h => /\\\.html$/.test(h.source));
    expect(htmlHeader, 'HTML CSP header 항목').toBeDefined();
    const cspKey = (htmlHeader.headers || []).find(kv => kv.key.toLowerCase() === 'content-security-policy');
    expect(cspKey, 'Content-Security-Policy 헤더').toBeDefined();
    expect(cspKey.value).toMatch(/script-src 'self'/);
    // unsafe-inline 차단 (위임 완료 후)
    expect(cspKey.value).not.toMatch(/script-src[^;]*unsafe-inline/);
  });
});
```

- [ ] **Step 8.2: 테스트 실패 확인**

```bash
npx vitest run tests/integration/csp-script-src.test.js
```

Expected: FAIL — CSP 헤더 없음.

- [ ] **Step 8.3: vercel.json 갱신**

```json
{
  ...
  "headers": [
    ...
    {
      "source": "/(.*)\\.html",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' data:;"
        }
      ]
    },
    ...
  ]
}
```

> **주의**:
> - `script-src 'self' https://cdnjs.cloudflare.com` — pdf.js CDN 허용
> - `https://www.googletagmanager.com` — GA 허용
> - `style-src 'unsafe-inline'` — 인라인 style 광범위 사용 (Phase 4 candidate)
> - `unsafe-inline` 가 script-src 에 없음 — inline `<script>` 와 onclick= 모두 차단

- [ ] **Step 8.4: 로컬 빌드 + Vercel preview push**

```bash
npm run build  # 빌드 결과 자체에는 CSP 영향 없음 (Vercel response header)
git add vercel.json tests/integration/csp-script-src.test.js
git commit -m "feat(phase3-G): vercel.json Content-Security-Policy script-src 'self'

- 인라인 onclick / inline script 차단 (XSS 방어 강화)
- pdf.js CDN + GA whitelist
- Phase 3-A~F 의 onclick 위임 완료 → CSP unsafe-inline 제거 가능
- csp-script-src.test.js: 헤더 정합 회귀 가드"

git push -u origin feat/phase3-G-csp
gh pr create --title "Phase 3-G: CSP script-src 'self'" --body "Phase 3 의 마지막 단계 — 위임 완료 후 strict CSP 적용"
```

PR Vercel preview URL 에서:

```bash
PREVIEW=$(gh pr view --json comments | grep -oE 'https://[a-zA-Z0-9.-]*vercel\.app' | head -1)
curl -sI "$PREVIEW/index.html" | grep -i 'content-security-policy'
```

Expected: `content-security-policy: default-src 'self'; script-src 'self' ...`

Playwright 에서 inline script 차단 확인 — 콘솔에 CSP violation 메시지 0건이면 모든 inline 제거됨.

- [ ] **Step 8.5: main 머지**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull
git worktree remove ../bhm_overtime-phase3-G
```

---

## Task 9: 회고 + Phase 3 종료 (Phase 3-H)

**Files:**
- Create: `docs/architecture/2026-04-27-phase3-completed.md`

- [ ] **Step 9.1: 측정**

```bash
git log --oneline | grep -E 'phase3-[A-G]' | head -10
grep -rohE 'onclick="[^"]+"' --include='*.html' --include='*.js' . 2>/dev/null | grep -v node_modules | grep -v dist | grep -v public/ | wc -l
# Expected: 0
grep -hc 'window\.[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*[a-zA-Z_]' *.js 2>/dev/null | awk '{s+=$1} END {print s}'
# Expected: KEEP 항목만 (수치 기록)
```

- [ ] **Step 9.2: 회고 docs**

```markdown
# Phase 3 완료 회고 — onclick 위임 + window.X 호환층 제거 + CSP

## 정량 결과
- inline onclick: 117 → 0 (-117)
- window.X 호환층: 113 → KEEP only (-N)
- CSP: 'unsafe-inline' 제거 → script-src 'self'
- 코드 라인: -200~400줄 추정
- 회귀 0 (Playwright + 156+30+ tests pass)

## 다음 (Phase 4 candidate)
- TypeScript 도입 (점진 — .ts 파일 추가 + tsconfig)
- style-src 'unsafe-inline' 제거 (모든 inline style → class)
- Lighthouse 성능 측정 + 개선
```

- [ ] **Step 9.3: 커밋**

```bash
git add docs/architecture/2026-04-27-phase3-completed.md
git commit -m "docs(phase3-H): Phase 3 완료 회고 — 117 onclick → 0, CSP script-src 'self'"
git push origin main
```

---

## Self-Review

- [ ] Task 0 SPEC 문서 — 위임 패턴 + 컨벤션 명확
- [ ] Task 1 헬퍼 — delegateActions / delegateInput / registerActions API 설계 일관 (registerActions 가 단일 root 위임 + 동적 handlers 추가 패턴)
- [ ] Task 2~6 — HTML 별 / 모듈 별 점진 전환, 각 단계 Playwright 검증
- [ ] Task 7 — 호환층 제거 시 KEEP 항목 별도 분류 (다른 IIFE / inline script 의존)
- [ ] Task 8 — CSP whitelist (cdnjs / GA) 정확 + 'unsafe-inline' 없음
- [ ] 통합 테스트 — onclick-delegation.test.js 가 단계별 enable (skip → enable)
- [ ] **회귀 안전망**: 각 sub-phase 머지 시 Vercel preview 검증 + Playwright

---

## 산출물

- `shared-utils.js`: delegateActions / delegateInput / registerActions 추가
- `vercel.json`: CSP script-src 'self' (외 whitelist)
- 9 HTML 의 inline onclick 0
- 8 JS 의 동적 markup onclick 0
- 113 → KEEP 의 window.X 호환층
- `tests/integration/onclick-delegation.test.js` (정적/동적/window 3 단계)
- `tests/integration/csp-script-src.test.js`
- `docs/architecture/2026-04-27-phase3-spec.md` + `completed.md`

## Phase 3 완료 후

- inline onclick 0 → 코드 가독성 ↑
- CSP 'self' → XSS 차단 (3rd-party script 차단)
- IDE rename 안전 → Phase 4 (TypeScript) 진입 발판
- Phase 2-regression 의 fragility 영구 해결
