# Implementation Plan: Admin & Content Operating Platform

## Overview

현재 동작 중인 공개 웹과 API를 유지한 채, 운영자가 비개발자로서 공지/FAQ/규정/게시 상태를 관리할 수 있는 Admin 및 콘텐츠 운영 계층을 단계적으로 붙인다.

## Architecture Decisions

- Public web는 현재 구조를 유지하고 데이터 소스만 점진적으로 DB 중심으로 이동한다.
- Admin은 독립된 운영 표면으로 추가하되, 1차는 현재 레포 내부에 둔다.
- 콘텐츠는 "자유 페이지 편집"이 아니라 "구조화된 콘텐츠 객체"로 관리한다.
- AI는 초안 생성과 검증을 돕되, 게시 권한은 사람에게 둔다.

## Dependency Graph

```text
Admin auth/role policy
  -> admin API contracts
    -> content tables / revision tables / audit logs
      -> admin UI
        -> preview/review flow
          -> publish integration in public web

Existing regulation schema
  -> data parity validation
    -> partial migration from data.js
      -> admin editing of rules/faq/version
```

## Task List

### Phase 1: Foundation Docs and Content Topology

## Task 1: Align repository docs with actual codebase

**Description:** 현재 공개 웹, 규정 화면, API, 데이터 fallback 구조를 기준으로 SPEC, ROADMAP, 실행 계획 문서를 정리한다.

**Acceptance criteria:**
- [ ] 현재 구현된 기능과 미구현 기능이 문서에서 분리되어 있다.
- [ ] 실제 파일 경로와 명령 기준으로 문서가 업데이트된다.
- [ ] 향후 Admin/Content/AI Harness 방향이 문서에 반영된다.

**Verification:**
- [ ] 문서 검토: `SPEC.md`, `ROADMAP.md`, `tasks/plan.md`
- [ ] 실제 코드와 문서 간 모순이 없는지 수동 확인

**Dependencies:** None

**Files likely touched:**
- `SPEC.md`
- `ROADMAP.md`
- `tasks/plan.md`

**Estimated scope:** Small

## Task 2: Create content and ops directory conventions

**Description:** 운영 원본과 AI 운영 파일이 들어갈 기본 디렉토리와 네이밍 규칙을 정의한다.

**Acceptance criteria:**
- [ ] `content/`와 `ops/` 하위 디렉토리 목적이 정의된다.
- [ ] 어떤 파일이 MD 원본인지, 어떤 파일이 운영 프롬프트인지 구분된다.
- [ ] 운영자가 저장해야 할 원본 문서 위치가 문서화된다.

**Verification:**
- [ ] 디렉토리 구조 문서 확인
- [ ] 이후 태스크에서 같은 규칙을 참조할 수 있어야 한다

**Dependencies:** Task 1

**Files likely touched:**
- `SPEC.md`
- `ROADMAP.md`
- `content/`
- `ops/`

**Estimated scope:** Small

### Checkpoint: Foundation Docs

- [ ] 현재 상태와 목표 상태가 문서에서 명확히 구분된다
- [ ] 다음 구현 태스크를 바로 시작할 수 있다

### Phase 2: Admin Data Foundation

## Task 3: Add content operation tables to the server schema

**Description:** `content_entries`, `content_revisions`, `approval_tasks`, `audit_logs` 등 운영용 테이블을 추가한다.

**Acceptance criteria:**
- [ ] 콘텐츠 상태 관리용 테이블이 정의된다.
- [ ] revision / approval / audit 흐름을 위한 최소 컬럼이 포함된다.
- [ ] 기존 regulation/faq 스키마와 충돌하지 않는다.

**Verification:**
- [ ] `cd server && npm run db:generate`
- [ ] 스키마 리뷰
- [ ] migration SQL 검토

**Dependencies:** Task 1

**Files likely touched:**
- `server/src/db/schema.ts`
- `server/drizzle/*`

**Estimated scope:** Medium

## Task 4: Define admin API contracts

**Description:** Admin에서 필요한 CRUD와 상태 전환 API를 설계한다.

**Acceptance criteria:**
- [ ] 콘텐츠 CRUD API 계약이 정의된다.
- [ ] approval/publish API 계약이 정의된다.
- [ ] role-based access와 audit 기록 지점이 포함된다.

**Verification:**
- [ ] API 명세 문서 검토
- [ ] route skeleton 설계 리뷰

**Dependencies:** Task 3

**Files likely touched:**
- `server/src/index.ts`
- `server/src/routes/admin-*.ts`
- `SPEC.md`

**Estimated scope:** Medium

## Task 5: Add admin authorization and audit middleware flow

**Description:** 기존 `requireAdmin`을 활용해 Admin API 공통 권한/감사 흐름을 붙인다.

**Acceptance criteria:**
- [ ] Admin API는 인증 없는 요청을 차단한다.
- [ ] 쓰기 요청은 audit log를 남길 수 있는 구조를 가진다.
- [ ] role 확장 포인트가 남아 있다.

**Verification:**
- [ ] 수동 API 호출로 401/403/200 경로 확인
- [ ] audit log insert 경로 점검

**Dependencies:** Task 4

**Files likely touched:**
- `server/src/middleware/auth.ts`
- `server/src/routes/admin-*.ts`

**Estimated scope:** Medium

### Checkpoint: Admin API Foundation

- [ ] Admin 데이터 스키마가 준비된다
- [ ] Admin API가 최소 CRUD 수준으로 열릴 준비가 된다

### Phase 3: Public Data Migration and Parity

## Task 6: Formalize parity checks between `data.js` and `/api/data/bundle`

**Description:** 정적 fallback과 DB 번들의 불일치를 조기에 발견할 수 있는 비교 기준을 만든다.

**Acceptance criteria:**
- [ ] parity 기준 항목이 정리된다.
- [ ] FAQ, handbook, allowances, leave/ceremony 항목 비교 대상이 정의된다.
- [ ] migration 전후 검증 체크리스트가 만들어진다.

**Verification:**
- [ ] 수동 또는 스크립트 기반 비교 결과 확인

**Dependencies:** Task 3

**Files likely touched:**
- `data.js`
- `server/scripts/seed-from-data-js.ts`
- `docs/`

**Estimated scope:** Small

## Task 7: Move notices and FAQs into managed content flow

**Description:** 운영 체감 가치가 큰 공지와 FAQ를 먼저 Admin/DB 기반으로 이관한다.

**Acceptance criteria:**
- [ ] 공지 콘텐츠가 Admin으로 관리 가능해진다.
- [ ] FAQ는 기존 공개 경로를 유지한 채 운영자가 수정 가능해진다.
- [ ] published 상태만 공개 웹에서 노출된다.

**Verification:**
- [ ] 공지 렌더링 수동 확인
- [ ] FAQ 목록/검색 동작 확인
- [ ] fallback 동작 확인

**Dependencies:** Task 4, Task 6

**Files likely touched:**
- `app.js`
- `server/src/routes/faq.ts`
- `server/src/routes/admin-*.ts`
- `content/`

**Estimated scope:** Medium

## Task 8: Move handbook/regulation content into reviewable source flow

**Description:** 핸드북과 규정 원문을 Markdown/PDF 원본 + DB 인덱싱 + review 흐름으로 정리한다.

**Acceptance criteria:**
- [ ] 원본 위치가 명확해진다.
- [ ] regulation version과 source file 연결이 가능하다.
- [ ] RAG 문맥과 공개 browse 화면이 같은 출처를 바라보게 된다.

**Verification:**
- [ ] regulation browse 수동 확인
- [ ] RAG source 표시 확인

**Dependencies:** Task 6

**Files likely touched:**
- `regulation.js`
- `server/src/services/rag.ts`
- `content/policies/*`
- `server/scripts/*`

**Estimated scope:** Large

### Checkpoint: Data Migration

- [ ] 운영 가치가 높은 콘텐츠가 Admin/DB 기반으로 이동한다
- [ ] 공개 웹은 fallback 포함해 계속 동작한다

### Phase 4: Admin MVP UI

## Task 9: Build Admin MVP shell

**Description:** `/admin` 진입 화면과 기본 레이아웃을 만든다.

**Acceptance criteria:**
- [ ] Dashboard / Content / FAQ / Versions / Review / Logs 네비게이션이 보인다.
- [ ] 로그인/권한 없음 상태가 구분된다.
- [ ] 모바일에서도 최소 사용 가능하다.

**Verification:**
- [ ] 브라우저 수동 확인
- [ ] 콘솔 에러 없음

**Dependencies:** Task 5

**Files likely touched:**
- `admin/index.html`
- `admin/admin.js`
- `admin/admin.css`

**Estimated scope:** Medium

## Task 10: Implement content editing flows for notices and landing blocks

**Description:** 가장 먼저 공지와 홈 콘텐츠를 관리 가능한 화면으로 붙인다.

**Acceptance criteria:**
- [ ] 콘텐츠 목록/편집/저장/상태 변경이 가능하다.
- [ ] Draft와 Published가 구분된다.
- [ ] 변경 이력이 남는다.

**Verification:**
- [ ] 수동 CRUD 확인
- [ ] Preview 결과 확인

**Dependencies:** Task 9

**Files likely touched:**
- `admin/*`
- `server/src/routes/admin-*.ts`

**Estimated scope:** Medium

## Task 11: Implement FAQ and regulation version admin flows

**Description:** FAQ 편집과 규정 버전 생성/복제/활성화 흐름을 Admin에서 다룬다.

**Acceptance criteria:**
- [ ] FAQ CRUD가 동작한다.
- [ ] regulation version 초안 생성/복제가 가능하다.
- [ ] active 전환 전 review 단계가 있다.

**Verification:**
- [ ] 수동 CRUD 및 상태 전환 확인
- [ ] 공개 웹 반영 확인

**Dependencies:** Task 10, Task 8

**Files likely touched:**
- `admin/*`
- `server/src/routes/admin-*.ts`

**Estimated scope:** Large

### Checkpoint: Admin MVP

- [ ] 비개발자가 핵심 운영 콘텐츠를 직접 수정할 수 있다
- [ ] 게시 전 검토와 상태 전환이 가능하다

### Phase 5: AI Harness and Preview Workflow

## Task 12: Define AI draft generation contracts

**Description:** Markdown/PDF 입력을 FAQ/요약/메타데이터 초안으로 바꾸는 입력/출력 규칙을 정한다.

**Acceptance criteria:**
- [ ] 입력 파일 위치와 출력 형식이 정의된다.
- [ ] 초안과 게시본이 구분된다.
- [ ] 검증 실패 시 review queue로 보내지 않는다.

**Verification:**
- [ ] `ops/prompts/` 규격 문서 확인
- [ ] 초안 샘플 검토

**Dependencies:** Task 2, Task 8

**Files likely touched:**
- `ops/prompts/*`
- `ops/agents/*`
- `content/*`

**Estimated scope:** Medium

## Task 13: Add review queue and preview handoff

**Description:** AI 초안 또는 운영자 초안을 Preview 링크 기반 검토 흐름으로 연결한다.

**Acceptance criteria:**
- [ ] review queue에서 대기 상태를 볼 수 있다.
- [ ] 승인/반려와 메모를 남길 수 있다.
- [ ] Preview 확인 후 published 전환이 가능하다.

**Verification:**
- [ ] 수동 review flow 확인
- [ ] published 전환 시 공개 웹 반영 확인

**Dependencies:** Task 11, Task 12

**Files likely touched:**
- `admin/*`
- `server/src/routes/admin-*.ts`
- `content/*`

**Estimated scope:** Medium

### Checkpoint: Publish Workflow

- [ ] Draft -> Review -> Published 흐름이 끝까지 연결된다
- [ ] 사람 승인 없는 자동 게시가 차단된다

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 문서만 있고 실제 구현 우선순위가 흔들림 | High | checkpoint 기준으로 phase 진행 |
| `data.js`와 DB 번들 드리프트 | High | Task 6 선행 |
| Admin가 자유편집기로 변질 | High | 구조화된 엔티티 편집만 허용 |
| Preview가 실질적으로 쓰이지 않음 | Medium | review queue와 상태 전환 강제 |
| 범위가 커져 monorepo 전환부터 시작함 | Medium | Admin MVP 선행 원칙 유지 |

## Open Questions

- Admin 1차를 완전 정적 파일로 둘지, 소형 앱으로 둘지
- Preview 연결을 Vercel만 사용할지 내부 draft 렌더도 병행할지
- 규정 원본 업로드 저장소를 어디로 둘지

