# AGENTS.md

Instructions for every AI coding agent working in this repository
(Antigravity agent, Claude Code, or any other tool). Humans: keep this file
short, factual and current. Replace every `<...>` before the first commit.

## 1. Project

- Product: `Cinematch`, team `Team C`, course DBIZ3, VJCBI College, Foreign Trade University.
- Current step of the course process: Environment setup (Session 6). Next step: `<step name>`.
- Source of truth for requirements: `docs/spec/` (Spec Document from Session 4).
- Source of truth for data: `data/` (data model and seed package from Session 5).

## 2. Tech stack

- Not decided yet. The stack is chosen at the Plan step (`/speckit-plan`).
- Until then: do not create application code, do not add dependencies, do not scaffold frameworks.

## 3. Commands that are safe to run

- `uv run tools/check_env.py --repo` : environment and repository check.
- `<seed command>` : regenerates the seed data; must finish with every integrity assertion passing.
- `git status`, `git diff` : always allowed.

## 4. Hard rules

1. Never edit files under `docs/spec/` or `data/` unless the human asks for that exact change in the current prompt.
2. Never invent requirements. If the spec is silent or ambiguous, stop and list the question.
3. Never put real personal data in the repository. Seed data is synthetic only.
4. Never write secrets (API keys, passwords, tokens) into any file. Secrets live in `.env`, which is git-ignored.
5. Never run `git push`, `git reset --hard`, `git clean` or delete files without asking first.
6. After any change, show the list of changed files and a one-line reason for each.
7. Change only the files the current task needs. Never reformat, rename or reorder files you were not asked to touch.

## 5. Repository map

| Path | Owner | Content |
|---|---|---|
| `docs/spec/` | humans | Spec Document (read-only for agents) |
| `data/` | humans | Data model, seed generator, seed files (read-only for agents) |
| `docs/env/` | humans | Environment Readiness Report |
| `.specify/` | Spec Kit | Templates, scripts, constitution |
| `.agents/` | Antigravity | Workspace rules and Spec Kit skills |
| `.claude/` | Claude Code | Spec Kit skills (Path A members only) |
| `tools/` | humans | Helper scripts |

## 6. Conventions

- Start every task from an up-to-date main: `git switch main`, `git pull`, then a new branch.
- Branch names: `<member>/<short-topic>`, for example `an/env-setup`.
- One owner per shared file (see section 7). Others propose changes to that file through a pull request.
- Commit messages: `type: summary` where type is one of `feat`, `fix`, `docs`, `chore`, `test`.
- Language: code, comments and commit messages in English.

## 7. File owners

| File or folder | Owner (member) |
|---|---|
| `AGENTS.md` | `Nam` |
| `docs/spec/` | `Nam` |
| `data/` | `Nam` |
