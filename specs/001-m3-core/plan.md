# Implementation Plan: Location Discovery (M3 Core Slice)

**Branch**: `001-m3-core` | **Date**: 2026-10-12 | **Spec**: [specs/001-m3-core/spec.md](file:///Users/adm/CINEMATCH-DBIZ3.TeamC/specs/001-m3-core/spec.md)

**Input**: Feature specification from `/specs/001-m3-core/spec.md` (synced from `docs/spec/spec-M3.md`)

---

## Summary

This plan defines the minimal vertical slice for Module 3 (Location Discovery), adhering strictly to the architecture documented in `AGENTS.md` and `docs/architecture/system-configuration.md`.

### Feature Scope
- **Primary Scope: User Story US-1 (P1) — Describe a scene, get places that fit**:
  - Accept free-text scene description in English or Vietnamese (`SC-15`, F-M3-10).
  - Extract structured attributes via Next.js Route Handler / Edge Function calling the Language Model API, validated and mapped against an in-code catalog (`config/scene-catalog.json`, F-M3-11, F-M3-12, BR-001).
  - Search and filter by scene type, province/region, crew size, and shoot month (`SC-14`, F-M3-06, F-M3-07).
  - Rank locations using the deterministic 6-criteria database scoring engine, hiding results `< 40` and explaining match reasons (`SC-14`, F-M3-08, F-M3-09, BR-001, BR-002, BR-003, BR-010).
  - Persist confirmed search queries to `location_query` without personal data (F-M3-11, BR-009).
- **Optional Scope (Time Permitting): User Story US-2 (P2) — Contact the local authority**:
  - Public location detail page with photos, logistics, season, and nearby locations within 30 km calculated via PostGIS (`SC-16`, F-M3-13, F-M3-14).
  - Gated authority contact endpoint returning verified contacts to signed-in members and protecting personal data from guests via Row Level Security (`SC-16`, F-M3-15, BR-004, BR-005).
- **Explicitly Out of Scope for this Slice**:
  - **US-3 (P1 in spec): VFDA publishes a verified location** (F-M3-01..05, `SC-35` admin screens) — out of scope.
  - **US-4 (P2 in spec): Compare and shortlist** (F-M3-16..18, `SC-17`) — out of scope.
  - **US-5 (P3 in spec): Understand a province** (F-M3-19..20, `SC-18`) — out of scope.
  - **All other modules** (SYS, M0, M1, M2, M4, M5, M7, M10) — out of scope.

---

## Technical Context

**Language/Version**: JavaScript / TypeScript *(Choice requires team confirmation; Node.js >= 22 required by repository environment check `tools/check_env.py`)*

**Primary Dependencies**: Next.js, `@supabase/supabase-js`, Leaflet *(Documented in `AGENTS.md`, `docs/architecture/system-configuration.md`, `docs/function-list.md` row 55, and `docs/screens/screen-spec-SC-14.md`. Specific package versions require team confirmation)*

**Storage**: Supabase (PostgreSQL with PostGIS and Row Level Security, documented in `docs/architecture/system-configuration.md`). Schema defined in `data/schema/schema-M3.sql`.

**Testing**: Repository schema and seed verification via `python3 data/schema/load_check.py`. *(Application test framework requires team confirmation)*

**Target Platform**: Vercel (Application tier) + Supabase (Data tier) per `docs/architecture/system-configuration.md`. Local development runs on macOS and Windows.

**Project Type**: Next.js web application per `AGENTS.md` and `docs/architecture/system-configuration.md`.

**Performance Goals**: Location catalog search p95 < 200ms; scene extraction p95 < 3s; responsive map rendering.

**Constraints**: Zero personal data in public responses (BR-005); deterministic scoring (LLM never ranks or chooses locations, BR-001); no cloud secrets committed (Constitution Principle IV).

**Scale/Scope**: 50+ VFDA locations across 8+ provinces, 2 primary screens (`SC-14`, `SC-15`) and 1 optional screen (`SC-16`).

---

## Constitution Check

*GATE: Evaluated against `.specify/memory/constitution.md` (v1.0.0).*

| Principle | Requirement | Plan Conformance | Status |
|---|---|---|---|
| **I. Source of truth** | Requirements come only from `docs/spec/`, data from `data/`. No invented requirements. | Traces strictly to `specs/001-m3-core/spec.md`, `data/data-model-M3.md`, and `data/schema/schema-M3.sql`. No fields redefined. | **PASS** |
| **II. Business rules test-first** | Automated test written and seen failing before implementing code. | Automated tests for BR-001, BR-002, BR-003, BR-005, BR-006, BR-009, BR-010 defined prior to implementation. | **PASS** |
| **III. Thin vertical slices** | Build one user story at a time (P1, P2) end-to-end. | US-1 (P1) is the primary slice; US-2 (P2) is optional if time allows; US-3, US-4, US-5 explicitly deferred. | **PASS** |
| **IV. Synthetic data & no secrets** | Synthetic seed data only; secrets in `.env`; no API keys in committed code. | Reads synthetic seed (`12_province.csv`, `21_location.csv`, `22_location_image.csv`, `23_authority_contact.csv`, `24_location_query.csv`). Free OpenStreetMap tiles used without keys. | **PASS** |
| **V. Humans approve every change** | Work on branch, show changed files with reason, never push/merge without human review. | All work confined to branch `001-m3-core`. | **PASS** |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-m3-core/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output: Technical decisions & research
├── data-model.md        # Phase 1 output: Tables read/written for US-1 & US-2
├── quickstart.md        # Phase 1 output: Cross-platform macOS/Windows commands
├── contracts/           # Phase 1 output: API contracts (US-1 & US-2 in scope)
│   ├── search-and-match.contract.md           # US-1 (in scope)
│   ├── location-detail-and-contact.contract.md # US-2 (optional, in scope)
│   ├── admin-locations.contract.md            # US-3 (deferred, out of scope)
│   └── shortlist-and-compare.contract.md      # US-4 (deferred, out of scope)
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code Layout (Next.js Web Application)

```text
# Next.js web application structure (Router paradigm requires team confirmation)
src/ or app/ or pages/
├── locations/                      # SC-14: Search & suggestion grid (US-1)
├── locations/match/                # SC-15: Scene description input & matching (US-1)
├── locations/[slug]/               # SC-16: Location detail & map (US-2, optional)
└── api/
    └── locations/                  # Route Handlers / API endpoints
        ├── search                  # Multi-criteria filtering & ranking (US-1)
        ├── extract-scene           # LLM attribute extraction & catalog validation (US-1)
        └── [id]/contact            # Gated authority contact endpoint (US-2, optional)
config/
└── scene-catalog.json              # Version-controlled scene taxonomy & synonyms (F-M3-12)
lib/
├── db/                             # Supabase client & database queries
├── scoring/                        # Deterministic 6-criteria scoring logic (F-M3-08)
└── catalog/                        # Catalog validator & synonym mapper (F-M3-12)
tests/                              # Automated test suites (runner requires team confirmation)
```

**Structure Decision**: Standard Next.js application layout adhering to `docs/architecture/system-configuration.md`.

---

## Complexity Tracking

| Feature / Requirement | Reason Deferred / Out of Scope | Interim Strategy for this Slice |
|---|---|---|
| **User Authentication / Login (Session 11)** | Full Supabase Auth lifecycle is deferred to Session 11 per team instructions. Required by F-M3-15 and BR-005 to gate authority contacts. | Simulated locally using session header / mock role toggle (`x-mock-role: member` vs guest). No third-party auth dependencies introduced. |
| **Production Cloud Deployment (Session 11)** | Vercel and Supabase cloud deployment deferred to Session 11. | Runs locally on macOS and Windows via Node.js dev server (`npm run dev`). |
| **Admin Publishing & Management (US-3)** | US-3 (F-M3-01..05, `SC-35`) deferred to focus on core consumer discovery slice (US-1). | Locations are loaded directly from verified seed CSVs (`21_location.csv`). |
| **Comparison & Shortlist (US-4)** | US-4 (F-M3-16..18, `SC-17`) deferred to next vertical slice. | Comparison tray and project shortlist tables are bypassed. |
| **Provincial Index Calculation (US-5)** | US-5 (F-M3-19..20, `SC-18`) deferred to next vertical slice. | Province detail pages display basic province data from `12_province.csv`. |

---

## Decisions Requiring Team Confirmation

1. **Next.js Router Architecture & Version**: Whether to use Next.js App Router or Pages Router, and the specific Next.js release version.
2. **Programming Language & Tooling**: Confirmation of TypeScript vs JavaScript, and choice of styling solution.
3. **Application Testing Framework**: Selection of test runner/framework for application code (e.g., Node.js test runner, Jest, or alternative).
4. **Language Model API Provider**: Selection of the specific LLM service/vendor for F-M3-11.
5. **Scoring Criteria Weights**: Client (VFDA) confirmation of official scoring weights for F-M3-08 (Open Question #1).
6. **Scene Attribute Catalog**: Client (VFDA) confirmation of catalog contents and synonym mappings for F-M3-12 (Open Question #2).
