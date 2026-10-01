---
artifact: 01-entity-dictionary
step: S1
generated: 2026-10-01
sources: FUNCTIONS, FIELDS, ENTITIES, RULES, SCENARIOS, FLOWS, SCREENS, BOUNDARY
---


# Entity Dictionary — CINEMATCH

One consolidated dictionary for the 9 specified modules. Canonical names are UPPER_SNAKE and singular; they are the names used in `03-erd.mmd`, `04-data-model.md` and `seed/`.

## INPUT MAP (S0)

```text
INPUT MAP
I am providing the following slots. Treat every slot not listed here as ABSENT, and apply the
degradation rules rather than inventing the missing material.

  FUNCTIONS = section 5 FR tables of the 9 module Spec Documents in docs/spec/
              (spec-SYS, spec-M1, spec-M0, spec-M2, spec-M3, spec-M4, spec-M5, spec-M7, spec-M10),
              104 rows (Spec Documents of 30/09/2026)
  FIELDS    = section 5.1 "Input / Output contract" of the same documents
              (every field typed, inputs marked Req / Opt), plus section 6.1
              "Attribute types" (types of the section 6 attributes no 5.1 field declares)
  ENTITIES  = section 6 "Key entities" of the same documents, 51 declared entities
  RULES     = section 5.2 "Business rules" of the same documents (BR-001 ... per module)
  SCENARIOS = section 3 user stories US-n with Given / When / Then, plus "Edge cases"
  FLOWS     = section 4 Mermaid blocks (usage flows 4.1, sequence diagrams 4.2+)
  SCREENS   = section 7 tables + docs/screens/screen-spec-<ID>.md (41 Screen Specs)
  BOUNDARY  = section 1 "Depends on" (external: Supabase Auth / PostgreSQL / Storage,
              Resend email, language-model API, PDF rendering, OpenStreetMap tiles, PostGIS)

  Out of this input: M6, M8, M9 are Won't for this release (docs/prd.md §4.4).

CITATION SCHEME = <MODULE> §<section> <ID>
  e.g. "M3 §5.1 FR-008" (field row of F-M3-08) | "M3 §5.2 BR-004" | "M3 §3 US-2" | "M3 §6"
```

**Count:** 51 declared in the specs' section 6 — 46 stored (25 THING, 21 EVENT) and 5 that the specs themselves define as *derived* (computed, not stored). Derived entities stay in this dictionary so that nothing declared disappears, but they are not drawn in the ERD (open question 2).

## Entities

| Canonical name | Definition (one sentence) | THING/EVENT | Owner | Aliases | Citation |
|---|---|---|---|---|---|
| `USER_ACCOUNT` | A person's sign-in identity on CINEMATCH, carrying exactly one of six roles. | THING | SYS | UserAccount; user; recipient_id; viewer_id; reviewer_id; approver_id; officer_id; member_id; author_id; verified_by; decided_by; uploaded_by; submitted_by; admin_id; actor_id; reread_by | SYS §6; SYS §5.1 FR-001, FR-004; SYS §5.2 BR-005 |
| `PROFILE` | The personal details shown for an account: name, crew role and preferred language. | THING | SYS | Profile | SYS §6; SYS §5.1 FR-001 |
| `PRODUCER_ORGANISATION` | The production company a producer signs up on behalf of. | THING | SYS | ProducerOrganisation; org_name (sign-up); producer company | SYS §6; SYS §5.1 FR-001 |
| `CONSENT` | A record that an account accepted a given version of the terms at a given time. | EVENT | SYS | Consent; consent_version | SYS §6; SYS §5.2 BR-003 |
| `NOTIFICATION` | An in-app message addressed to one account about one event. | EVENT | SYS | Notification; notifications | SYS §6; SYS §5.1 FR-007 |
| `EMAIL_DELIVERY` | One transactional email handed to the email provider, with its delivery outcome. | EVENT | SYS | EmailDelivery; delivery_status | SYS §6; SYS §5.1 FR-008 |
| `SEGMENT_RULE` | One row of the VFDA-approved decision table that maps router answers to segment A, B or C. | THING | M1 | SegmentRule; segment_rules; decision table | M1 §6; M1 §5.2 BR-001 |
| `SEGMENT_REQUIREMENT` | One item a segment needs or does not need, used to configure the journey and the gauges. | THING | M1 | SegmentRequirement; segment_requirements | M1 §6; M0 §5.2 BR-004; M5 §5.2 BR-004 |
| `SEGMENT_DECISION` | The segment given to a visitor or project from their answers, including any manual override. | EVENT | M1 | SegmentDecision; answers; journey_config | M1 §6; M1 §5.1 FR-002 |
| `PROJECT` | A film or content production a producer is preparing to shoot in Vietnam. | THING | M0 | Project; project_summary | M0 §6; M0 §5.1 FR-001, FR-002; M0 §5.2 BR-005 |
| `PROJECT_MEMBER` | A person's access to one project, with view or edit permission. | THING | M0 | ProjectMember; invitee | M0 §6; M0 §5.1 FR-004 |
| `PROJECT_PROVINCE` | A province a project plans to shoot in. | THING | M0 | ProjectProvince; provinces (project) | M0 §6; M0 §5.1 FR-001 |
| `READINESS_VIEW` | The five gauge scores, overall readiness and next steps of a project, computed on read. | DERIVED (computed on read) | M0 | ReadinessView; v_project_readiness; gauge_scores; dashboard_view | M0 §6; M0 §5.2 BR-001 |
| `READINESS_SNAPSHOT` | The overall readiness of a project as recorded on one night. | EVENT | M0 | ReadinessSnapshot; series | M0 §6; M0 §5.1 FR-008 |
| `LEGAL_RULE` | A content or dossier rule written and signed by the VFDA Legal Board, with its legal citation. | THING | M2 | LegalRule; legal_rule; legal_rule_public; rule | M2 §6; M2 §5.1 FR-001, FR-002; M2 §5.2 BR-008 |
| `RULE_SET_VERSION` | A numbered edition of the active rule set, created each time a rule is activated. | EVENT | M2 | RuleSetVersion; rule_version; version | M2 §6; M2 §5.1 FR-004 |
| `PRECHECK_RUN` | One 200-word content pre-check, kept as a demand data point. | EVENT | M2 | PrecheckRun (brief); brief; brief_id | M2 §6; M2 §5.1 FR-007 |
| `PRECHECK_FINDING` | One passage of a pre-checked summary that matches an approved rule. | EVENT | M2 | PrecheckFinding; findings; verified_findings | M2 §6; M2 §5.1 FR-006 |
| `COMPLIANCE_RUN` | One content check of a project against the active rule set. | EVENT | M2 | ComplianceRun | M2 §6 |
| `COMPLIANCE_FINDING` | One finding of a project content check that a member can mark as reviewed. | EVENT | M2 | ComplianceFinding; finding | M2 §6; M2 §5.1 FR-014 |
| `DOSSIER_CHECK` | The Article 13 completeness result of a project, computed from its document slots. | DERIVED (computed on read) | M2 | DossierCheck; completeness_pct; checklist_view | M2 §6 ("derived from DocumentSlots (M5)") |
| `LICENSING_TIMELINE` | The safe and latest submission dates of a project, computed from its first shooting day. | DERIVED (computed on read) | M2 | LicensingTimeline; milestones; timeline_view | M2 §6 ("derived from Project.shoot_date"); M2 §5.2 BR-006 |
| `LOCATION` | A filming location in Vietnam described and published by VFDA staff. | THING | M3 | Location; location_card; location_admin; location_detail | M3 §6; M3 §5.1 FR-002; M3 §5.2 BR-008 |
| `LOCATION_IMAGE` | A photo of a location with its source and usage right. | THING | M3 | LocationImage; image | M3 §6; M3 §5.1 FR-003 |
| `AUTHORITY_CONTACT` | The local authority office and person to contact about filming at a location, verified by VFDA. | THING | M3 | AuthorityContact; location_authority_contacts; authority_contact | M3 §6; M3 §5.1 FR-004 |
| `PROVINCE` | One of the 34 provincial-level units after the 2025 reorganisation. | THING | M3 | Province; province_page; hq_province | M3 §6; M3 §5.2 BR-006 |
| `LOCATION_QUERY` | A scene description a user typed and the attributes extracted from it, stored without personal data. | EVENT | M3 | LocationQuery; query_id; scene_description; attributes | M3 §6; M3 §5.1 FR-010, FR-011; M3 §5.2 BR-009 |
| `PROJECT_SHORTLIST` | A location a project has kept as its primary or backup choice. | THING | M3 | ProjectShortlist; shortlist | M3 §6; M3 §5.1 FR-018 |
| `PROVINCE_READINESS` | A province's readiness index computed from platform data, with sample sizes. | DERIVED (computed on read) | M3 | ProvinceReadiness; readiness_index | M3 §6 ("derived from Locations, Organisations, Notices"); M3 §5.2 BR-007 |
| `ORGANISATION` | A Vietnamese service company listed in the partner directory. | THING | M4 | Organisation; partner; supplier; org_card; public_profile | M4 §6; M4 §5.1 FR-001; M4 §5.2 BR-008 |
| `ORGANISATION_MEMBER_LAYER` | The part of a partner profile visible to signed-in members. | THING | M4 | OrganisationMemberLayer; member_profile | M4 §6; M4 §5.2 BR-001 |
| `ORGANISATION_PRIVATE_LAYER` | The part of a partner profile visible only after an accepted request and NDA. | THING | M4 | OrganisationPrivateLayer; private_profile | M4 §6; M4 §5.2 BR-001 |
| `VERIFICATION_REQUEST` | A partner's application for the VFDA Verified badge and VFDA's decision on it. | EVENT | M4 | VerificationRequest; verification_request_id; verification_request | M4 §6; M4 §5.1 FR-008 |
| `COLLAB_REQUEST` | A producer's request to a partner to work on one project, followed to confirmation. | EVENT | M4 | CollabRequest; collab_request; collaboration request | M4 §6; M4 §5.1 FR-012 |
| `COLLAB_MESSAGE` | A message written inside a collaboration request, including every response note; never edited once sent. | EVENT | M4 | CollabMessage; collab_message; message_id | M4 §6; M4 §5.1 FR-014; M4 §5.2 BR-009 |
| `NDA_ACCEPTANCE` | One party's acceptance of a given NDA version for one collaboration request. | EVENT | M4 | NdaAcceptance; nda_acceptance_id | M4 §6; M4 §5.1 FR-017 |
| `DOCUMENT_ACCESS_LOG` | A record that one person viewed one shared document at one time. | EVENT | M4 | DocumentAccessLog; access_log | M4 §6; M4 §5.1 FR-018 |
| `DOCUMENT_TYPE` | A kind of dossier document, with its legal basis and template. | THING | M5 | DocumentType; doc_code; required_documents | M5 §6; M5 §5.1 FR-001 |
| `DOCUMENT_SLOT` | The place for one document type in one project, with its status. | THING | M5 | DocumentSlot; doc_status; missing_documents | M5 §6; M5 §5.1 FR-003 |
| `DOCUMENT` | One uploaded file version in a project's document slot. | THING | M5 | Document; file | M5 §6; M5 §5.1 FR-002 |
| `BILINGUAL_DOCUMENT` | A generated English–Vietnamese draft of one document of a project. | THING | M5 | BilingualDocument; bilingual draft | M5 §6; M5 §5.1 FR-004 |
| `BILINGUAL_PARAGRAPH` | One aligned source/Vietnamese paragraph pair of a bilingual draft, with its proofreading status. | THING | M5 | BilingualParagraph; paragraphs | M5 §6; M5 §5.1 FR-004, FR-006 |
| `PROJECT_GLOSSARY` | A project's agreed translation of one term, applied to every later draft of that project. | THING | M5 | ProjectGlossary; project_glossary; glossary | M5 §6; M5 §5.1 FR-004; M5 §5.2 BR-006 |
| `PUBLIC_HOLIDAY` | A public holiday period shown on the licensing timeline, official or expected. | THING | M5 | PublicHoliday; holiday bands | M5 §6; M5 §5.1 FR-008 |
| `LOCATION_INTEREST` | A member's statement that a project is interested in a location. | EVENT | M7 | LocationInterest; interest | M7 §6; M7 §5.1 FR-001 |
| `PROVINCE_NOTICE` | The notice VFDA sends a province about a project's interest, and the province's reply. | EVENT | M7 | ProvinceNotice; notice; response_status | M7 §6; M7 §5.1 FR-002, FR-003 |
| `CONSULTATION_BOOKING` | A member's booked consultation slot with a VFDA officer. | EVENT | M7 | ConsultationBooking; booking | M7 §6; M7 §5.1 FR-005 |
| `MODERATION_ITEM` | A partner's published content (profile text or location photo) waiting for, or carrying, VFDA staff's approve-or-hide decision. | EVENT | M10 | ModerationItem; moderation_queue; content_id | M10 §6; M10 §5.1 FR-001, FR-002; M10 §5.2 BR-001 |
| `AUDIT_LOG` | A permanent record of one administrative action: who did what to which record, and when. | EVENT | M10 | AuditLog; audit_log; audit_entries; audit log (SYS BR-002) | M10 §6; M10 §5.1 FR-008; M10 §5.2 BR-005 |
| `DEMAND_INDEX` | The six demand indicators of a reporting period, each with its sample size, computed from platform data. | DERIVED (computed on read) | M10 | DemandIndex; demand_index; filtered_index; dashboard_view (M10) | M10 §6 ("not stored"); M10 §5.1 FR-003; M10 §5.2 BR-003 |
| `QUARTERLY_REPORT` | A quarterly demand report with its bilingual commentary, reread by a staff member before it is exported. | THING | M10 | QuarterlyReport; report_id; report | M10 §6; M10 §5.1 FR-006, FR-007; M10 §5.2 BR-004 |

## Implied but never declared

Nouns the FIELDS or RULES need the system to remember, with no declared entity. **Reported, not added.**

| Field name | Source | Why it looks like an entity |
|---|---|---|
| service_groups ENUM[] | M4 §5.1 FR-001; M4 §6 (Organisation "has many OrganisationServices") | §6 names OrganisationServices in a relationship but never declares it; FR-001 stores it as an array. |
| provinces INTEGER[] (organisation) | M4 §5.1 FR-001; M4 §6 ("has many ... OrganisationProvinces") | Same as above: a relationship to an undeclared OrganisationProvinces entity. |
| partner user ↔ organisation ("a partner create and edit its organisation") | M4 §5.1 FR-001 | Something must record which accounts may edit which organisation; no field or entity carries it. |
| invitee_email VARCHAR(254) | M0 §5.1 FR-004; M0 §3 US-3 ("sees the project after accepting") | An invitation to an email that has no account yet must be remembered until accepted; ProjectMember carries user_id only. |
| message_key VARCHAR(120) (bilingual display dictionary) | SYS §5.1 FR-006 | Every interface string is read from a dictionary keyed by message_key; no entity holds it. |
| scene_type_catalog ENUM[] | M3 §5.1 FR-012; M3 §10 ("Who maintains the fixed attribute catalogue") | Scene types are now a declared enum (M3 §5.1 FR-002), but the catalogue also covers terrain and era and maps unknown words — that is maintained data. |
| slot_start TIMESTAMPTZ (offered consultation slots) | M7 §5.1 FR-005 | A member picks a slot, so available slots must exist somewhere before the booking. |
| segment filter (legal rules) | M2 §5.1 FR-015 | Public rules are filtered by segment, but LegalRule declares no segment; rule ↔ segment is many-to-many. (Topic is now declared, M2 §5.1 FR-002.) |
| rate limit per IP | M2 §5.1 FR-005; M2 §3 Edge cases ("50 times in an hour") | Counting pre-checks per IP needs remembered counts; may be infrastructure, not domain data. |
| submitted content (pending version) | M10 §5.2 BR-001; M10 §3 US-1 | The last approved text stays public while the new one waits, so the waiting version must be stored somewhere; MODERATION_ITEM declares no content column. |
| prepared_by (quarterly report) | M10 §6 (QuarterlyReport "prepared by UserAccount") | Only reread_by is declared; who prepared the report is named in the relationship but has no field. |

## Conflicts requiring a human decision

| Type (synonym / collision / shared ownership / type mismatch) | Items | Sources | What must be decided | Decision |
|---|---|---|---|---|
| collision | PRODUCER_ORGANISATION vs ORGANISATION | SYS §6; M4 §6; M5 §5.1 FR-006 (reviewer_org_id) | Two different concepts share the word "organisation" (foreign producer company vs Vietnamese supplier). Keep two entities, or one ORGANISATION with a type? Which one does reviewer_org_id point to? | Applied: two entities. `reviewer_org_id` points to ORGANISATION (the Vietnamese partner). |
| collision | rule_id in SEGMENT_RULE vs rule_id in LEGAL_RULE | M1 §6; M2 §5.1 FR-002 | Same column name, unrelated concepts. Rename one (e.g. segment_rule_id). | Applied: SEGMENT_RULE key renamed `segment_rule_id` (M1 §6.1). |
| collision | document_id of BILINGUAL_DOCUMENT (M5 FR-006) vs document_id of DOCUMENT | M5 §5.1 FR-002, FR-006; M5 §6 | FR-006 proofreads a bilingual draft by document_id, but BILINGUAL_DOCUMENT declares no id and document_id is DOCUMENT's key. | Applied: BILINGUAL_DOCUMENT is keyed by project_id + doc_code; F-M5-06 `document_id` is read as that pair. |
| collision | "partner" = ORGANISATION, role `partner`, and NDA party `partner` | M4 §6; SYS §5.1 FR-004; M4 §5.1 FR-017 | One word, three meanings. Fix the glossary so specs say *partner organisation*, *partner account* and *partner party*. | Applied: glossary — *partner organisation* (ORGANISATION), *partner account* (role `partner`), *partner party* (NDA_ACCEPTANCE.party). |
| synonym | PRECHECK_RUN = brief (brief_id) | M2 §6; M2 §5.1 FR-007 | Canonical name proposed: PRECHECK_RUN, key precheck_id; alias brief_id. | Applied: entity PRECHECK_RUN; key keeps the spec name `brief_id`. |
| synonym | crew_size_band (PROJECT) = crew_capacity (LOCATION) = crew_size (search) | M0 §5.1 FR-001; M3 §5.1 FR-002, FR-007 | Same value set ENUM(u15, 15_50, o50) under three names. One name for the value set? | Applied: three column names kept as each spec declares them, one shared value set ENUM(u15, 15_50, o50). |
| synonym | lang (FR-005) = locale (FR-007) on the same pre-check | M2 §5.1 FR-005, FR-007 | Same concept, two names and different value order (en, vi) vs (vi, en). One canonical name. | Applied: one column `lang` ENUM(en, vi) (F-M2-05 input). |
| synonym | NOTIFICATION vs "notification_id" returned by F-M7-02 (an email to a province) | SYS §6; M7 §5.1 FR-002 | F-M7-02 returns notification_id with delivery_status (queued/sent/bounced) — that is EMAIL_DELIVERY, not an in-app NOTIFICATION. | Applied: F-M7-02's `notification_id` is an EMAIL_DELIVERY (it has a delivery status), not an in-app NOTIFICATION. |
| type mismatch | rule set version: INTEGER vs VARCHAR(20) | M2 §5.1 FR-002 (OUT version INTEGER); FR-004 (OUT rule_version VARCHAR(20)); M2 §3 US-1 ("rule set 2026.08") | Which type and format is the rule-set version? | Applied: VARCHAR(20), e.g. `2026.08` (M2 FR-004, US-1). |
| type mismatch | PROJECT.shoot_date: Opt vs Req | M0 §5.1 FR-001 (Opt); M5 §5.1 FR-007 (Req); M2 §5.1 FR-017 (Req); M7 §3 US-1 | Optional at creation but required by the countdown and notices. Confirm: optional in storage, required by those functions. | Applied: optional in storage; required by the functions that use it (M5 FR-007, M2 FR-017). |
| type mismatch | segment_override: ENUM(A, B, C) vs boolean | M1 §5.1 FR-002; M1 §3 US-2 ("segment_override = true") | Is it the overriding segment or a flag that an override happened? | Applied: ENUM(A, B, C) = the overriding segment; *an override happened* = `segment_override` is set. |
| type mismatch | PROFILE.locale vs cookie `locale` | SYS §6; SYS §5.1 FR-005 ("stored in cookie") | Is the language remembered on the profile, in a cookie, or both? | Applied: stored on PROFILE for members; the cookie is used only for guests. |
| synonym | DOCUMENT_SLOT.state vs `document_slots.status` | M5 §5.1 FR-003 (state); docs/screens/screen-spec-SC-27.md element 7 (status) | Same column, two names across FIELDS and SCREENS. Canonical: state. | Applied: `state` (SC-27 corrected 01/10/2026). |
| type mismatch | COLLAB_REQUEST status on confirm: `confirmed` vs `closed` | M4 §5.1 FR-014 (confirmed); docs/screens/screen-spec-SC-25.md interaction 5 (`status = closed`) | SC-25 writes a value that is not in the enum. Correct the Screen Spec to `confirmed`? | Applied: `confirmed` (SC-25 corrected 01/10/2026). |
| synonym | ORGANISATION vs `organizations` / `service_categories` | M4 §6; docs/screens/screen-spec-SC-19.md elements 3, 6, 8 | Screen Specs use US spelling and another name for service groups. One spelling for table names. | Applied: `organisation`, `organisation.service_groups` (SC-19, SC-20 corrected 01/10/2026). |
| shared ownership | NOTIFICATION created by SYS, M4 and M7 functions | SYS §5.1 FR-007; M4 §5.1 FR-011, FR-015; M7 §5.1 FR-007 | Proposed owner SYS; other modules call F-SYS-07 instead of writing rows themselves. | Applied: owner SYS; M4 and M7 call F-SYS-07. |
| shared ownership | EMAIL_DELIVERY created by SYS, M4 and M7 functions | SYS §5.1 FR-008; M4 §5.1 FR-015; M7 §5.1 FR-002 | Proposed owner SYS; M4/M7 call F-SYS-08. | Applied: owner SYS; M4 and M7 call F-SYS-08. |
| shared ownership | DOCUMENT_ACCESS_LOG declared by M4 about DOCUMENT owned by M5 | M4 §6; M5 §6 | Which module owns the access log: M4 (who shares) or M5 (who stores)? | Applied: owner M4 (declared in M4 §6, written by F-M4-18); it only references DOCUMENT (M5). |
| synonym | LOCATION_QUERY scene_description / shoot_month (FIELDS) = description / month (ENTITIES) | M3 §5.1 FR-011; M3 §6 | Canonical proposed: the FIELDS names scene_description and shoot_month (used in 04). | Applied: FIELDS names `scene_description`, `shoot_month`. |
| synonym | PROJECT_GLOSSARY term_en / term_vi (FIELDS) = source_term / target_term (ENTITIES) | M5 §5.1 FR-004; M5 §6 | Canonical proposed: the FIELDS names term_en and term_vi (used in 04). | Applied: FIELDS names `term_en`, `term_vi`. |
| synonym | AUDIT_LOG admin_id (write) = actor_id (search filter) | M10 §5.1 FR-008, FR-009 | Same person column under two names. Canonical proposed: admin_id. | Applied: `admin_id`; the search filter `actor_id` of F-M10-09 filters on it. |
| collision | MODERATION_ITEM refers to "Organisation or LocationImage" through one content_id | M10 §6; M10 §5.1 FR-001 | One reference to two tables cannot carry a foreign key. Modelled as two nullable FKs with a CHECK (see 04 Structural findings); confirm. | Applied: two nullable foreign keys with a CHECK that exactly one is set and matches content_type (constraint `ck_moderation_item_one_target`). |
| shared ownership | AUDIT_LOG written by the admin screens of M2, M3, M4 and by SYS role grants | M10 §1 Out of scope; SYS §5.2 BR-002 | Proposed owner M10; other modules never insert rows themselves — a trigger writes them (M10 §4.3, F-M10-08). | Applied: owner M10; other modules never insert rows — a trigger in the same transaction writes them (M10 §4.3). |

## Open questions

| # | Question | Blocking? | Owner | Default applied | Consequence if the default is wrong | Resolution |
|---|---|---|---|---|---|---|
| 1 | [NEEDS CLARIFICATION: Keep PRODUCER_ORGANISATION and ORGANISATION as two entities, or merge with an organisation type?] | Yes | Nam + VFDA | Two entities | Merging later rewrites Profile, Project, COLLAB_REQUEST foreign keys and RLS policies. | Open |
| 2 | [NEEDS CLARIFICATION: Are READINESS_VIEW, DOSSIER_CHECK, LICENSING_TIMELINE and PROVINCE_READINESS computed on read, never stored?] | No | Group C (M0/M2/M3 owners) | Computed on read (database views); excluded from the ERD | If any must be stored (e.g. for audit), a table and its refresh rule must be added. | Open |
| 3 | [NEEDS CLARIFICATION: Declare ORGANISATION_SERVICE and ORGANISATION_PROVINCE, or keep arrays on ORGANISATION?] | No | M4 owner | Arrays as declared in FR-001 | Arrays break 1NF: filtering by province and counting per service group (M3 index) becomes slower and harder to constrain. | Open |
| 4 | [NEEDS CLARIFICATION: Which entity records that a partner account may edit an organisation?] | Yes | M4 owner | None modelled; flagged | Without it RLS cannot decide who edits an organisation profile (F-M4-01). | Open |
| 5 | [NEEDS CLARIFICATION: How is an invitation to an email without an account stored until accepted?] | Yes | M0 owner | invitee_email kept on PROJECT_MEMBER with user_id empty | A member row without a user breaks the "belongs to UserAccount" relationship. | Open |
| 6 | [NEEDS CLARIFICATION: Where does the audit log live before M10 has a Spec Document?] | Yes | Nam (M10) | Not modelled in this package | SYS BR-002 and M4 depend on it; RLS for grants cannot be audited. | Resolved 30/09/2026 — M10 now has a Spec Document: AUDIT_LOG is modelled from M10 §6 and §5.1 FR-008, append-only (M10 §5.2 BR-005). |


---
*Human gate 1 (not delegable): the Decision column records the choice applied in 04 on 01/10/2026 — confirm or change it, review the implied entities, and rewrite each definition in your own words. Signed: ____________________  Date: __________*
