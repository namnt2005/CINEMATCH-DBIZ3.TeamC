# Contract: scripts (generator, seed loader, Supabase check, embeddings, maintenance)

Feature: `003-sys-core` · Decisions: D1, D3, D8, [research.md](../research.md) R1, R3, R7, R8, R12, R14

## `python3 tools/build_supabase.py`

Writes `supabase/migrations/20261101000100_schema.sql` and `…000300_grants_rls.sql` from `data/schema/schema-*.sql` and `tools/rls_policies.py`. Deterministic: running it twice leaves `git status` clean. `--check` exits 1 if the files on disk differ from what it would write.

## `node scripts/seed-supabase.mjs [--reset] [--force]`

| Step | Behaviour |
|---|---|
| Input | `SUPABASE_DB_URL` from the environment only (`export SUPABASE_DB_URL=…` in the terminal). Missing → exit 1 with how to export it. Never written to a file or printed (masked as `postgresql://***@host`). |
| Guard | Project ref from the URL (`postgres.<ref>@…pooler…` or `db.<ref>.supabase.co`) must equal `supabase/.temp/project-ref`, and `supabase/.temp/linked-project.json` must have `"name": "cinematch-dev"`. Otherwise exit 1, unless `--force`. |
| Connection | `pg` (node-postgres) client from `process.env.SUPABASE_DB_URL`, inside the process: never a command-line argument, file or log line. |
| Auth accounts | `select id, email from auth.users` on that client |
| Re-key | Each seed `user_account.user_id` whose email is in `auth.users` becomes the Auth id in all 20 referencing columns; the seed role of that email is kept (test accounts get their role). |
| Load | One transaction: (with `--reset`: `TRUNCATE` the 46 tables) → disable `trg_location_publish_needs_contact` → insert `data/seed/NN_*.csv` in filename order → re-enable the trigger → `COMMIT`. Non-empty database without `--reset` → exit 1. |
| Run | The whole block as one parameterless `client.query(sql)` (simple query protocol); on error `ROLLBACK`, exit 1 with the URL and password masked. |
| Output | rows per table, accounts re-keyed (email → role), elapsed time. |

The guard, re-key and SQL building are pure functions (`scripts/lib/seed-plan.mjs`); reading the state and running the block (`scripts/lib/seed-db.mjs`) take the client as an argument. Both are tested offline with a fake client.

## `npm run check:supabase` = `node --env-file=.env scripts/check-supabase.mjs`

| Check | Client | Expected |
|---|---|---|
| `authority_contact` | publishable key (anon) | blocked by GRANT (42501) or 0 rows by RLS; the line says which |
| `authority_contact` | secret key | ≥ 1 row (the table is not empty) |
| `profile`, `consent`, `audit_log` | publishable key | same, each |
| `province` | publishable key | exact count (`count: 'exact'`), ≥ 1 |
| `location`, no filter | publishable key | exact count = published locations of `data/seed/21_location.csv` (RLS filters) |

Prints PASS / FAIL per line, never a key; exit 1 on any FAIL; refuses to run if `SUPABASE_SECRET_KEY` starts with `NEXT_PUBLIC` or the publishable key equals the secret key.

## Other scripts

| Command | Effect |
|---|---|
| `npm run check:i18n` | [i18n contract](i18n.contract.md) build check |
| `npm run send-emails` | [notifications contract](notifications.contract.md) sender |
| `npm run anonymise` | calls `app_anonymise_deactivated()` with the secret key (BR-005, Open question 4) |
| `npm run embed` (**deferred with FR-011**) | `scripts/embed-search.mjs`: embeds location and partner descriptions with the Gemini model chosen in research R14 (768 dimensions) and stores them with the secret key; only rows whose text changed |
