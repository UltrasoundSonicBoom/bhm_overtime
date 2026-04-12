# Spec: B3 -- Admin API Contracts

## Goal

Admin API의 regulation version CRUD/상태전환, FAQ CRUD, role-based access, audit 기록 지점을 계약 문서로 정의한다.

## Endpoints

### Regulation Versions
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/admin/versions | 버전 목록 | admin |
| POST | /api/admin/versions | 새 버전 생성 (draft) | admin |
| PATCH | /api/admin/versions/:id/status | 상태 전환 | admin |
| POST | /api/admin/versions/:id/duplicate | 버전 복제 (FAQ 포함) | admin |

### FAQ
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/admin/faqs?versionId=N | FAQ 목록 (버전별) | admin |
| POST | /api/admin/faqs | FAQ 생성 | admin |
| PUT | /api/admin/faqs/:id | FAQ 수정 | admin |

### Content
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/admin/content | 콘텐츠 목록 | admin |
| GET | /api/admin/content/:id | 콘텐츠 상세 | admin |
| POST | /api/admin/content | 콘텐츠 생성 | admin |
| POST | /api/admin/content/:id/revisions | 새 리비전 | admin |
| PATCH | /api/admin/content/:id/status | 상태 전환 | admin |
| POST | /api/admin/content/:id/request-review | 검토 요청 | admin |

### Approvals
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/admin/approvals | 승인 목록 | admin |
| POST | /api/admin/approvals/:id/decision | 승인/반려 결정 | admin |

### Dashboard & Audit
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/admin/dashboard | 대시보드 집계 | admin |
| GET | /api/admin/audit-logs | 감사 로그 | admin |

### Regulation Rules
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/admin/regulation-rules?versionId=N | 규칙 목록 | admin |
| POST | /api/admin/regulation-rules | 규칙 생성 | admin |
| PUT | /api/admin/regulation-rules/:id | 규칙 수정 | admin |

## Role-Based Access
- 모든 admin 엔드포인트는 `requireAdmin` 미들웨어를 통해 JWT + admin_users 테이블 확인
- admin_role: super_admin, hr_admin, union_admin, viewer
- viewer는 읽기 전용 (현재는 모든 admin이 전체 권한)

## Audit Points
- 모든 쓰기 요청은 `writeAuditLog`를 통해 audit_logs 테이블에 기록
- actor_user_id, actor_role, action, entity_type, entity_id, diff 포함

## Status Transitions

### Regulation Version
- draft -> active -> archived
- active 전환 시 기존 active 버전은 자동 archived

### Content Entry
- draft -> review -> published -> archived
- review -> draft (반려 시)
- archived -> draft (복원)
