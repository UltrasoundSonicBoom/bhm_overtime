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

import { writeProfile } from './sync/profile-sync.js';
import { writeOvertimeMonth } from './sync/overtime-sync.js';
import { writeLeaveYear } from './sync/leave-sync.js';
import { writePayslip } from './sync/payslip-sync.js';
import { writeAllWorkHistory } from './sync/work-history-sync.js';
import { writeSettings } from './sync/settings-sync.js';
import { writeFavorites } from './sync/favorites-sync.js';

const DEBOUNCE_MS = 200;
const _timers = new Map();

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

const HANDLERS = {
  'snuhmate_hr_profile': (uid) => {
    const data = _localValue('snuhmate_hr_profile_uid_' + uid);
    if (data) return writeProfile(null, uid, data);
  },
  'overtimeRecords': (uid) => {
    const all = _localValue('overtimeRecords_uid_' + uid) || {};
    return Promise.all(
      Object.entries(all).map(([yyyymm, records]) =>
        writeOvertimeMonth(null, uid, yyyymm, records)
      )
    );
  },
  'leaveRecords': (uid) => {
    const all = _localValue('leaveRecords') || {};
    return Promise.all(
      Object.entries(all).map(([year, records]) =>
        writeLeaveYear(null, uid, String(year), records)
      )
    );
  },
  'snuhmate_work_history': (uid) => {
    const arr = _localValue('snuhmate_work_history_uid_' + uid);
    if (Array.isArray(arr) && arr.length > 0) {
      return writeAllWorkHistory(null, uid, arr);
    }
  },
  'snuhmate_settings': (uid) => {
    const data = _localValue('snuhmate_settings');
    if (data) return writeSettings(null, uid, data);
  },
  'snuhmate_reg_favorites': (uid) => {
    const arr = _localValue('snuhmate_reg_favorites_uid_' + uid);
    if (Array.isArray(arr)) return writeFavorites(null, uid, arr);
  },
};

const PAYSLIP_KEY_RE = /^payslip_([^_]+)_(\d{4})_(\d{2})$/;

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
      _debounce('payslip:' + payMonth, () => writePayslip(null, uid, payMonth, data));
    }
    return;
  }

  const handler = HANDLERS[base];
  if (handler) _debounce(base, () => handler(uid));
}

window.addEventListener('app:local-edit', _onLocalEdit);

window.addEventListener('app:auth-changed', (e) => {
  if (!e?.detail?.user) {
    for (const t of _timers.values()) clearTimeout(t);
    _timers.clear();
  }
});
