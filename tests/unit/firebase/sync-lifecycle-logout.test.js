// Task 2 (PRIMARY BUG fix) regression: sync-lifecycle.logout() must wipe BOTH
// uid-scoped *and* guest-scoped localStorage so the next session starts clean.
// User reported "왜 이 당연한게 매번 안 되쥐???" — guest data was surviving
// logout and polluting the next login via auto-sync fallback chains.

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

beforeAll(() => {
  const dom = new JSDOM('<!DOCTYPE html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
});

describe('logout — guest 데이터 완전 정리 (Task 2 PRIMARY BUG fix)', () => {
  let logout;
  beforeEach(async () => {
    localStorage.clear();
    // pre-existing guest data
    localStorage.setItem('snuhmate_hr_profile_guest', '{"name":"x"}');
    localStorage.setItem('overtimeRecords_guest', '[]');
    localStorage.setItem('snuhmate_career_events_guest', '[]');
    localStorage.setItem('payslip_guest_2026_04', '{}');
    // pre-existing uid data
    localStorage.setItem('snuhmate_hr_profile_uid_abc', '{"name":"y"}');
    localStorage.setItem('payslip_abc_2026_04', '{}');
    ({ logout } = await import('../../../apps/web/src/firebase/sync-lifecycle.js'));
  });

  it('로그아웃 후 guest 키 0건', () => {
    logout('abc');
    const remaining = Object.keys(localStorage);
    const guestKeys = remaining.filter(k => k.includes('_guest'));
    expect(guestKeys).toHaveLength(0);
  });

  it('로그아웃 후 uid 키 0건', () => {
    logout('abc');
    const remaining = Object.keys(localStorage);
    const uidKeys = remaining.filter(k => k.includes('_uid_abc') || k.startsWith('payslip_abc_'));
    expect(uidKeys).toHaveLength(0);
  });
});
