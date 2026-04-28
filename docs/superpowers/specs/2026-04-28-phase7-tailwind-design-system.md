# Phase 7 SPEC — Tailwind + 디자인 시스템

> 작성: 2026-04-28
> 범위: 9 Astro pages + 7 island + 17 .astro components 의 ad-hoc CSS / inline style → Tailwind utility class + design token
> 전제 조건: Phase 6 완료 (Astro monorepo + apps/web/src/styles/{globals,dark,regulation}.css + design-tokens neo :root)

---

## 1. 배경

### 현 상태 (Phase 6 완료 시점)
- `apps/web/src/styles/globals.css` (~6,400줄) — neo :root tokens + 모든 component 스타일
- `apps/web/src/styles/dark.css` — data-theme="dark" tokens
- `apps/web/src/styles/regulation.css` — 규정 page-scoped styles
- 17 `.astro` files 안 inline `style="..."` 광범위 사용
- `apps/web/public/styles/{dark,onboarding,regulation}.css` — 사용자 환경 동적 로드용 복사본

### 동기
- **유지보수 단순화** — 6,400줄 globals.css 의 selector 폭발 → utility class 로 평탄화
- **다크 모드 일관** — `dark:` variant 로 light/dark 토큰 양쪽 동시 정의
- **AI 친화** — Tailwind = LLM 학습 데이터 풍부, 디자인 변경 시 정확도 ↑
- **번들 크기 감소** — Tailwind JIT (PurgeCSS) → 사용 utility 만 출력

---

## 2. 목표

### 기능
1. **Tailwind 도입**: Astro `@astrojs/tailwind` integration + `tailwind.config.js`
2. **디자인 토큰 매핑**: neo `:root` CSS variable → `theme.extend.colors.brand` / `theme.extend.boxShadow` 등
3. **inline style 점진 변환**: 17 .astro 의 `style="..."` → utility class
4. **globals.css 슬림화**: 공통 reset/typography 만 유지, component 스타일 → utility class
5. **다크 모드 통합**: `dark:` variant — light/dark 동시 선언

### 비기능
- 회귀 0: 175 unit + 37 integration + Playwright 9 page + 5 critical 회귀 가드 모두 PASS
- 시각 baseline 동일 (이전 vs 이후 스크린샷 diff 0)
- 번들 크기 30% 감소 기대 (Tailwind JIT)
- localStorage / SW / URL 영향 0

### 비목표 (별도 phase)
- React/Svelte component 도입 (vanilla JS island 유지)
- shadcn/ui 등 component library
- 일괄 디자인 리뉴얼 (디자이너 작업 필요)

---

## 3. 설계 결정

### D1. **Tailwind v3 + @astrojs/tailwind**
- Astro 공식 integration. JIT 모드, content scan auto.
- `npx astro add tailwind` 으로 자동 셋업 가능

### D2. **Light/Dark 토큰 매핑 → Tailwind theme**
- `:root` (neo) → `theme.extend.colors.brand-bg-primary` 등
- `html[data-theme="dark"]` → CSS variable + `dark:` variant
- 또는 Tailwind 의 `dark:` 모드를 `class` 또는 `selector` 로 설정

### D3. **점진 마이그레이션 — high-traffic 부터**
- Phase 7-1: BaseLayout + Header + Footer
- Phase 7-2: HomeIsland (가장 자주 보임)
- Phase 7-3: ProfileIsland
- Phase 7-4: PayrollIsland + Overtime + Leave
- Phase 7-5: Reference + Settings + Feedback
- Phase 7-6: 정리 (globals.css 슬림화)

### D4. **inline style → utility class 매핑 자동화**
- 광범위 `style="..."` patterns → utility class table
- Codemod 또는 manual 변환 (시각 검증 필수)

---

## 4. 위험

| 위험 | 강도 | 완화 |
|---|---|---|
| 시각 회귀 | 🔴 높음 | 시각 baseline 스크린샷 + Playwright diff |
| inline style 누락 | 🟡 중 | grep 으로 잔존 inline style 추적 |
| Astro `<style>` block 충돌 | 🟡 중 | Astro scoped style + Tailwind JIT 병존 검증 |
| 번들 크기 증가 (Tailwind 자체) | 🟢 낮음 | JIT (PurgeCSS) — 사용된 utility 만 출력 |
| 사용자 데이터 / SW 영향 | 🟢 낮음 | UI 변경만, localStorage 영향 0 |

---

## 5. 마이그레이션 순서 — 6 task

| Task | 범위 | 공수 |
|---|---|---|
| 7-1 | Tailwind setup + 토큰 매핑 + BaseLayout/Header/Footer | 4-6h |
| 7-2 | HomeIsland (Tailwind 변환 + 시각 검증) | 4-6h |
| 7-3 | ProfileIsland | 6-8h (큰 form) |
| 7-4 | Payroll + Overtime + Leave Island | 8-12h |
| 7-5 | Reference + Settings + Feedback Island | 4-6h |
| 7-6 | globals.css 슬림화 + 잔여 inline style 정리 | 4-6h |

**총 30~44h** (1주, subagent 분할 가능).

---

## 6. 성공 지표

- ✅ 175 unit + 37 integration + Playwright 9 page PASS
- ✅ 5 critical 회귀 가드 모두 PASS (profile form / overtime 배너 / settings 백업 / reference chapters / payroll picker)
- ✅ 시각 baseline diff 0 (스크린샷 비교)
- ✅ Tailwind 번들 크기 < 50KB (PurgeCSS 효과)
- ✅ globals.css 슬림화 (~6,400 → ~2,000줄 미만)
- ✅ inline style 잔존 0 (grep)

---

## 7. 다음

Phase 7 plan: `docs/superpowers/plans/2026-04-28-phase7-tailwind.md` (이 SPEC 기반 6 task 분할).
