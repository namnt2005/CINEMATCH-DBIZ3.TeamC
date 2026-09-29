# data/ — Data model and seed data (Session 5)

This folder turns the eight Spec Documents in `docs/spec/` into a data model and executable mockup data. It follows the Session 5 prompt pack *From Spec to Data Model*: every entity, column and relationship cites the spec line it came from, and anything the specs do not settle is written as a `` question instead of being guessed.

The folder plays the role of `spec/data/` in the prompt pack. It sits at the repository root as `data/` because the Session 6 starter kit expects the data package there (Setup Guide, step C3).

| File | Step | What it answers |
|---|---|---|
| `01-entity-dictionary.md` | S0 + S1 | The INPUT MAP, then the 47 entities of the product, their owners and aliases, 10 implied but undeclared entities, 18 naming and ownership conflicts |
| `02-crud-matrix.md` | S2 | Which of the 95 functions create, read or update which entity — 141 rows, 34 anomalies |
| `03-erd.mmd` | S3 | The conceptual ERD: 43 stored entities, 60 relationships, each with a forward and a reverse sentence and a citation |
| `04-data-model.md` | S4 | The logical model: 285 columns with declared types, natural keys, 13 type conflicts, 26 structural findings |
| `05-review.md` | S6 | The 7-criterion review of the data model, with the minimum change proposed for each criterion |
| `seed/` | S5 | 43 CSV files (374 rows), the generator, the integrity check, and the scenario coverage table |

**Start here:** `05-review.md` for the verdict, then `03-erd.mmd` to see the shape, then `seed/README.md` to see the story in the data.

## How to use it

- **Viewing the ERD.** `03-erd.mmd` and the diagram inside `04-data-model.md` render on GitHub and in the IDE Markdown preview (with a Mermaid preview extension). The full diagram is wide; for reading and printing, `docs/word/data/erd-views/` has one picture per module.
- **Word copies.** `docs/word/data/` holds 01, 02, 04, 05 and the seed README as .docx, same content.
- **Regenerating the seed data.** `python3 data/seed/generate_seed.py` then `python3 data/seed/check_seed.py`. The check must print `PASS`. The generator is deterministic, so a clean `git status` after running it is the Session 6 smoke test T2.
- **Human gates.** Files 01, 02, 04 and 05 each end with a signature line. The *Decision* and *Resolution* columns are empty on purpose: naming, ownership and type conflicts are business decisions a person makes, not the model.

## Three things to know before building

1. **Nothing here deletes anything.** No function in the specs deletes a row. What happens when an account, project, location or organisation goes away is open — answer it before any table is built.
2. **Three tables are empty on purpose.** `location_query`, `collab_message` and `project_glossary` are declared in the specs but no function writes to them; the seed leaves them header-only rather than inventing behaviour.
3. **Values the spec never lists are proposals.** Service groups, scene types, project stages and a few more are used in the seed so rows can exist; they are listed in `seed/README.md` and need the owner's confirmation.
