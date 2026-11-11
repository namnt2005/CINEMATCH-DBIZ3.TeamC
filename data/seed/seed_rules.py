# -*- coding: utf-8 -*-
"""Integrity and business-rule checks shared by generate_seed.py (run BEFORE any file is written)
and check_seed.py (run on the files). One function: validate(S, T) -> list of problems.

S = schema.json (tables, keys, enums, load order); T = {ENTITY: [row dict with string values]}.
Each check names the rule it enforces, so a failure points straight back to the Spec Document."""
import json, re
from datetime import date

# Req at the function but optional in storage — 04-data-model.md, "Type conflicts"
STORAGE_OPTIONAL = {("LEGAL_RULE", "approved_by"), ("LEGAL_RULE", "citation"), ("BILINGUAL_PARAGRAPH", "reviewed_by"),
                    ("PROVINCE_NOTICE", "reviewed_by"), ("PROVINCE_NOTICE", "response"), ("CONSULTATION_BOOKING", "officer_id"),
                    ("QUARTERLY_REPORT", "reread_by")}
# declared enum values deliberately absent from the seed, with the reason
UNUSED_ENUM_VALUES = {
    ("USER_ACCOUNT", "role", "guest"): "a guest is a visitor without an account; a new account is always member (SYS BR-002)",
    ("MODERATION_ITEM", "content_type", "showcase"): "showcase moderation waits for M8, phase 2 (M10 §9)",
    # M7 BR-001 (06/11/2026): the crew downloads and sends the letter; kept for the day VFDA may send itself
    ("PROVINCE_NOTICE", "delivery_status", "sent"): "used when VFDA is allowed to send notices itself (M7 BR-001, Clarifications Q1)",
    ("PROVINCE_NOTICE", "delivery_status", "bounced"): "used when VFDA is allowed to send notices itself (M7 BR-001, Clarifications Q1)",
}
# M2 §9 test values for M2 BR-004 (attention level from verified findings)
def attention_level(severities):
    action = sum(1 for s in severities if s == "action")
    notice = sum(1 for s in severities if s == "notice")
    if action >= 2: return "high"
    if action == 1 or notice >= 3: return "medium"
    return "low"
STAFF_ROLES = {"vfda_staff", "vfda_legal", "admin", "partner"}


def readiness(T, project_id):
    """M0 §9 test values (TL5 formulas adapted to stored data): returns (gauges, overall) for one project."""
    seg = next(r["segment"] for r in T["PROJECT"] if r["project_id"] == project_id)
    active = max(r["rule_version"] for r in T["RULE_SET_VERSION"])
    runs = sorted((r for r in T["COMPLIANCE_RUN"] if r["project_id"] == project_id), key=lambda r: r["run_at"])
    if runs:
        last = runs[-1]
        fs = [f for f in T["COMPLIANCE_FINDING"] if f["run_id"] == last["run_id"]]
        share = (sum(1 for f in fs if f["finding_status"] == "reviewed") / len(fs)) if fs else 1.0
        content = 30 + (30 if last["rule_version"] == active else 0) + 40 * share
    else:
        content = 0.0
    sl = [r for r in T["PROJECT_SHORTLIST"] if r["project_id"] == project_id]
    locations = (50 + (25 if any(r["role"] == "primary" for r in sl) else 0) + (25 if any(r["role"] == "backup" for r in sl) else 0)) if sl else 0
    st = {r["status"] for r in T["COLLAB_REQUEST"] if r["project_id"] == project_id}
    partners = 100 if "confirmed" in st else 70 if "accepted" in st else 30 if st else 0
    g = {"content": content, "locations": locations, "partners": partners}
    if seg != "C":
        a13 = [r for r in T["DOCUMENT_SLOT"] if r["project_id"] == project_id and r["doc_code"].startswith("A13_")]
        g["dossier"] = 100 * sum(1 for r in a13 if r["state"] == "present") / 4
    # M0 §3 edge case (decision H1): a gauge whose module has not reported is left out of the overall score
    off = {r["gauge"] for r in T.get("READINESS_SOURCE", []) if r["reporting"] != "true"}
    counted = [v for k, v in g.items() if k not in off]
    return g, (round(sum(counted) / len(counted), 2) if counted else 0.0)


def _months_later(d, months):
    y, m = divmod(d.month - 1 + months, 12)
    return date(d.year + y, m + 1, d.day)


def validate(S, T):
    err = []
    # ---------------------------------------------------------------- structure
    for e, m in S.items():
        rows, cols = T[e], m["columns"]
        if not rows: err.append(f"{e}: no row (every table carries data)")
        if rows and list(rows[0].keys()) != cols: err.append(f"{e}: column order differs from the logical model")
        keys = [tuple(r[c] for c in m["pk"]) for r in rows]
        if len(keys) != len(set(keys)): err.append(f"{e}: duplicate primary key")
        for r in rows:
            for c in m["required"]:
                if r[c] == "" and (e, c) not in STORAGE_OPTIONAL: err.append(f"{e}.{c}: required value empty ({r[m['pk'][0]]})")
            for c, vals in m["enums"].items():
                if r[c] and r[c] not in vals: err.append(f"{e}.{c}: '{r[c]}' not in {vals}")
            for c, vals in m.get("array_enums", {}).items():
                try:
                    items = json.loads(r[c]) if r[c] else []
                except ValueError:
                    err.append(f"{e}.{c}: '{r[c]}' is not a JSON array"); continue
                for v in items:
                    if v not in vals: err.append(f"{e}.{c}: '{v}' not in {vals}")
        for c, vals in list(m["enums"].items()) + list(m.get("array_enums", {}).items()):
            used = set()
            for r in rows:
                if c in m.get("array_enums", {}):
                    try: used |= set(json.loads(r[c])) if r[c] else set()
                    except ValueError: pass
                else: used.add(r[c])
            for v in vals:
                if v not in used and (e, c, v) not in UNUSED_ENUM_VALUES: err.append(f"{e}.{c}: declared value '{v}' used by no row")
        # foreign keys, grouped by target
        by_target = {}
        for fk in m["fk"]: by_target.setdefault(fk["references"], []).append(fk)
        for tgt, fks in by_target.items():
            tpk = S[tgt]["pk"]
            if len(tpk) > 1:
                groups = [([f["column"] for f in fks], tpk)]
            else:
                groups = [([f["column"]], [f["ref_column"] or tpk[0]]) for f in fks]
            for g, tcols in groups:
                existing = {tuple(r[c] for c in tcols) for r in T[tgt]}
                for r in rows:
                    vals = tuple(r[c] for c in g)
                    if all(v == "" for v in vals): continue
                    if vals not in existing: err.append(f"{e}.{'+'.join(g)} = {vals} not found in {tgt}")
                # load order: a parent file loads before its children (G3: seed loads in filename order)
                if S[tgt]["load_order"] > m["load_order"] and tgt != e:
                    err.append(f"{m['file']} loads before its parent {S[tgt]['file']}")

    # ---------------------------------------------------------------- time order
    def order(e, cols):
        for r in T[e]:
            seq = [r[c] for c in cols if r[c]]
            if seq != sorted(seq): err.append(f"{e}: timestamps out of order {cols} in {r[S[e]['pk'][0]]}")
    order("COLLAB_REQUEST", ["sent_at", "responded_at", "confirmed_at"])
    order("PROVINCE_NOTICE", ["drafted_at", "sent_at", "received_at", "responded_at"])
    order("NOTIFICATION", ["created_at", "read_at"])
    order("MODERATION_ITEM", ["submitted_at", "decided_at"])
    for r in T["PUBLIC_HOLIDAY"]:
        if r["end_date"] < r["start_date"]: err.append(f"PUBLIC_HOLIDAY {r['name']}: ends before it starts")
    users = {r["user_id"]: r for r in T["USER_ACCOUNT"]}
    for r in T["CONSENT"]:
        if r["accepted_at"] < users[r["user_id"]]["created_at"]: err.append("CONSENT accepted before the account existed")
    for r in T["AUDIT_LOG"]:
        if r["logged_at"] < users[r["admin_id"]]["created_at"]: err.append(f"AUDIT_LOG {r['action']} logged before its admin's account existed")

    # ---------------------------------------------------------------- business rules, recomputed
    profiles = {r["user_id"]: r for r in T["PROFILE"]}
    # SYS BR-002: staff, Legal Board, admin and partner accounts are not created through sign-up -> no producer organisation
    for uid, u in users.items():
        has_org = profiles[uid]["producer_org_id"] != ""
        if u["role"] in STAFF_ROLES and has_org: err.append(f"PROFILE {uid}: role {u['role']} has a producer organisation (SYS BR-002)")
        if u["role"] == "member" and not has_org: err.append(f"PROFILE {uid}: member without a producer organisation (SYS FR-001)")
    # SYS BR-005: never hard-deleted; a deactivated account is anonymised
    for u in users.values():
        if u["account_status"] == "deactivated" and not (u["email"].endswith("@anonymised.example") and profiles[u["user_id"]]["full_name"] == "Former member"):
            err.append(f"USER_ACCOUNT {u['user_id']}: deactivated but not anonymised (SYS BR-005)")
    # M1 BR-001 / BR-003: decided by the rule unless overridden; one owner (project or anonymous session)
    rules = {r["segment_rule_id"]: r for r in T["SEGMENT_RULE"]}
    for r in T["SEGMENT_DECISION"]:
        if (r["project_id"] == "") == (r["session_key"] == ""):
            err.append(f"SEGMENT_DECISION {r['segment_decision_id']}: exactly one of project_id / session_key must be set")
        if r["segment_override"]:
            if r["segment"] != r["segment_override"]: err.append(f"SEGMENT_DECISION {r['segment_decision_id']}: segment differs from the override (M1 BR-003)")
        elif r["segment_rule_id"]:
            if r["segment"] != rules[r["segment_rule_id"]]["result_segment"]:
                err.append(f"SEGMENT_DECISION {r['segment_decision_id']}: segment differs from its rule (M1 BR-001)")
    # M0 BR-002: segment C has no Article 13 dossier
    seg = {r["project_id"]: r["segment"] for r in T["PROJECT"]}
    for r in T["DOCUMENT_SLOT"]:
        if seg[r["project_id"]] == "C" and r["doc_code"].startswith("A13_"):
            err.append(f"DOCUMENT_SLOT {r['doc_code']}: Article 13 slot on a segment C project (M0 BR-002)")
    # M0 FR-001 (plan D2 of specs/005-m0-workspace): exactly one owner per project, accepted, with an account
    for pid in seg:
        owners = [m for m in T["PROJECT_MEMBER"] if m["project_id"] == pid and m["permission"] == "owner"]
        if len(owners) != 1 or owners[0]["invite_status"] != "accepted" or not owners[0]["user_id"]:
            err.append(f"PROJECT {pid}: needs exactly one accepted owner with an account (M0 FR-001)")
    # M0 BR-002/BR-004 (plan D1): A and B show five gauges, C four (no dossier); Logistics is never counted
    gauges = {}
    for r in T["SEGMENT_REQUIREMENT"]:
        if r["requirement_code"].startswith("GAUGE_"): gauges.setdefault(r["segment"], {})[r["requirement_code"]] = r["needed"]
    for s_, want in (("A", 5), ("B", 5), ("C", 4)):
        g = gauges.get(s_, {})
        if len(g) != want or g.get("GAUGE_LOGISTICS") != "false" or ("GAUGE_DOSSIER" in g) != (s_ != "C"):
            err.append(f"SEGMENT_REQUIREMENT {s_}: gauge rows do not match M0 BR-002")
    # M0 BR-001/BR-004 with the M0 §9 test values: the latest snapshot of a project equals the readiness formula
    latest = {}
    for r in T["READINESS_SNAPSHOT"]:
        if r["project_id"] not in latest or r["snapshot_date"] > latest[r["project_id"]]["snapshot_date"]: latest[r["project_id"]] = r
    for pid, r in latest.items():
        want = readiness(T, pid)[1]
        if abs(float(r["readiness_total"]) - want) > 0.005:
            err.append(f"READINESS_SNAPSHOT {r['snapshot_date']}: {r['readiness_total']} but the formula gives {want:.2f} (M0 §9)")
    # M7 BR-001 / D1 (specs/006-m7-support): review before download; one notice per province per project (spec-M7 §9)
    interest = {r["interest_id"]: r for r in T["LOCATION_INTEREST"]}
    per_province = {}
    for r in T["PROVINCE_NOTICE"]:
        tag = f"PROVINCE_NOTICE {r['interest_id']}"
        if r["review_status"] == "approved" and not r["reviewed_by"]: err.append(f"{tag}: approved without a reviewer (M7 BR-001)")
        if r["delivery_status"] == "downloaded" and (r["review_status"] != "approved" or not r["sent_at"]):
            err.append(f"{tag}: downloaded but not approved, or no sent_at (M7 BR-001)")
        if r["review_status"] == "changes_requested" and not r["review_note"]: err.append(f"{tag}: changes requested without a note")
        if r["response"] and r["delivery_status"] != "downloaded": err.append(f"{tag}: a reply on a notice that was not downloaded (M7 BR-003)")
        key = (interest[r["interest_id"]]["project_id"], r["province_id"])
        per_province[key] = per_province.get(key, 0) + 1
    for key, n in per_province.items():
        if n > 1: err.append(f"PROVINCE_NOTICE: {n} notices for project {key[0]} in province {key[1]} (spec-M7 §9, one per province)")
    # M7 BR-005 / D2: 1–3 preferred times, the first is slot_start
    for r in T["CONSULTATION_BOOKING"]:
        times = json.loads(r["preferred_times"] or "[]")
        if not 1 <= len(times) <= 3 or times[0] != r["slot_start"]:
            err.append(f"CONSULTATION_BOOKING {r['booking_id']}: preferred_times must hold 1–3 times, the first equal to slot_start (M7 BR-005)")
    # M2 BR-002 + upkeep rule of LEGAL_RULE.is_active
    for r in T["LEGAL_RULE"]:
        if r["status"] == "approved" and not (r["citation"] and r["approved_by"]):
            err.append(f"LEGAL_RULE {r['rule_code']}: approved without citation and approver (M2 BR-002)")
        if (r["is_active"] == "true") != (r["status"] == "approved"):
            err.append(f"LEGAL_RULE {r['rule_code']}: is_active does not match status (upkeep rule, 04 minimality)")
    # M2 BR-004: attention level recomputed from the verified findings; M2 §6.1: span = length of the quote
    # M2 Q13 (plan D2): one approved revision per code; retired ⇔ retired_version; segments; keywords
    approved = {}
    for r in T["LEGAL_RULE"]:
        if r["status"] == "approved": approved[r["rule_code"]] = approved.get(r["rule_code"], 0) + 1
        if (r["status"] == "retired") != bool(r["retired_version"]):
            err.append(f"LEGAL_RULE {r['rule_code']} r{r['revision']}: retired_version must be set exactly when retired (M2 Q13)")
        seg = json.loads(r["segments"] or "[]")
        if not seg or len(set(seg)) != len(seg) or any(x not in ("A", "B", "C") for x in seg):
            err.append(f"LEGAL_RULE {r['rule_code']}: segments {seg} (M2 Q10)")
        for k in ("keywords_vi", "keywords_en"):
            kw = json.loads(r[k] or "[]")
            if len(kw) > 30 or any(not isinstance(w, str) or not 1 <= len(w) <= 60 for w in kw):
                err.append(f"LEGAL_RULE {r['rule_code']}: {k} (M2 plan D4)")
    for code, n in approved.items():
        if n > 1: err.append(f"LEGAL_RULE {code}: {n} approved revisions (M2 Q13)")
    rules = {r["rule_id"]: r for r in T["LEGAL_RULE"]}
    def in_force(rule_id, version):   # M2 BR-001, BR-007: the cited revision was signed in or before the run's version
        r = rules.get(rule_id)
        return bool(r and r["rule_version"] and r["rule_version"] <= version and (not r["retired_version"] or r["retired_version"] > version))
    runs = {r["brief_id"]: r for r in T["PRECHECK_RUN"]}
    cruns = {r["run_id"]: r for r in T["COMPLIANCE_RUN"]}
    by_run = {}
    for f in T["PRECHECK_FINDING"]:
        by_run.setdefault(f["brief_id"], []).append(rules[f["rule_id"]]["severity"])
        if not 0 <= int(f["span_start"]) < int(f["span_end"]):
            err.append(f"PRECHECK_FINDING {f['brief_id']}: span {f['span_start']}–{f['span_end']} (M2 §6.1)")
        if not in_force(f["rule_id"], runs[f["brief_id"]]["rule_version"]):
            err.append(f"PRECHECK_FINDING {f['brief_id']}: cites a revision not in force in its version (M2 BR-001, BR-007)")
    for f in T["COMPLIANCE_FINDING"]:
        if not in_force(f["rule_id"], cruns[f["run_id"]]["rule_version"]):
            err.append(f"COMPLIANCE_FINDING {f['finding_id']}: cites a revision not in force in its version (M2 BR-001, BR-007)")
    for r in T["PRECHECK_RUN"]:
        # M2 FR-012 (decided 08/11/2026): dropped findings counted on the run, their codes kept without text
        codes = json.loads(r["dropped_rule_codes"] or "[]")
        n = int(r["dropped_count"] or 0)
        if (n == 0) != (codes == []) or len(codes) > n or len(set(codes)) != len(codes):
            err.append(f"PRECHECK_RUN {r['brief_id']}: dropped_count {n} does not match dropped_rule_codes {codes} (M2 FR-012)")
        if r["attention_level"] == "" and n == 0:
            err.append(f"PRECHECK_RUN {r['brief_id']}: no attention level but nothing was dropped (M2 FR-012)")
        if r["attention_level"] == "":   # every finding was dropped by FR-012: no level is shown
            if r["brief_id"] in by_run: err.append(f"PRECHECK_RUN {r['brief_id']}: findings but no attention level")
            continue
        want = attention_level(by_run.get(r["brief_id"], []))
        if r["attention_level"] != want:
            err.append(f"PRECHECK_RUN {r['brief_id']}: attention level {r['attention_level']}, rule gives {want} (M2 BR-004)")
    # M3 BR-004, BR-008: published only with a verified contact; published agrees with intake_status
    contact = {r["location_id"]: r for r in T["AUTHORITY_CONTACT"]}
    for r in T["LOCATION"]:
        if (r["published"] == "true") != (r["intake_status"] == "published"):
            err.append(f"LOCATION {r['slug']}: published = {r['published']} but intake_status = {r['intake_status']}")
        if r["published"] == "true" and contact.get(r["location_id"], {}).get("contact_verified") != "true":
            err.append(f"LOCATION {r['slug']} published without a verified contact (M3 BR-004)")
    unpublished = {r["location_id"] for r in T["LOCATION"] if r["intake_status"] == "unpublished"}
    if not any(r["location_id"] in unpublished for r in T["PROJECT_SHORTLIST"]):
        err.append("no unpublished location is kept in a shortlist (M3 BR-008)")
    # M4 BR-004: badge valid 12 months
    for r in T["ORGANISATION"]:
        if r["verified_at"]:
            want = _months_later(date.fromisoformat(r["verified_at"][:10]), 12).isoformat()
            if r["verified_until"] != want: err.append(f"ORGANISATION {r['org_name']}: verified_until {r['verified_until']} ≠ verified_at + 12 months (M4 BR-004)")
    # M4 BR-005: only a confirmed request carries confirmed_at; confirmation follows a response
    for r in T["COLLAB_REQUEST"]:
        if (r["status"] == "confirmed") != (r["confirmed_at"] != ""):
            err.append(f"COLLAB_REQUEST {r['request_id']}: confirmed_at and status disagree (M4 BR-005)")
        if r["status"] in ("accepted", "confirmed", "declined", "info_requested") and not r["responded_at"]:
            err.append(f"COLLAB_REQUEST {r['request_id']}: {r['status']} without a response time (M4 BR-005)")
    # M4 BR-003 / SYS BR-002 (specs/007-m4-partners D1, D2): a partner acts for an organisation only through an accepted invitation
    roles = {r["user_id"]: r for r in T["USER_ACCOUNT"]}
    links = {(r["org_id"], r["user_id"]) for r in T.get("ORGANISATION_USER", [])}
    for org_id, user_id in links:
        if roles.get(user_id, {}).get("role") != "partner":
            err.append(f"ORGANISATION_USER {user_id}: not a partner account (D1)")
    for u in T["USER_ACCOUNT"]:
        if u["role"] == "partner" and not any(l[1] == u["user_id"] for l in links):
            err.append(f"USER_ACCOUNT {u['email']}: partner acting for no organisation (D1)")
    hashes = [r["code_hash"] for r in T.get("PARTNER_INVITATION", [])]
    if len(hashes) != len(set(hashes)): err.append("PARTNER_INVITATION: duplicate code_hash (D2)")
    grants = {(r["admin_id"], r["target_id"]) for r in T["AUDIT_LOG"] if r["action"] == "role.grant"}
    for r in T.get("PARTNER_INVITATION", []):
        if not re.fullmatch(r"[0-9a-f]{64}", r["code_hash"]): err.append(f"PARTNER_INVITATION {r['email']}: code_hash is not a SHA-256 (D2)")
        if r["expires_at"] <= r["invited_at"]: err.append(f"PARTNER_INVITATION {r['email']}: expires before it is sent (D2)")
        if roles.get(r["invited_by"], {}).get("role") not in ("vfda_staff", "admin"):
            err.append(f"PARTNER_INVITATION {r['email']}: invited by a role that may not invite (SYS BR-002)")
        if (r["accepted_at"] == "") != (r["accepted_by"] == ""):
            err.append(f"PARTNER_INVITATION {r['email']}: accepted_at and accepted_by disagree (D2)")
        if r["accepted_by"]:
            if roles.get(r["accepted_by"], {}).get("email") != r["email"]:
                err.append(f"PARTNER_INVITATION {r['email']}: accepted by another address (D2)")
            if (r["org_id"], r["accepted_by"]) not in links:
                err.append(f"PARTNER_INVITATION {r['email']}: accepted but no ORGANISATION_USER row (D1)")
            if (r["invited_by"], r["accepted_by"]) not in grants:
                err.append(f"PARTNER_INVITATION {r['email']}: no role.grant audit row by its inviter (SYS BR-002)")
    # M4 FR-010 (D6): verification requests carry when they were submitted and decided
    latest = {}
    for r in T["VERIFICATION_REQUEST"]:
        if (r["status"] == "pending") != (r["decided_at"] == ""):
            err.append(f"VERIFICATION_REQUEST {r['request_id']}: decided_at and status disagree (D6)")
        if r["decided_at"] and r["decided_at"] <= r["submitted_at"]:
            err.append(f"VERIFICATION_REQUEST {r['request_id']}: decided before it was submitted (D6)")
        if r["status"] == "approved" and r["decided_at"] > latest.get(r["org_id"], ""):
            latest[r["org_id"]] = r["decided_at"]
    for r in T["ORGANISATION"]:
        if r["org_id"] in latest and r["verified_at"] != latest[r["org_id"]]:
            err.append(f"ORGANISATION {r['org_name']}: verified_at is not the latest approval (D6)")
    # M4 BR-008: no request stays open with a deactivated organisation
    gone = {r["org_id"] for r in T["ORGANISATION"] if r["org_status"] == "deactivated"}
    for r in T["COLLAB_REQUEST"]:
        if r["org_id"] in gone and r["status"] not in ("declined", "confirmed", "withdrawn"):
            err.append(f"COLLAB_REQUEST {r['request_id']}: still open with a deactivated organisation (M4 BR-008)")
    # M4 BR-006: Article 13 component c is present only with an uploaded agreement
    docs = {(r["project_id"], r["doc_code"]) for r in T["DOCUMENT"]}
    for r in T["DOCUMENT_SLOT"]:
        if r["state"] == "present" and (r["project_id"], r["doc_code"]) not in docs:
            err.append(f"DOCUMENT_SLOT {r['doc_code']}: present without an uploaded document (M4 BR-006, M5 FR-003)")
    # M5 BR-002: component b present only when every paragraph is proofread by a person
    paras = {}
    for p in T["BILINGUAL_PARAGRAPH"]:
        paras.setdefault((p["project_id"], p["doc_code"]), []).append(p)
    for r in T["DOCUMENT_SLOT"]:
        ps = paras.get((r["project_id"], r["doc_code"]))
        if ps and r["state"] == "present" and any(p["status"] != "reviewed" for p in ps):
            err.append(f"DOCUMENT_SLOT {r['doc_code']}: present while a paragraph is not proofread (M5 BR-002)")
    # M5 §9 test value behind M4's NDA gate (specs/009-m5-dossier D4): a partner proofreads only with an accepted or
    # confirmed request for that project and both NDA rows accepted
    req = {(r["project_id"], r["org_id"]): r for r in T["COLLAB_REQUEST"]}
    nda = {(n["request_id"], n["party"]) for n in T.get("NDA_ACCEPTANCE", []) if n["accepted"] == "true"}
    for p in T["BILINGUAL_PARAGRAPH"]:
        if p["status"] == "reviewed" and p["reviewer_org_id"]:
            r = req.get((p["project_id"], p["reviewer_org_id"]))
            if not r or r["status"] not in ("accepted", "confirmed") or not {(r["request_id"], "producer"), (r["request_id"], "partner")} <= nda:
                err.append(f"BILINGUAL_PARAGRAPH {p['idx']}: proofread by a partner without an accepted request and both NDA rows (M5 §9, D4)")
    # M5 BR-004, D1: the kit configuration agrees with segment_requirement; location documents come from location links
    needed = {}
    for r in T["SEGMENT_REQUIREMENT"]:
        if r["needed"] == "true":
            needed.setdefault(r["requirement_code"], set()).add(r["segment"])
    basis = {t["doc_code"]: t["basis"] for t in T["DOCUMENT_TYPE"]}
    for t in T["DOCUMENT_TYPE"]:
        segs = set(json.loads(t["segments"]))
        if t["requirement_code"]:
            if t["basis"] == "location":
                err.append(f"DOCUMENT_TYPE {t['doc_code']}: a location document with a requirement code (D1)")
            if segs != needed.get(t["requirement_code"], set()):
                err.append(f"DOCUMENT_TYPE {t['doc_code']}: segments differ from where {t['requirement_code']} is needed (D1)")
        if (t["awaiting_confirmation"] == "true") != ("C" in segs):
            err.append(f"DOCUMENT_TYPE {t['doc_code']}: awaiting_confirmation must mark the segment C items (M5 Q1)")
    for l in T.get("LOCATION_DOCUMENT_TYPE", []):
        if basis.get(l["doc_code"]) != "location":
            err.append(f"LOCATION_DOCUMENT_TYPE {l['doc_code']}: not a location-specific document (D1)")
        if p["status"] == "reviewed" and not p["reviewed_by"]:
            err.append(f"BILINGUAL_PARAGRAPH {p['idx']}: reviewed without a reviewer (M5 FR-006)")
    # M10 BR-001/BR-002 modelling: exactly one target; hidden needs a reason
    for r in T["MODERATION_ITEM"]:
        refs = [c for c in ("organisation_id", "location_image_id") if r[c]]
        want = {"org_profile": ["organisation_id"], "location_image": ["location_image_id"]}.get(r["content_type"])
        if len(refs) != 1 or (want and refs != want):
            err.append(f"MODERATION_ITEM {r['content_id']}: needs exactly one reference matching {r['content_type']}")
        if r["content_status"] == "hidden" and not r["reason"]: err.append(f"MODERATION_ITEM {r['content_id']}: hidden without a reason (M10 BR-002)")
    # M10 BR-003: below 5 records an indicator shows no value; BR-004: no export before a reread
    for r in T["QUARTERLY_REPORT"]:
        for ind in json.loads(r["demand_index"]):
            if ind["sample_size"] < 5 and ind.get("value") is not None:
                err.append(f"QUARTERLY_REPORT indicator {ind['indicator']}: value shown from {ind['sample_size']} records (M10 BR-003)")
            if ind["sample_size"] >= 5 and ind.get("value") is None:
                err.append(f"QUARTERLY_REPORT indicator {ind['indicator']}: no value although {ind['sample_size']} records exist (M10 BR-003)")
        if r["exported_at"] and not r["reread_by"]: err.append("QUARTERLY_REPORT exported before a reread (M10 BR-004)")
    # privacy (G4): only the clearly fake phone pattern, each used once; e-mail domains are example domains
    phones = []
    for e in S:
        for r in T[e]:
            for v in r.values():
                for ph in re.findall(r"\+\d[\d ]{6,}\d", v):
                    phones.append(ph)
                    if not re.fullmatch(r"\+84 000 000 1\d\d", ph): err.append(f"{e}: phone number '{ph}' is not of the fake form +84 000 000 1xx")
                for em in re.findall(r"[\w.+-]+@[\w.-]+", v):
                    if ".example" not in em.split("@")[1] and not em.split("@")[1].startswith("example"):
                        err.append(f"{e}: e-mail '{em}' is not on an example domain")
    if len(phones) != len(set(phones)): err.append("a fake phone number is used twice")
    return err
