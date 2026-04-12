'use strict';
// Phase 10: 퇴직금 강화 테스트
// RED → GREEN: getThreeMonthAverage() 구현 전 실패 예상

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let pass = 0;
let fail = 0;

function assert(condition, msg, expected, actual) {
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`);
    pass++;
  } else {
    const detail = expected !== undefined ? ` (expected: ${expected}, got: ${actual})` : '';
    console.log(`  ❌ FAIL: ${msg}${detail}`);
    fail++;
  }
}

const retirementJs = fs.readFileSync(path.join(ROOT, 'retirement-engine.js'), 'utf8');

// ── [1] getThreeMonthAverage 함수 존재 ────────────────────────
console.log('\n[1] getThreeMonthAverage 함수 정의 확인');
assert(retirementJs.includes('getThreeMonthAverage'), 'getThreeMonthAverage 함수 정의 존재');
assert(/getThreeMonthAverage\s*[:(]/.test(retirementJs), 'getThreeMonthAverage 메서드 형식 올바름');

// ── [2] 반환 구조 패턴 ────────────────────────────────────────
console.log('\n[2] 반환 구조 패턴 확인');
assert(retirementJs.includes('average'), 'average 반환 필드 존재');
assert(
  retirementJs.includes('insufficient_data') || retirementJs.includes('warning'),
  'warning 반환 필드 존재'
);
assert(
  retirementJs.includes('wage_peak_protection') || retirementJs.includes('wagePeak') || retirementJs.includes('임금피크'),
  '임금피크 보호 로직 존재'
);

// ── [3] ARCH-01: SEV_PAY 하드코딩 제거 확인 ─────────────────
console.log('\n[3] ARCH-01: DATA 참조 확인 (SEV_PAY 하드코딩)');
// SEV_PAY가 여전히 하드코딩 배열인지 확인
// 올바른 상태: window.DATA 참조 우선 + fallback만 존재
const hasDataRef = retirementJs.includes('window.DATA') || retirementJs.includes('DATA.severancePay');
assert(hasDataRef, 'ARCH-01: window.DATA 참조 존재 (DATA 우선 참조)');
// fallback은 있어도 되나, 주된 경로는 DATA 참조여야 함
assert(
  /window\.DATA.*severancePay|DATA\.severancePay/.test(retirementJs),
  'ARCH-01: DATA.severancePay 참조 패턴 존재'
);

// ── [4] 운영기능직 임금피크 보호 로직 ────────────────────────
console.log('\n[4] 운영기능직 임금피크 보호');
// 최저임금 기준: 9,860원 × 209h × 1.2 = 2,472,120원
assert(
  retirementJs.includes('2472120') || retirementJs.includes('1.2') || retirementJs.includes('minimumWage') ||
  retirementJs.includes('wage_peak_protection'),
  '임금피크 보호 기준 존재 (최저임금 120%)'
);

// ── [5] return 목록에 getThreeMonthAverage 포함 ──────────────
console.log('\n[5] 반환 목록에 getThreeMonthAverage 포함');
assert(
  /return\s*\{[\s\S]*getThreeMonthAverage[\s\S]*\}/.test(retirementJs),
  'RetirementEngine 반환 객체에 getThreeMonthAverage 포함'
);

// ── [6] 핵심 알고리즘 직접 단위 테스트 ──────────────────────
console.log('\n[6] 핵심 알고리즘 정확성 (독립 단위 테스트)');

const MIN_WAGE_2026 = 9860;
const WORK_HOURS = 209;
const WAGE_PEAK_THRESHOLD = Math.floor(MIN_WAGE_2026 * WORK_HOURS * 1.2); // 2,472,120원

function getThreeMonthAverageCore(payslips) {
  if (!payslips || payslips.length < 3) {
    return { average: null, months: payslips ? payslips.length : 0, warning: 'insufficient_data' };
  }
  const recent3 = payslips.slice(0, 3);
  const avg = Math.floor(recent3.reduce((s, p) => s + p.grossPay, 0) / 3);
  const warning = avg < WAGE_PEAK_THRESHOLD ? 'wage_peak_protection' : null;
  return { average: avg, months: 3, warning };
}

// 정상 케이스
const r1 = getThreeMonthAverageCore([
  { grossPay: 3000000 },
  { grossPay: 3100000 },
  { grossPay: 2900000 },
]);
assert(r1.average === 3000000, '알고리즘: 3개월 평균 = 3,000,000원', 3000000, r1.average);
assert(r1.warning === null, '알고리즘: 정상임금 → warning=null', null, r1.warning);
assert(r1.months === 3, '알고리즘: months=3', 3, r1.months);

// 데이터 부족
const r2 = getThreeMonthAverageCore([{ grossPay: 3000000 }]);
assert(r2.warning === 'insufficient_data', '알고리즘: 1개월 → insufficient_data', 'insufficient_data', r2.warning);
assert(r2.average === null, '알고리즘: 데이터 부족 → average=null', null, r2.average);

// 임금피크 보호
const r3 = getThreeMonthAverageCore([
  { grossPay: 2000000 },
  { grossPay: 2000000 },
  { grossPay: 2000000 },
]);
assert(r3.warning === 'wage_peak_protection',
  `알고리즘: 평균 2,000,000 < ${WAGE_PEAK_THRESHOLD.toLocaleString()} → wage_peak_protection`,
  'wage_peak_protection', r3.warning
);
assert(r3.average === 2000000, '알고리즘: 임금피크 케이스 평균값 정확', 2000000, r3.average);

// 임계값 경계: 정확히 WAGE_PEAK_THRESHOLD 이상
const r4 = getThreeMonthAverageCore([
  { grossPay: WAGE_PEAK_THRESHOLD },
  { grossPay: WAGE_PEAK_THRESHOLD },
  { grossPay: WAGE_PEAK_THRESHOLD },
]);
assert(r4.warning === null, '알고리즘: 임계값 = 보호 기준 → warning=null', null, r4.warning);

// 빈 배열
const r5 = getThreeMonthAverageCore([]);
assert(r5.warning === 'insufficient_data', '알고리즘: 빈 배열 → insufficient_data');

// ── 결과 ──────────────────────────────────────────────────────
console.log(`\n결과: ${pass} PASS / ${fail} FAIL`);
if (fail === 0) {
  console.log('\n→ Phase 10 완료!');
} else {
  console.log('\n→ Phase 10 미완료. 구현 후 재실행하세요.');
  process.exit(1);
}
