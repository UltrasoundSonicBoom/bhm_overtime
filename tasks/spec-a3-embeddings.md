# Spec: A3 Regulation Embeddings

## Goal

Verify the embedding generation pipeline for regulation document chunks.

## Current State

- `server/scripts/embed-regulation-docs.ts` exists with:
  - Batch embedding via OpenAI text-embedding-3-small (1536 dimensions)
  - Null-embedding chunk detection and re-processing
  - Version-scoped embedding with safety for active versions
  - Dry-run and --write modes
  - Stats reporting after embedding

- `server/src/services/embedding.ts` provides:
  - Single text embedding (`embed`)
  - Batch embedding with retry (`embedBatch`)

## Acceptance Criteria

1. Embedding generation script exists and targets regulation_documents
2. Missing embeddings (null) can be re-processed
3. Sample similarity query path works (rag.ts uses cosine distance)

## Files

- `server/scripts/embed-regulation-docs.ts` (existing)
- `server/src/services/embedding.ts` (existing)
- `server/src/services/rag.ts` (uses embeddings for retrieval)
