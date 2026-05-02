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
});
