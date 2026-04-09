# SPEC: BHM Overtime Backend Architecture Upgrade

> Version: 1.0 | Date: 2026-04-08 | Status: Draft

---

## 1. Objective

### What
병원 노동조합 급여/근태 관리 앱(SNUH Mate)에 **RAG 챗봇**, **FAQ 시스템**, **PDF 뷰어**, **Admin 대시보드**를 추가한다.
규정 데이터를 코드(data.js)에서 DB로 이관하여 매년 코드 배포 없이 규정을 갱신할 수 있게 한다.

### Why
- 현재 `data.js`(564줄)에 보수표/수당/FAQ/핸드북이 하드코딩되어 매년 수동 수정 필요
- 챗봇이 키워드 매칭(`CHAT_ALIASES` + 점수 기반)으로 동작하여 자연어 이해 불가
- 규정 PDF 원본을 앱에서 직접 열람 불가
- Admin이 규정 데이터를 관리할 UI 없음

### Target Users
| 사용자 | 역할 |
|--------|------|
| 병원 조합원 (직원) | 급여 계산, 규정 검색, 챗봇 질의, FAQ 열람, PDF 원본 확인 |
| HR/노조 관리자 | 연간 규정 갱신, 보수표 업데이트, FAQ 관리, 사용 분석 |

### Success Criteria
- [ ] 챗봇이 "온콜 출근하면 수당 얼마?" 같은 자연어 질문에 조항 근거와 함께 답변
- [ ] Admin이 코드 배포 없이 2027년 규정을 등록하면 프론트엔드에 즉시 반영
- [ ] PDF 3종을 앱 내에서 페이지별로 열람 가능
- [ ] 기존 계산기(calculators.js) 결과가 DB 마이그레이션 전후 100% 동일

---

## 2. Architecture

### Page Structure

```
index.html (기존, 경량화)
  └── 규정 탭 → regulation.html로 이동 링크

regulation.html (신규)
  ├── 📖 규정 원문 서브탭 (목차 + 본문 + PDF 뷰어)
  ├── 💬 AI 상담 서브탭 (RAG 챗봇)
  └── ❓ FAQ 서브탭 (카테고리별 Q&A)

admin.html (신규)
  ├── 규정 버전 관리
  ├── 보수표/수당 편집
  ├── FAQ 관리
  └── 분석 대시보드

server/ (신규 - Hono API)
  ├── /api/chat        (RAG)
  ├── /api/faq         (FAQ)
  ├── /api/data/bundle (data.js 대체)
  └── /api/admin/*     (Admin CRUD)
```

### Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| API Server | **Hono** (on Vercel Serverless) | 경량, Vercel 네이티브, React 불필요 |
| ORM | **Drizzle** | 타입 안전, 경량, PostgreSQL 최적화 |
| Database | **Supabase PostgreSQL** | 기존 사용 중, Auth/RLS 활용 |
| Vector Search | **pgvector** (Supabase 내장) | 별도 서비스 불필요, HNSW 인덱스 |
| Embeddings | **OpenAI text-embedding-3-small** (1536d) | 한국어 성능 우수, 저비용 |
| LLM | **gpt-4o-mini** | 비용 효율적, 충분한 한국어 품질 |
| PDF Viewer | **pdf.js** (CDN, 이미 로드됨) | 추가 의존성 없음 |
| Frontend | **Vanilla JS** (기존 유지) | 프레임워크 마이그레이션 없음 |
| Deploy | **Vercel** (기존) | 정적 + Serverless 동시 배포 |

### Data Flow

```
[regulation.html]
  │
  ├── 규정 원문/PDF ──→ 정적 data.js (fallback) + /api/data/bundle
  │
  ├── AI 챗봇 ──→ POST /api/chat
  │                  ├── embed query (OpenAI)
  │                  ├── vector search (pgvector)
  │                  │   ├── regulation_documents (top 5)
  │                  │   └── faq_entries (top 3)
  │                  ├── FAQ score > 0.92? → direct return
  │                  └── else → LLM (gpt-4o-mini) → response + sources
  │
  └── FAQ ──→ GET /api/faq + GET /api/faq/search

[admin.html]
  └── CRUD ──→ /api/admin/* (JWT + admin role check)

[index.html]
  └── 기존 계산기 ──→ data.js (API loader with static fallback)
```

---

## 3. Database Schema (10 tables)

### 3.1 regulation_versions
연도별 규정 세트 관리. 모든 데이터 테이블의 부모.

| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| year | integer | 2026 |
| title | text | "2026 조합원 수첩" |
| status | enum | 'draft' / 'active' / 'archived' |
| effective_date | date | "2025-10-23" |
| source_files | jsonb | ["file1.pdf", "file2.pdf"] |
| created_by | uuid | admin user ref |
| created_at | timestamptz | |

### 3.2 regulation_documents (RAG vector store)
PDF 텍스트를 조항 단위로 청킹 + 임베딩.

| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| version_id | FK → regulation_versions | |
| chunk_index | integer | 청크 순서 |
| source_file | text | 원본 PDF 파일명 |
| section_title | text | "제34조(시간외/연장근로)" |
| content | text | 청크 텍스트 (~500 토큰) |
| embedding | vector(1536) | OpenAI embedding |
| token_count | integer | |
| metadata | jsonb | { page, category, article_ref } |

### 3.3 pay_tables (data.js 대체)
직급별 보수표. 기존 `DATA.payTables` 구조 유지.

| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| version_id | FK | |
| pay_table_name | text | "일반직", "운영기능직", "환경유지지원직" |
| grade | text | "M3", "J1", "A2" |
| grade_label | text | "매니저3", "주니어1" |
| base_pay | jsonb | [54482400, 54944400, ...] (8호봉) |
| ability_pay | integer | |
| bonus | integer | |
| family_support | integer | |

### 3.4 allowances
수당 요율 및 고정 금액. 기존 `DATA.allowances` 대체.

| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| version_id | FK | |
| key | text | "mealSubsidy", "overtimeRates" |
| value | jsonb | 150000 또는 { extended: 1.5, ... } |
| label | text | "급식보조비" |
| category | text | "fixed", "rate", "shift" |

### 3.5 calculation_rules
계산 공식, 배수, 조건. 기존 `DATA.longServicePay`, `seniorityRates`, `autoPromotion` 등 대체.

| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| version_id | FK | |
| rule_type | text | "autoPromotion", "seniorityRate", "longServicePay" |
| rule_key | text | "J1_to_J2", "5_to_10" |
| rule_data | jsonb | { years: 4, next: "J2" } |
| description | text | |

### 3.6 faq_entries
FAQ Q&A 쌍 + 벡터 임베딩. 기존 `DATA.faq` (68개) 대체.

| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| version_id | FK (nullable) | |
| category | text | "근로시간", "온콜", "휴가", "경조", "수당", "휴직", "승진", "복지" |
| question | text | |
| answer | text | |
| article_ref | text | "제32조" |
| embedding | vector(1536) | |
| sort_order | integer | |
| is_published | boolean | |

### 3.7 chat_history
챗봇 대화 로그.

| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| user_id | uuid (nullable) | |
| session_id | text | |
| role | text | "user" / "assistant" |
| content | text | |
| source_docs | jsonb | [{ chunkId, score, snippet }] |
| model | text | "gpt-4o-mini" / "faq-direct" |
| token_usage | jsonb | { prompt, completion } |
| created_at | timestamptz | |

### 3.8 admin_users
관리자 역할 관리.

| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| user_id | uuid UNIQUE | Supabase auth.users ref |
| email | text | |
| role | enum | 'super_admin', 'hr_admin', 'union_admin', 'viewer' |
| is_active | boolean | |

### 3.9 leave_types
휴가 유형 정의. 기존 `DATA.leaveQuotas` 대체.

| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| version_id | FK | |
| type_id | text | "annual", "sick", "maternity" |
| label | text | |
| category | text | "legal", "health", "family" |
| is_paid | boolean | |
| quota | integer | |
| uses_annual | boolean | |
| deduct_type | text | "none", "ordinary" |
| gender | text | "F" or null |
| article_ref | text | |
| extra_data | jsonb | ceremony days/pay 등 |

### 3.10 ceremonies
경조사 정보. 기존 `DATA.ceremonies` 대체.

| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| version_id | FK | |
| event_type | text | "본인 결혼", "배우자 사망" |
| leave_days | text | "5" |
| hospital_pay | integer | 300000 |
| pension_pay | text | |
| coop_pay | text | |
| docs | text | |

---

## 4. API Endpoints

### 4.1 Public (인증 불필요)
```
GET  /api/data/bundle?year=2026    → DATA 객체 형태 전체 반환 (Cache-Control: 1h)
GET  /api/faq?category=근로시간     → FAQ 목록 (카테고리 필터)
GET  /api/faq/search?q=온콜수당     → FAQ 시맨틱 검색
```

### 4.2 User (Supabase JWT 필요)
```
POST /api/chat                     → RAG 챗봇 대화
  Body: { message, sessionId }
  Response: { answer, sources: [{ title, ref, score }], isFaqMatch }

GET  /api/chat/history?sessionId=  → 대화 이력 조회
```

### 4.3 Admin (JWT + admin role 필요)
```
# 규정 버전
POST   /api/admin/regulations              → 버전 생성
GET    /api/admin/regulations              → 버전 목록
PUT    /api/admin/regulations/:id          → 버전 수정 (상태 전환 포함)
POST   /api/admin/regulations/:id/ingest   → PDF 업로드 → 청킹 → 임베딩
DELETE /api/admin/regulations/:id          → 버전 삭제 (draft만)

# 보수표
GET    /api/admin/pay-tables?versionId=    → 보수표 조회
PUT    /api/admin/pay-tables/:id           → 보수표 수정
POST   /api/admin/pay-tables/import        → CSV/Excel 일괄 임포트

# 수당
GET    /api/admin/allowances?versionId=    → 수당 목록
PUT    /api/admin/allowances/:id           → 수당 수정

# 계산 규칙
GET    /api/admin/rules?versionId=&type=   → 규칙 조회
PUT    /api/admin/rules/:id               → 규칙 수정

# FAQ
GET    /api/admin/faq?versionId=           → FAQ 목록
POST   /api/admin/faq                      → FAQ 추가 (임베딩 자동 생성)
PUT    /api/admin/faq/:id                  → FAQ 수정 (임베딩 재생성)
DELETE /api/admin/faq/:id                  → FAQ 삭제

# 분석
GET    /api/admin/analytics                → 챗봇 사용 통계
GET    /api/admin/analytics/top-questions  → 빈출 질문
GET    /api/admin/analytics/unanswered     → 미응답 쿼리
```

---

## 5. Frontend Pages

### 5.1 regulation.html (신규)

**서브탭 3개:**

#### 📖 규정 원문
- 기존 `index.html` `tab-reference`의 목차/본문/검색을 이관
- 검색: 기존 키워드 검색 + API 벡터 검색 통합
- PDF 뷰어: pdf.js 기반, 3개 PDF 선택 드롭다운, 페이지 네비게이션, 확대/축소
- 모바일: PDF는 전체화면 모달

#### 💬 AI 상담
- 기존 `quickTags` 유지 (빠른 질문 태그)
- 채팅 영역: RAG 기반 답변 + 출처(조항 번호) 표시
- 로딩: 타이핑 애니메이션 인디케이터
- Fallback: API 불가 시 기존 키워드 매칭 (`searchChat()`)

#### ❓ FAQ
- 카테고리 필터 버튼 (8개: 근로시간, 온콜, 야간근무, 휴가, 경조, 수당, 휴직, 복지)
- 아코디언 카드 (질문 클릭 → 답변 펼침 + 조항 ref)
- 검색: API 시맨틱 검색

### 5.2 index.html 수정
- `tab-reference` 내용을 regulation.html 이동 카드로 교체:
  ```
  ┌──────────────────────────────┐
  │ 📖 규정 원문 · AI 상담 · FAQ  │
  │                              │
  │  [규정 페이지로 이동 →]       │
  │                              │
  │  빠른 링크:                   │
  │  📄 PDF 원본 보기             │
  │  💬 AI에게 규정 물어보기       │
  │  ❓ 자주 묻는 질문            │
  └──────────────────────────────┘
  ```
- 기존 `searchHandbook()`, `handleChat()`, `renderQuickTags()` 등 제거 → `regulation.js`로 이관

### 5.3 admin.html (신규)
- 사이드바 네비게이션: 규정 관리 / 보수표 / 수당 / FAQ / 분석
- Admin 인증: Supabase JWT + admin_users 테이블 체크
- 규정 버전 관리: 생성/활성화/보관 상태 전환
- PDF 인제스트: 업로드 → 진행 바 → 완료 알림
- 보수표: 스프레드시트형 그리드 + CSV 임포트
- FAQ: CRUD 폼 + 실시간 미리보기

---

## 6. data.js Migration Strategy

### Phase 1: Seed DB (기존 코드 변경 없음)
`seed-from-data-js.ts` 스크립트로 현재 DATA 객체를 DB에 삽입.

### Phase 2: /api/data/bundle
DB에서 active 버전 데이터를 DATA 객체와 동일한 JSON 형태로 반환.

### Phase 3: data.js → API Loader
```javascript
const DATA_STATIC = { /* 기존 564줄 (fallback) */ };
let DATA = DATA_STATIC;

async function loadDataFromAPI() {
  try {
    const res = await fetch('/api/data/bundle?year=2026');
    if (res.ok) DATA = { ...DATA_STATIC, ...await res.json() };
  } catch (e) { /* static fallback 사용 */ }
}
loadDataFromAPI();
```

### Phase 4: Static 제거 (안정화 후)
DATA_STATIC 스켈레톤으로 축소, 로딩 스피너 추가.

**검증:** calculators.js의 모든 함수에 대해 API on/off 양쪽 결과 비교.

---

## 7. Project Structure

```
bhm_overtime/
  server/
    src/
      db/
        schema.ts              # Drizzle schema (10 tables + pgvector)
        client.ts              # Drizzle + Supabase connection
      routes/
        chat.ts                # POST /api/chat
        faq.ts                 # GET /api/faq, /api/faq/search
        data.ts                # GET /api/data/bundle
        admin.ts               # /api/admin/* CRUD
      services/
        rag.ts                 # embed → search → LLM pipeline
        embedding.ts           # OpenAI embedding wrapper
        pdf-ingest.ts          # PDF parse → chunk → embed
      middleware/
        auth.ts                # JWT verify + admin check
      scripts/
        seed-from-data-js.ts   # data.js → DB migration
      index.ts                 # Hono app entry
    drizzle.config.ts
    package.json
    tsconfig.json
  regulation.html              # NEW - 규정 페이지
  regulation.js                # NEW - 규정 페이지 로직
  admin.html                   # NEW - Admin 대시보드
  admin.js                     # NEW - Admin 로직
  index.html                   # MODIFY - 규정탭 경량화
  app.js                       # MODIFY - 규정 관련 코드 이관
  data.js                      # MODIFY - API loader 추가
  supabaseClient.js            # MODIFY - API 헬퍼 추가
  vercel.json                  # MODIFY - API 리라이트
  style.css                    # MODIFY - 신규 컴포넌트 스타일
```

---

## 8. Code Style

| Rule | Detail |
|------|--------|
| Language | Server: TypeScript (strict), Frontend: Vanilla JS (ES6+) |
| Naming | camelCase (JS/TS), snake_case (DB columns) |
| Formatting | 2-space indent, single quotes, no semicolons in TS |
| Frontend pattern | 기존 모듈 패턴 유지 (CALC, OVERTIME, PROFILE 등) |
| Server pattern | Hono route handlers, service layer for business logic |
| Error handling | Server: try/catch + structured JSON errors, Frontend: toast notifications |
| Comments | 한국어 주석 허용, 복잡한 계산 로직에만 |

---

## 9. Testing Strategy

| What | How | Criteria |
|------|-----|----------|
| DB 시딩 무결성 | `/api/data/bundle` 응답 vs `DATA` 객체 JSON deep diff | 100% 일치 |
| RAG 답변 정확도 | 10개 테스트 쿼리 (온콜, 연차, 경조비 등) | 8/10 이상 정확 |
| 계산기 호환성 | API on/off 상태에서 calcOrdinaryWage 등 비교 | 결과 동일 |
| PDF 뷰어 | 3개 PDF × 데스크톱/모바일 렌더링 | 모든 페이지 정상 표시 |
| Admin E2E | 2027 규정 생성 → PDF 업로드 → 보수표 → 활성화 | 프론트엔드 반영 확인 |
| 보안 | 비 Admin 사용자의 admin API 접근 | 403 반환 |
| Fallback | API 서버 다운 시 index.html 정상 동작 | 기존 기능 100% 유지 |

---

## 10. Boundaries

### Always Do
- 기존 index.html 계산기 기능은 절대 깨뜨리지 않는다
- data.js static fallback을 항상 유지한다
- DB 스키마 변경 시 Drizzle migration 파일 생성
- API 키(OpenAI)는 서버 사이드에서만 사용
- Supabase RLS 정책 적용

### Ask First
- DB 스키마 구조 변경 (컬럼 추가/삭제)
- 기존 파일(app.js, calculators.js 등) 수정
- 외부 API 요금 발생 변경 (embedding 모델 교체 등)
- 배포 환경 설정 변경

### Never Do
- React/Vue 등 프레임워크 도입
- 기존 3개 테이블(profiles, overtime_records, leave_records) 스키마 수정
- OpenAI API 키를 프론트엔드에 노출
- index.html에 규정 관련 복잡한 UI 추가 (regulation.html로 분리됨)
- 기존 localStorage 기반 동작 제거 (cloud sync는 선택적)
