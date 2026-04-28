// Phase 5-followup 회귀 가드:
// Issue 1: initProfileTab() 가 form 갱신 누락 — 명세서 업로드 후 info 탭 재방문 시 form 비어 있음
// Issue 2: clearProfile() 가 PROFILE 만 초기화 — overtime/leave/work-history/payslip 잔존
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
  // jsdom URL.createObjectURL stub (다운로드 동작은 검증 안 함, throw 0 만 검증)
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
  const inputs = [
    'pfName', 'pfEmployeeNumber', 'pfGender', 'pfDepartment',
    'pfBirthDate', 'pfHireDate', 'pfAdjust', 'pfUpgradeAdjust',
    'pfMilitaryMonths', 'pfFamily', 'pfChildren',
    'pfChildrenUnder6Pay', 'pfSpecial', 'pfPosition', 'pfWorkSupport',
    'pfWeeklyHours', 'pfPromotionDate', 'pfUnionStepAdjust',
  ];
  const checkboxes = ['pfMilitary', 'pfSeniority'];
  const selects = [
    { id: 'pfJobType', options: ['간호직', '의사직', '약무직'] },
    { id: 'pfGrade', options: ['J1', 'J2', 'J3', 'J4'] },
    { id: 'pfYear', options: ['1', '2', '3', '4', '5', '6', '7', '8'] },
  ];
  inputs.forEach(id => {
    const el = document.createElement('input');
    el.id = id;
    document.body.appendChild(el);
  });
  checkboxes.forEach(id => {
    const el = document.createElement('input');
    el.type = 'checkbox';
    el.id = id;
    document.body.appendChild(el);
  });
  selects.forEach(({ id, options }) => {
    const sel = document.createElement('select');
    sel.id = id;
    options.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      sel.appendChild(opt);
    });
    document.body.appendChild(sel);
  });
  // 추가 DOM 요소 (clearProfile 가 참조)
  ['pfMilitaryMonthsGroup', 'pfServiceDisplay', 'profileStatus',
   'pfInputFields', 'pfInputToggleLabel', 'profileSummary',
   'pfBasicFields', 'pfBasicPreview', 'pfBasicBadge', 'pfPayslipLink',
   'workHistoryList'].forEach(id => {
    const el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
  });
}

describe('Issue 1: initProfileTab — 명세서 업로드 후 form 자동 반영', () => {
  it('PROFILE 저장된 상태에서 initProfileTab 호출 → form 채워짐', async () => {
    seedProfileForm();
    const profileMod = await import('@snuhmate/profile/profile');
    profileMod.PROFILE.save({
      name: '홍길동', employeeNumber: '12345', department: '간호본부',
      hireDate: '2020-03-01', jobType: '간호직', grade: 'J3', year: 5,
    });

    // initProfileTab 임포트 (window 노출 가정)
    await import('../../apps/web/src/client/profile-tab.js');
    expect(typeof window.initProfileTab).toBe('function');
    window.initProfileTab();

    // form 모든 핵심 필드 채워져야 함
    expect(document.getElementById('pfName').value).toBe('홍길동');
    expect(document.getElementById('pfDepartment').value).toBe('간호본부');
    expect(document.getElementById('pfHireDate').value).toBe('2020-03-01');
    expect(document.getElementById('pfJobType').value).toBe('간호직');
    expect(document.getElementById('pfEmployeeNumber').value).toBe('12345');
  });
});

describe('Issue 2: clearProfile — 전체 사용자 데이터 wipe', () => {
  beforeEach(() => {
    // 각 도메인 데이터 시드
    localStorage.setItem('bhm_hr_profile', JSON.stringify({ name: '홍길동' }));
    localStorage.setItem('overtimeRecords', JSON.stringify({ '2026-04': [{ id: 'a' }] }));
    localStorage.setItem('leaveRecords', JSON.stringify({ '2026': [{ id: 'b' }] }));
    localStorage.setItem('bhm_work_history_guest', JSON.stringify([{ id: 'c' }]));
    localStorage.setItem('payslip_guest_2026_04', JSON.stringify({ summary: { netPay: 5000000 } }));
    localStorage.setItem('payslip_guest_2026_03', JSON.stringify({ summary: { netPay: 4900000 } }));
    localStorage.setItem('otManualHourly', '50000');
    localStorage.setItem('overtimePayslipData', JSON.stringify({}));
    // KEEP 대상 (사용자 데이터 아님)
    localStorage.setItem('theme', 'neo');
    localStorage.setItem('bhm_settings', JSON.stringify({ googleSub: null }));
    localStorage.setItem('bhm_local_uid', 'uid-123');
  });

  it('clearProfile 호출 → 모든 사용자 도메인 데이터 삭제 (KEEP 항목 제외)', async () => {
    seedProfileForm();
    let reloadCalled = false;
    window.__bhmReloadHook = () => { reloadCalled = true; };
    // Phase 5-followup: clearProfile 가 modal 띄움 — 테스트 hook 으로 자동 confirm
    window.__bhmConfirmClearForTest = () => true;

    await import('../../apps/web/src/client/profile-tab.js');
    expect(typeof window.clearProfile).toBe('function');
    window.clearProfile();

    // 사용자 데이터 모두 삭제
    expect(localStorage.getItem('bhm_hr_profile')).toBeNull();
    expect(localStorage.getItem('overtimeRecords')).toBeNull();
    expect(localStorage.getItem('leaveRecords')).toBeNull();
    expect(localStorage.getItem('bhm_work_history_guest')).toBeNull();
    expect(localStorage.getItem('payslip_guest_2026_04')).toBeNull();
    expect(localStorage.getItem('payslip_guest_2026_03')).toBeNull();
    expect(localStorage.getItem('otManualHourly')).toBeNull();
    expect(localStorage.getItem('overtimePayslipData')).toBeNull();

    // KEEP — 시스템 메타 보존
    expect(localStorage.getItem('theme')).toBe('neo');
    expect(localStorage.getItem('bhm_settings')).not.toBeNull();
    expect(localStorage.getItem('bhm_local_uid')).toBe('uid-123');

    // reload 호출됨 (메모리 상태 초기화)
    expect(reloadCalled).toBe(true);
    delete window.__bhmReloadHook;
    delete window.__bhmConfirmClearForTest;
  });

  it('취소 (confirm hook=false) → modal 띄우고 자동 클릭 X → 데이터 보존', async () => {
    seedProfileForm();
    let reloadCalled = false;
    window.__bhmReloadHook = () => { reloadCalled = true; };
    window.__bhmConfirmClearForTest = () => false;

    await import('../../apps/web/src/client/profile-tab.js');
    window.clearProfile();

    expect(localStorage.getItem('bhm_hr_profile')).not.toBeNull();
    expect(localStorage.getItem('overtimeRecords')).not.toBeNull();
    expect(localStorage.getItem('payslip_guest_2026_04')).not.toBeNull();
    expect(reloadCalled).toBe(false);

    // modal 닫기 (cleanup)
    const modal = document.getElementById('clearProfileModal');
    if (modal) modal.remove();

    delete window.__bhmReloadHook;
    delete window.__bhmConfirmClearForTest;
  });
});
