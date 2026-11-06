# Implementation Plan: Vietnamese service partners (M4)

**Branch**: `007-m4-partners` | **Date**: 06/11/2026 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-m4-partners/spec.md` (snapshot of `docs/spec/spec-M4.md`: US-1..US-4, FR-001..FR-019, BR-001..BR-009, Clarifications Q1–Q4 of 28/10/2026). The request named *38 FR* and *SC-19..SC-25*; the spec has 19 FR and 7 screens (SC-19, 20, 21, 22, 23, 25, 36 — there is no SC-24), research Open question 12.

## Summary

Foreign producers find Vietnamese companies that can sign the Article 13 service agreement. The directory (SC-19) lists active organisations by the **12 fixed service groups** with standard Vietnamese labels (Q1, BR-002), filtered by province, language and *VFDA Verified only* (on by default). A profile (SC-20) shows **three layers stored in three tables with three read policies** (BR-001): public to everyone, member layer to signed-in users, and the private layer (layer 3: rate card, past clients, direct contact) only to the members of a project whose request to that organisation is **accepted** and on which **both parties accepted the standard bilingual NDA** with its version (Q4). A producer (owner or *edit* of a project) sends a request (SC-23) and follows it on SC-25 through *Sent → Viewed → Accepted → NDA agreed → Confirmed*; only the partner accepts or declines, only the producer confirms or withdraws, and declined, withdrawn and confirmed are **final** (BR-005); every note and reply is an uneditable message (BR-009); confirming never marks Article 13 component c present (BR-006). A partner applies for **VFDA Verified** (SC-22) with a business registration PDF stored in the **private bucket `org-documents`** and two references; VFDA staff decide on SC-36 with a mandatory reason to reject, one audit row per decision; the badge is valid **12 months** and states what was checked (valid business registration) and what was not (quality, prices) (Q2, BR-004). Only VFDA switches `art13_eligible`, and only after confirming a film-service business line; profiles show *not legal advice* (Q3). Partner accounts exist only through a **VFDA invitation** (BR-003).

**In this plan**: US-1, US-2, US-3, US-4 Scenario 1; FR-001..FR-006, FR-008..FR-017; BR-001..BR-009 (BR-007 as the append-only trigger only); screens SC-19, SC-20, SC-21, SC-22, SC-23, SC-25, SC-36 and two pages for invitations. **Not in this plan**: FR-007 (Could — semantic ranking; embeddings undecided, SYS open question 3); FR-018 viewer, FR-019 (Could) and US-4 Scenario 2 — which documents a partner may open belongs to M5 (D4); moderation of partner edits (M10, D3); ratings (M8).

## Decisions taken for this plan (Nam Tran, 06/11/2026)

| # | Topic | Decision |
|---|---|---|
| D1 | Which partner account acts for which organisation (data-model M4 §12, blocking; SYS research OQ13) | New table `organisation_user (org_id, user_id, added_at)` through the generators; the three seed partner accounts linked to their organisations. Data owner (Nguyễn Huy Trung) to review. |
| D2 | Partner accounts by VFDA invitation (BR-003) | Invitations through the app: VFDA enters the organisation's public data and the email; the system emails a one-time link (Resend); the invitee signs up or signs in, then accepts; the role becomes `partner` and the account is linked to the organisation, with audit rows. New table `partner_invitation` (code hash only) through the generators. Ordinary sign-up stays `member`. *Who* may invite (analysis I1, 06/11/2026): `vfda_staff` and `admin`; the RPC that accepts an invitation grants `partner` and writes the audit row; the M4 migration replaces `app_grant_role` so that it refuses `partner` (analysis G1). SYS BR-002 changed at its source `tools/specs_a.py` and SYS question 6 decided in `tools/decisions.py` (provisional); only an admin grants `vfda_staff`, `vfda_legal`, `admin`. |
| D3 | Moderation of partner edits (M10 BR-001, SC-21 SR-323) | Live at once in this slice; moderation comes with M10 (Known limitations). Badge, Article 13 flag and status stay VFDA-only. |
| D4 | Document access log (FR-018, US-4 Scenario 2) | Only the append-only trigger and the log function now; the document viewer for partners and FR-019 are built with M5. |
| D5 | NDA text (Q4) | Changed 06/11/2026 at Nam Tran's request: the agent drafts the full bilingual NDA in `docs/legal/nda-v1.0.md` (document version 1.0), marked *bản nháp — chờ VFDA xem*; the stored version code stays `NDA-2026.1` (seed); `config/nda/NDA-2026.1.json` holds the code, the status `draft` and the path of the text. VFDA reviews the text before launch. |
| D7 | SC-25 steps (06/11/2026) | Five steps *Sent → Viewed → Accepted → NDA agreed → Confirmed* instead of three, from the existing data (status and the two NDA rows; no new column): SC-25 #4, #5, SR-141 and spec-M4 US-2 Scenarios 1–3, §11.1 changed at their sources (`tools/s2_en.py`, `tools/s6_en.py`, `tools/specs_b.py`); tests T006 and T047 updated with the reviewer's permission. |
| D6 | Verification times (FR-010, SC-22 #12, SC-36 #3, #5) | Add `verification_request.submitted_at` (required) and `decided_at` through the generators. |

## Technical Context

**Language/Version**: JavaScript (ES modules) on Node.js 22+, Next.js 14 App Router (AGENTS.md §2); SQL for SQLite 3 and PostgreSQL 17.

**Primary Dependencies**: existing only — Next.js, React, `@supabase/supabase-js` (also for Storage signed URLs), `@supabase/ssr`, `node:sqlite`, `pg`, `resend` (invitation and notification emails, System actor). **No new dependency.**

**Storage**: M4 tables `organisation`, `organisation_member_layer`, `organisation_private_layer`, `verification_request` (+ D6), `collab_request`, `collab_message`, `nda_acceptance`, `document_access_log`, new `organisation_user` (D1) and `partner_invitation` (D2); read with `project`, `project_member` (M0), `province` (M3), `document_slot` (M5, read only), `user_account`, `profile`, `notification`, `email_delivery` (SYS), `audit_log` (M10). Supabase Storage bucket `org-documents` (private) for business registration PDFs. Every write goes through a Postgres `SECURITY DEFINER` function with a node:sqlite twin (the M0 / M7 pattern).

**Testing**: `node --test` offline (sqlite + seed; Supabase through `tests/contracts/supabase-fake.js`; Storage through an in-memory fake; Resend through a fake client — no email or upload in `npm test`); a static and a PGlite check of the migration (as M7); online RLS in `npm run test:rls` with member fixtures only (no staff or partner sign-in by the agent); browser walk-through by Nam Tran.

**Target Platform**: web, desktop and phone (360 px).

**Project Type**: web application.

**Performance Goals**: SC-001 — a verified partner in the shooting province found in under 5 minutes; SC-004 — a verification decided in under 15 minutes of review; directory and profile answer in under 1 s on the seed (measured in T062, analysis A1).

**Constraints**:
- The 12 service groups are a fixed enum with fixed labels (BR-002); no free group.
- Three layers = three tables + three read policies; the private layer needs `accepted`/`confirmed` and the NDA of both parties (BR-001, FR-004).
- Partner accounts only through an invitation (BR-003).
- Badge valid 12 months, with *checked / not checked* (BR-004); `art13_eligible` only by VFDA after the business-line check, with *not legal advice* (Q3).
- Final request states never change (BR-005, database trigger); messages never edited (BR-009); access log append-only (BR-007).
- Confirming writes nothing to the dossier (BR-006).
- Business registration files only in the private bucket `org-documents`, through signed URLs.
- Every screen text from `lib/i18n`; `data/` only through its generators; secrets only in `.env`; no direct table writes from the browser.

**Scale/Scope**: 10 seed organisations, 8 verification requests, 9 collaboration requests, 3 partner accounts; 7 screens + 2 invitation pages; ~22 API routes; ~16 Postgres functions and 3 triggers; 1 migration; 2 new tables, 2 new columns.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | How this plan meets it | Status |
|---|---|---|
| **I. Spec is the source of truth** | Built from FR-001..FR-019, BR-001..BR-009 and Clarifications Q1–Q4; the blocking data questions (partner link, invitation, verification times) were decided by the human (D1, D2, D6) and go through the generators; every point the spec does not settle is a research open question with an interim choice, listed in *Waiting for VFDA confirmation* below, not a silent requirement; the conflict between D2 and SYS BR-002 was resolved at the spec source (SYS question 6, 06/11/2026). | Pass |
| **II. Business rules test-first** | Tests before code for each BR: three layers per role (BR-001, RLS and API shape), fixed 12 groups (BR-002), no partner role without an invitation (BR-003), badge 12 months and wording (BR-004), state machine and final states (BR-005), confirm leaves the dossier alone (BR-006), append-only log (BR-007), deactivation withdraws open requests (BR-008), messages not editable (BR-009); and for US-1 Scenarios 1–2, US-2 Scenarios 1–3, US-3 Scenarios 1–2, US-4 Scenario 1 (tasks.md). | Pass |
| **III. Thin vertical slices** | Slice 1 = US-1 (directory, profile layers 1–2); slice 2 = US-3 (verification and Article 13, so the directory has verified data the partner controls); slice 3 = US-2 (requests to confirmation); slice 4 = US-4 Scenario 1 + invitations (layer 3, NDA, partner accounts). Each ends with tests and the quickstart slice. | Pass |
| **IV. Synthetic data, no secrets** | Seed only (invented organisations, `example` domains, `+84 000 000 1xx` phones); invitation codes stored as hashes, never logged; emails to test inboxes only; Storage files only test PDFs. | Pass |
| **V. Humans approve** | Branch `007-m4-partners`; data changes D1, D2, D6 reviewed by the data owner; NDA and badge wording by VFDA; the browser runs and sign-ins by Nam Tran; push and reseed by Nam Tran. | Pass |

*Re-check after Phase 1*: Pass — 2 new tables and 2 columns only through the generators (decided); no new dependency; the private-layer policy changed at its source `tools/rls_policies.py`; the deviations from SC-21 SR-323 (D3) and the screens without a Screen Spec (Open question 9) are recorded; SYS BR-002 changed at its source with a provisional decision (SYS question 6).

## Project Structure

### Documentation (this feature)

```text
specs/007-m4-partners/
├── plan.md                          # this file
├── research.md                      # R1–R17, open questions 1–13
├── data-model.md                    # tables, new table/columns, states, validation, functions, policies
├── quickstart.md                    # offline checks; 4 slices in the browser
├── contracts/
│   ├── partners-api.contract.md     # directory, profile layers, my organisation, deactivate
│   ├── requests-api.contract.md     # send, respond, NDA, confirm, withdraw, messages
│   ├── verification-api.contract.md # upload, submit, queue, decision, Article 13, reminder
│   ├── invitations-api.contract.md  # admin invitation, accept
│   └── screens.contract.md          # SC-19..SC-36 build choices, navigation
└── tasks.md                         # /speckit-tasks
```

### Source Code (repository root)

```text
tools/dm_model2.py, tools/dm_rules.py, tools/rls_policies.py         # D1, D2, D6; private-layer policy (both NDA rows); partner policies
data/seed/generate_seed.py, data/seed/seed_rules.py                   # then regenerated data/, schema, seed, migrations 100 and 300
supabase/migrations/20261106000200_m4_partners.sql                    # tables/columns for pushed databases, functions, triggers, revokes, bucket, pg_cron (guarded)
config/nda/NDA-2026.1.json                                            # D5: version code, status, path of the text (reviewed PR, AGENTS.md §5)
docs/legal/nda-v1.0.md                                                # D5: bilingual NDA draft v1.0, *bản nháp — chờ VFDA xem*
lib/partners/service-groups.js     # the 12 values in order (BR-002)
lib/partners/badge.js              # Verified today, verified month, expiring (BR-004)
lib/partners/layers.js             # shape a profile from the rows RLS returned (BR-001)
lib/partners/lifecycle.js          # request state machine, steps, `can` (BR-005)
lib/partners/input.js              # profile, request, message, verification, invitation checks
lib/partners/nda.js                # current NDA version and text
lib/partners/errors.js             # PartnerError and its codes
lib/partners/directory.js          # filters, accent-free search, group counts
lib/storage/org-documents.js       # signed upload / download URLs; local folder offline; fake in tests
lib/email/resend.js                # + sendNotificationEmail, sendPartnerInvitation (System)
lib/db/partners.js, sqlite/partners.js, supabase/partners.js
lib/db/collab.js, sqlite/collab.js, supabase/collab.js
lib/db/verification.js, sqlite/verification.js, supabase/verification.js
lib/db/partner-invitations.js, sqlite/partner-invitations.js, supabase/partner-invitations.js
lib/db/document-log.js, sqlite/document-log.js, supabase/document-log.js   # app_log_document_view (D4; no route)
lib/db/local-triggers.sql          # + BR-005, BR-007, BR-009 triggers for SQLite
lib/api/partners.js                # error codes → HTTP
app/partners/page.js, directory-client.js                                # SC-19
app/partners/[slug]/page.js, profile-view.js                            # SC-20
app/partners/[slug]/request/page.js, request-form.js                    # SC-23
app/partners/me/page.js, org-form.js                                    # SC-21
app/partners/me/verify/page.js, verify-form.js                          # SC-22
app/requests/page.js, app/requests/[id]/page.js, request-client.js, request-view.js   # SC-25
app/admin/verification/page.js, verification-queue.js                   # SC-36
app/admin/partners/invite/page.js, invite-form.js                       # invitation (no Screen Spec)
app/invitations/partner/[code]/page.js, accept-button.js                # acceptance (no Screen Spec)
app/api/partners/route.js, [slug]/route.js, me/route.js, me/deactivate/route.js, me/verification/…
app/api/requests/route.js, [id]/route.js, [id]/{respond,nda,confirm,withdraw,messages}/route.js
app/api/admin/verification/route.js, [id]/document/route.js, [id]/decision/route.js, app/api/admin/organisations/[id]/art13/route.js
app/api/admin/partner-invitations/route.js, app/api/partner-invitations/[code]/route.js, [code]/accept/route.js
app/api/dev/org-documents/[...path]/route.js                            # offline upload target, not in production
app/components/site-header.js, app/projects/[id]/project-nav.js          # navigation
scripts/remind-verification.mjs                                          # npm run verification:remind
lib/i18n/vi.json, en.json
tests/unit/, tests/contracts/, tests/rls/rls.test.js
```

**Structure Decision**: the existing single Next.js project, as M0 and M7: pure rules in `lib/partners/`; two-source data layer in `lib/db/`; Storage behind `lib/storage/`; screens under `app/`.

## Waiting for VFDA confirmation

Interim choices built in this plan because the spec does not settle them (analysis U2). Each is a research open question; each must be confirmed or changed before the merge to `main`, and is listed in `docs/build/build-log.md` §3.

| Research OQ | Topic | Interim choice built | Owner |
|---|---|---|---|
| 2 | How long a partner invitation is valid | 7 days, one use | VFDA |
| 3 | An existing producer account becoming a partner | Refused when the account is on any project (`ALREADY_MEMBER_OF_PROJECT`) | Group C |
| 6 | Article 13 eligibility while the Verified badge has expired | Shown only while Verified is valid | VFDA |
| 7 | Guests filtering by working language (FR-006 vs US-1 Scenario 2) | Language filter for signed-in users only | Group C |
| 9 | Two pages without a Screen Spec (invite a partner, accept an invitation) | Minimal pages `/admin/partners/invite`, `/invitations/partner/[code]` | Nguyễn Linh Chi (screens) |
| 10 | Logo, portfolio photos, portfolio details (no column) | Initials, text lines, no photo upload | Group C / data owner |
| 13 | Input limits the spec does not give | The limits marked * in data-model.md §5 | Group C |

Also drafts waiting for VFDA (not interim choices of the agent): NDA clauses (D5, Q4), the *what VFDA checked* wording (OQ5), the Vietnamese group labels (OQ8).

## Known limitations

| # | Limitation | Why / what would remove it |
|---|---|---|
| 1 | A partner's profile changes are live without VFDA moderation (against SC-21 SR-323, M10 BR-001). | D3; the M10 slice adds the pending version (data-model M4 §12, second blocking question). |
| 2 | No document viewer for partners, no access-log screen; US-4 Scenario 2 and FR-019 not built. | D4; built with M5, which owns project documents. |
| 3 | No semantic ranking (FR-007, Could). | The embedding model is SYS open question 3. |
| 4 | An unanswered request never expires on its own; a hint after 14 days. | Spec OQ5 open (research Open question 4). |
| 5 | NDA clauses, the badge statement and the Vietnamese group labels are drafts. | Q4, BR-004, Q1: Group C writes, VFDA reviews before launch. |
| 6 | A failed email is recorded as `bounced` on the notification's delivery row (`email_delivery.notification_id`); it is not retried automatically. | §3 edge case *delivery is retried*: research Open question 15 (analysis C1). |
| 7 | No logo, no portfolio photos, portfolio as text lines. | No column in the data model (research Open question 10). |
| 8 | Seed verification files do not exist in Storage; SC-36 says *file not available in the demo data* for them. | Seed holds paths only; real PDFs only from slice 3 uploads. |
| 9 | Data made by the online runs on `cinematch-dev` (requests, messages, NDA rows, invitations, notifications) stays until the next `node scripts/seed-supabase.mjs --reset`: messages and access-log rows cannot be deleted (BR-009, BR-007), and no temporary partner or staff account is made. Test PDFs uploaded to `org-documents` are not touched by the reseed. | Analysis I3: browser runs use the seed partner and staff accounts; Nam Tran removes test PDFs in the Supabase dashboard if wanted. |
| 10 | The seed partner accounts are not Auth users on `cinematch-dev` today (only one member, one staff and one admin are). | The partner steps of the browser runs need one of them in Auth (e.g. `lan.pham@benxua.example.vn`, added by Nam Tran in the Supabase dashboard with their own password); the reseed then gives it the seed id and role. |
| 11 | The SC-43 mockup image still shows the old §2 *Accounts and roles* wording; the Screen Spec text was changed on 06/11/2026 (SYS BR-002). | Redraw with `build_docs.py --img` once Playwright is installed. |

## Complexity Tracking

| Item | Why it is needed | Simpler alternative rejected because |
|---|---|---|
| Two new tables (`organisation_user`, `partner_invitation`) and two columns (D1, D2, D6) | Partner writes cannot be scoped without the link; invitations must be one-time and auditable; FR-010 needs *when*. | A column on `profile` (one org per account) and manual role grants were rejected by the human; times from the audit log need audit rows the seed does not have. |
| Postgres functions for every write, plus three triggers | Role, organisation link, project permission, state machine, audit row and notifications must hold for every client; final states and messages must stay unchanged even for the System. | Direct writes with RLS cannot express the state machine or the audit row in one transaction. |
| Signed upload URLs and a dev upload route | 25 MB PDFs exceed the request body limit of a serverless function; the bucket stays private. | Uploading through the API route fails above ~4.5 MB; a public bucket breaks SR-335. |
| Two pages without a Screen Spec | D2 needs an invitation form and an acceptance page. | No existing screen covers them (research Open question 9). |
