# Spec: B7 -- Notices/FAQ DB-based Migration

## Goal

공지와 FAQ를 Admin/DB 기반으로 이관. 기존 공개 경로 유지, published 상태만 공개 노출, fallback 동작 유지.

## Implementation

### Public FAQ API (server/src/routes/faq.ts)
- GET /api/faq: is_published=true인 FAQ만 반환 (이미 구현됨)
- GET /api/faq/search: 시맨틱 검색 (is_published=true 필터)

### Content-based notices
- Admin에서 content_type='notice'로 공지 관리
- published 상태만 공개 웹에 노출
- content_entries 테이블 기반

### Fallback
- DB 연결 실패 시 기존 정적 데이터 사용 가능
- data.js의 FAQ/공지 데이터가 fallback 역할

### Admin management
- FAQ: /api/admin/faqs (CRUD, 버전별)
- 공지: /api/admin/content (contentType='notice')

## Files
- server/src/routes/faq.ts (public FAQ, 이미 구현)
- server/src/routes/adminOps.ts (admin CRUD, 이미 구현)
- admin/admin.js (UI, 이미 구현)
