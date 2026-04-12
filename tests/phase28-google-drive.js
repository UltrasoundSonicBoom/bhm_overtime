/**
 * Phase 28: C1 -- Google Drive Integration
 *
 * Tests:
 * 1. googleDriveStore.js exists with required API
 * 2. index.html has Drive backup UI section
 * 3. Drive backup toggle exists
 * 4. Manual sync button exists
 * 5. Google login gating (display:none by default)
 * 6. appDataFolder usage
 * 7. Error handling (toast on failure)
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

console.log('Phase 28: C1 -- Google Drive Integration\n');

// --- Test 1: googleDriveStore.js exists ---
console.log('[Test 1] googleDriveStore.js');
const drivePath = path.join(__dirname, '..', 'googleDriveStore.js');
assert(fs.existsSync(drivePath), 'googleDriveStore.js exists');
const driveJs = fs.readFileSync(drivePath, 'utf8');
assert(driveJs.includes('GoogleDriveStore'), 'Exposes GoogleDriveStore namespace');
assert(driveJs.includes('readJsonFile'), 'Has readJsonFile method');
assert(driveJs.includes('writeJsonFile'), 'Has writeJsonFile method');
assert(driveJs.includes('deleteFile'), 'Has deleteFile method');
assert(driveJs.includes('uploadPdf'), 'Has uploadPdf method');

// --- Test 2: Uses Drive API ---
console.log('\n[Test 2] Drive API usage');
assert(driveJs.includes('googleapis.com/drive'), 'Uses Google Drive API');
assert(driveJs.includes('appDataFolder'), 'Uses appDataFolder scope');
assert(driveJs.includes('Authorization'), 'Sends Authorization header');
assert(driveJs.includes('Bearer'), 'Uses Bearer token');

// --- Test 3: index.html Drive UI ---
console.log('\n[Test 3] index.html Drive UI');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert(indexHtml.includes('googleBackupSection'), 'Google backup section exists');
assert(indexHtml.includes('driveBackupToggle'), 'Drive backup toggle exists');
assert(indexHtml.includes('onDriveManualSync') || indexHtml.includes('driveManualSync'), 'Manual sync button exists');
assert(indexHtml.includes('onDriveBackupToggle'), 'Backup toggle handler exists');
assert(indexHtml.includes('display:none') || indexHtml.includes('display: none'), 'Drive section hidden by default');

// --- Test 4: Google login gating ---
console.log('\n[Test 4] Google login gating');
assert(driveJs.includes('GoogleAuth') || driveJs.includes('getAccessToken'), 'References Google Auth');
assert(driveJs.includes('access token'), 'Checks for access token');

// --- Test 5: Error handling ---
console.log('\n[Test 5] Error handling');
assert(driveJs.includes('catch') || driveJs.includes('.catch'), 'Has error catch blocks');
assert(driveJs.includes('_showToast') || driveJs.includes('toast') || driveJs.includes('Toast'), 'Shows toast on error');
assert(driveJs.includes('console.warn'), 'Logs warnings on failure');

// --- Test 6: File caching ---
console.log('\n[Test 6] File caching');
assert(driveJs.includes('_fileIdCache') || driveJs.includes('fileIdCache'), 'Caches file IDs');
assert(driveJs.includes('_clearCache'), 'Has cache clear for testing');

// --- Test 7: Script loaded in index.html ---
console.log('\n[Test 7] Script inclusion');
assert(indexHtml.includes('googleDriveStore.js'), 'googleDriveStore.js loaded in index.html');

// --- Test 8: Token refresh support ---
console.log('\n[Test 8] Token refresh');
assert(driveJs.includes('refreshToken') || driveJs.includes('_withToken'), 'Supports token refresh');

console.log(`\n--- Phase 28 Results: ${passed} PASS / ${failed} FAIL ---`);
process.exit(failed > 0 ? 1 : 0);
