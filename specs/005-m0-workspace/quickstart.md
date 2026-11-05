# Quickstart: check the project workspace (M0)

Feature: `005-m0-workspace` · [contracts/](contracts/) · [data-model.md](data-model.md)

## Prerequisites

`npm install` on `005-m0-workspace`. After D1/D2: `python3 tools/build_data.py --mermaid`, `python3 tools/build_schema.py`, `python3 data/seed/generate_seed.py && python3 data/seed/check_seed.py` (PASS), `python3 data/schema/load_check.py` (PASS), `python3 tools/build_dm_docs.py --mermaid`, `python3 tools/build_supabase.py`; online: `npx supabase db push --remote` and `node scripts/seed-supabase.mjs --reset` (`SUPABASE_DB_URL` exported in the terminal only).

## Slice 1 — create a project (US-1)

| # | Step | Expected |
|---|---|---|
| 1 | `npm test` | green, including BR-001..BR-005 and RLS tests |
| 2 | Router: Yes / Outside Vietnam / Foreign → *Create a project with this segment* (signed in) | `/projects?new=1&segment=A`, panel open, segment A (US-1 Scenario 1) |
| 3 | Name + format + A → *Create project* | SC-12 of the new project; you are *Owner*; every gauge 0 %, Logistics `—`, *Start with a content pre-check* (US-1 Scenario 2) |
| 4 | Another member's session | the project is not in their list; its API answers 404 (RLS) |

## Slice 2 — next steps (US-2, FR-008)

| # | Step | Expected |
|---|---|---|
| 1 | *The Last Ferry* (seed, A) | Dossier gauge 25 % (1 of 4 in the seed) naming the three missing components; overall 68.75 (shown 69) = its latest seed snapshot (BR-001). US-2 Scenario 1 (2 of 4 → 50 %) is checked by `tests/unit/readiness-view.test.js` |
| 2 | *Monsoon Signal* (seed, C) | three counted gauges, no Dossier gauge, Logistics `—` (US-2 Scenario 2, BR-002) |
| 3 | Make the view fail (test fake) | every gauge `—` with *Try again*, never 0 % (US-2 Scenario 3) |
| 3b | Set `readiness_source.reporting = false` for one gauge (System, then back to true) | that gauge `—` *Not calculated yet*; the overall uses only the gauges that reported and says *Calculated from 3 of 4 gauges* (spec §3 edge case, decision H1) |
| 4 | Project list vs dashboard | the same readiness number (SC-003) |
| 5 | `npm run snapshot` twice on the same day | one row per active project, none for archived ones (FR-008) |

## Slice 3 — invite, edit, archive (US-3, FR-002, BR-005)

| # | Step | Expected |
|---|---|---|
| 1 | Owner invites an email with *edit* | pending row, queued email (US-3 Scenario 1) |
| 2 | Sign in with that email → SC-10 *Invitations* → *Accept* | the project appears in the list |
| 3 | A *view* member opens SC-13 | read-only; no invite row; no archive |
| 4 | Edit the name and shoot date (after today) | saved; a past date refused |
| 5 | Archive | project leaves the default list, read-only under *Archived*; no delete anywhere (BR-005) |

## Results

*(filled in by the person who runs it)*

### 03/11/2026 — baseline and tests first (Red), run by Nam Tran with Claude Code

| Check | Command | Result |
|---|---|---|
| Baseline (T001) | the 399 tests of `main` at `0a7ae69`, inside the run below | 399 passed, 0 failed |
| Seed | `python3 data/seed/check_seed.py` | PASS (46 tables, 430 rows) |
| Schema + seed load | `python3 data/schema/load_check.py` | SQLite PASS (9 schema files, 46 tables, 430 rows) |
| Spec snapshot | `uv run tools/start_feature.py --check` | OK: `spec.md` matches `docs/spec/spec-M0.md` |
| Build | `npm run build` | OK (no `/projects` route yet) |
| Tests | `npm test` | **470 tests, 86 suites, 400 passed, 70 failed** — the 70 are the new M0 tests T002, T004, T005, T006, T014, T016, T038 (missing view, modules, migrations, seed rows); 1 new test passes (no pending invitation is an owner) |
| Online RLS (T018) | `npm run test:rls` | not run: the M0 migrations do not exist yet |

Slices 1–3 not run: no M0 code yet (T007–T012, T019–T025, T031–T034, T041–T044 open).

### 04/11/2026 — code, offline (Green), run by Nam Tran with Claude Code

| Check | Command | Result |
|---|---|---|
| Data (T007, T008) | `python3 tools/build_data.py --mermaid`, `python3 data/seed/generate_seed.py && python3 data/seed/check_seed.py`, `python3 tools/build_schema.py`, `python3 data/schema/load_check.py`, `python3 tools/build_dm_docs.py --mermaid`, `python3 tools/build_supabase.py` | PASS — 444 rows (14 `GAUGE_*` rows, 8 owners); mermaid checked; migrations match |
| PostgreSQL run of the M0 migrations | PGlite 0.3.16 in a scratch folder (not a project dependency): schema + seed + `20261101000300`, `20261103000100`, `20261103000200` | applied; `app.project_readiness` = node:sqlite view, 8 rows, 0 differing values; non-member reads 0 rows; `FORBIDDEN`, `ARCHIVED`, `NAME_TAKEN`, `ALREADY_INVITED` as expected; snapshot 8 then 0 |
| Tests | `npm test` | **538 tests, 538 passed, 0 failed** |
| Build | `npm run build` | OK (`/projects`, `/projects/[id]`, `/projects/[id]/settings`, 7 API routes) |
| Spec snapshot | `uv run tools/start_feature.py --check` | OK |
| Snapshot offline | `node scripts/snapshot-readiness.mjs 2026-11-03` | 7 projects recorded |
| Slices 1–3 on `cinematch-dev` (T026, T035, T045) | — | not run: waiting for `npx supabase db push --remote` and the reseed |

### 05/11/2026 — on `cinematch-dev` (T026, T035, T045, T046), run by Claude Code for Nam Tran

Before: Nam Tran ran `npx supabase db push --remote` (migrations `20261103000100`, `20261103000200`, then `20261105000100`) and `node scripts/seed-supabase.mjs --reset` (47 tables, 448 rows) — all successful. Temporary accounts (4 per walk-through) were made with the admin API and removed afterwards with their rows: 0 projects, members, accounts or organisations left; no key, password or cookie printed.

| Slice / step | Result |
|---|---|
| 1.2 Router Yes / Outside Vietnam / Foreign company → *Create a project with this segment* | `/projects?new=1&segment=A`; panel open, segment A, *Create project* disabled |
| 1.3 Name + format → *Create project* | disabled with the name only, enabled with the three fields; dashboard in 5.9 s from the router (SC-002); *Project … created*; every gauge 0 %, Logistics `—`, *Start with a content pre-check*; SC-13 *Your permission: Owner* |
| 1.4 Another member | not in their list; `GET /api/projects/:id` 404, `/readiness` 404 |
| 2.1 *The Last Ferry* | overall 69 % (68.75 = seed snapshot 2026-09-27); Content 80 % (1 open finding), Locations 100 % *Done*, Partners 70 % *Confirm the partner who accepted*, Dossier 25 % naming the three missing components, Logistics `—` *Not counted* |
| 2.2 *Monsoon Signal* (C) | Content, Locations, Partners, Logistics — no Dossier card; *Equal average of the 3 counted gauges* |
| 2.3b H1, partners not reporting | Partners `—` *Not calculated yet*; overall 68 % (68.33) *Calculated from 3 of 4 gauges*; API `gauges_reported` 3, `gauges_not_reported` ["partners"]; flag restored |
| 2.4 List vs dashboard | equal for every project checked (68.75 / 68.75, 0 / 0) |
| 2.5 `npm run snapshot` twice | 7 projects recorded, then 0 (archived *Harbour Lights* skipped) |
| H3 `GET /api/projects/:id/readiness` | `gauge_scores` object and `next_actions` array, in `gauges_shown` order |
| 3.1 Owner invites with *edit* | pending row, `email_delivery` queued (`project.invite`, no notification); same email again 409 `ALREADY_INVITED` |
| 3.2 Invitee → *Invitations* → *Accept* | the project appears in their list |
| 3.3 *view* member on SC-13 | read-only fields, no Save, no invite row, no archive, stage as text; PATCH 403 |
| 3.4 Editor edits name, shoot date 2027-04-01, stage Preparing | saved; a past date shows *Must be after today* |
| 3.5 Owner archives | *… archived — find it under Archived*; out of the default list, under Archived; PATCH 409 `ARCHIVED`; DELETE 405 |

| T046 command | Result |
|---|---|
| `npm test` | 558 tests, 558 passed, 0 failed |
| `npm run build` | OK |
| `npm run test:rls` | 13 / 13 passed (5 M0); no fixture organisation left |
| `npm run check:supabase` | 7 PASS, 0 FAIL |
| `uv run tools/start_feature.py --check` | OK |
| `python3 tools/build_supabase.py --check` | OK |
| `python3 data/seed/check_seed.py` | PASS (47 tables, 448 rows) |

