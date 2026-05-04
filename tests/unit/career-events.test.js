import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';

let _careerEventStatus;
beforeAll(async () => {
  const dom = new JSDOM('<!DOCTYPE html><body></body></html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;
  global.CustomEvent = dom.window.CustomEvent;
  global.Event = dom.window.Event;
  await import('../../apps/web/src/client/profile-tab.js');
  _careerEventStatus = window.__test_careerEventStatus;
});

describe('_careerEventStatus', () => {
  const NOW = new Date('2026-05-15');
  it('workplace_dateTo_비어있고_dateFrom_과거이면_now_반환', () => {
    expect(_careerEventStatus({ category: 'workplace', dateFrom: '2006-07', dateTo: '' }, NOW)).toBe('now');
  });
  it('workplace_dateTo_가_과거이면_past', () => {
    expect(_careerEventStatus({ category: 'workplace', dateFrom: '2006-07', dateTo: '2010-12' }, NOW)).toBe('past');
  });
  it('workplace_dateTo_가_미래이면_now', () => {
    expect(_careerEventStatus({ category: 'workplace', dateFrom: '2006-07', dateTo: '2030-12' }, NOW)).toBe('now');
  });
  it('promotion_dateFrom_과거는_past', () => {
    expect(_careerEventStatus({ category: 'promotion', dateFrom: '2010-07' }, NOW)).toBe('past');
  });
  it('promotion_dateFrom_미래는_future', () => {
    expect(_careerEventStatus({ category: 'promotion', dateFrom: '2034-06' }, NOW)).toBe('future');
  });
  it('workplace_dateTo_가_같은달이면_now_유지', () => {
    expect(_careerEventStatus({ category: 'workplace', dateFrom: '2020-01', dateTo: '2026-05' }, NOW)).toBe('now');
  });
  it('workplace_dateTo_가_지난달이면_past', () => {
    expect(_careerEventStatus({ category: 'workplace', dateFrom: '2020-01', dateTo: '2026-04' }, NOW)).toBe('past');
  });
  it('dateFrom_없으면_future', () => {
    expect(_careerEventStatus({ category: 'workplace', dateTo: '2026-05' }, NOW)).toBe('future');
  });
});

import { generateSeedEvents } from '@snuhmate/profile/career-events';

describe('generateSeedEvents — 자동승격 항목별 차액', () => {
  it('J1_J2_자동승격_이벤트는_detailTokens에_기본급_능력급_상여금_변화를_담는다', () => {
    const events = generateSeedEvents({
      hireDate: '2015-06-01', jobType: '간호직', grade: 'J3', year: 1,
    });
    const j1j2 = events.find((e) => /J1 → J2/.test(e.title));
    expect(j1j2).toBeTruthy();
    expect(Array.isArray(j1j2.detailTokens)).toBe(true);
    const text = j1j2.detailTokens.map((t) => t.bold || t.text || '').join('');
    expect(text).toMatch(/기준기본급/);
    expect(text).toMatch(/능력급/);
    expect(text).toMatch(/상여금/);
  });
  it('J3_S1_자동승격_이벤트도_detailTokens_보유', () => {
    const events = generateSeedEvents({
      hireDate: '2015-06-01', jobType: '간호직', grade: 'J3', year: 1,
    });
    const j3s1 = events.find((e) => /J3 → S1/.test(e.title));
    expect(j3s1).toBeTruthy();
    expect(Array.isArray(j3s1.detailTokens)).toBe(true);
  });
  it('J2_J3_자동승격_기준기본급_차액이_양수이고_명시적_숫자_포함', () => {
    const events = generateSeedEvents({
      hireDate: '2015-06-01', jobType: '간호직', grade: 'J3', year: 1,
    });
    const j2j3 = events.find((e) => /J2 → J3/.test(e.title));
    // 정확한 값은 호봉표에 의존하지만 양의 차액이어야 한다 (J3 가 J2 보다 높음)
    const baseToken = j2j3.detailTokens.find((t) => t.bold && /^\+₩[\d,]+$/.test(t.bold));
    expect(baseToken).toBeTruthy();
    // step.monthly 와 detailTokens sum 이 일치해야 한다 (Task 2 review fix)
    const sumFromTokens = j2j3.detailTokens
      .filter((t) => t.bold && /[\d,]+/.test(t.bold))
      .reduce((acc, t) => acc + parseInt(t.bold.replace(/[^\d]/g, ''), 10) * (t.bold.startsWith('−') ? -1 : 1), 0);
    const headlineNum = parseInt(j2j3.amount.replace(/[^\d]/g, ''), 10);
    expect(sumFromTokens).toBe(headlineNum);
  });
});

describe('generateSeedEvents — 호봉 이벤트 없음 (사용자 요청: 연도별 호봉 상승 이벤트 제거)', () => {
  it('어떤_등급에서도_호봉_상승_이벤트_미생성', () => {
    const grades = ['J1', 'J2', 'J3', 'S1'];
    grades.forEach((grade) => {
      const events = generateSeedEvents({
        hireDate: '2006-07-01', jobType: '간호직', grade, year: 2,
      });
      const hobon = events.filter((e) => e.autoSeed && /호봉 상승/.test(e.title));
      expect(hobon).toHaveLength(0);
    });
  });
});

import { inferPromotionsFromPayslips } from '@snuhmate/profile/career-events';

describe('inferPromotionsFromPayslips — 호봉 변동(재급연수) micro-event', () => {
  beforeAll(() => {
    // PROFILE.load() 가 hireDate 검사 — null 반환 막기 위한 최소 프로필
    localStorage.setItem('snuhmate_hr_profile_guest', JSON.stringify({
      hireDate: '2006-07-01', grade: 'S1', year: 2, jobType: '간호직',
    }));
  });

  it('S1-02_S1-03_변화는_hobon-change_이벤트_1건_생성', () => {
    window.SALARY_PARSER = {
      listSavedMonths: () => [
        { year: 2026, month: 1, type: '급여' },
        { year: 2026, month: 2, type: '급여' },
      ],
      loadMonthlyData: (_y, m) => ({
        employeeInfo: { payGrade: m === 1 ? 'S1-02' : 'S1-03' },
      }),
    };
    const out = inferPromotionsFromPayslips();
    const hobon = out.filter((e) => e.category === 'hobon-change');
    expect(hobon).toHaveLength(1);
    expect(hobon[0].title).toContain('S1');
    expect(hobon[0].title).toContain('2→3');
    expect(hobon[0].dateFrom).toBe('2026-02');
    expect(hobon[0].source).toBe('payslip-inferred');
    expect(hobon[0].sub).toContain('재급연수');
  });

  it('J3-5_S1-1_등급전환은_promotion만_생성_hobon-change_미발생', () => {
    window.SALARY_PARSER = {
      listSavedMonths: () => [
        { year: 2025, month: 6, type: '급여' },
        { year: 2025, month: 7, type: '급여' },
      ],
      loadMonthlyData: (_y, m) => ({
        employeeInfo: { payGrade: m === 6 ? 'J3-5' : 'S1-1' },
      }),
    };
    const out = inferPromotionsFromPayslips();
    expect(out.filter((e) => e.category === 'promotion')).toHaveLength(1);
    expect(out.filter((e) => e.category === 'hobon-change')).toHaveLength(0);
    expect(out[0].title).toContain('자격등급 전환');
  });
});

describe('_resolveNextPromoLabel — 단협 단어 분기', () => {
  let _resolveNextPromoLabel;
  beforeAll(() => {
    _resolveNextPromoLabel = window.__test_resolveNextPromoLabel;
  });

  it('M1_등급_nextPromo_없음_심사승진_대상', () => {
    expect(_resolveNextPromoLabel('M1', null)).toBe('심사승진 대상');
  });
  it('S1_등급_nextPromo_없음_없음_(자동승격이라_seed에서_채워짐)', () => {
    // S1 은 PROMO_GENERAL 의 from 에 있으므로 nextPromo 가 채워지지 않은 edge case 만 '없음'
    expect(_resolveNextPromoLabel('S1', null)).toBe('없음');
  });
  it('M3_등급_nextPromo_없음_최상위_자격등급', () => {
    expect(_resolveNextPromoLabel('M3', null)).toBe('최상위 자격등급');
  });
  it('J2_등급_nextPromo_있음_날짜_라벨', () => {
    const out = _resolveNextPromoLabel('J2', { dateFrom: '2030-03', title: 'J2 → J3 자동승격' });
    expect(out).toBe('2030-03 (J3 자동승격)');
  });
  it('J3_등급_nextPromo_없음_없음_(edge_case)', () => {
    expect(_resolveNextPromoLabel('J3', null)).toBe('없음');
  });
});
