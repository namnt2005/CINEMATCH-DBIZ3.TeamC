# Contract: provincial notices API (FR-001..FR-004, BR-001..BR-003)

Feature: `006-m7-support` · [data-model.md](../data-model.md) §3–§4 · [research.md](../research.md) R1–R7

Signed-in users only (401 otherwise). Error bodies `{ error, message, fields? }` with the English message; screens translate from the code. A malformed id is 404 before any database call (`isUuid`, M0). Writes go through the functions of data-model §4.

**No endpoint sends a notice** (BR-001).

| Route | Who | Body / query | Answer |
|---|---|---|---|
| `POST /api/projects/:id/interests` | owner / *edit* | `{ location_id }` | **201** `{ interest_id, notice_id, created }` (`created = false` when the location joined the province's open notice); 404 non-member or unknown location; 403 *view*; 409 `ARCHIVED`, `NO_AUTHORITY_CONTACT`, `ALREADY_SENT` (the province's letter was already downloaded) |
| `GET /api/projects/:id/notices` | members | | **200** `{ notices: [{ notice_id, province: { id, name }, locations: [{ location_id, name }], review_status, review_note, delivery_status, recipient, drafted_at, sent_at, responded_at, response, note, can_submit, missing: ['shoot_date'] }] }`, one per province |
| `POST /api/notices/:id/submit` | owner / *edit* | | **200** `{ review_status: 'submitted' }`; 409 `INVALID_STATE`; 422 `SHOOT_DATE_REQUIRED` (US-1 Scenario 2) |
| `POST /api/notices/:id/download` | owner / *edit* | `{ recipient: peoples_committee \| culture_department }` | **200** `{ delivery_status, recipient, sent_at }`; the first call records `recipient`, `delivery_status = downloaded`, `sent_at`, later calls change nothing; 403 *view*; 404 not approved or not a member; 422 unknown recipient |
| `GET /api/notices/:id/letter?format=docx&recipient=` | every member of the project | `recipient` as above | **200** .docx attachment (BR-002 sentence included); **read-only — records nothing** (analysis U2); 404 when not approved or not a member; 422 unknown recipient |
| `POST /api/notices/:id/reply` | owner / *edit*, or VFDA staff | `{ response: received \| info_needed \| cannot_support, note? }` | **200** the notice; 409 `INVALID_STATE` (not downloaded); 422 `VALIDATION_ERROR` (BR-003); staff entry: audit row + notification |
| `GET /api/admin/notices?status=submitted` | `vfda_staff`, `admin` | `status` ∈ draft, submitted, changes_requested, approved | **200** `{ notices: [{ notice_id, project_name, province, submitted_at, summary, letter_preview }] }`; 401 / 403 |
| `POST /api/admin/notices/:id/review` | `vfda_staff`, `admin` | `{ decision: approve \| request_changes, note? }` | **200** `{ review_status }`; 409 `INVALID_STATE` (not submitted); 422 `NOTE_REQUIRED`; one `audit_log` row per call (`notice.approve` / `notice.request_changes`) in the same transaction |

Print page (D4): `/projects/[id]/provinces/[noticeId]/print?recipient=` renders the same letter for *Save as PDF*; it records nothing — the *Download PDF* button sends `POST /api/notices/:id/download` first; 404 when not approved.

SC-32 download buttons: owner / *edit* → `POST …/download`, then the GET; *view* → the GET only (the recipient already chosen, or a choice that is not recorded).

Notifications:
- to the project members on review: `province_notice.approved`, `province_notice.changes_requested`;
- on a staff-entered reply: `province_notice.received`, `province_notice.info_needed`, `province_notice.cannot_support`.
