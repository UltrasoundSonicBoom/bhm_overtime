// share-utils.js — QR 공유 모달
var _qrLibLoaded = false;
function _loadQrLib(cb) {
  if (_qrLibLoaded && window.QRCode) { cb(false); return; }
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
  s.onload = function () { _qrLibLoaded = true; cb(false); };
  s.onerror = function () { cb(true); };
  document.head.appendChild(s);
}

function shareApp() {
  var url = 'https://www.snuhmate.com';
  var text = '서울대병원 동료가 만든 급여·휴가 관리 도구. ' + url;
  if (navigator.share) {
    navigator.share({ title: 'SNUH 메이트', text: text, url: url })
      .catch(function () { _showShareModal(url, text); });
  } else {
    _showShareModal(url, text);
  }
}

function _showShareModal(url, shareText) {
  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.5);' +
    'display:flex;align-items:center;justify-content:center;padding:16px;';

  var box = document.createElement('div');
  box.style.cssText = 'background:var(--bg-card,#fff);border-radius:16px;padding:24px 20px;' +
    'max-width:320px;width:100%;text-align:center;';

  var heading = document.createElement('p');
  heading.textContent = 'QR 코드로 공유하기';
  heading.style.cssText = 'font-size:1rem;font-weight:600;margin:0 0 4px;color:var(--text-primary,#111);';

  var sub = document.createElement('p');
  sub.textContent = '카메라로 스캔하거나 링크를 복사하세요';
  sub.style.cssText = 'font-size:0.8rem;color:var(--text-muted);margin:0 0 16px;';

  var qrWrap = document.createElement('div');
  qrWrap.style.cssText = 'display:flex;justify-content:center;margin-bottom:16px;min-height:160px;align-items:center;';
  var canvas = document.createElement('canvas');
  qrWrap.appendChild(canvas);

  var urlRow = document.createElement('div');
  urlRow.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:12px;';
  var urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.value = url;
  urlInput.readOnly = true;
  urlInput.style.cssText = 'flex:1;font-size:0.8rem;padding:6px 10px;' +
    'border:1px solid var(--border-glass,#ddd);border-radius:8px;background:#f9f9f9;';
  var copyBtn = document.createElement('button');
  copyBtn.textContent = '복사';
  copyBtn.className = 'btn btn-primary';
  copyBtn.style.cssText = 'padding:6px 14px;font-size:0.8rem;white-space:nowrap;';
  copyBtn.onclick = function () {
    var doCopy = function () {
      copyBtn.textContent = '✅ 복사됨';
      setTimeout(function () { copyBtn.textContent = '복사'; }, 1500);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(doCopy).catch(function () {
        urlInput.select(); document.execCommand('copy'); doCopy();
      });
    } else {
      urlInput.select(); document.execCommand('copy'); doCopy();
    }
  };
  urlRow.appendChild(urlInput);
  urlRow.appendChild(copyBtn);

  var closeBtn = document.createElement('button');
  closeBtn.textContent = '닫기';
  closeBtn.style.cssText = 'width:100%;padding:8px;border:none;background:none;' +
    'color:var(--text-muted);font-size:0.85rem;cursor:pointer;margin-top:4px;';
  var dismiss = function () { if (modal.parentNode) modal.parentNode.removeChild(modal); };
  closeBtn.onclick = dismiss;

  box.appendChild(heading);
  box.appendChild(sub);
  box.appendChild(qrWrap);
  box.appendChild(urlRow);
  box.appendChild(closeBtn);
  modal.appendChild(box);
  modal.onclick = function (e) { if (e.target === modal) dismiss(); };
  document.body.appendChild(modal);

  _loadQrLib(function (err) {
    if (!err && window.QRCode) {
      QRCode.toCanvas(canvas, url, { width: 160, margin: 1 }, function () { });
    } else {
      var errMsg = document.createElement('p');
      errMsg.textContent = 'QR 로드 실패 — 위 링크를 복사해 사용하세요';
      errMsg.style.cssText = 'font-size:0.8rem;color:var(--text-muted);padding:20px 0;';
      qrWrap.removeChild(canvas);
      qrWrap.appendChild(errMsg);
    }
  });
}

function _showShareToast(msg) {
  var t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);' +
    'background:rgba(0,0,0,0.75);color:#fff;padding:10px 18px;border-radius:20px;' +
    'font-size:0.875rem;z-index:99999;pointer-events:none;';
  document.body.appendChild(t);
  setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2500);
}

function _showShareFallback(text) {
  _showShareModal('https://www.snuhmate.com', text);
}

// Phase 2-F: ESM marker — 파일을 ES module 로 표시 (side-effect IIFE 보존)

// Phase 2-regression: inline onclick window 노출 (ESM 모듈 스코프 회복)


export {};
