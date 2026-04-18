// ============================================================
// demo-data.js — 데모 모드 샘플 데이터
// loadDemoData(): localStorage에 데모 데이터 주입
// exitDemoMode(): 데모 데이터 제거 + settings 초기화
// ============================================================

(function () {
  var DEMO_UID = 'demo';

  var _profile = {
    name: '김지현',
    gender: 'F',
    hospital: '서울대학교병원',
    department: '혈관조영실',
    jobType: '간호직',
    grade: 'J3',
    year: 3,
    hireDate: '2023-03-01',
    birthDate: '1996-05-15',
    seniority: false,
    military: false,
    militaryMonths: 0,
    upgradeAdjustPay: 0,
    education: [],
    papers: [],
  };

  // 4월: 시간외 2건(7h) + 온콜출근 2건(13h 인정시간)
  var _overtime = {
    '2026-04': [
      {
        id: '2026-04-10_demo1',
        date: '2026-04-10',
        type: 'overtime',
        startTime: '21:00',
        endTime: '00:00',
        memo: '',
        totalHours: 3,
        breakdown: { extended: 1, night: 2, holiday: 0, holidayNight: 0 },
        estimatedPay: 178332,
        isWeekend: false,
        isHoliday: false,
        hourlyRate: 32424,
      },
      {
        id: '2026-04-11_demo2',
        date: '2026-04-11',
        type: 'oncall_callout',
        startTime: '18:00',
        endTime: '22:00',
        memo: '',
        totalHours: 6,
        breakdown: { extended: 2, night: 0, holiday: 4, holidayNight: 0 },
        estimatedPay: 353210,
        isWeekend: true,
        isHoliday: false,
        hourlyRate: 32424,
      },
      {
        id: '2026-04-16_demo3',
        date: '2026-04-16',
        type: 'overtime',
        startTime: '18:00',
        endTime: '22:00',
        memo: '',
        totalHours: 4,
        breakdown: { extended: 4, night: 0, holiday: 0, holidayNight: 0 },
        estimatedPay: 194544,
        isWeekend: false,
        isHoliday: false,
        hourlyRate: 32424,
      },
      {
        id: '2026-04-20_demo4',
        date: '2026-04-20',
        type: 'oncall_callout',
        startTime: '07:00',
        endTime: '10:00',
        memo: '',
        totalHours: 5,
        breakdown: { extended: 2, night: 0, holiday: 3, holidayNight: 0 },
        estimatedPay: 226968,
        isWeekend: true,
        isHoliday: false,
        hourlyRate: 32424,
      },
    ],
    '2026-03': [
      {
        id: '2026-03-22_demo5',
        date: '2026-03-22',
        type: 'overtime',
        startTime: '18:00',
        endTime: '21:00',
        memo: '',
        totalHours: 3,
        breakdown: { extended: 3, night: 0, holiday: 0, holidayNight: 0 },
        estimatedPay: 145908,
        isWeekend: false,
        isHoliday: false,
        hourlyRate: 32424,
      },
    ],
  };

  var _leave = {
    '2026': [
      {
        id: '2026-03-10_demo_leave1',
        startDate: '2026-03-10',
        endDate: '2026-03-14',
        type: 'annual',
        days: 5,
        isPaid: false,
        usesAnnual: true,
        category: '연차',
        deductType: 'ordinary',
        salaryImpact: 0,
        memo: '',
      },
      {
        id: '2026-04-07_demo_leave2',
        startDate: '2026-04-07',
        endDate: '2026-04-08',
        type: 'annual',
        days: 2,
        isPaid: false,
        usesAnnual: true,
        category: '연차',
        deductType: 'ordinary',
        salaryImpact: 0,
        memo: '',
      },
    ],
  };

  function loadDemoData() {
    localStorage.setItem('bhm_demo_mode', '1');

    var settings = {};
    try { settings = JSON.parse(localStorage.getItem('bhm_settings') || '{}'); } catch (e) {}
    settings.googleSub = DEMO_UID;
    localStorage.setItem('bhm_settings', JSON.stringify(settings));

    localStorage.setItem('bhm_hr_profile_' + DEMO_UID, JSON.stringify(_profile));
    localStorage.setItem('overtimeRecords_' + DEMO_UID, JSON.stringify(_overtime));
    localStorage.setItem('leaveRecords_' + DEMO_UID, JSON.stringify(_leave));
  }

  function exitDemoMode() {
    localStorage.removeItem('bhm_demo_mode');
    sessionStorage.removeItem('bhm_demo_session');
    localStorage.removeItem('bhm_hr_profile_' + DEMO_UID);
    localStorage.removeItem('overtimeRecords_' + DEMO_UID);
    localStorage.removeItem('leaveRecords_' + DEMO_UID);

    var settings = {};
    try { settings = JSON.parse(localStorage.getItem('bhm_settings') || '{}'); } catch (e) {}
    if (settings.googleSub === DEMO_UID) {
      delete settings.googleSub;
      localStorage.setItem('bhm_settings', JSON.stringify(settings));
    }
  }

  // 데모 모드: 급여 탭 진입 시 '이번 달 예상액' 서브탭 기본 선택 + 콘텐츠 렌더
  document.addEventListener('DOMContentLoaded', function () {
    if (localStorage.getItem('bhm_demo_mode') !== '1') return;
    window.initPayrollTab = function () {
      // 서브탭 UI 전환
      document.querySelectorAll('#tab-payroll .pay-bookmark-tab').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.subtab === 'pay-calc');
      });
      document.querySelectorAll('#tab-payroll .sub-content').forEach(function (el) {
        el.classList.toggle('active', el.id === 'sub-pay-calc');
      });
      // pay-calc 콘텐츠 렌더 (히어로 + 타임라인 + 계산카드)
      if (typeof initPayEstimate === 'function') initPayEstimate();
      if (typeof PAYROLL !== 'undefined') PAYROLL.init();
    };
  });

  // 페이지 이동 후에도 demo 상태 복원 (SPA 탭 전환 시 googleSub 유지)
  // sessionStorage 가드: 이 세션에서 ?demo=1로 진입한 경우에만 복원.
  // 다른 탭·창에서 남긴 localStorage 잔여물이 비데모 URL에 전파되는 것을 차단한다.
  (function restoreDemoIfNeeded() {
    if (localStorage.getItem('bhm_demo_mode') !== '1') return;
    if (!sessionStorage.getItem('bhm_demo_session')) {
      // 이 세션에서 demo=1로 진입한 적 없음 → localStorage 잔여물 정리
      localStorage.removeItem('bhm_demo_mode');
      var s = {};
      try { s = JSON.parse(localStorage.getItem('bhm_settings') || '{}'); } catch (e) {}
      if (s.googleSub === DEMO_UID) { delete s.googleSub; localStorage.setItem('bhm_settings', JSON.stringify(s)); }
      return;
    }
    var settings = {};
    try { settings = JSON.parse(localStorage.getItem('bhm_settings') || '{}'); } catch (e) {}
    if (settings.googleSub !== DEMO_UID) {
      settings.googleSub = DEMO_UID;
      localStorage.setItem('bhm_settings', JSON.stringify(settings));
    }
  })();

  window.loadDemoData = loadDemoData;
  window.exitDemoMode = exitDemoMode;
  window.DEMO_UID = DEMO_UID;
})();
