# Team Plan Roadmap Scheduling Sync Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute the user's selected order, `1,3,4,5,2`: refresh the roadmap, build the scheduling domain foundation, add Firebase sync E2E coverage, document the Firestore plaintext migration path, then expose a new Team Plan route skeleton.

**Architecture:** Keep current runtime boundaries: Astro in `apps/web`, workspace packages in `packages/*`, Firebase Auth/Firestore for optional logged-in sync, FastAPI only for local schedule parsing backend. Do not extend legacy `nurse_admin` or `schedule_suite` product surfaces; new Team Plan work lives under `/team/schedules` and `packages/scheduling`.

**Tech Stack:** Astro 4, Vanilla JS ESM, Vitest, Playwright, Firebase Web SDK, workspace packages, pnpm.

---

## File Structure

- Modify: `ROADMAP.md`
  - Replace stale Hono/Drizzle/Supabase/RAG-first roadmap with current monorepo, Firebase sync, FastAPI parser backend, and Team Plan order.
- Create: `packages/scheduling/package.json`
  - Workspace package manifest for `@snuhmate/scheduling`.
- Create: `packages/scheduling/src/index.js`
  - Public exports only.
- Create: `packages/scheduling/src/schema.js`
  - Duty codes, default shift templates, snapshot/rule normalization helpers.
- Create: `packages/scheduling/src/import-normalize.js`
  - Convert CSV/parser-like rows into immutable schedule snapshot shape.
- Create: `packages/scheduling/src/rules.js`
  - MVP rule pack constants and rule metadata.
- Create: `packages/scheduling/src/evaluate.js`
  - Deterministic validation that returns `{ summary, issues }`.
- Create: `packages/scheduling/src/overlay.js`
  - Apply manager edits as overlay without mutating base snapshot.
- Create: `packages/scheduling/src/availability.js`
  - Coverage/day-duty summaries for UI and validation.
- Modify: `package.json`
  - Add `@snuhmate/scheduling` workspace dev dependency.
- Modify: `apps/web/package.json`
  - Add `@snuhmate/scheduling` workspace dependency for Astro routes.
- Modify: `pnpm-lock.yaml`
  - Refresh workspace lock after package additions.
- Create: `tests/unit/scheduling/import-normalize.test.js`
- Create: `tests/unit/scheduling/evaluate.test.js`
- Create: `tests/unit/scheduling/overlay.test.js`
- Create: `tests/e2e/firebase-sync.spec.js`
  - Browser-level Firebase sync readiness checks that do not require live credentials.
- Create: `docs/superpowers/plans/2026-05-02-firestore-profile-plaintext-migration.md`
  - Migration plan and safety gates for existing plaintext Firestore profile/schedule data.
- Create: `apps/web/src/components/team-schedules/ScheduleGrid.astro`
- Create: `apps/web/src/components/team-schedules/RuleIssueBadge.astro`
- Create: `apps/web/src/pages/team/schedules/index.astro`
- Create: `apps/web/src/pages/team/schedules/admin.astro`
- Create: `apps/web/src/pages/team/schedules/import.astro`
- Create: `apps/web/src/pages/team/schedules/rules.astro`
- Create: `apps/web/src/pages/team/schedules/approvals.astro`
- Create: `apps/web/src/pages/team/schedules/audit.astro`
- Create: `apps/web/src/pages/team/schedules/me.astro`
- Create: `apps/web/src/pages/team/schedules/swaps.astro`
- Create: `apps/web/src/client/team-schedules/admin-controller.js`
- Create: `apps/web/src/client/team-schedules/import-controller.js`
- Create: `apps/web/src/client/team-schedules/rule-editor-controller.js`
- Create: `apps/web/src/client/team-schedules/member-schedule-controller.js`
- Create: `apps/web/src/client/team-schedules/swap-controller.js`
- Create: `tests/integration/team-schedules/surface-contract.test.js`
- Create: `tests/e2e/team-schedules.spec.js`

## Task 1: Roadmap Current-State Refresh

**Files:**
- Modify: `ROADMAP.md`

- [ ] **Step 1: Replace stale runtime summary**

Write the roadmap so the "already implemented" section reflects the current checkout:

```markdown
- Astro web app under `apps/web`
- workspace packages under `packages/*`
- Firebase Auth + Firestore optional sync
- local FastAPI parser backend under `backend/`
- schedule parser, sync, and review queue tests
```

- [ ] **Step 2: Remove obsolete next-action queue**

Remove references that treat these as current runtime priorities:

```text
Hono
Drizzle
Supabase Family mode
/api/admin/*
RAG first
```

- [ ] **Step 3: Add selected execution order**

Add the concrete ordered queue:

```markdown
1. ROADMAP 최신화
2. `packages/scheduling` rule/evaluate/import-normalize 최소 엔진
3. Firebase real sync E2E/readiness 검증
4. Firestore plaintext profile/schedule migration plan
5. Team Plan product surface skeleton
```

- [ ] **Step 4: Verify roadmap wording**

Run:

```bash
rg -n "Hono|Drizzle|Supabase Family|RAG first|/api/admin" ROADMAP.md
```

Expected: no hits except an archived/superseded note if explicitly labeled as obsolete.

## Task 2: Scheduling Package And Unit Tests

**Files:**
- Create: `packages/scheduling/package.json`
- Create: `packages/scheduling/src/index.js`
- Create: `packages/scheduling/src/schema.js`
- Create: `packages/scheduling/src/import-normalize.js`
- Create: `packages/scheduling/src/rules.js`
- Create: `packages/scheduling/src/evaluate.js`
- Create: `packages/scheduling/src/overlay.js`
- Create: `packages/scheduling/src/availability.js`
- Modify: `package.json`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`
- Test: `tests/unit/scheduling/import-normalize.test.js`
- Test: `tests/unit/scheduling/evaluate.test.js`
- Test: `tests/unit/scheduling/overlay.test.js`

- [ ] **Step 1: Write failing import-normalize test**

```js
import { describe, expect, it } from 'vitest';
import { normalizeImportSnapshot } from '../../../packages/scheduling/src/import-normalize.js';

describe('normalizeImportSnapshot', () => {
  it('normalizes parser rows into immutable schedule snapshot assignments', () => {
    const snapshot = normalizeImportSnapshot({
      teamId: 'ward-101',
      period: '2026-05',
      source: { type: 'csv', name: 'ward-101.csv' },
      rows: [
        { employeeId: 'n1', employeeName: '김민지', days: { 1: 'D', 2: 'E', 3: 'N', 4: 'O' } },
      ],
    });

    expect(snapshot.teamId).toBe('ward-101');
    expect(snapshot.assignments).toHaveLength(4);
    expect(snapshot.assignments[0]).toMatchObject({
      cellId: 'ward-101:2026-05:n1:01',
      employeeId: 'n1',
      date: '2026-05-01',
      dutyCode: 'D',
    });
    expect(snapshot.source).toMatchObject({ type: 'csv', name: 'ward-101.csv' });
  });
});
```

- [ ] **Step 2: Run failing test**

Run:

```bash
pnpm vitest run tests/unit/scheduling/import-normalize.test.js
```

Expected: FAIL because `packages/scheduling` does not exist yet.

- [ ] **Step 3: Implement package manifest and imports**

`packages/scheduling/package.json`:

```json
{
  "name": "@snuhmate/scheduling",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.js",
  "exports": {
    ".": "./src/index.js"
  }
}
```

- [ ] **Step 4: Implement normalization**

Create deterministic functions with this contract:

```js
normalizeImportSnapshot({ teamId, period, rows, source })
// -> { snapshotId, teamId, period, source, importedAt, assignments, originalRows }
```

Rules:
- normalize day numbers to two-digit ISO dates
- normalize duty aliases `O`, `OFF`, `휴`, `휴무` to `OFF`
- preserve `employeeName` but do not infer identity from login identity
- throw `TypeError` when `teamId`, `period`, or rows are missing

- [ ] **Step 5: Write failing evaluator test**

```js
import { describe, expect, it } from 'vitest';
import { evaluateSchedule, normalizeImportSnapshot, SNUH_NURSE_MVP_RULE_PACK } from '../../../packages/scheduling/src/index.js';

describe('evaluateSchedule', () => {
  it('blocks N-OFF-D recovery pattern and summarizes issues', () => {
    const snapshot = normalizeImportSnapshot({
      teamId: 'ward-101',
      period: '2026-05',
      rows: [
        { employeeId: 'n1', employeeName: '김민지', days: { 1: 'N', 2: 'O', 3: 'D' } },
      ],
    });

    const result = evaluateSchedule(snapshot, SNUH_NURSE_MVP_RULE_PACK);
    expect(result.summary.block).toBe(1);
    expect(result.summary.canPublish).toBe(false);
    expect(result.issues[0]).toMatchObject({
      ruleId: 'snuh.nurse.no_n_off_d',
      severity: 'block',
      employeeId: 'n1',
    });
  });
});
```

- [ ] **Step 6: Implement MVP rules**

Implement:
- `snuh.schedule.valid_duty_code`: block invalid duty codes
- `snuh.schedule.employee_identity_required`: block missing employee id/name
- `snuh.nurse.no_n_off_d`: block `N, OFF, D` and `N, OFF, 9A`
- `snuh.nurse.max_consecutive_nights`: warn above 3 consecutive nights
- `snuh.nurse.monthly_night_cap`: warn above 7 monthly nights

Every issue must include:

```js
{
  ruleId,
  severity,
  employeeId,
  affectedCells,
  message
}
```

- [ ] **Step 7: Write failing overlay test**

```js
import { describe, expect, it } from 'vitest';
import { applyScheduleOverlay, normalizeImportSnapshot } from '../../../packages/scheduling/src/index.js';

describe('applyScheduleOverlay', () => {
  it('creates a candidate schedule without mutating the imported snapshot', () => {
    const snapshot = normalizeImportSnapshot({
      teamId: 'ward-101',
      period: '2026-05',
      rows: [{ employeeId: 'n1', employeeName: '김민지', days: { 1: 'D' } }],
    });
    const originalDuty = snapshot.assignments[0].dutyCode;

    const candidate = applyScheduleOverlay(snapshot, {
      overlayId: 'ov1',
      actorId: 'manager1',
      reason: '야간 회복 확보',
      changes: [{ cellId: snapshot.assignments[0].cellId, dutyCode: 'OFF' }],
    });

    expect(snapshot.assignments[0].dutyCode).toBe(originalDuty);
    expect(candidate.assignments[0].dutyCode).toBe('OFF');
    expect(candidate.overlays[0]).toMatchObject({ overlayId: 'ov1', actorId: 'manager1' });
  });
});
```

- [ ] **Step 8: Implement overlay and availability**

Implement:
- `applyScheduleOverlay(snapshot, overlay)`
- `summarizeCoverage(snapshot)`
- `groupAssignmentsByEmployee(assignments)`

Overlay requires `actorId`, `reason`, and `changes`; invalid overlay throws `TypeError`.

- [ ] **Step 9: Run scheduling tests**

Run:

```bash
pnpm vitest run tests/unit/scheduling
```

Expected: PASS.

- [ ] **Step 10: Refresh workspace lock**

Run:

```bash
pnpm install --lockfile-only
```

Expected: `pnpm-lock.yaml` includes `@snuhmate/scheduling` workspace link.

## Task 3: Firebase Sync E2E Readiness

**Files:**
- Create: `tests/e2e/firebase-sync.spec.js`

- [ ] **Step 1: Add Playwright test for sync readiness without live credentials**

The test must verify browser-level readiness, not claim live Firestore writes. Add checks for:
- `/app` loads with guest mode intact
- settings surface exposes login/sync entry points
- local schedule data can be seeded without console crashes
- migration/sync code is bundled without page errors

```js
import { test, expect } from '@playwright/test';

test.describe('Firebase sync readiness', () => {
  test('guest mode survives local schedule data and exposes sync controls', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => {
      if (msg.type() === 'error' && !/localhost:3001\/api\/data\/bundle/.test(msg.text())) {
        errors.push(msg.text());
      }
    });

    await page.addInitScript(() => {
      localStorage.setItem('snuhmate_schedule_records', JSON.stringify({
        '2026-05': { mine: { 1: 'D', 2: 'N' }, team: {} },
      }));
    });

    await page.goto('/app?tab=settings');
    await page.waitForFunction(() => typeof window.switchTab === 'function');
    await page.evaluate(async () => {
      window.switchTab('settings');
      await window.loadTab('settings');
    });

    await expect(page.getByText(/로그인|동기화|Firebase|Google|Email/i).first()).toBeVisible();
    expect(errors).toEqual([]);
  });
});
```

- [ ] **Step 2: Run only this E2E**

Run:

```bash
pnpm exec playwright test tests/e2e/firebase-sync.spec.js
```

Expected: PASS. If it fails because text differs, inspect the rendered settings tab and assert the real sync control labels.

## Task 4: Firestore Plaintext Migration Plan

**Files:**
- Create: `docs/superpowers/plans/2026-05-02-firestore-profile-plaintext-migration.md`

- [ ] **Step 1: Document inventory**

Include these current categories:

```text
identity/profile
payroll metadata
payslip parsed data
overtime
leave
work history
settings
favorites/reference
schedule
```

- [ ] **Step 2: Separate migration lanes**

Write separate lanes:
- browser-only user self-migration for normal users
- admin/emulator dry-run verification
- rollback and read-compat window

- [ ] **Step 3: Define safety gates**

Include gates:
- no production write before emulator test pass
- no plaintext overwrite of encrypted fields
- `users/{uid}/**` only
- guest `localStorage` unchanged
- schedule/team data remains separate from payroll data

- [ ] **Step 4: Define verification commands**

Include:

```bash
pnpm vitest run tests/integration/firebase/encrypted-fields.test.js tests/integration/firebase/profile-sync.test.js tests/integration/firebase/schedule-sync.test.js
pnpm exec playwright test tests/e2e/firebase-sync.spec.js
```

Expected: tests pass locally before any real-user migration prompt is enabled.

## Task 5: Team Plan Route Skeleton

**Files:**
- Create: `apps/web/src/components/team-schedules/ScheduleGrid.astro`
- Create: `apps/web/src/components/team-schedules/RuleIssueBadge.astro`
- Create: `apps/web/src/pages/team/schedules/index.astro`
- Create: `apps/web/src/pages/team/schedules/admin.astro`
- Create: `apps/web/src/pages/team/schedules/import.astro`
- Create: `apps/web/src/pages/team/schedules/rules.astro`
- Create: `apps/web/src/pages/team/schedules/approvals.astro`
- Create: `apps/web/src/pages/team/schedules/audit.astro`
- Create: `apps/web/src/pages/team/schedules/me.astro`
- Create: `apps/web/src/pages/team/schedules/swaps.astro`
- Create: `apps/web/src/client/team-schedules/admin-controller.js`
- Create: `apps/web/src/client/team-schedules/import-controller.js`
- Create: `apps/web/src/client/team-schedules/rule-editor-controller.js`
- Create: `apps/web/src/client/team-schedules/member-schedule-controller.js`
- Create: `apps/web/src/client/team-schedules/swap-controller.js`
- Test: `tests/integration/team-schedules/surface-contract.test.js`
- Test: `tests/e2e/team-schedules.spec.js`

- [ ] **Step 1: Create surface contract test**

```js
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const routes = ['index', 'admin', 'import', 'rules', 'approvals', 'audit', 'me', 'swaps'];

describe('Team Plan route skeleton contract', () => {
  it('creates new Astro routes without extending legacy nurse_admin', () => {
    for (const route of routes) {
      const file = `apps/web/src/pages/team/schedules/${route}.astro`;
      expect(existsSync(file), `${file} exists`).toBe(true);
      const source = readFileSync(file, 'utf8');
      expect(source).not.toContain('nurse_admin');
      expect(source).not.toContain('schedule_suite');
    }
  });

  it('uses scheduling package as the domain boundary', () => {
    const source = readFileSync('apps/web/src/pages/team/schedules/index.astro', 'utf8');
    expect(source).toContain('@snuhmate/scheduling');
  });
});
```

- [ ] **Step 2: Build operational first screen**

`/team/schedules` should show:
- selected demo teams: `101 병동`, `Angio`
- import -> validate -> overlay -> publish workflow state
- validation summary from `evaluateSchedule`
- schedule grid using `ScheduleGrid.astro`
- navigation to admin/import/rules/approvals/audit/me/swaps

- [ ] **Step 3: Add minimal child routes**

Each child route should be a real operational placeholder with route-specific data, not a landing page:
- `/team/schedules/admin`: manager queue
- `/team/schedules/import`: import preview
- `/team/schedules/rules`: rule pack
- `/team/schedules/approvals`: approval queue
- `/team/schedules/audit`: audit log
- `/team/schedules/me`: member schedule
- `/team/schedules/swaps`: swap request flow

- [ ] **Step 4: Add E2E smoke for new route**

```js
import { test, expect } from '@playwright/test';

test.describe('Team Plan schedules routes', () => {
  test('loads overview and operational child routes', async ({ page }) => {
    await page.goto('/team/schedules');
    await expect(page.getByRole('heading', { name: /Team Plan|팀 스케줄/i })).toBeVisible();
    await expect(page.getByText(/101 병동/)).toBeVisible();
    await expect(page.getByText(/Angio/)).toBeVisible();

    for (const path of ['admin', 'import', 'rules', 'approvals', 'audit', 'me', 'swaps']) {
      await page.goto(`/team/schedules/${path}`);
      await expect(page.locator('main')).toBeVisible();
    }
  });
});
```

- [ ] **Step 5: Verify build and route smoke**

Run:

```bash
pnpm vitest run tests/integration/team-schedules/surface-contract.test.js
pnpm --filter @snuhmate/web build
pnpm exec playwright test tests/e2e/team-schedules.spec.js
```

Expected: all pass.

## Final Verification

Run:

```bash
pnpm vitest run tests/unit/scheduling tests/integration/team-schedules
pnpm vitest run tests/integration/firebase/encrypted-fields.test.js tests/integration/firebase/profile-sync.test.js tests/integration/firebase/schedule-sync.test.js
pnpm --filter @snuhmate/web build
pnpm exec playwright test tests/e2e/firebase-sync.spec.js tests/e2e/team-schedules.spec.js
```

Expected: PASS. If Firebase emulator-dependent tests are skipped by existing test guards, report the skip explicitly and do not claim live Firestore verification.

## Self-Review

- Spec coverage: Covers current requested order `1,3,4,5,2`; Team Plan route skeleton is deliberately last after domain package and sync/migration safety.
- Placeholder scan: No `TBD`, `TODO`, or "implement later" instructions remain.
- Type consistency: `snapshot.assignments`, `cellId`, `dutyCode`, `affectedCells`, and `summary.canPublish` names are used consistently across tests, package, and route contracts.
