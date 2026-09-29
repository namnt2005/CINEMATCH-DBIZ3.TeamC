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
| 1. Completeness | **Fail** | SYS §5.1 FR-010 outputs `search_vector TSVECTOR` and FR-011 `embedding VECTOR(n)` for location and supplier descriptions; 02 records F-SYS-11 updating LOCATION and ORGANISATION_MEMBER_LAYER, but neither column exists in 04. Other outputs with no home are runtime-only by their own description (SYS FR-004 `access_granted`, M1 FR-003 `data_retained`, M4 FR-007 `similarity`) or live in Supabase Auth (SYS FR-002 `session_token`, SYS §5.2 BR-004). | Add `search_vector` to LOCATION and `embedding` to LOCATION and ORGANISATION_MEMBER_LAYER, types copied from SYS FR-010/011 (`n` stays). |
| 2. Correctness | **Fail** | 03 says *"Each profile works for exactly one producer organisation"* (from SYS FR-001 `org_name Req`), but staff and partner accounts are created by an admin, not through sign-up (SYS §5.2 BR-002) — the seed has 7 such profiles with no organisation. The other 59 relationships match the wording of their cited evidence, e.g. *"a notice ... is drafted"* when the interest is saved (M7 §3 US-1) → 1:1. | Change PROFILE's side of `PRODUCER_ORGANISATION ||..|{ PROFILE` to zero-or-one (`|o..o{`), in 03 and 04 together. |
| 3. Minimality | **Fail** | `PROVINCE_NOTICE.province_id` is derivable through LOCATION_INTEREST → LOCATION (M7 §6); `LEGAL_RULE.is_active` duplicates `status = approved` (M2 FR-003); `BILINGUAL_DOCUMENT.watermark` is *"always true"* (M5 FR-005). The four entities the specs call *derived* were correctly kept out of the tables. | Drop the three columns, or keep them only with a written reason. |
| 4. Readability | **Fail** | The conceptual ERD has 43 entities and 60 relationships in one diagram. Each relationship has a forward and reverse sentence in plain English (03, `%%` lines), but the drawing itself cannot be followed unaided by a non-technical reader. | Add one small view per module (the same lines, filtered) under `docs/architecture/`; keep 03 as the single source. |
| 5. Extensibility | **Pass** | Business case tested: **M6 entry logistics — temporary import of filming equipment** (Won't now, phase 2, docs/mvp-scope.md §4). It adds new entities hanging off PROJECT (an equipment list and a customs declaration) and new DOCUMENT_TYPE rows with basis `law` or `common`; no existing table or relationship changes. | — |
| 6. Integration | **Fail** | BOUNDARY: passwords and tokens stay in Supabase Auth (SYS BR-004) — USER_ACCOUNT has no password column ✓; Resend's `provider_message_id` is kept ✓. But SCREENS disagree with FIELDS in three places: SC-25 writes `status = closed` (not in M4 FR-014's enum), SC-27 reads `document_slots.status` (FIELDS: `state`), SC-19 reads `organizations` / `service_categories`. And M5 FR-002 declares `file BYTEA` while storage is Supabase Storage (M5 §1 Depends on). | Correct the three Screen Specs to the logical names; declare the document as a storage path, not bytes (01 conflicts). |
| 7. Traceability | **Fail** | 282 of 285 columns cite a FIELDS row or a §6 attribute. Three key columns cite nothing because the specs declare no identifier: `EMAIL_DELIVERY.email_delivery_id`, `SEGMENT_DECISION.segment_decision_id`, `LOCATION_QUERY.location_query_id`. 70 columns cite an attribute but carry *type not declared*. | Declare the three identifiers and the 70 types in the owning specs' §5.1. |

**Result: 1 Pass, 6 Fail, 0 Not assessed** — every slot the criteria need was present in the INPUT MAP.

### A Pass we challenge (human gate 6)

**5. Extensibility** — We challenge our own Pass. Test a second case the specs already hint at: **a co-production with two producer organisations** (M1 §5.1 FR-002 offers `q3_producer = coproduction`; whether it is segment A or B is not decided yet). PROJECT belongs to exactly one PRODUCER_ORGANISATION, and PROJECT_MEMBER links people, not companies — so a co-production needs a new associative entity between PROJECT and PRODUCER_ORGANISATION and a change to the RLS of every project-owned table. That is a structural change. Verdict after challenge: **Pass for M6, Fail for co-production**; the co-production question is added to M1 §10 as blocking before any project table is built.

The team must challenge at least one more Pass or Fail in class before signing below.

## Seed coverage (from S5)

30 acceptance scenarios: **25 runnable, 4 partly, 1 not runnable** (M2 US-5: rule ↔ segment is not modelled). `check_seed.py`: PASS — 43 tables, 374 rows, 62 foreign-key columns resolve, generation is deterministic. Full table in `seed/README.md`.

## Consolidated open questions

_Open questions are tracked outside this repository until they are resolved._

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
