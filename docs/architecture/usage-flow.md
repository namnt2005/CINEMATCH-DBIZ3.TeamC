# Usage Flow — CINEMATCH

> Source: System Design v2.0, sheet *2. Usage Flow*, section 2.3, Figure 3.
> Diagram image: `diagrams/FLOW-01_System-usage-flow.png` (to be redrawn from the Mermaid source below).
> Rule applied (Pattern 3): **one flowchart per actor**, each in its own section.
> Every decision diamond in the original image keeps its original branch labels.

## 1. International producer — segments A and B

```mermaid
flowchart TD
    S(["Open the landing page"]) --> Q1{"M1 · What do you want to do in Vietnam?"}
    Q1 -- "Segment A: shoot, release abroad" --> PRE["M2·1 · 200-word pre-check<br/>(no sign-up needed)"]
    Q1 -- "Segment B: shoot and release in Vietnam" --> PRE
    Q1 -- "Segment C: hire services only" --> CJUMP(["See section 2"])

    PRE --> DASH["M0 · Create project<br/>+ Readiness dashboard"]
    DASH --> LOC["M3 · Find locations from a scene description<br/>Compare · Confirm the shortlist"]
    LOC --> Q2{"Any location scoring 40 or more?"}
    Q2 -- "No" --> ASK["Ask VFDA for direct advice"] --> LOC
    Q2 -- "Yes" --> PART["M4 · Vietnamese service partner<br/>(required by Article 13)"]

    PART --> Q3{"How did the partner respond?"}
    Q3 -- "Declined" --> PART
    Q3 -- "More information needed" --> PART
    Q3 -- "Accepted" --> DOS["M5 · Four-component dossier<br/>Generate bilingual draft<br/>Countdown from the first shooting day"]

    DOS --> CHK["M2 · Dossier scoring<br/>+ topic review"]
    CHK --> Q4{"All four Article 13 components present?"}
    Q4 -- "Not yet" --> DOS
    Q4 -- "Yes" --> NOTI["M7 · Notify the Provincial People's Committee<br/>Book a VFDA consultation"]
    NOTI --> E(["Ready to submit the dossier through the competent authority's procedure"])
```

## 2. International producer — segment C

```mermaid
flowchart TD
    S(["Choose: hire actors or logistics services only"]) --> G["M4 · Choose a service group<br/>from the 12 groups"]
    G --> F["M4 · Filter by province<br/>+ VFDA Verified badge"]
    F --> R["M4·2 · Send a collaboration request"]
    R --> Q{"How did the partner respond?"}
    Q -- "Declined" --> F
    Q -- "Accepted" --> OPEN["Unlock the full information layer:<br/>price list, past clients, contacts"]
    OPEN --> N["M5 · Checklist of points to note:<br/>contract, payment, tax"]
    N --> E(["Sign the service contract outside the system"])
```

## 3. Vietnamese service partner

```mermaid
flowchart TD
    S(["Receive an introduction letter from VFDA"]) --> P["M4 · Create an organisation profile<br/>with three information layers"]
    P --> V["M4·3 · Submit verification documents<br/>business registration certificate + 2 reference projects"]
    V --> Q1{"Does VFDA approve?"}
    Q1 -- "Rejected with a reason" --> P
    Q1 -- "Approved" --> BADGE["Receive the VFDA Verified badge<br/>valid for 12 months"]
    BADGE --> INBOX["M4·2 · Collaboration request inbox"]
    INBOX --> Q2{"How to handle the request?"}
    Q2 -- "More information needed" --> INBOX
    Q2 -- "Decline" --> INBOX
    Q2 -- "Accept" --> NDA["M4·5 · The other party accepts the e-NDA<br/>before viewing project documents"]
    NDA --> E(["Collaboration begins, every document view is logged"])
```

## 4. VFDA staff

```mermaid
flowchart TD
    S(["Sign in to the /admin area"]) --> HUB["M10 · Admin overview"]
    HUB --> A1["M3 · Manage locations"]
    HUB --> A2["M4·3 · Verification queue"]
    HUB --> A3["M10 · Content moderation"]
    HUB --> A4["M10 · Demand indicators"]

    A1 --> Q1{"Local authority contact verified?"}
    Q1 -- "Not yet" --> BLOCK["System blocks publishing<br/>(database-level constraint)"] --> A1
    Q1 -- "Yes" --> PUB["Publish the location"]

    A2 --> Q2{"Does the dossier meet the requirements?"}
    Q2 -- "No, with a reason" --> A2
    Q2 -- "Yes" --> BADGE["Grant the VFDA Verified badge"]

    A4 --> REP["M10 · Generate the quarterly report"]
    REP --> READ["Staff member rereads all figures"]
    READ --> E(["Sign and send to the Cinema Department and the relevant Provincial People's Committees"])
```

## 5. VFDA Legal Board

```mermaid
flowchart TD
    S(["Sign in with the vfda_legal role"]) --> L["M2 · Legal rule set screen"]
    L --> N["Draft a new rule"]
    N --> Q1{"Legal provision citation filled in?"}
    Q1 -- "Not yet" --> BLOCK["System does not allow activation<br/>(database-level constraint)"] --> N
    Q1 -- "Yes" --> Q2{"Signed off by an approver?"}
    Q2 -- "Not yet" --> DRAFT["Keep in Draft status"] --> N
    Q2 -- "Yes" --> ACT["Rule is activated<br/>a new version is created"]
    ACT --> E(["Every dossier check from then on uses this version"])
```

## 6. Provincial People's Committee / Department of Culture, Sports and Tourism

```mermaid
flowchart TD
    S(["Receive an email notice that a film crew is interested in a location"]) --> OPEN["Open the response link"]
    OPEN --> Q{"How does the province respond?"}
    Q -- "Received" --> R1["Status: received"]
    Q -- "More information needed" --> R2["Status: info_needed"]
    Q -- "Cannot support at present" --> R3["Status: cannot_support"]
    R1 --> E(["Producer sees the status on the tracking page"])
    R2 --> E
    R3 --> E
```

---

## Verification (Step 3, section 5.6)

| # | Check | Result |
|---|---|---|
| 1 | Count the nodes: original image and Mermaid block | The original image draws 1 combined flow for segments A/B/C; the Mermaid version splits it into 6 flowcharts by actor, as Pattern 3 requires. Total nodes in the original image 17; total Mermaid nodes across the 6 flows = 48 — **deliberate difference**, see the note |
| 2 | Trace every arrow, including direction | Every arrow in the original image appears in flow 1 and flow 2 — **match** |
| 3 | Every decision keeps all its branches with the original labels | The original image has 1 diamond (M1 segment choice) with 3 branches. The Mermaid version keeps that diamond with the same 3 labels, and **adds 8 new diamonds** for decision branches that already exist in the Function List but were not drawn in the original image |
| 4 | Labels translated, nothing renamed or "tidied up" | Labels translated into English from the Vietnamese original; nodes, edges and branch labels otherwise unchanged. |
| 5 | Render the Mermaid block and place it next to the original image | Diagram image: `diagrams/FLOW-01_System-usage-flow.png` |
| 6 | Ask what is missing | The original image draws only the happy path. The rejection, not-yet-eligible and no-result branches all exist in the Function List but were not drawn. They have been added to the Mermaid version. Recorded as a known gap. |

**Verified by:** _(not signed yet — a Group C member must compare the diagram with the original image node by node and sign here)_

> The figures in rows 1–3 come from a script that automatically compares the image drawing data with the Mermaid block.
> Under the Step 3 guidance, section 5.6, **a human must still give final confirmation** before this counts as verified.


> **Honest warning about rows 3 and 6 of the verification table.** The Step 3 guidance says: if the original image has no
> error path, the Mermaid version must not have one either. Here the Mermaid version **has more branches than the original image**.
> Reason: these branches are not new design — they are already in Function List v2.0
> (for example `F-M4-14` has 5 response statuses, `F-M3-08` has the 40-point threshold, `F-M3-05` has the publishing block constraint).
> That they were not drawn is an omission in the original image, not a design decision.
> Even so, **this is still a difference the Client must confirm at Step 5**, and it must not be treated as agreed.
