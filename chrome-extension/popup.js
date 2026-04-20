'use strict';
(async function init() {
  try {
    const d    = await BhmStorage.get([BhmStorage.KEYS.USER]);
    const user = d[BhmStorage.KEYS.USER];
    if (!user) { showView('login'); LoginScreen.render(document.getElementById('view-login'), { onLogin: handleLogin }); return; }
    const lock = await BhmAuth.checkLockState(BhmStorage);
    if (lock.status === 'no_pin')       { showView('main'); initMainApp(user, 'settings'); return; }
    if (lock.status === 'locked')       { showView('pin');  PinScreen.render(document.getElementById('view-pin'), { user, locked: true, lockedUntil: lock.lockedUntil, onUnlock: () => { showView('main'); initMainApp(user); } }); return; }
    if (lock.status === 'requires_pin') { showView('pin');  PinScreen.render(document.getElementById('view-pin'), { user, onUnlock: () => { showView('main'); initMainApp(user); } }); return; }
    showView('main'); initMainApp(user);
  } catch (e) { console.error('[BHM] init', e); }
})();

function showView(name) {
  document.querySelectorAll('.view').forEach(v => { v.hidden = true; });
  document.getElementById('view-' + name).hidden = false;
}

async function handleLogin(user) {
  await BhmStorage.set({ [BhmStorage.KEYS.USER]: user });
  chrome.runtime.sendMessage({ type: 'PULL_NOW' }, () => { showView('main'); initMainApp(user, 'settings'); });
}

function initMainApp(user, defaultTab) {
  defaultTab = defaultTab || 'overtime';
  document.getElementById('popup-tabs').addEventListener('click', function(e) {
    var btn = e.target.closest('.tab-btn');
    if (btn) switchTab(btn.dataset.tab);
  });
  OvertimeScreen.render(document.getElementById('tab-overtime'), { user });
  LeaveScreen.render(document.getElementById('tab-leave'),       { user });
  PdfScreen.render(document.getElementById('tab-pdf'),           { user });
  SettingsScreen.render(document.getElementById('tab-settings'), { user, onSignOut: function() { BhmAuth.signOut(BhmStorage).then(function() { location.reload(); }); } });
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
  badge.className = 'sync-badge ok';
}
