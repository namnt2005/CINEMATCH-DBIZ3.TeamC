---
description: "Task list for Vietnamese service partners (M4): US-1 directory, US-3 VFDA Verified, US-2 requests, US-4 private layer, partner invitations"
---

# Tasks: Vietnamese service partners (M4)

**Input**: Design documents from `/specs/007-m4-partners/` — [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Prerequisites**: plan.md (decisions D1–D6, *Waiting for VFDA confirmation*), research.md (R1–R17, Open questions 1–16). Updated 06/11/2026 for the analysis fixes I1–I6, C1–C3, U1–U3, A1, T1: `vfda_staff` and `admin` invite partners (SYS BR-002 and SYS question 6 changed at their sources); one notification per party on every status change; browser runs with seed accounts only, no temporary account.

**Tests**: Required (Constitution Principle II and the request for this feature). Each test task below is written and seen failing **before** the code task that names it:
- every business rule in scope: BR-001..BR-009 (BR-007 as the append-only trigger, D4);
- every acceptance scenario in scope: US-1 Scenarios 1–2, US-2 Scenarios 1–3, US-3 Scenarios 1–2, US-4 Scenario 1;
- the decisions D1, D2, D6 (data), R6 (state machine), R10 (private files).

`npm test` stays offline: `node:sqlite` + seed, Supabase through `tests/contracts/supabase-fake.js`, Storage through an in-memory fake, Resend through a fake client — no email, no upload. Real RLS is checked by `npm run test:rls` with fixture accounts that sign in with their own passwords (no staff fixture, no magic link, no sign-in on anyone's behalf); the browser walk-throughs are run by Nam Tran.

Expected values come from the seed (read the CSV files by table name, never by their NN prefix) or from the seed oracle `data/seed/seed_rules.py`, never from the scenario text (build-log Entry 12).

**Organization**: Phase 2 = data change (D1, D2, D6), migration, triggers and the shared rules every story reads; Phase 3 = US-1 (MVP); Phase 4 = partner invitations (BR-003, D2; online, the partner steps use a seed partner account instead); Phase 5 = US-3; Phase 6 = US-2; Phase 7 = US-4 Scenario 1; Phase 8 = Polish. Spec priorities: US-1, US-2, US-3 P1, US-4 P2; US-3 is built before US-2 as plan.md (Constitution III) orders the slices, so that requests go to organisations whose badge the partner can obtain. Not in this plan: FR-007, FR-018 viewer, FR-019, US-4 Scenario 2 (D4), moderation of partner edits (D3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1..US4 (spec.md §3); Phases 1, 2, 4 and 8 carry no story label
- Every task names its FR / BR / decision and its file paths

---

## Phase 1: Setup

- [ ] T001 Record the baseline on branch `007-m4-partners` before any change — `npm test`, `npm run build`, `uv run tools/start_feature.py --check`, `python3 data/seed/check_seed.py`, `python3 data/schema/load_check.py` — in specs/007-m4-partners/quickstart.md §Results
- [X] T002 [P] Write the bilingual NDA draft docs/legal/nda-v1.0.md (document version 1.0, marked *bản nháp — chờ VFDA xem*, not legal advice) and config/nda/NDA-2026.1.json `{ "version": "NDA-2026.1", "status": "draft", "document": "docs/legal/nda-v1.0.md", "document_version": "1.0" }`; the version code equals the seed's `nda_acceptance.nda_version` (D5 as changed 06/11/2026, Q4, FR-017)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the partner ↔ organisation link, the invitations and the verification times exist (D1, D2, D6); every write goes through a checked database function; final requests, messages and access-log rows cannot change (BR-005, BR-007, BR-009); the 12 groups, the badge rule and the state machine are shared code; M4 events can be emailed.

**⚠️ CRITICAL**: Tests T003–T007 are written and seen failing before T008–T013. No user story starts before this phase is done.

### Tests for Phase 2 (write first, see them fail) ⚠️

- [X] T003 [P] Create unit test of the M4 seed and schema after D1, D2, D6 in tests/unit/m4-seed.test.js (reads data/schema/schema-M4.sql and the seed CSV files by table name):
  - table `organisation_user` (`org_id`, `user_id`, `added_at`, primary key on both, two foreign keys); every row's user has role `partner`; every seed `partner` account has a row; the three seed partners act for Mekong Frame Co., Đò Ngang Film Services and Bến Xưa Production Services; Hanoi Grip & Light has none;
  - table `partner_invitation` with the data-model §2 columns; `code_hash` is 64 lower-case hex characters and unique; `expires_at > invited_at`; `accepted_at` and `accepted_by` both set or both empty; at least one accepted, one open (Hanoi Grip & Light) and one expired invitation; every `invited_by` has role `vfda_staff` or `admin` (SYS BR-002 as changed 06/11/2026); the seed `role.grant` audit row of Bến Xưa's account (`lan.pham@…`) matches its accepted invitation — `target_id` = the account, `admin_id` = the invitation's `invited_by` (analysis G5);
  - `verification_request.submitted_at` required; `decided_at` empty exactly when `pending`; `decided_at > submitted_at`; the latest approved request of each verified organisation has `decided_at` = its `verified_at`;
  - every `service_groups` value is one of the 12 (BR-002); `verified_until` = `verified_at` + 12 months (BR-004); no open request to a deactivated organisation (BR-008); `confirmed_at` set exactly when `confirmed` (BR-005).

  (D1, D2, D6, BR-002, BR-004, BR-005, BR-008)
- [X] T004 [P] Create unit test of migration supabase/migrations/20261106000200_m4_partners.sql in tests/unit/m4-migrations.test.js:
  - `organisation_user`, `partner_invitation` created `IF NOT EXISTS`; `verification_request.submitted_at`, `decided_at` added `IF NOT EXISTS`, with their checks;
  - `app.is_org_user(uuid)` and the functions of data-model.md §6 (`app_save_org_profile`, `app_deactivate_org`, `app_submit_verification`, `app_decide_verification`, `app_set_art13`, `app_remind_expiring_verifications`, `app_send_collab_request`, `app_respond_collab_request`, `app_accept_nda`, `app_confirm_collab_request`, `app_withdraw_collab_request`, `app_post_collab_message`, `app_create_partner_invitation`, `app_accept_partner_invitation`, `app_log_document_view`) are `SECURITY DEFINER` with `search_path = ''`; EXECUTE revoked from `PUBLIC`, `anon`, granted to `authenticated` (System-only ones not granted);
  - INSERT / UPDATE / DELETE on every M4 table revoked from `authenticated` (the generated member insert on `collab_request` dropped);
  - triggers `trg_collab_request_final` (`BEFORE UPDATE` only — DELETE is not granted to clients), `trg_collab_message_no_update` and `trg_document_access_log_append_only` (`BEFORE UPDATE OR DELETE`);
  - policy `rls_org_private_after_nda` requires a `party = 'producer'` and a `party = 'partner'` row with `accepted`, and status `accepted` or `confirmed`; a second select policy lets `app.is_org_user` read its own private layer;
  - `audit_log` inserts in `app_decide_verification`, `app_set_art13`, `app_create_partner_invitation`, `app_accept_partner_invitation`, `app_deactivate_org`;
  - `app_accept_partner_invitation` compares a SHA-256 digest of the code and never stores the code;
  - bucket `org-documents` inserted with `public = false`, `file_size_limit = 26214400`, `allowed_mime_types` `{application/pdf}`, inside a guard on the `storage` schema; no `CREATE POLICY` on `storage.objects`;
  - the `pg_cron` schedule of `app_remind_expiring_verifications` is guarded like the M0 snapshot job;
  - `public.app_grant_role` is replaced (`CREATE OR REPLACE`, same signature) so that `p_role = 'partner'` raises `ROLE_BY_INVITATION_ONLY` before any UPDATE, while the admin check (`app.has_role('admin')`, 42501) and the `role.grant` audit row stay for the other roles (SYS BR-002 as changed 06/11/2026; turns green with T028, analysis G1);
  - no `DELETE FROM` of an M4 table; no quoted schema list in `search_path` (build-log Entry 9).

  (BR-001, BR-003, BR-005, BR-007, BR-009, R4, R10)
- [X] T005 [P] Create unit test of the database triggers on node:sqlite in tests/unit/m4-triggers.test.js: updating the status (or any column) of a seed `confirmed`, `declined` or `withdrawn` request is refused (BR-005), while the trigger does not watch DELETE (analysis I3); `UPDATE` and `DELETE` of a `collab_message` row are refused (BR-009); `UPDATE` and `DELETE` of a `document_access_log` row are refused (BR-007); an open request can still change
- [X] T006 [P] Create unit test of the shared partner rules in tests/unit/partner-rules.test.js:
  - `SERVICE_GROUPS` are the 12 values in the order of the schema CHECK list; `isServiceGroup('visa')` is false (BR-002);
  - `isVerified(org, today)` is true on the last day (`verified_until == today`), false the day after, false without dates; *today* is the Asia/Ho_Chi_Minh date (23:30 UTC on 14/08 is already 15/08 in Vietnam); `verifiedMonth`; `isExpiring` within 30 days (BR-004, FR-011);
  - the state machine of data-model.md §4 (five SC-25 steps, D7): every allowed move by the right side passes, every other move (wrong side, from a final status, `accepted` without the partner NDA, `confirm` without the producer NDA) is refused; `step()` gives 1–5 / `null` (SR-141, D7); `isFinal` for declined, withdrawn, confirmed (BR-005).
- [X] T007 [P] Create unit test of notification emails in tests/unit/partner-email.test.js with a fake Resend client: `deliverQueued(deliveryRows)` sends each queued row once to its `recipient_email` from `EMAIL_FROM`, marks it `sent` with `provider_message_id`; a provider error marks `bounced` on the same row, which keeps its `notification_id`, leaves the notification in place and never throws (analysis C1); without `RESEND_API_KEY` nothing is called and rows stay `queued`; the key never appears in a log line or a result (FR-015, R13, Constitution IV)

### Implementation for Phase 2

- [X] T008 D1, D2, D6 through the generators, never by hand in data/ (approved by Nam Tran 06/11/2026; data owner Nguyễn Huy Trung to review before merge):
  - tools/dm_model2.py: entities ORGANISATION_USER and PARTNER_INVITATION (columns of data-model.md §2), `verification_request.submitted_at` (Req), `decided_at` (Opt); relationships USER_ACCOUNT *acts for* ORGANISATION, ORGANISATION *is invited through* PARTNER_INVITATION, USER_ACCOUNT *invites* / *accepts* PARTNER_INVITATION; natural keys;
  - tools/dm_rules.py: BR-003 evidence (invitations) and the enforcement text of M4 BR-003 and SYS BR-002 (*partner accounts created by admin only* → *partner role only by accepting a VFDA invitation sent by `vfda_staff` or `admin`*), BR-004 evidence (dates);
  - tools/rls_policies.py: `rls_org_private_after_nda` with both NDA rows; org-user select on `organisation_private_layer`, `verification_request`, `collab_request`, `collab_message`, `nda_acceptance`; own rows of `organisation_user`; `vfda_staff` (and so `admin`) select on `partner_invitation`; the partner rows of `DEFERRED` removed (writes go through the functions);
  - data/seed/generate_seed.py and data/seed/seed_rules.py: rows and rules of T003;
  - then `python3 tools/build_data.py --mermaid`, `python3 data/seed/generate_seed.py && python3 data/seed/check_seed.py`, `python3 tools/build_schema.py`, `python3 data/schema/load_check.py`, `python3 tools/build_dm_docs.py --mermaid`, `python3 tools/build_supabase.py` (check `mmdc --version` first) (verifies T003)
- [X] T009 Write supabase/migrations/20261106000200_m4_partners.sql: tables and columns for pushed databases, checks, `app.is_org_user`, the 15 functions of data-model.md §6 with their audit rows and notifications, the three triggers, the revokes and grants, the bucket and the guarded `pg_cron` job; then run it on PostgreSQL (PGlite in the scratchpad, not a dependency) before reporting it done (build-log Entry 9) (verifies T004)
- [X] T010 [P] Add the triggers `trg_collab_request_final`, `trg_collab_message_no_update`, `trg_document_access_log_append_only` for SQLite to lib/db/local-triggers.sql (BR-005, BR-007, BR-009) (verifies T005)
- [X] T011 [P] Implement lib/partners/service-groups.js (`SERVICE_GROUPS`, `isServiceGroup`), lib/partners/badge.js (`isVerified`, `verifiedMonth`, `isExpiring`, `todayInVietnam`), lib/partners/lifecycle.js (`transition`, `step`, `isFinal`, `OPEN_STATUSES`, `can`) (BR-002, BR-004, BR-005) (verifies T006)
- [X] T012 [P] Implement `deliverQueued()` in lib/email/resend.js (System; never logs the key) and call it after `notify()` for M4 events in lib/db/sqlite/notifications.js and lib/db/supabase/notifications.js (FR-015, R13) (verifies T007)
- [X] T013 [P] Add lib/api/partners.js (error codes of the contracts → HTTP: 401, 403, 404, 409 `INVALID_STATE` / `OPEN_REQUEST_EXISTS` / `ORG_DEACTIVATED` / `ARCHIVED` / `PENDING_EXISTS` / `INVITATION_OPEN` / `ALREADY_MEMBER_OF_PROJECT`, 410 `INVITATION_INVALID`, 422 `VALIDATION_ERROR` / `NDA_REQUIRED` / `FILE_INVALID`, 403 `EMAIL_MISMATCH`) and lib/partners/errors.js (`PartnerError`); add the 12 labels `partners.group.<value>` to lib/i18n/vi.json (draft labels of research R16) and lib/i18n/en.json (labels of tools/s6_en.py) (BR-002, Q1)

**Checkpoint**: `npm test` green for T003–T007, except the `app_grant_role` bullet of T004, which stays red until T028 (Phase 4, analysis G1); seed PASS; migration runs on PostgreSQL.

---

## Phase 3: User Story 1 — Find a partner who can sign my service agreement (Priority: P1) 🎯 MVP

**Goal**: guests and members browse active organisations by the 12 groups, province, language (signed in) and *VFDA Verified only*, and open a profile that shows exactly the layers RLS returns (FR-002, FR-003, FR-005, FR-006, BR-001, BR-002).

**Independent Test**: on the seed, *Full production services* + Ninh Bình + Korean + Verified lists Bến Xưa and the joint-stock company with their Verified month and nothing else; a guest sees no project count or languages and no language filter.

### Tests for User Story 1 (write first, see them fail) ⚠️

- [X] T014 [P] [US1] Create unit test of the directory and profile data on node:sqlite in tests/unit/partners-data.test.js:
  - US-1 Scenario 1: `listDirectory(member, { group: 'full_production', province: 19, language: 'ko', verified_only: true })` returns exactly the seed organisations that match (computed from the seed files: today Bến Xưa Production Services and the joint-stock company), each with `verified_month`;
  - US-1 Scenario 2: the same call as a guest returns no `member` field and ignores `language` (research Open question 7);
  - `verified_only` is true when omitted; with `false`, Sông Hậu Film Services (badge ended 15/08/2026) is listed with `verified: false`; Cửu Long Drone Works (deactivated) is never listed (BR-008);
  - §3 edge case *badge expires during an open request* (analysis C2): Sông Hậu has the open seed request of *Rice and Salt* (`info_requested`), yet it is absent from the default (verified-only) list and shown unverified otherwise — the open request does not keep the badge;
  - group counts cover the 12 values in order over the filtered set (SC-19 #3); `q: 'ben xua'` finds *Bến Xưa* (accents ignored);
  - `getProfile(viewer, slug)`: a guest gets layer 1 only; a signed-in member layers 1–2; nobody gets the private layer without an `accepted`/`confirmed` request with both NDA rows (BR-001, R3); `checked` is the latest approved request while verified; an unknown slug is `NOT_FOUND`; a deactivated organisation gives `active: false` and no layer 2 or 3 (SR-346).

  (FR-002, FR-003, FR-005, FR-006, BR-001, BR-002, BR-004)
- [X] T015 [P] [US1] Create contract test of `GET /api/partners` and `GET /api/partners/:slug` with the Supabase fake in tests/contracts/partners-api.test.js: 422 with `fields` for a group outside the 12, a non-numeric province, a language that is not 2 lower-case letters, `q` over 80; a guest answer has no `member` key at all (US-1 Scenario 2, SC-003); `layers` follows the rows the fake returns (no private row → `private: false`, no `private` key); 404 for an unknown or malformed slug (FR-002..FR-006, BR-001)
- [X] T016 [P] [US1] Create unit test of the SC-19 and SC-20 view rules in tests/unit/directory-view.test.js:
  - SC-19: filters read from and written to the URL; *VFDA Verified only* on by default (#6, SR-123); the member line (#10) and the language filter (#5) hidden for guests; *Send request* goes to `/login?next=` for guests and to SC-23 otherwise (#11); *Not verified* only when #6 is off (#12); initials when there is no logo (#7);
  - SC-20: the three-layer indicator from `layers` (#12); *View request* instead of *Send* when `my_request` is open (#13); the Article 13 badge only while verified, always with *not legal advice* (#6, Q3, research Open question 6);
  - the *what VFDA checked* and *not checked* texts exist in both languages and name quality and prices (#10, BR-004, SR-134).

  (FR-002, FR-005, FR-006, BR-004, Q3)
- [X] T017 [P] [US1] Add to the online suite tests/rls/rls.test.js: with the publishable key, `organisation` rows are readable while `organisation_member_layer` and `organisation_private_layer` are refused by GRANT or return 0 rows; a signed-in member fixture reads the member layer and 0 rows of the private layer; no direct insert into `organisation`; fixtures and their organisations removed afterwards (BR-001, SC-003, R3)

### Implementation for User Story 1

- [X] T018 [P] [US1] Implement lib/partners/directory.js (filter, accent-free search with `removeDiacritics` of lib/db/search-core.js, group counts) and lib/partners/layers.js (shape `public` / `member` / `private` / `layers` from the rows actually read) (FR-005, FR-006, BR-001) (verifies T014 pure parts, T016)
- [X] T019 [US1] Implement `listDirectory()` and `getProfile()` in lib/db/partners.js, lib/db/sqlite/partners.js (the node:sqlite twin of the three read policies) and lib/db/supabase/partners.js (user client, RLS decides) (FR-002, FR-003, FR-004 read, FR-005, FR-006) (verifies T014)
- [X] T020 [US1] Implement app/api/partners/route.js and app/api/partners/[slug]/route.js (verifies T015)
- [X] T021 [US1] Build SC-19 in app/partners/page.js and app/partners/directory-client.js, and SC-20 in app/partners/[slug]/page.js and app/partners/[slug]/profile-view.js, in the order of docs/screens/screen-spec-SC-19.md and screen-spec-SC-20.md (the private layer shown locked until R3 opens it) (FR-002..FR-006, BR-001) (verifies T016)
- [X] T022 [P] [US1] Add the header link *Đối tác / Partners* → `/partners` in app/components/site-header.js and the `partners.*` texts to lib/i18n/vi.json, en.json; `node scripts/check-i18n.mjs` and tests/unit/i18n-no-hardcoded.test.js stay green (FR-006 of SYS)
- [ ] T023 [US1] Quickstart slice 1 on `cinematch-dev` after Nam Tran's `npx supabase db push --remote` and `node scripts/seed-supabase.mjs --reset`; the browser steps by Nam Tran; results (US-1 Scenarios 1–2, SC-001, SC-003) in specs/007-m4-partners/quickstart.md §Results

**Checkpoint**: US-1 works on its own (MVP).

---

## Phase 4: Partner accounts by VFDA invitation (BR-003, D2)

**Goal**: a `vfda_staff` or `admin` user enters an organisation and an email; the invitee gets a one-time link, signs up or signs in, accepts and becomes `partner` for that organisation; nobody else ever becomes `partner`.

**Independent Test**: on node:sqlite, an invitation accepted by the right signed-in account gives role `partner` and one `organisation_user` row with a `role.grant` audit row; every other path is refused.

### Tests (write first, see them fail) ⚠️

- [X] T024 [P] Create unit test of the paths to the `partner` role in tests/unit/partner-role-paths.test.js (SYS BR-002 as changed 06/11/2026, BR-003, analysis G1): it reads lib/, app/, scripts/ and supabase/migrations/ and finds that
  - the newest definition of `public.app_grant_role` refuses `p_role = 'partner'` before any UPDATE (`ROLE_BY_INVITATION_ONLY`), still requires `admin`, still audits `role.grant` for the other roles;
  - the only code that sets `role = 'partner'` is `app_accept_partner_invitation` and its node:sqlite twin `acceptInvitation` in lib/db/sqlite/partner-invitations.js (the test fails while that twin does not exist, so it cannot pass before its code — build-log Entry 12);
  - no route under app/api/ calls `app_grant_role` with `partner`.
- [X] T025 [P] Create unit test of invitations on node:sqlite in tests/unit/partner-invitations-data.test.js:
  - `createInvitation(staff, { org, email })` by `vfda_staff` and by `admin` creates the organisation's public layer (slug from the name, accents removed) and the invitation; returns the code once; only its SHA-256 is stored; one `audit_log` row `partner.invite` with the inviter as `admin_id`; `member`, `partner` and `vfda_legal` are refused (SYS BR-002 as changed 06/11/2026, SYS question 6); a second open invitation for the same email and organisation is `INVITATION_OPEN`;
  - `acceptInvitation(session, code)`: another signed-in email → `EMAIL_MISMATCH`; an expired or used code → `INVITATION_INVALID`; an account on any project → `ALREADY_MEMBER_OF_PROJECT` (research Open question 3); the right account → role `partner`, one `organisation_user` row, `accepted_at` / `accepted_by` set, one `audit_log` row `role.grant` whose `admin_id` is the inviter; the same code again → `INVITATION_INVALID`;
  - an ordinary sign-up still creates a `member`, and an admin is still the only one who can grant `vfda_staff`, `vfda_legal` or `admin` (SYS BR-002).

  (BR-003, SYS BR-002, D2)
- [X] T026 [P] Create contract test of the invitation routes with the Supabase fake and a fake Resend in tests/contracts/partner-invitations-api.test.js: `POST /api/admin/partner-invitations` 201 for `vfda_staff` and `admin`, 403 for `member`, `partner`, `vfda_legal`; exactly one email to the invited address with the link `/invitations/partner/<code>`; the code appears in neither the JSON answer nor any log line; `GET /api/partner-invitations/:code` shows the organisation name and a masked email; `POST …/accept` 401 guest, 403 `EMAIL_MISMATCH`, 410 `INVITATION_INVALID`, 200 `{ role: 'partner' }` (BR-003)
- [X] T027 [P] Create unit test of the invitation and organisation input in tests/unit/invitation-input.test.js: email (≤ 254, valid form, stored lower-case); organisation fields per data-model.md §5 (`org_name` 1–200, `legal_form` 1–60, `service_groups` only the 12 and at least one, `provinces` at least one of the 34); every error a dictionary key in both languages (BR-002, BR-003)

### Implementation

- [X] T028 Replace `public.app_grant_role(uuid, text)` in supabase/migrations/20261106000200_m4_partners.sql (`CREATE OR REPLACE`, same signature and grants): `p_role = 'partner'` raises `ROLE_BY_INVITATION_ONLY` before any UPDATE; `vfda_staff`, `vfda_legal`, `admin`, `member` still granted only by an admin with one `role.grant` audit row; run on PGlite (admin granting `partner` refused, granting `vfda_staff` still works) (SYS BR-002, BR-003) (verifies the `app_grant_role` part of T004 and T024)
- [X] T029 [P] Implement the organisation and invitation checks in lib/partners/input.js (verifies T027)
- [X] T030 Implement `createInvitation()`, `listInvitations()`, `getInvitation()`, `acceptInvitation()` in lib/db/partner-invitations.js, lib/db/sqlite/partner-invitations.js and lib/db/supabase/partner-invitations.js (RPC `app_create_partner_invitation`, `app_accept_partner_invitation`) (verifies T025)
- [X] T031 [P] Implement `sendPartnerInvitation({ email, org_name, link })` in lib/email/resend.js (System; the link is never logged) (verifies T026 email part)
- [X] T032 Implement app/api/admin/partner-invitations/route.js, app/api/partner-invitations/[code]/route.js and app/api/partner-invitations/[code]/accept/route.js (verifies T026)
- [X] T033 Build the invitation form app/admin/partners/invite/page.js, invite-form.js and the acceptance page app/invitations/partner/[code]/page.js, accept-button.js (no Screen Spec, research Open question 9); header link *Mời đối tác* for `vfda_staff` and `admin`; `invitations.*` texts in lib/i18n (BR-003)
- [ ] T034 Quickstart slice 4 steps 1–2 on `cinematch-dev`: Nam Tran signs in as the seed staff account, invites *Hanoi Grip & Light* at a test inbox (the email arrives), and opens the link as the seed member (`EMAIL_MISMATCH`); step 3 (accepting) is **not run online** — it would need a temporary account (analysis I3) — and is covered offline by T025, T026; results in specs/007-m4-partners/quickstart.md §Results (BR-003)

---

## Phase 5: User Story 3 — Get VFDA Verified (Priority: P1)

**Goal**: a partner keeps its profile (SC-21) and applies with a business registration PDF in the private bucket and two references (SC-22); VFDA staff approve or reject with a reason on SC-36, switch the Article 13 flag, and every decision is audited; the badge lasts 12 months and is reminded 30 days before (FR-001, FR-008..FR-011, BR-004, Q2, Q3).

**Independent Test**: on node:sqlite, a submitted request approved by staff gives the organisation a badge valid until the same day next year with one audit row; a rejection needs a reason and notifies the partner.

### Tests for User Story 3 (write first, see them fail) ⚠️

- [X] T035 [P] [US3] Create unit test of the organisation profile on node:sqlite in tests/unit/org-profile-data.test.js: `getMyOrganisation` for a seed partner returns its organisation and all three layers; `saveOrgProfile` by a user of the organisation writes each field to its own table (BR-001); service groups outside the 12 refused (BR-002); `verified_at`, `verified_until`, `art13_eligible`, `org_status`, `slug` refused (SR-326); a partner of another organisation and a member refused; changes live at once (D3) (FR-001)
- [X] T036 [P] [US3] Create unit test of verification on node:sqlite with the in-memory Storage fake in tests/unit/verification-data.test.js:
  - submit: the object must exist under `<org_id>/verification/`, be ≤ 25 MB and start with `%PDF-` (`FILE_INVALID` otherwise); at least two non-empty references (empty rows ignored); one pending per organisation (`PENDING_EXISTS`); only a user of the organisation; `submitted_at` set; staff notified;
  - US-3 Scenario 1: staff approve → `status = approved`, `decided_by`, `decided_at`; the organisation's `verified_at = decided_at`, `verified_until` = the same Vietnam date next year; one `audit_log` row `org.verify.approve`; the organisation's users notified;
  - US-3 Scenario 2: reject without a reason refused; with a reason → `rejected`, the reason sent in the notification; one `audit_log` row `org.verify.reject`;
  - only from `pending` (`INVALID_STATE`); a member or partner cannot decide (`FORBIDDEN`);
  - `setArt13(on: true)` without `business_line_confirmed` refused; each change one `audit_log` row; a partner cannot switch it (Q3, SR-133);
  - `remindExpiringVerifications(today)` notifies the users of each organisation whose badge ends within 30 days once; a second run notifies none; an expired badge is no longer verified (FR-011).

  (FR-008, FR-009, FR-010, FR-011, BR-004, Q2, Q3)
- [X] T037 [P] [US3] Create unit test of the private file store in tests/unit/org-documents-storage.test.js: paths only under `<org_id>/verification/`; a signed upload URL only for a user of that organisation; a signed download URL (60 s) only for staff and the organisation's users; the size and `%PDF-` header check; the local adapter writes under the OS temp folder; no public URL is ever produced; with `NODE_ENV=production` every `/api/dev/*` route answers 404 (analysis U1) (R10, SR-335)
- [X] T038 [P] [US3] Create contract test of the verification routes with the Supabase fake and the Storage fake in tests/contracts/verification-api.test.js: partner routes (upload 422 over 25 MB or not PDF; submit 422 for references or file, 409 `PENDING_EXISTS`, 201); `GET /api/partners/me` and `PATCH` (422 for a badge field); staff routes 403 for member and partner; queue order (pending oldest first, then newest decision), `counts`, `oldest_pending_days`; decision 422 without a reason, 409 when not pending; seed document → 404 `FILE_MISSING`; Article 13 422 without the confirmation; `PUT /api/dev/org-documents/…` answers 404 under `NODE_ENV=production` (analysis U1) (FR-001, FR-008..FR-010)
- [X] T039 [P] [US3] Create unit test of the SC-21, SC-22 and SC-36 view rules in tests/unit/verification-view.test.js: SC-21 *Save* enabled only when changed and #4–#7 valid, badge and Article 13 read-only, *Preview as* built by lib/partners/layers.js, the portfolio field says *describe the work without project titles* (SR-132, analysis I4); SC-22 checklist items and *Submit* disabled until complete or while pending (SR-332); SC-36 approve preview = decision date + 12 months, *Reject* disabled while the reason is empty, Article 13 switch needs the business-line box; the SC-22 *what VFDA checks — and what it does not* text names quality and prices in both languages (SR-333, BR-004)

### Implementation for User Story 3

- [X] T040 [P] [US3] Implement the profile and verification checks in lib/partners/input.js (data-model.md §5) (verifies T035, T036 input parts)
- [X] T041 [P] [US3] Implement lib/storage/org-documents.js (Supabase signed URLs through the System client; local adapter; `setOrgDocumentsForTests`) and the development upload target app/api/dev/org-documents/[...path]/route.js (404 when `NODE_ENV=production`) (R10) (verifies T037)
- [X] T042 [US3] Implement `getMyOrganisation()`, `saveOrgProfile()` in lib/db/partners.js and both sources, and `submitVerification()`, `listMyVerification()`, `listVerificationQueue()`, `decideVerification()`, `setArt13()`, `remindExpiringVerifications()` in lib/db/verification.js, lib/db/sqlite/verification.js, lib/db/supabase/verification.js (FR-001, FR-008..FR-011) (verifies T035, T036)
- [X] T043 [US3] Implement app/api/partners/me/route.js (GET, PATCH), app/api/partners/me/verification/route.js, upload/route.js, [id]/document/route.js, app/api/admin/verification/route.js, [id]/document/route.js, [id]/decision/route.js, app/api/admin/organisations/[id]/art13/route.js (verifies T038)
- [X] T044 [P] [US3] Add scripts/remind-verification.mjs and the `verification:remind` script in package.json (FR-011)
- [X] T045 [US3] Build SC-21 in app/partners/me/page.js, org-form.js, SC-22 in app/partners/me/verify/page.js, verify-form.js (direct upload with the signed URL) and SC-36 in app/admin/verification/page.js, verification-queue.js, in the order of their Screen Specs; header links *Tổ chức của tôi* (partner) and *Xác minh đối tác* (staff); `verification.*`, `org.*` texts in lib/i18n (FR-001, FR-008..FR-010) (verifies T039)
- [ ] T046 [US3] Quickstart slice 3 on `cinematch-dev`: Nam Tran as the seed partner account of Bến Xưa (added to Auth by Nam Tran, plan Known limitation 10) and as the seed staff account in the browser; a test PDF only; results (US-3 Scenarios 1–2, SC-004) in specs/007-m4-partners/quickstart.md §Results

---

## Phase 6: User Story 2 — Send a request and follow it to confirmation (Priority: P1)

**Goal**: a producer sends a request tied to a project (SC-23), both sides follow it on SC-25 through five steps (D7) with messages, the partner responds (accepting with the NDA), the producer confirms after their own NDA; final states never change; confirming fills the Partners gauge and leaves the dossier alone; a deactivated organisation closes its open requests (FR-012..FR-016, BR-005, BR-006, BR-008, BR-009).

**Independent Test**: on node:sqlite, *Lantern Street*'s owner sends a request to Bến Xưa (step 1, one notification per party), Bến Xưa accepts with the NDA (step 3), the owner ticks the NDA (step 4) and confirms (step 5); the Partners gauge is 100 and `document_slot` is unchanged.

### Tests for User Story 2 (write first, see them fail) ⚠️

- [X] T047 [P] [US2] Create unit test of collaboration requests on node:sqlite in tests/unit/collab-data.test.js (one database, tests in order):
  - US-2 Scenario 1: `sendRequest(owner, { project_id, org_id, services, note })` → `pending`, `sent_at`, step 1;
  - FR-015 (analysis I2): **every status change** — send, each respond decision, confirm, withdraw, and the withdrawals of a deactivation — creates **one notification for each party**: every user of the organisation and every accepted member of the project, including the side that acted, each with its queued email row; a new message notifies only the other side;
  - refusals: a *view* member (`FORBIDDEN`), an archived project (`ARCHIVED`), a deactivated organisation (`ORG_DEACTIVATED`), a second open request of the same project to the same organisation (`OPEN_REQUEST_EXISTS`), no service or one outside the 12, a note over 1000 characters;
  - respond: only a user of the organisation; `accepted` without `nda_accepted` → `NDA_REQUIRED`; with it → step 3, one partner `nda_acceptance` row, `responded_at` set once; the note stored as a `collab_message` (BR-009);
  - US-2 Scenario 2: `confirm` before the producer NDA → `NDA_REQUIRED`; `acceptNda` by the owner; `can.confirm` true;
  - US-2 Scenario 3: `confirm` → `confirmed`, `confirmed_at`; one notification per party; `v_project_readiness.partners_score` = 100 for the project (FR-016); `document_slot` of the project unchanged and `component_c = 'pending'` (BR-006);
  - BR-005: on a confirmed, declined or withdrawn request every action is `INVALID_STATE`; a partner cannot confirm or withdraw; a producer cannot accept or decline;
  - `withdraw` from each open status; `postMessage` by either side, 1–2000 characters; messages listed in order with the author's side;
  - §3 edge case (analysis C2): the seed request of *Rice and Salt* to Sông Hậu (badge ended 15/08/2026) stays `info_requested`; its producer can still post a message and withdraw it; `getRequest` shows the organisation `verified: false`;
  - BR-008: `deactivateOrg` with the wrong name refused; with the right name every open request of the organisation becomes `withdrawn` with a system message, their projects' members are notified, nothing is deleted, the access log stays.

  (FR-012..FR-017, BR-005, BR-006, BR-008, BR-009)
- [X] T048 [P] [US2] Create contract test of the request routes with the Supabase fake in tests/contracts/requests-api.test.js: every route of contracts/requests-api.contract.md with 401, 403, 404, 409 and 422 cases; the RPC names and arguments; `GET /api/requests/:id` shape (`step`, `final`, `can`, `nda`, `component_c`, `quiet_days`); `GET /api/requests?project_id=` most recently updated first; `?direction=incoming` for a partner; `?direction=outgoing` for a member lists the requests of all their projects, each with its project, and 403 for a partner (analysis C3); `POST …/nda` with `accepted: false` is 422 (analysis U3); `POST /api/partners/me/deactivate` 422 for a wrong name (FR-012..FR-015, BR-005, BR-008)
- [X] T049 [P] [US2] Create unit test of the SC-23 and SC-25 view rules in tests/unit/request-view.test.js:
  - SC-23: only non-archived projects where the member is owner or *edit* (#4, SR-343); the organisation's own groups first (#6); note counter to 1000 (#7); Article 13 notice only when the organisation is not eligible (#8, SR-345); *Send* disabled until #4 and #6 (#10);
  - SC-25: exactly five steps with the labels *Sent*, *Viewed*, *Accepted*, *NDA agreed*, *Confirmed* (D7); declined / withdrawn shown as end states (SR-141); *Confirm partnership* enabled only on `accepted` with the NDA ticked (#9, #10, SR-143); partner buttons only for the partner (#11); composer 1–2000 (#12); the consequences note says component c is not marked present (#13, SR-144); the withdraw hint from 14 quiet days (research Open question 4).

  (FR-012, FR-013, FR-014, BR-005, BR-006)

### Implementation for User Story 2

- [X] T050 [P] [US2] Implement the request and message checks in lib/partners/input.js and lib/partners/nda.js (reads config/nda/NDA-2026.1.json; current version) (FR-012, FR-014, FR-017) (verifies T047, T049 input parts)
- [X] T051 [US2] Implement `sendRequest()`, `listRequests()`, `getRequest()`, `respond()`, `acceptNda()`, `confirm()`, `withdraw()`, `postMessage()` in lib/db/collab.js, lib/db/sqlite/collab.js, lib/db/supabase/collab.js, and `deactivateOrg()` in lib/db/partners.js and both sources; notifications through SYS `notify()` + `deliverQueued()` (FR-012..FR-017, BR-005, BR-006, BR-008, BR-009) (verifies T047)
- [X] T052 [US2] Implement app/api/requests/route.js, app/api/requests/[id]/route.js, [id]/respond/route.js, [id]/nda/route.js, [id]/confirm/route.js, [id]/withdraw/route.js, [id]/messages/route.js and app/api/partners/me/deactivate/route.js (verifies T048)
- [X] T053 [US2] Build SC-23 in app/partners/[slug]/request/page.js, request-form.js and SC-25 in app/requests/page.js (one project's list, the member's outgoing list over all projects, analysis C3, and the partner inbox), app/requests/[id]/page.js, request-client.js, request-view.js, in the order of their Screen Specs; the *Deactivate organisation* block (#18) on SC-21; project sidebar item *Đối tác / Partners* in app/projects/[id]/project-nav.js; partner header link *Yêu cầu*; `requests.*` texts and the `notification.event.collab_request.*`, `collab_message.posted`, `verification.*` keys in lib/i18n (verifies T049)
- [ ] T054 [US2] Quickstart slice 2 on `cinematch-dev`: Nam Tran as the seed member (owner of *Lantern Street*) and as the seed partner account of Bến Xưa in the browser; no temporary account; the emails to seed `example` addresses are expected to end `bounced`; the private-layer check (slice 2 step 4, before / after the producer NDA) runs between the partner's acceptance and *Confirm*; results (US-2 Scenarios 1–3, US-4 Scenario 1) in specs/007-m4-partners/quickstart.md §Results

---

## Phase 7: User Story 4 — Protect confidential material, Scenario 1 (Priority: P2)

**Goal**: the private layer opens to a project's members only after the request is accepted and both parties accepted the NDA, and to nobody else; the document access log is append-only and has its log function for M5 (FR-004, FR-017, BR-001, BR-007; D4).

**Independent Test**: on the seed, *The Last Ferry*'s members read Bến Xưa's rate card (accepted, both NDA rows); members of other projects and guests read nothing; a new accepted request opens the layer only after the producer's NDA.

### Tests for User Story 4 (write first, see them fail) ⚠️

- [X] T055 [P] [US4] Create unit test of the private layer on node:sqlite in tests/unit/private-layer-data.test.js:
  - seed: the members of *The Last Ferry* read Bến Xưa's private layer (request accepted with a producer and a partner NDA row); a member of another project and a guest read none; Bến Xưa's own partner reads it;
  - US-4 Scenario 1: on the T047-style request accepted by the partner, the producer's layer-3 read is empty before `acceptNda` and returns rate card, past clients and direct contact after it;
  - a declined NDA row (`accepted = false`, seed `n5`) opens nothing; a request that becomes `withdrawn` closes the layer again.

  (FR-004, FR-017, BR-001)
- [X] T056 [P] [US4] Create unit test of the access-log function on node:sqlite in tests/unit/document-log.test.js: `logDocumentView(session, document_id)` adds one row with the viewer and the Vietnam time; the row cannot be changed or deleted (BR-007); an unknown document is `NOT_FOUND` (FR-018, D4)
- [ ] T057 [P] [US4] Add to the online suite tests/rls/rls.test.js, with **member fixtures only** (no partner or staff fixture, no sign-in on anyone's behalf; analysis I3) and the seed data: a member fixture not on *The Last Ferry* reads 0 rows of Bến Xưa's private layer, although the seed request of *The Last Ferry* to Bến Xưa is accepted with both NDA rows; the fixture owner's own project sends a request to Bến Xưa (no note, so no message) and still reads 0 rows; `app_accept_nda` on that `pending` request is refused; a direct insert into `nda_acceptance` is refused. After the run the suite deletes what it can with the secret key (its requests, which carry no message, its project, accounts and organisations) and prints anything a trigger keeps; it does not promise a full clean-up — the next `node scripts/seed-supabase.mjs --reset` clears the rest. The positive case (rows visible after both NDA rows) is checked offline by T055 and in the browser by T060 (BR-001, FR-004)

### Implementation for User Story 4

- [X] T058 [US4] Make the node:sqlite twin of `rls_org_private_after_nda` in lib/db/sqlite/partners.js match the policy (both NDA rows, `accepted`/`confirmed`, project member; or a user of the organisation) and show the unlocked layer on SC-20 (`profile-view.js`) and *Preview as Accepted* on SC-21 (FR-004, BR-001) (verifies T055)
- [X] T059 [P] [US4] Implement `logDocumentView()` in lib/db/document-log.js, lib/db/sqlite/document-log.js, lib/db/supabase/document-log.js (RPC `app_log_document_view`; no route or screen in this slice, D4) (verifies T056)
- [ ] T060 [US4] On `cinematch-dev`: record the private-layer step of slice 2 (step 4) for US-4 Scenario 1; check 10 profiles in a private window (SC-003); then slice 4 step 4 — `npm run test:rls` (T057) **before** the deactivation — and step 5, the deactivation of Bến Xưa by Nam Tran in the browser, last; after step 5 Nam Tran runs `node scripts/seed-supabase.mjs --reset` before any other online test (analysis G3); results in specs/007-m4-partners/quickstart.md §Results

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T061 [P] Check every new text: `node scripts/check-i18n.mjs`, tests/unit/i18n-no-hardcoded.test.js; every screen at 360 px width (in an iframe of that width, build-log Entry 10)
- [ ] T062 Run `npm test`, `npm run build`, `npm run test:rls` (before slice 4 step 5, or after the `--reset` that follows it — analysis G3), `npm run check:supabase`, `uv run tools/start_feature.py --check`, `python3 tools/build_supabase.py --check`, `python3 data/seed/check_seed.py`, `python3 data/schema/load_check.py`; time `GET /api/partners` and `GET /api/partners/:slug` on the seed (`next start`, 10 calls each, under 1 s; plan Performance Goals, analysis A1); record each result in specs/007-m4-partners/quickstart.md §Results
- [X] T063 Add the build-log entry (feature row, run entry with who ran and who reviewed, agent mistakes in §4; update the M4 spec-issue rows already in §3 — the interim choices of plan.md *Waiting for VFDA confirmation* and research Open questions 14–16) in docs/build/build-log.md and the AI-use row in docs/ai-use-log.md

---

## Not in this plan

- FR-007 (Could): semantic ranking — embeddings undecided (SYS open question 3).
- FR-018 document viewer, FR-019 (Could) and US-4 Scenario 2: with M5 (D4).
- Moderation of partner edits (SC-21 SR-323, M10 BR-001): with M10 (D3).
- Automatic expiry of unanswered requests (spec OQ5) and retry of bounced emails (Known limitations 4, 6).
- Ratings and reviews (M8); contracts and payments (out of scope, spec §1).
- Changing the Screen Specs' *Open* status of Q1–Q4 (research Open question 11): at the sources `tools/s*_en.py`, only when Nam Tran asks for it.

---

## Traceability: rule or scenario → test → code

| Rule / scenario | Test (written first) | Code that turns it green |
|---|---|---|
| BR-001 — three layers, three tables, three policies | T004, T014, T015, T017, T035, T055, T057 | T008, T009, T018, T019, T042, T058 |
| BR-002 — 12 fixed service groups | T003, T006, T014, T027, T035 | T008, T011, T013, T029, T040 |
| BR-003 / SYS BR-002 — partner role only by accepting an invitation from `vfda_staff` or `admin`; `app_grant_role` refuses `partner` | T004, T024, T025, T026 | T008, T009, T028, T030–T033 |
| BR-004 — 12 months, checked / not checked | T003, T006, T016, T036, T039 | T008, T011, T042, T045 |
| BR-005 — partner accepts / declines, producer confirms; finals | T003, T004, T005, T006, T047, T048, T049 | T009, T010, T011, T051, T052 |
| BR-006 — confirm does not mark component c present | T047, T049 | T051, T053 |
| BR-007 — access log append-only | T004, T005, T056 | T009, T010, T059 |
| BR-008 — deactivate, never delete; open requests withdrawn | T003, T014, T047, T048 | T051, T052 |
| BR-009 — notes and replies are uneditable messages | T004, T005, T047 | T009, T010, T051 |
| Q2 / Q3 — Verified on legal documents; Article 13 only by VFDA after the business-line check | T016, T036, T038, T039 | T042, T043, T045 |
| Q4 — one mutual bilingual NDA with a version | T047, T055 | T002, T050, T051 |
| D1, D2, D6 — data model | T003 | T008 |
| R10 — private bucket `org-documents` | T004, T037, T038 | T009, T041 |
| FR-015 — one notification per party on every status change, in-app and by email | T007, T036, T047 | T012, T042, T051 |
| FR-013 — incoming (partner) and outgoing (member) lists | T048, T049 | T051, T052, T053 |
| §3 edge case — badge expires during an open request | T014, T047 | T019, T051 |
| FR-016 — Partners gauge | T047 | (M0 view, unchanged) T051 |
| US-1 Scenario 1 — filtered verified list with month | T014, T016 | T018, T019, T021 |
| US-1 Scenario 2 — guest sees public layer only | T014, T015, T017 | T019, T020, T021 |
| US-2 Scenario 1 — sent, partner notified (one notification per party), step 1 | T047, T048, T049 | T051, T052, T053 |
| US-2 Scenario 2 — confirm enabled after the NDA | T047, T049 | T051, T053 |
| US-2 Scenario 3 — confirmed, gauge 100, component c pending | T047 | T051 |
| US-3 Scenario 1 — approve, badge 12 months | T036, T038 | T042, T043 |
| US-3 Scenario 2 — reject needs a reason, sent to partner | T036, T038, T039 | T042, T043, T045 |
| US-4 Scenario 1 — NDA opens rate card, past clients, contact | T055, T057 | T058 |

---

## Dependencies & Execution Order

- **Phase 1** → **Phase 2** (blocks every story) → **US-1** (MVP) → **Invitations** → **US-3** → **US-2** → **US-4** → **Phase 8**.
- Offline, US-3, US-2 and US-4 use the seed partner accounts and need only Phase 2; online, the partner steps use the seed partner account of Bến Xưa (no account is made through Phase 4 online).
- T008 changes `data/` through the generators (approved 06/11/2026); data-owner review before merge. T023, T034, T046, T054, T060 and the online part of T062 need `npx supabase db push --remote` and `node scripts/seed-supabase.mjs --reset` by Nam Tran; T046, T054, T060 also need the seed partner account of Bến Xưa in Auth (plan Known limitation 10).
- Tests first within each phase:
  - T003–T007 before T008–T013;
  - T014–T017 before T018–T022;
  - T024–T027 before T028–T033;
  - T035–T039 before T040–T045;
  - T047–T049 before T050–T053;
  - T055–T057 before T058–T059.
- Order between tasks:
  - T008 before T009 (the migration matches the regenerated schema), T009 before every Supabase source;
  - T011 before T018, T051; T012 before T042, T051;
  - T018 before T019 before T020 before T021;
  - T028 before T030 (the invitation acceptance is then the only path to `partner`); T029 before T030 before T032 before T033;
  - T040, T041 before T042 before T043 before T045;
  - T050 before T051 before T052 before T053;
  - T051 before T058 (the producer NDA action).
- No test is changed to make it pass; when a test turns out wrong, the reason is reported and the change approved first.

### Parallel opportunities

- Phase 2 tests T003–T007 together; then T010, T011, T012, T013 in parallel after T008 / T009.
- US-1 tests T014–T017 together; T018 and T022 in parallel.
- Invitation tests T024–T027 together; T029 and T031 in parallel; T028 in parallel with T029.
- US-3 tests T035–T039 together; T040, T041, T044 in parallel.
- US-2 tests T047–T049 together; T050 in parallel with the end of US-3.
- US-4 tests T055–T057 together; T059 in parallel with T058.

### Parallel example: User Story 1

```text
T014 tests/unit/partners-data.test.js
T015 tests/contracts/partners-api.test.js
T016 tests/unit/directory-view.test.js
T017 tests/rls/rls.test.js (online, run later by npm run test:rls)
— all seen failing — then:
T018 lib/partners/directory.js, layers.js   ‖   T022 site header + texts
T019 → T020 → T021
```

### Parallel example: User Story 2

```text
T047 tests/unit/collab-data.test.js
T048 tests/contracts/requests-api.test.js
T049 tests/unit/request-view.test.js
— all seen failing — then:
T050 lib/partners/input.js, nda.js → T051 lib/db/collab.js (+ sources) → T052 routes → T053 SC-23, SC-25
```

---

## Implementation Strategy

1. **MVP first**: Phases 1–3 give a public, filterable directory and profiles with layers 1–2 (US-1); demo it before anything else.
2. **Partner invitations** (Phase 4), so that VFDA can onboard partners (online, only sending is tried; accepting is checked offline).
3. **Verified** (US-3): the trust signal the directory filters on by default.
4. **Requests** (US-2), then **the private layer** (US-4 Scenario 1), each ending with its quickstart slice.
5. Stop after any phase with green tests; record the result and the open questions in the build log.
