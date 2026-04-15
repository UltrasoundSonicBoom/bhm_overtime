/**
 * Phase 32: D4 활성화 전 시뮬레이션 검증
 *
 * 1. POST /admin/rule-versions/simulate 엔드포인트
 * 2. admin/rule-versions.html 시뮬레이션 패널
 * 3. admin/rule-versions.js 시뮬레이션 함수
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

const adminOps = fs.readFileSync(
  path.join(__dirname, '..', 'server', 'src', 'routes', 'adminOps.ts'), 'utf8');
const html = fs.readFileSync(
  path.join(__dirname, '..', 'admin', 'rule-versions.html'), 'utf8');
const js = fs.readFileSync(
  path.join(__dirname, '..', 'admin', 'rule-versions.js'), 'utf8');

// ── Test 1: 서버 엔드포인트 ─────────────────────────────────────────────────
console.log('\n[Test 1] POST /admin/rule-versions/simulate 엔드포인트');
assert(adminOps.includes("adminOpsRoutes.post('/rule-versions/simulate'"), 'simulate POST 라우트 존재');
assert(adminOps.includes('fromVersionId') && adminOps.includes('toVersionId'), 'fromVersionId/toVersionId 파라미터');
assert(adminOps.includes('buildRuleSet'), 'buildRuleSet 헬퍼 함수');
assert(adminOps.includes('fromRuleSet') && adminOps.includes('toRuleSet'), 'fromRuleSet/toRuleSet 응답 필드');
assert(adminOps.includes("FROM rule_entries WHERE version_id"), 'rule_entries 조회');

// ── Test 2: ruleSet 빌드 로직 ────────────────────────────────────────────────
console.log('\n[Test 2] ruleSet 빌드 로직');
assert(adminOps.includes('split(\'.\')'), '도트 경로 분리');
assert(adminOps.includes('entry.value_json'), 'value_json 사용');
assert(adminOps.includes('fromVersion') && adminOps.includes('toVersion'), '버전명 응답 포함');

// ── Test 3: HTML 패널 ─────────────────────────────────────────────────────────
console.log('\n[Test 3] admin/rule-versions.html 시뮬레이션 패널');
assert(html.includes('id="sim-panel"'), '시뮬레이션 패널 div 존재');
assert(html.includes('id="btn-show-sim"'), '시뮬레이션 버튼 존재');
assert(html.includes('id="sim-from"') && html.includes('id="sim-to"'), '기준/비교 버전 셀렉트');
assert(html.includes('id="sim-jobtype"'), '직종 셀렉트');
assert(html.includes('id="sim-grade"'), '등급 셀렉트');
assert(html.includes('id="sim-year"'), '호봉 셀렉트');
assert(html.includes('id="sim-ot"') && html.includes('id="sim-night"'), '시간외/야간 입력');
assert(html.includes('id="btn-run-sim"'), '시뮬레이션 실행 버튼');
assert(html.includes('id="sim-result"'), '결과 출력 영역');

// ── Test 4: HTML 스크립트 로드 ────────────────────────────────────────────────
console.log('\n[Test 4] HTML 스크립트 로드');
assert(html.includes('src="../data.js"'), 'data.js 로드');
assert(html.includes('src="../calculators.js"'), 'calculators.js 로드');

// ── Test 5: JS 시뮬레이션 함수 ────────────────────────────────────────────────
console.log('\n[Test 5] admin/rule-versions.js 시뮬레이션 함수');
assert(js.includes('populateSimSelects'), 'populateSimSelects 함수 존재');
assert(js.includes('renderSimResult'), 'renderSimResult 함수 존재');
assert(js.includes('btn-run-sim'), 'btn-run-sim 이벤트 리스너');
assert(js.includes("'/rule-versions/simulate'"), 'simulate API 호출');
assert(js.includes('CALC.calcOrdinaryWage'), '통상임금 계산 호출');
assert(js.includes('CALC.calcOvertimePay'), '시간외 계산 호출');

// ── Test 6: JS 결과 렌더링 ────────────────────────────────────────────────────
console.log('\n[Test 6] 결과 비교 테이블');
assert(js.includes('통상임금'), '통상임금 항목');
assert(js.includes('시급'), '시급 항목');
assert(js.includes('시간외수당'), '시간외수당 항목');
assert(js.includes('야간수당'), '야간수당 항목');
assert(js.includes('차이'), '차이 컬럼');
assert(js.includes('populateSimSelects()'), 'loadVersions에서 populateSimSelects 호출');

console.log(`\n=== Phase 32 결과: ${passed} PASS / ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
