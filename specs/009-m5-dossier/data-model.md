# Data model: Dossier kit, bilingual drafts and countdown (M5)

Feature: `009-m5-dossier`
- **Source of truth**: `data/data-model-M5.md`, `data/schema/schema-M5.sql`.
- **Change D1** (decided by Nam Tran, 11/11/2026) is made **only through the generators**: `tools/dm_model.py`, `tools/dm_model2.py`, `tools/build_schema.py`, `tools/dm_rules.py`, `tools/specs_types.py`, `tools/rls_policies.py`, `data/seed/generate_seed.py`, `data/seed/seed_rules.py`. Never by hand in `data/`.
- **Review**: the data owner (Nguyễn Huy Trung) reviews before merge.

## 1. Tables used

| Table | Owner | Use here |
|---|---|---|
| `document_type` | M5 | kit configuration (+ D1 columns) |
| `location_document_type` | M5 | **new** (D1): which shortlisted location brings which location-specific document |
| `document_slot` | M5 | stored state per project and document (R2) |
| `document` | M5 | uploaded versions (FR-002) |
| `bilingual_document`, `bilingual_paragraph` | M5 | drafts and proofreading (FR-004..FR-006) |
| `project_glossary` | M5 | BR-006 |
| `public_holiday` | M5 | read by the M2 timeline (US-3) |
| `segment_requirement` | M1 | `needed` per segment and requirement (BR-004) |
| `project`, `project_member` | M0 | segment, shooting day, buffer; permissions |
| `project_shortlist`, `location` | M3 | shortlisted locations |
| `collab_request`, `organisation_user`, `nda_acceptance` | M4 | partner access to drafts: request `accepted` / `confirmed` and both NDA rows (D4) |
| `province_notice`, `location_interest` | M7 | state of `PROVINCIAL_NOTICE_COPY` (G1) |
| `document_access_log` | M4 | one row per download (SR-154) |
| `v_dossier_check` | M2 (view) | state of the four Article 13 rows (SR-153) |

## 2. Changes (D1)

### `document_type` — new columns

| Column | Type | Required | Notes |
|---|---|---|---|
| `requirement_code` | `VARCHAR(40)` | No | `segment_requirement.requirement_code` that brings the document into a kit (R1). Not a foreign key: the key of `segment_requirement` is (segment, requirement_code). `seed_rules.py` checks that the code exists for every segment in `segments`. |
| `awaiting_confirmation` | `BOOLEAN` | Yes | true → *awaiting VFDA confirmation* label (Q1). |

New CHECK `ck_document_type_location_no_requirement`: `basis = 'location'` ⇒ `requirement_code IS NULL`.

### `location_document_type` — new table (owner M5)

| Column | Type | Required | Key |
|---|---|---|---|
| `location_id` | `UUID` | Yes | PK, FK → `location` |
| `doc_code` | `VARCHAR(40)` | Yes | PK, FK → `document_type` |

`seed_rules.py` checks that every `doc_code` here has `basis = location`. Relationships to add to the ERD:
- `LOCATION ||--o{ LOCATION_DOCUMENT_TYPE` (*requires*);
- `DOCUMENT_TYPE ||--o{ LOCATION_DOCUMENT_TYPE` (*is required at*).

### Seed after D1 (`data/seed/generate_seed.py`)

| doc_code | basis | segments | requirement_code | awaiting_confirmation | Change |
|---|---|---|---|---|---|
| `A13_APPLICATION` | law | A, B | `ART13_LICENCE` | false | code set |
| `A13_SCRIPT_VI` | law | A, B | `ART13_LICENCE` | false | code set |
| `A13_SERVICE_AGREEMENT` | law | A, B | `VN_SERVICE_AGREEMENT` | false | code set |
| `A13_ART9_COMMITMENT` | law | A, B | `ART13_LICENCE` | false | code set |
| `FOREIGN_CREW_LIST` | common | A, B | — | false | — |
| `PROVINCIAL_NOTICE_COPY` | common | A, B | — | false | — (spec §10 question 4) |
| `HERITAGE_SITE_PERMIT` | location | A, B | — | false | — |
| `SERVICE_CONTRACT_C` | common | C | `SERVICE_CONTRACT` | **true** | code and flag set |
| `CREW_PASSPORT_VISA_C` | common | C | `CREW_VISA` | **true** | **new** (Q1: crew passports and visas) |
| `SHOOTING_SCHEDULE_C` | common | C | — | **true** | **new** (Q1: shooting schedule with locations) |
| `LOCAL_PERMIT_PUBLIC_C` | location | C | — | **true** | **new** (Q1: local permit when shooting in a public place) |

- **Names.** The Vietnamese and English names of the new rows are written from the wording of Q1 and marked in `dm_rules.py` as *awaiting VFDA confirmation*.
- **`location_document_type` seed**: Tràng An Landscape Complex → `HERITAGE_SITE_PERMIT` (matches the existing *The Last Ferry* slot), and one public-place location → `LOCAL_PERMIT_PUBLIC_C`, used only by tests. No segment C project shortlists it.
- **Counts.** 50 tables. Row counts change by the 3 new types and the 2 link rows; `check_seed.py` and `load_check.py` must print PASS.
- **Specs.** `tools/specs_types.py` gets the §6.1 types of the two columns and the table. `start_feature.py --refresh` then updates the snapshot.

## 3. States

### Kit row (computed, SC-26 #9)

| Row | State shown |
|---|---|
| Article 13 a–d | `v_dossier_check.state` (M2) |
| `PROVINCIAL_NOTICE_COPY` (A, B) | from M7: `present` when the project has a `province_notice` with `review_status = approved` and `sent_at` set (first download, M7 D1); otherwise `missing` (G1; research R1). **No Upload / Replace** (U3): *Open provincial notices* (→ SC-32) while missing, *View* (→ SC-32) once present |
| any other | `document_slot.state`, or `missing` without a slot |

### `document_slot.state` (stored; R2)

```text
(no row) ──first upload──▶ present ──replace──▶ present (version + 1)
(no row | needs_fix | missing) ──last paragraph of the draft proofread──▶ present
present ──a proofread paragraph of that draft edited──▶ needs_fix
```

`pending` and the other `needs_fix` cases are not set by an M5 function. M2's view still lowers `present` for b (a paragraph not proofread) and c (no confirmed request).

### `bilingual_paragraph.status`

```text
machine ──✓ Proofread (can_proofread) or Confirm whole document (can_confirm_draft)──▶ reviewed
reviewed ──any edit of target_text──▶ machine   (reviewed_by, reviewer_org_id, reviewed_at cleared — SR-163)
```

A paragraph with an empty `target_text` cannot become `reviewed` (SC-28 #6). Creating the draft again replaces every paragraph with `machine`.

## 4. Derived values (computed on read, not stored)

| Value | Computed from | Used by |
|---|---|---|
| Kit rows | R1 rule over `segment_requirement`, `document_type`, `project_shortlist`, `location_document_type`, slots, `v_dossier_check`, M7 notices | SC-26 |
| Kit progress | count of `present` rows / rows | SC-26 #12 |
| Proofreading progress | count of `reviewed` / paragraphs | SC-28 #4, #10 |
| Glossary mismatches | source contains `term_en` and Vietnamese lacks `term_vi` | SC-28 interaction 4 |
| Recommended date, latest deadline, both paths | `licensingTimeline()` (M2) | SC-29, SC-27, SC-12 (BR-005) |
| `project_meta` | built in SQL from `project` when the draft is created: title, segment, format, first shooting day | `bilingual_document`, the PDF header |

## 5. Validation

Values marked * are interim (research Open question 7).

| Input | Rule | Error key |
|---|---|---|
| upload `doc_code` | in the project's kit (R1) | `documents.error.not_in_kit` |
| upload `doc_code` | not `PROVINCIAL_NOTICE_COPY`, whose state comes from M7 (U3) | `documents.error.not_uploadable` |
| upload type | `.pdf` (`application/pdf`) or `.docx` (`…wordprocessingml.document`); the stored object is checked again after upload | `documents.error.type` |
| upload size | 1 byte … 25 MB (26,214,400 bytes), declared and stored | `documents.error.size` |
| uploader | owner or edit member; project not archived (M0 `ARCHIVED`) | `checks.api.forbidden` / `archived` |
| English text | 1…100* paragraphs after `splitParagraphs`, each ≤ 4,000* characters, total ≤ 60,000* | `drafts.error.text` |
| English DOCX | `.docx` (magic `PK`), ≤ 4 MB* (route body limit) | `drafts.error.docx` |
| `doc_code` of a draft | in the project's kit | `documents.error.not_in_kit` |
| consent | boolean; ignored unless `GEMINI_PAID_TIER=true` | — |
| paragraph `target_text` | trimmed; ≤ 8,000* characters; may be empty while `machine` | `drafts.error.target` |
| proofread | `target_text` not empty; `can_proofread` | `drafts.error.empty` / `checks.api.forbidden` |
| confirm whole document | no empty paragraph; `can_confirm_draft` | `drafts.error.empty` / `checks.api.forbidden` |
| glossary term | `term_en` 1–120, `term_vi` 1–120, ≤ 200* terms per project, unique per project (case-insensitive) | `glossary.error.term`, `glossary.error.limit`, `glossary.error.exists` |
| shooting day, buffer (US-3) | M0 rules: after today; 0 / 7 / 14 / 21 (M2 D10) | `projects.error.*` (existing) |

## 6. Functions (Postgres `SECURITY DEFINER`, `search_path = ''`, each with a node:sqlite twin)

Permission helpers:
- `app.project_permission()` (M0) gives *owner / edit / view*;
- **new** `app.draft_reviewer_org(project_id)`: the partner organisation recorded in `reviewer_org_id` (null for a member);
- **new** `app.can_proofread(project_id)`: owner or edit member, or a user of a partner organisation whose request for the project is `accepted` or `confirmed` **with both `nda_acceptance` rows** (`producer`, `partner`, `accepted = true`); `app.can_confirm_draft(project_id)`: the partner case with `confirmed` only (R7, D4). The same partner condition gates every read of a draft: **new** `app.can_read_draft(project_id)` = any project member (view included) or that partner;
- `app.is_org_user()` (M4).

| Function | Who | Effect | Errors |
|---|---|---|---|
| `app_record_document(p_project_id, p_doc_code, p_file_path)` → `{ document_id, version }` | owner / edit | checks the path prefix `<project>/<doc_code>/`, refuses `PROVINCIAL_NOTICE_COPY` (U3); the kit itself is checked by the data layer before the call (both sources), with the stored object; inserts `document` (version = max + 1, `uploaded_by = auth.uid()`, `uploaded_at` now); upserts the slot as `present` | `FORBIDDEN`, `ARCHIVED`, `NOT_IN_KIT`, `VALIDATION_ERROR` |
| `app_create_bilingual(p_project_id, p_doc_code, p_synopsis_en, p_paragraphs jsonb)` → paragraph count | owner / edit | upserts `bilingual_document` (`structure_version`: `art13-script-v1` for `A13_SCRIPT_VI` as in the seed, `<lower(doc_code) with - for _>-v1` for other codes — analysis I7; `project_meta` from `project`, `pdf_url` null); replaces its paragraphs with (idx 1…n, source, '' , `machine`); a `present` slot of that code goes back to `needs_fix` (a new draft is not proofread) | `FORBIDDEN`, `ARCHIVED`, `NOT_IN_KIT`, `VALIDATION_ERROR` |
| `app_edit_paragraph(p_project_id, p_doc_code, p_idx, p_text)` | owner / edit, or `can_proofread` | sets `target_text`; `status = machine`; clears `reviewed_*`; slot `present` → `needs_fix` when the paragraph was reviewed. Also used to store machine translations. | `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR` |
| `app_review_paragraph(p_project_id, p_doc_code, p_idx)` | `can_proofread` | `status = reviewed`, `reviewed_by`, `reviewer_org_id`, `reviewed_at`; the slot becomes `present` when it was the last paragraph | `FORBIDDEN`, `NOT_FOUND`, `EMPTY_PARAGRAPH` |
| `app_confirm_bilingual(p_project_id, p_doc_code)` → count marked | `can_confirm_draft` | marks every remaining `machine` paragraph as above; the slot becomes `present` | `FORBIDDEN`, `NOT_FOUND`, `EMPTY_PARAGRAPH` |
| `app_set_bilingual_pdf(p_project_id, p_doc_code, p_path)` | owner / edit (the server after rendering) | `pdf_url = p_path` | `FORBIDDEN`, `NOT_FOUND` |
| `app_save_glossary_term(p_project_id, p_term_en, p_term_vi)` | owner / edit | upsert by (project, `lower(term_en)`) | `FORBIDDEN`, `VALIDATION_ERROR`, `LIMIT` |
| `app_delete_glossary_term(p_project_id, p_term_en)` | owner / edit | delete | `FORBIDDEN`, `NOT_FOUND` |

- **Grants**: EXECUTE is revoked from `PUBLIC` and `anon` and granted to `authenticated`.
- **Direct writes**: INSERT, UPDATE and DELETE on `document_slot`, `document`, `bilingual_document`, `bilingual_paragraph`, `project_glossary`, `location_document_type` are revoked from `anon` and `authenticated`.
- **Migration**: `20261111000100_m5_dossier.sql` is safe on the database before and after D1 (`IF NOT EXISTS`, idempotent) and is run twice on PGlite.
- **Bucket**: `project-documents` (private, 25 MB, PDF and DOCX), created in the same migration.

## 7. Read policies (source `tools/rls_policies.py`)

| Table | Who reads |
|---|---|
| `document_type`, `location_document_type`, `public_holiday` | `signed_in` |
| `document_slot`, `document` | project members (existing) |
| `bilingual_document`, `bilingual_paragraph`, `project_glossary` | project members, and users of a partner organisation whose request for the project is `accepted` or `confirmed` **and has both NDA rows** (D4). An `accepted` partner without both rows reads none of them, `synopsis_en` included. |

The deferred row `('bilingual_paragraph', 'update', 'Partner')` stays in `DEFERRED`, as M4 keeps its partner writes there: it is served by `app_review_paragraph` / `app_confirm_bilingual`, which the coverage test (it reads the base migrations only) cannot see.

## 8. Dictionary keys (prefixes)

| Prefix | Content |
|---|---|
| `documents.*` | SC-26: title, groups, the three basis labels, *awaiting VFDA confirmation*, *template pending VFDA*, states (shared with SC-27 `dossier.state.*`), row actions, progress, segment chips, *Added once you confirm a location*, upload area and errors, success strip *Added to document kit — rechecking against Article 13*, suggestion *Looks like: {document} — confirm* |
| `drafts.*` | SC-28: picker, progress, columns, statuses *Not translated yet* / *Chưa có bản dịch* (empty Vietnamese, analysis A1), *Machine translation · not proofread* / *Proofread by {name} on {date}*, *✓ Proofread*, *Confirm whole document*, DRAFT strip, green strip *Fully proofread. Item b has been updated in the dossier check.*, *Create Vietnamese draft*, consent box, *Machine draft not available…*, *Translating paragraph {n} / {total}*, *Could not translate — retry this paragraph*, autosave states, export, PDF labels (watermark, *Not proofread*) |
| `glossary.*` | list, *+ Add term*, errors, mismatch highlight |
| `dashboard.nav.documents`, `dashboard.nav.drafts` | sidebar |

No banned M2 word in any of them; the deadline texts are the M2 ones (D8).
