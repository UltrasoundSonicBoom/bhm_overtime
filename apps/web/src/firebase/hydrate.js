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

function _setLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('[hydrate] localStorage write 실패', key, e?.message);
    return false;
  }
}

// 로그아웃 시 호출 — 로그인 사용자의 모든 _uid_<uid> 키 + 공유 키 데이터 정리.
// 사용자 모델: "로그아웃하면 로컬에 아무 데이터가 없는 게 맞다."
export function clearLocalUserData(uid) {
  if (!uid) return;
  const exactKeys = [
    'snuhmate_hr_profile_uid_' + uid,
    'overtimeRecords_uid_' + uid,
    'overtimePayslipData_uid_' + uid,
    'snuhmate_work_history_uid_' + uid,
    'snuhmate_reg_favorites_uid_' + uid,
    'leaveRecords', // 공유 키 (uid 접미 없음)
  ];
  for (const k of exactKeys) {
    try { localStorage.removeItem(k); } catch (e) {}
  }
  // payslip per-month 키: 'payslip_<uid>_YYYY_MM' 패턴 모두 정리
  try {
    const payslipKeys = Object.keys(localStorage).filter(k =>
      new RegExp('^payslip_' + uid + '_\\d{4}_\\d{2}').test(k)
    );
    for (const k of payslipKeys) localStorage.removeItem(k);
  } catch (e) {}
  // last_edit timestamp 도 정리 (LWW 메타)
  try {
    const editKeys = Object.keys(localStorage).filter(k => k.startsWith('snuhmate_last_edit_'));
    for (const k of editKeys) localStorage.removeItem(k);
  } catch (e) {}
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
        _setLocal('snuhmate_hr_profile_uid_' + uid, data);
      },
    },
    {
      key: 'overtime',
      run: async () => {
        const data = await readAllOvertime(null, uid);
        if (!data || Object.keys(data).length === 0) return;
        _setLocal('overtimeRecords_uid_' + uid, data);
      },
    },
    {
      key: 'leave',
      run: async () => {
        const data = await readAllLeave(null, uid);
        if (!data || Object.keys(data).length === 0) return;
        _setLocal('leaveRecords', data);
      },
    },
    {
      key: 'payslips',
      run: async () => {
        const data = await readAllPayslips(null, uid);
        if (!data || Object.keys(data).length === 0) return;
        _setLocal('overtimePayslipData_uid_' + uid, data);
        for (const [payMonth, payslipData] of Object.entries(data)) {
          const m = /^(\d{4})-(\d{2})$/.exec(payMonth);
          if (!m) continue;
          _setLocal('payslip_' + uid + '_' + m[1] + '_' + m[2], payslipData);
        }
      },
    },
    {
      key: 'work_history',
      run: async () => {
        const data = await readAllWorkHistory(null, uid);
        if (!data || data.length === 0) return;
        _setLocal('snuhmate_work_history_uid_' + uid, data);
      },
    },
    {
      key: 'settings',
      run: async () => {
        const data = await readSettings(null, uid);
        if (!data) return;
        // settings 는 device-local 필드 (googleSub) 가 섞여 있어 머지 필요
        try {
          const existing = JSON.parse(localStorage.getItem('snuhmate_settings') || '{}');
          // cloud 우선, 단 googleSub 만 로컬 보존 (device-local 식별자)
          const merged = { ...existing, ...data };
          if (existing.googleSub) merged.googleSub = existing.googleSub;
          _setLocal('snuhmate_settings', merged);
        } catch (e) { _setLocal('snuhmate_settings', data); }
      },
    },
    {
      key: 'favorites',
      run: async () => {
        const data = await readFavorites(null, uid);
        if (!data || data.length === 0) return;
        _setLocal('snuhmate_reg_favorites_uid_' + uid, data);
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
