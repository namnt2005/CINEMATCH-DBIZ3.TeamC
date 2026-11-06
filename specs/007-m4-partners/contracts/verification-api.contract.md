# Contract: VFDA Verified and the Article 13 flag (FR-008..FR-011, BR-004, Q2, Q3)

Feature: `007-m4-partners` · [research.md](../research.md) R8, R9, R10

Errors as in [partners-api.contract.md](partners-api.contract.md), plus 409 `PENDING_EXISTS`, 422 `FILE_INVALID`.

## Partner side (SC-22; role `partner`, acting for the organisation)

| Route | Body | Answer |
|---|---|---|
| `POST /api/partners/me/verification/upload` | `{ size, content_type: "application/pdf" }` | **200** `{ path, upload_url, expires_in: 300 }` — a signed upload URL for `org-documents/<org_id>/verification/<uuid>.pdf`; 422 when `size` > 25 MB or not PDF; 409 `PENDING_EXISTS` |
| `POST /api/partners/me/verification` | `{ path, reference_projects: [..] }` | **201** `{ verification_request_id, status: "pending", submitted_at }` — the server checks the object (exists under the organisation's folder, ≤ 25 MB, starts with `%PDF-`) else 422 `FILE_INVALID`; ≥ 2 non-empty references else 422; staff notified |
| `GET /api/partners/me/verification` | | **200** `{ current: {...} \| null, history: [{ status, submitted_at, decided_at, reason }] }` newest first (SC-22 #12) |
| `GET /api/partners/me/verification/:id/document` | | **200** `{ url, expires_in: 60 }` — signed download URL of the organisation's own file |

Offline (node:sqlite) `upload_url` points to `PUT /api/dev/org-documents/<path>` (development only), which writes to the OS temp folder. Every `/api/dev/*` route answers **404 when `NODE_ENV=production`**, whatever the caller (analysis U1).

## Staff side (SC-36; `vfda_staff`, `admin`; middleware guards `/admin` and `/api/admin`)

| Route | Body / query | Answer |
|---|---|---|
| `GET /api/admin/verification?status=` | `pending \| approved \| rejected \| all` (default `pending`) | **200** `{ counts: { pending, approved, rejected }, oldest_pending_days, requests: [{ request_id, org: { org_id, org_name, hq_province, legal_form, founded_year, provinces, service_groups, art13_eligible }, status, submitted_at, decided_at, submitted_by_name, reference_projects, reason }] }` — pending first (oldest first), then newest decision first (SC-36 #3–#6) |
| `GET /api/admin/verification/:id/document` | | **200** `{ url, expires_in: 60 }`; 404 `{ error: "FILE_MISSING" }` for seed paths with no file |
| `POST /api/admin/verification/:id/decision` | `{ decision: "approved" \| "rejected", reason? }` | **200** `{ status, decided_at, verified_at?, verified_until? }` — reason 1–1000 required to reject; only from `pending` (409 `INVALID_STATE`); one `audit_log` row per decision; the organisation's users notified (with the reason) |
| `POST /api/admin/organisations/:id/art13` | `{ on: true \| false, business_line_confirmed: true }` | **200** `{ art13_eligible }` — `on: true` needs `business_line_confirmed: true` (Q3) else 422; one `audit_log` row per change |

## Reminder (FR-011)

`app_remind_expiring_verifications()` — run daily by a guarded `pg_cron` job and by `npm run verification:remind`; returns the number of organisations reminded; notifies (in-app and email) the users of each organisation whose badge ends within 30 days, once per `verified_until`. The badge itself disappears by the read rule (`verified_until >= today`).
