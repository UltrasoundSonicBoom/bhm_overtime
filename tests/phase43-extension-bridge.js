/**
 * Phase 43 — Extension Bridge static verification
 * Tests: extensionBridge.js existence, namespace, API surface, index.html inclusion
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const bridgePath = path.join(root, 'extensionBridge.js');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// ── Task 1: Shell ──
if (!fs.existsSync(bridgePath)) throw new Error('missing extensionBridge.js');

const bridgeJs = fs.readFileSync(bridgePath, 'utf8');
if (!bridgeJs.includes('SnuhmateExtensionBridge')) throw new Error('missing bridge namespace');
if (!bridgeJs.includes('quickCapture')) throw new Error('missing quickCapture API');
if (!bridgeJs.includes('importPayslipPayload')) throw new Error('missing importPayslipPayload API');
if (!indexHtml.includes('extensionBridge.js')) throw new Error('index.html does not load extensionBridge.js');

// ── Task 2: Quick Capture logic ──
if (!bridgeJs.includes('OVERTIME.createRecord')) throw new Error('quick capture does not call OVERTIME.createRecord');
if (!bridgeJs.includes("type === 'oncall_standby'") && !bridgeJs.includes("=== 'oncall_standby'")) throw new Error('missing oncall standby mapping');
if (!bridgeJs.includes('showOtToast')) throw new Error('missing success toast hook');
if (!bridgeJs.includes('assertAuthenticated')) throw new Error('missing auth check in bridge');

// ── Task 3: Payslip import logic ──
if (!bridgeJs.includes('Uint8Array')) throw new Error('missing base64 reconstruction');
if (!bridgeJs.includes('handlePayslipUpload')) throw new Error('missing payslip upload handoff');
if (!bridgeJs.includes("switchTab")) throw new Error('missing payroll tab focus');

console.log('✅ phase43-extension-bridge: all checks passed');
