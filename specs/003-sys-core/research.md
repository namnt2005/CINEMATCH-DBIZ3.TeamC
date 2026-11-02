# Research: Platform foundation on Supabase (SYS)

Feature: `003-sys-core` · Date: 2026-11-01 · Input: [plan.md](plan.md), [spec.md](spec.md), `data/schema/schema-*.sql`, `data/02-crud-matrix.md`, `data/data-model-SYS.md`, `docs/function-list.md`, `docs/screens/screen-spec-SC-04/06/07/08/09/42/43.md`, `supabase/.temp/` (linked project), Supabase CLI 2.122 help.

Decisions D1–D9 were taken by Nam Tran on 01/11/2026 (see [plan.md](plan.md)). Points the spec does not settle are listed under **Open questions** with a reversible interim choice.

## R1. Migrations generated from `data/schema/`

- **Decision**: `tools/build_supabase.py` turns the nine `data/schema/schema-*.sql` files into `supabase/migrations/20261101000100_schema.sql`: first every `CREATE TABLE` with its columns, primary key, unique and CHECK constraints unchanged, then every foreign key as `ALTER TABLE … ADD CONSTRAINT <same name> FOREIGN KEY …`. Table names, column names, types, constraint names and CHECK expressions are kept byte-for-byte. It also writes `…000300_grants_rls.sql` from `tools/rls_policies.py` (R3). The other three migrations (auth link, rules, search indexes) are hand-written SQL.
- **Rationale**: the schema is already portable SQL tested on PostgreSQL 16 (`load_check.py --postgres`). SQLite accepts a foreign key to a table created later; PostgreSQL does not, and the modules reference each other in cycles (M0 ↔ M3, M4 ↔ M5), so no file order works; adding the foreign keys after all tables does. Generating keeps one source of truth: a change in `data/` is a regenerate away from SQL.
- **Checks**: a static test compares the generated tables, columns and CHECKs with `data/schema/schema-summary.json` (46 tables, counts per module).
- **Alternatives considered**: `supabase db diff` from a local database (no Docker or local Postgres here); hand-copying the schema (drifts).

## R2. Role model in the database

- **Decision**: a private schema `app` (not exposed through the API) holds:
  - `app.current_role()` — `STABLE SECURITY DEFINER`: the `role` of `user_account` for `auth.uid()` when `account_status` is `active` (or empty); otherwise `guest`. A deactivated account therefore loses all access at once (BR-005).
  - `app.has_role(VARIADIC text[])` — true when the current role is one of them; `admin` also satisfies `vfda_staff` and `vfda_legal` (decision D5).
- **Rationale**: policies stay short and identical in form; the role is read from the database, never from the JWT or the client (FR-004 note *role set in the database, never from the client*).
- **Alternatives considered**: role in JWT custom claims (needs an Auth hook and goes stale until the next token); role checks repeated as sub-queries in every policy (hard to review).

## R3. Policies from the CRUD matrix

- **Decision**: `tools/rls_policies.py` lists every policy as *(table, operation, roles, row condition)*. Actors of `docs/function-list.md` map to roles: **Guest** → `anon` and every signed-in role; **Member** → `member`; **User** → any active signed-in role; **Partner** → `partner`; **VFDA Staff** → `vfda_staff` (+ `admin`); **VFDA Legal** → `vfda_legal` (+ `admin`); **Admin** → `admin`; **System** → no policy (secret key, D2); **Province** → no role exists (Open question 1). Row conditions come from the module rules (owner or recipient, project membership, published only, NDA accepted…) and are tabulated in [data-model.md](data-model.md) §3.
- **Static coverage test**: every (entity, operation) whose actor is a human role in `data/02-crud-matrix.md` has a policy for that role; every one of the 46 tables has `ENABLE ROW LEVEL SECURITY`; no table has a `DELETE` grant or policy; derived entities (views) are listed apart.
- **Rationale**: 46 tables × 6 roles × 4 operations; the generator keeps the SQL and the matrix in step, and the test fails when the matrix gains a row without a policy.

## R4. The *System* actor and atomic multi-writes (D2)

- **Decision**: System work runs on the server with `lib/supabase/admin.js` (secret key; the module throws if imported in a browser bundle). Actions that must commit together with an audit row are Postgres functions (`SECURITY DEFINER`, fixed `search_path`) called with the **user's** client: `app_admin_publish_location`, `app_admin_unpublish_location`, `app_admin_save_location`, `app_admin_save_contact`, `app_admin_verify_contact`, `app_grant_role` (BR-002), `app_deactivate_my_account` (BR-005). Each checks `app.has_role(...)` first.
- **Rationale**: PostgREST runs one statement per request, so two client calls cannot share a transaction (M10 BR-005). Running as the user keeps `audit_log.admin_id = auth.uid()` truthful.
- **Alternatives considered**: audit trigger reading `current_setting('app.user_id')` (works only inside a function anyway); secret-key server calls for admin actions (loses the user identity in RLS).

## R5. Linking `auth.users` to `user_account` (D3)

- **Decision**: migration `…000200_auth_link.sql`:
  - `AFTER INSERT ON auth.users` → insert `user_account (user_id = NEW.id, email, email_verified = NEW.email_confirmed_at IS NOT NULL, role = 'member', account_status = 'active', created_at = now())`. The role is a literal: nothing from `raw_user_meta_data` can set it (BR-002). When the metadata holds the sign-up fields of FR-001 (`full_name`, `crew_role`, `org_name`, `country`, optional `website`, `locale`, `consent_version`), the same transaction inserts `producer_organisation`, `profile` and `consent (accepted_at = now())` (BR-003); otherwise only `user_account` is created (accounts made with *Add user*).
  - `AFTER UPDATE OF email_confirmed_at, email ON auth.users` → keep `email_verified` and `email` in step.
- **Duplicate email (US-1 Scenario 3)**: with email confirmation on, Supabase answers a repeated sign-up with a user that has no identities instead of an error; the sign-up route treats `identities.length === 0` as *This email already has an account — Log in?* and no second row is created (unique `email`).
- **Alternatives considered**: create profile rows from the app after `signUp` with the secret key (two steps, can half-fail); FK to `auth.users` (rejected, D3).

## R6. Sessions and the mock role

- **Decision**: `lib/auth/session.js` exposes `async getSession()`:
  - Supabase source: `@supabase/ssr` server client from the request cookies, `auth.getUser()` (validated by Supabase, not just the cookie), then the `user_account` row → `{ role, isAuthenticated, userId, status }`. A deactivated account is signed out and treated as a guest (BR-005).
  - `node:sqlite` source: the current mock (`x-mock-role`, `MOCK_AUTH_DEFAULT_ROLE`, `MOCK_STAFF_USER_ID`) unchanged, so the offline tests keep working.
  - **`x-mock-role` is ignored whenever Supabase is configured.**
  - **Changed 02/11/2026 (Nam Tran):** on the sqlite source too, `x-mock-role` counts only when `NODE_ENV=test` (`npm test`); `next dev`, `next start` and production ignore it. `MOCK_AUTH_DEFAULT_ROLE` (development only) is unchanged (tasks T072, T073).
- `middleware.js` refreshes the Supabase session cookies (`@supabase/ssr` pattern). `next` after sign-in accepts internal paths only (FR-002 note).

## R7. Seed loader `scripts/seed-supabase.mjs`

- **Decision**:
  1. Reads `SUPABASE_DB_URL` from the environment only (exported in the terminal; the script never writes it anywhere and masks it in every message).
  2. **Guard**: the project ref in the URL (user `postgres.<ref>` of the pooler, or host `db.<ref>.supabase.co`) must equal `supabase/.temp/project-ref`, and `supabase/.temp/linked-project.json` must name `cinematch-dev`; otherwise it stops unless `--force` is given.
  3. Connects with `pg` (node-postgres) from `process.env.SUPABASE_DB_URL` (TLS without chain verification, as Supabase signs with its own root CA) and reads `auth.users (id, email)` and whether the application tables hold data.
  4. Builds one SQL transaction from `data/seed/NN_<table>.csv` in filename order, replacing each seed `user_id` whose email exists in `auth.users` by the Auth id **in `user_account.user_id` and the 19 foreign-key columns that reference it** (20 columns over 8 schema files). The seed role of that email is applied, which is how the test accounts get `vfda_staff`, `partner`, … (the sign-up trigger had made them `member`). Rows already created by the trigger for those ids are replaced inside the transaction.
  5. Disables `trg_location_publish_needs_contact` during the load (the seed inserts published locations before their contacts) and re-enables it before `COMMIT`.
  6. Refuses to run on a non-empty database unless `--reset`, which first truncates the 46 application tables (never `auth.*`).
  7. Runs the whole `BEGIN … COMMIT` block as **one parameterless `client.query(sql)`** (simple query protocol, several statements); on error sends `ROLLBACK` and prints the error with the URL and password masked. Changed 02/11/2026: the first version used `npx supabase db query -f`, which failed with *cannot insert multiple commands into a prepared statement*.
- **Alternatives considered**: `npx supabase db query` (first choice; runs SQL as a prepared statement, one command only); one CLI call per statement (loses the single transaction); `supabase db push --include-seed` (only seeds with migrations, cannot re-key ids).

## R8. `npm run check:supabase`

- **Decision**: `node --env-file=.env scripts/check-supabase.mjs` creates two clients with `@supabase/supabase-js`: publishable key → `authority_contact`, `profile`, `consent`, `audit_log` must give **nothing**: `anon` has no `GRANT` on them (T013), so the expected answer is *permission denied* (42501, printed "blocked by GRANT"); 0 rows ("0 rows by RLS") also passes; any readable row or any other error fails (BR-001, US-2 Scenario 1). Exact counts (`count: 'exact'`) of `province` and of `location` with no filter: the public locations must equal the published locations of `data/seed/21_location.csv` (9), so RLS alone does the filtering (BR-008). Secret key → `authority_contact` must have **at least one row** (the table is loaded, so the anon result is access control, not emptiness). Changed 02/11/2026 after the first online run reported the GRANT refusal as FAIL. Exit code 1 on any failure; keys are never printed.

## R9. Two-source `lib/db/` and `async` (D4)

- **Decision**: `lib/db/source.js` returns `supabase` when `NEXT_PUBLIC_SUPABASE_URL` is set and `sqlite` otherwise (tests force `sqlite`). Current implementations move to `lib/db/sqlite/`; `lib/db/supabase/` holds the same functions over `@supabase/supabase-js` (user client for reads under RLS, RPC for atomic writes, admin client for System work). The public modules keep their names and become `async`.
- **Consequence for tests**: test files that call `lib/db/` functions synchronously need `await`. This is a mechanical edit of existing tests (e.g. `contact-rls`, `contact-verification`, `nearby-locations`, `published-filter`, `province-mapping`, `query-logging`, `seed-verification`, admin contract tests); no assertion changes. Tests that use `getDb()` directly stay on the SQLite source.
- **Supabase source tests**: a fake Supabase client (records `from().select().eq()`, `rpc()` calls and returns fixtures) checks query shape and mapping offline.

## R10. Bilingual display dictionary (FR-005, FR-006, D7)

- **Decision**: `messages/vi.json` and `messages/en.json`, flat dotted keys (`signup.title`). `t(key, vars)` on the server and a client provider. The locale comes from the `locale` cookie (FR-005), defaulting from `Accept-Language`; a signed-in user's choice is also stored in `profile.locale`. Switching sets the cookie and calls `router.refresh()`, which keeps the scroll position (US-3). `scripts/check-i18n.mjs` (run by `prebuild` and by a test) fails when a key used in the code is missing in either file or when the two files differ (FR-006 *missing key fails the build*).

## R11. Notifications and email (FR-007, FR-008, FR-009, D6)

- **Decision**: `notify({ recipientId, eventType, payload })` (System, secret key) inserts one `notification` and one `email_delivery` (`queued`) per event (SC-09 SR-243). SC-09 reads the user's own notifications through RLS (`recipient_id = auth.uid()`), newest first, with an unread count; *mark as read* updates `read_at` (policy allows only `read_at`, via a column grant). The Resend sender (`lib/email/resend.js`, `fetch`) sends queued rows when `RESEND_API_KEY` and `EMAIL_FROM` are set, records `provider_message_id` and `sent`/`bounced`; otherwise rows stay `queued`.
- **Gap**: FR-008 retries up to 3 times, but `email_delivery` has no attempt counter (Open question 9).

## R12. Account deactivation (BR-005, SC-08)

- **Decision**: *Delete my account* (typing `DELETE`, SR-234) calls `app_deactivate_my_account()`: `account_status = 'deactivated'` at once (all policies stop matching through `app.current_role()`), then the server signs the user out everywhere with the admin API. `app_anonymise_deactivated()` replaces name, email and phone by anonymous values; run it with `npm run anonymise` until a schedule exists (Open question 4). Records the account created stay and show *Former member*.

## R13. Vietnamese text index (FR-010, D9)

- **Decision**: migration `…000500_search_indexes.sql` creates `unaccent`, an `IMMUTABLE` wrapper `app.f_unaccent(text)`, and GIN indexes on `to_tsvector('simple', app.f_unaccent(...))` over `name_vi`, `name_en`, `desc_vi`, `desc_en` of `location` and `capability_desc_vi`, `capability_desc_en` of `organisation_member_layer` (no new column). The Supabase search source calls an RPC `app_search_locations(q)` using that index; the SQLite source keeps `removeDiacritics`.

## R14. Semantic index (FR-011, D8, D9) — deferred 02/11/2026

- **Status**: **deferred** (plan.md Complexity Tracking). The text below is the design to resume from when SYS spec open question 3 (embedding model and dimension) is answered; nothing of it is in migration 500.
- **Design kept for later**: the same migration enables `vector`, adds `embedding VECTOR(768)` to `location` and `organisation_member_layer` as physical columns (outside the logical model, as `tools/dm_model2.py` records) with HNSW cosine indexes, and an RPC `app_match_locations(query_embedding, match_count)`. `scripts/embed-search.mjs` (server, secret key) embeds `desc_en` + `desc_vi` of locations and `capability_desc_en` + `capability_desc_vi` of partners with a Gemini embedding model at 768 dimensions; the exact model name is checked with `models.list` at implementation time and written back here. No screen uses it yet (its consumer F-M4-07 belongs to M4).

## R15. Environment and repository hygiene

- **Decision**: `.env.example` lists `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (empty), plus `RESEND_API_KEY`, `EMAIL_FROM` (empty, D6); the old `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are removed. `SUPABASE_DB_URL` is documented as *terminal only*, not listed with a value. `.gitignore` gains `supabase/.temp/`. The local `.env` still uses the old names: the owner renames them (the agent does not edit `.env`).

## R16. Sign-up validation

- **Decision**: a validator like `lib/admin/location-input.js` (no new library) checks FR-001: `full_name` ≤ 120, work email ≤ 254, password ≥ 10 and ≤ 72, `org_name` ≤ 200, `country` ISO 3166-1 alpha-2, `crew_role` enum, optional `website` ≤ 300, terms ticked with the current `consent_version`. SEQ-01 names Zod (Open question 3).

## Open questions

`[NEEDS CLARIFICATION]` items. None blocks `/speckit-tasks`; each has a reversible interim choice.

| # | Question | Interim choice | Owner |
|---|---|---|---|
| 1 | [NEEDS CLARIFICATION: F-M7-03 has the actor *Province*, which is not one of the six roles. How does a province officer update a `province_notice`?] | No policy; M7 slice decides (signed link handled by the server, or a role) | VFDA |
| 2 | [NEEDS CLARIFICATION: US-1 Scenario 2 lands on the segment router SC-02, which is not built yet.] | Redirect to `/locations` until SC-02 exists | Group C |
| 3 | [NEEDS CLARIFICATION: SEQ-01 validates with Zod; Zod is not an allowed library.] | Own validator (R16) | Group C |
| 4 | [NEEDS CLARIFICATION: what runs the 30-day anonymisation of BR-005 (pg_cron, Vercel cron, manual)?] | `npm run anonymise`, run by staff | Group C |
| 5 | [NEEDS CLARIFICATION: FR-010 does not say which entities are indexed (CRUD anomaly kind 4).] | `location` and `organisation_member_layer` | Group C |
| 6 | US-2 Scenario 1 names `location_authority_contacts`; the schema table is `authority_contact`. | Use `authority_contact` | Nam Tran |
| 7 | [NEEDS CLARIFICATION: is the locale stored in the cookie (FR-005) or in `profile.locale` (§6)? CRUD anomaly kind 4.] | Both: cookie always, profile for signed-in users | Group C |
| 8 | [NEEDS CLARIFICATION: role grants (BR-002) need an admin screen; none is listed in SYS.] | RPC `app_grant_role` + audit row; screen belongs to M10 | VFDA |
| 9 | [NEEDS CLARIFICATION: FR-008 retries up to 3 times, but `email_delivery` has no attempt counter.] | Count attempts in `variables._attempts`; physical column later if needed | Group C |
| 10 | Spec OQ 2 (Google / Apple sign-in), 4 (error branches of SEQ-01), 6 (reset link lifetime), 7 (which phone field BR-005 anonymises), 8 (email opt-out), 9 (event types), 11 (one consent version for both documents?), 12 (re-accept new terms?) stay open (numbers as of the spec of 02/11/2026, after question 5 was added). | Email + password only; edge cases as written; Supabase default link lifetime; no phone field anonymised; every notification emailed; event types `collab.response`, `province.reply`, `account.role_granted`; one `consent_version` for both documents; no re-acceptance | VFDA / Group C |
| 11 | The Gemini embedding model name (D8) is chosen at implementation from `models.list`. | Deferred with FR-011 (02/11/2026); same as spec open question 3 | Nam Tran |
| 12 | `supabase db query --db-url` receives the connection string as a command-line argument, visible in the local process list while it runs. | Resolved 02/11/2026 for the seed loader: it uses `pg` inside the process. Still applies to `npx supabase db push --db-url` | Group C |
| 13 | [NEEDS CLARIFICATION: no table links a `partner` account to its `organisation` (`organisation` has no user column), so partner writes (F-M4-01, 08, 14, 17; F-M5-06; moderation items) cannot be scoped to the partner's own rows.] | No partner write policy (least privilege); M4 slice adds the link through the data model | Group C (M4 owner) |
| 14 | `docs/function-list.md` gives F-M4-03 (member layer) the actor *Guest*, while `data/data-model-M4.md` names the policy `rls_org_member_layer_members` (members only). | Signed-in only, as the named policy says | M4 owner |
| 15 | ~~`document` has no project column~~ — wrong: `document.project_id` exists (composite foreign key to `document_slot`), missed by the first inventory. Resolved 01/11/2026. | `rls_document_project_members` = project members | — |
| 16 | [NEEDS CLARIFICATION: SC-04 does not say what sign-in shows for an account whose email is not verified yet.] | `403 EMAIL_NOT_VERIFIED` with *Resend* (Supabase reports it only after the right password, so it reveals nothing); decided by the agent 02/11/2026, to confirm | Group C |
| 17 | [NEEDS CLARIFICATION: the current `consent_version` is not written anywhere; SC-43 row 3 shows it.] | `2026.2`, the newest version in `data/seed` (account `park` re-consented to it), in `lib/db/consent.js` | VFDA Legal Board |
| 18 | [NEEDS CLARIFICATION: SC-04 rows 3 and 6 say full name 2–80 and organisation 2–120 characters; FR-001 and `data/schema` say `VARCHAR(120)` and `VARCHAR(200)`.] | The validator follows FR-001 and the schema (1–120, 1–200); fix SC-04 at its source `tools/s*_en.py` | Group C |
| 19 | Reset and verification links use PKCE: they work in the browser that asked for them; another browser shows *link expired*. Supabase Auth must list `<site>/auth/callback` and `<site>/reset-password` under *Redirect URLs*. | Accept; set the Redirect URLs in the Supabase dashboard of each environment | Nam Tran |
| 20 | BR-005 says name, email and phone are anonymised *within 30 days*; the owner asked (02/11/2026) that *Delete my account* deactivate **and** anonymise. | Done at once in the same request: `app_deactivate_my_account` (user, audited), sign-out everywhere, `app_anonymise_deactivated` and the Supabase Auth email replaced (`former-member-<id>@anonymised.example`), metadata cleared, identity banned (System client). There is no account phone field (spec Open question 7 stays open) | Nam Tran |
| 21 | SC-08 rows 5–7 make organisation, country and website editable, but `producer_organisation` has no user UPDATE policy and the contract allowed only `full_name`, `crew_role`, `locale`. | Followed SC-08: profile fields through the user client; organisation fields through the System client on the user's own `profile.producer_org_id` (found on the server) | Group C |
| 22 | The notification event types of the seed (`collab_request.*`, `province_notice.*`, `verification.expiring`, `consultation.reminder`) differ from the interim list of the contract (Open question 10 of this file). | SC-09 labels both sets from the dictionary; unknown types read *New notification*. The *Open* button is left out until SC-25, SC-32, SC-33 exist | Group C |
| 23 | SC-42 / SC-43 *Earlier versions*: the text of version `2026.1` (accepted in the seed) is not stored anywhere. | Only the current version's text is stored; asking for another shows the *does not exist* notice (SC-42 Error state) | VFDA Legal Board |
