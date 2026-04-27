// inline-ui-helpers.js — index.html 인라인 스크립트를 통합
// 1) 저장된 테마(linear) 복원 — DOMContentLoaded 전 flicker 방지
// 2) capture 파라미터 기반 문서 타이틀
// 3) 시간외 시급 0원 경고 배너 + 리스너
// 4) 데모 배너 표시 (?demo=1 또는 bhm_demo_mode 플래그)
// 5) ?tutorial=1 → tutorial.html 리다이렉트

(function () {
  'use strict';
  // ── (사전 반영) 테마: DOMContentLoaded 전에 즉시 적용해 flicker 방지 ──
  try {
    var savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'linear') document.documentElement.removeAttribute('data-theme');
  } catch (e) {}

  // ── Phase 5-followup: bhm_* → snuhmate_* lazy migration (광역 시스템 키) ──
  // PROFILE/work-history 는 각 모듈에서 처리. 여기서는 settings/device/anon/lastEdit/demo/debug
  try {
    var migrateMap = [
      ['bhm_settings', 'snuhmate_settings'],
      ['bhm_local_uid', 'snuhmate_local_uid'],
      ['bhm_deviceId', 'snuhmate_device_id'],
      ['bhm_anon_id', 'snuhmate_anon_id'],
      ['bhm_demo_mode', 'snuhmate_demo_mode'],
      ['bhm_debug_parser', 'snuhmate_debug_parser'],
      ['bhm_leave_migrated_v1', 'snuhmate_leave_migrated_v1'],
    ];
    for (var i = 0; i < migrateMap.length; i++) {
      var oldK = migrateMap[i][0];
      var newK = migrateMap[i][1];
      var v = localStorage.getItem(oldK);
      if (v !== null && localStorage.getItem(newK) === null) {
        localStorage.setItem(newK, v);
        localStorage.removeItem(oldK);
      }
    }
    // bhm_lastEdit_* prefix 키 모두
    var lastEditKeys = [];
    for (var j = 0; j < localStorage.length; j++) {
      var k = localStorage.key(j);
      if (k && k.indexOf('bhm_lastEdit_') === 0) lastEditKeys.push(k);
    }
    lastEditKeys.forEach(function (oldK) {
      var newK = 'snuhmate_last_edit_' + oldK.substring('bhm_lastEdit_'.length);
      if (localStorage.getItem(newK) === null) {
        localStorage.setItem(newK, localStorage.getItem(oldK));
        localStorage.removeItem(oldK);
      }
    });
  } catch (e) { /* noop */ }

  // ── capture 타이틀: DOM 준비 전에 document.title 갱신 ──
  function getCaptureParams() {
    return new URLSearchParams(window.location.search);
  }

  function applyCaptureTitle() {
    var params = getCaptureParams();
    var titleMap = {
      home: 'SNUH 메이트 - 홈',
      leave: 'SNUH 메이트 - 휴가',
      overtime: 'SNUH 메이트 - 시간외·온콜',
      profile: 'SNUH 메이트 - 개인정보',
      feedback: 'SNUH 메이트 - 피드백'
    };
    var tab = params.get('tab');
    if (tab && titleMap[tab]) document.title = titleMap[tab];
  }
  applyCaptureTitle();

  // ── 시간외 시급 경고 ──
  // Phase 5-followup: 시급 > 0 이면 dismiss 플래그 무시하고 무조건 hide (배너 의미 X)
  function updateHourlyWarning() {
    var val = parseInt(document.getElementById('otHourly')?.value) || 0;
    var warning = document.getElementById('otHourlyWarning');
    if (!warning) return;
    if (val > 0) { warning.style.display = 'none'; return; }
    if (localStorage.getItem('hwBannerDismissed')) { warning.style.display = 'none'; return; }
    warning.style.display = 'flex';
  }

  function dismissHwBanner() {
    localStorage.setItem('hwBannerDismissed', '1');
    var w = document.getElementById('otHourlyWarning');
    if (w) w.style.display = 'none';
  }

  // 전역 노출 (index.html 인라인 onclick 핸들러 호환)
  window.updateHourlyWarning = updateHourlyWarning;
  window.dismissHwBanner = dismissHwBanner;

  // ── DOMContentLoaded 후 초기화 ──
  document.addEventListener('DOMContentLoaded', function () {
    // 데모 배너
    var isDemoUrl = new URLSearchParams(window.location.search).get('demo') === '1';
    var isDemoFlag = localStorage.getItem('bhm_demo_mode') === '1';
    if (isDemoUrl || isDemoFlag) {
      var banner = document.getElementById('demoBanner');
      if (banner) banner.style.display = 'flex';
    }

    // 튜토리얼 리다이렉트
    if (getCaptureParams().get('tutorial') === '1') {
      window.location.href = './tutorial.html';
    }

    // 시급 경고 리스너
    document.getElementById('otHourly')?.addEventListener('input', updateHourlyWarning);
    setTimeout(updateHourlyWarning, 800);
  });
})();

// Phase 2-F: ESM marker — 파일을 ES module 로 표시 (side-effect IIFE 보존)
export {};
