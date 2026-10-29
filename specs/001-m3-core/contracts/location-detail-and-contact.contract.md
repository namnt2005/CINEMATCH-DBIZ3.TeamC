# Contract: Location Detail & Authority Contact API (M3)

Feature: `001-m3-core`  
Source: `specs/001-m3-core/spec.md` (FR-013, FR-014, FR-015, BR-004, BR-005)  
Screen: `SC-16` (Location Detail)  

---

## 1. Location Detail

Returns public location details, photos, logistics, and nearby locations within 30 km.

- **Endpoint**: `GET /api/locations/:slug`
- **Auth**: Public (Guest allowed)

### Response (200 OK)
```json
{
  "location_id": "a3b2c1d0-1111-4000-8000-000000000001",
  "slug": "trang-an-landscape-complex",
  "name_vi": "Quần thể danh thắng Tràng An",
  "name_en": "Trang An Landscape Complex",
  "province": {
    "province_id": 14,
    "name": "Ninh Bình",
    "region": "north"
  },
  "district": "Hoa Lư",
  "coordinates": {
    "lat": 20.250000,
    "lng": 105.900000
  },
  "airport_km": 95,
  "scene_types": ["karst", "river", "cave"],
  "desc_vi": "Vùng non nước kỳ vĩ với hệ thống hang động xuyên thủy và di tích lịch sử...",
  "desc_en": "A majestic landscape of limestone karst peaks permeated with valleys and caves...",
  "logistics": {
    "crew_capacity": "o50",
    "lodging_20km": true,
    "grid_power": true,
    "truck_access": true
  },
  "season": {
    "months_to_avoid": [7, 8],
    "notes": "Rainy season in July-August may raise water levels inside caves."
  },
  "permit_complexity": "medium",
  "availability": "open",
  "images": [
    {
      "image_url": "https://images.cinematch.vn/locations/trang-an-01.jpg",
      "image_source": "VFDA Archive",
      "usage_right": "Editorial and promotional use permitted"
    }
  ],
  "nearby_locations": [
    {
      "location_id": "b4c3d2e1-2222-4000-8000-000000000002",
      "slug": "tam-coc-bich-dong",
      "name_en": "Tam Coc - Bich Dong",
      "distance_km": 8.4
    }
  ],
  "has_verified_contact": true
}
```
*Security Rule:* Authority phone and email are NOT included in this payload.

---

## 2. Gated Authority Contact (RLS)

Returns verified local authority contact information. Enforced by Row Level Security in Postgres and route authorization middleware.

- **Endpoint**: `GET /api/locations/:id/authority-contact`
- **Auth**: Required (`role IN ('member', 'vfda_staff')`)

### Unauthenticated Response (401 Unauthorized / 403 Forbidden)
```json
{
  "error": "UNAUTHENTICATED",
  "message": "Local authority contacts are available to signed-in members only.",
  "signup_url": "/auth/signup"
}
```

### Authenticated Response (200 OK)
```json
{
  "location_id": "a3b2c1d0-1111-4000-8000-000000000001",
  "authority_name": "Sở Văn hóa và Thể thao tỉnh Ninh Bình (Ninh Binh DoST)",
  "contact_name": "Nguyễn Văn Hùng",
  "contact_phone": "+84 229 387 1234",
  "contact_email": "vanhoa.ninhbinh@gov.vn",
  "contact_verified": true,
  "verified_at": "2026-08-15T09:00:00Z"
}
```
