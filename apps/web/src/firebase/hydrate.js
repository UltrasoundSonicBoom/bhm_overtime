// firebase/hydrate.js — 로그인 시 Firestore → localStorage 채우기 (다기기 동기화)
//
// Phase 8 Task 7 의 누락된 read 흐름. 사용자가 PC 에서 입력한 데이터가
// 휴대폰에서 안 보이던 버그의 1차 fix.
//
// 호출: auth-service.js onAuthChanged 로그인 분기에서 googleSub 설정 직후.
// 책임: 7 카테고리 (profile/overtime/leave/payslip/work_history/settings/favorites)
//       Firestore 에서 read → 사용자별 localStorage 키 (`_uid_<uid>` 접미)에 저장.
//
// 모델: auth = real data. cloud 가 source of truth. 로그아웃 시 _uid_<uid> 키들
//       모두 정리되므로 (clearLocalUserData), 재로그인 시 hydrate 가 cloud → 로컬
//       을 항상 덮어쓴다 (조건부 write 아님). 로컬 데이터 충돌 위험 없음.

import { readProfile } from './sync/profile-sync.js';
import { readAllOvertime } from './sync/overtime-sync.js';
import { readAllLeave } from './sync/leave-sync.js';
import { readAllPayslips } from './sync/payslip-sync.js';
import { readAllWorkHistory } from './sync/work-history-sync.js';
import { readSettings } from './sync/settings-sync.js';
import { readFavorites } from './sync/favorites-sync.js';
import {
  clearActiveUserLocalData,
  emitDomainRefresh,
  mergeCloudSettingsForLocal,
} from './sync-lifecycle.js';
import { localKeyFor } from './key-registry.js';

function _setLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
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
        const data = await readProfile(null, uid);
        if (!data) return;
        _setLocal(localKeyFor('snuhmate_hr_profile', uid), data);
        if (data.manualHourly != null) {
          _setLocal(localKeyFor('otManualHourly', uid), String(data.manualHourly));
        }
      },
    },
    {
      key: 'overtime',
      run: async () => {
        const data = await readAllOvertime(null, uid);
        if (!data || Object.keys(data).length === 0) return;
        _setLocal(localKeyFor('overtimeRecords', uid), data);
      },
    },
    {
      key: 'leave',
      run: async () => {
        const data = await readAllLeave(null, uid);
        if (!data || Object.keys(data).length === 0) return;
        _setLocal(localKeyFor('leaveRecords', uid), data);
      },
    },
    {
      key: 'payslips',
      run: async () => {
        const data = await readAllPayslips(null, uid);
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
        const data = await readAllWorkHistory(null, uid);
        if (!data || data.length === 0) return;
        _setLocal(localKeyFor('snuhmate_work_history', uid), data);
      },
    },
    {
      key: 'settings',
      run: async () => {
        const data = await readSettings(null, uid);
        if (!data) return;
        try {
          const existing = JSON.parse(localStorage.getItem('snuhmate_settings') || '{}');
          _setLocal('snuhmate_settings', mergeCloudSettingsForLocal(existing, data));
        } catch (e) { _setLocal('snuhmate_settings', mergeCloudSettingsForLocal({}, data)); }
      },
    },
    {
      key: 'favorites',
      run: async () => {
        const data = await readFavorites(null, uid);
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
