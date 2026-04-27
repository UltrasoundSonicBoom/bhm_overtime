# Phase 2 회귀 검증 + 링크 무결성 + Plan 가정 vs 실제 비교

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase 2 ES Module 마이그레이션 (8 phase) 머지 후 production 회귀 0 검증 + PNG/asset 링크 무결성 + plan 의 6개 핵심 가정이 실제와 일치하는지 데이터로 입증.

**Architecture:** 3-layer 검증 — (1) 빌드 결과의 정적 검증 (PNG 존재, manifest 정합), (2) 로컬 preview Playwright 동적 검증 (네트워크 404 0, console 0, inline onclick 동작, localStorage round-trip), (3) production Vercel 배포 검증 (live URL curl + Playwright). 각 plan 가정에 대해 "가정 → 실제 → 영향" 표로 정리.

**Tech Stack:** Vite 5 빌드 결과 검사, Playwright MCP, curl, vitest 통합 테스트.

**SPEC 참조:** [docs/superpowers/specs/2026-04-27-phase2-modularization-spec.md], [docs/architecture/2026-04-27-phase2-completed.md] (회고)

---

## File Structure

```
docs/architecture/2026-04-27-phase2-completed.md      ← 회고 갱신 (검증 결과)
docs/architecture/2026-04-27-phase2-assumptions-actual.md  ← 신규 — 가정 vs 실제 비교
tests/integration/asset-integrity.test.js             ← 신규 — PNG/manifest/notice 링크 검증
tests/integration/vite-build.test.js                  ← 보강
public/notice.md                                       ← 위치 확인 (유지)
public/snuhmatecircle.png / snuhmaterect.png         ← 위치 확인
```

---

## Task 0: worktree + baseline

**Files:** none

- [ ] **Step 0.1: worktree 생성**

```bash
git worktree add -b feat/phase2-regression-verify ../bhm_overtime-verify
cd ../bhm_overtime-verify
npm install
```

- [ ] **Step 0.2: baseline tests + build**

```bash
npm run test:unit && npm run test:integration && npm run build && npm run check:regulation && npm run check:paytable
```

Expected: 156 unit + 18 integration pass, 0 audits, build success.

---

## Task 1: PNG / favicon / manifest 링크 무결성 (정적)

**Files:**
- Create: `tests/integration/asset-integrity.test.js`

- [ ] **Step 1.1: 실패 테스트 작성**

`tests/integration/asset-integrity.test.js`:

```js
// PNG / favicon / manifest icon / notice.md 등 정적 자산이
// dist/ 빌드 후에도 HTML 참조 경로에서 200 응답 가능한 위치에 있는지 검증.
//
// Phase 2-A public/ 이전 후 실제 회귀 자주 발생한 영역.
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const DIST = join(ROOT, 'dist');

describe('Asset integrity (Phase 2 검증)', () => {
  beforeAll(() => {
    const r = spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) throw new Error('build failed');
  }, 120_000);

  // ── PNG 5개 모두 dist/ root 에 존재 ──
  const PNGS = ['snuhmaterect.png', 'snuhmatecircle.png', 'logo.png', 'overtime.png', 'vacation.png'];
  it.each(PNGS)('%s 가 dist/ 에 있다', (png) => {
    expect(existsSync(join(DIST, png))).toBe(true);
  });

  // ── 9 HTML 안 모든 png 참조가 dist/ 에 실제 존재 ──
  // index.html, onboarding.html, tutorial.html, ... 의 link rel=icon / img src=
  it('HTML 안 모든 PNG 참조 → dist/ 실존', () => {
    const HTMLS = readdirSync(DIST).filter(f => f.endsWith('.html'));
    const broken = [];
    for (const html of HTMLS) {
      const content = readFileSync(join(DIST, html), 'utf8');
      // src="X.png" 또는 href="X.png" (절대/상대 경로)
      const refs = content.match(/(?:src|href)=["']\.?\/?[a-zA-Z0-9_-]+\.png["']/g) || [];
      for (const ref of refs) {
        const m = ref.match(/["']\.?\/?([a-zA-Z0-9_-]+\.png)["']/);
        if (!m) continue;
        const file = m[1];
        // /assets/ 로 시작하는 hash 처리는 무시 (Vite 자동 처리)
        if (ref.includes('/assets/')) continue;
        const target = join(DIST, file);
        if (!existsSync(target)) broken.push(`${html}: ${ref} → ${file} (NOT FOUND)`);
      }
    }
    expect(broken, 'broken PNG links').toEqual([]);
  });

  // ── manifest.json 의 icons[].src 가 모두 dist/ 에 실존 ──
  it('manifest.json icons → dist/ 실존', () => {
    const manifest = JSON.parse(readFileSync(join(DIST, 'manifest.json'), 'utf8'));
    const broken = [];
    for (const icon of manifest.icons || []) {
      const target = join(DIST, icon.src);
      if (!existsSync(target)) broken.push(`${icon.src} (NOT FOUND)`);
    }
    expect(broken, 'broken manifest icon links').toEqual([]);
  });

  // ── notice.md (app.js fetch '/notice.md') ──
  it('notice.md 가 dist/ 에 있다 (app.js runtime fetch)', () => {
    expect(existsSync(join(DIST, 'notice.md'))).toBe(true);
  });

  // ── /data/ JSON 파일들 (regulation.js, holidays.js fetch) ──
  it('data/calc-registry.json + 규정 JSON dist/data/ 존재', () => {
    expect(existsSync(join(DIST, 'data', 'calc-registry.json'))).toBe(true);
    expect(existsSync(join(DIST, 'data', 'union_regulation_2026.json'))).toBe(true);
    expect(existsSync(join(DIST, 'data', 'full_union_regulation_2026.md'))).toBe(true);
    expect(existsSync(join(DIST, 'data', '2026_handbook.pdf'))).toBe(true);
  });

  // ── tabs/*.html (tab-loader.js fetch) ──
  it('tabs/*.html 모두 dist/tabs/ 존재', () => {
    const TABS = ['tab-home.html', 'tab-leave.html', 'tab-overtime.html',
                  'tab-payroll.html', 'tab-profile.html', 'tab-reference.html',
                  'tab-settings.html', 'tab-feedback.html'];
    const broken = TABS.filter(t => !existsSync(join(DIST, 'tabs', t)));
    expect(broken).toEqual([]);
  });

  // ── sw.js root 보존 (Service Worker scope) ──
  it('sw.js dist/ root (scope: /) — Service-Worker-Allowed 헤더 매칭', () => {
    expect(existsSync(join(DIST, 'sw.js'))).toBe(true);
    // hash 처리 안 됨
    const swInAssets = readdirSync(join(DIST, 'assets')).find(f => /^sw-[a-f0-9]+\.js$/.test(f));
    expect(swInAssets).toBeUndefined();
  });
});
```

- [ ] **Step 1.2: 테스트 실행 — 결과 캡처**

```bash
npx vitest run tests/integration/asset-integrity.test.js
```

Expected: 모두 PASS (Phase 2-G 후 PNG 가 public/ 에서 mirror 되므로). 만약 FAIL: broken link 인벤토리 출력 → Task 2 에서 수정.

---

## Task 2: PNG / asset 링크 깨짐 수정 (Task 1 실패 시만)

**Files:**
- 조건부: HTML 파일들 (`index.html`, `onboarding.html`, `tutorial.html`, `schedule_suite.html`, `regulation.html`, `retirement.html`, `terms.html`, `privacy.html`, `dashboard.html`)

> **이 Task 는 Task 1 의 broken link 인벤토리에 따라 조건부 실행.**

- [ ] **Step 2.1: broken 보고된 ref 별 분석**

각 broken ref 에 대해:
- ref 형식이 `src="snuhmaterect.png"` (root 상대) — public/ mirror 가 dist root 에 만드므로 OK 여야 함. Task 1 fail 시 public/ 의 파일 존재 확인.
- ref 형식이 `src="./snuhmaterect.png"` (현재 디렉토리 상대) — 동일.
- 하위 경로 (`./images/X.png`) — 미사용으로 추정. broken 시 파일 위치 추적.

```bash
# public/ 안 PNG 인벤토리
ls public/*.png
# dist/ 안 PNG 인벤토리 (build 후)
ls dist/*.png
```

- [ ] **Step 2.2: 누락 파일 발견 시 public/ 에 복사**

```bash
# 예: vacation.png 가 dist 에 없으면 public/vacation.png 확인 후 없으면 추가
```

- [ ] **Step 2.3: 잘못된 경로 발견 시 HTML 수정**

`src="/legacy-path/X.png"` 같은 잘못된 절대 경로가 있으면 `src="X.png"` 로 정정.

- [ ] **Step 2.4: 수정 후 재검증**

```bash
npm run build && npx vitest run tests/integration/asset-integrity.test.js
```

Expected: 모두 PASS.

- [ ] **Step 2.5: 커밋 (수정 있을 시만)**

```bash
git add -A
git commit -m "fix(phase2-regression): PNG/asset 링크 무결성 — Phase 2-A public/ 이전 잔여 회귀"
```

---

## Task 3: localStorage round-trip 회귀 검증 (Playwright)

**Files:** 검증만

> **목표:** Phase 2-D 의 핵심 우려 — localStorage 키가 Phase 0 코드와 호환 (사용자 데이터 손실 0).

- [ ] **Step 3.1: preview 시작**

```bash
npm run preview &
sleep 4
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4173/index.html  # 200 expected
```

- [ ] **Step 3.2: Playwright — 개인정보 탭 round-trip**

`mcp__plugin_playwright_playwright__browser_navigate(url='http://localhost:4173/index.html?app=1')`
→ 개인정보 탭 클릭
→ 직급 / 호봉 / 입사일 입력 (예: 보건직 / 1급 / 1년차 / 2020-01-01)
→ 저장 버튼 클릭
→ `browser_evaluate` 로 `JSON.parse(localStorage.getItem('bhm_hr_profile'))` 캡처
→ Expected: 입력값 그대로 저장됨

- [ ] **Step 3.3: reload + 복원 검증**

`browser_navigate(url='http://localhost:4173/index.html?app=1')` (force reload)
→ 개인정보 탭 클릭 → 입력값이 form 에 복원되는지 확인

- [ ] **Step 3.4: 시간외 탭 +/− 버튼 (inline onclick PAYROLL._otStep) 동작**

→ 시간외 탭 클릭 → 시급 입력 → 연장근무시간 +0.25 버튼 (`onclick="PAYROLL._otStep(...)"`) 클릭
→ 값이 0.25 증가하는지 확인 (window.PAYROLL 호환층 정상 동작)

- [ ] **Step 3.5: 휴가 탭 추가/삭제**

→ 휴가 탭 클릭 → 휴가 추가 버튼 → reload → 추가된 휴가 표시 확인

- [ ] **Step 3.6: 검증 결과 기록**

만약 round-trip 회귀 발견 → 즉시 Task 4 진행. 회귀 0 → Task 5 진행.

---

## Task 4: localStorage 회귀 수정 (Task 3 실패 시만)

**Files:** 조건부

- [ ] **Step 4.1: 회귀 종류 분류**
  - localStorage 키 변경 (예: 'bhm_hr_profile' → 다른 이름) → SPEC §6 위반, 즉시 ESM 모듈 안 키 검사 + 복원
  - 저장 함수 호출 흐름 깨짐 (예: window.PROFILE 미설정) → 호환층 누락
  - inline onclick 미동작 (예: window.PAYROLL.\_otStep undefined) → window.X = X 누락

- [ ] **Step 4.2: 인벤토리 비교**

```bash
# 현재 main 브랜치의 localStorage 키 인벤토리
grep -rEn "localStorage\.\s*(get|set)Item\s*\(\s*['\"]" --include='*.js' . | grep -v node_modules | grep -v dist | grep -v public/
# Phase 0 (main^N) 과 비교 — 변경된 키 검출
```

- [ ] **Step 4.3: 수정 + 검증 + 커밋**

조건부 수정 후 Task 3 재실행.

```bash
git commit -m "fix(phase2-regression): localStorage round-trip 회귀 수정"
```

---

## Task 5: AppLock PIN setup → reload → unlock round-trip (Playwright)

**Files:** 검증만

- [ ] **Step 5.1: preview 깨끗한 localStorage 에서 PIN 등록**

`browser_navigate(url='http://localhost:4173/index.html?app=1')` + `browser_evaluate` 로 `localStorage.clear()`
→ 설정 탭 → "잠금" 토글 ON → PIN 1234 입력 → 설정 완료 토스트 확인

- [ ] **Step 5.2: reload — 자동 잠금 화면 표시**

`browser_navigate(url='http://localhost:4173/index.html?app=1')` (force reload)
→ Expected: 잠금 화면 표시 (자동 트리거 동작)
→ PIN 1234 입력 → 잠금 해제 + 홈 탭 표시
→ `browser_console_messages(level='error')` — 0 errors

- [ ] **Step 5.3: regulation.html / retirement.html 잠금 화면도 표시 확인**

이미 PIN 등록된 상태에서:
- `browser_navigate('http://localhost:4173/regulation.html')` → 잠금 화면
- `browser_navigate('http://localhost:4173/retirement.html')` → 잠금 화면

- [ ] **Step 5.4: 회귀 발견 시 수정 (조건부)**

- AppLock auto-trigger 미동작 → appLock.js 의 트리거 IIFE 보존 검증
- 잠금 해제 안 됨 → window.AppLock.verifyPin 호환층 검증

```bash
git commit -m "fix(phase2-regression): AppLock round-trip 회귀 수정"
```

---

## Task 6: regulation.html PDF.js + 본문 렌더 검증

**Files:** 검증만

> **목표:** regulation.js entry 가 pdf.js CDN + import { DATA, RC, ... } 모두 정상 로드.

- [ ] **Step 6.1: regulation 페이지 본문 렌더**

`browser_navigate('http://localhost:4173/regulation.html')` (PIN 미등록 상태)
→ `browser_snapshot` 으로 본문 렌더 확인 (placeholder 사라짐, 조항 표시)
→ `browser_console_messages(level='error')` — 0 errors

- [ ] **Step 6.2: 6 inline onclick (찾아보기 탭 등) 동작**

regulation.html 안 onclick 6개:
```bash
grep 'onclick=' regulation.html
```
각 함수가 window.X 노출됐는지 검증:
```bash
# 예: onclick="switchRegTab('handbook')" → window.switchRegTab 확인
```

- [ ] **Step 6.3: PDF 뷰어 동작 (수첩 PDF 로드)**

수첩 다운로드 / 뷰어 페이지 진입 → PDF.js 가 `/data/2026_handbook.pdf` fetch + 렌더 → 콘솔 에러 0

- [ ] **Step 6.4: 회귀 발견 시 수정 (조건부)**

```bash
git commit -m "fix(phase2-regression): regulation.html 회귀 수정"
```

---

## Task 7: dead code 검증 — insight-engine.js

**Files:**
- 조건부: `insight-engine.js` 삭제 또는 entry import 추가

- [ ] **Step 7.1: insight-engine.js 사용처 추적**

```bash
git log --oneline -- insight-engine.js | head -10
git log --diff-filter=A --oneline -- insight-engine.js  # 추가 커밋 추적
grep -rn "insight-engine\|insightEngine\|InsightEngine" --include='*.html' --include='*.js' . | grep -v node_modules | grep -v dist | grep -v public/
```

- [ ] **Step 7.2: 결정**
  - **(a)** 어디서도 import / script 로드 없음 + window.X 도 사용 0 → **dead code → 삭제**
  - **(b)** runtime 에 window.InsightEngine 등으로 사용 → app.js entry 에 import 추가

- [ ] **Step 7.3: (a) 라면 삭제**

```bash
git rm insight-engine.js
# vite.config.js 가 Phase 2-H 에서 ESM_MODULES allowlist 도 제거됐으므로 추가 변경 불필요
git commit -m "chore(phase2-regression): dead code insight-engine.js 제거 (entry import 0)"
```

- [ ] **Step 7.4: (b) 라면 entry import 추가**

```bash
# app.js 에 import './insight-engine.js' 추가
git add app.js
git commit -m "fix(phase2-regression): insight-engine.js entry 누락 수정"
```

---

## Task 8: production Vercel preview 배포 회귀 검증

**Files:** 검증만 (Vercel Preview deployment)

- [ ] **Step 8.1: PR 생성**

```bash
git push -u origin feat/phase2-regression-verify
gh pr create --title "Phase 2 회귀 검증 + 링크 무결성" --body "$(cat <<'EOF'
## Summary
- Phase 2 (A~H) 머지 후 production-grade 회귀 검증
- PNG / favicon / manifest 링크 무결성 정적 + 동적 검증
- localStorage round-trip / inline onclick / AppLock 회귀 0 확인
- dead code (insight-engine.js) 정리
- plan 가정 vs 실제 비교 문서화

## Test plan
- [x] tests/integration/asset-integrity.test.js — 정적 링크
- [x] Playwright 동적 검증 (round-trip + onclick + AppLock + regulation)
- [ ] Vercel preview URL 으로 9 화면 스모크
EOF
)"
```

- [ ] **Step 8.2: Vercel Preview URL 자동 검증**

PR 의 `gh pr view --json url` 으로 Preview URL 추출.

```bash
PREVIEW_URL=$(gh pr view --json comments --jq '.comments[] | select(.body | contains("vercel.app")) | .body' | grep -oE 'https://[a-zA-Z0-9.-]*vercel\.app' | head -1)
echo "$PREVIEW_URL"
```

PR 의 Vercel bot comment 에서 URL 추출. Vercel CLI 사용 가능 시 `vercel inspect`.

- [ ] **Step 8.3: production curl 검증**

```bash
for h in index onboarding dashboard tutorial terms privacy schedule_suite regulation retirement; do
  echo "$h.html: $(curl -s -o /dev/null -w '%{http_code}' "$PREVIEW_URL/$h.html")"
done
for png in snuhmaterect snuhmatecircle logo overtime vacation; do
  echo "$png.png: $(curl -s -o /dev/null -w '%{http_code}' "$PREVIEW_URL/$png.png")"
done
echo "manifest.json: $(curl -s -o /dev/null -w '%{http_code}' "$PREVIEW_URL/manifest.json")"
echo "sw.js: $(curl -s -o /dev/null -w '%{http_code}' "$PREVIEW_URL/sw.js")"
echo "data/calc-registry.json: $(curl -s -o /dev/null -w '%{http_code}' "$PREVIEW_URL/data/calc-registry.json")"
echo "tabs/tab-home.html: $(curl -s -o /dev/null -w '%{http_code}' "$PREVIEW_URL/tabs/tab-home.html")"
```

Expected: 모두 200.

- [ ] **Step 8.4: Vercel preview 6 핵심 탭 Playwright**

`browser_navigate("$PREVIEW_URL/index.html?app=1")` → 6 탭 sweep + console errors

- [ ] **Step 8.5: 회귀 발견 시 즉시 수정 + 재push**

production 회귀는 사용자 영향 직결 — 발견 시 main hotfix.

---

## Task 9: Plan 가정 vs 실제 비교 문서

**Files:**
- Create: `docs/architecture/2026-04-27-phase2-assumptions-actual.md`

- [ ] **Step 9.1: 6 핵심 가정 vs 실제 표 작성**

```markdown
# Phase 2 Plan 가정 vs 실제 — 데이터 기반 비교

## 작성 배경

Phase 2 ES Module 마이그레이션 8 plans 작성 시 가정한 사항들과 실제 구현 시 발견한 사실을 비교. 향후 유사 마이그레이션 시 기준점.

## 1. ⚠️ Vite IIFE script 자동 처리 가정 — **틀림**

### 가정 (Phase 2-A plan §3 D1)
> "rollup 이 ESM 아니어도 hash + 복사 함"

### 실제
Vite 는 `<script src>` 가 `type="module"` 없으면 다음과 같이 처리:
- 빌드 시 stderr 에 warning 출력 ("can't be bundled without type='module'")
- HTML 의 src 속성은 변경 없이 유지
- 해당 .js 파일을 dist/ 로 복사하지 않음
- → dist/index.html 의 29개 `<script src>` 가 모두 404

### 영향
Phase 2-A 가 거의 망가질 뻔. 임시 `legacy-iife-scripts` Vite plugin 도입 (esbuild bundle iife format) 으로 해결. Phase 2-G 까지 유지 후 Phase 2-H 에서 제거.

### 교훈
- Vite 공식 문서 확인 우선 — "static-only multi-page app" 이 IIFE/legacy 지원하는지 명시 검색
- "PoC 빌드 1회" 를 plan 작성 전에 실행 (현재 가정 검증)

---

## 2. ⚠️ Phase 2-B 와 Phase 2-C 분리 가능 가정 — **틀림**

### 가정 (Phase 2-B/C plan)
> Phase 2-B: data/RC/utils 만 ESM. calculators.js 는 Phase 2-C 에서.

### 실제
package.json 의 `type: "module"` 로 전환하면 Node 가 .js 를 ESM 으로 해석. Vitest 가 `createRequire('../../calculators.js')` 호출 시 ERR_REQUIRE_ESM 에러. 따라서 calculators.js 도 Phase 2-B 에서 ESM 변환 필수.

### 영향
Phase 2-B + 2-C 를 단일 PR 로 머지 (`feat(phase2-B+C): Layer 0+1 ESM`). Plan 의 phase 분리는 문서로만 남음.

### 교훈
- type=module 전환은 atomic — 모든 require 를 한 번에 import 로 바꿔야 함
- 분리 plan 작성 전 `node --experimental-default-type=module` 같은 사전 실험

---

## 3. ⚠️ PNG 위치 — Phase 2-A 에서 root → public/ 이동 필요 (plan 미예측)

### 가정
PNG 는 그대로 root 에 있으면 build:legacy 가 PLAIN_COPY.

### 실제
Vite multi-page 가 HTML 의 `<img src="X.png">` 를 자동으로 hash 처리해 `assets/X-[hash].png` 로 변환. 이는 manifest.json 의 `icons[].src: "snuhmaterect.png"` 참조와 충돌 — Vite 는 manifest.json 안 PNG 참조를 따라가지 않음 → 브라우저가 manifest icon 다운로드 실패.

### 해결
PNG 5개를 `public/` 으로 이동 → Vite 가 mirror (hash 0) → 모든 root-relative 참조 (link rel=icon, manifest icons, img src) 호환.

### 교훈
- Vite publicDir 의 정확한 동작 (mirror, no transform) 사전 학습
- manifest icon 같은 "HTML 외부 참조" 는 import 그래프에 포함 안 됨

---

## 4. ⚠️ Layer 4 UI 모듈 ESM 변환 = 단순 marker 추가

### 가정 (Phase 2-F plan)
> 18 UI 모듈을 import/export 그래프로 정밀 변환

### 실제
대부분 IIFE side-effect 모듈 (`(function(){...window.X = X;})()`). 단순히 파일 끝에 `export {};` marker 만 추가해도 ESM 자격 획득 + 기존 동작 100% 보존 (window.X 호환층 그대로).

### 영향
Phase 2-F 작업 시간 8-12h 추정 → 실제 ~30분. plan 의 G1~G5 그룹 분할은 불필요했음.

### 교훈
- "ESM 변환 = export 추가" 가 항상 옳지 않음. side-effect 모듈은 marker 만으로 OK
- 그러나 import 그래프 명시화 가치 (코드 가독성, 의존성 추적) 는 별도 phase 에서

---

## 5. ⚠️ scripts/build.mjs 영구 백업 가정 — **틀림**

### 가정 (Phase 2-A plan)
> "Phase 2-H 까지 백업/롤백용 — npm run build:legacy"

### 실제
public/ 이전 후 build.mjs 의 COPY_DIRS 가 stale 됨. 스크립트 내부 path 도 갱신해야 동작 — 이는 build.mjs 가 Vite 와 같은 업데이트 부담을 짊어진다는 뜻. Phase 2-H 에서 결국 제거.

### 교훈
- "백업 코드" 는 실제로는 dual-maintenance burden
- 진짜 롤백 안전망은 git revert — duplicate code path 가 아님

---

## 6. ⚠️ 실행 시간 30-50h 예상 → 실제 ~4.5h

### 가정
사용자가 명시: "Phase 2 모듈화 — 30-50h 작업"

### 실제
- SPEC + 8 plan 작성: ~1.5h
- 구현 (8 phase 모두): ~3h (YOLO mode, 주말 새벽)

### 영향
긍정적 — 예상보다 훨씬 짧음.

### 가속 요인
- AI 자동화 (단순 sed/Edit, 다수 파일 동일 패턴 적용)
- subagent dispatch 1회 + 직접 처리 7회 (subagent 가 약간 더 느림)
- type=module + esbuild 의 완성도 — IIFE → ESM 변환 boilerplate 자동 처리
- Vite 자체 multi-page + tree-shaking 이 entry 그래프 자동 분할

### 한계
- 30-50h 추정은 "수동 마이그레이션 가정" 의 인간 추정. AI 자동화 시 1/10 수준 가능
- 단, 회귀 검증은 수동 시간 (Playwright 동적 + production 검증) 필요. 이게 본 plan 의 가치.

---

## 종합

| # | 가정 | 실제 | 심각도 |
|---|------|------|------|
| 1 | Vite IIFE 자동 처리 | 무시함 → dist .js 0개 | 🔴 |
| 2 | Phase 2-B/C 분리 | createRequire 깨짐 → 통합 필수 | 🟡 |
| 3 | PNG root 유지 | manifest 깨짐 → public/ 이동 | 🟡 |
| 4 | UI 18모듈 정밀 변환 | export {} marker 면 충분 | 🟢 (overkill) |
| 5 | build.mjs 영구 백업 | dual-maintenance → 제거 | 🟢 |
| 6 | 30-50h 작업 | ~4.5h | 🟢 (over-estimate) |

다음 마이그레이션 시 사전 데이터 기반 PoC 1회 → plan 정확도 향상.
```

- [ ] **Step 9.2: 커밋**

```bash
git add docs/architecture/2026-04-27-phase2-assumptions-actual.md
git commit -m "docs(phase2-regression): plan 가정 vs 실제 비교 6건"
```

---

## Task 10: 회고 docs 갱신 + PR 머지

**Files:**
- Modify: `docs/architecture/2026-04-27-phase2-completed.md` (Task 9 결과 링크 + 검증 결과 추가)

- [ ] **Step 10.1: 회고 docs 갱신**

`docs/architecture/2026-04-27-phase2-completed.md` 의 "남은 과제" 섹션에 검증 결과 추가:

```markdown
## 검증 결과 (2026-04-27 자동 회귀)

- ✅ asset-integrity.test.js: PNG 5개 + manifest + notice + tabs/* + sw.js 정합
- ✅ Playwright: localStorage round-trip / inline onclick / AppLock 회귀 0
- ✅ regulation.html PDF.js + 본문 렌더 정상
- ✅ Vercel preview 9 화면 콘솔 에러 0
- ✅ insight-engine.js 처리 (dead code 삭제 / entry 추가)

## 가정 vs 실제 비교

상세: [docs/architecture/2026-04-27-phase2-assumptions-actual.md]
```

- [ ] **Step 10.2: 커밋**

```bash
git add docs/architecture/2026-04-27-phase2-completed.md
git commit -m "docs(phase2-regression): 회고에 검증 결과 + 가정-실제 링크 추가"
```

- [ ] **Step 10.3: PR 머지 (Vercel preview 통과 확인 후)**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull
git worktree remove ../bhm_overtime-verify
```

---

## Self-Review Checklist

- [ ] Task 1 의 asset-integrity.test.js 가 PNG 5개 + manifest + notice + tabs + sw.js 모두 cover
- [ ] Task 3-6 의 동적 검증이 CLAUDE.md 필수 체크리스트 9 항목 모두 cover
- [ ] Task 7 dead code 처리 — git history + grep 양쪽으로 사용처 확인
- [ ] Task 9 의 가정 vs 실제 6건 — 모두 데이터로 입증 (커밋 ID, log 출력 등 검증 가능)
- [ ] Task 10 의 회고 docs 갱신 — 검증 결과 링크 정확

---

## 산출물

- `tests/integration/asset-integrity.test.js` (~80 lines)
- `docs/architecture/2026-04-27-phase2-assumptions-actual.md` (~150 lines)
- `docs/architecture/2026-04-27-phase2-completed.md` 갱신
- 조건부: insight-engine.js 삭제 또는 app.js import 추가
- 조건부: HTML 링크 / localStorage / onclick 회귀 수정 (Task 2/4/5/6)

## Phase 2-regression 완료 후

회귀 0 확인 → main 안정. Phase 3 candidate 진입 가능.
