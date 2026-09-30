---
artifact: seed
step: S5
generated: 2026-09-30
sources: FUNCTIONS, FIELDS, ENTITIES, RULES, SCENARIOS, FLOWS, SCREENS, BOUNDARY
---

# Seed data — CINEMATCH

One CSV per table of `04-data-model.md` — **46 tables, 423 rows**, no table left empty. All people, companies, phone numbers and e-mail addresses are fictional (`*.example.*` domains); every phone number has the form `+84 000 000 1xx`, which cannot be a real number, and none is used twice. Legal-rule texts are mockups: the citations say only *Law 05/2022/QH15, Art. 9* or *Art. 13(3)* and must be written by the VFDA Legal Board.

## How to run

```bash
python3 data/seed/generate_seed.py   # writes the 46 CSV files
python3 data/seed/check_seed.py      # integrity check — must print PASS
```

`check_seed.py` checks, by script and not by eye:

- every primary key is unique;
- every foreign key resolves — 68 FK columns, composite keys included (`DOCUMENT → DOCUMENT_SLOT`, `BILINGUAL_PARAGRAPH → BILINGUAL_DOCUMENT`), and `rule_code` against `LEGAL_RULE`'s unique key;
- every *Req* column is filled, except the 7 listed in *Type conflicts* of `04-data-model.md` (required by the function, optional in storage);
- every enum value is in the declared set (arrays of enums included), and every declared value is used by at least one row — except `user_account.role = guest` (see below) and `moderation_item.content_type = showcase` (phase 2, M10 §9);
- timestamps are in order (request sent → responded → confirmed; notice drafted → sent → received → replied; notification created → read);
- no published location lacks a verified authority contact (M3 BR-004), and `published` agrees with `intake_status`;
- nothing is hard-deleted: a deactivated account is anonymised (SYS BR-005), an unpublished location is still in a shortlist (M3 BR-008), no request stays open with a deactivated organisation (M4 BR-008), a retired rule is not active (M2 BR-008);
- every moderation item points at exactly one of `organisation_id` / `location_image_id`, matching its `content_type`, and a hidden item has a reason (M10 BR-002);
- every phone number in any file has the fake form `+84 000 000 1xx` and is unique;
- regenerating produces **byte-identical files** — the Session 6 smoke test T2.

**Last run: PASS.** Negative tests were run to prove the check bites: a province id of 99 was reported as an unresolved FK, a hand-edited file was reported as non-deterministic, and a real-looking phone number was reported as not fake.

**File convention:** header row in logical-model column order · rows sorted by primary key · ISO dates `YYYY-MM-DD` and timestamps `YYYY-MM-DDThh:mm:ss+07:00` · dot decimals · UTF-8 · LF · arrays and objects as compact JSON in the cell.

## The story in the data

The rows tell the same story as the 20 mockups: *The Last Ferry* (Harbour Line Films, Korea, segment A, first shooting day 2027-03-15, 7-day buffer, readiness 58 % on the last snapshot). Tràng An is shortlisted as primary, Ninh Bình acknowledged the notice on 18/09, Bến Xưa Production Services has **accepted** the request and waits for confirmation, 6 of 14 script paragraphs are proofread, and the dossier stands at application *present*, script *needs fixing*, service agreement *pending*, Article 9 undertaking *missing*. The producer on the mockups, **Lena Park**, is the Harbour Line member who owns the project; her colleague Han Ji-woo edits it with her. Its glossary fixes four terms (ferry → đò, ferryman → người lái đò, landing → bến, karst → núi đá vôi).

In the VFDA back office (M10), Mekong Frame Co. has a profile edit and a location photo waiting for moderation, Nguyễn Thị Thu Hà has reread and exported the Q3 2026 quarterly report, and every administrative action — publishing Tràng An, approving Bến Xưa's badge, signing and retiring rules, approving or hiding content — is in the audit log under Nguyễn Thị Thu Hà, Lê Hoàng Phúc, Trần Minh Quân or Vũ Đức Anh.

## Row kinds per table

Every table has ordinary rows (1). The other three kinds:

| Table | (2) Boundary | (3) Empty case | (4) Exceptional state |
|---|---|---|---|
| user_account | 254-character e-mail (64-character local part) | `okafor`: no project he owns, no notification | `rossi`: e-mail not verified; `former`: deactivated and anonymised (SYS BR-005) |
| profile | 120-character full name | staff and partner profiles: no producer organisation | unverified account's profile; *Former member* (anonymised name) |
| producer_organisation | 200-character name, 300-character website | Kestrel Pictures: no project | Rossi Film: only member unverified |
| consent | version `2026.2-rev-a-final-1` (20 chars, the maximum) | — (every account consents at sign-up) | `park`: re-consent to a new version |
| notification | payload with nested JSON | `okafor`: none | `n7`: alert about a bounced e-mail |
| email_delivery | — | `e5`: no linked notification | `e4`: bounced |
| segment_rule | — | `r0`: never used by a decision | `r0`: superseded version 2025.12 |
| segment_requirement | — | C / ART13_LICENCE: *not needed* | — (no status column) |
| segment_decision | empty `q4_needs` | guest session, no project | answers match no rule (no segment); overrides A → B, B → A, A → C |
| project | 200-char name, 500-char logline, 0 days in Vietnam, buffer 0, 2031-12-31 | `Monsoon Signal`: no date, no member but owner, no document | `Quiet Harbour Blues`: safe deadline already passed; `Harbour Lights`: archived |
| project_member | — | projects with only an owner | invitation to an address with no account (`pending`); member whose account was deactivated, kept |
| project_province | — | projects with none | — (no status column) |
| readiness_snapshot | 0.00 and 100.00 | `Monsoon Signal`, `Harbour Lights`: no snapshot | — (no status column) |
| rule_set_version | — | 2026.06: no run applied it | — (no status column) |
| legal_rule | 200-character title | `A9-RELIG`: never cited by a pre-check | `A9-DRUG`, `A9-HERIT`: draft, no citation, no approver; `A9-MAP`: retired, not active (M2 BR-008) |
| precheck_run | all flags `unsure` | `g-fr`: no finding | `g-dropped`: every finding dropped, no attention level |
| precheck_finding | span starting at 0 | — | — (no status column) |
| compliance_run | — | `sapa-a`: no finding | older run on an older rule-set version |
| compliance_finding | — | — | `open` findings next to `reviewed` ones |
| province | *Thành phố Hồ Chí Minh* (longest) | 25 provinces with no location | merged units with `merged_from` (M3 BR-006) |
| location | 200-char names; Cà Mau, southernmost (8.615°) | Tam Cốc, Cà Mau Cape: no image | Mũi Né: contact unverified, publishing blocked; Cửa Vạn: `unpublished` (M3 BR-008) |
| location_image | — | Tam Cốc, Cà Mau Cape: no image | `hidden`: usage right unclear; `pending`: partner photo of Cái Răng |
| authority_contact | verified in 2016 (older than the 12-month cycle) | contacts without e-mail | Mũi Né: not verified |
| project_shortlist | — | `Monsoon Signal`, `Harbour Lights`: none | Cửa Vạn, unpublished, kept as a backup of `Quiet Harbour Blues` |
| organisation | 200-char name, all 12 groups, all 34 provinces, founded 1990 | Hanoi Grip & Light: no layers, no request, no badge | Sông Hậu: badge expired 2026-08-15; Cửu Long Drone Works: `deactivated` (M4 BR-008) |
| organisation_member_layer | 6 working languages | Hội An Casting House: 0 international projects | — (no status column) |
| organisation_private_layer | — | Hội An Casting House: no rate card | — (no status column) |
| verification_request | 3 references | — | `rejected` with reason; `pending` |
| collab_request | 1000-character note (the maximum) | Hanoi Grip & Light receives none | `declined`, `withdrawn`; `c9` withdrawn because its organisation was deactivated |
| nda_acceptance | — | `c3`: request with no NDA | `n5`: NDA declined (`accepted = false`) |
| document_access_log | — | documents never viewed | view of an old, replaced version |
| document_type | 76-character Vietnamese name | `PROVINCIAL_NOTICE_COPY`: no slot | segment C only type |
| document_slot | — | slots with no document (`missing`) | `needs_fix`, `pending` |
| document | version 2 | — | version 1 replaced by version 2 |
| bilingual_document | — | `Rice and Salt`: no PDF yet | — (no status column) |
| bilingual_paragraph | 14 paragraphs in one draft | — | `Rice and Salt` paragraph: translation failed (empty target) |
| public_holiday | 2023 (far past) | — | `is_expected = true` (Tết 2027, 05–10/02 as on SC-29) |
| location_interest | — | `Monsoon Signal`: no first shooting day | — (see notices) |
| province_notice | — | `i5`, `i7`: drafted, not reviewed | `bounced`; `cannot_support`; `i8`: reviewed, `queued` |
| consultation_booking | time zone `America/Argentina/ComodRivadavia` | `b4`: no officer yet | `rescheduled` |
| location_query | 1000-character description (the maximum) and a 10-character one (the minimum) | guest queries with no project; `q5`: no shooting month | — (no status column) |
| collab_message | — | requests with no message | — (messages are never edited, M4 BR-009) |
| project_glossary | — | projects with no glossary | — (no status column) |
| moderation_item | — | organisations and photos never moderated | `pending`, `approved`, `hidden` with reason |
| audit_log | — | accounts with no admin action | `rule.retire`, `location.unpublish` |
| quarterly_report | — | only one quarter reported | indicators 4–6 below 5 records: *not enough data* (M10 BR-003) |

**No header-only table any more.** `location_query` (F-M3-11, M3 BR-009), `collab_message` (F-M4-14, M4 BR-009) and `project_glossary` (F-M5-04, M5 BR-006) now have a writer in the Spec Documents of 30/09/2026, so they carry rows. Location queries hold no personal data. Messages exist only where the author has a seeded account, so the response notes of Hạ Long Marine, Sông Hậu and Hội An Casting have no message row.

**Why no `guest` account.** `guest` is one of the six roles (SYS §5.1 FR-004), but a guest is a visitor who has not signed up (SYS §2, F-SYS-01), and a new account is always `member` (SYS BR-002). The value is used by the role check of an anonymous session and is never stored in `user_account`.

**Six indicators without names.** M10 does not name the six demand indicators, and indicators 4 and 6 need fields no function collects (M10 §10, question 1); the quarterly report stores them as `indicator` 1–6 with value and sample size.

## Enum value sets (declared in the Spec Documents, section 5.1)

Declared since 30/09/2026 — no longer proposals. The seed uses every value (except the two noted above).

| Column | Values | Declared in |
|---|---|---|
| `project.stage` | draft, preparing, archived | M0 §5.1 FR-002; M0 BR-005 |
| `location.intake_status` | awaiting_contact, published, unpublished | M3 §5.1 FR-002; M3 BR-008 |
| `location_image.status` | pending, approved, hidden | M3 §5.1 FR-003 (image_status); M10 §5.1 FR-002 (content_status) |
| `location.scene_types` | karst, river, village, rice_field, sea, floating_village, cave, jungle, old_town, market, rice_terrace, mountain, dunes, mangrove | M3 §5.1 FR-002, FR-007 |
| `organisation.service_groups` (12) | full_production, permits_paperwork, casting, crew, camera_lighting, studios_interiors, location_management, transport_logistics, lodging_catering, interpreting, insurance_legal, post_production | M4 §5.1 FR-001; M4 BR-002 |
| `consultation_booking.topic` | dossier, locations, partners, provincial_notice, general | M7 §5.1 FR-005 |
| `province.region` | north, central, south | M3 §5.1 FR-007 |
| `legal_rule.topic` | security, history, religion, privacy, dossier, public_order, heritage | M2 §5.1 FR-001, FR-002 |
| `legal_rule.status` | draft, approved, retired | M2 §5.1 FR-001; M2 BR-008 |
| `user_account.account_status` | active, deactivated | SYS §5.1 FR-004; SYS BR-005 |
| `organisation.org_status` | active, deactivated | M4 §5.1 FR-001; M4 BR-008 |
| `moderation_item.content_type` | org_profile, location_image, showcase | M10 §5.1 FR-001 |
| `moderation_item.content_status` | pending, approved, hidden | M10 §5.1 FR-002 |

## Scenario coverage

| Scenario ID | Rows that make it runnable | Covered? |
|---|---|---|
| SYS US-1 | user_account `rossi` (unverified) and `park`; profile; producer_organisation; consent | Yes |
| SYS US-2 | authority_contact (11 rows) + a guest session (no account) and member accounts | Yes |
| SYS US-3 | profile.locale `vi` / `en` | Partly — the spec also stores it in a cookie (type conflict) |
| SYS US-4 | notification `n1` + email_delivery `e1` | Yes |
| M1 US-1 | segment_rule `r1`, segment_requirement A, segment_decision for *The Last Ferry* | Yes |
| M1 US-2 | segment_decision `session:7c1e9a40` (override A → B) | Yes |
| M1 US-3 | *Rice and Salt*: decision A then B, documents kept | Yes |
| M0 US-1 | *Monsoon Signal*: new project, owner only | Yes |
| M0 US-2 | *The Last Ferry* dossier slots; *Monsoon Signal* (segment C, no dossier gauge) | Yes |
| M0 US-3 | project_member invitation `pending` | Partly — no function accepts an invitation |
| M2 US-1 | precheck_run `g-us`, `g-vi` with findings; `g-fr` none; `g-dropped` | Yes |
| M2 US-2 | *Rice and Salt*: application only (1 / 4); *The Last Ferry*: script `needs_fix` | Yes |
| M2 US-3 | legal_rule `A9-DRUG` (draft, no citation); approved rules with versions | Yes |
| M2 US-4 | *The Last Ferry*: 2027-03-15, buffer 7 → 27/01/2027 and 16/02/2027 | Yes |
| M2 US-5 | approved rules | **No** — rule ↔ segment is not modelled (implied entity, 01) |
| M3 US-1 | locations with scene types; location_query `q1` for *The Last Ferry* | Partly — scoring weights undeclared |
| M3 US-2 | authority_contact Tràng An | Yes |
| M3 US-3 | location `mui-ne` with unverified contact | Yes |
| M3 US-4 | shortlist: Tràng An primary, Tam Cốc and Hạ Long backup | Yes (compare set is not stored) |
| M3 US-5 | Ninh Bình (2 locations, partners, notice); Lai Châu (none) | Yes — the minimum-data threshold is undeclared |
| M4 US-1 | Bến Xưa: verified, Ninh Bình, Korean | Yes |
| M4 US-2 | collab_request `c1` accepted; `c7` confirmed | Yes |
| M4 US-3 | verification `v1` approved; `v5` rejected with reason | Yes |
| M4 US-4 | nda_acceptance `n1`, `n2`; document_access_log `a1`–`a3` | Yes |
| M5 US-1 | *The Last Ferry* slots, heritage-site permit for Tràng An | Yes |
| M5 US-2 | 14 paragraphs, 6 proofread | Yes |
| M5 US-3 | *The Last Ferry* dates; Tết 2027 `expected` | Yes |
| M7 US-1 | interest `i1`; `i7` without a first shooting day | Yes |
| M7 US-2 | notice `i3` `info_needed` + notification `n4` | Yes |
| M7 US-3 | booking `b1` (Asia/Seoul) + reminder `n8` | Yes |
| M10 US-1 | moderation_item Mekong Frame profile edit `pending` next to the approved first version; audit `content.approve` | Yes |
| M10 US-2 | projects, location queries, project provinces and requests of Q3 2026 | Partly — no creation time on projects and queries, so the period filter cannot run (OQ-04-21); indicators unnamed |
| M10 US-3 | quarterly_report Q3 2026, reread by Nguyễn Thị Thu Hà; audit `report.export` | Yes |
| M10 US-4 | audit_log `location.publish` for Tràng An, 12 actions by 4 people | Yes — the spec's filter example names *Phạm Thu Hà*; the seed person is Nguyễn Thị Thu Hà |

**34 scenarios: 29 covered, 4 partly, 1 not covered.** The partial and missing ones point at points still to be decided, not at thin data.
