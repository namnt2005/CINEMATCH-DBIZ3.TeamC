# data/ — Data model and seed data (Session 5)

This folder turns the nine Spec Documents in `docs/spec/` (version of 01/10/2026) into a data model, a physical schema and executable mockup data. It follows the Session 5 prompt pack *From Spec to Data Model*: every entity, column and relationship cites the spec line it came from, and anything the specs do not settle is written as a `[NEEDS CLARIFICATION]` question instead of being guessed.

The folder plays the role of `spec/data/` in the prompt pack. It sits at the repository root as `data/` because the Session 6 starter kit expects the data package there (Setup Guide, step C3).

| File | Step | What it answers |
|---|---|---|
| `data-model-<MODULE>.md` (9 files) | S0–S6, one per module | **The submission view.** One file per module (SYS, M1, M0, M2, M3, M4, M5, M7, M10) with the heading `# Data Model and Mockup Data:` and the 13 sections listed below |
| `01-entity-dictionary.md` | S0 + S1 | The INPUT MAP, then the 51 entities of the product (46 stored, 5 derived), their owners and aliases, 11 implied but undeclared entities, 23 naming and ownership conflicts with the decision applied to each |
| `02-crud-matrix.md` | S2 | Which of the 104 functions create, read or update which entity — 167 rows, 24 anomalies |
| `03-erd.mmd` | S3 | The conceptual ERD: 46 stored entities, 66 relationships, each with a forward and a reverse sentence and a citation |
| `04-data-model.md` | S4 | The logical model: 313 columns, every one with a declared type, natural keys, 15 type conflicts with their decision, 34 structural findings |
| `05-review.md` | S6 | The 7-criterion review of the data model, and all 45 questions raised in 01–04: 31 open (12 blocking), 14 resolved |
| `schema/` | S4 → physical | `schema-<MODULE>.sql` (9 files, 46 tables, 66 foreign keys, 64 named CHECK constraints), portable SQL for SQLite 3 and PostgreSQL 14+, and `load_check.py` (gate G3) |
| `seed/` | S5 | 46 CSV files `NN_<table>.csv` (427 rows) named in load order, the generator, the business-rule validator `seed_rules.py`, the integrity check, and the scenario coverage table |

**Start here:** `data-model-<MODULE>.md` for the module you build, `05-review.md` for the verdict, `03-erd.mmd` for the whole shape, then `seed/README.md` for the story in the data.

## Layout of `data-model-<MODULE>.md`

The course template file was not available to the team, so the layout was reconstructed from the Session 5 lecture (*Building an ERD with AI*: steps S0–S6, human gates 1–6, citation `<MODULE> §<section> <ID>`) and the Session 7 rubric (C3 data model, C4 mockup data, gates G2–G4). Sections 1–12 are mandatory and all filled; section 13 is for the people who sign.

| § | Section | Lecture step / rubric item |
|---|---|---|
| 1 | Sources and input map | S0 — INPUT MAP; C3 traceability |
| 2 | Entity catalogue | S1; C3 completeness |
| 3 | Attributes (type, Req / Opt, source kind, citation) | S4; C3 correctness |
| 4 | Relationships (cardinality, forward and reverse sentence) | S3; C3 |
| 5 | ERD and diagram check (the diagram is compared with the model by script) | S3; human gate 3 |
| 6 | Normalization check (1NF–3NF, accepted exceptions with reason) | S4; C3 minimality |
| 7 | Business rules and where each is enforced (CHECK, foreign key, generator rule, later trigger / RLS) | S4–S5; C3, C4 |
| 8 | Schema (link to `schema/schema-<MODULE>.sql` and its counts) | G2, G3 |
| 9 | Mockup data (files, rows, row kinds: ordinary, boundary, empty, exceptional) | S5; C4 |
| 10 | Edge case register (every enum value, empty state, boundary and rule with the row that shows it) | S5; C4 Strong |
| 11 | Privacy declaration | G4 |
| 12 | Open questions | S6; C3 |
| 13 | Human gates and sign-off | Human gates 1–6 |

## How to use it

- **Viewing the ERD.** `03-erd.mmd` and the diagram inside `04-data-model.md` render on GitHub and in the IDE Markdown preview (with a Mermaid preview extension). The full diagram is wide; for reading and printing, `docs/word/data/erd-views/` has one picture per module.
- **Word copies.** `docs/word/data/` holds 01, 02, 04, 05 and the seed README as .docx, same content.
- **Regenerating the seed data.** `python3 data/seed/generate_seed.py` then `python3 data/seed/check_seed.py`. The check must print `PASS`. The generator is deterministic, so a clean `git status` after running it is the Session 6 smoke test T2.
- **Loading schema and seed (gate G3).** `python3 data/schema/load_check.py` runs every `schema-*.sql` on an empty SQLite database, then loads the seed files in filename order with foreign keys on; it must print `PASS`. Add `--postgres "<DSN>"` to run the same check on PostgreSQL.
- **Changing anything here.** Every file in this folder is generated (`tools/build_data.py`, `data/seed/generate_seed.py`, `tools/build_schema.py`, `tools/build_dm_docs.py`). Edit the source in `tools/` or `data/seed/`, then rebuild in the order of `tools/README.md`.
- **Human gates.** Files 01, 02, 04, 05 and every `data-model-<MODULE>.md` end with a signature line. The conflict and type decisions of 01/10/2026 are filled in as *Applied: …*; they still need the named person to confirm them.

## Four things to know before building

1. **Nothing is ever hard-deleted — decided.** Accounts are deactivated and anonymised (SYS BR-005), projects archived (M0 BR-005), legal rules retired (M2 BR-008), locations unpublished (M3 BR-008), organisations deactivated (M4 BR-008). Each end state is a status column, and the seed has a row in each. The audit log is append-only for every role (M10 BR-005).
2. **Every table has a writer and rows.** `location_query` (F-M3-11), `collab_message` (F-M4-14) and `project_glossary` (F-M5-04) are now written by a function, and M10 adds `moderation_item`, `audit_log` and `quarterly_report`. A moderation item points at an organisation *or* a location photo through two nullable foreign keys with a CHECK that exactly one is set — a deliberate choice instead of one polymorphic reference.
3. **Rule values are computed, never typed.** The generator calculates every value a business rule decides — attention level, finding spans, the latest readiness snapshot (M0 §9 formulas), `is_active`, `published` — and `seed_rules.py` refuses to write a file if any row breaks a rule. Rules that fit inside one row are also `CHECK` constraints in `schema/`.
4. **Enum values come from the specs.** Stages, statuses, scene types, the 12 service groups, topics and regions are declared in section 5.1 of the Spec Documents; `seed/README.md` lists them with their source. Location photos use `pending / approved / hidden` in both M3 and M10.
