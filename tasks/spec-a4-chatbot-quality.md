# Spec: A4 Chatbot Answer Quality Verification

## Goal

Verify the chatbot answer quality evaluation pipeline exists and covers:
- Representative question set
- FAQ direct match vs regulation retrieval vs fallback classification
- Citation quality tracking

## Current State

- `server/scripts/verify-rag-quality.ts` exists with evaluation questions
- `server/src/services/rag.ts` has full RAG pipeline
- `server/src/services/rag-ranking.ts` has reranking and classification
- `server/src/routes/chat.ts` exposes POST /api/chat

## Files

- `server/scripts/verify-rag-quality.ts` (existing)
- `server/src/services/rag.ts` (existing)
- `server/src/services/rag-ranking.ts` (existing)
- `server/src/routes/chat.ts` (existing)
