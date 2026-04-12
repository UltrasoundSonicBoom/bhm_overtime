'use strict';
// ============================================================
// Phase 20 — B9: Admin MVP Shell Tests
// Validates that admin/index.html serves as unified admin entry
// with 6-section navigation, auth state handling, and mobile support
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

console.log('\n=== Phase 20: B9 Admin MVP Shell ===\n');

// ── 1. File existence ──
console.log('--- File Existence ---');
const html = readFile('admin/index.html');
const css = readFile('admin/admin.css');
const js = readFile('admin/admin.js');

assert(html !== null, 'admin/index.html exists');
assert(css !== null, 'admin/admin.css exists');
assert(js !== null, 'admin/admin.js exists');

// ── 2. Navigation surfaces ──
console.log('\n--- Navigation Surfaces ---');
const requiredSurfaces = ['dashboard', 'content', 'faq', 'versions', 'review', 'logs'];

for (const surface of requiredSurfaces) {
  assert(
    html && html.includes(`data-surface="${surface}"`),
    `Navigation tab for "${surface}" surface exists`
  );
}

for (const surface of requiredSurfaces) {
  assert(
    html && html.includes(`data-surface-panel="${surface}"`),
    `Surface panel for "${surface}" exists`
  );
}

// ── 3. Auth state UI elements ──
console.log('\n--- Auth State UI ---');
assert(
  html && html.includes('id="loginBtn"'),
  'Login button exists'
);
assert(
  html && html.includes('id="authStatus"'),
  'Auth status indicator exists'
);

// Check that JS handles auth state
assert(
  js && js.includes('updateAuthState'),
  'JS has updateAuthState function'
);
assert(
  js && /loggedIn|logged.?in|session\?\.access_token/.test(js),
  'JS checks login state to toggle UI'
);

// ── 4. Dashboard surface content ──
console.log('\n--- Dashboard Surface ---');
assert(
  html && /data-surface-panel="dashboard"/.test(html),
  'Dashboard panel exists'
);

// ── 5. Content surface ──
console.log('\n--- Content Surface ---');
assert(
  html && /data-surface-panel="content"/.test(html),
  'Content panel exists'
);
assert(
  js && /\/admin\/content/.test(js),
  'JS fetches content entries from API'
);

// ── 6. Review surface ──
console.log('\n--- Review Surface ---');
assert(
  html && /data-surface-panel="review"/.test(html),
  'Review panel exists'
);
assert(
  js && /\/admin\/approvals/.test(js),
  'JS fetches approvals from API'
);

// ── 7. Logs surface ──
console.log('\n--- Logs Surface ---');
assert(
  html && /data-surface-panel="logs"/.test(html),
  'Logs panel exists'
);
assert(
  js && /\/admin\/audit-logs/.test(js),
  'JS fetches audit logs from API'
);

// ── 8. Mobile support ──
console.log('\n--- Mobile Support ---');
assert(
  css && /@media.*max-width/.test(css),
  'CSS has responsive media queries'
);
assert(
  html && /mobile-role-nav/.test(html),
  'Mobile navigation bar exists'
);
assert(
  html && /viewport/.test(html),
  'HTML has viewport meta tag'
);

// ── 9. Surface navigation JS ──
console.log('\n--- Surface Navigation Logic ---');
assert(
  js && /syncSurfaceNav|data-surface/.test(js),
  'JS handles surface navigation switching'
);
assert(
  js && /surfaceNav.*querySelectorAll|addEventListener.*data-surface/.test(js),
  'JS adds event listeners to surface tabs'
);

// ── 10. No broken references ──
console.log('\n--- Integrity Checks ---');
assert(
  html && html.includes('admin.css'),
  'HTML references admin.css'
);
assert(
  html && html.includes('admin.js'),
  'HTML references admin.js'
);
assert(
  html && html.includes('supabase'),
  'HTML includes Supabase SDK'
);

// ── 11. Existing functionality preserved ──
console.log('\n--- Regression: Existing Features ---');
assert(
  html && /versionForm|versionsList/.test(html),
  'Version management UI still present'
);
assert(
  html && /faqForm|faqList/.test(html),
  'FAQ management UI still present'
);
assert(
  js && /createVersion|saveFaq/.test(js),
  'Version and FAQ save functions still present'
);
assert(
  js && /loadAdminData/.test(js),
  'Admin data loading function still present'
);

// ── Summary ──
console.log(`\n=== Phase 20 Result: ${passed} PASS / ${failed} FAIL ===\n`);
process.exit(failed > 0 ? 1 : 0);
