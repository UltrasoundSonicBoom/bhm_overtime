/**
 * Page Bridge Loader — content script에서 주입
 * extensionBridge.js가 이미 로드된 상태에서 extension 메시지를 수신하여 브릿지 호출
 */
(function () {
  'use strict';

  window.addEventListener('message', function (event) {
    if (event.source !== window) return;
    if (!event.data || event.data.source !== 'snuhmate-extension') return;

    var bridge = window.SnuhmateExtensionBridge;
    if (!bridge) return;

    var type = event.data.type;
    var payload = event.data.payload;
    var callId = event.data.callId;

    var resultPromise;
    if (type === 'QUICK_CAPTURE') {
      resultPromise = bridge.quickCapture(payload);
    } else if (type === 'IMPORT_PAYSLIP') {
      resultPromise = bridge.importPayslipPayload(payload);
    } else {
      return;
    }

    Promise.resolve(resultPromise)
      .then(function (result) {
        window.postMessage({
          source: 'snuhmate-page',
          callId: callId,
          result: result
        }, '*');
      })
      .catch(function (err) {
        window.postMessage({
          source: 'snuhmate-page',
          callId: callId,
          result: { ok: false, error: err.message }
        }, '*');
      });
  });
})();
