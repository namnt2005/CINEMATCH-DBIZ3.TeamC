# MVP Scope v3: CINEMATCH

*Product Requirements Document for the MVP. It is built from the current scope (`docs/mvp-scope.md`, 22/09/2026) and the nine module Spec Documents in `docs/spec/`. `docs/mvp-scope.md` stays as the Session 1 record.*

| Team / Project | Version | Completed by |
|---|---|---|
| Group C — CINEMATCH (client: VFDA) | v3.1 — Session 7 midterm, 01/10/2026 | Group C |

## 1. Problem Statement

International producers who consider shooting in Vietnam cannot find out in advance what their project will need — which story content will be examined closely, which locations fit their scenes, which Vietnamese company must sign their service agreement, and by which date the licence dossier must be filed — so they commit money blind or choose another country. VFDA sees this demand only through scattered emails and has no structured way to serve it or report on it.

## 2. Target Users

**Primary user (segment A):** international film producers and line producers (production companies) planning to shoot part of a project in Vietnam and release it abroad. They carry the full licensing burden of Article 13 of the Cinema Law 2022 and are the users VFDA most wants to attract.

| User | Role in the MVP | Served by |
|---|---|---|
| Vietnamese service companies (partners) | Supply partner profiles; must sign the service agreement that Article 13 requires | M4 |
| VFDA staff | Enter, verify and publish location data; review partner verification; moderate published content; read the demand index and send the quarterly report | M3, M4, M10 |
| VFDA Legal Board | Write, approve and sign the legal rules that the content pre-check cites | M2 |
| Admin | Grants roles; searches the audit log | SYS, M10 |

Segments B and C are told apart by the segment router (M1) so that the journey and the documents fit the visitor; their dedicated features are not the focus of this release.

**First pilot users — segment C.** Crews that only hire Vietnamese cast or services have the shortest journey (M1 → M4 → M5 document list, no Article 13 licence), so they can use the product for real long before a feature film reaches the licensing stage. The pilot recruits them first; segment A stays the user every Must is designed for. Source: TL4 §1.2 and §6.2.

## 3. Link to the Product Design Package (DBIZ2)

- DBIZ2 Objective 1 — connect Vietnamese and foreign filmmakers → module M4.
- DBIZ2 Objective 2 — information on locations across Vietnam → module M3.
- DBIZ2 Objective 3 — support the legal procedure (licensing) → modules M2 and M5. The link to the state licensing system is out of scope.
- Source: DBIZ2 Group C Final Report and System Design v2.0, sheet *1. Schematic*, §1.1.
- Function List: `docs/function-list.md` (119 subfunctions, 104 in the MVP, all 104 specified in `docs/spec/`). Screen List: `docs/screen-list.md` (48 screens; the 44 in MVP scope all have a mockup and a Screen Spec — 41 files in `docs/screens/`, three of which also cover a merged screen).

## 4. MoSCoW Priorities and where each item is delivered

FR numbers restart in every module file, so each is quoted with its file. Every screen named below has a Screen Spec `docs/screens/screen-spec-<ID>.md`.

### 4.1 Must

| # | Feature | Spec file · FRs | Screens | Notes |
|---|---|---|---|---|
| 1 | Accounts, six roles enforced in the database, Vietnamese / English interface | `spec-SYS.md` FR-001–FR-010 | SC-04 (+SC-05), SC-06, SC-07, SC-08, SC-09, SC-42, SC-43 | Every other feature depends on roles being safe first |
| 2 | Segment router A / B / C with reason and override | `spec-M1.md` FR-001–FR-003 | SC-01, SC-02, SC-13 | Decides which documents and steps apply |
| 3 | Project workspace and five-gauge readiness dashboard with one next step per gauge | `spec-M0.md` FR-001–FR-008 | SC-10 (+SC-11), SC-12, SC-13 | The product's home; every module reports into it |
| 4 | 200-word content pre-check without sign-up, result with cited findings | `spec-M2.md` FR-005–FR-007, FR-011–FR-014 | SC-03, SC-48 | Findings must cite VFDA-signed rules |
| 5 | Article 13 dossier completeness check and 20-day timeline | `spec-M2.md` FR-008–FR-010, FR-017–FR-018 | SC-27, SC-29 | A missing component costs the producer the 20-day processing time |
| 6 | Legal rule base written and signed by the VFDA Legal Board, with audit log | `spec-M2.md` FR-001–FR-004; audit log write: `spec-M10.md` FR-008 | SC-37 | Without approved rules the pre-check has nothing to check against |
| 7 | Location search from a scene description, results with reasons, location detail with gated authority contacts | `spec-M3.md` FR-006–FR-015 | SC-14, SC-15, SC-16 | The most tangible value for a foreign producer |
| 8 | Location data management and publishing by VFDA staff, with each location's availability (open / scouting crew on site / temporarily closed) | `spec-M3.md` FR-001–FR-005, BR-010; audit log write: `spec-M10.md` FR-008 | SC-35, SC-16 | Source of the location data |
| 9 | Partner directory (12 service groups), three-layer profiles, VFDA Verified | `spec-M4.md` FR-001–FR-006, FR-008–FR-011; audit log write: `spec-M10.md` FR-008 | SC-19, SC-20, SC-21, SC-22, SC-36 | Article 13 makes a Vietnamese partner mandatory |
| 10 | Collaboration requests to confirmation, mutual NDA, document access log | `spec-M4.md` FR-012–FR-018 | SC-23, SC-25 (+SC-24) | Turns the directory into an actual partnership |
| 11 | Document kit by segment, bilingual draft with paragraph proofreading, countdown | `spec-M5.md` FR-001–FR-008 | SC-26, SC-28, SC-29 | The Vietnamese script is a legal requirement |
| 12 | Audit log of every administrative action (write side, append-only) | `spec-M10.md` FR-008 | written from SC-35, SC-36, SC-37, SC-38 | Needed by items 6, 8, 9 and 13; the log **viewer** stays Should (item 18) |
| 13 | Moderation of partner-published content (profile text, photos) before the public sees it | `spec-M10.md` FR-001–FR-002 | SC-38 | M10 BR-001 holds back what item 9 lets partners publish; without it no partner edit would ever appear |

### 4.2 Should

| # | Feature | Spec file · FRs | Screens |
|---|---|---|---|
| 14 | Location comparison (up to 4) and primary / backup shortlist | `spec-M3.md` FR-016–FR-018 | SC-17 |
| 15 | Provincial readiness index and province pages | `spec-M3.md` FR-019–FR-020 | SC-18 |
| 16 | Notices to Provincial People's Committees through VFDA | `spec-M7.md` FR-001–FR-004 | SC-32 |
| 17 | VFDA consultation booking (offered once VFDA declares staffed hours, M7 BR-005); public requirements library | `spec-M7.md` FR-005–FR-007; `spec-M2.md` FR-015–FR-016 | SC-33, SC-30, SC-31 |
| 18 | VFDA back office: admin overview, demand index, quarterly report, audit log viewer | `spec-M10.md` FR-003–FR-007, FR-009 | SC-34, SC-39, SC-40, SC-41 |

### 4.3 Could

| # | Feature | Spec file · FRs |
|---|---|---|
| 19 | Semantic partner search | `spec-M4.md` FR-007; index: `spec-SYS.md` FR-011 |
| 20 | Readiness trend chart | `spec-M0.md` FR-009 |
| 21 | Project-owner access-log viewer | `spec-M4.md` FR-019 |

### 4.4 Won't (this release)

| Item | Why |
|---|---|
| Logistics (equipment import, visas, drones) and cost reference — M6 | Phase 2 |
| Showcase and two-way reviews (M8); film classification pre-check for segment B (M9) | Phase 2 |
| Integration with the state licensing system; online payments; native mobile app | Phase 3 or later; responsive web only |

## 5. Change log since Session 3

The scope shown to the Client in Session 3 (Session 1 template, 12 August 2026) was: Must — role-based access (guest / member / VFDA admin), organisation profile, location portal with search, gated authority contacts, admin location management, partner directory with collaboration request, at least 40 published locations; Should — Permit Readiness Pack, project records, semantic search, real-time chat; Could — reviews, saved locations and comparison, showcase; Won't — licensing-system integration, e-NDA and secure viewer, ML matching, moderation console.

The table lists every difference between that scope and section 4, with its reason and the document the reason comes from.

| # | Change | Session 3 | Now | Reason |
|---|---|---|---|---|
| 1 | Product framing | Three DBIZ2 main functions | Segment A foreign producers first; router A / B / C (M1); domestic producers become suppliers (M4) | Product repositioned from "finding things in Vietnam" to "removing the uncertainty of shooting in Vietnam". Source: TL4 §0; `docs/mvp-scope.md`, "Notes on the earlier draft" |
| 2 | Roles | guest / member / VFDA admin | Six roles: guest, member, partner, vfda_staff, vfda_legal, admin | Partners manage their own profile (M4); only the VFDA Legal Board may sign the rules the pre-check cites (M2). Source: TL4 §5.2; `spec-SYS.md` BR-002 |
| 3 | Permit Readiness Pack | Should | Must, split into the Article 13 check (M2) and the document kit with countdown (M5) | Article 13 makes a complete dossier and a Vietnamese partner mandatory. Source: TL4 §0 (Cinema Law 2022, Art. 13 cl. 3–4); `docs/mvp-scope.md` §4 |
| 4 | Content pre-check (M2) | Not in scope | Must, 200-word input, no sign-up, cited findings | Producers fear "we spend money, then the licence is refused"; a 200-word excerpt answers that fear without collecting full scripts. Source: TL4 §0 and §5.2 (N8) |
| 5 | Project workspace and readiness dashboard (M0) | Project records only (Should) | Must, projects with five gauges | Every module reports into the dashboard. Source: `docs/mvp-scope.md` §4 |
| 6 | Location search | Filters and full-text search | Search from a scene description with match reasons; filters kept | A scene description gives value on first use, even with one user (cold start). Source: TL1 §4.1 (A1 Location Brief → Shortlist); TL4 §5.3 |
| 7 | e-NDA and document access log | Won't | Must, mutual NDA and log in M4 (FR-017, FR-018) | The BA Report names them as the condition for producers to share documents at all. Source: TL1 §6.3 (B4) |
| 8 | Semantic search | Should | Could, partner search only | Keyword search is enough for launch. Source: `docs/mvp-scope.md` §4 |
| 9 | Saved locations and comparison | Could | Should, up to 4 locations with primary / backup shortlist (SC-17) | Tier 2 of the Screen List |
| 10 | Back office and audit log | Won't | Should (M10, `spec-M10.md`); the audit log **write** (F-M10-08) and content **moderation** (F-M10-01, F-M10-02) are Must | VFDA needs the demand index and quarterly report as evidence for its focal-point role; the log write is needed now by M2, M3 and M4; moderation is needed because M10 BR-001 holds back partner content (decision 01/10/2026, TL5 M10). Source: TL1 §6.3 (D1, D3, C4); TL5 M10 |
| 11 | Provincial notices; consultation booking (M7) | Not in scope | Should | In the BA Report executive summary and missed in v1. Source: TL1 §6.3 (C2) |
| 12 | Reviews and showcase | Could | Won't (M8) | Nothing real to rate in the pilot window. Source: Group C decision in `docs/mvp-scope.md` §4 |
| 13 | Real-time chat | Should | Dropped; replaced by the message thread of a collaboration request (M4 BR-009) | The Function List v2.0 has no chat subfunction |
| 14 | Screens | 66 in DBIZ2 | 48 in the Screen List; all 44 in MVP scope have a Screen Spec. Screen List 22/09/2026: SC-48 added; SC-03, SC-14, SC-27 narrowed; SC-17, SC-18, SC-32 moved to Should | Priority set for the MVP; the remaining 21 Screen Specs were added on 30/09/2026 |
| 15 | Function priorities | all Must in DBIZ2 | F-M3-16..20, F-M2-15..16, F-M7-01..07, F-M10 (except F-M10-08) Should; F-M0-09, F-M4-07, F-M4-19, F-SYS-11 Could | Follows the Screen List tiers; confirmed by the Client and recorded in each spec §11.1 |
| 16 | Launch data targets | At least 40 published locations (Must, Definition of Done, TL1 §6.4) | A launch target, not a scope item: **50 VFDA-verified locations in at least 8 provinces and 20 verified suppliers** (section 7) | Group C decision 01/10/2026, aligned with `spec-M3.md` §9 and `spec-M4.md` §9; who supplies the data stays open (`spec-M3.md` §10) |
| 17 | Data lifecycle | Not stated | Nothing is ever hard-deleted: accounts deactivated and anonymised, projects archived, locations unpublished, organisations deactivated, rules retired | Personal data must be removable while shared records stay explainable. Source: SYS BR-005, M0 BR-005, M2 BR-008, M3 BR-008, M4 BR-008 |
| 18 | Location availability | Not in scope | Must, inside item 8: VFDA sets *open / scouting crew on site / temporarily closed*; it is the sixth scoring criterion | The light version of a shared shooting calendar: two crews do not target the same place unknowingly, without building a booking system. Source: TL4 §2 idea #5, TL5 M3 step 5; `spec-M3.md` BR-010 |
| 19 | First pilot users | Not stated | Segment C crews first, segment A remains the design target (section 2) | Shortest journey, no licence dependency — real users within the pilot window. Source: TL4 §1.2, §6.2 |
| 20 | Readiness formula | Equal weights of five gauges | TL5 gauge formulas as test values; Logistics not scored until phase 2 | Acceptance scenarios must give a number without asking anyone. Source: TL5 M0; `spec-M0.md` §9 |

*TL1 (product strategy and function map) and TL4 (product repositioning), cited above, are Group C's Phase 3 strategy documents; they are kept in the team's project workspace, not in this repository.*

[NEEDS CLARIFICATION: what the Client confirmed, rejected or asked to change at Session 3, as written in the meeting notes — owner: Nam]

[NEEDS CLARIFICATION: who supplies the data for the 50 launch locations, and by when — owner: Nam with VFDA]

## 6. Chain PRD → spec → screen → data

Every Must and Should item above points to a module file and its FRs; every FR has typed fields in §5.1 of that file (and §6.1 for stored attributes); every stored entity those fields belong to is in `data/data-model-<MODULE>.md` (one per module) and `data/04-data-model.md`, created by `data/schema/schema-<MODULE>.sql`, with seed rows in `data/seed/NN_<table>.csv`; and every screen that shows the item has a Screen Spec. Two points are worth knowing when following the chain:

- **Audit log and moderation (items 6, 8, 9, 12, 13).** Both belong to module M10. The log write (F-M10-08) and moderation (F-M10-01, F-M10-02) are Must; the rest of M10 is Should.
- **Screens that cover two IDs.** `SC-04` also covers `SC-05`, `SC-10` covers `SC-11`, `SC-25` covers `SC-24`.

Open points are not hidden: each Spec Document lists them in §10 as `[NEEDS CLARIFICATION: …]` with an owner, and §9 gives the test values used until the Client answers.

## 7. Success criteria of the MVP

Measured at the end of the pilot. Every criterion is a count of records the platform itself stores, so it can be checked by a query, not by opinion. Source: TL3 §10 (proposal sent to VFDA), targets aligned with `spec-M3.md` §9 and `spec-M4.md` §9 (decision 01/10/2026).

| # | Criterion | Target | Counted from |
|---|---|---|---|
| 1 | Published locations with photos, bilingual description, coordinates, logistics and a verified authority contact | ≥ 50, in at least 8 provinces | `location` with `published = true` |
| 2 | Vietnamese service partners verified by VFDA with a complete profile | ≥ 20, across the 12 service groups | `organisation` with a valid `verified_until` |
| 3 | Real location searches recorded | ≥ 30 | `location_query` |
| 4 | Demand report reread and sent by VFDA | ≥ 1 | `quarterly_report` with `exported_at` |
| 5 | Provincial notices with a reply | ≥ 3 | `province_notice` with a `response` |

Page views and the number of accounts are deliberately not criteria: they are easy to inflate and prove nothing.
