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

// ── getUserStorageKey 재정의 ──
// supabaseClient.js의 함수를 덮어써서 Google sub 기반 키 사용
// Phase 5 이후 supabaseClient.js에서 중복 제거
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

  var SCOPE_BASE = 'openid email profile';
  var SCOPE_DRIVE = 'https://www.googleapis.com/auth/drive.appdata';
  var SCOPE_CALENDAR = CONFIG.googleCalendarScope || 'https://www.googleapis.com/auth/calendar.app.created';

  function _showToast(msg) {
    var toast = document.getElementById('otToast');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.display = 'block';
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(function () { toast.style.display = 'none'; }, 4000);
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

  // ── fetchUserInfo ──
  function fetchUserInfo(token) {
    return fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: 'Bearer ' + token }
    }).then(function (r) {
      if (!r.ok) throw new Error('userinfo ' + r.status);
      return r.json();
    });
  }

  // ── handleTokenResponse ──
  // GIS tokenClient.callback에서 호출됨
  function handleTokenResponse(response, onSuccess, onError) {
    if (response.error) {
      console.error('[GoogleAuth] token error:', response.error);
      if (onError) onError(response.error);
      return;
    }

    _accessToken = response.access_token;
    _tokenExpiry = Date.now() + (response.expires_in || 3600) * 1000;
    if (response.scope) {
      _grantedScopes = response.scope.split(' ');
    }

    fetchUserInfo(_accessToken).then(function (userInfo) {
      _saveUser(userInfo);
      updateAuthUI(userInfo);
      if (onSuccess) onSuccess(userInfo);
    }).catch(function (err) {
      console.error('[GoogleAuth] fetchUserInfo failed:', err);
      if (onError) onError(err);
    });
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
      scope: SCOPE_BASE + ' ' + SCOPE_DRIVE + ' ' + SCOPE_CALENDAR,
      callback: function (response) {
        handleTokenResponse(response, function (user) {
          // 데모 모드 자동 해제: Google 로그인 성공 시 샘플 데이터 제거
          var wasDemo = localStorage.getItem('bhm_demo_mode') === '1';
          if (wasDemo && window.exitDemoMode) {
            window.exitDemoMode();
            var demoBanner = document.getElementById('demoBanner');
            if (demoBanner) demoBanner.style.display = 'none';
          }
          // 로그인 성공 = Drive/Calendar 동의 완료. 즉시 활성화.
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
              // 데모였다면 Drive 복원 여부와 무관하게 UI 갱신 (빈 상태 표시)
              if (wasDemo) {
                if (window.OT && window.OT.renderList) window.OT.renderList();
                if (window.LEAVE && window.LEAVE.renderList) window.LEAVE.renderList();
                if (window.PROFILE && window.PROFILE.render) window.PROFILE.render();
              }
            });
          }
        });
      }
    });

    // 저장된 사용자 정보로 UI 복원 (token은 없지만 이름/아바타 표시)
    var settings = loadSettings();
    if (settings.googleSub) {
      updateAuthUI({
        sub: settings.googleSub,
        email: settings.googleEmail,
        name: settings.googleName,
        picture: settings.googlePicture
      });
    } else {
      updateAuthUI(null);
    }

    // I1: 탭 간 로그인 상태 동기화
    // 다른 탭이 로그인/로그아웃/계정전환을 수행하면 googleSub 값이 바뀐다.
    // 이 탭이 메모리에 갖고 있는 _accessToken 은 이전 계정 것이므로 그대로 쓰면 데이터가 섞인다.
    // → 현재 탭의 pending push 를 중단하고 새로고침해 상태를 재정합.
    _attachCrossTabSync();
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
    _tokenClient.requestAccessToken({ prompt: 'consent' });
  }

  // ── signOut ──
  // 1) 진행 중인 Drive push 큐를 즉시 취소 (C4: 계정 전환 경합 차단)
  // 2) revoke 가 실제로 전송된 뒤 reload (C3: 토큰 원격 무효화 보장)
  //    - Promise 콜백 경로가 우선, 페이지 종료 시 sendBeacon 으로 백업
  // 3) Supabase 세션도 함께 종료 (I4: 이중 auth 상태 불일치 제거)
  function signOut() {
    if (window.SyncManager && typeof window.SyncManager.clearPendingPushes === 'function') {
      window.SyncManager.clearPendingPushes();
    }

    // Supabase 병행 세션 정리 (실패해도 흐름 진행)
    if (window.SupabaseClient && window.SupabaseClient.auth && typeof window.SupabaseClient.auth.signOut === 'function') {
      try { window.SupabaseClient.auth.signOut(); } catch (e) {
        console.warn('[GoogleAuth] supabase signOut failed:', e);
      }
    }

    var tokenToRevoke = _accessToken;

    function finalize() {
      _clearUser();
      updateAuthUI(null);
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

  // ── refreshToken ──
  // access token이 만료된 경우 재발급 요청
  function refreshToken() {
    return new Promise(function (resolve, reject) {
      if (!_tokenClient) { reject(new Error('not initialized')); return; }
      _tokenClient.requestAccessToken({
        prompt: '',
        callback: function (response) {
          if (response.error) { reject(new Error(response.error)); return; }
          _accessToken = response.access_token;
          _tokenExpiry = Date.now() + (response.expires_in || 3600) * 1000;
          resolve(_accessToken);
        }
      });
    });
  }

  // ── requestDriveScope ──
  function requestDriveScope() {
    return new Promise(function (resolve, reject) {
      if (!_tokenClient) { reject(new Error('not initialized')); return; }
      if (hasScope(SCOPE_DRIVE) && _isTokenValid()) { resolve(_accessToken); return; }
      _tokenClient.requestAccessToken({
        scope: SCOPE_BASE + ' ' + SCOPE_DRIVE,
        prompt: '',
        callback: function (response) {
          handleTokenResponse(response, function () {
            saveSettings({ driveEnabled: true });
            resolve(_accessToken);
          }, reject);
        }
      });
    });
  }

  // ── requestCalendarScope ──
  function requestCalendarScope() {
    return new Promise(function (resolve, reject) {
      if (!_tokenClient) { reject(new Error('not initialized')); return; }
      if (hasScope(SCOPE_CALENDAR) && _isTokenValid()) { resolve(_accessToken); return; }
      _tokenClient.requestAccessToken({
        scope: SCOPE_BASE + ' ' + SCOPE_CALENDAR,
        prompt: '',
        callback: function (response) {
          handleTokenResponse(response, function () {
            saveSettings({ calendarEnabled: true });
            resolve(_accessToken);
          }, reject);
        }
      });
    });
  }

  // ── hasScope ──
  function hasScope(scope) {
    return _grantedScopes.indexOf(scope) !== -1;
  }

  return {
    init: init,
    signIn: signIn,
    signOut: signOut,
    isSignedIn: isSignedIn,
    hasValidToken: hasValidToken,
    hasAccountLink: hasAccountLink,
    getUser: getUser,
    getAccessToken: getAccessToken,
    refreshToken: refreshToken,
    requestDriveScope: requestDriveScope,
    requestCalendarScope: requestCalendarScope,
    hasScope: hasScope,
    // 테스트용 내부 접근
    _fetchUserInfo: fetchUserInfo
  };
})();
