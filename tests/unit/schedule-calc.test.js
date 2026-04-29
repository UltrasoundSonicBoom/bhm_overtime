// tests/unit/schedule-calc.test.js — 근무 탭 순수 계산 함수 단위 테스트
import { describe, it, expect } from 'vitest';
import {
  calcMonthlyDutyCounts,
  calcEstimatedNightPay,
  calcEstimatedHolidayPay,
  detectViolations,
  findNextDuty,
  calcHppdByDay,
  mineMapToRecords,
  DUTY_TIMES,
  HPPD_THRESHOLDS,
  VIOLATION_LIMITS,
} from '../../apps/web/src/client/schedule-calc.js';

describe('calcMonthlyDutyCounts', () => {
  it('카운트가 코드별로 정확히 누적된다', () => {
    const mine = { 1: 'D', 2: 'D', 3: 'E', 4: 'N', 5: 'N', 6: 'N', 7: 'O', 8: 'AL', 9: 'RD' };
    const counts = calcMonthlyDutyCounts(mine);
    expect(counts).toEqual({ D: 2, E: 1, N: 3, O: 1, AL: 1, RD: 1, holidayDuty: 0 });
  });

  it('공휴일에 D/E/N 근무 시 holidayDuty 카운트', () => {
    const mine = { 1: 'D', 2: 'E', 3: 'N', 4: 'O' };
    const holidaySet = new Set([1, 3]); // 1일 D + 3일 N → 공휴일 근무
    const counts = calcMonthlyDutyCounts(mine, holidaySet);
    expect(counts.holidayDuty).toBe(2);
  });

  it('빈 mineMap에서 0 카운트 반환', () => {
    expect(calcMonthlyDutyCounts({})).toEqual({ D: 0, E: 0, N: 0, O: 0, AL: 0, RD: 0, holidayDuty: 0 });
    expect(calcMonthlyDutyCounts(null)).toEqual({ D: 0, E: 0, N: 0, O: 0, AL: 0, RD: 0, holidayDuty: 0 });
  });

  it('알 수 없는 코드는 무시', () => {
    const mine = { 1: 'D', 2: 'X', 3: 'N' };
    const counts = calcMonthlyDutyCounts(mine);
    expect(counts.D).toBe(1);
    expect(counts.N).toBe(1);
  });
});

describe('calcEstimatedNightPay', () => {
  it('정상 케이스: N 7회, 시급 25,000원', () => {
    // 가산금 = 7 * 10,000 = 70,000
    // 야간 가산임금 = 7 * 8 * 25,000 * 1.0 = 1,400,000
    expect(calcEstimatedNightPay(7, 25000)).toBe(70_000 + 1_400_000);
  });

  it('시급 0이면 0 반환 (graceful degrade)', () => {
    expect(calcEstimatedNightPay(7, 0)).toBe(0);
  });

  it('N 0회면 0 반환', () => {
    expect(calcEstimatedNightPay(0, 25000)).toBe(0);
  });

  it('null/undefined 안전', () => {
    expect(calcEstimatedNightPay(null, 25000)).toBe(0);
    expect(calcEstimatedNightPay(7, null)).toBe(0);
  });
});

describe('calcEstimatedHolidayPay', () => {
  it('정상 케이스: 공휴일 2회, 시급 25,000원', () => {
    // 2 * 8 * 25000 * 0.5 = 200,000 (가산분 50%)
    expect(calcEstimatedHolidayPay(2, 25000)).toBe(200_000);
  });

  it('시급 0이면 0', () => {
    expect(calcEstimatedHolidayPay(2, 0)).toBe(0);
  });
});

describe('detectViolations', () => {
  it('N 3일 연속 → consecutive_night 1건', () => {
    const mine = { 1: 'D', 2: 'N', 3: 'N', 4: 'N', 5: 'O' };
    const v = detectViolations(mine, 2026, 4);
    const consec = v.filter(x => x.type === 'consecutive_night');
    expect(consec).toHaveLength(1);
    expect(consec[0].days).toBe(3);
    expect(consec[0].fromDate).toBe('2026-04-02');
  });

  it('N 2일은 위반 아님', () => {
    const mine = { 1: 'N', 2: 'N', 3: 'O' };
    const v = detectViolations(mine, 2026, 4);
    expect(v.filter(x => x.type === 'consecutive_night')).toHaveLength(0);
  });

  it('N → D 인접 → min_rest_violation', () => {
    const mine = { 1: 'O', 2: 'N', 3: 'D' };
    const v = detectViolations(mine, 2026, 4);
    const rest = v.filter(x => x.type === 'min_rest_violation');
    expect(rest).toHaveLength(1);
    expect(rest[0].date).toBe('2026-04-03');
  });

  it('N 10일 → monthly_night_overflow', () => {
    const mine = {};
    for (let d = 1; d <= 10; d++) mine[d] = 'N';
    for (let d = 11; d <= 30; d++) mine[d] = 'O';
    const v = detectViolations(mine, 2026, 4);
    const overflow = v.filter(x => x.type === 'monthly_night_overflow');
    expect(overflow).toHaveLength(1);
    expect(overflow[0].count).toBe(10);
    expect(overflow[0].limit).toBe(VIOLATION_LIMITS.monthlyNightMax);
  });

  it('빈 mineMap에서 빈 배열', () => {
    expect(detectViolations({}, 2026, 4)).toEqual([]);
    expect(detectViolations(null, 2026, 4)).toEqual([]);
  });
});

describe('findNextDuty', () => {
  it('오늘이 이번 달이면 오늘 이후 첫 비-O 날 반환', () => {
    const mine = { 28: 'D', 29: 'O', 30: 'N' };
    const today = new Date('2026-04-29T10:00:00');
    const next = findNextDuty(mine, 2026, 4, today);
    expect(next.date).toBe('2026-04-30');
    expect(next.code).toBe('N');
    expect(next.timeRange).toBe('22:00 ~ 익일 07:00');
  });

  it('오늘 듀티가 있으면 오늘 반환', () => {
    const mine = { 29: 'D', 30: 'N' };
    const today = new Date('2026-04-29T05:00:00');
    const next = findNextDuty(mine, 2026, 4, today);
    expect(next.date).toBe('2026-04-29');
    expect(next.code).toBe('D');
  });

  it('이번 달이 아닌 today면 1일부터 검색', () => {
    const mine = { 1: 'O', 2: 'D' };
    const today = new Date('2026-05-15T10:00:00');
    const next = findNextDuty(mine, 2026, 4, today);
    expect(next.date).toBe('2026-04-02');
  });

  it('비-O 듀티가 없으면 null', () => {
    const mine = { 1: 'O', 2: 'O' };
    expect(findNextDuty(mine, 2026, 4, new Date('2026-04-01'))).toBeNull();
  });
});

describe('calcHppdByDay', () => {
  it('mine + team 인원 합산, 임계 충족도 계산', () => {
    const monthData = {
      mine: { 1: 'D', 2: 'N' },
      team: {
        '동료1': { 1: 'D', 2: 'N' },
        '동료2': { 1: 'E', 2: 'N' },
        '동료3': { 1: 'E', 2: 'D' },
        '동료4': { 1: 'E', 2: 'D' },
        '동료5': { 1: 'D', 2: 'O' },
      },
    };
    const hppd = calcHppdByDay(monthData, 2026, 4);
    // 1일: D=3 (mine + 동료1 + 동료5), E=3 (동료2,3,4) → day+evening=6 ≥ 5 OK; N=0 → night<2 alert
    expect(hppd[1].day).toBe(3);
    expect(hppd[1].evening).toBe(3);
    expect(hppd[1].night).toBe(0);
    expect(hppd[1].ok).toBe(false); // night 부족
    expect(hppd[1].alert).toBe(true);

    // 2일: D=2 (동료3,4), E=0, N=3 (mine + 동료1,2) → day+evening=2 부족, night OK
    expect(hppd[2].day).toBe(2);
    expect(hppd[2].night).toBe(3);
    expect(hppd[2].ok).toBe(false);
  });

  it('임계 모두 충족하면 ok=true', () => {
    const monthData = {
      mine: { 1: 'D' },
      team: {
        a: { 1: 'D' }, b: { 1: 'D' }, c: { 1: 'E' }, d: { 1: 'E' },
        e: { 1: 'N' }, f: { 1: 'N' },
      },
    };
    const hppd = calcHppdByDay(monthData, 2026, 4);
    expect(hppd[1].day).toBe(3);
    expect(hppd[1].evening).toBe(2);
    expect(hppd[1].night).toBe(2);
    expect(hppd[1].ok).toBe(true);
    expect(hppd[1].alert).toBe(false);
  });
});

describe('mineMapToRecords', () => {
  it('N → overtime 레코드 (source 태그 포함)', () => {
    const mine = { 1: 'N', 2: 'O' };
    const out = mineMapToRecords(mine, 2026, 4, new Set(), { hourlyRate: 25000 });
    expect(out.overtimeRecords).toHaveLength(1);
    const r = out.overtimeRecords[0];
    expect(r.date).toBe('2026-04-01');
    expect(r.startTime).toBe('22:00');
    expect(r.endTime).toBe('07:00');
    expect(r.type).toBe('overtime');
    expect(r.source).toBe('schedule');
    expect(r.sourceMonth).toBe('2026-04');
    expect(r.hourlyRate).toBe(25000);
  });

  it('공휴일 D → overtime 레코드 isHoliday=true', () => {
    const mine = { 1: 'D' };
    const out = mineMapToRecords(mine, 2026, 4, new Set([1]));
    expect(out.overtimeRecords).toHaveLength(1);
    expect(out.overtimeRecords[0].isHoliday).toBe(true);
    expect(out.overtimeRecords[0].startTime).toBe('07:00');
  });

  it('평일 D/E → 레코드 생성 안 함', () => {
    const mine = { 1: 'D', 2: 'E' };
    const out = mineMapToRecords(mine, 2026, 4);
    expect(out.overtimeRecords).toHaveLength(0);
    expect(out.leaveRecords).toHaveLength(0);
  });

  it('AL → annual leave 레코드', () => {
    const mine = { 5: 'AL' };
    const out = mineMapToRecords(mine, 2026, 4);
    expect(out.leaveRecords).toHaveLength(1);
    const r = out.leaveRecords[0];
    expect(r.type).toBe('annual');
    expect(r.startDate).toBe('2026-04-05');
    expect(r.endDate).toBe('2026-04-05');
    expect(r.source).toBe('schedule');
  });

  it('RD → recovery_day leave 레코드', () => {
    const mine = { 6: 'RD' };
    const out = mineMapToRecords(mine, 2026, 4);
    expect(out.leaveRecords).toHaveLength(1);
    expect(out.leaveRecords[0].type).toBe('recovery_day');
  });

  it('전체 시나리오: 야간 + 연차 + 공휴일 D + 평일 O 혼합', () => {
    const mine = { 1: 'D', 2: 'N', 3: 'AL', 4: 'O', 5: 'RD' };
    const holidaySet = new Set([1]);
    const out = mineMapToRecords(mine, 2026, 4, holidaySet, { hourlyRate: 25000 });
    expect(out.overtimeRecords).toHaveLength(2); // 1일 공휴일 D + 2일 N
    expect(out.leaveRecords).toHaveLength(2);    // 3일 AL + 5일 RD
  });
});

describe('상수 export', () => {
  it('DUTY_TIMES 매핑이 노출된다', () => {
    expect(DUTY_TIMES.D).toEqual({ start: '07:00', end: '15:00', overnight: false, hours: 8 });
    expect(DUTY_TIMES.N.overnight).toBe(true);
    expect(DUTY_TIMES.O).toBeNull();
  });

  it('HPPD_THRESHOLDS 임계값이 정의된다', () => {
    expect(HPPD_THRESHOLDS.dayEvening).toBe(5);
    expect(HPPD_THRESHOLDS.night).toBe(2);
  });

  it('VIOLATION_LIMITS 한도가 정의된다', () => {
    expect(VIOLATION_LIMITS.consecutiveNight).toBe(3);
    expect(VIOLATION_LIMITS.minRestHours).toBe(11);
    expect(VIOLATION_LIMITS.monthlyNightMax).toBe(9);
  });
});
