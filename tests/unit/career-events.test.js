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
});
