// ============================================
// sentry.js — 클라이언트 텔레메트리 (Sentry browser SDK)
// ============================================
//
// 설정 방법:
//   1. https://sentry.io 에서 무료 계정 생성 → Browser JavaScript 프로젝트
//   2. DSN 복사 (https://<key>@<org>.ingest.sentry.io/<project_id>)
//   3. config.js 의 SNUHMATE_CONFIG에 sentryDsn 추가
//   4. CSP connect-src에 https://*.sentry.io 이미 등록됨 (index.html:23)
//
// DSN 미설정 시: 조용히 no-op (앱 정상 동작)
// 공용 API: window.Telemetry.{track,error}

(function () {
  'use strict';

  var CONFIG = window.SNUHMATE_CONFIG || {};
  var SENTRY_DSN = CONFIG.sentryDsn || '';
  var APP_VERSION = window.APP_VERSION || 'dev';

  // SDK 로드 (DSN 있을 때만)
  if (SENTRY_DSN && !window.Sentry) {
    var script = document.createElement('script');
    script.src = 'https://browser.sentry-cdn.com/8.55.0/bundle.min.js';
    script.crossOrigin = 'anonymous';
    script.async = true;
    script.onload = function () { _init(); };
    script.onerror = function () { console.warn('[Sentry] SDK load failed'); };
    document.head.appendChild(script);
  } else if (SENTRY_DSN) {
    _init();
  }

  function _init() {
    if (!window.Sentry || !SENTRY_DSN) return;
    try {
      window.Sentry.init({
        dsn: SENTRY_DSN,
        release: APP_VERSION,
        sampleRate: 1.0,           // 에러는 전부 보냄
        tracesSampleRate: 0,       // 성능 추적 미사용 (비용 절감)
        autoSessionTracking: false,
        // PII 차단: 사용자 데이터(localStorage/Drive 내용)를 절대 외부로 보내지 않음
        beforeSend: function (event) {
          // request 본문/쿠키/사용자 정보 제거
          if (event.request) {
            delete event.request.cookies;
            delete event.request.data;
          }
          delete event.user;
          return event;
        },
        integrations: [],          // 기본 integration만 사용
      });
      console.log('[Sentry] initialized');
    } catch (e) {
      console.warn('[Sentry] init failed:', e);
    }
  }

  // ── 공용 API: window.Telemetry ──
  window.Telemetry = {
    track: function (eventType, payload) {
      if (!window.Sentry || !SENTRY_DSN) return;
      try {
        window.Sentry.captureMessage(String(eventType || 'unknown'), {
          level: 'info',
          extra: payload || {}
        });
      } catch (e) { /* swallow */ }
    },
    error: function (message, extra) {
      if (!window.Sentry || !SENTRY_DSN) return;
      try {
        window.Sentry.captureException(new Error(String(message || 'unknown')), {
          extra: extra || {}
        });
      } catch (e) { /* swallow */ }
    }
  };

  // 전역 오류 자동 보고 (Sentry SDK 자체에도 같은 기능이 있지만 명시)
  // SDK가 init 되면 window.onerror / unhandledrejection 자동 후킹.
  // 명시적 fallback은 불필요. 단, DSN 미설정 시 조용히 무시.
})();

// Phase 2-F: ESM marker — 파일을 ES module 로 표시 (side-effect IIFE 보존)
export {};
