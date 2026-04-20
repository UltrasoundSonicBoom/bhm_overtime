/**
 * SNUH Mate Companion — Service Worker (Background)
 * 컨텍스트 메뉴, 탭 관리, 메시지 라우팅
 */

// TODO(Task 6): 이 파일은 Task 6에서 완전히 교체됩니다. chrome.tabs API 미사용 예정.

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

// ── PDF 다운로드 감지 → 자동 가져오기 ──
chrome.downloads.onChanged.addListener(function (delta) {
  if (!delta.state || delta.state.current !== 'complete') return;
  chrome.downloads.search({ id: delta.id }, function (items) {
    var item = items && items[0];
    if (!item) return;
    var name = item.finalUrl || item.url || item.filename || '';
    if (!/\.pdf($|\?)/i.test(name) && !/\.pdf$/i.test(item.filename || '')) return;

    var url = item.finalUrl || item.url || '';
    var fileName = (item.filename || 'payslip.pdf').split('/').pop().split('\\').pop();

    // 수동 재시도용 저장
    chrome.storage.local.set({
      lastPdfCandidate: { url: url, filename: item.filename || '', at: Date.now() }
    });

    // 자동 가져오기 시도 (사용자 액션 불필요)
    if (url) autoImportPdf(url, fileName);
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

// ── 자동 PDF 가져오기 (다운로드 감지 시 호출) ──
async function autoImportPdf(url, fileName) {
  try {
    var base64 = await fetchPdfAsBase64(url);
    var tab = await ensureSnuhmateTab('&tab=payroll');

    // 새 탭이면 로딩 대기 — content script + bridge 준비까지 retry
    var result = await sendWithRetry(tab.id, {
      type: 'IMPORT_PAYSLIP',
      payload: { fileName: fileName, mimeType: 'application/pdf', base64: base64 }
    }, 5);

    if (!result || !result.ok) return; // 파싱 실패 = 명세서 아님 → 무시

    var msg = '명세서를 자동으로 가져왔어요.';
    if (result.year && result.month) {
      msg = result.year + '년 ' + result.month + '월 '
        + (result.type || '급여') + ' 명세서를 가져왔어요.';
    }
    chrome.notifications.create({
      type: 'basic', iconUrl: 'icons/icon128.png',
      title: 'SNUH Mate', message: msg
    });
  } catch (e) {
    // 자동 시도 실패는 조용히 무시 (일반 PDF일 수 있음)
  }
}

function sendWithRetry(tabId, message, retries) {
  return new Promise(function (resolve, reject) {
    function attempt(n) {
      chrome.tabs.sendMessage(tabId, message, function (response) {
        if (chrome.runtime.lastError) {
          if (n > 0) {
            setTimeout(function () { attempt(n - 1); }, 2000);
          } else {
            reject(new Error('SNUH Mate 페이지 연결 실패'));
          }
        } else {
          resolve(response);
        }
      });
    }
    attempt(retries || 3);
  });
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
