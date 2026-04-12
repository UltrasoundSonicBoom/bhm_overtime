/**
 * Phase 1 TDD 테스트: regulation-constants.js 구조 검증
 * 실행: node tests/phase1-constants.js
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

console.log('\n=== Phase 1 regulation-constants.js 검증 ===\n');

// T1-0: 파일 존재
const rcPath = path.join(ROOT, 'regulation-constants.js');
assert(fs.existsSync(rcPath), 'regulation-constants.js 파일 존재');

if (!fs.existsSync(rcPath)) {
  console.log(`\n결과: ${passed} PASS / ${failed} FAIL`);
  process.exit(1);
}

// 파일 로드 (CommonJS)
let RC;
try {
  RC = require(rcPath);
} catch (e) {
  console.error(`  ❌ FAIL: require 오류 — ${e.message}`);
  failed++;
  console.log(`\n결과: ${passed} PASS / ${failed} FAIL`);
  process.exit(1);
}

// T1-1: 통상임금 시간 기준 (제32조)
assert(RC.ORDINARY_WAGE_HOURS === 209, `ORDINARY_WAGE_HOURS = 209 (현재: ${RC.ORDINARY_WAGE_HOURS})`);
assert(RC._refs && RC._refs.ORDINARY_WAGE_HOURS === '제32조', 'ORDINARY_WAGE_HOURS 조항 주석 _refs.ORDINARY_WAGE_HOURS = 제32조');

// T1-2: 야간수당 배율 (제47조)
assert(RC.NIGHT_ALLOWANCE_MULTIPLIER === 2.0, `NIGHT_ALLOWANCE_MULTIPLIER = 2.0 (현재: ${RC.NIGHT_ALLOWANCE_MULTIPLIER})`);
assert(RC._refs.NIGHT_ALLOWANCE_MULTIPLIER === '제47조', 'NIGHT_ALLOWANCE_MULTIPLIER 조항 주석');

// T1-3: 연장근로 배율 (제34조)
assert(RC.OVERTIME_MULTIPLIER === 1.5, `OVERTIME_MULTIPLIER = 1.5 (현재: ${RC.OVERTIME_MULTIPLIER})`);
assert(RC._refs.OVERTIME_MULTIPLIER === '제34조', 'OVERTIME_MULTIPLIER 조항 주석');

// T1-4: 리프레시지원비 (별도합의 2024.11)
assert(RC.REFRESH_BENEFIT_MONTHLY === 30000, `REFRESH_BENEFIT_MONTHLY = 30,000 (현재: ${RC.REFRESH_BENEFIT_MONTHLY})`);
assert(RC._refs.REFRESH_BENEFIT_MONTHLY === '별도합의 2024.11', 'REFRESH_BENEFIT_MONTHLY 조항 주석');

// T1-5: 장기근속수당 ADDITIVE 구조 (제50조)
assert(Array.isArray(RC.LONG_SERVICE_PAY), 'LONG_SERVICE_PAY 배열');
assert(RC._refs.LONG_SERVICE_PAY === '제50조', 'LONG_SERVICE_PAY 조항 주석');

// 금액 검증
const findLongService = (years) => {
  // ADDITIVE 방식: 해당 years에 맞는 amount
  const entry = [...RC.LONG_SERVICE_PAY].reverse().find(l => years >= l.min);
  return entry ? entry.amount : 0;
};
assert(findLongService(5) === 50000, `장기근속 5년 = 50,000원 (현재: ${findLongService(5)})`);
assert(findLongService(10) === 60000, `장기근속 10년 = 60,000원 (현재: ${findLongService(10)})`);
assert(findLongService(15) === 80000, `장기근속 15년 = 80,000원 (현재: ${findLongService(15)})`);
assert(findLongService(20) === 100000, `장기근속 20년 = 100,000원 (현재: ${findLongService(20)})`);
assert(findLongService(21) === 110000, `장기근속 21년 = 110,000원 (ADDITIVE: +10,000) (현재: ${findLongService(21)})`);
assert(findLongService(25) === 140000, `장기근속 25년 = 140,000원 (ADDITIVE: +30,000) (현재: ${findLongService(25)})`);

// T1-6: 퇴직수당 요율 (제52~57조)
assert(Array.isArray(RC.SEVERANCE_PAY_RATES), 'SEVERANCE_PAY_RATES 배열');
assert(RC._refs.SEVERANCE_PAY_RATES === '제52~57조', 'SEVERANCE_PAY_RATES 조항 주석');
const sev20 = RC.SEVERANCE_PAY_RATES.find(s => s.min === 20);
assert(sev20 && sev20.rate === 0.60, `퇴직수당 20년+ rate = 0.60 (현재: ${sev20 ? sev20.rate : 'N/A'})`);

// T1-7: 누진배수 (제52~57조)
assert(Array.isArray(RC.SEVERANCE_MULTIPLIERS_PRE2001), 'SEVERANCE_MULTIPLIERS_PRE2001 배열');
const multi10 = RC.SEVERANCE_MULTIPLIERS_PRE2001.find(m => m.min === 10);
assert(multi10 && multi10.multiplier === 15.5, `누진배수 10년 = 15.5 (현재: ${multi10 ? multi10.multiplier : 'N/A'})`);

// T1-8: 급식/교통보조비 (제43조)
assert(RC.MEAL_SUBSIDY === 150000, `MEAL_SUBSIDY = 150,000 (현재: ${RC.MEAL_SUBSIDY})`);
assert(RC.TRANSPORT_SUBSIDY === 150000, `TRANSPORT_SUBSIDY = 150,000 (현재: ${RC.TRANSPORT_SUBSIDY})`);
assert(RC._refs.MEAL_SUBSIDY === '제43조', 'MEAL_SUBSIDY 조항 주석');

// T1-9: 군복무수당 (별표)
assert(RC.MILITARY_SERVICE_PAY_MONTHLY === 45000, `MILITARY_SERVICE_PAY_MONTHLY = 45,000 (현재: ${RC.MILITARY_SERVICE_PAY_MONTHLY})`);

// T1-10: 상수 총 개수 (최소 20개)
const constKeys = Object.keys(RC).filter(k => k !== '_refs');
assert(constKeys.length >= 20, `상수 총 개수 >= 20 (현재: ${constKeys.length}개)`);

// T1-11: 모든 상수에 _refs 항목 존재
const missingRefs = constKeys.filter(k => !RC._refs[k]);
assert(missingRefs.length === 0, `모든 상수에 _refs 존재 (미등록: ${missingRefs.join(', ') || '없음'})`);

console.log(`\n결과: ${passed} PASS / ${failed} FAIL\n`);

if (failed > 0) {
  console.log('→ Phase 1 미완료.\n');
  process.exit(1);
} else {
  console.log('→ Phase 1 완료! Phase 2로 진행하세요.\n');
  process.exit(0);
}
