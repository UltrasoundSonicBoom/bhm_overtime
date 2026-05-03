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
});
