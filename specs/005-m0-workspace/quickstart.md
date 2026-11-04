# Quickstart: check the project workspace (M0)

Feature: `005-m0-workspace` · [contracts/](contracts/) · [data-model.md](data-model.md)

## Prerequisites

`npm install` on `005-m0-workspace`. After D1/D2: `python3 tools/build_data.py --mermaid`, `python3 tools/build_schema.py`, `python3 data/seed/generate_seed.py && python3 data/seed/check_seed.py` (PASS), `python3 data/schema/load_check.py` (PASS), `python3 tools/build_dm_docs.py --mermaid`, `python3 tools/build_supabase.py`; online: `npx supabase db push --db-url "$SUPABASE_DB_URL"` and `node scripts/seed-supabase.mjs --reset` (`SUPABASE_DB_URL` exported in the terminal only).

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
| 1 | *The Last Ferry* (seed, A) | Dossier gauge 50 % naming the two missing components; overall 68.75 (shown 69) = its latest seed snapshot (US-2 Scenario 1, BR-001) |
| 2 | *Monsoon Signal* (seed, C) | three counted gauges, no Dossier gauge, Logistics `—` (US-2 Scenario 2, BR-002) |
| 3 | Make the view fail (test fake) | every gauge `—` with *Try again*, never 0 % (US-2 Scenario 3) |
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
| Slices 1–3 on `cinematch-dev` (T026, T035, T045) | — | not run: waiting for `supabase db push` and the reseed |
