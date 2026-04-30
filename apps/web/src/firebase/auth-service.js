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
import { login, hydrate, logout } from './sync-lifecycle.js';

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
      login(user);
      // 다기기 동기화: Firestore → localStorage 채우기 (PC/모바일 hydration)
      // 사용자가 다른 기기에서 입력한 데이터를 이 기기에서도 보이게 한다.
      try {
        const result = await hydrate(user.uid);
        if (result.ok.length > 0) {
          console.log('[auth] cloud hydrate:', result.ok.join(', '));
        }
        if (result.failed.length > 0) {
          console.warn('[auth] cloud hydrate 일부 실패:', result.failed.join(', '));
        }
      } catch (e) { console.warn('[auth] hydrate 실패', e?.message); }
      // 자동 동기화 listener 등록 — 이후 로컬 편집 시 자동 Firestore write
      try {
        await import('./auto-sync.js');
      } catch (e) { /* auto-sync 미존재 — 무해 */ }
      // 마이그레이션 다이얼로그 hook (Phase 8 에서 모듈 추가 시 활성, 미존재 무해)
      try {
        const mig = await import('./migration-dialog.js');
        if (mig?.shouldShowMigration && await mig.shouldShowMigration(user.uid)) {
          mig.openMigrationDialog(user.uid);
        }
      } catch (e) { /* migration-dialog 미존재 — Phase 8 미완 시점 무해 */ }
    } else {
      // 로그아웃 시 현재 uid 의 user-scoped active state 만 정리한다.
      // guest/device-local/다른 uid 로컬 백업은 보존한다.
      const prevUid = window.__firebaseUid;
      if (prevUid) {
        try {
          logout(prevUid);
        } catch (e) { console.warn('[auth] logout cleanup 실패', e?.message); }
      } else {
        logout(null);
      }
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
