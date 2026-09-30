# -*- coding: utf-8 -*-
"""CINEMATCH seed data generator (Session 5, step S5).

    python3 data/seed/generate_seed.py        # writes data/seed/<table>.csv
    python3 data/seed/check_seed.py           # FK, required, enum, timestamp checks

Deterministic: no randomness, no clock. IDs are UUIDv5 of a readable key, so the same run always
produces byte-identical files (Session 6 smoke test T2). Column order comes from schema.json,
which is generated from 04-data-model.md. Rows are sorted by primary key; UTF-8, LF, ISO dates.

One fictional story runs through the rows, the same as the 20 mockups: project *The Last Ferry*,
Harbour Line Films (Korea), segment A, first shooting day 2027-03-15, readiness 58 %,
Bến Xưa Production Services has accepted the request and waits for confirmation.
All companies, people, phone numbers and e-mail addresses are fictional; every phone number has the
form +84 000 000 1xx, which cannot be a real Vietnamese number.
"""
import csv, json, os, uuid

HERE = os.path.dirname(os.path.abspath(__file__))
SCHEMA = json.load(open(os.path.join(HERE, "schema.json"), encoding="utf-8"))
NS = uuid.UUID("6f1c2a8e-3b4d-5e6f-8a9b-0c1d2e3f4a5b")
U = lambda key: str(uuid.uuid5(NS, key))
J = lambda v: json.dumps(v, ensure_ascii=False, separators=(",", ":"))
def fit(text, n, filler=" — continued description for the boundary row"):
    """Extend text to exactly n characters: the longest value the logical model permits."""
    while len(text) < n:
        text += filler
    return text[:n]
TS = lambda d, t="09:00": f"{d}T{t}:00+07:00"
PHONE = lambda n: f"+84 000 000 {100 + n}"      # clearly fake, unique per row (n = 1..99)
ROWS = {e: [] for e in SCHEMA}

def add(entity, **kw):
    cols = SCHEMA[entity]["columns"]
    unknown = set(kw) - set(cols)
    if unknown:
        raise KeyError(f"{entity}: unknown columns {unknown}")
    ROWS[entity].append({c: kw.get(c, "") for c in cols})

# ------------------------------------------------------------------ provinces (34 units, 2025)
PROV = [
 ("Hà Nội","ha-noi","north",[]),("Huế","hue","central",[]),("Lai Châu","lai-chau","north",[]),
 ("Điện Biên","dien-bien","north",[]),("Sơn La","son-la","north",[]),("Lạng Sơn","lang-son","north",[]),
 ("Quảng Ninh","quang-ninh","north",[]),("Thanh Hóa","thanh-hoa","central",[]),("Nghệ An","nghe-an","central",[]),
 ("Hà Tĩnh","ha-tinh","central",[]),("Cao Bằng","cao-bang","north",[]),
 ("Tuyên Quang","tuyen-quang","north",["Tuyên Quang","Hà Giang"]),("Lào Cai","lao-cai","north",["Lào Cai","Yên Bái"]),
 ("Thái Nguyên","thai-nguyen","north",["Thái Nguyên","Bắc Kạn"]),("Phú Thọ","phu-tho","north",["Phú Thọ","Vĩnh Phúc","Hòa Bình"]),
 ("Bắc Ninh","bac-ninh","north",["Bắc Ninh","Bắc Giang"]),("Hưng Yên","hung-yen","north",["Hưng Yên","Thái Bình"]),
 ("Hải Phòng","hai-phong","north",["Hải Phòng","Hải Dương"]),("Ninh Bình","ninh-binh","north",["Ninh Bình","Hà Nam","Nam Định"]),
 ("Quảng Trị","quang-tri","central",["Quảng Trị","Quảng Bình"]),("Đà Nẵng","da-nang","central",["Đà Nẵng","Quảng Nam"]),
 ("Quảng Ngãi","quang-ngai","central",["Quảng Ngãi","Kon Tum"]),("Gia Lai","gia-lai","central",["Gia Lai","Bình Định"]),
 ("Khánh Hòa","khanh-hoa","central",["Khánh Hòa","Ninh Thuận"]),("Lâm Đồng","lam-dong","central",["Lâm Đồng","Đắk Nông","Bình Thuận"]),
 ("Đắk Lắk","dak-lak","central",["Đắk Lắk","Phú Yên"]),
 ("Thành phố Hồ Chí Minh","ho-chi-minh","south",["Thành phố Hồ Chí Minh","Bình Dương","Bà Rịa - Vũng Tàu"]),
 ("Đồng Nai","dong-nai","south",["Đồng Nai","Bình Phước"]),("Tây Ninh","tay-ninh","south",["Tây Ninh","Long An"]),
 ("Cần Thơ","can-tho","south",["Cần Thơ","Sóc Trăng","Hậu Giang"]),("Vĩnh Long","vinh-long","south",["Vĩnh Long","Bến Tre","Trà Vinh"]),
 ("Đồng Tháp","dong-thap","south",["Đồng Tháp","Tiền Giang"]),("Cà Mau","ca-mau","south",["Cà Mau","Bạc Liêu"]),
 ("An Giang","an-giang","south",["An Giang","Kiên Giang"]),
]
P = {}
for i, (name, slug, region, merged) in enumerate(PROV, 1):
    P[slug] = i
    add("PROVINCE", province_id=i, name=name, slug=slug, region=region, merged_from=J(merged) if merged else "")

# ------------------------------------------------------------------ accounts
USERS = [  # key, email, verified, role, created, full_name, crew_role, locale, producer_org
 ("park","lena.park@harbourline.example.kr",True,"member","2026-08-30","Lena Park","producer","en","harbour"),
 ("han","jiwoo.han@harbourline.example.kr",True,"member","2026-09-02","Han Ji-woo","line_producer","en","harbour"),
 ("laurent","sophie.laurent@lumierenord.example.fr",True,"member","2026-09-05","Sophie Laurent","producer","en","lumiere"),
 ("okafor","daniel.okafor@kestrelpictures.example.co.uk",True,"member","2026-09-20","Daniel Okafor","director","en","kestrel"),
 ("tanaka","yui.tanaka@sakuralane.example.jp",True,"member","2026-09-08","Tanaka Yui","production_coordinator","en","sakura"),
 ("walsh","liam.walsh@northwinddocs.example.com.au",True,"member","2026-07-14","Liam Walsh","producer","en","northwind"),
 ("rossi","mateo.rossi@rossifilm.example.it",False,"member","2026-09-27","Mateo Rossi","other","en","rossi"),
 ("thuha","thuha.nguyen@vfda-demo.example.vn",True,"vfda_staff","2026-06-01","Nguyễn Thị Thu Hà","other","vi",""),
 ("phuc","phuc.le@vfda-demo.example.vn",True,"vfda_staff","2026-06-01","Lê Hoàng Phúc","other","vi",""),
 ("quan","quan.tran@vfda-demo.example.vn",True,"vfda_legal","2026-06-01","Trần Minh Quân","other","vi",""),
 ("ducanh","ducanh.vu@vfda-demo.example.vn",True,"admin","2026-05-20","Vũ Đức Anh","other","vi",""),
 ("lan","lan.pham@benxua.example.vn",True,"partner","2026-06-10","Phạm Ngọc Lan","line_producer","vi",""),
 ("khai","khai.do@dongang.example.vn",True,"partner","2026-03-05","Đỗ Văn Khải","production_coordinator","vi",""),
 ("tuan","tuan.huynh@mekongframe.example.vn",True,"partner","2026-09-10","Huỳnh Minh Tuấn","line_producer","vi",""),
 ("long",fit("international.coproductions.and.location.services.desk", 64, ".team") + "@" +
  ".".join(fit(w, 55, "-desk") for w in ("coproduction-department", "international-location-services", "asia-pacific-region")) +
  "." + fit("harbourline", 10, "x") + ".example.kr",
  True,"member","2026-09-15",
  fit("Alexandria Konstantinopoulou-Nguyễn Thị Phương Thảo de la Fontaine-Wickramasinghe, Head of International Co-productions", 120, " Jr"),
  "other","vi","harbour"),
 # deleted by its owner on SC-08: deactivated and anonymised, rows it created are kept (SYS BR-005)
 ("former","former-member-" + U("user:former")[:8] + "@anonymised.example",True,"member","2026-07-01","Former member",
  "production_coordinator","en","northwind"),
]
DEACTIVATED = {"former"}
# `guest` is never stored: a guest is a visitor without an account, and a new account is always `member` (SYS BR-002)
UID = {k: U("user:" + k) for k, *_ in USERS}
ORGP = {  # producer organisations
 "harbour": ("Harbour Line Films","KR","https://harbourline.example.kr"),
 "lumiere": ("Lumière Nord Productions","FR","https://lumierenord.example.fr"),
 "kestrel": ("Kestrel Pictures","GB",""),
 "sakura": ("Sakura Lane Studio","JP","https://sakuralane.example.jp"),
 "northwind": ("Northwind Documentary","AU","https://northwinddocs.example.com.au"),
 "rossi": ("Rossi Film S.r.l.","IT",""),
 "boundary": (fit("International Documentary and Fiction Co-production Consortium of the Greater Mekong Subregion for Film, Television, "
                  "Streaming Series, Commercials and Music Videos — Registered Office Hồ Chí Minh City", 200, " and Partners"), "VN",
              fit("https://www.international-documentary-and-fiction-coproduction-consortium-greater-mekong-subregion.example.org/", 300, "legal/")),
}
PO = {k: U("porg:" + k) for k in ORGP}
for k, (n, c, w) in ORGP.items():
    add("PRODUCER_ORGANISATION", producer_org_id=PO[k], org_name=n, country=c, website=w)
for k, email, ver, role, created, name, crew, loc, org in USERS:
    add("USER_ACCOUNT", user_id=UID[k], email=email, email_verified=str(ver).lower(), role=role,
        account_status="deactivated" if k in DEACTIVATED else "active", created_at=TS(created, "10:00"))
    add("PROFILE", user_id=UID[k], full_name=name, crew_role=crew, locale=loc, producer_org_id=PO[org] if org else "")
    add("CONSENT", user_id=UID[k], consent_version="2026.1", accepted_at=TS(created, "10:01"))
add("CONSENT", user_id=UID["park"], consent_version="2026.2", accepted_at=TS("2026-09-20", "08:15"))
add("CONSENT", user_id=UID["long"], consent_version="2026.2-rev-a-final-1", accepted_at=TS("2026-09-20", "08:16"))

# ------------------------------------------------------------------ M1 segment router
SR = [("r1",True,"abroad","foreign","A","2026.1"),("r2",True,"vietnam","foreign","B","2026.1"),
      ("r3",True,"both","foreign","B","2026.1"),("r4",True,"vietnam","vietnamese","B","2026.1"),
      ("r5",False,"","","C","2026.1"),("r6",True,"abroad","coproduction","A","2026.1"),
      ("r0",True,"abroad","foreign","A","2025.12")]   # superseded version, never used by a decision
SRID = {k: U("segrule:" + k) for k, *_ in SR}
for k, q1, q2, q3, seg, ver in SR:
    add("SEGMENT_RULE", segment_rule_id=SRID[k], q1_shoot_in_vn=str(q1).lower(), q2_release=q2, q3_producer=q3,
        result_segment=seg, version=ver)
REQ = [("A","ART13_LICENCE","Giấy phép quay phim sử dụng bối cảnh tại Việt Nam","Filming licence (Article 13)",True),
       ("A","VN_SERVICE_AGREEMENT","Thỏa thuận với tổ chức cung cấp dịch vụ Việt Nam","Agreement with a Vietnamese service provider",True),
       ("A","FILM_CLASSIFICATION","Phân loại phim để phổ biến tại Việt Nam","Classification for release in Vietnam",False),
       ("B","ART13_LICENCE","Giấy phép quay phim sử dụng bối cảnh tại Việt Nam","Filming licence (Article 13)",True),
       ("B","VN_SERVICE_AGREEMENT","Thỏa thuận với tổ chức cung cấp dịch vụ Việt Nam","Agreement with a Vietnamese service provider",True),
       ("B","FILM_CLASSIFICATION","Phân loại phim để phổ biến tại Việt Nam","Classification for release in Vietnam",True),
       ("C","ART13_LICENCE","Giấy phép quay phim sử dụng bối cảnh tại Việt Nam","Filming licence (Article 13)",False),
       ("C","SERVICE_CONTRACT","Hợp đồng dịch vụ với đối tác Việt Nam","Service contract with a Vietnamese partner",True)]
for seg, code, lvi, len_, need in REQ:
    add("SEGMENT_REQUIREMENT", segment=seg, requirement_code=code, label_vi=lvi, label_en=len_, needed=str(need).lower())

# ------------------------------------------------------------------ M0 projects
PROJ = {  # key: org, name, format, segment, shoot, buffer, days, crew, logline, stage, updated
 "ferry": ("harbour","The Last Ferry","feature","A","2027-03-15",7,24,"15_50",
           "In 1972 an old ferryman carries villagers between the limestone karsts of Ninh Bình; decades later his granddaughter returns from Seoul.",
           "preparing","2026-09-22"),
 "rice": ("lumiere","Rice and Salt","documentary","B","2027-05-10",14,18,"u15",
          "A year with salt farmers and rice growers of the Mekong Delta, filmed for release in Vietnam and France.","preparing","2026-09-19"),
 "signal": ("harbour","Monsoon Signal","commercial","C","",7,"","","","draft","2026-09-21"),
 "sapa": ("northwind","Above the Terraces","tv","A","2027-01-20",7,10,"u15",
          "A four-part series following the harvest season in the rice terraces of Mù Cang Chải.","preparing","2026-09-12"),
 "lantern": ("sakura","Lantern Street","feature","A","2027-06-01",21,30,"o50",
             "A night-market love story set in the lantern-lit lanes of Hội An.","preparing","2026-09-18"),
 "blues": ("harbour","Quiet Harbour Blues","music_video","A","2026-11-10",7,3,"u15",
           "A music video shot on the wharves of Hạ Long at dawn.","preparing","2026-09-10"),
 "long": ("boundary",fit("The Very Long Road from the Northern Mountains of Hà Giang to the Southernmost Cape of Cà Mau: "
          "A Journey Through Thirty-Four Provinces, Their People, Their Rivers and the Stories They Tell at the End of the Day", 200, " Again"),
          "documentary","B","2031-12-31",0,0,"o50",
          fit("A documentary that travels the length of Vietnam, stopping in every one of the thirty-four provinces to film one river, "
              "one market and one family at the end of a working day.", 500, " The journey continues southwards."),"draft","2026-09-25"),
 "old": ("lumiere","Harbour Lights (cancelled)","feature","A","2026-06-01",7,12,"15_50",
         "Cancelled after the co-producer withdrew.","archived","2026-05-01"),
}
PID = {k: U("project:" + k) for k in PROJ}
for k, (org, name, fmt, seg, shoot, buf, days, crew, log, stage, upd) in PROJ.items():
    add("PROJECT", project_id=PID[k], producer_org_id=PO[org], project_name=name, format=fmt, segment=seg,
        shoot_date=shoot, buffer_days=buf, shoot_days_vn=days, crew_size_band=crew, logline=log, stage=stage,
        updated_at=TS(upd, "17:30"))
MEM = [("ferry","park","park@","edit","accepted"),("ferry","han","han@","edit","accepted"),
       ("rice","laurent","laurent@","edit","accepted"),("signal","park","park@","edit","accepted"),
       ("sapa","walsh","walsh@","edit","accepted"),("lantern","tanaka","tanaka@","edit","accepted"),
       ("blues","park","park@","edit","accepted"),("long","long","long@","edit","accepted"),
       ("old","laurent","laurent@","edit","accepted"),
       ("ferry","","seo.yeon.kim@harbourline.example.kr","view","pending"),   # invited, no account yet
       ("rice","okafor","okafor@","view","accepted"),
       ("sapa","former","former@","view","accepted")]   # kept after the account was deactivated (SYS BR-005)
EMAIL = {k: e for k, e, *_ in USERS}
for proj, user, mail, perm, st in MEM:
    email = EMAIL[user] if user else mail
    add("PROJECT_MEMBER", member_id=U(f"member:{proj}:{email}"), project_id=PID[proj], user_id=UID[user] if user else "",
        invitee_email=email, permission=perm, invite_status=st)
for proj, prov in [("ferry","ninh-binh"),("ferry","quang-ninh"),("rice","can-tho"),("rice","an-giang"),("sapa","lao-cai"),
                   ("lantern","da-nang"),("blues","quang-ninh"),("long","tuyen-quang"),("long","ca-mau")]:
    add("PROJECT_PROVINCE", project_id=PID[proj], province_id=P[prov])
for d, v in [("2026-09-20","41.00"),("2026-09-21","44.50"),("2026-09-22","52.00"),("2026-09-23","55.00"),
             ("2026-09-24","58.00"),("2026-09-25","58.00"),("2026-09-26","58.00"),("2026-09-27","58.00")]:
    add("READINESS_SNAPSHOT", snapshot_id=U("snap:ferry:" + d), project_id=PID["ferry"], snapshot_date=d, readiness_total=v)
for proj, d, v in [("rice","2026-09-27","37.50"),("sapa","2026-09-27","22.00"),("lantern","2026-09-27","31.00"),
                   ("long","2026-09-27","0.00"),("blues","2026-09-27","100.00")]:
    add("READINESS_SNAPSHOT", snapshot_id=U(f"snap:{proj}:{d}"), project_id=PID[proj], snapshot_date=d, readiness_total=v)

# ------------------------------------------------------------------ M1 decisions
DEC = [("ferry","r1",True,"abroad","foreign",["locations","crew"],"A","",[1,2,3]),
       ("rice","r1",True,"abroad","foreign",["locations"],"A","",[1,2,3]),              # first answer: abroad only
       ("rice","r2",True,"vietnam","foreign",["locations","logistics"],"B","",[1,2,3]),  # changed to B (M1 US-3), documents kept
       ("sapa","r1",True,"abroad","foreign",["locations"],"A","",[1,2,3]),
       ("lantern","r1",True,"abroad","foreign",["locations","cast"],"A","",[1,2,3]),
       ("signal","r5",False,"","",["cast"],"C","",[1]),
       ("session:7c1e9a40","r1",True,"abroad","foreign",[],"B","B",[1,2,3]),      # override A -> B (M1 US-2)
       ("session:2b88f0d1","",False,"","",["locations"],"","",[]),               # answers match no rule (M1 edge case)
       ("session:c4d2a716","r6",True,"abroad","coproduction",["crew"],"A","",[1,2,3]),
       ("session:5e0f7b22","r3",True,"both","foreign",["equipment","locations"],"B","",[1,2,3]),
       ("session:9a31c4e8","r4",True,"vietnam","vietnamese",["crew","equipment"],"B","",[1,2,3]),
       ("session:d71f2c09","r2",True,"vietnam","foreign",["locations"],"A","A",[1,2,3]),   # override B -> A
       ("session:0b6e93aa","r1",True,"abroad","foreign",["cast"],"C","C",[1,2,3])]        # override A -> C
for i, (ref, rule, q1, q2, q3, q4, seg, ov, by) in enumerate(DEC):
    ref_val = ref if ref.startswith("session:") else PID[ref]
    add("SEGMENT_DECISION", segment_decision_id=U(f"decision:{i}:{ref}"), session_or_project_id=ref_val,
        segment_rule_id=SRID[rule] if rule else "", q1_shoot_in_vn=str(q1).lower(), q2_release=q2, q3_producer=q3,
        q4_needs=J(q4), segment=seg, segment_override=ov, decided_by=J(by),
        journey_config=J({"gauges": ["content","locations","partners"] + ([] if seg == "C" else ["dossier"])}) if seg else "")

# ------------------------------------------------------------------ M2 legal rules
for v, d in [("2026.06","2026-06-15"),("2026.07","2026-07-20"),("2026.08","2026-08-28")]:
    add("RULE_SET_VERSION", rule_version=v, created_at=TS(d, "16:00"), created_by=UID["quan"])
LR = [  # code, version, title_en, title_vi, severity, topic, status, approved
 ("A9-MIL","2026.06","Military uniforms, weapons or installations on screen","Quân phục, vũ khí hoặc công trình quân sự","action","security","approved"),
 ("A9-HIST","2026.07","Historical figures and events","Nhân vật và sự kiện lịch sử","notice","history","approved"),
 ("A9-RELIG","2026.07","Religious sites and practices","Cơ sở và nghi lễ tôn giáo","notice","religion","approved"),
 ("A9-PERSON","2026.08","Real, identifiable persons","Người thật, có thể nhận diện","notice","privacy","approved"),
 ("A13-DOSSIER","2026.06","Four dossier components under Article 13, clause 3","Bốn thành phần hồ sơ theo khoản 3 Điều 13","action","dossier","approved"),
 ("A9-DRUG","","Depiction of drug use","Mô tả việc sử dụng ma túy","action","public_order","draft"),       # draft: no citation, no approver
 ("A9-HERIT","","Filming inside a protected heritage zone","Quay phim trong khu vực di sản được bảo vệ","notice","heritage","draft"),
 ("A9-MAP","2026.06","Maps showing national borders (replaced by A9-LONG)","Bản đồ thể hiện đường biên giới quốc gia (thay bằng A9-LONG)","action","security","retired"),
 ("A9-LONG","2026.08",("Scenes involving border areas, border markers, border guard posts and the movement of people or goods "
   "across national borders, including dramatised smuggling, in any segment and any format of production")[:200],
   "Cảnh quay liên quan đến khu vực biên giới, cột mốc và đồn biên phòng","action","security","approved"),
]
for code, ver, ten, tvi, sev, topic, st in LR:
    ok = st in ("approved", "retired")       # a retired rule was signed before; it is never deleted (M2 BR-008)
    add("LEGAL_RULE", rule_id=U("rule:" + code), rule_code=code, rule_version=ver, title_vi=tvi, title_en=ten,
        description_vi=f"Mô tả quy tắc {code} — bản mẫu, chờ Ban Pháp chế VFDA soạn chính thức.",
        description_en=f"Description of rule {code} — mockup text, pending the VFDA Legal Board's wording.",
        guidance_vi="Điểm cần cân nhắc: nêu rõ bối cảnh và cách thể hiện trong kịch bản tóm tắt.",
        guidance_en="Points to consider: state the context and how it is shown in the synopsis.",
        citation=("Law 05/2022/QH15, Art. 13(3)" if code.startswith("A13") else "Law 05/2022/QH15, Art. 9") if ok else "",
        severity=sev, topic=topic, rule_slug=code.lower(), status=st,
        approved_by=UID["quan"] if ok else "", approved_at=TS("2026-08-28" if ver == "2026.08" else "2026-07-20" if ver == "2026.07" else "2026-06-15", "15:30") if ok else "",
        is_active=str(st == "approved").lower())

SYN = ("In 1972, an old ferryman carries villagers across a river between limestone karsts at dawn. One night, soldiers ask him "
       "to take them across in secret.")
PR = [  # key, project, version, lang, flags, country, level, created
 ("ferry1","ferry","2026.08","en",{"real_person":"no","military":"yes","heritage_site":"unsure"},"KR","medium","2026-09-15"),
 ("g-fr","","2026.08","en",{"real_person":"no","military":"no","heritage_site":"no"},"FR","low","2026-09-16"),
 ("g-us","","2026.08","en",{"real_person":"yes","military":"no","heritage_site":"no"},"US","medium","2026-09-17"),
 ("g-vi","","2026.08","vi",{"real_person":"no","military":"yes","heritage_site":"yes"},"VN","high","2026-09-18"),
 ("g-jp","","2026.07","en",{},"JP","low","2026-08-02"),
 ("g-dropped","","2026.08","en",{"real_person":"unsure","military":"unsure","heritage_site":"unsure"},"","","2026-09-26"),  # every finding dropped
 ("rice1","rice","2026.08","en",{"real_person":"no","military":"no","heritage_site":"no"},"FR","low","2026-09-19"),
]
for k, proj, ver, lang, flags, cc, lvl, d in PR:
    add("PRECHECK_RUN", brief_id=U("brief:" + k), project_id=PID[proj] if proj else "", rule_version=ver,
        synopsis_hash=U("hash:" + k).replace("-", ""), lang=lang, flags=J(flags) if flags else "", country_guess=cc,
        attention_level=lvl, created_at=TS(d, "11:00"))
for k, code, s0, s1, q in [("ferry1","A9-HIST",3,10,"In 1972"),("ferry1","A9-MIL",65,118,"soldiers ask him to take them across in secret"),
                           ("g-us","A9-PERSON",0,24,"Based on the life of a"),("g-vi","A9-MIL",12,40,"đồn biên phòng trên núi"),
                           ("g-vi","A9-LONG",41,70,"vượt biên giới vào ban đêm"),("g-vi","A9-HIST",80,96,"năm 1979")]:
    add("PRECHECK_FINDING", brief_id=U("brief:" + k), rule_code=code, span_start=s0, span_end=s1, quoted_text=q,
        explanation_vi=f"Đoạn này liên quan đến quy tắc {code}; hội đồng thẩm định thường xem xét kỹ nội dung này.",
        explanation_en=f"This passage relates to rule {code}; appraisal boards usually look closely at such content.")
for k, proj, ver, d in [("ferry-a","ferry","2026.07","2026-08-10"),("ferry-b","ferry","2026.08","2026-09-15"),
                        ("rice-a","rice","2026.08","2026-09-19"),("lantern-a","lantern","2026.08","2026-09-18"),
                        ("sapa-a","sapa","2026.08","2026-09-12")]:
    add("COMPLIANCE_RUN", run_id=U("run:" + k), project_id=PID[proj], rule_version=ver, run_at=TS(d, "14:00"))
for k, run, code, q, st, note in [
    ("f1","ferry-a","A9-HIST","In 1972","reviewed","Setting confirmed with Bến Xưa; no real persons."),
    ("f2","ferry-a","A9-MIL","soldiers ask him to take them across in secret","reviewed","Uniforms will be fictional, no insignia."),
    ("f3","ferry-b","A9-HIST","In 1972","open",""),
    ("f4","ferry-b","A9-MIL","soldiers ask him to take them across in secret","reviewed","Same as previous run."),
    ("f5","rice-a","A9-PERSON","the Nguyễn family of Bạc Liêu","open",""),
    ("f6","lantern-a","A9-RELIG","the lantern procession at Chùa Cầu","reviewed","Procession staged, no ceremony filmed.")]:
    add("COMPLIANCE_FINDING", finding_id=U("finding:" + k), run_id=U("run:" + run), rule_code=code, quoted_text=q,
        finding_status=st, reviewer_note=note)

# ------------------------------------------------------------------ M3 locations
LOC = [  # key, prov, vi, en, district, lat, lng, airport, scenes, crew, lodge, power, truck, avoid, permit, published
 ("trang-an","ninh-binh","Quần thể danh thắng Tràng An","Tràng An Landscape Complex","Hoa Lư",20.253600,105.891700,95,
  ["karst","river","village"],"15_50",True,True,True,[9,10],"high",True),
 ("tam-coc","ninh-binh","Tam Cốc – Bích Động","Tam Coc – Bich Dong","Hoa Lư",20.215000,105.938000,100,
  ["karst","river","rice_field"],"15_50",True,True,True,[9],"medium",True),
 ("ha-long","quang-ninh","Vịnh Hạ Long","Ha Long Bay","Hạ Long",20.910100,107.183900,50,
  ["sea","karst","floating_village"],"o50",True,True,False,[7,8,9],"high",True),
 ("phong-nha","quang-tri","Động Phong Nha","Phong Nha Cave","Bố Trạch",17.591000,106.283200,45,
  ["cave","river","jungle"],"u15",True,False,False,[10,11],"high",True),
 ("hoi-an","da-nang","Phố cổ Hội An","Hội An Ancient Town","Hội An",15.880100,108.338000,30,
  ["old_town","river","market"],"15_50",True,True,True,[10,11],"medium",True),
 ("mu-cang-chai","lao-cai","Ruộng bậc thang Mù Cang Chải","Mù Cang Chải Rice Terraces","Mù Cang Chải",21.852000,104.090000,280,
  ["rice_terrace","mountain","village"],"u15",False,False,False,[1,2,7],"low",True),
 ("cai-rang","can-tho","Chợ nổi Cái Răng","Cái Răng Floating Market","Cái Răng",10.005600,105.747000,12,
  ["river","market","floating_village"],"15_50",True,True,True,[],"medium",True),
 ("dong-van","tuyen-quang","Cao nguyên đá Đồng Văn","Đồng Văn Karst Plateau","Đồng Văn",23.279000,105.362000,420,
  ["karst","mountain","village"],"u15",False,False,False,[12,1],"medium",True),
 ("mui-ne","lam-dong","Đồi cát Mũi Né","Mũi Né Sand Dunes","Phan Thiết",10.933300,108.287000,190,
  ["dunes","sea"],"15_50",True,True,True,[],"low",False),          # contact not verified -> cannot publish
 ("ca-mau-cape","ca-mau",
  fit("Khu du lịch Mũi Cà Mau – điểm cực Nam của Tổ quốc, rừng ngập mặn ven biển và bãi bồi tại huyện Ngọc Hiển, nơi đất liền vươn ra biển mỗi năm hàng chục mét", 200, " và rừng đước"),
  fit("Cà Mau Cape — the southernmost point of mainland Vietnam, with coastal mangrove forest and mudflats that grow into the sea every year", 200, " and mangroves"),
  "Ngọc Hiển",8.615000,104.724000,400,["mangrove","sea","village"],"u15",False,False,False,[1,2,3,4,5,6,7,8,9,10,11,12],"high",True),
 ("cua-van","quang-ninh","Làng chài Cửa Vạn","Cửa Vạn Fishing Village","Hạ Long",20.845000,107.155000,55,
  ["floating_village","sea","village"],"u15",False,False,False,[7,8,9],"medium",False),   # unpublished (M3 BR-008), still shortlisted
]
UNPUBLISHED = {"cua-van": "Unpublished by VFDA: the floating village has moved ashore (2026-09)."}
LID = {k: U("location:" + k) for k, *_ in LOC}
for k, prov, vi, en, dist, lat, lng, air, sc, crew, lo, pw, tr, av, pc, pub in LOC:
    add("LOCATION", location_id=LID[k], slug=k, province_id=P[prov], name_vi=vi, name_en=en, district=dist,
        lat=f"{lat:.6f}", lng=f"{lng:.6f}", airport_km=air, scene_types=J(sc),
        desc_vi=f"{vi}: mô tả bối cảnh do VFDA biên soạn — bản mẫu.", desc_en=f"{en}: location description written by VFDA — mockup text.",
        crew_capacity=crew, lodging_20km=str(lo).lower(), grid_power=str(pw).lower(), truck_access=str(tr).lower(),
        months_to_avoid=J(av), permit_complexity=pc,
        restriction_note="Drones need a separate airspace permit." if k in ("ha-long","trang-an") else "",
        intake_status="published" if pub else "unpublished" if k in UNPUBLISHED else "awaiting_contact", published=str(pub).lower(),
        blocked_reason="" if pub else UNPUBLISHED.get(k, "Authority contact not verified (M3 BR-004)."))
for k, n, src, right, st in [("trang-an",1,"VFDA field visit 2026-05","VFDA owned","approved"),("trang-an",2,"Ninh Bình Tourism Department","Licensed to VFDA","approved"),
                             ("ha-long",1,"VFDA field visit 2026-04","VFDA owned","approved"),("phong-nha",1,"Phong Nha – Kẻ Bàng National Park","Licensed to VFDA","approved"),
                             ("hoi-an",1,"VFDA field visit 2026-06","VFDA owned","approved"),("mu-cang-chai",1,"Photographer Lương Quốc Việt","Licensed to VFDA","approved"),
                             ("cai-rang",1,"VFDA field visit 2026-07","VFDA owned","approved"),("mui-ne",1,"Unknown — found online","Unclear","hidden"),
                             ("dong-van",1,"VFDA field visit 2026-08","VFDA owned","pending"),
                             ("cai-rang",2,"Mekong Frame Co. (partner upload)","Owned by Mekong Frame Co., licensed to VFDA","pending")]:
    add("LOCATION_IMAGE", image_url=f"https://storage.cinematch.example/locations/{k}/{n:02d}.jpg", location_id=LID[k],
        image_source=src, usage_right=right, status=st)
AC = [("trang-an","Ban Quản lý Quần thể danh thắng Tràng An","Bùi Văn Thành",PHONE(1),"lienhe@trangan.example.vn",True,"2026-05-20"),
      ("tam-coc","UBND phường Hoa Lư","Đinh Thị Mai",PHONE(2),"",True,"2026-05-21"),
      ("ha-long","Ban Quản lý vịnh Hạ Long","Hoàng Văn Sơn",PHONE(3),"phim@halongbay.example.vn",True,"2026-04-12"),
      ("phong-nha","Ban Quản lý Vườn quốc gia Phong Nha – Kẻ Bàng","Trương Quang Hải",PHONE(4),"",True,"2026-06-02"),
      ("hoi-an","Trung tâm Quản lý bảo tồn di sản văn hóa Hội An","Nguyễn Thị Hoa",PHONE(5),"disan@hoian.example.vn",True,"2026-06-18"),
      ("mu-cang-chai","UBND xã Mù Cang Chải","Giàng A Páo",PHONE(6),"",True,"2026-07-08"),
      ("cai-rang","UBND phường Cái Răng","Lâm Văn Hùng",PHONE(7),"",True,"2026-07-15"),
      ("dong-van","UBND xã Đồng Văn","Vàng Mí Sính",PHONE(8),"",True,"2026-08-19"),
      ("mui-ne","UBND phường Mũi Né","Phan Văn Lộc",PHONE(9),"",False,""),
      ("ca-mau-cape","Ban Quản lý Vườn quốc gia Mũi Cà Mau","Tạ Thị Kim Ngân",PHONE(10),"vqg@muicamau.example.vn",True,"2016-01-04"),
      ("cua-van","UBND phường Hồng Gai","Vũ Thị Hằng",PHONE(11),"",True,"2026-06-15")]
for k, auth, name, phone, mail, ver, d in AC:
    add("AUTHORITY_CONTACT", location_id=LID[k], authority_name=auth, contact_name=name, contact_phone=phone,
        contact_email=mail, verified_by=UID["thuha"] if ver else UID["phuc"], verified_at=TS(d, "10:00") if ver else "",
        contact_verified=str(ver).lower())
for proj, loc, role in [("ferry","trang-an","primary"),("ferry","tam-coc","backup"),("ferry","ha-long","backup"),
                        ("rice","cai-rang","primary"),("sapa","mu-cang-chai","primary"),("lantern","hoi-an","primary"),
                        ("blues","ha-long","primary"),("blues","cua-van","backup"),("long","ca-mau-cape","primary")]:
    add("PROJECT_SHORTLIST", shortlist_id=U(f"short:{proj}:{loc}"), project_id=PID[proj], location_id=LID[loc], role=role)

# ------------------------------------------------------------------ M4 partners
ORG = [  # key, name, legal, founded, hq, groups, provinces, verified_at, until, art13
 ("benxua","Bến Xưa Production Services","Công ty TNHH",2012,"ha-noi",["full_production","permits_paperwork","crew"],["ha-noi","ninh-binh","hai-phong"],"2026-06-12","2027-06-12",True),
 ("dongang","Đò Ngang Film Services","Công ty cổ phần",2015,"hue",["full_production","location_management"],["hue","da-nang","quang-tri"],"2026-03-20","2027-03-20",True),
 ("mekong","Mekong Frame Co.","Công ty TNHH",2019,"can-tho",["full_production","transport_logistics"],["can-tho","ho-chi-minh"],"","",False),
 ("saigonline","Saigon Line Crew","Công ty TNHH",2016,"ho-chi-minh",["crew","camera_lighting"],["ho-chi-minh","dong-nai"],"2026-02-10","2027-02-10",False),
 ("halongmarine","Hạ Long Marine Logistics","Công ty TNHH",2011,"quang-ninh",["transport_logistics","lodging_catering"],["quang-ninh","hai-phong"],"2026-04-02","2027-04-02",False),
 ("hoiancasting","Hội An Casting House","Hộ kinh doanh",2020,"da-nang",["casting","interpreting"],["da-nang"],"","",False),
 ("songhau","Sông Hậu Film Services","Công ty TNHH",2014,"can-tho",["full_production","location_management"],["can-tho","vinh-long"],"2025-08-15","2026-08-15",True),  # badge expired
 ("hanoigrip","Hanoi Grip & Light","Công ty TNHH",2021,"ha-noi",["camera_lighting","studios_interiors"],["ha-noi"],"","",False),  # new, no requests, no layers
 ("long",fit("Công ty Cổ phần Dịch vụ Sản xuất Phim, Truyền hình, Quảng cáo, Âm nhạc và Tổ chức Sự kiện Quốc tế Đồng bằng sông Cửu Long – Chi nhánh Thành phố Hồ Chí Minh", 200, " và các tỉnh"),
  "Công ty cổ phần",1990,"ho-chi-minh",["full_production","permits_paperwork","casting","crew","camera_lighting","studios_interiors","location_management",
  "transport_logistics","lodging_catering","interpreting","insurance_legal","post_production"],[s for _, s, _, _ in PROV],"2026-09-01","2027-09-01",True),
 ("cuulongdrone","Cửu Long Drone Works","Công ty TNHH",2018,"can-tho",["camera_lighting","post_production"],["can-tho","vinh-long"],"","",False),  # deactivated (M4 BR-008)
]
DEACTIVATED_ORGS = {"cuulongdrone"}
OID = {k: U("org:" + k) for k, *_ in ORG}
for k, name, legal, fy, hq, groups, provs, va, vu, a13 in ORG:
    add("ORGANISATION", org_id=OID[k], slug=k, org_name=name, legal_form=legal, founded_year=fy, hq_province=P[hq],
        service_groups=J(groups), provinces=J([P[p] for p in provs]), verified_at=TS(va, "11:00") if va else "",
        verified_until=vu, art13_eligible=str(a13).lower(), org_status="deactivated" if k in DEACTIVATED_ORGS else "active")
LAYERS = [
    ("benxua","Sản xuất trọn gói, xin phép và điều phối đoàn quốc tế.","Full production services, permits and coordination of international crews.",12,["en","ko"]),
    ("dongang","Dịch vụ sản xuất và khảo sát bối cảnh miền Trung.","Production services and location scouting in central Vietnam.",7,["en","fr"]),
    ("mekong","Dịch vụ sản xuất và hậu cần vùng Đồng bằng sông Cửu Long.","Production and logistics in the Mekong Delta.",2,["en"]),
    ("saigonline","Đội ngũ kỹ thuật và cho thuê thiết bị.","Crew and camera rental.",9,["en","ja"]),
    ("halongmarine","Tàu thuyền, lưu trú và hậu cần trên vịnh.","Boats, lodging and logistics on the bay.",5,["en","zh"]),
    ("hoiancasting","Tuyển diễn viên và phiên dịch.","Casting and interpreting.",0,["en"]),
    ("songhau","Sản xuất trọn gói miền Tây.","Full production services in the Mekong Delta.",4,["en","fr"]),
    ("long","Dịch vụ sản xuất phim trọn gói trên toàn quốc.","Nationwide full production services.",40,["en","fr","ko","ja","zh","de"])]
for n, (k, cap_vi, cap_en, n_intl, langs) in enumerate(LAYERS, 21):
    add("ORGANISATION_MEMBER_LAYER", org_id=OID[k], capability_desc_vi=cap_vi, capability_desc_en=cap_en,
        portfolio=J([f"Portfolio project {i}" for i in range(1, min(n_intl, 3) + 1)]) if n_intl else "",
        intl_project_count=n_intl, working_languages=J(langs))
    add("ORGANISATION_PRIVATE_LAYER", org_id=OID[k],
        rate_card=J({"line_producer_day_vnd": 6500000, "fixer_day_vnd": 3000000}) if k != "hoiancasting" else "",
        past_clients=J(["Kestrel Pictures","Northwind Documentary"]) if n_intl else "",
        direct_contact={"benxua":"Phạm Ngọc Lan","dongang":"Đỗ Văn Khải","mekong":"Huỳnh Minh Tuấn"}.get(k, "Office") + " · " + PHONE(n))
for k, org, refs, st, by, reason in [
    ("v1","benxua",["Seoul Night (KR, 2024)","Blue River (FR, 2025)"],"approved","thuha",""),
    ("v2","dongang",["Imperial City (JP, 2023)","The Pass (AU, 2025)"],"approved","thuha",""),
    ("v3","saigonline",["Neon Delta (US, 2024)","Commercial for a Korean airline (2025)"],"approved","phuc",""),
    ("v4","halongmarine",["Bay of Dragons (CN, 2023)","Travel series (UK, 2024)"],"approved","phuc",""),
    ("v5","hoiancasting",["Student short film (2025)"],"rejected","thuha","Only one reference project; two are required (M4 FR-008)."),
    ("v6","songhau",["River Voices (FR, 2024)","Delta Life (DE, 2025)"],"approved","phuc",""),
    ("v7","mekong",["Mangrove Song (VN, 2025)","Floating Market (KR, 2026)"],"pending","",""),
    ("v8","long",["Ref 1","Ref 2","Ref 3"],"approved","ducanh","")]:
    add("VERIFICATION_REQUEST", request_id=U("verif:" + k), org_id=OID[org],
        business_license=f"private/verification/{k}/business-registration.pdf", reference_projects=J(refs),
        status=st, decided_by=UID[by] if by else "", reason=reason)
CR = [  # key, project, org, services, note, status, response, sent, responded, confirmed
 ("c1","ferry","benxua",["full_production","permits_paperwork"],"We need a Vietnamese entity for the Article 13 dossier and a line producer in Ninh Bình.",
  "accepted","Happy to support. Proposal attached; rates available after the NDA.","2026-09-18","2026-09-22",""),
 ("c2","ferry","halongmarine",["transport_logistics"],"Boats for 3 days in Hạ Long (backup location).","under_review","","2026-09-20","2026-09-21",""),
 ("c3","ferry","dongang",["location_management"],"Scouting in Quảng Trị.","withdrawn","","2026-09-01","",""),
 ("c4","rice","songhau",["full_production"],"Mekong Delta shoot, May 2027.","info_requested","Please share the shooting schedule by week.","2026-09-12","2026-09-14",""),
 ("c5","lantern","hoiancasting",["casting"],"30 extras for a night-market scene.","declined","Not available in June 2027.","2026-09-10","2026-09-11",""),
 ("c6","sapa","saigonline",["crew","camera_lighting"],"","pending","","2026-09-25","",""),
 ("c7","blues","halongmarine",["transport_logistics"],"Dawn shoot on the wharf.","confirmed","Confirmed for 08/11.","2026-08-20","2026-08-21","2026-08-25"),
 ("c8","long","long",["full_production"],fit("We are looking for a nationwide partner for a 34-province documentary.", 1000, " Please see the itinerary for each province."),"pending","","2026-09-26","",""),
 ("c9","rice","cuulongdrone",["camera_lighting"],"Aerial shots over the salt fields.","withdrawn","","2026-09-05","",""),  # closed when the organisation was deactivated (M4 BR-008)
]
for k, proj, org, sv, note, st, rn, sent, resp, conf in CR:
    add("COLLAB_REQUEST", request_id=U("collab:" + k), project_id=PID[proj], org_id=OID[org], services=J(sv), note=note,
        status=st, response_note=rn, sent_at=TS(sent, "09:30"), responded_at=TS(resp, "15:10") if resp else "",
        confirmed_at=TS(conf, "10:00") if conf else "")
for k, req, party, ver, acc, d in [("n1","c1","partner","NDA-2026.1",True,"2026-09-22"),("n2","c1","producer","NDA-2026.1",True,"2026-09-23"),
                                   ("n3","c7","producer","NDA-2026.1",True,"2026-08-24"),("n4","c7","partner","NDA-2026.1",True,"2026-08-24"),
                                   ("n5","c4","producer","NDA-2026.1",False,"2026-09-14"),("n6","c2","producer","NDA-2026.1",True,"2026-09-21")]:
    add("NDA_ACCEPTANCE", nda_acceptance_id=U("nda:" + k), request_id=U("collab:" + req), party=party, nda_version=ver,
        accepted=str(acc).lower(), accepted_at=TS(d, "16:00") if acc else "")

# ------------------------------------------------------------------ M5 dossier kit
DT = [("A13_APPLICATION","Văn bản đề nghị cấp giấy phép theo mẫu","Application form (prescribed template)","law","A,B"),
      ("A13_SCRIPT_VI","Kịch bản tóm tắt và kịch bản chi tiết phần quay tại Việt Nam bằng tiếng Việt","Synopsis and Vietnam-scene script in Vietnamese","law","A,B"),
      ("A13_SERVICE_AGREEMENT","Thỏa thuận hoặc hợp đồng với tổ chức Việt Nam cung cấp dịch vụ","Agreement or contract with the Vietnamese service provider","law","A,B"),
      ("A13_ART9_COMMITMENT","Văn bản cam kết không vi phạm Điều 9","Undertaking not to breach Article 9","law","A,B"),
      ("FOREIGN_CREW_LIST","Danh sách đoàn làm phim nước ngoài","Foreign crew list","common","A,B"),
      ("PROVINCIAL_NOTICE_COPY","Bản sao thông báo gửi địa phương","Copy of the provincial notice","common","A,B"),
      ("HERITAGE_SITE_PERMIT","Văn bản đồng ý của ban quản lý di sản","Heritage-site management board consent","location","A,B"),
      ("SERVICE_CONTRACT_C","Hợp đồng dịch vụ (phân khúc C)","Service contract (segment C)","common","C")]
for code, vi, en, basis, segs in DT:
    add("DOCUMENT_TYPE", doc_code=code, name_vi=vi, name_en=en, basis=basis,
        template_url=f"https://storage.cinematch.example/templates/{code.lower()}.docx", segments=segs)
SLOTS = {"ferry": [("A13_APPLICATION","present"),("A13_SCRIPT_VI","needs_fix"),("A13_SERVICE_AGREEMENT","pending"),
                   ("A13_ART9_COMMITMENT","missing"),("FOREIGN_CREW_LIST","present"),("HERITAGE_SITE_PERMIT","missing")],
         "rice": [("A13_APPLICATION","present"),("A13_SCRIPT_VI","missing"),("A13_SERVICE_AGREEMENT","missing"),("A13_ART9_COMMITMENT","missing")],
         "lantern": [("A13_APPLICATION","needs_fix"),("A13_SCRIPT_VI","missing"),("A13_SERVICE_AGREEMENT","missing"),("A13_ART9_COMMITMENT","missing")],
         "blues": [("A13_APPLICATION","present"),("A13_SCRIPT_VI","present"),("A13_SERVICE_AGREEMENT","present"),("A13_ART9_COMMITMENT","present")],
         "signal": [("SERVICE_CONTRACT_C","missing")]}
for proj, lst in SLOTS.items():
    for code, st in lst:
        add("DOCUMENT_SLOT", project_id=PID[proj], doc_code=code, state=st)
DOCS = [("ferry","A13_APPLICATION",1,"park","2026-09-10"),("ferry","A13_APPLICATION",2,"han","2026-09-19"),
        ("ferry","FOREIGN_CREW_LIST",1,"han","2026-09-19"),("rice","A13_APPLICATION",1,"laurent","2026-09-18"),
        ("lantern","A13_APPLICATION",1,"tanaka","2026-09-17"),
        ("blues","A13_APPLICATION",1,"park","2026-08-26"),("blues","A13_SCRIPT_VI",1,"park","2026-08-28"),
        ("blues","A13_SERVICE_AGREEMENT",1,"park","2026-08-27"),("blues","A13_ART9_COMMITMENT",1,"park","2026-08-27")]
for proj, code, v, by, d in DOCS:
    add("DOCUMENT", document_id=U(f"doc:{proj}:{code}:{v}"), project_id=PID[proj], doc_code=code,
        file_path=f"private/projects/{proj}/{code.lower()}/v{v}.pdf", version=v, uploaded_by=UID[by], uploaded_at=TS(d, "13:45"))
for k, doc, viewer, d in [("a1",("ferry","A13_APPLICATION",2),"lan","2026-09-22"),("a2",("ferry","FOREIGN_CREW_LIST",1),"lan","2026-09-22"),
                          ("a3",("ferry","A13_APPLICATION",2),"lan","2026-09-23"),("a4",("blues","A13_SCRIPT_VI",1),"lan","2026-08-29"),
                          ("a5",("ferry","A13_APPLICATION",1),"han","2026-09-11")]:
    add("DOCUMENT_ACCESS_LOG", access_log_id=U("access:" + k), document_id=U("doc:%s:%s:%d" % doc), viewer_id=UID[viewer],
        viewed_at=TS(d, "20:05"))
FERRY_EN = ["In 1972, an old ferryman carries villagers across a river between limestone karsts at dawn.",
            "One night, soldiers ask him to take them across in secret.",
            "He agrees, and the crossing changes the village for a generation.",
            "Decades later, his granddaughter Min-seo returns from Seoul.",
            "She finds the ferry landing abandoned and the boat sunk in the reeds.",
            "An old woman at the market recognises her grandfather's face in her own.",
            "Together they raise the boat and repair it through the rainy season.",
            "Villagers begin to bring their own memories of the crossing.",
            "Min-seo records them on her phone, one voice at a time.",
            "A storm floods the valley and the only way across is the old ferry.",
            "She rows the villagers across at night, as her grandfather once did.",
            "At dawn the karsts appear through the mist.",
            "The old woman tells her who the soldiers were.",
            "Min-seo leaves the ferry at the landing and returns to Seoul."]
add("BILINGUAL_DOCUMENT", project_id=PID["ferry"], doc_code="A13_SCRIPT_VI", structure_version="art13-script-v1",
    synopsis_en=" ".join(FERRY_EN), project_meta=J({"title": "The Last Ferry", "shoot_date": "2027-03-15", "segment": "A"}),
    pdf_url="https://storage.cinematch.example/private/projects/ferry/a13_script_vi/draft.pdf", watermark="true")
for i, s in enumerate(FERRY_EN, 1):
    done = i <= 6          # 6 / 14 proofread, as on SC-28
    add("BILINGUAL_PARAGRAPH", project_id=PID["ferry"], doc_code="A13_SCRIPT_VI", idx=i, source_text=s,
        target_text=f"[Bản dịch máy đoạn {i}] {s}", status="reviewed" if done else "machine",
        reviewed_by=UID["lan"] if done else "", reviewer_org_id=OID["benxua"] if done else "",
        reviewed_at=TS("2026-09-24", f"1{i % 10}:00") if done else "")
add("BILINGUAL_DOCUMENT", project_id=PID["blues"], doc_code="A13_SCRIPT_VI", structure_version="art13-script-v1",
    synopsis_en="A lone saxophonist plays on the wharf at dawn.", project_meta=J({"title": "Quiet Harbour Blues", "segment": "A"}),
    pdf_url="https://storage.cinematch.example/private/projects/blues/a13_script_vi/draft.pdf", watermark="true")
add("BILINGUAL_PARAGRAPH", project_id=PID["blues"], doc_code="A13_SCRIPT_VI", idx=1, source_text="A lone saxophonist plays on the wharf at dawn.",
    target_text="Một nghệ sĩ saxophone một mình chơi nhạc trên cầu tàu lúc bình minh.", status="reviewed",
    reviewed_by=UID["park"], reviewer_org_id="", reviewed_at=TS("2026-08-28", "09:00"))
add("BILINGUAL_DOCUMENT", project_id=PID["rice"], doc_code="A13_SCRIPT_VI", structure_version="art13-script-v1",
    synopsis_en="Salt farmers and rice growers of the Mekong Delta through one year.", project_meta=J({"title": "Rice and Salt", "segment": "B"}),
    pdf_url="", watermark="true")
add("BILINGUAL_PARAGRAPH", project_id=PID["rice"], doc_code="A13_SCRIPT_VI", idx=1,
    source_text="Salt farmers and rice growers of the Mekong Delta through one year.", target_text="",
    status="machine", reviewed_by="", reviewer_org_id="", reviewed_at="")   # translation failed for this paragraph (M5 edge case)
for name, s, e, exp in [("Tết Dương lịch 2027","2027-01-01","2027-01-01",False),
                        ("Tết Nguyên đán 2027","2027-02-05","2027-02-10",True),
                        ("Giỗ Tổ Hùng Vương 2027","2027-04-16","2027-04-16",True),
                        ("Ngày Giải phóng miền Nam và Quốc tế Lao động 2027","2027-04-30","2027-05-01",False),
                        ("Quốc khánh 2026","2026-09-01","2026-09-02",False),
                        ("Quốc khánh 2027","2027-09-01","2027-09-02",True),
                        ("Tết Nguyên đán 2023","2023-01-20","2023-01-26",False)]:
    add("PUBLIC_HOLIDAY", name=name, start_date=s, end_date=e, is_expected=str(exp).lower())

# ------------------------------------------------------------------ M7 provincial notices, consultations
NOT = [  # key, project, location, created, reviewed, sent, delivery, received, response, note, responded
 ("i1","ferry","trang-an","2026-09-15","thuha","2026-09-16","sent","2026-09-18","received","Tỉnh đã ghi nhận; liên hệ Ban Quản lý Tràng An trước 30 ngày.","2026-09-18"),
 ("i2","ferry","ha-long","2026-09-20","thuha","2026-09-21","sent","","","",""),
 ("i3","rice","cai-rang","2026-09-12","phuc","2026-09-13","sent","2026-09-15","info_needed","Đề nghị bổ sung lịch quay theo tuần và số lượng thuyền.","2026-09-17"),
 ("i4","sapa","mu-cang-chai","2026-09-05","phuc","2026-09-06","sent","2026-09-08","cannot_support","Mùa thu hoạch, địa phương không bố trí được hỗ trợ.","2026-09-10"),
 ("i5","lantern","hoi-an","2026-09-18","","","","","","",""),                     # drafted, not yet reviewed
 ("i6","blues","ha-long","2026-08-22","thuha","2026-08-23","bounced","","","",""),  # authority email bounced
 ("i7","signal","cai-rang","2026-09-21","","","","","","",""),                     # no first shooting day: sending blocked (M7 US-1)
 ("i8","ferry","tam-coc","2026-09-28","phuc","","queued","","","",""),              # reviewed, waiting in the e-mail queue
]
for k, proj, loc, dr, rv, sent, dl, rec, resp, note, rd in NOT:
    add("LOCATION_INTEREST", interest_id=U("interest:" + k), project_id=PID[proj], location_id=LID[loc], created_at=TS(dr, "08:40"))
    prov = next(p for kk, p, *_ in LOC if kk == loc)
    email = next(a[4] for a in AC if a[0] == loc) or "vanphong@ubnd.example.vn"
    add("PROVINCE_NOTICE", interest_id=U("interest:" + k), province_id=P[prov],
        project_summary=f"{PROJ[proj][1]} — {PROJ[proj][2]}, first shooting day {PROJ[proj][4] or 'not set'}.",
        authority_email=email, drafted_at=TS(dr, "08:41"), reviewed_by=UID[rv] if rv else "", sent_at=TS(sent, "09:00") if sent else "",
        delivery_status=dl, received_at=TS(rec, "14:00") if rec else "", response=resp, note=note, responded_at=TS(rd, "14:05") if rd else "")
for k, member, topic, slot, tz, officer, st in [
    ("b1","park","dossier","2026-10-06T08:00:00+07:00","Asia/Seoul","phuc","confirmed"),
    ("b2","laurent","locations","2026-10-08T15:00:00+07:00","Europe/Paris","thuha","rescheduled"),
    ("b3","walsh","provincial_notice","2026-10-09T07:00:00+07:00","Australia/Sydney","phuc","confirmed"),
    ("b4","tanaka","partners","2026-10-12T10:00:00+07:00","Asia/Tokyo","",""),       # not yet confirmed (status undeclared)
    ("b5","okafor","general","2026-10-13T16:00:00+07:00","Europe/London","thuha","confirmed"),
    ("b6","long","dossier","2026-10-14T09:00:00+07:00","America/Argentina/ComodRivadavia","phuc","confirmed")]:
    add("CONSULTATION_BOOKING", booking_id=U("booking:" + k), member_id=UID[member], topic=topic, slot_start=slot,
        timezone=tz, officer_id=UID[officer] if officer else "", booking_status=st)

# ------------------------------------------------------------------ SYS notifications and e-mail
NOTIF = [("n1","park","collab_request.accepted",{"request":"c1","org":"Bến Xưa Production Services"},"2026-09-22T15:11","2026-09-22T18:00"),
         ("n2","park","province_notice.received",{"province":"Ninh Bình"},"2026-09-18T14:06","2026-09-18T20:12"),
         ("n3","lan","collab_request.new",{"request":"c1","project":"The Last Ferry"},"2026-09-18T09:31","2026-09-18T09:40"),
         ("n4","laurent","province_notice.info_needed",{"province":"Cần Thơ"},"2026-09-17T14:06",""),
         ("n5","tanaka","collab_request.declined",{"request":"c5"},"2026-09-11T15:11",""),
         ("n6","khai","verification.expiring",{"days_left":30},"2026-02-18T08:00",""),
         ("n7","thuha","province_notice.bounced",{"interest":"i6"},"2026-08-23T09:05","2026-08-23T09:30"),
         ("n8","park","consultation.reminder",{"booking":"b1"},"2026-10-05T08:00",""),
         ("n9","laurent","collab_request.withdrawn",{"request":"c9","reason":"organisation_deactivated"},"2026-09-24T10:00","")]
for k, user, ev, payload, created, read in NOTIF:
    add("NOTIFICATION", notification_id=U("notif:" + k), recipient_id=UID[user], event_type=ev, payload=J(payload),
        created_at=created + ":00+07:00", read_at=(read + ":00+07:00") if read else "")
for k, notif, tpl, mail, vars_, st, msg in [
    ("e1","n1","collab_request_status",EMAIL["park"],{"status":"accepted"},"sent","re_7f3a1c"),
    ("e2","n3","collab_request_new",EMAIL["lan"],{"project":"The Last Ferry"},"sent","re_7f3a1d"),
    ("e3","n4","province_notice_reply",EMAIL["laurent"],{"province":"Cần Thơ"},"sent","re_7f3a1e"),
    ("e4","","province_notice","vanphong@ubnd.example.vn",{"interest":"i6"},"bounced","re_7f3a1f"),
    ("e5","","email_verification",EMAIL["rossi"],{"name":"Mateo"},"queued",""),
    ("e6","n5","collab_request_status",EMAIL["tanaka"],{"status":"declined"},"sent","re_7f3a20"),
    ("e7","n8","consultation_reminder",EMAIL["park"],{"slot":"2026-10-06T08:00:00+07:00"},"queued","")]:
    add("EMAIL_DELIVERY", email_delivery_id=U("email:" + k), notification_id=U("notif:" + notif) if notif else "",
        template_id=tpl, recipient_email=mail, variables=J(vars_), delivery_status=st, provider_message_id=msg)

# ------------------------------------------------------------------ M3 location queries (F-M3-11, M3 BR-009: no personal data)
LQ = [  # key, project, month, description, attributes
 ("q1","ferry",3,"An old wooden ferry crossing a calm river between limestone karsts at dawn, a 1970s village on the bank.",
  {"scene_types":["karst","river","village"],"era":"1970s","time_of_day":"dawn","water":"river","terrain":["karst"],"crowd_scale":"small","constraints":[]}),
 ("q2","",5,"Busy floating market at sunrise with dozens of boats selling fruit.",
  {"scene_types":["floating_village","market","river"],"era":"contemporary","time_of_day":"dawn","water":"river","terrain":[],"crowd_scale":"large","constraints":[]}),
 ("q3","",9,"Ruộng bậc thang mùa lúa chín, có sương sớm và nhà sàn.",
  {"scene_types":["rice_terrace","mountain","village"],"era":"contemporary","time_of_day":"morning","water":"none","terrain":["terraces"],"crowd_scale":"none","constraints":[]}),
 ("q4","lantern",6,"Night market lit by hundreds of silk lanterns along an old river street.",
  {"scene_types":["old_town","market","river"],"era":"contemporary","time_of_day":"night","water":"river","terrain":[],"crowd_scale":"large","constraints":["night_shooting"]}),
 ("q5","",None,"Cave river",{"scene_types":["cave","river"],"era":"any","time_of_day":"any","water":"river","terrain":["cave"],"crowd_scale":"none","constraints":[]}),  # 10 characters, the minimum
 ("q6","long",12,fit("A long journey south along the coast: mangrove forests, fishing villages and mudflats at low tide, filmed over several days.",
  1000, " Then the road continues to the next province."),
  {"scene_types":["mangrove","sea","village"],"era":"contemporary","time_of_day":"any","water":"sea","terrain":["mudflat"],"crowd_scale":"small","constraints":[]}),  # 1000 characters, the maximum
]
for k, proj, month, desc, attrs in LQ:
    add("LOCATION_QUERY", query_id=U("query:" + k), project_id=PID[proj] if proj else "", scene_description=desc,
        shoot_month=month if month else "", attributes=J(attrs))

# ------------------------------------------------------------------ M4 request messages (F-M4-14, M4 BR-009)
for k, req, author, d, body in [
    ("m1","c1","lan","2026-09-22T15:10","Happy to support. Proposal attached; rates available after the NDA."),
    ("m2","c1","park","2026-09-22T18:05","Thank you. We will accept the NDA tomorrow and share the Ninh Bình schedule."),
    ("m3","c1","lan","2026-09-23T09:20","Received. Our line producer can join the scouting in October."),
    ("m4","c4","laurent","2026-09-15T08:30","Weekly schedule attached, as requested.")]:
    add("COLLAB_MESSAGE", message_id=U("message:" + k), request_id=U("collab:" + req), author_id=UID[author],
        created_at=d + ":00+07:00", body=body)

# ------------------------------------------------------------------ M5 project glossary (F-M5-04, M5 BR-006)
for en, vi in [("ferry","đò"),("ferryman","người lái đò"),("landing","bến"),("karst","núi đá vôi")]:
    add("PROJECT_GLOSSARY", project_id=PID["ferry"], term_en=en, term_vi=vi)

# ------------------------------------------------------------------ M10 moderation, audit log, quarterly report
IMG = lambda loc, n: f"https://storage.cinematch.example/locations/{loc}/{n:02d}.jpg"
MOD = [  # key, type, org, image, submitted_by, submitted, status, reason, decided_by, decided
 ("mod-mekong-1","org_profile","mekong","","tuan","2026-09-11T10:00","approved","","thuha","2026-09-12T09:30"),
 ("mod-mekong-2","org_profile","mekong","","tuan","2026-09-26T16:20","pending","","",""),                  # M10 US-1: edit waits, old text stays public
 ("mod-cairang-2","location_image","",IMG("cai-rang",2),"tuan","2026-09-27T11:05","pending","","",""),
 ("mod-muine-1","location_image","",IMG("mui-ne",1),"tuan","2026-09-02T14:00","hidden",
  "Source and usage right are unclear; upload a photo you own or have a licence for.","phuc","2026-09-03T10:15"),
]
MID = {k: U("moderation:" + k) for k, *_ in MOD}
for k, ct, org, img, by, sub, st, reason, dec, dat in MOD:
    add("MODERATION_ITEM", content_id=MID[k], content_type=ct, organisation_id=OID[org] if org else "",
        location_image_id=img, submitted_by=UID[by], submitted_at=sub + ":00+07:00", content_status=st, reason=reason,
        decided_by=UID[dec] if dec else "", decided_at=(dat + ":00+07:00") if dat else "")
REPORT = U("report:2026-Q3")
AUD = [  # key, action, admin, target, logged
 ("a01","role.grant","ducanh",UID["lan"],"2026-06-10T10:30"),                 # SYS BR-002
 ("a02","location.publish","thuha",LID["trang-an"],"2026-06-02T09:10"),       # M10 US-4
 ("a03","location.publish","thuha",LID["tam-coc"],"2026-06-02T09:15"),
 ("a04","org.verify.approve","thuha",U("verif:v1"),"2026-06-12T11:00"),
 ("a05","org.verify.reject","thuha",U("verif:v5"),"2026-06-20T14:30"),
 ("a06","org.verify.approve","ducanh",U("verif:v8"),"2026-09-01T11:00"),
 ("a07","rule.sign","quan",U("rule:A9-PERSON"),"2026-08-28T15:30"),
 ("a08","rule.retire","quan",U("rule:A9-MAP"),"2026-08-28T15:35"),            # M2 BR-008
 ("a09","content.approve","thuha",MID["mod-mekong-1"],"2026-09-12T09:30"),     # M10 US-1
 ("a10","content.hide","phuc",MID["mod-muine-1"],"2026-09-03T10:15"),
 ("a11","location.unpublish","phuc",LID["cua-van"],"2026-09-19T16:40"),       # M3 BR-008
 ("a12","report.export","thuha",REPORT,"2026-09-30T16:01"),                   # M10 US-3
]
for k, act, by, target, at in AUD:
    add("AUDIT_LOG", audit_log_id=U("audit:" + k), action=act, admin_id=UID[by], target_id=target, logged_at=at + ":00+07:00")
DEMAND_Q3 = [  # six indicators, each with its sample size; below 5 records: not enough data (M10 BR-003)
 {"indicator":1,"value":62.5,"sample_size":8},{"indicator":2,"value":50.0,"sample_size":8},
 {"indicator":3,"value":33.3,"sample_size":6},{"indicator":4,"value":None,"sample_size":0,"note":"not_enough_data"},
 {"indicator":5,"value":None,"sample_size":3,"note":"not_enough_data"},{"indicator":6,"value":None,"sample_size":0,"note":"not_enough_data"}]
add("QUARTERLY_REPORT", report_id=REPORT, period_start="2026-07-01", period_end="2026-09-30", demand_index=J(DEMAND_Q3),
    narrative_vi="Quý III/2026: 8 dự án quốc tế [chỉ số 1]; 62,5 % đến từ Hàn Quốc và Pháp [chỉ số 1]. "
                 "Chỉ số 4, 5 và 6 chưa đủ dữ liệu. Bản nháp — đã được cán bộ VFDA đọc lại.",
    narrative_en="Q3 2026: 8 international projects [indicator 1]; 62.5 % from Korea and France [indicator 1]. "
                 "Indicators 4, 5 and 6 have not enough data. Draft — reread by VFDA staff.",
    reread_by=UID["thuha"], report_pdf_url="https://storage.cinematch.example/private/reports/2026-q3.pdf",
    exported_at=TS("2026-09-30", "16:00"))

# ------------------------------------------------------------------ write
def pkey(entity):
    pk = SCHEMA[entity]["pk"]
    def k(row):
        return tuple((0, int(row[c])) if str(row[c]).lstrip("-").isdigit() else (1, str(row[c])) for c in pk)
    return k

if __name__ == "__main__":
    for e, meta in SCHEMA.items():
        rows = sorted(ROWS[e], key=pkey(e))
        with open(os.path.join(HERE, meta["table"] + ".csv"), "w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=meta["columns"], lineterminator="\n")
            w.writeheader(); w.writerows(rows)
    print(f"wrote {len(SCHEMA)} tables, {sum(len(v) for v in ROWS.values())} rows")
