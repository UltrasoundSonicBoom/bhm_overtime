/**
 * SNUH Mate Companion — Service Worker (Background)
 * 컨텍스트 메뉴, 탭 관리, 메시지 라우팅
 */

// ── 설치 시 컨텍스트 메뉴 등록 ──
chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    id: 'import-pdf-link',
    title: 'SNUH Mate로 PDF 가져오기',
    contexts: ['link'],
    targetUrlPatterns: ['*://*/*.pdf', '*://*/*.pdf?*']
  });
});

// ── SNUH Mate 탭 찾기 / 생성 ──
async function ensureSnuhmateTab(queryParams) {
  var tabs = await chrome.tabs.query({
    url: ['https://snuhmate.com/*', 'https://www.snuhmate.com/*']
  });
  if (tabs.length) return tabs[0];
  return chrome.tabs.create({
    url: 'https://snuhmate.com/index.html?app=1&ext=1' + (queryParams || ''),
    active: false
  });
}

// ── PDF 다운로드 추적 ──
chrome.downloads.onChanged.addListener(function (delta) {
  if (!delta.state || delta.state.current !== 'complete') return;
  chrome.downloads.search({ id: delta.id }, function (items) {
    var item = items && items[0];
    if (!item) return;
    var name = item.finalUrl || item.url || item.filename || '';
    if (!/\.pdf($|\?)/i.test(name)) return;
    chrome.storage.local.set({
      lastPdfCandidate: {
        url: item.finalUrl || item.url || '',
        filename: item.filename || '',
        at: Date.now()
      }
    });
  });
});

// ── 컨텍스트 메뉴 클릭 ──
chrome.contextMenus.onClicked.addListener(function (info) {
  if (info.menuItemId !== 'import-pdf-link') return;
  chrome.storage.local.set({
    lastPdfCandidate: {
      url: info.linkUrl,
      filename: '',
      at: Date.now()
    }
  });
  // 바로 가져오기 시도
  fetchAndDeliverPdf(info.linkUrl, 'payslip.pdf');
});

// ── PDF 가져오기 헬퍼 ──
async function fetchPdfAsBase64(url) {
  var response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error('PDF 다운로드 실패: ' + response.status);
  var buffer = await response.arrayBuffer();
  var bytes = new Uint8Array(buffer);
  var binary = '';
  for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function ensureVisiblePayrollTab() {
  var tab = await ensureSnuhmateTab('&tab=payroll');
  await chrome.tabs.update(tab.id, { active: true });
  return tab;
}

async function fetchAndDeliverPdf(url, fileName) {
  try {
    var base64 = await fetchPdfAsBase64(url);
    var tab = await ensureVisiblePayrollTab();
    chrome.tabs.sendMessage(tab.id, {
      type: 'IMPORT_PAYSLIP',
      payload: {
        fileName: fileName,
        mimeType: 'application/pdf',
        base64: base64
      }
    });
  } catch (err) {
    chrome.notifications.create({
      type: 'basic',
      title: 'SNUH Mate',
      message: 'PDF 가져오기 실패: ' + err.message
    });
  }
}

// ── 메시지 핸들러 ──
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.type === 'QUICK_CAPTURE') {
    ensureSnuhmateTab('&tab=overtime').then(function (tab) {
      chrome.tabs.sendMessage(tab.id, msg, function (response) {
        sendResponse(response || { ok: true });
      });
    }).catch(function (err) {
      sendResponse({ ok: false, error: err.message });
    });
    return true;
  }

  if (msg.type === 'IMPORT_PAYSLIP_FROM_URL') {
    var payload = msg.payload || {};
    fetchPdfAsBase64(payload.url)
      .then(function (base64) {
        return ensureVisiblePayrollTab().then(function (tab) {
          return chrome.tabs.sendMessage(tab.id, {
            type: 'IMPORT_PAYSLIP',
            payload: {
              fileName: payload.fileName || 'payslip.pdf',
              mimeType: 'application/pdf',
              base64: base64
            }
          });
        });
      })
      .then(function (response) {
        sendResponse(response || { ok: true });
      })
      .catch(function (err) {
        sendResponse({ ok: false, error: err.message });
      });
    return true;
  }

  if (msg.type === 'RPC_RESULT') {
    if (msg.payload && msg.payload.ok === false) {
      chrome.notifications.create({
        type: 'basic',
        title: 'SNUH Mate',
        message: msg.payload.error || '작업 실패'
      });
    }
  }
});
