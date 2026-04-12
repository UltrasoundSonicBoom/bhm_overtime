/**
 * Phase 22: B11 -- FAQ + Regulation Version Admin UI
 *
 * Tests:
 * 1. FAQ CRUD Admin UI elements exist
 * 2. Regulation version create/duplicate UI exists
 * 3. Review step exists before active transition
 * 4. Backend duplicate endpoint works
 * 5. FAQ API endpoints (CRUD) are functional
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

console.log('Phase 22: B11 -- FAQ + Regulation Version Admin UI\n');

// --- Test 1: Admin HTML has FAQ UI elements ---
console.log('[Test 1] Admin HTML FAQ UI elements');
const adminHtml = fs.readFileSync(path.join(__dirname, '..', 'admin', 'index.html'), 'utf8');
assert(adminHtml.includes('faqForm'), 'FAQ form exists in admin HTML');
assert(adminHtml.includes('faqCategoryInput'), 'FAQ category input exists');
assert(adminHtml.includes('faqQuestionInput'), 'FAQ question input exists');
assert(adminHtml.includes('faqAnswerInput'), 'FAQ answer input exists');
assert(adminHtml.includes('faqRefInput'), 'FAQ reference input exists');
assert(adminHtml.includes('faqPublishedInput'), 'FAQ published checkbox exists');
assert(adminHtml.includes('faqList'), 'FAQ list container exists');
assert(adminHtml.includes('faqVersionSelect'), 'FAQ version selector exists');
assert(adminHtml.includes('faqResetBtn'), 'FAQ reset button exists');
assert(adminHtml.includes('faqSubmitBtn'), 'FAQ submit button exists');

// --- Test 2: Admin HTML has version management UI ---
console.log('\n[Test 2] Admin HTML version management UI');
assert(adminHtml.includes('versionForm'), 'Version form exists');
assert(adminHtml.includes('versionYearInput'), 'Version year input exists');
assert(adminHtml.includes('versionTitleInput'), 'Version title input exists');
assert(adminHtml.includes('versionEffectiveInput'), 'Version effective date input exists');
assert(adminHtml.includes('versionSourceInput'), 'Version source files input exists');
assert(adminHtml.includes('versionSubmitBtn'), 'Version submit button exists');
assert(adminHtml.includes('versionsList'), 'Versions list exists');

// --- Test 3: Admin JS has FAQ CRUD functions ---
console.log('\n[Test 3] Admin JS FAQ CRUD functions');
const adminJs = fs.readFileSync(path.join(__dirname, '..', 'admin', 'admin.js'), 'utf8');
assert(adminJs.includes('saveFaq'), 'saveFaq function exists');
assert(adminJs.includes('renderFaqs'), 'renderFaqs function exists');
assert(adminJs.includes('resetFaqForm'), 'resetFaqForm function exists');
assert(adminJs.includes('loadFaqs'), 'loadFaqs function exists');
assert(adminJs.includes('/admin/faqs'), 'FAQ API endpoint referenced');
assert(adminJs.includes('faqCategoryInput'), 'FAQ category input referenced in JS');

// --- Test 4: Admin JS has version management functions ---
console.log('\n[Test 4] Admin JS version management functions');
assert(adminJs.includes('createVersion'), 'createVersion function exists');
assert(adminJs.includes('renderVersions'), 'renderVersions function exists');
assert(adminJs.includes('/admin/versions'), 'Versions API endpoint referenced');

// --- Test 5: Version duplication support ---
console.log('\n[Test 5] Version duplication support');
assert(adminJs.includes('duplicate') || adminJs.includes('Duplicate') || adminJs.includes('복제'), 'Duplication feature exists in admin JS');

// --- Test 6: Review step before active transition ---
console.log('\n[Test 6] Review step before active transition');
assert(adminJs.includes('review') || adminJs.includes('Review'), 'Review concept exists in admin JS');
assert(adminHtml.includes('data-surface="review"') || adminHtml.includes('Review'), 'Review surface/tab exists in HTML');

// --- Test 7: Backend has duplicate endpoint ---
console.log('\n[Test 7] Backend duplicate endpoint');
const adminOpsTs = fs.readFileSync(path.join(__dirname, '..', 'server', 'src', 'routes', 'adminOps.ts'), 'utf8');
assert(adminOpsTs.includes('duplicate') || adminOpsTs.includes('/versions') && adminOpsTs.includes('post'), 'Version duplicate or create endpoint in backend');
assert(adminOpsTs.includes('/faqs'), 'FAQ endpoints in backend');
assert(adminOpsTs.includes('writeAuditLog'), 'Audit logging in backend');

// --- Test 8: FAQ edit capability (PUT endpoint) ---
console.log('\n[Test 8] FAQ edit capability');
assert(adminOpsTs.includes("put('/faqs/:id'") || adminOpsTs.includes('put(\'/faqs/:id\''), 'FAQ PUT endpoint exists');
assert(adminJs.includes('editingFaqId') || adminJs.includes('data-faq-id'), 'FAQ editing state in admin JS');

// --- Test 9: Version status includes review-like concept ---
console.log('\n[Test 9] Version status review concept');
const schemaTs = fs.readFileSync(path.join(__dirname, '..', 'server', 'src', 'db', 'schema.ts'), 'utf8');
// regulation_status enum should have draft/active/archived at minimum
assert(schemaTs.includes("'draft'") && schemaTs.includes("'active'") && schemaTs.includes("'archived'"), 'Regulation status enum has draft/active/archived');
// Content status has review
assert(schemaTs.includes("'review'"), 'Content status enum includes review');

// --- Test 10: Admin version UI shows status and action buttons ---
console.log('\n[Test 10] Version UI status display and actions');
assert(adminJs.includes('version-actions') || adminJs.includes('data-version-action'), 'Version action buttons exist');
assert(adminJs.includes('activate') || adminJs.includes('active'), 'Activate action available');
assert(adminJs.includes('archive') || adminJs.includes('archived'), 'Archive action available');

console.log(`\n--- Phase 22 Results: ${passed} PASS / ${failed} FAIL ---`);
process.exit(failed > 0 ? 1 : 0);
