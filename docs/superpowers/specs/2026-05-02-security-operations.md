# Spec: Security & Operations Gate

**작성일**: 2026-05-02  
**브랜치**: `codex/backend`  
**범위**: SNUH Mate Firebase/Firestore 동기화, 로컬 백엔드, 급여/근무표/규정 데이터 운영

## Assumptions

사용자가 "물어볼 게 있으면 recommended로 선택해서 진행"을 지시했으므로 아래 결정을 기본값으로 확정한다.

1. Firebase Auth + Firestore는 로그인 사용자 데이터의 운영 경계로 유지한다.
2. 게스트 모드는 계속 localStorage-only이며, 로그인 없이도 핵심 기능은 동작해야 한다.
3. Firestore rules는 `users/{uid}/**` 본인 접근만 허용하고 public/admin/top-level 컬렉션은 차단한다.
4. 보안 운영은 문서만으로 끝내지 않고 CI, 테스트, Playwright, runbook으로 검증 가능해야 한다.
5. 실제 Firebase 계정/운영 secrets가 필요한 테스트는 기본 CI에서 요구하지 않는다. 대신 emulator와 네트워크 차단형 readiness test를 사용한다.

## Objective

SNUH Mate가 급여명세서, 근무표, 프로필, 근무이력, 규정 즐겨찾기처럼 민감하거나 장기 보존되는 데이터를 다루기 시작했으므로, 매 배포 전 아래를 자동으로 증명한다.

- 다른 사용자의 Firestore 경로를 읽거나 쓸 수 없다.
- 게스트 localStorage 데이터가 로그인 준비 화면과 탭 이동 중 사라지지 않는다.
- 민감 필드 암호화 allowlist와 Firestore path registry가 drift 없이 유지된다.
- 규정/호봉표 SoT 값이 계산 registry와 어긋나지 않는다.
- 운영자가 장애, 데이터 손상, sync 실패, 규정 drift를 같은 절차로 대응할 수 있다.

## Tech Stack

- Frontend: Astro static app in `apps/web`
- Auth/DB: Firebase Auth + Firestore
- Local backend: FastAPI in `backend`
- Test: Vitest, Playwright, Firebase emulator rules-unit-testing
- Package manager: `pnpm@10.33.2`
- Deployment target: `apps/web/dist`

## Commands

```bash
pnpm verify:data
pnpm security:rules
pnpm verify:security
pnpm security:ops
pnpm test:smoke
pnpm backend:test
```

## Project Structure

```text
firestore.rules                              Firestore access boundary
firebase.json                                Emulator config for rules tests
apps/web/src/firebase/                       Auth, hydrate, sync, crypto
apps/web/src/firebase/sync/_encrypted-fields.js
tests/integration/firebase/security-rules.test.js
tests/integration/firebase/encrypted-fields.test.js
tests/e2e/firebase-sync.spec.js
docs/operations/security-runbook.md
docs/operations/security-checklist.md
.github/workflows/security-ops.yml
```

## Code Style

Security tests should name the user-visible failure, not only the implementation detail.

```js
it('인증 + 다른 uid doc 접근 차단', async () => {
  const { assertFails } = testingMod;
  const ctx = testEnv.authenticatedContext('alice');
  await assertFails(ctx.firestore().doc('users/bob/profile/identity').get());
});
```

Runtime code must not log raw payroll, employee id, free-form notes, or parsed payslip payloads. Tests may use synthetic Korean fixtures, but never real user documents.

## Testing Strategy

- Unit tests: pure calculators, key helpers, encryption helpers.
- Integration tests: Firebase sync module contracts, encrypted-field registry, backend auth/corpus behavior.
- Firestore emulator tests: strict uid isolation and top-level collection denial.
- Playwright: localStorage/Firebase readiness, tab navigation persistence, no live Firebase network in readiness mode.
- CI gate: run deterministic checks first, then browser smoke.

## Boundaries

- Always:
  - Keep Firestore data under `users/{uid}/**`.
  - Run `pnpm verify:data` after rule/registry/regulation changes.
  - Keep guest mode working without Firebase network.
  - Use synthetic fixtures only.
- Ask first:
  - Adding new external services.
  - Allowing public Firestore reads.
  - Uploading original payslip PDFs outside user-selected Google Drive.
  - Changing data retention policy.
- Never:
  - Commit secrets or real payslips.
  - Add admin bypasses to Firestore rules.
  - Make live Firebase credentials required for default CI.
  - Remove failing security tests to unblock a deploy.

## Success Criteria

- `pnpm security:rules` runs Firestore emulator rules tests without manual emulator startup.
- `pnpm verify:security` runs security-critical local tests and rules tests.
- `pnpm security:ops` runs data checks, security checks, app checks/build, and Playwright smoke.
- CI has a security workflow that executes the same gates on pull requests and pushes.
- Playwright verifies the Firebase readiness surface without live Firebase calls.
- Operators have a runbook and checklist mapped to exact repo commands.

## Task Plan

### Task 1: CI and command gates

- Acceptance: package scripts expose `verify:data`, `security:rules`, `verify:security`, `security:ops`.
- Acceptance: `.github/workflows/security-ops.yml` runs install, data drift checks, Firestore rules emulator, unit/integration tests, Astro check/build, Playwright smoke.
- Verify: `pnpm verify:data`, `pnpm security:rules`.

### Task 2: Firebase/local sync Playwright coverage

- Acceptance: `tests/e2e/firebase-sync.spec.js` proves guest schedule/profile-like local fixtures survive settings/reference tab navigation.
- Acceptance: test captures and rejects live Firestore/Auth network calls in readiness mode.
- Verify: `pnpm exec playwright test tests/e2e/firebase-sync.spec.js`.

### Task 3: Operations docs

- Acceptance: `docs/operations/security-runbook.md` describes deploy, incident, sync, drift, backend admin, corpus, Sentry/log handling.
- Acceptance: `docs/operations/security-checklist.md` gives a compact pre-deploy checklist.
- Verify: commands in docs match `package.json`.

### Task 4: Final verification and landing

- Acceptance: local gates pass.
- Acceptance: branch is committed and pushed to `origin/codex/backend`.
- Verify: `git status --short --branch`.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Firebase emulator adds CI time | Medium | Run emulator only for rules tests, not full app tests |
| Playwright accidentally hits live Firebase | High | Capture `firestore.googleapis.com` and `identitytoolkit.googleapis.com` requests |
| Security docs drift from scripts | Medium | Checklist references package scripts, not duplicated shell fragments |
| Backend Poetry unavailable in CI | Medium | Keep backend test as local/ops command until CI environment is proven |

## Open Questions

None blocking. Recommended choices have been applied per user instruction.
