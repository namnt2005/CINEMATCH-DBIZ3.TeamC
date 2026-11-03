---
description: "Task list for the segment router (M1): US-1 find my segment, US-2 override"
---

# Tasks: Segment router (M1) — find the segment, override it

**Input**: Design documents from `/specs/004-m1-router/` — [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Prerequisites**: plan.md (decisions D1–D4), research.md (R1–R10, Open questions 1–8)

**Tests**: Required. Constitution Principle II and the request for this feature: the test of every business rule (BR-001, BR-002, BR-003), every clarification used as a rule (Q1, Q2, Q3) and every acceptance scenario in scope (US-1 Scenarios 1–3, US-2 Scenario 1) is written and seen failing **before** the code that makes it pass. Each implementation task names the test task it turns green. `npm test` stays offline (`node:sqlite` + seed; Supabase through the fake client `tests/contracts/supabase-fake.js`).

**Organization**: Phase 2 = shared base (seed fix D1, answers, data layer); Phase 3 = US-1 (P1, MVP: SC-01, SC-02 result, store); Phase 4 = US-2 (P2, override). US-3 (FR-003, BR-004, SC-13) is **not in this plan** — it needs projects (M0).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1, US2 (spec.md §3)
- Every task names its FR / BR / clarification and its file paths

---

## Phase 1: Setup

**Purpose**: Start from a known green state.

- [X] T001 *(baseline 03/11/2026 before the M1 code: 327 tests green from the SYS close, build OK, `start_feature --check` OK)* Record the baseline on branch `004-m1-router`: `npm test`, `npm run build`, `uv run tools/start_feature.py --check`, `python3 data/seed/check_seed.py`, `python3 data/schema/load_check.py` — all green — in specs/004-m1-router/quickstart.md §Results

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The decision table holds the decided cases (D1), answers are validated one way, and one `lib/db/router.js` API reads the tables and writes decisions on both sources (FR-002, plan Structure).

**⚠️ CRITICAL**: No user-story work begins until this phase is complete. Tests T002–T004 are written and seen failing before T005–T007.

### Tests for Phase 2 (write first, see them fail) ⚠️

- [X] T002 [P] Create unit test of the seed decision table from data/seed/07_segment_rule.csv and 08_segment_requirement.csv: the current version is `2026.1`; within one version no two rules match the same answers (BR-001); co-production gives A for release `abroad`, `vietnam` and `both` (Clarifications Q1); segment C has `ART13_LICENCE` *not needed* and `SERVICE_CONTRACT`, `CREW_VISA` *needed* (Clarifications Q2); A, B and C each have at least one requirement (FR-002, D1, research R4) in tests/unit/segment-seed.test.js
- [X] T003 [P] Create unit test of the answer check: q1 boolean required; q2 and q3 required when q1 = true and refused when q1 = false; q2 ∈ abroad/vietnam/both; q3 ∈ foreign/vietnamese/coproduction; q4 a subset of locations/crew/cast/equipment/logistics with no repeats, empty allowed; override ∈ A/B/C; errors are dictionary keys per field (FR-002 §5.1, data-model §2) in tests/unit/router-answers.test.js
- [X] T004 [P] Create unit test of the data layer on `node:sqlite`: `getRouterData()` returns the rules of the current version only (never `2025.12`) and every requirement; `saveDecision()` inserts one `segment_decision` row with the session key, the answers, rule id, segment, `decided_by`, `journey_config`, and no `project_id`; `overrideDecision()` changes only a row of the same session and returns null for another session's id; the same calls on the Supabase source go through the System client (fake client) (FR-002, BR-003, research R6, R8) in tests/unit/router-data.test.js

### Implementation for Phase 2

- [X] T005 Add the rules `r7 true/vietnam/coproduction → A` and `r8 true/both/coproduction → A` (version `2026.1`) and the requirement `C / CREW_VISA / "Thị thực cho đoàn phim" / "Visas for the crew" / needed` to the lists `SR` and `REQ` of data/seed/generate_seed.py; run `python3 data/seed/generate_seed.py && python3 data/seed/check_seed.py` (PASS), `python3 data/schema/load_check.py` (PASS) and the data-doc generators (`python3 tools/build_data.py --mermaid`, `python3 tools/build_dm_docs.py --mermaid`) so data/seed/07_segment_rule.csv, 08_segment_requirement.csv and data/*.md are regenerated, never edited by hand; reviewed by the data owner (D1, Clarifications Q1, Q2; verifies T002)
- [X] T006 [P] Implement `validateAnswers(body)` and `validateOverride(body)` in lib/router/answers.js (verifies T003)
- [X] T007 Implement `getRouterData()`, `saveDecision({ sessionKey, answers, decision })` and `overrideDecision({ sessionKey, id, segment })` in lib/db/router.js (facade), lib/db/sqlite/router.js and lib/db/supabase/router.js (System client, server only) (verifies T004)

**Checkpoint**: The seed holds the decided cases; answers and storage work offline and through the Supabase fake.

---

## Phase 3: User Story 1 — Find my segment in under a minute (Priority: P1) 🎯 MVP

**Goal**: Landing page (SC-01) → router (SC-02, `/start`): at most four questions, segment A / B / C from the current decision table with the reason and the *Needed / Not needed* list; the result stored with an anonymous session key; no sign-in (FR-001, FR-002, BR-001, BR-002, Q1–Q3).

**Independent Test**: [quickstart.md](quickstart.md) Slice 1 — Yes / Outside Vietnam / Foreign company → A *based on answers 1, 2 and 3*; No → C with the commercial checklist and the caveat; changing question 4 never changes the segment; the landing page has no "VFDA" and no image.

### Tests for User Story 1 (write first, see them fail) ⚠️

- [X] T008 [P] [US1] Create unit test of `decide()`: US-1 Scenario 1 (Yes, abroad, foreign → A, `decided_by` [1,2,3]); US-1 Scenario 3 (same answers twice → same result); BR-001 (the result comes from the table: a test table with a changed row gives the changed segment with no code change; a superseded version is never used; versions compared as numbers, `2026.10` > `2026.9`); BR-002 (for every subset of question 4 the segment is the same, or none for the spec's contradiction, never another letter); q1 = No → C, `decided_by` [1]; answers that match no rule (Yes, abroad, vietnamese) → no segment; No + *Locations* → no segment (spec §3, research R3); co-production → A for every release with the seed table (Q1); US-1 Scenario 2 (requirements split into needed / not needed with `label_vi` or `label_en`); C carries the legal caveat flag, A and B do not (Q2); `journey_config` = needed, not needed, q4 needs, gauges with `dossier` only when `ART13_LICENCE` is needed (research R7) in tests/unit/router-decide.test.js
- [X] T009 [P] [US1] Create contract test of `POST /api/router/decisions` on `node:sqlite` and on the Supabase fake: works with no session (no sign-in); 201 with `segment`, `decided_by`, `matched`, `requirements`, `caveat`; a `segment` field in the body is ignored and the server's result is stored (BR-001); exactly one row per call, with `session_key` from the `cm_router_session` cookie, which the first call sets http-only and `SameSite=Lax`; no `project_id`; invalid answers → 422 with `fields` and nothing stored; no match → 201 `segment: null` and the row stored; labels in the language of the request (FR-002, BR-001, BR-002, D3, contracts/router-api.contract.md) in tests/contracts/router-decisions.test.js, with helpers in tests/contracts/router-helpers.js
- [X] T010 [P] [US1] Create unit test of the landing page source and texts: every dictionary key used by app/page.js and by the landing footer has no "VFDA" in vi.json or en.json; app/page.js renders no `<img>`; *Get started* links to `/start`; *Where should we shoot each scene?* links to `/locations/match`; *Quick content check* and the three other items are not links and read *coming soon*; no Article 13 strip (Clarifications Q3, D2, SR-012, SR-013) in tests/unit/landing-page.test.js
- [X] T011 [P] [US1] Create unit test of the SC-02 view helpers: progress *n / 4*; question 2 and 3 shown only after q1 = Yes and cleared when q1 changes to No; the result appears only when the required answers are complete; the reason line from `decided_by` (*answers 1, 2 and 3* / *answer 1*); the two other cards; the confirm action is `/signup?next=/start` for a guest and a note for a signed-in member (D4); answers kept in `sessionStorage` and the page still works when storage throws (spec §3 edge case) in tests/unit/router-view.test.js

### Implementation for User Story 1

- [X] T012 [US1] Implement `currentRules()`, `decide(answers, rules)`, `splitRequirements(segment, requirements, locale)` and `journeyConfig()` as pure functions in lib/router/decide.js (BR-001, BR-002, research R1–R3, R7; verifies T008)
- [X] T013 [US1] Implement the anonymous session key (`session:<16 hex>`, cookie `cm_router_session`, http-only, `SameSite=Lax`, 30 days) in lib/router/session.js and `POST` in app/api/router/decisions/route.js: validate, recompute with `decide()`, store with `saveDecision()`, answer per the contract (FR-002, D3, research R6; verifies T009)
- [X] T014 [P] [US1] Add the `landing.*` and `router.*` texts (questions, options, segment names A/B/C with their full names, reason lines, *Needed / Not needed*, the C caveat *Not legal advice — confirm with VFDA*, empty, no-match and save-failed states, *coming soon*, the member note) in lib/i18n/vi.json and lib/i18n/en.json; `npm run check:i18n` passes (SYS FR-006, Q2)
- [X] T015 [US1] Build SC-01 from the item list in app/landing-content.js (`LANDING`, `landingKeys()`, `footerTextKey()`, as tests/unit/landing-page.test.js expects) and app/page.js, in the order of docs/screens/screen-spec-SC-01.md (headline, lead, two buttons, four-uncertainties block, 5-step journey; no Article 13 strip, no VFDA line or logo) and the landing variant of app/components/site-footer.js without *operated for VFDA* (FR-001, Q3, D2; verifies T010)
- [X] T016 [P] [US1] Implement the SC-02 view helpers `progress`, `visibleQuestions`, `setAnswer`, `isComplete`, `reasonText`, `otherCards`, `confirmAction`, `saveAnswers`, `loadAnswers` in app/start/router-view.js (verifies T011)
- [X] T017 [US1] Build SC-02: app/start/page.js (server: `getRouterData()` for the current rules and requirements) and app/start/router-form.js (client: questions as `fieldset` + `legend` radio / checkbox groups, *Edit*, progress, result card with letter and full name, reason, *What this means*, C caveat, no-match state with the three cards, `POST` when the answers are complete, the confirm action of D4), in the order of docs/screens/screen-spec-SC-02.md (FR-001, FR-002, BR-001, BR-002, Q2)
- [ ] T018 [US1] *(partly done 03/11/2026: SQLite build — all 320 answer combinations, timed walk-through, 1280 px screenshots; `cinematch-dev` — store, reason, C caveat, landing without VFDA checked on the existing rules; the three D1 rows wait for `seed-supabase.mjs --reset`)* Run quickstart Slice 1 steps 2–10 on `cinematch-dev` after `node scripts/seed-supabase.mjs --reset` (with `SUPABASE_DB_URL` exported in the terminal), check SC-01 and SC-02 at 1280 px and 360 px, and record the results in specs/004-m1-router/quickstart.md §Results (US-1 Scenarios 1–3, SC-001)

**Checkpoint**: A guest reaches a segment with its reason and list in under a minute, and the result is stored; MVP demonstrable.

---

## Phase 4: User Story 2 — Override the result (Priority: P2)

**Goal**: From the result, the user picks another segment card; the result changes and the override is recorded on the stored row, always, without sign-in (FR-002, BR-003).

**Independent Test**: [quickstart.md](quickstart.md) Slice 2 — result A → card B → result B and `segment_override = B` on the row; card A again clears it; another session cannot change the row.

### Tests for User Story 2 (write first, see them fail) ⚠️

- [X] T019 [P] [US2] Create contract test of `PATCH /api/router/decisions/:id` on `node:sqlite` and on the Supabase fake: US-2 Scenario 1 (A → B sets `segment_override` = B and `segment` = B); every override among A, B, C is allowed and recorded (BR-003), including from a no-match result; picking the rule's own segment clears `segment_override`; a row of another session → 404 and unchanged; a value outside A/B/C → 422; no sign-in needed (FR-002, BR-003, research R6, contracts/router-api.contract.md) in tests/contracts/router-override.test.js
- [X] T020 [P] [US2] Create unit test of the override view state: the picked card becomes the result marked *chosen by you*, its requirements and caveat follow the picked segment, the computed segment stays visible as a card, picking it again removes the mark, and a failed save keeps the choice on screen with the *not saved* note (US-2 Scenario 1, SR-034) in tests/unit/router-view-override.test.js

### Implementation for User Story 2

- [X] T021 [US2] Implement `PATCH` in app/api/router/decisions/[id]/route.js with `validateOverride()` and `overrideDecision()` (session from the cookie only) (BR-003; verifies T019)
- [X] T022 [US2] Add the override state (`chooseCard`, `saveResult`, `shownSegment`, `chosenByYou`, `cardsFor`) to app/start/router-view.js and wire the segment cards of app/start/router-form.js to `PATCH`, with the `router.*` override texts in lib/i18n/vi.json and en.json (US-2 Scenario 1; verifies T020)
- [ ] T023 [US2] *(partly done 03/11/2026: SQLite build — override A → B in the browser; `cinematch-dev` — override stored by the System client, another session 404; test rows removed)* Run quickstart Slice 2 steps 1–4 on `cinematch-dev` and record the results in specs/004-m1-router/quickstart.md §Results (US-2 Scenario 1, SC-003)

**Checkpoint**: US-1 and US-2 both work offline and on Supabase.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T024 Run `npm test`, `npm run build` (prebuild runs `check:i18n`), `uv run tools/start_feature.py --check`, `python3 data/seed/check_seed.py`, `python3 data/schema/load_check.py` and record them in specs/004-m1-router/quickstart.md §Results
- [X] T025 Add the build-log entry and the AI-use-log row, and record the spec issues of research Open questions 1, 2, 6 and 7 in docs/build/build-log.md §3 and docs/ai-use-log.md; tell the human that AGENTS.md §3 still says 427 seed rows (430 after T005) — AGENTS.md is edited by its owner, not by the agent

---

## Not in this plan

- US-3 (P3) *Change segment on an existing project* — FR-003, BR-004, SC-13: waits for projects (M0); a later feature adds `project_id` to the decision and the settings screen.

---

## Traceability: rule or scenario → test → code

| Rule / scenario | Test (written first) | Code that turns it green |
|---|---|---|
| BR-001 — decision table, same answers same segment | T002, T004, T008, T009 | T005, T007, T012, T013 |
| BR-002 — question 4 never changes the segment | T008, T009 | T012, T013 |
| BR-003 — override always allowed and recorded | T004, T019, T020 | T007, T021, T022 |
| Clarifications Q1 — co-production is A | T002, T008 | T005, T012 |
| Clarifications Q2 — C: no licence, commercial checklist, caveat | T002, T008 | T005, T012, T014, T017 |
| Clarifications Q3 — no VFDA, no logo on the landing page | T010 | T014, T015 |
| FR-001 — landing entry, at most 4 questions | T010, T011 | T015, T016, T017 |
| FR-002 — answers validated, result stored with reason and list | T003, T004, T008, T009 | T006, T007, T012, T013, T017 |
| US-1 Scenario 1 — A *based on answers 1, 2 and 3* | T008, T009 | T012, T013 |
| US-1 Scenario 2 — needed / not needed from the table | T008 | T012, T017 |
| US-1 Scenario 3 — same answers, same segment | T008 | T012 |
| US-2 Scenario 1 — A → B recorded as an override | T019, T020 | T021, T022 |
| Spec §3 edge cases — no match; nothing stored before the answers are complete | T008, T009, T011 | T012, T013, T016 |

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1** → **Phase 2** (blocks every story) → **Phase 3 (US-1)** → **Phase 4 (US-2)** → **Phase 5**.
- US-2 builds on the stored row and the SC-02 form of US-1 (T013, T017).
- T005 changes `data/` through the generator: it needs the data owner's review before merge; T018 and T023 need the regenerated seed on `cinematch-dev`.

### Within each phase

- Tests first, seen failing: T002–T004 before T005–T007; T008–T011 before T012–T017; T019–T020 before T021–T022.
- T012 before T013 and T017; T014 before T015 and T017; T016 before T017; T021 before T022.

### Parallel opportunities

- Phase 2 tests T002, T003, T004 together; then T006 alongside T005.
- US-1 tests T008, T009, T010, T011 together; then T014 and T016 alongside T012.
- US-2 tests T019 and T020 together.

### Parallel example: User Story 1

```text
Tests together:   T008 router-decide.test.js | T009 router-decisions.test.js | T010 landing-page.test.js | T011 router-view.test.js
Then together:    T012 lib/router/decide.js | T014 lib/i18n/*.json | T016 app/start/router-view.js
Then in order:    T013 API → T015 SC-01 → T017 SC-02 → T018 online check
```

---

## Implementation Strategy

### MVP first (User Story 1)

1. Phase 1, Phase 2 (including the reviewed seed change T005).
2. Phase 3: SC-01 and SC-02 give the segment with reason and list; results stored.
3. **STOP and VALIDATE** with quickstart Slice 1; demo.

### Incremental delivery

1. US-1 → demo (MVP).
2. US-2 → overrides recorded (SC-003 can be counted).
3. US-3 later, with M0.
