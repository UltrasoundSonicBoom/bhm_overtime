# Spec: A5 Version Source Flow (Completion)

## Goal

Complete the connection between regulation versions, source files,
ingest state, and retrieval quality so the full pipeline is operationally traceable.

## Already Done (Phase 12)

- regulation_versions.source_files tracks ingested sources
- Re-ingest criteria defined (--replace flag)
- Version-scoped ingest and embedding

## Remaining

- Verify version metadata confirms source file linkage in browse API
- Verify ingest state is trackable per version (total chunks, embedded count)
- Verify the browse API shows version info alongside content
- Confirm the full flow: version -> source files -> ingest -> embed -> retrieve -> browse

## Acceptance Criteria

- [x] version과 source file 연결 규칙이 있다 (Phase 12)
- [x] 재-ingest 기준이 정의된다 (Phase 12)
- [x] version별 source files와 ingest 상태를 추적할 수 있다 (Phase 12)
- [ ] version별 source metadata 확인 (verification)
- [ ] ingest 재실행 시나리오 검토 (verification)
