---
artifact: 04-data-model
step: S4
generated: 2026-09-28
sources: FUNCTIONS, FIELDS, ENTITIES, RULES, SCENARIOS, FLOWS, SCREENS, BOUNDARY
---


# Logical Data Model — CINEMATCH

43 tables, 285 columns. Every column is **copied** from a FIELDS row (section 5.1) or an ENTITIES attribute (section 6), with its declared type and Req / Opt flag. *system-set* = an output field (the system fills it); *not declared* = no flag in the input.

**70 columns carry no declared type.** They are written *type not declared* and raised as OQ-04-18 — no type was assigned here. Technical columns (`created_at`, `updated_at`) appear only where the spec declares them.

Tables are grouped by owning module, in the order SYS → M1 → M0 → M2 → M3 → M4 → M5 → M7.

## USER_ACCOUNT

*A person's sign-in identity on CINEMATCH, carrying exactly one of six roles.* Owner: SYS. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `user_id` | `UUID` | system-set | PK | SYS §5.1 FR-001 (OUT) |
| `email` | `VARCHAR(254)` | Req | UK | SYS §5.1 FR-001; SYS §3 US-1 (one account per email) |
| `email_verified` | `BOOLEAN` | system-set |  | SYS §5.1 FR-001 (OUT) |
| `role` | `ENUM(guest, member, partner, vfda_staff, vfda_legal, admin)` | Req |  | SYS §5.1 FR-004; SYS §5.2 BR-002 (new account = member) |
| `created_at` | *type not declared* | not declared |  | SYS §6 |

**Natural key:** email — one account per email (SYS §3 US-1, third criterion).

## PROFILE

*The personal details shown for an account: name, crew role and preferred language.* Owner: SYS. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `user_id` | `UUID` | Req | PK, FK → `USER_ACCOUNT` | SYS §6 ("belongs to UserAccount") |
| `full_name` | `VARCHAR(120)` | Req |  | SYS §5.1 FR-001 |
| `crew_role` | `ENUM(producer, director, production_coordinator, line_producer, other)` | Req |  | SYS §5.1 FR-001 |
| `locale` | `ENUM(vi, en)` | Req |  | SYS §5.1 FR-005 (also said to live in a cookie — see Type conflicts) |
| `producer_org_id` | *type not declared* | not declared | FK → `PRODUCER_ORGANISATION` | SYS §6 |

**Natural key:** user_id — one profile per account (SYS §6).

## PRODUCER_ORGANISATION

*The production company a producer signs up on behalf of.* Owner: SYS. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `producer_org_id` | *type not declared* | not declared | PK | SYS §6 (Profile.producer_org_id) |
| `org_name` | `VARCHAR(200)` | Req |  | SYS §5.1 FR-001 |
| `country` | `CHAR(2)` | Req |  | SYS §5.1 FR-001 |
| `website` | `VARCHAR(300)` | Opt |  | SYS §5.1 FR-001 |

**Natural key:** org_name + country — proposed; not stated in the spec (open question).

## CONSENT

*A record that an account accepted a given version of the terms at a given time.* Owner: SYS. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `user_id` | `UUID` | Req | PK, FK → `USER_ACCOUNT` | SYS §6 |
| `consent_version` | `VARCHAR(20)` | Req | PK | SYS §5.1 FR-001; SYS §5.2 BR-003 |
| `accepted_at` | *type not declared* | not declared |  | SYS §6; SYS §5.2 BR-003 (timestamp) |

**Natural key:** user_id + consent_version.

## NOTIFICATION

*An in-app message addressed to one account about one event.* Owner: SYS. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `notification_id` | `UUID` | system-set | PK | SYS §5.1 FR-007 (OUT) |
| `recipient_id` | `UUID` | Req | FK → `USER_ACCOUNT` | SYS §5.1 FR-007 |
| `event_type` | `VARCHAR(60)` | Req |  | SYS §5.1 FR-007 |
| `payload` | `JSONB` | Req |  | SYS §5.1 FR-007 |
| `created_at` | `TIMESTAMPTZ` | system-set |  | SYS §5.1 FR-007 (OUT) |
| `read_at` | *type not declared* | not declared |  | SYS §6; SYS §5.1 FR-009 (mark as read) |

**Natural key:** None in the real world (an event); recipient_id + event_type + created_at identifies it in practice.

## EMAIL_DELIVERY

*One transactional email handed to the email provider, with its delivery outcome.* Owner: SYS. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `email_delivery_id` | *type not declared* | not declared | PK | none — no identifier declared (open question) |
| `notification_id` | `UUID` | Opt | FK → `NOTIFICATION` | SYS §6 ("may relate to a Notification") |
| `template_id` | `VARCHAR(60)` | Req |  | SYS §5.1 FR-008 |
| `recipient_email` | `VARCHAR(254)` | Req |  | SYS §5.1 FR-008 |
| `variables` | `JSONB` | Req |  | SYS §5.1 FR-008 |
| `delivery_status` | `ENUM(queued, sent, bounced)` | system-set |  | SYS §5.1 FR-008 (OUT) |
| `provider_message_id` | `TEXT` | system-set | UK | SYS §5.1 FR-008 (OUT) |

**Natural key:** provider_message_id once sent; none while queued (open question).

## SEGMENT_RULE

*One row of the VFDA-approved decision table that maps router answers to segment A, B or C.* Owner: M1. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `segment_rule_id` | *type not declared* | not declared | PK | M1 §6 (rule_id — renamed, see 01 conflicts) |
| `q1_shoot_in_vn` | `BOOLEAN` | Req |  | M1 §6 (q1) = M1 §5.1 FR-002 q1_shoot_in_vn |
| `q2_release` | `ENUM(abroad, vietnam, both)` | Opt |  | M1 §6 (q2) = M1 §5.1 FR-002 |
| `q3_producer` | `ENUM(foreign, vietnamese, coproduction)` | Opt |  | M1 §6 (q3) = M1 §5.1 FR-002 |
| `result_segment` | `ENUM(A, B, C)` | not declared |  | M1 §6; type of segment from M1 §5.1 FR-002 |
| `version` | *type not declared* | not declared |  | M1 §6 |

**Natural key:** q1_shoot_in_vn + q2_release + q3_producer + version — the same answers always give the same segment (M1 BR-001).

## SEGMENT_REQUIREMENT

*One item a segment needs or does not need, used to configure the journey and the gauges.* Owner: M1. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `segment` | `ENUM(A, B, C)` | not declared | PK | M1 §6; type from M1 §5.1 FR-002 |
| `requirement_code` | *type not declared* | not declared | PK | M1 §6 |
| `label_vi` | *type not declared* | not declared |  | M1 §6 |
| `label_en` | *type not declared* | not declared |  | M1 §6 |
| `needed` | *type not declared* | not declared |  | M1 §6; M1 §3 US-1 (Needed / Not needed) |

**Natural key:** segment + requirement_code.

## SEGMENT_DECISION

*The segment given to a visitor or project from their answers, including any manual override.* Owner: M1. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `segment_decision_id` | *type not declared* | not declared | PK | none — no identifier declared (open question) |
| `session_or_project_id` | *type not declared* | not declared | FK → `PROJECT` | M1 §6 (one column for two meanings — see Structural findings) |
| `segment_rule_id` | *type not declared* | not declared | FK → `SEGMENT_RULE` | M1 §6 ("used by SegmentDecision") |
| `q1_shoot_in_vn` | `BOOLEAN` | Req |  | M1 §5.1 FR-002 (answers) |
| `q2_release` | `ENUM(abroad, vietnam, both)` | Opt |  | M1 §5.1 FR-002 (Req when q1 = true) |
| `q3_producer` | `ENUM(foreign, vietnamese, coproduction)` | Opt |  | M1 §5.1 FR-002 (Req when q1 = true) |
| `q4_needs` | `ARRAY<ENUM(locations, crew, cast, equipment, logistics)>` | Opt |  | M1 §5.1 FR-002; M1 §5.2 BR-002 |
| `segment` | `ENUM(A, B, C)` | system-set |  | M1 §5.1 FR-002 (OUT) |
| `segment_override` | `ENUM(A, B, C)` | Opt |  | M1 §5.1 FR-002; M1 §5.2 BR-003 — see Type conflicts |
| `decided_by` | `ARRAY<INTEGER>` | system-set |  | M1 §5.1 FR-002 (OUT) |
| `journey_config` | `JSONB` | system-set |  | M1 §5.1 FR-002 (OUT) |

**Natural key:** None — the same answers may be given many times; a session key is not declared (open question).

## PROJECT

*A film or content production a producer is preparing to shoot in Vietnam.* Owner: M0. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `project_id` | `UUID` | system-set | PK | M0 §5.1 FR-001 (OUT) |
| `producer_org_id` | *type not declared* | not declared | FK → `PRODUCER_ORGANISATION` | M0 §6 ("belongs to ProducerOrganisation") |
| `project_name` | `VARCHAR(200)` | Req |  | M0 §5.1 FR-001 |
| `format` | `ENUM(feature, documentary, commercial, tv, music_video)` | Req |  | M0 §5.1 FR-001 |
| `segment` | `ENUM(A, B, C)` | Req |  | M0 §5.1 FR-001; M1 §5.1 FR-003 |
| `shoot_date` | `DATE` | Opt |  | M0 §5.1 FR-001 (Opt), FR-002 (after today); M5 §5.1 FR-007 (Req) — see Type conflicts |
| `buffer_days` | `INTEGER` | Req |  | M5 §5.1 FR-007 (0 / 7 / 14 / 21); M2 §5.1 FR-017 (default 7) |
| `shoot_days_vn` | `INTEGER` | Opt |  | M0 §5.1 FR-001 |
| `crew_size_band` | `ENUM(u15, 15_50, o50)` | Opt |  | M0 §5.1 FR-001 |
| `logline` | `VARCHAR(500)` | Opt |  | M0 §5.1 FR-001 |
| `stage` | *type not declared* | not declared |  | M0 §6 |
| `updated_at` | `TIMESTAMPTZ` | system-set |  | M0 §5.1 FR-002 (OUT) |

**Natural key:** producer_org_id + project_name — proposed (open question).

## PROJECT_MEMBER

*A person's access to one project, with view or edit permission.* Owner: M0. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `member_id` | `UUID` | system-set | PK | M0 §5.1 FR-004 (OUT) |
| `project_id` | `UUID` | Req | FK → `PROJECT` | M0 §5.1 FR-004 |
| `user_id` | *type not declared* | not declared | FK → `USER_ACCOUNT` | M0 §6 (user_id) |
| `invitee_email` | `VARCHAR(254)` | Req |  | M0 §5.1 FR-004 |
| `permission` | `ENUM(view, edit)` | Req |  | M0 §5.1 FR-004 (owner not in the set — see Structural findings) |
| `invite_status` | `ENUM(pending, accepted)` | system-set |  | M0 §5.1 FR-004 (OUT) |

**Natural key:** project_id + invitee_email (the invited address); project_id + user_id once accepted.

## PROJECT_PROVINCE

*A province a project plans to shoot in.* Owner: M0. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `project_id` | `UUID` | Req | PK, FK → `PROJECT` | M0 §6 |
| `province_id` | `INTEGER` | Opt | PK, FK → `PROVINCE` | M0 §5.1 FR-001 (provinces ARRAY<INTEGER> Opt) |

**Natural key:** project_id + province_id.

## READINESS_SNAPSHOT

*The overall readiness of a project as recorded on one night.* Owner: M0. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `snapshot_id` | `UUID` | system-set | PK | M0 §5.1 FR-008 (OUT) |
| `project_id` | `UUID` | Req | FK → `PROJECT` | M0 §5.1 FR-008 |
| `snapshot_date` | `DATE` | Req |  | M0 §5.1 FR-008 |
| `readiness_total` | `NUMERIC(5,2)` | system-set |  | M0 §6; M0 §5.1 FR-009 (OUT) |

**Natural key:** project_id + snapshot_date (one per night, M0 FR-008).

## LEGAL_RULE

*A content or dossier rule written and signed by the VFDA Legal Board, with its legal citation.* Owner: M2. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `rule_id` | `UUID` | system-set | PK | M2 §5.1 FR-002 (OUT) |
| `rule_code` | `VARCHAR(40)` | Req | UK | M2 §5.1 FR-002 |
| `rule_version` | `VARCHAR(20)` | system-set | FK → `RULE_SET_VERSION` | M2 §6; M2 §5.1 FR-002 (OUT version INTEGER) — see Type conflicts |
| `title_vi` | `VARCHAR(200)` | Req |  | M2 §5.1 FR-002 |
| `title_en` | `VARCHAR(200)` | Req |  | M2 §5.1 FR-002 |
| `description_vi` | `TEXT` | Req |  | M2 §5.1 FR-002 |
| `description_en` | `TEXT` | Req |  | M2 §5.1 FR-002 |
| `guidance_vi` | `TEXT` | Req |  | M2 §5.1 FR-002 |
| `guidance_en` | `TEXT` | Req |  | M2 §5.1 FR-002 |
| `citation` | `VARCHAR(200)` | Req |  | M2 §5.1 FR-002; M2 §5.2 BR-002 (CHECK) |
| `severity` | `ENUM(notice, action)` | Req |  | M2 §5.1 FR-002 |
| `topic` | `VARCHAR(60)` | Opt |  | M2 §5.1 FR-001, FR-015 (filter_topic / topic) |
| `rule_slug` | `VARCHAR(120)` | Req | UK | M2 §5.1 FR-016 |
| `status` | `ENUM(draft, approved)` | Opt |  | M2 §5.1 FR-001 (filter_status) |
| `approved_by` | `UUID` | Req | FK → `USER_ACCOUNT` | M2 §5.1 FR-003 (approver_id); M2 §5.2 BR-002 (CHECK) |
| `approved_at` | `TIMESTAMPTZ` | system-set |  | M2 §5.1 FR-003 (OUT) |
| `is_active` | `BOOLEAN` | system-set |  | M2 §5.1 FR-003 (OUT) |

**Natural key:** rule_code (+ rule_version if old texts are kept) — open question.

## RULE_SET_VERSION

*A numbered edition of the active rule set, created each time a rule is activated.* Owner: M2. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `rule_version` | `VARCHAR(20)` | system-set | PK | M2 §5.1 FR-004 (OUT) — see Type conflicts |
| `created_at` | *type not declared* | not declared |  | M2 §6 |
| `created_by` | *type not declared* | not declared | FK → `USER_ACCOUNT` | M2 §6 |

**Natural key:** rule_version.

## PRECHECK_RUN

*One 200-word content pre-check, kept as a demand data point.* Owner: M2. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `brief_id` | `UUID` | system-set | PK | M2 §5.1 FR-007 (OUT) |
| `project_id` | *type not declared* | not declared | FK → `PROJECT` | M2 §6 ("may belong to a Project") |
| `rule_version` | `VARCHAR(20)` | system-set | FK → `RULE_SET_VERSION` | M2 §6; M2 §5.2 BR-007 |
| `synopsis_hash` | `TEXT` | Req |  | M2 §5.1 FR-007 |
| `lang` | `ENUM(en, vi)` | Req |  | M2 §5.1 FR-005 (= locale ENUM(vi, en) in FR-007) |
| `flags` | `JSONB` | Opt |  | M2 §5.1 FR-005 |
| `country_guess` | `VARCHAR(2)` | Opt |  | M2 §5.1 FR-007 |
| `attention_level` | `ENUM(low, medium, high)` | system-set |  | M2 §5.1 FR-006 (OUT); M2 §5.2 BR-004 |
| `created_at` | *type not declared* | not declared |  | M2 §6 |

**Natural key:** None — the same summary may be checked many times (synopsis_hash + created_at in practice).

## PRECHECK_FINDING

*One passage of a pre-checked summary that matches an approved rule.* Owner: M2. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `brief_id` | `UUID` | Req | PK, FK → `PRECHECK_RUN` | M2 §6 ("belongs to PrecheckRun") |
| `rule_code` | `VARCHAR(40)` | system-set | PK, FK → `LEGAL_RULE` | M2 §5.1 FR-006 (OUT findings) |
| `span_start` | *type not declared* | not declared | PK | M2 §6 |
| `span_end` | *type not declared* | not declared |  | M2 §6 |
| `quoted_text` | `TEXT` | system-set |  | M2 §5.1 FR-006 (OUT) |
| `explanation_vi` | `TEXT` | system-set |  | M2 §5.1 FR-006 (OUT); M2 §6 (explanation) |
| `explanation_en` | `TEXT` | system-set |  | M2 §5.1 FR-006 (OUT) |

**Natural key:** brief_id + rule_code + span_start.

## COMPLIANCE_RUN

*One content check of a project against the active rule set.* Owner: M2. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `run_id` | *type not declared* | not declared | PK | M2 §6 |
| `project_id` | *type not declared* | not declared | FK → `PROJECT` | M2 §6 |
| `rule_version` | `VARCHAR(20)` | not declared | FK → `RULE_SET_VERSION` | M2 §6; M2 §5.2 BR-007 |
| `run_at` | *type not declared* | not declared |  | M2 §6 |

**Natural key:** project_id + run_at.

## COMPLIANCE_FINDING

*One finding of a project content check that a member can mark as reviewed.* Owner: M2. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `finding_id` | `UUID` | Req | PK | M2 §5.1 FR-014 |
| `run_id` | *type not declared* | not declared | FK → `COMPLIANCE_RUN` | M2 §6 ("belongs to ComplianceRun") |
| `rule_code` | `VARCHAR(40)` | system-set | FK → `LEGAL_RULE` | M2 §6; type from M2 §5.1 FR-006 |
| `quoted_text` | `TEXT` | system-set |  | M2 §6; type from M2 §5.1 FR-006 |
| `finding_status` | `ENUM(open, reviewed)` | system-set |  | M2 §5.1 FR-014 (OUT) |
| `reviewer_note` | `TEXT` | Opt |  | M2 §5.1 FR-014 |

**Natural key:** run_id + rule_code + quoted_text.

## LOCATION

*A filming location in Vietnam described and published by VFDA staff.* Owner: M3. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `location_id` | `UUID` | system-set | PK | M3 §5.1 FR-002 (OUT) |
| `slug` | `VARCHAR(160)` | system-set | UK | M3 §5.1 FR-002 (OUT) |
| `province_id` | `INTEGER` | Req | FK → `PROVINCE` | M3 §5.1 FR-002; M3 §5.2 BR-006 |
| `name_vi` | `VARCHAR(200)` | Req |  | M3 §5.1 FR-002 |
| `name_en` | `VARCHAR(200)` | Req |  | M3 §5.1 FR-002 |
| `district` | `VARCHAR(120)` | Opt |  | M3 §5.1 FR-002 |
| `lat` | `NUMERIC(9,6)` | Req |  | M3 §5.1 FR-002 |
| `lng` | `NUMERIC(9,6)` | Req |  | M3 §5.1 FR-002 |
| `airport_km` | `INTEGER` | Opt |  | M3 §5.1 FR-002 |
| `scene_types` | `ARRAY<ENUM>` | Req |  | M3 §5.1 FR-002 (enum values not listed) |
| `desc_vi` | `TEXT` | Req |  | M3 §5.1 FR-002 |
| `desc_en` | `TEXT` | Req |  | M3 §5.1 FR-002 |
| `crew_capacity` | `ENUM(u15, 15_50, o50)` | Req |  | M3 §5.1 FR-002 |
| `lodging_20km` | `BOOLEAN` | Req |  | M3 §5.1 FR-002 |
| `grid_power` | `BOOLEAN` | Req |  | M3 §5.1 FR-002 |
| `truck_access` | `BOOLEAN` | Req |  | M3 §5.1 FR-002 |
| `months_to_avoid` | `ARRAY<INTEGER>` | Opt |  | M3 §5.1 FR-002 |
| `permit_complexity` | `ENUM(low, medium, high)` | Req |  | M3 §5.1 FR-002 |
| `restriction_note` | `TEXT` | Opt |  | M3 §5.1 FR-002 |
| `intake_status` | *type not declared* | not declared |  | M3 §6 |
| `published` | `BOOLEAN` | system-set |  | M3 §5.1 FR-005 (OUT); M3 §5.2 BR-004 |
| `blocked_reason` | `TEXT` | system-set |  | M3 §5.1 FR-005 (OUT) |

**Natural key:** name_vi + province_id — proposed; two sites may share a name in different provinces (open question).

## LOCATION_IMAGE

*A photo of a location with its source and usage right.* Owner: M3. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `image_url` | `TEXT` | system-set | PK | M3 §5.1 FR-003 (OUT) |
| `location_id` | *type not declared* | not declared | FK → `LOCATION` | M3 §6 ("belongs to Location") |
| `image_source` | `TEXT` | Req |  | M3 §5.1 FR-003 |
| `usage_right` | `TEXT` | Req |  | M3 §5.1 FR-003 |
| `status` | *type not declared* | not declared |  | M3 §6 |

**Natural key:** image_url.

## AUTHORITY_CONTACT

*The local authority office and person to contact about filming at a location, verified by VFDA.* Owner: M3. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `location_id` | `UUID` | Req | PK, FK → `LOCATION` | M3 §5.1 FR-004; M3 §6 ("has one") |
| `authority_name` | `VARCHAR(200)` | Req |  | M3 §5.1 FR-004 |
| `contact_name` | `VARCHAR(120)` | Req |  | M3 §5.1 FR-004 |
| `contact_phone` | `VARCHAR(20)` | Req |  | M3 §5.1 FR-004 |
| `contact_email` | `VARCHAR(254)` | Opt |  | M3 §5.1 FR-004 |
| `verified_by` | `UUID` | Req | FK → `USER_ACCOUNT` | M3 §5.1 FR-004 |
| `verified_at` | `TIMESTAMPTZ` | system-set |  | M3 §5.1 FR-004 (OUT) |
| `contact_verified` | `BOOLEAN` | system-set |  | M3 §5.1 FR-004 (OUT); M3 §5.1 FR-005 (CHECK) |

**Natural key:** location_id (one contact per location, M3 §6).

## PROVINCE

*One of the 34 provincial-level units after the 2025 reorganisation.* Owner: M3. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `province_id` | `INTEGER` | Req | PK | M3 §5.1 FR-002 (province_id INTEGER) |
| `name` | *type not declared* | not declared | UK | M3 §6 |
| `slug` | `VARCHAR(80)` | Req | UK | M3 §5.1 FR-020 (province_slug) |
| `region` | *type not declared* | not declared |  | M3 §6; M3 §5.1 FR-007 (province or region) |
| `merged_from` | *type not declared* | not declared |  | M3 §6; M3 §5.2 BR-006 |

**Natural key:** name (one of the 34 units, M3 BR-006); slug.

## LOCATION_QUERY

*A scene description a user typed and the attributes extracted from it.* Owner: M3. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `location_query_id` | *type not declared* | not declared | PK | none — no identifier declared (open question) |
| `project_id` | *type not declared* | not declared | FK → `PROJECT` | M3 §6 ("may belong to Project") |
| `description` | `TEXT` | Req |  | M3 §6 = M3 §5.1 FR-010 scene_description (10–1000 characters) |
| `attributes` | `JSONB` | system-set |  | M3 §5.1 FR-011 (OUT) |
| `month` | *type not declared* | not declared |  | M3 §6 |

**Natural key:** None (an event).

## PROJECT_SHORTLIST

*A location a project has kept as its primary or backup choice.* Owner: M3. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `shortlist_id` | `UUID` | system-set | PK | M3 §5.1 FR-018 (OUT) |
| `project_id` | `UUID` | Req | FK → `PROJECT` | M3 §5.1 FR-018 |
| `location_id` | `UUID` | Req | FK → `LOCATION` | M3 §5.1 FR-018 (location_ids ARRAY<UUID>) |
| `role` | `ENUM(primary, backup)` | Req |  | M3 §5.1 FR-018 |

**Natural key:** project_id + location_id.

## ORGANISATION

*A Vietnamese service company listed in the partner directory.* Owner: M4. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `org_id` | `UUID` | system-set | PK | M4 §5.1 FR-001 (OUT) |
| `slug` | `VARCHAR(160)` | system-set | UK | M4 §5.1 FR-001 (OUT) |
| `org_name` | `VARCHAR(200)` | Req |  | M4 §5.1 FR-001 |
| `legal_form` | *type not declared* | not declared |  | M4 §6 |
| `founded_year` | *type not declared* | not declared |  | M4 §6 |
| `hq_province` | *type not declared* | not declared | FK → `PROVINCE` | M4 §6 (a province — see Type conflicts) |
| `service_groups` | `ARRAY<ENUM>` | Req |  | M4 §5.1 FR-001; M4 §5.2 BR-002 (12 values, not listed) |
| `provinces` | `ARRAY<INTEGER>` | Req |  | M4 §5.1 FR-001 |
| `verified_at` | `TIMESTAMPTZ` | system-set |  | M4 §5.1 FR-010 (OUT) |
| `verified_until` | *type not declared* | not declared |  | M4 §6; M4 §5.2 BR-004 (12 months) |
| `art13_eligible` | *type not declared* | not declared |  | M4 §6 |

**Natural key:** org_name + hq_province — proposed; a business registration number is not declared (open question).

## ORGANISATION_MEMBER_LAYER

*The part of a partner profile visible to signed-in members.* Owner: M4. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `org_id` | `UUID` | Req | PK, FK → `ORGANISATION` | M4 §6 ("belongs to Organisation") |
| `capability_desc_vi` | `TEXT` | Opt |  | M4 §5.1 FR-001 (§6 capability_desc) |
| `capability_desc_en` | `TEXT` | Opt |  | M4 §5.1 FR-001 |
| `portfolio` | *type not declared* | not declared |  | M4 §6 |
| `intl_project_count` | *type not declared* | not declared |  | M4 §6 |
| `working_languages` | `ARRAY<CHAR(2)>` | Opt |  | M4 §5.1 FR-001; M4 §6 |

**Natural key:** org_id.

## ORGANISATION_PRIVATE_LAYER

*The part of a partner profile visible only after an accepted request and NDA.* Owner: M4. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `org_id` | `UUID` | Req | PK, FK → `ORGANISATION` | M4 §6 |
| `rate_card` | `JSONB` | Opt |  | M4 §5.1 FR-001 |
| `past_clients` | `ARRAY<TEXT>` | Opt |  | M4 §5.1 FR-001 |
| `direct_contact` | *type not declared* | not declared |  | M4 §6 |

**Natural key:** org_id.

## VERIFICATION_REQUEST

*A partner's application for the VFDA Verified badge and VFDA's decision on it.* Owner: M4. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `request_id` | `UUID` | system-set | PK | M4 §5.1 FR-008 (OUT verification_request_id) |
| `org_id` | `UUID` | Req | FK → `ORGANISATION` | M4 §5.1 FR-008 |
| `business_license` | `FILE` | Req |  | M4 §5.1 FR-008 (PDF max 25 MB) |
| `reference_projects` | `ARRAY<TEXT>` | Req |  | M4 §5.1 FR-008 (≥ 2) |
| `status` | `ENUM(pending, approved, rejected)` | Opt |  | M4 §5.1 FR-009, FR-010 |
| `decided_by` | *type not declared* | not declared | FK → `USER_ACCOUNT` | M4 §6 |
| `reason` | `TEXT` | Opt |  | M4 §5.1 FR-010 (required when rejected) |

**Natural key:** org_id + submission time (not declared).

## COLLAB_REQUEST

*A producer's request to a partner to work on one project, followed to confirmation.* Owner: M4. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `request_id` | `UUID` | system-set | PK | M4 §5.1 FR-012 (OUT) |
| `project_id` | `UUID` | Req | FK → `PROJECT` | M4 §5.1 FR-012 |
| `org_id` | `UUID` | Req | FK → `ORGANISATION` | M4 §5.1 FR-012 |
| `services` | `ARRAY<ENUM>` | Req |  | M4 §5.1 FR-012 |
| `note` | `TEXT` | Opt |  | M4 §5.1 FR-012 (max 1000 characters) |
| `status` | `ENUM(pending, under_review, info_requested, accepted, declined, confirmed, withdrawn)` | system-set |  | M4 §5.1 FR-012 (pending), FR-014; M4 §5.2 BR-005 |
| `response_note` | `TEXT` | Opt |  | M4 §5.1 FR-014 |
| `sent_at` | *type not declared* | not declared |  | M4 §6 |
| `responded_at` | `TIMESTAMPTZ` | system-set |  | M4 §5.1 FR-014 (OUT) |
| `confirmed_at` | *type not declared* | not declared |  | M4 §6 |

**Natural key:** project_id + org_id while the request is open (M4 §3 Edge cases: a second open request is refused).

## COLLAB_MESSAGE

*A message written inside a collaboration request.* Owner: M4. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `request_id` | *type not declared* | not declared | PK, FK → `COLLAB_REQUEST` | M4 §6 |
| `author_id` | *type not declared* | not declared | PK, FK → `USER_ACCOUNT` | M4 §6 |
| `created_at` | *type not declared* | not declared | PK | M4 §6 |
| `body` | *type not declared* | not declared |  | M4 §6 |

**Natural key:** request_id + author_id + created_at.

## NDA_ACCEPTANCE

*One party's acceptance of a given NDA version for one collaboration request.* Owner: M4. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `nda_acceptance_id` | `UUID` | system-set | PK | M4 §5.1 FR-017 (OUT) |
| `request_id` | `UUID` | Req | FK → `COLLAB_REQUEST` | M4 §5.1 FR-017 |
| `party` | `ENUM(producer, partner)` | Req |  | M4 §5.1 FR-017 |
| `nda_version` | `VARCHAR(20)` | Req |  | M4 §5.1 FR-017 |
| `accepted` | `BOOLEAN` | Req |  | M4 §5.1 FR-017 |
| `accepted_at` | `TIMESTAMPTZ` | system-set |  | M4 §5.1 FR-017 (OUT) |

**Natural key:** request_id + party (+ nda_version).

## DOCUMENT_ACCESS_LOG

*A record that one person viewed one shared document at one time.* Owner: M4. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `access_log_id` | `UUID` | system-set | PK | M4 §5.1 FR-018 (OUT) |
| `document_id` | `UUID` | Req | FK → `DOCUMENT` | M4 §5.1 FR-018 |
| `viewer_id` | `UUID` | Req | FK → `USER_ACCOUNT` | M4 §5.1 FR-018 |
| `viewed_at` | `TIMESTAMPTZ` | system-set |  | M4 §5.1 FR-018 (OUT); M4 §5.2 BR-007 (append-only) |

**Natural key:** None (append-only event, M4 BR-007).

## DOCUMENT_TYPE

*A kind of dossier document, with its legal basis and template.* Owner: M5. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `doc_code` | `VARCHAR(40)` | system-set | PK | M5 §5.1 FR-001 (OUT) |
| `name_vi` | `TEXT` | system-set |  | M5 §5.1 FR-001 (OUT) |
| `name_en` | `TEXT` | system-set |  | M5 §5.1 FR-001 (OUT) |
| `basis` | `ENUM(law, common, location)` | system-set |  | M5 §5.1 FR-001 (OUT); M5 §5.2 BR-003 |
| `template_url` | `TEXT` | system-set |  | M5 §5.1 FR-001 (OUT) |
| `segments` | *type not declared* | not declared |  | M5 §6 |

**Natural key:** doc_code.

## DOCUMENT_SLOT

*The place for one document type in one project, with its status.* Owner: M5. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `project_id` | `UUID` | Req | PK, FK → `PROJECT` | M5 §5.1 FR-002; M5 §6 |
| `doc_code` | `VARCHAR(40)` | Req | PK, FK → `DOCUMENT_TYPE` | M5 §5.1 FR-002; M5 §6 |
| `state` | `ENUM(present, needs_fix, pending, missing)` | system-set |  | M5 §5.1 FR-003 (OUT); M2 §5.1 FR-009 |

**Natural key:** project_id + doc_code.

## DOCUMENT

*One uploaded file version in a project's document slot.* Owner: M5. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `document_id` | `UUID` | system-set | PK | M5 §5.1 FR-002 (OUT) |
| `project_id` | `UUID` | Req | FK → `DOCUMENT_SLOT` | M5 §5.1 FR-002 (with doc_code: the slot) |
| `doc_code` | `VARCHAR(40)` | Req | FK → `DOCUMENT_SLOT` | M5 §5.1 FR-002 |
| `file_path` | *type not declared* | not declared |  | M5 §6 (FR-002 declares file BYTEA — see Type conflicts) |
| `version` | *type not declared* | not declared |  | M5 §6; M5 §5.1 FR-002 (previous versions kept) |
| `uploaded_by` | *type not declared* | not declared | FK → `USER_ACCOUNT` | M5 §6 |
| `uploaded_at` | *type not declared* | not declared |  | M5 §6 |

**Natural key:** project_id + doc_code + version.

## BILINGUAL_DOCUMENT

*A generated English–Vietnamese draft of one document of a project.* Owner: M5. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `project_id` | `UUID` | not declared | PK, FK → `PROJECT` | M5 §6 |
| `doc_code` | `VARCHAR(40)` | not declared | PK, FK → `DOCUMENT_TYPE` | M5 §6 |
| `structure_version` | `VARCHAR(20)` | system-set |  | M5 §5.1 FR-004 (OUT) |
| `synopsis_en` | `TEXT` | Req |  | M5 §5.1 FR-004, FR-005 |
| `project_meta` | `JSONB` | Req |  | M5 §5.1 FR-004 (copy of project data — see Structural findings) |
| `pdf_url` | `TEXT` | system-set |  | M5 §5.1 FR-005 (OUT) |
| `watermark` | `BOOLEAN` | system-set |  | M5 §5.1 FR-005 (OUT, always true); M5 §5.2 BR-001 |

**Natural key:** project_id + doc_code.

## BILINGUAL_PARAGRAPH

*One aligned source/Vietnamese paragraph pair of a bilingual draft, with its proofreading status.* Owner: M5. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `project_id` | `UUID` | not declared | PK, FK → `BILINGUAL_DOCUMENT` | M5 §6 (belongs to BilingualDocument) |
| `doc_code` | `VARCHAR(40)` | not declared | PK, FK → `BILINGUAL_DOCUMENT` | M5 §6 |
| `idx` | `INTEGER` | system-set | PK | M5 §5.1 FR-004 (OUT) |
| `source_text` | `TEXT` | system-set |  | M5 §5.1 FR-004 (OUT) |
| `target_text` | `TEXT` | system-set |  | M5 §5.1 FR-004 (OUT) |
| `status` | `ENUM(machine, reviewed)` | system-set |  | M5 §5.1 FR-004 (OUT); M5 §5.2 BR-002 |
| `reviewed_by` | `UUID` | Req | FK → `USER_ACCOUNT` | M5 §5.1 FR-006 (reviewer_id); M5 §6 |
| `reviewer_org_id` | `UUID` | Opt | FK → `ORGANISATION` | M5 §5.1 FR-006 (which organisation — see 01 conflicts) |
| `reviewed_at` | `TIMESTAMPTZ` | system-set |  | M5 §5.1 FR-006 (OUT proofread_at); M5 §6 |

**Natural key:** project_id + doc_code + idx.

## PROJECT_GLOSSARY

*A project's agreed translation of one term.* Owner: M5. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `project_id` | *type not declared* | not declared | PK, FK → `PROJECT` | M5 §6 |
| `source_term` | *type not declared* | not declared | PK | M5 §6 |
| `target_term` | *type not declared* | not declared |  | M5 §6 |

**Natural key:** project_id + source_term.

## PUBLIC_HOLIDAY

*A public holiday period shown on the licensing timeline, official or expected.* Owner: M5. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `name` | *type not declared* | not declared | PK | M5 §6 |
| `start_date` | *type not declared* | not declared | PK | M5 §6 |
| `end_date` | *type not declared* | not declared |  | M5 §6 |
| `is_expected` | *type not declared* | not declared |  | M5 §6; M5 §3 US-3 (band marked *expected*) |

**Natural key:** name + start_date.

## LOCATION_INTEREST

*A member's statement that a project is interested in a location.* Owner: M7. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `interest_id` | `UUID` | system-set | PK | M7 §5.1 FR-001 (OUT) |
| `project_id` | `UUID` | Req | FK → `PROJECT` | M7 §5.1 FR-001 |
| `location_id` | `UUID` | Req | FK → `LOCATION` | M7 §5.1 FR-001 |
| `created_at` | *type not declared* | not declared |  | M7 §6 |

**Natural key:** project_id + location_id — proposed (open question: may a project declare interest twice?).

## PROVINCE_NOTICE

*The notice VFDA sends a province about a project's interest, and the province's reply.* Owner: M7. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `interest_id` | `UUID` | Req | PK, FK → `LOCATION_INTEREST` | M7 §5.1 FR-002; M7 §6 |
| `province_id` | *type not declared* | not declared | FK → `PROVINCE` | M7 §6 (derivable from the location — see Structural findings) |
| `project_summary` | `TEXT` | Req |  | M7 §5.1 FR-002 |
| `authority_email` | `VARCHAR(254)` | Req |  | M7 §5.1 FR-002 (copied from AUTHORITY_CONTACT) |
| `drafted_at` | *type not declared* | not declared |  | M7 §6 |
| `reviewed_by` | `UUID` | Req | FK → `USER_ACCOUNT` | M7 §5.1 FR-002 |
| `sent_at` | *type not declared* | not declared |  | M7 §6 |
| `delivery_status` | `ENUM(queued, sent, bounced)` | system-set |  | M7 §5.1 FR-002 (OUT) |
| `received_at` | *type not declared* | not declared |  | M7 §6 |
| `response` | `ENUM(received, info_needed, cannot_support)` | Req |  | M7 §5.1 FR-003; M7 §5.2 BR-003 |
| `note` | `TEXT` | Opt |  | M7 §5.1 FR-003 |
| `responded_at` | `TIMESTAMPTZ` | system-set |  | M7 §5.1 FR-003 (OUT) |

**Natural key:** interest_id (one notice per interest).

## CONSULTATION_BOOKING

*A member's booked consultation slot with a VFDA officer.* Owner: M7. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `booking_id` | `UUID` | system-set | PK | M7 §5.1 FR-005 (OUT) |
| `member_id` | *type not declared* | not declared | FK → `USER_ACCOUNT` | M7 §6 |
| `topic` | `ENUM` | Req |  | M7 §5.1 FR-005 (values not listed) |
| `slot_start` | `TIMESTAMPTZ` | Req |  | M7 §5.1 FR-005 |
| `timezone` | `VARCHAR(40)` | Req |  | M7 §5.1 FR-005 (IANA) |
| `officer_id` | `UUID` | Req | FK → `USER_ACCOUNT` | M7 §5.1 FR-006 |
| `booking_status` | `ENUM(confirmed, rescheduled)` | system-set |  | M7 §5.1 FR-006 (OUT) |

**Natural key:** member_id + slot_start.

## Type conflicts

| Field | Source A (type / required) | Source B (type / required) | Decision |
|---|---|---|---|
| rule set version | M2 §5.1 FR-002: version INTEGER (OUT) | M2 §5.1 FR-004: rule_version VARCHAR(20) (OUT); M2 §3 US-1 "2026.08" | |
| PROJECT.shoot_date | M0 §5.1 FR-001: DATE Opt | M5 §5.1 FR-007 and M2 §5.1 FR-017: DATE Req | |
| segment_override | M1 §5.1 FR-002: ENUM(A, B, C) Opt | M1 §3 US-2: `segment_override = true` (boolean) | |
| PRECHECK_RUN.lang | M2 §5.1 FR-005: lang ENUM(en, vi) Req | M2 §5.1 FR-007: locale ENUM(vi, en) Req | |
| PROFILE.locale | SYS §6: attribute of Profile | SYS §5.1 FR-005: "stored in cookie `locale`" | |
| DOCUMENT file | M5 §5.1 FR-002: file BYTEA Req | M5 §6: file_path (in private storage) | |
| ORGANISATION.hq_province | M4 §6: hq_province (no type) | M3 §5.1 FR-002: province identifiers are INTEGER | |
| working_languages | M4 §5.1 FR-001: ARRAY<CHAR(2)> Opt on the profile input | M4 §6: attribute of OrganisationMemberLayer; M4 §5.1 FR-006 filter working_language CHAR(2) | |
| BILINGUAL_PARAGRAPH.reviewed_by | M5 §5.1 FR-006: reviewer_id UUID Req | M5 §5.1 FR-004: paragraphs start as `machine` with no reviewer (must be Opt in storage) | |
| LEGAL_RULE.approved_by | M2 §5.1 FR-003: approver_id UUID Req | M2 §3 US-3: a draft rule exists without an approver (must be Opt in storage) | |
| LEGAL_RULE.citation | M2 §5.1 FR-002: citation VARCHAR(200) Req | M2 §3 US-3: a draft rule exists without a citation; M2 §5.2 BR-002 enforces it only for activation | |
| CONSULTATION_BOOKING.officer_id | M7 §5.1 FR-006: officer_id UUID Req | M7 §5.1 FR-005: the booking exists before an officer is assigned (must be Opt in storage) | |
| PROVINCE_NOTICE.reviewed_by / response | M7 §5.1 FR-002 reviewed_by Req; FR-003 response Req | M7 §3 US-1: notice drafted before any review or reply (must be Opt in storage) | |

## Structural findings

Reported only — nothing was fixed in the model.

| Check | Entity / column | What the spec does not settle | Raised as |
|---|---|---|---|
| (i) freeze | PROVINCE_NOTICE.authority_email ← AUTHORITY_CONTACT.contact_email | Contacts are re-verified and may change (M3 BR-004). No rule says the notice keeps the address it was sent to. | OQ-04-1 |
| (i) freeze | PROVINCE_NOTICE.project_summary ← PROJECT | Project name, dates and logline can be edited after the notice is sent (M0 FR-002). No rule says the summary is frozen. | OQ-04-2 |
| (i) freeze | PRECHECK_FINDING / COMPLIANCE_FINDING → LEGAL_RULE (rule_code) | A rule can be edited (M2 FR-002). Findings keep rule_version (BR-007, settled), but show the rule text by rule_code — the text shown later may not be the one that fired. | OQ-04-3 |
| (i) freeze | SEGMENT_DECISION → SEGMENT_RULE | SEGMENT_RULE has a version; the decision does not store which version decided it. | OQ-04-4 |
| (i) freeze | BILINGUAL_DOCUMENT.project_meta ← PROJECT | A copy of project data is stored with the draft; no rule says whether it refreshes when the project changes. | OQ-04-5 |
| (i) freeze | NDA_ACCEPTANCE.nda_version; CONSENT.consent_version; READINESS_SNAPSHOT.readiness_total | Settled: versions and snapshots are stored at the time (M4 FR-017, SYS BR-003, M0 FR-008). | — |
| (i) freeze | COLLAB_REQUEST → ORGANISATION verified badge | Settled: the request continues if the badge expires (M4 §3 Edge cases). | — |
| (ii) delete | USER_ACCOUNT (in 15 relationships) | No function deletes an account; no rule defines what happens to projects, uploads, access logs or approvals it owns. | OQ-04-6 |
| (ii) delete | PROJECT (in 14 relationships) | No function deletes or archives a project; documents, requests and notices would be orphaned. | OQ-04-7 |
| (ii) delete | LOCATION (shortlists, interests, notices) | Only `published` exists; no rule says whether an unpublished location stays in shortlists and notices. | OQ-04-8 |
| (ii) delete | ORGANISATION (requests, proofread paragraphs) | No function removes an organisation; badge expiry is the only end state (M4 FR-011). | OQ-04-9 |
| (ii) delete | LEGAL_RULE (findings cite it) | No function retires a rule. Settled in part: every check stores its version (M2 BR-007). | OQ-04-3 |
| (ii) delete | DOCUMENT, DOCUMENT_ACCESS_LOG, SEGMENT_DECISION data | Settled: previous versions kept (M5 FR-002); access log append-only (M4 BR-007); segment change never deletes (M1 BR-004). | — |
| (iii) enum | PROJECT_MEMBER.permission | F-M0-01 makes the creator the *owner*, but `owner` is not in ENUM(view, edit); F-M0-04 is "owner only". | OQ-04-10 |
| (iii) enum | PROJECT_MEMBER.invite_status | No function moves an invitation from `pending` to `accepted` (M0 US-3 says "after accepting"). | OQ-04-10 |
| (iii) enum | LEGAL_RULE.status | F-M2-03 moves draft → approved; nothing moves a rule out of `approved` (edit, withdraw). | OQ-04-3 |
| (iii) enum | DOCUMENT_SLOT.state | No function writes `needs_fix` or `pending`; they are described as rule outcomes (M2 US-2, M4 US-2). Stored or derived? | OQ-04-11 |
| (iii) enum | BILINGUAL_PARAGRAPH.status | reviewed → machine happens "when anyone edits it" (M5 US-2), but no function edits a paragraph. | OQ-04-12 |
| (iii) enum | CONSULTATION_BOOKING.booking_status | F-M7-05 creates a booking with no status; values only confirmed / rescheduled — no initial or cancelled value. | OQ-04-13 |
| (iii) enum | COLLAB_REQUEST.status | An unanswered request may expire after N days (M4 §3 Edge cases), but `expired` is not in the set. | OQ-04-14 |
| (iii) enum | PROJECT.stage; LOCATION.intake_status; LOCATION_IMAGE.status; CONSULTATION_BOOKING.topic; service_groups; scene_types | Value sets not declared anywhere. | OQ-04-15 |
| (iii) enum | VERIFICATION_REQUEST.status | Initial `pending` is implied, not stated by F-M4-08; badge expiry is kept on ORGANISATION, so no `expired` request state — consistent. | — |
| minimality | PROVINCE_NOTICE.province_id | Derivable from LOCATION_INTEREST → LOCATION → province_id. | OQ-04-16 |
| minimality | LEGAL_RULE.is_active vs status | is_active may be derivable from status = approved. | OQ-04-16 |
| minimality | BILINGUAL_DOCUMENT.watermark | Always true (M5 FR-005) — a constant column. | OQ-04-16 |
| 1NF | ORGANISATION.service_groups, provinces; LOCATION.scene_types, months_to_avoid; SEGMENT_DECISION.q4_needs | Arrays as declared; filtering and counting on them is exactly the use (M3 FR-007, M4 FR-005/006). Implied entities in 01. | 01 OQ 3 |

## Diagram

The relationship lines are byte-for-byte the lines of `03-erd.mmd`; only attribute blocks are added. Generic types only (`string int decimal date datetime boolean enum uuid`). `ARRAY`, `JSONB`, `FILE` and undeclared types are drawn as `string` and named in the comment — the table above keeps the declared type.

```mermaid
erDiagram
    USER_ACCOUNT ||--|| PROFILE : "has"
    PRODUCER_ORGANISATION ||..|{ PROFILE : "employs"
    USER_ACCOUNT ||--|{ CONSENT : "gives"
    USER_ACCOUNT ||--o{ NOTIFICATION : "receives"
    NOTIFICATION |o..o| EMAIL_DELIVERY : "is emailed as"
    PRODUCER_ORGANISATION ||..o{ PROJECT : "owns"
    PROJECT ||--|{ PROJECT_MEMBER : "gives access to"
    USER_ACCOUNT |o..o{ PROJECT_MEMBER : "joins projects as"
    PROJECT ||--o{ PROJECT_PROVINCE : "plans to shoot in"
    PROVINCE ||..o{ PROJECT_PROVINCE : "is planned as"
    PROJECT ||--o{ READINESS_SNAPSHOT : "is measured by"
    PROJECT |o..o{ SEGMENT_DECISION : "is configured by"
    SEGMENT_RULE |o..o{ SEGMENT_DECISION : "decides"
    RULE_SET_VERSION |o..|{ LEGAL_RULE : "includes"
    USER_ACCOUNT ||..o{ RULE_SET_VERSION : "publishes"
    USER_ACCOUNT |o..o{ LEGAL_RULE : "approves"
    RULE_SET_VERSION ||..o{ PRECHECK_RUN : "is applied in"
    PROJECT |o..o{ PRECHECK_RUN : "may be linked to"
    PRECHECK_RUN ||--o{ PRECHECK_FINDING : "produces"
    LEGAL_RULE ||..o{ PRECHECK_FINDING : "is cited by"
    RULE_SET_VERSION ||..o{ COMPLIANCE_RUN : "is applied in"
    PROJECT ||--o{ COMPLIANCE_RUN : "is checked by"
    COMPLIANCE_RUN ||--o{ COMPLIANCE_FINDING : "produces"
    LEGAL_RULE ||..o{ COMPLIANCE_FINDING : "is cited by"
    PROVINCE ||..o{ LOCATION : "contains"
    LOCATION ||--o{ LOCATION_IMAGE : "is shown in"
    LOCATION ||--o| AUTHORITY_CONTACT : "is reached through"
    USER_ACCOUNT ||..o{ AUTHORITY_CONTACT : "verifies"
    PROJECT |o..o{ LOCATION_QUERY : "may be searched for by"
    PROJECT ||--o{ PROJECT_SHORTLIST : "keeps"
    LOCATION ||..o{ PROJECT_SHORTLIST : "is kept in"
    ORGANISATION ||--o| ORGANISATION_MEMBER_LAYER : "shows members"
    ORGANISATION ||--o| ORGANISATION_PRIVATE_LAYER : "shows confirmed partners"
    PROVINCE |o..o{ ORGANISATION : "hosts the headquarters of"
    ORGANISATION ||--o{ VERIFICATION_REQUEST : "applies through"
    USER_ACCOUNT |o..o{ VERIFICATION_REQUEST : "decides"
    PROJECT ||--o{ COLLAB_REQUEST : "sends"
    ORGANISATION ||..o{ COLLAB_REQUEST : "receives"
    COLLAB_REQUEST ||--o{ COLLAB_MESSAGE : "carries"
    USER_ACCOUNT ||..o{ COLLAB_MESSAGE : "writes"
    COLLAB_REQUEST ||--o{ NDA_ACCEPTANCE : "is protected by"
    DOCUMENT ||--o{ DOCUMENT_ACCESS_LOG : "is viewed in"
    USER_ACCOUNT ||..o{ DOCUMENT_ACCESS_LOG : "views"
    DOCUMENT_TYPE ||..o{ DOCUMENT_SLOT : "defines"
    PROJECT ||--o{ DOCUMENT_SLOT : "needs"
    DOCUMENT_SLOT ||--o{ DOCUMENT : "holds"
    USER_ACCOUNT ||..o{ DOCUMENT : "uploads"
    PROJECT ||--o{ BILINGUAL_DOCUMENT : "has drafts"
    DOCUMENT_TYPE ||..o{ BILINGUAL_DOCUMENT : "is drafted as"
    BILINGUAL_DOCUMENT ||--|{ BILINGUAL_PARAGRAPH : "is split into"
    USER_ACCOUNT |o..o{ BILINGUAL_PARAGRAPH : "proofreads"
    ORGANISATION |o..o{ BILINGUAL_PARAGRAPH : "proofreads through"
    PROJECT ||--o{ PROJECT_GLOSSARY : "defines terms in"
    PROJECT ||--o{ LOCATION_INTEREST : "declares"
    LOCATION ||..o{ LOCATION_INTEREST : "attracts"
    LOCATION_INTEREST ||--|| PROVINCE_NOTICE : "is announced by"
    PROVINCE ||..o{ PROVINCE_NOTICE : "is addressed by"
    USER_ACCOUNT |o..o{ PROVINCE_NOTICE : "reviews"
    USER_ACCOUNT ||..o{ CONSULTATION_BOOKING : "books"
    USER_ACCOUNT |o..o{ CONSULTATION_BOOKING : "is assigned"
    SEGMENT_REQUIREMENT
    PUBLIC_HOLIDAY
    USER_ACCOUNT {
        uuid user_id PK "SYS s5.1 FR-001 (OUT)"
        string email UK "SYS s5.1 FR-001; SYS s3 US-1 (one account per email)"
        boolean email_verified "SYS s5.1 FR-001 (OUT)"
        enum role "SYS s5.1 FR-004; SYS s5.2 BR-002 (new account = member)"
        string created_at "TYPE NOT DECLARED - SYS s6"
    }
    PROFILE {
        uuid user_id PK,FK "SYS s6 ('belongs to UserAccount')"
        string full_name "SYS s5.1 FR-001"
        enum crew_role "SYS s5.1 FR-001"
        enum locale "SYS s5.1 FR-005 (also said to live in a cookie - see Type conflicts)"
        string producer_org_id FK "TYPE NOT DECLARED - SYS s6"
    }
    PRODUCER_ORGANISATION {
        string producer_org_id PK "TYPE NOT DECLARED - SYS s6 (Profile.producer_org_id)"
        string org_name "SYS s5.1 FR-001"
        string country "SYS s5.1 FR-001"
        string website "SYS s5.1 FR-001"
    }
    CONSENT {
        uuid user_id PK,FK "SYS s6"
        string consent_version PK "SYS s5.1 FR-001; SYS s5.2 BR-003"
        string accepted_at "TYPE NOT DECLARED - SYS s6; SYS s5.2 BR-003 (timestamp)"
    }
    NOTIFICATION {
        uuid notification_id PK "SYS s5.1 FR-007 (OUT)"
        uuid recipient_id FK "SYS s5.1 FR-007"
        string event_type "SYS s5.1 FR-007"
        string payload "declared JSONB - SYS s5.1 FR-007"
        datetime created_at "SYS s5.1 FR-007 (OUT)"
        string read_at "TYPE NOT DECLARED - SYS s6; SYS s5.1 FR-009 (mark as read)"
    }
    EMAIL_DELIVERY {
        string email_delivery_id PK "TYPE NOT DECLARED - none - no identifier declared (open question)"
        uuid notification_id FK "SYS s6 ('may relate to a Notification')"
        string template_id "SYS s5.1 FR-008"
        string recipient_email "SYS s5.1 FR-008"
        string variables "declared JSONB - SYS s5.1 FR-008"
        enum delivery_status "SYS s5.1 FR-008 (OUT)"
        string provider_message_id UK "SYS s5.1 FR-008 (OUT)"
    }
    SEGMENT_RULE {
        string segment_rule_id PK "TYPE NOT DECLARED - M1 s6 (rule_id - renamed, see 01 conflicts)"
        boolean q1_shoot_in_vn "M1 s6 (q1) = M1 s5.1 FR-002 q1_shoot_in_vn"
        enum q2_release "M1 s6 (q2) = M1 s5.1 FR-002"
        enum q3_producer "M1 s6 (q3) = M1 s5.1 FR-002"
        enum result_segment "M1 s6; type of segment from M1 s5.1 FR-002"
        string version "TYPE NOT DECLARED - M1 s6"
    }
    SEGMENT_REQUIREMENT {
        enum segment PK "M1 s6; type from M1 s5.1 FR-002"
        string requirement_code PK "TYPE NOT DECLARED - M1 s6"
        string label_vi "TYPE NOT DECLARED - M1 s6"
        string label_en "TYPE NOT DECLARED - M1 s6"
        string needed "TYPE NOT DECLARED - M1 s6; M1 s3 US-1 (Needed / Not needed)"
    }
    SEGMENT_DECISION {
        string segment_decision_id PK "TYPE NOT DECLARED - none - no identifier declared (open question)"
        string session_or_project_id FK "TYPE NOT DECLARED - M1 s6 (one column for two meanings - see Structural findings)"
        string segment_rule_id FK "TYPE NOT DECLARED - M1 s6 ('used by SegmentDecision')"
        boolean q1_shoot_in_vn "M1 s5.1 FR-002 (answers)"
        enum q2_release "M1 s5.1 FR-002 (Req when q1 = true)"
        enum q3_producer "M1 s5.1 FR-002 (Req when q1 = true)"
        string q4_needs "declared ARRAY<ENUM(locations, crew, cast, equipment, logistics)> - M1 s5.1 FR-002; M1 s5.2 BR-002"
        enum segment "M1 s5.1 FR-002 (OUT)"
        enum segment_override "M1 s5.1 FR-002; M1 s5.2 BR-003 - see Type conflicts"
        string decided_by "declared ARRAY<INTEGER> - M1 s5.1 FR-002 (OUT)"
        string journey_config "declared JSONB - M1 s5.1 FR-002 (OUT)"
    }
    PROJECT {
        uuid project_id PK "M0 s5.1 FR-001 (OUT)"
        string producer_org_id FK "TYPE NOT DECLARED - M0 s6 ('belongs to ProducerOrganisation')"
        string project_name "M0 s5.1 FR-001"
        enum format "M0 s5.1 FR-001"
        enum segment "M0 s5.1 FR-001; M1 s5.1 FR-003"
        date shoot_date "M0 s5.1 FR-001 (Opt), FR-002 (after today); M5 s5.1 FR-007 (Req) - see Type conflicts"
        int buffer_days "M5 s5.1 FR-007 (0 / 7 / 14 / 21); M2 s5.1 FR-017 (default 7)"
        int shoot_days_vn "M0 s5.1 FR-001"
        enum crew_size_band "M0 s5.1 FR-001"
        string logline "M0 s5.1 FR-001"
        string stage "TYPE NOT DECLARED - M0 s6"
        datetime updated_at "M0 s5.1 FR-002 (OUT)"
    }
    PROJECT_MEMBER {
        uuid member_id PK "M0 s5.1 FR-004 (OUT)"
        uuid project_id FK "M0 s5.1 FR-004"
        string user_id FK "TYPE NOT DECLARED - M0 s6 (user_id)"
        string invitee_email "M0 s5.1 FR-004"
        enum permission "M0 s5.1 FR-004 (owner not in the set - see Structural findings)"
        enum invite_status "M0 s5.1 FR-004 (OUT)"
    }
    PROJECT_PROVINCE {
        uuid project_id PK,FK "M0 s6"
        int province_id PK,FK "M0 s5.1 FR-001 (provinces ARRAY<INTEGER> Opt)"
    }
    READINESS_SNAPSHOT {
        uuid snapshot_id PK "M0 s5.1 FR-008 (OUT)"
        uuid project_id FK "M0 s5.1 FR-008"
        date snapshot_date "M0 s5.1 FR-008"
        decimal readiness_total "M0 s6; M0 s5.1 FR-009 (OUT)"
    }
    LEGAL_RULE {
        uuid rule_id PK "M2 s5.1 FR-002 (OUT)"
        string rule_code UK "M2 s5.1 FR-002"
        string rule_version FK "M2 s6; M2 s5.1 FR-002 (OUT version INTEGER) - see Type conflicts"
        string title_vi "M2 s5.1 FR-002"
        string title_en "M2 s5.1 FR-002"
        string description_vi "M2 s5.1 FR-002"
        string description_en "M2 s5.1 FR-002"
        string guidance_vi "M2 s5.1 FR-002"
        string guidance_en "M2 s5.1 FR-002"
        string citation "M2 s5.1 FR-002; M2 s5.2 BR-002 (CHECK)"
        enum severity "M2 s5.1 FR-002"
        string topic "M2 s5.1 FR-001, FR-015 (filter_topic / topic)"
        string rule_slug UK "M2 s5.1 FR-016"
        enum status "M2 s5.1 FR-001 (filter_status)"
        uuid approved_by FK "M2 s5.1 FR-003 (approver_id); M2 s5.2 BR-002 (CHECK)"
        datetime approved_at "M2 s5.1 FR-003 (OUT)"
        boolean is_active "M2 s5.1 FR-003 (OUT)"
    }
    RULE_SET_VERSION {
        string rule_version PK "M2 s5.1 FR-004 (OUT) - see Type conflicts"
        string created_at "TYPE NOT DECLARED - M2 s6"
        string created_by FK "TYPE NOT DECLARED - M2 s6"
    }
    PRECHECK_RUN {
        uuid brief_id PK "M2 s5.1 FR-007 (OUT)"
        string project_id FK "TYPE NOT DECLARED - M2 s6 ('may belong to a Project')"
        string rule_version FK "M2 s6; M2 s5.2 BR-007"
        string synopsis_hash "M2 s5.1 FR-007"
        enum lang "M2 s5.1 FR-005 (= locale ENUM(vi, en) in FR-007)"
        string flags "declared JSONB - M2 s5.1 FR-005"
        string country_guess "M2 s5.1 FR-007"
        enum attention_level "M2 s5.1 FR-006 (OUT); M2 s5.2 BR-004"
        string created_at "TYPE NOT DECLARED - M2 s6"
    }
    PRECHECK_FINDING {
        uuid brief_id PK,FK "M2 s6 ('belongs to PrecheckRun')"
        string rule_code PK,FK "M2 s5.1 FR-006 (OUT findings)"
        string span_start PK "TYPE NOT DECLARED - M2 s6"
        string span_end "TYPE NOT DECLARED - M2 s6"
        string quoted_text "M2 s5.1 FR-006 (OUT)"
        string explanation_vi "M2 s5.1 FR-006 (OUT); M2 s6 (explanation)"
        string explanation_en "M2 s5.1 FR-006 (OUT)"
    }
    COMPLIANCE_RUN {
        string run_id PK "TYPE NOT DECLARED - M2 s6"
        string project_id FK "TYPE NOT DECLARED - M2 s6"
        string rule_version FK "M2 s6; M2 s5.2 BR-007"
        string run_at "TYPE NOT DECLARED - M2 s6"
    }
    COMPLIANCE_FINDING {
        uuid finding_id PK "M2 s5.1 FR-014"
        string run_id FK "TYPE NOT DECLARED - M2 s6 ('belongs to ComplianceRun')"
        string rule_code FK "M2 s6; type from M2 s5.1 FR-006"
        string quoted_text "M2 s6; type from M2 s5.1 FR-006"
        enum finding_status "M2 s5.1 FR-014 (OUT)"
        string reviewer_note "M2 s5.1 FR-014"
    }
    LOCATION {
        uuid location_id PK "M3 s5.1 FR-002 (OUT)"
        string slug UK "M3 s5.1 FR-002 (OUT)"
        int province_id FK "M3 s5.1 FR-002; M3 s5.2 BR-006"
        string name_vi "M3 s5.1 FR-002"
        string name_en "M3 s5.1 FR-002"
        string district "M3 s5.1 FR-002"
        decimal lat "M3 s5.1 FR-002"
        decimal lng "M3 s5.1 FR-002"
        int airport_km "M3 s5.1 FR-002"
        string scene_types "declared ARRAY<ENUM> - M3 s5.1 FR-002 (enum values not listed)"
        string desc_vi "M3 s5.1 FR-002"
        string desc_en "M3 s5.1 FR-002"
        enum crew_capacity "M3 s5.1 FR-002"
        boolean lodging_20km "M3 s5.1 FR-002"
        boolean grid_power "M3 s5.1 FR-002"
        boolean truck_access "M3 s5.1 FR-002"
        string months_to_avoid "declared ARRAY<INTEGER> - M3 s5.1 FR-002"
        enum permit_complexity "M3 s5.1 FR-002"
        string restriction_note "M3 s5.1 FR-002"
        string intake_status "TYPE NOT DECLARED - M3 s6"
        boolean published "M3 s5.1 FR-005 (OUT); M3 s5.2 BR-004"
        string blocked_reason "M3 s5.1 FR-005 (OUT)"
    }
    LOCATION_IMAGE {
        string image_url PK "M3 s5.1 FR-003 (OUT)"
        string location_id FK "TYPE NOT DECLARED - M3 s6 ('belongs to Location')"
        string image_source "M3 s5.1 FR-003"
        string usage_right "M3 s5.1 FR-003"
        string status "TYPE NOT DECLARED - M3 s6"
    }
    AUTHORITY_CONTACT {
        uuid location_id PK,FK "M3 s5.1 FR-004; M3 s6 ('has one')"
        string authority_name "M3 s5.1 FR-004"
        string contact_name "M3 s5.1 FR-004"
        string contact_phone "M3 s5.1 FR-004"
        string contact_email "M3 s5.1 FR-004"
        uuid verified_by FK "M3 s5.1 FR-004"
        datetime verified_at "M3 s5.1 FR-004 (OUT)"
        boolean contact_verified "M3 s5.1 FR-004 (OUT); M3 s5.1 FR-005 (CHECK)"
    }
    PROVINCE {
        int province_id PK "M3 s5.1 FR-002 (province_id INTEGER)"
        string name UK "TYPE NOT DECLARED - M3 s6"
        string slug UK "M3 s5.1 FR-020 (province_slug)"
        string region "TYPE NOT DECLARED - M3 s6; M3 s5.1 FR-007 (province or region)"
        string merged_from "TYPE NOT DECLARED - M3 s6; M3 s5.2 BR-006"
    }
    LOCATION_QUERY {
        string location_query_id PK "TYPE NOT DECLARED - none - no identifier declared (open question)"
        string project_id FK "TYPE NOT DECLARED - M3 s6 ('may belong to Project')"
        string description "M3 s6 = M3 s5.1 FR-010 scene_description (10–1000 characters)"
        string attributes "declared JSONB - M3 s5.1 FR-011 (OUT)"
        string month "TYPE NOT DECLARED - M3 s6"
    }
    PROJECT_SHORTLIST {
        uuid shortlist_id PK "M3 s5.1 FR-018 (OUT)"
        uuid project_id FK "M3 s5.1 FR-018"
        uuid location_id FK "M3 s5.1 FR-018 (location_ids ARRAY<UUID>)"
        enum role "M3 s5.1 FR-018"
    }
    ORGANISATION {
        uuid org_id PK "M4 s5.1 FR-001 (OUT)"
        string slug UK "M4 s5.1 FR-001 (OUT)"
        string org_name "M4 s5.1 FR-001"
        string legal_form "TYPE NOT DECLARED - M4 s6"
        string founded_year "TYPE NOT DECLARED - M4 s6"
        string hq_province FK "TYPE NOT DECLARED - M4 s6 (a province - see Type conflicts)"
        string service_groups "declared ARRAY<ENUM> - M4 s5.1 FR-001; M4 s5.2 BR-002 (12 values, not listed)"
        string provinces "declared ARRAY<INTEGER> - M4 s5.1 FR-001"
        datetime verified_at "M4 s5.1 FR-010 (OUT)"
        string verified_until "TYPE NOT DECLARED - M4 s6; M4 s5.2 BR-004 (12 months)"
        string art13_eligible "TYPE NOT DECLARED - M4 s6"
    }
    ORGANISATION_MEMBER_LAYER {
        uuid org_id PK,FK "M4 s6 ('belongs to Organisation')"
        string capability_desc_vi "M4 s5.1 FR-001 (s6 capability_desc)"
        string capability_desc_en "M4 s5.1 FR-001"
        string portfolio "TYPE NOT DECLARED - M4 s6"
        string intl_project_count "TYPE NOT DECLARED - M4 s6"
        string working_languages "declared ARRAY<CHAR(2)> - M4 s5.1 FR-001; M4 s6"
    }
    ORGANISATION_PRIVATE_LAYER {
        uuid org_id PK,FK "M4 s6"
        string rate_card "declared JSONB - M4 s5.1 FR-001"
        string past_clients "declared ARRAY<TEXT> - M4 s5.1 FR-001"
        string direct_contact "TYPE NOT DECLARED - M4 s6"
    }
    VERIFICATION_REQUEST {
        uuid request_id PK "M4 s5.1 FR-008 (OUT verification_request_id)"
        uuid org_id FK "M4 s5.1 FR-008"
        string business_license "declared FILE - M4 s5.1 FR-008 (PDF max 25 MB)"
        string reference_projects "declared ARRAY<TEXT> - M4 s5.1 FR-008 (>= 2)"
        enum status "M4 s5.1 FR-009, FR-010"
        string decided_by FK "TYPE NOT DECLARED - M4 s6"
        string reason "M4 s5.1 FR-010 (required when rejected)"
    }
    COLLAB_REQUEST {
        uuid request_id PK "M4 s5.1 FR-012 (OUT)"
        uuid project_id FK "M4 s5.1 FR-012"
        uuid org_id FK "M4 s5.1 FR-012"
        string services "declared ARRAY<ENUM> - M4 s5.1 FR-012"
        string note "M4 s5.1 FR-012 (max 1000 characters)"
        enum status "M4 s5.1 FR-012 (pending), FR-014; M4 s5.2 BR-005"
        string response_note "M4 s5.1 FR-014"
        string sent_at "TYPE NOT DECLARED - M4 s6"
        datetime responded_at "M4 s5.1 FR-014 (OUT)"
        string confirmed_at "TYPE NOT DECLARED - M4 s6"
    }
    COLLAB_MESSAGE {
        string request_id PK,FK "TYPE NOT DECLARED - M4 s6"
        string author_id PK,FK "TYPE NOT DECLARED - M4 s6"
        string created_at PK "TYPE NOT DECLARED - M4 s6"
        string body "TYPE NOT DECLARED - M4 s6"
    }
    NDA_ACCEPTANCE {
        uuid nda_acceptance_id PK "M4 s5.1 FR-017 (OUT)"
        uuid request_id FK "M4 s5.1 FR-017"
        enum party "M4 s5.1 FR-017"
        string nda_version "M4 s5.1 FR-017"
        boolean accepted "M4 s5.1 FR-017"
        datetime accepted_at "M4 s5.1 FR-017 (OUT)"
    }
    DOCUMENT_ACCESS_LOG {
        uuid access_log_id PK "M4 s5.1 FR-018 (OUT)"
        uuid document_id FK "M4 s5.1 FR-018"
        uuid viewer_id FK "M4 s5.1 FR-018"
        datetime viewed_at "M4 s5.1 FR-018 (OUT); M4 s5.2 BR-007 (append-only)"
    }
    DOCUMENT_TYPE {
        string doc_code PK "M5 s5.1 FR-001 (OUT)"
        string name_vi "M5 s5.1 FR-001 (OUT)"
        string name_en "M5 s5.1 FR-001 (OUT)"
        enum basis "M5 s5.1 FR-001 (OUT); M5 s5.2 BR-003"
        string template_url "M5 s5.1 FR-001 (OUT)"
        string segments "TYPE NOT DECLARED - M5 s6"
    }
    DOCUMENT_SLOT {
        uuid project_id PK,FK "M5 s5.1 FR-002; M5 s6"
        string doc_code PK,FK "M5 s5.1 FR-002; M5 s6"
        enum state "M5 s5.1 FR-003 (OUT); M2 s5.1 FR-009"
    }
    DOCUMENT {
        uuid document_id PK "M5 s5.1 FR-002 (OUT)"
        uuid project_id FK "M5 s5.1 FR-002 (with doc_code: the slot)"
        string doc_code FK "M5 s5.1 FR-002"
        string file_path "TYPE NOT DECLARED - M5 s6 (FR-002 declares file BYTEA - see Type conflicts)"
        string version "TYPE NOT DECLARED - M5 s6; M5 s5.1 FR-002 (previous versions kept)"
        string uploaded_by FK "TYPE NOT DECLARED - M5 s6"
        string uploaded_at "TYPE NOT DECLARED - M5 s6"
    }
    BILINGUAL_DOCUMENT {
        uuid project_id PK,FK "M5 s6"
        string doc_code PK,FK "M5 s6"
        string structure_version "M5 s5.1 FR-004 (OUT)"
        string synopsis_en "M5 s5.1 FR-004, FR-005"
        string project_meta "declared JSONB - M5 s5.1 FR-004 (copy of project data - see Structural findings)"
        string pdf_url "M5 s5.1 FR-005 (OUT)"
        boolean watermark "M5 s5.1 FR-005 (OUT, always true); M5 s5.2 BR-001"
    }
    BILINGUAL_PARAGRAPH {
        uuid project_id PK,FK "M5 s6 (belongs to BilingualDocument)"
        string doc_code PK,FK "M5 s6"
        int idx PK "M5 s5.1 FR-004 (OUT)"
        string source_text "M5 s5.1 FR-004 (OUT)"
        string target_text "M5 s5.1 FR-004 (OUT)"
        enum status "M5 s5.1 FR-004 (OUT); M5 s5.2 BR-002"
        uuid reviewed_by FK "M5 s5.1 FR-006 (reviewer_id); M5 s6"
        uuid reviewer_org_id FK "M5 s5.1 FR-006 (which organisation - see 01 conflicts)"
        datetime reviewed_at "M5 s5.1 FR-006 (OUT proofread_at); M5 s6"
    }
    PROJECT_GLOSSARY {
        string project_id PK,FK "TYPE NOT DECLARED - M5 s6"
        string source_term PK "TYPE NOT DECLARED - M5 s6"
        string target_term "TYPE NOT DECLARED - M5 s6"
    }
    PUBLIC_HOLIDAY {
        string name PK "TYPE NOT DECLARED - M5 s6"
        string start_date PK "TYPE NOT DECLARED - M5 s6"
        string end_date "TYPE NOT DECLARED - M5 s6"
        string is_expected "TYPE NOT DECLARED - M5 s6; M5 s3 US-3 (band marked *expected*)"
    }
    LOCATION_INTEREST {
        uuid interest_id PK "M7 s5.1 FR-001 (OUT)"
        uuid project_id FK "M7 s5.1 FR-001"
        uuid location_id FK "M7 s5.1 FR-001"
        string created_at "TYPE NOT DECLARED - M7 s6"
    }
    PROVINCE_NOTICE {
        uuid interest_id PK,FK "M7 s5.1 FR-002; M7 s6"
        string province_id FK "TYPE NOT DECLARED - M7 s6 (derivable from the location - see Structural findings)"
        string project_summary "M7 s5.1 FR-002"
        string authority_email "M7 s5.1 FR-002 (copied from AUTHORITY_CONTACT)"
        string drafted_at "TYPE NOT DECLARED - M7 s6"
        uuid reviewed_by FK "M7 s5.1 FR-002"
        string sent_at "TYPE NOT DECLARED - M7 s6"
        enum delivery_status "M7 s5.1 FR-002 (OUT)"
        string received_at "TYPE NOT DECLARED - M7 s6"
        enum response "M7 s5.1 FR-003; M7 s5.2 BR-003"
        string note "M7 s5.1 FR-003"
        datetime responded_at "M7 s5.1 FR-003 (OUT)"
    }
    CONSULTATION_BOOKING {
        uuid booking_id PK "M7 s5.1 FR-005 (OUT)"
        string member_id FK "TYPE NOT DECLARED - M7 s6"
        enum topic "M7 s5.1 FR-005 (values not listed)"
        datetime slot_start "M7 s5.1 FR-005"
        string timezone "M7 s5.1 FR-005 (IANA)"
        uuid officer_id FK "M7 s5.1 FR-006"
        enum booking_status "M7 s5.1 FR-006 (OUT)"
    }
```

## Open questions

| # | Question | Blocking? | Owner | Default applied | Consequence if the default is wrong |
|---|---|---|---|---|---|
| OQ-04-1 | [NEEDS CLARIFICATION: Must a province notice keep the authority email it was sent to, even if the contact changes later?] | No | M7 owner | Yes — copied at send time as FR-002 already does | Replies cannot be traced to the address actually used. |
| OQ-04-2 | [NEEDS CLARIFICATION: Is the project summary in a sent notice frozen?] | No | M7 owner | Frozen at send time | The province may see a summary different from what it received. |
| OQ-04-3 | [NEEDS CLARIFICATION: When an approved rule is edited or retired, is the old text kept so old findings still show what fired?] | Yes | M2 owner (VFDA Legal) | Keep every approved text per rule_version; never overwrite | A producer's saved result would silently change meaning. |
| OQ-04-4 | [NEEDS CLARIFICATION: Should a segment decision record the decision-table version used?] | No | M1 owner | Yes, add segment_rule_id (drawn) and rely on the rule's version | A table change could not be audited against past decisions. |
| OQ-04-5 | [NEEDS CLARIFICATION: Does a bilingual draft refresh its project_meta when the project changes?] | No | M5 owner | No — regenerated only on request | Title or dates in the Vietnamese draft may be stale. |
| OQ-04-6 | [NEEDS CLARIFICATION: What happens to projects, uploads, logs and approvals when an account is deleted (personal data law)?] | Yes | Nam + VFDA Legal | Account disabled, personal fields erased, rows kept with the link | Either orphaned rows or unlawful retention of personal data. |
| OQ-04-7 | [NEEDS CLARIFICATION: Can a project be deleted or only archived? What happens to its documents, requests and notices?] | Yes | M0 owner | Archive only; no delete | Deleting would break access logs (append-only) and sent notices. |
| OQ-04-8 | [NEEDS CLARIFICATION: Does unpublishing a location remove it from shortlists and open notices?] | No | M3 owner | No; it is shown as *no longer published* | Producers lose a shortlisted place without notice. |
| OQ-04-9 | [NEEDS CLARIFICATION: Can an organisation be removed from the directory, and what happens to its open requests?] | No | M4 owner | No removal; badge expiry only | A closed company keeps receiving requests. |
| OQ-04-10 | [NEEDS CLARIFICATION: Add `owner` to PROJECT_MEMBER.permission, and which function accepts an invitation?] | Yes | M0 owner | Owner stored as `edit` + flag not modelled; acceptance by sign-in with the invited email | "Owner only" rules (M0 FR-004) cannot be enforced in the database. |
| OQ-04-11 | [NEEDS CLARIFICATION: Is DOCUMENT_SLOT.state stored, or derived from documents, proofreading and partner status each time?] | Yes | M5 + M2 owners | Stored, recomputed on each upload and status change | Stored state can disagree with the rules it summarises. |
| OQ-04-12 | [NEEDS CLARIFICATION: Which function edits a paragraph (and so clears its proofread status)?] | No | M5 owner | Editing inside SC-28, not specified as a function | The reset in M5 US-2 has no function to hang on. |
| OQ-04-13 | [NEEDS CLARIFICATION: Initial and cancelled values of CONSULTATION_BOOKING.booking_status?] | No | M7 owner | Status left empty until VFDA confirms; no cancellation (seed follows this) | Unconfirmed bookings are indistinguishable from confirmed ones; a member cannot cancel. |
| OQ-04-14 | [NEEDS CLARIFICATION: After how many days does an unanswered collaboration request expire, and is `expired` a status?] | No | M4 owner | No expiry; member withdraws | Requests stay open forever and block a second request to the same partner. |
| OQ-04-15 | [NEEDS CLARIFICATION: Value sets of PROJECT.stage, LOCATION.intake_status, LOCATION_IMAGE.status, consultation topic, the 12 service groups and scene types.] | Yes | Module owners + VFDA | Values used in the seed are proposals, listed in data/seed/README.md | Code and seed invent their own values; screens and filters disagree. |
| OQ-04-16 | [NEEDS CLARIFICATION: Drop derivable columns (PROVINCE_NOTICE.province_id, LEGAL_RULE.is_active, BILINGUAL_DOCUMENT.watermark)?] | No | M7, M2, M5 owners | Kept as declared | Two sources of the same truth can disagree. |
| OQ-04-17 | [NEEDS CLARIFICATION: Declare identifiers for EMAIL_DELIVERY, SEGMENT_DECISION, LOCATION_QUERY (none in the spec).] | No | SYS, M1, M3 owners | Placeholder keys *_id (type not declared) | Rows cannot be referenced from logs or support tickets. |
| OQ-04-18 | [NEEDS CLARIFICATION: Types for all columns marked *type not declared* (70 columns).] | Yes | Module owners | Seed uses text; generic diagram type string | The build agent will choose types itself. |
| OQ-04-19 | [NEEDS CLARIFICATION: The location data-entry template has "18 fields" (M3 FR-002) but the I/O contract lists 17. Which field is missing?] | No | M3 owner | 17 as listed | One template field has nowhere to be stored. |


---
*Human gate 4: fill the Decision column of the type conflicts and confirm every natural key. Signed: ____________________  Date: __________*
