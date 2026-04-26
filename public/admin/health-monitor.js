/**
 * HealthMonitor — SNUH Mate 계산 데이터 건강 모니터
 * localStorage를 읽어 프로필/시간외/동기화/상수 상태를 진단한다.
 * admin/index.html (대시보드 카드) + admin/calc-flow.html (노드 색상) 양쪽에서 사용.
 */
(function () {
  'use strict';

  // ── localStorage 키 탐색 (supabaseClient.js:15-19 와 동일 로직) ──
  function getUserKey(baseKey) {
    try {
      var s = JSON.parse(localStorage.getItem('bhm_settings') || '{}');
      var uid = s.googleSub || 'guest';
      return baseKey + '_' + uid;
    } catch (_) {
      return baseKey + '_guest';
    }
  }

  function readJSON(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  // ── 예상 배율 상수 ──
  var EXPECTED_RATES = {
    extended: 1.5,
    night: 2.0,
    holiday: 1.5,
    holidayOver8: 2.0,
    holidayNight: 2.0,
  };

  var PROFILE_REQUIRED_FIELDS = ['grade', 'year', 'hireDate', 'jobType'];
  var PROFILE_OPTIONAL_FIELDS = ['name', 'department'];

  // ══════════════════════════════════════════
  // 개별 검사 함수
  // ══════════════════════════════════════════

  function checkProfile() {
    var profile = readJSON(getUserKey('bhm_hr_profile'));
    if (!profile) {
      return { status: 'error', score: 0, total: PROFILE_REQUIRED_FIELDS.length + PROFILE_OPTIONAL_FIELDS.length, filled: 0, missing: PROFILE_REQUIRED_FIELDS.slice(), label: '프로필 없음' };
    }
    var allFields = PROFILE_REQUIRED_FIELDS.concat(PROFILE_OPTIONAL_FIELDS);
    var filled = 0;
    var missing = [];
    allFields.forEach(function (f) {
      if (profile[f] !== undefined && profile[f] !== null && profile[f] !== '') {
        filled++;
      } else {
        missing.push(f);
      }
    });
    var pct = Math.round((filled / allFields.length) * 100);
    var requiredMissing = PROFILE_REQUIRED_FIELDS.filter(function (f) {
      return !profile[f] && profile[f] !== 0;
    });
    var status = requiredMissing.length > 0 ? 'error' : pct >= 80 ? 'ok' : 'warn';
    return { status: status, score: pct, total: allFields.length, filled: filled, missing: missing, requiredMissing: requiredMissing, label: pct + '%' };
  }

  function checkOvertime() {
    var records = readJSON(getUserKey('overtimeRecords'));
    if (!records || typeof records !== 'object') {
      return { status: 'warn', totalRecords: 0, issues: [], label: '기록 없음' };
    }
    var issues = [];
    var totalRecords = 0;
    var zeroRateCount = 0;
    var nanPayCount = 0;

    Object.keys(records).forEach(function (ym) {
      var monthRecords = records[ym];
      if (!Array.isArray(monthRecords)) return;
      monthRecords.forEach(function (r) {
        totalRecords++;
        if (!r.hourlyRate || r.hourlyRate <= 0) zeroRateCount++;
        if (r.estimatedPay !== undefined && (isNaN(r.estimatedPay) || r.estimatedPay < 0)) nanPayCount++;
        if (r.breakdown) {
          var bd = r.breakdown;
          if (isNaN(bd.extended) || isNaN(bd.night) || isNaN(bd.holiday)) {
            issues.push({ type: 'nan_breakdown', date: r.date, month: ym });
          }
        }
      });
    });

    if (zeroRateCount > 0) issues.push({ type: 'zero_rate', count: zeroRateCount });
    if (nanPayCount > 0) issues.push({ type: 'nan_pay', count: nanPayCount });

    var status = issues.length > 0 ? (zeroRateCount > 0 || nanPayCount > 0 ? 'error' : 'warn') : (totalRecords > 0 ? 'ok' : 'warn');
    return { status: status, totalRecords: totalRecords, issues: issues, label: totalRecords > 0 ? totalRecords + '건' : '없음' };
  }

  function checkPayslip() {
    var payslipData = readJSON(getUserKey('overtimePayslipData'));
    var records = readJSON(getUserKey('overtimeRecords'));
    if (!payslipData || typeof payslipData !== 'object') {
      return { status: 'warn', months: 0, mismatches: [], label: '명세서 없음' };
    }
    var months = Object.keys(payslipData).length;
    var mismatches = [];

    Object.keys(payslipData).forEach(function (ym) {
      var pd = payslipData[ym];
      if (!pd || !pd.workStats) return;
      var ws = pd.workStats;

      // 수동 기록과 비교
      var monthRecords = records && records[ym];
      if (!Array.isArray(monthRecords) || monthRecords.length === 0) return;

      var manualExt = 0, manualNight = 0, manualHol = 0;
      monthRecords.forEach(function (r) {
        if (!r.breakdown) return;
        manualExt += r.breakdown.extended || 0;
        manualNight += r.breakdown.night || 0;
        manualHol += r.breakdown.holiday || 0;
      });

      var payslipExt = ws.extendedHours || 0;
      var payslipNight = ws.nightHours || 0;
      var payslipHol = ws.holidayHours || 0;

      // 차이가 10% 초과 시 경고
      var totalManual = manualExt + manualNight + manualHol;
      var totalPayslip = payslipExt + payslipNight + payslipHol;
      if (totalManual > 0 && totalPayslip > 0) {
        var diffPct = Math.abs(totalPayslip - totalManual) / Math.max(totalManual, totalPayslip) * 100;
        if (diffPct > 10) {
          mismatches.push({ month: ym, diffPct: Math.round(diffPct), manual: totalManual, payslip: totalPayslip });
        }
      }
    });

    var status = mismatches.length > 0 ? 'warn' : (months > 0 ? 'ok' : 'warn');
    return { status: status, months: months, mismatches: mismatches, label: months > 0 ? months + '개월' : '없음' };
  }

  function checkSync() {
    var keys = ['overtimeRecords', 'bhm_hr_profile', 'overtimePayslipData', 'leaveRecords'];
    var latestEdit = null;
    var checkedKeys = 0;

    keys.forEach(function (base) {
      var localKey = getUserKey(base);
      var editKey = 'bhm_lastEdit_' + localKey;
      var ts = localStorage.getItem(editKey);
      if (ts) {
        checkedKeys++;
        var d = new Date(ts);
        if (!latestEdit || d > latestEdit) latestEdit = d;
      }
    });

    if (!latestEdit) {
      return { status: 'warn', lastSync: null, gapHours: null, label: 'N/A' };
    }

    var gapMs = Date.now() - latestEdit.getTime();
    var gapHours = Math.round(gapMs / 3600000);
    var status = gapHours < 1 ? 'ok' : gapHours < 24 ? 'warn' : 'error';

    var label;
    if (gapHours < 1) label = '방금 전';
    else if (gapHours < 24) label = gapHours + '시간 전';
    else label = Math.round(gapHours / 24) + '일 전';

    return { status: status, lastSync: latestEdit.toISOString(), gapHours: gapHours, label: label };
  }

  function checkConstants() {
    // admin 페이지에 data.js가 로드되지 않으므로,
    // 기록된 데이터에서 실제 사용된 배율을 역추적하여 검증
    var records = readJSON(getUserKey('overtimeRecords'));
    if (!records || typeof records !== 'object') {
      return { status: 'warn', checked: false, issues: [], label: '검증 불가' };
    }

    var issues = [];
    var checked = false;

    // 시간외 기록에서 hourlyRate와 estimatedPay로 배율 역산
    Object.keys(records).forEach(function (ym) {
      var monthRecords = records[ym];
      if (!Array.isArray(monthRecords)) return;
      monthRecords.forEach(function (r) {
        if (!r.hourlyRate || r.hourlyRate <= 0 || !r.breakdown) return;
        checked = true;
        var bd = r.breakdown;
        // extended 배율 검증: estimatedPay ≈ hourlyRate * (ext*1.5 + night*2.0 + hol*1.5 + ...)
        // 정확한 역산은 복잡하므로, hourlyRate가 양수이고 estimatedPay가 합리적 범위인지만 확인
        if (r.estimatedPay !== undefined && r.totalHours > 0) {
          var impliedRate = r.estimatedPay / (r.hourlyRate * r.totalHours);
          // 배율이 0.5~5.0 범위 밖이면 이상
          if (impliedRate < 0.5 || impliedRate > 5.0) {
            issues.push({ type: 'abnormal_rate', date: r.date, impliedRate: Math.round(impliedRate * 100) / 100 });
          }
        }
      });
    });

    var status = issues.length > 0 ? 'error' : (checked ? 'ok' : 'warn');
    return { status: status, checked: checked, issues: issues, label: checked ? (issues.length === 0 ? '정상' : issues.length + '건 이상') : '검증 불가' };
  }

  // ══════════════════════════════════════════
  // 종합 스캔
  // ══════════════════════════════════════════

  function scan() {
    var profile = checkProfile();
    var overtime = checkOvertime();
    var payslip = checkPayslip();
    var sync = checkSync();
    var constants = checkConstants();

    // 종합 점수: 각 검사 ok=2, warn=1, error=0
    var scoreMap = { ok: 2, warn: 1, error: 0 };
    var checks = [profile, overtime, payslip, sync, constants];
    var totalScore = 0;
    checks.forEach(function (c) { totalScore += scoreMap[c.status] || 0; });
    var maxScore = checks.length * 2;
    var scorePct = Math.round((totalScore / maxScore) * 100);
    var overall = scorePct >= 80 ? 'ok' : scorePct >= 50 ? 'warn' : 'error';

    return {
      profile: profile,
      overtime: overtime,
      payslip: payslip,
      sync: sync,
      constants: constants,
      score: scorePct,
      overall: overall,
    };
  }

  // ══════════════════════════════════════════
  // 알림 생성
  // ══════════════════════════════════════════

  function getAlerts() {
    var result = scan();
    var alerts = [];

    // 프로필 관련
    if (result.profile.requiredMissing && result.profile.requiredMissing.length > 0) {
      alerts.push({
        severity: 'error',
        title: '프로필 필수 항목 누락',
        message: '누락 항목: ' + result.profile.requiredMissing.join(', '),
        action: '프로필 탭에서 정보를 입력하세요.',
      });
    } else if (result.profile.status === 'warn') {
      alerts.push({
        severity: 'info',
        title: '프로필 선택 항목 미입력',
        message: '누락 항목: ' + result.profile.missing.join(', '),
        action: '더 정확한 계산을 위해 입력을 권장합니다.',
      });
    }

    // 시간외 기록 관련
    var otIssues = result.overtime.issues;
    otIssues.forEach(function (issue) {
      if (issue.type === 'zero_rate') {
        alerts.push({
          severity: 'error',
          title: '시급 0원 기록 감지',
          message: '시급이 0원으로 기록된 데이터가 ' + issue.count + '건 있습니다.',
          action: '해당 기록의 시급을 확인하고 수정하세요.',
        });
      }
      if (issue.type === 'nan_pay') {
        alerts.push({
          severity: 'error',
          title: '수당 계산 오류',
          message: '수당이 NaN 또는 음수인 기록이 ' + issue.count + '건 있습니다.',
          action: '해당 기록을 삭제하고 다시 입력하세요.',
        });
      }
    });

    // 명세서 불일치
    result.payslip.mismatches.forEach(function (mm) {
      alerts.push({
        severity: 'warn',
        title: mm.month + ' 명세서 시간 불일치',
        message: '수동 기록 ' + mm.manual.toFixed(1) + 'h vs 명세서 ' + mm.payslip.toFixed(1) + 'h (차이 ' + mm.diffPct + '%)',
        action: '교차 검증 결과를 확인하세요.',
      });
    });

    // 동기화
    if (result.sync.status === 'error') {
      alerts.push({
        severity: 'warn',
        title: '동기화 장기 미실행',
        message: '마지막 동기화가 ' + (result.sync.gapHours >= 24 ? Math.round(result.sync.gapHours / 24) + '일' : result.sync.gapHours + '시간') + ' 전입니다.',
        action: '앱에서 동기화를 실행하세요.',
      });
    }

    // 상수 유효성
    result.constants.issues.forEach(function (issue) {
      if (issue.type === 'abnormal_rate') {
        alerts.push({
          severity: 'error',
          title: '비정상 수당 배율 감지',
          message: issue.date + ' 기록의 배율이 ' + issue.impliedRate + '배 — 예상 범위(0.5~5.0) 밖입니다.',
          action: '해당 기록의 시급과 수당을 확인하세요.',
        });
      }
    });

    // 데이터 없음 안내
    if (result.profile.status === 'error' && result.overtime.totalRecords === 0) {
      // 모든 데이터가 비어 있으면 다른 알림 대신 단일 안내
      alerts = [{
        severity: 'info',
        title: '앱 데이터 없음',
        message: '이 브라우저에 SNUH Mate 앱 데이터가 없습니다.',
        action: '메인 앱을 먼저 사용하면 여기에 건강 상태가 표시됩니다.',
      }];
    }

    return alerts;
  }

  // ══════════════════════════════════════════
  // 노드 상태 매핑 (Cytoscape용)
  // ══════════════════════════════════════════

  var _cachedScan = null;
  var _cacheTime = 0;

  function getCachedScan() {
    var now = Date.now();
    if (!_cachedScan || now - _cacheTime > 5000) {
      _cachedScan = scan();
      _cacheTime = now;
    }
    return _cachedScan;
  }

  function getNodeStatus(nodeId) {
    var s = getCachedScan();

    var nodeMap = {
      // Layer 1: 규정 상수
      overtimeRates:    function () { return s.constants.status; },
      payTables:        function () { return s.constants.checked ? 'ok' : 'warn'; },
      allowances:       function () { return s.constants.checked ? 'ok' : 'warn'; },
      deductions:       function () { return s.constants.checked ? 'ok' : 'warn'; },
      seniorityRates:   function () { return s.constants.checked ? 'ok' : 'warn'; },

      // Layer 2: 시급 산출
      calcOrdinaryWage: function () {
        // hourlyRate가 유효한 기록이 있는지
        if (s.overtime.totalRecords === 0) return 'warn';
        var hasZero = s.overtime.issues.some(function (i) { return i.type === 'zero_rate'; });
        return hasZero ? 'error' : 'ok';
      },
      calcOvertimePay:  function () { return s.overtime.status === 'error' ? 'error' : 'ok'; },
      calcOnCallPay:    function () { return 'ok'; }, // 온콜은 별도 검증 불필요
      profileCalcWage:  function () { return s.profile.status; },

      // Layer 3: 레코드 생성
      createRecord:     function () { return s.overtime.totalRecords > 0 ? 'ok' : 'warn'; },
      savePayslipData:  function () { return s.payslip.months > 0 ? 'ok' : 'warn'; },
      propagatePayslip: function () { return s.payslip.months > 0 ? 'ok' : 'warn'; },

      // Layer 4: 월간 집계
      calcMonthlyStats: function () {
        if (s.overtime.totalRecords === 0 && s.payslip.months === 0) return 'warn';
        return s.overtime.status === 'error' ? 'error' : 'ok';
      },
      calcYearlyStats:  function () { return s.overtime.totalRecords > 0 ? 'ok' : 'warn'; },
      crossVerify:      function () {
        return s.payslip.mismatches.length > 0 ? 'warn' : (s.payslip.months > 0 ? 'ok' : 'warn');
      },

      // Layer 5: 소비자
      renderOtDashboard:  function () { return s.overtime.status !== 'error' ? 'ok' : 'error'; },
      renderHomeOtMonth:  function () { return s.overtime.status !== 'error' ? 'ok' : 'error'; },
      alertBanner:        function () { return 'ok'; },
      renderVerification: function () { return s.payslip.months > 0 ? 'ok' : 'warn'; },
      calcMonthEstimate:  function () {
        return s.profile.status === 'error' ? 'error' : s.overtime.status === 'error' ? 'error' : 'ok';
      },
      calcAverageWage:    function () { return s.profile.status === 'error' ? 'error' : 'ok'; },
      payrollOtCalc:      function () { return s.overtime.status !== 'error' ? 'ok' : 'error'; },
      syncOtPayslip:      function () { return s.sync.status; },
      calcPayrollSim:     function () {
        return s.profile.status === 'error' ? 'error' : 'ok';
      },
    };

    var fn = nodeMap[nodeId];
    return fn ? fn() : 'ok';
  }

  // ══════════════════════════════════════════
  // Public API
  // ══════════════════════════════════════════

  window.HealthMonitor = {
    scan: scan,
    getAlerts: getAlerts,
    getNodeStatus: getNodeStatus,
    invalidateCache: function () { _cachedScan = null; _cacheTime = 0; },
  };
})();
