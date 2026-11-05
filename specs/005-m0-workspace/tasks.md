---
description: "Task list for the project workspace and readiness dashboard (M0): US-1 create, US-2 next steps, US-3 invite"
---

# Tasks: Project workspace and readiness dashboard (M0)

**Input**: Design documents from `/specs/005-m0-workspace/` — [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Prerequisites**: plan.md (decisions D1–D4), research.md (R1–R12, Open questions 1–7)

**Tests**: Required. Constitution Principle II and the request for this feature: the test of every business rule (BR-001..BR-005), the RLS rule (only members read a project) and every acceptance scenario (US-1 Scenarios 1–2, US-2 Scenarios 1–3, US-3 Scenario 1) is written and seen failing **before** the code that makes it pass. Each implementation task names the test task it turns green. `npm test` stays offline (`node:sqlite` + seed; Supabase through `tests/contracts/supabase-fake.js`); real RLS is checked by `npm run test:rls`.

**Organization**: Phase 2 = data changes (D1, D2) and the one readiness view, which every story reads; Phase 3 = US-1 (P1, MVP); Phase 4 = US-2 (P1); Phase 5 = US-3 (P2) with FR-002 and BR-005. FR-009, segment change (M1 US-3) and the M5 deadline strip are not in this plan.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1, US2, US3 (spec.md §3)
- Every task names its FR / BR / decision and its file paths

---

## Phase 1: Setup

- [X] T001 Record the baseline on branch `005-m0-workspace` — `npm test`, `npm run build`, `uv run tools/start_feature.py --check`, `python3 data/seed/check_seed.py`, `python3 data/schema/load_check.py` — in specs/005-m0-workspace/quickstart.md §Results

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The data model holds the owner and the gauge rows (D1, D2); `v_project_readiness` computes every score, weight and next step from one SQL body on both databases (BR-001..BR-004).

**⚠️ CRITICAL**: Tests T002–T006 are written and seen failing before T007–T012.

### Tests for Phase 2 (write first, see them fail) ⚠️

- [X] T002 [P] Create unit test of the seed after D1 and D2: segments A and B have `GAUGE_CONTENT`, `GAUGE_LOCATIONS`, `GAUGE_PARTNERS`, `GAUGE_DOSSIER` needed and `GAUGE_LOGISTICS` not needed; C has the same without `GAUGE_DOSSIER` (BR-002, BR-004, Q1); `ck_project_member_permission` in data/schema/schema-M0.sql allows `owner`, `view`, `edit`; every seed project has exactly one `owner` member, accepted, with a user (FR-001, D2) in tests/unit/m0-seed.test.js
- [X] T003 [P] Create unit test that M1 ignores the gauge rows: `splitRequirements()` never lists a `GAUGE_*` code on SC-02, and `journeyConfig().gauges` equals the counted `GAUGE_*` rows of the segment (A, B with `dossier`; C without) (M1 FR-002, D1) in tests/unit/router-gauges.test.js
- [X] T004 [P] Create unit test of the view template: `renderView('sqlite')` and `renderView('postgres')` leave no placeholder and differ only in the list aggregate; the PostgreSQL migration contains exactly `renderView('postgres')` as `app.project_readiness`; `public.v_project_readiness` selects from it with `WHERE app.is_project_member(project_id)`, is granted SELECT to `authenticated` only (not `anon`) (BR-001, RLS, research R3) in tests/unit/readiness-render.test.js
- [X] T005 [P] Create unit test of `v_project_readiness` on node:sqlite with the seed: *The Last Ferry* (A) `readiness_total` = 68.75, the value of its latest seed snapshot (BR-001, research R1); its dossier score is 25 (1 of 4 `A13_*` present in the seed) and `dossier_missing` lists the three others; US-2 Scenario 1 (2 of 4 → 50 %, two codes named) is checked on *Rice and Salt* with a second component made present inside a rolled-back transaction; *Monsoon Signal* (C) has `dossier_score` NULL, no dossier in `gauges_shown`, `gauges_counted` = 3 (US-2 Scenario 2, BR-002); every project has `logistics_score` NULL and `logistics_action` = `logistics.phase2`; every shown gauge has exactly one non-empty action and a complete gauge reads `done` (BR-003); turning a segment's `GAUGE_PARTNERS` row to not needed changes `gauges_counted` and `readiness_total` with no code change (BR-004); a project with no data has every score 0 and `content.start_precheck` first (US-1 Scenario 2) in tests/unit/readiness-view.test.js
- [X] T006 [P] Create unit test of the M0 migrations: `20261103000100_m0_owner.sql` replaces `ck_project_member_permission` with owner, view, edit; `20261103000200_m0_readiness.sql` defines `app_create_project`, `app_update_project`, `app_archive_project`, `app_invite_member`, `app_accept_invitation`, `app_snapshot_readiness` as `SECURITY DEFINER` with `search_path = ''`, grants EXECUTE to `authenticated` (snapshot: `service_role` only), schedules the nightly snapshot only when `pg_cron` exists, and contains no `DELETE` (BR-001, BR-005, FR-008, research R6, R10) in tests/unit/m0-migrations.test.js

### Implementation for Phase 2

- [X] T007 D2: set `PROJECT_MEMBER.permission` to `ENUM(owner, view, edit)` and mark the structural finding resolved in tools/dm_model2.py; make the first member of each seed project its `owner` in data/seed/generate_seed.py; regenerate with `python3 tools/build_data.py --mermaid`, `python3 tools/build_schema.py`, `python3 data/seed/generate_seed.py && python3 data/seed/check_seed.py`, `python3 data/schema/load_check.py`, `python3 tools/build_dm_docs.py --mermaid`, `python3 tools/build_supabase.py`; never edit data/ by hand; reviewed by the data owner (FR-001, FR-004, D2; verifies T002)
- [X] T008 D1: add the 14 `GAUGE_*` rows (labels vi / en) to `REQ` in data/seed/generate_seed.py and regenerate as in T007 (BR-002, BR-004, Q1; verifies T002)
- [X] T009 Leave `GAUGE_*` codes out of `splitRequirements()` and read `journeyConfig().gauges` from the counted gauge rows in lib/router/decide.js (D1; verifies T003)
- [X] T010 Write the view body in lib/db/readiness-view.sql and `renderView(dialect)` in lib/readiness/render-view.js; create `v_project_readiness` after the seed in lib/db/client.js (research R1–R4; verifies T004 for sqlite, T005)
- [X] T011 Write supabase/migrations/20261103000100_m0_owner.sql and supabase/migrations/20261103000200_m0_readiness.sql (view pair, the six functions, grants, guarded pg_cron schedule) (research R3, R6, R10; verifies T004, T006)
- [X] T012 [P] Add the readiness API of the data layer — `getReadiness(projectId, session)`, `listReadiness(projectIds, session)` — in lib/db/readiness.js, lib/db/sqlite/readiness.js and lib/db/supabase/readiness.js (user client: the view filters members) (BR-001)

**Checkpoint**: One view gives every score, weight and next step on both databases; the seed reproduces 68.75.

---

## Phase 3: User Story 1 — Create a project with three fields (Priority: P1) 🎯 MVP

**Goal**: From the router or *My projects*, a member creates a project with name, format and segment, becomes its owner and opens its dashboard with every gauge at 0 % and a first next step; only members see it (FR-001, FR-003, FR-006, FR-007, RLS).

**Independent Test**: [quickstart.md](quickstart.md) Slice 1 — router A → *Create a project with this segment* → panel pre-filled with A → *Create project* → SC-12, owner, 0 %, *Start with a content pre-check*; another member does not see it.

### Tests for User Story 1 (write first, see them fail) ⚠️

- [X] T013 [P] [US1] Create unit test of the project input: name 1–200 trimmed, format and segment from their enums, shoot date after today, shoot days 1–365, crew band enum, provinces among the 34 ids and no repeats, logline ≤ 500; all errors at once as dictionary keys present in vi.json and en.json (FR-001, research R7) in tests/unit/project-input.test.js
- [X] T014 [P] [US1] Create unit test of the project data layer on node:sqlite: `createProject()` stores stage `draft`, `buffer_days` 7, the creator's `producer_org_id`, one `owner` member (accepted, own email) and the provinces, in one transaction; refuses a name already used in the organisation (`NAME_TAKEN`) and an account without organisation (`NO_ORGANISATION`); `listProjects()` returns only projects where the user is an accepted member, without archived ones by default, with counts per stage; a non-member (or a pending invitee with an account) gets `null` from `getProject()` and `getReadiness()`, and `listReadiness()` drops their rows (FR-001, FR-003, BR-005, RLS) in tests/unit/projects-data.test.js
- [X] T015 [P] [US1] Create contract test of `POST /api/projects` and `GET /api/projects` with the Supabase fake: 401 for a guest; 201 `{ project_id }` through `app_create_project` (no direct insert); 422 with `fields`; 409 `NAME_TAKEN` / `NO_ORGANISATION`; the list carries `readiness_total` and `next_action_primary` read from the view, never computed by the route (FR-001, FR-003, BR-001, contracts/projects-api.contract.md) in tests/contracts/projects-api.test.js
- [X] T016 [P] [US1] Create unit test of the next-step sentences: every action code of research R4 maps to a dictionary key present in both languages; `dossier.add_missing` names the missing components from `document_type.name_vi` / `name_en`; `content.review_findings` carries the count; `done` reads *Done* (BR-003, US-2 Scenario 1) in tests/unit/next-steps.test.js
- [X] T017 [P] [US1] Update the M1 confirm-action test for research R11 — a signed-in member gets `/projects?new=1&segment=<letter>`, a guest still `/signup?next=%2Fstart` — in tests/unit/router-view.test.js, and create the SC-10 view test: the panel opens with `?new=1`, the segment is pre-selected from `?segment=`, *Create project* stays disabled until the three required fields are valid (US-1 Scenario 1, SR-041) in tests/unit/projects-view.test.js
- [X] T018 [P] [US1] Add to the online suite tests/rls/rls.test.js: a member who is not on a project reads no `project`, `project_member` or `v_project_readiness` row of it; the owner reads them (RLS, SR-044; run by `npm run test:rls`)

### Implementation for User Story 1

- [X] T019 [US1] Implement `validateProjectInput()` in lib/projects/input.js (verifies T013)
- [X] T020 [US1] Implement `createProject()` and `listProjects()` in lib/db/projects.js, lib/db/sqlite/projects.js and lib/db/supabase/projects.js (`app_create_project` RPC) (verifies T014)
- [X] T021 [US1] Implement `POST` and `GET` in app/api/projects/route.js (verifies T015)
- [X] T022 [P] [US1] Implement `nextStepText(t, gauge, row, documentTypes, locale)` in lib/readiness/next-steps.js and the `projects.*`, `dashboard.*` texts in lib/i18n/vi.json and en.json (verifies T016)
- [X] T023 [US1] Change `confirmAction()` in app/start/router-view.js to link a member to `/projects?new=1&segment=<letter>` (verifies T017, M1 part)
- [X] T024 [US1] Build SC-10 in app/projects/page.js, app/projects/projects-client.js and app/projects/projects-view.js in the order of docs/screens/screen-spec-SC-10.md (title + *New project*, stage tabs with counts, cards, *Create new project* panel, Empty / Loading / Error / Success) (FR-001, FR-003; verifies T017)
- [X] T025 [US1] Build SC-12 for a new project in app/projects/[id]/page.js and app/projects/[id]/dashboard-client.js: header, overall readiness, one card per gauge in `gauges_shown` with its score and next step, Logistics `—` *Phase 2*, gauge buttons live only for built screens, sidebar Overview / Settings (FR-006, FR-007, US-1 Scenario 2)
- [X] T026 [US1] Run quickstart Slice 1 on `cinematch-dev` after `npx supabase db push --remote` and the reseed, and record the results in specs/005-m0-workspace/quickstart.md §Results (US-1, SC-002)

**Checkpoint**: A member creates a project in three fields and sees its dashboard; MVP demonstrable.

---

## Phase 4: User Story 2 — See what to do next (Priority: P1)

**Goal**: The dashboard shows the gauges of the segment with exactly one next step each, the same numbers as the list, and an honest error state; one snapshot per active project every night (FR-005..FR-008, BR-001..BR-003).

**Independent Test**: [quickstart.md](quickstart.md) Slice 2 — *The Last Ferry* dossier 50 % with two components named, overall 68.75; *Monsoon Signal* without dossier gauge; a failing view shows `—` and *Try again*; list = dashboard; snapshot once per night.

### Tests for User Story 2 (write first, see them fail) ⚠️

- [X] T027 [P] [US2] Create unit test of the dashboard view helpers: the cards follow `gauges_shown` (no Dossier card for C, BR-002); a NULL score renders `—`, never 0 %; on a view error every gauge renders `—` with the *Couldn't calculate readiness* line and *Try again* (US-2 Scenario 3); the overall readiness is shown as an integer from `readiness_total` without recomputing (BR-001, SR-052) in tests/unit/dashboard-view.test.js
- [X] T028 [P] [US2] Create contract test of `GET /api/projects/:id/readiness`: the view row for a member; 404 for a non-member; 503 `READINESS_UNAVAILABLE` when the view fails (fake error) (FR-005, US-2 Scenario 3) in tests/contracts/readiness-api.test.js
- [X] T029 [P] [US2] Create unit test that the project list and the dashboard show the same readiness and next step for every seed project (SC-003, BR-001, SR-043) in tests/unit/readiness-consistency.test.js
- [X] T030 [P] [US2] Create unit test of the nightly snapshot on node:sqlite and of scripts/snapshot-readiness.mjs with a fake System client: one `readiness_snapshot` per non-archived project for the date, equal to the view's `readiness_total`; running twice the same day adds nothing; archived projects get none (FR-008, BR-005) in tests/unit/readiness-snapshot.test.js

### Implementation for User Story 2

- [X] T031 [US2] Implement the dashboard view helpers in app/projects/[id]/dashboard-view.js and use them in app/projects/[id]/dashboard-client.js, with the error state and *Try again* (verifies T027)
- [X] T032 [US2] Implement `GET` in app/api/projects/[id]/readiness/route.js (verifies T028)
- [X] T033 [US2] Make the SC-10 cards and SC-12 read the same `listReadiness()` / `getReadiness()` rows in app/projects/page.js and app/projects/[id]/page.js (verifies T029)
- [X] T034 [US2] Implement `snapshotReadiness(date)` in lib/db/readiness.js (both sources; Supabase: `app_snapshot_readiness`), scripts/snapshot-readiness.mjs and the `snapshot` script in package.json (verifies T030)
- [X] T035 [US2] Run quickstart Slice 2 on `cinematch-dev` (including `npm run snapshot` twice) and record the results in specs/005-m0-workspace/quickstart.md §Results (US-2, SC-001, SC-003)

**Checkpoint**: Every gauge tells the next step; numbers agree everywhere; snapshots accumulate.

---

## Phase 5: User Story 3 — Invite a colleague, edit, archive (Priority: P2)

**Goal**: The owner invites by email with *view* or *edit*; the invitee accepts on SC-10; editors change details and archive; nothing is ever deleted (FR-002, FR-004, BR-005, D3).

**Independent Test**: [quickstart.md](quickstart.md) Slice 3 — invite with *edit* → accept → the project appears; a *view* member is read-only; archive → out of the list, read-only.

### Tests for User Story 3 (write first, see them fail) ⚠️

- [X] T036 [P] [US3] Create unit test of the invite and update input: invitee email ≤ 254 and valid, permission `view` or `edit` only (never `owner`); update accepts name, shoot date (after today), logline and stage `draft` / `preparing` only (FR-002, FR-004) in tests/unit/project-input-update.test.js
- [X] T037 [P] [US3] Create unit test of the member data layer on node:sqlite: `inviteMember()` by the owner adds one pending row and one queued `email_delivery` (`project.invite`, no notification); a non-owner is refused; an email already a member or pending is refused (`ALREADY_INVITED`); `listInvitations()` returns the pending rows of the caller's account email; `acceptInvitation()` sets `user_id` and `accepted` only for that email, after which the project is in the invitee's list (US-3 Scenario 1, D3) in tests/unit/project-members-data.test.js
- [X] T038 [P] [US3] Create unit test of update and archive on node:sqlite: owner and *edit* may update and archive; *view* gets `FORBIDDEN`; an archived project refuses every write (`ARCHIVED`); archive keeps the project's documents, requests and members; `updated_at` changes on save (FR-002, BR-005, SR-271) in tests/unit/project-update-data.test.js
- [X] T039 [P] [US3] Create contract test of `PATCH /api/projects/:id`, `POST /api/projects/:id/archive`, `POST /api/projects/:id/invitations`, `GET /api/invitations`, `POST /api/invitations/:member_id/accept` with the Supabase fake (each through its RPC): status codes of contracts/projects-api.contract.md; `DELETE /api/projects/:id` → 405 (BR-005) in tests/contracts/project-members-api.test.js
- [X] T040 [P] [US3] Create unit test of the SC-13 view rules: details editable for owner / edit and read-only for view and archived; the invite row only for the owner; the archive card hidden when archived; the *Only you are on this project* line when alone; the creator shown as *Owner* (SR-271, SR-272, SR-275) in tests/unit/settings-view.test.js

### Implementation for User Story 3

- [X] T041 [US3] Extend lib/projects/input.js with `validateInvite()` and `validateProjectUpdate()` (verifies T036)
- [X] T042 [US3] Implement `inviteMember()`, `listInvitations()`, `acceptInvitation()`, `updateProject()`, `archiveProject()` and `getProject()` in lib/db/projects.js and both sources (verifies T037, T038)
- [X] T043 [US3] Implement the routes app/api/projects/[id]/route.js (GET, PATCH, DELETE → 405), app/api/projects/[id]/archive/route.js, app/api/projects/[id]/invitations/route.js, app/api/invitations/route.js and app/api/invitations/[member_id]/accept/route.js (verifies T039)
- [X] T044 [US3] Build SC-13 in app/projects/[id]/settings/page.js, settings-client.js and settings-view.js in the order of docs/screens/screen-spec-SC-13.md (details, members and invitations, archive with confirmation; no segment card, no delete), and the *Invitations* block with *Accept* on SC-10 (FR-002, FR-004, BR-005; verifies T040)
- [X] T045 [US3] Run quickstart Slice 3 on `cinematch-dev` with two temporary accounts and record the results in specs/005-m0-workspace/quickstart.md §Results (US-3 Scenario 1)

**Checkpoint**: All three stories work offline and on Supabase.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T046 Run `npm test`, `npm run build`, `npm run test:rls`, `uv run tools/start_feature.py --check`, `python3 tools/build_supabase.py --check`, `python3 data/seed/check_seed.py`, `python3 data/schema/load_check.py` and record them in specs/005-m0-workspace/quickstart.md §Results
- [X] T047 Add the build-log entry and the AI-use-log row, and record the spec issues of research Open questions 1–7 in docs/build/build-log.md §3 and docs/ai-use-log.md

## Phase 7: Decisions H1–H3 and fixes from the online run (Nam Tran, 04–05/11/2026)

- [X] T048 [US2] H1 test first: tests/unit/readiness-not-reported.test.js (flag off → score NULL, `not_reported`, total over the reported gauges, none reported → NULL and no snapshot), tests/unit/readiness-not-reported-view.test.js (SC-12 `—` *Not calculated yet*, partial note, API fields), tests/unit/m0-readiness-source-migration.test.js; then `READINESS_SOURCE` in tools/dm_model.py, tools/dm_model2.py, tools/dm_rules.py, tools/build_data.py, data/seed/generate_seed.py, data/seed/seed_rules.py (regenerated: 47 tables, 448 rows; seed files from 15 renumbered), lib/db/readiness-view.sql, lib/db/sqlite/readiness.js, app/projects/[id]/dashboard-view.js and dashboard-client.js, supabase/migrations/20261105000100_m0_readiness_source.sql; table count 46 → 47 in tests/unit/migrations-schema.test.js, tests/unit/rls-coverage.test.js (title), tools/build_supabase.py, AGENTS.md, README.md, tools/README.md (spec §3 edge case, plan D5)
- [X] T049 [US3] H2: SC-13 #9 at its source tools/s5_en.py, then `python3 tools/build_docs.py --mermaid`, `build_index.py`, `start_feature.py --check` (plan D6)
- [X] T050 [US2] H3 test first: tests/contracts/readiness-api.test.js (spec names), tests/unit/readiness-api-shape.test.js (round trip); then `toApiReadiness()` / `fromApiReadiness()` in lib/db/project-shape.js, app/api/projects/[id]/readiness/route.js, contracts/readiness-view.contract.md §API shape, contracts/projects-api.contract.md (FR-005, FR-007, plan D7)
- [X] T051 Malformed project or member id → 404 before any database call, test first in tests/contracts/readiness-api.test.js and tests/contracts/project-members-api.test.js, then `isUuid()` in lib/api/projects.js and the five `:id` routes (found on `cinematch-dev`)
- [X] T052 scripts/lib/supabase-check.mjs finds the location seed file by table name (the NN prefix moved with T048); tests/rls/rls.test.js removes its fixture organisations (build-log Entry 10)
- [X] T053 Every `db push` command in specs/*/quickstart.md → `npx supabase db push --remote`; plan.md Known limitations

---

## Not in this plan

- FR-009 trend chart (Could); changing a project's segment on SC-13 (M1 US-3, M1 FR-003); the deadline strip (M5 F-M5-08); recent activity; *Book a consultation* (SC-33); the target screens of the gauge buttons (SC-48, SC-17, SC-25, SC-27).

---

## Traceability: rule or scenario → test → code

| Rule / scenario | Test (written first) | Code that turns it green |
|---|---|---|
| BR-001 — scores only in `v_project_readiness` | T004, T005, T015, T027, T029 | T010, T011, T012, T021, T031, T033 |
| BR-002 — gauges per segment; Logistics `—` | T002, T005, T027 | T008, T010, T031 |
| BR-003 — exactly one next step per gauge, *Done* | T005, T016 | T010, T022 |
| BR-004 — weights from `segment_requirement` | T002, T005 | T008, T010 |
| BR-005 — archived, never deleted | T006, T014, T030, T038, T039 | T011, T020, T034, T042, T043 |
| RLS — only members read a project | T004, T014, T018 | T011, T020 |
| D2 — owner | T002, T014, T037 | T007, T020, T042 |
| US-1 Scenario 1 — segment pre-filled from the router | T017 | T023, T024 |
| US-1 Scenario 2 — owner, dashboard 0 %, first next step | T005, T014, T015 | T010, T020, T021, T025 |
| US-2 Scenario 1 — dossier 50 %, missing components named | T005, T016 | T010, T022 |
| US-2 Scenario 2 — segment C, no dossier gauge | T005, T027 | T010, T031 |
| US-2 Scenario 3 — view fails → `—` and *Retry* | T027, T028 | T031, T032 |
| US-3 Scenario 1 — invite with *edit*, accept, see the project | T036, T037, T039 | T041, T042, T043, T044 |
| FR-002 — edit details | T036, T038, T039, T040 | T041, T042, T043, T044 |
| FR-008 — nightly snapshot | T006, T030 | T011, T034 |
| Spec §3 edge case — a module fails to report (H1) | T048 | T048 |
| FR-005 / FR-007 output names (H3) | T050 | T050 |

---

## Dependencies & Execution Order

- **Phase 1** → **Phase 2** (blocks every story) → **US-1** → **US-2** → **US-3** → **Phase 6**.
- T007 and T008 change `data/` through the generators: data-owner review before merge; T026, T035, T045 need `db push` and `node scripts/seed-supabase.mjs --reset` on `cinematch-dev`.
- Tests first within each phase: T002–T006 before T007–T012; T013–T018 before T019–T025; T027–T030 before T031–T034; T036–T040 before T041–T044.
- T007 before T008 (same generator run order); T010 before T011 (the migration embeds the rendered view); T019 before T020; T022 before T024 and T025.

### Parallel opportunities

- Phase 2 tests T002–T006 together; T012 alongside T011.
- US-1 tests T013–T018 together; T022 alongside T019–T021.
- US-2 tests T027–T030 together; US-3 tests T036–T040 together.

### Parallel example: User Story 1

```text
Tests together:  T013 project-input | T014 projects-data | T015 projects-api | T016 next-steps | T017 router-view + projects-view | T018 rls
Then:            T019 input → T020 data → T021 API ;  T022 next steps (parallel) ;  T023 router link
Then:            T024 SC-10 → T025 SC-12 → T026 online check
```

---

## Implementation Strategy

1. Phase 1–2 (data changes reviewed, one view).
2. US-1 → **STOP and VALIDATE** (quickstart Slice 1): MVP.
3. US-2 → next steps, consistency, snapshots.
4. US-3 → invitations, edit, archive.
