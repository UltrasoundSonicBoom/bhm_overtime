# SNUH Mate Design System SPEC

> 작성: 2026-04-28
> 브랜치: `design-system`
> 전제: Phase 7 완료 (Tailwind v3 + neo/dark token bridge — `brand-*` utility 가 CSS var 참조)

---

## 1. 배경

### 현 상태
- `apps/web/tailwind.config.js`: `colors.brand.*`, `boxShadow.brand-*`, `borderRadius.brand-*`, `fontSize.brand-*` 만 정의.
- `apps/web/src/styles/globals.css` (~6,400줄): neo `:root` token block + 496개 클래스 selector (auth, badge, btn, card, form, modal, nav-tab 등 47개 prefix 군).
- `apps/web/src/styles/dark.css`: `html[data-theme="dark"]` token override.
- 17 `.astro` component 안 inline `style="..."` 잔존 92개 (HomeIsland 5, Profile 32, Payroll 27 등).
- 컴포넌트 = 글로벌 클래스. Variant/Size/State 명세 없음. props 없음. 재사용 어휘 없음.
- 페이지/패턴 레이어 부재 (PageHeader, EmptyState, FormSection 등).
- 디자인 거버넌스 부재: PR에서 raw hex / 임의 spacing / inline style 막는 가드 없음.

### 동기 — 한 문장
> 새 페이지·기능을 만들 때 누구도(개발자, AI 포함) 임의 디자인을 만들지 못하고, **정해진 토큰·컴포넌트·패턴 조합**으로만 만들도록 강제하는 공통 언어를 코드화한다.

---

## 2. 목표

### 기능 (deliverable)

| # | 산출물 | 설명 |
|---|---|---|
| F1 | **Tokens (2-tier)** | `tokens/primitive.css` (gray-50..900, blue-50..500 등 raw 값) + `tokens/semantic.css` (`--color-text-primary` → `var(--gray-900)`) |
| F2 | **Spacing scale** | `--space-1` (4px) ~ `--space-12` (48px), Tailwind `theme.spacing` 동기화 |
| F3 | **Typography scale** | display / h1~h4 / body-lg/md/sm / label / caption — Tailwind `fontSize` 등록 |
| F4 | **Status tokens** | `--color-status-{success,warning,error,info}` (semantic alias of accents) |
| F5 | **Focus-ring token** | `--focus-ring-color`, `--focus-ring-width`, `--focus-ring-offset` — 모든 인터랙티브 요소 공용 |
| F6 | **UI components (Astro)** | Button, Input, Select, Textarea, Checkbox, Radio, Switch, Card, Badge, Alert, Modal, Toast, Tabs, Tooltip, Avatar — 각각 Variant/Size/State props |
| F7 | **Layout primitives** | Container, Stack, Section, Grid, Divider |
| F8 | **Patterns** | PageHeader, EmptyState, FormSection, SearchFilterBar, LoadingSkeleton, ErrorState |
| F9 | **Design system showcase** | `/design-system` Astro 라우트 — 토큰/컴포넌트/패턴 시각화 + Variant 매트릭스 + 코드 샘플 |
| F10 | **Governance tests** | inline style/raw hex/임의 spacing 금지 lint, 토큰 contract 테스트 |
| F11 | **HomeIsland 레퍼런스 마이그레이션** | 새 컴포넌트로 1개 island 리팩토링 — 패턴 검증 |
| F12 | **Usage guide** | `docs/design-system/usage.md` — 새 페이지 만들 때 체크리스트 + 컴포넌트 선택 트리 |

### 비기능
- **회귀 0**: 175 unit + 37 integration + Playwright 스모크 모두 PASS.
- **시각 baseline 동일**: 신규 컴포넌트로 교체된 island는 기존 화면과 픽셀 수준 동일 (Playwright 스크린샷 diff).
- **번들 영향 +5KB 이하**: 컴포넌트는 Astro server-rendered (zero JS by default), 토큰은 단일 CSS.
- **다크 모드 100% 호환**: 모든 신규 컴포넌트는 light/dark 양쪽에서 검증.
- **접근성**: 모든 인터랙티브 컴포넌트에 focus-ring + 키보드 조작 + WCAG AA contrast.

### 비목표 (별도 phase)
- 일괄 디자인 리뉴얼 (브랜드 색상 변경 등 — 디자이너 결정 필요).
- 모든 island 마이그레이션 (HomeIsland 1개만 reference, 나머지는 후속 plan).
- Figma 라이브러리 (이번 phase는 코드 우선).
- React/Svelte component (Astro vanilla 유지).

---

## 3. 설계 결정

### D1. **2-tier Token (Primitive → Semantic)**

```css
/* tokens/primitive.css */
--blue-500: #6366f1;
--blue-600: #5558e6;
--gray-50: #f9fafb;
--gray-900: #111827;

/* tokens/semantic.css */
--color-brand-primary: var(--blue-500);
--color-text-primary: var(--gray-900);
--color-bg-page: var(--gray-50);
```

**왜:** 향후 브랜드 색 변경 시 primitive만 갈아끼우면 됨. 기존 `--accent-indigo` 등은 semantic 으로 alias 유지 (호환).

### D2. **Component = Astro file with explicit props**

```astro
---
// Button.astro
interface Props {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  iconLeft?: string; iconRight?: string;
  fullWidth?: boolean;
}
---
```

기존 globals.css 의 `.btn`, `.btn-primary` 클래스는 **유지** (HomeIsland 외 island가 여전히 사용). 신규 컴포넌트는 동일 클래스를 출력 → 시각 회귀 0.

### D3. **Tailwind 토큰 1차 시민화**

`tailwind.config.js` 확장:
- `theme.extend.spacing`: `s-1: 4px` ~ `s-12: 48px` (CSS var 참조)
- `theme.extend.fontSize`: display/h1/h2/h3/h4/body-lg/body-md/body-sm/label/caption
- `theme.extend.ringColor.brand-focus`, `ringWidth.brand`, `ringOffsetWidth.brand`
- 기존 `brand-*` 키 모두 유지 (호환).

### D4. **/design-system 라우트 = 단일 진실의 원천**

- 좌측 nav: Foundation / Components / Patterns / Guidelines / Changelog
- 각 컴포넌트 카드: Live preview + Props 표 + Variant 매트릭스 + 코드 sample (`<pre><code>`).
- 빌드 시 정적 페이지로 출력 (zero JS).
- production에서도 `/design-system`은 접근 가능 (사내 참고용).

### D5. **거버넌스는 테스트로 강제**

- `tests/integration/design-system-governance.test.js`:
  - `apps/web/src/components/**/*.astro` 안 raw hex (`#[0-9a-f]{3,6}`) 발견 시 fail (단, 토큰 정의 파일 + 주석 제외).
  - `style="..."` 안 `color:` `font-size:` `padding:` `margin:` 직접 값 발견 시 fail (단, `var(--...)` 참조는 OK).
- `tests/unit/design-tokens-contract.test.js`: 모든 expected semantic token 이름 존재 검증.

### D6. **마이그레이션 점진적**

- 본 phase 에서는 **HomeIsland 1개만** 신규 컴포넌트로 교체 (패턴 검증).
- 나머지 6 island 마이그레이션은 후속 plan (`design-system-migration.md`).

---

## 4. 위험

| 위험 | 강도 | 완화 |
|---|---|---|
| 시각 회귀 | 🔴 높음 | Playwright 스크린샷 baseline + 시각 diff. 컴포넌트 출력 클래스를 globals.css 기존 클래스와 동일하게 유지. |
| 클래스 이름 충돌 | 🟡 중 | 신규 토큰은 `--color-*` prefix, 기존 `--accent-*` `--bg-*` 와 분리. |
| Tailwind config 중복 키 | 🟢 낮음 | 기존 `brand-*` 키 유지하면서 추가만. |
| 거버넌스 lint false positive | 🟡 중 | 컴포넌트 정의 파일 (`Button.astro` 등) 은 토큰 사용이 정상이므로 화이트리스트. lint 는 `pages/`, `components/tabs/` 만 스캔. |
| `/design-system` 빌드 시 트래픽 영향 | 🟢 낮음 | 별도 page → 메인 번들 분리. |

---

## 5. 컴포넌트 인벤토리 (감사)

### 기존 globals.css 에서 추출할 컴포넌트 (38개)

| 카테고리 | 클래스 → 컴포넌트 |
|---|---|
| Action | `.btn`, `.btn-primary/secondary/outline/icon/full` → **Button** (5 variant × 3 size) |
| Form | `.form-group input/select`, `.form-row` → **Input, Select, FormField, FormRow** |
| Form | (없음) → **Textarea, Checkbox, Radio, Switch** (신규) |
| Display | `.card`, `.card-title` → **Card** (header/body/footer slot) |
| Display | `.badge`, `.badge.indigo/emerald/amber/rose` → **Badge** (5 variant × 2 size) |
| Display | (없음) → **Avatar, Tooltip** (신규) |
| Feedback | `.modal-overlay`, `.modal-content` → **Modal** (size: sm/md/lg) |
| Feedback | (없음) → **Toast, Alert** (신규) |
| Navigation | `.nav-tabs`, `.nav-tab`, `.sub-tabs`, `.sub-tab` → **Tabs** (top/sub) |
| Navigation | (없음) → **Breadcrumb, Pagination** (이번 phase X — 사용 케이스 없음) |
| Layout | (없음) → **Container, Stack, Section, Grid, Divider** (신규) |
| Pattern | `.tab-content`, `.qa-card` 등 → **PageHeader, EmptyState, FormSection** |

### 우선순위 — 본 phase 포함

**필수 (Slice 2-4):** Button, Input, Select, Textarea, Checkbox, Radio, Switch, Card, Badge, Alert, Modal, Tabs.
**Layout (Slice 3):** Container, Stack, Section, Grid, Divider.
**Pattern (Slice 4):** PageHeader, EmptyState, FormSection, LoadingSkeleton, ErrorState.

**연기 (다음 plan):** Toast (JS API), Tooltip, Avatar, Breadcrumb, Pagination, Table.

---

## 6. 파일 구조 (목표)

```
apps/web/src/
├── styles/
│   ├── tokens/
│   │   ├── primitive.css      # 신규 — raw color/value
│   │   ├── semantic.css       # 신규 — semantic alias (color-text-primary 등)
│   │   ├── spacing.css        # 신규 — --space-1..12
│   │   └── typography.css     # 신규 — --font-size-*, --font-weight-*, --line-height-*
│   ├── globals.css            # 기존 — 상단에 tokens/* import 추가
│   └── dark.css               # 기존
├── components/
│   ├── tabs/                  # 기존 island (HomeIsland만 신규 컴포넌트로 교체)
│   ├── ui/                    # 신규 — primitives
│   │   ├── Button.astro
│   │   ├── Input.astro
│   │   ├── Select.astro
│   │   ├── Textarea.astro
│   │   ├── Checkbox.astro
│   │   ├── Radio.astro
│   │   ├── Switch.astro
│   │   ├── Card.astro
│   │   ├── Badge.astro
│   │   ├── Alert.astro
│   │   ├── Modal.astro
│   │   └── Tabs.astro
│   ├── layout/                # 신규 — layout primitives
│   │   ├── Container.astro
│   │   ├── Stack.astro
│   │   ├── Section.astro
│   │   ├── Grid.astro
│   │   └── Divider.astro
│   └── patterns/              # 신규 — page-level patterns
│       ├── PageHeader.astro
│       ├── EmptyState.astro
│       ├── FormSection.astro
│       ├── LoadingSkeleton.astro
│       └── ErrorState.astro
├── pages/
│   ├── design-system.astro    # 신규 — 메인 쇼케이스
│   └── design-system/         # 신규 — 카테고리별 sub page
│       ├── tokens.astro
│       ├── components.astro
│       ├── patterns.astro
│       └── guidelines.astro
└── tailwind.config.js         # 기존 — extend 추가

docs/design-system/             # 신규
├── usage.md                   # 새 페이지 체크리스트
├── components.md              # 컴포넌트 사용 규칙
└── changelog.md               # 디자인 시스템 변경 이력

tests/
├── unit/design-system/         # 신규
│   ├── button.test.js
│   ├── card.test.js
│   ├── badge.test.js
│   └── (각 컴포넌트별)
├── integration/
│   ├── design-tokens-contract.test.js  # 신규
│   └── design-system-governance.test.js # 신규
```

---

## 7. 성공 지표

| 지표 | 목표 |
|---|---|
| 테스트 PASS | unit 175→195+ / integration 37→40+ / playwright 0 fail |
| 토큰 contract | 30+ semantic token 정의, 전부 primitive 참조 |
| 컴포넌트 12개 | UI 9 + Layout 5 + Pattern 5 = 19개 컴포넌트 |
| /design-system 라우트 | live preview + props 표 + 코드 샘플 100% 컴포넌트 커버 |
| HomeIsland 회귀 0 | 시각 baseline 동일, 5 critical guard PASS |
| 거버넌스 lint | new component 0 violation |
| 다크 모드 | 모든 컴포넌트 light/dark 양쪽 검증 |

---

## 8. 후속 plan (이번 phase 비포함)

1. **design-system-migration.md** — Profile/Payroll/Overtime/Leave/Reference/Settings/Feedback Island 마이그레이션 (6개 island).
2. **design-system-figma.md** — Figma 라이브러리 동기화.
3. **design-system-toast.md** — Toast / Tooltip / Avatar 추가.
