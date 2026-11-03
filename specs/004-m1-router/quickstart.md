# Quickstart: check the segment router (M1)

Feature: `004-m1-router` · Contracts: [contracts/](contracts/) · Model: [data-model.md](data-model.md)

## Prerequisites

- `npm install` on branch `004-m1-router`. Offline steps need nothing else; online steps use `cinematch-dev` and the three Supabase variables in `.env` (SYS quickstart).
- After the seed change (D1): `python3 data/seed/generate_seed.py && python3 data/seed/check_seed.py` → PASS; `python3 data/schema/load_check.py` → PASS; on Supabase, `node scripts/seed-supabase.mjs --reset` with `SUPABASE_DB_URL` exported in the terminal.

## Slice 1 — find my segment (US-1)

| # | Step | Expected |
|---|---|---|
| 1 | `npm test` | green, including the BR-001, BR-002, Q1, Q2, Q3 tests and the hard-coded-text test over the new screens |
| 2 | Open `/` (VI and EN) | headline, *Get started*, four-uncertainties block (one live item, three *coming soon*), 5-step journey; no "VFDA", no logo anywhere on the page |
| 3 | *Get started* → `/start`; answer Yes, Outside Vietnam, Foreign company | result **A** with *Based on answers 1, 2 and 3*; *Needed / Not needed* from the table (US-1 Scenarios 1–2) |
| 4 | Same answers again in a new tab | A again (US-1 Scenario 3) |
| 5 | Change question 4 in every way | the segment does not change (BR-002) |
| 6 | Answer No to question 1 | **C** with *Based on answer 1*, the commercial checklist and *Not legal advice — confirm with VFDA* (Q2) |
| 7 | Yes, In Vietnam, Co-production | **A** (Q1; after D1) |
| 8 | No, and *Locations* in question 4 | *We couldn't classify this* with the three cards |
| 9 | Leave after question 2 | no `segment_decision` row for the session (spec §3) |
| 10 | Complete the answers | one `segment_decision` row with `session_key`, the answers, `decided_by`, no `project_id` |

## Slice 2 — override (US-2)

| # | Step | Expected |
|---|---|---|
| 1 | From result A, click card B | result B, *chosen by you*; the row now has `segment_override = B`, `segment = B` (US-2 Scenario 1, BR-003) |
| 2 | Click card C, then card A | each choice recorded; back on A the override is cleared |
| 3 | PATCH another session's row id | 404 |
| 4 | *That's right — create…* as a guest | `/signup?next=/start`, the choice still there after coming back |

## Results

### 03/11/2026 — Nam Tran's machine (macOS, Node v26.0.0), production build in SQLite mode (`NEXT_PUBLIC_SUPABASE_URL` empty)

Run by Claude Code in the session, reviewed by Nam Tran. `cinematch-dev` not run yet: it needs `node scripts/seed-supabase.mjs --reset` with `SUPABASE_DB_URL` exported, to load the three seed rows of D1.

| Slice / step | Result |
|---|---|
| Seed (D1) | `generate_seed.py` + `check_seed.py` PASS, 46 tables, 430 rows; `load_check.py` SQLite PASS; `build_dm_docs.py --mermaid` OK, Mermaid checked |
| 1.1 `npm test` | 398 tests, 398 passed, 0 failed (TDD Red before the code: 398, 333 passed, 65 failed) |
| 1.2 Landing VI / EN | headline, *Get started*, one live item and three *coming soon*, 5-step journey; footer `© 2026 CINEMATCH` with no VFDA; no image |
| 1.3–1.8 every combination | `POST /api/router/decisions` for all 10 answer sets × 32 subsets of question 4 = **320 / 320 as expected** (No → C [1], or none with *Locations*; Yes: co-production → A for every market; foreign → A abroad, B in Vietnam / both; Vietnamese → B in Vietnam; Vietnamese + abroad or both → no rule) |
| 1.3 timed | Chrome, VI and EN: 5 clicks (Yes, Outside Vietnam, Foreign company, Locations, See the result); *See the result* locked until the required answers; result A *because of your answers to questions 1, 2 and 3* shown 0.2 s after the last click; Needed / Not needed rows from `segment_requirement` |
| 1.6 segment C | *Not legal advice — confirm with VFDA* shown |
| 2.1 override | *Choose another segment* → card B → result B *Chosen by you · the decision table suggested: Segment A*, saved (no *not saved* note) |
| 2.4 confirm as a guest | *Create a project with this segment · Sign-in needed* → `/signup?next=%2Fstart` |

### 03/11/2026 — closing checks, same machine

| Check | Result |
|---|---|
| `npm test` | 399 tests, 77 suites, 399 passed, 0 failed (one Q3 test added at closing, seen red first) |
| `npm run build` (with `.env`, prebuild `check:i18n`) | OK |
| `uv run tools/start_feature.py --check` | OK |
| `python3 data/seed/check_seed.py`, `python3 data/schema/load_check.py` | PASS, 430 rows |
| `cinematch-dev` (build with `.env`) | `/start` 200; Yes / abroad / foreign → A [1,2,3], row with `session_key`, no `project_id`, `journey_config` with the `dossier` gauge; override → B stored (`segment_override = B`); another session → 404; No → C with the caveat; 2 test rows removed (13 rows, as the seed). Still 7 rules and 8 requirements: the D1 rows need `node scripts/seed-supabase.mjs --reset` |
| Landing VI / EN | no "VFDA" in the visible page or in `<title>` / `<meta name="description">` (fixed at closing: the page now has its own description), no image |
