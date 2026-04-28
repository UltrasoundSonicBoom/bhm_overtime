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

// ============================================================
// Phase 8: Firebase config (Cloudflare Pages env vars 주입)
// ------------------------------------------------------------
// 로컬 dev: apps/web/.env.local (gitignored)
// Production: Cloudflare Pages dashboard → Workers 및 페이지 → snuhmate
//             → 설정 → 변수 및 비밀 → Production + Preview 양쪽 등록
// API key 는 public — Security Rules 가 보호. 빈 값이면 Firebase 비활성 (게스트 모드).
// ============================================================
export const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
  measurementId: import.meta.env.PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Phase 2-F: ESM marker — 파일을 ES module 로 표시 (side-effect IIFE 보존)
export {};
