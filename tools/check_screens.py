# -*- coding: utf-8 -*-
"""Check one screen-data module without touching the repository.
    python3 tools/check_screens.py s4_en [--out DIR] [--img]
Checks: badge numbers = inventory rows, required keys, navigation targets, FR modules,
five states, open-question tuple format. Writes the Markdown (and PNGs with --img) to DIR."""
import importlib, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("CINEMATCH_ROOT", "/nonexistent")
import build_docs as bd  # noqa: E402

KEYS = ["seq", "sid", "name", "group", "tier", "module", "actor", "prio", "route", "design_note",
        "shown", "leave", "el", "st", "ix", "sr", "fr", "resp", "oq"]
STATES = ["Default", "Empty (no data)", "Loading", "Error", "Success / confirmation"]


def main():
    name = sys.argv[1]
    out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else f"/tmp/screens-{name}"
    mod = importlib.import_module(name)
    errs = []
    known_fr = {f for m in bd.MODS for f, *_ in m["fr"]}
    for s, h in mod.SCREENS:
        sid = s.get("sid", "?")
        for k in KEYS:
            if k not in s:
                errs.append(f"{sid}: missing key {k}")
        ns = [int(x) for x in re.findall(r'data-n="(\d+)"', h)]
        es = [e[0] for e in s["el"]]
        if sorted(ns) != es or es != list(range(1, len(es) + 1)):
            errs.append(f"{sid}: badges {sorted(ns)} != inventory rows {es}")
        for e in s["el"]:
            if len(e) != 6:
                errs.append(f"{sid}: inventory row {e[0]} must have 6 fields")
        if [x[0] for x in s["st"]] != STATES:
            errs.append(f"{sid}: states must be exactly {STATES}")
        for r in s["ix"]:
            if len(r) != 4:
                errs.append(f"{sid}: interaction row must have 4 fields: {r}")
            for t in re.findall(r"SC-\d\d", r[3]):
                if t not in bd.VALID_SC:
                    errs.append(f"{sid}: bad navigation target {t}")
        for fid, _ in s["fr"]:
            if fid not in known_fr:
                errs.append(f"{sid}: unknown subfunction {fid}")
        for q in s["oq"]:
            if not (isinstance(q, tuple) and 2 <= len(q) <= 4 and q[0].startswith("[NEEDS CLARIFICATION:")):
                errs.append(f"{sid}: open question must be ('[NEEDS CLARIFICATION: ...]', blocking, owner[, dup_of_module_question_number]): {q}")
    os.makedirs(out, exist_ok=True)
    for s, _ in mod.SCREENS:
        open(f"{out}/screen-spec-{s['sid']}.md", "w", encoding="utf-8").write(bd.arrays(bd.screen_md(s)))
    if "--img" in sys.argv:
        from base import render
        render([(s["sid"], h) for s, h in mod.SCREENS], f"{out}/img")
    print("\n".join(errs) if errs else f"OK: {len(mod.SCREENS)} screens; output in {out}")
    sys.exit(1 if errs else 0)


if __name__ == "__main__":
    main()
