'use strict';
const PinSetupScreen = {
  // Set by render(); called externally by popup.js when Drive restores an existing PIN.
  // Nulled at render start to prevent stale closure from previous session.
  _advance: null,

  render(container, { user, onComplete }) {
    let cancelled = false;
    PinSetupScreen._advance = null; // clear previous session's closure

    PinSetupScreen._advance = function() {
      if (cancelled) return;
      cancelled = true;
      onComplete();
    };

    const header = document.createElement('div');
    header.className = 'popup-header';
    const ht = document.createElement('span');
    ht.className = 'header-title';
    ht.textContent = 'SNUH Mate';
    header.appendChild(ht);
    container.appendChild(header);

    const body = document.createElement('div');
    body.className = 'pin-screen';

    const greeting = document.createElement('div');
    greeting.style.cssText = 'font-size:13px;font-weight:700;margin-bottom:4px';
    greeting.textContent = (user.name || '사용자') + '님, 환영합니다!';
    body.appendChild(greeting);

    const desc = document.createElement('div');
    desc.style.cssText = 'font-size:11px;color:#6b7280;margin-bottom:10px;line-height:1.6';
    desc.textContent = '급여·근무 기록은 민감한 정보예요. PIN 4자리를 설정하면 나만 볼 수 있어요.';
    body.appendChild(desc);

    const stepLabel = document.createElement('div');
    stepLabel.style.cssText = 'font-size:12px;color:#374151;font-weight:600;margin-bottom:6px';
    stepLabel.textContent = '새 PIN 입력';
    body.appendChild(stepLabel);

    const dotsEl = document.createElement('div');
    dotsEl.className = 'pin-dots';
    body.appendChild(dotsEl);

    const errorEl = document.createElement('div');
    errorEl.className = 'status-msg err';
    errorEl.style.marginBottom = '8px';
    body.appendChild(errorEl);

    let step = 1;
    let firstPin = '';
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

    const grid = document.createElement('div');
    grid.className = 'pin-grid';
    [1,2,3,4,5,6,7,8,9].forEach(function(n) {
      const k = document.createElement('button');
      k.className = 'pin-key'; k.textContent = n; k.dataset.n = String(n);
      grid.appendChild(k);
    });
    const skipBtn = document.createElement('button');
    skipBtn.className = 'pin-key sm'; skipBtn.textContent = '나중에'; skipBtn.dataset.action = 'skip';
    const zeroBtn = document.createElement('button');
    zeroBtn.className = 'pin-key'; zeroBtn.textContent = '0'; zeroBtn.dataset.n = '0';
    const backBtn = document.createElement('button');
    backBtn.className = 'pin-key sm'; backBtn.textContent = '←'; backBtn.dataset.action = 'back';
    grid.appendChild(skipBtn); grid.appendChild(zeroBtn); grid.appendChild(backBtn);
    body.appendChild(grid);
    container.appendChild(body);

    grid.addEventListener('click', async function(e) {
      if (cancelled) return;
      const action = e.target.dataset.action;
      const n = e.target.dataset.n;
      if (action === 'skip') { cancelled = true; onComplete(); return; }
      if (action === 'back') { entered = entered.slice(0, -1); refreshDots(); return; }
      if (n !== undefined && entered.length < 4) {
        entered += n;
        refreshDots();
      }
      if (entered.length < 4) return;
      if (step === 1) {
        firstPin = entered; entered = '';
        step = 2;
        stepLabel.textContent = 'PIN 확인 (한 번 더)';
        errorEl.textContent = '';
        refreshDots();
        return;
      }
      if (entered !== firstPin) {
        errorEl.textContent = 'PIN이 일치하지 않아요. 처음부터 다시 입력해주세요.';
        entered = ''; firstPin = ''; step = 1;
        stepLabel.textContent = '새 PIN 입력';
        refreshDots();
        return;
      }
      grid.style.pointerEvents = 'none';
      try {
        await BhmAuth.setPin(entered, BhmStorage);
        chrome.runtime.sendMessage({ type: 'SYNC_NOW' }, function() {
          if (chrome.runtime.lastError) { /* 비동기 동기화 실패 무시 */ }
        });
        cancelled = true;
        onComplete();
      } catch (_) {
        errorEl.textContent = 'PIN 저장 실패. 다시 시도해주세요.';
        entered = ''; firstPin = ''; step = 1;
        stepLabel.textContent = '새 PIN 입력';
        refreshDots();
        grid.style.pointerEvents = '';
      }
    });
  },
};
