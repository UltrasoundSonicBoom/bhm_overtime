/**
 * Phase 45 — Extension PDF handoff static verification
 * Tests: download tracking, context menu, recent PDF UI, PDF fetch + import delivery
 */
const fs = require('fs');
const path = require('path');

const extDir = path.join(__dirname, '..', 'chrome-extension');

const bgJs = fs.readFileSync(path.join(extDir, 'background.js'), 'utf8');
const popupHtml = fs.readFileSync(path.join(extDir, 'popup.html'), 'utf8');
const popupJs = fs.readFileSync(path.join(extDir, 'popup.js'), 'utf8');
const contentJs = fs.readFileSync(path.join(extDir, 'content-script.js'), 'utf8');

// ── Task 7: PDF entry points ──
if (!bgJs.includes('downloads.onChanged')) throw new Error('missing download tracking');
if (!bgJs.includes('contextMenus.onClicked')) throw new Error('missing PDF context menu');
if (!popupHtml.includes('recentPdfList')) throw new Error('missing recent PDF list');
if (!popupJs.includes('importPdfFromUrl')) throw new Error('missing PDF import action');

// ── Task 8: PDF fetch + import delivery ──
if (!bgJs.includes('fetchPdfAsBase64')) throw new Error('missing PDF fetch helper');
if (!bgJs.includes('IMPORT_PAYSLIP')) throw new Error('missing PDF import dispatch');
if (!bgJs.includes('chrome.tabs.update')) throw new Error('missing visible tab focus for payroll import');
if (!contentJs.includes('IMPORT_PAYSLIP')) throw new Error('content script missing PDF relay');

console.log('✅ phase45-extension-pdf-handoff: all checks passed');
