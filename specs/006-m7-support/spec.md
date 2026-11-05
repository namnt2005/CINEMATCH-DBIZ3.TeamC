<!-- DBIZ3-SNAPSHOT source=docs/spec/spec-M7.md sha256=0adfa0a33de20ae623d2e60bfd7747fbed55697bf8cdeed298e73bef36317723 taken=2026-11-05T17:52Z -->
<!-- Read-only copy for Spec Kit. Do not edit here. Edit docs/spec/spec-M7.md, then run:
     uv run tools/start_feature.py --refresh -->

# Spec Document: VFDA support — provincial notices and consultations

> DBIZ3 Session 4 template — one file per module. Written for a reader who has never seen the DBIZ2 report.

| Field | Value |
|---|---|
| Module ID | M7 |
| Module name | VFDA support — provincial notices and consultations |
| Spec version | v0.1 |
| Author (team member) | Nam Tran — Group C |
| Date | 22/09/2026 |
| Status | Draft |
| Approved by (Client role) | *Not yet — VFDA project lead (and VFDA Legal Board for legal rules)* |
| DBIZ2 source | Function List rows 89–95 (F-M7-01 .. F-M7-07); Use Case UC-22, UC-23; Screens SC-32, SC-33 |

## Clarifications

### Session 2026-10-28 (Group C, provisional — the owner in §10 confirms before launch)

- Q1: Does VFDA have the mandate / practice to send notices to Provincial People's Committees, and what is the official template? → A: The system does not send notices on VFDA's behalf. It produces a notice draft that the crew downloads and sends themselves.
- Q2: Is the notice addressed to the People's Committee or to the provincial Department of Culture? → A: Follows from question 1: the crew chooses the recipient (People's Committee or provincial Department of Culture) when downloading the draft.
- Q3: Automatic sending (DBIZ2 SEQ-11) or VFDA staff review before sending (SC-32)? → A: No automatic sending. A VFDA staff member reviews the draft in SC-32 before the crew can download the final version.
- Q5: Which days and hours does VFDA offer for consultations, and how long is one slot? → A: No slot calendar in the MVP. The crew sends a consultation request; VFDA staff reply with a proposed time by email.

## 1. Purpose and scope

This module lets a producer tell the provinces where they plan to shoot, with a letter reviewed by VFDA, and see each province's reply; it also lets them send VFDA a consultation request. It turns VFDA's relationships with local governments into something a foreign producer can use.

**In scope**

- Registering interest in a location, generating the provincial notice, recording the province's reply, tracking status.
- Sending VFDA a consultation request (topic, preferred times, time zone); VFDA replies by email (BR-005).

**Out of scope**

- The filming licence itself (issued by the Ministry of Culture, Sports and Tourism).
- Negotiating with a province on the producer's behalf beyond the notice.

**Depends on**

- M3 (location, authority contact)
- M0 (project data)
- M4 (confirmed partner shown in the notice)
- SYS (email, notifications)

## 2. Actors

| Actor | Role in this module | Where it comes from |
|---|---|---|
| Member | Primary — registers interest, downloads and sends the approved notice, records replies, sends consultation requests | Function List (F-M7-01, 03, 04, 05) |
| Provincial People's Committee / Department of Culture | Secondary — replies to the letter the crew sent; the reply is recorded by the member or VFDA staff | Function List (F-M7-03) |
| VFDA staff | Secondary — reviews notices, may record replies, answers consultation requests by email | Function List (F-M7-02, 03, 06) |
| System | Drafts notices from project data | Function List (F-M7-02) |

## 3. User scenarios and acceptance criteria

### US-1 (P2): Let the province know we are coming

**Journey.** As a producer, I want to tell the province about my shoot with a letter VFDA has reviewed, so that local officials are prepared and I am not a surprise.

**Acceptance scenarios**

1. **Given** a member clicks *I'm interested* on Tràng An for project The Last Ferry, **When** it is saved, **Then** a notice for Ninh Bình is drafted from the project data and appears on the Provinces page at step 1.
2. **Given** a notice missing the first shooting day, **When** the member tries to ask VFDA to review it, **Then** this is disabled with *A first shooting day is needed before notifying*.

### US-2 (P2): See the province's reply

**Journey.** As a producer, I want to see each province's reply and what to do next, so that I can plan meetings with the right local office.

**Acceptance scenarios**

1. **Given** the province replies *More info needed* with a note, **When** the member or VFDA staff record it, **Then** the card shows the status, the date and the note, and the producer gets a notification when VFDA staff recorded it.

### US-3 (P3): Ask VFDA for a consultation

**Journey.** As a producer abroad, I want to ask VFDA for a call at times that suit me in my own time zone, so that a real person can answer what the tools cannot.

**Acceptance scenarios**

1. **Given** a producer in Seoul chooses a topic and two preferred times in Asia/Seoul, **When** they send the request, **Then** VFDA receives it by email with each time in Seoul and Hanoi time, the request shows *Waiting for VFDA*, and VFDA replies with a proposed time by email (BR-005).

### Edge cases

- The crew cannot deliver the letter to the office they chose: they download it again addressed to the other office (People's Committee or Department of Culture).
- The province never replies: after [NEEDS CLARIFICATION: N] working days VFDA staff are reminded to follow up.
- The producer removes the location from the shortlist after the notice was sent: the notice stays; the crew may write to the province themselves (no withdrawal letter is generated in the MVP).

## 4. Flows

### 4.1 Usage flow — Provincial People's Committee / Department of Culture

> **Derived** 06/11/2026 from `docs/architecture/usage-flow.md` flow 6 for BR-001 (Clarifications Q1–Q3): the province receives the letter from the crew, not an email with a reply link; the reply is recorded by the member or VFDA staff. Diamond Q added in Step 3 from F-M7-03. To confirm with the Client.

```mermaid
flowchart TD
    S([Receive the crew's letter about a local location]) --> Q{How does the province reply?}
    Q -- Received --> R1[Status: received]
    Q -- More information needed --> R2[Status: info_needed]
    Q -- Cannot support at this time --> R3[Status: cannot_support]
    R1 --> REC[The member or VFDA staff record the reply]
    R2 --> REC
    R3 --> REC
    REC --> E([The producer sees the status on the tracking page])
```

### 4.2 Sequence — provincial notice (adapted from SEQ-11)

> **Derived** 06/11/2026 from SEQ-11 (Figure 14) for BR-001 (Clarifications Q1–Q3): the database webhook and the emails to and from the province are removed; the VFDA review (SC-32) and the crew's download are added. To confirm with the Client.

```mermaid
sequenceDiagram
    actor U as Producer
    participant FE as Next.js app
    participant DB as Supabase PostgreSQL + RLS
    actor ST as VFDA staff
    actor PV as People's Committee or Department of Culture

    U->>FE: Click I'm interested in this location
    FE->>DB: Save location_interest and draft the notice from project data
    U->>FE: Ask VFDA to review the notice
    FE->>DB: Notice submitted
    ST->>FE: Approve, or request changes with a note
    FE->>DB: Review result and an audit_log row
    FE-->>U: Notification: approved or changes requested
    U->>FE: Choose the recipient, download Word or PDF
    FE->>DB: delivery_status = downloaded
    U->>PV: Send the letter (outside the system)
    PV-->>U: Official reply
    U->>FE: Record the reply (or VFDA staff record it)
    FE->>DB: response, note, responded_at
```

## 5. Functional requirements

| FR ID | DBIZ2 Subfunction ID | Requirement (system MUST ...) | Actor | Priority |
|---|---|---|---|---|
| FR-001 | F-M7-01 | The system SHOULD record a member's interest in a location for a project. | Member | Should |
| FR-002 | F-M7-02 | The system SHOULD draft the provincial notice from project data and queue it for VFDA staff to review; the member downloads the approved notice and sends it themselves. | System / VFDA Staff / Member | Should |
| FR-003 | F-M7-03 | The system SHOULD record the province's reply, entered by the member or VFDA staff, as received, info_needed or cannot_support, with an optional note and time. | Member / VFDA Staff | Should |
| FR-004 | F-M7-04 | The system SHOULD show the producer, per province, the four-step progress and the reply. | Member | Should |
| FR-005 | F-M7-05 | The system SHOULD let a member send VFDA a consultation request with a topic, up to three preferred times and their time zone; VFDA replies by email. | Member | Should |
| FR-006 | F-M7-06 | The system SHOULD let VFDA staff confirm or reschedule and assign an officer. | VFDA Staff | Should |
| FR-007 | F-M7-07 | The system SHOULD remind both sides before the consultation. | System | Should |

### 5.1 Input / Output contract

Types and required flags come from `docs/function-list.md` (columns *Input — type and required* and *Output — type*). Changes made in Session 4 are stated in *Notes* and listed in 11.1.

| FR ID | Input field | Type | Required | Output field | Type | Notes / validation |
|---|---|---|---|---|---|---|
| FR-001 | `project_id` | `UUID` | Yes | `interest_id` | `UUID` |  |
|  | `location_id` | `UUID` | Yes |  |  |  |
| FR-002 | `interest_id` | `UUID` | Yes | `notification_id` | `UUID` | reviewed_by added (VFDA review step, SC-32); needs first shooting day; delivery_status records the download, not an email (BR-001) |
|  | `project_summary` | `TEXT` | Yes | `delivery_status` | `ENUM(queued, sent, bounced)` |  |
|  | `authority_email` | `VARCHAR(254)` | Yes |  |  |  |
|  | `reviewed_by` | `UUID` | Yes |  |  |  |
| FR-003 | `interest_id` | `UUID` | Yes | `response_status` | `ENUM` |  |
|  | `response` | `ENUM(received, info_needed, cannot_support)` | Yes | `responded_at` | `TIMESTAMPTZ` |  |
|  | `note` | `TEXT` | No |  |  |  |
| FR-004 | `project_id` | `UUID` | Yes | `interests` | `(location_id UUID, response_status ENUM, responded_at TIMESTAMPTZ)[]` | one card per province |
| FR-005 | `topic` | `ENUM(dossier, locations, partners, provincial_notice, general)` | Yes | `booking_id` | `UUID` | IANA time zone; up to 3 preferred times, slot_start = the first (BR-005) |
|  | `slot_start` | `TIMESTAMPTZ` | Yes |  |  |  |
|  | `timezone` | `VARCHAR(40)` | Yes |  |  |  |
| FR-006 | `booking_id` | `UUID` | Yes | `booking_status` | `ENUM(confirmed, rescheduled)` |  |
|  | `officer_id` | `UUID` | Yes |  |  |  |
| FR-007 | `booking_id` | `UUID` | Yes | `reminders` | `notification[]` | 2 records, 24 h before |

### 5.2 Business rules

| Rule ID | Rule | Why it exists |
|---|---|---|
| BR-001 | The system never sends a notice. It drafts the notice; a VFDA staff member reviews it (SC-32); only the approved version can be downloaded, and the producer sends it to the recipient they choose (Clarifications Q1–Q3, 28/10/2026). | VFDA's mandate to write to provinces is unconfirmed; a human still checks every notice. |
| BR-002 | Every notice states that it does not replace the filming licence from the Ministry of Culture, Sports and Tourism. Draft wording, **pending approval by the VFDA Legal Board**: *Thư này không thay thế giấy phép quay phim do Bộ Văn hóa, Thể thao và Du lịch cấp.* / *This letter does not replace the filming licence issued by the Ministry of Culture, Sports and Tourism.* | Avoids a province or producer mistaking it for permission. |
| BR-003 | The province's reply is one of three final values; the free-text note is kept as entered. | Consistent tracking and reporting. |
| BR-004 | Reply times feed the provincial readiness index (M3). | Makes responsiveness visible and comparable. |
| BR-005 | In the MVP, SC-33 is a consultation request, not a slot calendar: the member sends topic and preferred times, and VFDA staff reply with a proposed time by email (Clarifications Q5, 28/10/2026). A slot calendar is offered only after VFDA declares its staffed hours. | A booking form nobody answers does more harm than no form (TL4 §5.7, TL5 M7·2). |

## 6. Key entities

| Entity | Attributes (from Input/Output fields) | Relationships |
|---|---|---|
| LocationInterest | interest_id, project_id, location_id, created_at | belongs to Project and Location |
| ProvinceNotice | interest_id, province_id, drafted_at, reviewed_by, sent_at, received_at, response, note, responded_at, delivery_status | belongs to LocationInterest |
| ConsultationBooking | booking_id, member_id, topic, slot_start, timezone, officer_id, booking_status | belongs to UserAccount |

### 6.1 Attribute types

Types and required flags of the attributes above that no field in 5.1 declares (keys, timestamps, stored statuses). Every column of the data model now has a declared type.

| Entity | Attribute | Type | Required | Notes |
|---|---|---|---|---|
| LocationInterest | `created_at` | `TIMESTAMPTZ` | Yes |  |
| ProvinceNotice | `province_id` | `INTEGER` | Yes | the province the notice was addressed to, kept as sent even if the location's province later changes |
| ProvinceNotice | `drafted_at` | `TIMESTAMPTZ` | Yes |  |
| ProvinceNotice | `sent_at` | `TIMESTAMPTZ` | No | empty until VFDA sends it |
| ProvinceNotice | `received_at` | `TIMESTAMPTZ` | No | empty until the province acknowledges it |
| ConsultationBooking | `member_id` | `UUID` | Yes |  |

## 7. Screens involved

| Screen ID | Screen name | Priority | Screen Spec file |
|---|---|---|---|
| SC-32 | Provincial People's Committee notice | Should | `docs/screens/screen-spec-SC-32.md` |
| SC-33 | Book a VFDA consultation | Should | `docs/screens/screen-spec-SC-33.md` |

## 8. Success criteria

| SC ID | Criterion | How it is measured |
|---|---|---|
| SC-001 | A producer knows the reply status of every province on their shortlist without contacting anyone. | Walkthrough with 5 producers. |
| SC-002 | Provinces reply to four in five notices within 7 working days. | Reply times over the first 30 notices. |
| SC-003 | A producer abroad sends a consultation request in their own time zone in under 2 minutes. | Timed test with 3 producers in different time zones. |

## 9. Assumptions

- VFDA staff have capacity to review notices within 2 working days.
- One notice per province per project, even when several locations are in the same province.
- Test value used until VFDA confirms: VFDA staff are reminded to follow up a notice after 5 working days without reply.

## 10. Open questions

| # | Question | Blocking? | Owner | Status |
|---|---|---|---|---|
| 1 | [NEEDS CLARIFICATION: Does VFDA have the mandate / practice to send notices to Provincial People's Committees, and what is the official template?] *(also raised in SC-32)* | Yes | Client (VFDA) | Decided (provisional, VFDA to confirm) — see Clarifications |
| 2 | [NEEDS CLARIFICATION: Is the notice addressed to the People's Committee or to the provincial Department of Culture?] *(also raised in SC-32)* | Yes | Client (VFDA) | Decided (provisional, VFDA to confirm) — see Clarifications |
| 3 | [NEEDS CLARIFICATION: Automatic sending (DBIZ2 SEQ-11) or VFDA staff review before sending (SC-32)?] | Yes | Client (VFDA) | Decided (provisional, VFDA to confirm) — see Clarifications |
| 4 | [NEEDS CLARIFICATION: After how many working days without reply should VFDA follow up?] | No | Client (VFDA) | Open |
| 5 | [NEEDS CLARIFICATION: Which days and hours does VFDA offer for consultations, and how long is one slot?] *(from SC-33)* | Yes | Client (VFDA) | Decided (provisional, VFDA to confirm) — see Clarifications |
| 6 | [NEEDS CLARIFICATION: How is the consultation held (video call, phone, at the VFDA office) and who sends the joining details?] *(from SC-33)* | No | Client (VFDA) | Open |

## 11. Traceability to DBIZ2

| Spec section | DBIZ2 source | Location |
|---|---|---|
| 1. Purpose | System Design v2.0 — 1. Schematic, §1.2 (M7); BA Report executive summary | `docs/architecture/context.md` |
| 4.1 Usage flow | FLOW-01 flow 6 (Figure 3) + Step 3 addition | `docs/architecture/usage-flow.md` §6 |
| 4.2 Sequence | SEQ-11 (Figure 14), adapted for BR-001 | `docs/architecture/sequence-diagrams.md` — SEQ-11 |
| 5. Functional requirements | Function List rows 89–95 | `docs/function-list.md` rows 89–95 |
| 7. Screens | Screen List SC-32, SC-33 | `docs/screen-list.md` §1 |

### 11.1 Reconciliation with DBIZ2 (System Design v2.0)

Where the 20-screen design or this spec differs from the DBIZ2 Function List, the difference is written here instead of being silently changed.

| Topic | DBIZ2 / System Design v2.0 | This spec | Status |
|---|---|---|---|
| Notice dispatch | Sent automatically by a database webhook (SEQ-11); F-M7-02 sends from VFDA's domain | F-M7-02 rewritten (code kept): drafted from project data, reviewed by VFDA staff (SC-32), downloaded and sent by the producer; `delivery_status` records the download, not an email (BR-001); §4.1 and §4.2 redrawn | Group C decision 28/10/2026, text 06/11/2026 — VFDA to confirm |
| Province reply | F-M7-03: the province replies through a link; VFDA records it | Recorded by the member, who sent the letter, or by VFDA staff; who recorded it is stored | Group C decision 06/11/2026 — VFDA to confirm |
| Consultation booking | F-M7-05..07: slot booking with time zones, confirmation and reminders | F-M7-05 rewritten as a request (topic, up to three preferred times, time zone) answered by email (BR-005); F-M7-06 (confirm, reschedule, assign an officer) and F-M7-07 (reminders): later phase | Group C decision 28/10/2026, text 06/11/2026 — VFDA to confirm |
| Module priority | Must | Should — Tier 2 of the screen list file (#20) | Changed — Confirmed by the Client |
| Booking availability | Booking always open (F-M7-05) | Offered only once VFDA declares staffed hours (BR-005) | Added — Group C decision 01/10/2026 |

## Completion checklist

- [x] Every subfunction of this module in the DBIZ2 Function List appears as an FR row (7 of 7, rows 89–95) — machine-checked.
- [x] Every Input and Output field has a type and a required flag — machine-checked.
- [x] Every Mermaid block renders without an error — rendered with mermaid-cli 11.14 on 22/09/2026.
- [ ] Every node and arrow in the Mermaid flow exists in the original DBIZ2 diagram, and nothing was invented. **Not met:** some diagrams are marked *Derived* (no DBIZ2 figure exists); some decision diamonds were added in Step 3 from the Function List; each is labelled above as a Group C proposal.
- [x] At least one business rule is written that is not visible in any diagram (see 5.2).
- [x] Every screen this module touches is listed with an existing Screen Spec file.
- [x] Success criteria contain no technology words — machine-checked against a word list.
- [x] Open questions carry the unresolved items from the Session 3 scope review (recorded in `docs/prd.md` section 5) and every point found while writing this spec; each has an owner.
- [x] The traceability table points to real files and figures, not "see the report".

---
*Template source: adapted from GitHub Spec Kit `templates/spec-template.md`, mapped onto the DBIZ2 Product Design Package. DBIZ3, VJCBI College — FTU. Group C · CINEMATCH.*
