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
| `specs/001-m3-core` | M3 (Location Discovery) | US-1 (P1 primary scope, MVP); US-2 (P2 optional scope for this slice) | Nam Tran | `001-m3-core` (US-1), `001-m3-core-us2` (US-2) | US-1 built (T001–T027, card name clamp T043–T044); US-2 built (T028–T038, T045–T046); Gemini extractor for F-M3-11 and SC-15 fixes (T047–T050); Polish T039–T041 done, T042 open |

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
| Commit | `65d5c5e` on `docs/gd3-decisions-alignment` |

### Entry 6: 30/10/2026 Nam Tran

| Field | Value |
|---|---|
| Path and agent | Claude Code (VS Code extension), run by Nam Tran |
| Command and argument | Plan mode to align US-2 tasks with the 28/10 Clarifications; `/speckit-implement` for the US-2 test tasks (T028–T032, T043, T045), then the US-2 implementation (T033–T038, T044, T046) in reviewed steps; closing checks `npm test`, `npm run build`, `uv run tools/start_feature.py --check`, `python3 tools/check_env.py --repo`, `python3 data/schema/load_check.py` |
| Feature and tasks | `specs/001-m3-core`, tasks `T028` to `T046` (T042 still open) |
| What the agent produced | Code: `app/api/locations/[slug]/route.js`, `app/api/locations/[slug]/authority-contact/route.js`, `app/locations/[slug]/page.js`, `app/locations/[slug]/location-photo.js`, `app/components/map/location-map.js`, `app/locations/card-styles.js`, `lib/db/location-detail.js`, `lib/db/contacts.js`, `lib/db/nearby.js`, `lib/locations/season-facts.js`, `lib/api/errors.js` (new); `lib/auth/session.js`, `lib/db/locations.js`, `app/locations/page.js`, `package.json` (Leaflet 1.9.4) edited. Tests: `tests/contracts/location-detail.test.js`, `location-detail-nearby.test.js`, `authority-contact.test.js`, `tests/unit/contact-verification.test.js`, `contact-rls.test.js`, `nearby-locations.test.js`, `season-facts.test.js`, `season-facts-vi.test.js`, `card-name-clamp.test.js` (new); `tests/unit/auth-session.test.js` extended. Docs: `tasks.md`, `plan.md`, `contracts/location-detail-and-contact.contract.md` |
| Human review | Accepted by Nam Tran, who reviewed each step in the session. Decisions: `rainy_months` `[]` = no rainy month, `null` = no data yet (same as `months_to_avoid`), `engine.js` unchanged; contact endpoint keeps `/authority-contact`; contacts go to every signed-in role (member, partner, vfda_staff, vfda_legal, admin; SYS Clarifications Q1); SC-16 labels in Vietnamese; seed long names kept as an edge case. |
| Tests | TDD Red: `64 tests, 36 passed, 28 failed` (all new tests failing on missing modules). Final: `75 passed, 0 failed` across 23 suites (`npm test`); `next build` OK; `start_feature.py --check` OK; `check_env.py --repo` 0 FAIL, 1 WARN (uncommitted changes); `load_check.py` SQLite PASS |
| Spec issues found | Rows 5–9 of section 3 |
| Commit | `95be8be`, `ac5e04e` and `cc097b4` on `001-m3-core-us2`, merged by pull request #6 (`933dfac`) |

### Entry 7: 30/10/2026 Nam Tran

| Field | Value |
|---|---|
| Path and agent | Claude Code (VS Code extension), run by Nam Tran |
| Command and argument | Test-first build of the Gemini scene extractor and the SC-15 fixes (no Spec Kit command); spec edge case fixed at the source: `python3 tools/build_docs.py --mermaid` (with `MMDC_PATH` pointing to mermaid-cli 11.14.0 in a temporary folder), `python3 tools/build_index.py`, `uv run tools/start_feature.py --refresh` and `--check`; closing checks `npm test`, `npm run build`, `uv run tools/start_feature.py --check` |
| Feature and tasks | `specs/001-m3-core`, F-M3-10 to F-M3-12, tasks `T047` to `T050` |
| What the agent produced | Code: `lib/extraction/index.js`, `lib/extraction/gemini-extractor.js`, `lib/extraction/rule-extractor.js` (rule-based extractor moved out of the route, unchanged), `app/locations/match/match-view.js` (new); `app/api/locations/extract-scene/route.js`, `app/locations/match/page.js`, `lib/catalog/validator.js`, `lib/db/locations.js`, `package.json` (`@google/genai` 2.32.0) edited. Tests: `tests/unit/gemini-extractor.test.js`, `tests/contracts/extract-scene-provider.test.js`, `tests/unit/scene-match-view.test.js` (new). Docs: `tools/specs_b.py`, then `docs/spec/spec-M3.md` and `specs/001-m3-core/spec.md` regenerated; `tasks.md` (T047–T050), `plan.md`, `.env.example` (model notes, no key) |
| Human review | Accepted by Nam Tran, who reviewed each step in the session. Decisions: Gemini returns `{scene_types[], crew_size, shoot_month, era, notes}`; network error, 429, no answer within 8 s or no key/model fall back to the rule-based extractor and SC-15 says *Đang dùng chế độ dự phòng*; the SC-15 month field starts empty (BR-003); extractor line *Bộ trích: Gemini* / *Bộ trích: luật*. Model check with the team key: `gemini-3.5-flash-lite` answers in about 1 s; `gemini-2.5-flash` returns 404 for new users; `gemini-3.8-flash` did not answer within 20 s. |
| Tests | Gemini extractor, TDD Red: `88 tests, 75 passed, 13 failed`; Green: `88 passed`, also with outbound network denied (`sandbox-exec`). SC-15, TDD Red: `95 tests, 88 passed, 7 failed`; final `95 passed, 0 failed` across 26 suites (`npm test`). `next build` OK; no `GEMINI_*` name, `@google/genai` or key value in `.next/static`. `start_feature.py --check` OK. Live check with `LLM_PROVIDER=gemini`, `GEMINI_MODEL=gemini-3.5-flash-lite`: *cảnh chợ nổi lúc bình minh, 20 người, tháng 3* gave `floating_village, market, river`, `15_50`, month 3 in 3 of 3 runs and through the route; SC-15 in headless Chrome leaves the month empty for a sentence without a month in both modes. |
| Spec issues found | Row 10 of section 3 |
| Commit | Not committed yet |

## 3. Spec issues found while building

Every gap the build uncovers goes back to `docs/spec/` as an open question or a spec change. It
is never fixed silently in code.

| # | Found at (step, entry) | Issue | Where it went in the spec | Status |
|---|---|---|---|---|
| 1 | Step 3, Entry 1 | Priority notation divergence (I1): US-2 is treated as P2 optional scope for this M3 thin vertical slice to ensure US-1 is demonstrable independently, while preserving US-2 (P1) in `docs/spec/spec-M3.md` unless team approves changing source spec. | `docs/spec/spec-M3.md` retains US-2 (P1); `plan.md` and `tasks.md` track P2 optional. | Resolved for this slice. |
| 2 | Step 3, Entry 1 | Scoring criteria weights (A1): FR-008 scoring function criteria weights marked `[NEEDS CLARIFICATION]`. Open question with VFDA. | `docs/spec/spec-M3.md` §5.1 / `plan.md` Open Question #1. | Decided 28/10/2026 (provisional): scene fit 35, season 15, crew 15, logistics 15, permit 10, availability 10 — spec-M3 Clarifications Q1; engine and test updated (Entry 5). |
| 3 | Step 3, Entry 1 | Local authority contact re-verification interval (A2): BR-004 12-month re-verification policy marked `[NEEDS CLARIFICATION]`. | `docs/spec/spec-M3.md` §5.2 / `plan.md` Open Question #2. | Open — planned follow-up with VFDA in Session 11. Interim: existing seed `verified_at` metadata used. |
| 4 | Step 3, Entry 1 | Tooling & stack choices pending team confirmation (S1): Next.js router paradigm, language (TS vs JS), test runner, and LLM vendor need team decision. | `plan.md` §Decisions Requiring Team Confirmation & `AGENTS.md` §2. | Resolved 28/10/2026: App Router, JavaScript, Node test runner, Google Gemini (mock fallback) — `plan.md` §Decisions and `AGENTS.md` §2. |
| 5 | Step 4, Entry 6 | `tasks.md` placed `app/api/locations/[id]/` beside `[slug]/`, which breaks the Next.js build; the contract used a third path. | `tasks.md` T036 and the contract now use `/api/locations/:slug/authority-contact`. | Resolved 30/10/2026. |
| 6 | Step 4, Entry 6 | `rainy_months` and `months_to_avoid`: does `[]` mean "none" or "no data"? | Team decision: `[]` = none recorded, `null` = no data yet; recorded in `tasks.md` T045 and the contract. | Resolved 30/10/2026. |
| 7 | Step 4, Entry 6 | `lib/scoring/engine.js` reads a `null` month list as `[]`, so a location with no rainy-month data gets full season points instead of half (BR-003, §9 Assumptions). No seed row is affected today. | Not yet in the spec; needs a task. | Open. |
| 8 | Step 4, Entry 6 | The detail contract has no `restriction_note`, but SC-16 #9 shows it and the API returns it. | `contracts/location-detail-and-contact.contract.md` §1 still to be updated. | Open. |
| 9 | Step 4, Entry 6 | The 12-month contact re-verification (BR-004, Open Question 5) is not enforced; seed `ca-mau-cape` was verified in 2016 and is still shown. | Same as row 3. | Open — waits for VFDA. |
| 10 | Step 4, Gemini extractor (30/10/2026) | spec-M3 §3 edge case said a model failure sends the user to the filter search, but the Gemini extractor now falls back to the rule-based extractor (network error, 429, no answer within 8 s, or no key/model) and SC-15 shows *Đang dùng chế độ dự phòng*. Reason: decision of 28/10/2026 to keep the rule-based extractor as the fallback (`AGENTS.md` §2, `plan.md` decision 4). | Edge case rewritten at the source `tools/specs_b.py`, then `build_docs.py --mermaid` (all 9 specs render), `build_index.py`, `start_feature.py --refresh` and `--check` (OK). | Resolved 30/10/2026 for spec-M3. Still open: the SC-15 *Error* state in `docs/screens/screen-spec-SC-15.md` (source `tools/s*_en.py`) still describes *Couldn't analyse right now* + *Search by filters*. |

## 4. Agent mistakes worth remembering

| Entry | What went wrong | How it was caught | Prevention |
|---|---|---|---|
| Entry 1 | Initial draft of `tasks.md` placed domain scoring implementation in Foundational phase before unit test tasks in US-1 phase. | Caught during Step 3 checklist review against Constitution Principle II. | Ensure all business rule and acceptance scenario tests strictly precede implementation tasks in execution order. |
| Entry 2 | `getLocationImages` in `lib/db/locations.js` ordered by `image_id`, a column `location_image` does not have; the query would fail on first use. | Found in Entry 6 when the detail page first read photos. | Fixed to `image_url`; check column names against `data/schema/` when writing a query. |
| Entry 6 | The T031 test first used `admin` as an example of an unknown role, but `admin` is a valid role in `ck_user_account_role`. | Caught when the contact role list was given (SYS Clarifications Q1). | Take role names from `data/schema/schema-SYS.sql`, not from the mock helper. |
| Entry 7 | The first `build_docs.py --mermaid` run on a machine without mermaid-cli rewrote the *Every Mermaid block renders* checklist line to *NOT verified* in all nine specs. | Seen in the diff before going on. | Rerun with mermaid-cli 11.14 through `MMDC_PATH`; check the diff of `docs/spec/` after every rebuild. |
