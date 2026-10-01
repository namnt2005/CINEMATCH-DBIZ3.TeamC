# -*- coding: utf-8 -*-
"""Spec Document data — module M10 (VFDA back office)."""

MODULES = []

# =============================================================================  M10
MODULES.append(dict(
 id="M10", name="VFDA back office — moderation, demand index, quarterly report, audit log",
 source="Function List rows 96–104 (F-M10-01 .. F-M10-09); Use Case UC-24, UC-25, UC-26; Screens SC-34, SC-38, SC-39, SC-40, SC-41",
 purpose="This module is VFDA's own workspace: staff review what users publish before the public sees it, follow how much international demand the platform receives, and send a quarterly report built from those figures. "
         "It also keeps a permanent record of every administrative action, so that VFDA can always show who changed what and when.",
 in_scope=["Admin overview with the work waiting for each VFDA team (SC-34).",
           "Moderation queue for user-published content (organisation profiles, location photos submitted by partners), with approve or hide and a reason (Must).",
           "Demand index: six indicators aggregated from the platform's own data, as a table and charts, filtered by month, quarter or year.",
           "Quarterly report: commentary drafted from the figures, reread by a staff member, exported as a VFDA-branded PDF.",
           "Audit log: every administrative action is written to a log that cannot be edited (Must), and admins can search it (Should)."],
 out_scope=["Managing locations, the verification queue and legal rules — those screens belong to M3 (SC-35), M4 (SC-36) and M2 (SC-37); they write to this module's audit log.",
            "Data from outside the platform (box office, tourism statistics).",
            "Sending the report automatically: a person always sends it.",
            "Showcase moderation (M8 is *Won't* for this release); the `showcase` content type is kept for phase 2."],
 depends=["SYS (roles `vfda_staff` and `admin`, notifications)", "M0 (projects), M1 (segment decisions), M2 (pre-check runs), M3 (location queries, shortlists), M4 (organisations, collaboration requests) — sources of the demand index",
          "M3, M4, M2 admin screens — callers of the audit log write", "External: language model API (commentary draft), PDF rendering"],
 actors=[("VFDA staff", "Primary — moderates content, reads the demand index, prepares the quarterly report", "Function List (F-M10-01, 02, 04, 05, 07)"),
         ("Admin", "Primary — searches the audit log", "Function List (F-M10-09)"),
         ("System", "Aggregates the indicators, drafts the commentary, writes every audit record", "Function List (F-M10-03, 06, 08)"),
         ("Cinema Department; Provincial People's Committees", "Secondary — receive the quarterly report outside the platform", "Function List (F-M10-07); Use Case UC-25")],
 stories=[
  dict(id="US-1", p="P1", title="Nothing reaches the public unreviewed",
       journey="As VFDA staff, I want every newly published organisation profile to wait in a queue until I approve it, so that VFDA's name is never attached to content it has not seen.",
       acc=["**Given** partner Mekong Frame Co. edits its public profile description, **When** it saves, **Then** the change appears in the moderation queue with type `org_profile` and the public page keeps showing the previous approved text.",
            "**Given** an item in the queue, **When** staff choose *Hide* without typing a reason, **Then** the decision is refused with *A reason is required to hide content*.",
            "**Given** staff choose *Approve*, **When** the decision is saved, **Then** the new text is public within one minute and an audit record `content.approve` names the staff member, the item and the time."]),
  dict(id="US-2", p="P2", title="See international demand for the quarter",
       journey="As VFDA staff, I want the six demand indicators for a period, so that I can tell VFDA's leadership which markets and provinces are asking about Vietnam.",
       acc=["**Given** the seed data and the period Q3 2026 (01/07/2026–30/09/2026), **When** staff open the demand index, **Then** the six indicators are shown, each with the number of records it was computed from.",
            "**Given** an indicator built from fewer than 5 records, **When** it is shown, **Then** it reads *Not enough data* instead of a percentage.",
            "**Given** the period filter is changed from *Quarter* to *Month* (September 2026), **When** the view reloads, **Then** every indicator is recomputed for that month only."]),
  dict(id="US-3", p="P2", title="Send a quarterly report that can be defended",
       journey="As VFDA staff, I want a drafted quarterly report whose every number I can trace, so that I can sign it and send it to the Cinema Department without rechecking by hand.",
       acc=["**Given** the Q3 2026 indicators, **When** staff click *Draft commentary*, **Then** a Vietnamese and an English draft appear, and every number in them links to the indicator it came from.",
            "**Given** a draft that has not been marked *Reread by*, **When** staff click *Export PDF*, **Then** the export is refused with *A staff member must reread the report first*.",
            "**Given** the reread is recorded, **When** staff export, **Then** a PDF with VFDA branding is produced and the export is written to the audit log."]),
  dict(id="US-4", p="P1", title="Every admin action leaves a trace",
       journey="As an admin, I want every change made by VFDA staff, the Legal Board or admins to be recorded permanently, so that disputes about who did what can be settled from the record.",
       acc=["**Given** VFDA staff publish location *Tràng An* on SC-35, **When** the publish succeeds, **Then** one audit record is written with action `location.publish`, the staff member's ID, the location ID and the time.",
            "**Given** any user, including an admin, **When** they try to update or delete an audit record, **Then** the database refuses the change.",
            "**Given** an admin filters the log by person *Nguyễn Thị Thu Hà* and September 2026, **When** the search runs, **Then** only her actions in that month are listed, newest first."]),
 ],
 edge=["The commentary draft fails (model unavailable): the indicators and the PDF export still work; the commentary field stays empty with *Draft unavailable — write it by hand*.",
       "An item in the moderation queue is edited again before it is reviewed: the queue keeps only the latest version and says *Updated after submission*.",
       "A period with no data at all: every indicator shows *Not enough data*; the report cannot be drafted.",
       "The audit log write fails: the admin action it belongs to is rolled back — an action without a record is not allowed."],
 flows=[("4.1 Usage flow — VFDA staff (back office excerpt)",
"""flowchart TD
    S([Sign in to the admin area]) --> HUB[M10 · Admin overview]
    HUB --> A3[M10 · Content moderation]
    HUB --> A4[M10 · Demand indicators]
    A4 --> REP[M10 · Generate the quarterly report]
    REP --> READ[Staff member rereads all figures]
    READ --> E([Sign and send to the Cinema Department and the relevant Provincial People's Committees])""",
"Excerpt of `docs/architecture/usage-flow.md` flow 4 (VFDA staff), M10 branches only. The M3 and M4 branches of the same flow are in `spec-M3.md` and `spec-M4.md`.")],
 seqs=[("4.2 Sequence — demand index and quarterly report (SEQ-12)",
"""sequenceDiagram
    actor VF as VFDA staff
    participant FE as Next.js app
    participant DB as Supabase PostgreSQL + RLS
    participant EF as Edge Function
    participant AI as Language model API

    VF->>FE: Open the demand index dashboard
    FE->>DB: SELECT view demand_index (reporting period)
    DB->>DB: Aggregate 6 indicators from projects and collab_requests
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
    Note over EF: Every figure must trace back to a database query, and a person must read it before sending""",
"Textualised from SEQ-12 (Figure 15). 5 participants, 13 messages. DBIZ2 wrote *briefs*; in this spec a brief is a project (M0) with its location queries (M3)."),
        ("4.3 Sequence — writing the audit log (every admin screen)",
"""sequenceDiagram
    actor ST as VFDA staff
    participant FE as Next.js app
    participant DB as Supabase PostgreSQL + RLS

    ST->>FE: Publish, verify, approve, hide or sign
    FE->>DB: Admin action inside one transaction
    DB->>DB: Trigger writes audit_log (action, admin_id, target_id, at)
    DB-->>FE: Action and log committed together
    FE-->>ST: Confirmation
    Note over DB: audit_log accepts INSERT only - UPDATE and DELETE are refused for every role""",
"Derived — no DBIZ2 figure exists for F-M10-08; drawn from the Function List note *records cannot be edited* and from SYS BR-002.")],
 fr=[("F-M10-01", "The system MUST show VFDA staff a queue of user-published content awaiting review, filterable by content type.", "VFDA Staff", "Must"),
     ("F-M10-02", "The system MUST let VFDA staff approve or hide an item; hiding MUST carry a reason, and every decision is written to the audit log.", "VFDA Staff", "Must"),
     ("F-M10-03", "The system SHOULD aggregate six demand indicators for a reporting period from the platform's own data only.", "System", "Should"),
     ("F-M10-04", "The system SHOULD show the indicators as a data table and charts, visible to the roles `vfda_staff` and `admin` only.", "VFDA Staff", "Should"),
     ("F-M10-05", "The system SHOULD let staff choose the reporting period by month, quarter or year.", "VFDA Staff", "Should"),
     ("F-M10-06", "The system SHOULD draft a Vietnamese and an English commentary from the indicators, where every figure is traceable to its source query.", "System", "Should"),
     ("F-M10-07", "The system SHOULD export the reread report as a VFDA-branded PDF.", "VFDA Staff", "Should"),
     ("F-M10-08", "The system MUST write one audit record for every administrative action, and records MUST NOT be editable or deletable by any role.", "System", "Must"),
     ("F-M10-09", "The system SHOULD let admins search the audit log by person, action type and time.", "Admin", "Should")],
 io={
  "F-M10-01": ("content_type ENUM(org_profile, location_image, showcase) Opt", "moderation_queue ARRAY<(content_id UUID, content_type ENUM, submitted_by UUID, submitted_at TIMESTAMPTZ)>", "`location` in DBIZ2 renamed `location_image`: locations themselves are published through SC-35 (M3); only partner-submitted photos are moderated"),
  "F-M10-02": ("content_id UUID Req; decision ENUM(approved, hidden) Req; reason TEXT Opt", "content_status ENUM(pending, approved, hidden); audit_log_id UUID", "reason required when decision = hidden (BR-002)"),
  "F-M10-03": ("period_start DATE Req; period_end DATE Req", "demand_index JSONB", "6 indicators, each with value and sample size (BR-003)"),
  "F-M10-04": ("demand_index JSONB Req", "dashboard_view JSONB", "admin roles only"),
  "F-M10-05": ("period ENUM(month, quarter, year) Req", "filtered_index JSONB", ""),
  "F-M10-06": ("demand_index JSONB Req", "narrative_vi TEXT; narrative_en TEXT", "every number carries a reference to its indicator"),
  "F-M10-07": ("report_id UUID Req; narrative_vi TEXT Req; demand_index JSONB Req; reread_by UUID Req", "report_pdf_url TEXT", "reread_by added (BR-004)"),
  "F-M10-08": ("action VARCHAR(60) Req; admin_id UUID Req; target_id UUID Opt", "audit_log_id UUID; logged_at TIMESTAMPTZ", "written by a database trigger in the same transaction as the action"),
  "F-M10-09": ("actor_id UUID Opt; action VARCHAR(60) Opt; from_date DATE Opt; to_date DATE Opt", "audit_entries ARRAY<audit_log>", "DBIZ2 `filter JSONB` split into four typed filters"),
 },
 br=[("BR-001", "Content published by partners (profile text, photos) is shown to the public only after VFDA staff approve it; until then the last approved version stays public.", "VFDA's name is on the platform; phase 1 is reviewed before display (Function List F-M10-01)."),
     ("BR-002", "Hiding content requires a written reason, which is sent to the author.", "The author must know what to fix; it also protects VFDA against claims of arbitrary removal."),
     ("BR-003", "Every indicator shows the number of records it was computed from; below 5 records it shows *Not enough data* instead of a value.", "A percentage from three records misleads leadership."),
     ("BR-004", "A quarterly report can be exported only after a named staff member has marked it reread; the draft commentary is never sent as written by the model.", "The report goes out in VFDA's name to state bodies."),
     ("BR-005", "Audit records are append-only: no role, including admin, can update or delete them, and the admin action and its record are committed together or not at all.", "An audit log that can be edited proves nothing (Function List F-M10-08).")],
 entities=[("ModerationItem", "content_id, content_type, submitted_by, submitted_at, content_status, reason, decided_by, decided_at", "refers to Organisation or LocationImage; decided by UserAccount"),
           ("AuditLog", "audit_log_id, action, admin_id, target_id, logged_at", "written for every admin action; belongs to UserAccount"),
           ("DemandIndex", "period, indicators (6 values with sample sizes)", "derived from Project, ProducerOrganisation, LocationQuery, ProjectProvince, CollabRequest — not stored"),
           ("QuarterlyReport", "report_id, period, demand_index, narrative_vi, narrative_en, reread_by, report_pdf_url, exported_at", "prepared by UserAccount")],
 screens=[("SC-34", "Admin — Overview", "Should", "docs/screens/screen-spec-SC-34.md"),
          ("SC-38", "Admin — Content moderation", "Must", "docs/screens/screen-spec-SC-38.md"),
          ("SC-39", "Admin — Demand index", "Should", "docs/screens/screen-spec-SC-39.md"),
          ("SC-40", "Admin — Quarterly report", "Should", "docs/screens/screen-spec-SC-40.md"),
          ("SC-41", "Admin — Audit log", "Should", "docs/screens/screen-spec-SC-41.md")],
 sc=[("VFDA staff clear the day's moderation queue in under 15 minutes when it holds 20 items.", "Timed session with 2 staff members on 20 seeded items."),
     ("A staff member produces a reread, exportable quarterly report in under one working hour.", "Timed walkthrough on the Q3 2026 seed data."),
     ("Every figure in an exported report can be traced to its indicator by a second person without asking the author.", "A second member checks all figures of one report; target 100 %."),
     ("No administrative action in a test session is missing from the audit log.", "Perform 30 scripted admin actions; count matching log records (target 30 of 30).")],
 assumptions=["Test values used until VFDA confirms: minimum sample size for an indicator = 5 records; the moderation queue shows items oldest first.",
              "Only `org_profile` and `location_image` are moderated in this release; `showcase` waits for M8 (phase 2).",
              "The quarterly report is sent by e-mail by VFDA staff outside the platform; the platform only produces the PDF.",
              "A *brief* in DBIZ2 means a project (M0) together with its location queries (M3)."],
 oq=[("Indicator 4 (budget scale of location needs) and indicator 6 (bottleneck most reported) need fields that no function collects today. Add a budget band and a *main obstacle* question to project creation, or drop the two indicators?", True, "Group C (M0 owner) with VFDA"),
     ("Who must reread and sign the quarterly report before it is sent — any staff member, or a named VFDA leader?", False, "Client (VFDA)"),
     ("How long are audit records kept (proposed: for the life of the platform)?", False, "Client (VFDA)"),
     ("Must profile *edits* by an already verified partner also go through moderation, or only the first publication?", False, "Client (VFDA)")],
 trace=[("1. Purpose", "System Design v2.0 — 1. Schematic, §1.2 (M10); TL1 D1 *Vietnam Film Demand Index*, D3 quarterly report, C4 moderation", "`docs/architecture/context.md`"),
        ("4.1 Usage flow", "FLOW-01 flow 4, VFDA staff (Figure 3)", "`docs/architecture/usage-flow.md` §4"),
        ("4.2 Sequence", "SEQ-12 (Figure 15)", "`docs/architecture/sequence-diagrams.md` — SEQ-12"),
        ("5. Functional requirements", "Function List rows 96–104", "`docs/function-list.md` rows 96–104"),
        ("7. Screens", "Screen List SC-34, SC-38 .. SC-41", "`docs/screen-list.md` §1"),
        ("Use cases", "UC-24, UC-25, UC-26", "`docs/architecture/use-case.md`")],
 recon=[("Module priority", "Must (all nine subfunctions)", "Should, except F-M10-01, F-M10-02 (moderation — BR-001 holds back partner content that M4 FR-001 publishes) and F-M10-08 (audit log write, needed by M2, M3, M4), which stay Must", "Changed — Group C decision 01/10/2026"),
        ("Moderated content types", "org_profile, location, showcase", "org_profile, location_image; showcase kept for phase 2", "Changed — Group C proposal"),
        ("Audit log filters", "filter JSONB", "four typed filters (person, action, from, to)", "Changed — Group C proposal"),
        ("Report reread", "Implicit (SEQ-12 note)", "Explicit reread_by field and export gate (BR-004)", "Added — Group C proposal")],
))
