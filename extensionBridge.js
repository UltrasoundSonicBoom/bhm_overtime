/**
 * SnuhmateExtensionBridge — Chrome Extension ↔ SNUH Mate page RPC surface
 * 확장프로그램은 이 브릿지를 통해서만 앱 기능에 접근한다.
 * 비즈니스 로직은 기존 모듈(OVERTIME, SALARY_PARSER 등)에 위임.
 */
window.SnuhmateExtensionBridge = (function () {
  'use strict';

  // ── 인증 검증: Google 로그인 계정 일치 확인 ──
  function assertAuthenticated() {
    var settings;
    try { settings = JSON.parse(localStorage.getItem('bhm_settings') || '{}'); } catch (e) { settings = {}; }
    if (!settings.googleSub || settings.googleSub === 'guest' || settings.googleSub === 'demo') {
      throw new Error('SNUH Mate에 Google 로그인이 필요합니다.');
    }
    return settings;
  }

  function assertQuickCapturePayload(payload) {
    if (!payload || !payload.kind) throw new Error('kind required');
    if (!payload.date) throw new Error('date required');
  }

  function mapCaptureType(kind) {
    if (kind === 'overtime') return 'overtime';
    if (kind === 'oncall_standby') return 'oncall_standby';
    if (kind === 'oncall_callout') return 'oncall_callout';
    throw new Error('unsupported capture kind: ' + kind);
  }

  async function quickCapture(payload) {
    assertAuthenticated();
    assertQuickCapturePayload(payload);
    if (!window.OVERTIME) throw new Error('OVERTIME unavailable');

    var type = mapCaptureType(payload.kind);
    var hourlyRate = payload.hourlyRate || parseInt(localStorage.getItem(
      window.getUserStorageKey ? window.getUserStorageKey('otManualHourly') : 'otManualHourly'
    ), 10) || 0;

    var startTime = payload.startTime || '';
    var endTime = payload.endTime || '';
    var memo = payload.memo || '[EXT] quick capture';
    var isHoliday = !!payload.isHoliday;

    // oncall_standby는 시급 불필요, 그 외에는 프로필에서 자동 로드 시도
    if (type !== 'oncall_standby' && !hourlyRate) {
      var profile = window.PROFILE && window.PROFILE.load ? window.PROFILE.load() : null;
      var wage = profile && window.PROFILE.calcWage ? window.PROFILE.calcWage(profile) : null;
      hourlyRate = wage && wage.hourlyRate ? wage.hourlyRate : 0;
    }

    var record = window.OVERTIME.createRecord(
      payload.date, startTime, endTime, type, hourlyRate, isHoliday, memo
    );

    if (typeof window.refreshOtCalendar === 'function') {
      await window.refreshOtCalendar();
    }
    if (typeof window.showOtToast === 'function') {
      window.showOtToast('확장 프로그램에서 기록했어요.');
    }

    return { ok: true, recordId: record.id };
  }

  function base64ToFile(base64, fileName, mimeType) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], fileName, { type: mimeType || 'application/pdf' });
  }

  async function importPayslipPayload(payload) {
    assertAuthenticated();
    if (!payload || !payload.base64 || !payload.fileName) throw new Error('invalid payslip payload');
    if (!window.SALARY_PARSER) throw new Error('SALARY_PARSER unavailable');

    var file = base64ToFile(payload.base64, payload.fileName, payload.mimeType);

    // handlePayslipUpload는 DOM(payslipResult)에 의존하므로,
    // 확장프로그램에서는 파싱 → 저장 → UI 갱신을 분리 실행한다.
    var parsed = await window.SALARY_PARSER.parseFile(file);
    var ym = window.SALARY_PARSER.parsePeriodYearMonth(parsed);
    if (!ym) throw new Error('급여 기간을 인식하지 못했습니다.');

    window.SALARY_PARSER.saveMonthlyData(ym.year, ym.month, parsed, ym.type);

    // 프로필 자동 반영
    if (window.SALARY_PARSER.applyStableItemsToProfile) {
      window.SALARY_PARSER.applyStableItemsToProfile(parsed);
    }

    // 급여 탭으로 전환 + UI 갱신 (DOM이 있으면)
    if (typeof window.switchTab === 'function') {
      window.switchTab('payroll');
    }
    var payTab = document.querySelector('#tab-payroll .pay-bookmark-tab[data-subtab="pay-payslip"]');
    if (payTab) payTab.click();

    // 명세서 뷰 갱신
    if (typeof window.renderPayslipMgmt === 'function') {
      window.renderPayslipMgmt();
    }

    if (typeof window.showOtToast === 'function') {
      window.showOtToast('확장프로그램에서 명세서를 가져왔어요.');
    }

    return {
      ok: true,
      fileName: payload.fileName,
      year: ym.year,
      month: ym.month,
      type: ym.type || '급여'
    };
  }

  // ── 브릿지 준비 완료 이벤트 ──
  window.postMessage({ source: 'snuhmate-page', type: 'BRIDGE_READY' }, '*');

  return {
    version: '1',
    quickCapture: quickCapture,
    importPayslipPayload: importPayslipPayload
  };
})();
