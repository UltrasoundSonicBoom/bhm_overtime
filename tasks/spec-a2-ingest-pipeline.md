# Spec: A2 PDF/MD Ingest Pipeline

## Goal

Verify and complete the ingest pipeline that reads PDF/MD source files,
creates section/chunk splits, and inserts them into `regulation_documents`.

## Current State

`server/scripts/ingest-regulation-docs.ts` already exists with:
- PDF extraction via pdfjs-dist
- Markdown heading-based section splitting
- Chunk splitting with configurable max chars
- Article reference extraction
- Version markers extraction
- Dry-run and --write modes
- --replace mode for re-ingestion
- Source file tracking in regulation_versions.source_files

## Acceptance Criteria Verification

1. **PDF and MD input rules defined**: Both `.pdf` and `.md` are handled
   with specific extraction logic (extractPdfSections, extractMarkdownSections)
2. **Chunk metadata**: source_file, section_title, chunk_index, metadata populated
3. **Re-ingest**: --replace flag deletes existing chunks for same source_file before insert

## Testing Focus

- Script file exists and has correct structure
- PDF and MD paths are both handled
- Chunk output includes required fields
- Version safety (active version write protection)
- Source files array updated on version after ingest

## Files

- `server/scripts/ingest-regulation-docs.ts` (existing, verify)
- `content/policies/2026/` (source files)
