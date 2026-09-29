# docs/ — Product documentation

This folder holds everything written about CINEMATCH before any code: what the MVP includes, what the system does, which screens it has, how it is put together, and the detailed specifications a developer or an AI agent builds from. The data model is not here; it lives in `../data/`.

## Contents

| Path | What it is | Session |
|---|---|---|
| [`mvp-scope.md`](mvp-scope.md) | MVP scope: problem, users, MoSCoW priorities by module, what is out of scope | 1 |
| [`function-list.md`](function-list.md) | Full Function List from System Design v2.0: 95 subfunctions with ID, module, priority and data types | 4 (Step 2) |
| [`screen-list.md`](screen-list.md) | Full Screen List: 48 screens, with the 20 priority screens marked (Tier 1: 17 · Tier 2: 3) | 4 (Step 2) |
| [`architecture/`](architecture/) | Five textualized diagrams (below) | 4 (Step 3) |
| [`spec/`](spec/) | One Spec Document per module, and the index [`spec/spec-document.md`](spec/spec-document.md) | 4 (Step 5) |
| [`screens/`](screens/) | 20 Screen Specs and their annotated mockups in `screens/img/` | 4 (Step 4) |
| [`word/`](word/) | Word copies of the MVP scope, specs, screen specs and data model, for submission | 4–5 |
| [`env/`](env/) | Environment Readiness Report | 6 |

### architecture/

| File | Diagram | Answers |
|---|---|---|
| [`context.md`](architecture/context.md) | System context | Who and what CINEMATCH talks to |
| [`system-configuration.md`](architecture/system-configuration.md) | System configuration | Which parts the system is made of and how they connect |
| [`usage-flow.md`](architecture/usage-flow.md) | Usage flow | The path each kind of user takes through the product |
| [`sequence-diagrams.md`](architecture/sequence-diagrams.md) | 12 sequence diagrams (`SEQ-01` …) | Who calls whom, in what order, for each key function |
| [`use-case.md`](architecture/use-case.md) | Use cases (structured table) | Which actor can do what |

All diagrams are Mermaid code inside Markdown, so they render on GitHub and in VS Code and can be read by an AI agent as text. The use cases are a structured table instead, because Mermaid has no UML use case diagram.

## How the documents connect

```
mvp-scope.md ──► function-list.md ──► spec/spec-<MODULE>.md ──► screens/screen-spec-<ID>.md ──► screens/img/<ID>.png
                       ▲                     │                          (badge n = inventory row n)
               screen-list.md                └──► ../data/ (entities, columns and relationships cite §5.1, §5.2, §6)
```

- A **Function List** row `F-M3-08` becomes `FR-008` in `spec/spec-M3.md`.
- A **Spec Document** names its screens in §7; each **Screen Spec** cites its requirements back in §7.
- The **architecture** diagrams are excerpted inside §4 of the Spec Documents, where each one is marked *Textualised*, *Excerpt* or *Derived*.

## Rules for this folder

- `function-list.md`, `screen-list.md`, `spec/` and `screens/` are the source of truth. AI agents read them and never edit them unless a person asks for a specific change (`../AGENTS.md`, rule 1).
- `word/` is generated from the Markdown by `../tools/make_word.py`. Change the Markdown, then rebuild; never edit a `.docx` by hand.
- Keep the file names exactly as they are: other documents link to them by path.
- Image names use a hyphen — `SC-14.png`, not `SC14.png` — or the mockups will not appear in the Screen Specs on GitHub.
