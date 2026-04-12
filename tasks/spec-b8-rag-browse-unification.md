# Spec: B8 RAG + Browse DB Source Unification

## Goal

Make the public regulation browse view (regulation.html) and the RAG chatbot context
use the same DB source: `regulation_documents` table linked to `regulation_versions`.

## Current State

- **Browse**: `regulation.js` reads `DATA.handbook` (from `data.js` static fallback or
  `/api/data/bundle` which reads `calculation_rules` where `ruleType='handbook'`)
- **RAG**: `rag.ts` reads `regulation_documents` table (vector search against active version)

These are separate data paths. A regulation update in one place does not automatically
reflect in the other.

## Target State

1. Add a new API endpoint `GET /api/regulations/browse` that reads from `regulation_documents`
   (same table RAG uses) and returns structured handbook-like data.
2. `regulation.js` can optionally fetch from this endpoint, falling back to `DATA.handbook`.
3. RAG source citations include enough metadata to link back to the browse view.

## API Design

### GET /api/regulations/browse?versionId=

Returns regulation documents grouped by section, from the active regulation version.

```json
{
  "version": { "id": 1, "year": 2026, "title": "...", "status": "active" },
  "sections": [
    {
      "category": "근로시간/수당",
      "articles": [
        {
          "title": "제32조(근로시간)",
          "ref": "제32조",
          "body": "...",
          "sourceFile": "content/policies/2026/...",
          "chunkIds": [10, 11, 12]
        }
      ]
    }
  ]
}
```

### Implementation Details

1. **New route**: `server/src/routes/regulations.ts` with `GET /browse`
2. **Query**: Select from `regulation_documents` joined with `regulation_versions` (active)
3. **Grouping**: Group chunks by `metadata.category` and `section_title`
4. **regulation.js enhancement**: Try fetching `/api/regulations/browse` first,
   fall back to `DATA.handbook` on failure
5. **RAG citation link**: Include `chunkIds` in source output so browse can highlight

## Files Changed

- `server/src/routes/regulations.ts` (new)
- `server/src/index.ts` (register route)
- `regulation.js` (optional: add DB fetch with fallback)

## Testing

- API returns sections from regulation_documents for active version
- Empty version returns empty sections (not error)
- RAG sources reference same chunk IDs available in browse
- Existing regulation.html continues to work (fallback to DATA.handbook)
