---
name: smate-design-guard
description: "SNUHmate 디자인시스템 가드 워크플로우 — UI/CSS/Astro/HTML 변경 시 토큰·인라인·캘린더·다크모드 룰을 자동 검증. 'UI 바꿨어', 'CSS 손봤어', '디자인시스템 점검', '토큰 외 색 있는지', '인라인 스타일 검사', '디자인 가드' 등에 호출."
---

# SNUHmate Design Guard — UI 변경 룰 자동 검증

UI/CSS/Astro/HTML 변경 후 디자인시스템 룰 위반을 사전 차단한다. `pnpm check` + grep + `@smate-ds-guard` 에이전트 호출 조합.

## 언제 사용

- `apps/web/src/styles/`, `apps/web/public/tabs/`, `apps/web/src/client/*.js` 중 UI 영역 변경
- 새 컴포넌트·새 탭 추가
- `globals.css` / `tokens/*.css` 변경
- 다크모드 매칭 필요한 컬러 토큰 추가

## 단계

### Phase 1: 변경 파일 인벤토리

```bash
git diff --name-only origin/main..HEAD \
  | grep -E "\.(css|html|astro|js|ts)$" \
  | tee _workspace/dg_changed_files.txt
```

비어있으면 종료 — UI 변경 없음.

### Phase 2: 정적 검증 (parallel)

```bash
pnpm check 2>&1 | tee _workspace/dg_check.log
pnpm lint 2>&1 | tee _workspace/dg_lint.log
```

### Phase 3: `@smate-ds-guard` 호출

> 다음 변경의 디자인시스템 룰을 점검해 `_workspace/dg_report.md` 로 저장:
>
> - 변경 파일: `_workspace/dg_changed_files.txt`
>   산출물 포맷은 너의 system prompt 참조.

### Phase 4: 결과 판정

- 🔴 위반 ≥1 → 사용자에게 보고, 수정 후 재호출
- 🟢 0건 + `pnpm check`/`pnpm lint` 통과 → GO

## 통과 조건

- `_workspace/dg_changed_files.txt`, `dg_check.log`, `dg_lint.log`, `dg_report.md` 존재
- 🔴 0건
- `pnpm check` 통과
- `pnpm lint` 통과

## 에러 핸들링

- **`pnpm check` 또는 `pnpm lint` 실패** — 가드 결과 보고 전에 사용자에게 먼저 알림 + 수정 안내
- **다크모드 매칭 누락 의심** — 🟡 로 보고, 차단 X (사용자 판단)

## 참조

- 토큰: `apps/web/src/styles/tokens/{primitive,semantic,spacing,typography}.css`
- 글로벌: `apps/web/src/styles/globals.css`, `dark.css`
- 룰 메모리: `feedback_design_system_first.md`, `project_design_system_calendar_width.md`, `project_design_system_files.md`
