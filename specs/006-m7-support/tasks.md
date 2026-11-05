---
description: "Task list for VFDA support (M7): US-1 provincial notice, US-2 province reply, US-3 consultation request"
---

# Tasks: VFDA support — provincial notices and consultation requests (M7)

**Input**: Design documents from `/specs/006-m7-support/` — [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Prerequisites**: plan.md (decisions D1–D6), research.md (R1–R11, Open questions 1–8)

**Tests**: Required (Constitution Principle II and the request for this feature). The tests below are written and seen failing **before** the code that makes them pass:
- every business rule in scope: BR-001, BR-002, BR-003, BR-005;
- the RLS rule (non-members read no notice; only staff review);
- every acceptance scenario: US-1 Scenarios 1–2, US-2 Scenario 1, US-3 Scenario 1 as reshaped by BR-005.

Each implementation task names the test task it turns green. `npm test` stays offline and sends no email: `node:sqlite` + seed, Supabase through `tests/contracts/supabase-fake.js`, Resend through a fake client. Real RLS is checked by `npm run test:rls`; the real email only in the quickstart, after the reviewer agrees.

**Organization**: Phase 2 = data change (D1, D2, D5), migration and the project summary, which every story reads; Phase 3 = US-1 (MVP); Phase 4 = US-2; Phase 5 = US-3. The spec gives US-1 and US-2 priority P2 and US-3 P3. Not in this plan: FR-006, FR-007, BR-004, and the spec §3 edge cases (bounce, follow-up after N days, withdrawal).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1, US2, US3 (spec.md §3)
- Every task names its FR / BR / decision and its file paths

---

## Phase 1: Setup

- [ ] T001 Record the baseline on branch `006-m7-support` — `npm test`, `npm run build`, `uv run tools/start_feature.py --check`, `python3 data/seed/check_seed.py`, `python3 data/schema/load_check.py` — in specs/006-m7-support/quickstart.md §Results
- [X] T002 Add the dependencies `docx` and `resend` with `npm install docx resend` (package.json, package-lock.json); the reason is already in specs/006-m7-support/plan.md Technical Context (D6)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `province_notice` and `consultation_booking` hold the reviewed / downloaded flow and the preferred times (D1, D2); one notice per province per project (D5); every write goes through a checked database function; the project summary comes from the database (FR-002, BR-001).

**⚠️ CRITICAL**: Tests T003–T005 are written and seen failing before T006–T008.

### Tests for Phase 2 (write first, see them fail) ⚠️

- [X] T003 [P] Create unit test of the M7 seed and schema after D1, D2, D5 in tests/unit/m7-seed.test.js (reads data/schema/schema-M7.sql and the seed CSV files found by table name, never by NN prefix):
  - `ck_province_notice_review_status` allows draft, submitted, changes_requested, approved;
  - `ck_province_notice_recipient` allows peoples_committee, culture_department;
  - `ck_province_notice_delivery_status` adds `downloaded`;
  - `consultation_booking.preferred_times` exists;
  - every `approved` notice has `reviewed_by`;
  - every `downloaded` one is approved with `sent_at`;
  - every `changes_requested` one has a `review_note`;
  - a `response` only on a downloaded notice;
  - at most one notice per project and province;
  - the seed has at least one `submitted` and one `changes_requested` notice;
  - every booking has 1–3 `preferred_times`, the first equal to `slot_start`.
- [X] T004 [P] Create unit test of migration supabase/migrations/20261106000100_m7_notices.sql in tests/unit/m7-migrations.test.js:
  - columns added with `IF NOT EXISTS`; `ck_province_notice_delivery_status` replaced (adds `downloaded`); `ck_province_notice_review_status` and `ck_province_notice_recipient` added;
  - `app.notice_summary` and the six functions `app_express_interest`, `app_submit_notice`, `app_review_notice`, `app_mark_notice_downloaded`, `app_record_province_reply`, `app_request_consultation` are `SECURITY DEFINER` with `search_path = ''`;
  - EXECUTE granted to `authenticated` and revoked from `PUBLIC`, `anon`;
  - INSERT on `location_interest` and `consultation_booking` revoked from `authenticated`;
  - the member select policy on `consultation_booking` uses `member_id = auth.uid()`;
  - `app_review_notice` inserts into `audit_log`;
  - no `DELETE` anywhere;
  - **no function inserts into `email_delivery` or calls an HTTP extension** (`net.`, `http_post`) — BR-001.

  (BR-001, R6, R9)
- [X] T005 [P] Create unit test of the project summary in tests/unit/notice-summary.test.js (FR-002, BR-001, R3, SC-32 #9):
  - `noticeSummary(projectId, provinceId)` on node:sqlite for *The Last Ferry* / Ninh Bình names the project, format, first shooting day 15/03/2027, 24 shooting days, crew band 15–50, the Ninh Bình locations of its interests, and *no confirmed Vietnamese partner yet* (its partner request is `accepted`, not `confirmed`);
  - *Quiet Harbour Blues* names its confirmed partner's `org_name`;
  - a project without a first shooting day reports `missing: ['shoot_date']`.

### Implementation for Phase 2

- [X] T006 D1, D2, D5 in the generators, never by hand in data/:
  - `tools/dm_model2.py`: `PROVINCE_NOTICE` gains `review_status`, `review_note`, `recipient`, `response_recorded_by` (FK `USER_ACCOUNT`) and `delivery_status` gains `downloaded`; `CONSULTATION_BOOKING` gains `preferred_times`; each with its citation;
  - `tools/dm_model.py`: any relationship or CRUD row the new FK needs;
  - `tools/rls_policies.py`: member select on `consultation_booking` with `member_id = auth.uid()`;
  - `data/seed/generate_seed.py`: review states, one submitted and one changes_requested notice, no second Ninh Bình notice for *The Last Ferry*, `preferred_times`;
  - `data/seed/seed_rules.py`: the rules of T003 (`sent` and `bounced` are already exempt in `UNUSED_ENUM_VALUES`, done 06/11/2026, analysis U1).

  Then regenerate: `python3 tools/build_data.py --mermaid`, `python3 data/seed/generate_seed.py && python3 data/seed/check_seed.py`, `python3 tools/build_schema.py`, `python3 data/schema/load_check.py`, `python3 tools/build_dm_docs.py --mermaid` (mermaid-cli checked with `--version` first), `python3 tools/build_supabase.py`. Reviewed by the data owner. (verifies T003)
- [X] T007 Write supabase/migrations/20261106000100_m7_notices.sql: columns and constraints for pushed databases, the policy, the REVOKEs, `app.notice_summary(project_id, province_id)`, the six functions with the checks and error codes of data-model §4, grants. Run it on a scratch PostgreSQL (PGlite, not a dependency) against the seed before reporting it done (build-log Entry 9 lesson). (R1–R9; verifies T004)
- [X] T008 Implement `noticeSummary()` in lib/notices/summary.js (pure, from rows) and its node:sqlite reader in lib/db/sqlite/notices.js (verifies T005)

**Checkpoint**: the data model holds the flow; the summary is the same text on both databases; nothing can send a notice.

---

## Phase 3: User Story 1 — Let the province know (Priority: P2) 🎯 MVP

**Goal**:
- *I'm interested* drafts one notice per province from the project data (FR-001, FR-002);
- the member asks VFDA to review it; staff approve or request changes, with one audit row each;
- the member downloads the approved letter (.docx or PDF) for the recipient they choose and sends it themselves (BR-001, BR-002).

**Independent Test**: [quickstart.md](quickstart.md) Slice 1:
- SC-16 *Tràng An* → Ninh Bình card at step 1;
- no first shooting day → *Ask VFDA to review* disabled;
- staff request changes, then approve (2 audit rows);
- the member downloads .docx and PDF with the sentence;
- no `email_delivery` row for any notice.

### Tests for User Story 1 (write first, see them fail) ⚠️

- [X] T009 [P] [US1] Create unit test of the letter in tests/unit/notice-letter.test.js (BR-002, R3, Clarifications Q2):
  - `buildLetter(notice, recipient)` for `peoples_committee` and `culture_department` gives the matching Vietnamese addressee line, the Vietnamese text, then the English translation;
  - always both BR-002 sentences (*Thư này không thay thế giấy phép quay phim do Bộ Văn hóa, Thể thao và Du lịch cấp.* / *This letter does not replace the filming licence issued by the Ministry of Culture, Sports and Tourism.*);
  - the project summary;
  - no wording that says VFDA sends the letter (BR-001);
  - an unknown recipient throws.
- [X] T010 [P] [US1] Create unit test of the Word file in tests/unit/notice-docx.test.js (BR-002, R4): `letterDocx(letter)` returns a .docx buffer; unzipped with fflate (the zip library docx 9 depends on), `word/document.xml` contains the addressee, the project name and both BR-002 sentences, for both recipients.
- [X] T011 [P] [US1] Create unit test of the notice input checks in tests/unit/notice-input.test.js (FR-002, BR-003, R6, R7):
  - recipient only `peoples_committee` / `culture_department`;
  - review decision only `approve` / `request_changes`, the note 1–1000 characters and required for `request_changes` (`NOTE_REQUIRED`);
  - reply only `received` / `info_needed` / `cannot_support`, the note ≤ 2000 characters and kept as entered (not trimmed inside, not rewritten);
  - every error is a dictionary key in vi.json and en.json.
- [X] T012 [P] [US1] Create unit test of the notice data layer on node:sqlite in tests/unit/notices-data.test.js:
  - **expressInterest** (US-1 Scenario 1, D5): *Rice and Salt* + *Tràng An* drafts a Ninh Bình notice (`review_status` draft, `drafted_at`, summary from T008). The spec names *The Last Ferry*, which already has a downloaded Ninh Bình letter in the seed (analysis I3). A second Ninh Bình location joins that notice (`created: false`); *The Last Ferry* + *Tràng An* answers `ALREADY_SENT`; a location whose authority contact has no email still drafts a notice with an empty `authority_email` (research OQ5, decided 06/11/2026); *view* → `FORBIDDEN`; archived project → `ARCHIVED`; non-member → `NOT_FOUND`.
  - **submitNotice** (US-1 Scenario 2): *Monsoon Signal* (no first shooting day) → `SHOOT_DATE_REQUIRED`; a draft → `submitted`, summary recomputed.
  - **reviewNotice** (R6):
    - only a staff session; a member → `FORBIDDEN`; a draft → `INVALID_STATE`;
    - `request_changes` without a note → `NOTE_REQUIRED`;
    - approve sets `reviewed_by` and `delivery_status = queued`;
    - exactly one `audit_log` row per review (`notice.approve` / `notice.request_changes`), none when refused;
    - the project members get the notification.
  - **markDownloaded** (D7): owner / *edit* only (*view* → `FORBIDDEN`); only on an approved notice; the first call sets `recipient`, `delivery_status = downloaded`, `sent_at`, and later calls change none of them. **getApprovedLetter**: any member, *view* included, approved only, and it changes no column.
  - **BR-001**: across every call above, no `email_delivery` row goes to a province authority; the only new rows are the `province_notice.*` notifications of project members (SYS FR-008).

  (FR-001, FR-002, BR-001, RLS)
- [X] T013 [P] [US1] Create unit test that nothing sends a notice in tests/unit/no-notice-sending.test.js (BR-001): no file under lib/notices/, lib/db/*notices*, app/api/notices/, app/api/projects/[id]/interests/, app/api/admin/notices/ imports `resend`, lib/email/, or writes `email_delivery`.
- [X] T014 [P] [US1] Create contract test of the notice routes with the Supabase fake in tests/contracts/notices-api.test.js (contracts/notices-api.contract.md):
  - 401 for a guest on every route; a malformed id → 404 before any call;
  - `POST /api/projects/:id/interests` → 201 through `app_express_interest`; a `project_summary` in the body is ignored;
  - `GET /api/projects/:id/notices` one entry per province with `missing`;
  - `POST /api/notices/:id/submit` → 422 `SHOOT_DATE_REQUIRED`;
  - `POST /api/notices/:id/download` → 200 through `app_mark_notice_downloaded` with the recipient; 403 for *view*; 422 unknown recipient;
  - `GET /api/notices/:id/letter?format=docx&recipient=` → .docx content type and attachment name for any member (*view* included); 404 when not approved; 422 unknown recipient; **no RPC and no update is called** (analysis U2);
  - the print page app/projects/[id]/provinces/[noticeId]/print/page.js calls no recording function (checked in its source);
  - `GET /api/admin/notices` and `POST /api/admin/notices/:id/review`: 403 for a member, 200 for `vfda_staff` and `admin`, 422 `NOTE_REQUIRED`.

  (FR-001, FR-002, BR-001)
- [X] T015 [P] [US1] Create unit test of the SC-32 and SC-16 view rules in tests/unit/provinces-view.test.js (SC-32 #4–#12, R7, R10):
  - the 4 steps follow `drafted_at`, approval, `sent_at`, `responded_at`;
  - each review state gives its one card action (Ask VFDA to review / Waiting / note + Ask again / recipient + downloads / record reply), with the disabled reason *A first shooting day is needed before notifying*;
  - *view* and archived → downloads only, through the GET, without the recording POST (D7);
  - the *does not replace the permit* note is always present;
  - the reply status reads Waiting when there is none;
  - staff tabs Submitted / Changes requested / Approved;
  - the SC-16 button only for members with an owner / *edit* project, and a sign-in line for guests.
- [ ] T016 [P] [US1] Add to the online suite tests/rls/rls.test.js (RLS, R9; run by `npm run test:rls`):
  - a member who is not on the project reads no `location_interest` or `province_notice` row of it;
  - a member cannot insert into `location_interest` directly;
  - a member cannot run `app_review_notice`; a `vfda_staff` fixture can, and its review writes one `audit_log` row;
  - fixtures removed afterwards, including their organisations.

### Implementation for User Story 1

- [X] T017 [P] [US1] Implement `buildLetter()` in lib/notices/letter.js (verifies T009)
- [X] T018 [P] [US1] Implement `letterDocx()` with `docx` in lib/notices/docx.js (verifies T010)
- [X] T019 [P] [US1] Implement `validateRecipient()`, `validateReview()`, `validateReply()` in lib/notices/input.js (verifies T011)
- [X] T020 [US1] Implement `expressInterest`, `listNotices`, `submitNotice`, `reviewNotice`, `listStaffNotices`, `markDownloaded` (owner / *edit*, records), `getApprovedLetter` (any member, read-only) in lib/db/notices.js, lib/db/sqlite/notices.js (with `withTransaction` + `writeAudit` of lib/db/audit.js and `notify` of lib/db/notifications.js) and lib/db/supabase/notices.js (RPCs; staff reads with the System client after the role check) (verifies T012, T013)
- [X] T021 [US1] Implement the routes:
  - app/api/projects/[id]/interests/route.js
  - app/api/projects/[id]/notices/route.js
  - app/api/notices/[id]/submit/route.js
  - app/api/notices/[id]/download/route.js (POST, records)
  - app/api/notices/[id]/letter/route.js (GET, read-only)
  - app/api/admin/notices/route.js
  - app/api/admin/notices/[id]/review/route.js

  Reuse `memberSession`, `isUuid`, `projectError` of lib/api/projects.js. (verifies T014)
- [X] T022 [US1] Build SC-32 member in the order of docs/screens/screen-spec-SC-32.md (sidebar, title, province cards with 4 steps, letter preview, card actions, *+ Add province*, permit note; Empty / Loading / Error / Success), in these files:
  - app/projects/[id]/provinces/page.js
  - app/projects/[id]/provinces/provinces-client.js
  - app/projects/[id]/provinces/provinces-view.js
  - the print page app/projects/[id]/provinces/[noticeId]/print/page.js (D4, read-only; *Download PDF* sends the recording POST first)
  - *Provinces* in app/projects/[id]/project-nav.js

  (FR-002, FR-004, BR-002; verifies T015)
- [X] T023 [US1] Build SC-32 staff in app/admin/notices/page.js and app/admin/notices/notices-queue.js: tabs, letter preview, *Approve*, *Request changes* with the required note, *Recorded in the audit log*. Add a *Notices* link for `vfda_staff` / `admin` in app/components/site-header.js. (FR-002, BR-001, research Open question 2; verifies T015)
- [X] T024 [US1] Add *I'm interested in this location* to SC-16 in app/locations/[slug]/interest-button.js and app/locations/[slug]/page.js: project choice, then a link to SC-32 (FR-001, R10; verifies T015)
- [X] T025 [P] [US1] Add the `notices.*` texts and the notification events `province_notice.approved`, `province_notice.changes_requested`, `province_notice.cannot_support` to lib/i18n/vi.json and en.json (SYS FR-006)
- [ ] T026 [US1] Run quickstart Slice 1 on `cinematch-dev` after `npx supabase db push --remote` and the reseed, with temporary member and staff accounts removed afterwards; record in specs/006-m7-support/quickstart.md §Results (US-1)

**Checkpoint**: a notice goes from draft to downloaded through a staff review; nothing is sent by the system. MVP demonstrable.

---

## Phase 4: User Story 2 — See the province's reply (Priority: P2)

**Goal**: the member or VFDA staff records the reply as one of three values with the note as entered; the card shows status, date and note; a staff entry notifies the project and is audited (FR-003, FR-004, BR-003, D3).

**Independent Test**: [quickstart.md](quickstart.md) Slice 2:
- the member records *More info needed* with a note;
- staff record *Received*: notification + audit row;
- a non-member sees nothing.

### Tests for User Story 2 (write first, see them fail) ⚠️

- [X] T027 [P] [US2] Create unit test of the reply on node:sqlite in tests/unit/notice-reply-data.test.js:
  - **who may record**: an owner / *edit* member or a staff member, on a downloaded notice only (`INVALID_STATE` before); *view* → `FORBIDDEN`.
  - **values (BR-003)**: only the three values (`VALIDATION_ERROR` otherwise); the note stored exactly as entered.
  - **what is stored**: `responded_at`, `received_at` (when empty) and `response_recorded_by` are set.
  - **staff entry (US-2 Scenario 1)**: one notification to each project member (`province_notice.<response>`) and one `audit_log` row `notice.reply`.
  - **member entry**: no notification and no audit row.
  - **correction**: allowed, and the first `responded_at` is kept (research Open question 6).

  (FR-003, BR-003, D3)
- [X] T028 [P] [US2] Create contract test of `POST /api/notices/:id/reply` with the Supabase fake in tests/contracts/notice-reply-api.test.js: 401 / 404 / 403 / 409 `INVALID_STATE` / 422; through `app_record_province_reply` with the checked fields only; a staff session and a member session both 200 (FR-003, BR-003)
- [X] T029 [P] [US2] Create unit test of the reply display in tests/unit/notice-reply-view.test.js: a reply card shows the status label, the date in Vietnam time and the note; *Waiting* without a reply; the reply form offers exactly three choices; texts in both languages (FR-004, BR-003, SC-32 #6–#7)

### Implementation for User Story 2

- [X] T030 [US2] Implement `recordReply()` in lib/db/notices.js and both sources (verifies T027)
- [X] T031 [US2] Implement app/api/notices/[id]/reply/route.js (verifies T028)
- [X] T032 [US2] Add the reply display and form to app/projects/[id]/provinces/provinces-client.js and provinces-view.js, and the reply entry to app/admin/notices/notices-queue.js (verifies T029)
- [ ] T033 [US2] Run quickstart Slice 2 on `cinematch-dev` and record the results in specs/006-m7-support/quickstart.md §Results (US-2)

**Checkpoint**: every notified province shows its reply.

---

## Phase 5: User Story 3 — Request a consultation (Priority: P3, reshaped by BR-005)

**Goal**: a member sends topic, time zone and 1–3 preferred times; the request is stored and emailed to `VFDA_CONSULT_EMAIL` through Resend; no slot calendar (FR-005, BR-005, Clarifications Q5).

**Independent Test**: [quickstart.md](quickstart.md) Slice 3:
- a request from Asia/Seoul with two times;
- *Your requests* shows it waiting;
- with the reviewer's go-ahead, one email arrives in the test inbox;
- without the key, the request is still saved.

### Tests for User Story 3 (write first, see them fail) ⚠️

- [X] T034 [P] [US3] Create unit test of the request input in tests/unit/consultation-input.test.js (FR-005, BR-005, R8):
  - topic one of 5; time zone a valid IANA name ≤ 40 characters (`Asia/Seoul` yes, `Mars/Base` no);
  - 1–3 distinct times, each in the future and ≤ 180 days ahead;
  - times returned in UTC, with the first as `slot_start`;
  - every error a dictionary key in both languages.
- [X] T035 [P] [US3] Create unit test of the email sender in tests/unit/consultation-email.test.js (BR-005, R8):
  - with a fake Resend client, `sendConsultationRequest()` sends one email to `VFDA_CONSULT_EMAIL`, from `EMAIL_FROM`, `reply_to` the member's email, subject *Consultation request — Dossier*;
  - the body lists each time in the member's zone and in Asia/Ho_Chi_Minh;
  - the sender returns `sent` with `provider_message_id`, or `bounced` on a provider error (recording in `email_delivery` is checked by T037);
  - without `RESEND_API_KEY` or `VFDA_CONSULT_EMAIL`: no call, `queued`;
  - the key never appears in a thrown message or a log line.
- [X] T036 [P] [US3] Create unit test of the request data layer on node:sqlite in tests/unit/consultations-data.test.js:
  - `requestConsultation()` stores one booking with `slot_start` = the first time, `preferred_times`, `timezone`, and `booking_status` / `officer_id` empty;
  - a guest or a deactivated account is refused;
  - `listConsultations()` returns only the caller's requests, upcoming first.

  (FR-005, BR-005, SC-33 SR-364)
- [X] T037 [P] [US3] Create contract test of `POST` / `GET /api/consultations` with the Supabase fake and a fake Resend in tests/contracts/consultations-api.test.js:
  - 401 guest; 422 with `fields`;
  - 201 `{ booking_id, email: 'sent' }` through `app_request_consultation`, then exactly one call to the fake email service (seam `setResendClientForTests` in lib/email/resend.js);
  - `email_delivery` recorded by the System client: `sent` + `provider_message_id`, `bounced` on a provider error, `queued` without a key;
  - invalid input or a database refusal: no call to the email service;
  - a provider failure still answers 201 with `email: 'failed'` and keeps the booking;
  - `GET` lists the caller's own requests.

  (FR-005, BR-005)
- [X] T038 [P] [US3] Create unit test of the SC-33 view rules in tests/unit/consultation-view.test.js (BR-005, SC-33 #3, #4, #9, #10):
  - *Send request* disabled until topic, zone and one valid time;
  - *+ Add another time* stops at three;
  - each time shows its Hanoi time;
  - the browser zone is the default;
  - request status *Waiting for VFDA* when `booking_status` is empty;
  - the module exports nothing about free slots, and no text mentions picking a slot (BR-005).

### Implementation for User Story 3

- [X] T039 [P] [US3] Implement `validateConsultationRequest()` in lib/consultations/input.js (verifies T034)
- [X] T040 [P] [US3] Implement `sendConsultationRequest()` with `resend` in lib/email/resend.js (System; records `email_delivery`; no key in messages) (verifies T035)
- [X] T041 [US3] Implement `requestConsultation()` and `listConsultations()` in lib/db/consultations.js, lib/db/sqlite/consultations.js and lib/db/supabase/consultations.js (verifies T036)
- [X] T042 [US3] Implement app/api/consultations/route.js (POST stores, then sends; GET own) (verifies T037)
- [X] T043 [US3] Build SC-33 in the order of docs/screens/screen-spec-SC-33.md, as a request form per BR-005 (no week grid), in app/consult/page.js, consultation-form.js and consultation-view.js (route `/consult` of the Screen Spec). Add the `consult.*` texts to lib/i18n. Turn the SC-12 *Book a consultation* line into a link to `/consult` in app/projects/[id]/dashboard-client.js. (FR-005, BR-005; verifies T038)
- [ ] T044 [US3] Run quickstart Slice 3 on `cinematch-dev`: the real email to the test inbox **only after the reviewer agrees in the session**; record the results in specs/006-m7-support/quickstart.md §Results (US-3, SC-003)

**Checkpoint**: VFDA receives consultation requests by email; no booking calendar exists.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T045 Run `npm test`, `npm run build`, `npm run test:rls`, `npm run check:supabase`, `uv run tools/start_feature.py --check`, `python3 tools/build_supabase.py --check`, `python3 data/seed/check_seed.py`, `python3 data/schema/load_check.py` and record them in specs/006-m7-support/quickstart.md §Results
- [X] T046 Add the build-log entry (feature row, run entry, spec issues of research Open questions 1–8 in §3) in docs/build/build-log.md and the AI-use row in docs/ai-use-log.md, with the names of who ran and who reviewed

---

## Not in this plan

- FR-006 (confirm, reschedule, assign an officer) and FR-007 (24-hour reminders): BR-005 defers them.
- BR-004 (reply times in the M3 provincial readiness index, SC-18).
- Spec §3 edge cases: follow-up after N working days (spec OQ4); a withdrawal letter (the crew writes it themselves). The *other office* edge case needs no task: the crew downloads again for the other recipient.
- Spec OQ6 (how the consultation is held).

---

## Traceability: rule or scenario → test → code

| Rule / scenario | Test (written first) | Code that turns it green |
|---|---|---|
| BR-001 — the system never sends; review before download | T004, T012, T013, T014, T016 | T007, T020, T021 |
| D7 — any member downloads; owner / *edit* record; GET reads only | T012, T014, T015 | T020, T021, T022 |
| BR-001 / review — one audit row per review | T004, T012, T016 | T007, T020 |
| BR-002 — *does not replace the licence* in every letter | T009, T010, T015 | T017, T018, T022 |
| BR-003 — three reply values, note as entered | T011, T027, T028, T029 | T019, T030, T031, T032 |
| BR-005 — request, not a slot calendar | T034, T035, T036, T037, T038 | T039–T043 |
| FR-002 — summary from project data | T005, T012, T014 | T008, T020 |
| D1, D2, D5 — data model | T003 | T006 |
| RLS — non-members read no notice; only staff review | T004, T012, T016 | T006, T007, T020 |
| US-1 Scenario 1 — interest drafts the Ninh Bình notice at step 1 | T012, T015 | T020, T022, T024 |
| US-1 Scenario 2 — no first shooting day → submit disabled | T012, T014, T015 | T020, T021, T022 |
| US-2 Scenario 1 — reply with a note → notification, status, date, note | T027, T028, T029 | T030, T031, T032 |
| US-3 Scenario 1 (BR-005) — request in the member's time zone | T034, T036, T037, T038 | T039, T041, T042, T043 |

---

## Dependencies & Execution Order

- **Phase 1** → **Phase 2** (blocks every story) → **US-1** → **US-2** (replies need a downloaded notice) → **US-3** (independent of US-1/US-2 after Phase 2; can run in parallel with them) → **Phase 6**.
- T006 changes `data/` through the generators: explicit approval in the implement prompt and data-owner review before merge.
- T026, T033, T044 need `npx supabase db push --remote` and `node scripts/seed-supabase.mjs --reset` on `cinematch-dev`.
- Tests first within each phase:
  - T003–T005 before T006–T008;
  - T009–T016 before T017–T024;
  - T027–T029 before T030–T032;
  - T034–T038 before T039–T043.
- Order between tasks:
  - T006 before T007 (the migration matches the regenerated schema);
  - T008 before T020;
  - T017 before T018;
  - T019 before T020, T021;
  - T020 before T021, then T022–T024;
  - T039, T040, T041 before T042, then T043.

### Parallel opportunities

- Phase 2 tests T003–T005 together.
- US-1 tests T009–T016 together; then T017, T019, T025 in parallel; T018 after T017.
- US-2 tests T027–T029 together.
- US-3 tests T034–T038 together; then T039, T040 in parallel.
- After Phase 2, the US-3 phase can run alongside US-1 (different files).

### Parallel example: User Story 1

```text
Tests together:  T009 letter | T010 docx | T011 input | T012 data | T013 no-sending | T014 API | T015 views | T016 rls
Then:            T017 letter, T019 input, T025 texts (parallel) → T018 docx → T020 data → T021 routes
Then:            T022 SC-32 member, T023 SC-32 staff, T024 SC-16 button → T026 online check
```

---

## Implementation Strategy

1. Phase 1–2 (data change reviewed, migration checked on PostgreSQL, summary).
2. US-1 → **STOP and VALIDATE** (quickstart Slice 1): MVP — a reviewed notice the crew can send.
3. US-2 → replies.
4. US-3 → consultation requests and the email to VFDA.
