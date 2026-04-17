// settings-ui.js — 설정 탭 UI (인증, AppLock, Drive, Calendar, 팀 스케줄)
// ── Google 로그인 UI 업데이트 함수 ──
// GoogleAuth.init() / handleTokenResponse() / signOut()에서 호출됨
// shared-layout.js의 _sharedAuthRenderUser / _sharedAuthRenderSignIn을 재사용
function updateAuthUI(user) {
  var authContainer = document.getElementById('authContainer');
  if (!authContainer) return;

  var userId = user && (user.sub || user.id);
  if (userId) {
    var settings = (window.loadSettings && window.loadSettings()) || {};
    // settings의 driveEnabled/calendarEnabled를 user 객체에 병합해서 전달
    var merged = {
      googleSub: user.sub || user.id,
      googleName: user.name || user.email || (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || '',
      googlePicture: user.picture || (user.user_metadata && user.user_metadata.avatar_url) || '',
      driveEnabled: settings.driveEnabled,
      calendarEnabled: settings.calendarEnabled,
    };
    if (window._sharedAuthRenderUser) {
      window._sharedAuthRenderUser(authContainer, merged);
    }
    // 게스트 배너 제거 (로그인 완료)
    var banner = document.getElementById('guestNoticeBanner');
    if (banner) banner.remove();
  } else {
    if (window._sharedAuthRenderSignIn) {
      window._sharedAuthRenderSignIn(authContainer);
    }
  }

  if (typeof updateTeamScheduleSyncUI === 'function') updateTeamScheduleSyncUI();
}
// GIS 로드 완료 후 GoogleAuth.init() 호출 (window 'load' 이벤트)
window.addEventListener('load', function () {
  if (window.GoogleAuth) window.GoogleAuth.init();
});

// ── AppLock: Google 재인증 완료 콜백 처리 ──
// googleAuth.js의 handleTokenResponse 성공 시 _appLockReauthPending 플래그를 확인한다.
// 이 훅은 기존 updateAuthUI가 호출된 뒤 실행된다.
var _origUpdateAuthUI = window.updateAuthUI;
window.updateAuthUI = function (user) {
  if (typeof _origUpdateAuthUI === 'function') _origUpdateAuthUI(user);
  // PIN 재인증 완료 처리
  if (user && window._appLockReauthPending && window.AppLock) {
    window._appLockReauthPending = false;
    var cb = window._appLockReauthCallback;
    window._appLockReauthCallback = null;
    // 기존 PIN 삭제 후 재설정 모달 표시
    window.AppLock.disablePin();
    window.AppLock.BiometricLock.disable();
    if (typeof cb === 'function') cb();
    else window.AppLock._showPinSetupModal(function () {
      window.AppLock.unlock();
      updateAppLockUI();
    });
  }
  // PIN 넛지 체크: 첫 Google 로그인 성공 + PIN 미설정 + 넛지 미거부
  if (user && window.AppLock && !AppLock.isEnabled()) {
    var s = window.loadSettings ? window.loadSettings() : {};
    if (!s.pinNudgeDismissed) {
      setTimeout(function () { _showPinNudge(); }, 500);
    }
  }
};

// ── PIN 설정 넛지 바텀시트 ──
function _showPinNudge() {
  if (document.getElementById('pinNudgeSheet')) return;
  var sheet = document.createElement('div');
  sheet.id = 'pinNudgeSheet';
  sheet.style.cssText = [
    'position:fixed;bottom:0;left:0;right:0;z-index:99998;',
    'background:var(--bg-card,#fff);border-radius:16px 16px 0 0;',
    'padding:24px 20px 32px;box-shadow:0 -4px 24px rgba(0,0,0,0.15);',
    'max-width:640px;margin:0 auto;transform:translateY(100%);',
    'transition:transform 0.3s ease;'
  ].join('');

  var icon = document.createElement('div');
  icon.textContent = '🔒';
  icon.style.cssText = 'font-size:2rem;text-align:center;margin-bottom:8px;';
  sheet.appendChild(icon);

  var title = document.createElement('h3');
  title.textContent = '앱을 잠가서 내 정보를 보호하세요';
  title.style.cssText = 'text-align:center;font-size:1.05rem;font-weight:700;margin-bottom:6px;color:var(--text-primary,#1a1a1a);';
  sheet.appendChild(title);

  var desc = document.createElement('p');
  desc.textContent = '급여·휴가 기록은 민감한 정보예요. PIN을 설정하면 다른 사람이 기기를 보더라도 내 기록을 볼 수 없어요.';
  desc.style.cssText = 'text-align:center;font-size:0.85rem;color:var(--text-muted,#777);margin-bottom:20px;line-height:1.5;';
  sheet.appendChild(desc);

  var setupBtn = document.createElement('button');
  setupBtn.textContent = '🔒 PIN 설정할게요';
  setupBtn.className = 'btn btn-primary';
  setupBtn.style.cssText = 'width:100%;margin-bottom:10px;';
  setupBtn.onclick = function () {
    sheet.style.transform = 'translateY(100%)';
    setTimeout(function () { if (sheet.parentNode) sheet.parentNode.removeChild(sheet); }, 300);
    if (window.AppLock) {
      AppLock._showPinSetupModal(function () {
        AppLock.unlock();
        updateAppLockUI();
      });
    }
  };
  sheet.appendChild(setupBtn);

  var laterBtn = document.createElement('button');
  laterBtn.textContent = '나중에';
  laterBtn.style.cssText = 'width:100%;background:none;border:none;color:var(--text-muted,#777);font-size:0.9rem;cursor:pointer;padding:4px;';
  laterBtn.onclick = function () {
    if (window.saveSettings) saveSettings({ pinNudgeDismissed: true });
    sheet.style.transform = 'translateY(100%)';
    setTimeout(function () { if (sheet.parentNode) sheet.parentNode.removeChild(sheet); }, 300);
  };
  sheet.appendChild(laterBtn);

  document.body.appendChild(sheet);
  // 애니메이션 트리거
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      sheet.style.transform = 'translateY(0)';
    });
  });
}

// ── Google Drive 백업 섹션 표시 ──
// 로그인되어 있고 Drive scope 동의가 완료된 경우 섹션을 노출한다.
// 사용자는 토글로 끄지 않는다 (로그아웃이 곧 백업 중단).
function updateDriveBackupUI() {
  var section = document.getElementById('googleBackupSection');
  if (!section) return;
  var settings = window.loadSettings ? window.loadSettings() : {};
  var isLinked = window.GoogleAuth && window.GoogleAuth.hasAccountLink();
  section.style.display = (isLinked && settings.driveEnabled) ? 'block' : 'none';
}

// ── Google Calendar 섹션 표시 ──
function updateCalendarUI() {
  var section = document.getElementById('googleCalendarSection');
  if (!section) return;
  var settings = window.loadSettings ? window.loadSettings() : {};
  var isLinked = window.GoogleAuth && window.GoogleAuth.hasAccountLink();
  section.style.display = (isLinked && settings.calendarEnabled) ? 'block' : 'none';

  if (isLinked && settings.calendarEnabled) {
    var privacyMode = settings.calendarPrivacyMode || 'genericTitle';
    var radios = document.querySelectorAll('input[name="calendarPrivacy"]');
    radios.forEach(function (r) { r.checked = (r.value === privacyMode); });
  }
}

// 이벤트 제목 방식 변경
function onCalendarPrivacyChange(mode) {
  if (window.saveSettings) window.saveSettings({ calendarPrivacyMode: mode });
}

// 전체 다시 동기화 버튼 핸들러
function onCalendarResyncAll(btn) {
  if (!window.GoogleCalendarSync) return;
  if (btn) btn.disabled = true;
  window.GoogleCalendarSync.resyncAll().then(function () {
    var toast = document.getElementById('otToast');
    if (toast) {
      toast.textContent = '✅ 모든 휴가 기록을 Calendar에 동기화했어요.';
      toast.style.display = 'block';
      setTimeout(function () { toast.style.display = 'none'; }, 3000);
    }
  }).catch(function (e) {
    console.warn('[Calendar] resyncAll failed:', e);
  }).finally(function () {
    if (btn) btn.disabled = false;
  });
}

function onDriveBackupToggle(btn) {
  var settings = JSON.parse(localStorage.getItem('bhm_settings') || '{}');
  settings.driveBackupEnabled = !settings.driveBackupEnabled;
  localStorage.setItem('bhm_settings', JSON.stringify(settings));
  var label = document.getElementById('driveBackupLabel');
  if (label) label.textContent = settings.driveBackupEnabled ? '● 켜짐' : '● 꺼짐';
  if (label) label.style.color = settings.driveBackupEnabled ? '#34A853' : '#9CA3AF';
}

function onDriveManualSync(btn) {
  if (!window.SyncManager) return;
  if (btn) btn.disabled = true;
  Promise.resolve(window.SyncManager.pushAll ? window.SyncManager.pushAll() : null)
    .then(function () { showOtToast('✅ Drive 동기화 완료'); })
    .catch(function (e) { console.warn('[Drive] manualSync failed:', e); })
    .finally(function () { if (btn) btn.disabled = false; });
}

function onCalendarToggle(btn) {
  var settings = JSON.parse(localStorage.getItem('bhm_settings') || '{}');
  settings.calendarEnabled = !settings.calendarEnabled;
  localStorage.setItem('bhm_settings', JSON.stringify(settings));
  var label = document.getElementById('calendarToggleLabel');
  if (label) label.textContent = settings.calendarEnabled ? '● 켜짐' : '● 꺼짐';
  if (label) label.style.color = settings.calendarEnabled ? '#34A853' : '#9CA3AF';
}

function showOtToast(message) {
  var toast = document.getElementById('otToast');
  if (!toast) return;
  toast.textContent = message;
  toast.style.display = 'block';
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(function () { toast.style.display = 'none'; }, 3000);
}

async function getSupabaseAccessTokenForApi() {
  if (!window.SupabaseClient) return null;
  try {
    var sessionResult = await window.SupabaseClient.auth.getSession();
    return sessionResult && sessionResult.data && sessionResult.data.session
      ? sessionResult.data.session.access_token
      : null;
  } catch (e) {
    console.warn('[TeamSchedule] Failed to read session:', e);
    return null;
  }
}

function buildCurrentMonthRange() {
  var now = new Date();
  var start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  var end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  };
}

// ── 앱 잠금 설정 UI ──
function updateAppLockUI() {
  if (!window.AppLock) return;
  var enabled = AppLock.isEnabled();
  var settings = window.loadSettings ? window.loadSettings() : {};
  var hasBiometric = !!settings.biometricCredId;
  var offDiv = document.getElementById('appLockOff');
  var onDiv = document.getElementById('appLockOn');
  var badge = document.getElementById('appLockStatusBadge');
  var bioRow = document.getElementById('biometricSettingRow');
  var bioOff = document.getElementById('biometricOff');
  var bioOn = document.getElementById('biometricOn');

  if (offDiv) offDiv.style.display = enabled ? 'none' : 'block';
  if (onDiv) onDiv.style.display = enabled ? 'block' : 'none';
  if (badge) badge.style.display = enabled ? 'inline-flex' : 'none';

  if (bioRow) bioRow.style.display = (enabled && AppLock.BiometricLock.isSupported()) ? 'block' : 'none';
  if (bioOff) bioOff.style.display = hasBiometric ? 'none' : 'block';
  if (bioOn) bioOn.style.display = hasBiometric ? 'block' : 'none';
}

function onAppLockSetupPin() {
  if (!window.AppLock) return;
  AppLock._showPinSetupModal(function () {
    updateAppLockUI();
    var toast = document.getElementById('otToast');
    if (toast) {
      toast.textContent = '✅ PIN이 설정됐어요. 다음 방문부터 잠금이 적용됩니다.';
      toast.style.display = 'block';
      setTimeout(function () { toast.style.display = 'none'; }, 3000);
    }
  });
}

function onAppLockChangePin() {
  if (!window.AppLock) return;
  // 현재 PIN 먼저 확인 후 새 PIN 설정
  AppLock._showPinSetupModal(function () {
    updateAppLockUI();
    var toast = document.getElementById('otToast');
    if (toast) {
      toast.textContent = '✅ PIN이 변경됐어요.';
      toast.style.display = 'block';
      setTimeout(function () { toast.style.display = 'none'; }, 3000);
    }
  });
}

function onAppLockDisable() {
  if (!window.AppLock) return;
  if (!confirm('PIN 잠금을 해제하시겠어요?\n앱이 잠금 없이 열립니다.')) return;
  AppLock.disablePin();
  AppLock.BiometricLock.disable();
  updateAppLockUI();
}

function onBiometricRegister() {
  if (!window.AppLock) return;
  AppLock.BiometricLock.register().then(function () {
    updateAppLockUI();
    var toast = document.getElementById('otToast');
    if (toast) {
      toast.textContent = '✅ 생체인증이 등록됐어요.';
      toast.style.display = 'block';
      setTimeout(function () { toast.style.display = 'none'; }, 3000);
    }
  }).catch(function (e) {
    var toast = document.getElementById('otToast');
    if (toast) {
      toast.textContent = '⚠️ 생체인증 등록에 실패했어요: ' + (e.message || '');
      toast.style.display = 'block';
      setTimeout(function () { toast.style.display = 'none'; }, 4000);
    }
  });
}

function onBiometricDisable() {
  if (!window.AppLock) return;
  if (!confirm('생체인증을 제거하시겠어요?')) return;
  AppLock.BiometricLock.disable();
  updateAppLockUI();
}

// settings 탭 진입 시 앱 잠금 UI 갱신
document.addEventListener('DOMContentLoaded', function () {
  var origSwitchTab = window.switchTab;
  if (typeof origSwitchTab === 'function') {
    window.switchTab = function (tab) {
      origSwitchTab(tab);
      if (tab === 'settings') updateAppLockUI();
    };
  }
  updateAppLockUI();
});

function updateTeamScheduleSyncUI() {
  var section = document.getElementById('teamScheduleSyncSection');
  var note = document.getElementById('teamScheduleSyncNote');
  if (!section) return;

  var loggedIn = !!window.SupabaseUser;
  section.style.display = loggedIn ? 'block' : 'none';
  if (note) {
    note.textContent = loggedIn
      ? '배포된 팀 근무표가 있으면 이번 달 기준으로 파일을 내려받습니다.'
      : '팀 로그인 후 사용할 수 있어요.';
  }
}

async function downloadTeamScheduleIcs(btn) {
  var token = await getSupabaseAccessTokenForApi();
  if (!token) {
    showOtToast('팀 로그인 후 다시 시도해 주세요.');
    return;
  }

  var range = buildCurrentMonthRange();
  if (btn) btn.disabled = true;
  try {
    var response = await fetch('/api/me/schedule.ics?start=' + encodeURIComponent(range.start) + '&end=' + encodeURIComponent(range.end), {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });
    if (!response.ok) {
      var data = await response.json().catch(function () { return {}; });
      throw new Error(data.error || '근무표를 찾지 못했습니다.');
    }

    var blob = await response.blob();
    var blobUrl = URL.createObjectURL(blob);
    var anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = 'snuhmate-team-schedule-' + range.start + '.ics';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(function () { URL.revokeObjectURL(blobUrl); }, 1000);
    showOtToast('이번 달 근무표 파일을 내려받았어요.');
  } catch (e) {
    console.warn('[TeamSchedule] download failed:', e);
    showOtToast(e && e.message ? e.message : '근무표 파일을 만들지 못했어요.');
  } finally {
    if (btn) btn.disabled = false;
  }
}
