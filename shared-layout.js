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

  function syncThemeButtonIcon() {
    var button = document.getElementById('themeToggle');
    if (!button) return;
    var isNeo = document.documentElement.getAttribute('data-theme') === 'neo';
    button.textContent = isNeo ? '🎨' : '🌙';
  }

  function fallbackToggleTheme() {
    var html = document.documentElement;
    var isNeo = html.getAttribute('data-theme') === 'neo';
    if (isNeo) {
      html.removeAttribute('data-theme');
      localStorage.setItem('theme', 'linear');
    } else {
      html.setAttribute('data-theme', 'neo');
      localStorage.setItem('theme', 'neo');
    }
    syncThemeButtonIcon();
  }

  // ── Google G SVG (공식 컬러) — createElementNS로 XSS 없이 생성 ──
  function _makeGoogleGSvg() {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '12'); svg.setAttribute('height', '12');
    svg.setAttribute('viewBox', '0 0 18 18'); svg.setAttribute('aria-hidden', 'true');
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('fill', 'none');
    [
      ['M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.258h2.908C16.658 14.013 17.64 11.706 17.64 9.2z', '#4285F4'],
      ['M9 18c2.43 0 4.467-.806 5.956-2.185l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z', '#34A853'],
      ['M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957C.347 6.175 0 7.55 0 9s.348 2.826.957 4.038l3.007-2.332z', '#FBBC05'],
      ['M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z', '#EA4335'],
    ].forEach(function (pair) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', pair[0]); p.setAttribute('fill', pair[1]);
      g.appendChild(p);
    });
    svg.appendChild(g);
    return svg;
  }

  // ── localStorage에서 Google 로그인 캐시 읽기 ──
  function _readCachedUser() {
    try {
      var raw = localStorage.getItem('bhm_settings');
      if (!raw) return null;
      var s = JSON.parse(raw);
      return (s && s.googleSub) ? s : null;
    } catch (e) { return null; }
  }

  // ── 로그인 버튼 렌더 ──
  function _renderSignInButton(auth) {
    auth.textContent = '';
    var btn = document.createElement('button');
    btn.className = 'google-signin-btn';
    btn.setAttribute('aria-label', 'Google로 연결');
    btn.appendChild(_makeGoogleGSvg());
    var span = document.createElement('span');
    span.textContent = 'Google로 연결';
    btn.appendChild(span);
    btn.onclick = function () {
      var dlg = document.getElementById('googlePermissionDialog');
      if (dlg && typeof dlg.showModal === 'function') { dlg.showModal(); return; }
      if (window.GoogleAuth) { window.GoogleAuth.signIn(); return; }
      // googleAuth.js가 없는 페이지(regulation.html 등) — 메인 앱으로 이동 후 연결
      location.href = 'index.html?app=1&tab=home&google_auth=1';
    };
    auth.appendChild(btn);
  }

  // ── 로그인 상태 렌더 ──
  function _renderUserState(auth, user) {
    auth.textContent = '';
    var wrap = document.createElement('div');
    wrap.className = 'auth-user';

    var info = document.createElement('div');
    info.className = 'auth-user-info';

    var name = document.createElement('div');
    name.className = 'auth-user-name';
    name.textContent = user.googleName || user.name || user.googleEmail || '연결됨';
    info.appendChild(name);


    var signout = document.createElement('button');
    signout.className = 'auth-signout-btn';
    signout.textContent = '연결 해제';
    signout.onclick = function () {
      if (window.GoogleAuth && typeof window.GoogleAuth.signOut === 'function') {
        window.GoogleAuth.signOut();
      } else {
        window.location.reload();
      }
    };
    info.appendChild(signout);
    wrap.appendChild(info);

    var pic = user.googlePicture || user.picture;
    if (pic) {
      var img = document.createElement('img');
      img.src = pic;
      img.className = 'auth-avatar';
      img.alt = name.textContent;
      img.onerror = function () { img.style.display = 'none'; };
      wrap.appendChild(img);
    }
    auth.appendChild(wrap);
  }

  // shared helper — index.html의 updateAuthUI가 이 함수를 호출할 수 있도록 expose
  window._sharedAuthRenderSignIn = _renderSignInButton;
  window._sharedAuthRenderUser   = _renderUserState;

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

  // ── 게스트 안내 배너 (헤더 바로 아래, 1회만 표시) ──
  function _renderGuestNoticeBanner() {
    try {
      if (localStorage.getItem('bhm_guestNoticeAck') === '1') return;
      if (_readCachedUser()) return;
    } catch (e) { return; }

    var banner = document.createElement('div');
    banner.id = 'guestNoticeBanner';

    var text = document.createElement('span');
    text.textContent = '이 브라우저를 함께 쓰면 기록이 공유돼요. Google로 연결하면 내 전용 공간이 생겨요.';
    banner.appendChild(text);

    var close = document.createElement('button');
    close.className = 'gnb-close';
    close.setAttribute('aria-label', '알림 닫기');
    close.textContent = '✕';
    close.onclick = function () {
      try { localStorage.setItem('bhm_guestNoticeAck', '1'); } catch (e) {}
      banner.remove();
    };
    banner.appendChild(close);

    var header = document.getElementById('sharedHeader');
    if (header && header.parentNode) {
      header.parentNode.insertBefore(banner, header.nextSibling);
    }
  }

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

    // Auth container: 동기 pre-render로 초기 플리커 방지
    var auth = el('div', { id: 'authContainer', className: 'auth-container' });
    auth.style.cssText = 'display:flex;align-items:center;';
    var cached = _readCachedUser();
    if (cached) {
      _renderUserState(auth, cached);
    } else {
      _renderSignInButton(auth);
    }
    right.appendChild(auth);

    // // Theme toggle (주석처리)
    // var themeBtn = el('button', { className: 'theme-toggle-btn', id: 'themeToggle', title: '테마 전환', textContent: '🎨' });
    // themeBtn.onclick = function () {
    //   if (typeof window.toggleTheme === 'function') window.toggleTheme();
    //   else fallbackToggleTheme();
    //   syncThemeButtonIcon();
    // };
    // right.appendChild(themeBtn);

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
    syncThemeButtonIcon();
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
