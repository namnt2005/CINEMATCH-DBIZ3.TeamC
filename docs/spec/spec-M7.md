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

## 1. Purpose and scope

This module lets a producer tell the provinces where they plan to shoot, through VFDA, and see each province's reply; it also lets them book a consultation with VFDA staff. It turns VFDA's relationships with local governments into something a foreign producer can use.

**In scope**

- Registering interest in a location, generating the provincial notice, recording the province's reply, tracking status.
- Booking, confirming and reminding VFDA consultations.

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
| Member | Primary — registers interest, follows replies, books consultations | Function List (F-M7-01, 04, 05) |
| Provincial People's Committee / Department of Culture | Secondary — replies to the notice | Function List (F-M7-03) |
| VFDA staff | Secondary — reviews and sends notices, confirms consultations | Function List (F-M7-06) |
| System | Generates notices and reminders | Function List (F-M7-02, 07) |

## 3. User scenarios and acceptance criteria

### US-1 (P2): Let the province know we are coming

**Journey.** As a producer, I want the province to be told about my shoot through VFDA, so that local officials are prepared and I am not a surprise.

**Acceptance scenarios**

1. **Given** a member clicks *I'm interested* on Tràng An for project The Last Ferry, **When** it is saved, **Then** a notice for Ninh Bình is drafted from the project data and appears on the Provinces page at step 1.
2. **Given** a notice missing the first shooting day, **When** the member tries to send it, **Then** sending is disabled with *A first shooting day is needed before notifying*.

### US-2 (P2): See the province's reply

**Journey.** As a producer, I want to see each province's reply and what to do next, so that I can plan meetings with the right local office.

**Acceptance scenarios**

1. **Given** the province replies *More info needed* with a note, **When** VFDA records it, **Then** the producer gets a notification and the card shows the status, the date and the note.

### US-3 (P3): Book time with VFDA

**Journey.** As a producer abroad, I want to book a call with VFDA in my own time zone, so that a real person can answer what the tools cannot.

**Acceptance scenarios**

1. **Given** a producer in Seoul picks a slot, **When** VFDA confirms, **Then** both receive the time in their own time zone and a reminder 24 hours before.

### Edge cases

- The authority email bounces: the notice is marked *Not delivered* and VFDA staff are alerted to find another channel.
- The province never replies: after [NEEDS CLARIFICATION: N] working days VFDA staff are reminded to follow up.
- The producer removes the location from the shortlist after the notice was sent: the notice stays; VFDA may send a withdrawal.

## 4. Flows

### 4.1 Usage flow — Provincial People's Committee / Department of Culture

> Textualised from `docs/architecture/usage-flow.md` flow 6, translated. Diamond Q added in Step 3 from F-M7-03 — confirmed by the Client.

```mermaid
flowchart TD
    S([Receive a notice email: a film crew is interested in a local location]) --> OPEN[Open the reply link]
    OPEN --> Q{How does the province reply?}
    Q -- Received --> R1[Status: received]
    Q -- More information needed --> R2[Status: info_needed]
    Q -- Cannot support at this time --> R3[Status: cannot_support]
    R1 --> E([The producer sees the status on the tracking page])
    R2 --> E
    R3 --> E
```

### 4.2 Sequence — provincial notice (SEQ-11)

> Textualised from SEQ-11 (Figure 14), translated. 5 participants, 11 messages. SC-32 inserts a VFDA review before the email is sent — see §11.

```mermaid
sequenceDiagram
    actor U as Producer
    participant FE as Next.js app
    participant DB as Supabase PostgreSQL + RLS
    participant MAIL as Resend
    actor PV as Provincial People's Committee

    U->>FE: Click I'm interested in this location
    FE->>DB: INSERT location_interest (project_id, location_id)
    DB->>DB: Database webhook fires
    DB->>MAIL: Compose the letter with the project summary
    MAIL->>PV: A film crew is interested in a location in your province
    PV->>FE: Open the reply link
    PV->>FE: Received / More information needed / Cannot support
    FE->>DB: UPDATE reply status
    DB->>MAIL: Notify the producer
    MAIL->>U: The province has replied
    U->>FE: View the provincial coordination page
    Note over DB: This came from the BA Report executive summary and was missed in MVP v1
```

## 5. Functional requirements

| FR ID | DBIZ2 Subfunction ID | Requirement (system MUST ...) | Actor | Priority |
|---|---|---|---|---|
| FR-001 | F-M7-01 | The system SHOULD record a member's interest in a location for a project. | Member | Should |
| FR-002 | F-M7-02 | The system SHOULD generate the provincial notice from project data and queue it for VFDA staff to review and send from VFDA's domain. | System / VFDA Staff | Should |
| FR-003 | F-M7-03 | The system SHOULD record the province's reply as received, info_needed or cannot_support, with an optional note and time. | Province / VFDA Staff | Should |
| FR-004 | F-M7-04 | The system SHOULD show the producer, per province, the four-step progress and the reply. | Member | Should |
| FR-005 | F-M7-05 | The system SHOULD let a member book a VFDA consultation by topic and slot, handling time zones. | Member | Should |
| FR-006 | F-M7-06 | The system SHOULD let VFDA staff confirm or reschedule and assign an officer. | VFDA Staff | Should |
| FR-007 | F-M7-07 | The system SHOULD remind both sides before the consultation. | System | Should |

### 5.1 Input / Output contract

Types and required flags come from `docs/function-list.md` (columns *Input — type and required* and *Output — type*). Changes made in Session 4 are stated in *Notes* and listed in 11.1.

| FR ID | Input field | Type | Required | Output field | Type | Notes / validation |
|---|---|---|---|---|---|---|
| FR-001 | `project_id` | `UUID` | Yes | `interest_id` | `UUID` |  |
|  | `location_id` | `UUID` | Yes |  |  |  |
| FR-002 | `interest_id` | `UUID` | Yes | `notification_id` | `UUID` | reviewed_by added (VFDA review step, SC-32); needs first shooting day |
|  | `project_summary` | `TEXT` | Yes | `delivery_status` | `ENUM(queued, sent, bounced)` |  |
|  | `authority_email` | `VARCHAR(254)` | Yes |  |  |  |
|  | `reviewed_by` | `UUID` | Yes |  |  |  |
| FR-003 | `interest_id` | `UUID` | Yes | `response_status` | `ENUM` |  |
|  | `response` | `ENUM(received, info_needed, cannot_support)` | Yes | `responded_at` | `TIMESTAMPTZ` |  |
|  | `note` | `TEXT` | No |  |  |  |
| FR-004 | `project_id` | `UUID` | Yes | `interests` | `(location_id UUID, response_status ENUM, responded_at TIMESTAMPTZ)[]` | one card per province |
| FR-005 | `topic` | `ENUM(dossier, locations, partners, provincial_notice, general)` | Yes | `booking_id` | `UUID` | IANA time zone |
|  | `slot_start` | `TIMESTAMPTZ` | Yes |  |  |  |
|  | `timezone` | `VARCHAR(40)` | Yes |  |  |  |
| FR-006 | `booking_id` | `UUID` | Yes | `booking_status` | `ENUM(confirmed, rescheduled)` |  |
|  | `officer_id` | `UUID` | Yes |  |  |  |
| FR-007 | `booking_id` | `UUID` | Yes | `reminders` | `notification[]` | 2 records, 24 h before |

### 5.2 Business rules

| Rule ID | Rule | Why it exists |
|---|---|---|
| BR-001 | Notices are sent in VFDA's name, never directly by the producer. | VFDA is the relationship holder with local government. |
| BR-002 | Every notice states that it does not replace the filming licence from the Ministry of Culture, Sports and Tourism. | Avoids a province or producer mistaking it for permission. |
| BR-003 | The province's reply is one of three final values; the free-text note is kept as entered. | Consistent tracking and reporting. |
| BR-004 | Reply times feed the provincial readiness index (M3). | Makes responsiveness visible and comparable. |
| BR-005 | Consultation booking (SC-33) is offered only after VFDA has declared its staffed hours and reply time; until then SC-33 shows VFDA's contact email instead of the booking form. | A booking form nobody answers does more harm than no form (TL4 §5.7, TL5 M7·2). |

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
| SC-003 | A producer abroad books a consultation in their own time zone in under 2 minutes. | Timed test with 3 producers in different time zones. |

## 9. Assumptions

- VFDA staff have capacity to review notices within 2 working days.
- One notice per province per project, even when several locations are in the same province.
- Test value used until VFDA confirms: VFDA staff are reminded to follow up a notice after 5 working days without reply.

## 10. Open questions

| # | Question | Blocking? | Owner | Status |
|---|---|---|---|---|
| 1 | [NEEDS CLARIFICATION: Does VFDA have the mandate / practice to send notices to Provincial People's Committees, and what is the official template?] *(also raised in SC-32)* | Yes | Client (VFDA) | Open |
| 2 | [NEEDS CLARIFICATION: Is the notice addressed to the People's Committee or to the provincial Department of Culture?] *(also raised in SC-32)* | Yes | Client (VFDA) | Open |
| 3 | [NEEDS CLARIFICATION: Automatic sending (DBIZ2 SEQ-11) or VFDA staff review before sending (SC-32)?] | Yes | Client (VFDA) | Open |
| 4 | [NEEDS CLARIFICATION: After how many working days without reply should VFDA follow up?] | No | Client (VFDA) | Open |
| 5 | [NEEDS CLARIFICATION: Which days and hours does VFDA offer for consultations, and how long is one slot?] *(from SC-33)* | Yes | Client (VFDA) | Open |
| 6 | [NEEDS CLARIFICATION: How is the consultation held (video call, phone, at the VFDA office) and who sends the joining details?] *(from SC-33)* | No | Client (VFDA) | Open |

## 11. Traceability to DBIZ2

| Spec section | DBIZ2 source | Location |
|---|---|---|
| 1. Purpose | System Design v2.0 — 1. Schematic, §1.2 (M7); BA Report executive summary | `docs/architecture/context.md` |
| 4.1 Usage flow | FLOW-01 flow 6 (Figure 3) + Step 3 addition | `docs/architecture/usage-flow.md` §6 |
| 4.2 Sequence | SEQ-11 (Figure 14) | `docs/architecture/sequence-diagrams.md` — SEQ-11 |
| 5. Functional requirements | Function List rows 89–95 | `docs/function-list.md` rows 89–95 |
| 7. Screens | Screen List SC-32, SC-33 | `docs/screen-list.md` §1 |

### 11.1 Reconciliation with DBIZ2 (System Design v2.0)

Where the 20-screen design or this spec differs from the DBIZ2 Function List, the difference is written here instead of being silently changed.

| Topic | DBIZ2 / System Design v2.0 | This spec | Status |
|---|---|---|---|
| Notice dispatch | Sent automatically by a database webhook (SEQ-11) | Drafted automatically, reviewed and sent by VFDA staff (SC-32) | Open — see §10 |
| Module priority | Must | Should — Tier 2 of the screen list file (#20) | Changed — Confirmed by the Client |
| Booking availability | Booking always open (F-M7-05) | Offered only once VFDA declares staffed hours (BR-005) | Added — Group C decision 01/10/2026 |

## Completion checklist

- [x] Every subfunction of this module in the DBIZ2 Function List appears as an FR row (7 of 7, rows 89–95) — machine-checked.
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
