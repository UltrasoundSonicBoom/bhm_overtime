# SNUH Mate — DB 스키마 정의서 + 데이터 흐름 ERD

> 기준일: 2026-04-30 / Phase 8 (Firebase Auth + Firestore E2E 암호화)

---

## 1. 저장소 이중 구조

```
┌──────────────────────────────────────────────────────────┐
│  브라우저 (localStorage)                                  │
│  – 기기 로컬 캐시 / 즉시 읽기                             │
│  – uid 스코프 분리: {base}_uid_{uid}                      │
└─────────────────────┬────────────────────────────────────┘
                      │ auto-sync (200ms debounce)
                      │ hydrateFromFirestore (로그인 1회)
                      ▼
┌──────────────────────────────────────────────────────────┐
│  Firestore (Google Cloud)                                 │
│  – Source of Truth                                        │
│  – 민감 필드: AES-GCM 256-bit 암호화                      │
│  – 접근 규칙: request.auth.uid == userId only             │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Firestore 컬렉션 정의

### 2-1. `users/{uid}/profile/identity`

| 필드명 | 타입 | 암호화 | 설명 |
|---|---|---|---|
| `name` | string | ✅ | 이름 |
| `employeeId` | string | ✅ | 사번 |
| `department` | string | ✅ | 부서 |
| `position` | string | ✅ | 직급 |
| `hireDate` | string | ✅ | 입사일 (YYYY-MM-DD) |
| `jobLevel` | string | ✅ | 직무등급 |
| `rank` | string | ✅ | 호봉 |
| `workHistorySeeded` | boolean | ❌ | 근무이력 초기화 플래그 |
| `lastEditAt` | number | ❌ | Unix ms (LWW 인덱싱) |

### 2-2. `users/{uid}/profile/payroll`

| 필드명 | 타입 | 암호화 | 설명 |
|---|---|---|---|
| `hourlyWage` | number | ✅ | 기본 시급 |
| `annualSalary` | number | ✅ | 연봉 |
| `manualHourly` | number | ✅ | 수동 시급 |
| `allowancePolicy` | object | ✅ | 수당 정책 |
| `paymentDay` | number | ✅ | 급여일 |
| `baseHours` | number | ✅ | 소정근로시간 |
| `paymentType` | string | ✅ | 급여 유형 |
| `lastEditAt` | number | ❌ | Unix ms |

### 2-3. `users/{uid}/overtime/{yyyymm}`  
문서 ID: `YYYYMM` (예: `202604`)

| 필드명 | 타입 | 암호화 | 설명 |
|---|---|---|---|
| `entries` | array | 부분 | 시간외 기록 배열 |
| `entries[].id` | string | ❌ | `ot_{ts}_{rand}` |
| `entries[].date` | string | ❌ | YYYY-MM-DD (인덱싱) |
| `entries[].type` | string | ❌ | `overtime\|oncall\|holiday` |
| `entries[].hours` | number | ✅ | 총 시간 |
| `entries[].duration` | string | ✅ | 포맷 "NhMMm" |
| `entries[].notes` | string | ✅ | 메모 |
| `entries[].breakdown` | object | ✅ | 시간대별 분해 |
| `entries[].estimatedPay` | number | ✅ | 추정 수당 |
| `lastEditAt` | number | ❌ | Unix ms |

### 2-4. `users/{uid}/leave/{yyyy}`
문서 ID: 연도 (예: `2026`)

| 필드명 | 타입 | 암호화 | 설명 |
|---|---|---|---|
| `entries` | array | 부분 | 휴가 기록 배열 |
| `entries[].id` | string | ❌ | UUID |
| `entries[].startDate` | string | ❌ | YYYY-MM-DD |
| `entries[].endDate` | string | ❌ | YYYY-MM-DD |
| `entries[].type` | string | ❌ | `연차\|청원휴가` 등 |
| `entries[].days` | number | ❌ | 일수 |
| `entries[].hours` | number | ❌ | 시간수 |
| `entries[].duration` | string | ✅ | 포맷 "Nd" / "Nh" |
| `entries[].notes` | string | ✅ | 메모 |
| `entries[].salaryImpact` | number | ✅ | 급여 영향액 |
| `lastEditAt` | number | ❌ | Unix ms |

### 2-5. `users/{uid}/payslips/{payMonth}`
문서 ID: `YYYY-MM` (예: `2026-04`)

| 필드명 | 타입 | 암호화 | 설명 |
|---|---|---|---|
| `parsedFields` | object | ✅ | PDF 파싱 결과 전체 |
| `payMonth` | string | ❌ | YYYY-MM (문서 ID와 동일) |
| `driveFileId` | string | ❌ | Google Drive 파일 ID |
| `lastEditAt` | number | ❌ | Unix ms |

### 2-6. `users/{uid}/work_history/{entryId}`

| 필드명 | 타입 | 암호화 | 설명 |
|---|---|---|---|
| `id` | string | ❌ | entryId |
| `workplace` | string | ❌ | 근무처 (인덱싱) |
| `from` | string | ❌ | 시작일 YYYY-MM-DD |
| `to` | string | ❌ | 종료일 YYYY-MM-DD |
| `dept` | string | ✅ | 부서 |
| `role` | string | ✅ | 직책 |
| `desc` | string | ✅ | 설명 |
| `source` | string | ❌ | `manual\|seeded` |
| `lastEditAt` | number | ❌ | Unix ms |

### 2-7. `users/{uid}/settings/app`

| 필드명 | 타입 | 암호화 | 설명 |
|---|---|---|---|
| `theme` | string | ❌ | `neo\|dark` |
| `appLockPin` | string | ✅ | 앱 잠금 PIN |
| `customNotes` | string | ✅ | 사용자 메모 |
| `lastEditAt` | number | ❌ | Unix ms |

### 2-8. `users/{uid}/settings/reference`

| 필드명 | 타입 | 암호화 | 설명 |
|---|---|---|---|
| `favorites` | string[] | ❌ | 규정 article ID 배열 |
| `lastEditAt` | number | ❌ | Unix ms |

---

## 3. localStorage 키 정의서

> Legacy unsupported: old BHM-prefixed localStorage keys are no longer read,
> written, or migrated. Runtime storage is limited to `snuhmate_*`, `_guest`,
> and `_uid_{uid}` scoped keys.

### 동기화 대상 (Firestore ↔ localStorage)

| 키명 | uid 스코프 | 타입 | Firestore 경로 |
|---|---|---|---|
| `snuhmate_hr_profile_uid_{uid}` | ✅ | JSON object | `users/{uid}/profile/*` |
| `snuhmate_work_history_uid_{uid}` | ✅ | JSON array | `users/{uid}/work_history/*` |
| `overtimeRecords_uid_{uid}` | ✅ | `{yyyymm: records[]}` | `users/{uid}/overtime/{yyyymm}` |
| `leaveRecords` | ❌ (공유) | `{yyyy: records[]}` | `users/{uid}/leave/{yyyy}` |
| `overtimePayslipData_uid_{uid}` | ✅ | `{payMonth: data}` | `users/{uid}/payslips/{payMonth}` |
| `payslip_{uid}_{yyyy}_{mm}` | ✅ | JSON object | `users/{uid}/payslips/{YYYY-MM}` |
| `snuhmate_settings` | ❌ (기기) | JSON object | `users/{uid}/settings/app` |
| `snuhmate_reg_favorites_uid_{uid}` | ✅ | string[] | `users/{uid}/settings/reference` |

### 기기 로컬 전용

| 키명 | 타입 | 용도 |
|---|---|---|
| `snuhmate_local_uid` | string | 로컬 uid 식별 |
| `snuhmate_anon_id` | string | 익명 텔레메트리 ID |
| `snuhmate_device_id` | string | 기기 ID |
| `snuhmate_llm_consent_v1` | `opted-in\|opted-out` | LLM 사용 동의 |
| `snuhmate_demo_mode` | `'1'` | 데모 모드 |
| `snuhmate_last_edit_{base}` | ISO 8601 | LWW 타임스탬프 |
| `theme` | `neo\|dark` | UI 테마 |
| `hwBannerDismissed` | `'1'` | 시급 경고 배너 |

---

## 4. 암호화 아키텍처

```
uid  ──── SHA-256(uid + '|snuh-mate-2026') ────► AES-GCM 256-bit key
                                                         │
                              ┌──────────────────────────┘
                              │  encrypt(plaintext, randomIV)
                              ▼
                     { _v: 1, iv: <base64>, c: <base64> }
                              │
                              │  Firestore 저장
                              │
                              │  decrypt(c, iv, key)
                              ▼
                           plaintext
```

**암호화 대상 필드 요약:**
- ✅ 신원 정보: name, employeeId, department, position, hireDate
- ✅ 급여 정보: hourlyWage, annualSalary, allowancePolicy, parsedFields
- ✅ 민감 메모: notes, duration, customNotes, appLockPin
- ❌ 인덱싱 필드: date, type, year/month, workplace, lastEditAt

---

## 5. 데이터 흐름 ERD

```
┌─────────────────────────────────────────────────────────────────┐
│                      사용자 액션 (UI)                            │
│  overtime 입력 | leave 입력 | 프로필 저장 | 설정 변경 | 명세서 업로드│
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│               localStorage (기기 캐시)                            │
│                                                                  │
│  overtimeRecords_uid_{uid}  ──────────────────────► overtime tab │
│  leaveRecords               ──────────────────────► leave tab    │
│  snuhmate_hr_profile_uid_{uid} ───────────────────► profile tab  │
│  payslip_{uid}_{yyyy}_{mm}  ──────────────────────► payroll tab  │
│  snuhmate_settings          ──────────────────────► settings tab │
│  snuhmate_reg_favorites_uid_{uid} ────────────────► 규정 탭       │
└──────────────────┬───────────────────────────────────────────────┘
                   │
     recordLocalEdit(base)
     → app:local-edit 이벤트
                   │
     ┌─────────────▼────────────────┐
     │   auto-sync.js               │
     │   200ms debounce             │
     │   로그인 상태 체크            │
     └──────┬───────────────────────┘
            │ writeXXX(uid, data)
            │
     ┌──────▼──────────────────────────────────────────────────────┐
     │  crypto.js AES-GCM 필드별 암호화                             │
     └──────┬──────────────────────────────────────────────────────┘
            │
     ┌──────▼──────────────────────────────────────────────────────┐
     │              Firestore (Source of Truth)                    │
     │                                                             │
     │  users/{uid}/                                               │
     │    ├─ profile/                                              │
     │    │    ├─ identity  (name, employeeId, ...)                │
     │    │    └─ payroll   (hourlyWage, allowance, ...)           │
     │    ├─ overtime/                                             │
     │    │    └─ {yyyymm}  (entries[], lastEditAt)                │
     │    ├─ leave/                                                │
     │    │    └─ {yyyy}    (entries[], lastEditAt)                │
     │    ├─ payslips/                                             │
     │    │    └─ {YYYY-MM} (parsedFields, driveFileId)            │
     │    ├─ work_history/                                         │
     │    │    └─ {entryId} (workplace, dept, role, ...)           │
     │    └─ settings/                                             │
     │         ├─ app       (theme, appLockPin, ...)               │
     │         └─ reference (favorites[])                          │
     └──────┬──────────────────────────────────────────────────────┘
            │
            │ (로그인 시 1회)
            │ hydrateFromFirestore(uid)
            │ readXXX() → 복호화 → localStorage 덮어쓰기
            │
     ┌──────▼──────────────────────────────────────────────────────┐
     │  auth-service.js onAuthChanged                              │
     │                                                             │
     │  로그인  → hydrateFromFirestore + import auto-sync          │
     │  로그아웃 → clearLocalUserData (uid 키 전부 삭제)            │
     └─────────────────────────────────────────────────────────────┘
```

---

## 6. auto-sync HANDLERS 매핑

| app:local-edit base | 호출 함수 | Firestore 경로 |
|---|---|---|
| `snuhmate_hr_profile` | `writeProfile(uid, data)` | `users/{uid}/profile/{identity,payroll}` |
| `overtimeRecords` | `writeOvertimeMonth(uid, yyyymm, records)` | `users/{uid}/overtime/{yyyymm}` |
| `leaveRecords` | `writeLeaveYear(uid, yyyy, records)` | `users/{uid}/leave/{yyyy}` |
| `snuhmate_work_history` | `writeAllWorkHistory(uid, entries)` | `users/{uid}/work_history/{entryId}` |
| `snuhmate_settings` | `writeSettings(uid, data)` | `users/{uid}/settings/app` |
| `snuhmate_reg_favorites` | `writeFavorites(uid, arr)` | `users/{uid}/settings/reference` |
| `payslip_{uid}_{YYYY}_{MM}` | `writePayslip(uid, payMonth, data)` | `users/{uid}/payslips/{YYYY-MM}` |

---

## 7. Firestore Rules 요약

```
users/{userId}/** 
  읽기/쓰기: request.auth.uid == userId 만 허용
  그 외 모든 경로: 거부
```

- Admin 백도어 없음
- Public read 없음
- UID 기반 완전 격리

---

## 8. LM Studio Gateway 스키마

### 급여명세서 파이프라인 (2-stage)

```
이미지 → qwen3-vl-8b → ExtractedTable (행/열 raw)
                ↓
         gemma-4-26b-a4b → NormalizedPayslip (금액/분류 정규화)
                ↓
         validate_payslip() → ValidationResult
                ↓
         ParsePipelineResult → ReviewRecord (data/lmstudio-review-queue.json)
```

### 근무표 파이프라인 (1-stage)

```
이미지 → qwen3-vl-8b → NormalizedSchedule (직원×날짜×코드 직접)
                ↓
         validate_schedule() → ValidationResult
                ↓
         SchedulePipelineResult → ScheduleReviewRecord (data/schedule-review-queue.json)
```

### NormalizedSchedule 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| `period.year` | int | 2000~2100 |
| `period.month` | int | 1~12 |
| `employees[].name` | string\|null | 직원 이름 |
| `employees[].role` | string\|null | 직책 |
| `employees[].entries[].date` | string | YYYY-MM-DD |
| `employees[].entries[].code` | string | D/E/N/OFF/AL/RD (대문자 정규화) |
| `employees[].entries[].confidence` | float | 0.0~1.0 |
| `codes_found` | string[] | 문서에서 발견된 코드 목록 |

### 알려진 근무 코드

| 코드 | 의미 |
|---|---|
| D | 데이 (07:00~15:00) |
| E | 이브닝 (15:00~23:00) |
| N | 나이트 (23:00~07:00) |
| OFF / O | 오프 |
| AL | 연차 |
| RD | 리커버리 |

---

## 9. 데이터 생명주기

```
게스트
  └─ localStorage: {base}_guest 키 사용
  └─ Firestore: 없음

로그인
  └─ hydrateFromFirestore: cloud → localStorage 덮어쓰기
  └─ localStorage: {base}_uid_{uid} 키로 전환
  └─ auto-sync 활성화: 편집 → 200ms → Firestore write

로그아웃
  └─ clearLocalUserData(uid): _uid_{uid} 키 전부 삭제
  └─ leaveRecords 삭제
  └─ payslip_{uid}_* 삭제
  └─ snuhmate_last_edit_* 삭제
  └─ 다시 게스트 상태 (빈 로컬)
```
