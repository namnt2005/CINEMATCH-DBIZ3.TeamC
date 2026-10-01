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

## How the output was checked by script

| Check | Command | Result on 01/10/2026 |
|---|---|---|
| Seed integrity and determinism | `python3 data/seed/check_seed.py` | PASS |
| Schema + seed load (gate G3) | `python3 data/schema/load_check.py` (+ `--postgres`) | PASS on SQLite and PostgreSQL 16 |
| Screen Specs | `python3 tools/check_screens.py s1_en` … `s7_en` | OK |
| Diagrams render | `python3 tools/build_docs.py --mermaid`, `build_data.py --mermaid`, `build_dm_docs.py --mermaid` | OK |
