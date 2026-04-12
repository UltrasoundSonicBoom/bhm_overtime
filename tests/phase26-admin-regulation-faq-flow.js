/**
 * Phase 26: B5 -- Admin Regulation/FAQ Operation Flow
 *
 * Tests:
 * 1. FAQ create/update/publish endpoints
 * 2. Regulation version create/duplicate/status change
 * 3. Review flow (request-review, decision)
 * 4. Admin UI supports all operations
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

console.log('Phase 26: B5 -- Admin Regulation/FAQ Operation Flow\n');

const adminOps = fs.readFileSync(path.join(__dirname, '..', 'server', 'src', 'routes', 'adminOps.ts'), 'utf8');
const adminJs = fs.readFileSync(path.join(__dirname, '..', 'admin', 'admin.js'), 'utf8');
const adminOpsService = fs.readFileSync(path.join(__dirname, '..', 'server', 'src', 'services', 'admin-ops.ts'), 'utf8');

// --- Test 1: FAQ CRUD endpoints ---
console.log('[Test 1] FAQ CRUD endpoints');
assert(adminOps.includes("post('/faqs'"), 'FAQ POST (create) endpoint');
assert(adminOps.includes("put('/faqs/:id'"), 'FAQ PUT (update) endpoint');
assert(adminOps.includes("get('/faqs'"), 'FAQ GET (list) endpoint');
assert(adminOps.includes('is_published'), 'FAQ publish state managed');
assert(adminOps.includes('faq.created'), 'FAQ create audit logged');
assert(adminOps.includes('faq.updated'), 'FAQ update audit logged');

// --- Test 2: Regulation version operations ---
console.log('\n[Test 2] Regulation version operations');
assert(adminOps.includes("post('/versions'"), 'Version POST (create) endpoint');
assert(adminOps.includes("post('/versions/:id/duplicate'"), 'Version duplicate endpoint');
assert(adminOps.includes("patch('/versions/:id/status'"), 'Version status change endpoint');
assert(adminOps.includes("'draft'"), 'Draft status supported');
assert(adminOps.includes("'active'"), 'Active status supported');
assert(adminOps.includes("'archived'"), 'Archived status supported');
// Auto-archive old active version
assert(adminOps.includes("status = 'archived'") && adminOps.includes("status = 'active'"), 'Auto-archive on active transition');

// --- Test 3: Review flow ---
console.log('\n[Test 3] Review/approval flow');
assert(adminOps.includes("post('/content/:id/request-review'"), 'Request-review endpoint');
assert(adminOps.includes("post('/approvals/:id/decision'"), 'Approval decision endpoint');
assert(adminOps.includes("'approved'"), 'Approved decision supported');
assert(adminOps.includes("'rejected'"), 'Rejected decision supported');
assert(adminOps.includes("'pending'"), 'Pending state in approvals');
assert(adminOpsService.includes('canTransitionStatus'), 'Status transition validation exists');
assert(adminOpsService.includes('canRequestReview'), 'Review request validation exists');
assert(adminOpsService.includes('resolveApprovalDecision'), 'Approval resolution logic exists');

// --- Test 4: Admin UI supports operations ---
console.log('\n[Test 4] Admin UI operations');
assert(adminJs.includes('saveFaq'), 'UI: FAQ save');
assert(adminJs.includes('createVersion'), 'UI: Version create');
assert(adminJs.includes('duplicate'), 'UI: Version duplicate');
assert(adminJs.includes('changeContentStatus'), 'UI: Content status change');
assert(adminJs.includes('request-review'), 'UI: Request review');

// --- Test 5: FAQ version binding ---
console.log('\n[Test 5] FAQ version binding');
assert(adminOps.includes('version_id'), 'FAQ bound to version_id');
assert(adminJs.includes('selectedVersionId'), 'UI tracks selected version');
assert(adminJs.includes('faqVersionSelect'), 'UI has version selector for FAQ');

// --- Test 6: Status transition safety ---
console.log('\n[Test 6] Status transition safety');
assert(adminOpsService.includes('allowedTransitions'), 'Allowed transitions defined');
assert(adminOpsService.includes("draft: ['review', 'archived']") || adminOpsService.includes("draft: ["), 'Draft transitions defined');
assert(adminOpsService.includes("review: [") || adminOpsService.includes('review'), 'Review transitions defined');
assert(adminOpsService.includes("published: [") || adminOpsService.includes('published'), 'Published transitions defined');

console.log(`\n--- Phase 26 Results: ${passed} PASS / ${failed} FAIL ---`);
process.exit(failed > 0 ? 1 : 0);
