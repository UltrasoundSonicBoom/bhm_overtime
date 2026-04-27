# Phase 6 SPEC stub — TurboRepo + Astro 마이그레이션

> 작성: 2026-04-27 (stub — Phase 5 완료 후 본격 상세화)
> 범위: 9 entry HTML → Astro pages + monorepo (apps/web + packages/*)
> 전제 조건: **Phase 5 완료 필수** (cross-module 명시 import + ESLint no-undef strict)

---

## 1. 배경

### 현 상태 (Phase 5 완료 시점)
- Vite 단일 root + 9 multi-page input
- 30+ ESM 모듈 모두 명시 import/export (Phase 5 산출)
- window.X 호환층 KEEP allowlist (5~10개)
- onboarding.html / index.html 별도 entry — duplicate header/footer 코드

### 동기
- **Astro island 분할**: hydration 단위 코드 분할 → 초기 로드 시간 ↓
- **TurboRepo monorepo**: packages/calculators, packages/profile 등 도메인 패키지 분리 → tree-shake 강화 + 다른 앱 (예: admin) 재사용
- **SEO/공유 통일**: onboarding.html → `/` 통합 + redirect 제거 + CSP unsafe-inline 제거 발판
- **Astro routing**: file-based routing (src/pages/*.astro) — Vite multi-page 수동 등록 폐기

---

## 2. 사용자 결정 (확정)

### onboarding.html 처리 — **삭제 + `/` 통합 추천** (확정)

**이유**:
1. **SEO/공유**: `/` 가 onboarding 으로 들어오는 경로 단일화 → 메타태그/OG 일관
2. **Redirect 제거**: 현재 `?app=1` URL 파라미터 분기 불필요
3. **CSP unsafe-inline 제거 발판**: onboarding.html 의 inline `<script>` 와 일체화
4. **Astro routing 자연스러움**: file-based — `src/pages/index.astro` (onboarding) + `src/pages/app.astro` (현재 index.html)
5. **번들 중복 제거**: header/footer/공통 layout 중복 코드 정리

### URL 호환
- 기존 `?app=1` → `/app` Vercel rewrite (SPA history 보존)
- 기존 `/onboarding.html` → `/` 301 redirect (SEO 보존)

---

## 3. 구조 (예상)

```
bhm_overtime/
├── apps/
│   └── web/
│       ├── src/
│       │   ├── pages/
│       │   │   ├── index.astro          ← onboarding (현 onboarding.html)
│       │   │   ├── app.astro            ← 메인 앱 (현 index.html?app=1)
│       │   │   ├── dashboard.astro
│       │   │   ├── tutorial.astro
│       │   │   ├── terms.astro
│       │   │   ├── privacy.astro
│       │   │   ├── schedule_suite.astro
│       │   │   ├── regulation.astro
│       │   │   └── retirement.astro
│       │   ├── layouts/
│       │   │   └── BaseLayout.astro     ← 공통 header/footer (Phase 5 의 shared-layout.js 대체)
│       │   ├── components/              ← Astro island 컴포넌트
│       │   │   ├── HomeTab.astro
│       │   │   ├── ProfileTab.astro
│       │   │   ├── PayrollTab.astro
│       │   │   └── ...
│       │   └── client/                  ← 기존 .js 모듈 (Phase 5 산출)
│       │       ├── calculators.js → packages/calculators 로 이전
│       │       └── ...
│       ├── astro.config.mjs
│       └── package.json
├── packages/
│   ├── calculators/                     ← Layer 1 도메인 패키지 (CALC, HOLIDAYS, RetirementEngine)
│   ├── profile/                         ← Layer 2 (PROFILE, OVERTIME, LEAVE, PAYROLL)
│   ├── shared-utils/                    ← Layer 0 utils
│   └── regulation-constants/            ← Layer 0 constants
├── turbo.json                           ← TurboRepo build pipeline
├── package.json                         ← workspace root
└── pnpm-workspace.yaml                  ← (또는 npm workspaces)
```

---

## 4. 핵심 변환

### Pattern A — HTML → .astro

```html
<!-- Before (index.html) -->
<!DOCTYPE html>
<html lang="ko">
<head>
  <title>BHM Overtime</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app">...</div>
  <script type="module" src="app.js"></script>
</body>
</html>
```

```astro
---
// app.astro (After)
import BaseLayout from '../layouts/BaseLayout.astro';
import HomeTab from '../components/HomeTab.astro';
import ProfileTab from '../components/ProfileTab.astro';
---
<BaseLayout title="BHM Overtime">
  <HomeTab client:load />
  <ProfileTab client:idle />
</BaseLayout>
```

### Pattern B — Layer 1/2 → packages/*

```js
// Before (calculators.js — Phase 5 산출)
import { DATA } from './data.js';
export const CALC = { ... };

// After (packages/calculators/index.js)
import { DATA } from '@bhm/data';
export const CALC = { ... };
```

apps/web 에서:
```js
import { CALC } from '@bhm/calculators';
```

---

## 5. 위험

| 위험 | 강도 | 완화 |
|------|------|------|
| Astro island hydration 미스매치 | 🔴 높음 | Phase 5 의 명시 import 가 island 경계와 일치하도록 보장 |
| TurboRepo 의 import path alias 변경 | 🟡 중 | tsconfig paths + Astro alias 동기화 |
| 기존 inline onclick → Astro hydration 비호환 | 🔴 높음 | Phase 5 의 KEEP allowlist 모두 위임 핸들러로 이동 |
| Vercel deploy 실패 (multi-app monorepo) | 🟡 중 | Vercel monorepo doc + apps/web 만 deploy 설정 |
| localStorage 키 변경 0 | 🔴 높음 | packages/profile 의 KEY 상수 동일 유지 |
| URL 호환 (`/onboarding.html` 등) | 🟡 중 | Vercel redirect 명시 |

---

## 6. 마이그레이션 순서 (예상)

| Task | 범위 | 공수 |
|------|------|------|
| 6-1 | TurboRepo workspace 골격 + apps/web (현 코드 복사) | 4-6h |
| 6-2 | Layer 0/1 → packages/* 분리 (calculators / shared-utils / data) | 6-8h |
| 6-3 | Layer 2 → packages/profile | 4-6h |
| 6-4 | 9 HTML → .astro pages (onboarding 통합 포함) | 12-16h |
| 6-5 | 9 entry → island 분할 + hydration directive | 8-12h |
| 6-6 | Vercel deploy + URL redirect + 회귀 검증 | 4-6h |

**총 38~54h** (1-2주).

---

## 7. 다음

Phase 5 완료 후 본 SPEC 본격 상세화 + Phase 6 plan 작성.
