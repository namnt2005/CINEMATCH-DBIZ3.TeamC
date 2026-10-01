# Spec Document: Content pre-check and Article 13 dossier check

> DBIZ3 Session 4 template — one file per module. Written for a reader who has never seen the DBIZ2 report.

| Field | Value |
|---|---|
| Module ID | M2 |
| Module name | Content pre-check and Article 13 dossier check |
| Spec version | v0.1 |
| Author (team member) | Nam Tran — Group C |
| Date | 22/09/2026 |
| Status | Draft |
| Approved by (Client role) | *Not yet — VFDA project lead (and VFDA Legal Board for legal rules)* |
| DBIZ2 source | Function List rows 24–41 (F-M2-01 .. F-M2-18); Use Case UC-02, UC-03, UC-04, UC-19, UC-21; Screens SC-03, SC-48, SC-27, SC-29, SC-30, SC-31, SC-37 |

## 1. Purpose and scope

This module tells a producer, before they commit, which parts of their story are likely to be looked at closely by the reviewing authority and whether their licence dossier has the four components Article 13 requires. Every finding cites the rule written and signed by the VFDA Legal Board; the system never interprets the law on its own.

**In scope**

- The legal rule base: VFDA Legal Board writes, signs and versions rules.
- The 200-word content pre-check (no sign-up) and its result with highlighted passages and cited findings.
- The deterministic check of the four Article 13 clause 3 dossier components.
- Topic review of a project synopsis against the rule base.
- The public requirements library.
- The 20-day licensing timeline calculation (Article 13 clause 4).

**Out of scope**

- Deciding whether a film is approved — the reviewing authority decides.
- Rewriting the producer's story — the system only shows the rule's own *Points to consider*.
- Submitting the dossier to the Ministry (phase 3 integration).
- Film classification for release in Vietnam (M9, phase 2).

**Depends on**

- SYS (roles, notifications)
- M0 (compliance gauge)
- M5 (uploaded documents, countdown screen)
- M4 (service agreement status for component c)
- External: language model API

## 2. Actors

| Actor | Role in this module | Where it comes from |
|---|---|---|
| Guest | Primary — runs the 200-word pre-check | Function List (F-M2-05, 15, 16) |
| Member | Primary — runs checks on a project, marks findings reviewed | Function List (F-M2-09, 13, 14, 18) |
| VFDA Legal Board (`vfda_legal`) | Primary — writes, signs and versions rules | Function List (F-M2-01..03) |
| System | Runs the checks, verifies citations, computes timelines | Function List (F-M2-04, 06–08, 10–12, 17) |

## 3. User scenarios and acceptance criteria

### US-1 (P1): Pre-check my story without signing up

**Journey.** As an international producer, I want to paste a 200-word summary and see which topics may be scrutinised, so that I can prepare before I invest.

**Acceptance scenarios**

1. **Given** a guest with a 96-word summary, **When** they click *Check content*, **Then** within 30 seconds they see an attention level (Low / Medium / High), the highlighted passages and one card per finding.
2. **Given** a finding produced by the model whose rule code is not in the approved rule base, **When** results are verified, **Then** the finding is dropped and never shown (F-M2-12).
3. **Given** no findings, **When** the result is shown, **Then** it reads *No points needing attention were found under rule set 2026.08* and never *approved* or *compliant* (BR-003).

### US-2 (P1): Know whether my dossier is complete

**Journey.** As a producer, I want to see which of the four Article 13 components I still miss, so that I do not submit an incomplete dossier and lose the 20 days.

**Acceptance scenarios**

1. **Given** a project with the application form uploaded and nothing else, **When** the check runs, **Then** it shows 1 / 4 and *Not ready to submit*, and lists the three missing components.
2. **Given** a Vietnamese synopsis with paragraphs not yet proofread, **When** the check runs, **Then** component b shows *Needs fixing*, not *Present*.

### US-3 (P1): VFDA Legal Board signs a rule

**Journey.** As a member of the VFDA Legal Board, I want to write and sign rules myself, so that VFDA — not the developers — owns what the product says about the law.

**Acceptance scenarios**

1. **Given** a draft rule without a citation, **When** the officer clicks *Approve and sign*, **Then** the database rejects activation and the citation field is highlighted.
2. **Given** a rule with a citation, **When** it is approved, **Then** a new rule-set version is created and every later check records that version.

### US-4 (P2): See my licensing timeline

**Journey.** As a producer, I want to know the latest safe date to file, so that a resubmission does not push my shoot.

**Acceptance scenarios**

1. **Given** a first shooting day of 15/03/2027 and a 7-day buffer, **When** the timeline is computed, **Then** the safe submission deadline is 27/01/2027 and the latest deadline is 16/02/2027.

### US-5 (P3): Read requirements without an account

**Journey.** As a visitor, I want to browse the requirements by topic, so that I understand the rules before using the tools.

**Acceptance scenarios**

1. **Given** the requirements library, **When** a visitor filters by segment A, **Then** only approved rules for segment A are listed, each with its bilingual description and citation.

### Edge cases

- The language model API is down: the pre-check shows *Could not check right now — your text is kept*; the dossier completeness check (deterministic) still works.
- Every finding fails citation verification: the result says *Could not check this time* rather than showing an empty *Low* result.
- The rule set changes while a producer is reading an old result: the old result keeps its version label; [NEEDS CLARIFICATION: re-run automatically or notify?].
- A guest runs the pre-check 50 times in an hour: rate limit per IP returns *You have used today's checks — create a free account to continue*.

## 4. Flows

### 4.1 Usage flow — VFDA Legal Board

> Textualised from `docs/architecture/usage-flow.md` flow 5, translated to English. Diamonds Q1, Q2 were added in Step 3 from F-M2-02/03 — confirmed by the Client.

```mermaid
flowchart TD
    S([Sign in with role vfda_legal]) --> L[M2 · Legal rule base screen]
    L --> N[Write a new rule]
    N --> Q1{Citation filled in?}
    Q1 -- Not yet --> BLOCK[System refuses to activate - database constraint] --> N
    Q1 -- Yes --> Q2{Signed by an approver?}
    Q2 -- Not yet --> DRAFT[Kept as Draft] --> N
    Q2 -- Yes --> ACT[Rule activated - new rule-set version]
    ACT --> E([Every later check uses this version])
```

### 4.1b Usage flow — dossier loop (excerpt of the producer journey)

> Excerpt of `usage-flow.md` flow 1 (nodes DOS, CHK, Q4, NOTI). Diamond Q4 added in Step 3. Confirmed by the Client.

```mermaid
flowchart TD
    DOS[M5 · Four-component dossier · bilingual draft · countdown] --> CHK[M2 · Dossier check + topic review]
    CHK --> Q4{All four Article 13 components present?}
    Q4 -- Not yet --> DOS
    Q4 -- Yes --> NOTI([M7 · Notify provincial People's Committee])
```

### 4.2 Sequence — 200-word pre-check (SEQ-02)

> Textualised from SEQ-02 (Figure 5). 5 participants, 11 messages, translated to English.

```mermaid
sequenceDiagram
    actor GU as Guest
    participant FE as Next.js app
    participant EF as Edge Function
    participant DB as Supabase PostgreSQL + RLS
    participant AI as Language model API

    GU->>FE: Paste a summary of up to 200 words
    FE->>FE: Check the rate limit
    FE->>EF: preCheck(text)
    EF->>DB: Read approved legal_rules
    DB-->>EF: Rules + citations
    EF->>AI: Call the model with the rule set, structured output
    AI-->>EF: findings[] (rule_code, quoted_text)
    EF->>EF: Drop findings whose quote does not exist
    EF->>DB: Write a record to briefs
    EF-->>FE: Topics needing attention
    FE-->>GU: Show warnings with the cited article
    Note over EF: Never concludes approved or not — only raises points for a human to consider
```

### 4.3 Sequence — Article 13 completeness check (SEQ-08)

> Textualised from SEQ-08 (Figure 11). 4 participants, 12 messages.

```mermaid
sequenceDiagram
    actor U as Producer
    participant FE as Next.js app
    participant ST as Supabase Storage
    participant DB as Supabase PostgreSQL + RLS

    U->>FE: Open the project's document kit
    FE->>DB: SELECT required_documents for the segment
    DB-->>FE: The four required components
    FE-->>U: Checklist with the status of each item
    U->>FE: Upload the application form and the service agreement
    FE->>ST: Store the documents
    ST-->>FE: Paths
    FE->>DB: INSERT documents
    FE->>DB: check_dossier_completeness(project_id)
    DB->>DB: Compare documents present with the checklist
    DB-->>FE: 2 of 4 present · missing: Vietnamese script, Article 9 commitment
    FE-->>U: List of missing components
    Note over DB: Deterministic logic, no language model
```

### 4.4 Sequence — topic review of a project (SEQ-09)

> Textualised from SEQ-09 (Figure 12). 5 participants, 12 messages. None of the three DBIZ2 sequences draws an error branch — see open question 6.

```mermaid
sequenceDiagram
    actor U as Producer
    participant FE as Next.js app
    participant EF as Edge Function
    participant DB as Supabase PostgreSQL + RLS
    participant AI as Language model API

    U->>FE: Run a content check for the project
    FE->>EF: reviewTopics(project_id)
    EF->>DB: SELECT legal_rules WHERE approved_by IS NOT NULL
    DB-->>EF: Rule set + version number
    EF->>AI: Compare the synopsis with the rule catalogue
    AI-->>EF: findings[] with quoted_text
    EF->>EF: Drop unknown rule codes and quotes that do not exist
    EF->>DB: INSERT compliance_runs (rule_version)
    EF->>DB: INSERT compliance_findings
    EF-->>FE: Filtered findings
    FE-->>U: Show with the cited article and the disclaimer
    U->>FE: Mark each finding as reviewed
    Note over EF: No warning is ever shown without a cited article
```

## 5. Functional requirements

| FR ID | DBIZ2 Subfunction ID | Requirement (system MUST ...) | Actor | Priority |
|---|---|---|---|---|
| FR-001 | F-M2-01 | The system MUST list legal rules, filterable by topic and status, to the VFDA Legal Board. | VFDA Legal | Must |
| FR-002 | F-M2-02 | The system MUST let the VFDA Legal Board create and edit rules with bilingual title, description and *Points to consider*, a citation and a severity. | VFDA Legal | Must |
| FR-003 | F-M2-03 | The system MUST activate a rule only after an approver signs it; a rule without a citation or an approver MUST NOT become active (database constraint). | VFDA Legal | Must |
| FR-004 | F-M2-04 | The system MUST create a new rule-set version on every activation and record the version used by every check. | System | Must |
| FR-005 | F-M2-05 | The system MUST accept a summary of 20–200 words from a guest without sign-up, rate-limited per IP. | Guest | Must |
| FR-006 | F-M2-06 | The system MUST compare the summary with the active rule set and return findings, each with rule code, quoted passage and explanation, plus an attention level (Low / Medium / High). | System | Must |
| FR-007 | F-M2-07 | The system MUST record every pre-check (hash, language, time) as a demand data point. | System | Must |
| FR-008 | F-M2-08 | The system MUST check the four Article 13 clause 3 components deterministically, without a language model. | System | Must |
| FR-009 | F-M2-09 | The system MUST show which components are missing, with a status and an action for each. | Member | Must |
| FR-010 | F-M2-10 | The system MUST push the completeness result to the dashboard's compliance gauge. | System | Must |
| FR-011 | F-M2-11 | The system MUST call the language model with only the codes of approved rules and require structured output. | System | Must |
| FR-012 | F-M2-12 | The system MUST drop every finding whose rule code is unknown or whose quoted text does not appear in the submitted text. | System | Must |
| FR-013 | F-M2-13 | The system MUST show every finding with its citation and never show a finding without one. | Member | Must |
| FR-014 | F-M2-14 | The system MUST let a member mark each finding as reviewed, with an optional note. | Member | Must |
| FR-015 | F-M2-15 | The system SHOULD publish the approved rules as a public library filterable by topic and segment. | Guest | Should |
| FR-016 | F-M2-16 | The system SHOULD publish one page per rule with its bilingual description and citation. | Guest | Should |
| FR-017 | F-M2-17 | The system MUST compute the safe and latest submission deadlines from the first shooting day, the safety buffer and Article 13 clause 4 (20 + 20 days). | System | Must |
| FR-018 | F-M2-18 | The system MUST always show both scenarios: smooth path and one resubmission. | Member | Must |

### 5.1 Input / Output contract

Types and required flags come from `docs/function-list.md` (columns *Input — type and required* and *Output — type*). Changes made in Session 4 are stated in *Notes* and listed in 11.1.

| FR ID | Input field | Type | Required | Output field | Type | Notes / validation |
|---|---|---|---|---|---|---|
| FR-001 | `filter_topic` | `ENUM(security, history, religion, privacy, dossier, public_order, heritage)` | No | `rules` | `legal_rule[]` | vfda_legal only (RLS) |
|  | `filter_status` | `ENUM(draft, approved, retired)` | No |  |  |  |
| FR-002 | `rule_code` | `VARCHAR(40)` | Yes | `rule_id` | `UUID` | guidance fields added (SC-48 *Points to consider*); severity reduced to two values — see §11 |
|  | `topic` | `ENUM(security, history, religion, privacy, dossier, public_order, heritage)` | Yes | `version` | `INTEGER` |  |
|  | `title_vi` | `VARCHAR(200)` | Yes |  |  |  |
|  | `title_en` | `VARCHAR(200)` | Yes |  |  |  |
|  | `description_vi` | `TEXT` | Yes |  |  |  |
|  | `description_en` | `TEXT` | Yes |  |  |  |
|  | `guidance_vi` | `TEXT` | Yes |  |  |  |
|  | `guidance_en` | `TEXT` | Yes |  |  |  |
|  | `citation` | `VARCHAR(200)` | Yes |  |  |  |
|  | `severity` | `ENUM(notice, action)` | Yes |  |  |  |
| FR-003 | `rule_id` | `UUID` | Yes | `approved_at` | `TIMESTAMPTZ` | CHECK: citation and approver not null |
|  | `approver_id` | `UUID` | Yes | `is_active` | `BOOLEAN` |  |
| FR-004 | `rule_change_event` | `JSONB` | Yes | `rule_version` | `VARCHAR(20)` | format [NEEDS CLARIFICATION] |
| FR-005 | `synopsis_text` | `TEXT` | Yes | `form_state` | `JSONB` | 20–200 words; flags = real_person, military, heritage_site (yes / no / unsure) |
|  | `lang` | `ENUM(en, vi)` | Yes |  |  |  |
|  | `flags` | `JSONB` | No |  |  |  |
| FR-006 | `synopsis_text` | `TEXT` | Yes | `findings` | `(rule_code VARCHAR(40), quoted_text TEXT, explanation_vi TEXT, explanation_en TEXT)[]` | attention_level added (SC-48) |
|  | `active_rules` | `legal_rule[]` | Yes | `attention_level` | `ENUM(low, medium, high)` |  |
| FR-007 | `synopsis_hash` | `TEXT` | Yes | `brief_id` | `UUID` | text itself not stored for guests [NEEDS CLARIFICATION] |
|  | `locale` | `ENUM(vi, en)` | Yes |  |  |  |
|  | `country_guess` | `VARCHAR(2)` | No |  |  |  |
| FR-008 | `project_id` | `UUID` | Yes | `completeness_pct` | `NUMERIC(5,2)` | exactly 4 components |
|  |  |  |  | `missing_documents` | `doc_code VARCHAR(40)[]` |  |
| FR-009 | `missing_documents` | `doc_code[]` | Yes | `checklist_view` | `JSONB` | status per component: present / needs_fix / pending / missing |
| FR-010 | `completeness_pct` | `NUMERIC(5,2)` | Yes | `gauge_compliance` | `NUMERIC(5,2)` |  |
| FR-011 | `synopsis` | `TEXT` | Yes | `raw_findings` | `JSONB` | structured output only |
|  | `active_rules` | `legal_rule[]` | Yes |  |  |  |
| FR-012 | `raw_findings` | `JSONB` | Yes | `verified_findings` | `JSONB` | dropped findings logged for VFDA |
|  | `synopsis` | `TEXT` | Yes | `dropped_count` | `INTEGER` |  |
| FR-013 | `verified_findings` | `JSONB` | Yes | `findings_view` | `JSONB` | citation mandatory per item |
| FR-014 | `finding_id` | `UUID` | Yes | `finding_status` | `ENUM(open, reviewed)` |  |
|  | `reviewer_note` | `TEXT` | No |  |  |  |
| FR-015 | `topic` | `VARCHAR(60)` | No | `rules` | `legal_rule_public[]` | approved rules only |
|  | `segment` | `ENUM(A, B, C)` | No |  |  |  |
| FR-016 | `rule_slug` | `VARCHAR(120)` | Yes | `rule_detail` | `JSONB` |  |
| FR-017 | `shoot_date` | `DATE` | Yes | `submit_by` | `DATE` | buffer_days default 7 (added, SC-29) |
|  | `buffer_days` | `INTEGER` | Yes | `result_by` | `DATE` |  |
|  |  |  |  | `result_by_worst` | `DATE` |  |
| FR-018 | `milestones` | `JSONB` | Yes | `timeline_view` | `JSONB` | both scenarios always shown |

### 5.2 Business rules

| Rule ID | Rule | Why it exists |
|---|---|---|
| BR-001 | Every finding shown to a user cites a rule written and signed by the VFDA Legal Board; findings without a valid citation are dropped by code before display. | The product must never invent law. |
| BR-002 | A rule becomes active only when it has a citation **and** an approver; this is enforced by a database CHECK constraint. | Signing is VFDA's act, not the developers'. |
| BR-003 | The words *approved*, *accepted*, *legally compliant* and *safe* never appear in results, including when nothing is found. | Only the competent authority decides. |
| BR-004 | The attention level is derived deterministically from the number and severity of verified findings, never from a model score. | A precise-looking number from a model gives false certainty. |
| BR-005 | The dossier completeness check uses fixed rules, not a language model. | A missing document is a fact, not a judgement. |
| BR-006 | Safe deadline = first shooting day − buffer − 20 − 20 days; latest deadline = first shooting day − buffer − 20 days. | Article 13 clause 4: 20 days, plus up to 20 more if the script must be revised. |
| BR-007 | Every check stores the rule-set version it used. | An old result must remain explainable after rules change. |
| BR-008 | Legal rules are retired, never deleted (`status = retired`); a finding keeps showing the text of the rule version it cited. | An old result must remain explainable after a rule changes (see BR-007). |

## 6. Key entities

| Entity | Attributes (from Input/Output fields) | Relationships |
|---|---|---|
| LegalRule | rule_id, rule_code, title_vi/en, description_vi/en, guidance_vi/en, citation, severity, status, approved_by, approved_at | belongs to RuleSetVersion |
| RuleSetVersion | rule_version, created_at, created_by | has many LegalRules |
| PrecheckRun (brief) | brief_id, synopsis_hash, lang, flags, attention_level, rule_version, created_at | has many PrecheckFindings; may belong to a Project |
| PrecheckFinding | rule_code, quoted_text, span_start, span_end, explanation | belongs to PrecheckRun |
| ComplianceRun | run_id, project_id, rule_version, run_at | has many ComplianceFindings; belongs to Project |
| ComplianceFinding | finding_id, rule_code, quoted_text, finding_status, reviewer_note | belongs to ComplianceRun |
| DossierCheck | project_id, checked_at, completeness_pct, missing_documents | derived from DocumentSlots (M5) |
| LicensingTimeline | project_id, submit_by, result_by, result_by_worst, buffer_days | derived from Project.shoot_date |

### 6.1 Attribute types

Types and required flags of the attributes above that no field in 5.1 declares (keys, timestamps, stored statuses). Every column of the data model now has a declared type.

| Entity | Attribute | Type | Required | Notes |
|---|---|---|---|---|
| RuleSetVersion | `created_at` | `TIMESTAMPTZ` | Yes | time of the activation that created the version (FR-004) |
| RuleSetVersion | `created_by` | `UUID` | Yes | the Legal Board member who activated it |
| PrecheckRun | `project_id` | `UUID` | No | empty for a guest pre-check (US-1) |
| PrecheckRun | `created_at` | `TIMESTAMPTZ` | Yes |  |
| PrecheckFinding | `span_start` | `INTEGER` | Yes | character position of the quoted passage in the submitted summary (0-based) |
| PrecheckFinding | `span_end` | `INTEGER` | Yes | span_start + number of characters of quoted_text |
| ComplianceRun | `run_id` | `UUID` | Yes | identifier |
| ComplianceRun | `project_id` | `UUID` | Yes |  |
| ComplianceRun | `run_at` | `TIMESTAMPTZ` | Yes |  |
| ComplianceFinding | `run_id` | `UUID` | Yes |  |

## 7. Screens involved

| Screen ID | Screen name | Priority | Screen Spec file |
|---|---|---|---|
| SC-03 | Script content input (200-word pre-check) | Must | `docs/screens/screen-spec-SC-03.md` |
| SC-48 | Content check results | Must | `docs/screens/screen-spec-SC-48.md` |
| SC-27 | Article 13 dossier completeness check | Must | `docs/screens/screen-spec-SC-27.md` |
| SC-29 | 20-day countdown | Must | `docs/screens/screen-spec-SC-29.md` |
| SC-37 | Admin — Legal rule base | Must | `docs/screens/screen-spec-SC-37.md` |
| SC-30 | Requirements library | Should | `docs/screens/screen-spec-SC-30.md` |
| SC-31 | Requirement detail | Should | `docs/screens/screen-spec-SC-31.md` |

## 8. Success criteria

| SC ID | Criterion | How it is measured |
|---|---|---|
| SC-001 | A guest gets a pre-check result for a 200-word summary in under 30 seconds. | Timed on 20 sample summaries. |
| SC-002 | No finding is ever shown without a citation to an approved rule. | Audit 100 results: count findings without a valid rule code (target 0). |
| SC-003 | A producer can name their missing Article 13 components after one visit to the check screen. | Task walkthrough with 5 producers. |
| SC-004 | The VFDA Legal Board can add and sign a rule without developer help. | Observed session with one VFDA officer. |
| SC-005 | The deadlines shown on the dashboard, the check screen and the countdown are always identical. | Compare three screens on 20 projects. |

## 9. Assumptions

- The rule base starts with about 25 rules written by the VFDA Legal Board before launch.
- Content risk is assessed against Article 9 (prohibited content); dossier completeness against Article 13 clause 3 — see open question 1.
- Deadlines are computed in calendar days until the Legal Board confirms otherwise.
- Test values used until the VFDA Legal Board confirms: the 20 days of Article 13 clause 4 are calendar days (BR-006); attention level Low = no *action* finding and at most 2 *notice* findings, Medium = 1 *action* finding or 3 or more *notice* findings, High = 2 or more *action* findings.

## 10. Open questions

| # | Question | Blocking? | Owner | Status |
|---|---|---|---|---|
| 1 | [NEEDS CLARIFICATION: Is the 20-day period in Article 13 clause 4 calendar days or working days?] *(also raised in SC-27)* | Yes | Client (VFDA Legal Board) | Open |
| 2 | [NEEDS CLARIFICATION: Must rule signing require two different people (author ≠ approver)?] *(also raised in SC-37)* | Yes | Client (VFDA Legal Board) | Open |
| 3 | [NEEDS CLARIFICATION: When the rule set gets a new version, are open projects re-checked automatically or only notified?] | Yes | Client (VFDA) | Open |
| 4 | [NEEDS CLARIFICATION: Thresholds that turn findings into Low / Medium / High.] *(also raised in SC-48)* | Yes | Client (VFDA Legal Board) | Open |
| 5 | [NEEDS CLARIFICATION: None of SEQ-02, SEQ-08, SEQ-09 draws an error branch (model down, file too large). Confirm the behaviour in the edge cases.] | No | Client (VFDA) | Open |
| 6 | [NEEDS CLARIFICATION: How long is a guest's pre-check text kept, and may it be used to improve the rule base?] *(also raised in SC-03)* | Yes | Client (VFDA) | Open |
| 7 | [NEEDS CLARIFICATION: daily pre-check limit per IP] *(from SC-03)* | No | Group C | Open |
| 8 | [NEEDS CLARIFICATION: the specific clause of Article 9 for each rule is to be filled in `legal_rule.citation` by the VFDA Legal Board; the mockup only goes to Article level] *(from SC-48)* *(also raised in SC-31)* | No | Client (VFDA Legal Board) | Open |
| 9 | [NEEDS CLARIFICATION: which application form is currently in force, and may VFDA provide a bilingual version of it] *(from SC-27)* | Yes | Client (VFDA) | Open |
| 10 | [NEEDS CLARIFICATION: F-M2-15 filters by segment, but a legal rule has no segment field (M2 §6). Who decides which rules apply to segments A, B and C, and where is it stored?] *(from SC-30)* | No | Client (VFDA Legal Board) | Open |
| 11 | [NEEDS CLARIFICATION: M2 §5.1 declares the public `topic` filter as `VARCHAR(60)` while the rule base uses the 7-value topic enum; confirm the library uses the same enum] *(from SC-30)* | No | Group C | Open |
| 12 | [NEEDS CLARIFICATION: should the public rule page list earlier versions of the rule and what changed between them?] *(from SC-31)* | No | Client (VFDA Legal Board) | Open |
| 13 | [NEEDS CLARIFICATION: when an approved rule needs a correction, is a new draft revision created while the signed text stays in force, and does retiring a rule also create a new rule-set version?] *(from SC-37)* | Yes | Client (VFDA Legal Board) | Open |
| 14 | [NEEDS CLARIFICATION: format of `rule_version` (the mockups use year.month, e.g. 2026.08) when more than one rule is signed in the same month] *(from SC-37)* | No | Group C | Open |

## 11. Traceability to DBIZ2

| Spec section | DBIZ2 source | Location |
|---|---|---|
| 1. Purpose | System Design v2.0 — 1. Schematic, §1.2 (M2) | `docs/architecture/context.md` |
| 4.1 Usage flow | Usage Flow FLOW-01 flows 1 and 5 (Figure 3) + Step 3 additions | `docs/architecture/usage-flow.md` §1, §5 |
| 4.2–4.4 Sequences | SEQ-02 (Fig. 5), SEQ-08 (Fig. 11), SEQ-09 (Fig. 12) | `docs/architecture/sequence-diagrams.md` |
| 5. Functional requirements | Function List rows 24–41 | `docs/function-list.md` rows 24–41 |
| 5.2 BR-006 | Cinema Law 2022 (Law No. 05/2022/QH15), Article 13 clause 4 | legal source |
| 7. Screens | Screen List SC-03, SC-27, SC-29, SC-30, SC-31, SC-37, SC-48 | `docs/screen-list.md` §1 |

### 11.1 Reconciliation with DBIZ2 (System Design v2.0)

Where the 20-screen design or this spec differs from the DBIZ2 Function List, the difference is written here instead of being silently changed.

| Topic | DBIZ2 / System Design v2.0 | This spec | Status |
|---|---|---|---|
| Pre-check result screen | Result shown inside SC-03 | Separate screen SC-48 (screen list items #6, #7) | Changed — new Screen ID |
| Rule severity | ENUM(info, notice, action) | ENUM(notice, action) — the screens show only *Needs attention* / *Action required* | Changed — Confirmed by the Client |
| Rule guidance | not in DBIZ2 | guidance_vi / guidance_en added to show *Points to consider* (SC-48) | Added — Confirmed by the Client |
| F-M2-15, F-M2-16 priority | Must | Should — screens SC-30 / SC-31 are not in the 20-screen set | Changed — Confirmed by the Client |

## Completion checklist

- [x] Every subfunction of this module in the DBIZ2 Function List appears as an FR row (18 of 18, rows 24–41) — machine-checked.
- [x] Every Input and Output field has a type and a required flag — machine-checked.
- [x] Every Mermaid block renders without an error — rendered with mermaid-cli 11.14 on 22/09/2026.
- [x] Every node and arrow in the Mermaid flow exists in the original DBIZ2 diagram, and nothing was invented. Diagrams marked *Derived* and decision diamonds added in Step 3 are labelled above and were confirmed by the Client.
- [x] At least one business rule is written that is not visible in any diagram (see 5.2).
- [x] Every screen this module touches is listed with an existing Screen Spec file.
- [x] Success criteria contain no technology words — machine-checked against a word list.
- [x] Open questions carry the unresolved items from the Session 3 scope review (recorded in `docs/prd.md` section 5) and every point found while writing this spec; each has an owner.
- [x] The traceability table points to real files and figures, not "see the report".

---
*Template source: adapted from GitHub Spec Kit `templates/spec-template.md`, mapped onto the DBIZ2 Product Design Package. DBIZ3, VJCBI College — FTU. Group C · CINEMATCH.*
