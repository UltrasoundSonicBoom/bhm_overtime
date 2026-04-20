# Chrome Extension Standalone v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 companion 방식(snuhmate.com 의존)을 독립형 크롬 확장 팝업으로 전환 — 시간외·휴가·PDF 3탭 + PIN 잠금 + Google Drive 직접 동기화

**Architecture:** popup.html이 아이콘 클릭 시 드롭다운 팝업으로 열린다. chrome.storage.local에 데이터를 저장하고 background service worker가 Drive API를 직접 호출해 동기화한다. snuhmate.com 탭이 없어도 독립 동작한다.

**Tech Stack:** Chrome Extension MV3, chrome.identity (Google OAuth), chrome.storage.local, Google Drive REST API v3, Vanilla JS (no framework)

**Worktree:** `.worktrees/ext-standalone` (branch: `feat/ext-standalone`)

**Security:** 사용자 입력값은 반드시 `esc()` 헬퍼로 이스케이프 후 innerHTML 사용. 정적 HTML 템플릿은 esc 불필요.

---

## File Map

| 파일 | 상태 | 역할 |
|------|------|------|
| `chrome-extension/manifest.json` | **수정** | identity 권한 추가, content_scripts 제거 |
| `chrome-extension/shared/esc.js` | **신규** | XSS 방지 HTML escape 헬퍼 |
| `chrome-extension/shared/storage.js` | **신규** | chrome.storage.local CRUD 래퍼 |
| `chrome-extension/shared/auth.js` | **신규** | Google identity + PIN 잠금 로직 |
| `chrome-extension/shared/drive.js` | **신규** | Drive REST API 호출 |
| `chrome-extension/shared/overtime-calc.js` | **신규** | 시간외 계산 엔진 |
| `chrome-extension/shared/leave-calc.js` | **신규** | 휴가 계산 엔진 |
| `chrome-extension/background.js` | **교체** | Drive 동기화 + PDF 감지 |
| `chrome-extension/popup.html` | **교체** | 팝업 쉘 |
| `chrome-extension/popup.css` | **교체** | 전체 UI 스타일 |
| `chrome-extension/popup.js` | **교체** | 팝업 진입점 + 탭 라우터 |
| `chrome-extension/screens/login.js` | **신규** | 로그인 화면 |
| `chrome-extension/screens/pin.js` | **신규** | PIN 잠금 화면 |
| `chrome-extension/screens/overtime.js` | **신규** | 시간외 탭 |
| `chrome-extension/screens/leave.js` | **신규** | 휴가 탭 |
| `chrome-extension/screens/pdf.js` | **신규** | PDF 탭 |
| `chrome-extension/screens/settings.js` | **신규** | 설정 탭 |
| `chrome-extension/tests/calc.test.js` | **신규** | 계산 엔진 단위 테스트 |
| `chrome-extension/tests/auth.test.js` | **신규** | PIN 로직 단위 테스트 |
| `chrome-extension/content-script.js` | **삭제** | standalone이므로 불필요 |
| `chrome-extension/page-bridge-loader.js` | **삭제** | 동일 |

---

## Task 1: Manifest + 구조 정리

**Files:**
- Modify: `chrome-extension/manifest.json`
- Delete: `chrome-extension/content-script.js`, `page-bridge-loader.js`
- Create dirs: `chrome-extension/shared/`, `chrome-extension/screens/`, `chrome-extension/tests/`

- [ ] **Step 1: manifest.json 교체**

```json
{
  "manifest_version": 3,
  "name": "SNUH Mate",
  "version": "1.0.0",
  "description": "시간외·휴가·급여명세서 기록 — snuhmate.com 없이 바로 사용",
  "icons": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" },
  "action": {
    "default_popup": "popup.html",
    "default_title": "SNUH Mate",
    "default_icon": { "16": "icons/icon16.png", "48": "icons/icon48.png" }
  },
  "background": { "service_worker": "background.js" },
  "permissions": ["identity", "storage", "downloads", "contextMenus", "notifications"],
  "host_permissions": ["https://www.googleapis.com/*"],
  "options_ui": { "page": "options.html", "open_in_tab": false },
  "oauth2": {
    "client_id": "__REPLACE_WITH_GCP_CLIENT_ID__",
    "scopes": [
      "https://www.googleapis.com/auth/drive.appdata",
      "https://www.googleapis.com/auth/drive.file",
      "openid", "email", "profile"
    ]
  }
}
```

- [ ] **Step 2: 파일 삭제 + 디렉터리 생성**

```bash
cd .worktrees/ext-standalone/chrome-extension
rm content-script.js page-bridge-loader.js
mkdir -p shared screens tests
```

- [ ] **Step 3: Commit**

```bash
git add chrome-extension/manifest.json
git rm chrome-extension/content-script.js chrome-extension/page-bridge-loader.js
git commit -m "feat(ext): manifest v2 — identity 권한, companion 파일 제거"
```

---

## Task 2: XSS 방지 헬퍼 + Storage 모듈

**Files:**
- Create: `chrome-extension/shared/esc.js`
- Create: `chrome-extension/shared/storage.js`

- [ ] **Step 1: esc.js 작성**

```javascript
// chrome-extension/shared/esc.js
'use strict';
// 사용자 데이터를 innerHTML에 삽입할 때 반드시 esc() 사용
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

- [ ] **Step 2: storage.js 작성**

```javascript
// chrome-extension/shared/storage.js
'use strict';
const BhmStorage = {
  KEYS: {
    USER:             'bhm_user',
    PIN_HASH:         'bhm_pin_hash',
    PIN_ATTEMPTS:     'bhm_pin_attempts',
    PIN_LOCKED_UNTIL: 'bhm_pin_locked_until',
    PIN_UNLOCKED_AT:  'bhm_pin_unlocked_at',
    OVERTIME:         'bhm_overtime_records',
    LEAVE:            'bhm_leave_records',
    PROFILE:          'bhm_profile',
    DRIVE_SYNC_AT:    'bhm_drive_sync_at',
  },
  get(keys)    { return new Promise(r => chrome.storage.local.get(keys, r)); },
  set(items)   { return new Promise(r => chrome.storage.local.set(items, r)); },
  remove(keys) { return new Promise(r => chrome.storage.local.remove(keys, r)); },
  payslipKey(year, month) {
    return 'bhm_payslip_' + year + '_' + String(month).padStart(2, '0');
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add chrome-extension/shared/esc.js chrome-extension/shared/storage.js
git commit -m "feat(ext): esc() XSS 헬퍼 + BhmStorage 래퍼"
```

---

## Task 3: Auth + PIN 모듈 (TDD)

**Files:**
- Create: `chrome-extension/shared/auth.js`
- Create: `chrome-extension/tests/auth.test.js`

- [ ] **Step 1: auth.test.js 작성**

```javascript
// chrome-extension/tests/auth.test.js
// 실행: node chrome-extension/tests/auth.test.js
if (typeof crypto === 'undefined') global.crypto = require('crypto').webcrypto;
const { BhmAuth } = require('../shared/auth.js');
let p = 0, f = 0;
const ok  = (c, m) => c ? (console.log('  PASS', m), p++) : (console.error('  FAIL', m), f++);

async function run() {
  const h1 = await BhmAuth.hashPin('1234');
  ok(h1.length === 64,         'hashPin → 64자리 hex');
  ok(h1 === await BhmAuth.hashPin('1234'), 'hashPin 결정적');
  ok(h1 !== await BhmAuth.hashPin('5678'), '다른 PIN → 다른 해시');

  ok(BhmAuth._isLockExpired(null)                === true,  'null → 잠금 없음');
  ok(BhmAuth._isLockExpired(Date.now() - 1000)   === true,  '과거 → 만료됨');
  ok(BhmAuth._isLockExpired(Date.now() + 60000)  === false, '미래 → 잠금 중');

  ok(BhmAuth._isAutoLocked(null)                 === true,  '기록 없음 → 자동 잠금');
  ok(BhmAuth._isAutoLocked(Date.now() - 1800001) === true,  '31분 전 → 자동 잠금');
  ok(BhmAuth._isAutoLocked(Date.now() - 1799000) === false, '29분 전 → 정상');

  console.log(p + ' passed, ' + f + ' failed');
  process.exit(f > 0 ? 1 : 0);
}
run();
```

- [ ] **Step 2: 실패 확인**

```bash
node chrome-extension/tests/auth.test.js
# Expected: Cannot find module '../shared/auth.js'
```

- [ ] **Step 3: auth.js 작성**

```javascript
// chrome-extension/shared/auth.js
'use strict';
const BhmAuth = {
  AUTO_LOCK_MS:  30 * 60 * 1000,
  LOCK_DURATION: 60 * 60 * 1000,
  MAX_ATTEMPTS:  5,

  async hashPin(pin) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  _isLockExpired(ms)    { return ms == null || Date.now() > ms; },
  _isAutoLocked(ms)     { return ms == null || Date.now() - ms > BhmAuth.AUTO_LOCK_MS; },

  async checkLockState(storage) {
    const d = await storage.get([
      storage.KEYS.PIN_HASH, storage.KEYS.PIN_LOCKED_UNTIL, storage.KEYS.PIN_UNLOCKED_AT,
    ]);
    if (!d[storage.KEYS.PIN_HASH]) return { status: 'no_pin' };
    const lu = d[storage.KEYS.PIN_LOCKED_UNTIL] || null;
    if (!BhmAuth._isLockExpired(lu)) return { status: 'locked', lockedUntil: lu };
    if (BhmAuth._isAutoLocked(d[storage.KEYS.PIN_UNLOCKED_AT] || null)) return { status: 'requires_pin' };
    return { status: 'unlocked' };
  },

  async verifyPin(pin, storage) {
    const d = await storage.get([storage.KEYS.PIN_HASH, storage.KEYS.PIN_ATTEMPTS]);
    if (!d[storage.KEYS.PIN_HASH]) return { ok: false, error: 'no_pin' };
    const hash = await BhmAuth.hashPin(pin);
    if (hash !== d[storage.KEYS.PIN_HASH]) {
      const attempts = (d[storage.KEYS.PIN_ATTEMPTS] || 0) + 1;
      const update = { [storage.KEYS.PIN_ATTEMPTS]: attempts };
      if (attempts >= BhmAuth.MAX_ATTEMPTS)
        update[storage.KEYS.PIN_LOCKED_UNTIL] = Date.now() + BhmAuth.LOCK_DURATION;
      await storage.set(update);
      return { ok: false, attempts, locked: attempts >= BhmAuth.MAX_ATTEMPTS };
    }
    await storage.set({
      [storage.KEYS.PIN_ATTEMPTS]: 0,
      [storage.KEYS.PIN_LOCKED_UNTIL]: null,
      [storage.KEYS.PIN_UNLOCKED_AT]: Date.now(),
    });
    return { ok: true };
  },

  async setPin(pin, storage) {
    const hash = await BhmAuth.hashPin(pin);
    await storage.set({
      [storage.KEYS.PIN_HASH]: hash,
      [storage.KEYS.PIN_ATTEMPTS]: 0,
      [storage.KEYS.PIN_LOCKED_UNTIL]: null,
      [storage.KEYS.PIN_UNLOCKED_AT]: Date.now(),
    });
  },

  getToken(interactive) {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive }, token => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(token);
      });
    });
  },

  async fetchProfile(token) {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo',
      { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) throw new Error('userinfo ' + res.status);
    const d = await res.json();
    return { sub: d.sub, email: d.email, name: d.name, picture: d.picture };
  },

  async signOut(storage) {
    try {
      const token = await BhmAuth.getToken(false);
      await new Promise(r => chrome.identity.removeCachedAuthToken({ token }, r));
      await fetch('https://accounts.google.com/o/oauth2/revoke?token=' + token);
    } catch (_) {}
    await storage.remove(Object.values(storage.KEYS));
  },
};
if (typeof module !== 'undefined') {
  if (typeof crypto === 'undefined') global.crypto = require('crypto').webcrypto;
  module.exports = { BhmAuth };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
node chrome-extension/tests/auth.test.js
# Expected: 9 passed, 0 failed
```

- [ ] **Step 5: Commit**

```bash
git add chrome-extension/shared/auth.js chrome-extension/tests/auth.test.js
git commit -m "feat(ext): BhmAuth — PIN 해시·잠금·Google identity (TDD)"
```

---

## Task 4: Drive 동기화 모듈

**Files:**
- Create: `chrome-extension/shared/drive.js`

snuhmate.com과 동일한 `{schemaVersion:1, data:...}` 형식 유지.

- [ ] **Step 1: drive.js 작성**

```javascript
// chrome-extension/shared/drive.js
'use strict';
const BhmDrive = {
  BASE:   'https://www.googleapis.com/drive/v3',
  UPLOAD: 'https://www.googleapis.com/upload/drive/v3',

  async _findFile(name, token) {
    const q = encodeURIComponent("name='" + name + "' and trashed=false");
    const r = await fetch(
      BhmDrive.BASE + '/files?spaces=appDataFolder&q=' + q + '&fields=files(id)',
      { headers: { Authorization: 'Bearer ' + token } });
    const d = await r.json();
    return (d.files && d.files[0]) ? d.files[0].id : null;
  },

  async readJson(name, token) {
    const id = await BhmDrive._findFile(name, token);
    if (!id) return null;
    const r = await fetch(BhmDrive.BASE + '/files/' + id + '?alt=media',
      { headers: { Authorization: 'Bearer ' + token } });
    return r.ok ? r.json() : null;
  },

  async writeJson(name, payload, token) {
    const body = JSON.stringify({ schemaVersion: 1, updatedAt: new Date().toISOString(), data: payload });
    const id   = await BhmDrive._findFile(name, token);
    if (id) {
      await fetch(BhmDrive.UPLOAD + '/files/' + id + '?uploadType=media', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body,
      });
    } else {
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify({ name, parents: ['appDataFolder'] })], { type: 'application/json' }));
      form.append('file',     new Blob([body], { type: 'application/json' }));
      await fetch(BhmDrive.UPLOAD + '/files?uploadType=multipart', {
        method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form,
      });
    }
  },

  async _ensureFolder(name, parentId, token) {
    const pq = parentId ? " and '" + parentId + "' in parents" : " and 'root' in parents";
    const q  = encodeURIComponent("name='" + name + "' and mimeType='application/vnd.google-apps.folder'" + pq + " and trashed=false");
    const r  = await fetch(BhmDrive.BASE + '/files?q=' + q + '&fields=files(id)',
      { headers: { Authorization: 'Bearer ' + token } });
    const d  = await r.json();
    if (d.files && d.files[0]) return d.files[0].id;
    const cr = await fetch(BhmDrive.BASE + '/files', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: parentId ? [parentId] : [] }),
    });
    return (await cr.json()).id;
  },

  async uploadPdf(filename, base64, token) {
    const binary   = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const parentId = await BhmDrive._ensureFolder('BHM Overtime', null, token)
      .then(id => BhmDrive._ensureFolder('급여명세서', id, token));
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify({ name: filename, parents: [parentId] })], { type: 'application/json' }));
    form.append('file',     new Blob([binary], { type: 'application/pdf' }));
    await fetch(BhmDrive.UPLOAD + '/files?uploadType=multipart', {
      method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form,
    });
  },

  async pushAll(storage, token) {
    const d = await storage.get([storage.KEYS.OVERTIME, storage.KEYS.LEAVE, storage.KEYS.PROFILE]);
    await Promise.all([
      BhmDrive.writeJson('overtime.json', d[storage.KEYS.OVERTIME] || [], token),
      BhmDrive.writeJson('leave.json',    d[storage.KEYS.LEAVE]    || [], token),
      BhmDrive.writeJson('profile.json',  d[storage.KEYS.PROFILE]  || {}, token),
    ]);
    await storage.set({ [storage.KEYS.DRIVE_SYNC_AT]: new Date().toISOString() });
  },

  async pullAll(storage, token) {
    const [ot, lv, pr] = await Promise.all([
      BhmDrive.readJson('overtime.json', token),
      BhmDrive.readJson('leave.json',    token),
      BhmDrive.readJson('profile.json',  token),
    ]);
    const update = {};
    if (ot) update[storage.KEYS.OVERTIME] = ot.data;
    if (lv) update[storage.KEYS.LEAVE]    = lv.data;
    if (pr) update[storage.KEYS.PROFILE]  = pr.data;
    if (Object.keys(update).length) await storage.set(update);
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add chrome-extension/shared/drive.js
git commit -m "feat(ext): BhmDrive — Drive API (appDataFolder + PDF 업로드)"
```

---

## Task 5: 계산 엔진 (TDD)

**Files:**
- Create: `chrome-extension/shared/overtime-calc.js`
- Create: `chrome-extension/shared/leave-calc.js`
- Modify: `chrome-extension/tests/calc.test.js`

- [ ] **Step 1: calc.test.js 작성**

```javascript
// chrome-extension/tests/calc.test.js
// 실행: node chrome-extension/tests/calc.test.js
const { calcTimeBreakdown } = require('../shared/overtime-calc.js');
const { calcLeaveDays }     = require('../shared/leave-calc.js');
let p = 0, f = 0;
const ok = (c, m) => c ? (console.log('  PASS', m), p++) : (console.error('  FAIL', m), f++);

// 시간외 계산
const r1 = calcTimeBreakdown('2026-04-20', '18:00', '21:00', 'overtime', false);
ok(r1.extended === 3, '평일 18~21 → 연장 3h');
ok(r1.night    === 0, '평일 18~21 → 야간 0h');
ok(r1.holiday  === 0, '평일 18~21 → 휴일 0h');

const r2 = calcTimeBreakdown('2026-04-20', '20:00', '23:00', 'overtime', false);
ok(r2.extended === 2, '평일 20~23 → 연장 2h');
ok(r2.night    === 1, '평일 20~23 → 야간 1h');

const r3 = calcTimeBreakdown('2026-04-20', '09:00', '13:00', 'overtime', true);
ok(r3.holiday  === 4, '휴일 9~13 → 휴일 4h');
ok(r3.extended === 0, '휴일 9~13 → 연장 0h');

// 휴가 계산 (2026-04-20 월요일)
ok(calcLeaveDays('2026-04-20', '2026-04-22', false) === 3, '월~수 영업일 3일');
ok(calcLeaveDays('2026-04-23', '2026-04-27', false) === 3, '목~월 영업일 3일 (토일 제외)');
ok(calcLeaveDays('2026-04-24', '2026-04-26', true)  === 3, '역일 계산 3일 (토일 포함)');

console.log(p + ' passed, ' + f + ' failed');
process.exit(f > 0 ? 1 : 0);
```

- [ ] **Step 2: 실패 확인**

```bash
node chrome-extension/tests/calc.test.js
# Expected: Cannot find module
```

- [ ] **Step 3: overtime-calc.js 작성**

```javascript
// chrome-extension/shared/overtime-calc.js
'use strict';
function toMin(t) { const [h,m] = t.split(':').map(Number); return h*60+m; }
function overlap(s1,e1,s2,e2) { return Math.max(0, Math.min(e1,e2)-Math.max(s1,s2)); }
function nightHours(s, e) {
  const n1 = overlap(s, e, 1320, 1440);
  const eAdj = e <= s ? e + 1440 : e;
  const n2 = overlap(s, eAdj, 1440, 1800);
  return (n1 + n2) / 60;
}
function calcTimeBreakdown(dateStr, startTime, endTime, type, isHoliday) {
  const s = toMin(startTime);
  let   e = toMin(endTime);
  if (e <= s) e += 1440;
  const totalH = (e - s) / 60;
  const nightH = nightHours(s, e);
  const dayH   = totalH - nightH;
  if (isHoliday) return {
    extended: 0, night: 0,
    holiday:      parseFloat(dayH.toFixed(2)),
    holidayNight: parseFloat(nightH.toFixed(2)),
  };
  const extH = Math.max(0, (e - Math.max(s, 1080))) / 60;
  return {
    extended:     parseFloat(extH.toFixed(2)),
    night:        parseFloat(nightH.toFixed(2)),
    holiday: 0, holidayNight: 0,
  };
}
if (typeof module !== 'undefined') module.exports = { calcTimeBreakdown };
```

- [ ] **Step 4: leave-calc.js 작성**

```javascript
// chrome-extension/shared/leave-calc.js
'use strict';
function calcLeaveDays(startStr, endStr, calendarDays) {
  const start = new Date(startStr + 'T00:00:00');
  const end   = new Date(endStr   + 'T00:00:00');
  let days = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (calendarDays || (dow !== 0 && dow !== 6)) days++;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}
if (typeof module !== 'undefined') module.exports = { calcLeaveDays };
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
node chrome-extension/tests/calc.test.js
# Expected: 10 passed, 0 failed
```

- [ ] **Step 6: Commit**

```bash
git add chrome-extension/shared/overtime-calc.js chrome-extension/shared/leave-calc.js chrome-extension/tests/calc.test.js
git commit -m "feat(ext): overtime-calc + leave-calc (TDD 통과)"
```

---

## Task 6: Background Service Worker

**Files:**
- Modify: `chrome-extension/background.js`

- [ ] **Step 1: background.js 교체**

```javascript
// chrome-extension/background.js
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

let _syncTimer = null;
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
```

- [ ] **Step 2: Commit**

```bash
git add chrome-extension/background.js
git commit -m "feat(ext): background.js — Drive 동기화 + PDF 감지"
```

---

## Task 7: Popup HTML/CSS 쉘

**Files:**
- Modify: `chrome-extension/popup.html`
- Modify: `chrome-extension/popup.css`

- [ ] **Step 1: popup.html 교체**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=360">
  <title>SNUH Mate</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
<div id="view-login"  class="view" hidden></div>
<div id="view-pin"    class="view" hidden></div>
<div id="view-main"   class="view" hidden>
  <div class="popup-header">
    <span class="header-title">🏥 SNUH Mate</span>
    <span id="sync-badge" class="sync-badge"></span>
  </div>
  <nav class="popup-tabs" id="popup-tabs">
    <button class="tab-btn active" data-tab="overtime">⏱️<br>시간외</button>
    <button class="tab-btn" data-tab="leave">🌴<br>휴가</button>
    <button class="tab-btn" data-tab="pdf">📄<br>PDF</button>
    <button class="tab-btn" data-tab="settings">⚙️<br>설정</button>
  </nav>
  <div id="tab-overtime" class="tab-content"></div>
  <div id="tab-leave"    class="tab-content" hidden></div>
  <div id="tab-pdf"      class="tab-content" hidden></div>
  <div id="tab-settings" class="tab-content" hidden></div>
</div>
<script src="shared/esc.js"></script>
<script src="shared/storage.js"></script>
<script src="shared/auth.js"></script>
<script src="shared/drive.js"></script>
<script src="shared/overtime-calc.js"></script>
<script src="shared/leave-calc.js"></script>
<script src="screens/login.js"></script>
<script src="screens/pin.js"></script>
<script src="screens/overtime.js"></script>
<script src="screens/leave.js"></script>
<script src="screens/pdf.js"></script>
<script src="screens/settings.js"></script>
<script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: popup.css 작성**

핵심 스타일 (전체 파일 교체):

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: 360px; font-family: -apple-system,'Noto Sans KR',sans-serif; font-size:13px; color:#111; background:#fff; }
.view { display:flex; flex-direction:column; }
.view[hidden] { display:none!important; }
.popup-header { background:#1a56db; color:#fff; padding:10px 14px; display:flex; align-items:center; justify-content:space-between; }
.header-title { font-weight:700; font-size:14px; }
.sync-badge { font-size:11px; border-radius:5px; padding:2px 8px; }
.sync-badge.ok   { background:#dcfce7; color:#166534; }
.sync-badge.fail { background:#fee2e2; color:#991b1b; }
.popup-tabs { display:flex; border-bottom:1.5px solid #e5e7eb; background:#f9fafb; }
.tab-btn { flex:1; padding:7px 2px; font-size:11px; color:#9ca3af; border:none; background:none; cursor:pointer; border-bottom:2.5px solid transparent; font-weight:500; line-height:1.4; }
.tab-btn.active { color:#1a56db; border-bottom-color:#1a56db; background:#fff; font-weight:700; }
.tab-content { padding:12px 14px; }
.tab-content[hidden] { display:none!important; }
.field { display:flex; flex-direction:column; gap:3px; margin-bottom:10px; }
.field-label { font-size:10px; color:#6b7280; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
.field-input { border:1.5px solid #d1d5db; border-radius:7px; padding:6px 10px; font-size:13px; background:#f9fafb; width:100%; }
.field-input:focus { outline:none; border-color:#1a56db; background:#fff; }
.type-row { display:flex; gap:5px; margin-bottom:10px; }
.type-btn { flex:1; border:1.5px solid #d1d5db; border-radius:7px; padding:6px 2px; text-align:center; font-size:11px; color:#374151; background:#f9fafb; cursor:pointer; }
.type-btn.active { border-color:#1a56db; color:#1a56db; background:#eff6ff; font-weight:700; }
.time-row { display:flex; gap:6px; align-items:center; margin-bottom:10px; }
.time-input { flex:1; border:1.5px solid #d1d5db; border-radius:7px; padding:6px 8px; font-size:14px; background:#f9fafb; text-align:center; }
.time-sep { color:#9ca3af; font-weight:600; }
.info-bar { background:#eff6ff; border-radius:6px; padding:5px 8px; font-size:11px; color:#1d4ed8; margin-bottom:8px; }
.info-bar.green { background:#f0fdf4; color:#15803d; }
.btn-primary { width:100%; background:#1a56db; color:#fff; border:none; border-radius:8px; padding:9px; font-weight:700; font-size:13px; cursor:pointer; }
.btn-primary:hover { background:#1e40af; }
.btn-green { background:#059669; } .btn-green:hover { background:#047857; }
.btn-danger { background:#dc2626; } .btn-danger:hover { background:#b91c1c; }
.status-msg { font-size:12px; text-align:center; margin-top:6px; min-height:18px; }
.status-msg.ok { color:#059669; } .status-msg.err { color:#dc2626; }
.cal-nav { display:flex; align-items:center; justify-content:space-between; margin-bottom:5px; }
.cal-nav button { background:none; border:none; cursor:pointer; font-size:14px; color:#374151; }
.cal-nav-title { font-size:12px; font-weight:700; }
.cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:1px; margin-bottom:8px; }
.cal-cell { text-align:center; padding:3px 1px; font-size:11px; border-radius:4px; cursor:pointer; }
.cal-cell.hd { color:#9ca3af; font-weight:700; font-size:10px; cursor:default; }
.cal-cell.today { background:#1a56db; color:#fff; font-weight:700; }
.cal-cell.sel   { background:#dbeafe; color:#1a56db; font-weight:700; }
.cal-cell.dim   { color:#d1d5db; }
.cal-cell:not(.hd):not(.dim):hover { background:#f0f9ff; }
.pin-screen { padding:16px 14px; text-align:center; }
.pin-dots { display:flex; gap:10px; justify-content:center; margin:8px 0 12px; }
.pin-dot { width:13px; height:13px; border-radius:50%; border:2px solid #1a56db; }
.pin-dot.on { background:#1a56db; }
.pin-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; }
.pin-key { border:1.5px solid #e5e7eb; border-radius:9px; padding:10px; font-size:18px; font-weight:600; color:#111; background:#f9fafb; cursor:pointer; }
.pin-key:hover { background:#f0f9ff; }
.pin-key.sm { font-size:12px; color:#6b7280; font-weight:500; }
.login-screen { padding:24px 14px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:12px; }
.google-btn { width:100%; border:1.5px solid #d1d5db; border-radius:8px; padding:9px 14px; display:flex; align-items:center; justify-content:center; gap:8px; font-size:13px; font-weight:600; color:#374151; background:#fff; cursor:pointer; }
.google-btn:hover { background:#f9fafb; }
.pdf-drop { border:2px dashed #d1d5db; border-radius:10px; padding:20px; text-align:center; color:#9ca3af; font-size:12px; margin-bottom:10px; cursor:pointer; }
.pdf-drop:hover { border-color:#1a56db; color:#1a56db; background:#f0f9ff; }
.pdf-recent-item { display:flex; align-items:center; gap:8px; background:#f9fafb; border:1.5px solid #e5e7eb; border-radius:8px; padding:7px 10px; margin-bottom:6px; }
.pdf-import-btn { background:#1a56db; color:#fff; border:none; border-radius:6px; padding:4px 10px; font-size:11px; font-weight:600; cursor:pointer; white-space:nowrap; }
.leave-type-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:5px; margin-bottom:10px; }
.leave-type-item { border:1.5px solid #d1d5db; border-radius:7px; padding:7px 4px; text-align:center; font-size:12px; color:#374151; background:#f9fafb; cursor:pointer; }
.leave-type-item.active { border-color:#059669; color:#059669; background:#f0fdf4; font-weight:700; }
```

- [ ] **Step 3: Commit**

```bash
git add chrome-extension/popup.html chrome-extension/popup.css
git commit -m "feat(ext): popup 쉘 — 뷰 구조 + CSS 시스템"
```

---

## Task 8: Popup 진입점 + 뷰 라우터

**Files:**
- Modify: `chrome-extension/popup.js`

- [ ] **Step 1: popup.js 교체**

```javascript
// chrome-extension/popup.js
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
```

- [ ] **Step 2: Commit**

```bash
git add chrome-extension/popup.js
git commit -m "feat(ext): popup.js — 뷰 라우터 + 탭 초기화"
```

---

## Task 9: 로그인 화면

**Files:**
- Create: `chrome-extension/screens/login.js`

주의: user.name, user.email 등 서버에서 온 문자열은 textContent로 처리 (esc 불필요).

- [ ] **Step 1: login.js 작성**

```javascript
// chrome-extension/screens/login.js
'use strict';
const LoginScreen = {
  render(container, { onLogin }) {
    container.className = 'view';
    const wrapper = document.createElement('div');
    wrapper.className = 'popup-header';
    const title = document.createElement('span');
    title.className = 'header-title';
    title.textContent = '🏥 SNUH Mate';
    wrapper.appendChild(title);
    container.appendChild(wrapper);

    const body = document.createElement('div');
    body.className = 'login-screen';
    body.innerHTML =
      '<div style="font-size:40px">🏥</div>' +
      '<div style="font-weight:700;font-size:15px">SNUH Mate</div>' +
      '<div style="font-size:12px;color:#6b7280;line-height:1.6">시간외·휴가·급여명세서 기록<br>snuhmate.com 없이 바로 사용</div>';

    const btn = document.createElement('button');
    btn.className = 'google-btn';
    btn.innerHTML = '<span style="font-weight:900;color:#4285f4;font-size:16px">G</span>';
    const btnLabel = document.createElement('span');
    btnLabel.textContent = 'Google 계정으로 로그인';
    btn.appendChild(btnLabel);

    const status = document.createElement('div');
    status.className = 'status-msg';

    body.appendChild(btn);
    body.appendChild(status);
    container.appendChild(body);

    btn.onclick = async function() {
      btn.disabled = true;
      btnLabel.textContent = '로그인 중...';
      try {
        const token = await BhmAuth.getToken(true);
        const user  = await BhmAuth.fetchProfile(token);
        await onLogin(user);
      } catch (e) {
        status.textContent = '로그인 실패: ' + e.message;
        status.className   = 'status-msg err';
        btn.disabled       = false;
        btnLabel.textContent = 'Google 계정으로 로그인';
      }
    };
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add chrome-extension/screens/login.js
git commit -m "feat(ext): 로그인 화면 — DOM 직접 빌드 (XSS 안전)"
```

---

## Task 10: PIN 화면

**Files:**
- Create: `chrome-extension/screens/pin.js`

- [ ] **Step 1: pin.js 작성**

```javascript
// chrome-extension/screens/pin.js
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
    nameEl.textContent = user.name; // textContent — XSS 안전
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
```

- [ ] **Step 2: Commit**

```bash
git add chrome-extension/screens/pin.js
git commit -m "feat(ext): PIN 화면 — DOM 빌드, XSS 안전"
```

---

## Task 11: 시간외 탭

**Files:**
- Create: `chrome-extension/screens/overtime.js`

- [ ] **Step 1: overtime.js 작성**

```javascript
// chrome-extension/screens/overtime.js
'use strict';
const OvertimeScreen = {
  render(container, { user }) {
    let selDate = _todayStr();
    let selType = 'overtime';
    const today = new Date();
    let cy = today.getFullYear(), cm = today.getMonth();

    container.innerHTML =
      '<div class="cal-nav"><button id="cp">◀</button><span class="cal-nav-title" id="ct"></span><button id="cn">▶</button></div>' +
      '<div class="cal-grid" id="cg"></div>' +
      '<div class="type-row">' +
        '<button class="type-btn active" data-type="overtime">시간외</button>' +
        '<button class="type-btn" data-type="oncall_standby">온콜대기</button>' +
        '<button class="type-btn" data-type="oncall_work">온콜출근</button>' +
      '</div>' +
      '<div class="time-row" id="tr"><input class="time-input" type="time" id="st" value="18:00"><span class="time-sep">~</span><input class="time-input" type="time" id="et" value="21:00"></div>' +
      '<div class="field"><label class="field-label">메모</label><input class="field-input" type="text" id="memo" maxlength="100" placeholder="선택"></div>' +
      '<label style="display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:10px"><input type="checkbox" id="ih"> 휴일 근무</label>' +
      '<div class="info-bar" id="ci">날짜와 시간을 선택하세요</div>' +
      '<button class="btn-primary" id="sv">💾 저장</button>' +
      '<div class="status-msg" id="ss"></div>';

    renderCal(cy, cm);
    document.getElementById('cp').onclick = function() { cm--; if(cm<0){cy--;cm=11;} renderCal(cy,cm); };
    document.getElementById('cn').onclick = function() { cm++; if(cm>11){cy++;cm=0;} renderCal(cy,cm); };
    container.querySelectorAll('.type-btn').forEach(function(b) {
      b.onclick = function() {
        container.querySelectorAll('.type-btn').forEach(function(x){x.classList.remove('active');});
        b.classList.add('active'); selType = b.dataset.type;
        document.getElementById('tr').hidden = selType === 'oncall_standby';
        recalc();
      };
    });
    document.getElementById('st').oninput = recalc;
    document.getElementById('et').oninput = recalc;
    document.getElementById('ih').onchange = recalc;
    document.getElementById('sv').onclick = save;

    function renderCal(y, m) {
      document.getElementById('ct').textContent = y + '년 ' + (m+1) + '월';
      var grid = document.getElementById('cg'); grid.innerHTML = '';
      ['일','월','화','수','목','금','토'].forEach(function(d) {
        var el = document.createElement('div'); el.className='cal-cell hd'; el.textContent=d; grid.appendChild(el);
      });
      var first = new Date(y,m,1).getDay(), days = new Date(y,m+1,0).getDate();
      for(var i=0;i<first;i++){var el=document.createElement('div');el.className='cal-cell dim';grid.appendChild(el);}
      for(var d=1;d<=days;d++){
        (function(day){
          var el=document.createElement('div'); var ds=_fmtDate(y,m,day);
          el.className='cal-cell'+(ds===_todayStr()?' today':'')+(ds===selDate?' sel':'');
          el.textContent=day;
          el.onclick=function(){selDate=ds; container.querySelectorAll('.cal-cell').forEach(function(c){c.classList.remove('sel');}); el.classList.add('sel'); recalc();};
          grid.appendChild(el);
        })(d);
      }
    }

    function recalc() {
      var ci=document.getElementById('ci');
      if(selType==='oncall_standby'){ci.textContent='온콜대기: 시간 입력 불필요';return;}
      var s=document.getElementById('st').value, e=document.getElementById('et').value, h=document.getElementById('ih').checked;
      var r=calcTimeBreakdown(selDate,s,e,selType,h);
      ci.textContent='📊 연장 '+r.extended+'h · 야간 '+r.night+'h · 휴일 '+r.holiday+'h';
    }

    async function save() {
      var btn=document.getElementById('sv'), ss=document.getElementById('ss');
      btn.disabled=true;
      var profile=(await BhmStorage.get([BhmStorage.KEYS.PROFILE]))[BhmStorage.KEYS.PROFILE]||{};
      var s=document.getElementById('st').value, e=document.getElementById('et').value, h=document.getElementById('ih').checked;
      var bd=selType==='oncall_standby'?{extended:0,night:0,holiday:0,holidayNight:0}:calcTimeBreakdown(selDate,s,e,selType,h);
      var rec={id:'ot_'+Date.now(),date:selDate,startTime:selType==='oncall_standby'?'':s,endTime:selType==='oncall_standby'?'':e,type:selType,isHoliday:h,memo:document.getElementById('memo').value.trim(),hourlyRate:profile.hourlyRate||0,breakdown:bd,createdAt:new Date().toISOString()};
      var d=await BhmStorage.get([BhmStorage.KEYS.OVERTIME]);
      var recs=d[BhmStorage.KEYS.OVERTIME]||[]; recs.push(rec);
      await BhmStorage.set({[BhmStorage.KEYS.OVERTIME]:recs});
      chrome.runtime.sendMessage({type:'SYNC_NOW'});
      ss.textContent='✅ 저장 완료'; ss.className='status-msg ok';
      document.getElementById('memo').value=''; btn.disabled=false;
      setTimeout(function(){ss.textContent='';},2000);
    }
  },
};
function _todayStr(){var t=new Date();return _fmtDate(t.getFullYear(),t.getMonth(),t.getDate());}
function _fmtDate(y,m,d){return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');}
```

- [ ] **Step 2: Commit**

```bash
git add chrome-extension/screens/overtime.js
git commit -m "feat(ext): 시간외 탭 — 캘린더 + 시간 계산 + 저장"
```

---

## Task 12: 휴가 탭

**Files:**
- Create: `chrome-extension/screens/leave.js`

- [ ] **Step 1: leave.js 작성**

```javascript
// chrome-extension/screens/leave.js
'use strict';
var LEAVE_TYPES=[
  {id:'annual',label:'연차',cal:false},{id:'half',label:'반차',cal:false},
  {id:'sick',label:'병가',cal:true},{id:'ceremony',label:'경조사',cal:false},
  {id:'unpaid',label:'무급',cal:false},{id:'other',label:'기타',cal:false},
];
const LeaveScreen = {
  render(container, { user }) {
    var selType='annual';
    var todayStr=new Date().toISOString().slice(0,10);

    container.innerHTML=
      '<div class="leave-type-grid" id="ltg">'+
        LEAVE_TYPES.map(function(t){return '<div class="leave-type-item'+(t.id==='annual'?' active':'')+'" data-id="'+t.id+'">'+t.label+'</div>';}).join('')+
      '</div>'+
      '<div style="display:flex;gap:6px;margin-bottom:10px">'+
        '<div class="field" style="flex:1"><label class="field-label">시작일</label><input class="field-input" type="date" id="ls"></div>'+
        '<div class="field" style="flex:1"><label class="field-label">종료일</label><input class="field-input" type="date" id="le"></div>'+
      '</div>'+
      '<div class="field"><label class="field-label">사유</label><input class="field-input" type="text" id="lr" maxlength="100" placeholder="선택"></div>'+
      '<div class="info-bar green" id="li">날짜를 선택하세요</div>'+
      '<button class="btn-primary btn-green" id="lb">🌴 휴가 신청</button>'+
      '<div class="status-msg" id="lss"></div>';

    document.getElementById('ls').value=todayStr;
    document.getElementById('le').value=todayStr;

    container.querySelectorAll('.leave-type-item').forEach(function(el){
      el.onclick=function(){
        container.querySelectorAll('.leave-type-item').forEach(function(x){x.classList.remove('active');});
        el.classList.add('active'); selType=el.dataset.id; recalc();
      };
    });
    document.getElementById('ls').oninput=recalc;
    document.getElementById('le').oninput=recalc;
    document.getElementById('lb').onclick=save;

    function recalc(){
      var s=document.getElementById('ls').value, e=document.getElementById('le').value, li=document.getElementById('li');
      if(!s||!e||s>e){li.textContent='날짜를 선택하세요';return;}
      var t=LEAVE_TYPES.find(function(x){return x.id===selType;});
      var days=selType==='half'?0.5:calcLeaveDays(s,e,t.cal);
      li.textContent='📊 '+days+'일 신청';
    }

    async function save(){
      var btn=document.getElementById('lb'), ss=document.getElementById('lss');
      btn.disabled=true;
      var s=document.getElementById('ls').value, e=document.getElementById('le').value;
      if(!s||!e||s>e){ss.textContent='날짜 확인'; ss.className='status-msg err'; btn.disabled=false; return;}
      var t=LEAVE_TYPES.find(function(x){return x.id===selType;});
      var days=selType==='half'?0.5:calcLeaveDays(s,e,t.cal);
      var rec={id:'lv_'+Date.now(),type:selType,startDate:s,endDate:e,days:days,reason:document.getElementById('lr').value.trim(),createdAt:new Date().toISOString()};
      var d=await BhmStorage.get([BhmStorage.KEYS.LEAVE]);
      var recs=d[BhmStorage.KEYS.LEAVE]||[]; recs.push(rec);
      await BhmStorage.set({[BhmStorage.KEYS.LEAVE]:recs});
      chrome.runtime.sendMessage({type:'SYNC_NOW'});
      ss.textContent='✅ '+days+'일 저장 완료'; ss.className='status-msg ok';
      document.getElementById('lr').value=''; btn.disabled=false;
      setTimeout(function(){ss.textContent='';},2000);
    }
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add chrome-extension/screens/leave.js
git commit -m "feat(ext): 휴가 탭 — 유형 선택 + 영업일 계산 + 저장"
```

---

## Task 13: PDF 탭 + 설정 탭

**Files:**
- Create: `chrome-extension/screens/pdf.js`
- Create: `chrome-extension/screens/settings.js`

- [ ] **Step 1: pdf.js 작성**

```javascript
// chrome-extension/screens/pdf.js
'use strict';
const PdfScreen = {
  render(container, { user }) {
    container.innerHTML=
      '<div class="pdf-drop" id="pd">📥 PDF를 여기에 드래그<br>또는 클릭해서 선택<input type="file" id="pf" accept=".pdf" style="display:none"></div>'+
      '<div style="font-size:11px;color:#9ca3af;text-align:center;margin-bottom:8px">— 최근 감지된 PDF —</div>'+
      '<div id="rp"></div>'+
      '<div class="status-msg" id="ps"></div>';

    document.getElementById('pd').onclick=function(){document.getElementById('pf').click();};
    document.getElementById('pf').onchange=function(e){if(e.target.files[0])handleFile(e.target.files[0]);};
    var drop=document.getElementById('pd');
    drop.ondragover=function(e){e.preventDefault();drop.style.borderColor='#1a56db';};
    drop.ondragleave=function(){drop.style.borderColor='';};
    drop.ondrop=function(e){e.preventDefault();drop.style.borderColor='';var f=e.dataTransfer.files[0];if(f&&f.name.endsWith('.pdf'))handleFile(f);};

    BhmStorage.get(['bhm_last_pdf']).then(function(d){
      var pdf=d['bhm_last_pdf'];
      if(!pdf||Date.now()-pdf.detectedAt>86400000)return;
      var mins=Math.floor((Date.now()-pdf.detectedAt)/60000);
      var item=document.createElement('div'); item.className='pdf-recent-item';
      var icon=document.createElement('span'); icon.textContent='📄'; icon.style.fontSize='20px';
      var info=document.createElement('div'); info.style.flex='1';
      var name=document.createElement('div'); name.style.cssText='font-weight:600;font-size:12px';
      name.textContent=pdf.fileName; // textContent — XSS 안전
      var age=document.createElement('div'); age.style.cssText='font-size:11px;color:#9ca3af';
      age.textContent=(mins<1?'방금 전':mins+'분 전')+' 감지됨';
      info.appendChild(name); info.appendChild(age);
      var btn=document.createElement('button'); btn.className='pdf-import-btn'; btn.textContent='가져오기';
      btn.onclick=function(){importBase64(pdf.base64,pdf.fileName);};
      item.appendChild(icon); item.appendChild(info); item.appendChild(btn);
      document.getElementById('rp').appendChild(item);
    });

    function handleFile(file){
      var reader=new FileReader();
      reader.onload=function(e){
        var b64=btoa(String.fromCharCode.apply(null,new Uint8Array(e.target.result)));
        importBase64(b64,file.name);
      };
      reader.readAsArrayBuffer(file);
    }

    async function importBase64(base64,fileName){
      var ps=document.getElementById('ps'); ps.textContent='⏳ Drive에 저장 중...'; ps.className='status-msg';
      try {
        var token=await BhmAuth.getToken(false);
        await BhmDrive.uploadPdf(fileName,base64,token);
        ps.textContent='✅ '+fileName+' 저장 완료'; ps.className='status-msg ok';
      } catch(e){
        ps.textContent='❌ '+e.message; ps.className='status-msg err';
      }
    }
  },
};
```

- [ ] **Step 2: settings.js 작성**

```javascript
// chrome-extension/screens/settings.js
'use strict';
const SettingsScreen = {
  render(container, { user, onSignOut }) {
    var userArea=document.createElement('div');
    userArea.style.cssText='display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:10px;background:#f9fafb;border-radius:8px;border:1.5px solid #e5e7eb';
    var img=document.createElement('img');
    img.src=user.picture||''; img.style.cssText='width:36px;height:36px;border-radius:50%';
    img.onerror=function(){this.style.display='none';};
    var nameBox=document.createElement('div');
    var nameEl=document.createElement('div'); nameEl.style.fontWeight='700'; nameEl.textContent=user.name;
    var emailEl=document.createElement('div'); emailEl.style.cssText='font-size:11px;color:#6b7280'; emailEl.textContent=user.email;
    nameBox.appendChild(nameEl); nameBox.appendChild(emailEl);
    userArea.appendChild(img); userArea.appendChild(nameBox);
    container.appendChild(userArea);

    container.insertAdjacentHTML('beforeend',
      '<div style="font-weight:700;margin-bottom:8px">🔒 PIN 설정</div>'+
      '<div style="display:flex;gap:6px;margin-bottom:6px">'+
        '<input class="field-input" type="password" id="np" maxlength="4" placeholder="새 PIN 4자리" style="flex:1;text-align:center;letter-spacing:4px">'+
        '<button class="btn-primary" id="sp" style="width:auto;padding:6px 12px;font-size:12px">변경</button>'+
      '</div>'+
      '<div class="status-msg" id="pcs" style="margin-bottom:12px"></div>'+
      '<div style="font-weight:700;margin-bottom:8px">☁️ 동기화</div>'+
      '<div style="display:flex;gap:6px;align-items:center;margin-bottom:14px">'+
        '<div style="flex:1;font-size:12px;color:#6b7280" id="si">확인 중...</div>'+
        '<button class="btn-primary" id="sn" style="width:auto;padding:6px 12px;font-size:12px">지금 동기화</button>'+
      '</div>'+
      '<button class="btn-primary btn-danger" id="so">로그아웃</button>');

    document.getElementById('sp').onclick=async function(){
      var pin=document.getElementById('np').value, pcs=document.getElementById('pcs');
      if(!/^\d{4}$/.test(pin)){pcs.textContent='4자리 숫자 필요'; pcs.className='status-msg err'; return;}
      await BhmAuth.setPin(pin,BhmStorage);
      pcs.textContent='✅ PIN 변경 완료'; pcs.className='status-msg ok';
      document.getElementById('np').value='';
    };

    BhmStorage.get([BhmStorage.KEYS.DRIVE_SYNC_AT]).then(function(d){
      var at=d[BhmStorage.KEYS.DRIVE_SYNC_AT], si=document.getElementById('si');
      si.textContent=at?'마지막: '+new Date(at).toLocaleString('ko-KR'):'아직 동기화 안됨';
    });

    document.getElementById('sn').onclick=function(){
      chrome.runtime.sendMessage({type:'SYNC_NOW'},function(){
        document.getElementById('si').textContent='✅ 동기화 완료';
      });
    };

    document.getElementById('so').onclick=function(){
      if(confirm('로그아웃하면 로컬 데이터가 삭제됩니다. 계속하시겠습니까?')) onSignOut();
    };
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add chrome-extension/screens/pdf.js chrome-extension/screens/settings.js
git commit -m "feat(ext): PDF + 설정 탭 (XSS 안전 DOM 빌드)"
```

---

## Task 14: 통합 확인 + Chrome 로드

- [ ] **Step 1: 단위 테스트 전체 실행**

```bash
node chrome-extension/tests/auth.test.js && node chrome-extension/tests/calc.test.js
# Expected: 모든 테스트 통과
```

- [ ] **Step 2: chrome://extensions 에서 로컬 로드**

1. `chrome://extensions` 열기
2. 개발자 모드 ON
3. "압축 해제된 확장 프로그램을 로드합니다" 클릭
4. `.worktrees/ext-standalone/chrome-extension` 폴더 선택
5. 오류 없이 로드 확인

- [ ] **Step 3: GCP Client ID 설정**

`manifest.json`의 `__REPLACE_WITH_GCP_CLIENT_ID__`를 실제 값으로 교체:
- GCP Console → APIs & Services → Credentials → Chrome Extension 타입 OAuth Client
- Extension ID는 `chrome://extensions`에서 확인

- [ ] **Step 4: E2E 흐름 검증**

아이콘 클릭 → 로그인 버튼 표시 → 로그인 → 설정탭 → PIN 4자리 설정 → 팝업 닫기 → 재오픈 → PIN 화면 표시 → 입력 → 시간외탭 → 날짜/시간 입력 → 저장 → "✅ 저장 완료" → Drive `overtime.json` 생성 확인

- [ ] **Step 5: PR 생성**

```bash
git push origin feat/ext-standalone
gh pr create --title "feat: Chrome Extension 독립형 v1.0 — PIN/시간외/휴가/PDF" \
  --body "snuhmate.com 없이 독립 동작. chrome.storage + Drive API 직접 연동. PIN 잠금 필수."
```

---

## 주의사항

| 항목 | 내용 |
|------|------|
| GCP Client ID | `manifest.json` oauth2.client_id 실제 값 교체 필수 |
| Drive 호환 | `{schemaVersion:1, data:...}` 형식 유지 — 웹앱과 공유 |
| XSS | 사용자 데이터(name, email, fileName 등)는 반드시 `textContent` 사용 |
| PIN 미설정 | 첫 로그인 후 설정탭으로 안내 (defaultTab='settings') |
| content-script.js | 삭제됨 — extensionBridge.js(웹앱 측)는 변경 없음 |
