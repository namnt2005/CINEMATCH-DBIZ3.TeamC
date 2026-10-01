# -*- coding: utf-8 -*-
"""Integrity check for data/seed/*.csv (Session 5 human gate: run it, do not verify by eye).
    python3 data/seed/check_seed.py
Checks: primary-key uniqueness, every foreign key resolves (composite keys included), Req columns filled,
enum values inside the declared set and every declared value used, timestamps in order, lifecycle states
(nothing is hard-deleted), fake phone numbers only, and that generation is deterministic."""
import csv, hashlib, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(os.path.join(HERE, "schema.json"), encoding="utf-8"))
T = {e: list(csv.DictReader(open(os.path.join(HERE, m["table"] + ".csv"), encoding="utf-8"))) for e, m in S.items()}
err, notes = [], []

# Req at the function but optional in storage — listed in 04-data-model.md, "Type conflicts"
STORAGE_OPTIONAL = {("LEGAL_RULE","approved_by"),("LEGAL_RULE","citation"),("BILINGUAL_PARAGRAPH","reviewed_by"),
                    ("PROVINCE_NOTICE","reviewed_by"),("PROVINCE_NOTICE","response"),("CONSULTATION_BOOKING","officer_id"),
                    ("QUARTERLY_REPORT","reread_by")}
# one column, two meanings — 04-data-model.md, Structural findings / SEGMENT_DECISION
POLYMORPHIC = {("SEGMENT_DECISION","session_or_project_id"): "session:"}
# declared enum values deliberately absent from the seed, with the reason
UNUSED_ENUM_VALUES = {
    ("USER_ACCOUNT","role","guest"): "a guest is a visitor without an account; a new account is always member (SYS BR-002)",
    ("MODERATION_ITEM","content_type","showcase"): "showcase moderation waits for M8, phase 2 (M10 §9)",
}

for e, m in S.items():
    rows, cols = T[e], m["columns"]
    if rows and list(rows[0].keys()) != cols: err.append(f"{e}: column order differs from the logical model")
    keys = [tuple(r[c] for c in m["pk"]) for r in rows]
    if len(keys) != len(set(keys)): err.append(f"{e}: duplicate primary key")
    for r in rows:
        for c in m["required"]:
            if r[c] == "" and (e, c) not in STORAGE_OPTIONAL: err.append(f"{e}.{c}: required value empty ({r[m['pk'][0]]})")
        for c, vals in m["enums"].items():
            if r[c] and r[c] not in vals: err.append(f"{e}.{c}: '{r[c]}' not in {vals}")
        for c, vals in m.get("array_enums", {}).items():
            for v in (json.loads(r[c]) if r[c] else []):
                if v not in vals: err.append(f"{e}.{c}: '{v}' not in {vals}")
    # every declared enum value appears in at least one row, unless its absence is explained above
    for c, vals in list(m["enums"].items()) + list(m.get("array_enums", {}).items()):
        used = set()
        for r in rows:
            used |= set(json.loads(r[c])) if c in m.get("array_enums", {}) and r[c] else {r[c]}
        for v in vals:
            if v not in used and (e, c, v) not in UNUSED_ENUM_VALUES: err.append(f"{e}.{c}: declared value '{v}' used by no row")
    # foreign keys, grouped by target
    by_target = {}
    for fk in m["fk"]: by_target.setdefault(fk["references"], []).append(fk)
    for tgt, fks in by_target.items():
        tpk = S[tgt]["pk"]
        if len(tpk) > 1:   # composite key: FK columns carry the same names as the target's key
            groups = [([f["column"] for f in fks], tpk)]
        else:              # single key, or a unique column referenced by name (e.g. rule_code)
            groups = [([f["column"]], [f["ref_column"] or tpk[0]]) for f in fks]
        for g, tcols in groups:
            existing = {tuple(r[c] for c in tcols) for r in T[tgt]}
            for r in rows:
                vals = tuple(r[c] for c in g)
                if all(v == "" for v in vals): continue
                pref = POLYMORPHIC.get((e, g[0]))
                if pref and vals[0].startswith(pref): continue
                if vals not in existing: err.append(f"{e}.{'+'.join(g)} = {vals} not found in {tgt}")

def order(e, cols):
    for r in T[e]:
        seq = [r[c] for c in cols if r[c]]
        if seq != sorted(seq): err.append(f"{e}: timestamps out of order {cols} in {r[S[e]['pk'][0]]}")
order("COLLAB_REQUEST", ["sent_at","responded_at","confirmed_at"])
order("PROVINCE_NOTICE", ["drafted_at","sent_at","received_at","responded_at"])
order("NOTIFICATION", ["created_at","read_at"])
order("MODERATION_ITEM", ["submitted_at","decided_at"])
for r in T["PUBLIC_HOLIDAY"]:
    if r["end_date"] < r["start_date"]: err.append(f"PUBLIC_HOLIDAY {r['name']}: ends before it starts")
users = {r["user_id"]: r["created_at"] for r in T["USER_ACCOUNT"]}
for r in T["CONSENT"]:
    if r["accepted_at"] < users[r["user_id"]]: err.append("CONSENT accepted before the account existed")
for r in T["AUDIT_LOG"]:
    if r["logged_at"] < users[r["admin_id"]]: err.append(f"AUDIT_LOG {r['action']} logged before its admin's account existed")
# nothing is hard-deleted: every lifecycle end state has a row, and it is consistent (SYS BR-005, M0 BR-005,
# M2 BR-008, M3 BR-008, M4 BR-008)
names = {r["user_id"]: r["full_name"] for r in T["PROFILE"]}
for r in T["USER_ACCOUNT"]:
    if r["account_status"] == "deactivated" and not (r["email"].endswith("@anonymised.example") and names[r["user_id"]] == "Former member"):
        err.append(f"USER_ACCOUNT {r['user_id']}: deactivated but not anonymised (SYS BR-005)")
for r in T["LOCATION"]:
    if (r["published"] == "true") != (r["intake_status"] == "published"):
        err.append(f"LOCATION {r['slug']}: published = {r['published']} but intake_status = {r['intake_status']}")
unpublished = {r["location_id"] for r in T["LOCATION"] if r["intake_status"] == "unpublished"}
if not any(r["location_id"] in unpublished for r in T["PROJECT_SHORTLIST"]):
    err.append("no unpublished location is kept in a shortlist (M3 BR-008)")
gone = {r["org_id"] for r in T["ORGANISATION"] if r["org_status"] == "deactivated"}
for r in T["COLLAB_REQUEST"]:
    if r["org_id"] in gone and r["status"] not in ("declined", "confirmed", "withdrawn"):
        err.append(f"COLLAB_REQUEST {r['request_id']}: still open with a deactivated organisation (M4 BR-008)")
for r in T["LEGAL_RULE"]:
    if r["status"] == "retired" and r["is_active"] == "true": err.append(f"LEGAL_RULE {r['rule_code']}: retired but active")
# MODERATION_ITEM: exactly one of the two references, matching content_type (modelling choice, 04 Structural findings)
for r in T["MODERATION_ITEM"]:
    refs = [c for c in ("organisation_id", "location_image_id") if r[c]]
    want = {"org_profile": ["organisation_id"], "location_image": ["location_image_id"]}.get(r["content_type"])
    if len(refs) != 1 or (want and refs != want):
        err.append(f"MODERATION_ITEM {r['content_id']}: needs exactly one reference matching {r['content_type']}")
    if r["content_status"] == "hidden" and not r["reason"]: err.append(f"MODERATION_ITEM {r['content_id']}: hidden without a reason (M10 BR-002)")
# phone numbers: only the clearly fake pattern, unique per row
phones = []
for e, m in S.items():
    for r in T[e]:
        for v in r.values():
            for ph in re.findall(r"\+\d[\d ]{6,}\d", v):
                phones.append(ph)
                if not re.fullmatch(r"\+84 000 000 1\d\d", ph): err.append(f"{e}: phone number '{ph}' is not of the fake form +84 000 000 1xx")
if len(phones) != len(set(phones)): err.append("a fake phone number is used twice")
for r in T["LOCATION"]:
    if r["published"] == "true":
        c = [a for a in T["AUTHORITY_CONTACT"] if a["location_id"] == r["location_id"]]
        if not c or c[0]["contact_verified"] != "true": err.append(f"LOCATION {r['slug']} published without a verified contact (M3 BR-004)")

# determinism: regenerate and compare hashes
def digest():
    h = hashlib.sha256()
    for m in S.values(): h.update(open(os.path.join(HERE, m["table"] + ".csv"), "rb").read())
    return h.hexdigest()
before = digest()
subprocess.run([sys.executable, os.path.join(HERE, "generate_seed.py")], check=True, capture_output=True)
if digest() != before: err.append("generator is not deterministic: files changed on regeneration")

n = sum(len(v) for v in T.values()); empty = [S[e]["table"] for e in S if not T[e]]
fkn = sum(len(m["fk"]) for m in S.values())
print(f"{len(S)} tables, {n} rows, {fkn} foreign-key columns checked; header-only tables: {', '.join(empty) or 'none'}")
print("exempt (Req in FIELDS, optional in storage):", len(STORAGE_OPTIONAL), "| polymorphic column:", len(POLYMORPHIC),
      "| declared enum values not used:", ", ".join(f"{e}.{c}={v}" for e, c, v in UNUSED_ENUM_VALUES))
if err:
    print(f"FAIL — {len(err)} problem(s)"); [print("  -", x) for x in err]; sys.exit(1)
print("PASS — all foreign keys resolve; required, enum (values and coverage), order, lifecycle, phone and determinism checks pass")
