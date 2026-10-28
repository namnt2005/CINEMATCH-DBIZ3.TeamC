# Integration Contract

Course: DBIZ3 Session 10 (integration and debugging)    Team: Team C    Product: CINEMATCH
Owner: Trịnh Loan Trang (tests)    Draft: 28/10/2026    Status: Draft — reviewed by both module owners before the contract tests are written

One row per interface between two modules (or between a screen and an API inside a module).
Field names, types and required flags come from the Spec Documents §5.1 and from `data/`; nothing
is invented here. A disagreement between the two specifications is written in *Conflicts* and sent
back to `docs/spec/` as an open question — it is never fixed silently in code.

## 1. Interfaces

| ID | Sender → Receiver | Trigger | Spec references | Built? |
|---|---|---|---|---|
| I-1 | M3 scene extraction (`POST /api/locations/extract-scene`) → M3 search (`GET /api/locations/search`) | Producer confirms *What the system understood* on SC-15 | M3 F-M3-11, F-M3-12 → F-M3-07, F-M3-08; BR-001, BR-003 | Yes (US-1) |
| I-2 | SYS session → M3 authority contact | Signed-in member opens SC-16 | SYS F-SYS-04, BR-001 → M3 F-M3-15, BR-005 | No — SYS slice |
| I-3 | M3 shortlist → M0 project readiness | Producer adds a location to a project | M3 F-M3-18 → M0 readiness (Logistics gauge, weight 0) | No — M0 slice |
| I-4 | M3 location interest → M7 province notice | Producer marks interest in a location | M3 F-M3-18 → M7 F-M7-01; spec-M7 Clarifications Q1–Q3 | No — M7 slice |
| I-5 | M2 rule-set version → M0 Content gauge | VFDA signs a new rule-set version | M2 F-M2-04; spec-M2 Clarifications Q3 (notify only, gauge −30) | No — M2 slice |

## 2. Interface I-1 in detail

**Sender output = receiver input** (query string of the search request):

| Field | Type | Required | Allowed values / boundary | Error behaviour |
|---|---|---|---|---|
| `scene_types` | ARRAY<ENUM> (comma-separated) | No | the 14 values of `location.scene_types`; unknown values are dropped by the catalogue (F-M3-12) and shown to the user | unknown only → treated as *no scene filter* (BR-003), never an error |
| `provinces` | ARRAY<INTEGER> | No | `province.province_id` of the 34 provinces | non-numeric values ignored |
| `crew_size` | ENUM(u15, 15_50, o50) | No | exactly these three | other value → criterion scores neutral |
| `shoot_month` | INTEGER | No | 1–12 | outside 1–12 → criterion scores neutral |
| `q` | VARCHAR(200) | No | accent-insensitive (F-M3-06) | — |

**Receiver output**: `{ results: [{ location_id, slug, name_en, name_vi, province_id, province_name, score 0–100, match_reasons[≥1], crew_capacity, availability, permit_complexity }], count, criteria }`; only published locations with `score ≥ 40`, ranked by score (BR-002).

**Contract tests to write** (file `tests/contracts/i1-extract-to-search.test.js`; each name cites the FR/BR):

1. Normal — `F-M3-11→F-M3-08: attributes extracted from a karst-river scene return Tràng An first`.
2. Boundary — `F-M3-08: shoot_month 1 and 12 are accepted; 0 and 13 score neutral (BR-003)`.
3. Boundary — `BR-002: a location scoring exactly 40 is shown, 39 is hidden`.
4. Failure — `F-M3-12: an unknown scene type is dropped and reported, the search still runs`.

Each test must be seen failing once (break the stub or the code on purpose), then passing.

**Conflicts**: none known. Scoring weights are provisional (spec-M3 Clarifications Q1).

## 3. Change log

| Date | Change | By |
|---|---|---|
| 28/10/2026 | First draft: I-1 detailed, I-2 to I-5 listed | Group C |
