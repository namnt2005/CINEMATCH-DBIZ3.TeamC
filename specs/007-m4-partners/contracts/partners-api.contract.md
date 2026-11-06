# Contract: partner directory and organisation profiles (FR-001..FR-006, BR-001, BR-002, BR-008)

Feature: `007-m4-partners` · [research.md](../research.md) R3, R5, R11, R12, R16 · [data-model.md](../data-model.md)

Errors (all routes): `{ error, message, fields? }` — 401 `UNAUTHENTICATED`, 403 `FORBIDDEN`, 404 `NOT_FOUND` (also for a malformed id or slug), 409 `INVALID_STATE` / `ORG_DEACTIVATED`, 422 `VALIDATION_ERROR` with `fields` (dictionary keys). Every text the screens show comes from `lib/i18n`; the API returns codes and keys.

## `GET /api/partners` — directory (SC-19; guests and signed in)

Query: `q` (≤ 80 characters, accents ignored), `group` (one of the 12), `province` (province id), `language` (ISO 639-1; **applied only when signed in**, research Open question 7), `verified_only` (`true` by default; `false` shows unverified organisations with `verified: false`).

**200**
```json
{
  "groups": [{ "value": "full_production", "count": 4 }],
  "organisations": [{
    "slug": "ben-xua-production-services", "org_name": "…", "service_groups": ["full_production"], "provinces": [19],
    "verified": true, "verified_month": "2026-06", "art13_eligible": true,
    "member": { "intl_project_count": 7, "working_languages": ["en", "ko"] }
  }]
}
```
- Only `org_status` ≠ `deactivated`.
- `verified` = badge valid today (Vietnam date); `verified_month` only when `verified`; `art13_eligible` only true while `verified` (research Open question 6).
- `member` is **absent for guests** — the user client reads `organisation_member_layer` under RLS, which returns nothing to `anon` (US-1 Scenario 2, SC-003).
- `groups` counts the organisations of the same filtered set per group (SC-19 #3); all 12 values always listed, in the fixed order.
- 422 for a `group` outside the 12, a non-numeric `province`, a `language` that is not 2 lower-case letters, `q` over 80.

## `GET /api/partners/:slug` — profile (SC-20)

**200**
```json
{
  "public": { "org_id": "…", "slug": "…", "org_name": "…", "legal_form": "…", "founded_year": 2015, "hq_province": 19,
              "service_groups": [], "provinces": [], "verified": true, "verified_at": "…", "verified_until": "2027-06-12",
              "art13_eligible": true, "active": true, "checked": { "approved_at": "…", "references": ["…", "…"] } },
  "member": { "capability_desc_vi": "…", "capability_desc_en": "…", "portfolio": ["…"], "intl_project_count": 7, "working_languages": ["ko"] },
  "private": { "rate_card": [], "past_clients": [], "direct_contact": "…" },
  "layers": { "public": true, "member": true, "private": false },
  "my_request": { "request_id": "…", "status": "accepted" }
}
```
- `member` only when signed in; `private` only when RLS returns the row (R3); `layers` says which were returned, from the rows actually read — never computed apart from them (SC-20 #12).
- `checked` = the latest approved `verification_request` (date and the references as submitted) while Verified; the page adds the fixed *what was checked / not checked* text (R8).
- `my_request` = the caller's open or confirmed request to this organisation from any of their projects, else `null` (SC-20 #13 *View request*).
- A deactivated organisation: 200 with `active: false`, no member or private layer (SR-346).

## `GET /api/partners/me` — my organisation (SC-21; role `partner`)

**200** `{ "organisation": { …public, org_status }, "member": {…} | null, "private": {…} | null, "verification": { "status": "pending" | "approved" | "rejected" | null, "reason": "…", "verified_until": "…" } }` — the organisation the caller acts for (`organisation_user`). 403 for any other role; 404 when the partner account has no organisation.

## `PATCH /api/partners/me` — save the profile (FR-001)

Body: any of `org_name`, `legal_form`, `founded_year`, `hq_province`, `service_groups`, `provinces`, `capability_desc_vi`, `capability_desc_en`, `portfolio`, `working_languages`, `rate_card`, `past_clients`, `direct_contact` (validation: data-model §5). `verified_at`, `verified_until`, `art13_eligible`, `org_status`, `slug` are refused with 422 (SR-326). Through `app_save_org_profile`; live at once (D3). **200** = the same shape as `GET`. 409 `ORG_DEACTIVATED` after deactivation.

## `POST /api/partners/me/deactivate` — BR-008

Body `{ "typed_name": "<org_name>" }`. **200** `{ "org_status": "deactivated", "withdrawn": 2 }` — open requests closed as `withdrawn`, their project members notified; 422 when the name does not match.
