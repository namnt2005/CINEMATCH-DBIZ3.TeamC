# -*- coding: utf-8 -*-
"""Sample legal rules (M2 plan D14, D15, D16 — decided by Nam Tran 09/11/2026).

    python3 data/seed/generate_samples.py

Writes data/seed/samples/legal_rule_samples.csv: about 16 sample rules that, with the 9 rules of the main seed, give the
~25 rules the M2 spec assumes before launch (§9). Every row is a SAMPLE (`is_sample = true`): the VFDA Legal Board writes
and signs the real rules. Citations go down to the clause and point of Article 9 of the Cinema Law (Law No. 05/2022/QH15)
as the agent read it; each citation ends with "(mẫu — chờ Ban Pháp chế VFDA kiểm)" because the clause and point may be
wrong and must be checked line by line by the Legal Board before launch.

The main seed (data/seed/NN_<table>.csv) is not touched. The file is loaded after the main seed by lib/db/client.js and
scripts/seed-supabase.mjs. Before writing, the rows are checked: unique codes and slugs across both files, citation mark,
Legal Board approver, existing rule-set version, keywords, segments, and a load into an in-memory SQLite with the schema
and the main seed (foreign keys and CHECK constraints on). Deterministic: no clock, no randomness.
"""
import csv, json, os, sqlite3, sys, uuid

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT_DIR = os.path.join(HERE, "samples")
OUT = os.path.join(OUT_DIR, "legal_rule_samples.csv")
SCHEMA = json.load(open(os.path.join(HERE, "schema.json"), encoding="utf-8"))
NS = uuid.UUID("6f1c2a8e-3b4d-5e6f-8a9b-0c1d2e3f4a5b")
U = lambda key: str(uuid.uuid5(NS, key))
J = lambda v: json.dumps(v, ensure_ascii=False, separators=(",", ":"))
MARK = "(mẫu — chờ Ban Pháp chế VFDA kiểm)"
LAW = "Luật Điện ảnh số 05/2022/QH15"
VERSION, SIGNED_AT = "2026.08", "2026-08-28T15:30:00+07:00"   # signed with the seed rules of rule set 2026.08
ALL = ["A", "B", "C"]


def read_seed(table):
    meta = SCHEMA[table.upper()]
    with open(os.path.join(HERE, meta["file"]), encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


# code, topic, severity, segments, title_en, title_vi, clause, point, keywords_vi, keywords_en, status
SAMPLES = [
 ("A9-SOV", "security", "action", ALL, "Maps, borders and national sovereignty over land, sea and islands",
  "Bản đồ, đường biên giới và chủ quyền quốc gia trên đất liền, biển, đảo", 1, "c",
  ["bản đồ", "chủ quyền", "quần đảo", "biển đảo"], ["sovereignty", "islands", "territorial waters", "border line"], "approved"),
 ("A9-STATE", "security", "action", ALL, "Content opposing the State or undermining national unity",
  "Nội dung chống phá Nhà nước, phá hoại khối đại đoàn kết toàn dân tộc", 1, "a",
  ["chống phá", "lật đổ", "bạo loạn"], ["overthrow", "uprising", "riot"], "approved"),
 ("A9-WAR", "security", "action", ALL, "Propaganda for wars of aggression or hatred between peoples",
  "Tuyên truyền chiến tranh xâm lược, gây hận thù giữa các dân tộc", 1, "b",
  ["chiến tranh xâm lược", "hận thù dân tộc"], ["war of aggression", "ethnic hatred"], "approved"),
 ("A9-VIOL", "public_order", "notice", ALL, "Graphic or incited violence", "Cảnh bạo lực hoặc kích động bạo lực", 1, "b",
  ["bạo lực", "giết người", "đánh đập"], ["violence", "murder", "beating"], "approved"),
 ("A9-SEX", "public_order", "action", ALL, "Explicit sexual content", "Nội dung khiêu dâm, đồi trụy", 1, "b",
  ["khỏa thân", "cảnh nóng"], ["nudity", "sex scene"], "approved"),
 ("A9-CRIME", "public_order", "notice", ALL, "Detailed depiction of how crimes are committed", "Mô tả chi tiết cách thức phạm tội", 1, "b",
  ["buôn lậu", "trộm cắp", "lừa đảo"], ["theft", "fraud", "robbery"], "approved"),
 ("A9-SUPER", "religion", "notice", ALL, "Superstition and harmful practices", "Mê tín dị đoan và hủ tục", 1, "b",
  ["bói toán", "yểm bùa", "mê tín"], ["fortune telling", "witchcraft", "superstition"], "approved"),
 ("A9-CUSTOM", "heritage", "notice", ALL, "Fine customs and traditions shown with disrespect", "Thuần phong mỹ tục bị thể hiện thiếu tôn trọng", 1, "b",
  ["phong tục", "tập quán", "đám cưới truyền thống"], ["custom", "tradition", "traditional wedding"], "approved"),
 ("A9-HERO", "history", "action", ALL, "National heroes and great figures", "Anh hùng dân tộc, danh nhân, vĩ nhân", 1, "c",
  ["anh hùng dân tộc", "danh nhân", "vĩ nhân"], ["national hero", "great figure"], "approved"),
 ("A9-REV", "history", "notice", ALL, "Achievements of the revolution and the resistance wars", "Thành tựu cách mạng và các cuộc kháng chiến", 1, "c",
  ["cách mạng", "kháng chiến"], ["revolution", "resistance war"], "approved"),
 ("A9-ETHNIC", "heritage", "notice", ALL, "Portrayal of ethnic groups", "Thể hiện các dân tộc, cộng đồng dân tộc thiểu số", 1, "c",
  ["dân tộc thiểu số", "người dân tộc"], ["ethnic minority", "ethnic group"], "approved"),
 ("A9-DEFAME", "privacy", "action", ALL, "Harm to the reputation of organisations or the honour of persons",
  "Xúc phạm uy tín của tổ chức, danh dự và nhân phẩm của cá nhân", 1, "d",
  ["vu khống", "bôi nhọ", "xúc phạm danh dự"], ["defame", "slander", "humiliate"], "approved"),
 ("A9-PRIV", "privacy", "notice", ALL, "Private life and personal secrets of identifiable persons", "Đời tư và bí mật cá nhân của người có thể nhận diện", 1, "đ",
  ["đời tư", "bí mật cá nhân", "camera ẩn"], ["private life", "hidden camera", "personal secret"], "approved"),
 ("A9-SECRET", "security", "action", ["A", "B"], "State secrets and restricted sites", "Bí mật nhà nước và khu vực cấm", 1, "đ",
  ["bí mật nhà nước", "tài liệu mật", "khu vực cấm"], ["state secret", "classified", "restricted area"], "approved"),
 ("A9-ANIMAL", "public_order", "notice", ALL, "Cruelty to animals shown on screen", "Cảnh ngược đãi động vật", None, None,
  ["ngược đãi động vật"], ["animal cruelty"], "draft"),
 ("A9-FLAG", "security", "action", ALL, "National flag, emblem and anthem used with disrespect", "Quốc kỳ, quốc huy, quốc ca bị sử dụng thiếu tôn trọng", None, None,
  ["quốc kỳ", "quốc huy", "quốc ca"], ["national flag", "national emblem", "national anthem"], "draft"),
]


def rows():
    cols = SCHEMA["LEGAL_RULE"]["columns"]
    legal = [u["user_id"] for u in read_seed("user_account") if u["role"] == "vfda_legal"]
    assert legal, "the main seed needs a vfda_legal account"
    out = []
    for code, topic, sev, seg, ten, tvi, clause, point, kvi, ken, status in SAMPLES:
        signed = status == "approved"
        r = {c: "" for c in cols}
        r.update(rule_id=U("sample-rule:" + code), rule_code=code, revision="1", rule_version=VERSION if signed else "",
                 title_vi=tvi, title_en=ten,
                 description_vi=f"Mô tả mẫu của quy tắc {code}: {tvi.lower()}. Bản mẫu, chờ Ban Pháp chế VFDA soạn chính thức.",
                 description_en=f"Sample description of rule {code}: {ten[0].lower() + ten[1:]}. Sample text, pending the VFDA Legal Board's wording.",
                 guidance_vi="Điểm cần cân nhắc (mẫu): nêu rõ bối cảnh, mục đích của cảnh và cách thể hiện trong kịch bản.",
                 guidance_en="Points to consider (sample): state the context, the purpose of the scene and how it is shown in the script.",
                 citation=f"Điều 9 khoản {clause} điểm {point}, {LAW} {MARK}" if signed else "",
                 severity=sev, topic=topic, rule_slug=code.lower(), status=status,
                 approved_by=legal[0] if signed else "", approved_at=SIGNED_AT if signed else "",
                 is_active="true" if signed else "false", keywords_vi=J(kvi), keywords_en=J(ken), segments=J(seg),
                 retired_version="", is_sample="true")
        out.append(r)
    return cols, out


def check(cols, samples):
    err = []
    main = read_seed("legal_rule")
    versions = {v["rule_version"] for v in read_seed("rule_set_version")}
    codes = {r["rule_code"] for r in main}
    for key in ("rule_code", "rule_slug"):
        seen = [r[key] for r in main if r["revision"] == "1"] + [r[key] for r in samples]
        if len(seen) != len(set(seen)): err.append(f"duplicate {key} across the main seed and the samples")
    total = len(main) + len(samples)
    if not 24 <= total <= 26: err.append(f"{total} rules in all; about 25 expected (D14)")
    for r in samples:
        if r["rule_code"] in codes: err.append(f"{r['rule_code']} is also in the main seed")
        if r["status"] == "approved":
            if not r["citation"].endswith(MARK): err.append(f"{r['rule_code']}: citation without the sample mark (D16)")
            if r["rule_version"] not in versions: err.append(f"{r['rule_code']}: unknown version {r['rule_version']}")
        if len(r["citation"]) > 200: err.append(f"{r['rule_code']}: citation over 200 characters")
        if len(r["title_en"]) > 200 or len(r["title_vi"]) > 200: err.append(f"{r['rule_code']}: title over 200 characters")
    # load into SQLite with the schema and the main seed: foreign keys and CHECK constraints apply
    db = sqlite3.connect(":memory:")
    for f in sorted(os.listdir(os.path.join(ROOT, "data", "schema"))):
        if f.startswith("schema-") and f.endswith(".sql"):
            db.executescript(open(os.path.join(ROOT, "data", "schema", f), encoding="utf-8").read())
    db.execute("PRAGMA foreign_keys = ON")
    for e, meta in sorted(SCHEMA.items(), key=lambda kv: kv[1]["load_order"]):
        data = read_seed(e)
        if data:
            db.executemany(f"INSERT INTO {meta['table']} ({', '.join(meta['columns'])}) VALUES ({', '.join('?' * len(meta['columns']))})",
                           [[None if r[c] == "" else r[c] for c in meta["columns"]] for r in data])
    try:
        db.executemany(f"INSERT INTO legal_rule ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})",
                       [[None if r[c] == "" else r[c] for c in cols] for r in samples])
    except sqlite3.Error as ex:
        err.append(f"SQLite refused the samples: {ex}")
    return err


def main():
    cols, samples = rows()
    err = check(cols, samples)
    if err:
        print("NOT WRITTEN:\n  - " + "\n  - ".join(err)); sys.exit(1)
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(OUT, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, lineterminator="\n")
        w.writeheader(); w.writerows(samples)
    print(f"checked and wrote {os.path.relpath(OUT, ROOT)}: {len(samples)} sample rules "
          f"({sum(r['status'] == 'approved' for r in samples)} approved), {len(samples) + len(read_seed('legal_rule'))} rules with the main seed")


if __name__ == "__main__":
    main()
