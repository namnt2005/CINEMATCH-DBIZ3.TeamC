# Tasks: Location publishing by VFDA (M3 US-3, SC-35)

**Input**: Design documents from `/specs/002-m3-publish/` — [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/admin-locations.contract.md](contracts/admin-locations.contract.md), [quickstart.md](quickstart.md)

**Prerequisites**: plan.md (decisions D1–D4), research.md (R1–R10, Open questions 1–9)

**Tests**: Required. Constitution Principle II and the request for this feature: the test of every business rule (BR) and every acceptance scenario is written and seen failing **before** the code that makes it pass. Each implementation task names the test task it turns green.

**Organization**: One user story in scope (US-3, P1 in the spec). Shared database rules come first (Phase 2) because every admin action depends on them.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[US3]**: belongs to User Story 3 — *VFDA publishes a verified location*
- Paths are relative to the repository root (single Next.js project, see plan.md §Project Structure)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configuration the later tasks read. No new dependency (plan.md Technical Context).

- [X] T001 Document the server-only variables `MOCK_STAFF_USER_ID` (default seed staff `515529a9-46d9-559c-aab4-e5fb31eedeea`, research R3, Open question 1) and the dev use of `MOCK_AUTH_DEFAULT_ROLE` (research R4, Open question 2) in .env.example, with no value that is a secret

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The database rules (BR-004 trigger, append-only audit), the transaction helper, the audit writer and the staff identity that every US-3 action uses.

**⚠️ CRITICAL**: No US-3 work can begin until this phase is complete. Tests T002–T004 are written and seen failing before T005–T007.

### Tests for Phase 2 (write first, see them fail) ⚠️

- [X] T002 [P] Create unit test for the mock staff session: `x-mock-role: vfda_staff` returns `userId` = `MOCK_STAFF_USER_ID` or the default seed staff id; with no header the role comes from `MOCK_AUTH_DEFAULT_ROLE` and the header always wins; with neither the session stays guest (research R3, R4; FR-004 `verified_by`, M10 FR-008 `admin_id`) in tests/unit/auth-session-staff.test.js
- [X] T003 [P] Create unit test for the audit log: `writeAudit()` inserts exactly one row with `action`, `admin_id`, `target_id`, `logged_at`; `UPDATE audit_log` and `DELETE FROM audit_log` are refused by `trg_audit_log_append_only`; inside `withTransaction()` an error after the action rolls back both the action and its audit row (M10 BR-005, SC-35 SR-317) in tests/unit/audit-log.test.js
- [X] T004 [P] Create unit test for the BR-004 database constraint on a fresh database: a direct `UPDATE location SET intake_status='published', published='true'` for `mui-ne` (contact not verified) is refused by `trg_location_publish_needs_contact`; an INSERT of a published location is refused; the same UPDATE for `cua-van` (verified contact) succeeds; saving the contact of a published location does not unpublish it (D4); the seed still loads 11 locations with 9 published after the triggers (US-3 Scenario 1, BR-004, FR-005, SR-311) in tests/unit/publish-trigger.test.js

### Implementation for Phase 2

- [X] T005 Create `trg_location_publish_needs_contact` (BEFORE INSERT and BEFORE UPDATE OF `intake_status`, `published` on `location`, abort with *Authority contact not verified (M3 BR-004).*) and `trg_audit_log_append_only` (BEFORE UPDATE / DELETE on `audit_log`) in lib/db/local-triggers.sql, and run that file after the seed plus add `withTransaction(fn)` in lib/db/client.js (research R1, R2; BR-004, M10 BR-005; verifies T004 and the trigger part of T003)
- [X] T006 Implement `writeAudit(db, { action, adminId, targetId })` with a random `audit_log_id` and server `logged_at`, to be called only inside `withTransaction()`, in lib/db/audit.js (SR-317, M10 FR-008; verifies T003)
- [X] T007 Extend `resolveSessionRole` with `userId` for `vfda_staff` and the `MOCK_AUTH_DEFAULT_ROLE` fallback, both read from `process.env` on the server, marked interim until Open questions 1–2 are answered, in lib/auth/session.js (research R3, R4; verifies T002 and keeps tests/unit/auth-session.test.js green)

**Checkpoint**: The database refuses an unverified publish and any audit edit; every admin action can run in one transaction with its audit row.

---

## Phase 3: User Story 3 — VFDA publishes a verified location (Priority: P1) 🎯 MVP

**Goal**: VFDA staff list, create and edit locations with the 20 fields, record and verify the authority contact, publish only with a verified contact and unpublish without deleting, on SC-35 (`/admin/locations`), with one audit row per action (FR-001, FR-002, FR-004, FR-005, BR-004, BR-008, BR-010, SR-311..SR-317).

**Independent Test**: [quickstart.md](quickstart.md) §2 scenarios 1–14 with `x-mock-role: vfda_staff`: create a location, see the publish refused, verify the contact, publish, unpublish, publish again; each step leaves exactly one audit row, and the public pages follow (404 after unpublishing).

### Tests for User Story 3 (write first, see them fail) ⚠️

- [X] T008 [P] [US3] Create unit test for the 20-field and contact validation: every required field of data-model §1, enums (scene types ≥ 1 of 14, crew capacity, permit complexity, availability, `night_shooting_allowed` yes/no/ask), `lat` 8–24 and `lng` 102–110, months 1–12 in `months_to_avoid` and `rainy_months` with `[]` kept apart from missing, name ≤ 200, district ≤ 120, contact office ≤ 200 / name ≤ 120 / phone ≤ 20 / optional e-mail format; all errors returned at once (FR-002, FR-004, Clarifications Q3, research R5) in tests/unit/location-input.test.js
- [X] T009 [P] [US3] Create contract test for the role gate on all 9 handlers of the contract: no header → 401, `member` and `vfda_legal` → 403, `vfda_staff` → success; `DELETE /api/admin/locations/:id` → 405 with the BR-008 message (contract §0; BR-008, SR-312) in tests/contracts/admin-auth.test.js
- [X] T010 [P] [US3] Create contract test for listing and reading: `GET /api/admin/locations` returns all 11 seed locations including unpublished `cua-van`, `counts` for the whole catalogue, `status` filter, `q=mui ne` without diacritics, `province_id` filter; `GET /api/admin/locations/:id` returns the 20 fields, the contact with `verified_by_name`, read-only photos with source / usage right / status, `can_publish` and `blocked_reason`; unknown id → 404 (FR-001, SC-35 #3–#10, contract §1–§2) in tests/contracts/admin-locations-list.test.js
- [X] T011 [P] [US3] Create contract test for creating and editing: POST with the 20 fields → 201, `awaiting_contact`, `published=false` even if the body says published, slug from `name_en`, one `location.create` row; invalid body → 422 naming every field and no audit row; duplicate slug → 409 `SLUG_TAKEN`; PUT of other fields → one `location.update`; PUT of `availability` → one `location.availability` and the location stays published (BR-010); PUT with no change → no row (FR-002, BR-010, SR-316, SR-317, contract §3–§4) in tests/contracts/admin-locations-edit.test.js
- [X] T012 [P] [US3] Create contract test for the authority contact: saving sets `contact_verified=false`, `verified_by`=mock staff, empty `verified_at`, one `location.update`; verify sets the three fields, one `location.contact_verify`; verify with no contact → 409 `NO_CONTACT`; saving the contact of a published location keeps it published, `GET /api/locations/:slug/authority-contact` as `member` → 404 and `GET /api/locations/:slug` → `has_verified_contact=false` (FR-004, SR-314, D4, research R8, contract §5–§6) in tests/contracts/admin-contact.test.js
- [X] T013 [P] [US3] Create contract test for publish and unpublish: publish with an unverified contact → 409 `UNVERIFIED_CONTACT` with `blocked_reason`, status unchanged, no audit row (US-3 Scenario 1); after verify, publish → 200, one `location.publish`, `GET /api/locations/:slug` → 200; publish again when published → 409 `INVALID_TRANSITION`; unpublish → 200, one `location.unpublish`, optional reason in `blocked_reason`, `GET /api/locations/:slug` → 404, row still listed; unpublish of an `awaiting_contact` location → 409; publish of an unpublished location with a verified contact → 200 (FR-005, BR-004, BR-008, SR-311, SR-312, contract §7–§8) in tests/contracts/admin-publish.test.js
- [X] T014 [P] [US3] Create unit test for the SC-35 view helpers: status labels *Awaiting contact* / *Published* / *Unpublished*, availability labels *Open* / *Scouting crew on site* / *Temporarily closed*, row action per status (published → *Unpublish*, awaiting_contact → *Edit*, unpublished → *Publish again*), *Publish* disabled with its reason while the contact is not verified, *✓ verified by {name}, DD/MM/YYYY*, no *Delete* action (SC-35 #8, #9, #11, #23, #25, SR-311, SR-312, SR-316) in tests/unit/admin-locations-view.test.js

### Implementation for User Story 3

- [X] T015 [P] [US3] Implement `validateLocationInput()` and `validateContactInput()` from data-model §1 and `getSceneCatalog()` (lib/catalog/validator.js), returning field → message for every error, in lib/admin/location-input.js (FR-002, FR-004, research R5; verifies T008)
- [X] T016 [US3] Implement `listAdminLocations({ status, q, provinceId })`, `countLocationsByStatus()` and `getAdminLocation(id)` reusing `removeDiacritics` (lib/db/search.js), joining `profile.full_name` for `verified_by_name` and counting photos, in lib/db/admin-locations.js (FR-001, data-model §4; data side of T010)
- [X] T017 [US3] Implement `createLocation(input, session)` (slug from `name_en`, refuse duplicates — interim, research Open question 4) and `updateLocation(id, input, session)` (audit `location.update` / `location.availability` per data-model §3) inside `withTransaction()` in lib/db/admin-locations.js (FR-002, BR-010, SR-317; data side of T011)
- [X] T018 [US3] Implement `saveAuthorityContact(id, input, session)` (reset verification, `verified_by` = acting staff — interim, research Open question 9) and `verifyAuthorityContact(id, session)` with their audit rows in lib/db/admin-locations.js (FR-004, SR-314; data side of T012)
- [X] T019 [US3] Implement `publishLocation(id, session)` (let `trg_location_publish_needs_contact` decide, map its abort to `UNVERIFIED_CONTACT`, set `blocked_reason` after the rollback, clear it on success) and `unpublishLocation(id, reason, session)` (optional reason — interim, research Open question 3) with their audit rows in lib/db/admin-locations.js (FR-005, BR-004, BR-008; data side of T013)
- [X] T020 [P] [US3] Replace the constant `has_verified_contact: true` with a boolean read of `authority_contact.contact_verified` (no personal data) in lib/db/location-detail.js (D4, research R8; public side of T012)
- [X] T021 [P] [US3] Show *Liên hệ đang chờ VFDA xác minh lại* in the member contact block when the location has no verified contact, guests unchanged (SR-111 still holds), in app/locations/[slug]/page.js (D4, research R8)
- [X] T022 [US3] Implement `requireStaff(req)` (401 `UNAUTHENTICATED` / 403 `FORBIDDEN`) and the admin error responses (`VALIDATION_ERROR`, `NOT_FOUND`, `SLUG_TAKEN`, `NO_CONTACT`, `UNVERIFIED_CONTACT`, `INVALID_TRANSITION`, `METHOD_NOT_ALLOWED`) in lib/api/admin.js (contract §0; supports T009)
- [X] T023 [US3] Implement `GET` (list + counts) and `POST` (create) in app/api/admin/locations/route.js (FR-001, FR-002; verifies T010 list part, T011 create part)
- [X] T024 [US3] Implement `GET` (one), `PUT` (update) and `DELETE` (405) in app/api/admin/locations/[id]/route.js (FR-002, BR-008; verifies T009 delete part, T010 detail part, T011 update part)
- [X] T025 [P] [US3] Implement `PUT` in app/api/admin/locations/[id]/authority-contact/route.js and `POST` in app/api/admin/locations/[id]/authority-contact/verify/route.js (FR-004; verifies T012)
- [X] T026 [P] [US3] Implement `POST` in app/api/admin/locations/[id]/publish/route.js and app/api/admin/locations/[id]/unpublish/route.js (FR-005, BR-004, BR-008; verifies T013 and, with T023–T025, T009)
- [X] T027 [P] [US3] Implement the SC-35 view helpers (labels, row action, publish state and reason, verified line) in app/admin/locations/admin-locations-view.js (SC-35 §3; verifies T014)
- [X] T028 [US3] Implement SC-35 in app/admin/locations/page.js using the admin API and T027: title with counts, status / search / province filters, location table, editor with the 20 fields in the four groups of SC-35 #13–#16 (including *Night shooting* and *Rainy months*), contact section with *Mark contact as verified* and confirmation, read-only photos (D3), *Publish* disabled with its reason via `aria-describedby`, *Unpublish* with confirmation and optional reason, Success / Error / Empty states, audit note; no *Delete* (SC-35 §3–§6, SR-311..SR-317)

**Checkpoint**: US-3 works end to end; every BR and acceptance scenario has a green test written before its code.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T029 [P] Record the spec issues found by this feature — SC-35 still says 18 fields (Open question 6), audit written by the app locally (Open question 7), meaning of `verified_by` (Open question 9) — in docs/build/build-log.md §3
- [ ] T030 Run `npm test`, `npm run build`, `uv run tools/start_feature.py --check` and `python3 data/schema/load_check.py`, then execute the scenarios of specs/002-m3-publish/quickstart.md on macOS and Windows and note the results there
- [X] T031 Add the build-log entry and the AI-use-log row for this feature in docs/build/build-log.md and docs/ai-use-log.md

**Deferred (not tasks of this feature)**: photo upload and photo status changes (FR-003, SC-35 #17, #20–#22; decision D3, spec Open Question 10); 12-month re-verification (spec Open Question 5); Supabase versions of the triggers (research R1, R2).

---

## Traceability: rule or scenario → test → code

| Rule / scenario | Test (written first) | Code that turns it green |
|---|---|---|
| US-3 Scenario 1 — publish refused by a database constraint, reason shown | T004, T013 | T005, T019, T026, T028 |
| BR-004 / FR-005 — publish only with a verified contact | T004, T013 | T005, T019, T026 |
| BR-008 — unpublish, never delete | T009, T013, T014 | T019, T024, T026, T027 |
| BR-010 — availability change audited, paused stays published | T011 | T017, T024 |
| FR-001 — list every status | T010 | T016, T023 |
| FR-002 — 20 fields incl. `night_shooting_allowed`, `rainy_months` | T008, T011 | T015, T017, T023, T024 |
| FR-004 / SR-314 — record and verify the contact | T008, T012 | T015, T018, T025 |
| D4 — contact edited while published | T004, T012 | T018, T020, T021 |
| SR-317 / M10 BR-005 — one audit row per action, append-only | T003, T011, T012, T013 | T005, T006, T017, T018, T019 |
| Role gate `vfda_staff` | T002, T009 | T007, T022 |

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: none.
- **Phase 2 (Foundational)**: after Phase 1. Tests T002–T004 first, then T005–T007. Blocks Phase 3.
- **Phase 3 (US-3)**: after Phase 2. Tests T008–T014 first, then T015–T028.
- **Phase 4 (Polish)**: after Phase 3.

### Within Phase 3

- Tests T008–T014 are written and seen failing before any of T015–T028.
- T016 → T017 → T018 → T019 (same file lib/db/admin-locations.js).
- T015 before T017 and T018 (validation used on create, update and contact save).
- T022 before T023–T026 (role gate and error responses).
- T023 and T024 after T016–T019; T025 after T018; T026 after T019.
- T027 before T028; T028 after T023–T026.
- T020 and T021 only need Phase 2.

---

## Parallel Opportunities

- **Phase 2 tests**: T002, T003, T004 together.
- **Phase 3 tests**: T008, T009, T010, T011, T012, T013, T014 together (seven different files).
- **Phase 3 code**: T015, T020, T021, T027 together; then T025 and T026 together once T018, T019 and T022 are done.
- **Phase 4**: T029 alongside T030.

### Example: start of Phase 3

```text
Task: "T008 [P] [US3] location-input validation test in tests/unit/location-input.test.js"
Task: "T009 [P] [US3] admin role-gate contract test in tests/contracts/admin-auth.test.js"
Task: "T010 [P] [US3] admin list/read contract test in tests/contracts/admin-locations-list.test.js"
Task: "T011 [P] [US3] create/edit contract test in tests/contracts/admin-locations-edit.test.js"
Task: "T012 [P] [US3] authority-contact contract test in tests/contracts/admin-contact.test.js"
Task: "T013 [P] [US3] publish/unpublish contract test in tests/contracts/admin-publish.test.js"
Task: "T014 [P] [US3] SC-35 view-helper test in tests/unit/admin-locations-view.test.js"
```

---

## Implementation Strategy

### MVP (the whole of US-3)

1. Phase 1: T001.
2. Phase 2: write T002–T004 and see them fail; implement T005–T007 until they pass.
3. Phase 3: write T008–T014 and see them fail; implement T015–T028 until they pass.
4. **STOP and VALIDATE** with [quickstart.md](quickstart.md) §2–§3.
5. Phase 4: T029–T031.

### Before merging

Answer research Open questions 1–9 or confirm the interim choices (T001, T007, T017, T018, T019 depend on them); a teammate reviews the pull request (Constitution Principle V).
