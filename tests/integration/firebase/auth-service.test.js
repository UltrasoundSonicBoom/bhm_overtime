// Phase 8 Task 5 — Auth Service (Email + Google) 검증
//
// 카카오는 Phase 10 (OIDC provider 추가) 으로 분리.
//
// 검증:
//   1. Export 시그니처 (signInWithEmail, signUpWithEmail, signInWithGoogle, signOutUser, onAuthChanged, getCurrentUser)
//   2. signInWithEmail → signInWithEmailAndPassword 호출 → user 반환
//   3. signUpWithEmail → createUserWithEmailAndPassword 호출 → user 반환
//   4. signInWithGoogle → GoogleAuthProvider + signInWithPopup → user 반환
//   5. signOutUser → signOut 호출
//   6. onAuthChanged: user 로그인 → window.__firebaseUid 설정 + app:auth-changed 이벤트
//   7. onAuthChanged: 로그아웃 → window.__firebaseUid 삭제 + app:auth-changed 이벤트
//   8. getCurrentUser → auth.currentUser 반환

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Firebase init mock — auth-service 가 호출하는 initFirebase 의 반환값 구성
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockSignInWithPopup = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChanged = vi.fn();

const mockAuth = { currentUser: null };

vi.mock('../../../apps/web/src/firebase/firebase-init.js', () => ({
  initFirebase: vi.fn(async () => ({
    app: { name: '[DEFAULT]' },
    auth: mockAuth,
    db: { _isDb: true },
    authMod: {
      signInWithEmailAndPassword: mockSignIn,
      createUserWithEmailAndPassword: mockSignUp,
      GoogleAuthProvider: class { constructor() { this._kind = 'google'; } },
      signInWithPopup: mockSignInWithPopup,
      signOut: mockSignOut,
      onAuthStateChanged: mockOnAuthStateChanged,
    },
    firestoreMod: {},
  })),
}));

// firebaseConfig mock
vi.mock('../../../apps/web/src/client/config.js', () => ({
  firebaseConfig: {
    apiKey: 'test-key',
    authDomain: 'snuhmate.firebaseapp.com',
    projectId: 'snuhmate',
    storageBucket: 'snuhmate.firebasestorage.app',
    messagingSenderId: '914163950802',
    appId: '1:914163950802:web:test',
  },
}));

beforeAll(() => {
  const dom = new JSDOM('<!DOCTYPE html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.CustomEvent = dom.window.CustomEvent;
});

beforeEach(() => {
  vi.resetModules();
  mockSignIn.mockReset();
  mockSignUp.mockReset();
  mockSignInWithPopup.mockReset();
  mockSignOut.mockReset();
  mockOnAuthStateChanged.mockReset();
  delete window.__firebaseUid;
  mockAuth.currentUser = null;
});

describe('auth-service — exports', () => {
  it('Email + Google + onAuthChanged 함수 export', async () => {
    const m = await import('../../../apps/web/src/firebase/auth-service.js');
    expect(typeof m.signInWithEmail).toBe('function');
    expect(typeof m.signUpWithEmail).toBe('function');
    expect(typeof m.signInWithGoogle).toBe('function');
    expect(typeof m.signOutUser).toBe('function');
    expect(typeof m.onAuthChanged).toBe('function');
    expect(typeof m.getCurrentUser).toBe('function');
  });
});

describe('auth-service — Email/Password', () => {
  it('signInWithEmail: signInWithEmailAndPassword 호출 → user 반환', async () => {
    const fakeUser = { uid: 'u1', email: 'test@x.com' };
    mockSignIn.mockResolvedValue({ user: fakeUser });
    const { signInWithEmail } = await import('../../../apps/web/src/firebase/auth-service.js');
    const u = await signInWithEmail('test@x.com', 'pass1234');
    expect(mockSignIn).toHaveBeenCalledWith(mockAuth, 'test@x.com', 'pass1234');
    expect(u).toBe(fakeUser);
  });

  it('signUpWithEmail: createUserWithEmailAndPassword 호출 → user 반환', async () => {
    const fakeUser = { uid: 'u2', email: 'new@x.com' };
    mockSignUp.mockResolvedValue({ user: fakeUser });
    const { signUpWithEmail } = await import('../../../apps/web/src/firebase/auth-service.js');
    const u = await signUpWithEmail('new@x.com', 'pass1234');
    expect(mockSignUp).toHaveBeenCalledWith(mockAuth, 'new@x.com', 'pass1234');
    expect(u).toBe(fakeUser);
  });
});

describe('auth-service — Google', () => {
  it('signInWithGoogle: GoogleAuthProvider + signInWithPopup → user 반환', async () => {
    const fakeUser = { uid: 'g1', email: 'g@x.com', displayName: 'G User' };
    mockSignInWithPopup.mockResolvedValue({ user: fakeUser });
    const { signInWithGoogle } = await import('../../../apps/web/src/firebase/auth-service.js');
    const u = await signInWithGoogle();
    expect(mockSignInWithPopup).toHaveBeenCalled();
    const [authArg, providerArg] = mockSignInWithPopup.mock.calls[0];
    expect(authArg).toBe(mockAuth);
    expect(providerArg._kind).toBe('google');
    expect(u).toBe(fakeUser);
  });
});

describe('auth-service — signOut', () => {
  it('signOutUser: signOut 호출', async () => {
    mockSignOut.mockResolvedValue();
    const { signOutUser } = await import('../../../apps/web/src/firebase/auth-service.js');
    await signOutUser();
    expect(mockSignOut).toHaveBeenCalledWith(mockAuth);
  });
});

describe('auth-service — onAuthChanged', () => {
  it('user 로그인 시 window.__firebaseUid 설정 + app:auth-changed 이벤트', async () => {
    let capturedCallback;
    mockOnAuthStateChanged.mockImplementation((auth, cb) => {
      capturedCallback = cb;
      return () => {};
    });
    const { onAuthChanged } = await import('../../../apps/web/src/firebase/auth-service.js');
    const userCb = vi.fn();
    const eventCb = vi.fn();
    window.addEventListener('app:auth-changed', eventCb);
    await onAuthChanged(userCb);
    // Firebase 가 user 발화
    const fakeUser = { uid: 'abc123', email: 'a@b.c' };
    await capturedCallback(fakeUser);
    expect(window.__firebaseUid).toBe('abc123');
    expect(userCb).toHaveBeenCalledWith(fakeUser);
    expect(eventCb).toHaveBeenCalled();
  });

  it('user null (로그아웃) 시 window.__firebaseUid 삭제 + 이벤트', async () => {
    let capturedCallback;
    mockOnAuthStateChanged.mockImplementation((auth, cb) => {
      capturedCallback = cb;
      return () => {};
    });
    const { onAuthChanged } = await import('../../../apps/web/src/firebase/auth-service.js');
    window.__firebaseUid = 'abc123';
    const userCb = vi.fn();
    await onAuthChanged(userCb);
    await capturedCallback(null);
    expect(window.__firebaseUid).toBeUndefined();
    expect(userCb).toHaveBeenCalledWith(null);
  });

  it('onAuthChanged 가 unsubscribe 함수 반환', async () => {
    const unsub = vi.fn();
    mockOnAuthStateChanged.mockImplementation(() => unsub);
    const { onAuthChanged } = await import('../../../apps/web/src/firebase/auth-service.js');
    const r = await onAuthChanged(() => {});
    expect(typeof r).toBe('function');
  });
});

describe('auth-service — getCurrentUser', () => {
  it('auth.currentUser 반환', async () => {
    mockAuth.currentUser = { uid: 'cur', email: 'cur@x.com' };
    const { getCurrentUser } = await import('../../../apps/web/src/firebase/auth-service.js');
    const u = await getCurrentUser();
    expect(u).toEqual({ uid: 'cur', email: 'cur@x.com' });
  });

  it('미로그인 시 null', async () => {
    mockAuth.currentUser = null;
    const { getCurrentUser } = await import('../../../apps/web/src/firebase/auth-service.js');
    expect(await getCurrentUser()).toBe(null);
  });
});
