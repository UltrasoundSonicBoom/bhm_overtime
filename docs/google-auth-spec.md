# Spec: Google Auth + Drive 백업 + Calendar 연동

> Version: 1.1 | Date: 2026-04-10 | Status: Ready for Plan

---

## Objective

### 무엇을 만드는가

SNUH Mate의 사용자 데이터 관리 체계를 **로컬 전용**에서 **로컬 + 선택적 Google 연동**으로 확장한다.

현재는 사용자 데이터(프로필, 시간외, 휴가, 급여명세)가 브라우저 localStorage에만 저장된다. 기기를 바꾸거나 브라우저 캐시를 지우면 데이터가 사라진다.

이번 구현은 세 가지 선택지를 사용자에게 준다:

1. **로컬만 사용** — 기존과 동일. 아무것도 바꾸지 않아도 됨.
2. **Google Drive 백업** — 기기를 바꿔도 데이터를 복원할 수 있음.
3. **Google Calendar 연동** — 휴가를 입력하면 내 캘린더에도 자동 표시.

### 핵심 UX 원칙 (Toss-style)

```
첫 화면:  이 브라우저에만 저장 중
로그인 후: Google 계정 연결됨 / 백업 꺼짐 / 캘린더 꺼짐
↓ 선택
Google에 백업할까요?
↓ 선택
휴가를 Google Calendar에도 표시할까요?
```

로그인 = 자동 업로드가 아니다. 모든 기능은 사용자가 명시적으로 opt-in해야 켜진다.

### 아키텍처 원칙

```
사용자 개인 데이터 (localStorage)
  └── 선택적 Google Drive appDataFolder (백업)
      └── profile.json
      └── overtime.json
      └── leave.json
      └── payslips/payslip_{YYYY}_{MM}.json  (파싱 결과)
      └── payslips/original_{YYYY}_{MM}.pdf  (원본 PDF, 별도 opt-in)
  └── 선택적 Google Calendar (휴가만)

앱 인프라 (Supabase DB + Drizzle)
  └── 규정, FAQ, 보수표, 수당, 계산 규칙 등
  └── Admin 인증 및 운영 로그
  → 이 레이어는 이번 스펙에서 변경 없음
```

### 성공 기준

- [ ] Google 계정을 연결하지 않아도 앱의 모든 기능이 정상 동작한다.
- [ ] Google 로그인 직후 백업도 Calendar 연동도 자동으로 켜지지 않는다.
- [ ] Drive 백업을 켜면 프로필/시간외/휴가 기록이 내 Google Drive 앱 전용 영역에 저장된다.
- [ ] 새 기기에서 같은 Google 계정으로 로그인하면 이전 데이터를 복원할 수 있다.
- [ ] 급여명세서 파싱 결과(JSON)와 원본 PDF를 Drive에 백업할 수 있다.
- [ ] 휴가를 저장하면 선택한 Google Calendar에 이벤트가 자동 생성/수정/삭제된다.
- [ ] 시간외 기록은 Calendar에 반영하지 않는다.
- [ ] Google API가 실패해도 앱 사용은 중단되지 않는다 (토스트만 표시).
- [ ] 기존 Supabase 인프라 (DB, Admin auth, RAG)는 영향을 받지 않는다.

---

## GCP OAuth Client ID (중요)

Google OAuth는 두 가지 개념이 분리된다:

| 개념 | 소유자 | 역할 |
|------|--------|------|
| **OAuth Client ID** | 개발자(kgh1379)가 1회 발급 | SNUH Mate 앱을 Google에 등록한 신원 |
| **사용자 Google 계정** | 각 사용자 본인 | 실제 로그인하는 계정 |

- Client ID는 코드에 하드코딩하는 **공개 값**이다 (비밀키 아님, `.env` 불필요).
- Client ID 없이는 Google 로그인 팝업을 열 수 없다.
- **발급 방법:** Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web application)
- **등록 필요 Origin:** `http://localhost:4173`, `https://www.snuhmate.com`
- **활성화 필요 API:** Google Drive API, Google Calendar API

---

## `?mode=family` 제거 분석

### 기존 `?mode=family`가 하던 일

`isFamilyMode = true`일 때만 동작하는 코드 7개 지점:

| 파일:행 | 효과 |
|---------|------|
| `supabaseClient.js:38` | 로그인/세션 복원 시 `syncCloudData()` 실행 |
| `supabaseClient.js:55` | `signInWithGoogle()` 실행 가능 |
| `supabaseClient.js:69` | `signOut()` 실행 가능 |
| `supabaseClient.js:82` | `fetchCloudData()` 실행 가능 |
| `supabaseClient.js:126` | `pushCloudData()` 실행 가능 |
| `supabaseClient.js:157` | `deleteCloudRecord()` 실행 가능 |
| `profile.js:42` | 프로필 저장 시 Supabase 동기화 |
| `app.js:455-460` | authContainer 표시, localBackupSection 숨김 |

**목적:** `?mode=family` URL을 북마크해서 같은 데이터를 여러 기기에서 공유하는 수동 스위치.

### 제거 시 영향 및 처리

| 영향 | 처리 방법 |
|------|----------|
| SupabaseSync 7개 메서드가 family mode 체크로 막혀 있음 | Google Auth 전환 후 이 메서드들은 사용 안 함. `profile.js`, `leave.js`, `overtime.js`의 Supabase 호출을 SyncManager로 교체 |
| authContainer가 숨겨짐 | Google Auth UI로 교체 후 항상 표시 |
| localBackupSection이 숨겨졌다 보였다 함 | 항상 표시 (Google 백업과 병행) |
| `?mode=family` URL 북마크 사용자 | 접속 시 Google Auth로 전환 안내 배너 표시 (1개월 후 조용히 제거) |
| `supabaseClient.js:10`의 isFamilyMode 설정 | 제거. `window.isFamilyMode`에 의존하는 코드 전부 처리 후 삭제 |

**`leave.js`, `overtime.js`의 SupabaseSync 호출은 `window.SupabaseSync` 존재 여부만 체크하므로** family mode 제거와 무관하게 동작한다. SyncManager로 교체하면 자연스럽게 해결된다.

---

## Tech Stack

| 레이어 | 현재 | 추가/변경 |
|--------|------|----------|
| 프론트 | Vanilla JS, HTML, CSS | 변경 없음 |
| 사용자 인증 | Supabase OAuth (`?mode=family`만) | Google Identity Services (GIS) Token Model |
| 사용자 데이터 저장 | localStorage | localStorage + Google Drive appDataFolder |
| Calendar | 없음 | Google Calendar API |
| 앱 인프라 인증 | Supabase Auth | 변경 없음 |
| 앱 인프라 DB | Supabase + Drizzle | 변경 없음 |
| 배포 | Vercel | 변경 없음 |

**신규 외부 의존성:**
- `https://accounts.google.com/gsi/client` — Google Identity Services CDN (async, defer)
- Google Drive API REST (`https://www.googleapis.com/drive/v3/`)
- Google Calendar API REST (`https://www.googleapis.com/calendar/v3/`)

**GIS Token Model 선택 이유:**
- 브라우저 앱에서 서버 없이 직접 Google API 호출 가능
- `requestAccessToken()`으로 기능별 scope를 그때그때 요청하는 incremental authorization 공식 지원
- access_token은 메모리에만 보관, localStorage에 저장 불필요

---

## Commands

```bash
# 로컬 개발 서버 (정적 웹)
python3 -m http.server 4173

# API 서버 (Supabase 연동, 이번 스펙과 무관)
cd server && npm run dev

# Vercel Preview 배포
vercel

# Vercel Production 배포
vercel --prod
```

---

## Project Structure

```
/
├── index.html                    # 메인 앱 (탭: 휴가/시간외/급여/프로필)
├── app.js                        # 앱 초기화, 탭 전환 (syncCloudData 교체 대상)
├── profile.js                    # 프로필 CRUD (Supabase hook → SyncManager 교체)
├── overtime.js                   # 시간외 CRUD (Supabase hook → SyncManager 교체)
├── leave.js                      # 휴가 CRUD (Supabase hook → SyncManager + Calendar 교체)
├── salary-parser.js              # 급여명세서 파서 (Drive hook 신규 추가)
├── shared-layout.js              # 헤더/푸터 (authContainer → Google Auth UI 교체)
├── supabaseClient.js             # 유지 (앱 인프라용). getUserStorageKey만 교체
│
├── [P1 신규] googleAuth.js       # Google 로그인, 로그아웃, scope 관리, bhm_settings 유틸
├── [P2 신규] googleDriveStore.js # Drive appDataFolder CRUD
├── [P2 신규] syncManager.js      # 동기화 오케스트레이션, 디바운스, 충돌 해결
├── [P3 신규] googleCalendarSync.js # Calendar 이벤트 CRUD, 전용 캘린더 관리
│
├── docs/
│   ├── google-auth-spec.md           # 이 파일 (Phase별 배포 포함)
│   ├── google-data-sync-spec.md      # 탭별 데이터 상세 분석
│   ├── google-auth-drive-calendar-implementation-plan.md
│   └── google-auth-onboarding-wireframe.html
│
└── server/                       # Hono + Drizzle + Supabase (변경 없음)
```

---

## 코드 스타일

현재 코드베이스는 Vanilla JS 전역 객체 패턴을 따른다 (`PROFILE`, `OVERTIME`, `LEAVE`와 동일):

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
  _user: null,   // { sub, email, name, picture }

  init() { /* GIS 라이브러리 로드 후 tokenClient 초기화 */ },
  signIn() { /* tokenClient.requestAccessToken() */ },
  signOut() { /* token 폐기 */ },
  isSignedIn() { return !!this._accessToken; },
  getAccessToken() { return this._accessToken; },
  requestDriveScope() { /* incremental authorization */ },
  requestCalendarScope() { /* incremental authorization */ },
};
window.GoogleAuth = GoogleAuth;
```

**규칙:**
- 신규 파일: `window.XxxYyy = XxxYyy` 형태로 전역 노출
- 비공개 메서드/속성: `_` prefix
- async 함수: try/catch + console.warn + 토스트 표시
- 한국어 주석, 영어 식별자
- 파일 상단 배너 주석 형식 유지

---

## 동기화 대상 데이터

### Drive 동기화 파일 목록

| Drive 파일 | localStorage 원본 키 | 변경 트리거 | 디바운스 |
|------------|-------------------|------------|--------|
| `appDataFolder/profile.json` | `bhm_hr_profile_{sub}`, `otManualHourly_{sub}` | `PROFILE.save()` | 3초 |
| `appDataFolder/overtime.json` | `overtimeRecords_{sub}` | `OVERTIME.add/update/delete()` | 3초 |
| `appDataFolder/leave.json` | `leaveRecords_{sub}` | `LEAVE.add/update/delete()` | 3초 |
| `appDataFolder/payslips/payslip_{YYYY}_{MM}.json` | `payslip_{YYYY}_{MM}` | `saveMonthlyData()` | 즉시 |
| `appDataFolder/payslips/original_{YYYY}_{MM}.pdf` | File (메모리) | PDF 업로드 완료 시 | 즉시 |

> 급여명세서 PDF 원본 백업은 별도 opt-in (가장 민감한 데이터).
> JSON 파싱 결과 백업은 기본 Drive 백업 활성화 시 포함.

### Calendar 이벤트 매핑 (휴가만)

| 휴가 유형 | Calendar 이벤트 유형 | 제목 (genericTitle) | 제목 (detailedTitle) |
|----------|---------------------|-------------------|-------------------|
| 날짜 단위 (`annual`, `sick` 등) | all-day event | `휴가` | `연차`, `병가`, ... |
| 시간차 (`time_leave`) | timed event (09:00 기준) | `휴가` | `시간차` |

**기본값:** `privacyMode = "genericTitle"` (모든 이벤트 제목 = `"휴가"`)

**이벤트 속성:**
- `visibility: private`
- `transparency: opaque`
- `extendedProperties.private.bhmLeaveId` — 앱 레코드 ID 연결
- `extendedProperties.private.bhmSource: "bhm_overtime"`

**시간외 Calendar 동기화: 제외** (업무 기록이므로 개인 일정과 혼재 방지)

---

## 동기화 흐름

```
사용자 액션 (저장/수정/삭제)
  │
  ├─ 1. localStorage 저장 (항상 먼저, 동기적, 실패 없음)
  ├─ 2. SyncManager.enqueuePush(dataType)
  │     └─ 3초 디바운스 → GoogleDriveStore.writeJsonFile() → Drive 업로드
  │         ├─ 성공: settings.lastDriveSyncAt 업데이트
  │         └─ 실패: 토스트("저장됐지만 백업 실패"), 로컬 유지
  │
  └─ 3. [휴가만] GoogleCalendarSync.createOrUpdateEvent(record)
        ├─ 성공: record.googleEventId 저장
        └─ 실패: record.calendarSyncStatus = 'error', 토스트
```

**충돌 해결 (새 기기 로그인 시):**

| 상황 | 처리 |
|------|------|
| Drive만 있음 (로컬 비어있음) | Drive 데이터 복원, "이전 기기 기록을 불러왔어요" 표시 |
| 로컬만 있음 (Drive 비어있음) | 로컬 데이터를 Drive에 업로드 |
| 둘 다 있음 | `updatedAt` 최신 우선 (동일 시 Drive 우선) |

---

## 온보딩 UX (7단계)

와이어프레임: [docs/google-auth-onboarding-wireframe.html](./google-auth-onboarding-wireframe.html)

| 화면 | 상태 표시 | 주요 CTA |
|------|----------|---------|
| 1. 로컬 상태 | 이 브라우저에만 저장 중 | Google로 연결 |
| 2. 계정 연결됨 | 연결됨 / 백업 꺼짐 / 캘린더 꺼짐 | Google 백업 켜기 |
| 3. 백업 안내 | Drive scope 요청 전 설명 | 권한 확인하고 백업 시작 |
| 4. 백업 완료 | 연결됨 / 백업 켜짐 / 캘린더 꺼짐 | 캘린더 연동 설정 |
| 5. 캘린더 제안 | — | 캘린더 접근 권한 허용 |
| 6. 캘린더 선택 | 전용 캘린더 / 기본 캘린더 선택 | 이 설정으로 시작 |
| 7. 완료 | 연결됨 / 백업 켜짐 / 캘린더 켜짐 | 휴가 기록하러 가기 |

---

## Testing Strategy

**프레임워크:** 없음 (수동 브라우저 QA)

### Phase 1 QA (Google Auth)
- [ ] Google 로그인 팝업 → 계정 선택 → 헤더에 이름/아바타 표시
- [ ] 헤더 상태 배지: "연결됨 / 백업 꺼짐 / 캘린더 꺼짐"
- [ ] "연결 해제" → 로그인 버튼으로 복원
- [ ] 비로그인 상태에서 프로필/시간외/휴가 CRUD 정상 동작
- [ ] 로그인 상태에서 프로필/시간외/휴가 CRUD 정상 동작
- [ ] localStorage 키가 `baseKey_{googleSub}` 형식 확인
- [ ] 팝업 차단 시 안내 토스트 표시
- [ ] `?mode=family` 접속 시 안내 배너 표시

### Phase 2 QA (Drive 백업)
- [ ] "Google 백업 켜기" → Drive scope 동의 → 백업 활성화
- [ ] 프로필 저장 → `appDataFolder/profile.json` 업데이트 (Drive에서 직접 확인)
- [ ] 시간외 추가 → `overtime.json` 업데이트
- [ ] 휴가 추가 → `leave.json` 업데이트
- [ ] 급여명세서 PDF 업로드 → `payslips/payslip_YYYY_MM.json` 생성
- [ ] 시크릿 모드에서 동일 계정 로그인 → 복원 선택 화면 표시 → 데이터 복원 확인
- [ ] 오프라인 상태에서 저장 → 로컬 성공, 토스트만 표시
- [ ] 기존 파일 백업/복원 기능 정상 동작

### Phase 3 QA (Calendar)
- [ ] "캘린더 연동 켜기" → Calendar scope 동의 → "SNUH Mate 휴가" 캘린더 생성
- [ ] 날짜 단위 휴가 추가 → Google Calendar에 all-day event 생성 확인
- [ ] 시간차 추가 → timed event 생성 확인
- [ ] 휴가 수정 → 이벤트 갱신 확인
- [ ] 휴가 삭제 → 이벤트 삭제 확인
- [ ] 시간외 기록 추가 → Calendar에 이벤트 생성 안 됨 확인
- [ ] Calendar 권한 거부 → 휴가 저장은 정상
- [ ] 이벤트 제목 = "휴가" (genericTitle 기본값) 확인
- [ ] detailedTitle 모드에서 "연차", "병가" 확인

### 회귀 QA (전체)
- [ ] Supabase Admin `/admin` 접근 정상
- [ ] `/api/data/bundle` API 정상 응답
- [ ] 프로필 저장 → 급여 계산 정상
- [ ] 시간외 계산 정상
- [ ] 파일 백업/복원 기능 정상

---

## Boundaries

**Always:**
- 로컬 저장 먼저, Google sync는 항상 비동기 후속 처리
- Google API 실패 시 앱 사용을 막지 않는다
- `accessToken`은 메모리에만 보관 (localStorage 저장 금지)
- 기존 Supabase 인프라 코드 (`server/`, `supabaseClient.js` 앱 인프라 부분) 변경 금지
- 모든 Google 기능은 사용자가 명시적 opt-in 후에만 활성화
- Drive/Calendar scope는 해당 기능을 켤 때 별도로 요청 (로그인 시 통합 요청 금지)

**Ask first:**
- GCP OAuth Client ID 및 consent screen 설정
- Drive 파일 구조 (파일명, 경로) 변경
- Calendar 이벤트 스키마 변경
- 급여명세서 PDF 원본 Drive 백업 활성화 시점
- `?mode=family` URL 최종 제거 시점 (안내 기간 후)

**Never:**
- 로그인 직후 자동으로 데이터를 Drive/Calendar에 업로드
- Drive/Calendar scope를 로그인 시 같이 요청
- 기존 로컬 데이터를 로그인/연동 시 자동 삭제
- 사용자 `accessToken`을 서버에 전송
- 시간외 기록을 Google Calendar에 추가

---

## 배포 계획 (Phase별 단계 배포)

| Phase | 범위 | 배포 방식 | 완료 기준 |
|-------|------|----------|----------|
| **Phase 0** | GCP 설정 + 코드 경계 주석 | 배포 없음 | OAuth Client ID 발급, Authorized origin 등록 |
| **Phase 1** | Google 로그인 + 사용자 키 전환 + `isFamilyMode` UI 교체 | Vercel Preview → Production | 로그인/로그아웃 정상, 헤더 상태 배지 표시 |
| **Phase 2** | Drive 백업/복원 + 자동 동기화 + 급여명세서 JSON 백업 | Vercel Preview → Production | 3개 파일 Drive 왕복 성공, 복원 확인 |
| **Phase 3** | 휴가 → Calendar 자동 연동 | Vercel Preview → Production | 휴가 CRUD → Calendar 반영 확인 |
| **Phase 4** | 급여명세서 PDF 원본 Drive 백업 (별도 opt-in) | Vercel Preview → Production | PDF Drive 업로드/복원 |
| **Phase 5** | `isFamilyMode` 코드 최종 제거 + SupabaseSync 사용자 데이터 호출 제거 | Vercel Preview → Production | `SupabaseSync` 사용자 데이터 호출 0건 |

각 Phase는 Preview 배포 → 직접 QA → Production 배포 순서로 진행한다.

---

## Open Questions (해결됨)

| 질문 | 답변 |
|------|------|
| GCP OAuth Client ID 필요 여부 | **필요함** — 개발자가 1회 발급. 사용자가 자기 계정으로 로그인하는 것과 별개 |
| `?mode=family` 처리 | **효력 없앰** — 기존 URL 접속 시 안내 배너 표시 후 점진 제거 |
| 급여명세서 백업 포함 여부 | **포함** — JSON 파싱 결과(기본 opt-in) + PDF 원본(별도 opt-in) |
| 시간외 Calendar 동기화 | **제외** — 휴가만 Calendar 연동 |
| 배포 방식 | **Phase별 단계 배포** — Preview 확인 후 Production |
