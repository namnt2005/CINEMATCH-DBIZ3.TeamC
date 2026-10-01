---
artifact: 04-data-model
step: S4
generated: 2026-10-01
sources: FUNCTIONS, FIELDS, ENTITIES, RULES, SCENARIOS, FLOWS, SCREENS, BOUNDARY
---


# Logical Data Model — CINEMATCH

46 tables, 313 columns. Every column is **copied** from a FIELDS row (section 5.1) or an ENTITIES attribute (section 6), with its declared type and Req / Opt flag. *system-set* = an output field (the system fills it); *not declared* = no flag in the input.

**Every column has a declared type** — the types of the section 6 attributes that no 5.1 field declares come from section 6.1 of the owning Spec Document (cited as `<MODULE> §6.1`). Technical columns (`created_at`, `updated_at`) appear only where the spec declares them. The physical schema built from this model is in `data/schema/schema-<MODULE>.sql`; one readable view per module is in `data/data-model-<MODULE>.md`.

Tables are grouped by owning module, in the order SYS → M1 → M0 → M2 → M3 → M4 → M5 → M7 → M10.

## USER_ACCOUNT

*A person's sign-in identity on CINEMATCH, carrying exactly one of six roles.* Owner: SYS. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `user_id` | `UUID` | system-set | PK | SYS §5.1 FR-001 (OUT) |
| `email` | `VARCHAR(254)` | Req | UK | SYS §5.1 FR-001; SYS §3 US-1 (one account per email) |
| `email_verified` | `BOOLEAN` | system-set |  | SYS §5.1 FR-001 (OUT) |
| `role` | `ENUM(guest, member, partner, vfda_staff, vfda_legal, admin)` | Req |  | SYS §5.1 FR-004; SYS §5.2 BR-002 (new account = member) |
| `account_status` | `ENUM(active, deactivated)` | Opt |  | SYS §5.1 FR-004; SYS §5.2 BR-005 (deactivated and anonymised, never hard-deleted) |
| `created_at` | `TIMESTAMPTZ` | Req |  | SYS §6; SYS §6.1 |

**Natural key:** email — one account per email (SYS §3 US-1, third criterion).

## PROFILE

*The personal details shown for an account: name, crew role and preferred language.* Owner: SYS. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `user_id` | `UUID` | Req | PK, FK → `USER_ACCOUNT` | SYS §6 ("belongs to UserAccount") |
| `full_name` | `VARCHAR(120)` | Req |  | SYS §5.1 FR-001 |
| `crew_role` | `ENUM(producer, director, production_coordinator, line_producer, other)` | Req |  | SYS §5.1 FR-001 |
| `locale` | `ENUM(vi, en)` | Req |  | SYS §5.1 FR-005 (also said to live in a cookie — see Type conflicts) |
| `producer_org_id` | `UUID` | Opt | FK → `PRODUCER_ORGANISATION` | SYS §6; SYS §6.1 |

**Natural key:** user_id — one profile per account (SYS §6).

## PRODUCER_ORGANISATION

*The production company a producer signs up on behalf of.* Owner: SYS. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `producer_org_id` | `UUID` | Req | PK | SYS §6 (Profile.producer_org_id); SYS §6.1 |
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
| `accepted_at` | `TIMESTAMPTZ` | Req |  | SYS §6; SYS §5.2 BR-003 (timestamp); SYS §6.1 |

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
| `read_at` | `TIMESTAMPTZ` | Opt |  | SYS §6; SYS §5.1 FR-009 (mark as read); SYS §6.1 |

**Natural key:** None in the real world (an event); recipient_id + event_type + created_at identifies it in practice.

## EMAIL_DELIVERY

*One transactional email handed to the email provider, with its delivery outcome.* Owner: SYS. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `email_delivery_id` | `UUID` | Req | PK | SYS §6.1 |
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
| `segment_rule_id` | `UUID` | Req | PK | M1 §6 (rule_id — renamed, see 01 conflicts); M1 §6.1 |
| `q1_shoot_in_vn` | `BOOLEAN` | Req |  | M1 §6 (q1) = M1 §5.1 FR-002 q1_shoot_in_vn |
| `q2_release` | `ENUM(abroad, vietnam, both)` | Opt |  | M1 §6 (q2) = M1 §5.1 FR-002 |
| `q3_producer` | `ENUM(foreign, vietnamese, coproduction)` | Opt |  | M1 §6 (q3) = M1 §5.1 FR-002 |
| `result_segment` | `ENUM(A, B, C)` | not declared |  | M1 §6; type of segment from M1 §5.1 FR-002 |
| `version` | `VARCHAR(20)` | Req |  | M1 §6; M1 §6.1 |

**Natural key:** q1_shoot_in_vn + q2_release + q3_producer + version — the same answers always give the same segment (M1 BR-001).

## SEGMENT_REQUIREMENT

*One item a segment needs or does not need, used to configure the journey and the gauges.* Owner: M1. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `segment` | `ENUM(A, B, C)` | not declared | PK | M1 §6; type from M1 §5.1 FR-002 |
| `requirement_code` | `VARCHAR(40)` | Req | PK | M1 §6; M1 §6.1 |
| `label_vi` | `TEXT` | Req |  | M1 §6; M1 §6.1 |
| `label_en` | `TEXT` | Req |  | M1 §6; M1 §6.1 |
| `needed` | `BOOLEAN` | Req |  | M1 §6; M1 §3 US-1 (Needed / Not needed); M1 §6.1 |

**Natural key:** segment + requirement_code.

## SEGMENT_DECISION

*The segment given to a visitor or project from their answers, including any manual override.* Owner: M1. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `segment_decision_id` | `UUID` | Req | PK | M1 §6.1 |
| `project_id` | `UUID` | Opt | FK → `PROJECT` | M1 §6 ("belongs to Project (M0) once saved"); M1 §6.1 |
| `session_key` | `VARCHAR(40)` | Opt |  | M1 §6 (anonymous session before sign-up); M1 §6.1 |
| `segment_rule_id` | `UUID` | Opt | FK → `SEGMENT_RULE` | M1 §6 ("used by SegmentDecision"); M1 §6.1 |
| `q1_shoot_in_vn` | `BOOLEAN` | Req |  | M1 §5.1 FR-002 (answers) |
| `q2_release` | `ENUM(abroad, vietnam, both)` | Opt |  | M1 §5.1 FR-002 (Req when q1 = true) |
| `q3_producer` | `ENUM(foreign, vietnamese, coproduction)` | Opt |  | M1 §5.1 FR-002 (Req when q1 = true) |
| `q4_needs` | `ENUM(locations, crew, cast, equipment, logistics)[]` | Opt |  | M1 §5.1 FR-002; M1 §5.2 BR-002 |
| `segment` | `ENUM(A, B, C)` | system-set |  | M1 §5.1 FR-002 (OUT) |
| `segment_override` | `ENUM(A, B, C)` | Opt |  | M1 §5.1 FR-002; M1 §5.2 BR-003 — see Type conflicts |
| `decided_by` | `INTEGER[]` | system-set |  | M1 §5.1 FR-002 (OUT) |
| `journey_config` | `JSONB` | system-set |  | M1 §5.1 FR-002 (OUT) |

**Natural key:** None — the same answers may be given many times; a session key is not declared (open question).

## PROJECT

*A film or content production a producer is preparing to shoot in Vietnam.* Owner: M0. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `project_id` | `UUID` | system-set | PK | M0 §5.1 FR-001 (OUT) |
| `producer_org_id` | `UUID` | Req | FK → `PRODUCER_ORGANISATION` | M0 §6 ("belongs to ProducerOrganisation"); M0 §6.1 |
| `project_name` | `VARCHAR(200)` | Req |  | M0 §5.1 FR-001 |
| `format` | `ENUM(feature, documentary, commercial, tv, music_video)` | Req |  | M0 §5.1 FR-001 |
| `segment` | `ENUM(A, B, C)` | Req |  | M0 §5.1 FR-001; M1 §5.1 FR-003 |
| `shoot_date` | `DATE` | Opt |  | M0 §5.1 FR-001 (Opt), FR-002 (after today); M5 §5.1 FR-007 (Req) — see Type conflicts |
| `buffer_days` | `INTEGER` | Req |  | M5 §5.1 FR-007 (0 / 7 / 14 / 21); M2 §5.1 FR-017 (default 7) |
| `shoot_days_vn` | `INTEGER` | Opt |  | M0 §5.1 FR-001 |
| `crew_size_band` | `ENUM(u15, 15_50, o50)` | Opt |  | M0 §5.1 FR-001 |
| `logline` | `VARCHAR(500)` | Opt |  | M0 §5.1 FR-001 |
| `stage` | `ENUM(draft, preparing, archived)` | Opt |  | M0 §5.1 FR-002; M0 §6; M0 §5.2 BR-005 (archived, never deleted) |
| `updated_at` | `TIMESTAMPTZ` | system-set |  | M0 §5.1 FR-002 (OUT) |

**Natural key:** producer_org_id + project_name — proposed (open question).

## PROJECT_MEMBER

*A person's access to one project, with view or edit permission.* Owner: M0. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `member_id` | `UUID` | system-set | PK | M0 §5.1 FR-004 (OUT) |
| `project_id` | `UUID` | Req | FK → `PROJECT` | M0 §5.1 FR-004 |
| `user_id` | `UUID` | Opt | FK → `USER_ACCOUNT` | M0 §6 (user_id); M0 §6.1 |
| `invitee_email` | `VARCHAR(254)` | Req |  | M0 §5.1 FR-004 |
| `permission` | `ENUM(view, edit)` | Req |  | M0 §5.1 FR-004 (owner not in the set — see Structural findings) |
| `invite_status` | `ENUM(pending, accepted)` | system-set |  | M0 §5.1 FR-004 (OUT) |

**Natural key:** project_id + invitee_email (the invited address); project_id + user_id once accepted.

## PROJECT_PROVINCE

*A province a project plans to shoot in.* Owner: M0. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `project_id` | `UUID` | Req | PK, FK → `PROJECT` | M0 §6 |
| `province_id` | `INTEGER` | Opt | PK, FK → `PROVINCE` | M0 §5.1 FR-001 (provinces INTEGER[] Opt) |

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
| `topic` | `ENUM(security, history, religion, privacy, dossier, public_order, heritage)` | Req |  | M2 §5.1 FR-002 (Req), FR-001 (filter_topic) — FR-015 declares VARCHAR(60), see Type conflicts |
| `rule_slug` | `VARCHAR(120)` | Req | UK | M2 §5.1 FR-016 |
| `status` | `ENUM(draft, approved, retired)` | Opt |  | M2 §5.1 FR-001 (filter_status); M2 §6; M2 §5.2 BR-008 (retired, never deleted) |
| `approved_by` | `UUID` | Req | FK → `USER_ACCOUNT` | M2 §5.1 FR-003 (approver_id); M2 §5.2 BR-002 (CHECK) |
| `approved_at` | `TIMESTAMPTZ` | system-set |  | M2 §5.1 FR-003 (OUT) |
| `is_active` | `BOOLEAN` | system-set |  | M2 §5.1 FR-003 (OUT) |

**Natural key:** rule_code today; rule_code + rule_version once one text per version is kept, as M2 BR-008 now requires (OQ-04-24).

## RULE_SET_VERSION

*A numbered edition of the active rule set, created each time a rule is activated.* Owner: M2. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `rule_version` | `VARCHAR(20)` | system-set | PK | M2 §5.1 FR-004 (OUT) — see Type conflicts |
| `created_at` | `TIMESTAMPTZ` | Req |  | M2 §6; M2 §6.1 |
| `created_by` | `UUID` | Req | FK → `USER_ACCOUNT` | M2 §6; M2 §6.1 |

**Natural key:** rule_version.

## PRECHECK_RUN

*One 200-word content pre-check, kept as a demand data point.* Owner: M2. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `brief_id` | `UUID` | system-set | PK | M2 §5.1 FR-007 (OUT) |
| `project_id` | `UUID` | Opt | FK → `PROJECT` | M2 §6 ("may belong to a Project"); M2 §6.1 |
| `rule_version` | `VARCHAR(20)` | system-set | FK → `RULE_SET_VERSION` | M2 §6; M2 §5.2 BR-007 |
| `synopsis_hash` | `TEXT` | Req |  | M2 §5.1 FR-007 |
| `lang` | `ENUM(en, vi)` | Req |  | M2 §5.1 FR-005 (= locale ENUM(vi, en) in FR-007) |
| `flags` | `JSONB` | Opt |  | M2 §5.1 FR-005 |
| `country_guess` | `VARCHAR(2)` | Opt |  | M2 §5.1 FR-007 |
| `attention_level` | `ENUM(low, medium, high)` | system-set |  | M2 §5.1 FR-006 (OUT); M2 §5.2 BR-004 |
| `created_at` | `TIMESTAMPTZ` | Req |  | M2 §6; M2 §6.1 |

**Natural key:** None — the same summary may be checked many times (synopsis_hash + created_at in practice).

## PRECHECK_FINDING

*One passage of a pre-checked summary that matches an approved rule.* Owner: M2. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `brief_id` | `UUID` | Req | PK, FK → `PRECHECK_RUN` | M2 §6 ("belongs to PrecheckRun") |
| `rule_code` | `VARCHAR(40)` | system-set | PK, FK → `LEGAL_RULE` | M2 §5.1 FR-006 (OUT findings) |
| `span_start` | `INTEGER` | Req | PK | M2 §6; M2 §6.1 |
| `span_end` | `INTEGER` | Req |  | M2 §6; M2 §6.1 |
| `quoted_text` | `TEXT` | system-set |  | M2 §5.1 FR-006 (OUT) |
| `explanation_vi` | `TEXT` | system-set |  | M2 §5.1 FR-006 (OUT); M2 §6 (explanation) |
| `explanation_en` | `TEXT` | system-set |  | M2 §5.1 FR-006 (OUT) |

**Natural key:** brief_id + rule_code + span_start.

## COMPLIANCE_RUN

*One content check of a project against the active rule set.* Owner: M2. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `run_id` | `UUID` | Req | PK | M2 §6; M2 §6.1 |
| `project_id` | `UUID` | Req | FK → `PROJECT` | M2 §6; M2 §6.1 |
| `rule_version` | `VARCHAR(20)` | not declared | FK → `RULE_SET_VERSION` | M2 §6; M2 §5.2 BR-007 |
| `run_at` | `TIMESTAMPTZ` | Req |  | M2 §6; M2 §6.1 |

**Natural key:** project_id + run_at.

## COMPLIANCE_FINDING

*One finding of a project content check that a member can mark as reviewed.* Owner: M2. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `finding_id` | `UUID` | Req | PK | M2 §5.1 FR-014 |
| `run_id` | `UUID` | Req | FK → `COMPLIANCE_RUN` | M2 §6 ("belongs to ComplianceRun"); M2 §6.1 |
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
| `scene_types` | `ENUM(karst, river, village, rice_field, sea, floating_village, cave, jungle, old_town, market, rice_terrace, mountain, dunes, mangrove)[]` | Req |  | M3 §5.1 FR-002, FR-007 |
| `desc_vi` | `TEXT` | Req |  | M3 §5.1 FR-002 |
| `desc_en` | `TEXT` | Req |  | M3 §5.1 FR-002 |
| `crew_capacity` | `ENUM(u15, 15_50, o50)` | Req |  | M3 §5.1 FR-002 |
| `lodging_20km` | `BOOLEAN` | Req |  | M3 §5.1 FR-002 |
| `grid_power` | `BOOLEAN` | Req |  | M3 §5.1 FR-002 |
| `truck_access` | `BOOLEAN` | Req |  | M3 §5.1 FR-002 |
| `months_to_avoid` | `INTEGER[]` | Opt |  | M3 §5.1 FR-002 |
| `permit_complexity` | `ENUM(low, medium, high)` | Req |  | M3 §5.1 FR-002 |
| `restriction_note` | `TEXT` | Opt |  | M3 §5.1 FR-002 |
| `availability` | `ENUM(open, survey_in_progress, paused)` | Req |  | M3 §5.1 FR-002; M3 §5.2 BR-010 |
| `intake_status` | `ENUM(awaiting_contact, published, unpublished)` | system-set |  | M3 §5.1 FR-002 (OUT); M3 §6; M3 §5.2 BR-008 (unpublished, never deleted) |
| `published` | `BOOLEAN` | system-set |  | M3 §5.1 FR-005 (OUT); M3 §5.2 BR-004 |
| `blocked_reason` | `TEXT` | system-set |  | M3 §5.1 FR-005 (OUT) |

**Natural key:** name_vi + province_id — proposed; two sites may share a name in different provinces (open question).

## LOCATION_IMAGE

*A photo of a location with its source and usage right.* Owner: M3. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `image_url` | `TEXT` | system-set | PK | M3 §5.1 FR-003 (OUT) |
| `location_id` | `UUID` | Req | FK → `LOCATION` | M3 §6 ("belongs to Location"); M3 §6.1 |
| `image_source` | `TEXT` | Req |  | M3 §5.1 FR-003 |
| `usage_right` | `TEXT` | Req |  | M3 §5.1 FR-003 |
| `status` | `ENUM(pending, approved, hidden)` | system-set |  | M3 §5.1 FR-003 (OUT image_status); M10 §5.1 FR-002 (content_status) |

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
| `name` | `VARCHAR(80)` | Req | UK | M3 §6; M3 §6.1 |
| `slug` | `VARCHAR(80)` | Req | UK | M3 §5.1 FR-020 (province_slug) |
| `region` | `ENUM(north, central, south)` | not declared |  | M3 §6; type from M3 §5.1 FR-007 (region) |
| `merged_from` | `VARCHAR(80)[]` | Opt |  | M3 §6; M3 §5.2 BR-006; M3 §6.1 |

**Natural key:** name (one of the 34 units, M3 BR-006); slug.

## LOCATION_QUERY

*A scene description a user typed and the attributes extracted from it, stored without personal data.* Owner: M3. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `query_id` | `UUID` | system-set | PK | M3 §5.1 FR-011 (OUT) |
| `project_id` | `UUID` | Opt | FK → `PROJECT` | M3 §5.1 FR-011; M3 §6 ("may belong to Project") |
| `scene_description` | `TEXT` | Req |  | M3 §5.1 FR-010, FR-011 (10–1000 characters); M3 §6 description |
| `shoot_month` | `INTEGER` | Opt |  | M3 §5.1 FR-011 (1–12, FR-007); M3 §6 month |
| `attributes` | `JSONB` | system-set |  | M3 §5.1 FR-011 (OUT); M3 §5.2 BR-009 (no personal data) |

**Natural key:** None (an event).

## PROJECT_SHORTLIST

*A location a project has kept as its primary or backup choice.* Owner: M3. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `shortlist_id` | `UUID` | system-set | PK | M3 §5.1 FR-018 (OUT) |
| `project_id` | `UUID` | Req | FK → `PROJECT` | M3 §5.1 FR-018 |
| `location_id` | `UUID` | Req | FK → `LOCATION` | M3 §5.1 FR-018 (location_ids UUID[]) |
| `role` | `ENUM(primary, backup)` | Req |  | M3 §5.1 FR-018 |

**Natural key:** project_id + location_id.

## ORGANISATION

*A Vietnamese service company listed in the partner directory.* Owner: M4. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `org_id` | `UUID` | system-set | PK | M4 §5.1 FR-001 (OUT) |
| `slug` | `VARCHAR(160)` | system-set | UK | M4 §5.1 FR-001 (OUT) |
| `org_name` | `VARCHAR(200)` | Req |  | M4 §5.1 FR-001 |
| `legal_form` | `VARCHAR(60)` | Req |  | M4 §6; M4 §6.1 |
| `founded_year` | `INTEGER` | Opt |  | M4 §6; M4 §6.1 |
| `hq_province` | `INTEGER` | Opt | FK → `PROVINCE` | M4 §6 (a province — see Type conflicts); M4 §6.1 |
| `service_groups` | `ENUM(full_production, permits_paperwork, casting, crew, camera_lighting, studios_interiors, location_management, transport_logistics, lodging_catering, interpreting, insurance_legal, post_production)[]` | Req |  | M4 §5.1 FR-001; M4 §5.2 BR-002 (12 fixed values) |
| `provinces` | `INTEGER[]` | Req |  | M4 §5.1 FR-001 |
| `verified_at` | `TIMESTAMPTZ` | system-set |  | M4 §5.1 FR-010 (OUT) |
| `verified_until` | `DATE` | Opt |  | M4 §6; M4 §5.2 BR-004 (12 months); M4 §6.1 |
| `art13_eligible` | `BOOLEAN` | Req |  | M4 §6; M4 §6.1 |
| `org_status` | `ENUM(active, deactivated)` | Opt |  | M4 §5.1 FR-001; M4 §5.2 BR-008 (deactivated, never deleted) |

**Natural key:** org_name + hq_province — proposed; a business registration number is not declared (open question).

## ORGANISATION_MEMBER_LAYER

*The part of a partner profile visible to signed-in members.* Owner: M4. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `org_id` | `UUID` | Req | PK, FK → `ORGANISATION` | M4 §6 ("belongs to Organisation") |
| `capability_desc_vi` | `TEXT` | Opt |  | M4 §5.1 FR-001 (§6 capability_desc) |
| `capability_desc_en` | `TEXT` | Opt |  | M4 §5.1 FR-001 |
| `portfolio` | `VARCHAR(200)[]` | Opt |  | M4 §6; M4 §6.1 |
| `intl_project_count` | `INTEGER` | Req |  | M4 §6; M4 §6.1 |
| `working_languages` | `CHAR(2)[]` | Opt |  | M4 §5.1 FR-001; M4 §6 |

**Natural key:** org_id.

## ORGANISATION_PRIVATE_LAYER

*The part of a partner profile visible only after an accepted request and NDA.* Owner: M4. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `org_id` | `UUID` | Req | PK, FK → `ORGANISATION` | M4 §6 |
| `rate_card` | `JSONB` | Opt |  | M4 §5.1 FR-001 |
| `past_clients` | `TEXT[]` | Opt |  | M4 §5.1 FR-001 |
| `direct_contact` | `VARCHAR(200)` | Opt |  | M4 §6; M4 §6.1 |

**Natural key:** org_id.

## VERIFICATION_REQUEST

*A partner's application for the VFDA Verified badge and VFDA's decision on it.* Owner: M4. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `request_id` | `UUID` | system-set | PK | M4 §5.1 FR-008 (OUT verification_request_id) |
| `org_id` | `UUID` | Req | FK → `ORGANISATION` | M4 §5.1 FR-008 |
| `business_license` | `FILE` | Req |  | M4 §5.1 FR-008 (PDF max 25 MB) |
| `reference_projects` | `TEXT[]` | Req |  | M4 §5.1 FR-008 (≥ 2) |
| `status` | `ENUM(pending, approved, rejected)` | Opt |  | M4 §5.1 FR-009, FR-010 |
| `decided_by` | `UUID` | Opt | FK → `USER_ACCOUNT` | M4 §6; M4 §6.1 |
| `reason` | `TEXT` | Opt |  | M4 §5.1 FR-010 (required when rejected) |

**Natural key:** org_id + submission time (not declared).

## COLLAB_REQUEST

*A producer's request to a partner to work on one project, followed to confirmation.* Owner: M4. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `request_id` | `UUID` | system-set | PK | M4 §5.1 FR-012 (OUT) |
| `project_id` | `UUID` | Req | FK → `PROJECT` | M4 §5.1 FR-012 |
| `org_id` | `UUID` | Req | FK → `ORGANISATION` | M4 §5.1 FR-012 |
| `services` | `ENUM[]` | Req |  | M4 §5.1 FR-012 |
| `note` | `TEXT` | Opt |  | M4 §5.1 FR-012 (max 1000 characters) |
| `status` | `ENUM(pending, under_review, info_requested, accepted, declined, confirmed, withdrawn)` | system-set |  | M4 §5.1 FR-012 (pending), FR-014; M4 §5.2 BR-005 |
| `response_note` | `TEXT` | Opt |  | M4 §5.1 FR-014 |
| `sent_at` | `TIMESTAMPTZ` | Req |  | M4 §6; M4 §6.1 |
| `responded_at` | `TIMESTAMPTZ` | system-set |  | M4 §5.1 FR-014 (OUT) |
| `confirmed_at` | `TIMESTAMPTZ` | Opt |  | M4 §6; M4 §6.1 |

**Natural key:** project_id + org_id while the request is open (M4 §3 Edge cases: a second open request is refused).

## COLLAB_MESSAGE

*A message written inside a collaboration request, including every response note; never edited once sent.* Owner: M4. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `message_id` | `UUID` | system-set | PK | M4 §5.1 FR-014 (OUT) |
| `request_id` | `UUID` | Req | FK → `COLLAB_REQUEST` | M4 §5.1 FR-014; M4 §6 |
| `author_id` | `UUID` | Req | FK → `USER_ACCOUNT` | M4 §6; M4 §6.1 |
| `created_at` | `TIMESTAMPTZ` | Req |  | M4 §6; M4 §6.1 |
| `body` | `TEXT` | not declared |  | M4 §6; type of response_note, M4 §5.1 FR-014; M4 §5.2 BR-009 (never edited) |

**Natural key:** request_id + author_id + created_at (message_id is the declared key, M4 FR-014).

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
| `segments` | `ENUM(A, B, C)[]` | Req |  | M5 §6; M5 §6.1 |

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
| `file_path` | `TEXT` | Req |  | M5 §6 (FR-002 declares file BYTEA — see Type conflicts); M5 §6.1 |
| `version` | `INTEGER` | Req |  | M5 §6; M5 §5.1 FR-002 (previous versions kept); M5 §6.1 |
| `uploaded_by` | `UUID` | Req | FK → `USER_ACCOUNT` | M5 §6; M5 §6.1 |
| `uploaded_at` | `TIMESTAMPTZ` | Req |  | M5 §6; M5 §6.1 |

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

*A project's agreed translation of one term, applied to every later draft of that project.* Owner: M5. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `project_id` | `UUID` | Req | PK, FK → `PROJECT` | M5 §6; M5 §5.2 BR-006; M5 §6.1 |
| `term_en` | `VARCHAR(120)` | not declared | PK | M5 §5.1 FR-004 (glossary Opt); M5 §6 source_term |
| `term_vi` | `VARCHAR(120)` | not declared |  | M5 §5.1 FR-004 (glossary Opt); M5 §6 target_term |

**Natural key:** project_id + term_en.

## PUBLIC_HOLIDAY

*A public holiday period shown on the licensing timeline, official or expected.* Owner: M5. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `name` | `VARCHAR(120)` | Req | PK | M5 §6; M5 §6.1 |
| `start_date` | `DATE` | Req | PK | M5 §6; M5 §6.1 |
| `end_date` | `DATE` | Req |  | M5 §6; M5 §6.1 |
| `is_expected` | `BOOLEAN` | Req |  | M5 §6; M5 §3 US-3 (band marked *expected*); M5 §6.1 |

**Natural key:** name + start_date.

## LOCATION_INTEREST

*A member's statement that a project is interested in a location.* Owner: M7. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `interest_id` | `UUID` | system-set | PK | M7 §5.1 FR-001 (OUT) |
| `project_id` | `UUID` | Req | FK → `PROJECT` | M7 §5.1 FR-001 |
| `location_id` | `UUID` | Req | FK → `LOCATION` | M7 §5.1 FR-001 |
| `created_at` | `TIMESTAMPTZ` | Req |  | M7 §6; M7 §6.1 |

**Natural key:** project_id + location_id — proposed (open question: may a project declare interest twice?).

## PROVINCE_NOTICE

*The notice VFDA sends a province about a project's interest, and the province's reply.* Owner: M7. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `interest_id` | `UUID` | Req | PK, FK → `LOCATION_INTEREST` | M7 §5.1 FR-002; M7 §6 |
| `province_id` | `INTEGER` | Req | FK → `PROVINCE` | M7 §6 (derivable from the location — see Structural findings); M7 §6.1 |
| `project_summary` | `TEXT` | Req |  | M7 §5.1 FR-002 |
| `authority_email` | `VARCHAR(254)` | Req |  | M7 §5.1 FR-002 (copied from AUTHORITY_CONTACT) |
| `drafted_at` | `TIMESTAMPTZ` | Req |  | M7 §6; M7 §6.1 |
| `reviewed_by` | `UUID` | Req | FK → `USER_ACCOUNT` | M7 §5.1 FR-002 |
| `sent_at` | `TIMESTAMPTZ` | Opt |  | M7 §6; M7 §6.1 |
| `delivery_status` | `ENUM(queued, sent, bounced)` | system-set |  | M7 §5.1 FR-002 (OUT) |
| `received_at` | `TIMESTAMPTZ` | Opt |  | M7 §6; M7 §6.1 |
| `response` | `ENUM(received, info_needed, cannot_support)` | Req |  | M7 §5.1 FR-003; M7 §5.2 BR-003 |
| `note` | `TEXT` | Opt |  | M7 §5.1 FR-003 |
| `responded_at` | `TIMESTAMPTZ` | system-set |  | M7 §5.1 FR-003 (OUT) |

**Natural key:** interest_id (one notice per interest).

## CONSULTATION_BOOKING

*A member's booked consultation slot with a VFDA officer.* Owner: M7. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `booking_id` | `UUID` | system-set | PK | M7 §5.1 FR-005 (OUT) |
| `member_id` | `UUID` | Req | FK → `USER_ACCOUNT` | M7 §6; M7 §6.1 |
| `topic` | `ENUM(dossier, locations, partners, provincial_notice, general)` | Req |  | M7 §5.1 FR-005 |
| `slot_start` | `TIMESTAMPTZ` | Req |  | M7 §5.1 FR-005 |
| `timezone` | `VARCHAR(40)` | Req |  | M7 §5.1 FR-005 (IANA) |
| `officer_id` | `UUID` | Req | FK → `USER_ACCOUNT` | M7 §5.1 FR-006 |
| `booking_status` | `ENUM(confirmed, rescheduled)` | system-set |  | M7 §5.1 FR-006 (OUT) |

**Natural key:** member_id + slot_start.

## MODERATION_ITEM

*A partner's published content (profile text or location photo) waiting for, or carrying, VFDA staff's approve-or-hide decision.* Owner: M10. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `content_id` | `UUID` | Req | PK | M10 §5.1 FR-002; FR-001 (OUT moderation_queue) |
| `content_type` | `ENUM(org_profile, location_image, showcase)` | system-set |  | M10 §5.1 FR-001; M10 §9 (showcase waits for M8, phase 2) |
| `organisation_id` | `UUID` | Opt (CHECK) | FK → `ORGANISATION` | M10 §6 ("refers to Organisation"); type of org_id, M4 §5.1 FR-001 — CHECK: exactly one of organisation_id, location_image_id (modelling choice) |
| `location_image_id` | `TEXT` | Opt (CHECK) | FK → `LOCATION_IMAGE` | M10 §6 ("or LocationImage"); holds image_url, the only key of LOCATION_IMAGE (M3 §5.1 FR-003) — CHECK: exactly one of the two (modelling choice) |
| `submitted_by` | `UUID` | system-set | FK → `USER_ACCOUNT` | M10 §5.1 FR-001 (OUT) |
| `submitted_at` | `TIMESTAMPTZ` | system-set |  | M10 §5.1 FR-001 (OUT) |
| `content_status` | `ENUM(pending, approved, hidden)` | system-set |  | M10 §5.1 FR-002 (OUT); M10 §5.2 BR-001 |
| `reason` | `TEXT` | Opt |  | M10 §5.1 FR-002; M10 §5.2 BR-002 (required when hidden) |
| `decided_by` | `UUID` | Opt | FK → `USER_ACCOUNT` | M10 §6; M10 §6.1 |
| `decided_at` | `TIMESTAMPTZ` | Opt |  | M10 §6; M10 §6.1 |

**Natural key:** organisation_id or location_image_id + submitted_at; one pending item per content (M10 §3 Edge cases: the queue keeps only the latest version).

## AUDIT_LOG

*A permanent record of one administrative action: who did what to which record, and when.* Owner: M10. EVENT.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `audit_log_id` | `UUID` | system-set | PK | M10 §5.1 FR-008 (OUT) |
| `action` | `VARCHAR(60)` | Req |  | M10 §5.1 FR-008; M10 §3 US-4 (location.publish) |
| `admin_id` | `UUID` | Req | FK → `USER_ACCOUNT` | M10 §5.1 FR-008 (= actor_id in FR-009) |
| `target_id` | `UUID` | Opt |  | M10 §5.1 FR-008 (any table — no foreign key, see Structural findings) |
| `logged_at` | `TIMESTAMPTZ` | system-set |  | M10 §5.1 FR-008 (OUT); M10 §5.2 BR-005 (append-only) |

**Natural key:** None (append-only event, M10 BR-005); admin_id + action + target_id + logged_at in practice.

## QUARTERLY_REPORT

*A quarterly demand report with its bilingual commentary, reread by a staff member before it is exported.* Owner: M10. THING.

| Column | Type (as declared) | Required | Key | Citation |
|---|---|---|---|---|
| `report_id` | `UUID` | Req | PK | M10 §5.1 FR-007 |
| `period_start` | `DATE` | Req |  | M10 §6 (period) = M10 §5.1 FR-003 period_start |
| `period_end` | `DATE` | Req |  | M10 §6 (period) = M10 §5.1 FR-003 period_end |
| `demand_index` | `JSONB` | Req |  | M10 §5.1 FR-007 (the indicators the report was drafted from) |
| `narrative_vi` | `TEXT` | Req |  | M10 §5.1 FR-006 (OUT), FR-007 |
| `narrative_en` | `TEXT` | system-set |  | M10 §5.1 FR-006 (OUT) |
| `reread_by` | `UUID` | Req | FK → `USER_ACCOUNT` | M10 §5.1 FR-007; M10 §5.2 BR-004 |
| `report_pdf_url` | `TEXT` | system-set |  | M10 §5.1 FR-007 (OUT) |
| `exported_at` | `TIMESTAMPTZ` | Opt |  | M10 §6; M10 §6.1 |

**Natural key:** period_start + period_end.

## Type conflicts

| Field | Source A (type / required) | Source B (type / required) | Decision |
|---|---|---|---|
| rule set version | M2 §5.1 FR-002: version INTEGER (OUT) | M2 §5.1 FR-004: rule_version VARCHAR(20) (OUT); M2 §3 US-1 "2026.08" | VARCHAR(20), e.g. `2026.08` (FR-004 and US-1 win; FR-002's INTEGER is a slip). |
| PROJECT.shoot_date | M0 §5.1 FR-001: DATE Opt | M5 §5.1 FR-007 and M2 §5.1 FR-017: DATE Req | Optional in storage; required by the functions that need it (M5 FR-007, M2 FR-017). |
| segment_override | M1 §5.1 FR-002: ENUM(A, B, C) Opt | M1 §3 US-2: `segment_override = true` (boolean) | ENUM(A, B, C): the segment chosen by the override. |
| PRECHECK_RUN.lang | M2 §5.1 FR-005: lang ENUM(en, vi) Req | M2 §5.1 FR-007: locale ENUM(vi, en) Req | `lang ENUM(en, vi)` (the F-M2-05 input). |
| PROFILE.locale | SYS §6: attribute of Profile | SYS §5.1 FR-005: "stored in cookie `locale`" | Column on PROFILE for members; cookie only for guests. |
| DOCUMENT file | M5 §5.1 FR-002: file BYTEA Req | M5 §6: file_path (in private storage) | `file_path TEXT` (M5 §6.1): the file stays in private storage. |
| ORGANISATION.hq_province | M4 §6: hq_province (no type) | M3 §5.1 FR-002: province identifiers are INTEGER | INTEGER province_id (M4 §6.1), foreign key to PROVINCE. |
| working_languages | M4 §5.1 FR-001: CHAR(2)[] Opt on the profile input | M4 §6: attribute of OrganisationMemberLayer; M4 §5.1 FR-006 filter working_language CHAR(2) | On ORGANISATION_MEMBER_LAYER as CHAR(2)[]; FR-006 filters on it. |
| BILINGUAL_PARAGRAPH.reviewed_by | M5 §5.1 FR-006: reviewer_id UUID Req | M5 §5.1 FR-004: paragraphs start as `machine` with no reviewer (must be Opt in storage) | Optional in storage (machine paragraphs have no reviewer); required by F-M5-06. |
| LEGAL_RULE.approved_by | M2 §5.1 FR-003: approver_id UUID Req | M2 §3 US-3: a draft rule exists without an approver (must be Opt in storage) | Optional in storage; CHECK `ck_legal_rule_approved_needs_signature` requires it when status = approved (M2 BR-002). |
| LEGAL_RULE.citation | M2 §5.1 FR-002: citation VARCHAR(200) Req | M2 §3 US-3: a draft rule exists without a citation; M2 §5.2 BR-002 enforces it only for activation | Optional in storage; same CHECK requires it when status = approved (M2 BR-002). |
| CONSULTATION_BOOKING.officer_id | M7 §5.1 FR-006: officer_id UUID Req | M7 §5.1 FR-005: the booking exists before an officer is assigned (must be Opt in storage) | Optional in storage until F-M7-06 assigns an officer. |
| PROVINCE_NOTICE.reviewed_by / response | M7 §5.1 FR-002 reviewed_by Req; FR-003 response Req | M7 §3 US-1: notice drafted before any review or reply (must be Opt in storage) | Optional in storage until VFDA reviews and the province replies. |
| LEGAL_RULE.topic | M2 §5.1 FR-002: topic ENUM(security, history, religion, privacy, dossier, public_order, heritage) Req; FR-001 filter_topic ENUM | M2 §5.1 FR-015: topic VARCHAR(60) Opt (public filter) | ENUM(security, history, religion, privacy, dossier, public_order, heritage); the public filter (FR-015) takes the same set. |
| QUARTERLY_REPORT.reread_by | M10 §5.1 FR-007: reread_by UUID Req | M10 §3 US-3: a draft exists before anyone rereads it (must be Opt in storage) | Optional in storage; CHECK `ck_quarterly_report_reread_before_export` requires it before exported_at (M10 BR-004). |

## Structural findings

Reported only — nothing was fixed in the model.

| Check | Entity / column | What the spec does not settle | Raised as |
|---|---|---|---|
| (i) freeze | PROVINCE_NOTICE.authority_email ← AUTHORITY_CONTACT.contact_email | Contacts are re-verified and may change (M3 BR-004). No rule says the notice keeps the address it was sent to. | OQ-04-1 |
| (i) freeze | PROVINCE_NOTICE.project_summary ← PROJECT | Project name, dates and logline can be edited after the notice is sent (M0 FR-002). No rule says the summary is frozen. | OQ-04-2 |
| (i) freeze | PRECHECK_FINDING / COMPLIANCE_FINDING → LEGAL_RULE (rule_code) | Settled by M2 BR-008: a finding keeps showing the text of the rule version it cited (versions stored per check, BR-007). The model still keys LEGAL_RULE by rule_code alone, so it cannot yet hold two texts of one rule. | OQ-04-3 (resolved); OQ-04-24 |
| (i) freeze | SEGMENT_DECISION → SEGMENT_RULE | SEGMENT_RULE has a version; the decision does not store which version decided it. | OQ-04-4 |
| (i) freeze | BILINGUAL_DOCUMENT.project_meta ← PROJECT | A copy of project data is stored with the draft; no rule says whether it refreshes when the project changes. | OQ-04-5 |
| (i) freeze | NDA_ACCEPTANCE.nda_version; CONSENT.consent_version; READINESS_SNAPSHOT.readiness_total | Settled: versions and snapshots are stored at the time (M4 FR-017, SYS BR-003, M0 FR-008). | — |
| (i) freeze | QUARTERLY_REPORT.demand_index ← DEMAND_INDEX | Settled: the report keeps the indicators it was drafted from (M10 FR-007), so a reread report does not change when platform data changes. | — |
| (i) freeze | MODERATION_ITEM → submitted content | The last approved text stays public while the new one waits (M10 BR-001), but no column holds the waiting version. | OQ-04-20 |
| (i) freeze | COLLAB_REQUEST → ORGANISATION verified badge | Settled: the request continues if the badge expires (M4 §3 Edge cases). | — |
| (ii) delete | USER_ACCOUNT (in 19 relationships) | Settled by SYS BR-005: never hard-deleted. Deleting an account sets `account_status = deactivated` at once and replaces name and email with anonymous values within 30 days; projects, uploads, access logs and approvals stay and show *Former member*. | OQ-04-6 (resolved) |
| (ii) delete | PROJECT (in 14 relationships) | Settled by M0 BR-005: archived, never deleted (`stage = archived`); read-only, leaves the project list, keeps documents, requests and notices. | OQ-04-7 (resolved) |
| (ii) delete | LOCATION (shortlists, interests, notices) | Settled by M3 BR-008: unpublished, never deleted (`intake_status = unpublished`); shortlists and notices keep it and show *No longer published*. | OQ-04-8 (resolved) |
| (ii) delete | ORGANISATION (requests, proofread paragraphs, moderation items) | Settled by M4 BR-008: deactivated, never deleted (`org_status = deactivated`); open requests are closed as `withdrawn` and the producer is notified; the access log is kept. | OQ-04-9 (resolved) |
| (ii) delete | LEGAL_RULE (findings cite it) | Settled by M2 BR-008: retired, never deleted (`status = retired`). | OQ-04-3 (resolved) |
| (ii) delete | DOCUMENT, DOCUMENT_ACCESS_LOG, SEGMENT_DECISION, AUDIT_LOG data | Settled: previous versions kept (M5 FR-002); access log append-only (M4 BR-007); segment change never deletes (M1 BR-004); audit log append-only for every role (M10 BR-005). | — |
| (iii) enum | PROJECT_MEMBER.permission | F-M0-01 makes the creator the *owner*, but `owner` is not in ENUM(view, edit); F-M0-04 is "owner only". | OQ-04-10 |
| (iii) enum | PROJECT_MEMBER.invite_status | No function moves an invitation from `pending` to `accepted` (M0 US-3 says "after accepting"). | OQ-04-10 |
| (iii) enum | LEGAL_RULE.status | F-M2-03 moves draft → approved; `retired` is declared (M2 FR-001, BR-008) but no function's input sets it. | OQ-04-23 |
| (iii) enum | DOCUMENT_SLOT.state | No function writes `needs_fix` or `pending`; they are described as rule outcomes (M2 US-2, M4 US-2). Stored or derived? | OQ-04-11 |
| (iii) enum | BILINGUAL_PARAGRAPH.status | reviewed → machine happens "when anyone edits it" (M5 US-2), but no function edits a paragraph. | OQ-04-12 |
| (iii) enum | CONSULTATION_BOOKING.booking_status | F-M7-05 creates a booking with no status; values only confirmed / rescheduled — no initial or cancelled value. | OQ-04-13 |
| (iii) enum | COLLAB_REQUEST.status | An unanswered request may expire after N days (M4 §3 Edge cases), but `expired` is not in the set. | OQ-04-14 |
| (iii) enum | PROJECT.stage; LOCATION.intake_status; LOCATION_IMAGE.status; CONSULTATION_BOOKING.topic; service_groups; scene_types; PROVINCE.region; LEGAL_RULE.topic | Settled: value sets are declared in §5.1 (M0 FR-002; M3 FR-002, FR-003, FR-007; M7 FR-005; M4 FR-001; M2 FR-001, FR-002). LOCATION_IMAGE.status uses pending / approved / hidden in both M3 FR-003 and M10 FR-002. | OQ-04-15 (resolved) |
| (iii) enum | MODERATION_ITEM.content_type | `showcase` is declared but unused until M8 (phase 2, M10 §9) — consistent. | — |
| (iii) enum | VERIFICATION_REQUEST.status | Initial `pending` is implied, not stated by F-M4-08; badge expiry is kept on ORGANISATION, so no `expired` request state — consistent. | — |
| polymorphic | MODERATION_ITEM.organisation_id / location_image_id | Deliberate modelling choice: M10 §6 says an item "refers to Organisation or LocationImage". Instead of one polymorphic content reference, two nullable foreign keys with a CHECK that exactly one is set (and that it matches content_type), so the database enforces both references. The phase-2 type `showcase` will need a third column. | — (modelling choice) |
| polymorphic | AUDIT_LOG.target_id | Points at a row of any table, so it carries no foreign key (by design, M10 FR-008). Targets whose key is not a UUID (LOCATION_IMAGE image_url, RULE_SET_VERSION rule_version, DOCUMENT_TYPE doc_code) cannot be recorded in a UUID column. | OQ-04-25 |
| writer | MODERATION_ITEM (content_type location_image) | M10 moderates location photos submitted by partners (M10 §1), but the only photo function, F-M3-03, is for VFDA staff; no function lets a partner submit a photo. | OQ-04-22 |
| period | PROJECT; LOCATION_QUERY (period filter of DEMAND_INDEX) | The indicators are filtered by month, quarter or year (M10 FR-003, FR-005), but neither PROJECT nor LOCATION_QUERY declares when it was created. | OQ-04-21 |
| minimality | PROVINCE_NOTICE.province_id | Kept as a deliberate exception: it records the province the notice was *addressed* to, which must not change if the location's province is later merged (M3 BR-006). Upkeep rule: set once from LOCATION_INTEREST → LOCATION.province_id when the notice is drafted, never updated (M7 §6.1). | OQ-04-16 (resolved) |
| minimality | LEGAL_RULE.is_active vs status | Kept as a deliberate exception: the pre-check reads active rules on every call. Upkeep rule: is_active = (status = approved), enforced by CHECK `ck_legal_rule_active_matches_status`. | OQ-04-16 (resolved) |
| minimality | BILINGUAL_DOCUMENT.watermark | Dropped 01/10/2026: always true (M5 FR-005) — the PDF renderer stamps every page (M5 BR-001); nothing to store. | OQ-04-16 (resolved) |
| polymorphic | SEGMENT_DECISION.project_id / session_key | Resolved 01/10/2026: the single column `session_or_project_id` (two meanings, no possible foreign key) is split into `project_id` (FK → PROJECT) and `session_key`, with a CHECK that exactly one is set (M1 §6.1). | — |
| 1NF | ORGANISATION.service_groups, provinces; LOCATION.scene_types, months_to_avoid; SEGMENT_DECISION.q4_needs | Arrays as declared; filtering and counting on them is exactly the use (M3 FR-007, M4 FR-005/006). Implied entities in 01. | 01 OQ 3 |

## Diagram

The relationship lines are byte-for-byte the lines of `03-erd.mmd`; only attribute blocks are added. Generic types only (`string int decimal date datetime boolean enum uuid`). `ARRAY`, `JSONB`, `FILE` and undeclared types are drawn as `string` and named in the comment — the table above keeps the declared type.

```mermaid
erDiagram
    USER_ACCOUNT ||--|| PROFILE : "has"
    PRODUCER_ORGANISATION |o..o{ PROFILE : "employs"
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
    ORGANISATION |o..o{ MODERATION_ITEM : "is reviewed through"
    LOCATION_IMAGE |o..o{ MODERATION_ITEM : "is reviewed through"
    USER_ACCOUNT ||..o{ MODERATION_ITEM : "submits"
    USER_ACCOUNT |o..o{ MODERATION_ITEM : "decides on"
    USER_ACCOUNT ||..o{ AUDIT_LOG : "writes"
    USER_ACCOUNT |o..o{ QUARTERLY_REPORT : "rereads"
    SEGMENT_REQUIREMENT
    PUBLIC_HOLIDAY
    USER_ACCOUNT {
        uuid user_id PK "SYS s5.1 FR-001 (OUT)"
        string email UK "SYS s5.1 FR-001; SYS s3 US-1 (one account per email)"
        boolean email_verified "SYS s5.1 FR-001 (OUT)"
        enum role "SYS s5.1 FR-004; SYS s5.2 BR-002 (new account = member)"
        enum account_status "SYS s5.1 FR-004; SYS s5.2 BR-005 (deactivated and anonymised, never hard-deleted)"
        datetime created_at "SYS s6; SYS s6.1"
    }
    PROFILE {
        uuid user_id PK,FK "SYS s6 ('belongs to UserAccount')"
        string full_name "SYS s5.1 FR-001"
        enum crew_role "SYS s5.1 FR-001"
        enum locale "SYS s5.1 FR-005 (also said to live in a cookie - see Type conflicts)"
        uuid producer_org_id FK "SYS s6; SYS s6.1"
    }
    PRODUCER_ORGANISATION {
        uuid producer_org_id PK "SYS s6 (Profile.producer_org_id); SYS s6.1"
        string org_name "SYS s5.1 FR-001"
        string country "SYS s5.1 FR-001"
        string website "SYS s5.1 FR-001"
    }
    CONSENT {
        uuid user_id PK,FK "SYS s6"
        string consent_version PK "SYS s5.1 FR-001; SYS s5.2 BR-003"
        datetime accepted_at "SYS s6; SYS s5.2 BR-003 (timestamp); SYS s6.1"
    }
    NOTIFICATION {
        uuid notification_id PK "SYS s5.1 FR-007 (OUT)"
        uuid recipient_id FK "SYS s5.1 FR-007"
        string event_type "SYS s5.1 FR-007"
        string payload "declared JSONB - SYS s5.1 FR-007"
        datetime created_at "SYS s5.1 FR-007 (OUT)"
        datetime read_at "SYS s6; SYS s5.1 FR-009 (mark as read); SYS s6.1"
    }
    EMAIL_DELIVERY {
        uuid email_delivery_id PK "SYS s6.1"
        uuid notification_id FK "SYS s6 ('may relate to a Notification')"
        string template_id "SYS s5.1 FR-008"
        string recipient_email "SYS s5.1 FR-008"
        string variables "declared JSONB - SYS s5.1 FR-008"
        enum delivery_status "SYS s5.1 FR-008 (OUT)"
        string provider_message_id UK "SYS s5.1 FR-008 (OUT)"
    }
    SEGMENT_RULE {
        uuid segment_rule_id PK "M1 s6 (rule_id - renamed, see 01 conflicts); M1 s6.1"
        boolean q1_shoot_in_vn "M1 s6 (q1) = M1 s5.1 FR-002 q1_shoot_in_vn"
        enum q2_release "M1 s6 (q2) = M1 s5.1 FR-002"
        enum q3_producer "M1 s6 (q3) = M1 s5.1 FR-002"
        enum result_segment "M1 s6; type of segment from M1 s5.1 FR-002"
        string version "M1 s6; M1 s6.1"
    }
    SEGMENT_REQUIREMENT {
        enum segment PK "M1 s6; type from M1 s5.1 FR-002"
        string requirement_code PK "M1 s6; M1 s6.1"
        string label_vi "M1 s6; M1 s6.1"
        string label_en "M1 s6; M1 s6.1"
        boolean needed "M1 s6; M1 s3 US-1 (Needed / Not needed); M1 s6.1"
    }
    SEGMENT_DECISION {
        uuid segment_decision_id PK "M1 s6.1"
        uuid project_id FK "M1 s6 ('belongs to Project (M0) once saved'); M1 s6.1"
        string session_key "M1 s6 (anonymous session before sign-up); M1 s6.1"
        uuid segment_rule_id FK "M1 s6 ('used by SegmentDecision'); M1 s6.1"
        boolean q1_shoot_in_vn "M1 s5.1 FR-002 (answers)"
        enum q2_release "M1 s5.1 FR-002 (Req when q1 = true)"
        enum q3_producer "M1 s5.1 FR-002 (Req when q1 = true)"
        string q4_needs "declared ENUM(locations, crew, cast, equipment, logistics)[] - M1 s5.1 FR-002; M1 s5.2 BR-002"
        enum segment "M1 s5.1 FR-002 (OUT)"
        enum segment_override "M1 s5.1 FR-002; M1 s5.2 BR-003 - see Type conflicts"
        string decided_by "declared INTEGER[] - M1 s5.1 FR-002 (OUT)"
        string journey_config "declared JSONB - M1 s5.1 FR-002 (OUT)"
    }
    PROJECT {
        uuid project_id PK "M0 s5.1 FR-001 (OUT)"
        uuid producer_org_id FK "M0 s6 ('belongs to ProducerOrganisation'); M0 s6.1"
        string project_name "M0 s5.1 FR-001"
        enum format "M0 s5.1 FR-001"
        enum segment "M0 s5.1 FR-001; M1 s5.1 FR-003"
        date shoot_date "M0 s5.1 FR-001 (Opt), FR-002 (after today); M5 s5.1 FR-007 (Req) - see Type conflicts"
        int buffer_days "M5 s5.1 FR-007 (0 / 7 / 14 / 21); M2 s5.1 FR-017 (default 7)"
        int shoot_days_vn "M0 s5.1 FR-001"
        enum crew_size_band "M0 s5.1 FR-001"
        string logline "M0 s5.1 FR-001"
        enum stage "M0 s5.1 FR-002; M0 s6; M0 s5.2 BR-005 (archived, never deleted)"
        datetime updated_at "M0 s5.1 FR-002 (OUT)"
    }
    PROJECT_MEMBER {
        uuid member_id PK "M0 s5.1 FR-004 (OUT)"
        uuid project_id FK "M0 s5.1 FR-004"
        uuid user_id FK "M0 s6 (user_id); M0 s6.1"
        string invitee_email "M0 s5.1 FR-004"
        enum permission "M0 s5.1 FR-004 (owner not in the set - see Structural findings)"
        enum invite_status "M0 s5.1 FR-004 (OUT)"
    }
    PROJECT_PROVINCE {
        uuid project_id PK,FK "M0 s6"
        int province_id PK,FK "M0 s5.1 FR-001 (provinces INTEGER[] Opt)"
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
        enum topic "M2 s5.1 FR-002 (Req), FR-001 (filter_topic) - FR-015 declares VARCHAR(60), see Type conflicts"
        string rule_slug UK "M2 s5.1 FR-016"
        enum status "M2 s5.1 FR-001 (filter_status); M2 s6; M2 s5.2 BR-008 (retired, never deleted)"
        uuid approved_by FK "M2 s5.1 FR-003 (approver_id); M2 s5.2 BR-002 (CHECK)"
        datetime approved_at "M2 s5.1 FR-003 (OUT)"
        boolean is_active "M2 s5.1 FR-003 (OUT)"
    }
    RULE_SET_VERSION {
        string rule_version PK "M2 s5.1 FR-004 (OUT) - see Type conflicts"
        datetime created_at "M2 s6; M2 s6.1"
        uuid created_by FK "M2 s6; M2 s6.1"
    }
    PRECHECK_RUN {
        uuid brief_id PK "M2 s5.1 FR-007 (OUT)"
        uuid project_id FK "M2 s6 ('may belong to a Project'); M2 s6.1"
        string rule_version FK "M2 s6; M2 s5.2 BR-007"
        string synopsis_hash "M2 s5.1 FR-007"
        enum lang "M2 s5.1 FR-005 (= locale ENUM(vi, en) in FR-007)"
        string flags "declared JSONB - M2 s5.1 FR-005"
        string country_guess "M2 s5.1 FR-007"
        enum attention_level "M2 s5.1 FR-006 (OUT); M2 s5.2 BR-004"
        datetime created_at "M2 s6; M2 s6.1"
    }
    PRECHECK_FINDING {
        uuid brief_id PK,FK "M2 s6 ('belongs to PrecheckRun')"
        string rule_code PK,FK "M2 s5.1 FR-006 (OUT findings)"
        int span_start PK "M2 s6; M2 s6.1"
        int span_end "M2 s6; M2 s6.1"
        string quoted_text "M2 s5.1 FR-006 (OUT)"
        string explanation_vi "M2 s5.1 FR-006 (OUT); M2 s6 (explanation)"
        string explanation_en "M2 s5.1 FR-006 (OUT)"
    }
    COMPLIANCE_RUN {
        uuid run_id PK "M2 s6; M2 s6.1"
        uuid project_id FK "M2 s6; M2 s6.1"
        string rule_version FK "M2 s6; M2 s5.2 BR-007"
        datetime run_at "M2 s6; M2 s6.1"
    }
    COMPLIANCE_FINDING {
        uuid finding_id PK "M2 s5.1 FR-014"
        uuid run_id FK "M2 s6 ('belongs to ComplianceRun'); M2 s6.1"
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
        string scene_types "declared ENUM(karst, river, village, rice_field, sea, floating_village, cave, jungle, old_town, market, rice_terrace, mountain, dunes, mangrove)[]"
        string desc_vi "M3 s5.1 FR-002"
        string desc_en "M3 s5.1 FR-002"
        enum crew_capacity "M3 s5.1 FR-002"
        boolean lodging_20km "M3 s5.1 FR-002"
        boolean grid_power "M3 s5.1 FR-002"
        boolean truck_access "M3 s5.1 FR-002"
        string months_to_avoid "declared INTEGER[] - M3 s5.1 FR-002"
        enum permit_complexity "M3 s5.1 FR-002"
        string restriction_note "M3 s5.1 FR-002"
        enum availability "M3 s5.1 FR-002; M3 s5.2 BR-010"
        enum intake_status "M3 s5.1 FR-002 (OUT); M3 s6; M3 s5.2 BR-008 (unpublished, never deleted)"
        boolean published "M3 s5.1 FR-005 (OUT); M3 s5.2 BR-004"
        string blocked_reason "M3 s5.1 FR-005 (OUT)"
    }
    LOCATION_IMAGE {
        string image_url PK "M3 s5.1 FR-003 (OUT)"
        uuid location_id FK "M3 s6 ('belongs to Location'); M3 s6.1"
        string image_source "M3 s5.1 FR-003"
        string usage_right "M3 s5.1 FR-003"
        enum status "M3 s5.1 FR-003 (OUT image_status); M10 s5.1 FR-002 (content_status)"
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
        string name UK "M3 s6; M3 s6.1"
        string slug UK "M3 s5.1 FR-020 (province_slug)"
        enum region "M3 s6; type from M3 s5.1 FR-007 (region)"
        string merged_from "declared VARCHAR(80)[] - M3 s6; M3 s5.2 BR-006; M3 s6.1"
    }
    LOCATION_QUERY {
        uuid query_id PK "M3 s5.1 FR-011 (OUT)"
        uuid project_id FK "M3 s5.1 FR-011; M3 s6 ('may belong to Project')"
        string scene_description "M3 s5.1 FR-010, FR-011 (10–1000 characters); M3 s6 description"
        int shoot_month "M3 s5.1 FR-011 (1–12, FR-007); M3 s6 month"
        string attributes "declared JSONB - M3 s5.1 FR-011 (OUT); M3 s5.2 BR-009 (no personal data)"
    }
    PROJECT_SHORTLIST {
        uuid shortlist_id PK "M3 s5.1 FR-018 (OUT)"
        uuid project_id FK "M3 s5.1 FR-018"
        uuid location_id FK "M3 s5.1 FR-018 (location_ids UUID[])"
        enum role "M3 s5.1 FR-018"
    }
    ORGANISATION {
        uuid org_id PK "M4 s5.1 FR-001 (OUT)"
        string slug UK "M4 s5.1 FR-001 (OUT)"
        string org_name "M4 s5.1 FR-001"
        string legal_form "M4 s6; M4 s6.1"
        int founded_year "M4 s6; M4 s6.1"
        int hq_province FK "M4 s6 (a province - see Type conflicts); M4 s6.1"
        string service_groups "declared ENUM(full_production, permits_paperwork, casting, crew, camera_lighting, studios_interiors, location_management, transport_logistics, l"
        string provinces "declared INTEGER[] - M4 s5.1 FR-001"
        datetime verified_at "M4 s5.1 FR-010 (OUT)"
        date verified_until "M4 s6; M4 s5.2 BR-004 (12 months); M4 s6.1"
        boolean art13_eligible "M4 s6; M4 s6.1"
        enum org_status "M4 s5.1 FR-001; M4 s5.2 BR-008 (deactivated, never deleted)"
    }
    ORGANISATION_MEMBER_LAYER {
        uuid org_id PK,FK "M4 s6 ('belongs to Organisation')"
        string capability_desc_vi "M4 s5.1 FR-001 (s6 capability_desc)"
        string capability_desc_en "M4 s5.1 FR-001"
        string portfolio "declared VARCHAR(200)[] - M4 s6; M4 s6.1"
        int intl_project_count "M4 s6; M4 s6.1"
        string working_languages "declared CHAR(2)[] - M4 s5.1 FR-001; M4 s6"
    }
    ORGANISATION_PRIVATE_LAYER {
        uuid org_id PK,FK "M4 s6"
        string rate_card "declared JSONB - M4 s5.1 FR-001"
        string past_clients "declared TEXT[] - M4 s5.1 FR-001"
        string direct_contact "M4 s6; M4 s6.1"
    }
    VERIFICATION_REQUEST {
        uuid request_id PK "M4 s5.1 FR-008 (OUT verification_request_id)"
        uuid org_id FK "M4 s5.1 FR-008"
        string business_license "declared FILE - M4 s5.1 FR-008 (PDF max 25 MB)"
        string reference_projects "declared TEXT[] - M4 s5.1 FR-008 ([]= 2)"
        enum status "M4 s5.1 FR-009, FR-010"
        uuid decided_by FK "M4 s6; M4 s6.1"
        string reason "M4 s5.1 FR-010 (required when rejected)"
    }
    COLLAB_REQUEST {
        uuid request_id PK "M4 s5.1 FR-012 (OUT)"
        uuid project_id FK "M4 s5.1 FR-012"
        uuid org_id FK "M4 s5.1 FR-012"
        string services "declared ENUM[] - M4 s5.1 FR-012"
        string note "M4 s5.1 FR-012 (max 1000 characters)"
        enum status "M4 s5.1 FR-012 (pending), FR-014; M4 s5.2 BR-005"
        string response_note "M4 s5.1 FR-014"
        datetime sent_at "M4 s6; M4 s6.1"
        datetime responded_at "M4 s5.1 FR-014 (OUT)"
        datetime confirmed_at "M4 s6; M4 s6.1"
    }
    COLLAB_MESSAGE {
        uuid message_id PK "M4 s5.1 FR-014 (OUT)"
        uuid request_id FK "M4 s5.1 FR-014; M4 s6"
        uuid author_id FK "M4 s6; M4 s6.1"
        datetime created_at "M4 s6; M4 s6.1"
        string body "M4 s6; type of response_note, M4 s5.1 FR-014; M4 s5.2 BR-009 (never edited)"
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
        string segments "declared ENUM(A, B, C)[] - M5 s6; M5 s6.1"
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
        string file_path "M5 s6 (FR-002 declares file BYTEA - see Type conflicts); M5 s6.1"
        int version "M5 s6; M5 s5.1 FR-002 (previous versions kept); M5 s6.1"
        uuid uploaded_by FK "M5 s6; M5 s6.1"
        datetime uploaded_at "M5 s6; M5 s6.1"
    }
    BILINGUAL_DOCUMENT {
        uuid project_id PK,FK "M5 s6"
        string doc_code PK,FK "M5 s6"
        string structure_version "M5 s5.1 FR-004 (OUT)"
        string synopsis_en "M5 s5.1 FR-004, FR-005"
        string project_meta "declared JSONB - M5 s5.1 FR-004 (copy of project data - see Structural findings)"
        string pdf_url "M5 s5.1 FR-005 (OUT)"
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
        uuid project_id PK,FK "M5 s6; M5 s5.2 BR-006; M5 s6.1"
        string term_en PK "M5 s5.1 FR-004 (glossary Opt); M5 s6 source_term"
        string term_vi "M5 s5.1 FR-004 (glossary Opt); M5 s6 target_term"
    }
    PUBLIC_HOLIDAY {
        string name PK "M5 s6; M5 s6.1"
        date start_date PK "M5 s6; M5 s6.1"
        date end_date "M5 s6; M5 s6.1"
        boolean is_expected "M5 s6; M5 s3 US-3 (band marked *expected*); M5 s6.1"
    }
    LOCATION_INTEREST {
        uuid interest_id PK "M7 s5.1 FR-001 (OUT)"
        uuid project_id FK "M7 s5.1 FR-001"
        uuid location_id FK "M7 s5.1 FR-001"
        datetime created_at "M7 s6; M7 s6.1"
    }
    PROVINCE_NOTICE {
        uuid interest_id PK,FK "M7 s5.1 FR-002; M7 s6"
        int province_id FK "M7 s6 (derivable from the location - see Structural findings); M7 s6.1"
        string project_summary "M7 s5.1 FR-002"
        string authority_email "M7 s5.1 FR-002 (copied from AUTHORITY_CONTACT)"
        datetime drafted_at "M7 s6; M7 s6.1"
        uuid reviewed_by FK "M7 s5.1 FR-002"
        datetime sent_at "M7 s6; M7 s6.1"
        enum delivery_status "M7 s5.1 FR-002 (OUT)"
        datetime received_at "M7 s6; M7 s6.1"
        enum response "M7 s5.1 FR-003; M7 s5.2 BR-003"
        string note "M7 s5.1 FR-003"
        datetime responded_at "M7 s5.1 FR-003 (OUT)"
    }
    CONSULTATION_BOOKING {
        uuid booking_id PK "M7 s5.1 FR-005 (OUT)"
        uuid member_id FK "M7 s6; M7 s6.1"
        enum topic "M7 s5.1 FR-005"
        datetime slot_start "M7 s5.1 FR-005"
        string timezone "M7 s5.1 FR-005 (IANA)"
        uuid officer_id FK "M7 s5.1 FR-006"
        enum booking_status "M7 s5.1 FR-006 (OUT)"
    }
    MODERATION_ITEM {
        uuid content_id PK "M10 s5.1 FR-002; FR-001 (OUT moderation_queue)"
        enum content_type "M10 s5.1 FR-001; M10 s9 (showcase waits for M8, phase 2)"
        uuid organisation_id FK "M10 s6 ('refers to Organisation'); type of org_id, M4 s5.1 FR-001 - CHECK: exactly one of organisation_id, location_image_id (modelling choice)"
        string location_image_id FK "M10 s6 ('or LocationImage'); holds image_url, the only key of LOCATION_IMAGE (M3 s5.1 FR-003) - CHECK: exactly one of the two (modelling choice)"
        uuid submitted_by FK "M10 s5.1 FR-001 (OUT)"
        datetime submitted_at "M10 s5.1 FR-001 (OUT)"
        enum content_status "M10 s5.1 FR-002 (OUT); M10 s5.2 BR-001"
        string reason "M10 s5.1 FR-002; M10 s5.2 BR-002 (required when hidden)"
        uuid decided_by FK "M10 s6; M10 s6.1"
        datetime decided_at "M10 s6; M10 s6.1"
    }
    AUDIT_LOG {
        uuid audit_log_id PK "M10 s5.1 FR-008 (OUT)"
        string action "M10 s5.1 FR-008; M10 s3 US-4 (location.publish)"
        uuid admin_id FK "M10 s5.1 FR-008 (= actor_id in FR-009)"
        uuid target_id "M10 s5.1 FR-008 (any table - no foreign key, see Structural findings)"
        datetime logged_at "M10 s5.1 FR-008 (OUT); M10 s5.2 BR-005 (append-only)"
    }
    QUARTERLY_REPORT {
        uuid report_id PK "M10 s5.1 FR-007"
        date period_start "M10 s6 (period) = M10 s5.1 FR-003 period_start"
        date period_end "M10 s6 (period) = M10 s5.1 FR-003 period_end"
        string demand_index "declared JSONB - M10 s5.1 FR-007 (the indicators the report was drafted from)"
        string narrative_vi "M10 s5.1 FR-006 (OUT), FR-007"
        string narrative_en "M10 s5.1 FR-006 (OUT)"
        uuid reread_by FK "M10 s5.1 FR-007; M10 s5.2 BR-004"
        string report_pdf_url "M10 s5.1 FR-007 (OUT)"
        datetime exported_at "M10 s6; M10 s6.1"
    }
```

## Open questions

| # | Question | Blocking? | Owner | Default applied | Consequence if the default is wrong | Resolution |
|---|---|---|---|---|---|---|
| OQ-04-1 | [NEEDS CLARIFICATION: Must a province notice keep the authority email it was sent to, even if the contact changes later?] | No | M7 owner | Yes — copied at send time as FR-002 already does | Replies cannot be traced to the address actually used. | Open |
| OQ-04-2 | [NEEDS CLARIFICATION: Is the project summary in a sent notice frozen?] | No | M7 owner | Frozen at send time | The province may see a summary different from what it received. | Open |
| OQ-04-3 | [NEEDS CLARIFICATION: When an approved rule is edited or retired, is the old text kept so old findings still show what fired?] | Yes | M2 owner (VFDA Legal) | Keep every approved text per rule_version; never overwrite | A producer's saved result would silently change meaning. | Resolved 30/09/2026 — M2 §5.2 BR-008: rules are retired, never deleted (`status = retired`), and a finding keeps showing the text of the version it cited. Key change follows in OQ-04-24. |
| OQ-04-4 | [NEEDS CLARIFICATION: Should a segment decision record the decision-table version used?] | No | M1 owner | Yes, add segment_rule_id (drawn) and rely on the rule's version | A table change could not be audited against past decisions. | Open |
| OQ-04-5 | [NEEDS CLARIFICATION: Does a bilingual draft refresh its project_meta when the project changes?] | No | M5 owner | No — regenerated only on request | Title or dates in the Vietnamese draft may be stale. | Open |
| OQ-04-6 | [NEEDS CLARIFICATION: What happens to projects, uploads, logs and approvals when an account is deleted (personal data law)?] | Yes | Nam + VFDA Legal | Account disabled, personal fields erased, rows kept with the link | Either orphaned rows or unlawful retention of personal data. | Resolved 30/09/2026 — SYS §5.2 BR-005: never hard-deleted; `account_status = deactivated` (SYS §5.1 FR-004), name and email anonymised within 30 days, created rows kept as *Former member*. |
| OQ-04-7 | [NEEDS CLARIFICATION: Can a project be deleted or only archived? What happens to its documents, requests and notices?] | Yes | M0 owner | Archive only; no delete | Deleting would break access logs (append-only) and sent notices. | Resolved 30/09/2026 — M0 §5.2 BR-005: archived, never deleted (`stage = archived`, M0 §5.1 FR-002); read-only; documents, requests and notices kept. |
| OQ-04-8 | [NEEDS CLARIFICATION: Does unpublishing a location remove it from shortlists and open notices?] | No | M3 owner | No; it is shown as *no longer published* | Producers lose a shortlisted place without notice. | Resolved 30/09/2026 — M3 §5.2 BR-008: `intake_status = unpublished` (M3 §5.1 FR-002); shortlists and notices keep the location and show *No longer published*. |
| OQ-04-9 | [NEEDS CLARIFICATION: Can an organisation be removed from the directory, and what happens to its open requests?] | No | M4 owner | No removal; badge expiry only | A closed company keeps receiving requests. | Resolved 30/09/2026 — M4 §5.2 BR-008: deactivated, never deleted (`org_status = deactivated`, M4 §5.1 FR-001); open requests closed as `withdrawn`, producer notified, access log kept. |
| OQ-04-10 | [NEEDS CLARIFICATION: Add `owner` to PROJECT_MEMBER.permission, and which function accepts an invitation?] | Yes | M0 owner | Owner stored as `edit` + flag not modelled; acceptance by sign-in with the invited email | "Owner only" rules (M0 FR-004) cannot be enforced in the database. | Open |
| OQ-04-11 | [NEEDS CLARIFICATION: Is DOCUMENT_SLOT.state stored, or derived from documents, proofreading and partner status each time?] | Yes | M5 + M2 owners | Stored, recomputed on each upload and status change | Stored state can disagree with the rules it summarises. | Open |
| OQ-04-12 | [NEEDS CLARIFICATION: Which function edits a paragraph (and so clears its proofread status)?] | No | M5 owner | Editing inside SC-28, not specified as a function | The reset in M5 US-2 has no function to hang on. | Open |
| OQ-04-13 | [NEEDS CLARIFICATION: Initial and cancelled values of CONSULTATION_BOOKING.booking_status?] | No | M7 owner | Status left empty until VFDA confirms; no cancellation (seed follows this) | Unconfirmed bookings are indistinguishable from confirmed ones; a member cannot cancel. | Open |
| OQ-04-14 | [NEEDS CLARIFICATION: After how many days does an unanswered collaboration request expire, and is `expired` a status?] | No | M4 owner | No expiry; member withdraws | Requests stay open forever and block a second request to the same partner. | Open |
| OQ-04-15 | [NEEDS CLARIFICATION: Value sets of PROJECT.stage, LOCATION.intake_status, LOCATION_IMAGE.status, consultation topic, the 12 service groups and scene types.] | Yes | Module owners + VFDA | Values used in the seed are proposals, listed in data/seed/README.md | Code and seed invent their own values; screens and filters disagree. | Resolved 30/09/2026 — declared in §5.1: M0 FR-002 (stage), M3 FR-002 (intake_status, scene_types), M3 FR-003 / M10 FR-002 (image status — see Type conflicts), M7 FR-005 (topic), M4 FR-001 (service groups), M3 FR-007 (region), M2 FR-001/002 (rule topic). |
| OQ-04-16 | [NEEDS CLARIFICATION: Drop derivable columns (PROVINCE_NOTICE.province_id, LEGAL_RULE.is_active, BILINGUAL_DOCUMENT.watermark)?] | No | M7, M2, M5 owners | Kept as declared | Two sources of the same truth can disagree. | Resolved 01/10/2026 — watermark dropped; is_active kept with CHECK `ck_legal_rule_active_matches_status`; province_id kept as the province the notice was addressed to (M7 §6.1). See Structural findings, minimality. |
| OQ-04-17 | [NEEDS CLARIFICATION: Declare identifiers for EMAIL_DELIVERY and SEGMENT_DECISION (none in the spec; LOCATION_QUERY now has query_id, M3 FR-011).] | No | SYS, M1 owners | Placeholder keys *_id (type not declared) | Rows cannot be referenced from logs or support tickets. | Resolved 01/10/2026 — email_delivery_id UUID (SYS §6.1) and segment_decision_id UUID (M1 §6.1). |
| OQ-04-18 | [NEEDS CLARIFICATION: Types for all columns marked *type not declared* (62 columns on 30/09/2026).] | Yes | Module owners | Seed uses text; generic diagram type string | The build agent will choose types itself. | Resolved 01/10/2026 — every one is declared in section 6.1 of its module's Spec Document; no column is left without a type. |
| OQ-04-19 | [NEEDS CLARIFICATION: The location data-entry template has "18 fields" (M3 FR-002) but the I/O contract lists 17. Which field is missing?] | No | M3 owner | 17 as listed | One template field has nowhere to be stored. | Open |
| OQ-04-20 | [NEEDS CLARIFICATION: Where is the submitted version of a partner's content kept while the last approved version stays public (M10 BR-001)?] | Yes | M10 + M4 owners | Not modelled; MODERATION_ITEM holds only the reference and the decision | Approving has nothing to publish, or the waiting text overwrites the public one. | Open |
| OQ-04-21 | [NEEDS CLARIFICATION: Add a creation time to PROJECT and LOCATION_QUERY so the demand index can be filtered by period (M10 FR-003, FR-005)?] | No | M0, M3, M10 owners | Not modelled; seed rows carry no creation time | Indicators cannot be computed for a month, quarter or year. | Open |
| OQ-04-22 | [NEEDS CLARIFICATION: Which function lets a partner submit a location photo for moderation? F-M3-03 is for VFDA staff only.] | No | M3 + M10 owners | Seed has partner photos as if submitted; no function is mapped | The `location_image` content type has no source. | Open |
| OQ-04-23 | [NEEDS CLARIFICATION: Which function sets LEGAL_RULE.status = retired (M2 BR-008)?] | No | M2 owner (VFDA Legal) | Treated as an edit through F-M2-02 | Retiring a rule has no permission check or audit action of its own. | Open |
| OQ-04-24 | [NEEDS CLARIFICATION: Since each rule version keeps its text (M2 BR-008), key LEGAL_RULE by rule_code + rule_version and point findings at that pair?] | Yes | M2 owner | Not changed: rule_code stays unique; one text per rule in the seed | An edited rule overwrites the text old findings must keep showing. | Open |
| OQ-04-25 | [NEEDS CLARIFICATION: AUDIT_LOG.target_id is a UUID; how are actions on rows keyed by text (image_url, rule_version, doc_code) recorded?] | No | M10 owner | Seed logs only actions whose target has a UUID key | Some admin actions cannot name their target, which M10 US-4 requires. | Open |


---
*Human gate 4: the Decision column records the type applied in 04 and in the schema on 01/10/2026 — confirm or change it, and confirm every natural key. Signed: ____________________  Date: __________*
