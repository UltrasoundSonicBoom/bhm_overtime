# Extension Leave UX + Logout Cleanup + E2E Verification Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3 fixes — (1) leave tab에 시간차 UX 추가, (2) 로그아웃 시 모든 bhm_* 키 완전 삭제, (3) PIN 동기화 E2E 시나리오 A/B/C 검증

**Architecture:**
- 시간차: `leave.js`에서 `time_leave` 타입 선택 시 시간 입력 표시, 나머지 타입은 날짜 범위 표시 (snuhmate.com `leave-tab.js calcLvTimeHours` 로직 그대로 적용)
- 로그아웃: `auth.js signOut`에서 `chrome.storage.local.get(null)` → `bhm_` 접두어 키 전부 삭제
- E2E: `chrome-extension/tests/e2e-scenarios.md` — 수동 체크리스트

**Tech Stack:** Chrome Extension MV3, chrome.storage.local, chrome.identity.launchWebAuthFlow

**Worktree:** `.worktrees/ext-standalone` — 모든 변경은 이 경로 기준

---

### Task 1: leave.js — 반차 → 시간차, 시간 입력 UX

**Files:**
- Modify: `chrome-extension/screens/leave.js`

**Context:**
snuhmate.com `leave-tab.js:638-655`의 `calcLvTimeHours` 로직:
- `hours = (et_h + et_m/60) - (st_h + st_m/60)` (음수면 +24h 보정)
- 4시간 이상이면 점심 1시간 차감: `if (hours >= 4) hours -= 1`
- `days = round(hours / 8, 1자리)`

현재 `leave.js`의 `LEAVE_TYPES` 두 번째 항목이 `{id:'half',label:'반차',cal:false}`.
이것을 `{id:'time_leave',label:'시간차',isTimeBased:true}`로 교체.

시간차 선택 시:
- 종료일 입력(`#le`)과 시작(`#ls`) 숨김 → 시간 입력 표시
- 기본값: 시작 `09:00`, 종료 `18:00`
- 점심 포함 계산: 8h → 7h → 0.875일 (반올림 0.9일)
- info-bar에 `X시간 = Y일` 표시

시간차 저장 레코드: `{..., hours: X, days: Y, startTime:'HH:MM', endTime:'HH:MM'}`

- [ ] **Step 1: LEAVE_TYPES 배열에서 반차 교체**

```javascript
var LEAVE_TYPES=[
  {id:'annual',    label:'연차',   cal:false},
  {id:'time_leave',label:'시간차', isTimeBased:true},
  {id:'sick',      label:'병가',   cal:true},
  {id:'ceremony',  label:'경조사', cal:false},
  {id:'unpaid',    label:'무급',   cal:false},
  {id:'other',     label:'기타',   cal:false},
];
```

- [ ] **Step 2: container 마크업에 시간 입력 영역 추가**

기존 날짜 행(`#ls`/`#le`)을 `id="ldates"` 래퍼로 감싸고,
바로 뒤에 숨겨진 `id="ltimes"` 시간 입력 행 추가:

```
<div id="ldates" style="display:flex;gap:6px;margin-bottom:10px">
  시작일 #ls + 종료일 #le
</div>
<div id="ltimes" style="display:none;margin-bottom:10px">
  <div style="display:flex;gap:6px;align-items:center">
    시작시간 #lst (type=time, value=09:00)
    ~
    종료시간 #let (type=time, value=18:00)
  </div>
</div>
```

- [ ] **Step 3: 타입 선택 시 UI 토글 (날짜 ↔ 시간)**

leave-type-item onclick 내부:

```javascript
var isTime = (LEAVE_TYPES.find(function(t){ return t.id === selType; })||{}).isTimeBased;
container.querySelector('#ldates').style.display = isTime ? 'none' : 'flex';
container.querySelector('#ltimes').style.display = isTime ? 'block' : 'none';
recalc();
```

- [ ] **Step 4: 시간 입력 oninput 등록 + recalc 시간차 분기 추가**

```javascript
container.querySelector('#lst').oninput = recalc;
container.querySelector('#let').oninput = recalc;
```

recalc 내부 분기:

```javascript
function recalc(){
  var li = container.querySelector('#li');
  var t = LEAVE_TYPES.find(function(x){ return x.id === selType; });
  if (t && t.isTimeBased) {
    var st = container.querySelector('#lst').value;
    var et = container.querySelector('#let').value;
    if (!st || !et) { li.textContent = '시간을 선택하세요'; return; }
    var sh = parseInt(st), sm = parseInt(st.split(':')[1] || 0);
    var eh = parseInt(et), em = parseInt(et.split(':')[1] || 0);
    var hours = (eh + em/60) - (sh + sm/60);
    if (hours < 0) hours += 24;
    if (hours >= 4) hours -= 1;
    hours = Math.max(0, hours);
    var days = Math.round(hours / 8 * 10) / 10;
    li.textContent = '📊 ' + hours.toFixed(1) + '시간 = ' + days.toFixed(1) + '일';
    return;
  }
  var s = container.querySelector('#ls').value;
  var e = container.querySelector('#le').value;
  if (!s || !e || s > e) { li.textContent = '날짜를 선택하세요'; return; }
  var days2 = calcLeaveDays(s, e, t.cal || false);
  li.textContent = '📊 ' + days2 + '일 신청';
}
```

- [ ] **Step 5: save()에 시간차 분기 추가**

save 내부:

```javascript
async function save(){
  var btn = container.querySelector('#lb'), ss = container.querySelector('#lss');
  btn.disabled = true;
  var t = LEAVE_TYPES.find(function(x){ return x.id === selType; });
  var rec;
  if (t && t.isTimeBased) {
    var st = container.querySelector('#lst').value;
    var et = container.querySelector('#let').value;
    if (!st || !et) {
      ss.textContent = '시간 입력 필요'; ss.className = 'status-msg err';
      btn.disabled = false; return;
    }
    var sh = parseInt(st), sm = parseInt(st.split(':')[1] || 0);
    var eh = parseInt(et), em = parseInt(et.split(':')[1] || 0);
    var hours = (eh + em/60) - (sh + sm/60);
    if (hours < 0) hours += 24;
    if (hours >= 4) hours -= 1;
    hours = Math.max(0, Math.round(hours * 10) / 10);
    var days = Math.round(hours / 8 * 10) / 10;
    var today2 = container.querySelector('#ls').value || todayStr;
    rec = {
      id: 'lv_' + Date.now(), type: selType,
      startDate: today2, endDate: today2,
      startTime: st, endTime: et,
      hours: hours, days: days,
      reason: container.querySelector('#lr').value.trim(),
      createdAt: new Date().toISOString()
    };
  } else {
    var s = container.querySelector('#ls').value;
    var e = container.querySelector('#le').value;
    if (!s || !e || s > e) {
      ss.textContent = '날짜 확인'; ss.className = 'status-msg err';
      btn.disabled = false; return;
    }
    var d2 = calcLeaveDays(s, e, t.cal || false);
    rec = {
      id: 'lv_' + Date.now(), type: selType,
      startDate: s, endDate: e, days: d2,
      reason: container.querySelector('#lr').value.trim(),
      createdAt: new Date().toISOString()
    };
  }
  try {
    var d = await BhmStorage.get([BhmStorage.KEYS.LEAVE]);
    var recs = (d[BhmStorage.KEYS.LEAVE] || []); recs.push(rec);
    await BhmStorage.set({[BhmStorage.KEYS.LEAVE]: recs});
    chrome.runtime.sendMessage({type: 'SYNC_NOW'});
    var label = t.isTimeBased ? rec.hours + '시간' : rec.days + '일';
    ss.textContent = '✅ ' + label + ' 저장 완료'; ss.className = 'status-msg ok';
    container.querySelector('#lr').value = '';
    if (!t.isTimeBased) {
      selStart = todayStr; selEnd = todayStr;
      container.querySelector('#ls').value = selStart;
      container.querySelector('#le').value = selEnd;
    }
    renderCal(); recalc();
    setTimeout(function(){ ss.textContent = ''; }, 2000);
  } finally { btn.disabled = false; }
}
```

- [ ] **Step 6: 동작 확인**

수동 검증:
- 연차 선택 → 날짜 범위 보임, 시간 입력 숨김 ✓
- 시간차 선택 → 시간 입력 보임, 날짜 범위 숨김 ✓
- 09:00~18:00 → `8h → 7h (점심차감) = 0.9일` ✓
- 09:00~13:00 → `4h → 3h = 0.4일` ✓
- 09:00~12:00 → `3h (차감없음) = 0.4일` ✓
- 저장 → `{type:'time_leave', hours:7, days:0.9, startTime:'09:00', endTime:'18:00'}` ✓
- 달력에 녹색 점 표시 ✓

- [ ] **Step 7: Commit**

```bash
git add chrome-extension/screens/leave.js
git commit -m "feat(ext/leave): 반차→시간차 UX, 시간 입력·계산 추가 (snuhmate.com 로직 적용)"
```

---

### Task 2: signOut — 모든 bhm_* 키 완전 삭제

**Files:**
- Modify: `chrome-extension/shared/auth.js`

**Context:**
현재 `signOut`은 `BhmStorage.KEYS`에 있는 키들과 `'bhm_last_pdf'`만 삭제.
`payslipKey(y, m)` = `bhm_payslip_YYYY_MM` 같은 동적 키가 누락됨.
로그아웃 후에도 이전 사용자 데이터(급여명세서 등)가 남을 수 있음.

Fix: `chrome.storage.local.get(null)` → 전체 키 조회 → `bhm_` / `_web_` 접두어 모두 삭제.

- [ ] **Step 1: signOut 함수 교체**

```javascript
async signOut(storage) {
  try {
    const d = await new Promise(r => chrome.storage.local.get(['_web_token'], r));
    if (d['_web_token']) {
      await fetch('https://accounts.google.com/o/oauth2/revoke?token=' + d['_web_token']).catch(() => {});
    }
  } catch (_) {}
  await new Promise(resolve => {
    chrome.storage.local.get(null, function(all) {
      const keys = Object.keys(all).filter(k => k.startsWith('bhm_') || k.startsWith('_web_'));
      if (keys.length === 0) { resolve(); return; }
      chrome.storage.local.remove(keys, resolve);
    });
  });
},
```

(기존 `storage.remove(...)` 호출 두 개 모두 제거 — 위 코드가 전부 커버)

- [ ] **Step 2: 검증**

수동 검증 (DevTools → Application → Extension Storage):
- 로그인 후 데이터 저장 확인
- 로그아웃 → chrome.storage.local에 `bhm_*` / `_web_*` 키 없음 확인
- 급여명세서 탭 재오픈 → "최근 감지된 PDF" 없음 ✓
- 재로그인 → 이전 사용자 데이터 없음 ✓

- [ ] **Step 3: 18 tests 통과 확인**

```bash
node chrome-extension/tests/auth.test.js
# 18 passed, 0 failed
```

- [ ] **Step 4: Commit**

```bash
git add chrome-extension/shared/auth.js
git commit -m "fix(ext/auth): signOut시 bhm_*·_web_* 전체 삭제 (동적 키 누락 방지)"
```

---

### Task 3: E2E 검증 — 시나리오별 이슈 및 체크리스트

**Files:**
- Modify: `chrome-extension/screens/login.js`
- Create: `chrome-extension/tests/e2e-scenarios.md`

**Context — 시나리오별 코드 경로 분석 결과:**

**시나리오 A** (첫 로그인, Drive에 PIN 없음):
- `init()` → user 없음 → login 화면 ✓
- 로그인 버튼 → `BhmAuth.getToken(true)` → `launchWebAuthFlow(snuhmate.com web client)`
  - ⚠️ **GCP 이슈**: `...dcbl` 클라이언트의 Authorized redirect URIs에 `chrome.identity.getRedirectURL()` 미등록 시 `redirect_uri_mismatch` 발생 → **모든 시나리오 실패**
- `handleLogin` → pin-setup 표시, PULL_NOW 전송
- background PULL_NOW: `getToken(false)` → 캐시된 web token 사용 ✓ (popup이 방금 캐시)
- Drive applock.json 없음 → `applyApplockData` 반환 false → `_advance` 호출 없음 ✓
- PIN 입력 → `setPin` → SYNC_NOW → applock.json 업로드 ✓

**시나리오 B** (나중에 건너뛰기):
- "나중에" → `onComplete()` 직접 호출 (PIN 저장 안 함)
- 재오픈 → `checkLockState` → `no_pin` → pin-setup 다시 표시 ✓
- 특별한 코드 이슈 없음

**시나리오 C** (snuhmate.com PIN 설정 후):
- 전제: snuhmate.com `applock.json` 형식 = `{schemaVersion:1, updatedAt, deviceId, data:{pinEnabled:true, pinHash, pinSalt, pinLength}}`
- Extension `pullApplock` → `wrapped.data` 추출 → `applyApplockData` ✓
  - `deviceId` 필드는 추가 필드라 무시됨 (호환)
- 타이밍: PULL_NOW 콜백이 Drive pull 완료 후 호출 → `_advance()` 실행 ✓
- 재오픈 → `requires_pin` → PIN 입력 화면 → snuhmate.com 동일 PIN 사용 ✓

**발견된 이슈: GCP redirect URI 미등록**
- 현재 snuhmate.com web client에 extension redirect URL이 없을 가능성 높음
- 로그인 에러 메시지를 친화적으로 개선 (GCP 설정 안내 포함)

- [ ] **Step 1: login.js 에러 메시지 개선**

catch 블록을:

```javascript
} catch (e) {
  var msg = e.message || '';
  var userMsg;
  if (msg.includes('redirect_uri_mismatch') || msg.includes('403')) {
    userMsg = '⚙️ GCP 설정 필요 — chrome.identity.getRedirectURL() 주소를 OAuth 클라이언트 허용 URI에 추가하세요';
  } else if (msg.includes('cancelled') || msg.includes('cancel')) {
    userMsg = '로그인을 취소했습니다';
  } else {
    userMsg = '로그인 실패: ' + msg;
  }
  status.textContent = userMsg;
  status.className   = 'status-msg err';
  btn.disabled       = false;
  btnLabel.textContent = 'Google 계정으로 로그인';
}
```

- [ ] **Step 2: e2e-scenarios.md 작성**

```markdown
# SNUH Mate Extension E2E Test Scenarios

## 사전 요구사항: GCP 설정 (최초 1회)
1. chrome://extensions → SNUH Mate → ID 복사
2. Extension 팝업 → DevTools 콘솔: `chrome.identity.getRedirectURL()`
   → 예: `https://abcdefgh.chromiumapp.org/`
3. GCP Console → APIs & Services → Credentials
   → Web Application client (...dcbl) 편집
   → Authorized redirect URIs에 위 URL 추가

## 시나리오 A: 첫 로그인 (Drive에 PIN 없음)
준비: chrome://extensions → 서비스워커 종료 + storage 초기화
  (또는 DevTools → Application → Storage → Clear all)

- [ ] 팝업 열기 → 로그인 화면
- [ ] Google 로그인 버튼 → 계정 선택
  → redirect_uri_mismatch 에러 시: GCP 설정 확인
- [ ] "XXX님, 환영합니다!" PIN 설정 화면 즉시 표시
- [ ] PIN 4자리 입력 → "PIN 확인" 상태
- [ ] 동일 PIN 재입력 → 메인 앱 (시간외 탭)
- [ ] DevTools storage: bhm_pin_hash(64자) + _web_token 있음

## 시나리오 B: "나중에" 건너뛰기
- [ ] PIN 설정 화면 → "나중에" → 메인 앱
- [ ] 팝업 닫기 → 재오픈 → PIN 설정 화면 다시 표시
- [ ] DevTools storage: bhm_pin_hash 없음

## 시나리오 C: snuhmate.com PIN 설정 후 Extension 로그인
준비: snuhmate.com 설정 → PIN 설정 (같은 Google 계정)

- [ ] Extension 로그아웃
- [ ] 재로그인 (같은 계정)
- [ ] PIN 설정 화면 잠깐 표시
- [ ] 2~3초 후 자동으로 메인 앱 이동
- [ ] 팝업 닫기 → 재오픈 → PIN 입력 화면
- [ ] snuhmate.com PIN 입력 → 잠금 해제 성공

## 시나리오 D: 데이터 동기화 (Extension → snuhmate.com)
- [ ] Extension 시간외 기록 저장
- [ ] 설정 → "지금 동기화" → ✅ 완료 (❌ 아님)
- [ ] snuhmate.com 로그인 → 동일 기록 확인

## 시나리오 E: 로그아웃 완전 삭제
- [ ] 로그아웃 후 DevTools storage 확인 → bhm_* 키 없음
- [ ] 급여명세서 탭 → 최근 감지된 PDF 없음
- [ ] 재로그인 → 이전 사용자 데이터 없음
```

- [ ] **Step 3: 시나리오 A 수동 실행**

준비: chrome://extensions → 확장 새로고침 → DevTools console: `chrome.storage.local.clear()`

1. 팝업 → 로그인 버튼 → Google 계정 선택
2. PIN 설정 화면 확인
3. PIN 4자리 입력 두 번 → 메인 앱

- [ ] **Step 4: 시나리오 B 수동 실행**

1. PIN 설정 화면 → "나중에"
2. 닫기 → 재오픈 → PIN 설정 화면 다시 표시 확인

- [ ] **Step 5: 시나리오 C 수동 실행**

1. snuhmate.com에서 PIN 설정
2. Extension 로그아웃 → 재로그인
3. pin-setup 자동 닫힘 → 재오픈 → PIN 입력 → 해제 확인

- [ ] **Step 6: 시나리오 E 수동 실행**

1. 로그아웃
2. DevTools → Application → chrome.storage → Local Storage (extension) → 비어있음 확인
3. 급여명세서 탭 → PDF 없음 확인

- [ ] **Step 7: Commit**

```bash
git add chrome-extension/screens/login.js chrome-extension/tests/e2e-scenarios.md
git commit -m "fix(ext/login): redirect_uri_mismatch 안내 메시지 + E2E 체크리스트 추가"
```
