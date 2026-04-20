# Implementation Plan: Two-Track RAG Reset — 옵션A + 신규 RAG 챗봇

> 작성일: 2026-04-20
> 범위: FAQ/card-news 공개 API는 옵션A(기능 중단)로, Chat RAG는 원문 기반으로 처음부터 재구축
> 배포 대상: Vercel (serverless functions) + Neon Postgres (pgvector)

---

## 1. Surface Assumptions

다음 가정으로 진행한다. 잘못되었으면 실행 전에 수정한다.

1. **옵션A = "API 라우트는 살려둔 채 UI 접점만 제거"**
   - `/api/faq/*`, `/api/card-news/*` 라우트는 **그대로 동작** (응답 코드/바디 변경 없음)
   - 사용자 UI(탭/타일/메뉴 진입점)에서만 호출 제거 → 데이터도 트래픽도 보존
   - 이유: 롤백 자유도 최대 + 향후 재활용 + 외부에서 직접 호출하는 경우(있다면) 무중단
   - 이미 `regulation.html:1162` 에 "물어보기 탭 제거됨" 주석이 있어 UI 제거는 부분 완료 상태

2. **새 RAG은 신규 테이블에 분리 적재**
   - 기존 `regulation_documents` / `faq_entries` 를 건드리지 않음
   - `rag_chunks_v2`(가칭) 신규 테이블 생성 → 롤백 및 A/B 비교 용이
   - 소스는 오직 두 파일: `data/regulations_full_v2026.md`, `data/union_regulation_2026.json`
   - (※ `regulations_full_v2026.md` 는 현재 `/Users/momo/Downloads/` 에 있으므로 `data/` 로 이동 필요)

3. **사용자 페이지이므로 Supabase 금지** (CLAUDE.md 규칙)
   - 인증 없는 공개 채팅 엔드포인트 + 익명 세션 ID로 rate limit
   - Neon 직접 연결 (`@neondatabase/serverless` HTTP driver)

4. **임베딩 모델 변경 없음**: OpenAI `text-embedding-3-small` (1536d) 유지

5. **"AI 질문" 버튼 진입점 — 기존 regulation.html UI 는 그대로 유지**
   - 위치: **오직** 조항 카드 액션 박스 (PDF / 전화 / 이메일 옆 네 번째 버튼)
   - 현재 `regulation.js:624-625` 에 이미 주석 처리된 자리가 있음 → 주석 해제 + grid-3 → grid-4 로 변경
   - 동작: 클릭 시 하단 바텀시트 모달로 AI 채팅창 오픈, 해당 조항 제목 + 조항 번호를 초기 컨텍스트로 전달
   - **`regulation_v2.html` / `regulation_v2.md` 는 예제 파일이므로 무시** — 건드리지 않음
   - 홈 배너/전용 `/chat.html` 페이지 등 **추가 진입점은 만들지 않음**

→ **위 가정 중 틀린 것이 있으면 바로 말해줘. 아니면 이 전제로 진행한다.**

---

## 2. Feasibility: Vercel + Neon 에서 RAG 가능 여부

### 결론: ✅ **완전히 가능하며, 이미 돌아가는 구성이다**

**근거:**

| 항목 | 상태 | 비고 |
|------|------|------|
| pgvector 확장 | ✅ Neon 기본 지원 | `server/drizzle/0000_*.sql` 에 `vector(1536)` 칼럼 이미 사용 중 |
| Vercel Serverless Functions | ✅ 현재 `api/*.ts` 가 Hono 어댑터로 운영 중 | `api/_shared.ts` 가 `@hono/node-server/vercel` 로 바운스 |
| OpenAI 호출 cold-start | ✅ Vercel Edge 타임아웃 10~60초 내 해결 가능 | 이미 `server/src/services/rag.ts` 에서 동작 |
| Streaming 응답 | ✅ Vercel 지원 | AI SDK `streamText` 로 SSE 가능 |
| 환경 변수 | ✅ `DATABASE_URL`, `OPENAI_API_KEY` 이미 설정됨 | `.env.vercel.tmp` 확인 |
| 연결 풀링 | ⚠️ 서버리스는 풀링 어려움 | Neon HTTP driver (`@neondatabase/serverless`) 로 해결 |

**한계 / 주의:**
- Vercel Hobby 플랜 함수 타임아웃 10초 → LLM streaming 이 길면 **반드시 `streamText` 사용** (첫 토큰이 10초 안에 나오면 타임아웃 걸리지 않음)
- Cold start 시 OpenAI SDK 로드 ~300ms → 무시 가능
- Postgres prepared statement 는 서버리스와 충돌 → `postgres(..., { prepare: false })` (이미 적용 중)

---

## 3. Open-Source Library 선정

### 추천: **"얇은 라이브러리 조합" — Vercel AI SDK + pgvector 직접 SQL**

다른 프로젝트에서도 재사용 가능한 **최소 의존성** 구성으로 간다.

| 목적 | 라이브러리 | 이유 |
|------|-----------|------|
| LLM 호출 / 스트리밍 | **`ai` + `@ai-sdk/openai`** (Vercel AI SDK) | Vercel 네이티브, React hook 제공, provider 교체 쉬움, Anthropic/OpenAI/Gemini/Ollama 동일 API |
| 임베딩 | **`openai` SDK** 직접 호출 | 이미 사용 중, 한 줄짜리 래퍼로 충분 |
| 벡터 저장/검색 | **Neon + pgvector + `@neondatabase/serverless`** | 외부 벡터 DB(Pinecone/Weaviate) 불필요, SQL 로 제어 |
| 청킹 | **`@langchain/textsplitters`** (`RecursiveCharacterTextSplitter` 만 사용) | 30KB 미만, 검증된 구현, 다른 것 다 무시 |
| Rate limit | **`@upstash/ratelimit` + `@upstash/redis`** (옵션) | 서버리스 친화, 없으면 DB 기반 유지 |

### 왜 LangChain/LlamaIndex 풀스택은 **쓰지 않는가**
- LangChain: 1MB+ 번들, abstraction 과다, Vercel function 사이즈 압박
- LlamaIndex.TS: Node 전용 모듈 많아 Vercel Edge 에서 깨짐
- **RAG 의 본질은 "chunk → embed → vector search → LLM"** 4단계뿐 — 150줄로 직접 쓴다

### 재사용성 보장 방법
`server/src/services/rag/` 아래 **프로젝트 독립적 모듈**로 작성:
```
rag/
  chunker.ts      # RecursiveCharacterTextSplitter 래퍼
  embedder.ts     # OpenAI embedding 래퍼
  store.ts        # pgvector insert/search (SQL 레벨)
  retriever.ts    # 검색 + rerank
  generator.ts    # Vercel AI SDK streamText
  index.ts        # 위 5개 조합한 entry
```
→ 다른 프로젝트로 **폴더 통째 복사** 가능.

---

## 4. Dependency Graph

```text
[옵션A 작업 — Track 1]
  FAQ/card-news API 응답 변경 (410 Gone)
    └─> UI 진입점 제거 (regulation.html, cardnews.html 탭)
          └─> smoke test (응답 코드 + UI 숨김 확인)

[신규 RAG — Track 2]
  소스 파일 data/ 이동
    └─> 신규 DB 스키마 (rag_chunks_v2)
          └─> ingest 스크립트 (MD + JSON 파싱 → chunk → embed → insert)
                └─> /api/rag/chat 엔드포인트 (streaming)
                      └─> UI "AI 질문" 버튼 + 채팅 화면
                            └─> 품질 평가 (10개 대표 질문)
                                  └─> 문서화 + 재사용 템플릿

Track 1 과 Track 2 는 병렬 가능 (독립)
```

---

## 5. Task Breakdown (Vertical Slices)

각 Slice 는 **DB → API → UI 가 모두 움직이는 end-to-end 세로 조각**이다.
체크포인트 ◆ 마다 사람이 확인한다.

---

### Track 1: UI 접점 제거 (API 라우트는 유지)

> **핵심**: `/api/faq/*`, `/api/card-news/*` **백엔드는 전혀 건드리지 않음.**
> 사용자 UI 에서 호출하지 않게만 만든다.

#### Task T1.1: 홈 / 네비에서 카드뉴스·FAQ 진입점 숨김
- **Why**: 사용자가 더 이상 구 FAQ/카드뉴스에 도달하지 않도록
- **Scope**: `index.html` 홈 탭 그리드, `shared-layout.js` 네비게이션, `cardnews.html`
- **Acceptance**:
  - [ ] 홈 화면 그리드에서 "카드뉴스" / "FAQ" 타일 숨김 (DOM 제거 또는 `display:none`)
  - [ ] 네비게이션/햄버거 메뉴에 해당 링크 없음
  - [ ] `cardnews.html` 주소 직접 접근 시 "서비스 일시 중단" 안내 (또는 홈으로 리다이렉트)
  - [ ] `regulation.html` 의 잔여 "물어보기 탭" 흔적 (있다면) 완전 제거 — 주석/더미 DOM 포함
  - [ ] **백엔드 라우트/DB 무변경** (`server/src/routes/faq.ts`, `cardNews.ts` 건드리지 않음)
  - [ ] `?v=` 번프 규칙 준수 (수정한 번들의 `index.html` `<script src>` 버전 증가)
- **Verification**:
  - `curl -i https://{deploy}/api/faq` → 여전히 200 (변경 없음 확인)
  - 배포 후 홈에서 카드뉴스/FAQ 타일 안 보임 + `cardnews.html` 직접 접근 테스트
- **Scope estimate**: S (1시간)

**◆ 체크포인트 C1: 사용자 동선에서 구 FAQ/카드뉴스 접점 완전 제거. API 라우트는 변경 없음.**

---

### Track 2: 신규 RAG 챗봇 (핵심)

#### Task T2.1: 소스 파일 정리 + 전제 검증
- **Scope**: `data/regulations_full_v2026.md` 이동 (from `~/Downloads`), `data/union_regulation_2026.json` 유지
- **Acceptance**:
  - [ ] 두 파일이 `data/` 아래에 있다
  - [ ] `wc -l` 로 라인 수 기록 (md: 152, json: 2184 현재 기준)
  - [ ] MD 의 `##`/`###` 섹션 수와 JSON 의 `id` 개수 비교 → 조항 coverage 갭 문서화
- **Verification**: `ls -la data/regulations_full_v2026.md data/union_regulation_2026.json`
- **Scope estimate**: XS (10분)

#### Task T2.2: 신규 DB 스키마 `rag_chunks_v2`
- **Why**: 기존 `regulation_documents` 와 격리 → 롤백/비교 가능
- **Scope**: `server/drizzle/0006_rag_chunks_v2.sql`, `server/src/db/schema.ts`
- **Schema**:
  ```sql
  CREATE TABLE rag_chunks_v2 (
    id            SERIAL PRIMARY KEY,
    source        TEXT NOT NULL,       -- 'regulations_md' | 'union_regulation_json'
    doc_id        TEXT,                -- JSON 의 art_id 또는 MD 섹션 슬러그
    chapter       TEXT,
    article_title TEXT,
    content       TEXT NOT NULL,
    embedding     VECTOR(1536),
    token_count   INTEGER,
    metadata      JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX rag_v2_embedding_idx ON rag_chunks_v2
    USING hnsw (embedding vector_cosine_ops);
  CREATE INDEX rag_v2_source_idx ON rag_chunks_v2(source);
  ```
- **Acceptance**:
  - [ ] `drizzle-kit generate` + `db:apply` 성공
  - [ ] Neon 에서 테이블 + HNSW 인덱스 확인
- **Verification**: `psql $DATABASE_URL -c "\d rag_chunks_v2"`
- **Scope estimate**: S

#### Task T2.3: Ingest 스크립트 (end-to-end 1회 실행)
- **Scope**: `server/scripts/ingest-rag-v2.ts`
- **Libraries**: `@langchain/textsplitters` (RecursiveCharacterTextSplitter, chunkSize=800, overlap=120)
- **Logic**:
  1. `union_regulation_2026.json` 로드 → 각 조항 1 레코드 (title + content + clauses 합침)
  2. `regulations_full_v2026.md` 로드 → `##`/`###` 기준 1차 split, 1200자 넘으면 RecursiveCharacterTextSplitter 적용
  3. 배치 임베딩 (OpenAI, 100개씩)
  4. `rag_chunks_v2` insert
  5. `--dry-run` 플래그 지원 (실제 insert 없이 chunk preview)
- **Acceptance**:
  - [ ] `--dry-run` 실행 시 chunk 개수/샘플 출력
  - [ ] `--write` 실행 시 DB row 생성
  - [ ] JSON 이 "id 우선 soft-match" — 같은 `doc_id` 존재 시 DELETE → INSERT (replay 가능)
- **Verification**:
  - `npx tsx server/scripts/ingest-rag-v2.ts --dry-run` → chunk 미리보기
  - `npx tsx server/scripts/ingest-rag-v2.ts --write` → `SELECT count(*) FROM rag_chunks_v2` ≥ 50
- **Scope estimate**: M (2~3시간)

**◆ 체크포인트 C2: Ingest 성공 — "제36조 연차" 질의로 SQL 벡터 검색이 상위 3개 관련 chunk 반환**

#### Task T2.4: `/api/rag/chat` 엔드포인트 (streaming)
- **Scope**: `server/src/routes/ragChat.ts`, `api/rag/chat.ts` (Vercel 함수), RAG 모듈 `server/src/services/rag/`
- **Libraries**: `ai`, `@ai-sdk/openai`, `@neondatabase/serverless` (선택)
- **Logic**:
  1. POST `{ question, sessionId?, articleHint? }`
  2. 쿼리 임베딩 → `rag_chunks_v2` cosine top-k (k=6)
  3. 컨텍스트 빌드 (조항 번호 + 본문, 총 3~4k 토큰 제한)
  4. `streamText({ model: openai('gpt-4o-mini'), system, messages, onFinish })`
  5. 답변 저장 (`chat_history` 재사용 또는 `rag_chat_history_v2` 신설)
  6. 응답: SSE stream + 마지막에 `sources[]` (doc_id, article_title, score) 포함
- **Prompt 규칙**:
  - 컨텍스트 외 정보 생성 금지 → "확인되지 않습니다"
  - 답변에 조항 번호 필수 포함
  - 수치(일수/금액) 원문 그대로
- **Acceptance**:
  - [ ] `curl -N -X POST /api/rag/chat -d '{"question":"연차 며칠이야"}'` → 스트리밍 응답
  - [ ] 마지막 frame 에 `sources` 배열이 있고 조항 번호가 채워짐
  - [ ] 규정에 없는 질문("대표이사 전화번호?") → "확인되지 않습니다"
- **Verification**: 수동 `curl` 3건 + `server/scripts/verify-rag-v2.ts` (10개 대표 질문)
- **Scope estimate**: M (3~4시간)

**◆ 체크포인트 C3: API가 스트리밍으로 정확한 조항 번호와 함께 답변 — 사람이 직접 확인**

#### Task T2.5: 조항 카드에 "AI 질문" 버튼 추가 + 채팅 바텀시트
- **핵심 원칙**: 현재 `regulation.html` UIUX 는 건드리지 않음. 오직 조항 카드 액션박스 "PDF / 전화 / 이메일" 옆에 **네 번째 버튼만 추가**.
- **Scope**: `regulation.js`, `regulation.html` (CSS 만), 신규 `chat-ui.js` (재사용 가능한 바텀시트 모듈)
- **버튼 추가 위치 (정확히)**:
  - [regulation.js:620-626](../regulation.js#L620) `reg-action-grid-3` 블록
  - 현재 주석 처리된 `askAboutArticle` 버튼 (L624-625) 주석 해제
  - CSS 클래스 `reg-action-grid-3` → `reg-action-grid-4` 로 교체 + 대응 grid 스타일 추가
  - `askAboutArticle(title)` 함수 시그니처 확장: `(title, articleRef, content)` — 조항 번호와 요약을 모달에 전달
- **채팅 바텀시트 (`chat-ui.js`)**:
  - 하단에서 올라오는 bottom sheet (높이 ~80vh)
  - 상단 헤더: "📜 제36조(연차 유급휴가)에 대해 질문하기" (조항 타이틀 표시)
  - 메시지 영역 + 입력창
  - 스트리밍 토큰 실시간 렌더 (`ReadableStream` 파싱)
  - 답변 하단 출처 chip (`제36조` 등) — 클릭 시 sheet 닫고 해당 조항 카드로 스크롤
  - 에러 UI (429 / 500 / 네트워크)
  - 모바일 375px 우선 설계
  - 다른 페이지에서도 재사용 가능하도록 **독립 모듈** (`window.AskChatUI.open({title, articleRef, hint})`)
- **Acceptance**:
  - [ ] 기존 PDF/전화/이메일 버튼의 모양/동작/간격 **변경 없음**
  - [ ] 네 번째 "💬 AI 질문" 버튼이 같은 크기/톤으로 나란히 배치
  - [ ] 버튼 클릭 → 바텀시트 열림, 헤더에 해당 조항 표기
  - [ ] 첫 질문부터 해당 조항 문맥이 질의에 포함되어 나감
  - [ ] 질문 입력 → 토큰 단위 실시간 렌더
  - [ ] 출처 chip 클릭 시 sheet 닫고 해당 조항 카드로 스크롤
  - [ ] 모바일 375px / 데스크톱 둘 다 레이아웃 정상
  - [ ] `?v=` 번프 규칙 준수 (`regulation.js`, `chat-ui.js` 추가)
- **Verification**: Playwright E2E — 규정 탭 → 특정 조항 검색 → 카드 "AI 질문" 클릭 → 질문 → 응답 스트리밍 + chip
- **Scope estimate**: L (반나절)

**◆ 체크포인트 C4: 실제 사용자가 "AI 질문" 버튼 누르고 답을 받을 수 있다 (end-to-end)**

#### Task T2.6: 품질 평가 + 회귀 방지
- **Scope**: `server/scripts/verify-rag-v2.ts`, `tests/rag-v2-golden.json`
- **Acceptance**:
  - [ ] 10개 대표 질문 golden set (연차, 상여금, 청원휴가, 야간수당, 육아휴직, 퇴직금, 복지포인트, 건강검진, 장애인수당, 환경직 처우)
  - [ ] 각 답변이 기대 조항 번호 포함하는지 자동 검증
  - [ ] 점수 ≥ 8/10 이면 통과 (실패 시 chunking/prompt 튜닝)
- **Verification**: `npm run rag:v2:verify` → JSON 리포트
- **Scope estimate**: M

#### Task T2.7: 재사용 가능한 템플릿 문서화
- **Scope**: `docs/rag-starter-kit.md`
- **Acceptance**:
  - [ ] `server/src/services/rag/` 5개 모듈 설명
  - [ ] 환경변수/의존성 체크리스트
  - [ ] 다른 프로젝트로 복사하는 단계 (≤ 6단계)
  - [ ] 비용 추정 (임베딩 1회 + 월 1000쿼리 기준)
- **Scope estimate**: S

**◆ 체크포인트 C5: 사용자가 다른 프로젝트에 이 RAG 모듈을 복붙하여 30분 안에 띄울 수 있다**

---

## 6. Out of Scope (이번에 안 하는 것)

- FAQ 테이블 삭제 (데이터 보존)
- 기존 `regulation_documents` 마이그레이션 (신규만 씀)
- Admin UI 의 FAQ/regulation 편집 (Track B 계속 유지, 이 계획 범위 외)
- 멀티턴 대화 컨텍스트 (이번엔 단일 질문/답변)
- 사용자별 로그인 (익명 + 세션 ID)
- 다국어 (한국어만)

---

## 7. Risks

| Risk | Mitigation |
|------|-----------|
| MD 와 JSON 간 조항 중복 → 검색 노이즈 | T2.3 에서 `source` 칼럼으로 구분, 검색 시 source 별 top-k 후 통합 rerank |
| Vercel 10초 타임아웃 | `streamText` 필수 — 첫 토큰이 ~1초 내 나가므로 안전 |
| 임베딩 비용 폭증 | text-embedding-3-small 기준 두 파일 전체 ≈ $0.01 미만 |
| Neon 서버리스 cold connection | `postgres(... { prepare: false })` + HTTP driver |
| 잘못된 답변으로 사용자 오해 | "규정에만 근거" 시스템 프롬프트 + 조항 번호 표시 + 면책 고지 |

---

## 8. Verification Plan (통합)

| Phase | Gate | 방법 |
|-------|------|------|
| C1 | Track 1 | `curl -i /api/faq` 가 410 |
| C2 | Ingest OK | `SELECT count(*) FROM rag_chunks_v2` > 0 |
| C3 | API OK | `curl -N /api/rag/chat` 스트리밍 + 조항 번호 포함 |
| C4 | UI OK | Playwright E2E: 버튼 → 응답 렌더 |
| C5 | 재사용성 OK | 문서 따라가면 빈 Vercel 프로젝트에서 20분 내 챗봇 뜸 |

---

## 9. 완료 정의 (Definition of Done)

- [ ] Track 1 T1.1~T1.3 완료 및 배포
- [ ] Track 2 T2.1~T2.7 완료 및 배포
- [ ] 체크포인트 C1~C5 모두 통과
- [ ] `CHANGELOG.md` 에 "2026-04-20 RAG v2 교체" 항목 추가
- [ ] `CLAUDE.md` "변경 이력" 테이블에 한 줄 추가
