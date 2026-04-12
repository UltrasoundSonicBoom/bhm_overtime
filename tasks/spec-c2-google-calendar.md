# Spec: C2 -- Google Calendar Integration

## Goal

Google Calendar API 연동으로 휴가/온콜 일정을 Google Calendar에 추가.

## Design Principles

- "Calendar에 추가" 버튼 클릭 시에만 Google Calendar API 호출
- 자동 동기화 없음 (사용자 명시적 opt-in)
- `calendar.events` scope 사용 (이벤트 생성만)
- 추가 데이터: 휴가 기록 (시간외는 제외)
- 기존 Calendar 읽기 금지
- 앱 전용 secondary calendar 생성 ('SNUH Mate 휴가')

## Implementation (googleCalendarSync.js)

### API
- `GoogleCalendarSync.createOrUpdateEvent(record)` -- 이벤트 생성/수정
- `GoogleCalendarSync.deleteEvent(record)` -- 이벤트 삭제
- `GoogleCalendarSync.ensureDedicatedCalendar()` -- 전용 캘린더 확보
- `GoogleCalendarSync.resyncAll()` -- 전체 재동기화
- `GoogleCalendarSync.disconnect()` -- 연동 해제

### UI (index.html)
- googleCalendarSection: Calendar 연동 토글
- Google login 상태에서만 표시
- calendarToggle: 연동 활성화/비활성화

## Files
- googleCalendarSync.js
- index.html (Google Calendar 연동 섹션)
