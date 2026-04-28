# Phase 7 — Tailwind + 디자인 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. 각 sub-task 1개씩 dispatch + Playwright 시각 검증.

**Goal:** Astro `.astro` files 의 inline style + globals.css 6,400줄을 Tailwind utility class + theme token 으로 변환. 시각 회귀 0.

**Tech Stack:** Astro v4 + @astrojs/tailwind + Tailwind v3 (JIT) + Vitest + Playwright.

**SPEC:** `docs/superpowers/specs/2026-04-28-phase7-tailwind-design-system.md`

---

## Sub-task 7-1: Tailwind setup + 토큰 매핑 + BaseLayout

**Goal:** Tailwind v3 + neo/dark token mapping + BaseLayout/Header/Footer 만 우선 변환.

- [ ] `pnpm --filter @snuhmate/web add @astrojs/tailwind tailwindcss`
- [ ] `npx astro add tailwind` 또는 수동 `astro.config.mjs` 에 integration 추가
- [ ] `apps/web/tailwind.config.js`:
  - content scan: `apps/web/src/**/*.{astro,html,js,ts}`
  - theme.extend.colors.brand = neo tokens (`bg-primary, text-primary, accent-indigo` 등 CSS variable 참조 — `'brand-bg-primary': 'var(--bg-primary)'`)
  - theme.extend.boxShadow = neo shadow tokens
  - theme.extend.borderRadius = neo radius
  - darkMode: ['selector', 'html[data-theme="dark"]']
- [ ] `apps/web/src/styles/globals.css` 상단에 `@tailwind base; @tailwind components; @tailwind utilities;` 추가 (기존 `:root` token 정의 그대로 유지)
- [ ] BaseLayout.astro / 공통 component (Header/Footer 안 만들었지만 sharedHeader/sharedFooter 컨텐츠) — inline style 일부를 utility class 로 전환 (시범)
- [ ] Build + Playwright 9 page 시각 검증 (스크린샷 baseline 저장)
- [ ] Commit + push

## Sub-task 7-2: HomeIsland Tailwind 변환

- [ ] HomeIsland.astro 의 inline style → utility class
- [ ] 시각 baseline 비교 (디자인 차이 없음)
- [ ] Commit

## Sub-task 7-3: ProfileIsland Tailwind 변환 (가장 큰 form)

- [ ] ProfileIsland.astro inline style → utility class
- [ ] 5 critical 회귀 가드 (form 자동 채워짐) 검증
- [ ] Commit

## Sub-task 7-4: Payroll + Overtime + Leave Island

- [ ] 3 island Tailwind 변환
- [ ] 시급 배너 / payroll label-for / leave calendar 시각 검증
- [ ] Commit

## Sub-task 7-5: Reference + Settings + Feedback Island

- [ ] 3 island Tailwind 변환
- [ ] settings 백업 label-for + reference chapters 검증
- [ ] Commit

## Sub-task 7-6: globals.css 슬림화 + 잔여 inline style 정리

- [ ] globals.css 의 component selector 모두 utility class 로 마이그레이션 → 6,400 → ~2,000줄
- [ ] grep 으로 잔존 inline style 추적 + 정리
- [ ] Build size diff 보고 (gzip 비교)
- [ ] Commit + push + main 머지 + Vercel production 검증

---

## 검증 기준 (각 sub-task)

- 시각 baseline diff 0 (스크린샷 비교)
- 175 unit + 37 integration + Playwright 9 page PASS
- 5 critical 회귀 가드 모두 PASS
- 콘솔 에러 0
- 빌드 GREEN
