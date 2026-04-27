# Phase 6 — TurboRepo + Astro + TypeScript Gradual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 9 entry HTML + 30+ ESM 모듈 → TurboRepo monorepo + Astro file-based routing + TypeScript gradual. SPA tab 구조 자연 통합 + onboarding `/` 통합 + URL 호환 보장.

**Architecture:** apps/web (Astro) + packages/calculators / profile / shared-utils / data / regulation-constants. 새 코드 100% TS, 기존 .js gradual (allowJs + checkJs). 6 SPA tab → Astro vanilla JS island.

**Tech Stack:** Astro v4 + TurboRepo + pnpm workspace + TypeScript 5 + Vitest + Playwright + ESLint v9.

**SPEC:** [docs/superpowers/specs/2026-04-27-phase6-astro-turbo-ts.md]

**Branch / Worktree:**
```bash
git worktree add ../bhm_overtime-phase6 -b feat/phase6-astro-turbo-ts
cd ../bhm_overtime-phase6
```

**전제 조건 검증:**
- Phase 5 완료: cross-module ESM strict + ESLint no-undef
- Plan 1 완료: design tokens neo :root
- Plan 2 완료: snuhmate_* lazy migration
- 모든 회귀 가드 GREEN (175 unit + 70 integration)

---

## Task 1: TurboRepo workspace 골격 + apps/web Astro 빈 껍데기

**Files:**
- Create: `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`
- Create: `apps/web/` (Astro init), `apps/web/astro.config.mjs`, `apps/web/tsconfig.json`
- Modify: root `package.json` (workspace 정의 + scripts)

- [ ] **Step 1.1: pnpm + Astro 의존성 설치**

```bash
npm install -g pnpm
pnpm init   # root package.json (overwrite 가능)
pnpm add -wD turbo typescript @types/node
pnpm add -w --filter ./apps/web astro @astrojs/check
```

- [ ] **Step 1.2: pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 1.3: turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".astro/**"]
    },
    "dev": { "cache": false, "persistent": true },
    "test": { "dependsOn": ["^build"] },
    "lint": {}
  }
}
```

- [ ] **Step 1.4: apps/web 골격**

```bash
mkdir -p apps/web/src/{pages,layouts,components,client,styles}
mkdir -p apps/web/public
```

`apps/web/astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://snuhmate.com',
  output: 'static',
  build: { format: 'directory' },
});
```

`apps/web/tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "allowJs": true,
    "checkJs": false,
    "baseUrl": ".",
    "paths": {
      "@calculators/*": ["../../packages/calculators/src/*"],
      "@profile/*": ["../../packages/profile/src/*"],
      "@shared-utils/*": ["../../packages/shared-utils/src/*"],
      "@data/*": ["../../packages/data/src/*"]
    }
  }
}
```

- [ ] **Step 1.5: 빈 페이지 + dev 검증**

`apps/web/src/pages/index.astro`:
```astro
---
const title = 'SNUH Mate (Phase 6 골격)';
---
<!DOCTYPE html>
<html lang="ko">
<head><title>{title}</title></head>
<body><h1>Phase 6 골격 — Astro 빌드 검증</h1></body>
</html>
```

```bash
pnpm --filter ./apps/web dev   # http://localhost:4321 접속 확인
pnpm --filter ./apps/web build # apps/web/dist 생성 확인
```

- [ ] **Step 1.6: 커밋**

```bash
git add pnpm-workspace.yaml turbo.json tsconfig.base.json apps/ package.json pnpm-lock.yaml
git commit -m "feat(phase6-1): TurboRepo workspace + apps/web Astro 골격"
```

---

## Task 2: Layer 0/1 → packages/* (TS 신규)

**Files:**
- Create: `packages/{shared-utils,regulation-constants,data,calculators}/` (4개)
- Modify: 기존 root `*.js` 의 import path → `@<pkg>/*`

- [ ] **Step 2.1: packages/shared-utils**

```bash
mkdir -p packages/shared-utils/src
cd packages/shared-utils
pnpm init
```

`packages/shared-utils/package.json`:
```json
{
  "name": "@snuhmate/shared-utils",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

`packages/shared-utils/src/index.ts`: 기존 root `shared-utils.js` 컨텐츠 그대로 + TS 타입 추가:
```ts
export function escapeHtml(value: unknown): string { /* 기존 */ }
export function delegateActions(root: HTMLElement, handlers: Record<string, (el: HTMLElement, e?: Event) => void>): void { /* 기존 */ }
// ... 등 기존 export 모두
```

- [ ] **Step 2.2: packages/regulation-constants**

같은 패턴, 기존 `regulation-constants.js` 컨텐츠 + 타입.

- [ ] **Step 2.3: packages/data**

기존 `data.js` 의 `DATA_STATIC`, `DATA`, `loadDataFromAPI` → TS:
```ts
export interface JobType { /* ... */ }
export interface PayTable { /* ... */ }
export const DATA_STATIC: { jobTypes: Record<string, JobType>; payTables: Record<string, PayTable>; ... } = { /* 기존 */ };
export let DATA = DATA_STATIC;
export async function loadDataFromAPI(): Promise<void> { /* 기존 */ }
```

- [ ] **Step 2.4: packages/calculators**

기존 `calculators.js` (CALC) + `holidays.js` + `retirement-engine.js` → 3 .ts 파일:
```ts
import { DATA } from '@snuhmate/data';
export const CALC = { /* 기존 */ };
```

- [ ] **Step 2.5: apps/web 의 .js import path 갱신**

기존 `import { CALC } from './calculators.js'` → `import { CALC } from '@snuhmate/calculators'`

```bash
# bulk rename
cd apps/web/src/client
for f in *.js; do
  sed -i '' \
    -e "s|from './calculators.js'|from '@snuhmate/calculators'|g" \
    -e "s|from './data.js'|from '@snuhmate/data'|g" \
    -e "s|from './shared-utils.js'|from '@snuhmate/shared-utils'|g" \
    -e "s|from './regulation-constants.js'|from '@snuhmate/regulation-constants'|g" \
    -e "s|from './holidays.js'|from '@snuhmate/calculators'|g" \
    -e "s|from './retirement-engine.js'|from '@snuhmate/calculators'|g" \
    "$f"
done
```

- [ ] **Step 2.6: 회귀 검증 + 커밋**

```bash
pnpm test:unit       # 175 PASS
pnpm test:integration # 70 PASS
git add -A
git commit -m "feat(phase6-2): Layer 0/1 → packages/{shared-utils,data,calculators,regulation-constants} (TS)"
```

---

## Task 3: Layer 2 → packages/profile

**Files:**
- Create: `packages/profile/` (PROFILE + OVERTIME + LEAVE + PAYROLL + WorkHistory)

- [ ] **Step 3.1: packages/profile 골격**

```bash
mkdir -p packages/profile/src
```

`packages/profile/src/index.ts`:
```ts
export { PROFILE, PROFILE_FIELDS } from './profile';
export { WorkHistory } from './work-history';
export { OVERTIME } from './overtime';
export { LEAVE } from './leave';
export { PAYROLL } from './payroll';
```

각 모듈은 기존 .js 그대로 복사 후 점진 .ts 전환 (Step 3.5 에서).

- [ ] **Step 3.2: lazy migration 보존**

`profile.ts` 의 `STORAGE_KEY` getter, `_migrateFromLegacy` 함수 그대로 유지 (Plan 2 산출).

- [ ] **Step 3.3: apps/web import path 갱신**

```bash
sed -i '' \
  -e "s|from './profile.js'|from '@snuhmate/profile'|g" \
  -e "s|from './work-history.js'|from '@snuhmate/profile'|g" \
  -e "s|from './overtime.js'|from '@snuhmate/profile'|g" \
  -e "s|from './leave.js'|from '@snuhmate/profile'|g" \
  -e "s|from './payroll.js'|from '@snuhmate/profile'|g" \
  apps/web/src/client/*.js
```

- [ ] **Step 3.4: 회귀 검증**

```bash
pnpm test:unit
pnpm test:integration
```

- [ ] **Step 3.5: 점진 .ts 전환 (선택 — packages/profile/src/profile.ts)**

기존 `profile.js` → `profile.ts` (rename + 타입 추가). PROFILE 인터페이스 정의:
```ts
export interface ProfileData {
  name: string;
  employeeNumber: string;
  department: string;
  jobType: string;
  grade: string;
  year: number;
  hireDate: string;
  birthDate: string;
  // ... 기타 필드
}
```

- [ ] **Step 3.6: 커밋**

```bash
git commit -am "feat(phase6-3): Layer 2 → packages/profile + lazy migration 보존"
```

---

## Task 4: 9 HTML → .astro pages + onboarding 통합

**Files:**
- Create: `apps/web/src/pages/{index,app,regulation,retirement,dashboard,tutorial,terms,privacy}.astro`
- Create: `apps/web/src/layouts/BaseLayout.astro`
- Modify: `vercel.json` (rewrite + monorepo build)

- [ ] **Step 4.1: BaseLayout.astro 작성**

```astro
---
interface Props { title: string; description?: string; theme?: 'neo' | 'dark'; }
const { title, description = 'SNUH Mate', theme = 'neo' } = Astro.props;
---
<!DOCTYPE html>
<html lang="ko" data-theme={theme}>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content={description}>
  <title>{title}</title>
  <link rel="manifest" href="/manifest.json">
  <link rel="stylesheet" href="/styles/globals.css">
  <script>
    // dark 조건부 로드 (Plan 1 산출 그대로)
    (function(){try{var t=localStorage.getItem("theme");if(t==="dark"||t==="linear"){document.documentElement.setAttribute("data-theme","dark");var d=document.createElement("link");d.rel="stylesheet";d.href="/styles/dark.css";document.head.appendChild(d);if(t==="linear")localStorage.setItem("theme","dark")}}catch(e){}})();
  </script>
</head>
<body>
  <header id="sharedHeader"></header>
  <slot />
  <nav id="sharedFooter"></nav>
  <script src="/client/shared-layout.js" type="module"></script>
</body>
</html>
```

- [ ] **Step 4.2: src/pages/index.astro = onboarding**

기존 `onboarding.html` 의 컨텐츠 → `index.astro` 의 `<slot>` 안 inline.

- [ ] **Step 4.3: src/pages/app.astro = SPA 메인**

기존 `index.html` 의 컨텐츠 (탭 6개 + main) → `app.astro` (다음 task 에서 island 분할).

- [ ] **Step 4.4: 나머지 7 entry HTML → .astro**

regulation/retirement/dashboard/tutorial/terms/privacy/schedule_suite.

- [ ] **Step 4.5: vercel.json monorepo 설정**

```json
{
  "buildCommand": "pnpm --filter ./apps/web build",
  "outputDirectory": "apps/web/dist",
  "rewrites": [
    { "source": "/", "destination": "/", "has": [{"type": "query", "key": "app", "value": "1"}], "destination": "/app" }
  ],
  "headers": [ /* 기존 CSP 그대로 */ ]
}
```

URL 호환:
- `/?app=1` → `/app` (Vercel rewrite)
- `/index.html` → `/app` (rewrite)

- [ ] **Step 4.6: 회귀 + 커밋**

```bash
pnpm --filter ./apps/web build
pnpm test:unit
pnpm test:integration
git commit -am "feat(phase6-4): 9 HTML → .astro pages + onboarding / 통합 + vercel monorepo"
```

---

## Task 5: 6 SPA tab → vanilla JS island

**Files:**
- Create: `apps/web/src/components/tabs/{Home,Profile,Payroll,Overtime,Leave,Reference,Settings}Island.astro`
- Modify: `apps/web/src/pages/app.astro` (island 임베드)

- [ ] **Step 5.1: Island 패턴**

각 tab fragment 를 Astro `.astro` component 로 변환:

```astro
---
// HomeIsland.astro
---
<div class="tab-content" id="tab-home">
  <!-- public/tabs/tab-home.html 컨텐츠 inline -->
</div>
<script>
  import { initHomeTab } from '@/client/home-tab.js';
  // hydration: 페이지 로드 후 자동 init
  if (document.getElementById('tab-home')) initHomeTab();
</script>
```

- [ ] **Step 5.2: app.astro 에 island 모두 임베드**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import HomeIsland from '../components/tabs/HomeIsland.astro';
import ProfileIsland from '../components/tabs/ProfileIsland.astro';
// ... 6개
---
<BaseLayout title="SNUH 메이트">
  <main>
    <HomeIsland />
    <ProfileIsland />
    <PayrollIsland />
    <OvertimeIsland />
    <LeaveIsland />
    <ReferenceIsland />
    <SettingsIsland />
  </main>
</BaseLayout>
```

- [ ] **Step 5.3: tab-loader.js 폐기**

Astro 가 모든 tab fragment 를 빌드 시 inline → 동적 lazy load 불필요. `tab-loader.js` 삭제.

- [ ] **Step 5.4: 회귀 + Playwright 6 핵심 탭 검증**

```bash
pnpm --filter ./apps/web preview &
sleep 3
# Playwright MCP 6 탭 클릭 + 콘솔 에러 0 검증
```

- [ ] **Step 5.5: 커밋**

```bash
git commit -am "feat(phase6-5): 6 SPA tab → vanilla JS island + tab-loader 폐기"
```

---

## Task 6: Vercel monorepo 배포 + URL rewrite + 회귀 종합

- [ ] **Step 6.1: 종합 회귀**

```bash
pnpm test:unit       # 175 passed
pnpm test:integration # 70+ passed
pnpm lint            # 0 error
pnpm --filter ./apps/web build
```

- [ ] **Step 6.2: 로컬 preview 검증**

Playwright MCP:
- `/` (onboarding) 진입 → 콘솔 에러 0
- `/app` (SPA) 진입 → 6 탭 모두 동작
- `/regulation` / `/retirement` / 기타 → 정상

- [ ] **Step 6.3: Vercel preview 배포**

```bash
git push origin feat/phase6-astro-turbo-ts
# Vercel preview URL 확인 + 라이브 검증
```

- [ ] **Step 6.4: URL 호환 검증**

```bash
curl -sIL "https://<preview>.vercel.app/?app=1" | grep "location\|status"
# Expected: 301 → /app
curl -sIL "https://<preview>.vercel.app/index.html" | grep "location"
# Expected: 301 → /app
```

- [ ] **Step 6.5: main 머지 + Vercel production 배포**

```bash
git checkout main
git merge --ff-only feat/phase6-astro-turbo-ts
git push origin main
# Vercel auto-deploy production
```

- [ ] **Step 6.6: 라이브 검증 (snuhmate.com)**

Playwright MCP:
- 사용자 시나리오: 명세서 업로드 → info 탭 form 자동 채워짐 (Phase 5-followup 회귀 가드)
- 규정 탭 → 다른 탭 → 규정 → in-memory state 보존 (Phase 5-followup)
- 백업 v2.0 다운로드 / 복원 (Plan 2)
- localStorage 키 = `snuhmate_*` (Plan 2 lazy migration)

- [ ] **Step 6.7: 사용자 안내 alert (1개월)**

`apps/web/src/components/UrlChangeBanner.astro`:
```astro
<div class="banner">
  💡 URL 이 단순해졌습니다. 새 북마크: <code>snuhmate.com/app</code>
  <button onclick="dismissUrlBanner()">×</button>
</div>
```

`localStorage.snuhmate_url_banner_dismissed` 플래그로 1회만 표시.

---

## Self-Review

- [ ] TurboRepo + pnpm workspace 동작 (apps/web build, packages/* 자동 빌드)
- [ ] Astro 9 .astro pages 모두 정상 (콘솔 에러 0)
- [ ] 6 SPA tab island 동작 (in-memory state 보존)
- [ ] onboarding `/` 통합 + URL rewrite (`/?app=1` → `/app`)
- [ ] localStorage 키 변경 0 (snuhmate_* 그대로)
- [ ] 175 unit + 70 integration + Playwright 9 page PASS
- [ ] TypeScript: packages/* 100% .ts (strict), apps/web/.js gradual checkJs
- [ ] Vercel deploy 정상 + CSP 헤더 그대로
- [ ] 사용자 데이터 무중단 + 북마크 호환

---

## 산출물

- `apps/web/` — Astro app (9 .astro pages + 6 island components + BaseLayout)
- `packages/calculators/` `packages/profile/` `packages/shared-utils/` `packages/data/` `packages/regulation-constants/` (5 packages, TS strict)
- `turbo.json` + `pnpm-workspace.yaml` + `tsconfig.base.json`
- `vercel.json` 갱신 (monorepo build + URL rewrite)
- 기존 175+70 회귀 테스트 모두 보존 + PASS
- 사용자 안내 banner (1개월)

---

## Phase 7 (Tailwind) 연결

본 plan 완료 후:
- `tailwind.config.js` content scan: `apps/web/src/**/*.astro`
- design-tokens (neo :root, Plan 1 산출) → Tailwind theme.extend 매핑
- inline style → Tailwind utility class 점진 전환 (별도 plan)

---

## 6개월 후 cleanup (별도 plan)

- `bhm_*` lazy migration 코드 + KEEP_KEYS 정리
- 옛 entry HTML (root `*.html`) 잔재 0
- TypeScript strict 100% (apps/web/src/client/*.js → .ts 일괄 변환)
