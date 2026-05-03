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

// 병원 이메일 도메인 화이트리스트 (사용자 확정 2026-05-03)
//   snuh.org   서울대학교병원 (본원, 어린이병원, 강남센터)
//   brmh.org   보라매병원
//   snubh.org  분당서울대학교병원
//   snudh.org  서울대학교치과병원
//   ntrh.or.kr 국립교통재활병원 (위탁운영)
export const HOSPITAL_EMAIL_DOMAINS = [
  'snuh.org',
  'brmh.org',
  'snubh.org',
  'snudh.org',
  'ntrh.or.kr',
];

export function isHospitalEmail(email) {
  if (typeof email !== 'string') return false;
  const at = email.lastIndexOf('@');
  if (at < 0) return false;
  const domain = email.slice(at + 1).toLowerCase();
  return HOSPITAL_EMAIL_DOMAINS.includes(domain);
}
