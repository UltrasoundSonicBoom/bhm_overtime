/**
 * Phase 41: payroll.js 정적 검증
 *
 * 1. PAYROLL 구조: categories 5개, cards 배열, methods
 * 2. 카드 ID 목록 (13개 카드)
 * 3. overtimeCalc — 15분 단위 절삭, 150%/200% 배수, 209h 통상시급
 * 4. nightShift — 야간근무가산 계산
 * 5. oncall — 당직 대기/콜아웃
 * 6. dutyPay — 당직비
 * 7. familyAllowance — shouldShow 조건부 카드
 * 8. deductionCalc — 4대보험 공제 계산
 * 9. leave 카드들 — annualLeave, unusedLeave, unpaidLeave, parentalLeave
 * 10. career 카드들 — promotionDiff, promotionDate, longService, gradeHistory
 * 11. welfare 카드들 — medicalDiscount, welfarePoint, selfDevAllowance
 * 12. PAYROLL.init() — 카테고리별 렌더링, 명세서 비교 배너, 프로필 경고
 * 13. PAYROLL.recalc() — DOM 스냅샷 보존 + 재렌더
 * 14. 헬퍼 메서드 — _buildGradeHistory, _getGradeStartDate, _savePromoData, _buildPayslipCompare, _buildResultHTML
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

const src = fs.readFileSync(path.join(__dirname, '..', 'payroll.js'), 'utf8');

// ── Test 1: PAYROLL 구조 ─────────────────────────────────────────
console.log('\n[Test 1] PAYROLL 구조');
assert(src.includes('const PAYROLL = {'), 'PAYROLL 객체 선언');
assert(src.includes('categories: ['), 'categories 배열');
assert(src.includes("{ id: 'overtime'"), 'overtime 카테고리');
assert(src.includes("{ id: 'deduction'"), 'deduction 카테고리');
assert(src.includes("{ id: 'leave'"), 'leave 카테고리');
assert(src.includes("{ id: 'career'"), 'career 카테고리');
assert(src.includes("{ id: 'welfare'"), 'welfare 카테고리');
assert(src.includes('cards: ['), 'cards 배열');

// ── Test 2: 카드 ID 목록 ─────────────────────────────────────────
console.log('\n[Test 2] 카드 ID 목록');
assert(src.includes("id: 'overtimeCalc'"), 'overtimeCalc 카드');
assert(src.includes("id: 'nightShift'"), 'nightShift 카드');
assert(src.includes("id: 'oncall'"), 'oncall 카드');
assert(src.includes("id: 'dutyPay'"), 'dutyPay 카드');
assert(src.includes("id: 'familyAllowance'"), 'familyAllowance 카드');
assert(src.includes("id: 'deductionCalc'"), 'deductionCalc 카드');
assert(src.includes("id: 'unpaidLeave'"), 'unpaidLeave 카드');
assert(src.includes("id: 'annualLeave'"), 'annualLeave 카드');
assert(src.includes("id: 'unusedLeave'"), 'unusedLeave 카드');
assert(src.includes("id: 'parentalLeave'"), 'parentalLeave 카드');
assert(src.includes("id: 'promotionDiff'"), 'promotionDiff 카드');
assert(src.includes("id: 'promotionDate'"), 'promotionDate 카드');
assert(src.includes("id: 'longService'"), 'longService 카드');
assert(src.includes("id: 'medicalDiscount'"), 'medicalDiscount 카드');
assert(src.includes("id: 'gradeHistory'"), 'gradeHistory 카드');
assert(src.includes("id: 'welfarePoint'"), 'welfarePoint 카드');
assert(src.includes("id: 'selfDevAllowance'"), 'selfDevAllowance 카드');

// ── Test 3: overtimeCalc — 핵심 계산 로직 ──────────────────────
console.log('\n[Test 3] overtimeCalc — 시간외수당 계산');
assert(src.includes('Math.floor(h * 4) / 4'), '15분 단위 절삭 (floor×4/4)');
assert(src.includes('rates.extended') && src.includes('rates.night'), '연장/야간 배율 참조');
assert(src.includes('rates.holiday') && src.includes('rates.holidayOver8'), '휴일 8h 초과 배율 분기');
assert(src.includes('209h') || src.includes('209'), '통상시급 209h 기준');
assert(src.includes('OVERTIME.calcMonthlyStats') || src.includes('OVERTIME.getMonthRecords'), '이번달 기록 자동 불러오기');

// ── Test 4: nightShift ───────────────────────────────────────────
console.log('\n[Test 4] nightShift 야간근무가산');
assert(src.includes("id: 'nightShift'") && src.includes('야간'), 'nightShift 카드 야간 키워드');
assert(src.includes('qaNightCount'), 'qaNightCount 입력 필드');

// ── Test 5: oncall ───────────────────────────────────────────────
console.log('\n[Test 5] oncall 당직 계산');
assert(src.includes('qaOncallStandby'), 'qaOncallStandby 대기 입력');
assert(src.includes('qaOncallCallouts'), 'qaOncallCallouts 콜아웃 입력');
assert(src.includes('qaOncallHours'), 'qaOncallHours 시간 입력');
assert(src.includes('qaOncallNight'), 'qaOncallNight 야간 여부');

// ── Test 6: dutyPay ──────────────────────────────────────────────
console.log('\n[Test 6] dutyPay 당직비');
assert(src.includes('qaDutyCount'), 'qaDutyCount 횟수 입력');

// ── Test 7: familyAllowance — shouldShow 조건부 카드 ────────────
console.log('\n[Test 7] familyAllowance shouldShow');
assert(src.includes('shouldShow(profile)'), 'shouldShow(profile) 조건부 카드 메서드');
assert(src.includes('DATA.familyAllowance'), 'DATA.familyAllowance 참조');

// ── Test 8: deductionCalc — 4대보험 ─────────────────────────────
console.log('\n[Test 8] deductionCalc 공제 계산');
assert(src.includes("id: 'deductionCalc'") && src.includes('공제'), 'deductionCalc 카드');
assert(
  src.includes('건강보험') || src.includes('국민연금') || src.includes('고용보험'),
  '4대보험 항목 참조'
);

// ── Test 9: leave 카드들 ─────────────────────────────────────────
console.log('\n[Test 9] leave 카드들');
assert(src.includes('qaUnusedDays'), 'qaUnusedDays (미사용 연차 일수) 입력');
assert(src.includes('qaParentalMonths'), 'qaParentalMonths (육아휴직 개월) 입력');
assert(
  src.includes('hasSeniority') || src.includes('seniorityYears'),
  'promotionDiff: 호봉 반영 여부'
);

// ── Test 10: career 카드들 — promotionDiff + promotionDate ───────
console.log('\n[Test 10] career 카드들');
assert(src.includes('qaTargetGrade'), 'promotionDiff: 목표 직급 셀렉트');
assert(src.includes('qaPromoGrade') && src.includes('qaPromoYear'), 'promotionDate: 직급/호봉 입력');
assert(src.includes('qaPromoStartDate'), 'promotionDate: 직급 시작일 입력');
assert(src.includes('DATA.longServicePay'), 'longService: DATA.longServicePay 참조');

// ── Test 11: welfare 카드들 ──────────────────────────────────────
console.log('\n[Test 11] welfare 카드들');
assert(src.includes('DATA.medicalDiscount'), 'medicalDiscount: DATA 참조');
assert(src.includes('DATA.allowances.selfDevAllowance') || src.includes('selfDevAllowance'), 'selfDevAllowance: DATA 참조');

// ── Test 12: PAYROLL.init() ──────────────────────────────────────
console.log('\n[Test 12] PAYROLL.init()');
assert(src.includes('init() {'), 'init 메서드');
assert(src.includes("'qaCardsContainer'"), 'qaCardsContainer 컨테이너');
assert(src.includes('PROFILE.load()'), 'PROFILE.load() 호출');
assert(src.includes('PROFILE.calcWage'), 'PROFILE.calcWage 호출');
assert(src.includes('qa-profile-warning'), '프로필 미저장 경고');
assert(src.includes('_buildPayslipCompare'), '명세서 비교 배너 호출');
assert(src.includes('cat.shouldShow ? cat.shouldShow(profile) : true') ||
  src.includes('c.shouldShow') && src.includes('c.shouldShow(profile)'), '카드 shouldShow 조건부 렌더');

// ── Test 13: PAYROLL.recalc() ────────────────────────────────────
console.log('\n[Test 13] PAYROLL.recalc()');
assert(src.includes('recalc(cardId) {'), 'recalc 메서드');
assert(src.includes("'#qaCardsContainer input, #qaCardsContainer select'"), 'DOM 스냅샷 대상');
assert(src.includes('var snapshot = {}'), 'snapshot 객체');
assert(src.includes('this.init()'), 'recalc 내 init 재호출');

// ── Test 14: 헬퍼 메서드 ────────────────────────────────────────
console.log('\n[Test 14] 헬퍼 메서드');
assert(src.includes('_buildGradeHistory()'), '_buildGradeHistory 메서드');
assert(src.includes('_getGradeStartDate(profile)'), '_getGradeStartDate 메서드');
assert(src.includes('_savePromoData()'), '_savePromoData 메서드');
assert(src.includes('_buildPayslipCompare(profile, wage)'), '_buildPayslipCompare 메서드');
assert(src.includes('_buildResultHTML(result)'), '_buildResultHTML 메서드');
assert(src.includes('_otStep(id, delta, cardId)'), '_otStep 스텝버튼 핸들러');
assert(src.includes('profile.promotionDate'), '_getGradeStartDate: promotionDate 우선 참조');

console.log(`\n=== Phase 41 결과: ${passed} PASS / ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
