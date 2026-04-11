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
// https://console.cloud.google.com/apis/credentials
var GOOGLE_CLIENT_ID = '914163950802-vov9iusqqaj0139g06ccbo4q8pp6dcbl.apps.googleusercontent.com';

// ── 베타 플래그 ──
// false: 일반 사용자에게 Google 연결 버튼 숨김 (개발 완료 후 true로 변경)
var GOOGLE_AUTH_ENABLED = false;

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
  var SCOPE_CALENDAR = 'https://www.googleapis.com/auth/calendar';

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
    // 베타 플래그: 일반 사용자에게 Google 연결 버튼 숨김
    if (!GOOGLE_AUTH_ENABLED) {
      var authContainer = document.getElementById('authContainer');
      if (authContainer) authContainer.style.display = 'none';
      return;
    }
    if (!window.google || !window.google.accounts) {
      console.warn('[GoogleAuth] GIS SDK not loaded yet');
      return;
    }
    if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
      console.warn('[GoogleAuth] CLIENT_ID가 설정되지 않았습니다. GCP Console에서 발급 후 googleAuth.js에 입력하세요.');
      return;
    }

    _tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPE_BASE,
      callback: function (response) {
        handleTokenResponse(response, function (user) {
          // 로그인 성공 시: Drive 백업 + Calendar UI 업데이트 후 fullSync
          if (typeof updateDriveBackupUI === 'function') updateDriveBackupUI();
          if (typeof updateCalendarUI === 'function') updateCalendarUI();
          if (window.SyncManager) window.SyncManager.fullSync();
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
  }

  // ── signIn ──
  function signIn() {
    if (!_tokenClient) {
      console.warn('[GoogleAuth] init()가 먼저 호출되어야 합니다.');
      return;
    }
    _tokenClient.requestAccessToken({ prompt: 'consent' });
  }

  // ── signOut ──
  function signOut() {
    var settings = loadSettings();
    if (_accessToken && window.google && window.google.accounts) {
      window.google.accounts.oauth2.revoke(_accessToken, function () {
        console.log('[GoogleAuth] token revoked');
      });
    }
    _clearUser();
    updateAuthUI(null);
    // getUserStorageKey는 이제 'guest'를 반환 → 기존 데이터 접근 불가 (의도된 동작)
    window.location.reload();
  }

  // ── isSignedIn ──
  // access token이 유효하거나, settings에 sub가 있으면 "연결됨" 상태
  function isSignedIn() {
    if (_isTokenValid()) return true;
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
