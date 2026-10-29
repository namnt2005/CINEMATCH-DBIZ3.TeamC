# Data Model: Location Discovery (M3 Core Slice)

Feature: `001-m3-core`  
Source of Truth: [data/data-model-M3.md](file:///Users/adm/CINEMATCH-DBIZ3.TeamC/data/data-model-M3.md), [data/schema/schema-M3.sql](file:///Users/adm/CINEMATCH-DBIZ3.TeamC/data/schema/schema-M3.sql), [data/seed/schema.json](file:///Users/adm/CINEMATCH-DBIZ3.TeamC/data/seed/schema.json)  
Date: 2026-10-12  

---

## 1. Source of Truth & Field Definitions

All physical schemas, column definitions, data types, primary/foreign keys, and database constraints are strictly defined in `data/` and must not be altered:
- **Logical Data Model**: [data/data-model-M3.md](file:///Users/adm/CINEMATCH-DBIZ3.TeamC/data/data-model-M3.md)
- **Physical Schema (Portable SQL for SQLite and PostgreSQL)**: [data/schema/schema-M3.sql](file:///Users/adm/CINEMATCH-DBIZ3.TeamC/data/schema/schema-M3.sql)
- **Seed Data Package**: `data/seed/12_province.csv`, `data/seed/21_location.csv`, `data/seed/22_location_image.csv`, `data/seed/23_authority_contact.csv`, `data/seed/24_location_query.csv`

No database fields or tables are redefined in this feature specification.

---

## 2. Tables Read and Written by this Feature Slice

The scope of this slice is restricted to **US-1 (P1: Describe a scene, get places that fit)** as primary scope, and **US-2 (P2: Contact local authority)** optionally if time allows. The table access matrix is defined below:

| Table | Operation | Requirements & Rules | Purpose in this Feature Slice |
|---|---|---|---|
| `location` | **READ** | F-M3-06, F-M3-07, F-M3-08, F-M3-09, F-M3-13, F-M3-14, BR-002, BR-003, BR-008, BR-010 | Reads published locations (`published = true`, `intake_status = 'published'`). Evaluates 6 deterministic scoring criteria in F-M3-08, displays location cards in SC-14 (F-M3-09), detail view in SC-16 (F-M3-13), and calculates nearby published locations within 30 km via PostGIS (F-M3-14). |
| `location_image` | **READ** | F-M3-09, F-M3-13 | Reads approved photos (`status = 'approved'`) for result card thumbnails in SC-14 and the photo gallery in SC-16. |
| `province` | **READ** | F-M3-06, F-M3-07, F-M3-08, F-M3-13, BR-006 | Reads the 34 post-2025 provincial units, names, slugs, and regions (`north`, `central`, `south`) for search filtering and province labelling. |
| `authority_contact` | **READ** | F-M3-15, BR-005 *(US-2 optional)* | Reads local authority office, contact name, verified phone and email for signed-in users (gated by RLS/session auth). Guests receive null/redacted contact with signup prompt. |
| `location_query` | **WRITE** | F-M3-10, F-M3-11, BR-009 | Inserts each confirmed scene search record (`query_id`, `scene_description`, `shoot_month`, `attributes` JSONB) without personal data for M10 demand index tracking. |

---

## 3. Tables Out of Scope (Not Accessed by this Slice)

The following M3 tables defined in [data/data-model-M3.md](file:///Users/adm/CINEMATCH-DBIZ3.TeamC/data/data-model-M3.md) belong to user stories deferred from this slice and are **not read or written**:

| Table | Owning Story / Subfunction | Reason Out of Scope |
|---|---|---|
| `project_shortlist` | US-4 / F-M3-18 | Location shortlisting and compare tray are deferred to a subsequent slice. |
| `province_readiness` | US-5 / F-M3-19 | Provincial readiness computation is deferred to a subsequent slice. |

---

## 4. In-Code Version-Controlled Application Configuration

| Configuration Asset | Path | Requirements & Rules | Purpose in this Feature Slice |
|---|---|---|---|
| Scene Type Catalog & Synonyms | `config/scene-catalog.json` | F-M3-12 | Version-controlled JSON in codebase holding the 14 valid scene type enums (`karst`, `river`, `village`, etc.) and synonym mapping dictionary. Used by the LLM extraction pipeline to validate and map extracted attributes deterministically before search. |
