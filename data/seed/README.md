---
artifact: seed
step: S5
generated: 2026-09-28
sources: FUNCTIONS, FIELDS, ENTITIES, RULES, SCENARIOS, FLOWS, SCREENS, BOUNDARY
---

# Seed data — CINEMATCH

One CSV per table of `04-data-model.md` — **43 tables, 374 rows**. All people, companies, phone numbers and e-mail addresses are fictional (`*.example.*` domains). Legal-rule texts are mockups: the citations say only *Law 05/2022/QH15, Art. 9* or *Art. 13(3)* and must be written by the VFDA Legal Board.

## How to run

```bash
python3 data/seed/generate_seed.py   # writes the 43 CSV files
python3 data/seed/check_seed.py      # integrity check — must print PASS
```

`check_seed.py` checks, by script and not by eye:

- every primary key is unique;
- every foreign key resolves — 62 FK columns, composite keys included (`DOCUMENT → DOCUMENT_SLOT`, `BILINGUAL_PARAGRAPH → BILINGUAL_DOCUMENT`), and `rule_code` against `LEGAL_RULE`'s unique key;
- every *Req* column is filled, except the 6 listed in *Type conflicts* of `04-data-model.md` (required by the function, optional in storage);
- every enum value is in the declared set;
- timestamps are in order (request sent → responded → confirmed; notice drafted → sent → received → replied; notification created → read);
- no published location lacks a verified authority contact (M3 BR-004);
- regenerating produces **byte-identical files** — the Session 6 smoke test T2.

**Last run: PASS.** Two negative tests were run to prove the check bites: a province id of 99 was reported as an unresolved FK, and a hand-edited file was reported as non-deterministic.

**File convention:** header row in logical-model column order · rows sorted by primary key · ISO dates `YYYY-MM-DD` and timestamps `YYYY-MM-DDThh:mm:ss+07:00` · dot decimals · UTF-8 · LF · arrays and objects as compact JSON in the cell.

## The story in the data

The rows tell the same story as the 20 mockups: *The Last Ferry* (Harbour Line Films, Korea, segment A, first shooting day 2027-03-15, 7-day buffer, readiness 58 % on the last snapshot). Tràng An is shortlisted as primary, Ninh Bình acknowledged the notice on 18/09, Bến Xưa Production Services has **accepted** the request and waits for confirmation, 6 of 14 script paragraphs are proofread, and the dossier stands at application *present*, script *needs fixing*, service agreement *pending*, Article 9 undertaking *missing*.

## Row kinds per table

Every table has ordinary rows (1). The other three kinds:

| Table | (2) Boundary | (3) Empty case | (4) Exceptional state |
|---|---|---|---|
| user_account | 254-character e-mail (64-character local part) | `okafor`: no project he owns, no notification | `rossi`: e-mail not verified |
| profile | 120-character full name | staff and partner profiles: no producer organisation | unverified account's profile |
| producer_organisation | 200-character name, 300-character website | Kestrel Pictures: no project | Rossi Film: only member unverified |
| consent | version `2026.2-rev-a-final-1` (20 chars, the maximum) | — (every account consents at sign-up) | `park`: re-consent to a new version |
| notification | payload with nested JSON | `okafor`: none | `n7`: alert about a bounced e-mail |
| email_delivery | — | `e5`: no linked notification | `e4`: bounced |
| segment_rule | — | `r0`: never used by a decision | `r0`: superseded version 2025.12 |
| segment_requirement | — | C / ART13_LICENCE: *not needed* | — (no status column) |
| segment_decision | empty `q4_needs` | guest session, no project | answers match no rule (no segment); override A → B |
| project | 200-char name, 500-char logline, 0 days in Vietnam, buffer 0, 2031-12-31 | `Monsoon Signal`: no date, no member but owner, no document | `Quiet Harbour Blues`: safe deadline already passed; `Harbour Lights`: archived |
| project_member | — | projects with only an owner | invitation to an address with no account (`pending`) |
| project_province | — | projects with none | — (no status column) |
| readiness_snapshot | 0.00 and 100.00 | `Monsoon Signal`, `Harbour Lights`: no snapshot | — (no status column) |
| rule_set_version | — | 2026.06: no run applied it | — (no status column) |
| legal_rule | 200-character title | `A9-RELIG`: never cited by a pre-check | `A9-DRUG`, `A9-HERIT`: draft, no citation, no approver |
| precheck_run | all flags `unsure` | `g-fr`: no finding | `g-dropped`: every finding dropped, no attention level |
| precheck_finding | span starting at 0 | — | — (no status column) |
| compliance_run | — | `sapa-a`: no finding | older run on an older rule-set version |
| compliance_finding | — | — | `open` findings next to `reviewed` ones |
| province | *Thành phố Hồ Chí Minh* (longest) | 25 provinces with no location | merged units with `merged_from` (M3 BR-006) |
| location | 200-char names; Cà Mau, southernmost (8.615°) | Tam Cốc, Cà Mau Cape: no image | Mũi Né: contact unverified, publishing blocked |
| location_image | — | Tam Cốc, Cà Mau Cape: no image | `rejected`: usage right unclear |
| authority_contact | verified in 2016 (older than the 12-month cycle) | contacts without e-mail | Mũi Né: not verified |
| project_shortlist | — | `Monsoon Signal`, `Harbour Lights`: none | — (no status column) |
| organisation | 200-char name, all 12 groups, all 34 provinces, founded 1990 | Hanoi Grip & Light: no layers, no request, no badge | Sông Hậu: badge expired 2026-08-15 |
| organisation_member_layer | 6 working languages | Hội An Casting House: 0 international projects | — (no status column) |
| organisation_private_layer | — | Hội An Casting House: no rate card | — (no status column) |
| verification_request | 3 references | — | `rejected` with reason; `pending` |
| collab_request | 1000-character note (the maximum) | Hanoi Grip & Light receives none | `declined`, `withdrawn` |
| nda_acceptance | — | `c3`: request with no NDA | `n5`: NDA declined (`accepted = false`) |
| document_access_log | — | documents never viewed | view of an old, replaced version |
| document_type | 76-character Vietnamese name | `PROVINCIAL_NOTICE_COPY`: no slot | segment C only type |
| document_slot | — | slots with no document (`missing`) | `needs_fix`, `pending` |
| document | version 2 | — | version 1 replaced by version 2 |
| bilingual_document | — | `Rice and Salt`: no PDF yet | — (no status column) |
| bilingual_paragraph | 14 paragraphs in one draft | — | `Rice and Salt` paragraph: translation failed (empty target) |
| public_holiday | 2023 (far past) | — | `is_expected = true` (Tết 2027, 05–10/02 as on SC-29) |
| location_interest | — | `Monsoon Signal`: no first shooting day | — (see notices) |
| province_notice | — | `i5`, `i7`: drafted, not reviewed | `bounced`; `cannot_support` |
| consultation_booking | time zone `America/Argentina/ComodRivadavia` | `b4`: no officer yet | `rescheduled` |

**Header-only tables — `location_query`, `collab_message`, `project_glossary`.** No function creates their rows (`02-crud-matrix.md`, anomalies kind 1 and 5). Writing rows would invent behaviour the spec does not have, which is exactly what the process forbids; they stay empty until their open questions are answered.

## Proposed values for enums the spec never declares (OQ-04-15)

Used in the seed so the rows can be written; each needs the owner's confirmation.

| Column | Values used |
|---|---|
| `project.stage` | draft, preparing, archived |
| `location.intake_status` | published, awaiting_contact |
| `location_image.status` | approved, pending, rejected |
| `location.scene_types` | karst, river, village, rice_field, sea, floating_village, cave, jungle, old_town, market, rice_terrace, mountain, dunes, mangrove |
| `organisation.service_groups` (12, from SC-19) | full_production, permits_paperwork, casting, crew, camera_lighting, studios_interiors, location_management, transport_logistics, lodging_catering, interpreting, insurance_legal, post_production |
| `consultation_booking.topic` | dossier, locations, partners, provincial_notice, general |
| `province.region` | north, central, south |
| `legal_rule.topic` | security, history, religion, privacy, dossier, public_order, heritage |

## Scenario coverage

| Scenario ID | Rows that make it runnable | Covered? |
|---|---|---|
| SYS US-1 | user_account `rossi` (unverified) and `park`; profile; producer_organisation; consent | Yes |
| SYS US-2 | authority_contact (10 rows) + accounts with roles guest / member | Yes |
| SYS US-3 | profile.locale `vi` / `en` | Partly — the spec also stores it in a cookie (type conflict) |
| SYS US-4 | notification `n1` + email_delivery `e1` | Yes |
| M1 US-1 | segment_rule `r1`, segment_requirement A, segment_decision for *The Last Ferry* | Yes |
| M1 US-2 | segment_decision `session:7c1e9a40` (override A → B) | Yes |
| M1 US-3 | *Rice and Salt*: decision A then B, documents kept | Yes |
| M0 US-1 | *Monsoon Signal*: new project, owner only | Yes |
| M0 US-2 | *The Last Ferry* dossier slots; *Monsoon Signal* (segment C, no dossier gauge) | Yes |
| M0 US-3 | project_member invitation `pending` | Partly — no function accepts an invitation (OQ-04-10) |
| M2 US-1 | precheck_run `g-us`, `g-vi` with findings; `g-fr` none; `g-dropped` | Yes |
| M2 US-2 | *Rice and Salt*: application only (1 / 4); *The Last Ferry*: script `needs_fix` | Yes |
| M2 US-3 | legal_rule `A9-DRUG` (draft, no citation); approved rules with versions | Yes |
| M2 US-4 | *The Last Ferry*: 2027-03-15, buffer 7 → 27/01/2027 and 16/02/2027 | Yes |
| M2 US-5 | approved rules | **No** — rule ↔ segment is not modelled (implied entity, 01) |
| M3 US-1 | locations with scene types | Partly — no stored query; scoring weights undeclared |
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

**30 scenarios: 25 covered, 4 partly, 1 not covered.** The partial and missing ones point at open questions, not at thin data.
