# -*- coding: utf-8 -*-
"""S3 relationships and S4 logical columns for the CINEMATCH data model."""

# ---------------------------------------------------------------- S3 relationships
# (left, left_card, line, right_card, right, verb, forward, reverse, zero_side, citation)
# line "--" : child cannot exist without parent ; ".." : child only references parent
R = [
 ("USER_ACCOUNT","||","--","||","PROFILE","has",
  "Each user account has exactly one profile","Each profile belongs to exactly one user account","neither","SYS §6 (\"has one Profile\"); SYS §5.1 FR-001 full_name Req"),
 ("PRODUCER_ORGANISATION","|o","..","o{","PROFILE","employs",
  "Each producer organisation employs zero or more profiles","Each profile works for zero or one producer organisation (none for VFDA staff, Legal Board, admin and partner accounts)","both sides","SYS §6 (\"belongs to ProducerOrganisation\"); SYS §5.1 FR-001 org_name Req; SYS §5.2 BR-002; SYS §6.1 producer_org_id No"),
 ("USER_ACCOUNT","||","--","|{","CONSENT","gives",
  "Each user account gives one or more consents","Each consent is given by exactly one user account","neither","SYS §6; SYS §5.1 FR-001 consent_version Req"),
 ("USER_ACCOUNT","||","--","o{","NOTIFICATION","receives",
  "Each user account receives zero or more notifications","Each notification is received by exactly one user account","NOTIFICATION side","SYS §6; SYS §5.1 FR-009 (unread_only, unread_count)"),
 ("NOTIFICATION","|o","..","o|","EMAIL_DELIVERY","is emailed as",
  "Each notification is emailed as zero or one email delivery","Each email delivery carries zero or one notification","both sides","SYS §6 (\"may relate to a Notification\")"),
 ("PRODUCER_ORGANISATION","||","..","o{","PROJECT","owns",
  "Each producer organisation owns zero or more projects","Each project is owned by exactly one producer organisation","PROJECT side","SYS §6 (\"has many Projects (M0)\"); M0 §6 (\"belongs to ProducerOrganisation\")"),
 ("PROJECT","||","--","|{","PROJECT_MEMBER","gives access to",
  "Each project gives access to one or more project members","Each project member belongs to exactly one project","neither","M0 §6; M0 §5.1 FR-001 (\"make the creator its owner\")"),
 ("USER_ACCOUNT","|o","..","o{","PROJECT_MEMBER","joins projects as",
  "Each user account joins zero or more projects as a project member","Each project member is zero or one user account (none while an invitation is pending)","both sides","M0 §6 (\"belongs to Project and UserAccount\"); M0 §5.1 FR-004 (invitee_email, invite_status pending); M0 §3 US-3"),
 ("PROJECT","||","--","o{","PROJECT_PROVINCE","plans to shoot in",
  "Each project plans to shoot in zero or more project provinces","Each project province belongs to exactly one project","PROJECT_PROVINCE side","M0 §6; M0 §5.1 FR-001 provinces Opt"),
 ("PROVINCE","||","..","o{","PROJECT_PROVINCE","is planned as",
  "Each province is planned as zero or more project provinces","Each project province is exactly one province","PROJECT_PROVINCE side","M0 §6 (province_id); M0 §5.1 FR-001"),
 ("PROJECT","||","--","o{","READINESS_SNAPSHOT","is measured by",
  "Each project is measured by zero or more readiness snapshots","Each readiness snapshot measures exactly one project","READINESS_SNAPSHOT side","M0 §6; M0 §5.1 FR-008 (nightly)"),
 ("PROJECT","|o","..","o{","SEGMENT_DECISION","is configured by",
  "Each project is configured by zero or more segment decisions","Each segment decision configures zero or one project","both sides","M1 §6 (\"belongs to Project (M0) once saved\"); M1 §3 Edge cases (nothing stored before saving)"),
 ("SEGMENT_RULE","|o","..","o{","SEGMENT_DECISION","decides",
  "Each segment rule decides zero or more segment decisions","Each segment decision is decided by zero or one segment rule","both sides","M1 §6 (\"used by SegmentDecision\"); M1 §3 US-2 (override); M1 §3 Edge cases (answers match no rule)"),
 ("RULE_SET_VERSION","|o","..","|{","LEGAL_RULE","includes",
  "Each rule set version includes one or more legal rules","Each legal rule is included in zero or one rule set version","LEGAL_RULE's version (draft rules have none)","M2 §6 (\"has many LegalRules\"); M2 §5.1 FR-004 (version created on activation)"),
 ("USER_ACCOUNT","||","..","o{","RULE_SET_VERSION","publishes",
  "Each user account publishes zero or more rule set versions","Each rule set version is published by exactly one user account","RULE_SET_VERSION side","M2 §6 (created_by); M2 §5.1 FR-004 (version created on each activation)"),
 ("USER_ACCOUNT","|o","..","o{","LEGAL_RULE","approves",
  "Each user account approves zero or more legal rules","Each legal rule is approved by zero or one user account","both sides","M2 §6 (approved_by); M2 §3 US-3 (draft rule has no approver)"),
 ("RULE_SET_VERSION","||","..","o{","PRECHECK_RUN","is applied in",
  "Each rule set version is applied in zero or more pre-check runs","Each pre-check run applies exactly one rule set version","PRECHECK_RUN side","M2 §6 (rule_version); M2 §5.2 BR-007"),
 ("PROJECT","|o","..","o{","PRECHECK_RUN","may be linked to",
  "Each project is linked to zero or more pre-check runs","Each pre-check run is linked to zero or one project","both sides","M2 §6 (\"may belong to a Project\"); M2 §3 US-1 (guest, no sign-up)"),
 ("PRECHECK_RUN","||","--","o{","PRECHECK_FINDING","produces",
  "Each pre-check run produces zero or more pre-check findings","Each pre-check finding is produced by exactly one pre-check run","PRECHECK_FINDING side","M2 §6; M2 §3 US-1 (\"Given no findings\")"),
 ("LEGAL_RULE","||","..","o{","PRECHECK_FINDING","is cited by",
  "Each legal rule is cited by zero or more pre-check findings","Each pre-check finding cites exactly one legal rule","PRECHECK_FINDING side","M2 §6 (rule_code); M2 §5.2 BR-001"),
 ("RULE_SET_VERSION","||","..","o{","COMPLIANCE_RUN","is applied in",
  "Each rule set version is applied in zero or more compliance runs","Each compliance run applies exactly one rule set version","COMPLIANCE_RUN side","M2 §6 (rule_version); M2 §5.2 BR-007"),
 ("PROJECT","||","--","o{","COMPLIANCE_RUN","is checked by",
  "Each project is checked by zero or more compliance runs","Each compliance run checks exactly one project","COMPLIANCE_RUN side","M2 §6 (\"belongs to Project\")"),
 ("COMPLIANCE_RUN","||","--","o{","COMPLIANCE_FINDING","produces",
  "Each compliance run produces zero or more compliance findings","Each compliance finding is produced by exactly one compliance run","COMPLIANCE_FINDING side","M2 §6; M2 §3 US-1 (\"Given no findings\")"),
 ("LEGAL_RULE","||","..","o{","COMPLIANCE_FINDING","is cited by",
  "Each legal rule is cited by zero or more compliance findings","Each compliance finding cites exactly one legal rule","COMPLIANCE_FINDING side","M2 §6 (rule_code); M2 §5.2 BR-001"),
 ("PROVINCE","||","..","o{","LOCATION","contains",
  "Each province contains zero or more locations","Each location lies in exactly one province","LOCATION side","M3 §6; M3 §5.1 FR-002 province_id Req; M3 §3 US-5 (province with too little data)"),
 ("LOCATION","||","--","o{","LOCATION_IMAGE","is shown in",
  "Each location is shown in zero or more location images","Each location image shows exactly one location","LOCATION_IMAGE side","M3 §6 (\"has many LocationImages\")"),
 ("LOCATION","||","--","o|","AUTHORITY_CONTACT","is reached through",
  "Each location is reached through zero or one authority contact","Each authority contact serves exactly one location","AUTHORITY_CONTACT side","M3 §6 (\"has one AuthorityContact\"); M3 §3 US-3 (location with an unverified contact)"),
 ("USER_ACCOUNT","||","..","o{","AUTHORITY_CONTACT","verifies",
  "Each user account verifies zero or more authority contacts","Each authority contact is verified by exactly one user account","AUTHORITY_CONTACT side","M3 §5.1 FR-004 verified_by Req"),
 ("PROJECT","|o","..","o{","LOCATION_QUERY","may be searched for by",
  "Each project may be searched for by zero or more location queries","Each location query belongs to zero or one project","both sides","M3 §6 (\"may belong to Project\"); M3 §5.1 FR-011 project_id Opt; M3 §5.2 BR-009 (guests search without a project)"),
 ("PROJECT","||","--","o{","PROJECT_SHORTLIST","keeps",
  "Each project keeps zero or more shortlist entries","Each shortlist entry belongs to exactly one project","PROJECT_SHORTLIST side","M3 §6; M3 §5.1 FR-018"),
 ("LOCATION","||","..","o{","PROJECT_SHORTLIST","is kept in",
  "Each location is kept in zero or more shortlist entries","Each shortlist entry keeps exactly one location","PROJECT_SHORTLIST side","M3 §6 (\"belongs to Project and Location\")"),
 ("ORGANISATION","||","--","o|","ORGANISATION_MEMBER_LAYER","shows members",
  "Each organisation shows members zero or one member layer","Each member layer belongs to exactly one organisation","ORGANISATION_MEMBER_LAYER side","M4 §6; M4 §5.1 FR-001 (capability fields Opt)"),
 ("ORGANISATION","||","--","o|","ORGANISATION_PRIVATE_LAYER","shows confirmed partners",
  "Each organisation shows confirmed partners zero or one private layer","Each private layer belongs to exactly one organisation","ORGANISATION_PRIVATE_LAYER side","M4 §6; M4 §5.1 FR-001 (rate_card, past_clients Opt)"),
 ("PROVINCE","|o","..","o{","ORGANISATION","hosts the headquarters of",
  "Each province hosts the headquarters of zero or more organisations","Each organisation has its headquarters in zero or one province","both sides","M4 §6 (hq_province); M4 §6.1 hq_province INTEGER No"),
 ("ORGANISATION","||","--","o{","VERIFICATION_REQUEST","applies through",
  "Each organisation applies through zero or more verification requests","Each verification request is made by exactly one organisation","VERIFICATION_REQUEST side","M4 §6; M4 §5.1 FR-008"),
 ("USER_ACCOUNT","|o","..","o{","VERIFICATION_REQUEST","decides",
  "Each user account decides zero or more verification requests","Each verification request is decided by zero or one user account","both sides","M4 §6 (decided_by); M4 §5.1 FR-009 (status pending)"),
 ("PROJECT","||","--","o{","COLLAB_REQUEST","sends",
  "Each project sends zero or more collaboration requests","Each collaboration request is sent for exactly one project","COLLAB_REQUEST side","M4 §6; M4 §5.1 FR-012 project_id Req"),
 ("ORGANISATION","||","..","o{","COLLAB_REQUEST","receives",
  "Each organisation receives zero or more collaboration requests","Each collaboration request goes to exactly one organisation","COLLAB_REQUEST side","M4 §6; M4 §5.1 FR-012 org_id Req"),
 ("COLLAB_REQUEST","||","--","o{","COLLAB_MESSAGE","carries",
  "Each collaboration request carries zero or more messages","Each message belongs to exactly one collaboration request","COLLAB_MESSAGE side","M4 §6 (\"has many CollabMessages\"); M4 §5.2 BR-009"),
 ("USER_ACCOUNT","||","..","o{","COLLAB_MESSAGE","writes",
  "Each user account writes zero or more messages","Each message is written by exactly one user account","COLLAB_MESSAGE side","M4 §6 (author_id)"),
 ("COLLAB_REQUEST","||","--","o{","NDA_ACCEPTANCE","is protected by",
  "Each collaboration request is protected by zero or more NDA acceptances","Each NDA acceptance protects exactly one collaboration request","NDA_ACCEPTANCE side","M4 §6; M4 §3 US-4 (\"When the member accepts the NDA\")"),
 ("DOCUMENT","||","--","o{","DOCUMENT_ACCESS_LOG","is viewed in",
  "Each document is viewed in zero or more access-log entries","Each access-log entry records exactly one document","DOCUMENT_ACCESS_LOG side","M4 §6 (\"belongs to Document (M5)\"); M4 §5.1 FR-018"),
 ("USER_ACCOUNT","||","..","o{","DOCUMENT_ACCESS_LOG","views",
  "Each user account views documents in zero or more access-log entries","Each access-log entry records exactly one viewer","DOCUMENT_ACCESS_LOG side","M4 §5.1 FR-018 viewer_id Req"),
 ("DOCUMENT_TYPE","||","..","o{","DOCUMENT_SLOT","defines",
  "Each document type defines zero or more document slots","Each document slot is of exactly one document type","DOCUMENT_SLOT side","M5 §6 (\"has many DocumentSlots\")"),
 ("PROJECT","||","--","o{","DOCUMENT_SLOT","needs",
  "Each project needs zero or more document slots","Each document slot belongs to exactly one project","DOCUMENT_SLOT side","M5 §6 (\"belongs to Project\"); M5 §10 (document list for segment C open)"),
 ("DOCUMENT_SLOT","||","--","o{","DOCUMENT","holds",
  "Each document slot holds zero or more document versions","Each document is held by exactly one document slot","DOCUMENT side","M5 §6 (\"has many Documents\"); M5 §5.1 FR-003 (state missing)"),
 ("USER_ACCOUNT","||","..","o{","DOCUMENT","uploads",
  "Each user account uploads zero or more documents","Each document is uploaded by exactly one user account","DOCUMENT side","M5 §6 (uploaded_by)"),
 ("PROJECT","||","--","o{","BILINGUAL_DOCUMENT","has drafts",
  "Each project has zero or more bilingual drafts","Each bilingual draft belongs to exactly one project","BILINGUAL_DOCUMENT side","M5 §6 (project_id)"),
 ("DOCUMENT_TYPE","||","..","o{","BILINGUAL_DOCUMENT","is drafted as",
  "Each document type is drafted as zero or more bilingual drafts","Each bilingual draft is of exactly one document type","BILINGUAL_DOCUMENT side","M5 §6 (doc_code)"),
 ("BILINGUAL_DOCUMENT","||","--","|{","BILINGUAL_PARAGRAPH","is split into",
  "Each bilingual draft is split into one or more paragraphs","Each paragraph belongs to exactly one bilingual draft","neither","M5 §6; M5 §5.1 FR-004; M5 §3 US-2 (14 paragraphs)"),
 ("USER_ACCOUNT","|o","..","o{","BILINGUAL_PARAGRAPH","proofreads",
  "Each user account proofreads zero or more paragraphs","Each paragraph is proofread by zero or one user account","both sides","M5 §6 (reviewed_by); M5 §3 US-2 (\"not proofread\")"),
 ("ORGANISATION","|o","..","o{","BILINGUAL_PARAGRAPH","proofreads through",
  "Each organisation proofreads zero or more paragraphs through its staff","Each paragraph is proofread on behalf of zero or one organisation","both sides","M5 §5.1 FR-006 (reviewer_org_id Opt)"),
 ("PROJECT","||","--","o{","PROJECT_GLOSSARY","defines terms in",
  "Each project defines zero or more glossary terms","Each glossary term belongs to exactly one project","PROJECT_GLOSSARY side","M5 §6 (\"belongs to Project\"); M5 §5.2 BR-006 (\"stored with the project\")"),
 ("PROJECT","||","--","o{","LOCATION_INTEREST","declares",
  "Each project declares zero or more location interests","Each location interest belongs to exactly one project","LOCATION_INTEREST side","M7 §6; M7 §5.1 FR-001 project_id Req"),
 ("LOCATION","||","..","o{","LOCATION_INTEREST","attracts",
  "Each location attracts zero or more location interests","Each location interest concerns exactly one location","LOCATION_INTEREST side","M7 §6; M7 §5.1 FR-001 location_id Req"),
 ("LOCATION_INTEREST","||","--","||","PROVINCE_NOTICE","is announced by",
  "Each location interest is announced by exactly one province notice","Each province notice announces exactly one location interest","neither","M7 §6 (\"belongs to LocationInterest\"); M7 §3 US-1 (\"a notice ... is drafted\" when interest is saved)"),
 ("PROVINCE","||","..","o{","PROVINCE_NOTICE","is addressed by",
  "Each province is addressed by zero or more province notices","Each province notice is addressed to exactly one province","PROVINCE_NOTICE side","M7 §6 (province_id)"),
 ("USER_ACCOUNT","|o","..","o{","PROVINCE_NOTICE","reviews",
  "Each user account reviews zero or more province notices","Each province notice is reviewed by zero or one user account","both sides","M7 §6 (reviewed_by); M7 §3 US-1 (notice drafted before review)"),
 ("USER_ACCOUNT","||","..","o{","CONSULTATION_BOOKING","books",
  "Each user account books zero or more consultations","Each consultation is booked by exactly one user account","CONSULTATION_BOOKING side","M7 §6 (member_id; \"belongs to UserAccount\")"),
 ("USER_ACCOUNT","|o","..","o{","CONSULTATION_BOOKING","is assigned",
  "Each user account is assigned zero or more consultations as officer","Each consultation is assigned to zero or one officer","both sides","M7 §6 (officer_id); M7 §5.1 FR-006 (officer assigned after booking)"),
 ("ORGANISATION","|o","..","o{","MODERATION_ITEM","is reviewed through",
  "Each organisation is reviewed through zero or more moderation items","Each moderation item concerns zero or one organisation (exactly one of organisation or location image)","both sides","M10 §6 (\"refers to Organisation or LocationImage\"); M10 §3 US-1 (content type org_profile)"),
 ("LOCATION_IMAGE","|o","..","o{","MODERATION_ITEM","is reviewed through",
  "Each location image is reviewed through zero or more moderation items","Each moderation item concerns zero or one location image (exactly one of organisation or location image)","both sides","M10 §6 (\"refers to Organisation or LocationImage\"); M10 §5.1 FR-001 (content type location_image)"),
 ("USER_ACCOUNT","||","..","o{","MODERATION_ITEM","submits",
  "Each user account submits zero or more moderation items","Each moderation item is submitted by exactly one user account","MODERATION_ITEM side","M10 §5.1 FR-001 (OUT submitted_by UUID)"),
 ("USER_ACCOUNT","|o","..","o{","MODERATION_ITEM","decides on",
  "Each user account decides on zero or more moderation items","Each moderation item is decided by zero or one user account (none while pending)","both sides","M10 §6 (\"decided by UserAccount\"); M10 §5.1 FR-002 (content_status pending)"),
 ("USER_ACCOUNT","||","..","o{","AUDIT_LOG","writes",
  "Each user account writes zero or more audit log records","Each audit log record is written for exactly one user account","AUDIT_LOG side","M10 §6 (\"belongs to UserAccount\"); M10 §5.1 FR-008 admin_id Req"),
 ("USER_ACCOUNT","|o","..","o{","QUARTERLY_REPORT","rereads",
  "Each user account rereads zero or more quarterly reports","Each quarterly report is reread by zero or one user account (none until the reread is recorded)","both sides","M10 §6 (\"prepared by UserAccount\"); M10 §5.1 FR-007 reread_by; M10 §3 US-3 (draft not yet reread)"),
]
UNLINKED = {  # stored entities with no citable relationship (open questions, per S3 instruction)
 "SEGMENT_REQUIREMENT":"belongs to a segment (M1 §6) — segment is an enum, not an entity; link to DOCUMENT_TYPE (M5 BR-004) not declared",
 "PUBLIC_HOLIDAY":"\"used by the timeline\" (M5 §6) — the timeline is derived; no stored entity references it",
}

OQ_03 = [
 ("[NEEDS CLARIFICATION: Is LEGAL_RULE ↔ RULE_SET_VERSION one-to-many (as M2 §6 says) or many-to-many (every version re-includes all active rules)?]","Yes","M2 owner","One-to-many as declared; a rule points to the version that activated it","Re-running an old check cannot reconstruct the exact rule set of that version."),
 ("[NEEDS CLARIFICATION: Do VFDA staff, partner and admin accounts also need a PRODUCER_ORGANISATION? The diagram says every profile works for exactly one.]","Yes","SYS owner","Exactly one, as sign-up requires org_name (SYS FR-001)","Staff and partner accounts created by an admin would need a fake producer company.",
  "Resolved 01/10/2026 — zero or one: SYS §6.1 declares producer_org_id optional for accounts not created through sign-up (SYS BR-002); 03 and 04 corrected together."),
 ("[NEEDS CLARIFICATION: Is a province notice drafted at the moment the interest is saved (1:1), or can an interest exist without a notice?]","No","M7 owner","1:1, per M7 US-1","If notices are optional, PROVINCE_NOTICE side becomes zero-or-one."),
 ("[NEEDS CLARIFICATION: Is an email delivery linked to at most one notification, or can one digest email carry several?]","No","SYS owner","At most one","A digest would need an association entity."),
 ("[NEEDS CLARIFICATION: Which entity links SEGMENT_REQUIREMENT to DOCUMENT_TYPE (M5 BR-004 builds the kit from segment_requirements)?]","Yes","M1 + M5 owners","No link drawn","The document kit cannot be generated from data (M5 BR-004) without it."),
]

# ---------------------------------------------------------------- S4 logical columns
# (name, declared type, required, key, citation, fk_target)
# required: Req / Opt (from FIELDS input), system-set (FIELDS output), not declared
ND = "type not declared"
C = {}
C["USER_ACCOUNT"] = [
 ("user_id","UUID","system-set","PK","SYS §5.1 FR-001 (OUT)",None),
 ("email","VARCHAR(254)","Req","UK","SYS §5.1 FR-001; SYS §3 US-1 (one account per email)",None),
 ("email_verified","BOOLEAN","system-set","","SYS §5.1 FR-001 (OUT)",None),
 ("role","ENUM(guest, member, partner, vfda_staff, vfda_legal, admin)","Req","","SYS §5.1 FR-004; SYS §5.2 BR-002 (new account = member)",None),
 ("account_status","ENUM(active, deactivated)","Opt","","SYS §5.1 FR-004; SYS §5.2 BR-005 (deactivated and anonymised, never hard-deleted)",None),
 ("created_at",ND,"not declared","","SYS §6",None),
]
C["PROFILE"] = [
 ("user_id","UUID","Req","PK, FK","SYS §6 (\"belongs to UserAccount\")","USER_ACCOUNT"),
 ("full_name","VARCHAR(120)","Req","","SYS §5.1 FR-001",None),
 ("crew_role","ENUM(producer, director, production_coordinator, line_producer, other)","Req","","SYS §5.1 FR-001",None),
 ("locale","ENUM(vi, en)","Req","","SYS §5.1 FR-005 (also said to live in a cookie — see Type conflicts)",None),
 ("producer_org_id",ND,"not declared","FK","SYS §6","PRODUCER_ORGANISATION"),
]
C["PRODUCER_ORGANISATION"] = [
 ("producer_org_id",ND,"not declared","PK","SYS §6 (Profile.producer_org_id)",None),
 ("org_name","VARCHAR(200)","Req","","SYS §5.1 FR-001",None),
 ("country","CHAR(2)","Req","","SYS §5.1 FR-001",None),
 ("website","VARCHAR(300)","Opt","","SYS §5.1 FR-001",None),
]
C["CONSENT"] = [
 ("user_id","UUID","Req","PK, FK","SYS §6","USER_ACCOUNT"),
 ("consent_version","VARCHAR(20)","Req","PK","SYS §5.1 FR-001; SYS §5.2 BR-003",None),
 ("accepted_at",ND,"not declared","","SYS §6; SYS §5.2 BR-003 (timestamp)",None),
]
C["NOTIFICATION"] = [
 ("notification_id","UUID","system-set","PK","SYS §5.1 FR-007 (OUT)",None),
 ("recipient_id","UUID","Req","FK","SYS §5.1 FR-007","USER_ACCOUNT"),
 ("event_type","VARCHAR(60)","Req","","SYS §5.1 FR-007",None),
 ("payload","JSONB","Req","","SYS §5.1 FR-007",None),
 ("created_at","TIMESTAMPTZ","system-set","","SYS §5.1 FR-007 (OUT)",None),
 ("read_at",ND,"not declared","","SYS §6; SYS §5.1 FR-009 (mark as read)",None),
]
C["EMAIL_DELIVERY"] = [
 ("email_delivery_id",ND,"not declared","PK","none — no identifier declared (open question)",None),
 ("notification_id","UUID","Opt","FK","SYS §6 (\"may relate to a Notification\")","NOTIFICATION"),
 ("template_id","VARCHAR(60)","Req","","SYS §5.1 FR-008",None),
 ("recipient_email","VARCHAR(254)","Req","","SYS §5.1 FR-008",None),
 ("variables","JSONB","Req","","SYS §5.1 FR-008",None),
 ("delivery_status","ENUM(queued, sent, bounced)","system-set","","SYS §5.1 FR-008 (OUT)",None),
 ("provider_message_id","TEXT","system-set","UK","SYS §5.1 FR-008 (OUT)",None),
]
C["SEGMENT_RULE"] = [
 ("segment_rule_id",ND,"not declared","PK","M1 §6 (rule_id — renamed, see 01 conflicts)",None),
 ("q1_shoot_in_vn","BOOLEAN","Req","","M1 §6 (q1) = M1 §5.1 FR-002 q1_shoot_in_vn",None),
 ("q2_release","ENUM(abroad, vietnam, both)","Opt","","M1 §6 (q2) = M1 §5.1 FR-002",None),
 ("q3_producer","ENUM(foreign, vietnamese, coproduction)","Opt","","M1 §6 (q3) = M1 §5.1 FR-002",None),
 ("result_segment","ENUM(A, B, C)","not declared","","M1 §6; type of segment from M1 §5.1 FR-002",None),
 ("version",ND,"not declared","","M1 §6",None),
]
C["SEGMENT_REQUIREMENT"] = [
 ("segment","ENUM(A, B, C)","not declared","PK","M1 §6; type from M1 §5.1 FR-002",None),
 ("requirement_code",ND,"not declared","PK","M1 §6",None),
 ("label_vi",ND,"not declared","","M1 §6",None),
 ("label_en",ND,"not declared","","M1 §6",None),
 ("needed",ND,"not declared","","M1 §6; M1 §3 US-1 (Needed / Not needed)",None),
]
C["SEGMENT_DECISION"] = [
 ("segment_decision_id",ND,"not declared","PK","none — no identifier declared (open question)",None),
 ("project_id",ND,"not declared","FK","M1 §6 (\"belongs to Project (M0) once saved\")","PROJECT"),
 ("session_key",ND,"not declared","","M1 §6 (anonymous session before sign-up)",None),
 ("segment_rule_id",ND,"not declared","FK","M1 §6 (\"used by SegmentDecision\")","SEGMENT_RULE"),
 ("q1_shoot_in_vn","BOOLEAN","Req","","M1 §5.1 FR-002 (answers)",None),
 ("q2_release","ENUM(abroad, vietnam, both)","Opt","","M1 §5.1 FR-002 (Req when q1 = true)",None),
 ("q3_producer","ENUM(foreign, vietnamese, coproduction)","Opt","","M1 §5.1 FR-002 (Req when q1 = true)",None),
 ("q4_needs","ARRAY<ENUM(locations, crew, cast, equipment, logistics)>","Opt","","M1 §5.1 FR-002; M1 §5.2 BR-002",None),
 ("segment","ENUM(A, B, C)","system-set","","M1 §5.1 FR-002 (OUT)",None),
 ("segment_override","ENUM(A, B, C)","Opt","","M1 §5.1 FR-002; M1 §5.2 BR-003 — see Type conflicts",None),
 ("decided_by","ARRAY<INTEGER>","system-set","","M1 §5.1 FR-002 (OUT)",None),
 ("journey_config","JSONB","system-set","","M1 §5.1 FR-002 (OUT)",None),
]
C["PROJECT"] = [
 ("project_id","UUID","system-set","PK","M0 §5.1 FR-001 (OUT)",None),
 ("producer_org_id",ND,"not declared","FK","M0 §6 (\"belongs to ProducerOrganisation\")","PRODUCER_ORGANISATION"),
 ("project_name","VARCHAR(200)","Req","","M0 §5.1 FR-001",None),
 ("format","ENUM(feature, documentary, commercial, tv, music_video)","Req","","M0 §5.1 FR-001",None),
 ("segment","ENUM(A, B, C)","Req","","M0 §5.1 FR-001; M1 §5.1 FR-003",None),
 ("shoot_date","DATE","Opt","","M0 §5.1 FR-001 (Opt), FR-002 (after today); M5 §5.1 FR-007 (Req) — see Type conflicts",None),
 ("buffer_days","INTEGER","Req","","M5 §5.1 FR-007 (0 / 7 / 14 / 21); M2 §5.1 FR-017 (default 7)",None),
 ("shoot_days_vn","INTEGER","Opt","","M0 §5.1 FR-001",None),
 ("crew_size_band","ENUM(u15, 15_50, o50)","Opt","","M0 §5.1 FR-001",None),
 ("logline","VARCHAR(500)","Opt","","M0 §5.1 FR-001",None),
 ("stage","ENUM(draft, preparing, archived)","Opt","","M0 §5.1 FR-002; M0 §6; M0 §5.2 BR-005 (archived, never deleted)",None),
 ("updated_at","TIMESTAMPTZ","system-set","","M0 §5.1 FR-002 (OUT)",None),
]
C["PROJECT_MEMBER"] = [
 ("member_id","UUID","system-set","PK","M0 §5.1 FR-004 (OUT)",None),
 ("project_id","UUID","Req","FK","M0 §5.1 FR-004","PROJECT"),
 ("user_id",ND,"not declared","FK","M0 §6 (user_id)","USER_ACCOUNT"),
 ("invitee_email","VARCHAR(254)","Req","","M0 §5.1 FR-004",None),
 ("permission","ENUM(view, edit)","Req","","M0 §5.1 FR-004 (owner not in the set — see Structural findings)",None),
 ("invite_status","ENUM(pending, accepted)","system-set","","M0 §5.1 FR-004 (OUT)",None),
]
C["PROJECT_PROVINCE"] = [
 ("project_id","UUID","Req","PK, FK","M0 §6","PROJECT"),
 ("province_id","INTEGER","Opt","PK, FK","M0 §5.1 FR-001 (provinces ARRAY<INTEGER> Opt)","PROVINCE"),
]
C["READINESS_SNAPSHOT"] = [
 ("snapshot_id","UUID","system-set","PK","M0 §5.1 FR-008 (OUT)",None),
 ("project_id","UUID","Req","FK","M0 §5.1 FR-008","PROJECT"),
 ("snapshot_date","DATE","Req","","M0 §5.1 FR-008",None),
 ("readiness_total","NUMERIC(5,2)","system-set","","M0 §6; M0 §5.1 FR-009 (OUT)",None),
]
C["RULE_SET_VERSION"] = [
 ("rule_version","VARCHAR(20)","system-set","PK","M2 §5.1 FR-004 (OUT) — see Type conflicts",None),
 ("created_at",ND,"not declared","","M2 §6",None),
 ("created_by",ND,"not declared","FK","M2 §6","USER_ACCOUNT"),
]
C["LEGAL_RULE"] = [
 ("rule_id","UUID","system-set","PK","M2 §5.1 FR-002 (OUT)",None),
 ("rule_code","VARCHAR(40)","Req","UK","M2 §5.1 FR-002",None),
 ("rule_version","VARCHAR(20)","system-set","FK","M2 §6; M2 §5.1 FR-002 (OUT version INTEGER) — see Type conflicts","RULE_SET_VERSION"),
 ("title_vi","VARCHAR(200)","Req","","M2 §5.1 FR-002",None),
 ("title_en","VARCHAR(200)","Req","","M2 §5.1 FR-002",None),
 ("description_vi","TEXT","Req","","M2 §5.1 FR-002",None),
 ("description_en","TEXT","Req","","M2 §5.1 FR-002",None),
 ("guidance_vi","TEXT","Req","","M2 §5.1 FR-002",None),
 ("guidance_en","TEXT","Req","","M2 §5.1 FR-002",None),
 ("citation","VARCHAR(200)","Req","","M2 §5.1 FR-002; M2 §5.2 BR-002 (CHECK)",None),
 ("severity","ENUM(notice, action)","Req","","M2 §5.1 FR-002",None),
 ("topic","ENUM(security, history, religion, privacy, dossier, public_order, heritage)","Req","","M2 §5.1 FR-002 (Req), FR-001 (filter_topic) — FR-015 declares VARCHAR(60), see Type conflicts",None),
 ("rule_slug","VARCHAR(120)","Req","UK","M2 §5.1 FR-016",None),
 ("status","ENUM(draft, approved, retired)","Opt","","M2 §5.1 FR-001 (filter_status); M2 §6; M2 §5.2 BR-008 (retired, never deleted)",None),
 ("approved_by","UUID","Req","FK","M2 §5.1 FR-003 (approver_id); M2 §5.2 BR-002 (CHECK)","USER_ACCOUNT"),
 ("approved_at","TIMESTAMPTZ","system-set","","M2 §5.1 FR-003 (OUT)",None),
 ("is_active","BOOLEAN","system-set","","M2 §5.1 FR-003 (OUT)",None),
]
C["PRECHECK_RUN"] = [
 ("brief_id","UUID","system-set","PK","M2 §5.1 FR-007 (OUT)",None),
 ("project_id",ND,"not declared","FK","M2 §6 (\"may belong to a Project\")","PROJECT"),
 ("rule_version","VARCHAR(20)","system-set","FK","M2 §6; M2 §5.2 BR-007","RULE_SET_VERSION"),
 ("synopsis_hash","TEXT","Req","","M2 §5.1 FR-007",None),
 ("lang","ENUM(en, vi)","Req","","M2 §5.1 FR-005 (= locale ENUM(vi, en) in FR-007)",None),
 ("flags","JSONB","Opt","","M2 §5.1 FR-005",None),
 ("country_guess","VARCHAR(2)","Opt","","M2 §5.1 FR-007",None),
 ("attention_level","ENUM(low, medium, high)","system-set","","M2 §5.1 FR-006 (OUT); M2 §5.2 BR-004",None),
 ("created_at",ND,"not declared","","M2 §6",None),
]
C["PRECHECK_FINDING"] = [
 ("brief_id","UUID","Req","PK, FK","M2 §6 (\"belongs to PrecheckRun\")","PRECHECK_RUN"),
 ("rule_code","VARCHAR(40)","system-set","PK, FK","M2 §5.1 FR-006 (OUT findings)","LEGAL_RULE"),
 ("span_start",ND,"not declared","PK","M2 §6",None),
 ("span_end",ND,"not declared","","M2 §6",None),
 ("quoted_text","TEXT","system-set","","M2 §5.1 FR-006 (OUT)",None),
 ("explanation_vi","TEXT","system-set","","M2 §5.1 FR-006 (OUT); M2 §6 (explanation)",None),
 ("explanation_en","TEXT","system-set","","M2 §5.1 FR-006 (OUT)",None),
]
C["COMPLIANCE_RUN"] = [
 ("run_id",ND,"not declared","PK","M2 §6",None),
 ("project_id",ND,"not declared","FK","M2 §6","PROJECT"),
 ("rule_version","VARCHAR(20)","not declared","FK","M2 §6; M2 §5.2 BR-007","RULE_SET_VERSION"),
 ("run_at",ND,"not declared","","M2 §6",None),
]
C["COMPLIANCE_FINDING"] = [
 ("finding_id","UUID","Req","PK","M2 §5.1 FR-014",None),
 ("run_id",ND,"not declared","FK","M2 §6 (\"belongs to ComplianceRun\")","COMPLIANCE_RUN"),
 ("rule_code","VARCHAR(40)","system-set","FK","M2 §6; type from M2 §5.1 FR-006","LEGAL_RULE"),
 ("quoted_text","TEXT","system-set","","M2 §6; type from M2 §5.1 FR-006",None),
 ("finding_status","ENUM(open, reviewed)","system-set","","M2 §5.1 FR-014 (OUT)",None),
 ("reviewer_note","TEXT","Opt","","M2 §5.1 FR-014",None),
]
C["PROVINCE"] = [
 ("province_id","INTEGER","Req","PK","M3 §5.1 FR-002 (province_id INTEGER)",None),
 ("name",ND,"not declared","UK","M3 §6",None),
 ("slug","VARCHAR(80)","Req","UK","M3 §5.1 FR-020 (province_slug)",None),
 ("region","ENUM(north, central, south)","not declared","","M3 §6; type from M3 §5.1 FR-007 (region)",None),
 ("merged_from",ND,"not declared","","M3 §6; M3 §5.2 BR-006",None),
]
C["LOCATION"] = [
 ("location_id","UUID","system-set","PK","M3 §5.1 FR-002 (OUT)",None),
 ("slug","VARCHAR(160)","system-set","UK","M3 §5.1 FR-002 (OUT)",None),
 ("province_id","INTEGER","Req","FK","M3 §5.1 FR-002; M3 §5.2 BR-006","PROVINCE"),
 ("name_vi","VARCHAR(200)","Req","","M3 §5.1 FR-002",None),
 ("name_en","VARCHAR(200)","Req","","M3 §5.1 FR-002",None),
 ("district","VARCHAR(120)","Opt","","M3 §5.1 FR-002",None),
 ("lat","NUMERIC(9,6)","Req","","M3 §5.1 FR-002",None),
 ("lng","NUMERIC(9,6)","Req","","M3 §5.1 FR-002",None),
 ("airport_km","INTEGER","Opt","","M3 §5.1 FR-002",None),
 ("scene_types","ARRAY<ENUM(karst, river, village, rice_field, sea, floating_village, cave, jungle, old_town, market, rice_terrace, mountain, dunes, mangrove)>","Req","","M3 §5.1 FR-002, FR-007",None),
 ("desc_vi","TEXT","Req","","M3 §5.1 FR-002",None),
 ("desc_en","TEXT","Req","","M3 §5.1 FR-002",None),
 ("crew_capacity","ENUM(u15, 15_50, o50)","Req","","M3 §5.1 FR-002",None),
 ("lodging_20km","BOOLEAN","Req","","M3 §5.1 FR-002",None),
 ("grid_power","BOOLEAN","Req","","M3 §5.1 FR-002",None),
 ("truck_access","BOOLEAN","Req","","M3 §5.1 FR-002",None),
 ("months_to_avoid","ARRAY<INTEGER>","Opt","","M3 §5.1 FR-002",None),
 ("permit_complexity","ENUM(low, medium, high)","Req","","M3 §5.1 FR-002",None),
 ("restriction_note","TEXT","Opt","","M3 §5.1 FR-002",None),
 ("availability","ENUM(open, survey_in_progress, paused)","Req","","M3 §5.1 FR-002; M3 §5.2 BR-010",None),
 ("intake_status","ENUM(awaiting_contact, published, unpublished)","system-set","","M3 §5.1 FR-002 (OUT); M3 §6; M3 §5.2 BR-008 (unpublished, never deleted)",None),
 ("published","BOOLEAN","system-set","","M3 §5.1 FR-005 (OUT); M3 §5.2 BR-004",None),
 ("blocked_reason","TEXT","system-set","","M3 §5.1 FR-005 (OUT)",None),
]
C["LOCATION_IMAGE"] = [
 ("image_url","TEXT","system-set","PK","M3 §5.1 FR-003 (OUT)",None),
 ("location_id",ND,"not declared","FK","M3 §6 (\"belongs to Location\")","LOCATION"),
 ("image_source","TEXT","Req","","M3 §5.1 FR-003",None),
 ("usage_right","TEXT","Req","","M3 §5.1 FR-003",None),
 ("status","ENUM(pending, approved, hidden)","system-set","","M3 §5.1 FR-003 (OUT image_status); M10 §5.1 FR-002 (content_status)",None),
]
C["AUTHORITY_CONTACT"] = [
 ("location_id","UUID","Req","PK, FK","M3 §5.1 FR-004; M3 §6 (\"has one\")","LOCATION"),
 ("authority_name","VARCHAR(200)","Req","","M3 §5.1 FR-004",None),
 ("contact_name","VARCHAR(120)","Req","","M3 §5.1 FR-004",None),
 ("contact_phone","VARCHAR(20)","Req","","M3 §5.1 FR-004",None),
 ("contact_email","VARCHAR(254)","Opt","","M3 §5.1 FR-004",None),
 ("verified_by","UUID","Req","FK","M3 §5.1 FR-004","USER_ACCOUNT"),
 ("verified_at","TIMESTAMPTZ","system-set","","M3 §5.1 FR-004 (OUT)",None),
 ("contact_verified","BOOLEAN","system-set","","M3 §5.1 FR-004 (OUT); M3 §5.1 FR-005 (CHECK)",None),
]
C["LOCATION_QUERY"] = [
 ("query_id","UUID","system-set","PK","M3 §5.1 FR-011 (OUT)",None),
 ("project_id","UUID","Opt","FK","M3 §5.1 FR-011; M3 §6 (\"may belong to Project\")","PROJECT"),
 ("scene_description","TEXT","Req","","M3 §5.1 FR-010, FR-011 (10–1000 characters); M3 §6 description",None),
 ("shoot_month","INTEGER","Opt","","M3 §5.1 FR-011 (1–12, FR-007); M3 §6 month",None),
 ("attributes","JSONB","system-set","","M3 §5.1 FR-011 (OUT); M3 §5.2 BR-009 (no personal data)",None),
]
C["PROJECT_SHORTLIST"] = [
 ("shortlist_id","UUID","system-set","PK","M3 §5.1 FR-018 (OUT)",None),
 ("project_id","UUID","Req","FK","M3 §5.1 FR-018","PROJECT"),
 ("location_id","UUID","Req","FK","M3 §5.1 FR-018 (location_ids ARRAY<UUID>)","LOCATION"),
 ("role","ENUM(primary, backup)","Req","","M3 §5.1 FR-018",None),
]
C["ORGANISATION"] = [
 ("org_id","UUID","system-set","PK","M4 §5.1 FR-001 (OUT)",None),
 ("slug","VARCHAR(160)","system-set","UK","M4 §5.1 FR-001 (OUT)",None),
 ("org_name","VARCHAR(200)","Req","","M4 §5.1 FR-001",None),
 ("legal_form",ND,"not declared","","M4 §6",None),
 ("founded_year",ND,"not declared","","M4 §6",None),
 ("hq_province",ND,"not declared","FK","M4 §6 (a province — see Type conflicts)","PROVINCE"),
 ("service_groups","ARRAY<ENUM(full_production, permits_paperwork, casting, crew, camera_lighting, studios_interiors, location_management, transport_logistics, lodging_catering, interpreting, insurance_legal, post_production)>","Req","","M4 §5.1 FR-001; M4 §5.2 BR-002 (12 fixed values)",None),
 ("provinces","ARRAY<INTEGER>","Req","","M4 §5.1 FR-001",None),
 ("verified_at","TIMESTAMPTZ","system-set","","M4 §5.1 FR-010 (OUT)",None),
 ("verified_until",ND,"not declared","","M4 §6; M4 §5.2 BR-004 (12 months)",None),
 ("art13_eligible",ND,"not declared","","M4 §6",None),
 ("org_status","ENUM(active, deactivated)","Opt","","M4 §5.1 FR-001; M4 §5.2 BR-008 (deactivated, never deleted)",None),
]
C["ORGANISATION_MEMBER_LAYER"] = [
 ("org_id","UUID","Req","PK, FK","M4 §6 (\"belongs to Organisation\")","ORGANISATION"),
 ("capability_desc_vi","TEXT","Opt","","M4 §5.1 FR-001 (§6 capability_desc)",None),
 ("capability_desc_en","TEXT","Opt","","M4 §5.1 FR-001",None),
 ("portfolio",ND,"not declared","","M4 §6",None),
 ("intl_project_count",ND,"not declared","","M4 §6",None),
 ("working_languages","ARRAY<CHAR(2)>","Opt","","M4 §5.1 FR-001; M4 §6",None),
]
C["ORGANISATION_PRIVATE_LAYER"] = [
 ("org_id","UUID","Req","PK, FK","M4 §6","ORGANISATION"),
 ("rate_card","JSONB","Opt","","M4 §5.1 FR-001",None),
 ("past_clients","ARRAY<TEXT>","Opt","","M4 §5.1 FR-001",None),
 ("direct_contact",ND,"not declared","","M4 §6",None),
]
C["VERIFICATION_REQUEST"] = [
 ("request_id","UUID","system-set","PK","M4 §5.1 FR-008 (OUT verification_request_id)",None),
 ("org_id","UUID","Req","FK","M4 §5.1 FR-008","ORGANISATION"),
 ("business_license","FILE","Req","","M4 §5.1 FR-008 (PDF max 25 MB)",None),
 ("reference_projects","ARRAY<TEXT>","Req","","M4 §5.1 FR-008 (≥ 2)",None),
 ("status","ENUM(pending, approved, rejected)","Opt","","M4 §5.1 FR-009, FR-010",None),
 ("decided_by",ND,"not declared","FK","M4 §6","USER_ACCOUNT"),
 ("reason","TEXT","Opt","","M4 §5.1 FR-010 (required when rejected)",None),
]
C["COLLAB_REQUEST"] = [
 ("request_id","UUID","system-set","PK","M4 §5.1 FR-012 (OUT)",None),
 ("project_id","UUID","Req","FK","M4 §5.1 FR-012","PROJECT"),
 ("org_id","UUID","Req","FK","M4 §5.1 FR-012","ORGANISATION"),
 ("services","ARRAY<ENUM>","Req","","M4 §5.1 FR-012",None),
 ("note","TEXT","Opt","","M4 §5.1 FR-012 (max 1000 characters)",None),
 ("status","ENUM(pending, under_review, info_requested, accepted, declined, confirmed, withdrawn)","system-set","","M4 §5.1 FR-012 (pending), FR-014; M4 §5.2 BR-005",None),
 ("response_note","TEXT","Opt","","M4 §5.1 FR-014",None),
 ("sent_at",ND,"not declared","","M4 §6",None),
 ("responded_at","TIMESTAMPTZ","system-set","","M4 §5.1 FR-014 (OUT)",None),
 ("confirmed_at",ND,"not declared","","M4 §6",None),
]
C["COLLAB_MESSAGE"] = [
 ("message_id","UUID","system-set","PK","M4 §5.1 FR-014 (OUT)",None),
 ("request_id","UUID","Req","FK","M4 §5.1 FR-014; M4 §6","COLLAB_REQUEST"),
 ("author_id",ND,"not declared","FK","M4 §6","USER_ACCOUNT"),
 ("created_at",ND,"not declared","","M4 §6",None),
 ("body","TEXT","not declared","","M4 §6; type of response_note, M4 §5.1 FR-014; M4 §5.2 BR-009 (never edited)",None),
]
C["NDA_ACCEPTANCE"] = [
 ("nda_acceptance_id","UUID","system-set","PK","M4 §5.1 FR-017 (OUT)",None),
 ("request_id","UUID","Req","FK","M4 §5.1 FR-017","COLLAB_REQUEST"),
 ("party","ENUM(producer, partner)","Req","","M4 §5.1 FR-017",None),
 ("nda_version","VARCHAR(20)","Req","","M4 §5.1 FR-017",None),
 ("accepted","BOOLEAN","Req","","M4 §5.1 FR-017",None),
 ("accepted_at","TIMESTAMPTZ","system-set","","M4 §5.1 FR-017 (OUT)",None),
]
C["DOCUMENT_ACCESS_LOG"] = [
 ("access_log_id","UUID","system-set","PK","M4 §5.1 FR-018 (OUT)",None),
 ("document_id","UUID","Req","FK","M4 §5.1 FR-018","DOCUMENT"),
 ("viewer_id","UUID","Req","FK","M4 §5.1 FR-018","USER_ACCOUNT"),
 ("viewed_at","TIMESTAMPTZ","system-set","","M4 §5.1 FR-018 (OUT); M4 §5.2 BR-007 (append-only)",None),
]
C["DOCUMENT_TYPE"] = [
 ("doc_code","VARCHAR(40)","system-set","PK","M5 §5.1 FR-001 (OUT)",None),
 ("name_vi","TEXT","system-set","","M5 §5.1 FR-001 (OUT)",None),
 ("name_en","TEXT","system-set","","M5 §5.1 FR-001 (OUT)",None),
 ("basis","ENUM(law, common, location)","system-set","","M5 §5.1 FR-001 (OUT); M5 §5.2 BR-003",None),
 ("template_url","TEXT","system-set","","M5 §5.1 FR-001 (OUT)",None),
 ("segments",ND,"not declared","","M5 §6",None),
]
C["DOCUMENT_SLOT"] = [
 ("project_id","UUID","Req","PK, FK","M5 §5.1 FR-002; M5 §6","PROJECT"),
 ("doc_code","VARCHAR(40)","Req","PK, FK","M5 §5.1 FR-002; M5 §6","DOCUMENT_TYPE"),
 ("state","ENUM(present, needs_fix, pending, missing)","system-set","","M5 §5.1 FR-003 (OUT); M2 §5.1 FR-009",None),
]
C["DOCUMENT"] = [
 ("document_id","UUID","system-set","PK","M5 §5.1 FR-002 (OUT)",None),
 ("project_id","UUID","Req","FK","M5 §5.1 FR-002 (with doc_code: the slot)","DOCUMENT_SLOT"),
 ("doc_code","VARCHAR(40)","Req","FK","M5 §5.1 FR-002","DOCUMENT_SLOT"),
 ("file_path",ND,"not declared","","M5 §6 (FR-002 declares file BYTEA — see Type conflicts)",None),
 ("version",ND,"not declared","","M5 §6; M5 §5.1 FR-002 (previous versions kept)",None),
 ("uploaded_by",ND,"not declared","FK","M5 §6","USER_ACCOUNT"),
 ("uploaded_at",ND,"not declared","","M5 §6",None),
]
C["BILINGUAL_DOCUMENT"] = [
 ("project_id","UUID","not declared","PK, FK","M5 §6","PROJECT"),
 ("doc_code","VARCHAR(40)","not declared","PK, FK","M5 §6","DOCUMENT_TYPE"),
 ("structure_version","VARCHAR(20)","system-set","","M5 §5.1 FR-004 (OUT)",None),
 ("synopsis_en","TEXT","Req","","M5 §5.1 FR-004, FR-005",None),
 ("project_meta","JSONB","Req","","M5 §5.1 FR-004 (copy of project data — see Structural findings)",None),
 ("pdf_url","TEXT","system-set","","M5 §5.1 FR-005 (OUT)",None),
]
C["BILINGUAL_PARAGRAPH"] = [
 ("project_id","UUID","not declared","PK, FK","M5 §6 (belongs to BilingualDocument)","BILINGUAL_DOCUMENT"),
 ("doc_code","VARCHAR(40)","not declared","PK, FK","M5 §6","BILINGUAL_DOCUMENT"),
 ("idx","INTEGER","system-set","PK","M5 §5.1 FR-004 (OUT)",None),
 ("source_text","TEXT","system-set","","M5 §5.1 FR-004 (OUT)",None),
 ("target_text","TEXT","system-set","","M5 §5.1 FR-004 (OUT)",None),
 ("status","ENUM(machine, reviewed)","system-set","","M5 §5.1 FR-004 (OUT); M5 §5.2 BR-002",None),
 ("reviewed_by","UUID","Req","FK","M5 §5.1 FR-006 (reviewer_id); M5 §6","USER_ACCOUNT"),
 ("reviewer_org_id","UUID","Opt","FK","M5 §5.1 FR-006 (which organisation — see 01 conflicts)","ORGANISATION"),
 ("reviewed_at","TIMESTAMPTZ","system-set","","M5 §5.1 FR-006 (OUT proofread_at); M5 §6",None),
]
C["PROJECT_GLOSSARY"] = [
 ("project_id",ND,"not declared","PK, FK","M5 §6; M5 §5.2 BR-006","PROJECT"),
 ("term_en","VARCHAR(120)","not declared","PK","M5 §5.1 FR-004 (glossary Opt); M5 §6 source_term",None),
 ("term_vi","VARCHAR(120)","not declared","","M5 §5.1 FR-004 (glossary Opt); M5 §6 target_term",None),
]
C["PUBLIC_HOLIDAY"] = [
 ("name",ND,"not declared","PK","M5 §6",None),
 ("start_date",ND,"not declared","PK","M5 §6",None),
 ("end_date",ND,"not declared","","M5 §6",None),
 ("is_expected",ND,"not declared","","M5 §6; M5 §3 US-3 (band marked *expected*)",None),
]
C["LOCATION_INTEREST"] = [
 ("interest_id","UUID","system-set","PK","M7 §5.1 FR-001 (OUT)",None),
 ("project_id","UUID","Req","FK","M7 §5.1 FR-001","PROJECT"),
 ("location_id","UUID","Req","FK","M7 §5.1 FR-001","LOCATION"),
 ("created_at",ND,"not declared","","M7 §6",None),
]
C["PROVINCE_NOTICE"] = [
 ("interest_id","UUID","Req","PK, FK","M7 §5.1 FR-002; M7 §6","LOCATION_INTEREST"),
 ("province_id",ND,"not declared","FK","M7 §6 (derivable from the location — see Structural findings)","PROVINCE"),
 ("project_summary","TEXT","Req","","M7 §5.1 FR-002",None),
 ("authority_email","VARCHAR(254)","Req","","M7 §5.1 FR-002 (copied from AUTHORITY_CONTACT)",None),
 ("drafted_at",ND,"not declared","","M7 §6",None),
 ("reviewed_by","UUID","Req","FK","M7 §5.1 FR-002","USER_ACCOUNT"),
 ("sent_at",ND,"not declared","","M7 §6",None),
 ("delivery_status","ENUM(queued, sent, bounced)","system-set","","M7 §5.1 FR-002 (OUT)",None),
 ("received_at",ND,"not declared","","M7 §6",None),
 ("response","ENUM(received, info_needed, cannot_support)","Req","","M7 §5.1 FR-003; M7 §5.2 BR-003",None),
 ("note","TEXT","Opt","","M7 §5.1 FR-003",None),
 ("responded_at","TIMESTAMPTZ","system-set","","M7 §5.1 FR-003 (OUT)",None),
]
C["CONSULTATION_BOOKING"] = [
 ("booking_id","UUID","system-set","PK","M7 §5.1 FR-005 (OUT)",None),
 ("member_id",ND,"not declared","FK","M7 §6","USER_ACCOUNT"),
 ("topic","ENUM(dossier, locations, partners, provincial_notice, general)","Req","","M7 §5.1 FR-005",None),
 ("slot_start","TIMESTAMPTZ","Req","","M7 §5.1 FR-005",None),
 ("timezone","VARCHAR(40)","Req","","M7 §5.1 FR-005 (IANA)",None),
 ("officer_id","UUID","Req","FK","M7 §5.1 FR-006","USER_ACCOUNT"),
 ("booking_status","ENUM(confirmed, rescheduled)","system-set","","M7 §5.1 FR-006 (OUT)",None),
]
C["MODERATION_ITEM"] = [
 ("content_id","UUID","Req","PK","M10 §5.1 FR-002; FR-001 (OUT moderation_queue)",None),
 ("content_type","ENUM(org_profile, location_image, showcase)","system-set","","M10 §5.1 FR-001; M10 §9 (showcase waits for M8, phase 2)",None),
 ("organisation_id","UUID","Opt (CHECK)","FK","M10 §6 (\"refers to Organisation\"); type of org_id, M4 §5.1 FR-001 — CHECK: exactly one of organisation_id, location_image_id (modelling choice)","ORGANISATION"),
 ("location_image_id","TEXT","Opt (CHECK)","FK","M10 §6 (\"or LocationImage\"); holds image_url, the only key of LOCATION_IMAGE (M3 §5.1 FR-003) — CHECK: exactly one of the two (modelling choice)","LOCATION_IMAGE"),
 ("submitted_by","UUID","system-set","FK","M10 §5.1 FR-001 (OUT)","USER_ACCOUNT"),
 ("submitted_at","TIMESTAMPTZ","system-set","","M10 §5.1 FR-001 (OUT)",None),
 ("content_status","ENUM(pending, approved, hidden)","system-set","","M10 §5.1 FR-002 (OUT); M10 §5.2 BR-001",None),
 ("reason","TEXT","Opt","","M10 §5.1 FR-002; M10 §5.2 BR-002 (required when hidden)",None),
 ("decided_by",ND,"not declared","FK","M10 §6","USER_ACCOUNT"),
 ("decided_at",ND,"not declared","","M10 §6",None),
]
C["AUDIT_LOG"] = [
 ("audit_log_id","UUID","system-set","PK","M10 §5.1 FR-008 (OUT)",None),
 ("action","VARCHAR(60)","Req","","M10 §5.1 FR-008; M10 §3 US-4 (location.publish)",None),
 ("admin_id","UUID","Req","FK","M10 §5.1 FR-008 (= actor_id in FR-009)","USER_ACCOUNT"),
 ("target_id","UUID","Opt","","M10 §5.1 FR-008 (any table — no foreign key, see Structural findings)",None),
 ("logged_at","TIMESTAMPTZ","system-set","","M10 §5.1 FR-008 (OUT); M10 §5.2 BR-005 (append-only)",None),
]
C["QUARTERLY_REPORT"] = [
 ("report_id","UUID","Req","PK","M10 §5.1 FR-007",None),
 ("period_start","DATE","Req","","M10 §6 (period) = M10 §5.1 FR-003 period_start",None),
 ("period_end","DATE","Req","","M10 §6 (period) = M10 §5.1 FR-003 period_end",None),
 ("demand_index","JSONB","Req","","M10 §5.1 FR-007 (the indicators the report was drafted from)",None),
 ("narrative_vi","TEXT","Req","","M10 §5.1 FR-006 (OUT), FR-007",None),
 ("narrative_en","TEXT","system-set","","M10 §5.1 FR-006 (OUT)",None),
 ("reread_by","UUID","Req","FK","M10 §5.1 FR-007; M10 §5.2 BR-004","USER_ACCOUNT"),
 ("report_pdf_url","TEXT","system-set","","M10 §5.1 FR-007 (OUT)",None),
 ("exported_at",ND,"not declared","","M10 §6",None),
]

# ---------------------------------------------------------------- §6.1 attribute types (declared 01/10/2026)
import re as _re
from specs_types import ATTR_TYPES as _AT
def _snake(n): return _re.sub(r"(?<!^)(?=[A-Z])", "_", n).upper()
def _arr(t): return f"ARRAY<{t[:-2]}>" if t.endswith("[]") else t
_DECLARED = {}
for _mod, _rows in _AT.items():
    for _ent, _att, _typ, _req, _note in _rows:
        _DECLARED[(_snake(_ent), _att)] = (_arr(_typ), "Req" if _req == "Yes" else "Opt", f"{_mod} §6.1")
for _e, _cols in C.items():
    for _i, _c in enumerate(_cols):
        _d = _DECLARED.get((_e, _c[0]))
        if _d and _c[1] == ND:
            _cite = _c[4] if not _c[4].startswith("none") else ""
            _cols[_i] = (_c[0], _d[0], _d[1], _c[3], (_cite + "; " if _cite else "") + _d[2], _c[5])
_unused = [k for k in _DECLARED if not any(c[0] == k[1] for c in C.get(k[0], []))]
assert not _unused, f"§6.1 attributes with no column: {_unused}"

NATURAL_KEY = {
 "USER_ACCOUNT":"email — one account per email (SYS §3 US-1, third criterion).",
 "PROFILE":"user_id — one profile per account (SYS §6).",
 "PRODUCER_ORGANISATION":"org_name + country — proposed; not stated in the spec (open question).",
 "CONSENT":"user_id + consent_version.",
 "NOTIFICATION":"None in the real world (an event); recipient_id + event_type + created_at identifies it in practice.",
 "EMAIL_DELIVERY":"provider_message_id once sent; none while queued (open question).",
 "SEGMENT_RULE":"q1_shoot_in_vn + q2_release + q3_producer + version — the same answers always give the same segment (M1 BR-001).",
 "SEGMENT_REQUIREMENT":"segment + requirement_code.",
 "SEGMENT_DECISION":"None — the same answers may be given many times; a session key is not declared (open question).",
 "PROJECT":"producer_org_id + project_name — proposed (open question).",
 "PROJECT_MEMBER":"project_id + invitee_email (the invited address); project_id + user_id once accepted.",
 "PROJECT_PROVINCE":"project_id + province_id.",
 "READINESS_SNAPSHOT":"project_id + snapshot_date (one per night, M0 FR-008).",
 "RULE_SET_VERSION":"rule_version.",
 "LEGAL_RULE":"rule_code today; rule_code + rule_version once one text per version is kept, as M2 BR-008 now requires (OQ-04-24).",
 "PRECHECK_RUN":"None — the same summary may be checked many times (synopsis_hash + created_at in practice).",
 "PRECHECK_FINDING":"brief_id + rule_code + span_start.",
 "COMPLIANCE_RUN":"project_id + run_at.",
 "COMPLIANCE_FINDING":"run_id + rule_code + quoted_text.",
 "PROVINCE":"name (one of the 34 units, M3 BR-006); slug.",
 "LOCATION":"name_vi + province_id — proposed; two sites may share a name in different provinces (open question).",
 "LOCATION_IMAGE":"image_url.",
 "AUTHORITY_CONTACT":"location_id (one contact per location, M3 §6).",
 "LOCATION_QUERY":"None (an event).",
 "PROJECT_SHORTLIST":"project_id + location_id.",
 "ORGANISATION":"org_name + hq_province — proposed; a business registration number is not declared (open question).",
 "ORGANISATION_MEMBER_LAYER":"org_id.",
 "ORGANISATION_PRIVATE_LAYER":"org_id.",
 "VERIFICATION_REQUEST":"org_id + submission time (not declared).",
 "COLLAB_REQUEST":"project_id + org_id while the request is open (M4 §3 Edge cases: a second open request is refused).",
 "COLLAB_MESSAGE":"request_id + author_id + created_at (message_id is the declared key, M4 FR-014).",
 "NDA_ACCEPTANCE":"request_id + party (+ nda_version).",
 "DOCUMENT_ACCESS_LOG":"None (append-only event, M4 BR-007).",
 "DOCUMENT_TYPE":"doc_code.",
 "DOCUMENT_SLOT":"project_id + doc_code.",
 "DOCUMENT":"project_id + doc_code + version.",
 "BILINGUAL_DOCUMENT":"project_id + doc_code.",
 "BILINGUAL_PARAGRAPH":"project_id + doc_code + idx.",
 "PROJECT_GLOSSARY":"project_id + term_en.",
 "PUBLIC_HOLIDAY":"name + start_date.",
 "LOCATION_INTEREST":"project_id + location_id — proposed (open question: may a project declare interest twice?).",
 "PROVINCE_NOTICE":"interest_id (one notice per interest).",
 "CONSULTATION_BOOKING":"member_id + slot_start.",
 "MODERATION_ITEM":"organisation_id or location_image_id + submitted_at; one pending item per content (M10 §3 Edge cases: the queue keeps only the latest version).",
 "AUDIT_LOG":"None (append-only event, M10 BR-005); admin_id + action + target_id + logged_at in practice.",
 "QUARTERLY_REPORT":"period_start + period_end.",
}

# (field, source A, source B); TYPE_DECISIONS[i] = type applied in 04 and in the schema (confirm at human gate 4)
TYPE_CONFLICTS = [
 ("rule set version","M2 §5.1 FR-002: version INTEGER (OUT)","M2 §5.1 FR-004: rule_version VARCHAR(20) (OUT); M2 §3 US-1 \"2026.08\""),
 ("PROJECT.shoot_date","M0 §5.1 FR-001: DATE Opt","M5 §5.1 FR-007 and M2 §5.1 FR-017: DATE Req"),
 ("segment_override","M1 §5.1 FR-002: ENUM(A, B, C) Opt","M1 §3 US-2: `segment_override = true` (boolean)"),
 ("PRECHECK_RUN.lang","M2 §5.1 FR-005: lang ENUM(en, vi) Req","M2 §5.1 FR-007: locale ENUM(vi, en) Req"),
 ("PROFILE.locale","SYS §6: attribute of Profile","SYS §5.1 FR-005: \"stored in cookie `locale`\""),
 ("DOCUMENT file","M5 §5.1 FR-002: file BYTEA Req","M5 §6: file_path (in private storage)"),
 ("ORGANISATION.hq_province","M4 §6: hq_province (no type)","M3 §5.1 FR-002: province identifiers are INTEGER"),
 ("working_languages","M4 §5.1 FR-001: ARRAY<CHAR(2)> Opt on the profile input","M4 §6: attribute of OrganisationMemberLayer; M4 §5.1 FR-006 filter working_language CHAR(2)"),
 ("BILINGUAL_PARAGRAPH.reviewed_by","M5 §5.1 FR-006: reviewer_id UUID Req","M5 §5.1 FR-004: paragraphs start as `machine` with no reviewer (must be Opt in storage)"),
 ("LEGAL_RULE.approved_by","M2 §5.1 FR-003: approver_id UUID Req","M2 §3 US-3: a draft rule exists without an approver (must be Opt in storage)"),
 ("LEGAL_RULE.citation","M2 §5.1 FR-002: citation VARCHAR(200) Req","M2 §3 US-3: a draft rule exists without a citation; M2 §5.2 BR-002 enforces it only for activation"),
 ("CONSULTATION_BOOKING.officer_id","M7 §5.1 FR-006: officer_id UUID Req","M7 §5.1 FR-005: the booking exists before an officer is assigned (must be Opt in storage)"),
 ("PROVINCE_NOTICE.reviewed_by / response","M7 §5.1 FR-002 reviewed_by Req; FR-003 response Req","M7 §3 US-1: notice drafted before any review or reply (must be Opt in storage)"),
 ("LEGAL_RULE.topic","M2 §5.1 FR-002: topic ENUM(security, history, religion, privacy, dossier, public_order, heritage) Req; FR-001 filter_topic ENUM","M2 §5.1 FR-015: topic VARCHAR(60) Opt (public filter)"),
 ("QUARTERLY_REPORT.reread_by","M10 §5.1 FR-007: reread_by UUID Req","M10 §3 US-3: a draft exists before anyone rereads it (must be Opt in storage)"),
]

TYPE_DECISIONS = [
 "VARCHAR(20), e.g. `2026.08` (FR-004 and US-1 win; FR-002's INTEGER is a slip).",
 "Optional in storage; required by the functions that need it (M5 FR-007, M2 FR-017).",
 "ENUM(A, B, C): the segment chosen by the override.",
 "`lang ENUM(en, vi)` (the F-M2-05 input).",
 "Column on PROFILE for members; cookie only for guests.",
 "`file_path TEXT` (M5 §6.1): the file stays in private storage.",
 "INTEGER province_id (M4 §6.1), foreign key to PROVINCE.",
 "On ORGANISATION_MEMBER_LAYER as CHAR(2)[]; FR-006 filters on it.",
 "Optional in storage (machine paragraphs have no reviewer); required by F-M5-06.",
 "Optional in storage; CHECK `ck_legal_rule_approved_needs_signature` requires it when status = approved (M2 BR-002).",
 "Optional in storage; same CHECK requires it when status = approved (M2 BR-002).",
 "Optional in storage until F-M7-06 assigns an officer.",
 "Optional in storage until VFDA reviews and the province replies.",
 "ENUM(security, history, religion, privacy, dossier, public_order, heritage); the public filter (FR-015) takes the same set.",
 "Optional in storage; CHECK `ck_quarterly_report_reread_before_export` requires it before exported_at (M10 BR-004).",
]

# (check, entity/column, what the spec does not settle, raised as)
def _nrel(e):
    return sum(1 for r in R if e in (r[0], r[4]))
STRUCTURAL = [
 ("(i) freeze","PROVINCE_NOTICE.authority_email ← AUTHORITY_CONTACT.contact_email","Contacts are re-verified and may change (M3 BR-004). No rule says the notice keeps the address it was sent to.","OQ-04-1"),
 ("(i) freeze","PROVINCE_NOTICE.project_summary ← PROJECT","Project name, dates and logline can be edited after the notice is sent (M0 FR-002). No rule says the summary is frozen.","OQ-04-2"),
 ("(i) freeze","PRECHECK_FINDING / COMPLIANCE_FINDING → LEGAL_RULE (rule_code)","Settled by M2 BR-008: a finding keeps showing the text of the rule version it cited (versions stored per check, BR-007). The model still keys LEGAL_RULE by rule_code alone, so it cannot yet hold two texts of one rule.","OQ-04-3 (resolved); OQ-04-24"),
 ("(i) freeze","SEGMENT_DECISION → SEGMENT_RULE","SEGMENT_RULE has a version; the decision does not store which version decided it.","OQ-04-4"),
 ("(i) freeze","BILINGUAL_DOCUMENT.project_meta ← PROJECT","A copy of project data is stored with the draft; no rule says whether it refreshes when the project changes.","OQ-04-5"),
 ("(i) freeze","NDA_ACCEPTANCE.nda_version; CONSENT.consent_version; READINESS_SNAPSHOT.readiness_total","Settled: versions and snapshots are stored at the time (M4 FR-017, SYS BR-003, M0 FR-008).","—"),
 ("(i) freeze","QUARTERLY_REPORT.demand_index ← DEMAND_INDEX","Settled: the report keeps the indicators it was drafted from (M10 FR-007), so a reread report does not change when platform data changes.","—"),
 ("(i) freeze","MODERATION_ITEM → submitted content","The last approved text stays public while the new one waits (M10 BR-001), but no column holds the waiting version.","OQ-04-20"),
 ("(i) freeze","COLLAB_REQUEST → ORGANISATION verified badge","Settled: the request continues if the badge expires (M4 §3 Edge cases).","—"),
 ("(ii) delete",f"USER_ACCOUNT (in {_nrel('USER_ACCOUNT')} relationships)","Settled by SYS BR-005: never hard-deleted. Deleting an account sets `account_status = deactivated` at once and replaces name and email with anonymous values within 30 days; projects, uploads, access logs and approvals stay and show *Former member*.","OQ-04-6 (resolved)"),
 ("(ii) delete",f"PROJECT (in {_nrel('PROJECT')} relationships)","Settled by M0 BR-005: archived, never deleted (`stage = archived`); read-only, leaves the project list, keeps documents, requests and notices.","OQ-04-7 (resolved)"),
 ("(ii) delete","LOCATION (shortlists, interests, notices)","Settled by M3 BR-008: unpublished, never deleted (`intake_status = unpublished`); shortlists and notices keep it and show *No longer published*.","OQ-04-8 (resolved)"),
 ("(ii) delete","ORGANISATION (requests, proofread paragraphs, moderation items)","Settled by M4 BR-008: deactivated, never deleted (`org_status = deactivated`); open requests are closed as `withdrawn` and the producer is notified; the access log is kept.","OQ-04-9 (resolved)"),
 ("(ii) delete","LEGAL_RULE (findings cite it)","Settled by M2 BR-008: retired, never deleted (`status = retired`).","OQ-04-3 (resolved)"),
 ("(ii) delete","DOCUMENT, DOCUMENT_ACCESS_LOG, SEGMENT_DECISION, AUDIT_LOG data","Settled: previous versions kept (M5 FR-002); access log append-only (M4 BR-007); segment change never deletes (M1 BR-004); audit log append-only for every role (M10 BR-005).","—"),
 ("(iii) enum","PROJECT_MEMBER.permission","F-M0-01 makes the creator the *owner*, but `owner` is not in ENUM(view, edit); F-M0-04 is \"owner only\".","OQ-04-10"),
 ("(iii) enum","PROJECT_MEMBER.invite_status","No function moves an invitation from `pending` to `accepted` (M0 US-3 says \"after accepting\").","OQ-04-10"),
 ("(iii) enum","LEGAL_RULE.status","F-M2-03 moves draft → approved; `retired` is declared (M2 FR-001, BR-008) but no function's input sets it.","OQ-04-23"),
 ("(iii) enum","DOCUMENT_SLOT.state","No function writes `needs_fix` or `pending`; they are described as rule outcomes (M2 US-2, M4 US-2). Stored or derived?","OQ-04-11"),
 ("(iii) enum","BILINGUAL_PARAGRAPH.status","reviewed → machine happens \"when anyone edits it\" (M5 US-2), but no function edits a paragraph.","OQ-04-12"),
 ("(iii) enum","CONSULTATION_BOOKING.booking_status","F-M7-05 creates a booking with no status; values only confirmed / rescheduled — no initial or cancelled value.","OQ-04-13"),
 ("(iii) enum","COLLAB_REQUEST.status","An unanswered request may expire after N days (M4 §3 Edge cases), but `expired` is not in the set.","OQ-04-14"),
 ("(iii) enum","PROJECT.stage; LOCATION.intake_status; LOCATION_IMAGE.status; CONSULTATION_BOOKING.topic; service_groups; scene_types; PROVINCE.region; LEGAL_RULE.topic","Settled: value sets are declared in §5.1 (M0 FR-002; M3 FR-002, FR-003, FR-007; M7 FR-005; M4 FR-001; M2 FR-001, FR-002). LOCATION_IMAGE.status uses pending / approved / hidden in both M3 FR-003 and M10 FR-002.","OQ-04-15 (resolved)"),
 ("(iii) enum","MODERATION_ITEM.content_type","`showcase` is declared but unused until M8 (phase 2, M10 §9) — consistent.","—"),
 ("(iii) enum","VERIFICATION_REQUEST.status","Initial `pending` is implied, not stated by F-M4-08; badge expiry is kept on ORGANISATION, so no `expired` request state — consistent.","—"),
 ("polymorphic","MODERATION_ITEM.organisation_id / location_image_id","Deliberate modelling choice: M10 §6 says an item \"refers to Organisation or LocationImage\". Instead of one polymorphic content reference, two nullable foreign keys with a CHECK that exactly one is set (and that it matches content_type), so the database enforces both references. The phase-2 type `showcase` will need a third column.","— (modelling choice)"),
 ("polymorphic","AUDIT_LOG.target_id","Points at a row of any table, so it carries no foreign key (by design, M10 FR-008). Targets whose key is not a UUID (LOCATION_IMAGE image_url, RULE_SET_VERSION rule_version, DOCUMENT_TYPE doc_code) cannot be recorded in a UUID column.","OQ-04-25"),
 ("writer","MODERATION_ITEM (content_type location_image)","M10 moderates location photos submitted by partners (M10 §1), but the only photo function, F-M3-03, is for VFDA staff; no function lets a partner submit a photo.","OQ-04-22"),
 ("period","PROJECT; LOCATION_QUERY (period filter of DEMAND_INDEX)","The indicators are filtered by month, quarter or year (M10 FR-003, FR-005), but neither PROJECT nor LOCATION_QUERY declares when it was created.","OQ-04-21"),
 ("minimality","PROVINCE_NOTICE.province_id","Kept as a deliberate exception: it records the province the notice was *addressed* to, which must not change if the location's province is later merged (M3 BR-006). Upkeep rule: set once from LOCATION_INTEREST → LOCATION.province_id when the notice is drafted, never updated (M7 §6.1).","OQ-04-16 (resolved)"),
 ("minimality","LEGAL_RULE.is_active vs status","Kept as a deliberate exception: the pre-check reads active rules on every call. Upkeep rule: is_active = (status = approved), enforced by CHECK `ck_legal_rule_active_matches_status`.","OQ-04-16 (resolved)"),
 ("minimality","BILINGUAL_DOCUMENT.watermark","Dropped 01/10/2026: always true (M5 FR-005) — the PDF renderer stamps every page (M5 BR-001); nothing to store.","OQ-04-16 (resolved)"),
 ("polymorphic","SEGMENT_DECISION.project_id / session_key","Resolved 01/10/2026: the single column `session_or_project_id` (two meanings, no possible foreign key) is split into `project_id` (FK → PROJECT) and `session_key`, with a CHECK that exactly one is set (M1 §6.1).","—"),
 ("1NF","ORGANISATION.service_groups, provinces; LOCATION.scene_types, months_to_avoid; SEGMENT_DECISION.q4_needs","Arrays as declared; filtering and counting on them is exactly the use (M3 FR-007, M4 FR-005/006). Implied entities in 01.","01 OQ 3"),
]

N_COLS = sum(len(v) for v in C.values())
N_ND = sum(1 for v in C.values() for c in v if c[1] == ND)
UNCITED = [f"{e}.{c[0]}" for e, v in C.items() for c in v if c[4].startswith("none")]

OQ_04 = [
 ("OQ-04-1","[NEEDS CLARIFICATION: Must a province notice keep the authority email it was sent to, even if the contact changes later?]","No","M7 owner","Yes — copied at send time as FR-002 already does","Replies cannot be traced to the address actually used."),
 ("OQ-04-2","[NEEDS CLARIFICATION: Is the project summary in a sent notice frozen?]","No","M7 owner","Frozen at send time","The province may see a summary different from what it received."),
 ("OQ-04-3","[NEEDS CLARIFICATION: When an approved rule is edited or retired, is the old text kept so old findings still show what fired?]","Yes","M2 owner (VFDA Legal)","Keep every approved text per rule_version; never overwrite","A producer's saved result would silently change meaning.",
  "Resolved 30/09/2026 — M2 §5.2 BR-008: rules are retired, never deleted (`status = retired`), and a finding keeps showing the text of the version it cited. Key change follows in OQ-04-24."),
 ("OQ-04-4","[NEEDS CLARIFICATION: Should a segment decision record the decision-table version used?]","No","M1 owner","Yes, add segment_rule_id (drawn) and rely on the rule's version","A table change could not be audited against past decisions."),
 ("OQ-04-5","[NEEDS CLARIFICATION: Does a bilingual draft refresh its project_meta when the project changes?]","No","M5 owner","No — regenerated only on request","Title or dates in the Vietnamese draft may be stale."),
 ("OQ-04-6","[NEEDS CLARIFICATION: What happens to projects, uploads, logs and approvals when an account is deleted (personal data law)?]","Yes","Nam + VFDA Legal","Account disabled, personal fields erased, rows kept with the link","Either orphaned rows or unlawful retention of personal data.",
  "Resolved 30/09/2026 — SYS §5.2 BR-005: never hard-deleted; `account_status = deactivated` (SYS §5.1 FR-004), name and email anonymised within 30 days, created rows kept as *Former member*."),
 ("OQ-04-7","[NEEDS CLARIFICATION: Can a project be deleted or only archived? What happens to its documents, requests and notices?]","Yes","M0 owner","Archive only; no delete","Deleting would break access logs (append-only) and sent notices.",
  "Resolved 30/09/2026 — M0 §5.2 BR-005: archived, never deleted (`stage = archived`, M0 §5.1 FR-002); read-only; documents, requests and notices kept."),
 ("OQ-04-8","[NEEDS CLARIFICATION: Does unpublishing a location remove it from shortlists and open notices?]","No","M3 owner","No; it is shown as *no longer published*","Producers lose a shortlisted place without notice.",
  "Resolved 30/09/2026 — M3 §5.2 BR-008: `intake_status = unpublished` (M3 §5.1 FR-002); shortlists and notices keep the location and show *No longer published*."),
 ("OQ-04-9","[NEEDS CLARIFICATION: Can an organisation be removed from the directory, and what happens to its open requests?]","No","M4 owner","No removal; badge expiry only","A closed company keeps receiving requests.",
  "Resolved 30/09/2026 — M4 §5.2 BR-008: deactivated, never deleted (`org_status = deactivated`, M4 §5.1 FR-001); open requests closed as `withdrawn`, producer notified, access log kept."),
 ("OQ-04-10","[NEEDS CLARIFICATION: Add `owner` to PROJECT_MEMBER.permission, and which function accepts an invitation?]","Yes","M0 owner","Owner stored as `edit` + flag not modelled; acceptance by sign-in with the invited email","\"Owner only\" rules (M0 FR-004) cannot be enforced in the database."),
 ("OQ-04-11","[NEEDS CLARIFICATION: Is DOCUMENT_SLOT.state stored, or derived from documents, proofreading and partner status each time?]","Yes","M5 + M2 owners","Stored, recomputed on each upload and status change","Stored state can disagree with the rules it summarises."),
 ("OQ-04-12","[NEEDS CLARIFICATION: Which function edits a paragraph (and so clears its proofread status)?]","No","M5 owner","Editing inside SC-28, not specified as a function","The reset in M5 US-2 has no function to hang on."),
 ("OQ-04-13","[NEEDS CLARIFICATION: Initial and cancelled values of CONSULTATION_BOOKING.booking_status?]","No","M7 owner","Status left empty until VFDA confirms; no cancellation (seed follows this)","Unconfirmed bookings are indistinguishable from confirmed ones; a member cannot cancel."),
 ("OQ-04-14","[NEEDS CLARIFICATION: After how many days does an unanswered collaboration request expire, and is `expired` a status?]","No","M4 owner","No expiry; member withdraws","Requests stay open forever and block a second request to the same partner."),
 ("OQ-04-15","[NEEDS CLARIFICATION: Value sets of PROJECT.stage, LOCATION.intake_status, LOCATION_IMAGE.status, consultation topic, the 12 service groups and scene types.]","Yes","Module owners + VFDA","Values used in the seed are proposals, listed in data/seed/README.md","Code and seed invent their own values; screens and filters disagree.",
  "Resolved 30/09/2026 — declared in §5.1: M0 FR-002 (stage), M3 FR-002 (intake_status, scene_types), M3 FR-003 / M10 FR-002 (image status — see Type conflicts), M7 FR-005 (topic), M4 FR-001 (service groups), M3 FR-007 (region), M2 FR-001/002 (rule topic)."),
 ("OQ-04-16","[NEEDS CLARIFICATION: Drop derivable columns (PROVINCE_NOTICE.province_id, LEGAL_RULE.is_active, BILINGUAL_DOCUMENT.watermark)?]","No","M7, M2, M5 owners","Kept as declared","Two sources of the same truth can disagree.",
  "Resolved 01/10/2026 — watermark dropped; is_active kept with CHECK `ck_legal_rule_active_matches_status`; province_id kept as the province the notice was addressed to (M7 §6.1). See Structural findings, minimality."),
 ("OQ-04-17","[NEEDS CLARIFICATION: Declare identifiers for EMAIL_DELIVERY and SEGMENT_DECISION (none in the spec; LOCATION_QUERY now has query_id, M3 FR-011).]","No","SYS, M1 owners","Placeholder keys *_id (type not declared)","Rows cannot be referenced from logs or support tickets.",
  "Resolved 01/10/2026 — email_delivery_id UUID (SYS §6.1) and segment_decision_id UUID (M1 §6.1)."),
 ("OQ-04-18","[NEEDS CLARIFICATION: Types for all columns marked *type not declared* (62 columns on 30/09/2026).]","Yes","Module owners","Seed uses text; generic diagram type string","The build agent will choose types itself.",
  "Resolved 01/10/2026 — every one is declared in section 6.1 of its module's Spec Document; no column is left without a type."),
 ("OQ-04-19","[NEEDS CLARIFICATION: The location data-entry template has \"18 fields\" (M3 FR-002) but the I/O contract lists 17. Which field is missing?]","No","M3 owner","17 as listed","One template field has nowhere to be stored."),
 ("OQ-04-20","[NEEDS CLARIFICATION: Where is the submitted version of a partner's content kept while the last approved version stays public (M10 BR-001)?]","Yes","M10 + M4 owners","Not modelled; MODERATION_ITEM holds only the reference and the decision","Approving has nothing to publish, or the waiting text overwrites the public one."),
 ("OQ-04-21","[NEEDS CLARIFICATION: Add a creation time to PROJECT and LOCATION_QUERY so the demand index can be filtered by period (M10 FR-003, FR-005)?]","No","M0, M3, M10 owners","Not modelled; seed rows carry no creation time","Indicators cannot be computed for a month, quarter or year."),
 ("OQ-04-22","[NEEDS CLARIFICATION: Which function lets a partner submit a location photo for moderation? F-M3-03 is for VFDA staff only.]","No","M3 + M10 owners","Seed has partner photos as if submitted; no function is mapped","The `location_image` content type has no source."),
 ("OQ-04-23","[NEEDS CLARIFICATION: Which function sets LEGAL_RULE.status = retired (M2 BR-008)?]","No","M2 owner (VFDA Legal)","Treated as an edit through F-M2-02","Retiring a rule has no permission check or audit action of its own."),
 ("OQ-04-24","[NEEDS CLARIFICATION: Since each rule version keeps its text (M2 BR-008), key LEGAL_RULE by rule_code + rule_version and point findings at that pair?]","Yes","M2 owner","Not changed: rule_code stays unique; one text per rule in the seed","An edited rule overwrites the text old findings must keep showing."),
 ("OQ-04-25","[NEEDS CLARIFICATION: AUDIT_LOG.target_id is a UUID; how are actions on rows keyed by text (image_url, rule_version, doc_code) recorded?]","No","M10 owner","Seed logs only actions whose target has a UUID key","Some admin actions cannot name their target, which M10 US-4 requires."),
]

# ---------------------------------------------------------------- S6 review
# Seed figures quoted in 05 (from the last run of data/seed/generate_seed.py and check_seed.py; see seed/README.md)
SEED_ROWS = 427
SEED_SCENARIOS = "34 acceptance scenarios: **29 runnable, 4 partly, 1 not runnable** (M2 US-5: rule ↔ segment is not modelled)."
RUBRIC = [
 ("1. Completeness","Pass",
  "Every FIELDS output that must be remembered has a column. The two that do not — SYS FR-010 `search_vector TSVECTOR` and FR-011 `embedding VECTOR(n)` — are search indexes over LOCATION and ORGANISATION_MEMBER_LAYER text that the database computes from existing columns; they belong to the physical design (indexes), which the process leaves to the Plan step (*never skip a level*). Runtime-only outputs (SYS FR-004 `access_granted`, M1 FR-003 `data_retained`, M4 FR-007 `similarity`) and Supabase Auth data (SYS FR-002 `session_token`, SYS §5.2 BR-004) are not stored by design. *Fixed 01/10/2026: was Fail — the two index columns were reported missing.*",
  "At the Plan step, create the two indexes on LOCATION and ORGANISATION_MEMBER_LAYER (`n` stays [NEEDS CLARIFICATION], SYS §10)."),
 ("2. Correctness","Pass",
  f"All {len(R)} relationships match the wording of their cited evidence, e.g. *\"a notice ... is drafted\"* when the interest is saved (M7 §3 US-1) → 1:1. *Fixed 01/10/2026: was Fail — PRODUCER_ORGANISATION – PROFILE said every profile works for exactly one organisation; it is now zero-or-one on both sides (SYS §6.1, SYS BR-002), in 03 and 04 together; the seed's 7 staff and partner profiles have none.*",
  "—"),
 ("3. Minimality","Pass",
  "No column duplicates another without a written reason. BILINGUAL_DOCUMENT.watermark (*always true*, M5 FR-005) is dropped; LEGAL_RULE.is_active and PROVINCE_NOTICE.province_id are kept as deliberate exceptions, each with its upkeep rule (Structural findings, minimality). The five *derived* entities (including M10's DEMAND_INDEX) stay out of the tables. *Fixed 01/10/2026: was Fail — three derivable columns had no decision.*",
  "—"),
 ("4. Readability","Pass",
  f"The full conceptual ERD ({len(C)} entities, {len(R)} relationships) stays the single source in 03; each module now has its own readable view with attributes in `data/data-model-<MODULE>.md` §5, and one picture per module in `docs/word/data/erd-views/`. Every relationship also reads as a forward and reverse sentence. *Fixed 01/10/2026: was Fail — only the one large diagram existed.*",
  "—"),
 ("5. Extensibility","Pass",
  "Business case tested: **M6 entry logistics — temporary import of filming equipment** (Won't now, phase 2, docs/prd.md §4.4). It adds new entities hanging off PROJECT (an equipment list and a customs declaration) and new DOCUMENT_TYPE rows with basis `law` or `common`; no existing table or relationship changes.",
  "—"),
 ("6. Integration","Pass",
  "BOUNDARY: passwords and tokens stay in Supabase Auth (SYS BR-004) — USER_ACCOUNT has no password column ✓; Resend's `provider_message_id` is kept ✓; documents are stored by path (`file_path TEXT`, M5 §6.1), not as bytes ✓. SCREENS now use the logical names of 04 (`document_slot.state`, `collab_request.status = confirmed`, `organisation.org_name` …). *Fixed 01/10/2026: was Fail — SC-25, SC-27, SC-19 and 18 other Screen Specs named columns differently from FIELDS.*",
  "—"),
 ("7. Traceability","Pass",
  f"All {N_COLS} columns cite a FIELDS row, a §6 attribute or a §6.1 declaration, and every column has a declared type ({N_ND} *type not declared*). *Fixed 01/10/2026: was Fail — 2 identifiers were undeclared and 62 columns had no type; both are now declared in the owning specs' §6.1.*",
  "—"),
]
CHALLENGE = ("5. Extensibility",
 "We challenge our own Pass. Test a second case the specs already hint at: **a co-production with two producer "
 "organisations** (M1 §5.1 FR-002 offers `q3_producer = coproduction`; M1 §10 asks whether it is segment A or B). "
 "PROJECT belongs to exactly one PRODUCER_ORGANISATION, and PROJECT_MEMBER links people, not companies — so a "
 "co-production needs a new associative entity between PROJECT and PRODUCER_ORGANISATION and a change to the RLS of every "
 "project-owned table. That is a structural change. Verdict after challenge: **Pass for M6, Fail for co-production**; "
 "the co-production question is added to M1 §10 as blocking before any project table is built.")
