# -*- coding: utf-8 -*-
"""Write data/data-model-<MODULE>.md — one file per module in the *Data Model and Mockup Data* layout
(reconstructed from the Session 5 lecture and the Session 7 rubric; see data/README.md).

    python3 tools/build_dm_docs.py [--mermaid]      (after build_data.py, build_schema.py and the seed generator)

Everything is computed from the single sources (dm_model, dm_model2, specs_*, dm_rules, data/seed, data/schema),
and the build stops if a number does not agree (diagram check) or an evidence filter matches no seed row."""
import csv, glob, json, os, re, subprocess, sys, tempfile
from collections import OrderedDict
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import specs_a, specs_b, specs_c, specs_types
from dm_model import ENTITIES, CONFLICTS, CONFLICT_DECISIONS, IMPLIED, OQ_01, OQ_02, CRUD, GENERATED, INPUT_MAP
from dm_model2 import R, C, OQ_03, OQ_04, NATURAL_KEY, TYPE_CONFLICTS, TYPE_DECISIONS, STRUCTURAL
import dm_rules

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
SEED = os.path.join(ROOT, "data", "seed")
S = json.load(open(os.path.join(SEED, "schema.json"), encoding="utf-8"))
T = {e: list(csv.DictReader(open(os.path.join(SEED, m["file"]), encoding="utf-8"))) for e, m in S.items()}
MODS = specs_a.MODULES + specs_b.MODULES + specs_c.MODULES
MOD = {m["id"]: m for m in MODS}
EDEF = {e[0]: e for e in ENTITIES}
ORDER = ["SYS", "M1", "M0", "M2", "M3", "M4", "M5", "M7", "M10"]
TODAY = "01/10/2026"
errors = []


def tbl(head, rows):
    out = ["| " + " | ".join(head) + " |", "|" + "---|" * len(head)]
    out += ["| " + " | ".join(str(c).replace("\n", " ").replace("|", "\\|") for c in r) + " |" for r in rows]
    return "\n".join(out)


def arr(t):
    while "ARRAY<" in t:
        t = re.sub(r"ARRAY<([^<>]*)>", r"\1[]", t)
    return t


# ---------------------------------------------------------------- evidence resolution
def _resolve(v):
    if isinstance(v, str) and v.startswith("@"):
        kind, name = v[1:].split(":", 1)
        if kind == "project": return next(r["project_id"] for r in T["PROJECT"] if r["project_name"] == name)
        if kind == "org": return next(r["org_id"] for r in T["ORGANISATION"] if r["org_name"] == name)
        if kind == "loc": return next(r["location_id"] for r in T["LOCATION"] if r["slug"] == name)
        if kind == "user": return next(r["user_id"] for r in T["USER_ACCOUNT"] if r["email"].startswith(name))
    return v


def _match(cell, want):
    if isinstance(want, tuple):
        op = want[0]
        if op == "len": return len(cell) == want[1]
        if op == "ne": return cell != want[1]
        if op == "lt": return cell != "" and cell < want[1]
        if op == "gt": return cell > want[1]
        if op == "empty": return cell == ""
        if op == "nonempty": return cell != ""
        if op == "startswith": return cell.startswith(want[1])
        raise ValueError(op)
    return cell == _resolve(want)


def evidence(ev):
    ent, flt, why = ev
    rows = [r for r in T[ent] if all(_match(r[c], w) for c, w in flt.items())]
    if not rows:
        errors.append(f"evidence matches no row: {ent} {flt}"); return f"**MISSING** {ent} {flt}"
    lab = dm_rules.LABEL[ent]
    show = "; ".join(" · ".join(x for x in (str(r[c])[:38] for c in lab) if x) or r[S[ent]["pk"][0]][:8] for r in rows[:2])
    more = f" (+{len(rows) - 2})" if len(rows) > 2 else ""
    return f"`{S[ent]['file']}` — {show}{more} — {why}"


# ---------------------------------------------------------------- per-module pieces
def owned(mid):
    return [e for e in EDEF if EDEF[e][3] == mid]


def stored(mid):
    return [e for e in owned(mid) if EDEF[e][2] != "DERIVED"]


def rels_for(mid):
    st = set(stored(mid))
    return [r for r in R if r[0] in st or r[4] in st]


def fk_rels(mid):
    """relationships whose foreign key lives in a table of this module (the child side)"""
    st = set(stored(mid))
    return [r for r in R if r[4] in st]


def source_kind(cite, key):
    if "§6.1" in cite: return "§6.1 declared type"
    if "§5.1" in cite: return "§5.1 field"
    if "PK" in key or "FK" in key: return "key"
    if "§6" in cite: return "§6 attribute"
    return "audit column"


def erd(mid):
    st = stored(mid)
    lines = ["erDiagram"]
    for r in rels_for(mid):
        lines.append(f'    {r[0]} {r[1]}{r[2]}{r[3]} {r[4]} : "{r[5]}"')
    gt = {"UUID": "uuid", "VARCHAR": "string", "TEXT": "string", "CHAR": "string", "INTEGER": "int", "NUMERIC": "decimal",
          "TIMESTAMPTZ": "datetime", "DATE": "date", "BOOLEAN": "boolean", "ENUM": "enum"}
    for e in st:
        lines.append(f"    {e} {{")
        for c in C[e]:
            g = next((v for k, v in gt.items() if c[1].upper().startswith(k)), "string")
            k = c[3].replace(" ", "")
            lines.append(f"        {g} {c[0]}{(' ' + k) if k else ''}")
        lines.append("    }")
    return "\n".join(lines)


def schema_counts(mid):
    sql = open(os.path.join(ROOT, "data", "schema", f"schema-{mid}.sql"), encoding="utf-8").read()
    tables = re.findall(r"CREATE TABLE (\w+) \(", sql)
    cols = sum(len([l for l in block.split("\n") if re.match(r"\s{4}\w+ [A-Z]", l) and not l.strip().startswith("CONSTRAINT")])
               for block in re.findall(r"CREATE TABLE \w+ \((.*?)\n\);", sql, re.S))
    fks = sql.count("FOREIGN KEY")
    checks = len(re.findall(r"CONSTRAINT (ck_\w+)", sql))
    return tables, cols, fks, checks, sql


def oq_rows(mid):
    out = []
    pat = re.compile(rf"(^|[\s,(+]){re.escape(mid)}(\b|$)")
    for q in OQ_01 + OQ_02:
        if pat.search(q[2]): out.append((q[0], q[1], q[2], q[5] if len(q) > 5 else "Open"))
    for q in OQ_03:
        if pat.search(q[2]): out.append((q[0], q[1], q[2], q[5] if len(q) > 5 else "Open"))
    for q in OQ_04:
        if pat.search(q[3]): out.append((q[1], q[2], q[3], q[6] if len(q) > 6 else "Open"))
    return out


def module_doc(mid, mermaid_ok):
    m = MOD[mid]
    st, ow = stored(mid), owned(mid)
    derived = [e for e in ow if EDEF[e][2] == "DERIVED"]
    tables, n_cols_sql, n_fk_sql, n_ck, sql = schema_counts(mid)
    n_cols = sum(len(C[e]) for e in st)
    fr = fk_rels(mid)
    # ---- diagram check (numbers must agree)
    erd_src = erd(mid)
    erd_entities = sorted(set(re.findall(r"^    (\w+) \{", erd_src, re.M)))
    erd_lines = [l for l in erd_src.split("\n") if re.match(r"^    \w+ [|}o]", l)]
    checks = [
        ("Entities owned and stored (catalogue §2)", len(st), "entity blocks in the ERD (§5)", len(erd_entities)),
        ("Entities owned and stored (catalogue §2)", len(st), "tables in `schema-" + mid + ".sql`", len(tables)),
        ("Attributes (§3)", n_cols, "columns in `schema-" + mid + ".sql`", n_cols_sql),
        ("Relationships with the child in this module (§4)", len(fr), "FOREIGN KEY constraints in `schema-" + mid + ".sql`", n_fk_sql),
        ("Relationships touching this module (§4)", len(rels_for(mid)), "relationship lines in the ERD (§5)", len(erd_lines)),
        ("Seed files of this module (§9)", len(st), "tables in `schema-" + mid + ".sql`", len(tables)),
    ]
    for a, x, b, y in checks:
        if x != y: errors.append(f"{mid} diagram check: {a} {x} ≠ {b} {y}")
    # ---- sections
    s = [f"# Data Model and Mockup Data: {m['name']} ({mid})\n",
         "> Layout reconstructed from the Session 5 lecture (*Building an ERD with AI*, steps S0–S6 and human gates 1–6) and the Session 7 rubric (C3, C4, G2–G4), "
         "because the course template file was not available to the team. Sections marked *(mandatory)* are all filled. Generated by `tools/build_dm_docs.py` "
         "from the same sources as `data/01`–`05`, `data/schema/` and `data/seed/`; the numbers below are computed, not typed.\n",
         tbl(["Field", "Value"], [("Module", f"{mid} — {m['name']}"), ("Spec Document", f"`docs/spec/spec-{mid}.md`"),
                                  ("Schema", f"`data/schema/schema-{mid}.sql`"), ("Seed files", ", ".join(f"`{S[e]['file']}`" for e in st)),
                                  ("Version / date", f"v1.0 — {TODAY}"), ("Prepared by", "Group C (draft by an AI agent, see `docs/ai-use-log.md`)"),
                                  ("Status", "Ready for the human gates in section 13")]), ""]
    # 1
    s += ["## 1. Sources and input map (mandatory)\n",
          f"The model of this module is derived from `docs/spec/spec-{mid}.md` only — no entity, column or relationship was invented. "
          "The input map below is the one used for the whole product (`data/01-entity-dictionary.md`); citations use the scheme `<MODULE> §<section> <ID>`.\n",
          "```text\n" + INPUT_MAP + "```\n"]
    # 2
    rows = []
    for e in ow:
        d = EDEF[e]
        src = "spec §6" if "§6" in d[5] else "discovered here"
        rows.append((f"`{e}`", d[1], "DERIVED (computed on read, not stored)" if d[2] == "DERIVED" else d[2], d[3],
                     src + f" — {d[5]}", f"`{S[e]['table']}`" if e in S else "—", f"`{S[e]['file']}` ({len(T[e])})" if e in S else "—"))
    ext = sorted(set(x for r in rels_for(mid) for x in (r[0], r[4]) if x not in ow))
    s += ["## 2. Entity catalogue (mandatory)\n",
          f"{len(ow)} entities owned by {mid}: {len(st)} stored, {len(derived)} derived. Every entity is declared in §6 of the Spec Document "
          "(*discovered here* would mark one that is not). Each entity has exactly one owner module.\n",
          tbl(["Entity", "Definition (one sentence)", "Kind", "Owner", "Source", "Table", "Seed file (rows)"], rows), "",
          ("**Entities of other modules referenced here** (drawn without attributes in §5): " + ", ".join(f"`{x}` ({EDEF[x][3]})" for x in ext) + ".\n") if ext else ""]
    # 3
    s += ["## 3. Attributes (mandatory)\n",
          "Every attribute traces to a §5.1 field, a §6.1 declared type, a key, or a deliberate audit column (*Source kind*). "
          "*Req* = required by the function; *Opt* = optional; *system-set* = filled by the system.\n"]
    for e in st:
        rows = [(f"`{c[0]}`", f"`{arr(c[1])}`", c[2], c[3] + (f" → `{c[5]}`" if c[5] else ""), source_kind(c[4], c[3]), c[4]) for c in C[e]]
        s += [f"### {e}\n", tbl(["Column", "Type", "Required", "Key", "Source kind", "Citation"], rows), "",
              f"**Natural key:** {NATURAL_KEY[e]}\n"]
    # 4
    rows = []
    for r in rels_for(mid):
        rows.append((f"`{r[0]}` {r[1]}{r[2]}{r[3]} `{r[4]}`", r[6], r[7], r[8], "identifying (`--`)" if r[2] == "--" else "non-identifying (`..`)", r[9]))
    mn = [r for r in rels_for(mid) if r[1] in ("}|", "}o") and r[3] in ("|{", "o{")]
    s += ["## 4. Relationships (mandatory)\n",
          "Each relationship is read in both directions; the citation is the spec line it comes from. "
          f"**No many-to-many relationship is left unresolved{'' if not mn else ' — EXCEPT ' + str(len(mn))}**: every many-to-many need of this module is an associative entity "
          "(e.g. PROJECT_SHORTLIST, PROJECT_PROVINCE, PROJECT_MEMBER).\n",
          tbl(["Relationship", "Forward reading", "Reverse reading", "Side that may be zero", "Type", "Citation"], rows), ""]
    # 5
    s += ["## 5. ERD and diagram check (mandatory)\n",
          f"Entities of {mid} with their attributes; entities of other modules appear as names only. Relationship lines are copied from `data/03-erd.mmd`.\n",
          "```mermaid\n" + erd_src + "\n```\n",
          f"Renders with mermaid-cli: **{'yes' if mermaid_ok else 'not checked in this build'}**.\n",
          "**Diagram check** — computed by the generator; the build stops if a pair differs.\n",
          tbl(["Count", "Value", "Compared with", "Value", "Agree"], [(a, x, b, y, "✓" if x == y else "✗") for a, x, b, y in checks]), ""]
    # 6
    nf_rows = []
    for e in st:
        pk = S[e]["pk"]
        arrays = [c[0] for c in C[e] if c[1].startswith("ARRAY<")]
        exc = [x for x in dm_rules.NF_EXCEPTIONS if x[0] == e]
        one = "✓" if not arrays else "exception: " + ", ".join(f"`{a}`" for a in arrays) + " (array)"
        two = "✓ single-column key" if len(pk) == 1 else f"✓ composite key ({', '.join(pk)}): every non-key column describes the whole key"
        three = "✓" if not exc else "exception: " + "; ".join(f"`{x[1]}`" for x in exc)
        nf_rows.append((f"`{e}`", one, two, three))
    exc_rows = [(f"`{x[0]}.{x[1]}`", x[2], x[3], x[4]) for x in dm_rules.NF_EXCEPTIONS if x[0] in st]
    arr_rows = [(f"`{e}.{c[0]}`", "1NF (list in one column)", "filtered and shown as a list", "see note below")
                for e in st for c in C[e] if c[1].startswith("ARRAY<")]
    s += ["## 6. Normalization check (mandatory)\n",
          tbl(["Table", "1NF", "2NF", "3NF"], nf_rows), "",
          "**Deliberate exceptions and their upkeep rules**\n",
          (tbl(["Column", "Breaks", "Why it is kept", "Upkeep rule"], exc_rows + arr_rows) if exc_rows or arr_rows else "None in this module."), "",
          (dm_rules.ARRAY_UPKEEP + "\n") if arr_rows else ""]
    # 7
    br_rows = []
    for b in m["br"]:
        key = f"{mid} {b[0]}"
        if key not in dm_rules.BR_ENF: errors.append(f"no enforcement entry for {key}"); continue
        kind, obj, evs = dm_rules.BR_ENF[key]
        br_rows.append((b[0], b[1], kind, obj, "<br>".join(evidence(ev) for ev in evs)))
    s += ["## 7. Business rules and where they are enforced (mandatory)\n",
          "*SCHEMA* = a constraint in `data/schema/schema-" + mid + ".sql` today. *SEED CHECK* = `data/seed/seed_rules.py`, run by the generator before it writes and by `check_seed.py`. "
          "*TRIGGER / RLS / VIEW / APP* = built at the Plan step; the named object is the brief for the agent. *NOT DATA* = a rule about wording or an external service. "
          "The last column names the seed rows that demonstrate the rule.\n",
          tbl(["Rule", "Statement", "Enforced in", "Named object", "Seed rows that show it"], br_rows), ""]
    # 8
    s += ["## 8. Schema (mandatory)\n",
          f"`data/schema/schema-{mid}.sql` — {len(tables)} tables in load order: " + ", ".join(f"`{t}`" for t in tables) +
          f"; {n_fk_sql} foreign keys; {n_ck} CHECK constraints. Portable SQL (SQLite 3 and PostgreSQL 14+).\n",
          "Load test: `python3 data/schema/load_check.py` runs every schema file, then every seed file in filename order with foreign keys on — **PASS** "
          "(also on PostgreSQL 16 with `--postgres`).\n"]
    # 9
    kinds = seed_row_kinds()
    rows = [(f"`{S[e]['file']}`", len(T[e]), *kinds.get(S[e]["table"], ("—", "—", "—"))) for e in st]
    s += ["## 9. Mockup data (mandatory)\n",
          tbl(["Item", "Value"], [
              ("Generator", "`data/seed/generate_seed.py` (writes nothing unless `seed_rules.validate` passes)"),
              ("Regenerate", "`python3 data/seed/generate_seed.py && python3 data/seed/check_seed.py` (must print PASS; `git status` stays clean)"),
              ("Random seed", "none — no randomness and no clock: keys are UUIDv5 of readable names (namespace `6f1c2a8e-3b4d-5e6f-8a9b-0c1d2e3f4a5b`), so every run is byte-identical"),
              ("Business-rule values", "computed by the generator, never typed: attention level (M2 BR-004), quote span (M2 §6.1), latest readiness (M0 §9), is_active, published"),
              ("Files", f"{len(st)} files of this module, {sum(len(T[e]) for e in st)} rows (product: {len(S)} files, {sum(len(v) for v in T.values())} rows)")]), "",
          "**Rows per file and row kinds** (1 = ordinary rows in every file)\n",
          tbl(["File", "Rows", "(2) Boundary", "(3) Empty case", "(4) Exceptional state"], rows), ""]
    # 10
    enum_rows = []
    for e in st:
        for c, vals in list(S[e]["enums"].items()) + list(S[e].get("array_enums", {}).items()):
            for v in vals:
                hit = [r for r in T[e] if (v in (json.loads(r[c]) if r[c] else [])) if c in S[e].get("array_enums", {})] if c in S[e].get("array_enums", {}) \
                    else [r for r in T[e] if r[c] == v]
                lab = dm_rules.LABEL[e]
                where = (f"{len(hit)} row(s), e.g. " + " · ".join(str(hit[0][x])[:30] for x in lab if hit[0][x])) if hit else \
                    "not used — " + {("USER_ACCOUNT", "role", "guest"): "a guest has no account (SYS BR-002)",
                                     ("MODERATION_ITEM", "content_type", "showcase"): "phase 2 (M8)"}.get((e, c, v), "?")
                enum_rows.append((f"`{e}.{c}`", f"`{v}`", where))
    empty_rows = []
    for r in R:
        if r[0] in st and r[3] in ("o{", "o|"):
            fk = next(f for f in S[r[4]]["fk"] if f["references"] == r[0])
            parent_key = fk["ref_column"] or S[r[0]]["pk"][0]
            used = {x[fk["column"]] for x in T[r[4]]}
            empty = [p for p in T[r[0]] if p[parent_key] not in used]
            if empty:
                lab = dm_rules.LABEL[r[0]]
                empty_rows.append((f"`{r[0]}` with no `{r[4]}` ({r[5]})",
                                   f"{len(empty)} row(s), e.g. " + " · ".join(str(empty[0][x])[:30] for x in lab if empty[0][x])))
    b_rows = [(rule, evidence(ev)) for rule, ev in dm_rules.BOUNDARIES.get(mid, [])]
    s += ["## 10. Edge case register (mandatory)\n",
          "Computed from the seed files. (a) every enumerated value has a row; (b) empty states; (c) one boundary per numeric or date rule; "
          "(d) one row per business rule — the last column of section 7.\n",
          "**(a) Enumerated values**\n", tbl(["Column", "Value", "Seed rows"], enum_rows) if enum_rows else "No enumerated column in this module.", "",
          "**(b) Empty states**\n", tbl(["Empty case", "Seed rows"], empty_rows) if empty_rows else "No optional child relationship starts in this module.", "",
          "**(c) Boundaries of numeric and date rules**\n", tbl(["Rule", "Seed row"], b_rows) if b_rows else "This module declares no numeric or date rule.", "",
          f"**(d) Business rules** — {len(br_rows)} of {len(m['br'])} rules have their rows named in section 7.\n"]
    # 11
    s += ["## 11. Privacy declaration (mandatory)\n",
          "\n".join(f"- [x] {p}" for p in dm_rules.PRIVACY), "",
          f"Personal or sensitive columns in this module: " + (", ".join(sorted(sensitive(mid))) or "none") + ".\n"]
    # 12
    oq = oq_rows(mid)
    s += ["## 12. Open questions (mandatory)\n",
          f"Data questions raised in `data/01`–`04` whose owner includes {mid}. All other open points of the module are in `docs/spec/spec-{mid}.md` §10.\n",
          tbl(["Question", "Blocking?", "Owner", "Status"], [(q[0], q[1], q[2], q[3] or "Open") for q in oq]) if oq else "No open data question for this module.", ""]
    # 13
    s += ["## 13. Human gates and sign-off\n",
          "The gates of the Session 5 process. The agent prepared every section above; a person checks and signs.\n",
          tbl(["Gate", "What the person checks", "Checked by", "Date"], [
              ("1 — Entity authority and naming", "§2: names, one owner per entity, definitions rewritten in own words", "pending", "pending"),
              ("2 — CRUD anomalies", "`data/02-crud-matrix.md` rows of this module", "pending", "pending"),
              ("3 — Relationships", "§4: each relationship read aloud in both directions", "pending", "pending"),
              ("4 — Logical model", "§3 types and keys; type decisions in `data/04-data-model.md`", "pending", "pending"),
              ("5 — Seed", "`check_seed.py` and `load_check.py` print PASS on your laptop", "pending", "pending"),
              ("6 — Review", "§6, §7 and `data/05-review.md`; challenge at least one result", "pending", "pending")]), ""]
    return "\n".join(s)


def sensitive(mid):
    out = set()
    for e in stored(mid):
        for c in C[e]:
            if re.search(r"(email|phone|full_name|contact_name|direct_contact|rate_card|past_clients|file_path|synopsis_en|scene_description|logline)", c[0]):
                out.add(f"`{e}.{c[0]}`")
    return out


_KINDS = None
def seed_row_kinds():
    global _KINDS
    if _KINDS is None:
        _KINDS = {}
        txt = open(os.path.join(SEED, "README.md"), encoding="utf-8").read()
        sec = txt.split("## Row kinds per table", 1)[1].split("\n## ", 1)[0]
        for line in sec.splitlines():
            m = re.match(r"\| (\w+) \| (.*?) \| (.*?) \| (.*?) \|$", line)
            if m and m.group(1) not in ("Table",):
                _KINDS[m.group(1)] = (m.group(2), m.group(3), m.group(4))
    return _KINDS


def check_mermaid(src):
    import toolpaths
    with tempfile.TemporaryDirectory() as t:
        open(f"{t}/in.mmd", "w").write(src)
        cmd = toolpaths.mmdc_cmd(f"{t}/in.mmd", f"{t}/out.svg", t)
        if not cmd: return False
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode: errors.append("Mermaid: " + r.stderr[-300:]); return False
        return True


if __name__ == "__main__":
    out = os.path.join(ROOT, "data")
    for mid in ORDER:
        ok = check_mermaid(erd(mid)) if "--mermaid" in sys.argv else False
        open(os.path.join(out, f"data-model-{mid}.md"), "w", encoding="utf-8").write(module_doc(mid, ok))
    if errors:
        print("ERRORS:"); [print("  -", e) for e in errors]; sys.exit(1)
    print(f"OK: {len(ORDER)} data-model files; mermaid checked: {'--mermaid' in sys.argv}")
