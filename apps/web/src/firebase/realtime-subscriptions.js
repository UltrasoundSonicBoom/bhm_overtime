// firebase/realtime-subscriptions.js — onSnapshot lifecycle manager (Task 6)
//
// 사용:
//   import { startRealtime, stopRealtime } from '/src/firebase/realtime-subscriptions.js';
//   await startRealtime(uid);     // login + emailVerified === true 후
//   stopRealtime();               // logout 시
//
// dedup: 같은 uid 로 중복 호출 시 noop. 다른 uid 로 호출 시 기존 unsub.

let _unsubs = [];
let _activeUid = null;
let _starting = false;

export async function startRealtime(uid) {
  if (!uid) return;
  if (_activeUid === uid) return;
  if (_starting) return;
  _starting = true;
  try {
    if (_unsubs.length) stopRealtime();
    _activeUid = uid;
    const [p, o, l, c] = await Promise.all([
      import('./sync/payslip-sync.js'),
      import('./sync/overtime-sync.js'),
      import('./sync/leave-sync.js'),
      import('./sync/career-events-sync.js'),
    ]);
    const subs = await Promise.allSettled([
      p.subscribeToPayslipsRealtime?.(uid),
      o.subscribeToOvertimeRealtime?.(uid),
      l.subscribeToLeaveRealtime?.(uid),
      c.subscribeToCareerEventsRealtime?.(uid),
    ]);
    for (const r of subs) {
      if (r.status === 'fulfilled' && typeof r.value === 'function') {
        _unsubs.push(r.value);
      } else if (r.status === 'rejected') {
        console.warn('[realtime] subscribe failed', r.reason?.message);
      }
    }
  } finally {
    _starting = false;
  }
}

export function stopRealtime() {
  for (const fn of _unsubs) {
    try { fn?.(); } catch { /* noop */ }
  }
  _unsubs = [];
  _activeUid = null;
}

export function isRealtimeActive() {
  return _unsubs.length > 0;
}
