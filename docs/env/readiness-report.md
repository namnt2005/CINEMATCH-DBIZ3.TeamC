# Environment Readiness Report — CINEMATCH, Team C

*DBIZ3 Session 6 · Filled in from each member's screenshots, 30/09–01/10/2026 · Owner: Nguyễn Trần Nam*

This report proves that every member of the team can open this repository, run the same tools and get the same answers from an AI agent. Evidence (screenshots) is in [`evidence/`](evidence/); each row names its file.

**Repository state tested.** The smoke tests were run on commit `be58046` (*chore: init Spec Kit and agent contract*, 30/09/2026), the last commit before the midterm fixes. At that commit the seed has **46 files, 423 records**. The fixes of 01/10/2026 (commit `69aac48`, merged as `47a4814`) renamed the seed files to `NN_<table>.csv` and raised the total to **427 records**; Nam re-ran T2 on `47a4814` on 01/10/2026 (section 4.1). The expected answers below give both values.

## 1. Setup path

> **Path A.** IDE: Antigravity IDE. Agents: Claude Code CLI (paid Claude plan) run in the Antigravity terminal, plus the Antigravity agent. Spec Kit v1.0.1 initialized with `--integration agy --script py --ignore-agent-tools`, then `specify integration install claude --script py --force`; skills in `.agents/skills/` and `.claude/skills/`. The always-on workspace rule `project-context` is in `.agents/rules/`. Claude Code reads `AGENTS.md` automatically; no `CLAUDE.md` exists. Antigravity permission policy: Default (sandbox) or Request Review, never Turbo. Claude Code runs in its default mode (asks before editing) and in Plan mode for T3.

> **Path B.** Antigravity IDE and its built-in agent only (no Claude Code). Used by Lê Mỹ Linh, Phạm Hà Chi and Trịnh Loan Trang, who do not have a paid Claude plan. `check_env.py` is run without `--path A`, and T3 is run in the Antigravity agent.

Nguyễn Huy Trung installed Claude Code (Path A check passes) but ran T3 in the Antigravity agent; both agents read the same `AGENTS.md`.

## 2. Tools installed (one row per member)

Versions copied from the output of `uv run tools/check_env.py --repo` (`--path A` for Path A).

| Member | OS | Path | Git | Python (via uv) | uv | Node | Spec Kit | Claude Code | Agent / model used for T3 | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| Nguyễn Trần Nam | macOS 26.5 (Darwin 25.5.0, arm64) | A | 2.55.0 | 3.14.7 | 0.12.18 | 26.0.0 ¹ | 1.0.1 | 2.1.284 | Claude Code, Plan mode | `evidence/nam-*.png` |
| Nguyễn Linh Chi | macOS 26.5 (Darwin 25.5.0, arm64) | A | 2.55.0 | 3.14.7 | 0.12.19 | 24.21.0 | 1.0.1 | 2.1.285 | Claude Code, Plan mode (`claude --permission-mode plan`) | `evidence/linhchi-*.png` |
| Nguyễn Huy Trung | Windows 11 (AMD64) | A | 2.55.0 | 3.14.7 | 0.12.18 | 24.19.0 | 1.0.1 | 2.1.281 | Antigravity agent, Gemini 3.8 Flash (High) | `evidence/trung-*.png` |
| Lê Mỹ Linh | Windows 11 (AMD64) | B | 2.55.0 | 3.14.7 | 0.12.19 | 24.19.0 | 1.0.1 | — (Path B) | Antigravity agent, Gemini 3.8 Flash (High) | `evidence/mylinh-*.png` |
| Phạm Hà Chi | macOS 14.6 (Darwin 23.6.0, x86_64) | B | 2.45.1 | 3.12.2 | 0.12.18 | 24.16.0 | 1.0.1 | — (Path B) | Antigravity agent, Gemini 3.8 Flash (High) | `evidence/hachi-*` |
| Trịnh Loan Trang | Windows 11 (AMD64) | B | 2.55.0 | 3.14.7 | 0.12.19 | 24.19.0 | 1.0.1 | — (Path B) | Antigravity agent, Gemini 3.6 Flash (High) | `evidence/trang-01.png` (first FAIL, `git init`), `trang-09.png` (T1 + T2), `trang-10`–`14.png` (T3) |
| Nguyễn Quốc Tuấn | not captured ² | — | — | — | — | — | — | — | — | none ² |

¹ The course recommends Node.js 24 LTS; 26.0.0 is newer and `check_env.py` passes it. Recorded as a known difference.
² Nguyễn Quốc Tuấn completed T1–T3 with the same results as Nam, as confirmed to the team owner on 01/10/2026, but kept no screenshot. His row stays *reported, no evidence* until he re-runs the three commands and adds `evidence/tuan-*.png`.

*Quota (`/usage`)* was not captured by any member; the Antigravity model is the one shown in the agent's model picker on each screenshot.

## 3. Repository check

| Check | Result | Evidence |
|---|---|---|
| Repository cloned from `github.com/namnt2005/CINEMATCH-DBIZ3.TeamC` | 5 of 6 members with evidence: **yes**. Trịnh Loan Trang: **no** — she downloaded the ZIP and ran `git init`, so her copy has no link to GitHub (section 5) | `git status` shows *up to date with 'origin/main'* on every other screenshot |
| `check_env.py --repo` shows no FAIL | **Yes, all 6** (`0 FAIL, 0 WARN. Ready.`) | `evidence/*-t1.png` |
| `.env` is ignored, no secret committed | **Yes** — `repo: .env ignored … secrets excluded` on every T1; `git log --all -p` scanned on 01/10/2026, no key, password or token found | T1 screenshots |
| `AGENTS.md` has no `<...>` left | **Yes** — no angle-bracket placeholder. §7 still names *Member 2/3/4* instead of people (to be filled by Nam) | `AGENTS.md` |

## 4. Smoke tests

| Test | What it proves | Pass condition |
|---|---|---|
| T1 | Tools and repository are in place | `check_env.py --repo` (`--path A` on Path A) shows no FAIL |
| T2 | Seed data is reproducible | `generate_seed.py` then `check_seed.py` prints `PASS`, then `git status` is clean |
| T3 | The agent reads the repository correctly | The guide's T3 prompt, pasted unchanged as a read-only task; answers match section 4.2 and `git status` is still clean |

### 4.1 Results per member

| Member | T1 | T2 | T3 |
|---|---|---|---|
| Nguyễn Trần Nam | **PASS** — 0 FAIL, 0 WARN (30/09) | **PASS** — 46 tables, 423 rows, `PASS`, tree clean (30/09). Re-run on `47a4814` (01/10): 46 tables, 427 rows, `PASS`, tree clean | **PASS** — 4/4 answers match; agent states it changed nothing |
| Nguyễn Linh Chi | **PASS** | **PASS** — 46 tables, 423 rows, `PASS` | **PASS** (reported) — two Plan-mode sessions, `git status` clean afterwards; the answer table itself was not captured |
| Nguyễn Huy Trung | **PASS** | **PASS** — 423 rows, `PASS`, tree clean | **PASS** — per-file counts and answers 3–4 match |
| Lê Mỹ Linh | **PASS** | **PASS** — 423 rows, `PASS`, tree clean | **PASS** — total 46 files, 423 records; answers 3–4 match |
| Phạm Hà Chi | **PASS** | **Re-run needed** — the screenshot shows `wrote 43 tables, 374 rows` and `PASS`, i.e. an older copy of the repository (before commit `6f4e993`); the clone was updated before T3 | **PASS** — 51 entities (46 + 5 derived), 46 files, 423 records; answers 3–4 match |
| Trịnh Loan Trang | **PASS** after a wrong fix — the first run failed with *run this from inside the team repository* (section 5) | **Incomplete** — `generate_seed.py` wrote 46 tables, 423 rows and the tree stayed clean, but `check_seed.py` was not run | **PASS** — 51 entities, per-file counts, answers 3–4 match |
| Nguyễn Quốc Tuấn | PASS (reported) | PASS (reported) | PASS (reported) |

### 4.2 T3 answer table

| Question in the T3 prompt | Expected (from the repository) | Nam | Linh Chi | Huy Trung | Mỹ Linh | Hà Chi | Loan Trang | Quốc Tuấn |
|---|---|---|---|---|---|---|---|---|
| 1. Entity names in section 5.1 of `docs/spec/spec-document.md` | 51 names, `USER_ACCOUNT` … `QUARTERLY_REPORT` (46 stored + 5 derived) | ✓ 51 (46 + 5) | ✓ (reported) | ✓ | ✓ | ✓ 51 (46 + 5) | ✓ 51 | ✓ (reported) |
| 2. Records per seed file under `data/` | At `be58046`: 46 CSV files, 423 records. Since `47a4814`: 46 files `NN_<table>.csv`, 427 records | ✓ 423 | ✓ (reported) | ✓ per file | ✓ 423 | ✓ 423 | ✓ per file | ✓ (reported) |
| 3. Business rule in section 6, in one sentence | CINEMATCH prepares and advises, but a person decides | ✓ | ✓ (reported) | ✓ | ✓ | ✓ | ✓ | ✓ (reported) |
| 4. First hard rule in `AGENTS.md` | "Never edit files under `docs/spec/`, `docs/screens/` or `data/` unless the human asks for that exact change in the current prompt." (since 01/10/2026 the rule adds: edit the generator source in `tools/` and rebuild) | ✓ | ✓ (reported) | ✓ | ✓ | ✓ | ✓ | ✓ (reported) |

**Disagreements between agents** (the repository wins):

- **Question 3, length of the answer.** Claude Code (Nam) and Gemini 3.8 Flash (Hà Chi) added the details of the principle (*a language model never ranks, approves or submits anything; sensitive data is protected in the database; nothing is hard-deleted*); the other agents gave the one sentence only. Not a contradiction: `docs/spec/spec-document.md` §6 opens with that sentence and lists the details in the rules below it. Accepted answer: the sentence.
- **Question 2, what counts as a seed file.** Claude Code listed the other files under `data/` (Markdown, `03-erd.mmd`, `schema.json`, the scripts) and excluded them; the Antigravity agents listed only `data/seed/*.csv`. Same totals. It also noted that a plain line count gives 469 lines = 423 records + 46 header rows, which confirms no record spans two lines.
- **Question 4, numbering.** Trịnh Loan Trang's agent quoted the rule with its list number (*"1. Never edit …"*); the text is identical.
- **Hà Chi T2 vs T3.** Her T2 printed 43 tables / 374 rows while her T3 agent counted 46 files / 423 records. Settled by the repository: 43 / 374 is the state before commit `6f4e993`; she pulled between the two tests. T2 is to be re-run.

## 5. Problems met and how they were fixed

| Member | Problem | Fix |
|---|---|---|
| Nam and the other Path A members | T3 in Claude Code stopped with *"Your organization has disabled Claude subscription access"*: the CLI was signed in to an organization (team) account whose admin had not enabled Claude Code | Signed out with `/logout`, then `/login` with the account whose plan includes Claude Code; T3 then ran in Plan mode |
| Trịnh Loan Trang | `check_env.py --repo` failed: *run this from inside the team repository*. The repository had been downloaded as a ZIP (folder `CINEMATCH-DBIZ3.TeamC-main`), which has no `.git` folder | Worked around with `git init` + `git commit`, after which T1 passed. **This is not the right fix:** the copy is not linked to GitHub and cannot pull or push. To do: `git clone https://github.com/namnt2005/CINEMATCH-DBIZ3.TeamC.git`, then re-run T1 and T2 (with `check_seed.py`) |
| Phạm Hà Chi | T2 ran on an out-of-date copy (43 tables, 374 rows) | `git pull` before T3. To do: re-run T2 on the current `main` (expected 46 tables, 427 rows, `PASS`) |
| Nguyễn Huy Trung | His Windows commit `140e26d` (*fix line endings on Windows*, GitHub account `khanhkg0102`) removed the executable bit from the six `.specify/scripts/bash/*.sh` files, and the merge commit `7739eab` added a nested copy of the repository as a submodule link `CINEMATCH-DBIZ3.TeamC` | Fixed by Nam in commit `47a4814`: link removed and ignored in `.gitignore`, script permissions restored. Windows members run `git config core.fileMode false` once and never clone the repository inside itself |
| Nguyễn Linh Chi | No screenshot of the T3 answer table | To do: re-open the session (`claude --resume 6cd14579-…`) and capture the table |
| Nguyễn Quốc Tuấn | No screenshots kept | To do: re-run T1–T3 and add `evidence/tuan-*.png` |

## 6. Sign-off

Each member ticks their own line after checking the row above; a tick means "my environment is ready for the build sessions".

| Member | Evidence complete | Ready | Date |
|---|---|---|---|
| Nguyễn Trần Nam | Yes | ☐ | 30/09/2026 (re-run 01/10/2026) |
| Nguyễn Linh Chi | T3 answer table missing | ☐ | 01/10/2026 |
| Nguyễn Huy Trung | Yes | ☐ | 01/10/2026 |
| Lê Mỹ Linh | Yes | ☐ | 01/10/2026 |
| Phạm Hà Chi | T2 to re-run | ☐ | 01/10/2026 |
| Trịnh Loan Trang | Re-clone, re-run T1–T2 | ☐ | 01/10/2026 |
| Nguyễn Quốc Tuấn | Screenshots missing | ☐ | 01/10/2026 |

Attachments: [`evidence/`](evidence/) — T1, T2 and T3 screenshots per member.
