# Integration and Test Plan

Course: DBIZ3 Session 10    Team: Team C    Product: CINEMATCH
Owner: Trịnh Loan Trang    Draft: 28/10/2026

## 1. What is tested, at which level

| Level | What | Where | Run with |
|---|---|---|---|
| Data | Schema, seed, keys, business-rule checks on the data | `data/seed/check_seed.py`, `data/schema/load_check.py` | `python3 …` |
| Unit | One function, one business rule (e.g. scoring weights, BR-003 neutrality) | `tests/unit/` | `npm test` |
| Contract | The fields one side sends and the other side accepts (see `integration-contract.md`) | `tests/contracts/` | `npm test` |
| End-to-end | A user story through the browser on the seed data (demo path) | manual script in §4, later Playwright | by hand, two members |

Rule: every test name cites the FR or BR it checks. A test without an identifier does not count.

## 2. Integration order

Modules are joined in the build order: M3 → SYS → M1 → M0 → M7 → M4 → M2 → M5 → M10.
After each module is merged, run the whole suite on `main`; the first green run after each merge is tagged
(`mvp-alpha` after M3, `v0.1-integration` after the first cross-module interface I-2 works).

## 3. Entry and exit criteria

| | Criterion |
|---|---|
| Entry (start integrating a module) | Its own unit tests pass; its spec snapshot `--check` is OK; its interface rows exist in `integration-contract.md` |
| Exit (merge to `main`) | Full suite `# fail 0`; contract tests for each new interface (≥4: normal, two boundaries, one failure); PR reviewed by a member who did not write it; build log and AI Use Log rows written |

## 4. End-to-end script — M3 US-1 (MVP Alpha demo path)

1. `npm run dev`, open http://localhost:3000.
2. Go to *Describe a scene* (`/locations/match`), type `a misty river between limestone karsts at dawn, 30 crew, September`.
3. Expected: *What the system understood* shows scene types karst and river, crew 15–50, month 9.
4. Confirm. Expected: `/locations` lists cards ranked by score, each with at least one reason; no card below 40.
5. Copy the URL into a new tab. Expected: the same filters and results (F-M3-07).

## 5. Defects

Every failure found in integration becomes a GitHub Issue with: title `[Sender→Receiver] symptom`, steps, expected (with FR/BR), actual, environment (branch @ commit), interface ID, owner, reviewer, severity. The fixing PR closes the issue.

## 6. Environments

| Name | Database | Language model | Who uses it |
|---|---|---|---|
| Local | `node:sqlite` from `data/seed/` | `LLM_PROVIDER=mock` | every member, every test run |
| Preview | Supabase project *cinematch-dev* | Gemini free tier, synthetic text only | PR reviewers (Vercel preview link) |
| Production | Supabase project *cinematch-prod* | Gemini paid tier | launch |
