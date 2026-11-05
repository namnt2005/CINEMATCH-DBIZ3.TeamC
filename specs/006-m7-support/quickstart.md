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
| 1 | Member, `/consultation`: topic *Dossier*, zone *Asia/Seoul*, two preferred times → *Send request* | *Request sent — VFDA will reply by email*; the request under *Your requests* as *Waiting for VFDA*; no slot grid anywhere |
| 2 | **With the reviewer's go-ahead only**: the real email | one email in the test inbox: topic, both times in Seoul and Hanoi time, reply-to the member; `email_delivery` `sent` with `provider_message_id` |
| 3 | Without `RESEND_API_KEY` | request saved, *the email could not be sent*, `email_delivery` `queued` |
| 4 | Time the request from opening the page | under 2 minutes (SC-003) |

## Results

*(filled in by the person who runs it)*
