# SPEC: SNUH Mate Current Product And Architecture

> Version: 2026-04-30
> Status: Current baseline
> Scope: `package.json`, `README.md`, current repo structure, near-term product direction

## 1. What This Repo Is

SNUH Mate is a local-first web product for Seoul National University Hospital staff. It started as a payroll/overtime calculator and now includes:

- personal payroll, overtime, leave, work-history, and regulation workflows
- payslip parsing and profile seeding
- retirement and merit-leave analysis
- schedule parsing and team schedule operation prototypes
- Firebase optional sync
- a local FastAPI parsing backend
- a code-first design system

The repo is no longer a root-level static HTML app. The deployable web app is `apps/web`.

## 2. Current Runtime Topology

```text
User browser
  -> apps/web Astro static pages
  -> client modules in apps/web/src/client
  -> localStorage offline-first state
  -> optional Firebase Auth + Firestore sync
  -> optional local FastAPI parser backend on :8001
  -> optional local LM Studio on :1234 for Vision parsing
```

Production web build:

```text
pnpm --filter @snuhmate/web build
apps/web/dist
```

Vercel uses the same command via `vercel.json`.

## 3. Source Layout

| Path | Current role |
|---|---|
| `apps/web/` | Astro app and production build target |
| `apps/web/src/pages/` | File-based routes |
| `apps/web/src/client/` | Browser-side app modules |
| `apps/web/src/firebase/` | Firebase Auth, Firestore sync, migration, crypto |
| `apps/web/src/components/` | Astro tab islands, UI primitives, layout, patterns |
| `apps/web/public/` | Runtime static assets and static sub-apps |
| `packages/calculators` | Payroll, overtime, holiday, retirement calculation code |
| `packages/data` | Shared data exports |
| `packages/profile` | Profile, payroll, leave, work-history helpers |
| `packages/regulation-constants` | Regulation constants |
| `packages/shared-utils` | Shared browser utilities |
| `backend/` | FastAPI schedule parsing, cache, corpus, review queue |
| `server/` | Legacy Python LM Studio gateway files only |
| `public/` | Legacy/static mirror, still important for migration and extension assets |
| `chrome-extension/` | Extension source |
| `docs/` | Architecture notes, specs, plans, design-system docs |
| `archive/` | Retired experiments and superseded backend plans |

## 4. Routes And Surfaces

| Route/surface | Status | Purpose |
|---|---|---|
| `/` | active | Onboarding/landing |
| `/app/` | active | Main personal SNUH Mate app |
| `/regulation/` | active | Standalone regulation page |
| `/retirement/` | active | Retirement, merit leave, mid-settlement analysis |
| `/dashboard/` | active/prototype | Schedule validation dashboard |
| `/schedule_suite/` | active/prototype | Unified schedule suite launcher |
| `/design-system/` | active | Design-system showcase |
| `/design-system/tokens/` | active | Token docs |
| `/design-system/components/` | active | Component docs |
| `/design-system/patterns/` | active | Pattern docs |
| `/design-system/guidelines/` | active | Design usage rules |
| `/admin/parser-reviews/` | dev/admin | Parser review queue backed by local FastAPI |
| `/nurse_admin/*.html` | prototype | Static nurse/team schedule demos |
| Chrome extension | prototype | Companion extension in `chrome-extension/` and public mirrors |

## 5. Current Product Pillars

### Personal PWA

Primary user-facing value:

- payroll statement upload and parsing
- overtime/on-call/hourly wage calculation
- leave and annual balance tracking
- work-history recovery from payslip timelines
- regulation lookup and FAQ/reference support
- retirement and merit-leave scenario analysis

### Optional Cloud Sync

Firebase is additive. Guest mode must continue to work.

Implemented/active code areas:

- `apps/web/src/firebase/firebase-init.js`
- `auth-service.js`
- `auth-ui.js`
- `hydrate.js`
- `auto-sync.js`
- `migration-dialog.js`
- `key-registry.js`
- `crypto.js`
- `sync/*.js`

Data rule:

```text
localStorage = offline-first working state
Firestore = login-user cloud hydrate/write-through mirror
```

### Schedule Parsing

Client parsing entry:

- `apps/web/src/client/schedule-parser/index.js`

Input priority:

1. Excel/CSV/iCal deterministic parser
2. PDF/image to Vision path
3. local LM Studio first
4. Anthropic fallback only when configured
5. manual fallback when parsing confidence is low or blocked

Local backend:

- `backend/app/main.py`
- cache, corpus, review queue, `/admin/reviews`

### Team Plan Direction

Near-term product direction is Team Plan, not generic backend cleanup.

The MVP is a team operation layer:

```text
EMR/exported schedule
  -> import snapshot
  -> rule validation
  -> manager edit overlay
  -> published schedule version
  -> member/team view
  -> swap request
  -> approval
  -> audit/notification
```

Important boundaries:

- login identity and employee identity stay separate
- team schedule data and personal payroll data stay separate
- real hospital data should not be sent to external solver/platform APIs by default
- first useful version emphasizes import, validation, adjustment, publish, swap, approval
- 101 ward and Angio are the first concrete demo-team shapes

## 6. Superseded Architecture

The older Admin/RAG platform spec referenced:

- `server/src/index.ts`
- Hono
- Drizzle
- Supabase/Postgres
- `/api/data`, `/api/faq`, `/api/chat`
- `/api/admin/*`

That is not the current runtime. Those files are not present in this checkout. Supabase backend-upgrade work is archived under:

```text
archive/backend-upgrade-supabase/
```

Do not build new work from the old Hono/Drizzle/Supabase assumptions without a fresh repo-fit review.

## 7. Build, Test, And Verification

Primary commands:

```bash
pnpm dev
pnpm build
pnpm preview
pnpm check
pnpm test:unit
pnpm test:integration
pnpm test:smoke
pnpm lint
```

Data/rule checks:

```bash
pnpm check:regulation
pnpm check:paytable
```

Backend:

```bash
pnpm backend:dev
pnpm backend:test
```

Release-quality verification should include:

1. `pnpm build`
2. `pnpm test:unit`
3. `pnpm test:integration`
4. `pnpm test:smoke` for user-facing route changes
5. `pnpm check:regulation` when rule/regulation values changed
6. `pnpm check:paytable` when payroll table values changed

## 8. Source Of Truth Rules

Authoritative regulation/payroll data should be updated before downstream generated views.

Current important data files:

- `apps/web/public/data/full_union_regulation_2026.md`
- `apps/web/public/data/hospital_guidelines_2026.md`
- `apps/web/public/data/union_regulation_2026.json`
- `apps/web/public/data/calc-registry.json`
- mirrored `public/data/*` files where still used

When rule data changes:

1. update the raw authoritative source first
2. update summary/JSON/calculator consumers
3. run regulation and paytable checks
4. run unit/integration tests around affected calculators or UI

## 9. Privacy And Data Boundaries

Non-negotiables:

- payroll parsing should stay on-device unless the user explicitly opts into a configured path
- personal payroll PDFs and detailed compensation data are not team-visible data
- team schedules can be shared within team permissions, but not merged with personal payroll storage
- external AI is for explanation, validation, suggestions, and configured parsing fallback, not raw employee/payroll data by default
- guest mode cannot be broken by cloud features

## 10. Near-Term Work Queue

High-value next work:

1. keep `package.json` scripts aligned with Astro, not root Vite
2. stabilize current dirty retirement/payroll changes with build and tests
3. finish Firebase sync verification across profile, payslip, overtime, leave, schedule, work-history, settings, favorites
4. turn schedule parser review queue into an operator workflow
5. build the new Team Plan surfaces as new Astro routes instead of extending old static `nurse_admin`
6. keep design-system usage mandatory for new routes
7. update `ROADMAP.md` separately, since it still contains the old Hono/Supabase plan
