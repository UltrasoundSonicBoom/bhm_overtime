/**
 * Phase 3 회귀 검증 도구 (Node.js — 파일 구조 분석)
 * 실행: node tests/calc-regression.js
 *
 * 목적: 수정된 data.js, calculators.js의 주요 값과 구조를 정적으로 검증
 *       브라우저 계산 검증은 tests/calc-regression.html 참고
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let passed = 0;
let failed = 0;

function assert(condition, message, expected, actual) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    const detail = (expected !== undefined) ? ` → expected: ${expected}, got: ${actual}` : '';
    console.error(`  ❌ ${message}${detail}`);
    failed++;
  }
}

const dataJs = fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8');
const calcJs = fs.readFileSync(path.join(ROOT, 'calculators.js'), 'utf8');

console.log('\n=== Phase 3 회귀 검증 ===\n');

// ── 그룹 A: data.js 핵심 상수 ────────────────────────────
console.log('[ A. data.js 핵심 상수 ]');

// A-01: 장기근속 25년+ = 140,000 (BUG-02 수정)
assert(dataJs.includes('amount:  140000') || dataJs.includes('amount: 140000'),
  'A-01: 장기근속 25년+ = 140,000원');

// A-02: 장기근속 21년 = 110,000
assert(dataJs.includes('amount:  110000') || dataJs.includes('amount: 110000'),
  'A-02: 장기근속 21년 = 110,000원');

// A-03: 장기근속 20년 = 100,000
assert(dataJs.includes('amount:  100000') || dataJs.includes('amount: 100000'),
  'A-03: 장기근속 20년 = 100,000원');

// A-04: 130,000 잔재 없음
assert(!dataJs.includes('amount: 130000') && !dataJs.includes('amount:  130000'),
  'A-04: 130,000원 잔재 없음 (BUG-02 검증)');

// A-05: 리프레시지원비 = 30,000
assert(dataJs.includes('refreshBenefit: 30000'),
  'A-05: refreshBenefit = 30,000');

// A-06: 급식보조비 = 150,000
assert(dataJs.includes('mealSubsidy: 150000'),
  'A-06: mealSubsidy = 150,000');

// A-07: 교통보조비 = 150,000
assert(dataJs.includes('transportSubsidy: 150000'),
  'A-07: transportSubsidy = 150,000');

// A-08: 군복무수당 = 45,000
assert(dataJs.includes('militaryService: 45000'),
  'A-08: militaryService = 45,000');

// A-09: 주소정근로시간 = 209
assert(dataJs.includes('weeklyHours: 209'),
  'A-09: weeklyHours = 209');

// A-10: 야간수당 = 2.0
assert(dataJs.includes('night: 2.0'),
  'A-10: night 야간수당 배율 = 2.0');

// A-11: 연장수당 = 1.5
assert(dataJs.includes('extended: 1.5'),
  'A-11: extended 연장수당 배율 = 1.5');

// A-12: 장기근속 ADDITIVE 주석 포함
assert(dataJs.includes('ADDITIVE'),
  'A-12: longServicePay ADDITIVE 구조 주석 포함');

// ── 그룹 B: calculators.js 코드 구조 ────────────────────
console.log('\n[ B. calculators.js 코드 구조 ]');

// B-01: 리프레시지원비 산입 (주석 아님, local variable fallback 허용)
assert(/[^/]'리프레시지원비'\s*:\s*(DATA\.allowances\.refreshBenefit|refreshBenefit)/.test(calcJs),
  "B-01: '리프레시지원비' breakdown에 주석 없이 포함 (BUG-01)");

// B-02: 교육훈련비 명칭 사용 (BUG-07)
assert(calcJs.includes("'교육훈련비'"),
  "B-02: '교육훈련비' 명칭 사용 (BUG-07)");

// B-03: 자기계발별정수당 키 없음 (또는 주석으로만)
const selfDevAsKey = /[^/]'자기계발별정수당'\s*:/.test(calcJs);
assert(!selfDevAsKey,
  "B-03: '자기계발별정수당' 키 제거 (주석 제외)");

// B-04: 제46조 주석 (근속가산기본급)
assert(calcJs.includes('제46조'),
  'B-04: 근속가산기본급 제46조 주석 추가 (BUG-06)');

// B-05: 제48조 주석 (명절지원비)
assert(calcJs.includes('제48조'),
  'B-05: 명절지원비 제48조 주석 추가 (ARCH-04)');

// B-06: 윤년 보정 — Math.floor(diffDays / 365) 없어야 함
assert(!calcJs.includes('Math.floor(diffDays / 365)'),
  'B-06: 연차 윤년 보정 — diffDays/365 방식 제거 (BUG-04)');

// B-07: 날짜 기반 연수 계산 사용
assert(calcJs.includes('getFullYear'),
  'B-07: getFullYear 기반 정확한 연수 계산 (BUG-04)');

// B-08: 가족수당 비통상임금 주석 유지
assert(calcJs.includes('제44조'),
  'B-08: 가족수당 비통상임금 제44조 주석 유지');

// ── 그룹 C: regulation-constants.js ────────────────────
console.log('\n[ C. regulation-constants.js 핵심 상수 ]');
const rcJs = fs.readFileSync(path.join(ROOT, 'regulation-constants.js'), 'utf8');

assert(rcJs.includes('ORDINARY_WAGE_HOURS = 209'),
  'C-01: ORDINARY_WAGE_HOURS = 209');
assert(rcJs.includes('NIGHT_ALLOWANCE_MULTIPLIER = 2.0'),
  'C-02: NIGHT_ALLOWANCE_MULTIPLIER = 2.0');
assert(rcJs.includes('REFRESH_BENEFIT_MONTHLY = 30000'),
  'C-03: REFRESH_BENEFIT_MONTHLY = 30,000');
assert(rcJs.includes('amount:  140000'),
  'C-04: LONG_SERVICE_PAY 25년+ = 140,000');
assert(rcJs.includes("_refs.LONG_SERVICE_PAY === '제50조'") ||
       rcJs.includes("LONG_SERVICE_PAY:") && rcJs.includes("'제50조'"),
  'C-05: LONG_SERVICE_PAY 조항 주석 제50조');

// ── 그룹 D: retirement-engine.js ────────────────────────
console.log('\n[ D. retirement-engine.js 참조 구조 ]');
const retJs = fs.readFileSync(path.join(ROOT, 'retirement-engine.js'), 'utf8');

assert(retJs.includes('window.DATA'),
  'D-01: retirement-engine.js window.DATA 참조 코드 포함 (ARCH-01)');
assert(retJs.includes('ARCH-01'),
  'D-02: ARCH-01 이중화 위험 주석 포함');

// ── 그룹 E: 감사/임팩트 문서 ────────────────────────────
console.log('\n[ E. 문서 완비 ]');

assert(fs.existsSync(path.join(ROOT, 'docs', 'regulation-audit-2026.md')),
  'E-01: regulation-audit-2026.md 존재');
assert(fs.existsSync(path.join(ROOT, 'docs', 'bugfix-impact-2026.md')),
  'E-02: bugfix-impact-2026.md 존재');
assert(fs.existsSync(path.join(ROOT, 'tasks', 'spec-regulation-unification.md')),
  'E-03: spec-regulation-unification.md 존재');
assert(fs.existsSync(path.join(ROOT, 'regulation-constants.js')),
  'E-04: regulation-constants.js 존재');

// ── 최종 ──────────────────────────────────────────────
console.log(`\n결과: ${passed} PASS / ${failed} FAIL\n`);

if (failed > 0) {
  console.log('→ Phase 3 미완료.\n');
  process.exit(1);
} else {
  console.log('→ Phase 3 완료! 브라우저 계산 검증: open tests/calc-regression.html');
  console.log('→ Phase 4로 진행하세요.\n');
  process.exit(0);
}
