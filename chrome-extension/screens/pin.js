'use strict';
const PinScreen = {
  render(container, { user, locked, lockedUntil, onUnlock }) {
    const header = document.createElement('div');
    header.className = 'popup-header';
    const ht = document.createElement('span');
    ht.className = 'header-title';
    ht.textContent = locked ? '🔒 계정 잠김' : '🔒 잠금 해제';
    header.appendChild(ht);
    container.appendChild(header);

    const screen = document.createElement('div');
    screen.className = 'pin-screen';

    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'font-size:12px;color:#6b7280;margin-bottom:4px';
    nameEl.textContent = user.name;
    screen.appendChild(nameEl);

    if (locked) {
      const lockMsg = document.createElement('div');
      lockMsg.style.cssText = 'color:#dc2626;font-size:12px;margin-bottom:6px';
      lockMsg.textContent = '🔴 잠김 — ' + new Date(lockedUntil).toLocaleTimeString('ko-KR') + ' 이후 재시도';
      screen.appendChild(lockMsg);
    }

    const dotsEl = document.createElement('div');
    dotsEl.className = 'pin-dots';
    screen.appendChild(dotsEl);

    const errorEl = document.createElement('div');
    errorEl.className = 'status-msg err';
    errorEl.style.marginBottom = '8px';
    screen.appendChild(errorEl);

    let entered = '';

    function refreshDots() {
      dotsEl.innerHTML = '';
      for (let i = 0; i < 4; i++) {
        const d = document.createElement('div');
        d.className = 'pin-dot' + (i < entered.length ? ' on' : '');
        dotsEl.appendChild(d);
      }
    }
    refreshDots();

    if (!locked) {
      const grid = document.createElement('div');
      grid.className = 'pin-grid';
      [1,2,3,4,5,6,7,8,9].forEach(function(n) {
        const k = document.createElement('button');
        k.className = 'pin-key';
        k.textContent = n;
        k.dataset.n = n;
        grid.appendChild(k);
      });
      const cancel = document.createElement('button');
      cancel.className = 'pin-key sm'; cancel.textContent = '취소'; cancel.id = 'pinCancel';
      const zero = document.createElement('button');
      zero.className = 'pin-key'; zero.textContent = '0'; zero.dataset.n = '0';
      const back = document.createElement('button');
      back.className = 'pin-key sm'; back.textContent = '←'; back.id = 'pinBack';
      grid.appendChild(cancel); grid.appendChild(zero); grid.appendChild(back);

      grid.addEventListener('click', async function(e) {
        var n = e.target.dataset.n;
        if (e.target.id === 'pinBack')   { entered = entered.slice(0,-1); refreshDots(); return; }
        if (e.target.id === 'pinCancel') { entered = ''; refreshDots(); return; }
        if (n !== undefined && entered.length < 4) {
          entered += n; refreshDots();
          if (entered.length === 4) {
            const result = await BhmAuth.verifyPin(entered, BhmStorage);
            if (result.ok) { onUnlock(); return; }
            errorEl.textContent = result.locked ? '5회 오류 → 1시간 잠금' : 'PIN 오류 (' + result.attempts + '/5)';
            entered = ''; refreshDots();
          }
        }
      });
      screen.appendChild(grid);
    }

    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:11px;color:#9ca3af;margin-top:8px';
    hint.textContent = locked ? '' : '30분 비활성 시 자동 잠금 · 오류 5회 시 1시간 잠금';
    screen.appendChild(hint);
    container.appendChild(screen);
  },
};
