// Plan M M3-3~10 잔여 항목 단위 테스트
import { describe, it, expect } from 'vitest';

const { DATA } = require('../../data.js');
globalThis.DATA = DATA;
const { CALC } = require('../../calculators.js');

describe('M3-3 연차보전수당 (제36조(2))', () => {
  it('annualLeaveCompensationRef 9행 정의', () => {
    expect(DATA.leaveQuotas.annualLeaveCompensationRef).toHaveLength(9);
  });

  it('1년차: legacy=22, current=15, factor=7', () => {
    const r = DATA.leaveQuotas.annualLeaveCompensationRef[0];
    expect(r.years).toBe(1);
    expect(r.legacy).toBe(22);
    expect(r.current).toBe(15);
    expect(r.factor).toBe(7);
  });

  it('25년차: factor=21', () => {
    const r = DATA.leaveQuotas.annualLeaveCompensationRef[8];
    expect(r.factor).toBe(21);
  });

  it('calcAnnualLeaveCompensation(10년, 3,135,000): factor=11 적용', () => {
    const r = CALC.calcAnnualLeaveCompensation(10, 3_135_000);
    expect(r.factor).toBe(11);
    expect(r.amount).toBeGreaterThan(0);
    // amount = (11/23) × 일액 × 1.5
    const dailyWage = Math.round(3_135_000 / 209 * 8);
    const expected = Math.round((11 / 23) * dailyWage * 1.5);
    expect(r.amount).toBe(expected);
  });

  it('미입력 → 0', () => {
    expect(CALC.calcAnnualLeaveCompensation(0, 0).amount).toBe(0);
  });
});

describe('M3-4 건강진단 10종', () => {
  it('healthCheckRef 10개 항목', () => {
    expect(DATA.healthCheckRef).toHaveLength(10);
    expect(DATA.healthCheckRef[0].name).toBe('일반건강진단');
  });
});

describe('M3-5 안전보건교육', () => {
  it('safetyEducation: 연 4시간 / 신규 8시간', () => {
    expect(DATA.safetyEducation.annualHours).toBe(4);
    expect(DATA.safetyEducation.newHireHours).toBe(8);
  });
});

describe('M3-6 배치전환 교육', () => {
  it('jobTransferEducation.nurse: 3/6/14일', () => {
    expect(DATA.jobTransferEducation.nurse).toEqual({ sameDept: 3, crossDept: 6, icu: 14 });
  });
  it('jobTransferEducation.nursingOps: 1/2/10일', () => {
    expect(DATA.jobTransferEducation.nursingOps).toEqual({ sameShift: 1, crossShift: 2, surgery: 10 });
  });
});

describe('M3-7 신규간호사 교육', () => {
  it('newNurseTraining: 8주 / ICU 10주 / 80% / 프리셉터 20만', () => {
    expect(DATA.newNurseTraining.weeks).toBe(8);
    expect(DATA.newNurseTraining.icuWeeks).toBe(10);
    expect(DATA.newNurseTraining.payRatio).toBe(0.8);
    expect(DATA.newNurseTraining.preceptorMonthlyPay).toBe(200000);
  });
});

describe('M3-8 단시간 근로자', () => {
  it('partTimeRules: 110시간 임계 / 50% 경력 / 30,000원 장애인 수당', () => {
    expect(DATA.partTimeRules.monthlyHourThreshold).toBe(110);
    expect(DATA.partTimeRules.careerRecognitionRatio).toBe(0.5);
    expect(DATA.partTimeRules.disabilityBonus).toBe(30000);
    expect(DATA.partTimeRules.medicalDiscount).toBe(0.5);
  });
});

describe('M3-9 자녀 출산 축하 + 생일상품권', () => {
  it('childBirthCongratulations 3구간 (500/1000/2000P)', () => {
    expect(DATA.childBirthCongratulations).toHaveLength(3);
    expect(DATA.childBirthCongratulations[0].points).toBe(500);
    expect(DATA.childBirthCongratulations[1].points).toBe(1000);
    expect(DATA.childBirthCongratulations[2].points).toBe(2000);
  });
  it('birthdayCoupon 100,000원', () => {
    expect(DATA.birthdayCoupon).toBe(100000);
  });
});

// M3-10 캘린더 — 이미 D9 (Phase B) 에서 hospitalHolidays 에 조합설립일 추가 완료.
// 별도 테스트 없이 audit 갱신으로 처리.
