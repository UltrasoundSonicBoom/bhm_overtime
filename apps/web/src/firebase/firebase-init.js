// firebase/firebase-init.js — Phase 8 Task 2 Firebase App/Auth/Firestore 싱글톤
//
// SDK 로딩: gstatic.com CDN ESM (번들러 의존성 0, 기존 pdf.js/xlsx 패턴)
// Region: asia-northeast3 (Firestore 콘솔 생성 시 결정됨)
// Offline: persistentLocalCache + multi-tab manager (IndexedDB 캐시 + 다중 탭 동기화)
//
// 사용:
//   import { initFirebase } from '/firebase/firebase-init.js';
//   import { firebaseConfig } from '/apps/web/src/client/config.js';
//   const { app, auth, db, authMod, firestoreMod } = await initFirebase(firebaseConfig);
//
// 싱글톤: 첫 호출 시 promise 캐시. 이후 호출은 동일 promise 반환.
// 테스트: resetFirebaseForTest() 로 캐시 reset.

const FIREBASE_VERSION = '12.12.1';
const SDK_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;

let _initPromise = null;

export function initFirebase(config) {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const [appMod, authMod, firestoreMod] = await Promise.all([
      import(/* @vite-ignore */ `${SDK_BASE}/firebase-app.js`),
      import(/* @vite-ignore */ `${SDK_BASE}/firebase-auth.js`),
      import(/* @vite-ignore */ `${SDK_BASE}/firebase-firestore.js`),
    ]);

    const app = appMod.initializeApp(config);
    const auth = authMod.getAuth(app);
    // 자동 로그인: 브라우저 종료 후에도 세션 유지 (Firebase 기본값이지만 명시 보장)
    try {
      await authMod.setPersistence(auth, authMod.browserLocalPersistence);
    } catch (e) {
      console.warn('[firebase-init] setPersistence 실패 — 자동 로그인이 동작하지 않을 수 있음', e?.message);
    }

    let db;
    try {
      db = firestoreMod.initializeFirestore(app, {
        localCache: firestoreMod.persistentLocalCache({
          tabManager: firestoreMod.persistentMultipleTabManager(),
        }),
      });
    } catch (e) {
      // 이미 초기화된 경우 (HMR / 두 번 호출) 또는 persistence 실패
      db = firestoreMod.getFirestore(app);
    }

    return { app, auth, db, authMod, firestoreMod };
  })();
  return _initPromise;
}

export function resetFirebaseForTest() {
  _initPromise = null;
}
