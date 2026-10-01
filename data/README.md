# data/ — Data model and seed data (Session 5)

This folder turns the nine Spec Documents in `docs/spec/` (version of 30/09/2026) into a data model and executable mockup data. It follows the Session 5 prompt pack *From Spec to Data Model*: every entity, column and relationship cites the spec line it came from, and anything the specs do not settle is written as a `[NEEDS CLARIFICATION]` question instead of being guessed.

The folder plays the role of `spec/data/` in the prompt pack. It sits at the repository root as `data/` because the Session 6 starter kit expects the data package there (Setup Guide, step C3).

| File | Step | What it answers |
|---|---|---|
| `01-entity-dictionary.md` | S0 + S1 | The INPUT MAP, then the 51 entities of the product (46 stored, 5 derived), their owners and aliases, 11 implied but undeclared entities, 23 naming and ownership conflicts |
| `02-crud-matrix.md` | S2 | Which of the 104 functions create, read or update which entity — 167 rows, 24 anomalies |
| `03-erd.mmd` | S3 | The conceptual ERD: 46 stored entities, 66 relationships, each with a forward and a reverse sentence and a citation |
| `04-data-model.md` | S4 | The logical model: 312 columns with declared types, natural keys, 15 type conflicts, 33 structural findings |
| `05-review.md` | S6 | The 7-criterion review of the data model, and all 45 questions raised in 01–04: 35 open (14 blocking), 10 resolved by the specs of 30/09/2026 |
| `seed/` | S5 | 46 CSV files (423 rows), the generator, the integrity check, and the scenario coverage table |

**Start here:** `05-review.md` for the verdict, then `03-erd.mmd` to see the shape, then `seed/README.md` to see the story in the data.

## How to use it

- **Viewing the ERD.** `03-erd.mmd` and the diagram inside `04-data-model.md` render on GitHub and in the IDE Markdown preview (with a Mermaid preview extension). The full diagram is wide; for reading and printing, `docs/word/data/erd-views/` has one picture per module.
- **Word copies.** `docs/word/data/` holds 01, 02, 04, 05 and the seed README as .docx, same content.
- **Regenerating the seed data.** `python3 data/seed/generate_seed.py` then `python3 data/seed/check_seed.py`. The check must print `PASS`. The generator is deterministic, so a clean `git status` after running it is the Session 6 smoke test T2.
- **Human gates.** Files 01, 02, 04 and 05 each end with a signature line. The *Decision* and *Resolution* columns are empty on purpose: naming, ownership and type conflicts are business decisions a person makes, not the model.

## Three things to know before building

1. **Nothing is ever hard-deleted — decided.** Accounts are deactivated and anonymised (SYS BR-005), projects archived (M0 BR-005), legal rules retired (M2 BR-008), locations unpublished (M3 BR-008), organisations deactivated (M4 BR-008). Each end state is a status column, and the seed has a row in each. The audit log is append-only for every role (M10 BR-005).
2. **Every table has a writer and rows.** `location_query` (F-M3-11), `collab_message` (F-M4-14) and `project_glossary` (F-M5-04) are now written by a function, and M10 adds `moderation_item`, `audit_log` and `quarterly_report`. A moderation item points at an organisation *or* a location photo through two nullable foreign keys with a CHECK that exactly one is set — a deliberate choice instead of one polymorphic reference.
3. **Enum values come from the specs.** Stages, statuses, scene types, the 12 service groups, topics and regions are declared in section 5.1 of the Spec Documents; `seed/README.md` lists them with their source. Location photos use `pending / approved / hidden` in both M3 and M10.
