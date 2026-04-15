# Implementation Plan: Admin & Content Operating Platform

## Overview

현재 동작 중인 공개 웹과 API를 유지한 채, 운영자가 비개발자로서 공지/FAQ/규정/게시 상태를 관리할 수 있는 Admin 및 콘텐츠 운영 계층을 단계적으로 붙인다.

## Architecture Decisions

- Public web는 현재 구조를 유지하고 데이터 소스만 점진적으로 DB 중심으로 이동한다.
- Admin은 독립된 운영 표면으로 추가하되, 1차는 현재 레포 내부에 둔다.
- 콘텐츠는 "자유 페이지 편집"이 아니라 "구조화된 콘텐츠 객체"로 관리한다.
- AI는 초안 생성과 검증을 돕되, 게시 권한은 사람에게 둔다.
- 작업 순서는 `Track A: RAG Completion` 우선, `Track B: Admin Operations` 후속으로 둔다.

## Dependency Graph

```text
PDF/MD source files
  -> ingest pipeline
    -> regulation_documents chunks
      -> regulation embeddings
        -> retrieval quality verification
          -> chatbot quality verification
            -> admin regulation/faq operations

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

### Track A: RAG Completion First

## Task A1: Verify runtime baseline for DB and RAG data

**Description:** 현재 환경에서 DB 연결과 RAG 관련 테이블 상태를 먼저 확인한다. 로컬/원격 어느 DB를 기준으로 개발할지 결정 가능한 기준선을 만든다.

**Acceptance criteria:**
- [ ] `regulation_versions`, `regulation_documents`, `faq_entries` 데이터 상태를 확인할 수 있다.
- [ ] 로컬 환경에서 DB 연결 실패 시 원인을 문서화한다.
- [ ] Track A의 후속 작업이 어떤 DB 기준으로 진행될지 정리된다.

**Verification:**
- [ ] DB 연결 확인
- [ ] 테이블 row count 확인
- [ ] 기준선 메모 문서 확인

**Dependencies:** None

**Files likely touched:**
- `SPEC.md`
- `tasks/plan.md`

**Estimated scope:** Small

## Task A2: Build PDF/MD ingest pipeline for regulation source documents

**Description:** 실제 PDF/MD 원문을 읽어서 조항/섹션 단위 chunk를 생성하고 `regulation_documents`에 적재하는 ingest 스크립트를 만든다.

**Acceptance criteria:**
- [x] PDF와 MD 양쪽에 대한 ingest 입력 규칙이 정의된다.
- [x] chunk에 `source_file`, `section_title`, `chunk_index`, `metadata`가 채워진다.
- [x] 특정 regulation version에 chunk를 재적재할 수 있다.

**Verification:**
- [ ] ingest dry run 결과 확인
- [ ] sample chunk 출력 검토
- [ ] DB insert 결과 확인

**Dependencies:** Task A1

**Files likely touched:**
- `server/scripts/pdf-ingest.ts`
- `server/scripts/*`
- `content/policies/*`

**Estimated scope:** Medium

## Task A3: Generate regulation embeddings and retrieval-ready data

**Description:** ingest된 regulation chunk에 대해 임베딩을 생성하고 검색 가능한 상태로 만든다.

**Acceptance criteria:**
- [x] regulation chunk 임베딩 생성 스크립트가 있다.
- [x] 임베딩 누락 chunk를 재처리할 수 있다.
- [x] 검색용 최소 인덱스/쿼리 경로가 실제 데이터 기준으로 동작한다.

**Verification:**
- [ ] 임베딩 생성 로그 확인
- [ ] 임베딩 null row count 확인
- [ ] 샘플 similarity query 확인

**Dependencies:** Task A2

**Files likely touched:**
- `server/scripts/embed-regulation-docs.ts`
- `server/src/services/embedding.ts`
- `server/scripts/apply-rls.ts`

**Estimated scope:** Medium

## Task A4: Verify chatbot answer quality and retrieval fullness

**Description:** FAQ direct match와 regulation retrieval이 실제로 어느 정도 동작하는지 질문 세트 기반으로 점검한다.

**Acceptance criteria:**
- [x] 대표 질문 세트가 정의된다.
- [x] direct FAQ match / regulation chunk 기반 답변 / fallback 케이스를 구분해 평가한다.
- [x] citation 품질과 누락 케이스를 기록한다.

**Verification:**
- [ ] 질문 세트 결과 보고서 확인
- [ ] 샘플 응답 검토
- [ ] 품질 이슈 목록 정리

**Dependencies:** Task A3

**Files likely touched:**
- `server/src/services/rag.ts`
- `server/src/routes/chat.ts`
- `docs/qa-report-*`

**Estimated scope:** Medium

## Task A5: Connect regulation source flow to version management

**Description:** regulation version과 source file, ingest, retrieval 품질 흐름이 운영 가능한 단위로 이어지게 만든다.

**Acceptance criteria:**
- [x] version과 source file 연결 규칙이 있다.
- [x] 재-ingest 기준이 정의된다.
- [x] version별 source files와 ingest 상태를 추적할 수 있다.

**Verification:**
- [x] version별 source metadata 확인
- [x] ingest 재실행 시나리오 검토

**Dependencies:** Task A4

**Files likely touched:**
- `server/src/db/schema.ts`
- `server/scripts/pdf-ingest.ts`
- `SPEC.md`

**Estimated scope:** Small

### Checkpoint: Track A Ready

- [x] regulation source ingest가 가능하다
- [x] regulation_documents와 faq_entries의 검색 상태를 파악했다
- [x] 챗봇 품질 개선 포인트가 목록화되었다

### Track B: Admin & Content Operations

## Task B1: Create content and ops directory conventions

**Description:** 운영 원본과 AI 운영 파일이 들어갈 기본 디렉토리와 네이밍 규칙을 정의한다.

**Acceptance criteria:**
- [x] `content/`와 `ops/` 하위 디렉토리 목적이 정의된다.
- [x] 어떤 파일이 MD 원본인지, 어떤 파일이 운영 프롬프트인지 구분된다.
- [x] 운영자가 저장해야 할 원본 문서 위치가 문서화된다.

**Verification:**
- [x] 디렉토리 구조 문서 확인
- [x] 이후 태스크에서 같은 규칙을 참조할 수 있어야 한다

**Dependencies:** Task A1

**Files likely touched:**
- `SPEC.md`
- `ROADMAP.md`
- `content/`
- `ops/`

**Estimated scope:** Small

## Task B2: Add content operation tables to the server schema

**Description:** `content_entries`, `content_revisions`, `approval_tasks`, `audit_logs` 등 운영용 테이블을 추가한다.

**Acceptance criteria:**
- [x] 콘텐츠 상태 관리용 테이블이 정의된다.
- [x] revision / approval / audit 흐름을 위한 최소 컬럼이 포함된다.
- [x] 기존 regulation/faq 스키마와 충돌하지 않는다.

**Verification:**
- [x] `cd server && npm run db:generate`
- [x] 스키마 리뷰
- [x] migration SQL 검토

**Dependencies:** Task B1

**Files likely touched:**
- `server/src/db/schema.ts`
- `server/drizzle/*`

**Estimated scope:** Medium

## Task B3: Define admin API contracts for regulation versions and FAQs

**Description:** Admin에서 regulation version과 FAQ를 먼저 운영할 수 있게 API 계약을 설계한다.

**Acceptance criteria:**
- [x] regulation version CRUD/상태 전환 API 계약이 정의된다.
- [x] FAQ CRUD API 계약이 정의된다.
- [x] role-based access와 audit 기록 지점이 포함된다.

**Verification:**
- [x] API 명세 문서 검토
- [x] route skeleton 설계 리뷰

**Dependencies:** Task B2, Task A5

**Files likely touched:**
- `server/src/index.ts`
- `server/src/routes/admin-*.ts`
- `SPEC.md`

**Estimated scope:** Medium

## Task B4: Add admin authorization and audit middleware flow

**Description:** 기존 `requireAdmin`을 활용해 Admin API 공통 권한/감사 흐름을 붙인다.

**Acceptance criteria:**
- [x] Admin API는 인증 없는 요청을 차단한다.
- [x] 쓰기 요청은 audit log를 남길 수 있는 구조를 가진다.
- [x] role 확장 포인트가 남아 있다.

**Verification:**
- [x] 수동 API 호출로 401/403/200 경로 확인
- [x] audit log insert 경로 점검

**Dependencies:** Task B3

**Files likely touched:**
- `server/src/middleware/auth.ts`
- `server/src/routes/admin-*.ts`

**Estimated scope:** Medium

## Task B5: Implement admin flow for regulation versions and FAQs

**Description:** Admin에서 규정 버전과 FAQ를 관리하는 운영 흐름을 먼저 구축한다.

**Acceptance criteria:**
- [x] FAQ 생성/수정/게시 상태 변경이 가능하다.
- [x] regulation version 생성/복제/active 전환이 가능하다.
- [x] review 전환 또는 검토 대기 상태가 존재한다.

**Verification:**
- [x] 수동 CRUD 확인
- [x] 공개 웹 반영 확인
- [x] 권한 확인

**Dependencies:** Task B4

**Files likely touched:**
- `admin/*`
- `server/src/routes/admin-*.ts`

**Estimated scope:** Large

### Checkpoint: Track B Foundation

- [x] Admin 데이터 스키마가 준비된다
- [x] 규정 버전과 FAQ 운영 흐름이 열린다

### Track B Extension: Public Data Migration and Publishing

## Task B6: Formalize parity checks between `data.js` and `/api/data/bundle`

**Description:** 정적 fallback과 DB 번들의 불일치를 조기에 발견할 수 있는 비교 기준을 만든다.

**Acceptance criteria:**
- [x] parity 기준 항목이 정리된다.
- [x] FAQ, handbook, allowances, leave/ceremony 항목 비교 대상이 정의된다.
- [x] migration 전후 검증 체크리스트가 만들어진다.

**Verification:**
- [x] 수동 또는 스크립트 기반 비교 결과 확인

**Dependencies:** Task B2

**Files likely touched:**
- `data.js`
- `server/scripts/seed-from-data-js.ts`
- `docs/`

**Estimated scope:** Small

## Task B7: Move notices and FAQs into managed content flow

**Description:** 운영 체감 가치가 큰 공지와 FAQ를 먼저 Admin/DB 기반으로 이관한다.

**Acceptance criteria:**
- [x] 공지 콘텐츠가 Admin으로 관리 가능해진다.
- [x] FAQ는 기존 공개 경로를 유지한 채 운영자가 수정 가능해진다.
- [x] published 상태만 공개 웹에서 노출된다.

**Verification:**
- [x] 공지 렌더링 수동 확인
- [x] FAQ 목록/검색 동작 확인
- [x] fallback 동작 확인

**Dependencies:** Task B3, Task B6

**Files likely touched:**
- `app.js`
- `server/src/routes/faq.ts`
- `server/src/routes/admin-*.ts`
- `content/`

**Estimated scope:** Medium

## Task B8: Move handbook/regulation content into reviewable source flow

**Description:** 핸드북과 규정 원문을 Markdown/PDF 원본 + DB 인덱싱 + review 흐름으로 정리한다.

**Acceptance criteria:**
- [x] 원본 위치가 명확해진다.
- [x] regulation version과 source file 연결이 가능하다.
- [x] RAG 문맥과 공개 browse 화면이 같은 출처를 바라보게 된다.

**Verification:**
- [ ] regulation browse 수동 확인
- [ ] RAG source 표시 확인

**Dependencies:** Task A5, Task B6

**Files likely touched:**
- `regulation.js`
- `server/src/services/rag.ts`
- `content/policies/*`
- `server/scripts/*`

**Estimated scope:** Large

### Checkpoint: Managed Content Migration

- [x] 운영 가치가 높은 콘텐츠가 Admin/DB 기반으로 이동한다
- [x] 공개 웹은 fallback 포함해 계속 동작한다

### Track B UI: Admin MVP

## Task B9: Build Admin MVP shell

**Description:** `/admin` 진입 화면과 기본 레이아웃을 만든다.

**Acceptance criteria:**
- [x] Dashboard / Content / FAQ / Versions / Review / Logs 네비게이션이 보인다.
- [x] 로그인/권한 없음 상태가 구분된다.
- [x] 모바일에서도 최소 사용 가능하다.

**Verification:**
- [x] 브라우저 수동 확인
- [x] 콘솔 에러 없음

**Dependencies:** Task B4

**Files likely touched:**
- `admin/index.html`
- `admin/admin.js`
- `admin/admin.css`

**Estimated scope:** Medium

## Task B10: Implement content editing flows for notices and landing blocks

**Description:** 가장 먼저 공지와 홈 콘텐츠를 관리 가능한 화면으로 붙인다.

**Acceptance criteria:**
- [x] 콘텐츠 목록/편집/저장/상태 변경이 가능하다.
- [x] Draft와 Published가 구분된다.
- [x] 변경 이력이 남는다.

**Verification:**
- [x] 수동 CRUD 확인
- [x] Preview 결과 확인

**Dependencies:** Task B9

**Files likely touched:**
- `admin/*`
- `server/src/routes/admin-*.ts`

**Estimated scope:** Medium

## Task B11: Implement FAQ and regulation version admin flows

**Description:** FAQ 편집과 규정 버전 생성/복제/활성화 흐름을 Admin에서 다룬다.

**Acceptance criteria:**
- [x] FAQ CRUD가 동작한다.
- [x] regulation version 초안 생성/복제가 가능하다.
- [x] active 전환 전 review 단계가 있다.

**Verification:**
- [x] 수동 CRUD 및 상태 전환 확인
- [x] 공개 웹 반영 확인

**Dependencies:** Task B10, Task B8

**Files likely touched:**
- `admin/*`
- `server/src/routes/admin-*.ts`

**Estimated scope:** Large

### Checkpoint: Admin MVP

- [x] 비개발자가 핵심 운영 콘텐츠를 직접 수정할 수 있다
- [x] 게시 전 검토와 상태 전환이 가능하다

### Track B Finish: AI Harness and Preview Workflow

## Task B12: Define AI draft generation contracts

**Description:** Markdown/PDF 입력을 FAQ/요약/메타데이터 초안으로 바꾸는 입력/출력 규칙을 정한다.

**Acceptance criteria:**
- [x] 입력 파일 위치와 출력 형식이 정의된다.
- [x] 초안과 게시본이 구분된다.
- [x] 검증 실패 시 review queue로 보내지 않는다.

**Verification:**
- [ ] `ops/prompts/` 규격 문서 확인
- [ ] 초안 샘플 검토

**Dependencies:** Task B1, Task B8

**Files likely touched:**
- `ops/prompts/*`
- `ops/agents/*`
- `content/*`

**Estimated scope:** Medium

## Task B13: Add review queue and preview handoff

**Description:** AI 초안 또는 운영자 초안을 Preview 링크 기반 검토 흐름으로 연결한다.

**Acceptance criteria:**
- [x] review queue에서 대기 상태를 볼 수 있다.
- [x] 승인/반려와 메모를 남길 수 있다.
- [x] Preview 확인 후 published 전환이 가능하다.

**Verification:**
- [ ] 수동 review flow 확인
- [ ] published 전환 시 공개 웹 반영 확인

**Dependencies:** Task B11, Task B12

**Files likely touched:**
- `admin/*`
- `server/src/routes/admin-*.ts`
- `content/*`

**Estimated scope:** Medium

### Checkpoint: Publish Workflow

- [x] Draft -> Review -> Published 흐름이 끝까지 연결된다
- [x] 사람 승인 없는 자동 게시가 차단된다

---

### Track C: UX Onboarding Funnel (단기 — 3~5일)

> 출처: `momo-main-design-20260414-212025.md` (Status: APPROVED)  
> 문제: 개인정보 → 시간외 전환율 7% (56 views → 4 views). UX 안내 부재가 원인.  
> 선행조건: 관찰 세션 1회 — 실제 사용자가 막히는 지점 확인 후 구현 순서 결정.

## Task C1: saveProfile() 성공 후 CTA 표시

**Description:** 프로필 저장 직후 "시간외 계산하러 가기" 버튼을 노출한다.

**Acceptance criteria:**
- [x] `saveProfile()` 완료 시 `#profileSavedCTA`가 `display:block`으로 전환된다.
- [x] `switchTab('overtime')` 호출 시 CTA가 자동 숨겨진다.
- [x] 재저장 시에도 동일하게 표시된다.

**Verification:**
- [x] 프로필 저장 → CTA 표시 확인
- [x] 시간외 탭 이동 시 CTA 숨김 확인

**Dependencies:** None

**Files likely touched:**
- `index.html` — `#profileSavedCTA` 요소 추가 (저장 버튼 아래, line ~1575)
- `app.js` — `saveProfile()` 끝부분 (~line 768), `switchTab()` 내 숨김 (~line 314)

**Estimated scope:** Small

## Task C2: 시간외 탭 "시급 0원" 경고 강화

**Description:** 시간외 탭 진입 시 프로필 미설정 경고를 amber 카드 형태로 교체한다.

**Acceptance criteria:**
- [x] `index.html:1107` 기존 `<span>` 경고가 amber border 카드로 교체된다.
- [x] "개인정보 입력하기 →" 버튼이 포함된다.
- [x] 기존 CSS 변수(`--accent-amber`, `--text-body-small`)만 사용한다.

**Verification:**
- [x] 프로필 미설정 상태에서 경고 카드 표시 확인
- [x] 버튼 클릭 시 프로필 탭 이동 확인

**Dependencies:** None

**Files likely touched:**
- `index.html:1107` — 경고 요소 교체

**Estimated scope:** Small

## Task C3: 홈 화면 프로필 미완성 힌트 배너

**Description:** 프로필 미저장 시 홈 탭 상단에 넛지 배너를 표시한다.

**Acceptance criteria:**
- [x] `PROFILE.load()`에서 `jobType` 없으면 `#homeProfileNudge` 표시된다.
- [x] 프로필 저장 완료 후 배너가 숨겨진다.
- [x] 기존 프로필 보유 사용자에게는 노출되지 않는다.

**Verification:**
- [x] 프로필 없는 상태에서 배너 표시 확인
- [x] 저장 후 배너 사라짐 확인
- [x] 기존 사용자에서 배너 없음 확인

**Dependencies:** None

**Files likely touched:**
- `index.html` — `#homeProfileNudge` 요소 추가 (홈 탭 상단)
- `app.js` — `DOMContentLoaded` 시 조건 체크, `saveProfile()` 내 숨김 처리

**Estimated scope:** Small

## Task C4: 직종별 맞춤 CTA 문구 분기

**Description:** saveProfile() 저장 직후 CTA 문구를 저장된 `jobType` 기준으로 분기한다.

**배경 (직종별 페인포인트):**
- 간호직(3교대): 야간 횟수 추적, 리커버리데이 누락, 복잡한 수당 계산
- 보건직(온콜): 온콜 대기/출동 횟수 기록, 야간 출동 200% 인지 부족
- 사무직: 15분 절사 수당 누락, 연차 잔여 확인을 인사팀에 의존

**Acceptance criteria:**
- [x] `jobType === '간호직'` → "이번 달 야간·리커버리데이 확인하기 →"
- [x] `jobType === '보건직'` → "온콜 대기·출동 수당 계산하기 →"
- [x] `jobType === '사무직'` → "연차 현황 및 시간외 수당 확인하기 →"
- [x] 미설정 또는 기타 → 기존 기본 문구 유지

**Verification:**
- [ ] 각 직종 저장 후 CTA 문구 확인
- [ ] 미설정 상태 fallback 확인

**Dependencies:** Task C1 완료 후

**Files likely touched:**
- `app.js` — `saveProfile()` 내 CTA 렌더 로직

**Estimated scope:** Small

### Checkpoint: Track C Onboarding

- [ ] 개인정보 → 시간외 전환율 7% → 30%+ (GA 30일 비교)
- [ ] 시간외 탭 views 4 → 15+ / 30일
- [ ] 모바일 비율 50% 이상 시 버튼 크기 모바일 최적화 추가
- [ ] C4: 직종별 CTA 분기 배포 후 직종별 전환율 GA 비교

---

### Track D: Rule Versioning & Year Archiving (중장기)

> 출처: 2026-04-14 아키텍처 논의  
> 목적: 매년 바뀌는 병원 단체협약 규정을 버전 관리하여 계산 엔진·Admin·RAG를 연동 가능하게 함

## Task D1: Drizzle 규정 버전 스키마 설계

**Description:** 현재 `hospital_rule_master_2026.json` 내용을 DB로 이관하기 위한 Drizzle 스키마를 설계한다.

**Acceptance criteria:**
- [x] `rule_versions` 테이블: `version`, `effective_from`, `effective_to`, `is_active`, `change_note`
- [x] `rule_entries` 테이블: `version_id`, `category`, `key`, `value_json`, `changed_by`
- [x] JSON 구조를 `category + key` 단위로 분해하는 매핑 정의 문서화

**Verification:**
- [x] `cd server && npm run db:generate` 성공
- [x] migration SQL 검토
- [x] 기존 B2 스키마와 충돌 없음

**Dependencies:** Task B2

**Files likely touched:**
- `server/src/db/schema.ts`
- `server/drizzle/*`

**Estimated scope:** Medium

## Task D2: JSON → DB 마이그레이션 스크립트

**Description:** `hospital_rule_master_2026.json`을 파싱하여 `rule_entries`에 "2026.1.0" 버전으로 초기 데이터를 적재한다.

**Acceptance criteria:**
- [x] 기본 실행은 dry-run, `--apply` 플래그로 실제 적재
- [x] 중복 실행 시 upsert 처리
- [x] 적재 후 JSON vs DB 동일성 검증 쿼리 포함

**Verification:**
- [x] dry-run 출력 검토 (302행, 7카테고리 확인)
- [ ] `--apply` 후 DB row count 확인 (DB 연결 시)
- [ ] 샘플 항목 JSON 값 대조 (DB 연결 시)

**Dependencies:** Task D1

**Files likely touched:**
- `server/scripts/migrate-rules-from-json.ts`

**Estimated scope:** Medium

## Task D3: 계산 엔진 ruleSet 주입 방식 전환

**Description:** `calculators.js`의 `DATA` 직접 참조를 `ruleSet` 파라미터 주입으로 변경하여 연도별 규정으로 동일한 계산을 지원한다.

**Acceptance criteria:**
- [x] `calcOrdinaryWage(jobType, grade, year, extras, ruleSet?)` 시그니처 변경
- [x] `ruleSet` 없으면 기존 `DATA` 객체 fallback — 하위 호환 유지
- [x] `ruleSet`은 `effective_date` 기준 DB resolve 객체

**Verification:**
- [x] 기존 `DATA` 기준 계산 결과 동일 확인 (phase7 23 PASS)
- [ ] 2026 / 2027 `ruleSet` 각각으로 계산 후 결과 비교 (D5 이후)

**Dependencies:** Task D2

**Files likely touched:**
- `calculators.js`
- `data.js`

**Estimated scope:** Medium

## Task D4: Admin 규정 버전 관리 UI

**Description:** 관리자가 새 연도 규정 버전을 생성/편집/활성화할 수 있는 Admin 화면을 추가한다.

**Acceptance criteria:**
- [x] 버전 목록 (연도, 상태, 유효기간)
- [x] 기존 버전 복사 후 항목별 수정
- [x] 버전 간 diff 미리보기 (변경 항목 강조)
- [x] 활성화 전 시뮬레이션: 특정 직원 기준 급여 변동 미리보기 (2026-04-14 완료)

**Verification:**
- [ ] 버전 생성/복제/활성화 수동 테스트 (DB 연결 후)
- [ ] diff 화면 정확성 확인 (DB 연결 후)
- [ ] 시뮬레이션 결과 검증 (DB 연결 후)

**Dependencies:** Task D3, Task B11

**Files likely touched:**
- `admin/*`
- `server/src/routes/admin-rules.ts`

**Estimated scope:** Large

## Task D5: 연도별 데이터 아카이빙

**Description:** 연도 마감 시 해당 연도의 시간외/휴가 기록을 통계 요약과 함께 아카이빙하고, 새 연도로 전환하는 기능을 만든다.

**Acceptance criteria:**
- [x] `yearly_archives` 테이블: `user_id`, `year`, `summary_json`, `rule_version`, `archived_at` (schema.ts 추가 완료)
- [x] "연도 마감" 액션: 레코드 스냅샷 + 통계 + 아카이빙 일괄 처리 (`archive-year.ts` 스크립트 구현)
- [x] 아카이빙된 연도는 읽기 전용 조회만 (스크립트 삭제 불가, 안내 메시지 포함)
- [x] 마감 후 새 규정 버전 활성화 안내 포함 (`archive-year.ts` 완료 메시지에 다음 단계 안내)

**Verification:**
- [ ] 아카이빙 실행 후 `yearly_archives` row 확인
- [ ] 과거 연도 조회 화면 동작 확인
- [ ] 현행 연도 데이터 영향 없음 확인

**Dependencies:** Task D3

**Files touched:**
- `server/src/db/schema.ts` — `yearlyArchives` 테이블 추가 (2026-04-14)
- `server/scripts/archive-year.ts` — 연도 아카이빙 스크립트 신규 생성 (2026-04-14)
- `server/src/routes/adminOps.ts` — `/admin/yearly-archives` GET 엔드포인트 추가 (2026-04-14)

**Estimated scope:** Medium

## Task D6: 규정 변경 Agent 파이프라인

**Description:** 규정 문서(PDF/MD) 업로드 시 현행 규정과 diff를 자동 생성하고, 수정 필요 항목을 admin review queue에 초안으로 등록하는 agent를 구축한다.

**Acceptance criteria:**
- [x] JSON 입력 → 항목 추출 → 현행 DB 활성 버전과 diff (`regulation-change-pipeline.ts`)
- [x] 변경 사항을 admin review queue(content_entries)에 draft로 등록 (카테고리별 1건)
- [x] "이번 개정으로 바뀐 것" FAQ 초안 자동 생성 (gpt-4o-mini, `--faq` 플래그)

**Verification:**
- [ ] 샘플 JSON 업로드 후 diff 결과 확인 (DB 연결 후)
- [ ] review queue 등록 확인 (DB 연결 후)
- [ ] FAQ 초안 품질 검토 (DB + OpenAI 연결 후)

**Dependencies:** Task D4, Task B13

**Files touched:**
- `server/scripts/regulation-change-pipeline.ts` — 신규 생성 (2026-04-14)
- `server/src/routes/adminOps.ts` — `POST /admin/regulation-diff` 추가

**Estimated scope:** Large

### Checkpoint: Track D Rule Versioning

- [x] 2026 → 2027 규정 전환이 Admin에서 처리 가능하다 (rule-versions.html + adminOps rule-versions API)
- [x] 연도별 아카이빙이 동작한다 (archive-year.ts + yearly_archives 테이블 + yearly-archives API)
- [x] 계산 엔진이 연도별 규정을 주입받아 동작한다 (D3: calcOrdinaryWage ruleSet 파라미터 주입 완료)
- [ ] RAG 챗봇이 버전 인식 규정을 참조한다 (서버 배포 후)

---

### Track E: Career Platform Expansion (CEO 확장 — 2026-04-14 승인)

> 출처: `ceo-plans/2026-04-14-bhm-platform-expansion.md`
> 선행조건: Phase 0 블로커 완료 필수 — JWT fix (auth.ts) + HNSW Drizzle migration
> 디자인 시스템: 메인앱(index.html) → 네오브루탈리즘 (2px border, 4px offset shadow, IBM Plex Sans KR)

#### IA 결정사항 (2026-04-14 Design Review)

```
현재 하단 네비: [ 홈 | 휴가 | 시간외 | 급여 | 규정 | 뉴스 | 👤info ]

C1 근무이력   → 👤info 탭 내 서브섹션 (개인정보와 함께 career hub화)
C2 AI이력서   → C1 근무이력 섹션 하단 CTA 버튼에서 진입
C3a AI근무표  → data/nurse-rostering-builder admin 플로우 (별도 앱)
C4 시간외경보  → 시간외 탭 상단 배너 (탭 콘텐츠 위, 닫기 가능)
C5 퇴직타임라인 → 급여 탭 > [시뮬레이션] 서브탭에 통합
```

#### 인터랙션 상태 테이블

| 화면 | LOADING | EMPTY | ERROR | SUCCESS |
|------|---------|-------|-------|---------|
| C1 근무이력 목록 | 스켈레톤 2줄 | "첫 근무지를 추가해보세요" + [+ 추가] | 토스트 에러 | 목록 렌더 |
| C2 AI이력서 생성 | "AI가 이력서를 작성 중..." 풀스크린 오버레이 | 이력서 항목 없음 → C1 진입 유도 | "생성 실패 — 직접 편집하기 →" 폴백 | 마크다운 미리보기 + 복사 버튼 |
| C4 시간외경보 배너 | — | (경보 없으면 배너 미표시) | — | WARNING(amber) / CRITICAL(coral) 배너 |
| C5 퇴직타임라인 | "계산 중..." 스피너 | 프로필 미설정 → "입사일 입력 필요" | — | 12개월 달력 + 최고(--accent-amber)/최저(--accent-rose) 강조 |

## Task E1: 근무이력 기록 UI (Work History)

**Description:** 👤info 탭 내 근무이력 서브섹션을 추가한다. 로컬 저장 + Google Drive 백업.

**IA:** info 탭 기존 개인정보 입력 폼 하단에 구분선 후 "근무이력" 섹션 배치.

**화면 구성 (정보 계층):**
1. 섹션 헤더: "근무이력" + [+ 추가] 버튼 (우측, 네오브루탈 버튼)
2. 기록 카드 리스트 (최신순): 부서명(bold) / 기간(IBM Plex Mono, 연월) / 직무 / 주요역할(2줄 truncate)
3. 섹션 하단: [AI 이력서 생성 →] CTA 버튼 (amber border, 네오브루탈)

**카드 스타일:** 2px solid #101218 border, 4px 4px 0 #101218 offset shadow, 6px radius, 내부 패딩 16px.

**빈 상태:** "아직 기록된 근무이력이 없어요. 20년 커리어를 AI 이력서로 만들려면 여기서 시작하세요." + [+ 첫 근무지 추가] 버튼.

**Acceptance criteria:**
- [x] info 탭 진입 시 개인정보 폼 아래 "근무이력" 섹션 표시
- [x] [+ 추가] 버튼 클릭 → 하단 시트: 부서명/기간/직무/주요역할 입력 폼
- [x] 저장 시 localStorage 우선, Google Drive 백업 (SyncManager.push 활용)
- [x] 오프라인 시 로컬 저장 후 온라인 전환 시 sync (SyncManager 위임)
- [x] 카드 편집/삭제 (편집 아이콘 + 삭제 아이콘)
- [x] 빈 상태 표시 및 빈 상태 CTA 동작

**Verification:**
- [x] 근무이력 추가 → 카드 표시 확인 (구현 완료)
- [x] Drive 동기화 확인 (SyncManager.push 호출)
- [x] 오프라인 저장 → 재연결 시 sync 확인 (SyncManager 위임)

**Dependencies:** Phase 0 블로커 해결
**Files likely touched:** `index.html` (info 탭 섹션), `app.js` (근무이력 렌더/저장), `googleDriveStore.js`
**Estimated scope:** Medium

## Task E2: AI 이력서 생성 (AI Resume)

**Description:** C1 근무이력 데이터를 OpenAI gpt-4o-mini로 보내 한국어 이력서 초안을 생성한다. 로그인 필수, 월 1회 제한.

**화면 구성 (정보 계층):**
1. 생성 중 (풀스크린 오버레이, 프로그레스 바 없음, 3단계 텍스트 애니메이션): 0-3s "입력한 근무이력을 확인하고 있어요..." → 3-8s "AI가 한국어 이력서를 작성 중..." → 8s+ "완성 직전!" → 완료 시 페이드
2. 결과: 마크다운 렌더 이력서 + [클립보드 복사] + [텍스트 편집] + [재생성 (이번 달 0/1 사용)]
3. 월 1회 소진 시: "이번 달 생성 횟수를 모두 사용했어요. 다음 달 [날짜]부터 다시 가능합니다." (amber 카드)

**실패 폴백:** "AI 생성에 실패했어요. 근무이력을 바탕으로 직접 작성하시겠어요?" + [빈 템플릿 열기] 버튼.

**Acceptance criteria:**
- [x] `POST /api/resume` 호출 (로그인 토큰 필수) — `server/src/routes/resume.ts` 구현
- [x] 로그인 미완료 시 → "구글 연결 후 이용 가능합니다" 안내 모달
- [x] `user_resume_usage` 테이블 `resume_generated_at` 기준 월 1회 제한 (서버 사이드 체크)
- [x] 생성 중 UI 표시 (3단계 텍스트 애니메이션: 3s/5s/완성) + spinner
- [x] 결과 마크다운 렌더 (pre 태그) + 복사 버튼
- [x] 실패 시 폴백 템플릿 제공 (빈 이력서 템플릿 열기 버튼)
- [x] 로딩 오버레이 중 닫기 불가 (pointer-events:all)

**Dependencies:** Task E1, Phase 0 블로커
**Files touched:** `server/src/routes/resume.ts` (신규), `server/src/index.ts`, `server/src/db/schema.ts` (user_resume_usage 테이블), `index.html`, `app.js`
**Estimated scope:** Small

## Task E3: 시간외 조기경보 배너 (Overtime Alert)

**Description:** 월 기준 연장/특별연장 임박 시 시간외 탭 상단에 배너 표시. 닫기 가능, 당일 재표시 없음.

**화면 구성 (정보 계층):**
1. WARNING 배너 (`var(--accent-amber)` #f59e0b, 2px border, neo 테마 2px+4px offset shadow): "⚠️ 연장근로 {N}시간 / 월 52시간 한도까지 {M}시간 남았습니다" + [닫기 ×]
2. CRITICAL 배너 (`var(--accent-rose)` #f43f5e, 2px border, bold): "🔴 연장근로 한도 근접! {N}시간 / 52시간 ({P}%) — 추가 시간외 신청 전 팀장 확인 필요" + [닫기 ×]
3. 배너 없음: 탭 콘텐츠 바로 시작 (배너 DOM 없음, 빈 공간 없음)

**경보 발동 기준:**
- WARNING: 월 연장근로 ≥ 40시간 (52시간 기준 77% 이상)
- CRITICAL: 월 연장근로 ≥ 48시간 (92% 이상)
- 특별연장 동일 기준 (월 12시간 기준)

**닫기 동작:** `localStorage.setItem('overtimeAlertDismissed_YYYY-MM', today)` — 당일 기준 재표시 없음.

**Acceptance criteria:**
- [x] WARNING/CRITICAL 조건 충족 시 시간외 탭 상단에 배너 표시
- [x] [닫기 ×] 클릭 시 배너 숨김, 당일 재표시 없음 (`overtimeAlertDismissed_YYYY-MM`)
- [x] 익일 탭 진입 시 조건 재평가 (initOvertimeTab 호출 시 날짜 재비교)
- [x] 경보 없으면 배너 DOM 자체 없음 (early return, no element created)
- [x] Neo + Linear 양쪽 테마에서 색상 대비: `var(--accent-amber)` / `var(--accent-rose)` 사용
- [x] [닫기 ×] 버튼 터치 타겟 최소 44px × 44px (`min-width/min-height:44px`)

**반응형:** 배너 전체 너비 (100%), 내부 텍스트 좌측 정렬, 닫기 버튼 우측 고정.

**Dependencies:** 없음 (독립 구현 가능)
**Files likely touched:** `index.html` (배너 요소), `app.js` (initOvertimeTab 내 경보 체크)
**Estimated scope:** Small

## Task E4: 퇴직 타임라인 시뮬레이터 (Retirement Timeline)

**Description:** 급여 탭 > [시뮬레이션] 서브탭에 "퇴직 타임라인" 기능을 통합한다. 앞으로 12개월 각 달에 퇴직 시 퇴직금+공로연수 합산을 계산해 달력 형태로 보여준다.

**화면 구성 (정보 계층):**
1. 섹션 헤더: "퇴직 최적 시기 시뮬레이션" (Space Grotesk 700, 20px)
2. 요약 칩 2개: [★ 최고 {월}: {금액}] [▼ 최저 {월}: {금액}]
3. 12개월 그리드 (2열 × 6행, 모바일 최적화): 각 셀에 월 + 금액(만원 단위) 표시
   - 최고 달: `var(--accent-amber)` border + bold + ★ 마커
   - 최저 달: `var(--accent-rose)` border tint
   - 현재 달: 2px 파란 border 강조
   - 나머지: 기본 카드
4. 하단 안내: "연금/세금 제외 계산 (v2에서 추가 예정)"

**빈 상태 (프로필 미설정):** "입사일과 급여 정보를 먼저 입력해주세요" + [개인정보 탭으로 →]

**Acceptance criteria:**
- [x] 시뮬레이션 서브탭 진입 시 퇴직 타임라인 섹션 렌더 (`initRetirementTab` → `_renderRetirementTimeline`)
- [x] 12개월 × 각 달 퇴직금 계산 (`CALC.calcRetirement` 재사용, 각 달 말일 기준)
- [x] 공로연수 계산 포함 (각 달 말일 retireDate → `calcRetirement` 내부에서 처리)
- [x] 최고/최저 달 시각적 강조 (amber/rose border + summary chips)
- [x] 프로필 미설정 빈 상태 처리 ("입사일과 급여 정보를 먼저 입력해주세요" + 개인정보 탭 버튼)
- [x] 계산 연금/세금 제외 (scope out 명시: "연금·세금 제외 계산 (v2에서 추가 예정)")

**Dependencies:** Task D3 (ruleSet 주입) 이후 더 정확해지지만 독립 구현 가능
**Files likely touched:** `index.html` (시뮬레이션 서브탭), `app.js` (타임라인 계산 함수), `calculators.js`
**Estimated scope:** Small

### Checkpoint: Track E Career Platform MVP

- [x] 근무이력 추가/편집/삭제 동작 (E1 구현 완료)
- [x] AI 이력서 생성 (로그인 유저, 월 1회) (E2 구현 완료 — 서버 배포 후 동작)
- [x] 시간외 조기경보 배너 (WARNING/CRITICAL 양쪽) — `_renderOvertimeAlertBanner` 구현 완료
- [x] 퇴직 타임라인 12개월 그리드 표시 — `_renderRetirementTimeline` 구현 완료
- [x] Phase 0 블로커 해결 완료 (JWT fix + HNSW migration) — 2026-04-14 완료
- [x] **Phase 33 자동화 검증 56 PASS / 0 FAIL** (tests/phase33-track-e-career.js, 2026-04-15)

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 문서만 있고 실제 구현 우선순위가 흔들림 | High | checkpoint 기준으로 phase 진행 |
| `data.js`와 DB 번들 드리프트 | High | Task 6 선행 |
| Admin가 자유편집기로 변질 | High | 구조화된 엔티티 편집만 허용 |
| Preview가 실질적으로 쓰이지 않음 | Medium | review queue와 상태 전환 강제 |
| 범위가 커져 monorepo 전환부터 시작함 | Medium | Admin MVP 선행 원칙 유지 |
| Track C 구현을 관찰 없이 코드부터 시작함 | Medium | 관찰 세션 1회 필수 선행 |
| Track D 규정 스키마가 data.js와 이중 진실 소스 문제 발생 | High | D3 완료 후 data.js fallback 제거 계획 |
| 연도 마감 실수로 현행 데이터 아카이빙 | High | 마감 전 dry-run + 확인 다이얼로그 강제 |

## Open Questions

- Admin 1차를 완전 정적 파일로 둘지, 소형 앱으로 둘지
- Preview 연결을 Vercel만 사용할지 내부 draft 렌더도 병행할지
- 규정 원본 업로드 저장소를 어디로 둘지
- Track C 관찰 세션: C1/C2/C3 중 어느 것을 먼저 구현할지 관찰 후 결정
- Track D D1: rule_entries의 `key` 설계를 flat string (`wage_tables_2025.general_J_grade.J3.base_salary_by_year`) vs 계층 컬럼 분리로 할지
- Track D D5: 연도 마감 트리거를 관리자 수동 버튼으로만 할지 cron 알림 포함할지

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | SCOPE_EXPANDED | C1-C5 accepted, C6-C7 deferred |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | ISSUES_OPEN | 5 issues, 2 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAN | score: 3/10 → 8/10, 6 decisions, 1 deferred (C3a) |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

**CRITICAL GAPS:**
- [P0] ✅ JWT 서명 미검증 수정 완료 (2026-04-14) — `jose` 사용, `SUPABASE_JWT_SECRET` HS256 검증, 미설정 시 개발모드 fallback
- [P2] ✅ HNSW 인덱스 Drizzle migration 추가 완료 (2026-04-14) — `0005_yearly_archives_resume_hnsw.sql`

**CEO EXPANSION (2026-04-14):**
- C1: 근무이력 기록 — App DB primary + Google Drive 백업, offline 가능
- C2: AI 이력서 — gpt-4o-mini, 로그인 필수, 월 1회, `/api/resume`
- C3a: AI 근무표 MVP — 읽기전용 제안 출력 (배포 없음)
- C3b: AI 근무표 배포 — C3a 이후, 캘린더 반영
- C4: 시간외 조기 경보 — 인앱 배너, 닫기 가능, 당일 재표시 없음
- C5: 퇴직 타임라인 — 12개월 달력, 퇴직금+공로연수 최대화
- DEFERRED: 팀원 캘린더 공유, 팀 공지 기능 (AI 근무표 이후)
- BLOCKER: ✅ C3 이전 JWT fix + HNSW migration 완료 (2026-04-14)

**UNRESOLVED:** 0 decisions open

**VERDICT:** ✅ P0 JWT fix + P2 HNSW migration 완료 (2026-04-14)
**CEO REVIEW:** SCOPE_EXPANDED — Phase 0 블로커 해결 후 C4→C1+C2→C5→C3a→C3b 순서로 진행
