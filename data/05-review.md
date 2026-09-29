---
artifact: 05-review
step: S6
generated: 2026-09-28
sources: FUNCTIONS, FIELDS, ENTITIES, RULES, SCENARIOS, FLOWS, SCREENS, BOUNDARY
---


# Data Model Review — CINEMATCH

Seven criteria (the first six from the Batini–Ceri–Navathe framework for conceptual models, the seventh from this process). Every result quotes its evidence. *Fail* here means *a specific, small thing is wrong and named*, not *the model is unusable*.

## Rubric

| Criterion | Result | Evidence quoted from the input | Minimum change proposed |
|---|---|---|---|
| 1. Completeness | **Fail** | SYS §5.1 FR-010 outputs `search_vector TSVECTOR` and FR-011 `embedding VECTOR(n)` for location and supplier descriptions; 02 records F-SYS-11 updating LOCATION and ORGANISATION_MEMBER_LAYER, but neither column exists in 04. Other outputs with no home are runtime-only by their own description (SYS FR-004 `access_granted`, M1 FR-003 `data_retained`, M4 FR-007 `similarity`) or live in Supabase Auth (SYS FR-002 `session_token`, SYS §5.2 BR-004). | Add `search_vector` to LOCATION and `embedding` to LOCATION and ORGANISATION_MEMBER_LAYER, types copied from SYS FR-010/011 (`n` stays [NEEDS CLARIFICATION]). |
| 2. Correctness | **Fail** | 03 says *"Each profile works for exactly one producer organisation"* (from SYS FR-001 `org_name Req`), but staff and partner accounts are created by an admin, not through sign-up (SYS §5.2 BR-002) — the seed has 7 such profiles with no organisation. The other 59 relationships match the wording of their cited evidence, e.g. *"a notice ... is drafted"* when the interest is saved (M7 §3 US-1) → 1:1. | Change PROFILE's side of `PRODUCER_ORGANISATION ||..|{ PROFILE` to zero-or-one (`|o..o{`), in 03 and 04 together (OQ-03-2). |
| 3. Minimality | **Fail** | `PROVINCE_NOTICE.province_id` is derivable through LOCATION_INTEREST → LOCATION (M7 §6); `LEGAL_RULE.is_active` duplicates `status = approved` (M2 FR-003); `BILINGUAL_DOCUMENT.watermark` is *"always true"* (M5 FR-005). The four entities the specs call *derived* were correctly kept out of the tables. | Drop the three columns, or keep them only with a written reason (OQ-04-16). |
| 4. Readability | **Fail** | The conceptual ERD has 43 entities and 60 relationships in one diagram. Each relationship has a forward and reverse sentence in plain English (03, `%%` lines), but the drawing itself cannot be followed unaided by a non-technical reader. | Add one small view per module (the same lines, filtered) under `docs/architecture/`; keep 03 as the single source. |
| 5. Extensibility | **Pass** | Business case tested: **M6 entry logistics — temporary import of filming equipment** (Won't now, phase 2, docs/mvp-scope.md §4). It adds new entities hanging off PROJECT (an equipment list and a customs declaration) and new DOCUMENT_TYPE rows with basis `law` or `common`; no existing table or relationship changes. | — |
| 6. Integration | **Fail** | BOUNDARY: passwords and tokens stay in Supabase Auth (SYS BR-004) — USER_ACCOUNT has no password column ✓; Resend's `provider_message_id` is kept ✓. But SCREENS disagree with FIELDS in three places: SC-25 writes `status = closed` (not in M4 FR-014's enum), SC-27 reads `document_slots.status` (FIELDS: `state`), SC-19 reads `organizations` / `service_categories`. And M5 FR-002 declares `file BYTEA` while storage is Supabase Storage (M5 §1 Depends on). | Correct the three Screen Specs to the logical names; declare the document as a storage path, not bytes (01 conflicts). |
| 7. Traceability | **Fail** | 282 of 285 columns cite a FIELDS row or a §6 attribute. Three key columns cite nothing because the specs declare no identifier: `EMAIL_DELIVERY.email_delivery_id`, `SEGMENT_DECISION.segment_decision_id`, `LOCATION_QUERY.location_query_id`. 70 columns cite an attribute but carry *type not declared*. | Declare the three identifiers and the 70 types in the owning specs' §5.1 (OQ-04-17, OQ-04-18). |

**Result: 1 Pass, 6 Fail, 0 Not assessed** — every slot the criteria need was present in the INPUT MAP.

### A Pass we challenge (human gate 6)

**5. Extensibility** — We challenge our own Pass. Test a second case the specs already hint at: **a co-production with two producer organisations** (M1 §5.1 FR-002 offers `q3_producer = coproduction`; M1 §10 asks whether it is segment A or B). PROJECT belongs to exactly one PRODUCER_ORGANISATION, and PROJECT_MEMBER links people, not companies — so a co-production needs a new associative entity between PROJECT and PRODUCER_ORGANISATION and a change to the RLS of every project-owned table. That is a structural change. Verdict after challenge: **Pass for M6, Fail for co-production**; the co-production question is added to M1 §10 as blocking before any project table is built.

The team must challenge at least one more Pass or Fail in class before signing below.

## Seed coverage (from S5)

30 acceptance scenarios: **25 runnable, 4 partly, 1 not runnable** (M2 US-5: rule ↔ segment is not modelled). `check_seed.py`: PASS — 43 tables, 374 rows, 62 foreign-key columns resolve, generation is deterministic. Full table in `seed/README.md`.

## Consolidated open questions

All 39 open questions from 01–04, grouped by owner — **17 blocking**. Each row can be pasted into section 10 of the owning module's Spec Document; the *From* column says where it was raised.

| # | Owner | From | Question | Blocking? | Default applied | Consequence if the default is wrong |
|---|---|---|---|---|---|---|
| 1 | Nam (M10) | 01 | [NEEDS CLARIFICATION: Where does the audit log live before M10 has a Spec Document?] | Yes | Not modelled in this package | SYS BR-002 and M4 depend on it; RLS for grants cannot be audited. |
| 2 | Nam + VFDA | 01 | [NEEDS CLARIFICATION: Keep PRODUCER_ORGANISATION and ORGANISATION as two entities, or merge with an organisation type?] | Yes | Two entities | Merging later rewrites Profile, Project, COLLAB_REQUEST foreign keys and RLS policies. |
| 3 | Nam + VFDA | 02 | [NEEDS CLARIFICATION: Who loads SEGMENT_RULE, SEGMENT_REQUIREMENT, DOCUMENT_TYPE, PROVINCE and PUBLIC_HOLIDAY? No function creates them.] | Yes | Loaded by seed script; VFDA edits through the database until M10 exists | The M1 decision table and the M5 kit are VFDA-approved content; without an edit function every change needs a developer. |
| 4 | Nam + VFDA Legal | 04 (OQ-04-6) | [NEEDS CLARIFICATION: What happens to projects, uploads, logs and approvals when an account is deleted (personal data law)?] | Yes | Account disabled, personal fields erased, rows kept with the link | Either orphaned rows or unlawful retention of personal data. |
| 5 | SYS owner | 03 (OQ-03-2) | [NEEDS CLARIFICATION: Do VFDA staff, partner and admin accounts also need a PRODUCER_ORGANISATION? The diagram says every profile works for exactly one.] | Yes | Exactly one, as sign-up requires org_name (SYS FR-001) | Staff and partner accounts created by an admin would need a fake producer company. |
| 6 | SYS owner | 03 (OQ-03-4) | [NEEDS CLARIFICATION: Is an email delivery linked to at most one notification, or can one digest email carry several?] | No | At most one | A digest would need an association entity. |
| 7 | SYS, M1, M3 owners | 04 (OQ-04-17) | [NEEDS CLARIFICATION: Declare identifiers for EMAIL_DELIVERY, SEGMENT_DECISION, LOCATION_QUERY (none in the spec).] | No | Placeholder keys *_id (type not declared) | Rows cannot be referenced from logs or support tickets. |
| 8 | M1 + M5 owners | 03 (OQ-03-5) | [NEEDS CLARIFICATION: Which entity links SEGMENT_REQUIREMENT to DOCUMENT_TYPE (M5 BR-004 builds the kit from segment_requirements)?] | Yes | No link drawn | The document kit cannot be generated from data (M5 BR-004) without it. |
| 9 | M1 owner | 02 | [NEEDS CLARIFICATION: Does F-M1-01 read segment labels from the display dictionary (F-SYS-06) or from SEGMENT_REQUIREMENT?] | No | Display dictionary | If from SEGMENT_REQUIREMENT, labels need columns there. |
| 10 | M1 owner | 04 (OQ-04-4) | [NEEDS CLARIFICATION: Should a segment decision record the decision-table version used?] | No | Yes, add segment_rule_id (drawn) and rely on the rule's version | A table change could not be audited against past decisions. |
| 11 | M0 owner | 01 | [NEEDS CLARIFICATION: How is an invitation to an email without an account stored until accepted?] | Yes | invitee_email kept on PROJECT_MEMBER with user_id empty | A member row without a user breaks the "belongs to UserAccount" relationship. |
| 12 | M0 owner | 04 (OQ-04-7) | [NEEDS CLARIFICATION: Can a project be deleted or only archived? What happens to its documents, requests and notices?] | Yes | Archive only; no delete | Deleting would break access logs (append-only) and sent notices. |
| 13 | M0 owner | 04 (OQ-04-10) | [NEEDS CLARIFICATION: Add `owner` to PROJECT_MEMBER.permission, and which function accepts an invitation?] | Yes | Owner stored as `edit` + flag not modelled; acceptance by sign-in with the invited email | "Owner only" rules (M0 FR-004) cannot be enforced in the database. |
| 14 | M2 owner | 02 | [NEEDS CLARIFICATION: Which function writes COMPLIANCE_RUN? No function runs the content check on a project; F-M2-06/11/12 only speak of a synopsis.] | Yes | F-M2-12 writes COMPLIANCE_FINDING when the synopsis belongs to a project | Project content checks (M2 US-2, SC-48 for members) cannot be traced to a stored run and version. |
| 15 | M2 owner | 02 | [NEEDS CLARIFICATION: Does F-M2-12 verify findings for both the guest pre-check and the project check?] | No | Yes, both | If only the pre-check, project findings would be shown unverified — breaks M2 BR-001. |
| 16 | M2 owner | 03 (OQ-03-1) | [NEEDS CLARIFICATION: Is LEGAL_RULE ↔ RULE_SET_VERSION one-to-many (as M2 §6 says) or many-to-many (every version re-includes all active rules)?] | Yes | One-to-many as declared; a rule points to the version that activated it | Re-running an old check cannot reconstruct the exact rule set of that version. |
| 17 | M2 owner (VFDA Legal) | 04 (OQ-04-3) | [NEEDS CLARIFICATION: When an approved rule is edited or retired, is the old text kept so old findings still show what fired?] | Yes | Keep every approved text per rule_version; never overwrite | A producer's saved result would silently change meaning. |
| 18 | M3 owner | 02 | [NEEDS CLARIFICATION: Is LOCATION_QUERY stored (F-M3-10/11), and for how long?] | No | Not stored; entity kept as declared, no rows written | If stored, it holds user text (privacy) and becomes a demand signal for M10. |
| 19 | M3 owner | 04 (OQ-04-8) | [NEEDS CLARIFICATION: Does unpublishing a location remove it from shortlists and open notices?] | No | No; it is shown as *no longer published* | Producers lose a shortlisted place without notice. |
| 20 | M3 owner | 04 (OQ-04-19) | [NEEDS CLARIFICATION: The location data-entry template has "18 fields" (M3 FR-002) but the I/O contract lists 17. Which field is missing?] | No | 17 as listed | One template field has nowhere to be stored. |
| 21 | M4 owner | 01 | [NEEDS CLARIFICATION: Declare ORGANISATION_SERVICE and ORGANISATION_PROVINCE, or keep arrays on ORGANISATION?] | No | Arrays as declared in FR-001 | Arrays break 1NF: filtering by province and counting per service group (M3 index) becomes slower and harder to constrain. |
| 22 | M4 owner | 01 | [NEEDS CLARIFICATION: Which entity records that a partner account may edit an organisation?] | Yes | None modelled; flagged | Without it RLS cannot decide who edits an organisation profile (F-M4-01). |
| 23 | M4 owner | 02 | [NEEDS CLARIFICATION: Is COLLAB_MESSAGE in scope? No function writes or reads messages (SC-25 shows none).] | No | Out of scope; entity left unused | If in scope, a send/read function and a Screen Spec section are missing. |
| 24 | M4 owner | 04 (OQ-04-9) | [NEEDS CLARIFICATION: Can an organisation be removed from the directory, and what happens to its open requests?] | No | No removal; badge expiry only | A closed company keeps receiving requests. |
| 25 | M4 owner | 04 (OQ-04-14) | [NEEDS CLARIFICATION: After how many days does an unanswered collaboration request expire, and is `expired` a status?] | No | No expiry; member withdraws | Requests stay open forever and block a second request to the same partner. |
| 26 | M5 + M2 owners | 04 (OQ-04-11) | [NEEDS CLARIFICATION: Is DOCUMENT_SLOT.state stored, or derived from documents, proofreading and partner status each time?] | Yes | Stored, recomputed on each upload and status change | Stored state can disagree with the rules it summarises. |
| 27 | M5 owner | 02 | [NEEDS CLARIFICATION: Which function creates DOCUMENT_SLOT rows, and which sets their state?] | Yes | F-M5-01 creates one slot per required document type when the kit first opens; state derived by rules | Without slots, F-M2-08 has nothing to count and component status cannot be stored. |
| 28 | M5 owner | 02 | [NEEDS CLARIFICATION: Is PROJECT_GLOSSARY in scope? No function writes or reads it.] | No | Out of scope; entity left unused | Translation consistency across paragraphs (SC-28) would rely on the model alone. |
| 29 | M5 owner | 04 (OQ-04-5) | [NEEDS CLARIFICATION: Does a bilingual draft refresh its project_meta when the project changes?] | No | No — regenerated only on request | Title or dates in the Vietnamese draft may be stale. |
| 30 | M5 owner | 04 (OQ-04-12) | [NEEDS CLARIFICATION: Which function edits a paragraph (and so clears its proofread status)?] | No | Editing inside SC-28, not specified as a function | The reset in M5 US-2 has no function to hang on. |
| 31 | M7 owner | 03 (OQ-03-3) | [NEEDS CLARIFICATION: Is a province notice drafted at the moment the interest is saved (1:1), or can an interest exist without a notice?] | No | 1:1, per M7 US-1 | If notices are optional, PROVINCE_NOTICE side becomes zero-or-one. |
| 32 | M7 owner | 04 (OQ-04-1) | [NEEDS CLARIFICATION: Must a province notice keep the authority email it was sent to, even if the contact changes later?] | No | Yes — copied at send time as FR-002 already does | Replies cannot be traced to the address actually used. |
| 33 | M7 owner | 04 (OQ-04-2) | [NEEDS CLARIFICATION: Is the project summary in a sent notice frozen?] | No | Frozen at send time | The province may see a summary different from what it received. |
| 34 | M7 owner | 04 (OQ-04-13) | [NEEDS CLARIFICATION: Initial and cancelled values of CONSULTATION_BOOKING.booking_status?] | No | Status left empty until VFDA confirms; no cancellation (seed follows this) | Unconfirmed bookings are indistinguishable from confirmed ones; a member cannot cancel. |
| 35 | M7, M2, M5 owners | 04 (OQ-04-16) | [NEEDS CLARIFICATION: Drop derivable columns (PROVINCE_NOTICE.province_id, LEGAL_RULE.is_active, BILINGUAL_DOCUMENT.watermark)?] | No | Kept as declared | Two sources of the same truth can disagree. |
| 36 | Group C (M0/M2/M3 owners) | 01 | [NEEDS CLARIFICATION: Are READINESS_VIEW, DOSSIER_CHECK, LICENSING_TIMELINE and PROVINCE_READINESS computed on read, never stored?] | No | Computed on read (database views); excluded from the ERD | If any must be stored (e.g. for audit), a table and its refresh rule must be added. |
| 37 | Module owners | 04 (OQ-04-18) | [NEEDS CLARIFICATION: Types for all columns marked *type not declared* (70 columns).] | Yes | Seed uses text; generic diagram type string | The build agent will choose types itself. |
| 38 | Module owners + VFDA | 04 (OQ-04-15) | [NEEDS CLARIFICATION: Value sets of PROJECT.stage, LOCATION.intake_status, LOCATION_IMAGE.status, consultation topic, the 12 service groups and scene types.] | Yes | Values used in the seed are proposals, listed in data/seed/README.md | Code and seed invent their own values; screens and filters disagree. |
| 39 | Owners of SYS, M1, M2, M0 | 02 | [NEEDS CLARIFICATION: Who reads CONSENT, SEGMENT_DECISION, RULE_SET_VERSION, PROJECT_PROVINCE and EMAIL_DELIVERY? Each is written but never read by a function.] | No | Kept for audit and for M10 reports | Write-only data costs storage and privacy review without a user; M10's spec must claim them. |

## Files produced

| File | Step | Status |
|---|---|---|
| `data/01-entity-dictionary.md` | S1 | Draft — Decision column and definitions await human gate 1 |
| `data/02-crud-matrix.md` | S2 | Draft — Resolution column awaits human gate 2 |
| `data/03-erd.mmd` | S3 | Draft — renders; relationship sentences await human gate 3 |
| `data/04-data-model.md` | S4 | Draft — renders; type conflicts and natural keys await human gate 4 |
| `data/seed/*.csv` (43) + `generate_seed.py`, `check_seed.py`, `schema.json`, `README.md` | S5 | Check PASS |
| `data/05-review.md` | S6 | This file — awaits human gate 6 |

---
*Human gate 6: the team challenged at least one result and agrees with this review. Signed: ____________________  Date: __________*
