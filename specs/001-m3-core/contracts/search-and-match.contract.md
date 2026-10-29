# Contract: Search & Scene Matching API (M3)

Feature: `001-m3-core`  
Source: `specs/001-m3-core/spec.md` (FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012)  
Screens: `SC-14` (Location Suggestions), `SC-15` (Scene Description)  

---

## 1. Extract Scene Attributes

Extracts structured attributes from free-text scene description using LLM with fixed catalog validation.

- **Endpoint**: `POST /api/locations/extract-scene`
- **Auth**: Public (Guest allowed)

### Request
```json
{
  "scene_description": "A ferry landing at dawn between limestone karsts, 1970s, a waterside village, about 30 extras, night scenes too",
  "shoot_month": 11,
  "project_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
}
```
*Validation:* `scene_description` must be between 10 and 1000 characters.

### Response (200 OK)
```json
{
  "query_id": "c1f72782-b13c-449e-b9ef-603ea40899bf",
  "extracted_attributes": {
    "scene_types": ["karst", "floating_village", "river"],
    "era": "1970s",
    "time_of_day": "dawn",
    "water": "river",
    "terrain": ["karst"],
    "crowd_scale": "15_50",
    "constraints": ["night_shooting"]
  },
  "mapped_values": [
    {
      "original": "waterside village",
      "mapped_to": "floating_village",
      "reason": "Catalog synonym mapping"
    }
  ],
  "unmapped_rejected": []
}
```

---

## 2. Multi-Criteria Filter & Scene Match Search

Executes deterministic scoring and returns ranked locations scoring >= 40.

- **Endpoint**: `GET /api/locations/search`
- **Auth**: Public (Guest allowed)

### Query Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `q` | string | No | Accent-insensitive keyword search (FR-006) |
| `scene_types` | string[] | No | Comma-separated enums (e.g. `karst,river`) |
| `provinces` | number[] | No | Comma-separated province IDs (e.g. `1,15`) |
| `region` | enum | No | `north`, `central`, or `south` |
| `crew_size` | enum | No | `u15`, `15_50`, or `o50` |
| `shoot_month` | number | No | `1` to `12` |
| `page` | number | No | Default `1` |
| `limit` | number | No | Default `20` |

### Response (200 OK)
```json
{
  "total": 4,
  "page": 1,
  "results": [
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
      "score": 92,
      "match_reasons": [
        "Visual fit: Karst and river match scene description",
        "Crew capacity: Accommodates crews over 50 (exceeds 15-50 requirement)",
        "Logistics: Grid power, truck access, lodging within 20km available",
        "Availability: Site is open for filming"
      ],
      "cautions": [],
      "thumbnail_url": "/locations/trang-an-1.jpg",
      "crew_capacity": "o50",
      "availability": "open",
      "permit_complexity": "medium"
    }
  ],
  "url_state": "scene_types=karst,river&crew_size=15_50&shoot_month=11"
}
```
*Rule:* Only locations with `score >= 40` are returned. At least one reason is included per card (BR-002).
