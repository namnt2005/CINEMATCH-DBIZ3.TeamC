# Environment Readiness Report — CINEMATCH, Team C

*DBIZ3 Session 6 · Filled in by each member after finishing the Setup Guide · Owner: Nam*

This report proves that every member of the team can open this repository, run the same tools and get the same answers from an AI agent. Fill in the `…` cells; leave nothing blank — write `n/a` and a reason instead.

## 1. Setup path

> **Path A, VS Code.** IDE: Visual Studio Code with the Claude Code extension, instead of Antigravity IDE. Agent: Claude Code (paid plan). Spec Kit initialized with `--integration claude --script py`; skills installed in `.claude/skills/`. The agent contract is `AGENTS.md`, read automatically by Claude Code, so no IDE-specific rule file was created and no `CLAUDE.md` exists. Permission policy: Initial Permission Mode set to `plan`; project-level `defaultMode` set to `default` (Manual) with deny rules committed in `.claude/settings.json`; Bypass Permissions never used.

Members on another path (B: Antigravity, C: other) write one line here saying which path and why.

## 2. Tools installed (one row per member)

Copy the versions from the output of `uv run tools/check_env.py --repo --path A`.

| Member | OS | Path | Git | Python | uv | Node | Spec Kit | VS Code | Claude Code | Model (`/model`) | Quota (`/usage`) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Nam | macOS … | A | … | … | … | … | 1.0.1 | … | … | … | … |
| … | … | … | … | … | … | … | … | … | … | … | … |

## 3. Repository check

| Check | Result | Evidence |
|---|---|---|
| Repository cloned from `github.com/namnt2005/CINEMATCH-DBIZ3.TeamC` | … | `git remote -v` |
| `check_env.py --repo` shows no FAIL | … | screenshot `check-env-<member>.png` |
| `.env` is ignored, no secret committed | … | `git check-ignore .env` prints `.env` |
| `AGENTS.md` has no `<...>` left | … | — |

## 4. Smoke tests

| Test | What it proves | Pass condition | Result per member |
|---|---|---|---|
| T1 | Tools and repository are in place | `check_env.py --repo --path A` shows no FAIL | … |
| T2 | Seed data is reproducible | `python3 data/seed/generate_seed.py && python3 data/seed/check_seed.py` prints `PASS`, then `git status` is clean | … |
| T3 | The agent reads the repository correctly | The guide's T3 prompt, pasted unchanged in Plan mode; answers match the table below and `git status` is still clean | … |

### T3 answer table

| Question in the T3 prompt | Expected (from the repository) | Nam | … |
|---|---|---|---|
| Number of entities | 47 (43 stored tables) — `data/01-entity-dictionary.md`, `data/04-data-model.md` | … | … |
| Number of seed rows | 374 across 43 CSV files — `data/seed/` | … | … |
| … | … | … | … |

**Disagreements between agents** (the repository wins; write what differed and which file settled it):

- …

## 5. Problems met and how they were fixed

| Member | Problem | Fix |
|---|---|---|
| … | … | … |

## 6. Sign-off

| Member | Ready to start Session 7 | Date |
|---|---|---|
| Nam | ☐ | … |
| … | ☐ | … |

Attachments: `check_env.py` screenshot per member, `/model` and `/usage` values, the T3 answer table.
