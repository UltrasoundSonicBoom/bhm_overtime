/**
 * Phase 15: B8 RAG + Browse DB Source Unification
 *
 * Tests that the browse API exists and returns regulation_documents
 * data in a structured format, and that RAG sources align with browse data.
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

// ── Test 1: regulations route file exists ──
console.log('\n=== Phase 15.1: Regulations route file ===');
const regulationsRoutePath = path.join(ROOT, 'server/src/routes/regulations.ts');
assert(fs.existsSync(regulationsRoutePath), 'server/src/routes/regulations.ts exists');

// ── Test 2: Route is registered in index.ts ──
console.log('\n=== Phase 15.2: Route registration ===');
const indexTs = fs.readFileSync(path.join(ROOT, 'server/src/index.ts'), 'utf8');
assert(indexTs.includes('regulations'), 'index.ts imports/registers regulations route');
assert(indexTs.includes('/regulations') || indexTs.includes("'regulations'"), 'regulations path in index.ts');

// ── Test 3: Browse endpoint structure ──
console.log('\n=== Phase 15.3: Browse endpoint implementation ===');
if (fs.existsSync(regulationsRoutePath)) {
  const routeContent = fs.readFileSync(regulationsRoutePath, 'utf8');

  assert(routeContent.includes('/browse'), 'Route has /browse endpoint');
  assert(
    routeContent.includes('regulation_documents') || routeContent.includes('regulationDocuments'),
    'Browse queries regulation_documents table'
  );
  assert(
    routeContent.includes('regulation_versions') || routeContent.includes('regulationVersions'),
    'Browse joins with regulation_versions'
  );
  assert(
    routeContent.includes("status = 'active'") || routeContent.includes("'active'"),
    'Browse filters by active version'
  );
  assert(
    routeContent.includes('section_title') || routeContent.includes('sectionTitle'),
    'Browse returns section titles'
  );
  assert(
    routeContent.includes('category') || routeContent.includes('metadata'),
    'Browse includes category/metadata for grouping'
  );
} else {
  // All fail if file doesn't exist
  for (let i = 0; i < 6; i++) {
    assert(false, `Browse endpoint check ${i + 1} (file missing)`);
  }
}

// ── Test 4: RAG source alignment ──
console.log('\n=== Phase 15.4: RAG source alignment ===');
const ragPath = path.join(ROOT, 'server/src/services/rag.ts');
const ragContent = fs.readFileSync(ragPath, 'utf8');

// RAG should include chunk IDs in sources for cross-referencing with browse
assert(
  ragContent.includes('.id') || ragContent.includes('id:') || ragContent.includes('chunkId'),
  'RAG results include document IDs for cross-reference'
);
assert(
  ragContent.includes('regulation_versions') || ragContent.includes('version'),
  'RAG references regulation versions'
);

// ── Test 5: Data source convergence ──
console.log('\n=== Phase 15.5: Source convergence ===');
if (fs.existsSync(regulationsRoutePath)) {
  const routeContent = fs.readFileSync(regulationsRoutePath, 'utf8');

  // Both browse and RAG should use regulation_documents
  const browseUsesRegDocs = routeContent.includes('regulation_documents') || routeContent.includes('regulationDocuments');
  const ragUsesRegDocs = ragContent.includes('regulation_documents');

  assert(
    browseUsesRegDocs && ragUsesRegDocs,
    'Both browse and RAG use regulation_documents as source'
  );

  // Browse should return content usable as handbook replacement
  assert(
    routeContent.includes('content') && (routeContent.includes('title') || routeContent.includes('section_title')),
    'Browse returns content and title for handbook display'
  );
} else {
  assert(false, 'Source convergence (file missing)');
  assert(false, 'Browse returns content for handbook display (file missing)');
}

// ── Test 6: regulation.js has DB-aware path ──
console.log('\n=== Phase 15.6: regulation.js DB awareness ===');
const regJsPath = path.join(ROOT, 'regulation.js');
const regJs = fs.readFileSync(regJsPath, 'utf8');
assert(
  regJs.includes('/api/regulations/browse') || regJs.includes('api/regulations'),
  'regulation.js references browse API endpoint'
);
assert(
  regJs.includes('DATA.handbook') || regJs.includes('fallback'),
  'regulation.js maintains DATA.handbook fallback'
);

// ── Test 7: No regression on existing HTML structure ──
console.log('\n=== Phase 15.7: HTML regression check ===');
const regHtml = fs.readFileSync(path.join(ROOT, 'regulation.html'), 'utf8');
assert(regHtml.includes('browseArticles'), 'regulation.html has browseArticles container');
assert(regHtml.includes('chatMessages'), 'regulation.html has chatMessages container');
assert(regHtml.includes('regulation.js'), 'regulation.html loads regulation.js');
assert(regHtml.includes('data.js'), 'regulation.html loads data.js (fallback)');

// ── Summary ──
console.log(`\n${'='.repeat(50)}`);
console.log(`Phase 15 Results: ${pass} PASS / ${fail} FAIL`);
console.log(`${'='.repeat(50)}\n`);

process.exitCode = fail > 0 ? 1 : 0;
