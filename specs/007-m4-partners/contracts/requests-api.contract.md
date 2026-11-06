# Contract: collaboration requests, NDA and messages (FR-012..FR-017, BR-005, BR-006, BR-009)

Feature: `007-m4-partners` · [research.md](../research.md) R6, R7, R13, R14 · state machine: [data-model.md](../data-model.md) §4

Errors as in [partners-api.contract.md](partners-api.contract.md), plus 409 `OPEN_REQUEST_EXISTS`, 409 `ARCHIVED`, 409 `ORG_DEACTIVATED`, 409 `INVALID_STATE` (a move the state machine does not allow, including any change of a final request), 422 `NDA_REQUIRED`.

*Producer* = a project member with permission `owner` or `edit` (M0). *View* members read only. *Partner* = a user of the request's organisation.

| Route | Who | Body | Answer |
|---|---|---|---|
| `POST /api/requests` | producer | `{ project_id, org_id, services: [1+ of the 12], note? (≤ 1000) }` | **201** `{ request_id, status: "pending", step: 1 }`; one notification per party, in-app and by email (US-2 Scenario 1, FR-015) |
| `GET /api/requests?project_id=` | project members | | **200** `{ requests: [...] }` of that project, most recently updated first (SC-25 #3) |
| `GET /api/requests?direction=incoming` | partner | | **200** the organisation's requests, open ones first (FR-013) |
| `GET /api/requests?direction=outgoing` | signed-in member | | **200** the requests of every project the caller is an accepted member of, most recently updated first, each with its project (FR-013, analysis C3) |
| `GET /api/requests/:id` | project members, partner | | **200** below |
| `POST /api/requests/:id/respond` | partner | `{ decision: under_review \| info_requested \| accepted \| declined, note? (≤ 2000), nda_accepted? }` | **200**; `accepted` needs `nda_accepted: true` (partner NDA row) else 422 `NDA_REQUIRED`; a note becomes a message (BR-009); one notification per party |
| `POST /api/requests/:id/nda` | producer | `{ nda_version: "NDA-2026.1", accepted: true }` | **200**; only on `accepted`; opens the private layer for the project's members once the partner's row exists (US-4 Scenario 1); a stale version is 422; there is no *decline* body — not agreeing means not ticking (`accepted: false` is 422; analysis U3) |
| `POST /api/requests/:id/confirm` | producer | | **200** `{ status: "confirmed", confirmed_at }`; only from `accepted` with the producer NDA (else 422 `NDA_REQUIRED`); one notification per party; **no** `document_slot` write (BR-006) |
| `POST /api/requests/:id/withdraw` | producer | `{ note? }` | **200** `{ status: "withdrawn" }` from an open status; one notification per party |
| `POST /api/requests/:id/messages` | producer, partner | `{ body: 1–2000 }` | **201** `{ message_id, created_at }`; other side notified; messages are never edited (no PATCH / DELETE route; database trigger) |

Send refusals: `ARCHIVED` (archived project, SR-343), `ORG_DEACTIVATED` (SR-346), `OPEN_REQUEST_EXISTS` (*You already have an open request with this partner*), 422 for services or note, 403 for a *view* member or a non-member, 404 for an unknown project or organisation.

## `GET /api/requests/:id`

```json
{
  "request_id": "…", "status": "accepted", "step": 4, "final": false,
  "project": { "project_id": "…", "project_name": "…", "format": "…", "shoot_date": "…", "crew_size_band": "…" },
  "organisation": { "slug": "…", "org_name": "…", "verified": true, "art13_eligible": true },
  "services": ["full_production"], "note": "…",
  "sent_at": "…", "responded_at": "…", "confirmed_at": null,
  "messages": [{ "message_id": "…", "author": "partner" | "producer", "author_name": "…", "body": "…", "created_at": "…" }],
  "nda": { "version": "NDA-2026.1", "producer": true, "partner": true },
  "can": { "respond": false, "accept_nda": false, "confirm": true, "withdraw": true, "message": true },
  "component_c": "missing" | "pending" | "present",
  "quiet_days": 3
}
```
- `step` (D7, five steps): 1 `pending`; 2 `under_review`, `info_requested`; 3 `accepted`; 4 `accepted` with the producer NDA; 5 `confirmed`; `null` for `declined` / `withdrawn` (SR-141).
- `can` is computed from the caller's side and the state machine; the server enforces the same rules again on each action.
- `component_c` per R14; `quiet_days` = days since `sent_at` without a partner response (SC-25 shows the withdraw hint from 14, research Open question 4).

Notifications (R13, FR-015): **every status change creates one notification for each party** — the organisation's users and the project's accepted members — in the app (SYS `notify`) and by email through Resend (System); a new message notifies the other side. A failed email is recorded as `bounced` on the notification's `email_delivery` row; without `RESEND_API_KEY` it stays `queued`; the action succeeds either way.
