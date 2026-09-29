# -*- coding: utf-8 -*-
"""Spec Document data — modules M3, M4, M5, M7."""

MODULES = []

# =============================================================================  M3
MODULES.append(dict(
 id="M3", name="Location discovery",
 source="Function List rows 42–61 (F-M3-01 .. F-M3-20); Use Case UC-07 .. UC-12; Screens SC-14, SC-15, SC-16, SC-17, SC-18, SC-35",
 purpose="This module helps a producer find places in Vietnam that fit the scenes they describe, explains why each place fits, and shows who in local government to contact. "
         "VFDA staff maintain and verify the location data; each province gets a readiness index built only from activity on the platform.",
 in_scope=["Location data management and publishing by VFDA staff, including verified local authority contacts.",
           "Accent-insensitive search and multi-criteria filters.",
           "Finding locations from a free-text scene description (attributes extracted, then scored deterministically).",
           "Ranked results with match score and reasons, map, and location detail pages.",
           "Comparing up to four locations and shortlisting a primary and backups (Should).",
           "Provincial readiness index and province pages (Should)."],
 out_scope=["Booking or paying for a location.",
            "Drone permits and restricted zones (M6, phase 2).",
            "Contacting the province on the producer's behalf (M7)."],
 depends=["SYS (roles, search indexes)", "M0 (location gauge, project context)", "M7 (*I'm interested* creates a provincial notice)", "External: language model API, OpenStreetMap tiles, PostGIS"],
 actors=[("Guest", "Primary — searches, describes scenes, compares", "Function List (F-M3-06..14, 16, 17, 20)"),
         ("Member", "Primary — sees authority contacts, shortlists", "Function List (F-M3-15, 18)"),
         ("VFDA staff", "Primary — manages, verifies and publishes locations", "Function List (F-M3-01..05)"),
         ("System", "Extracts attributes, scores, computes the provincial index", "Function List (F-M3-08, 11, 12, 19)")],
 stories=[
  dict(id="US-1", p="P1", title="Describe a scene, get places that fit",
       journey="As a producer, I want to describe my scene in my own words and get ranked places with reasons, so that I shortlist in minutes instead of weeks of scouting emails.",
       acc=["**Given** the description *A ferry landing at dawn between limestone karsts, 1970s, a waterside village, about 30 extras, night scenes too*, **When** the user clicks *Analyse description*, **Then** the system shows the extracted attributes (landing, waterside village, 1970s, dawn, night, river/lake, limestone, 15–50) and lets the user edit them before searching.",
            "**Given** confirmed attributes, **When** the user searches, **Then** only published locations scoring 40 or more are listed, best first, each with at least one *why it matches* reason.",
            "**Given** a word not in the catalogue (e.g. *fishing village*), **When** attributes are extracted, **Then** it is mapped to the nearest catalogue value and the mapping is shown to the user."]),
  dict(id="US-2", p="P1", title="Contact the local authority",
       journey="As a member, I want the verified local authority contact for a location, so that I can plan permits with the right office.",
       acc=["**Given** a guest on a location page, **When** the page loads, **Then** the contact block shows a sign-up prompt and the page source contains no phone number or email.",
            "**Given** a signed-in member, **When** the page loads, **Then** the office, contact person, phone and email are shown with the date VFDA verified them."]),
  dict(id="US-3", p="P1", title="VFDA publishes a verified location",
       journey="As VFDA staff, I want to publish a location only once its authority contact is verified, so that producers never get a dead end.",
       acc=["**Given** a location with an unverified contact, **When** staff click *Publish*, **Then** publishing is refused by a database constraint with the reason shown."]),
  dict(id="US-4", p="P2", title="Compare and shortlist",
       journey="As a producer, I want to compare up to four places side by side and set a primary and a backup, so that my plan survives bad weather or a refusal.",
       acc=["**Given** three locations in the compare tray, **When** the comparison opens, **Then** eight criteria rows are shown and every cell is *meets*, *caution* or *to verify* — never empty.",
            "**Given** a comparison, **When** the member clicks *Set as primary* on Tràng An, **Then** it is saved to the project shortlist and the *Locations* gauge on the dashboard rises."]),
  dict(id="US-5", p="P3", title="Understand a province",
       journey="As a producer or as VFDA, I want to see how ready a province is to host a shoot, so that I can judge the practical risk.",
       acc=["**Given** Ninh Bình with enough data, **When** the province page opens, **Then** the index, its components, their sample sizes and the calculation method are shown.",
            "**Given** a province with fewer than the minimum data points, **When** the page opens, **Then** the index shows `—` with *Not enough data yet*."]),
 ],
 edge=["The model fails to extract attributes: the user is offered the filter search instead; the typed description is kept.",
       "No location reaches 40 points: show the three nearest with the criteria they miss, plus *Ask VFDA* — never a blank page.",
       "An old province name is searched (e.g. *Quảng Nam*): it maps to the merged province (Đà Nẵng) and says so.",
       "A fifth location is added to the compare tray: refused with *Maximum 4 — remove one to add another*."],
 flows=[("4.1 Usage flow — producer excerpt",
"""flowchart TD
    DASH[M0 · Create project + readiness dashboard] --> LOC[M3 · Find locations from a scene description · compare · shortlist]
    LOC --> Q2{Any location scoring 40 or more?}
    Q2 -- No --> ASK[Ask VFDA for advice] --> LOC
    Q2 -- Yes --> PART([M4 · Vietnamese service partner])""",
"Excerpt of `docs/architecture/usage-flow.md` flow 1. Diamond Q2 was added in Step 3 from F-M3-08 (40-point threshold) — awaiting Client confirmation."),
        ("4.1b Usage flow — VFDA staff publishing a location",
"""flowchart TD
    HUB[M10 · Admin overview] --> A1[M3 · Manage locations]
    A1 --> Q1{Local authority contact verified?}
    Q1 -- Not yet --> BLOCK[System blocks publishing - database constraint] --> A1
    Q1 -- Yes --> PUB([Location published])""",
"Excerpt of `usage-flow.md` flow 4, translated. Diamond Q1 added in Step 3 from F-M3-05.")],
 seqs=[("4.2 Sequence — find locations from a scene description (SEQ-03)",
"""sequenceDiagram
    actor U as Producer
    participant FE as Next.js app
    participant EF as Edge Function
    participant AI as Language model API
    participant DB as Supabase PostgreSQL + RLS

    U->>FE: Type a free-text scene description
    FE->>EF: extractSceneAttributes(text)
    EF->>AI: Extract attributes into a fixed template
    AI-->>EF: scene_types, era, time_of_day, ...
    EF->>EF: Validate against the location-type catalogue
    EF->>DB: search_locations(attributes)
    DB->>DB: Score out of 100 on 6 criteria
    DB-->>EF: Ranked list + match_reasons[]
    EF-->>FE: Results with reasons
    FE-->>U: Location cards, each saying why it matches
    Note over DB: Only published = true and score of 40 or more""",
"Textualised from SEQ-03 (Figure 6), translated. 5 participants, 10 messages. Note: SC-15 adds a user confirmation step between extraction and search (see §11)."),
        ("4.3 Sequence — local authority contact gated by RLS (SEQ-04)",
"""sequenceDiagram
    actor GU as Guest
    actor U as Producer
    participant FE as Next.js app
    participant DB as Supabase PostgreSQL + RLS

    GU->>FE: Open a location detail page
    FE->>DB: SELECT locations WHERE slug = ?
    DB-->>FE: Public location data
    FE->>DB: SELECT location_authority_contacts
    DB->>DB: RLS: role anon gives 0 rows
    DB-->>FE: Empty
    FE-->>GU: Show a sign-up prompt instead of the contact
    U->>FE: Sign in and reopen the page
    FE->>DB: SELECT location_authority_contacts
    DB->>DB: RLS: signed in, return data
    DB-->>FE: Name, phone, email of the contact
    FE-->>U: Show full contact details
    Note over DB: Sensitive data never leaves the database for a user without the right role""",
"Textualised from SEQ-04 (Figure 7). 4 participants, 12 messages."),
        ("4.4 Sequence — compare and shortlist (SEQ-05)",
"""sequenceDiagram
    actor U as Producer
    participant FE as Next.js app
    participant DB as Supabase PostgreSQL + RLS

    U->>FE: Pick up to 4 locations to compare
    FE->>FE: Keep the selection in the browser
    FE->>DB: Fetch data for the 4 locations
    DB-->>FE: Full attributes of each location
    FE-->>U: Comparison table with 8 criteria rows
    U->>FE: Click shortlist
    FE->>DB: INSERT project_shortlist
    DB->>DB: Recalculate the Locations gauge
    DB-->>FE: New readiness score
    FE-->>U: Dashboard updates at once""",
"Textualised from SEQ-05 (Figure 8). 3 participants, 10 messages.")],
 fr=[("F-M3-01", "The system MUST list all locations, including unpublished ones, to VFDA staff.", "VFDA Staff", "Must"),
     ("F-M3-02", "The system MUST let VFDA staff create and edit a location with the 18 fields of the data-entry template.", "VFDA Staff", "Must"),
     ("F-M3-03", "The system MUST store location photos with their source and usage right.", "VFDA Staff", "Must"),
     ("F-M3-04", "The system MUST record the local authority contact of a location with who verified it and when.", "VFDA Staff", "Must"),
     ("F-M3-05", "The system MUST refuse to publish a location whose authority contact is not verified (database constraint).", "VFDA Staff", "Must"),
     ("F-M3-06", "The system MUST return locations for a search typed with or without Vietnamese diacritics.", "Guest", "Must"),
     ("F-M3-07", "The system MUST filter by scene type, province or region, crew size, shooting month and special scenes, and keep the filter state in the page URL.", "Guest", "Must"),
     ("F-M3-08", "The system MUST score each published location from 0 to 100 on six criteria in a database function and hide results below 40.", "System", "Must"),
     ("F-M3-09", "The system MUST show every result with its score, at least one *why it matches* reason and any mismatch or missing data.", "Guest", "Must"),
     ("F-M3-10", "The system MUST accept a free-text scene description in English or Vietnamese.", "Guest", "Must"),
     ("F-M3-11", "The system MUST extract structured attributes from the description with a language model filling a fixed template; the model MUST NOT choose or rank locations.", "System", "Must"),
     ("F-M3-12", "The system MUST drop or map attribute values that are not in the catalogue and show the user what was mapped.", "System", "Must"),
     ("F-M3-13", "The system MUST show a location page with photos, bilingual description, logistics, season and permit complexity.", "Guest", "Must"),
     ("F-M3-14", "The system MUST show the location on a map with nearby published locations within 30 km.", "Guest", "Must"),
     ("F-M3-15", "The system MUST return the local authority contact only to signed-in users (RLS).", "Member", "Must"),
     ("F-M3-16", "The system SHOULD let a user compare up to four locations and remember the selection on reload.", "Guest", "Should"),
     ("F-M3-17", "The system SHOULD show eight criteria rows where every cell is *meets*, *caution* or *to verify*.", "Guest", "Should"),
     ("F-M3-18", "The system SHOULD let a member add locations to the project shortlist as primary or backup and update the Locations gauge.", "Member", "Should"),
     ("F-M3-19", "The system SHOULD compute a provincial readiness index from platform data only, with sample sizes.", "System", "Should"),
     ("F-M3-20", "The system SHOULD show a province page linking into a pre-filtered location search.", "Guest", "Should")],
 io={
  "F-M3-01": ("filter JSONB Opt", "locations ARRAY<location_admin>", "vfda_staff only"),
  "F-M3-02": ("name_vi VARCHAR(200) Req; name_en VARCHAR(200) Req; province_id INTEGER Req; district VARCHAR(120) Opt; lat NUMERIC(9,6) Req; lng NUMERIC(9,6) Req; airport_km INTEGER Opt; scene_types ARRAY<ENUM> Req; desc_vi TEXT Req; desc_en TEXT Req; crew_capacity ENUM(u15, 15_50, o50) Req; lodging_20km BOOLEAN Req; grid_power BOOLEAN Req; truck_access BOOLEAN Req; months_to_avoid ARRAY<INTEGER> Opt; permit_complexity ENUM(low, medium, high) Req; restriction_note TEXT Opt",
              "location_id UUID; slug VARCHAR(160)", "province_id from the 34-province list"),
  "F-M3-03": ("image_file BYTEA Req; image_source TEXT Req; usage_right TEXT Req", "image_url TEXT", "jpg / png, max 10 MB"),
  "F-M3-04": ("location_id UUID Req; authority_name VARCHAR(200) Req; contact_name VARCHAR(120) Req; contact_phone VARCHAR(20) Req; contact_email VARCHAR(254) Opt; verified_by UUID Req", "contact_verified BOOLEAN; verified_at TIMESTAMPTZ", ""),
  "F-M3-05": ("location_id UUID Req", "published BOOLEAN; blocked_reason TEXT", "CHECK: contact_verified = true"),
  "F-M3-06": ("query VARCHAR(200) Opt", "matches ARRAY<location_card>", "unaccent full-text"),
  "F-M3-07": ("scene_types ARRAY<ENUM> Opt; provinces ARRAY<INTEGER> Opt; crew_size ENUM(u15, 15_50, o50) Opt; shoot_month INTEGER Opt; special_scenes ARRAY<ENUM> Opt", "filtered_ids ARRAY<UUID>; url_state TEXT", "shoot_month 1–12"),
  "F-M3-08": ("scene_types ARRAY Opt; provinces ARRAY Opt; crew_size ENUM Opt; shoot_month INTEGER Opt", "ranked ARRAY<(location_id UUID, score INTEGER, match_reasons ARRAY<TEXT>)>", "score 0–100; weights [NEEDS CLARIFICATION]"),
  "F-M3-09": ("ranked ARRAY Req", "cards_view JSONB", "≥ 1 reason per card"),
  "F-M3-10": ("scene_description TEXT Req", "form_state JSONB", "10–1000 characters"),
  "F-M3-11": ("scene_description TEXT Req", "attributes JSONB (scene_types ARRAY, era ENUM, time_of_day ENUM, water ENUM, terrain ARRAY, crowd_scale ENUM, constraints ARRAY)", "structured output"),
  "F-M3-12": ("attributes JSONB Req; scene_type_catalog ARRAY<ENUM> Req", "valid_attributes JSONB; rejected ARRAY<TEXT>", "mapped values reported to the user"),
  "F-M3-13": ("slug VARCHAR(160) Req", "location_detail JSONB", "published only"),
  "F-M3-14": ("lat NUMERIC(9,6) Req; lng NUMERIC(9,6) Req; radius_km INTEGER Opt", "map_view JSONB; nearby ARRAY<(location_id UUID, distance_km NUMERIC(6,2))>", "radius default 30; max 5 nearby"),
  "F-M3-15": ("location_id UUID Req; session_role ENUM Req", "authority_contact JSONB", "empty for guests (RLS)"),
  "F-M3-16": ("location_ids ARRAY<UUID> Req", "compare_set ARRAY<UUID>", "max 4"),
  "F-M3-17": ("compare_set ARRAY<UUID> Req", "comparison_table JSONB", "8 criteria rows; no empty cell"),
  "F-M3-18": ("project_id UUID Req; location_ids ARRAY<UUID> Req; role ENUM(primary, backup) Req", "shortlist_id UUID; gauge_location NUMERIC(5,2)", "role added (SC-17)"),
  "F-M3-19": ("province_id INTEGER Req", "readiness_index NUMERIC(5,2); components JSONB", "4 scored components + 1 condition; sample size per component"),
  "F-M3-20": ("province_slug VARCHAR(80) Req", "province_page JSONB", "old slugs redirect to merged province"),
 },
 br=[("BR-001", "The language model only extracts attributes; ranking is done by a deterministic scoring function in the database. The model never names or ranks a location.", "Explainable results; no invented places."),
     ("BR-002", "A result is shown only if its score is 40 or more and it has at least one *why it matches* reason.", "A score without a reason is a black box."),
     ("BR-003", "*Not a match* and *No data yet* are different; missing data never counts for or against a location.", "No-guessing principle."),
     ("BR-004", "A location cannot be published until its local authority contact is verified; contacts are re-verified every 12 months [NEEDS CLARIFICATION].", "A dead-end contact destroys trust in VFDA's data."),
     ("BR-005", "Authority contacts are returned only to signed-in users, enforced by Row Level Security.", "Contacts are VFDA's gated asset and personal data."),
     ("BR-006", "Provinces use the 34 provincial-level units after the 2025 reorganisation; old names are accepted in search and mapped to the new unit.", "Producers and older guides still use pre-2025 names."),
     ("BR-007", "The provincial index uses only data generated on the platform and always shows its sample size.", "It must not become a subjective ranking of provinces.")],
 entities=[("Location", "location_id, slug, name_vi, name_en, province_id, lat, lng, scene_types, crew_capacity, lodging_20km, grid_power, truck_access, months_to_avoid, permit_complexity, intake_status, published", "belongs to Province; has many LocationImages; has one AuthorityContact"),
           ("LocationImage", "image_url, image_source, usage_right, status", "belongs to Location"),
           ("AuthorityContact", "authority_name, contact_name, contact_phone, contact_email, verified_by, verified_at", "belongs to Location"),
           ("Province", "province_id, name, slug, region, merged_from", "has many Locations"),
           ("LocationQuery", "description, attributes, month, project_id", "may belong to Project"),
           ("ProjectShortlist", "project_id, location_id, role", "belongs to Project and Location"),
           ("ProvinceReadiness", "province_id, readiness_index, components, sample_sizes, computed_at", "derived from Locations, Organisations, Notices")],
 screens=[("SC-15", "Scene description (AI matching input)", "Must", "docs/screens/screen-spec-SC-15.md"),
          ("SC-14", "Location suggestions (list + map)", "Must", "docs/screens/screen-spec-SC-14.md"),
          ("SC-16", "Location detail", "Must", "docs/screens/screen-spec-SC-16.md"),
          ("SC-17", "Location comparison (max 4)", "Should", "docs/screens/screen-spec-SC-17.md"),
          ("SC-18", "Provincial readiness index", "Should", "docs/screens/screen-spec-SC-18.md"),
          ("SC-35", "Admin — locations", "Must", None)],
 sc=[("From a scene description, a producer reaches a shortlist of three suitable places in under 10 minutes.", "Timed task with 5 producers using their own scenes."),
     ("Every listed result states at least one reason it matches.", "Audit 50 result cards (target 100%)."),
     ("Four in five producers judge the top result relevant to their described scene.", "Rating task on 10 descriptions."),
     ("A guest never sees an authority phone number or email.", "Private-window source check on 10 location pages.")],
 assumptions=["The MVP launches with at least 50 VFDA-verified locations across at least 8 provinces.",
              "Six scoring criteria: visual fit, crew capacity, logistics, season for the shooting month, permit complexity, intake status."],
 oq=[("Weights of the six scoring criteria (F-M3-08).", True, "Client (VFDA)"),
     ("Who maintains the fixed attribute catalogue (scene types, terrain, era) used by F-M3-12?", True, "Client (VFDA)"),
     ("Where does data for the *night shooting* and *weather in the shooting month* comparison rows come from? No field exists yet.", True, "Group C"),
     ("May VFDA publish the provincial index publicly? It may be sensitive for low-scoring provinces.", True, "Client (VFDA)"),
     ("Re-verification cycle for authority contacts (proposed 12 months).", False, "Client (VFDA)")],
 trace=[("1. Purpose", "System Design v2.0 — 1. Schematic, §1.2 (M3)", "`docs/architecture/context.md`"),
        ("4.1 Usage flow", "FLOW-01 flows 1 and 4 (Figure 3) + Step 3 additions", "`docs/architecture/usage-flow.md` §1, §4"),
        ("4.2–4.4 Sequences", "SEQ-03 (Fig. 6), SEQ-04 (Fig. 7), SEQ-05 (Fig. 8)", "`docs/architecture/sequence-diagrams.md`"),
        ("5. Functional requirements", "Function List rows 42–61", "`docs/function-list.md` rows 42–61"),
        ("7. Screens", "Screen List SC-14..SC-18, SC-35", "`docs/screen-list.md` §1")],
 recon=[("Attribute confirmation", "SEQ-03 goes straight from extraction to search", "SC-15 shows *What the system understood* and waits for the user to confirm", "Added — Client to confirm"),
        ("F-M3-16..20 priority", "Must", "Should — Tier 2 of the screen list file (#18, #19)", "Changed — Client to confirm"),
        ("Shortlist role", "no role", "primary / backup (SC-17)", "Added — Client to confirm")],
))

# =============================================================================  M4
MODULES.append(dict(
 id="M4", name="Vietnamese service partners",
 source="Function List rows 62–80 (F-M4-01 .. F-M4-19); Use Case UC-13 .. UC-17; Screens SC-19, SC-20, SC-21, SC-22, SC-23, SC-24, SC-25, SC-36",
 purpose="This module connects foreign producers with Vietnamese companies that can legally act as their service partner, which Article 13 requires for a filming licence. "
         "VFDA verifies each company; producers see more of a company's profile as trust builds, and every collaboration request is tracked to a confirmed partnership.",
 in_scope=["Organisation profiles with three visibility layers (public, member, accepted).",
           "Directory by 12 service groups, filters by province, language and VFDA Verified.",
           "VFDA Verified: submission, review queue, decision, 12-month renewal reminder.",
           "Collaboration requests: send, respond, notify, confirm; partner gauge.",
           "Electronic NDA and document-access log."],
 out_scope=["Contracts and payments between producer and partner — signed outside the system.",
            "Ratings and reviews (M8, phase 2).",
            "Open self-registration of suppliers — VFDA invites them."],
 depends=["SYS (roles, notifications, email, search)", "M0 (partner gauge)", "M2 (component c of the dossier check)", "M10 (audit log)"],
 actors=[("Member (producer)", "Primary — browses, sends requests, confirms", "Function List (F-M4-03, 04, 12, 19)"),
         ("Partner (Vietnamese supplier)", "Primary — manages its profile, applies for Verified, responds", "Function List (F-M4-01, 08, 13, 14, 17)"),
         ("VFDA staff", "Primary — reviews verification requests", "Function List (F-M4-09, 10)"),
         ("Guest", "Secondary — sees public layer only", "Function List (F-M4-02, 05, 06)"),
         ("System", "Notifications, gauge, reminders, access log", "Function List (F-M4-07, 11, 15, 16, 18)")],
 stories=[
  dict(id="US-1", p="P1", title="Find a partner who can sign my service agreement",
       journey="As a foreign producer, I want to find VFDA-verified companies in my shooting province that work in my language, so that I meet the Article 13 partner requirement quickly.",
       acc=["**Given** the directory, **When** the user picks *Full production services*, province *Ninh Bình*, language *Korean* and *VFDA Verified only*, **Then** only matching verified companies are listed with their Verified month.",
            "**Given** a guest, **When** they view the list, **Then** they see name, service groups, provinces and the Verified badge only; project counts and languages require sign-in."]),
  dict(id="US-2", p="P1", title="Send a request and follow it to confirmation",
       journey="As a producer, I want to send a request tied to my project and see exactly where it stands, so that I know when I have my Vietnamese partner.",
       acc=["**Given** a member with a project, **When** they send a request to Bến Xưa, **Then** the request is *Sent*, the partner is notified in-app and by email, and the tracker shows step 1 of 3.",
            "**Given** the partner accepts, **When** the member opens the request, **Then** the tracker shows step 2 *Partner responded* and *Confirm partnership* is enabled once the NDA box is ticked.",
            "**Given** the member confirms, **When** it is saved, **Then** the tracker shows *Confirmed*, both sides are notified, the Partners gauge reaches 100%, and component c of the Article 13 check becomes *Pending* until the signed agreement is uploaded."]),
  dict(id="US-3", p="P1", title="Get VFDA Verified",
       journey="As a Vietnamese supplier, I want VFDA to verify my company, so that foreign producers trust me.",
       acc=["**Given** a partner uploads a business registration PDF and two reference projects, **When** VFDA staff approve, **Then** the badge shows with the verification date and expires after 12 months.",
            "**Given** staff reject, **When** they save, **Then** a reason is mandatory and sent to the partner."]),
  dict(id="US-4", p="P2", title="Protect confidential material",
       journey="As either party, I want confidential material opened only after an NDA and every view logged, so that I can share safely.",
       acc=["**Given** a confirmed-pending request, **When** the member accepts the NDA, **Then** the partner's rate card, past clients and direct contact become visible to that member (RLS).",
            "**Given** a partner opens a project document, **When** it is displayed, **Then** an access-log entry records who, which document and when."]),
 ],
 edge=["The partner never responds: [NEEDS CLARIFICATION: expiry after N days]; the member can withdraw and send elsewhere.",
       "Two requests from the same project to the same partner: refused — *You already have an open request with this partner*.",
       "Verified badge expires during an open request: the request continues; the badge disappears from listings until renewed.",
       "Email delivery fails: the in-app notification still appears; delivery is retried."],
 flows=[("4.1 Usage flow — Vietnamese supplier",
"""flowchart TD
    S([Receive VFDA's invitation letter]) --> P[M4 · Create an organisation profile with three layers]
    P --> V[M4·3 · Submit verification: business registration + 2 reference projects]
    V --> Q1{VFDA approves?}
    Q1 -- Rejected with reason --> P
    Q1 -- Approved --> BADGE[VFDA Verified badge, valid 12 months]
    BADGE --> INBOX[M4·2 · Collaboration request inbox]
    INBOX --> Q2{How to handle the request?}
    Q2 -- More information needed --> INBOX
    Q2 -- Declined --> INBOX
    Q2 -- Accepted --> NDA[M4·5 · Other party accepts the e-NDA before seeing project documents]
    NDA --> E([Collaboration starts; every document view is logged])""",
"Textualised from `docs/architecture/usage-flow.md` flow 3, translated. Diamonds Q1, Q2 added in Step 3 from F-M4-10 and F-M4-14 — awaiting Client confirmation."),
        ("4.1b Usage flow — segment C producer",
"""flowchart TD
    S([Choose: only hiring cast or logistics services]) --> G[M4 · Pick a service group from the 12]
    G --> F[M4 · Filter by province + VFDA Verified]
    F --> R[M4·2 · Send a collaboration request]
    R --> Q{How did the partner respond?}
    Q -- Declined --> F
    Q -- Accepted --> OPEN[Full information layer opens: rate card, past clients, contact]
    OPEN --> N[M5 · Checklist: contract, payment, tax]
    N --> E([Service contract signed outside the system])""",
"Textualised from `usage-flow.md` flow 2, translated.")],
 seqs=[("4.2 Sequence — collaboration request and two-way response (SEQ-06)",
"""sequenceDiagram
    actor U as Producer
    participant FE as Next.js app
    participant DB as Supabase PostgreSQL + RLS
    participant MAIL as Resend
    actor PT as Vietnamese supplier

    U->>FE: Pick a partner and a project, write a note
    FE->>DB: INSERT collab_requests (status = pending)
    DB->>MAIL: Webhook: send notification email
    MAIL->>PT: You have a new collaboration request
    PT->>FE: Open the request inbox
    FE->>DB: SELECT request details + project
    DB-->>FE: Request information
    PT->>FE: Accept / Decline / Need more information
    FE->>DB: UPDATE status + response_note
    DB->>DB: Open organisation_private layer for both parties
    DB->>MAIL: Webhook: notify the result
    MAIL->>U: The partner accepted your request
    DB->>DB: Update the Partners gauge to 100%
    Note over DB: Five statuses: pending, under_review, info_requested, accepted, declined""",
"Textualised from SEQ-06 (Figure 9), translated. 5 participants, 13 messages. The SC-25 screen adds a producer *Confirm* step after acceptance — see §11."),
        ("4.3 Sequence — VFDA Verified (SEQ-07)",
"""sequenceDiagram
    actor PT as Vietnamese supplier
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
    Note over DB: The system reminds to re-verify after 12 months""",
"Textualised from SEQ-07 (Figure 10). 6 participants, 14 messages.")],
 fr=[("F-M4-01", "The system MUST let a partner create and edit its organisation profile (legal entity, service groups, provinces, capability, rate card, past clients).", "Partner", "Must"),
     ("F-M4-02", "The system MUST show every visitor the public layer: name, service groups, provinces and Verified badge.", "Guest", "Must"),
     ("F-M4-03", "The system MUST show signed-in members the member layer: capability, portfolio without project names, international project count and working languages.", "Member", "Must"),
     ("F-M4-04", "The system MUST show the accepted layer (rate card, past clients, direct contact) only after the request is accepted and the NDA accepted (RLS).", "Member", "Must"),
     ("F-M4-05", "The system MUST let users browse organisations by one of 12 fixed service groups.", "Guest", "Must"),
     ("F-M4-06", "The system MUST filter by province, working language and VFDA Verified (default on).", "Guest", "Must"),
     ("F-M4-07", "The system COULD rank organisations by semantic similarity to a free-text query in Vietnamese or English.", "System", "Could"),
     ("F-M4-08", "The system MUST let a partner submit a verification request with a business registration PDF and at least two reference projects.", "Partner", "Must"),
     ("F-M4-09", "The system MUST give VFDA staff a queue of verification requests filterable by status.", "VFDA Staff", "Must"),
     ("F-M4-10", "The system MUST let VFDA staff approve or reject a request, with a mandatory reason when rejecting, and record who and when.", "VFDA Staff", "Must"),
     ("F-M4-11", "The system MUST remind the partner before the 12-month validity ends and remove the badge when it expires.", "System", "Must"),
     ("F-M4-12", "The system MUST let a member send a collaboration request tied to one of their projects, with a note.", "Member", "Must"),
     ("F-M4-13", "The system MUST show both sides their incoming and outgoing requests with status.", "Partner / Member", "Must"),
     ("F-M4-14", "The system MUST let the partner respond: under review, more information needed, accepted or declined; and MUST let the producer confirm an accepted request.", "Partner / Member", "Must"),
     ("F-M4-15", "The system MUST notify both sides in-app and by email on every status change.", "System", "Must"),
     ("F-M4-16", "The system MUST update the Partners gauge from the request status.", "System", "Must"),
     ("F-M4-17", "The system MUST show the NDA and record each party's acceptance before confidential material is opened.", "Partner / Member", "Must"),
     ("F-M4-18", "The system MUST log every view of a shared document: who, which document, when.", "System", "Must"),
     ("F-M4-19", "The system COULD show a project owner the access log of their documents.", "Member", "Could")],
 io={
  "F-M4-01": ("org_name VARCHAR(200) Req; service_groups ARRAY<ENUM> Req; provinces ARRAY<INTEGER> Req; working_languages ARRAY<CHAR(2)> Opt; capability_desc_vi TEXT Opt; capability_desc_en TEXT Opt; rate_card JSONB Opt; past_clients ARRAY<TEXT> Opt", "org_id UUID; slug VARCHAR(160)", "service_groups from the 12-value enum; working_languages added (SC-19)"),
  "F-M4-02": ("org_slug VARCHAR(160) Req", "public_profile JSONB", "name, service groups, provinces, Verified badge"),
  "F-M4-03": ("org_id UUID Req; session_role ENUM Req", "member_profile JSONB", "capability, portfolio, project count, languages"),
  "F-M4-04": ("org_id UUID Req; request_status ENUM Req", "private_profile JSONB", "rate card, past clients, direct contact"),
  "F-M4-05": ("service_group ENUM Req", "orgs ARRAY<org_card>", "12 values"),
  "F-M4-06": ("provinces ARRAY<INTEGER> Opt; working_language CHAR(2) Opt; verified_only BOOLEAN Opt", "filtered ARRAY<org_card>", "verified_only default true; working_language added"),
  "F-M4-07": ("query TEXT Req", "ranked ARRAY<(org_id UUID, similarity NUMERIC(4,3))>", ""),
  "F-M4-08": ("org_id UUID Req; business_license FILE Req; reference_projects ARRAY<TEXT> Req", "verification_request_id UUID", "PDF max 25 MB; ≥ 2 references"),
  "F-M4-09": ("status_filter ENUM(pending, approved, rejected) Opt", "queue ARRAY<verification_request>", "vfda_staff only"),
  "F-M4-10": ("request_id UUID Req; decision ENUM(approved, rejected) Req; reason TEXT Opt", "verified BOOLEAN; verified_at TIMESTAMPTZ", "reason required when rejected"),
  "F-M4-11": ("verified_at TIMESTAMPTZ Req", "reminder_notification_id UUID", "30 days before expiry"),
  "F-M4-12": ("org_id UUID Req; project_id UUID Req; services ARRAY<ENUM> Req; note TEXT Opt", "request_id UUID; status ENUM", "status = pending; note max 1000 characters; services added (SC-25)"),
  "F-M4-13": ("user_id UUID Req; direction ENUM(incoming, outgoing) Opt", "requests ARRAY<collab_request>", ""),
  "F-M4-14": ("request_id UUID Req; decision ENUM(under_review, info_requested, accepted, declined, confirmed, withdrawn) Req; response_note TEXT Opt", "status ENUM; responded_at TIMESTAMPTZ", "confirmed and withdrawn added for the producer (SC-25)"),
  "F-M4-15": ("request_id UUID Req; status ENUM Req", "notifications ARRAY<notification>", "2 records: one per party"),
  "F-M4-16": ("status ENUM Req", "gauge_partner NUMERIC(5,2)", "100 only when confirmed — see §11"),
  "F-M4-17": ("request_id UUID Req; party ENUM(producer, partner) Req; nda_version VARCHAR(20) Req; accepted BOOLEAN Req", "nda_acceptance_id UUID; accepted_at TIMESTAMPTZ", "party and nda_version added (mutual NDA)"),
  "F-M4-18": ("document_id UUID Req; viewer_id UUID Req", "access_log_id UUID; viewed_at TIMESTAMPTZ", "append-only"),
  "F-M4-19": ("project_id UUID Req", "access_log ARRAY<(viewer_name TEXT, document_id UUID, viewed_at TIMESTAMPTZ)>", "owner only"),
 },
 br=[("BR-001", "The three visibility layers are three tables with separate Row Level Security policies, not hidden columns.", "Interface hiding leaks through the API."),
     ("BR-002", "The 12 service groups are a fixed enum; organisations cannot invent groups.", "VFDA reports supply per province and group."),
     ("BR-003", "Supplier accounts are created only by VFDA invitation in the first phase.", "Every listed supplier must be known to VFDA."),
     ("BR-004", "A VFDA Verified badge is valid for 12 months and states what was checked and what was not (quality and prices are not).", "The badge is not a quality guarantee."),
     ("BR-005", "Only the producer can confirm a partnership; only the partner can accept or decline. Declined, withdrawn and confirmed are final.", "Each side owns its own decision."),
     ("BR-006", "Confirming a partnership does not by itself mark Article 13 component c as present; the signed service agreement must be uploaded.", "A confirmation in the app is not a signed contract."),
     ("BR-007", "Document access log entries are append-only.", "The log is evidence in case of a dispute.")],
 entities=[("Organisation", "org_id, slug, org_name, legal_form, founded_year, hq_province, verified_at, verified_until, art13_eligible", "has many OrganisationServices, OrganisationProvinces"),
           ("OrganisationMemberLayer", "capability_desc, portfolio, intl_project_count, working_languages", "belongs to Organisation"),
           ("OrganisationPrivateLayer", "rate_card, past_clients, direct_contact", "belongs to Organisation"),
           ("VerificationRequest", "request_id, org_id, business_license, reference_projects, status, decided_by, reason", "belongs to Organisation"),
           ("CollabRequest", "request_id, project_id, org_id, services, note, status, sent_at, responded_at, confirmed_at", "belongs to Project and Organisation; has many CollabMessages"),
           ("CollabMessage", "request_id, author_id, body, created_at", "belongs to CollabRequest"),
           ("NdaAcceptance", "request_id, party, nda_version, accepted_at", "belongs to CollabRequest"),
           ("DocumentAccessLog", "document_id, viewer_id, viewed_at", "belongs to Document (M5)")],
 screens=[("SC-19", "Partner directory (12 service groups)", "Must", "docs/screens/screen-spec-SC-19.md"),
          ("SC-20", "Partner profile", "Must", "docs/screens/screen-spec-SC-20.md"),
          ("SC-25", "Collaboration request + status tracking (includes SC-24)", "Must", "docs/screens/screen-spec-SC-25.md"),
          ("SC-21", "My organisation profile", "Must", None), ("SC-22", "Submit verification", "Must", None),
          ("SC-23", "Send collaboration request", "Must", None), ("SC-36", "Admin — verification queue", "Must", None)],
 sc=[("A producer finds at least one verified partner in their shooting province in under 5 minutes.", "Timed task with 5 producers."),
     ("Four in five requests get a partner response within 72 hours.", "Response times over the first 50 requests."),
     ("A guest can never see a partner's prices or direct contact.", "Private-window check on 10 profiles."),
     ("VFDA staff decide a verification request in under 15 minutes of review work.", "Timed review of 5 requests.")],
 assumptions=["At launch VFDA onboards at least 20 suppliers across the 12 groups.",
              "The NDA is one standard mutual text provided by VFDA."],
 oq=[("Official names of the 12 service groups (the mockup uses a proposed list).", True, "Client (VFDA)"),
     ("Written criteria for awarding VFDA Verified.", True, "Client (VFDA)"),
     ("Criteria for the *eligible to sign a service agreement under Article 13* flag.", True, "Client (VFDA)"),
     ("Is the NDA mutual and standard (one VFDA text) or supplied by each partner?", True, "Client (VFDA)"),
     ("After how many days does an unanswered request expire?", False, "Client (VFDA)"),
     ("DBIZ2 F-M4-16 sets the Partners gauge to 100% on *accepted*; the screens do it on *confirmed*. Which one?", True, "Client (VFDA)")],
 trace=[("1. Purpose", "System Design v2.0 — 1. Schematic, §1.2 (M4); Cinema Law 2022, Article 13", "`docs/architecture/context.md`"),
        ("4.1 Usage flow", "FLOW-01 flows 2 and 3 (Figure 3) + Step 3 additions", "`docs/architecture/usage-flow.md` §2, §3"),
        ("4.2–4.3 Sequences", "SEQ-06 (Fig. 9), SEQ-07 (Fig. 10)", "`docs/architecture/sequence-diagrams.md`"),
        ("5. Functional requirements", "Function List rows 62–80", "`docs/function-list.md` rows 62–80"),
        ("7. Screens", "Screen List SC-19..SC-25, SC-36", "`docs/screen-list.md` §1")],
 recon=[("Request lifecycle", "Five statuses ending at accepted / declined", "Producer confirms after acceptance (*Sent → Partner responded → Confirmed*, screen list note #14)", "Changed — Client to confirm"),
        ("Partners gauge", "100% on accepted (F-M4-16)", "100% on confirmed", "Open question 6"),
        ("NDA direction", "Partner accepts before viewing project documents", "Both parties accept; the producer's acceptance opens the partner's private layer", "Changed — Client to confirm"),
        ("F-M4-07, F-M4-19 priority", "Must", "Could", "Changed — Client to confirm")],
))

# =============================================================================  M5
MODULES.append(dict(
 id="M5", name="Dossier kit, bilingual drafts and countdown",
 source="Function List rows 81–88 (F-M5-01 .. F-M5-08); Use Case UC-18, UC-20, UC-21; Screens SC-26, SC-28, SC-29",
 purpose="This module gives each project the list of documents its segment needs, stores them, helps turn the English script summary into a Vietnamese draft that a person proofreads, and counts back from the first shooting day to the latest safe date to file. "
         "Nothing it produces is presented as final: every generated document is a draft for a human.",
 in_scope=["Document list per segment with the basis for each item (required by law / commonly requested / location-specific).",
           "Uploading and replacing documents; status per document.",
           "Vietnamese draft of the synopsis and Vietnam-scene script, paragraph-level proofreading, two-column PDF.",
           "First shooting day entry and the reverse timeline with two scenarios."],
 out_scope=["Submitting the dossier to the Ministry (phase 3).",
            "Certified translation.",
            "Visa, equipment import, drone paperwork (M6, phase 2)."],
 depends=["M1 (segment)", "M2 (completeness check, deadline calculation F-M2-17)", "M4 (partner who proofreads, service agreement)", "M0 (dossier gauge)", "External: language model API, Supabase Storage"],
 actors=[("Member", "Primary — uploads, edits the Vietnamese draft, sets the shooting day", "Function List (F-M5-01..03, 07, 08)"),
         ("Partner (confirmed Vietnamese partner)", "Secondary — confirms proofreading", "Function List (F-M5-06)"),
         ("System", "Generates the draft and the PDF", "Function List (F-M5-04, 05)")],
 stories=[
  dict(id="US-1", p="P1", title="Know exactly which documents my segment needs",
       journey="As a producer, I want a document list for my segment that says why each item is needed, so that I do not waste time on paperwork nobody asks for.",
       acc=["**Given** a segment A project, **When** the document kit opens, **Then** it lists the four Article 13 components marked *Required by law* and other items marked *Commonly requested* or *Location-specific*.",
            "**Given** a location in a heritage area is shortlisted, **When** the kit refreshes, **Then** a *Location-specific* item for that permit appears."]),
  dict(id="US-2", p="P1", title="Get a Vietnamese draft I can proofread",
       journey="As a foreign producer, I want a Vietnamese draft of my synopsis aligned paragraph by paragraph, so that my Vietnamese partner only has to proofread, not translate from scratch.",
       acc=["**Given** an English synopsis of 14 paragraphs, **When** the user clicks *Create Vietnamese draft*, **Then** 14 Vietnamese paragraphs appear, each marked *Machine translation · not proofread*.",
            "**Given** a paragraph marked proofread, **When** anyone edits it, **Then** it returns to *not proofread*.",
            "**Given** 14 of 14 paragraphs proofread, **When** the page updates, **Then** Article 13 component b can become *Present*."]),
  dict(id="US-3", p="P1", title="See my latest safe filing date",
       journey="As a producer, I want the safe submission deadline counted back from my first shooting day, so that one resubmission cannot push my shoot.",
       acc=["**Given** first shooting day 15/03/2027 and a 7-day buffer, **When** the countdown loads, **Then** it shows the safe deadline 27/01/2027 and warns that filing on 16/02/2027 with one resubmission gives a result on 28/03/2027, after the first shooting day.",
            "**Given** a public holiday period inside the processing window, **When** the countdown loads, **Then** it is shown as a band marked *expected* until official dates are published."]),
 ],
 edge=["A file larger than 25 MB or of another type: refused at the upload area with the limit stated.",
       "A document is replaced: the old version is kept in history; the check reruns.",
       "The first shooting day is so close that the safe deadline has passed: the countdown says by how many days, in red, and offers *Book a VFDA consultation*.",
       "The translation call fails for one paragraph: only that paragraph shows *Could not translate — retry*."],
 flows=[("4.1 Usage flow — dossier loop (excerpt of the producer journey)",
"""flowchart TD
    Q3{How did the partner respond?} -- Accepted --> DOS[M5 · Four-component dossier · bilingual draft · countdown from the first shooting day]
    DOS --> CHK[M2 · Dossier check + topic review]
    CHK --> Q4{All four Article 13 components present?}
    Q4 -- Not yet --> DOS
    Q4 -- Yes --> NOTI([M7 · Notify provincial People's Committee])""",
"Excerpt of `docs/architecture/usage-flow.md` flow 1, translated. Diamonds Q3, Q4 added in Step 3 — awaiting Client confirmation.")],
 seqs=[("4.2 Sequence — bilingual dossier draft (SEQ-10)",
"""sequenceDiagram
    actor U as Producer
    participant FE as Next.js app
    participant EF as Edge Function
    participant AI as Language model API
    participant ST as Supabase Storage
    actor PT as Vietnamese supplier

    U->>FE: Request a Vietnamese synopsis
    FE->>EF: generateBilingual(project_id)
    EF->>AI: Translate and format to the required structure
    AI-->>EF: Structured Vietnamese version
    EF->>EF: Build a two-column English-Vietnamese PDF
    EF->>EF: Stamp DRAFT - REQUIRES PROOFREADING on every page
    EF->>ST: Store the PDF
    ST-->>EF: File path
    EF-->>FE: File ready
    FE-->>U: Download the draft
    U->>PT: Send to the Vietnamese partner to proofread
    PT->>FE: Mark as proofread
    Note over EF: Never submits automatically - the end product is a file for a person to handle""",
"Textualised from SEQ-10 (Figure 13), translated. 6 participants, 12 messages. SC-28 adds paragraph-level proofreading in the editor before the PDF — see §11.")],
 fr=[("F-M5-01", "The system MUST list the documents required for the project's segment, each with name, basis and template, read from configuration tables.", "Member", "Must"),
     ("F-M5-02", "The system MUST let project members upload and replace documents (PDF or DOCX, max 25 MB) in private storage.", "Member", "Must"),
     ("F-M5-03", "The system MUST show a status for every document: present, needs fixing, pending or missing.", "Member", "Must"),
     ("F-M5-04", "The system MUST generate a Vietnamese draft of the synopsis and Vietnam-scene script, aligned paragraph by paragraph with the source.", "System", "Must"),
     ("F-M5-05", "The system MUST export a two-column English–Vietnamese PDF with *DRAFT — REQUIRES PROOFREADING* on every page.", "System", "Must"),
     ("F-M5-06", "The system MUST record who proofread each paragraph and when, and let the confirmed Vietnamese partner confirm the document as proofread.", "Partner / Member", "Must"),
     ("F-M5-07", "The system MUST store the project's first shooting day and safety buffer.", "Member", "Must"),
     ("F-M5-08", "The system MUST show the reverse timeline with both scenarios and flag milestones that are late.", "Member", "Must")],
 io={
  "F-M5-01": ("segment ENUM(A, B, C) Req; project_id UUID Req", "required_documents ARRAY<(doc_code VARCHAR(40), name_vi TEXT, name_en TEXT, basis ENUM(law, common, location), template_url TEXT)>", "basis added (SC-26)"),
  "F-M5-02": ("project_id UUID Req; doc_code VARCHAR(40) Req; file BYTEA Req", "document_id UUID", "PDF / DOCX, max 25 MB; previous versions kept"),
  "F-M5-03": ("project_id UUID Req", "doc_status ARRAY<(doc_code VARCHAR(40), state ENUM(present, needs_fix, pending, missing))>", "states changed from DBIZ2 — see §11"),
  "F-M5-04": ("synopsis_en TEXT Req; project_meta JSONB Req", "paragraphs ARRAY<(idx INTEGER, source_text TEXT, target_text TEXT, status ENUM(machine, reviewed))>; structure_version VARCHAR(20)", "paragraph alignment added (SC-28)"),
  "F-M5-05": ("synopsis_en TEXT Req; synopsis_vi TEXT Req", "pdf_url TEXT; watermark BOOLEAN", "watermark always true"),
  "F-M5-06": ("document_id UUID Req; paragraph_idx INTEGER Opt; reviewer_id UUID Req; reviewer_org_id UUID Opt", "proofread_at TIMESTAMPTZ", "paragraph-level added; editing clears it"),
  "F-M5-07": ("shoot_date DATE Req; buffer_days INTEGER Req", "shoot_date DATE", "after today; buffer 0 / 7 / 14 / 21"),
  "F-M5-08": ("milestones JSONB Req", "timeline_view JSONB", "smooth path + one-resubmission path; holiday bands"),
 },
 br=[("BR-001", "Every generated document is a draft: the PDF carries *DRAFT — REQUIRES PROOFREADING* on every page; CINEMATCH never submits anything.", "Only a person can take responsibility for a filing."),
     ("BR-002", "Article 13 component b counts as present only when every paragraph of the Vietnamese version has been proofread by a person.", "Machine translation is not a Vietnamese script."),
     ("BR-003", "Each document item carries its basis: *Required by law*, *Commonly requested* or *Location-specific*; nothing is presented as mandatory without a legal basis.", "Honesty about what is actually required."),
     ("BR-004", "The document list is generated from `segment_requirements` plus shortlisted locations; it is never hard-coded.", "VFDA must be able to change it."),
     ("BR-005", "The countdown uses the same calculation as M2 (F-M2-17) and the dashboard.", "One number everywhere.")],
 entities=[("DocumentType", "doc_code, name_vi, name_en, basis, template_url, segments", "has many DocumentSlots"),
           ("DocumentSlot", "project_id, doc_code, state", "belongs to Project; has many Documents"),
           ("Document", "document_id, file_path, version, uploaded_by, uploaded_at", "belongs to DocumentSlot"),
           ("BilingualDocument", "project_id, doc_code, structure_version", "has many BilingualParagraphs"),
           ("BilingualParagraph", "idx, source_text, target_text, status, reviewed_by, reviewed_at", "belongs to BilingualDocument"),
           ("ProjectGlossary", "project_id, source_term, target_term", "belongs to Project"),
           ("PublicHoliday", "name, start_date, end_date, is_expected", "used by the timeline")],
 screens=[("SC-26", "Document kit by segment", "Must", "docs/screens/screen-spec-SC-26.md"),
          ("SC-28", "Bilingual draft editor (Vietnamese–English)", "Must", "docs/screens/screen-spec-SC-28.md"),
          ("SC-29", "20-day countdown", "Must", "docs/screens/screen-spec-SC-29.md")],
 sc=[("A producer sees the full list of documents for their segment, with the reason for each, on the first visit.", "Walkthrough with 5 producers: ask *why do you need item X?*"),
     ("A Vietnamese partner proofreads a 14-paragraph draft in under 45 minutes.", "Timed session with 2 partners."),
     ("Every producer in testing can state their safe submission deadline after opening the countdown.", "Task check with 5 producers.")],
 assumptions=["The Vietnamese partner (or a Vietnamese-speaking team member) does the proofreading.",
              "Public holidays are loaded manually by VFDA each year."],
 oq=[("Document list for segment C.", True, "Client (VFDA Legal Board)"),
     ("Who may mark a paragraph proofread: any project member, or only the confirmed Vietnamese partner?", False, "Client (VFDA)"),
     ("Which translation service may process scripts, which are confidential?", True, "Group C + Client"),
     ("Are *foreign crew list* and *provincial notice* required anywhere, or only common practice?", False, "Client (VFDA Legal Board)"),
     ("Official Lunar New Year 2027 holiday dates.", False, "Client (VFDA)")],
 trace=[("1. Purpose", "System Design v2.0 — 1. Schematic, §1.2 (M5)", "`docs/architecture/context.md`"),
        ("4.1 Usage flow", "FLOW-01 flow 1 (Figure 3) + Step 3 additions", "`docs/architecture/usage-flow.md` §1"),
        ("4.2 Sequence", "SEQ-10 (Figure 13)", "`docs/architecture/sequence-diagrams.md` — SEQ-10"),
        ("5. Functional requirements", "Function List rows 81–88", "`docs/function-list.md` rows 81–88"),
        ("5.2 BR-002", "Cinema Law 2022, Article 13 clause 3 (script in Vietnamese)", "legal source"),
        ("7. Screens", "Screen List SC-26, SC-28, SC-29", "`docs/screen-list.md` §1")],
 recon=[("Document states", "missing / uploaded / replaced", "present / needs_fix / pending / missing (shared with SC-27)", "Changed — Client to confirm"),
        ("Proofreading", "Partner marks the whole document proofread", "Paragraph-level proofreading in the editor + partner confirmation", "Added — Client to confirm")],
))

# =============================================================================  M7
MODULES.append(dict(
 id="M7", name="VFDA support — provincial notices and consultations",
 source="Function List rows 89–95 (F-M7-01 .. F-M7-07); Use Case UC-22, UC-23; Screens SC-32, SC-33",
 purpose="This module lets a producer tell the provinces where they plan to shoot, through VFDA, and see each province's reply; it also lets them book a consultation with VFDA staff. "
         "It turns VFDA's relationships with local governments into something a foreign producer can use.",
 in_scope=["Registering interest in a location, generating the provincial notice, recording the province's reply, tracking status.",
           "Booking, confirming and reminding VFDA consultations."],
 out_scope=["The filming licence itself (issued by the Ministry of Culture, Sports and Tourism).",
            "Negotiating with a province on the producer's behalf beyond the notice."],
 depends=["M3 (location, authority contact)", "M0 (project data)", "M4 (confirmed partner shown in the notice)", "SYS (email, notifications)"],
 actors=[("Member", "Primary — registers interest, follows replies, books consultations", "Function List (F-M7-01, 04, 05)"),
         ("Provincial People's Committee / Department of Culture", "Secondary — replies to the notice", "Function List (F-M7-03)"),
         ("VFDA staff", "Secondary — reviews and sends notices, confirms consultations", "Function List (F-M7-06)"),
         ("System", "Generates notices and reminders", "Function List (F-M7-02, 07)")],
 stories=[
  dict(id="US-1", p="P2", title="Let the province know we are coming",
       journey="As a producer, I want the province to be told about my shoot through VFDA, so that local officials are prepared and I am not a surprise.",
       acc=["**Given** a member clicks *I'm interested* on Tràng An for project The Last Ferry, **When** it is saved, **Then** a notice for Ninh Bình is drafted from the project data and appears on the Provinces page at step 1.",
            "**Given** a notice missing the first shooting day, **When** the member tries to send it, **Then** sending is disabled with *A first shooting day is needed before notifying*."]),
  dict(id="US-2", p="P2", title="See the province's reply",
       journey="As a producer, I want to see each province's reply and what to do next, so that I can plan meetings with the right local office.",
       acc=["**Given** the province replies *More info needed* with a note, **When** VFDA records it, **Then** the producer gets a notification and the card shows the status, the date and the note."]),
  dict(id="US-3", p="P3", title="Book time with VFDA",
       journey="As a producer abroad, I want to book a call with VFDA in my own time zone, so that a real person can answer what the tools cannot.",
       acc=["**Given** a producer in Seoul picks a slot, **When** VFDA confirms, **Then** both receive the time in their own time zone and a reminder 24 hours before."]),
 ],
 edge=["The authority email bounces: the notice is marked *Not delivered* and VFDA staff are alerted to find another channel.",
       "The province never replies: after [NEEDS CLARIFICATION: N] working days VFDA staff are reminded to follow up.",
       "The producer removes the location from the shortlist after the notice was sent: the notice stays; VFDA may send a withdrawal."],
 flows=[("4.1 Usage flow — Provincial People's Committee / Department of Culture",
"""flowchart TD
    S([Receive a notice email: a film crew is interested in a local location]) --> OPEN[Open the reply link]
    OPEN --> Q{How does the province reply?}
    Q -- Received --> R1[Status: received]
    Q -- More information needed --> R2[Status: info_needed]
    Q -- Cannot support at this time --> R3[Status: cannot_support]
    R1 --> E([The producer sees the status on the tracking page])
    R2 --> E
    R3 --> E""",
"Textualised from `docs/architecture/usage-flow.md` flow 6, translated. Diamond Q added in Step 3 from F-M7-03 — awaiting Client confirmation.")],
 seqs=[("4.2 Sequence — provincial notice (SEQ-11)",
"""sequenceDiagram
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
    Note over DB: This came from the BA Report executive summary and was missed in MVP v1""",
"Textualised from SEQ-11 (Figure 14), translated. 5 participants, 11 messages. SC-32 inserts a VFDA review before the email is sent — see §11.")],
 fr=[("F-M7-01", "The system MUST record a member's interest in a location for a project.", "Member", "Should"),
     ("F-M7-02", "The system MUST generate the provincial notice from project data and queue it for VFDA staff to review and send from VFDA's domain.", "System / VFDA Staff", "Should"),
     ("F-M7-03", "The system MUST record the province's reply as received, info_needed or cannot_support, with an optional note and time.", "Province / VFDA Staff", "Should"),
     ("F-M7-04", "The system MUST show the producer, per province, the four-step progress and the reply.", "Member", "Should"),
     ("F-M7-05", "The system SHOULD let a member book a VFDA consultation by topic and slot, handling time zones.", "Member", "Should"),
     ("F-M7-06", "The system SHOULD let VFDA staff confirm or reschedule and assign an officer.", "VFDA Staff", "Should"),
     ("F-M7-07", "The system SHOULD remind both sides before the consultation.", "System", "Should")],
 io={
  "F-M7-01": ("project_id UUID Req; location_id UUID Req", "interest_id UUID", ""),
  "F-M7-02": ("interest_id UUID Req; project_summary TEXT Req; authority_email VARCHAR(254) Req; reviewed_by UUID Req", "notification_id UUID; delivery_status ENUM(queued, sent, bounced)", "reviewed_by added (VFDA review step, SC-32); needs first shooting day"),
  "F-M7-03": ("interest_id UUID Req; response ENUM(received, info_needed, cannot_support) Req; note TEXT Opt", "response_status ENUM; responded_at TIMESTAMPTZ", ""),
  "F-M7-04": ("project_id UUID Req", "interests ARRAY<(location_id UUID, response_status ENUM, responded_at TIMESTAMPTZ)>", "one card per province"),
  "F-M7-05": ("topic ENUM Req; slot_start TIMESTAMPTZ Req; timezone VARCHAR(40) Req", "booking_id UUID", "IANA time zone"),
  "F-M7-06": ("booking_id UUID Req; officer_id UUID Req", "booking_status ENUM(confirmed, rescheduled)", ""),
  "F-M7-07": ("booking_id UUID Req", "reminders ARRAY<notification>", "2 records, 24 h before"),
 },
 br=[("BR-001", "Notices are sent in VFDA's name, never directly by the producer.", "VFDA is the relationship holder with local government."),
     ("BR-002", "Every notice states that it does not replace the filming licence from the Ministry of Culture, Sports and Tourism.", "Avoids a province or producer mistaking it for permission."),
     ("BR-003", "The province's reply is one of three final values; the free-text note is kept as entered.", "Consistent tracking and reporting."),
     ("BR-004", "Reply times feed the provincial readiness index (M3).", "Makes responsiveness visible and comparable.")],
 entities=[("LocationInterest", "interest_id, project_id, location_id, created_at", "belongs to Project and Location"),
           ("ProvinceNotice", "interest_id, province_id, drafted_at, reviewed_by, sent_at, received_at, response, note, responded_at, delivery_status", "belongs to LocationInterest"),
           ("ConsultationBooking", "booking_id, member_id, topic, slot_start, timezone, officer_id, booking_status", "belongs to UserAccount")],
 screens=[("SC-32", "Provincial People's Committee notices", "Should", "docs/screens/screen-spec-SC-32.md"),
          ("SC-33", "Book a VFDA consultation", "Should", None)],
 sc=[("A producer knows the reply status of every province on their shortlist without contacting anyone.", "Walkthrough with 5 producers."),
     ("Provinces reply to four in five notices within 7 working days.", "Reply times over the first 30 notices."),
     ("A producer abroad books a consultation in their own time zone in under 2 minutes.", "Timed test with 3 producers in different time zones.")],
 assumptions=["VFDA staff have capacity to review notices within 2 working days.",
              "One notice per province per project, even when several locations are in the same province."],
 oq=[("Does VFDA have the mandate / practice to send notices to Provincial People's Committees, and what is the official template?", True, "Client (VFDA)"),
     ("Is the notice addressed to the People's Committee or to the provincial Department of Culture?", True, "Client (VFDA)"),
     ("Automatic sending (DBIZ2 SEQ-11) or VFDA staff review before sending (SC-32)?", True, "Client (VFDA)"),
     ("After how many working days without reply should VFDA follow up?", False, "Client (VFDA)")],
 trace=[("1. Purpose", "System Design v2.0 — 1. Schematic, §1.2 (M7); BA Report executive summary", "`docs/architecture/context.md`"),
        ("4.1 Usage flow", "FLOW-01 flow 6 (Figure 3) + Step 3 addition", "`docs/architecture/usage-flow.md` §6"),
        ("4.2 Sequence", "SEQ-11 (Figure 14)", "`docs/architecture/sequence-diagrams.md` — SEQ-11"),
        ("5. Functional requirements", "Function List rows 89–95", "`docs/function-list.md` rows 89–95"),
        ("7. Screens", "Screen List SC-32, SC-33", "`docs/screen-list.md` §1")],
 recon=[("Notice dispatch", "Sent automatically by a database webhook (SEQ-11)", "Drafted automatically, reviewed and sent by VFDA staff (SC-32)", "Open question 3"),
        ("Module priority", "Must", "Should — Tier 2 of the screen list file (#20)", "Changed — Client to confirm")],
))
