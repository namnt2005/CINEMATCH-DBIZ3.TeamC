# MVP Scope & Rough Sprint Backlog

*Session 1 deliverable — Word version: `docs/word/Session-01-MVP-Scope-GroupC.docx`.*

| Team / Project | Date | Completed by |
|---|---|---|
| Group C — CINEMATCH (client: VFDA) | 22/09/2026 | Nam Tran, on behalf of Group C |

## 1. Problem Statement

International producers who consider shooting in Vietnam cannot find out in advance what their project will need — which story content will be examined closely, which locations fit their scenes, which Vietnamese company must sign their service agreement, and by which date the licence dossier must be filed — so they commit money blind or choose another country. VFDA sees this demand only through scattered emails and has no structured way to serve it or report on it.

## 2. Target User (MVP)

International film producers (production companies and line producers) planning to shoot part of a project in Vietnam and release it abroad — segment A. They carry the full licensing burden of Article 13 of the Cinema Law 2022 and are the users VFDA most wants to attract.

## 3. Link to the Product Design Package (DBIZ2)

**Related System Objectives**

- DBIZ2 Objective 1 — connect Vietnamese and foreign filmmakers → module M4 (Vietnamese service partners).
- DBIZ2 Objective 2 — information on locations across Vietnam → module M3 (location discovery).
- DBIZ2 Objective 3 — support the legal procedure (licensing) → modules M2 and M5; the API link to the state licensing system stays a later-phase objective.
- Source: DBIZ2 Group C Final Report and System Design v2.0, sheet *1. Schematic*, §1.1 System Objectives.

**Related Main Functions**

- System Design v2.0, sheet *3. Function List*: 41 capabilities / 119 subfunctions, textualised in `docs/function-list.md`.
- MVP modules: SYS (F-SYS-01..11), M1 (F-M1-01..03), M0 (F-M0-01..09), M2 (F-M2-01..18), M3 (F-M3-01..20), M4 (F-M4-01..19), M5 (F-M5-01..08), M7 (F-M7-01..07), M10 (F-M10-01..09).
- Screens: System Design v2.0, sheet *5. Screen List* (`docs/screen-list.md`); 20 priority screens mocked and specified in `docs/screens/`.

## 4. MVP Scope Priority — MoSCoW

| Priority | Feature / item | Notes |
|---|---|---|
| Must | Accounts, six roles enforced in the database, Vietnamese / English interface (SYS) | Every other feature depends on roles being safe first |
| Must | Segment router A / B / C with reason and override (M1) | Decides which documents and steps apply; first thing a visitor sees |
| Must | Project workspace and five-gauge readiness dashboard with one next step per gauge (M0) | The product's home; every module reports into it |
| Must | 200-word content pre-check without sign-up and result with cited findings (M2) | Main conversion point; findings must cite VFDA-signed rules |
| Must | Article 13 dossier completeness check and 20-day timeline (M2) | A missing component costs the producer the 20-day processing time |
| Must | Legal rule base written and signed by the VFDA Legal Board, with audit log (M2, M10 log) | Without approved rules the pre-check has nothing to check against; screen SC-37 still needs a mockup |
| Must | Location search from a scene description, results with reasons, location detail with gated authority contacts (M3) | The most tangible value for a foreign producer |
| Must | Location data management and publishing by VFDA staff (M3) | Seed data; screen SC-35 still needs a mockup |
| Must | Partner directory (12 service groups), three-layer profiles, VFDA Verified (M4) | Article 13 makes a Vietnamese partner mandatory; screen SC-36 still needs a mockup |
| Must | Collaboration requests to confirmation, mutual NDA, document access log (M4) | Turns the directory into an actual partnership |
| Must | Document kit by segment, bilingual draft with paragraph proofreading, countdown (M5) | The Vietnamese script is a legal requirement |
| Should | Location comparison (up to 4) and primary / backup shortlist (M3) | Tier 2 in the screen list; search and detail work without it |
| Should | Provincial readiness index and province pages (M3) | Tier 2; needs platform data to be meaningful |
| Should | Notices to Provincial People's Committees through VFDA (M7) | Tier 2; depends on VFDA's mandate being confirmed |
| Should | VFDA consultation booking; public requirements library (M7, M2) | High trust value; email is an acceptable fallback at launch |
| Should | VFDA back office: content moderation, demand index, quarterly report, audit log viewer (M10) | Needed for VFDA's reporting, not for the producer's first project |
| Could | Semantic partner search; readiness trend chart; project-owner access-log viewer | Keyword search, the current gauges and the log itself are enough for launch |
| Won't | Logistics (equipment import, visas, drones), cost reference — M6 | Out of scope for this release; phase 2 |
| Won't | Showcase and two-way reviews (M8); film classification pre-check for segment B (M9) | Phase 2 |
| Won't | Integration with the state licensing system; online payments; native mobile app | Phase 3 or later; responsive web only |

## 5. Rough Sprint Backlog

| # | Item | Priority | Owner | Status |
|---|---|---|---|---|
| 1 | Reposition the product and agree the MVP scope (this document) | Must | Nam | Done |
| 2 | Textualise the Function List and Screen List (Session 4, Step 2) | Must | Group C | Done |
| 3 | Textualise architecture diagrams to Mermaid (Step 3) | Must | Group C | Done — human verification signatures pending |
| 4 | 20 screen mockups + Screen Specs (Step 4) | Must | Group C | Done |
| 5 | 8 module Spec Documents (Step 5): SYS, M0, M1, M2, M3, M4, M5, M7 | Must | Group C | Draft — ready for Client review |
| 6 | Clarify the blocking questions with VFDA (scoring weights, Verified criteria, rule sign-off, calendar vs working days, notice mandate) | Must | Nam + VFDA | Open |
| 7 | Mockups and Screen Specs for the admin screens SC-35, SC-36, SC-37 | Must | Group C | Not started |
| 8 | Development environment: GitHub, Supabase, Vercel, Claude Code | Must | Group C | Not started |

## Notes on the earlier draft

- Problem statement: the earlier draft described the system (*a centralized digital gateway…*). The template asks to keep the solution out, so it now states the producer's problem and VFDA's problem only.
- Target user: the earlier draft named both foreign and domestic producers. The template asks for the single highest-priority group, so it is now segment A foreign producers; domestic producers appear as suppliers (M4).
