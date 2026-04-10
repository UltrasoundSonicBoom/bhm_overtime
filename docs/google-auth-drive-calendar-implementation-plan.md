# Google Auth + Drive + Calendar 구현 계획

> Last Updated: 2026-04-10

## 목적

이 문서는 BHM Overtime의 현재 `localStorage + 선택적 Supabase family mode` 구조를
`local-first + 선택적 Google 저장/연동` 구조로 전환하기 위한 실제 구현 순서를 정리한다.

이번 전환의 목표는 아래 3가지다.

1. 로컬만 쓰고 싶은 사용자는 지금처럼 계속 사용 가능해야 한다.
2. Google을 쓰고 싶은 사용자는 자신의 계정에 데이터를 저장할 수 있어야 한다.
3. 휴가 탭에 입력한 휴가가 원하면 Google Calendar에도 자동 반영되어야 한다.

## 제품 원칙

1. 기본값은 항상 로컬 저장이다.
2. 민감 데이터는 앱 서버 DB가 아니라 사용자 소유 저장소에 둔다.
3. Google 권한은 한 번에 다 요청하지 않고, 기능을 켤 때 필요한 scope만 요청한다.
4. 앱 데이터의 원본은 초기에는 앱 쪽이다.
5. Calendar 연동은 MVP에서는 단방향(App -> Google Calendar)으로 시작한다.
6. 실패해도 로컬 저장은 항상 성공해야 한다.

## 이번 단계의 범위

포함:

- Google 로그인
- Google Drive `appDataFolder` 백업/복원/동기화
- 휴가 탭 -> Google Calendar 자동 반영
- 사용자가 쉽게 켜고 끌 수 있는 설정 UX

이번 단계에서 제외:

- Google Calendar -> 앱 양방향 동기화
- 서버 측 per-user refresh token 저장
- 관리자용 사용자 데이터 조회 기능
- 고급 암호화 PIN 복구 UX

## 현재 코드 기준 주요 접점

현재 구현에서 우선 활용/교체할 지점은 아래다.

- [`/Users/momo/Documents/GitHub/bhm_overtime/supabaseClient.js`](/Users/momo/Documents/GitHub/bhm_overtime/supabaseClient.js)
  현재 `SupabaseSync`와 `getUserStorageKey()`가 존재한다.
- [`/Users/momo/Documents/GitHub/bhm_overtime/app.js`](/Users/momo/Documents/GitHub/bhm_overtime/app.js)
  `window.syncCloudData`, guest -> 로그인 사용자 마이그레이션, 백업/복원 UI 로직이 있다.
- [`/Users/momo/Documents/GitHub/bhm_overtime/leave.js`](/Users/momo/Documents/GitHub/bhm_overtime/leave.js)
  휴가 CRUD 이후 클라우드 동기화 훅을 붙이기 가장 좋은 지점이다.
- [`/Users/momo/Documents/GitHub/bhm_overtime/index.html`](/Users/momo/Documents/GitHub/bhm_overtime/index.html)
  `authContainer`, `localBackupSection`, `updateAuthUI()`가 있다.

핵심 전략은 `SupabaseSync`를 바로 삭제하지 않고, 먼저 더 일반적인 인터페이스로 추상화한 다음 내부 구현을 Google 기반으로 교체하는 것이다.

## 최종 목표 구조

```text
UI
 ├─ Local mode
 ├─ Google backup mode
 └─ Google Calendar sync mode

Storage layer
 ├─ localStorage
 ├─ Google Drive appDataFolder
 └─ Sync manager

Auth layer
 └─ Google Identity Services

Calendar layer
 └─ Google Calendar API
```

## 우선순위별 실제 구현 순서

## Priority 0. 준비 작업과 경계 정리

이 단계는 바로 기능을 붙이기 전에 구조를 정리하는 단계다. 여기서 경계를 잘 나눠야 이후 캘린더 연동까지 깔끔하게 간다.

### Step 0-1. 현재 Supabase 의존 지점을 전부 목록화

작업:

1. `window.SupabaseSync`를 호출하는 위치를 전부 정리한다.
2. `mode=family` URL 분기가 실제로 어떤 UX를 바꾸는지 정리한다.
3. 사용자별 key 생성 규칙(`getUserStorageKey`)은 유지 가능한지 확인한다.

현재 확인된 주요 지점:

- `leave.js`의 `addRecord/updateRecord/deleteRecord`
- `app.js`의 `syncCloudData()`
- `index.html`의 `updateAuthUI()`

완료 기준:

- Google 전환 시 수정 대상 파일 목록이 확정되어 있다.
- Supabase 제거와 무관하게 유지할 로컬 로직이 분리되어 있다.

### Step 0-2. 공용 설정 모델 정의

새 로컬 설정 키를 먼저 정의한다.

권장 설정 예시:

```json
{
  "authProvider": "google",
  "googleBackupEnabled": false,
  "googleCalendarEnabled": false,
  "googleCalendarId": "primary",
  "googleCalendarMode": "dedicated",
  "privacyMode": "genericTitle",
  "lastDriveSyncAt": null,
  "lastCalendarSyncAt": null
}
```

완료 기준:

- 기능 on/off를 로컬에서 제어할 수 있다.
- 로그인 여부와 기능 활성 여부가 분리되어 있다.

### Step 0-3. Google Cloud 프로젝트 설정

작업:

1. OAuth consent screen 구성
2. Web client ID 생성
3. Authorized JavaScript origins 등록
4. Authorized redirect URIs 등록
5. Drive API, Calendar API 활성화

최소 권한 전략:

- 로그인: `openid email profile`
- Drive 백업: `https://www.googleapis.com/auth/drive.appdata`
- Calendar 쓰기: `https://www.googleapis.com/auth/calendar.events`

완료 기준:

- 개발/운영 origin에서 로그인 팝업이 정상 동작한다.
- Drive/Calendar scope를 기능별로 나눠 요청할 수 있다.

## Priority 1. Google Auth 기반 만들기

이 단계의 목표는 "사용자가 Google 계정과 연결되었다"는 상태를 안정적으로 관리하는 것이다. 아직 Drive와 Calendar 저장은 붙이지 않아도 된다.

### Step 1-1. Google Identity Services 로더 추가

작업:

1. `index.html`에 GIS 스크립트를 추가한다.
2. `supabaseClient.js`를 바로 지우지 말고, 새 `googleAuth.js`를 만든다.
3. 로그인, 로그아웃, 권한 해제, 현재 사용자 조회 함수를 분리한다.

신규 권장 파일:

- `googleAuth.js`
- `googleDriveStore.js`
- `googleCalendarSync.js`
- `syncManager.js`

완료 기준:

- 버튼 클릭으로 Google 로그인 가능
- 사용자 이름/아바타 렌더링 가능
- 재방문 시 최소한 로그인 상태를 복원하거나 다시 승인 UX를 유도할 수 있음

### Step 1-2. `authContainer` UI 교체

작업:

1. 기존 `SupabaseSync.signInWithGoogle()` 버튼을 새 Google 로그인 버튼으로 교체
2. 로그인 후 표시 문구를 제품 원칙에 맞게 수정
3. "로그인 = 백업 허용"으로 오해하지 않도록 문구를 분리

권장 문구:

- 로그인 전: `Google로 연결`
- 로그인 후: `Google 계정 연결됨`
- 보조 문구: `백업과 캘린더 연동은 별도로 켤 수 있어요`

완료 기준:

- 로그인 자체와 Drive/Calendar 기능이 UX에서 분리되어 보인다.

### Step 1-3. 사용자 식별 키 전략 확정

작업:

1. 기존 `getUserStorageKey()`의 `SupabaseUser.id` 의존을 제거
2. Google의 `sub` 값을 내부 사용자 키로 사용
3. 이메일은 표시 용도로만 사용

완료 기준:

- 로그인 사용자 localStorage 키가 안정적으로 분리된다.
- 이메일이 바뀌어도 같은 사용자로 처리 가능하다.

## Priority 2. Drive 백업/복원/동기화

이 단계에서 처음으로 "내 Google 계정에 저장" 기능이 완성된다.

### Step 2-1. 저장 포맷 확정

Drive에는 우선 3개 파일로 시작한다.

- `profile.json`
- `overtime.json`
- `leave.json`

공통 포맷:

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-04-10T00:00:00.000Z",
  "deviceId": "web_xxxx",
  "data": {}
}
```

완료 기준:

- 로컬 데이터 구조와 Drive 데이터 구조가 명확히 대응된다.
- 이후 `payroll.json` 또는 `payslips/*.json` 추가가 가능하다.

### Step 2-2. Drive appDataFolder 읽기/쓰기 모듈 작성

작업:

1. `googleDriveStore.js`에서 파일 조회/생성/수정 함수 구현
2. 파일이 없으면 자동 생성
3. 파일 ID를 로컬 설정에 캐시
4. API 실패 시 로컬 데이터는 유지

필수 함수 예시:

- `ensureAppDataFile(name)`
- `readJsonFile(name)`
- `writeJsonFile(name, payload)`
- `deleteJsonFile(name)`

완료 기준:

- 테스트 계정에서 `appDataFolder`에 JSON 파일 생성 가능
- 다시 읽어서 앱 state를 복원 가능

### Step 2-3. 기존 `syncCloudData()`를 일반화

작업:

1. `app.js`의 `window.syncCloudData`를 `window.syncRemoteData` 같은 중립적 이름으로 바꾼다.
2. guest -> 로그인 사용자 마이그레이션 로직은 유지하되 대상만 Drive로 바꾼다.
3. 로컬/원격 충돌 시 우선 정책을 정한다.

MVP 충돌 정책:

- 원격 데이터가 있고 로컬이 비어 있으면 원격 복원
- 로컬만 있으면 원격 업로드
- 둘 다 있으면 `updatedAt` 최신값 우선
- 정말 애매한 경우에만 한 번 토스트/모달로 선택권 제공

완료 기준:

- 로그인 직후 로컬 데이터를 Google에 올리거나, 기존 Google 데이터를 로컬로 내려받을 수 있다.

### Step 2-4. 백업/복원 UI 개편

기존 [`index.html`](/Users/momo/Documents/GitHub/bhm_overtime/index.html)의 `localBackupSection`은 유지하되, Google 백업 섹션을 추가한다.

권장 섹션 구성:

1. `이 브라우저에만 저장`
2. `Google에 백업`
3. `파일로 백업/복원`

권장 버튼:

- `Google에 백업 연결`
- `지금 바로 백업`
- `Google에서 복원`
- `파일 백업 다운로드`

완료 기준:

- 사용자가 "Google 백업"과 "파일 백업"의 차이를 이해할 수 있다.

### Step 2-5. 저장 이벤트에 자동 백업 연결

작업:

1. 프로필 저장 후 Drive sync enqueue
2. 시간외 저장/수정/삭제 후 Drive sync enqueue
3. 휴가 저장/수정/삭제 후 Drive sync enqueue
4. 디바운스 적용으로 연속 저장 시 API 남발 방지

완료 기준:

- 데이터 입력 후 수 초 내 Google 백업 반영
- 네트워크 실패 시 토스트만 띄우고 앱 사용은 계속 가능

## Priority 3. 휴가 탭 -> Google Calendar 연동

이 단계가 사용자 체감 가치가 가장 큰 단계다.

### Step 3-1. Calendar scope 요청은 분리

작업:

1. 로그인만 한 사용자에게는 Calendar scope를 요청하지 않는다.
2. 사용자가 `Google Calendar에도 반영` 토글을 켤 때만 권한 요청
3. scope 승인 실패 시 Drive 백업 기능은 유지

완료 기준:

- Google 백업과 Calendar 연동이 서로 독립적으로 동작한다.

### Step 3-2. 대상 캘린더 선택 UX

권장 기본값:

- 새 전용 캘린더 생성: `SNUH Mate 휴가`

대안:

- `primary` 캘린더 사용

작업:

1. 첫 연결 시 `전용 캘린더 생성`을 기본 선택지로 제공
2. 사용자가 원하면 `기본 캘린더 사용` 선택 가능
3. 선택한 `calendarId`를 로컬 설정에 저장

완료 기준:

- 사용자가 내 일정과 앱 휴가 일정을 분리할 수 있다.

### Step 3-3. 휴가 레코드와 Calendar 이벤트 매핑 정의

휴가 레코드 기준 필드:

- `id`
- `type`
- `startDate`
- `endDate`
- `hours`
- `days`

매핑 규칙:

1. 날짜 단위 휴가: all-day event
2. 시간차: time-based event
3. 기본 제목: `휴가`
4. 상세 제목 모드: `연차`, `병가`, `시간차`
5. `visibility: private`
6. `transparency: opaque`

권장 `extendedProperties.private`:

```json
{
  "bhmLeaveId": "lv_xxxx",
  "bhmType": "annual",
  "bhmSource": "bhm_overtime",
  "bhmVersion": "1"
}
```

완료 기준:

- 동일 휴가의 중복 생성 없이 수정/삭제 추적 가능

### Step 3-4. 휴가 CRUD에 Calendar 동기화 훅 연결

구현 위치:

- [`/Users/momo/Documents/GitHub/bhm_overtime/leave.js`](/Users/momo/Documents/GitHub/bhm_overtime/leave.js)

작업:

1. `addRecord()` 후 `createOrUpdateCalendarEvent(record)`
2. `updateRecord()` 후 `patchCalendarEvent(record)`
3. `deleteRecord()` 후 `deleteCalendarEvent(record)`
4. 동기화 실패 시 leave 저장 자체는 롤백하지 않음

추가 필드:

- `googleEventId`
- `calendarSyncStatus`
- `calendarLastSyncedAt`

완료 기준:

- 휴가를 저장하면 해당 이벤트가 선택된 Google Calendar에 생성된다.
- 휴가를 수정하면 기존 이벤트가 갱신된다.
- 휴가를 삭제하면 기존 이벤트가 제거된다.

### Step 3-5. 단방향 정책을 명확히 고정

MVP 정책:

- 앱이 원본
- Calendar는 표시/알림 채널
- 사용자가 Google Calendar에서 제목/시간을 바꿔도 앱 데이터를 다시 덮어쓰지 않음

완료 기준:

- 양방향 동기화 복잡도를 MVP에서 제거한다.

### Step 3-6. 재동기화/복구 도구 추가

권장 버튼:

- `이번 달 휴가 다시 동기화`
- `전체 휴가 다시 동기화`
- `캘린더 연결 해제`

용도:

- eventId 분실
- 사용자가 캘린더에서 수동 삭제
- 초기 릴리즈 후 데이터 정합성 점검

완료 기준:

- 사용자가 도움 없이도 캘린더 연동을 스스로 복구할 수 있다.

## Priority 4. 정리, 제거, 점진 배포

### Step 4-1. Supabase family mode 의존 제거

Google 기능이 안정화된 뒤 정리한다.

작업:

1. `mode=family` 분기를 deprecated 처리
2. `SupabaseSync` 호출부를 모두 새 sync manager로 치환
3. 설명 문구에서 `family mode` 표현 제거

완료 기준:

- 코드에서 실제 런타임 의존이 Google 쪽으로 완전히 전환된다.

### Step 4-2. 기존 파일 백업 기능은 유지

이 기능은 반드시 남긴다.

이유:

- Google을 원치 않는 사용자도 있다.
- 장애 시 최후의 복구 수단이 된다.
- 공공기관/병원 환경에서 외부 계정 연결을 꺼리는 사용자도 있다.

완료 기준:

- 로컬-only 사용자도 불이익 없이 계속 사용할 수 있다.

### Step 4-3. 점진 배포 순서

권장 릴리즈 순서:

1. 내부 테스트: Google 로그인만
2. 소규모 베타: Google Drive 백업
3. 소규모 베타: 휴가 Calendar 연동
4. 안정화 후 전체 공개
5. 급여명세서 저장 기능은 그 다음에 붙임

완료 기준:

- 민감 기능을 한 번에 다 오픈하지 않고 오류 범위를 좁힐 수 있다.

## 사용자 세팅 UX 초안

권장 초기 설정 카드 흐름:

1. `이 브라우저에만 저장 중`
2. `Google에 연결`
3. `Google에 백업`
4. `Google Calendar에 휴가 표시`

권장 설명 문구:

- 로그인 카드: `사용자를 확인하기 위해 Google 계정을 연결해요.`
- 백업 카드: `프로필, 휴가, 시간외 기록을 내 Google 저장공간의 앱 전용 영역에 저장해요.`
- 캘린더 카드: `휴가를 입력하면 내 Google Calendar에도 자동으로 표시해요.`

권장 기본값:

- Google 백업: off
- Google Calendar 연동: off
- 캘린더 제목 공개 수준: generic
- 캘린더 대상: 전용 캘린더 생성

## 파일별 예상 작업 목록

### 신규 파일

- `googleAuth.js`
- `googleDriveStore.js`
- `googleCalendarSync.js`
- `syncManager.js`

### 수정 파일

- [`/Users/momo/Documents/GitHub/bhm_overtime/index.html`](/Users/momo/Documents/GitHub/bhm_overtime/index.html)
- [`/Users/momo/Documents/GitHub/bhm_overtime/app.js`](/Users/momo/Documents/GitHub/bhm_overtime/app.js)
- [`/Users/momo/Documents/GitHub/bhm_overtime/leave.js`](/Users/momo/Documents/GitHub/bhm_overtime/leave.js)
- [`/Users/momo/Documents/GitHub/bhm_overtime/supabaseClient.js`](/Users/momo/Documents/GitHub/bhm_overtime/supabaseClient.js)

## QA 체크리스트

### 로그인

- Google 로그인 성공
- 로그아웃 성공
- 로그인 후 사용자명 렌더링 확인

### Drive

- 로컬 데이터 -> Drive 첫 업로드 성공
- Drive 데이터 -> 새 기기 로컬 복원 성공
- 네트워크 실패 시 로컬 저장 유지
- 파일 백업/복원 기능 계속 사용 가능

### Calendar

- 날짜 단위 휴가 생성 -> all-day event 생성
- 시간차 생성 -> timed event 생성
- 휴가 수정 -> 기존 이벤트 갱신
- 휴가 삭제 -> 기존 이벤트 삭제
- Calendar 권한 거부 시 앱 저장은 성공

### 개인정보/UX

- 기본값이 로컬-only인지 확인
- 권한 요청이 기능별로 분리되어 있는지 확인
- 공용 기기 경고 문구 유지 확인

## 후속 아이디어 백로그

이번 단계 이후 검토할 가치가 큰 기능:

1. 휴가 일정 ICS 내보내기
2. 캘린더 제목을 항상 `휴가`로 고정하는 강화된 프라이버시 모드
3. Google Drive 저장 전 클라이언트 암호화
4. 급여명세서 저장용 `payroll.json` 또는 월별 파일 구조 추가
5. 휴가 승인 전/확정 후 상태에 따라 Calendar 반영 시점 제어
6. `재동기화 센터` 화면 추가

## 추천 구현 순서 한 줄 요약

아래 순서로 진행한다.

1. Google Auth만 먼저 안정화
2. Drive 백업/복원 완성
3. 휴가 탭 Calendar 단방향 동기화 추가
4. Supabase family mode 정리
5. 이후 급여명세서 저장 확장
