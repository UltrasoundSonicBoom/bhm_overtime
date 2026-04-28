// Phase 5-followup 회귀 가드 — 데이터 lifecycle 정책
// 본질 분석: docs/superpowers/specs/2026-04-27-data-lifecycle-policy.md
//
// 검증 시나리오:
// 1. PROFILE.save 빈 값 보호 — form 의 빈 input 이 명세서로 채워진 값 덮어쓰기 X
// 2. clearProfile 후 payroll_compare_history 등 사용자 키 0 잔존
// 3. clearProfile 후 bhm_settings PII 필드만 wipe / 사용자 설정 보존
// 4. clearProfile 후 KEEP 메타 (deviceId/anonId/onboarding) 보존

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

function seedProfileForm() {
  const inputs = ['pfName', 'pfEmployeeNumber', 'pfDepartment', 'pfBirthDate', 'pfHireDate',
    'pfAdjust', 'pfUpgradeAdjust', 'pfMilitaryMonths', 'pfFamily', 'pfChildren',
    'pfChildrenUnder6Pay', 'pfSpecial', 'pfPosition', 'pfWorkSupport',
    'pfWeeklyHours', 'pfPromotionDate', 'pfUnionStepAdjust'];
  const checkboxes = ['pfMilitary', 'pfSeniority'];
  inputs.forEach(id => { const el = document.createElement('input'); el.id = id; document.body.appendChild(el); });
  checkboxes.forEach(id => {
    const el = document.createElement('input'); el.type = 'checkbox'; el.id = id; document.body.appendChild(el);
  });
  ['pfJobType', 'pfGrade', 'pfYear', 'pfGender'].forEach(id => {
    const sel = document.createElement('select'); sel.id = id;
    ['', '1', '2', '3', 'J3', '간호직'].forEach(v => {
      const opt = document.createElement('option'); opt.value = v; opt.textContent = v; sel.appendChild(opt);
    });
    document.body.appendChild(sel);
  });
  ['pfMilitaryMonthsGroup', 'pfServiceDisplay', 'profileStatus',
   'pfInputFields', 'pfInputToggleLabel', 'profileSummary',
   'pfBasicFields', 'pfBasicPreview', 'pfBasicBadge', 'pfPayslipLink',
   'workHistoryList'].forEach(id => {
    const el = document.createElement('div'); el.id = id; document.body.appendChild(el);
  });
}

describe('이슈 4 회귀 가드 — PROFILE.save 빈 값 보호', () => {
  it('form 의 빈 input 으로 save → 명세서 값 덮어쓰기 금지', async () => {
    const profileMod = await import('@snuhmate/profile/profile');
    const PROFILE = profileMod.PROFILE;

    // 1. 명세서 자동 저장 (full payload)
    PROFILE.save({
      name: '김계환', specialPay: 35000, positionPay: 50000,
      adjustPay: 10000, workSupportPay: 20000, department: '핵의학과',
    });
    const after1 = PROFILE.load();
    expect(after1.specialPay).toBe(35000);
    expect(after1.positionPay).toBe(50000);

    // 2. 사용자가 [저장하기] — form 일부 비어있음 (특수수당 비어있음 등)
    PROFILE.save({
      name: '김계환', specialPay: '', positionPay: 0,
      adjustPay: 0, department: '핵의학과',
    });
    const after2 = PROFILE.load();
    // 빈 string + 0 으로 덮어쓰기 X — 명세서 값 보존
    expect(after2.specialPay).toBe(35000);
    expect(after2.positionPay).toBe(50000);
    expect(after2.adjustPay).toBe(10000);
    expect(after2.workSupportPay).toBe(20000);
  });

  it('null/undefined 도 덮어쓰기 금지', async () => {
    const profileMod = await import('@snuhmate/profile/profile');
    const PROFILE = profileMod.PROFILE;
    PROFILE.save({ name: '홍길동', employeeNumber: '12345' });
    PROFILE.save({ name: '홍길동', employeeNumber: null });  // null 시도
    PROFILE.save({ name: '홍길동', employeeNumber: undefined });
    expect(PROFILE.load().employeeNumber).toBe('12345');
  });

  it('실제 새 값으로는 덮어쓰기 정상 작동', async () => {
    const profileMod = await import('@snuhmate/profile/profile');
    const PROFILE = profileMod.PROFILE;
    PROFILE.save({ name: '홍길동', specialPay: 100 });
    PROFILE.save({ name: '홍길동', specialPay: 200 });  // 진짜 새 값
    expect(PROFILE.load().specialPay).toBe(200);
  });
});

describe('이슈 2 회귀 가드 — clearProfile 데이터 wipe scope', () => {
  beforeEach(() => {
    // 사용자 도메인 데이터 (모두 wipe 대상)
    localStorage.setItem('bhm_hr_profile', JSON.stringify({ name: '홍길동' }));
    localStorage.setItem('bhm_hr_profile_uid123', JSON.stringify({ name: 'Other UID' }));
    localStorage.setItem('overtimeRecords', '{}');
    localStorage.setItem('overtimeRecords_uid123', '{}');
    localStorage.setItem('leaveRecords', '{}');
    localStorage.setItem('bhm_work_history_guest', '[]');
    localStorage.setItem('payslip_guest_2026_04', '{}');
    localStorage.setItem('payslip_guest_2026_03', '{}');
    localStorage.setItem('otManualHourly', '50000');
    localStorage.setItem('overtimePayslipData', '{}');
    localStorage.setItem('payroll_compare_history', '[{...}]');  // ← 이슈 2 누락 키
    localStorage.setItem('cardnews.items', '[]');                // ← 누락 키
    localStorage.setItem('cardnews.settings', '{}');
    localStorage.setItem('snuhmate_reg_favorites_guest', '[]');
    localStorage.setItem('_orphan_overtimeRecords_2025', '{}');
    localStorage.setItem('bhm_lastEdit_overtimeRecords_uid', 'now');

    // 시스템 메타 (KEEP 대상)
    localStorage.setItem('bhm_local_uid', 'uid-1');
    localStorage.setItem('bhm_deviceId', 'dev-1');
    localStorage.setItem('bhm_anon_id', 'anon-1');
    localStorage.setItem('theme', 'neo');
    localStorage.setItem('bhm_leave_migrated_v1', '1');
    localStorage.setItem('onboarding_seen_v2', 'true');

    // bhm_settings — PII 필드만 wipe, 사용자 설정 보존
    localStorage.setItem('bhm_settings', JSON.stringify({
      googleSub: 'sub-123',
      googleEmail: 'test@example.com',
      cachedProfile: { name: '캐시된이름' },
      driveEnabled: true,
      calendarEnabled: false,
      pinNudgeDismissed: true,
    }));
  });

  it('clearProfile → 모든 사용자 도메인 키 wipe (payroll_compare_history / cardnews 포함)', async () => {
    seedProfileForm();
    window.__bhmReloadHook = () => {};
    window.__bhmConfirmClearForTest = () => true;

    await import('../../apps/web/src/client/profile-tab.js');
    window.clearProfile();

    // 모든 USER_DATA_PATTERNS 매칭 키 → null
    expect(localStorage.getItem('bhm_hr_profile')).toBeNull();
    expect(localStorage.getItem('bhm_hr_profile_uid123')).toBeNull();
    expect(localStorage.getItem('overtimeRecords')).toBeNull();
    expect(localStorage.getItem('overtimeRecords_uid123')).toBeNull();
    expect(localStorage.getItem('leaveRecords')).toBeNull();
    expect(localStorage.getItem('bhm_work_history_guest')).toBeNull();
    expect(localStorage.getItem('payslip_guest_2026_04')).toBeNull();
    expect(localStorage.getItem('payslip_guest_2026_03')).toBeNull();
    expect(localStorage.getItem('otManualHourly')).toBeNull();
    expect(localStorage.getItem('overtimePayslipData')).toBeNull();
    expect(localStorage.getItem('payroll_compare_history')).toBeNull();  // ← 이슈 2 fix 검증
    expect(localStorage.getItem('cardnews.items')).toBeNull();
    expect(localStorage.getItem('cardnews.settings')).toBeNull();
    expect(localStorage.getItem('snuhmate_reg_favorites_guest')).toBeNull();
    expect(localStorage.getItem('_orphan_overtimeRecords_2025')).toBeNull();
    expect(localStorage.getItem('bhm_lastEdit_overtimeRecords_uid')).toBeNull();

    delete window.__bhmReloadHook;
    delete window.__bhmConfirmClearForTest;
  });

  it('KEEP 메타 (deviceId/anonId/theme/onboarding/migration) 보존', async () => {
    seedProfileForm();
    window.__bhmReloadHook = () => {};
    window.__bhmConfirmClearForTest = () => true;

    await import('../../apps/web/src/client/profile-tab.js');
    window.clearProfile();

    expect(localStorage.getItem('bhm_local_uid')).toBe('uid-1');
    expect(localStorage.getItem('bhm_deviceId')).toBe('dev-1');
    expect(localStorage.getItem('bhm_anon_id')).toBe('anon-1');
    expect(localStorage.getItem('theme')).toBe('neo');
    expect(localStorage.getItem('bhm_leave_migrated_v1')).toBe('1');
    expect(localStorage.getItem('onboarding_seen_v2')).toBe('true');

    delete window.__bhmReloadHook;
    delete window.__bhmConfirmClearForTest;
  });

  it('bhm_settings PII 셀렉티브 wipe — 사용자 설정 보존', async () => {
    seedProfileForm();
    window.__bhmReloadHook = () => {};
    window.__bhmConfirmClearForTest = () => true;

    await import('../../apps/web/src/client/profile-tab.js');
    window.clearProfile();

    const settings = JSON.parse(localStorage.getItem('bhm_settings'));
    // PII 필드 wipe
    expect(settings.googleSub).toBeUndefined();
    expect(settings.googleEmail).toBeUndefined();
    expect(settings.cachedProfile).toBeUndefined();
    // 사용자 설정 보존
    expect(settings.driveEnabled).toBe(true);
    expect(settings.calendarEnabled).toBe(false);
    expect(settings.pinNudgeDismissed).toBe(true);

    delete window.__bhmReloadHook;
    delete window.__bhmConfirmClearForTest;
  });
});
