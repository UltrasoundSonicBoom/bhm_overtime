# Task A1 Baseline Memo

> Checked on 2026-04-10 (Asia/Seoul) against the remote Supabase database configured in `server/.env`

## Runtime baseline

- Track A 기준 DB는 현재 로컬 `localhost`가 아니라 원격 Supabase Postgres다.
- `server/.env` 기준 연결로 실제 접속이 성공했다.
- 현재 활성 버전은 `2026 조합원 수첩` (`id=4`, `status=active`) 이다.

## Current row counts

- `regulation_versions`: `1`
- `faq_entries`: `50`
- `faq_entries` with embeddings: `50`
- `regulation_documents`: `0`
- `regulation_documents` with embeddings: `0`

## Source file baseline

- `data/2026_handbook.pdf`: present
- `data/hospital_guidelines_2026.md`: present

## Gaps found

- 현재 RAG는 FAQ만 임베딩이 채워져 있고, 규정 원문 벡터 저장소는 비어 있다.
- `data.js`의 FAQ 개수와 DB의 `faq_entries` 개수가 일치하지 않는다.
  - `data.js faq`: `54`
  - DB `faq_entries`: `50`
- `server/src/services/rag.ts`의 규정 문서 검색은 버전 상태를 필터링하지 않으므로, 이후 draft 버전을 ingest하면 공개 챗봇이 그 문서를 바로 읽을 위험이 있다.

## Decision for Track A

- Track A 스크립트는 원격 Supabase DB를 기준으로 진행한다.
- 사용자 영향 최소화를 위해 ingest / embedding 스크립트는 기본값을 `dry-run`으로 두고, 실제 쓰기는 명시적 `--write` 플래그와 active-version 보호 플래그가 있어야만 동작하게 만든다.
- 공개 웹 경로(`index.html`, `regulation.html`, `data.js` fallback)는 Track A에서 수정하지 않는다.
