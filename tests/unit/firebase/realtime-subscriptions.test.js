// realtime-subscriptions lifecycle (Task 6)
//
// onSnapshot 구독을 4개 sync 모듈에 위임하는 lifecycle manager.
// startRealtime/stopRealtime 의 idempotency, dedup, 정리 동작을 검증한다.

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

beforeAll(() => {
  const dom = new JSDOM('<!DOCTYPE html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
});

describe('realtime-subscriptions lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('startRealtime → 4 subscribe 호출 (payslip, overtime, leave, career-events)', async () => {
    const payslipUnsub = vi.fn();
    const overtimeUnsub = vi.fn();
    const leaveUnsub = vi.fn();
    const careerUnsub = vi.fn();
    vi.doMock('../../../apps/web/src/firebase/sync/payslip-sync.js', () => ({
      subscribeToPayslipsRealtime: vi.fn(async () => payslipUnsub),
    }));
    vi.doMock('../../../apps/web/src/firebase/sync/overtime-sync.js', () => ({
      subscribeToOvertimeRealtime: vi.fn(async () => overtimeUnsub),
    }));
    vi.doMock('../../../apps/web/src/firebase/sync/leave-sync.js', () => ({
      subscribeToLeaveRealtime: vi.fn(async () => leaveUnsub),
    }));
    vi.doMock('../../../apps/web/src/firebase/sync/career-events-sync.js', () => ({
      subscribeToCareerEventsRealtime: vi.fn(async () => careerUnsub),
    }));

    const { startRealtime, stopRealtime, isRealtimeActive } = await import(
      '../../../apps/web/src/firebase/realtime-subscriptions.js'
    );
    expect(isRealtimeActive()).toBe(false);
    await startRealtime('uid-test');
    expect(isRealtimeActive()).toBe(true);
    stopRealtime();
    expect(isRealtimeActive()).toBe(false);
    // unsub 함수가 정리 시 호출되었는지 확인
    expect(payslipUnsub).toHaveBeenCalledTimes(1);
    expect(overtimeUnsub).toHaveBeenCalledTimes(1);
    expect(leaveUnsub).toHaveBeenCalledTimes(1);
    expect(careerUnsub).toHaveBeenCalledTimes(1);
  });

  it('동일 uid 중복 startRealtime → 추가 구독 안 함 (dedup)', async () => {
    const subSpy = vi.fn(async () => () => {});
    vi.doMock('../../../apps/web/src/firebase/sync/payslip-sync.js', () => ({
      subscribeToPayslipsRealtime: subSpy,
    }));
    vi.doMock('../../../apps/web/src/firebase/sync/overtime-sync.js', () => ({
      subscribeToOvertimeRealtime: vi.fn(async () => () => {}),
    }));
    vi.doMock('../../../apps/web/src/firebase/sync/leave-sync.js', () => ({
      subscribeToLeaveRealtime: vi.fn(async () => () => {}),
    }));
    vi.doMock('../../../apps/web/src/firebase/sync/career-events-sync.js', () => ({
      subscribeToCareerEventsRealtime: vi.fn(async () => () => {}),
    }));
    const { startRealtime, stopRealtime } = await import(
      '../../../apps/web/src/firebase/realtime-subscriptions.js'
    );
    await startRealtime('uid-x');
    await startRealtime('uid-x');
    expect(subSpy).toHaveBeenCalledTimes(1);
    stopRealtime();
  });
});
