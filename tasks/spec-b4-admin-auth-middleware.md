# Spec: B4 -- Admin Authorization and Audit Middleware

## Goal

Admin API 인증 없는 요청 차단(401/403), 쓰기 요청 audit_log insert, role 확장 포인트 유지.

## Implementation

### requireAdmin middleware (server/src/middleware/auth.ts)
- JWT 없는 요청: 401 반환
- JWT 유효하지만 admin_users에 없는 사용자: 403 반환
- 유효한 admin: userId, adminRole을 context에 설정

### Audit logging (server/src/routes/adminOps.ts)
- writeAuditLog 함수로 모든 쓰기 작업 기록
- actor_user_id, actor_role, action, entity_type, entity_id, diff

### Role extension
- admin_role enum: super_admin, hr_admin, union_admin, viewer
- 현재는 모든 admin이 전체 권한, 향후 role별 제한 추가 가능

## Files
- server/src/middleware/auth.ts
- server/src/routes/adminOps.ts
