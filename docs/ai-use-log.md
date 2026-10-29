# AI Use Log — CINEMATCH

Every piece of work an AI agent drafted for this repository, what a person checked, and what a person changed.
One row per task. The *Checked by* and *Human change* columns are filled by the member who reviewed the work;
an empty cell means the review is still due. Rules: `.specify/memory/constitution.md`, Development workflow item 6.

| # | Date | Session | Tool | Task given to the agent | Output (files) | Accepted as is | Checked by | Human change / decision |
|---|---|---|---|---|---|---|---|---|
| 1 | 29/09/2026 | 4 | Claude | Textualize the DBIZ2 System Design into Spec Documents, Screen Specs and mockups through generator scripts | `tools/specs_*.py`, `tools/s*_en.py`, `docs/spec/`, `docs/screens/` | | | |
| 2 | 29/09/2026 | 5 | Claude | Build the data model (S0–S4), the review (S6) and the seed package (S5) from the specs | `data/01`–`05`, `data/seed/` | | | |
| 3 | 30/09/2026 | 6–7 | Claude | Write the M10 spec, 21 more Screen Specs, the PRD v3; set up Spec Kit and `AGENTS.md` | `docs/spec/spec-M10.md`, `docs/screens/`, `docs/prd.md`, `AGENTS.md` | | | |
| 4 | 01/10/2026 | 7 | Claude | List the open rubric issues C1–C6 and fix them; the team decided the open points (pilot segment C, moderation Must, location availability, 50 locations / 20 partners, readiness formulas, planned stack) | spec sources in `tools/`, `docs/prd.md` v3.1 | | | Decisions by Nam (01/10/2026): the six points above; keep the old mockup images |
| 5 | 01/10/2026 | 7 | Claude | Declare a type for every column (§6.1 of each spec), resolve the conflicts and minimality findings of the data model | `tools/specs_types.py`, `tools/dm_model*.py`, `data/01`–`05` | | | |
| 6 | 01/10/2026 | 7 | Claude | Rebuild the seed so that rule values are computed and validated before writing; name files in load order | `data/seed/seed_rules.py`, `generate_seed.py`, `check_seed.py`, `NN_<table>.csv` | | | |
| 7 | 01/10/2026 | 7 | Claude | Build the portable SQL schema and the load check (gate G3), tested on SQLite and PostgreSQL 16 | `tools/build_schema.py`, `data/schema/` | | | |
| 8 | 01/10/2026 | 7 | Claude | Reconstruct the *Data Model and Mockup Data* template from the Session 5 lecture and the rubric, and generate one file per module | `tools/dm_rules.py`, `tools/build_dm_docs.py`, `data/data-model-*.md` | | | |
| 9 | 01/10/2026 | 7 | Claude | Align the Screen Spec field names with the data model; fill the constitution; update READMEs, function and screen lists; restore `docs/function-list.md` (emptied by mistake in commit `6f4e993`) | `tools/s*_en.py`, `.specify/memory/constitution.md`, `README.md`, `docs/`, `data/README.md` | | | |
| 10 | 12/10/2026 | 8 | Antigravity | Resolve M3 spec/data-model gaps: remove unsupported special_scenes from F-M3-07 to align with 18-field template; define scene_type_catalog as version-controlled config in F-M3-12 while preserving blocking Open Question #2 for VFDA approval; rebuild spec and refresh feature snapshot | `docs/function-list.md`, `tools/specs_b.py`, `docs/spec/spec-M3.md`, `specs/001-m3-core/spec.md`, `docs/ai-use-log.md` | | | |
| 11 | 12/10/2026 | 8 | Antigravity | Execute Session 8 planning (/speckit-plan), task generation (/speckit-tasks), and analysis (/speckit-analyze); establish test-first tasks for all business rules and acceptance scenarios; record I1, A1, A2, and S1 in build log | `specs/001-m3-core/`, `AGENTS.md`, `docs/build/build-log.md`, `docs/ai-use-log.md` | | | |
| 12 | 12/10/2026 | 8 | Antigravity | Execute /speckit-implement for Setup (T001-T003), Foundational (T004-T007), and US-1 test tasks (T008-T018); strictly omit US-1 implementation code (T019-T027) per TDD Red phase; execute test suite | `package.json`, `.env.example`, `config/`, `lib/`, `tests/`, `specs/001-m3-core/tasks.md`, `docs/build/build-log.md`, `docs/ai-use-log.md` | | | |
| 13 | 12/10/2026 | 8 | Antigravity | Execute /speckit-implement for US-1 implementation tasks (T019-T027): domain scoring engine, catalog validator, search queries, Route Handlers, URL state, and UI pages; achieve 100% passing test suite | `lib/`, `app/`, `specs/001-m3-core/tasks.md`, `docs/build/build-log.md`, `docs/ai-use-log.md` | | | |
| 14 | 12/10/2026 | 8 | Antigravity | Configure Next.js App Router tooling for Node 24 (Next.js 14.2.35, React 18.3.1), create app/layout.js and app/page.js, install dependencies, run tests, and verify local dev server startup | `package.json`, `next.config.mjs`, `app/layout.js`, `app/page.js`, `.gitignore`, `docs/build/build-log.md`, `docs/ai-use-log.md` | | | |
| 15 | 28/10/2026 | 10 | Claude (Cowork) | Apply the 28/10/2026 decisions on 29 blocking open questions: Clarifications in every spec through `tools/decisions.py`; M3 scoring weights and 2 new LOCATION fields; working-day deadlines; fix 22 stale field names in screen specs; align AGENTS.md, constitution (2.0.0), plan, research, quickstart; draft MVP Alpha checklist and `docs/test/` | `tools/decisions.py`, `tools/build_docs.py`, `tools/specs_a.py`, `tools/specs_b.py`, `tools/s1_en.py`–`s3_en.py`, `tools/dm_model2.py`, `data/seed/generate_seed.py`, rebuilt `docs/spec/`, `docs/screens/`, `data/`, `docs/word/`; `lib/scoring/engine.js`, `tests/unit/scoring-weights.test.js`; `AGENTS.md`, `.specify/memory/constitution.md`, `specs/001-m3-core/*`, `docs/build/*`, `docs/test/*` | | Nguyễn Trần Nam (PR review pending) | Decisions taken by the team in chat; all marked provisional until VFDA confirms |

## How the output was checked by script

| Check | Command | Result on 01/10/2026 |
|---|---|---|
| Seed integrity and determinism | `python3 data/seed/check_seed.py` | PASS |
| Schema + seed load (gate G3) | `python3 data/schema/load_check.py` (+ `--postgres`) | PASS on SQLite and PostgreSQL 16 |
| Screen Specs | `python3 tools/check_screens.py s1_en` … `s7_en` | OK |
| Diagrams render | `python3 tools/build_docs.py --mermaid`, `build_data.py --mermaid`, `build_dm_docs.py --mermaid` | OK |
