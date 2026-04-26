/**
 * SNUH Mate Companion — Content Script
 * Extension world ↔ Page world 메시지 릴레이
 * snuhmate.com 에서만 실행됨 (manifest content_scripts.matches)
 */

// 페이지에 브릿지 준비 알림
window.postMessage({ source: 'snuhmate-extension', type: 'PAGE_READY' }, '*');

// ── Extension → Page 릴레이 ──
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.type === 'QUICK_CAPTURE' || msg.type === 'IMPORT_PAYSLIP') {
    // 고유 ID로 응답 매칭
    var callId = 'rpc_' + Date.now() + '_' + Math.random().toString(36).slice(2);

    function onResult(event) {
      if (event.source !== window) return;
      if (!event.data || event.data.source !== 'snuhmate-page') return;
      if (event.data.callId !== callId) return;
      window.removeEventListener('message', onResult);
      sendResponse(event.data.result || { ok: true });
    }

    window.addEventListener('message', onResult);
    window.postMessage({
      source: 'snuhmate-extension',
      type: msg.type,
      payload: msg.payload,
      callId: callId
    }, '*');

    // 10초 타임아웃
    setTimeout(function () {
      window.removeEventListener('message', onResult);
    }, 10000);

    return true; // async response
  }
});

// ── Page → Extension 릴레이 ──
window.addEventListener('message', function (event) {
  if (event.source !== window) return;
  if (!event.data || event.data.source !== 'snuhmate-page') return;
  if (event.data.type === 'BRIDGE_READY') {
    chrome.runtime.sendMessage({ type: 'BRIDGE_READY' });
  }
});
