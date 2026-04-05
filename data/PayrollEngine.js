/**
 * 병원 노동조합 급여 및 근태 자동 계산 룰 엔진 (PayrollEngine.js)
 * @param {Object} user - user_profile.json 데이터
 * @param {Object} rules - hospital_rule_master_2026.json 데이터
 */
class PayrollEngine {
  constructor(user, rules) {
    this.user = user;
    this.rules = rules;
    
    // 입사일 기반 근속연수(만 연차) 계산
    const hireDate = new Date(this.user.job_info.hire_date);
    const targetDate = new Date(this.user.current_month_record.target_year_month + "-01");
    this.tenureYears = targetDate.getFullYear() - hireDate.getFullYear();
    if (targetDate.getMonth() < hireDate.getMonth()) {
      this.tenureYears--;
    }
  }

  // 1. 기본급 및 직급 수당 산출
  getBaseSalaryInfo() {
    const { job_category, grade, year_in_grade } = this.user.job_info;
    const gradeKey = `${job_category}_${grade.charAt(0)}_grade`; // ex: general_M_grade
    const table = this.rules.wage_tables_2025[gradeKey][grade];
    
    // 배열형태인 경우 연차에 맞게, 단일값인 경우 단일값 반환
    const base_salary = Array.isArray(table.base_salary_by_year) 
      ? table.base_salary_by_year[year_in_grade - 1] 
      : table.base_salary_yr1;

    return {
      base_salary: Math.floor(base_salary / 12),
      ability_pay: Math.floor(table.ability_pay / 12),
      bonus: Math.floor(table.bonus / 12),
      family_support_yearly: table.family_support
    };
  }

  // 2. 근속가산기본급 산출 (2016.02.29 이전 입사자 한정 로직)
  getTenureBaseAddition(baseSalaryMonthly, adjustmentPayMonthly = 0) {
    const hireDate = new Date(this.user.job_info.hire_date);
    const cutoffDate = new Date("2016-02-29");
    
    if (hireDate > cutoffDate) return 0; // 조건 미달 시 0원

    let rate = 0;
    if (this.tenureYears >= 20) rate = 0.08;
    else if (this.tenureYears >= 15) rate = 0.07;
    else if (this.tenureYears >= 10) rate = 0.06;
    else if (this.tenureYears >= 5) rate = 0.05;
    else if (this.tenureYears >= 1) rate = 0.02;

    const formulaBase = baseSalaryMonthly + (adjustmentPayMonthly * 0.5);
    return Math.floor(formulaBase * rate); // 원단위 절사
  }

  // 3. 가족수당 산출 (자녀 수에 따른 누진액 로직)
  getFamilyAllowance() {
    const familyRules = this.rules.wage_structure_and_allowances.family_allowance;
    let allowance = 0;
    let dependentCount = 0;

    // 배우자
    if (this.user.family_info.spouse.exists && dependentCount < familyRules.other_members.max_count) {
      allowance += familyRules.spouse;
      dependentCount++;
    }

    // 자녀 (첫째, 둘째, 셋째 누진 로직)
    const children = this.user.family_info.children;
    for (let i = 0; i < children.length; i++) {
      if (dependentCount >= familyRules.other_members.max_count) break;
      
      if (i === 0) allowance += familyRules.child_tiers.first;
      else if (i === 1) allowance += familyRules.child_tiers.second;
      else allowance += familyRules.child_tiers.third_and_above;
      
      dependentCount++;
    }

    // 기타 부양가족
    const others = this.user.family_info.other_dependents;
    for (let i = 0; i < others; i++) {
      if (dependentCount >= familyRules.other_members.max_count) break;
      allowance += familyRules.other_members.amount;
      dependentCount++;
    }

    return allowance;
  }

  // 4. 장기근속수당 산출
  getLongServiceAllowance() {
    const lsRules = this.rules.wage_structure_and_allowances.long_service_allowance;
    let allowance = 0;

    if (this.tenureYears >= 20) allowance += lsRules.tiers["20y_over"];
    else if (this.tenureYears >= 15) allowance += lsRules.tiers["15_to_19y"];
    else if (this.tenureYears >= 10) allowance += lsRules.tiers["10_to_14y"];
    else if (this.tenureYears >= 5) allowance += lsRules.tiers["5_to_9y"];

    if (this.tenureYears >= 21) allowance += lsRules.add_ons["21y_over_extra"];
    if (this.tenureYears >= 25) allowance += lsRules.add_ons["25y_over_extra"];

    return allowance;
  }

  // 5. 교대근무 및 야간근무 리커버리 데이 정산
  getShiftWorkData() {
    const shiftRules = this.rules.working_hours_and_shift_rules.shift_worker_rules;
    const currentNightShifts = this.user.current_month_record.attendance.night_shifts_worked;
    
    let nightBonus = currentNightShifts * shiftRules.night_shift_bonus;
    let recoveryDaysEarned = 0;
    let newCumulative = this.user.cumulative_records.night_shifts_unrewarded + currentNightShifts;

    // 당월 7일 이상 야간근무 시 차감 및 즉시 부여 로직
    if (currentNightShifts >= shiftRules.recovery_day.monthly_over_7_days.trigger) {
      recoveryDaysEarned += 1;
      newCumulative -= 7; // 누적에서 7일 차감
    }

    // 누적 15일(또는 20일) 달성 로직
    const targetCumulative = (this.user.job_info.department === "시설지원직") 
      ? shiftRules.recovery_day.facility_and_others_cumulative.trigger 
      : shiftRules.recovery_day.nurse_cumulative.trigger;

    if (newCumulative >= targetCumulative) {
      recoveryDaysEarned += 1;
      newCumulative -= targetCumulative;
    }

    return { nightBonus, recoveryDaysEarned, newCumulative };
  }

  // 6. 통상임금 및 시간외 수당 계산
  calculateMonthlyPayroll() {
    const baseInfo = this.getBaseSalaryInfo();
    const tenureAddition = this.getTenureBaseAddition(baseInfo.base_salary);
    const familyAllowance = this.getFamilyAllowance();
    const longService = this.getLongServiceAllowance();
    const shiftData = this.getShiftWorkData();
    const fixedRules = this.rules.wage_structure_and_allowances.fixed_allowances;

    // 통상임금 합산 (군복무수당, 급식비, 교통비, 교육비 등 고정수당 포함)
    const ordinaryWageMonthly = 
      baseInfo.base_salary + 
      tenureAddition + 
      baseInfo.ability_pay + 
      baseInfo.bonus + 
      longService + 
      fixedRules.meal_subsidy + 
      fixedRules.transportation_subsidy + 
      fixedRules.military_service.amount + 
      fixedRules.training_monthly;

    // 시급 산출 (통상임금 * 1/209)
    const hourlyWage = Math.floor(ordinaryWageMonthly / 209);

    // 시간외/휴일 수당 계산
    const otRecords = this.user.current_month_record.overtime_and_holiday;
    const otMultipliers = this.rules.working_hours_and_shift_rules.overtime_and_on_call.multipliers;
    
    const overtimePay = Math.floor(otRecords.standard_overtime_hours * hourlyWage * otMultipliers.standard);
    const holidayPay = Math.floor(otRecords.holiday_worked_hours * hourlyWage * otMultipliers.night_22_to_06_and_holiday);
    const nightOtPay = Math.floor(otRecords.night_overtime_hours * hourlyWage * otMultipliers.night_22_to_06_and_holiday);
    const continuousNightPay = Math.floor(otRecords.continuous_night_overtime_hours * hourlyWage * otMultipliers.standard_worker_continuous_night);

    // 온콜 수당
    const onCallPay = 
      (this.user.current_month_record.attendance.on_call_standby_days * 10000) + 
      (this.user.current_month_record.attendance.on_call_dispatches * 50000);

    // 최종 당월 지급 총액 (세전)
    const totalGrossPay = ordinaryWageMonthly + familyAllowance + shiftData.nightBonus + overtimePay + holidayPay + nightOtPay + continuousNightPay + onCallPay;

    return {
      ordinaryWageMonthly,
      hourlyWage,
      allowances: {
        familyAllowance,
        longService,
        tenureAddition,
        nightBonus: shiftData.nightBonus,
        onCallPay
      },
      overtime: {
        overtimePay,
        holidayPay,
        nightOtPay,
        continuousNightPay
      },
      shift_status: {
        recoveryDaysEarned: shiftData.recoveryDaysEarned,
        newCumulativeNightShifts: shiftData.newCumulative
      },
      totalGrossPay
    };
  }
}

// ============== 앱 실행 예시 (사용법) ==============
// 실제 앱에서는 파일이나 DB에서 JSON을 불러와 아래처럼 실행합니다.
/*
const ruleJson = require('./hospital_rule_master_2026.json');
const userJson = require('./user_profile.json');

const payroll = new PayrollEngine(userJson, ruleJson);
const result = payroll.calculateMonthlyPayroll();

console.log("당월 세전 총액:", result.totalGrossPay);
console.log("시간외 수당 합계:", result.overtime.overtimePay);
console.log("획득한 유급휴일(리커버리 데이):", result.shift_status.recoveryDaysEarned);
*/