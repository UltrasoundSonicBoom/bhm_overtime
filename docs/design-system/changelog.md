# Design System Changelog

## 2026-04-28 — v0.1 (Initial)

신규:
- 4 token 파일 (primitive, semantic, spacing, typography)
- 13 UI 컴포넌트 (Button, Badge, Input, Select, Textarea, Checkbox, Radio, Switch, FormField, Card, Alert, Modal, Tabs)
- 5 layout 컴포넌트 (Container, Stack, Section, Grid, Divider)
- 5 pattern 컴포넌트 (PageHeader, EmptyState, FormSection, LoadingSkeleton, ErrorState)
- /design-system 쇼케이스 라우트 (4 sub-page)
- 거버넌스 lint (raw hex / inline style 금지)
- HomeIsland 레퍼런스 마이그레이션

호환:
- 기존 globals.css `.btn`, `.card`, `.badge`, `.modal-overlay`, `.nav-tabs/.sub-tabs`, `.form-group` 등 클래스 유지.
- 기존 `brand-*` Tailwind utility 유지.

## 다음 단계

- 6 island (Profile, Payroll, Overtime, Leave, Reference, Settings, Feedback) 마이그레이션 — 별도 plan.
- Toast / Tooltip / Avatar 추가 — 별도 plan.
- Figma 라이브러리 동기화 — 별도 plan.
