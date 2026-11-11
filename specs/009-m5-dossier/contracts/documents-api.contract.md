# Contract: document kit, upload, replace, download (SC-26)

Feature: `009-m5-dossier` · [research.md](../research.md) R1, R2, R3, R14 · FR-001..FR-003 · BR-003, BR-004 · Q1, D1

**All routes**:
- signed in; project members read;
- `404` for a project the caller is not on, as in M0, and for a malformed id;
- `export const dynamic = 'force-dynamic'`;
- error bodies `{ error, message, fields? }` through `lib/api/checks.js`.

**New codes in `lib/checks/errors.js`**: `NOT_IN_KIT` (422), `FILE_TYPE` (422), `FILE_TOO_LARGE` (422), `UPLOAD_MISSING` (409).

| Route | Who | Body | Answer |
|---|---|---|---|
| `GET /api/projects/:id/documents` | project members | `?segment=A\|B\|C` optional (chip view, read-only) | **200** — see *Kit response* below. Without a shortlisted location: `location_note: true` and no location rows. 422 for an unknown segment. |
| `POST /api/projects/:id/documents/upload-url` | owner or edit | `{ doc_code, filename, content_type, size }` | **200** `{ path, upload_url, expires_in: 300 }`; 422 `NOT_IN_KIT`, `FILE_TYPE`, `FILE_TOO_LARGE` (with the limit in `fields`); 403 view member; 409 `ARCHIVED` |
| `POST /api/projects/:id/documents` | owner or edit | `{ doc_code, path }` | The server reads the stored object; wrong type or over 25 MB → the object is deleted and 422 `FILE_TYPE` / `FILE_TOO_LARGE`; no object → 409 `UPLOAD_MISSING`. Otherwise `app_record_document` → **201** `{ document_id, version, state: "present" }` |
| `GET /api/documents/:id/download` | project members | | writes `document_access_log`, then **200** `{ url, expires_in: 60 }`; 404 otherwise |

**Kit response** of `GET /api/projects/:id/documents`:

```text
{ segment, viewing_segment, editable,
  groups: [{ basis: "law" | "common" | "location",
             rows: [{ doc_code, name_vi, name_en, basis, awaiting_confirmation, template_url,
                      state: "present" | "needs_fix" | "pending" | "missing",
                      latest: { document_id, version, uploaded_at, uploaded_by_name } | null,
                      versions, actions: ["view" | "upload" | "replace" | "request" | "notice" | "notice_view" | "draft"] }] }],
  progress: { present, total },
  differences: [{ segment, label_vi, label_en, needed }],
  location_note: boolean }
```

Notes on the kit response:
- `differences` comes from `segment_requirement` (SC-26 #11).
- The four Article 13 rows take `state` from `v_dossier_check`.
- `PROVINCIAL_NOTICE_COPY` (A, B, *Commonly requested*) takes `state` from M7: `present` when an approved notice of the project has been downloaded (`sent_at` set), otherwise `missing` (G1). The row has **no Upload / Replace** (U3): `action: "notice"` (*Open provincial notices* → SC-32) while missing, `action: "view"` (→ SC-32) once present; `upload-url` and record refuse its code with 422 `VALIDATION_ERROR` (`fields.doc_code = documents.error.not_uploadable`).
- Every row has the action *Draft bilingual* as well (`draft: true`), `A13_SCRIPT_VI` first in the SC-28 picker (I3).

**Guarantees tested**:
- **US-1 Sc1** (*The Last Ferry*, segment A): the four Article 13 rows in group `law`; `FOREIGN_CREW_LIST` in `common`.
- **US-1 Sc2**: Tràng An is shortlisted, so `HERITAGE_SITE_PERMIT` is in `location`. After removing the shortlist row in the test transaction, it is gone and `location_note` is true.
- **BR-004** (in a rolled-back transaction, no code change):
  - setting `segment_requirement(A, VN_SERVICE_AGREEMENT).needed = false` removes `A13_SERVICE_AGREEMENT`;
  - adding a `location_document_type` row adds that document;
  - no `doc_code` string appears in `lib/documents/kit.js`.
- **BR-003**: every row has one of the three bases.
- **Q1**: a segment C project gets the four segment C items, each with `awaiting_confirmation: true`, and no Article 13 row.
- **SR-153**: the four Article 13 states equal `GET /api/projects/:id/dossier` for every seed project.
- **U3**: the `PROVINCIAL_NOTICE_COPY` row never has `action: "upload"`; `upload-url` with that code → 422 `VALIDATION_ERROR` and no storage path is issued.
- **G1**: `PROVINCIAL_NOTICE_COPY` is in the `common` group of every A / B project and of no C project. From the seed: *The Last Ferry*, *Above the Terraces*, *Rice and Salt* → `present` (an approved notice downloaded); *Quiet Harbour Blues* (approved, still `queued`) and *Lantern Street* (submitted) → `missing` with `action: "notice"`. Expected values are computed from `province_notice` in the test.
- **Edge cases**:
  - 25 MB + 1 byte, or a `.png`, refused at `upload-url` and again at record;
  - a replacement gives version 2 while version 1 stays listed;
  - an upload that never reached storage creates no row (`UPLOAD_MISSING`).
- **SR-154**: a download writes one access-log row, and a non-member gets 404.
