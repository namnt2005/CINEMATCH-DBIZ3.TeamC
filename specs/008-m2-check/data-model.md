# Data model: Content pre-check and Article 13 dossier check (M2)

Feature: `008-m2-check` · Source of truth: `data/data-model-M2.md`, `data/schema/schema-M2.sql` · Changes D2–D4 decided by Nam Tran (07/11/2026), made **only through the generators** (`tools/dm_model.py`, `tools/dm_model2.py`, `tools/build_schema.py`, `tools/dm_rules.py`, `tools/build_data.py`, `data/seed/generate_seed.py`, `data/seed/seed_rules.py`), never by hand in `data/`. Data owner (Nguyễn Huy Trung) reviews before merge.

## 1. Tables used

| Table | Owner | Use here |
|---|---|---|
| `legal_rule` | M2 | rule revisions (D2, D4) |
| `rule_set_version` | M2 | one row per signature or retirement |
| `precheck_run`, `precheck_finding` | M2 | guest and member pre-checks (D3) |
| `compliance_run`, `compliance_finding` | M2 | project content checks (D5) |
| `project`, `project_member` | M0 | permission, `shoot_date`, `buffer_days`, `segment`, `stage` |
| `document_type`, `document_slot`, `bilingual_paragraph` | M5 | read only — dossier (R8) |
| `public_holiday` | M5 | read only — working days (R4) |
| `collab_request` | M4 | read only — component c, timeline milestone |
| `user_account`, `notification` | SYS | roles; Q3 notifications |
| `audit_log` | M10 | `rule.save`, `rule.revise`, `rule.sign`, `rule.retire` |

## 2. Changed columns and keys

### LEGAL_RULE (D2, D4)

| Column | Type | Required | Change | Rule |
|---|---|---|---|---|
| `revision` | `INTEGER` | Req | **new** | ≥ 1; 1 for a new rule, n+1 for a correction (Q13) |
| `retired_version` | `VARCHAR(20)` | Opt | **new**, FK → `rule_set_version` | set when the revision is retired or replaced; `status = 'retired'` ⇔ `retired_version` not null |
| `keywords_vi`, `keywords_en` | `JSONB` | Opt | **new** | arrays of 1–60-character strings, at most 30 each (D4) |
| `rule_code` | `VARCHAR(40)` | Req | key changed | `UNIQUE (rule_code, revision)` replaces `UNIQUE (rule_code)` |
| `rule_slug` | `VARCHAR(120)` | Req | key changed | `UNIQUE (rule_slug, revision)`; the same slug for every revision of a code |
| `rule_version` | `VARCHAR(20)` | system-set | meaning stated | the version in which **this revision** was signed; empty for a draft |

At most one revision per `rule_code` is `approved`: a partial unique index `uq_legal_rule_one_approved ON legal_rule (rule_code) WHERE status = 'approved'` (SQLite and PostgreSQL both support it; added to the migration and to `lib/db/local-triggers.sql`, and checked by `seed_rules.py`).

Natural key: `rule_code + revision` (OQ-04-24 closed).

### PRECHECK_FINDING (D2, D3)

| Column | Change |
|---|---|
| `rule_id` `UUID` Req, FK → `legal_rule (rule_id)` | **new** — the exact revision cited |
| `rule_code` | **removed** (now from the revision) |
| `quoted_text`, `explanation_vi`, `explanation_en` | **removed** — no text of the summary is stored (Q6); the card shows the revision's own texts |
| PK | `(brief_id, rule_id, span_start)` |
| CHECK | `ck_precheck_finding_span` `span_start >= 0 AND span_end > span_start` replaces the check on `LENGTH(quoted_text)` |

### COMPLIANCE_FINDING (D2)

| Column | Change |
|---|---|
| `rule_id` `UUID` Req, FK → `legal_rule (rule_id)` | **new** — replaces `rule_code` |
| `rule_code` | **removed** |
| `quoted_text` | kept — the passage of the member's own project text, read by project members only (D3) |

### Relationships

`LEGAL_RULE ||..o{ PRECHECK_FINDING` and `LEGAL_RULE ||..o{ COMPLIANCE_FINDING` now through `rule_id`; new `RULE_SET_VERSION |o..o{ LEGAL_RULE` *retires* (through `retired_version`).

### Seed (generator)

- Every existing rule becomes revision 1; findings get the `rule_id` of the revision they cite; precheck findings lose their text columns.
- New rows so that each new rule has data: an **approved rule with a draft revision 2** (the signed text still in force, Q13); `A9-MAP` gets `retired_version` = the version that retired it; one more `rule_set_version` for that retirement if the seed's `2026.08` is not it (the `rule.retire` audit row of 28/08/2026 says it is); keywords on the approved rules in both languages, none on one approved rule (boundary: never matched in fallback).
- `dm_rules.py` evidence: BR-006 becomes *15/03/2027, buffer 7 → recommended 05/01/2027, latest 02/02/2027* and *Quiet Harbour Blues — recommended 08/09/2026 passed* (D1, D8); BR-008 names the revision rows.

## 3. States

### `legal_rule.status` of one revision (FR-003, BR-002, BR-008, Q13)

```text
draft ──sign (citation + approver: CHECK)──▶ approved ──retire──▶ retired
                                               │
       draft revision n+1 ──sign──▶ approved; revision n ──▶ retired (same transaction)
```

- `approved` ⇔ `is_active` (existing CHECK); `approved` ⇒ citation and approver (BR-002 CHECK); `retired` is final; no DELETE.
- Only a `draft` revision is edited; *Create revision* is offered only when the code has an approved revision and no draft.

### Pre-check result (R2 step 7)

| Kept | Dropped | Result |
|---|---|---|
| ≥ 1 | any | level from Q4, cards |
| 0 | 0 | *Low*, *No points needing attention were found under rule set {v}* |
| 0 | ≥ 1 | no level, *Could not check this time* |
| matcher and fallback failed | — | nothing stored, *Could not check right now — your text is kept* |

### `compliance_finding.finding_status`

`open → reviewed` (FR-014), with optional `reviewer_note`; a reviewed finding can be reviewed again only to change the note (status stays `reviewed`).

### Dossier component (R8)

Stored `document_slot.state` (or `missing`), lowered for b (`present → needs_fix` while a paragraph is not reviewed) and c (`present → pending` while no request is `confirmed`).

## 4. Derived values (computed on read, not stored)

| Value | Function | Used by |
|---|---|---|
| `attention_level` | `attentionLevel()` / SQL twin in `app_record_precheck` | SC-48, `precheck_run` |
| `DOSSIER_CHECK` | view `v_dossier_check` | SC-27, M0 Dossier gauge |
| `LICENSING_TIMELINE` | `licensingTimeline()` with `workingDaysBefore()` | SC-29, SC-27 link, SC-12 strip (M5) |
| next `rule_version` | `nextRuleVersion()` / SQL twin | `app_sign_rule`, `app_retire_rule` |

## 5. Validation

| Field | Rule | Error key |
|---|---|---|
| summary | 20–200 words after trimming | `precheck.error.words` |
| `lang` | `en` or `vi` | `precheck.error.lang` |
| `flags.*` | `yes`, `no`, `unsure` | `precheck.error.flags` |
| `rule_code` | 1–40 of `A-Z`, `0-9`, `-`; unique among codes (any revision of another rule) | `legal.error.code` |
| `topic` | one of the 7 topics | `legal.error.topic` |
| `severity` | `notice` or `action` | `legal.error.severity` |
| `title_vi`, `title_en` | 1–200 characters | `legal.error.title` |
| `description_*`, `guidance_*` | 1–4 000 characters* | `legal.error.text` |
| `citation` | ≤ 200 characters; required **to sign** (database CHECK) | `legal.error.citation` |
| `keywords_*` | ≤ 30 items, each 1–60 characters* | `legal.error.keywords` |
| `rule_slug` | from `rule_code` lower-case (`a9-long`), not editable | — |
| `reviewer_note` | ≤ 1 000 characters* | `content.error.note` |
| `shoot_date`, `buffer_days` | through M0 (`buffer_days` 0, 7, 14, 21 on SC-29, M0 question 2 — D10) | M0 keys, `projects.error.buffer_days` |

\* limits the spec does not give; interim (research Open question 10 style).

## 6. Functions (Postgres `SECURITY DEFINER`, `search_path = ''`, each with a node:sqlite twin)

| Function | Who | Does |
|---|---|---|
| `app_save_rule_draft(p_rule_id uuid, p_fields jsonb)` | `vfda_legal` | creates revision 1 (`p_rule_id` null) or edits a draft; audit `rule.save` |
| `app_revise_rule(p_rule_code text)` | `vfda_legal` | copies the approved revision to a new draft n+1; `DRAFT_EXISTS`, `NOT_FOUND`; audit `rule.revise` |
| `app_sign_rule(p_rule_id uuid)` | `vfda_legal` exactly — `admin` refused (D9) | required texts checked; update meets the BR-002 CHECK (`CITATION_REQUIRED`); new version; previous approved revision retired; audit `rule.sign`; returns `{ rule_version, retired_rule_id }` |
| `app_retire_rule(p_rule_id uuid)` | `vfda_legal` exactly — `admin` refused (D9) | approved → retired; new version; audit `rule.retire` |
| `app_record_precheck(p_hash text, p_lang text, p_flags jsonb, p_country text, p_rule_version text, p_project_id uuid, p_findings jsonb)` | System (`service_role` only) | checks every `rule_id` is approved in `p_rule_version`'s set, recomputes the level, writes run and findings |
| `app_save_content_check(p_project_id uuid, p_rule_version text, p_findings jsonb)` | owner or edit, project not archived | `RULE_SET_CHANGED` if not the current version; writes `compliance_run` + findings (`open`) |
| `app_review_finding(p_finding_id uuid, p_note text)` | owner or edit | `open → reviewed`, note |
| `app.next_rule_version()` | internal | D6 label in Vietnam time |

Direct `INSERT`, `UPDATE`, `DELETE` on the six M2 tables are revoked from `anon` and `authenticated` (R6). Notifications of Q3 are written by the System actor after `app_sign_rule` / `app_retire_rule` (R9).

## 7. Read policies (source `tools/rls_policies.py`)

| Table | Who reads today (`20261101000300_grants_rls.sql`) | Change in this feature (at the source, then `build_supabase.py`) |
|---|---|---|
| `legal_rule` | anyone: `approved` and `is_active`; `vfda_legal` (and admin by hierarchy): all revisions | none; direct `INSERT`/`UPDATE` grants revoked in the M2 migration (writes through §6) |
| `rule_set_version` | nobody (no grant, no policy) | **select for `anon`, `signed_in`** — the version label is public (SC-03 #10, SC-48 #2, SC-37 #22) |
| `precheck_run` | nobody | **select for members of the linked project** (`project_id` not null) |
| `precheck_finding` | members of the linked project | none |
| `compliance_run` | nobody | **select for project members** (SC-48 project view; M0 reads through its own functions) |
| `compliance_finding` | project members; update for members | the update grant revoked in the M2 migration (writes through `app_review_finding`) |
| `public_holiday` | signed-in users | none (SC-29 is for members) |
