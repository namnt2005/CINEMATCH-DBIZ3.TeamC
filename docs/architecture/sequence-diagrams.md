# Sequence Diagrams — CINEMATCH

> Source: System Design v2.0. Diagram images: `diagrams/SEQ-01_Sign-up-and-log-in.png` to `diagrams/SEQ-12_Demand-index-and-quarterly-report.png` (see `diagrams/README.md`).
> Rule applied (Pattern 4): **a participant must be a real part of the system, not a job title**.
> A solid arrow `->>` is a call, a dashed arrow `-->>` is a return value, and `Note over` is a rule attached to a step.
>
> Step 3 guidance, section 5.4, requires `alt / else` for error branches. The sequences below **keep the
> sequential structure of the original images** because the original images do not draw error branches. Where error
> branches are missing, this is recorded in the verification table at the end of this file so it can go into
> section 10 of the Spec Document in Step 5.


---

## SEQ-01 — Sign up and log in

*Diagram image: `diagrams/SEQ-01_Sign-up-and-log-in.png` (to be redrawn from the Mermaid source below). DBIZ2 Figure 4. Participants: 5 · Messages: 11.*

```mermaid
sequenceDiagram
    actor GU as Guest
    participant FE as Next.js app
    participant AU as Supabase Auth
    participant DB as Supabase PostgreSQL + RLS
    participant MAIL as Resend

    GU->>FE: Enter email, password, organisation name
    FE->>FE: Validate the format with Zod
    FE->>AU: signUp(email, password)
    AU->>MAIL: Send the verification email
    AU-->>FE: Return an unverified user
    GU->>FE: Click the verification link in the email
    FE->>AU: verifyOtp(token)
    AU->>DB: Create a profiles record, role = member
    DB-->>AU: Profile ID
    AU-->>FE: Session
    FE-->>GU: Go to the segment selection screen
    Note over DB: No home-made JWT, no home-made password hashing — use Supabase Auth
```

> The role is assigned at the database layer and enforced with RLS, not controlled in the user interface.


---

## SEQ-02 — 200-word content pre-check (no sign-up needed)

*Diagram image: `diagrams/SEQ-02_200-word-pre-check.png` (to be redrawn from the Mermaid source below). DBIZ2 Figure 5. Participants: 5 · Messages: 11.*

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

> Every pre-check is a data point for VFDA's demand index.


---

## SEQ-03 — Find locations from a scene description

*Diagram image: `diagrams/SEQ-03_Find-locations-from-scene-description.png` (to be redrawn from the Mermaid source below). DBIZ2 Figure 6. Participants: 5 · Messages: 10.*

```mermaid
sequenceDiagram
    actor U as Producer
    participant FE as Next.js app
    participant EF as Edge Function
    participant AI as Language model API
    participant DB as Supabase PostgreSQL + RLS

    U->>FE: Type a free-text scene description
    FE->>EF: extractSceneAttributes(text)
    EF->>AI: Extract attributes into a fixed template
    AI-->>EF: {scene_types, era, time_of_day...}
    EF->>EF: Validate against the location-type catalogue
    EF->>DB: search_locations(attributes)
    DB->>DB: Score out of 100 on 6 criteria
    DB-->>EF: Ranked list + match_reasons[]
    EF-->>FE: Results with match reasons
    FE-->>U: Grid of location cards, each saying why it matches
    Note over DB: Only returns locations with published = true and a score of 40 or more
```

> The AI parses the input; the deterministic scorer in the database decides the ranking.


---

## SEQ-04 — View the local authority contact — gated by RLS

*Diagram image: `diagrams/SEQ-04_View-local-authority-contact.png` (to be redrawn from the Mermaid source below). DBIZ2 Figure 7. Participants: 4 · Messages: 12.*

```mermaid
sequenceDiagram
    actor GU as Guest
    actor U as Producer
    participant FE as Next.js app
    participant DB as Supabase PostgreSQL + RLS

    GU->>FE: Open a location detail page
    FE->>DB: SELECT locations WHERE slug = ?
    DB-->>FE: Public location data
    FE->>DB: SELECT location_authority_contacts
    DB->>DB: RLS: role anon → 0 rows
    DB-->>FE: Empty
    FE-->>GU: Show a sign-up prompt instead of the contact
    U->>FE: Sign in and reopen the page
    FE->>DB: SELECT location_authority_contacts
    DB->>DB: RLS: signed in → return data
    DB-->>FE: Name, phone, email of the contact
    FE-->>U: Show full contact details
    Note over DB: Sensitive data never leaves the database for a user without the right role
```

> Verification: view the page source in a private window — no phone number may be found.


---

## SEQ-05 — Compare locations and confirm the shortlist

*Diagram image: `diagrams/SEQ-05_Compare-and-shortlist.png` (to be redrawn from the Mermaid source below). DBIZ2 Figure 8. Participants: 3 · Messages: 10.*

```mermaid
sequenceDiagram
    actor U as Producer
    participant FE as Next.js app
    participant DB as Supabase PostgreSQL + RLS

    U->>FE: Pick up to 4 locations to compare
    FE->>FE: Keep the selection temporarily in the browser
    FE->>DB: Fetch data for the 4 locations
    DB-->>FE: Full attributes of each location
    FE-->>U: Comparison table with 8 criteria rows
    U->>FE: Click Add to shortlist
    FE->>DB: INSERT project_shortlist
    DB->>DB: Recalculate the Locations gauge
    DB-->>FE: New readiness score
    FE-->>U: Dashboard updates at once
```

> Every cell in the comparison table is pass, warning or needs checking — never left blank.


---

## SEQ-06 — Collaboration request and two-way response

*Diagram image: `diagrams/SEQ-06_Collaboration-request.png` (to be redrawn from the Mermaid source below). DBIZ2 Figure 9. Participants: 5 · Messages: 13.*

```mermaid
sequenceDiagram
    actor U as Producer
    participant FE as Next.js app
    participant DB as Supabase PostgreSQL + RLS
    participant MAIL as Resend
    actor PT as Vietnamese service partner

    U->>FE: Pick a partner and a project, write a note
    FE->>DB: INSERT collab_requests (status = pending)
    DB->>MAIL: Webhook: send notification email
    MAIL->>PT: You have a new collaboration request
    PT->>FE: Open the request inbox
    FE->>DB: SELECT request details + project
    DB-->>FE: Request information
    PT->>FE: Accept / Decline / Need more information
    FE->>DB: UPDATE status + response_note
    DB->>DB: Open the organization_private layer for both parties
    DB->>MAIL: Webhook: notify the result
    MAIL->>U: The partner accepted your request
    DB->>DB: Update the Partners gauge to 100%
    Note over DB: Five statuses: pending, under_review, info_requested, accepted, declined
```

> Under Article 13 of the Cinema Law 2022, the dossier must include an agreement with a Vietnamese entity.


---

## SEQ-07 — VFDA Verified verification process

*Diagram image: `diagrams/SEQ-07_VFDA-Verified.png` (to be redrawn from the Mermaid source below). DBIZ2 Figure 10. Participants: 6 · Messages: 14.*

```mermaid
sequenceDiagram
    actor PT as Vietnamese service partner
    participant FE as Next.js app
    participant ST as Supabase Storage
    participant DB as Supabase PostgreSQL + RLS
    actor VF as VFDA staff
    participant MAIL as Resend

    PT->>FE: Submit business registration + 2 reference projects
    FE->>ST: Upload documents to Storage
    ST-->>FE: Document paths
    FE->>DB: INSERT verification_request
    DB->>MAIL: Notify VFDA staff
    MAIL->>VF: A new verification request
    VF->>FE: Open the verification queue
    FE->>DB: SELECT pending requests
    DB-->>FE: List of requests
    VF->>FE: Approve or reject with a reason
    FE->>DB: UPDATE verified, verified_by, verified_at
    DB->>DB: Write audit_log
    DB->>MAIL: Notify the organisation of the result
    MAIL->>PT: Your organisation is now VFDA Verified
    Note over DB: The system reminds to re-verify after 12 months
```

> This is the mechanism that makes VFDA the industry's verifying body without any new legal instrument.


---

## SEQ-08 — Dossier completeness check under Article 13

*Diagram image: `diagrams/SEQ-08_Dossier-completeness-check.png` (to be redrawn from the Mermaid source below). DBIZ2 Figure 11. Participants: 4 · Messages: 12.*

```mermaid
sequenceDiagram
    actor U as Producer
    participant FE as Next.js app
    participant ST as Supabase Storage
    participant DB as Supabase PostgreSQL + RLS

    U->>FE: Open the project's dossier kit
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
    Note over DB: Deterministic logic, no language model — risk close to zero
```

> The four components under Article 13, clause 3 of the Cinema Law 2022 (Law No. 05/2022/QH15).


---

## SEQ-09 — Topic screening against VFDA's rule set

*Diagram image: `diagrams/SEQ-09_Topic-screening.png` (to be redrawn from the Mermaid source below). DBIZ2 Figure 12. Participants: 5 · Messages: 12.*

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
    EF->>EF: Drop findings with an unknown rule_code or a quote that does not exist
    EF->>DB: INSERT compliance_runs (rule_version)
    EF->>DB: INSERT compliance_findings
    EF-->>FE: Filtered findings
    FE-->>U: Show with the cited article and the disclaimer
    U->>FE: Mark each finding as reviewed
    Note over EF: No warning is ever shown without a cited article
```

> The system does not interpret the law — it only runs the rule set written and signed off by VFDA.


---

## SEQ-10 — Bilingual dossier generation

*Diagram image: `diagrams/SEQ-10_Bilingual-dossier-generation.png` (to be redrawn from the Mermaid source below). DBIZ2 Figure 13. Participants: 6 · Messages: 12.*

```mermaid
sequenceDiagram
    actor U as Producer
    participant FE as Next.js app
    participant EF as Edge Function
    participant AI as Language model API
    participant ST as Supabase Storage
    actor PT as Vietnamese service partner

    U->>FE: Request a Vietnamese script synopsis
    FE->>EF: generateBilingual(project_id)
    EF->>AI: Translate and format to the required structure
    AI-->>EF: Structured Vietnamese version
    EF->>EF: Build a two-column English–Vietnamese PDF
    EF->>EF: Stamp DRAFT — REQUIRES PROOFREADING on every page
    EF->>ST: Store the PDF file
    ST-->>EF: File path
    EF-->>FE: File ready
    FE-->>U: Download the draft
    U->>PT: Send to the Vietnamese partner for editing
    PT->>FE: Mark as edited
    Note over EF: Never submits automatically — the end product is a file for a human to take forward
```

> The law requires the script synopsis and the detailed script of the parts shot in Vietnam to be in Vietnamese.


---

## SEQ-11 — Notify the Provincial People's Committee of interest in a location

*Diagram image: `diagrams/SEQ-11_Provincial-committee-notice.png` (to be redrawn from the Mermaid source below). DBIZ2 Figure 14. Participants: 5 · Messages: 11.*

```mermaid
sequenceDiagram
    actor U as Producer
    participant FE as Next.js app
    participant DB as Supabase PostgreSQL + RLS
    participant MAIL as Resend
    actor PV as Provincial People's Committee / Department of Culture, Sports and Tourism

    U->>FE: Click Interested in this location
    FE->>DB: INSERT location_interest (project_id, location_id)
    DB->>DB: Database webhook fires
    DB->>MAIL: Compose an email with the project summary
    MAIL->>PV: A film crew is interested in a location in your province
    PV->>FE: Open the response link
    PV->>FE: Received / Need more information / Cannot support yet
    FE->>DB: UPDATE response status
    DB->>MAIL: Notify the producer
    MAIL->>U: The province has responded
    U->>FE: View the local coordination tracking page
    Note over DB: This detail is in the BA Report Executive Summary but was left out of MVP v1
```

> This is the one function a private marketplace cannot copy.


---

## SEQ-12 — Demand index and quarterly report

*Diagram image: `diagrams/SEQ-12_Demand-index-and-quarterly-report.png` (to be redrawn from the Mermaid source below). DBIZ2 Figure 15. Participants: 5 · Messages: 13.*

```mermaid
sequenceDiagram
    actor VF as VFDA staff
    participant FE as Next.js app
    participant DB as Supabase PostgreSQL + RLS
    participant EF as Edge Function
    participant AI as Language model API

    VF->>FE: Open the demand index dashboard
    FE->>DB: SELECT view demand_index (reporting period)
    DB->>DB: Aggregate 6 indicators from briefs and collab_requests
    DB-->>FE: Data set
    FE-->>VF: Data table and charts
    VF->>FE: Request the quarterly report
    FE->>EF: generateQuarterlyReport(period)
    EF->>DB: Query the source data
    DB-->>EF: Traceable figures
    EF->>AI: Draft the commentary from the figures
    AI-->>EF: Commentary draft
    EF->>EF: Build a VFDA-branded PDF
    EF-->>VF: Report file for staff to reread before sending
    Note over EF: Every figure must trace back to a database query, and a person must read it before sending
```

> This is an institutional asset VFDA has never had — evidence to support recognition of its role as focal point.


---

## Verification (Step 3, section 5.6)

| # | Check | Result |
|---|---|---|
| 1 | Count participants | 58 participants in total across 12 sequences — generated directly from the same data source used to draw the images, **exact match** |
| 2 | Count and trace messages, including direction | 141 messages in total — generated directly from the same data source, **exact match** |
| 3 | Decision branches | The original images draw no `alt / else` branches. The Mermaid version has none either — **keeping to the rule of not adding anything** |
| 4 | Participant names | Labels translated into English from the Vietnamese original; participants, messages and their order unchanged. Job titles were already replaced by system parts in the original images |
| 5 | Render and place next to the original image | Diagram images in `diagrams/` (`SEQ-01_Sign-up-and-log-in.png` to `SEQ-12_Demand-index-and-quarterly-report.png`) |
| 6 | What is missing | **All 12 sequences lack error branches.** For example: SEQ-02 does not draw the case where the model API returns an error, SEQ-06 does not draw the case where the email cannot be sent, SEQ-08 does not draw the case where an uploaded file exceeds the size limit. Recorded as a known gap. |

**Verified by:** _(not signed yet — a Group C member must compare the diagrams with the original images and sign here)_

> The Mermaid blocks in this file were **generated automatically from the same data structure used to draw the PNG images**,
> so the risk of "the AI reads an image and misses a step" is zero at the conversion step.
> The remaining risk lies elsewhere: **whether the original images are correct**. That is what a human must check.
