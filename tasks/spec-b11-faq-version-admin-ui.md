# Spec: B11 -- FAQ + Regulation Version Admin UI

## Goal

Admin UI에서 FAQ CRUD와 regulation version 초안 생성/복제/활성화가 동작하며, active 전환 전 review 단계가 존재한다.

## Acceptance Criteria

1. FAQ CRUD Admin UI 동작
   - FAQ 목록 조회 (버전별)
   - FAQ 생성 (카테고리, 질문, 답변, 근거조항, 공개여부)
   - FAQ 수정 (기존 FAQ 편집)
   - FAQ 폼 초기화

2. Regulation version 초안 생성/복제 가능
   - 새 버전 생성 (연도, 제목, 효력일, source_files)
   - 기존 버전 복제 (FAQ 포함)
   - 버전 목록 표시 (상태 포함)

3. Active 전환 전 review 단계
   - draft -> review -> active 전환 흐름
   - 직접 draft -> active 전환 시 review 경유 강제
   - 상태 전환 audit log 기록

## Implementation Details

### Admin UI (admin/admin.js)
- 버전 복제 버튼 추가 (기존 FAQ를 새 버전으로 복사)
- 버전 상태 전환에 review 단계 추가

### Backend (server/src/routes/adminOps.ts)
- POST /api/admin/versions/:id/duplicate -- 버전 복제 (FAQ 포함)
- PATCH /api/admin/versions/:id/status -- review 상태 추가

## Files Modified
- admin/index.html (review 버튼 추가)
- admin/admin.js (복제 기능, review 전환)
- server/src/routes/adminOps.ts (duplicate 엔드포인트, review 상태)
- server/src/db/schema.ts (regulation_status enum에 review 추가 필요 시)
