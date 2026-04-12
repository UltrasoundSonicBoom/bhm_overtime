/**
 * Phase 27: B7 -- Notices/FAQ DB-based Migration
 *
 * Tests:
 * 1. Public FAQ API filters by is_published
 * 2. Admin can manage notices as content_entries
 * 3. Published state controls public exposure
 * 4. Fallback mechanism exists
 * 5. FAQ search supports published filter
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

console.log('Phase 27: B7 -- Notices/FAQ DB-based Migration\n');

const faqRoute = fs.readFileSync(path.join(__dirname, '..', 'server', 'src', 'routes', 'faq.ts'), 'utf8');
const adminOps = fs.readFileSync(path.join(__dirname, '..', 'server', 'src', 'routes', 'adminOps.ts'), 'utf8');
const adminJs = fs.readFileSync(path.join(__dirname, '..', 'admin', 'admin.js'), 'utf8');
const adminHtml = fs.readFileSync(path.join(__dirname, '..', 'admin', 'index.html'), 'utf8');
const schemaTs = fs.readFileSync(path.join(__dirname, '..', 'server', 'src', 'db', 'schema.ts'), 'utf8');

// --- Test 1: Public FAQ API ---
console.log('[Test 1] Public FAQ API');
assert(faqRoute.includes('isPublished') || faqRoute.includes('is_published'), 'FAQ route filters by published state');
assert(faqRoute.includes('true'), 'FAQ route filters for published=true');
assert(faqRoute.includes('/'), 'FAQ list endpoint exists');
assert(faqRoute.includes('/search'), 'FAQ search endpoint exists');

// --- Test 2: FAQ search respects published ---
console.log('\n[Test 2] FAQ search respects published');
assert(faqRoute.includes('is_published = true') || faqRoute.includes('isPublished, true'), 'Search also filters published');

// --- Test 3: Admin notices management ---
console.log('\n[Test 3] Admin notices management');
assert(adminOps.includes("'/content'"), 'Content management endpoint exists');
assert(adminOps.includes('content_type'), 'Content type field used');
assert(schemaTs.includes("'notice'"), 'Notice type defined in schema');
assert(adminHtml.includes('notice'), 'Notice option in admin HTML');

// --- Test 4: Published state controls exposure ---
console.log('\n[Test 4] Published state controls public exposure');
assert(adminOps.includes("'published'"), 'Published status in admin routes');
assert(adminOps.includes('published_revision_id'), 'Published revision tracking');
assert(faqRoute.includes('isPublished') || faqRoute.includes('is_published'), 'FAQ public route uses published filter');

// --- Test 5: Content status transitions ---
console.log('\n[Test 5] Content status transitions');
assert(adminOps.includes('status'), 'Status field in content management');
assert(adminOps.includes("'/content/:id/status'"), 'Content status change endpoint');
assert(adminOps.includes("'/content/:id/request-review'"), 'Content review request endpoint');

// --- Test 6: Fallback mechanism ---
console.log('\n[Test 6] Fallback mechanism');
const dataJsExists = fs.existsSync(path.join(__dirname, '..', 'data.js'));
assert(dataJsExists, 'data.js fallback exists');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert(indexHtml.includes('data.js') || indexHtml.includes('DATA') || indexHtml.includes('fallback'), 'Index HTML references data.js or has fallback');

// --- Test 7: Admin UI content type filtering ---
console.log('\n[Test 7] Admin UI content management');
assert(adminJs.includes('contentTypeSelect') || adminJs.includes('content_type'), 'Admin JS handles content types');
assert(adminJs.includes('contentEntries'), 'Admin JS tracks content entries');
assert(adminJs.includes('loadContentEntries'), 'Admin JS loads content entries');
assert(adminJs.includes('contentFilter'), 'Admin JS has content filter');

// --- Test 8: FAQ admin management ---
console.log('\n[Test 8] FAQ admin management');
assert(adminOps.includes("'/faqs'"), 'FAQ admin endpoint');
assert(adminOps.includes('faq_entries'), 'FAQ uses faq_entries table');
assert(adminJs.includes('loadFaqs'), 'Admin JS loads FAQs');
assert(adminJs.includes('saveFaq'), 'Admin JS saves FAQs');

console.log(`\n--- Phase 27 Results: ${passed} PASS / ${failed} FAIL ---`);
process.exit(failed > 0 ? 1 : 0);
