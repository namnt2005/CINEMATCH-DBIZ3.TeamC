# Research: Content pre-check and Article 13 dossier check (M2)

Feature: `008-m2-check` · [plan.md](plan.md) · Decisions D1–D4 by Nam Tran (07/11/2026); D5–D7 interim, by the agent, to confirm.

Every *NEEDS CLARIFICATION* of the Technical Context is resolved below or carried as an open question with an interim choice. Nothing here adds a requirement: where the spec is silent, the choice is the narrowest one that satisfies the FR, and it is listed under *Open questions*.

## R1 — Rule base, signing and rule-set versions (US-3, FR-001..FR-004, BR-002, BR-007, BR-008, Q2, Q13, D2, D6)

- **Decision**: one `legal_rule` row per **revision** (D2). A new rule is revision 1, `status = draft`, no `rule_version`, no approver. *Approve and sign* (`app_sign_rule`) sets `approved_by = auth.uid()`, `approved_at`, `status = approved`, `is_active = true`, creates one `rule_set_version` row and stores it in the revision's `rule_version`; when another revision of the same code was approved, that one becomes `retired`, `is_active = false`, `retired_version` = the new version, in the same transaction. *Retire* (`app_retire_rule`) also creates a version (Q13) and fills `retired_version`. *Create revision* (`app_revise_rule`) copies the approved revision's texts into revision n+1 as a draft; the signed revision stays in force (Q13). One draft per code at a time. Nothing is ever deleted (BR-008).
- **The database refuses** — not only the button: signing does not pre-check the citation; the update meets `ck_legal_rule_approved_needs_signature` (BR-002) and the error `23514` on that constraint becomes `CITATION_REQUIRED` with `fields.citation` (US-3 Sc1). The other required fields (both titles, descriptions, *Points to consider*) are checked by the function before the update (SC-37 #21) and answer `VALIDATION_ERROR`.
- **One signer is enough** (Q2): the author may sign; the audit log keeps who saved and who signed (`rule.save`, `rule.sign`, `rule.revise`, `rule.retire`, one row per action in the same transaction, SC-37 SR-305).
- **Version label** (D6, spec OQ14): Vietnam date `YYYY.MM` for the first version of a month (the seed's `2026.06`…`2026.08`), then `YYYY.MM.02`, `.03`… Text order equals time order (`'2026.11' < '2026.11.02' < '2026.11.10' < '2026.12'`), so M0's `MAX(rule_version)` keeps naming the current set; one shared `nextRuleVersion()` and its SQL twin.
- **Who**: reading the full rule base and writing — `vfda_legal`; `admin` may read (SYS Clarifications Q5) but not sign or retire (D9, 403); everyone reads approved, active revisions (existing policy `legal_rule` select for `anon`, `signed_in`).
- **Alternatives considered**: a separate revision table (rejected by Nam Tran: two places hold rule text); editing the approved row in place (breaks BR-008 and Q13).

## R2 — Content pre-check pipeline (US-1, FR-005, FR-006, FR-011, FR-012, BR-001, BR-004)

1. **Input** (`lib/content-check/input.js`): 20–200 words after trimming extra whitespace (word = run of non-space characters, the SC-03 #4 counter uses the same function); `lang` `en`/`vi` (SC-03 #5; auto-detected on the screen, the user may change it); `flags` optional, each of `real_person`, `military`, `heritage_site` one of `yes`/`no`/`unsure` (SR-063: *unsure* = no information). Flags are stored (FR-007) and never change the result.
2. **Active rule set**: the approved, active revisions and the current `rule_set_version` (read by the System actor).
3. **Find passages** (`matcher.js`): Gemini (R3) or the keyword match (R3) returns only `{ rule_code, quoted_text }` pairs. Neither writes explanations.
4. **Verify by code** (`verify.js`, FR-012, BR-001): keep a pair only when `rule_code` is an approved, active rule **of the set read in step 2** with a non-empty citation and an approver, and `quoted_text` (trimmed, non-empty, ≤ 500 characters) occurs **verbatim** in the submitted text; the span is its first occurrence not already used by the same rule; duplicates (rule, span) are merged. Everything else is dropped and counted: `dropped_count` and the distinct `dropped_rule_codes` (unknown codes included) are returned and stored on the run, never the dropped text (FR-012 *logged for VFDA*, D11).
5. **Level by code** (`attention.js`, Q4, BR-004): count **verified findings** by their rule's severity — High if `action ≥ 2`; Medium if `action = 1` or `notice ≥ 3`; otherwise Low. Boundaries tested: 0/0 → Low, 0 action + 2 notice → Low, 0 + 3 → Medium, 1 + 0 → Medium, 1 + 5 → Medium, 2 + 0 → High.
6. **Card text**: title, severity label, citation, rule code, *Points to consider* and the explanation all come verbatim from the cited revision (SC-48 #7–#10, SR-073); the explanation shown is the rule's `description_vi/en`.
7. **Result states** (spec §3, SC-48 §4): ≥ 1 finding → level + cards; 0 found and 0 dropped → *Low* with *No points needing attention were found under rule set {version}*; 0 kept but ≥ 1 dropped → **no level**, *Could not check this time* (the seed run `cc6bcb72`); matcher and fallback both failed → *Could not check right now — your text is kept*, nothing stored.
8. **Record** (FR-007, D3, D11): one `precheck_run` (hash, lang, flags, `country_guess`, level or null, `rule_version`, `dropped_count`, `dropped_rule_codes`, `created_at`) and one `precheck_finding` per kept finding (`rule_id`, `span_start`, `span_end`), by the System actor through `app_record_precheck`, which recomputes the level from the rows it receives (BR-004 twice: in JS and in SQL).
- **Alternatives considered**: a model score or model-written explanation (forbidden by BR-004, SR-072, SR-073); fuzzy quote matching (a quote that is not verbatim could be invented — FR-012 says *does not appear*).

## R3 — The language model and the fallback (FR-011, edge case *model down*, D4)

- **Decision**: `LLM_PROVIDER=gemini`, `GEMINI_PAID_TIER=true` **and** the user's tick on SC-03 (D12, `consent_advanced: true` in the request; the box is shown only on the paid plan) → Gemini through `@google/genai` (as `lib/extraction/gemini-extractor.js`), structured output with a JSON schema `{ findings: [{ rule_code: enum of the active codes, quoted_text: string }] }`, the prompt listing only the active rules' code, title, description and keywords (FR-011: *only the codes of approved rules*), with the instruction to copy passages exactly and to return an empty list rather than guess; timeout 15 s. Any error (missing key, timeout, 429, network, invalid JSON) → the **keyword match**. `LLM_PROVIDER=mock` (tests, default), no paid plan, or no tick → the keyword match directly, without calling the model.
- **Keyword match** (`keyword-matcher.js`, D4): for each active rule with keywords in the summary's language (`keywords_vi` for `vi`, `keywords_en` for `en`), every case-insensitive whole-word occurrence in the text is a pair `{ rule_code, quoted_text: the text as written at that span }`; deterministic, no model. A rule without keywords for that language is not matched. The result then goes through the same verification and level as R2.
- **Transparency**: SC-48 #2 says which method ran (*checked by keyword matching because the language model was not available*), from `lib/i18n`.
- **Privacy**: the summary leaves the server only to Gemini on a paid key (the rule `.env.example` already applies to scripts, spec-M5 Q3); never logged; the key never in a result or a log line.
- **Alternatives considered**: no fallback (rejected by the request); developer-written keyword file (rejected by Nam Tran, D4).

## R4 — Working days and the licensing timeline (US-4, FR-017, FR-018, BR-006, Q1, D1)

- **Decision**: `lib/dates/working-days.js`:
  - `holidaySet(rows)` — every date from `start_date` to `end_date` of `public_holiday`, with `is_expected`;
  - `isWorkingDay(date, holidays)` — not Saturday, not Sunday, not in the set;
  - `workingDaysBefore(date, n, holidays)` — step back one calendar day at a time from `date` (not counted) and return the day on which the n-th working day is reached;
  - `workingDaysAfter(date, n, holidays)` — the n-th working day counting `date` as day 1 when it is a working day (so a period of n working days that starts on the submission day ends on the returned day).
  Pure functions on `YYYY-MM-DD` strings (no time zone), shared with M0 and M5 (SR-173).
- `lib/licensing/timeline.js` — `licensingTimeline({ shoot_date, buffer_days, segment }, holidays, today)`:
  - `buffer_start = shoot_date − buffer_days` (calendar, D1);
  - `latest = workingDaysBefore(buffer_start, 20)`;
  - `recommended = workingDaysBefore(latest, 20)` (the *recommended submission date*, D8);
  - the two paths of FR-018 from a submission date (by default `recommended`): smooth `result_by = workingDaysAfter(submit, 20)`, one resubmission `result_by_worst = workingDaysAfter(submit, 40)`;
  - the holidays that fall in the processing window, with *expected*;
  - days remaining to `recommended` and `latest`; `recommended < today` → *passed N days ago* (SC-29 Error state); segment C → no countdown (SC-29 Empty state); no `shoot_date` → empty state.
- **Counting rule (interim)**: the submission day counts as day 1 when it is a working day, i.e. [latest, buffer_start) holds exactly 20 working days (Open question 5).
- **US-4 Scenario 1 (D1)**: 15/03/2027, buffer 7 → `buffer_start` 08/03/2027, `latest` **02/02/2027** (Tết 05–10/02/2027 skipped), `recommended` **05/01/2027**; from 05/01 the one-resubmission result is 05/03/2027 (before 08/03), from 02/02 it is 02/04/2027 (after the shooting day — the M5 US-3 warning). Seed boundary *Quiet Harbour Blues* (10/11/2026, buffer 7): latest 06/10/2026, recommended 08/09/2026 — both passed on 07/11/2026.
- **Dates outside the table** (e.g. a holiday year not yet loaded) count as working days; SC-29 marks `is_expected` holidays *expected* (SR-174).
- **Alternatives considered**: calendar days (the spec's old numbers; against Q1); buffer in working days (not chosen, D1).

## R5 — SC-29 contents

- Shows: first shooting day and buffer, editable by owner and edit members, read only for view members. M0 cannot change `buffer_days` today (`lib/projects/input.js` and `app_update_project` accept `shoot_date` but not the buffer): per M0 question 2 (D10, 07/11/2026) the feature adds `buffer_days` ∈ {0, 7, 14, 21} (SC-29 #4) to both, in a new `CREATE OR REPLACE` of `app_update_project` with the same signature, with its node:sqlite twin; the recommended submission date and latest deadline cards, both path bars, today line, holiday band, the Article 13 clause 4 basis line.
- Milestones *partner confirmed* (M4 `collab_request.confirmed_at`) and *Vietnamese version done* (M5 paragraphs all reviewed) show their **current state** (done on date / not yet), not a target date: the spec gives no rule for target dates (Open question 7).
- Not built: *Remind me by email · Add to calendar* (SC-29 #13, SYS F-SYS-08).

## R6 — Roles and Row Level Security

- `legal_rule`: existing read policies kept (public: approved and active; `vfda_legal`: all). The generated insert/update policies for `vfda_legal` stay, but direct `INSERT`, `UPDATE`, `DELETE` are revoked from `anon` and `authenticated` on every M2 table — writes only through the functions (as M0 and M4; narrower than the generated matrix).
- Signing and retiring: `app.current_role() = 'vfda_legal'` exactly — not the admin hierarchy of `app.has_role` — because BR-002 makes signing the Legal Board's act (D9, exception to SYS question 5); the API answers 403 to `admin`.
- `precheck_run`, `precheck_finding`: written by the System actor only (a guest has no account). Today nobody may read `precheck_run`, `compliance_run` or `rule_set_version` (no grant): the feature adds, at the source `tools/rls_policies.py`, select for members of the linked project (`precheck_run`, `compliance_run`) and a select on `rule_set_version` for signed-in users; guests read the version label through `GET /api/precheck/basis` (System actor), so the five `anon` tables stay as `tests/unit/rls-coverage.test.js` requires — data-model §7.
- `compliance_run`, `compliance_finding`: written through `app_save_content_check` (owner or edit of a non-archived project) and `app_review_finding` (owner or edit); the existing member update grant on `compliance_finding` is revoked.

## R7 — Saving a check to a project; marking findings reviewed (FR-013, FR-014, D3, D5)

- *Save to project* sends the text (still in the browser) and the kept findings; the server checks the session, the permission (owner or edit; `ARCHIVED` refused), that the rule set is still the one the result used (`RULE_SET_CHANGED` otherwise — the member re-checks), and re-verifies every finding (R2 step 4). Then one `compliance_run` with the version, its `compliance_finding` rows (`rule_id`, `quoted_text`, `finding_status = open`) and one `precheck_run` with `project_id` (FR-007). The text itself is not stored.
- `/projects/[id]/content` (SC-48 for a project) shows the latest run and its findings with their quoted passages; *Mark reviewed* with an optional note ≤ 1 000 characters (FR-014), owner or edit. The Content gauge then follows M0's formula (30 run exists + 30 current version + 40 × reviewed share).
- **Alternatives considered**: re-running the model on save (the saved findings could differ from what the member saw); a signed result token (needs one more secret).

## R8 — Dossier check (US-2, FR-008..FR-010, BR-005, SC-27 SR-081..SR-086)

- **Decision**: one SQL view `v_dossier_check` (file `lib/db/dossier-view.sql`, SQLite and PostgreSQL text as M0's readiness view), per project and per Article 13 document type in the order a–d — `A13_APPLICATION`, `A13_SCRIPT_VI`, `A13_SERVICE_AGREEMENT`, `A13_ART9_COMMITMENT` — with the component state:
  - the stored `document_slot.state`, or `missing` when there is no slot;
  - b (`A13_SCRIPT_VI`): `present` becomes `needs_fix` while any `bilingual_paragraph` of that document is not `reviewed` (SR-086);
  - c (`A13_SERVICE_AGREEMENT`): `present` becomes `pending` while the project has no `confirmed` collaboration request (SR-085).
- `completeness_pct = 25 × present`; verdict *All 4 components present* / *Not ready to submit* (never *passed*, *approved*); for each component what was checked automatically and what needs a person (SR-083: never declares a signature or seal valid). No model call (BR-005; a test fails if the dossier code imports the matcher).
- **FR-010**: M0's readiness view reads `v_dossier_check` for the Dossier gauge instead of counting slots itself, so SC-12 and SC-27 cannot differ (on the seed both give the same numbers; the M0 tests stay unchanged).
- **US-2 on the seed**: *Rice and Salt* (only the application present) → 1 / 4, *Not ready to submit*, three missing; *The Last Ferry* b = *Needs fixing* (8 machine paragraphs).
- Segment C has no Article 13 component (document types for A and B): SC-27 says so and shows no table.

## R9 — Rule-set change: notify, never re-check (Q3)

- After every new version (sign or retire) the server notifies the owners of non-archived projects whose latest compliance run used an older version: event `rule_set.new_version`, payload `{ project, rule_version }`, in-app (SYS notification); no automatic run. The Content gauge drops by its 30 *current rule set* points through M0's existing formula; the next step becomes *Re-check with the new rules* (`content.recheck_new_rules`, existing).
- An old result keeps its version label and shows the text of the revision it cited (BR-007, BR-008).

## R10 — Article 13 forms (Q9)

- SC-27 row a names *Mẫu số 01, Phụ lục I, Thông tư 17/2022/TT-BVHTTDL* (in force from 15/02/2023, amended by Thông tư 11/2023/TT-BVHTTDL) and row d the *Phụ lục IV* commitment on Article 9; *Download template* uses `document_type.template_url` (seed links are placeholders).
- The agent does **not** reproduce the official forms or write the unofficial English reading aid from memory: the official text must come from the gazette and VFDA confirms the version (Q9). The reading aid is a task for a person (Open question 8).

## R11 — Banned words (BR-003, SC-48 SR-074, SC-27 #5)

- `lib/content-check/wording.js` lists the banned words in English (*approved, accepted, legally compliant, safe, passed, permitted*) and Vietnamese (*được duyệt, được phê duyệt, được chấp thuận, chấp nhận, hợp pháp, an toàn, đạt, được phép*). A test reads every dictionary key used by SC-48 and SC-27 and every result message of the APIs, in both languages, including the no-finding and all-dropped texts, and fails on any banned word.
- SC-37 (the rule status *Approved*) is not a result. Deadlines (D8): *Recommended submission date* / *Hạn nộp khuyến nghị (có dự phòng)*; the same test fails if an SC-29, SC-27 or SC-12 deadline text in either language contains *safe* / *an toàn*.

## R12 — Rate limit (FR-005, edge case, D7)

- `lib/content-check/rate-limit.js`: a sliding 24 h window per IP (from `x-forwarded-for`, first address), 10 for guests, 50 for signed-in users; 429 `RATE_LIMITED` with *You have used today's checks — create a free account to continue* (guests) or *…try again tomorrow* (signed in). In memory per server instance — on Vercel every instance counts on its own and counts are lost on restart; the IP is never stored (D7, Known limitation 2); the first `x-forwarded-for` address is trusted only because the platform sets it (Known limitation 7).

## R13 — Screens and routes

| Screen | Route | Who |
|---|---|---|
| SC-03 | `/pre-check` | anyone |
| SC-48 (guest) | `/pre-check/r/[id]` | anyone with the link; text and highlights only from the browser session (D3) |
| SC-48 (project) | `/projects/[id]/content` | project members; owner/edit mark reviewed (no Screen Spec route — Open question 4) |
| SC-27 | `/projects/[id]/dossier` | project members |
| SC-29 | `/projects/[id]/timeline` | project members; owner/edit change date and buffer |
| SC-37 | `/admin/legal-rules` | `vfda_legal` (write), `admin` (read) |

Project sidebar items *Content check*, *Article 13 dossier*, *Countdown*; the M0 next-step links (`content.*`, `dossier.add_missing`) point to these routes.

## R14 — Hash and demand data (FR-007, Q6)

- `synopsis_hash` = SHA-256 (hex) of the trimmed text with whitespace collapsed; `country_guess` from the platform country header when present, otherwise empty; never the IP. Not used to improve the rule base (Q6).

## Open questions

| # | Question | Interim choice | Owner |
|---|---|---|---|
| 1 | The request said *36 FR*; the spec has 18 FR (§5.1 has 37 field rows). | Plan built on the 18 FR. | Group C |
| 2 | ~~SC-29 #5 label with *safe*~~ | Resolved 07/11/2026 (D8): *Recommended submission date*, changed at the sources. | — |
| 3 | ~~US-5 outside this request~~ | Resolved 09/11/2026 (D17): US-5 in scope; SC-30, SC-31 built; rule codes on SC-48 and SC-37 link to SC-31. | — |
| 4 | SC-48 for a project run has no route in the Screen Spec. | `/projects/[id]/content`. | Screens owner |
| 5 | Does the filing day count in the 20 working days (Article 13 clause 4)? | Yes. | VFDA Legal Board |
| 6 | ~~May `admin` sign rules?~~ | Decided 07/11/2026 (D9, provisional): no — 403; exception written to SYS question 5. | VFDA to confirm |
| 7 | SC-29 milestones *partner confirmed*, *Vietnamese version done*: target dates or state? | Current state. | Group C |
| 8 | The official forms (Q9) and the unofficial English reading aid. | Names and basis on SC-27; texts from VFDA / the gazette, not written by the agent. | VFDA, Group C |
| 9 | Spec OQ5 (error branches) and OQ7 (daily limit). | R2 step 7; D7 (10 guest, 50 signed in). | VFDA, Group C |
| 10 | Spec OQ8 (clause-level citations) and OQ14 (version format). | Seed citations; D6. | VFDA Legal Board, Group C |
| 11 | Does the Gemini free tier ever receive a summary (SYS privacy, M5 Q3)? | Only with `GEMINI_PAID_TIER=true`. | Group C / VFDA |
| 12 | Count of findings or of distinct rules for the level (Q4 says *findings*)? | Findings. | VFDA Legal Board |
| 13 | Data-model M2 open questions: who writes COMPLIANCE_RUN; does F-M2-12 verify both checks; LEGAL_RULE ↔ RULE_SET_VERSION one-to-many; who retires; key by revision. | D5; yes; one-to-many with `rule_version` and `retired_version`; `app_retire_rule` by `vfda_legal`; D2. | M2 owner, data owner |
| 14 | Q3 says *open projects*; R9 notifies only owners of non-archived projects whose latest content check used an older version (projects without a run have nothing to re-check). | As R9. | VFDA |
