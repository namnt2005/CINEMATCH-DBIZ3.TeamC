# Spec Index: CINEMATCH

CINEMATCH has one Spec Document **per module**, not one single file. This file is the entry point that the Session 6 setup guide and `AGENTS.md` name as `docs/spec/spec-document.md`. It lists the nine module files, shows where each section of the Session 4 template lives, and gathers in one place the two things a reader most often needs across modules: the entities (section 5.1) and the business rules (section 6).

It adds no requirement of its own. If this index and a module file ever disagree, **the module file wins**.

*DBIZ3 · Group C · Session 4 Spec Documents, indexed for the Session 7 midterm · 30/09/2026*

## 1. The nine module Spec Documents

| Module | File | Scope | Functional requirements | Business rules | User stories | Screens (§7) | Open questions (§10) |
|---|---|---|---|---|---|---|---|
| SYS | [`spec-SYS.md`](spec-SYS.md) | Platform foundation — accounts, roles, bilingual UI, notifications, search | 11 | 5 | 4 | SC-04, SC-06, SC-07, SC-08, SC-09, SC-42, SC-43 | 11 (2 blocking) |
| M1 | [`spec-M1.md`](spec-M1.md) | Segment router | 3 | 4 | 3 | SC-01, SC-02, SC-13 | 4 (3 blocking) |
| M0 | [`spec-M0.md`](spec-M0.md) | Project workspace and readiness dashboard | 9 | 5 | 3 | SC-10, SC-12, SC-13 | 6 (1 blocking) |
| M2 | [`spec-M2.md`](spec-M2.md) | Content pre-check and Article 13 dossier check | 18 | 8 | 5 | SC-03, SC-27, SC-29, SC-30, SC-31, SC-37, SC-48 | 14 (7 blocking) |
| M3 | [`spec-M3.md`](spec-M3.md) | Location discovery | 20 | 10 | 5 | SC-14, SC-15, SC-16, SC-17, SC-18, SC-35 | 10 (4 blocking) |
| M4 | [`spec-M4.md`](spec-M4.md) | Vietnamese service partners | 19 | 9 | 4 | SC-19, SC-20, SC-21, SC-22, SC-23, SC-25, SC-36 | 8 (4 blocking) |
| M5 | [`spec-M5.md`](spec-M5.md) | Dossier kit, bilingual drafts and countdown | 8 | 6 | 3 | SC-26, SC-28, SC-29 | 7 (3 blocking) |
| M7 | [`spec-M7.md`](spec-M7.md) | VFDA support — provincial notices and consultations | 7 | 5 | 3 | SC-32, SC-33 | 6 (4 blocking) |
| M10 | [`spec-M10.md`](spec-M10.md) | VFDA back office — moderation, demand index, quarterly report, audit log | 9 | 5 | 4 | SC-34, SC-38, SC-39, SC-40, SC-41 | 8 (1 blocking) |
| **Total** |  |  | **104** | **57** | **34** | 41 screens | **74 (29 blocking)** |

Modules `M6`, `M8` and `M9` are *Won't* for this release (see `docs/prd.md` section 4.4) and have no Spec Document.

## 2. Where each template section lives

Every module file follows the same Session 4 template, so the same section number means the same thing in every module file. (This index uses its own numbering: its section 5.1 lists entities and its section 6 lists business rules.)

| Section in a module file | Content |
|---|---|
| §1 | Purpose and scope |
| §2 | Actors |
| §3 | User scenarios and acceptance criteria (`US-n`, Given/When/Then) |
| §4 | Flows: usage flow and sequence diagrams (Mermaid) |
| §5 | Functional requirements (`FR-nnn` = DBIZ2 `F-<MODULE>-nn`); §5.1 Input / Output contract; §5.2 Business rules (`BR-nnn`) |
| §6 | Key entities of the module |
| §7 | Screens involved (Screen Specs in `docs/screens/`) |
| §8 | Success criteria (`SC-nnn`) |
| §9 | Assumptions, including the test values used until the Client confirms a number |
| §10 | Open questions — `[NEEDS CLARIFICATION: …]`, each with an owner |
| §11 | Traceability to DBIZ2, with §11.1 Reconciliation |

Functional requirement and business rule IDs restart in every file, so always quote them with the module: “`FR-008` in `spec-M3.md`”, “M3 BR-004”.

## 3. Related documents

| Document | Path |
|---|---|
| Product requirements (MVP Scope v3) | `docs/prd.md` |
| MVP scope, Session 1 record | `docs/mvp-scope.md` |
| Function List (119 subfunctions, 104 in the MVP) | `docs/function-list.md` |
| Screen List (48 screens) | `docs/screen-list.md` |
| Architecture diagrams | `docs/architecture/` |
| Screen Specs and mockups (41 screens) | `docs/screens/` |
| Data model and seed data | `data/` |
| Word copies of the Spec Documents | `docs/word/specs/` |

## 4. Reading order

Start with the module you are working on: its §3 says what the user must be able to do, §5 says what the system must do, §6 and `data/04-data-model.md` say what is stored, §7 names the screens, §10 says what is still open.

## 5. Functional requirements and data

The 104 functional requirements are in §5 of the module files (table in section 1 above). The data they read and write is summarised here.

### 5.1 Entities

The entities of CINEMATCH, with the canonical names used by the Session 5 data model (`data/01-entity-dictionary.md`). 51 entities: 46 are stored as tables (one CSV each in `data/seed/`) and 5 are *derived* — computed on read, never stored.

| # | Entity | Definition | Kind | Owner module |
|---|---|---|---|---|
| 1 | `USER_ACCOUNT` | A person's sign-in identity on CINEMATCH, carrying exactly one of six roles. | THING | SYS |
| 2 | `PROFILE` | The personal details shown for an account: name, crew role and preferred language. | THING | SYS |
| 3 | `PRODUCER_ORGANISATION` | The production company a producer signs up on behalf of. | THING | SYS |
| 4 | `CONSENT` | A record that an account accepted a given version of the terms at a given time. | EVENT | SYS |
| 5 | `NOTIFICATION` | An in-app message addressed to one account about one event. | EVENT | SYS |
| 6 | `EMAIL_DELIVERY` | One transactional email handed to the email provider, with its delivery outcome. | EVENT | SYS |
| 7 | `SEGMENT_RULE` | One row of the VFDA-approved decision table that maps router answers to segment A, B or C. | THING | M1 |
| 8 | `SEGMENT_REQUIREMENT` | One item a segment needs or does not need, used to configure the journey and the gauges. | THING | M1 |
| 9 | `SEGMENT_DECISION` | The segment given to a visitor or project from their answers, including any manual override. | EVENT | M1 |
| 10 | `PROJECT` | A film or content production a producer is preparing to shoot in Vietnam. | THING | M0 |
| 11 | `PROJECT_MEMBER` | A person's access to one project, with view or edit permission. | THING | M0 |
| 12 | `PROJECT_PROVINCE` | A province a project plans to shoot in. | THING | M0 |
| 13 | `READINESS_VIEW` | The five gauge scores, overall readiness and next steps of a project, computed on read. | DERIVED (computed on read) | M0 |
| 14 | `READINESS_SNAPSHOT` | The overall readiness of a project as recorded on one night. | EVENT | M0 |
| 15 | `LEGAL_RULE` | A content or dossier rule written and signed by the VFDA Legal Board, with its legal citation. | THING | M2 |
| 16 | `RULE_SET_VERSION` | A numbered edition of the active rule set, created each time a rule is activated. | EVENT | M2 |
| 17 | `PRECHECK_RUN` | One 200-word content pre-check, kept as a demand data point. | EVENT | M2 |
| 18 | `PRECHECK_FINDING` | One passage of a pre-checked summary that matches an approved rule. | EVENT | M2 |
| 19 | `COMPLIANCE_RUN` | One content check of a project against the active rule set. | EVENT | M2 |
| 20 | `COMPLIANCE_FINDING` | One finding of a project content check that a member can mark as reviewed. | EVENT | M2 |
| 21 | `DOSSIER_CHECK` | The Article 13 completeness result of a project, computed from its document slots. | DERIVED (computed on read) | M2 |
| 22 | `LICENSING_TIMELINE` | The safe and latest submission dates of a project, computed from its first shooting day. | DERIVED (computed on read) | M2 |
| 23 | `LOCATION` | A filming location in Vietnam described and published by VFDA staff. | THING | M3 |
| 24 | `LOCATION_IMAGE` | A photo of a location with its source and usage right. | THING | M3 |
| 25 | `AUTHORITY_CONTACT` | The local authority office and person to contact about filming at a location, verified by VFDA. | THING | M3 |
| 26 | `PROVINCE` | One of the 34 provincial-level units after the 2025 reorganisation. | THING | M3 |
| 27 | `LOCATION_QUERY` | A scene description a user typed and the attributes extracted from it, stored without personal data. | EVENT | M3 |
| 28 | `PROJECT_SHORTLIST` | A location a project has kept as its primary or backup choice. | THING | M3 |
| 29 | `PROVINCE_READINESS` | A province's readiness index computed from platform data, with sample sizes. | DERIVED (computed on read) | M3 |
| 30 | `ORGANISATION` | A Vietnamese service company listed in the partner directory. | THING | M4 |
| 31 | `ORGANISATION_MEMBER_LAYER` | The part of a partner profile visible to signed-in members. | THING | M4 |
| 32 | `ORGANISATION_PRIVATE_LAYER` | The part of a partner profile visible only after an accepted request and NDA. | THING | M4 |
| 33 | `VERIFICATION_REQUEST` | A partner's application for the VFDA Verified badge and VFDA's decision on it. | EVENT | M4 |
| 34 | `COLLAB_REQUEST` | A producer's request to a partner to work on one project, followed to confirmation. | EVENT | M4 |
| 35 | `COLLAB_MESSAGE` | A message written inside a collaboration request, including every response note; never edited once sent. | EVENT | M4 |
| 36 | `NDA_ACCEPTANCE` | One party's acceptance of a given NDA version for one collaboration request. | EVENT | M4 |
| 37 | `DOCUMENT_ACCESS_LOG` | A record that one person viewed one shared document at one time. | EVENT | M4 |
| 38 | `DOCUMENT_TYPE` | A kind of dossier document, with its legal basis and template. | THING | M5 |
| 39 | `DOCUMENT_SLOT` | The place for one document type in one project, with its status. | THING | M5 |
| 40 | `DOCUMENT` | One uploaded file version in a project's document slot. | THING | M5 |
| 41 | `BILINGUAL_DOCUMENT` | A generated English–Vietnamese draft of one document of a project. | THING | M5 |
| 42 | `BILINGUAL_PARAGRAPH` | One aligned source/Vietnamese paragraph pair of a bilingual draft, with its proofreading status. | THING | M5 |
| 43 | `PROJECT_GLOSSARY` | A project's agreed translation of one term, applied to every later draft of that project. | THING | M5 |
| 44 | `PUBLIC_HOLIDAY` | A public holiday period shown on the licensing timeline, official or expected. | THING | M5 |
| 45 | `LOCATION_INTEREST` | A member's statement that a project is interested in a location. | EVENT | M7 |
| 46 | `PROVINCE_NOTICE` | The notice VFDA sends a province about a project's interest, and the province's reply. | EVENT | M7 |
| 47 | `CONSULTATION_BOOKING` | A member's booked consultation slot with a VFDA officer. | EVENT | M7 |
| 48 | `MODERATION_ITEM` | A partner's published content (profile text or location photo) waiting for, or carrying, VFDA staff's approve-or-hide decision. | EVENT | M10 |
| 49 | `AUDIT_LOG` | A permanent record of one administrative action: who did what to which record, and when. | EVENT | M10 |
| 50 | `DEMAND_INDEX` | The six demand indicators of a reporting period, each with its sample size, computed from platform data. | DERIVED (computed on read) | M10 |
| 51 | `QUARTERLY_REPORT` | A quarterly demand report with its bilingual commentary, reread by a staff member before it is exported. | THING | M10 |

Columns, keys and relationships: `data/04-data-model.md`. Diagram: `data/03-erd.mmd`.

## 6. Business rules

One principle runs through the rules of every module: **CINEMATCH prepares and advises, but a person decides.** A language model never ranks, approves or submits anything (M2 BR-001, BR-003, BR-004; M3 BR-001; M5 BR-001; M10 BR-004), sensitive data is protected in the database, not in the interface (SYS BR-001, M3 BR-005, M4 BR-001), and nothing is ever hard-deleted (SYS BR-005, M0 BR-005, M2 BR-008, M3 BR-008, M4 BR-008, M10 BR-005).

All business rules, as written in §5.2 of each module file:

| Module | Rule | Statement |
|---|---|---|
| SYS | BR-001 | Sensitive data (authority contacts, partner private layer, project documents) is filtered by Row Level Security in the database. Hiding it in the interface does not count. |
| SYS | BR-002 | A new account is always `member`. The roles `partner`, `vfda_staff`, `vfda_legal` and `admin` are granted only by an admin, and every grant is written to the audit log. |
| SYS | BR-003 | Acceptance of the terms is stored with the document version and timestamp. |
| SYS | BR-004 | Passwords, password hashing and tokens are handled only by Supabase Auth. |
| SYS | BR-005 | An account is never hard-deleted. When its owner deletes it (SC-08), it is deactivated at once, loses all access, and its name, email and phone are replaced by anonymous values within 30 days; projects, uploads, access logs and approvals it created stay and are shown as *Former member*. |
| M1 | BR-001 | The segment is decided by a deterministic decision table (`segment_rules`) approved by VFDA; the same answers always give the same segment. |
| M1 | BR-002 | Question 4 never changes the segment; it only pre-selects service groups in M4. |
| M1 | BR-003 | A manual override is always allowed and always recorded. |
| M1 | BR-004 | Changing segment never deletes documents or answers; items that no longer apply are hidden, not removed. |
| M0 | BR-001 | Scores are computed only in the database view `v_project_readiness`; the interface never recomputes them. |
| M0 | BR-002 | Gauges shown depend on segment: segment C has no *Dossier & permits* gauge; the *Logistics* gauge is shown as `—` until phase 2. |
| M0 | BR-003 | Each gauge always has one next step; when a gauge is complete its next step reads *Done*. |
| M0 | BR-004 | Weights per segment are read from `segment_requirements`, never hard-coded. |
| M0 | BR-005 | Projects are archived, never deleted. An archived project (`stage = archived`) is read-only for its members, leaves the project list, and keeps its documents, requests and notices. |
| M2 | BR-001 | Every finding shown to a user cites a rule written and signed by the VFDA Legal Board; findings without a valid citation are dropped by code before display. |
| M2 | BR-002 | A rule becomes active only when it has a citation **and** an approver; this is enforced by a database CHECK constraint. |
| M2 | BR-003 | The words *approved*, *accepted*, *legally compliant* and *safe* never appear in results, including when nothing is found. |
| M2 | BR-004 | The attention level is derived deterministically from the number and severity of verified findings, never from a model score. |
| M2 | BR-005 | The dossier completeness check uses fixed rules, not a language model. |
| M2 | BR-006 | Safe deadline = first shooting day − buffer − 20 − 20 days; latest deadline = first shooting day − buffer − 20 days. |
| M2 | BR-007 | Every check stores the rule-set version it used. |
| M2 | BR-008 | Legal rules are retired, never deleted (`status = retired`); a finding keeps showing the text of the rule version it cited. |
| M3 | BR-001 | The language model only extracts attributes; ranking is done by a deterministic scoring function in the database. The model never names or ranks a location. |
| M3 | BR-002 | A result is shown only if its score is 40 or more and it has at least one *why it matches* reason. |
| M3 | BR-003 | *Not a match* and *No data yet* are different; missing data never counts for or against a location. |
| M3 | BR-004 | A location cannot be published until its local authority contact is verified; contacts are re-verified every 12 months [NEEDS CLARIFICATION]. |
| M3 | BR-005 | Authority contacts are returned only to signed-in users, enforced by Row Level Security. |
| M3 | BR-006 | Provinces use the 34 provincial-level units after the 2025 reorganisation; old names are accepted in search and mapped to the new unit. |
| M3 | BR-007 | The provincial index uses only data generated on the platform and always shows its sample size. |
| M3 | BR-008 | Locations are unpublished, never deleted (`intake_status = unpublished`); shortlists and provincial notices that refer to an unpublished location keep it and show *No longer published*. |
| M3 | BR-009 | Every confirmed scene search is stored as a location query without any personal data (description, attributes, month, and the project only when a member searches inside a project); it is used for the M10 demand index and never to train a model. |
| M3 | BR-010 | Every published location carries an availability set by VFDA staff: `open`, `survey_in_progress` (another crew is scouting it) or `paused` (not receiving crews for now). A paused location stays published and visible with its label; availability is the sixth scoring criterion; every change is written to the audit log (M10 FR-008). |
| M4 | BR-001 | The three visibility layers are three tables with separate Row Level Security policies, not hidden columns. |
| M4 | BR-002 | The 12 service groups are a fixed enum; organisations cannot invent groups. |
| M4 | BR-003 | Supplier accounts are created only by VFDA invitation in the first phase. |
| M4 | BR-004 | A VFDA Verified badge is valid for 12 months and states what was checked and what was not (quality and prices are not). |
| M4 | BR-005 | Only the producer can confirm a partnership; only the partner can accept or decline. Declined, withdrawn and confirmed are final. |
| M4 | BR-006 | Confirming a partnership does not by itself mark Article 13 component c as present; the signed service agreement must be uploaded. |
| M4 | BR-007 | Document access log entries are append-only. |
| M4 | BR-008 | Organisations are deactivated, never deleted (`org_status = deactivated`); open collaboration requests to a deactivated organisation are closed as *withdrawn* and the producer is notified; its document access log is kept. |
| M4 | BR-009 | Every response note and every reply in a request thread is stored as a message of that request (`collab_message`); messages cannot be edited after they are sent. |
| M5 | BR-001 | Every generated document is a draft: the PDF carries *DRAFT — REQUIRES PROOFREADING* on every page; CINEMATCH never submits anything. |
| M5 | BR-002 | Article 13 component b counts as present only when every paragraph of the Vietnamese version has been proofread by a person. |
| M5 | BR-003 | Each document item carries its basis: *Required by law*, *Commonly requested* or *Location-specific*; nothing is presented as mandatory without a legal basis. |
| M5 | BR-004 | The document list is generated from `segment_requirements` plus shortlisted locations; it is never hard-coded. |
| M5 | BR-005 | The countdown uses the same calculation as M2 (F-M2-17) and the dashboard. |
| M5 | BR-006 | Glossary terms a project adds (SC-28) are stored with the project (`project_glossary`) and applied to every later draft of that project. |
| M7 | BR-001 | Notices are sent in VFDA's name, never directly by the producer. |
| M7 | BR-002 | Every notice states that it does not replace the filming licence from the Ministry of Culture, Sports and Tourism. |
| M7 | BR-003 | The province's reply is one of three final values; the free-text note is kept as entered. |
| M7 | BR-004 | Reply times feed the provincial readiness index (M3). |
| M7 | BR-005 | Consultation booking (SC-33) is offered only after VFDA has declared its staffed hours and reply time; until then SC-33 shows VFDA's contact email instead of the booking form. |
| M10 | BR-001 | Content published by partners (profile text, photos) is shown to the public only after VFDA staff approve it; until then the last approved version stays public. |
| M10 | BR-002 | Hiding content requires a written reason, which is sent to the author. |
| M10 | BR-003 | Every indicator shows the number of records it was computed from; below 5 records it shows *Not enough data* instead of a value. |
| M10 | BR-004 | A quarterly report can be exported only after a named staff member has marked it reread; the draft commentary is never sent as written by the model. |
| M10 | BR-005 | Audit records are append-only: no role, including admin, can update or delete them, and the admin action and its record are committed together or not at all. |
