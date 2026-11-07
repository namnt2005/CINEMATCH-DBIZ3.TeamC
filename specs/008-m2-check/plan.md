# Implementation Plan: Content pre-check and Article 13 dossier check (M2)

**Branch**: `008-m2-check` | **Date**: 07/11/2026 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-m2-check/spec.md` (snapshot of `docs/spec/spec-M2.md`: US-1..US-5, FR-001..FR-018, BR-001..BR-008, Clarifications Q1–Q4, Q6, Q9, Q13 of 28/10/2026). The request named *36 FR*; the spec has 18 FR (36 is close to the number of §5.1 field rows) — research Open question 1.

## Summary

A guest pastes a 20–200-word story summary on SC-03 and gets, on SC-48, an **attention level** (Low / Medium / High) and one card per finding. A finding exists only when it **cites an active rule written and signed by the VFDA Legal Board**, with its citation and approver, and **quotes a passage that appears verbatim** in the summary; anything else is dropped by code before display (BR-001, FR-012). The language model (Google Gemini) is used only to **find passages that match the signed rules** — it never writes the explanation, the level or any conclusion; when it fails, a **deterministic keyword match** on the keywords the Legal Board signed with each rule takes over (fallback mode). The level is computed by code: **High = 2 or more *action* findings; Medium = 1 *action* finding or 3 or more *notice* findings; otherwise Low** (Q4, BR-004). The words *approved*, *accepted*, *legally compliant* and *safe* never appear in a result (BR-003). The summary is **never stored**: a pre-check keeps `synopsis_hash`, language, flags, level, rule-set version and, per finding, only the rule and the character span (Q6, D3).

A member sees on SC-27 which of the **four Article 13 clause 3 components** are present, computed by fixed rules without a model (BR-005, US-2), and on SC-29 the **recommended submission date** and the **latest submission deadline**: latest = first shooting day − buffer (calendar days) − 20 **working days**; recommended = latest − 20 working days, where working days exclude Saturdays, Sundays and every date in `public_holiday` (Q1, BR-006, D1). One shared function `workingDaysBefore()` serves M2 now and M0 and M5 later (SC-29 SR-173).

The VFDA Legal Board writes rules on SC-37 and signs them alone (Q2). A rule can be signed only with a citation and an approver — a database CHECK (BR-002). Every signature and every retirement creates a **new rule-set version**, and every check stores the version it used (FR-004, BR-007, Q13). Correcting a signed rule creates a **new draft revision**; the signed text stays in force until the revision is signed, and old findings keep pointing at the revision they cited (Q13, BR-008, D2). When the rule set changes, open projects are **not re-checked**: their owners are notified and the Content gauge loses its 30 *current rule set* points until the producer re-runs the check (Q3).

**In this plan**: US-1, US-2, US-3, US-4; FR-001..FR-014, FR-017, FR-018; BR-001..BR-008; screens SC-03, SC-48, SC-27, SC-29, SC-37. **Not in this plan**: US-5 and FR-015, FR-016 (Should — SC-30, SC-31; research Open question 3); deadline reminder emails and the `.ics` file on SC-29 #13 (SYS F-SYS-08); the bilingual draft and uploads themselves (M5); submitting the dossier to the Ministry (phase 3).

## Decisions taken for this plan

| # | Topic | Decision |
|---|---|---|
| D1 | Unit of the buffer; US-4 Scenario 1 (Nam Tran, 07/11/2026) | The buffer is in **calendar days**; the two 20-day periods are working days (Q1). M2 US-4 Scenario 1 is now *15/03/2027, buffer 7 → recommended 05/01/2027, latest 02/02/2027* and BR-006 states the calendar-day buffer (`tools/specs_a.py`, rebuilt 07/11/2026); M5 US-3 the same dates and *filing on 02/02/2027 with one resubmission → result 02/04/2027* (`tools/specs_b.py`). Still to change with the data task: the BR-006 seed evidence in `tools/dm_rules.py` (*The Last Ferry* 05/01 and 02/02/2027; *Quiet Harbour Blues* recommended 08/09/2026, passed). **Data owner (Nguyễn Huy Trung) to review.** |
| D2 | Revisions of a signed rule (Q13, BR-008; data-model M2 OQ-04-24) (Nam Tran, 07/11/2026) | **One row per revision** through the generators: `legal_rule.revision` (from 1), key `(rule_code, revision)` and `(rule_slug, revision)`, at most one `approved` revision per `rule_code`; `legal_rule.retired_version` (the rule-set version that took the revision out). Findings point at the exact revision: `precheck_finding.rule_id` and `compliance_finding.rule_id` replace `rule_code`. SC-37 gets the row action *Create revision* for an approved rule at its source `tools/s5_en.py`. **Data owner (Nguyễn Huy Trung) to review.** |
| D3 | What a pre-check stores (Q6, SYS question 11) (Nam Tran, 07/11/2026) | Guest pre-check: `precheck_run` and, per finding, `rule_id`, `span_start`, `span_end` only — `precheck_finding.quoted_text`, `explanation_vi`, `explanation_en` are removed through the generators. The submitted text and its highlights live only in the browser session. *Save to project* (signed in, owner or edit) stores the findings with their quoted passages in `compliance_finding` of that project, readable by its members only (RLS). **Data owner (Nguyễn Huy Trung) to review.** |
| D4 | Keywords of the fallback match (Nam Tran, 07/11/2026) | `legal_rule.keywords_vi`, `keywords_en` (JSON arrays, optional) through the generators; written by the Legal Board on SC-37 (new field at the source) and signed with the rule. A rule without keywords is never matched in fallback mode. **Data owner (Nguyễn Huy Trung) to review.** |
| D5 | Project content check (FR-011..FR-014; data-model M2 open question *Which function writes COMPLIANCE_RUN?*) (agreed by Nam Tran, 07/11/2026) | *Save to project* on SC-48 is the project check: it re-verifies the findings on the server against the current rule set and the text, then writes one `compliance_run` and its `compliance_finding` rows; members mark findings reviewed (FR-014). Without it Q3 and the Content gauge would have nothing to read. |
| D6 | `rule_version` format (spec OQ14) (agreed by Nam Tran, 07/11/2026) | `YYYY.MM` for the first version of a month (seed style), then `YYYY.MM.02`, `YYYY.MM.03`…: the strings sort in time order, so M0's `MAX(rule_version)` (*current rule set*) stays right. |
| D7 | Rate limit (spec OQ7) (agreed by Nam Tran, 07/11/2026) | 10 pre-checks per IP per rolling 24 h for guests, 50 for signed-in users, counted in server memory (no data change); see Known limitations 2. |
| D8 | Wording of the deadline (Nam Tran, 07/11/2026) | SC-29 #5 is *Recommended submission date* / *Hạn nộp khuyến nghị (có dự phòng)*; no M2 or M5 screen uses *safe* / *an toàn* for a deadline or a check result. Changed at the sources `tools/s3_en.py` (SC-29), `tools/s1_en.py` (SC-12 strip, data from F-M5-08), `tools/specs_a.py` (M2 FR-017, BR-006, US-4; M0 edge case), `tools/specs_b.py` (M5 purpose, US-3, edge case, F-M5-07, success criterion); *safety buffer* became *buffer before shooting* on SC-29. Kept: the BR-003 lists of banned words (SC-48, SC-30), which name the word to forbid it, and SC-12 *Your project data is safe* (an error text, not a deadline or a result). The mockup images still show the old label until they are redrawn with `build_docs.py --img`. |
| D9 | Who signs rules (Nam Tran, 07/11/2026) | Only `vfda_legal` signs and retires a rule; `admin` reads the rule base but a signing or retiring request by `admin` answers **403**. An exception to SYS question 5 (admin holds the staff and Legal Board permissions), written in `tools/decisions.py` (SYS 5), M2 §2 Actors (`tools/specs_a.py`) and SC-37 SR-304 (`tools/s5_en.py`). |
| D10 | Buffer editable (M0 open question 2) (Nam Tran, 07/11/2026) | Owner and edit members change `buffer_days` (0, 7, 14, 21) on SC-29; view members read it. Provisional decision M0 question 2 in `tools/decisions.py`. M0 code extended (`lib/projects/input.js`, `app_update_project`); every M0 test must stay green. |

## Technical Context

**Language/Version**: JavaScript (ES modules) on Node.js 22+, Next.js 14 App Router (AGENTS.md §2); SQL for SQLite 3 and PostgreSQL 17.

**Primary Dependencies**: existing only — Next.js, React, `@supabase/supabase-js`, `@supabase/ssr`, `node:sqlite`, `pg`, `@google/genai` as already used by `lib/extraction/gemini-extractor.js` (`GEMINI_API_KEY`, `GEMINI_MODEL`, `LLM_PROVIDER=gemini|mock`, `GEMINI_PAID_TIER`). **No new dependency.**

**Storage**: M2 tables `legal_rule` (+ D2, D4), `rule_set_version`, `precheck_run`, `precheck_finding` (D2, D3), `compliance_run`, `compliance_finding` (D2); read with `project`, `project_member` (M0), `document_slot`, `document_type`, `bilingual_paragraph`, `public_holiday` (M5, read only), `collab_request` (M4, read only), `user_account`, `notification` (SYS), `audit_log` (M10). Every write goes through a Postgres `SECURITY DEFINER` function with a node:sqlite twin (the M0 / M4 / M7 pattern); guest pre-checks are written by the System actor.

**Testing**: `node --test` offline (sqlite + seed; Supabase through `tests/contracts/supabase-fake.js`; Gemini through a fake client — no model call in `npm test`; `LLM_PROVIDER=mock` = keyword matcher); a static and a PGlite check of the migration; online RLS in `npm run test:rls` with member fixtures only; browser walk-through by Nam Tran (the Legal Board steps with the seed `vfda_legal` account, signed in by Nam Tran).

**Target Platform**: web, desktop and phone (360 px).

**Project Type**: web application.

**Performance Goals**: SC-001 — a pre-check result in under 30 s (Gemini timeout 15 s, then the keyword fallback, which answers in well under 1 s on the seed); SC-005 — the same deadline on SC-12, SC-27 and SC-29 (one function).

**Constraints**:
- No finding without an active, signed rule with citation and approver; no finding whose quote is not in the text (BR-001, BR-002, FR-012).
- The model only locates passages; explanation and *Points to consider* are the rule's own signed text; level by code (BR-004, SC-48 SR-073).
- Banned words in results (BR-003), tested on every result text in both languages.
- No summary text stored (Q6, D3).
- Working days exclude weekends and `public_holiday` dates (Q1); `is_expected` holidays are marked *expected* (SC-29 SR-174).
- One signer is enough (Q2); signing and retiring each create a rule-set version (Q13); a rule-set change only notifies (Q3).
- Every screen text from `lib/i18n`; `data/` and `docs/spec`, `docs/screens` only through their generators; secrets only in `.env`; no direct table writes from the browser.

**Scale/Scope**: 9 seed rules (6 approved, 2 draft, 1 retired), 3 rule-set versions, 7 pre-check runs, 6 compliance runs, 8 projects; 5 screens; ~14 API routes; ~8 Postgres functions; 1 migration; 4 new columns, 3 removed columns, 2 changed keys.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | How this plan meets it | Status |
|---|---|---|
| **I. Spec is the source of truth** | Built from FR-001..FR-018, BR-001..BR-008 and the Clarifications. The conflicts found while planning were decided by the human and go to the sources: US-4 Scenario 1 against Q1 (D1, `tools/specs_a.py`), Q13 / BR-008 against the schema (D2), Q6 against `precheck_finding.quoted_text` (D3), the fallback keywords (D4) — data through the generators, screens through `tools/s*_en.py`. Points the spec leaves open are research open questions with an interim choice (D5–D7 and *Waiting for VFDA confirmation*), not silent requirements. | Pass |
| **II. Business rules test-first** | A failing test before code for: BR-001 (unknown code, unsigned rule, quote not in text — all dropped), BR-002 (database CHECK refuses signing without citation), BR-003 (banned words in every result text, both languages, also with 0 findings), BR-004 (the three thresholds and their boundaries), BR-005 (dossier from fixed rules, no model call), BR-006 (working days, Tết 2027, US-4 Sc1 dates of D1), BR-007 (version on every run), BR-008 (retired, never deleted; old finding shows its revision); US-1 Sc1–3, US-2 Sc1–2, US-3 Sc1–2, US-4 Sc1; Q3 (notification, gauge −30), Q6 (nothing of the text stored), Q13 (revision keeps the signed text in force). | Pass |
| **III. Thin vertical slices** | Slice 1 = US-3 (rule base, signing, versions — the other slices read signed rules); slice 2 = US-1 (pre-check, results, project save); slice 3 = US-2 (dossier); slice 4 = US-4 (timeline). Each ends with its tests and its quickstart slice. | Pass |
| **IV. Synthetic data, no secrets** | Seed only (mockup rule texts marked *pending the VFDA Legal Board's wording*); test summaries invented; the summary is not stored; `GEMINI_API_KEY` only in `.env`, never logged or returned. | Pass |
| **V. Humans approve** | Branch `008-m2-check`; data changes D2–D4 reviewed by the data owner (Nguyễn Huy Trung); rule wording and the official forms by the VFDA Legal Board; push, reseed and the Legal Board sign-in in the browser by Nam Tran. | Pass |

*Re-check after Phase 1*: Pass — data changes only through the generators (decided); no new dependency; direct writes revoked in the migration, narrower than the generated policy matrix (as M0 and M4); the SC-48 project route and the deviations below are recorded as open questions.

## Project Structure

### Documentation (this feature)

```text
specs/008-m2-check/
├── spec.md              # snapshot of docs/spec/spec-M2.md (do not edit here)
├── plan.md              # this file
├── research.md          # Phase 0: decisions R1–R14 and open questions
├── data-model.md        # Phase 1: D2–D4 changes, states, validation, functions
├── contracts/
│   ├── precheck-api.contract.md      # SC-03, SC-48 (guest and project save)
│   ├── project-checks-api.contract.md # SC-27 dossier, SC-29 timeline, findings review
│   ├── legal-rules-api.contract.md   # SC-37
│   └── screens.contract.md           # the five screens, element by element
├── quickstart.md        # Phase 1: offline checks and the four slices
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
lib/
├── dates/working-days.js          # workingDaysBefore(), workingDaysAfter(), holidaySet() — shared with M0, M5
├── licensing/timeline.js          # licensingTimeline(): latest, recommended, both paths, holidays in window
├── content-check/
│   ├── attention.js               # attentionLevel(findings) — Q4 thresholds (BR-004)
│   ├── verify.js                  # verifyFindings(): signed rule + verbatim quote → span (BR-001, FR-012)
│   ├── matcher.js                 # findPassages(): Gemini first, keyword fallback (FR-011)
│   ├── gemini-matcher.js          # structured output: [{ rule_code, quoted_text }] only
│   ├── keyword-matcher.js         # deterministic, from keywords_vi / keywords_en (D4)
│   ├── wording.js                 # BANNED_WORDS and the check used by tests (BR-003)
│   ├── rate-limit.js              # D7
│   └── input.js                   # 20–200 words, lang, flags
├── dossier/check.js               # dossierCheck(): 4 components a–d, derived states (BR-005, SR-085, SR-086)
├── legal/input.js, legal/version.js   # rule fields; next rule_version (D6)
├── db/legal-rules.js, db/precheck.js, db/content-checks.js, db/dossier.js, db/timeline.js
├── db/sqlite/{legal-rules,precheck,content-checks,dossier,timeline}.js
├── db/supabase/{legal-rules,precheck,content-checks,dossier,timeline}.js
└── db/dossier-view.sql            # v_dossier_check, read by SC-27 and by the M0 readiness view (FR-010)
app/
├── pre-check/page.js, precheck-form.js                     # SC-03
├── pre-check/r/[id]/page.js, result-view.js                # SC-48 (guest)
├── projects/[id]/content/page.js, content-client.js        # SC-48 (project run, mark reviewed)
├── projects/[id]/dossier/page.js                           # SC-27
├── projects/[id]/timeline/page.js, timeline-client.js      # SC-29
├── admin/legal-rules/page.js, rules-client.js              # SC-37
└── api/  precheck/, precheck/basis/, precheck/[id]/,
          projects/[id]/content-checks/, projects/[id]/dossier/, projects/[id]/timeline/,
          content-findings/[id]/review/, admin/legal-rules/…, admin/rule-set-versions/
supabase/migrations/2026110700xxxx_m2_check.sql
tests/unit/…, tests/contracts/…, tests/rls/rls.test.js (member fixtures only)
```

**Structure Decision**: the existing single Next.js app (`app/`, `lib/`, two-source `lib/db/`), as in M0, M4 and M7. Generators touched: `tools/dm_model.py`, `tools/dm_model2.py`, `tools/build_schema.py`, `tools/dm_rules.py`, `tools/build_data.py`, `data/seed/generate_seed.py`, `data/seed/seed_rules.py` (D2–D4); `tools/rls_policies.py` (read policies of `rule_set_version`, `precheck_run`, `compliance_run` — data-model §7); spec sources `tools/specs_a.py`, `tools/specs_b.py` (D1, D8, D9 — done 07/11/2026) and the Screen Spec source of SC-37 `tools/s5_en.py` (D2, D4 still to do), then `build_docs.py`, `build_index.py`, `start_feature.py --refresh`. M0 code touched: `lib/projects/input.js` and `app_update_project` (`buffer_days`, R5), `lib/db/readiness-view.sql` (Dossier gauge from `v_dossier_check`, R8).

## Waiting for VFDA confirmation

Interim choices this plan builds on, each also in research.md *Open questions*:

| Point | Interim choice |
|---|---|
| Q1 working days, Q2 one signer, Q3 notify only, Q4 thresholds, Q6 hash only, Q9 forms, Q13 revisions | As decided 28/10/2026 (provisional) |
| SYS question 5 exception (D9), M0 question 2 (D10) | As decided 07/11/2026 (provisional) |
| D1 buffer in calendar days | Calendar days |
| Whether the filing day counts as day 1 of the 20 working days | It counts (R4) |
| Real rule wording, citations to the clause, keywords | Seed mockup texts; the Legal Board writes the real ones |
| Signing by `admin` | Refused with 403: only `vfda_legal` signs (D9) |
| The application form and the Article 9 commitment (Q9) | SC-27 names *Mẫu số 01, Phụ lục I, Thông tư 17/2022/TT-BVHTTDL* (amended by Thông tư 11/2023/TT-BVHTTDL) and *Phụ lục IV*; the template link is `document_type.template_url`; the agent does not reproduce the official forms (R10) |

## Known limitations

1. US-5 (SC-30, SC-31) is not built: the rule code on SC-48 is plain text, and SC-03 has no *View the regulations library* link.
2. The rate limit (D7) is kept in server memory: on Vercel each instance counts on its own, so a guest may get more than 10 checks a day, and every count is lost when an instance restarts.
3. A guest result cannot be reopened with its text after the browser session ends: SC-48 then shows the level, the counts and the rule cards without quotes (D3).
4. Document states come from `document_slot.state` (M5 not built); SC-27 only lowers *Present* to *Needs fixing* (b) or *Pending* (c) from the M5 and M4 data (R8).
5. SC-29 milestones *partner confirmed* and *Vietnamese version done* show their current state, not a target date (R5); no reminder email or `.ics`.
6. The summary is sent to Gemini only when `LLM_PROVIDER=gemini` **and** `GEMINI_PAID_TIER=true` (the rule `.env.example` already applies to scripts, spec-M5 Q3); otherwise the keyword match answers. Whether a free-tier key may ever receive a summary is a SYS privacy question (R3).

## Complexity Tracking

> No constitution violation to justify.
