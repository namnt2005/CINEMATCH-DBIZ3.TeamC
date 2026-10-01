# -*- coding: utf-8 -*-
"""Build the physical schema data/schema/schema-<MODULE>.sql from the logical model (dm_model2.C) and
data/seed/schema.json.   python3 tools/build_schema.py   (run after build_data.py)

Portable SQL: the same files run on SQLite 3 and PostgreSQL 14+.
- One file per owning module; tables inside a file are in load order (parents first).
- ENUM(...)       -> VARCHAR + CHECK (col IN (...))     (no vendor enum types)
- ARRAY<...>, JSONB -> JSONB holding a JSON array / object (as in the seed files)
- FILE           -> TEXT (a storage path, never the bytes; same decision as DOCUMENT.file_path, M5 §6.1)
- NOT NULL       = Req in the model, except the 7 columns that are optional in storage (04, Type conflicts)
- Named CHECK constraints carry the business rules that can be checked inside one row; rules that span
  tables are enforced by seed_rules.py on the data and by triggers / RLS at the Plan step (see each
  data/data-model-<MODULE>.md, section 7)."""
import json, os, re, sys
from collections import OrderedDict
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dm_model import ENTITIES
from dm_model2 import C

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
S = json.load(open(os.path.join(ROOT, "data", "seed", "schema.json"), encoding="utf-8"))
OUT = os.path.join(ROOT, "data", "schema")
MODULE_ORDER = ["SYS", "M1", "M0", "M2", "M3", "M4", "M5", "M7", "M10"]
OWNER = {e[0]: e[3] for e in ENTITIES}
NAME = {"SYS": "Platform foundation", "M1": "Segment router", "M0": "Project workspace and readiness dashboard",
        "M2": "Content pre-check and Article 13 dossier check", "M3": "Location discovery",
        "M4": "Vietnamese service partners", "M5": "Dossier kit, bilingual drafts and countdown",
        "M7": "VFDA support", "M10": "VFDA back office"}
STORAGE_OPTIONAL = {("LEGAL_RULE", "approved_by"), ("LEGAL_RULE", "citation"), ("BILINGUAL_PARAGRAPH", "reviewed_by"),
                    ("PROVINCE_NOTICE", "reviewed_by"), ("PROVINCE_NOTICE", "response"), ("CONSULTATION_BOOKING", "officer_id"),
                    ("QUARTERLY_REPORT", "reread_by")}
B = lambda col: f"CAST({col} AS TEXT) = 'true'"          # boolean test that SQLite (text 'true') and PostgreSQL agree on

# Business rules checkable inside one row: (entity, constraint name, expression, rule it enforces)
ROW_RULES = [
 ("SEGMENT_DECISION", "ck_segment_decision_one_owner", "(project_id IS NULL) <> (session_key IS NULL)", "M1 §6.1 — a decision belongs to a saved project or to an anonymous session, never both"),
 ("PROJECT", "ck_project_days_not_negative", "buffer_days >= 0 AND (shoot_days_vn IS NULL OR shoot_days_vn >= 0)", "M2 BR-006 — the safety buffer is a number of days"),
 ("READINESS_SNAPSHOT", "ck_readiness_snapshot_range", "readiness_total BETWEEN 0 AND 100", "M0 §5.1 FR-008 — a percentage"),
 ("LEGAL_RULE", "ck_legal_rule_approved_needs_signature", "status <> 'approved' OR (citation IS NOT NULL AND approved_by IS NOT NULL)", "M2 BR-002 — active only with a citation and an approver"),
 ("LEGAL_RULE", "ck_legal_rule_active_matches_status", f"({B('is_active')}) = (status = 'approved')", "04 minimality — upkeep rule of is_active"),
 ("PRECHECK_FINDING", "ck_precheck_finding_span_matches_quote", "span_end - span_start = LENGTH(quoted_text)", "M2 §6.1 — the span is the quoted passage"),
 ("LOCATION", "ck_location_published_matches_status", f"({B('published')}) = (intake_status = 'published')", "M3 BR-004, BR-008 — published only in the published state"),
 ("LOCATION", "ck_location_in_vietnam", "lat BETWEEN 8 AND 24 AND lng BETWEEN 102 AND 110", "M3 §5.1 FR-002 — coordinates inside Vietnam"),
 ("LOCATION_QUERY", "ck_location_query_length", "LENGTH(scene_description) BETWEEN 10 AND 1000", "M3 §5.1 FR-010 — 10 to 1000 characters"),
 ("ORGANISATION", "ck_organisation_badge_dates", "verified_until IS NULL OR verified_until > verified_at", "M4 BR-004 — a badge ends after it starts"),
 ("COLLAB_REQUEST", "ck_collab_request_confirmed_at", "(status = 'confirmed') = (confirmed_at IS NOT NULL)", "M4 BR-005 — only a confirmed request has a confirmation time"),
 ("DOCUMENT", "ck_document_version_positive", "version >= 1", "M5 §6.1 — versions count from 1"),
 ("BILINGUAL_PARAGRAPH", "ck_bilingual_paragraph_reviewer", "status <> 'reviewed' OR reviewed_by IS NOT NULL", "M5 BR-002, FR-006 — a proofread paragraph names its proofreader"),
 ("PUBLIC_HOLIDAY", "ck_public_holiday_dates", "end_date >= start_date", "M5 §6.1 — a holiday ends on or after its first day"),
 ("MODERATION_ITEM", "ck_moderation_item_one_target", "(organisation_id IS NULL) <> (location_image_id IS NULL)", "M10 §6 — exactly one target (04 Structural findings)"),
 ("MODERATION_ITEM", "ck_moderation_item_target_matches_type",
  "(content_type = 'org_profile' AND organisation_id IS NOT NULL) OR (content_type = 'location_image' AND location_image_id IS NOT NULL) OR content_type = 'showcase'",
  "M10 §5.1 FR-001 — the target matches the content type"),
 ("MODERATION_ITEM", "ck_moderation_item_hidden_needs_reason", "content_status <> 'hidden' OR reason IS NOT NULL", "M10 BR-002 — hiding needs a reason"),
 ("QUARTERLY_REPORT", "ck_quarterly_report_period", "period_end >= period_start", "M10 §5.1 FR-003 — a period"),
 ("QUARTERLY_REPORT", "ck_quarterly_report_reread_before_export", "exported_at IS NULL OR reread_by IS NOT NULL", "M10 BR-004 — no export before a reread"),
]


def sql_type(t):
    if t.startswith("ENUM("):
        vals = [v.strip() for v in t[5:-1].split(",")]
        return f"VARCHAR({max(20, max(len(v) for v in vals))})"
    if t.startswith("ARRAY<") or t == "JSONB":
        return "JSONB"
    if t == "FILE":
        return "TEXT"
    return t


def table_sql(e):
    m = S[e]; cols = {c[0]: c for c in C[e]}
    lines, cons = [], []
    for name in m["columns"]:
        c = cols[name]
        nn = name in m["pk"] or (c[2] == "Req" and (e, name) not in STORAGE_OPTIONAL)
        lines.append(f"    {name} {sql_type(c[1])}{' NOT NULL' if nn else ''}")
    cons.append(f"    CONSTRAINT pk_{m['table']} PRIMARY KEY ({', '.join(m['pk'])})")
    for c in C[e]:
        if "UK" in c[3]:
            cons.append(f"    CONSTRAINT uq_{m['table']}_{c[0]} UNIQUE ({c[0]})")
    for name, vals in m["enums"].items():
        quoted = ", ".join(f"'{v}'" for v in vals)
        cons.append(f"    CONSTRAINT ck_{m['table']}_{name} CHECK ({name} IN ({quoted}))")
    # foreign keys, grouped as in seed_rules.validate (composite keys share the target's key names)
    by_target = OrderedDict()
    for fk in m["fk"]: by_target.setdefault(fk["references"], []).append(fk)
    for tgt, fks in by_target.items():
        tpk, ttab = S[tgt]["pk"], S[tgt]["table"]
        if len(tpk) > 1:
            groups = [([f["column"] for f in fks], tpk)]
        else:
            groups = [([f["column"]], [f["ref_column"] or tpk[0]]) for f in fks]
        for g, tcols in groups:
            cons.append(f"    CONSTRAINT fk_{m['table']}_{'_'.join(g)} FOREIGN KEY ({', '.join(g)}) REFERENCES {ttab} ({', '.join(tcols)})")
    for ent, name, expr, why in ROW_RULES:
        if ent == e:
            cons.append(f"    -- {why}\n    CONSTRAINT {name} CHECK ({expr})")
    body = ",\n".join(lines + cons)
    return f"-- {e}: {next(x[1] for x in ENTITIES if x[0] == e)} (owner {OWNER[e]}; seed file {m['file']})\nCREATE TABLE {m['table']} (\n{body}\n);\n"


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.startswith("schema-") and f.endswith(".sql"): os.remove(os.path.join(OUT, f))
    known = {r[0] for r in ROW_RULES}
    assert known <= set(S), known - set(S)
    summary = OrderedDict()
    for mod in MODULE_ORDER:
        ents = [e for e in S if OWNER[e] == mod]           # S is already in load order
        head = (f"-- schema-{mod}.sql — {NAME[mod]} ({mod})\n"
                f"-- Generated by tools/build_schema.py from data/04-data-model.md (logical model) and data/seed/schema.json.\n"
                f"-- Portable SQL: SQLite 3 and PostgreSQL 14+. {len(ents)} tables, in load order.\n"
                "-- Load: run every data/schema/schema-*.sql, then the data/seed/NN_<table>.csv files in filename order\n"
                "-- (python3 data/schema/load_check.py does both and reports any error).\n"
                "-- Rules that span tables are not here: see data/data-model-" + mod + ".md, section 7.\n\n")
        body = "\n".join(table_sql(e) for e in ents)
        open(os.path.join(OUT, f"schema-{mod}.sql"), "w", encoding="utf-8").write(head + body)
        summary[mod] = {"tables": len(ents), "columns": sum(len(S[e]["columns"]) for e in ents),
                        "fks": body.count("FOREIGN KEY"), "checks": body.count(" CHECK (")}
    json.dump(summary, open(os.path.join(OUT, "schema-summary.json"), "w"), indent=1)
    print("schema written:", ", ".join(f"{k} {v['tables']}t/{v['fks']}fk/{v['checks']}ck" for k, v in summary.items()))


if __name__ == "__main__":
    main()
