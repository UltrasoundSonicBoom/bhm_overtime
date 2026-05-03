import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

let PROFILE;

beforeAll(async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;
  global.CustomEvent = dom.window.CustomEvent;
  global.Event = dom.window.Event;

  ({ PROFILE } = await import('@snuhmate/profile/profile'));
  await import('../../apps/web/src/client/pay-estimation.js');
});

beforeEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
});

function seedProfile() {
  PROFILE.save({
    name: '테스트',
    jobType: '간호직',
    grade: 'J3',
    year: 1,
    hireDate: '2020-03-01',
    adjustPay: 0,
    numFamily: 0,
    numChildren: 0,
  });
}

describe('calcMonthEstimate cross-flow', () => {
  it('근무표에서 생성된 휴가 salaryImpact를 월 급여 공제로 반영한다', () => {
    seedProfile();
    const baseline = window.calcMonthEstimate(2026, 4);

    localStorage.setItem('leaveRecords', JSON.stringify({
      2026: [{
        id: 'lv_schedule_1',
        type: 'sick',
        startDate: '2026-04-10',
        endDate: '2026-04-10',
        salaryImpact: -50000,
        source: 'schedule',
        sourceMonth: '2026-04',
      }],
    }));

    const withLeave = window.calcMonthEstimate(2026, 4);

    expect(withLeave.result.공제내역['휴가·휴직 공제']).toBe(50000);
    expect(withLeave.result.공제총액).toBe(baseline.result.공제총액 + 50000);
    expect(withLeave.result.실지급액).toBe(baseline.result.실지급액 - 50000);
    expect(withLeave.flags.tags).toContain('휴가·휴직 공제 반영');
  });

  it('7월_시뮬레이션은_명절지원비_플래그를_켠다', () => {
    seedProfile();
    const july = window.calcMonthEstimate(2026, 7);
    expect(july.flags.tags).toContain('7월 명절지원비');
    expect(july.flags.isHolidayBonus).toBe(true);
  });

  it('1월_시뮬레이션은_가계지원비를_빼고_설_명절지원비를_올린다', () => {
    seedProfile();
    const january = window.calcMonthEstimate(2026, 1);
    expect(january.flags.isFamilySupportMonth).toBe(true); // 설월은 지급
    expect(january.flags.tags).toContain('설 명절지원비');
    // 1월 결과 객체에는 가계지원비가 포함되어야 함 (설월 지급)
    expect(january.result.지급내역['가계지원비'] || 0).toBeGreaterThan(0);
  });
});

describe('CALC.normalizePayLabel — 명세서/예상 라벨 매칭', () => {
  let CALC;
  beforeAll(async () => { ({ CALC } = await import('@snuhmate/calculators')); });

  it('기본급_alias는_canonical_기준기본급으로_매핑된다', () => {
    expect(CALC.normalizePayLabel('기본급')).toBe('기준기본급');
    expect(CALC.normalizePayLabel('기본기준급')).toBe('기준기본급');
  });

  it('직책수당_alias는_canonical_직책급으로_매핑된다', () => {
    expect(CALC.normalizePayLabel('직책수당')).toBe('직책급');
    expect(CALC.normalizePayLabel('직무수당')).toBe('직책급');
  });

  it('명절휴가비는_명절지원비로_매핑된다', () => {
    expect(CALC.normalizePayLabel('명절휴가비')).toBe('명절지원비');
  });

  it('alias가_없는_라벨은_그대로_반환된다', () => {
    expect(CALC.normalizePayLabel('가족수당')).toBe('가족수당');
    expect(CALC.normalizePayLabel('알수없는항목')).toBe('알수없는항목');
  });
});

describe('CALC.groupDeductions — 변동/고정/기타 분리', () => {
  let CALC;
  beforeAll(async () => { ({ CALC } = await import('@snuhmate/calculators')); });

  it('변동_공제와_고정_공제를_올바르게_분리한다', () => {
    const groups = CALC.groupDeductions({
      '국민연금': 100000,
      '소득세(근사)': 50000,
      '휴가·휴직 공제': 30000,
      '무급휴가공제': 20000,
      '기타알수없음': 5000,
    });
    expect(groups.fixed['국민연금']).toBe(100000);
    expect(groups.fixed['소득세(근사)']).toBe(50000);
    expect(groups.variable['휴가·휴직 공제']).toBe(30000);
    expect(groups.variable['무급휴가공제']).toBe(20000);
    expect(groups.other['기타알수없음']).toBe(5000);
  });

  it('빈_입력은_빈_세_그룹을_반환한다', () => {
    const groups = CALC.groupDeductions({});
    expect(Object.keys(groups.variable).length).toBe(0);
    expect(Object.keys(groups.fixed).length).toBe(0);
    expect(Object.keys(groups.other).length).toBe(0);
  });
});

describe('PROFILE.hasLegacySeniority — 입사일 기반 자동판정', () => {
  let PROFILE;
  beforeAll(async () => { ({ PROFILE } = await import('@snuhmate/profile/profile')); });

  it('2016_03_01_이전_입사자는_true_를_반환한다', () => {
    expect(PROFILE.hasLegacySeniority({ hireDate: '2015-12-31' })).toBe(true);
    expect(PROFILE.hasLegacySeniority({ hireDate: '2016-02-29' })).toBe(true);
  });

  it('2016_03_01_이후_입사자는_false_를_반환한다', () => {
    expect(PROFILE.hasLegacySeniority({ hireDate: '2016-03-01' })).toBe(false);
    expect(PROFILE.hasLegacySeniority({ hireDate: '2020-01-15' })).toBe(false);
  });

  it('hasSeniority_가_명시적으로_true_이면_입사일_무관_true', () => {
    expect(PROFILE.hasLegacySeniority({ hireDate: '2025-01-01', hasSeniority: true })).toBe(true);
  });

  it('hasSeniority_가_명시적으로_false_이면_입사일_무관_false', () => {
    expect(PROFILE.hasLegacySeniority({ hireDate: '2010-01-01', hasSeniority: false })).toBe(false);
  });

  it('hireDate_가_없으면_false', () => {
    expect(PROFILE.hasLegacySeniority({})).toBe(false);
    expect(PROFILE.hasLegacySeniority(null)).toBe(false);
  });
});

describe('OVERTIME.addRecord — 온콜 standby+callOut 중복 방지', () => {
  let OVERTIME;
  beforeAll(async () => { ({ OVERTIME } = await import('@snuhmate/profile/overtime')); });

  beforeEach(() => { localStorage.clear(); });

  it('같은_날짜에_standby_뒤_callout_입력_시_차단된다', () => {
    OVERTIME.addRecord({ date: '2026-05-10', type: 'oncall_standby', breakdown: {} });
    expect(() => {
      OVERTIME.addRecord({ date: '2026-05-10', type: 'oncall_callout', breakdown: { extended: 1 } });
    }).toThrow(/온콜.*중복/);
  });

  it('다른_날짜는_정상적으로_추가된다', () => {
    OVERTIME.addRecord({ date: '2026-05-10', type: 'oncall_standby', breakdown: {} });
    expect(() => {
      OVERTIME.addRecord({ date: '2026-05-11', type: 'oncall_callout', breakdown: { extended: 1 } });
    }).not.toThrow();
  });

  it('같은_날_overtime_뒤_oncall_callout_은_허용된다', () => {
    OVERTIME.addRecord({ date: '2026-05-10', type: 'overtime', breakdown: { extended: 2 } });
    expect(() => {
      OVERTIME.addRecord({ date: '2026-05-10', type: 'oncall_callout', breakdown: { extended: 1 } });
    }).not.toThrow();
  });
});

describe('OVERTIME.calcUnrewardedNightShifts — 누적 RD 자동 계산', () => {
  let OVERTIME;
  beforeAll(async () => { ({ OVERTIME } = await import('@snuhmate/profile/overtime')); });

  beforeEach(() => { localStorage.clear(); });

  it('간호직은_15회_누적마다_RD_1일을_부여한다', () => {
    // 7회 미만 5개월 × 3회 = 15회
    for (let m = 1; m <= 5; m++) {
      for (let i = 0; i < 3; i++) {
        OVERTIME.addRecord({
          date: `2026-${String(m).padStart(2,'0')}-${String(i + 1).padStart(2,'0')}`,
          type: 'overtime', breakdown: { night: 8 },
        });
      }
    }
    const r = OVERTIME.calcUnrewardedNightShifts('간호직', new Date(2026, 0, 1), new Date(2026, 5, 30));
    expect(r.threshold).toBe(15);
    expect(r.recoveryDaysEarned).toBeGreaterThanOrEqual(1);
    expect(r.cumulative).toBe(0);
  });

  it('월_7회_이상_시_즉시_RD_1일_부여_+_누적은_초과분만', () => {
    // 1월에 9회 야간근무
    for (let i = 0; i < 9; i++) {
      OVERTIME.addRecord({
        date: `2026-01-${String(i + 1).padStart(2,'0')}`,
        type: 'overtime', breakdown: { night: 8 },
      });
    }
    const r = OVERTIME.calcUnrewardedNightShifts('간호직', new Date(2026, 0, 1), new Date(2026, 0, 31));
    expect(r.monthlyTriggered).toBe(1);
    expect(r.recoveryDaysEarned).toBe(1);
    expect(r.cumulative).toBe(2); // 9 - 7 = 2
  });

  it('시설직은_20회_단위로_RD를_부여한다', () => {
    const r = OVERTIME.calcUnrewardedNightShifts('시설직', new Date(2026, 0, 1), new Date(2026, 0, 31));
    expect(r.threshold).toBe(20);
  });
});

describe('calcPayrollSimulation — 무급휴가/결근 변동 공제', () => {
  let CALC;
  beforeAll(async () => { ({ CALC } = await import('@snuhmate/calculators')); });

  it('unpaidLeaveDays가_3이면_무급휴가공제가_계산된다', () => {
    const r = CALC.calcPayrollSimulation({
      jobType: '간호직', grade: 'J3', year: 1,
      unpaidLeaveDays: 3,
    });
    expect(r.공제내역['무급휴가공제']).toBeGreaterThan(0);
    // 통상임금 / 30 × 3 으로 계산되었는지 산식 검증
    const expected = Math.round(r.통상임금 / 30 * 3);
    expect(r.공제내역['무급휴가공제']).toBe(expected);
  });

  it('absentDays가_2이면_결근공제가_계산된다', () => {
    const r = CALC.calcPayrollSimulation({
      jobType: '간호직', grade: 'J3', year: 1,
      absentDays: 2,
    });
    expect(r.공제내역['결근공제']).toBeGreaterThan(0);
    const expected = Math.round(r.통상임금 / 30 * 2);
    expect(r.공제내역['결근공제']).toBe(expected);
  });

  it('무급휴가가_0이면_공제내역에_무급휴가공제_키가_없다', () => {
    const r = CALC.calcPayrollSimulation({
      jobType: '간호직', grade: 'J3', year: 1,
    });
    expect(r.공제내역['무급휴가공제']).toBeUndefined();
    expect(r.공제내역['결근공제']).toBeUndefined();
  });
});
