// firebase/auth-validators.js — 순수 검증 함수 (DOM/Firebase 의존성 없음)
//
// 별도 모듈인 이유: vitest 단위 테스트가 auth-ui.js 를 import 하면 config.js 의
// `window.SNUHMATE_CONFIG` 모듈 최상위 코드가 실행되어 ReferenceError. 순수 함수만
// 분리하면 node 환경에서 직접 import 가능.

// 비밀번호 8~12자 클라이언트 검증 (signUp 만 적용; signIn 은 legacy 호환)
// Firebase Console password policy 와 이중 강제 (defense in depth).
// 사용자 결정: 길면 까먹는다 → max 12.
export function validatePassword(pw) {
  if (!pw || pw.length < 8) return '비밀번호는 8자 이상이어야 합니다';
  if (pw.length > 12) return '비밀번호는 12자 이하여야 합니다 (기억성 우선)';
  return null;
}
