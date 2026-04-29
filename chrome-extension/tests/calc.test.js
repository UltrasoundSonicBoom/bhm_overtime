// chrome-extension/tests/calc.test.js
// 실행: node chrome-extension/tests/calc.test.js
const { calcTimeBreakdown } = require('../shared/overtime-calc.js');
const { calcLeaveDays }     = require('../shared/leave-calc.js');
let p = 0, f = 0;
const ok = (c, m) => c ? (console.log('  PASS', m), p++) : (console.error('  FAIL', m), f++);

// 시간외 계산
const r1 = calcTimeBreakdown('2026-04-20', '18:00', '21:00', 'overtime', false);
ok(r1.extended === 3, '평일 18~21 → 연장 3h');
ok(r1.night    === 0, '평일 18~21 → 야간 0h');
ok(r1.holiday  === 0, '평일 18~21 → 휴일 0h');

const r2 = calcTimeBreakdown('2026-04-20', '20:00', '23:00', 'overtime', false);
ok(r2.extended === 2, '평일 20~23 → 연장 2h');
ok(r2.night    === 1, '평일 20~23 → 야간 1h');

const r3 = calcTimeBreakdown('2026-04-20', '09:00', '13:00', 'overtime', true);
ok(r3.holiday  === 4, '휴일 9~13 → 휴일 4h');
ok(r3.extended === 0, '휴일 9~13 → 연장 0h');

// 휴가 계산 (2026-04-20 월요일)
ok(calcLeaveDays('2026-04-20', '2026-04-22', false) === 3, '월~수 영업일 3일');
ok(calcLeaveDays('2026-04-23', '2026-04-27', false) === 3, '목~월 영업일 3일 (토일 제외)');
ok(calcLeaveDays('2026-04-24', '2026-04-26', true)  === 3, '역일 계산 3일 (토일 포함)');

console.log(p + ' passed, ' + f + ' failed');
process.exit(f > 0 ? 1 : 0);
