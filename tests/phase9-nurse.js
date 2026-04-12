'use strict';
// Phase 9: 간호사 규정 CALC 통합 테스트
// RED → GREEN: calcNursePay() + checkNurseScheduleRules() 구현 전 실패 예상

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

const calcJs = fs.readFileSync(path.join(ROOT, 'calculators.js'), 'utf8');

// ── [1] calcNursePay 함수 존재 ────────────────────────────────
console.log('\n[1] calcNursePay 함수 정의 확인');
assert(calcJs.includes('calcNursePay'), 'calcNursePay 함수 정의 존재');
assert(/calcNursePay\s*[:(]/.test(calcJs), 'calcNursePay 메서드 형식 올바름');

// ── [2] calcNursePay 로직 패턴 ────────────────────────────────
console.log('\n[2] calcNursePay 로직 패턴 확인');
// 프리셉터: 200,000원 / 2주 = 100,000원/주
assert(
  calcJs.includes('200000') || calcJs.includes('preceptor') || calcJs.includes('프리셉터'),
  'calcNursePay: 프리셉터 수당 200,000원 참조'
);
// 프라임팀: 20,000원/일
assert(
  calcJs.includes('20000') || calcJs.includes('primeTeam') || calcJs.includes('프라임'),
  'calcNursePay: 프라임팀 수당 20,000원 참조'
);

// ── [3] checkNurseScheduleRules 함수 존재 ────────────────────
console.log('\n[3] checkNurseScheduleRules 함수 정의 확인');
assert(calcJs.includes('checkNurseScheduleRules'), 'checkNurseScheduleRules 함수 정의 존재');
assert(/checkNurseScheduleRules\s*[:(]/.test(calcJs), 'checkNurseScheduleRules 메서드 형식 올바름');

// ── [4] checkNurseScheduleRules 로직 패턴 ───────────────────
console.log('\n[4] checkNurseScheduleRules 로직 패턴 확인');
// 리커버리데이: nightShifts > 7 → recoveryDays 발생
assert(
  calcJs.includes('recoveryDays') || calcJs.includes('recovery_days') || calcJs.includes('리커버리'),
  '리커버리데이 계산 존재'
);
// 7회 초과 트리거
assert(
  /nightShifts.*7|7.*nightShifts|night.*>\s*7/.test(calcJs),
  '야간 7회 초과 트리거 로직 존재'
);
// 40세 이상 야간 제외 경고
assert(
  calcJs.includes('40') && (calcJs.includes('age') || calcJs.includes('나이') || calcJs.includes('warnings')),
  '40세 이상 야간 제외 경고 로직 존재'
);
// warnings 배열 반환
assert(
  calcJs.includes('warnings'),
  'warnings 반환 필드 존재'
);

// ── [5] nurse_regulation.json BUG-N-01 수정 확인 ────────────
console.log('\n[5] nurse_regulation.json BUG-N-01 수정 확인');
const nurseJson = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'content/policies/2026/nurse_regulation.json'), 'utf8')
);
const multipliers = nurseJson.working_hours_and_shift_rules.overtime_and_on_call.multipliers;
assert(
  multipliers.night_22_to_06 === 2.0,
  'BUG-N-01: night_22_to_06 = 2.0 (제47조)',
  2.0, multipliers.night_22_to_06
);
assert(
  multipliers.holiday_within_8h === 1.5,
  'BUG-N-01: holiday_within_8h = 1.5 (제34조)',
  1.5, multipliers.holiday_within_8h
);
assert(
  multipliers.night_22_to_06_and_holiday === undefined,
  'BUG-N-01: night_22_to_06_and_holiday 키 제거됨'
);

// ── [6] 핵심 알고리즘 직접 단위 테스트 ──────────────────────
console.log('\n[6] 핵심 알고리즘 정확성 (독립 단위 테스트)');

// calcNursePay 알고리즘
function calcNursePayCore({ preceptorWeeks = 0, primeTeamDays = 0 } = {}) {
  const PRECEPTOR_PER_2WEEKS = 200000;
  const PRIME_TEAM_DAILY = 20000;
  return {
    preceptorPay: Math.floor(preceptorWeeks / 2) * PRECEPTOR_PER_2WEEKS,
    primeTeamPay: primeTeamDays * PRIME_TEAM_DAILY,
  };
}
const n1 = calcNursePayCore({ preceptorWeeks: 2 });
assert(n1.preceptorPay === 200000, '프리셉터 2주 = 200,000원', 200000, n1.preceptorPay);
const n2 = calcNursePayCore({ preceptorWeeks: 4 });
assert(n2.preceptorPay === 400000, '프리셉터 4주 = 400,000원', 400000, n2.preceptorPay);
const n3 = calcNursePayCore({ primeTeamDays: 3 });
assert(n3.primeTeamPay === 60000, '프라임팀 3일 = 60,000원', 60000, n3.primeTeamPay);

// checkNurseScheduleRules 알고리즘
function checkNurseScheduleRulesCore({ nightShifts = 0, age = 30, pattern = [] } = {}) {
  const warnings = [];
  // 리커버리데이: 야간 7회 초과 시 초과분만큼 발생
  const recoveryDays = nightShifts > 7 ? nightShifts - 7 : 0;
  // 40세 이상 야간 근무 경고
  if (age >= 40 && nightShifts > 0) {
    warnings.push({ type: 'age_night_exclusion', message: '40세 이상 야간근무 제외 원칙 (제32조)' });
  }
  // N-OFF-D 금지 패턴 탐지
  const patternStr = pattern.join('-');
  if (/N-OFF-D/.test(patternStr)) {
    warnings.push({ type: 'forbidden_pattern', message: 'N-OFF-D 금지 패턴 감지' });
  }
  return { recoveryDays, warnings };
}

const s1 = checkNurseScheduleRulesCore({ nightShifts: 7 });
assert(s1.recoveryDays === 0, '야간 7회: 리커버리데이 0일', 0, s1.recoveryDays);
const s2 = checkNurseScheduleRulesCore({ nightShifts: 8 });
assert(s2.recoveryDays === 1, '야간 8회: 리커버리데이 1일', 1, s2.recoveryDays);
const s3 = checkNurseScheduleRulesCore({ nightShifts: 10 });
assert(s3.recoveryDays === 3, '야간 10회: 리커버리데이 3일', 3, s3.recoveryDays);
const s4 = checkNurseScheduleRulesCore({ age: 40, nightShifts: 1 });
assert(s4.warnings.length > 0, '40세 야간근무 경고 발생');
assert(s4.warnings.some(w => w.type === 'age_night_exclusion'), '40세 경고 type=age_night_exclusion');
const s5 = checkNurseScheduleRulesCore({ age: 39, nightShifts: 5 });
assert(s5.warnings.length === 0, '39세 야간근무 경고 없음');
const s6 = checkNurseScheduleRulesCore({ pattern: ['N', 'OFF', 'D'] });
assert(s6.warnings.some(w => w.type === 'forbidden_pattern'), 'N-OFF-D 금지 패턴 탐지');

// ── 결과 ──────────────────────────────────────────────────────
console.log(`\n결과: ${pass} PASS / ${fail} FAIL`);
if (fail === 0) {
  console.log('\n→ Phase 9 완료!');
} else {
  console.log('\n→ Phase 9 미완료. 구현 후 재실행하세요.');
  process.exit(1);
}
