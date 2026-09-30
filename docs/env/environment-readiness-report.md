# Environment Readiness Report — CINEMATCH, Team C

*DBIZ3 Session 6 · Filled in by each member after finishing the Setup Guide · Owner: Nam*

This report proves that every member of the team can open this repository, run the same tools and get the same answers from an AI agent. Fill in the `…` cells; leave nothing blank — write `n/a` and a reason instead.

## 1. Setup path

> **Path A.** IDE: Antigravity IDE. Agents: Claude Code CLI (paid Claude plan) run in the Antigravity terminal, plus the Antigravity agent. Spec Kit v1.0.1 initialized with `--integration agy --script py --ignore-agent-tools`, then `specify integration install claude --script py --force`; skills in `.agents/skills/` and `.claude/skills/`. The always-on workspace rule `project-context` is in `.agents/rules/`. Claude Code reads `AGENTS.md` automatically; no `CLAUDE.md` exists. Antigravity permission policy: Default (sandbox) or Request Review, never Turbo. Claude Code runs in its default mode (asks before editing) and in Plan mode for T3.

Members on another path (B: Antigravity, C: other) write one line here saying which path and why.

## 2. Tools installed (one row per member)

Copy the versions from the output of `uv run tools/check_env.py --repo --path A`.

| Member | OS | Path | Git | Python | uv | Node | Spec Kit | Antigravity | Claude Code | Models seen (picker / `/model`) | Quota (`/usage`) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Nam | macOS 26.5 (Apple Silicon) | A | 2.55.0 | 3.14.7 (via uv) | 0.12.18 | 26.0.0 ¹ | 1.0.1 | installed | 2.1.281 | … | … |
| … | … | … | … | … | … | … | … | … | … | … | … |

¹ The course recommends Node.js 24 LTS; 26.0.0 is newer and `check_env.py` passes it. Recorded here as a known difference.

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
| 1. Entity names in section 5.1 of `docs/spec/spec-document.md` | 51 names, `USER_ACCOUNT` … (46 stored + 5 derived) | … | … |
| 2. Records per seed file under `data/` | 46 CSV files, 423 records in total (no file is empty) | … | … |
| 3. Business rule in section 6, in one sentence | CINEMATCH prepares and advises, but a person decides | … | … |
| 4. First hard rule in `AGENTS.md` | "Never edit files under `docs/spec/`, `docs/screens/` or `data/` unless the human asks for that exact change in the current prompt." | … | … |

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
