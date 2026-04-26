# Track Checkpoint (2026-04-10)

## Track A: RAG Completion

- Source draft version: `regulation_versions.id = 5`
- Regulation chunks: `145`
- Regulation embeddings: `145 / 145`
- FAQ draft copy for version 5: `50 / 50` embeddings

### Verification snapshot

Command:

```bash
cd server && npm run rag:verify -- --version-id 5
```

Current routing result:

- `faq-direct`
  - 온콜 출근하면 몇 시간 인정되나요?
  - 배우자 출산휴가는 며칠인가요?
  - 연차는 최대 며칠까지 쌓이나요?
  - 가족돌봄 유급휴가는 며칠인가요?
- `regulation-doc`
  - 야간근무를 많이 하면 리커버리 데이가 생기나요?
  - 공휴일 근무하면 얼마나 가산되나요?

### Notes

- Korean compact compounds like `리커버리데이` are now boosted even when the query arrives as `리커버리 데이`.
- Time-intent questions now prefer `시간 인정` answers over `수당 얼마` answers.
- Maximum-bound questions such as annual leave accumulation now prefer the `최대 25일` FAQ.

## Track B: Admin & Content Operations

### Implemented

- `content_entries`
- `content_revisions`
- `approval_tasks`
- `audit_logs`
- `/api/admin/dashboard`
- `/api/admin/content`
- `/api/admin/content/:id`
- `/api/admin/content/:id/revisions`
- `/api/admin/content/:id/request-review`
- `/api/admin/approvals`
- `/api/admin/approvals/:id/decision`
- `/api/admin/audit-logs`

### Workflow rules now enforced

- Review requests require a current revision.
- Duplicate pending approval requests for the same revision are blocked.
- Review requests update both entry status and current revision status to `review`.
- Approval decisions can only be made once per task.
- Approval decisions update entry status, revision status, published revision, and audit logs together.
- Sibling pending approval tasks for the same revision are cancelled on final decision.

### Smoke verification

Command:

```bash
cd server && npm run admin:smoke
```

Verified flow:

1. Temporary admin user bootstrap
2. Dashboard read
3. Content entry create
4. Review request
5. Approval decision
6. Published status confirmation
7. Audit log confirmation
8. Cleanup

Cleanup check after smoke run:

- `content_entries = 0`
- `content_revisions = 0`
- `approval_tasks = 0`
- `audit_logs = 0`
- `admin_users = 0`
