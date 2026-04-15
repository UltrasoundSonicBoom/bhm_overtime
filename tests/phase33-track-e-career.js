/**
 * Phase 33: Track E — Career Platform 기능 검증
 *
 * 1. E1: 근무이력 UI (workHistory 함수 + HTML 요소)
 * 2. E2: (제거됨 · 2026-04-15) AI 이력서 생성 기능 삭제 — 구조화 데이터 기반 PDF 출력으로 대체
 * 3. E3: 시간외 조기경보 배너 (_renderOvertimeAlertBanner)
 * 4. E4: 퇴직 타임라인 시뮬레이터 (_renderRetirementTimeline)
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

const appJs   = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// ── Test 1: E1 근무이력 — app.js 함수 ─────────────────────────────
console.log('\n[Test 1] E1 근무이력 — app.js 함수');
assert(appJs.includes('function renderWorkHistory'), 'renderWorkHistory 함수 존재');
assert(appJs.includes('function _loadWorkHistory'), '_loadWorkHistory 함수 존재');
assert(appJs.includes('function _saveWorkHistory'), '_saveWorkHistory 함수 존재');
assert(appJs.includes('function openWorkHistorySheet'), 'openWorkHistorySheet 함수 존재');
assert(appJs.includes('function saveWorkHistoryEntry'), 'saveWorkHistoryEntry 함수 존재');
assert(appJs.includes('function deleteWorkHistoryEntry'), 'deleteWorkHistoryEntry 함수 존재');
assert(appJs.includes("'bhm_work_history'") || appJs.includes('"bhm_work_history"'), 'localStorage 키 bhm_work_history');
assert(appJs.includes('SyncManager') && appJs.includes('.push'), 'SyncManager.push() 호출');

// ── Test 2: E1 근무이력 — HTML 요소 ──────────────────────────────
console.log('\n[Test 2] E1 근무이력 — HTML 요소');
assert(indexHtml.includes('id="workHistoryList"'), 'workHistoryList 요소 존재');
assert(indexHtml.includes('id="workHistorySheet"'), 'workHistorySheet 요소 존재 (바텀시트)');
assert(indexHtml.includes('workHistorySheetTitle') || appJs.includes('workHistorySheetTitle'), '시트 제목 요소');
assert(appJs.includes('첫 근무지 추가') || indexHtml.includes('첫 근무지 추가'), '빈 상태 첫 근무지 추가 버튼');
assert(appJs.includes('아직 기록된 근무이력이 없어요'), '빈 상태 안내 텍스트');

// ── Test 3 & 4: E2 AI 이력서 — 2026-04-15 기능 제거 (구조화 데이터 기반 PDF로 대체) ──
console.log('\n[Test 3] E2 AI 이력서 — 제거 검증');
assert(!appJs.includes('function generateAIResume'), 'generateAIResume 함수 제거됨');
assert(!appJs.includes("'/api/resume'") && !appJs.includes('"/api/resume"'), 'AI 이력서 API 호출 제거됨');
assert(!indexHtml.includes('workHistoryAICTA'), 'AI CTA 버튼 제거됨');

// ── Test 5: E3 시간외 조기경보 배너 ──────────────────────────────
console.log('\n[Test 5] E3 시간외 조기경보 배너');
assert(appJs.includes('function _renderOvertimeAlertBanner'), '_renderOvertimeAlertBanner 함수 존재');
assert(appJs.includes('WARNING_H') && appJs.includes('CRITICAL_H'), 'WARNING(40h)/CRITICAL(48h) 상수');
assert(appJs.includes('LIMIT_H'), '월 52시간 한도 상수');
assert(appJs.includes("overtimeAlertDismissed_"), '당일 닫기 dismissKey');
assert(appJs.includes("'critical'") || appJs.includes('"critical"'), 'critical 레벨 처리');
assert(appJs.includes("'warning'") || appJs.includes('"warning"'), 'warning 레벨 처리');
assert(appJs.includes('var(--accent-amber'), 'WARNING 앰버 색상 사용');
assert(appJs.includes('var(--accent-rose'), 'CRITICAL 로즈 색상 사용');
assert(appJs.includes('min-width:44px') || appJs.includes('min-width: 44px'), '닫기 버튼 44px 터치 타겟');
assert(appJs.includes('_renderOvertimeAlertBanner(') , 'initOvertimeTab에서 호출');

// ── Test 6: E4 퇴직 타임라인 ─────────────────────────────────────
console.log('\n[Test 6] E4 퇴직 타임라인 시뮬레이터');
assert(appJs.includes('function _renderRetirementTimeline'), '_renderRetirementTimeline 함수 존재');
assert(indexHtml.includes('id="retirementTimelineContent"') || indexHtml.includes("id='retirementTimelineContent'"), 'retirementTimelineContent 컨테이너');
assert(indexHtml.includes('id="retirementTimelineCard"') || indexHtml.includes("id='retirementTimelineCard'"), 'retirementTimelineCard');
assert(appJs.includes('for (var i = 0; i < 12; i++)') || appJs.includes('for(var i=0;i<12;'), '12개월 루프');
assert(appJs.includes('calcRetirement'), 'CALC.calcRetirement 호출');
assert(appJs.includes('입사일과 급여 정보를 먼저 입력해주세요'), '빈 상태 텍스트');
assert(appJs.includes('개인정보 탭으로 →'), '빈 상태 CTA 버튼');
assert(appJs.includes('var(--accent-amber') && appJs.includes('var(--accent-rose'), '최고/최저 달 색상 강조');
assert(appJs.includes('연금') && appJs.includes('세금') && appJs.includes('v2'), '세금/연금 제외 v2 안내');

// ── Test 7: Track E 체크포인트 통합 ──────────────────────────────
console.log('\n[Test 7] Track E 체크포인트 통합');
assert(appJs.includes('renderWorkHistory'), 'E1 진입점 함수 존재');
assert(appJs.includes('_renderOvertimeAlertBanner'), 'E3 진입점 함수 존재');
assert(appJs.includes('_renderRetirementTimeline'), 'E4 진입점 함수 존재');
// 네오브루탈 스타일 검증
assert(appJs.includes('2px solid #101218') || indexHtml.includes('2px solid #101218'), '네오브루탈 카드 border 스타일');
assert(appJs.includes('4px 4px 0 #101218') || indexHtml.includes('4px 4px 0 #101218'), '네오브루탈 offset shadow 스타일');

console.log(`\n=== Phase 33 결과: ${passed} PASS / ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
