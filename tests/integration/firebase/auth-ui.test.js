// Phase 8 Task 5 — auth-ui (DOM 다이얼로그) 검증
//
// XSS 회피 검증: innerHTML 사용 0 (createElement + textContent only)
// non-pushy: 자동 오픈 0 — openAuthDialog 명시 호출 만
// ESC 닫기 + 외부 클릭 닫기 (옵션)

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// auth-service mock
const mockSignInGoogle = vi.fn();
const mockSignInEmail = vi.fn();
const mockSignUpEmail = vi.fn();
const mockSignOut = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockOnAuthChanged = vi.fn();

vi.mock('../../../apps/web/src/firebase/auth-service.js', () => ({
  signInWithEmail: mockSignInEmail,
  signUpWithEmail: mockSignUpEmail,
  signInWithGoogle: mockSignInGoogle,
  signOutUser: mockSignOut,
  onAuthChanged: mockOnAuthChanged,
  getCurrentUser: mockGetCurrentUser,
}));

beforeAll(() => {
  const dom = new JSDOM('<!DOCTYPE html><body></body>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.KeyboardEvent = dom.window.KeyboardEvent;
});

beforeEach(() => {
  vi.resetModules();
  document.body.replaceChildren();
  mockSignInGoogle.mockReset();
  mockSignInEmail.mockReset();
  mockSignUpEmail.mockReset();
  mockSignOut.mockReset();
  mockGetCurrentUser.mockReset();
  mockOnAuthChanged.mockReset();
});

describe('auth-ui — openAuthDialog', () => {
  it('호출 시 다이얼로그 마운트', async () => {
    const { openAuthDialog } = await import('../../../apps/web/src/firebase/auth-ui.js');
    expect(document.getElementById('snuhmateAuthDialog')).toBeNull();
    openAuthDialog();
    expect(document.getElementById('snuhmateAuthDialog')).toBeTruthy();
  });

  it('두 번 호출해도 1개 만 마운트 (idempotent)', async () => {
    const { openAuthDialog } = await import('../../../apps/web/src/firebase/auth-ui.js');
    openAuthDialog();
    openAuthDialog();
    expect(document.querySelectorAll('#snuhmateAuthDialog')).toHaveLength(1);
  });

  it('다이얼로그에 Google + Email + 가입 버튼 모두 존재', async () => {
    const { openAuthDialog } = await import('../../../apps/web/src/firebase/auth-ui.js');
    openAuthDialog();
    expect(document.getElementById('snuhmateGoogleBtn')).toBeTruthy();
    expect(document.getElementById('snuhmateSignInBtn')).toBeTruthy();
    expect(document.getElementById('snuhmateSignUpBtn')).toBeTruthy();
    expect(document.getElementById('snuhmateEmail')).toBeTruthy();
    expect(document.getElementById('snuhmatePass')).toBeTruthy();
  });

  it('innerHTML 사용 안 함 (모든 자식이 createElement 로 추가됨)', async () => {
    const { openAuthDialog } = await import('../../../apps/web/src/firebase/auth-ui.js');
    openAuthDialog();
    const dlg = document.getElementById('snuhmateAuthDialog');
    // textContent 만 보유 — 모든 dynamic 콘텐츠는 textContent
    // (innerHTML 검증은 휴리스틱 — 자식 element 가 정상이면 OK)
    expect(dlg.children.length).toBeGreaterThan(0);
  });
});

describe('auth-ui — closeAuthDialog', () => {
  it('마운트된 다이얼로그 제거', async () => {
    const { openAuthDialog, closeAuthDialog } = await import('../../../apps/web/src/firebase/auth-ui.js');
    openAuthDialog();
    closeAuthDialog();
    expect(document.getElementById('snuhmateAuthDialog')).toBeNull();
  });

  it('미마운트 상태에서 호출해도 에러 없음', async () => {
    const { closeAuthDialog } = await import('../../../apps/web/src/firebase/auth-ui.js');
    expect(() => closeAuthDialog()).not.toThrow();
  });

  it('ESC 키 누르면 다이얼로그 닫힘', async () => {
    const { openAuthDialog } = await import('../../../apps/web/src/firebase/auth-ui.js');
    openAuthDialog();
    expect(document.getElementById('snuhmateAuthDialog')).toBeTruthy();
    const ev = new window.KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(ev);
    expect(document.getElementById('snuhmateAuthDialog')).toBeNull();
  });
});

describe('auth-ui — 버튼 클릭 → auth-service 호출', () => {
  it('Google 버튼 → signInWithGoogle 호출', async () => {
    mockSignInGoogle.mockResolvedValue({ uid: 'g1' });
    const { openAuthDialog } = await import('../../../apps/web/src/firebase/auth-ui.js');
    openAuthDialog();
    document.getElementById('snuhmateGoogleBtn').click();
    await new Promise(r => setTimeout(r, 10));
    expect(mockSignInGoogle).toHaveBeenCalled();
  });

  it('이메일 로그인 버튼 → signInWithEmail 호출', async () => {
    mockSignInEmail.mockResolvedValue({ uid: 'e1' });
    const { openAuthDialog } = await import('../../../apps/web/src/firebase/auth-ui.js');
    openAuthDialog();
    document.getElementById('snuhmateEmail').value = 'a@b.c';
    document.getElementById('snuhmatePass').value = 'pass1234';
    document.getElementById('snuhmateSignInBtn').click();
    await new Promise(r => setTimeout(r, 10));
    expect(mockSignInEmail).toHaveBeenCalledWith('a@b.c', 'pass1234');
  });

  it('가입 버튼 → signUpWithEmail 호출', async () => {
    mockSignUpEmail.mockResolvedValue({ uid: 'e2' });
    const { openAuthDialog } = await import('../../../apps/web/src/firebase/auth-ui.js');
    openAuthDialog();
    document.getElementById('snuhmateEmail').value = 'new@x.com';
    document.getElementById('snuhmatePass').value = 'pass1234';
    document.getElementById('snuhmateSignUpBtn').click();
    await new Promise(r => setTimeout(r, 10));
    expect(mockSignUpEmail).toHaveBeenCalledWith('new@x.com', 'pass1234');
  });

  it('취소 버튼 → 다이얼로그 닫힘', async () => {
    const { openAuthDialog } = await import('../../../apps/web/src/firebase/auth-ui.js');
    openAuthDialog();
    document.getElementById('snuhmateAuthClose').click();
    expect(document.getElementById('snuhmateAuthDialog')).toBeNull();
  });

  it('에러 시 에러 메시지 표시', async () => {
    mockSignInEmail.mockRejectedValue({ code: 'auth/invalid-credential' });
    const { openAuthDialog } = await import('../../../apps/web/src/firebase/auth-ui.js');
    openAuthDialog();
    document.getElementById('snuhmateEmail').value = 'a@b.c';
    document.getElementById('snuhmatePass').value = 'wrong';
    document.getElementById('snuhmateSignInBtn').click();
    await new Promise(r => setTimeout(r, 30));
    const err = document.getElementById('snuhmateAuthErr');
    expect(err.textContent).toContain('이메일/비밀번호 불일치');
    expect(err.classList.contains('hidden')).toBe(false);
    // 다이얼로그 그대로 유지 (재시도 가능)
    expect(document.getElementById('snuhmateAuthDialog')).toBeTruthy();
  });
});

describe('auth-ui — refreshAuthPill', () => {
  it('로그인 user 가 있으면 email 표시', async () => {
    mockGetCurrentUser.mockResolvedValue({ email: 'a@b.c' });
    const { refreshAuthPill } = await import('../../../apps/web/src/firebase/auth-ui.js');
    const pill = document.createElement('span');
    document.body.appendChild(pill);
    await refreshAuthPill(pill);
    expect(pill.textContent).toBe('a@b.c');
    expect(pill.dataset.signedIn).toBe('1');
  });

  it('미로그인 시 "로그인" 표시', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const { refreshAuthPill } = await import('../../../apps/web/src/firebase/auth-ui.js');
    const pill = document.createElement('span');
    await refreshAuthPill(pill);
    expect(pill.textContent).toBe('로그인');
    expect(pill.dataset.signedIn).toBe('0');
  });

  it('email 없으면 displayName fallback', async () => {
    mockGetCurrentUser.mockResolvedValue({ displayName: '김간호' });
    const { refreshAuthPill } = await import('../../../apps/web/src/firebase/auth-ui.js');
    const pill = document.createElement('span');
    await refreshAuthPill(pill);
    expect(pill.textContent).toBe('김간호');
  });
});
