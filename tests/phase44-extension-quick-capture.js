/**
 * Phase 44 — Extension quick-capture static verification
 * Tests: manifest, permissions, popup files, quick-capture message flow
 */
const fs = require('fs');
const path = require('path');

const extDir = path.join(__dirname, '..', 'chrome-extension');

// ── Task 4: MV3 scaffold ──
const manifestPath = path.join(extDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) throw new Error('missing manifest.json');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.manifest_version !== 3) throw new Error('manifest v3 required');
if (!manifest.permissions.includes('tabs')) throw new Error('tabs permission required');
if (!manifest.permissions.includes('scripting')) throw new Error('scripting permission required');
if (!manifest.permissions.includes('storage')) throw new Error('storage permission required');
if (!manifest.host_permissions.some(function (h) { return h.includes('snuhmate.com'); })) throw new Error('snuhmate host permission required');

// ── Task 5: Popup UI ──
const popupHtml = fs.readFileSync(path.join(extDir, 'popup.html'), 'utf8');
const popupJs = fs.readFileSync(path.join(extDir, 'popup.js'), 'utf8');

if (!popupHtml.includes('quickCaptureCalendar')) throw new Error('missing mini calendar');
if (!popupHtml.includes('captureType')) throw new Error('missing type controls');
if (!popupJs.includes('renderMiniCalendar')) throw new Error('missing calendar renderer');
if (!popupJs.includes('submitQuickCapture')) throw new Error('missing capture submit');

// ── Task 6: Delivery flow ──
const bgJs = fs.readFileSync(path.join(extDir, 'background.js'), 'utf8');
const contentJs = fs.readFileSync(path.join(extDir, 'content-script.js'), 'utf8');

if (!bgJs.includes('ensureSnuhmateTab')) throw new Error('missing ensureSnuhmateTab');
if (!bgJs.includes('chrome.tabs.create')) throw new Error('missing background tab creation');
if (!popupJs.includes('chrome.runtime.sendMessage')) throw new Error('popup does not send quick capture message');
if (!contentJs.includes('window.postMessage')) throw new Error('content script missing page relay');

console.log('✅ phase44-extension-quick-capture: all checks passed');
