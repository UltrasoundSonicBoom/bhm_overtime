// ============================================================
// googleAuth.js — Neon Auth (Managed) 인증 모듈
// Google OAuth 1회 리다이렉트 로그인 → Neon JWT + Drive/Calendar 토큰
// ============================================================

var CONFIG = window.BHM_CONFIG || {}

// ── bhm_settings 유틸 ──
function loadSettings() {
  try { return JSON.parse(localStorage.getItem('bhm_settings') || '{}') } catch (e) { return {} }
}
function saveSettings(patch) {
  var s = loadSettings()
  Object.assign(s, patch)
  localStorage.setItem('bhm_settings', JSON.stringify(s))
}
window.loadSettings = loadSettings
window.saveSettings = saveSettings

// ── getUserStorageKey ──
function getUserStorageKey(baseKey) {
  var settings = loadSettings()
  var uid = settings.googleSub || 'guest'
  return baseKey + '_' + uid
}
window.getUserStorageKey = getUserStorageKey

// ── 로그인 성공 토스트 ──
function _showLoginSuccessToast() {
  if (!document.getElementById('bhm-login-toast-style')) {
    var style = document.createElement('style')
    style.id = 'bhm-login-toast-style'
    style.textContent =
      '@keyframes bhm-login-toast-in{0%{opacity:0;transform:translate(-50%,10px) scale(.92)}100%{opacity:1;transform:translate(-50%,0) scale(1)}}' +
      '@keyframes bhm-login-check-pop{0%{transform:scale(0) rotate(-12deg)}60%{transform:scale(1.25) rotate(5deg)}100%{transform:scale(1) rotate(0)}}' +
      '#bhm-login-toast{position:fixed;left:50%;top:24px;transform:translate(-50%,0);z-index:99999;' +
      'display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:999px;' +
      'background:#10b981;color:#fff;font-weight:700;font-size:14px;' +
      'box-shadow:0 8px 24px rgba(16,185,129,.35),0 2px 6px rgba(0,0,0,.12);' +
      'animation:bhm-login-toast-in .28s cubic-bezier(.2,.8,.2,1) both;pointer-events:none}' +
      '#bhm-login-toast .chk{display:inline-flex;align-items:center;justify-content:center;' +
      'width:22px;height:22px;border-radius:50%;background:#fff;color:#10b981;font-weight:900;' +
      'animation:bhm-login-check-pop .4s cubic-bezier(.2,.9,.3,1.2) .08s both}'
    document.head.appendChild(style)
  }
  var old = document.getElementById('bhm-login-toast')
  if (old && old.parentNode) old.parentNode.removeChild(old)
  var toast = document.createElement('div')
  toast.id = 'bhm-login-toast'
  toast.setAttribute('role', 'status')
  toast.setAttribute('aria-live', 'polite')
  var chk = document.createElement('span')
  chk.className = 'chk'
  chk.textContent = '✓'
  var txt = document.createElement('span')
  txt.textContent = '로그인에 성공했습니다'
  toast.appendChild(chk)
  toast.appendChild(txt)
  document.body.appendChild(toast)
}

function _showToast(msg) {
  var toast = document.getElementById('otToast')
  if (!toast) return
  toast.textContent = msg
  toast.style.display = 'block'
  clearTimeout(toast._hideTimer)
  toast._hideTimer = setTimeout(function () { toast.style.display = 'none' }, 4000)
}

// ── GoogleAuth 모듈 ──
window.GoogleAuth = (function () {
  'use strict'

  var _neonAuth = null
  var _session = null
  var _jwtToken = null
  var _knownSub = null

  function _initNeonAuth(config) {
    if (!window.__NeonAuthModule) return
    if (!config || !config.neonAuthBaseUrl) return
    _neonAuth = new window.__NeonAuthModule.NeonAuthClient({
      baseUrl: config.neonAuthBaseUrl,
    })
  }

  // ── signIn: Neon Auth Google 리다이렉트 로그인 ──
  function signIn() {
    var config = window.BHM_CONFIG || {}
    if (!_neonAuth) _initNeonAuth(config)
    if (!_neonAuth) {
      console.error('[GoogleAuth] Neon Auth not ready — NEON_AUTH_BASE_URL 미설정?')
      _showToast('인증 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }
    _neonAuth.signIn.social({
      provider: 'google',
      callbackURL: window.location.href,
    })
    // → 리다이렉트 (팝업 아님)
  }

  // ── getJwtToken: 백엔드 API 호출용 Neon JWT ──
  async function getJwtToken() {
    if (_jwtToken) return _jwtToken
    if (!_neonAuth) return null
    try {
      var session = await _neonAuth.getSession()
      _jwtToken = (session && session.session && session.session.token) ? session.session.token : null
      return _jwtToken
    } catch (e) {
      console.warn('[GoogleAuth] getJwtToken failed:', e)
      return null
    }
  }

  // ── getAccessToken: Drive/Calendar용 Google OAuth access_token ──
  // Neon Auth가 저장한 Google access_token을 반환. 없으면 null.
  async function getAccessToken() {
    var jwt = await getJwtToken()
    if (!jwt) return null
    var config = window.BHM_CONFIG || {}
    if (!config.neonAuthBaseUrl) return null
    try {
      var res = await fetch(config.neonAuthBaseUrl + '/get-access-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + jwt,
        },
        body: JSON.stringify({ providerId: 'google' }),
        credentials: 'include',
      })
      if (!res.ok) return null
      var data = await res.json()
      return data.accessToken || data.access_token || null
    } catch (e) {
      console.warn('[GoogleAuth] getAccessToken failed:', e)
      return null
    }
  }

  // ── hasAccountLink: 로그인 여부 ──
  async function hasAccountLinkAsync() {
    if (!_neonAuth) return !!loadSettings().googleSub
    try {
      var session = await _neonAuth.getSession()
      return !!(session && session.user)
    } catch (e) {
      return !!loadSettings().googleSub
    }
  }

  // 동기 버전 (localStorage 기반 — UI 즉시 반영용)
  function hasAccountLink() {
    return !!loadSettings().googleSub
  }

  function isSignedIn() {
    return hasAccountLink()
  }

  function isReady() {
    return !!_neonAuth
  }

  function hasValidToken() {
    return !!_jwtToken
  }

  function getUser() {
    var settings = loadSettings()
    if (!settings.googleSub) return null
    return {
      sub: settings.googleSub,
      email: settings.googleEmail,
      name: settings.googleName,
      picture: settings.googlePicture,
    }
  }

  // ── signOut ──
  async function signOut() {
    if (window.SyncManager && typeof window.SyncManager.clearPendingPushes === 'function') {
      window.SyncManager.clearPendingPushes()
    }
    if (_neonAuth) {
      try { await _neonAuth.signOut() } catch (e) { console.warn('[GoogleAuth] signOut error:', e) }
    }
    _session = null
    _jwtToken = null
    saveSettings({
      googleSub: null, googleEmail: null, googleName: null, googlePicture: null,
      driveEnabled: false, calendarEnabled: false, _oldGoogleSub: null,
    })
    if (typeof updateAuthUI === 'function') updateAuthUI(null)
    window.location.reload()
  }

  // ── init: 페이지 로드 시 세션 확인 ──
  async function init(config) {
    var cfg = config || window.BHM_CONFIG || {}
    _initNeonAuth(cfg)

    // 저장된 설정으로 즉시 UI 복원
    var settings = loadSettings()
    if (settings.googleSub) {
      if (typeof updateAuthUI === 'function') updateAuthUI({
        sub: settings.googleSub,
        email: settings.googleEmail,
        name: settings.googleName,
        picture: settings.googlePicture,
      })
    } else {
      if (typeof updateAuthUI === 'function') updateAuthUI(null)
    }

    if (!_neonAuth) return

    try {
      var session = await _neonAuth.getSession()
      if (!session || !session.user) return

      _session = session
      _jwtToken = (session.session && session.session.token) ? session.session.token : null

      // 이전 googleSub 보존 (Task 7 localStorage 키 이전 용도)
      if (settings.googleSub && settings.googleSub !== session.user.id) {
        saveSettings({ _oldGoogleSub: settings.googleSub })
      }

      saveSettings({
        googleSub: session.user.id,
        googleEmail: session.user.email,
        googleName: session.user.name || session.user.displayName,
        googlePicture: session.user.image || null,
        driveEnabled: true,
      })

      if (typeof updateAuthUI === 'function') updateAuthUI({
        sub: session.user.id,
        email: session.user.email,
        name: session.user.name || session.user.displayName,
        picture: session.user.image || null,
      })

      // 로그인 직후(첫 방문) 동기화 및 토스트
      var wasGuest = !settings.googleSub
      if (wasGuest) {
        if (window.SyncManager) {
          window.SyncManager.fullSync().then(function () {
            _showLoginSuccessToast()
            setTimeout(function () { window.location.reload() }, 1500)
          }).catch(function () {
            _showLoginSuccessToast()
            setTimeout(function () { window.location.reload() }, 1500)
          })
        } else {
          _showLoginSuccessToast()
          setTimeout(function () { window.location.reload() }, 1500)
        }
      }
    } catch (e) {
      console.warn('[GoogleAuth] init session check failed:', e)
    }

    _attachCrossTabSync()
  }

  function _attachCrossTabSync() {
    try { _knownSub = loadSettings().googleSub || null } catch (e) { _knownSub = null }
    window.addEventListener('storage', function (e) {
      if (e.key !== 'bhm_settings') return
      var nextSub = null
      try { nextSub = (JSON.parse(e.newValue || '{}') || {}).googleSub || null } catch (err) { nextSub = null }
      if (nextSub === _knownSub) return
      _knownSub = nextSub
      if (window.SyncManager && typeof window.SyncManager.clearPendingPushes === 'function') {
        window.SyncManager.clearPendingPushes()
      }
      _jwtToken = null
      _session = null
      window.location.reload()
    })
  }

  // 하위 호환 alias
  var refreshToken = getAccessToken
  var ensureTokenInteractive = getAccessToken
  var requestDriveScope = getAccessToken
  var requestCalendarScope = getAccessToken
  function hasScope() { return true } // Neon Auth는 로그인 시 모든 scope 포함

  return {
    init: init,
    signIn: signIn,
    signOut: signOut,
    isSignedIn: isSignedIn,
    isReady: isReady,
    hasValidToken: hasValidToken,
    hasAccountLink: hasAccountLink,
    getUser: getUser,
    getJwtToken: getJwtToken,
    getAccessToken: getAccessToken,
    refreshToken: refreshToken,
    ensureTokenInteractive: ensureTokenInteractive,
    requestDriveScope: requestDriveScope,
    requestCalendarScope: requestCalendarScope,
    hasScope: hasScope,
    _fetchUserInfo: function () { return Promise.resolve(null) },
  }
})()
