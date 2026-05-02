# Security Operations Checklist

Use this before deploys that touch Firebase, Firestore, localStorage lifecycle, backend parser/admin, corpus, telemetry, or regulation/payroll data.

## Pre-Deploy Gate

- [ ] `git status --short` reviewed; unrelated work is not staged or overwritten.
- [ ] `pnpm install --frozen-lockfile` completed if dependencies changed.
- [ ] `pnpm security:ops` passed.
- [ ] `pnpm backend:test` passed for backend/admin/corpus changes.
- [ ] `pnpm verify:data` passed after regulation, paytable, parser, or data-source changes.
- [ ] `pnpm security:rules` passed after `firestore.rules`, Firebase sync, or Firestore path changes.
- [ ] No real payslip, employee id, admin token, Firebase token, or API key appears in the diff.

## Firebase / Firestore

- [ ] `firestore.rules` still allows only authenticated `users/{uid}/**` access where `request.auth.uid == uid`.
- [ ] Unauthenticated access is denied.
- [ ] Other-uid access is denied.
- [ ] Top-level `admin/`, `public/`, `anonymous_corpus`, and arbitrary collections are denied.
- [ ] New localStorage sync keys are reflected in `apps/web/src/firebase/key-registry.js`.
- [ ] New sensitive Firestore fields have an explicit decision in `apps/web/src/firebase/sync/_encrypted-fields.js`.
- [ ] Guest mode still works without Firebase config or network.
- [ ] Login sets uid, hydrates cloud data, and starts auto-sync.
- [ ] Logout clears uid-scoped local data and shared `leaveRecords` / `snuhmate_schedule_records`.

## localStorage / Sync Lifecycle

- [ ] Guest data does not disappear when opening the login surface.
- [ ] `window.recordLocalEdit(base)` is called for new write paths.
- [ ] `auto-sync.js` has a handler for every synced localStorage base key.
- [ ] `hydrate.js` reads the same categories that auto-sync writes.
- [ ] Shared keys are called out explicitly; cross-user reports on shared keys are treated as S1.
- [ ] Lifecycle checks run when relevant:

```bash
pnpm exec playwright test tests/e2e/firebase-sync.spec.js
pnpm vitest run tests/unit/firebase/user-storage-key.test.js
pnpm vitest run tests/integration/firebase/key-registry.test.js tests/integration/firebase/inventory-coverage.test.js
```

## Backend Admin

- [ ] `SNUHMATE_ADMIN_TOKEN` is set only on the backend host, never client config or source.
- [ ] Missing token config returns 503.
- [ ] Missing bearer header returns 401.
- [ ] Wrong bearer token returns 403.
- [ ] Valid `Authorization: Bearer $SNUHMATE_ADMIN_TOKEN` returns admin reviews.

## Corpus / Privacy

- [ ] Corpus submissions go through `POST /corpus/submit`.
- [ ] Client anonymization runs before submit.
- [ ] Server validation uses `sanitize_corpus_payload`.
- [ ] SQLite corpus/review queue is the storage target.
- [ ] No original file, raw text, name, employee number, payslip payload, or free-form note is stored in corpus.

## Data / Regulation Drift

- [ ] `pnpm verify:data` passed.
- [ ] Generated reports reviewed when changed:
  - `docs/architecture/registry-link-report.md`
  - `docs/architecture/paytable-link-report.md`
- [ ] Authoritative raw source was updated before generated artifacts.
- [ ] `public/data/*` and `apps/web/public/data/*` mirrors are both updated where required.

## Sentry / Logs

- [ ] Sentry DSN is intentionally empty or reviewed.
- [ ] `beforeSend` strips request cookies, request data, and user data.
- [ ] Telemetry payloads pass `apps/web/src/client/telemetry-sanitizer.js`.
- [ ] No logs include raw payroll, schedule rows, employee ids, names, notes, bearer tokens, or Firebase tokens.

## Incident / Rollback Readiness

- [ ] Incident severity can be classified as S0, S1, S2, or S3.
- [ ] Previous known-good app deployment is identifiable in Vercel.
- [ ] Previous known-good `firestore.rules` revision is available.
- [ ] Backend token rotation path is known.
- [ ] Data rollback source is authoritative raw data first, generated artifacts second.
- [ ] Post-rollback commands are ready:

```bash
pnpm verify:data
pnpm verify:security
pnpm test:integration
pnpm test:smoke
pnpm backend:test
```
