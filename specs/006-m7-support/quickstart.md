# Quickstart: check provincial notices and consultation requests (M7)

Feature: `006-m7-support` · [contracts/](contracts/) · [data-model.md](data-model.md)

## Prerequisites

- `npm install` on `006-m7-support` (adds `docx`, `resend`).
- After the data change: `python3 tools/build_data.py --mermaid`, `python3 data/seed/generate_seed.py && python3 data/seed/check_seed.py` (PASS), `python3 tools/build_schema.py`, `python3 data/schema/load_check.py` (PASS), `python3 tools/build_dm_docs.py --mermaid`, `python3 tools/build_supabase.py`.
- Online: `npx supabase db push --remote`, then `node scripts/seed-supabase.mjs --reset` (`SUPABASE_DB_URL` exported in the terminal only).
- `.env`: `RESEND_API_KEY`, `EMAIL_FROM` (a sender on a domain verified in Resend), `VFDA_CONSULT_EMAIL` = **a test inbox** (for example Resend's `delivered@resend.dev`, or a team mailbox). Never a real VFDA address during tests.

Two roles: a member (owner of a project with a first shooting day) and a `vfda_staff` account — temporary accounts, removed afterwards.

## Slice 1 — let the province know (US-1, BR-001, BR-002)

| # | Step | Expected |
|---|---|---|
| 1 | `npm test` | green, including BR-001..BR-003, BR-005 and RLS tests |
| 2 | Member (owner of *Rice and Salt*), SC-16 *Tràng An* → *I'm interested in this location* → *Rice and Salt* | a Ninh Bình card on SC-32 at step 1, letter preview with the project data and the *does not replace the licence* sentence (US-1 Scenario 1). The spec scenario names *The Last Ferry*, but in the seed it already has a downloaded Ninh Bình letter for Tràng An, so another project is used (analysis I3) |
| 3 | Same with a project without a first shooting day | *Ask VFDA to review* disabled: *A first shooting day is needed before notifying* (US-1 Scenario 2) |
| 4 | *Ask VFDA to review* | card *Waiting for VFDA review*; no download yet |
| 5 | Staff, `/admin/notices` → *Request changes* with a note | member sees the note; one `audit_log` row `notice.request_changes` |
| 6 | Member → *Ask VFDA to review again*; staff → *Approve* | card approved; a second audit row `notice.approve` |
| 7 | Owner chooses *Department of Culture* → *Download Word*; then *Download PDF* | `POST …/download` records `recipient`, `delivery_status = downloaded`, `sent_at` once; the .docx is addressed to the Department of Culture with the sentence; the print page saves a PDF |
| 7b | A *view* member downloads the same letter; open the print page URL directly | the letter downloads; nothing changes in `province_notice` (GET routes record nothing, analysis U2) |
| 8 | Check `email_delivery` | no row for any notice — the system sent nothing (BR-001) |

## Slice 2 — the province's reply (US-2, BR-003)

| # | Step | Expected |
|---|---|---|
| 1 | Member records *More info needed* with a note | card: status, date and note as entered |
| 2 | Staff records *Received* on another downloaded notice | the project members get a notification; audit row `notice.reply` (US-2 Scenario 1) |
| 3 | A non-member of the project | no notice of it through the API (404) or RLS (0 rows) |

## Slice 3 — consultation request (US-3 as reshaped by BR-005)

| # | Step | Expected |
|---|---|---|
| 1 | Member, `/consult`: topic *Dossier*, zone *Asia/Seoul*, two preferred times → *Send request* | *Request sent — VFDA will reply by email*; the request under *Your requests* as *Waiting for VFDA*; no slot grid anywhere |
| 2 | **With the reviewer's go-ahead only**: the real email | one email in the test inbox: topic, both times in Seoul and Hanoi time, reply-to the member; `email_delivery` `sent` with `provider_message_id` |
| 3 | Without `RESEND_API_KEY` | request saved, *the email could not be sent*, `email_delivery` `queued` |
| 4 | Time the request from opening the page | under 2 minutes (SC-003) |

## Results

### Offline — 06/11/2026

Run by Claude Code in the session for Nam Tran (Nguyễn Trần Nam); review of the results by Nam Tran still due.

| Check | Result |
|---|---|
| `npm test` | 673 tests: 672 passed, 1 failed — `tests/unit/seed-plan.test.js` *the 20 user-id columns*: 21 found, because D1 added the foreign key `province_notice.response_recorded_by`. The test predates M7 and is not changed without the reviewer's go-ahead |
| `npm run build` | OK (39 pages; `/projects/[id]/provinces`, `/projects/[id]/provinces/[noticeId]/print`, `/admin/notices`, `/consult` built) |
| `uv run tools/start_feature.py --check` | OK — `spec.md` matches `docs/spec/spec-M7.md` |
| `python3 tools/build_supabase.py --check` | OK |
| `python3 data/seed/check_seed.py` | PASS (47 tables, 447 rows) |
| `python3 data/schema/load_check.py` | SQLite PASS |
| `python3 tools/check_screens.py s3_en` / `s6_en` | OK / OK |
| PostgreSQL (PGlite, scratch folder) | migration `20261106000100` applied; summary equal to the JS version on 7 pairs; every refusal and the audit rows as expected |

### Checks after the push — 06/11/2026

Nam Tran ran `npx supabase db push --remote` (migration `20261106000100`) and `node scripts/seed-supabase.mjs --reset` on `cinematch-dev` (both successful). Then, run by Claude Code in the session (no sign-in; member fixtures only, removed afterwards):

| Command | Result |
|---|---|
| `npm test` | 673 tests, 673 passed, 0 failed (`seed-plan.test.js` now counts 21 user-id columns, approved by Nam Tran) |
| `npm run build` | OK (39 pages) |
| `npm run test:rls` | 16 tests, 16 passed — the 3 M7 tests: an outsider reads no interest or notice; no direct insert; the owner cannot review their notice (no audit row) |
| `npm run check:supabase` | 7 PASS |
| `uv run tools/start_feature.py --check` | OK |
| `python3 tools/build_supabase.py --check` | OK |
| Leftovers (read-only count) | 0 fixture projects, profiles, organisations, accounts, Auth users; `location_interest` 8 and `province_notice` 7 rows, as the seed |

Staff review (approve / request changes, one audit row each) is not in the online suite: no staff account is created or signed in by the agent (decision of Nam Tran, 06/11/2026). Nam Tran runs slices 1–3 in the browser as the seed accounts `yui.tanaka@sakuralane.example.jp` (member, owner of *Lantern Street*) and `thuha.nguyen@vfda-demo.example.vn` (vfda_staff).

### Browser run — slices 1–3

*(to fill in after Nam Tran's run)*
