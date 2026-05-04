// firebase/auth-ui.js — Phase 8 Task 5: 로그인 다이얼로그 + status pill
//
// XSS 회피: createElement + textContent + setAttribute only (innerHTML 금지).
// non-pushy: URL 파라미터 자동 오픈 금지, ESC 닫기, '취소' = 다이얼로그 닫기.
//
// 1차 provider: Email + Google. 카카오는 Phase 10 에서 추가.

import {
  signInWithEmail, signUpWithHospitalEmail, signInWithGoogle,
  signOutUser, onAuthChanged, getCurrentUser,
} from './auth-service.js';
import { validatePassword } from './auth-validators.js';

// validatePassword 는 단위 테스트를 위해 별도 모듈에서 정의. 외부 호환을 위해 re-export.
export { validatePassword };

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

// Google G 로고 SVG — DOM API만 사용 (innerHTML 금지)
function _googleIcon() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('aria-hidden', 'true');

  const paths = [
    { fill: '#4285F4', d: 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' },
    { fill: '#34A853', d: 'M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' },
    { fill: '#FBBC05', d: 'M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z' },
    { fill: '#EA4335', d: 'M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' },
  ];
  paths.forEach(({ fill, d }) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('fill', fill);
    p.setAttribute('d', d);
    svg.appendChild(p);
  });
  return svg;
}

function _buildDialog() {
  const overlay = _el('div', {
    id: DIALOG_ID,
    className: 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4',
  });

  // 디자인 시스템 card 패턴 (margin-bottom 없는 모달용)
  const panel = _el('div', {
    className: [
      'w-full max-w-[360px]',
      'bg-[var(--bg-card)]',
      'border border-[var(--border-glass)]',
      'rounded-[var(--radius-md)]',
      'shadow-[var(--shadow-md)]',
      'p-6',
    ].join(' '),
  });

  // 제목 (card-title 패턴)
  const titleRow = _el('div', { className: 'card-title mb-5' });
  titleRow.appendChild(_el('span', { className: 'icon indigo', text: '👤' }));
  titleRow.appendChild(_el('span', { text: 'SNUH 메이트 로그인' }));
  panel.appendChild(titleRow);

  // ── 병원 이메일 섹션 ──
  const emailGroup = _el('div', { className: 'form-group mb-2' });
  const emailIn = _el('input', {
    type: 'email', id: 'snuhmateEmail',
    placeholder: '병원 이메일 (예: hong@snuh.org)',
    autocomplete: 'email',
  });
  emailGroup.appendChild(emailIn);
  panel.appendChild(emailGroup);

  const passGroup = _el('div', { className: 'form-group mb-2' });
  const passIn = _el('input', {
    type: 'password', id: 'snuhmatePass',
    placeholder: '비밀번호 (8자 이상)',
    autocomplete: 'current-password',
  });
  passGroup.appendChild(passIn);
  panel.appendChild(passGroup);

  // 에러/성공 메시지 (인라인 색상 — JS 가 setMsg 로 덮어씀)
  const errEl = _el('p', {
    id: 'snuhmateAuthErr',
    className: 'text-xs mb-2 hidden',
  });
  panel.appendChild(errEl);

  // 이메일 버튼 (로그인 + 신규 가입) — full-width stacked
  const signInBtn = _el('button', {
    type: 'button', id: 'snuhmateSignInBtn',
    className: 'btn btn-primary btn-full mb-2',
    text: '이메일 로그인',
  });
  panel.appendChild(signInBtn);
  const signUpBtn = _el('button', {
    type: 'button', id: 'snuhmateSignUpBtn',
    className: 'btn btn-outline btn-full mb-4',
    text: '신규 가입',
  });
  panel.appendChild(signUpBtn);

  // 구분선 helper
  const _divider = () => {
    const row = _el('div', { className: 'flex items-center gap-3 mb-4' });
    row.appendChild(_el('div', { className: 'flex-1 h-px bg-[var(--border-glass)]' }));
    row.appendChild(_el('span', { className: 'text-xs text-[var(--text-muted)]', text: '또는' }));
    row.appendChild(_el('div', { className: 'flex-1 h-px bg-[var(--border-glass)]' }));
    return row;
  };
  panel.appendChild(_divider());

  // Google 로그인 버튼 (btn-secondary)
  const googleBtn = _el('button', {
    type: 'button', id: 'snuhmateGoogleBtn',
    className: 'btn btn-secondary btn-full mb-4',
  });
  googleBtn.appendChild(_googleIcon());
  googleBtn.appendChild(document.createTextNode(' Google 로 로그인'));
  panel.appendChild(googleBtn);

  // 구분선 2
  panel.appendChild(_divider());

  // 게스트로 계속 버튼
  const guestBtn = _el('button', {
    type: 'button', id: 'snuhmateGuestBtn',
    className: 'btn btn-outline btn-full mb-2',
    text: '게스트로 계속 (이 기기에만 저장)',
  });
  panel.appendChild(guestBtn);

  // 취소 버튼 (텍스트 링크)
  const closeBtn = _el('button', {
    type: 'button', id: 'snuhmateAuthClose',
    className: 'w-full mt-1 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer bg-transparent border-none',
    text: '취소',
  });
  panel.appendChild(closeBtn);

  overlay.appendChild(panel);

  // ── 이벤트 핸들러 ──
  const setMsg = (msg, isError, isOk) => {
    if (!msg) { errEl.textContent = ''; errEl.classList.add('hidden'); return; }
    errEl.textContent = msg;
    errEl.classList.remove('hidden');
    errEl.style.color = isOk
      ? 'var(--accent-emerald, #00b894)'
      : isError
        ? 'var(--color-status-error, #ef4444)'
        : 'var(--text-muted, #7a7a7a)';
  };
  const prettyErr = (e) => {
    const code = e?.code || '';
    if (code === 'auth/invalid-credential') return '이메일/비밀번호 불일치';
    if (code === 'auth/weak-password') return '비밀번호 8자 이상 12자 이하';
    if (code === 'auth/password-does-not-meet-requirements') return '비밀번호 정책 미충족 (8~12자)';
    if (code === 'auth/email-already-in-use') return '이미 가입된 이메일 — "이메일 로그인"을 사용해 주세요';
    if (code === 'auth/non-hospital-domain') return '병원 도메인 이메일만 가입할 수 있어요 (snuh.org, brmh.org, snubh.org 등)';
    if (code === 'auth/popup-closed-by-user') return '로그인 창이 닫힘';
    if (code === 'auth/invalid-email') return '이메일 형식 오류';
    return code || ('로그인 실패: ' + (e?.message || ''));
  };

  signInBtn.addEventListener('click', async () => {
    setMsg('');
    signInBtn.disabled = true;
    try {
      await signInWithEmail(emailIn.value.trim(), passIn.value);
      closeAuthDialog();
    } catch (e) { setMsg(prettyErr(e), true); }
    finally { signInBtn.disabled = false; }
  });

  signUpBtn.addEventListener('click', async () => {
    setMsg('');
    const pwErr = validatePassword(passIn.value);
    if (pwErr) { setMsg(pwErr, true); return; }
    signUpBtn.disabled = true;
    try {
      await signUpWithHospitalEmail(emailIn.value.trim(), passIn.value);
      setMsg('인증 메일을 보냈습니다! 메일함을 확인하고 링크를 클릭하면 자동으로 진입됩니다.', false, true);
      setTimeout(closeAuthDialog, 4000);
    } catch (e) { setMsg(prettyErr(e), true); }
    finally { signUpBtn.disabled = false; }
  });

  googleBtn.addEventListener('click', async () => {
    setMsg('');
    try { await signInWithGoogle(); closeAuthDialog(); }
    catch (e) { setMsg(prettyErr(e), true); }
  });

  guestBtn.addEventListener('click', closeAuthDialog);
  closeBtn.addEventListener('click', closeAuthDialog);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAuthDialog(); });

  return overlay;
}

// ── 헤더/SettingsIsland 의 status pill 업데이트 ──
export async function refreshAuthPill(pillEl) {
  if (!pillEl) return;
  const user = await getCurrentUser();
  if (user) {
    const name = user.displayName || user.email || '로그인됨';
    pillEl.textContent = name.length > 18 ? name.slice(0, 18) + '…' : name;
    // 로그인 상태: btn-secondary (색상 없음, 이름 표시)
    pillEl.className = 'btn btn-secondary';
    pillEl.dataset.signedIn = '1';
  } else {
    pillEl.textContent = '로그인';
    // 비로그인 상태: btn-primary (인디고 강조)
    pillEl.className = 'btn btn-primary';
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
