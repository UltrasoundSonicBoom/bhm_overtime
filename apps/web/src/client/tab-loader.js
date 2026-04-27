// tab-loader.js — 탭 HTML fragment lazy loader
// 보안 정책:
//   1) ALLOWED_TABS whitelist로 name 검증 (prototype pollution 차단)
//   2) fragment는 same-origin 정적 파일 (tabs/tab-*.html)만 로드
//   3) Range.createContextualFragment() 사용 — innerHTML 대신 파싱 후 DOM 삽입
//   4) tabs/*.html 파일에는 절대 사용자 입력 기반 값을 담지 않음
//      (사용자 값은 기존 init 함수가 textContent/escapeHtml 경로로만 주입)

(function () {
  'use strict';

  var ALLOWED_TABS = [
    'home', 'payroll', 'overtime', 'leave',
    'reference', 'profile', 'settings', 'feedback'
  ];

  var cache = Object.create(null);
  var inflight = Object.create(null);

  function _injectHtml(placeholder, html) {
    // 기존 자식 제거
    while (placeholder.firstChild) {
      placeholder.removeChild(placeholder.firstChild);
    }
    var range = document.createRange();
    range.selectNodeContents(placeholder);
    var fragment = range.createContextualFragment(html);
    placeholder.appendChild(fragment);
  }

  function loadTab(name) {
    if (ALLOWED_TABS.indexOf(name) === -1) {
      return Promise.reject(new Error('invalid tab name: ' + name));
    }
    // Phase 6 Task 5-1/5-2/5-3/5-4/5-5: home/profile/payroll/overtime/leave/reference/settings tab 은 *Island.astro 로 build-time inline → fetch skip.
    if (name === 'home' || name === 'profile' || name === 'payroll' || name === 'overtime' || name === 'leave' || name === 'reference' || name === 'settings') {
      cache[name] = true;
      return Promise.resolve(true);
    }
    if (cache[name]) return Promise.resolve(true);
    if (inflight[name]) return inflight[name];

    var placeholder = document.getElementById('tab-' + name);
    if (!placeholder) return Promise.reject(new Error('placeholder not found: tab-' + name));
    if (placeholder.dataset.loaded === '1') {
      cache[name] = true;
      return Promise.resolve(true);
    }

    // Phase 6: absolute path — Astro 가 /app/ 등 sub-path 에 페이지 마운트 → 상대 경로 깨짐 fix
    var url = '/tabs/tab-' + name + '.html?v=1.0';
    inflight[name] = fetch(url, { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('fetch failed: ' + url + ' (' + r.status + ')');
        return r.text();
      })
      .then(function (html) {
        // 주입 직전 whitelist 재확인 — defense in depth
        if (ALLOWED_TABS.indexOf(name) === -1) throw new Error('guard failed');
        _injectHtml(placeholder, html);
        placeholder.dataset.loaded = '1';
        cache[name] = true;
        delete inflight[name];
        return true;
      })
      .catch(function (err) {
        delete inflight[name];
        console.error('[tab-loader]', err);
        placeholder.textContent = '탭을 불러오지 못했습니다. 새로고침을 시도해주세요.';
        throw err;
      });
    return inflight[name];
  }

  function prefetchTabs(names) {
    var valid = names.filter(function (n) { return ALLOWED_TABS.indexOf(n) !== -1; });
    if (typeof window.requestIdleCallback === 'function') {
      requestIdleCallback(function () { valid.forEach(loadTab); }, { timeout: 3000 });
    } else {
      setTimeout(function () { valid.forEach(loadTab); }, 1500);
    }
  }

  window.loadTab = loadTab;
  window.prefetchTabs = prefetchTabs;
})();

// Phase 2-F: ESM marker — 파일을 ES module 로 표시 (side-effect IIFE 보존)
export {};
