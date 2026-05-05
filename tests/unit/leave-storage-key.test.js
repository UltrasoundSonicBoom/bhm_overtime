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
  window.getUserStorageKey = (base) => window.__firebaseUid ? `${base}_uid_${window.__firebaseUid}` : `${base}_guest`;
  vi.resetModules();
});

describe('LEAVE storage scope', () => {
  it('uses guest scoped key when logged out', async () => {
    const { LEAVE } = await import('@snuhmate/profile/leave');
    expect(LEAVE.STORAGE_KEY).toBe('leaveRecords_guest');
  });

  it('uses uid scoped key when logged in', async () => {
    const { LEAVE } = await import('@snuhmate/profile/leave');
    window.__firebaseUid = 'uid-123';
    expect(LEAVE.STORAGE_KEY).toBe('leaveRecords_uid_uid-123');
  });

  it('copies legacy shared leaveRecords into the current scoped key without deleting local backup', async () => {
    const { LEAVE } = await import('@snuhmate/profile/leave');
    window.__firebaseUid = 'uid-123';
    localStorage.setItem('leaveRecords', JSON.stringify({ '2026': [{ id: 'lv1' }] }));

    expect(LEAVE.getYearRecords(2026)[0].id).toBe('lv1');
    expect(JSON.parse(localStorage.getItem('leaveRecords'))['2026'][0].id).toBe('lv1');
    expect(JSON.parse(localStorage.getItem('leaveRecords_uid_uid-123'))['2026'][0].id).toBe('lv1');
  });
});
