// firebase/auth-ui.js — Phase 8 Task 5: 로그인 다이얼로그 + status pill
//
// XSS 회피: createElement + textContent + setAttribute only (innerHTML 금지).
// non-pushy: URL 파라미터 자동 오픈 금지, ESC 닫기, '나중에' = flag 미설정.
//
// 1차 provider: Email + Google. 카카오는 Phase 10 에서 추가.

import {
  signInWithEmail, signUpWithEmail, signInWithGoogle, signOutUser, onAuthChanged, getCurrentUser,
} from './auth-service.js';

const DIALOG_ID = 'snuhmateAuthDialog';

export function openAuthDialog() {
  if (document.getElementById(DIALOG_ID)) return;
  const overlay = _buildDialog();
  document.body.appendChild(overlay);
  const onKey = (e) => { if (e.key === 'Escape') closeAuthDialog(); };
  document.addEventListener('keydown', onKey);
  overlay._onKey = onKey;
}

export function closeAuthDialog() {
  const el = document.getElementById(DIALOG_ID);
  if (!el) return;
  if (el._onKey) document.removeEventListener('keydown', el._onKey);
  el.remove();
}

function _el(tag, attrs, children) {
  const e = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') e.className = v;
      else if (k === 'text') e.textContent = v;
      else e.setAttribute(k, v);
    }
  }
  if (Array.isArray(children)) children.forEach(c => c && e.appendChild(c));
  else if (children) e.appendChild(children);
  return e;
}

function _buildDialog() {
  const overlay = _el('div', {
    id: DIALOG_ID,
    className: 'fixed inset-0 z-50 flex items-center justify-center bg-black/50',
  });
  const panel = _el('div', { className: 'bg-white rounded-lg p-6 max-w-sm w-full shadow-xl' });

  panel.appendChild(_el('h2', { className: 'text-lg font-semibold mb-4', text: 'SNUH 메이트 로그인' }));

  const googleBtn = _el('button', {
    type: 'button', id: 'snuhmateGoogleBtn',
    className: 'w-full mb-3 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50',
    text: 'Google 로 로그인',
  });
  panel.appendChild(googleBtn);

  panel.appendChild(_el('div', { className: 'text-xs text-gray-500 text-center my-3', text: '또는' }));

  const emailIn = _el('input', {
    type: 'email', id: 'snuhmateEmail', placeholder: '이메일',
    className: 'w-full mb-2 px-3 py-2 border border-gray-300 rounded',
  });
  const passIn = _el('input', {
    type: 'password', id: 'snuhmatePass', placeholder: '비밀번호 (6자 이상)',
    className: 'w-full mb-3 px-3 py-2 border border-gray-300 rounded',
  });
  panel.appendChild(emailIn);
  panel.appendChild(passIn);

  const signInBtn = _el('button', {
    type: 'button', id: 'snuhmateSignInBtn',
    className: 'w-full mb-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700',
    text: '이메일 로그인',
  });
  const signUpBtn = _el('button', {
    type: 'button', id: 'snuhmateSignUpBtn',
    className: 'w-full mb-3 px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50',
    text: '신규 가입',
  });
  panel.appendChild(signInBtn);
  panel.appendChild(signUpBtn);

  const errEl = _el('p', { id: 'snuhmateAuthErr', className: 'text-xs text-red-600 mb-2 hidden' });
  panel.appendChild(errEl);

  const closeBtn = _el('button', {
    type: 'button', id: 'snuhmateAuthClose',
    className: 'w-full px-4 py-2 text-gray-500 hover:text-gray-700',
    text: '취소',
  });
  panel.appendChild(closeBtn);

  overlay.appendChild(panel);

  const setErr = (msg) => {
    if (msg) { errEl.textContent = msg; errEl.classList.remove('hidden'); }
    else { errEl.textContent = ''; errEl.classList.add('hidden'); }
  };
  const prettyErr = (e) => {
    const code = e?.code || '';
    if (code === 'auth/invalid-credential') return '이메일/비밀번호 불일치';
    if (code === 'auth/weak-password') return '비밀번호 6자 이상';
    if (code === 'auth/email-already-in-use') return '이미 가입된 이메일 — 로그인 시도';
    if (code === 'auth/popup-closed-by-user') return '로그인 창이 닫힘';
    if (code === 'auth/invalid-email') return '이메일 형식 오류';
    return code || ('로그인 실패: ' + (e?.message || ''));
  };

  googleBtn.addEventListener('click', async () => {
    setErr('');
    try { await signInWithGoogle(); closeAuthDialog(); }
    catch (e) { setErr(prettyErr(e)); }
  });
  signInBtn.addEventListener('click', async () => {
    setErr('');
    try { await signInWithEmail(emailIn.value.trim(), passIn.value); closeAuthDialog(); }
    catch (e) { setErr(prettyErr(e)); }
  });
  signUpBtn.addEventListener('click', async () => {
    setErr('');
    try { await signUpWithEmail(emailIn.value.trim(), passIn.value); closeAuthDialog(); }
    catch (e) { setErr(prettyErr(e)); }
  });
  closeBtn.addEventListener('click', closeAuthDialog);

  return overlay;
}

// ── 헤더/SettingsIsland 의 status pill 업데이트 ──
export async function refreshAuthPill(pillEl) {
  if (!pillEl) return;
  const user = await getCurrentUser();
  if (user) {
    pillEl.textContent = user.email || (user.displayName || '로그인됨');
    pillEl.dataset.signedIn = '1';
  } else {
    pillEl.textContent = '로그인';
    pillEl.dataset.signedIn = '0';
  }
}

export async function logout() {
  await signOutUser();
}

// ── pill 자동 업데이트: onAuthChanged 구독 ──
// SettingsIsland 가 1회 호출 — auth state 변화 시 pill 자동 갱신
export function bindAuthPill(pillEl) {
  refreshAuthPill(pillEl);
  onAuthChanged(() => refreshAuthPill(pillEl));
}
