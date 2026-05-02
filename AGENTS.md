## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:

- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

## Testing and verification

When changing code, run the smallest relevant checks first, then run the full gate
before claiming completion.

Baseline commands:

- `pnpm lint` — ESLint guard for browser globals, module boundaries, and accidental undefineds.
- `pnpm check` — Astro/TypeScript project check for `apps/web`.
- `pnpm test:unit` — fast Vitest coverage for calculators, parsers, and pure client logic.
- `pnpm test:integration` — Vitest integration coverage for build, Firebase sync, CSP, data lifecycle, and browser-like contracts.
- `pnpm test:smoke` — Playwright smoke against the Astro dev server defined in `playwright.config.js`.
- `pnpm verify:data` — regulation/paytable source-of-truth drift checks.
- `pnpm verify` — full local pre-ship gate: lint, check, all tests, and build.

Change-specific minimums:

- Calculators, payroll, retirement, holidays, parsers: `pnpm test:unit`.
- Firebase/Auth/Firestore/localStorage sync: `pnpm test:integration`.
- Astro pages, CSS, tabs, navigation, browser-visible UI: `pnpm check && pnpm build && pnpm test:smoke`.
- Regulation, paytable, public data, generated mirrors: `pnpm verify:data`.
- Backend/FastAPI parsing service: `pnpm backend:test`.

For UI changes, do not stop at unit tests. Open the running app with browser
automation, interact with the changed route, and check browser console errors.
The current app server is Astro via `pnpm --filter @snuhmate/web dev`; do not use
`python3 -m http.server` for Astro routes.

If a command fails, fix the failure and rerun the failing command. Do not report
completion with known failing checks unless the user explicitly asks for a partial
state report.

## CLI workflow

Prefer local CLI tools for repository facts before reaching for heavier MCP context:

- `gh pr view --json ... | jq ...` for PR metadata, checks, comments, and review state.
- `gh issue list --json ... | jq ...` for issue triage.
- `rg` for code search.
- `jq` for JSON inspection.

If a task needs an unfamiliar CLI, read `<tool> --help` first and use the smallest
safe command that answers the question.

## Security operations gates

Run these before any deploy that touches Firebase/Firestore, localStorage lifecycle,
backend parser/admin, corpus, telemetry, or regulation/payroll data:

- `pnpm verify:data` — regulation/paytable drift.
- `pnpm security:rules` — Firestore emulator rules tests.
- `pnpm verify:security` — Firebase/security integration + rules tests.
- `pnpm security:ops` — full security/ops gate (data, security, build, smoke).
- `pnpm backend:test` — FastAPI backend (admin token, corpus, validation).

See `docs/operations/security-runbook.md` and `docs/operations/security-checklist.md`
for the operator workflow. Security/ops harness lives at `.claude/agents/smate-*`
(see `smate-security-ops`, `smate-firebase-security`, `smate-sync-guard`,
`smate-runbook` once PR-N7 lands).

## Project harness (`.Codex/`)

Security/operations work also uses the local harness in `.Codex/`:

- Orchestrator: `.Codex/agents/security-ops-orchestrator.md`
- Specialists: `.Codex/agents/firebase-security-gate.md`, `.Codex/agents/sync-qa.md`, `.Codex/agents/ops-runbook-maintainer.md`
- Skill: `.Codex/skills/security-ops/SKILL.md`

Trigger this harness for 보안, 운영 관리, Firebase/Firestore rules, localStorage sync,
로그인/로그아웃 데이터 보존, CI 보안 게이트, runbook/checklist work.

## Code simplify harness

Code simplification work uses the local harness in `.Codex/`:

- Orchestrator: `.Codex/agents/code-simplify-orchestrator.md`
- Specialists: `.Codex/agents/sync-contract-guardian.md`, `.Codex/agents/payslip-lifecycle-simplifier.md`, `.Codex/agents/static-boundary-guardian.md`, `.Codex/agents/regression-test-sentinel.md`
- Skill: `.Codex/skills/code-simplify/SKILL.md`

Trigger this harness for code-simplify, 리팩터링, 코드 정리, 중복 제거, `app.js`
분리, Firebase/Firestore sync 단순화, 급여명세서 lifecycle 정리, public/static
mirror cleanup work. Treat sync and localStorage paths as protected contracts before
deleting or moving code.
