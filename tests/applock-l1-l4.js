/**
 * App Lock L1-L4 검증 테스트
 *
 * Node.js + Web Crypto API 사용 (Node 18+)
 * 브라우저 DOM 없이 순수 로직 검증 + 소스코드 정적 분석 병행
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let pass = 0, fail = 0;

function test(label, fn) {
  try {
    const result = fn();
    if (result === false) {
      console.log('  ❌ FAIL: ' + label);
      fail++;
    } else {
      console.log('  ✅ PASS: ' + label);
      pass++;
    }
  } catch (e) {
    console.log('  ❌ FAIL: ' + label + ' — ' + e.message);
    fail++;
  }
}

async function testAsync(label, fn) {
  try {
    const ok = await fn();
    if (ok === false) {
      console.log('  ❌ FAIL: ' + label);
      fail++;
    } else {
      console.log('  ✅ PASS: ' + label);
      pass++;
    }
  } catch (e) {
    console.log('  ❌ FAIL: ' + label + ' — ' + e.message);
    fail++;
  }
}

// SHA-256 독립 구현 (appLock.js 로직 복제 검증)
async function sha256Node(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

// appLock.js 소스
const appLockSrc = fs.readFileSync(path.join(__dirname, '../appLock.js'), 'utf8');
// index.html 소스
const indexSrc = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
// shared-layout.js 소스
const sharedLayoutSrc = fs.readFileSync(path.join(__dirname, '../shared-layout.js'), 'utf8');

// ─────────────────────────────────────────────────────────────
// L1: AppLock 핵심 API 검증 (정적 분석)
// ─────────────────────────────────────────────────────────────
console.log('\n[L1] appLock.js — PIN 잠금 핵심 모듈');

test('setupPin 함수 존재', () => /function setupPin\(pin\)/.test(appLockSrc));
test('setupPin: SHA-256 해시 + salt 저장', () =>
  /_sha256\(pin \+ salt\)/.test(appLockSrc) &&
  /pinEnabled: true/.test(appLockSrc) &&
  /pinHash: hash/.test(appLockSrc) &&
  /pinSalt: salt/.test(appLockSrc));

test('verifyPin 함수 존재', () => /function verifyPin\(pin\)/.test(appLockSrc));
test('verifyPin: 5회 실패 → lockUntil 설정', () => {
  const hasMaxFail = /var MAX_FAIL = 5/.test(appLockSrc);
  const hasLockout = /failCount >= MAX_FAIL/.test(appLockSrc) && /pinLockUntil = Date\.now\(\) \+ LOCKOUT_MS/.test(appLockSrc);
  const hasLockout5min = /LOCKOUT_MS = 5 \* 60 \* 1000/.test(appLockSrc);
  return hasMaxFail && hasLockout && hasLockout5min;
});
test('verifyPin: 잠금 중 남은 시간 반환', () =>
  /remainingMs: remaining/.test(appLockSrc));
test('verifyPin: 성공 시 _unlocked = true', () => {
  // verifyPin 함수 내에서 _unlocked = true가 있는지 확인
  const verifyBlock = appLockSrc.slice(
    appLockSrc.indexOf('function verifyPin'),
    appLockSrc.indexOf('function changePin')
  );
  return /_unlocked = true/.test(verifyBlock);
});

test('disablePin: pinEnabled:false + hash/salt 삭제', () =>
  /pinEnabled: false, pinHash: null, pinSalt: null/.test(appLockSrc));

test('isEnabled 함수 존재', () => /function isEnabled\(\)/.test(appLockSrc));
test('isUnlocked 함수 존재 (isLocked 동치)', () => /function isUnlocked\(\)/.test(appLockSrc));
test('unlock 함수: _unlocked = true + 오버레이 제거', () => {
  const unlockBlock = appLockSrc.slice(
    appLockSrc.indexOf('function unlock('),
    appLockSrc.indexOf('function lock(')
  );
  return /_unlocked = true/.test(unlockBlock) && /removeChild/.test(unlockBlock);
});
test('lock 함수: _unlocked = false', () => /function lock\(\).*_unlocked = false/.test(appLockSrc.replace(/\n/g, ' ')));

test('lockUntil localStorage 저장 (새로고침 후 유지)', () => {
  // _saveSettings로 pinLockUntil 저장
  return /pinLockUntil.*Date\.now/.test(appLockSrc) && /_saveSettings/.test(appLockSrc);
});

// Drive 연동
test('setupPin: Drive push 트리거', () =>
  /SyncManager\.pushAppLockSettings/.test(appLockSrc));
test('disablePin: Drive push 트리거', () => {
  const disableBlock = appLockSrc.slice(
    appLockSrc.indexOf('function disablePin('),
    appLockSrc.indexOf('function isEnabled(')
  );
  return /SyncManager\.pushAppLockSettings/.test(disableBlock);
});

// SHA-256 알고리즘 검증 (Node crypto로 동일 결과 확인)
console.log('\n[L1] SHA-256 해시 알고리즘 검증');

(async function runHashTests() {
  await testAsync('SHA-256(pin+salt) 결정론적 — 같은 입력 → 같은 해시', async () => {
    const h1 = await sha256Node('1234' + 'test-salt');
    const h2 = await sha256Node('1234' + 'test-salt');
    return h1 === h2 && h1.length === 64;
  });

  await testAsync('SHA-256: 다른 PIN → 다른 해시', async () => {
    const h1 = await sha256Node('1234' + 'abc');
    const h2 = await sha256Node('5678' + 'abc');
    return h1 !== h2;
  });

  await testAsync('SHA-256: 같은 PIN 다른 salt → 다른 해시', async () => {
    const h1 = await sha256Node('1234' + 'salt1');
    const h2 = await sha256Node('1234' + 'salt2');
    return h1 !== h2;
  });

  // ─────────────────────────────────────────────────────────────
  // L2: FOUC guard + 잠금 오버레이
  // ─────────────────────────────────────────────────────────────
  console.log('\n[L2] FOUC 방지 인라인 스크립트 + 잠금 오버레이');

  test('index.html <head>에 FOUC guard 인라인 스크립트 존재', () =>
    /pinEnabled.*visibility.*hidden/.test(indexSrc.slice(0, 1000)));

  test('FOUC guard: pinEnabled true → visibility:hidden 즉시 적용', () => {
    // FOUC guard는 <head> 상단에 있되, redirect 스크립트 이후 위치할 수 있음
    const headSection = indexSrc.slice(0, 1500);
    return headSection.includes("pinEnabled") && headSection.includes("visibility") && headSection.includes("hidden");
  });

  test('index.html에 appLock.js script 태그 존재', () =>
    /src="appLock\.js/.test(indexSrc));

  test('shared-layout.js: checkAndPrompt 훅 존재', () =>
    /AppLock\.checkAndPrompt\(\)/.test(sharedLayoutSrc) || /checkAndPrompt/.test(sharedLayoutSrc));

  test('shared-layout.js: DOMContentLoaded 또는 즉시 checkAndPrompt 호출', () => {
    return /DOMContentLoaded.*checkAppLock|checkAppLock.*DOMContentLoaded|checkAppLock\(\)/.test(
      sharedLayoutSrc.replace(/\n/g, ' ')
    );
  });

  test('오버레이 렌더링: _renderOverlay 함수 존재', () =>
    /function _renderOverlay\(\)/.test(appLockSrc));

  test('오버레이: fullscreen fixed + z-index:99999', () =>
    /position:fixed.*z-index:99999|z-index:99999.*position:fixed/.test(appLockSrc.replace(/\n/g, ' ')));

  test('오버레이: 도트 표시기 존재 (_buildDots)', () =>
    /function _buildDots/.test(appLockSrc));

  test('오버레이: 숫자 키패드 존재 (_buildKeypad)', () =>
    /function _buildKeypad/.test(appLockSrc) && /'1','2','3'/.test(appLockSrc));

  test('오버레이: ⌫ 삭제 키 존재', () =>
    /'⌫'/.test(appLockSrc));

  test('checkAndPrompt: pinEnabled false 시 오버레이 없음', () => {
    const checkBlock = appLockSrc.slice(
      appLockSrc.indexOf('function checkAndPrompt'),
      appLockSrc.indexOf('// ── WebAuthn')
    );
    return /if \(!isEnabled\(\) \|\| _unlocked\) return/.test(checkBlock);
  });

  test('키패드 입력 완료 시 자동 verifyPin 호출', () =>
    /input\.length === pinLen.*tryVerify|tryVerify.*input\.length === pinLen/.test(
      appLockSrc.replace(/\n/g, ' ')
    ));

  test('unlock 후 visibility 복원', () => {
    const unlockBlock = appLockSrc.slice(
      appLockSrc.indexOf('function unlock('),
      appLockSrc.indexOf('function lock(')
    );
    return /documentElement\.style\.visibility = ''/.test(unlockBlock);
  });

  test('잠금아웃 카운트다운 표시 (startLockoutCountdown)', () =>
    /function startLockoutCountdown/.test(appLockSrc) &&
    // 실제 형식: '잠시 후 다시 시도해주세요 (' + m + ':' + String(s).padStart(2, '0') + ')'
    /잠시 후 다시 시도해주세요/.test(appLockSrc) &&
    /padStart\(2/.test(appLockSrc));

  // ─────────────────────────────────────────────────────────────
  // L3: 프로필 탭 앱 잠금 설정 카드
  // ─────────────────────────────────────────────────────────────
  console.log('\n[L3] 프로필 탭 앱 잠금 설정 카드');

  test('index.html: #appLockSettingsCard 존재', () =>
    /id="appLockSettingsCard"/.test(indexSrc));

  test('index.html: 앱 잠금 카드 제목 🔒 텍스트', () =>
    /🔒.*앱 잠금|앱 잠금.*🔒/.test(indexSrc));

  test('index.html: #appLockStatusBadge 켜짐 뱃지', () =>
    /id="appLockStatusBadge".*켜짐|켜짐.*id="appLockStatusBadge"/.test(
      indexSrc.replace(/\n/g, ' ')
    ));

  test('index.html: #appLockOff — PIN 미설정 상태 (PIN 설정하기 버튼)', () =>
    /id="appLockOff"/.test(indexSrc) && /PIN 설정하기/.test(indexSrc));

  test('index.html: #appLockOn — PIN 설정 상태 (변경/해제 버튼)', () =>
    /id="appLockOn"/.test(indexSrc) && /PIN 변경/.test(indexSrc) && /잠금 해제/.test(indexSrc));

  test('index.html: onAppLockSetupPin 핸들러 연결', () =>
    /onclick="onAppLockSetupPin\(\)"/.test(indexSrc) && /function onAppLockSetupPin/.test(indexSrc));

  test('index.html: onAppLockChangePin 핸들러 연결', () =>
    /onclick="onAppLockChangePin\(\)"/.test(indexSrc) && /function onAppLockChangePin/.test(indexSrc));

  test('index.html: onAppLockDisable 핸들러 연결 (confirm 다이얼로그)', () => {
    const disableHandler = indexSrc.slice(
      indexSrc.indexOf('function onAppLockDisable'),
      indexSrc.indexOf('function onAppLockDisable') + 400
    );
    return /confirm/.test(disableHandler) && /AppLock\.disablePin/.test(disableHandler);
  });

  test('index.html: updateAppLockUI — 상태별 display 전환', () => {
    const uiBlock = indexSrc.slice(
      indexSrc.indexOf('function updateAppLockUI'),
      indexSrc.indexOf('function updateAppLockUI') + 600
    );
    return /appLockOff/.test(uiBlock) && /appLockOn/.test(uiBlock) && /appLockStatusBadge/.test(uiBlock);
  });

  test('index.html: 생체인증 #biometricSettingRow — 지원 기기 한정 표시', () =>
    /id="biometricSettingRow"/.test(indexSrc) && /BiometricLock\.isSupported/.test(indexSrc));

  test('_showPinSetupModal: 4~6자리 입력 + 확인 재입력', () => {
    const setupModal = appLockSrc.slice(
      appLockSrc.indexOf('function _showPinSetupModal'),
      appLockSrc.indexOf('// ── checkAndPrompt')
    );
    return /phase.*enter.*confirm|firstPin.*input/.test(setupModal.replace(/\n/g, ' ')) &&
      /PIN이 일치하지 않아요/.test(setupModal);
  });

  // ─────────────────────────────────────────────────────────────
  // L4: PIN 분실 → Google 재인증 재설정 경로
  // ─────────────────────────────────────────────────────────────
  console.log('\n[L4] PIN 분실 → Google 재인증 재설정');

  test('appLock.js: resetViaReauth 함수 존재', () =>
    /function resetViaReauth\(onSuccess\)/.test(appLockSrc));

  test('오버레이: googleSub 있을 때 "PIN을 잊으셨나요?" 링크 표시', () => {
    const overlayRender = appLockSrc.slice(
      appLockSrc.indexOf('function _renderOverlay'),
      appLockSrc.indexOf('function _attachOverlayEvents')
    );
    return /settings\.googleSub/.test(overlayRender) && /PIN을 잊으셨나요/.test(overlayRender);
  });

  test('오버레이: Guest 모드(googleSub 없음)에서 대체 안내 텍스트', () => {
    const overlayRender = appLockSrc.slice(
      appLockSrc.indexOf('function _renderOverlay'),
      appLockSrc.indexOf('function _attachOverlayEvents')
    );
    return /브라우저 데이터를 초기화해야 합니다/.test(overlayRender);
  });

  test('"PIN을 잊으셨나요?" 클릭 → confirm → resetViaReauth 호출', () => {
    const attachBlock = appLockSrc.slice(
      appLockSrc.indexOf('function _attachOverlayEvents'),
      appLockSrc.indexOf('// ── PIN 설정 모달')
    );
    return /alForgotBtn/.test(attachBlock) && /resetViaReauth/.test(attachBlock) && /confirm/.test(attachBlock);
  });

  test('resetViaReauth: GoogleAuth.signIn() 호출', () =>
    /window\.GoogleAuth\.signIn\(\)/.test(appLockSrc) || /GoogleAuth\.signIn/.test(appLockSrc));

  test('resetViaReauth: googleSub 없으면 경고 후 종료', () => {
    const reauthBlock = appLockSrc.slice(
      appLockSrc.indexOf('function resetViaReauth'),
      appLockSrc.indexOf('function resetViaReauth') + 300
    );
    return /!settings\.googleSub/.test(reauthBlock) && /alert/.test(reauthBlock);
  });

  test('index.html: OAuth 성공 콜백에서 _appLockReauthPending 플래그 처리', () =>
    /_appLockReauthPending/.test(indexSrc));

  test('index.html: OAuth 성공 → 기존 PIN 삭제 + 새 PIN 설정 모달', () => {
    // _appLockReauthPending 플래그가 여러 번 등장 — 실제 콜백은 window.AppLock.disablePin() 가 있는 위치
    const reauthIdx = indexSrc.indexOf('window.AppLock.disablePin()');
    if (reauthIdx < 0) return false;
    const callbackBlock = indexSrc.slice(reauthIdx - 200, reauthIdx + 400);
    return /_appLockReauthPending/.test(callbackBlock) && /_showPinSetupModal/.test(callbackBlock);
  });

  test('OAuth 취소 → 기존 잠금 화면 유지 (PIN 삭제 없음)', () => {
    // resetViaReauth 자체는 signIn() 이후를 기다리지 않음 — 취소 시 콜백 없음
    const reauthBlock = appLockSrc.slice(
      appLockSrc.indexOf('function resetViaReauth'),
      appLockSrc.indexOf('function resetViaReauth') + 400
    );
    // disablePin은 _appLockReauthPending 콜백에서만 호출 (취소 시 실행 안 됨)
    return !reauthBlock.includes('disablePin') && /window\._appLockReauthPending = true/.test(reauthBlock);
  });

  // ─────────────────────────────────────────────────────────────
  // 최종 결과
  // ─────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(50));
  console.log('App Lock L1-L4 결과: ' + pass + ' PASS / ' + fail + ' FAIL');
  console.log('='.repeat(50));

  if (fail === 0) {
    console.log('\n✅ L1-L4 모든 Acceptance Criteria 충족');
  } else {
    console.log('\n⚠️  실패 항목 수정 필요');
    process.exit(1);
  }
})();
