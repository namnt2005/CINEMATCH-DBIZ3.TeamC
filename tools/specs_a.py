# -*- coding: utf-8 -*-
"""Spec Document data — modules SYS, M1, M0, M2."""

MODULES = []

# =============================================================================  SYS
MODULES.append(dict(
 id="SYS", name="Platform foundation — accounts, roles, bilingual UI, notifications, search",
 source="Function List rows 1–11 (F-SYS-01 .. F-SYS-11); Use Case: none of its own (used by every UC); Screens SC-04, SC-05, SC-06, SC-07, SC-08, SC-09, SC-42, SC-43",
 purpose="This module lets people create an account, sign in, and see only what their role allows, in Vietnamese or English. "
         "It also delivers in-app and email notifications and provides the search indexes the other modules rely on.",
 in_scope=["Sign-up, sign-in, password reset and email verification.",
           "Six roles (guest, member, partner, vfda_staff, vfda_legal, admin) enforced at the database layer.",
           "Vietnamese / English interface switching and the display dictionary.",
           "In-app notifications, the notification centre and transactional email.",
           "Accent-insensitive Vietnamese full-text index and the semantic (vector) index."],
 out_scope=["Partner (supplier) self-registration — suppliers are invited by VFDA (module M4).",
            "Single sign-on with Google / Apple (open question).",
            "A translation CMS — the dictionary is two JSON files in the repository.",
            "Any business content: projects, locations, partners, dossiers belong to M0–M7."],
 depends=["External: Supabase Auth, Supabase PostgreSQL (RLS, unaccent, pgvector), Resend (email).",
     "M10 (audit log write, F-M10-08, for role grants — BR-002)"],
 actors=[("Guest", "Primary — signs up, signs in, resets a password", "Function List Actor column (F-SYS-01)"),
         ("Member / Partner / VFDA roles", "Secondary — sign in, switch language, read notifications", "Function List (F-SYS-02, 05, 09)"),
         ("System", "Assigns roles, sends notifications and email, builds indexes", "Function List (F-SYS-04, 07, 08, 10, 11)")],
 stories=[
  dict(id="US-1", p="P1", title="Producer creates an account with company details",
       journey="As an international producer, I want to create an account that records my production company, so that I can unlock local authority contacts and send collaboration requests.",
       acc=["**Given** a guest on the sign-up tab, **When** they submit full name, work email, a password of at least 10 characters, company name, country and crew role and tick the terms box, **Then** an unverified account is created and a verification email is sent.",
            "**Given** an unverified account, **When** the user opens the verification link, **Then** a session starts, the role is `member`, and the user lands on the segment router (SC-02).",
            "**Given** an email that already has an account, **When** the guest submits the form, **Then** the form shows *This email already has an account — Log in?* and no second account is created."]),
  dict(id="US-2", p="P1", title="A role sees only what it is allowed to see",
       journey="As VFDA, I want every record to be filtered by role inside the database, so that sensitive data never reaches a user who should not see it.",
       acc=["**Given** a guest session, **When** any page queries `location_authority_contacts`, **Then** the database returns 0 rows (BR-001).",
            "**Given** a member session, **When** the same query runs, **Then** the contacts for published locations are returned."]),
  dict(id="US-3", p="P2", title="Switch language",
       journey="As a foreign producer, I want to use the site in English, so that I understand every requirement without a translator.",
       acc=["**Given** any page in Vietnamese, **When** the user selects EN, **Then** all interface text switches to English, the scroll position is kept, and the choice is remembered on the next visit."]),
  dict(id="US-4", p="P2", title="Be told when something needs me",
       journey="As a member, I want a notification when a partner or a province replies, so that I do not have to keep checking.",
       acc=["**Given** a partner responds to my request, **When** the response is saved, **Then** I receive one in-app notification and one email within 1 minute.",
            "**Given** unread notifications, **When** I open the notification centre, **Then** I see them newest first with an unread count."]),
 ],
 edge=["Email provider is down during sign-up: the account is created, the verification email is queued and retried; the user sees *Resend email* after 60 seconds.",
       "The same user signs up twice in two tabs: only one account exists; the second submit gets the *already has an account* error.",
       "A verification link is opened after it expired: the user sees *Link expired* and can request a new one.",
       "A user types a Vietnamese search term without accents (e.g. *trang an*): it still matches *Tràng An* (F-SYS-10)."],
 flows=[("4.1 Usage flow — sign-up and first sign-in",
"""flowchart TD
    A([Guest opens Sign up]) --> B[Fill name, work email, password, company, country, crew role]
    B --> C{Form valid?}
    C -- No --> B
    C -- Yes --> D[Account created, verification email sent]
    D --> E[Guest opens the verification link]
    E --> F{Link still valid?}
    F -- No --> G[Request a new link] --> D
    F -- Yes --> H[Profile created with role member]
    H --> I([Segment router SC-02])""",
"**Derived — not a DBIZ2 figure.** The DBIZ2 usage flow has no sign-up branch; this flow is written from SEQ-01 and F-SYS-01..03. Decision diamonds C and F are new and were confirmed by the Client.")],
 seqs=[("4.2 Sequence — sign-up and sign-in (SEQ-01)",
"""sequenceDiagram
    actor GU as Guest
    participant FE as Next.js app
    participant AU as Supabase Auth
    participant DB as Supabase PostgreSQL + RLS
    participant MAIL as Resend

    GU->>FE: Enter email, password, company name
    FE->>FE: Validate format with Zod
    FE->>AU: signUp(email, password)
    AU->>MAIL: Send verification email
    AU-->>FE: Unverified user returned
    GU->>FE: Click verification link in email
    FE->>AU: verifyOtp(token)
    AU->>DB: Create profiles record, role = member
    DB-->>AU: Profile ID
    AU-->>FE: Session
    FE-->>GU: Redirect to the segment router
    Note over DB: No home-made JWT or password hashing — Supabase Auth only""",
"Textualised from `docs/architecture/sequence-diagrams.md` SEQ-01 (System Design v2.0, Figure 4); labels translated to English, participants and messages unchanged (5 participants, 11 messages).")],
 fr=[("F-SYS-01", "The system MUST let a guest create an account with full name, work email, password, company name, country and crew role, and MUST verify the email before the account is active.", "Guest", "Must"),
     ("F-SYS-02", "The system MUST sign users in with email and password through Supabase Auth and return to the page that required sign-in.", "User", "Must"),
     ("F-SYS-03", "The system MUST send a single-use password reset link and let the user set a new password.", "User", "Must"),
     ("F-SYS-04", "The system MUST assign exactly one of six roles to every user and enforce access with Row Level Security in the database.", "System", "Must"),
     ("F-SYS-05", "The system MUST switch all interface text between Vietnamese and English and remember the choice.", "User", "Must"),
     ("F-SYS-06", "The system MUST read every interface string from a bilingual display dictionary, never from hard-coded text.", "System", "Must"),
     ("F-SYS-07", "The system MUST create an in-app notification for every event addressed to a user.", "System", "Must"),
     ("F-SYS-08", "The system MUST send transactional email from a domain authenticated with SPF, DKIM and DMARC.", "System", "Must"),
     ("F-SYS-09", "The system MUST show a user their notifications, newest first, and let them mark them as read.", "User", "Must"),
     ("F-SYS-10", "The system MUST index Vietnamese text so that searches match with or without diacritics.", "System", "Must"),
     ("F-SYS-11", "The system COULD build a semantic (vector) index for location and supplier descriptions. [NEEDS CLARIFICATION: vector dimension depends on the embedding model]", "System", "Could")],
 io={
  "F-SYS-01": ("full_name VARCHAR(120) Req; email VARCHAR(254) Req; password VARCHAR(72) Req; org_name VARCHAR(200) Req; country CHAR(2) Req; crew_role ENUM(producer, director, production_coordinator, line_producer, other) Req; website VARCHAR(300) Opt; consent_version VARCHAR(20) Req",
               "user_id UUID; email_verified BOOLEAN",
               "org_name changed from Opt (DBIZ2) to Req; country, crew_role, website, consent_version added — see §11 reconciliation"),
  "F-SYS-02": ("email VARCHAR(254) Req; password VARCHAR(72) Req; next VARCHAR(300) Opt", "session_token TEXT; expires_at TIMESTAMPTZ", "`next` accepts internal paths only"),
  "F-SYS-03": ("email VARCHAR(254) Req; reset_token TEXT Req; new_password VARCHAR(72) Req", "reset_status ENUM(sent, ok, expired)", "new_password ≥ 10 characters"),
  "F-SYS-04": ("user_id UUID Req; role ENUM(guest, member, partner, vfda_staff, vfda_legal, admin) Req; account_status ENUM(active, deactivated) Opt", "access_granted BOOLEAN; policy_name TEXT", "role set in the database, never from the client; a deactivated account gets no access (BR-005)"),
  "F-SYS-05": ("locale ENUM(vi, en) Req", "rendered_locale ENUM(vi, en)", "stored in cookie `locale`"),
  "F-SYS-06": ("message_key VARCHAR(120) Req; locale ENUM(vi, en) Req", "message_text TEXT", "missing key fails the build"),
  "F-SYS-07": ("event_type VARCHAR(60) Req; recipient_id UUID Req; payload JSONB Req", "notification_id UUID; created_at TIMESTAMPTZ", ""),
  "F-SYS-08": ("recipient_email VARCHAR(254) Req; template_id VARCHAR(60) Req; variables JSONB Req", "delivery_status ENUM(queued, sent, bounced); provider_message_id TEXT", "retried up to 3 times"),
  "F-SYS-09": ("user_id UUID Req; unread_only BOOLEAN Opt", "notifications ARRAY<notification>; unread_count INTEGER", "a user reads only their own"),
  "F-SYS-10": ("source_text TEXT Req; locale ENUM(vi, en) Req", "search_vector TSVECTOR", "unaccent + `simple` configuration"),
  "F-SYS-11": ("source_text TEXT Req", "embedding VECTOR(n)", "[NEEDS CLARIFICATION: n]"),
 },
 br=[("BR-001", "Sensitive data (authority contacts, partner private layer, project documents) is filtered by Row Level Security in the database. Hiding it in the interface does not count.", "A page's HTML source is public; only the database can guarantee a guest never receives the data."),
     ("BR-002", "A new account is always `member`. The roles `partner`, `vfda_staff`, `vfda_legal` and `admin` are granted only by an admin, and every grant is written to the audit log.", "Supplier accounts carry the VFDA Verified trust; they cannot be self-declared."),
     ("BR-003", "Acceptance of the terms is stored with the document version and timestamp.", "To prove later which terms a user agreed to."),
     ("BR-004", "Passwords, password hashing and tokens are handled only by Supabase Auth.", "Home-made authentication is the most common source of security bugs."),
     ("BR-005", "An account is never hard-deleted. When its owner deletes it (SC-08), it is deactivated at once, loses all access, and its name, email and phone are replaced by anonymous values within 30 days; projects, uploads, access logs and approvals it created stay and are shown as *Former member*.", "Personal data must be removable on request, while projects, legal approvals and audit records must stay intact for the other people who rely on them.")],
 entities=[("UserAccount", "user_id, email, email_verified, role, created_at", "has one Profile"),
           ("Profile", "full_name, crew_role, locale, producer_org_id", "belongs to UserAccount; belongs to ProducerOrganisation"),
           ("ProducerOrganisation", "org_name, country, website", "has many Profiles; has many Projects (M0)"),
           ("Consent", "user_id, consent_version, accepted_at", "belongs to UserAccount"),
           ("Notification", "notification_id, recipient_id, event_type, payload, read_at", "belongs to UserAccount"),
           ("EmailDelivery", "template_id, recipient_email, delivery_status, provider_message_id", "may relate to a Notification")],
 screens=[("SC-04", "Sign up / Log in (includes SC-05)", "Must", "docs/screens/screen-spec-SC-04.md"),
          ("SC-06", "Forgot password", "Must", None), ("SC-07", "Reset password", "Must", None),
          ("SC-08", "My account", "Must", None), ("SC-09", "Notification centre", "Must", None),
          ("SC-42", "Privacy policy", "Must", None), ("SC-43", "Terms of use", "Must", None)],
 sc=[("A first-time producer completes sign-up, including company details, in under 3 minutes.", "Timed walkthrough with 5 non-Vietnamese testers."),
     ("A visitor who has not signed in can never obtain a local authority phone number or email from the site.", "Private-window check of the full page content on 10 location pages."),
     ("Every interface string on the 44 MVP screens is available in both languages.", "Switch language on each screen; count untranslated strings (target 0)."),
     ("A member learns that a partner has replied within 5 minutes of the reply.", "Timestamp of reply vs timestamp of notification on 10 test requests.")],
 assumptions=["Email + password is enough for the MVP; social sign-in is not required at launch.",
              "Six roles are enough; there is no per-province VFDA staff role in the MVP.",
              "Country is recorded as ISO 3166-1 alpha-2."],
 oq=[("Must a producer company be verified (e.g. business registration, IMDbPro) before seeing local authority contacts?", True, "Client (VFDA)"),
     ("Is Google / Apple sign-in required at launch?", False, "Client (VFDA)"),
     ("Which embedding model (and vector dimension) is used for F-SYS-11?", False, "Group C"),
     ("SEQ-01 has no error branch (email provider down, expired link). Confirm the behaviour written in the edge cases.", False, "Client (VFDA)")],
 trace=[("1. Purpose", "System Design v2.0 — 1. Schematic, §1.1–1.2", "`docs/architecture/context.md`"),
        ("4.1 Usage flow", "Derived from SEQ-01 + F-SYS-01..03 (no DBIZ2 figure)", "this document"),
        ("4.2 Sequence", "Sequence diagram SEQ-01 (Figure 4)", "`docs/architecture/sequence-diagrams.md` — SEQ-01"),
        ("5. Functional requirements", "Function List rows 1–11", "`docs/function-list.md` rows 1–11"),
        ("7. Screens", "Screen List SC-04..SC-09, SC-42, SC-43", "`docs/screen-list.md` §1")],
 recon=[("Sign-up fields", "F-SYS-01: org_name optional; no country / crew role", "org_name, country, crew_role required (screen list note #2: *collect organisation / production company details*)", "Changed — Confirmed by the Client"),
        ("F-SYS-11 priority", "Must", "Could — only used by semantic partner search (F-M4-07), itself Could in the MVP Scope", "Changed — Confirmed by the Client")],
))

# =============================================================================  M1
MODULES.append(dict(
 id="M1", name="Segment router",
 source="Function List rows 21–23 (F-M1-01 .. F-M1-03); Use Case UC-01; Screens SC-01, SC-02",
 purpose="This module finds out which of three situations a production is in — shooting in Vietnam for release abroad (A), shooting and releasing in Vietnam (B), or only hiring people or services from Vietnam (C). "
         "The answer decides which documents, steps and gauges the rest of the product shows.",
 in_scope=["The landing page entry point and the four-question router.",
           "Showing the result with the reason and what it means (*needed / not needed*).",
           "Letting the user override the result and change segment later."],
 out_scope=["Legal advice on which licence applies — the router only applies VFDA's decision table.",
            "Creating the project (module M0); the router only hands the segment over."],
 depends=["M0 — receives the segment when a project is created.", "M5 — reads `segment_requirements` for the document kit.", "SYS — bilingual text."],
 actors=[("Guest", "Primary — answers the questions", "Function List (F-M1-01)"),
         ("Member", "Primary — changes segment in project settings", "Function List (F-M1-03)"),
         ("System", "Applies the decision table and configures the journey", "Function List (F-M1-02)")],
 stories=[
  dict(id="US-1", p="P1", title="Find my segment in under a minute",
       journey="As an international producer, I want to answer a few questions and be told what my situation requires, so that I know what I am getting into before committing.",
       acc=["**Given** the router, **When** the user answers *Yes* (shoot in Vietnam), *Outside Vietnam* (release) and *Foreign company* (producer), **Then** the result is segment A with the reason *based on answers 1, 2 and 3*.",
            "**Given** a result, **When** it is shown, **Then** it lists what is *Needed* and *Not needed* for that segment, read from `segment_requirements`.",
            "**Given** the same answers twice, **When** the router runs, **Then** it returns the same segment (decision table, no language model)."]),
  dict(id="US-2", p="P2", title="Override the result",
       journey="As a producer who knows my case is different, I want to pick another segment, so that the product does not force a wrong checklist on me.",
       acc=["**Given** a result A, **When** the user clicks the B card, **Then** the result becomes B and `segment_override = true` is recorded."]),
  dict(id="US-3", p="P3", title="Change segment on an existing project",
       journey="As a member, I want to change my project's segment later, so that I can correct an early mistake without losing work.",
       acc=["**Given** a project in segment A with uploaded documents, **When** the member changes it to B, **Then** the journey configuration changes and no uploaded document is deleted (`data_retained = true`)."]),
 ],
 edge=["Answers match no rule (e.g. *not shooting in Vietnam* but *needs locations*): show all three segments and *Ask VFDA*.",
       "The user leaves after question 2: nothing is stored server-side; answers are kept only in the browser session.",
       "Co-production (answer 3 = *co-production*): [NEEDS CLARIFICATION: A or B?] — shown as open question 1."],
 flows=[("4.1 Usage flow — choosing a segment",
"""flowchart TD
    S([Open the landing page]) --> Q1{M1 · What do you want to do in Vietnam?}
    Q1 -- "Segment A: shoot, release abroad" --> PRE[M2·1 · 200-word pre-check - no sign-up needed]
    Q1 -- "Segment B: shoot and release in Vietnam" --> PRE
    Q1 -- "Segment C: hire services only" --> CJUMP([See the segment C flow in spec-M4])""",
"Textualised from `docs/architecture/usage-flow.md` flow 1 (top part) — this is the **only** decision diamond in the original DBIZ2 usage-flow figure (FLOW-01) and it is kept with its three branch labels, translated to English.")],
 seqs=[("4.2 Sequence — router result",
"""sequenceDiagram
    actor GU as Guest
    participant FE as Next.js app
    participant DB as Supabase PostgreSQL + RLS

    GU->>FE: Answer questions 1 to 4
    FE->>DB: Read segment_rules and segment_requirements
    DB-->>FE: Decision table + requirements
    FE->>FE: Apply decision table to the answers
    FE-->>GU: Segment, reason, needed / not needed
    alt user overrides
        GU->>FE: Pick another segment card
        FE->>FE: segment_override = true
    end
    GU->>FE: Confirm and create project
    FE-->>GU: Go to project creation (SC-10)""",
"**Derived — no DBIZ2 sequence exists for M1.** Written from F-M1-01..03 and SC-02 — confirmed by the Client.")],
 fr=[("F-M1-01", "The system MUST show the segment choice first on the landing page and ask at most four questions to determine the segment.", "Guest", "Must"),
     ("F-M1-02", "The system MUST derive the segment from a decision table stored in the database, show the reason and the *needed / not needed* list, and configure the journey from table data, not code.", "System", "Must"),
     ("F-M1-03", "The system MUST let a member change a project's segment without deleting data already entered.", "Member", "Must")],
 io={
  "F-M1-01": ("none", "segment_options ARRAY<(code ENUM(A,B,C), label_vi TEXT, label_en TEXT)>", ""),
  "F-M1-02": ("q1_shoot_in_vn BOOLEAN Req; q2_release ENUM(abroad, vietnam, both) Opt; q3_producer ENUM(foreign, vietnamese, coproduction) Opt; q4_needs ARRAY<ENUM(locations, crew, cast, equipment, logistics)> Opt; segment_override ENUM(A, B, C) Opt",
              "segment ENUM(A, B, C); decided_by ARRAY<INTEGER>; journey_config JSONB",
              "q2, q3 required when q1 = true; answer fields added in Session 4 (DBIZ2 input was `segment` only)"),
  "F-M1-03": ("project_id UUID Req; new_segment ENUM(A, B, C) Req", "journey_config JSONB; data_retained BOOLEAN", "data_retained is always true"),
 },
 br=[("BR-001", "The segment is decided by a deterministic decision table (`segment_rules`) approved by VFDA; the same answers always give the same segment.", "Explainability: a producer must be able to see why."),
     ("BR-002", "Question 4 never changes the segment; it only pre-selects service groups in M4.", "Keeps the decision table small and auditable."),
     ("BR-003", "A manual override is always allowed and always recorded.", "VFDA needs to see where the router is wrong."),
     ("BR-004", "Changing segment never deletes documents or answers; items that no longer apply are hidden, not removed.", "Producers often start in the wrong segment.")],
 entities=[("SegmentRule", "rule_id, q1, q2, q3, result_segment, version", "used by SegmentDecision"),
           ("SegmentRequirement", "segment, requirement_code, label_vi, label_en, needed", "belongs to a segment"),
           ("SegmentDecision", "segment_decision_id, project_id, session_key, segment_rule_id, answers, segment, decided_by, segment_override", "belongs to Project (M0) once saved; before that to an anonymous session")],
 screens=[("SC-01", "Landing — Introduction", "Must", "docs/screens/screen-spec-SC-01.md"),
          ("SC-02", "Segment router + A/B/C result", "Must", "docs/screens/screen-spec-SC-02.md"),
          ("SC-13", "Project settings (change segment)", "Must", None)],
 sc=[("A first-time visitor reaches a segment result in under 60 seconds.", "Timed test with 5 international producers."),
     ("At least 4 in 5 test producers agree the segment they were given is correct for their project.", "Post-test question on 5 real project descriptions."),
     ("VFDA can see how often each result is overridden.", "Monthly count of `segment_override = true`.")],
 assumptions=["Three segments cover every MVP case; unusual cases go to *Ask VFDA*.",
              "The decision table is small enough (≤ 20 rows) for VFDA to review by hand."],
 oq=[("Co-production (question 3): segment A or B, or a separate segment?", True, "Client (VFDA)"),
     ("Does segment C (only hiring Vietnamese cast or services, no shooting in Vietnam) really need no licence at all?", True, "Client (VFDA)")],
 trace=[("1. Purpose", "System Design v2.0 — 1. Schematic, §1.2 (M1)", "`docs/architecture/context.md`"),
        ("4.1 Usage flow", "Usage Flow FLOW-01, diamond M1 (Figure 3)", "`docs/architecture/usage-flow.md` §1"),
        ("4.2 Sequence", "Derived (no DBIZ2 figure)", "this document"),
        ("5. Functional requirements", "Function List rows 21–23", "`docs/function-list.md` rows 21–23"),
        ("7. Screens", "Screen List SC-01, SC-02, SC-13", "`docs/screen-list.md` §1")],
 recon=[("Router input", "F-M1-02 input: `segment` chosen from three cards", "Four questions decide the segment; cards remain as override (screen list note #3)", "Changed — Confirmed by the Client"),
        ("Who a decision belongs to", "one value meaning either a session or a project", "`project_id` once the project is saved, `session_key` before that; exactly one is set (§6.1)", "Changed — Group C decision 01/10/2026")],
))

# =============================================================================  M0
MODULES.append(dict(
 id="M0", name="Project workspace and readiness dashboard",
 source="Function List rows 12–20 (F-M0-01 .. F-M0-09); Use Case UC-05, UC-06; Screens SC-10, SC-11, SC-12, SC-13",
 purpose="This module gives each production one place to prepare its shoot in Vietnam and shows, on five gauges, how ready it is and what to do next. "
         "Every other module reports its progress here.",
 in_scope=["Creating, editing and listing projects; inviting colleagues.",
           "Five readiness gauges (content and compliance, locations, partners, dossier and permits, logistics) and one overall score.",
           "One *Next step* per gauge.",
           "Nightly readiness snapshots and (Could) a progress chart."],
 out_scope=["The work behind each gauge (M2, M3, M4, M5) — M0 only displays their results.",
            "The logistics gauge content (M6, phase 2) — shown as not yet available.",
            "Budgeting and scheduling of the shoot itself."],
 depends=["M1 (segment)", "M2 (compliance score)", "M3 (shortlist)", "M4 (partner status)", "M5 (dossier status, countdown)", "SYS (roles, notifications)"],
 actors=[("Member", "Primary — creates and follows a project", "Function List (F-M0-01..04, 06, 09)"),
         ("System", "Computes scores, next steps and snapshots", "Function List (F-M0-05, 07, 08)")],
 stories=[
  dict(id="US-1", p="P1", title="Create a project with three fields",
       journey="As a producer, I want to create a project with only a name, a format and my segment, so that I can start before I know every detail.",
       acc=["**Given** a member arriving from the router with segment A, **When** they open *New project*, **Then** the segment field is pre-filled with A.",
            "**Given** name, format and segment filled, **When** they click *Create project*, **Then** the project exists, the creator is its owner, and the dashboard (SC-12) opens with every gauge at 0% and a first next step."]),
  dict(id="US-2", p="P1", title="See what to do next",
       journey="As a producer, I want each gauge to tell me the single next thing to do, so that I never wonder what is blocking my shoot.",
       acc=["**Given** a segment A project with 2 of 4 Article 13 components present, **When** the dashboard loads, **Then** the *Dossier & permits* gauge shows 50 % and the next step names the two missing components.",
            "**Given** a segment C project, **When** the dashboard loads, **Then** the *Dossier & permits* gauge is not shown (BR-002).",
            "**Given** the score view fails, **When** the dashboard loads, **Then** each gauge shows `—` and *Retry*, never a fake 0%."]),
  dict(id="US-3", p="P2", title="Invite a colleague",
       journey="As a project owner, I want to invite my line producer, so that we work on the same project.",
       acc=["**Given** an owner, **When** they invite an email with permission *edit*, **Then** an invitation is sent and the person sees the project after accepting."]),
 ],
 edge=["A module fails to report: its gauge shows `—` with *not calculated yet*; the overall score is computed only from gauges that reported, and says so.",
       "Two members edit the project name at the same time: last write wins; the other sees a toast *updated by …*.",
       "The first shooting day is moved earlier than today + safe deadline: the countdown turns red (M5)."],
 flows=[("4.1 Usage flow — main producer journey (segments A and B)",
"""flowchart TD
    S([Open the landing page]) --> Q1{M1 · What do you want to do in Vietnam?}
    Q1 -- "Segment A: shoot, release abroad" --> PRE[M2·1 · 200-word pre-check]
    Q1 -- "Segment B: shoot and release in Vietnam" --> PRE
    Q1 -- "Segment C: hire services only" --> CJUMP([See flow 2])
    PRE --> DASH[M0 · Create project + readiness dashboard]
    DASH --> LOC[M3 · Find locations from a scene description · compare · shortlist]
    LOC --> Q2{Any location scoring 40 or more?}
    Q2 -- No --> ASK[Ask VFDA for advice] --> LOC
    Q2 -- Yes --> PART[M4 · Vietnamese service partner - required by Article 13]
    PART --> Q3{How did the partner respond?}
    Q3 -- Declined --> PART
    Q3 -- More information needed --> PART
    Q3 -- Accepted --> DOS[M5 · Four-component dossier · bilingual draft · countdown]
    DOS --> CHK[M2 · Dossier check + topic review]
    CHK --> Q4{All four Article 13 components present?}
    Q4 -- Not yet --> DOS
    Q4 -- Yes --> NOTI[M7 · Notify provincial People's Committee · book VFDA consultation]
    NOTI --> E([Ready to submit through the competent authority's procedure])""",
"Textualised from `docs/architecture/usage-flow.md` flow 1 (FLOW-01, Figure 3), translated to English. M0 is the hub node *DASH*. Diamonds Q2–Q4 were added in Session 4 Step 3 from Function List rules (not in the original figure) — confirmed by the Client.")],
 seqs=[("4.2 Sequence — dashboard load",
"""sequenceDiagram
    actor U as Producer
    participant FE as Next.js app
    participant DB as Supabase PostgreSQL + RLS

    U->>FE: Open project
    FE->>DB: SELECT v_project_readiness WHERE project_id
    DB->>DB: Combine M2, M3, M4, M5 results with segment weights
    DB-->>FE: gauge_scores, readiness_total, next_actions
    FE-->>U: Five gauges, next steps, countdown strip
    alt view fails
        DB-->>FE: error
        FE-->>U: Each gauge shows a dash and Retry
    end""",
"**Derived — no DBIZ2 sequence exists for the dashboard.** Written from F-M0-05..07 and SC-12. SEQ-05 (`sequence-diagrams.md`) shows the gauge being recalculated after a shortlist, which is the same mechanism. Confirmed by the Client.")],
 fr=[("F-M0-01", "The system MUST create a project from a name, a format and a segment, make the creator its owner and open its dashboard.", "Member", "Must"),
     ("F-M0-02", "The system MUST let project members with *edit* permission update project details, including the first shooting day.", "Member", "Must"),
     ("F-M0-03", "The system MUST list the projects a user belongs to, each with readiness, first shooting day and next step.", "Member", "Must"),
     ("F-M0-04", "The system MUST let an owner invite people by email with *view* or *edit* permission.", "Member", "Must"),
     ("F-M0-05", "The system MUST compute the five gauge scores and the overall readiness in a database view, weighted by segment.", "System", "Must"),
     ("F-M0-06", "The system MUST show the dashboard with the gauges that apply to the project's segment.", "Member", "Must"),
     ("F-M0-07", "The system MUST give every gauge exactly one next step, generated by rules, never left empty.", "System", "Must"),
     ("F-M0-08", "The system MUST store a readiness snapshot for every active project every night.", "System", "Must"),
     ("F-M0-09", "The system SHOULD draw the readiness trend from the snapshots.", "Member", "Could")],
 io={
  "F-M0-01": ("project_name VARCHAR(200) Req; format ENUM(feature, documentary, commercial, tv, music_video) Req; segment ENUM(A, B, C) Req; shoot_date DATE Opt; shoot_days_vn INTEGER Opt; crew_size_band ENUM(u15, 15_50, o50) Opt; provinces ARRAY<INTEGER> Opt; logline VARCHAR(500) Opt",
              "project_id UUID; readiness_total NUMERIC(5,2)", "format, shoot_days_vn, crew_size_band, provinces added (SC-10); provinces from the 34-province list"),
  "F-M0-02": ("project_id UUID Req; project_name VARCHAR(200) Opt; shoot_date DATE Opt; logline VARCHAR(500) Opt; stage ENUM(draft, preparing, archived) Opt", "updated_at TIMESTAMPTZ", "shoot_date must be after today"),
  "F-M0-03": ("user_id UUID Req", "projects ARRAY<project_summary>", "RLS: member projects only"),
  "F-M0-04": ("project_id UUID Req; invitee_email VARCHAR(254) Req; permission ENUM(view, edit) Req", "member_id UUID; invite_status ENUM(pending, accepted)", "owner only"),
  "F-M0-05": ("project_id UUID Req", "gauge_scores JSONB; readiness_total NUMERIC(5,2)", "weights from `segment_requirements`"),
  "F-M0-06": ("project_id UUID Req", "dashboard_view JSONB", ""),
  "F-M0-07": ("gauge_scores JSONB Req", "next_actions ARRAY<action_code VARCHAR(40)>", "one per gauge"),
  "F-M0-08": ("project_id UUID Req; snapshot_date DATE Req", "snapshot_id UUID", "pg_cron, nightly"),
  "F-M0-09": ("project_id UUID Req; from_date DATE Opt", "series ARRAY<(date DATE, readiness_total NUMERIC(5,2))>", ""),
 },
 br=[("BR-001", "Scores are computed only in the database view `v_project_readiness`; the interface never recomputes them.", "Every screen must show the same number."),
     ("BR-002", "Gauges shown depend on segment: segment C has no *Dossier & permits* gauge; the *Logistics* gauge is shown as `—` until phase 2.", "0% and *not applicable* mean different things."),
     ("BR-003", "Each gauge always has one next step; when a gauge is complete its next step reads *Done*.", "The next step is the main information on the dashboard, not the percentage."),
     ("BR-004", "Weights per segment are read from `segment_requirements`, never hard-coded.", "VFDA must be able to change them without a release."),
     ("BR-005", "Projects are archived, never deleted. An archived project (`stage = archived`) is read-only for its members, leaves the project list, and keeps its documents, requests and notices.", "Collaboration requests, provincial notices and access logs refer to the project and must stay explainable.")],
 entities=[("Project", "project_id, project_name, format, segment, shoot_date, shoot_days_vn, crew_size_band, logline, stage", "belongs to ProducerOrganisation; has many ProjectMembers"),
           ("ProjectMember", "project_id, user_id, permission, invite_status", "belongs to Project and UserAccount"),
           ("ProjectProvince", "project_id, province_id", "belongs to Project"),
           ("ReadinessView", "project_id, gauge_scores, readiness_total, next_actions", "derived from M2, M3, M4, M5 data"),
           ("ReadinessSnapshot", "snapshot_id, project_id, snapshot_date, readiness_total", "belongs to Project")],
 screens=[("SC-10", "Project list / New project (includes SC-11)", "Must", "docs/screens/screen-spec-SC-10.md"),
          ("SC-12", "Readiness dashboard (5 gauges)", "Must", "docs/screens/screen-spec-SC-12.md"),
          ("SC-13", "Project settings", "Must", None)],
 sc=[("A producer can say what their next step is within 10 seconds of opening the dashboard.", "Five-second test with 5 producers: ask *what do you do next?*"),
     ("A new project can be created in under 1 minute with only three fields.", "Timed test with 5 producers."),
     ("The readiness shown on the project list and on the dashboard is always identical.", "Compare both screens on 20 test projects.")],
 assumptions=["A project belongs to one producer organisation.", "Overall readiness is a weighted average of the gauges that apply to the segment.",
     "Test values used until VFDA confirms the gauge formulas and weights (TL5 formulas, adapted to the data this spec stores): *Content & compliance* = 30 % if the project has a compliance run + 30 % if its latest run used the active rule-set version + 40 % × the share of that run's findings marked reviewed (all 40 % when it has no finding).",
     "*Locations* = 50 % with at least one shortlisted location + 25 % when a primary is set + 25 % when a backup is set.",
     "*Partners* = 30 % once a collaboration request is sent, 70 % once one is accepted, 100 % once one is confirmed (M4 BR-005).",
     "*Dossier & permits* = the share of the four Article 13 components whose slot is `present` (segments A and B only).",
     "*Logistics* is not scored until phase 2 (shown as `—`, weight 0). Overall readiness = equal weights of the scored gauges: segments A and B 4 × 25 %; segment C 3 × 33.3 % (no *Dossier & permits* gauge). Safety buffer = 7 days."],
 oq=[("Weights of the five gauges in the overall score, per segment.", True, "Client (VFDA)"),
     ("Is the 7-day safety buffer before the first shooting day editable by the producer?", False, "Client (VFDA)"),
     ("Can people outside the producer organisation (a lawyer, a freelance line producer) be invited to a project?", False, "Client (VFDA)")],
 trace=[("1. Purpose", "System Design v2.0 — 1. Schematic, §1.2 (M0)", "`docs/architecture/context.md`"),
        ("4.1 Usage flow", "Usage Flow FLOW-01 (Figure 3) + Step 3 additions", "`docs/architecture/usage-flow.md` §1"),
        ("4.2 Sequence", "Derived; mechanism shown in SEQ-05", "`docs/architecture/sequence-diagrams.md` — SEQ-05"),
        ("5. Functional requirements", "Function List rows 12–20", "`docs/function-list.md` rows 12–20"),
        ("7. Screens", "Screen List SC-10..SC-13", "`docs/screen-list.md` §1")],
 recon=[("Project creation fields", "F-M0-01: name, segment, shoot date, logline", "format required; shoot days, crew size and provinces added (SC-10)", "Changed — Confirmed by the Client"),
        ("F-M0-09 priority", "Must", "Could — no chart on the SC-12 mockup", "Changed — Confirmed by the Client")],
))

# =============================================================================  M2
MODULES.append(dict(
 id="M2", name="Content pre-check and Article 13 dossier check",
 source="Function List rows 24–41 (F-M2-01 .. F-M2-18); Use Case UC-02, UC-03, UC-04, UC-19, UC-21; Screens SC-03, SC-48, SC-27, SC-29, SC-30, SC-31, SC-37",
 purpose="This module tells a producer, before they commit, which parts of their story are likely to be looked at closely by the reviewing authority and whether their licence dossier has the four components Article 13 requires. "
         "Every finding cites the rule written and signed by the VFDA Legal Board; the system never interprets the law on its own.",
 in_scope=["The legal rule base: VFDA Legal Board writes, signs and versions rules.",
           "The 200-word content pre-check (no sign-up) and its result with highlighted passages and cited findings.",
           "The deterministic check of the four Article 13 clause 3 dossier components.",
           "Topic review of a project synopsis against the rule base.",
           "The public requirements library.",
           "The 20-day licensing timeline calculation (Article 13 clause 4)."],
 out_scope=["Deciding whether a film is approved — the reviewing authority decides.",
            "Rewriting the producer's story — the system only shows the rule's own *Points to consider*.",
            "Submitting the dossier to the Ministry (phase 3 integration).",
            "Film classification for release in Vietnam (M9, phase 2)."],
 depends=["SYS (roles, notifications)", "M0 (compliance gauge)", "M5 (uploaded documents, countdown screen)", "M4 (service agreement status for component c)", "External: language model API"],
 actors=[("Guest", "Primary — runs the 200-word pre-check", "Function List (F-M2-05, 15, 16)"),
         ("Member", "Primary — runs checks on a project, marks findings reviewed", "Function List (F-M2-09, 13, 14, 18)"),
         ("VFDA Legal Board (`vfda_legal`)", "Primary — writes, signs and versions rules", "Function List (F-M2-01..03)"),
         ("System", "Runs the checks, verifies citations, computes timelines", "Function List (F-M2-04, 06–08, 10–12, 17)")],
 stories=[
  dict(id="US-1", p="P1", title="Pre-check my story without signing up",
       journey="As an international producer, I want to paste a 200-word summary and see which topics may be scrutinised, so that I can prepare before I invest.",
       acc=["**Given** a guest with a 96-word summary, **When** they click *Check content*, **Then** within 30 seconds they see an attention level (Low / Medium / High), the highlighted passages and one card per finding.",
            "**Given** a finding produced by the model whose rule code is not in the approved rule base, **When** results are verified, **Then** the finding is dropped and never shown (F-M2-12).",
            "**Given** no findings, **When** the result is shown, **Then** it reads *No points needing attention were found under rule set 2026.08* and never *approved* or *compliant* (BR-003)."]),
  dict(id="US-2", p="P1", title="Know whether my dossier is complete",
       journey="As a producer, I want to see which of the four Article 13 components I still miss, so that I do not submit an incomplete dossier and lose the 20 days.",
       acc=["**Given** a project with the application form uploaded and nothing else, **When** the check runs, **Then** it shows 1 / 4 and *Not ready to submit*, and lists the three missing components.",
            "**Given** a Vietnamese synopsis with paragraphs not yet proofread, **When** the check runs, **Then** component b shows *Needs fixing*, not *Present*."]),
  dict(id="US-3", p="P1", title="VFDA Legal Board signs a rule",
       journey="As a member of the VFDA Legal Board, I want to write and sign rules myself, so that VFDA — not the developers — owns what the product says about the law.",
       acc=["**Given** a draft rule without a citation, **When** the officer clicks *Approve and sign*, **Then** the database rejects activation and the citation field is highlighted.",
            "**Given** a rule with a citation, **When** it is approved, **Then** a new rule-set version is created and every later check records that version."]),
  dict(id="US-4", p="P2", title="See my licensing timeline",
       journey="As a producer, I want to know the latest safe date to file, so that a resubmission does not push my shoot.",
       acc=["**Given** a first shooting day of 15/03/2027 and a 7-day buffer, **When** the timeline is computed, **Then** the safe submission deadline is 27/01/2027 and the latest deadline is 16/02/2027."]),
  dict(id="US-5", p="P3", title="Read requirements without an account",
       journey="As a visitor, I want to browse the requirements by topic, so that I understand the rules before using the tools.",
       acc=["**Given** the requirements library, **When** a visitor filters by segment A, **Then** only approved rules for segment A are listed, each with its bilingual description and citation."]),
 ],
 edge=["The language model API is down: the pre-check shows *Could not check right now — your text is kept*; the dossier completeness check (deterministic) still works.",
       "Every finding fails citation verification: the result says *Could not check this time* rather than showing an empty *Low* result.",
       "The rule set changes while a producer is reading an old result: the old result keeps its version label; [NEEDS CLARIFICATION: re-run automatically or notify?].",
       "A guest runs the pre-check 50 times in an hour: rate limit per IP returns *You have used today's checks — create a free account to continue*."],
 flows=[("4.1 Usage flow — VFDA Legal Board",
"""flowchart TD
    S([Sign in with role vfda_legal]) --> L[M2 · Legal rule base screen]
    L --> N[Write a new rule]
    N --> Q1{Citation filled in?}
    Q1 -- Not yet --> BLOCK[System refuses to activate - database constraint] --> N
    Q1 -- Yes --> Q2{Signed by an approver?}
    Q2 -- Not yet --> DRAFT[Kept as Draft] --> N
    Q2 -- Yes --> ACT[Rule activated - new rule-set version]
    ACT --> E([Every later check uses this version])""",
"Textualised from `docs/architecture/usage-flow.md` flow 5, translated to English. Diamonds Q1, Q2 were added in Step 3 from F-M2-02/03 — confirmed by the Client."),
        ("4.1b Usage flow — dossier loop (excerpt of the producer journey)",
"""flowchart TD
    DOS[M5 · Four-component dossier · bilingual draft · countdown] --> CHK[M2 · Dossier check + topic review]
    CHK --> Q4{All four Article 13 components present?}
    Q4 -- Not yet --> DOS
    Q4 -- Yes --> NOTI([M7 · Notify provincial People's Committee])""",
"Excerpt of `usage-flow.md` flow 1 (nodes DOS, CHK, Q4, NOTI). Diamond Q4 added in Step 3. Confirmed by the Client.")],
 seqs=[("4.2 Sequence — 200-word pre-check (SEQ-02)",
"""sequenceDiagram
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
    Note over EF: Never concludes approved or not — only raises points for a human to consider""",
"Textualised from SEQ-02 (Figure 5). 5 participants, 11 messages, translated to English."),
        ("4.3 Sequence — Article 13 completeness check (SEQ-08)",
"""sequenceDiagram
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
    Note over DB: Deterministic logic, no language model""",
"Textualised from SEQ-08 (Figure 11). 4 participants, 12 messages."),
        ("4.4 Sequence — topic review of a project (SEQ-09)",
"""sequenceDiagram
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
    Note over EF: No warning is ever shown without a cited article""",
"Textualised from SEQ-09 (Figure 12). 5 participants, 12 messages. None of the three DBIZ2 sequences draws an error branch — see open question 6.")],
 fr=[("F-M2-01", "The system MUST list legal rules, filterable by topic and status, to the VFDA Legal Board.", "VFDA Legal", "Must"),
     ("F-M2-02", "The system MUST let the VFDA Legal Board create and edit rules with bilingual title, description and *Points to consider*, a citation and a severity.", "VFDA Legal", "Must"),
     ("F-M2-03", "The system MUST activate a rule only after an approver signs it; a rule without a citation or an approver MUST NOT become active (database constraint).", "VFDA Legal", "Must"),
     ("F-M2-04", "The system MUST create a new rule-set version on every activation and record the version used by every check.", "System", "Must"),
     ("F-M2-05", "The system MUST accept a summary of 20–200 words from a guest without sign-up, rate-limited per IP.", "Guest", "Must"),
     ("F-M2-06", "The system MUST compare the summary with the active rule set and return findings, each with rule code, quoted passage and explanation, plus an attention level (Low / Medium / High).", "System", "Must"),
     ("F-M2-07", "The system MUST record every pre-check (hash, language, time) as a demand data point.", "System", "Must"),
     ("F-M2-08", "The system MUST check the four Article 13 clause 3 components deterministically, without a language model.", "System", "Must"),
     ("F-M2-09", "The system MUST show which components are missing, with a status and an action for each.", "Member", "Must"),
     ("F-M2-10", "The system MUST push the completeness result to the dashboard's compliance gauge.", "System", "Must"),
     ("F-M2-11", "The system MUST call the language model with only the codes of approved rules and require structured output.", "System", "Must"),
     ("F-M2-12", "The system MUST drop every finding whose rule code is unknown or whose quoted text does not appear in the submitted text.", "System", "Must"),
     ("F-M2-13", "The system MUST show every finding with its citation and never show a finding without one.", "Member", "Must"),
     ("F-M2-14", "The system MUST let a member mark each finding as reviewed, with an optional note.", "Member", "Must"),
     ("F-M2-15", "The system SHOULD publish the approved rules as a public library filterable by topic and segment.", "Guest", "Should"),
     ("F-M2-16", "The system SHOULD publish one page per rule with its bilingual description and citation.", "Guest", "Should"),
     ("F-M2-17", "The system MUST compute the safe and latest submission deadlines from the first shooting day, the safety buffer and Article 13 clause 4 (20 + 20 days).", "System", "Must"),
     ("F-M2-18", "The system MUST always show both scenarios: smooth path and one resubmission.", "Member", "Must")],
 io={
  "F-M2-01": ("filter_topic ENUM(security, history, religion, privacy, dossier, public_order, heritage) Opt; filter_status ENUM(draft, approved, retired) Opt", "rules ARRAY<legal_rule>", "vfda_legal only (RLS)"),
  "F-M2-02": ("rule_code VARCHAR(40) Req; topic ENUM(security, history, religion, privacy, dossier, public_order, heritage) Req; title_vi VARCHAR(200) Req; title_en VARCHAR(200) Req; description_vi TEXT Req; description_en TEXT Req; guidance_vi TEXT Req; guidance_en TEXT Req; citation VARCHAR(200) Req; severity ENUM(notice, action) Req",
              "rule_id UUID; version INTEGER", "guidance fields added (SC-48 *Points to consider*); severity reduced to two values — see §11"),
  "F-M2-03": ("rule_id UUID Req; approver_id UUID Req", "approved_at TIMESTAMPTZ; is_active BOOLEAN", "CHECK: citation and approver not null"),
  "F-M2-04": ("rule_change_event JSONB Req", "rule_version VARCHAR(20)", "format [NEEDS CLARIFICATION]"),
  "F-M2-05": ("synopsis_text TEXT Req; lang ENUM(en, vi) Req; flags JSONB Opt", "form_state JSONB", "20–200 words; flags = real_person, military, heritage_site (yes / no / unsure)"),
  "F-M2-06": ("synopsis_text TEXT Req; active_rules ARRAY<legal_rule> Req", "findings ARRAY<(rule_code VARCHAR(40), quoted_text TEXT, explanation_vi TEXT, explanation_en TEXT)>; attention_level ENUM(low, medium, high)", "attention_level added (SC-48)"),
  "F-M2-07": ("synopsis_hash TEXT Req; locale ENUM(vi, en) Req; country_guess VARCHAR(2) Opt", "brief_id UUID", "text itself not stored for guests [NEEDS CLARIFICATION]"),
  "F-M2-08": ("project_id UUID Req", "completeness_pct NUMERIC(5,2); missing_documents ARRAY<doc_code VARCHAR(40)>", "exactly 4 components"),
  "F-M2-09": ("missing_documents ARRAY<doc_code> Req", "checklist_view JSONB", "status per component: present / needs_fix / pending / missing"),
  "F-M2-10": ("completeness_pct NUMERIC(5,2) Req", "gauge_compliance NUMERIC(5,2)", ""),
  "F-M2-11": ("synopsis TEXT Req; active_rules ARRAY<legal_rule> Req", "raw_findings JSONB", "structured output only"),
  "F-M2-12": ("raw_findings JSONB Req; synopsis TEXT Req", "verified_findings JSONB; dropped_count INTEGER", "dropped findings logged for VFDA"),
  "F-M2-13": ("verified_findings JSONB Req", "findings_view JSONB", "citation mandatory per item"),
  "F-M2-14": ("finding_id UUID Req; reviewer_note TEXT Opt", "finding_status ENUM(open, reviewed)", ""),
  "F-M2-15": ("topic VARCHAR(60) Opt; segment ENUM(A, B, C) Opt", "rules ARRAY<legal_rule_public>", "approved rules only"),
  "F-M2-16": ("rule_slug VARCHAR(120) Req", "rule_detail JSONB", ""),
  "F-M2-17": ("shoot_date DATE Req; buffer_days INTEGER Req", "submit_by DATE; result_by DATE; result_by_worst DATE", "buffer_days default 7 (added, SC-29)"),
  "F-M2-18": ("milestones JSONB Req", "timeline_view JSONB", "both scenarios always shown"),
 },
 br=[("BR-001", "Every finding shown to a user cites a rule written and signed by the VFDA Legal Board; findings without a valid citation are dropped by code before display.", "The product must never invent law."),
     ("BR-002", "A rule becomes active only when it has a citation **and** an approver; this is enforced by a database CHECK constraint.", "Signing is VFDA's act, not the developers'."),
     ("BR-003", "The words *approved*, *accepted*, *legally compliant* and *safe* never appear in results, including when nothing is found.", "Only the competent authority decides."),
     ("BR-004", "The attention level is derived deterministically from the number and severity of verified findings, never from a model score.", "A precise-looking number from a model gives false certainty."),
     ("BR-005", "The dossier completeness check uses fixed rules, not a language model.", "A missing document is a fact, not a judgement."),
     ("BR-006", "Safe deadline = first shooting day − buffer − 20 − 20 days; latest deadline = first shooting day − buffer − 20 days.", "Article 13 clause 4: 20 days, plus up to 20 more if the script must be revised."),
     ("BR-007", "Every check stores the rule-set version it used.", "An old result must remain explainable after rules change."),
     ("BR-008", "Legal rules are retired, never deleted (`status = retired`); a finding keeps showing the text of the rule version it cited.", "An old result must remain explainable after a rule changes (see BR-007).")],
 entities=[("LegalRule", "rule_id, rule_code, title_vi/en, description_vi/en, guidance_vi/en, citation, severity, status, approved_by, approved_at", "belongs to RuleSetVersion"),
           ("RuleSetVersion", "rule_version, created_at, created_by", "has many LegalRules"),
           ("PrecheckRun (brief)", "brief_id, synopsis_hash, lang, flags, attention_level, rule_version, created_at", "has many PrecheckFindings; may belong to a Project"),
           ("PrecheckFinding", "rule_code, quoted_text, span_start, span_end, explanation", "belongs to PrecheckRun"),
           ("ComplianceRun", "run_id, project_id, rule_version, run_at", "has many ComplianceFindings; belongs to Project"),
           ("ComplianceFinding", "finding_id, rule_code, quoted_text, finding_status, reviewer_note", "belongs to ComplianceRun"),
           ("DossierCheck", "project_id, checked_at, completeness_pct, missing_documents", "derived from DocumentSlots (M5)"),
           ("LicensingTimeline", "project_id, submit_by, result_by, result_by_worst, buffer_days", "derived from Project.shoot_date")],
 screens=[("SC-03", "Script content input (200-word pre-check)", "Must", "docs/screens/screen-spec-SC-03.md"),
          ("SC-48", "Content check result", "Must", "docs/screens/screen-spec-SC-48.md"),
          ("SC-27", "Article 13 dossier completeness check", "Must", "docs/screens/screen-spec-SC-27.md"),
          ("SC-29", "20-day countdown (shared with M5)", "Must", "docs/screens/screen-spec-SC-29.md"),
          ("SC-37", "Admin — legal rule base", "Must", None),
          ("SC-30", "Requirements library", "Should", None),
          ("SC-31", "Requirement detail", "Should", None)],
 sc=[("A guest gets a pre-check result for a 200-word summary in under 30 seconds.", "Timed on 20 sample summaries."),
     ("No finding is ever shown without a citation to an approved rule.", "Audit 100 results: count findings without a valid rule code (target 0)."),
     ("A producer can name their missing Article 13 components after one visit to the check screen.", "Task walkthrough with 5 producers."),
     ("The VFDA Legal Board can add and sign a rule without developer help.", "Observed session with one VFDA officer."),
     ("The deadlines shown on the dashboard, the check screen and the countdown are always identical.", "Compare three screens on 20 projects.")],
 assumptions=["The rule base starts with about 25 rules written by the VFDA Legal Board before launch.",
              "Content risk is assessed against Article 9 (prohibited content); dossier completeness against Article 13 clause 3 — see open question 1.",
              "Deadlines are computed in calendar days until the Legal Board confirms otherwise.",
     "Test values used until the VFDA Legal Board confirms: the 20 days of Article 13 clause 4 are calendar days (BR-006); attention level Low = no *action* finding and at most 2 *notice* findings, Medium = 1 *action* finding or 3 or more *notice* findings, High = 2 or more *action* findings."],
 oq=[("Is the 20-day period in Article 13 clause 4 calendar days or working days?", True, "Client (VFDA Legal Board)"),
     ("Must rule signing require two different people (author ≠ approver)?", True, "Client (VFDA Legal Board)"),
     ("When the rule set gets a new version, are open projects re-checked automatically or only notified?", True, "Client (VFDA)"),
     ("Thresholds that turn findings into Low / Medium / High.", True, "Client (VFDA Legal Board)"),
     ("None of SEQ-02, SEQ-08, SEQ-09 draws an error branch (model down, file too large). Confirm the behaviour in the edge cases.", False, "Client (VFDA)"),
     ("How long is a guest's pre-check text kept, and may it be used to improve the rule base?", True, "Client (VFDA)")],
 trace=[("1. Purpose", "System Design v2.0 — 1. Schematic, §1.2 (M2)", "`docs/architecture/context.md`"),
        ("4.1 Usage flow", "Usage Flow FLOW-01 flows 1 and 5 (Figure 3) + Step 3 additions", "`docs/architecture/usage-flow.md` §1, §5"),
        ("4.2–4.4 Sequences", "SEQ-02 (Fig. 5), SEQ-08 (Fig. 11), SEQ-09 (Fig. 12)", "`docs/architecture/sequence-diagrams.md`"),
        ("5. Functional requirements", "Function List rows 24–41", "`docs/function-list.md` rows 24–41"),
        ("5.2 BR-006", "Cinema Law 2022 (Law No. 05/2022/QH15), Article 13 clause 4", "legal source"),
        ("7. Screens", "Screen List SC-03, SC-27, SC-29, SC-30, SC-31, SC-37, SC-48", "`docs/screen-list.md` §1")],
 recon=[("Pre-check result screen", "Result shown inside SC-03", "Separate screen SC-48 (screen list items #6, #7)", "Changed — new Screen ID"),
        ("Rule severity", "ENUM(info, notice, action)", "ENUM(notice, action) — the screens show only *Needs attention* / *Action required*", "Changed — Confirmed by the Client"),
        ("Rule guidance", "not in DBIZ2", "guidance_vi / guidance_en added to show *Points to consider* (SC-48)", "Added — Confirmed by the Client"),
        ("F-M2-15, F-M2-16 priority", "Must", "Should — screens SC-30 / SC-31 are not in the 20-screen set", "Changed — Confirmed by the Client")],
))
