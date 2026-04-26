// shared-utils.js — 여러 파일에서 공유되는 유틸리티
// 가장 먼저 로드되어야 하는 공용 헬퍼만. 도메인 로직 금지.

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 호환층 (IIFE 모듈이 window.escapeHtml 참조)
if (typeof window !== 'undefined') {
  window.escapeHtml = escapeHtml;
}
