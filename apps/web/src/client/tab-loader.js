// tab-loader.js — Phase 6 Task 5-6 이후 no-op shim.
//
// 역사:
//   - Phase 1~5: tabs/tab-*.html fragment 를 fetch + Range.createContextualFragment 로 lazy 주입.
//   - Phase 6 Task 5-1~5-6: 7 tab (home/payroll/overtime/leave/reference/profile/settings/feedback)
//     모두 *Island.astro 로 build-time inline. fetch 경로 dead code.
//
// 현재 책임:
//   - window.loadTab / window.prefetchTabs API surface 유지 (app.js callers 호환)
//   - ALLOWED_TABS whitelist guard 유지 (잘못된 name 으로 호출 시 reject)
//   - 모든 valid name 은 즉시 resolve(true) — 실제 fetch / DOM 조작 없음
//
// 제거된 코드:
//   - fetch(/tabs/tab-*.html) 호출
//   - inflight cache (race 가드 불필요 — 동기 resolve)
//   - Range.createContextualFragment 주입 로직
//   - prefetchTabs 의 requestIdleCallback / setTimeout 스케줄링 (할 일 없음)

(function () {
  'use strict';

  var ALLOWED_TABS = [
    'home', 'payroll', 'overtime', 'leave', 'schedule',
    'reference', 'profile', 'settings', 'feedback',
    'lifeEvent', 'ai'
  ];

  var cache = Object.create(null);

  function loadTab(name) {
    if (ALLOWED_TABS.indexOf(name) === -1) {
      return Promise.reject(new Error('invalid tab name: ' + name));
    }
    cache[name] = true;
    return Promise.resolve(true);
  }

  function prefetchTabs(names) {
    // Inline island 화 후 prefetch 할 자원 없음 — no-op.
    // ALLOWED_TABS 외 name 은 silently skip (기존 prefetchTabs 동작 유지).
    if (!Array.isArray(names)) return;
    for (var i = 0; i < names.length; i++) {
      if (ALLOWED_TABS.indexOf(names[i]) !== -1) cache[names[i]] = true;
    }
  }

  window.loadTab = loadTab;
  window.prefetchTabs = prefetchTabs;
})();

// Phase 2-F: ESM marker — 파일을 ES module 로 표시 (side-effect IIFE 보존)
export {};
