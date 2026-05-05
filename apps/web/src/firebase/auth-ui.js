// firebase/auth-ui.js — Phase 8 Task 5: 로그인 다이얼로그 + status pill
//
// UX: 3버튼 시작 (이메일 / Google / 게스트) → 이메일 클릭 시 폼 펼침
// 이메일 로그인 실패(없는 계정) 시 자동 신규 가입 + 인증 메일 발송.
// XSS 회피: createElement + textContent + setAttribute only (innerHTML 금지).
// non-pushy: URL 파라미터 자동 오픈 금지, ESC 닫기, '취소' = 다이얼로그 닫기.

import {
  signInWithEmail, signUpWithEmail, signUpWithHospitalEmail, signInWithGoogle,
  signOutUser, onAuthChanged, getCurrentUser, resendVerificationEmail,
} from './auth-service.js';
import { validatePassword } from './auth-validators.js';

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
  const overlay = _el('div', { id: DIALOG_ID, className: 'auth-dialog-overlay' });

  const panel = _el('div', { className: 'auth-dialog-panel' });

  // 제목 — card-title 디자인 시스템 그대로
  const titleRow = _el('div', { className: 'card-title' });
  titleRow.appendChild(_el('span', { className: 'icon indigo', text: '👤' }));
  titleRow.appendChild(_el('span', { text: 'SNUH 메이트 로그인' }));
  panel.appendChild(titleRow);

  // 메시지 영역 — 상태에 따라 .is-error / .is-ok / .is-info 클래스 전환
  const msgEl = _el('p', { id: 'snuhmateAuthErr', className: 'auth-dialog-msg' });
  panel.appendChild(msgEl);

  // ── 이메일 펼침 폼 (처음엔 숨김) ──
  const emailForm = _el('div', { id: 'snuhmateEmailForm', className: 'hidden' });

  const emailGroup = _el('div', { className: 'auth-form-group' });
  const emailIn = _el('input', {
    type: 'email', id: 'snuhmateEmail',
    placeholder: '이메일 (예: hong@gmail.com)',
    autocomplete: 'email',
  });
  emailGroup.appendChild(emailIn);

  const passGroup = _el('div', { className: 'auth-form-group' });
  const passIn = _el('input', {
    type: 'password', id: 'snuhmatePass',
    placeholder: '비밀번호 (8~12자, 특수문자 포함)',
    autocomplete: 'current-password',
  });
  passGroup.appendChild(passIn);

  const submitBtn = _el('button', {
    type: 'button', id: 'snuhmateSubmitBtn',
    className: 'btn btn-primary btn-full',
    text: '로그인 / 가입',
  });
  const signInBtn = _el('button', {
    type: 'button', id: 'snuhmateSignInBtn',
    className: 'btn btn-secondary btn-full',
    text: '로그인',
  });
  const signUpBtn = _el('button', {
    type: 'button', id: 'snuhmateSignUpBtn',
    className: 'btn btn-outline btn-full',
    text: '가입',
  });
  const cancelEmailBtn = _el('button', {
    type: 'button', className: 'auth-dialog-link',
    text: '← 돌아가기',
  });

  emailForm.appendChild(emailGroup);
  emailForm.appendChild(passGroup);
  const emailBtnGroup = _el('div', { className: 'auth-dialog-btn-group' });
  emailBtnGroup.appendChild(signInBtn);
  emailBtnGroup.appendChild(signUpBtn);
  emailBtnGroup.appendChild(submitBtn);
  emailBtnGroup.appendChild(cancelEmailBtn);
  emailForm.appendChild(emailBtnGroup);
  panel.appendChild(emailForm);

  // ── 3개 메인 버튼 ──
  const mainBtns = _el('div', { id: 'snuhmateMainBtns', className: 'auth-dialog-btn-group' });

  const emailTriggerBtn = _el('button', {
    type: 'button', id: 'snuhmateEmailBtn',
    className: 'btn btn-primary btn-full',
    text: '이메일로 로그인 / 가입',
  });
  mainBtns.appendChild(emailTriggerBtn);

  const googleBtn = _el('button', {
    type: 'button', id: 'snuhmateGoogleBtn',
    className: 'btn btn-secondary btn-full',
  });
  googleBtn.appendChild(_googleIcon());
  googleBtn.appendChild(document.createTextNode(' Google로 로그인'));
  mainBtns.appendChild(googleBtn);

  mainBtns.appendChild(_el('div', { className: 'auth-dialog-divider' }));

  const guestBtn = _el('button', {
    type: 'button', id: 'snuhmateGuestBtn',
    className: 'btn btn-outline btn-full',
    text: '게스트로 계속 (이 기기에만 저장)',
  });
  mainBtns.appendChild(guestBtn);

  panel.appendChild(mainBtns);

  // 취소 (항상 하단)
  const closeBtn = _el('button', {
    type: 'button', id: 'snuhmateAuthClose',
    className: 'auth-dialog-link',
    text: '취소',
  });
  panel.appendChild(closeBtn);

  overlay.appendChild(panel);

  // ── 상태 helpers ──
  const setMsg = (msg, isError, isOk) => {
    msgEl.textContent = msg || '';
    msgEl.className = 'auth-dialog-msg';
    if (msg) {
      if (isOk) msgEl.classList.add('is-ok');
      else if (isError) msgEl.classList.add('is-error');
      else msgEl.classList.add('is-info');
    }
  };

  const openEmailForm = () => {
    mainBtns.classList.add('hidden');
    emailForm.classList.remove('hidden');
    setMsg('');
    emailIn.focus();
  };

  const closeEmailForm = () => {
    emailForm.classList.add('hidden');
    mainBtns.classList.remove('hidden');
    setMsg('');
  };

  const prettyErr = (code) => {
    if (code === 'auth/invalid-credential') return '이메일/비밀번호 불일치';
    if (code === 'auth/weak-password') return '비밀번호 8~12자 + 특수문자 포함';
    if (code === 'auth/password-does-not-meet-requirements') return '비밀번호 정책 미충족 (8~12자 + 영문자 + 숫자 + 특수문자, 예: Snuh1234!)';
    if (code === 'auth/email-already-in-use') return '이미 가입된 이메일이에요 — 비밀번호를 확인해 주세요';
    if (code === 'auth/popup-closed-by-user') return '로그인 창이 닫혔어요';
    if (code === 'auth/invalid-email') return '이메일 형식을 확인해 주세요';
    if (code === 'auth/too-many-requests') return '잠시 후 다시 시도해 주세요';
    if (code === 'auth/network-request-failed') return '네트워크 오류 — 연결을 확인해 주세요';
    return '오류: ' + (code || '다시 시도해 주세요');
  };

  // ── 이벤트 핸들러 ──

  emailTriggerBtn.addEventListener('click', openEmailForm);
  cancelEmailBtn.addEventListener('click', closeEmailForm);

  const readEmailCredentials = () => {
    const email = emailIn.value.trim();
    const password = passIn.value;
    if (!email || !password) {
      setMsg('이메일과 비밀번호를 입력해 주세요.', true);
      return null;
    }
    return { email, password };
  };

  signInBtn.addEventListener('click', async () => {
    const creds = readEmailCredentials();
    if (!creds) return;
    setMsg('로그인 중...', false);
    signInBtn.disabled = true;
    try {
      await signInWithEmail(creds.email, creds.password);
      closeAuthDialog();
    } catch (e) {
      setMsg(prettyErr(e?.code || ''), true);
    } finally {
      signInBtn.disabled = false;
    }
  });

  signUpBtn.addEventListener('click', async () => {
    const creds = readEmailCredentials();
    if (!creds) return;
    setMsg('가입 중...', false);
    signUpBtn.disabled = true;
    try {
      await signUpWithEmail(creds.email, creds.password);
      setMsg('가입 완료! 이메일 인증 후 로그인해 주세요.', false, true);
    } catch (e) {
      setMsg(prettyErr(e?.code || ''), true);
    } finally {
      signUpBtn.disabled = false;
    }
  });

  // 스마트 로그인: signIn 시도 → 없는 계정이면 자동 signUp + 인증 메일
  submitBtn.addEventListener('click', async () => {
    const creds = readEmailCredentials();
    if (!creds) return;
    const { email, password } = creds;

    setMsg('로그인 중...', false);
    submitBtn.disabled = true;
    try {
      // 1단계: 로그인 시도
      const user = await signInWithEmail(email, password);
      if (user && !user.emailVerified) {
        try { await resendVerificationEmail(); } catch {}
        setMsg('이메일 인증이 필요해요. 인증 메일을 다시 보냈어요 — 메일함과 스팸함을 확인해 주세요.', false, false);
        submitBtn.disabled = false;
        return;
      }
      closeAuthDialog();
    } catch (signInErr) {
      const code = signInErr?.code || '';
      // 2단계: 로그인 실패 → 없는 계정일 가능성 → 신규 가입 시도
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found') {
        const pwErr = validatePassword(password);
        if (pwErr) { setMsg(pwErr, true); submitBtn.disabled = false; return; }
        setMsg('가입 중...', false);
        try {
          const result = await signUpWithHospitalEmail(email, password);
          if (result?.verificationSent) {
            setMsg('가입 완료! 📧 인증 메일을 보냈어요. 메일함(스팸함/Gmail 프로모션 탭 포함)을 확인하고 링크를 클릭하면 로그인됩니다.', false, true);
          } else {
            setMsg('가입은 됐지만 인증 메일 발송에 실패했어요 — 잠시 후 다시 시도해 주세요.', true);
          }
        } catch (signUpErr) {
          const upCode = signUpErr?.code || '';
          if (upCode === 'auth/email-already-in-use') {
            // 이미 가입된 계정인데 비밀번호가 틀린 것
            setMsg('이메일/비밀번호가 맞지 않아요. 비밀번호를 확인해 주세요.', true);
          } else {
            setMsg(prettyErr(upCode), true);
          }
        }
      } else {
        setMsg(prettyErr(code), true);
      }
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Enter 키로 제출
  [emailIn, passIn].forEach(el => {
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitBtn.click(); });
  });

  googleBtn.addEventListener('click', async () => {
    setMsg('');
    try { await signInWithGoogle(); closeAuthDialog(); }
    catch (e) { setMsg(prettyErr(e?.code || ''), true); }
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
    pillEl.className = 'btn btn-secondary';
    pillEl.dataset.signedIn = '1';
  } else {
    pillEl.textContent = '로그인';
    pillEl.className = 'btn btn-primary';
    pillEl.dataset.signedIn = '0';
  }
}

export async function logout() {
  await signOutUser();
}

export function bindAuthPill(pillEl) {
  refreshAuthPill(pillEl);
  onAuthChanged(() => refreshAuthPill(pillEl));
}
