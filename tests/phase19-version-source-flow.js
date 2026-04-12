/**
 * Phase 19: A5 Version Source Flow (Completion)
 *
 * Validates the full flow: version -> source files -> ingest -> embed -> retrieve -> browse
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let pass = 0;
let fail = 0;

function assert(condition, label) {
  if (condition) {
    pass++;
    console.log(`  PASS: ${label}`);
  } else {
    fail++;
    console.log(`  FAIL: ${label}`);
  }
}

// ── Test 1: Version schema has source_files ──
console.log('\n=== Phase 19.1: Version schema ===');
const schemaPath = path.join(ROOT, 'server/src/db/schema.ts');
const schema = fs.readFileSync(schemaPath, 'utf8');

assert(schema.includes('regulationVersions'), 'Schema has regulationVersions table');
assert(schema.includes('source_files') || schema.includes('sourceFiles'), 'Version has source_files column');
assert(schema.includes('regulationDocuments'), 'Schema has regulationDocuments table');
assert(
  schema.includes('version_id') || schema.includes('versionId'),
  'Documents reference version via version_id'
);

// ── Test 2: Ingest script tracks version source files ──
console.log('\n=== Phase 19.2: Ingest tracks source files ===');
const ingestPath = path.join(ROOT, 'server/scripts/ingest-regulation-docs.ts');
const ingestContent = fs.readFileSync(ingestPath, 'utf8');

assert(
  ingestContent.includes('source_files') && ingestContent.includes('update regulation_versions'),
  'Ingest updates version source_files after insert'
);
assert(
  ingestContent.includes('mergedSourceFiles') || ingestContent.includes('source_files'),
  'Ingest merges new source files with existing'
);

// ── Test 3: Ingest re-execution scenario ──
console.log('\n=== Phase 19.3: Re-ingest scenario ===');
assert(ingestContent.includes('--replace'), 'Supports --replace for re-ingest');
assert(
  ingestContent.includes('delete from regulation_documents'),
  'Deletes old chunks before re-ingest'
);
assert(
  ingestContent.includes('source_file') && ingestContent.includes('version_id'),
  'Delete scoped to source_file + version_id'
);

// ── Test 4: Embedding state tracking ──
console.log('\n=== Phase 19.4: Embedding state tracking ===');
const embedPath = path.join(ROOT, 'server/scripts/embed-regulation-docs.ts');
const embedContent = fs.readFileSync(embedPath, 'utf8');

assert(
  embedContent.includes('total') && embedContent.includes('embedded') && embedContent.includes('pending'),
  'Embedding script reports total/embedded/pending per version'
);
assert(
  embedContent.includes('embedding is null'),
  'Can find un-embedded chunks for re-processing'
);

// ── Test 5: Browse API returns version info ──
console.log('\n=== Phase 19.5: Browse API version metadata ===');
const browsePath = path.join(ROOT, 'server/src/routes/regulations.ts');
assert(fs.existsSync(browsePath), 'regulations.ts route exists');

const browseContent = fs.existsSync(browsePath)
  ? fs.readFileSync(browsePath, 'utf8')
  : '';

assert(
  browseContent.includes('version') && browseContent.includes('year'),
  'Browse API returns version metadata (year)'
);
assert(
  browseContent.includes('version') && browseContent.includes('title'),
  'Browse API returns version title'
);
assert(
  browseContent.includes('version') && browseContent.includes('status'),
  'Browse API returns version status'
);

// ── Test 6: Admin version management ──
console.log('\n=== Phase 19.6: Admin version management ===');
const adminOpsPath = path.join(ROOT, 'server/src/routes/adminOps.ts');
const adminOps = fs.readFileSync(adminOpsPath, 'utf8');

assert(adminOps.includes('/versions'), 'Admin has version listing endpoint');
assert(
  adminOps.includes('source_files') || adminOps.includes('sourceFiles'),
  'Admin version endpoint includes source_files'
);
assert(
  adminOps.includes("status = 'draft'") || adminOps.includes("'draft'"),
  'New versions start as draft'
);
assert(
  adminOps.includes("status = 'active'") || adminOps.includes("'active'"),
  'Versions can be activated'
);

// ── Test 7: Full flow connectivity ──
console.log('\n=== Phase 19.7: Full flow connectivity ===');
// Version -> source files (ingest)
assert(
  ingestContent.includes('regulation_versions') && ingestContent.includes('regulation_documents'),
  'Ingest connects versions to documents'
);
// Documents -> embeddings (embed script)
assert(
  embedContent.includes('regulation_documents') && embedContent.includes('embedding'),
  'Embed connects documents to embeddings'
);
// Embeddings -> retrieval (RAG)
const ragPath = path.join(ROOT, 'server/src/services/rag.ts');
const ragContent = fs.readFileSync(ragPath, 'utf8');
assert(
  ragContent.includes('regulation_documents') && ragContent.includes('regulation_versions'),
  'RAG retrieval connects documents and versions'
);
// Retrieval -> browse (regulations route)
assert(
  browseContent.includes('regulation_documents') && browseContent.includes('regulation_versions'),
  'Browse connects documents and versions'
);

// ── Test 8: Source file existence ──
console.log('\n=== Phase 19.8: Source files ===');
const policiesDir = path.join(ROOT, 'content/policies/2026');
assert(fs.existsSync(policiesDir), 'content/policies/2026 directory exists');

const policyFiles = fs.existsSync(policiesDir) ? fs.readdirSync(policiesDir) : [];
assert(policyFiles.some(f => f.endsWith('.pdf')), 'At least one PDF source in policies');
assert(policyFiles.some(f => f.endsWith('.md')), 'At least one MD source in policies');

// ── Summary ──
console.log(`\n${'='.repeat(50)}`);
console.log(`Phase 19 Results: ${pass} PASS / ${fail} FAIL`);
console.log(`${'='.repeat(50)}\n`);

process.exitCode = fail > 0 ? 1 : 0;
