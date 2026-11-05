# Quickstart: validate the platform foundation on Supabase (SYS)

Feature: `003-sys-core` · Contracts: [contracts/](contracts/) · Model: [data-model.md](data-model.md)

## Prerequisites

- Node.js 22+, `npm install` on branch `003-sys-core`; Python 3 for `tools/`.
- Offline parts need nothing else. Online parts need the `cinematch-dev` project (already linked: `supabase/.temp/`), and in `.env` (git-ignored) the three variables of `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`. **Rename** the old `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` in your `.env`.
- The database connection string is **never** saved in a file: `export SUPABASE_DB_URL='postgresql://…'` in the terminal you use for the steps below.

## Slice 1 — shared data and RLS (US-2, data layer)

| # | Step | Expected |
|---|---|---|
| 1 | `npm test` (no network, no Supabase variables) | all green, including the static migration tests: 46 tables, RLS on every table, no DELETE, a policy or RPC or deferred entry for every human (entity, operation) of the CRUD matrix |
| 2 | `python3 tools/build_supabase.py --check` | no difference with the committed migrations |
| 3 | `npx supabase db push --remote` | 5 migrations applied |
| 4 | Dashboard → Authentication → *Add user* for some seed emails (e.g. `thuha.nguyen@vfda-demo.example.vn`) | each gets a `user_account` row with role `member` (trigger) |
| 5 | `node scripts/seed-supabase.mjs --reset` | guard passes for `cinematch-dev`; rows loaded per table; the added accounts re-keyed and given their seed role (e.g. `vfda_staff`) |
| 6 | same command with a URL of another project | refused unless `--force` |
| 7 | `npm run check:supabase` | publishable key: `authority_contact`, `profile`, `consent`, `audit_log` *blocked by GRANT* (or 0 rows by RLS); `province` 34 rows (exact); public `location` 9 rows = the 9 published in the seed; secret key ≥ 1 `authority_contact`; PASS on every line |
| 8 | `NEXT_PUBLIC_SUPABASE_URL` set, `npm run dev`, open `/locations`, `/locations/trang-an`, `/admin/locations` | same pages as offline, now read from Supabase; guests see no contact (SC-002) |

## Slice 2 — accounts and roles (US-1, US-2)

| # | Step | Expected |
|---|---|---|
| 1 | `npm test` | sign-up validation, duplicate email, `next` safety, deactivated = guest, mock ignored when Supabase is set |
| 2 | `/signup`: fill name, work email, 10+ character password, company, country, crew role, tick terms | *Check your email*; `user_account` role `member`, `email_verified` false; `profile`, `producer_organisation`, `consent` with the current version (US-1 Scenario 1, BR-003) |
| 3 | Same email again | *This email already has an account — Log in?*; still one account (US-1 Scenario 3) |
| 4 | Open the verification link | session starts, role `member`, lands on `/locations` (interim for SC-02, US-1 Scenario 2) |
| 5 | Sign in as that member, open `/locations/trang-an` | contact shown (US-2 Scenario 2); signed out → sign-up prompt and no phone in the page source (US-2 Scenario 1) |
| 6 | `/forgot-password` with a known and an unknown email | the same message both times (SR-211); the link resets the password; a second use shows *Link expired* |
| 7 | Sign in as the seeded `vfda_staff` account | `/admin/locations` opens without any `x-mock-role` |

## Slice 3 — language, account, notifications, terms (US-3, US-4)

| # | Step | Expected |
|---|---|---|
| 1 | `npm test` and `npm run build` | i18n check passes (same keys in both files, no hard-coded text in the moved screens); notifications, deactivation, consent tests green |
| 2 | Any page in Vietnamese → choose EN, scroll first | all interface text in English, scroll position kept; reopen the browser → still English (US-3) |
| 3 | `node -e` / test helper: `notify()` for the member | one notification and one `email_delivery` `queued` (FR-007, FR-008) |
| 4 | `/notifications` as the member | newest first, unread count; *Mark all as read* sets the count to 0 (US-4 Scenario 2); another member sees none of them |
| 5 | With `RESEND_API_KEY` and a verified domain: `npm run send-emails` | `sent` with `provider_message_id` within 1 minute (US-4 Scenario 1); without the key: rows stay `queued` |
| 6 | `/account`: change name and language; type `DELETE` and confirm | changes saved; account deactivated, signed out, cannot sign in again (BR-005) |
| 7 | `/privacy`, `/terms` | current version shown in both languages (SR-251, SR-254) |
| 8 | `npm run embed`, then the RPC `app_match_locations` with an embedded query | nearest published locations returned (FR-011) — **deferred**, skip |

## Results

### Slice 2 — 02/11/2026, Nam Tran's machine (macOS, Darwin 25.5, Node v26.0.0), project `cinematch-dev`

Run by Claude Code in the session on `next start` (production build with `.env`), reviewed by Nam Tran. Supabase Auth's built-in mailer only delivers to team addresses, so the links of steps 2, 4 and 6 were made with `admin.generateLink` (no email sent) and opened through the app's `/auth/callback` with their `token_hash`. Temporary accounts only; all removed afterwards (`user_account` 16, `profile` 16, `consent` 18 rows, as the seed).

| # | Result |
|---|---|
| 1 | `npm test`: 290 tests, 56 suites, 290 passed, 0 failed (TDD Red before the code: 290 tests, 237 passed, 53 failed) |
| 2 | Sign-up metadata → `user_account` role `member`, `email_verified` false, status `active`; `profile` (name, `producer`, `en`), `producer_organisation` (`E2E Films`, `GB`), `consent` `2026.2` with its time (US-1 Scenario 1, BR-002, BR-003) |
| 3 | Same email through `POST /api/auth/sign-up` → 409 `EMAIL_TAKEN`; still 1 account (US-1 Scenario 3). Run after verification; a repeat before verification was not tried (Supabase may resend the email instead) |
| 4 | Verification link → 307 to `/locations`, `email_verified` true, role `member` (US-1 Scenario 2); the same link again → `/login?error=link_expired` |
| 5 | Member: `/locations/trang-an` shows `+84 000 000 101` (US-2 Scenario 2); guest: no phone in the page, sign-in link with `next` (US-2 Scenario 1); wrong password and unknown email give the same 401 body |
| 6 | `forgot-password` known and unknown email: identical `200 {"status":"sent"}` (SR-211); reset link → `/reset-password` form with the account email → new password saved (200), old password 401, new password 200; second use → `?error=link_expired` (SR-221); the member's other session was signed out (SR-224) |
| 7 | Stand-in `vfda_staff` (no password for the seeded staff account): `/admin/locations` 200, `/api/admin/locations` 200 with 11 locations; a fresh member session → 403 on both; `x-mock-role: vfda_staff` alone → 307 to `/login?next=%2Fadmin%2Flocations` |
| — | Not covered: email delivery (FR-008, slice 3), the Redirect URLs of the Supabase dashboard (research Open question 19), signing in with the seeded staff account (its password is held by the owner) |

### Slice 1 — 02/11/2026, Nam Tran's machine (macOS, Darwin 25.5, Node v26.0.0), project `cinematch-dev`

Steps 3–5 were run by Nam Tran in their own terminal (`SUPABASE_DB_URL` exported there only); the other steps by Claude Code in the session, reviewed by Nam Tran.

| # | Result |
|---|---|
| 1 | `npm test`: 236 tests, 48 suites, 236 passed, 0 failed (no network, no Supabase variables needed) |
| 2 | `python3 tools/build_supabase.py --check`: OK |
| 3 | `db push`: first run failed on migration 500 (`operator does not exist: extensions.vector <=> extensions.vector`, quoted `search_path`); FR-011 deferred and removed from migration 500, then applied. All 46 tables of `data/schema` reachable with the secret key |
| 4 | 3 accounts made in Auth; each has a `user_account` row |
| 5 | First run failed (`cannot insert multiple commands into a prepared statement` from `npx supabase db query`); loader moved to `pg`, then loaded: `location` 11 rows, `user_account` 16 rows; two Auth accounts re-keyed to their seed roles (`vfda_staff`, `admin`), one stays `member` |
| 6 | Offline test only (`tests/unit/seed-plan.test.js`: other project refused unless `--force`); not run against a second project |
| 7 | `npm run check:supabase`: 7 × PASS — `authority_contact`, `profile`, `consent`, `audit_log` blocked by GRANT (42501); `province` 34 rows; public `location` 9 rows = 9 published in the seed; secret key 11 `authority_contact` rows. First run reported the GRANT refusal as FAIL; the check was corrected to accept it |
| 8 | `npm run build` with Supabase set, then `next start`: `/locations` 200, `/locations/trang-an` 200 with no phone number for a guest, `/locations/mui-ne` (not published) 404, `/api/locations/trang-an/authority-contact` 401 for a guest, `/admin/locations` 307 → `/login?next=…`, `/api/admin/locations` 401; search counts equal to the sqlite source (`trang an` 1, `hoi an` 1, empty 9) |
| — | `npm run test:rls`: 8 tests, 8 passed, 0 failed (fixtures created with the admin API and removed: 16 `user_account` rows after the run) |
| — | Not checked online: *RLS on for every table* through `pg_class` (needs `SUPABASE_DB_URL`); it is checked statically in step 1 (`tests/unit/migrations-schema.test.js`) on the migrations that step 3 applied |
