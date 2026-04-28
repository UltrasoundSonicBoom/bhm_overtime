# Design System Changelog

## 2026-04-28 — v0.1 (Initial)

신규:
- 4 token 파일 (primitive, semantic, spacing, typography)
- 13 UI 컴포넌트 (Button, Badge, Input, Select, Textarea, Checkbox, Radio, Switch, FormField, Card, Alert, Modal, Tabs)
- 5 layout 컴포넌트 (Container, Stack, Section, Grid, Divider)
- 5 pattern 컴포넌트 (PageHeader, EmptyState, FormSection, LoadingSkeleton, ErrorState)
- /design-system 쇼케이스 라우트 (4 sub-page)
- 거버넌스 lint (raw hex / raw px / raw rgba 금지 — HomeIsland 우선 적용)
- HomeIsland 레퍼런스 마이그레이션 (5 inline style → utility)

테스트:
- unit: 82 (design-system)
- integration: 93 (token contract + governance + showcase + JIT sentinel)

호환:
- 기존 globals.css `.btn`, `.card`, `.badge`, `.modal-overlay`, `.nav-tabs/.sub-tabs`, `.form-group` 등 클래스 유지.
- 기존 `brand-*` Tailwind utility 유지.

## 다음 단계

- 6 island (Profile, Payroll, Overtime, Leave, Reference, Settings, Feedback) 마이그레이션 — 별도 plan.
- Toast / Tooltip / Avatar 추가 — 별도 plan.
- Figma 라이브러리 동기화 — 별도 plan.

## 알려진 follow-up (non-blocking, v0.1.1+)

다음 항목은 v0.1 출하 후 별도 PR/plan 으로 추적:

- **Dark hover contrast** — `--color-brand-primary-hover` (dark) 가 `--blue-700` (#4f46e5) 으로 base (`--blue-500` #6366f1) 보다 어두움. 다크 모드 hover 는 보통 lighten 해야 함. `--blue-300` 또는 신규 `--blue-400` 으로 교체 검토.
- **Dead primitive** — `--dark-900` (`#0f0f11`) 가 `primitive.css` 에 정의됐으나 어디에서도 참조 안 됨. 제거 또는 사용처 추가.
- **Switch ARIA placement** — `role="switch"` 가 visual `<span>` 에 있고 focusable element 는 hidden `<input type="checkbox">`. AT 가 native checkbox role 로 announce 할 가능성. WAI-ARIA Switch 패턴 재검토.
- **Section vs PageHeader 폴더 경계** — `Section.astro` 는 layout/, `PageHeader.astro` 는 patterns/. 경계 기준이 약함. `components.md` 에 분류 기준 명시 필요.
