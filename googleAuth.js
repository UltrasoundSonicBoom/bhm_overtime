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

  var _neonBaseUrl = null   // Neon Auth REST base URL
  var _session = null
  var _jwtToken = null
  var _knownSub = null

  function _initNeonAuth(config) {
    if (!config || !config.neonAuthBaseUrl) return
    _neonBaseUrl = config.neonAuthBaseUrl
  }

  // ── signIn: Neon Auth Google 리다이렉트 로그인 ──
  // Better Auth /sign-in/social은 POST → {url} 응답 → 브라우저 리다이렉트
  async function signIn() {
    var config = window.BHM_CONFIG || {}
    if (!_neonBaseUrl) _initNeonAuth(config)
    if (!_neonBaseUrl) {
      console.error('[GoogleAuth] Neon Auth not ready — neonAuthBaseUrl 미설정?')
      _showToast('인증 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }
    var callbackURL = window.location.origin + '/index.html?app=1'
    try {
      var res = await fetch(_neonBaseUrl + '/sign-in/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'google', callbackURL: callbackURL }),
        credentials: 'include',
      })
      var data = await res.json()
      if (data && data.url) {
        window.location.href = data.url
      } else {
        console.error('[GoogleAuth] sign-in/social 응답에 url 없음:', data)
        _showToast('로그인 준비 중 오류가 발생했습니다.')
      }
    } catch (e) {
      console.error('[GoogleAuth] sign-in/social 실패:', e)
      _showToast('로그인 준비 중 오류가 발생했습니다.')
    }
  }

  async function _getNeonSession(verifier) {
    if (!_neonBaseUrl) return null
    try {
      var url = _neonBaseUrl + '/get-session'
      if (verifier) url += '?neon_auth_session_verifier=' + encodeURIComponent(verifier)
      var res = await fetch(url, { credentials: 'include' })
      if (!res.ok) return null
      return await res.json()
    } catch (e) { return null }
  }

  // ── getJwtToken: 백엔드 API 호출용 Neon JWT ──
  async function getJwtToken() {
    if (_jwtToken) return _jwtToken
    if (!_neonBaseUrl) return null
    var data = await _getNeonSession()
    _jwtToken = (data && data.session && data.session.token) ? data.session.token : null
    return _jwtToken
  }

  // ── getAccessToken: Drive/Calendar용 Google OAuth access_token ──
  // Neon Auth가 저장한 Google access_token을 반환. 없으면 null.
  // 호출부는 반드시 await 할 것 — 이 함수는 async (Promise 반환).
  async function getAccessToken() {
    var jwt = await getJwtToken()
    if (!jwt) {
      console.warn('[GoogleAuth] getAccessToken: JWT 없음 (Neon 세션 미확보)')
      return null
    }
    if (!_neonBaseUrl) return null
    try {
      var res = await fetch(_neonBaseUrl + '/get-access-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwt },
        body: JSON.stringify({ providerId: 'google' }),
        credentials: 'include',
      })
      if (!res.ok) {
        var errBody = ''
        try { errBody = await res.text() } catch (_) {}
        console.warn('[GoogleAuth] /get-access-token status=' + res.status + ' body=' + String(errBody).slice(0, 300))
        if (window.Telemetry && typeof window.Telemetry.error === 'function') {
          try { window.Telemetry.error('neon_access_token_http_error', { status: res.status, body: String(errBody).slice(0, 300) }) } catch (_) {}
        }
        return null
      }
      var data = {}
      try { data = await res.json() } catch (_) {}
      var token = data.accessToken || data.access_token || null
      if (!token) {
        console.warn('[GoogleAuth] /get-access-token 200 but no token in body. keys=' + Object.keys(data || {}).join(','))
        if (window.Telemetry && typeof window.Telemetry.error === 'function') {
          try { window.Telemetry.error('neon_access_token_empty', { keys: Object.keys(data || {}).join(',') }) } catch (_) {}
        }
      }
      return token
    } catch (e) {
      console.warn('[GoogleAuth] /get-access-token fetch 실패:', e)
      return null
    }
  }

  // ── hasAccountLink: 로그인 여부 ──
  async function hasAccountLinkAsync() {
    var data = await _getNeonSession()
    return Boolean(data && data.user)
  }

  // 동기 버전 (localStorage 기반 — UI 즉시 반영용)
  function hasAccountLink() {
    return !!loadSettings().googleSub
  }

  function isSignedIn() {
    return hasAccountLink()
  }

  function isReady() {
    return !!_neonBaseUrl
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
    var isDemoMode = localStorage.getItem('bhm_demo_mode') === '1'
    console.log('[GoogleAuth] signOut demo=' + isDemoMode)

    // pending push 취소 (데이터 손실 방지)
    if (window.SyncManager && typeof window.SyncManager.clearPendingPushes === 'function') {
      window.SyncManager.clearPendingPushes()
    }

    // 데모 모드: exitDemoMode 가 bhm_demo_saved_auth 를 복원하려고 시도하지만
    // 여기선 "연결해제" 의도이므로 복원 후 즉시 다시 clear.
    if (isDemoMode) {
      if (typeof window.exitDemoMode === 'function') {
        try { window.exitDemoMode() } catch (e) { console.warn('[GoogleAuth] exitDemoMode 실패:', e) }
      }
      // exitDemoMode 가 복원한 실계정 정보를 명시적으로 지운다.
      // bhm_demo_saved_auth 도 지워 다음 진입 시 잔존 방지.
      localStorage.removeItem('bhm_demo_saved_auth')
    }

    // Neon 세션 무효화 — 데모 모드여도 혹시 실계정 쿠키가 남아있을 수 있어 항상 호출.
    if (_neonBaseUrl) {
      try {
        var res = await fetch(_neonBaseUrl + '/sign-out', {
          method: 'POST',
          credentials: 'include',
        })
        console.log('[GoogleAuth] Neon /sign-out status=' + res.status)
      } catch (e) {
        console.warn('[GoogleAuth] Neon /sign-out 실패:', e)
      }
    }

    _session = null
    _jwtToken = null
    saveSettings({
      googleSub: null,
      googleEmail: null,
      googleName: null,
      googlePicture: null,
      driveEnabled: false,
      calendarEnabled: false,
      _oldGoogleSub: null,
    })

    // 다음 로그인 시도에서 stale verifier 재사용 방지 (사용자가 명시적으로 로그아웃했으므로)
    try { sessionStorage.removeItem('bhm_neon_verifier') } catch (_) {}

    // URL 정리 (?demo=1 제거, ?app=1 유지). 데모·일반 동일.
    var _sp = new URLSearchParams(window.location.search)
    _sp.delete('demo')
    _sp.delete('neon_auth_session_verifier')
    _sp.set('app', '1')
    var nextUrl = window.location.pathname + '?' + _sp.toString()

    // location.replace 는 reload 를 포함하므로 별도 reload 불필요.
    window.location.replace(nextUrl)
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

    if (!_neonBaseUrl) return

    // Extract OAuth callback verifier from URL (Better Auth cross-domain session mechanism)
    // verifier 는 1회용이지만 직후 reload 시에도 재사용 가능하도록 sessionStorage 에 임시 보관.
    var _cbVerifier = null
    try {
      var _sp = new URLSearchParams(window.location.search)
      _cbVerifier = _sp.get('neon_auth_session_verifier')
      if (_cbVerifier) {
        try { sessionStorage.setItem('bhm_neon_verifier', _cbVerifier) } catch (_) {}
        _sp.delete('neon_auth_session_verifier')
        var _qs = _sp.toString()
        window.history.replaceState({}, '', window.location.pathname + (_qs ? '?' + _qs : ''))
      } else {
        // URL 에 없으면 sessionStorage 에서 복원 (같은 탭 내 reload 이후).
        try { _cbVerifier = sessionStorage.getItem('bhm_neon_verifier') } catch (_) {}
      }
    } catch (_e) {}

    try {
      var session = await _getNeonSession(_cbVerifier)
      if (!session || !session.user) {
        // Neon 세션 조회 실패. localStorage 에 stale googleSub 이 있으면
        // 사용자는 "로그인됨" 으로 보이는데 실제 API 호출은 모두 401 이 됨.
        // 이 불일치를 감지하면 localStorage 를 비우고 UI 를 non-signed 로 갱신.
        if (settings.googleSub) {
          console.warn('[GoogleAuth] localStorage googleSub 있으나 Neon 세션 없음 — 상태 cleanup')
          if (window.Telemetry && typeof window.Telemetry.track === 'function') {
            try { window.Telemetry.track('auth_state_mismatch', { hadSub: true, verifier: !!_cbVerifier }) } catch (_) {}
          }
          _session = null
          _jwtToken = null
          saveSettings({
            googleSub: null,
            googleEmail: null,
            googleName: null,
            googlePicture: null,
            driveEnabled: false,
            calendarEnabled: false,
          })
          if (typeof updateAuthUI === 'function') updateAuthUI(null)
        }
        _attachCrossTabSync()
        return
      }

      _session = session
      _jwtToken = (session && session.session && session.session.token) ? session.session.token : null

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

      try { sessionStorage.removeItem('bhm_neon_verifier') } catch (_) {}

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
    // INVARIANT: init() 당 최대 1회만 호출. _reloadPending 가 function 스코프라
    // 두 번 이상 attach 하면 각 listener 가 독립된 flag 를 가져 cascade guard 가 깨진다.
    // 현재 init() 내 두 호출 지점은 mutually exclusive (mismatch early return vs 정상 경로).
    try { _knownSub = loadSettings().googleSub || null } catch (e) { _knownSub = null }
    var _reloadPending = false
    window.addEventListener('storage', function (e) {
      if (e.key !== 'bhm_settings') return
      var nextSub = null
      try { nextSub = (JSON.parse(e.newValue || '{}') || {}).googleSub || null } catch (err) { nextSub = null }
      if (nextSub === _knownSub) return
      _knownSub = nextSub
      if (_reloadPending) return  // cascade 방지
      _reloadPending = true

      if (window.SyncManager && typeof window.SyncManager.clearPendingPushes === 'function') {
        window.SyncManager.clearPendingPushes()
      }
      _jwtToken = null
      _session = null

      // 300ms 디바운스 — 같은 cascade 내 연속 이벤트 흡수
      setTimeout(function () { window.location.reload() }, 300)
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
