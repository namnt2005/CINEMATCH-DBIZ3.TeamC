# Implementation Plan: Location publishing by VFDA (M3 US-3, SC-35)

**Branch**: `002-m3-publish` | **Date**: 2026-10-30 | **Spec**: [specs/002-m3-publish/spec.md](spec.md)

**Input**: Feature specification from `/specs/002-m3-publish/spec.md` (snapshot of `docs/spec/spec-M3.md`, US-3, FR-001..FR-005, BR-004, BR-008, BR-010)

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

VFDA staff manage the location catalogue on `SC-35` (`/admin/locations`): list every location in every status (FR-001), create and edit a location with the 20 fields of the data-entry template including `night_shooting_allowed` and `rainy_months` (FR-002), record and verify the local authority contact (FR-004), publish only when that contact is verified (FR-005, BR-004) and unpublish without ever deleting (BR-008). Every create, save, contact verification, publish, unpublish and availability change writes exactly one `audit_log` row in the same transaction (SC-35 SR-317, BR-010, M10 FR-008).

Technical approach: the same stack as `001-m3-core`. BR-004 is enforced inside the database by the trigger `trg_location_publish_needs_contact` named in `data/data-model-M3.md` §7, loaded locally from a new SQL file after the seed. Route Handlers under `/api/admin/locations` are restricted to `x-mock-role: vfda_staff` until the SYS sign-in slice (gate G2). Photo upload (FR-003) is deferred; SC-35 shows existing photos read-only.

## Decisions taken for this plan (Nam Tran, 30/10/2026)

| # | Topic | Decision |
|---|---|---|
| D1 | Storage | In-memory `node:sqlite` loaded from `data/seed/` as today. Admin changes are lost on restart; durable storage comes with Supabase (Session 11). |
| D2 | Audit scope | One row per action, in the same transaction: `location.create`, `location.update`, `location.contact_verify`, `location.publish`, `location.unpublish`, `location.availability` (SC-35 SR-317 and M3 BR-010). |
| D3 | Photos (FR-003) | Upload deferred to a later slice (storage not chosen, spec Open Question 10 open). SC-35 shows the photo count and existing photos read-only. |
| D4 | Contact edited on a published location | The location stays published. The contact becomes *not verified*, so SC-16 and the contact API stop showing it until it is verified again. |

## Technical Context

**Language/Version**: JavaScript (ES modules) on Node.js 22 (`node:sqlite`), as in `001-m3-core`.

**Primary Dependencies**: Next.js 14.2 (App Router), React 18. No new dependency.

**Storage**: Local and tests: `node:sqlite` in memory, schema from `data/schema/*.sql`, seed from `data/seed/*.csv`, then the new `lib/db/local-triggers.sql` (BR-004 trigger, append-only audit log). Supabase: the same rules as PostgreSQL triggers (see `research.md` R1), Session 11.

**Testing**: Node test runner (`npm test`). Contract tests call the Route Handlers directly; unit tests run SQL against a fresh database (`closeDatabase()` then `getDb()`) so that changes never leak between tests.

**Target Platform**: Local dev server (`npm run dev`) on macOS and Windows; Vercel + Supabase later.

**Project Type**: Next.js web application (one project: `app/` for pages and Route Handlers, `lib/` for data access and rules).

**Performance Goals**: Admin list and filters answer within 200 ms p95 for the launch catalogue (50+ locations), the same goal as the public search.

**Constraints**: BR-004 enforced by the database, not only the UI; no delete path (BR-008); audit row and action committed together or not at all (M10 BR-005); `vfda_staff` only; no change to `data/`, `docs/spec/` or `docs/screens/`.

**Scale/Scope**: 1 screen (`SC-35`), 6 route files with 9 handlers, 11 seed locations (launch target 50), 2 seed staff accounts.

No item of the Technical Context is unknown. The open product questions are listed in `research.md` §Open questions; none blocks `/speckit-tasks`, all must be answered before the pull request is merged.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Plan conformance | Status |
|---|---|---|---|
| **I. Source of truth** | Requirements only from `docs/spec/`, data only from `data/`; never invent a requirement. | FR-001..FR-005, BR-004, BR-008, BR-010 and SC-35 drive every endpoint; columns and checks come from `data/schema/schema-M3.sql` and `schema-M10.sql`. Points the spec does not settle are recorded as `[NEEDS CLARIFICATION]` in `research.md` with a reversible interim choice, not as requirements. | **PASS** |
| **II. Business rules test-first** | A failing test before the code for every BR and acceptance scenario. | `tasks.md` will put tests for BR-004 (trigger refuses even a direct SQL update), BR-008 (no delete, publish again works), BR-010 (availability audited), the audit rules and the role gate before any implementation task. | **PASS** |
| **III. Thin vertical slices** | One user story end to end. | US-3 only: SC-35 screen, Route Handlers, triggers and audit. Photo upload (D3) and US-4/US-5 stay out. | **PASS** |
| **IV. Synthetic data and no secrets** | Seed data only; no keys in files. | Uses seed staff accounts and locations; no key is needed. | **PASS** |
| **V. Humans approve every change** | Branch, changed files with reasons, no push. | Work stays on `002-m3-publish`; decisions D1–D4 taken by Nam Tran. | **PASS** |

**Post-design re-check (after Phase 1)**: PASS. The design adds no requirement beyond the spec; the interim choices in `research.md` (staff identity, browser role, unpublish reason, slug collision) are marked for confirmation.

## Project Structure

### Documentation (this feature)

```text
specs/002-m3-publish/
├── spec.md              # Snapshot of docs/spec/spec-M3.md (read-only)
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R10 and open questions
├── data-model.md        # Phase 1: entities, validation, state transitions, audit actions
├── quickstart.md        # Phase 1: validation scenarios
├── contracts/
│   └── admin-locations.contract.md   # Phase 1: /api/admin/locations
└── tasks.md             # Phase 2 output (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
app/
├── admin/locations/
│   ├── page.js                          # SC-35 (new)
│   └── admin-locations-view.js          # SC-35 labels, row actions, publish state (new)
├── api/admin/locations/
│   ├── route.js                         # GET list + counts, POST create (new)
│   └── [id]/
│       ├── route.js                     # GET one, PUT update, DELETE → 405 (new)
│       ├── authority-contact/
│       │   ├── route.js                 # PUT save contact (new)
│       │   └── verify/route.js          # POST verify (new)
│       ├── publish/route.js             # POST publish (new)
│       └── unpublish/route.js           # POST unpublish (new)
└── locations/[slug]/page.js             # contact block text when a contact awaits re-verification (edit)

lib/
├── admin/location-input.js              # 20-field and contact validation from schema + catalogue (new)
├── api/admin.js                         # requireStaff (401/403) and admin error responses (new)
├── db/
│   ├── admin-locations.js               # list, get, create, update, contact, verify, publish, unpublish (new)
│   ├── audit.js                         # writeAudit() inside the caller's transaction (new)
│   ├── local-triggers.sql               # trg_location_publish_needs_contact, trg_audit_log_append_only (new)
│   ├── client.js                        # run local-triggers.sql after the seed; transaction helper (edit)
│   └── location-detail.js               # has_verified_contact read from contact_verified (edit, D4)
└── auth/session.js                      # staff user id for the mock role (edit, research R3)

tests/
├── unit/        auth-session-staff, audit-log, publish-trigger, location-input, admin-locations-view (.test.js)
└── contracts/   admin-auth, admin-locations-list, admin-locations-edit, admin-contact, admin-publish (.test.js)
```

**Structure Decision**: Same single Next.js project as `001-m3-core`. The admin API lives under `app/api/admin/locations/[id]/…`, a separate tree from the public `app/api/locations/[slug]/…`, so the dynamic segment names do not clash. Data rules stay in `lib/db/` next to the existing `contacts.js` and `locations.js`, which are reused.

## Complexity Tracking

| Item | Why it is needed | Simpler alternative rejected because |
|---|---|---|
| Local SQL triggers in `lib/db/local-triggers.sql` | US-3 Scenario 1 and SR-311 require the **database** to refuse publishing; `data/data-model-M3.md` §7 names the trigger for the Plan step. | A check in the Route Handler only would let a direct SQL update publish an unverified location. Changing `data/schema/` would alter the portable schema shared with Supabase, which is generated by `tools/build_schema.py` and out of scope here. |
| Audit written by the app in the same transaction | M10 FR-008 says a database trigger writes audit rows; a SQLite trigger cannot know who acted. | Writing the audit row after the commit could lose it (M10 BR-005). The Supabase trigger version is sketched in `research.md` R2. |
| Mock staff identity and role (until gate G2) | `audit_log.admin_id` and `authority_contact.verified_by` are NOT NULL / foreign keys to `user_account`. | Real sign-in is the SYS slice (Session 11). |
| Photo upload deferred (D3) | Storage not chosen; who approves photos is spec Open Question 10. | Uploading to a local folder would be thrown away when Supabase Storage arrives. |
