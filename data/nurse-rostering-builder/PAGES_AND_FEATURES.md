# 간호사 근무표 빌더 - 페이지 및 기능 상세 문서

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [데이터베이스 스키마](#데이터베이스-스키마)
3. [페이지별 기능 및 연동](#페이지별-기능-및-연동)
4. [사용자 역할별 네비게이션](#사용자-역할별-네비게이션)

---

## 프로젝트 개요

**한국형 간호사 근무표 빌더 SaaS 플랫폼**

- **목표:** 병원의 간호사 근무표를 AI 알고리즘으로 자동 생성하고, 관리자가 관리하며, 간호사가 개인 근무표를 확인하고 요청(휴가, 교환)할 수 있는 통합 시스템
- **기술 스택:** React 19 + Tailwind CSS 4 + Express 4 + tRPC 11 + MySQL/TiDB + Drizzle ORM
- **인증:** Manus OAuth 기반 사용자 관리
- **주요 기능:** 근무표 자동 생성, 제약 조건 검증, 오프/교환 요청 관리, 실시간 알림

---

## 데이터베이스 스키마

### 1. **users** 테이블
사용자 인증 및 기본 정보 저장

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INT (PK) | 사용자 고유 ID |
| `openId` | VARCHAR(64) | Manus OAuth 식별자 (unique) |
| `name` | TEXT | 사용자 이름 |
| `email` | VARCHAR(320) | 이메일 주소 |
| `loginMethod` | VARCHAR(64) | 로그인 방식 |
| `role` | ENUM('user', 'admin') | 사용자 역할 |
| `createdAt` | TIMESTAMP | 생성 일시 |
| `updatedAt` | TIMESTAMP | 수정 일시 |
| `lastSignedIn` | TIMESTAMP | 마지막 로그인 시간 |

**관계:** 1:1 → nurseProfiles

---

### 2. **nurse_profiles** 테이블
간호사 프로필 및 근무 선호도

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INT (PK) | 간호사 프로필 ID |
| `user_id` | INT (FK) | 사용자 ID |
| `ward_id` | INT (FK) | 병동 ID |
| `employee_id` | VARCHAR(50) | 직원 ID (unique) |
| `career_years` | DECIMAL(3,1) | 경력 년수 |
| `qualification` | VARCHAR(100) | 자격 사항 (예: RN, BSN) |
| `preferred_shifts` | JSON | 선호 근무 시간대 (["day", "evening", "night"]) |
| `max_consecutive_nights` | INT | 최대 연속 야간 근무 일수 (기본값: 3) |
| `createdAt` | TIMESTAMP | 생성 일시 |
| `updatedAt` | TIMESTAMP | 수정 일시 |

**관계:** N:1 → users, N:1 → wards

---

### 3. **wards** 테이블
병동 정보 관리

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INT (PK) | 병동 ID |
| `name` | VARCHAR(100) | 병동명 (예: 내과 병동) |
| `description` | TEXT | 병동 설명 |
| `total_nurses` | INT | 총 간호사 수 |
| `createdAt` | TIMESTAMP | 생성 일시 |
| `updatedAt` | TIMESTAMP | 수정 일시 |

**관계:** 1:N → nurseProfiles, 1:N → schedules

---

### 4. **schedules** 테이블
근무표 마스터 정보

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INT (PK) | 근무표 ID |
| `ward_id` | INT (FK) | 병동 ID |
| `year` | INT | 연도 (예: 2026) |
| `month` | INT | 월 (1-12) |
| `status` | ENUM | 상태: draft(작성중) / pending(검토중) / confirmed(확정) / archived(보관) |
| `day_shift_required` | INT | 일근 필요 인원 (평일) |
| `evening_shift_required` | INT | 저녁 필요 인원 (평일) |
| `night_shift_required` | INT | 야간 필요 인원 (평일) |
| `weekend_day_shift_required` | INT | 일근 필요 인원 (주말) |
| `weekend_evening_shift_required` | INT | 저녁 필요 인원 (주말) |
| `weekend_night_shift_required` | INT | 야간 필요 인원 (주말) |
| `created_by` | INT (FK) | 생성자 (users.id) |
| `confirmed_at` | TIMESTAMP | 확정 일시 |
| `createdAt` | TIMESTAMP | 생성 일시 |
| `updatedAt` | TIMESTAMP | 수정 일시 |

**관계:** N:1 → wards, 1:N → shiftAssignments, 1:N → offRequests, 1:N → shiftSwapRequests

---

### 5. **shift_assignments** 테이블
개별 근무 배정 상세

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INT (PK) | 배정 ID |
| `schedule_id` | INT (FK) | 근무표 ID |
| `nurse_id` | INT (FK) | 간호사 ID (nurseProfiles.id) |
| `date` | DATE | 근무 날짜 |
| `shift_type` | ENUM | 근무 유형: day(일근) / evening(저녁) / night(야간) / off(휴무) |
| `is_weekend` | BOOLEAN | 주말 여부 |
| `createdAt` | TIMESTAMP | 생성 일시 |
| `updatedAt` | TIMESTAMP | 수정 일시 |

**관계:** N:1 → schedules, N:1 → nurseProfiles

---

### 6. **off_requests** 테이블
휴가/블록 신청

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INT (PK) | 신청 ID |
| `schedule_id` | INT (FK) | 근무표 ID |
| `nurse_id` | INT (FK) | 신청 간호사 ID |
| `requested_date` | DATE | 신청 날짜 |
| `reason` | TEXT | 신청 사유 |
| `status` | ENUM | 상태: pending(대기) / approved(승인) / rejected(거절) |
| `approved_by` | INT (FK) | 승인자 (users.id) |
| `approved_at` | TIMESTAMP | 승인 일시 |
| `createdAt` | TIMESTAMP | 신청 일시 |
| `updatedAt` | TIMESTAMP | 수정 일시 |

**관계:** N:1 → schedules, N:1 → nurseProfiles, N:1 → users(approved_by)

---

### 7. **shift_swap_requests** 테이블
근무 교환 요청

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INT (PK) | 요청 ID |
| `schedule_id` | INT (FK) | 근무표 ID |
| `requesting_nurse_id` | INT (FK) | 요청 간호사 ID |
| `target_nurse_id` | INT (FK) | 대상 간호사 ID |
| `requested_date` | DATE | 요청 간호사의 근무 날짜 |
| `target_date` | DATE | 대상 간호사의 근무 날짜 |
| `reason` | TEXT | 교환 사유 |
| `status` | ENUM | 상태: pending(대기) / approved(승인) / rejected(거절) |
| `approved_by` | INT (FK) | 승인자 (users.id) |
| `approved_at` | TIMESTAMP | 승인 일시 |
| `createdAt` | TIMESTAMP | 신청 일시 |
| `updatedAt` | TIMESTAMP | 수정 일시 |

**관계:** N:1 → schedules, N:1 → nurseProfiles(requesting), N:1 → nurseProfiles(target), N:1 → users(approved_by)

---

### 8. **notifications** 테이블
사용자 알림 로그

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INT (PK) | 알림 ID |
| `recipient_id` | INT (FK) | 수신자 (users.id) |
| `type` | ENUM | 알림 유형: schedule_confirmed / off_approved / off_rejected / swap_approved / swap_rejected |
| `title` | VARCHAR(200) | 알림 제목 |
| `content` | TEXT | 알림 내용 |
| `related_schedule_id` | INT (FK) | 관련 근무표 ID |
| `related_request_id` | INT (FK) | 관련 요청 ID |
| `is_read` | BOOLEAN | 읽음 여부 |
| `createdAt` | TIMESTAMP | 생성 일시 |

**관계:** N:1 → users(recipient), N:1 → schedules(related)

---

## 페이지별 기능 및 연동

### 🏠 홈 페이지 (/)

**역할:** 랜딩 페이지 및 역할별 리다이렉트

**주요 기능:**
- 로그인 상태 확인
- 사용자 역할(admin/user)에 따라 자동 리다이렉트
- 미로그인 시 로그인 유도

**DB 연동:**
- `users` 테이블에서 역할 정보 조회

**tRPC 프로시저:**
- `auth.me` - 현재 사용자 정보 조회

---

### 👨‍💼 관리자 대시보드 (/admin/dashboard)

**역할:** 관리자 업무 요약 및 빠른 접근

**주요 기능:**
- 📊 통계 카드
  - 총 간호사 수
  - 이번달 근무표 수
  - 대기 중인 오프 신청
  - 대기 중인 교환 요청
- 📋 최근 근무표 목록 (5개)
- 📝 최근 요청 목록 (오프/교환)
- ⚡ 빠른 작업 버튼 (새 근무표 생성, 요청 관리)

**DB 연동:**
- `schedules` - 근무표 목록
- `offRequests` - 오프 신청 통계
- `shiftSwapRequests` - 교환 요청 통계
- `nurseProfiles` - 간호사 수

**tRPC 프로시저:**
- `admin.getDashboardStats` - 대시보드 통계
- `admin.getRecentSchedules` - 최근 근무표
- `admin.getRecentRequests` - 최근 요청

---

### 📅 근무표 관리 (/admin/schedules)

**역할:** 근무표 생성, 조회, 수정, 삭제

**주요 기능:**
- 🔍 필터
  - 병동 선택
  - 연도/월 선택
  - 상태 필터 (draft/pending/confirmed/archived)
- 📊 근무표 목록 테이블
  - 병동명, 연월, 상태, 생성일, 생성자
- ⚙️ 액션 버튼
  - 상세 보기 → ScheduleDetail 페이지
  - 편집 → ScheduleDetail 페이지 (편집 모드)
  - 삭제 → 확인 후 삭제
  - 다운로드 → CSV 다운로드

**DB 연동:**
- `schedules` - 근무표 마스터
- `wards` - 병동 정보
- `users` - 생성자 정보

**tRPC 프로시저:**
- `schedule.list` - 근무표 목록 조회 (필터 적용)
- `schedule.delete` - 근무표 삭제
- `schedule.download` - CSV 다운로드

---

### 📊 근무표 상세 (/admin/schedules/:id)

**역할:** 근무표 상세 조회 및 편집

**주요 기능:**
- 📋 헤더 정보
  - 병동명, 연월, 상태
  - 생성자, 생성일, 확정일
- 📈 간트 차트 시각화
  - 30일 × 간호사 수 그리드
  - 근무 유형별 색상 구분 (일근/저녁/야간/휴무)
  - 주말 시각적 구분
  - 클릭하여 근무 유형 변경 (편집 모드)
- 📊 통계 패널
  - 간호사별 근무일 수
  - 근무 유형별 분포
  - 주말 근무 횟수
- ✅ 제약 조건 검증 결과
  - Hard constraints (필수): 위반 시 빨간색 경고
  - Soft constraints (권장): 위반 시 노란색 경고
  - 위반 상세 정보 표시
- 🔘 액션 버튼
  - 편집 모드 토글
  - 확정 (상태 변경)
  - 다운로드 (CSV)
  - 뒤로가기

**DB 연동:**
- `schedules` - 근무표 정보
- `shiftAssignments` - 개별 배정
- `nurseProfiles` - 간호사 정보
- `wards` - 병동 정보

**tRPC 프로시저:**
- `schedule.getById` - 근무표 상세 조회
- `schedule.update` - 근무표 수정 (배정 변경)
- `schedule.validate` - 제약 조건 검증
- `schedule.confirm` - 근무표 확정

---

### 👥 간호사 및 병동 관리 (/admin/profiles)

**역할:** 간호사 프로필 및 병동 정보 관리

**주요 기능:**
- 🔄 탭 인터페이스
  - 간호사 탭
  - 병동 탭

**간호사 탭:**
- 📋 간호사 목록 테이블
  - 이름, 직원ID, 경력, 자격, 병동, 선호 근무
- ➕ 추가 버튼 → 간호사 추가 모달
- 🗑️ 삭제 버튼
- 📝 상세 정보 모달 (클릭 시)

**병동 탭:**
- 📋 병동 목록 테이블
  - 병동명, 총 간호사 수, 수간호사
- ➕ 추가 버튼 → 병동 추가 모달
- 🗑️ 삭제 버튼
- 👥 병동별 간호사 리스트 (클릭 시)

**DB 연동:**
- `nurseProfiles` - 간호사 프로필
- `wards` - 병동 정보
- `users` - 사용자 정보

**tRPC 프로시저:**
- `nurse.list` - 간호사 목록
- `nurse.create` - 간호사 추가
- `nurse.update` - 간호사 정보 수정
- `nurse.delete` - 간호사 삭제
- `ward.list` - 병동 목록
- `ward.create` - 병동 추가
- `ward.update` - 병동 정보 수정
- `ward.delete` - 병동 삭제

---

### 📋 요청 관리 (/admin/requests)

**역할:** 오프 신청 및 교환 요청 승인/거절

**주요 기능:**
- 🔄 탭 인터페이스
  - 오프 신청 탭
  - 근무 교환 탭

**각 탭 공통:**
- 🔍 상태 필터 (pending/approved/rejected)
- 📊 요청 목록 테이블
  - 신청자, 신청 날짜, 사유, 상태, 신청일
- 📝 상세 모달 (클릭 시)
  - 신청 정보 표시
  - 승인/거절 버튼
  - 거절 사유 입력 필드

**DB 연동:**
- `offRequests` - 오프 신청
- `shiftSwapRequests` - 교환 요청
- `nurseProfiles` - 간호사 정보
- `users` - 승인자 정보

**tRPC 프로시저:**
- `offRequest.list` - 오프 신청 목록
- `offRequest.approve` - 오프 신청 승인
- `offRequest.reject` - 오프 신청 거절
- `shiftSwap.list` - 교환 요청 목록
- `shiftSwap.approve` - 교환 요청 승인
- `shiftSwap.reject` - 교환 요청 거절

---

### 📊 분석 대시보드 (/admin/analytics)

**역할:** 공정성 지표 및 통계 분석

**주요 기능:**
- 📈 공정성 지표
  - 간호사별 야간 근무 횟수 (막대 차트)
  - 간호사별 휴무일 (막대 차트)
  - 주말 근무 분포 (원형 차트)
- 👥 간호사별 통계 테이블
  - 이름, 총 근무일, 일근/저녁/야간 일수, 주말 근무
- 🏥 병동별 통계 테이블
  - 병동명, 간호사 수, 평균 근무일, 공정성 점수

**DB 연동:**
- `shiftAssignments` - 근무 배정
- `nurseProfiles` - 간호사 정보
- `schedules` - 근무표 정보
- `wards` - 병동 정보

**tRPC 프로시저:**
- `analytics.getFairnessMetrics` - 공정성 지표
- `analytics.getNurseStats` - 간호사별 통계
- `analytics.getWardStats` - 병동별 통계

---

### 🏠 간호사 대시보드 (/nurse/dashboard)

**역할:** 간호사 업무 요약 및 빠른 접근

**주요 기능:**
- 📊 이번달 통계 카드
  - 근무일 수
  - 야간 근무 수
  - 휴무일 수
  - 주말 근무 수
- 📅 이번달 근무표 미리보기
  - 간트 차트 (읽기 전용)
  - 색상별 근무 유형 표시
- 🔔 최근 알림 (5개)
  - 오프 신청 결과
  - 교환 요청 결과
  - 근무표 확정 알림
- ⚡ 빠른 작업 버튼
  - 오프 신청
  - 교환 요청
  - 통계 보기
  - 알림 확인

**DB 연동:**
- `shiftAssignments` - 개인 근무 배정
- `schedules` - 근무표 정보
- `notifications` - 알림 정보
- `offRequests` - 오프 신청 상태
- `shiftSwapRequests` - 교환 요청 상태

**tRPC 프로시저:**
- `nurse.getMyStats` - 개인 통계
- `nurse.getMySchedule` - 개인 근무표
- `nurse.getNotifications` - 알림 목록

---

### 📅 내 근무표 (/nurse/my-schedule)

**역할:** 개인 월간 근무표 조회

**주요 기능:**
- 🗓️ 월 선택 네비게이션
  - 이전/다음 월 버튼
  - 현재 월 표시
- 📊 월간 근무표 (30일)
  - 색상별 근무 유형 (일근/저녁/야간/휴무)
  - 주말 시각적 구분
  - 클릭하여 상세 정보 조회
- 📋 근무별 상세 정보
  - 근무 시간 (예: 08:00~17:00)
  - 근무 유형
  - 이전/다음 근무 정보
- 📊 통계 패널
  - 이번달 근무일 수
  - 근무 유형별 분포
  - 주말 근무 횟수
  - 근무 비율 (%)
- 📌 주요 정보
  - 야간 근무 연속 제한 상태
  - 다음 근무 일정
  - 다음 휴무일
  - 근무 비율
- 📋 대기 중인 요청
  - 교환 요청 수
  - 휴가 신청 수
  - 관리자 승인 대기 수
- 🔄 최근 활동 타임라인
  - 근무표 확정
  - 근무표 생성
  - 이전달 근무표 확정

**DB 연동:**
- `shiftAssignments` - 개인 근무 배정
- `schedules` - 근무표 정보
- `offRequests` - 오프 신청 상태
- `shiftSwapRequests` - 교환 요청 상태

**tRPC 프로시저:**
- `nurse.getMySchedule` - 개인 근무표 조회
- `nurse.getMyStats` - 개인 통계
- `nurse.getPendingRequests` - 대기 중인 요청

---

### 📝 오프 신청 (/nurse/off-request)

**역할:** 휴가/블록 신청

**주요 기능:**
- 📝 오프 신청 폼
  - 신청 유형 선택 (휴가/블록/병가)
  - 신청 날짜 선택
  - 종료 날짜 선택 (선택)
  - 사유 입력
  - 제출 버튼
- 📋 신청 이력 테이블
  - 신청 날짜, 유형, 사유, 상태
  - 승인/거절 일시
  - 거절 사유 (거절 시)
  - 삭제 버튼 (대기 중인 신청만)
- 📖 신청 정책 가이드
  - 휴가: 미리 신청 필요
  - 블록: 다음날 근무 불가
  - 병가: 응급 상황 시 신청

**DB 연동:**
- `offRequests` - 오프 신청
- `schedules` - 근무표 정보
- `shiftAssignments` - 근무 배정 확인

**tRPC 프로시저:**
- `offRequest.create` - 오프 신청 생성
- `offRequest.getMyRequests` - 개인 신청 목록
- `offRequest.delete` - 신청 취소 (대기 중인 신청만)

---

### 🔄 근무 교환 (/nurse/shift-swap)

**역할:** 다른 간호사와 근무 교환 요청

**주요 기능:**
- 📝 교환 요청 폼
  - 내 근무 날짜 선택
  - 내 근무 시간대 표시 (자동)
  - 교환할 간호사 선택 (드롭다운)
  - 대상 간호사의 근무 날짜 선택
  - 대상 간호사의 근무 시간대 표시 (자동)
  - 교환 사유 입력
  - 제출 버튼
- 📋 요청 이력 테이블
  - 내 근무 (날짜/시간), 대상 간호사, 대상 근무 (날짜/시간), 상태
  - 승인/거절 일시
  - 거절 사유 (거절 시)
  - 삭제 버튼 (대기 중인 신청만)
- 📖 교환 정책 가이드
  - 같은 근무 유형만 교환 가능
  - 대상 간호사의 승인 필요
  - 관리자의 최종 승인 필요

**DB 연동:**
- `shiftSwapRequests` - 교환 요청
- `shiftAssignments` - 근무 배정 정보
- `nurseProfiles` - 간호사 정보
- `schedules` - 근무표 정보

**tRPC 프로시저:**
- `shiftSwap.create` - 교환 요청 생성
- `shiftSwap.getMyRequests` - 개인 요청 목록
- `shiftSwap.getAvailableNurses` - 교환 가능한 간호사 목록
- `shiftSwap.delete` - 요청 취소 (대기 중인 요청만)

---

### 🔔 알림 (/nurse/notifications)

**역할:** 알림 조회 및 관리

**주요 기능:**
- 🔍 필터
  - 읽음/미읽음 필터
  - 알림 유형 필터 (근무표/오프/교환)
- 🔔 알림 목록
  - 시간순 정렬 (최신순)
  - 읽음 여부 표시 (뱃지)
  - 알림 제목, 내용, 생성 시간
- 📝 알림 상세 정보
  - 클릭 시 상세 정보 표시
  - 관련 근무표/요청 링크
  - 읽음 처리 버튼

**DB 연동:**
- `notifications` - 알림 정보
- `schedules` - 관련 근무표
- `offRequests` - 관련 오프 신청
- `shiftSwapRequests` - 관련 교환 요청

**tRPC 프로시저:**
- `notification.getMyNotifications` - 개인 알림 목록
- `notification.markAsRead` - 알림 읽음 처리
- `notification.delete` - 알림 삭제

---

## 사용자 역할별 네비게이션

### 👨‍💼 관리자 (admin) 메뉴

```
1. 대시보드
   └─ /admin/dashboard

2. 근무표 관리
   ├─ /admin/schedules (목록)
   ├─ /admin/schedules/:id (상세)
   └─ /admin/schedules/:id/edit (편집)

3. 간호사 및 병동 관리
   └─ /admin/profiles

4. 요청 관리
   └─ /admin/requests

5. 분석 대시보드
   └─ /admin/analytics
```

### 👩‍⚕️ 간호사 (user) 메뉴

```
1. 대시보드
   └─ /nurse/dashboard

2. 내 근무표
   └─ /nurse/my-schedule

3. 오프 신청
   └─ /nurse/off-request

4. 근무 교환
   └─ /nurse/shift-swap

5. 알림
   └─ /nurse/notifications
```

---

## 📱 레이아웃 구조

### 관리자 레이아웃
```
┌─────────────────────────────────────┐
│ Header (로고, 프로필, 로그아웃)      │
├──────────────┬──────────────────────┤
│ Sidebar      │ Main Content         │
│ (메뉴)       │ (페이지 내용)        │
│              │                      │
│              │                      │
└──────────────┴──────────────────────┘
```

### 간호사 레이아웃
```
┌─────────────────────────────────────┐
│ Header (로고, 프로필, 로그아웃)      │
├─────────────────────────────────────┤
│ Main Content (페이지 내용)          │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ Footer (정보)                       │
└─────────────────────────────────────┘
```

---

## 🔗 tRPC 라우터 구조

### 인증 라우터 (`auth`)
- `me` - 현재 사용자 정보
- `logout` - 로그아웃

### 근무표 라우터 (`schedule`)
- `list` - 근무표 목록 (필터 적용)
- `getById` - 근무표 상세 조회
- `create` - 근무표 생성
- `update` - 근무표 수정
- `delete` - 근무표 삭제
- `validate` - 제약 조건 검증
- `confirm` - 근무표 확정
- `autoGenerate` - AI 자동 생성

### 간호사 라우터 (`nurse`)
- `getMySchedule` - 개인 근무표
- `getMyStats` - 개인 통계
- `getPendingRequests` - 대기 중인 요청
- `getNotifications` - 알림 목록

### 오프 신청 라우터 (`offRequest`)
- `create` - 신청 생성
- `getMyRequests` - 개인 신청 목록
- `delete` - 신청 취소

### 교환 요청 라우터 (`shiftSwap`)
- `create` - 요청 생성
- `getMyRequests` - 개인 요청 목록
- `getAvailableNurses` - 교환 가능한 간호사
- `delete` - 요청 취소

---

## 🎯 주요 워크플로우

### 1. 근무표 생성 워크플로우
```
관리자 → 근무표 생성 폼 입력 → AI 자동 생성 
→ 제약 조건 검증 → 편집 (필요시) 
→ 확정 → 간호사에게 알림 → 완료
```

### 2. 오프 신청 워크플로우
```
간호사 → 오프 신청 폼 작성 → 제출 
→ 관리자 검토 → 승인/거절 
→ 간호사에게 알림 → 완료
```

### 3. 근무 교환 워크플로우
```
간호사 A → 교환 요청 작성 → 제출 
→ 관리자 검토 → 승인/거절 
→ 양쪽 간호사에게 알림 → 완료
```

---

## 📊 데이터 흐름 다이어그램

```
사용자 (User)
    ↓
OAuth 인증 (Manus)
    ↓
users 테이블 저장
    ↓
역할 확인 (admin/user)
    ↓
┌─────────────────┬──────────────────┐
│                 │                  │
관리자 역할      간호사 역할
    │                 │
    ├─ 근무표 관리   ├─ 내 근무표 조회
    ├─ 요청 관리     ├─ 오프 신청
    ├─ 간호사 관리   ├─ 교환 요청
    └─ 분석          └─ 알림 조회
    
    ↓                 ↓
schedules         shiftAssignments
nurseProfiles     offRequests
wards             shiftSwapRequests
offRequests       notifications
shiftSwapRequests
notifications
```

---

**문서 최종 수정:** 2026년 4월 13일
**버전:** 1.0
