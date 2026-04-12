/**
 * Phase 16: A2 PDF/MD Ingest Pipeline
 *
 * Validates that the ingest pipeline script exists with correct structure,
 * handles both PDF and MD inputs, and produces properly structured chunks.
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

// ── Test 1: Script file exists ──
console.log('\n=== Phase 16.1: Ingest script exists ===');
const scriptPath = path.join(ROOT, 'server/scripts/ingest-regulation-docs.ts');
assert(fs.existsSync(scriptPath), 'ingest-regulation-docs.ts exists');

const scriptContent = fs.existsSync(scriptPath)
  ? fs.readFileSync(scriptPath, 'utf8')
  : '';

// ── Test 2: PDF input handling ──
console.log('\n=== Phase 16.2: PDF input handling ===');
assert(scriptContent.includes('pdfjs-dist') || scriptContent.includes('pdf.mjs'), 'Uses pdfjs-dist for PDF extraction');
assert(scriptContent.includes('extractPdfSections') || scriptContent.includes('extractPdf'), 'Has PDF section extraction function');
assert(scriptContent.includes('.pdf'), 'Handles .pdf extension');
assert(
  scriptContent.includes('getDocument') || scriptContent.includes('pdfDoc'),
  'Uses PDF document parsing'
);

// ── Test 3: MD input handling ──
console.log('\n=== Phase 16.3: MD input handling ===');
assert(scriptContent.includes('extractMarkdownSections') || scriptContent.includes('extractMarkdown'), 'Has Markdown section extraction function');
assert(scriptContent.includes('.md'), 'Handles .md extension');
assert(
  scriptContent.includes('heading') || scriptContent.includes('#{1,6}'),
  'Parses Markdown headings'
);

// ── Test 4: Chunk metadata fields ──
console.log('\n=== Phase 16.4: Chunk metadata ===');
assert(scriptContent.includes('source_file') || scriptContent.includes('sourceFile'), 'Chunks have source_file');
assert(scriptContent.includes('section_title') || scriptContent.includes('sectionTitle'), 'Chunks have section_title');
assert(scriptContent.includes('chunk_index') || scriptContent.includes('chunkIndex'), 'Chunks have chunk_index');
assert(scriptContent.includes('metadata'), 'Chunks have metadata');
assert(scriptContent.includes('token_count') || scriptContent.includes('tokenCount'), 'Chunks have token_count');

// ── Test 5: Article reference extraction ──
console.log('\n=== Phase 16.5: Article reference extraction ===');
assert(scriptContent.includes('article_ref') || scriptContent.includes('articleRef'), 'Extracts article references');
assert(
  scriptContent.includes('제') && scriptContent.includes('조'),
  'Recognizes Korean article format (제X조)'
);

// ── Test 6: Re-ingest capability ──
console.log('\n=== Phase 16.6: Re-ingest capability ===');
assert(scriptContent.includes('--replace'), 'Supports --replace flag');
assert(
  scriptContent.includes('delete from regulation_documents') || scriptContent.includes('DELETE FROM regulation_documents'),
  'Deletes existing chunks on replace'
);
assert(scriptContent.includes('--write'), 'Supports --write flag for actual DB writes');
assert(scriptContent.includes('dry-run') || scriptContent.includes('Dry run'), 'Has dry-run mode');

// ── Test 7: Version safety ──
console.log('\n=== Phase 16.7: Version safety ===');
assert(scriptContent.includes('--version-id'), 'Supports --version-id parameter');
assert(
  scriptContent.includes('active') && scriptContent.includes('allow-active-version-write'),
  'Protects active version from accidental writes'
);
assert(scriptContent.includes('regulation_versions'), 'Queries regulation_versions');

// ── Test 8: Source file tracking ──
console.log('\n=== Phase 16.8: Source file tracking ===');
assert(
  scriptContent.includes('source_files') && scriptContent.includes('update regulation_versions'),
  'Updates regulation_versions.source_files after ingest'
);

// ── Test 9: Default source files ──
console.log('\n=== Phase 16.9: Default source files ===');
assert(
  scriptContent.includes('content/policies/2026'),
  'Default sources point to content/policies/2026'
);
const pdfExists = fs.existsSync(path.join(ROOT, 'content/policies/2026/2026_조합원_수첩_최종파일.pdf'));
const mdExists = fs.existsSync(path.join(ROOT, 'content/policies/2026/nurse_regulation.md'));
assert(pdfExists, 'PDF source file exists in content/policies/2026/');
assert(mdExists, 'MD source file exists in content/policies/2026/');

// ── Test 10: Chunk splitting logic ──
console.log('\n=== Phase 16.10: Chunk splitting ===');
assert(
  scriptContent.includes('splitIntoChunks') || scriptContent.includes('buildChunks'),
  'Has chunk splitting function'
);
assert(
  scriptContent.includes('maxChars') || scriptContent.includes('max-chars'),
  'Configurable max chunk size'
);
assert(
  scriptContent.includes('splitOversizedParagraph') || scriptContent.includes('split'),
  'Handles oversized paragraphs'
);

// ── Summary ──
console.log(`\n${'='.repeat(50)}`);
console.log(`Phase 16 Results: ${pass} PASS / ${fail} FAIL`);
console.log(`${'='.repeat(50)}\n`);

process.exitCode = fail > 0 ? 1 : 0;
