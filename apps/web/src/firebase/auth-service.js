// firebase/auth-service.js — Phase 8 Task 5: Email + Google Auth
//
// 카카오 OIDC provider 추가는 Phase 10 (별도 task) — Cloud Function 불필요한 native 방식.
//
// onAuthChanged 책임:
//   - 로그인: window.__firebaseUid 설정 (getUserStorageKey 가 참조)
//   - 로그아웃: window.__firebaseUid 삭제
//   - 양 케이스: app:auth-changed 이벤트 발화 (다른 모듈이 reactive 업데이트)
//   - 마이그레이션 다이얼로그 트리거는 Phase 8 (migration-dialog.js) 가 추가 — 현재는 hook 만

import { initFirebase } from './firebase-init.js';
import { firebaseConfig } from '../client/config.js';

let _firebase = null;
async function _f() {
  if (!_firebase) _firebase = await initFirebase(firebaseConfig);
  return _firebase;
}

// ── Email/Password ──
export async function signInWithEmail(email, password) {
  const { auth, authMod } = await _f();
  const cred = await authMod.signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signUpWithEmail(email, password) {
  const { auth, authMod } = await _f();
  const cred = await authMod.createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// ── Google ──
export async function signInWithGoogle() {
  const { auth, authMod } = await _f();
  const provider = new authMod.GoogleAuthProvider();
  const cred = await authMod.signInWithPopup(auth, provider);
  return cred.user;
}

// ── Sign out ──
export async function signOutUser() {
  const { auth, authMod } = await _f();
  await authMod.signOut(auth);
}

// ── Auth state observer ──
// 사용: const unsub = await onAuthChanged((user) => { ... });
// unsub() 호출 시 구독 해제
export async function onAuthChanged(callback) {
  const { auth, authMod } = await _f();
  return authMod.onAuthStateChanged(auth, async (user) => {
    if (user) {
      window.__firebaseUid = user.uid;
      // salary-parser._payslipUid() 가 snuhmate_settings.googleSub 를 읽으므로
      // 로그인 시 동기화해야 payslip localStorage 키가 uid 기반으로 전환됨
      try {
        const s = JSON.parse(localStorage.getItem('snuhmate_settings') || '{}');
        s.googleSub = user.uid;
        localStorage.setItem('snuhmate_settings', JSON.stringify(s));
      } catch (e) { /* noop */ }
      // 마이그레이션 다이얼로그 hook (Phase 8 에서 모듈 추가 시 활성, 미존재 무해)
      try {
        const mig = await import('./migration-dialog.js');
        if (mig?.shouldShowMigration && await mig.shouldShowMigration(user.uid)) {
          mig.openMigrationDialog(user.uid);
        }
      } catch (e) { /* migration-dialog 미존재 — Phase 8 미완 시점 무해 */ }
    } else {
      delete window.__firebaseUid;
      // 로그아웃 시 googleSub 제거 → payslip 키 guest 로 복귀
      try {
        const s = JSON.parse(localStorage.getItem('snuhmate_settings') || '{}');
        delete s.googleSub;
        localStorage.setItem('snuhmate_settings', JSON.stringify(s));
      } catch (e) { /* noop */ }
    }
    window.dispatchEvent(new CustomEvent('app:auth-changed', { detail: { user } }));
    if (typeof callback === 'function') callback(user);
  });
}

// ── 현재 user ──
export async function getCurrentUser() {
  const { auth } = await _f();
  return auth.currentUser;
}
