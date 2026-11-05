# Research: VFDA support — provincial notices and consultation requests (M7)

Feature: `006-m7-support` · Plan: [plan.md](plan.md) · Sources: `specs/006-m7-support/spec.md`, `data/data-model-M7.md`, `data/schema/schema-M7.sql`, seed files `42_location_interest.csv`, `43_province_notice.csv`, `44_consultation_booking.csv`, `docs/screens/screen-spec-SC-32.md`, `SC-33.md`, `tools/rls_policies.py`, `specs/005-m0-workspace` (permission functions).

## R1. The notice flow (BR-001, Clarifications Q1–Q3)

- **Decision**: states of `province_notice.review_status`:
  - `draft`: made with the interest.
  - `submitted`: the member asked VFDA to review.
  - `approved` or `changes_requested`: chosen by a VFDA staff member.
  - `changes_requested` → `submitted`: when the member submits again.

  Only `approved` can be downloaded. Downloading and recording are two separate requests (analysis U2, 06/11/2026):
  - **recording**: `POST /api/notices/:id/download { recipient }` stores the download — the first time it sets `delivery_status = downloaded`, `sent_at` and `recipient`; later calls change none of them;
  - **downloading**: `GET` of the .docx or of the print page only reads.

  Every project member may download an approved letter; only an owner or *edit* member records the first download and so sets the recipient (analysis I4, 06/11/2026).
- **No sending path**: no route, function, job or email template sends a notice to a province; the only email of this module is the consultation request to VFDA (R8). A test fails if any code path writes `email_delivery` for a notice.
- **Rationale**: BR-001 as revised on 28/10/2026; Clarifications Q1–Q3; spec FR-002 rewritten to match on 06/11/2026.
- **Seed values**: `delivery_status` keeps `sent` and `bounced` for the day VFDA may send notices itself; `data/seed/seed_rules.py` lists them in `UNUSED_ENUM_VALUES` with that reason (analysis U1, done 06/11/2026), so the seed check passes when no row uses them.
- **Alternatives**: keep SEQ-11 automatic sending — rejected by Q3.

## R2. One notice per province per project (spec §9, D5)

- **Decision**:
  - `app_express_interest(project, location)` stores the interest.
  - If the project has **no** notice yet for the location's province, it drafts one keyed by this interest.
  - Otherwise it adds the location to that notice's summary, as long as the notice is not downloaded yet.
  - An interest in a province whose notice was already downloaded is stored, and the member is told the letter was already sent (no second letter in this MVP).
- **Seed**: the generator stops drafting a second Ninh Bình notice for *The Last Ferry* (`a3fee2c9…`); the interest stays.
- **US-1 Scenario 1 with the seed**: *The Last Ferry* already has a downloaded Ninh Bình letter for Tràng An, so the scenario is checked on another seed project with no Ninh Bình notice (*Rice and Salt* + *Tràng An*) in the tests and the quickstart (analysis I3).
- **Alternative**: one notice per interest, as the key allows — rejected by spec §9 ("one notice per province per project").

## R3. The project summary and the letter (FR-002, BR-002, SC-32 #9)

- **Decision**: `project_summary` is computed in the database (function `app.notice_summary(project_id, province_id)`, with a JS twin `lib/notices/summary.js` for node:sqlite) from:
  - the project name and format;
  - the first shooting day and the shooting days in Vietnam;
  - the crew size band;
  - the project's locations in that province (interests);
  - the confirmed Vietnamese partner (`collab_request.status = confirmed` → `organisation.org_name`), or *none yet*.

  It is recomputed on draft, on submit and when a location is added. The browser never sends summary text.
- **Letter** (`lib/notices/letter.js`, pure): addressee line chosen by the recipient (*Kính gửi: Ủy ban nhân dân tỉnh/thành phố …* or *Kính gửi: Sở Văn hóa, Thể thao và Du lịch …*), then the Vietnamese text, then an English translation, then the fixed BR-002 sentence in both languages:
  - *Thư này không thay thế giấy phép quay phim do Bộ Văn hóa, Thể thao và Du lịch cấp.*
  - *This letter does not replace the filming licence issued by the Ministry of Culture, Sports and Tourism.*

  The same paragraphs feed the .docx (R4) and the print page (R5).
- **Required data**: a first shooting day (US-1 Scenario 2: *A first shooting day is needed before notifying*) and a location in the province; submit refuses with `SHOOT_DATE_REQUIRED` otherwise.
- **Open**: the wording is the team's (spec OQ1, official template).

## R4. Word file (D6)

- **Decision**: `docx` builds the file on the server (`GET /api/notices/:id/letter?format=docx&recipient=`, read-only), `Content-Disposition: attachment; filename="notice-<province-slug>.docx"`. The SC-32 *Download Word* button first sends `POST /api/notices/:id/download` (R1), then opens the GET. A test unzips the buffer (JSZip, which `docx` depends on) and checks `word/document.xml` for the BR-002 sentence, the addressee and the project name.

## R5. PDF through the print page (D4)

- **Decision**: `/projects/[id]/provinces/[noticeId]/print?recipient=` is a server page with only the letter (A4 print CSS, no navigation), and **opening it records nothing**: a prefetch, a preview or a crawler cannot mark a letter as sent (analysis U2). *Download PDF* on SC-32 sends `POST /api/notices/:id/download`, then opens the page, which calls `window.print()`; the browser saves the PDF. Not approved → 404.
- **Alternatives**: `pdf-lib` plus a bundled Unicode font — rejected (new dependency and font file for a Should module); Chromium on the server — too heavy for Vercel.

## R6. Review by VFDA staff and the audit log (FR-002, BR-001)

- **Decision**: `app_review_notice(interest_id, decision, note)`:
  - for `vfda_staff`, and `admin` through `app.has_role`;
  - only on a `submitted` notice;
  - `approve`: sets `review_status = approved`, `reviewed_by`, `delivery_status = queued`;
  - `request_changes`: needs a note of 1–1000 characters and sets `review_status = changes_requested`, `review_note`;
  - writes one `audit_log` row (`notice.approve` or `notice.request_changes`, `admin_id` = the staff member, `target_id` = `interest_id`) in the same transaction;
  - notifies the project members (event `province_notice.approved` / `province_notice.changes_requested`).
- Node:sqlite twin with `withTransaction` + `writeAudit` (`lib/db/audit.js`), as SC-35 does.

## R7. The province's reply (FR-003, BR-003, D3)

- **Decision**: `app_record_province_reply(interest_id, response, note)` on a downloaded notice:
  - by an owner or *edit* member of the project, or by VFDA staff;
  - `response` is one of `received`, `info_needed`, `cannot_support`; the note ≤ 2000 characters is kept as entered;
  - sets `responded_at = now()`, `response_recorded_by`, and `received_at` (if empty) = `responded_at`;
  - a later correction overwrites the reply and keeps the original `responded_at` (Open question 6);
  - staff entry: an `audit_log` row `notice.reply` and a notification to the project members (`province_notice.<response>`, US-2 Scenario 1); member entry: no notification.
- **Four steps on SC-32 (#5)**:
  1. drafted (`drafted_at`);
  2. reviewed (`review_status = approved`);
  3. downloaded and sent by you (`sent_at`);
  4. province replied (`responded_at`).

## R8. Consultation request and email (FR-005 as reshaped by BR-005, Q5)

- **Decision**: `app_request_consultation(topic, timezone, preferred_times)` for a signed-in member:
  - topic: one of the 5 values;
  - time zone: a valid IANA name (`Intl.supportedValuesOf('timeZone')` plus `UTC`), ≤ 40 characters;
  - preferred times: 1–3 distinct times, each in the future and ≤ 180 days ahead, stored in UTC;
  - `slot_start` = the first time; `booking_status` and `officer_id` stay empty.
- **Email**: the API then sends, as the System actor, one email through `resend`:
  - to `VFDA_CONSULT_EMAIL`, from `EMAIL_FROM`, `reply_to` = the member's account email;
  - subject *Consultation request — <topic>*;
  - body: topic, each time in the member's zone and in Asia/Ho_Chi_Minh, the member's name and organisation;
  - recorded in `email_delivery` (`template_id = consultation.request`, `queued` → `sent` with `provider_message_id`, or `bounced` on a provider error).
- When the key or the address is not set, the email stays `queued` and the screen says the request is saved and VFDA will see it. The request is never lost because of the email.
- Tests use a fake Resend client; `npm test` sends nothing.
- **No slot grid**, no officer, no reminder (BR-005).

## R9. Permissions and RLS

- **Decision**:
  - Writes go only through the functions; `REVOKE INSERT` on `location_interest` and `consultation_booking` from `authenticated`, as M0 did for `project`.
  - Interest, submit, recording the first download (and so the recipient) and member reply: owner / *edit* of a non-archived project (`app.project_permission`, M0).
  - Downloading an approved letter (.docx, print page): every member of the project, *view* included (analysis I4).
  - Reads: members read their projects' notices (existing policy); staff read every notice through the staff route (System client after the role check); members read their own bookings (new select policy `member_id = auth.uid()`; today only staff can select).

## R10. SC-16 *I'm interested in this location*

- **Decision**: a button on the location page for signed-in members with at least one project where they are owner / *edit*. It opens a small chooser (project), calls `POST /api/projects/:id/interests`, then links to that project's SC-32. Guests see *Sign in to tell the province*.

## R11. Texts

- **Decision**: every screen text from `lib/i18n` (`notices.*`, `consult.*`); the letter paragraphs are in both languages whatever the page language (the province reads Vietnamese; the crew reads English).

## Open questions

| # | Question | Interim choice | Owner |
|---|---|---|---|
| 1 | SC-32 SR-201 and element #10 said *VFDA sends the notice* against BR-001. | **Resolved 06/11/2026** at `tools/s3_en.py`: SR-201 *the system never sends*, #10 *Ask VFDA to review* (the mockup image still shows the old label until it is redrawn with `--img`); spec FR-002, §4.1, §4.2 rewritten at `tools/specs_b.py` | Group C |
| 2 | No Screen Spec described the VFDA staff side of SC-32. | **Resolved 06/11/2026**: SC-32 actor *Member; VFDA staff (review queue)*; interactions *Approve* / *Request changes*, rule *only staff review, one audit row each*; not drawn on the mockup | Group C |
| 3 | SC-32 SR-203 and US-2 Scenario 1 said VFDA enters the reply. | **Resolved 06/11/2026**: member or VFDA staff (D3) in spec FR-003, US-2 Scenario 1, SC-32 #7 and SR-203 | VFDA to confirm |
| 4 | US-3 Scenario 1, FR-005 and SC-003 described a slot booking; SC-33 still describes a slot grid, officer and reminders. | Spec **resolved 06/11/2026** (US-3, FR-005, SC-003 per BR-005; FR-006, FR-007 *later phase* in §11.1). **Still open**: the SC-33 Screen Spec (`tools/s*_en.py`) and its mockup | Group C |
| 5 | [NEEDS CLARIFICATION: `province_notice.authority_email` is required, but the recipient is chosen by the crew and `authority_contact.contact_email` may be empty.] | Store the email of the first location's verified authority contact (shown in the letter as the local contact). When it is empty, drafting refuses with *No authority contact for this location — ask VFDA*. Proposal for the data owner: make the column optional | Data owner |
| 6 | [NEEDS CLARIFICATION: can a recorded reply be corrected, and which time counts for BR-004? `sent_at` is the first download, not the day the crew posted the letter, so a reply time from it may be too long.] | Correction allowed; first `responded_at` kept; BR-004 to decide whether the crew enters a sent date | VFDA |
| 7 | Spec open questions 4 (follow-up after N working days) and 6 (how the consultation is held) | Not built; staff reply by email | VFDA |
| 8 | [NEEDS CLARIFICATION: the letter wording and whether it must carry VFDA's name, given Clarifications Q1 (VFDA does not send it).] | Neutral wording *prepared with the CINEMATCH platform, reviewed by VFDA staff*; the BR-002 sentence is in spec-M7 as **draft wording pending the VFDA Legal Board** (06/11/2026) | VFDA Legal Board |
