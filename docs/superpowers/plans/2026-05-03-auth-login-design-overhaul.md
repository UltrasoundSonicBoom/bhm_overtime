# Auth & Login Design Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify auth UI across onboarding card 9 and /app login dialog — apply design system tokens to cards 8–9, add hospital-email sign-in mode, reorder dialog to 병원이메일 → Google → Guest, and verify the full Firebase email-auth flow against `20842@brmh.org`.

**Architecture:**
- Card 9 tiles get neo-brutalist design tokens (dark border + offset shadow) from `globals.css` variables that are already available on the page via `BaseLayout`.
- Card 9 email panel gains a sign-in / sign-up mode toggle so users don't need a separate step.
- `/app` auth dialog is restructured: hospital email section first, Google second, Guest (close) third — matching the screenshot the user provided.
- Firebase CLI verifies user creation after Playwright drives the form.

**Tech Stack:** Astro, vanilla JS (ESM), Firebase Auth v12, globals.css CSS variables, Playwright MCP

---

## File Map

| File | Change |
|------|--------|
| `apps/web/public/styles/onboarding.css` | Task 1 — design tokens on `.ob-tile`, `.ob-auth-panel`, mode-toggle styles |
| `apps/web/src/pages/index.astro` lines 417–428 | Task 2 — add mode-toggle HTML to email panel |
| `apps/web/public/client/onboarding.js` lines 185–317 | Task 2 — sign-in mode handler |
| `apps/web/src/firebase/auth-ui.js` | Task 3 — restructure dialog layout (email → Google → Guest) |

---

## Task 1: Apply Design System Tokens to Card 9 Tiles + Auth Panel (onboarding.css)

**Files:**
- Modify: `apps/web/public/styles/onboarding.css` lines 403–500 (`.ob-tile`), 715–760 (`.ob-auth-panel`)

Globals.css is imported via `BaseLayout` so variables like `--border-glass`, `--shadow-sm`, `--shadow-md`, `--radius-md`, `--bg-card`, `--bg-glass`, `--accent-indigo` are already available on the onboarding page.

- [ ] **Step 1: Replace `.ob-tile` with design-system-aligned styles**

In `apps/web/public/styles/onboarding.css`, replace the block starting at `.ob-tile {` (line ~403):

```css
.ob-tile {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--bg-card, #ffffff);
  color: var(--text-primary, #1a1a1a);
  border: 2px solid var(--border-glass, #1a1a1a);
  box-shadow: var(--shadow-sm, 2px 2px 0px #1a1a1a);
  border-radius: var(--radius-md, 12px);
  padding: 16px 20px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.12s, box-shadow 0.12s;
  width: 100%;
  min-height: 76px;
  font-family: inherit;
}
.ob-tile:hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-md, 4px 4px 0px #1a1a1a);
}
.ob-tile.picked {
  background: var(--border-glass, #1a1a1a);
  color: #ffffff;
  border-color: var(--border-glass, #1a1a1a);
  box-shadow: var(--shadow-md, 4px 4px 0px #1a1a1a);
  transform: translate(-1px, -1px);
}
.ob-ink .ob-tile {
  background: rgba(255, 255, 255, 0.07);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.35);
  box-shadow: 2px 2px 0px rgba(255,255,255,0.2);
}
.ob-ink .ob-tile.picked {
  background: #ffffff;
  color: #1a1a1a;
}
```

- [ ] **Step 2: Update `.ob-auth-panel` to use design-system card style**

Replace the block starting at `.ob-auth-panel {` (line ~715):

```css
.ob-auth-panel {
  margin-top: 14px;
  padding: 14px;
  border-radius: var(--radius-md, 12px);
  border: 2px solid var(--border-glass, #1a1a1a);
  box-shadow: var(--shadow-sm, 2px 2px 0px #1a1a1a);
  background: var(--bg-card, #ffffff);
  display: none;
  flex-direction: column;
  gap: 8px;
}
.ob-auth-panel.on { display: flex; }
.ob-auth-panel input {
  width: 100%;
  padding: 9px 10px;
  font-size: 15px;
  font-family: "Noto Sans KR", "Inter", sans-serif;
  border: 1.5px solid var(--border-glass, rgba(0,0,0,0.16));
  border-radius: var(--radius-sm, 8px);
  background: var(--bg-glass, rgba(255,255,255,0.7));
  outline: none;
  color: var(--text-primary, #1a1a1a);
}
.ob-auth-panel input:focus {
  border-color: var(--accent-indigo, #6c5ce7);
  background: var(--bg-glass-hover, #ede7d3);
}
```

- [ ] **Step 3: Add mode-toggle CSS (new block after `.ob-auth-panel`)**

Append after the `.ob-auth-panel` block:

```css
/* Auth mode toggle (신규 가입 / 이미 가입함) */
.ob-auth-mode-row {
  display: flex;
  gap: 4px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  padding: 3px;
}
.ob-auth-mode {
  flex: 1;
  padding: 5px 8px;
  border-radius: 6px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  color: var(--text-muted, #6b7280);
  font-family: "Noto Sans KR", "Inter", sans-serif;
  transition: background 0.15s, color 0.15s;
}
.ob-auth-mode.active {
  background: var(--bg-card, #ffffff);
  color: var(--text-primary, #1a1a1a);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}
```

- [ ] **Step 4: Update `.ob-pf-grid input, .ob-pf-grid select` (card 8) to use design tokens**

Replace the existing block (line ~586–603):

```css
.ob-pf-grid input,
.ob-pf-grid select {
  width: 100%;
  height: 40px;
  padding: 0 10px;
  font-size: 15px;
  font-family: "Noto Sans KR", "Inter", sans-serif;
  font-weight: 500;
  border: 1.5px solid var(--border-glass, rgba(0, 0, 0, 0.16));
  border-radius: var(--radius-sm, 8px);
  background: var(--bg-glass, rgba(255, 255, 255, 0.7));
  color: inherit;
  outline: none;
  transition: border-color 0.18s ease;
  box-sizing: border-box;
  appearance: none;
  -webkit-appearance: none;
}
.ob-pf-grid input:focus,
.ob-pf-grid select:focus {
  border-color: var(--accent-indigo, #6c5ce7);
  background: var(--bg-glass-hover, #ede7d3);
}
```

- [ ] **Step 5: Start dev server and visual-check card 9 tiles look neo-brutalist**

```bash
pnpm --filter @snuhmate/web dev &
```

Open `http://localhost:4321/` in browser, navigate to slide 9, verify tiles have dark borders and offset shadows.

---

## Task 2: Add Sign-In Mode Toggle to Card 9 Email Panel

**Files:**
- Modify: `apps/web/src/pages/index.astro` (lines 417–428 — email panel HTML)
- Modify: `apps/web/public/client/onboarding.js` (lines 185–317 — auth slide JS)

- [ ] **Step 1: Add mode-toggle row to email panel HTML in index.astro**

Replace the `<div class="ob-auth-panel" ...>` block (lines 417–428) with:

```html
<!-- 병원 이메일 가입/로그인 패널 (data-choice="email" 선택 시 펼침) -->
<div class="ob-auth-panel" id="obAuthEmailPanel" aria-hidden="true">
  <div class="ob-auth-mode-row">
    <button type="button" class="ob-auth-mode active" id="obAuthModeSignup">신규 가입</button>
    <button type="button" class="ob-auth-mode" id="obAuthModeSignin">이미 가입함</button>
  </div>
  <input type="email" name="email" id="obAuthEmail" placeholder="병원 이메일 (예: hong@snuh.org)" autocomplete="email" list="obAuthDomainList">
  <datalist id="obAuthDomainList"></datalist>
  <input type="password" name="password" id="obAuthPassword" placeholder="비밀번호 (8~12자)" autocomplete="new-password">
  <div class="ob-auth-domains">허용 도메인: snuh.org · brmh.org · snubh.org · snudh.org · ntrh.or.kr</div>
  <div class="ob-auth-msg" id="obAuthMsg"></div>
  <div class="ob-auth-actions">
    <button type="button" class="ob-auth-ghost" id="obAuthCancel">취소</button>
    <button type="button" class="ob-auth-primary" id="obAuthSubmit">인증 메일 받기</button>
  </div>
</div>
```

- [ ] **Step 2: Add mode-toggle logic at the top of the auth slide section in onboarding.js**

After line 191 (`const authCancel = ...`), add:

```js
  const modeSignupBtn = document.getElementById('obAuthModeSignup');
  const modeSigninBtn = document.getElementById('obAuthModeSignin');
  let _signInMode = false;

  modeSignupBtn?.addEventListener('click', () => {
    _signInMode = false;
    modeSignupBtn.classList.add('active');
    modeSigninBtn?.classList.remove('active');
    if (passInput) passInput.placeholder = '비밀번호 (8~12자)';
    if (passInput) passInput.autocomplete = 'new-password';
    if (authSubmit) authSubmit.textContent = '인증 메일 받기';
  });
  modeSigninBtn?.addEventListener('click', () => {
    _signInMode = true;
    modeSigninBtn.classList.add('active');
    modeSignupBtn?.classList.remove('active');
    if (passInput) passInput.placeholder = '비밀번호';
    if (passInput) passInput.autocomplete = 'current-password';
    if (authSubmit) authSubmit.textContent = '로그인';
  });
```

- [ ] **Step 3: Replace `authSubmit` click handler to branch on `_signInMode`**

Replace the `authSubmit?.addEventListener('click', ...)` block (lines 260–317) with:

```js
  authSubmit?.addEventListener('click', async () => {
    const email = (emailInput?.value || '').trim();
    const password = passInput?.value || '';

    if (!email || !password) {
      setAuthMsg('이메일과 비밀번호를 입력해 주세요.', 'error');
      return;
    }

    if (_signInMode) {
      // ── 로그인 흐름 ──
      authSubmit.disabled = true;
      setAuthMsg('로그인 중...', null);
      try {
        const mod = await import('/src/firebase/auth-service.js');
        await mod.signInWithEmail(email, password);
        enterApp();
      } catch (err) {
        console.warn('[onboarding] email sign-in failed', err);
        const code = err?.code || '';
        let msg = '로그인 실패. 이메일/비밀번호를 확인해 주세요.';
        if (code === 'auth/invalid-credential') msg = '이메일/비밀번호가 맞지 않아요.';
        if (code === 'auth/too-many-requests') msg = '잠시 후 다시 시도해 주세요.';
        setAuthMsg(msg, 'error');
      } finally {
        authSubmit.disabled = false;
      }
      return;
    }

    // ── 신규 가입 흐름 ──
    if (!isHospitalEmail(email)) {
      setAuthMsg('병원 도메인 이메일만 가입할 수 있어요 (snuh.org, brmh.org, snubh.org, snudh.org, ntrh.or.kr).', 'error');
      return;
    }
    if (password.length < 8 || password.length > 12) {
      setAuthMsg('비밀번호는 8~12자입니다.', 'error');
      return;
    }
    authSubmit.disabled = true;
    setAuthMsg('인증 메일을 보내는 중...', null);
    try {
      const mod = await import('/src/firebase/auth-service.js');
      await mod.signUpWithHospitalEmail(email, password);
      setAuthMsg('인증 메일을 보냈습니다. 메일함을 확인하고 인증한 뒤 이 페이지를 새로고침하면 자동으로 진입됩니다.', 'ok');
    } catch (err) {
      console.warn('[onboarding] hospital email signup failed', err);
      let msg = `가입 실패: ${err?.message || '다시 시도해 주세요'}`;
      if (err?.code === 'auth/email-already-in-use') {
        // 기가입자: 로그인 탭으로 전환 안내
        msg = '이미 가입된 이메일이에요. "이미 가입함" 탭에서 로그인해 주세요.';
        modeSigninBtn?.click(); // 자동으로 로그인 탭으로 전환
      }
      if (err?.code === 'auth/weak-password') msg = '비밀번호가 너무 약해요. 8자 이상으로 만들어 주세요.';
      if (err?.code === 'auth/invalid-email') msg = '이메일 형식이 올바르지 않아요.';
      if (err?.code === 'auth/network-request-failed') msg = '네트워크 오류. 잠시 후 다시 시도해 주세요.';
      setAuthMsg(msg, 'error');
    } finally {
      authSubmit.disabled = false;
    }
  });
```

- [ ] **Step 4: Test the mode toggle**

Navigate to slide 9 in browser. Click "병원 이메일로 가입" tile. Verify:
- Email panel opens immediately ✓
- "신규 가입" tab is active by default
- Clicking "이미 가입함" switches placeholder to "비밀번호" and submit text to "로그인"
- Clicking "신규 가입" restores original state

- [ ] **Step 5: Commit**

```bash
git add apps/web/public/styles/onboarding.css apps/web/src/pages/index.astro apps/web/public/client/onboarding.js
git commit -m "feat(auth): apply design tokens to ob-tiles + sign-in mode toggle on card 9"
```

---

## Task 3: Restructure /app Auth Dialog (auth-ui.js)

**Files:**
- Modify: `apps/web/src/firebase/auth-ui.js` (entire `_buildDialog` function + import)

New order: 병원 이메일 section (email + password + 로그인/신규가입) → divider → Google → divider → Guest → 취소

- [ ] **Step 1: Update import to include `signUpWithHospitalEmail`**

Replace line 8–10 of `apps/web/src/firebase/auth-ui.js`:

```js
import {
  signInWithEmail, signUpWithEmail, signUpWithHospitalEmail, signInWithGoogle,
  signOutUser, onAuthChanged, getCurrentUser,
} from './auth-service.js';
```

- [ ] **Step 2: Replace the entire `_buildDialog()` function**

Replace `function _buildDialog() {` through `return overlay;` `}` with:

```js
function _buildDialog() {
  const overlay = _el('div', {
    id: DIALOG_ID,
    className: 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4',
  });

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
    placeholder: '비밀번호 (6자 이상)',
    autocomplete: 'current-password',
  });
  passGroup.appendChild(passIn);
  panel.appendChild(passGroup);

  // 에러/성공 메시지
  const errEl = _el('p', {
    id: 'snuhmateAuthErr',
    className: 'text-xs mb-2 hidden',
  });
  panel.appendChild(errEl);

  // 이메일 버튼 행 (로그인 + 신규 가입)
  const emailBtnRow = _el('div', { className: 'flex gap-2 mb-4' });
  const signInBtn = _el('button', {
    type: 'button', id: 'snuhmateSignInBtn',
    className: 'btn btn-primary flex-1',
    text: '이메일 로그인',
  });
  const signUpBtn = _el('button', {
    type: 'button', id: 'snuhmateSignUpBtn',
    className: 'btn btn-outline flex-1',
    text: '신규 가입',
  });
  emailBtnRow.appendChild(signInBtn);
  emailBtnRow.appendChild(signUpBtn);
  panel.appendChild(emailBtnRow);

  // 구분선 1
  const _divider = () => {
    const row = _el('div', { className: 'flex items-center gap-3 mb-4' });
    row.appendChild(_el('div', { className: 'flex-1 h-px bg-[var(--border-glass)]' }));
    row.appendChild(_el('span', { className: 'text-xs text-[var(--text-muted)]', text: '또는' }));
    row.appendChild(_el('div', { className: 'flex-1 h-px bg-[var(--border-glass)]' }));
    return row;
  };
  panel.appendChild(_divider());

  // Google 로그인 버튼
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

  // 취소 버튼
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
    if (code === 'auth/email-already-in-use') return '이미 가입된 이메일 — 이메일 로그인 사용';
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
```

- [ ] **Step 3: Run lint and check**

```bash
pnpm lint 2>&1 | tail -20
pnpm check 2>&1 | tail -20
```

Expected: 0 errors. If ESLint warns about unused `signUpWithEmail`, verify it's no longer called and remove from import.

- [ ] **Step 4: Open /app in browser and verify dialog layout**

Navigate to `http://localhost:4321/app`, open Settings tab, click 로그인 button. Verify:
- 병원 이메일 input at the top (placeholder: "병원 이메일 (예: hong@snuh.org)")
- 비밀번호 input below
- "이메일 로그인" (indigo/primary) + "신규 가입" (outline) side-by-side
- Divider → "Google 로 로그인" button
- Divider → "게스트로 계속" button
- "취소" text link at bottom

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/firebase/auth-ui.js
git commit -m "feat(auth): restructure login dialog — 병원이메일 → Google → Guest"
```

---

## Task 4: Test Hospital Email Verification with `20842@brmh.org`

**Goal:** Send a real Firebase verification email to `20842@brmh.org` and confirm the Firebase user is created. Cross-device sync verification requires manual inbox check.

- [ ] **Step 1: Ensure dev server is running**

```bash
curl -s http://localhost:4321/ | grep -c 'SNUH'
```

Expected output: `1` (server is up). If 0, start server:
```bash
pnpm --filter @snuhmate/web dev &
sleep 5
```

- [ ] **Step 2: Use Playwright MCP to navigate to onboarding**

```
browser_navigate: http://localhost:4321/
browser_snapshot → confirm slide 1 is visible (SNUH 메이트)
```

- [ ] **Step 3: Fill profile form (slide 8) via Playwright**

Navigate to slide 8 (개인정보). If the carousel prev/next buttons work:
```
browser_click: #ob-next (7 times to reach slide 8)
```

Fill required fields:
```
browser_fill_form: [name=name] → "테스트"
browser_fill_form: [name=employeeNumber] → "20842"
browser_fill_form: [name=department] → "간호부"
browser_select_option: [name=jobType] → "간호직"
```

Click next to reach slide 9:
```
browser_click: [data-action="pf-next"]
```

- [ ] **Step 4: Click hospital email tile and fill auth form**

On slide 9:
```
browser_click: [data-action="auth-pick"][data-choice="email"]
```

Wait 200ms for panel to open:
```
browser_wait_for: #obAuthEmailPanel.on
browser_fill_form: #obAuthEmail → "20842@brmh.org"
browser_fill_form: #obAuthPassword → "Test1234!"
browser_click: #obAuthSubmit
```

- [ ] **Step 5: Verify success message**

```
browser_snapshot → confirm "인증 메일을 보냈습니다" text is visible
browser_console_messages → confirm 0 errors (ignore firebase warnings)
```

- [ ] **Step 6: Verify user creation via Firebase CLI**

```bash
# Firebase CLI가 없으면 설치
which firebase || npm install -g firebase-tools

# 현재 프로젝트 확인
firebase projects:list 2>/dev/null | head -10

# Firebase Auth에서 사용자 확인 (emulator 아닌 프로덕션)
firebase auth:export --format=JSON /tmp/fb_users.json 2>/dev/null
cat /tmp/fb_users.json | python3 -c "
import json,sys
d=json.load(sys.stdin)
users=d.get('users',[])
match=[u for u in users if u.get('email','')=='20842@brmh.org']
print('Found:', len(match), 'user(s)')
if match: print(json.dumps(match[0], indent=2, ensure_ascii=False))
"
```

Expected: `Found: 1 user(s)` with `emailVerified: false` (before inbox verification).

> **Manual step for the user:** Check `20842@brmh.org` inbox for Firebase verification email. Click the link. Then reload `http://localhost:4321/app` — `onAuthChanged` fires with `emailVerified: true` and the user is automatically redirected into the app.

- [ ] **Step 7: Cross-device sync test setup**

After email is verified, open a second browser (or incognito) and sign in with the same credentials. Data entered on the first device should appear on the second via Firestore hydration (`hydrate()` in `auth-service.js`).

```bash
# Firestore에서 해당 uid 데이터 확인 (firebase CLI)
UID=$(cat /tmp/fb_users.json | python3 -c "
import json,sys
d=json.load(sys.stdin)
u=[x for x in d.get('users',[]) if x.get('email','')=='20842@brmh.org']
print(u[0]['localId'] if u else '')
")
echo "UID: $UID"
firebase firestore:get "users/$UID" 2>/dev/null || echo "Check Firebase Console for Firestore data"
```

---

## Task 5: Test Google Login

**Goal:** Verify Google OAuth popup opens and successfully authenticates.

> **Note:** Playwright MCP cannot complete the Google OAuth popup (Google detects automation). This test requires the user to interact manually.

- [ ] **Step 1: Verify Google button triggers popup**

```
browser_navigate: http://localhost:4321/app
browser_snapshot → confirm app loads
```

Open Settings tab → click 로그인 → click "Google 로 로그인":
```
browser_click: #snuhmateSettingTab (or equivalent settings tab button)
browser_click: #snuhmateAuthPill
browser_click: #snuhmateGoogleBtn
browser_wait_for: 500ms
browser_console_messages → confirm no errors before popup
```

> **Manual step for the user:** Complete the Google sign-in popup with your Google account. After completion, verify the auth pill updates to show your Google email in the settings tab.

- [ ] **Step 2: Verify onboarding Google tile**

```
browser_navigate: http://localhost:4321/
browser_click: #ob-next (8 times to reach slide 9)
browser_click: [data-action="auth-pick"][data-choice="google"]
browser_wait_for: 500ms
browser_console_messages → confirm "Google 로그인 중..." appears and popup fires (no errors)
```

---

## Task 6: Final Validation

- [ ] **Step 1: Run lint and type check**

```bash
pnpm lint 2>&1 | tail -20
pnpm check 2>&1 | tail -20
```

Expected: 0 errors.

- [ ] **Step 2: Run build**

```bash
pnpm --filter @snuhmate/web build 2>&1 | tail -30
```

Expected: build succeeds, 0 errors.

- [ ] **Step 3: Run smoke tests**

```bash
pnpm test:smoke 2>&1 | tail -40
```

Expected: all smoke tests pass (existing tests must not regress).

- [ ] **Step 4: Commit final validation**

```bash
git add -p
git commit -m "test(auth): validate auth dialog and card 9 smoke suite post-overhaul"
```

---

## Self-Review

**Spec coverage:**
- ✅ Task 0 (tiles design system): Tasks 1 applies tokens to `.ob-tile`, `.ob-auth-panel`, card 8 inputs
- ✅ Task 0 (immediate auth): Google and Guest already immediate; email panel opens inline (Task 2 adds sign-in)
- ✅ Task 1 (병원이메일→구글→Guest order): Task 3 reorders auth-ui.js dialog
- ✅ Task 2 (design match card9 ↔ /app): Both now use same `--bg-card`, `--border-glass`, `--shadow-md` tokens
- ✅ Task 3 (hospital email test): Task 4 walks through Playwright + Firebase CLI
- ✅ Task 4 (Google login test): Task 5 walks through Playwright + manual completion

**Type/name consistency:**
- `signUpWithHospitalEmail` imported and used in Task 3 (auth-ui.js) — matches export name in auth-service.js:38
- `signInWithEmail` used in Task 2 (onboarding.js) sign-in mode — matches auth-service.js:23
- `_signInMode` is a closure variable local to the IIFE — no collision
- `_divider()` helper is defined inside `_buildDialog()` — no collision

**Placeholder scan:** None found.
