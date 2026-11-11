---
description: "Task list for the dossier kit, bilingual drafts and countdown (M5): US-1 document kit, US-2 Vietnamese draft and proofreading, US-3 countdown (reused from M2)"
---

# Tasks: Dossier kit, bilingual drafts and countdown (M5)

**Input**: Design documents from `/specs/009-m5-dossier/` — [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Prerequisites**: plan.md (decisions D1–D4 of 11/11/2026, *Waiting for VFDA confirmation*, *Known limitations*), research.md (R1–R14, Open questions 1–12).

**Tests**: Required (Constitution Principle II and the request for this feature). Each test task below is written and seen failing **before** the code task that names it:
- every business rule: BR-001..BR-006;
- every acceptance scenario: US-1 Scenarios 1–2, US-2 Scenarios 1–3, US-3 Scenarios 1–2;
- the edge cases of spec §3;
- the clarifications and decisions the code must honour: Q1, Q3, Q7, D1–D4.

`npm test` stays offline:
- `node:sqlite` with the seed;
- Supabase through `tests/contracts/supabase-fake.js`;
- storage through the in-memory adapter;
- Gemini through a fake client (`LLM_PROVIDER=mock` = fake translator).

No model call and no network. Real RLS is checked by `npm run test:rls` with member fixtures only. The browser walk-throughs are run by Nam Tran.

Expected values come from the seed (CSV files found by table name, never by their NN prefix), from the seed oracle `data/seed/seed_rules.py`, or from a computation written in the test — never from scenario text alone (build-log Entry 12). An older test that fails because of D1 (table counts, the M2 dossier rows) is **reported and not changed** until Nam Tran approves the change.

**Organization**:
- Phase 1: baseline, spec and screen sources for D1, D3, D4, dependencies and fonts.
- Phase 2: data change D1, migration skeleton, storage adapter, error codes.
- Phase 3: US-1 (slice 1, MVP).
- Phase 4: US-2 (slice 2).
- Phase 5: US-3 (slice 3, the M5 countdown route over the M2 calculation, test first).
- Phase 6: Polish.

All three stories are P1 in the spec. US-1 goes first, as plan.md *Constitution Check* III orders the slices: SC-28 is opened from the kit.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1..US3 (spec.md §3); Phases 1, 2 and 6 carry no story label
- Every task names its FR / BR / decision and its file paths

---

## Phase 1: Setup

- [X] T001 Record the baseline on branch `009-m5-dossier` before any change, in specs/009-m5-dossier/quickstart.md §Results: `npm test`, `npm run build`, `npm run build:ci-check`, `uv run tools/start_feature.py --check`, `python3 data/seed/check_seed.py`, `python3 data/schema/load_check.py`, `python3 tools/build_supabase.py --check`.
- [X] T002 Change the M5 spec and screen sources for D1, D3, D4 (decided by Nam Tran 11/11/2026; the spec text changes only at its sources):
  - tools/specs_b.py, M5 §6:
    - `DocumentType` gains `requirement_code`, `awaiting_confirmation`;
    - new entity `LocationDocumentType` (location_id, doc_code — *belongs to Location and DocumentType*);
    - §11.1 rows *Kit source* (`segment_requirement` + `location_document_type`, D1) and *Segment C label* (Q1).
  - tools/specs_types.py: the §6.1 types of the two columns and of `LocationDocumentType`.
  - tools/s3_en.py:
    - SC-26 #6: source `segment_requirement` + `location_document_type` of shortlisted locations;
    - SC-26 #7: label *awaiting VFDA confirmation*;
    - SC-26 #10: *Draft bilingual* on every row; *Open provincial notices* → SC-32 for the provincial notice copy (I3, G1);
    - SC-26 #13: *one private bucket `project-documents`, a folder per project* in place of *private bucket per project* (I4);
    - SC-28 empty state: paste or `.docx` up to 4 MB; consent box only with the paid plan (Q3);
    - SC-28: new element *Confirm whole document* for a partner whose request is confirmed with both NDA rows (D4);
    - SC-28 #7: status *Not translated yet* when the Vietnamese is empty (A1);
    - SC-28 #11: watermark in both languages.
  - Then:
    1. `"$MMDC_PATH" --version` must print 11.14.0;
    2. `python3 tools/build_docs.py --mermaid`, `python3 tools/check_screens.py s3_en --out /tmp/screens`, `python3 tools/build_index.py`;
    3. `uv run tools/start_feature.py --refresh` and `--check`;
    4. look at the `docs/spec/` and `docs/screens/` diff before going on.
  - Authorised by Nam Tran in the prompt of 11/11/2026 (analysis I5): tools/specs_b.py (§6, §6.1, §11.1 of M5) and tools/s*_en.py (SC-26, SC-28), then the rebuild commands above.
  - *Done 11/11/2026*: §6, §6.1, §11.1 of M5 and SC-26 #13, SC-28 #7, #8, #11, empty state and interaction *Confirm whole document* at the sources; mermaid-cli 11.14.0 reinstalled in the scratch folder, all 9 specs render; `check_screens s3_en` OK; snapshot refreshed. SC-26 #6, #7, #10 and §9 were outside the authorisation — research Open questions 15, 16.
  - (FR-001, FR-004, FR-006, BR-003, BR-004, Q1, Q3, D1, D3, D4)
- [X] T003 Add the two dependencies named in plan.md and the font (D2, D3):
  - `npm install @react-pdf/renderer@^4.9.0 mammoth@^1.13.0`; package.json and package-lock.json change. Reason for the pull request: plan.md Technical Context.
  - Noto Sans Regular and Bold `.ttf` with `OFL.txt` in lib/pdf/fonts/.
  - `experimental.outputFileTracingIncludes` for `lib/pdf/fonts/**` in next.config.mjs.
  - Then `npm run build` and `npm run build:ci-check` still pass.
  - *Done 11/11/2026*: `@react-pdf/renderer` 4.9, `mammoth` 1.13; Noto Sans Regular and Bold (hinted TTF) with `OFL.txt` from the Noto project; next.config.mjs also lists `@react-pdf/renderer` in `serverComponentsExternalPackages` so Next loads it from node_modules on the server.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the kit configuration exists in the data (D1); every write goes through a checked database function; the private bucket and its adapter; the new error codes.

**⚠️ CRITICAL**: no user story work can begin until this phase is complete.

### Tests (write first, see them fail) ⚠️

- [X] T004 [P] Create unit test of the M5 seed and schema after D1 in tests/unit/m5-seed.test.js:
  - `document_type.requirement_code` (nullable) and `awaiting_confirmation` (boolean, not null) exist; `ck_document_type_location_no_requirement` is in data/schema/schema-M5.sql;
  - table `location_document_type` with PK (location_id, doc_code) and FKs to `location` and `document_type`;
  - seed:
    - the three Article 13 documents a, b, d → `ART13_LICENCE`; `A13_SERVICE_AGREEMENT` → `VN_SERVICE_AGREEMENT`; `SERVICE_CONTRACT_C` → `SERVICE_CONTRACT`;
    - the new `CREW_PASSPORT_VISA_C` (→ `CREW_VISA`), `SHOOTING_SCHEDULE_C` (no code) and `LOCAL_PERMIT_PUBLIC_C` (basis `location`) exist;
    - every segment C type has `awaiting_confirmation = true` and every other type false (Q1);
  - for every type with a code, `segments` equals the segments whose `segment_requirement` row for that code is `needed` (R1);
  - every `location_document_type.doc_code` has basis `location`; Tràng An → `HERITAGE_SITE_PERMIT` exists.
  - First assert each column or table exists, so no test is green for the wrong reason (build-log Entry 16).
  - (BR-003, BR-004, Q1, D1)
- [X] T005 [P] Create the static test of the Phase 2 part of supabase/migrations/20261111000100_m5_dossier.sql in tests/unit/m5-migration.test.js (like tests/unit/m2-migration.test.js):
  - D1 columns `ADD COLUMN IF NOT EXISTS`, the table `CREATE TABLE IF NOT EXISTS`, the CHECK added safely;
  - bucket `project-documents`: `public = false`, `file_size_limit = 26214400`, PDF and DOCX MIME types only;
  - no storage policy for `anon` or `authenticated` on that bucket;
  - read policies of data-model.md §7 with `DROP POLICY IF EXISTS`;
  - direct `INSERT`, `UPDATE`, `DELETE` revoked on `document_slot`, `document`, `bilingual_document`, `bilingual_paragraph`, `project_glossary`, `location_document_type`;
  - helpers `app.can_proofread(uuid)`, `app.can_confirm_draft(uuid)` are `SECURITY DEFINER` with `search_path = ''` and read `project_member`, `organisation_user`, `collab_request` **and `nda_acceptance` (both `producer` and `partner` rows with `accepted`)** (D4, M4 NDA gate);
  - the partner read policies of `bilingual_document`, `bilingual_paragraph`, `project_glossary` require the same two NDA rows;
  - no `GRANT … TO anon`.
  - (FR-002, FR-006, SR-154, D1, D4, R12)
- [X] T006 [P] Create unit test of the storage adapter in tests/unit/project-documents-storage.test.js (R3, FR-002, SR-154):
  - `uploadPathFor(projectId, docCode, ext)` gives `<project>/<doc_code>/<uuid>.<pdf|docx>`; `draftPdfPathFor` gives `<project>/<doc_code>/drafts/<uuid>.pdf`;
  - `isPathOf(projectId, docCode, path)` refuses another project, another code, `..`, a leading slash and other extensions;
  - `MAX_BYTES = 26214400`; the allowed MIME types are PDF and DOCX;
  - the in-memory adapter: signed upload and download URLs with TTL 300 s and 60 s; `stat()` returns size and type; `remove()` works.
- [X] T007 [P] Create the new unit test tests/unit/check-errors.test.js (the file does not exist yet): `NOT_IN_KIT`, `FILE_TYPE`, `FILE_TOO_LARGE`, `LIMIT`, `EMPTY_PARAGRAPH` → 422, `UPLOAD_MISSING`, `TRANSLATION_UNAVAILABLE` → 409 through `lib/api/checks.js`; each has a `checks.api.<code>` key in vi.json and en.json.

### Implementation

- [X] T008 D1 through the generators, never by hand in data/ (approved by Nam Tran 11/11/2026; data owner Nguyễn Huy Trung to review before merge) (verifies T004):
  - tools/dm_model2.py: `DOCUMENT_TYPE.requirement_code`, `awaiting_confirmation`; entity `LOCATION_DOCUMENT_TYPE` with its two relationships and natural key;
  - tools/dm_model.py: catalogue, CRUD rows; the data-model M5 questions resolved per research R1, R2 (*which entity links SEGMENT_REQUIREMENT*, *who creates DOCUMENT_SLOT*, *stored or derived*, *which function edits a paragraph*);
  - tools/build_schema.py: `ck_document_type_location_no_requirement`;
  - tools/dm_rules.py: BR-003 and BR-004 evidence (Tràng An → heritage consent; segment C items awaiting confirmation);
  - data/seed/generate_seed.py, data/seed/seed_rules.py: data-model.md §2 seed table, the segments-match check, the location-basis check;
  - rebuild: `python3 tools/build_data.py --mermaid`, `python3 data/seed/generate_seed.py && python3 data/seed/check_seed.py` (PASS), `python3 tools/build_schema.py`, `python3 data/schema/load_check.py` (PASS), `python3 tools/build_dm_docs.py --mermaid`, `python3 tools/build_index.py`;
  - if an older test fails (table count 49 → 50 in tests/unit/migrations-schema.test.js, seed counts), stop and report it to Nam Tran.
- [X] T009 Add the read policies of data-model.md §7 at their source tools/rls_policies.py:
  - `location_document_type` select for `signed_in`;
  - `bilingual_document`, `bilingual_paragraph`, `project_glossary` select for project members and partner users with an `accepted` / `confirmed` request;
  - keep `('bilingual_paragraph', 'update', 'Partner', 13)` in `DEFERRED` with a comment that the M5 functions serve it (as M4 does; the coverage test reads the base migrations only).
  - Then `python3 tools/build_supabase.py` and `--check`. (R12, D4)
- [X] T010 Write supabase/migrations/20261111000100_m5_dossier.sql (verifies T005):
  - D1 columns, table and CHECK for the pushed database (existing rows backfilled; the D1 rows themselves come with `node scripts/seed-supabase.mjs --reset`);
  - bucket `project-documents`;
  - policies of T009 inline;
  - revokes;
  - helpers `app.can_proofread`, `app.can_confirm_draft`;
  - function stubs of data-model.md §6. Their bodies are completed in the story tasks that test them (T023, T043), each after its own static test.
  - Run on PGlite in the scratch folder, twice, on the database shape before and after D1.
  - *Done 11/11/2026*: helpers `app.can_read_draft`, `app.can_proofread`, `app.can_confirm_draft`; PGlite on the HEAD shape and the D1 shape, twice each: Lan (accepted, both NDA rows) reads the 14 Ferry paragraphs and may proofread, not confirm; with the partner NDA row removed she reads 0 and may not proofread; a view member reads but may not proofread; a member's direct insert into `document` is refused.
- [X] T011 [P] Implement lib/storage/project-documents.js on the pattern of lib/storage/org-documents.js: Supabase signed URLs, offline OS temp folder, in-memory adapter for tests; no `node:*` import reaches a client component (verifies T006)
- [X] T012 [P] Add the seven error codes to lib/checks/errors.js and their statuses to lib/api/checks.js; `checks.api.*` texts in lib/i18n/vi.json and lib/i18n/en.json (verifies T007)

**Checkpoint**: data, migration skeleton, bucket adapter and error codes in place — stories can start.

---

## Phase 3: User Story 1 — Know exactly which documents my segment needs (Priority: P1) 🎯 MVP

**Goal**: SC-26 lists the documents the project's segment needs, from `segment_requirement` and the shortlisted locations' `location_document_type`, each with its basis; members upload and replace PDF or DOCX files up to 25 MB; every download is logged (FR-001..FR-003, BR-003, BR-004, Q1, D1, SR-151..SR-155).

**Independent Test**: on *The Last Ferry*, the kit shows the four Article 13 rows *Required by law* (same states as SC-27), *Foreign crew list* *Commonly requested*, and *Heritage-site management board consent* *Location-specific* because Tràng An is shortlisted. An upload of component d turns it *Present* on SC-26, SC-27 and the Dossier gauge.

### Tests for User Story 1 (write first, see them fail) ⚠️

- [X] T013 [P] [US1] Create unit test of the pure kit function in tests/unit/document-kit.test.js, rows built in the test:
  - **R1 rules**: a type linked to a `needed` requirement is in; to a not-needed requirement, out; a common type by `segments`; a location type only with a matching shortlisted location and segment.
  - **BR-003**: every row has basis `law` / `common` / `location`, grouped in that order.
  - **Q1**: rows with `awaiting_confirmation` carry the flag.
  - **SC-26 Empty**: no shortlist → no location row and `location_note: true`.
  - **SC-26 #4**: the chip segment changes the rows and keeps the shortlist.
  - **BR-004**: the same function gives a different kit when only the input rows change; the source of lib/documents/kit.js contains no `doc_code`, requirement code or segment literal.
  - (FR-001, BR-003, BR-004, Q1, D1)
- [X] T014 [P] [US1] Create unit test of the kit and uploads on node:sqlite in tests/unit/documents-data.test.js (seed member, *The Last Ferry*):
  - *Part written 11/11/2026 (test-only run, red)*: Q1 — the D1 columns exist and *Monsoon Signal* gets exactly the segment C items of the seed, each flagged. The rest of this task is still to write.
  - **US-1 Sc1**: the four Article 13 rows in `law`, `FOREIGN_CREW_LIST` in `common`.
  - **US-1 Sc2**: `HERITAGE_SITE_PERMIT` in `location`. Deleting the Tràng An shortlist row in a rolled-back transaction removes it.
  - **BR-004**: setting `segment_requirement(A, VN_SERVICE_AGREEMENT).needed = false` in a rolled-back transaction removes `A13_SERVICE_AGREEMENT`.
  - **Q1**: *Monsoon Signal* (segment C) gets exactly the segment C non-location types, all flagged, and no Article 13 row. With a test shortlist of the public-place location, it also gets `LOCAL_PERMIT_PUBLIC_C`.
  - **SR-153**: the Article 13 states equal `getDossier()` for every seed project.
  - **G1**: `PROVINCIAL_NOTICE_COPY` is a `common` row of every A / B project and of no C project, with state from M7 — *The Last Ferry*, *Above the Terraces*, *Rice and Salt* `present` (approved notice downloaded); *Quiet Harbour Blues* (approved, `queued`) and *Lantern Street* (submitted) `missing` with the SC-32 action; expected values computed from `province_notice` in the test.
  - **Uploads**:
    - the `app_record_document` twin gives version 1 then 2, the slot `present`, and version 1 kept (FR-002, edge case *replaced*);
    - a view member → `FORBIDDEN`; an archived project → `ARCHIVED`; a code outside the kit → `NOT_IN_KIT`;
    - a path of another project → `VALIDATION_ERROR`.
  - **SR-154**: a download writes one `document_access_log` row.
  - (FR-001..FR-003, BR-003, BR-004, Q1, SR-153, SR-154)
- [X] T015 [P] [US1] Create unit test of file checks in tests/unit/documents-input.test.js:
  - `checkUpload({ filename, content_type, size })`: PDF and DOCX accepted; `.png`, `.doc` and a wrong MIME refused with `FILE_TYPE`; 0 bytes and 25 MB + 1 refused with `FILE_TOO_LARGE`, with the limit in `fields`; 25 MB exactly accepted.
  - `suggestDocCode(filename, kit)` (R14, SR-155): returns the best row, or `null`, and never assigns by itself.
  - (FR-002, SR-155, edge case *larger than 25 MB*)
- [X] T016 [P] [US1] Create contract test of the document routes with the Supabase fake and the in-memory storage in tests/contracts/documents-api.test.js (contracts/documents-api.contract.md):
  - 401 guest; 404 non-member and malformed id; `GET` kit shape;
  - `?segment=D` → 422;
  - `upload-url`: 422 `NOT_IN_KIT`, `FILE_TYPE`, `FILE_TOO_LARGE`; 422 `VALIDATION_ERROR` for `PROVINCIAL_NOTICE_COPY` (U3); 403 view member; 409 `ARCHIVED`;
  - record:
    - a stored object over 25 MB or of a wrong type is deleted and answers 422;
    - a missing object → 409 `UPLOAD_MISSING` and no row (edge case *upload fails midway*);
    - 201 `{ document_id, version, state }`;
  - download: 200 with a 60 s URL and one access-log row; 404 for a non-member.
- [X] T017 [P] [US1] Create unit test of the SC-26 view rules in tests/unit/documents-view.test.js:
  - group order and basis label keys;
  - *awaiting VFDA confirmation* on flagged rows;
  - *template pending VFDA* while `template_url` is a placeholder; no link without a template;
  - state keys shared with SC-27;
  - progress `present / total`;
  - row action by state (*View* / *Upload* / *Replace*), *View request* for component c, *Draft bilingual* on **every** row (I3; research Open question 11);
  - **U3**: the `PROVINCIAL_NOTICE_COPY` row never offers *Upload* / *Replace*; it offers *Open provincial notices* (link to `/projects/[id]/provinces`, SC-32) while missing and *View* (same link) once present;
  - every key in vi.json and en.json; no banned M2 word in the `documents.*` texts.
- [X] T018 [P] [US1] Create the static test of `app_record_document` in tests/unit/m5-migration-documents.test.js: `SECURITY DEFINER`, `search_path = ''`; the caller is owner or edit (`app.project_permission`); the project is not archived; the code is in the kit; the path starts with `<project>/<doc_code>/`; version = max + 1; slot upsert to `present`; EXECUTE revoked from `PUBLIC`, `anon` and granted to `authenticated`.
- [X] T019 [P] [US1] Add to tests/rls/rls.test.js (member fixtures only):
  - a member reads the slots and documents of their project and none of another;
  - a direct insert into `document` or `document_slot` is refused;
  - `location_document_type` is readable when signed in and not by `anon`;
  - the bucket `project-documents` lists nothing for the member's own client.
  - (SR-154, R12)

### Implementation for User Story 1

- [X] T020 [P] [US1] Implement lib/documents/kit.js `documentKit()` — pure, no literals (verifies T013)
- [X] T021 [P] [US1] Implement lib/documents/input.js `checkUpload`, `suggestDocCode` (verifies T015)
- [X] T022 [P] [US1] Implement lib/documents/view.js — groups, labels, progress, row actions; no `node:*` import (verifies T017)
- [X] T023 [US1] Complete `app_record_document` in supabase/migrations/20261111000100_m5_dossier.sql and run it on PGlite: first upload, replacement, view member refused, wrong path refused (verifies T018)
- [X] T024 [US1] Implement the data layer: `getKit()`, `recordDocument()`, `listVersions()`, `documentForDownload()` in lib/db/documents.js, lib/db/sqlite/documents.js, lib/db/supabase/documents.js. The kit reads `segment_requirement`, `document_type`, `project_shortlist`, `location_document_type`, `document_slot` and `v_dossier_check`; the download writes through `logDocumentView()` of lib/db/document-log.js. (verifies T014)
- [X] T025 [US1] Implement the routes, each `export const dynamic = 'force-dynamic'` (verifies T016):
  - app/api/projects/[id]/documents/route.js (GET, POST record);
  - app/api/projects/[id]/documents/upload-url/route.js;
  - app/api/documents/[id]/download/route.js.
- [X] T026 [US1] Build SC-26 in app/projects/[id]/documents/page.js and documents-client.js (contracts/screens.contract.md SC-26 #1–#13):
  - chips with `aria-pressed`; cards under 600 px;
  - upload area with *Choose file*, a client-side check, the suggestion confirmed by the user, upload to the signed URL with progress, then record and the success strip.
  - Also:
    - *Document kit* in app/projects/[id]/project-nav.js;
    - the SC-27 *Upload* row actions become links to SC-26 in app/projects/[id]/dossier/page.js (the SC-28 link waits for T046, analysis I8; M2 tests stay green);
    - `documents.*` and `dashboard.nav.documents` texts in lib/i18n/vi.json, lib/i18n/en.json.
- [ ] T027 [US1] Quickstart slice 1 on `cinematch-dev`, after Nam Tran's `npx supabase db push --remote` and `node scripts/seed-supabase.mjs --reset` (Nam Tran, seed member); results in specs/009-m5-dossier/quickstart.md §Results (US-1)

**Checkpoint**: the kit, uploads and downloads work and match SC-27 — demo before going on.

---

## Phase 4: User Story 2 — Get a Vietnamese draft I can proofread (Priority: P1)

**Goal**: SC-28 turns the English synopsis or script (pasted or DOCX) into aligned paragraphs:
- a Vietnamese machine draft only with the paid Gemini plan and the user's tick (Q3), with the glossary applied (BR-006);
- per-paragraph proofreading and confirmation by a confirmed partner (D4); an edit clears the mark;
- component b present only at 100 % (BR-002);
- a two-column PDF watermarked on every page (BR-001).

(FR-004..FR-006, D2–D4)

**Independent Test**:
- 14 English paragraphs give 14 *Machine translation · not proofread* paragraphs (mock).
- On *The Last Ferry*, 13 of 14 proofread leaves component b *Needs fixing* on SC-26, SC-27 and the gauge; the 14th makes it *Present*; one edit brings it back.
- The PDF has the watermark on every page.

### Tests for User Story 2 (write first, see them fail) ⚠️

- [X] T028 [P] [US2] Create unit test of paragraph splitting in tests/unit/draft-paragraphs.test.js (R4, FR-004, US-2 Sc1):
  - CRLF and multiple blank lines; trimming; inner whitespace collapsed; empty paragraphs dropped;
  - a 14-paragraph text gives 14 paragraphs in order;
  - limits: 101 paragraphs, 4,001 characters in one, 60,001 in all → `drafts.error.text`.
- [X] T029 [P] [US2] Create unit test of translation in tests/unit/draft-translate.test.js (R5, FR-004, Q3, BR-006, edge case *one paragraph fails*):
  - *Part written 11/11/2026 (test-only run, red)*: the Q3 gate — `GEMINI_PAID_TIER` false or unset → 0 calls; no tick (false, missing, `'true'`, `1`) → 0 calls; paid + tick → called (control). Mock mode, U1, batching, glossary and secrets are still to write.
  - **Q3 gating matrix**: the fake Gemini client is called only when `LLM_PROVIDER=gemini`, `GEMINI_PAID_TIER=true`, the key, the model and `consent === true` all hold. With any one missing it is never called and `method = "none"` with empty targets.
  - **Mock mode**: deterministic, with the glossary applied as whole words — only when `LLM_PROVIDER=mock` **and** `NODE_ENV !== 'production'`; with `NODE_ENV=production` and the provider unset or `mock`, nothing is translated and `method = "none"` (U1).
  - **Batching**: batches of at most 5; one batch throwing or timing out leaves only its `idx` in `failed`; an `idx` missing from an answer is failed; the retry of one `idx` sends only that paragraph.
  - **Glossary**: the prompt contains every glossary pair (BR-006).
  - **Secrets**: neither the key nor the text appears in any `console` output (console captured).
- [X] T030 [P] [US2] Create unit test of the glossary helpers in tests/unit/draft-glossary.test.js (R6, BR-006, SR-164):
  - `applyGlossary` matches whole words, case-insensitive, and leaves other words;
  - `glossaryMismatches` flags a paragraph with `term_en` in the source and without `term_vi` in the Vietnamese;
  - term validation 1–120 characters each; at most 200 per project; a duplicate term (case-insensitive) is refused.
- [X] T031 [P] [US2] Create unit test of DOCX reading in tests/unit/draft-docx.test.js (R10, D3): a `.docx` built in the test with the existing `docx` library gives, through `textFromDocx` and `splitParagraphs`, the same paragraphs as its text; a file without the `PK` signature and a 4 MB + 1 file are refused with `drafts.error.docx`.
- [X] T032 [P] [US2] Create unit test of the PDF in tests/unit/bilingual-pdf.test.js (R9, FR-005, BR-001, D2):
  - *Part written 11/11/2026 (test-only run, red)*: one wrapping `Page` with a `fixed` bilingual watermark, also at 100 % proofread; the rendered file has more than one page and the watermark's `render` callback reports **every** page (`onWatermarkPage`). The *Not proofread* flag, the font and the import check are still to write.
  - **Element tree** of `buildBilingualDocument()`:
    - exactly one `Page` with `wrap`;
    - a `fixed` node with the bilingual watermark text inside it;
    - every `machine` paragraph row has the *Not proofread* flag and no `reviewed` row has it;
    - the watermark is present with 100 % proofread.
  - **Render**: `renderBilingualPdf()` of 14 long paragraphs returns a Buffer starting `%PDF-` with more than one `/Type /Page` object.
  - **Font**: Noto Sans is registered from lib/pdf/fonts/.
  - **Import**: the module loads under `node --test` (no JSX).
- [X] T033 [P] [US2] Create unit test of drafts on node:sqlite in tests/unit/drafts-data.test.js (*The Last Ferry*: 14 paragraphs, 6 proofread in the seed):
  - *Part written 11/11/2026 (test-only run, red)*: BR-002 / US-2 Sc3 — with one paragraph left, b is not present in `getDossier()` and `getKit()`; the last one makes it present in both. The other bullets are still to write.
  - **US-2 Sc1**: `createDraft` with 14 paragraphs (mock) → 14 `machine`; creating again replaces the paragraphs.
  - **US-2 Sc2**: editing a reviewed paragraph → `machine`, `reviewed_*` cleared, slot `present` → `needs_fix`.
  - **US-2 Sc3 and BR-002**: reviewing the 8 remaining paragraphs one by one keeps b *needs fixing* (in `getDossier()`, `getKit()` and the M0 readiness view) until the 14th, then *present* in all three.
  - **Empty paragraph**: its review → `EMPTY_PARAGRAPH`.
  - **D4**:
    - owner and edit members proofread; a view member gets `FORBIDDEN`;
    - the Bến Xưa user (request `accepted`, both NDA rows in the seed) reads the draft and proofreads (`reviewer_org_id` set) and cannot confirm;
    - **NDA gate (I1)**: with the partner's `nda_acceptance` row removed (or `accepted = false`) in a rolled-back transaction, the same user gets `NOT_FOUND` for the draft, cannot proofread, and no answer contains `synopsis_en` or `source_text`;
    - with that request set to `confirmed` in a rolled-back transaction, the user confirms the whole document;
    - a user of a partner with a `withdrawn` request gets `NOT_FOUND`.
  - **BR-006**: a term saved for *The Last Ferry* is used by its next draft (mock) and not by another project's draft.
  - (FR-004, FR-006, BR-002, BR-006, D4, M4 NDA gate)
- [X] T034 [P] [US2] Create contract test of the draft routes with the Supabase fake and the fake Gemini client in tests/contracts/drafts-api.test.js (contracts/drafts-api.contract.md):
  - 401 / 404; JSON and multipart creation; 422 text, DOCX, `NOT_IN_KIT`;
  - `translate`: 409 `TRANSLATION_UNAVAILABLE` without the paid plan or the tick;
  - `PATCH` / `review` / `confirm`: statuses and 403 by role (D4); 422 `EMPTY_PARAGRAPH`;
  - `pdf`: 200 with a 60 s URL and `pdf_url` saved;
  - glossary: GET, POST 201, 422, DELETE 204.
- [X] T035 [P] [US2] Create unit test of the SC-28 view rules in tests/unit/drafts-view.test.js:
  - progress and the DRAFT strip text with the count;
  - the green strip at 100 %;
  - status texts *Not translated yet* / *Chưa có bản dịch* for an empty Vietnamese paragraph (A1), *Machine translation · not proofread* / *Proofread by {name} ({organisation}) on {date}*;
  - *✓ Proofread* only on non-empty `machine` paragraphs with `can_proofread`; *Confirm whole document* only with `can_confirm`;
  - `consentVisible` only when `GEMINI_PAID_TIER=true`;
  - the mismatch highlight text;
  - every key in vi.json and en.json; no banned M2 word in `drafts.*` / `glossary.*`.
- [X] T036 [P] [US2] Create the static test of the draft functions in tests/unit/m5-migration-drafts.test.js. For `app_create_bilingual`, `app_edit_paragraph`, `app_review_paragraph`, `app_confirm_bilingual`, `app_set_bilingual_pdf`, `app_save_glossary_term`, `app_delete_glossary_term`:
  - `SECURITY DEFINER`, `search_path = ''`, grants as data-model.md §6;
  - edit clears `reviewed_by`, `reviewer_org_id`, `reviewed_at` and lowers the slot from `present`;
  - review and confirm refuse empty targets and set the slot `present` when no `machine` paragraph is left;
  - confirm uses `app.can_confirm_draft`; `app.can_proofread` and `app.can_confirm_draft` require both `nda_acceptance` rows for a partner (I1).
- [X] T037 [P] [US2] Add to tests/rls/rls.test.js (member fixtures only): a member reads the drafts, paragraphs and glossary of their project and none of another; a direct update of `bilingual_paragraph` or insert into `project_glossary` is refused (R12).

### Implementation for User Story 2

- [X] T038 [P] [US2] Implement lib/drafts/paragraphs.js `splitParagraphs` and limits (verifies T028)
- [X] T039 [P] [US2] Implement lib/drafts/glossary.js `applyGlossary`, `glossaryMismatches`, `validateTerm` (verifies T030)
- [X] T040 [P] [US2] Implement lib/drafts/docx.js `textFromDocx` with `mammoth.extractRawText`, signature and 4 MB checks (verifies T031)
- [X] T041 [US2] Implement lib/drafts/translate.js and lib/drafts/gemini-translator.js: the Q3 gate, the mock translator, batches of 5 with a 15 s timeout, structured output `[{ idx, target_text }]`, the glossary in the prompt, per-paragraph failure, no logging of text or key (verifies T029)
- [X] T042 [P] [US2] Implement lib/pdf/bilingual-pdf.js `buildBilingualDocument`, `renderBilingualPdf` with `React.createElement`, Noto Sans and the `fixed` watermark (verifies T032)
- [X] T043 [US2] Complete the draft functions and glossary functions in supabase/migrations/20261111000100_m5_dossier.sql. Run them on PGlite: create, edit after review (slot lowered), review to 14/14 (slot present), confirm by a confirmed partner, refusals for view member and empty paragraph. (verifies T036)
- [X] T044 [US2] Implement the data layer: `listDrafts()`, `getDraft()`, `createDraft()`, `translateDraft()`, `editParagraph()`, `reviewParagraph()`, `confirmDraft()`, `exportPdf()` in lib/db/drafts.js and `listTerms()`, `saveTerm()`, `deleteTerm()` in lib/db/glossary.js, with the sqlite and supabase sources (lib/db/sqlite/{drafts,glossary}.js, lib/db/supabase/{drafts,glossary}.js). The PDF is stored through lib/storage/project-documents.js. (verifies T033)
- [X] T045 [US2] Implement the routes, each `force-dynamic` (verifies T034):
  - app/api/projects/[id]/drafts/route.js;
  - app/api/projects/[id]/drafts/[docCode]/route.js (GET, POST JSON or multipart);
  - …/translate/route.js, …/pdf/route.js, …/confirm/route.js;
  - …/paragraphs/[idx]/route.js (PATCH), …/paragraphs/[idx]/review/route.js;
  - app/api/projects/[id]/glossary/route.js, app/api/projects/[id]/glossary/[term]/route.js.
- [X] T046 [US2] Build SC-28 in app/projects/[id]/bilingual/[docCode]/page.js (the Screen Spec route) and draft-editor.js (contracts/screens.contract.md SC-28 #1–#13):
  - paste box and `.docx` picker; consent box only with the paid plan; *Translating paragraph n / N*;
  - textareas `lang="vi"` with a 2 s autosave and the save error kept on screen; *✓ Proofread*; *Confirm whole document* with a dialog;
  - glossary with the mismatch highlight; DRAFT and green strips; *Export two-column PDF*; sync scroll stored with try/catch;
  - one column below 768 px.
  - Also:
    - *Bilingual drafts* in app/projects/[id]/project-nav.js;
    - *Draft bilingual* on SC-26 links here;
    - the SC-27 *Draft Vietnamese version* action links here (app/projects/[id]/dossier/page.js; I8);
    - `drafts.*`, `glossary.*`, `dashboard.nav.drafts` in lib/i18n/vi.json, lib/i18n/en.json.
  - (verifies T035)
- [ ] T047 [US2] Quickstart slice 2 on `cinematch-dev` (Nam Tran, seed member and the Bến Xưa user; Gemini only with a paid key and invented scripts); results in specs/009-m5-dossier/quickstart.md §Results (US-2)

**Checkpoint**: drafts, proofreading, glossary and the PDF work; component b follows BR-002 on every screen.

---

## Phase 5: User Story 3 — See my recommended filing date (Priority: P1)

**Goal**: the countdown from the first shooting day uses the one M2 calculation (FR-007, FR-008, BR-005, Q7). SC-29 was built in M2 (`008-m2-check` US-4); M5 adds its own entry point `GET /api/projects/:id/countdown` (contracts/countdown-api.contract.md), a thin route over `getTimeline()`, test first (analysis C1).

**Independent Test**: `GET /api/projects/<The Last Ferry>/countdown` (15/03/2027, buffer 7) answers 05/01/2027 and 02/02/2027, the same as SC-29, SC-27 and SC-12; filing on 02/02/2027 with one resubmission gives 02/04/2027.

### Tests for User Story 3 (write first, see them fail) ⚠️

- [X] T048 [P] [US3] Create tests/unit/m5-countdown.test.js (contracts/countdown-api.contract.md). Every assertion calls the M5 entry point `GET /api/projects/:id/countdown` (app/api/projects/[id]/countdown/route.js, which does not exist yet), so the whole file is **red** before T049; no code is broken on purpose (analysis C1). Record the red run (failing test names and the error) in the build log.
  - *Part written 11/11/2026 (test-only run, red: the route does not exist)*: BR-005 — the M5 route equals the M2 route, `licensingTimeline()` and the M0 SC-12 strip (`stripView`) for *The Last Ferry* and *Quiet Harbour Blues*; US-3 Sc1–2. FR-008, the edge case, the static checks and the 404 cases are still to write.
  - **BR-005**: for *The Last Ferry* and *Quiet Harbour Blues*, the route's `timeline_view` equals `licensingTimeline()` of lib/licensing/timeline.js computed in the same test from the seed project row and `public_holiday`.
  - **US-3 Sc1**: *The Last Ferry* → `recommended = 2027-01-05`, `latest = 2027-02-02`; with `?submit=2027-02-02`, `resubmission.result_by_worst = 2027-04-02`, after the shooting day.
  - **US-3 Sc2**: the Tết 2027 band inside the window has `expected: true`.
  - **FR-007**: the route echoes the stored `shoot_date` and `buffer_days`; setting them stays M0's `PATCH /api/projects/:id`, tested red-first in M2 T055.
  - **FR-008**: both paths always present; late milestones flagged.
  - **Edge case**: *Quiet Harbour Blues* → `recommended_passed` with the number of days.
  - **Static**: the route imports `getTimeline` and no date-counting code; lib/documents/ and lib/drafts/ import no date-counting code.
  - 404 for a non-member and a malformed id (Supabase fake).

### Implementation for User Story 3

- [X] T049 [US3] Implement app/api/projects/[id]/countdown/route.js: `force-dynamic`, membership as M2's timeline route, answer `{ timeline_view: await getTimeline(...) }` with no other calculation (verifies T048). If T048 shows a difference from `licensingTimeline()`, record it in research.md R11 and ask Nam Tran before changing lib/licensing/timeline.js. (FR-007, FR-008, BR-005)
  - *Done 11/11/2026*: no gap found — the route answers M2's getTimeline unchanged. The rest of T048 (FR-008, the passed date, the static checks, 404) was written after this task and was green at once (recorded in the build log).
- [ ] T050 [US3] Quickstart slice 3 on `cinematch-dev` (Nam Tran); results in specs/009-m5-dossier/quickstart.md §Results (US-3)

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T051 [P] Check every new text and layout:
  - `node scripts/check-i18n.mjs`, tests/unit/i18n-no-hardcoded.test.js, tests/unit/banned-words.test.js;
  - SC-26 and SC-29 at 360 px; SC-28 at 768 px and 360 px (in an iframe of that width, build-log Entry 10).
  - *Offline part done 11/11/2026*: check-i18n complete, hard-coded-text and banned-words tests pass. The 360 / 768 px check needs a signed-in browser session (Nam Tran).
- [ ] T052 Run the full checks: `npm test`, `npm run build`, `npm run build:ci-check` (no route prerendered; fonts traced), `uv run tools/start_feature.py --check`, `python3 tools/build_supabase.py --check`, `python3 data/seed/check_seed.py`, `python3 data/schema/load_check.py`. Online by Nam Tran: `npm run test:rls`, `npm run check:supabase`. Time the PDF of a 14-paragraph draft (under 5 s, plan.md Performance Goals).
  - *Offline part done 11/11/2026*: all offline checks pass (quickstart §Results); PDF of 14 paragraphs 132 ms cold. Online part due: `npm run test:rls`, `npm run check:supabase`.
- [X] T053 Add the build-log entry in docs/build/build-log.md and the AI-use row in docs/ai-use-log.md:
  - the feature row;
  - the run entry with who ran and who reviewed (reviewer cells left empty until a person reviews);
  - agent mistakes in §4;
  - spec-issue rows for research Open questions 1–12;
  - the red run of T048 (failing test names and error before T049).

---

## Not in this plan

- Submitting the dossier to the Ministry (phase 3); certified translation; M6 paperwork.
- Text from an English PDF (research Open question 6).
- An admin screen for `document_type` and `location_document_type` (Known limitation 2).
- SC-29 #13 reminder e-mails and the `.ics` file (SYS F-SYS-08).
- Redrawing the SC-26 and SC-28 mockup images (`build_docs.py --img`, Playwright not installed).

---

## Traceability: rule or scenario → test → code

| Rule / scenario | Test (written first) | Code that turns it green |
|---|---|---|
| BR-001 — draft watermark on every page; nothing submitted | T032, T034 | T042, T044, T045 |
| BR-002 — b present only at 100 % proofread; an edit clears it | T033, T036, T034 | T043, T044 (M2 view unchanged) |
| BR-003 — every item has its basis | T004, T013, T014, T017 | T008, T020, T022 |
| BR-004 — kit from `segment_requirement` + shortlisted locations, no hard-coding | T004, T013, T014 | T008, T020, T024 |
| BR-005 — one countdown calculation | T048 | T049 (route over M2's `getTimeline`) |
| BR-006 — project glossary on every later draft | T029, T030, T033 | T039, T041, T044 |
| Q1 — segment C minimum list, *awaiting VFDA confirmation* | T004, T013, T014, T017 | T008, T020, T022 |
| Q3 — Gemini only with paid plan + tick | T029, T034, T035 | T041, T045, T046 |
| Q7 — working days | T048 | T049 (M2 calculation) |
| D1 — kit configuration through the generators | T004, T005 | T002, T008, T009, T010 |
| D2 — PDF with react-pdf, font, storage | T032, T034 | T003, T042, T044 |
| D3 — DOCX source | T031, T034 | T003, T040, T045 |
| D4 — who proofreads and confirms, behind the M4 NDA gate | T005, T033, T034, T036 | T010, T043, T044 |
| FR-002 / edge cases — 25 MB, type, replace, failed upload | T006, T014, T015, T016 | T011, T021, T023, T024, T025 |
| SR-153 — same Article 13 states as SC-27 | T014, T016 | T024 |
| SR-154 — private files, downloads logged | T005, T006, T014, T016, T019 | T010, T011, T024, T025 |
| SR-155 — suggested item confirmed by the user | T015 | T021, T026 |
| Edge case — one paragraph fails to translate | T029, T034 | T041, T045 |
| Edge case — recommended date passed | T048 | T049 |
| G1 — provincial notice copy from M7 | T014, T017 | T024, T022 |
| U1 — no fake translation in production | T029 | T041 |
| A1 — *Not translated yet* | T035 | T046 |
| US-1 Sc1–2 | T013, T014, T016 | T020, T024, T025, T026 |
| US-2 Sc1–3 | T028, T029, T033, T034 | T038, T041, T043, T044, T046 |
| US-3 Sc1–2 | T048 | T049 |

---

## Dependencies & Execution Order

**Phase order**: Phase 1 → Phase 2 (blocks every story) → US-1 → US-2 → US-3 → Phase 6. US-3 depends only on Phase 1 (T001) and may run at any time. US-2 needs the kit rows of US-1 for its *Draft bilingual* entry, and its `NOT_IN_KIT` check reads `documentKit()` (T020).

**Prerequisites**:
- T002 changes the spec and screen sources (approved with D1, D3, D4).
- T008 changes `data/` through the generators; the data owner reviews before merge.
- T027, T047, T050 and the online part of T052 need `npx supabase db push --remote` and `node scripts/seed-supabase.mjs --reset` by Nam Tran.

**Tests first within each phase**: T004–T007 before T008–T012; T013–T019 before T020–T026; T028–T037 before T038–T046; T048 before T049 (T048 red because the route does not exist).

**Order between tasks**:
- T002 before T008 (the §6.1 types are asserted by `dm_model2.py`);
- T008 before T009 before T010; T010 before every Supabase source and every function task (T023, T043);
- T003 before T040 and T042;
- T011 before T024 and T044; T012 before T025 and T045;
- T020 before T024 before T025 before T026; T026 before T046 (the SC-27 → SC-28 link is added in T046);
- T038, T039, T040, T041, T042 before T044; T043 before T044 before T045 before T046.

**Rule**: no test is changed to make it pass. When a test turns out wrong, the reason is reported and the change approved first.

### Parallel opportunities

- Phase 2 tests T004–T007 together; then T011 and T012 in parallel with T008–T010.
- US-1 tests T013–T019 together; then T020, T021, T022 in parallel.
- US-2 tests T028–T037 together; then T038, T039, T040, T042 in parallel (T041 alone: it touches translate and gemini-translator).
- US-3 (T048) can run in parallel with any story.

### Parallel example: User Story 1

```text
T013 tests/unit/document-kit.test.js
T014 tests/unit/documents-data.test.js
T015 tests/unit/documents-input.test.js
T016 tests/contracts/documents-api.test.js
T017 tests/unit/documents-view.test.js
T018 tests/unit/m5-migration-documents.test.js
T019 tests/rls/rls.test.js (online, run later by npm run test:rls)
— all seen failing — then:
T020 lib/documents/kit.js ‖ T021 lib/documents/input.js ‖ T022 lib/documents/view.js
T023 migration app_record_document → T024 lib/db/documents.js → T025 routes → T026 SC-26
```

### Parallel example: User Story 2

```text
T028 tests/unit/draft-paragraphs.test.js
T029 tests/unit/draft-translate.test.js
T030 tests/unit/draft-glossary.test.js
T031 tests/unit/draft-docx.test.js
T032 tests/unit/bilingual-pdf.test.js
T033 tests/unit/drafts-data.test.js
T034 tests/contracts/drafts-api.test.js
T035 tests/unit/drafts-view.test.js
T036 tests/unit/m5-migration-drafts.test.js
T037 tests/rls/rls.test.js (online)
— all seen failing — then:
T038 paragraphs ‖ T039 glossary ‖ T040 docx ‖ T042 pdf;  T041 translate
T043 migration functions → T044 lib/db/drafts.js, glossary.js → T045 routes → T046 SC-28
```

---

## Implementation Strategy

1. **Foundation**: Phases 1–2 — sources, dependencies, the D1 data change, migration skeleton, storage and error codes, checked against the seed.
2. **MVP** (US-1): the document kit with uploads, matching SC-27; demo it before going on.
3. **Drafts** (US-2): paragraphs, translation gate, proofreading, glossary, PDF; component b follows BR-002.
4. **Countdown** (US-3): the M5 countdown route over the M2 calculation, test first; change the calculation only if a gap is shown and approved.
5. Stop after any phase with green tests; record the result and the open questions in the build log.
