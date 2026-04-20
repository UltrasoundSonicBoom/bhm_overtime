'use strict';
importScripts('shared/storage.js', 'shared/auth.js', 'shared/drive.js');

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SYNC_NOW') {
    _syncNow().then(() => sendResponse({ ok: true })).catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === 'PULL_NOW') {
    _pullNow().then(() => sendResponse({ ok: true })).catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }
});

async function _syncNow() {
  try {
    const token = await BhmAuth.getToken(false);
    await BhmDrive.pushAll(BhmStorage, token);
  } catch (e) { console.warn('[BHM] sync failed:', e.message); }
}
async function _pullNow() {
  try {
    const token = await BhmAuth.getToken(false);
    await BhmDrive.pullAll(BhmStorage, token);
  } catch (e) { console.warn('[BHM] pull failed:', e.message); }
}

// PDF 자동 감지
chrome.downloads.onChanged.addListener(async (delta) => {
  if (!delta.state || delta.state.current !== 'complete') return;
  const [item] = await chrome.downloads.search({ id: delta.id });
  if (!item || !item.filename.toLowerCase().endsWith('.pdf')) return;
  try {
    const resp = await fetch(item.url);
    const buf  = await resp.arrayBuffer();
    const b64  = btoa(String.fromCharCode(...new Uint8Array(buf)));
    await BhmStorage.set({
      bhm_last_pdf: {
        fileName:   item.filename.split(/[\\/]/).pop(),
        base64:     b64,
        detectedAt: Date.now(),
      },
    });
  } catch (e) { console.warn('[BHM] PDF cache failed:', e.message); }
});
