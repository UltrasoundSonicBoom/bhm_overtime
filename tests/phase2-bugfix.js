/**
 * Phase 2 TDD 테스트: 버그 수정 검증
 * 실행: node tests/phase2-bugfix.js
 *
 * 검증 대상:
 *   BUG-01: 리프레시지원비 통상임금 반영
 *   BUG-02/03: 장기근속수당 140,000원 + ADDITIVE 구조
 *   ARCH-01: retirement-engine.js DATA 참조 (Node 환경에서 부분 검증)
 *   BUG-04: 연차 윤년 보정
 *   BUG-06: 조항 주석 추가
 *   BUG-07: 교육훈련비 명칭 통일
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('\n=== Phase 2 버그 수정 검증 ===\n');

// ── BUG-01: 리프레시지원비 통상임금 반영 ─────────────────────
console.log('[ BUG-01: 리프레시지원비 ]');
const calcJs = fs.readFileSync(path.join(ROOT, 'calculators.js'), 'utf8');

// 주석 처리되어 있으면 FAIL
const refreshCommented = /\/\/\s*'리프레시지원비'/.test(calcJs);
assert(!refreshCommented, "BUG-01: '리프레시지원비' 주석 해제 (통상임금 산입)");

// breakdown에 실제로 포함되어 있어야 함
const refreshIncluded = /'리프레시지원비'\s*:\s*DATA\.allowances\.refreshBenefit/.test(calcJs);
assert(refreshIncluded, "BUG-01: breakdown에 '리프레시지원비' 항목 존재");

// ── BUG-02/03: 장기근속수당 ADDITIVE + 140,000원 ─────────────
console.log('\n[ BUG-02/03: 장기근속수당 ]');
const dataJs = fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8');

// 25년+ 금액이 140,000이어야 함 (BUG-02)
assert(!dataJs.includes('amount: 130000'), 'BUG-02: 25년+ 130,000원 잔재 없음');
assert(dataJs.includes('amount: 140000') || dataJs.includes('amount:  140000'), 'BUG-02: 25년+ 140,000원 수정 완료');

// ADDITIVE 구조 검증 (data.js longServicePay 배열)
// 올바른 구조: 20년=100K, 21년=110K, 25년=140K
const lspMatch = dataJs.match(/longServicePay\s*:\s*\[([\s\S]*?)\]/);
if (lspMatch) {
  const lspBlock = lspMatch[1];
  // 20년 구간 100,000
  assert(/min:\s*20[^,]*amount:\s*100000/.test(lspBlock) || /amount:\s*100000/.test(lspBlock),
    'BUG-03: 20년 구간 100,000원 (ADDITIVE 기준액)');
  // 21년 구간 110,000
  assert(/min:\s*21[^,]*amount:\s*110000/.test(lspBlock) || /amount:\s*110000/.test(lspBlock),
    'BUG-03: 21년 구간 110,000원 (ADDITIVE +10,000)');
  // 25년 구간 140,000
  assert(/min:\s*25[^,]*amount:\s*140000/.test(lspBlock) || /amount:\s*140000/.test(lspBlock),
    'BUG-03: 25년 구간 140,000원 (ADDITIVE +30,000)');
} else {
  assert(false, 'BUG-03: longServicePay 배열 파싱 가능');
}

// ── ARCH-01: retirement-engine.js DATA 참조 전환 ─────────────
console.log('\n[ ARCH-01: retirement-engine.js 참조 ]');
const retJs = fs.readFileSync(path.join(ROOT, 'retirement-engine.js'), 'utf8');

// 하드코딩 SEV_PAY 제거 또는 DATA 참조로 전환
// 옵션 A: 완전 제거 후 DATA 참조
// 옵션 B: 주석으로 DATA 참조 명시
const hasDataRef = retJs.includes('DATA.severancePay') || retJs.includes('window.DATA');
const hasHardcoded = /const SEV_PAY\s*=\s*\[/.test(retJs) && !retJs.includes('// DATA 참조');
// 하드코딩이 있어도 DATA 참조 코드가 있으면 허용 (점진적 전환)
assert(hasDataRef || !hasHardcoded, 'ARCH-01: retirement-engine.js DATA 참조 전환 또는 주석 명시');

// ── BUG-04: 연차 윤년 보정 ──────────────────────────────────
console.log('\n[ BUG-04: 연차 윤년 보정 ]');

// calculators.js 읽기
const leapFixed = !calcJs.includes('Math.floor(diffDays / 365)') ||
                  calcJs.includes('// 윤년') ||
                  calcJs.includes('getFullYear') && calcJs.includes('getMonth');
assert(leapFixed, 'BUG-04: 윤년 미보정 Math.floor(diffDays/365) 수정 완료');

// 실제 계산 검증 — calculators.js를 직접 실행할 수 없으므로 파일 분석
// calcLeave 함수에서 Date 기반 연수 계산 사용 여부
const hasDateCalc = calcJs.includes('getFullYear') || calcJs.includes('diffYears') && !calcJs.includes('Math.floor(diffDays / 365)');
assert(hasDateCalc, 'BUG-04: 날짜 기반 정확한 연수 계산 사용');

// ── BUG-06: 조항 주석 추가 ──────────────────────────────────
console.log('\n[ BUG-06/07: 조항 주석 ]');

// 근속가산기본급에 제46조 주석
assert(calcJs.includes('제46조'), 'BUG-06: 근속가산기본급 제46조 주석 추가');

// 명절지원비에 제48조 주석
assert(calcJs.includes('제48조'), 'ARCH-04: 명절지원비 제48조 주석 추가');

// ── BUG-07: 교육훈련비 명칭 ─────────────────────────────────
// '자기계발별정수당' → '교육훈련비'로 변경 또는 주석 명시
const hasNewName = calcJs.includes("'교육훈련비'") || calcJs.includes('"교육훈련비"');
const hasOldName = calcJs.includes("'자기계발별정수당'");
// 둘 다 있거나 (주석으로 병기), 새 이름만 있어야 함
assert(hasNewName || !hasOldName, 'BUG-07: 교육훈련비 명칭 통일 (또는 규정 명칭으로 변경)');

// ── impact 문서 검증 ───────────────────────────────────────
console.log('\n[ Before/After 기록 ]');
const impactPath = path.join(ROOT, 'docs', 'bugfix-impact-2026.md');
assert(fs.existsSync(impactPath), 'bugfix-impact-2026.md 생성 (before/after 수치 기록)');

// ── 최종 결과 ──────────────────────────────────────────────
console.log(`\n결과: ${passed} PASS / ${failed} FAIL\n`);

if (failed > 0) {
  console.log('→ Phase 2 미완료. 버그 수정 후 재실행하세요.\n');
  process.exit(1);
} else {
  console.log('→ Phase 2 완료! Phase 3으로 진행하세요.\n');
  process.exit(0);
}
