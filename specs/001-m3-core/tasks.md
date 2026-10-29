# Tasks: Location Discovery (M3 Core Slice)

**Branch**: `001-m3-core` | **Spec**: [specs/001-m3-core/spec.md](file:///Users/adm/CINEMATCH-DBIZ3.TeamC/specs/001-m3-core/spec.md) | **Plan**: [specs/001-m3-core/plan.md](file:///Users/adm/CINEMATCH-DBIZ3.TeamC/specs/001-m3-core/plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure adhering to `plan.md` and `docs/architecture/system-configuration.md`.

- [X] T001 Initialize Next.js application structure and environment configuration per plan in package.json and .env.example
- [X] T002 [P] Create version-controlled scene type catalog and synonym mappings in config/scene-catalog.json
- [X] T003 [P] Configure database client connectivity to PostgreSQL and seed tables in lib/db/client.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure, data access components, and seed verification that MUST be complete before user story implementation begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 [P] Create automated test verifying loaded Session 5 seed data (11 locations total, 9 published, 1 awaiting_contact, 1 unpublished) per data/data-model-M3.md in tests/foundational/seed-verification.test.js
- [X] T005 Implement database queries verifying published locations and seed counts in lib/db/locations.js
- [X] T006 [P] Create unit test for session authorization helper resolving guest vs member mock roles in tests/unit/auth-session.test.js
- [X] T007 Implement session authorization helper for mock role resolution (x-mock-role) in lib/auth/session.js

**Checkpoint**: Foundation and seed data integrity verified — user story implementation can begin.

---

## Phase 3: User Story 1 — Describe a scene, get places that fit (Priority: P1) 🎯 MVP

**Goal**: Filmmakers can submit a free-text scene description or multi-criteria filters to receive ranked published locations scoring >= 40 with explainable match reasons (`SC-14`, `SC-15`).

**Independent Test**:
1. Post a scene description to the extraction endpoint; verify extracted attributes and synonym mappings.
2. Execute a search with filter criteria; verify only published locations scoring >= 40 are returned, ranked by score descending, with at least one match reason per card and filter state in the URL.

### Tests for User Story 1 (Test-First — Constitution Principle II) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation.**

- [X] T008 [P] [US1] Create contract test for scene extraction API verifying extracted attributes payload is editable (US-1 Scenario 1.1, F-M3-10, F-M3-11) in tests/contracts/extract-scene.test.js
- [X] T009 [P] [US1] Create unit test for catalog validator and synonym mapper verifying uncatalogued terms map to nearest catalog values with mapping explanation (US-1 Scenario 1.3, F-M3-12) in tests/unit/catalog-validator.test.js
- [X] T010 [P] [US1] Create unit test for deterministic scoring engine verifying ranking isolation from language model output (BR-001) in tests/unit/scoring-determinism.test.js
- [X] T011 [P] [US1] Create unit test for scoring threshold cutoff (score >= 40) and mandatory match reasons generation (BR-002) in tests/unit/scoring-threshold.test.js
- [X] T012 [P] [US1] Create unit test for missing data neutrality in scoring algorithm (BR-003) in tests/unit/scoring-neutrality.test.js
- [X] T013 [P] [US1] Create unit test for location availability scoring criterion weights and paused status retention (BR-010) in tests/unit/scoring-availability.test.js
- [X] T014 [P] [US1] Create unit test for pre-2025 province name mapping to 34 post-2025 provincial units (BR-006) in tests/unit/province-mapping.test.js
- [X] T015 [P] [US1] Create unit test for location published status query filter excluding unpublished and awaiting-contact records (BR-008) in tests/unit/published-filter.test.js
- [X] T016 [P] [US1] Create contract test for location search and ranking Route Handler returning ranked published locations scoring >= 40 with match reasons (US-1 Scenario 1.2, F-M3-06, F-M3-08, F-M3-09) in tests/contracts/search.test.js
- [X] T017 [P] [US1] Create unit test for location query persistence verifying no personal data or PII is stored in location_query (BR-009) in tests/unit/query-logging.test.js
- [X] T018 [P] [US1] Create unit test for filter state URL serialization and deserialization (F-M3-07) in tests/unit/url-filter-state.test.js

### Implementation for User Story 1

- [X] T019 [US1] Implement scene attribute catalog validator and synonym mapper in lib/catalog/validator.js (verifies T009)
- [X] T020 [US1] Implement deterministic 6-criteria scoring algorithm matching F-M3-08 in lib/scoring/engine.js (verifies T010, T011, T012, T013)
- [X] T021 [US1] Implement pre-2025 province mapping and published location search queries in lib/db/search.js (verifies T014, T015)
- [X] T022 [US1] Implement confirmed scene query persistence without personal data in lib/db/queries.js (verifies T017)
- [X] T023 [US1] Implement Route Handler for scene attribute extraction calling Language Model API in app/api/locations/extract-scene/route.js (verifies T008)
- [X] T024 [US1] Implement Route Handler for multi-criteria search, filtering, and scoring in app/api/locations/search/route.js (verifies T016)
- [X] T025 [US1] Implement URL state synchronization for multi-criteria filters in app/locations/use-filter-state.js (verifies T018)
- [X] T026 [US1] Implement scene description input and attribute confirmation UI (SC-15) in app/locations/match/page.js
- [X] T027 [US1] Implement location search results grid with match reasons and filter controls (SC-14) in app/locations/page.js

### Follow-up for User Story 1 (added 2026-10-30)

- [X] T043 [P] [US1] Create unit test for result-card name clamp style verifying `WebkitLineClamp: 2`, `display: '-webkit-box'`, `WebkitBoxOrient: 'vertical'` and `overflow: 'hidden'` so long names show at most 2 lines + "…" (SC-14 #5) in tests/unit/card-name-clamp.test.js
- [X] T044 [US1] Extract the clamp style into app/locations/card-styles.js and apply it to the `name_en` heading and the `name_vi • province` line of each result card in app/locations/page.js; add `title={loc.name_en}` so the full name stays readable; full text stays in the DOM for screen readers (verifies T043)

**Checkpoint**: User Story 1 is fully functional and independently testable (MVP complete).

---

## Phase 4: User Story 2 — Contact the local authority (Priority: P2, Optional)

**Goal**: Filmmakers can view detailed location information with photos, logistics, season, and nearby locations within 30 km, while authority contacts are gated by Row Level Security for authenticated members only (`SC-16`).

**Independent Test**:
1. Fetch public location detail by slug as a guest; verify photos, logistics, season notes, and nearby locations within 30 km are returned, but authority phone and email are omitted.
2. Fetch authority contact as an authenticated member; verify verified contact details and verification date are returned.

### Tests for User Story 2 (Test-First — Constitution Principle II) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation.**

- [X] T028 [P] [US2] Create contract test for public location detail endpoint verifying photos, logistics, `season.months_to_avoid`, `season.rainy_months` (array) and `season.night_shooting_allowed` (`yes`/`no`/`ask`/`null`) using seed `trang-an` (`no`, `[6,7,8]`) and `tam-coc` (`ask`, `[]`); the raw response body contains no `contact_phone`, `contact_email` or `+84 000 000`; unpublished slugs (`mui-ne`, `cua-van`) return 404 (US-2 Scenario 2.1, F-M3-13, Clarifications Q3) in tests/contracts/location-detail.test.js
- [X] T029 [P] [US2] Create contract test for gated authority contact endpoint `GET /api/locations/:slug/authority-contact` verifying `x-mock-role: member` or `vfda_staff` gets 200 with authority, contact person, phone, email and `verified_at`, and a guest gets 401 `UNAUTHENTICATED` with `signup_url` and no phone or email in the body (US-2 Scenario 2.2, F-M3-15, BR-005) in tests/contracts/authority-contact.test.js
- [X] T030 [P] [US2] Create unit test for authority contact verification metadata verifying only contacts with `contact_verified = true` are returned, with `verified_by` and `verified_at` (BR-004); do not assert the 12-month re-verification cycle, which is still Open Question 5 (seed `ca-mau-cape` was verified in 2016) in tests/unit/contact-verification.test.js
- [X] T031 [P] [US2] Create unit test for the role gate in the data access layer, the local stand-in for Row Level Security on `node:sqlite`: for a guest, `getAuthorityContact()` returns `null` without running any query on `authority_contact` (spy on `query`/`getOne`) (BR-005, SR-111); the Supabase RLS policy itself is deferred to Session 11 per plan.md Complexity Tracking in tests/unit/contact-rls.test.js
- [X] T032 [P] [US2] Create unit test for the local Haversine nearby calculation verifying published locations only, within 30 km, at most 5, sorted by distance, excluding the location itself (F-M3-14, SC-16 #12); PostGIS `ST_DWithin` replaces it on Supabase in tests/unit/nearby-locations.test.js
- [X] T045 [P] [US2] Create unit test for season and night-shooting display labels (BR-003, SR-113): `yes` → *Night shooting allowed*, `no` → *Not allowed*, `ask` → *Ask the local authority*, `null` → *No data yet*; `rainy_months` `[6,7,8]` → *Jun, Jul, Aug*, `[]` → *No rainy months recorded* (matches lib/scoring/engine.js, which gives `[]` full season points), `null` → *No data yet* in tests/unit/season-facts.test.js

### Implementation for User Story 2

- [X] T033 [US2] Implement nearby location query service within 30 km radius using Haversine on `node:sqlite`, keeping the function signature so PostGIS can replace it, in lib/db/nearby.js (verifies T032)
- [X] T034 [US2] Implement `getAuthorityContact(locationId, session)` that checks the role before querying and returns verified contacts only in lib/db/contacts.js (verifies T030, T031)
- [X] T046 [US2] Implement season and night-shooting label helper in lib/locations/season-facts.js (verifies T045)
- [X] T035 [US2] Implement Route Handler for public location detail and nearby locations returning `season.night_shooting_allowed`, `season.rainy_months` and `has_verified_contact`, never joining contact phone or email, and 404 when `intake_status != published`; reuse `getLocationBySlug` and `getLocationImages` (lib/db/locations.js) and `resolveSessionRole` (lib/auth/session.js) in app/api/locations/[slug]/route.js (verifies T028)
- [X] T036 [US2] Implement Route Handler for gated authority contact that resolves `location_id` from the slug in app/api/locations/[slug]/authority-contact/route.js (same dynamic segment name as T035; `[id]` beside `[slug]` breaks the Next.js build) (verifies T029)
- [X] T037 [US2] Implement Leaflet + OpenStreetMap interactive map component in app/components/map/location-map.js
- [X] T038 [US2] Implement location detail page view with photo gallery, logistics, a *Seasons and permits* block showing rainy months and night shooting through lib/locations/season-facts.js, and a gated contact card; guests see the dashed box *Local authority contacts are visible to members only* with *Sign up free* / *Log in*, and the page does not fetch the contact for guests so the page source holds no phone number (SC-16, SR-111, SC-004) in app/locations/[slug]/page.js

**Checkpoint**: User Story 2 is functional and independently testable alongside User Story 1.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verification, environment readiness, and cross-cutting validation across both stories.

**Note on Environment Checks**: Workstation environment checks (such as Git version in `tools/check_env.py`) are non-blocking advisory checks and do NOT block the delivery, completion, or demonstration of the US-1 MVP.

- [X] T039 [P] Execute environment and repository check via python3 tools/check_env.py --repo (advisory, non-blocking for US-1 MVP)
- [X] T040 [P] Verify database schema and seed integrity via python3 data/schema/load_check.py
- [X] T041 [P] Verify feature specification snapshot consistency via python3 tools/start_feature.py --check
- [ ] T042 Add and execute quickstart validation scenarios on macOS and Windows in specs/001-m3-core/quickstart.md: (a) guest opens `/locations/trang-an` and the page source has no `+84`; (b) member sees the contact with its verification date; (c) `tam-coc` shows *Ask the local authority* and *No rainy months recorded*; (d) the `ca-mau-cape` card (200-character name) is clamped to 2 lines + "…" at desktop width and about 375 px

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately once tooling choices are confirmed.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational completion. Delivers the core MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational completion. Can proceed sequentially after US-1 or in parallel.
- **Polish (Phase 5)**: Depends on completion of in-scope user stories. Workstation environment warnings in T039 do not block US-1 MVP validation.

### User Story Dependencies

- **User Story 1 (P1)**: Independent of US-2. Requires only Foundational components (`config/scene-catalog.json`, DB client, seed verification).
- **User Story 2 (P2)**: Independent of US-1. Reuses shared database queries and mock auth from Phase 2.

### Within Each User Story

- Automated tests MUST be written and fail before implementation code (T008–T018 before T019–T027; T043 before T044; T028–T032 and T045 before T033–T038 and T046).
- Domain scoring and catalog services before Route Handlers.
- Route Handlers / endpoints before UI pages.
- Story verified independently before moving to next priority.

---

## Parallel Opportunities

- **Setup Phase**: T002 and T003 can execute in parallel once T001 is initialized.
- **Foundational Phase**: T004 and T006 can execute in parallel.
- **User Story 1 Tests**: T008, T009, T010, T011, T012, T013, T014, T015, T016, T017, T018, and T043 can all be written in parallel.
- **User Story 2 Tests**: T028, T029, T030, T031, T032, and T045 can all be written in parallel.
- **Polish Phase**: T039, T040, and T041 can execute in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (`T001`–`T003`).
2. Complete Phase 2: Foundational (`T004`–`T007`), including seed data verification (`T004`).
3. Complete Phase 3: User Story 1 (`T008`–`T027`):
   - Write tests `T008`–`T018` and see them fail.
   - Implement `T019`–`T027` until all tests pass.
4. **STOP and VALIDATE**: Run independent tests for US-1 to confirm the MVP is fully functional and can be demonstrated independently without User Story 2.
5. **Environment Discrepancy Independence**: Any host workstation warnings (e.g., Git version from `tools/check_env.py`) are strictly advisory and do not block US-1 MVP completion or demonstration.

### Incremental Delivery (User Story 2 Added)

1. If time permits after US-1 validation, proceed to Phase 4: User Story 2 (`T028`–`T038`):
   - Write tests `T028`–`T032` and `T045` and see them fail.
   - Implement `T033`–`T038` and `T046` until all tests pass.
2. Validate US-2 independently.
3. Execute Phase 5 Polish tasks (`T039`–`T042`).
