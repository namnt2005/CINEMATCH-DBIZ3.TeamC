# Research & Technical Decisions: Location Discovery (M3)

Feature: `001-m3-core`  
Spec: `specs/001-m3-core/spec.md` (synced from `docs/spec/spec-M3.md`)  
Date: 2026-10-12  

---

## 1. Application Architecture & Web Framework

### Decision
Use **Next.js** deployed on **Vercel**, integrating with **Supabase (PostgreSQL with PostGIS and Row Level Security)** as explicitly specified in the planned architecture:
- `AGENTS.md` §2: *"Planned: Next.js + Supabase (PostgreSQL)."*
- `docs/architecture/system-configuration.md`: *"Application tier — Vercel: Public pages, User area, Route Handlers + Authorisation middleware, Edge Function; Data tier — Supabase: PostgreSQL + RLS, PostGIS."*
- `docs/architecture/sequence-diagrams.md` SEQ-03–SEQ-05 and `specs/001-m3-core/spec.md` §4.2–4.4: *"participant FE as Next.js app"*.

### Rationale
- Next.js provides server-side rendering for public location discovery pages (`SC-14`, `SC-16`) and backend Route Handlers / Edge Functions for API requests (`EF1` for scene attribute extraction).
- Supabase provides PostgreSQL with Row Level Security (RLS) to enforce data privacy on local authority contacts.
- Adheres directly to approved project documentation without introducing alternative backend stacks.

### Alternatives Considered
- *Custom Node/Express backend or other web frameworks*: Rejected because `AGENTS.md` and `docs/architecture/system-configuration.md` explicitly mandate Next.js and Vercel Route Handlers.

### Unresolved Decisions Requiring Team Confirmation
- **Next.js major version and router paradigm**: Whether to use Next.js App Router or Pages Router, and the specific Next.js release version.
- **Language & Styling toolchain**: Whether to use TypeScript or JavaScript; selection of CSS framework/tooling (CSS Modules, Vanilla CSS, or Tailwind CSS if confirmed by the team).

---

## 2. Deterministic Scoring & Ranking Engine (F-M3-08, BR-001, BR-002, BR-003, BR-010)

### Decision
Implement deterministic location scoring via a PostgreSQL database function in Supabase. The algorithm scores published locations (`published = true`, `intake_status = 'published'`) across the six criteria established in `spec-M3.md` line 195 and `data/data-model-M3.md`:
1. **Visual Fit**: Match overlap between requested scene types and location `scene_types`.
2. **Crew Capacity**: Evaluates location `crew_capacity` against requested crew size tier (`u15`, `15_50`, `o50`).
3. **Logistics**: Evaluates `lodging_20km`, `grid_power`, and `truck_access`.
4. **Season Fit**: Evaluates requested `shoot_month` against `months_to_avoid`.
5. **Permit Complexity**: Evaluates `permit_complexity` (`low`, `medium`, `high`).
6. **Availability (BR-010)**: Evaluates `availability` (`open`, `survey_in_progress`, `paused`).

Rules enforced:
- **Deterministic ranking**: Ranking is executed strictly by the database function; the language model never names or ranks a location (BR-001).
- **Threshold**: Locations scoring below 40 are hidden from results (BR-002).
- **Explainability**: Every returned card includes at least one *why it matches* reason (BR-002).
- **Neutrality**: Missing data never counts for or against a location (BR-003).

### Rationale
- Fulfills F-M3-08 ("The system MUST score each published location from 0 to 100 on six criteria in a database function and hide results below 40").
- Enforces BR-001, BR-002, and BR-003 without relying on non-deterministic AI scoring.

### Unresolved Decisions Requiring Team Confirmation
- **Official Scoring Weights**: Open Question #1 in `spec-M3.md` §10 is marked `[NEEDS CLARIFICATION]` (owned by Client VFDA). The equal weight baseline (1/6 per criterion) from spec assumptions line 196 is used as a test baseline until VFDA formally approves weights.

---

## 3. Scene Attribute Extraction & Catalog Validation (F-M3-11, F-M3-12, BR-001)

### Decision
Implement attribute extraction in a Next.js Route Handler / Edge Function (`EF1` in `docs/architecture/system-configuration.md`) calling an external Language Model API:
- The model extracts structured attributes (`scene_types`, `era`, `time_of_day`, `water`, `terrain`, `crowd_scale`, `constraints`) filling a fixed template (F-M3-11).
- Extracted scene types are validated and mapped against an in-code version-controlled application configuration (`config/scene-catalog.json`), which contains the 14 locked enum values from the `LOCATION` schema (`data/schema/schema-M3.sql`).
- Dropped or mapped attribute values are recorded and presented to the user on screen `SC-15` (*What the system understood*) for user confirmation before executing search (F-M3-12, SEQ-03 reconciliation).
- Confirmed searches are logged to `location_query` without personal data (BR-009).

### Rationale
- Directly implements `docs/architecture/system-configuration.md` `EF1["Edge Function Extract scene attributes"]` calling `LLM["Language model API"]`.
- Resolves Option 2A from the M3 gap analysis: technical storage for catalog validation is version-controlled configuration in code.
- Prevents language model hallucinations by strictly validating extracted values against the locked catalog before query execution.

### Unresolved Decisions Requiring Team Confirmation
- **Language Model API Provider**: The repository specifies `LLM["Language model API"]` without naming a provider. The specific LLM vendor/service requires team confirmation.
- **Catalog Approval**: Open Question #2 remains blocking with Client (VFDA) to formally approve catalog content and synonym mappings.

---

## 4. Local Authority Contact Privacy & Row Level Security (F-M3-04, F-M3-05, F-M3-15, BR-004, BR-005)

### Decision
Enforce data privacy for local authority contacts via PostgreSQL Row Level Security (RLS) in Supabase:
- `authority_contact` is a dedicated table separate from `location` (`data/schema/schema-M3.sql`).
- RLS policy restricts `SELECT` access on contact phone and email to authenticated sessions (`member`, `vfda_staff`) (F-M3-15, BR-005).
- Public endpoint (`GET /api/locations/[slug]`) omits authority phone and email. A separate endpoint (`GET /api/locations/[id]/contact`) verifies the session.
- Publishing constraint: A location cannot have `published = true` or `intake_status = 'published'` unless its contact is verified (`contact_verified = true`, F-M3-05, BR-004).

### Rationale
- Directly fulfills `docs/architecture/system-configuration.md` Architecture Note: *"Authorisation is enforced with Row Level Security inside PostgreSQL itself, not in the interface layer."*
- Directly enforces BR-004 and BR-005.

### Unresolved Decisions Requiring Team Confirmation
- **Authentication provider integration timing**: Full authentication lifecycle is deferred to Session 11. Interim testing requires team confirmation on whether to simulate session roles via mock HTTP headers or test fixtures.

---

## 5. Map & Distance Calculation (F-M3-14)

### Decision
- **Map rendering**: Use **Leaflet** with **OpenStreetMap** map tiles, as explicitly specified in:
  - `docs/function-list.md` row 55: *"Leaflet and OpenStreetMap; radius calculated with PostGIS."*
  - `docs/screens/screen-spec-SC-14.md` line 49: *"Leaflet + OpenStreetMap; coordinates location.lat, location.lng"*.
  - `docs/architecture/system-configuration.md`: `OSM["OpenStreetMap — map tiles"]`.
- **Distance calculation**: Use **PostGIS** in Supabase (`GIS["PostGIS — distance, radius"]`) to compute locations within 30 km (F-M3-14).

### Rationale
- Fully supported by existing repository requirements and architecture diagrams.
- OpenStreetMap requires no proprietary API keys, avoiding secrets exposure (Constitution Principle IV).

### Unresolved Decisions Requiring Team Confirmation
- None. Leaflet, OpenStreetMap, and PostGIS are explicitly documented in `docs/function-list.md` row 55 and `docs/architecture/system-configuration.md`.

---

## 6. Testing Strategy (Constitution Principle II)

### Decision
Adhere to Constitution Principle II: *"Every business rule (BR-xxx) and every acceptance scenario of the slice being built gets an automated test that is written and seen failing before the code that makes it pass."*
- Tests must cover:
  1. Deterministic scoring algorithm and score cutoff `>= 40` (BR-001, BR-002, BR-003, BR-010).
  2. Scene attribute extraction validation and synonym mapping (F-M3-12).
  3. Authority contact RLS gating (BR-005).
  4. Publishing constraints (BR-004).
  5. Distance calculation within 30 km (F-M3-14).
- Schema and seed verification uses the existing repository tool `python3 data/schema/load_check.py`.

### Unresolved Decisions Requiring Team Confirmation
- **Testing Framework**: Selection of test runner/framework for the JavaScript/Next.js application (e.g., Node.js built-in test runner, Jest, or another runner) requires team confirmation.
