// firebase/hydrate.js — 로그인 시 Firestore → localStorage 채우기 (다기기 동기화)
//
// auth = real data. cloud가 source of truth이고, 로그인 때 Firestore 값을
// 현재 uid의 localStorage 키로 덮어써서 탭 간 계산 흐름을 즉시 재초기화한다.

import {
  clearActiveUserLocalData,
  emitDomainRefresh,
  mergeCloudSettingsForLocal,
} from './sync-lifecycle.js';
import { localKeyFor } from './key-registry.js';

async function _readProfile(...args) {
  const { readProfile } = await import('./sync/profile-sync.js');
  return readProfile(...args);
}

async function _readAllOvertime(...args) {
  const { readAllOvertime } = await import('./sync/overtime-sync.js');
  return readAllOvertime(...args);
}

async function _readAllLeave(...args) {
  const { readAllLeave } = await import('./sync/leave-sync.js');
  return readAllLeave(...args);
}

async function _readAllPayslips(...args) {
  const { readAllPayslips } = await import('./sync/payslip-sync.js');
  return readAllPayslips(...args);
}

async function _readAllWorkHistory(...args) {
  const { readAllWorkHistory } = await import('./sync/work-history-sync.js');
  return readAllWorkHistory(...args);
}

async function _readAllSchedule(...args) {
  const { readAllSchedule } = await import('./sync/schedule-sync.js');
  return readAllSchedule(...args);
}

async function _readSettings(...args) {
  const { readSettings } = await import('./sync/settings-sync.js');
  return readSettings(...args);
}

async function _readFavorites(...args) {
  const { readFavorites } = await import('./sync/favorites-sync.js');
  return readFavorites(...args);
}

export const HYDRATED_BASES = [
  'snuhmate_hr_profile',
  'snuhmate_work_history_seeded',
  'overtimeRecords',
  'otManualHourly',
  'overtimePayslipData',
  'leaveRecords',
  'snuhmate_work_history',
  'snuhmate_schedule_records',
  'snuhmate_settings',
  'theme',
  'snuhmate_reg_favorites',
];

export const CLEARED_EXACT_BASES = [
  'snuhmate_hr_profile',
  'snuhmate_work_history_seeded',
  'overtimeRecords',
  'otManualHourly',
  'overtimePayslipData',
  'leaveRecords',
  'snuhmate_work_history',
  'snuhmate_schedule_records',
  'snuhmate_reg_favorites',
];

function _setLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('[hydrate] localStorage write 실패', key, e?.message);
    return false;
  }
}

function _setLocalRaw(key, value) {
  try {
    localStorage.setItem(key, String(value));
    return true;
  } catch (e) {
    console.warn('[hydrate] localStorage write 실패', key, e?.message);
    return false;
  }
}

function _payslipLocalKey(uid, payMonth, type) {
  const [year, month] = String(payMonth || '').split('-');
  if (!year || !month) return null;
  const base = `payslip_${uid}_${year}_${month}`;
  return type && type !== '급여' ? `${base}_${type}` : base;
}

function _isCrossCheckPayslip(data) {
  return !!(data && (
    Array.isArray(data.workStats) ||
    Array.isArray(data.overtimeItems) ||
    typeof data.hourlyRate === 'number'
  ));
}

// 로그아웃 시 호출 — 현재 로그인 uid 의 user-scoped active state 만 정리한다.
// 다른 uid 백업, guest 데이터, device-local 설정은 보존한다.
export function clearLocalUserData(uid) {
  return clearActiveUserLocalData(uid);
}

// 로그인 사용자의 모든 카테고리를 Firestore에서 읽어 로컬에 동기화.
// cloud 가 authoritative — 로컬에 있어도 무조건 덮어씀.
export async function hydrateFromFirestore(uid) {
  if (!uid) return { ok: [], failed: ['no-uid'] };

  const tasks = [
    {
      key: 'profile',
      run: async () => {
        const data = await _readProfile(null, uid);
        if (!data) return;
        _setLocal(localKeyFor('snuhmate_hr_profile', uid), data);
        if (data.manualHourly != null) {
          _setLocalRaw(localKeyFor('otManualHourly', uid), data.manualHourly);
        }
        if (data.workHistorySeeded != null) {
          _setLocalRaw(localKeyFor('snuhmate_work_history_seeded', uid), data.workHistorySeeded ? 'true' : 'false');
        }
      },
    },
    {
      key: 'overtime',
      run: async () => {
        const data = await _readAllOvertime(null, uid);
        if (!data || Object.keys(data).length === 0) return;
        _setLocal(localKeyFor('overtimeRecords', uid), data);
      },
    },
    {
      key: 'leave',
      run: async () => {
        const data = await _readAllLeave(null, uid);
        if (!data || Object.keys(data).length === 0) return;
        _setLocal(localKeyFor('leaveRecords', uid), data);
      },
    },
    {
      key: 'payslips',
      run: async () => {
        const data = await _readAllPayslips(null, uid);
        if (!data || Object.keys(data).length === 0) return;
        const crossCheckData = {};
        for (const [entryKey, payslipData] of Object.entries(data)) {
          const payMonth = payslipData?.payMonth || entryKey.split('__')[0];
          const type = payslipData?.type || (entryKey.includes('__') ? entryKey.split('__').slice(1).join('__') : '급여');
          const localKey = _payslipLocalKey(uid, payMonth, type);
          if (localKey) _setLocal(localKey, payslipData);
          if (_isCrossCheckPayslip(payslipData) && payMonth) {
            crossCheckData[payMonth] = payslipData;
          }
        }
        if (Object.keys(crossCheckData).length > 0) {
          _setLocal(localKeyFor('overtimePayslipData', uid), crossCheckData);
        }
      },
    },
    {
      key: 'work_history',
      run: async () => {
        const data = await _readAllWorkHistory(null, uid);
        if (!data || data.length === 0) return;
        _setLocal(localKeyFor('snuhmate_work_history', uid), data);
      },
    },
    {
      key: 'schedule',
      run: async () => {
        const data = await _readAllSchedule(null, uid);
        if (!data || Object.keys(data).length === 0) return;
        _setLocal('snuhmate_schedule_records', data);
      },
    },
    {
      key: 'settings',
      run: async () => {
        const data = await _readSettings(null, uid);
        if (!data) return;
        try {
          const existing = JSON.parse(localStorage.getItem('snuhmate_settings') || '{}');
          _setLocal('snuhmate_settings', mergeCloudSettingsForLocal(existing, data));
        } catch (e) {
          _setLocal('snuhmate_settings', mergeCloudSettingsForLocal({}, data));
        }
        if (data.theme) _setLocalRaw('theme', data.theme);
      },
    },
    {
      key: 'favorites',
      run: async () => {
        const data = await _readFavorites(null, uid);
        if (!data || data.length === 0) return;
        _setLocal(localKeyFor('snuhmate_reg_favorites', uid), data);
      },
    },
  ];

  const settled = await Promise.allSettled(tasks.map(t => t.run()));
  const ok = [];
  const failed = [];
  for (let i = 0; i < tasks.length; i++) {
    if (settled[i].status === 'fulfilled') {
      ok.push(tasks[i].key);
    } else {
      failed.push(tasks[i].key);
      console.warn('[hydrate] ' + tasks[i].key + ' 실패', settled[i].reason?.message, settled[i].reason);
    }
  }

  emitDomainRefresh({ reason: 'hydrate', ok, failed, uid });
  return { ok, failed };
}
