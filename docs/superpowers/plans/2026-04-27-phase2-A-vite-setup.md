# Phase 2-A: Vite 도입 + multi-page 빌드

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vite 5+ 도입 → 9개 HTML multi-page 빌드 + ESM 그래프 추적 기반. 자체 `scripts/build.mjs` 는 Phase 2-H 까지 병행 보존 (롤백 안전망).

**Architecture:** 이번 단계에서는 모든 .js 가 아직 IIFE/window 전역. Vite 의 `build.rollupOptions.input` multi-page 모드로 9개 HTML 만 빌드 진입점 등록. ESM 변환은 Layer 0~5 에서 점진. Vite output → `dist/` (기존 output 동일).

**Tech Stack:** Vite 5.x (devDependency), Node 18+, Vercel deploy 호환 (`buildCommand: "npm run build"` 유지).

**SPEC:** `docs/superpowers/specs/2026-04-27-phase2-modularization-spec.md` §3.D1, §6 (vercel/sw.js 위험), §8 Phase 2-A

---

## File Structure

```
vite.config.js              ← 신규 (multi-page input + public/)
package.json                ← scripts.build 변경 (vite build), vite devDep 추가
public/                     ← 신규 — Vite static asset (sw.js, manifest, robots.txt)
  sw.js                     ← root 의 sw.js 이동
  manifest.json             ← root 의 manifest.json 이동
  robots.txt
  sitemap.xml
  icons/                    ← 통째 이동
  data/                     ← 통째 이동
  tabs/                     ← 통째 이동
  .well-known/              ← (있다면) 이동
scripts/build.mjs           ← 유지 (Phase 2-H 까지 백업/롤백용 — npm run build:legacy)
vercel.json                 ← outputDirectory: "dist" 유지 (변경 0)
tests/integration/vite-build.test.js  ← 신규 — 빌드 결과 검증
```

> **중요**: Vite 는 `public/` 안 파일을 hash 미적용 + root 경로로 그대로 복사. sw.js scope 보존(/sw.js), manifest 경로 보존, JS 동적 fetch (`/data/*.json`) 보존을 위함.

---

## Task 0: Vite 도입 사전 검증 (worktree 생성)

**Files:** none (workspace 만)

- [ ] **Step 0.1: 작업 worktree 생성**

```bash
git worktree add -b feat/phase2-A-vite ../bhm_overtime-phase2-A
cd ../bhm_overtime-phase2-A
git status   # clean expected
```

- [ ] **Step 0.2: 현재 빌드 baseline 기록**

```bash
node scripts/build.mjs
ls dist/ | wc -l               # 파일 개수 기록
ls dist/assets/ | wc -l        # hash 자산 개수 기록
du -sh dist/                   # 총 크기 기록
```

각 값을 메모 (Phase 2-A 완료 시 Vite 빌드 결과와 비교).

---

## Task 1: Vite 설치 + 최소 config

**Files:**
- Modify: `package.json` (devDependencies + scripts)
- Create: `vite.config.js`
- Create: `tests/integration/vite-build.test.js`

- [ ] **Step 1.1: 실패 통합 테스트 작성**

```bash
mkdir -p tests/integration
```

Create `tests/integration/vite-build.test.js`:

```js
// Vite 빌드 결과 검증 — Phase 2-A 진입 기준 충족 여부
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const ROOT = join(__dirname, '../..');
const DIST = join(ROOT, 'dist');

describe('Vite build (Phase 2-A)', () => {
  beforeAll(() => {
    const r = spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) throw new Error('vite build failed');
  }, 120_000);

  it('dist/ 가 생성됐다', () => {
    expect(existsSync(DIST)).toBe(true);
  });

  const HTMLS = [
    'index.html', 'onboarding.html', 'dashboard.html', 'tutorial.html',
    'terms.html', 'privacy.html', 'schedule_suite.html',
    'regulation.html', 'retirement.html'
  ];
  it.each(HTMLS)('%s 가 dist 에 있다', (html) => {
    expect(existsSync(join(DIST, html))).toBe(true);
  });

  it('sw.js 는 hash 없이 root 에 있다 (scope 보존)', () => {
    expect(existsSync(join(DIST, 'sw.js'))).toBe(true);
    expect(readdirSync(DIST).find(f => /^sw-[a-f0-9]+\.js$/.test(f))).toBeUndefined();
  });

  it('data/*.json 은 hash 없이 보존 (JS fetch)', () => {
    expect(existsSync(join(DIST, 'data'))).toBe(true);
  });

  it('manifest.json 은 root 에 있다 (PWA)', () => {
    expect(existsSync(join(DIST, 'manifest.json'))).toBe(true);
  });

  it('index.html 안 script 는 hash 처리됐다', () => {
    const html = readFileSync(join(DIST, 'index.html'), 'utf8');
    expect(html).toMatch(/(src|href)=["']\/?assets\/[a-zA-Z0-9_.-]+-[a-f0-9]{8,}\.(js|css)["']/);
  });
});
```

- [ ] **Step 1.2: 테스트 실패 확인**

```bash
npx vitest run tests/integration/vite-build.test.js
```

Expected: FAIL — `npm run build` 가 아직 vite 가 아님 (또는 vite 미설치).

- [ ] **Step 1.3: Vite 설치**

```bash
npm install -D vite@^5
```

`package.json` devDependencies 에 `"vite": "^5.x"` 추가됐는지 확인.

- [ ] **Step 1.4: `vite.config.js` 작성**

```js
// vite.config.js — Phase 2-A multi-page 빌드
// 9개 HTML 을 각각 entry 로 등록 → import 그래프 추적 → hash 부여
//
// 주의: 이 시점엔 .js 는 아직 IIFE. <script src="X.js"> 는 Vite 가 자동
// 처리 (rollup 이 ESM 아니어도 hash + 복사 함). HTML 내 inline onclick
// 은 그대로 보존 (Vite 가 건드리지 않음).
//
// public/ 안 파일은 hash 없이 root 복사 (sw.js, manifest, data/, tabs/, icons/).
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const ROOT = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: ROOT,
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        index: resolve(ROOT, 'index.html'),
        onboarding: resolve(ROOT, 'onboarding.html'),
        dashboard: resolve(ROOT, 'dashboard.html'),
        tutorial: resolve(ROOT, 'tutorial.html'),
        terms: resolve(ROOT, 'terms.html'),
        privacy: resolve(ROOT, 'privacy.html'),
        schedule_suite: resolve(ROOT, 'schedule_suite.html'),
        regulation: resolve(ROOT, 'regulation.html'),
        retirement: resolve(ROOT, 'retirement.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      }
    },
    minify: 'esbuild',
    sourcemap: false,
  },
  server: { port: 5173, host: true },
});
```

- [ ] **Step 1.5: `package.json` scripts 변경**

```json
{
  "scripts": {
    "build": "vite build",
    "build:legacy": "node scripts/build.mjs",
    "dev": "vite",
    "preview": "vite preview",
    "test": "npm run test:unit && npm run test:smoke",
    "test:unit": "vitest run",
    "test:unit:watch": "vitest",
    "test:smoke": "playwright test",
    "check:regulation": "node scripts/check-regulation-link.js",
    "check:paytable": "node scripts/check-paytable.js"
  }
}
```

- [ ] **Step 1.6: `public/` 디렉토리 구성**

```bash
mkdir -p public
git mv sw.js public/sw.js
git mv manifest.json public/manifest.json
git mv robots.txt public/robots.txt 2>/dev/null || true
git mv sitemap.xml public/sitemap.xml 2>/dev/null || true
git mv icons public/icons 2>/dev/null || mv icons public/icons
git mv data public/data 2>/dev/null || mv data public/data
git mv tabs public/tabs 2>/dev/null || mv tabs public/tabs
git mv .well-known public/.well-known 2>/dev/null || true
ls public/
```

확인: `public/sw.js`, `public/manifest.json`, `public/data/`, `public/tabs/`, `public/icons/` 가 모두 존재.

- [ ] **Step 1.7: 서브앱 처리 — public/ 이동**

`scripts/build.mjs` 의 COPY_DIRS 가 처리하던 디렉토리들을 `public/` 로 이동:

```bash
for d in nurse_admin admin content ops shorts-studio chrome-extension; do
  if [ -d "$d" ]; then git mv "$d" "public/$d" 2>/dev/null || mv "$d" "public/$d"; fi
done
ls public/
```

- [ ] **Step 1.8: 빌드 실행 + 통합 테스트 통과**

```bash
npm run build
```

Expected: `vite v5.x building for production...` → dist/ 생성.

```bash
npx vitest run tests/integration/vite-build.test.js
```

Expected: PASS — 9개 HTML 모두 dist 에 존재 + sw.js root + assets/[hash] 적용.

- [ ] **Step 1.9: 커밋**

```bash
git add vite.config.js package.json package-lock.json public/ tests/integration/
git status
git commit -m "feat(phase2-A): Vite 도입 + multi-page 빌드 + public/ 정리

- vite.config.js: 9개 HTML entry, hash 컨벤션 [name]-[hash].js 유지
- public/: sw.js / manifest / data / tabs / icons / 서브앱 이동 (hash 0)
- scripts.build: vite build 로 변경, build:legacy 백업 보존
- tests/integration/vite-build.test.js: 9개 HTML + sw.js root + hash 검증"
```

---

## Task 2: 호환성 검증 — 로컬 dev/build/preview

**Files:** 검증만 (코드 변경 0)

- [ ] **Step 2.1: dev 서버 실행 + 콘솔 에러 0 확인**

```bash
npm run dev &
DEV_PID=$!
sleep 3
```

Playwright MCP 로 `http://localhost:5173` 접속:

```
mcp__plugin_playwright_playwright__browser_navigate(url="http://localhost:5173")
mcp__plugin_playwright_playwright__browser_console_messages()
```

Expected: 콘솔 에러 0건. 홈 탭 로드.

```bash
kill $DEV_PID
```

- [ ] **Step 2.2: build + preview 검증**

```bash
npm run build
npm run preview &
PREVIEW_PID=$!
sleep 3
```

Playwright MCP 로 `http://localhost:4173` 접속, 6개 핵심 탭 + 콘솔 에러 0 확인:
- 홈, 휴가, 시간외, 급여, 규정, 개인정보 (CLAUDE.md 의 필수 체크리스트)

```bash
kill $PREVIEW_PID
```

- [ ] **Step 2.3: sw.js 경로 검증**

```bash
npm run preview &
PREVIEW_PID=$!
sleep 3
curl -sI http://localhost:4173/sw.js | head -5
# Expected: HTTP/1.1 200 OK
kill $PREVIEW_PID
```

- [ ] **Step 2.4: 모든 9개 HTML 200 검증**

```bash
npm run preview &
PREVIEW_PID=$!
sleep 3
for h in index.html onboarding.html dashboard.html tutorial.html terms.html privacy.html schedule_suite.html regulation.html retirement.html; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:4173/$h")
  echo "$h: $code"
done
kill $PREVIEW_PID
```

Expected: 9개 모두 `200`.

- [ ] **Step 2.5: 단위 테스트 회귀 0 확인**

```bash
npm run test:unit
```

Expected: 153 passed (변경 0 — 기존 require() 그대로 동작해야 함).

- [ ] **Step 2.6: regulation/paytable audit 통과**

```bash
npm run check:regulation
npm run check:paytable
```

Expected: 둘 다 0 issue.

- [ ] **Step 2.7: 커밋 (검증 메모)**

```bash
git commit --allow-empty -m "test(phase2-A): Vite dev/build/preview 호환성 검증

- dev: localhost:5173 콘솔 에러 0
- build: dist/ 9개 HTML + sw.js root + hash 자산
- preview: localhost:4173 6개 핵심 탭 동작
- 153 단위 테스트 + audit 회귀 0"
```

---

## Task 3: Vercel 배포 검증 (preview 배포)

**Files:**
- Modify (검토): `vercel.json` (변경 0 검증)

- [ ] **Step 3.1: vercel.json 호환 확인**

```bash
cat vercel.json
```

Expected:
- `buildCommand: "npm run build"` ✅ (Vite 가 받음)
- `outputDirectory: "dist"` ✅ (Vite outDir 동일)
- headers: `/assets/(.*)` immutable ✅ (Vite hash 컨벤션과 일치)
- `/sw.js` Service-Worker-Allowed: / ✅

변경 불필요 — `vercel.json` 그대로 둠.

- [ ] **Step 3.2: PR push + Vercel preview**

```bash
git push -u origin feat/phase2-A-vite
gh pr create --title "Phase 2-A: Vite 도입 + multi-page 빌드" --body "$(cat <<'EOF'
## Summary
- Vite 5 multi-page 빌드 (9개 HTML entry)
- public/ 정리 (sw.js / manifest / data / tabs / icons / 서브앱)
- scripts.build: vite build, build:legacy 백업 보존

## Test plan
- [x] npm run build → dist/ 9개 HTML
- [x] npm run dev / preview 콘솔 에러 0
- [x] sw.js root 경로 보존
- [x] 153 단위 테스트 회귀 0
- [ ] Vercel preview URL 6개 핵심 탭 + 콘솔 에러 0
- [ ] data/*.json fetch 정상

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3.3: Vercel preview 검증 (사용자 확인 — preview URL)**

Playwright MCP 로 Vercel preview URL 접속, 6개 핵심 탭 동작 + 콘솔 에러 0건 확인.

- [ ] **Step 3.4: main 머지**

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull
git worktree remove ../bhm_overtime-phase2-A
```

---

## Self-Review Checklist (Phase 2-A 종료 전)

- [ ] `npm run build` 성공 + dist/ 9개 HTML
- [ ] sw.js root 경로 보존 (hash 0)
- [ ] /assets/ hash 컨벤션 유지 (vercel.json immutable 헤더 호환)
- [ ] 153 단위 테스트 회귀 0
- [ ] check:regulation / check:paytable 0 issue
- [ ] dev / build / preview 6개 핵심 탭 동작
- [ ] Vercel preview 검증

---

## 산출물

- `vite.config.js` (multi-page + public/)
- `package.json` (vite devDep + scripts.build = vite build)
- `public/` (sw.js / manifest / data / tabs / icons / 서브앱)
- `tests/integration/vite-build.test.js`
- `scripts/build.mjs` 유지 (npm run build:legacy 백업)

---

## 다음 단계

Phase 2-B: Layer 0 Foundation (data / regulation-constants / shared-utils 를 ESM 으로). Vite 가 이미 ESM 그래프 처리 가능하므로, 이제 .js 를 import/export 로 변환하면 즉시 효과.
