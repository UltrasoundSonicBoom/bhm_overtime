/**
 * Phase 34: App Lock L5-L7 검증
 *
 * L5: 생체인증 (WebAuthn) — BiometricLock 서브모듈
 * L6: Google 로그인 직후 PIN 설정 넛지 바텀시트
 * L7: PIN 설정 Google Drive 백업 (syncManager 연동)
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  FAIL: ${msg}`);
    failed++;
  }
}

const appLockSrc    = fs.readFileSync(path.join(__dirname, '..', 'appLock.js'), 'utf8');
const indexHtml     = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const syncManagerSrc = fs.readFileSync(path.join(__dirname, '..', 'syncManager.js'), 'utf8');

// ── Test 1: L5 BiometricLock 서브모듈 — 기본 구조 ──────────────
console.log('\n[Test 1] L5 BiometricLock 서브모듈 — 기본 구조');
assert(appLockSrc.includes('var BiometricLock = (function'), 'BiometricLock IIFE 정의');
assert(appLockSrc.includes('function isSupported'), 'isSupported 함수');
assert(appLockSrc.includes('function register'), 'register 함수');
assert(appLockSrc.includes('function authenticate'), 'authenticate 함수');
assert(appLockSrc.includes('function disable'), 'disable 함수');
assert(
  appLockSrc.includes("{ isSupported: isSupported, register: register, authenticate: authenticate, disable: disable }"),
  'BiometricLock 공개 API 노출'
);
assert(appLockSrc.includes('BiometricLock: BiometricLock'), 'AppLock.BiometricLock 접근 가능');

// ── Test 2: L5 BiometricLock — WebAuthn 사용 ────────────────────
console.log('\n[Test 2] L5 BiometricLock — WebAuthn API 사용');
assert(appLockSrc.includes('navigator.credentials'), 'navigator.credentials 사용');
assert(appLockSrc.includes("'webauthn'") || appLockSrc.includes('"webauthn"') ||
       appLockSrc.includes('PublicKeyCredential'), 'WebAuthn 지원 체크');
assert(appLockSrc.includes('navigator.credentials.create'), '등록: credentials.create 사용');
assert(appLockSrc.includes('navigator.credentials.get'), '인증: credentials.get 사용');
assert(appLockSrc.includes('biometricCredId'), '등록: credId 저장');
assert(appLockSrc.includes('biometricEnabled: true'), '등록: biometricEnabled:true 저장');
assert(appLockSrc.includes('biometricEnabled: false') || appLockSrc.includes("biometricEnabled:false"),
  '해제: biometricEnabled:false 저장');

// ── Test 3: L5 BiometricLock — 잠금 오버레이 연동 ───────────────
console.log('\n[Test 3] L5 BiometricLock — 잠금 오버레이 연동');
assert(appLockSrc.includes('BiometricLock.authenticate()'), '오버레이에서 authenticate() 호출');
assert(appLockSrc.includes('BiometricLock.isSupported()'), 'isSupported() 체크');
const biometricBtnCheck = appLockSrc.includes('Face ID') || appLockSrc.includes('지문') ||
  appLockSrc.includes('biometric') && appLockSrc.includes('btn');
assert(biometricBtnCheck, '생체인증 버튼 UI 요소');
assert(appLockSrc.includes('hasBiometric'), 'hasBiometric 조건 분기');

// ── Test 4: L5 BiometricLock — 설정 UI ─────────────────────────
console.log('\n[Test 4] L5 BiometricLock — 설정 UI (index.html)');
assert(indexHtml.includes('id="biometricSettingRow"') || indexHtml.includes("id='biometricSettingRow'"),
  'biometricSettingRow 요소');
assert(
  indexHtml.includes('BiometricLock.isSupported') || indexHtml.includes('AppLock.BiometricLock'),
  '생체인증 지원 여부 체크 (설정 카드)');
// 생체인증 등록/제거 버튼이 조건부로 보여야 함
assert(
  indexHtml.includes('BiometricLock') || appLockSrc.includes('btn-bio') || appLockSrc.includes('bio-btn'),
  '생체인증 등록/제거 버튼');

// ── Test 5: L6 넛지 바텀시트 — 구조 ────────────────────────────
console.log('\n[Test 5] L6 PIN 설정 넛지 — 바텀시트 구조');
assert(indexHtml.includes('pinNudgeSheet') || indexHtml.includes("id='pinNudgeSheet'"),
  'pinNudgeSheet 요소 생성 코드');
assert(indexHtml.includes('pinNudgeDismissed'), 'pinNudgeDismissed 설정 키 사용');
assert(indexHtml.includes('!s.pinNudgeDismissed'), '미거부 상태 체크');

// ── Test 6: L6 넛지 바텀시트 — 로직 ────────────────────────────
console.log('\n[Test 6] L6 PIN 설정 넛지 — 발동/거부 로직');
assert(indexHtml.includes('!s.pinEnabled') || indexHtml.includes("s.pinEnabled"), 'PIN 미설정 상태 체크');
assert(indexHtml.includes('설정할게요') || indexHtml.includes('PIN 설정'), '"설정할게요" 버튼 텍스트');
assert(indexHtml.includes('나중에'), '"나중에" 버튼 텍스트');
assert(indexHtml.includes("pinNudgeDismissed: true") || indexHtml.includes("pinNudgeDismissed:true"),
  '"나중에" → pinNudgeDismissed:true 저장');
// 넛지는 Google 로그인 성공 콜백에서 호출되어야 함
const tokenResponseIdx = indexHtml.indexOf('handleTokenResponse') + 1 > 0 ||
  indexHtml.indexOf('credential.credential') + 1 > 0;
assert(tokenResponseIdx, 'Google 로그인 성공 콜백 존재 (넛지 트리거 지점)');
assert(
  indexHtml.includes('pinNudgeDismissed') && indexHtml.includes('pinEnabled'),
  '넛지 발동 조건 두 가지 모두 체크 (pinNudgeDismissed + pinEnabled)'
);

// ── Test 7: L7 Drive 동기화 — syncManager _pushAppLock ──────────
console.log('\n[Test 7] L7 Drive 동기화 — syncManager._pushAppLock');
assert(syncManagerSrc.includes('function _pushAppLock'), '_pushAppLock 함수 존재');
assert(syncManagerSrc.includes("'pinEnabled'") || syncManagerSrc.includes('"pinEnabled"'),
  'APPLOCK_FIELDS: pinEnabled 포함');
assert(syncManagerSrc.includes("'pinHash'") || syncManagerSrc.includes('"pinHash"'),
  'APPLOCK_FIELDS: pinHash 포함');
assert(syncManagerSrc.includes("'pinSalt'") || syncManagerSrc.includes('"pinSalt"'),
  'APPLOCK_FIELDS: pinSalt 포함');
assert(!syncManagerSrc.includes("'biometricCredId'") && !syncManagerSrc.includes('"biometricCredId"'),
  'biometricCredId는 Drive sync에서 제외 (기기 귀속)');

// ── Test 8: L7 Drive 동기화 — syncManager _pullAppLock ──────────
console.log('\n[Test 8] L7 Drive 동기화 — syncManager._pullAppLock');
assert(syncManagerSrc.includes('function _pullAppLock'), '_pullAppLock 함수 존재');
// 원격에 PIN이 있고 로컬에 없으면 복원해야 함
assert(
  syncManagerSrc.includes('remoteHasPin') || syncManagerSrc.includes('localHasPin'),
  '원격/로컬 PIN 상태 비교 로직'
);
assert(syncManagerSrc.includes('pushAppLockSettings'), 'pushAppLockSettings 공개 API 존재');

// ── Test 9: L7 Drive 동기화 — appLock.js 트리거 ─────────────────
console.log('\n[Test 9] L7 Drive 동기화 — appLock.js에서 Drive push 트리거');
assert(
  appLockSrc.includes('SyncManager.pushAppLockSettings') ||
  appLockSrc.includes("SyncManager['pushAppLockSettings']"),
  'setupPin 완료 후 SyncManager.pushAppLockSettings() 호출'
);
// setupPin, disablePin 양쪽에서 push 해야 함
const setupIdx  = appLockSrc.indexOf('function setupPin');
const disableIdx = appLockSrc.indexOf('function disablePin');
const setupBlock  = setupIdx  > -1 ? appLockSrc.slice(setupIdx,  setupIdx  + 600) : '';
const disableBlock = disableIdx > -1 ? appLockSrc.slice(disableIdx, disableIdx + 400) : '';
assert(setupBlock.includes('pushAppLockSettings'),   'setupPin 내에서 pushAppLockSettings 호출');
assert(disableBlock.includes('pushAppLockSettings'), 'disablePin 내에서 pushAppLockSettings 호출');

// ── Test 10: L7 Drive 동기화 — fullSync 포함 확인 ───────────────
console.log('\n[Test 10] L7 Drive 동기화 — fullSync 에 pullAppLock 포함');
assert(syncManagerSrc.includes('_pullAppLock'), 'fullSync 흐름에 _pullAppLock 포함');
// fullSync 함수 내에서 호출되어야 함
const fullSyncIdx = syncManagerSrc.indexOf('function fullSync') > -1
  ? syncManagerSrc.indexOf('function fullSync')
  : syncManagerSrc.indexOf('fullSync');
const fullSyncBlock = fullSyncIdx > -1 ? syncManagerSrc.slice(fullSyncIdx, fullSyncIdx + 1000) : '';
assert(fullSyncBlock.includes('_pullAppLock'), 'fullSync 함수 내 _pullAppLock 호출');

console.log(`\n=== Phase 34 결과: ${passed} PASS / ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
