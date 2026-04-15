/**
 * Phase 42: overtime.js + profile.js 정적 검증
 *
 * overtime.js:
 * 1. OVERTIME 구조 + 스토리지 키 패턴
 * 2. 내부 헬퍼: _parseTime, _minutesToHours(15분 반올림), _calcCommuteBreakdown
 * 3. 레코드 CRUD: addRecord, updateRecord, deleteRecord, getMonthRecords
 * 4. 핵심 계산: calcTimeBreakdown (날짜/야간/휴일 분류)
 * 5. calcEstimatedPay: 150%/200%/8h 초과, 온콜 대기수당/교통비
 * 6. createRecord: oncall_standby 분기, oncall_callout 출퇴근 2h 가산
 * 7. 통계: calcMonthlyStats (byType), calcYearlyStats (12개월 합산)
 * 8. 내보내기/가져오기: exportData, importData (YYYY-MM 검증)
 * 9. typeLabel / typeColor
 *
 * profile.js:
 * 10. PROFILE 구조 + 스토리지 키 패턴
 * 11. save / load / clear + SyncManager 연동
 * 12. parseDate (다양한 형식)
 * 13. calcServiceYears
 * 14. calcFamilyAllowance
 * 15. calcWage — CALC.calcOrdinaryWage 위임, 2016.02.01 근속가산 판단
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

const ot = fs.readFileSync(path.join(__dirname, '..', 'overtime.js'), 'utf8');
const pr = fs.readFileSync(path.join(__dirname, '..', 'profile.js'), 'utf8');

// ────────────────────────────────────────────────────────────────
// OVERTIME.JS
// ────────────────────────────────────────────────────────────────

// ── Test 1: 구조 + 스토리지 키 ──────────────────────────────────
console.log('\n[Test 1] OVERTIME 구조 + 스토리지 키');
assert(ot.includes('const OVERTIME = {'), 'OVERTIME 객체 선언');
assert(ot.includes("'overtimeRecords'"), 'overtimeRecords 스토리지 키');
assert(ot.includes('getUserStorageKey'), '다기기 getUserStorageKey 지원');
assert(ot.includes('SyncManager.enqueuePush'), 'SyncManager.enqueuePush 연동');
assert(ot.includes('recordLocalEdit'), 'recordLocalEdit 로컬 편집 추적');

// ── Test 2: 내부 헬퍼 ───────────────────────────────────────────
console.log('\n[Test 2] 내부 헬퍼');
assert(ot.includes('_parseTime(timeStr)'), '_parseTime 함수');
assert(ot.includes("timeStr.split(':').map(Number)"), '_parseTime: HH:MM 파싱');
assert(ot.includes('h * 60 + m'), '_parseTime: 분 변환');
assert(ot.includes('_minutesToHours(min)'), '_minutesToHours 함수');
assert(ot.includes('Math.round(min / 15) * 15 / 60'), '_minutesToHours: 15분 반올림');
assert(ot.includes('_calcCommuteBreakdown(startMin, endMin, isRestDay)'), '_calcCommuteBreakdown 함수');
assert(ot.includes('1320') && ot.includes('360'), '야간 시간대: 22:00~06:00 (1320~360분)');

// ── Test 3: 레코드 CRUD ──────────────────────────────────────────
console.log('\n[Test 3] 레코드 CRUD');
assert(ot.includes('_loadAll()'), '_loadAll 함수');
assert(ot.includes('_saveAll(data)'), '_saveAll 함수');
assert(ot.includes('_monthKey(year, month)'), '_monthKey 함수');
assert(ot.includes('addRecord(record)'), 'addRecord 함수');
assert(ot.includes('updateRecord(id, updates)'), 'updateRecord 함수');
assert(ot.includes('deleteRecord(id)'), 'deleteRecord 함수');
assert(ot.includes('getMonthRecords(year, month)'), 'getMonthRecords 함수');
assert(ot.includes('getDateRecords(year, month, day)'), 'getDateRecords 함수');

// ── Test 4: calcTimeBreakdown ────────────────────────────────────
console.log('\n[Test 4] calcTimeBreakdown 시간대별 분류');
assert(ot.includes('calcTimeBreakdown(date, startTime, endTime, type, isHoliday)'), 'calcTimeBreakdown 함수');
assert(ot.includes('isWeekend'), '주말 판별 (isWeekend)');
assert(
  ot.includes('extended') && ot.includes('night') && ot.includes('holiday') && ot.includes('holidayNight'),
  '4가지 시간대 분류 (extended/night/holiday/holidayNight)'
);
assert(ot.includes('totalHours'), 'totalHours 반환');

// ── Test 5: calcEstimatedPay ─────────────────────────────────────
console.log('\n[Test 5] calcEstimatedPay 수당 계산');
assert(ot.includes('calcEstimatedPay(breakdown, hourlyRate, type)'), 'calcEstimatedPay 함수');
assert(ot.includes('rates.extended') && ot.includes('rates.night'), '연장/야간 배율');
assert(ot.includes('Math.min(breakdown.holiday, 8)'), '휴일 8h 기준 분기');
assert(ot.includes('rates.holidayOver8'), '8h 초과 배율');
assert(ot.includes("type === 'oncall_standby'"), 'oncall_standby 대기수당 분기');
assert(ot.includes('DATA.allowances.onCallStandby'), 'onCallStandby 고정 수당');
assert(ot.includes('DATA.allowances.onCallTransport'), 'onCallTransport 교통비');

// ── Test 6: createRecord + oncall 분기 ──────────────────────────
console.log('\n[Test 6] createRecord + oncall 분기');
assert(ot.includes('createRecord(date, startTime, endTime, type, hourlyRate, isHoliday, memo)'), 'createRecord 함수');
assert(ot.includes("type === 'oncall_callout'"), 'oncall_callout 분기');
assert(ot.includes('_calcCommuteBreakdown(startMin, endMin, isRestDay)'), 'oncall_callout: 출퇴근 2h 가산');
assert(ot.includes('breakdown.extended += commute.extended'), '연장시간 가산');
assert(ot.includes('this.addRecord(record)'), 'addRecord 호출로 저장');

// ── Test 7: 통계 ─────────────────────────────────────────────────
console.log('\n[Test 7] calcMonthlyStats + calcYearlyStats');
assert(ot.includes('calcMonthlyStats(year, month)'), 'calcMonthlyStats 함수');
assert(ot.includes('oncallStandbyDays'), 'stats: oncallStandbyDays');
assert(ot.includes('oncallCalloutCount'), 'stats: oncallCalloutCount');
assert(ot.includes('nightShiftCount'), 'stats: nightShiftCount');
assert(ot.includes("byType: {"), 'stats: byType 세분화');
assert(ot.includes('calcYearlyStats(year)'), 'calcYearlyStats 함수');
assert(ot.includes('for (let m = 1; m <= 12; m++)'), '12개월 순회');

// ── Test 8: export/import ────────────────────────────────────────
console.log('\n[Test 8] exportData + importData');
assert(ot.includes('exportData()'), 'exportData 함수');
assert(ot.includes("JSON.stringify(all, null, 2)"), 'JSON 직렬화');
assert(ot.includes('importData(jsonString)'), 'importData 함수');
assert(ot.includes('/^\\d{4}-\\d{2}$/'), 'YYYY-MM 형식 검증 regex');
assert(ot.includes('!Array.isArray(val)'), '배열 유효성 검증');

// ── Test 9: typeLabel / typeColor ────────────────────────────────
console.log('\n[Test 9] typeLabel + typeColor');
assert(ot.includes('typeLabel(type)'), 'typeLabel 함수');
assert(ot.includes('typeColor(type)'), 'typeColor 함수');
assert(ot.includes("'overtime'") && ot.includes("'oncall_standby'"), 'type 상수 참조');

// ────────────────────────────────────────────────────────────────
// PROFILE.JS
// ────────────────────────────────────────────────────────────────

// ── Test 10: PROFILE 구조 + 스토리지 키 ─────────────────────────
console.log('\n[Test 10] PROFILE 구조 + 스토리지 키');
assert(pr.includes('const PROFILE = {'), 'PROFILE 객체 선언');
assert(pr.includes("'bhm_hr_profile'"), 'bhm_hr_profile 스토리지 키');
assert(pr.includes('getUserStorageKey'), '다기기 getUserStorageKey 지원');

// ── Test 11: save / load / clear + SyncManager ──────────────────
console.log('\n[Test 11] save / load / clear + SyncManager');
assert(pr.includes('save(data)'), 'save 함수');
assert(pr.includes('load()'), 'load 함수');
assert(pr.includes('clear()'), 'clear 함수');
assert(pr.includes('localStorage.setItem'), 'localStorage.setItem 사용');
assert(pr.includes("SyncManager.enqueuePush('profile')"), 'SyncManager 연동');
assert(pr.includes('recordLocalEdit'), 'recordLocalEdit 로컬 편집 추적');

// ── Test 12: parseDate ───────────────────────────────────────────
console.log('\n[Test 12] parseDate');
assert(pr.includes('parseDate(str)'), 'parseDate 함수');
assert(pr.includes('/'), 'parseDate: / 구분자 처리');

// ── Test 13: calcServiceYears ────────────────────────────────────
console.log('\n[Test 13] calcServiceYears');
assert(pr.includes('calcServiceYears(hireDateStr, baseDate = new Date())'), 'calcServiceYears 함수');

// ── Test 14: calcFamilyAllowance ─────────────────────────────────
console.log('\n[Test 14] calcFamilyAllowance');
assert(pr.includes('calcFamilyAllowance(profile)'), 'calcFamilyAllowance 함수');
assert(pr.includes('numFamily') || pr.includes('numChildren'), '가족수 참조');

// ── Test 15: calcWage — 근속가산 + CALC 위임 ────────────────────
console.log('\n[Test 15] calcWage');
assert(pr.includes('calcWage(profile)'), 'calcWage 함수');
assert(pr.includes('CALC.calcOrdinaryWage'), 'CALC.calcOrdinaryWage 위임');
assert(pr.includes("new Date('2016-02-01')"), '근속가산 기준일 2016.02.01');
assert(pr.includes('hasSeniority'), 'hasSeniority 계산');
assert(pr.includes('longServiceYears: serviceYears'), 'longServiceYears 전달');
assert(pr.includes('weeklyHours: profile.weeklyHours || 209'), 'weeklyHours fallback 209');

console.log(`\n=== Phase 42 결과: ${passed} PASS / ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
