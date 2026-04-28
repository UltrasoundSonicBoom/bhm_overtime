// Phase 8 Task 2 — Firebase init 싱글톤 검증
//
// SDK 로딩: gstatic.com CDN ESM. 테스트 환경(jsdom)에서는 dynamic import URL 을 mock.
//
// 검증:
//   1. initFirebase(config) → { app, auth, db, authMod, firestoreMod } 반환
//   2. 동일 config 두 번 호출 → 동일 인스턴스 (싱글톤)
//   3. resetFirebaseForTest() 후 새 인스턴스 생성
//   4. SDK URL 이 v12.12.1 (사용자 Firebase Console 매칭)

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// SDK 모듈 mock — vi.mock 은 hoisted 되므로 path string inline 작성 필수
vi.mock('https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js', () => ({
  initializeApp: vi.fn((config) => ({ name: '[DEFAULT]', _config: config })),
}));
vi.mock('https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js', () => ({
  getAuth: vi.fn((app) => ({ app, _isAuth: true })),
  GoogleAuthProvider: class { constructor() { this._kind = 'google'; } },
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithCustomToken: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(() => () => {}),
}));
vi.mock('https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js', () => ({
  initializeFirestore: vi.fn((app, options) => ({ app, _isDb: true, _options: options })),
  getFirestore: vi.fn((app) => ({ app, _isDb: true, _fallback: true })),
  persistentLocalCache: vi.fn((opts) => ({ _cache: opts })),
  persistentMultipleTabManager: vi.fn(() => ({ _tab: 'multi' })),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(),
  writeBatch: vi.fn(),
  deleteDoc: vi.fn(),
}));

beforeAll(() => {
  const dom = new JSDOM('<!DOCTYPE html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
});

beforeEach(async () => {
  vi.resetModules();
});

const cfg = {
  apiKey: 'test-key',
  authDomain: 'snuhmate.firebaseapp.com',
  projectId: 'snuhmate',
  storageBucket: 'snuhmate.firebasestorage.app',
  messagingSenderId: '914163950802',
  appId: '1:914163950802:web:test',
};

describe('firebase-init', () => {
  it('initFirebase(cfg) → { app, auth, db, authMod, firestoreMod }', async () => {
    const { initFirebase } = await import('../../../apps/web/src/firebase/firebase-init.js');
    const r = await initFirebase(cfg);
    expect(r.app).toBeDefined();
    expect(r.app.name).toBe('[DEFAULT]');
    expect(r.auth).toBeDefined();
    expect(r.auth._isAuth).toBe(true);
    expect(r.db).toBeDefined();
    expect(r.db._isDb).toBe(true);
    expect(r.authMod).toBeDefined();
    expect(r.firestoreMod).toBeDefined();
  });

  it('두 번째 호출은 동일 인스턴스 (싱글톤)', async () => {
    const { initFirebase } = await import('../../../apps/web/src/firebase/firebase-init.js');
    const a = await initFirebase(cfg);
    const b = await initFirebase(cfg);
    expect(a.app).toBe(b.app);
    expect(a.db).toBe(b.db);
  });

  it('Firestore 가 offline persistence + multi-tab manager 옵션으로 초기화', async () => {
    const { initFirebase } = await import('../../../apps/web/src/firebase/firebase-init.js');
    const r = await initFirebase(cfg);
    expect(r.db._options).toBeDefined();
    expect(r.db._options.localCache).toBeDefined();
  });

  it('initializeFirestore throw 시 getFirestore fallback', async () => {
    // 새 mock 으로 throw 시뮬레이션
    vi.resetModules();
    vi.doMock('https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js', () => ({
      initializeFirestore: vi.fn(() => { throw new Error('already initialized'); }),
      getFirestore: vi.fn((app) => ({ app, _isDb: true, _fallback: true })),
      persistentLocalCache: vi.fn(() => ({})),
      persistentMultipleTabManager: vi.fn(() => ({})),
    }));
    vi.doMock('https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js', () => ({
      initializeApp: vi.fn((c) => ({ name: '[DEFAULT]', _config: c })),
    }));
    vi.doMock('https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js', () => ({
      getAuth: vi.fn((app) => ({ app })),
    }));
    const { initFirebase } = await import('../../../apps/web/src/firebase/firebase-init.js');
    const r = await initFirebase(cfg);
    expect(r.db._fallback).toBe(true);
  });

  it('resetFirebaseForTest() 후 새 인스턴스', async () => {
    const { initFirebase, resetFirebaseForTest } = await import('../../../apps/web/src/firebase/firebase-init.js');
    const a = await initFirebase(cfg);
    resetFirebaseForTest();
    const b = await initFirebase(cfg);
    // mock 의 initializeApp 가 호출될 때마다 새 객체 — 동일 객체 X
    expect(a).not.toBe(b);
  });
});
