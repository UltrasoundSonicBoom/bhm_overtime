# Design System File Map

> 브랜치: `design-system` | 버전: v0.1 | 기준일: 2026-04-28

---

## 전체 구조 한눈에 보기

```
apps/web/
├── tailwind.config.js                         # ds.* 유틸리티 + spacing/fontSize/ring 토큰 확장
└── src/
    ├── styles/
    │   ├── tokens/
    │   │   ├── primitive.css                  # raw 값 (색상 팔레트, white, dark-*)
    │   │   ├── semantic.css                   # 의미 alias + dark mode override
    │   │   ├── spacing.css                    # --space-0 ~ --space-20 (4px 그리드)
    │   │   └── typography.css                 # font-size / weight / line-height 스케일
    │   ├── globals.css                        # token import + legacy 클래스 유지
    │   └── dark.css                           # html[data-theme="dark"] override
    ├── components/
    │   ├── ui/                                # UI 프리미티브 (13개)
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
    │   │   ├── Tabs.astro
    │   │   └── FormField.astro
    │   ├── layout/                            # 레이아웃 프리미티브 (5개)
    │   │   ├── Container.astro
    │   │   ├── Stack.astro
    │   │   ├── Section.astro
    │   │   ├── Grid.astro
    │   │   └── Divider.astro
    │   └── patterns/                          # 페이지 레벨 패턴 (5개)
    │       ├── PageHeader.astro
    │       ├── EmptyState.astro
    │       ├── ErrorState.astro
    │       ├── FormSection.astro
    │       └── LoadingSkeleton.astro
    └── pages/
        ├── design-system.astro                # /design-system 메인 랜딩
        └── design-system/
            ├── tokens.astro                   # 색상·타이포·여백·반경 팔레트
            ├── components.astro               # live preview + variant 매트릭스
            ├── patterns.astro                 # 패턴 예시
            └── guidelines.astro              # 사용 가이드 + governance 룰

tests/
├── unit/design-system/                        # 컴포넌트 단위 테스트 (9개)
│   ├── button.test.js
│   ├── badge.test.js
│   ├── card.test.js
│   ├── form.test.js
│   ├── alert.test.js
│   ├── modal.test.js
│   ├── tabs.test.js
│   ├── layout.test.js
│   └── patterns.test.js
└── integration/
    ├── design-tokens-contract.test.js         # 30+ semantic token 존재 검증
    ├── design-system-governance.test.js       # raw hex / inline style 금지 lint
    └── design-system-showcase.test.js         # /design-system 빌드 페이지 구조 검증

docs/design-system/                            # 이 디렉토리
├── file-map.md                                # 이 파일
├── usage.md                                   # 새 페이지 체크리스트 + 컴포넌트 선택 트리
├── components.md                              # 각 컴포넌트 Props 표 + 사용 규칙
└── changelog.md                               # v0.1 변경 이력
```

---

## 1. 디자인 토큰

### primitive.css
원시 값만 정의. 의미 없음. 다른 파일에서 직접 import 금지.

| 변수 | 값 | 용도 |
|------|----|------|
| `--gray-50` ~ `--gray-900` | `#f9fafb` ~ `#111827` | 중립 팔레트 |
| `--blue-50` ~ `--blue-600` | `#eff6ff` ~ `#5558e6` | 브랜드/액션 팔레트 |
| `--red-50` ~ `--red-600` | `#fef2f2` ~ `#dc2626` | 오류 팔레트 |
| `--amber-50` ~ `--amber-600` | `#fffbeb` ~ `#d97706` | 경고 팔레트 |
| `--emerald-50` ~ `--emerald-600` | `#ecfdf5` ~ `#059669` | 성공 팔레트 |
| `--neo-cream` | `#fdfcf7` | neo 배경 |
| `--neo-ink` | `#1a1a2e` | neo 텍스트 |
| `--white` | `#ffffff` | 순수 흰색 |
| `--dark-950/850/800` | `#0d0d0d` / `#1a1a1a` / `#262626` | 다크모드 표면 |

### semantic.css
primitive를 참조하는 의미 계층. **컴포넌트에서 직접 사용하는 토큰**.

| 카테고리 | 변수 | 참조 |
|----------|------|------|
| 텍스트 | `--color-text-primary` | `--gray-900` |
| 텍스트 | `--color-text-secondary` | `--gray-700` |
| 텍스트 | `--color-text-muted` | `--gray-500` |
| 텍스트 | `--color-text-disabled` | `--gray-400` |
| 텍스트 | `--color-text-link` | `--blue-500` |
| 텍스트 | `--color-text-inverse` | `--white` |
| 배경 | `--color-bg-page` | `--gray-50` |
| 배경 | `--color-bg-surface` | `--white` |
| 배경 | `--color-bg-subtle` | `--gray-100` |
| 배경 | `--color-bg-hover` | `--gray-50` |
| 배경 | `--color-bg-overlay` | `rgba(0,0,0,0.5)` |
| 브랜드 | `--color-brand-primary` | `--blue-500` |
| 브랜드 | `--color-brand-primary-hover` | `--blue-600` |
| 테두리 | `--color-border-default` | `--gray-200` |
| 테두리 | `--color-border-strong` | `--gray-400` |
| 테두리 | `--color-border-focus` | `--blue-500` |
| 상태 | `--color-status-success` | `--emerald-600` |
| 상태 | `--color-status-warning` | `--amber-600` |
| 상태 | `--color-status-error` | `--red-600` |
| 상태 | `--color-status-info` | `--blue-500` |
| 상태 배경 | `--color-status-{*}-bg` | 각 -50 |
| 포커스링 | `--focus-ring-color` | `--blue-500` |
| 포커스링 | `--focus-ring-width` | `2px` |
| 포커스링 | `--focus-ring-offset` | `2px` |

### spacing.css
`--space-N` = N × 4px

| 변수 | 값 |
|------|----|
| `--space-0` | 0 |
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |
| `--space-20` | 80px |

### typography.css

| 변수 | font-size | font-weight | line-height |
|------|-----------|-------------|-------------|
| `display` | 40px | 800 | 1.2 |
| `h1` | 32px | 700 | 1.25 |
| `h2` | 24px | 700 | 1.3 |
| `h3` | 20px | 600 | 1.35 |
| `h4` | 18px | 600 | 1.4 |
| `body-lg` | 16px | 400 | 1.6 |
| `body-md` | 14px | 400 | 1.6 |
| `body-sm` | 13px | 400 | 1.55 |
| `label` | 13px | 500 | 1.4 |
| `caption` | 12px | 400 | 1.4 |

---

## 2. Tailwind 유틸리티 치트시트

```
# 색상 (text / bg / border prefix)
text-ds-text-primary / secondary / muted / disabled / link / inverse
bg-ds-bg-page / surface / subtle / hover / overlay
bg-ds-brand-primary / primary-hover
border-ds-border-default / strong / focus
text-ds-status-success / warning / error / info
bg-ds-status-success-bg / warning-bg / error-bg / info-bg

# 타이포그래피
text-ds-display / h1 / h2 / h3 / h4
text-ds-body-lg / body-md / body-sm
text-ds-label / caption

# 여백 (표준 Tailwind scale — p-1=4px, p-2=8px ...)
p-1  p-2  p-3  p-4  p-6  p-8  p-10  p-12
gap-1 gap-2 gap-3 gap-4 gap-6 gap-8

# 반경
rounded-brand-sm   (4px)
rounded-brand-md   (8px)
rounded-brand-lg   (12px)
rounded-brand-xl   (16px)
rounded-brand-full (9999px)

# 포커스링 (Button 등 기본 포함)
focus-visible:ring-ds  focus-visible:ring-ds-width  focus-visible:ring-offset-ds
```

---

## 3. UI 컴포넌트 Props 요약

### Button
```astro
<Button
  variant="primary|secondary|tertiary|danger|ghost"
  size="sm|md|lg"
  disabled={false}
  loading={false}
  type="button|submit|reset"
  iconLeft="..."
  iconRight="..."
  fullWidth={false}
  ariaLabel="..."
  onclick="..."
/>
```

### Input / Textarea
```astro
<Input id="..." name="..." type="text|email|date|..." placeholder="..." value="..."
  invalid={false} disabled={false} readonly={false}
  ariaLabel="..." ariaDescribedBy="..." />

<Textarea id="..." name="..." rows={4} placeholder="..." value="..."
  invalid={false} disabled={false} />
```

### Select
```astro
<Select id="..." name="..."
  options={[{ value: '', label: '선택' }, { value: 'rn', label: '간호사' }]}
  value="..." invalid={false} disabled={false} />
```

### Checkbox / Radio
```astro
<Checkbox id="..." name="..." label="..." checked={false}
  indeterminate={false} disabled={false} value="..." />

<Radio id="..." name="..." label="..." checked={false}
  disabled={false} value="..." />
```

### Switch
```astro
<Switch id="..." label="..." checked={false} disabled={false} />
```

### FormField
```astro
<FormField label="이름" htmlFor="name" required error="필수 항목입니다" helper="도움말">
  <Input id="name" ... />
</FormField>
```

### Card
```astro
<Card elevated={false}>
  <span slot="header">헤더</span>
  <!-- 본문 -->
  <div slot="footer">푸터</div>
</Card>
```

### Badge
```astro
<Badge variant="neutral|success|warning|error|info" size="sm|md">텍스트</Badge>
```

### Alert
```astro
<Alert variant="info|success|warning|error" title="제목" dismissible={false}>
  메시지 내용
</Alert>
```

### Modal
```astro
<Modal id="my-modal" size="sm|md|lg" title="제목" open={false}>
  본문 내용
  <div slot="footer">...</div>
</Modal>
<!-- JS로 open/close: classList.add/remove('hidden', 'flex') -->
```

### Tabs
```astro
<Tabs
  tabs={[{ id: 'tab1', label: '탭1' }, { id: 'tab2', label: '탭2' }]}
  activeTab="tab1"
  variant="top|sub"
/>
```

---

## 4. 레이아웃 Props 요약

```astro
<Container size="sm|md|lg|xl|full" padding={true} />

<Stack direction="row|column" gap={0|1|2|3|4|6|8|10|12}
  align="start|center|end|stretch" justify="start|center|end|between" />

<Section level={1|2|3} gap={4|6|8} />

<Grid cols={1|2|3|4} gap={0|1|2|3|4|6|8|10|12} />

<Divider spacing={1|2|3|4|6|8} direction="horizontal|vertical" />
```

---

## 5. 패턴 Props 요약

```astro
<PageHeader title="페이지 제목" description="설명" />

<EmptyState icon="📄" title="없음" description="설명">
  <Button slot="action">액션</Button>
</EmptyState>

<ErrorState title="오류" message="설명">
  <Button slot="action">재시도</Button>
</ErrorState>

<FormSection title="섹션명" description="설명"
  collapsible={false} defaultOpen={true} />

<LoadingSkeleton count={3} height="80px" />
```

---

## 6. 거버넌스 룰

### 금지 사항 (governance 테스트가 fail 처리)
- `style="color: #..."` — raw hex 색상 직접 사용
- `style="font-size: ...px"` — raw 폰트 크기
- `style="padding/margin: ...px"` — raw 여백 (단, `var(--...)` 참조는 허용)
- `components/ui/*.astro`, `components/layout/*.astro`, `components/patterns/*.astro` 내 raw hex (주석 및 토큰 정의 파일 제외)

### 허용
- `class="text-ds-body-md"` — Tailwind ds.* 유틸리티
- `style="color: var(--color-text-primary)"` — CSS 변수 참조
- `class="p-4 gap-3"` — 표준 Tailwind spacing

### 새 기능 PR 체크리스트
```
토큰
☐ style="color: #..." 없음?
☐ style="font-size: ...px" 없음?
☐ style="padding/margin: ...px" 없음?

컴포넌트
☐ <button> 직접 X → <Button>
☐ <input> 직접 X → <FormField> + <Input>
☐ 카드 → <Card>   모달 → <Modal>

상태 화면
☐ 빈 상태 → <EmptyState>
☐ 로딩 → <LoadingSkeleton>
☐ 오류 → <ErrorState>

접근성
☐ 아이콘 버튼에 ariaLabel?
☐ 에러 메시지에 FormField error 사용? (role="alert" 자동)
☐ 다크 모드 정상?
```

---

## 7. 후속 작업 (v0.2+)

| 항목 | 설명 |
|------|------|
| Dark hover contrast | `--color-brand-primary-hover` → lighter blue (현재 어두워서 다크모드 대비 부족) |
| 미이그레이션 | FeedbackIsland, LeaveIsland, OvertimeIsland, PayrollIsland, ProfileIsland, ReferenceIsland, SettingsIsland (6개) |
| 추가 컴포넌트 | Toast, Tooltip, Avatar, Breadcrumb, Pagination |
| Figma 동기화 | Code Connect 매핑 |
