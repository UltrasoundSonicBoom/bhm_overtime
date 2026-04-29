// Phase 8 follow-up: 순수 헬퍼 단위 테스트
//   - validatePassword (auth-ui.js)  : 길이 8~12 검증
//   - humanReason (migration-dialog.js): Firestore error code → 한국어 매핑
//
// 둘 다 DOM/localStorage 의존 없는 pure function — vitest 가 직접 import 가능.
import { describe, it, expect } from 'vitest';
import { validatePassword } from '../../apps/web/src/firebase/auth-validators.js';
import { humanReason } from '../../apps/web/src/firebase/migration-errors.js';

describe('validatePassword (auth-ui)', () => {
  it('8자 이상 12자 이하만 허용', () => {
    expect(validatePassword('Test1234')).toBeNull();      // 8자
    expect(validatePassword('TestPass2026')).toBeNull();  // 12자
  });

  it('7자 이하 거부', () => {
    expect(validatePassword('Pass12')).toMatch(/8자 이상/);
    expect(validatePassword('A')).toMatch(/8자 이상/);
  });

  it('13자 이상 거부 (사용자 결정: 길면 까먹음 → max 12)', () => {
    expect(validatePassword('TestPassword2026')).toMatch(/12자 이하/);
    expect(validatePassword('1'.repeat(13))).toMatch(/12자 이하/);
  });

  it('빈/undefined/null 거부 (8자 이상 메시지)', () => {
    expect(validatePassword('')).toMatch(/8자 이상/);
    expect(validatePassword(undefined)).toMatch(/8자 이상/);
    expect(validatePassword(null)).toMatch(/8자 이상/);
  });

  it('공백을 trim 하지 않음 (passwords 의도 보존)', () => {
    // " 12345678 " = 10자 → null (허용). trim 했다면 8자 → null. 둘 다 null 이므로 별도 케이스.
    // 9자 + 양 공백 1자씩 = 11자 → null. trim 후 9 → null. 동일 결과.
    // 핵심: 공백 포함 8자 (예: ' Pass123') → null. trim 시 7자 → 거부. trim 안 함 검증:
    expect(validatePassword(' Pass123')).toBeNull(); // 8자 → 통과 (trim X)
  });
});

describe('humanReason (migration-dialog)', () => {
  it('Firestore unavailable code → 인터넷 연결 메시지', () => {
    expect(humanReason({ code: 'unavailable' })).toBe('인터넷 연결을 확인해주세요');
  });

  it('명시적 network 메시지 → 인터넷 연결 메시지 (code 없어도)', () => {
    expect(humanReason({ message: 'network error: ...' })).toBe('인터넷 연결을 확인해주세요');
    expect(humanReason({ message: 'browser is offline' })).toBe('인터넷 연결을 확인해주세요');
    expect(humanReason({ message: 'TypeError: failed to fetch' })).toBe('인터넷 연결을 확인해주세요');
  });

  it('관련 없는 message 의 단어 일치 false-positive 방지', () => {
    // 'fetch' 단독 단어는 매핑되지만 'prefetch' 등은 매치되지 않아야 함 — \b(failed to fetch)\b 정확 매치
    const result = humanReason({ message: 'prefetch metadata succeeded' });
    expect(result).not.toBe('인터넷 연결을 확인해주세요');
  });

  it('permission-denied → 권한 거부 메시지', () => {
    expect(humanReason({ code: 'permission-denied' })).toMatch(/권한 거부/);
  });

  it('unauthenticated → 인증 만료 메시지', () => {
    expect(humanReason({ code: 'unauthenticated' })).toMatch(/인증 만료/);
  });

  it('resource-exhausted → 한도 초과 메시지', () => {
    expect(humanReason({ code: 'resource-exhausted' })).toMatch(/한도 초과/);
  });

  it('deadline-exceeded → 시간 초과 메시지', () => {
    expect(humanReason({ code: 'deadline-exceeded' })).toMatch(/시간 초과/);
  });

  it('failed-precondition → 데이터 충돌 메시지', () => {
    expect(humanReason({ code: 'failed-precondition' })).toMatch(/데이터 충돌/);
  });

  it('알 수 없는 code + 메시지 → 슬라이스된 오류 노출 (60자)', () => {
    const longMsg = 'x'.repeat(200);
    const result = humanReason({ code: 'something-unknown', message: longMsg });
    expect(result).toMatch(/^오류: /);
    expect(result.length).toBeLessThanOrEqual(64); // '오류: ' (4자) + 60자
  });

  it('메시지 내 newline/탭은 단일 공백으로 정리', () => {
    const noisy = 'line1\n\n\tline2   line3';
    const result = humanReason({ message: noisy });
    // newline/tab/연속 공백이 단일 공백으로 평탄화되어야 함
    expect(result).not.toMatch(/[\n\t]/);
    expect(result).not.toMatch(/  +/); // 두 칸 이상 연속 공백 없음
  });

  it('빈 err / 빈 message → 일반 fallback', () => {
    expect(humanReason({})).toBe('일시적 오류 — 다시 시도해주세요');
    expect(humanReason(null)).toBe('일시적 오류 — 다시 시도해주세요');
    expect(humanReason(undefined)).toBe('일시적 오류 — 다시 시도해주세요');
  });
});
