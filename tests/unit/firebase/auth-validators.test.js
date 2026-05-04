import { describe, it, expect } from 'vitest';
import { validatePassword } from '../../../apps/web/src/firebase/auth-validators.js';

describe('validatePassword (Firebase 정책 동기화)', () => {
  it('8자 미만은 거부', () => {
    expect(validatePassword('Aa1!aaa')).toMatch(/8자 이상/);
  });
  it('12자 초과는 거부', () => {
    expect(validatePassword('Aa1!aaaaaaaaaaaa')).toMatch(/12자 이하/);
  });
  it('특수문자 없으면 거부', () => {
    expect(validatePassword('Snuhmate1234')).toMatch(/특수문자/);
  });
  it('영문자 없으면 거부', () => {
    expect(validatePassword('1234567890!')).toMatch(/영문자/);
  });
  it('숫자 없으면 거부', () => {
    expect(validatePassword('Snuhmate!@#')).toMatch(/숫자/);
  });
  it('정책 통과: 영문+숫자+특수문자 8-12자', () => {
    expect(validatePassword('Snuh1234!')).toBeNull();
  });
  it('빈 문자열은 거부', () => {
    expect(validatePassword('')).toMatch(/8자 이상/);
  });
});
