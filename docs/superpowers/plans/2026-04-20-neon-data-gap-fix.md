# Neon DB Data Gap Fix — Supabase → Neon 데이터 이관 복구 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Neon 으로 DB 를 옮기면서 **스키마만 이관되고 초기 데이터(seed)가 안 넘어와서** 기능이 비어있는 상태를 복구한다. 규정 문서, FAQ, 수당/급여표/휴가유형/경조사 등 마스터 데이터를 Neon 에 다시 적재.

**조사 결과 (2026-04-20):**
- 스키마: Drizzle 마이그레이션 0000~0005 모두 적용됨 — 테이블은 다 있음
- 데이터: `regulation_documents`, `faq_entries`, `regulation_versions`, `allowances`, `pay_tables`, `leave_types`, `ceremonies`, `calculation_rules` 등 **대부분 빈 테이블**
- `chat_history`, `admin_users` 는 정상 작동 (런타임 INSERT 로 채워지는 테이블)
- 실제 런타임: `/api/faq/search` → 결과 없음, `/api/chat` (RAG) → 임베딩 없어서 답변 빈약

**Architecture:**
- DB connection: `server/src/db/client.ts` 가 `DATABASE_URL` (Neon) 로 postgres-js + drizzle 연결
- 단일 DATABASE_URL — admin/user 구분 없이 모두 Neon 사용 (CLAUDE.md 는 구 상태 기준, 실제 코드는 Neon 일원화됨)
- 기존 Supabase migrations 는 `supabase/migrations/` 에 3개만 있음 (drop 계열). 실데이터 백업은 Supabase Dashboard 에만 존재할 가능성 높음

**Tech Stack:** TypeScript, Drizzle ORM, postgres-js, Neon serverless, tsx

---

## Phase A: 현재 Neon 상태 진단

목적: 어떤 테이블이 비어있는지, 어디서 런타임 에러가 나는지 정확히 측정.

### Task A1: Neon 테이블별 row count 덤프 스크립트

**Files:**
- Create: `server/scripts/audit-neon-tables.ts`

**목적:** DATABASE_URL 을 읽고 `information_schema.tables` 에서 모든 public 테이블을 찾아 각각 `SELECT COUNT(*)` 실행. 결과를 표로 출력.

- [ ] **Step 1: 스크립트 작성**

```typescript
// server/scripts/audit-neon-tables.ts
import 'dotenv/config';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL missing'); process.exit(1); }

const sql = postgres(url, { prepare: false });

const tables = await sql<Array<{ table_name: string }>>`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY table_name
`;

const rows: Array<{ table: string; count: number; err?: string }> = [];
for (const t of tables) {
  try {
    const r = await sql`SELECT COUNT(*)::int AS c FROM ${sql(t.table_name)}`;
    rows.push({ table: t.table_name, count: r[0].c });
  } catch (e) {
    rows.push({ table: t.table_name, count: -1, err: (e as Error).message });
  }
}

console.log('\nTable Counts (Neon):');
console.log('─'.repeat(50));
rows.forEach(r => {
  const marker = r.count === 0 ? '⚠️ EMPTY' : r.count < 0 ? '❌ ERR' : '✓';
  console.log(`${marker}  ${r.table.padEnd(30)} ${r.count >= 0 ? r.count : r.err}`);
});

await sql.end();
```

- [ ] **Step 2: 실행 + 결과 기록**

```bash
cd server && npx tsx scripts/audit-neon-tables.ts > /tmp/neon-audit.txt
cat /tmp/neon-audit.txt
```

`/tmp/neon-audit.txt` 를 이 플랜 끝 부록에 첨부해서 "빈 테이블 목록" 확정.

**검증:**
- 최소 모든 테이블이 리스트됨 (information_schema 에서 나온 것 기준)
- 빈 것 / 있는 것 구분 가능

---

### Task A2: API 엔드포인트 smoke test — 어디가 깨지는지 확인

**Files:**
- Create: `server/scripts/smoke-api-endpoints.ts`

**목적:** 프로덕션 Vercel 배포 URL (또는 로컬 dev server) 에 대해 주요 GET 엔드포인트를 호출. 5xx / 빈 배열 / throw 인지 구분.

- [ ] **Step 1: 스크립트**

대상 엔드포인트:
- `/api/health` — 200 OK 기대
- `/api/faq` — 목록 (빈 배열이면 seed 필요)
- `/api/faq/search?q=야간수당` — 검색 (빈 결과면 embedding 없음)
- `/api/regulations/browse` — 규정 목록 (빈이면 ingest 필요)
- `/api/chat` (POST) — 실제 질의 ("야간근무 수당 계산 방법") 로 답변 품질 확인
- `/api/data/bundle` — 마스터 데이터 bundle (allowances, pay_tables 등)
- `/api/card-news` — 카드뉴스 목록

```typescript
import fetch from 'node-fetch'; // 또는 global fetch (node 18+)

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3000';

const endpoints = [
  { path: '/api/health', method: 'GET' },
  { path: '/api/faq', method: 'GET' },
  { path: '/api/faq/search?q=야간수당', method: 'GET' },
  { path: '/api/regulations/browse', method: 'GET' },
  { path: '/api/data/bundle', method: 'GET' },
  { path: '/api/card-news', method: 'GET' },
];

for (const ep of endpoints) {
  try {
    const r = await fetch(BASE + ep.path, { method: ep.method });
    const ct = r.headers.get('content-type') || '';
    const body = ct.includes('json') ? await r.json() : await r.text();
    const sz = Array.isArray(body) ? `${body.length} items` : (typeof body === 'object' ? JSON.stringify(body).slice(0, 100) : String(body).slice(0, 80));
    console.log(`${r.status} ${ep.path.padEnd(40)} ${sz}`);
  } catch (e) {
    console.log(`ERR ${ep.path}: ${(e as Error).message}`);
  }
}
```

- [ ] **Step 2: 실행**

프로덕션 URL 상대로 돌리려면 `SMOKE_BASE_URL=https://snuhmate.com npx tsx scripts/smoke-api-endpoints.ts` — 하지만 보호된 경로는 auth 필요할 수 있음. 일단 public GET 만.

**검증:**
- 2xx 응답 여부 + body 크기 확인
- 빈 배열 / null / NaN 인 엔드포인트가 어느 테이블 영향인지 추정

---

## Phase B: 누락 데이터 복원

### Task B1: 규정 문서 ingest + 임베딩 (가장 중요)

**Files:**
- Existing: `server/scripts/ingest-regulation-docs.ts` (원본 PDF/MD → `regulation_documents` 청크 적재)
- Existing: `server/scripts/embed-regulation-docs.ts` (청크 → OpenAI 임베딩)

**배경:** RAG 파이프라인 (/api/chat) 이 `regulation_documents.embedding` 에 의존. 빈 상태면 답변 품질 0.

- [ ] **Step 1: 원본 규정 문서 위치 확인**

```bash
cd server && grep -E "regulation|규정" scripts/ingest-regulation-docs.ts | head -20
find . -name "*.pdf" -o -name "regulation*.md" 2>/dev/null | head
```

원본이 레포에 없으면 사용자에게 요청 — 어디 PDF/MD 가 있는지.

- [ ] **Step 2: dry-run (읽기만)**

`ingest-regulation-docs.ts` 에 `--dry-run` 플래그가 있는지 확인. 없으면 추가:
```typescript
const dryRun = process.argv.includes('--dry-run');
if (dryRun) console.log('[DRY RUN] would insert', chunks.length, 'chunks');
else await db.insert(regulationDocuments).values(chunks);
```

실행:
```bash
cd server && npx tsx scripts/ingest-regulation-docs.ts --dry-run
```

- [ ] **Step 3: 실 적재**

`--dry-run` 없이 실행. 출력에서 chunk 수 확인:
```bash
cd server && npx tsx scripts/ingest-regulation-docs.ts
# expected: "Inserted N chunks into regulation_documents"
```

- [ ] **Step 4: 임베딩 생성**

```bash
cd server && npx tsx scripts/embed-regulation-docs.ts
```

→ OpenAI API key 필요 (`OPENAI_API_KEY` 환경변수). 토큰 소비 발생. batch 크기 확인.

- [ ] **Step 5: 검증**

```bash
psql $DATABASE_URL -c "SELECT COUNT(*), COUNT(embedding) FROM regulation_documents;"
# expected: count > 0, count(embedding) == count
```

`/api/chat` 에 "야간근무 수당" 질의 → 답변에 출처 조항 번호 포함되는지 확인.

---

### Task B2: FAQ seed + 임베딩

**Files:**
- Existing: `server/scripts/embed-faq.ts` (FAQ 임베딩)
- Possibly create: `server/scripts/seed-faq.ts` (초기 FAQ 데이터)

**배경:** FAQ 가 비어있음. 가장 자주 묻는 질문 5-10개 정도 초기 입력 필요.

- [ ] **Step 1: Supabase 에서 기존 FAQ export 가능한지 확인**

Supabase Dashboard → Table Editor → faq_entries → Export CSV. 있으면 B1 방식으로 import.

- [ ] **Step 2: Export 불가 시 — 어드민 대시보드로 수동 입력**

`admin/faq-editor.html` 같은 UI 가 있는지 확인. 있으면 운영팀이 수동 입력.

- [ ] **Step 3: 일괄 seed 원하면 스크립트 작성**

```typescript
// server/scripts/seed-faq.ts
const entries = [
  { question: '야간근무 수당은 어떻게 계산하나요?', answer: '...', tags: ['야간', '수당'] },
  // ...
];
for (const e of entries) await db.insert(faqEntries).values(e);
```

- [ ] **Step 4: 임베딩 생성**

```bash
cd server && npx tsx scripts/embed-faq.ts
```

- [ ] **Step 5: 검증**

`/api/faq/search?q=야간수당` 에 결과 나오는지.

---

### Task B3: 급여 마스터 데이터 (allowances, pay_tables, leave_types, ceremonies)

**Files:**
- Existing: `server/scripts/seed-from-data-js.ts` (data.js → DB seed)
- `data.js` (앱 내 급여/수당 상수 정의)

**배경:** 어드민 대시보드에서 수당/급여표/휴가유형 설정이 빈 상태. `data.js` 에는 hardcoded 값이 있으므로 이를 DB 로 seed.

- [ ] **Step 1: `seed-from-data-js.ts` 확인**

```bash
cd server && head -80 scripts/seed-from-data-js.ts
```

어떤 테이블을 채우는지, INSERT vs UPSERT 인지.

- [ ] **Step 2: dry-run 추가 (없으면)**

- [ ] **Step 3: 실행**

```bash
cd server && npx tsx scripts/seed-from-data-js.ts
```

- [ ] **Step 4: 검증**

```sql
SELECT COUNT(*) FROM allowances;
SELECT COUNT(*) FROM pay_tables;
SELECT COUNT(*) FROM leave_types;
SELECT COUNT(*) FROM ceremonies;
SELECT COUNT(*) FROM calculation_rules;
```
모두 > 0 이어야 함.

`/api/data/bundle` 호출 → 각 배열이 채워져서 돌아오는지.

---

### Task B4: Regulation rule 마스터 (rule_versions, rule_entries)

**Files:**
- Existing: `server/scripts/migrate-rules-from-json.ts`
- JSON 소스 위치 확인 필요

**배경:** 드리즐 migration 0003 에서 추가된 rule_versions/rule_entries. 새 테이블이라 Supabase 에 없었을 수 있음. 빈 상태면 규정 엔진이 빈 답변.

- [ ] **Step 1: 스크립트 확인 + JSON 소스 확인**

```bash
cd server && grep -E "from.*\.json|readFileSync" scripts/migrate-rules-from-json.ts | head
```

- [ ] **Step 2: 실행**

```bash
cd server && npx tsx scripts/migrate-rules-from-json.ts
```

- [ ] **Step 3: 검증**

```sql
SELECT COUNT(*) FROM rule_versions;
SELECT COUNT(*) FROM rule_entries;
```

---

### Task B5: admin_users (운영팀 계정)

**배경:** 어드민 로그인할 계정이 없으면 관리 기능 접근 불가.

- [ ] **Step 1: 현재 상태 확인**

```sql
SELECT email, role FROM admin_users;
```

- [ ] **Step 2: 필요 시 수동 INSERT**

```sql
INSERT INTO admin_users (email, role, created_at) VALUES ('kgh1379@gmail.com', 'superadmin', NOW());
```

(이건 사용자 승인 후만 실행. 권한 부여는 민감.)

---

## Phase C: 정리 + 회귀 방지

### Task C1: CLAUDE.md 업데이트

**Files:**
- Modify: `CLAUDE.md`

**배경:** CLAUDE.md 에 "어드민은 Supabase 계속 사용" 이라 적혀있지만, 실제 `server/src/db/client.ts` 는 단일 Neon DATABASE_URL. 문서가 틀림.

- [ ] **Step 1: 해당 섹션 수정**

```markdown
### 5. 인증/동기화 도돌이표 방지 규칙 (2026-04-20 갱신)
> 2026-04-20: Supabase → Neon 전면 이관 완료. 어드민도 Neon 사용.
- 데이터 저장: Google Drive (사용자) + Neon (어드민/RAG/FAQ/운영 데이터)
- 일반 사용자 페이지 Supabase 제거는 유지
- DB 마이그레이션: Drizzle (server/drizzle/*.sql) 단일 소스 오브 트루스
```

### Task C2: 회귀 테스트 — 빈 테이블 경고 스크립트

**Files:**
- Create: `server/scripts/check-essential-tables.ts`

**목적:** CI 에서 주기 실행. 핵심 테이블(`regulation_documents`, `faq_entries`, `allowances`, `pay_tables`) 중 하나라도 0 row 면 exit 1.

```typescript
const essential = ['regulation_documents', 'faq_entries', 'allowances', 'pay_tables'];
for (const t of essential) {
  const r = await sql`SELECT COUNT(*)::int AS c FROM ${sql(t)}`;
  if (r[0].c === 0) {
    console.error(`❌ ${t} is empty`);
    process.exit(1);
  }
}
```

Vercel cron 또는 GitHub Action 으로 매일 1회 실행 — 빈 상태 되면 즉시 알림.

---

## 실행 순서 + 위험 관리

1. **Phase A (진단)** — 읽기만. 리스크 없음. **우선 실행**.
2. **Phase B1 (규정 ingest)** — OpenAI API 토큰 비용 발생. 원본 문서 위치 확인 후.
3. **Phase B3 (data.js seed)** — UPSERT 인지 확인. 중복 INSERT 주의.
4. **Phase B4 (rule migration)** — JSON 소스 확인 후.
5. **Phase B2 (FAQ)** — Supabase export 가능 여부 먼저 확인.
6. **Phase B5 (admin_users)** — 사용자 승인 필요.
7. **Phase C** — 문서 + 회귀 방지.

**사용자 결정 필요 지점:**
- 규정 PDF/MD 원본 위치
- Supabase 기존 데이터 export 가능 여부 (faq_entries, regulation_versions)
- OpenAI API 토큰 예산 OK 인지 (ingest 비용)
- admin_users 에 어떤 이메일 추가할지

**Plan 범위 밖:**
- 사용자 localStorage 데이터 (Drive 단독) — 이건 개인 데이터, DB 이관 대상 아님
- `chat_history` — 런타임 INSERT 로 자동 축적
