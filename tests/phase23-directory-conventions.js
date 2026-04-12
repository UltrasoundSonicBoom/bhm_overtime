/**
 * Phase 23: B1 -- content/ops Directory Conventions
 *
 * Tests:
 * 1. content/README.md exists with proper structure
 * 2. ops/README.md exists with proper structure
 * 3. MD vs prompt distinction is documented
 * 4. Directory layout is documented
 * 5. Source of truth rules exist
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.log(`  FAIL: ${label}`);
    failed++;
  }
}

console.log('Phase 23: B1 -- content/ops Directory Conventions\n');

// --- Test 1: content/README.md exists and has structure ---
console.log('[Test 1] content/README.md');
const contentReadme = path.join(__dirname, '..', 'content', 'README.md');
assert(fs.existsSync(contentReadme), 'content/README.md exists');
const contentMd = fs.readFileSync(contentReadme, 'utf8');
assert(contentMd.includes('policies'), 'Mentions policies directory');
assert(contentMd.includes('faq'), 'Mentions faq directory');
assert(contentMd.includes('notices'), 'Mentions notices directory');
assert(contentMd.includes('landing'), 'Mentions landing directory');
assert(contentMd.includes('Directory') || contentMd.includes('Layout') || contentMd.includes('디렉토리'), 'Has directory layout section');
assert(contentMd.includes('Naming') || contentMd.includes('규칙') || contentMd.includes('Rule'), 'Has naming rules');
assert(contentMd.includes('Source') || contentMd.includes('원본') || contentMd.includes('원문'), 'Has source of truth rules');

// --- Test 2: ops/README.md exists and has structure ---
console.log('\n[Test 2] ops/README.md');
const opsReadme = path.join(__dirname, '..', 'ops', 'README.md');
assert(fs.existsSync(opsReadme), 'ops/README.md exists');
const opsMd = fs.readFileSync(opsReadme, 'utf8');
assert(opsMd.includes('prompts'), 'Mentions prompts directory');
assert(opsMd.includes('skills'), 'Mentions skills directory');
assert(opsMd.includes('agents'), 'Mentions agents directory');
assert(opsMd.includes('reports'), 'Mentions reports directory');
assert(opsMd.includes('Directory') || opsMd.includes('Layout') || opsMd.includes('디렉토리'), 'Has directory layout section');
assert(opsMd.includes('Usage') || opsMd.includes('규칙') || opsMd.includes('Rule'), 'Has usage rules');

// --- Test 3: MD vs prompt distinction ---
console.log('\n[Test 3] MD vs prompt distinction');
assert(contentMd.includes('원문') || contentMd.includes('원본') || contentMd.includes('source'), 'content README references source/original documents');
assert(opsMd.includes('프롬프트') || opsMd.includes('prompt'), 'ops README references prompts');
assert(opsMd.includes('자동') || opsMd.includes('AI') || opsMd.includes('auto'), 'ops README references automation/AI');

// --- Test 4: Subdirectories exist ---
console.log('\n[Test 4] Subdirectories exist');
assert(fs.existsSync(path.join(__dirname, '..', 'content', 'policies')), 'content/policies/ exists');
assert(fs.existsSync(path.join(__dirname, '..', 'content', 'faq-seeds')), 'content/faq-seeds/ exists');
assert(fs.existsSync(path.join(__dirname, '..', 'content', 'notices')), 'content/notices/ exists');
assert(fs.existsSync(path.join(__dirname, '..', 'content', 'landing')), 'content/landing/ exists');
assert(fs.existsSync(path.join(__dirname, '..', 'ops', 'prompts')), 'ops/prompts/ exists');
assert(fs.existsSync(path.join(__dirname, '..', 'ops', 'skills')), 'ops/skills/ exists');
assert(fs.existsSync(path.join(__dirname, '..', 'ops', 'agents')), 'ops/agents/ exists');
assert(fs.existsSync(path.join(__dirname, '..', 'ops', 'reports')), 'ops/reports/ exists');

// --- Test 5: Operator can find original document location ---
console.log('\n[Test 5] Operator can find original document location');
assert(contentMd.includes('policies/') || contentMd.includes('policies\\'), 'Content README specifies policies path');
assert(contentMd.length > 200, 'Content README has sufficient documentation (>200 chars)');
assert(opsMd.length > 200, 'Ops README has sufficient documentation (>200 chars)');

console.log(`\n--- Phase 23 Results: ${passed} PASS / ${failed} FAIL ---`);
process.exit(failed > 0 ? 1 : 0);
