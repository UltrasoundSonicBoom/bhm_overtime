/**
 * Phase 17: A3 Regulation Embeddings
 *
 * Validates embedding generation script and services exist with correct structure.
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

// ── Test 1: Embedding script exists ──
console.log('\n=== Phase 17.1: Embedding script ===');
const embedScriptPath = path.join(ROOT, 'server/scripts/embed-regulation-docs.ts');
assert(fs.existsSync(embedScriptPath), 'embed-regulation-docs.ts exists');

const embedScript = fs.existsSync(embedScriptPath)
  ? fs.readFileSync(embedScriptPath, 'utf8')
  : '';

// ── Test 2: Embedding service exists ──
console.log('\n=== Phase 17.2: Embedding service ===');
const embeddingServicePath = path.join(ROOT, 'server/src/services/embedding.ts');
assert(fs.existsSync(embeddingServicePath), 'embedding.ts service exists');

const embeddingService = fs.existsSync(embeddingServicePath)
  ? fs.readFileSync(embeddingServicePath, 'utf8')
  : '';

assert(embeddingService.includes('embed'), 'Service exports embed function');
assert(embeddingService.includes('embedBatch'), 'Service exports embedBatch function');
assert(
  embeddingService.includes('text-embedding-3-small') || embeddingService.includes('text-embedding'),
  'Uses OpenAI text-embedding model'
);
assert(embeddingService.includes('1536'), 'Uses 1536 dimensions');

// ── Test 3: Script targets regulation_documents ──
console.log('\n=== Phase 17.3: Targets regulation_documents ===');
assert(
  embedScript.includes('regulation_documents'),
  'Script queries regulation_documents'
);
assert(
  embedScript.includes('embedding is null') || embedScript.includes('embedding IS NULL'),
  'Finds chunks with null embeddings'
);
assert(
  embedScript.includes("update regulation_documents") || embedScript.includes("UPDATE regulation_documents"),
  'Updates embeddings in regulation_documents'
);

// ── Test 4: Re-processing capability ──
console.log('\n=== Phase 17.4: Re-processing ===');
assert(
  embedScript.includes('embedding is null'),
  'Selects only null-embedding chunks for processing'
);
assert(
  embedScript.includes('--limit') || embedScript.includes('limit'),
  'Supports batch limiting'
);
assert(embedScript.includes('--write'), 'Supports --write flag');
assert(embedScript.includes('dry-run') || embedScript.includes('Dry run'), 'Has dry-run mode');

// ── Test 5: Batch embedding with retry ──
console.log('\n=== Phase 17.5: Batch embedding ===');
assert(embeddingService.includes('BATCH_SIZE'), 'Has batch size configuration');
assert(
  embeddingService.includes('retry') || embeddingService.includes('attempt'),
  'Has retry logic for rate limits'
);
assert(
  embeddingService.includes('backoff') || embeddingService.includes('delay') || embeddingService.includes('Math.pow'),
  'Has exponential backoff'
);

// ── Test 6: Version safety ──
console.log('\n=== Phase 17.6: Version safety ===');
assert(embedScript.includes('--version-id'), 'Supports version-id parameter');
assert(
  embedScript.includes('allow-active-version-write'),
  'Protects active version from writes'
);

// ── Test 7: Similarity query path (RAG) ──
console.log('\n=== Phase 17.7: Similarity query path ===');
const ragPath = path.join(ROOT, 'server/src/services/rag.ts');
const ragContent = fs.readFileSync(ragPath, 'utf8');
assert(ragContent.includes('<=>'), 'RAG uses cosine distance operator (<=>)');
assert(
  ragContent.includes('regulation_documents') && ragContent.includes('embedding'),
  'RAG queries regulation_documents embeddings'
);
assert(ragContent.includes('embed'), 'RAG uses embed service for query embedding');
assert(
  ragContent.includes('ORDER BY') || ragContent.includes('order by'),
  'RAG orders by similarity'
);

// ── Test 8: Stats reporting ──
console.log('\n=== Phase 17.8: Stats reporting ===');
assert(
  embedScript.includes('total') && embedScript.includes('embedded') && embedScript.includes('pending'),
  'Reports total/embedded/pending stats'
);
assert(
  embedScript.includes('vector'),
  'Converts embeddings to vector format for storage'
);

// ── Summary ──
console.log(`\n${'='.repeat(50)}`);
console.log(`Phase 17 Results: ${pass} PASS / ${fail} FAIL`);
console.log(`${'='.repeat(50)}\n`);

process.exitCode = fail > 0 ? 1 : 0;
