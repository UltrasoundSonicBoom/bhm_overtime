// firebase/migration-errors.js — 순수 error 매핑 (DOM/Firebase 의존성 없음)
//
// 별도 모듈인 이유: vitest 단위 테스트가 migration-dialog.js 를 import 하면
// 의존 체인의 config.js (`window.BHM_CONFIG`) 가 node 환경에서 ReferenceError.
// 순수 함수만 분리하면 직접 import 가능.

// Firestore error code → 한국어 사용자 메시지.
// 인식되지 않은 코드는 message 일부 노출 (60자 슬라이스 + whitespace 정리).
export function humanReason(err) {
  const code = err?.code || '';
  const msg = err?.message || '';
  if (code === 'unavailable' || /\b(network error|offline|failed to fetch)\b/i.test(msg)) {
    return '인터넷 연결을 확인해주세요';
  }
  if (code === 'permission-denied') return '권한 거부 — 다시 로그인해주세요';
  if (code === 'unauthenticated') return '인증 만료 — 다시 로그인해주세요';
  if (code === 'resource-exhausted') return '요청 한도 초과 — 잠시 후 재시도';
  if (code === 'deadline-exceeded') return '응답 시간 초과 — 다시 시도';
  if (code === 'failed-precondition') return '데이터 충돌 — 다시 시도';
  return msg ? `오류: ${msg.replace(/\s+/g, ' ').slice(0, 60)}` : '일시적 오류 — 다시 시도해주세요';
}
