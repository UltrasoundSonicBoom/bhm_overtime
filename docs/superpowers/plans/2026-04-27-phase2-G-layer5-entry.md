# Phase 2-G: Layer 5 — App Entry ESM 전환

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 진입점 (app.js / regulation.js entry / retirement.js entry / dashboard.js entry / schedule_suite.js entry) 을 ESM 으로 전환. 9개 HTML 의 `<script src="X.js" defer>` 47개를 1~3개 ESM entry 로 통합.

**Architecture:** entry 모듈이 모든 Layer 0~4 import → 단일 진입점. HTML 의 `<script type="module" src="app.js">` 단일화. Vite 가 import 그래프 자동 추적 → entry 별 chunk + tree-shaking. 부트스트랩 (loadDataFromAPI setTimeout, AppLock checkAndPrompt 등) 은 entry 에서 명시 호출.

**Tech Stack:** ES Module + Vite multi-entry, Vitest 4.x.

**SPEC:** `docs/superpowers/specs/2026-04-27-phase2-modularization-spec.md` §2 Layer 5

---

## File Structure

```
app.js                      ← 모든 Layer 0~4 import + DOM bootstrap (단일 entry)
regulation.js               ← 이미 G5 에서 UI 변환 — 여기선 entry 부분만 (DOMContentLoaded)
retirement.js               ← 동일
dashboard.js                ← 동일
schedule_suite.js           ← 동일
onboarding.html             ← 인라인 진입 코드 → 별도 entry 검토 (작은 규모)

index.html                  ← <script src="X.js" defer> 29개 → <script type="module" src="app.js"> 1개
regulation.html             ← 8개 → 1개 type="module"
retirement.html             ← 2개 → 1개 type="module"
dashboard.html              ← 2개 → 1개 type="module"
schedule_suite.html         ← 2개 → 1개 type="module"

vite.config.js              ← entry 정리 (chunkFileNames 유지)

tests/integration/entry-bundle.test.js  ← 신규 — 빌드 결과의 entry chunk 검증
```

---

## Task 0: worktree + baseline

- [ ] **Step 0.1: worktree**

```bash
git worktree add -b feat/phase2-G-layer5 ../bhm_overtime-phase2-G
cd ../bhm_overtime-phase2-G
```

- [ ] **Step 0.2: baseline**

```bash
npm run test:unit  # 188 passed (Phase 2-F 후)
npm run build
ls dist/assets/ | wc -l
du -sh dist/
```

기록: 현재 47개 .js 의 빌드 결과 (entry 통합 전 baseline).

---

## Task 1: app.js → ESM entry (가장 큰 단일 작업)

**Files:**
- Modify: `app.js` (3,876줄)
- Modify: `index.html` (29개 script → 1개 type="module")

- [ ] **Step 1.1: 실패 통합 테스트 추가**

`tests/integration/entry-bundle.test.js`:

```js
// Phase 2-G 진입 기준: 빌드 결과 entry chunk 1개 이하 + 의존성 자동 chunk 분리
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const ROOT = join(__dirname, '../..');
const DIST = join(ROOT, 'dist');

describe('Entry bundle (Phase 2-G)', () => {
  beforeAll(() => {
    const r = spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) throw new Error('build failed');
  }, 120_000);

  it('index.html: <script src="app.js" defer> 가 type="module" 로 변환된 빌드 결과', () => {
    const html = readFileSync(join(DIST, 'index.html'), 'utf8');
    expect(html).toMatch(/<script type="module"[^>]*src=["']\/?assets\/index-[a-f0-9]+\.js["']/);
    // 기존 47개 다중 script 가 단일 type="module" 로 통합됐는지
    const scriptCount = (html.match(/<script[^>]*src=/g) || []).length;
    expect(scriptCount).toBeLessThanOrEqual(3);  // GA + sentry + 메인 entry
  });

  it('regulation.html: 단일 entry', () => {
    const html = readFileSync(join(DIST, 'regulation.html'), 'utf8');
    expect(html).toMatch(/<script type="module"[^>]*src=["']\/?assets\//);
  });

  it('retirement.html: 단일 entry', () => {
    const html = readFileSync(join(DIST, 'retirement.html'), 'utf8');
    expect(html).toMatch(/<script type="module"[^>]*src=["']\/?assets\//);
  });
});
```

- [ ] **Step 1.2: 테스트 실패 확인**

```bash
npx vitest run tests/integration/entry-bundle.test.js
```

Expected: FAIL — 아직 index.html 에 다중 script 태그.

- [ ] **Step 1.3: app.js 시작 부분에 모든 import 추가**

```js
// app.js — 단일 entry — 모든 Layer 0~4 모듈 import
//
// 의존성 그래프:
//   Layer 0: data, regulation-constants, shared-utils
//   Layer 1: calculators, holidays, retirement-engine
//   Layer 2: profile, overtime, leave, payroll
//   Layer 3: appLock
//   Layer 4: shared-layout, tab-loader, profile-tab, leave-tab, payslip-tab,
//            payroll-views, pay-estimation, salary-parser, ...

// Layer 0
import './data.js';
import './regulation-constants.js';
import './shared-utils.js';

// Layer 1
import './calculators.js';
import './holidays.js';
import './retirement-engine.js';

// Layer 2
import './profile.js';
import './overtime.js';
import './leave.js';
import './payroll.js';

// Layer 3
import './appLock.js';

// Layer 4 (UI / DOM)
import './sentry.js';
import './config.js';
import './utils-lazy.js';
import './shared-layout.js';
import './tab-loader.js';
import './migration-overlay.js';
import './orphan-recovery.js';
import './insight-engine.js';
import './job-templates.js';
import './inline-ui-helpers.js';
import './share-utils.js';
import './settings-ui.js';
import './salary-parser.js';
import './resume.js';
import './work-history.js';
import './profile-tab.js';
import './leave-tab.js';
import './payslip-tab.js';
import './payroll-views.js';
import './pay-estimation.js';

// === 기존 app.js 본문 (3,876줄) 그대로 유지 ===
// const PROFILE_FIELDS = { ... };
// ...
// IIFE 부트스트랩 ((function () { ... })())
```

> **import 순서 원칙**: Layer 0 → 1 → 2 → 3 → 4. Vite 가 import 그래프 자동 분석 + chunk 분할.

> **side effect import**: 각 모듈은 `window.X` 호환층을 side effect 으로 설정. import 만으로 충분 (구체 심볼 destructure 불필요).

- [ ] **Step 1.4: index.html 의 script 태그 단일화**

`index.html` 안:

```html
<!-- Before (29개) -->
<script src="shared-layout.js" defer></script>
<script src="tab-loader.js" defer></script>
<script src="shared-utils.js" defer></script>
<!-- ... 26 more ... -->
<script src="app.js" defer></script>

<!-- After (1개 — Vite 가 hash 처리) -->
<script type="module" src="app.js"></script>
```

> **GA / Sentry 인라인 스크립트 등은 그대로 유지**.

> **inline FOUC 방지 스크립트** (line 2 의 `pinEnabled` 검사) 도 그대로 유지.

> **type="module" 자동 defer**: ESM 은 자동으로 defer 처럼 동작 (parser-blocking 0). HTML `defer` 속성 불필요.

- [ ] **Step 1.5: 빌드 + 통합 테스트**

```bash
npm run build
npx vitest run tests/integration/entry-bundle.test.js
```

Expected: PASS — index.html 안 type="module" entry 단일.

- [ ] **Step 1.6: 브라우저 검증 — 가장 큰 위험 단계**

```bash
npm run preview &
PREVIEW_PID=$!
sleep 3
```

Playwright MCP — **CLAUDE.md 필수 체크리스트 + 모든 inline onclick**:

- [ ] 홈 탭 요약 카드 (휴가/시간외/급여 모두)
- [ ] 급여 탭 3 서브탭
- [ ] 시간외 탭 시급 경고 + +/- 버튼
- [ ] 휴가 탭 연차 + 추가/삭제
- [ ] 찾아보기 탭
- [ ] 개인정보 탭 round-trip
- [ ] 설정 탭 AppLock 토스트
- [ ] 피드백 탭
- [ ] **부트스트랩 동작**: AppLock checkAndPrompt 자동 트리거, loadDataFromAPI setTimeout
- [ ] 콘솔 에러 0건
- [ ] **로드 시간**: First Contentful Paint < 1.5s (mobile 기준)

```bash
kill $PREVIEW_PID
```

- [ ] **Step 1.7: 커밋**

```bash
git add app.js index.html tests/integration/entry-bundle.test.js
git commit -m "feat(phase2-G): app.js → ESM single entry + index.html type=module

- app.js: 29 import (Layer 0~4 전체) + 기존 본문 보존
- index.html: 29 script 태그 → 1 type=module
- type=module 자동 defer (parser-blocking 0)
- 9 탭 + AppLock + 부트스트랩 동작 콘솔 에러 0
- entry-bundle.test.js PASS"
```

---

## Task 2: regulation.js → ESM entry + regulation.html

**Files:**
- Modify: `regulation.js` (entry 부분 — DOMContentLoaded 등)
- Modify: `regulation.html` (8개 script → 1개 type="module")

- [ ] **Step 2.1: regulation.js 시작 부분에 import 추가**

```js
// regulation.js — regulation.html 단일 entry
import './shared-utils.js';
import './regulation-constants.js';
import './data.js';
import './sentry.js';
import './config.js';
import './shared-layout.js';
import './appLock.js';
// (필요 시 다른 Layer 모듈)

// === 기존 regulation.js 본문 (1,144줄) 그대로 ===
```

- [ ] **Step 2.2: regulation.html 단일화**

```html
<!-- Before (8개) -->
<script src="shared-layout.js" defer></script>
<!-- ... -->
<script src="regulation.js" defer></script>

<!-- After (1개) -->
<script type="module" src="regulation.js"></script>
```

- [ ] **Step 2.3: 빌드 + Playwright**

```bash
npm run build
npm run preview &
sleep 3
```

Playwright MCP:
- http://localhost:4173/regulation.html
- 본문 렌더 + placeholder 사라짐
- 6개 onclick 동작
- 콘솔 에러 0
- 잠금 화면 (PIN 등록 시) 정상

- [ ] **Step 2.4: 커밋**

```bash
git add regulation.js regulation.html
git commit -m "feat(phase2-G): regulation.html → 단일 ESM entry

- regulation.js: import { Layer 0+3+4 } + 기존 본문
- regulation.html: 8 script → 1 type=module
- 본문 렌더 + 6 onclick + 잠금 화면 콘솔 에러 0"
```

---

## Task 3: retirement.html / retirement.js → 단일 entry

**Files:**
- Modify: `retirement.js`
- Modify: `retirement.html`

- [ ] **Step 3.1: retirement.js 시작 부분 import**

```js
import './data.js';
import './shared-utils.js';
import './regulation-constants.js';
import './retirement-engine.js';
import './profile.js';  // 만약 의존
import './sentry.js';
import './config.js';
import './shared-layout.js';
import './appLock.js';

// 기존 본문
```

- [ ] **Step 3.2: retirement.html 단일화**

```html
<script type="module" src="retirement.js"></script>
```

- [ ] **Step 3.3: 빌드 + Playwright**

```bash
npm run build
npm run preview &
sleep 3
```

Playwright MCP:
- http://localhost:4173/retirement.html
- 입력 폼 + autoLoad 동작
- 시뮬레이션 + 결과 표시
- 콘솔 에러 0

- [ ] **Step 3.4: 커밋**

```bash
git add retirement.js retirement.html
git commit -m "feat(phase2-G): retirement.html → 단일 ESM entry

- retirement.js: import { Layer 0+1+3+4 } + 기존 본문
- retirement.html: 2 script → 1 type=module
- 시뮬레이션 + autoLoad 콘솔 에러 0"
```

---

## Task 4: dashboard.html / schedule_suite.html → 단일 entry

**Files:**
- Modify: `dashboard.js`, `schedule_suite.js`
- Modify: `dashboard.html`, `schedule_suite.html`

- [ ] **Step 4.1: 각 entry 모듈 import 추가**

`dashboard.js` / `schedule_suite.js` 시작 부분에 필요한 Layer 모듈 import.

- [ ] **Step 4.2: HTML 단일화**

각 HTML 의 `<script src=...>` → `<script type="module" src=...>` 단일.

- [ ] **Step 4.3: 빌드 + Playwright**

```bash
npm run build
npm run preview &
sleep 3
```

Playwright MCP:
- /dashboard.html → 콘솔 에러 0
- /schedule_suite.html → 콘솔 에러 0

- [ ] **Step 4.4: 커밋**

```bash
git add dashboard.js dashboard.html schedule_suite.js schedule_suite.html
git commit -m "feat(phase2-G): dashboard / schedule_suite → 단일 ESM entry

- dashboard.html / schedule_suite.html: 2 script → 1 type=module
- 각 페이지 콘솔 에러 0"
```

---

## Task 5: 나머지 페이지 (onboarding / tutorial / terms / privacy)

**Files:**
- Modify: `onboarding.html`, `tutorial.html`, `terms.html`, `privacy.html`

> 이들 페이지는 인라인 스크립트 위주 — 변환 필요한 .js 가 없거나 작음. 검토 후 필요 시만 변환.

- [ ] **Step 5.1: 각 HTML script 인벤토리**

```bash
for h in onboarding.html tutorial.html terms.html privacy.html; do
  echo "=== $h ==="
  grep '<script' "$h"
done
```

- [ ] **Step 5.2: 외부 .js 사용 없으면 변경 0, 사용하면 type="module"**

각 HTML 의 `<script src="X.js">` 가 있다면 type="module" 로 변환.
인라인 스크립트는 그대로.

> onboarding.html 안 1개 inline onclick — 호환층으로 동작 (Layer 4 의 함수 window 노출).

- [ ] **Step 5.3: 빌드 + Playwright**

```bash
npm run build
npm run preview &
sleep 3
```

Playwright MCP:
- /onboarding.html, /tutorial.html, /terms.html, /privacy.html
- 콘솔 에러 0
- onboarding 의 시작 버튼 onclick 동작

- [ ] **Step 5.4: 커밋 (변경 있을 시)**

```bash
git add onboarding.html tutorial.html terms.html privacy.html
git commit -m "feat(phase2-G): 나머지 4개 HTML script type=module 정리"
```

---

## Task 6: vite.config.js entry 정리

**Files:**
- Modify: `vite.config.js`

- [ ] **Step 6.1: chunkFileNames + manualChunks (선택) 검토**

```js
// vite.config.js — Phase 2-G 후 entry 정리
build: {
  rollupOptions: {
    input: {
      // ... 9개 HTML entry 그대로
    },
    output: {
      entryFileNames: 'assets/[name]-[hash].js',
      chunkFileNames: 'assets/chunks/[name]-[hash].js',  // chunk 분리
      assetFileNames: 'assets/[name]-[hash][extname]',
      // 선택: vendor chunk 분리 (큰 모듈만)
      manualChunks(id) {
        // 큰 공유 모듈은 별도 chunk
        if (id.includes('salary-parser')) return 'salary-parser';
        if (id.includes('payroll')) return 'payroll-domain';
        // 기본은 자동 chunk (Vite 가 import 그래프로 분리)
      }
    }
  }
}
```

> **manualChunks 는 선택 사항** — 처음엔 Vite 자동 분할로 시작, 측정 후 최적화.

- [ ] **Step 6.2: 빌드 + chunk 크기 측정**

```bash
npm run build
ls -lh dist/assets/ | sort -k5 -h
du -sh dist/
```

기록: Phase 2-G 후 dist 총 크기 (Phase 2-A baseline 과 비교 — gzip + tree-shaking 효과 확인).

- [ ] **Step 6.3: 커밋**

```bash
git add vite.config.js
git commit -m "feat(phase2-G): vite.config.js chunkFileNames 정리"
```

---

## Task 7: 통합 검증 + Playwright 전체 스모크

- [ ] **Step 7.1: 단위 + 통합 테스트**

```bash
npm run test:unit                        # 188 passed
npx vitest run tests/integration/        # vite-build + entry-bundle 모두 PASS
npm run check:regulation
npm run check:paytable
```

- [ ] **Step 7.2: Playwright 전체 9 화면 + onclick + AppLock**

```bash
npm run build
npm run preview &
sleep 3
```

Playwright MCP — **모든 9 HTML × 모든 inline onclick × CLAUDE.md 체크리스트**:

- [ ] index.html 9 탭 + 모든 onclick
- [ ] regulation.html 본문 + 6 onclick
- [ ] retirement.html 시뮬레이션
- [ ] dashboard.html
- [ ] onboarding.html 1 onclick (시작 버튼)
- [ ] terms / privacy / tutorial / schedule_suite
- [ ] AppLock PIN setup → reload → unlock round-trip
- [ ] 콘솔 에러 0건 (9개 모두)

- [ ] **Step 7.3: 빌드 결과 비교**

| 측정 | Phase 2-A baseline | Phase 2-G 후 |
|------|---------------------|---------------|
| dist/ 총 크기 | (기록값) | (기록값) |
| dist/assets/ 파일 수 | (기록값) | (기록값) |
| index.html script 태그 수 | 35 | 3 (GA + sentry + entry) |

기대: 총 크기 30%↓ (tree-shaking + minify), script 태그 90%↓.

- [ ] **Step 7.4: 커밋 (검증 메모)**

```bash
git commit --allow-empty -m "test(phase2-G): Layer 5 ESM entry 검증

- 188 unit + entry-bundle 통합 테스트 PASS
- 9 HTML 모두 type=module 단일 entry
- 150 inline onclick 100% 동작
- AppLock round-trip 회귀 0
- 빌드 크기 (Phase 2-A 대비 비교 기록)"
```

---

## Task 8: PR + 머지

- [ ] **Step 8.1: PR**

```bash
git push -u origin feat/phase2-G-layer5
gh pr create --title "Phase 2-G: Layer 5 Entry — 9 HTML 단일 ESM entry" --body "$(cat <<'EOF'
## Summary
- app.js / regulation.js / retirement.js / dashboard.js / schedule_suite.js → ESM entry
- 9 HTML 의 47개 script 태그 → 1개 type=module
- type=module 자동 defer (parser-blocking 0)
- Vite 자동 chunk 분할 + tree-shaking 적용

## Test plan
- [x] 188 unit + 통합 테스트 PASS
- [x] 9 HTML × 모든 onclick × 핵심 체크리스트 콘솔 에러 0
- [x] AppLock round-trip 회귀 0
- [x] 빌드 크기 측정 (gzip + tree-shaking 효과)
- [ ] Vercel preview 배포 검증 (실제 사용자 환경)
- [ ] First Contentful Paint < 1.5s (mobile)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 8.2: Vercel preview 검증**

PR Vercel preview URL → 9 화면 + onclick + AppLock + FCP 측정.

- [ ] **Step 8.3: 머지**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull
git worktree remove ../bhm_overtime-phase2-G
```

---

## Self-Review Checklist

- [ ] 5 entry 모듈: 모든 Layer 0~4 import + 기존 본문 보존
- [ ] 9 HTML: 단일 type="module" entry (47 script → 9개 entry)
- [ ] 150 inline onclick 100% 동작
- [ ] AppLock 자동 트리거 동작
- [ ] loadDataFromAPI 부트스트랩 동작
- [ ] 188 unit tests passed + entry-bundle 통합 테스트 PASS
- [ ] 9 HTML 콘솔 에러 0
- [ ] FCP 측정 (개선 효과)

---

## 다음 단계

Phase 2-H: Cleanup (자체 build.mjs 제거 + 회귀 검증 + 문서화). Phase 2 마지막.
