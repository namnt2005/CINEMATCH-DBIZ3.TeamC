# Build Log

Course: DBIZ3 AI-native Product Development, Sessions 8 to 11
Team: Team C    Product: CINEMATCH

Save as `docs/build/build-log.md`. Add one entry for every agent run that created or changed a
file in `specs/`, `src/` (or your code folder) or `tests/`. Write it right after the run, not at
the end of the day. The build log is how the instructors, and your teammates, see what the agent
did and what the humans decided.

## 1. Features in progress

| Feature folder | Module | User stories in this slice | Owner | Branch | Status |
|---|---|---|---|---|---|
| `specs/001-m3-core` | M3 (Location Discovery) | US-1 (P1 primary scope, MVP); US-2 (P2 optional scope for this slice) | Nam Tran | `001-m3-core` | US-1 built (T001–T027); US-2 open (T028–T042) |

> **Note on Scope & Priority (I1)**: User Story US-2 is classified as P1 in the source specification (`docs/spec/spec-M3.md`). For this M3 thin vertical slice, US-2 is treated as P2 optional scope (time permitting) in `plan.md` and `tasks.md` to ensure US-1 delivers an independent, demonstrable MVP without blocker dependencies. The source specification's original priority (P1) is preserved and remains unchanged unless formal team approval is granted.

## 2. Run entries

### Entry 1: 12/10/2026 Nam Tran

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent) |
| Command and argument | `/speckit-plan`, `/speckit-tasks`, `/speckit-analyze` |
| Feature and tasks | `specs/001-m3-core`, tasks `T001` to `T042` |
| What the agent produced | `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/`, `tasks.md`, `build-log.md` |
| Human review | Accepted. Refined `tasks.md` to establish test-first ordering for every business rule and acceptance scenario; confirmed non-blocking status for workstation environment checks. |
| Tests | `SQLite PASS — 9 schema files, 46 tables created; 46 seed files, 427 rows loaded in filename order; no foreign-key error` |
| Spec issues found | I1 (US-2 P2 slice priority vs spec P1), A1 (scoring weights open question), A2 (contact verification cadence open question), S1 (tooling choices pending team confirmation). |
| Commit | `af34933` on `001-m3-core` (all four entries were committed together on 12/10/2026) |

### Entry 2: 12/10/2026 Nam Tran

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent) |
| Command and argument | `/speckit-implement` (Setup, Foundational, and US-1 test tasks T001 to T018; no US-1 code written) |
| Feature and tasks | `specs/001-m3-core`, tasks `T001` to `T018` |
| What the agent produced | `package.json`, `.env.example`, `config/scene-catalog.json`, `lib/db/client.js`, `lib/db/locations.js`, `lib/auth/session.js`, `tests/foundational/seed-verification.test.js`, `tests/unit/auth-session.test.js`, and 11 US-1 test files in `tests/contracts/` and `tests/unit/` |
| Human review | Accepted. TDD Red phase: Foundational tests pass (8 passed); all 11 US-1 tests fail as expected because no implementation code (T019-T027) was written yet. |
| Tests | `8 passed, 11 failed` (`npm test`) |
| Spec issues found | none |
| Commit | `af34933` on `001-m3-core` (all four entries were committed together on 12/10/2026) |

### Entry 3: 12/10/2026 Nam Tran

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent) |
| Command and argument | `/speckit-implement` (US-1 implementation tasks T019 to T027) |
| Feature and tasks | `specs/001-m3-core`, tasks `T019` to `T027` |
| What the agent produced | `lib/catalog/validator.js`, `lib/scoring/engine.js`, `lib/db/search.js`, `lib/db/queries.js`, `app/api/locations/extract-scene/route.js`, `app/api/locations/search/route.js`, `app/locations/use-filter-state.js`, `app/locations/match/page.js`, `app/locations/page.js` |
| Human review | Accepted. TDD Green phase: All 31 tests across 13 suites pass. US-1 MVP fully functional and verified independently. |
| Tests | `31 passed, 0 failed` (`npm test`) |
| Spec issues found | none |
| Commit | `af34933` on `001-m3-core` (all four entries were committed together on 12/10/2026) |

### Entry 4: 12/10/2026 Nam Tran

| Field | Value |
|---|---|
| Path and agent | B (Antigravity agent) |
| Command and argument | Tooling configuration and run: Next.js App Router (Node 24 LTS, Next.js 14.2.35, React 18.3.1) |
| Feature and tasks | `specs/001-m3-core`, App Router configuration, dependencies, and local dev server |
| What the agent produced | `package.json` (recorded next/react/react-dom), `next.config.mjs`, `app/layout.js`, `app/page.js`, `.gitignore` (`.next/`) |
| Human review | Accepted. Dependencies installed cleanly without peer conflicts. All 31 tests pass. Dev server starts and serves HTTP 200 on all endpoints. |
| Tests | `31 passed, 0 failed` (`npm test`) |
| Spec issues found | none |
| Commit | `af34933` on `001-m3-core` (all four entries were committed together on 12/10/2026) |

### Entry 5: 28/10/2026 Nam Tran

| Field | Value |
|---|---|
| Path and agent | Claude (Cowork), reviewed by Nam Tran |
| Command and argument | Apply the 28/10/2026 decisions on blocking open questions (no Spec Kit command) |
| Feature and tasks | `specs/001-m3-core` (spec snapshot refreshed); all nine Spec Documents |
| What the agent produced | `tools/decisions.py` (new) and `tools/build_docs.py` (Clarifications section); `tools/specs_a.py`, `specs_b.py`, `s1_en.py`–`s3_en.py`, `dm_model2.py`, `data/seed/generate_seed.py` edited, then `docs/spec/`, `docs/screens/`, `data/` rebuilt; `lib/scoring/engine.js` weights; `tests/unit/scoring-weights.test.js` (new); `plan.md`, `research.md`, `quickstart.md`, `AGENTS.md`, constitution v2.0.0 |
| Human review | Pending — review on the pull request `docs/gd3-decisions-alignment`. |
| Tests | `36 passed, 0 failed` (`npm test`); seed check PASS; load check PASS; `next build` OK |
| Spec issues found | 22 stale field names in screen specs fixed at the source; `docs/function-list.md` row 48 restored to the DBIZ2 original (the change is recorded in spec-M3 §11.1 instead) |
| Commit | *(fill in after commit)* |

## 3. Spec issues found while building

Every gap the build uncovers goes back to `docs/spec/` as an open question or a spec change. It
is never fixed silently in code.

| # | Found at (step, entry) | Issue | Where it went in the spec | Status |
|---|---|---|---|---|
| 1 | Step 3, Entry 1 | Priority notation divergence (I1): US-2 is treated as P2 optional scope for this M3 thin vertical slice to ensure US-1 is demonstrable independently, while preserving US-2 (P1) in `docs/spec/spec-M3.md` unless team approves changing source spec. | `docs/spec/spec-M3.md` retains US-2 (P1); `plan.md` and `tasks.md` track P2 optional. | Resolved for this slice. |
| 2 | Step 3, Entry 1 | Scoring criteria weights (A1): FR-008 scoring function criteria weights marked `[NEEDS CLARIFICATION]`. Open question with VFDA. | `docs/spec/spec-M3.md` §5.1 / `plan.md` Open Question #1. | Decided 28/10/2026 (provisional): scene fit 35, season 15, crew 15, logistics 15, permit 10, availability 10 — spec-M3 Clarifications Q1; engine and test updated (Entry 5). |
| 3 | Step 3, Entry 1 | Local authority contact re-verification interval (A2): BR-004 12-month re-verification policy marked `[NEEDS CLARIFICATION]`. | `docs/spec/spec-M3.md` §5.2 / `plan.md` Open Question #2. | Open — planned follow-up with VFDA in Session 11. Interim: existing seed `verified_at` metadata used. |
| 4 | Step 3, Entry 1 | Tooling & stack choices pending team confirmation (S1): Next.js router paradigm, language (TS vs JS), test runner, and LLM vendor need team decision. | `plan.md` §Decisions Requiring Team Confirmation & `AGENTS.md` §2. | Resolved 28/10/2026: App Router, JavaScript, Node test runner, Google Gemini (mock fallback) — `plan.md` §Decisions and `AGENTS.md` §2. |

## 4. Agent mistakes worth remembering

| Entry | What went wrong | How it was caught | Prevention |
|---|---|---|---|
| Entry 1 | Initial draft of `tasks.md` placed domain scoring implementation in Foundational phase before unit test tasks in US-1 phase. | Caught during Step 3 checklist review against Constitution Principle II. | Ensure all business rule and acceptance scenario tests strictly precede implementation tasks in execution order. |
