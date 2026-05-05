// derive-suite.js 단위 테스트
import { describe, it, expect } from 'vitest';
import { deriveSuite } from '../../packages/calculators/src/derive-suite.js';

const TODAY = new Date('2026-05-19T09:00:00');

function buildCells(spec) {
  // 'D 8h, E 8h, N 8h+ot1, OFF, AL' 같은 spec → cells map
  const out = {};
  spec.forEach((entry, idx) => {
    const day = idx + 1;
    out[String(day)] = entry;
  });
  return out;
}

describe('deriveSuite', () => {
  it('빈 cells → 0 으로 채워진다', () => {
    const r = deriveSuite({}, {}, TODAY);
    expect(r.totalH).toBe(0);
    expect(r.otH).toBe(0);
    expect(r.leaveDays).toBe(0);
    expect(r.nightHours).toBe(0);
    expect(r.dC).toBe(0); expect(r.eC).toBe(0); expect(r.nC).toBe(0);
    expect(r.nextN).toBeNull();
    expect(r.hasNtoD).toBe(false);
    expect(r.remainingLeave).toBe(21);
    expect(r.remainingOtH).toBe(60);
    expect(r.limitPct).toBe(0);
  });

  it('D 3 / E 2 / N 1 = 정규 48h, 야간 8h', () => {
    const cells = buildCells([
      { duty: 'D', ot: 0, leave: false },
      { duty: 'D', ot: 0, leave: false },
      { duty: 'D', ot: 0, leave: false },
      { duty: 'E', ot: 0, leave: false },
      { duty: 'E', ot: 0, leave: false },
      { duty: 'N', ot: 0, leave: false },
    ]);
    const r = deriveSuite(cells, {}, TODAY);
    expect(r.totalH).toBe(48);
    expect(r.dC).toBe(3); expect(r.eC).toBe(2); expect(r.nC).toBe(1);
    expect(r.nightHours).toBe(8);
  });

  it('OT 합산 — 시간외 시간 합과 한도 60h 비교', () => {
    const cells = buildCells([
      { duty: 'D', ot: 2, leave: false },
      { duty: 'D', ot: 4, leave: false },
      { duty: 'OFF', ot: 0, leave: false },
    ]);
    const r = deriveSuite(cells, {}, TODAY);
    expect(r.otH).toBe(6);
    expect(r.limitPct).toBe(10);
    expect(r.remainingOtH).toBe(54);
  });

  it('연차 (full leave) 1일 차감', () => {
    const cells = buildCells([
      { duty: 'OFF', ot: 0, leave: true, leaveType: '연차' },
      { duty: 'D', ot: 0, leave: false },
    ]);
    const r = deriveSuite(cells, {}, TODAY);
    expect(r.leaveDays).toBe(1);
    expect(r.remainingLeave).toBe(20);
    // leave 일은 정규근무 시간 0 (D 1일 8h 만)
    expect(r.totalH).toBe(8);
  });

  it('반차 (오후) — 0.5일 + 4h 정규근무', () => {
    const cells = buildCells([
      { duty: 'D', ot: 0, leave: true, leaveType: '반차 (오후)' },
    ]);
    const r = deriveSuite(cells, {}, TODAY);
    expect(r.leaveDays).toBe(0.5);
    expect(r.totalH).toBe(4); // 반차 → D 4h
  });

  it('N → D 패턴 검출', () => {
    const cells = buildCells([
      { duty: 'OFF', ot: 0, leave: false },
      { duty: 'N', ot: 0, leave: false },
      { duty: 'D', ot: 0, leave: false },
    ]);
    const r = deriveSuite(cells, {}, TODAY);
    expect(r.hasNtoD).toBe(true);
  });

  it('N → OFF → D 는 N→D 위반 아님', () => {
    const cells = buildCells([
      { duty: 'N', ot: 0, leave: false },
      { duty: 'OFF', ot: 0, leave: false },
      { duty: 'D', ot: 0, leave: false },
    ]);
    const r = deriveSuite(cells, {}, TODAY);
    expect(r.hasNtoD).toBe(false);
  });

  it('nextN — today(19) 기준 가장 가까운 N', () => {
    const cells = {};
    cells['10'] = { duty: 'N', ot: 0, leave: false }; // 과거
    cells['22'] = { duty: 'N', ot: 0, leave: false };
    cells['25'] = { duty: 'N', ot: 0, leave: false };
    const r = deriveSuite(cells, {}, TODAY);
    expect(r.nextN).toEqual({ day: 22, daysAway: 3 });
  });

  it('휴가 처리된 N 은 nextN 후보에서 제외', () => {
    const cells = {};
    cells['22'] = { duty: 'N', ot: 0, leave: true, leaveType: '연차' };
    cells['25'] = { duty: 'N', ot: 0, leave: false };
    const r = deriveSuite(cells, {}, TODAY);
    expect(r.nextN).toEqual({ day: 25, daysAway: 6 });
  });

  it('hourlyRate 주입 시 시간외/야간 예상 수당 도출', () => {
    const cells = buildCells([
      { duty: 'N', ot: 2, leave: false }, // N 8h 야간 + ot 2h
    ]);
    const r = deriveSuite(cells, { hourlyRate: 20000 }, TODAY);
    expect(r.otPay).toBe(60000);   // 2h × 20000 × 1.5
    expect(r.nightPay).toBe(80000); // 8h × 20000 × 0.5
  });

  it('annualQuota 커스텀 (장기재직 +5)', () => {
    const cells = buildCells([
      { duty: 'OFF', ot: 0, leave: true, leaveType: '연차' },
    ]);
    const r = deriveSuite(cells, { annualQuota: 26 }, TODAY);
    expect(r.annualQuota).toBe(26);
    expect(r.remainingLeave).toBe(25);
  });

  it('한도 60h 초과 — limitPct 100% 이상', () => {
    const cells = buildCells([
      { duty: 'D', ot: 30, leave: false },
      { duty: 'D', ot: 35, leave: false },
    ]);
    const r = deriveSuite(cells, {}, TODAY);
    expect(r.otH).toBe(65);
    expect(r.limitPct).toBe(108);
    expect(r.remainingOtH).toBe(0);
  });
});
