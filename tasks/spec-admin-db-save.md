# Spec: Admin DB Save for Regulation Constants (Phase 13)

## Goal

`admin/union_regulation_admin.html`의 현재 클립보드 전달 방식을 API 저장으로 업그레이드한다.
Admin에서 규정 상수를 직접 DB에 저장하고, DB에서 불러올 수 ��도록 한다.

## Related Tasks

- **B11**: Implement FAQ and regulation version admin flows

## Background

현재 상태:
- `union_regulation_admin.js`가 `nurse_regulation.json`을 fetch로 로드하여 비교 표시
- 불일치 발견 시 "AI 리포트 JSON 복사" 버튼으로 클립보드 전달
- DB 저장/로드 기능 없음
- Phase 12에서 `seed-nurse-regulation.ts`와 `/api/admin/regulation-rules` 엔드포인트 추가됨

## Acceptance Criteria

### AC-1: Admin UI에서 DB 규정 데이터 로드
- 페이지 로드 시 `/api/admin/regulation-rules?versionId=N`으로 DB 데이터를 가져온다
- DB 데이터와 nurse_regulation.json 비교 표시 (기존 기능 유지)
- DB에 데이터가 없으면 기존 JSON fallback 동작

### AC-2: Admin UI에서 규정 상수 DB 저장
- "DB에 저장" 버튼으로 현재 규정 상수를 API를 통해 DB에 저장
- 저장 시 `/api/admin/regulation-rules` POST 호출
- 성공/실패 피드백 표시

### AC-3: 규정 상수 개별 편집
- 상수 값을 인라인으로 편집 가능
- 편집 후 저장 시 해당 rule만 업데이트
- 변경 이력이 audit_log에 남음

### AC-4: API 엔드포인트 확장
- POST `/api/admin/regulation-rules` — 규정 rule 생성/업데이트
- PUT `/api/admin/regulation-rules/:id` — 개별 rule 수정
- 각 변경마다 audit_log 생성

### AC-5: 기존 기능 회귀 없음
- 기존 클립보드 복사 기능 유지
- nurse_regulation.json 비교 기능 유지
- 페이지 레이아웃/스타일 유지

## Test Scenarios

| ID | Description | Type |
|----|-------------|------|
| T13-1 | union_regulation_admin.js에 DB 로드 로직 존재 | unit |
| T13-2 | union_regulation_admin.js에 DB 저장 로직 존재 | unit |
| T13-3 | adminOps.ts에 POST regulation-rules 엔드포인트 존재 | unit |
| T13-4 | adminOps.ts에 PUT regulation-rules/:id 엔드포인트 존재 | unit |
| T13-5 | 저장 시 audit_log 생성 로직 존�� | unit |
| T13-6 | DB 데이터 없을 때 JSON fallback 동작 | unit |
| T13-7 | 기존 클립보드 기능 유지 | regression |
| T13-8 | 기존 비교 테이블 렌더링 유지 | regression |

## Files Touched

- `admin/union_regulation_admin.js` (MODIFY)
- `server/src/routes/adminOps.ts` (MODIFY)
- `tests/phase13-admin-db-save.js` (NEW)
- `tasks/spec-admin-db-save.md` (NEW — this file)
