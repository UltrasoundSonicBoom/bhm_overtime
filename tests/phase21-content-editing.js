'use strict';
// ============================================================
// Phase 21 — B10: Content Editing Flows Tests
// Validates content CRUD UI in admin shell
// ============================================================

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}`);
  }
}

function readFile(relPath) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf-8');
}

console.log('\n=== Phase 21: B10 Content Editing Flows ===\n');

const html = readFile('admin/index.html');
const js = readFile('admin/admin.js');
const css = readFile('admin/admin.css');

// ── 1. Content Editor Form ──
console.log('--- Content Editor Form ---');
assert(
  html && /id="contentEditorForm"|id="contentForm"/.test(html),
  'Content editor form exists in HTML'
);
assert(
  html && /id="contentTitleInput"/.test(html),
  'Content title input field exists'
);
assert(
  html && /id="contentBodyInput"/.test(html),
  'Content body textarea exists'
);
assert(
  html && /id="contentTypeSelect"/.test(html),
  'Content type selector exists'
);

// ── 2. Content type options ──
console.log('\n--- Content Types ---');
const contentTypes = ['policy', 'faq', 'notice', 'landing', 'dataset'];
for (const type of contentTypes) {
  assert(
    html && html.includes(type),
    `Content type "${type}" available in HTML`
  );
}

// ── 3. Status management ──
console.log('\n--- Status Management ---');
assert(
  js && /changeContentStatus|contentStatusChange|status.*transition/.test(js),
  'JS has content status change function'
);
assert(
  js && /draft.*review|review.*published/.test(js),
  'JS handles status transitions'
);

// ── 4. Content save/create ──
console.log('\n--- Content CRUD ---');
assert(
  js && /saveContent|createContent|submitContent/.test(js),
  'JS has content save/create function'
);
assert(
  js && /POST.*\/admin\/content|\/admin\/content.*POST/.test(js) || (js && js.includes("'/admin/content'") && js.includes('POST')),
  'JS posts to /admin/content API'
);

// ── 5. Revision creation ──
console.log('\n--- Revision History ---');
assert(
  js && /revisions|revision_number|loadContentDetail/.test(js),
  'JS handles content revisions'
);
assert(
  js && /\/revisions/.test(js),
  'JS calls revisions API endpoint'
);

// ── 6. Content detail loading ──
console.log('\n--- Content Detail ---');
assert(
  js && /loadContentDetail|loadContentEntry|fetchContentDetail/.test(js),
  'JS has function to load content details'
);
assert(
  js && /content.*id.*revisions|entry_id|contentId/.test(js),
  'JS passes content ID for detail loading'
);

// ── 7. Draft vs Published visual distinction ──
console.log('\n--- Visual Distinction ---');
assert(
  html && /data-surface-panel="content"/.test(html),
  'Content panel exists'
);
assert(
  css && /\.tag\.draft|\.tag\.active/.test(css),
  'CSS has distinct styles for draft and published tags'
);

// ── 8. Editor state ──
console.log('\n--- Editor State ---');
assert(
  js && /editingContentId|selectedContentId|contentEditing/.test(js),
  'JS tracks which content is being edited'
);
assert(
  js && /resetContentForm|clearContentForm|contentFormReset/.test(js),
  'JS has content form reset function'
);

// ── 9. Integration with existing admin ──
console.log('\n--- Integration ---');
assert(
  js && /renderContentEntries/.test(js),
  'JS has renderContentEntries function (from Phase 20)'
);
assert(
  js && /loadContentEntries/.test(js),
  'JS has loadContentEntries function'
);
assert(
  js && /renderAll/.test(js) && js.includes('renderContentEntries'),
  'renderAll calls renderContentEntries'
);

// ── Summary ──
console.log(`\n=== Phase 21 Result: ${passed} PASS / ${failed} FAIL ===\n`);
process.exit(failed > 0 ? 1 : 0);
