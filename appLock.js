// ============================================================
// appLock.js — 앱 잠금 모듈 (PIN + WebAuthn 생체인증)
// Layer 1: 기기 접근 보호. Google 로그인(데이터 신원)과 완전 분리.
// ============================================================
// API:
//   window.AppLock.setupPin(pin)              — PIN 설정 (4-6자리)
//   window.AppLock.verifyPin(pin)             — PIN 검증
//   window.AppLock.changePin(oldPin, newPin)  — PIN 변경
//   window.AppLock.disablePin()               — PIN 잠금 해제
//   window.AppLock.isEnabled()                — 잠금 활성화 여부
//   window.AppLock.isUnlocked()               — 현재 세션 잠금 해제 여부
//   window.AppLock.unlock()                   — 잠금 해제
//   window.AppLock.lock()                     — 강제 잠금
//   window.AppLock.checkAndPrompt()           — 페이지 로드 시 잠금 확인
//   window.AppLock.resetViaReauth(cb)         — PIN 분실 → Google 재인증 재설정
//   window.AppLock._showPinSetupModal(cb)     — PIN 설정 모달 표시
//   window.AppLock.BiometricLock.*            — 생체인증 서브모듈
// ============================================================

export const AppLock = (function () {
  'use strict';

  // ── 상수 ──
  var MAX_FAIL = 5;
  var LOCKOUT_MS = 5 * 60 * 1000; // 5분
  var PIN_MIN = 4;
  var PIN_MAX = 6;
  var OVERLAY_ID = 'appLockOverlay';

  // ── 인메모리 상태 ──
  var _unlocked = false;

  // ── 로컬 UID (auth 독립) ──
  // AppLock 은 기기 로컬 잠금 기능이므로 Google/Neon/Supabase 신원에 의존하지 않는다.
  // WebAuthn user.id 등에 사용할 안정적 식별자가 필요할 때만 호출.
  function _getLocalUid() {
    var uid = null;
    try { uid = localStorage.getItem('bhm_local_uid'); } catch (e) { /* noop */ }
    if (!uid) {
      uid = (crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : ('u-' + Date.now() + '-' + Math.random().toString(36).slice(2));
      try { localStorage.setItem('bhm_local_uid', uid); } catch (e) { /* noop */ }
    }
    return uid;
  }

  // ── DOM 헬퍼 ──
  function _el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'css') {
          e.style.cssText = attrs[k];
        } else if (k === 'text') {
          e.textContent = attrs[k];
        } else if (k === 'cls') {
          e.className = attrs[k];
        } else if (k === 'id') {
          e.id = attrs[k];
        } else if (k === 'disabled') {
          e.disabled = attrs[k];
        } else if (k === 'type') {
          e.type = attrs[k];
        } else if (k === 'data') {
          Object.keys(attrs[k]).forEach(function (dk) {
            e.dataset[dk] = attrs[k][dk];
          });
        } else {
          e.setAttribute(k, attrs[k]);
        }
      });
    }
    if (children) {
      children.forEach(function (c) {
        if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return e;
  }

  // ── bhm_settings 유틸 ──
  function _loadSettings() {
    try { return JSON.parse(localStorage.getItem('bhm_settings') || '{}'); } catch (e) { return {}; }
  }
  function _saveSettings(patch) {
    var s = _loadSettings();
    Object.assign(s, patch);
    localStorage.setItem('bhm_settings', JSON.stringify(s));
  }

  // ── SHA-256 (WebCrypto) ──
  function _sha256(str) {
    var data = new TextEncoder().encode(str);
    return crypto.subtle.digest('SHA-256', data).then(function (buf) {
      return Array.from(new Uint8Array(buf))
        .map(function (b) { return b.toString(16).padStart(2, '0'); })
        .join('');
    });
  }

  function _genSalt() {
    var arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  // ── PIN 유효성 검사 ──
  function _validatePin(pin) {
    if (!pin || typeof pin !== 'string') return '숫자만 입력해주세요.';
    if (!/^\d+$/.test(pin)) return '숫자만 입력해주세요.';
    if (pin.length < PIN_MIN) return PIN_MIN + '자리 이상 입력해주세요.';
    if (pin.length > PIN_MAX) return PIN_MAX + '자리 이하로 입력해주세요.';
    return null;
  }

  // ── 도트 표시기 빌드 ──
  function _buildDots(filled, total) {
    total = total || PIN_MAX;
    var wrap = _el('div', { css: 'display:flex;gap:12px;justify-content:center;' });
    for (var i = 0; i < total; i++) {
      var filled_style = 'width:12px;height:12px;border-radius:50%;border:2px solid;' +
        'border-color:var(--accent-indigo,#6366F1);background:var(--accent-indigo,#6366F1);';
      var empty_style = 'width:12px;height:12px;border-radius:50%;border:2px solid;' +
        'border-color:#ccc;background:transparent;';
      wrap.appendChild(_el('span', { css: i < filled ? filled_style : empty_style }));
    }
    return wrap;
  }

  // ── 숫자 키패드 빌드 ──
  var KEY_STYLE = [
    'padding:16px;font-size:1.25rem;font-weight:600;',
    'background:var(--bg-hover,#f5f5f5);border:1px solid var(--border-glass,rgba(0,0,0,0.1));',
    'border-radius:12px;cursor:pointer;color:var(--text-primary,#1a1a1a);',
    '-webkit-tap-highlight-color:transparent;'
  ].join('');

  function _buildKeypad() {
    var grid = _el('div', { css: 'display:grid;grid-template-columns:repeat(3,1fr);gap:12px;max-width:240px;margin:0 auto 20px;' });
    var nums = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
    nums.forEach(function (n) {
      if (n === '') {
        grid.appendChild(_el('div'));
      } else {
        var btn = _el('button', { cls: 'al-key', css: KEY_STYLE, text: n, data: { key: n } });
        grid.appendChild(btn);
      }
    });
    return grid;
  }

  // ── 공개 API ──

  function setupPin(pin) {
    var err = _validatePin(pin);
    if (err) return Promise.reject(new Error(err));
    var salt = _genSalt();
    return _sha256(pin + salt).then(function (hash) {
      _saveSettings({ pinEnabled: true, pinHash: hash, pinSalt: salt, pinLength: pin.length, pinFailCount: 0, pinLockUntil: null });
      _unlocked = true;
    });
  }

  function verifyPin(pin) {
    var s = _loadSettings();
    if (!s.pinEnabled) return Promise.resolve({ ok: true });

    if (s.pinLockUntil) {
      var remaining = s.pinLockUntil - Date.now();
      if (remaining > 0) {
        return Promise.resolve({ ok: false, error: 'locked', lockUntil: s.pinLockUntil, remainingMs: remaining });
      }
      _saveSettings({ pinFailCount: 0, pinLockUntil: null });
    }

    return _sha256(pin + s.pinSalt).then(function (hash) {
      var s2 = _loadSettings();
      if (hash === s2.pinHash) {
        _saveSettings({ pinFailCount: 0, pinLockUntil: null });
        _unlocked = true;
        return { ok: true };
      }
      var failCount = (s2.pinFailCount || 0) + 1;
      var patch = { pinFailCount: failCount };
      if (failCount >= MAX_FAIL) {
        patch.pinLockUntil = Date.now() + LOCKOUT_MS;
        patch.pinFailCount = 0;
      }
      _saveSettings(patch);
      return { ok: false, error: failCount >= MAX_FAIL ? 'locked' : 'wrong', failCount: failCount, lockUntil: patch.pinLockUntil || null };
    });
  }

  function changePin(oldPin, newPin) {
    return verifyPin(oldPin).then(function (result) {
      if (!result.ok) return result;
      return setupPin(newPin);
    });
  }

  function disablePin() {
    _saveSettings({ pinEnabled: false, pinHash: null, pinSalt: null, pinFailCount: 0, pinLockUntil: null });
    _unlocked = true;
    var overlay = document.getElementById(OVERLAY_ID);
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }

  function isEnabled() { return !!_loadSettings().pinEnabled; }
  function isUnlocked() { return _unlocked || !isEnabled(); }

  function unlock() {
    _unlocked = true;
    var overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.2s';
      setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 250);
    }
    document.documentElement.style.visibility = '';
  }

  function lock() { _unlocked = false; }

  function resetViaReauth(onSuccess) {
    // REMOVED auth: 재인증 플로우 제거.
    // AppLock 은 기기 로컬 기능이므로 신원 재확인 경로 없음.
    // PIN 분실 시 사용자는 브라우저 데이터를 초기화해야 함.
    alert('PIN 재설정은 지원되지 않습니다.\nPIN 을 잊으셨다면 브라우저 데이터(설정 > 사이트 데이터)를 초기화해주세요.');
    if (typeof onSuccess === 'function') {
      // 호출부 호환: onSuccess 는 호출하지 않음 (신원 확인 실패 간주)
    }
  }

  // ── 잠금 오버레이 렌더링 ──
  function _renderOverlay() {
    if (document.getElementById(OVERLAY_ID)) return;

    var settings = _loadSettings();
    var hasBiometric = !!settings.biometricCredId && BiometricLock.isSupported();

    var overlay = _el('div', {
      id: OVERLAY_ID,
      css: 'position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;' +
           'align-items:center;justify-content:center;background:var(--bg-primary,#fff);padding:24px 16px;'
    });

    var inner = _el('div', { css: 'text-align:center;max-width:360px;width:100%;' });

    inner.appendChild(_el('div', { css: 'font-size:3rem;margin-bottom:8px;', text: '🔒' }));
    inner.appendChild(_el('h2', {
      css: 'font-size:1.25rem;font-weight:700;margin-bottom:4px;color:var(--text-primary,#1a1a1a);',
      text: 'SNUH 메이트'
    }));
    inner.appendChild(_el('p', {
      css: 'font-size:0.875rem;color:var(--text-muted,#777);margin-bottom:28px;',
      text: 'PIN을 입력해서 잠금을 해제해주세요'
    }));

    // 생체인증 버튼
    var biometricBtn = null;
    if (hasBiometric) {
      biometricBtn = _el('button', {
        id: 'alBiometricBtn',
        css: 'width:100%;padding:12px;margin-bottom:16px;background:var(--accent-indigo,#6366F1);' +
             'color:white;border:none;border-radius:12px;font-size:1rem;font-weight:600;cursor:pointer;',
        text: '🪪 Face ID / 지문으로 열기'
      });
      inner.appendChild(biometricBtn);
    }

    // 도트 표시기 (저장된 PIN 길이만큼 표시)
    var pinLen = settings.pinLength || PIN_MAX;
    var dotsWrap = _el('div', { id: 'alDots', css: 'margin-bottom:24px;' });
    dotsWrap.appendChild(_buildDots(0, pinLen));
    inner.appendChild(dotsWrap);

    // 오류 메시지
    var errorEl = _el('div', {
      id: 'alError',
      css: 'min-height:20px;font-size:0.8rem;color:#ef4444;margin-bottom:12px;text-align:center;'
    });
    inner.appendChild(errorEl);

    // 키패드
    inner.appendChild(_buildKeypad());

    // PIN 분실 — AppLock 은 기기 로컬 기능이므로 재인증 경로 없음.
    // REMOVED auth: 로그인 상태 조건 분기 제거.
    inner.appendChild(_el('p', {
      css: 'font-size:0.75rem;color:var(--text-muted,#777);',
      text: 'PIN을 잊으셨나요? 브라우저 데이터를 초기화해야 합니다.'
    }));

    overlay.appendChild(inner);
    document.body.appendChild(overlay);
    document.documentElement.style.visibility = '';

    _attachOverlayEvents(overlay, errorEl, dotsWrap, biometricBtn);

    if (hasBiometric) {
      setTimeout(function () {
        BiometricLock.authenticate().then(function (ok) { if (ok) unlock(); }).catch(function () {});
      }, 300);
    }
  }

  function _attachOverlayEvents(overlay, errorEl, dotsWrap, biometricBtn) {
    var input = '';
    var lockoutTimer = null;
    var pinLen = _loadSettings().pinLength || PIN_MAX;

    function updateDots() {
      dotsWrap.textContent = '';
      dotsWrap.appendChild(_buildDots(input.length, pinLen));
    }

    function showError(msg) {
      errorEl.textContent = msg;
      setTimeout(function () { errorEl.textContent = ''; }, 3000);
    }

    function shake() {
      var inner = overlay.firstChild;
      if (!inner) return;
      inner.style.animation = 'none';
      // Force reflow
      void inner.offsetHeight;
      inner.style.animation = 'alShake 0.3s ease';
    }

    function startLockoutCountdown(lockUntil) {
      clearInterval(lockoutTimer);
      var keypad = overlay.querySelector('[style*="grid-template-columns"]');
      if (keypad) keypad.style.pointerEvents = 'none';
      lockoutTimer = setInterval(function () {
        var ms = lockUntil - Date.now();
        if (ms <= 0) {
          clearInterval(lockoutTimer);
          if (keypad) keypad.style.pointerEvents = '';
          errorEl.textContent = '';
          input = '';
          updateDots();
        } else {
          var secs = Math.ceil(ms / 1000);
          var m = Math.floor(secs / 60);
          var s = secs % 60;
          errorEl.textContent = '잠시 후 다시 시도해주세요 (' + m + ':' + String(s).padStart(2, '0') + ')';
        }
      }, 500);
    }

    function tryVerify() {
      verifyPin(input).then(function (result) {
        if (result.ok) {
          unlock();
        } else if (result.error === 'locked') {
          startLockoutCountdown(result.lockUntil);
          input = '';
          updateDots();
        } else {
          showError('PIN이 맞지 않아요. 다시 시도해주세요.');
          input = '';
          updateDots();
          shake();
        }
      });
    }

    var pinLen = _loadSettings().pinLength || PIN_MAX;

    overlay.addEventListener('click', function (e) {
      var btn = e.target.closest('.al-key');
      if (!btn) return;
      var key = btn.dataset.key;
      if (key === '⌫') {
        input = input.slice(0, -1);
        updateDots();
      } else if (/^\d$/.test(key) && input.length < pinLen) {
        input += key;
        updateDots();
        if (input.length === pinLen) tryVerify();
      }
    });

    var forgotBtn = overlay.querySelector('#alForgotBtn');
    if (forgotBtn) {
      forgotBtn.addEventListener('click', function () {
        if (confirm('Google 계정으로 신원을 확인한 후 PIN을 재설정합니다.\n계속하시겠어요?')) {
          resetViaReauth(function () {
            _showPinSetupModal(function () { unlock(); });
          });
        }
      });
    }

    if (biometricBtn) {
      biometricBtn.addEventListener('click', function () {
        BiometricLock.authenticate()
          .then(function (ok) { if (ok) unlock(); else showError('생체인증에 실패했어요. PIN을 입력해주세요.'); })
          .catch(function () { showError('생체인증을 취소했어요. PIN을 입력해주세요.'); });
      });
    }

    var s = _loadSettings();
    if (s.pinLockUntil && s.pinLockUntil > Date.now()) {
      startLockoutCountdown(s.pinLockUntil);
    }
  }

  // ── PIN 설정 모달 ──
  function _showPinSetupModal(onDone) {
    var existing = document.getElementById('alSetupModal');
    if (existing) existing.parentNode.removeChild(existing);

    var modal = _el('div', {
      id: 'alSetupModal',
      css: 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;' +
           'background:rgba(0,0,0,0.5);padding:16px;'
    });

    var box = _el('div', {
      css: 'background:var(--bg-card,#fff);border-radius:16px;padding:24px;max-width:320px;width:100%;text-align:center;'
    });

    box.appendChild(_el('div', { css: 'font-size:2rem;margin-bottom:8px;', text: '🔒' }));

    var titleEl = _el('h3', {
      css: 'font-size:1.1rem;font-weight:700;margin-bottom:4px;color:var(--text-primary,#1a1a1a);',
      text: 'PIN 설정'
    });
    box.appendChild(titleEl);

    var descEl = _el('p', {
      css: 'font-size:0.8rem;color:var(--text-muted,#777);margin-bottom:20px;',
      text: '4~6자리 숫자를 입력해주세요'
    });
    box.appendChild(descEl);

    var dotsWrap = _el('div', { css: 'margin-bottom:16px;' });
    dotsWrap.appendChild(_buildDots(0));
    box.appendChild(dotsWrap);

    var errorEl = _el('div', { css: 'min-height:18px;font-size:0.8rem;color:#ef4444;margin-bottom:12px;' });
    box.appendChild(errorEl);

    var keypad = _buildKeypad();
    keypad.style.cssText += 'gap:10px;max-width:240px;';
    box.appendChild(keypad);

    var confirmBtn = _el('button', {
      css: 'width:100%;padding:12px;background:var(--accent-indigo,#6366F1);color:white;' +
           'border:none;border-radius:10px;font-size:1rem;font-weight:600;cursor:pointer;opacity:0.5;',
      text: '확인',
      disabled: true
    });
    box.appendChild(confirmBtn);

    var cancelBtn = _el('button', {
      css: 'width:100%;padding:8px;margin-top:8px;background:none;border:none;' +
           'color:var(--text-muted,#777);font-size:0.875rem;cursor:pointer;',
      text: '취소'
    });
    box.appendChild(cancelBtn);

    modal.appendChild(box);
    document.body.appendChild(modal);

    var phase = 'enter';
    var firstPin = '';
    var input = '';

    function updateDots() {
      dotsWrap.textContent = '';
      dotsWrap.appendChild(_buildDots(input.length));
      var canConfirm = input.length >= PIN_MIN;
      confirmBtn.disabled = !canConfirm;
      confirmBtn.style.opacity = canConfirm ? '1' : '0.5';
    }

    modal.addEventListener('click', function (e) {
      var btn = e.target.closest('.al-key');
      if (!btn) return;
      var key = btn.dataset.key;
      if (key === '⌫') {
        input = input.slice(0, -1);
      } else if (/^\d$/.test(key) && input.length < PIN_MAX) {
        input += key;
      }
      updateDots();
    });

    confirmBtn.addEventListener('click', function () {
      if (input.length < PIN_MIN) return;
      if (phase === 'enter') {
        firstPin = input;
        input = '';
        phase = 'confirm';
        titleEl.textContent = 'PIN 확인';
        descEl.textContent = '같은 PIN을 한 번 더 입력해주세요';
        errorEl.textContent = '';
        updateDots();
      } else {
        if (input === firstPin) {
          setupPin(input).then(function () {
            if (modal.parentNode) modal.parentNode.removeChild(modal);
            if (onDone) onDone();
          }).catch(function (err) {
            errorEl.textContent = err.message || 'PIN 설정에 실패했어요.';
          });
        } else {
          errorEl.textContent = 'PIN이 일치하지 않아요. 처음부터 다시 입력해주세요.';
          input = '';
          firstPin = '';
          phase = 'enter';
          titleEl.textContent = 'PIN 설정';
          descEl.textContent = '4~6자리 숫자를 입력해주세요';
          updateDots();
        }
      }
    });

    cancelBtn.addEventListener('click', function () {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
    });
  }

  // ── checkAndPrompt ──
  function checkAndPrompt() {
    if (!isEnabled() || _unlocked) return;
    if (document.getElementById(OVERLAY_ID)) return;
    _renderOverlay();
  }

  // ── WebAuthn 생체인증 서브모듈 ──
  var BiometricLock = (function () {
    function isSupported() {
      return !!(window.PublicKeyCredential && navigator.credentials && navigator.credentials.create);
    }

    function register() {
      if (!isSupported()) return Promise.reject(new Error('WebAuthn not supported'));
      var challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      var settings = _loadSettings();
      // REMOVED auth: 로그인 신원 정보 제거 → 로컬 UID 사용
      var userId = new TextEncoder().encode(_getLocalUid());
      var rpId = location.hostname === 'localhost' ? 'localhost' : location.hostname;

      return navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: { name: 'SNUH 메이트', id: rpId },
          user: {
            id: userId,
            name: 'user',
            displayName: 'SNUH 메이트 사용자'
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
          timeout: 60000
        }
      }).then(function (credential) {
        var credId = btoa(String.fromCharCode.apply(null, new Uint8Array(credential.rawId)));
        _saveSettings({ biometricEnabled: true, biometricCredId: credId });
        return credId;
      });
    }

    function authenticate() {
      if (!isSupported()) return Promise.resolve(false);
      var settings = _loadSettings();
      if (!settings.biometricCredId) return Promise.resolve(false);
      var challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      var rpId = location.hostname === 'localhost' ? 'localhost' : location.hostname;

      var rawId;
      try {
        var binary = atob(settings.biometricCredId);
        rawId = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) rawId[i] = binary.charCodeAt(i);
      } catch (e) { return Promise.resolve(false); }

      return navigator.credentials.get({
        publicKey: {
          challenge: challenge,
          allowCredentials: [{ id: rawId.buffer, type: 'public-key' }],
          rpId: rpId,
          userVerification: 'required',
          timeout: 60000
        }
      }).then(function (c) { return !!c; }).catch(function () { return false; });
    }

    function disable() {
      _saveSettings({ biometricEnabled: false, biometricCredId: null });
    }

    return { isSupported: isSupported, register: register, authenticate: authenticate, disable: disable };
  })();

  // ── CSS 주입 (브라우저 환경에서만) ──
  (function () {
    if (typeof document === 'undefined' || !document.head) return;
    if (document.getElementById('appLockStyles')) return;
    var style = document.createElement('style');
    style.id = 'appLockStyles';
    style.textContent =
      '@keyframes alShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}' +
      '.al-key:active{background:var(--accent-indigo-light,#a5b4fc)!important}';
    document.head.appendChild(style);
  })();

  // 자체 자동 트리거 — shared-layout.js 가 먼저 로드되어 window.AppLock 미정의일 때
  // 자동 잠금이 누락되는 결함 보완. defer 스크립트 순서와 무관하게 동작.
  function _autoTrigger() {
    if (isEnabled() && !_unlocked) {
      try { checkAndPrompt(); } catch (e) { console.warn('[AppLock] auto-trigger', e); }
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _autoTrigger);
  } else {
    _autoTrigger();
  }

  return {
    setupPin: setupPin,
    verifyPin: verifyPin,
    changePin: changePin,
    disablePin: disablePin,
    isEnabled: isEnabled,
    isUnlocked: isUnlocked,
    unlock: unlock,
    lock: lock,
    checkAndPrompt: checkAndPrompt,
    resetViaReauth: resetViaReauth,
    _showPinSetupModal: _showPinSetupModal,
    BiometricLock: BiometricLock
  };
})();

// 호환층 — index.html / regulation.html 등 inline script + IIFE 모듈이 window.AppLock 사용
if (typeof window !== 'undefined') {
  window.AppLock = AppLock;
}
