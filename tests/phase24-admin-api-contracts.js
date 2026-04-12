/**
 * Phase 24: B3 -- Admin API Contracts
 *
 * Tests:
 * 1. API contract document exists
 * 2. Backend routes match contract
 * 3. Role-based access documented
 * 4. Audit points documented
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

console.log('Phase 24: B3 -- Admin API Contracts\n');

// --- Test 1: API contract document exists ---
console.log('[Test 1] API contract document');
const contractPath = path.join(__dirname, '..', 'tasks', 'spec-b3-admin-api-contracts.md');
assert(fs.existsSync(contractPath), 'Contract document exists');
const contract = fs.readFileSync(contractPath, 'utf8');
assert(contract.includes('/api/admin/versions'), 'Documents versions endpoint');
assert(contract.includes('/api/admin/faqs'), 'Documents FAQ endpoint');
assert(contract.includes('/api/admin/content'), 'Documents content endpoint');
assert(contract.includes('/api/admin/approvals'), 'Documents approvals endpoint');
assert(contract.includes('/api/admin/audit-logs'), 'Documents audit-logs endpoint');
assert(contract.includes('/api/admin/dashboard'), 'Documents dashboard endpoint');

// --- Test 2: Backend routes match contract ---
console.log('\n[Test 2] Backend routes match contract');
const adminOps = fs.readFileSync(path.join(__dirname, '..', 'server', 'src', 'routes', 'adminOps.ts'), 'utf8');
assert(adminOps.includes("'/versions'"), 'Backend has /versions route');
assert(adminOps.includes("'/faqs'"), 'Backend has /faqs route');
assert(adminOps.includes("'/content'"), 'Backend has /content route');
assert(adminOps.includes("'/approvals'"), 'Backend has /approvals route');
assert(adminOps.includes("'/audit-logs'"), 'Backend has /audit-logs route');
assert(adminOps.includes("'/dashboard'"), 'Backend has /dashboard route');
assert(adminOps.includes("'/versions/:id/status'"), 'Backend has version status transition');
assert(adminOps.includes("'/versions/:id/duplicate'"), 'Backend has version duplicate');
assert(adminOps.includes("'/content/:id/status'"), 'Backend has content status transition');
assert(adminOps.includes("'/content/:id/request-review'"), 'Backend has content request-review');
assert(adminOps.includes("'/approvals/:id/decision'"), 'Backend has approval decision');

// --- Test 3: Role-based access ---
console.log('\n[Test 3] Role-based access');
assert(contract.includes('requireAdmin'), 'Contract mentions requireAdmin middleware');
assert(contract.includes('admin_role') || contract.includes('Role'), 'Contract documents roles');
assert(contract.includes('super_admin'), 'Contract mentions super_admin role');
assert(adminOps.includes('requireAdmin'), 'Backend uses requireAdmin middleware');
const authTs = fs.readFileSync(path.join(__dirname, '..', 'server', 'src', 'middleware', 'auth.ts'), 'utf8');
assert(authTs.includes('admin_users'), 'Auth middleware checks admin_users table');
assert(authTs.includes('401') || authTs.includes('403'), 'Auth middleware returns 401/403');

// --- Test 4: Audit points documented ---
console.log('\n[Test 4] Audit points documented');
assert(contract.includes('writeAuditLog') || contract.includes('audit'), 'Contract documents audit logging');
assert(contract.includes('actor_user_id') || contract.includes('actor'), 'Contract mentions audit actor');
assert(contract.includes('entity_type'), 'Contract mentions entity_type');
assert(adminOps.includes('writeAuditLog'), 'Backend implements audit logging');

// --- Test 5: Status transitions documented ---
console.log('\n[Test 5] Status transitions documented');
assert(contract.includes('draft') && contract.includes('active') && contract.includes('archived'), 'Contract documents regulation version statuses');
assert(contract.includes('review') && contract.includes('published'), 'Contract documents content statuses');
assert(contract.includes('Status Transition') || contract.includes('transition'), 'Contract has status transition section');

// --- Test 6: HTTP methods documented ---
console.log('\n[Test 6] HTTP methods documented');
assert(contract.includes('GET') && contract.includes('POST') && contract.includes('PATCH'), 'Contract documents HTTP methods');
assert(contract.includes('PUT'), 'Contract documents PUT for updates');

console.log(`\n--- Phase 24 Results: ${passed} PASS / ${failed} FAIL ---`);
process.exit(failed > 0 ? 1 : 0);
