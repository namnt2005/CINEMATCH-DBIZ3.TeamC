# Contract: Supabase database (migrations, grants, RLS, functions)

Feature: `003-sys-core` · Detail: [data-model.md](../data-model.md) · Decisions: [research.md](../research.md) R1–R5, R12–R14

## Migrations (`supabase/migrations/`, applied in name order)

| File | Made by | Must contain |
|---|---|---|
| `20261101000100_schema.sql` | `python3 tools/build_supabase.py` | the 46 `CREATE TABLE` of `data/schema/schema-*.sql` with identical table, column, type, constraint and CHECK text; then every foreign key as `ALTER TABLE … ADD CONSTRAINT <same name>` |
| `20261101000200_auth_link.sql` | hand-written | schema `app`; `app.current_role()`, `app.has_role(...)`, `app.is_project_member(uuid)`; triggers on `auth.users` (data-model §2) |
| `20261101000300_grants_rls.sql` | `python3 tools/build_supabase.py` (from `tools/rls_policies.py`) | `REVOKE ALL` + grants of data-model §4; `ENABLE ROW LEVEL SECURITY` on all 46 tables; one named policy per row of data-model §3 |
| `20261101000400_rules.sql` | hand-written | `trg_location_publish_needs_contact`, `trg_audit_log_append_only`, the functions of data-model §5 |
| `20261101000500_search_indexes.sql` | hand-written | `unaccent`, `app.f_unaccent`, GIN indexes, `vector`, `embedding VECTOR(768)` columns, HNSW indexes (data-model §6) |

Applying: `npx supabase db push --db-url "$SUPABASE_DB_URL"` (the URL is exported in the terminal only).

## Invariants checked offline (`npm test`, static parsing)

1. Every table of `data/schema/schema-summary.json` (46) is created once, with the same columns and CHECK constraints as `data/schema/`.
2. Every table has `ALTER TABLE … ENABLE ROW LEVEL SECURITY`.
3. No `GRANT … DELETE` and no `FOR DELETE` policy exists.
4. Every (entity, operation) of `data/02-crud-matrix.md` whose actor is a human role has a policy for that role, an RPC of data-model §5, or a *Deferred* entry naming an open question.
5. The sign-up trigger sets `role` to the literal `'member'` and never reads a role from `raw_user_meta_data` (BR-002).
6. No migration creates a password or token column (BR-004).

## Invariants checked online (`npm run check:supabase`, see [scripts.contract.md](scripts.contract.md))

- `anon` (publishable key) reads 0 rows from `authority_contact`, `profile`, `consent`, `audit_log` (BR-001, US-2 Scenario 1).
- `service_role` (secret key) reads ≥ 1 row from `authority_contact`.

## Policy naming

`rls_<table>_<operation>_<who>`, e.g. `rls_authority_contact_select_members` (the data model's `rls_authority_contact_members`). Policies named in `data/data-model-*.md` keep those names.

## Errors raised by the database

| Source | Message (stable, matched by the app) |
|---|---|
| `trg_location_publish_needs_contact` | `Authority contact not verified (M3 BR-004).` |
| `trg_audit_log_append_only` | `Audit records are append-only (M10 BR-005).` |
| any §5 function, wrong role | `forbidden` (SQLSTATE `42501`) |
