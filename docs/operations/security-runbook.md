# SNUH Mate Security Operations Runbook

> Scope: Firebase Auth/Firestore sync, browser localStorage lifecycle, local FastAPI parser backend, corpus/review operations, telemetry/log hygiene, data drift checks, incident severity, and rollback.
> Last repo check: 2026-05-02 on `codex/backend`.

## 1. Operator Quick Start

Run from the repo root:

```bash
pnpm install --frozen-lockfile
pnpm security:ops
pnpm backend:test
```

Security-critical gates currently exposed by `package.json`:

| Command | What it proves |
|---|---|
| `pnpm verify:data` | Regulation and paytable drift checks through `scripts/check-regulation-link.cjs` and `scripts/check-paytable.cjs`. |
| `pnpm security:rules` | Firestore emulator rules test from `tests/integration/firebase/security-rules.test.js`. |
| `pnpm verify:security` | Firebase/security integration tests plus Firestore rules. |
| `pnpm security:ops` | App check/build, data drift gates, unit/integration tests, security verification, and Playwright smoke. |
| `pnpm backend:test` | FastAPI backend tests, including admin token and corpus behavior. |

If one gate fails, stop the deploy. Do not bypass by weakening rules, deleting tests, or switching to live production data.

## 2. Runtime Security Map

| Surface | Repo source of truth | Operational rule |
|---|---|---|
| Firestore access boundary | `firestore.rules`, `firebase.json` | Only authenticated `request.auth.uid == userId` may access `users/{userId}/**`; every other path is denied. |
| Firebase browser integration | `apps/web/src/firebase/firebase-init.js`, `apps/web/src/client/config.js` | Firebase config is public app config; data protection comes from Auth, rules, and field encryption. Empty config means guest mode. |
| Login/logout lifecycle | `apps/web/src/firebase/auth-service.js`, `apps/web/src/firebase/hydrate.js` | Login sets `window.__firebaseUid`, hydrates cloud data, and starts auto-sync. Logout clears uid-scoped local data and shared schedule/leave keys. |
| Write-through sync | `apps/web/src/firebase/auto-sync.js`, `apps/web/src/client/inline-ui-helpers.js` | Local edits dispatch `app:local-edit`; logged-in users write to Firestore with debounce. Guest users do not write cloud data. |
| Storage registry | `apps/web/src/firebase/key-registry.js` | New synced localStorage keys must be registered with scope, Firestore path, shape, and category. |
| Field encryption | `apps/web/src/firebase/crypto.js`, `apps/web/src/firebase/sync/_encrypted-fields.js` | Sensitive Firestore fields are AES-GCM encrypted before write and decrypted after read. localStorage remains plaintext on the device. |
| Backend admin auth | `backend/app/security.py`, `backend/README.md` | `/admin/reviews` requires `Authorization: Bearer $SNUHMATE_ADMIN_TOKEN`; missing config fails closed with 503. |
| Corpus submission | `apps/web/src/firebase/sync/corpus-sync.js`, `backend/app/corpus/*` | Corpus goes only to FastAPI `/corpus/submit` and SQLite after anonymization and server allowlist validation. No top-level Firestore corpus collection. |
| Telemetry/log hygiene | `apps/web/src/client/sentry.js`, `apps/web/src/client/telemetry-sanitizer.js` | Sentry strips request body/cookies/user; parser telemetry rejects names, money, employee numbers, RRN-like values, and unsupported event types. |
| Deploy target | `vercel.json`, `apps/web/package.json` | Production build is `pnpm --filter @snuhmate/web build` with output `apps/web/dist`. |

## 3. Firebase And Firestore Rules

Current rule intent:

```text
users/{uid}/** read/write allowed only when request.auth.uid == uid.
All other paths are denied.
```

Before deploying Firestore rule changes:

```bash
pnpm security:rules
pnpm verify:security
```

If deploying rules manually:

```bash
npx firebase deploy --only firestore:rules
```

Never add:

- public reads for user data
- admin bypasses in Firestore rules
- top-level `anonymous_corpus`, `admin`, or `public` write paths
- rules that rely on client-side role claims without matching backend verification

## 4. localStorage / Firestore Lifecycle

SNUH Mate is local-first. For logged-in users, Firestore is the cloud authority and localStorage is the device working cache.

### Guest Mode

- No Firebase Auth is required.
- Data stays in browser localStorage.
- Key format is generally `*_guest` or shared app keys.
- `window.__firebaseUid` is absent, so `auto-sync.js` is a no-op.
- Guest data must survive app navigation and Firebase config absence.

### Login

1. `auth-service.js` receives the Firebase user.
2. `window.__firebaseUid = user.uid`.
3. `snuhmate_settings.googleSub` is set so payslip keys move to uid scope.
4. `migration-dialog.js` captures guest data before hydrate.
5. `hydrateFromFirestore(uid)` reads Firestore into localStorage.
6. `auto-sync.js` starts listening for local edits.
7. Optional migration dialog can upload selected guest categories.

### Logged-In Edits

1. UI writes localStorage.
2. `window.recordLocalEdit(base)` writes `snuhmate_last_edit_<base>`.
3. `app:local-edit` fires.
4. `auto-sync.js` maps the base key to a sync handler.
5. The handler writes to `users/{uid}/...`, encrypting configured fields.

### Logout

1. `auth-service.js` captures previous uid.
2. `clearLocalUserData(uid)` removes uid-scoped profile, overtime, payslip, work history, favorites, and shared `leaveRecords` / `snuhmate_schedule_records`.
3. `snuhmate_settings.googleSub` is removed.
4. `window.__firebaseUid` is deleted.
5. `app:auth-changed` clears pending auto-sync timers.

Operational warning: `leaveRecords` and `snuhmate_schedule_records` are shared localStorage keys in the current implementation. Treat cross-user reports on leave/schedule visibility as severity S1 until proven isolated by logout cleanup and tests.

Lifecycle checks:

```bash
pnpm exec playwright test tests/e2e/firebase-sync.spec.js
pnpm vitest run tests/unit/firebase/user-storage-key.test.js
pnpm vitest run tests/integration/firebase/key-registry.test.js tests/integration/firebase/inventory-coverage.test.js
```

## 5. Backend Admin Token

Admin review endpoints are local FastAPI routes:

- `GET /admin/reviews`
- `POST /admin/reviews/{id}/status`

Required environment:

```bash
export SNUHMATE_ADMIN_TOKEN="$(openssl rand -base64 32)"
```

Smoke:

```bash
cd backend
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
curl -i -H "Authorization: Bearer $SNUHMATE_ADMIN_TOKEN" http://localhost:8001/admin/reviews
```

Expected failure modes:

- no `SNUHMATE_ADMIN_TOKEN`: HTTP 503 `admin auth not configured`
- missing bearer header: HTTP 401 `admin token required`
- wrong token: HTTP 403 `admin token invalid`

Rotate the token immediately after suspected exposure. Do not commit the token, put it in client-side config, or paste it into issue comments.

## 6. Corpus Privacy

Supported path:

```text
schedule parser -> anonymize(grid) -> POST /corpus/submit -> server allowlist validation -> SQLite
```

Relevant files:

- Client submitter: `apps/web/src/firebase/sync/corpus-sync.js`
- Client anonymizer: `apps/web/src/client/schedule-parser/anonymize.js`
- Server validator: `backend/app/corpus/validation.py`
- Server store/review queue: `backend/app/corpus/store.py`
- SQLite location: `~/.snuhmate-backend/data.db` unless `SNUHMATE_BACKEND_DB` overrides it

Allowed corpus data is structural and anonymized: department category, parser version, confidence, codes found, month, and sanitized rows. Free-form raw schedule text, original files, names, employee numbers, raw payslips, and hospital identifiers are not allowed.

If corpus privacy is questioned:

```bash
pnpm backend:test
rg -n "anonymous_corpus|corpus/submit|sanitize_corpus_payload|SNUHMATE_BACKEND_DB" apps backend tests firestore.rules
```

Block the release if any code writes corpus data to top-level Firestore or bypasses `sanitize_corpus_payload`.

## 7. Sentry And Log Scrubbing

Sentry is optional and disabled when `window.SNUHMATE_CONFIG.sentryDsn` is empty.

Current client protections in `apps/web/src/client/sentry.js`:

- deletes `event.request.cookies`
- deletes `event.request.data`
- deletes `event.user`
- disables session tracking
- disables tracing

Parser telemetry protections in `apps/web/src/client/telemetry-sanitizer.js`:

- allowlisted event types only
- rejects money, employee numbers, Korean-name-shaped labels, and resident-number-like values
- rejects unsupported free-form payloads

Do not log or attach:

- payroll parsed fields
- payslip PDFs/images
- employee id or name
- free-form notes
- raw schedule rows from a real hospital export
- bearer tokens or Firebase id tokens

Before enabling Sentry DSN in any environment, run:

```bash
pnpm vitest run tests/unit/telemetry-sanitizer.test.js
pnpm test:integration
rg -n "console\\.(log|warn|error)|Telemetry\\.(track|error)|capture" apps/web/src backend/app
```

Review hits manually for raw payload exposure.

## 8. Data Drift Checks

Run after regulation, paytable, parser, or sync registry changes:

```bash
pnpm verify:data
pnpm test:unit
pnpm test:integration
```

Known drift anchors:

- `scripts/check-regulation-link.cjs`
- `scripts/check-paytable.cjs`
- `apps/web/public/data/calc-registry.json`
- `apps/web/public/data/union_regulation_2026.json`
- `apps/web/public/data/full_union_regulation_2026.md`
- `docs/architecture/sot-update-runbook.md`

For sync drift, compare:

- `apps/web/src/firebase/key-registry.js`
- `apps/web/src/firebase/auto-sync.js`
- `apps/web/src/firebase/hydrate.js`
- `apps/web/src/firebase/sync/_encrypted-fields.js`
- `docs/db-schema.md`

Release blocker examples:

- new localStorage key writes data but is absent from `key-registry.js`
- new Firestore path is outside `users/{uid}/**`
- sensitive field is added without encryption decision
- data check reports regulation/paytable mismatch

## 9. Incident Severity

| Severity | Examples | First response |
|---|---|---|
| S0 | Cross-user Firestore access, leaked token, real payslip/schedule data sent to logs/Sentry/external service, public Firestore read/write. | Freeze deploys, rotate secrets, rollback rules/app, preserve evidence, notify owner immediately. |
| S1 | Logout leaves another logged-in user's local data visible, corpus privacy bypass, admin endpoint accessible without valid token, encryption allowlist missing sensitive data. | Disable affected path if possible, run security gates, patch and verify before redeploy. |
| S2 | Data drift in regulation/paytable, failed hydrate/write-through for one category, Sentry DSN misconfigured without data leak. | Hold release if user-facing, repair source of truth, rerun relevant gates. |
| S3 | Documentation mismatch, non-sensitive warning logs, local dev setup issue. | Fix in normal workflow and mention in release notes if operator-facing. |

Evidence to collect:

- commit SHA and branch
- deploy URL and provider deployment id
- failing command output
- browser console/network screenshot when UI-related
- affected uid/path category, never the raw user payload
- time window in Asia/Seoul

## 10. Deploy And Rollback

### Pre-Deploy

```bash
git status --short
pnpm install --frozen-lockfile
pnpm security:ops
pnpm backend:test
```

Confirm:

- no secrets in `git diff`
- `firestore.rules` still denies non-`users/{uid}/**`
- Firebase config variables are set only in deployment provider env
- backend admin token is configured only on the backend host
- Sentry DSN is intentionally empty or reviewed for scrubbing

### Deploy

Vercel uses `vercel.json`:

```text
buildCommand: pnpm install --frozen-lockfile && pnpm --filter @snuhmate/web build
outputDirectory: apps/web/dist
```

Manual preview smoke:

```bash
pnpm build
pnpm test:smoke
```

Firestore rules, if changed:

```bash
pnpm security:rules
npx firebase deploy --only firestore:rules
```

### Rollback Checklist

1. Identify whether the incident is app deploy, Firestore rules, backend token/config, or data drift.
2. App deploy rollback: use the Vercel dashboard/CLI to promote the previous known-good deployment for the same project.
3. Firestore rules rollback: redeploy the previous known-good `firestore.rules`, then run `pnpm security:rules`.
4. Backend token incident: rotate `SNUHMATE_ADMIN_TOKEN`, restart backend, verify 401/403/200 paths.
5. Data drift: revert or repair the authoritative data source first, then run `pnpm verify:data`.
6. Browser cache issue: verify `sw.js` and HTML cache headers in `vercel.json`; ask affected users to hard refresh only after server-side rollback is complete.
7. Preserve evidence without raw user payloads.

Post-rollback verification:

```bash
pnpm verify:data
pnpm verify:security
pnpm test:integration
pnpm test:smoke
pnpm backend:test
```
