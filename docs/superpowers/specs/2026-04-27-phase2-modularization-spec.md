# Phase 2 — ES Module 마이그레이션 SPEC

> 작성: 2026-04-27
> 범위: SNUH Mate repo SPA — 39개 .js (21,549줄) 를 ES module 로 점진 전환
> 목적: 의존성 명시화 + tree-shaking + IDE/AI rename 안전 + 향후 TypeScript 진입 발판
> 비전: **계산 로직 안 깨짐 + UI 동작 그대로 + 모든 공개 API 와 inline onclick 보존**

---

## 1. 배경

### 현 상태
- **39개 .js / 21,549줄 / IIFE + window 전역** 패턴
- 47개 `<script src="X.js" defer>` 순서 의존 (data.js → calculators.js → ...)
- 99개 inline `onclick="fn()"` HTML attribute (브라우저 전역 함수 의존)
- `window.X = X` 명시 노출 22개 (`switchTab`, `AppLock`, `initHomeTab` 등)
- 자체 빌드 (`scripts/build.mjs`) — 파일별 content-hash 부여, 번들 0
- 153개 단위 테스트 (Vitest) — `globalThis.DATA = DATA` 같은 hack 으로 동작

### 목표
1. **모든 .js 가 명시적 `import`/`export` 사용** (전역 의존 0)
2. **inline onclick 호환성 보존** — DOM 핸들러는 `window.fn = fn` 로 노출 유지
3. **번들링 도입** — 47개 script tag → 1~3개 entry bundle 로 통합
4. **테스트 hack 제거** — `import { DATA } from './data.js'` 만으로 충분
5. **회귀 0** — 153개 테스트 + Playwright 스모크 + 27건 audit 모두 통과

### 비목표 (scope 외)
- TypeScript 도입 (별도 plan)
- React/Svelte 마이그레이션 (별도 plan)
- 기능 추가/수정 (오직 형식 변환)
- 성능 최적화 외 코드 정리 (별도 plan)

---

## 2. 모듈 경계 설계

### Layer 0 — Foundation (의존성 0, 가장 먼저)
순수 데이터/상수/유틸. 다른 모듈 import 없음.

| 모듈 | 파일 | export | 책임 |
|------|------|--------|------|
| `data` | `data.js` | `DATA_STATIC`, `DATA`, `loadDataFromAPI` | DATA_STATIC 상수 + API 병합 |
| `regulation-constants` | `regulation-constants.js` | `ORDINARY_WAGE_HOURS`, `OVERTIME_UNIT_MINUTES`, `OVERTIME_MULTIPLIER`, ... | 단협 상수 |
| `shared-utils` | `shared-utils.js` | `escapeHtml`, `formatCurrency`, `parseDate`, ... | 공통 유틸 |

### Layer 1 — Domain (Layer 0 만 의존)
순수 계산. DOM 의존 0.

| 모듈 | 파일 | export | 의존 |
|------|------|--------|------|
| `calculators` | `calculators.js` | `CALC` | `data` |
| `holidays` | `holidays.js` | `HOLIDAYS` | (none) |
| `retirement-engine` | `retirement-engine.js` | `RetirementEngine` | `data`, `regulation-constants` |

### Layer 2 — State Stores (Layer 1 의존)
localStorage 기반 도메인 데이터 관리.

| 모듈 | 파일 | export | 의존 |
|------|------|--------|------|
| `profile` | `profile.js` | `PROFILE` | `calculators`, `data` |
| `overtime` | `overtime.js` | `OVERTIME` | `calculators`, `data` |
| `leave` | `leave.js` | `LEAVE` | `calculators`, `data`, `profile` |
| `payroll` | `payroll.js` | `PAYROLL` | `calculators`, `data`, `profile`, `overtime`, `leave` |

### Layer 3 — Auth & Lock
독립적 보안 모듈.

| 모듈 | 파일 | export | 의존 |
|------|------|--------|------|
| `appLock` | `appLock.js` | `AppLock` | (none) |

### Layer 4 — UI / DOM (Layer 2~3 의존)
DOM 조작 + 이벤트 + 렌더링.

| 모듈 | 파일 | 책임 |
|------|------|------|
| `shared-layout` | `shared-layout.js` | header/footer 공통 렌더 |
| `tab-loader` | `tab-loader.js` | 탭 fragment lazy load |
| `profile-tab` | `profile-tab.js` | 개인정보 탭 UI |
| `leave-tab` | `leave-tab.js` | 휴가 탭 UI |
| `payslip-tab` | `payslip-tab.js` | 급여명세서 UI |
| `payroll-views` | `payroll-views.js` | 급여 탭 렌더 |
| `pay-estimation` | `pay-estimation.js` | 급여 예상 UI |
| `regulation` | `regulation.js` | 규정 페이지 UI |
| `retirement` | `retirement.js` | 퇴직금 페이지 UI |
| 기타 (15개) | ... | onclick 핸들러 / inline UI helper / migration / share |

### Layer 5 — App Entry (Layer 4 모두 의존)
- `app.js` — index.html 진입점
- `regulation.js` 의 일부 — regulation.html 진입점
- `retirement.js` 의 일부 — retirement.html 진입점

---

## 3. 핵심 설계 결정

### D1. **Vite 도입** (자체 build.mjs 폐기)
- 이유: ES module 의 import 그래프 추적 + tree-shaking 은 Vite 가 표준. 우리 자체 build.mjs 는 파일별 hash 만 가능.
- ~~Vite Phase 1 시도 시 IIFE 거부했던 문제~~ — 이번엔 **모든 모듈을 ES module 로 변환** 하므로 OK.
- multi-page (index.html / regulation.html / retirement.html / 기타 6개)
- HTML 안 inline onclick → 빌드 시 함수가 `window.fn` 로 노출되어 있어야 함

### D2. **inline onclick 호환층 — `window.X = X` 명시 export**
- 99개 onclick 모두 `addEventListener` 위임 마이그레이션은 **별도 plan** (위험 큼).
- 현재 plan: onclick 에서 호출되는 함수들만 `window.fn = fn` 로 명시 노출 (이미 22개는 노출됨, 추가 노출 약 30개 예상).

### D3. **테스트 환경 — Vitest + import**
- 현재: `globalThis.DATA = DATA; const { CALC } = require('../../calculators.js')`
- 마이그레이션 후: `import { DATA } from '../../data.js'; import { CALC } from '../../calculators.js'`
- 153개 테스트 파일 모두 import 형식으로 변환

### D4. **점진적 전환 — Layer 별로 1주씩**
- Layer 0 → 1 → 2 → 3 → 4 → 5 순서.
- 각 Layer 완료 시 빌드 + 테스트 + Playwright 스모크 + commit.
- Layer N 마이그레이션 중에도 **앱 동작 가능** (점진적 — Layer N 모듈은 ESM, Layer N+1 은 아직 글로벌).

### D5. **회귀 안전망**
- 매 Task TDD: 실패 테스트 → 구현 → 통과 → 커밋
- 각 Layer 완료 시 Playwright 스모크: 6개 핵심 화면 (홈/휴가/시간외/급여/규정/개인정보) + 콘솔 에러 0건
- Pre-merge: `npm test` (153 passed) + `npm run check:regulation` + `npm run check:paytable`

### D6. **롤백 전략**
- 각 Layer = 별도 브랜치 (`feat/phase2-layer-0-foundation`, `feat/phase2-layer-1-domain` ...)
- Layer 완료 시 main 머지. 회귀 발견 시 해당 Layer 만 revert.
- Worktree 사용 — 메인 작업 흐름 차단 0.

---

## 4. 모듈 변환 패턴 (모든 모듈 공통)

### Before (IIFE + 전역)
```js
// data.js
const DATA_STATIC = { ... };
let DATA = DATA_STATIC;
async function loadDataFromAPI() { ... }
setTimeout(loadDataFromAPI, 10000);
```

### After (ES module + 명시 export)
```js
// data.js
export const DATA_STATIC = { ... };
export let DATA = DATA_STATIC;
export async function loadDataFromAPI() { ... }

// 호환층: 기존 inline 코드가 window.DATA 참조하는 경우 보존
if (typeof window !== 'undefined') {
  window.DATA_STATIC = DATA_STATIC;
  window.DATA = DATA;
  // setTimeout 부트스트랩은 entry (app.js 등) 에서 호출
}
```

### 호환층 원칙
1. **내부 모듈 끼리는 import** — `import { CALC } from './calculators.js'`
2. **외부 (HTML inline / window 의존 코드)** — `window.X = X` 노출 보존
3. **Layer 마이그레이션 완료 시점에 호환층은 그대로** — 다음 Layer 도 잠시 window 사용 가능
4. **모든 Layer 완료 후 Phase 2.5** (선택) — onclick 위임 + window 노출 제거

---

## 5. TDD 원칙

### 각 Task = 단일 모듈 변환
1. **실패 테스트 작성**: import 구문 사용한 새 테스트 (또는 기존 테스트 수정)
2. **테스트 실패 확인**: `import { X } from './y.js'` SyntaxError 또는 undefined
3. **모듈 변환**: `const X = ...` → `export const X = ...` + `window.X = X` 호환층
4. **테스트 통과 확인**
5. **Playwright 스모크** (Layer 마지막 task 만)
6. **commit**

### 테스트 작성 원칙
- 단위 테스트: 모듈 단독 동작 (mock 의존성 X — 우리는 순수 함수 위주)
- 통합 테스트: import 그래프 검증 (Layer 완료 시점)
- 기존 153개 테스트 변경 0 (단지 import 구문만 추가)

---

## 6. 위험 평가

| 위험 | 강도 | 완화 |
|------|------|------|
| **inline onclick 깨짐** | 🔴 높음 | `window.X = X` 호환층 필수, 각 Layer 후 Playwright 스모크 |
| **circular dependency** | 🟡 중 | Layer 그래프로 방지 (Layer N 은 < N 만 의존) |
| **번들 크기 증가** | 🟢 낮음 | Vite tree-shaking + minify 로 오히려 감소 예상 |
| **빌드 시간 증가** | 🟢 낮음 | Vite 빠름 (~1초) |
| **Vercel 배포 실패** | 🟡 중 | 첫 Vite 도입 시 vercel.json + buildCommand 검증, 단계별 push |
| **calc-registry.test.js drift** | 🟢 낮음 | calc-registry.json 은 정적 데이터 — import 로 직접 참조 |
| **regulation.html / retirement.html 별도 entry 누락** | 🔴 높음 | Vite multi-page 명시 + Playwright 로 모든 HTML 검증 |
| **service worker `/sw.js` 경로 보존** | 🔴 높음 | Vite `public/` 폴더에 sw.js 복사 (hash 미적용) |
| **localStorage 키 변경 위험** | 🔴 높음 | **localStorage 키 1글자도 변경 금지** (사용자 데이터 손실 직결) |

---

## 7. 성공 지표

빌드 + 배포 후:
- `npm test` 153 passed
- `npm run check:regulation` ❌ 0
- `npm run check:paytable` drift 0 / 297 cells
- Playwright 스모크: 9개 HTML 모두 200 + 콘솔 에러 0건
- 6개 핵심 탭 동작: 홈/휴가/시간외/급여/규정/개인정보 + 99 onclick 모두 동작
- Vite 번들 결과: gzip 크기 현재 (압축 전) 대비 30% ↓ 기대
- production cache hit rate (재방문) 95%+ (immutable hash 효과 보존)

---

## 8. 마이그레이션 순서 — 8 Phase

| Phase | 범위 | 공수 | 산출물 |
|-------|------|------|------|
| **2-A** | Vite 도입 + multi-page 빌드 | 4-6h | vite.config.js + 모든 HTML build 출력 |
| **2-B** | Layer 0 (Foundation: data / utils / constants) | 3-4h | 3개 모듈 ESM |
| **2-C** | Layer 1 (Domain: calculators / holidays / retirement-engine) | 4-6h | 3개 ESM + 단위 테스트 import 변환 |
| **2-D** | Layer 2 (State: profile / overtime / leave / payroll) | 5-7h | 4개 ESM |
| **2-E** | Layer 3 (AppLock) | 2-3h | 1개 ESM |
| **2-F** | Layer 4 (UI tabs — 9개 모듈) | 8-12h | UI 모듈 9개 ESM |
| **2-G** | Layer 5 (Entry: app.js / regulation.js / retirement.js) | 3-4h | 3개 entry ESM |
| **2-H** | Cleanup (자체 build.mjs 제거 + 회귀 검증) | 2-3h | 최종 정리 |

**총 31~45시간** (사용자 권장 30-50h 일치).

---

## 9. 다음 단계

본 SPEC 기반으로 8개 Phase 별 상세 plan 작성:

- `docs/superpowers/plans/2026-04-27-phase2-A-vite-setup.md`
- `docs/superpowers/plans/2026-04-27-phase2-B-layer0-foundation.md`
- `docs/superpowers/plans/2026-04-27-phase2-C-layer1-domain.md`
- `docs/superpowers/plans/2026-04-27-phase2-D-layer2-state.md`
- `docs/superpowers/plans/2026-04-27-phase2-E-layer3-applock.md`
- `docs/superpowers/plans/2026-04-27-phase2-F-layer4-ui.md`
- `docs/superpowers/plans/2026-04-27-phase2-G-layer5-entry.md`
- `docs/superpowers/plans/2026-04-27-phase2-H-cleanup.md`

각 Plan 은 superpowers:writing-plans 표준 형식 (TDD 단위, exact 파일 경로, 실행 명령, 커밋 메시지).
