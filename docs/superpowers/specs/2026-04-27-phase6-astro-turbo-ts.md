# Phase 6 SPEC — TurboRepo + Astro + TypeScript Gradual

> 작성: 2026-04-27 (Phase 5-followup 완료 후 본격 상세화)
> 범위: 9 entry HTML + 30+ ESM 모듈 → TurboRepo monorepo + Astro file-based routing + TS 점진 도입
> 전제 조건: Phase 5 완료 (cross-module ESM strict) + Plan 1 완료 (design tokens neo :root) + Plan 2 완료 (snuhmate_* 네이밍)
> 비전: **앱 동작 그대로 + Astro island 분할 + 새 코드 100% TS + 기존 .js gradual 전환**

---

## 1. 배경

### Phase 5/5-followup 완료 후 현 상태
- 30+ ESM 모듈 모두 명시 import (cross-module bare 0)
- ESLint no-undef strict (회귀 차단)
- localStorage 키 SNUH Mate 일관 (snuhmate_* + bhm_* lazy migration)
- Design tokens: neo :root default, dark 옵션 로드
- 9 entry HTML + Vite multi-page + tab-loader fragment

### 동기 (사용자 의도)
1. **Astro file-based routing** — 6 SPA tab 의 일관성 자연 통합 (이번 세션 8회 회귀 패턴 종결)
2. **TurboRepo monorepo** — packages/calculators 등 도메인 패키지 재사용 (admin / dashboard / shorts-studio)
3. **TypeScript gradual** — 새 코드는 .ts 부터, 기존 .js 는 점진 (큰 작업 회피)
4. **onboarding.html → / 통합** — SEO/공유 단일화 + CSP unsafe-inline 제거 발판
5. **island 분할** — hydration 경계 명시 → 초기 로드 시간 ↓

---

## 2. 목표

### 기능
1. **TurboRepo workspace**: `apps/web` (Astro) + `packages/calculators` / `packages/profile` / `packages/shared-utils` / `packages/regulation-constants`
2. **Astro pages**: 9 HTML entry → `src/pages/*.astro` (file-based routing)
3. **onboarding 통합**: `src/pages/index.astro` (onboarding) + `src/pages/app.astro` (현 index.html?app=1)
4. **URL 호환**: 기존 `?app=1` → `/app` Vercel rewrite (사용자 북마크 보호)
5. **TypeScript gradual**: `.astro` + 새 모듈 = TS, 기존 .js = JSDoc + tsconfig allowJs/checkJs
6. **island 분할**: 6 SPA tab 을 `<HomeIsland />` `<ProfileIsland />` 등 vanilla JS island 로 변환

### 비기능
- 회귀 0: 175 unit + 70 integration + Playwright 9 page smoke 모두 PASS
- 빌드 시간 < 2배 (현재 vite 1초 → astro 2초 이내 목표)
- 번들 크기 - 30% (Astro island = 페이지별 hydration → tree-shake 강화)
- localStorage 키 변경 0
- SW cache 전략 호환

### 비목표 (별도 phase)
- Tailwind 도입 (Phase 7)
- React/Svelte component 도입 (vanilla JS island 만)
- 기존 .js 일괄 .ts 변환 (gradual 만)
- Firebase Auth/Firestore (Phase 6 후 별도)

---

## 3. 구조 (확정)

```
snuhmate/                              ← repo root
├── apps/
│   └── web/                           ← Astro app
│       ├── src/
│       │   ├── pages/                 ← file-based routing
│       │   │   ├── index.astro        ← onboarding (현 onboarding.html)
│       │   │   ├── app.astro          ← 메인 SPA (현 index.html?app=1)
│       │   │   ├── regulation.astro   ← 규정 페이지 (직접 진입용)
│       │   │   ├── retirement.astro
│       │   │   ├── dashboard.astro    ← admin
│       │   │   ├── tutorial.astro
│       │   │   ├── terms.astro
│       │   │   └── privacy.astro
│       │   ├── layouts/
│       │   │   └── BaseLayout.astro   ← header/footer 공통 (shared-layout.js 대체)
│       │   ├── components/            ← Astro 컴포넌트
│       │   │   ├── Header.astro
│       │   │   ├── Footer.astro
│       │   │   ├── DemoBanner.astro
│       │   │   └── tabs/              ← SPA tab island (vanilla JS)
│       │   │       ├── HomeIsland.astro
│       │   │       ├── ProfileIsland.astro
│       │   │       ├── PayrollIsland.astro
│       │   │       ├── OvertimeIsland.astro
│       │   │       ├── LeaveIsland.astro
│       │   │       ├── ReferenceIsland.astro
│       │   │       └── SettingsIsland.astro
│       │   ├── client/                ← 기존 .js 모듈 (gradual TS 전환)
│       │   │   ├── app.ts             ← 신규 (TS) — entry orchestrator
│       │   │   ├── shared-layout.js   ← deprecated (BaseLayout.astro 대체)
│       │   │   └── ... (Phase 5 의 30+ .js 모두 이동)
│       │   ├── styles/
│       │   │   ├── globals.css        ← style.css (neo :root)
│       │   │   ├── dark.css           ← style.dark.css
│       │   │   └── regulation.css     ← regulation.css
│       │   └── env.d.ts
│       ├── public/                    ← 정적 자산 (sw.js, data/, snuhmaterect.png 등)
│       ├── astro.config.mjs
│       ├── tsconfig.json              ← allowJs + checkJs (gradual)
│       └── package.json
├── packages/
│   ├── calculators/                   ← Layer 1 도메인
│   │   ├── src/index.ts               ← TS 신규 작성 (CALC + types)
│   │   ├── src/holidays.ts
│   │   ├── src/retirement-engine.ts
│   │   └── package.json
│   ├── profile/                       ← Layer 2
│   │   ├── src/index.ts               ← PROFILE + 타입
│   │   ├── src/work-history.ts
│   │   └── package.json
│   ├── shared-utils/                  ← Layer 0
│   │   ├── src/index.ts               ← escapeHtml, registerActions 등
│   │   └── package.json
│   ├── regulation-constants/          ← Layer 0
│   │   ├── src/index.ts               ← 단협 상수 (이미 export const 형태)
│   │   └── package.json
│   └── data/                          ← Layer 0
│       ├── src/index.ts               ← DATA_STATIC + loadDataFromAPI
│       ├── src/payTables.json
│       └── package.json
├── tests/                             ← 기존 175 unit + 70 integration 보존
├── turbo.json                         ← TurboRepo build pipeline
├── package.json                       ← workspace root
├── pnpm-workspace.yaml                ← workspace 정의
└── tsconfig.base.json                 ← TS 공통 config
```

### URL 매핑

| 기존 URL | 새 URL | 처리 |
|---|---|---|
| `/` (onboarding redirect) | `/` (Astro page) | Astro index.astro 가 onboarding 직접 표시 |
| `/?app=1` | `/app` | Vercel rewrite (`/?app=1` → `/app` 301) |
| `/index.html` | `/app` | 동일 |
| `/regulation.html` | `/regulation` | Astro page |
| `/retirement.html` | `/retirement` | Astro page |
| 외 6 entry | `/<name>` | 동일 패턴 |

---

## 4. 핵심 설계 결정

### D1. **Astro vanilla JS island (React/Svelte X)**
- 이유: 현재 30+ ESM 모듈 모두 vanilla JS — React/Svelte 도입 = component 변환 큰 작업
- Astro `<script>` 블록 + import 형태로 island 구성 (Astro 가 vanilla JS island 도 hydration 지원)
- 향후 Phase 7 후에 점진 React/Svelte 도입 가능 (별도 phase)

### D2. **TypeScript gradual (allowJs + checkJs)**
- `tsconfig.json`: `"allowJs": true, "checkJs": true, "strict": true, "noImplicitAny": false`
- 새 파일 (.ts) → strict, 기존 .js → JSDoc + checkJs warning
- 점진 전환: `packages/*` 부터 .ts (도메인 모듈), apps/web/src/client/ 는 추후

### D3. **TurboRepo (vs npm workspaces 단독)**
- 이유: build cache + parallel task — 향후 admin/shorts-studio 등 sub-app 빌드 가속
- pnpm workspace 사용 (npm 대비 disk space ↓)
- `turbo.json`: build / dev / test / lint pipeline

### D4. **onboarding.html → / 통합 (사용자 결정)**
- `src/pages/index.astro` = onboarding 컨텐츠
- `src/pages/app.astro` = SPA 메인
- 기존 `https://snuhmate.com/?app=1` → `/app` Vercel rewrite
- SEO meta 단일화 (onboarding = 첫 접속 사용자, app = 가입자)

### D5. **localStorage / SW 호환**
- 키 변경 0 (snuhmate_* lazy migration 이미 완료)
- SW: Astro PWA integration (Workbox) 또는 기존 sw.js 그대로 (apps/web/public/)
- IndexedDB / Cache Storage 모두 origin 기준 → snuhmate.com 도메인 유지하면 호환

### D6. **점진 마이그레이션 전략**
- Phase 6.1: TurboRepo workspace 골격 (apps/web 빈 껍데기)
- Phase 6.2: Layer 0/1 → packages/* 분리 (TS 신규 작성)
- Phase 6.3: Layer 2 → packages/profile
- Phase 6.4: 9 HTML → .astro pages (onboarding 통합)
- Phase 6.5: 6 SPA tab → island 분할
- Phase 6.6: Vercel deploy + URL rewrite + 회귀 검증
- 각 단계 main 머지 + Vercel 배포 + 회귀 가드

### D7. **회귀 안전망**
- 기존 175 unit + 70 integration 테스트 모두 보존
- Vitest 환경 그대로 (Vite 호환)
- Playwright 9 page smoke + 6 핵심 탭 + 콘솔 에러 0
- Astro page 빌드 결과를 vite preview 와 동일 path 로 검증

### D8. **Vercel 배포**
- monorepo 지원: `vercel.json` 의 buildCommand → `cd apps/web && npm run build`
- outputDirectory: `apps/web/dist`
- CSP 헤더: 그대로 유지 (Phase 5-followup 적용 본)
- SW path: `/sw.js` 그대로 (apps/web/public/sw.js)

---

## 5. 위험

| 위험 | 강도 | 완화 |
|---|---|---|
| Astro hydration 미스매치 (vanilla JS island) | 🔴 높음 | Phase 5 의 명시 import 가 island 경계와 일치 → 이미 완화 |
| URL 호환 (`/?app=1` 사용자 북마크) | 🔴 높음 | Vercel rewrite + 6개월 alert |
| TurboRepo path alias (packages/*) | 🟡 중 | tsconfig paths + Astro alias 동기화 |
| inline onclick → Astro hydration 비호환 | 🟡 중 | KEEP allowlist 모두 위임 핸들러 마이그레이션 (Phase 6 의 부산물) |
| localStorage 키 변경 0 | 🔴 높음 | packages/profile 의 STORAGE_KEY 동일 유지 (테스트로 검증) |
| 빌드 시간 증가 | 🟢 낮음 | Astro 빠름 (~2초) + TurboRepo cache |
| 기존 175+70 테스트 깨짐 | 🟡 중 | Vitest config 보존, import path 만 packages/* 로 갱신 |
| Vercel deploy 설정 | 🟡 중 | monorepo doc 참고, 단계별 push 로 검증 |

---

## 6. 마이그레이션 순서 — 6 task

| Task | 범위 | 공수 | 산출물 |
|---|---|---|---|
| **6-1** | TurboRepo workspace 골격 + apps/web 빈 Astro | 4-6h | turbo.json + pnpm-workspace + apps/web/astro.config |
| **6-2** | Layer 0/1 → packages/calculators / shared-utils / data / regulation-constants (TS 신규) | 6-8h | 4 packages + 기존 .js 의 import path 갱신 |
| **6-3** | Layer 2 → packages/profile (PROFILE / WorkHistory / OVERTIME / LEAVE / PAYROLL) | 4-6h | packages/profile + apps/web 의 import 갱신 |
| **6-4** | 9 HTML → .astro pages + onboarding 통합 (`/` = onboarding, `/app` = SPA) | 12-16h | 9 .astro + Vercel rewrite + URL 호환 alert |
| **6-5** | 6 SPA tab → vanilla JS island (Astro `<script>` 블록 + hydration directive) | 8-12h | 6 island + tab-loader 폐기 (Astro routing 으로 대체) |
| **6-6** | Vercel monorepo 배포 + URL rewrite 검증 + 회귀 검증 (Playwright 9 page) | 4-6h | 라이브 배포 + 사용자 검증 |

**총 38~54h** (1-2주, subagent-driven 분할 가능).

---

## 7. 성공 지표

빌드 + 배포 후:
- ✅ 175 unit + 70 integration + Playwright 9 page PASS
- ✅ check:regulation 0 / check:paytable 0 drift
- ✅ ESLint no-undef 0 (Phase 5 strict 유지)
- ✅ TypeScript: packages/* 100% .ts (strict), apps/web/.js gradual checkJs
- ✅ 빌드 시간 < 5초 (Astro + Turbo cache)
- ✅ 사용자 북마크 URL 모두 호환 (`/?app=1` → `/app` rewrite)
- ✅ localStorage 키 변경 0 (사용자 데이터 무중단)

---

## 8. Phase 7 (Tailwind) 호환성

Phase 6 의 .astro component 위에서 Phase 7 진행:
- `tailwind.config.js` 의 `content` scan 에 `apps/web/src/**/*.astro` 등 포함
- 기존 inline style → Tailwind utility class 점진 전환
- design-tokens (neo :root) → Tailwind theme.extend 매핑

---

## 9. 다음 단계

Phase 6 plan: [docs/superpowers/plans/2026-04-27-phase6-astro-turbo-ts.md] (이 SPEC 기반 6 task 분할)
