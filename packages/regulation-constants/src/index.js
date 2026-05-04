// ============================================================
// regulation-constants.js
// 병원 보수규정 단일 진실 출처 (Single Source of Truth)
// 기준: 2025.10.23 단체협약 + 2026 조합원 수첩 별표
// 모든 상수는 _refs 객체에 조항 근거 주석 포함
// ============================================================
// 사용법:
//   const RC = require('./regulation-constants.js')
//   const hourlyBase = monthlyWage / RC.ORDINARY_WAGE_HOURS
// ============================================================

'use strict';

// ── 근로시간 기준 ───────────────────────────────────────────

/** 월 소정근로시간 (제32조: 1일 8h × 주 5일 × 52/12주 ≈ 209h) */
export const ORDINARY_WAGE_HOURS = 209;

/** 시간외근무 계산 단위 (분) */
export const OVERTIME_UNIT_MINUTES = 15;

// ── 시간외수당 배율 ─────────────────────────────────────────

/** 연장근로 배율 150% (제34조: 주 12시간 상한) */
export const OVERTIME_MULTIPLIER = 1.5;

/** 야간근로 배율 200% (제47조: 22:00~06:00) */
export const NIGHT_ALLOWANCE_MULTIPLIER = 2.0;

/** 통상근무자 연장→야간 배율 200% (제34조) */
export const EXTENDED_NIGHT_MULTIPLIER = 2.0;

/** 휴일근로 배율 150% (제34조: 8시간 이내) */
export const HOLIDAY_MULTIPLIER = 1.5;

/** 휴일근로 초과 배율 200% (제34조: 8시간 초과) */
export const HOLIDAY_OVER8_MULTIPLIER = 2.0;

/** 일직/숙직비 1일 (제34조) */
export const DUTY_ALLOWANCE_DAILY = 50000;

// ── 수당 금액 ───────────────────────────────────────────────

/** 급식보조비 월 (제43조, 별표: 2026년 기준) */
export const MEAL_SUBSIDY = 150000;

/** 교통보조비 월 (제43조, 별표: 2026년 기준) */
export const TRANSPORT_SUBSIDY = 150000;

/** 교육훈련비(자기계발별정수당) 월 (제43조, 별표) */
export const EDUCATION_ALLOWANCE_MONTHLY = 40000;

/** 별정수당5 월 (별표) */
export const SPECIAL_PAY5_MONTHLY = 35000;

/** 리프레시지원비 월 30,000원 (별도합의 2024.11: 2026.01.01부터 통상임금 산입) */
export const REFRESH_BENEFIT_MONTHLY = 30000;

/** 군복무수당 월 (별표: 최대 2년/24개월 기준 월할) */
export const MILITARY_SERVICE_PAY_MONTHLY = 45000;

/** 군복무수당 최대 인정 개월 (별표: 2년) */
export const MILITARY_SERVICE_MAX_MONTHS = 24;

/** 온콜 대기수당 일당 (제32조) */
export const ON_CALL_STANDBY_DAILY = 10000;

/** 온콜 출근 교통비 (제32조) */
export const ON_CALL_TRANSPORT = 50000;

/** 온콜 출근 인정 근무시간 (제32조: 2시간) */
export const ON_CALL_COMMUTE_HOURS = 2;

/** 야간근무 가산금 회당 (제32조 부속합의) */
export const NIGHT_SHIFT_BONUS_PER_SHIFT = 10000;

/** 프라임팀(예비인력) 대체근무 가산 일당 (제32조 부속합의) */
export const PRIME_TEAM_SUBSTITUTE_DAILY = 20000;

/** 프리셉터 교육수당 (제63조의2) */
export const PRECEPTOR_ALLOWANCE = 200000;

// ── 장기근속수당 (제50조 — ADDITIVE 구조) ──────────────────
// 규정: 5~9년 5만 / 10~14년 6만 / 15~19년 8만 / 20년+ 10만
//       21년 이상 1만 가산 / 25년 이상 3만 가산
// ADDITIVE 계산: 해당 구간 금액 = 기준액 + 가산액 합계
// 20년=100,000 / 21년=110,000(+10,000) / 25년=140,000(+30,000)
export const LONG_SERVICE_PAY = [
  { min:  0, max:  5, amount:       0 }, // 5년 미만: 미지급
  { min:  5, max: 10, amount:   50000 }, // 5~9년
  { min: 10, max: 15, amount:   60000 }, // 10~14년
  { min: 15, max: 20, amount:   80000 }, // 15~19년
  { min: 20, max: 21, amount:  100000 }, // 20년 (기준액)
  { min: 21, max: 25, amount:  110000 }, // 21~24년 (+10,000 가산)
  { min: 25, max: 99, amount:  140000 }  // 25년+ (+30,000 추가 가산, BUG-02 수정: 130,000→140,000)
];

// ── 근속가산율 (제46조 — 2016.02.29 이전 입사자 한정) ────────
export const SENIORITY_RATES = [
  { min:  1, max:  5, rate: 0.02 }, // 1~5년 2%
  { min:  5, max: 10, rate: 0.05 }, // 5~10년 5%
  { min: 10, max: 15, rate: 0.06 }, // 10~15년 6%
  { min: 15, max: 20, rate: 0.07 }, // 15~20년 7%
  { min: 20, max: 99, rate: 0.08 }  // 20년+ 8%
];

/** 근속가산기본급 적용 기준일 (제46조: 이전 입사자만) */
export const SENIORITY_CUT_DATE = '2016-02-29';

// ── 가계지원비 지급월 ────────────────────────────────────────
// 별표: 3,4,5,6,7,8,10,11,12월 고정 + 설/추석 해당 2개월 = 연 11개월
// 미지급 기준월: 1월, 9월 (단, 설/추석 해당 시 지급)
export const FAMILY_SUPPORT_SKIP_MONTHS = [1, 9]; // 기준 미지급월 (설/추석 해당 시 제외)

// ── 퇴직수당 요율 (제52~57조 — 2015.06.30 이전 입사자) ─────
export const SEVERANCE_PAY_RATES = [
  { min: 20, rate: 0.60 }, // 20년 이상 60%
  { min: 15, rate: 0.50 }, // 15~19년 50%
  { min: 10, rate: 0.45 }, // 10~14년 45%
  { min:  5, rate: 0.35 }, // 5~9년 35%
  { min:  1, rate: 0.10 }  // 1~4년 10%
];

/** 퇴직수당 기준일 (제52조: 이전 입사자) */
export const SEVERANCE_CUT_DATE_2015 = '2015-06-30';

// ── 2001.08.31 이전 입사자 누진배수 (제52~57조) ─────────────
export const SEVERANCE_MULTIPLIERS_PRE2001 = [
  { min: 30, multiplier: 52.5 },
  { min: 25, multiplier: 42.5 },
  { min: 20, multiplier: 33.0 },
  { min: 15, multiplier: 24.0 },
  { min: 14, multiplier: 22.3 },
  { min: 13, multiplier: 20.6 },
  { min: 12, multiplier: 18.9 },
  { min: 11, multiplier: 17.2 },
  { min: 10, multiplier: 15.5 },
  { min:  9, multiplier: 13.9 },
  { min:  8, multiplier: 12.3 },
  { min:  7, multiplier: 10.7 },
  { min:  6, multiplier:  9.1 },
  { min:  5, multiplier:  7.5 },
  { min:  4, multiplier:  5.5 },
  { min:  3, multiplier:  3.5 },
  { min:  2, multiplier:  2.0 },
  { min:  1, multiplier:  1.0 }
];

/** 누진배수 기준일 (제52조) */
export const SEVERANCE_CUT_DATE_2001 = '2001-08-31';

// ── 연차 규정 (제36조) ─────────────────────────────────────
export const ANNUAL_LEAVE = {
  underOneYear: 1,    // 1년 미만: 월 1일
  maxUnderOne: 11,    // 1년 미만 최대
  baseLeave: 15,      // 1년 이상: 15일
  addPerTwoYears: 1,  // 3년차 이상: 2년마다 1일 추가
  maxLeave: 25        // 최대 25일 (제36조)
};

// ── 가족수당 (제44조 2항 — 통상임금 제외) ────────────────────
export const FAMILY_ALLOWANCE = {
  spouse: 40000,         // 배우자
  generalFamily: 20000,  // 가족 1인당 (5인 제한)
  maxFamilyMembers: 5,
  child1: 30000,         // 첫째 자녀
  child2: 70000,         // 둘째 자녀
  child3Plus: 110000     // 셋째 이상
};

// ── 조항 주석 매핑 ─────────────────────────────────────────
// 모든 상수의 규정 근거를 추적
export const _refs = {
  ORDINARY_WAGE_HOURS:              '제32조',
  OVERTIME_UNIT_MINUTES:            '제34조',
  OVERTIME_MULTIPLIER:              '제34조',
  NIGHT_ALLOWANCE_MULTIPLIER:       '제47조',
  EXTENDED_NIGHT_MULTIPLIER:        '제34조',
  HOLIDAY_MULTIPLIER:               '제34조',
  HOLIDAY_OVER8_MULTIPLIER:         '제34조',
  DUTY_ALLOWANCE_DAILY:             '제34조',
  MEAL_SUBSIDY:                     '제43조',
  TRANSPORT_SUBSIDY:                '제43조',
  EDUCATION_ALLOWANCE_MONTHLY:      '제43조',
  SPECIAL_PAY5_MONTHLY:             '별표',
  REFRESH_BENEFIT_MONTHLY:          '별도합의 2024.11',
  MILITARY_SERVICE_PAY_MONTHLY:     '별표',
  MILITARY_SERVICE_MAX_MONTHS:      '별표',
  ON_CALL_STANDBY_DAILY:            '제32조',
  ON_CALL_TRANSPORT:                '제32조',
  ON_CALL_COMMUTE_HOURS:            '제32조',
  NIGHT_SHIFT_BONUS_PER_SHIFT:      '제32조 부속합의',
  PRIME_TEAM_SUBSTITUTE_DAILY:      '제32조 부속합의',
  PRECEPTOR_ALLOWANCE:              '제63조의2',
  LONG_SERVICE_PAY:                 '제50조',
  SENIORITY_RATES:                  '제46조',
  SENIORITY_CUT_DATE:               '제46조',
  FAMILY_SUPPORT_SKIP_MONTHS:       '별표',
  SEVERANCE_PAY_RATES:              '제52~57조',
  SEVERANCE_CUT_DATE_2015:          '제52조',
  SEVERANCE_MULTIPLIERS_PRE2001:    '제52~57조',
  SEVERANCE_CUT_DATE_2001:          '제52조',
  ANNUAL_LEAVE:                     '제36조',
  FAMILY_ALLOWANCE:                 '제44조'
};

// ── 호환층 (window.RC) ──────────────────────────────────────
// IIFE 모듈 (regulation.js / payroll.js 등) 이 아직 window.RC 참조.
// Phase 2-F/H 정리 후 제거 가능.
if (typeof window !== 'undefined') {
  window.RC = {
    ORDINARY_WAGE_HOURS, OVERTIME_UNIT_MINUTES, OVERTIME_MULTIPLIER,
    NIGHT_ALLOWANCE_MULTIPLIER, EXTENDED_NIGHT_MULTIPLIER,
    HOLIDAY_MULTIPLIER, HOLIDAY_OVER8_MULTIPLIER,
    DUTY_ALLOWANCE_DAILY, MEAL_SUBSIDY, TRANSPORT_SUBSIDY,
    EDUCATION_ALLOWANCE_MONTHLY, SPECIAL_PAY5_MONTHLY, REFRESH_BENEFIT_MONTHLY,
    MILITARY_SERVICE_PAY_MONTHLY, MILITARY_SERVICE_MAX_MONTHS,
    ON_CALL_STANDBY_DAILY, ON_CALL_TRANSPORT, ON_CALL_COMMUTE_HOURS,
    NIGHT_SHIFT_BONUS_PER_SHIFT, PRIME_TEAM_SUBSTITUTE_DAILY,
    PRECEPTOR_ALLOWANCE, LONG_SERVICE_PAY,
    SENIORITY_RATES, SENIORITY_CUT_DATE, FAMILY_SUPPORT_SKIP_MONTHS,
    SEVERANCE_PAY_RATES, SEVERANCE_CUT_DATE_2015,
    SEVERANCE_MULTIPLIERS_PRE2001, SEVERANCE_CUT_DATE_2001,
    ANNUAL_LEAVE, FAMILY_ALLOWANCE, _refs
  };
}
