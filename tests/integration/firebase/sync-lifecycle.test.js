import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

beforeAll(() => {
  const dom = new JSDOM('<!DOCTYPE html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
});

beforeEach(() => {
  localStorage.clear();
  delete window.__firebaseUid;
  vi.resetModules();
});

describe('sync-lifecycle — auth-scoped active state', () => {
  it('clearActiveUserLocalData removes only the current uid keys', async () => {
    const { clearActiveUserLocalData } =
      await import('../../../apps/web/src/firebase/sync-lifecycle.js');

    localStorage.setItem('leaveRecords_uid_u1', '{}');
    localStorage.setItem('leaveRecords_uid_u2', '{}');
    localStorage.setItem('leaveRecords_guest', '{}');
    localStorage.setItem('otManualHourly_uid_u1', '17000');
    localStorage.setItem('payslip_u1_2026_04', '{}');
    localStorage.setItem('payslip_u1_2026_04_상여', '{}');
    localStorage.setItem('payslip_u2_2026_04', '{}');
    localStorage.setItem('snuhmate_settings', JSON.stringify({ googleSub: 'u1', theme: 'neo' }));

    const removed = clearActiveUserLocalData('u1');

    expect(removed).toEqual(expect.arrayContaining([
      'leaveRecords_uid_u1',
      'otManualHourly_uid_u1',
      'payslip_u1_2026_04',
      'payslip_u1_2026_04_상여',
    ]));
    expect(localStorage.getItem('leaveRecords_uid_u1')).toBeNull();
    expect(localStorage.getItem('payslip_u1_2026_04')).toBeNull();
    expect(localStorage.getItem('leaveRecords_uid_u2')).not.toBeNull();
    expect(localStorage.getItem('leaveRecords_guest')).not.toBeNull();
    expect(localStorage.getItem('payslip_u2_2026_04')).not.toBeNull();
    expect(JSON.parse(localStorage.getItem('snuhmate_settings')).theme).toBe('neo');
  });

  it('logout clears auth bridge and emits refresh/reset events', async () => {
    const { logout } = await import('../../../apps/web/src/firebase/sync-lifecycle.js');
    const seen = [];
    ['profileChanged', 'overtimeChanged', 'leaveChanged', 'payslipChanged', 'app:auth-data-reset']
      .forEach(name => window.addEventListener(name, () => seen.push(name), { once: true }));

    window.__firebaseUid = 'u1';
    localStorage.setItem('snuhmate_settings', JSON.stringify({ googleSub: 'u1', googleEmail: 'a@b.c', theme: 'neo' }));
    localStorage.setItem('snuhmate_hr_profile_uid_u1', JSON.stringify({ name: 'A' }));

    logout('u1');

    expect(window.__firebaseUid).toBeUndefined();
    expect(localStorage.getItem('snuhmate_hr_profile_uid_u1')).toBeNull();
    expect(JSON.parse(localStorage.getItem('snuhmate_settings'))).toEqual({ theme: 'neo' });
    expect(seen).toEqual(expect.arrayContaining([
      'profileChanged', 'overtimeChanged', 'leaveChanged', 'payslipChanged', 'app:auth-data-reset',
    ]));
  });

  it('stripDeviceLocalSettings excludes Google auth bridge fields from cloud payload', async () => {
    const { stripDeviceLocalSettings } =
      await import('../../../apps/web/src/firebase/sync-lifecycle.js');
    expect(stripDeviceLocalSettings({
      theme: 'neo',
      googleSub: 'u1',
      googleEmail: 'a@b.c',
      cachedProfile: { name: 'A' },
    })).toEqual({ theme: 'neo' });
  });

  it('emitDomainRefresh publishes domain events and app:cloud-hydrated', async () => {
    const { emitDomainRefresh } =
      await import('../../../apps/web/src/firebase/sync-lifecycle.js');
    const seen = [];
    ['profileChanged', 'overtimeChanged', 'leaveChanged', 'payslipChanged', 'app:cloud-hydrated']
      .forEach(name => window.addEventListener(name, () => seen.push(name), { once: true }));

    emitDomainRefresh({ uid: 'u1', reason: 'hydrate' });

    expect(seen).toEqual([
      'profileChanged',
      'overtimeChanged',
      'leaveChanged',
      'payslipChanged',
      'app:cloud-hydrated',
    ]);
  });
});
