# Spec: B5 -- Admin Regulation/FAQ Operation Flow

## Goal

FAQ 생성/수정/게시 상태 변경, regulation version 생성/복제/active 전환, review 전환 및 검토 대기 상태가 동작한다.

## Implementation

### FAQ Operation Flow
- POST /api/admin/faqs: 새 FAQ 생성 (versionId, category, question, answer, articleRef, isPublished)
- PUT /api/admin/faqs/:id: FAQ 수정
- isPublished 필드로 공개/비공개 전환

### Regulation Version Flow
- POST /api/admin/versions: 새 버전 생성 (draft)
- POST /api/admin/versions/:id/duplicate: 버전 복제 (FAQ 포함, draft)
- PATCH /api/admin/versions/:id/status: 상태 전환 (draft/active/archived)
- active 전환 시 기존 active 자동 archived

### Review Flow (Content)
- draft -> review: POST /api/admin/content/:id/request-review
- review -> published: POST /api/admin/approvals/:id/decision (approved)
- review -> draft: POST /api/admin/approvals/:id/decision (rejected)

## Files
- server/src/routes/adminOps.ts
- admin/admin.js
