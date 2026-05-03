import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

beforeAll(async () => {
  const dom = new JSDOM('<!DOCTYPE html><body></body></html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;
  global.CustomEvent = dom.window.CustomEvent;
  global.Event = dom.window.Event;
});
beforeEach(() => { localStorage.clear(); });

describe('computeDynamicLeaveEvents — LEAVE 모듈 실데이터', () => {
  it('LEAVE_연차_사용량_있으면_올해_사용일수_이벤트가_나타난다', async () => {
    const { LEAVE } = await import('@snuhmate/profile/leave');
    LEAVE.addRecord({
      type: 'annual', startDate: '2026-04-10', endDate: '2026-04-12',
      days: 3, salaryImpact: 0,
    });
    const { computeDynamicLeaveEvents } = await import('@snuhmate/profile/career-events');
    const profile = { hireDate: '2015-06-01', jobType: '간호직' };
    const dynEvents = computeDynamicLeaveEvents(profile, new Date('2026-05-15'));
    expect(Array.isArray(dynEvents)).toBe(true);
    const used = dynEvents.find((e) => /사용/.test(e.title) && e.category === 'leave');
    expect(used).toBeTruthy();
    expect(used.dynamic).toBe(true);
  });
  it('hireDate_없으면_빈_배열', async () => {
    const { computeDynamicLeaveEvents } = await import('@snuhmate/profile/career-events');
    expect(computeDynamicLeaveEvents({}, new Date())).toEqual([]);
  });
  it('profile_null_이면_빈_배열', async () => {
    const { computeDynamicLeaveEvents } = await import('@snuhmate/profile/career-events');
    expect(computeDynamicLeaveEvents(null, new Date())).toEqual([]);
  });

  it('totalLeave_0_이면_빈_배열_반환_misleading_15일_fallback_차단', async () => {
    const { computeDynamicLeaveEvents } = await import('@snuhmate/profile/career-events');
    // hireDate 가 미래라서 calcAnnualLeave 가 totalLeave=0 반환 케이스
    const profile = { hireDate: '2099-01-01', jobType: '간호직' };
    expect(computeDynamicLeaveEvents(profile, new Date('2026-05-15'))).toEqual([]);
  });

  it('연차_quota_초과_시_remaining_0_클램프_및_초과_배지', async () => {
    const { LEAVE } = await import('@snuhmate/profile/leave');
    LEAVE.addRecord({ type: 'annual', startDate: '2026-01-02', endDate: '2026-01-31',
      days: 30, salaryImpact: 0 });
    const { computeDynamicLeaveEvents } = await import('@snuhmate/profile/career-events');
    const profile = { hireDate: '2000-01-01', jobType: '간호직' }; // 26년차 → 25일 한도
    const events = computeDynamicLeaveEvents(profile, new Date('2026-05-15'));
    expect(events.length).toBe(1);
    expect(events[0].title).toMatch(/잔여 0일/);
    expect(events[0].title).toMatch(/한도 초과/);
    expect(events[0].badge.text).toBe('초과');
  });
});
