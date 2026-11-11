# Implementation Plan: Dossier kit, bilingual drafts and countdown (M5)

**Branch**: `009-m5-dossier` | **Date**: 11/11/2026 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/009-m5-dossier/spec.md` (snapshot of `docs/spec/spec-M5.md`: US-1..US-3, FR-001..FR-008, BR-001..BR-006, Clarifications Q1, Q3, Q7 of 28/10/2026), the data model `data/data-model-M5.md` and the Screen Specs SC-26, SC-28, SC-29.

## Summary

A member opens the **document kit** (SC-26) and sees the documents their project's segment needs, grouped by basis — *Required by law*, *Commonly requested*, *Location-specific* (BR-003). The list is **computed from configuration tables**, never written in code (BR-004). It contains:

- the document types linked to the `segment_requirement` rows marked `needed` for the project's segment;
- the common items configured for that segment;
- the location-specific documents of every shortlisted location (D1).

Segment C gets the minimum list of Clarifications Q1, each item labelled *awaiting VFDA confirmation*. Members upload and replace PDF or DOCX files up to 25 MB in the private bucket `project-documents`; every version is kept and every download is logged (FR-002, SR-154). The four Article 13 rows show the same state as SC-27, because they read M2's `v_dossier_check` (SR-153).

On SC-28 a member pastes the English synopsis or Vietnam-scene script, or uploads it as DOCX (D3). The text is split into paragraphs and each paragraph gets a Vietnamese draft:

- The text goes to the language model **only when `GEMINI_PAID_TIER=true` and the user has ticked the consent box** (Q3). Otherwise the Vietnamese column starts empty for a person to fill in.
- The project glossary is applied to every draft (BR-006).
- A person marks each paragraph proofread. Editing a proofread paragraph clears the mark.
- Article 13 component b becomes *Present* only when **every** paragraph is proofread (BR-002).
- The two-column PDF carries *DRAFT — REQUIRES PROOFREADING* on every page and flags the paragraphs not yet proofread (BR-001, D2). CINEMATCH never submits anything.

SC-29 (US-3) was built by M2 (`008-m2-check` US-4) on the shared `workingDaysBefore()` and `licensingTimeline()`. M5 adds its own entry point `GET /api/projects/:id/countdown` (FR-008 `timeline_view`), a thin route over M2's `getTimeline()`, with a test written first that compares its answer with `licensingTimeline()` for two seed projects (BR-005: one number everywhere).

**In this plan**: US-1, US-2, US-3; FR-001..FR-008; BR-001..BR-006; screens SC-26 and SC-28 (new) and SC-29 (reused); the M5 countdown route; links from SC-27 rows to SC-26 and SC-28.

**Not in this plan**:
- submitting the dossier (phase 3);
- certified translation;
- visa, equipment and drone paperwork (M6);
- extracting text from an English PDF (research Open question 6);
- reminder e-mails and the `.ics` file of SC-29 #13 (SYS).

## Decisions taken for this plan

| # | Topic | Decision |
|---|---|---|
| D1 | Source of the kit (BR-004, SR-151; data-model M5 blocking questions *which entity links SEGMENT_REQUIREMENT to DOCUMENT_TYPE* and *which function creates DOCUMENT_SLOT rows*) (Nam Tran, 11/11/2026) | Through the generators. (1) `document_type.requirement_code`, the `segment_requirement.requirement_code` that brings the document into a kit: the three A13 documents a, b, d → `ART13_LICENCE`; `A13_SERVICE_AGREEMENT` → `VN_SERVICE_AGREEMENT`; `SERVICE_CONTRACT_C` → `SERVICE_CONTRACT`; the crew passports and visas of segment C → `CREW_VISA`. A document with no requirement code, such as `FOREIGN_CREW_LIST`, joins the kit by `document_type.segments`. (2) New table `location_document_type(location_id, doc_code)`, which says which location needs which location-specific document; the seed maps Tràng An → `HERITAGE_SITE_PERMIT`. (3) `document_type.awaiting_confirmation` (BOOLEAN) drives the *awaiting VFDA confirmation* label (Q1). (4) The segment C document types of Q1 that the seed lacks: crew passports and visas, shooting schedule with locations, and local permit for a public place (location-specific). **Data owner (Nguyễn Huy Trung) to review.** |
| D2 | Two-column PDF (FR-005, BR-001) (Nam Tran, 11/11/2026) | `@react-pdf/renderer` (named by SC-28 #11), rendered on the server with an embedded Noto Sans font (SIL OFL 1.1, Vietnamese diacritics) kept in the repository. The watermark *DRAFT — REQUIRES PROOFREADING / BẢN NHÁP — CẦN HIỆU ĐÍNH* is a `fixed` element of the one wrapping page, so it is drawn on every page; a paragraph not yet proofread carries its own flag. The file is stored in `project-documents` and opened through a short signed link. |
| D3 | English source of a draft (Nam Tran, 11/11/2026) | Pasted text **and** an uploaded DOCX, whose text is extracted with `mammoth`. The DOCX is read in memory and not stored. Extracting text from a PDF is deferred (research Open question 6). |
| D4 | Who proofreads (FR-006; spec §10 question 2 open) (Nam Tran, 11/11/2026; NDA gate added after the analysis, 11/11/2026) | The test value of spec §9, **behind M4's NDA gate** (M4 §4.2: *the other party accepts the e-NDA before seeing project documents*). An owner or edit member of the project may mark a paragraph proofread. A user of a partner organisation may read the draft (including `synopsis_en`) and proofread **only when the request for the project is `accepted` or `confirmed` and both `nda_acceptance` rows (`producer` and `partner`, `accepted = true`) exist** — the same condition as M4's `app_log_document_view`. The system records `reviewed_by`, `reviewer_org_id` (for a partner) and `reviewed_at`. Only such a user whose request is `confirmed` may **confirm the whole document**: this marks every remaining paragraph proofread in that user's name. No new column. |

Decisions this plan follows without reopening them:
- **Q3 (28/10/2026).** The paid Gemini API only, after the user's tick.
  - Without the paid plan, or without the tick, no text leaves the server and the Vietnamese column stays empty.
  - `LLM_PROVIDER=mock` gives a deterministic fake translator for offline work and tests, and only when `NODE_ENV !== 'production'`; in production with no provider set, nothing is translated (analysis U1).
  - The consent box is shown only when `GEMINI_PAID_TIER=true`, as M2 D12.
- **Q7 (28/10/2026) and M2 D1.** Working days; buffer in calendar days.
- **M2 D8.** *Recommended submission date* / *Hạn nộp khuyến nghị (có dự phòng)*; never *safe* / *an toàn*.
- **M2 D10.** `buffer_days` 0 / 7 / 14 / 21, editable by owner and edit members.

## Technical Context

**Language/Version**: JavaScript (ES modules) on Node.js 22.x (`engines`), Next.js 14 App Router (AGENTS.md §2); SQL for SQLite 3 and PostgreSQL 17.

**Primary Dependencies**:
- Existing: Next.js, React 18, `@supabase/supabase-js`, `@supabase/ssr`, `node:sqlite`, `pg`, `@google/genai` (the M2 and M3 pattern with an injectable client; `GEMINI_API_KEY`, `GEMINI_MODEL`, `LLM_PROVIDER`, `GEMINI_PAID_TIER`).
- New:
  - **`@react-pdf/renderer` ^4.9.0** (MIT; peer React 18): the two-column PDF with a watermark on every page (D2). SC-28 #11 names it. No other library in the project renders a PDF on the server; M7 used the browser's print dialog, which cannot store the file or be tested.
  - **`mammoth` ^1.13.0** (BSD-2-Clause): plain text from an English DOCX (D3). The existing `docx` library only writes files.
- New asset: Noto Sans Regular and Bold `.ttf` with `OFL.txt` in `lib/pdf/fonts/`.

**Storage**:
- M5 tables `document_type` (+ D1), `document_slot`, `document`, `bilingual_document`, `bilingual_paragraph`, `project_glossary`, `public_holiday` (read), and the new `location_document_type` (D1).
- Read with: `segment_requirement` (M1), `project`, `project_member` (M0), `project_shortlist`, `location` (M3), `collab_request`, `organisation_user` (M4), `document_access_log` (M4, written on download), and M2's `v_dossier_check`.
- Private bucket `project-documents` (new, PDF and DOCX, 25 MB). Paths:
  - uploads: `<project_id>/<doc_code>/<uuid>.<pdf|docx>`;
  - generated PDFs: `<project_id>/<doc_code>/drafts/<uuid>.pdf`.
- Every write goes through a Postgres `SECURITY DEFINER` function with a node:sqlite twin, as in M0, M2, M4 and M7.

**Testing**:
- `node --test` offline: sqlite with the seed; Supabase through `tests/contracts/supabase-fake.js`; Gemini through a fake client, so no model call in `npm test`; storage through an in-memory adapter.
- PDF rendered in the test and checked as described in research R9.
- A static check and a PGlite run of the migration.
- `tests/unit/build-dynamic.test.js` covers the new routes.
- Online: RLS in `npm run test:rls` (member fixtures only), and a browser walk-through by Nam Tran.

**Target Platform**: web; SC-26 down to 360 px; SC-28 two columns from 768 px, one column below (SC-28 §8).

**Project Type**: web application.

**Performance Goals**:
- SC-002: a 14-paragraph draft is proofread in under 45 minutes. This needs per-paragraph autosave within 2 s of typing and one-click *Proofread*.
- Draft creation shows paragraphs as they arrive (*Translating paragraph 4 / 14*), with a 15 s model timeout per batch.
- The PDF of a 14-paragraph draft renders in under 5 s.

**Constraints**:
- The kit has no document list in code (BR-004); every item carries its basis (BR-003).
- Component b counts as present only at 100 % proofread (BR-002); an edit clears the mark (SR-163).
- The watermark is on every page; no generated file is called final (BR-001).
- The model receives text only with paid plan + tick (Q3).
- One deadline calculation everywhere (BR-005).
- Glossary per project, applied on every draft and re-draft (BR-006).
- Files: PDF or DOCX, at most 25 MB, private, uploaded straight to storage through a signed URL. Vercel limits a request body to about 4.5 MB, so a 25 MB file cannot pass through a route; an English DOCX for a draft, which does pass through a route, is limited to 4 MB.
- Every route is `force-dynamic`; no client component imports a module that uses `node:*`.
- Every screen text from `lib/i18n`, with no banned M2 word.
- `data/`, `docs/spec`, `docs/screens` change only through their generators; secrets only in `.env`.

**Scale/Scope**:
- Seed: 8 document types before D1 (11 after), 19 slots, 9 documents, 3 drafts (The Last Ferry: 14 paragraphs, 6 proofread), 4 glossary terms, 7 holidays, 8 projects.
- Build: 2 new screens and 1 reused, 13 route files, about 9 Postgres functions, 1 migration, 1 bucket, 2 new columns, 1 new table, 4 new document types.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | How this plan meets it | Status |
|---|---|---|
| **I. Spec is the source of truth** | Built from FR-001..FR-008, BR-001..BR-006 and Q1, Q3, Q7. The blocking data-model questions were decided by the human (D1, D4) and go to the generators. Points the spec leaves open are research Open questions with an interim choice: confirmed or shortlisted locations, limits, segment C names, PDF text, `project_meta` refresh. None is a silent requirement. | Pass |
| **II. Business rules test-first** | A failing test before the code for each rule: BR-001 (watermark node on the wrapping page; render of a long draft gives more than one page; unproofread flag; no route submits anything); BR-002 (13 of 14 → b not present; 14 of 14 → present on SC-26, SC-27 and the Dossier gauge; an edit → back to *needs fixing*); BR-003 (every kit row has one of the three bases; segment C rows labelled *awaiting VFDA confirmation*); BR-004 (the kit changes when `segment_requirement`, `document_type` or a shortlist changes, with no code change); BR-005 (the new M5 route `GET /api/projects/:id/countdown` answers, for *The Last Ferry* and *Quiet Harbour Blues*, exactly what M2's `licensingTimeline()` gives — red first because the route does not exist; the red run is recorded in the build log); BR-006 (a glossary term used in a later draft, mock and Gemini prompt); Q3 (no model call without paid plan + tick; the consent box hidden without the paid plan); US-1 Sc1–2, US-2 Sc1–3, US-3 Sc1–2 (through the same route), D4 (an `accepted` partner without both NDA rows cannot read `synopsis_en`), and the edge cases (over 25 MB or wrong type refused; a replaced file keeps its old version; recommended date passed; one paragraph fails). | Pass |
| **III. Thin vertical slices** | Slice 1 = US-1: kit, upload, download. Slice 2 = US-2: draft, proofreading, glossary, PDF. Slice 3 = US-3: the M5 countdown route over the M2 timeline, test first. Each ends with its tests and its quickstart slice. | Pass |
| **IV. Synthetic data, no secrets** | Seed only; test scripts invented; a real script reaches Gemini only on the paid plan with the user's tick; `GEMINI_API_KEY` only in `.env`, never logged or returned; storage links signed and short. | Pass |
| **V. Humans approve** | Branch `009-m5-dossier`. The data change D1 is reviewed by the data owner (Nguyễn Huy Trung); the segment C list and the bases by the VFDA Legal Board. Push, reseed and the browser runs are Nam Tran's. | Pass |

*Re-check after Phase 1*: Pass. Data changes go only through the generators (D1). The two new dependencies are named here, with the reason. Direct writes are revoked in the migration, as in M0, M2 and M4. Deviations from the Screen Specs are research Open questions.

## Project Structure

### Documentation (this feature)

```text
specs/009-m5-dossier/
├── spec.md              # snapshot of docs/spec/spec-M5.md (do not edit here)
├── plan.md              # this file
├── research.md          # Phase 0: decisions R1–R14 and open questions
├── data-model.md        # Phase 1: D1 changes, states, functions, validation, i18n keys
├── contracts/
│   ├── documents-api.contract.md   # SC-26: kit, upload, replace, download
│   ├── drafts-api.contract.md      # SC-28: draft, translation, paragraphs, proofreading, glossary, PDF
│   ├── countdown-api.contract.md   # M5 entry point of the countdown (FR-007, FR-008, BR-005)
│   └── screens.contract.md         # SC-26, SC-28 element by element; SC-29 and SC-27 changes
├── quickstart.md        # Phase 1: offline checks and the three slices
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
lib/
├── documents/
│   ├── kit.js                 # documentKit({ segment, requirements, types, shortlistDocs, slots, dossier }) — pure (BR-003, BR-004)
│   ├── input.js               # file checks: type, 25 MB, doc_code in kit; suggestDocCode(filename, kit) (SR-155)
│   └── view.js                # groups, labels, progress, row actions (SC-26)
├── drafts/
│   ├── paragraphs.js          # splitParagraphs(text), limits (R4)
│   ├── translate.js           # translateParagraphs(): Gemini only with paid plan + tick; mock; per-paragraph failure (Q3, R5)
│   ├── gemini-translator.js   # structured output [{ idx, target_text }], glossary in the prompt (BR-006)
│   ├── glossary.js            # applyGlossary (mock), glossaryMismatches(paragraphs, glossary) (SC-28 interaction 4)
│   ├── docx.js                # textFromDocx(buffer) with mammoth, 4 MB (D3)
│   └── view.js                # progress, statuses, DRAFT strip, consentVisible (SC-28)
├── pdf/
│   ├── bilingual-pdf.js       # buildBilingualDocument() element tree (no JSX), renderBilingualPdf() → Buffer (D2, BR-001)
│   └── fonts/NotoSans-Regular.ttf, NotoSans-Bold.ttf, OFL.txt
├── storage/project-documents.js   # signed upload/download, paths, offline temp folder, in-memory adapter (M4 pattern)
├── db/documents.js, db/drafts.js, db/glossary.js            # facades (sqlite | supabase)
├── db/sqlite/{documents,drafts,glossary}.js
└── db/supabase/{documents,drafts,glossary}.js
app/
├── projects/[id]/documents/page.js, documents-client.js      # SC-26
├── projects/[id]/bilingual/[docCode]/page.js, draft-editor.js   # SC-28 (route of the Screen Spec)
├── projects/[id]/project-nav.js                              # + Document kit, Bilingual drafts
├── projects/[id]/dossier/page.js                             # SC-27 rows link to SC-26 / SC-28 (were plain text)
└── api/  projects/[id]/documents/ (GET), …/documents/upload-url/, …/documents/ (POST record),
          documents/[id]/download/, projects/[id]/countdown/ (GET, M5 FR-008),
          projects/[id]/drafts/ (GET), projects/[id]/drafts/[docCode]/ (GET, POST), …/translate/, …/pdf/, …/confirm/,
          projects/[id]/drafts/[docCode]/paragraphs/[idx]/ (PATCH), …/paragraphs/[idx]/review/,
          projects/[id]/glossary/ (GET, POST), projects/[id]/glossary/[term]/ (DELETE)
supabase/migrations/20261111000100_m5_dossier.sql
tests/unit/…, tests/contracts/…, tests/rls/rls.test.js (member fixtures only)
```

**Structure Decision**: the existing single Next.js app (`app/`, `lib/`, two-source `lib/db/`), as in M0, M2, M4 and M7.
- **Generators touched (D1)**: `tools/dm_model.py`, `tools/dm_model2.py`, `tools/build_schema.py`, `tools/dm_rules.py`, `tools/specs_types.py` (§6.1 types of the new columns and table), `tools/rls_policies.py`, `data/seed/generate_seed.py`, `data/seed/seed_rules.py`. Then `build_data.py`, `build_dm_docs.py`, `build_supabase.py`, `build_docs.py --mermaid` (mermaid-cli 11.14.0, `mmdc --version` first), `build_index.py`, `start_feature.py --refresh`.
- **M2 code touched**:
  - `app/projects/[id]/dossier/page.js`: links to SC-26 and SC-28.
  - `next.config.mjs`: `experimental.outputFileTracingIncludes` for `lib/pdf/fonts/**`, so the fonts reach the Vercel function.
  - `package.json`: the two dependencies.

## Waiting for VFDA confirmation

Interim choices this plan builds on, each also in research.md *Open questions*:

| Point | Interim choice |
|---|---|
| Q1 segment C list, Q3 translation service, Q7 working days | As decided 28/10/2026 (provisional) |
| Who proofreads (spec §10 question 2) | D4 (spec §9 test value, behind the M4 NDA gate) |
| Names and bases of the new segment C documents | Written by the agent from the wording of Q1, each marked *awaiting VFDA confirmation* |
| Foreign crew list and provincial notice (spec §10 question 4) | *Commonly requested*, as in the seed |
| Tết 2027 dates (spec §10 question 5) | Seed band 05–10/02/2027, *expected* |
| Certified proofreader (spec §10 question 6) | Not required; the proofreader's name is recorded |
| Which locations need which permit | `location_document_type` rows, written by VFDA staff (seed: Tràng An → heritage consent) |
| Templates | `document_type.template_url`; the seed links are placeholders, so *template pending VFDA* is shown |

## Known limitations

1. Location-specific documents follow **every shortlisted location** (primary and backup). SC-26 says *confirmed locations*; there is no *confirmed* state on a shortlist (research Open question 1).
2. No screen edits `location_document_type` or `document_type` yet. VFDA changes them through the seed generator until an admin screen exists.
3. A draft's `project_meta` is a copy taken when the draft is created; it is refreshed only when the member creates the draft again (data-model M5 open question).
4. Creating a draft again replaces its paragraphs and their proofreading marks, after a confirmation.
5. An English source in PDF is not read (D3); paste the text or use DOCX.
6. Without the paid Gemini plan, or without the user's tick, no machine draft is made. The Vietnamese column is typed by a person.
7. The generated PDF is not a `document` row, so its downloads are not in `document_access_log` (that log references uploaded documents only).
8. SC-29 reminders and `.ics` (#13) are not built (SYS F-SYS-08).

## Complexity Tracking

> No constitution violation to justify.
