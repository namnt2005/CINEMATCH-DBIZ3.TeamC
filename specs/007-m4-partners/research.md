# Research: Vietnamese service partners (M4)

Feature: `007-m4-partners` · Plan: [plan.md](plan.md) · Spec: [spec.md](spec.md) (snapshot of `docs/spec/spec-M4.md`)

Each item gives the decision, why, and what else was considered. Decisions D1–D6 were taken by Nam Tran on 06/11/2026 (plan.md), and the analysis fixes I1–I6, C1–C3, U1–U3, A1, T1 on the same day; the rest are the agent's design choices within the spec, to be reviewed with the plan.

**Terms**: *private layer* = layer 3, the table `organisation_private_layer` (FR-004 and SC-20 call it the *accepted layer*); *member layer* = layer 2; *public layer* = layer 1.

## R1 — Partner account ↔ organisation (D1)

- **Decision**: new table `organisation_user (org_id, user_id, added_at)`, primary key `(org_id, user_id)`, both foreign keys; added through the data generators (`tools/dm_model2.py`, `data/seed/generate_seed.py`, `data/seed/seed_rules.py`), never by hand in `data/`. A helper `app.is_org_user(org_id)` (true when `auth.uid()` is a row of the organisation and the account role is `partner`) scopes every partner read and write. Seed: the three seed partner accounts are linked to *Mekong Frame Co.*, *Đò Ngang Film Services* and *Bến Xưa Production Services* (the organisations of their email domains); *Hanoi Grip & Light* keeps no user (empty case).
- **Why**: `organisation` has no user column (SYS research Open question 13; data-model M4 §12, blocking); one organisation may have several staff accounts.
- **Alternatives**: `profile.partner_org_id` — one account per organisation at most; rejected by D1.

## R2 — Partner accounts only by VFDA invitation (D2, BR-003)

- **Decision**: new table `partner_invitation (invitation_id, org_id, email, code_hash, invited_by, invited_at, expires_at, accepted_at, accepted_by)` through the generators. VFDA creates the organisation's public data and the invitation in one step (SR-125 *VFDA invites them and enters their data*); the system emails a one-time link `/invitations/partner/<code>` through Resend (System actor). Only the SHA-256 of the code is stored; the code is shown once in the email. The invitee signs up or signs in through the existing SYS screens (a new account is still always `member`, SYS BR-002), then opens the link and presses *Accept*: `app_accept_partner_invitation(code)` checks the hash, the expiry, that it is unused and that the signed-in email equals the invited email, then sets the role to `partner`, inserts `organisation_user` and writes an `audit_log` row `role.grant` (`admin_id` = the inviter) in one transaction. Ordinary sign-up never gives `partner`.
- **Who invites** (analysis I1, decided 06/11/2026): **`vfda_staff` and `admin`** send partner invitations (M4 BR-003). SYS BR-002 was changed at its source `tools/specs_a.py` and SYS question 6 decided in `tools/decisions.py` (provisional): the role `partner` is granted only by accepting a VFDA invitation; `vfda_staff`, `vfda_legal` and `admin` are still granted only by an admin. The enforcement text of SYS BR-002 and M4 BR-003 in `tools/dm_rules.py` (*partner accounts created by admin only*) changes with T008. The existing `public.app_grant_role` (migration `20261101000400_rules.sql`) still lets an admin grant `partner` directly; the M4 migration replaces it so that `partner` raises `ROLE_BY_INVITATION_ONLY` — the invitation RPC is the only path to the role (analysis G1, tasks T004, T024, T028). The Screen Specs SC-08 (SR-232) and SC-43 (§2 *Accounts and roles*, SR-262) were changed to match at `tools/s4_en.py` (analysis G4).
- **Expiry**: the spec gives none; interim **7 days** — Open question 2.
- **Accounts already on a project**: a role is single-valued, so turning a producer into a partner would cut them off their projects; interim: refused with `ALREADY_MEMBER_OF_PROJECT` — Open question 3.
- **Alternatives**: Supabase `inviteUserByEmail` — its mailer only delivers to team addresses on this plan (build-log Entry 10) and the role still needs a grant; manual role grant by an admin — rejected by D2.

## R3 — Three layers, three tables, three read policies (BR-001)

- **Decision**: reads keep the three tables of the data model:

  | Layer | Table | Who reads it (RLS) |
  |---|---|---|
  | 1 public | `organisation` | everyone (`anon`, signed in) |
  | 2 member | `organisation_member_layer` | any signed-in active account (policy `rls_org_member_layer_members`; SYS research Open question 14 kept: signed in only) |
  | 3 private | `organisation_private_layer` | (a) a member of the request's project when a request to that organisation is `accepted` or `confirmed` **and both** the producer and the partner have accepted the NDA on that request; (b) the organisation's own users (`app.is_org_user`) |

  The generated policy `rls_org_private_after_nda` today accepts any one acceptance; it is changed at its source `tools/rls_policies.py` to require one `producer` and one `partner` row with `accepted = true` (user constraint, FR-004, §11.1). The partner's own read (b) is needed for SC-21 and its *Preview as*.
- **Why**: SR-122, SR-131, SC-003 — hiding in the interface leaks through the API.
- **Alternatives**: one table with column grants — rejected by BR-001.

## R4 — All writes through `SECURITY DEFINER` functions (the M0/M7 pattern)

- **Decision**: direct `INSERT` / `UPDATE` on the M4 tables is revoked from `authenticated` (the generated member insert on `collab_request` included); every write is a Postgres function with a node:sqlite twin in `lib/db/sqlite/`. Functions check the role, the organisation link or the project permission (`app.project_permission`: owner / edit), the state machine (R6) and write the audit row where M10 BR-005 asks for it. This also closes the 15 *DEFERRED* partner rows of `tools/rls_policies.py`: partners write only through the functions.
- **Why**: client updates could set any status, `verified_until` or `art13_eligible`.

## R5 — Moderation of partner edits (D3)

- **Decision**: in this slice a partner's saved profile is live at once. The deviation from SC-21 SR-323 / M10 BR-001 (*profile text and photos wait in moderation*) is written in Known limitations; the M10 slice adds the pending version. `verified_at`, `verified_until`, `art13_eligible` and `org_status` cannot be changed by the profile function (SR-326); deactivation has its own function (R12).
- **Alternatives**: queueing changes into `moderation_item` now — needs the pending-version store (data-model M4 §12, blocking) and a staff screen; rejected by D3.

## R6 — Request life cycle (BR-005, BR-009, FR-012..FR-016)

- **Decision**: one state machine, the same in SQL and in `lib/partners/lifecycle.js`:

  | From | Action (who) | To |
  |---|---|---|
  | — | send (project owner / edit) | `pending` |
  | `pending`, `under_review`, `info_requested` | respond (partner) | `under_review`, `info_requested`, `accepted` (with the partner's NDA), `declined` |
  | `pending`, `under_review`, `info_requested`, `accepted` | withdraw (project owner / edit) | `withdrawn` |
  | `accepted` | confirm (project owner / edit, producer NDA accepted) | `confirmed` (`confirmed_at`) |

  `declined`, `withdrawn` and `confirmed` are final: a trigger `trg_collab_request_final` refuses any **UPDATE** of a final row (BR-005, also on SQLite through `lib/db/local-triggers.sql`); it does not watch DELETE, which no client role is granted anyway (analysis I3). Only the System (secret key) can delete rows, for test fixtures; a request with messages still cannot be deleted, because its messages cannot be. `responded_at` is set by the first partner response. Every response note and every reply is a `collab_message` row (BR-009); a trigger `trg_collab_message_no_update` refuses UPDATE and DELETE. Messages are 1–2000 characters (SC-25 #12). Send refuses: an archived project (M0 BR-005, SR-343), a deactivated organisation (SR-346), a second open request of the same project to the same organisation (*You already have an open request with this partner*, §3), no service or a value outside the 12, a note over 1000 characters.
- **Expiry**: spec OQ5 and data-model §12 are open; `expired` is not a status. Interim: nothing changes on its own; after **14 days** without a partner response (spec §9 test value) SC-25 shows *No reply for 14 days — you can withdraw and ask another partner*. Open question 4.
- **Steps on SC-25**: *Sent* (`sent_at`) → *Partner responded* (`responded_at`) → *Confirmed* (`confirmed_at`); declined and withdrawn are end states, not steps (SR-141).

## R7 — NDA: one standard mutual bilingual text with a version (Q4, D5, FR-017)

- **Decision**: `config/nda/NDA-2026.1.json` holds `{ version, title: {vi, en}, clauses: [{vi, en}], status: "draft" }`. The agent writes the frame only; every clause text says *BẢN NHÁP — chờ Group C soạn và VFDA duyệt / DRAFT — to be written by Group C and reviewed by VFDA* (D5). The version string `NDA-2026.1` matches the seed. Each acceptance stores `party`, `nda_version`, `accepted = true`, `accepted_at`.
  - The **partner** accepts the NDA in the same action as *Accept* (an accepted response without the NDA box is refused).
  - The **producer** (owner / edit of the project) accepts it on SC-25 #9 on an `accepted` request; that acceptance alone opens the private layer for the project's members (US-4 Scenario 1), before they decide to confirm. *Confirm partnership* is enabled only after it (US-2 Scenario 2, SR-143).
  - Acceptances are written by the functions only; they are never edited.
  - There is no *decline the NDA* action (analysis U3): a party that does not agree simply does not tick the box, and the private layer stays closed. FR-017's `accepted = false` exists in the data model and the seed (`n5`) only to show a refused NDA; the app writes `accepted = true` rows only.
- **Why**: Q4; the user's constraint *layer 3 opens when the request is accepted and both parties agreed to the NDA*.
- **Alternatives**: a database table of NDA versions — one version exists; a reviewed config file is enough (AGENTS.md §5 `config/`).

## R8 — VFDA Verified (Q2, BR-004, FR-008..FR-011)

- **Decision**:
  - **Submit** (partner of the organisation): a business registration PDF (≤ 25 MB, `%PDF-` header checked on the server) and at least two non-empty reference projects; one `pending` request per organisation at a time (SR-332). New columns `submitted_at` (required) and `decided_at` (empty while pending) on `verification_request` (D6, through the generators).
  - **Decide** (`vfda_staff`, `admin`): approve sets `verification_request.status = approved`, `decided_by`, `decided_at`, and on the organisation `verified_at = decided_at`, `verified_until = verified_at` (date in Asia/Ho_Chi_Minh) + 12 months; reject needs a reason (1–1000 characters), which is sent to the partner. Each decision writes one `audit_log` row (`verification.approve` / `verification.reject`) in the same transaction (SR-354) and notifies the organisation's users.
  - **Badge shown** only while `verified_until >= today` in Vietnam time; nothing has to run for the badge to disappear (FR-011 *remove the badge when it expires* is a read rule).
  - **Statement**: the badge and SC-22 #10 / SC-20 #10 say what was checked — *a valid business registration certificate* (Q2) — and what was not — *quality of work and prices* (BR-004). The two reference projects are listed as submitted; the statement does not say VFDA checked them. The wording is a draft for VFDA (SC-19 #13, SC-22 #10 *wording approved by VFDA*) — Open question 5.
  - **Reminder** (FR-011): 30 days before `verified_until` the organisation's users get a notification `verification.expiring` and an email, once per badge (the function skips an organisation that already has one for that `verified_until`). It runs as `app_remind_expiring_verifications()` from a guarded `pg_cron` job (as the M0 snapshot) and from `npm run verification:remind` offline.
- **Alternatives**: a `verified` boolean — the spec stores dates only; a cron job that clears `verified_until` — would lose the history the badge month needs.

## R9 — *Eligible to sign service agreements (Article 13)* (Q3)

- **Decision**: `art13_eligible` is switched by `vfda_staff` / `admin` only (SC-36 #10, SR-133, SR-326) through `app_set_art13(org_id, on, business_line_confirmed)`. Switching it **on** requires `business_line_confirmed = true` — the staff member confirms that the business registration lists a film-service business line (Q3); the confirmation is not stored apart from the audit row `organisation.art13_on` / `organisation.art13_off` (one per change, SR-354). The badge is shown on SC-19, SC-20, SC-23 with the disclaimer *Thông tin tham khảo, không phải tư vấn pháp lý / For information only, not legal advice* (Q3).
- **Interim**: the eligibility badge is shown only while the VFDA Verified badge is valid, since the check is part of verification — Open question 6.

## R10 — Private documents in the bucket `org-documents` (FR-008, SR-335)

- **Decision**: Supabase Storage bucket `org-documents`, **private**, `file_size_limit` 25 MB, `allowed_mime_types` `{application/pdf}`, created by the migration (guarded: skipped where the `storage` schema does not exist, e.g. PGlite). No `storage.objects` policy for `anon` or `authenticated`: the browser never reads or lists the bucket directly. The server checks the caller (partner of the organisation, or staff), then uses the System client to
  - give a **signed upload URL** for `<org_id>/verification/<uuid>.pdf` (the browser uploads straight to Storage; a 25 MB file cannot go through a Vercel function, whose request body is limited to about 4.5 MB);
  - check the uploaded object (exists, size ≤ 25 MB, starts with `%PDF-`) when the request is submitted;
  - give a **signed download URL** valid 60 s to staff (SC-36 #7) and to the organisation's own users.

  `verification_request.business_license` stores the object path. Offline (node:sqlite) the same interface writes to a folder under the OS temp directory; tests use an in-memory fake. Seed paths (`private/verification/v1/…`) have no file: SC-36 shows *file not available in the demo data*.
- **Alternatives**: public bucket with obscure names — rejected (SR-335); upload through the API route — body limit.

## R11 — Directory and search (FR-002, FR-005, FR-006, US-1)

- **Decision**: `GET /api/partners` returns active organisations (`org_status` not `deactivated`) with the public layer, filtered by service group (one of 12), province, VFDA Verified only (**on by default**, SR-123) and, for signed-in callers only, working language (member layer). The search box (SC-19 #2, ≤ 80 characters) matches `org_name` without accents (`removeDiacritics` of `lib/db/search-core.js`) and the service group labels; 10 organisations in the seed, a few dozen at launch (spec §9: 20), so the filtering runs in the server after one read. Group counts are computed over the same filtered set. Guests get no member fields (the user client under RLS returns none, SC-003).
- **Language filter for guests**: FR-006 names the guest as actor, but languages are member layer (US-1 Scenario 2). Interim: the language filter is shown and applied only when signed in — Open question 7.
- **FR-007 (Could, semantic ranking)**: not built — the embedding model is SYS open question 3 (FR-011 of SYS deferred).

## R12 — Deactivation (BR-008, SR-325)

- **Decision**: `app_deactivate_org(org_id, typed_name)` — a partner of the organisation (or staff), the typed name must equal `org_name`; sets `org_status = deactivated`, closes every open request (`pending`, `under_review`, `info_requested`, `accepted`) as `withdrawn` with a system message, notifies each request's project members, writes `organisation.deactivate` to the audit log; nothing is deleted. A deactivated organisation leaves the directory; its profile shows *No longer active* (SR-346).

## R13 — Notifications and email (FR-015)

- **Decision** (analysis I2, FR-015 *2 records: one per party*): **every status change of a request creates one notification for each party** — the organisation's users on the partner side and the project's accepted members on the producer side, whoever made the change — through SYS `notify()`. A new message and a verification decision notify the other side (the organisation's users for a decision; staff for a submission). `notify()` queues `email_delivery` rows; for M4 events the server then sends each queued row at once through Resend (`lib/email/resend.js`, System) and updates it to `sent` (with `provider_message_id`) or `bounced`; without `RESEND_API_KEY` the row stays `queued`. The in-app notification is written first, so a failed email never hides it (§3 edge case). A failed email is recorded on the notification's own delivery row — `email_delivery.notification_id` = the notification, `delivery_status = bounced` (analysis C1). The `notification` table has no status column, so the failure is not stored on the notification row itself; no data change. **Automatic retry** of `bounced` rows is not built — Open question 15.
- **Events**: `collab_request.sent`, `.under_review`, `.info_requested`, `.accepted`, `.declined`, `.confirmed`, `.withdrawn`, `collab_message.posted`, `verification.submitted` (to staff), `.approved`, `.rejected`, `.expiring`, `partner_invitation.sent` (email only).

## R14 — Partners gauge and Article 13 component c (FR-016, BR-006)

- **Decision**: nothing new to compute: the M0 view `v_project_readiness` already reads `collab_request` (confirmed → 100, accepted → 70, M0 research R4) and `readiness_source.partners` is `true`. Confirming writes **no** row of `document_slot` or `document` (BR-006, SR-144). Component c is derived for the API: `present` when the project's `A13_SERVICE_AGREEMENT` slot is `present`, otherwise `pending` when a request of the project is `confirmed`, otherwise `missing` — the value M2 will read (spec-M2 *depends on M4 for component c*). The SC-23 notice warns when the organisation is not Article 13 eligible (SR-345).

## R15 — Document access log (D4, BR-007, FR-018, FR-019)

- **Decision**: this slice adds the append-only trigger `trg_document_access_log_append_only` (BR-007) and the function `app_log_document_view(document_id)` with its node:sqlite twin. Which project documents a partner may open is not in the spec; the document viewer, US-4 Scenario 2 and FR-019 (Could) are built with M5 (D4).

## R16 — The 12 service groups with standard Vietnamese labels (Q1, BR-002)

- **Decision**: `lib/partners/service-groups.js` holds the 12 values in the order of the spec (the database CHECK list); every screen shows the labels from `lib/i18n` (`partners.group.<value>`). The English labels are those of the screen specs (`tools/s6_en.py`). Q1 says *add a standard Vietnamese label to each* but no spec gives them; the draft below is for Group C and VFDA to confirm — Open question 8.

  | Value | English (screen specs) | Vietnamese (draft) |
  |---|---|---|
  | `full_production` | Full production services | Dịch vụ sản xuất trọn gói |
  | `permits_paperwork` | Permits and paperwork | Giấy phép và thủ tục |
  | `casting` | Casting | Tuyển chọn diễn viên |
  | `crew` | Crew | Nhân sự đoàn phim |
  | `camera_lighting` | Camera and lighting rental | Cho thuê máy quay và ánh sáng |
  | `studios_interiors` | Studios and interiors | Trường quay và bối cảnh nội |
  | `location_management` | Location scouting and management | Khảo sát và quản lý bối cảnh |
  | `transport_logistics` | Transport and logistics | Vận chuyển và hậu cần |
  | `lodging_catering` | Crew lodging and catering | Lưu trú và ăn uống cho đoàn |
  | `interpreting` | Interpreting and bilingual coordination | Phiên dịch và điều phối song ngữ |
  | `insurance_legal` | Insurance and legal | Bảo hiểm và pháp lý |
  | `post_production` | Post-production, sound, VFX | Hậu kỳ, âm thanh, kỹ xảo |

## R17 — Screens and routes

- **Decision**: the routes of the Screen Specs: SC-19 `/partners`, SC-20 `/partners/[slug]`, SC-23 `/partners/[slug]/request`, SC-21 `/partners/me`, SC-22 `/partners/me/verify`, SC-25 `/requests/[id]` (with the request list of the project, SC-25 #3), SC-36 `/admin/verification`. Two pages without a Screen Spec are needed by D2: the admin invitation form `/admin/partners/invite` and the acceptance page `/invitations/partner/[code]` — Open question 9. The partner's incoming list is `/requests` (FR-013, *incoming*); a member reaches a project's list from the project sidebar item *Partners* (SC-25 #2).
- **Not on the screens**: SC-19 #7 shows a logo, SC-21 #11 portfolio photos and SC-20 #8 portfolio details (type, country, year, days, place); the data model has no logo or photo column and `portfolio` is a list of titles of up to 200 characters. Interim: initials instead of a logo, portfolio as text lines, no photo upload — Open question 10.
- **Portfolio at the member layer** (analysis I4): spec §6.1 describes `portfolio` as *project titles without client names*, SC-20 SR-132 says the member layer **does not name projects**. Decision 06/11/2026: follow SR-132 — portfolio lines describe the work (type, country, year, place) without project titles; SC-21 says so next to the field. Open question 14.

## Open questions

| # | Question | Interim choice | Owner |
|---|---|---|---|
| 1 | ~~May `vfda_staff` create partner invitations, given SYS BR-002?~~ | **Resolved 06/11/2026** (Nam Tran, analysis I1): yes, `vfda_staff` and `admin`; SYS BR-002 changed at `tools/specs_a.py`, SYS question 6 in `tools/decisions.py` (provisional) | VFDA to confirm |
| 2 | [NEEDS CLARIFICATION: how long is a partner invitation valid?] | 7 days, one use | VFDA |
| 3 | [NEEDS CLARIFICATION: can an existing producer account become a partner?] | Refused when the account is on any project (`ALREADY_MEMBER_OF_PROJECT`); the invitee uses another email | Group C |
| 4 | [NEEDS CLARIFICATION: after how many days does an unanswered request expire, and is `expired` a status?] (spec OQ5, data-model §12) | No automatic change; *you can withdraw* hint after 14 days (spec §9) | VFDA |
| 5 | [NEEDS CLARIFICATION: approved wording of *What VFDA checked — and what it does not* and of the Verified explainer (SC-19 #13, SC-22 #10).] | Draft: checked = valid business registration certificate; not checked = quality of work and prices; references listed as submitted | VFDA |
| 6 | [NEEDS CLARIFICATION: is the Article 13 eligibility shown while the Verified badge has expired?] | Shown only while Verified is valid | VFDA |
| 7 | [NEEDS CLARIFICATION: FR-006 lets guests filter by working language, but languages are member layer (US-1 Scenario 2).] | Language filter for signed-in users only | Group C |
| 8 | [NEEDS CLARIFICATION: the standard Vietnamese labels of the 12 service groups (Q1) are not written in any spec.] | Draft list of R16 | Group C / VFDA |
| 9 | No Screen Spec for the admin invitation form and the invitation acceptance page (D2). | Minimal pages `/admin/partners/invite`, `/invitations/partner/[code]` with texts from `lib/i18n` | Nguyễn Linh Chi (screens) |
| 10 | SC-19 #7 logo, SC-21 #11 portfolio photos and SC-20 #8 portfolio details have no column in the data model. | Initials, text lines, no photo upload | Group C / data owner |
| 11 | The Screen Specs still list Q1–Q4 of spec-M4 as *Open* (SC-19, SC-20, SC-21, SC-22, SC-25, SC-36 §9), although the spec's Clarifications decided them on 28/10/2026; and spec-M4 §9 still assumes *the NDA is one standard mutual text provided by VFDA*, while Q4 says the team drafts it and VFDA reviews it (analysis I5). | Built from the Clarifications; fix the statuses at the sources `tools/s*_en.py` and the §9 assumption at `tools/specs_b.py` when Nam Tran asks | Group C |
| 12 | The request named *38 FR* and *SC-19..SC-25*; spec-M4 has 19 FR (F-M4-01..19) and 7 screens (there is no SC-24). | Plan covers FR-001..FR-019 and SC-19, 20, 21, 22, 23, 25, 36 | Nam Tran |
| 13 | Input limits the spec does not give (rate-card shape, text lengths, list sizes, founded year from 1900): marked * in data-model.md §5. | Interim limits of the agent | Group C |
| 14 | [NEEDS CLARIFICATION: spec §6.1 says the member-layer `portfolio` holds *project titles without client names*; SC-20 SR-132 says the member layer does not name projects.] (analysis I4) | Follow SR-132: no project titles at the member layer | Group C / VFDA |
| 15 | [NEEDS CLARIFICATION: should a `bounced` notification email be retried automatically, how often, and who owns the retry (SYS email delivery or M4)?] (spec §3 *delivery is retried*; analysis C1) | Not built; the failure is recorded as `bounced` on the notification's delivery row | Group C |
| 16 | ~~`tools/s4_en.py` still said partner roles are granted only by an admin.~~ (The text is in SC-43 *Terms of use* §2 and SR-262, not SC-42 as first written, and in SC-08 SR-232.) | **Resolved 06/11/2026** (analysis G4): changed at `tools/s4_en.py`, `build_docs.py --mermaid`, `build_index.py`; the SC-43 mockup image keeps the old §2 wording until it is redrawn with `--img` | — |
