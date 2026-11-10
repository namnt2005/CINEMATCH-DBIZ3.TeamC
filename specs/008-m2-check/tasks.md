---
description: "Task list for the content pre-check and Article 13 dossier check (M2): US-3 rule base, US-1 pre-check, US-2 dossier, US-4 timeline"
---

# Tasks: Content pre-check and Article 13 dossier check (M2)

**Input**: Design documents from `/specs/008-m2-check/` — [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Prerequisites**: plan.md (decisions D1–D10, *Waiting for VFDA confirmation*, *Known limitations*), research.md (R1–R14, Open questions 1–13). Spec sources already changed and rebuilt on 07/11/2026: D1 (M2 US-4 Sc1, BR-006; M5 US-3), D8 (wording *Recommended submission date*), D9 (only `vfda_legal` signs, SYS question 5 exception), D10 (M0 question 2). Analysis fixes of 08/11/2026 already at the sources and rebuilt: I1 (fallback edge case), I2 (§5.1 FR-002, FR-006, §6, §11.1; the §6.1 rows of D2 go in with T007 because the generator requires their columns), A1, A2 (M2 question 14), U1 (SC-03 #9 privacy line and consent box, D12); C1 data change done through the generators (D11: `precheck_run.dropped_count`, `dropped_rule_codes`; data owner to review).

**Tests**: Required (Constitution Principle II and the request for this feature). Each test task below is written and seen failing **before** the code task that names it:
- every business rule: BR-001..BR-008;
- every acceptance scenario in scope: US-1 Scenarios 1–3, US-2 Scenarios 1–2, US-3 Scenarios 1–2, US-4 Scenario 1;
- the clarifications and decisions the code must honour: Q1, Q2, Q3, Q4, Q6, Q13, D1–D10.

`npm test` stays offline: `node:sqlite` + seed, Supabase through `tests/contracts/supabase-fake.js`, Gemini through a fake client (`LLM_PROVIDER=mock` = keyword match) — no model call, no network. Real RLS is checked by `npm run test:rls` with member fixtures only (no staff, Legal Board or admin fixture, no sign-in on anyone's behalf); the browser walk-throughs, with the seed `vfda_legal` and admin accounts, are run by Nam Tran.

Expected values come from the seed (CSV files found by table name, never by their NN prefix), from the seed oracle `data/seed/seed_rules.py`, or from a computation written in the test from `public_holiday` — never from scenario text alone (build-log Entry 12). An older test that fails because of D2–D4 or D10 is **reported and not changed** until Nam Tran approves the change (build-log rule).

**Organization**: Phase 1 = baseline and the last screen-source change (D2, D4 on SC-37); Phase 2 = data change (D2–D4), migration skeleton, shared working-day and version functions; Phase 3 = US-3 (slice 1: every other slice reads signed rules); Phase 4 = US-1 (MVP for guests); Phase 5 = US-2; Phase 6 = US-4; Phase 7 = Polish. Spec priorities: US-1, US-2, US-3 P1, US-4 P2; US-3 goes first as plan.md *Constitution Check* III orders the slices. US-5 added on 09/11/2026 (D17): Phase 6b. Tasks added on 09/11/2026 are numbered from T069 so that the IDs already in use stay valid. Not in this plan: SC-29 reminders and `.ics`, M5 uploads and drafts, earlier revisions on SC-31.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1..US4 (spec.md §3); Phases 1, 2 and 7 carry no story label
- Every task names its FR / BR / decision and its file paths

---

## Phase 1: Setup

- [X] T001 Record the baseline on branch `008-m2-check` before any change — `npm test`, `npm run build`, `uv run tools/start_feature.py --check`, `python3 data/seed/check_seed.py`, `python3 data/schema/load_check.py`, `python3 tools/build_supabase.py --check` — in specs/008-m2-check/quickstart.md §Results (the step missed in M4, build-log Entry 15)
- [X] T002 Change the SC-37 Screen Spec at its source tools/s5_en.py (D2, D4, Q13): row action *Create revision* for an approved rule without a draft (#10, interaction row, SR-303 wording); editor fields *Keywords EN / VI* (optional, ≤ 30 items of 1–60 characters, signed with the rule; used only by the fallback match); success strip *Revision {n} created — revision {n−1} stays in force until it is signed*; then `"$MMDC_PATH" --version` (must print 11.14.0) before `python3 tools/build_docs.py --mermaid`, `python3 tools/build_index.py`, `python3 tools/check_screens.py s5_en --out <scratch>`, `uv run tools/start_feature.py --check` (stays OK: no spec change); diff of docs/spec must show no *NOT verified* line (build-log Entries 7, 13, 14)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: rule revisions, keywords and text-free pre-check findings exist in the data (D2–D4); every write goes through a checked database function; one shared working-day function and one version-label function.

**⚠️ CRITICAL**: no user story work can begin until this phase is complete.

### Tests (write first, see them fail) ⚠️

- [X] T003 [P] Create unit test of the M2 seed and schema after D2–D4 in tests/unit/m2-seed.test.js:
  - `legal_rule.revision` (≥ 1), `UNIQUE (rule_code, revision)` and `UNIQUE (rule_slug, revision)` in data/schema/schema-M2.sql, no `UNIQUE (rule_code)` left;
  - in the seed at most one `approved` revision per `rule_code`; one approved rule has a `draft` revision 2 (Q13); `status = retired` ⇔ `retired_version` set, and `A9-MAP` has its retiring version;
  - `keywords_vi`, `keywords_en` are JSON arrays of strings (≤ 30, each 1–60 characters) or empty; at least one approved rule has none (fallback boundary, D4);
  - `precheck_finding` has `rule_id` and no `rule_code`, `quoted_text`, `explanation_vi`, `explanation_en` (Q6, D3); `compliance_finding` has `rule_id` and `quoted_text`, no `rule_code`; every `rule_id` exists and was `approved` in the version of its run (BR-001, BR-007);
  - `ck_legal_rule_approved_needs_signature` and `ck_legal_rule_active_matches_status` still in the schema (BR-002, BR-008);
  - D11: `precheck_run.dropped_count` ≥ 0 and `dropped_rule_codes` a JSON array of distinct codes with 0 ⇔ `[]`; the run without an attention level has `dropped_count > 0` and no finding; no dropped text anywhere (this part is green at once — the data changed on 08/11/2026 before the test, analysis C1; say so in the build log).

  (BR-001, BR-002, BR-007, BR-008, FR-012, Q6, Q13, D2–D4, D11)
- [X] T004 [P] Create unit test of the migration supabase/migrations/20261108000100_m2_check.sql in tests/unit/m2-migration.test.js (static, like tests/unit/m4-migrations.test.js) — the Phase 2 part only; the function bodies have their own tests before T019, T038, T050, T061 (analysis I3):
  - columns and keys of D2–D4 added `IF NOT EXISTS`, the old unique and foreign keys on `rule_code` dropped in a safe order, existing rows backfilled to `revision = 1` and `rule_id`; the partial unique index `uq_legal_rule_one_approved … WHERE status = 'approved'`;
  - `precheck_run.dropped_count`, `dropped_rule_codes` added `IF NOT EXISTS` with `ck_precheck_run_dropped_count` (D11);
  - the read policies of data-model.md §7 (`rule_set_version` for `signed_in`, `precheck_run` and `compliance_run` for project members) with `DROP POLICY IF EXISTS`; no new `GRANT … TO anon`;
  - direct `INSERT`, `UPDATE`, `DELETE` revoked on the six M2 tables for `anon`, `authenticated` (R6); no `DELETE` statement or grant anywhere (BR-008);
  - the helper `app.next_rule_version()` (D6) is `SECURITY DEFINER` with `search_path = ''`.

  (BR-007, BR-008, FR-004, D2, D6, D11)
- [X] T005 [P] Create unit test of working days in tests/unit/working-days.test.js (BR-006, Q1, SR-173): `holidaySet()` expands `start_date..end_date` and keeps `is_expected`; `isWorkingDay()` false on Saturday, Sunday and every seed holiday date (Tết 2027 05–10/02); `workingDaysBefore('2027-03-08', 20)` = `2027-02-02` and `workingDaysBefore('2027-02-02', 20)` = `2027-01-05`; `workingDaysAfter(date, n)` counts `date` as day 1 when it is a working day (`2027-01-05` + 40 → `2027-03-05`, `2027-02-02` + 40 → `2027-04-02`) and starts on the next working day otherwise; inputs and outputs are `YYYY-MM-DD` strings with no time zone; expected values computed in the test from the seed `public_holiday` file
- [X] T006 [P] Create unit test of the rule-set version label in tests/unit/rule-version.test.js (D6, FR-004): first of a month `YYYY.MM` (Vietnam date), then `.02`, `.03` …; `'2026.11' < '2026.11.02' < '2026.11.10' < '2026.12'` as strings, so `MAX(rule_version)` names the newest; same answer from the JS function and its SQL twin rendered for node:sqlite

### Implementation

- [X] T007 D2–D4 through the generators, never by hand in data/ (approved by Nam Tran 07/11/2026; data owner Nguyễn Huy Trung to review before merge) (verifies T003):
  - tools/dm_model2.py: `LEGAL_RULE.revision`, `retired_version`, `keywords_vi`, `keywords_en`, `segments` (D17), `is_sample` (D15); `PRECHECK_FINDING.rule_id` replacing `rule_code`, text columns removed; `COMPLIANCE_FINDING.rule_id` replacing `rule_code`; relationships through `rule_id`, new *retires* relationship; natural keys;
  - tools/dm_model.py (catalogue, CRUD, OQ-04-24 and the M2 data questions resolved per research Open question 13), tools/build_schema.py (unique keys, `ck_precheck_finding_span`, `ck_legal_rule_retired_version`), tools/dm_rules.py (BR-006 evidence of D1: *The Last Ferry* recommended 05/01/2027, latest 02/02/2027; *Quiet Harbour Blues* recommended 08/09/2026 passed; BR-008 evidence names the revision rows), tools/build_data.py (anomaly entries);
  - data/seed/generate_seed.py and data/seed/seed_rules.py: revision 1 for every rule, a draft revision 2 of one approved rule, `retired_version` of `A9-MAP`, keywords, findings by `rule_id`; one approved revision per code checked;
  - rebuild: `python3 tools/build_data.py --mermaid`, `python3 data/seed/generate_seed.py && python3 data/seed/check_seed.py` (PASS), `python3 tools/build_schema.py`, `python3 data/schema/load_check.py` (PASS), `python3 tools/build_dm_docs.py --mermaid`, `python3 tools/build_supabase.py` and `--check`, `python3 tools/build_index.py`;
  - tools/specs_types.py: the §6.1 rows `LegalRule.revision`, `retired_version`, `PrecheckFinding.rule_id`, `ComplianceFinding.rule_id` (left out on 08/11/2026: `dm_model2.py` asserts every §6.1 attribute has a column), then `python3 tools/build_docs.py --mermaid` (after `"$MMDC_PATH" --version`), `uv run tools/start_feature.py --refresh` and `--check`;
  - if an older test fails (counts, columns), stop and report it to Nam Tran
- [X] T008 Add the read policies at their source tools/rls_policies.py (data-model.md §7): `rule_set_version` select for `signed_in`; `precheck_run` select for members of the linked project; `compliance_run` select for project members; `anon` keeps its five tables; then `python3 tools/build_supabase.py` and `--check` (R6)
- [X] T009 Write supabase/migrations/20261108000100_m2_check.sql: D2–D4 and D11 columns and keys for the pushed database (verifies T004); the new policies of T008 copied inline with `DROP POLICY IF EXISTS`; revokes of direct writes; helper `app.next_rule_version()` (D6); the functions of data-model.md §6 — their bodies are completed in the story tasks that test them (T019, T038, T050, T061), each after its own static test, and each function is run on PGlite in a scratch folder before it is reported done (build-log Entry 9 rule)
- [X] T010 [P] Add the partial unique index `uq_legal_rule_one_approved` and the node:sqlite twins of the M2 CHECKs to lib/db/local-triggers.sql (D2)
- [X] T011 [P] Implement lib/dates/working-days.js — `holidaySet`, `isWorkingDay`, `workingDaysBefore`, `workingDaysAfter`, pure functions on date strings, exported for M0 and M5 (BR-006, Q1, SR-173) (verifies T005)
- [X] T012 [P] Implement lib/legal/version.js `nextRuleVersion(existing, now)` and its SQL twin in the migration (D6) (verifies T006)
- [X] T069 [P] Add to tests/unit/m2-seed.test.js (D15, D17): `legal_rule.is_sample` and `legal_rule.segments` columns exist; every seed rule has `is_sample = true`; `segments` is a non-empty JSON list of distinct values among A, B, C on every rule; the A13 dossier rule applies to A and B only (seed boundary)
- [X] T070 [P] Create unit test of the sample rules in tests/unit/m2-sample-rules.test.js (D14, D16, D15): data/seed/samples/legal_rule_samples.csv exists with the columns of `legal_rule`; seed + samples ≈ 25 rules (24–26); codes and slugs unique across both files; every sample has `is_sample = true`; approved samples have a citation ending with *(mẫu — chờ Ban Pháp chế VFDA kiểm)*, an approver with role `vfda_legal`, an existing `rule_version`, keywords in both languages and at least one segment; the node:sqlite database holds seed + sample rules; the 49 main seed files are unchanged by the samples
- [X] T071 Implement data/seed/generate_samples.py (writes data/seed/samples/legal_rule_samples.csv and checks it against data/schema/schema-*.sql and the main seed in an in-memory SQLite), and load the file after the main seed in lib/db/client.js and scripts/seed-supabase.mjs (D14) (verifies T070)

**Checkpoint**: data, migration skeleton, working days and versions in place — stories can start.

---

## Phase 3: User Story 3 — VFDA Legal Board signs a rule (Priority: P1)

**Goal**: the Legal Board writes, signs, revises and retires rules on SC-37; signing without a citation is refused by the database; every signature and retirement creates a rule-set version; open projects' owners are notified, never re-checked (FR-001..FR-004, BR-002, BR-007, BR-008, Q2, Q3, Q13, D2, D9).

**Independent Test**: on node:sqlite, a draft without a citation cannot be signed; with one it is signed, a new version exists, the previous revision of the code is retired in that version, and the owners of non-archived projects with an older content check get one notification each.

### Tests for User Story 3 (write first, see them fail) ⚠️

- [X] T013 [P] [US3] Create unit test of the rule base on node:sqlite in tests/unit/legal-rules-data.test.js (seed `vfda_legal` `d8eb7d55-…`):
  - US-3 Sc1: `signRule` on the draft `A9-HERIT` (no citation) → `CITATION_REQUIRED` with `fields.citation`, the row stays `draft`, no version, no audit row; a direct `UPDATE … SET status = 'approved'` without citation is refused by the CHECK (BR-002);
  - US-3 Sc2: with a citation, `signRule` → `approved`, `is_active`, approver = the signer (author may sign, Q2), a new `rule_set_version` (label of D6) in the revision's `rule_version`;
  - Q13: `reviseRule` copies the approved texts into a draft revision n+1 (`DRAFT_EXISTS` on a second call); until it is signed the approved revision stays the active one; signing it retires revision n with `retired_version` = the new version, in the same transaction; `retireRule` → `retired`, `is_active = false`, a new version (Q13);
  - BR-008: the module exports no delete; a seed compliance finding that cites revision 1 still reads revision 1's title and citation after revision 2 is signed;
  - D9: `admin` (`dffdeb6f-…`) and `member` signing or retiring → `FORBIDDEN`; `admin` may list and read;
  - validation of data-model.md §5 (`CODE_EXISTS`, titles, texts, keywords); `NOT_DRAFT` when editing an approved revision;
  - one approved revision per code (analysis C3): a direct insert or update that makes a second revision of the same code `approved` is refused by `uq_legal_rule_one_approved` on node:sqlite;
  - one `audit_log` row per save, revision, signature, retirement (`rule.save`, `rule.revise`, `rule.sign`, `rule.retire`);
  - Q3: after a signature, each owner of a non-archived project whose latest `compliance_run` used an older version gets one `rule_set.new_version` notification; archived projects and projects with no run get none; no `compliance_run` is written.

  (FR-001..FR-004, BR-002, BR-007, BR-008, Q2, Q3, Q13, D2, D6, D9)
- [X] T014 [P] [US3] Create contract test of the rule routes with the Supabase fake in tests/contracts/legal-rules-api.test.js (contracts/legal-rules-api.contract.md): 401 guest; 403 for `member`, `vfda_staff`, and for `admin` on every write route (D9); 200 reads for `admin`; the database error `23514` on `ck_legal_rule_approved_needs_signature` → 422 `CITATION_REQUIRED` with `fields.citation` (US-3 Sc1); 409 `CODE_EXISTS`, `NOT_DRAFT`, `DRAFT_EXISTS`, `NOT_APPROVED`; malformed id 404; no DELETE handler exported (BR-008)
- [X] T015 [P] [US3] Create unit test of the SC-37 view rules in tests/unit/legal-rules-view.test.js: row action by status (draft → *Edit*, approved → *Retire* and *Create revision* only without a draft, retired → *View*); *Approve and sign* disabled while a required field is empty; version history lists signed and retired codes per version newest first; every key used exists in vi.json and en.json (FR-001..FR-004, D2, D4)
- [X] T016 [P] [US3] Add to tests/rls/rls.test.js (member fixtures only): a member reads approved, active revisions and no draft or retired revision; a member's direct insert into `legal_rule` or `rule_set_version` is refused; a signed-in member reads `rule_set_version`; `anon` reads no `rule_set_version` row (BR-002, R6)
- [X] T017 [P] [US3] Create static test of the rule functions in tests/unit/m2-migration-rules.test.js (analysis I3): `app_save_rule_draft`, `app_revise_rule`, `app_sign_rule`, `app_retire_rule` are `SECURITY DEFINER` with `search_path = ''`, EXECUTE revoked from `PUBLIC`, `anon` and granted to `authenticated`; sign and retire test `app.current_role() = 'vfda_legal'` exactly, not `app.has_role` (D9); sign does not pre-check the citation (the BR-002 CHECK refuses); sign and retire call `app.next_rule_version()`; one `audit_log` insert per function; no DELETE (BR-002, BR-008, FR-003, FR-004, Q13, D9)

### Implementation for User Story 3

- [X] T018 [P] [US3] Implement lib/legal/input.js — rule fields, keywords, slug from the code (data-model.md §5) (verifies part of T013)
- [X] T019 [US3] Complete `app_save_rule_draft`, `app_revise_rule`, `app_sign_rule`, `app_retire_rule` in supabase/migrations/20261108000100_m2_check.sql, run on PGlite (sign without citation refused by the CHECK; admin refused; revision retires its predecessor) (FR-003, FR-004, BR-002, D9)
- [X] T020 [US3] Implement `listRules()`, `getRule()`, `saveDraft()`, `reviseRule()`, `signRule()`, `retireRule()`, `listVersions()` in lib/db/legal-rules.js, lib/db/sqlite/legal-rules.js and lib/db/supabase/legal-rules.js (RPCs; 23514 on the BR-002 constraint → `CITATION_REQUIRED`; Q3 notifications by the System actor through `notify()` of lib/db/notifications.js) (verifies T013)
- [X] T021 [US3] Implement app/api/admin/legal-rules/route.js (GET, POST), app/api/admin/legal-rules/[id]/route.js (GET, PATCH), [id]/revise/route.js, [id]/sign/route.js, [id]/retire/route.js, app/api/admin/rule-set-versions/route.js (verifies T014)
- [X] T022 [US3] Build SC-37 in app/admin/legal-rules/page.js, rules-client.js, rules-view.js (elements #1–#23 of screens.contract.md, confirmation `dialog`s, citation outlined with `aria-describedby`); header link *Legal rules* for `vfda_legal` and `admin` in app/components/site-header.js; `rules.*` texts (the `legal.*` prefix belongs to the legal pages) in lib/i18n/vi.json, lib/i18n/en.json (verifies T015)
- [ ] T023 [US3] Quickstart slice 1 on `cinematch-dev` after Nam Tran's `npx supabase db push --remote` and `node scripts/seed-supabase.mjs --reset`: Nam Tran signs in as the seed `vfda_legal` account, then as the seed admin (403 on sign and retire); results in specs/008-m2-check/quickstart.md §Results (US-3, D9)

**Checkpoint**: US-3 works on its own; later checks read only signed revisions.

---

## Phase 4: User Story 1 — Pre-check my story without signing up (Priority: P1) 🎯 MVP

**Goal**: a guest gets an attention level and cited findings for a 20–200-word summary; nothing uncited is ever shown; nothing of the text is stored; a member can save the check to a project and mark findings reviewed (FR-005..FR-007, FR-011..FR-014, BR-001, BR-003, BR-004, BR-007, Q4, Q6, D3, D5, D7).

**Independent Test**: offline with the keyword match, an invented summary that contains the keywords of two *action* rules gives *High* with two cards citing those rules; a model answer with an unknown code or an invented quote is dropped; the stored rows hold a hash, rule ids and spans only.

### Tests for User Story 1 (write first, see them fail) ⚠️

- [X] T024 [P] [US1] Create unit test of the attention level in tests/unit/attention-level.test.js (BR-004, Q4): 0/0 → low, 0 action + 2 notice → low, 0 + 3 → medium, 1 + 0 → medium, 1 + 5 → medium, 2 + 0 → high, 3 + 4 → high; the function takes verified findings with their rule severity and never a score
- [X] T025 [P] [US1] Create unit test of finding verification in tests/unit/precheck-verify.test.js (BR-001, FR-012, US-1 Sc2): a pair with an unknown code, a draft code, a retired code, or a quote not found verbatim is dropped and counted; a kept pair gets `span_start`/`span_end` with `text.slice(start, end) === quoted_text`; a repeated quote of the same rule takes the next occurrence; duplicates merged; empty or > 500-character quotes dropped; the result carries `dropped_count` and the distinct `dropped_rule_codes` (unknown codes included) and nothing of the dropped text (FR-012, D11)
- [X] T026 [P] [US1] Create unit test of the matcher in tests/unit/precheck-matcher.test.js (FR-011, R3, D4) with a fake Gemini client: the request lists only the active codes (schema enum) and asks for verbatim quotes; `LLM_PROVIDER=mock`, missing key, `GEMINI_PAID_TIER` not `true`, or `consent_advanced` not `true` → keyword match without calling the client (D12); Gemini only with all three; timeout, 429, network error, invalid JSON → keyword match, `method = keywords`; keyword match is case-insensitive, whole-word, uses `keywords_vi` for `vi` and `keywords_en` for `en`, ignores rules without keywords; the key and the summary never reach a log line or the result
- [X] T027 [P] [US1] Create unit test of the input in tests/unit/precheck-input.test.js (FR-005): 19 words refused, 20 and 200 accepted, 201 refused (word count shared with the SC-03 counter); `lang` `en`/`vi`; flags `yes`/`no`/`unsure` only; error keys exist in both languages
- [X] T028 [P] [US1] Create unit test of the banned words in tests/unit/banned-words.test.js (BR-003, D8, SR-074): every dictionary key used by SC-48, SC-27, SC-29 and the SC-12 strip, and every message of the pre-check, content-check, dossier and timeline APIs, in vi and en — including *No points needing attention were found under rule set {v}* and *Could not check this time* — contains none of the words of research R11; no deadline text contains *safe* / *an toàn*
- [X] T029 [P] [US1] Create unit test of the pre-check record on node:sqlite in tests/unit/precheck-data.test.js (FR-006, FR-007, BR-004, BR-007, Q6, US-1 Sc1–3):
  - US-1 Sc1: a 96-word invented summary through `runPrecheck()` gives a level, kept findings with citation and spans, and a `brief_id`;
  - Q6: the stored `precheck_run` has `synopsis_hash` (SHA-256 of the normalised text) and no column or JSON value containing any 8-word sequence of the summary; `precheck_finding` rows hold `rule_id` and spans only;
  - BR-004: `recordPrecheck` recomputes the level from the rows (a wrong level sent by the caller is not stored);
  - BR-007 / US-3 Sc2: after a rule is signed, the next pre-check stores the new version;
  - US-1 Sc3: 0 found → `state = none`, `low`; all dropped → `could_not_check`, no level (the seed run `cc6bcb72` pattern);
  - D11: the stored `dropped_count` and `dropped_rule_codes` equal the verification result, with no text;
  - both matchers failing → `CHECK_UNAVAILABLE`, nothing stored
- [X] T030 [P] [US1] Create contract test of the pre-check routes in tests/contracts/precheck-api.test.js (contracts/precheck-api.contract.md): `GET /api/precheck/basis` (with `advanced_available`, D12); `POST /api/precheck` 200 shape with `dropped_count` and `dropped_rule_codes`, `consent_advanced` false by default, 422 fields, 503; the dropped text never in the answer, the stored run or a log line (FR-012, D11); the 11th guest call from one IP in 24 h → 429 `RATE_LIMITED` and the 51st for a signed-in user (D7); `GET /api/precheck/:id` has no `quoted_text`; `POST /api/projects/:id/content-checks` 201 for owner/edit, 403 view member, 404 non-member, 409 `ARCHIVED`, 409 `RULE_SET_CHANGED`, 422 when a finding fails re-verification (a forged quote or code is never saved); no log line contains the summary
- [X] T031 [P] [US1] Create unit test of the project content check on node:sqlite in tests/unit/content-checks-data.test.js (FR-013, FR-014, D5, Q3): `saveContentCheck` writes one `compliance_run` with the current version, its `compliance_finding` rows (`rule_id`, `quoted_text`, `open`) and one `precheck_run` with `project_id`; `reviewFinding` → `reviewed` with the note (≤ 1 000), owner and edit only; the M0 Content gauge reads 30 + 30 + 40 × reviewed share; after a new rule-set version the gauge drops 30 and the next step is `content.recheck_new_rules` (Q3); archived project refused
- [X] T032 [P] [US1] Create unit test of the SC-03 and SC-48 view rules in tests/unit/precheck-view.test.js: the counter and the button state use the input word count; highlights built from spans carry a number and a severity label (never colour alone); cards keep the API order; a result reopened without the session copy shows the *text is not kept* line and no passage; the method line appears only when `method = keywords`; the rule code is plain text (US-5 not built); D12: the SC-03 privacy line in both languages is the decided text, the consent box is rendered only when `advanced_available`, unticked by default, and the request carries `consent_advanced` only when ticked
- [X] T033 [P] [US1] Add to tests/rls/rls.test.js (member fixtures only): a fixture reads `compliance_run` and `precheck_run` of its own project and none of another project; direct inserts into `precheck_run`, `precheck_finding`, `compliance_run`, `compliance_finding` and a direct update of `compliance_finding` are refused (R6)
- [X] T034 [P] [US1] Create static test of the pre-check functions in tests/unit/m2-migration-precheck.test.js (analysis I3): `app_record_precheck` granted to `service_role` only, recomputes the level with the Q4 thresholds, refuses a `rule_id` not approved in the run's version, stores `dropped_count` and `dropped_rule_codes`; `app_save_content_check` answers `RULE_SET_CHANGED` and `ARCHIVED` and needs owner or edit; `app_review_finding` needs owner or edit; all `SECURITY DEFINER` with `search_path = ''` (BR-001, BR-004, BR-007, FR-012, FR-014, D11)

### Implementation for User Story 1

- [X] T035 [P] [US1] Implement lib/content-check/input.js, attention.js, verify.js, wording.js (verifies T024, T025, T027, T028 word list)
- [X] T036 [P] [US1] Implement lib/content-check/matcher.js (Gemini only with `LLM_PROVIDER=gemini`, `GEMINI_PAID_TIER=true` and `consent_advanced`, D12), gemini-matcher.js (`@google/genai`, structured output, 15 s timeout), keyword-matcher.js (verifies T026)
- [X] T037 [P] [US1] Implement lib/content-check/rate-limit.js (in memory, 24 h sliding window, 10 / 50; Known limitation 2) (D7)
- [X] T038 [US1] Complete `app_record_precheck`, `app_save_content_check`, `app_review_finding` in supabase/migrations/20261108000100_m2_check.sql and run on PGlite (level recomputed in SQL; `RULE_SET_CHANGED`; owner/edit; archived refused) (BR-004, BR-007, FR-014)
- [X] T039 [US1] Implement `runPrecheck()`, `recordPrecheck()` (with `dropped_count`, `dropped_rule_codes`), `getPrecheck()`, `precheckBasis()` (with `advanced_available`) in lib/db/precheck.js, lib/db/sqlite/precheck.js, lib/db/supabase/precheck.js (System actor for guests) (verifies T029)
- [X] T040 [US1] Implement `saveContentCheck()`, `latestContentCheck()`, `reviewFinding()` in lib/db/content-checks.js and both sources (verifies T031)
- [X] T041 [US1] Implement app/api/precheck/route.js, app/api/precheck/basis/route.js, app/api/precheck/[id]/route.js, app/api/projects/[id]/content-checks/route.js, app/api/projects/[id]/content-checks/latest/route.js, app/api/content-findings/[id]/review/route.js (verifies T030)
- [X] T042 [US1] Build SC-03 in app/pre-check/page.js, precheck-form.js (privacy line and consent box of D12); SC-48 in app/pre-check/r/[id]/page.js, result-view.js (session copy in `sessionStorage`) and app/projects/[id]/content/page.js, content-client.js; project sidebar item *Content check* in app/projects/[id]/project-nav.js; the M0 next-step links `content.*` to these routes; `precheck.*`, `content.*` texts in lib/i18n (verifies T032, T028)
- [ ] T043 [US1] Quickstart slice 2 on `cinematch-dev` (Nam Tran, seed member; `LLM_PROVIDER=gemini` only with a paid key); results in specs/008-m2-check/quickstart.md §Results (US-1)

**Checkpoint**: US-1 works for guests and members; the Content gauge has real runs.

---

## Phase 5: User Story 2 — Know whether my dossier is complete (Priority: P1)

**Goal**: SC-27 shows the four Article 13 clause 3 components a–d from fixed rules, with *Needs fixing* for an unproofread Vietnamese version and *Pending* without a confirmed partner, and the Dossier gauge shows the same number (FR-008..FR-010, BR-005, SR-081..SR-086, Q9).

**Independent Test**: on the seed, *Rice and Salt* shows 1 / 4 and *Not ready to submit*; *The Last Ferry* shows component b *Needs fixing*; the M0 Dossier gauge equals the SC-27 percentage on every project.

### Tests for User Story 2 (write first, see them fail) ⚠️

- [X] T044 [P] [US2] Create unit test of the dossier check on node:sqlite in tests/unit/dossier-check.test.js (BR-005, FR-008, FR-009, US-2 Sc1–2):
  - US-2 Sc1: *Rice and Salt* → `present = 1`, `completeness_pct = 25`, `verdict = not_ready`, the three other components listed with their actions;
  - US-2 Sc2: *The Last Ferry* component b `needs_fix`; inside a rolled-back transaction its slot set to `present` still reads `needs_fix` while a paragraph is `machine` (SR-086); its c slot set to `present` reads `pending` because no request is `confirmed` (SR-085);
  - order a–d (`A13_APPLICATION`, `A13_SCRIPT_VI`, `A13_SERVICE_AGREEMENT`, `A13_ART9_COMMITMENT`); missing slot → `missing`; segment C → `applies = false`;
  - BR-005: lib/dossier/ and lib/db/*dossier* import nothing from lib/content-check/ or a model client
- [X] T045 [P] [US2] Create unit test of the Dossier gauge in tests/unit/dossier-gauge.test.js (FR-010, SC-005): on every seed project the M0 `dossier_score` equals `completeness_pct` of `v_dossier_check`; the view renders for node:sqlite and PostgreSQL with no placeholder; every existing M0 readiness test stays unchanged
- [X] T046 [P] [US2] Create contract test of `GET /api/projects/:id/dossier` in tests/contracts/dossier-api.test.js (contracts/project-checks-api.contract.md): 200 shape, 401 guest, 404 non-member and malformed id, `applies = false` for segment C
- [X] T047 [P] [US2] Create unit test of the SC-27 view rules in tests/unit/dossier-view.test.js: verdict keys never say *passed* or *approved*; every state has icon and text; *checked automatically* and *needs a person* are separate lists and no item declares a signature or seal valid (SR-083); row a names *Mẫu số 01, Phụ lục I, Thông tư 17/2022/TT-BVHTTDL*, row d *Phụ lục IV* (Q9); links to screens not built are plain text
- [X] T048 [P] [US2] Create static test of the re-created views in tests/unit/m2-migration-views.test.js (analysis I3): the migration defines `v_dossier_check` with the body of lib/db/dossier-view.sql rendered for PostgreSQL and re-creates `app.project_readiness` from the current lib/db/readiness-view.sql with the grants of the M0 migration (FR-010, BR-005)

### Implementation for User Story 2

- [X] T049 [P] [US2] Write lib/db/dossier-view.sql (`v_dossier_check`, rendered like lib/readiness/render-view.js) and lib/dossier/check.js (shape, verdict, auto/person lists, actions) (verifies T044)
- [X] T050 [US2] Make lib/db/readiness-view.sql read the Dossier gauge from `v_dossier_check`, and re-create both views in supabase/migrations/20261108000100_m2_check.sql from the rendered templates (tests/unit/readiness-render.test.js reads the newest migration that defines the view); run on PGlite (FR-010) (verifies T045)
- [X] T051 [US2] Implement `getDossier()` in lib/db/dossier.js and both sources, and app/api/projects/[id]/dossier/route.js (verifies T046)
- [X] T052 [US2] Build SC-27 in app/projects/[id]/dossier/page.js (elements #1–#12; table, stacked cards under 600 px; `role="status"` verdict); sidebar item *Article 13 dossier*; M0 next-step link `dossier.add_missing`; `dossier.*` texts in lib/i18n (verifies T047, T028)
- [ ] T053 [US2] Quickstart slice 3 on `cinematch-dev` (Nam Tran, seed member); results in specs/008-m2-check/quickstart.md §Results (US-2)

**Checkpoint**: US-2 works; SC-12 and SC-27 agree.

---

## Phase 6: User Story 4 — See my licensing timeline (Priority: P2)

**Goal**: SC-29 shows the recommended submission date and the latest deadline in working days, both paths and the holidays in the window; owner and edit members change the shooting day and the buffer; SC-12 and SC-27 show the same dates (FR-017, FR-018, BR-006, SC-005, Q1, D1, D8, D10, D13).

**Independent Test**: *The Last Ferry* (15/03/2027, buffer 7) shows recommended 05/01/2027 and latest 02/02/2027 with Tết 2027 marked *expected*; buffer 14 moves both dates; *Quiet Harbour Blues* shows *passed*.

### Tests for User Story 4 (write first, see them fail) ⚠️

- [X] T054 [P] [US4] Create unit test of the timeline in tests/unit/licensing-timeline.test.js (BR-006, FR-017, FR-018, US-4 Sc1, D1): 15/03/2027, buffer 7 → `buffer_start` 2027-03-08, `latest` 2027-02-02, `recommended` 2027-01-05; smooth from recommended → 2027-02-01, one resubmission → 2027-03-05; from latest one resubmission → 2027-04-02 (after the shooting day, M5 US-3); holidays in the window with `expected`; *Quiet Harbour Blues* on 07/11/2026 → `recommended_passed`, days counted; segment C and no shooting day → `applies = false` / empty; no field or key named *safe*
- [X] T055 [P] [US4] Create unit test of the buffer change in tests/unit/project-buffer.test.js (D10, M0 question 2): `validateProjectUpdate` accepts `buffer_days` 0, 7, 14, 21 and refuses others with `projects.error.buffer_days`; on node:sqlite owner and edit members save it, a view member is refused, an archived project is refused; all existing M0 tests unchanged
- [X] T056 [P] [US4] Create contract test in tests/contracts/timeline-api.test.js: `GET /api/projects/:id/timeline` shape, 401, 404; `PATCH /api/projects/:id` with `buffer_days` 200 and 422 (D10)
- [X] T057 [P] [US4] Create unit test of the SC-29 view rules in tests/unit/timeline-view.test.js: the recommended-date card comes first and has the largest text; the table alternative lists milestone – date – days remaining; the holiday band only inside the processing window; *passed N days ago* with the consultation link; milestones *partner confirmed* and *Vietnamese version done* show their state (R5); keys exist in both languages
- [X] T058 [P] [US4] Create static test of the buffer change in tests/unit/m2-migration-buffer.test.js (analysis I3): `CREATE OR REPLACE public.app_update_project` keeps the signature and grants of the M0 migration, accepts `buffer_days` 0, 7, 14, 21 only, still needs owner or edit and refuses an archived project (D10)
- [X] T059 [P] [US4] Create unit test of deadline consistency in tests/unit/deadline-consistency.test.js (SC-005, SR-173, D13, analysis C2): for every seed project with a first shooting day the SC-12 strip data, the SC-27 deadline line and the SC-29 timeline give the same recommended and latest dates; the three read `licensingTimeline()` of lib/licensing/timeline.js (no second calculation in app/ or lib/); segment C and no shooting day show no date on any of them

### Implementation for User Story 4

- [X] T060 [P] [US4] Implement lib/licensing/timeline.js `licensingTimeline()` on lib/dates/working-days.js (verifies T054)
- [X] T061 [US4] Extend M0 for the buffer: `buffer_days` in lib/projects/input.js and the node:sqlite update in lib/db/sqlite/projects.js; `CREATE OR REPLACE public.app_update_project` (same signature) in supabase/migrations/20261108000100_m2_check.sql, run on PGlite; `projects.error.buffer_days` in lib/i18n (D10) (verifies T055)
- [X] T062 [US4] Implement `getTimeline()` in lib/db/timeline.js and both sources (`public_holiday` read by signed-in users) and app/api/projects/[id]/timeline/route.js (verifies T056)
- [X] T063 [US4] Build SC-29 in app/projects/[id]/timeline/page.js, timeline-client.js (vertical list under 900 px, axis above; date and buffer controls for owner/edit through `PATCH /api/projects/:id`); sidebar item *Countdown*; link from SC-27; `timeline.*` texts in lib/i18n with *Recommended submission date* / *Hạn nộp khuyến nghị (có dự phòng)* (D8) (verifies T057, T028)
- [X] T064 [US4] Show the deadline on SC-12 (#10, *Recommended submission date: {date} — {n} days left* or *passed*) in app/projects/[id]/dashboard-client.js with its data from `licensingTimeline()` in the dashboard loader app/projects/[id]/page.js, and the deadline line with a link to SC-29 on SC-27 (app/projects/[id]/dossier/page.js); `dashboard.deadline.*` texts with the D8 wording (D13) (verifies T059)
- [ ] T065 [US4] Quickstart slice 4 on `cinematch-dev` (Nam Tran, seed member); results in specs/008-m2-check/quickstart.md §Results (US-4)

**Checkpoint**: all four stories work independently.

---

## Phase 6b: User Story 5 — Read requirements without an account (Priority: P3)

**Goal**: a visitor browses the approved rules by topic and segment and opens one rule with its bilingual description and citation (FR-015, FR-016, US-5, D15, D17).

**Independent Test**: filtering by segment A lists only approved, active rules whose `segments` include A, each with both descriptions and its citation; draft and retired rules never appear.

### Tests for User Story 5 (write first, see them fail) ⚠️

- [X] T072 [P] [US5] Create unit test of the requirements library on node:sqlite in tests/unit/requirements-data.test.js (FR-015, FR-016, US-5 Sc1): `listRequirements({ segment: 'A' })` lists exactly the approved, active revisions whose `segments` include A (computed from the seed and sample files), each with `title_*`, `description_*`, `citation`, `rule_version`, `is_sample`; topic counts; `getRequirement(slug)` returns the revision in force with both descriptions, guidance, citation and at most 3 related approved rules; a draft-only or unknown code → `NOT_FOUND`; a retired code still opens, marked retired with its version and date (SC-31 SR-293; the earlier wording *retired → NOT_FOUND* contradicted the screen spec, corrected 10/11/2026)
- [X] T073 [P] [US5] Create contract test of `GET /api/requirements?topic=&segment=` and `GET /api/requirements/:slug` in tests/contracts/requirements-api.test.js: 200 for a guest, 422 for an unknown topic or segment, 404 unknown slug
- [X] T074 [P] [US5] Create unit test of the SC-30 and SC-31 view rules in tests/unit/requirements-view.test.js: the *Sample* label on sample rules; severity labels; the citation never empty; keys in both languages

### Implementation for User Story 5

- [X] T075 [US5] Implement `listRequirements()`, `getRequirement()` in lib/db/requirements.js and both sources (public read of approved, active revisions) and app/api/requirements/route.js, app/api/requirements/[slug]/route.js (verifies T072, T073)
- [X] T076 [US5] Build SC-30 in app/requirements/page.js and SC-31 in app/requirements/[slug]/page.js; the rule code on SC-48 and SC-37 and *View the regulations library* on SC-03 become links; header link *Requirements*; `requirements.*` texts in lib/i18n (verifies T074)
- [ ] T077 [US5] Quickstart slice 5 on `cinematch-dev` (Nam Tran, signed out); results in specs/008-m2-check/quickstart.md §Results (US-5)

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T066 [P] Check every new text: `node scripts/check-i18n.mjs`, tests/unit/i18n-no-hardcoded.test.js; every screen at 360 px width (in an iframe of that width, build-log Entry 10)
- [ ] T067 Run `npm test`, `npm run build`, `npm run test:rls`, `npm run check:supabase`, `uv run tools/start_feature.py --check`, `python3 tools/build_supabase.py --check`, `python3 data/seed/check_seed.py`, `python3 data/schema/load_check.py`; time 20 invented summaries through `POST /api/precheck` with the keyword match (SC-001, under 30 s each; with Gemini on a paid key if Nam Tran provides one) and write which path was timed (keyword match or Gemini, analysis C4); record each result in specs/008-m2-check/quickstart.md §Results
- [X] T068 Add the build-log entry (feature row, run entry with who ran and who reviewed — reviewer cells left empty until a person reviews, agent mistakes in §4, spec-issue rows for research Open questions 1–13) in docs/build/build-log.md and the AI-use row in docs/ai-use-log.md

---

## Not in this plan

- US-5: requirements library SC-30, SC-31 (FR-015, FR-016, Should) — research Open question 3.
- SC-29 #13 reminder emails and the `.ics` file (SYS F-SYS-08).
- M5 uploads, the bilingual draft and proofreading (component states are read from M5 data).
- Redrawing the mockup images of SC-12, SC-29 and SC-37 (`build_docs.py --img`, Playwright not installed).
- Refreshing the closed snapshots specs/003-sys-core/spec.md and specs/005-m0-workspace/spec.md (closed features, as build-log §3 row 53).

---

## Traceability: rule or scenario → test → code

| Rule / scenario | Test (written first) | Code that turns it green |
|---|---|---|
| BR-001 — only cited, signed rules; verbatim quotes | T003, T025, T029, T030 | T007, T035, T039, T041 |
| BR-002 — signing needs citation and approver (database CHECK) | T003, T017, T013, T014 | T007, T019, T020, T021 |
| BR-003 — banned words in results; no *safe* for deadlines (D8) | T028, T032, T047, T057 | T035, T042, T052, T063 |
| BR-004 — level by code, Q4 thresholds | T024, T029 | T035, T038, T039 |
| BR-005 — dossier by fixed rules, no model | T044 | T049, T051 |
| BR-006 — working days, buffer in calendar days (Q1, D1) | T005, T054 | T011, T060 |
| BR-007 — version stored on every check | T003, T004, T029, T031 | T007, T038, T039, T040 |
| BR-008 — retired, never deleted; old finding keeps its revision | T003, T004, T013, T014 | T007, T019, T020 |
| Q2 — one signer | T013 | T020 |
| Q3 — notify only, Content gauge −30 | T013, T031 | T020, T040 |
| Q6 — no text stored | T003, T029, T030 | T007, T039 |
| Q13 — revision keeps the signed text in force; retire makes a version | T013 | T019, T020 |
| D6 — version label sorts in time | T006 | T012 |
| D7 — rate limit | T030 | T037, T041 |
| D9 — only `vfda_legal` signs; admin 403 | T017, T013, T014 | T019, T020, T021 |
| D10 — buffer editable (M0 question 2) | T055, T056, T058 | T061 |
| FR-010 / SC-005 — same dossier number on SC-12 and SC-27 | T045, T048 | T050 |
| FR-011 — model only locates passages; keyword fallback | T026 | T036 |
| FR-012 / D11 — dropped findings counted on the run, no text | T003, T025, T029, T030, T034 | T007, T035, T038, T039 |
| D12 — consent before advanced analysis | T026, T030, T032 | T036, T039, T042 |
| SC-005 / D13 — same deadline on SC-12, SC-27, SC-29 | T059 | T064 |
| FR-014 — mark reviewed | T031 | T038, T040 |
| US-1 Sc1–3 | T029, T030, T032 | T039, T041, T042 |
| US-2 Sc1–2 | T044, T046 | T049, T051, T052 |
| US-3 Sc1–2 | T013, T014, T029 | T019, T020, T021 |
| US-4 Sc1 | T054, T056 | T060, T062, T063 |

---

## Dependencies & Execution Order

- **Phase 1** → **Phase 2** (blocks every story) → **US-3** → **US-1** → **US-2** → **US-4** → **Phase 7**. US-2 and US-4 depend only on Phase 2 and may run before or alongside US-1 if needed; US-1 needs signed rules (US-3) for its online slice.
- T007 changes `data/` through the generators (approved 07/11/2026); data-owner review before merge. T023, T043, T053, T065 and the online part of T067 need `npx supabase db push --remote` and `node scripts/seed-supabase.mjs --reset` by Nam Tran, and the seed `vfda_legal` and admin accounts in Auth for T023.
- Tests first within each phase: T003–T006 before T007–T012; T013–T017 before T018–T022; T024–T034 before T035–T042; T044–T048 before T049–T052; T054–T059 before T060–T063 and T064.
- Order between tasks:
  - T002 before T022 (SC-37 source first);
  - T007 before T008 before T009 (the migration matches the regenerated schema and policies); T009 before every Supabase source and every function task (T019, T038, T050, T061);
  - T011 before T060; T012 before T019;
  - T018 before T020 before T021 before T022;
  - T035, T036, T037 before T039 before T041 before T042; T038 before T039, T040;
  - T049 before T050, T051; T051 before T052;
  - T060, T061 before T062 before T063; T060 and T052 before T064.
- No test is changed to make it pass; when a test turns out wrong, the reason is reported and the change approved first.

### Parallel opportunities

- Phase 2 tests T003–T006 together; then T010, T011, T012 in parallel after T009.
- US-3 tests T013–T017 together; T018 in parallel with T019.
- US-1 tests T024–T034 together; T035, T036, T037 in parallel.
- US-2 tests T044–T048 together; US-4 tests T054–T059 together; T060 in parallel with T061.

### Parallel example: User Story 1

```text
T024 tests/unit/attention-level.test.js
T025 tests/unit/precheck-verify.test.js
T026 tests/unit/precheck-matcher.test.js
T027 tests/unit/precheck-input.test.js
T028 tests/unit/banned-words.test.js
T029 tests/unit/precheck-data.test.js
T030 tests/contracts/precheck-api.test.js
T031 tests/unit/content-checks-data.test.js
T032 tests/unit/precheck-view.test.js
T033 tests/rls/rls.test.js (online, run later by npm run test:rls)
T034 tests/unit/m2-migration-precheck.test.js
— all seen failing — then:
T035 lib/content-check/{input,attention,verify,wording}.js ‖ T036 matcher ‖ T037 rate limit
T038 migration functions → T039 lib/db/precheck.js → T040 lib/db/content-checks.js → T041 routes → T042 SC-03, SC-48
```

### Parallel example: User Story 4

```text
T054 tests/unit/licensing-timeline.test.js
T055 tests/unit/project-buffer.test.js
T056 tests/contracts/timeline-api.test.js
T057 tests/unit/timeline-view.test.js
T058 tests/unit/m2-migration-buffer.test.js
T059 tests/unit/deadline-consistency.test.js
— all seen failing — then:
T060 lib/licensing/timeline.js ‖ T061 M0 buffer_days → T062 lib/db/timeline.js + route → T063 SC-29 → T064 SC-12 strip, SC-27 line
```

---

## Implementation Strategy

1. **Foundation**: Phases 1–2 — the data change and the shared date and version functions, checked against the seed.
2. **Rule base first** (US-3): nothing else may cite a rule the Legal Board has not signed.
3. **MVP for guests** (US-1): the public pre-check with cited findings and the project save; demo it before going on.
4. **Dossier** (US-2), then **timeline** (US-4), each ending with its quickstart slice.
5. Stop after any phase with green tests; record the result and the open questions in the build log.
