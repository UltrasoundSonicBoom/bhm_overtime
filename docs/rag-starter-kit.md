# RAG Starter Kit — Vercel + Neon pgvector

BHM Overtime 의 `server/src/services/rag/` 모듈은 다른 Vercel 프로젝트에 30분 내 이식 가능한 얇은 RAG 스타터킷이다. LangChain/LlamaIndex 풀스택 대신 **최소 의존성 조합** 으로 유지한다.

## 구성 (5개 모듈, ~150 LOC)

| 모듈 | 책임 | 핵심 export |
|------|------|------------|
| `chunker.ts` | 텍스트/조항을 chunk 로 분할 | `chunkText`, `chunkArticle` |
| `embedder.ts` | OpenAI 임베딩 + 배치/재시도 | `embedOne`, `embedBatch` |
| `store.ts` | pgvector insert/search SQL | `insertChunks`, `searchSimilar`, `deleteByDocIds`, `countAll` |
| `retriever.ts` | top-k 검색 + 키워드 rerank | `retrieve`, `rerankByKeyword` |
| `generator.ts` | Vercel AI SDK streamText LLM | `streamRagAnswer`, `buildContext` |
| `index.ts` | 5개 모듈의 통합 entry | all of above |

## 의존성

```bash
npm install ai @ai-sdk/openai openai postgres @langchain/textsplitters
```

환경변수:
- `OPENAI_API_KEY`
- `DATABASE_URL` — Neon Postgres (pgvector 포함)

## 이식 6단계

**1. `server/src/services/rag/` 폴더 복사**

모듈 간 상호 의존만 있을 뿐 외부 프로젝트 코드는 참조하지 않는다. 그대로 복사 가능.

**2. DB 에 테이블 생성**

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE rag_chunks_v2 (
  id            SERIAL PRIMARY KEY,
  source        TEXT NOT NULL,
  doc_id        TEXT,
  chapter       TEXT,
  article_title TEXT,
  content       TEXT NOT NULL,
  embedding     VECTOR(1536),
  token_count   INTEGER,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX rag_v2_source_idx ON rag_chunks_v2(source);
CREATE INDEX rag_v2_doc_idx    ON rag_chunks_v2(doc_id);
CREATE INDEX rag_v2_embedding_idx
  ON rag_chunks_v2 USING hnsw (embedding vector_cosine_ops);
```

**3. Ingest 스크립트 작성 (도메인별)**

이 프로젝트의 `server/scripts/ingest-rag-v2.ts` 를 레퍼런스로:
- JSON: `chunkArticle(art, 1200)` — 조항 단위 유지
- MD: `chunkText(text, { chunkSize: 800, overlap: 120 })` — 섹션 단위 + 재귀 분할
- `embedBatch(contents)` → `insertChunks(records)` (replay 시 `deleteByDocIds` 먼저)

**4. Hono route (Vercel function) 마운트**

```typescript
import { Hono } from 'hono'
import { stream } from 'hono/streaming'
import { retrieve, streamRagAnswer } from './services/rag/index.js'

const route = new Hono()
route.post('/', async (c) => {
  const { question, sessionId, articleHint } = await c.req.json()
  const results = await retrieve(question, 6)
  const ai = streamRagAnswer({ question, results, articleHint })
  return stream(c, async (w) => {
    for await (const delta of ai.textStream) {
      await w.write(`data: ${JSON.stringify({ type: 'delta', text: delta })}\n\n`)
    }
    const sources = results.map(r => ({ title: r.articleTitle, ref: r.docId, score: r.score }))
    await w.write(`data: ${JSON.stringify({ type: 'done', sources })}\n\n`)
  })
})
```

**5. Vercel API entry**

`api/rag/chat.ts`:
```typescript
export { default, config } from '../_shared.js'
```

( `_shared.ts` 는 프로젝트의 Hono app 을 `@hono/node-server/vercel` 어댑터로 export 한다.)

**6. 프론트 연동**

`chat-ui.js` 를 복사 (또는 `window.AskChatUI.open({ title, articleRef })` 호출부만 프로젝트 스타일로 교체). SSE 파싱은 `ReadableStream.getReader()` 로 `delta`/`done` 이벤트 처리.

## 비용 추정 (OpenAI)

- `text-embedding-3-small`: $0.00002 / 1K tokens → 전체 조항 1회 임베딩 $0.01 미만
- `gpt-4o-mini`: $0.15 input / $0.60 output per 1M tokens → 쿼리당 (2K in + 500 out) ≈ $0.0006
- 월 1000 쿼리 기준 총 **$1 미만**

## 커스터마이징 포인트

| 바꾸고 싶은 것 | 수정할 파일 |
|---------------|------------|
| 임베딩 모델 / 차원 | `embedder.ts` (MODEL, DIMENSIONS) — DB 컬럼 차원도 같이 수정 |
| LLM 모델 | `generator.ts` (LLM_MODEL) |
| 시스템 프롬프트 (도메인/언어) | `generator.ts` (SYSTEM_PROMPT) |
| 청크 크기 | `chunker.ts` 호출부 (`chunkText` opts, `chunkArticle` threshold) |
| rerank 로직 | `retriever.ts` (rerankByKeyword — boost 계수/정규식) |
| 벡터 DB 교체 | `store.ts` 만 재작성 (Pinecone/Qdrant 등) |

## 한계 / 확장 여지

- **수천만 chunk 규모** — Postgres pgvector 한계. Pinecone/Weaviate 로 전환 시 `store.ts` 만 교체.
- **멀티턴 대화** — 현재 `streamRagAnswer` 는 단일 턴. `messages` 배열을 history 와 합치면 지원 가능.
- **한국어 전용** — `retriever.ts` 키워드 split 정규식이 한글 위주. 다국어는 tokenizer 교체 필요.
- **쿼리 성능** — HNSW 인덱스로 80만 행까지 ~10ms. 그 이상은 IVF-Flat 고려.

## 테스트

- `rag-v2-chunker.test.ts` (순수): 청킹 로직
- `rag-v2-retriever.test.ts` (순수): rerank 로직
- `verify-rag-v2.ts` (E2E): 10개 골든 질문 → 기대 조항 번호 포함 여부 검증 (≥8/10 게이트)

BHM Overtime 레퍼런스 결과: **10/10 통과 (2026-04-20)**.
