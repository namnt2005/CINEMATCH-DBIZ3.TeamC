# Research: Segment router (M1)

Feature: `004-m1-router` · Plan: [plan.md](plan.md) · Sources: `specs/004-m1-router/spec.md`, `data/data-model-M1.md`, `data/schema/schema-M1.sql`, `data/seed/07_segment_rule.csv`, `08_segment_requirement.csv`, `10_segment_decision.csv`, `docs/screens/screen-spec-SC-01.md`, `SC-02.md`, `tools/rls_policies.py`.

## R1. Which rules are used

- **Decision**: only the **current version** of `segment_rule`: the highest `version`, compared as numbers part by part (`2026.1` > `2025.12`, `2026.10` > `2026.9`), not as text. Older versions are kept and never used (seed row `2025.12`, data-model-M1 §7 BR-001).
- **Rationale**: BR-001 — *within one version* the same answers always give the same segment (spec §6.1).
- **Alternatives**: a fixed version in code — rejected, the table is VFDA's to change (FR-002 "from table data, not code").

## R2. The decision function (BR-001, BR-002)

- **Decision**: one pure function `decide(answers, rules)` in `lib/router/decide.js`, used by the SC-02 page in the browser and by the API on the server.
  - A rule matches when `q1_shoot_in_vn` is equal and, for each of `q2_release`, `q3_producer`, the rule value is empty (any answer) or equal to the answer.
  - With `q1 = false`, questions 2 and 3 are not asked and not required (FR-002 §5.1); the seed C rule has them empty.
  - More than one matching rule in a version is a data error, reported by a test of the seed, never resolved in code.
  - `decided_by` = the question numbers the matched rule uses: 1, plus 2 and 3 when the rule sets them (seed: A/B `[1,2,3]`, C `[1]`; US-1 Scenario 1 "based on answers 1, 2 and 3").
  - Question 4 is never read to choose the segment (BR-002).
- **Rationale**: deterministic, explainable, no language model (SR-032); the reason comes from the rule itself.

## R3. Answers that match no rule

- **Decision**: no segment, `segment_rule_id` empty, `decided_by` empty; SC-02 shows *We couldn't classify this — choose directly or ask VFDA* with all three cards (spec §3 edge case, SC-02 Error state). The decision row is still stored (seed has such a row) so VFDA sees the gap.
- **Contradiction of the spec example**: *not shooting in Vietnam* but *needs locations* (q1 = false, q4 contains `locations`) is treated as **no match**, as spec §3 and SC-02 Error state say. Reading of BR-002: question 4 never picks or changes the segment A/B/C; it may only stop a contradictory set of answers from being classified, which the spec itself requires. A test pins both: for every q4 subset the segment is the same or there is none, never another letter.

## R4. Data gaps fixed in the generator (D1)

- **Decision**: in `data/seed/generate_seed.py` (owner: data, Nguyễn Huy Trung), version `2026.1`:
  - `segment_rule`: `true, vietnam, coproduction → A` and `true, both, coproduction → A` (Clarifications Q1: co-production is A).
  - `segment_requirement`: `C, CREW_VISA, "Thị thực cho đoàn phim", "Visas for the crew", needed = true` (Clarifications Q2 names "crew visas").
  - Then `python3 data/seed/generate_seed.py && python3 data/seed/check_seed.py` (PASS), `python3 data/schema/load_check.py`, the data docs generator, and on Supabase `node scripts/seed-supabase.mjs --reset`.
- **Rationale**: Constitution I and FR-002 — the router reads the table; fixing the code instead would hide VFDA's table from review.
- **Until then**: those two answer sets fall to R3; C shows only the service contract.

## R5. Segment C and the legal caveat (Clarifications Q2)

- **Decision**: for C, the *What this means* block lists the C rows of `segment_requirement` (licence *Not needed*, service contract and, after D1, crew visas *Needed*) and always ends with *Not legal advice — confirm with VFDA* from the dictionary. A and B lists have no such line (not asked).

## R6. Stored decisions and the anonymous session (D3, BR-003)

- **Decision**:
  - Session key `session:<16 hex>` (≤ 40 characters, `segment_decision.session_key`), made by the server on the first store and kept in an http-only cookie `cm_router_session` (30 days, `SameSite=Lax`); never linked to an account or a person.
  - `POST /api/router/decisions` stores one row per complete answer set: the answers, `segment_rule_id`, `segment` (the rule result or empty), `decided_by`, `journey_config`, `segment_override` empty, `project_id` empty (`ck_segment_decision_one_owner`).
  - `PATCH /api/router/decisions/:id` records an override on the same row: `segment_override` = the picked card, `segment` = the picked card (seed: an override sets the segment). Picking the computed card again clears the override.
  - Only the session that stored a row may change it.
  - The server always recomputes the segment from the table; the browser never sends a segment except as an override.
- **Rationale**: BR-003 *always recorded*; SC-003 counts overrides against shown results; spec §3 *nothing stored before the answers are complete*.
- **Alternatives**: a new row per override — rejected, it would count one visitor's result several times.

## R7. Journey configuration (FR-002 output `journey_config`)

- **Decision**: `{ "needed": [requirement codes], "not_needed": [codes], "needs": q4 answers, "gauges": [...] }`. `gauges` follows the seed: `content`, `locations`, `partners`, plus `dossier` when the segment needs `ART13_LICENCE` (A, B; not C) — so it comes from the requirement table, not from the letter. `needs` is what M4 pre-selects (BR-002).
- **Open**: which gauges M0 shows is M0's decision (Open question 3).

## R8. Who reads the tables

- **Decision**: the SC-02 server page reads the current rules and all requirements with the System client (Supabase) or `node:sqlite`, and passes them to the browser; the API reads them again on the server. No change to RLS (`segment_rule` stays System-only, `segment_requirement` signed-in only for direct reads).
- **Rationale**: no sign-in (constraint); the table is VFDA-approved explainability data, safe to show.

## R9. Texts and labels

- **Decision**: questions, options, segment names (*A — Shoot in Vietnam, release abroad* …), states and the caveat come from `lib/i18n` (`router.*`, `landing.*`); requirement labels come from `segment_requirement.label_vi` / `label_en` in the page language (data-model-M1 Open question 1 answered: segment names from the dictionary, requirement lines from the table). Answers in progress are kept in `sessionStorage` (wrapped in try/catch), not on the server.

## R10. Landing page (SC-01) under Q3 and D2

- **Decision**: replaces the M3 developer home at `/`. Headline, lead, *Get started — 4 questions, 1 minute* (→ `/start`), *Quick content check* (*coming soon*, not a link), the four-uncertainties block (only *Where should we shoot each scene?* → `/locations/match` is live; the other three *coming soon*), the 5-step journey. Not shown: Article 13 strip (SR-013, wording not approved), VFDA line and logo (Q3), *Contact VFDA* footer link; the site footer drops *operated for VFDA* on this page only. Texts that named VFDA in the mockup ("rules approved by VFDA", "VFDA Verified") are reworded without it.
- **Test**: the landing page HTML in both languages contains no "VFDA" and no `<img>` (Q3).

## Open questions

| # | Question | Interim choice | Owner |
|---|---|---|---|
| 1 | [NEEDS CLARIFICATION: spec §3 Edge cases still says co-production is *A or B?*, but Clarifications Q1 decided A.] | Follow Q1; fix the edge-case line at its source `tools/specs_*.py` | Group C (spec owner) |
| 2 | [NEEDS CLARIFICATION: SC-01 #8 wants exactly 4 items, each leading to a live module, while SR-012 forbids promoting modules not built.] | D2: 4 items, 3 marked *coming soon* | Group C |
| 3 | [NEEDS CLARIFICATION: which gauges does each segment show (`journey_config`)? Not written in M0 or M1.] | R7, from the seed pattern | M0 owner |
| 4 | [NEEDS CLARIFICATION: should a decision record the decision-table version? (data-model-M1 Open question 3)] | Not stored; the rule id points to its version | M1 owner |
| 5 | [NEEDS CLARIFICATION: anonymous rows have no limit; should one session's stored decisions be capped?] | No cap in the MVP | Group C |
| 6 | [NEEDS CLARIFICATION: SR-015 asks for static rendering and `hreflang`; the language is a cookie on one URL.] | Server-rendered per request, one URL | Group C |
| 7 | [NEEDS CLARIFICATION: the Article 13 wording for SC-01 #9 (Cinema Law 2022, 20-day deadline) — not approved yet.] | Strip hidden | VFDA Legal Board |
| 8 | Spec open question 4 (default language on a first visit) | Already decided by SYS: the browser language, else Vietnamese (003 research R6) | — |
