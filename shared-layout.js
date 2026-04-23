// ============================================================
// shared-layout.js — Header & Footer 공유 컴포넌트
// index.html, regulation.html 등에서 동일한 헤더/푸터 사용
// ============================================================

(function () {
  'use strict';

  var CURRENT_PAGE = location.pathname.split('/').pop() || 'index.html';
  var isIndex = CURRENT_PAGE === 'index.html';
  var isRegulation = CURRENT_PAGE === 'regulation.html';
  var isCardNews = CURRENT_PAGE === 'cardnews.html';
  var isStandalone = !isIndex && !isRegulation;

  function homeHref(tab) {
    return 'index.html?app=1&tab=' + tab;
  }

  function el(tag, attrs) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'textContent') e.textContent = attrs[k];
      else if (k === 'className') e.className = attrs[k];
      else if (k === 'onclick') e.onclick = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    return e;
  }

  // REMOVED auth: Google G SVG / _readCachedUser / _renderSignInButton / _renderUserState — 로컬 전용 앱

  // ── 베타 공지 티커 (헤더 바로 아래, 항상 표시) ──
  function _renderBetaNoticeTicker() {
    if (document.getElementById('betaNoticeTicker')) return;
    var ticker = document.createElement('div');
    ticker.id = 'betaNoticeTicker';
    var inner = document.createElement('div');
    inner.className = 'ticker-inner';
    var msg = '🚧 정식 오픈전 테스터 목적외 데이터 저장 금지 · Do NOT store real personal data before official launch · 🚧 정식 오픈전 테스터 목적외 데이터 저장 금지 · Do NOT store real personal data before official launch';
    var span = document.createElement('span');
    span.textContent = msg;
    inner.appendChild(span);
    ticker.appendChild(inner);
    var header = document.getElementById('sharedHeader');
    if (header && header.parentNode) {
      header.parentNode.insertBefore(ticker, header.nextSibling);
    }
  }

  // REMOVED auth: _renderGuestNoticeBanner — 로컬 전용 앱

  // ── Header 렌더 (DOM API) ──
  function renderSharedHeader() {
    var header = document.getElementById('sharedHeader');
    if (!header) return;
    header.className = 'header';
    header.textContent = '';

    var inner = el('div', { className: 'header-inner' });
    var topRow = el('div', { className: 'header-top-row' });

    // Logo — index: switchTab('home'), regulation/standalone: link
    var logo;
    if (isRegulation || isStandalone) {
      logo = el('a', { className: 'logo', href: homeHref('home') });
      logo.style.textDecoration = 'none';
      logo.style.color = 'inherit';
    } else {
      logo = el('div', { className: 'logo' });
      logo.style.cursor = 'pointer';
      logo.onclick = function () { if (window.switchTab) switchTab('home'); };
    }
    // 로고 이미지: 44px (컴팩트, 서브타이틀 제거로 헤더 높이 줄임)
    var img = el('img', { src: 'logo.png', alt: 'SNUH Mate' });
    img.style.cssText = 'width:56px;height:56px;object-fit:contain;flex-shrink:0;border-radius:10px;';
    logo.appendChild(img);
    var titleWrap = el('div', { className: 'logo-title-wrap' });
    titleWrap.style.cssText = 'display:flex;flex-direction:column;min-width:0;';
    var h1 = el('h1', { className: 'logo-main-title', textContent: '슬기로운 병원 생활 메이트' });
    var sub = el('div', { className: 'logo-sub-title', textContent: '2026.5.1 정식 오픈' });
    titleWrap.appendChild(h1);
    titleWrap.appendChild(sub);
    logo.appendChild(titleWrap);
    topRow.appendChild(logo);

    // Header right
    var right = el('div', { className: 'header-right' });

    // REMOVED auth: authContainer (Google 로그인 버튼/계정 영역) — 로컬 전용 앱

    // Settings button (헤더 ⚙️) — 채널톡 자리 대체
    var settingsBtn = el('button', { className: 'theme-toggle-btn', title: '설정', textContent: '⚙️' });
    settingsBtn.onclick = function () {
      if (isIndex && window.switchTab) {
        var settingsContent = document.getElementById('tab-settings');
        var isSettingsActive = settingsContent && settingsContent.classList.contains('active');
        switchTab(isSettingsActive ? 'home' : 'settings');
      } else { location.href = homeHref('settings'); }
    };
    right.appendChild(settingsBtn);

    // ChannelIO 채팅 버튼 비활성 (차후 복구 시 주석 해제)
    // var chatBtn = el('button', { className: 'theme-toggle-btn', title: '피드백 보내기', textContent: '💬' });
    // chatBtn.onclick = function () { if (window.ChannelIO) ChannelIO('showMessenger'); };
    // right.appendChild(chatBtn);

    topRow.appendChild(right);
    inner.appendChild(topRow);
    header.appendChild(inner);
  }

  // ── Footer Nav 렌더 (양쪽 공용) ──
  function renderSharedFooter() {
    var footer = document.getElementById('sharedFooter');
    if (!footer) return;

    footer.className = 'nav-tabs';
    footer.id = 'navTabs';
    footer.textContent = '';

    // header-inner와 동일한 구조: nav-tabs-inner가 max-width:640px 중앙 정렬
    var inner = el('div', { className: 'nav-tabs-inner' });

    function addTabContent(elem, icon, text) {
      elem.appendChild(el('span', { className: 'nav-tab-icon', textContent: icon }));
      elem.appendChild(el('span', { className: 'nav-tab-text', textContent: text }));
    }

    var items = [
      { icon: '🏠', text: '홈', tab: 'home', href: homeHref('home') },
      { icon: '📅', text: '휴가', tab: 'leave', href: homeHref('leave') },
      { icon: '⏰', text: '시간외', tab: 'overtime', href: homeHref('overtime') },
      { icon: '💰', text: '급여', tab: 'payroll', href: homeHref('payroll') },
      { icon: '📖', text: '규정', href: 'regulation.html', active: isRegulation },
      // 뉴스 탭 비활성 (차후 복구 시 주석 해제)
      // { icon: '📰', text: '뉴스', href: 'cardnews.html', active: isCardNews },
      { icon: '👤', text: 'info', tab: 'profile', href: homeHref('profile') }
    ];

    items.forEach(function (item) {
      if (isIndex && item.tab) {
        var btn = el('button', { className: 'nav-tab' });
        btn.dataset.tab = item.tab;
        addTabContent(btn, item.icon, item.text);
        inner.appendChild(btn);
        return;
      }

      var a = el('a', { className: 'nav-tab' + (item.active ? ' active' : ''), href: item.href });
      a.style.textDecoration = 'none';
      addTabContent(a, item.icon, item.text);
      inner.appendChild(a);
    });

    footer.appendChild(inner);
  }

  // ── ChannelIO 부트 ──
  function bootChannelIO() {
    var w = window;
    if (w.ChannelIO) return;
    var ch = function () { ch.c(arguments); };
    ch.q = []; ch.c = function (args) { ch.q.push(args); };
    w.ChannelIO = ch;
    function l() {
      if (w.ChannelIOInitialized) return;
      w.ChannelIOInitialized = true;
      var s = document.createElement('script');
      s.type = 'text/javascript'; s.async = true;
      s.src = 'https://cdn.channel.io/plugin/ch-plugin-web.js';
      var x = document.getElementsByTagName('script')[0];
      if (x.parentNode) x.parentNode.insertBefore(s, x);
    }
    if (document.readyState === 'complete') l();
    else { w.addEventListener('DOMContentLoaded', l); w.addEventListener('load', l); }

    ChannelIO('boot', {
      pluginKey: 'bd97f4e0-d518-49e2-af8e-1aea08eef57e',
      hideChannelButtonOnBoot: true,
      mobileMessengerMode: 'iframe',
      appearance: { zIndex: 9999 }
    });

    ChannelIO('onShowMessenger', function () {
      setTimeout(function () {
        var iframe = document.getElementById('ch-plugin-script-iframe');
        if (iframe) iframe.style.maxWidth = '500px';
      }, 300);
    });
  }

  // ── Init: 헤더/푸터 즉시 렌더, ChannelIO는 DOM 준비 후 ──
  renderSharedHeader();
  _renderBetaNoticeTicker();
  renderSharedFooter();
  // _renderGuestNoticeBanner();  // 사용자 요청으로 비활성화 (2026-04-15)

  // AppLock: DOM 준비 후 잠금 오버레이 체크
  // appLock.js가 먼저 로드된 경우에만 실행 (shared-layout.js는 여러 페이지에서 사용)
  function checkAppLock() {
    if (window.AppLock) window.AppLock.checkAndPrompt();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAppLock);
  } else {
    checkAppLock();
  }

  // ChannelIO 자동 부트 비활성 (차후 복구 시 주석 해제)
  // if (document.readyState === 'loading') {
  //   document.addEventListener('DOMContentLoaded', bootChannelIO);
  // } else {
  //   bootChannelIO();
  // }
})();
