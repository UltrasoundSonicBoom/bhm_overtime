# Phase 6 Task 4 — 9 HTML → .astro pages + onboarding `/` 통합

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. 본 plan 의 6 sub-task 를 1개씩 dispatch.

**Goal:** root 의 9 entry HTML (index/onboarding/regulation/retirement/dashboard/schedule_suite/tutorial/terms/privacy) → `apps/web/src/pages/*.astro` 변환 + onboarding `/` 통합 + Vercel monorepo build.

**Architecture:**
- 단순한 entry (terms/privacy/tutorial/onboarding) 부터 .astro 변환
- 복잡한 entry (index/regulation/retirement) 는 컨텐츠 inline + 기존 .js script src 그대로
- BaseLayout.astro = shared header/footer slot
- 6 SPA tab island 분할은 Task 5 (별도)
- Vercel rewrite (`/?app=1` → `/app`) 도 Task 6

**전제 조건**: Phase 6 Task 1-3 완료 (`a00c2b2`), branch `feat/phase6-astro-turbo-ts`.

**Worktree 진입**:
```bash
cd /Users/momo/Documents/GitHub/bhm_overtime-phase6
pnpm install
```

---

## Sub-task 4-1: BaseLayout + 정적 assets 복사

**Files:**
- Create: `apps/web/src/layouts/BaseLayout.astro`
- Create: `apps/web/public/` 에 정적 자산 복사 (manifest.json, snuhmaterect.png, sw.js, data/)
- Create: `apps/web/src/styles/{globals.css,dark.css,regulation.css}` — root style.css 복사

- [ ] **Step 1.1: 정적 자산 복사**

```bash
cp -r public/* apps/web/public/
cp manifest.json apps/web/public/manifest.json 2>/dev/null || true
cp snuhmaterect.png apps/web/public/ 2>/dev/null || true
cp style.css apps/web/src/styles/globals.css
cp style.dark.css apps/web/src/styles/dark.css
cp regulation.css apps/web/src/styles/regulation.css
```

- [ ] **Step 1.2: BaseLayout.astro 작성**

```astro
---
interface Props {
  title: string;
  description?: string;
  showFooterNav?: boolean;
  extraCss?: string[];
}
const { title, description = 'SNUH Mate', showFooterNav = true, extraCss = [] } = Astro.props;
---
<!DOCTYPE html>
<html lang="ko" data-theme="neo">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content={description} />
  <title>{title}</title>
  <link rel="manifest" href="/manifest.json" />
  <link rel="apple-touch-icon" href="/snuhmaterect.png" />
  <link rel="icon" type="image/png" href="/snuhmaterect.png" />
  <link rel="stylesheet" href="/styles/globals.css" />
  {extraCss.map(href => <link rel="stylesheet" href={href} />)}
  <script is:inline>
    // Plan 1: dark 조건부 로드 + linear → dark 마이그레이션
    (function(){try{var t=localStorage.getItem("theme");if(t==="dark"||t==="linear"){document.documentElement.setAttribute("data-theme","dark");var d=document.createElement("link");d.rel="stylesheet";d.href="/styles/dark.css";document.head.appendChild(d);if(t==="linear")localStorage.setItem("theme","dark")}}catch(e){}})();
  </script>
</head>
<body>
  <header id="sharedHeader"></header>
  <slot />
  {showFooterNav && <nav id="sharedFooter"></nav>}
</body>
</html>
```

- [ ] **Step 1.3: 빌드 검증**

```bash
pnpm --filter @snuhmate/web build
```

- [ ] **Step 1.4: 커밋**

```bash
git add apps/web/{public,src/layouts,src/styles}
git commit -m "feat(phase6-4-1): BaseLayout.astro + 정적 자산 복사"
```

---

## Sub-task 4-2: 단순 entry 변환 (terms / privacy / tutorial / onboarding)

**Files:**
- Modify: `apps/web/src/pages/{terms,privacy,tutorial}.astro` (신규)
- Modify: `apps/web/src/pages/index.astro` (onboarding 컨텐츠로 교체)

- [ ] **Step 2.1: terms.astro**

기존 `terms.html` 의 `<body>` 컨텐츠 → BaseLayout slot 안 inline. `<style>` 블록은 `<style>` Astro 태그 (scoped 가능). `<script>` 태그는 그대로 유지.

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="서비스 약관 — SNUH 메이트" description="SNUH 메이트 서비스 약관">
  <main class="main" style="padding-top: 16px;">
    <div class="terms-wrap">
      <!-- terms.html 본문 그대로 복사 -->
    </div>
  </main>
</BaseLayout>

<style>
  /* terms.html 의 <style> 블록 그대로 */
</style>

<script src="/client/shared-layout.js" type="module" is:inline></script>
```

- [ ] **Step 2.2: privacy.astro / tutorial.astro 동일 패턴**

- [ ] **Step 2.3: index.astro 를 onboarding 컨텐츠로**

기존 `onboarding.html` 의 컨텐츠 → `apps/web/src/pages/index.astro`. 골격용 placeholder 교체.

- [ ] **Step 2.4: 빌드 검증 + 시각 검증**

```bash
pnpm --filter @snuhmate/web build
pnpm --filter @snuhmate/web preview &
sleep 3
```

Playwright 로 4 page 콘솔 에러 0 + 시각 검증 (스크린샷).

- [ ] **Step 2.5: 커밋**

```bash
git commit -am "feat(phase6-4-2): 단순 entry → .astro (terms/privacy/tutorial + index=onboarding)"
```

---

## Sub-task 4-3: 복잡 entry — regulation / retirement

**Files:**
- Create: `apps/web/src/pages/{regulation,retirement}.astro`
- Move: 기존 `regulation.js` / `retirement.js` → `apps/web/src/client/`

- [ ] **Step 3.1: regulation.astro**

기존 `regulation.html` 의 main 컨텐츠 inline. `<script type="module" src="regulation.js">` → `apps/web/src/client/regulation.js` 로 옮김 + import path 갱신:

```js
// apps/web/src/client/regulation.js
import { CALC } from '@snuhmate/calculators';
import { DATA } from '@snuhmate/data';
import { PROFILE } from '@snuhmate/profile';
import { registerActions, escapeHtml } from '@snuhmate/shared-utils';
// ... 기존 컨텐츠
```

- [ ] **Step 3.2: retirement.astro 동일**

- [ ] **Step 3.3: 빌드 + 시각 검증**

- [ ] **Step 3.4: 커밋**

---

## Sub-task 4-4: 복잡 entry — dashboard / schedule_suite

별도 sub-app 성격. 기존 그대로 복사 + .astro 안에 inline.

- [ ] dashboard.astro / schedule_suite.astro
- [ ] 빌드 + 검증
- [ ] 커밋

---

## Sub-task 4-5: app.astro 골격 (메인 SPA)

**Files:**
- Create: `apps/web/src/pages/app.astro`

기존 `index.html` 의 main 컨텐츠 (6 tab-content placeholder + main wrapper) inline. 6 tab island 임베드는 Task 5 에서.

- [ ] app.astro 작성 (tab-content 6개 placeholder)
- [ ] 기존 root .js 모두 `apps/web/src/client/` 로 이동 + import path packages/* 으로 갱신
- [ ] 빌드 + 6 tab 동작 검증
- [ ] 커밋

---

## Sub-task 4-6: 회귀 검증 + sub-task 통합

- [ ] 175 unit + 70 integration PASS
- [ ] Playwright 9 page 모두 콘솔 에러 0
- [ ] root *.html 삭제 (apps/web 으로 이전 완료)
- [ ] 커밋 + push

---

## 검증 기준 (각 sub-task)
- 콘솔 에러 0
- 빌드 GREEN (apps/web/dist 생성)
- 시각 회귀 0 (스크린샷 비교)
- 회귀 가드 175+70 PASS
