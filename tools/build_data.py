# -*- coding: utf-8 -*-
"""Build the Session 5 data-model package into ../data/ and validate it.
   python3 build_data.py [--mermaid]"""
import os, re, sys, subprocess, tempfile
from collections import defaultdict, OrderedDict
import specs_a, specs_b
from dm_model import *
from dm_model2 import *

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
OUT = os.path.join(ROOT, "data")
MODS = specs_a.MODULES + specs_b.MODULES
FUNCS = OrderedDict((f[0], (m["id"], f[1], f[3])) for m in MODS for f in m["fr"])
EDEF = {e[0]: e for e in ENTITIES}
errors = []

def fm(artifact, step):
    return f"---\nartifact: {artifact}\nstep: {step}\ngenerated: {GENERATED}\nsources: {SOURCES}\n---\n\n"

def cite_f(fid):
    mod = fid.split("-")[1]; n = int(fid.split("-")[2])
    return f"{mod} §5 FR-{n:03d}"

def oq_table(rows, with_id=False):
    out = ["| # | Question | Blocking? | Owner | Default applied | Consequence if the default is wrong |", "|---|---|---|---|---|---|"]
    for i, r in enumerate(rows, 1):
        if with_id:
            out.append(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} | {r[5]} |")
        else:
            out.append(f"| {i} | {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} |")
    return "\n".join(out)

# ------------------------------------------------------------------ 01
def build_01():
    s = [fm("01-entity-dictionary", "S1"), "# Entity Dictionary — CINEMATCH\n",
         "One consolidated dictionary for the 8 specified modules. Canonical names are UPPER_SNAKE and singular; "
         "they are the names used in `03-erd.mmd`, `04-data-model.md` and `seed/`.\n",
         "## INPUT MAP (S0)\n", "```text\n" + INPUT_MAP + "```\n",
         f"**Count:** {len(ENTITIES)} declared in the specs' section 6 — {len(STORED)} stored "
         f"({sum(1 for e in ENTITIES if e[2]=='THING')} THING, {sum(1 for e in ENTITIES if e[2]=='EVENT')} EVENT) "
         f"and {len(DERIVED)} that the specs themselves define as *derived* (computed, not stored). "
         "Derived entities stay in this dictionary so that nothing declared disappears, but they are not drawn in the ERD "
         "(open question 2).\n",
         "## Entities\n",
         "| Canonical name | Definition (one sentence) | THING/EVENT | Owner | Aliases | Citation |", "|---|---|---|---|---|---|"]
    for e in ENTITIES:
        kind = "DERIVED (computed on read)" if e[2] == "DERIVED" else e[2]
        s.append(f"| `{e[0]}` | {e[1]} | {kind} | {e[3]} | {e[4]} | {e[5]} |")
    s += ["\n## Implied but never declared\n",
          "Nouns the FIELDS or RULES need the system to remember, with no declared entity. **Reported, not added.**\n",
          "| Field name | Source | Why it looks like an entity |", "|---|---|---|"]
    s += [f"| {a} | {b} | {c} |" for a, b, c in IMPLIED]
    s += ["\n## Conflicts requiring a human decision\n",
          "| Type (synonym / collision / shared ownership / type mismatch) | Items | Sources | What must be decided | Decision |",
          "|---|---|---|---|---|"]
    s += [f"| {t} | {i} | {src} | {w} | |" for t, i, src, w in CONFLICTS]
    s += ["\n## Open questions\n", oq_table(OQ_01), ""]
    s += ["\n---\n*Human gate 1 (not delegable): fill the Decision column, review the implied entities, "
          "and rewrite each definition in your own words. Signed: ____________________  Date: __________*\n"]
    return "\n".join(s)

# ------------------------------------------------------------------ 02
def crud_analysis():
    ent_ops = defaultdict(lambda: defaultdict(list))
    touched_f = set()
    for f, e, ops, c in CRUD:
        if f not in FUNCS: errors.append(f"CRUD: unknown function {f}")
        if e not in EDEF: errors.append(f"CRUD: unknown entity {e}")
        touched_f.add(f)
        for o in ops: ent_ops[e][o].append(f)
    for f in FUNCS:
        if f not in touched_f and f not in NO_ENTITY: errors.append(f"CRUD: function {f} neither mapped nor in NO_ENTITY")
        if f in touched_f and f in NO_ENTITY: errors.append(f"CRUD: {f} both mapped and NO_ENTITY")
    return ent_ops

HYP = {
 ("1","SEGMENT_RULE"):"Missing function — VFDA edits the decision table (M1 BR-001 \"approved by VFDA\"); belongs to M10.",
 ("1","SEGMENT_REQUIREMENT"):"Missing function — VFDA-maintained configuration; belongs to M10.",
 ("1","PROVINCE"):"Missing function is acceptable: fixed reference list of 34 units, loaded once (M3 BR-006).",
 ("1","COMPLIANCE_RUN"):"Missing function — the project content check is described (M2 §6, SC-48) but no FR runs it.",
 ("1","LOCATION_QUERY"):"Surplus entity, unless the query is to be stored (02 OQ 2).",
 ("1","COLLAB_MESSAGE"):"Surplus entity for this release (no screen shows messages).",
 ("1","DOCUMENT_TYPE"):"Missing function — VFDA maintains the document catalogue; belongs to M10.",
 ("1","DOCUMENT_SLOT"):"Missing function — slots must be created when the kit opens (02 OQ 5).",
 ("1","PROJECT_GLOSSARY"):"Surplus entity for this release.",
 ("1","PUBLIC_HOLIDAY"):"Missing function — someone must enter official and expected holiday dates (M5 §10).",
 ("2","PROFILE"):"Missing function — an account page (SC-08, *My account*) shows the profile, but no FR reads it.",
 ("2","PRODUCER_ORGANISATION"):"Missing function — the company is shown nowhere by a specified function (SC-08, partner view of the requester).",
 ("2","CONSENT"):"Missing function — nobody reads consents (e.g. re-prompt on a new terms version).",
 ("2","EMAIL_DELIVERY"):"Missing function — M7 edge case says VFDA staff are alerted on bounce; no function reads deliveries.",
 ("2","SEGMENT_DECISION"):"Missing function — decisions are demand data for M10 reports.",
 ("2","RULE_SET_VERSION"):"Missing function — results show \"rule set 2026.08\" (M2 US-1), so something reads it.",
 ("2","PROJECT_PROVINCE"):"Missing function — provinces entered at creation are never shown or used.",
 ("2","BILINGUAL_DOCUMENT"):"Missing function — SC-28 opens a draft; only its paragraphs are read.",
 ("2","PRECHECK_RUN"):"Missing function — the run is a demand data point (M2 FR-007) for M10; SC-48 reads it through findings.",
 ("3","NOTIFICATION"):"Ownership unclear — SYS should own; M4/M7 should call F-SYS-07.",
 ("3","EMAIL_DELIVERY"):"Ownership unclear — SYS should own; M4/M7 should call F-SYS-08.",
}

def build_02():
    ent_ops = crud_analysis()
    s = [fm("02-crud-matrix", "S2"), "# CRUD Matrix — CINEMATCH\n",
         f"Long form: one row per (function, entity) pair that interacts — {len(CRUD)} rows over "
         f"{len(set(f for f,_,_,_ in CRUD))} of the {len(FUNCS)} functions. Function IDs are the DBIZ2 Subfunction IDs; "
         "`F-M3-08` is `FR-008` in `docs/spec/spec-M3.md`. Each row was decided from the function description and its "
         "I/O row, not from the entity name.\n",
         "## Interactions\n", "| Function | Entity | Ops | Citation |", "|---|---|---|---|"]
    for f, e, ops, c in CRUD:
        s.append(f"| {f} | `{e}` | {ops} | {c} |")
    s += ["\n## Coverage per entity\n", "| Entity | Created by | Read by | Updated by | Deleted by |", "|---|---|---|---|---|"]
    for e in ENTITIES:
        o = ent_ops.get(e[0], {})
        cell = lambda k: ", ".join(o.get(k, [])) or "—"
        s.append(f"| `{e[0]}`{' *(derived)*' if e[2]=='DERIVED' else ''} | {cell('C')} | {cell('R')} | {cell('U')} | {cell('D')} |")
    # anomalies
    an = []
    for e in ENTITIES:
        if e[2] == "DERIVED": continue
        o = ent_ops.get(e[0], {})
        if not o.get("C"): an.append(("1 — no C", e[0]))
        if o.get("C") and not o.get("R"): an.append(("2 — C but no R", e[0]))
        owners = sorted(set(f.split("-")[1] for f in o.get("C", [])))
        if len(owners) > 1: an.append(("3 — created by several owners", f"{e[0]} ({', '.join(owners)})"))
        if not o: an.append(("5 — no function touches it", e[0]))
    for f, why in NO_ENTITY.items(): an.append(("4 — function touches no entity", f"{f}: {why}"))
    s += ["\n## Anomalies\n",
          "Reported only — no function or entity was added to make the matrix look complete. "
          "**No function deletes anything (no D in the whole matrix)**; see `04-data-model.md`, structural check (ii).\n",
          "| Kind | Entity or function | Hypothesis (missing function / surplus entity) | Resolution |", "|---|---|---|---|"]
    for k, x in an:
        key = (k[0], x.split(" ")[0])
        h = HYP.get(key)
        if h is None and k[0] == "4":
            h = "Not about stored data, or vague — confirm with the module owner."
        if h is None and k[0] == "5":
            h = HYP.get(("1", x), "Surplus entity?")
        if h is None: errors.append(f"No hypothesis for anomaly {k} {x}"); h = "?"
        s.append(f"| {k} | `{x}` | {h} | |" if k[0] != "4" else f"| {k} | {x} | {h} | |")
    s += ["\n## Open questions\n", oq_table(OQ_02), ""]
    s += ["\n---\n*Human gate 2: fill the Resolution column. Kinds 1 and 4 go back to the module owner as spec defects; "
          "kind 3 (ownership) must be settled before Session 10. Signed: ____________________  Date: __________*\n"]
    return "\n".join(s), an

# ------------------------------------------------------------------ 03
def rel_line(r):
    return f'    {r[0]} {r[1]}{r[2]}{r[3]} {r[4]} : "{r[5]}"'

def build_03():
    for r in R:
        for x in (r[0], r[4]):
            if x not in STORED: errors.append(f"ERD: {x} is not a stored entity")
    drawn = set(x for r in R for x in (r[0], r[4]))
    for e in STORED:
        if e not in drawn and e not in UNLINKED: errors.append(f"ERD: {e} not drawn and not listed as unlinked")
    lines = ["%% artifact: 03-erd (conceptual ERD) | step: S3 | generated: " + GENERATED,
             "%% sources: " + SOURCES,
             "%% Entities and relationships only. -- : child cannot exist without the parent; .. : child only references it.",
             "%% Derived entities (READINESS_VIEW, DOSSIER_CHECK, LICENSING_TIMELINE, PROVINCE_READINESS) are not stored and not drawn.",
             "%% LEFT RIGHT | forward sentence | reverse sentence | which side may be zero | citation"]
    for r in R:
        lines.append(f"%% {r[0]} {r[4]} | {r[6]} | {r[7]} | {r[8]} | {r[9]}")
    for e, why in UNLINKED.items():
        lines.append(f"%% {e} (no relationship drawn) | {why} | see 02 open questions and OQ-03-5")
    for i, q in enumerate(OQ_03, 1):
        lines.append(f"%% OQ-03-{i} {q[0]} | blocking: {q[1]} | owner: {q[2]} | default: {q[3]}")
    lines.append("erDiagram")
    lines += [rel_line(r) for r in R]
    for e in UNLINKED: lines.append(f"    {e}")
    return "\n".join(lines) + "\n"

# ------------------------------------------------------------------ 04
def gtype(t):
    u = t.upper()
    if t == ND: return "string"
    for k, v in (("UUID","uuid"),("VARCHAR","string"),("TEXT","string"),("CHAR","string"),("INTEGER","int"),
                 ("NUMERIC","decimal"),("TIMESTAMPTZ","datetime"),("DATE","date"),("BOOLEAN","boolean"),("ENUM","enum")):
        if u.startswith(k): return v
    return "string"

def mm_comment(col):
    t = col[1]
    note = col[4]
    if col[1] == ND: note = "TYPE NOT DECLARED - " + note
    elif gtype(t) == "string" and not re.match(r"(VARCHAR|TEXT|CHAR)", t): note = f"declared {t} - " + note
    return re.sub(r'["]', "'", note).replace("§", "s").replace("—", "-").replace("≥", ">=").replace("…", "...")[:150]

def build_04():
    fk_pairs = set()
    for e, cols in C.items():
        if e not in STORED: errors.append(f"S4: columns for non-stored {e}")
        for col in cols:
            if col[5] and col[5] not in STORED: errors.append(f"S4: FK {e}.{col[0]} -> unknown {col[5]}")
            if col[5]: fk_pairs.add((col[5], e))
    for e in STORED:
        if e not in C: errors.append(f"S4: no columns for {e}")
        if e not in NATURAL_KEY: errors.append(f"S4: no natural key for {e}")
        if not any("PK" in c[3] for c in C.get(e, [])): errors.append(f"S4: no PK for {e}")
    for r in R:  # every relationship has an FK in the child
        if (r[0], r[4]) not in fk_pairs: errors.append(f"S4: relationship {r[0]}->{r[4]} has no FK column")
    rel_pairs = set((r[0], r[4]) for r in R)
    for p in fk_pairs:
        if p not in rel_pairs: errors.append(f"S4: FK {p} has no relationship in 03")
    nd = sum(1 for cols in C.values() for c in cols if c[1] == ND)
    s = [fm("04-data-model", "S4"), "# Logical Data Model — CINEMATCH\n",
         f"{len(STORED)} tables, {sum(len(v) for v in C.values())} columns. Every column is **copied** from a FIELDS row "
         "(section 5.1) or an ENTITIES attribute (section 6), with its declared type and Req / Opt flag. "
         "*system-set* = an output field (the system fills it); *not declared* = no flag in the input.\n",
         f"**{nd} columns carry no declared type.** They are written *type not declared* and raised as OQ-04-18 — "
         "no type was assigned here. Technical columns (`created_at`, `updated_at`) appear only where the spec declares them.\n",
         "Tables are grouped by owning module, in the order SYS → M1 → M0 → M2 → M3 → M4 → M5 → M7.\n"]
    for e in STORED:
        d = EDEF[e]
        s.append(f"## {e}\n")
        s.append(f"*{d[1]}* Owner: {d[3]}. {d[2]}.\n")
        s += ["| Column | Type (as declared) | Required | Key | Citation |", "|---|---|---|---|---|"]
        for c in C[e]:
            key = c[3] + (f" → `{c[5]}`" if c[5] else "")
            ty = f"*{c[1]}*" if c[1] == ND else f"`{c[1]}`"
            s.append(f"| `{c[0]}` | {ty} | {c[2]} | {key} | {c[4]} |")
        s.append(f"\n**Natural key:** {NATURAL_KEY[e]}\n")
    s += ["## Type conflicts\n", "| Field | Source A (type / required) | Source B (type / required) | Decision |", "|---|---|---|---|"]
    s += [f"| {a} | {b} | {c} | |" for a, b, c in TYPE_CONFLICTS]
    s += ["\n## Structural findings\n", "Reported only — nothing was fixed in the model.\n",
          "| Check | Entity / column | What the spec does not settle | Raised as |", "|---|---|---|---|"]
    s += [f"| {a} | {b} | {c} | {d} |" for a, b, c, d in STRUCTURAL]
    # diagram
    d = ["erDiagram"] + [rel_line(r) for r in R] + [f"    {e}" for e in UNLINKED]
    for e in STORED:
        d.append(f"    {e} {{")
        for c in C[e]:
            k = c[3].replace(" ", "")
            d.append(f'        {gtype(c[1])} {c[0]}{(" " + k) if k else ""} "{mm_comment(c)}"')
        d.append("    }")
    s += ["\n## Diagram\n",
          "The relationship lines are byte-for-byte the lines of `03-erd.mmd`; only attribute blocks are added. "
          "Generic types only (`string int decimal date datetime boolean enum uuid`). `ARRAY`, `JSONB`, `FILE` and "
          "undeclared types are drawn as `string` and named in the comment — the table above keeps the declared type.\n",
          "```mermaid\n" + "\n".join(d) + "\n```\n"]
    s += ["## Open questions\n", oq_table(OQ_04, with_id=True), ""]
    s += ["\n---\n*Human gate 4: fill the Decision column of the type conflicts and confirm every natural key. "
          "Signed: ____________________  Date: __________*\n"]
    return "\n".join(s), "\n".join(d)

# ------------------------------------------------------------------ 05
def build_05():
    rows = []
    for q in OQ_01: rows.append(("01", q[2], q[0], q[1], q[3], q[4]))
    for q in OQ_02: rows.append(("02", q[2], q[0], q[1], q[3], q[4]))
    for i, q in enumerate(OQ_03, 1): rows.append((f"03 (OQ-03-{i})", q[2], q[0], q[1], q[3], q[4]))
    for q in OQ_04: rows.append((f"04 ({q[0]})", q[3], q[1], q[2], q[4], q[5]))
    def owner_key(r):
        o = r[1]
        for k in ("Nam", "SYS", "M0", "M1", "M2", "M3", "M4", "M5", "M7", "Group C", "Module owners"):
            if o.startswith(k): return (["Nam","SYS","M1","M0","M2","M3","M4","M5","M7","Group C","Module owners"].index(k), o)
        return (99, o)
    rows.sort(key=owner_key)
    blocking = sum(1 for r in rows if r[3] == "Yes")
    s = [fm("05-review", "S6"), "# Data Model Review — CINEMATCH\n",
         "Seven criteria (the first six from the Batini–Ceri–Navathe framework for conceptual models, the seventh from this "
         "process). Every result quotes its evidence. *Fail* here means *a specific, small thing is wrong and named*, not "
         "*the model is unusable*.\n",
         "## Rubric\n", "| Criterion | Result | Evidence quoted from the input | Minimum change proposed |", "|---|---|---|---|"]
    s += [f"| {a} | **{b}** | {c} | {d} |" for a, b, c, d in RUBRIC]
    npass = sum(1 for r in RUBRIC if r[1] == "Pass")
    s += [f"\n**Result: {npass} Pass, {len(RUBRIC)-npass} Fail, 0 Not assessed** — every slot the criteria need was present in the INPUT MAP.\n",
          "### A Pass we challenge (human gate 6)\n",
          f"**{CHALLENGE[0]}** — {CHALLENGE[1]}\n",
          "The team must challenge at least one more Pass or Fail in class before signing below.\n",
          "## Seed coverage (from S5)\n",
          "30 acceptance scenarios: **25 runnable, 4 partly, 1 not runnable** (M2 US-5: rule ↔ segment is not modelled). "
          "`check_seed.py`: PASS — 43 tables, 374 rows, 62 foreign-key columns resolve, generation is deterministic. "
          "Full table in `seed/README.md`.\n",
          "## Consolidated open questions\n",
          f"All {len(rows)} open questions from 01–04, grouped by owner — **{blocking} blocking**. Each row can be pasted "
          "into section 10 of the owning module's Spec Document; the *From* column says where it was raised.\n",
          "| # | Owner | From | Question | Blocking? | Default applied | Consequence if the default is wrong |",
          "|---|---|---|---|---|---|---|"]
    for i, r in enumerate(rows, 1):
        s.append(f"| {i} | {r[1]} | {r[0]} | {r[2]} | {r[3]} | {r[4]} | {r[5]} |")
    s += ["\n## Files produced\n", "| File | Step | Status |", "|---|---|---|",
          "| `data/01-entity-dictionary.md` | S1 | Draft — Decision column and definitions await human gate 1 |",
          "| `data/02-crud-matrix.md` | S2 | Draft — Resolution column awaits human gate 2 |",
          "| `data/03-erd.mmd` | S3 | Draft — renders; relationship sentences await human gate 3 |",
          "| `data/04-data-model.md` | S4 | Draft — renders; type conflicts and natural keys await human gate 4 |",
          "| `data/seed/*.csv` (43) + `generate_seed.py`, `check_seed.py`, `schema.json`, `README.md` | S5 | Check PASS |",
          "| `data/05-review.md` | S6 | This file — awaits human gate 6 |",
          "\n---\n*Human gate 6: the team challenged at least one result and agrees with this review. "
          "Signed: ____________________  Date: __________*\n"]
    return "\n".join(s), len(rows), blocking

def check_mermaid(src, label):
    chrome = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
    with tempfile.TemporaryDirectory() as t:
        open(f"{t}/p.json","w").write('{"executablePath":"%s","args":["--no-sandbox"]}' % chrome)
        open(f"{t}/in.mmd","w").write(src)
        r = subprocess.run(["mmdc","-p",f"{t}/p.json","-i",f"{t}/in.mmd","-o",f"{t}/out.svg"],capture_output=True,text=True)
        if r.returncode: errors.append(f"Mermaid {label}: {r.stderr[-400:]}")
        else: print(f"  mermaid {label}: renders")

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    t01 = build_01(); t02, anomalies = build_02(); t03 = build_03(); t04, d04 = build_04()
    # byte-for-byte check of relationship lines
    rel03 = [l for l in t03.splitlines() if re.match(r"^\s{4}[A-Z_]+ [|}o]", l)]
    rel04 = [l for l in d04.splitlines() if re.match(r"^\s{4}[A-Z_]+ [|}o]", l)]
    if rel03 != rel04: errors.append("03/04 relationship lines differ")
    t05, n_oq, n_block = build_05()
    for n, t in (("01-entity-dictionary.md", t01), ("02-crud-matrix.md", t02), ("03-erd.mmd", t03), ("04-data-model.md", t04), ("05-review.md", t05)):
        open(os.path.join(OUT, n), "w").write(t)
    # machine-readable schema for the seed generator and FK check (data/seed/)
    import json
    os.makedirs(os.path.join(OUT, "seed"), exist_ok=True)
    schema = OrderedDict()
    for e in STORED:
        schema[e] = {"table": e.lower(), "columns": [c[0] for c in C[e]],
                     "pk": [c[0] for c in C[e] if "PK" in c[3]],
                     "required": [c[0] for c in C[e] if c[2] == "Req"],
                     "fk": [{"column": c[0], "references": c[5],
                             "ref_column": next((t[0] for t in C[c[5]] if t[0] == c[0] and ("PK" in t[3] or "UK" in t[3])), None)}
                            for c in C[e] if c[5]],
                     "enums": {c[0]: [v.strip() for v in re.search(r"ENUM\((.*)\)", c[1]).group(1).split(",")]
                               for c in C[e] if re.match(r"ENUM\(", c[1])}}
    json.dump(schema, open(os.path.join(OUT, "seed", "schema.json"), "w"), ensure_ascii=False, indent=1)
    if "--mermaid" in sys.argv:
        check_mermaid(t03, "03-erd.mmd"); check_mermaid(d04, "04 diagram")
    import pickle; pickle.dump(anomalies, open(os.path.join(os.path.dirname(__file__), "_anomalies.pkl"), "wb"))
    print(f"entities {len(ENTITIES)} (stored {len(STORED)}), relationships {len(R)}, CRUD rows {len(CRUD)}, "
          f"columns {sum(len(v) for v in C.values())}, anomalies {len(anomalies)}")
    print("relationship lines identical 03/04:", rel03 == rel04, len(rel03))
    print(f"open questions {n_oq}, blocking {n_block}")
    if errors:
        print("ERRORS:"); [print("  -", e) for e in errors]; sys.exit(1)
    print("OK")
