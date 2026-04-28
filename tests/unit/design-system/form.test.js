import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';

const read = (p) => readFileSync(p, 'utf-8');

describe('FormField wrapper', () => {
  let src; beforeAll(() => { src = read('apps/web/src/components/ui/FormField.astro'); });
  it('label / helper / error / required Props 정의', () => {
    expect(src).toMatch(/label\?:\s*string/);
    expect(src).toMatch(/helper\?:\s*string/);
    expect(src).toMatch(/error\?:\s*string/);
    expect(src).toMatch(/required\?:\s*boolean/);
  });
  it('legacy .form-group 클래스 호환', () => {
    expect(src).toMatch(/\bform-group\b/);
  });
  it('error 메시지에 role="alert"', () => {
    expect(src).toMatch(/role=["']alert["']/);
  });
  it('required 표시 (asterisk + aria-hidden)', () => {
    expect(src).toMatch(/aria-hidden=["']true["']/);
  });
});

describe('Input', () => {
  let src; beforeAll(() => { src = read('apps/web/src/components/ui/Input.astro'); });
  it('type 6종 (text/email/tel/number/date/password)', () => {
    expect(src).toMatch(/['"]text['"]\s*\|\s*['"]email['"]\s*\|\s*['"]tel['"]\s*\|\s*['"]number['"]\s*\|\s*['"]date['"]\s*\|\s*['"]password['"]/);
  });
  it('focus-ring 토큰 사용 (border-ds-border-focus + ring-ds + ring-ds-focus)', () => {
    expect(src).toMatch(/border-ds-border-focus/);
    expect(src).toMatch(/focus:ring-ds/);
  });
  it('aria-invalid string 캐스팅', () => {
    expect(src).toMatch(/aria-invalid=\{[^}]*\?\s*['"]true['"]\s*:\s*['"]false['"]\}|aria-invalid={invalid \? ['"]true['"] : ['"]false['"]}/);
  });
  it('disabled 상태 클래스 (opacity-50 + cursor-not-allowed)', () => {
    expect(src).toMatch(/disabled:opacity-50/);
    expect(src).toMatch(/disabled:cursor-not-allowed/);
  });
});

describe('Select', () => {
  let src; beforeAll(() => { src = read('apps/web/src/components/ui/Select.astro'); });
  it('options prop (Option[]) 정의', () => {
    expect(src).toMatch(/options\??:\s*Option\[\]/);
  });
  it('options 비어있을 때 slot fallback', () => {
    expect(src).toMatch(/<slot\s*\/>/);
  });
});

describe('Textarea', () => {
  let src; beforeAll(() => { src = read('apps/web/src/components/ui/Textarea.astro'); });
  it('rows / maxLength prop', () => {
    expect(src).toMatch(/rows\??:\s*number/);
    expect(src).toMatch(/maxLength\??:\s*number/);
  });
  it('resize-y 클래스', () => {
    expect(src).toMatch(/resize-y/);
  });
});

describe('Checkbox', () => {
  let src; beforeAll(() => { src = read('apps/web/src/components/ui/Checkbox.astro'); });
  it('input type=checkbox', () => {
    expect(src).toMatch(/type=["']checkbox["']/);
  });
  it('label wrap (cursor-pointer)', () => {
    expect(src).toMatch(/cursor-pointer/);
  });
});

describe('Radio', () => {
  let src; beforeAll(() => { src = read('apps/web/src/components/ui/Radio.astro'); });
  it('input type=radio + name 필수', () => {
    expect(src).toMatch(/type=["']radio["']/);
    expect(src).toMatch(/name:\s*string/);  // required (no ?)
  });
});

describe('Switch', () => {
  let src; beforeAll(() => { src = read('apps/web/src/components/ui/Switch.astro'); });
  it('role="switch" + aria-checked string 캐스팅', () => {
    expect(src).toMatch(/role=["']switch["']/);
    expect(src).toMatch(/aria-checked=\{[^}]*\?\s*['"]true['"]\s*:\s*['"]false['"]\}/);
  });
  it('peer-checked 활성 색상', () => {
    expect(src).toMatch(/peer-checked:bg-ds-brand-primary/);
  });
});
