# Contract: Admin Locations API (M3 US-3)

Feature: `002-m3-publish`
Source: [spec.md](../spec.md) FR-001..FR-005, BR-004, BR-008, BR-010; `docs/screens/screen-spec-SC-35.md` SR-311..SR-317; M10 FR-008 / BR-005
Screen: `SC-35` (Admin — Locations)
Supersedes for this feature: `specs/001-m3-core/contracts/admin-locations.contract.md` (18 fields, `PUT …/publish`; see [research.md](../research.md) R7)

## 0. Rules for every endpoint

- **Auth**: `x-mock-role: vfda_staff` until the SYS sign-in slice (gate G2). No role → `401 UNAUTHENTICATED`; any other role → `403 FORBIDDEN`. The acting staff member is the mock staff user ([research.md](../research.md) R3).
- **Audit**: every successful change writes the audit rows listed in [data-model.md](../data-model.md) §3 in the same transaction. A refused or invalid request writes none.
- **No delete**: `DELETE /api/admin/locations/:id` → `405 METHOD_NOT_ALLOWED` with `"message": "Locations are unpublished, never deleted (M3 BR-008)."`
- **Unknown id** → `404 NOT_FOUND`. **Validation error** → `422 VALIDATION_ERROR` with every failing field.

```json
{ "error": "VALIDATION_ERROR", "fields": { "lat": "Must be between 8 and 24 (inside Vietnam).", "scene_types": "Choose at least one scene type." } }
```

## 1. List locations — FR-001

`GET /api/admin/locations?status=&q=&province_id=`

- `status`: `awaiting_contact` | `published` | `unpublished`; omitted = all.
- `q`: name search, with or without Vietnamese diacritics, ≤ 200 characters.
- `province_id`: one of the 34 provinces.

**200**

```json
{
  "counts": { "all": 11, "awaiting_contact": 1, "published": 9, "unpublished": 1 },
  "locations": [
    {
      "location_id": "162abff9-9986-52d0-80a6-75fd4e7403f5",
      "slug": "mui-ne",
      "name_vi": "Đồi cát Mũi Né",
      "name_en": "Mũi Né Sand Dunes",
      "province": "Lâm Đồng",
      "intake_status": "awaiting_contact",
      "availability": "open",
      "contact_verified": false,
      "verified_at": null,
      "photo_count": 1,
      "pending_photo_count": 0,
      "blocked_reason": "Authority contact not verified (M3 BR-004)."
    }
  ]
}
```

`counts` always cover the whole catalogue, not only the filtered rows (SC-35 #3).

## 2. Get one location — SC-35 editor

`GET /api/admin/locations/:id`

**200**: the 20 fields of [data-model.md](../data-model.md) §1, plus `location_id`, `slug`, `intake_status`, `published`, `blocked_reason`, `can_publish`, and

```json
{
  "authority_contact": {
    "authority_name": "UBND phường Mũi Né",
    "contact_name": "Phan Văn Lộc",
    "contact_phone": "+84 000 000 109",
    "contact_email": null,
    "contact_verified": false,
    "verified_by_name": "Lê Hoàng Phúc",
    "verified_at": null
  },
  "photos": [
    { "image_url": "https://storage.cinematch.example/locations/mui-ne/01.jpg", "image_source": "…", "usage_right": "…", "status": "hidden" }
  ]
}
```

`authority_contact` is `null` when none is recorded. Photos are read-only in this feature (D3).

## 3. Create a location — FR-002

`POST /api/admin/locations` with the 20 fields:

```json
{
  "name_vi": "Đầm Vân Long",
  "name_en": "Van Long Wetland Nature Reserve",
  "province_id": 19,
  "district": "Gia Viễn",
  "lat": 20.354,
  "lng": 105.867,
  "airport_km": 100,
  "scene_types": ["karst", "river", "floating_village"],
  "desc_vi": "Khu bảo tồn đất ngập nước…",
  "desc_en": "A wetland nature reserve…",
  "crew_capacity": "15_50",
  "lodging_20km": true,
  "grid_power": true,
  "truck_access": true,
  "months_to_avoid": [7, 8],
  "permit_complexity": "medium",
  "restriction_note": "Protected langur habitat.",
  "availability": "open",
  "night_shooting_allowed": "ask",
  "rainy_months": [6, 7, 8]
}
```

**201** (audit: `location.create`)

```json
{
  "location_id": "…",
  "slug": "van-long-wetland-nature-reserve",
  "intake_status": "awaiting_contact",
  "published": false
}
```

**409 `SLUG_TAKEN`** when the slug made from `name_en` already exists ([research.md](../research.md) R6, Open question 4). Any `intake_status` or `published` in the body is ignored: a new location always starts as `awaiting_contact`.

## 4. Update a location — FR-002, BR-010

`PUT /api/admin/locations/:id` with any of the 20 fields. The status and the slug do not change.

**200**: the updated location (as §2). Audit: `location.update` when a field other than `availability` changed; `location.availability` when `availability` changed; none when nothing changed.

## 5. Save the authority contact — FR-004, SR-314

`PUT /api/admin/locations/:id/authority-contact`

```json
{ "authority_name": "UBND phường Mũi Né", "contact_name": "Phan Văn Lộc", "contact_phone": "+84 000 000 109", "contact_email": null }
```

**200** (audit: `location.update`)

```json
{ "location_id": "…", "contact_verified": false, "verified_by_name": "Nguyễn Thị Thu Hà", "verified_at": null }
```

Any change of these fields sets `contact_verified = false` and empties `verified_at`. A published location stays published (D4); the public contact API then answers 404 for it until the contact is verified again.

## 6. Verify the authority contact — FR-004

`POST /api/admin/locations/:id/authority-contact/verify` (no body; the screen asks for confirmation first)

**200** (audit: `location.contact_verify`)

```json
{ "location_id": "…", "contact_verified": true, "verified_by_name": "Nguyễn Thị Thu Hà", "verified_at": "2026-10-30T10:05:00+07:00" }
```

**409 `NO_CONTACT`** when no contact is recorded.

## 7. Publish — FR-005, BR-004, SR-311

`POST /api/admin/locations/:id/publish` (also *Publish again* for an unpublished location)

**200** (audit: `location.publish`)

```json
{ "location_id": "…", "intake_status": "published", "published": true, "blocked_reason": null }
```

**409 `UNVERIFIED_CONTACT`** — refused by the database trigger `trg_location_publish_needs_contact`; nothing changes except `blocked_reason`; no audit row.

```json
{
  "error": "UNVERIFIED_CONTACT",
  "message": "Cannot publish: the local authority contact is not verified (M3 BR-004).",
  "blocked_reason": "Authority contact not verified (M3 BR-004)."
}
```

**409 `INVALID_TRANSITION`** when the location is already published.

## 8. Unpublish — BR-008

`POST /api/admin/locations/:id/unpublish`

```json
{ "reason": "The floating village has moved ashore." }
```

`reason` is optional ([research.md](../research.md) Open question 3) and is stored in `blocked_reason`.

**200** (audit: `location.unpublish`)

```json
{ "location_id": "…", "intake_status": "unpublished", "published": false, "blocked_reason": "The floating village has moved ashore." }
```

The row is kept; `GET /api/locations/:slug` answers 404 for it; shortlists keep it (BR-008). **409 `INVALID_TRANSITION`** when the location is not published.
