# Research: Dossier kit, bilingual drafts and countdown (M5)

Phase 0 of [plan.md](plan.md). Every *NEEDS CLARIFICATION* of the Technical Context is resolved below or carried as an open question with an interim choice. Nothing here adds a requirement: where the spec is silent, the choice is the narrowest one that satisfies the FR, and it is listed under *Open questions*. Decisions D1–D4 were taken by Nam Tran on 11/11/2026.

## R1 — How the kit is computed (FR-001, BR-003, BR-004, D1)

**Decision**: one pure function `documentKit()` over rows the data layer reads; no document list, code or segment in the code. For project *p* of segment *s*, a document type *d* is in the kit when:

1. **Linked to a requirement**: `d.basis ≠ location`, `d.requirement_code` is set, and `segment_requirement(s, d.requirement_code).needed = true`. This is how the four Article 13 documents reach A and B and leave C (`ART13_LICENCE` is not needed for C).
2. **Common**: `d.basis ≠ location`, `d.requirement_code` is null, and *s* ∈ `d.segments`. Examples: `FOREIGN_CREW_LIST`; the shooting schedule of segment C.
3. **Location-specific**: `d.basis = location`, *s* ∈ `d.segments`, and a location shortlisted for *p* has a `location_document_type` row for `d.doc_code`. Example: Tràng An → `HERITAGE_SITE_PERMIT` for *The Last Ferry*.

Each row carries `basis` (BR-003 label), `awaiting_confirmation` (label *awaiting VFDA confirmation*, Q1), `template_url` (hidden when null) and its state (R2).

`PROVINCIAL_NOTICE_COPY` (*Copy of the provincial notice*, basis `common`, segments A and B) joins A / B kits by rule 2 (decided by Nam Tran after the analysis, G1, 11/11/2026). Its state comes from M7, not from a slot: *Present* when the project has a `province_notice` (through `location_interest`) with `review_status = approved` and `sent_at` set (M7 D1: `sent_at` = first download of the approved letter); otherwise *Missing*, with the row action linking to SC-32 (`/projects/[id]/provinces`). This rule names the code in the data layer (as M2's `v_dossier_check` names the Article 13 codes); `kit.js` itself stays free of codes.
- The A / B / C chip (SC-26 #4) runs the same function with another segment, read-only, and keeps the project's shortlist.
- Location rows are hidden, with the note *Added once you confirm a location*, when *p* has no shortlisted location.

A generator check (`seed_rules.py`) keeps `d.segments` equal to the segments whose `segment_requirement` row for `d.requirement_code` is `needed`, so the two never disagree.

**Rationale**: BR-004 and SR-151 name `segment_requirement` as the source. That table already says, per segment, whether the Article 13 licence, the service agreement or crew visas are needed (M1). Linking the document type to that row means a VFDA change of `needed` changes the kit with no code. Location needs cannot come from `permit_complexity` or `restriction_note`, which are free text or a level. An explicit link table is the only non-invented source.

**Alternatives considered**:
- Keep `document_type.segments` only. This ignores `segment_requirement`, against BR-004 as written.
- Infer heritage from `scene_types`. That would be a hidden rule in code.
- A list in a JSON config file. That is hard-coded for VFDA's purposes: it changes only by pull request.

## R2 — Document slots and their states (FR-003; data-model M5 questions *who creates DOCUMENT_SLOT rows* and *is the state stored or derived*)

**Decision**: the state stays **stored** in `document_slot.state`. Slot rows are created by the functions, not in advance.

- **No row** → shown as `missing`.
- **First upload** (`app_record_document`): inserts the slot, or updates it, with `present`. Each replacement adds a `document` version; old versions are kept (FR-002).
- **Bilingual drafts**: when the last paragraph of the draft of `doc_code` becomes proofread (`app_review_paragraph`, `app_confirm_bilingual`), the slot is set to `present`. When a proofread paragraph of a draft whose slot is `present` is edited, the slot goes back to `needs_fix` (BR-002, US-2 Sc2–3).
- **The four Article 13 rows** show `v_dossier_check.state` of M2. That view lowers a stored `present` to `needs_fix` while a paragraph is not proofread, and to `pending` while no partner request is confirmed. SC-26 and SC-27 therefore show the same state (SR-153), and so does the M0 Dossier gauge.
- **Other rows** show the stored state, or `missing`.

**Rationale**: M2 already reads the stored state and lowers it from live data. Keeping that contract avoids a second derivation. The seed slot of *The Last Ferry* component b is stored as `needs_fix`; it must become `present` when its 14th paragraph is proofread, which only a write can do.

**Alternatives considered**: deriving every state at read time. That changes M2's view and its tests, and it cannot express *needs fixing* set by a reviewer later.

## R3 — Storage and upload (FR-002, SR-154)

**Decision**: follow `lib/storage/org-documents.js` (M4).

- **Bucket.** Private `project-documents`, created in the migration with `file_size_limit = 26214400` and `allowed_mime_types = {application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document}`.
- **Upload.**
  1. `POST …/documents/upload-url` checks the caller (owner or edit), the `doc_code` (in the kit), the declared type and the size. It returns a signed upload URL (300 s) for `<project_id>/<doc_code>/<uuid>.<ext>`.
  2. The browser uploads straight to storage. Vercel limits a request body to about 4.5 MB, so a 25 MB file cannot pass through a route.
  3. `POST …/documents` records the version. The server first reads the stored object's size and type and deletes it if either is wrong (the edge case *over 25 MB or wrong type*).
- **Download.** `GET /api/documents/:id/download` checks membership, writes `document_access_log` through the existing `logDocumentView()` (M4), and answers with a signed URL (60 s).
- **Offline.** The same interface writes under the OS temp folder. Tests use an in-memory adapter.

- **One bucket.** SC-26 #13 says *private bucket per project*; this plan keeps **one** private bucket `project-documents` with a folder per project (`<project_id>/…`) — access is decided by the server before it signs a link, so a bucket per project adds no protection and cannot be created by a migration for future projects (decided by Nam Tran, I4; SC-26 #13 is rewritten at its source in T002).
- **Who uploads.** FR-002 says *project members*; following M0's permissions, owner and edit members upload and replace, view members only view and download (analysis I9).

**Rationale**: the same rules as M4 (private, short links, server checks). Signed upload avoids the request size limit.

**Alternatives considered**: upload through a route (fails above about 4.5 MB on Vercel); a public bucket (against SR-154).

## R4 — Paragraphs of the English source (FR-004)

**Decision**: `splitParagraphs(text)`.

- Line ends become `\n`; the text is split on one or more blank lines; each paragraph is trimmed and inner whitespace collapsed; empty paragraphs are dropped.
- Limits (interim, marked * in data-model §5): at most 100 paragraphs, 4,000 characters per paragraph, 60,000 characters in all.
- The English column is the source as split, read-only (SC-28 #5).

**Rationale**: US-2 Sc1 is *14 paragraphs in → 14 out*, so a predictable split with no model involved is required. The limits keep one draft within one model batch series and one PDF.

**Alternatives considered**: split by sentence (breaks alignment with the producer's paragraphs); let the model split (not verifiable).

## R5 — Translation and Q3

**Decision**: `translateParagraphs({ paragraphs, glossary, consent }, { env, client })`.

- **Gemini runs only when every condition holds**: `LLM_PROVIDER=gemini`, `GEMINI_PAID_TIER=true`, `GEMINI_API_KEY` and `GEMINI_MODEL` set, and `consent === true` (the M2 `advancedAvailable` test plus the tick).
- **`LLM_PROVIDER=mock`**: a deterministic fake translator, `[VI] ` + the source with the glossary applied, for offline work and tests only. It runs only when `LLM_PROVIDER=mock` is set **and** `NODE_ENV !== 'production'`. In production, an unset or `mock` provider means no translation at all (`method = "none"`), so a real user never receives a fake draft (analysis U1). The UI says *test translation* in mock mode.
- **Otherwise**: no call. The draft is created with empty Vietnamese paragraphs and the message *Machine draft not available — type or paste the Vietnamese text*.
- **Batching**:
  - Paragraphs are sent in batches of up to 5, with structured output `[{ idx, target_text }]` and a 15 s timeout per batch.
  - Each returned paragraph is written as soon as its batch ends, so the screen shows *Translating paragraph n / N*.
  - A paragraph missing from the answer, or whose batch failed, stays empty with *Could not translate — retry this paragraph* (edge case). `POST …/translate { idx }` retries one paragraph.
- **Never logged**: neither the text nor the key appears in a log.
- **Consent box**: shown only when `GEMINI_PAID_TIER=true` (M2 D12), unticked by default.

**Rationale**: Q3 allows only the paid API, and only after consent, for real scripts. Without both, the honest result is no machine draft rather than a call to another service.

**Alternatives considered**: free tier with a warning (against Q3); a second translation provider (no decision allows one).

## R6 — Project glossary (BR-006, SR-164)

**Decision**:
- `project_glossary(project_id, term_en, term_vi)`, one translation per English term (key), case-insensitive on input, at most 200 terms per project (interim *).
- **Mock translator**: replaces each `term_en` with `term_vi`, matching whole words.
- **Gemini**: the prompt lists the glossary as fixed translations.
- **Display**: `glossaryMismatches()` flags paragraphs whose source contains `term_en` while the Vietnamese lacks `term_vi`. The editor highlights them (SC-28 interaction 4); nothing is changed by itself.
- **Edits**: owner and edit members add or remove terms; the glossary is used by every later draft and retry of the project.

**Rationale**: BR-006 and SR-164 say *applied on translation and re-translation*; the model cannot be forced, so mismatches are shown for a person to fix.

**Alternatives considered**: rewriting the Vietnamese after the model. This can break the grammar and changes text that a person did not write.

## R7 — Who proofreads and confirms (FR-006, D4)

**Decision**: `app.can_proofread(project_id)` is true for:
- an accepted `project_member` with `owner` or `edit` permission; or
- a user of an organisation (`organisation_user`) with a `collab_request` for the project in `accepted` or `confirmed` **and both `nda_acceptance` rows of that request (`producer` and `partner`, `accepted = true`)** — M4's NDA gate (M4 §4.2), the same condition as `app_log_document_view` and its node:sqlite twin `logDocumentView()`, which reuse `ndaOf()` and `isOrgUser()` of `lib/db/sqlite/partner-access.js`.

`app.can_confirm_draft(project_id)` is true only for the second kind with `confirmed` (and both NDA rows). The same partner condition decides who may **read** a draft (R12): an `accepted` partner without both NDA rows reads nothing, not even `synopsis_en` (decided by Nam Tran after the analysis, I1, 11/11/2026).

| Action | Function | Writes |
|---|---|---|
| Proofread one paragraph | `app_review_paragraph` | `reviewed_by = auth.uid()`, `reviewed_at`, and `reviewer_org_id` when the user acts for a partner |
| Confirm the whole document | `app_confirm_bilingual` | the same three columns on every paragraph still `machine` and non-empty; refused when a paragraph is empty |

View members read but do not proofread.

**Rationale**: the spec §9 test value, decided by Nam Tran, kept behind M4's NDA gate because the draft contains the production's confidential script. No new column: the confirmation is the set of paragraph marks.

**Alternatives considered**: a document-level `confirmed_by` column (data change not needed for BR-002); members only (drops FR-006's partner).

## R8 — Component b and the Dossier gauge (BR-002)

**Decision**: the rule stays where M2 put it (`lib/db/dossier-view.sql`: b cannot be `present` while a paragraph is not `reviewed`), plus the slot writes of R2. M5 adds no view.

Tests that trace M5 BR-002 and US-2 Sc3 on *The Last Ferry* (14 paragraphs, 6 proofread in the seed):
- 13 of 14 → b *needs fixing* on SC-26, SC-27 and the gauge;
- 14 of 14 → b *present*;
- one edit → back to *needs fixing*.

**Rationale**: one place for the rule; SC-26, SC-27 and SC-12 cannot differ.

## R9 — The PDF (FR-005, BR-001, D2)

**Decision**: `lib/pdf/bilingual-pdf.js`.

- **No JSX.** It is built with `React.createElement`, so `node --test` loads it without a JSX transform.
- **Layout.** `buildBilingualDocument({ title, meta, paragraphs, labels })` returns a `<Document>` with **one** `<Page size="A4" wrap>`:
  - a `fixed` header with the watermark *DRAFT — REQUIRES PROOFREADING · BẢN NHÁP — CẦN HIỆU ĐÍNH*, so react-pdf draws it on every page;
  - a `fixed` diagonal watermark;
  - a `fixed` footer with the page number;
  - one two-column row per paragraph (`wrap={false}`): English left, Vietnamese right (`lang` vi), and *Not proofread* on rows still `machine`.
- **Render.** `renderBilingualPdf()` uses `renderToBuffer` with Noto Sans registered from `lib/pdf/fonts/`. Vietnamese diacritics need an embedded Unicode font; the built-in Helvetica has none.
- **Vercel.** `next.config.mjs` adds `experimental.outputFileTracingIncludes` for the font files, so they ship with the function.
- **Storage.** The buffer goes to `project-documents` at `<project_id>/<doc_code>/drafts/<uuid>.pdf`; `bilingual_document.pdf_url` keeps that storage path, and the route answers with a 60 s signed link.
- **Tests (BR-001)**:
  - the element tree has the watermark nodes with `fixed` inside the only page;
  - every paragraph row of a `machine` paragraph has the flag;
  - rendering a 14-paragraph draft with long paragraphs gives a valid PDF (`%PDF-` header) with more than one `/Type /Page` object;
  - with all paragraphs proofread, the watermark is still there.
- **Visual check.** Every page is checked by eye in quickstart slice 2.

**Where it runs**: SEQ-10 (spec §4.2) draws the translation and the PDF in a Supabase Edge Function; this plan runs both in Next.js Route Handlers on the server (Node runtime), which keep the key and the files on the server just the same and share the data layer and tests with the rest of the app (analysis I6).

**Rationale**: SC-28 #11 names the library. A `fixed` element is react-pdf's documented way to repeat content on every page. Text inside the PDF is glyph-encoded with an embedded font, so a byte search for the words is not reliable; the tree test plus the page count is.

**Alternatives considered**:
- Browser print page (M7 D4): not stored, not testable.
- `pdfkit` directly: no layout engine for aligned columns.
- `pdf-lib`: manual text wrapping.

## R10 — English DOCX (D3)

**Decision**:
- `POST …/drafts/:docCode` accepts JSON `{ text }` or `multipart/form-data` with one `.docx` of at most 4 MB (Vercel body limit; interim *).
- `textFromDocx(buffer)` uses `mammoth.extractRawText`; the result goes through `splitParagraphs`.
- The file is read in memory and **not stored**, since it is the production's confidential script.
- A file that is not a DOCX (magic bytes `PK`) is refused with the limit stated.

**Rationale**: SC-28 empty state *Upload the English script*; D3.

**Alternatives considered**: upload to storage first, then parse. This stores the confidential source for no need.

## R11 — The countdown (US-3, FR-007, FR-008, BR-005, Q7)

**Decision**: reuse, unchanged:
- `lib/dates/working-days.js` (`workingDaysBefore`, `workingDaysAfter`);
- `lib/licensing/timeline.js` (`licensingTimeline`);
- `getTimeline()`;
- SC-29 at `/projects/[id]/timeline` with `buffer_days` (M2 US-4, D1, D8, D10, D13).

M5 adds its own entry point **`GET /api/projects/:id/countdown`** (FR-008 output `timeline_view`; contracts/countdown-api.contract.md), a thin route that returns `getTimeline()` unchanged. Its test is written first and is red because the route does not exist (analysis C1). In the same test the route's answer is compared with `licensingTimeline()` computed in the test from the seed for *The Last Ferry* and *Quiet Harbour Blues*. The test checks:
- US-3 Sc1: 15/03/2027, buffer 7 → 05/01/2027 and 02/02/2027; filing on 02/02/2027 with one resubmission → result on 02/04/2027, after the first shooting day;
- US-3 Sc2: the Tết 2027 band is *expected*;
- FR-007: a shooting day not after today is refused; buffer 0 / 7 / 14 / 21;
- FR-008: both paths and the late milestones;
- BR-005: SC-26 has no own date; SC-12, SC-27 and SC-29 are equal for every seed project;
- the edge case *recommended date passed*: red text with the number of days and *Book a VFDA consultation*.

Every assertion goes through the new route, so the whole test is red before T049. The shooting-day validation of FR-007 stays M0's `PATCH /api/projects/:id` (red-first in M2 T055); the route echoes the stored `shoot_date` and `buffer_days`. A gap found while writing these tests is recorded here, not patched silently.

**Rationale**: BR-005 forbids a second calculation.

## R12 — Access (RLS) and functions

**Decision**:
- **Read policies through `tools/rls_policies.py`**:
  - `bilingual_document`, `bilingual_paragraph`, `project_glossary`: project members, plus users of a partner with an `accepted` or `confirmed` request **and both NDA rows** (D4, R7);
  - `location_document_type`: `signed_in`;
  - `document_type`: already `signed_in`.
- **Writes.** Only through `SECURITY DEFINER` functions with `search_path = ''`. The migration revokes INSERT, UPDATE and DELETE on the M5 tables from `anon` and `authenticated`, including the generated direct `document` insert policy. This is narrower than the generated matrix, as in M0, M2 and M4. The deferred row `('bilingual_paragraph', 'update', 'Partner')` stays in `DEFERRED` (as M4 keeps its partner writes) and is served by `app_review_paragraph` / `app_confirm_bilingual`.
- **Storage policies.** None for `anon` or `authenticated` on `project-documents`. The server signs links after its own check (M4 R10).

## R13 — Screens, text and accessibility

**Decision**:
- All text through `lib/i18n` with prefixes `documents.*`, `drafts.*`, `glossary.*`.
- No banned M2 word (approved, accepted, legally compliant, safe; *an toàn*) in the M5 texts, tested.
- SC-26 renders cards below 600 px.
- SC-28: one column below 768 px; Vietnamese fields with `lang="vi"`; status always as text; autosave 2 s after the last keystroke, with *Not saved — your text is still on screen* on error.
- SC-27 rows link to SC-26 (upload) and SC-28 (draft); they were plain text in M2.
- `ProjectNav` gets *Document kit* and *Bilingual drafts*.
- Every route is `force-dynamic`. Client components import only modules without `node:*`; this is checked by `npm run build` and `build:ci-check`.

## R14 — File suggestion (SR-155)

**Decision**: `suggestDocCode(filename, kit)` compares lower-cased words of the file name with the codes and names of the kit rows and returns the best match or none. The upload area shows *Looks like: {document} — confirm*, and the file is assigned only after the user picks or confirms a row.

**Rationale**: SR-155 says the suggestion is only a suggestion. No model is needed.

## Open questions

| # | Question | Interim choice | Owner |
|---|---|---|---|
| 1 | SC-26 #6 says *confirmed locations*; spec US-1 Sc2 and BR-004 say *shortlisted*. A shortlist has `primary` / `backup`, no *confirmed*. | Every shortlisted location (primary and backup). | Group C / screens owner |
| 2 | Who may proofread (spec §10 question 2). | D4 (spec §9 test value). | VFDA |
| 3 | Segment C list (Q1): names and bases of the new items written by the agent. | `common` for crew passports and visas and the shooting schedule, `location` for the public-place permit, all *awaiting VFDA confirmation*. | VFDA Legal Board |
| 4 | Foreign crew list and provincial notice: required or common (spec §10 question 4). | *Commonly requested*, as in the seed. | VFDA Legal Board |
| 5 | Tết 2027 official dates (spec §10 question 5). | Seed band, *expected*. | VFDA |
| 6 | Text from an English PDF (D3). | Not read; paste or DOCX. | Group C |
| 7 | Limits the spec does not give (paragraphs, characters, glossary size, DOCX 4 MB). | The values marked * in data-model §5. | Group C |
| 8 | Does a draft refresh `project_meta` when the project changes? (data-model M5) | Only when the member creates the draft again. | M5 owner |
| 9 | A slot whose document left the kit (location removed from the shortlist). | Kept in the database, not shown on SC-26. | Group C |
| 10 | Must the proofreader be a certified translator, and be named in the dossier? (spec §10 question 6) | No; the proofreader's name is recorded with each paragraph (FR-006) and shown on SC-28. | VFDA Legal Board |
| 11 | SC-28 #3 lists four documents (synopsis, script, application letter, undertaking); only `A13_SCRIPT_VI` has a Vietnamese source requirement in law. | Decided by Nam Tran (I3, 11/11/2026): every kit row has *Draft bilingual*; the picker shows the project's drafts, `A13_SCRIPT_VI` first. | Screens owner |
| 12 | Templates (`template_url`) are placeholders in the seed. | *Template pending VFDA* until real links exist (M2 analysis U5). | VFDA |
| 13 | `PROVINCIAL_NOTICE_COPY` for a project with notices to several provinces: one downloaded approved notice, or every province? (G1) | *Present* when at least one approved notice has been downloaded. | VFDA Legal Board |
| 14 | SC-26's Screen Spec route is `/projects/[id]/dossier`, which M2 built for SC-27 (whose Screen Spec route is `/projects/[id]/dossier-check`). | Decided by Nam Tran (11/11/2026): SC-27 stays at `/projects/[id]/dossier`; SC-26 at `/projects/[id]/documents`; the Screen Spec routes to be corrected at their sources by the screens owner. SC-28 uses its Screen Spec route `/projects/[id]/bilingual/[docCode]`. | Screens owner |
| 15 | SC-26 #6 (*confirmed locations*, no `location_document_type`), #7 (no *awaiting VFDA confirmation* label) and #10 (*Draft bilingual* on every row, provincial-notice row) were not changed at the source: the authorisation of 11/11/2026 covered SC-26 #13 and SC-28 only. | Built as this plan says (D1, Q1, I3, G1, U3). | Screens owner |
| 16 | Spec M5 §9 assumption still says a partner whose request is *accepted or confirmed* may proofread; D4 adds M4's NDA gate (both NDA rows). §9 was outside the authorised sections (§6, §6.1, §11.1). | D4 with the NDA gate. | M5 owner |
