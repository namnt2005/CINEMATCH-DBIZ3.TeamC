# -*- coding: utf-8 -*-
"""Write the three index files from the same data as the specs:
   docs/spec/spec-document.md (Spec Index), docs/spec/README.md, docs/screens/README.md.
   Run after build_docs.py and build_data.py:  python3 tools/build_index.py"""
import os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_docs as bd  # noqa: E402

ROOT = bd.ROOT
ORDER = ["SYS", "M1", "M0", "M2", "M3", "M4", "M5", "M7", "M10"]
MODS = {m["id"]: m for m in bd.MODS}
tbl = bd.tbl


def spec_text(mid):
    return open(f"{ROOT}/docs/spec/spec-{mid}.md", encoding="utf-8").read()


def section(t, start, end):
    return t.split(start, 1)[1].split(end, 1)[0]


def stats(mid):
    t = spec_text(mid)
    m = MODS[mid]
    s10 = section(t, "## 10. Open questions", "## 11.")
    rows = re.findall(r"^\| \d+ \| .*\| (Yes|No) \| (.*?) \| Open \|$", s10, re.M)
    screens = sorted({sid for sid, *_ in m["screens"]})
    return dict(title=m["name"], frs=len(m["fr"]), must=sum(1 for *_, p in m["fr"] if p == "Must"),
                brs=len(m["br"]), us=len(m["stories"]), screens=screens,
                oq=len(rows), block=sum(1 for b, _ in rows if b == "Yes"))


def entities():
    t = open(f"{ROOT}/data/01-entity-dictionary.md", encoding="utf-8").read()
    sec = t.split("## Entities", 1)[1]
    out = []
    for line in sec.split("\n"):
        mm = re.match(r"\| `([A-Z_]+)` \| (.*?) \| (.*?) \| (.*?) \|", line)
        if mm:
            out.append(mm.groups())
        elif out and line.startswith("## "):
            break
    return out


def spec_index():
    st = {m: stats(m) for m in ORDER}
    rows = [(m, f"[`spec-{m}.md`](spec-{m}.md)", s["title"], s["frs"], s["brs"], s["us"], ", ".join(s["screens"]), f"{s['oq']} ({s['block']} blocking)") for m, s in st.items()]
    tot = [sum(s[k] for s in st.values()) for k in ("frs", "brs", "us", "oq", "block")]
    nscreens = len({x for s in st.values() for x in s["screens"]})
    rows.append(("**Total**", "", "", f"**{tot[0]}**", f"**{tot[1]}**", f"**{tot[2]}**", f"{nscreens} screens", f"**{tot[3]} ({tot[4]} blocking)**"))
    ent = entities()
    stored = sum(1 for e in ent if not e[2].startswith("DERIVED"))
    er = [(i + 1, f"`{n}`", d, k, o) for i, (n, d, k, o) in enumerate(ent)]
    brs = [(m, i, s) for m in ORDER for i, s, _ in MODS[m]["br"]]
    return f"""# Spec Index: CINEMATCH

CINEMATCH has one Spec Document **per module**, not one single file. This file is the entry point that the Session 6 setup guide and `AGENTS.md` name as `docs/spec/spec-document.md`. It lists the nine module files, shows where each section of the Session 4 template lives, and gathers in one place the two things a reader most often needs across modules: the entities (section 5.1) and the business rules (section 6).

It adds no requirement of its own. If this index and a module file ever disagree, **the module file wins**.

*DBIZ3 · Group C · Session 4 Spec Documents, indexed for the Session 7 midterm · 30/09/2026*

## 1. The nine module Spec Documents

{tbl(["Module", "File", "Scope", "Functional requirements", "Business rules", "User stories", "Screens (§7)", "Open questions (§10)"], rows)}

Modules `M6`, `M8` and `M9` are *Won't* for this release (see `docs/prd.md` section 4.4) and have no Spec Document.

## 2. Where each template section lives

Every module file follows the same Session 4 template, so the same section number means the same thing in every module file. (This index uses its own numbering: its section 5.1 lists entities and its section 6 lists business rules.)

| Section in a module file | Content |
|---|---|
| §1 | Purpose and scope |
| §2 | Actors |
| §3 | User scenarios and acceptance criteria (`US-n`, Given/When/Then) |
| §4 | Flows: usage flow and sequence diagrams (Mermaid) |
| §5 | Functional requirements (`FR-nnn` = DBIZ2 `F-<MODULE>-nn`); §5.1 Input / Output contract; §5.2 Business rules (`BR-nnn`) |
| §6 | Key entities of the module |
| §7 | Screens involved (Screen Specs in `docs/screens/`) |
| §8 | Success criteria (`SC-nnn`) |
| §9 | Assumptions, including the test values used until the Client confirms a number |
| §10 | Open questions — `[NEEDS CLARIFICATION: …]`, each with an owner |
| §11 | Traceability to DBIZ2, with §11.1 Reconciliation |

Functional requirement and business rule IDs restart in every file, so always quote them with the module: “`FR-008` in `spec-M3.md`”, “M3 BR-004”.

## 3. Related documents

| Document | Path |
|---|---|
| Product requirements (MVP Scope v3) | `docs/prd.md` |
| MVP scope, Session 1 record | `docs/mvp-scope.md` |
| Function List (119 subfunctions, 104 in the MVP) | `docs/function-list.md` |
| Screen List (48 screens) | `docs/screen-list.md` |
| Architecture diagrams | `docs/architecture/` |
| Screen Specs and mockups ({len(bd.SCREENS)} screens) | `docs/screens/` |
| Data model and seed data | `data/` |
| Word copies of the Spec Documents | `docs/word/specs/` |

## 4. Reading order

Start with the module you are working on: its §3 says what the user must be able to do, §5 says what the system must do, §6 and `data/04-data-model.md` say what is stored, §7 names the screens, §10 says what is still open.

## 5. Functional requirements and data

The {tot[0]} functional requirements are in §5 of the module files (table in section 1 above). The data they read and write is summarised here.

### 5.1 Entities

The entities of CINEMATCH, with the canonical names used by the Session 5 data model (`data/01-entity-dictionary.md`). {len(ent)} entities: {stored} are stored as tables (one CSV each in `data/seed/`) and {len(ent) - stored} are *derived* — computed on read, never stored.

{tbl(["#", "Entity", "Definition", "Kind", "Owner module"], er)}

Columns, keys and relationships: `data/04-data-model.md`. Diagram: `data/03-erd.mmd`.

## 6. Business rules

One principle runs through the rules of every module: **CINEMATCH prepares and advises, but a person decides.** A language model never ranks, approves or submits anything (M2 BR-001, BR-003, BR-004; M3 BR-001; M5 BR-001; M10 BR-004), sensitive data is protected in the database, not in the interface (SYS BR-001, M3 BR-005, M4 BR-001), and nothing is ever hard-deleted (SYS BR-005, M0 BR-005, M2 BR-008, M3 BR-008, M4 BR-008, M10 BR-005).

All business rules, as written in §5.2 of each module file:

{tbl(["Module", "Rule", "Statement"], brs)}
""", st, tot


def spec_readme(st, tot):
    rows = [(f"[`spec-{m}.md`](spec-{m}.md)", m, s["title"], f"{s['frs']} ({s['must']} Must)", ", ".join(s["screens"]), f"{s['oq']} ({s['block']} blocking)") for m, s in st.items()]
    rows.append(("**Total**", "", "", f"**{tot[0]}**", "", f"**{tot[3]} ({tot[4]} blocking)**"))
    return f"""# docs/spec/ — Spec Documents (Session 4, Step 5)

One file per module, following the Session 4 Spec Document template (11 sections + completion checklist).
Word copies are in `../word/specs/`.
[`spec-document.md`](spec-document.md) is the index of the nine files: where each template section lives, the entities (section 5.1) and all business rules (section 6) in one place.

{tbl(["File", "Module ID", "Module", "FR rows", "Screen Specs used", "Open questions"], rows)}

## How to read a Spec Document

- **FR IDs restart in each module** (`FR-001` …) and map one-to-one to the DBIZ2 Subfunction ID: `FR-008` in `spec-M3.md` is `F-M3-08`. Screen Specs cite both.
- **Section 4** diagrams are marked *Textualised* (from a DBIZ2 figure), *Excerpt* (part of one) or *Derived* (no DBIZ2 figure existed). Derived diagrams and the decision diamonds added in Step 3 were confirmed by the Client, except the new M10 diagram, which is marked as a Group C proposal.
- **Section 9** lists the test values used until the Client confirms a number, so every acceptance scenario can be turned into a test today.
- **Section 10** lists every open point as `[NEEDS CLARIFICATION: …]` with an owner. Questions raised on a screen are folded into the module's list: a duplicate is marked *also raised in SC-xx*; a new one is marked *from SC-xx*.
- **Section 11.1 Reconciliation** lists every place where the design differs from the DBIZ2 Function List, instead of changing it silently.

## Out of scope for this release

- **M6, M8, M9** are *Won't* (see `../prd.md` section 4.4).

## Regenerating

The module files are generated from `tools/specs_a.py`, `specs_b.py` and `specs_c.py` by `python3 tools/build_docs.py --mermaid`; this README and `spec-document.md` by `python3 tools/build_index.py`.
"""


def screens_readme():
    order = {m: i for i, m in enumerate(ORDER)}
    rows = []
    ss = sorted([s for s, _ in bd.SCREENS], key=lambda s: (order.get(bd.modid(s["module"]), 99), s["sid"]))
    for i, s in enumerate(ss, 1):
        mod = bd.modid(s["module"])
        batch = "Added 30/09/2026" if str(s.get("tier", "")).startswith("Added") else s.get("tier", "")
        name = s["name"] + (f" (+{s['also']})" if s.get("also") else "")
        rows.append((i, s["sid"], name, f"`spec-{mod}.md`", s["prio"], batch, f"[img](img/{s['sid']}.png)", f"[spec](screen-spec-{s['sid']}.md)"))
    n_el = sum(len(s["el"]) for s in ss)
    n_sr = sum(len(s["sr"]) for s in ss)
    covered = sorted({s["sid"] for s in ss} | {s["also"] for s in ss if s.get("also")})
    return f"""# docs/screens/ — Screen Specs (Session 4, Step 4)

Every screen in the MVP scope of `docs/screen-list.md` has a mockup `img/<SCREEN-ID>.png` and a `screen-spec-<SCREEN-ID>.md` following the Session 4 Screen Spec template: **{len(ss)} Screen Specs** covering **{len(covered)} Screen IDs** (three specs also cover a merged screen: `SC-05`, `SC-11`, `SC-24`). The first 20 are the team's priority screens (Tier 1: 17 Must, Tier 2: 3 Should); the other {len(ss) - 20} were added on 30/09/2026 so that every module's screens are specified.
Word copies are in `../word/screens/`.

**Reading the mockups:** each orange numbered badge on an image is the row with the same number in section 3 (*Element inventory*) of that screen's spec.
Badges and rows are machine-checked to match one-to-one on all {len(ss)} screens ({n_el} elements, {n_sr} screen-level rules).

{tbl(["#", "Screen ID", "Screen", "Module spec", "Priority", "Tier / batch", "Mockup", "Spec"], rows)}

## Notes

- **Merged screens:** `SC-04` also covers `SC-05`, `SC-10` also covers `SC-11`, `SC-25` also covers `SC-24`.
- **Article 9 and Article 13:** `SC-48` screens content against Article 9 (prohibited content); `SC-27` checks the dossier against Article 13. Group C adopted this reading and the Screen List note was updated.
- **Sample data:** every mockup uses the same fictional project (*The Last Ferry*, Harbour Line Films) and the personas of the seed data; phone numbers and emails are fake.
- **Rule IDs:** screen-level rules are numbered by screen sequence (`SR-011` = screen 1, rule 1; `SR-351` = screen 35, rule 1).
- **Open questions** in section 9 of a Screen Spec are also listed, with an owner, in section 10 of its module spec.

## Regenerating

The mockups are HTML/CSS rendered by Chromium, and the specs are generated from the same data, so text and badges cannot drift apart.

```
python3 tools/build_docs.py --img
```
"""


if __name__ == "__main__":
    idx, st, tot = spec_index()
    open(f"{ROOT}/docs/spec/spec-document.md", "w", encoding="utf-8").write(bd.arrays(idx))
    open(f"{ROOT}/docs/spec/README.md", "w", encoding="utf-8").write(spec_readme(st, tot))
    open(f"{ROOT}/docs/screens/README.md", "w", encoding="utf-8").write(screens_readme())
    print("index written:", tot)
