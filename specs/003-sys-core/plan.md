# Implementation Plan: Platform foundation on Supabase (SYS)

**Branch**: `003-sys-core` | **Date**: 2026-11-01 | **Spec**: [specs/003-sys-core/spec.md](spec.md)

**Input**: Feature specification from `/specs/003-sys-core/spec.md` (snapshot of `docs/spec/spec-SYS.md`: US-1..US-4, FR-001..FR-011, BR-001..BR-005, Clarifications Q1 and Q9)

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Move CINEMATCH from the local mock (`node:sqlite` + `x-mock-role`) to Supabase without losing the offline test suite, in three slices planned together:

1. **Shared data + RLS (US-2, data layer)**: SQL migrations in `supabase/migrations/` generated from `data/schema/schema-*.sql` (all 46 tables, names, columns and CHECKs unchanged); Row Level Security on every table with explicit `GRANT`s to `anon` and `authenticated`, policies derived from `data/02-crud-matrix.md` and the six roles; `user_account` linked to `auth.users`; a guarded seed loader; `npm run check:supabase`; one `lib/db/` API with two sources (`node:sqlite` + seed for tests, Supabase when `NEXT_PUBLIC_SUPABASE_URL` is set).
2. **Accounts (US-1, US-2)**: sign-up with company details and terms consent, email verification, sign-in with `next`, password reset (SC-04, SC-06, SC-07), sessions from Supabase Auth through `@supabase/ssr`, role and account status read from the database (FR-001..FR-004, BR-002, BR-004, BR-005).
3. **Bilingual UI, account, notifications, terms (US-3, US-4)**: vi/en display dictionary with a build-time missing-key check (FR-005, FR-006) applied to the SYS screens and SC-14/15/16/35; SC-08 *My account* with deactivation (BR-005); in-app notifications and SC-09 (FR-007, FR-009); transactional email queued and sent through Resend when configured (FR-008); SC-42 / SC-43 with versioned consent (BR-003); Vietnamese text index (FR-010). The vector index (FR-011) is **deferred** (Complexity Tracking).

## Decisions taken for this plan (Nam Tran, 01/11/2026)

| # | Topic | Decision |
|---|---|---|
| D1 | Testing RLS without network | `npm test` checks the migrations statically (46 tables, RLS on every table, grants, a policy for every human (entity, operation) of the CRUD matrix). Real RLS behaviour is checked online by `npm run check:supabase` against `cinematch-dev`. No extra library. |
| D2 | Actor *System* of the CRUD matrix | Server code with `SUPABASE_SECRET_KEY` (bypasses RLS), never in the browser. Policies are written for the six human roles only. Writes that must commit together with their audit row run in Postgres functions (research R4). |
| D3 | `user_account` ↔ `auth.users` | Same id, **no foreign key** to `auth.users`. A trigger creates `user_account` (role `member`) at sign-up. The seed loader rewrites the seed `user_id` of every email that already exists in `auth.users` (test accounts made with *Add user*) to the Auth id, in every referencing column, then loads the whole seed. |
| D4 | Scope of the two-source `lib/db/` | Every existing `lib/db/` function (M3 search, detail, nearby, contacts, admin, queries, audit) plus the new SYS ones gets both sources; all become `async`. |
| D5 | `admin` role | Inherits every permission of `vfda_staff` and `vfda_legal`, plus its own (audit log, role grants). Recorded in the spec as Clarifications Q5 (session 2026-11-02, `tools/decisions.py`). |
| D6 | Transactional email (FR-008) | Every email is recorded in `email_delivery` as `queued`; a sender using the Resend REST API (`fetch`, no new library) runs only when `RESEND_API_KEY` and an authenticated sender domain are configured. Auth emails (verification, reset) are sent by Supabase Auth. |
| D7 | Bilingual scope (FR-006) | Dictionary, cookie and missing-key check; the SYS screens and the four built screens SC-14, SC-15, SC-16, SC-35 are moved to the dictionary. Other screens use it when they are built. |
| D8 | FR-011 in scope | ~~Gemini embeddings through the existing `@google/genai`, 768 dimensions (`VECTOR(768)`, HNSW index).~~ **Superseded 02/11/2026: FR-011 deferred** (Complexity Tracking). |
| D9 | Where the indexes live | FR-010 (`unaccent` text index) and, when it is built, FR-011 (`embedding` columns) are **physical design** in their own migration, as `tools/dm_model2.py` records (01/10/2026); the logical data model and the schema-generated migration stay unchanged. |

## Technical Context

**Language/Version**: JavaScript (ES modules) on Node.js 22+; Python 3 for the migration generator in `tools/` (like the other generators); SQL for PostgreSQL 17 (`cinematch-dev` runs 17.11).

**Primary Dependencies**: Next.js 14.2 (App Router), React 18, `@google/genai` (existing). Added: `@supabase/supabase-js`, `@supabase/ssr`, and `pg` (node-postgres, 02/11/2026, seed loader only — see Complexity Tracking). Supabase CLI 2.122 through `npx` (not a package dependency) to push migrations (`supabase db push --db-url`).

**Storage**: Tests and offline dev: `node:sqlite` in memory from `data/seed/` (unchanged). Shared: Supabase PostgreSQL with RLS, `unaccent`, `pgvector`; Supabase Auth for identities.

**Testing**: `npm test` (Node test runner, no network): unit and contract tests run on the `node:sqlite` source; static tests parse `supabase/migrations/*.sql`; Supabase-source code is tested with a fake Supabase client. Online: `npm run check:supabase` (`node --env-file=.env`).

**Target Platform**: Vercel + Supabase (`cinematch-dev`); local `npm run dev` on macOS and Windows.

**Project Type**: Next.js web application (single project).

**Performance Goals**: Policy helper functions are `STABLE` and indexed on `user_account.user_id`; search p95 < 200 ms as in `001-m3-core`; notification within 1 minute of the event (US-4, SC-004 target 5 minutes).

**Constraints**: Migrations keep every table, column and CHECK of `data/schema/`; RLS on all 46 tables; `GRANT`s explicit, no `DELETE` grant (the CRUD matrix has no D: BR-005, M0 BR-005, M3 BR-008, M4 BR-008); `SUPABASE_SECRET_KEY` server-only, never `NEXT_PUBLIC_`; `SUPABASE_DB_URL` only exported in the terminal, never in a file; passwords and tokens only in Supabase Auth (BR-004); new accounts always `member` (BR-002); `x-mock-role` ignored whenever Supabase is configured.

**Scale/Scope**: 11 FR, 4 user stories, 7 SYS screens + 4 screens moved to the dictionary, 46 tables, 6 roles, 16 seed accounts.

No item of the Technical Context is unknown. Open product questions are listed in [research.md](research.md) §Open questions; none blocks `/speckit-tasks`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Plan conformance | Status |
|---|---|---|---|
| **I. Source of truth** | Requirements from `docs/spec/`, data from `data/`; never invent. | Migrations are generated from `data/schema/`; policies from `data/02-crud-matrix.md` + the Actor column of `docs/function-list.md`; the two physical additions (FR-010/011 indexes) follow the decision written in `tools/dm_model2.py`. Gaps (Province actor, SC-02 not built, Zod in SEQ-01, anonymisation schedule, …) are `[NEEDS CLARIFICATION]` items in `research.md`, not requirements. | **PASS** |
| **II. Business rules test-first** | Failing test before code for every BR and acceptance scenario. | `tasks.md` will put tests first for BR-001 (RLS coverage + online check), BR-002 (trigger never takes a role from the client; grants audited), BR-003 (consent with version), BR-004 (no password stored by the app), BR-005 (deactivated = no access), and every US-1..US-4 scenario. | **PASS** |
| **III. Thin vertical slices** | One story end to end. | Three slices in order: data + RLS → accounts → language/account/notifications. Each ends with green tests and its quickstart part. | **PASS** |
| **IV. Synthetic data and no secrets** | Seed only; no keys in files. | `.env.example` with empty values; `supabase/.temp/` git-ignored; `SUPABASE_DB_URL` only in the shell; the seed loader refuses any project but `cinematch-dev` unless `--force`. | **PASS** |
| **V. Humans approve every change** | Branch, changed files with reasons, no push. | Work on `003-sys-core`; decisions D1–D9 by Nam Tran. | **PASS** |

**Post-design re-check (after Phase 1)**: PASS. Converting `lib/db/` to `async` makes existing tests that call it synchronously need `await` — a mechanical change to test files, listed in `research.md` R9 so the reviewer sees it.

## Project Structure

### Documentation (this feature)

```text
specs/003-sys-core/
├── spec.md              # Snapshot of docs/spec/spec-SYS.md (read-only)
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R14, open questions
├── data-model.md        # Phase 1: role model, RLS policy matrix for 46 tables, auth link, physical additions
├── quickstart.md        # Phase 1: offline and online validation per slice
├── contracts/
│   ├── supabase-database.contract.md   # migrations, grants, policies, triggers, RPC functions
│   ├── data-layer.contract.md          # lib/db two-source API
│   ├── auth-and-account.contract.md    # routes and server actions of SC-04/06/07/08
│   ├── notifications.contract.md       # FR-007/008/009, SC-09
│   ├── i18n.contract.md                # dictionary, cookie, missing-key check
│   └── scripts.contract.md             # seed loader, check:supabase, migration generator, embeddings
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
supabase/
├── migrations/
│   ├── 20261101000100_schema.sql          # generated from data/schema/schema-*.sql (46 tables)
│   ├── 20261101000200_auth_link.sql       # app.current_role(), sign-up trigger, email-verified trigger
│   ├── 20261101000300_grants_rls.sql      # generated: REVOKE/GRANT + ENABLE RLS + policies
│   ├── 20261101000400_rules.sql           # BR-004 publish trigger, append-only audit, RPC functions
│   └── 20261101000500_search_indexes.sql  # unaccent index (FR-010); FR-011 deferred
├── seed.sql                               # NOT committed; written to a temp file by the loader
└── .temp/                                 # CLI link data (git-ignored)

tools/
├── build_supabase.py         # schema-*.sql → migrations 100 and 300 (new)
└── rls_policies.py           # policy source: role × table × operation × row condition (new)

scripts/
├── seed-supabase.mjs         # guarded seed loader (new)
├── check-supabase.mjs        # npm run check:supabase (new)
├── check-i18n.mjs            # missing-key check, run before build (new)
└── embed-search.mjs          # FR-011 embeddings (deferred, not created)

lib/
├── db/
│   ├── source.js             # 'sqlite' | 'supabase' from NEXT_PUBLIC_SUPABASE_URL (new)
│   ├── sqlite/…              # current node:sqlite implementations, moved (client, locations, search, …)
│   ├── supabase/…            # Supabase implementations of the same functions (new)
│   ├── accounts.js, notifications.js, consent.js   # SYS data functions, two sources (new)
│   └── *.js                  # public async API, unchanged names (locations, search, contacts, admin-locations, …)
├── supabase/
│   ├── server.js             # @supabase/ssr client with the user's cookies (publishable key)
│   └── admin.js              # secret-key client, server-only guard (System actor)
├── auth/session.js           # getSession(): Supabase user + role + status, or the mock offline
├── i18n/                     # dictionary loader, t(), locale cookie
└── email/                    # queue + Resend sender

messages/vi.json, messages/en.json        # display dictionary (FR-006)
middleware.js                             # @supabase/ssr session refresh

app/
├── signup/, login/, forgot-password/, reset-password/, auth/callback/   # SC-04, SC-06, SC-07
├── account/, notifications/, privacy/, terms/                          # SC-08, SC-09, SC-42, SC-43
└── api/…                                                               # auth, account, notifications routes

tests/
├── unit/        migrations-static, rls-coverage, auth-link-sql, seed-guard, i18n, notifications, accounts, …
└── contracts/   signup, signin, reset, account, notifications, data-layer-supabase (fake client), …
```

**Structure Decision**: Single Next.js project as before. The public `lib/db/*.js` names stay so pages and routes only add `await`; each function delegates to `lib/db/sqlite/` or `lib/db/supabase/` through `lib/db/source.js`. Migrations are generated by Python tools, like every other generated artifact of the repository, so a schema change in `data/` is one regenerate away from SQL.

## Complexity Tracking

| Item | Why it is needed | Simpler alternative rejected because |
|---|---|---|
| Two implementations per `lib/db/` function | D4: tests stay offline and deterministic while the app runs on Supabase. | Supabase-only would make `npm test` need the network; mocking SQL text would test nothing. |
| Postgres functions (RPC) for multi-write actions | M10 BR-005: an admin action and its audit row commit together; PostgREST runs one statement per request. | Two client calls cannot share a transaction. |
| No FK from `user_account` to `auth.users` (D3) | The seed has 16 accounts, most without an Auth identity. | A FK would refuse the seed or require creating Auth users with passwords for every seed email. |
| **Deferred: F-SYS-11 / FR-011 semantic (vector) index** (Nam Tran, 02/11/2026) | Not built in this feature. F-SYS-11 is a *Could*, its only consumer F-M4-07 belongs to M4, and the embedding model and vector dimension are SYS spec open question 3, still unanswered. The first `db push` also failed on `public.app_match_locations` (`operator does not exist: extensions.vector <=> extensions.vector`, because `SET search_path = 'public, extensions'` in quotes names one schema). Migration 500 keeps only `unaccent` and the FR-010 indexes; tasks T066–T068 are deferred. | Guessing a model and a dimension would bake an unanswered open question into a column type (`VECTOR(n)`) that must be migrated again when the answer differs. |
| **`pg` (node-postgres) for the seed loader** (Nam Tran, 02/11/2026) | `node scripts/seed-supabase.mjs --reset` failed with `cannot insert multiple commands into a prepared statement`: `npx supabase db query` sends SQL as a prepared statement, which holds one command, and the seed is one `BEGIN … COMMIT` block of many. `pg` runs it as one parameterless `client.query(sql)` (simple query protocol, several statements), rolls back on error, and reads `SUPABASE_DB_URL` inside the process, so the connection string is no longer a command-line argument (closes research Open question 12). Used only by `scripts/`; the app keeps `@supabase/supabase-js`. | Splitting the seed into one CLI call per statement loses the single transaction and the trigger disable/enable around it; `@supabase/supabase-js` cannot run SQL or reach `auth.users`. |
| Generated policy SQL | 46 tables × 6 roles × 4 operations is too much to keep in sync by hand with the CRUD matrix. | Hand-written SQL drifts silently from `data/02-crud-matrix.md`. |
