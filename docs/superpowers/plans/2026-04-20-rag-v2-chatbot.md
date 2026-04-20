# RAG v2 Chatbot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 서울대학교병원 노동조합 단체협약 원문 2개 파일을 기반으로 스트리밍 RAG 챗봇을 새로 구축하고, 기존 `regulation.html` 의 각 조항 카드에 "💬 AI 질문" 버튼으로 진입점을 추가한다. 기존 FAQ/카드뉴스 API 는 백엔드 유지 + UI 접점만 제거한다.

**Architecture:** 최소 의존성으로 재사용 가능한 RAG 스타터킷을 만든다. Neon pgvector 에 신규 `rag_chunks_v2` 테이블 생성 → MD/JSON 원문을 청킹·임베딩 후 적재 → Vercel serverless function 에서 `streamText` 로 SSE 응답 → 바닐라 JS 바텀시트 UI 로 렌더. 기존 `regulation_documents`/`faq_entries` 테이블과 격리하여 롤백 용이성을 보장한다.

**Tech Stack:** Vercel Functions (Hono), Neon Postgres + pgvector, Drizzle ORM, OpenAI (`text-embedding-3-small` + `gpt-4o-mini`), Vercel AI SDK (`ai` + `@ai-sdk/openai`), `@langchain/textsplitters` (청킹만), 바닐라 JS + 기존 CSS tokens

---

## File Structure

**Create (backend):**
- `server/src/db/schema.ts` — 기존 파일에 `ragChunksV2` 테이블 정의 추가
- `server/drizzle/0006_rag_chunks_v2.sql` — 마이그레이션 SQL
- `server/src/services/rag/chunker.ts` — RecursiveCharacterTextSplitter 래퍼
- `server/src/services/rag/embedder.ts` — OpenAI 배치 임베딩
- `server/src/services/rag/store.ts` — pgvector insert/search SQL
- `server/src/services/rag/retriever.ts` — top-k 검색 + rerank
- `server/src/services/rag/generator.ts` — streamText LLM 호출
- `server/src/services/rag/index.ts` — 5개 모듈 조합 entry
- `server/src/routes/ragChat.ts` — POST /api/rag/chat Hono route
- `server/scripts/ingest-rag-v2.ts` — MD + JSON 적재 스크립트
- `server/scripts/verify-rag-v2.ts` — 품질 평가 스크립트
- `server/tests/rag-v2-chunker.test.ts` — 청킹 단위 테스트
- `server/tests/rag-v2-retriever.test.ts` — 검색 단위 테스트
- `server/tests/rag-v2-golden.json` — 10개 골든 질문/기대 조항
- `api/rag/chat.ts` — Vercel 함수 entry (기존 `_shared.ts` 패턴)
- `data/regulations_full_v2026.md` — `~/Downloads/` 에서 이동

**Create (frontend):**
- `chat-ui.js` — 재사용 가능한 바텀시트 모듈 (`window.AskChatUI`) — DOM API only, no innerHTML
- `docs/rag-starter-kit.md` — 재사용 템플릿 문서

**Modify:**
- `regulation.js:620-626` — `reg-action-grid-3` → `reg-action-grid-4`, 주석 해제
- `regulation.js:868-877` — `askAboutArticle` 시그니처 확장 + 구 동작 교체
- `regulation.html:577-581` — `reg-action-grid-4` CSS 추가
- `regulation.html` — `chat-ui.js` `<script>` 태그 추가
- `index.html` — 홈 그리드에서 카드뉴스/FAQ 타일 숨김 + `?v=` 번프
- `shared-layout.js` — 네비 메뉴에서 해당 링크 제거
- `cardnews.html` — 접근 시 "서비스 일시 중단" 안내
- `server/src/index.ts` — 새 `/api/rag/chat` 라우트 마운트
- `server/package.json` — 의존성 + 스크립트 추가
- `CHANGELOG.md` — 릴리스 노트
- `CLAUDE.md` — 변경 이력

**Do NOT touch:**
- `server/src/routes/faq.ts`, `server/src/routes/cardNews.ts` — 백엔드 그대로
- `regulation_documents`, `faq_entries` DB 테이블 — 데이터 보존
- `regulation_v2.html`, `regulation_v2.md` — 예제 파일

---

## Task 1: UI 진입점 제거 (Track 1)

**Files:**
- Modify: `index.html` (홈 그리드)
- Modify: `shared-layout.js` (네비)
- Modify: `cardnews.html` (접근 시 안내)

- [ ] **Step 1.1: 현재 홈 그리드에서 카드뉴스/FAQ 타일 식별**

Run: `grep -n "cardnews\|카드뉴스\|faq\|FAQ" /Users/momo/Documents/GitHub/bhm_overtime/index.html`
Expected: 타일 DOM 위치 라인 번호 확인. 결과를 메모.

- [ ] **Step 1.2: 홈 그리드에서 두 타일 DOM 제거**

`index.html` 에서 Step 1.1 결과의 타일 `<a>` 또는 `<div>` 블록을 삭제. 인접한 구분선/여백도 정리.

- [ ] **Step 1.3: shared-layout.js 네비 링크 제거**

Run: `grep -n "cardnews\|faq" /Users/momo/Documents/GitHub/bhm_overtime/shared-layout.js`
해당 라인의 메뉴 항목을 주석 처리 또는 배열에서 제외.

- [ ] **Step 1.4: cardnews.html 을 안내 페이지로 교체**

`cardnews.html` 을 다음 내용으로 **전체 교체**:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>서비스 일시 중단 — SNUH Mate</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 40px 20px; text-align: center; background: #fafafa; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 20px; margin-bottom: 12px; }
    p { color: #666; margin-bottom: 20px; max-width: 420px; margin-left: auto; margin-right: auto; line-height: 1.5; }
    a { display: inline-block; padding: 10px 20px; background: #1a1a1a; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="icon">📭</div>
  <h1>카드뉴스 서비스 일시 중단</h1>
  <p>규정 Q&amp;A 는 '규정' 탭의 조항 카드에서 <strong>💬 AI 질문</strong> 버튼으로 이용해주세요.</p>
  <a href="/index.html">홈으로</a>
</body>
</html>
```

(기존 DOM 을 런타임에 제거하는 우회 없이 파일 자체를 안내 페이지로 단순화.)

- [ ] **Step 1.5: 번들 버전 번프**

`index.html` 에서 수정한 스크립트 `<script src="shared-layout.js?v=X">` 의 X 를 1 증가.

- [ ] **Step 1.6: 백엔드 무변경 확인**

Run: `git diff --name-only server/src/routes/faq.ts server/src/routes/cardNews.ts`
Expected: 빈 출력 (변경 없음)

- [ ] **Step 1.7: 로컬 검증**

Run: `cd /Users/momo/Documents/GitHub/bhm_overtime && python3 -m http.server 8080`
브라우저에서 `http://localhost:8080/index.html` 접속 → 홈 그리드에 카드뉴스/FAQ 타일 없음 확인.
`http://localhost:8080/cardnews.html` 접속 → 안내 페이지 표시 확인.

- [ ] **Step 1.8: Commit**

```bash
git add index.html shared-layout.js cardnews.html
git commit -m "feat(ui): remove card-news/faq entry points (track 1, api untouched)"
```

---

## Task 2: 소스 파일 `data/` 이동

**Files:**
- Create: `data/regulations_full_v2026.md`

- [ ] **Step 2.1: 파일 이동**

```bash
mv /Users/momo/Downloads/regulations_full_v2026.md /Users/momo/Documents/GitHub/bhm_overtime/data/regulations_full_v2026.md
```

- [ ] **Step 2.2: 커버리지 메모**

```bash
cd /Users/momo/Documents/GitHub/bhm_overtime
echo "MD sections:" && grep -c "^### " data/regulations_full_v2026.md
echo "JSON articles:" && node -e "console.log(require('./data/union_regulation_2026.json').length)"
```
Expected: MD 섹션 수 + JSON 조항 수 출력. 큰 갭이 있으면 메모 (JSON 이 더 상세한 것이 정상).

- [ ] **Step 2.3: Commit**

```bash
git add data/regulations_full_v2026.md
git commit -m "chore(data): move regulations_full_v2026.md into data/"
```

---

## Task 3: DB 스키마 — `rag_chunks_v2` 테이블 정의

**Files:**
- Modify: `server/src/db/schema.ts`
- Create: `server/drizzle/0006_rag_chunks_v2.sql`

- [ ] **Step 3.1: schema.ts 에 테이블 추가**

`server/src/db/schema.ts` 끝에 추가:

```typescript
export const ragChunksV2 = pgTable(
  'rag_chunks_v2',
  {
    id: serial('id').primaryKey(),
    source: text('source').notNull(), // 'regulations_md' | 'union_regulation_json'
    docId: text('doc_id'),            // e.g. art_36 or md-slug
    chapter: text('chapter'),
    articleTitle: text('article_title'),
    content: text('content').notNull(),
    embedding: vector('embedding'),
    tokenCount: integer('token_count'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('rag_v2_source_idx').on(table.source),
    index('rag_v2_doc_idx').on(table.docId),
  ],
)
```

- [ ] **Step 3.2: 마이그레이션 생성**

Run: `cd server && npm run db:generate`
Expected: `server/drizzle/0006_*.sql` 생성됨. 파일명을 `0006_rag_chunks_v2.sql` 로 rename.

- [ ] **Step 3.3: HNSW 인덱스 추가**

생성된 SQL 파일 끝에 추가:

```sql
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS rag_v2_embedding_idx
  ON rag_chunks_v2 USING hnsw (embedding vector_cosine_ops);
```

- [ ] **Step 3.4: 마이그레이션 적용**

Run: `cd server && npm run db:apply`
Expected: 에러 없음.

- [ ] **Step 3.5: 테이블 존재 확인**

Run: `psql "$DATABASE_URL" -c "\d rag_chunks_v2"`
Expected: 9개 컬럼 + `rag_v2_embedding_idx` 포함한 3개 인덱스 출력.

- [ ] **Step 3.6: Commit**

```bash
git add server/src/db/schema.ts server/drizzle/0006_rag_chunks_v2.sql server/drizzle/meta
git commit -m "feat(db): add rag_chunks_v2 table with hnsw index"
```

---

## Task 4: RAG 모듈 — Chunker (TDD)

**Files:**
- Create: `server/src/services/rag/chunker.ts`
- Test: `server/tests/rag-v2-chunker.test.ts`

- [ ] **Step 4.1: 의존성 추가**

```bash
cd /Users/momo/Documents/GitHub/bhm_overtime/server
npm install @langchain/textsplitters
```

- [ ] **Step 4.2: 실패하는 테스트 작성**

`server/tests/rag-v2-chunker.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chunkText, chunkArticle } from '../src/services/rag/chunker.js'

test('chunkText splits long text by char count with overlap', async () => {
  const longText = '가'.repeat(2000)
  const chunks = await chunkText(longText, { chunkSize: 800, overlap: 120 })
  assert.ok(chunks.length >= 3, 'should produce at least 3 chunks')
  assert.ok(chunks.every((c) => c.length <= 900), 'each chunk under size+slack')
})

test('chunkText keeps short text as single chunk', async () => {
  const chunks = await chunkText('짧은 텍스트', { chunkSize: 800, overlap: 120 })
  assert.equal(chunks.length, 1)
  assert.equal(chunks[0], '짧은 텍스트')
})

test('chunkArticle preserves article as one chunk if under threshold', async () => {
  const art = { title: '제36조', content: '연차 유급휴가...', clauses: ['(1) ...', '(2) ...'] }
  const chunks = await chunkArticle(art, 1200)
  assert.equal(chunks.length, 1)
  assert.match(chunks[0], /제36조/)
  assert.match(chunks[0], /\(1\) \.\.\./)
})
```

- [ ] **Step 4.3: 테스트 실패 확인**

Run: `cd server && npm test -- tests/rag-v2-chunker.test.ts`
Expected: FAIL — `Cannot find module '../src/services/rag/chunker.js'`

- [ ] **Step 4.4: chunker.ts 구현**

`server/src/services/rag/chunker.ts`:

```typescript
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

export interface ChunkOptions {
  chunkSize: number
  overlap: number
}

export async function chunkText(text: string, opts: ChunkOptions): Promise<string[]> {
  const trimmed = text.trim()
  if (trimmed.length <= opts.chunkSize) return [trimmed]
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: opts.chunkSize,
    chunkOverlap: opts.overlap,
    separators: ['\n\n', '\n', '。', '.', ' ', ''],
  })
  return splitter.splitText(trimmed)
}

export interface ArticleLike {
  title: string
  content: string
  clauses?: string[]
}

export async function chunkArticle(
  article: ArticleLike,
  threshold = 1200,
): Promise<string[]> {
  const parts: string[] = [article.title]
  if (article.content) parts.push(article.content)
  if (article.clauses?.length) parts.push(article.clauses.join('\n'))
  const combined = parts.filter(Boolean).join('\n')
  return chunkText(combined, { chunkSize: threshold, overlap: 120 })
}
```

- [ ] **Step 4.5: 테스트 통과 확인**

Run: `cd server && npm test -- tests/rag-v2-chunker.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 4.6: Commit**

```bash
git add server/src/services/rag/chunker.ts server/tests/rag-v2-chunker.test.ts server/package.json server/package-lock.json
git commit -m "feat(rag): add chunker module with TDD"
```

---

## Task 5: RAG 모듈 — Embedder

**Files:**
- Create: `server/src/services/rag/embedder.ts`

- [ ] **Step 5.1: embedder.ts 구현**

`server/src/services/rag/embedder.ts`:

```typescript
import OpenAI from 'openai'

const MODEL = 'text-embedding-3-small'
const DIMENSIONS = 1536

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function embedOne(text: string): Promise<number[]> {
  const res = await client.embeddings.create({
    model: MODEL,
    input: text,
    dimensions: DIMENSIONS,
  })
  return res.data[0].embedding
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const BATCH = 100
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH)
    let attempt = 0
    while (attempt < 3) {
      try {
        const res = await client.embeddings.create({
          model: MODEL,
          input: slice,
          dimensions: DIMENSIONS,
        })
        out.push(...res.data.map((d) => d.embedding))
        break
      } catch (e) {
        attempt++
        if (attempt >= 3) throw e
        await new Promise((r) => setTimeout(r, 2 ** attempt * 1000))
      }
    }
  }
  return out
}
```

- [ ] **Step 5.2: 빌드 확인**

Run: `cd server && npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 5.3: Commit**

```bash
git add server/src/services/rag/embedder.ts
git commit -m "feat(rag): add embedder module (openai batch with retry)"
```

---

## Task 6: RAG 모듈 — Store (pgvector)

**Files:**
- Create: `server/src/services/rag/store.ts`

- [ ] **Step 6.1: store.ts 구현**

`server/src/services/rag/store.ts`:

```typescript
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })

export interface ChunkRecord {
  source: 'regulations_md' | 'union_regulation_json'
  docId: string | null
  chapter: string | null
  articleTitle: string | null
  content: string
  embedding: number[]
  tokenCount: number | null
  metadata: Record<string, unknown>
}

export async function deleteByDocIds(docIds: string[]): Promise<number> {
  if (!docIds.length) return 0
  const rows = await sql`DELETE FROM rag_chunks_v2 WHERE doc_id IN ${sql(docIds)}`
  return rows.count
}

export async function insertChunks(chunks: ChunkRecord[]): Promise<number> {
  if (!chunks.length) return 0
  const rows = chunks.map((c) => ({
    source: c.source,
    doc_id: c.docId,
    chapter: c.chapter,
    article_title: c.articleTitle,
    content: c.content,
    embedding: `[${c.embedding.join(',')}]`,
    token_count: c.tokenCount,
    metadata: sql.json(c.metadata),
  }))
  const result = await sql`INSERT INTO rag_chunks_v2 ${sql(rows)}`
  return result.count
}

export interface SearchResult {
  id: number
  source: string
  docId: string | null
  articleTitle: string | null
  chapter: string | null
  content: string
  score: number
  metadata: Record<string, unknown> | null
}

export async function searchSimilar(
  queryEmbedding: number[],
  limit = 6,
): Promise<SearchResult[]> {
  const vec = `[${queryEmbedding.join(',')}]`
  const rows = await sql<SearchResult[]>`
    SELECT
      id,
      source,
      doc_id as "docId",
      article_title as "articleTitle",
      chapter,
      content,
      metadata,
      1 - (embedding <=> ${vec}::vector) AS score
    FROM rag_chunks_v2
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${vec}::vector
    LIMIT ${limit}
  `
  return rows.map((r) => ({ ...r, score: Number(r.score) }))
}

export async function countAll(): Promise<number> {
  const [{ cnt }] = await sql<{ cnt: number }[]>`SELECT count(*)::int AS cnt FROM rag_chunks_v2`
  return cnt
}
```

- [ ] **Step 6.2: 빌드 확인**

Run: `cd server && npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 6.3: Commit**

```bash
git add server/src/services/rag/store.ts
git commit -m "feat(rag): add store module (pgvector CRUD + cosine search)"
```

---

## Task 7: RAG 모듈 — Retriever

**Files:**
- Create: `server/src/services/rag/retriever.ts`
- Test: `server/tests/rag-v2-retriever.test.ts`

- [ ] **Step 7.1: 실패하는 테스트 작성**

`server/tests/rag-v2-retriever.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rerankByKeyword } from '../src/services/rag/retriever.js'

test('rerankByKeyword boosts results with exact keyword match', () => {
  const candidates = [
    { id: 1, content: '육아휴직은 3년 이내', articleTitle: '제54조', score: 0.7, source: 'x', docId: null, chapter: null, metadata: null },
    { id: 2, content: '연차 유급휴가는 15일', articleTitle: '제36조', score: 0.8, source: 'x', docId: null, chapter: null, metadata: null },
  ]
  const result = rerankByKeyword('연차 며칠', candidates)
  assert.equal(result[0].id, 2, '연차 매칭이 상위로')
})
```

- [ ] **Step 7.2: 테스트 실패 확인**

Run: `cd server && npm test -- tests/rag-v2-retriever.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 7.3: retriever.ts 구현**

`server/src/services/rag/retriever.ts`:

```typescript
import { embedOne } from './embedder.js'
import { searchSimilar, type SearchResult } from './store.js'

export function rerankByKeyword(query: string, results: SearchResult[]): SearchResult[] {
  const tokens = query
    .toLowerCase()
    .split(/[\s,.?!]+/)
    .filter((t) => t.length >= 2)
  return [...results]
    .map((r) => {
      const hay = `${r.articleTitle ?? ''} ${r.content}`.toLowerCase()
      const boost = tokens.reduce((acc, t) => (hay.includes(t) ? acc + 0.05 : acc), 0)
      return { ...r, score: r.score + boost }
    })
    .sort((a, b) => b.score - a.score)
}

export async function retrieve(query: string, k = 6): Promise<SearchResult[]> {
  const emb = await embedOne(query)
  const raw = await searchSimilar(emb, k * 2)
  return rerankByKeyword(query, raw).slice(0, k)
}
```

- [ ] **Step 7.4: 테스트 통과 확인**

Run: `cd server && npm test -- tests/rag-v2-retriever.test.ts`
Expected: PASS

- [ ] **Step 7.5: Commit**

```bash
git add server/src/services/rag/retriever.ts server/tests/rag-v2-retriever.test.ts
git commit -m "feat(rag): add retriever with keyword rerank"
```

---

## Task 8: RAG 모듈 — Generator (스트리밍)

**Files:**
- Create: `server/src/services/rag/generator.ts`
- Create: `server/src/services/rag/index.ts`

- [ ] **Step 8.1: 의존성 추가**

```bash
cd /Users/momo/Documents/GitHub/bhm_overtime/server
npm install ai @ai-sdk/openai
```

- [ ] **Step 8.2: generator.ts 구현**

`server/src/services/rag/generator.ts`:

```typescript
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import type { SearchResult } from './store.js'

const LLM_MODEL = 'gpt-4o-mini'

const SYSTEM_PROMPT = `당신은 서울대학교병원 노동조합 단체협약 상담 AI입니다.
2026 단체협약 기준으로 답변합니다.

규칙:
- 아래 제공된 규정 컨텍스트만을 근거로 답변하세요
- 답변에 해당 조항 번호(예: 제36조, 제41조)를 반드시 포함하세요
- 컨텍스트에 없는 내용은 "해당 규정을 확인하지 못했습니다"라고 답하세요
- 금액, 일수 등 수치는 원문 그대로 기재하세요
- 간결하고 친절하게, 한국어로 답변하세요`

export function buildContext(results: SearchResult[]): string {
  const lines: string[] = ['## 관련 규정 원문', '']
  for (const r of results) {
    lines.push(`### ${r.articleTitle ?? '(제목 없음)'} [${r.docId ?? ''}]`)
    lines.push(r.content)
    lines.push('')
  }
  return lines.join('\n')
}

export interface GenerateArgs {
  question: string
  results: SearchResult[]
  articleHint?: string
}

export function streamRagAnswer(args: GenerateArgs) {
  const context = buildContext(args.results)
  const userPrefix = args.articleHint ? `[관심 조항: ${args.articleHint}]\n` : ''
  return streamText({
    model: openai(LLM_MODEL),
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: `${context}\n---\n${userPrefix}질문: ${args.question}` },
    ],
    temperature: 0.3,
    maxTokens: 800,
  })
}
```

- [ ] **Step 8.3: index.ts (엔트리) 구현**

`server/src/services/rag/index.ts`:

```typescript
export { chunkText, chunkArticle } from './chunker.js'
export { embedOne, embedBatch } from './embedder.js'
export {
  insertChunks,
  deleteByDocIds,
  searchSimilar,
  countAll,
  type ChunkRecord,
  type SearchResult,
} from './store.js'
export { retrieve, rerankByKeyword } from './retriever.js'
export { streamRagAnswer, buildContext } from './generator.js'
```

- [ ] **Step 8.4: 빌드 확인**

Run: `cd server && npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 8.5: Commit**

```bash
git add server/src/services/rag/generator.ts server/src/services/rag/index.ts server/package.json server/package-lock.json
git commit -m "feat(rag): add streaming generator and entry index"
```

---

## Task 9: Ingest 스크립트

**Files:**
- Create: `server/scripts/ingest-rag-v2.ts`
- Modify: `server/package.json` (scripts)

- [ ] **Step 9.1: ingest 스크립트 구현**

`server/scripts/ingest-rag-v2.ts`:

```typescript
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import 'dotenv/config'
import {
  chunkArticle,
  chunkText,
  embedBatch,
  insertChunks,
  deleteByDocIds,
  countAll,
  type ChunkRecord,
} from '../src/services/rag/index.js'

const ROOT = resolve(new URL('.', import.meta.url).pathname, '../..')

interface JsonArticle {
  id: string
  chapter: string
  title: string
  content: string
  clauses?: string[]
}

async function loadJsonChunks(): Promise<Omit<ChunkRecord, 'embedding'>[]> {
  const raw = await readFile(resolve(ROOT, 'data/union_regulation_2026.json'), 'utf-8')
  const articles: JsonArticle[] = JSON.parse(raw)
  const out: Omit<ChunkRecord, 'embedding'>[] = []
  for (const art of articles) {
    const chunks = await chunkArticle(
      { title: art.title, content: art.content, clauses: art.clauses },
      1200,
    )
    chunks.forEach((content, idx) => {
      out.push({
        source: 'union_regulation_json',
        docId: `${art.id}${chunks.length > 1 ? `__p${idx}` : ''}`,
        chapter: art.chapter,
        articleTitle: art.title,
        content,
        tokenCount: Math.ceil(content.length / 2.5),
        metadata: { article_ref: art.title, origin_id: art.id },
      })
    })
  }
  return out
}

async function loadMdChunks(): Promise<Omit<ChunkRecord, 'embedding'>[]> {
  const raw = await readFile(resolve(ROOT, 'data/regulations_full_v2026.md'), 'utf-8')
  const lines = raw.split('\n')
  type Section = { chapter: string; title: string; body: string[] }
  const sections: Section[] = []
  let curChapter = ''
  let cur: Section | null = null
  for (const line of lines) {
    if (line.startsWith('## ')) {
      curChapter = line.replace(/^##\s+/, '').trim()
      continue
    }
    if (line.startsWith('### ')) {
      if (cur) sections.push(cur)
      cur = { chapter: curChapter, title: line.replace(/^###\s+/, '').trim(), body: [] }
      continue
    }
    if (cur) cur.body.push(line)
  }
  if (cur) sections.push(cur)

  const out: Omit<ChunkRecord, 'embedding'>[] = []
  for (const sec of sections) {
    const text = `${sec.title}\n${sec.body.join('\n')}`.trim()
    const slug = sec.title.replace(/[\s()]+/g, '_').toLowerCase()
    const chunks = await chunkText(text, { chunkSize: 800, overlap: 120 })
    chunks.forEach((content, idx) => {
      out.push({
        source: 'regulations_md',
        docId: `md_${slug}${chunks.length > 1 ? `__p${idx}` : ''}`,
        chapter: sec.chapter,
        articleTitle: sec.title,
        content,
        tokenCount: Math.ceil(content.length / 2.5),
        metadata: { slug },
      })
    })
  }
  return out
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const write = process.argv.includes('--write')
  if (!dryRun && !write) {
    console.error('Use --dry-run or --write')
    process.exit(1)
  }

  console.log('Loading JSON chunks...')
  const jsonChunks = await loadJsonChunks()
  console.log(`  ${jsonChunks.length} chunks from union_regulation_2026.json`)

  console.log('Loading MD chunks...')
  const mdChunks = await loadMdChunks()
  console.log(`  ${mdChunks.length} chunks from regulations_full_v2026.md`)

  const all = [...jsonChunks, ...mdChunks]
  console.log(`Total: ${all.length} chunks`)

  if (dryRun) {
    console.log('\n=== DRY RUN PREVIEW (first 3) ===')
    for (const c of all.slice(0, 3)) {
      console.log(`[${c.source}] ${c.docId} — ${c.articleTitle}`)
      console.log(c.content.slice(0, 120) + '...')
      console.log('')
    }
    const totalTokens = all.reduce((s, c) => s + (c.tokenCount ?? 0), 0)
    console.log(`Estimated tokens: ${totalTokens} (~$${((totalTokens / 1000) * 0.00002).toFixed(4)} for embedding)`)
    return
  }

  console.log('\nEmbedding...')
  const embeddings = await embedBatch(all.map((c) => c.content))
  const records: ChunkRecord[] = all.map((c, i) => ({ ...c, embedding: embeddings[i] }))

  console.log('Clearing existing docs for replay...')
  const docIds = records.map((r) => r.docId!).filter(Boolean)
  await deleteByDocIds(docIds)

  console.log('Inserting...')
  const inserted = await insertChunks(records)
  const total = await countAll()
  console.log(`Inserted ${inserted}. Total in table: ${total}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

- [ ] **Step 9.2: package.json 스크립트 추가**

`server/package.json` 의 `scripts` 에 두 줄 추가:

```json
"rag:v2:ingest": "tsx scripts/ingest-rag-v2.ts",
"rag:v2:verify": "tsx scripts/verify-rag-v2.ts"
```

- [ ] **Step 9.3: Dry-run 실행**

Run: `cd server && npm run rag:v2:ingest -- --dry-run`
Expected: JSON chunks ≥ 50, MD chunks ≥ 5, preview 3개 출력, 토큰/비용 추정.

- [ ] **Step 9.4: Write 실행**

Run: `cd server && npm run rag:v2:ingest -- --write`
Expected: "Inserted N. Total in table: N" 출력.

- [ ] **Step 9.5: DB 확인**

Run:
```bash
psql "$DATABASE_URL" -c "SELECT source, count(*) FROM rag_chunks_v2 GROUP BY source"
```
Expected: `regulations_md` 와 `union_regulation_json` 두 행 모두 > 0.

- [ ] **Step 9.6: 수동 벡터 검색 검증**

`server/scripts/manual-search-check.ts` (임시):

```typescript
import 'dotenv/config'
import { retrieve } from '../src/services/rag/index.js'

const results = await retrieve('연차 며칠이야')
for (const r of results.slice(0, 3)) {
  console.log(`[${r.score.toFixed(3)}] ${r.articleTitle}: ${r.content.slice(0, 80)}`)
}
```

Run: `cd server && npx tsx scripts/manual-search-check.ts`
Expected: top-3 결과에 "제36조" 또는 "연차" 포함.

- [ ] **Step 9.7: 임시 스크립트 제거**

```bash
rm server/scripts/manual-search-check.ts
```

- [ ] **Step 9.8: Commit**

```bash
git add server/scripts/ingest-rag-v2.ts server/package.json
git commit -m "feat(rag): add ingest script for md + json sources"
```

---

## Task 10: `/api/rag/chat` 엔드포인트

**Files:**
- Create: `server/src/routes/ragChat.ts`
- Create: `api/rag/chat.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 10.1: Hono route 구현**

`server/src/routes/ragChat.ts`:

```typescript
import { Hono } from 'hono'
import { stream } from 'hono/streaming'
import postgres from 'postgres'
import 'dotenv/config'
import { retrieve, streamRagAnswer } from '../services/rag/index.js'

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })
const route = new Hono()

const MAX_QUESTION = 2000
const RATE_LIMIT_PER_MIN = 20

async function checkRateLimit(sessionId: string): Promise<boolean> {
  const [row] = await sql<{ cnt: number }[]>`
    SELECT count(*)::int AS cnt
    FROM chat_history
    WHERE session_id = ${sessionId}
      AND created_at > now() - interval '1 minute'
  `
  return (row?.cnt ?? 0) < RATE_LIMIT_PER_MIN
}

route.post('/', async (c) => {
  const body = await c.req.json<{ question: string; sessionId?: string; articleHint?: string }>()
  const question = (body.question ?? '').trim()
  const sessionId = body.sessionId ?? `anon-${Date.now()}`
  const articleHint = body.articleHint?.trim() || undefined

  if (!question) return c.json({ error: 'question is required' }, 400)
  if (question.length > MAX_QUESTION) return c.json({ error: 'question too long' }, 400)
  if (!(await checkRateLimit(sessionId))) return c.json({ error: 'rate limit exceeded' }, 429)

  const results = await retrieve(question, 6)

  await sql`
    INSERT INTO chat_history (session_id, role, content)
    VALUES (${sessionId}, 'user', ${question})
  `

  const result = streamRagAnswer({ question, results, articleHint })

  return stream(c, async (writer) => {
    let fullAnswer = ''
    for await (const delta of result.textStream) {
      fullAnswer += delta
      await writer.write(`data: ${JSON.stringify({ type: 'delta', text: delta })}\n\n`)
    }
    const sources = results.map((r) => ({
      title: r.articleTitle,
      ref: r.docId,
      score: r.score,
    }))
    await writer.write(`data: ${JSON.stringify({ type: 'done', sources })}\n\n`)

    await sql`
      INSERT INTO chat_history (session_id, role, content, source_docs, model)
      VALUES (${sessionId}, 'assistant', ${fullAnswer}, ${sql.json(sources)}, 'gpt-4o-mini')
    `
  })
})

export default route
```

- [ ] **Step 10.2: server 라우터에 마운트**

`server/src/index.ts` 에 import + mount 추가:

```typescript
import ragChatRoutes from './routes/ragChat.js'
// ... 기존 라우터 마운트 근처에
app.route('/api/rag/chat', ragChatRoutes)
```

- [ ] **Step 10.3: Vercel 함수 진입점 생성**

`api/rag/chat.ts`:

```typescript
export { default, config } from '../_shared.js'
```

- [ ] **Step 10.4: 로컬 서버 기동 + 스트리밍 테스트**

Terminal A: `cd server && npm run dev`
Terminal B:
```bash
curl -N -X POST http://localhost:3001/api/rag/chat \
  -H 'Content-Type: application/json' \
  -d '{"question":"연차 며칠이야"}'
```
Expected: `data: {"type":"delta",...}` 라인이 여러 번, 마지막에 `data: {"type":"done","sources":[...]}`. 답변에 "제36조" 포함.

- [ ] **Step 10.5: 컨텍스트 밖 질문 테스트**

```bash
curl -N -X POST http://localhost:3001/api/rag/chat \
  -H 'Content-Type: application/json' \
  -d '{"question":"대표이사 전화번호 알려줘"}'
```
Expected: "확인되지 않" 또는 "확인하지 못했" 문구 포함.

- [ ] **Step 10.6: Commit**

```bash
git add server/src/routes/ragChat.ts server/src/index.ts api/rag/chat.ts
git commit -m "feat(api): add /api/rag/chat streaming endpoint"
```

---

## Task 11: UI — 조항 카드 4번째 버튼 + 바텀시트

**Files:**
- Create: `chat-ui.js`
- Modify: `regulation.js:620-626` (grid-4 + 버튼 활성)
- Modify: `regulation.js:868-877` (askAboutArticle 시그니처 확장)
- Modify: `regulation.html:575-581` (CSS grid-4 추가)
- Modify: `regulation.html` (`<script src="chat-ui.js">` 태그 추가)
- Modify: `index.html` (`?v=` 번프)

- [ ] **Step 11.1: chat-ui.js 생성 (DOM API only, no innerHTML)**

`/Users/momo/Documents/GitHub/bhm_overtime/chat-ui.js`:

```javascript
(function() {
  'use strict';

  var API_BASE = (function() {
    if (location.protocol === 'file:') return 'http://localhost:3001/api';
    var localHosts = { 'localhost': true, '127.0.0.1': true, '::1': true };
    if (localHosts[location.hostname] && location.port !== '3001') return 'http://localhost:3001/api';
    return '/api';
  })();

  var sessionId = 'ask-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  var STYLE_CSS = [
    '.ask-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9998;display:none}',
    '.ask-backdrop.open{display:block}',
    '.ask-sheet{position:fixed;left:0;right:0;bottom:0;z-index:9999;background:var(--bg-card,#fff);border-top:2px solid var(--text-primary,#1a1a1a);border-radius:16px 16px 0 0;max-height:82vh;display:none;flex-direction:column;box-shadow:0 -4px 16px rgba(0,0,0,0.15)}',
    '.ask-sheet.open{display:flex}',
    '.ask-header{padding:14px 16px;border-bottom:1px solid rgba(0,0,0,0.08);display:flex;justify-content:space-between;align-items:center;font-weight:700}',
    '.ask-close{background:none;border:none;font-size:22px;cursor:pointer;padding:4px 8px}',
    '.ask-messages{flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:10px}',
    '.ask-msg{padding:10px 12px;border-radius:10px;max-width:90%;line-height:1.5;white-space:pre-wrap;word-break:break-word}',
    '.ask-msg.user{align-self:flex-end;background:#1a1a1a;color:#fff}',
    '.ask-msg.assistant{align-self:flex-start;background:#f4f4f4}',
    '.ask-sources{margin-top:8px;display:flex;flex-wrap:wrap;gap:6px}',
    '.ask-source-chip{padding:4px 10px;border:1px solid rgba(0,0,0,0.15);border-radius:12px;font-size:12px;background:#fff;cursor:pointer}',
    '.ask-input-row{display:flex;gap:8px;padding:12px 16px;border-top:1px solid rgba(0,0,0,0.08)}',
    '.ask-input{flex:1;padding:10px 12px;border:1px solid #ccc;border-radius:8px;font-family:inherit;font-size:14px}',
    '.ask-send{padding:10px 16px;background:#1a1a1a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700}',
    '.ask-send:disabled{opacity:0.5;cursor:not-allowed}',
    '.ask-error{color:#c00;padding:8px 12px;font-size:13px}'
  ].join('\n');

  function ensureStyles() {
    if (document.getElementById('chat-ui-styles')) return;
    var style = document.createElement('style');
    style.id = 'chat-ui-styles';
    style.textContent = STYLE_CSS;
    document.head.appendChild(style);
  }

  function buildSheet() {
    ensureStyles();

    var backdrop = el('div', 'ask-backdrop');
    var sheet = el('div', 'ask-sheet');

    var header = el('div', 'ask-header');
    var title = el('span', 'ask-title', '📜 AI 질문');
    var closeBtn = el('button', 'ask-close', '×');
    header.appendChild(title);
    header.appendChild(closeBtn);

    var msgs = el('div', 'ask-messages');

    var inputRow = el('div', 'ask-input-row');
    var input = el('input', 'ask-input');
    input.type = 'text';
    input.placeholder = '규정에 대해 질문하세요';
    var sendBtn = el('button', 'ask-send', '전송');
    inputRow.appendChild(input);
    inputRow.appendChild(sendBtn);

    sheet.appendChild(header);
    sheet.appendChild(msgs);
    sheet.appendChild(inputRow);
    document.body.appendChild(backdrop);
    document.body.appendChild(sheet);

    var inflight = false;

    function closeSheet() {
      backdrop.classList.remove('open');
      sheet.classList.remove('open');
    }
    closeBtn.addEventListener('click', closeSheet);
    backdrop.addEventListener('click', closeSheet);

    function appendUser(text) {
      msgs.appendChild(el('div', 'ask-msg user', text));
      msgs.scrollTop = msgs.scrollHeight;
    }

    function appendAssistant() {
      var node = el('div', 'ask-msg assistant', '');
      msgs.appendChild(node);
      msgs.scrollTop = msgs.scrollHeight;
      return node;
    }

    function renderSources(assistantNode, sources) {
      if (!sources || !sources.length) return;
      var wrap = el('div', 'ask-sources');
      var seen = {};
      sources.slice(0, 5).forEach(function(s) {
        if (!s.title || seen[s.title]) return;
        seen[s.title] = true;
        var chip = el('button', 'ask-source-chip', s.title);
        chip.addEventListener('click', function() {
          closeSheet();
          if (window.scrollToArticle) window.scrollToArticle(s.title);
        });
        wrap.appendChild(chip);
      });
      assistantNode.appendChild(wrap);
    }

    async function handleSend(articleHint) {
      var q = input.value.trim();
      if (!q || inflight) return;
      inflight = true;
      sendBtn.disabled = true;
      appendUser(q);
      input.value = '';
      var assistantNode = appendAssistant();

      try {
        var res = await fetch(API_BASE + '/rag/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q, sessionId: sessionId, articleHint: articleHint })
        });
        if (!res.ok) {
          if (res.status === 429) throw new Error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
          throw new Error('서버 오류 (' + res.status + ')');
        }
        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var buffer = '';
        var sources = null;
        while (true) {
          var chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          var lines = buffer.split('\n\n');
          buffer = lines.pop() || '';
          for (var i = 0; i < lines.length; i++) {
            var line = lines[i].replace(/^data:\s*/, '').trim();
            if (!line) continue;
            try {
              var ev = JSON.parse(line);
              if (ev.type === 'delta') {
                assistantNode.textContent += ev.text;
                msgs.scrollTop = msgs.scrollHeight;
              } else if (ev.type === 'done') {
                sources = ev.sources;
              }
            } catch (e) { /* ignore partial */ }
          }
        }
        renderSources(assistantNode, sources);
      } catch (e) {
        msgs.appendChild(el('div', 'ask-error', e.message || '오류가 발생했습니다.'));
      } finally {
        inflight = false;
        sendBtn.disabled = false;
      }
    }

    return {
      open: function(opts) {
        opts = opts || {};
        var ref = opts.articleRef || '';
        var t = opts.title || '';
        if (ref || t) {
          title.textContent = '📜 ' + (ref + (t ? ' — ' + t : '')) + ' 에 대해 질문';
        } else {
          title.textContent = '📜 AI 질문';
        }
        while (msgs.firstChild) msgs.removeChild(msgs.firstChild);
        input.value = opts.prefill || '';
        var hint = (ref || t) ? (ref + ' ' + t).trim() : undefined;
        sendBtn.onclick = function() { handleSend(hint); };
        input.onkeydown = function(e) { if (e.key === 'Enter') handleSend(hint); };
        backdrop.classList.add('open');
        sheet.classList.add('open');
        setTimeout(function() { input.focus(); }, 100);
      }
    };
  }

  var api = null;
  window.AskChatUI = {
    open: function(opts) {
      if (!api) api = buildSheet();
      api.open(opts);
    }
  };
})();
```

- [ ] **Step 11.2: regulation.html CSS grid-4 추가**

`regulation.html:577` 의 `.reg-action-grid-3` 블록 **직후에** 추가:

```css
    .reg-action-grid-4 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 6px;
    }
    @media (max-width: 380px) {
      .reg-action-grid-4 {
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }
    }
```

- [ ] **Step 11.3: regulation.html 에 chat-ui.js 스크립트 태그 추가**

`regulation.html` 의 `<script src="regulation.js?v=...">` 태그 **바로 앞에** 추가:

```html
    <script src="chat-ui.js?v=1"></script>
```

- [ ] **Step 11.4: regulation.js 버튼 활성 + grid-4 전환**

`regulation.js:620-626` 를 다음으로 교체:

```javascript
      +   '<div class="reg-action-grid-4">'
      +     '<button class="reg-action-btn btn-pdf" onclick="openPdfForRef(\'' + escapedRef + '\')">📄<br>PDF<span class="reg-action-btn-sub">원문 보기</span></button>'
      +     '<a class="reg-action-btn btn-call" href="' + telHref + '">📞<br>전화' + (deptInfo.phone ? '<span class="reg-action-btn-sub">' + escapeHtml(deptInfo.phone) + '</span>' : '') + '</a>'
      +     '<a class="reg-action-btn btn-mail" href="' + mailtoHref + '">✉️<br>이메일<span class="reg-action-btn-sub">' + escapeHtml(deptInfo.email || '문의') + '</span></a>'
      +     '<button class="reg-action-btn" onclick="askAboutArticle(\'' + escapeHtml(article.title).replace(/\u0027/g, "\\u0027") + '\',\'' + escapedRef + '\')">💬<br>AI 질문<span class="reg-action-btn-sub">규정 상담</span></button>'
      +   '</div>'
```

- [ ] **Step 11.5: askAboutArticle 함수 교체**

`regulation.js:868-877` 의 기존 `askAboutArticle` 를 다음으로 교체:

```javascript
function askAboutArticle(title, articleRef) {
  if (window.AskChatUI && window.AskChatUI.open) {
    window.AskChatUI.open({
      title: title || '',
      articleRef: articleRef || '',
      prefill: ''
    });
  }
}

window.scrollToArticle = function(refOrTitle) {
  if (!refOrTitle) return;
  var cards = document.querySelectorAll('.reg-card, [data-article-ref]');
  for (var i = 0; i < cards.length; i++) {
    var txt = cards[i].textContent || '';
    if (txt.indexOf(refOrTitle) !== -1) {
      cards[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
  }
};
```

- [ ] **Step 11.6: index.html 의 regulation.js 버전 번프**

`index.html` 에서 `regulation.js?v=X` 의 X 를 1 증가. 새로 추가된 `chat-ui.js?v=1` 도 포함 확인.

- [ ] **Step 11.7: 로컬 수동 검증**

Terminal A: `cd server && npm run dev`
Terminal B: `cd /Users/momo/Documents/GitHub/bhm_overtime && python3 -m http.server 8080`
브라우저: `http://localhost:8080/regulation.html` → 임의 조항 검색/펼침 → 액션박스에 4개 버튼 (PDF/전화/이메일/AI 질문) → "AI 질문" 클릭 → 바텀시트 오픈 → "연차 며칠이야" 입력 → 토큰 실시간 렌더 + 출처 chip 표시.

- [ ] **Step 11.8: 모바일 뷰포트 검증**

Chrome DevTools 모바일 에뮬레이터 375px → 버튼 4개가 2×2 그리드로 깨지지 않고 정렬, 바텀시트 정상 표시.

- [ ] **Step 11.9: Commit**

```bash
git add chat-ui.js regulation.js regulation.html index.html
git commit -m "feat(ui): add AI question button to regulation cards with chat bottom sheet"
```

---

## Task 12: 품질 평가 골든셋

**Files:**
- Create: `server/tests/rag-v2-golden.json`
- Create: `server/scripts/verify-rag-v2.ts`

- [ ] **Step 12.1: 골든셋 작성**

`server/tests/rag-v2-golden.json`:

```json
[
  { "question": "연차 유급휴가는 며칠이야?", "expected_refs": ["제36조"] },
  { "question": "본인 결혼하면 며칠 쉬어?", "expected_refs": ["제41조"] },
  { "question": "배우자 출산 휴가 얼마나 줘?", "expected_refs": ["제41조"] },
  { "question": "M3 상여금 연간 얼마야?", "expected_refs": ["제51조"] },
  { "question": "퇴직금 지급률은 어떻게 계산해?", "expected_refs": ["제52조"] },
  { "question": "맞춤형 복지 기본 포인트가 얼마야?", "expected_refs": ["제58조"] },
  { "question": "정기 건강검진 얼마나 자주 받아?", "expected_refs": ["제65조"] },
  { "question": "육아휴직 기간이 어떻게 돼?", "expected_refs": ["육아휴직"] },
  { "question": "장애인 처우 개선수당 얼마 받아?", "expected_refs": ["장애인"] },
  { "question": "환경유지지원직 가계지원비 인상액 얼마야?", "expected_refs": ["환경유지"] }
]
```

- [ ] **Step 12.2: verify 스크립트 구현**

`server/scripts/verify-rag-v2.ts`:

```typescript
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import 'dotenv/config'
import { retrieve, streamRagAnswer } from '../src/services/rag/index.js'

const ROOT = resolve(new URL('.', import.meta.url).pathname, '../..')

interface GoldenItem {
  question: string
  expected_refs: string[]
}

async function collectAnswer(question: string): Promise<{ answer: string; sources: string[] }> {
  const results = await retrieve(question, 6)
  const stream = streamRagAnswer({ question, results })
  let full = ''
  for await (const delta of stream.textStream) full += delta
  return {
    answer: full,
    sources: results.map((r) => r.articleTitle ?? '').filter(Boolean),
  }
}

async function main() {
  const raw = await readFile(resolve(ROOT, 'server/tests/rag-v2-golden.json'), 'utf-8')
  const items: GoldenItem[] = JSON.parse(raw)

  let pass = 0
  for (const item of items) {
    const { answer, sources } = await collectAnswer(item.question)
    const hay = (answer + ' ' + sources.join(' ')).toLowerCase()
    const ok = item.expected_refs.some((ref) => hay.includes(ref.toLowerCase()))
    if (ok) pass++
    console.log(`${ok ? '✓' : '✗'} ${item.question}`)
    if (!ok) {
      console.log(`    expected refs: ${item.expected_refs.join(', ')}`)
      console.log(`    answer: ${answer.slice(0, 200)}`)
    }
  }

  const total = items.length
  console.log(`\nScore: ${pass}/${total} (${((pass / total) * 100).toFixed(0)}%)`)
  if (pass < 8) {
    console.error('FAIL: expected >= 8/10')
    process.exit(1)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 12.3: 실행**

Run: `cd server && npm run rag:v2:verify`
Expected: 최소 8/10 통과.

- [ ] **Step 12.4: 실패 시 튜닝 (필요한 경우만)**

8/10 미만이면:
- `chunker.ts` 에서 `chunkSize` 를 600 으로 낮춰 재ingest
- `retriever.ts` 의 keyword boost 를 0.05 → 0.08 로 증가
- 실패한 질문의 기대 조항이 실제 소스에 있는지 `grep` 으로 확인
- 튜닝 후 다시 verify

- [ ] **Step 12.5: Commit**

```bash
git add server/tests/rag-v2-golden.json server/scripts/verify-rag-v2.ts
git commit -m "test(rag): add golden quality verification (>=8/10 gate)"
```

---

## Task 13: 재사용 스타터킷 문서

**Files:**
- Create: `docs/rag-starter-kit.md`

- [ ] **Step 13.1: 문서 작성**

`docs/rag-starter-kit.md`:

```markdown
# RAG Starter Kit — Vercel + Neon pgvector

이 프로젝트의 `server/src/services/rag/` 모듈을 다른 프로젝트에 30분 안에 이식하는 가이드.

## 구성

| 모듈 | 책임 |
|------|------|
| `chunker.ts` | 텍스트/조항을 chunk 로 분할 (LangChain text-splitter) |
| `embedder.ts` | OpenAI 임베딩 (배치 + 재시도) |
| `store.ts` | pgvector insert/search SQL |
| `retriever.ts` | top-k 검색 + 키워드 rerank |
| `generator.ts` | Vercel AI SDK streamText LLM |
| `index.ts` | 5개 모듈 entry |

## 의존성

```
npm install ai @ai-sdk/openai openai postgres @langchain/textsplitters
```

환경변수:
- `OPENAI_API_KEY`
- `DATABASE_URL` (Neon Postgres with pgvector)

## 이식 6단계

1. `server/src/services/rag/` 폴더 복사
2. DB 에 아래 테이블 생성:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   CREATE TABLE rag_chunks_v2 (
     id SERIAL PRIMARY KEY,
     source TEXT NOT NULL,
     doc_id TEXT,
     chapter TEXT,
     article_title TEXT,
     content TEXT NOT NULL,
     embedding VECTOR(1536),
     token_count INTEGER,
     metadata JSONB DEFAULT '{}',
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   CREATE INDEX ON rag_chunks_v2 USING hnsw (embedding vector_cosine_ops);
   ```
3. ingest 스크립트 작성 (도메인 특화) — 이 프로젝트의 `ingest-rag-v2.ts` 참고
4. Hono route 마운트:
   ```typescript
   import { retrieve, streamRagAnswer } from './services/rag/index.js'
   ```
5. Vercel API entry (`api/rag/chat.ts`) 생성
6. 프론트에서 `fetch(..., { method: 'POST' })` + `ReadableStream` 파싱

## 비용 추정 (OpenAI 기준)

- 임베딩 1회 (10만 토큰) ≈ $0.002 (text-embedding-3-small)
- 월 1000 쿼리 (쿼리당 평균 2k 토큰 in + 500 out, gpt-4o-mini) ≈ $0.50
- → 월 $1 미만으로 운영 가능

## 한계

- 벡터 DB 를 Postgres 에 두므로 수천만 chunk 규모는 외부 벡터 DB 로 마이그레이션 필요
- 멀티턴 대화는 미지원 — 필요 시 `generator.ts` 의 messages 배열 확장
- 한국어 전용으로 튜닝됨 — 타 언어는 프롬프트 재작성
```

- [ ] **Step 13.2: Commit**

```bash
git add docs/rag-starter-kit.md
git commit -m "docs(rag): add starter kit reuse guide"
```

---

## Task 14: 릴리스 노트 + CLAUDE.md 갱신

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `CLAUDE.md`

- [ ] **Step 14.1: CHANGELOG 갱신**

`CHANGELOG.md` 최상단에 추가:

```markdown
## 2026-04-20 — RAG v2 교체

### Added
- `rag_chunks_v2` 테이블 + pgvector HNSW 인덱스
- `server/src/services/rag/` 5개 모듈 (chunker/embedder/store/retriever/generator)
- `/api/rag/chat` 스트리밍 엔드포인트 (Vercel AI SDK)
- `regulation.html` 조항 카드에 "💬 AI 질문" 버튼 + 바텀시트
- `chat-ui.js` 재사용 가능한 채팅 모듈
- `docs/rag-starter-kit.md` 이식 가이드

### Changed
- 홈 그리드 / 네비에서 카드뉴스·FAQ 진입점 제거 (API 라우트는 유지)

### Unchanged (의도적)
- `/api/faq/*`, `/api/card-news/*` 백엔드
- `regulation_documents`, `faq_entries` DB 데이터
```

- [ ] **Step 14.2: CLAUDE.md 변경 이력 갱신**

`CLAUDE.md` 의 "변경 이력" 테이블에 한 줄 추가:

```markdown
| 2026-04-20 | RAG v2 교체 (신규 rag_chunks_v2 + /api/rag/chat 스트리밍 + 조항 카드 AI 질문 버튼) | 사용자 챗봇 | 원문 기반 재구축, FAQ/card-news API 는 백엔드 유지 + UI 접점만 제거 |
```

- [ ] **Step 14.3: Commit**

```bash
git add CHANGELOG.md CLAUDE.md
git commit -m "docs: changelog and CLAUDE.md for rag v2 release"
```

---

## Task 15: 배포 + 검증

- [ ] **Step 15.1: 프리뷰 배포**

```bash
cd /Users/momo/Documents/GitHub/bhm_overtime
git push origin main
```
Vercel 자동 프리뷰 URL 확인.

- [ ] **Step 15.2: Neon 프로덕션 DB 에 ingest 실행**

(로컬에서 프로덕션 `DATABASE_URL` 로 Neon 접근)

```bash
cd server && DATABASE_URL="$DATABASE_URL_PRODUCTION" npm run rag:v2:ingest -- --write
```
Expected: Inserted N, total >= 50.

- [ ] **Step 15.3: 프로덕션 엔드포인트 smoke**

```bash
curl -N -X POST https://snuhmate.com/api/rag/chat \
  -H 'Content-Type: application/json' \
  -d '{"question":"연차 며칠이야"}'
```
Expected: 스트리밍 응답 + "제36조" 포함.

- [ ] **Step 15.4: 프로덕션 UI 검증**

브라우저: `https://snuhmate.com/regulation.html` → 조항 카드 → "AI 질문" 버튼 → 바텀시트 → 질문 → 응답 확인.

- [ ] **Step 15.5: 24시간 모니터링**

- Sentry 대시보드: 신규 `/api/rag/chat` 관련 에러율 확인
- `/api/faq/*` Sentry 에러 변화 없는지 (백엔드 무변경 회귀 테스트)
- `chat_history` 테이블: `SELECT count(*) FROM chat_history WHERE created_at > now() - interval '24 hours'`

- [ ] **Step 15.6: 완료 태그**

```bash
git tag -a rag-v2-launch -m "RAG v2 launched 2026-04-20"
git push origin rag-v2-launch
```

---

## 완료 기준 (Definition of Done)

- [ ] Task 1~15 모두 커밋
- [ ] `verify-rag-v2.ts` ≥ 8/10 통과
- [ ] 프로덕션 스모크 테스트 통과
- [ ] 24h Sentry 에러율 이전 대비 증가 없음
- [ ] `docs/rag-starter-kit.md` 따라 빈 프로젝트에서 30분 내 챗봇 기동 가능 확인
