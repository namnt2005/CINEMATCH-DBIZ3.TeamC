# Contract: Shortlist & Location Comparison API (M3)

Feature: `001-m3-core`  
Source: `specs/001-m3-core/spec.md` (FR-016, FR-017, FR-018)  
Screen: `SC-17` (Location Comparison & Shortlist)  

---

## 1. Compare Locations

Compares 2 to 4 locations across eight criteria rows.

- **Endpoint**: `GET /api/locations/compare`
- **Auth**: Public (Guest allowed)

### Query Parameters
`ids`: Comma-separated UUIDs (min 2, max 4). Example: `?ids=a3b2c1d0-...,b4c3d2e1-...`

### Response (200 OK)
```json
{
  "location_count": 2,
  "locations": [
    {
      "location_id": "a3b2c1d0-1111-4000-8000-000000000001",
      "name_en": "Trang An Landscape Complex",
      "slug": "trang-an-landscape-complex"
    },
    {
      "location_id": "b4c3d2e1-2222-4000-8000-000000000002",
      "name_en": "Ba Be Lake",
      "slug": "ba-be-lake"
    }
  ],
  "comparison_rows": [
    {
      "criterion": "Visual fit",
      "values": {
        "a3b2c1d0-1111-4000-8000-000000000001": { "status": "meets", "detail": "Karst, river, cave" },
        "b4c3d2e1-2222-4000-8000-000000000002": { "status": "meets", "detail": "Freshwater lake, jungle" }
      }
    },
    {
      "criterion": "Crew capacity",
      "values": {
        "a3b2c1d0-1111-4000-8000-000000000001": { "status": "meets", "detail": "> 50 people" },
        "b4c3d2e1-2222-4000-8000-000000000002": { "status": "caution", "detail": "15-50 people" }
      }
    },
    {
      "criterion": "Lodging (< 20km)",
      "values": {
        "a3b2c1d0-1111-4000-8000-000000000001": { "status": "meets", "detail": "Abundant hotels in Ninh Binh city" },
        "b4c3d2e1-2222-4000-8000-000000000002": { "status": "caution", "detail": "Homestays only" }
      }
    },
    {
      "criterion": "Grid power",
      "values": {
        "a3b2c1d0-1111-4000-8000-000000000001": { "status": "meets", "detail": "Available at docks" },
        "b4c3d2e1-2222-4000-8000-000000000002": { "status": "caution", "detail": "Generators needed on boats" }
      }
    },
    {
      "criterion": "Heavy truck access",
      "values": {
        "a3b2c1d0-1111-4000-8000-000000000001": { "status": "meets", "detail": "Paved roads to main landing" },
        "b4c3d2e1-2222-4000-8000-000000000002": { "status": "caution", "detail": "Narrow mountain pass" }
      }
    },
    {
      "criterion": "Weather / shooting season",
      "values": {
        "a3b2c1d0-1111-4000-8000-000000000001": { "status": "meets", "detail": "Avoid July-Aug" },
        "b4c3d2e1-2222-4000-8000-000000000002": { "status": "meets", "detail": "Avoid June-July" }
      }
    },
    {
      "criterion": "Permit complexity",
      "values": {
        "a3b2c1d0-1111-4000-8000-000000000001": { "status": "caution", "detail": "UNESCO site + Provincial permit" },
        "b4c3d2e1-2222-4000-8000-000000000002": { "status": "caution", "detail": "National park management board" }
      }
    },
    {
      "criterion": "Availability",
      "values": {
        "a3b2c1d0-1111-4000-8000-000000000001": { "status": "meets", "detail": "Open" },
        "b4c3d2e1-2222-4000-8000-000000000002": { "status": "meets", "detail": "Open" }
      }
    }
  ]
}
```
*Rule (SC-17):* Every cell is strictly `meets`, `caution`, or `to verify` — no empty cells allowed.

---

## 2. Project Shortlist API

Saves a location into a project shortlist as `primary` or `backup`, updating the project Locations gauge (M0).

- **Endpoint**: `POST /api/projects/:id/shortlist`
- **Auth**: Required (`role = 'member'`)

### Request
```json
{
  "location_id": "a3b2c1d0-1111-4000-8000-000000000001",
  "role": "primary"
}
```

### Response (201 Created)
```json
{
  "shortlist_id": "7f8e9d0a-3333-4000-8000-000000000003",
  "project_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "location_id": "a3b2c1d0-1111-4000-8000-000000000001",
  "role": "primary",
  "gauge_location": 66.7,
  "message": "Trang An saved as primary location. Locations readiness gauge updated."
}
```
