# Research: Location publishing by VFDA (M3 US-3, SC-35)

Feature: `002-m3-publish` · Date: 2026-10-30 · Input: [plan.md](plan.md), [spec.md](spec.md), `data/data-model-M3.md`, `data/schema/schema-M3.sql`, `data/schema/schema-M10.sql`, `docs/screens/screen-spec-SC-35.md`

The Technical Context has no unknown item. Decisions D1–D4 were taken by Nam Tran on 30/10/2026 (see [plan.md](plan.md)). Points the spec does not settle are listed under **Open questions** with an interim choice; they are not requirements.

## R1. Where the BR-004 "database constraint" lives locally

- **Decision**: a new file `lib/db/local-triggers.sql`, run by `lib/db/client.js` **after** the seed is loaded. It creates:
  - `trg_location_publish_needs_contact` (name from `data/data-model-M3.md` §7): before an INSERT, or an UPDATE of `intake_status` / `published`, that makes a location published, abort with *Authority contact not verified (M3 BR-004).* unless `authority_contact.contact_verified` is true for that location.
  - `trg_audit_log_append_only`: abort every UPDATE and DELETE on `audit_log` (M10 BR-005).
- **Rationale**: US-3 Scenario 1 and SC-35 SR-311 require the database to refuse; a Route Handler check alone can be bypassed. The seed loads `21_location.csv` before `23_authority_contact.csv`, so a trigger present during the seed would refuse the nine published seed rows; it must come after. The trigger fires only when a location **becomes** published, so editing a contact later does not unpublish it (D4).
- **Alternatives considered**: add the triggers to `data/schema/` through `tools/build_schema.py` (rejected for this slice: `data/` is the portable schema shared with Supabase and generated from tools; trigger syntax differs between SQLite and PostgreSQL). App-only check (rejected: not a database constraint).
- **Supabase (Session 11)**: the same two rules as PL/pgSQL trigger functions on `location` and `audit_log`; to be added at the source of the schema when the Supabase slice starts.

## R2. Writing the audit row

- **Decision**: `lib/db/audit.js` exposes `writeAudit(db, { action, adminId, targetId })`; every admin operation runs `BEGIN … COMMIT` and calls it inside the transaction. If the operation fails (for example the BR-004 trigger aborts), the transaction rolls back and no audit row exists. `logged_at` is the server time; `audit_log_id` a random UUID.
- **Rationale**: M10 BR-005: the action and its record are committed together or not at all. A SQLite trigger cannot know the acting user, so the app supplies `admin_id`.
- **Alternatives considered**: audit written by a database trigger (M10 FR-008 wording) — kept for Supabase, where the acting user can be passed with `set_config('app.user_id', …)` and read in the trigger; audit written after commit (rejected: can be lost).

## R3. Who the mock staff member is

- **Decision (interim)**: `x-mock-role: vfda_staff` maps to the seed user `515529a9-46d9-559c-aab4-e5fb31eedeea` (Nguyễn Thị Thu Hà, the name used in the SC-35 *Success* state), overridable with the server variable `MOCK_STAFF_USER_ID`. The id fills `audit_log.admin_id` and `authority_contact.verified_by`. See Open question 1.
- **Rationale**: both columns are NOT NULL foreign keys to `user_account`; the mock session has no user id today.
- **Alternatives considered**: a new fake user (rejected: Principle IV, seed only); the other seed staff account `74749444…` Lê Hoàng Phúc (equally valid; the team chooses).

## R4. Opening SC-35 in a browser

- **Decision (interim)**: when a request has no `x-mock-role` header, `resolveSessionRole` uses `MOCK_AUTH_DEFAULT_ROLE` from the server environment (already documented in `.env.example`, not yet read by the code); the header still wins. Tests never set it. See Open question 2.
- **Rationale**: a browser cannot send a custom header on page navigation, so SC-35 would only work through curl.
- **Alternatives considered**: a query parameter or cookie toggle (rejected: new mechanism not in any document); browser extension (works, but not for every tester).

## R5. Validating the 20 fields and the contact

- **Decision**: `lib/admin/location-input.js` checks every field against `data/schema/schema-M3.sql` and SC-35 §3 before any SQL runs, and returns all errors at once (field → message); the database checks stay as the last line.
  - Required: `name_vi`, `name_en` (≤ 200), `province_id` (one of the 34 provinces), `lat` 8–24 and `lng` 102–110 (`ck_location_in_vietnam`), `scene_types` (≥ 1, values of the 14-value enum), `desc_vi`, `desc_en`, `crew_capacity` (u15 / 15_50 / o50), `lodging_20km`, `grid_power`, `truck_access` (booleans), `permit_complexity` (low / medium / high), `availability` (open / survey_in_progress / paused).
  - Optional: `district` (≤ 120), `airport_km` (integer), `months_to_avoid` and `rainy_months` (integers 1–12; `[]` = none recorded, missing = no data yet, as agreed on 30/10/2026), `night_shooting_allowed` (yes / no / ask), `restriction_note`.
  - Contact: `authority_name` (≤ 200), `contact_name` (≤ 120), `contact_phone` (≤ 20) required; `contact_email` optional (≤ 254, e-mail format).
- **Rationale**: SC-35 #24 enables *Save* only when required fields are valid; showing every error at once avoids one round trip per field.
- **Alternatives considered**: rely on database errors only (rejected: messages are not user-readable and stop at the first error).

## R6. Slug of a new location

- **Decision (interim)**: the slug is `name_en` without diacritics, lower case, words joined by `-`, at most 160 characters (`slug VARCHAR(160)`), as in the example of `specs/001-m3-core/contracts/admin-locations.contract.md` (*Van Long Wetland Nature Reserve* → `van-long-wetland-nature-reserve`). The seed slugs are shorter hand-made names (`trang-an` for *Tràng An Landscape Complex*), so no rule is settled. If the slug is already taken (`uq_location_slug`), creation is refused with 409 and staff change the English name; the system does not invent a variant. The slug does not change when the name is edited, so shared links keep working. See Open question 4.
- **Alternatives considered**: append `-2` on collision (rejected for now: changes a public URL without a rule in the spec).

## R7. API shape compared with the 001 contract

- **Decision**: new contract [contracts/admin-locations.contract.md](contracts/admin-locations.contract.md) with 20 fields and separate `POST …/publish`, `POST …/unpublish`, `POST …/authority-contact/verify` endpoints. The older `specs/001-m3-core/contracts/admin-locations.contract.md` (18 fields, `PUT …/publish {publish: true}`, written before Clarifications Q3) is superseded for this feature.
- **Rationale**: one endpoint per audited action keeps "one action → one audit row" simple to test; publish and unpublish are different actions with different rules.

## R8. Public side when a contact awaits re-verification (D4)

- **Decision**: `lib/db/location-detail.js` reads `authority_contact.contact_verified` (a boolean only) to fill `has_verified_contact`, instead of the constant `true` that relied on "published implies verified". The member view of SC-16 shows *Liên hệ đang chờ VFDA xác minh lại* when it is false. `getAuthorityContact` already returns verified contacts only, so the contact API answers 404 in that case.
- **Rationale**: D4 makes "published but contact not verified" possible. Reading one boolean returns no personal data; SR-111 is about never sending contact details to a guest, which still holds.
- **Alternatives considered**: keep the constant (rejected: would show a verified badge for an unverified contact).

## R9. Storage and test isolation (D1)

- **Decision**: changes live in the in-memory database for the life of the server process. Each admin test file starts from a fresh database (`closeDatabase()` then `getDb()`), and the Node test runner already runs each test file in its own process, so the seed counts checked by `tests/foundational/seed-verification.test.js` stay intact.
- **Alternatives considered**: a local SQLite file outside `data/` (not chosen, D1).

## R10. Photos (D3)

- **Decision**: no upload in this slice. The admin detail returns the photo count, the pending count and the existing photos with `image_source`, `usage_right` and `status` (SC-35 #10, #20, #21) read-only. FR-003 stays open in `tasks.md` as a deferred item.

## Open questions

`[NEEDS CLARIFICATION]` items for the team or VFDA. None blocks `/speckit-tasks`; each has a reversible interim choice used until it is answered, and all must be answered before the pull request is merged.

| # | Question | Interim choice | Blocking? | Owner |
|---|---|---|---|---|
| 1 | [NEEDS CLARIFICATION: which seed staff account acts as the mock `vfda_staff` user for `audit_log.admin_id` and `verified_by`?] | Nguyễn Thị Thu Hà (`515529a9…`), overridable with `MOCK_STAFF_USER_ID` (R3) | No | Group C |
| 2 | [NEEDS CLARIFICATION: may the dev server use `MOCK_AUTH_DEFAULT_ROLE` as the role when no `x-mock-role` header is sent, so SC-35 opens in a browser?] | Yes, dev only, header wins (R4) | No | Group C |
| 3 | [NEEDS CLARIFICATION: must staff give a reason when unpublishing? Seed `cua-van` stores one in `blocked_reason`; the spec does not require it.] | Optional reason in the confirmation dialog, stored in `blocked_reason` | No | VFDA |
| 4 | [NEEDS CLARIFICATION: how is the slug of a new location made (full English name, as in the 001 contract example, or a short name typed by staff, as in the seed), and what happens when it already exists?] | From `name_en`; refuse a duplicate with 409 (R6) | No | Group C |
| 5 | [NEEDS CLARIFICATION: may the `admin` role also manage locations on SC-35?] | `vfda_staff` only, as requested | No | VFDA |
| 6 | Spec drift: SC-35 §7 and element #15 still say *18 template fields* and omit `night_shooting_allowed` and `rainy_months`, while FR-002 says 20. | Build the 20 fields of FR-002; fix SC-35 at its source (`tools/s*_en.py`) in a separate change | No | Nam Tran |
| 7 | Spec drift: M10 FR-008 says a database trigger writes audit rows; locally the app writes them in the same transaction (R2). | App-written locally; trigger on Supabase | No | Nam Tran |
| 8 | Still open in the spec: Open Question 5 (12-month re-verification) and Open Question 10 (who approves photos; is an approved photo required before publishing?). | Not enforced; no photo rule for publishing | No | VFDA |
| 9 | [NEEDS CLARIFICATION: `authority_contact.verified_by` is NOT NULL, so it is filled before any verification; seed `mui-ne` stores the staff member who recorded the unverified contact. Is `verified_by` "who last saved or verified"?] | Save sets `verified_by` = acting staff, `verified_at` empty, `contact_verified` false; verify sets all three | No | Group C |
