'use strict';
(async function init() {
  try {
    const d    = await BhmStorage.get([BhmStorage.KEYS.USER]);
    const user = d[BhmStorage.KEYS.USER];
    if (!user) {
      showView('login');
      LoginScreen.render(document.getElementById('view-login'), { onLogin: handleLogin });
      return;
    }
    const lock = await BhmAuth.checkLockState(BhmStorage);
    if (lock.status === 'no_pin') {
      showView('pin-setup');
      PinSetupScreen.render(document.getElementById('view-pin-setup'), {
        user,
        onComplete: function() { showView('main'); initMainApp(user); },
      });
      return;
    }
    if (lock.status === 'locked') {
      showView('pin');
      PinScreen.render(document.getElementById('view-pin'), {
        user, locked: true, lockedUntil: lock.lockedUntil,
        onUnlock: function() { showView('main'); initMainApp(user); },
      });
      return;
    }
    if (lock.status === 'requires_pin') {
      showView('pin');
      PinScreen.render(document.getElementById('view-pin'), {
        user,
        onUnlock: function() { showView('main'); initMainApp(user); },
      });
      return;
    }
    showView('main');
    initMainApp(user);
  } catch (e) { console.error('[BHM] init', e); }
})();

function showView(name) {
  document.querySelectorAll('.view').forEach(v => { v.hidden = true; });
  document.getElementById('view-' + name).hidden = false;
}

async function handleLogin(user) {
  await BhmStorage.set({ [BhmStorage.KEYS.USER]: user });

  // 즉시 PIN 설정 화면 표시 (서비스워커 응답 대기 없음 — 이중로그인 버튼 버그 수정)
  showView('pin-setup');
  PinSetupScreen.render(document.getElementById('view-pin-setup'), {
    user,
    onComplete: function() { showView('main'); initMainApp(user); },
  });

  // 백그라운드 Drive 동기화: PIN 복원되면 설정 화면 자동 닫기
  // _advance는 이 render() 호출에 대해서만 유효. 팝업은 session당 한 번만 handleLogin에 도달.
  chrome.runtime.sendMessage({ type: 'PULL_NOW' }, async function() {
    if (chrome.runtime.lastError) {
      console.warn('[BHM] PULL_NOW failed:', chrome.runtime.lastError.message);
      return;
    }
    if (!PinSetupScreen._advance) return; // 팝업이 이미 닫힘
    const lock = await BhmAuth.checkLockState(BhmStorage);
    if (lock.status !== 'no_pin' && PinSetupScreen._advance) {
      PinSetupScreen._advance();
    }
  });
}

function renderUserBtn(user) {
  var wrap = document.getElementById('user-btn');
  if (!wrap || !user) return;

  var btn = document.createElement('button');
  btn.style.cssText = 'width:26px;height:26px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.4);cursor:pointer;padding:0;overflow:hidden;background:#3b82f6;font-size:11px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0';
  btn.title = (user.name || '') + ' (' + (user.email || '') + ')';
  if (user.picture) {
    var img = document.createElement('img');
    img.src = user.picture;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover';
    img.onerror = function() { btn.textContent = (user.name || '?')[0]; };
    btn.appendChild(img);
  } else {
    btn.textContent = (user.name || '?')[0];
  }

  var dropdown = document.createElement('div');
  dropdown.hidden = true;
  dropdown.style.cssText = 'position:absolute;right:0;top:32px;background:#fff;border:1.5px solid #e5e7eb;border-radius:8px;padding:10px 12px;min-width:170px;z-index:200;box-shadow:0 4px 16px rgba(0,0,0,0.12)';
  var nameEl = document.createElement('div');
  nameEl.style.cssText = 'font-weight:700;font-size:12px;color:#111827;margin-bottom:2px';
  nameEl.textContent = user.name || '';
  var emailEl = document.createElement('div');
  emailEl.style.cssText = 'font-size:10px;color:#6b7280;margin-bottom:10px;word-break:break-all';
  emailEl.textContent = user.email || '';
  var logoutBtn = document.createElement('button');
  logoutBtn.style.cssText = 'width:100%;padding:5px 8px;background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer';
  logoutBtn.textContent = '로그아웃';
  logoutBtn.onclick = function(e) {
    e.stopPropagation();
    if (confirm('로그아웃하면 로컬 데이터가 삭제됩니다. 계속하시겠습니까?')) {
      BhmAuth.signOut(BhmStorage).then(function() { location.reload(); });
    }
  };
  dropdown.appendChild(nameEl); dropdown.appendChild(emailEl); dropdown.appendChild(logoutBtn);

  btn.onclick = function(e) {
    e.stopPropagation();
    dropdown.hidden = !dropdown.hidden;
    if (!dropdown.hidden) {
      function outside(ev) {
        if (!wrap.contains(ev.target)) { dropdown.hidden = true; document.removeEventListener('click', outside); }
      }
      document.addEventListener('click', outside);
    }
  };

  wrap.appendChild(btn); wrap.appendChild(dropdown);
}

function initMainApp(user, defaultTab) {
  defaultTab = defaultTab || 'overtime';
  renderUserBtn(user);
  if (!initMainApp._listenersAdded) {
    document.getElementById('popup-tabs').addEventListener('click', function(e) {
      var btn = e.target.closest('.tab-btn');
      if (btn) switchTab(btn.dataset.tab);
    });
    initMainApp._listenersAdded = true;
  }
  OvertimeScreen.render(document.getElementById('tab-overtime'), { user });
  LeaveScreen.render(document.getElementById('tab-leave'),       { user });
  PdfScreen.render(document.getElementById('tab-pdf'),           { user });
  SettingsScreen.render(document.getElementById('tab-settings'), {
    user,
    onSignOut: function() { BhmAuth.signOut(BhmStorage).then(function() { location.reload(); }); },
  });
  switchTab(defaultTab);
  updateSyncBadge();
}

function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.tab === name); });
  document.querySelectorAll('.tab-content').forEach(function(c) { c.hidden = c.id !== 'tab-' + name; });
}

async function updateSyncBadge() {
  var badge = document.getElementById('sync-badge');
  var d     = await BhmStorage.get([BhmStorage.KEYS.DRIVE_SYNC_AT]);
  var at    = d[BhmStorage.KEYS.DRIVE_SYNC_AT];
  if (!at) { badge.textContent = '미동기화'; return; }
  var mins = Math.floor((Date.now() - new Date(at).getTime()) / 60000);
  badge.textContent = mins < 1 ? '방금 동기화' : mins + '분 전 동기화';
  badge.classList.remove('fail');
  badge.classList.add('ok');
}
