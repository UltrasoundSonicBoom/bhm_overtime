# Content Edit API Contract

운영팀 에이전트(content-editor, ops-reviewer)가 사용하는 Admin API 계약 요약.

## Base URL

```
/api/admin
```

모든 요청에 Admin 인증 필요 (requireAdmin 미들웨어).

## Content 관리

### 콘텐츠 생성 (Draft)
```
POST /api/admin/content
Body: { contentType, title, slug?, body, summary?, metadata? }
Response: { result: { entry, revision } }
```
- 항상 status=draft로 생성됨
- revision_number=1 자동 생성

### 콘텐츠 목록 조회
```
GET /api/admin/content
Response: { results: [...] }
```

### 콘텐츠 상세 조회
```
GET /api/admin/content/:id
Response: { result: { entry, revisions, approvals, auditLogs } }
```

### 새 리비전 생성
```
POST /api/admin/content/:id/revisions
Body: { body, summary?, metadata? }
Response: { result: { entry, revision } }
```

### 상태 전환
```
PATCH /api/admin/content/:id/status
Body: { status: 'draft' | 'review' | 'published' | 'archived' }
```

허용된 전환:
- draft -> review, archived
- review -> draft, published, archived
- published -> review, archived
- archived -> draft

**중요: draft -> published 직접 전환 불가. review 단계 필수.**

### 검토 요청
```
POST /api/admin/content/:id/request-review
Body: { assignedTo?: uuid }
Response: { result: approval_task }
```
- 자동으로 status=review 전환
- approval_task pending 생성

## FAQ 관리

### FAQ 목록
```
GET /api/admin/faqs?versionId=N
```

### FAQ 생성
```
POST /api/admin/faqs
Body: { versionId, category, question, answer, articleRef?, sortOrder?, isPublished? }
```

### FAQ 수정
```
PUT /api/admin/faqs/:id
Body: { category, question, answer, articleRef?, sortOrder?, isPublished? }
```

## 검토 큐 (Approvals)

### 대기 목록
```
GET /api/admin/approvals?status=pending
```

### 승인/반려 결정
```
POST /api/admin/approvals/:id/decision
Body: { decision: 'approved' | 'rejected', note?: string }
```

승인 시: content -> published, revision -> published
반려 시: content -> draft, revision -> draft

## Regulation Rules

### 규정 규칙 조회
```
GET /api/admin/regulation-rules?versionId=N&ruleType=shift_rules
```

### 규정 규칙 생성
```
POST /api/admin/regulation-rules
Body: { versionId, ruleType, ruleKey, ruleData, ruleScope?, description? }
```

### 규정 규칙 수정
```
PUT /api/admin/regulation-rules/:id
Body: { ruleType?, ruleKey?, ruleData?, ruleScope?, description? }
```

## Regulation Versions

### 버전 목록
```
GET /api/admin/versions
```

### 버전 생성
```
POST /api/admin/versions
Body: { year, title, effectiveDate?, sourceFiles? }
```

### 버전 상태 전환
```
PATCH /api/admin/versions/:id/status
Body: { status: 'draft' | 'active' | 'archived' }
```
- active 전환 시 기존 active 버전은 자동 archived

## Audit Logs

### 감사 로그 조회
```
GET /api/admin/audit-logs?entityType=X&entityId=Y
```

## 운영 원칙

1. 모든 콘텐츠 변경은 audit_logs에 자동 기록
2. 콘텐츠 생성은 항상 draft 상태
3. published 전환은 반드시 approval_task 승인 경유
4. 사람 승인 없는 auto-publish 차단
