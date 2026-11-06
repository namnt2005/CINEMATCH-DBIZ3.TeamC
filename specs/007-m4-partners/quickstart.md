# Quickstart: check the partner directory, requests, Verified and the private layer (M4)

Feature: `007-m4-partners` · [contracts/](contracts/) · [data-model.md](data-model.md) · [research.md](research.md)

## Prerequisites

- `npm install` on `007-m4-partners` (no new dependency).
- After the data change (D1, D2, D6): `python3 tools/build_data.py --mermaid`, `python3 data/seed/generate_seed.py && python3 data/seed/check_seed.py` (PASS), `python3 tools/build_schema.py`, `python3 data/schema/load_check.py` (PASS), `python3 tools/build_dm_docs.py --mermaid`, `python3 tools/build_supabase.py` (mermaid-cli 11.14 through `MMDC_PATH`; check `mmdc --version` first).
- Online: `npx supabase db push --remote` (the M4 migration also creates the private bucket `org-documents`), then `node scripts/seed-supabase.mjs --reset` — run by Nam Tran in their terminal with `SUPABASE_DB_URL` exported there only.
- `.env`: `RESEND_API_KEY`, `EMAIL_FROM` as for M7; invitation and notification emails go to **test inboxes only**.
- People sign in themselves in the browser; the agent signs in as no one (decision of 06/11/2026). **No temporary account is made** for the browser runs (analysis I3): they use seed accounts only. In Auth today: member `yui.tanaka@sakuralane.example.jp` (owner of *Lantern Street*), staff `thuha.nguyen@vfda-demo.example.vn`, admin `ducanh.vu@vfda-demo.example.vn`. The partner steps need **one seed partner account in Auth** — `lan.pham@benxua.example.vn` (Bến Xưa Production Services) is assumed below: Nam Tran adds it in the Supabase dashboard with their own password before the reseed, which then gives it the seed id and role (plan Known limitation 10).
- **Clean-up**: what the browser runs and `npm run test:rls` create on `cinematch-dev` (requests, messages, NDA rows, invitations, notifications) stays until the next `node scripts/seed-supabase.mjs --reset`; messages and access-log rows cannot be deleted (BR-009, BR-007), so nothing promises an earlier clean-up. Test PDFs uploaded to `org-documents` are not removed by the reseed (Nam Tran removes them in the dashboard if wanted).

## Offline checks

| # | Command | Expected |
|---|---|---|
| 1 | `npm test` | green, including BR-001..BR-009 tests, US-1..US-4 Scenario 1 tests, the state machine and the RLS-shape tests |
| 2 | `npm run build` | OK |
| 3 | `uv run tools/start_feature.py --check`, `python3 tools/build_supabase.py --check` | OK |
| 4 | `npm run test:rls`, `npm run check:supabase` (after the push) | green: guests read no member or private layer; a member without both NDA rows reads no private layer; no direct writes; a member cannot decide a verification |

## Slice 1 — find a partner (US-1, FR-002..FR-006)

| # | Step | Expected |
|---|---|---|
| 1 | Private window, `/partners` | groups with counts; *VFDA Verified only* on; cards with name, groups, provinces, badge + month; no project count, no languages, no language filter (US-1 Scenario 2) |
| 2 | Signed in: *Full production services*, *Ninh Bình*, *Korean*, Verified only | only matching verified organisations with their Verified month (US-1 Scenario 1) |
| 3 | Switch Verified off | unverified organisations with *Not verified*; *Sông Hậu* (badge ended 15/08/2026) is unverified |
| 4 | Open a profile as a guest, then signed in | guest: public layer only; signed in: member layer too; private layer locked; *What VFDA checked* says what was not checked |
| 5 | Timed: from `/partners` to a verified partner in the shooting province | under 5 minutes (SC-001) |

## Slice 2 — request to confirmation, with the private layer (US-2, US-4 Scenario 1, FR-012..FR-017, BR-001, BR-005, BR-006)

Partner: the seed partner account of Bến Xưa in Auth (Prerequisites). Member: `yui.tanaka@…`, owner of *Lantern Street*, which has no request to Bến Xưa in the seed.

| # | Step | Expected |
|---|---|---|
| 1 | Member (owner of *Lantern Street*) → Bến Xưa → *Send request* with a service and a note | *Sent*, step 1 of 5; one notification for each party (US-2 Scenario 1, FR-015); the emails go to seed addresses on `example` domains, which receive nothing: expect `bounced` on their `email_delivery` rows while the in-app notifications show (§3 edge case, C1). A real email to a test inbox is checked in slice 4 step 1 |
| 2 | Send again to the same partner from the same project | refused: *You already have an open request with this partner* |
| 3 | Partner: *Under review*, then *Accept* without the NDA box, then with it | step 2 *Viewed*; then refused; then step 3 *Accepted*; each note is a message |
| 4 | Member on Bến Xưa's profile and on the request, **before** ticking the producer NDA, then **after** ticking it (analysis G2) | before: step 3, private layer locked, *Confirm partnership* disabled; after: step 4 *NDA agreed*, rate card, past clients and direct contact visible to *Lantern Street*'s members (US-4 Scenario 1); a guest still never sees them |
| 5 | Member: *Confirm partnership* | enabled now that the NDA is ticked (US-2 Scenario 2) |
| 6 | Confirm | *Confirmed*, one notification per party, Partners gauge 100 % on SC-12; component c *Pending*, `document_slot` unchanged (US-2 Scenario 3, BR-006) |
| 7 | Try to decline, withdraw or reconfirm the confirmed request (API) | 409 `INVALID_STATE` (BR-005) |

## Slice 3 — VFDA Verified (US-3, FR-008..FR-011, BR-004)

| # | Step | Expected |
|---|---|---|
| 1 | Partner (Bến Xưa), `/partners/me/verify`: a test PDF and two references → *Submit* | pending; the form read-only; staff notified |
| 2 | Staff, `/admin/verification` → open the document | the PDF opens from a 60-second signed link; the bucket is not readable otherwise |
| 3 | *Reject* without a reason, then with one | refused, then rejected; the partner sees the reason (US-3 Scenario 2); one `audit_log` row |
| 4 | Submit again, staff *Approve* | badge with today's date, valid until the same day next year (US-3 Scenario 1); one `audit_log` row |
| 5 | Article 13 switch on without the *business line* box, then with it | refused, then on; *not legal advice* shown on the profile; one `audit_log` row |
| 6 | `npm run verification:remind` with a badge ending within 30 days | one reminder per organisation; a second run sends none |
| 7 | Timed review of 5 requests | under 15 minutes each (SC-004) |

## Slice 4 — invitation, privacy check and deactivation (BR-001, BR-003, BR-008, SC-003)

The private-layer check of US-4 Scenario 1 is slice 2 step 4. Order of this slice (analysis G3): steps 1–4, **then** step 5; after step 5 Nam Tran runs `node scripts/seed-supabase.mjs --reset` before any other online test, because the deactivation withdraws the seed requests to Bến Xưa (including *The Last Ferry*'s) that `npm run test:rls` relies on.

| # | Step | Expected |
|---|---|---|
| 1 | Staff (`thuha.nguyen@…`), `/admin/partners/invite`: *Hanoi Grip & Light* and a test inbox address | one email with the link in the test inbox; `audit_log` `partner.invite` |
| 2 | Open the link signed in as `yui.tanaka@…` | refused (`EMAIL_MISMATCH`); nothing changes |
| 3 | Accepting the invitation | **not run online** — accepted by Nam Tran 06/11/2026 (analysis G7): it needs an account with the invited address, i.e. a temporary account (analysis I3). Checked offline by T025 / T026 (role `partner`, `organisation_user`, `role.grant`; an ordinary sign-up stays `member`) and by T024 (`app_grant_role` refuses `partner`) |
| 4 | `npm run test:rls`; then 10 profiles in a private window | green; a guest never sees rate cards, past clients or direct contacts (SC-003) |
| 5 | **Last**: Partner (Bến Xưa) deactivates the organisation, typing its name | open requests *withdrawn*, one notification per party; the profile shows *No longer active* (BR-008); then `--reset` |

US-4 Scenario 2 (document views logged) is not in this slice (D4): only the append-only trigger and the log function are checked by `npm test`.

## Results

*(filled in by the person who runs it)*

**06/11/2026 — offline, run by Claude Code for Nam Tran (not yet reviewed by a person)**

| Check | Result |
|---|---|
| Baseline before the change (T001) | Not recorded — the change was started without it (build-log Entry 15) |
| `npm test` | 822 tests, 822 passed, 0 failed |
| `npm run build` | OK (new pages `/partners`, `/partners/[slug]`, `/partners/[slug]/request`, `/requests`, `/requests/[id]`, `/partners/me`, `/partners/me/verify`, `/admin/verification`, `/admin/partners/invite`, `/invitations/partner/[code]`, `/legal/nda`) |
| `node scripts/check-i18n.mjs` | vi.json and en.json complete |
| `uv run tools/start_feature.py --check` | OK |
| `python3 tools/build_supabase.py --check` | OK |
| `python3 data/seed/check_seed.py` | PASS (49 tables, 457 rows) |
| `python3 data/schema/load_check.py` | SQLite PASS — 49 tables, 49 seed files, 457 rows |
| Migration `20261106000200_m4_partners.sql` on PGlite (scratch folder) | Layers, NDA gating, final states, triggers, invitation hash and acceptance with the inviter's `role.grant`, admin refused for `partner`, reminder once, deactivation withdraws open requests, Partners gauge 100 |

**Not run yet (Nam Tran, online):** `npx supabase db push --remote` of `20261106000200_m4_partners.sql` and `node scripts/seed-supabase.mjs --reset`; slices 1–4 in the browser (T023, T034, T046, T054, T060) with the seed accounts — Bến Xưa's partner account (`lan.pham@…`) must first be added to Auth; `npm run test:rls` (T057) **before** the deactivation step, then `--reset`; `npm run check:supabase`; the 360 px check (T061) and the timing of `GET /api/partners` (T062). `npm run verification:remind` loads `.env` and writes to the database it points at — run it only on purpose.
