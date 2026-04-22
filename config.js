// ============================================================
// config.js — 로컬 전용 앱 설정
// ============================================================

window.BHM_CONFIG = {
  env: 'production',

  // Sentry 텔레메트리 (선택)
  // 발급 방법: https://sentry.io 무료 계정 → New Project → Browser JavaScript → DSN 복사
  // 형식: https://<key>@<org>.ingest.sentry.io/<project_id>
  // 빈 값이면 텔레메트리 비활성 (앱 정상 동작)
  sentryDsn: '',

};
