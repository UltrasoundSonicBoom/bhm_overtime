import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const REQUIRED_FILES = [
  'docs/superpowers/specs/2026-05-02-code-simplify.md',
  '.Codex/skills/code-simplify/SKILL.md',
  '.Codex/agents/code-simplify-orchestrator.md',
  '.Codex/agents/sync-contract-guardian.md',
  '.Codex/agents/payslip-lifecycle-simplifier.md',
  '.Codex/agents/static-boundary-guardian.md',
  '.Codex/agents/regression-test-sentinel.md',
];

describe('code-simplify harness contract', () => {
  it('keeps the simplify spec, skill, and harness agents in-repo', () => {
    for (const file of REQUIRED_FILES) {
      expect(existsSync(file), `${file} missing`).toBe(true);
    }
  });

  it('documents sync modules as protected rather than deletion targets', () => {
    const spec = readFileSync('docs/superpowers/specs/2026-05-02-code-simplify.md', 'utf8');
    for (const protectedPath of [
      'apps/web/src/firebase/auto-sync.js',
      'apps/web/src/firebase/hydrate.js',
      'apps/web/src/firebase/auth-service.js',
      'apps/web/src/client/inline-ui-helpers.js',
      'apps/web/src/firebase/key-registry.js',
      'apps/web/src/firebase/sync/_encrypted-fields.js',
    ]) {
      expect(spec, `${protectedPath} not protected in spec`).toContain(protectedPath);
    }
  });

  it('routes code-simplify work through the local harness', () => {
    const agents = readFileSync('AGENTS.md', 'utf8');
    expect(agents).toContain('.Codex/skills/code-simplify/SKILL.md');
    expect(agents).toContain('.Codex/agents/code-simplify-orchestrator.md');
    expect(agents).toContain('code-simplify');
  });

  it('keeps payslip upload handlers on the shared save/propagate helpers', () => {
    const app = readFileSync('apps/web/src/client/app.js', 'utf8');
    expect(app).toContain('function _savePayslipMonth(parsed, ym)');
    expect(app).toContain('function _propagatePayslipEffects(savedPayslip, ym)');

    const payrollStart = app.indexOf('async function handlePayslipUpload');
    const payrollEnd = app.indexOf('// ── 프로필 탭에서 급여명세서로 자동입력', payrollStart);
    const profileStart = app.indexOf('async function handleProfilePayslipUpload');
    const profileEnd = app.indexOf('// ═══════════ 탭 fragment', profileStart);

    const payrollHandler = app.slice(payrollStart, payrollEnd);
    const profileHandler = app.slice(profileStart, profileEnd);

    for (const [name, handler] of [
      ['handlePayslipUpload', payrollHandler],
      ['handleProfilePayslipUpload', profileHandler],
    ]) {
      expect(handler, `${name}: shared monthly save helper missing`).toContain('_savePayslipMonth(parsed, ym)');
      expect(handler, `${name}: shared propagation helper missing`).toContain('_propagatePayslipEffects(savedPayslip, ym)');
      expect(handler, `${name}: direct monthly save should stay inside helper`).not.toContain('SALARY_PARSER.saveMonthlyData');
    }
  });
});
