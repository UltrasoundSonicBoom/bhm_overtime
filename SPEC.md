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

## 11. Testing Strategy

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

---

## 12. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `data.js`와 DB 데이터 불일치 | High | parity 비교 스크립트와 단계적 이관 |
| 운영자가 자유 편집기로 구조를 깨뜨림 | High | 구조화된 폼 입력 우선 |
| Admin 권한 오남용 | High | `admin_users`, audit log, approval flow |
| Preview 없이 게시 | High | published 전 review gate 강제 |
| Family mode 회귀 | Medium | 기존 Supabase sync 경로 untouched 원칙 |
| 문서와 코드 드리프트 | Medium | SPEC/PLAN을 living docs로 유지 |

---

## 13. Open Questions

1. Admin UI를 1차에 Vanilla로 만들지, 별도 소형 앱으로 분리할지
2. 운영 콘텐츠 저장 포맷을 `body_md` 중심으로 할지 `body_json` 블록 중심으로 할지
3. Preview 확인을 Vercel Preview만으로 할지, Admin 내부 초안 렌더를 병행할지
4. 규정 PDF 업로드 저장소를 Supabase Storage로 둘지, 다른 스토리지로 분리할지

