export const SCHEDULING_RULE_IDS = Object.freeze({
  VALID_DUTY_CODE: 'snuh.schedule.valid_duty_code',
  EMPLOYEE_IDENTITY_REQUIRED: 'snuh.schedule.employee_identity_required',
  NO_N_OFF_D: 'snuh.nurse.no_n_off_d',
  MAX_CONSECUTIVE_NIGHTS: 'snuh.nurse.max_consecutive_nights',
  MONTHLY_NIGHT_CAP: 'snuh.nurse.monthly_night_cap',
});

export const SNUH_NURSE_MVP_RULE_PACK = Object.freeze({
  rulePackId: 'snuh.nurse.mvp',
  version: '0.1.0',
  rules: Object.freeze([
    Object.freeze({
      ruleId: SCHEDULING_RULE_IDS.VALID_DUTY_CODE,
      severity: 'block',
      label: 'Valid duty code',
    }),
    Object.freeze({
      ruleId: SCHEDULING_RULE_IDS.EMPLOYEE_IDENTITY_REQUIRED,
      severity: 'block',
      label: 'Employee identity required',
    }),
    Object.freeze({
      ruleId: SCHEDULING_RULE_IDS.NO_N_OFF_D,
      severity: 'block',
      label: 'No night-off-day recovery pattern',
    }),
    Object.freeze({
      ruleId: SCHEDULING_RULE_IDS.MAX_CONSECUTIVE_NIGHTS,
      severity: 'warn',
      label: 'Maximum consecutive nights',
      maxConsecutiveNights: 3,
    }),
    Object.freeze({
      ruleId: SCHEDULING_RULE_IDS.MONTHLY_NIGHT_CAP,
      severity: 'warn',
      label: 'Monthly night cap',
      maxMonthlyNights: 7,
    }),
  ]),
});
