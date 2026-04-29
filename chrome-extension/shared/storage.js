'use strict';
const BhmStorage = {
  KEYS: {
    USER:             'bhm_user',
    PIN_HASH:         'bhm_pin_hash',
    PIN_SALT:         'bhm_pin_salt',
    PIN_LENGTH:       'bhm_pin_length',
    PIN_ATTEMPTS:     'bhm_pin_attempts',
    PIN_LOCKED_UNTIL: 'bhm_pin_locked_until',
    PIN_UNLOCKED_AT:  'bhm_pin_unlocked_at',
    OVERTIME:         'bhm_overtime_records',
    LEAVE:            'bhm_leave_records',
    PROFILE:          'bhm_profile',
    DRIVE_SYNC_AT:    'bhm_drive_sync_at',
  },
  get(keys)    { return new Promise(r => chrome.storage.local.get(keys, r)); },
  set(items)   { return new Promise(r => chrome.storage.local.set(items, r)); },
  remove(keys) { return new Promise(r => chrome.storage.local.remove(keys, r)); },
  payslipKey(year, month) {
    return 'bhm_payslip_' + year + '_' + String(month).padStart(2, '0');
  },
};
if (typeof module !== 'undefined') module.exports = { BhmStorage };
