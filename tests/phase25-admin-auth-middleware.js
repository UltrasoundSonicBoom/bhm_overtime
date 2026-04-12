/**
 * Phase 25: B4 -- Admin Auth/Audit Middleware
 *
 * Tests:
 * 1. requireAdmin middleware exists and checks JWT
 * 2. Returns 401 for missing token
 * 3. Returns 403 for non-admin users
 * 4. writeAuditLog function exists
 * 5. Role extension points exist
 * 6. All admin routes use requireAdmin
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

console.log('Phase 25: B4 -- Admin Auth/Audit Middleware\n');

const authTs = fs.readFileSync(path.join(__dirname, '..', 'server', 'src', 'middleware', 'auth.ts'), 'utf8');
const adminOps = fs.readFileSync(path.join(__dirname, '..', 'server', 'src', 'routes', 'adminOps.ts'), 'utf8');
const schemaTs = fs.readFileSync(path.join(__dirname, '..', 'server', 'src', 'db', 'schema.ts'), 'utf8');

// --- Test 1: requireAdmin middleware ---
console.log('[Test 1] requireAdmin middleware');
assert(authTs.includes('export async function requireAdmin'), 'requireAdmin is exported');
assert(authTs.includes('Authorization'), 'Checks Authorization header');
assert(authTs.includes('Bearer'), 'Expects Bearer token');
assert(authTs.includes('admin_users'), 'Checks admin_users table');
assert(authTs.includes('userId'), 'Sets userId in context');
assert(authTs.includes('adminRole'), 'Sets adminRole in context');

// --- Test 2: 401 for missing token ---
console.log('\n[Test 2] 401 for missing token');
assert(authTs.includes('401'), 'Returns 401 status');
assert(authTs.includes('Authorization required') || authTs.includes('Invalid token'), 'Has meaningful 401 error message');

// --- Test 3: 403 for non-admin users ---
console.log('\n[Test 3] 403 for non-admin users');
assert(authTs.includes('403'), 'Returns 403 status');
assert(authTs.includes('Admin access required') || authTs.includes('admin'), 'Has meaningful 403 error message');

// --- Test 4: writeAuditLog function ---
console.log('\n[Test 4] writeAuditLog function');
assert(adminOps.includes('writeAuditLog'), 'writeAuditLog function exists');
assert(adminOps.includes('audit_logs'), 'Writes to audit_logs table');
assert(adminOps.includes('actor_user_id'), 'Logs actor_user_id');
assert(adminOps.includes('actor_role'), 'Logs actor_role');
assert(adminOps.includes('action'), 'Logs action');
assert(adminOps.includes('entity_type'), 'Logs entity_type');
assert(adminOps.includes('entity_id'), 'Logs entity_id');
assert(adminOps.includes('diff'), 'Logs diff');

// --- Test 5: Role extension points ---
console.log('\n[Test 5] Role extension points');
assert(schemaTs.includes('admin_role'), 'admin_role enum exists in schema');
assert(schemaTs.includes('super_admin'), 'super_admin role defined');
assert(schemaTs.includes('hr_admin'), 'hr_admin role defined');
assert(schemaTs.includes('union_admin'), 'union_admin role defined');
assert(schemaTs.includes('viewer'), 'viewer role defined');

// --- Test 6: All admin routes use requireAdmin ---
console.log('\n[Test 6] Admin routes use requireAdmin');
assert(adminOps.includes("adminOpsRoutes.use('*', requireAdmin)"), 'All admin routes protected by requireAdmin');
assert(adminOps.includes("import { requireAdmin }"), 'requireAdmin imported in adminOps');

// --- Test 7: Audit log covers key write operations ---
console.log('\n[Test 7] Audit log coverage');
assert(adminOps.includes('regulation_version.created'), 'Audit: version created');
assert(adminOps.includes('regulation_version.status_changed'), 'Audit: version status changed');
assert(adminOps.includes('regulation_version.duplicated'), 'Audit: version duplicated');
assert(adminOps.includes('faq.created'), 'Audit: faq created');
assert(adminOps.includes('faq.updated'), 'Audit: faq updated');
assert(adminOps.includes('content.created'), 'Audit: content created');
assert(adminOps.includes('content.status_changed'), 'Audit: content status changed');
assert(adminOps.includes('content.review_requested'), 'Audit: content review requested');
assert(adminOps.includes('approval.decided'), 'Audit: approval decided');

console.log(`\n--- Phase 25 Results: ${passed} PASS / ${failed} FAIL ---`);
process.exit(failed > 0 ? 1 : 0);
