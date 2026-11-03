# Implementation Plan: Segment router (M1) — find the segment, override it

**Branch**: `004-m1-router` | **Date**: 02/11/2026 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-m1-router/spec.md` (snapshot of `docs/spec/spec-M1.md`: US-1..US-3, FR-001..FR-003, BR-001..BR-004, Clarifications Q1–Q3)

## Summary

A guest opens the landing page (SC-01), clicks *Get started*, answers at most four questions on the router (SC-02, `/start`) and gets segment A, B or C with the reason (the question numbers that decided it) and the *Needed / Not needed* list. The segment comes only from the VFDA decision table `segment_rule` (current version), applied by one pure function used both in the browser (instant result) and on the server (the stored result); no language model. The list comes only from `segment_requirement`. Question 4 never picks the segment. The guest can pick another segment card; every result and every override is stored in `segment_decision` under an anonymous session key, without sign-in. Segment C shows its commercial checklist with *not legal advice — confirm with VFDA*. The landing page never names VFDA and shows no logo.

**In this plan**: US-1 (P1, FR-001, FR-002, BR-001, BR-002) and US-2 (P2, FR-002, BR-003). **Not in this plan**: US-3 / FR-003 / BR-004 / SC-13 (change the segment of a saved project) — it needs projects (M0), not built yet.

> The request named "6 FR"; spec-M1 has three (FR-001..FR-003). This plan follows the spec.

## Decisions taken for this plan (Nam Tran, 02/11/2026)

| # | Topic | Decision |
|---|---|---|
| D1 | Gaps in the decision table (Clarifications Q1, Q2) | Fix the **data**, not the code: add to the seed generator `data/seed/generate_seed.py` two rules (`vietnam`+`coproduction` → A, `both`+`coproduction` → A) and the requirement `C / CREW_VISA` (needed), regenerate the seed and data docs, reviewed by the data owner. Until then those answers fall to *no rule matches*. |
| D2 | SC-01 content not yet backed by a module | Keep the mockup layout; items whose module is not built (pre-check M2, partners M4, deadline M5) and the *Quick content check* button are shown as *coming soon*, not clickable. The Article 13 strip stays hidden until the VFDA Legal Board approves its wording (SR-013). The VFDA line and logo are not shown (Q3). |
| D3 | When a guest's decision is stored | When a result is shown for a complete set of answers (one `segment_decision` row per answer set), and on every override (the same row is updated). Nothing is stored before the answers are complete (spec §3 edge case). |
| D4 | *That's right — create a segment X project* while M0 is missing | Guest → `/signup?next=/start`, the choice kept in the session; signed-in member → a note that project creation comes with M0, instead of the button. |

## Technical Context

**Language/Version**: JavaScript (ES modules) on Node.js 22+, Next.js 14 App Router (AGENTS.md §2).

**Primary Dependencies**: existing only — Next.js, React, `@supabase/supabase-js`, `@supabase/ssr`, `node:sqlite`. No new library.

**Storage**: tables `segment_rule`, `segment_requirement`, `segment_decision` (data/schema/schema-M1.sql, unchanged). Two sources as in 003 (D4 of 003): `node:sqlite` + seed for tests, Supabase when configured. Row Level Security keeps `segment_rule` System-only and `segment_requirement` signed-in only, so the guest router reads and writes through the server with the secret-key client (System actor, 003 D2); no policy or migration changes.

**Testing**: `node --test` (`npm test`, offline), contract tests with the fake Supabase client of 003 (`tests/contracts/supabase-fake.js`), the existing hard-coded-text test (`tests/unit/i18n-no-hardcoded.test.js`) covers the new screens automatically.

**Target Platform**: web (desktop and phone, minimum width 360 px).

**Project Type**: web application (Next.js pages + Route Handlers).

**Performance Goals**: result shown instantly after the last required answer (computed in the browser, SC-02 Loading state); the whole router finishable in under 60 seconds (SC-001).

**Constraints**: no sign-in (FR-001); no language model (BR-001, SR-032); every text from `lib/i18n` (SYS FR-006); the landing page has no VFDA name or logo (Q3); `data/` changed only through the generator (D1, AGENTS.md §4).

**Scale/Scope**: decision table ≤ 20 rows (spec §9); 2 screens (SC-01, SC-02), 1 page route, 2 API routes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | How this plan meets it | Status |
|---|---|---|
| **I. Spec is the source of truth** | Segments from `segment_rule`, lists from `segment_requirement`, columns of `data/schema` unchanged; gaps between spec and data are fixed in the data generator (D1) or written as open questions (research.md), never patched in code. | Pass |
| **II. Business rules test-first** | Tests before code for BR-001 (same answers → same segment; a changed table row changes the result with no code change; superseded version never used), BR-002 (every subset of question 4 gives the same segment), BR-003 (every override allowed and stored), Q1, Q2, Q3, US-1 Scenarios 1–3 and US-2 Scenario 1 (tasks.md). | Pass |
| **III. Thin vertical slices** | Slice 1 = US-1 (SC-01, SC-02 result, decide + store); slice 2 = US-2 (override). US-3 waits for M0. | Pass |
| **IV. Synthetic data, no secrets** | Seed only; the session key is random and never linked to a person; the secret key stays on the server. | Pass |
| **V. Humans approve** | Branch `004-m1-router`; the seed change (D1) is a separate reviewed change by the data owner. | Pass |

*Re-check after Phase 1*: still Pass — the design adds no table, column, policy or library.

## Project Structure

### Documentation (this feature)

```text
specs/004-m1-router/
├── plan.md                  # this file
├── research.md              # Phase 0: R1–R10, open questions
├── data-model.md            # Phase 1: tables used, decision function, stored rows
├── quickstart.md            # Phase 1: how to check the slices
├── contracts/
│   ├── router-api.contract.md     # POST /api/router/decisions, PATCH /api/router/decisions/:id
│   └── screens.contract.md        # SC-01 (/), SC-02 (/start): elements, states, texts
└── tasks.md                 # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
lib/router/
├── decide.js            # pure: current rules, decide(answers, rules), requirements split, journey config
└── answers.js           # pure: validate the four answers (FR-002 §5.1)
lib/db/
├── router.js            # facade (two sources): getRouterData(), saveDecision(), overrideDecision()
├── sqlite/router.js
└── supabase/router.js   # System client (secret key), server only
app/
├── page.js              # SC-01 landing (replaces the M3 developer home)
├── start/
│   ├── page.js          # SC-02 server page: loads rules + requirements for the browser
│   └── router-form.js   # SC-02 client: questions, result, override, CTA
├── api/router/decisions/route.js        # POST  — store a result
├── api/router/decisions/[id]/route.js   # PATCH — record an override
└── components/site-footer.js            # landing variant without "operated for VFDA" (Q3)
lib/i18n/vi.json, en.json  # router and landing texts
data/seed/generate_seed.py  # D1 (separate reviewed change), then regenerated data/seed/*.csv and data/*.md
tests/unit/ , tests/contracts/
```

**Structure Decision**: the existing single Next.js project; M1 code in `lib/router/` (pure rules) and `lib/db/router.js` (two sources), screens in `app/` — the same layout as M3 and SYS.

## Complexity Tracking

| Item | Why it is needed | Simpler alternative rejected because |
|---|---|---|
| The same decision function runs in the browser and on the server | SC-02 shows the result instantly from the preloaded table; the stored result must not trust the browser (BR-001, BR-003). | Browser only: a client could store any segment. Server only: a round trip per answer, against SC-02 Loading state. |
| Guest writes through the System client | `segment_decision` has no anonymous INSERT grant (003 policy matrix); guests must be able to store results and overrides (BR-003) without sign-in. | An anon INSERT policy would let any client write any row; the server validates answers, recomputes the segment and owns the session key. |
| SC-01 is rendered per request, not statically (SR-015), and has no `hreflang` pair | The language comes from the `locale` cookie and the layout reads the session (SYS slice 3), so one URL serves both languages. | Separate `/vi` and `/en` URLs would change routing for every built screen; recorded as research Open question 6. |
