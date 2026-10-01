# -*- coding: utf-8 -*-
"""Integrity check for data/seed/NN_<table>.csv (Session 5 human gate: run it, do not verify by eye).
    python3 data/seed/check_seed.py
Runs on the files the same checks the generator runs before writing (seed_rules.validate): primary keys,
every foreign key (composite keys included), load order, required columns, enum values and coverage,
timestamps in order, every business rule recomputed, privacy patterns. Then regenerates the files and
checks that nothing changed (determinism — Session 6 smoke test T2)."""
import csv, glob, hashlib, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from seed_rules import validate, STORAGE_OPTIONAL, UNUSED_ENUM_VALUES

S = json.load(open(os.path.join(HERE, "schema.json"), encoding="utf-8"))
T = {e: list(csv.DictReader(open(os.path.join(HERE, m["file"]), encoding="utf-8"))) for e, m in S.items()}
err = validate(S, T)
extra = sorted(set(os.path.basename(f) for f in glob.glob(os.path.join(HERE, "*.csv"))) - {m["file"] for m in S.values()})
if extra: err.append(f"CSV files that belong to no table: {extra}")
names = [m["file"] for m in S.values()]
if names != sorted(names): err.append("filename order differs from load order")

def digest():
    h = hashlib.sha256()
    for m in S.values(): h.update(open(os.path.join(HERE, m["file"]), "rb").read())
    return h.hexdigest()
before = digest()
subprocess.run([sys.executable, os.path.join(HERE, "generate_seed.py")], check=True, capture_output=True)
if digest() != before: err.append("generator is not deterministic: files changed on regeneration")

n = sum(len(v) for v in T.values())
fkn = sum(len(m["fk"]) for m in S.values())
print(f"{len(S)} tables, {n} rows, {fkn} foreign-key columns checked; files load in filename order {names[0]} … {names[-1]}")
print("exempt (Req in FIELDS, optional in storage):", len(STORAGE_OPTIONAL),
      "| declared enum values not used:", ", ".join(f"{e}.{c}={v}" for e, c, v in UNUSED_ENUM_VALUES))
if err:
    print(f"FAIL — {len(err)} problem(s)"); [print("  -", x) for x in err]; sys.exit(1)
print("PASS — keys, foreign keys, load order, required, enums, time order, business rules, privacy and determinism checks pass")
