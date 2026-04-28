import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
const read = (p) => readFileSync(p, 'utf-8');

describe('PageHeader', () => {
  let s; beforeAll(() => { s = read('apps/web/src/components/patterns/PageHeader.astro'); });
  it('title required + description optional + level 1|2', () => {
    expect(s).toMatch(/title:\s*string/);
    expect(s).toMatch(/description\?:\s*string/);
    expect(s).toMatch(/level\?:\s*1\s*\|\s*2/);
  });
  it('actions slot 지원', () => {
    expect(s).toMatch(/<slot\s+name=["']actions["']/);
  });
  it('h1 또는 h2 출력', () => {
    expect(s).toMatch(/<h1/);
    expect(s).toMatch(/<h2/);
  });
});

describe('EmptyState', () => {
  let s; beforeAll(() => { s = read('apps/web/src/components/patterns/EmptyState.astro'); });
  it('title required + icon/description optional', () => {
    expect(s).toMatch(/title:\s*string/);
    expect(s).toMatch(/icon\?:\s*string/);
    expect(s).toMatch(/description\?:\s*string/);
  });
  it('action slot 지원', () => {
    expect(s).toMatch(/<slot\s+name=["']action["']/);
  });
  it('icon aria-hidden', () => {
    expect(s).toMatch(/aria-hidden=["']true["']/);
  });
});

describe('FormSection', () => {
  let s; beforeAll(() => { s = read('apps/web/src/components/patterns/FormSection.astro'); });
  it('title required + description optional + collapsible boolean', () => {
    expect(s).toMatch(/title:\s*string/);
    expect(s).toMatch(/description\?:\s*string/);
    expect(s).toMatch(/collapsible\?:\s*boolean/);
  });
  it('collapsible=true → <details>, false → <fieldset>+<legend>', () => {
    expect(s).toMatch(/<details/);
    expect(s).toMatch(/<fieldset/);
    expect(s).toMatch(/<legend/);
  });
});

describe('LoadingSkeleton', () => {
  let s; beforeAll(() => { s = read('apps/web/src/components/patterns/LoadingSkeleton.astro'); });
  it('count + width + height + shape (rect|circle|text) prop', () => {
    expect(s).toMatch(/count\?:\s*number/);
    expect(s).toMatch(/width\?:\s*string/);
    expect(s).toMatch(/height\?:\s*string/);
    expect(s).toMatch(/shape\?:\s*['"]rect['"]\s*\|\s*['"]circle['"]\s*\|\s*['"]text['"]/);
  });
  it('aria-busy="true" + aria-live=polite', () => {
    expect(s).toMatch(/aria-busy=["']true["']/);
    expect(s).toMatch(/aria-live=["']polite["']/);
  });
  it('animate-pulse 클래스', () => {
    expect(s).toMatch(/animate-pulse/);
  });
});

describe('ErrorState', () => {
  let s; beforeAll(() => { s = read('apps/web/src/components/patterns/ErrorState.astro'); });
  it('title required + message/icon optional', () => {
    expect(s).toMatch(/title:\s*string/);
    expect(s).toMatch(/message\?:\s*string/);
    expect(s).toMatch(/icon\?:\s*string/);
  });
  it('role="alert"', () => {
    expect(s).toMatch(/role=["']alert["']/);
  });
  it('action slot 지원', () => {
    expect(s).toMatch(/<slot\s+name=["']action["']/);
  });
  it('text-ds-status-error 토큰 사용', () => {
    expect(s).toMatch(/text-ds-status-error/);
  });
});
