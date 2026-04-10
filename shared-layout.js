// ============================================================
// shared-layout.js — Header & Footer 공유 컴포넌트
// index.html, regulation.html 등에서 동일한 헤더/푸터 사용
// ============================================================

(function () {
  'use strict';

  var CURRENT_PAGE = location.pathname.split('/').pop() || 'index.html';
  var isRegulation = CURRENT_PAGE === 'regulation.html';

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

  // ── Header 렌더 (DOM API) ──
  function renderSharedHeader() {
    var header = document.getElementById('sharedHeader');
    if (!header) return;
    header.className = 'header';
    header.textContent = '';

    var inner = el('div', { className: 'header-inner' });
    var topRow = el('div', { className: 'header-top-row' });

    // Logo — index: switchTab('home'), regulation: link to snuhmate.com
    var logo;
    if (isRegulation) {
      logo = el('a', { className: 'logo', href: 'https://www.snuhmate.com' });
      logo.style.textDecoration = 'none';
      logo.style.color = 'inherit';
    } else {
      logo = el('div', { className: 'logo' });
      logo.style.cursor = 'pointer';
      logo.onclick = function () { if (window.switchTab) switchTab('home'); };
    }
    var img = el('img', { src: 'logo.png', alt: 'SNUH Mate' });
    img.style.cssText = 'width:81px;height:81px;object-fit:contain;flex-shrink:0;border-radius:10px;';
    logo.appendChild(img);
    var logoText = el('div');
    var h1 = el('h1', { className: 'logo-main-title', textContent: '슬기로운 병원 생활 메이트' });
    var sub = el('p', { className: 'logo-sub-title' });
    sub.textContent = '휴가, 시간외/온콜 등의 기록을 직접 관리해보세요.';
    sub.appendChild(el('br'));
    sub.appendChild(document.createTextNode('기록은 이 브라우저에만 저장되서 개발자도 볼 수 없어요!'));
    logoText.appendChild(h1);
    logoText.appendChild(sub);
    logo.appendChild(logoText);
    topRow.appendChild(logo);

    // Header right
    var right = el('div', { className: 'header-right' });

    // Auth container
    var auth = el('div', { id: 'authContainer', className: 'auth-container' });
    auth.style.cssText = 'display:none;align-items:center;gap:8px;';
    var authBtn = el('button', { className: 'btn btn-outline', textContent: '접속 확인 중...' });
    authBtn.style.cssText = 'padding:4px 10px;font-size:var(--text-body-normal);border-color:var(--text-muted);color:var(--text-muted);border-radius:20px;';
    authBtn.onclick = function () { if (window.SupabaseSync) window.SupabaseSync.signInWithGoogle(); };
    auth.appendChild(authBtn);
    right.appendChild(auth);

    // Theme toggle
    var themeBtn = el('button', { className: 'theme-toggle-btn', id: 'themeToggle', title: '테마 전환', textContent: '🎨' });
    themeBtn.onclick = function () { toggleTheme(); };
    right.appendChild(themeBtn);

    // ChannelIO button
    var chatBtn = el('button', { className: 'theme-toggle-btn', title: '피드백 보내기', textContent: '💬' });
    chatBtn.onclick = function () { if (window.ChannelIO) ChannelIO('showMessenger'); };
    right.appendChild(chatBtn);

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

    if (isRegulation) {
      var items = [
        { label: '📅 휴가', href: 'index.html?tab=leave' },
        { label: '⏰ 시간외', href: 'index.html?tab=overtime' },
        { label: '💰 급여', href: 'index.html?tab=payroll' },
        { label: '📖 규정', active: true },
        { label: '👤 info', href: 'index.html?tab=profile' }
      ];
      items.forEach(function (t) {
        var a = el('a', { className: 'nav-tab' + (t.active ? ' active' : ''), textContent: t.label });
        a.style.textDecoration = 'none';
        if (t.href) a.href = t.href;
        else a.style.cursor = 'default';
        footer.appendChild(a);
      });
    } else {
      var tabs = [
        { label: '📅 휴가', tab: 'leave' },
        { label: '⏰ 시간외', tab: 'overtime' },
        { label: '💰 급여', tab: 'payroll' },
        { label: '📖 규정', href: 'regulation.html' },
        { label: '👤 info', tab: 'profile' },
        { label: '📢 피드백', tab: 'feedback', hidden: true }
      ];
      tabs.forEach(function (t) {
        if (t.href) {
          var a = el('a', { className: 'nav-tab', textContent: t.label, href: t.href });
          a.style.textDecoration = 'none';
          footer.appendChild(a);
        } else {
          var btn = el('button', { className: 'nav-tab', textContent: t.label });
          btn.dataset.tab = t.tab;
          if (t.hidden) btn.style.display = 'none';
          footer.appendChild(btn);
        }
      });
    }
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
  renderSharedFooter();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootChannelIO);
  } else {
    bootChannelIO();
  }
})();
