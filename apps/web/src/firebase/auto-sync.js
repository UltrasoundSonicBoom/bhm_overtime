// firebase/auto-sync.js — 로컬 편집 시 Firestore 자동 동기화 (다기기 sync write 측)
//
// Phase 8 의 누락된 continuous sync. 사용자가 PC 에서 편집한 내용이
// 모바일에서 안 보이던 버그의 2차 fix (1차 = hydrate.js).
//
// 동작:
//   1. inline-ui-helpers.js 의 recordLocalEdit(base) 가 'app:local-edit' 이벤트 발화
//   2. 본 모듈이 로그인 상태일 때 base 키에 해당하는 localStorage 데이터를 읽어
//      해당 카테고리의 Firestore writeXXX 호출
//   3. 비로그인이면 noop (window.__firebaseUid 없음)
//
// Debounce 200ms — 짧은 시간 내 같은 base 다중 편집 시 마지막 1회만 write.

const DEBOUNCE_MS = 200;
const _timers = new Map();

async function _writeProfile(...args) {
  const { writeProfile } = await import('./sync/profile-sync.js');
  return writeProfile(...args);
}

async function _writeOvertimeMonth(...args) {
  const { writeOvertimeMonth } = await import('./sync/overtime-sync.js');
  return writeOvertimeMonth(...args);
}

async function _writeLeaveYear(...args) {
  const { writeLeaveYear } = await import('./sync/leave-sync.js');
  return writeLeaveYear(...args);
}

async function _writePayslip(...args) {
  const { writePayslip } = await import('./sync/payslip-sync.js');
  return writePayslip(...args);
}

async function _writeAllPayslips(...args) {
  const { writeAllPayslips } = await import('./sync/payslip-sync.js');
  return writeAllPayslips(...args);
}

async function _writeAllWorkHistory(...args) {
  const { writeAllWorkHistory } = await import('./sync/work-history-sync.js');
  return writeAllWorkHistory(...args);
}

async function _writeSettings(...args) {
  const { writeSettings } = await import('./sync/settings-sync.js');
  return writeSettings(...args);
}

async function _writeManualHourly(...args) {
  const { writeManualHourly } = await import('./sync/settings-sync.js');
  return writeManualHourly(...args);
}

async function _writeFavorites(...args) {
  const { writeFavorites } = await import('./sync/favorites-sync.js');
  return writeFavorites(...args);
}

async function _writeAllSchedule(...args) {
  const { writeAllSchedule } = await import('./sync/schedule-sync.js');
  return writeAllSchedule(...args);
}

function _debounce(key, fn) {
  if (_timers.has(key)) clearTimeout(_timers.get(key));
  _timers.set(key, setTimeout(() => {
    _timers.delete(key);
    Promise.resolve(fn()).catch(e => console.warn('[auto-sync] ' + key, e?.message));
  }, DEBOUNCE_MS));
}

function _localValue(key) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}

function _rawValue(key) {
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

export const HANDLERS = {
  'snuhmate_hr_profile': (uid) => {
    const data = _localValue('snuhmate_hr_profile_uid_' + uid);
    if (data) return _writeProfile(null, uid, data);
  },
  'snuhmate_work_history_seeded': (uid) => {
    const raw = _rawValue(_uidKey('snuhmate_work_history_seeded', uid)) ??
      _rawValue('snuhmate_work_history_seeded');
    const seeded = _booleanFromStorage(raw);
    if (seeded != null) return _writeProfile(null, uid, { workHistorySeeded: seeded });
  },
  'overtimeRecords': (uid) => {
    const all = _localValue('overtimeRecords_uid_' + uid) || {};
    return Promise.all(
      Object.entries(all).map(([yyyymm, records]) =>
        _writeOvertimeMonth(null, uid, yyyymm, records)
      )
    );
  },
  'otManualHourly': (uid) => {
    const raw = _rawValue(_uidKey('otManualHourly', uid)) ?? _rawValue('otManualHourly');
    if (raw != null && raw !== '') return _writeManualHourly(null, uid, Number(raw));
  },
  'overtimePayslipData': (uid) => {
    const all = _localValue(_uidKey('overtimePayslipData', uid)) ||
      _localValue('overtimePayslipData') || {};
    return _writeAllPayslips(null, uid, all);
  },
  'leaveRecords': (uid) => {
    const all = _localValue('leaveRecords') || {};
    return Promise.all(
      Object.entries(all).map(([year, records]) =>
        _writeLeaveYear(null, uid, String(year), records)
      )
    );
  },
  'snuhmate_work_history': (uid) => {
    const arr = _localValue('snuhmate_work_history_uid_' + uid);
    if (Array.isArray(arr) && arr.length > 0) {
      return _writeAllWorkHistory(null, uid, arr);
    }
  },
  'snuhmate_schedule_records': (uid) => {
    const all = _localValue('snuhmate_schedule_records') || {};
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
    const arr = _localValue('snuhmate_reg_favorites_uid_' + uid);
    if (Array.isArray(arr)) return _writeFavorites(null, uid, arr);
  },
};

export const HANDLER_BASES = Object.keys(HANDLERS);
export const SPECIAL_KEY_PATTERNS = ['payslip'];

const PAYSLIP_KEY_RE = /^payslip_([^_]+)_(\d{4})_(\d{2})(?:_.+)?$/;

function _canonicalBase(base, uid) {
  const suffix = '_uid_' + uid;
  for (const registered of HANDLER_BASES) {
    if (base === registered || base === registered + suffix) return registered;
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
    const data = _localValue(base);
    if (data) {
      _debounce('payslip:' + payMonth, () => _writePayslip(null, uid, payMonth, data));
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
      for (const t of _timers.values()) clearTimeout(t);
      _timers.clear();
    }
  });
}
