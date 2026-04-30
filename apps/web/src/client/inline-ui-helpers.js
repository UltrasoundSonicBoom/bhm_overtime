// inline-ui-helpers.js — index.html 인라인 스크립트를 통합
// 1) 저장된 테마(linear) 복원 — DOMContentLoaded 전 flicker 방지
// 2) capture 파라미터 기반 문서 타이틀
// 3) 시간외 시급 0원 경고 배너 + 리스너
// 4) 데모 배너 표시 (?demo=1 또는 snuhmate_demo_mode 플래그)
// 5) ?tutorial=1 → tutorial.html 리다이렉트

(function () {
  'use strict';

  // ── Phase 8 Task 0.1: user-scoped storage key wrapper ──
  // 게스트 (window.__firebaseUid 없음): base + '_guest'
  // 로그인 (window.__firebaseUid 설정됨): base + '_uid_<uid>'
  // window.__firebaseUid 는 firebase/auth-service.js 의 onAuthChanged 에서 설정/해제.
  // 정의가 누락되면 호출자들의 fallback (`base + '_guest'`) 으로만 동작 → user-scoped 분리 작동 안 함.
  window.getUserStorageKey = function (base) {
    var uid = window.__firebaseUid;
    if (uid && typeof uid === 'string' && uid.length > 0) {
      return base + '_uid_' + uid;
    }
    return base + '_guest';
  };

  // recordLocalEdit: localStorage write 시 lastEdit 메타 기록 + Firestore 자동 동기화 트리거
  // Phase 8 Firestore sync (LWW 비교용 timestamp + auto-sync.js 가 listen 해서 write)
  window.recordLocalEdit = function (base) {
    try {
      var key = 'snuhmate_last_edit_' + base;
      localStorage.setItem(key, new Date().toISOString());
    } catch (e) { /* noop */ }
    // 다기기 동기화: auto-sync.js 가 이 이벤트를 받아 Firestore writeXXX 호출
    try {
      window.dispatchEvent(new CustomEvent('app:local-edit', { detail: { base: base } }));
    } catch (e) { /* CustomEvent 미지원 환경 — noop */ }
  };

  // ── (사전 반영) 테마: DOMContentLoaded 전에 즉시 적용해 flicker 방지 ──
  // Phase 5-followup: neo = default :root, dark = data-theme="dark" + style.dark.css 옵션 로드
  // 'linear' 레거시 사용자 → 'dark' 매핑 (Linear/Raycast 톤이 다크 베이스)
  try {
    var savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'linear' || savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (!document.querySelector('link[href*="style.dark.css"]')) {
        var dl = document.createElement('link');
        dl.rel = 'stylesheet';
        dl.href = 'style.dark.css';
        document.head.appendChild(dl);
      }
      if (savedTheme === 'linear') localStorage.setItem('theme', 'dark');  // 1회 마이그레이션
    } else {
      document.documentElement.setAttribute('data-theme', 'neo');
    }
  } catch (e) {}

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
    var isDemoFlag = localStorage.getItem('snuhmate_demo_mode') === '1';
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
