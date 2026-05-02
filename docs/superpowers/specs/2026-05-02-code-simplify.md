# Code Simplify Spec

**Date:** 2026-05-02
**Branch:** `codex/backend`
**Status:** Active guardrail spec

## Goal

Reduce code complexity without undoing the sync, tab refresh, payroll, schedule, and
security fixes that were added to stop recurring data-loss and stale-UI bugs.

This is not a delete-first cleanup. It is a contract-first simplification.

## Recent History That Must Be Preserved

| Commit | Why it matters |
| --- | --- |
| `e96e416 fix(sync): 다기기 Firestore 동기화 — hydration on login + auto-sync writes` | Added `hydrate.js`, `auto-sync.js`, and `recordLocalEdit` event wiring so PC/mobile edits sync through Firestore. |
| `44b5bca fix: harden backend db sync contracts` | Added executable coverage for sync registry, runtime handlers, backend-only corpus policy, and admin/security gates. |
| `c6c55b6 fix: stabilize sync tabs and team scheduling` | Added hydrate/logout refresh fan-out, schedule sync coverage, payslip delete sync, and work-history deletion behavior. |
| `5e6d3fd chore: add security operations gates` | Added security/ops harness, CI gate, and Playwright sync readiness checks. |

## Protected Runtime Flow

```text
local edit
  |
  v
window.recordLocalEdit(base)
  |
  +-- stores snuhmate_last_edit_<base>
  |
  +-- dispatches app:local-edit
        |
        v
apps/web/src/firebase/auto-sync.js
        |
        v
Firestore users/{uid}/...

login
  |
  v
apps/web/src/firebase/auth-service.js
  |
  +-- sets window.__firebaseUid
  +-- captures guest migration snapshot
  +-- hydrateFromFirestore(uid)
  +-- imports auto-sync.js
  |
  v
apps/web/src/firebase/hydrate.js
  |
  +-- writes localStorage mirrors
  +-- dispatches app:cloud-hydrated
  +-- dispatches profile/overtime/leave/payslip/schedule/workHistory refresh events
```

## Protected Files

These files are not deletion targets during code-simplify:

- `apps/web/src/firebase/auto-sync.js`
- `apps/web/src/firebase/hydrate.js`
- `apps/web/src/firebase/auth-service.js`
- `apps/web/src/client/inline-ui-helpers.js`
- `apps/web/src/firebase/key-registry.js`
- `apps/web/src/firebase/sync/_encrypted-fields.js`

## Allowed Simplification Lanes

### Lane 1: Contract Tests First

Strengthen tests that prove every sync key has:

- a registry entry,
- a Firestore path,
- encrypted-field coverage,
- an auto-sync write path,
- a hydrate path,
- an explicit logout clear or preserve policy.

### Lane 2: Payslip Lifecycle Unification

Unify the post-parse flow used by:

- `handlePayslipUpload`
- `handleProfilePayslipUpload`
- saved payslip management paths

The unified flow must still:

- save monthly payslip data,
- apply stable profile fields,
- propagate overtime cross-check data,
- propagate work history entries,
- dispatch refresh events,
- keep existing storage key formats.

### Lane 3: Firestore Helper Extraction

Only after Lane 1 passes, repeated mock/runtime Firestore adapter code may be extracted.

This lane must not change:

- Firestore paths,
- document merge behavior,
- encryption fields,
- shared localStorage key policy,
- payslip delete behavior.

### Lane 4: Static Boundary Cleanup

`public/` and `apps/web/public/` cleanup requires a mirror manifest first.

Bulk deletion is not allowed until the manifest proves which tree owns each runtime path.

## Explicit Non-Goals

- No rewrite of `app.js`.
- No removal of Firebase sync modules.
- No Firestore schema rename.
- No localStorage key migration.
- No public/static tree deletion.
- No parser or regulation rule change.

## Required Verification

Small contract/docs change:

```bash
pnpm vitest run tests/integration/code-simplify-contract.test.js tests/integration/firebase/inventory-coverage.test.js
```

Sync or lifecycle code change:

```bash
pnpm vitest run tests/integration/firebase/*-sync.test.js tests/integration/data-lifecycle.test.js
pnpm exec playwright test tests/e2e/firebase-sync.spec.js
```

Before push:

```bash
pnpm security:ops
pnpm backend:test
```

## Decision Rule

If a file looks duplicated but was created to protect sync, login/logout, migration,
payslip propagation, or static path compatibility, it is treated as required until a
test proves the behavior is covered elsewhere.
