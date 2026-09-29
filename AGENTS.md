# AGENTS.md

Instructions for every AI coding agent working in this repository
(Claude Code, Antigravity agent, or any other tool). Humans: keep this file
short, factual and current.

## 1. Project

- Product: `CINEMATCH`, team `Team C`, course DBIZ3, VJCBI College, Foreign Trade University. Client: Vietnam Film Development Association (VFDA).
- Current step of the course process: Environment setup (Session 6). Next step: `Specify and Clarify with Spec Kit (Session 7), then Plan (/speckit-plan)`.
- Source of truth for requirements: `docs/spec/` (Spec Documents from Session 4). Start from `docs/spec/spec-document.md`, which indexes the eight module files.
- Source of truth for screens: `docs/screens/` (Screen Specs and mockups from Session 4).
- Source of truth for data: `data/` (data model and seed package from Session 5).

## 2. Tech stack

- Not decided yet. The stack is chosen at the Plan step (`/speckit-plan`).
- Until then: do not create application code, do not add dependencies, do not scaffold frameworks.

## 3. Commands that are safe to run

- `uv run tools/check_env.py --repo --path A` : environment and repository check (Path A = VS Code + Claude Code).
- `python3 data/seed/generate_seed.py && python3 data/seed/check_seed.py` : regenerates the seed data; must end with `PASS` and leave `git status` clean.
- `git status`, `git diff` : always allowed.

## 4. Hard rules

1. Never edit files under `docs/spec/`, `docs/screens/` or `data/` unless the human asks for that exact change in the current prompt.
2. Never invent requirements. If the spec is silent or ambiguous, stop and list the question.
3. Never put real personal data in the repository. Seed data is synthetic only.
4. Never write secrets (API keys, passwords, tokens) into any file. Secrets live in `.env`, which is git-ignored.
5. Never run `git push`, `git reset --hard`, `git clean` or delete files without asking first.
6. After any change, show the list of changed files and a one-line reason for each.
7. Change only the files the current task needs. Never reformat, rename or reorder files you were not asked to touch.
8. Never edit generated files (`docs/word/`, `.specify/`, `.claude/skills/`) by hand. `docs/word/` is rebuilt by `tools/make_word.py`.

## 5. Repository map

| Path | Owner | Content |
|---|---|---|
| `README.md` | humans | Introduction to the repository and how to use it |
| `AGENTS.md` | humans | This file: the contract for AI agents |
| `.gitignore`, `.gitattributes` | humans | Files Git ignores; line-ending rules for a mixed macOS/Windows team |
| `docs/README.md` | humans | Guide to the `docs/` folder |
| `docs/mvp-scope.md` | humans | MVP scope and MoSCoW priorities (Session 1) |
| `docs/function-list.md` | humans | Full Function List: 95 subfunctions (read-only for agents) |
| `docs/screen-list.md` | humans | Full Screen List: 48 screens (read-only for agents) |
| `docs/architecture/` | humans | Context, system configuration, usage flow, sequence diagrams, use cases |
| `docs/spec/` | humans | Spec Documents, one per module, and the index `spec-document.md` (read-only for agents) |
| `docs/screens/` | humans | 20 Screen Specs and their mockups in `img/` (read-only for agents) |
| `docs/word/` | generated | Word copies for submission, rebuilt by `tools/make_word.py` |
| `docs/env/` | humans | Environment Readiness Report (Session 6) |
| `data/` | humans | Data model, seed generator, seed files (read-only for agents) |
| `tools/` | humans | `check_env.py` and the generators that rebuild `docs/` and `data/` |
| `.specify/` | Spec Kit | Templates, scripts, constitution (created in step C5) |
| `.claude/` | Claude Code | Spec Kit skills and shared settings (created in step C5) |
| `.agents/rules/` | humans | Always-on workspace rule pointing to this file (created in step C6) |

## 6. Conventions

- Start every task from an up-to-date main: `git switch main`, `git pull`, then a new branch.
- Branch names: `<member>/<short-topic>`, for example `nam/env-setup`.
- One owner per shared file (see section 7). Others propose changes to that file through a pull request.
- Commit messages: `type: summary` where type is one of `feat`, `fix`, `docs`, `chore`, `test`.
- Language: code, comments and commit messages in English.

## 7. File owners

| File or folder | Owner (member) |
|---|---|
| `AGENTS.md` | `Nam` |
| `docs/spec/` | `Nam` |
| `docs/screens/` | `Nam` |
| `data/` | `Nam` |
| `docs/env/` | `Nam` |
