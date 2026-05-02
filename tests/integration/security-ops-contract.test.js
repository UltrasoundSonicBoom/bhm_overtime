import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

function script(name) {
  return pkg.scripts?.[name] || '';
}

describe('security operations command contract', () => {
  it('exposes runnable security and data gates', () => {
    for (const name of ['verify:data', 'security:rules', 'verify:security', 'security:ops']) {
      expect(script(name), `${name} script missing`).toBeTruthy();
    }
  });

  it('security:rules runs Firestore emulator-backed rules tests', () => {
    expect(script('security:rules')).toContain('firebase emulators:exec');
    expect(script('security:rules')).toContain('tests/integration/firebase/security-rules.test.js');
  });

  it('security:ops composes data drift, security, app, and browser checks', () => {
    const cmd = script('security:ops');
    expect(cmd).toContain('verify:data');
    expect(cmd).toContain('verify:security');
    expect(cmd).toContain('check');
    expect(cmd).toContain('build');
    expect(cmd).toContain('test:smoke');
  });
});

describe('security operations documentation contract', () => {
  it('keeps the spec and operator docs in-repo', () => {
    expect(existsSync('docs/superpowers/specs/2026-05-02-security-operations.md')).toBe(true);
    expect(existsSync('docs/operations/security-runbook.md')).toBe(true);
    expect(existsSync('docs/operations/security-checklist.md')).toBe(true);
  });

  it('runbook references the actual package scripts', () => {
    const runbook = readFileSync('docs/operations/security-runbook.md', 'utf8');
    for (const name of ['pnpm verify:data', 'pnpm security:rules', 'pnpm verify:security', 'pnpm security:ops']) {
      expect(runbook).toContain(name);
    }
  });
});
