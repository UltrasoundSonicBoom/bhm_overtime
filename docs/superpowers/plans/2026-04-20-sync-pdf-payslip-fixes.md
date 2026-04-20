# Sync 복구 + PDF 경로 재설계 + 급여명세서 반영 복구 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** (1) 오늘 적용한 `hasValidToken()` 가드로 인해 차단된 Drive 동기화 복구 + (2) PDF 저장 경로를 `snuhmate/YYMM/YYMM_[title].pdf` 로 재설계 + (3) 급여명세서 업로드 시 개인정보/근무정보 자동 반영 복구.

**Architecture:**
- Sync: `_driveReady()` 의 `hasValidToken()` 가드 제거 → `enqueuePush`/`pullOnResume` 진입부에서 `refreshToken()` 먼저 시도 → 실패 시 조용히 스킵 (GIS `error_callback` 으로 팝업 차단)
- PDF: `uploadPdfToMyDrive(fileName, blob, ym)` 시그니처 확장 → `snuhmate/YYMM/` 하위 폴더에 저장, 파일명은 `YYMM_[title].pdf` 규약
- Payslip propagation: `salary-parser.js:applyStableItemsToProfile()` 에서 grade/year 매핑 일원화 + 프로필 갱신 조건 완화 + `_propagatePayslipToWorkHistory()` 신규

**조사 결과 요약 (2026-04-20 Explore agent 2종):**

| 이슈 | 근본 원인 | 수정 지점 |
|------|---------|---------|
| 로그인 후 동기화 안됨, 확장탭 데이터 안 뜸 | `syncManager.js:119-126` `_driveReady()` 에 넣은 `hasValidToken()` 가드가 토큰 만료 시 sync 를 영영 차단 | `_driveReady()` 에서 가드 제거 + `refreshToken()` 자동화 |
| 로그아웃 시 데이터 사라짐 (perceived) | `getUserStorageKey()` 가 `_guest` 리턴 → 기존 `_<googleSub>` 데이터 접근 불가. 재로그인 시 `migrateGuestData+pullFromDrive` 로 복구되긴 함 | **이번 플랜 범위 아님** (재로그인 시 복구되면 OK). 필요 시 추후 로그아웃 전 Drive flush 를 추가. |
| 확장탭 입력 → 메인앱 20초 쿨다운 | `pullOnResume` RESUME_COOLDOWN_MS=20s | `extensionBridge.js` `quickCapture()` 에서 `enqueuePush` 뒤 즉시 `pullFromDrive()` 호출 (optional, Task 5) |
| PDF 저장 경로 `BHM Overtime/급여명세서/{name}` | 명세와 불일치 | `snuhmate/YYMM/YYMM_[title].pdf` 로 변경 |
| 급여명세서 → `profile.grade/year` 매핑 없음 | `salary-parser.js:PAYSLIP_TO_PROFILE_MAP` 에 `payGrade` 없음 | `applyStableItemsToProfile()` 에 grade/year 파싱 추가 |
| 급여명세서 → `profile.hireDate/department` 갱신 안됨 | `if (!profile.x)` 비어있을 때만 업데이트 | 항상 최신 값으로 갱신 |
| 급여명세서 → 근무정보 자동 반영 없음 | 연결 코드 아예 없음 | `_propagatePayslipToWorkHistory()` 신규 |

**Tech Stack:** Vanilla JS (ES5 스타일), localStorage, Google Drive API v3 (fetch + GIS token), defer scripts.

---

## Task 1: Drive 동기화 복구 (hasValidToken 가드 해제 + refreshToken 자동화)

**Files:**
- Modify: `syncManager.js` (`_driveReady`, `enqueuePush` 진입부, `pullOnResume`)
- Modify: `app.js:3630` (handlePayslipUpload Drive guard)
- Modify: `payroll-views.js:602` (handleInlineUpload Drive guard)
- Modify: `googleAuth.js` `initTokenClient` 에 `error_callback` 추가 (팝업 방지)
- Bump: `index.html` `syncManager.js?v=2.7`, `app.js?v=2.7`, `payroll-views.js?v=1.5`, `googleAuth.js?v=2.5`

**배경:** 토큰 만료 시 `hasValidToken()` false → `_driveReady()` false → sync 영구 차단. 동시에 Bug #2 (계정 선택창 팝업) 를 막기 위해 가드를 넣었지만, sync 자체가 안 돌면 사용자가 저장한 데이터가 Drive 에 안 올라감.

**해결 방향:** 가드 제거 + `refreshToken()` 시도 + 실패 시 조용히 스킵 (팝업 X). 팝업 방지를 위해 GIS `error_callback` 설정.

- [ ] **Step 1: `googleAuth.js` `initTokenClient` 에 `error_callback` 추가**

위치: `googleAuth.js` 의 `_initTokenClient()` (GIS `initTokenClient` 호출부).

```javascript
_tokenClient = google.accounts.oauth2.initTokenClient({
  client_id: _clientId,
  scope: SCOPES.join(' '),
  callback: function (tokenResponse) { /* 기존 코드 */ },
  error_callback: function (err) {
    // silent refresh 실패 시 조용히 처리 — 팝업/리다이렉트 방지
    console.warn('[GoogleAuth] token error_callback:', err && err.type, err && err.message);
    _tokenRequestInFlight = false;
    var reject;
    while ((reject = _pendingTokenQueue.shift())) {
      try { reject.reject(new Error('token_error: ' + (err && err.type || 'unknown'))); } catch (e) {}
    }
  },
});
```

- [ ] **Step 2: `syncManager.js:_driveReady()` 에서 `hasValidToken()` 가드 제거**

```javascript
function _driveReady() {
  if (localStorage.getItem('bhm_demo_mode') === '1') return false;
  if (!window.GoogleAuth || !window.GoogleAuth.isSignedIn()) return false;
  // hasValidToken() 가드 제거 — 토큰 만료 시에도 sync 시도. 실제 API 호출 직전 _withToken 에서 refreshToken 이 자동 호출됨.
  if (!window.GoogleDriveStore) return false;
  var settings = window.loadSettings ? window.loadSettings() : {};
  return !!settings.driveEnabled;
}
```

- [ ] **Step 3: `syncManager.js:pullOnResume()` 에서 `hasValidToken()` 가드 제거**

```javascript
function pullOnResume() {
  if (!window.GoogleAuth || !window.GoogleAuth.isSignedIn()) return;
  if (typeof window.GoogleAuth.isReady === 'function' && !window.GoogleAuth.isReady()) return;
  // hasValidToken 가드 제거 (Task 1)
  if (!window.GoogleDriveStore) return;
  // ... 기존 나머지 코드
}
```

- [ ] **Step 4: `app.js` `handlePayslipUpload` Drive 가드 원복**

`app.js:3630`
```javascript
if (isPdf && window.GoogleAuth && window.GoogleAuth.isSignedIn() && window.GoogleDriveStore) {
```
(Task 2 에서 `uploadPdfToMyDrive(pdfName, file, ym)` 로 호출부 변경 예정.)

- [ ] **Step 5: `payroll-views.js` `handleInlineUpload` Drive 가드 원복**

`payroll-views.js:602`
```javascript
if (isPdf && _isSignedIn() && window.GoogleDriveStore) {
```

- [ ] **Step 6: 버전 bump + 커밋**

`index.html`: `googleAuth.js?v=2.5`, `syncManager.js?v=2.7`, `app.js?v=2.7`, `payroll-views.js?v=1.5`

커밋 메시지:
```
fix(sync): hasValidToken 가드로 차단된 Drive 동기화 복구 + GIS error_callback

- _driveReady/pullOnResume 에서 hasValidToken 가드 제거 — _withToken 이 필요 시 refreshToken 자동 호출
- initTokenClient 에 error_callback 추가 — silent refresh 실패 시 팝업/리다이렉트 대신 조용히 reject
- 토큰 만료 시 sync 가 영영 차단되던 문제 해결
```

**검증:**
- 로그인 → 시간외 1건 입력 → 30분 대기 (토큰 만료 시뮬레이션은 브라우저 dev tools 에서 `_tokenExpiry = Date.now()` 설정) → 새 데이터 추가 → console 에 token_error 로그만 뜨고 팝업은 안 뜸, 다음 focus 시 sync 성공.
- 확장탭에서 입력 → 메인 앱 focus → 20초 내 재수신 확인.

---

## Task 2: PDF Drive 저장 경로를 `snuhmate/YYMM/YYMM_[title].pdf` 로 변경

**Files:**
- Modify: `googleDriveStore.js:uploadPdfToMyDrive` (시그니처 확장: `(fileName, blob, ym)`)
- Modify: `app.js:3630-3640` (handlePayslipUpload 호출부)
- Modify: `payroll-views.js:602-608` (handleInlineUpload 호출부)
- Bump: `googleDriveStore.js?v=1.2`, `app.js?v=2.7`, `payroll-views.js?v=1.5` (Task 1 과 함께)

**파일명 규약:**
- base: `급여명세서` (ym.type 이 없거나 `'급여'` 인 경우)
- type 별: `급여명세서_연차수당`, `급여명세서_명절상여금` 등 (ym.type 이 있을 때)
- 최종: `YYMM_급여명세서[_<type>].pdf` 예: `2604_급여명세서.pdf`, `2604_급여명세서_연차수당.pdf`

**폴더:**
- root: `snuhmate` (기존 `BHM Overtime` 대체)
- sub: `YYMM` 형태 (예: `2604`)

- [ ] **Step 1: `googleDriveStore.js:uploadPdfToMyDrive` 시그니처 확장**

```javascript
/**
 * @param {string} title - 'YYMM_급여명세서[_type]' 형태 없이 순수 title ('급여명세서' 또는 '급여명세서_연차수당')
 * @param {Blob} blob - PDF 바이너리
 * @param {{year:number, month:number}} ym - 파일명/폴더 prefix 계산용
 */
function uploadPdfToMyDrive(title, blob, ym) {
  if (!ym || !ym.year || !ym.month) {
    console.warn('[DriveStore] uploadPdfToMyDrive: ym 누락');
    return Promise.resolve(null);
  }
  var yy = String(ym.year).slice(-2);
  var mm = String(ym.month).padStart(2, '0');
  var ymPrefix = yy + mm;
  var fileName = ymPrefix + '_' + title + '.pdf';

  return _findOrCreateFolder('snuhmate', null)
    .then(function (rootId) { return _findOrCreateFolder(ymPrefix, rootId); })
    .then(function (folderId) {
      var q = "name='" + fileName.replace(/'/g, "\\'") + "' and '" + folderId + "' in parents and trashed=false";
      return _withToken(function () {
        return fetch(BASE_URL + '/files?q=' + encodeURIComponent(q) + '&fields=files(id)', { headers: _headers() });
      }).then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.files && data.files.length > 0) {
            return _updateFile(data.files[0].id, blob, 'application/pdf');
          } else {
            return _createFile(fileName, blob, 'application/pdf', folderId);
          }
        });
    })
    .catch(function (err) {
      console.warn('[DriveStore] uploadPdfToMyDrive failed:', err);
      _showToast('⚠️ PDF 저장 실패 (내 드라이브).');
    });
}
```

- [ ] **Step 2: `app.js:3630-3640` 호출부 업데이트**

```javascript
if (isPdf && window.GoogleAuth && window.GoogleAuth.isSignedIn() && window.GoogleDriveStore) {
  const typeLabel = ym.type && ym.type !== '급여' ? `_${ym.type}` : '';
  const title = `급여명세서${typeLabel}`;
  window.GoogleDriveStore.uploadPdfToMyDrive(title, file, { year: ym.year, month: ym.month }).then(function (result) {
    if (result) showOtToast('📁 내 드라이브에 PDF 저장됨');
  });
}
```

- [ ] **Step 3: `payroll-views.js:602-608` 호출부 업데이트**

```javascript
if (isPdf && _isSignedIn() && window.GoogleDriveStore) {
  const typeLabel = ym.type && ym.type !== '급여' ? `_${ym.type}` : '';
  const title = `급여명세서${typeLabel}`;
  window.GoogleDriveStore.uploadPdfToMyDrive(title, file, { year: ym.year, month: ym.month }).then(function (r) {
    if (r && typeof showOtToast === 'function') showOtToast('📁 내 드라이브에 PDF 저장됨');
  });
}
```

- [ ] **Step 4: 커밋**

Task 1 과 합쳐서 또는 별도 커밋:
```
feat(drive): PDF 저장 경로를 snuhmate/YYMM/YYMM_[title].pdf 로 재설계

- 폴더 구조: BHM Overtime/급여명세서/ → snuhmate/YYMM/
- 파일명: {fileName} → YYMM_급여명세서[_type].pdf
- uploadPdfToMyDrive(title, blob, ym) 시그니처 확장
```

**검증:**
- 4월 급여명세서 PDF 업로드 → Drive 에서 `snuhmate/2604/2604_급여명세서.pdf` 확인
- 4월 연차수당 PDF 업로드 → `snuhmate/2604/2604_급여명세서_연차수당.pdf` 확인
- 기존 `BHM Overtime/급여명세서/` 폴더는 그대로 (수동 정리는 사용자 몫 — 마이그레이션 없음)

---

## Task 3: 급여명세서 → 개인정보 자동 반영 강화 (grade/year 매핑 + 최신화)

**Files:**
- Modify: `salary-parser.js:applyStableItemsToProfile` (라인 1205-1285)
- Remove duplicate: `app.js:_applyPayslipEmployeeInfo` (라인 3506-3512) — 중복 처리 제거
- Bump: `salary-parser.js?v=2.6`, `app.js?v=2.7` (Task 1 과 함께)

**배경:** 조사 결과 두 가지 문제 발견:
1. `PAYSLIP_TO_PROFILE_MAP` 에 `payGrade` 매핑이 없어 `grade`/`year` 가 자동 채워지지 않음 → `CALC.calcOrdinaryWage()` 가 필요한 전제 불충족 → 시급 계산 안됨 → overtime 예상 금액 0
2. `if (ei.hireDate && !profile.hireDate)` 로 비어있을 때만 업데이트 → 부서 이동 등 변경사항 반영 불가

- [ ] **Step 1: `salary-parser.js:applyStableItemsToProfile` 에 payGrade 파싱 추가**

`salary-parser.js` 라인 1223-1229 근처 (employeeInfo 를 profile 에 반영하는 블록) 를 다음과 같이 변경:

```javascript
// 기존: 비어있을 때만 반영
// 변경: 명세서가 source of truth — 명세서 값이 있으면 항상 최신화
if (ei.hireDate) profile.hireDate = ei.hireDate;
if (ei.department) profile.department = ei.department;
if (ei.jobType) profile.jobType = ei.jobType;
if (ei.name && !profile.name) profile.name = ei.name; // 이름은 신규 생성 시만
if (ei.employeeNumber && !profile.employeeNumber) profile.employeeNumber = ei.employeeNumber;

// payGrade 파싱: "J3-5" → grade='J3', year=5
if (ei.payGrade) {
  var gm = String(ei.payGrade).match(/([A-Za-z]+\d*)\s*-\s*(\d+)/);
  if (gm) {
    profile.grade = gm[1].toUpperCase();
    profile.year = parseInt(gm[2], 10) || 1;
  }
}
```

- [ ] **Step 2: `app.js:_applyPayslipEmployeeInfo` 중복 제거**

`app.js:3506-3512` 에 있는 payGrade 파싱 로직이 Task 3 Step 1 과 중복. `_applyPayslipEmployeeInfo()` 함수를 삭제하고 호출 지점 (handlePayslipUpload) 에서도 제거. salary-parser 가 일원화된 진입점.

- [ ] **Step 3: 시급/grade 누락 경고 토스트**

`app.js:handlePayslipUpload` 의 `SALARY_PARSER.saveMonthlyData` 호출 직후:

```javascript
const profileAfter = PROFILE.load();
if (!profileAfter.grade || !profileAfter.year) {
  showOtToast('⚠️ 직급/호봉이 자동 설정되지 않았습니다. 내 정보에서 확인해주세요.', 4500);
}
```

- [ ] **Step 4: 회귀 테스트 업데이트**

`tests/` 디렉토리에서 `applyStableItemsToProfile` 관련 테스트가 있으면 "비어있을 때만" 가정을 "항상 최신화" 로 바꾼다. 없으면 skip.

- [ ] **Step 5: 커밋**

```
fix(payslip): 급여명세서 → profile grade/year 자동 매핑 + 최신화

- applyStableItemsToProfile 에 payGrade→grade/year 파싱 추가
- hireDate/department/jobType 을 "비어있을 때만" → "명세서가 source of truth" 로 변경
- _applyPayslipEmployeeInfo (app.js) 중복 제거
- grade 누락 시 토스트 경고
```

**검증:**
- 빈 프로필 + 급여명세서 업로드 → 프로필에 grade=J3, year=5, department, hireDate, jobType 모두 반영
- 기존 프로필 존재 + 새 급여명세서 (부서 변경) → department 갱신 확인
- 프로필의 grade/year 채워진 후 overtime 1건 입력 → estimatedPay > 0 확인

---

## Task 4: 급여명세서 → 근무정보 자동 반영

**Files:**
- Create: `app.js:_propagatePayslipToWorkHistory(parsed, ym)` 신규 함수
- Modify: `app.js:handlePayslipUpload` 호출 추가
- Modify: `payroll-views.js:handleInlineUpload` 호출 추가 (동일 경로 이중화 대응)
- Bump: `app.js?v=2.7`, `payroll-views.js?v=1.5`

**배경:** 급여명세서의 부서 정보와 기간(YYMM) 을 바탕으로 `bhm_work_history_<uid>` 에 자동 배치 이력 생성. 같은 기간 중복 항목은 추가 금지.

- [ ] **Step 1: `_propagatePayslipToWorkHistory` 함수 추가**

`app.js` 내부에 함수 추가 (위치: `_propagatePayslipToOvertime` 근처, 3519 라인 주변):

```javascript
function _propagatePayslipToWorkHistory(parsed, ym) {
  if (!parsed || !parsed.employeeInfo || !ym) return;
  var ei = parsed.employeeInfo;
  if (!ei.department) return;

  var whKey = window.getUserStorageKey ? window.getUserStorageKey('bhm_work_history') : 'bhm_work_history_guest';
  var list = [];
  try { list = JSON.parse(localStorage.getItem(whKey) || '[]') || []; } catch (e) { list = []; }

  var yy = ym.year;
  var mm = ym.month;
  var monthStart = yy + '-' + String(mm).padStart(2, '0') + '-01';
  var lastDay = new Date(yy, mm, 0).getDate();
  var monthEnd = yy + '-' + String(mm).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0');

  // 기존 항목에 이번 월의 배치가 동일 부서로 이미 존재하면 skip
  var hasOverlap = list.some(function (w) {
    if (!w || !w.from) return false;
    if (w.dept !== ei.department) return false;
    // from <= monthEnd AND (to == null OR to >= monthStart) 면 겹침
    var from = w.from;
    var to = w.to || '9999-12-31';
    return from <= monthEnd && to >= monthStart;
  });
  if (hasOverlap) return;

  var entry = {
    id: 'wh_ps_' + yy + mm + '_' + Date.now(),
    workplace: ei.workplace || '서울대학교병원',
    dept: ei.department,
    jobType: ei.jobType || '',
    from: monthStart,
    to: monthEnd,
    rotations: [],
    source: 'payslip_auto',
  };
  list.push(entry);
  // from 기준 정렬
  list.sort(function (a, b) { return (a.from || '') < (b.from || '') ? -1 : 1; });
  localStorage.setItem(whKey, JSON.stringify(list));

  if (window.SyncManager && typeof window.SyncManager.enqueuePush === 'function') {
    window.SyncManager.enqueuePush('work_history');
  }
}
```

- [ ] **Step 2: `app.js:handlePayslipUpload` 에서 호출**

`_propagatePayslipToOvertime(parsed, ym)` 바로 다음 줄에 추가:
```javascript
_propagatePayslipToWorkHistory(parsed, ym);
```

- [ ] **Step 3: `payroll-views.js:handleInlineUpload` 에서도 호출**

`SALARY_PARSER.saveMonthlyData` 호출 후, PDF Drive 업로드 블록 이전에:
```javascript
if (typeof window._propagatePayslipToWorkHistory === 'function') {
  window._propagatePayslipToWorkHistory(result, ym);
}
```
→ 이를 위해 `app.js` 에서 함수를 `window._propagatePayslipToWorkHistory = _propagatePayslipToWorkHistory;` 로 노출.

- [ ] **Step 4: SyncManager 에 `work_history` 푸시 타입 존재 확인**

`syncManager.js` 의 `enqueuePush` 가 처리하는 타입 목록에 `work_history` 가 있는지 grep. 없으면 추가. (MIGRATE_KEYS 에는 Task 3 전 버전에서 이미 추가됨, push 타입은 별개).

- [ ] **Step 5: 커밋**

```
feat(payslip): 급여명세서 → 근무정보 자동 배치 이력 생성

- _propagatePayslipToWorkHistory: 명세서의 department + ym 으로 work_history 항목 생성
- 같은 부서+월 중복 감지 (skip)
- source='payslip_auto' 태그로 사용자 수동 입력과 구분
- app.js + payroll-views.js 양쪽 업로드 경로에서 호출 (CLAUDE.md 업로드 경로 이중화 원칙 준수)
```

**검증:**
- 빈 근무정보 + 4월 급여명세서 (부서=혈관조영실) 업로드 → `bhm_work_history_<uid>` 에 `{from: '2026-04-01', to: '2026-04-30', dept: '혈관조영실', source: 'payslip_auto'}` 항목 생성
- 동일 부서로 4월 급여명세서 재업로드 → 중복 생성 안됨
- 다른 부서로 5월 급여명세서 업로드 → 새 항목 추가

---

## Task 5: 확장탭 입력 즉시 메인앱 반영 (pullOnResume 쿨다운 우회)

**Files:**
- Modify: `extensionBridge.js:quickCapture` (라인 31-65) — `enqueuePush` 직후 로컬 UI 만 갱신, Drive pull 은 하지 않음 (데이터는 이미 로컬에 있으므로)
- Modify: `chrome-extension/background.js` — 메시지 전송 시 메인앱 탭에 `FORCE_PULL_AFTER_CAPTURE` 핸들러 없음 확인

**배경:** 확장탭은 메인앱의 content-script 를 통해 동일 localStorage 에 씀. 따라서 Drive pull 은 필요 없음 — 로컬 UI refresh 만 즉시 되면 됨. 조사 결과상 `refreshOtCalendar()` 호출은 이미 있음. 실제 문제는 **다른 기기 확장탭** 에서 입력한 경우 — 이건 Drive pull 에 의존.

→ 이번 플랜에선 **같은 기기** 의 확장탭 입력이 즉시 반영되는지만 확인. 안 되면 버그 수정. 다른 기기 케이스는 Task 1 의 sync 복구로 해결됨 (20초 쿨다운은 허용 가능).

- [ ] **Step 1: `extensionBridge.js:quickCapture` 코드 검토**

현재 구현 확인: 저장 → `enqueuePush` → `refreshOtCalendar()` + 토스트. 만약 `refreshOtCalendar()` 가 탭별로만 작동하거나 현재 탭이 home 이 아니면 안 보이는 케이스가 있는지 확인.

- [ ] **Step 2: 필요 시 전역 UI 갱신 이벤트 발송**

만약 Step 1 에서 탭 전환 시 미반영 케이스가 발견되면:
```javascript
window.dispatchEvent(new CustomEvent('bhm:data-changed', { detail: { type: 'overtime', source: 'extension' } }));
```
각 뷰가 이 이벤트 구독해서 본인 탭이면 refresh. (이미 유사 패턴 있으면 따름.)

- [ ] **Step 3: 커밋 (수정 있을 시만)**

```
fix(extension): 확장탭 입력 시 메인앱 전역 UI 갱신 이벤트 발송
```

**검증:**
- 로그인 상태 + 메인앱 급여탭 열어둠 → 확장탭에서 시간외 1건 입력 → 토스트 뜨고, 급여탭으로 전환 시 calc 카드에 반영되어 있음 (기존 탭에 있을 때도 달력 갱신 확인).

---

## 실행 순서

1. **Task 1** (동기화 복구) — **최우선**. 이게 깨진 상태면 Task 2~5 검증 자체가 불가능.
2. **Task 3** (profile 매핑) — Task 4 의 전제 (grade/year 가 있어야 시급 계산 체인 완전).
3. **Task 4** (work_history 자동 반영).
4. **Task 2** (PDF 경로 재설계) — 독립. Task 1 과 병합 커밋 가능.
5. **Task 5** (확장탭 즉시 반영) — 조사 후 버그 없으면 skip.

모든 Task 완료 후 `index.html` 의 버전 문자열 최종 점검 + `main` 브랜치 push.
