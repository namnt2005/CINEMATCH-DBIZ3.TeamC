# tools/ — Environment check and document generators

Two kinds of script live here.

1. **`check_env.py`** — the Session 6 starter-kit check. Every member runs it; it needs only `uv`.
2. **The generators** — the scripts that produce `docs/spec/`, `docs/screens/`, `docs/mvp-scope.md`, `data/` and `docs/word/` from one set of source data. You need them only when you want to **rebuild** those files. Nobody needs them for Session 6.

## 1. Environment check (every member)

```bash
uv run tools/check_env.py --repo --path A     # Path A (Claude Code). Path B: leave out --path A
```

Every line must show `PASS` (smoke test T1).

## 2. Seed data (every member, smoke test T2)

The seed generator lives with the data, not here:

```bash
python3 data/seed/generate_seed.py && python3 data/seed/check_seed.py
git status        # must show no changed file
```

## 3. Rebuilding the documents (optional)

### What to install once (macOS)

| Program | Needed by | Install |
|---|---|---|
| Python 3.10 or later | all generators | already there through `uv`; or `brew install python` |
| `python-docx` | `make_word.py`, `fill_mvp_docx.py` | `python3 -m pip install python-docx` |
| pandoc | `make_word.py` | `brew install pandoc` |
| mermaid-cli (`mmdc`) | `--mermaid` checks, `make_erd_views.py` | `npm install -g @mermaid-js/mermaid-cli` |
| Google Chrome | used by mermaid-cli | already installed; found automatically |
| Playwright | only `build_docs.py --img` (redraws the mockups) | `python3 -m pip install playwright` |

Paths are found automatically on macOS, Windows and Linux (`toolpaths.py`). To force one, set `CHROME_PATH`, `MMDC_PATH` or `PANDOC_PATH`.

### Commands (run from the repository root, in this order)

| Step | Command | Writes |
|---|---|---|
| 1 | `python3 tools/build_docs.py --mermaid` | `docs/spec/spec-*.md`, `docs/screens/screen-spec-*.md`, `docs/mvp-scope.md` |
| 1b | `python3 tools/build_index.py` | `docs/spec/spec-document.md`, `docs/spec/README.md`, `docs/screens/README.md` (run after step 2 as well) |
| 2 | `python3 tools/build_data.py --mermaid` | `data/01`–`05`, `data/03-erd.mmd`, `data/seed/schema.json` |
| 3 | `python3 tools/make_erd_views.py` | `docs/word/data/erd-views/erd-*.png` |
| 4 | `python3 tools/make_word.py` | every `.docx` in `docs/word/` except Session 1 |
| 5 | `python3 tools/fill_mvp_docx.py <course template .docx> docs/word/Session-01-MVP-Scope-GroupC.docx` | the Session 1 Word copy (needs the course's *Session-01-MVP-Scope-Template.docx*) |

`--mermaid` also checks that every diagram renders; leave it out if mermaid-cli is not installed.
The generators are deterministic: on an unchanged repository they leave `git status` clean.

**Not generated — edit these by hand:** `README.md`, `AGENTS.md`, every `README.md` inside a folder, `docs/spec/spec-document.md`, `docs/function-list.md`, `docs/screen-list.md`, `docs/architecture/*.md`, `docs/env/`.

## 4. Files in this folder

| File | Role |
|---|---|
| `check_env.py` | Session 6 environment and repository check (starter kit — do not edit) |
| `build_docs.py` | Writes the Spec Documents, Screen Specs and MVP scope, and checks their cross-references |
| `specs_a.py`, `specs_b.py`, `specs_c.py` | Source data of the nine Spec Documents (`specs_c.py` = M10) |
| `s1_en.py` … `s7_en.py` | Source data of the 41 Screen Specs and mockups (`s4`–`s7` added 30/09/2026) |
| `check_screens.py` | Checks one screen-data file (badges, states, navigation, FR IDs) and renders it to a scratch folder |
| `build_index.py` | Writes `docs/spec/spec-document.md` (Spec Index), `docs/spec/README.md` and `docs/screens/README.md` |
| `_srcedit.py` | Small helper used to append items to the spec source lists |
| `base.py` | Mockup drawing helpers (used with `--img`) |
| `mvp.py` | Source data of the MVP scope |
| `build_data.py` | Writes the Session 5 data-model files |
| `dm_model.py`, `dm_model2.py` | Source data of the data model (entities, columns, relationships) |
| `make_erd_views.py` | One ERD picture per module, for the Word copies |
| `make_word.py`, `fill_mvp_docx.py` | Word copies |
| `toolpaths.py` | Finds Chrome, mermaid-cli and pandoc on any operating system |
| `check_en.py` | Checks that generated text is English only |

Open questions stay in the documents as `[NEEDS CLARIFICATION: …]` with an owner (Spec Document §10, Screen Spec §9, `data/05-review.md`).
