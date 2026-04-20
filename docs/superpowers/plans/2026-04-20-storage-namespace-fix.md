# Storage Namespace Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** localStorage 키에 사용자 namespace가 없어 발생하는 cross-user 데이터 노출과 데모 모드 데이터 오염을 3개 태스크로 완전 차단한다.

**Architecture:**
- `getUserStorageKey(base)` = `base + '_' + (googleSub || 'guest')` 패턴을 payslip과 work_history에도 적용.
- payslip 키는 타입 suffix(`_TYPE`)가 있어 뒤에 user suffix를 붙일 수 없으므로 앞에 `payslip_<uid>_YYYY_MM[_TYPE]` 형태로 변경.
- 데모 모드: `loadDemoData()` 진입 시 Drive 플래그를 끄고, `syncManager` 두 곳에 `'demo'` 가드 추가.

**Tech Stack:** Vanilla JS, chrome.storage.local (extension) / localStorage (snuhmate.com), Google Drive appDataFolder

---

## 배경 — 3가지 데이터 경로

```
[비로그인]   localStorage 키 suffix: _guest
             예: overtimeRecords_guest, bhm_hr_profile_guest

[로그인]     localStorage 키 suffix: _<googleSub>
             예: overtimeRecords_1049xxxxx, bhm_hr_profile_1049xxxxx

[데모]       localStorage 키 suffix: _demo
             예: overtimeRecords_demo, bhm_hr_profile_demo
             + 데모 전용 샘플 데이터 주입
```

`getUserStorageKey(base)` 는 `googleAuth.js:38` 에 정의. 모든 데이터 모듈이 이를 통해 키를 얻어야 하지만, payslip 과 work_history 는 누락됨.

---

## Task 1: 데모 모드 완전 하드닝

**Files:**
- Modify: `demo-data.js`
- Modify: `syncManager.js`

### 해결할 버그

| # | 증상 | 원인 |
|---|------|------|
| BUG-3 | 데모 중 "지금 동기화" 클릭 → Drive 접근 시도(에러) | `loadDemoData()`가 `driveEnabled` 안 건드림 |
| BUG-4 | 실제 guest 데이터가 `_demo` 키로 이전될 수 있음 | `fullSync()`가 `migrateGuestData('demo')` 호출 |
| BUG-5 | 데모 중 Drive applock 읽기 시도(에러 노이즈) | `_pullAppLock()` 데모 가드 없음 |
| BUG-6 | 브라우저 재오픈 시 `bhm_demo_saved_auth` 잔류 | `restoreDemoIfNeeded()`가 미삭제 |

- [ ] **Step 1: BUG-3 — `loadDemoData()`에서 `driveEnabled: false` 세팅**

`demo-data.js:loadDemoData()` 내부, `settings.googleSub = DEMO_UID;` 아래에 추가:

```javascript
settings.driveEnabled    = false;
settings.calendarEnabled = false;
```

최종 `loadDemoData()` 내용 (`bhm_demo_saved_auth` 저장은 이미 이전 커밋에 있음):

```javascript
function loadDemoData() {
  localStorage.setItem('bhm_demo_mode', '1');

  var settings = {};
  try { settings = JSON.parse(localStorage.getItem('bhm_settings') || '{}'); } catch (e) {}

  // 실제 인증 정보 백업 (exitDemoMode에서 복원)
  if (settings.googleSub && settings.googleSub !== DEMO_UID) {
    localStorage.setItem('bhm_demo_saved_auth', JSON.stringify({
      googleSub:       settings.googleSub,
      googleEmail:     settings.googleEmail   || '',
      googleName:      settings.googleName    || '',
      googlePicture:   settings.googlePicture || '',
      driveEnabled:    !!settings.driveEnabled,
      calendarEnabled: !!settings.calendarEnabled,
    }));
  }

  settings.googleSub       = DEMO_UID;
  settings.googleEmail     = '';
  settings.googleName      = '';
  settings.googlePicture   = '';
  settings.driveEnabled    = false;
  settings.calendarEnabled = false;
  localStorage.setItem('bhm_settings', JSON.stringify(settings));

  localStorage.setItem('bhm_hr_profile_' + DEMO_UID, JSON.stringify(_profile));
  localStorage.setItem('overtimeRecords_'  + DEMO_UID, JSON.stringify(_overtime));
  localStorage.setItem('leaveRecords_'     + DEMO_UID, JSON.stringify(_leave));
}
```

- [ ] **Step 2: BUG-6 — `restoreDemoIfNeeded()`에서 `bhm_demo_saved_auth` 삭제**

`demo-data.js` IIFE 내부 `restoreDemoIfNeeded()` 에서, 세션이 없을 때 데모 잔류 정리하는 블록에 추가:

```javascript
// 기존 코드 (이미 있음):
localStorage.removeItem('bhm_demo_mode');
var s = {};
try { s = JSON.parse(localStorage.getItem('bhm_settings') || '{}'); } catch (e) {}
if (s.googleSub === DEMO_UID) { delete s.googleSub; localStorage.setItem('bhm_settings', JSON.stringify(s)); }
// 추가:
localStorage.removeItem('bhm_demo_saved_auth');
return;
```

- [ ] **Step 3: BUG-4 — `fullSync()`에서 데모 sub 가드**

`syncManager.js:fullSync()` 내부, `migrateGuestData` 호출 부분:

```javascript
// 기존:
if (settings.googleSub) {
  migrateGuestData(settings.googleSub);
}

// 변경 후:
if (settings.googleSub && settings.googleSub !== 'demo') {
  migrateGuestData(settings.googleSub);
}
```

- [ ] **Step 4: BUG-5 — `_pullAppLock()`에 데모 가드**

`syncManager.js:_pullAppLock()` 첫 번째 if 문 앞에 추가:

```javascript
function _pullAppLock() {
  if (localStorage.getItem('bhm_demo_mode') === '1') return Promise.resolve(null);
  if (!window.GoogleAuth || !window.GoogleAuth.isSignedIn()) return Promise.resolve(null);
  ...
```

- [ ] **Step 5: 수동 검증**

```
1. snuhmate.com 로그인 (Drive 활성화 상태)
2. URL에 ?demo=1 추가 → 데모 모드 진입
3. DevTools → Application → localStorage:
   - bhm_settings.driveEnabled = false ✓
   - bhm_settings.googleSub = 'demo' ✓
   - bhm_settings.googleEmail = '' ✓
   - bhm_demo_saved_auth 있음 ✓
4. 설정 → "지금 동기화" 클릭 → "❌" 또는 무응답 (에러 없이 무시) ✓
5. 데모 종료 → bhm_demo_saved_auth 없음 ✓
6. 다른 탭에서 snuhmate.com 로그인 → 데모 없는 탭에서 bhm_demo_saved_auth 없음 ✓
```

- [ ] **Step 6: exitDemoMode에서 driveEnabled 복원**

`demo-data.js:exitDemoMode()` 에서 saved auth 복원 시 드라이브 플래그도 복원:

```javascript
if (saved && saved.googleSub) {
  settings.googleSub       = saved.googleSub;
  settings.googleEmail     = saved.googleEmail;
  settings.googleName      = saved.googleName;
  settings.googlePicture   = saved.googlePicture;
  settings.driveEnabled    = !!saved.driveEnabled;
  settings.calendarEnabled = !!saved.calendarEnabled;
}
```

- [ ] **Step 7: index.html v 번프**

```
demo-data.js?v=1.2 → v=1.3
syncManager.js?v=2.2 → v=2.3
```

- [ ] **Step 8: Commit**

```bash
git add demo-data.js syncManager.js index.html
git commit -m "fix(demo): driveEnabled 초기화 + migrateGuest/pullAppLock 데모 가드 + saved_auth 잔류 제거"
```

---

## Task 2: payslip_YYYY_MM 사용자 namespace 적용

**Files:**
- Modify: `salary-parser.js` (storageKey, listSavedMonths, 마이그레이션)
- Modify: `payslip-tab.js` (deletePayslipMonth)
- Modify: `syncManager.js` (_pushPayslip, migrateGuestData)
- Modify: `index.html` (v 번프: salary-parser.js, syncManager.js)

### 배경

기존 키: `payslip_YYYY_MM` / `payslip_YYYY_MM_TYPE`
신규 키: `payslip_<uid>_YYYY_MM` / `payslip_<uid>_YYYY_MM_TYPE`

uid 위치를 앞으로 잡는 이유: 기존 type suffix (`_성과`, `_기타`)와 충돌 방지.
마이그레이션: 로그인 시 old format 키 → new format 키 이전.

### 핵심 함수 설계

```javascript
// salary-parser.js에 추가할 헬퍼
function _payslipUid() {
  var settings = {};
  try { settings = JSON.parse(localStorage.getItem('bhm_settings') || '{}'); } catch (e) {}
  return settings.googleSub || 'guest';
}

// 기존 storageKey(year, month, type) 대체
function storageKey(year, month, type) {
  var uid = _payslipUid();
  var base = 'payslip_' + uid + '_' + year + '_' + String(month).padStart(2, '0');
  return (type && type !== '급여') ? base + '_' + type : base;
}

// listSavedMonths: 현재 사용자 prefix만 반환
function listSavedMonths() {
  var uid = _payslipUid();
  var prefix = 'payslip_' + uid + '_';
  var months = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && k.startsWith(prefix)) {
      var rest = k.slice(prefix.length); // 'YYYY_MM' or 'YYYY_MM_TYPE'
      var m = rest.match(/^(\d{4})_(\d{2})(?:_(.+))?$/);
      if (m) months.push({ year: parseInt(m[1]), month: parseInt(m[2]), type: m[3] || '급여', key: k });
    }
  }
  return months.sort(function(a, b) {
    return b.year - a.year || b.month - a.month ||
      (a.type === '급여' ? -1 : b.type === '급여' ? 1 : 0);
  });
}
```

- [ ] **Step 1: 테스트 먼저 — storageKey 검증**

`tests/phase42-payslip-namespace.js` 생성:

```javascript
// 단순 키 생성 검증
var assert = require('assert');

// salary-parser.js의 _payslipUid, storageKey 함수를 직접 테스트할 수 없으므로
// 패턴만 검증
var uid = 'u12345';
var base = 'payslip_' + uid + '_' + '2026' + '_' + '04';
assert.strictEqual(base, 'payslip_u12345_2026_04', '기본 키 포맷');

var withType = base + '_성과';
assert.strictEqual(withType, 'payslip_u12345_2026_04_성과', '타입 suffix 포맷');

var oldKey = 'payslip_2026_04';
var m = oldKey.match(/^payslip_(\d{4})_(\d{2})(?:_(.+))?$/);
assert.ok(m, '구 키 regex 매칭');
assert.strictEqual(m[1], '2026'); assert.strictEqual(m[2], '04');

console.log('PASS payslip-namespace: 3 passed');
```

실행: `node tests/phase42-payslip-namespace.js`
기대: `PASS payslip-namespace: 3 passed`

- [ ] **Step 2: `salary-parser.js` storageKey, listSavedMonths 수정**

`salary-parser.js` 에서 `storageKey` 함수(line ~1076) 전체 교체:

```javascript
function _payslipUid() {
  var settings = {};
  try { settings = JSON.parse(localStorage.getItem('bhm_settings') || '{}'); } catch (e) {}
  return settings.googleSub || 'guest';
}

function storageKey(year, month, type) {
  var uid = _payslipUid();
  var base = 'payslip_' + uid + '_' + year + '_' + String(month).padStart(2, '0');
  return (type && type !== '급여') ? base + '_' + type : base;
}
```

`listSavedMonths` 함수(line ~1155) 전체 교체:

```javascript
function listSavedMonths() {
  var uid = _payslipUid();
  var prefix = 'payslip_' + uid + '_';
  var months = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (!k || !k.startsWith(prefix)) continue;
    var rest = k.slice(prefix.length);
    var m = rest.match(/^(\d{4})_(\d{2})(?:_(.+))?$/);
    if (m) months.push({ year: parseInt(m[1]), month: parseInt(m[2]), type: m[3] || '급여', key: k });
  }
  return months.sort(function(a, b) {
    return b.year - a.year || b.month - a.month ||
      (a.type === '급여' ? -1 : b.type === '급여' ? 1 : 0);
  });
}
```

주의: `salary-parser.js`는 ES module 스타일과 함수 선언이 혼용됨. `_payslipUid`는 `storageKey` 위에 선언.

- [ ] **Step 3: `payslip-tab.js:deletePayslipMonth` 수정**

`payslip-tab.js` 내 `deletePayslipMonth` 함수 (~line 798):

```javascript
function deletePayslipMonth(year, month, type) {
  const typeLabel = type && type !== '급여' ? ` (${type})` : '';
  if (!confirm(`${year}년 ${month}월${typeLabel} 급여명세서를 삭제하시겠습니까?`)) return;
  // 기존: const base = `payslip_${year}_${String(month).padStart(2, '0')}`;
  // 신규: storageKey 활용 (salary-parser.js에 노출된 window.SalaryParser.storageKey 또는 직접 계산)
  const settings = (() => { try { return JSON.parse(localStorage.getItem('bhm_settings') || '{}'); } catch(e) { return {}; } })();
  const uid = settings.googleSub || 'guest';
  const base = `payslip_${uid}_${year}_${String(month).padStart(2, '0')}`;
  const key = (type && type !== '급여') ? `${base}_${type}` : base;
  localStorage.removeItem(key);
  renderPayslipMgmt();
}
```

- [ ] **Step 4: `syncManager.js:_pushPayslip` 수정**

```javascript
function _pushPayslip(year, month) {
  var mm = String(month).padStart(2, '0');
  // 신규: 사용자 namespace 키 사용
  var uid = window.getUserStorageKey ? (function(){
    var s = window.loadSettings ? window.loadSettings() : {};
    return s.googleSub || 'guest';
  }()) : 'guest';
  var localKey = 'payslip_' + uid + '_' + year + '_' + mm;
  var raw = localStorage.getItem(localKey);
  if (!raw) return Promise.resolve();
  var data;
  try { data = JSON.parse(raw); } catch (e) { return Promise.reject(e); }
  var driveFile = 'payslips/payslip_' + year + '_' + mm + '.json';
  return window.GoogleDriveStore.writeJsonFile(driveFile, _wrap(data)).then(function () {
    _lastSync = new Date();
    _updateSyncLabel();
  });
}
```

- [ ] **Step 5: `syncManager.js:migrateGuestData`에 payslip 마이그레이션 추가**

`migrateGuestData` 함수 내부 `MIGRATE_KEYS` 배열 다음에 payslip 전용 블록 추가:

```javascript
// payslip 구 키 (payslip_YYYY_MM) → 신규 키 (payslip_guest_YYYY_MM) 마이그레이션
// 로그인 직후 호출: guest → <googleSub> 이전
(function migratePayslipKeys() {
  var oldPattern = /^payslip_(\d{4})_(\d{2})(?:_(.+))?$/;
  var keysToMigrate = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && oldPattern.test(k)) keysToMigrate.push(k);
  }
  keysToMigrate.forEach(function(k) {
    var m = k.match(oldPattern);
    if (!m) return;
    var newKey = 'payslip_' + googleSub + '_' + m[1] + '_' + m[2] + (m[3] ? '_' + m[3] : '');
    if (!localStorage.getItem(newKey)) {
      localStorage.setItem(newKey, localStorage.getItem(k));
    }
    localStorage.removeItem(k);
  });
  if (keysToMigrate.length > 0) {
    console.log('[SyncManager] migrated ' + keysToMigrate.length + ' payslip keys to namespace payslip_' + googleSub + '_*');
  }
}());
```

이 블록은 `migrateGuestData(googleSub)` 함수 내부 마지막에 삽입.

- [ ] **Step 6: index.html v 번프**

```
salary-parser.js?v= 찾아서 +1
syncManager.js?v=2.3 → v=2.4
payslip-tab.js?v= 찾아서 +1
```

실행: `grep -n "salary-parser\|syncManager\|payslip-tab" index.html`

- [ ] **Step 7: 수동 검증**

```
1. DevTools console에서 이전 포맷 키 생성:
   localStorage.setItem('payslip_2026_04', JSON.stringify({test:1}))
2. 페이지 로그인 → console에서 마이그레이션 로그 확인:
   [SyncManager] migrated 1 payslip keys to namespace payslip_<sub>_*
3. localStorage에 payslip_<sub>_2026_04 존재, payslip_2026_04 삭제됨 확인
4. 급여명세서 탭 → 2026-04 데이터 정상 표시
5. 다른 계정 로그인 → 이전 계정 급여명세서 안 보임
```

- [ ] **Step 8: Commit**

```bash
git add salary-parser.js payslip-tab.js syncManager.js index.html tests/phase42-payslip-namespace.js
git commit -m "fix(storage): payslip_YYYY_MM에 사용자 namespace 추가, 구 포맷 자동 마이그레이션"
```

---

## Task 3: bhm_work_history 사용자 namespace 적용

**Files:**
- Modify: `work-history.js`
- Modify: `app.js` (line 3863)
- Modify: `resume.js` (line 424)
- Modify: `syncManager.js` (migrateGuestData MIGRATE_KEYS에 추가)
- Modify: `index.html` (v 번프)

### 배경

`WH_KEY = 'bhm_work_history'` 는 전역 상수. 모든 읽기/쓰기가 이 키를 사용.
`bhm_work_history_seeded` 도 마찬가지로 namespace 없음 (seeding 플래그 — 덜 중요하지만 같이 수정).

### 설계

`WH_KEY` 를 함수로 교체:

```javascript
function _whKey() {
  return window.getUserStorageKey ? window.getUserStorageKey('bhm_work_history') : 'bhm_work_history_guest';
}
function _whSeedKey() {
  return window.getUserStorageKey ? window.getUserStorageKey('bhm_work_history_seeded') : 'bhm_work_history_seeded_guest';
}
```

- [ ] **Step 1: `work-history.js` WH_KEY 교체**

`work-history.js:4` 의 `var WH_KEY = 'bhm_work_history';` 삭제 후 아래로 교체:

```javascript
function _whKey() {
  return window.getUserStorageKey ? window.getUserStorageKey('bhm_work_history') : 'bhm_work_history_guest';
}
function _whSeedKey() {
  return window.getUserStorageKey ? window.getUserStorageKey('bhm_work_history_seeded') : 'bhm_work_history_seeded_guest';
}
```

`work-history.js` 내 `WH_KEY` 사용처 모두 `_whKey()` 로 교체:
- line 8: `localStorage.getItem(WH_KEY` → `localStorage.getItem(_whKey()`
- line 65: `localStorage.setItem(WH_KEY` → `localStorage.setItem(_whKey()`
- line 109: `localStorage.removeItem('bhm_work_history_seeded')` → `localStorage.removeItem(_whSeedKey())`

- [ ] **Step 2: `app.js` 수정**

`app.js:3863-3864`:

```javascript
// 기존:
var _wh = JSON.parse(localStorage.getItem('bhm_work_history') || '[]');
if (!Array.isArray(_wh) || _wh.length === 0) localStorage.removeItem('bhm_work_history_seeded');

// 수정 후:
var _whK = window.getUserStorageKey ? window.getUserStorageKey('bhm_work_history') : 'bhm_work_history_guest';
var _wh = JSON.parse(localStorage.getItem(_whK) || '[]');
var _whSK = window.getUserStorageKey ? window.getUserStorageKey('bhm_work_history_seeded') : 'bhm_work_history_seeded_guest';
if (!Array.isArray(_wh) || _wh.length === 0) localStorage.removeItem(_whSK);
```

- [ ] **Step 3: `resume.js` 수정**

`resume.js:424`:

```javascript
// 기존:
try { wh = JSON.parse(localStorage.getItem('bhm_work_history') || '[]'); } catch (e) { wh = []; }

// 수정 후:
var _rhK = window.getUserStorageKey ? window.getUserStorageKey('bhm_work_history') : 'bhm_work_history_guest';
try { wh = JSON.parse(localStorage.getItem(_rhK) || '[]'); } catch (e) { wh = []; }
```

- [ ] **Step 4: `syncManager.js:migrateGuestData` MIGRATE_KEYS에 work_history 추가**

```javascript
var MIGRATE_KEYS = [
  { base: 'bhm_hr_profile',    dataType: 'profile' },
  { base: 'overtimeRecords',   dataType: 'overtime' },
  { base: 'leaveRecords',      dataType: 'leave' },
  { base: 'otManualHourly',    dataType: null },
  { base: 'bhm_work_history',  dataType: null },   // ← 추가
];
```

(Drive sync는 추가하지 않음 — `dataType: null` 이면 migrateGuestData만 하고 Drive push 안 함)

- [ ] **Step 5: 테스트 파일 수정**

`tests/phase33-track-e-career.js:37`:

```javascript
// 기존:
assert(appJs.includes("'bhm_work_history'") || appJs.includes('"bhm_work_history"'), 'localStorage 키 bhm_work_history');

// 수정 후:
assert(
  appJs.includes("'bhm_work_history'") || appJs.includes('"bhm_work_history"') ||
  workHistoryJs.includes('_whKey') || workHistoryJs.includes("'bhm_work_history'"),
  'localStorage 키 bhm_work_history (namespaced)'
);
```

(테스트 파일 상단에 `work-history.js` 읽기 추가 필요한지 확인 후 수정)

실행: `node tests/phase33-track-e-career.js`

- [ ] **Step 6: index.html v 번프**

```
work-history.js?v= 찾아서 +1
resume.js?v= 찾아서 +1
app.js?v= 찾아서 +1
syncManager.js?v=2.4 → v=2.5
```

실행: `grep -n "work-history\|resume\|app\.js\|syncManager" index.html`

- [ ] **Step 7: 수동 검증**

```
1. 로그인 전 (guest): 근무이력 탭 → 항목 추가 → localStorage에 bhm_work_history_guest 생성 확인
2. 로그인 → migrateGuestData 호출 → bhm_work_history_<sub> 로 이전 확인
3. 로그아웃 후 다른 계정 로그인 → 이전 계정 근무이력 안 보임 확인
4. 이력서 탭 → 근무이력 정상 표시 확인
```

- [ ] **Step 8: Commit**

```bash
git add work-history.js app.js resume.js syncManager.js index.html tests/phase33-track-e-career.js
git commit -m "fix(storage): bhm_work_history 사용자 namespace 적용 + guest→login 마이그레이션"
```

---

## 전체 완료 후 회귀 검증

```bash
node tests/phase33-track-e-career.js
node tests/phase42-payslip-namespace.js
node tests/phase42-overtime-profile.js   # 기존 테스트 회귀 없음 확인
```

### 최종 localStorage 키 namespace 현황표 (수정 후)

| 키 패턴 | Namespace | 비고 |
|---------|-----------|------|
| `overtimeRecords_<uid>` | ✅ | 기존 |
| `leaveRecords_<uid>` | ✅ | 기존 |
| `bhm_hr_profile_<uid>` | ✅ | 기존 |
| `otManualHourly_<uid>` | ✅ | 기존 |
| `payslip_<uid>_YYYY_MM[_TYPE]` | ✅ | Task 2에서 수정 |
| `bhm_work_history_<uid>` | ✅ | Task 3에서 수정 |
| `bhm_settings` | 공유 (의도적) | googleSub 등 앱 설정 |
| `bhm_demo_*` | 전역 (의도적) | 데모 상태 플래그 |
| `cardnews_*` | 공유 (의도적) | 뉴스/카드 캐시 — 사용자 무관 |
| `theme` | 공유 (의도적) | 테마 설정 |
