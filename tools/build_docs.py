# -*- coding: utf-8 -*-
"""Build the CINEMATCH Session 4 deliverables (English):
   docs/mvp-scope.md, docs/spec/spec-<ID>.md, docs/screens/screen-spec-<ID>.md + img/, READMEs.
   Usage: python3 build_docs.py [--img] [--mermaid]"""
import os, re, sys, subprocess, tempfile, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib
import s1_en, s2_en, s3_en, specs_a, specs_b, specs_c, specs_types, mvp
_EXTRA = [importlib.import_module(n) for n in ("s4_en", "s5_en", "s6_en", "s7_en")
          if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), n + ".py"))]

ROOT = os.environ.get("CINEMATCH_ROOT", os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")))
TODAY = "22/09/2026"
SCREENS = s1_en.SCREENS + s2_en.SCREENS + s3_en.SCREENS + [x for mod in _EXTRA for x in mod.SCREENS]
MODS = specs_a.MODULES + specs_b.MODULES + specs_c.MODULES
MODMAP = {"M-SYS": "SYS"}
EXPECTED = {"SYS": 11, "M0": 9, "M1": 3, "M2": 18, "M3": 20, "M4": 19, "M5": 8, "M7": 7, "M10": 9}
FL_ROWS = {"SYS": "1–11", "M0": "12–20", "M1": "21–23", "M2": "24–41", "M3": "42–61", "M4": "62–80", "M5": "81–88", "M7": "89–95", "M10": "96–104"}
VALID_SC = {f"SC-{i:02d}" for i in range(1, 49)}


# Screen-level open questions and how they appear in the module's section 10.
# ("dup", n): same question as module question n -> "also raised in SC-xx" is added to that row.
# ("new", owner): a question only the screen raised -> added as its own row with that owner.
# Screens written after 29/09/2026 give this as the 3rd/4th element of each oq tuple instead.
SCREEN_OQ = {
 ("SC-04", 1): ("dup", 1), ("SC-04", 2): ("dup", 2),
 ("SC-01", 1): ("new", "Client (VFDA)"), ("SC-01", 2): ("new", "Group C"), ("SC-02", 1): ("dup", 1), ("SC-02", 2): ("dup", 2),
 ("SC-10", 1): ("new", "Client (VFDA)"), ("SC-10", 2): ("dup", 3), ("SC-12", 1): ("dup", 1), ("SC-12", 2): ("dup", 2),
 ("SC-03", 1): ("dup", 6), ("SC-03", 2): ("new", "Group C"), ("SC-48", 1): ("new", "Client (VFDA Legal Board)"), ("SC-48", 2): ("dup", 4),
 ("SC-27", 1): ("dup", 1), ("SC-27", 2): ("new", "Client (VFDA)"),
 ("SC-15", 1): ("dup", 2), ("SC-14", 1): ("dup", 1), ("SC-14", 2): ("new", "Group C with VFDA"),
 ("SC-16", 1): ("new", "Client (VFDA)"), ("SC-16", 2): ("dup", 5), ("SC-17", 1): ("dup", 3), ("SC-18", 1): ("dup", 4), ("SC-18", 2): ("new", "Group C"),
 ("SC-19", 1): ("dup", 1), ("SC-19", 2): ("dup", 2), ("SC-20", 1): ("dup", 3), ("SC-20", 2): ("new", "Client (VFDA)"),
 ("SC-25", 1): ("dup", 4), ("SC-25", 2): ("dup", 5),
 ("SC-26", 1): ("dup", 1), ("SC-26", 2): ("dup", 4), ("SC-28", 1): ("new", "Client (VFDA Legal Board)"), ("SC-28", 2): ("dup", 3),
 ("SC-29", 1): ("new", "Client (VFDA Legal Board) — same question as spec-M2.md"), ("SC-29", 2): ("dup", 5),
 ("SC-32", 1): ("dup", 1), ("SC-32", 2): ("dup", 2),
}


def arrays(text):
    """Write ARRAY<T> as T[] so no type looks like a <...> template placeholder."""
    prev = None
    while prev != text:
        prev, text = text, re.sub(r"ARRAY<([^<>]*)>", r"\1[]", text)
    return text


def modid(m):
    return MODMAP.get(m, m)


def parse_fid(fid):
    m = re.match(r"F-(SYS|M\d+)-(\d+)$", fid)
    return m.group(1), int(m.group(2))


def frref(fid):
    mod, n = parse_fid(fid)
    return f"FR-{n:03d}", mod


def cell(x):
    return str(x).replace("|", "\\|").replace("\n", " ")


def tbl(head, rows):
    out = ["| " + " | ".join(head) + " |", "|" + "---|" * len(head)]
    out += ["| " + " | ".join(cell(c) for c in r) + " |" for r in rows]
    return "\n".join(out)


def bullets(xs):
    return "\n".join(f"- {x}" for x in xs)


# =====================================================================  SCREEN SPEC
def screen_md(s):
    sid = s["sid"]
    mod = modid(s["module"])
    notes = [s[k] for k in ("new_note", "merge_note", "split_note", "rename_note", "fix_note", "prio_note", "law_note") if s.get(k)]
    notes_md = ("\n**Notes against Screen List v2.0**\n\n" + bullets(notes) + "\n") if notes else ""
    rules = [(f"SR-{s['seq']:02d}{j + 1}", r, src) for j, (r, src) in enumerate(s["sr"])]
    frs = []
    for fid, what in s["fr"]:
        fr, m = frref(fid)
        frs.append((f"{fr} · spec-{m}.md ({fid})", what))
    oq = [(i + 1, x[0], "Yes" if x[1] else "No", "Open") for i, x in enumerate(s["oq"])]
    also = f" (also covers `{s['also']}`)" if s.get("also") else ""
    return f"""# Screen Spec: {sid} {s['name']}

> DBIZ3 Session 4 template — one file per screen. The Screen ID is kept from the DBIZ2 Screen List.
> The mockup image stays an image; everything around it is text.
> **Each orange numbered badge on the mockup is the row with the same number in section 3 (Element inventory).**

| Field | Value |
|---|---|
| Screen ID | `{sid}`{also} |
| Screen name | {s['name']} |
| Actor | {s['actor']} |
| Priority | {s['prio']} |
| Belongs to module | `docs/spec/spec-{mod}.md` |
| Mockup image | `img/{sid}.png` |
| Status | Draft |

*Route:* `{s['route']}` · *Screen list file:* {s['group']}, item #{s['seq']} ({s['tier']}) · *Design note from the screen list file:* {s['design_note']}
{notes_md}
## 1. Purpose

**Shown when:** {s['shown']}

**The user leaves this screen when:** {s['leave']}

## 2. Mockup

![{sid}](img/{sid}.png)

> The image is the visual contract (layout, grouping, hierarchy); the tables below are the behavioural contract.
> All data in the mockup is sample data for one fictional project (*The Last Ferry*, Harbour Line Films); organisation names, people and phone numbers are examples, not real records.

## 3. Element inventory

{tbl(["#", "Element", "Type", "Content / data source", "Required", "Validation"], s["el"])}

## 4. States

{tbl(["State", "What the user sees", "Trigger"], s["st"])}

## 5. Interactions and navigation

{tbl(["#", "Element", "User action", "System response", "Goes to screen"], [(i + 1,) + tuple(r) for i, r in enumerate(s["ix"])])}

## 6. Screen-level rules

{tbl(["Rule ID", "Rule", "Source"], rules)}

## 7. Linked requirements

{tbl(["FR ID (from the module spec)", "What this screen does for it"], frs)}

## 8. Responsive and accessibility notes

{bullets(s["resp"])}

## 9. Open questions

{tbl(["#", "Question", "Blocking?", "Status"], oq)}

## Completion checklist

- [x] The mockup is a separate cropped image file, named with the Screen ID (`img/{sid}.png`).
- [x] Every visible element in the mockup appears in the element inventory — machine-checked: badge numbers on the image = row numbers in section 3.
- [x] Every input element has a validation rule or an explicit "—".
- [x] All five states are filled in, or marked "Not applicable" with a reason.
- [x] Every navigation target is a Screen ID that exists in `docs/screen-list.md` — machine-checked.
- [x] Every element that displays data names the field it displays, matching `docs/spec/spec-{mod}.md` section 5.1.
- [ ] **Checked by a person:** _(not signed — a Group C member compares the image with the tables and signs here)_

---
*DBIZ3 Session 4 · Group C · CINEMATCH. Built on the DBIZ2 Screen Design (Screen List and Screen Layout).*
"""


# =====================================================================  MODULE SPEC
def split_fields(s):
    if not s or s.strip().lower() == "none":
        return []
    out = []
    for tok in [t.strip() for t in s.split(";") if t.strip()]:
        req = ""
        m = re.search(r"\s(Req|Opt)\s*$", tok)
        if m:
            req = "Yes" if m.group(1) == "Req" else "No"
            tok = tok[:m.start()].strip()
        parts = tok.split(None, 1)
        out.append((parts[0], parts[1] if len(parts) > 1 else "", req))
    return out


def io_rows(m):
    rows, problems = [], []
    for fid, *_ in m["fr"]:
        fr, _mod = frref(fid)
        ins, outs, note = m["io"][fid]
        fi, fo = split_fields(ins), split_fields(outs)
        if not fi:
            fi = [("—", "—", "—")]
        for name, typ, req in fi:
            if name != "—" and (not typ or req == ""):
                problems.append(f"{fid} input '{name}' missing type/required")
        for name, typ, _ in fo:
            if not typ:
                problems.append(f"{fid} output '{name}' missing type")
        n = max(len(fi), len(fo))
        for i in range(n):
            a = fi[i] if i < len(fi) else ("", "", "")
            b = fo[i] if i < len(fo) else ("", "", "")
            q = lambda x: f"`{x}`" if x and x != "—" else x
            rows.append((fr if i == 0 else "", q(a[0]), q(a[1]), a[2], q(b[0]), q(b[1]), note if i == 0 else ""))
    return rows, problems


TECH = re.compile(r"\b(API|SQL|database|Supabase|RLS|server|ms|query|JSON|Next\.js|endpoint|cache|HTML|source code|pg_cron|PostGIS)\b", re.I)


def screens_of(mod):
    return [s for s, _ in SCREENS if modid(s["module"]) == mod]


def attr_types_md(mid):
    rows = specs_types.ATTR_TYPES.get(mid)
    if not rows:
        return ""
    body = tbl(["Entity", "Attribute", "Type", "Required", "Notes"], [(e, f"`{a}`", f"`{t}`", r, n) for e, a, t, r, n in rows])
    return ("\n### 6.1 Attribute types\n\nTypes and required flags of the attributes above that no field in 5.1 declares "
            "(keys, timestamps, stored statuses). Every column of the data model now has a declared type.\n\n" + body + "\n")


def module_md(m, mermaid_ok):
    mid = m["id"]
    unconf = lambda p: "onfirmed by the Client" not in p
    derived = any("Derived" in p and unconf(p) for _, _, p in m["flows"] + m["seqs"])
    added = any("added in Step 3" in p and unconf(p) for _, _, p in m["flows"] + m["seqs"])
    confirmed_note = any(("Derived" in p or "added in" in p) and not unconf(p) for _, _, p in m["flows"] + m["seqs"])
    stories = []
    for st in m["stories"]:
        acc = "\n".join(f"{i + 1}. {a}" for i, a in enumerate(st["acc"]))
        stories.append(f"### {st['id']} ({st['p']}): {st['title']}\n\n**Journey.** {st['journey']}\n\n**Acceptance scenarios**\n\n{acc}\n")
    flows = []
    for title, code, prov in m["flows"] + m["seqs"]:
        flows.append(f"### {title}\n\n> {prov}\n\n```mermaid\n{code}\n```\n")
    fr_rows = [(frref(f)[0], f, req, actor, pr) for f, req, actor, pr in m["fr"]]
    io, io_problems = io_rows(m)
    br = m["br"]
    names = {x["sid"]: x["name"] for x, _ in SCREENS}
    msc = [(sid, name, pr, f or (f"docs/screens/screen-spec-{sid}.md" if sid in names else None)) for sid, name, pr, f in m["screens"]]
    screens = [(sid, names.get(sid, name), pr, f"`{f}`" if f else "*Not written yet*") for sid, name, pr, f in msc]
    sc = [(f"SC-{i + 1:03d}", c, how) for i, (c, how) in enumerate(m["sc"])]
    # open questions: the module's own, then every screen question, duplicates folded in
    oq = [[q if q.startswith("[NEEDS") else f"[NEEDS CLARIFICATION: {q}]", "Yes" if b else "No", owner, "Open"] for q, b, owner in m["oq"]]
    also = {}
    for s in screens_of(mid):
        for j, item in enumerate(s["oq"], 1):
            q, b = item[0], item[1]
            how = SCREEN_OQ.get((s["sid"], j)) or (("dup", item[3]) if len(item) > 3 and item[3] else ("new", item[2] if len(item) > 2 else "Client (VFDA)"))
            if how[0] == "dup":
                also.setdefault(how[1] - 1, []).append(s["sid"])
            else:
                oq.append([f"{q} *(from {s['sid']})*", "Yes" if b else "No", how[1], "Open"])
    for k, sids in also.items():
        oq[k][0] += f" *(also raised in {', '.join(sids)})*"
    oq = [tuple(r) for r in oq]
    oq = [(i + 1,) + r for i, r in enumerate(oq)]
    # checklist
    fr_ok = len(m["fr"]) == EXPECTED[mid] and [parse_fid(f)[1] for f, *_ in m["fr"]] == list(range(1, EXPECTED[mid] + 1))
    io_ok = not io_problems and set(m["io"]) == set(f for f, *_ in m["fr"])
    sc_ok = not any(TECH.search(c) for c, _ in m["sc"])
    screens_ok = all(f for *_, f in msc)
    missing_sc = [sid for sid, _, _, f in msc if not f]
    ck = lambda b: "x" if b else " "
    checklist = f"""- [{ck(fr_ok)}] Every subfunction of this module in the DBIZ2 Function List appears as an FR row ({len(m['fr'])} of {EXPECTED[mid]}, rows {FL_ROWS[mid]}) — machine-checked.
- [{ck(io_ok)}] Every Input and Output field has a type and a required flag — machine-checked.
- [{ck(mermaid_ok)}] Every Mermaid block renders without an error — {"rendered with mermaid-cli 11.14 on " + TODAY if mermaid_ok else "NOT verified"}.
- [{ck(not derived and not added)}] Every node and arrow in the Mermaid flow exists in the original DBIZ2 diagram, and nothing was invented. {"" if not (derived or added) else "**Not met:** " + ("some diagrams are marked *Derived* (no DBIZ2 figure exists); " if derived else "") + ("some decision diamonds were added in Step 3 from the Function List; " if added else "") + "each is labelled above as a Group C proposal."}{"Diagrams marked *Derived* and decision diamonds added in Step 3 are labelled above and were confirmed by the Client." if confirmed_note and not (derived or added) else ""}
- [x] At least one business rule is written that is not visible in any diagram (see 5.2).
- [{ck(screens_ok)}] Every screen this module touches is listed with an existing Screen Spec file.{"" if screens_ok else " **Not met:** no Screen Spec yet for " + ", ".join(missing_sc) + "."}
- [{ck(sc_ok)}] Success criteria contain no technology words — machine-checked against a word list.
- [x] Open questions carry the unresolved items from the Session 3 scope review (recorded in `docs/prd.md` section 5) and every point found while writing this spec; each has an owner.
- [x] The traceability table points to real files and figures, not "see the report"."""
    return f"""# Spec Document: {m['name']}

> DBIZ3 Session 4 template — one file per module. Written for a reader who has never seen the DBIZ2 report.

| Field | Value |
|---|---|
| Module ID | {mid} |
| Module name | {m['name']} |
| Spec version | v0.1 |
| Author (team member) | Nam Tran — Group C |
| Date | {TODAY} |
| Status | Draft |
| Approved by (Client role) | *Not yet — VFDA project lead (and VFDA Legal Board for legal rules)* |
| DBIZ2 source | {m['source']} |

## 1. Purpose and scope

{m['purpose']}

**In scope**

{bullets(m['in_scope'])}

**Out of scope**

{bullets(m['out_scope'])}

**Depends on**

{bullets(m['depends'])}

## 2. Actors

{tbl(["Actor", "Role in this module", "Where it comes from"], m['actors'])}

## 3. User scenarios and acceptance criteria

{chr(10).join(stories)}
### Edge cases

{bullets(m['edge'])}

## 4. Flows

{chr(10).join(flows)}
## 5. Functional requirements

{tbl(["FR ID", "DBIZ2 Subfunction ID", "Requirement (system MUST ...)", "Actor", "Priority"], fr_rows)}

### 5.1 Input / Output contract

Types and required flags come from `docs/function-list.md` (columns *Input — type and required* and *Output — type*). Changes made in Session 4 are stated in *Notes* and listed in 11.1.

{tbl(["FR ID", "Input field", "Type", "Required", "Output field", "Type", "Notes / validation"], io)}

### 5.2 Business rules

{tbl(["Rule ID", "Rule", "Why it exists"], br)}

## 6. Key entities

{tbl(["Entity", "Attributes (from Input/Output fields)", "Relationships"], m['entities'])}
{attr_types_md(mid)}
## 7. Screens involved

{tbl(["Screen ID", "Screen name", "Priority", "Screen Spec file"], screens)}

## 8. Success criteria

{tbl(["SC ID", "Criterion", "How it is measured"], sc)}

## 9. Assumptions

{bullets(m['assumptions'])}

## 10. Open questions

{tbl(["#", "Question", "Blocking?", "Owner", "Status"], oq)}

## 11. Traceability to DBIZ2

{tbl(["Spec section", "DBIZ2 source", "Location"], m['trace'])}

### 11.1 Reconciliation with DBIZ2 (System Design v2.0)

Where the 20-screen design or this spec differs from the DBIZ2 Function List, the difference is written here instead of being silently changed.

{tbl(["Topic", "DBIZ2 / System Design v2.0", "This spec", "Status"], m['recon'])}

## Completion checklist

{checklist}

---
*Template source: adapted from GitHub Spec Kit `templates/spec-template.md`, mapped onto the DBIZ2 Product Design Package. DBIZ3, VJCBI College — FTU. Group C · CINEMATCH.*
""", (fr_ok, io_ok, sc_ok, io_problems)


# =====================================================================  MVP SCOPE
def mvp_md():
    moscow = tbl(["Priority", "Feature / item", "Notes"], mvp.MOSCOW)
    backlog = tbl(["#", "Item", "Priority", "Owner", "Status"], [(i + 1,) + r for i, r in enumerate(mvp.BACKLOG)])
    link = "\n".join(f"**{k}**\n\n{bullets(v)}\n" for k, v in mvp.LINK)
    return f"""# MVP Scope & Rough Sprint Backlog

*Session 1 deliverable — Word version: `docs/word/Session-01-MVP-Scope-GroupC.docx`. Kept as the Session 1 record; the current scope is `docs/prd.md` (MVP Scope v3), which lists every change since.*

| Team / Project | Date | Completed by |
|---|---|---|
| {mvp.HEADER[0]} | {mvp.HEADER[1]} | {mvp.HEADER[2]} |

## 1. Problem Statement

{mvp.PROBLEM}

## 2. Target User (MVP)

{mvp.TARGET}

## 3. Link to the Product Design Package (DBIZ2)

{link}
## 4. MVP Scope Priority — MoSCoW

{moscow}

## 5. Rough Sprint Backlog

{backlog}

## Notes on the earlier draft

{bullets(mvp.NOTES_ON_DRAFT)}
"""


# =====================================================================  MERMAID CHECK
def check_mermaid():
    import toolpaths
    tmp = tempfile.mkdtemp()
    if not toolpaths.mmdc():
        print("mermaid check skipped: mermaid-cli (mmdc) not installed")
        return {m["id"]: False for m in MODS}
    res = {}
    for m in MODS:
        ok = True
        for i, (_, code, _) in enumerate(m["flows"] + m["seqs"]):
            f = os.path.join(tmp, f"{m['id']}_{i}.mmd")
            open(f, "w", encoding="utf-8").write(code)
            r = subprocess.run(toolpaths.mmdc_cmd(f, f + ".svg", tmp), capture_output=True, text=True, timeout=120)
            if r.returncode != 0 or not os.path.exists(f + ".svg"):
                ok = False
                print("MERMAID FAIL", m["id"], i, r.stderr[-400:])
        res[m["id"]] = ok
    return res


# =====================================================================  MAIN
def main():
    errs = []
    for s, h in SCREENS:
        ns = [int(x) for x in re.findall(r'data-n="(\d+)"', h)]
        es = [e[0] for e in s["el"]]
        if sorted(set(ns)) != es or len(ns) != len(set(ns)) or es != list(range(1, len(es) + 1)):
            errs.append(f"{s['sid']} callouts")
        for r in s["ix"]:
            for t in re.findall(r"SC-\d\d", r[3]):
                if t not in VALID_SC:
                    errs.append(f"{s['sid']} bad nav {t}")
        for fid, _ in s["fr"]:
            _, mod = frref(fid)
            if mod not in EXPECTED:
                errs.append(f"{s['sid']} FR in module without spec: {fid}")
    if errs:
        sys.exit("SCREEN ERRORS: " + "; ".join(errs))

    mer = check_mermaid() if "--mermaid" in sys.argv else {m["id"]: False for m in MODS}
    os.makedirs(f"{ROOT}/docs/spec", exist_ok=True)
    os.makedirs(f"{ROOT}/docs/screens/img", exist_ok=True)
    os.makedirs(f"{ROOT}/docs", exist_ok=True)
    for m in MODS:
        md, (fr_ok, io_ok, sc_ok, probs) = module_md(m, mer[m["id"]])
        if not (fr_ok and io_ok and sc_ok):
            print("SPEC CHECK", m["id"], fr_ok, io_ok, sc_ok, probs[:5])
        open(f"{ROOT}/docs/spec/spec-{m['id']}.md", "w", encoding="utf-8").write(arrays(md))
    for s, _ in SCREENS:
        open(f"{ROOT}/docs/screens/screen-spec-{s['sid']}.md", "w", encoding="utf-8").write(arrays(screen_md(s)))
    open(f"{ROOT}/docs/mvp-scope.md", "w", encoding="utf-8").write(mvp_md())
    if "--img" in sys.argv:
        from base import render
        render([(s["sid"], h) for s, h in SCREENS], f"{ROOT}/docs/screens/img")
    print("OK:", len(MODS), "specs,", len(SCREENS), "screen specs; mermaid:", mer)


if __name__ == "__main__":
    main()
