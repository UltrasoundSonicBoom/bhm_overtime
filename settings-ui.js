// settings-ui.js — 설정 탭 UI (AppLock 전용)
// showOtToast는 app.js:2374 에 정의된 버전을 공용으로 사용 (2-arg signature).

// ── 앱 잠금 설정 UI ──
function updateAppLockUI() {
  if (!window.AppLock) return;
  var enabled = AppLock.isEnabled();
  // bhm_settings 직접 로드 (appLock.js 가 사용하는 동일 키).
  // window.loadSettings 헬퍼는 미정의 — 직접 읽기로 변경 (Bug 수정).
  var settings = {};
  try { settings = JSON.parse(localStorage.getItem('bhm_settings') || '{}'); }
  catch (e) { settings = {}; }
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

// Phase 2-F: ESM marker — 파일을 ES module 로 표시 (side-effect IIFE 보존)
export {};
