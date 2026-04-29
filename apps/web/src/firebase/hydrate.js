// firebase/hydrate.js — 로그인 시 Firestore → localStorage 채우기 (다기기 동기화)
//
// Phase 8 Task 7 의 누락된 read 흐름. 사용자가 PC 에서 입력한 데이터가
// 휴대폰에서 안 보이던 버그의 1차 fix.
//
// 호출: auth-service.js onAuthChanged 로그인 분기에서 googleSub 설정 직후.
// 책임: 7 카테고리 (profile/overtime/leave/payslip/work_history/settings/favorites)
//       Firestore 에서 read → 사용자별 localStorage 키 (`_uid_<uid>` 접미)에 저장.
// 안전: 로컬에 동일 키 데이터가 있으면 보존 (사용자가 방금 편집한 내용 보호).

import { readProfile } from './sync/profile-sync.js';
import { readAllOvertime } from './sync/overtime-sync.js';
import { readAllLeave } from './sync/leave-sync.js';
import { readAllPayslips } from './sync/payslip-sync.js';
import { readAllWorkHistory } from './sync/work-history-sync.js';
import { readSettings } from './sync/settings-sync.js';
import { readFavorites } from './sync/favorites-sync.js';

function _setLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('[hydrate] localStorage write 실패', key, e?.message);
    return false;
  }
}

function _hasLocalData(key) {
  try {
    const v = localStorage.getItem(key);
    if (!v) return false;
    const parsed = JSON.parse(v);
    if (Array.isArray(parsed)) return parsed.length > 0;
    if (typeof parsed === 'object' && parsed !== null) return Object.keys(parsed).length > 0;
    return !!parsed;
  } catch { return false; }
}

// 로그인 사용자의 모든 카테고리를 Firestore에서 읽어 로컬에 동기화.
export async function hydrateFromFirestore(uid) {
  if (!uid) return { ok: [], failed: ['no-uid'] };

  const tasks = [
    {
      key: 'profile',
      run: async () => {
        const data = await readProfile(null, uid);
        if (!data) return;
        const storageKey = 'snuhmate_hr_profile_uid_' + uid;
        if (!_hasLocalData(storageKey)) _setLocal(storageKey, data);
      },
    },
    {
      key: 'overtime',
      run: async () => {
        const data = await readAllOvertime(null, uid);
        if (!data || Object.keys(data).length === 0) return;
        const storageKey = 'overtimeRecords_uid_' + uid;
        if (!_hasLocalData(storageKey)) _setLocal(storageKey, data);
      },
    },
    {
      key: 'leave',
      run: async () => {
        const data = await readAllLeave(null, uid);
        if (!data || Object.keys(data).length === 0) return;
        // leave.js 는 단일 키 'leaveRecords' 사용 (uid 접미 없음)
        if (!_hasLocalData('leaveRecords')) _setLocal('leaveRecords', data);
      },
    },
    {
      key: 'payslips',
      run: async () => {
        const data = await readAllPayslips(null, uid);
        if (!data || Object.keys(data).length === 0) return;
        const summaryKey = 'overtimePayslipData_uid_' + uid;
        if (!_hasLocalData(summaryKey)) _setLocal(summaryKey, data);
        for (const [payMonth, payslipData] of Object.entries(data)) {
          const m = /^(\d{4})-(\d{2})$/.exec(payMonth);
          if (!m) continue;
          const pmKey = 'payslip_' + uid + '_' + m[1] + '_' + m[2];
          if (!localStorage.getItem(pmKey)) _setLocal(pmKey, payslipData);
        }
      },
    },
    {
      key: 'work_history',
      run: async () => {
        const data = await readAllWorkHistory(null, uid);
        if (!data || data.length === 0) return;
        const storageKey = 'snuhmate_work_history_uid_' + uid;
        if (!_hasLocalData(storageKey)) _setLocal(storageKey, data);
      },
    },
    {
      key: 'settings',
      run: async () => {
        const data = await readSettings(null, uid);
        if (!data) return;
        try {
          const existing = JSON.parse(localStorage.getItem('snuhmate_settings') || '{}');
          const merged = { ...data, ...existing };
          _setLocal('snuhmate_settings', merged);
        } catch (e) { _setLocal('snuhmate_settings', data); }
      },
    },
    {
      key: 'favorites',
      run: async () => {
        const data = await readFavorites(null, uid);
        if (!data || data.length === 0) return;
        const storageKey = 'snuhmate_reg_favorites_uid_' + uid;
        if (!_hasLocalData(storageKey)) _setLocal(storageKey, data);
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

  window.dispatchEvent(new CustomEvent('app:cloud-hydrated', { detail: { ok, failed, uid } }));

  return { ok, failed };
}
