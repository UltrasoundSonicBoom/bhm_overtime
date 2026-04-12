# Spec: Ops Orchestrator Live Activation (Phase 14)

## Goal

비개발자 자연어 -> 규정 수정 -> ops-reviewer 승인 흐름을 연결한다.
Review queue UI를 구축하고, draft->review->published 전환을 완성한���.

## Related Tasks

- **B12**: Define AI draft generation contracts
- **B13**: Add review queue and preview handoff

## Background

현재 상태:
- `adminOps.ts`에 content CRUD, approval_tasks, audit_logs API 완비
- `admin-ops.ts`에 canTransitionStatus, resolveApprovalDecision 로직 완비
- `ops-orchestrator.md`, `content-editor.md`, `ops-reviewer.md` 에이전트 정의 완료
- 부족한 것: review queue UI, auto-publish 차단 확인, 전체 플로우 통합 테스트

## Acceptance Criteria

### AC-1: Review Queue UI 페이지
- `admin/review-queue.html` 페이지 생성
- 검토 대기 중인 approval_tasks(status=pending) 목록 표시
- 각 항목에서 승인/반려 버튼으로 의사결정 가능
- 반려 시 사유 입력 필드

### AC-2: Draft -> Review -> Published 전체 플��우
- 콘텐츠 생성 시 반드시 draft 상태
- review 요청 시 approval_task 생성
- 승인 시 published 전환 + audit_log 기록
- 반려 시 draft로 복귀

### AC-3: Auto-publish 차단
- draft -> published 직접 전환 불가 (review 단계 필수)
- API 레벨에서 canTransitionStatus가 draft->published 차단

### AC-4: Ops 에이전트 프롬프트에 API 경로 반영
- ops/prompts/ 에 운영 프롬프트 파일 생성
- content-editor, ops-reviewer가 참조할 API 계약 정리

## Test Scenarios

| ID | Description | Type |
|----|-------------|------|
| T14-1 | review-queue.html 파일 존재 | unit |
| T14-2 | review-queue.html에 approval 목록 로드 로직 존재 | unit |
| T14-3 | review-queue.html에 승인/반려 UI 존재 | unit |
| T14-4 | adminOps.ts의 canTransitionStatus가 draft->published 차단 | unit |
| T14-5 | admin-ops.ts에서 draft->review->published 전환 허용 | unit |
| T14-6 | admin-ops.ts에서 published->review 재검토 가능 | unit |
| T14-7 | ops/prompts/ 에 운영 프롬프트 존재 | unit |
| T14-8 | admin/index.html에서 review-queue 링크 존재 | unit |
| T14-9 | review-queue.html에 반려 사유 입력 필드 존재 | unit |
| T14-10 | 기존 admin 기능 회귀 없음 | regression |

## Files Touched

- `admin/review-queue.html` (NEW)
- `admin/review-queue.js` (NEW)
- `ops/prompts/content-edit-contract.md` (NEW)
- `admin/index.html` (MODIFY - add link)
- `tests/phase14-ops-orchestrator.js` (NEW)
