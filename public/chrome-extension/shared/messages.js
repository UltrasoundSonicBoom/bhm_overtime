/**
 * Shared message type constants for extension ↔ content-script ↔ page communication
 */
var SNUHMATE_EXT_MSG = {
  PAGE_READY: 'PAGE_READY',
  BRIDGE_READY: 'BRIDGE_READY',
  QUICK_CAPTURE: 'QUICK_CAPTURE',
  IMPORT_PAYSLIP: 'IMPORT_PAYSLIP',
  IMPORT_PAYSLIP_FROM_URL: 'IMPORT_PAYSLIP_FROM_URL',
  RPC_RESULT: 'RPC_RESULT'
};

if (typeof module !== 'undefined') module.exports = SNUHMATE_EXT_MSG;
