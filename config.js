// ============================================================
// config.js — Google 연동 설정
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

};
