# Research: Project workspace and readiness dashboard (M0)

Feature: `005-m0-workspace` · Plan: [plan.md](plan.md) · Sources: `specs/005-m0-workspace/spec.md`, `data/data-model-M0.md`, `data/schema/schema-M0.sql` (and the M1–M5 tables the view reads), `data/seed/seed_rules.py` (`readiness()`), `docs/screens/screen-spec-SC-10.md`, `SC-12.md`, `SC-13.md`, `tools/rls_policies.py`.

## R1. Gauge formulas

- **Decision**: spec §9 test values, exactly as `data/seed/seed_rules.py` `readiness()` computes them (the seed's oracle, which produced the seed snapshots):
  - **Content & compliance** = 0 without a compliance run; otherwise 30 + 30 when the latest run (by `run_at`) used the newest `rule_set_version` + 40 × the share of that run's findings with `finding_status = reviewed` (40 when it has none).
  - **Locations** = 0 without a shortlist row; otherwise 50 + 25 with a `primary` + 25 with a `backup`.
  - **Partners** = 100 with a `confirmed` request, 70 with an `accepted` one, 30 with any other request, 0 with none.
  - **Dossier & permits** = 100 × the share of the four `A13_*` document types whose slot is `present` (segments with a `GAUGE_DOSSIER` row).
  - **Logistics** = not scored (`NULL`), shown as `—` (phase 2).
- **Rationale**: Constitution I (spec §9), and one oracle for seed and view: the view must give *The Last Ferry* 68.75, its 2026-09-27 seed snapshot.

## R2. Weights and gauges per segment (D1, BR-002, BR-004, Q1)

- **Decision**: rows `segment_requirement (segment, 'GAUGE_<NAME>', label_vi, label_en, needed)`. A gauge is **shown** when its row exists; it is **counted** when `needed = true`. The weight of a counted gauge = 1 / number of counted gauges of the segment (Q1: equal weights → A, B 25 %; C 33.3 %). Seed rows: A and B — CONTENT, LOCATIONS, PARTNERS, DOSSIER needed, LOGISTICS not needed; C — the same without DOSSIER.
- **Overall readiness** = Σ (gauge × weight) over counted gauges, rounded to 2 decimals, stored as `NUMERIC(5,2)`; the screens show it as an integer (SC-12 #5).
- **Effect on M1**: `splitRequirements()` leaves `GAUGE_*` codes out of SC-02's *Needed / Not needed*; `journeyConfig().gauges` = the counted gauge rows of the segment (same result as today: A/B with `dossier`, C without).

## R3. The view, written once (BR-001)

- **Decision**: `lib/db/readiness-view.sql` holds the SELECT of the view in portable SQL (CASE, sub-selects, `COALESCE`), with one placeholder for the list aggregate (`string_agg(x, ',' ORDER BY x)` on PostgreSQL, `group_concat` over an ordered sub-select on SQLite). `lib/readiness/render-view.js` renders it; node:sqlite creates `v_project_readiness` at start-up (after the seed, like `local-triggers.sql`); the migration contains the PostgreSQL rendering, and a test checks they are the same text.
- **PostgreSQL**: `app.project_readiness` (all projects, for the nightly job) and `public.v_project_readiness` = `SELECT … FROM app.project_readiness WHERE app.is_project_member(project_id)`, owned by the migration role (owner rights), `GRANT SELECT` to `authenticated` only. Reason: plan Complexity Tracking (M2 tables have no member SELECT policy).
- **Alternatives**: a JS scorer (breaks BR-001); `security_invoker` (false 0 %).

## R4. Next step per gauge (BR-003, FR-007)

- **Decision**: rule-based action codes computed in the view, exactly one per gauge, `done` when complete; the screen maps a code to a dictionary sentence (display only):

| Gauge | Condition, in order | Action code |
|---|---|---|
| Content | no compliance run | `content.start_precheck` (SC-12 Empty: *Start with a content pre-check*) |
| | latest run on an older rule-set version | `content.recheck_new_rules` |
| | open findings in the latest run | `content.review_findings` (count) |
| | otherwise | `done` |
| Locations | no shortlist | `locations.shortlist` |
| | no primary | `locations.choose_primary` |
| | no backup | `locations.choose_backup` |
| | otherwise | `done` |
| Partners | no request | `partners.send_request` |
| | a request `info_requested` | `partners.answer_partner` |
| | an `accepted` one, none confirmed | `partners.confirm` |
| | only declined / withdrawn | `partners.send_request` |
| | otherwise (pending, under review) | `partners.await_reply` |
| | a `confirmed` one | `done` |
| Dossier | missing `A13_*` components | `dossier.add_missing` with the missing codes (US-2 Scenario 1 names them) |
| | otherwise | `done` |
| Logistics | always | `logistics.phase2` |

- **Card next step (SC-10 #7, SR-043)**: the first non-`done` action in the order content, locations, partners, dossier (`next_action_primary`), from the same view.
- **Open**: the wording and order are the agent's (Open question 2).

## R5. Owner and permissions (D2)

- **Decision**: `permission ∈ {owner, view, edit}`; exactly one `owner` per project, set by the create function; `owner` can do everything `edit` can, plus invite (FR-004, SR-272). *view* is read-only (SR-271).
- **Data change**: `tools/dm_model2.py` (PROJECT_MEMBER.permission → `ENUM(owner, view, edit)`, the structural finding marked resolved), then `tools/build_data.py`, `tools/build_schema.py`, `data/seed/generate_seed.py` (each project's first member becomes `owner`), `check_seed.py`, `load_check.py`, `tools/build_dm_docs.py`, `tools/build_supabase.py`; plus migration `20261103000100_m0_owner.sql` replacing `ck_project_member_permission` on databases already pushed.

## R6. Writes through functions (plan Complexity Tracking)

| Function (PostgreSQL, `SECURITY DEFINER`) | Who | Effect |
|---|---|---|
| `app_create_project(name, format, segment, shoot_date, shoot_days_vn, crew_size_band, provinces int[], logline)` | signed-in member with a producer organisation | project (`stage = draft`, `buffer_days = 7`, the creator's `producer_org_id`) + owner member row (own email, accepted) + provinces; returns `project_id` |
| `app_update_project(project_id, fields jsonb)` | owner or *edit*, not archived | name, shoot date, logline; `updated_at = now()` |
| `app_archive_project(project_id)` | owner or *edit*, not archived | `stage = archived` |
| `app_invite_member(project_id, email, permission)` | owner, not archived | pending member row (`user_id` empty); refuses a member or pending email |
| `app_accept_invitation(member_id)` | the signed-in user whose account email equals `invitee_email` | `user_id`, `invite_status = accepted` |
| `app_snapshot_readiness(date)` | System | one `readiness_snapshot` per non-archived project for the date; skips projects already recorded |

The node:sqlite source implements the same checks in JS inside one transaction. The invitation email row (`email_delivery`, `template_id = project.invite`, queued, no notification because the invitee may have no account) is written by the API with the System client.

## R7. Validation (FR-001, FR-002, SC-10, SC-13)

- **Decision**: name 1–200 characters trimmed (FR-001 `VARCHAR(200)`; SC-10 says 2–120 — Open question 4), format and segment from their enums, shoot date after today (FR-002), shoot days integer 1–365 (SC-10 #13), crew band enum, provinces among the 34 (`province`), logline ≤ 500; invite email ≤ 254 and a valid address, permission `view` / `edit` only. Name unique within the organisation (SC-10 #9; natural key proposed in data-model-M0).

## R8. Project list (FR-003, BR-005)

- **Decision**: projects where the user is an accepted member; tabs by `stage`: *Draft*, *Preparing* (default list) and *Archived* (read-only). Each card: name, format, segment, readiness and primary next step from the view, shoot date and days remaining (date difference for display only). SC-10's *shot* tab has no stage value (Open question 5).

## R9. Archived projects (BR-005)

- **Decision**: no delete route, grant or policy anywhere (the 003 matrix has none). Archived: out of the default list, every write function refuses (`ARCHIVED`), the screens are read-only; documents, requests and notices untouched.

## R10. Nightly snapshot (FR-008, D4)

- **Decision**: `app_snapshot_readiness(current_date)` scheduled with `pg_cron` at 00:05 Vietnam time (`5 17 * * *` UTC) in the migration when the `pg_cron` extension is available; `npm run snapshot` (`scripts/snapshot-readiness.mjs`, secret key) runs the same function by hand. Offline: the sqlite twin inserts from the view.

## R11. Pre-fill from the router (US-1 Scenario 1)

- **Decision**: SC-02 *Create a project with this segment* links to `/projects?new=1&segment=<letter>` (M1 D4 changes: a signed-in member now gets the link instead of the note); SC-10 opens the panel with the segment pre-selected. The M1 decision row is not linked to the project in this plan (M1 US-3).

## R12. Screens

- **SC-10** `/projects`: list + *Invitations* (D3) + *Create new project* panel (3 required fields + optional ones).
- **SC-12** `/projects/[id]`: name, segment, organisation; shoot date and days remaining (or *Set date* → settings); overall readiness; the gauges the view returns with score or `—` and the next-step sentence; gauge buttons → built screens only (*Locations* → `/locations/match`), the others *coming soon*; error state: every gauge `—` with *Couldn't calculate readiness. Your project data is safe.* and *Try again*, never 0 % (US-2 Scenario 3). Sidebar: *Overview* and *Settings*. Deadline strip, activity and consultation: not shown / *coming soon*.
- **SC-13** `/projects/[id]/settings`: details (edit), stage, members and invitations (invite: owner only), archive (edit). The segment card is M1 US-3 (not here).

## Open questions

| # | Question | Interim choice | Owner |
|---|---|---|---|
| 1 | [NEEDS CLARIFICATION: SC-12 SR-055 says the dashboard never reads other modules' tables; spec §4.2 has the view combine M2–M5 data.] | The **view** reads them; the screens read only the view | Group C |
| 2 | [NEEDS CLARIFICATION: next-step wording and order per gauge are not in the spec.] | R4 table | VFDA / Group C |
| 3 | Spec open questions 2 (editable buffer), 3 (invite outside the organisation), 5 (change permission, remove member, cancel invitation), 6 (restore an archived project) | Buffer fixed at 7; any email may be invited; none of the three member actions; no restore | VFDA / Group C |
| 4 | [NEEDS CLARIFICATION: project name 2–120 (SC-10 #9) or 1–200 (FR-001, schema, SC-13 #5)?] | 1–200 | Group C |
| 5 | [NEEDS CLARIFICATION: SC-10 tabs *preparing / shot / archived*, but `stage` is draft / preparing / archived.] | Draft / Preparing / Archived | Group C |
| 6 | [NEEDS CLARIFICATION: a member account with no producer organisation (staff, partners) cannot own a project (`producer_org_id` NOT NULL).] | Refused with *Add your organisation in My account* (SC-08) | Group C |
| 7 | [NEEDS CLARIFICATION: weight shares are 25 % / 33.3 % as rounded labels; the total uses exact thirds.] | Exact 1/n in the view; labels rounded | VFDA |
