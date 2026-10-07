# Build Log

Course: DBIZ3 AI-native Product Development, Sessions 8 to 11
Team: `<team code>`    Product: `<product name>`

Save as `docs/build/build-log.md`. Add one entry for every agent run that created or changed a
file in `specs/`, `src/` (or your code folder) or `tests/`. Write it right after the run, not at
the end of the day. The build log is how the instructors, and your teammates, see what the agent
did and what the humans decided.

## 1. Features in progress

| Feature folder | Module | User stories in this slice | Owner | Branch | Status |
|---|---|---|---|---|---|
| `specs/001-<module>-core` | | US-1 (P1) | | | Planning, Tasks, Building, In review, Merged |

## 2. Run entries

Copy this block for each run. Keep the newest entry at the bottom.

### Entry `<n>`: `<dd/mm>` `<member>`

| Field | Value |
|---|---|
| Path and agent | A (Claude Code) / B (Antigravity agent, model `<name>`) |
| Command and argument | `/speckit-plan ...` (paste the argument you typed) |
| Feature and tasks | `specs/001-...`, tasks `T0xx` to `T0yy` |
| What the agent produced | files created or changed, one line each |
| Human review | Accepted / Changed / Rejected. What you changed and why |
| Tests | `<passed> passed, <failed> failed` (paste the last line of the test run) |
| Spec issues found | none / open question `<n>` added to `docs/spec/spec-<MODULE>.md` |
| Commit | `<first 7 characters of the hash>` |

## 3. Spec issues found while building

Every gap the build uncovers goes back to `docs/spec/` as an open question or a spec change. It
is never fixed silently in code.

| # | Found at (step, entry) | Issue | Where it went in the spec | Status |
|---|---|---|---|---|
| | | | | |

## 4. Agent mistakes worth remembering

Short notes for the team and for Session 10 (debugging and code review): what the agent got
wrong, how you noticed, and what you changed in the prompt, `AGENTS.md` or the constitution so it
does not happen again.

| Entry | What went wrong | How it was caught | Prevention |
|---|---|---|---|
| | | | |
