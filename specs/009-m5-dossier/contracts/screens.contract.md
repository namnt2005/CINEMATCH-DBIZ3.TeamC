# Contract: screens (SC-26, SC-28; SC-29 reused; SC-27 links)

Feature: `009-m5-dossier` · Screen Specs `docs/screens/screen-spec-SC-26.md`, `-SC-28.md`, `-SC-29.md` · [research.md](../research.md) R1, R3, R5–R9, R11, R13, R14

Rules for every screen:
- members only; text from `lib/i18n` (vi / en);
- states always as text, not only colour;
- no banned M2 word (BR-003 of M2; D8);
- `ProjectNav` (#2) gets *Document kit* (`documents`) and *Bilingual drafts* (`drafts`).

## SC-26 `/projects/[id]/documents` (members; owner and edit upload; not the Screen Spec route — research Open question 14)

| # | Element | Built as |
|---|---|---|
| 1, 2 | Navigation, sidebar | site header; `ProjectNav current="documents"` |
| 3 | Title + segment | project name and segment |
| 4 | A / B / C chips | buttons with `aria-pressed`; another segment is read-only (`?segment=`), with a strip *Viewing segment {x} — your project is {y}* |
| 5 | Document groups | *Required by law* / *Commonly requested* / *Location-specific*, in that order (BR-003) |
| 6 | Rows | the kit of R1; cards under 600 px |
| 7 | Basis label | text label per row; *awaiting VFDA confirmation* label when flagged (Q1) |
| 8 | *Download template* | shown only with `template_url`; *template pending VFDA* while placeholders (research Open question 12) |
| 9 | State | Present / Needs fixing / Pending / Missing, the same keys as SC-27 |
| 10 | Row action | *View* (latest version, versions list), *Upload* / *Replace*, *Draft bilingual* → SC-28 on **every** row (I3), *View request* → `/requests?project=` (component c), for `PROVINCIAL_NOTICE_COPY` only *Open provincial notices* → SC-32 while missing and *View* → SC-32 once present, never *Upload* / *Replace* (G1, U3) |
| 11 | Differences by segment | from `segment_requirement` labels; collapsible on narrow screens |
| 12 | Progress | *{present} of {total} present* + bar; link to SC-27 |
| 13 | Upload area | drag-and-drop + *Choose file* button; client checks type and 25 MB with the limit stated; *Looks like: {document} — confirm* (R14); the file goes to the signed URL with a progress bar; then record; success strip *Added to document kit — rechecking against Article 13*; failure midway *Upload incomplete — try again*, no row created |

States: Empty (new project: every row *Missing*; *Added once you confirm a location* in place of the location group), Loading (skeleton; upload progress on its row), Error (at the upload area).

## SC-28 `/projects/[id]/bilingual/[docCode]` (readers per D4; two columns from 768 px)

| # | Element | Built as |
|---|---|---|
| 1, 2 | Navigation, sidebar | `ProjectNav current="drafts"` (members); partners (accepted or confirmed with both NDA rows, D4) see the header only; any other partner gets the *not found* page |
| 3 | Document picker | `GET …/drafts`; *+ New draft* for another kit document |
| 4 | Proofreading progress | *{reviewed} / {total} proofread* + bar |
| 5 | Source column | read-only; `lang="en"` |
| 6 | Vietnamese column | one `<textarea lang="vi">` per paragraph; autosave 2 s after typing (`PATCH`); a reviewed paragraph goes back to *not proofread* at the first save; save error *Not saved — your text is still on screen* |
| 7 | Paragraph status | *Not translated yet* / *Chưa có bản dịch* when the Vietnamese is empty (A1); *Machine translation · not proofread* / *Proofread by {name} ({organisation}) on {date}* |
| 8 | *✓ Proofread* | on non-empty `machine` paragraphs when `can_proofread` |
| — | *Confirm whole document* | only when `can_confirm` (confirmed partner, D4), with a confirmation dialog |
| 9 | Glossary | list, *+ Add term* (owner / edit), remove; mismatching paragraphs highlighted with text *Glossary: "{en}" → "{vi}" not used* |
| 10 | DRAFT strip | *DRAFT — {n} paragraphs not proofread*; replaced at 100 % by *Fully proofread. Item b has been updated in the dossier check.* with a link to SC-27 |
| 11 | *Export two-column PDF* | `POST …/pdf`, opens the signed link; every page watermarked (BR-001) |
| 12 | *Save* | flushes pending autosaves; *Saved* / *Saving…* |
| 13 | Sync scroll | toggle, on by default; stored in `localStorage` with try/catch |

Empty state: *Upload the English script to get started* with a paste box and a `.docx` picker (4 MB). The consent box *Send the text to the paid AI translation service* is shown only when `GEMINI_PAID_TIER=true`, unticked by default (Q3). *Create Vietnamese draft* then follows.

Other states:
- **Loading**: *Translating paragraph {n} / {total}*; the paragraphs appear as their batches return.
- **No machine draft**: *Machine draft not available — type or paste the Vietnamese text*.
- **One failure**: *Could not translate — retry this paragraph*, with a retry button on that paragraph only.

## SC-29 `/projects/[id]/timeline` (reused from M2 US-4)

No change of behaviour on the page. The M5 entry point `GET /api/projects/:id/countdown` (contracts/countdown-api.contract.md) gives the same data. M5 traces US-3 Sc1–2, FR-007, FR-008 and BR-005 to the existing page in tests (research R11). The *recommended date passed* edge case shows the days in red and *Book a VFDA consultation*, as built. #13 reminders and `.ics` are not built.

## SC-27 `/projects/[id]/dossier` (M2) — change

Row actions that M2 showed as text now link:
- *Upload* → SC-26 (`/projects/[id]/documents#<doc_code>`), in US-1 (T026);
- *Draft Vietnamese version* → SC-28 (`/projects/[id]/bilingual/A13_SCRIPT_VI`), in US-2 once SC-28 exists (T046; analysis I8).

Nothing else changes; the M2 tests stay green.
