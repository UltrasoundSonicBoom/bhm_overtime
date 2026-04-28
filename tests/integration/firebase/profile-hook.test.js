// Phase 8 Task 6 — PROFILE.save() / _pullFromCloudOnce() Firestore hook 검증
//
// 게스트 모드 (window.__firebaseUid 없음) 시 cloud 호출 0
// 로그인 (window.__firebaseUid 설정) 시 writeProfile 호출

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

const mockWrite = vi.fn();
const mockRead = vi.fn();

vi.mock('/src/firebase/sync/profile-sync.js', () => ({
  writeProfile: mockWrite,
  readProfile: mockRead,
}));

beforeAll(async () => {
  const dom = new JSDOM('<!DOCTYPE html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.CustomEvent = dom.window.CustomEvent;
  // getUserStorageKey wrapper (Phase 0.1)
  await import('../../../apps/web/src/client/inline-ui-helpers.js');
});

beforeEach(() => {
  localStorage.clear();
  delete window.__firebaseUid;
  mockWrite.mockReset();
  mockRead.mockReset();
});

describe('PROFILE.save() — Phase 8 sync hook', () => {
  it('게스트 모드 (uid 없음) 시 writeProfile 호출 0', async () => {
    const { PROFILE } = await import('../../../packages/profile/src/profile.js');
    PROFILE.save({ name: '게스트', hourlyWage: 10000 });
    await new Promise(r => setTimeout(r, 50));
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it('로그인 (uid 설정) 시 writeProfile 호출', async () => {
    window.__firebaseUid = 'user1';
    mockWrite.mockResolvedValue();
    const { PROFILE } = await import('../../../packages/profile/src/profile.js');
    PROFILE.save({ name: '테스트', hourlyWage: 12000 });
    await new Promise(r => setTimeout(r, 50));
    expect(mockWrite).toHaveBeenCalled();
    const [dbArg, uidArg, profileArg] = mockWrite.mock.calls[0];
    expect(dbArg).toBe(null);  // production firebase
    expect(uidArg).toBe('user1');
    expect(profileArg.name).toBe('테스트');
    expect(profileArg.hourlyWage).toBe(12000);
  });

  it('cloud sync 실패 시 localStorage 저장은 정상 (graceful)', async () => {
    window.__firebaseUid = 'user1';
    mockWrite.mockRejectedValue(new Error('network down'));
    const { PROFILE } = await import('../../../packages/profile/src/profile.js');
    PROFILE.save({ name: '테스트' });
    await new Promise(r => setTimeout(r, 50));
    // localStorage 는 정상 저장
    const loaded = PROFILE.load();
    expect(loaded?.name).toBe('테스트');
  });
});

describe('PROFILE._pullFromCloudOnce() — Phase 8', () => {
  it('게스트 모드 시 readProfile 호출 0', async () => {
    const { PROFILE } = await import('../../../packages/profile/src/profile.js');
    await PROFILE._pullFromCloudOnce();
    expect(mockRead).not.toHaveBeenCalled();
  });

  it('로그인 시 cloud → localStorage 갱신 (cloud 가 더 신선)', async () => {
    window.__firebaseUid = 'user1';
    mockRead.mockResolvedValue({ name: 'cloud', savedAt: '2026-04-29T12:00:00Z' });
    // 로컬 데이터 (구버전)
    localStorage.setItem('snuhmate_hr_profile_uid_user1', JSON.stringify({
      name: 'local-old', savedAt: '2026-04-28T00:00:00Z',
    }));
    const { PROFILE } = await import('../../../packages/profile/src/profile.js');
    await PROFILE._pullFromCloudOnce();
    expect(mockRead).toHaveBeenCalled();
    const updated = JSON.parse(localStorage.getItem('snuhmate_hr_profile_uid_user1'));
    expect(updated.name).toBe('cloud');
  });

  it('로컬이 더 신선하면 cloud 데이터 무시', async () => {
    window.__firebaseUid = 'user1';
    mockRead.mockResolvedValue({ name: 'cloud-old', savedAt: '2026-04-28T00:00:00Z' });
    localStorage.setItem('snuhmate_hr_profile_uid_user1', JSON.stringify({
      name: 'local-fresh', savedAt: '2026-04-29T12:00:00Z',
    }));
    const { PROFILE } = await import('../../../packages/profile/src/profile.js');
    await PROFILE._pullFromCloudOnce();
    const after = JSON.parse(localStorage.getItem('snuhmate_hr_profile_uid_user1'));
    expect(after.name).toBe('local-fresh');
  });

  it('cloud 비어있으면 localStorage 영향 0', async () => {
    window.__firebaseUid = 'user1';
    mockRead.mockResolvedValue(null);
    localStorage.setItem('snuhmate_hr_profile_uid_user1', JSON.stringify({
      name: 'local', savedAt: '2026-04-29T12:00:00Z',
    }));
    const { PROFILE } = await import('../../../packages/profile/src/profile.js');
    await PROFILE._pullFromCloudOnce();
    const after = JSON.parse(localStorage.getItem('snuhmate_hr_profile_uid_user1'));
    expect(after.name).toBe('local');
  });
});
