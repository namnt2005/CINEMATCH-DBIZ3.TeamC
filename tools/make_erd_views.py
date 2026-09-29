# -*- coding: utf-8 -*-
"""Render one ERD picture per module into docs/word/data/erd-views/ (the full ERD is too wide to print).
    python3 tools/make_erd_views.py        # needs mermaid-cli (mmdc) and Chromium"""
import os, subprocess, tempfile
from dm_model import ENTITIES
from dm_model2 import R
from build_data import rel_line

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
OUT = os.path.join(ROOT, "docs", "word", "data", "erd-views")
CHROME = os.environ.get("CHROME_PATH", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome")

if __name__ == "__main__":
    owner = {e[0]: e[3] for e in ENTITIES}
    os.makedirs(OUT, exist_ok=True)
    t = tempfile.mkdtemp()
    open(f"{t}/p.json", "w").write('{"executablePath":"%s","args":["--no-sandbox"]}' % CHROME)
    for mod in ["SYS", "M1", "M0", "M2", "M3", "M4", "M5", "M7"]:
        rels = [r for r in R if owner[r[4]] == mod]
        src = "erDiagram\n" + "\n".join(rel_line(r) for r in rels) + "\n"
        src += {"M1": "    SEGMENT_REQUIREMENT\n", "M5": "    PUBLIC_HOLIDAY\n"}.get(mod, "")
        open(f"{t}/{mod}.mmd", "w").write(src)
        r = subprocess.run(["mmdc", "-p", f"{t}/p.json", "-i", f"{t}/{mod}.mmd", "-o", f"{OUT}/erd-{mod}.png",
                            "-w", "1600", "-b", "white", "-s", "2"], capture_output=True, text=True)
        print(mod, len(rels), "relationships", "ok" if r.returncode == 0 else r.stderr[-200:])
