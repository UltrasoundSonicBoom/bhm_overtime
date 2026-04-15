/**
 * Phase 37: 런칭 게이트 G1/G2/G3 검증
 *
 * G1: 온보딩 메시징 재작성 (onboarding.html)
 *   - 히어로 카피 ("놓친 수당"), 창작자 배지, 3단 CTA ladder, 공유 버튼
 *
 * G2: 다기기 동기화 재수신 (syncManager.js)
 *   - pullOnResume, visibilitychange, focus 리스너, 20초 쿨다운
 *
 * G3: 데이터 손실 방지 (syncManager.js + index.html)
 *   - beforeunload flush, orphan 백업, fullSync 게스트 데이터 마이그레이션
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

const onboarding  = fs.readFileSync(path.join(__dirname, '..', 'onboarding.html'), 'utf8');
const syncMgr     = fs.readFileSync(path.join(__dirname, '..', 'syncManager.js'), 'utf8');
const indexHtml   = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// ── Test 1: G1 히어로 메시징 ────────────────────────────────────
console.log('\n[Test 1] G1 히어로 카피 + 창작자 배지');
assert(onboarding.includes('놓친 수당'), '히어로 훅: "놓친 수당"');
assert(onboarding.includes('hero-badge'), '창작자 인용 배지');
assert(onboarding.includes('서울대병원 동료가 만들었어요'), '동료 창작자 문구');
assert(onboarding.includes('핵의학과'), '창작자 소속 인용');

// ── Test 2: G1 CTA 3단 ladder ────────────────────────────────────
console.log('\n[Test 2] G1 CTA 3단 ladder');
assert(onboarding.includes('로그인 없이 바로 써보기') || onboarding.includes('로그인 없이 써도'), '1단 CTA: 로그인 없이');
assert(onboarding.includes('Google로 연결'), '2단 CTA: Google 연결');
assert(onboarding.includes('tutorial.html') || onboarding.includes('1분'), '3단 CTA: 튜토리얼');
assert(onboarding.includes('cta-primary') && onboarding.includes('cta-secondary'), 'primary/secondary CTA 스타일 분기');
assert(onboarding.includes('index.html?app=1'), '앱 진입 URL');

// ── Test 3: G1 Privacy 섹션 ──────────────────────────────────────
console.log('\n[Test 3] G1 Privacy + 배지');
assert(onboarding.includes('로컬 우선 저장') || onboarding.includes('✅'), '로컬 우선 저장 배지');
assert(onboarding.includes('내 구글 드라이브만') || onboarding.includes('구글 드라이브'), 'Drive 배지');
assert(onboarding.includes('익명 통계만') || onboarding.includes('익명'), '익명 통계 배지');
assert(onboarding.includes('privacy.html'), '개인정보처리방침 링크');

// ── Test 4: G8 공유 버튼 (onboarding) ───────────────────────────
console.log('\n[Test 4] G8 공유 버튼 (onboarding.html)');
assert(onboarding.includes('id="shareBtn"'), '공유 버튼 #shareBtn');
assert(onboarding.includes('id="shareQr"'), 'QR 코드 이미지 #shareQr');
assert(onboarding.includes('id="shareCopyBtn"'), '링크 복사 버튼');
assert(onboarding.includes('SHARE_TEXT') || onboarding.includes('서울대병원 동료가 만든'), '공유 텍스트');
assert(onboarding.includes('navigator.share') || onboarding.includes('Web Share'), 'Web Share API 사용');
assert(onboarding.includes('qrserver.com') || onboarding.includes('QRCode') || onboarding.includes('qrcode'),
  'QR 코드 생성 방식 (qrserver.com API 또는 라이브러리)');

// ── Test 5: G2 pullOnResume — 함수 구조 ─────────────────────────
console.log('\n[Test 5] G2 pullOnResume — 함수 구조');
assert(syncMgr.includes('function pullOnResume'), 'pullOnResume 함수 존재');
assert(syncMgr.includes('RESUME_COOLDOWN_MS'), 'RESUME_COOLDOWN_MS 상수');
assert(syncMgr.includes('20 * 1000'), '20초 쿨다운');
assert(syncMgr.includes('_lastResumePull'), '_lastResumePull 타임스탬프 추적');
assert(syncMgr.includes('now - _lastResumePull < RESUME_COOLDOWN_MS'), '쿨다운 체크');

// ── Test 6: G2 pullOnResume — 이벤트 리스너 ─────────────────────
console.log('\n[Test 6] G2 pullOnResume — 이벤트 리스너');
assert(syncMgr.includes("document.addEventListener('visibilitychange'"), 'visibilitychange 리스너');
assert(syncMgr.includes("document.visibilityState === 'visible'"), 'visible 상태 체크');
assert(syncMgr.includes("window.addEventListener('focus', pullOnResume)"), 'focus 이벤트 리스너');
// 로그아웃 상태에서는 동작 안 해야 함
assert(
  syncMgr.includes('GoogleAuth.isSignedIn()') || syncMgr.includes('!window.GoogleAuth'),
  'Google 로그인 상태 체크'
);

// ── Test 7: G2 pullOnResume — UI 갱신 + 토스트 ──────────────────
console.log('\n[Test 7] G2 pullOnResume — 결과 처리');
assert(syncMgr.includes("'restored'") || syncMgr.includes("'remote_wins'"), '원격 변경 감지 결과 필터');
assert(syncMgr.includes('다른 기기의 변경사항'), '복원 토스트 메시지');
assert(syncMgr.includes('_refreshUI'), 'UI 갱신 호출');
assert(
  syncMgr.includes("console.warn('[SyncManager] pullOnResume failed:") ||
  syncMgr.includes('pullOnResume failed'),
  'pullOnResume 실패 조용히 처리 (console.warn)'
);
assert(syncMgr.includes('pullOnResume: pullOnResume'), '공개 API에 pullOnResume 노출');

// ── Test 8: G3 beforeunload flush ───────────────────────────────
console.log('\n[Test 8] G3 beforeunload 즉시 flush');
assert(syncMgr.includes("window.addEventListener('beforeunload'"), 'beforeunload 리스너');
assert(syncMgr.includes('Object.keys(_timers)'), '대기 중인 타이머 목록 조회');
assert(syncMgr.includes("if (pending.length === 0) return"), 'pending 없으면 스킵');
assert(syncMgr.includes('clearTimeout(_timers[key])'), '타이머 취소');
assert(syncMgr.includes("parts[0] === 'payslip'"), 'payslip 타이머 파싱');

// ── Test 9: G3 orphan 백업 ───────────────────────────────────────
console.log('\n[Test 9] G3 orphan 백업');
assert(syncMgr.includes("'_orphan_'") || syncMgr.includes("_orphan_"), 'orphan 키 패턴');
assert(syncMgr.includes('localStorage.setItem(') && syncMgr.includes('_orphan_'), 'orphan localStorage 저장');
assert(syncMgr.includes('orphanStamp'), '타임스탬프 기반 orphan 키 생성');
// orphan 복구 UI가 index.html에 있어야 함
assert(
  indexHtml.includes('orphan') || indexHtml.includes('복구'),
  'index.html에 orphan 복구 UI 존재'
);

// ── Test 10: G3 fullSync 게스트 데이터 마이그레이션 ──────────────
console.log('\n[Test 10] G3 fullSync 게스트 데이터 마이그레이션');
assert(syncMgr.includes('function fullSync'), 'fullSync 함수');
assert(syncMgr.includes('function migrateGuestData'), 'migrateGuestData 함수');
assert(syncMgr.includes('function resolveConflict'), 'resolveConflict 함수');
assert(syncMgr.includes('fullSync: fullSync'), '공개 API에 fullSync 노출');
assert(syncMgr.includes('migrateGuestData: migrateGuestData'), '공개 API에 migrateGuestData 노출');

console.log(`\n=== Phase 37 결과: ${passed} PASS / ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
