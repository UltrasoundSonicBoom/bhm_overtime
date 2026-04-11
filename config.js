// ============================================================
// config.js — Google 연동 공개 제어 설정
// 운영 도메인에서도 심사 전까지는 리뷰/QA 사용자만 Google 기능 사용
// ============================================================

window.BHM_CONFIG = {
  env: 'production',

  // 운영용 OAuth Client ID
  googleClientId: '914163950802-vov9iusqqaj0139g06ccbo4q8pp6dcbl.apps.googleusercontent.com',

  // 기능 플래그
  googleAuthEnabled: true,
  googleDriveEnabled: true,
  googleCalendarEnabled: true,

  // 캘린더 전략
  // appCreatedCalendar: "SNUH Mate 휴가" 전용 secondary calendar 생성
  // primary: 사용자의 기본 캘린더에 이벤트 생성
  googleCalendarMode: 'appCreatedCalendar',
  googleCalendarScope: 'https://www.googleapis.com/auth/calendar.app.created',

  // 심사/QA 리뷰 모드
  reviewModeEnabled: true,
  reviewQueryParam: 'google_beta',
  reviewQueryValue: '1',
  allowLocalhostInReviewMode: true,

  // 심사 전 허용 사용자 제한
  allowlistEnabled: true,
  allowlistEmails: [
    'stevegogothing@gmail.com'
  ]
};
