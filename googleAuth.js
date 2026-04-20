// ============================================================
// googleAuth.js — Google Identity Services (GIS) 인증 모듈
// Phase 1: Google Auth + 사용자별 localStorage 키 관리
// ============================================================
// 사용 방법:
//   window.GoogleAuth.init()          — 페이지 로드 후 호출
//   window.GoogleAuth.signIn()        — "Google로 연결" 버튼 클릭
//   window.GoogleAuth.signOut()       — "연결 해제" 버튼 클릭
//   window.GoogleAuth.isSignedIn()    — 로그인 여부 확인
//   window.GoogleAuth.getUser()       — { sub, email, name, picture }
//   window.GoogleAuth.getAccessToken()— 현재 access token (메모리)
//   window.GoogleAuth.requestDriveScope()    — Drive 권한 추가 요청
//   window.GoogleAuth.requestCalendarScope() — Calendar 권한 추가 요청
//   window.GoogleAuth.hasScope(scope) — 특정 scope 보유 여부

// GCP Console에서 발급받은 OAuth 2.0 Client ID
// 운영 도메인 기준 client id를 사용하되, 리뷰 모드에서만 UI 노출
// 실제 값은 config.js에서 주입
var CONFIG = window.BHM_CONFIG || {};
var GOOGLE_CLIENT_ID = CONFIG.googleClientId || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
var GOOGLE_AUTH_ENABLED = CONFIG.googleAuthEnabled !== false;

// ── bhm_settings 유틸 ──
// 기기 수준 설정 (Google sub, 동기화 설정 등)
function loadSettings() {
  try { return JSON.parse(localStorage.getItem('bhm_settings') || '{}'); } catch (e) { return {}; }
}
function saveSettings(patch) {
  var s = loadSettings();
  Object.assign(s, patch);
  localStorage.setItem('bhm_settings', JSON.stringify(s));
}
window.loadSettings = loadSettings;
window.saveSettings = saveSettings;

// ── getUserStorageKey ──
// Google sub 기반으로 사용자별 localStorage 키 namespace 생성
function getUserStorageKey(baseKey) {
  var settings = loadSettings();
  var uid = settings.googleSub || 'guest';
  return baseKey + '_' + uid;
}
window.getUserStorageKey = getUserStorageKey;

// ── GoogleAuth 모듈 ──
window.GoogleAuth = (function () {
  'use strict';

  var _tokenClient = null;
  var _accessToken = null;
  var _tokenExpiry = 0;   // Date.now() 기준 ms
  var _grantedScopes = [];
  // H-1 fix: GIS ignores per-call callbacks; use a resolver queue drained by the global callback
  var _pendingTokenQueue = [];  // Array<{ resolve, reject, type: 'refresh'|'drive'|'calendar' }>
  var _tokenRequestInFlight = false;
  var _signingOut = false; // signOut() 진행 중 → GIS 콜백 무시

  var SCOPE_BASE = 'openid email profile';
  var SCOPE_DRIVE = 'https://www.googleapis.com/auth/drive.appdata';
  var SCOPE_DRIVE_FILE = 'https://www.googleapis.com/auth/drive.file';
  var SCOPE_CALENDAR = CONFIG.googleCalendarScope || 'https://www.googleapis.com/auth/calendar.app.created';

  function _showToast(msg) {
    var toast = document.getElementById('otToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.display = 'block';
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(function () { toast.style.display = 'none'; }, 4000);
  }

  // ── 로그인 성공 전용 토스트 (체크 + fade-in + 체크 bounce) ──
  // otToast 가 있으면 재사용, 없으면 신규 div 를 띄운다. reload 전 1.5 초 노출.
  function _showLoginSuccessToast() {
    // 스타일을 1회만 주입
    if (!document.getElementById('bhm-login-toast-style')) {
      var style = document.createElement('style');
      style.id = 'bhm-login-toast-style';
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
        'animation:bhm-login-check-pop .4s cubic-bezier(.2,.9,.3,1.2) .08s both}';
      document.head.appendChild(style);
    }
    // 기존 것 제거 후 재생성
    var old = document.getElementById('bhm-login-toast');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var toast = document.createElement('div');
    toast.id = 'bhm-login-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    var chk = document.createElement('span');
    chk.className = 'chk';
    chk.textContent = '✓';
    var txt = document.createElement('span');
    txt.textContent = '로그인에 성공했습니다';
    toast.appendChild(chk);
    toast.appendChild(txt);
    document.body.appendChild(toast);
  }

  // ── 내부 헬퍼 ──
  function _isTokenValid() {
    return !!_accessToken && Date.now() < _tokenExpiry - 60000; // 1분 여유
  }

  function _saveUser(userInfo) {
    saveSettings({
      googleSub: userInfo.sub,
      googleEmail: userInfo.email,
      googleName: userInfo.name,
      googlePicture: userInfo.picture
    });
  }

  function _clearUser() {
    saveSettings({
      googleSub: null,
      googleEmail: null,
      googleName: null,
      googlePicture: null,
      driveEnabled: false,
      calendarEnabled: false
    });
    _accessToken = null;
    _tokenExpiry = 0;
    _grantedScopes = [];
  }

  // 데이터는 사용자의 Google Drive에 직접 저장된다 (개인정보보호 정책).
  // Supabase 세션 확립이나 백업 동기화는 사용하지 않는다 (2026-04-19 결정).

  // ── fetchUserInfo ──
  function fetchUserInfo(token) {
    return fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: 'Bearer ' + token }
    }).then(function (r) {
      if (!r.ok) throw new Error('userinfo ' + r.status);
      return r.json();
    });
  }

  // ── _flushTokenQueue ──
  // 전역 콜백에서 pending resolver 큐를 한 번에 드레인
  function _flushTokenQueue(err) {
    var queue = _pendingTokenQueue.splice(0);
    if (!queue.length) return false;
    queue.forEach(function (p) {
      if (err) { p.reject(err); return; }
      if (p.type === 'drive') saveSettings({ driveEnabled: true });
      if (p.type === 'calendar') saveSettings({ calendarEnabled: true });
      p.resolve(_accessToken);
    });
    if (!err) {
      if (typeof updateDriveBackupUI === 'function') updateDriveBackupUI();
      if (typeof updateCalendarUI === 'function') updateCalendarUI();
    }
    return true;
  }

  // ── init ──
  function init() {
    if (_tokenClient) return; // 이미 초기화됨
    if (!GOOGLE_AUTH_ENABLED) return;
    if (!window.google || !window.google.accounts) {
      console.warn('[GoogleAuth] GIS SDK not loaded yet');
      return;
    }
    if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
      console.warn('[GoogleAuth] CLIENT_ID가 설정되지 않았습니다. GCP Console에서 발급 후 googleAuth.js에 입력하세요.');
      return;
    }

    // 첫 로그인부터 Drive + Calendar scope 까지 한 번에 요청한다.
    // 사용자 기대: "Google 로그인 = Drive/Calendar 자동 연동" — 별도 토글로 추가 동의를 받지 않는다.
    // 트레이드오프: 동의 화면이 길어진다 (사용자가 거부할 가능성 ↑) — 그래도 명시적 통합 UX를 우선한다.
    _tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPE_BASE + ' ' + SCOPE_DRIVE + ' ' + SCOPE_DRIVE_FILE + ' ' + SCOPE_CALENDAR,
      callback: function (response) {
        _tokenRequestInFlight = false;
        if (_signingOut) return; // signOut 진행 중 → 계정 선택창 표시 방지

        if (response.error) {
          // 큐에 대기 중인 요청이 있으면 모두 reject, 아니면 초기 로그인 에러 로그
          if (!_flushTokenQueue(new Error(response.error))) {
            console.error('[GoogleAuth] token error:', response.error);
          }
          return;
        }

        // 공통: 토큰 상태 갱신
        _accessToken = response.access_token;
        _tokenExpiry = Date.now() + (response.expires_in || 3600) * 1000;
        if (response.scope) { _grantedScopes = response.scope.split(' '); }

        // 큐가 있으면 refresh/scope 요청 → resolve 후 종료
        if (_flushTokenQueue(null)) return;

        // 큐가 없으면 초기 로그인 → userInfo fetch + 전체 초기화
        var wasDemo = localStorage.getItem('bhm_demo_mode') === '1';
        fetchUserInfo(_accessToken).then(function (userInfo) {
          _saveUser(userInfo);
          if (typeof updateAuthUI === 'function') updateAuthUI(userInfo);

          if (wasDemo && window.exitDemoMode) {
            window.exitDemoMode();
            var demoBanner = document.getElementById('demoBanner');
            if (demoBanner) demoBanner.style.display = 'none';
          }
          if (response.scope) {
            var scopes = response.scope.split(' ');
            saveSettings({
              driveEnabled: scopes.indexOf(SCOPE_DRIVE) !== -1,
              calendarEnabled: scopes.indexOf(SCOPE_CALENDAR) !== -1
            });
          }
          if (typeof updateDriveBackupUI === 'function') updateDriveBackupUI();
          if (typeof updateCalendarUI === 'function') updateCalendarUI();
          if (window.SyncManager) {
            window.SyncManager.fullSync().then(function () {
              if (wasDemo) {
                if (window.OT && window.OT.renderList) window.OT.renderList();
                if (window.LEAVE && window.LEAVE.renderList) window.LEAVE.renderList();
                if (window.PROFILE && window.PROFILE.render) window.PROFILE.render();
              }
              // 로그인 성공 애니메이션 토스트 → 1.5초 후 페이지 리프레시.
              // Drive 에서 pull 된 데이터(profile/overtime/leave/payslip)를 UI 전체에
              // 일관되게 반영하기 위해 reload. 토스트가 사라지기 전 reload 되므로
              // 사용자는 "로그인 성공 → 데이터 로딩" 흐름으로 인지한다.
              _showLoginSuccessToast();
              setTimeout(function () { window.location.reload(); }, 1500);
            }).catch(function () {
              // fullSync 가 실패해도 로그인 자체는 성공 — 토스트만 띄우고 reload
              _showLoginSuccessToast();
              setTimeout(function () { window.location.reload(); }, 1500);
            });
          }
        }).catch(function (err) {
          console.error('[GoogleAuth] fetchUserInfo failed:', err);
        });
      },
      error_callback: function (err) {
        // GIS silent refresh 실패 등 — 계정 선택창/리다이렉트 대신 조용히 reject.
        // 대기 중인 _withToken 호출들은 error 를 받아 각자 처리 (대부분 조용히 스킵).
        _tokenRequestInFlight = false;
        if (!_flushTokenQueue(new Error('token_error: ' + (err && (err.type || err.message) || 'unknown')))) {
          console.warn('[GoogleAuth] token error_callback (no queue):', err && err.type, err && err.message);
        }
      }
    });

    // 저장된 사용자 정보로 UI 복원 (token은 없지만 이름/아바타 표시)
    var settings = loadSettings();
    if (settings.googleSub) {
      if (typeof updateAuthUI === 'function') updateAuthUI({
        sub: settings.googleSub,
        email: settings.googleEmail,
        name: settings.googleName,
        picture: settings.googlePicture
      });
    } else {
      if (typeof updateAuthUI === 'function') updateAuthUI(null);
    }

    // I1: 탭 간 로그인 상태 동기화
    // 다른 탭이 로그인/로그아웃/계정전환을 수행하면 googleSub 값이 바뀐다.
    // 이 탭이 메모리에 갖고 있는 _accessToken 은 이전 계정 것이므로 그대로 쓰면 데이터가 섞인다.
    // → 현재 탭의 pending push 를 중단하고 새로고침해 상태를 재정합.
    _attachCrossTabSync();

    // 페이지 로드 직후 token warmup — 로그인 상태면 silent refresh 로 _accessToken 을
    // 미리 받아둔다. 실패(세션 만료/쿠키 차단) 하면 error_callback 이 조용히 reject —
    // 사용자가 Drive 작업을 시도할 때 "다시 연결" 안내를 보게 된다. picker 는 뜨지 않는다.
    // 데모 모드는 googleSub='demo' 허수 값이므로 warmup 건너뛴다.
    var isDemoMode = localStorage.getItem('bhm_demo_mode') === '1';
    if (settings.googleSub && settings.googleSub !== 'demo' && !isDemoMode) {
      refreshToken().catch(function (err) {
        console.warn('[GoogleAuth] init-time token warmup failed (sign-in required):', err && err.message);
      });
    }
  }

  var _knownSub = null;
  function _attachCrossTabSync() {
    try { _knownSub = loadSettings().googleSub || null; } catch (e) { _knownSub = null; }
    window.addEventListener('storage', function (e) {
      if (e.key !== 'bhm_settings') return;
      var nextSub = null;
      try { nextSub = (JSON.parse(e.newValue || '{}') || {}).googleSub || null; } catch (err) { nextSub = null; }
      if (nextSub === _knownSub) return; // googleSub 외 필드(driveEnabled 등) 변경은 무시
      _knownSub = nextSub;
      if (window.SyncManager && typeof window.SyncManager.clearPendingPushes === 'function') {
        window.SyncManager.clearPendingPushes();
      }
      _accessToken = null;
      _tokenExpiry = 0;
      _grantedScopes = [];
      window.location.reload();
    });
  }

  // ── signIn ──
  function signIn() {
    if (!_tokenClient) {
      init(); // GIS SDK가 늦게 로드된 경우 재시도
    }
    if (!_tokenClient) {
      console.warn('[GoogleAuth] GIS SDK가 아직 로드되지 않았습니다.');
      _showToast('잠시 후 다시 시도해주세요.');
      return;
    }
    _tokenClient.requestAccessToken({ prompt: 'select_account' });
  }

  // ── signOut ──
  // 1) 진행 중인 Drive push 큐를 즉시 취소 (C4: 계정 전환 경합 차단)
  // 2) revoke 가 실제로 전송된 뒤 reload (C3: 토큰 원격 무효화 보장)
  //    - Promise 콜백 경로가 우선, 페이지 종료 시 sendBeacon 으로 백업
  function signOut() {
    // in-flight 토큰 요청이 계정 선택창을 열지 못하도록 즉시 차단
    _signingOut = true;
    _pendingTokenQueue.splice(0);
    _tokenRequestInFlight = false;

    // 데모 모드에서 연결 해제: exitDemoMode + sessionStorage 정리 후 clean URL 이동
    if (localStorage.getItem('bhm_demo_mode') === '1') {
      if (window.exitDemoMode) window.exitDemoMode();
      if (window.SyncManager && typeof window.SyncManager.clearPendingPushes === 'function') {
        window.SyncManager.clearPendingPushes();
      }
      window.location.href = 'index.html?app=1';
      return;
    }

    if (window.SyncManager && typeof window.SyncManager.clearPendingPushes === 'function') {
      window.SyncManager.clearPendingPushes();
    }

    // M-4: 토큰을 즉시 무효화해 revoke 완료 전 window에 노출되지 않도록 함
    var tokenToRevoke = _accessToken;
    _accessToken = null;
    _tokenExpiry = 0;

    function finalize() {
      _clearUser();
      if (typeof updateAuthUI === 'function') updateAuthUI(null);
      // getUserStorageKey는 이제 'guest'를 반환 → 기존 데이터 접근 불가 (의도된 동작)
      window.location.reload();
    }

    if (tokenToRevoke && navigator.sendBeacon) {
      try {
        var url = 'https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(tokenToRevoke);
        navigator.sendBeacon(url, new Blob([], { type: 'application/x-www-form-urlencoded' }));
      } catch (e) {
        console.warn('[GoogleAuth] sendBeacon revoke failed:', e);
      }
    }

    if (tokenToRevoke && window.google && window.google.accounts && window.google.accounts.oauth2) {
      var called = false;
      var done = function () {
        if (called) return;
        called = true;
        finalize();
      };
      try {
        window.google.accounts.oauth2.revoke(tokenToRevoke, done);
      } catch (e) {
        console.warn('[GoogleAuth] revoke threw:', e);
      }
      // GIS revoke 콜백이 유실될 가능성 대비 2초 후 강제 finalize
      setTimeout(done, 2000);
    } else {
      finalize();
    }
  }

  // ── isSignedIn (legacy) ──
  // 과거 호출부 호환용. 의미상 "이 기기가 어떤 Google 계정과 연결된 적 있음" 과 동일.
  // 새 코드는 목적에 따라 hasValidToken() 또는 hasAccountLink() 를 명시적으로 사용한다.
  function isSignedIn() {
    return hasAccountLink();
  }

  // 현재 메모리에 유효한 access token 이 있는지. Drive/Calendar 네트워크 호출의 전제.
  function hasValidToken() {
    return _isTokenValid();
  }

  // 이 기기가 Google 계정과 연결되어 있는지 (토큰 유효성과 무관).
  // UI 표시, 키 사일로 결정 용도.
  function hasAccountLink() {
    var settings = loadSettings();
    return !!settings.googleSub;
  }

  // ── getUser ──
  function getUser() {
    var settings = loadSettings();
    if (!settings.googleSub) return null;
    return {
      sub: settings.googleSub,
      email: settings.googleEmail,
      name: settings.googleName,
      picture: settings.googlePicture
    };
  }

  // ── getAccessToken ──
  // 유효한 토큰 반환. 만료 시 null (호출자가 refreshToken() 필요)
  function getAccessToken() {
    if (_isTokenValid()) return _accessToken;
    return null;
  }

  // ── _enqueueTokenRequest ──
  // 공통: 큐에 resolver 추가 후 in-flight 아닐 때만 requestAccessToken 호출.
  // prompt: 'none' → 조용한 refresh 만 시도. 세션 만료/쿠키 차단 등으로 interactive 가
  // 필요하면 GIS 가 picker 를 띄우는 대신 error_callback 을 호출 → 조용히 reject.
  // 이걸로 "로그인 되어있는데 업로드 클릭 시 계정 선택창 뜸" 문제를 차단한다.
  function _enqueueTokenRequest(resolve, reject, type) {
    _pendingTokenQueue.push({ resolve: resolve, reject: reject, type: type });
    if (!_tokenRequestInFlight) {
      _tokenRequestInFlight = true;
      _tokenClient.requestAccessToken({ prompt: 'none' });
    }
  }

  // ── refreshToken ──
  function refreshToken() {
    return new Promise(function (resolve, reject) {
      if (!_tokenClient) { reject(new Error('not initialized')); return; }
      if (_signingOut || !hasAccountLink()) { reject(new Error('not signed in')); return; }
      if (_isTokenValid()) { resolve(_accessToken); return; }
      _enqueueTokenRequest(resolve, reject, 'refresh');
    });
  }

  // ── ensureTokenInteractive ──
  // 사용자 액션(업로드 등) 직후 호출. 토큰이 유효하면 즉시, 아니면 interactive prompt 허용.
  // silent refresh 실패 시 picker 를 띄워 사용자가 다시 consent 할 수 있게 한다.
  // (refreshToken 은 strict silent. 업로드처럼 사용자가 방금 클릭한 액션에는 picker OK)
  function ensureTokenInteractive() {
    return new Promise(function (resolve, reject) {
      if (!_tokenClient) { reject(new Error('not initialized')); return; }
      if (_signingOut || !hasAccountLink()) { reject(new Error('not signed in')); return; }
      if (_isTokenValid()) { resolve(_accessToken); return; }
      _pendingTokenQueue.push({ resolve: resolve, reject: reject, type: 'refresh' });
      if (!_tokenRequestInFlight) {
        _tokenRequestInFlight = true;
        // prompt: '' → silent 우선, 실패 시 picker fallback 허용
        _tokenClient.requestAccessToken({ prompt: '' });
      }
    });
  }

  // ── requestDriveScope ──
  function requestDriveScope() {
    return new Promise(function (resolve, reject) {
      if (!_tokenClient) { reject(new Error('not initialized')); return; }
      if (hasScope(SCOPE_DRIVE) && _isTokenValid()) { resolve(_accessToken); return; }
      _enqueueTokenRequest(resolve, reject, 'drive');
    });
  }

  // ── requestCalendarScope ──
  function requestCalendarScope() {
    return new Promise(function (resolve, reject) {
      if (!_tokenClient) { reject(new Error('not initialized')); return; }
      if (hasScope(SCOPE_CALENDAR) && _isTokenValid()) { resolve(_accessToken); return; }
      _enqueueTokenRequest(resolve, reject, 'calendar');
    });
  }

  // ── hasScope ──
  function hasScope(scope) {
    return _grantedScopes.indexOf(scope) !== -1;
  }

  // ── isReady ──
  // GIS token client 가 init 완료되어 token 요청 가능한 상태인지.
  // pullOnResume 같은 이벤트 핸들러가 페이지 로드 중에 발화할 때
  // 아직 init 안 됐으면 Drive 호출을 스킵하기 위함 (race condition 방지).
  function isReady() {
    return !!_tokenClient;
  }

  return {
    init: init,
    signIn: signIn,
    signOut: signOut,
    isSignedIn: isSignedIn,
    isReady: isReady,
    hasValidToken: hasValidToken,
    hasAccountLink: hasAccountLink,
    getUser: getUser,
    getAccessToken: getAccessToken,
    refreshToken: refreshToken,
    ensureTokenInteractive: ensureTokenInteractive,
    requestDriveScope: requestDriveScope,
    requestCalendarScope: requestCalendarScope,
    hasScope: hasScope,
    // 테스트용 내부 접근
    _fetchUserInfo: fetchUserInfo
  };
})();
