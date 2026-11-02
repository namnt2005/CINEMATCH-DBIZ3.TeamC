# Tasks: Platform foundation on Supabase (SYS)

**Input**: Design documents from `/specs/003-sys-core/` — [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Prerequisites**: plan.md (decisions D1–D9), research.md (R1–R16, Open questions 1–15)

**Tests**: Required. Constitution Principle II and the request for this feature: the test of every business rule (BR-001..BR-005) and every acceptance scenario (US-1..US-4) is written and seen failing **before** the code that makes it pass. Each implementation task names the test task it turns green. `npm test` stays offline: Supabase code is tested with a fake client; real RLS behaviour is checked online by `npm run check:supabase` (D1).

**Organization**: The three slices of plan.md: Phase 3 = slice 1 (shared data + RLS, US-2 data layer), Phase 4 = slice 2 (accounts and roles, US-1 + US-2), Phase 5 = slice 3 (language, notifications, account, terms: US-3, US-4, plus the BR-003 / BR-005 parts of US-1 / US-2). Closing work is cross-cutting (Phase 6); FR-011 is **deferred** (plan.md Complexity Tracking).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[US1]..[US4]**: user story of spec.md (US-1 sign-up, US-2 role-filtered data, US-3 language, US-4 notifications)
- Paths are relative to the repository root (single Next.js project, plan.md §Project Structure)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Repository hygiene, environment names and the two allowed libraries.

- [X] T001 Add `supabase/.temp/` to .gitignore before anything under `supabase/` is staged (research R15; Constitution IV)
- [X] T002 [P] Replace `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` with `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` (server only, no `NEXT_PUBLIC_`), add empty `RESEND_API_KEY` and `EMAIL_FROM`, and document `SUPABASE_DB_URL` as *export in the terminal only, never in a file*, in .env.example — every value empty (research R15, D6)
- [ ] T003 *(partly done: the three libraries, `check:supabase`, `seed:supabase`, `test:rls`; `check:i18n`, `prebuild`, `send-emails`, `anonymise` wait for their slice-3 scripts T053, T059, T064)* Install `@supabase/supabase-js`, `@supabase/ssr` and `pg` (seed loader, plan.md Complexity Tracking) and add the npm scripts `check:supabase` (`node --env-file=.env scripts/check-supabase.mjs`), `seed:supabase`, `check:i18n`, `prebuild` (runs `check:i18n`), `send-emails`, `anonymise` in package.json (`embed` deferred with FR-011) (contracts/scripts.contract.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: One `lib/db/` API over two sources, the Supabase clients and the session, which every slice uses (D4, research R6, R9).

**⚠️ CRITICAL**: No user-story work can begin until this phase is complete. Tests T004–T006 are written and seen failing before T007–T011.

### Tests for Phase 2 (write first, see them fail) ⚠️

- [X] T004 [P] Create unit test for source selection: `dataSource()` is `sqlite` with no `NEXT_PUBLIC_SUPABASE_URL` and `supabase` when it is set; the test runner never selects Supabase (D4, contracts/data-layer.contract.md) in tests/unit/data-source.test.js
- [X] T005 [P] Create unit test for secret-key isolation: `lib/supabase/admin.js` throws when loaded with a `window` global; no `'use client'` file and no file under `app/` imports `lib/supabase/admin.js`; no `NEXT_PUBLIC_` variable name contains `SECRET`; .env.example has empty values and none of the old `ANON_KEY` / `SERVICE_ROLE_KEY` names (research R15, BR-004, Constitution IV) in tests/unit/secret-key-isolation.test.js
- [X] T006 [P] Create unit test for `getSession()`: on the sqlite source the mock (`x-mock-role`, `MOCK_AUTH_DEFAULT_ROLE`, `MOCK_STAFF_USER_ID`) still works; on the Supabase source (fake client) `x-mock-role` is ignored, the role comes from the `user_account` row of `auth.getUser()`, a deactivated account is a guest, no session is a guest (FR-004, BR-005, research R6) in tests/unit/session-supabase.test.js

### Implementation for Phase 2

- [X] T007 Implement `dataSource()` in lib/db/source.js (verifies T004)
- [X] T008 Implement `lib/supabase/server.js` (`@supabase/ssr`, request cookies, publishable key), `lib/supabase/browser.js` (publishable key) and `lib/supabase/admin.js` (secret key, throws in a browser), plus a test seam to inject fake clients in lib/supabase/testing.js (verifies T005)
- [X] T009 Move the current `node:sqlite` implementations of `lib/db/locations.js`, `search.js`, `location-detail.js`, `nearby.js`, `contacts.js`, `queries.js`, `admin-locations.js`, `audit.js`, `client.js` into lib/db/sqlite/, and make the public lib/db/*.js modules `async` façades that delegate through `dataSource()`; add `await` at every caller in app/ (pages and Route Handlers) (D4, research R9)
- [X] T010 Add `await` to the existing tests that call the now-async `lib/db/` functions — mechanical, no assertion changed — in tests/unit/contact-rls.test.js, contact-verification.test.js, nearby-locations.test.js, published-filter.test.js, province-mapping.test.js, query-logging.test.js, tests/foundational/seed-verification.test.js and the admin contract tests (research R9)
- [X] T011 Make `getSession()` async with the Supabase and mock branches in lib/auth/session.js and add the `@supabase/ssr` session-refresh middleware in middleware.js (verifies T006; keeps every existing test green)

**Checkpoint**: `npm test` green on the sqlite source; the same API can be backed by Supabase.

---

## Phase 3: Slice 1 — Shared data and RLS (US-2 data layer, Priority: P1) 🎯 MVP

**Goal**: The 46 tables on Supabase with RLS on every table, explicit grants, the Auth link, the database rules, the text index (FR-011 vector index deferred), the seed and the online check (FR-004, FR-010, BR-001, BR-002, BR-004, D1–D3, D9).

**Independent Test**: [quickstart.md](quickstart.md) Slice 1 — `npm test` (static migration checks), `npx supabase db push`, `node scripts/seed-supabase.mjs --reset`, `npm run check:supabase` → `authority_contact` 0 rows for the publishable key, ≥ 1 for the secret key (US-2 Scenario 1).

### Tests for Slice 1 (write first, see them fail) ⚠️

- [X] T012 [P] [US2] Create static test of the generated schema migration: the 46 tables of data/schema/schema-summary.json appear once, with the same columns, types, constraint names and CHECK text as data/schema/schema-*.sql, and every foreign key is an `ALTER TABLE … ADD CONSTRAINT` with its original name (research R1) in tests/unit/migrations-schema.test.js
- [X] T013 [P] [US2] Create static RLS coverage test: `ENABLE ROW LEVEL SECURITY` on all 46 tables; no `DELETE` grant or policy; `anon` granted `SELECT` only on `province`, `location`, `location_image`, `legal_rule`, `organisation`; column grants only `notification.read_at` and `profile.full_name, crew_role, locale`; every (entity, operation) of data/02-crud-matrix.md whose actor in docs/function-list.md is a human role has a policy for that role (with `admin` inheriting, D5), an RPC of data-model §5, or a *Deferred* entry citing Open question 1, 13, 14 or 15 (BR-001, FR-004, data-model §3–§4) in tests/unit/rls-coverage.test.js
- [X] T014 [P] [US2] Create static test of the Auth link migration: the `auth.users` insert trigger sets `role` to the literal `'member'` and reads no role, status or id from `raw_user_meta_data` (BR-002); it creates `producer_organisation`, `profile` and `consent` only when all FR-001 metadata is present (BR-003); an update trigger keeps `email_verified` and `email` in step; no migration has a password, hash or token column (BR-004) in tests/unit/auth-link-sql.test.js
- [X] T015 [P] [US2] Create static test of the rules migration: PostgreSQL `trg_location_publish_needs_contact` and `trg_audit_log_append_only` with the same messages as lib/db/local-triggers.sql; every function of data-model §5 checks `app.has_role(...)` (or the caller's own id) and writes its audit row in the same function, including `app_grant_role` → `role.grant` (BR-002) and `app_deactivate_my_account` (BR-005); `app_anonymise_deactivated` replaces name and email (BR-005) in tests/unit/rules-sql.test.js
- [X] T016 [P] [US2] Create static test of the search-index migration: `unaccent` with an `IMMUTABLE` `app.f_unaccent`; GIN indexes over `location` (`name_vi`, `name_en`, `desc_vi`, `desc_en`) and `organisation_member_layer` (`capability_desc_vi`, `capability_desc_en`); RPC `app_search_locations` returns published locations only; no `vector` extension, `embedding` column, HNSW index or `app_match_locations` (FR-011 deferred, 02/11/2026); every multi-schema `SET search_path` in the migrations is unquoted; the file is separate from the schema migration (FR-010, D9) in tests/unit/search-index-sql.test.js
- [X] T017 [P] [US2] Create unit test of the seed plan (pure functions): the guard accepts the `cinematch-dev` ref in pooler (`postgres.<ref>@…`) and direct (`db.<ref>.supabase.co`) URLs and refuses any other ref unless `--force`; the URL is masked in every message; seed users whose email is in the Auth list are re-keyed in all 20 columns that reference `user_account`, keeping their seed role; the SQL disables then re-enables `trg_location_publish_needs_contact`; a non-empty database without `--reset` is refused; `--reset` never touches `auth.*` (research R7, D3) in tests/unit/seed-plan.test.js
- [X] T018 [P] [US2] Create unit test of the Supabase check with fake clients: PASS when the publishable key is refused by GRANT (42501) or reads 0 rows of `authority_contact`, `profile`, `consent`, `audit_log` (the line says which), exact counts of `province` (≥ 1) and of `location` (= published in the seed), and the secret key reads ≥ 1 `authority_contact`; FAIL otherwise; refuses when the keys look swapped; never prints a key (BR-001, US-2 Scenario 1, research R8) in tests/unit/check-supabase.test.js
- [X] T019 [P] [US2] Create contract test of the Supabase data source with a fake client: `getAuthorityContact` returns nothing for a guest without a query and the verified contact for a member (US-2 Scenarios 1–2); public location reads ask for published rows; admin writes call `app_admin_*` RPCs with the right arguments; database messages map to `UNVERIFIED_CONTACT` and `FORBIDDEN` like the sqlite source (D4, research R4, R9, contracts/data-layer.contract.md) in tests/contracts/data-layer-supabase.test.js
- [X] T071 [P] [US2] Create the online RLS suite run by `npm run test:rls` (`node --env-file=.env --test tests/rls/*.test.js`, never part of `npm test`, D1): publishable key reads 0 rows of `authority_contact` while the secret key reads some (BR-001, US-2 Scenario 1); 0 rows of `profile`, `consent`, `audit_log` for anon; a signed-in member reads verified contacts (US-2 Scenario 2) but no `organisation_private_layer` without an accepted request and NDA; a new account is `member` even when its metadata claims `admin`, and cannot change its own role (BR-002); sign-up stores the consent with its version and time (BR-003); fixtures made with the admin API and removed afterwards, in tests/rls/rls.test.js

### Implementation for Slice 1

- [X] T020 [US2] Write the policy source (table, operation, roles, row condition; deferred entries with their open question) from data-model §3–§4 in tools/rls_policies.py (BR-001, FR-004, D5)
- [X] T021 [US2] Implement the generator writing supabase/migrations/20261101000100_schema.sql and supabase/migrations/20261101000300_grants_rls.sql with a `--check` mode in tools/build_supabase.py (research R1, R3; verifies T012, T013)
- [X] T022 [P] [US2] Write schema `app`, `app.current_role()`, `app.has_role()`, `app.is_project_member()` and the `auth.users` triggers in supabase/migrations/20261101000200_auth_link.sql (research R2, R5; BR-002, BR-003, BR-004; verifies T014)
- [X] T023 [P] [US2] Write the BR-004 publish trigger, the append-only audit trigger and the functions of data-model §5 in supabase/migrations/20261101000400_rules.sql (research R4, R12; BR-002, BR-005, M10 BR-005; verifies T015)
- [X] T024 [P] [US2] Write the FR-010 physical additions and RPC (FR-011 removed 02/11/2026, deferred) in supabase/migrations/20261101000500_search_indexes.sql (research R13, R14; verifies T016)
- [X] T025 [US2] Implement the pure seed plan in scripts/lib/seed-plan.mjs and the loader (`pg` client from `SUPABASE_DB_URL`, one parameterless `client.query` for the whole block, `ROLLBACK` on error, `--reset`, `--force`; changed 02/11/2026 from `npx supabase db query`) in scripts/lib/seed-db.mjs and scripts/seed-supabase.mjs (research R7; verifies T017)
- [X] T026 [US2] Implement the online check in scripts/check-supabase.mjs (research R8; verifies T018)
- [X] T027 [US2] Implement the Supabase versions of every public `lib/db/` function in lib/db/supabase/ (user client for reads, RPC for atomic writes, admin client for System work) (D2, D4; verifies T019)
- [X] T028 [US2] Apply slice 1 to `cinematch-dev` — `npx supabase db push --db-url "$SUPABASE_DB_URL"`, *Add user* for some seed emails, `node scripts/seed-supabase.mjs --reset`, `npm run check:supabase`, the M3 pages with `NEXT_PUBLIC_SUPABASE_URL` set — and record the results in specs/003-sys-core/quickstart.md §Results (US-2 Scenarios 1–2, SC-002) — done 02/11/2026, see §Results

**Checkpoint**: The database refuses guests the sensitive tables (BR-001) and the whole app runs on Supabase or offline.

---

## Phase 4: Slice 2 — Accounts and roles (US-1, US-2, Priority: P1)

**Goal**: Sign-up with company details and terms, email verification, sign-in with `next`, password reset, roles read from the database (FR-001..FR-004, BR-002..BR-005; SC-04, SC-06, SC-07).

**Independent Test**: [quickstart.md](quickstart.md) Slice 2 — sign up, verify, sign in as member and see the contact; repeat the email → *already has an account*; reset a password; the seeded `vfda_staff` opens SC-35 with no `x-mock-role`.

### Tests for Slice 2 (write first, see them fail) ⚠️

- [X] T029 [P] [US1] Create unit test of the sign-up validator: `full_name` 1–120, email ≤ 254, password 10–72, `org_name` 1–200, `country` ISO alpha-2, `crew_role` enum, `website` ≤ 300 optional, terms ticked; all errors at once (FR-001, research R16) in tests/unit/signup-input.test.js
- [X] T030 [P] [US1] Create contract test of `POST /api/auth/sign-up` with a fake Supabase Auth: 201 `verification_sent`, `signUp` metadata holds the FR-001 fields and the current `consent_version` but never the password or a role (US-1 Scenario 1, BR-002, BR-003, BR-004); a repeated email (no identities) → 409 `EMAIL_TAKEN` and one account (US-1 Scenario 3); invalid body → 422 with `fields`; a `role` in the body is ignored (BR-002); the verification link returns to a safe `next` (SC-04, SR-025) in tests/contracts/auth-signup.test.js (fake client: tests/contracts/auth-fakes.js)
- [X] T031 [P] [US1] Create contract test of `GET /auth/callback`: a valid link starts the session and redirects to `/locations` (interim for SC-02, Open question 2) (US-1 Scenario 2); an expired link → `/login?error=link_expired`; an external `next` is refused (FR-002) in tests/contracts/auth-callback.test.js
- [X] T032 [P] [US2] Create contract test of sign-in, sign-out and resend: 200 with a safe internal `next`; 401 `INVALID_CREDENTIALS` with one identical body for unknown email and wrong password, never repeating the email or Supabase wording; 403 `ACCOUNT_DEACTIVATED` (BR-005) only with the right password; resend always 200; `safeNext` in lib/auth/next.js; the `/admin` gate keeps the query string in `next` (FR-002, SR-025, SC-04 edge cases) in tests/contracts/auth-signin.test.js
- [X] T033 [P] [US2] Create contract test of forgot and reset password: the same answer for a known and an unknown email (SR-211); no email for a deactivated account (SR-213); new password 10–72; expired or used link → 410 `LINK_EXPIRED`; other sessions signed out after a reset (FR-003, BR-004, BR-005, SR-221..224) in tests/contracts/auth-reset.test.js
- [X] T072 [P] [US2] Create unit test: `x-mock-role` sets the role only when `NODE_ENV=test` (ignored in development, production and when unset; `MOCK_AUTH_DEFAULT_ROLE` unchanged for development); `npm test` runs with `NODE_ENV=test`; the admin API and `/admin` gate refuse a request that only carries the header outside tests (FR-004, BR-002, research R6; decided 02/11/2026) in tests/unit/mock-role-env.test.js
- [X] T034 [P] [US2] Create contract test of database roles: with a Supabase session the admin API and SC-35 accept only `vfda_staff` from `user_account` (and `admin`, D5) and ignore `x-mock-role`; the SC-16 contact block shows the contact to a signed-in member and the sign-up prompt to a guest (FR-004, US-2 Scenarios 1–2, BR-001) in tests/contracts/auth-roles.test.js

### Implementation for Slice 2

- [X] T035 [US1] Implement the sign-up validator in lib/auth/signup-input.js (verifies T029)
- [X] T036 [US1] Implement `POST /api/auth/sign-up` in app/api/auth/sign-up/route.js (contracts/auth-and-account.contract.md; verifies T030)
- [X] T037 [US1] Implement the verification callback in app/auth/callback/route.js (verifies T031)
- [X] T038 [US2] Implement `POST` sign-in, sign-out and resend-verification in app/api/auth/sign-in/route.js, app/api/auth/sign-out/route.js and app/api/auth/resend-verification/route.js (verifies T032)
- [X] T039 [US2] Implement forgot and reset password in app/api/auth/forgot-password/route.js and app/api/auth/reset-password/route.js (verifies T033)
- [X] T073 [US2] Honour `x-mock-role` only when `NODE_ENV=test` in lib/auth/session.js and run `npm test` with `NODE_ENV=test` (cross-platform) in package.json (verifies T072)
- [X] T040 [US2] Use `getSession()` in lib/api/admin.js, app/admin/locations/page.js and app/locations/[slug]/page.js, with redirects to `/login?next=<path>` (verifies T034)
- [X] T041 [US1] Build SC-04 (sign-up and log-in tabs, all FR-001 fields, terms box linking SC-43, *already has an account*, *Resend email* locked 60 s) in app/signup/page.js and app/login/page.js (docs/screens/screen-spec-SC-04.md)
- [X] T042 [P] [US2] Build SC-06 and SC-07 in app/forgot-password/page.js and app/reset-password/page.js (docs/screens/screen-spec-SC-06.md, SC-07.md)
- [X] T043 [US1] Run quickstart Slice 2 steps 2–7 on `cinematch-dev` and record the results in specs/003-sys-core/quickstart.md §Results (US-1 Scenarios 1–3, US-2 Scenarios 1–2) — done 02/11/2026 with temporary accounts (links made by `admin.generateLink`, not emailed; role `vfda_staff` set by the System client); real email delivery belongs to FR-008 (T057, T059)

**Checkpoint**: Real accounts replace the mock whenever Supabase is configured.

---

## Phase 5: Slice 3 — Language, notifications, account, terms (US-3, US-4, Priority: P2)

**Goal**: Interface in Vietnamese or English from one dictionary (FR-005, FR-006), notifications and queued email (FR-007..FR-009), *My account* with deactivation (BR-005), privacy and terms with versioned consent (BR-003); SC-08, SC-09, SC-42, SC-43.

**Independent Test**: [quickstart.md](quickstart.md) Slice 3 — switch to EN and back with the scroll kept; `notify()` → one notification + one queued email; SC-09 newest first with unread count; deactivate an account; privacy and terms show the current version in both languages.

### Tests for Slice 3 (write first, see them fail) ⚠️

- [ ] T044 [P] [US3] Create unit test of the dictionary check: messages/vi.json and messages/en.json have the same keys and no empty value; a key used in code but missing fails `scripts/check-i18n.mjs` (FR-006, contracts/i18n.contract.md) in tests/unit/i18n-dictionary.test.js
- [ ] T045 [P] [US3] Create unit test of the locale: cookie `locale` first, then `Accept-Language`, then `vi`; `setLocale` writes the cookie and, for a signed-in user, `profile.locale` (FR-005, US-3 Scenario 1, Open question 7) in tests/unit/i18n-locale.test.js
- [ ] T046 [P] [US3] Create unit test that SC-04, SC-06, SC-07, SC-08, SC-09, SC-42, SC-43, the site header and SC-14, SC-15, SC-16, SC-35 have no user-visible text outside `t()` (FR-006, SC-003, D7) in tests/unit/i18n-no-hardcoded.test.js
- [ ] T047 [P] [US4] Create unit test of `notify()` on both sources: one `notification` and one `email_delivery` (`queued`) per event, `event_type` and payload stored, no email for a deactivated recipient (FR-007, FR-008, SR-243) in tests/unit/notifications.test.js
- [ ] T048 [P] [US4] Create contract test of `GET /api/notifications` and `POST /api/notifications/read`: own notifications only, newest first, unread count, *mark read* changes only `read_at` (FR-009, US-4 Scenario 2, SR-241, SR-242) in tests/contracts/notifications.test.js
- [ ] T049 [P] [US4] Create unit test of the email sender with a fake `fetch`: `sent` + `provider_message_id`; provider rejection → `bounced`; network error → still `queued` with `_attempts` up to 3; no `RESEND_API_KEY` → nothing sent (FR-008, US-4 Scenario 1, D6, Open question 9) in tests/unit/email-sender.test.js
- [ ] T050 [P] [US2] Create contract test of the account: `GET /api/account` shows email and role read-only; `PATCH` accepts only `full_name`, `crew_role`, `locale`; deactivation needs `confirm: "DELETE"`, deactivates at once, signs out, and the account then has no access and cannot sign in (BR-005, SR-231..SR-234) in tests/contracts/account.test.js
- [ ] T051 [P] [US1] Create unit test of consent: one current `consent_version`; SC-42 and SC-43 show it in both languages; sign-up stores it with the time (BR-003, SR-251, SR-254, SR-261, Open question 10) in tests/unit/consent.test.js
- [ ] T052 [P] [US2] Create unit test of the anonymise script: it calls `app_anonymise_deactivated` with the secret key on the server only and reports how many accounts were anonymised (BR-005, research R12, Open question 4) in tests/unit/anonymise-script.test.js

### Implementation for Slice 3

- [ ] T053 [US3] Create messages/vi.json and messages/en.json and implement `t()`, `getLocale()`, `setLocale()` in lib/i18n/server.js and lib/i18n/client.js (verifies T045)
- [ ] T054 [US3] Implement the missing-key check in scripts/check-i18n.mjs, run by `prebuild` (verifies T044)
- [ ] T055 [US3] Build the site header (language switch, sign-in state, notification badge) in app/components/site-header.js and use it in app/layout.js (US-3, US-4)
- [ ] T056 [US3] Move every user-visible string of SC-04, SC-06, SC-07, SC-14, SC-15, SC-16 and SC-35 to the dictionary (app/signup, app/login, app/forgot-password, app/reset-password, app/locations, app/locations/match, app/locations/[slug], app/admin/locations) (D7; verifies T046 for those screens)
- [ ] T057 [US4] Implement `notify`, `listNotifications`, `unreadCount`, `markRead` for both sources in lib/db/notifications.js, lib/db/sqlite/notifications.js and lib/db/supabase/notifications.js (verifies T047)
- [ ] T058 [US4] Implement `GET /api/notifications` and `POST /api/notifications/read` in app/api/notifications/route.js and app/api/notifications/read/route.js (verifies T048)
- [ ] T059 [US4] Implement the queue and the Resend sender in lib/email/queue.js, lib/email/resend.js and scripts/send-emails.mjs (verifies T049)
- [ ] T060 [US4] Build SC-09 in app/notifications/page.js (docs/screens/screen-spec-SC-09.md)
- [ ] T061 [US2] Implement `getAccount`, `updateProfile`, `deactivateMyAccount` in lib/db/accounts.js (both sources) and the routes in app/api/account/route.js and app/api/account/deactivate/route.js (verifies T050)
- [ ] T062 [US2] Build SC-08 in app/account/page.js (docs/screens/screen-spec-SC-08.md; typed `DELETE` confirmation)
- [ ] T063 [US1] Implement `currentConsentVersion`, `getConsents`, `acceptConsent` in lib/db/consent.js and build SC-42 and SC-43 in app/privacy/page.js and app/terms/page.js (verifies T051)
- [ ] T064 [US2] Implement scripts/anonymise.mjs (verifies T052)
- [ ] T065 [US3] Run quickstart Slice 3 steps 2–7 on `cinematch-dev` and record the results in specs/003-sys-core/quickstart.md §Results (US-3 Scenario 1, US-4 Scenarios 1–2)

**Checkpoint**: All four user stories work on Supabase; the offline suite is green.

---

## Phase 6: Cross-cutting — semantic index (FR-011, deferred) and closing

**F-SYS-11 / FR-011 is deferred** (Nam Tran, 02/11/2026): F-SYS-11 is a *Could*, its only consumer F-M4-07 belongs to M4, and the embedding model and vector dimension are SYS spec open question 3, still unanswered; the first `db push` also failed on `app_match_locations` (quoted `search_path`). T066–T068 stay open and are not done in this feature; they return when open question 3 is answered (plan.md Complexity Tracking).

- [ ] T066 [P] **Deferred (FR-011).** Create unit test of the embedding script with a fake Gemini client and a fake Supabase admin client: 768 numbers per vector, only rows whose text changed, location and partner texts as in research R14, secret key on the server only (FR-011, D8) in tests/unit/embed-search.test.js
- [ ] T067 **Deferred (FR-011).** Implement scripts/embed-search.mjs (verifies T066)
- [ ] T068 **Deferred (FR-011).** Choose the Gemini embedding model with `models.list` (768-dimension output), run `npm run embed` on `cinematch-dev`, query `app_match_locations`, and write the model name into specs/003-sys-core/research.md R14 and Open question 11 (FR-011)
- [ ] T069 Run `npm test`, `npm run build`, `python3 tools/build_supabase.py --check`, `npm run check:i18n`, `uv run tools/start_feature.py --check` and `npm run check:supabase`, and record them in specs/003-sys-core/quickstart.md §Results
- [ ] T070 Add the build-log entry and the AI-use-log row, and record the spec issues of research Open questions 1–15 in docs/build/build-log.md §3 and docs/ai-use-log.md

---

## Traceability: rule or scenario → test → code

| Rule / scenario | Test (written first) | Code that turns it green |
|---|---|---|
| BR-001 — sensitive data filtered by RLS | T013, T018, T019, T034 | T020, T021, T026, T027, T040 |
| BR-002 — new account always `member`; grants by admin, audited | T014, T015, T030 | T022, T023, T036 |
| BR-003 — consent with version and time | T014, T030, T051 | T022, T036, T063 |
| BR-004 — passwords and tokens only in Supabase Auth | T005, T014, T030, T033 | T008, T022, T036, T039 |
| BR-005 — deactivated = no access, anonymised, never deleted | T006, T015, T032, T033, T050, T052 | T011, T023, T038, T039, T061, T064 |
| US-1 Scenario 1 — sign-up creates an unverified member | T029, T030 | T035, T036, T041 |
| US-1 Scenario 2 — verification starts the session as member | T031 | T037 |
| US-1 Scenario 3 — duplicate email refused | T030 | T036 |
| US-2 Scenario 1 — guest gets 0 contact rows | T013, T018, T019, T034 | T021, T026, T027, T040 |
| US-2 Scenario 2 — member gets published contacts | T019, T034 | T027, T040 |
| US-3 Scenario 1 — switch language, keep scroll, remember | T044, T045, T046 | T053, T054, T055, T056 |
| US-4 Scenario 1 — one in-app notification and one email | T047, T049 | T057, T059 |
| US-4 Scenario 2 — newest first with unread count | T048 | T058, T060 |
| FR-010 — accent-insensitive index | T016 | T024, T027 |
| FR-011 — semantic index | **Deferred**: T016 checks it is absent; T066 deferred | T067, T068 deferred |

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1** → **Phase 2** (blocks everything) → **Phase 3** (slice 1) → **Phase 4** (slice 2: needs the Auth link, roles and RLS of slice 1) → **Phase 5** (slice 3: needs sessions of slice 2) → **Phase 6**.
- Online tasks T028, T043, T065 (and T068 when FR-011 returns) need `cinematch-dev`, the three variables in `.env` and `SUPABASE_DB_URL` exported in the terminal.

### Within each phase

- Every test task of a phase is written and seen failing before any implementation task of that phase.
- Phase 2: T007 → T008 → T009 → T010 → T011 (T009 changes the API that T010 and T011 rely on).
- Phase 3: T020 → T021; T022, T023, T024 in parallel; T025, T026 after their tests; T027 after T021–T024 (RPC names); T028 last.
- Phase 4: T035 → T036; T037–T039 after T011; T040 after T027; pages T041, T042 after their routes; T043 last.
- Phase 5: T053 → T054 → T055 → T056; T057 → T058 → T060; T059 after T057; T061 → T062; T063 after T053 (both languages); T065 last.

---

## Parallel Opportunities

- **Phase 2 tests**: T004, T005, T006.
- **Slice 1 tests**: T012–T019 and T071 (nine files; T071 runs online with `npm run test:rls`); **code**: T022, T023, T024 together.
- **Slice 2 tests**: T029–T034 (six files).
- **Slice 3 tests**: T044–T052 (nine files).
- **Phase 6**: T066–T068 deferred with FR-011; T069–T070 close the feature.

### Example: start of slice 1

```text
Task: "T012 [P] [US2] schema migration static test in tests/unit/migrations-schema.test.js"
Task: "T013 [P] [US2] RLS coverage test in tests/unit/rls-coverage.test.js"
Task: "T014 [P] [US2] Auth link SQL test in tests/unit/auth-link-sql.test.js"
Task: "T015 [P] [US2] rules SQL test in tests/unit/rules-sql.test.js"
Task: "T016 [P] [US2] search index SQL test in tests/unit/search-index-sql.test.js"
Task: "T017 [P] [US2] seed plan test in tests/unit/seed-plan.test.js"
Task: "T018 [P] [US2] Supabase check test in tests/unit/check-supabase.test.js"
Task: "T019 [P] [US2] Supabase data source contract test in tests/contracts/data-layer-supabase.test.js"
```

---

## Implementation Strategy

### MVP: slice 1 (Phases 1–3)

1. Phase 1 (T001 first: protect `supabase/.temp/`).
2. Phase 2: tests T004–T006 red → T007–T011 green.
3. Phase 3: tests T012–T019 red → T020–T027 green → T028 online.
4. **STOP and VALIDATE**: `npm run check:supabase` passes; the M3 pages run on Supabase; guests get no contact (US-2 Scenario 1, SC-002).

### Then

5. Slice 2 (Phase 4) → validate with quickstart Slice 2.
6. Slice 3 (Phase 5) → validate with quickstart Slice 3.
7. Phase 6.

### Before merging

Answer or confirm the interim choices of research Open questions 1–15; a teammate reviews the pull request (Constitution Principle V). T010 edits existing test files mechanically (`await` only) — the reviewer checks no assertion changed.
