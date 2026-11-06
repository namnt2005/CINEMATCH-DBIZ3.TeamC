# Data model: Vietnamese service partners (M4)

Feature: `007-m4-partners` · Source of truth: `data/data-model-M4.md`, `data/schema/schema-M4.sql` · Decisions: [plan.md](plan.md) D1–D6 · Research: [research.md](research.md)

Every new table or column below is added **through the generators** (`tools/dm_model2.py`, `tools/dm_rules.py`, `tools/rls_policies.py`, `data/seed/generate_seed.py`, `data/seed/seed_rules.py`), then `data/`, `data/schema/`, the seed and the generated migrations are rebuilt. Nothing in `data/` is edited by hand. The data owner (Nguyễn Huy Trung) reviews D1, D2, D6.

## 1. Tables used

| Table | Owner | Use in this slice |
|---|---|---|
| `organisation` | M4 | layer 1; directory, profile, badge dates, `art13_eligible`, `org_status` |
| `organisation_member_layer` | M4 | layer 2; capability, portfolio, project count, languages |
| `organisation_private_layer` | M4 | layer 3; rate card, past clients, direct contact |
| `verification_request` | M4 | submit, queue, decision (+ D6 columns) |
| `collab_request` | M4 | request life cycle (R6) |
| `collab_message` | M4 | response notes and replies (BR-009) |
| `nda_acceptance` | M4 | one row per party per request (R7) |
| `document_access_log` | M4 | append-only trigger and log function only (D4, R15) |
| **`organisation_user`** | M4 — **new (D1)** | which partner accounts act for which organisation |
| **`partner_invitation`** | M4 — **new (D2)** | VFDA's one-time invitations |
| `project`, `project_member` | M0 | the requesting project and its owner / edit members |
| `user_account`, `profile`, `notification`, `email_delivery` | SYS | roles, names, in-app and email notices |
| `province` | M3 | province filter, `hq_province` |
| `document_slot` | M5 | read only, to derive component c (R14) |
| `audit_log` | M10 | one row per verification decision, Article 13 switch, invitation, role grant, deactivation |

## 2. New tables (D1, D2)

### ORGANISATION_USER (D1)

| Column | Type | Req | Notes |
|---|---|---|---|
| `org_id` | UUID | Yes | FK → `organisation`; part of the primary key |
| `user_id` | UUID | Yes | FK → `user_account`; part of the primary key; the account's role is `partner` |
| `added_at` | TIMESTAMPTZ | Yes | when the invitation was accepted (or the seed time) |

Primary key `(org_id, user_id)`. Relationship: USER_ACCOUNT *acts for* ORGANISATION (many-to-many). Seed: `tuan.huynh@mekongframe…` → Mekong Frame Co.; `khai.do@dongang…` → Đò Ngang Film Services; `lan.pham@benxua…` → Bến Xưa Production Services. Seed rule: every row's user has role `partner`; every partner account has at least one row.

### PARTNER_INVITATION (D2)

| Column | Type | Req | Notes |
|---|---|---|---|
| `invitation_id` | UUID | Yes | primary key |
| `org_id` | UUID | Yes | FK → `organisation` |
| `email` | VARCHAR(254) | Yes | the invited address, stored lower-case |
| `code_hash` | CHAR(64) | Yes | SHA-256 (hex) of the one-time code; unique; the code itself is never stored |
| `invited_by` | UUID | Yes | FK → `user_account`: a `vfda_staff` or `admin` user (SYS BR-002 as changed 06/11/2026, SYS question 6) |
| `invited_at` | TIMESTAMPTZ | Yes | |
| `expires_at` | TIMESTAMPTZ | Yes | `invited_at` + 7 days (research Open question 2) |
| `accepted_at` | TIMESTAMPTZ | No | empty until accepted |
| `accepted_by` | UUID | No | FK → `user_account`; set with `accepted_at` |

Checks: `expires_at > invited_at`; `(accepted_at IS NULL) = (accepted_by IS NULL)`. Seed: one accepted invitation per seed partner account (the code hash of an invented code), one open invitation for *Hanoi Grip & Light* (empty case: no user yet), one expired; every `invited_by` has role `vfda_staff` or `admin`.

## 3. New columns (D6)

| Table | Column | Type | Req | Notes |
|---|---|---|---|---|
| `verification_request` | `submitted_at` | TIMESTAMPTZ | Yes | when the partner submitted |
| `verification_request` | `decided_at` | TIMESTAMPTZ | No | empty while `pending`; set with `decided_by` |

Checks: `(status = 'pending') = (decided_at IS NULL)`; `decided_at IS NULL OR decided_at > submitted_at`. Seed rule: an approved request's `decided_at` equals its organisation's `verified_at` for the latest approval.

## 4. States

### `collab_request.status` (BR-005, R6)

```text
pending ──respond──> under_review ──respond──> info_requested
   │                     │                         │
   └──────── respond: accepted (partner NDA) / declined ──────┘
accepted ──confirm (producer NDA)──> confirmed        (final)
pending | under_review | info_requested | accepted ──withdraw──> withdrawn   (final)
declined                                                                       (final)
```

| Status | Shown on SC-25 | Step | Who can change it next |
|---|---|---|---|
| `pending` | Sent | 1 | partner (respond), producer (withdraw) |
| `under_review`, `info_requested` | Partner responded | 2 | partner (respond), producer (withdraw) |
| `accepted` | Partner responded | 2 | producer (NDA, confirm, withdraw) |
| `confirmed` | Confirmed | 3 | nobody |
| `declined`, `withdrawn` | end state | — | nobody |

*Open* = `pending`, `under_review`, `info_requested`, `accepted`: at most one open request per `(project_id, org_id)`.

### `verification_request.status` (R8)

`pending` → `approved` (sets the organisation's `verified_at`, `verified_until`) or `rejected` (reason required). One `pending` request per organisation.

### Badge (read rule, FR-011)

Verified ⇔ `verified_until IS NOT NULL AND verified_until >= today (Asia/Ho_Chi_Minh)`. Expiring ⇔ Verified and `verified_until <= today + 30 days`.

### Private layer (layer 3) open for a viewer (R3)

The viewer is a member of the project of a request `r` to the organisation with `r.status IN ('accepted', 'confirmed')`, and `nda_acceptance` has rows for `r` with `party = 'producer'` and `party = 'partner'`, both `accepted = true`; or the viewer is a user of the organisation.

### Component c (R14, BR-006)

`present` if `document_slot(project, 'A13_SERVICE_AGREEMENT').state = 'present'`; else `pending` if a request of the project is `confirmed`; else `missing`. Confirming never writes `document_slot`.

## 5. Validation

Limits from the spec, the schema types or the Screen Specs, except those marked *, which the spec does not give: they are interim choices of the agent to keep inputs bounded (research Open question 13).

| Input | Rule | Error key |
|---|---|---|
| `org_name` | 1–200 characters after trim | `partners.error.name` |
| `legal_form` | 1–60 characters | `partners.error.legal_form` |
| `founded_year` | 4 digits, not in the future (SC-21 #5), from 1900* | `partners.error.founded_year` |
| `hq_province`, `provinces[]` | province ids of the 34; `provinces` at least one | `partners.error.province` |
| `service_groups[]`, `services[]` | at least one, only the 12 values, no duplicates | `partners.error.service_groups` |
| `working_languages[]` | ISO 639-1 codes (2 lower-case letters), no duplicates | `partners.error.language` |
| `rate_card` | list of `{ item: 1–120 chars*, amount: integer ≥ 0, unit: 1–40 chars* }`*, currency VND (SC-21 #12) | `partners.error.rate_card` |
| `past_clients[]` | each 1–200 characters*, at most 50* | `partners.error.past_clients` |
| `direct_contact` | ≤ 200 characters | `partners.error.direct_contact` |
| `capability_desc_vi`, `_en` | ≤ 4000 characters each* | `partners.error.capability` |
| `portfolio[]` | each 1–200 characters (schema), at most 30*; describes the work without project titles (SC-20 SR-132, research Open question 14) | `partners.error.portfolio` |
| collaboration `note` | ≤ 1000 characters | `requests.error.note_long` |
| message `body` | 1–2000 characters | `requests.error.message` |
| decline / respond `note` | ≤ 2000 characters* | `requests.error.message` |
| `reference_projects[]` | ≥ 2 non-empty rows (empty rows ignored), each ≤ 200 characters*, at most 10* | `verification.error.references` |
| `business_license` | uploaded object in `org-documents/<org_id>/verification/`, ≤ 25 MB, starts with `%PDF-` | `verification.error.file` |
| rejection `reason` | 1–1000 characters* | `verification.error.reason_required` |
| invitation `email` | a valid address, ≤ 254 characters | `invitations.error.email` |

## 6. Functions (Postgres `SECURITY DEFINER`, each with a node:sqlite twin)

| Function | Caller | Does |
|---|---|---|
| `app.is_org_user(org_id)` | RLS, functions | true when `auth.uid()` acts for the organisation and has role `partner` |
| `app_save_org_profile(org_id, fields jsonb)` | partner of the org | updates layers 1–3 (not badge, art13, status) |
| `app_deactivate_org(org_id, typed_name)` | partner of the org, staff | BR-008 (R12); audit `organisation.deactivate` |
| `app_submit_verification(org_id, license_path, references jsonb)` | partner of the org | one pending per org; audit none; notifies staff |
| `app_decide_verification(request_id, decision, reason)` | `vfda_staff`, `admin` | R8; audit `verification.approve` / `.reject` |
| `app_set_art13(org_id, on, business_line_confirmed)` | `vfda_staff`, `admin` | R9; audit `organisation.art13_on` / `_off` |
| `app_remind_expiring_verifications()` | System (cron, script) | R8 reminder, once per badge |
| `app_send_collab_request(project_id, org_id, services jsonb, note)` | project owner / edit | R6 send |
| `app_respond_collab_request(request_id, decision, note, nda_accepted)` | partner of the org | R6 respond; partner NDA row when accepting; message row for the note |
| `app_accept_nda(request_id)` | project owner / edit | producer NDA row on an `accepted` request |
| `app_confirm_collab_request(request_id)` | project owner / edit | `accepted` → `confirmed` (producer NDA required) |
| `app_withdraw_collab_request(request_id, note)` | project owner / edit | open → `withdrawn` |
| `app_post_collab_message(request_id, body)` | either side | message row (BR-009) |
| `app_create_partner_invitation(org jsonb, email)` | `vfda_staff`, `admin` | creates the organisation (layer 1) if new, the invitation; returns the one-time code; audit `partner.invite` |
| `app_accept_partner_invitation(code)` | the invited, signed-in account | R2; role `partner`, `organisation_user`; audit `role.grant` |
| `app_log_document_view(document_id)` | (M5) | one `document_access_log` row (R15) |
| `app_grant_role(user_id, role)` — **replaced** (SYS) | `admin` | as before for `member`, `vfda_staff`, `vfda_legal`, `admin`; `partner` refused with `ROLE_BY_INVITATION_ONLY` (SYS BR-002 as changed 06/11/2026, analysis G1) |

Triggers: `trg_collab_request_final` refuses any UPDATE of a `declined`, `withdrawn` or `confirmed` row (BR-005; it does not watch DELETE, which no client role is granted); `trg_collab_message_no_update` refuses UPDATE and DELETE (BR-009); `trg_document_access_log_append_only` refuses UPDATE and DELETE (BR-007); the same on SQLite in `lib/db/local-triggers.sql`. Rows that a trigger keeps (messages, access-log rows, and requests that have messages) are removed only by `node scripts/seed-supabase.mjs --reset` (TRUNCATE fires no row trigger).

## 7. Read policies (R3; source `tools/rls_policies.py`)

| Table | Select | Direct writes |
|---|---|---|
| `organisation` | `anon`, signed in | revoked (functions) |
| `organisation_member_layer` | signed in (`rls_org_member_layer_members`) | revoked |
| `organisation_private_layer` | `rls_org_private_after_nda` (both NDA rows) or `app.is_org_user` | revoked |
| `verification_request` | staff; partner of the org | revoked |
| `collab_request` | project members; partner of the org | revoked (generated member insert removed) |
| `collab_message`, `nda_acceptance` | project members of the request; partner of the org | revoked |
| `organisation_user` | the user's own rows; staff | revoked |
| `partner_invitation` | `vfda_staff`, `admin` | revoked |
| `document_access_log` | project members of the document (unchanged) | revoked; trigger refuses UPDATE / DELETE |

Storage `org-documents`: private bucket, no object policy for `anon` / `authenticated`; signed URLs from the server only (R10).
