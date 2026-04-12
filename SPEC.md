# SPEC: BHM Overtime Admin & Content Operating Platform

> Version: 2.0 | Date: 2026-04-09 | Status: Draft for Review

---

## Assumptions I'm Making

1. 이 프로젝트는 당분간 현재 정적 웹 구조(`index.html`, `regulation.html`, `app.js`, `data.js`)를 유지한다.
2. 다음 단계의 핵심 목표는 "새 계산기 개발"이 아니라 "운영 가능한 Admin + 콘텐츠 관리 체계"를 구축하는 것이다.
3. 비개발자 운영자가 HTML/CSS/JS를 직접 수정하지 않고도 공지, FAQ, 규정, 버전 상태를 관리할 수 있어야 한다.
4. 현재 `server/`의 Hono + Drizzle + Supabase/Postgres 기반은 유지하고 그 위에 Admin API를 증설한다.
5. 콘텐츠 게시 흐름은 `draft -> review -> published -> archived` 상태 관리와 Preview 확인을 기본값으로 삼는다.

이 가정이 틀리면 지금 정리한 스펙과 태스크 순서를 바꾸겠습니다.

---

## 1. Objective

### What We Are Building

현재 공개 서비스에 이미 존재하는 계산기, 규정 조회, FAQ, AI 상담 기능을 바탕으로, 다음 운영 계층을 추가한다.

- 운영자용 Admin
- Markdown 원본 콘텐츠 체계
- DB 기반 콘텐츠/규정 운영 계층
- AI Harness 기반 초안 생성 및 검수 흐름
- Vercel Preview 중심의 승인형 게시 프로세스

### Why

현재 코드베이스는 이미 동작하는 서비스이지만 운영 관점에서는 다음 문제가 남아 있다.

- 규정/FAQ/핸드북/수당 데이터의 상당 부분이 여전히 [`data.js`](/Users/momo/Documents/GitHub/bhm_overtime/data.js)에 정적으로 남아 있다.
- 공지사항과 업데이트는 [`notice.md`](/Users/momo/Documents/GitHub/bhm_overtime/notice.md), [`CHANGELOG.md`](/Users/momo/Documents/GitHub/bhm_overtime/CHANGELOG.md)에서 읽어오지만 운영 UI는 없다.
- [`server/src/db/schema.ts`](/Users/momo/Documents/GitHub/bhm_overtime/server/src/db/schema.ts), [`server/src/routes/data.ts`](/Users/momo/Documents/GitHub/bhm_overtime/server/src/routes/faq.ts), [`server/src/routes/chat.ts`](/Users/momo/Documents/GitHub/bhm_overtime/server/src/routes/chat.ts)에 이미 규정/FAQ/RAG/관리자 권한 기반이 있으나 `/admin` 화면과 `/api/admin/*` API가 없다.
- Preview, 승인, 변경 로그, 롤백 관점의 운영 모델이 문서화되어 있지 않다.

### Users

| 사용자 | 역할 |
|--------|------|
| 병원 직원 | 급여 계산, 시간외 계산, 휴가 계산, 규정 조회, FAQ 검색, AI 상담 |
| 운영 관리자 | 공지/FAQ/규정/수당/버전/게시 상태 관리 |
| 리뷰어/승인자 | 초안 검토, 변경 diff 확인, Preview 승인 |

### Success Criteria

- [ ] 운영자가 코드 수정 없이 공지, FAQ, 규정 버전 상태를 변경할 수 있다.
- [ ] 규정 데이터 갱신 시 공개 웹은 DB 값을 우선 사용하고, 장애 시 정적 fallback으로 동작한다.
- [ ] Admin 변경사항은 곧바로 프로덕션에 반영되지 않고 Draft/Review 단계를 거친다.
- [ ] Preview 링크로 게시 전 화면을 검토할 수 있다.
- [ ] AI가 Markdown 원문을 읽어 FAQ/요약/메타데이터 초안을 만들 수 있지만, 최종 게시 권한은 사람에게 남는다.
- [ ] 기존 계산 결과와 Family mode 흐름은 유지된다.

---

## 2. Current State From Real Files

### Public Web

- [`index.html`](/Users/momo/Documents/GitHub/bhm_overtime/index.html)
  - 메인 계산기/랜딩/공지/업데이트 화면
  - `notice.md`, `CHANGELOG.md`를 프런트에서 직접 fetch
  - `?mode=family` 기반 Family mode 진입
- [`regulation.html`](/Users/momo/Documents/GitHub/bhm_overtime/regulation.html)
  - FAQ / 찾아보기 / 물어보기 3개 탭
  - `pdf.js`, `data.js`, `regulation.js` 사용

### Frontend Data Model

- [`data.js`](/Users/momo/Documents/GitHub/bhm_overtime/data.js)
  - `DATA_STATIC`에 보수표, 수당, FAQ, 핸드북, 휴가, 경조사 등 정적 데이터 보관
  - `/api/data/bundle` 성공 시 API 값으로 덮어쓰기
  - 실패 시 fallback 유지
- [`supabaseClient.js`](/Users/momo/Documents/GitHub/bhm_overtime/supabaseClient.js)
  - Family mode 전용 Google OAuth
  - overtime / profile / leave 동기화

### Backend

- [`server/src/index.ts`](/Users/momo/Documents/GitHub/bhm_overtime/server/src/index.ts)
  - `/api/data`
  - `/api/faq`
  - `/api/chat`
- [`server/src/db/schema.ts`](/Users/momo/Documents/GitHub/bhm_overtime/server/src/db/schema.ts)
  - `regulation_versions`, `regulation_documents`, `pay_tables`, `allowances`, `calculation_rules`, `faq_entries`, `chat_history`, `admin_users`, `leave_types`, `ceremonies`
- [`server/src/middleware/auth.ts`](/Users/momo/Documents/GitHub/bhm_overtime/server/src/middleware/auth.ts)
  - `requireAdmin` 이미 존재
- [`server/scripts/seed-from-data-js.ts`](/Users/momo/Documents/GitHub/bhm_overtime/server/scripts/seed-from-data-js.ts)
  - 정적 `data.js`를 DB로 시딩하는 전환 스크립트 존재

### Deploy / Infra

- [`vercel.json`](/Users/momo/Documents/GitHub/bhm_overtime/vercel.json)
  - `/api/:path* -> /server/src/index.ts` rewrite
- [`.vercel/project.json`](/Users/momo/Documents/GitHub/bhm_overtime/.vercel/project.json)
  - 현재 Vercel 프로젝트 연결 상태 존재

### Missing Pieces

- `admin.html` 또는 별도 admin 앱
- `/api/admin/*` CRUD
- 콘텐츠 엔트리/리비전/승인/감사 로그 테이블
- 콘텐츠 원본 디렉토리(`content/`)
- AI 운영용 프롬프트/에이전트/스킬 디렉토리(`ops/`)
- 게시 전 검증 및 Preview 승인 흐름

---

## 3. Target Operating Model

### Two-Track Delivery Strategy

이 프로젝트의 다음 단계는 하나의 큰 작업이 아니라 아래 두 트랙으로 분리해 추진한다.

#### Track A: RAG Completion

목표:

- `regulation_documents` ingest 파이프라인 완성
- 규정 원문 임베딩 생성
- FAQ direct match와 regulation document 검색 충만도 점검
- 챗봇 답변 품질 검증

이 트랙은 "챗봇/규정 검색이 실제 운영 가능한 품질로 완성되었는가"를 다룬다.

#### Track B: Admin & Content Operations

목표:

- 운영자가 규정 버전과 FAQ를 관리할 수 있는 Admin 구축
- 콘텐츠 리비전/승인/감사 로그 추가
- Draft/Review/Published 운영 흐름 구축

이 트랙은 "완성된 RAG와 콘텐츠를 누가 어떻게 계속 운영할 것인가"를 다룬다.

#### Execution Order

1. Track A를 먼저 안정화한다.
2. Track B는 Track A의 결과물을 운영할 수 있게 만드는 방향으로 잇는다.
3. 단, 사용자 영향이 없는 Admin 기반 공사는 Track A와 병렬로 일부 진행 가능하다.

### Service Topology

```text
Public User
  -> web
  -> calculators + regulations + faq + ai chat

Operator
  -> admin
  -> content/version/rule/publish management

Content Source
  -> content/*.md
  -> policy originals, notices, landing copy, release notes

AI Harness
  -> read md
  -> generate draft
  -> summarize diff
  -> validate impact
  -> send to review queue

Deploy / Review
  -> Vercel Preview
  -> Draft Mode / review / approve / publish
```

### What Lives Where

#### Code

- 계산 로직
- 인증/권한
- API 계약
- 검증 규칙
- fallback 로직

#### Admin-managed Data

- 공지
- FAQ
- 규정 버전 상태
- 보수표/수당 일부
- 홈 카피 / 배너 / 도움말 블록
- 게시 상태

#### Markdown-managed Source

- 규정 원문
- 운영 메모
- 변경 근거
- 릴리스 노트
- AI 프롬프트와 운영 규칙

#### AI-managed Draft Outputs

- FAQ 후보 초안
- 사용자용 설명문 초안
- 연도별 diff 요약
- 영향도 분석 메모

---

## 4. Architecture

### Phase 1 Target Structure

```text
/
  index.html
  regulation.html
  app.js
  data.js
  notice.md
  CHANGELOG.md
  content/
    notices/
    policies/
    faq-seeds/
    landing/
  admin/
    index.html
    admin.js
    admin.css
  ops/
    prompts/
    skills/
    agents/
  server/
  tasks/
```

### Phase 2 Target Structure

```text
/apps
  /web
  /admin
  /api
/packages
  /shared-schema
  /content-types
  /ui
  /ai-harness
/content
  /policies
  /notices
  /landing
/ops
  /prompts
  /skills
  /agents
```

### Why Phase 1 First

- 현재 웹과 API는 이미 운영 중이다.
- 당장 monorepo 전환보다 Admin MVP가 가치가 크다.
- `data.js -> DB -> Admin` 순서가 가장 리스크가 낮다.
- 정적 웹 + Hono API 구조에서도 운영 체계는 충분히 붙일 수 있다.

---

## 5. Tech Stack

| Layer | Current | Target Decision |
|-------|---------|-----------------|
| Public Web | Vanilla HTML/CSS/JS | 유지 |
| Regulation UI | `regulation.html` + `regulation.js` | 유지, 데이터 소스만 개선 |
| Admin | 없음 | 1차는 정적/Vanilla 또는 소형 앱, API 기반 |
| API | Hono | 유지 |
| ORM | Drizzle | 유지 |
| DB | Supabase PostgreSQL | 유지 |
| Auth | Supabase Auth (Family mode already used) | 유지, Admin role 확장 |
| RAG | OpenAI + pgvector | 유지 |
| Deploy | Vercel | 유지 |

---

## 6. Commands

현재 레포에서 실제로 쓸 수 있는 기준 명령은 아래와 같다.

```bash
# Static web local preview
python3 -m http.server 4173

# API dev server
cd server && npm run dev

# API prod-like local start
cd server && npm run start

# Generate Drizzle SQL
cd server && npm run db:generate

# Push Drizzle schema
cd server && npm run db:push

# Open Drizzle Studio
cd server && npm run db:studio

# Seed DB from data.js
cd server && npm run seed

# Manual Vercel preview deploy
vercel
```

Notes:

- 루트 `package.json`은 현재 비어 있어 공통 `npm run build/test` 체계는 아직 없다.
- 따라서 테스트/빌드 체계는 이번 전환 작업에서 별도 설계 대상이다.

---

## 7. Project Structure and Boundaries

### Code Style

현재 코드베이스는 다음 스타일을 따른다.

```ts
chatRoutes.post('/', optionalAuth, async (c) => {
  const body = await c.req.json<{ message: string; sessionId?: string }>()
  const { message, sessionId = `anon-${Date.now()}` } = body

  if (!message?.trim()) {
    return c.json({ error: 'message is required' }, 400)
  }

  const result = await ragAnswer(message.trim(), sessionId)
  return c.json({ answer: result.answer, sources: result.sources })
})
```

Conventions:

- 프런트는 기존 Vanilla JS 스타일을 유지한다.
- 서버는 TypeScript + Hono 스타일을 유지한다.
- 큰 전환 전까지는 기존 구조를 존중하며 incremental migration만 수행한다.

### Boundaries

Always:

- 현재 공개 웹 기능을 깨지지 않게 유지한다.
- DB 우선 + 정적 fallback 구조를 유지한다.
- Admin 변경은 게시 상태와 검증 단계를 거친다.
- 변경 사항은 문서와 태스크에 반영한다.

Ask first:

- root build system 도입
- 프런트 프레임워크 전환
- DB 스키마의 파괴적 변경
- Family mode 데이터 모델 변경

Never:

- 기존 계산 로직을 콘텐츠 엔트리 에디터로 열어버리지 않는다.
- 운영자가 DOM/CSS/JS를 직접 수정하는 구조를 기본으로 삼지 않는다.
- 프로덕션 게시를 Preview/검토 없이 바로 실행하는 흐름을 기본값으로 두지 않는다.

---

## 8. Data Model Evolution

### Existing Tables to Keep

- `regulation_versions`
- `regulation_documents`
- `pay_tables`
- `allowances`
- `calculation_rules`
- `faq_entries`
- `chat_history`
- `admin_users`
- `leave_types`
- `ceremonies`

### New Tables to Add

#### content_entries

운영 콘텐츠의 현재 상태를 저장한다.

| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| slug | text unique | `home-hero`, `main-banner-april` |
| type | text | `notice`, `landing`, `help`, `testimonial` |
| title | text | |
| body_md | text nullable | markdown source |
| body_json | jsonb nullable | structured body for rich blocks |
| locale | text default 'ko-KR' | |
| status | text | `draft`, `review`, `published`, `archived` |
| published_at | timestamptz nullable | |
| created_by | uuid nullable | |
| updated_by | uuid nullable | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### content_revisions

리비전 이력과 diff 보관.

| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| entry_id | FK | |
| revision_no | integer | |
| snapshot_md | text nullable | |
| snapshot_json | jsonb nullable | |
| diff_summary | text nullable | AI/운영자 요약 |
| created_by | uuid nullable | |
| approved_by | uuid nullable | |
| created_at | timestamptz | |

#### approval_tasks

검토 대기 큐.

| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| target_type | text | `content`, `regulation_version`, `faq_batch` |
| target_id | integer | |
| status | text | `pending`, `approved`, `rejected` |
| reviewer_id | uuid nullable | |
| review_note | text nullable | |
| created_at | timestamptz | |
| decided_at | timestamptz nullable | |

#### audit_logs

운영 감사 로그.

| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| actor_id | uuid nullable | |
| action | text | |
| resource_type | text | |
| resource_id | text | |
| metadata | jsonb | |
| created_at | timestamptz | |

#### media_assets

배너/이미지 리소스 메타데이터.

#### feature_flags

Admin과 공개 웹 분리 배포 단계에서 점진 공개 제어.

---

## 9. Admin Information Architecture

운영자가 실제로 써야 하는 화면은 아래 7개를 MVP 기준으로 삼는다.

1. Dashboard
   - 최근 수정 내역
   - 검토 대기 항목
   - 규정 버전 상태
   - 최근 FAQ 검색어
   - AI 초안 큐
2. Content
   - 홈 히어로, 배너, 공지, 후기, 도움말 블록
3. Regulation Versions
   - 버전 생성, 복제, active 전환, diff 보기
4. Rules
   - 보수표, 수당, 계산 규칙의 구조화 편집
5. FAQ
   - 질문/답변/카테고리/근거 조항/공개 여부
6. Review
   - 초안 diff, Preview, 승인/반려
7. Roles & Logs
   - 관리자 역할, 감사 로그, 게시 이력

---

## 10. AI Harness Workflow

```text
Markdown or PDF source added
  -> parser extracts sections
  -> AI generates FAQ/summary/metadata draft
  -> validator checks required fields and conflicts
  -> draft stored in review queue
  -> operator opens preview
  -> reviewer approves
  -> publish to public web
  -> audit log written
```

Validation rules:

- 필수 필드 누락 금지
- 조항 번호 형식 검증
- 기존 active 버전과 충돌 검사
- 계산기 영향 가능성 표시
- 공개 금지 문구 또는 민감정보 포함 여부 검사

---

## 11. Track A: RAG Completion Scope

### Current Status

- FAQ 스키마와 임베딩 스크립트는 존재한다.
- RAG 서비스와 `/api/chat` 경로는 존재한다.
- `regulation_documents` 테이블은 존재한다.
- 하지만 실제 PDF/MD 원문 -> 청킹 -> 저장 -> 임베딩 -> 검색 품질 검증의 end-to-end 파이프라인은 아직 완료되지 않았다.

### Required Deliverables

1. PDF/MD ingest script
2. chunking strategy definition
3. `regulation_documents` population
4. regulation embedding generation
5. retrieval quality checks
6. chatbot answer evaluation set

### Acceptance Criteria

- [ ] 2026 규정 원문이 `regulation_documents`에 실제 chunk로 저장된다.
- [ ] chunk마다 `source_file`, `section_title`, `metadata.article_ref`를 최대한 채운다.
- [ ] 챗봇 질문 시 FAQ-only가 아니라 regulation chunk도 근거로 반환 가능하다.
- [ ] 최소 샘플 질문 세트로 답변 품질을 점검할 수 있다.
- [ ] direct FAQ match와 regulation retrieval의 사용 비율/결과 품질을 파악할 수 있다.

### Known Constraint

현재 로컬 실행 환경에서 DB 접속 대상이 `localhost:5432`를 바라보며, 이 세션에서는 연결이 거부되었다. 따라서 Track A의 첫 작업은 "DB 기준선 확인"을 포함해야 한다.

---

## 12. Track B: Admin & Content Operations Scope

### Current Status

- `admin_users` 및 `requireAdmin`은 이미 존재한다.
- 공개 웹과 규정 화면은 이미 운영 중이다.
- Admin UI와 Admin CRUD, revision/approval/audit 계층은 아직 없다.

### Required Deliverables

1. 운영용 테이블
2. Admin CRUD API
3. 규정 버전 관리 흐름
4. FAQ 관리 흐름
5. review / publish 흐름
6. audit log

### Acceptance Criteria

- [ ] 운영자가 FAQ와 규정 버전을 직접 수정할 수 있다.
- [ ] 변경 사항은 revision과 audit log를 남긴다.
- [ ] published만 공개 웹에 반영된다.
- [ ] 규정 버전 active 전환 전에 review 단계가 존재한다.

---

## 13. Testing Strategy

현재 상태:

- 루트 자동 테스트 체계 없음
- 서버 자동 테스트도 아직 없음
- 수동 검증과 시드/스크립트 중심

이번 전환에서 필요한 검증 축:

1. Data parity
   - `data.js`와 `/api/data/bundle` 결과 비교
2. Admin API contract
   - CRUD / 상태 전환 / 권한 검증
3. Publish flow
   - draft/review/published 상태 전환
4. Regression
   - 공개 계산기와 Family mode 유지
5. Manual browser verification
   - `index.html`, `regulation.html`, `admin`

Track A 추가 검증:

6. Retrieval quality
   - 대표 질문 세트에 대한 FAQ/direct/RAG 응답 확인
7. Source quality
   - citation에 실제 조항/원문 출처가 포함되는지 확인

Track B 추가 검증:

8. Publish workflow
   - draft/review/published 상태 전환
9. Access control
   - admin/non-admin 권한 차단

---

## 14. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `data.js`와 DB 데이터 불일치 | High | parity 비교 스크립트와 단계적 이관 |
| 운영자가 자유 편집기로 구조를 깨뜨림 | High | 구조화된 폼 입력 우선 |
| Admin 권한 오남용 | High | `admin_users`, audit log, approval flow |
| Preview 없이 게시 | High | published 전 review gate 강제 |
| Family mode 회귀 | Medium | 기존 Supabase sync 경로 untouched 원칙 |
| 문서와 코드 드리프트 | Medium | SPEC/PLAN을 living docs로 유지 |
| RAG가 FAQ-only 상태로 머무름 | High | regulation ingest와 retrieval 검증 선행 |
| 로컬 DB 기준선 확인 실패 | Medium | Track A 시작 시 DB 연결 상태 확인 및 환경 정리 |

---

## 15. Open Questions

1. Admin UI를 1차에 Vanilla로 만들지, 별도 소형 앱으로 분리할지 → **결정: Vanilla 유지**
2. 운영 콘텐츠 저장 포맷을 `body_md` 중심으로 할지 `body_json` 블록 중심으로 할지
3. Preview 확인을 Vercel Preview만으로 할지, Admin 내부 초안 렌더를 병행할지
4. 규정 PDF 업로드 저장소를 Supabase Storage로 둘지, 다른 스토리지로 분리할지
5. 로컬 개발용 DB를 계속 쓸지, 원격 Supabase 개발 DB를 기본으로 전환할지 → **결정: 원격 Supabase 기본 사용**

---

## 16. Remaining Work Spec (2026-04-12)

### Current Completion Status

- Track A: 완료 (Phase 15-19, 450 PASS)
- Track B 완료: B6, B8, B9, B10, B11, B12, B13 (481 PASS 누적)
- DB 실제 연결 확인: regulation_versions 2개, regulation_documents 145개, faq_entries 100개

### Remaining Track B Tasks

#### B1: Content/ops 디렉토리 규칙

**Acceptance Criteria:**
- `content/`, `ops/` 하위 디렉토리 목적 문서화
- MD 원본 vs 운영 프롬프트 구분 명확화
- 운영자가 원본 저장 위치를 찾을 수 있어야 함

#### B3: Admin API 계약 문서화

**Acceptance Criteria:**
- regulation version CRUD/상태전환 API 계약 정의
- FAQ CRUD API 계약 정의
- role-based access와 audit 기록 지점 명시

#### B4: Admin 인증/감사 미들웨어

**Acceptance Criteria:**
- Admin API 인증 없는 요청 차단
- 쓰기 요청 audit_log 기록 구조
- role 확장 포인트 유지

#### B5: Admin 규정/FAQ 운영 흐름

**Acceptance Criteria:**
- FAQ 생성/수정/게시 상태 변경 가능
- regulation version 생성/복제/active 전환 가능
- review 전환 및 검토 대기 상태 존재

#### B7: 공지/FAQ DB 기반 이관

**Acceptance Criteria:**
- 공지 콘텐츠 Admin에서 관리 가능
- FAQ 기존 공개 경로 유지하며 운영자 수정 가능
- published 상태만 공개 웹 노출

#### B11: FAQ + 규정 버전 Admin UI

**Acceptance Criteria:**
- FAQ CRUD Admin UI 동작
- regulation version 초안/복제 가능
- active 전환 전 review 단계

### Track C: Google Integration (Track B 완료 후)

#### C1: Google Drive 연동

**목표:** 사용자가 명시적으로 "Drive에 저장" 버튼을 눌렀을 때만 계산 결과를 Google Drive에 저장.

**Acceptance Criteria:**
- Google Drive API 연동 (드라이브 파일 생성/업데이트)
- 자동 동기화 없음 — 명시적 사용자 액션 시에만
- Google login 사용자에게만 Drive 저장 버튼 노출
- localStorage 사용자는 영향 없음
- 저장할 데이터: 급여 계산 결과, 시간외 기록, 연차 기록 (개인 식별 최소화)

**Boundaries:**
- 로그인=신원 확인만. Drive 접근은 별도 scope 요청 필요
- `drive.file` scope 사용 (앱이 생성한 파일만 접근)
- 개인 Drive 전체 접근 금지

#### C2: Google Calendar 연동

**목표:** 사용자가 "Calendar에 추가" 버튼을 눌렀을 때만 근무표/휴가 일정을 Google Calendar에 추가.

**Acceptance Criteria:**
- Google Calendar API 연동 (이벤트 생성)
- 자동 동기화 없음 — 명시적 사용자 액션 시에만
- Google login 사용자에게만 Calendar 추가 버튼 노출
- 추가할 데이터: 시간외 근무 기록, 휴가 신청 일정, 온콜 일정
- 추가된 이벤트 수정/삭제는 Google Calendar에서 직접

**Boundaries:**
- `calendar.events` scope 사용 (이벤트 생성/수정만)
- 기존 Calendar 읽기 금지 (write-only 원칙)
- 자동 주기 동기화 금지

### Tech Stack Additions (Track C)

| 추가 | 내용 |
|------|------|
| Google API Client | `googleapis` 또는 `google-auth-library` |
| OAuth Scope | `drive.file`, `calendar.events` |
| 저장 위치 | 사용자 Drive 앱 전용 폴더 |
| 인증 흐름 | 기존 Supabase Google OAuth에 scope 추가 |

### Testing Strategy (추가)

- **C1/C2**: Google API mock 기반 단위 테스트
- Drive/Calendar 실제 API는 staging 계정으로만 통합 테스트
- 자동 동기화 트리거 없음을 regression 테스트로 보장

### Boundaries (Track C)

Always:
- 사용자 명시적 액션 없이는 Google API 호출 금지
- `drive.file` scope 이상 요청 금지
- localStorage 사용자 흐름에 영향 없어야 함

Ask first:
- Google OAuth App 심사 재신청 시점
- 새 scope 추가 시 사용자 동의 화면 변경

Never:
- 로그인 시 자동으로 Drive/Calendar 접근
- 사용자 기존 Drive 파일 읽기
- 기존 Calendar 이벤트 수정/삭제
