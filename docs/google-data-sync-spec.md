# Google 데이터 동기화 명세서

> Version: 1.0 | Date: 2026-04-10 | Status: Draft

---

## 아키텍처 원칙

| 레이어 | 저장소 | 관리 주체 |
|--------|--------|-----------|
| 사용자 개인 데이터 (휴가, 시간외, 급여명세, 프로필) | localStorage → Google Drive appDataFolder | 사용자 본인 |
| 앱 인프라 데이터 (계산 로직, 규정, FAQ, 참조 테이블) | Supabase + Drizzle DB | 운영자 + 서버 |

- Supabase는 **제거 대상이 아님**. 앱 인프라 백엔드로 유지된다.
- Google Auth는 사용자 데이터 백업/캘린더 연동을 위한 **추가 옵션**이다.
- 로그인 없이도 모든 기능을 사용할 수 있다 (로컬 모드 기본값).
- Google 동기화 실패 시 로컬 저장은 항상 성공 보장.

---

## 탭별 사용자 데이터 전체 목록

### 1. 휴가 탭 (`leave`)

**모듈:** `leave.js` | **CRUD 함수:** `LEAVE.addRecord()`, `LEAVE.updateRecord()`, `LEAVE.deleteRecord()`

**localStorage 키:** `leaveRecords_{googleSub}`  
**데이터 구조:**
```json
{
  "2026": [
    {
      "id": "lv_1712745000000_a1b2",
      "type": "annual",
      "startDate": "2026-04-15",
      "endDate": "2026-04-15",
      "hours": 0,
      "days": 1,
      "isPaid": true,
      "usesAnnual": true,
      "category": "연차",
      "deductType": "none",
      "salaryImpact": 0,
      "memo": "",
      "googleEventId": null,
      "calendarSyncStatus": null,
      "calendarLastSyncedAt": null
    }
  ]
}
```

**Google Drive 동기화:**
- Drive 파일명: `leave.json`
- Drive 경로: `appDataFolder/leave.json`
- 동기화 트리거:
  - `LEAVE.addRecord()` 완료 직후
  - `LEAVE.updateRecord()` 완료 직후
  - `LEAVE.deleteRecord()` 완료 직후
- 디바운스: 연속 CRUD 시 3초 대기 후 1회 전송

**Google Calendar 동기화:**
- 동기화 여부: **선택적 opt-in** (사용자가 직접 켜야 함)
- 동기화 방향: 앱 → Calendar (단방향, MVP)
- 매핑 규칙:

| 휴가 필드 | Google Calendar 필드 |
|-----------|----------------------|
| `startDate`, `endDate` | `start.date`, `end.date` (all-day event, end는 +1일) |
| `startDate` + `hours` | `start.dateTime`, `end.dateTime` (시간차: 09:00 기준) |
| `id` | `extendedProperties.private.bhmLeaveId` |
| `type` | `summary` (genericTitle: `"휴가"`, detailedTitle: 유형명) |

- Calendar 동기화 트리거:
  - `LEAVE.addRecord()` → `GoogleCalendarSync.createOrUpdateEvent(record)`
  - `LEAVE.updateRecord()` → `GoogleCalendarSync.createOrUpdateEvent(record)`
  - `LEAVE.deleteRecord()` → `GoogleCalendarSync.deleteEvent(record)` (splice 전에 record 복사 필요)

**자동 동기화 코드 위치 (현재 Supabase → 교체 대상):**
- `leave.js:137-139` — addRecord 후 SupabaseSync.pushCloudData
- `leave.js:175-177` — updateRecord 후 SupabaseSync.pushCloudData
- `leave.js:194-196` — deleteRecord 후 SupabaseSync.deleteCloudRecord

---

### 2. 시간외 탭 (`overtime`)

**모듈:** `overtime.js` | **CRUD 함수:** `OVERTIME.addRecord()`, `OVERTIME.updateRecord()`, `OVERTIME.deleteRecord()`

**localStorage 키:** `overtimeRecords_{googleSub}`  
**데이터 구조:**
```json
{
  "2026-04": [
    {
      "id": "ot_1712745000000_c3d4",
      "date": "2026-04-10",
      "type": "overtime",
      "startTime": "17:00",
      "endTime": "20:00",
      "totalHours": 3,
      "breakdown": {
        "OT_150": 2,
        "OT_200": 1
      },
      "estimatedPay": 45000,
      "hourlyRate": 15000,
      "isHoliday": false,
      "memo": ""
    }
  ]
}
```

**Google Drive 동기화:**
- Drive 파일명: `overtime.json`
- Drive 경로: `appDataFolder/overtime.json`
- 동기화 트리거:
  - `OVERTIME.addRecord()` 완료 직후
  - `OVERTIME.updateRecord()` 완료 직후
  - `OVERTIME.deleteRecord()` 완료 직후
- 디바운스: 3초

**Google Calendar 동기화:**
- MVP에서는 **제외** (사용자 요청 시 추후 추가)
- 이유: 시간외 근무는 개인 일정이 아닌 업무 기록이며, 이미 앱 내 캘린더 뷰가 충분함

**자동 동기화 코드 위치 (현재 Supabase → 교체 대상):**
- `overtime.js:47-50` — addRecord 후 SupabaseSync.pushCloudData
- `overtime.js:63-65` — updateRecord 후 SupabaseSync.pushCloudData
- `overtime.js:82-84` — deleteRecord 후 SupabaseSync.deleteCloudRecord

---

### 3. 급여 탭 (`payroll`)

급여 탭은 3개 서브탭으로 구성된다.

#### 3-A. 급여명세서 서브탭 (`pay-payslip`)

**모듈:** `salary-parser.js` | **저장 함수:** `saveMonthlyData(year, month, data, type)`

**localStorage 키 패턴:**
- `payslip_{YYYY}_{MM}` — 기본 급여 (대부분)
- `payslip_{YYYY}_{MM}_{type}` — 특정 수당 유형별 (야간, 온콜 등)

**데이터 구조:**
```json
{
  "year": 2026,
  "month": 4,
  "totalPay": 3200000,
  "basePay": 2500000,
  "allowances": {
    "야간수당": 150000,
    "온콜수당": 80000
  },
  "deductions": {
    "국민연금": 130000
  },
  "netPay": 2890000,
  "savedAt": "2026-04-10T09:00:00.000Z"
}
```

**Google Drive 동기화:**
- Drive 파일명: `payslip_{YYYY}_{MM}.json`
- Drive 경로: `appDataFolder/payslips/payslip_{YYYY}_{MM}.json`
- **주의:** 급여명세서는 가장 민감한 개인 데이터. Drive 백업 활성화 전 사용자에게 명시적 안내 필요.
- 동기화 트리거:
  - `saveMonthlyData()` 호출 직후 (PDF 파싱 완료 시)
  - 기존 데이터 수정 시
- **현재 Supabase 동기화 없음** → Google Drive 연동 시 신규 추가

#### 3-B. 급여 계산기 서브탭 (`pay-calc`)

**모듈:** `payroll.js`  
**저장 데이터:** 없음 (프로필 + 시간외 + 휴가 기록으로 실시간 계산, 별도 저장 없음)  
**Google 동기화:** 불필요 (파생 데이터)

#### 3-C. otManualHourly (시급 수동 입력)

**localStorage 키:** `otManualHourly_{googleSub}`  
**데이터:** 사용자가 직접 입력한 시급 값 (숫자)  
**Google Drive 동기화:** `profile.json`에 포함시켜 저장 (별도 파일 불필요)

---

### 4. 프로필/info 탭 (`profile`)

**모듈:** `profile.js` | **저장 함수:** `PROFILE.save()`

**localStorage 키:** `bhm_hr_profile_{googleSub}`  
**데이터 구조:**
```json
{
  "name": "홍길동",
  "gender": "M",
  "jobType": "간호직",
  "grade": "J3",
  "year": 5,
  "hireDate": "2021-03-01",
  "adjustPay": 0,
  "upgradeAdjustPay": 0,
  "hasMilitary": false,
  "militaryMonths": 24,
  "hasSeniority": false,
  "numFamily": 1,
  "numChildren": 2,
  "childrenUnder6Pay": 260000,
  "specialPay": 0,
  "positionPay": 0,
  "workSupportPay": 0,
  "nightShiftsUnrewarded": 0,
  "weeklyHours": 209,
  "savedAt": "2026-04-10T09:00:00.000Z"
}
```

**Google Drive 동기화:**
- Drive 파일명: `profile.json`
- Drive 경로: `appDataFolder/profile.json`
- `otManualHourly` 값도 이 파일에 포함시켜 저장
- 동기화 트리거:
  - `PROFILE.save()` 완료 직후
- 디바운스: 3초

**Google Calendar 동기화:** 없음 (프로필 데이터는 일정이 아님)

**자동 동기화 코드 위치 (현재 Supabase → 교체 대상):**
- `profile.js:41-45` — isFamilyMode일 때만 SupabaseSync.pushCloudData

---

### 5. 규정 탭 (`regulation.html`)

**사용자 데이터:** 없음  
**데이터 소스:** `data.js` 정적 데이터 + `/api/data/bundle` API (Supabase DB)  
**Google 동기화:** 해당 없음 (읽기 전용 앱 인프라 데이터)

---

## Google 동기화 대상 파일 요약

| Drive 파일 | localStorage 원본 키 | 모듈 | 변경 트리거 |
|------------|----------------------|------|------------|
| `appDataFolder/profile.json` | `bhm_hr_profile_{sub}`, `otManualHourly_{sub}` | `profile.js` | PROFILE.save() |
| `appDataFolder/overtime.json` | `overtimeRecords_{sub}` | `overtime.js` | OVERTIME.add/update/delete() |
| `appDataFolder/leave.json` | `leaveRecords_{sub}` | `leave.js` | LEAVE.add/update/delete() |
| `appDataFolder/payslips/payslip_{YYYY}_{MM}.json` | `payslip_{YYYY}_{MM}` | `salary-parser.js` | saveMonthlyData() |

**Calendar 동기화 대상:**

| Calendar 이벤트 | 원본 | 변경 트리거 |
|-----------------|------|------------|
| 휴가 이벤트 (all-day or timed) | `leave.json` 각 record | LEAVE.add/update/delete() |

---

## 자동 동기화 구현 설계

### 흐름도

```
사용자 액션 (저장/수정/삭제)
  │
  ├── 1. localStorage 저장 (항상, 동기)
  │
  ├── 2. SyncManager.enqueuePush(dataType) (비동기, 디바운스)
  │     └── 3초 후 → GoogleDriveStore.writeJsonFile(name, data)
  │           ├── 성공: settings.lastDriveSyncAt 업데이트
  │           └── 실패: 토스트만 표시, 로컬 데이터 유지
  │
  └── 3. [휴가만] GoogleCalendarSync.createOrUpdateEvent(record) (비동기)
        ├── 성공: record.googleEventId 저장 → LEAVE._saveAll() 업데이트
        └── 실패: record.calendarSyncStatus = 'error', 토스트 표시
```

### 신규 구현 파일 목록

| 파일 | 역할 | 의존성 |
|------|------|--------|
| `googleAuth.js` | Google Identity Services 인증, scope 관리, bhm_settings 유틸 | GIS CDN |
| `googleDriveStore.js` | Drive appDataFolder CRUD | `googleAuth.js` |
| `googleCalendarSync.js` | Calendar 이벤트 CRUD, 전용 캘린더 관리 | `googleAuth.js` |
| `syncManager.js` | 동기화 오케스트레이션, 디바운스, 충돌 해결, 마이그레이션 | `googleDriveStore.js` |

### 수정 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `leave.js:137-139` | `SupabaseSync.pushCloudData` → `SyncManager.enqueuePush('leave')` 추가 |
| `leave.js:175-177` | 동일 |
| `leave.js:185-200` | `SupabaseSync.deleteCloudRecord` → `SyncManager.enqueuePush('leave')` 교체, `GoogleCalendarSync.deleteEvent()` 추가 (splice 전에 record 복사) |
| `overtime.js:47-50` | `SupabaseSync.pushCloudData` → `SyncManager.enqueuePush('overtime')` |
| `overtime.js:63-65` | 동일 |
| `overtime.js:82-84` | `SupabaseSync.deleteCloudRecord` → `SyncManager.enqueuePush('overtime')` |
| `profile.js:41-45` | `isFamilyMode && SupabaseSync` → `SyncManager.enqueuePush('profile')` |
| `salary-parser.js:907-909` | `saveMonthlyData()` 이후 `SyncManager.enqueuePush('payslip', year, month)` 추가 |

---

## Google Drive 파일 포맷

### 공통 래퍼

모든 Drive 파일에 아래 메타데이터를 포함한다:

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-04-10T09:30:00.000Z",
  "deviceId": "web_1712745000000",
  "data": { }
}
```

### `profile.json` data 필드

```json
{
  "profile": { /* PROFILE.load() 반환값 */ },
  "otManualHourly": 15000
}
```

### `overtime.json` data 필드

`OVERTIME._loadAll()` 반환값과 동일:
```json
{
  "2026-04": [{ /* record */ }],
  "2026-05": [{ /* record */ }]
}
```

### `leave.json` data 필드

`LEAVE._loadAll()` 반환값과 동일:
```json
{
  "2026": [{ /* record */ }],
  "2027": [{ /* record */ }]
}
```

### `payslips/payslip_{YYYY}_{MM}.json` data 필드

`salary-parser.js`의 `saveMonthlyData()` 저장값:
```json
{
  "year": 2026,
  "month": 4,
  "totalPay": 3200000,
  "basePay": 2500000,
  "allowances": { },
  "deductions": { },
  "netPay": 2890000,
  "savedAt": "2026-04-10T09:00:00.000Z"
}
```

---

## 앱 설정 (`bhm_settings`)

Google 동기화 관련 설정은 별도 `bhm_settings` localStorage 키로 관리한다 (사용자 segregation 없음 — 기기 설정이므로).

```json
{
  "authProvider": "google",
  "googleSub": "110248495921238986420",
  "googleEmail": "user@gmail.com",
  "googleName": "홍길동",
  "googleAvatar": "https://lh3.googleusercontent.com/...",
  "googleBackupEnabled": false,
  "googleCalendarEnabled": false,
  "googleCalendarId": "primary",
  "googleCalendarMode": "dedicated",
  "privacyMode": "genericTitle",
  "lastDriveSyncAt": null,
  "lastCalendarSyncAt": null,
  "driveFileIds": {
    "profile": null,
    "overtime": null,
    "leave": null,
    "payslips": {}
  },
  "migrationCompleted": false
}
```

---

## 오류 처리 규칙

모든 Google API 호출은 아래 원칙을 따른다:

1. **로컬 저장은 항상 먼저, 항상 성공**: Google API가 실패해도 로컬 저장은 완료된 상태여야 한다.
2. **조용한 실패**: Google 오류는 콘솔 경고 + 토스트로만 표시. 앱 사용 흐름을 막지 않는다.
3. **재시도**: 401 (토큰 만료) 시 자동 scope 재요청 후 1회 재시도.
4. **상태 추적**: 휴가 레코드의 `calendarSyncStatus` 필드로 Calendar 동기화 상태 추적.

| 오류 | 동작 |
|------|------|
| 오프라인 | 로컬 저장 성공, 토스트: "오프라인 — 로컬에 저장됨" |
| Drive 401 | scope 재요청 후 1회 재시도 |
| Drive 403 | 토스트: "Google Drive 권한이 필요합니다" |
| Drive 5xx | 토스트: "Google 서비스 일시 오류", 로컬 유지 |
| Calendar 401 | scope 재요청 후 1회 재시도 |
| Calendar 404 (이벤트 없음) | `googleEventId` 제거 후 새로 생성 |
| Calendar 실패 | `calendarSyncStatus = 'error'`, 토스트 |

---

## 충돌 해결 정책 (Drive 복원 시)

새 기기에서 로그인하거나 `SyncManager.pullFromDrive()`가 실행될 때:

| 상황 | 처리 |
|------|------|
| Drive만 있음 (로컬 비어있음) | Drive 데이터를 로컬로 복원 |
| 로컬만 있음 (Drive 비어있음) | 로컬 데이터를 Drive에 업로드 |
| 둘 다 있음 | `updatedAt` 최신 우선 (동일 시 Drive 우선) |
| 둘 다 있고 updatedAt이 같음 | Drive 우선, 사용자 알림 없음 |

---

## 개인정보 보호 고려사항

1. **급여명세서 (`payslips/`)**: 가장 민감한 데이터. Drive 백업 활성화 UI에서 "급여명세서 포함"을 별도 체크박스로 분리 고려.
2. **Calendar 이벤트 제목**: 기본값 `"휴가"` (genericTitle). `"병가"`, `"가족돌봄"` 같은 민감 유형은 상세 제목 모드에서만 노출.
3. **appDataFolder 격리**: Drive appDataFolder는 다른 앱에서 접근 불가. 사용자가 Drive에서 직접 찾을 수도 없음.
4. **프로필 데이터**: `hireDate`, `grade`, `year` 등 인사 정보 포함. 업무망(병원 내 Wi-Fi) 에서 사용 시 주의 필요.

---

## 구현 우선순위

| 단계 | 내용 | Drive 파일 | Calendar |
|------|------|------------|---------|
| Phase 1 | Google 로그인 + `profile.json` 백업 | `profile.json` | — |
| Phase 2 | `overtime.json` + `leave.json` 백업 | + `overtime.json`, `leave.json` | — |
| Phase 3 | 휴가 → Calendar 연동 | 유지 | `leave.json` → events |
| Phase 4 | `payslips/` 백업 (민감, 별도 opt-in) | + `payslips/*.json` | — |
