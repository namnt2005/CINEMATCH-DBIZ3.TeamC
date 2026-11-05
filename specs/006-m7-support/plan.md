# Implementation Plan: VFDA support — provincial notices and consultation requests (M7)

**Branch**: `006-m7-support` | **Date**: 06/11/2026 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-m7-support/spec.md` (snapshot of `docs/spec/spec-M7.md`: US-1..US-3, FR-001..FR-007, BR-001..BR-005 — BR-001 and BR-005 revised 28/10/2026 — Clarifications Q1–Q3, Q5)

## Summary

A member marks interest in a location (SC-16 *I'm interested*, or *Add province* on SC-32). The system drafts **one notice per province per project** from the project data, always with the sentence that it does not replace the filming licence of the Ministry of Culture, Sports and Tourism (BR-002). The member asks VFDA to review it; a VFDA staff member approves it or asks for changes on the staff side of SC-32, and every review writes an `audit_log` row. Only an approved notice can be downloaded — as Word (.docx) or as PDF through the browser's print page — addressed to the recipient the member chooses (Provincial People's Committee or Department of Culture). The member sends it themselves: **the system never sends a notice** (BR-001), and `delivery_status` records the download. The province's reply (received / info needed / cannot support, with the note as entered, BR-003) is recorded by the member or by VFDA staff. On SC-33 a member sends a consultation **request** — topic, time zone and up to three preferred times — which is stored and emailed to VFDA (`VFDA_CONSULT_EMAIL`) through Resend; there is no slot calendar (BR-005).

**In this plan**: US-1 (FR-001, FR-002, BR-001, BR-002), US-2 (FR-003, FR-004, BR-003), US-3 as reshaped by BR-005 (FR-005 request only); SC-32 (member and staff sides), SC-33, the *I'm interested* button on SC-16. **Not in this plan**: FR-006 (confirm, reschedule, assign an officer) and FR-007 (24-hour reminders) — BR-005 defers the slot calendar; BR-004 (reply times feed the M3 provincial readiness index, SC-18 not built); the spec §3 edge cases *email bounces*, *no reply after N days* (spec OQ4) and *withdrawal notice*.

## Decisions taken for this plan (Nam Tran, 06/11/2026)

| # | Topic | Decision |
|---|---|---|
| D1 | `province_notice` cannot hold the reviewed, downloaded flow | Add through the data generators (`tools/dm_model2.py`, `data/seed/generate_seed.py`): `review_status` ENUM(draft, submitted, changes_requested, approved), `review_note` TEXT, `recipient` ENUM(peoples_committee, culture_department), `response_recorded_by` UUID → user_account; `delivery_status` gains `downloaded`. `queued` = approved, not yet downloaded; `downloaded` = the member downloaded it, `sent_at` = first download. Migration for pushed databases. Reviewed by the data owner (Nguyễn Huy Trung). |
| D2 | Several preferred times on SC-33 | Add `preferred_times` (JSON array, 1–3 start times in UTC) to `consultation_booking` through the generators; `slot_start` = the first; `booking_status` and `officer_id` stay empty until VFDA replies (data-model OQ-04-13). |
| D3 | Who records the province's reply (US-2) | The member (owner or *edit* of the project), who sent the letter, **or** VFDA staff; `response_recorded_by` keeps who. When staff record it, the project members get a notification (US-2 Scenario 1) and an `audit_log` row is written. |
| D4 | PDF | A print page of the approved letter (`/projects/[id]/provinces/[noticeId]/print`); *Download PDF* opens the browser's print dialog (*Save as PDF*). No PDF library. |
| D5 | One notice per province per project (spec §9) | The first interest in a province drafts the notice; later interests in the same province add their location to that notice while it is not downloaded yet. The seed generator is changed so *The Last Ferry* no longer has two notices for Ninh Bình. |
| D6 | Libraries | `docx` (Word file) and `resend` (consultation email), as the request names them. No other dependency. |
| D7 | Downloads (analysis I4, U2; 06/11/2026) | Every project member may download an approved letter; only an owner or *edit* member records the first download and so sets the recipient. Recording is `POST /api/notices/:id/download`; the .docx route and the print page only read. |
| D8 | Spec text (analysis I1, I2, I5, C1, A1; 06/11/2026) | Rewritten at the sources, then `build_docs.py --mermaid`, `build_index.py`, `start_feature.py --refresh`: FR-002 (draft, review, download — code F-M7-02 kept), FR-003 and US-2 Scenario 1 (member or staff), FR-005, US-3 Scenario 1 and SC-003 (request, BR-005), §4.1 and §4.2 redrawn (*Derived*), FR-006 / FR-007 *later phase* in §11.1, the BR-002 sentence as draft pending the VFDA Legal Board (`tools/specs_b.py`); the SC-32 staff side and SR-201 / SR-203 / #10 (`tools/s3_en.py`). |

## Technical Context

**Language/Version**: JavaScript (ES modules) on Node.js 22+, Next.js 14 App Router (AGENTS.md §2); SQL for SQLite 3 and PostgreSQL 17.

**Primary Dependencies**: existing (Next.js, React, `@supabase/supabase-js`, `@supabase/ssr`, `node:sqlite`, `pg`); **added**: `docx` (D6 — builds the .docx letter on the server), `resend` (D6 — sends the consultation request to VFDA; System actor, key server-only).

**Storage**: `location_interest`, `province_notice`, `consultation_booking` (schema-M7, with the D1/D2 columns), read with `project`, `project_member` (M0), `location`, `authority_contact`, `province` (M3), `collab_request`, `organisation` (M4), `audit_log` (M10), `notification`, `email_delivery` (SYS). Writes that check the project permission or the staff role go through Postgres `SECURITY DEFINER` functions with a node:sqlite twin (the M0 pattern).

**Testing**: `node --test` offline (sqlite + seed; Supabase through `tests/contracts/supabase-fake.js`; Resend through a fake client — no email in `npm test`); the .docx is opened in the test (its `word/document.xml`) to check the BR-002 sentence; online RLS in `npm run test:rls`; one real email to the test inbox in the quickstart, after the human confirms.

**Target Platform**: web, desktop and phone (360 px); the print page for A4.

**Project Type**: web application.

**Performance Goals**: SC-003 (spec) — a consultation request in under 2 minutes; the letter downloads in under 2 s.

**Constraints**:
- No route, function or job sends a notice (BR-001).
- Only an approved notice can be downloaded.
- One audit row per review.
- The BR-002 sentence is in every letter.
- The project summary is built from database data, never from browser text.
- Every screen text comes from `lib/i18n`.
- `data/` changes only through its generators.
- Secrets live only in `.env`.

**Scale/Scope**: 8 seed notices, 6 seed bookings; 3 screens (SC-32 member, SC-32 staff, SC-33) and one button on SC-16; ~10 API routes; 6 Postgres functions; 1 migration.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | How this plan meets it | Status |
|---|---|---|
| **I. Spec is the source of truth** | Follows BR-001 / BR-005 and Clarifications Q1–Q3, Q5; the spec text that contradicted them was rewritten at its source (D8); data gaps fixed in the generators (D1, D2), not patched in code; the remaining gap (SC-33 Screen Spec) is research Open question 4. | Pass |
| **II. Business rules test-first** | Tests before code for BR-001 (no sending path; download only when approved; one audit row per review), BR-002 (sentence in .docx and print page, both recipients), BR-003 (three values, note kept), BR-005 (request form, 1–3 times, email through a fake Resend, no slot), RLS (non-members read no notice; only staff review), US-1 Scenarios 1–2, US-2 Scenario 1 (tasks.md). | Pass |
| **III. Thin vertical slices** | Slice 1 = US-1 (interest → draft → review → download); slice 2 = US-2 (reply); slice 3 = US-3 (consultation request). | Pass |
| **IV. Synthetic data, no secrets** | Seed only; `RESEND_API_KEY` and `VFDA_CONSULT_EMAIL` empty in `.env.example`; the real email goes to a test inbox only in the quickstart; letters carry seed data only. | Pass |
| **V. Humans approve** | Branch `006-m7-support`; data change D1/D2/D5 reviewed by the data owner; the letter wording waits for VFDA (spec OQ1); the real email is sent only after the human confirms. | Pass |

*Re-check after Phase 1*: Pass — new columns only through the generators; two libraries named by the request; no new table.

## Project Structure

### Documentation (this feature)

```text
specs/006-m7-support/
├── plan.md                         # this file
├── research.md                     # R1–R11, open questions
├── data-model.md                   # tables, new columns, states, functions
├── quickstart.md                   # two roles end to end; consultation email to the test inbox
├── contracts/
│   ├── notices-api.contract.md     # interests, notices, review, download, reply
│   ├── consultations-api.contract.md
│   └── screens.contract.md         # SC-32 member, SC-32 staff, SC-33, SC-16 button
└── tasks.md                        # /speckit-tasks
```

### Source Code (repository root)

```text
tools/dm_model2.py, data/seed/generate_seed.py, data/seed/seed_rules.py   # D1, D2, D5 (then regenerated data/, schema, seed)
lib/notices/summary.js           # pure twin of the SQL summary (project data → text), sqlite
lib/notices/letter.js            # pure: summary + recipient → letter paragraphs (vi, en), BR-002 sentence
lib/notices/docx.js              # letter → .docx buffer (docx)
lib/notices/input.js             # reply and review input checks
lib/consultations/input.js       # topic, IANA time zone, 1–3 future times
lib/email/resend.js              # System sender (resend), records email_delivery
lib/db/notices.js, sqlite/notices.js, supabase/notices.js
lib/db/consultations.js, sqlite/consultations.js, supabase/consultations.js
supabase/migrations/20261106000100_m7_notices.sql   # columns for pushed databases, 6 functions, grants
app/projects/[id]/provinces/page.js, provinces-client.js, provinces-view.js       # SC-32 member
app/projects/[id]/provinces/[noticeId]/print/page.js                              # PDF (D4)
app/admin/notices/page.js, notices-queue.js                                       # SC-32 staff
app/consultation/page.js, consultation-form.js, consultation-view.js              # SC-33
app/locations/[slug]/interest-button.js                                           # SC-16 *I'm interested*
app/projects/[id]/project-nav.js                                                  # + Provinces
app/api/projects/[id]/interests/route.js, app/api/projects/[id]/notices/route.js
app/api/notices/[id]/submit/route.js, download/route.js (records), letter/route.js (read-only), reply/route.js
app/api/admin/notices/route.js, app/api/admin/notices/[id]/review/route.js
app/api/consultations/route.js
lib/i18n/vi.json, en.json
.env.example                                                                       # VFDA_CONSULT_EMAIL=
tests/unit/, tests/contracts/, tests/rls/rls.test.js
```

**Structure Decision**: the existing single Next.js project, same layout as M0: pure rules in `lib/notices/`, `lib/consultations/`; two-source data layer in `lib/db/`; screens under `app/`.

## Known limitations

| # | Limitation | Why / what would remove it |
|---|---|---|
| 1 | No slot calendar, confirmation, officer assignment or reminders (FR-006, FR-007). | BR-005: offered only once VFDA declares staffed hours. |
| 2 | The letter wording is the team's, not an official VFDA template. | Spec OQ1; VFDA to approve the template. |
| 3 | A province's reply is entered by hand (member or staff); there is no reply link for the province (spec §4.1). | BR-001: the province receives the letter from the crew, not from the system. |
| 4 | Reply times do not feed the provincial readiness index yet (BR-004). | M3 SC-18 not built. |
| 5 | The SC-32 staff queue and the new *Ask VFDA to review* label are not drawn on the mockup image. | No Playwright to redraw (`build_docs.py --img`); the Screen Spec text is the contract. |
| 6 | The SC-33 Screen Spec still describes a slot grid, an officer and reminders. | Research Open question 4; the screen is built as the BR-005 request form. |

## Complexity Tracking

| Item | Why it is needed | Simpler alternative rejected because |
|---|---|---|
| New columns in `province_notice` and `consultation_booking` (D1, D2) | The reviewed / downloaded flow, the staff's change request, the chosen recipient, who recorded the reply and several preferred times have nowhere to be stored. | Reusing `sent` for *downloaded* and losing the note and recipient would make the records misleading (decision of 06/11/2026). |
| Postgres functions for every write | Interest, submit and download need the project's owner/edit permission; review needs the staff role and its audit row in the same transaction; the summary must be built from the database, not sent by the browser. | The generated policies let any member insert interests and give no staff update path; client inserts could set any `review_status` or summary text. |
| Two libraries (`docx`, `resend`) | A real Word file the crew can edit and send; a transactional email to VFDA. | Hand-written OOXML is fragile; raw `fetch` to Resend would work, but the request names the SDK. |
