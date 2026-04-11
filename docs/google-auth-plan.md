# Google Auth + Drive 백업 + Calendar 연동 — 구현 계획

> Spec: [google-auth-spec.md](./google-auth-spec.md) v1.1  
> Date: 2026-04-10 | Status: Approved

---

## 의존성 그래프

```
Phase 0 (GCP 설정 — 코드 변경 없음)
  └─ Phase 1 (Google Auth + isFamilyMode 제거)
       ├─ Phase 2 (Drive 백업)
       │    └─ Phase 4 (급여명세서 PDF 백업)
       └─ Phase 3 (Calendar 연동)  ← Phase 2와 병렬 가능
            └─ Phase 5 (코드 정리)  ← Phase 2 + 3 안정화 후
```

Phase 2와 Phase 3은 GoogleAuth에만 의존하므로 **병렬 개발 가능**.

---

## Phase 0: 준비 — GCP 설정 (코드 변경 없음)

### 0-1. GCP 프로젝트 설정

1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. **Create Credentials → OAuth 2.0 Client ID** (Application type: Web application)
3. Authorized JavaScript origins 등록:
   - `http://localhost:4173`
   - `https://www.snuhmate.com`
4. Redirect URIs: 불필요 (GIS Token Model은 redirect 없음)
5. APIs & Services → Library에서 활성화:
   - **Google Drive API**
   - **Google Calendar API**
6. OAuth consent screen 구성:
   - App name: `SNUH Mate`
   - Scopes: `openid email profile`, `drive.appdata`, `calendar.events`
   - 심사 전까지 test users에 개발자 계정 추가 (최대 100명)
7. 발급된 Client ID를 `googleAuth.js` 상단 상수에 기록

### 0-2. 코드 경계 주석 추가

**수정 파일:** `supabaseClient.js`, `profile.js`, `leave.js`, `overtime.js`, `app.js`

각 SupabaseSync 호출부에 TODO 주석 추가 (실제 코드 변경 없음):

```javascript
// TODO Phase 2: SyncManager.enqueuePush()로 교체
if (window.SupabaseSync) {
    window.SupabaseSync.pushCloudData('leave_records', record);
}
```

`isFamilyMode` 관련 7개 지점:
```javascript
// TODO Phase 1: isFamilyMode 제거
window.isFamilyMode = urlParams.get('mode') === 'family';
```

**완료 기준:** 배포 없음. 주석만 추가됨.

---

## Phase 1: Google Auth + isFamilyMode 제거

**신규 파일:** `googleAuth.js`  
**수정 파일:** `supabaseClient.js`, `app.js`, `shared-layout.js`, `index.html`

### 1-1. `googleAuth.js` 신규 생성

```javascript
// ============================================
// Google Auth 모듈
// GIS Token Model 기반 로그인/로그아웃/scope 관리
// ============================================

const GoogleAuth = {
  CLIENT_ID: 'YOUR_CLIENT_ID.apps.googleusercontent.com',

  // 메모리에만 보관 (localStorage 저장 금지)
  _tokenClient: null,
  _accessToken: null,
  _user: null,       // { sub, email, name, picture }
  _grantedScopes: [],

  // 초기화 — GIS 라이브러리 로드 후 호출
  init() { ... },

  // 로그인 — openid email profile scope만 요청
  signIn() {
    this._tokenClient.requestAccessToken({ scope: 'openid email profile' });
  },

  // 로그아웃
  signOut() { ... },

  // token 응답 처리 → userinfo 조회 → bhm_settings 저장
  async _handleTokenResponse(resp) { ... },

  // https://www.googleapis.com/oauth2/v3/userinfo 조회
  async _fetchUserInfo(token) { ... },

  // 상태 조회
  isSignedIn()     { return !!this._accessToken; },
  getAccessToken() { return this._accessToken; },
  getUser()        { return this._user; },

  // 증분 scope 요청 (기능 활성화 시 호출)
  requestDriveScope()    { this._tokenClient.requestAccessToken({ scope: 'https://www.googleapis.com/auth/drive.appdata', include_granted_scopes: true }); },
  requestCalendarScope() { this._tokenClient.requestAccessToken({ scope: 'https://www.googleapis.com/auth/calendar.events', include_granted_scopes: true }); },
  hasScope(scope)        { return this._grantedScopes.includes(scope); },
};
window.GoogleAuth = GoogleAuth;

// ── bhm_settings 유틸 ──
function loadSettings() {
  try { return JSON.parse(localStorage.getItem('bhm_settings') || '{}'); } catch { return {}; }
}
function saveSettings(partial) {
  localStorage.setItem('bhm_settings', JSON.stringify({ ...loadSettings(), ...partial }));
}
window.loadSettings = loadSettings;
window.saveSettings = saveSettings;
```

### 1-2. `getUserStorageKey` 교체

**수정 파일:** `supabaseClient.js:17-20`

```javascript
// Before:
function getUserStorageKey(baseKey) {
    const uid = window.SupabaseUser ? window.SupabaseUser.id : 'guest';
    return `${baseKey}_${uid}`;
}

// After:
function getUserStorageKey(baseKey) {
    const settings = JSON.parse(localStorage.getItem('bhm_settings') || '{}');
    const uid = settings.googleSub || 'guest';
    return `${baseKey}_${uid}`;
}
```

**주의:** `googleAuth.js`가 `supabaseClient.js`보다 먼저 로드되어야 한다. `window.getUserStorageKey`는 뒤에 로드된 파일이 덮어쓰므로, `index.html` 스크립트 순서를 확인한다.

### 1-3. `isFamilyMode` 제거

**수정 파일:** `supabaseClient.js:8-10`
```javascript
// 제거 대상
const urlParams = new URLSearchParams(window.location.search);
window.isFamilyMode = urlParams.get('mode') === 'family';
```

**수정 파일:** `app.js:449-460`
```javascript
// Before:
window.isFamilyMode = urlParams.get('mode') === 'family';
const authContainer = document.getElementById('authContainer');
const backupSection = document.getElementById('localBackupSection');
if (!window.isFamilyMode) {
  if (authContainer) authContainer.style.display = 'none';
  if (backupSection) backupSection.style.display = 'block';
} else {
  if (authContainer) authContainer.style.display = 'flex';
  if (backupSection) backupSection.style.display = 'none';
}

// After:
const authContainer = document.getElementById('authContainer');
const backupSection = document.getElementById('localBackupSection');
if (authContainer) authContainer.style.display = 'flex';   // 항상 표시
if (backupSection) backupSection.style.display = 'block';  // 항상 표시
```

### 1-4. `authContainer` UI 교체

**수정 파일:** `shared-layout.js:62-68` — authContainer 초기 버튼 onclick 교체

```javascript
// Before:
authBtn.onclick = function () { if (window.SupabaseSync) window.SupabaseSync.signInWithGoogle(); };

// After:
authBtn.onclick = function () { if (window.GoogleAuth) window.GoogleAuth.signIn(); };
```

**수정 파일:** `index.html` 의 `updateAuthUI()` 함수 교체

로그인 전:
```html
<button onclick="GoogleAuth.signIn()" class="btn btn-primary" ...>
  <span style="...">G</span> Google로 연결
</button>
```

로그인 후:
```html
<div>
  <img src="{user.picture}" ...>
  <div>
    <span>{user.name}</span>
    <div class="status-chips">
      <span class="chip safe">계정 연결됨</span>
      <span class="chip warn" id="backupStatusChip">백업 꺼짐</span>
      <span class="chip warn" id="calendarStatusChip">캘린더 꺼짐</span>
    </div>
  </div>
  <button onclick="GoogleAuth.signOut()">연결 해제</button>
</div>
```

### 1-5. `index.html` 스크립트 로드 순서

GIS CDN과 `googleAuth.js`를 **기존 supabaseClient.js보다 먼저** 추가:

```html
<!-- Google Identity Services -->
<script src="https://accounts.google.com/gsi/client" async defer></script>
<script src="googleAuth.js?v=1.0"></script>

<!-- 기존 유지 (앱 인프라용) -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabaseClient.js?v=1.4"></script>
```

`googleAuth.js` 내 `getUserStorageKey`가 `supabaseClient.js`보다 먼저 정의되므로, `supabaseClient.js:17-20`의 동일 함수 정의는 단순 재정의(무시)된다.

### 1-6. `?mode=family` 안내 배너

**수정 파일:** `app.js` 초기화 부분 상단

```javascript
// ?mode=family 구버전 URL 접속 안내
if (new URLSearchParams(window.location.search).get('mode') === 'family') {
  setTimeout(() => {
    showToast('이제 Google 로그인으로 기록을 보관할 수 있어요. 오른쪽 상단 "Google로 연결"을 눌러보세요.', 6000);
  }, 1500);
}
```

### Phase 1 완료 기준

- [ ] Google 로그인 팝업 → 계정 선택 → 헤더에 이름/아바타 + 상태 배지 표시
- [ ] "연결 해제" → 로그인 버튼으로 복원
- [ ] 비로그인 상태에서 프로필/시간외/휴가 CRUD 정상 동작
- [ ] `localStorage.getItem('bhm_hr_profile_guest')` → `bhm_hr_profile_{googleSub}` 키 전환 확인
- [ ] `?mode=family` 접속 시 안내 토스트 표시
- [ ] Supabase Admin `/admin` 정상 접근 (회귀 없음)

### Phase 1 배포

```
Vercel Preview → QA 체크리스트 통과 → Production
```

---

## Phase 2: Drive 백업

**신규 파일:** `googleDriveStore.js`, `syncManager.js`  
**수정 파일:** `leave.js`, `overtime.js`, `profile.js`, `salary-parser.js`, `app.js`, `index.html`

### 2-1. `googleDriveStore.js` 신규 생성

**Drive API Base URL:** `https://www.googleapis.com`

```javascript
const GoogleDriveStore = {
  // appDataFolder 파일 목록에서 name으로 조회 → 없으면 빈 JSON으로 생성
  // fileId를 bhm_settings.driveFileIds[name]에 캐시
  async ensureAppDataFile(name) { ... },

  // GET /drive/v3/files/{fileId}?alt=media
  async readJsonFile(name) { ... },

  // 파일 있으면 PATCH, 없으면 POST (multipart)
  // 래퍼: { schemaVersion: 1, updatedAt, deviceId, data }
  async writeJsonFile(name, data) { ... },

  // DELETE /drive/v3/files/{fileId}
  async deleteJsonFile(name) { ... },

  // Binary upload (급여명세서 PDF 원본)
  async uploadPdf(name, blob) { ... },

  // 내부 유틸
  _getFileId(name)  { return loadSettings().driveFileIds?.[name]; },
  _setFileId(name, id) { saveSettings({ driveFileIds: { ...loadSettings().driveFileIds, [name]: id } }); },
  _headers()        { return { Authorization: `Bearer ${GoogleAuth.getAccessToken()}` }; },
};
window.GoogleDriveStore = GoogleDriveStore;
```

**에러 처리 매트릭스:**

| HTTP 코드 | 처리 |
|-----------|------|
| 401 | `GoogleAuth.requestDriveScope()` → 1회 재시도 |
| 403 | 토스트: "Google Drive 권한이 필요합니다" |
| 404 | `_setFileId(name, null)` → `ensureAppDataFile` 재실행 |
| 429 | 토스트: "잠시 후 다시 시도해주세요" |
| 5xx | 토스트: "Google 서비스 일시 오류", 로컬 유지 |

### 2-2. `syncManager.js` 신규 생성

```javascript
const SyncManager = {
  DEBOUNCE_MS: 3000,
  _timers: {},

  // 디바운스: 동일 dataType 3초 내 중복 호출 병합
  enqueuePush(dataType, ...args) {
    clearTimeout(this._timers[dataType]);
    this._timers[dataType] = setTimeout(() => this.pushToDrive(dataType, ...args), this.DEBOUNCE_MS);
  },

  // dataType별 로컬 데이터 읽기 → Drive 업로드
  async pushToDrive(dataType, year, month) {
    if (!GoogleAuth.isSignedIn() || !loadSettings().googleBackupEnabled) return;
    // dataType: 'profile' | 'overtime' | 'leave' | 'payslip'
    ...
  },

  // Drive 3개 파일 읽기 → localStorage 복원 → UI 갱신
  async pullFromDrive() { ... },

  // 로그인 직후 1회 실행 (pull → conflict resolve → push if needed)
  async fullSync() { ... },

  // _guest → _sub 키 마이그레이션
  // UUID 패턴 키도 감지하여 googleSub 키로 복사 (기존 Supabase 사용자 대응)
  migrateGuestData(googleSub) {
    const patterns = [
      { old: 'bhm_hr_profile_guest', new: `bhm_hr_profile_${googleSub}` },
      { old: 'overtimeRecords_guest', new: `overtimeRecords_${googleSub}` },
      { old: 'leaveRecords_guest',    new: `leaveRecords_${googleSub}` },
      { old: 'otManualHourly_guest',  new: `otManualHourly_${googleSub}` },
    ];
    // UUID 패턴(기존 Supabase id) 키도 복사
    const uuidPattern = /^(bhm_hr_profile|overtimeRecords|leaveRecords|otManualHourly)_([0-9a-f-]{36})$/;
    ...
  },

  // updatedAt 비교 (동일 시 remote 우선)
  resolveConflict(local, remote) {
    if (!local) return remote;
    if (!remote) return local;
    return (local.updatedAt || '') >= (remote.updatedAt || '') ? local : remote;
  },

  // UI 새로고침
  _refreshUI() { /* PROFILE.applyToForm, initOvertimeTab, initLeaveTab */ },
};
window.SyncManager = SyncManager;
```

### 2-3. CRUD hook 교체

**수정 파일:** `leave.js`, `overtime.js`, `profile.js`, `salary-parser.js`

각 위치의 `SupabaseSync` 호출을 `SyncManager.enqueuePush()`로 교체:

| 파일 | 기존 | 교체 |
|------|------|------|
| `leave.js:137-139` | `SupabaseSync.pushCloudData('leave_records', record)` | `SyncManager.enqueuePush('leave')` |
| `leave.js:175-177` | 동일 | 동일 |
| `leave.js:194-196` | `SupabaseSync.deleteCloudRecord('leave_records', id)` | `SyncManager.enqueuePush('leave')` |
| `overtime.js:47-50` | `SupabaseSync.pushCloudData('overtime_records', record)` | `SyncManager.enqueuePush('overtime')` |
| `overtime.js:63-65` | 동일 | 동일 |
| `overtime.js:82-84` | `SupabaseSync.deleteCloudRecord('overtime_records', id)` | `SyncManager.enqueuePush('overtime')` |
| `profile.js:41-45` | `SupabaseSync.pushCloudData('profiles', profile)` | `SyncManager.enqueuePush('profile')` |
| `salary-parser.js:909` 이후 | 없음 (신규) | `SyncManager.enqueuePush('payslip', year, month)` |

### 2-4. 백업 UI 추가

**수정 파일:** `index.html` — `localBackupSection` 위에 추가

```html
<div id="googleBackupSection" class="card" style="display:none; max-width:600px; margin:20px auto 0;">
  <div class="card-title">
    <span class="icon indigo">☁️</span> Google Drive 백업
  </div>
  <p id="googleBackupStatusText" style="font-size:var(--text-body-normal); color:var(--text-muted);">
    백업이 꺼져 있습니다.
  </p>
  <div class="form-row" style="grid-template-columns:1fr 1fr;">
    <button id="btnToggleDriveBackup" class="btn btn-outline">☁️ Google 백업 켜기</button>
    <button id="btnDriveSyncNow" class="btn btn-outline" disabled>🔄 지금 동기화</button>
  </div>
  <p id="lastDriveSyncInfo" style="font-size:0.7rem; color:var(--text-muted); margin-top:6px; display:none;">
    마지막 동기화: <span id="lastDriveSyncTime">-</span>
  </p>
</div>
```

### 2-5. `app.js` 초기화 수정

```javascript
// syncCloudData 함수 제거 (app.js:464-608)
// 대신 GoogleAuth 로그인 완료 콜백에 SyncManager 연결

// GoogleAuth 초기화 후:
GoogleAuth.onSignIn = async (user) => {
  updateAuthUI(user);
  SyncManager.migrateGuestData(user.sub);
  await SyncManager.fullSync();
};
```

### Phase 2 완료 기준

- [ ] 프로필 저장 → `appDataFolder/profile.json` 업데이트 확인 (Drive 직접 확인)
- [ ] 시간외 추가 → `overtime.json` 업데이트
- [ ] 휴가 추가 → `leave.json` 업데이트
- [ ] 급여명세서 파싱 → `payslips/payslip_YYYY_MM.json` 생성
- [ ] 시크릿 모드 로그인 → 복원 선택 화면 → 복원 확인
- [ ] 오프라인 저장 → 로컬 성공, 토스트만 표시
- [ ] 기존 파일 백업/복원 기능 정상 (회귀 없음)

### Phase 2 배포

```
Vercel Preview → QA 체크리스트 통과 → Production
```

---

## Phase 3: 휴가 → Google Calendar 연동

**신규 파일:** `googleCalendarSync.js`  
**수정 파일:** `leave.js`, `index.html`

> Phase 2와 병렬 개발 가능. GoogleAuth만 있으면 시작 가능.

### 3-1. `googleCalendarSync.js` 신규 생성

**Calendar API Base URL:** `https://www.googleapis.com/calendar/v3`

```javascript
const GoogleCalendarSync = {

  // googleEventId 있으면 PUT, 없으면 POST
  // 성공 시 record에 googleEventId, calendarSyncStatus='synced', calendarLastSyncedAt 저장
  async createOrUpdateEvent(record) { ... },

  // DELETE /calendars/{calendarId}/events/{eventId}
  // 성공 시 record에서 googleEventId 제거
  async deleteEvent(record) { ... },

  // calendarList에서 "SNUH Mate 휴가" 검색, 없으면 POST /calendars 생성
  // calendarId를 settings.googleCalendarId에 저장
  async ensureDedicatedCalendar() { ... },

  // 해당 월 전체 leave record → Calendar 재동기화
  async resyncMonth(year, month) { ... },
  async resyncAll() { ... },

  // settings.googleCalendarEnabled = false
  async disconnect() { ... },

  // leave record → Google Calendar event body
  _buildEventBody(record) {
    const settings = loadSettings();
    const isTimeBased = record.type === 'time_leave';
    const summary = settings.privacyMode === 'detailedTitle'
      ? (LEAVE.types[record.type]?.label || '휴가')
      : '휴가';

    if (isTimeBased) {
      // timed event: 09:00 + hours
      const start = `${record.startDate}T09:00:00+09:00`;
      const endMs = new Date(`${record.startDate}T09:00:00+09:00`).getTime() + (record.hours * 3600000);
      const end = new Date(endMs).toISOString().replace('Z', '+09:00');
      return { summary, start: { dateTime: start, timeZone: 'Asia/Seoul' }, end: { dateTime: end, timeZone: 'Asia/Seoul' }, ... };
    } else {
      // all-day event: end는 +1일 (exclusive)
      const endDate = new Date(record.endDate);
      endDate.setDate(endDate.getDate() + 1);
      return { summary, start: { date: record.startDate }, end: { date: endDate.toISOString().split('T')[0] }, ... };
    }
    // 공통: visibility: 'private', transparency: 'opaque'
    // extendedProperties.private: { bhmLeaveId: record.id, bhmType: record.type, bhmSource: 'bhm_overtime', bhmVersion: '1' }
  },

  _getCalendarId() { return loadSettings().googleCalendarId || 'primary'; },
  _headers() { return { Authorization: `Bearer ${GoogleAuth.getAccessToken()}`, 'Content-Type': 'application/json' }; },
};
window.GoogleCalendarSync = GoogleCalendarSync;
```

**에러 처리:**

| HTTP 코드 | 처리 |
|-----------|------|
| 401 | `GoogleAuth.requestCalendarScope()` → 1회 재시도 |
| 403 | 토스트: "캘린더 권한이 필요합니다" |
| 404 (이벤트) | `googleEventId` 제거 후 새로 생성 |
| 실패 공통 | `record.calendarSyncStatus = 'error'`, 토스트, leave 저장은 롤백 안 함 |

### 3-2. `leave.js` Calendar hook 연결

**주의:** `deleteRecord`에서 splice **전에** record 복사 필수.

```javascript
// addRecord — 141행 이후 (record 생성 완료 후)
if (window.GoogleCalendarSync) {
  window.GoogleCalendarSync.createOrUpdateEvent(record).catch(e =>
    console.warn('[Calendar] addRecord sync failed:', e));
}

// updateRecord — 179행 이후
if (window.GoogleCalendarSync) {
  window.GoogleCalendarSync.createOrUpdateEvent(all[year][idx]).catch(e =>
    console.warn('[Calendar] updateRecord sync failed:', e));
}

// deleteRecord — splice 전에 record 복사
const deletedRecord = { ...all[year][idx] }; // ← 반드시 splice 이전
all[year].splice(idx, 1);
this._saveAll(all);
if (window.SyncManager) window.SyncManager.enqueuePush('leave');
if (window.GoogleCalendarSync) {
  window.GoogleCalendarSync.deleteEvent(deletedRecord).catch(e =>
    console.warn('[Calendar] deleteRecord sync failed:', e));
}
```

### 3-3. Calendar 설정 UI 추가

**수정 파일:** `index.html` — Google 백업 섹션 아래

```html
<div id="googleCalendarSection" class="card" style="display:none; max-width:600px; margin:20px auto 0;">
  <div class="card-title">
    <span class="icon indigo">📅</span> Google Calendar 연동
  </div>
  <p style="font-size:var(--text-body-normal); color:var(--text-muted);">
    휴가를 입력하면 내 Google Calendar에도 자동으로 표시해요.
  </p>
  <div style="display:flex; align-items:center; gap:8px; margin:12px 0;">
    <label class="toggle-switch">
      <input type="checkbox" id="toggleCalendarSync">
      <span class="toggle-slider"></span>
    </label>
    <span>캘린더 자동 동기화</span>
  </div>
  <div id="calendarOptions" style="display:none;">
    <select id="calendarMode">
      <option value="dedicated">전용 캘린더 (SNUH Mate 휴가) — 권장</option>
      <option value="primary">기본 캘린더</option>
    </select>
    <select id="privacyMode" style="margin-top:8px;">
      <option value="genericTitle">일반 — 모두 "휴가"로 표시</option>
      <option value="detailedTitle">상세 — 연차·병가·시간차 등</option>
    </select>
    <div class="form-row" style="grid-template-columns:1fr 1fr; margin-top:12px;">
      <button id="btnResyncMonth" class="btn btn-outline">🔄 이번 달 다시 동기화</button>
      <button id="btnDisconnectCalendar" class="btn btn-outline" style="color:var(--accent-rose);">❌ 연결 해제</button>
    </div>
  </div>
</div>
```

### Phase 3 완료 기준

- [ ] 날짜 단위 휴가 → Google Calendar에 all-day event 생성 확인
- [ ] 시간차 → timed event 생성 확인
- [ ] 휴가 수정 → 기존 이벤트 갱신 확인
- [ ] 휴가 삭제 → 이벤트 삭제 확인
- [ ] 시간외 추가 → Calendar 이벤트 없음 확인
- [ ] Calendar 권한 거부 → 휴가 저장 정상
- [ ] 이벤트 제목 = "휴가" (genericTitle 기본값)
- [ ] "이번 달 다시 동기화" 버튼 동작 확인

### Phase 3 배포

```
Vercel Preview → QA 체크리스트 통과 → Production
```

---

## Phase 4: 급여명세서 PDF 원본 Drive 백업 (별도 opt-in)

**수정 파일:** `salary-parser.js`, `index.html`

### 4-1. PDF 원본 업로드 hook

**수정 파일:** `salary-parser.js` — PDF 파싱 성공 후

```javascript
// 파싱 완료 후 Drive 업로드 제안
if (window.GoogleAuth?.isSignedIn() && loadSettings().googlePdfBackupEnabled) {
  const name = `payslips/original_${year}_${String(month).padStart(2, '0')}.pdf`;
  GoogleDriveStore.uploadPdf(name, originalPdfBlob).catch(e =>
    console.warn('[Drive] PDF upload failed:', e));
}
```

### 4-2. 설정 UI에 PDF 백업 토글 추가

급여명세서 섹션에 별도 토글:
```html
<div class="setting-item">
  <div class="item-copy">
    <strong>급여명세서 원본 PDF 백업</strong>
    <small>급여 내역 원본 파일을 내 Google Drive에 보관해요. 가장 민감한 데이터입니다.</small>
  </div>
  <label class="toggle-switch">
    <input type="checkbox" id="togglePdfBackup">
    <span class="toggle-slider"></span>
  </label>
</div>
```

### Phase 4 완료 기준

- [ ] 급여명세서 PDF 업로드 → `appDataFolder/payslips/original_YYYY_MM.pdf` 생성 확인
- [ ] PDF 백업 꺼짐 상태에서 파싱해도 Drive 업로드 없음 확인

### Phase 4 배포

```
Vercel Preview → QA 통과 → Production
```

---

## Phase 5: 코드 정리

### 의존성

Phase 1-3 전체 **안정화 후** (최소 1주일 운영 후)

### 5-1. SupabaseSync 사용자 데이터 호출 완전 제거

| 파일 | 제거 대상 |
|------|----------|
| `leave.js:137-139` | `SupabaseSync.pushCloudData` 주석 → 실제 삭제 |
| `leave.js:175-177` | 동일 |
| `leave.js:194-196` | `SupabaseSync.deleteCloudRecord` 주석 → 실제 삭제 |
| `overtime.js:47-50`, `63-65`, `82-84` | 동일 패턴 삭제 |
| `profile.js:41-45` | `isFamilyMode && SupabaseSync` 조건 전체 삭제 |
| `app.js` | `window.syncCloudData` 함수 잔재 삭제 |
| `supabaseClient.js:8-10` | `window.isFamilyMode` 설정 라인 삭제 |

> `supabaseClient.js`의 `SupabaseSync` 객체 자체는 유지 (앱 인프라 Admin 인증 등 향후 사용 가능).

### 5-2. `?mode=family` 안내 배너 제거

`app.js`에서 mode=family 감지 배너 코드 제거.

### Phase 5 완료 기준

```bash
# 아래 결과가 0건이어야 함
grep -r "isFamilyMode" *.js
grep -r "SupabaseSync\.pushCloudData\|SupabaseSync\.deleteCloudRecord" *.js
```

---

## 리스크 및 완화

| 리스크 | 영향도 | 완화 방법 |
|--------|--------|----------|
| GCP OAuth 동의 화면 심사 지연 | High | 개발 중 Test Users에 10명 추가로 먼저 사용 |
| access_token 만료 (1시간 TTL) | Medium | 401 감지 시 자동 scope 재요청 → 1회 재시도 |
| Drive rate limit (100 req/100s) | Low | 3초 디바운스로 충분히 방어 |
| `leave.js` deleteRecord에서 splice 전 record 복사 누락 | High | 구현 체크리스트에 명시, Phase 3 QA에서 삭제 테스트 필수 |
| `getUserStorageKey` 교체 시 기존 Supabase UUID 키 접근 불가 | High | `migrateGuestData`에서 UUID 패턴 감지 후 googleSub 키로 복사 |
| Calendar `end.date`가 +1일 아닌 경우 당일 종일 이벤트가 안 만들어짐 | Medium | `_buildEventBody` 단위 테스트 (수동으로 날짜 경계 케이스 확인) |

---

## 수정 파일 전체 목록

### 신규 파일 (4개)

| 파일 | Phase | 역할 |
|------|-------|------|
| `googleAuth.js` | 1 | GIS 인증, scope 관리, bhm_settings 유틸 |
| `googleDriveStore.js` | 2 | Drive appDataFolder CRUD |
| `syncManager.js` | 2 | 동기화 오케스트레이션, 디바운스, 충돌 해결 |
| `googleCalendarSync.js` | 3 | Calendar 이벤트 CRUD |

### 수정 파일 (8개)

| 파일 | Phase | 변경 내용 |
|------|-------|----------|
| `index.html` | 1, 2, 3 | GIS script, updateAuthUI 교체, 백업/Calendar UI 추가 |
| `app.js` | 1, 2 | isFamilyMode 제거, syncCloudData 제거, SyncManager 연결 |
| `shared-layout.js` | 1 | authContainer onclick 교체 |
| `supabaseClient.js` | 1, 5 | getUserStorageKey 교체, isFamilyMode 제거 |
| `leave.js` | 2, 3 | SyncManager hook + Calendar hook (splice 전 복사 추가) |
| `overtime.js` | 2 | SyncManager hook |
| `profile.js` | 2 | SyncManager hook |
| `salary-parser.js` | 2, 4 | SyncManager hook, PDF 업로드 hook |
