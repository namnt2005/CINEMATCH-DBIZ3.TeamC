---
artifact: 02-crud-matrix
step: S2
generated: 2026-09-30
sources: FUNCTIONS, FIELDS, ENTITIES, RULES, SCENARIOS, FLOWS, SCREENS, BOUNDARY
---


# CRUD Matrix — CINEMATCH

Long form: one row per (function, entity) pair that interacts — 167 rows over 96 of the 104 functions. Function IDs are the DBIZ2 Subfunction IDs; `F-M3-08` is `FR-008` in `docs/spec/spec-M3.md`. Each row was decided from the function description and its I/O row, not from the entity name.

## Interactions

| Function | Entity | Ops | Citation |
|---|---|---|---|
| F-SYS-01 | `USER_ACCOUNT` | C | SYS §5.1 FR-001 |
| F-SYS-01 | `PROFILE` | C | SYS §5.1 FR-001 |
| F-SYS-01 | `PRODUCER_ORGANISATION` | C | SYS §5.1 FR-001 (org_name, country, website) |
| F-SYS-01 | `CONSENT` | C | SYS §5.1 FR-001 (consent_version) |
| F-SYS-02 | `USER_ACCOUNT` | R | SYS §5.1 FR-002 |
| F-SYS-03 | `USER_ACCOUNT` | RU | SYS §5.1 FR-003 (new_password; via Supabase Auth, SYS §5.2 BR-004) |
| F-SYS-04 | `USER_ACCOUNT` | RU | SYS §5.1 FR-004 (role, account_status); SYS §5.2 BR-005 (deactivated, never deleted) |
| F-SYS-04 | `PROFILE` | U | SYS §5.2 BR-005 (name replaced by an anonymous value within 30 days) |
| F-SYS-07 | `NOTIFICATION` | C | SYS §5.1 FR-007 |
| F-SYS-08 | `EMAIL_DELIVERY` | CU | SYS §5.1 FR-008 (delivery_status; retried up to 3 times) |
| F-SYS-09 | `NOTIFICATION` | RU | SYS §5.1 FR-009 (list; mark as read) |
| F-SYS-11 | `LOCATION` | U | SYS §5.1 FR-011 (embedding of location descriptions) |
| F-SYS-11 | `ORGANISATION_MEMBER_LAYER` | U | SYS §5.1 FR-011 (embedding of supplier descriptions) |
| F-M1-02 | `SEGMENT_RULE` | R | M1 §5.1 FR-002; M1 §5.2 BR-001 |
| F-M1-02 | `SEGMENT_REQUIREMENT` | R | M1 §5.1 FR-002 (needed / not needed list) |
| F-M1-02 | `SEGMENT_DECISION` | C | M1 §5.1 FR-002; M1 §6 |
| F-M1-03 | `PROJECT` | U | M1 §5.1 FR-003 (new_segment) |
| F-M1-03 | `SEGMENT_DECISION` | C | M1 §5.2 BR-003 (override always recorded) |
| F-M1-03 | `SEGMENT_REQUIREMENT` | R | M1 §5.1 FR-003 (journey_config) |
| F-M0-01 | `PROJECT` | C | M0 §5.1 FR-001 |
| F-M0-01 | `PROJECT_MEMBER` | C | M0 §5.1 FR-001 ("make the creator its owner") |
| F-M0-01 | `PROJECT_PROVINCE` | C | M0 §5.1 FR-001 (provinces) |
| F-M0-01 | `PROVINCE` | R | M0 §5.1 FR-001 ("from the 34-province list") |
| F-M0-02 | `PROJECT` | U | M0 §5.1 FR-002 (stage); M0 §5.2 BR-005 (archived, never deleted) |
| F-M0-03 | `PROJECT` | R | M0 §5.1 FR-003 |
| F-M0-03 | `PROJECT_MEMBER` | R | M0 §5.1 FR-003 (RLS: member projects only) |
| F-M0-03 | `READINESS_VIEW` | R | M0 §5.1 FR-003 (readiness, next step) |
| F-M0-04 | `PROJECT_MEMBER` | C | M0 §5.1 FR-004 |
| F-M0-05 | `READINESS_VIEW` | R | M0 §5.1 FR-005; M0 §5.2 BR-001 |
| F-M0-05 | `SEGMENT_REQUIREMENT` | R | M0 §5.1 FR-005 (weights from segment_requirements) |
| F-M0-06 | `READINESS_VIEW` | R | M0 §5.1 FR-006 |
| F-M0-06 | `PROJECT` | R | M0 §5.1 FR-006 (project's segment) |
| F-M0-07 | `READINESS_VIEW` | R | M0 §5.1 FR-007 |
| F-M0-08 | `READINESS_SNAPSHOT` | C | M0 §5.1 FR-008 |
| F-M0-08 | `READINESS_VIEW` | R | M0 §5.1 FR-008 |
| F-M0-09 | `READINESS_SNAPSHOT` | R | M0 §5.1 FR-009 |
| F-M2-01 | `LEGAL_RULE` | R | M2 §5.1 FR-001 |
| F-M2-02 | `LEGAL_RULE` | CU | M2 §5.1 FR-002 ("create and edit"; topic) |
| F-M2-03 | `LEGAL_RULE` | U | M2 §5.1 FR-003 (approved_at, is_active) |
| F-M2-04 | `RULE_SET_VERSION` | C | M2 §5.1 FR-004 |
| F-M2-06 | `LEGAL_RULE` | R | M2 §5.1 FR-006 (active_rules) |
| F-M2-06 | `PRECHECK_RUN` | U | M2 §5.1 FR-006 (attention_level) |
| F-M2-06 | `PRECHECK_FINDING` | C | M2 §5.1 FR-006 (findings) |
| F-M2-07 | `PRECHECK_RUN` | C | M2 §5.1 FR-007 |
| F-M2-08 | `DOSSIER_CHECK` | R | M2 §5.1 FR-008; M2 §6 |
| F-M2-08 | `DOCUMENT_SLOT` | R | M2 §6 ("derived from DocumentSlots") |
| F-M2-09 | `DOCUMENT_SLOT` | R | M2 §5.1 FR-009 (status per component) |
| F-M2-10 | `DOSSIER_CHECK` | R | M2 §5.1 FR-010 |
| F-M2-10 | `READINESS_VIEW` | R | M2 §5.1 FR-010 (gauge_compliance) |
| F-M2-11 | `LEGAL_RULE` | R | M2 §5.1 FR-011 (codes of approved rules) |
| F-M2-12 | `PRECHECK_FINDING` | C | M2 §5.1 FR-012 (verified_findings) — see open question 3 |
| F-M2-12 | `COMPLIANCE_FINDING` | C | M2 §5.1 FR-012 (verified_findings) — see open question 3 |
| F-M2-12 | `LEGAL_RULE` | R | M2 §5.1 FR-012 ("rule code is unknown") |
| F-M2-13 | `PRECHECK_FINDING` | R | M2 §5.1 FR-013 |
| F-M2-13 | `COMPLIANCE_FINDING` | R | M2 §5.1 FR-013 |
| F-M2-13 | `LEGAL_RULE` | R | M2 §5.1 FR-013 (citation mandatory) |
| F-M2-14 | `COMPLIANCE_FINDING` | U | M2 §5.1 FR-014 |
| F-M2-15 | `LEGAL_RULE` | R | M2 §5.1 FR-015 |
| F-M2-16 | `LEGAL_RULE` | R | M2 §5.1 FR-016 |
| F-M2-17 | `LICENSING_TIMELINE` | R | M2 §5.1 FR-017; M2 §5.2 BR-006 |
| F-M2-17 | `PROJECT` | R | M2 §6 ("derived from Project.shoot_date") |
| F-M2-18 | `LICENSING_TIMELINE` | R | M2 §5.1 FR-018 |
| F-M3-01 | `LOCATION` | R | M3 §5.1 FR-001 |
| F-M3-02 | `LOCATION` | CU | M3 §5.1 FR-002 ("create and edit"; intake_status); M3 §5.2 BR-008 (unpublished, never deleted) |
| F-M3-02 | `PROVINCE` | R | M3 §5.1 FR-002 (province_id) |
| F-M3-03 | `LOCATION_IMAGE` | C | M3 §5.1 FR-003 (image_status) |
| F-M3-04 | `AUTHORITY_CONTACT` | CU | M3 §5.1 FR-004 (record; verified_by, verified_at) |
| F-M3-05 | `LOCATION` | U | M3 §5.1 FR-005 (published) |
| F-M3-05 | `AUTHORITY_CONTACT` | R | M3 §5.1 FR-005 (CHECK contact_verified) |
| F-M3-06 | `LOCATION` | R | M3 §5.1 FR-006 |
| F-M3-07 | `LOCATION` | R | M3 §5.1 FR-007 |
| F-M3-07 | `PROVINCE` | R | M3 §5.1 FR-007 (province or region) |
| F-M3-08 | `LOCATION` | R | M3 §5.1 FR-008 |
| F-M3-09 | `LOCATION` | R | M3 §5.1 FR-009 |
| F-M3-13 | `LOCATION` | R | M3 §5.1 FR-013 |
| F-M3-13 | `LOCATION_IMAGE` | R | M3 §5.1 FR-013 (photos) |
| F-M3-13 | `PROVINCE` | R | M3 §5.1 FR-013 |
| F-M3-11 | `LOCATION_QUERY` | C | M3 §5.1 FR-011 (query_id); M3 §5.2 BR-009 (stored without personal data) |
| F-M3-14 | `LOCATION` | R | M3 §5.1 FR-014 (nearby published) |
| F-M3-15 | `AUTHORITY_CONTACT` | R | M3 §5.1 FR-015; M3 §5.2 BR-005 |
| F-M3-17 | `LOCATION` | R | M3 §5.1 FR-017 |
| F-M3-18 | `PROJECT_SHORTLIST` | C | M3 §5.1 FR-018 |
| F-M3-18 | `READINESS_VIEW` | R | M3 §5.1 FR-018 (gauge_location) |
| F-M3-19 | `PROVINCE_READINESS` | R | M3 §5.1 FR-019 |
| F-M3-19 | `LOCATION` | R | M3 §6 (derived from Locations) |
| F-M3-19 | `ORGANISATION` | R | M3 §6 (derived from ... Organisations) |
| F-M3-19 | `PROVINCE_NOTICE` | R | M3 §6 (derived from ... Notices); M7 §5.2 BR-004 |
| F-M3-20 | `PROVINCE` | R | M3 §5.1 FR-020 |
| F-M3-20 | `PROVINCE_READINESS` | R | M3 §5.1 FR-020 |
| F-M4-01 | `ORGANISATION` | CU | M4 §5.1 FR-001 (org_status); M4 §5.2 BR-008 (deactivated, never deleted) |
| F-M4-01 | `ORGANISATION_MEMBER_LAYER` | CU | M4 §5.1 FR-001 (capability, languages) |
| F-M4-01 | `ORGANISATION_PRIVATE_LAYER` | CU | M4 §5.1 FR-001 (rate card, past clients) |
| F-M4-01 | `COLLAB_REQUEST` | U | M4 §5.2 BR-008 (open requests to a deactivated organisation closed as withdrawn) |
| F-M4-01 | `MODERATION_ITEM` | C | M10 §3 US-1 ("the change appears in the moderation queue"); M10 §5.2 BR-001 |
| F-M4-02 | `ORGANISATION` | R | M4 §5.1 FR-002 |
| F-M4-03 | `ORGANISATION_MEMBER_LAYER` | R | M4 §5.1 FR-003 |
| F-M4-04 | `ORGANISATION_PRIVATE_LAYER` | R | M4 §5.1 FR-004 |
| F-M4-04 | `COLLAB_REQUEST` | R | M4 §5.1 FR-004 (request_status) |
| F-M4-04 | `NDA_ACCEPTANCE` | R | M4 §5.1 FR-004 ("and the NDA accepted") |
| F-M4-05 | `ORGANISATION` | R | M4 §5.1 FR-005 |
| F-M4-06 | `ORGANISATION` | R | M4 §5.1 FR-006 |
| F-M4-06 | `ORGANISATION_MEMBER_LAYER` | R | M4 §5.1 FR-006 (working_language) |
| F-M4-07 | `ORGANISATION_MEMBER_LAYER` | R | M4 §5.1 FR-007 (semantic similarity) |
| F-M4-08 | `VERIFICATION_REQUEST` | C | M4 §5.1 FR-008 |
| F-M4-09 | `VERIFICATION_REQUEST` | R | M4 §5.1 FR-009 |
| F-M4-10 | `VERIFICATION_REQUEST` | U | M4 §5.1 FR-010 |
| F-M4-10 | `ORGANISATION` | U | M4 §5.1 FR-010 (verified_at) |
| F-M4-11 | `ORGANISATION` | RU | M4 §5.1 FR-011 ("remove the badge when it expires") |
| F-M4-11 | `NOTIFICATION` | C | M4 §5.1 FR-011 (reminder_notification_id) |
| F-M4-12 | `COLLAB_REQUEST` | C | M4 §5.1 FR-012 |
| F-M4-12 | `PROJECT` | R | M4 §5.1 FR-012 ("tied to one of their projects") |
| F-M4-13 | `COLLAB_REQUEST` | R | M4 §5.1 FR-013 |
| F-M4-14 | `COLLAB_REQUEST` | U | M4 §5.1 FR-014 |
| F-M4-14 | `COLLAB_MESSAGE` | C | M4 §5.1 FR-014 (message_id); M4 §5.2 BR-009 |
| F-M4-15 | `NOTIFICATION` | C | M4 §5.1 FR-015 ("in-app") |
| F-M4-15 | `EMAIL_DELIVERY` | C | M4 §5.1 FR-015 ("and by email") |
| F-M4-16 | `COLLAB_REQUEST` | R | M4 §5.1 FR-016 |
| F-M4-16 | `READINESS_VIEW` | R | M4 §5.1 FR-016 (gauge_partner) |
| F-M4-17 | `NDA_ACCEPTANCE` | C | M4 §5.1 FR-017 |
| F-M4-18 | `DOCUMENT_ACCESS_LOG` | C | M4 §5.1 FR-018 |
| F-M4-18 | `DOCUMENT` | R | M4 §5.1 FR-018 (document_id) |
| F-M4-19 | `DOCUMENT_ACCESS_LOG` | R | M4 §5.1 FR-019 |
| F-M5-01 | `DOCUMENT_TYPE` | R | M5 §5.1 FR-001 |
| F-M5-01 | `SEGMENT_REQUIREMENT` | R | M5 §5.2 BR-004 |
| F-M5-01 | `PROJECT_SHORTLIST` | R | M5 §5.2 BR-004 ("plus shortlisted locations") |
| F-M5-02 | `DOCUMENT` | C | M5 §5.1 FR-002 ("upload and replace"; previous versions kept) |
| F-M5-03 | `DOCUMENT_SLOT` | R | M5 §5.1 FR-003 |
| F-M5-04 | `BILINGUAL_DOCUMENT` | C | M5 §5.1 FR-004 (structure_version) |
| F-M5-04 | `BILINGUAL_PARAGRAPH` | C | M5 §5.1 FR-004 (paragraphs) |
| F-M5-04 | `PROJECT_GLOSSARY` | CR | M5 §5.1 FR-004 (glossary term_en, term_vi); M5 §5.2 BR-006 (applied to every later draft) |
| F-M5-05 | `BILINGUAL_PARAGRAPH` | R | M5 §5.1 FR-005 (synopsis_en, synopsis_vi) |
| F-M5-06 | `BILINGUAL_PARAGRAPH` | U | M5 §5.1 FR-006 (proofread_at) |
| F-M5-07 | `PROJECT` | U | M5 §5.1 FR-007 (shoot_date, buffer_days) |
| F-M5-08 | `LICENSING_TIMELINE` | R | M5 §5.1 FR-008; M5 §5.2 BR-005 |
| F-M5-08 | `PUBLIC_HOLIDAY` | R | M5 §5.1 FR-008 (holiday bands) |
| F-M7-01 | `LOCATION_INTEREST` | C | M7 §5.1 FR-001 |
| F-M7-02 | `PROVINCE_NOTICE` | C | M7 §5.1 FR-002 |
| F-M7-02 | `PROJECT` | R | M7 §5.1 FR-002 ("from project data") |
| F-M7-02 | `AUTHORITY_CONTACT` | R | M7 §5.1 FR-002 (authority_email) |
| F-M7-02 | `EMAIL_DELIVERY` | C | M7 §5.1 FR-002 (delivery_status) |
| F-M7-03 | `PROVINCE_NOTICE` | U | M7 §5.1 FR-003 |
| F-M7-04 | `PROVINCE_NOTICE` | R | M7 §5.1 FR-004 |
| F-M7-04 | `LOCATION_INTEREST` | R | M7 §5.1 FR-004 |
| F-M7-05 | `CONSULTATION_BOOKING` | C | M7 §5.1 FR-005 |
| F-M7-06 | `CONSULTATION_BOOKING` | U | M7 §5.1 FR-006 |
| F-M7-07 | `CONSULTATION_BOOKING` | R | M7 §5.1 FR-007 |
| F-M7-07 | `NOTIFICATION` | C | M7 §5.1 FR-007 (2 records) |
| F-M10-01 | `MODERATION_ITEM` | R | M10 §5.1 FR-001 (moderation_queue, filter content_type) |
| F-M10-02 | `MODERATION_ITEM` | RU | M10 §5.1 FR-002 (content_status, reason); M10 §5.2 BR-002 |
| F-M10-02 | `ORGANISATION_MEMBER_LAYER` | U | M10 §3 US-1 ("the new text is public within one minute") |
| F-M10-02 | `LOCATION_IMAGE` | U | M10 §5.1 FR-001 note (location_image moderated), FR-002 (content_status) |
| F-M10-03 | `DEMAND_INDEX` | R | M10 §5.1 FR-003; M10 §5.2 BR-003 |
| F-M10-03 | `PROJECT` | R | M10 §6 (DemandIndex "derived from Project") |
| F-M10-03 | `PRODUCER_ORGANISATION` | R | M10 §6 ("derived from ... ProducerOrganisation") |
| F-M10-03 | `LOCATION_QUERY` | R | M10 §6 ("derived from ... LocationQuery"); M3 §5.2 BR-009 |
| F-M10-03 | `PROJECT_PROVINCE` | R | M10 §6 ("derived from ... ProjectProvince") |
| F-M10-03 | `COLLAB_REQUEST` | R | M10 §6 ("derived from ... CollabRequest"); M10 §4.2 |
| F-M10-03 | `SEGMENT_DECISION` | R | M10 §1 Depends on ("M1 (segment decisions) — sources of the demand index") |
| F-M10-03 | `PRECHECK_RUN` | R | M10 §1 Depends on ("M2 (pre-check runs)") |
| F-M10-03 | `PROJECT_SHORTLIST` | R | M10 §1 Depends on ("M3 (location queries, shortlists)") |
| F-M10-04 | `DEMAND_INDEX` | R | M10 §5.1 FR-004 (vfda_staff and admin only) |
| F-M10-05 | `DEMAND_INDEX` | R | M10 §5.1 FR-005 (period month / quarter / year) |
| F-M10-06 | `DEMAND_INDEX` | R | M10 §5.1 FR-006 |
| F-M10-06 | `QUARTERLY_REPORT` | C | M10 §5.1 FR-006 (narrative_vi, narrative_en); FR-007 (report_id exists before export) |
| F-M10-07 | `QUARTERLY_REPORT` | RU | M10 §5.1 FR-007 (reread_by, report_pdf_url); M10 §5.2 BR-004 |
| F-M10-08 | `AUDIT_LOG` | C | M10 §5.1 FR-008; M10 §5.2 BR-005 (append-only, written by a trigger) |
| F-M10-09 | `AUDIT_LOG` | R | M10 §5.1 FR-009 (actor_id, action, from_date, to_date) |

## Coverage per entity

| Entity | Created by | Read by | Updated by | Deleted by |
|---|---|---|---|---|
| `USER_ACCOUNT` | F-SYS-01 | F-SYS-02, F-SYS-03, F-SYS-04 | F-SYS-03, F-SYS-04 | — |
| `PROFILE` | F-SYS-01 | — | F-SYS-04 | — |
| `PRODUCER_ORGANISATION` | F-SYS-01 | F-M10-03 | — | — |
| `CONSENT` | F-SYS-01 | — | — | — |
| `NOTIFICATION` | F-SYS-07, F-M4-11, F-M4-15, F-M7-07 | F-SYS-09 | F-SYS-09 | — |
| `EMAIL_DELIVERY` | F-SYS-08, F-M4-15, F-M7-02 | — | F-SYS-08 | — |
| `SEGMENT_RULE` | — | F-M1-02 | — | — |
| `SEGMENT_REQUIREMENT` | — | F-M1-02, F-M1-03, F-M0-05, F-M5-01 | — | — |
| `SEGMENT_DECISION` | F-M1-02, F-M1-03 | F-M10-03 | — | — |
| `PROJECT` | F-M0-01 | F-M0-03, F-M0-06, F-M2-17, F-M4-12, F-M7-02, F-M10-03 | F-M1-03, F-M0-02, F-M5-07 | — |
| `PROJECT_MEMBER` | F-M0-01, F-M0-04 | F-M0-03 | — | — |
| `PROJECT_PROVINCE` | F-M0-01 | F-M10-03 | — | — |
| `READINESS_VIEW` *(derived)* | — | F-M0-03, F-M0-05, F-M0-06, F-M0-07, F-M0-08, F-M2-10, F-M3-18, F-M4-16 | — | — |
| `READINESS_SNAPSHOT` | F-M0-08 | F-M0-09 | — | — |
| `LEGAL_RULE` | F-M2-02 | F-M2-01, F-M2-06, F-M2-11, F-M2-12, F-M2-13, F-M2-15, F-M2-16 | F-M2-02, F-M2-03 | — |
| `RULE_SET_VERSION` | F-M2-04 | — | — | — |
| `PRECHECK_RUN` | F-M2-07 | F-M10-03 | F-M2-06 | — |
| `PRECHECK_FINDING` | F-M2-06, F-M2-12 | F-M2-13 | — | — |
| `COMPLIANCE_RUN` | — | — | — | — |
| `COMPLIANCE_FINDING` | F-M2-12 | F-M2-13 | F-M2-14 | — |
| `DOSSIER_CHECK` *(derived)* | — | F-M2-08, F-M2-10 | — | — |
| `LICENSING_TIMELINE` *(derived)* | — | F-M2-17, F-M2-18, F-M5-08 | — | — |
| `LOCATION` | F-M3-02 | F-M3-01, F-M3-06, F-M3-07, F-M3-08, F-M3-09, F-M3-13, F-M3-14, F-M3-17, F-M3-19 | F-SYS-11, F-M3-02, F-M3-05 | — |
| `LOCATION_IMAGE` | F-M3-03 | F-M3-13 | F-M10-02 | — |
| `AUTHORITY_CONTACT` | F-M3-04 | F-M3-05, F-M3-15, F-M7-02 | F-M3-04 | — |
| `PROVINCE` | — | F-M0-01, F-M3-02, F-M3-07, F-M3-13, F-M3-20 | — | — |
| `LOCATION_QUERY` | F-M3-11 | F-M10-03 | — | — |
| `PROJECT_SHORTLIST` | F-M3-18 | F-M5-01, F-M10-03 | — | — |
| `PROVINCE_READINESS` *(derived)* | — | F-M3-19, F-M3-20 | — | — |
| `ORGANISATION` | F-M4-01 | F-M3-19, F-M4-02, F-M4-05, F-M4-06, F-M4-11 | F-M4-01, F-M4-10, F-M4-11 | — |
| `ORGANISATION_MEMBER_LAYER` | F-M4-01 | F-M4-03, F-M4-06, F-M4-07 | F-SYS-11, F-M4-01, F-M10-02 | — |
| `ORGANISATION_PRIVATE_LAYER` | F-M4-01 | F-M4-04 | F-M4-01 | — |
| `VERIFICATION_REQUEST` | F-M4-08 | F-M4-09 | F-M4-10 | — |
| `COLLAB_REQUEST` | F-M4-12 | F-M4-04, F-M4-13, F-M4-16, F-M10-03 | F-M4-01, F-M4-14 | — |
| `COLLAB_MESSAGE` | F-M4-14 | — | — | — |
| `NDA_ACCEPTANCE` | F-M4-17 | F-M4-04 | — | — |
| `DOCUMENT_ACCESS_LOG` | F-M4-18 | F-M4-19 | — | — |
| `DOCUMENT_TYPE` | — | F-M5-01 | — | — |
| `DOCUMENT_SLOT` | — | F-M2-08, F-M2-09, F-M5-03 | — | — |
| `DOCUMENT` | F-M5-02 | F-M4-18 | — | — |
| `BILINGUAL_DOCUMENT` | F-M5-04 | — | — | — |
| `BILINGUAL_PARAGRAPH` | F-M5-04 | F-M5-05 | F-M5-06 | — |
| `PROJECT_GLOSSARY` | F-M5-04 | F-M5-04 | — | — |
| `PUBLIC_HOLIDAY` | — | F-M5-08 | — | — |
| `LOCATION_INTEREST` | F-M7-01 | F-M7-04 | — | — |
| `PROVINCE_NOTICE` | F-M7-02 | F-M3-19, F-M7-04 | F-M7-03 | — |
| `CONSULTATION_BOOKING` | F-M7-05 | F-M7-07 | F-M7-06 | — |
| `MODERATION_ITEM` | F-M4-01 | F-M10-01, F-M10-02 | F-M10-02 | — |
| `AUDIT_LOG` | F-M10-08 | F-M10-09 | — | — |
| `DEMAND_INDEX` *(derived)* | — | F-M10-03, F-M10-04, F-M10-05, F-M10-06 | — | — |
| `QUARTERLY_REPORT` | F-M10-06 | F-M10-07 | F-M10-07 | — |

## Anomalies

Reported only — no function or entity was added to make the matrix look complete. **No function deletes anything (no D in the whole matrix)** — now a decision, not a gap: accounts are deactivated (SYS BR-005), projects archived (M0 BR-005), rules retired (M2 BR-008), locations unpublished (M3 BR-008), organisations deactivated (M4 BR-008); see `04-data-model.md`, structural check (ii).

| Kind | Entity or function | Hypothesis (missing function / surplus entity) | Resolution |
|---|---|---|---|
| 2 — C but no R | `PROFILE` | Missing function — an account page (SC-08, *My account*) shows the profile, but no FR reads it. | |
| 2 — C but no R | `CONSENT` | Missing function — nobody reads consents (e.g. re-prompt on a new terms version). | |
| 3 — created by several owners | `NOTIFICATION (M4, M7, SYS)` | Ownership unclear — SYS should own; M4/M7 should call F-SYS-07. | |
| 2 — C but no R | `EMAIL_DELIVERY` | Missing function — M7 edge case says VFDA staff are alerted on bounce; no function reads deliveries. | |
| 3 — created by several owners | `EMAIL_DELIVERY (M4, M7, SYS)` | Ownership unclear — SYS should own; M4/M7 should call F-SYS-08. | |
| 1 — no C | `SEGMENT_RULE` | Missing function — VFDA edits the decision table (M1 BR-001 "approved by VFDA"); belongs to M10, whose Spec Document has no such function yet. | |
| 1 — no C | `SEGMENT_REQUIREMENT` | Missing function — VFDA-maintained configuration; belongs to M10, whose Spec Document has no such function yet. | |
| 2 — C but no R | `RULE_SET_VERSION` | Missing function — results show "rule set 2026.08" (M2 US-1), so something reads it. | |
| 1 — no C | `COMPLIANCE_RUN` | Missing function — the project content check is described (M2 §6, SC-48) but no FR runs it. | |
| 5 — no function touches it | `COMPLIANCE_RUN` | Missing function — the project content check is described (M2 §6, SC-48) but no FR runs it. | |
| 1 — no C | `PROVINCE` | Missing function is acceptable: fixed reference list of 34 units, loaded once (M3 BR-006). | |
| 2 — C but no R | `COLLAB_MESSAGE` | Missing function — messages are "the written record of the partnership" (M4 BR-009), but no function lists a request's thread (SC-25 shows none). | |
| 1 — no C | `DOCUMENT_TYPE` | Missing function — VFDA maintains the document catalogue; belongs to M10, whose Spec Document has no such function yet. | |
| 1 — no C | `DOCUMENT_SLOT` | Missing function — slots must be created when the kit opens (02 OQ 5). | |
| 2 — C but no R | `BILINGUAL_DOCUMENT` | Missing function — SC-28 opens a draft; only its paragraphs are read. | |
| 1 — no C | `PUBLIC_HOLIDAY` | Missing function — someone must enter official and expected holiday dates (M5 §10). | |
| 4 — function touches no entity | F-SYS-05: Stores locale in a cookie (SYS §5.1 FR-005), although PROFILE declares locale (SYS §6). | Not about stored data, or vague — confirm with the module owner. | |
| 4 — function touches no entity | F-SYS-06: Reads a bilingual display dictionary that no entity declares (SYS §5.1 FR-006). | Not about stored data, or vague — confirm with the module owner. | |
| 4 — function touches no entity | F-SYS-10: Builds a search index but does not say which entities' text is indexed (SYS §5.1 FR-010). | Not about stored data, or vague — confirm with the module owner. | |
| 4 — function touches no entity | F-M1-01: Returns three static segment labels (M1 §5.1 FR-001); not about stored data. | Not about stored data, or vague — confirm with the module owner. | |
| 4 — function touches no entity | F-M2-05: Accepts and validates the summary (M2 §5.1 FR-005); the stored run is created by F-M2-07. | Not about stored data, or vague — confirm with the module owner. | |
| 4 — function touches no entity | F-M3-10: Accepts the scene description (M3 §5.1 FR-010); the query is stored by F-M3-11 (M3 §5.2 BR-009). | Not about stored data, or vague — confirm with the module owner. | |
| 4 — function touches no entity | F-M3-12: Validates attributes against a catalogue (M3 §5.1 FR-012) that is not a declared entity. | Not about stored data, or vague — confirm with the module owner. | |
| 4 — function touches no entity | F-M3-16: Keeps the compare selection "on reload" (M3 §5.1 FR-016), apparently in the browser. | Not about stored data, or vague — confirm with the module owner. | |

## Open questions

| # | Question | Blocking? | Owner | Default applied | Consequence if the default is wrong | Resolution |
|---|---|---|---|---|---|---|
| 1 | [NEEDS CLARIFICATION: Which function writes COMPLIANCE_RUN? No function runs the content check on a project; F-M2-06/11/12 only speak of a synopsis.] | Yes | M2 owner | F-M2-12 writes COMPLIANCE_FINDING when the synopsis belongs to a project | Project content checks (M2 US-2, SC-48 for members) cannot be traced to a stored run and version. | Open |
| 2 | [NEEDS CLARIFICATION: Is LOCATION_QUERY stored (F-M3-10/11), and for how long?] | No | M3 owner | Not stored; entity kept as declared, no rows written | If stored, it holds user text (privacy) and becomes a demand signal for M10. | Resolved 30/09/2026 — stored by F-M3-11 without personal data and used for the M10 demand index (M3 §5.2 BR-009; M3 §5.1 FR-011 query_id). How long it is kept is still not stated. |
| 3 | [NEEDS CLARIFICATION: Does F-M2-12 verify findings for both the guest pre-check and the project check?] | No | M2 owner | Yes, both | If only the pre-check, project findings would be shown unverified — breaks M2 BR-001. | Open |
| 4 | [NEEDS CLARIFICATION: Who loads SEGMENT_RULE, SEGMENT_REQUIREMENT, DOCUMENT_TYPE, PROVINCE and PUBLIC_HOLIDAY? No function creates them — M10's Spec Document has none either.] | Yes | Nam + VFDA | Loaded by seed script; VFDA edits through the database until a function exists | The M1 decision table and the M5 kit are VFDA-approved content; without an edit function every change needs a developer. | Open |
| 5 | [NEEDS CLARIFICATION: Which function creates DOCUMENT_SLOT rows, and which sets their state?] | Yes | M5 owner | F-M5-01 creates one slot per required document type when the kit first opens; state derived by rules | Without slots, F-M2-08 has nothing to count and component status cannot be stored. | Open |
| 6 | [NEEDS CLARIFICATION: Is COLLAB_MESSAGE in scope? No function writes or reads messages (SC-25 shows none).] | No | M4 owner | Out of scope; entity left unused | If in scope, a send/read function and a Screen Spec section are missing. | Resolved 30/09/2026 — in scope: F-M4-14 stores every response note and reply as a message (M4 §5.1 FR-014 message_id; M4 §5.2 BR-009). No function reads messages yet (02 anomaly kind 2). |
| 7 | [NEEDS CLARIFICATION: Is PROJECT_GLOSSARY in scope? No function writes or reads it.] | No | M5 owner | Out of scope; entity left unused | Translation consistency across paragraphs (SC-28) would rely on the model alone. | Resolved 30/09/2026 — in scope: F-M5-04 stores and applies the project's glossary (M5 §5.1 FR-004 glossary; M5 §5.2 BR-006). |
| 8 | [NEEDS CLARIFICATION: Who reads CONSENT, RULE_SET_VERSION and EMAIL_DELIVERY? Each is written but never read by a function. (SEGMENT_DECISION and PROJECT_PROVINCE are now read by F-M10-03.)] | No | Owners of SYS, M2 | Kept for audit | Write-only data costs storage and privacy review without a user. | Open |
| 9 | [NEEDS CLARIFICATION: Does F-M1-01 read segment labels from the display dictionary (F-SYS-06) or from SEGMENT_REQUIREMENT?] | No | M1 owner | Display dictionary | If from SEGMENT_REQUIREMENT, labels need columns there. | Open |


---
*Human gate 2: fill the Resolution column. Kinds 1 and 4 go back to the module owner as spec defects; kind 3 (ownership) must be settled before Session 10. Signed: ____________________  Date: __________*
