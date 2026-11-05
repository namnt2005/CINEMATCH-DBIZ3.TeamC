# Implementation Plan: Project workspace and readiness dashboard (M0)

**Branch**: `005-m0-workspace` | **Date**: 03/11/2026 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-m0-workspace/spec.md` (snapshot of `docs/spec/spec-M0.md`: US-1..US-3, FR-001..FR-009, BR-001..BR-005, Clarifications Q1)

## Summary

A signed-in member creates a project from three fields (name, format, segment — pre-filled from the M1 router), becomes its owner and lands on the readiness dashboard (SC-12). The five gauges, the overall readiness and the one next step per gauge come from **one database view**, `v_project_readiness`; no screen computes a score (BR-001). The view weighs the gauges equally among the gauge rows that `segment_requirement` marks as counted for the project's segment (Q1, BR-004): A and B four gauges at 25 %, C three at 33.3 %, *Logistics* shown as `—` with weight 0 (BR-002). The owner invites colleagues by email with *view* or *edit* (US-3); the invitee accepts on the project list (SC-10). Members with *edit* change the details and archive the project — never delete it (FR-002, BR-005). A nightly job stores one readiness snapshot per active project (FR-008). Only project members read a project (RLS).

> The request named "18 FR"; spec-M0 has nine (FR-001..FR-009). This plan follows the spec.

**In this plan**: US-1 (P1), US-2 (P1), US-3 (P2); FR-001..FR-008; BR-001..BR-005; SC-10, SC-12, SC-13 (details, members, archive). **Not in this plan**: FR-009 trend chart (Could); changing a project's segment on SC-13 (M1 US-3 / M1 FR-003); the deadline strip (M5 F-M5-08); recent activity, *Book a consultation*, and the screens behind the gauge buttons (M2, M4, M5, SC-33) — shown as *coming soon*.

## Decisions taken for this plan (Nam Tran, 03/11/2026)

| # | Topic | Decision |
|---|---|---|
| D1 | Weights from `segment_requirement` (BR-004, Q1) — the table has no weight column | Add gauge rows to the seed generator: for A and B `GAUGE_CONTENT`, `GAUGE_LOCATIONS`, `GAUGE_PARTNERS`, `GAUGE_DOSSIER` (*needed* = counted) and `GAUGE_LOGISTICS` (*not needed* = shown as `—`, weight 0); for C the same without `GAUGE_DOSSIER` (not shown). The view gives each counted gauge an equal share. No schema change. M1 leaves `GAUGE_*` rows out of its *Needed / Not needed* list and reads its journey gauges from them. |
| D2 | The project owner (FR-001 "creator is the owner", FR-004 "owner only") | Add `owner` to `project_member.permission` in the data model (`tools/dm_model2.py`, then the data and seed generators); the seed marks each project's creator. Invitations still offer only *view* or *edit* (FR-004 input). Resolves data-model-M0 open question *Add owner to PROJECT_MEMBER.permission*. |
| D3 | How an invitation is accepted | The invitee signs in with the invited email; SC-10 shows *Invitations* with *Accept*; accepting sets `user_id` and `invite_status = accepted`. The invitation email is queued in `email_delivery` (the Resend sender is SYS T059, not built). |
| D4 | Scope beyond the stories | FR-002 (edit details, archive on SC-13) and FR-008 (nightly snapshot) are in; FR-009, segment change and the M5 deadline strip are not. |
| D5 (H1) | A module that fails to report (spec §3 edge case; analysis H1), decided 05/11/2026 | New table `readiness_source (gauge, reporting)` through the data generators (System only, like `segment_rule`); seed and `cinematch-dev`: all four counted gauges reporting. A counted gauge whose module is not reporting has no score (`—`, *not calculated yet*), the step `not_reported`, and leaves the overall score, which averages only the gauges that reported (`gauges_reported`, `gauges_not_reported`); with none reported the total is `—` and no snapshot is taken. Migration `20261105000100_m0_readiness_source.sql` for pushed databases. |
| D6 (H2) | How a project moves from draft to preparing (analysis H2), decided 04/11/2026 | A stage select on SC-13 for the owner and *edit* members (Draft / Preparing); *archived* only through *Archive project*. SC-13 #9 changed at its source `tools/s5_en.py`. |
| D7 (H3) | Output names of FR-005 / FR-007 (analysis H3), decided 05/11/2026 | The view keeps its flat columns; `GET /api/projects/:id/readiness` returns the spec names `gauge_scores` (object) and `next_actions` (array) — renaming only (contracts/readiness-view.contract.md §API shape). |

## Technical Context

**Language/Version**: JavaScript (ES modules) on Node.js 22+, Next.js 14 App Router (AGENTS.md §2); SQL for SQLite 3 and PostgreSQL 17.

**Primary Dependencies**: existing only (Next.js, React, `@supabase/supabase-js`, `@supabase/ssr`, `node:sqlite`). No new library.

**Storage**: tables `project`, `project_member`, `project_province`, `readiness_snapshot` (schema-M0) read with `segment_requirement` (M1), `compliance_run`, `compliance_finding`, `rule_set_version` (M2), `project_shortlist` (M3), `collab_request` (M4), `document_slot`, `document_type` (M5). One view body written once (`lib/db/readiness-view.sql`, portable SQL with one list-aggregate placeholder) and rendered for SQLite (offline) and PostgreSQL (migration). Writes that check the owner or the *edit* permission, or that span tables, are Postgres functions (as M3 admin, 003 research R4) with a node:sqlite twin.

**Testing**: `node --test` offline (sqlite + seed; Supabase through the fake client); a static test checks that the migration's view equals the rendered template; the readiness of seed project *The Last Ferry* must equal its latest seed snapshot (68.75), the value `seed_rules.readiness()` computes (the seed's own oracle).

**Target Platform**: web, desktop and phone (360 px).

**Project Type**: web application.

**Performance Goals**: dashboard next steps readable within 10 s (SC-001) — one view read per page; project creation under 1 minute with three fields (SC-002).

**Constraints**: scores only in the view (BR-001); gauges per segment from `segment_requirement` (BR-002, BR-004); one next step per gauge, *Done* when complete (BR-003); no delete anywhere (BR-005); only members read a project (RLS); every text from `lib/i18n`; `data/` changed only through its generators (D1, D2).

**Scale/Scope**: ~10 projects in the seed; 3 screens (SC-10, SC-12, SC-13); ~8 API routes; 1 view; 6 Postgres functions; 1 nightly job.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | How this plan meets it | Status |
|---|---|---|
| **I. Spec is the source of truth** | Gauge formulas = spec §9 test values (the same as `data/seed/seed_rules.py`); weights and gauge list from `segment_requirement` rows; the two data gaps (weights, owner) fixed in the data generators by decision D1, D2, not in code; conflicts between screens and spec listed in research.md. | Pass |
| **II. Business rules test-first** | Tests before code for BR-001 (view only; list and dashboard equal; seed snapshot 68.75 reproduced), BR-002 (C has no dossier gauge; logistics `—`, weight 0), BR-003 (exactly one next step per gauge, *Done*), BR-004 (changing a gauge row changes the weights with no code change), BR-005 (no delete; archived read-only and out of the list), RLS (non-members read nothing), US-1..US-3 scenarios (tasks.md). | Pass |
| **III. Thin vertical slices** | Slice 1 = US-1 (create + list + empty dashboard); slice 2 = US-2 (view, gauges, next steps, snapshot); slice 3 = US-3 + FR-002 (invite, accept, edit, archive). | Pass |
| **IV. Synthetic data, no secrets** | Seed only; invitation emails go to the queue, never sent in tests; secret key server-only. | Pass |
| **V. Humans approve** | Branch `005-m0-workspace`; the data-model and seed changes (D1, D2) reviewed by the data owner. | Pass |

*Re-check after Phase 1*: Pass — one new view, functions and a nightly job; no new table or column besides the enum value of D2.

## Project Structure

### Documentation (this feature)

```text
specs/005-m0-workspace/
├── plan.md                 # this file
├── research.md             # R1–R12, open questions
├── data-model.md           # tables used, view columns, next-step rules, functions, states
├── quickstart.md
├── contracts/
│   ├── projects-api.contract.md     # create, list, get, update, archive, invite, accept
│   ├── readiness-view.contract.md   # v_project_readiness columns and rules
│   └── screens.contract.md          # SC-10, SC-12, SC-13
└── tasks.md                # /speckit-tasks
```

### Source Code (repository root)

```text
tools/dm_model2.py, data/seed/generate_seed.py     # D1 gauge rows, D2 owner (then regenerated data/, schema, seed)
lib/db/readiness-view.sql                          # the one view body (template)
lib/readiness/render-view.js                       # renders it for sqlite / postgres
lib/readiness/next-steps.js                        # pure: action code → dictionary key and values (display only)
lib/projects/input.js                              # create / update / invite validation
lib/db/projects.js, sqlite/projects.js, supabase/projects.js   # two sources
lib/db/readiness.js, sqlite/readiness.js, supabase/readiness.js
lib/router/decide.js                               # D1: journey gauges from GAUGE_* rows; requirement list without them
supabase/migrations/20261103000100_m0_owner.sql    # permission CHECK with owner (existing databases)
supabase/migrations/20261103000200_m0_readiness.sql # view, functions, nightly job
scripts/snapshot-readiness.mjs                     # FR-008 by hand / without pg_cron
app/projects/page.js, projects-client.js            # SC-10
app/projects/[id]/page.js, dashboard-client.js      # SC-12
app/projects/[id]/settings/page.js, settings-client.js   # SC-13
app/api/projects/…                                  # route handlers (contracts/projects-api)
lib/i18n/vi.json, en.json
tests/unit/, tests/contracts/
```

**Structure Decision**: the existing single Next.js project; M0 logic in `lib/projects/`, `lib/readiness/`, `lib/db/`; screens under `app/projects/`.

## Known limitations

| # | Limitation | Why / what would remove it |
|---|---|---|
| 1 | `/projects`, `/projects/[id]` and `/projects/[id]/settings` work only with Supabase configured. | Offline, the mock session of `lib/auth/session.js` has no user id for the `member` role, so the pages redirect to sign-in. The node:sqlite data layer is complete and tested by `npm test`; a mock member id (like `MOCK_STAFF_USER_ID`) would make the pages usable offline. |
| 2 | Turning a module's `readiness_source` flag off is a database change (System role). | No screen or function edits it (`data/02` anomaly kind 1, M10 has no such function yet). |
| 3 | Invitation emails are queued in `email_delivery`, not sent. | The sender is SYS T049 / T059 (not built). |
| 4 | The SC-13 mockup image still shows *Stage* as a label. | The image is redrawn only with `tools/build_docs.py --img` (Playwright); the element table (#9) is the source of truth. |
| 5 | Next-step wording and order (research R4, Open question 2) are the agent's, pending VFDA review. | Recorded in build-log §3. |

## Complexity Tracking

| Item | Why it is needed | Simpler alternative rejected because |
|---|---|---|
| One view body rendered for two databases | BR-001: the score exists in one place; offline tests run the same SQL as Supabase. | Two hand-written views drift; a JS formula would break BR-001. |
| The public view runs with its owner's rights and filters on `app.is_project_member()` | The member must see the gauge results of M2–M5 tables that have no member SELECT policy (e.g. `compliance_run`), but only for their own projects. | `security_invoker` would hide those rows and show false 0 %; opening those tables to members widens RLS beyond the CRUD matrix. |
| Postgres functions for create, invite, accept, update, archive | The creator must become owner in the same transaction as the project; invite is owner-only and update / archive need *edit*, which the 003 policies do not distinguish; the invitee is not yet a member when accepting. | Separate client inserts fail RLS (no member yet) or let any member invite; widening the generated policies would change the CRUD-matrix generator for one module. |
| Table `readiness_source` (D5) | spec §3 needs a gauge that has not reported to show `—` and leave the total; "no data" cannot be the signal, because a new project must show 0 % (US-1 Scenario 2). | Treating missing data as *not reported* breaks US-1 Scenario 2; a flag in a config file would need a release to change. |
| `GAUGE_*` rows inside `segment_requirement` (D1) | BR-004 asks for weights from this table; it has no weight column. | A weight column changes the logical model of M1; fixed weights in code break BR-004. |
