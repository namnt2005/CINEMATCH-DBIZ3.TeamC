# Contract: Admin Locations Management API (M3)

Feature: `001-m3-core`  
Source: `specs/001-m3-core/spec.md` (FR-001, FR-002, FR-003, FR-004, FR-005, BR-004, BR-008, BR-010)  
Screen: `SC-35` (Admin — Locations)  

---

## 1. Create Location (18-Field Template)

- **Endpoint**: `POST /api/admin/locations`
- **Auth**: Required (`role = 'vfda_staff'`)

### Request
```json
{
  "name_vi": "Đầm Vân Long",
  "name_en": "Van Long Wetland Nature Reserve",
  "province_id": 14,
  "district": "Gia Viễn",
  "lat": 20.354000,
  "lng": 105.867000,
  "airport_km": 100,
  "scene_types": ["karst", "river", "floating_village"],
  "desc_vi": "Khu bảo tồn thiên nhiên đất ngập nước lớn nhất vùng đồng bằng Bắc Bộ...",
  "desc_en": "The largest wetland nature reserve in the Northern Delta...",
  "crew_capacity": "15_50",
  "lodging_20km": true,
  "grid_power": true,
  "truck_access": true,
  "months_to_avoid": [7, 8],
  "permit_complexity": "medium",
  "restriction_note": "Special protection zone for Delacour's langur.",
  "availability": "open"
}
```

### Response (201 Created)
```json
{
  "location_id": "c5d4e3f2-4444-4000-8000-000000000004",
  "slug": "van-long-wetland-nature-reserve",
  "intake_status": "awaiting_contact",
  "published": false,
  "created_at": "2026-10-12T13:00:00Z"
}
```

---

## 2. Record & Verify Authority Contact

- **Endpoint**: `PUT /api/admin/locations/:id/authority-contact`
- **Auth**: Required (`role = 'vfda_staff'`)

### Request
```json
{
  "authority_name": "Ban Quản lý Khu bảo tồn Đất ngập nước Vân Long",
  "contact_name": "Trần Thị Mai",
  "contact_phone": "+84 229 386 5432",
  "contact_email": "vanlong.reserve@ninhbinh.gov.vn",
  "contact_verified": true
}
```

### Response (200 OK)
```json
{
  "location_id": "c5d4e3f2-4444-4000-8000-000000000004",
  "contact_verified": true,
  "verified_by": "00000000-0000-0000-0000-000000000001",
  "verified_at": "2026-10-12T13:05:00Z"
}
```

---

## 3. Publish Location (Database Constraint Guarded)

- **Endpoint**: `PUT /api/admin/locations/:id/publish`
- **Auth**: Required (`role = 'vfda_staff'`)

### Request
```json
{
  "publish": true
}
```

### Success Response (200 OK)
```json
{
  "location_id": "c5d4e3f2-4444-4000-8000-000000000004",
  "intake_status": "published",
  "published": true,
  "published_at": "2026-10-12T13:06:00Z"
}
```

### Error Response (400 Bad Request — Unverified Contact)
```json
{
  "error": "UNVERIFIED_CONTACT",
  "message": "Cannot publish location: local authority contact is not verified (BR-004).",
  "blocked_reason": "Authority contact verification required before publishing."
}
```
*Database Enforcement:* `CHECK (contact_verified = true)` triggered on publishing attempt.
