# CINEMATCH — AI-ready Spec Package

CINEMATCH is a platform built with the Vietnam Film Development Association (VFDA) that helps international film producers prepare a shoot in Vietnam. It serves three audiences: foreign producers and production companies deciding whether and how to film here, Vietnamese service partners who want to be found by them, and VFDA staff who verify partners, publish locations and support the permit process. The platform answers the three questions a foreign producer cannot answer today — *where can I shoot this scene*, *who is the Vietnamese partner who can do this*, and *what do I have to file, and by when*.

This repository is not the software yet. It holds the textualized specification the build starts from (DBIZ3 Session 4), the data model and seed data derived from it (Session 5), and the agent contract and checks that prepare it for AI-assisted development (Session 6).

*DBIZ3 · VJCBI College – Foreign Trade University · Group C · 29/09/2026*

---

## 1. Repository structure

```
CINEMATCH-DBIZ3.TeamC/
├── README.md                  ← this file
├── AGENTS.md                  ← rules every AI agent follows in this repository
├── .gitignore  .gitattributes
├── docs/
│   ├── README.md              ← guide to the docs/ folder
│   ├── mvp-scope.md
│   ├── function-list.md
│   ├── screen-list.md
│   ├── architecture/
│   │   ├── context.md
│   │   ├── system-configuration.md
│   │   ├── usage-flow.md
│   │   ├── sequence-diagrams.md
│   │   └── use-case.md
│   ├── spec/
│   │   ├── README.md
│   │   ├── spec-document.md   ← index of the eight module specs
│   │   └── spec-SYS.md  spec-M0.md … spec-M7.md
│   ├── screens/
│   │   ├── README.md
│   │   ├── screen-spec-SC-01.md … screen-spec-SC-48.md
│   │   └── img/SC-01.png … SC-48.png
│   ├── word/                  ← Word copies for submission
│   │   ├── Session-01-MVP-Scope-GroupC.docx
│   │   ├── specs/  screens/  data/
│   └── env/
│       └── environment-readiness-report.md
├── data/
│   ├── README.md
│   ├── 01-entity-dictionary.md
│   ├── 02-crud-matrix.md
│   ├── 03-erd.mmd
│   ├── 04-data-model.md
│   ├── 05-review.md
│   └── seed/
│       ├── README.md  schema.json  generate_seed.py  check_seed.py
│       └── <table>.csv  (43 files)
└── tools/
    ├── check_env.py           ← Session 6 environment check
    └── build_docs.py, build_data.py, make_word.py, … (generators)
```

| Folder | What it holds | How many |
|---|---|---|
| `docs/` | MVP scope, the full Function List and Screen List, five textualized architecture diagrams | 95 subfunctions · 48 screens |
| `docs/spec/` | One Spec Document per module, plus an index | 8 specs · 95 functional requirements |
| `docs/screens/` | One Screen Spec and one annotated mockup per screen | 20 specs · 20 images |
| `docs/word/` | Word copies for submission — same content as the Markdown | 34 files + ERD views |
| `docs/env/` | Environment Readiness Report for Session 6 | 1 report |
| `data/` | Entity dictionary, CRUD matrix, conceptual ERD, logical model, review; seed data with its generator and integrity check | 47 entities · 43 tables · 374 seed rows |
| `tools/` | The environment check and the generators that rebuild `docs/`, `data/` and `docs/word/` | — |

Four rules govern the structure: one module per spec file, one screen per image file, DBIZ2 IDs reused unchanged, and everything text except the screen mockups. The data package adds one more: every entity, column and relationship cites the spec line it came from.

## 2. Naming convention

| Item | Pattern | Example |
|---|---|---|
| Module ID | `<AREA>` from the Subfunction ID prefix | `M3`, `M4`, `SYS` |
| Spec file | `spec-<MODULE-ID>.md` | `spec-M3.md` |
| Screen spec file | `screen-spec-<SCREEN-ID>.md` | `screen-spec-SC-14.md` |
| Mockup image | `<SCREEN-ID>.png` | `SC-14.png` |
| Subfunction (DBIZ2) | `F-<MODULE>-<nn>` | `F-M3-08` |
| Functional requirement | `FR-<nnn>`, restarting inside each spec file | `FR-008` |
| Screen-level rule | `SR-<nnn>` inside one screen spec | `SR-011` |
| Business rule | `BR-<nnn>` inside one spec file | `BR-003` |
| Success criterion | `SC-<nnn>` inside one spec file | `SC-002` |
| Entity / table | `UPPER_SNAKE`, singular; CSV file in lower case | `COLLAB_REQUEST` · `collab_request.csv` |
| Data-model citation | `<MODULE> §<section> <ID>` | `M3 §5.1 FR-008` |
| Open question | `[NEEDS CLARIFICATION: …]`, numbered per file | `OQ-04-6` |

Functional requirement IDs restart in every module, so always quote them with the file name: “`FR-008` in `spec-M3.md`”. Success criteria use the prefix `SC-` inside a spec file, while `SC-nn` in `docs/screen-list.md` and in file names is a Screen ID — the surrounding file tells you which is meant.

## 3. Reading order

| If you are | Read |
|---|---|
| Meeting the product for the first time | `docs/mvp-scope.md`, then this README |
| Reviewing what the system does | `docs/architecture/context.md` → `usage-flow.md` → `docs/function-list.md` |
| Building or reviewing one module | `docs/spec/spec-document.md` → the module's `spec-<MODULE>.md` → the Screen Specs it names in §7 |
| Building or reviewing one screen | `docs/screens/README.md` → `screen-spec-<ID>.md` → `img/<ID>.png` |
| Building the database or reviewing the data | `data/README.md` → `data/05-review.md` → `data/04-data-model.md` → `data/seed/` |
| Setting up your machine | `AGENTS.md` → `docs/env/environment-readiness-report.md` |
| Submitting or printing | `docs/word/` |

## 4. The IDs are the glue

Every document points back to the one above it, through IDs rather than prose.

| From | To | Looks like |
|---|---|---|
| MVP Scope §4 (MoSCoW) | a module | each feature names its module ID |
| Spec Document §5 (FR table) | Function List | the *DBIZ2 Subfunction ID* column — `FR-008` in `spec-M3.md` **is** `F-M3-08` |
| Spec Document §7 | Screen Specs | `docs/screens/screen-spec-SC-14.md` |
| Screen Spec §7 | Spec Document | `FR-008 · spec-M3.md (F-M3-08)` |
| Screen Spec §3 (Element inventory) | the mockup | orange badge **n** on the image is row **n** of the inventory |
| Spec Document §11 | DBIZ2 source | traceability table, cell and figure by cell and figure |
| Data model (01–04) | Spec Document | every entity, column and relationship cites `M3 §5.1 FR-008`, `M3 §6` or `M3 §5.2 BR-004` |
| Seed rows | Spec Document §3 | the coverage table in `data/seed/README.md` names the rows that make each user story runnable |

Because of this chain a reader can start anywhere — a badge on a picture, a row in the Function List, a line in the MVP scope — and reach every other document that concerns it.

## 5. Using the repository

**Viewing.** GitHub and VS Code (with the extension *Markdown Preview Mermaid Support*) render every Markdown file and every Mermaid diagram, including `data/03-erd.mmd`.

**Reading the mockups.** All 20 mockups follow a single fictional project, so the numbers on different screens can be checked against each other:

> *The Last Ferry* — Harbour Line Films (Korea), segment A (foreign production filming in Vietnam), first shooting day **15/03/2027**.
> Readiness **58 %** · safe submission deadline **27/01/2027** · best-matching location Tràng An, match score **91**.

Each orange numbered badge on an image is the row with the same number in section 3 of that screen's spec. Place names use the 34 provincial-level units that exist after the 2025 reorganisation.

**Commands** (run from the repository root; Python 3.10 or later):

| Purpose | Command |
|---|---|
| Check the machine and the repository (Session 6, T1) | `uv run tools/check_env.py --repo --path A` |
| Regenerate and check the seed data (Session 6, T2) | `python3 data/seed/generate_seed.py && python3 data/seed/check_seed.py` |
| Rebuild the Spec Documents and Screen Specs | `python3 tools/build_docs.py` |
| Rebuild the data model files | `python3 tools/build_data.py` |
| Rebuild the Word copies | `python3 tools/make_word.py` (needs `pandoc`) |

The generators are deterministic: running them on an unchanged repository leaves `git status` clean. **Do not edit `docs/word/` by hand** — change the Markdown source and rebuild.

**Working with AI agents.** Every agent reads `AGENTS.md` first. It names the sources of truth, the commands an agent may run, and the rules it must not break — above all, `docs/spec/`, `docs/screens/` and `data/` are read-only unless a person asks for a specific change.

## 6. What this package does and does not settle

The package was checked so that a reader can rely on it: all 95 Function List rows are covered by a functional requirement, all 256 callout badges match their inventory rows, every navigation target named in a Screen Spec exists in the Screen List, every input and output field has a type and a required mark, every diagram renders, and the seed data passes its integrity check.

Some things are open on purpose, and each is written down where it belongs rather than hidden:

- **48 blocking open questions** for VFDA, listed in section 10 of each Spec Document — scoring weights, the criteria behind *VFDA Verified*, whether the 20 days of Article 13 are calendar or working days, VFDA's mandate to notify Provincial People's Committees, and whether the content pre-check screens against Article 9 or Article 13.
- **39 data-model questions (17 blocking)**, consolidated in `data/05-review.md` — above all, what happens when an account, project or location is deleted, and the types of 70 columns the specs never declare.
- **Gaps in coverage:** no Screen Spec yet for the admin screens `SC-35`, `SC-36`, `SC-37`, and no Spec Document for module `M10`; modules `M6`, `M8`, `M9` are *Won't* for this release.
- **Human gates:** checklist items left unticked with their reason, the “Checked by a person” lines, and the *Decision* and *Resolution* columns of the data files are left for a person to fill.

Where the screen design differs from the DBIZ2 Function List, nothing was changed silently: every divergence is recorded in §11.1 *Reconciliation* of the module spec concerned.

## 7. Team and contact

| Role | Name |
|---|---|
| Group | DBIZ3 Group C, VJCBI College – Foreign Trade University |
| Repository owner and file owner (`AGENTS.md` §7) | Nam |
| Client | Vietnam Film Development Association (VFDA) |

---

Structure and naming follow the DBIZ3 Session 4 spec-package guide (VJCBI College – FTU, 2026), whose spec file structure derives from GitHub Spec Kit's `spec-template.md`. The repository layout follows the DBIZ3 Session 6 starter kit.
