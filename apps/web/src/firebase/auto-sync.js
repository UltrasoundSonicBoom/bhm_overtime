// firebase/auto-sync.js — 로컬 편집 시 Firestore 자동 동기화 (다기기 sync write 측)
//
// recordLocalEdit(base) / 도메인 이벤트를 받아 로그인 사용자(uid)의 Firestore에
// 쓰기 전파한다. localStorage 키 이름은 key-registry.js를 단일 기준으로 삼는다.

import { localKeyFor } from './key-registry.js';

const DEBOUNCE_MS = 200;
const _timers = new Map();

async function _writeProfile(...args) {
  const { writeProfile } = await import('/src/firebase/sync/profile-sync.js');
  return writeProfile(...args);
}

async function _writeOvertimeMonth(...args) {
  const { writeOvertimeMonth } = await import('/src/firebase/sync/overtime-sync.js');
  return writeOvertimeMonth(...args);
}

async function _writeLeaveYear(...args) {
  const { writeLeaveYear } = await import('/src/firebase/sync/leave-sync.js');
  return writeLeaveYear(...args);
}

async function _writePayslip(...args) {
  const { writePayslip } = await import('/src/firebase/sync/payslip-sync.js');
  return writePayslip(...args);
}

async function _writeAllPayslips(...args) {
  const { writeAllPayslips } = await import('/src/firebase/sync/payslip-sync.js');
  return writeAllPayslips(...args);
}

async function _deletePayslip(...args) {
  const { deletePayslip } = await import('/src/firebase/sync/payslip-sync.js');
  return deletePayslip(...args);
}

async function _writeAllWorkHistory(...args) {
  const { writeAllWorkHistory } = await import('/src/firebase/sync/work-history-sync.js');
  return writeAllWorkHistory(...args);
}

async function _writeAllCareerEvents(...args) {
  const { writeAllCareerEvents } = await import('/src/firebase/sync/career-events-sync.js');
  return writeAllCareerEvents(...args);
}

async function _writeSettings(...args) {
  const { writeSettings } = await import('/src/firebase/sync/settings-sync.js');
  return writeSettings(...args);
}

async function _writeManualHourly(...args) {
  const { writeManualHourly } = await import('/src/firebase/sync/settings-sync.js');
  return writeManualHourly(...args);
}

async function _writeFavorites(...args) {
  const { writeFavorites } = await import('/src/firebase/sync/favorites-sync.js');
  return writeFavorites(...args);
}

async function _writeAllSchedule(...args) {
  const { writeAllSchedule } = await import('/src/firebase/sync/schedule-sync.js');
  return writeAllSchedule(...args);
}

function _debounce(key, fn) {
  if (_timers.has(key)) globalThis.clearTimeout(_timers.get(key));
  _timers.set(key, globalThis.setTimeout(() => {
    _timers.delete(key);
    Promise.resolve(fn()).catch(e => console.warn('[auto-sync] ' + key, e?.message));
  }, DEBOUNCE_MS));
}

function _localValue(key) {
  if (!key) return null;
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}

function _rawValue(key) {
  if (!key) return null;
  try {
    return localStorage.getItem(key);
  } catch { return null; }
}

function _uidKey(base, uid) {
  return base + '_uid_' + uid;
}

function _booleanFromStorage(raw) {
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'boolean') return parsed;
    if (typeof parsed === 'number') return parsed !== 0;
  } catch {}
  return raw === 'true' || raw === '1';
}

function _firstLocalValue(keys, fallback) {
  for (const key of keys) {
    // 🔧 Task 2: never fall back to a guest-scoped key during a hydrated
    // session. logout() now wipes *_guest, but as defense-in-depth we also
    // skip any '_guest' key so a transient race can't leak guest data into
    // a uid-scoped Firestore write.
    if (typeof key === 'string' && key.includes('_guest')) continue;
    const value = _localValue(key);
    if (value !== null) return value;
  }
  return fallback;
}

export const HANDLERS = {
  'snuhmate_hr_profile': (uid) => {
    const data = _localValue(localKeyFor('snuhmate_hr_profile', uid));
    if (data) return _writeProfile(null, uid, data);
  },
  'snuhmate_work_history_seeded': (uid) => {
    const raw = _rawValue(localKeyFor('snuhmate_work_history_seeded', uid)) ??
      _rawValue('snuhmate_work_history_seeded');
    const seeded = _booleanFromStorage(raw);
    if (seeded != null) return _writeProfile(null, uid, { workHistorySeeded: seeded });
  },
  'overtimeRecords': (uid) => {
    const all = _localValue(localKeyFor('overtimeRecords', uid)) || {};
    return Promise.all(
      Object.entries(all).map(([yyyymm, records]) =>
        _writeOvertimeMonth(null, uid, yyyymm, records)
      )
    );
  },
  'otManualHourly': (uid) => {
    const raw = _rawValue(localKeyFor('otManualHourly', uid)) ?? _rawValue('otManualHourly');
    if (raw !== null && raw !== '') {
      const num = Number(raw);
      return _writeManualHourly(null, uid, Number.isFinite(num) ? num : raw);
    }
  },
  'overtimePayslipData': (uid) => {
    const all = _firstLocalValue(
      [localKeyFor('overtimePayslipData', uid), _uidKey('overtimePayslipData', uid), 'overtimePayslipData'],
      {}
    ) || {};
    if (Object.keys(all).length > 0) {
      return _writeAllPayslips(null, uid, all, 'overtimePayslipData');
    }
  },
  'leaveRecords': (uid) => {
    const all = _firstLocalValue([localKeyFor('leaveRecords', uid), 'leaveRecords'], {}) || {};
    return Promise.all(
      Object.entries(all).map(([year, records]) =>
        _writeLeaveYear(null, uid, String(year), records)
      )
    );
  },
  'snuhmate_work_history': (uid) => {
    const arr = _localValue(localKeyFor('snuhmate_work_history', uid));
    if (Array.isArray(arr)) return _writeAllWorkHistory(null, uid, arr);
  },
  'snuhmate_career_events': (uid) => {
    const arr = _localValue(localKeyFor('snuhmate_career_events', uid));
    if (Array.isArray(arr)) return _writeAllCareerEvents(null, uid, arr);
  },
  'snuhmate_schedule_records': (uid) => {
    const all = _localValue(localKeyFor('snuhmate_schedule_records', uid)) || {};
    return _writeAllSchedule(null, uid, all);
  },
  'snuhmate_settings': (uid) => {
    const data = _localValue('snuhmate_settings');
    if (data) return _writeSettings(null, uid, data);
  },
  'theme': (uid) => {
    const theme = _rawValue('theme');
    if (theme) return _writeSettings(null, uid, { theme });
  },
  'snuhmate_reg_favorites': (uid) => {
    const arr = _localValue(localKeyFor('snuhmate_reg_favorites', uid));
    if (Array.isArray(arr)) return _writeFavorites(null, uid, arr);
  },
};

export const HANDLER_BASES = Object.keys(HANDLERS);
export const SPECIAL_KEY_PATTERNS = ['payslip'];

const PAYSLIP_KEY_RE = /^payslip_(.+)_(\d{4})_(\d{2})(?:_(.+))?$/;

function _canonicalBase(base, uid) {
  for (const registered of HANDLER_BASES) {
    const localKey = localKeyFor(registered, uid);
    if (base === registered || base === localKey) return registered;
  }
  return base;
}

function _onLocalEdit(e) {
  const uid = window.__firebaseUid;
  if (!uid) return;

  const base = e?.detail?.base;
  if (!base) return;

  const pm = PAYSLIP_KEY_RE.exec(base);
  if (pm && pm[1] === uid) {
    const payMonth = pm[2] + '-' + pm[3];
    const type = pm[4] || '급여';
    const data = _localValue(base);
    if (data) {
      _debounce('payslip:' + payMonth + ':' + type, () =>
        _writePayslip(null, uid, payMonth, data, undefined, type)
      );
    }
    return;
  }

  const canonicalBase = _canonicalBase(base, uid);
  const handler = HANDLERS[canonicalBase];
  if (handler) _debounce(canonicalBase, () => handler(uid));
}

function _onPayslipChanged(e) {
  const uid = window.__firebaseUid;
  if (!uid) return;
  const key = e?.detail?.key;
  if (key) {
    if (e?.detail?.deleted) {
      const pm = PAYSLIP_KEY_RE.exec(key);
      if (pm && pm[1] === uid) {
        const payMonth = pm[2] + '-' + pm[3];
        const type = pm[4] || '급여';
        const prefix = 'payslip_' + uid + '_' + pm[2] + '_' + pm[3];
        const remainingKeys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
        _debounce('payslip:delete:' + payMonth + ':' + type, () =>
          _deletePayslip(null, uid, payMonth, type)
        );
        remainingKeys.forEach(remainingKey => _onLocalEdit({ detail: { base: remainingKey } }));
      }
      return;
    }
    _onLocalEdit({ detail: { base: key } });
    return;
  }
  _debounce('overtimePayslipData', () => HANDLERS.overtimePayslipData(uid));
}

if (typeof window !== 'undefined') {
  window.addEventListener('app:local-edit', _onLocalEdit);
  window.addEventListener('payslipChanged', _onPayslipChanged);

  window.addEventListener('app:auth-changed', (e) => {
    if (!e?.detail?.user) {
      for (const t of _timers.values()) globalThis.clearTimeout(t);
      _timers.clear();
    }
  });
}
