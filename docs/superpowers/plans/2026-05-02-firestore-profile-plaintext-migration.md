# Firestore Profile Plaintext Migration Plan

**Date:** 2026-05-02  
**Scope:** Plan only. This document does not enable a production prompt, write to Firestore, or change app source.  
**Goal:** migrate any existing plaintext profile, payroll, schedule, and adjacent user records into the current encrypted-field contract without breaking guest `localStorage` or mixing schedule/team data with payroll data.

## Current Inventory

| Category | Local / runtime source | Firestore target | Migration note |
| --- | --- | --- | --- |
| identity/profile | `snuhmate_hr_profile` / guest variants | `users/{uid}/profile/identity` | Encrypt identity fields before any new write. |
| payroll metadata | payroll fields from `snuhmate_hr_profile`, `otManualHourly` | `users/{uid}/profile/payroll` | Keep payroll separate from identity and schedule data. |
| payslip parsed data | `overtimePayslipData`, `payslip_*` keys | `users/{uid}/payslips/{id}` | Parsed fields require encryption; raw PDFs are not migrated by this lane. |
| overtime | `overtimeRecords` | `users/{uid}/overtime/{yyyymm}` | Preserve month split and encrypt sensitive entry details. |
| leave | `leaveRecords` | `users/{uid}/leave/{yyyy}` | Preserve year split and encrypt duration/notes fields. |
| work history | `snuhmate_work_history`, seeded flag | `users/{uid}/work_history/{entryId}` and profile identity merge field | Keep history entries separate from current profile identity. |
| settings | `snuhmate_settings`, `theme` | `users/{uid}/settings/app` | Device-local values stay local; only sync-safe fields migrate. |
| favorites/reference | `snuhmate_reg_favorites` | `users/{uid}/settings/reference` | Reference IDs can remain plaintext. |
| schedule | `snuhmate_schedule_records` | `users/{uid}/schedule/{yyyymm}` | Keep team schedule data separate from payroll; encrypt personal duty/memo fields per contract. |

## Migration Lanes

### Lane A: Browser-Only User Self-Migration

This lane is for normal users after login, driven by an explicit prompt. It reads existing browser data, previews categories, and writes only to `users/{uid}/**` after the user chooses what to sync.

Rules:
- Do not run automatically on page load without an explicit prompt.
- Do not delete guest data until all selected category writes succeed or the user confirms cleanup.
- Do not overwrite encrypted Firestore fields with legacy plaintext values.
- Keep schedule writes in `users/{uid}/schedule/{yyyymm}` and payroll writes in profile/payroll or payslip paths.
- Record a migration flag only after a completed category write, not before.

### Lane B: Admin / Emulator Dry-Run Verification

This lane proves the migration mapper before production exposure. It uses emulator or mock Firestore state with representative plaintext fixtures for each inventory category.

Dry-run output must include:
- source key count and category count,
- target path list under `users/{uid}/**`,
- encrypted-field coverage result,
- skipped device-local keys,
- schedule/payroll separation check,
- rollback snapshot location for the fixture run.

No production write is allowed from this lane. Any blocked or ambiguous key becomes a migration backlog item instead of being silently copied.

### Lane C: Rollback And Read-Compat Window

For the first migration release window, readers must tolerate both legacy plaintext documents and encrypted documents, while writers produce only the encrypted-field contract.

Rollback rules:
- Preserve a pre-migration browser backup/export path for user self-service recovery.
- Keep category-level migration flags so a failed category can be retried independently.
- If encrypted read fails, show recovery guidance rather than writing plaintext fallback data.
- Leave guest `localStorage` unchanged unless the user explicitly completes migration cleanup.
- Keep the read-compat window time-boxed and remove it only after emulator, integration, and Playwright readiness gates pass repeatedly.

## Safety Gates

- No production write before emulator test pass.
- No plaintext overwrite of encrypted fields.
- All Firestore targets must stay under `users/{uid}/**`.
- Guest `localStorage` remains unchanged until explicit user cleanup.
- Schedule/team data remains separate from payroll data.
- Migration must be idempotent per category.
- A failed category must not mark the full migration complete.
- Live Firestore writes must not be claimed from readiness-only Playwright coverage.

## Verification Commands

Run these before enabling any real-user migration prompt:

```bash
pnpm vitest run tests/integration/firebase/encrypted-fields.test.js tests/integration/firebase/profile-sync.test.js tests/integration/firebase/schedule-sync.test.js
pnpm exec playwright test tests/e2e/firebase-sync.spec.js
```

Expected result: tests pass locally before any production prompt or production write path is enabled. If emulator-dependent tests are skipped by existing guards, report the skip explicitly and do not claim production Firestore verification.
