# -*- coding: utf-8 -*-
"""Integrity check for data/seed/*.csv (Session 5 human gate: run it, do not verify by eye).
    python3 data/seed/check_seed.py
Checks: primary-key uniqueness, every foreign key resolves (composite keys included), Req columns filled,
enum values inside the declared set, timestamps in order, and that generation is deterministic."""
import csv, hashlib, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(os.path.join(HERE, "schema.json"), encoding="utf-8"))
T = {e: list(csv.DictReader(open(os.path.join(HERE, m["table"] + ".csv"), encoding="utf-8"))) for e, m in S.items()}
err, notes = [], []

# Req at the function but optional in storage — listed in 04-data-model.md, "Type conflicts"
STORAGE_OPTIONAL = {("LEGAL_RULE","approved_by"),("LEGAL_RULE","citation"),("BILINGUAL_PARAGRAPH","reviewed_by"),
                    ("PROVINCE_NOTICE","reviewed_by"),("PROVINCE_NOTICE","response"),("CONSULTATION_BOOKING","officer_id")}
# one column, two meanings — 04-data-model.md, Structural findings / SEGMENT_DECISION
POLYMORPHIC = {("SEGMENT_DECISION","session_or_project_id"): "session:"}

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
for r in T["PUBLIC_HOLIDAY"]:
    if r["end_date"] < r["start_date"]: err.append(f"PUBLIC_HOLIDAY {r['name']}: ends before it starts")
users = {r["user_id"]: r["created_at"] for r in T["USER_ACCOUNT"]}
for r in T["CONSENT"]:
    if r["accepted_at"] < users[r["user_id"]]: err.append("CONSENT accepted before the account existed")
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
print("exempt (Req in FIELDS, optional in storage):", len(STORAGE_OPTIONAL), "| polymorphic column:", len(POLYMORPHIC))
if err:
    print(f"FAIL — {len(err)} problem(s)"); [print("  -", x) for x in err]; sys.exit(1)
print("PASS — all foreign keys resolve; required, enum, order and determinism checks pass")
