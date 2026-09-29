# -*- coding: utf-8 -*-
"""Usage: python3 check_en.py s1_en   -> validates a translated screen module and renders its PNGs
to tools/preview/<SID>.png"""
import importlib, re, sys
from base import render

VN = re.compile(r"[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹÀ-Ỹ]", re.I)
ALLOWED = ["Tràng An", "Ninh Bình", "Hải Phòng", "Quảng Trị", "Cần Thơ", "Lan Hạ", "Cát Bà", "Phong Nha",
           "Cái Răng", "Bến Xưa", "Đò Ngang", "Lam Hà", "Hội An", "Đà Nẵng", "Hà Nội", "Quảng Ninh", "Huế",
           "Hạ Long", "Nội Bài", "Hoa Lư", "Tam Cốc", "Bích Động", "Bái Đính", "Phát Diệm", "Vân Long",
           "Thanh Hóa", "Hồ Chí Minh", "Tết", "Tư", "Hà Nam", "Nam Định", "Quảng Nam", "Hà Giang",
           "Quảng Bình", "Sông Son", "Mi-rae", "N. T. H.", "Thu H.", "Việt", "VI", "Điều", "Nghị định",
           "Luật", "đò", "người lái đò", "bến", "núi đá vôi", "phà", "Năm 1972", "ông Tư", "Một đêm",
           "Nhiều năm sau", "Mi-rae từ Seoul", "Kính gửi", "Ủy ban", "V/v", "Hiệp hội", "Tiếng Việt"]

mod = importlib.import_module(sys.argv[1])
bad = 0
for spec, html in mod.SCREENS:
    ns = [int(x) for x in re.findall(r'data-n="(\d+)"', html)]
    es = [e[0] for e in spec["el"]]
    if sorted(set(ns)) != es or len(ns) != len(set(ns)):
        bad += 1; print(spec["sid"], "CALLOUT MISMATCH", sorted(ns), es)
    if len(spec["st"]) != 5:
        bad += 1; print(spec["sid"], "STATES != 5")
    # leftover Vietnamese (outside allowed proper nouns / quoted Vietnamese sample text)
    blob = html + " " + repr(spec)
    for a in ALLOWED:
        blob = blob.replace(a, "")
    hits = sorted(set(m.group(0) for m in re.finditer(r"\S*" + VN.pattern + r"\S*", blob, re.I)))
    if hits:
        print(spec["sid"], "possible untranslated words:", hits[:25])
render([(s["sid"], h) for s, h in mod.SCREENS], "" + __import__("os").path.join(__import__("os").path.dirname(__file__), "preview") + "")
print("structural errors:", bad)
