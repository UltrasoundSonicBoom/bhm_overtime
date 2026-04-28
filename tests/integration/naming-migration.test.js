// Phase 5-followup 회귀 가드 — bhm_* → snuhmate_* lazy migration
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

beforeAll(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/' });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.HTMLElement = dom.window.HTMLElement;
  global.Node = dom.window.Node;
  global.CustomEvent = dom.window.CustomEvent;
  global.Event = dom.window.Event;
  global.confirm = () => true;
  global.alert = () => {};
  if (!dom.window.URL.createObjectURL) {
    dom.window.URL.createObjectURL = () => 'blob:fake';
    dom.window.URL.revokeObjectURL = () => {};
  }
});

beforeEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
});

function seedDom() {
  ['pfName', 'pfMilitaryMonthsGroup', 'pfServiceDisplay', 'profileStatus', 'pfInputFields',
   'pfInputToggleLabel', 'profileSummary', 'pfBasicFields', 'pfBasicPreview', 'pfBasicBadge',
   'pfPayslipLink', 'workHistoryList'].forEach(id => {
    const el = document.createElement('div'); el.id = id; document.body.appendChild(el);
  });
}

describe('PROFILE.STORAGE_KEY: bhm_hr_profile → snuhmate_hr_profile lazy migration', () => {
  it('legacy bhm_* 시드 → load 시 snuhmate_* 로 복사 + bhm_* delete', async () => {
    const data = JSON.stringify({ name: '김계환', department: '핵의학과' });
    localStorage.setItem('bhm_hr_profile', data);

    const profileMod = await import('@snuhmate/profile/profile');
    const loaded = profileMod.PROFILE.load();

    expect(loaded.name).toBe('김계환');
    expect(localStorage.getItem('snuhmate_hr_profile')).toBe(data);
    expect(localStorage.getItem('bhm_hr_profile')).toBeNull();
  });

  it('새 snuhmate_* 만 있으면 그대로 사용 (idempotent)', async () => {
    const data = JSON.stringify({ name: '홍길동' });
    localStorage.setItem('snuhmate_hr_profile', data);

    const profileMod = await import('@snuhmate/profile/profile');
    const loaded = profileMod.PROFILE.load();

    expect(loaded.name).toBe('홍길동');
    expect(localStorage.getItem('snuhmate_hr_profile')).toBe(data);
    expect(localStorage.getItem('bhm_hr_profile')).toBeNull();
  });

  it('write 항상 새 snuhmate_* 키로', async () => {
    const profileMod = await import('@snuhmate/profile/profile');
    profileMod.PROFILE.save({ name: '신규자' });

    expect(localStorage.getItem('snuhmate_hr_profile')).toBeTruthy();
    expect(localStorage.getItem('bhm_hr_profile')).toBeNull();
  });
});

describe('clearProfile USER_DATA_PATTERNS: 양쪽 prefix 매칭', () => {
  it('bhm_* + snuhmate_* 동시 잔존 → 모두 wipe', async () => {
    seedDom();
    localStorage.setItem('bhm_hr_profile_legacy_uid', JSON.stringify({}));
    localStorage.setItem('snuhmate_hr_profile_uid', JSON.stringify({}));
    localStorage.setItem('bhm_work_history_guest', JSON.stringify([]));
    localStorage.setItem('snuhmate_work_history_uid', JSON.stringify([]));
    localStorage.setItem('overtimeRecords', JSON.stringify({}));

    window.__bhmReloadHook = () => {};
    window.__bhmConfirmClearForTest = () => true;

    await import('../../apps/web/src/client/profile-tab.js');
    window.clearProfile();

    expect(localStorage.getItem('bhm_hr_profile_legacy_uid')).toBeNull();
    expect(localStorage.getItem('snuhmate_hr_profile_uid')).toBeNull();
    expect(localStorage.getItem('bhm_work_history_guest')).toBeNull();
    expect(localStorage.getItem('snuhmate_work_history_uid')).toBeNull();
    expect(localStorage.getItem('overtimeRecords')).toBeNull();

    delete window.__bhmReloadHook;
    delete window.__bhmConfirmClearForTest;
  });
});
