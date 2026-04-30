// Phase 8 Task 0.1 회귀 가드 — window.getUserStorageKey 정의/동작 검증
//
// 잠복 버그: 정의 누락 — apps/web/, packages/ 어디에도 window.getUserStorageKey =
// 정의가 없어서 모든 호출이 fallback (base + '_guest') 으로만 동작했음.
// 이 fix 후에는 게스트 = base + '_guest', 로그인 = base + '_uid_<uid>'.
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

beforeAll(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.HTMLElement = dom.window.HTMLElement;
});

beforeEach(() => {
  localStorage.clear();
  delete window.__firebaseUid;
  delete window.getUserStorageKey;
  delete window.recordLocalEdit;
  // module cache reset — IIFE 가 매 테스트마다 재실행되어야 window.getUserStorageKey 정의됨
  vi.resetModules();
});

describe('window.getUserStorageKey — Phase 8 Task 0.1', () => {
  it('정의가 존재한다 (이전: 누락)', async () => {
    await import('../../../apps/web/src/client/inline-ui-helpers.js');
    expect(typeof window.getUserStorageKey).toBe('function');
  });

  it('게스트 (window.__firebaseUid 미설정) 시 base + "_guest" 반환', async () => {
    await import('../../../apps/web/src/client/inline-ui-helpers.js');
    expect(window.getUserStorageKey('snuhmate_hr_profile')).toBe('snuhmate_hr_profile_guest');
    expect(window.getUserStorageKey('overtimeRecords')).toBe('overtimeRecords_guest');
    expect(window.getUserStorageKey('leaveRecords')).toBe('leaveRecords_guest');
  });

  it('로그인 (window.__firebaseUid 설정) 시 base + "_uid_<uid>" 반환', async () => {
    await import('../../../apps/web/src/client/inline-ui-helpers.js');
    window.__firebaseUid = 'abc123';
    expect(window.getUserStorageKey('snuhmate_hr_profile')).toBe('snuhmate_hr_profile_uid_abc123');
    expect(window.getUserStorageKey('overtimeRecords')).toBe('overtimeRecords_uid_abc123');
    expect(window.getUserStorageKey('leaveRecords')).toBe('leaveRecords_uid_abc123');
  });

  it('uid 변경 시 즉시 반영 (call-time read)', async () => {
    await import('../../../apps/web/src/client/inline-ui-helpers.js');
    expect(window.getUserStorageKey('overtimeRecords')).toBe('overtimeRecords_guest');
    window.__firebaseUid = 'xyz789';
    expect(window.getUserStorageKey('overtimeRecords')).toBe('overtimeRecords_uid_xyz789');
    delete window.__firebaseUid;
    expect(window.getUserStorageKey('overtimeRecords')).toBe('overtimeRecords_guest');
  });

  it('uid 가 빈 문자열이면 _guest fallback', async () => {
    await import('../../../apps/web/src/client/inline-ui-helpers.js');
    window.__firebaseUid = '';
    expect(window.getUserStorageKey('snuhmate_hr_profile')).toBe('snuhmate_hr_profile_guest');
  });
});

describe('window.recordLocalEdit — Phase 8 Task 0.1 LWW metadata', () => {
  it('정의가 존재한다', async () => {
    await import('../../../apps/web/src/client/inline-ui-helpers.js');
    expect(typeof window.recordLocalEdit).toBe('function');
  });

  it('호출 시 snuhmate_last_edit_<base> 키에 ISO 시각 저장', async () => {
    await import('../../../apps/web/src/client/inline-ui-helpers.js');
    window.recordLocalEdit('snuhmate_hr_profile');
    const v = localStorage.getItem('snuhmate_last_edit_snuhmate_hr_profile');
    expect(v).toBeTruthy();
    // ISO 8601 패턴 검증
    expect(v).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
