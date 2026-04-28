// Plan M Phase 2 — 신규 계산기 단위 테스트
// 실행: npm run test:unit -- plan-m-phase-2
import { describe, it, expect } from 'vitest';
import { DATA } from '@snuhmate/data';
import { CALC } from '@snuhmate/calculators';

describe('M2-1 장기재직휴가 5/7일 자동부여 (<2025.10>)', () => {
  it('< 10년: 미부여 (0일)', () => {
    expect(CALC.calcLongServiceLeave(0)).toBe(0);
    expect(CALC.calcLongServiceLeave(9.99)).toBe(0);
  });

  it('10~19년: 5일', () => {
    expect(CALC.calcLongServiceLeave(10)).toBe(5);
    expect(CALC.calcLongServiceLeave(15)).toBe(5);
    expect(CALC.calcLongServiceLeave(19.99)).toBe(5);
  });

  it('20년+: 7일', () => {
    expect(CALC.calcLongServiceLeave(20)).toBe(7);
    expect(CALC.calcLongServiceLeave(30)).toBe(7);
    expect(CALC.calcLongServiceLeave(40)).toBe(7);
  });

  it('음수/null/undefined → 0 (방어)', () => {
    expect(CALC.calcLongServiceLeave(-1)).toBe(0);
    expect(CALC.calcLongServiceLeave(null)).toBe(0);
    expect(CALC.calcLongServiceLeave(undefined)).toBe(0);
  });
});

describe('M2-8 연장근로 한도 검증 (제34조(1))', () => {
  it('1일 2시간 / 주 12시간 이내: 한도 OK', () => {
    const r = CALC.checkOvertimeLimit({ daily: 2, weekly: 10 });
    expect(r.exceedsDaily).toBe(false);
    expect(r.exceedsWeekly).toBe(false);
    expect(r.warning).toBe(null);
  });

  it('1일 2.5시간: 일 한도 초과 경고', () => {
    const r = CALC.checkOvertimeLimit({ daily: 2.5, weekly: 5 });
    expect(r.exceedsDaily).toBe(true);
    expect(r.warning).toContain('1일 2시간');
  });

  it('주 12시간 초과: 주 한도 위반 경고 (법정 상한)', () => {
    const r = CALC.checkOvertimeLimit({ daily: 2, weekly: 13 });
    expect(r.exceedsWeekly).toBe(true);
    expect(r.warning).toContain('주 12시간');
  });

  it('주 10~12시간: 부득이한 경우 (안내성)', () => {
    const r = CALC.checkOvertimeLimit({ daily: 2, weekly: 11 });
    expect(r.exceedsWeekly).toBe(false);
    expect(r.exceedsDaily).toBe(false);
    expect(r.warning).toContain('부득이');
  });

  it('일 2 / 주 0: 정상', () => {
    const r = CALC.checkOvertimeLimit({ daily: 2, weekly: 0 });
    expect(r.warning).toBe(null);
  });
});

describe('M2-4 쌍둥이 출산 120일 분기 (제38조(1))', () => {
  it('단태아: 90일', () => {
    expect(CALC.calcMaternityLeave({ multiple: false })).toBe(90);
    expect(CALC.calcMaternityLeave({})).toBe(90);
  });

  it('쌍둥이/다태아: 120일', () => {
    expect(CALC.calcMaternityLeave({ multiple: true })).toBe(120);
  });

  it('미숙아: 100일', () => {
    expect(CALC.calcMaternityLeave({ premature: true })).toBe(100);
  });

  it('쌍둥이 + 미숙아: 120일 (다태아 우선)', () => {
    expect(CALC.calcMaternityLeave({ multiple: true, premature: true })).toBe(120);
  });
});

describe('M2-5 유산·사산 5구간 (제38조(2))', () => {
  it('28주↑ → 90일', () => {
    expect(CALC.calcMiscarriageLeave(28)).toBe(90);
    expect(CALC.calcMiscarriageLeave(40)).toBe(90);
  });

  it('22~27주 → 60일', () => {
    expect(CALC.calcMiscarriageLeave(22)).toBe(60);
    expect(CALC.calcMiscarriageLeave(27)).toBe(60);
  });

  it('16~21주 → 30일', () => {
    expect(CALC.calcMiscarriageLeave(16)).toBe(30);
    expect(CALC.calcMiscarriageLeave(21)).toBe(30);
  });

  it('12~15주 → 10일', () => {
    expect(CALC.calcMiscarriageLeave(12)).toBe(10);
    expect(CALC.calcMiscarriageLeave(15)).toBe(10);
  });

  it('11주 이하 → 5일', () => {
    expect(CALC.calcMiscarriageLeave(11)).toBe(5);
    expect(CALC.calcMiscarriageLeave(1)).toBe(5);
  });

  it('null/0/음수 → 5일 (최소 보장)', () => {
    expect(CALC.calcMiscarriageLeave(0)).toBe(5);
    expect(CALC.calcMiscarriageLeave(null)).toBe(5);
  });
});

describe('M2-2 휴직자 70% 급여 (제28조(2))', () => {
  it('질병/공상 휴직 70%: (기본+능력+조정+상여) × 0.7', () => {
    const r = CALC.calcLeaveOfAbsencePay({
      monthlyBase: 2_000_000,
      ability: 500_000,
      adjust: 100_000,
      bonus: 200_000,
    }, 'sick');
    // (2000000 + 500000 + 100000 + 200000) × 0.7 = 2,800,000 × 0.7 = 1,960,000
    expect(r.amount).toBe(1_960_000);
    expect(r.rate).toBe(0.7);
  });

  it('rate 명시: 80%', () => {
    const r = CALC.calcLeaveOfAbsencePay({
      monthlyBase: 1_000_000, ability: 0, adjust: 0, bonus: 0,
    }, 'custom', 0.8);
    expect(r.amount).toBe(800_000);
    expect(r.rate).toBe(0.8);
  });

  it('성분 누락: 0 처리', () => {
    const r = CALC.calcLeaveOfAbsencePay({ monthlyBase: 1_000_000 }, 'sick');
    expect(r.amount).toBe(700_000);
  });

  it('전부 0: 0 반환', () => {
    const r = CALC.calcLeaveOfAbsencePay({}, 'sick');
    expect(r.amount).toBe(0);
  });
});
