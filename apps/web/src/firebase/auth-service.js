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
import { isHospitalEmail } from './auth-validators.js';

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

// ── 이메일 가입 (인증 메일 발송) ──
// onboarding 캐러셀 Auth 슬라이드에서 호출. createUser → sendEmailVerification.
// emailVerified === true 가 될 때까지 onAuthChanged 는 Firestore 동기화/profile 적용을 보류한다.
//
// 도메인 제약: 임시로 해제 (병원 SMTP 서버가 외부 발송자 차단 가능성 — 외부 이메일로 테스트 허용).
// 함수명은 외부 호환을 위해 유지 (호출자 시그니처 변경 없음).
//
// 반환: { user, verificationSent: boolean, verificationError: Error|null }
// — 호출자가 인증 메일 발송 실패를 사용자에게 알릴 수 있도록 결과를 명시적으로 반환.
export async function signUpWithHospitalEmail(email, password) {
  const { auth, authMod } = await _f();
  const cred = await authMod.createUserWithEmailAndPassword(auth, email, password);
  let verificationSent = false;
  let verificationError = null;
  try {
    if (authMod.sendEmailVerification && cred?.user) {
      await authMod.sendEmailVerification(cred.user);
      verificationSent = true;
    }
  } catch (e) {
    console.warn('[auth] sendEmailVerification 실패', e?.message);
    verificationError = e;
  }
  return { user: cred.user, verificationSent, verificationError };
}

// ── 인증 메일 재발송 ──
// 미인증 사용자에게 인증 메일 재발송. signIn 직후 emailVerified === false 일 때 호출.
export async function resendVerificationEmail() {
  const { auth, authMod } = await _f();
  const u = auth.currentUser;
  if (!u) {
    const e = new Error('not signed in');
    e.code = 'auth/no-current-user';
    throw e;
  }
  if (u.emailVerified) {
    const e = new Error('already verified');
    e.code = 'auth/already-verified';
    throw e;
  }
  await authMod.sendEmailVerification(u);
  return true;
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

// ── Onboarding 임시 프로필 자동 적용 ──
// onboarding.js 가 snuhmate_hr_profile_guest 에 저장한 데이터를
// 사용자 uid 키로 silently 승급한다. 마이그레이션 다이얼로그는 우회한다 — 데이터가
// 방금 입력된 것이므로 클라우드 충돌 위험 없음.
// emailVerified 가 false 이면 호출하지 않음 — Firestore 보안 정책 준수.
export function applyOnboardingProfile(uid) {
  if (!uid) return false;
  const guestKey = 'snuhmate_hr_profile_guest';
  const uidKey = `snuhmate_hr_profile_uid_${uid}`;
  try {
    const guest = JSON.parse(localStorage.getItem(guestKey) || 'null');
    if (!guest) return false;
    const existing = JSON.parse(localStorage.getItem(uidKey) || '{}');
    const merged = { ...existing, ...guest };
    localStorage.setItem(uidKey, JSON.stringify(merged));
    localStorage.removeItem(guestKey);
    localStorage.removeItem('snuhmate_onboarding_pending');
    // auto-sync.js 가 듣는 이벤트 — Firestore 쓰기 트리거
    window.dispatchEvent(new CustomEvent('snuhmate:profile-changed', { detail: { uid } }));
    return true;
  } catch (e) {
    console.warn('[auth] applyOnboardingProfile 실패', e?.message);
    return false;
  }
}

// ── Auth state observer ──
// 사용: const unsub = await onAuthChanged((user) => { ... });
// unsub() 호출 시 구독 해제
export async function onAuthChanged(callback) {
  const { auth, authMod } = await _f();
  return authMod.onAuthStateChanged(auth, async (user) => {
    if (user) {
      // 병원 이메일 가입 직후엔 emailVerified === false. 사용자가 메일 인증 후 reload
      // 하면 onAuthStateChanged 가 verified=true 로 다시 발화 → 그때 본격 동기화.
      if (!user.emailVerified) {
        // 미인증 사용자: localStorage uid 키로 전환만 해두고 Firestore 작업은 보류
        login(user);
        window.dispatchEvent(new CustomEvent('app:auth-changed', { detail: { user } }));
        if (typeof callback === 'function') callback(user);
        return;
      }

      // Onboarding 즉시 적용 분기 — 마이그레이션 다이얼로그 우회
      const onboardingPending = !!localStorage.getItem('snuhmate_onboarding_pending');
      let migrationSnapshot = null;
      login(user);

      if (onboardingPending) {
        applyOnboardingProfile(user.uid);
      } else {
        // hydrate 전에 guest snapshot 을 먼저 고정한다. leave/schedule 같은 공유 키는
        // hydrate 뒤 cloud 값으로 바뀌므로, 이후에 읽으면 guest 데이터로 오인될 수 있다.
        try {
          const mig = await import('./migration-dialog.js');
          if (mig?.captureGuestMigrationSnapshot) {
            migrationSnapshot = mig.captureGuestMigrationSnapshot();
          }
        } catch (e) { /* migration-dialog 미존재 — 무해 */ }
      }

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
      // 마이그레이션 다이얼로그 hook — onboarding 흐름은 우회
      if (!onboardingPending) {
        try {
          const mig = await import('./migration-dialog.js');
          if (mig?.shouldShowMigration && await mig.shouldShowMigration(user.uid, migrationSnapshot)) {
            mig.openMigrationDialog(user.uid, migrationSnapshot);
          }
        } catch (e) { /* migration-dialog 미존재 — 무해 */ }
      }
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
