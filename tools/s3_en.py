# -*- coding: utf-8 -*-
"""Screens 15–20: M5 (document kit, bilingual drafts, countdown), Tier 2 (comparison, provincial index, Provincial People's Committee notice)."""
from base import page

SCREENS = []


def nb(k, cond):
    return f' data-n="{k}"' if cond else ""


def add(spec, html):
    SCREENS.append((spec, html))


# =====================================================================  15 · SC-26
def drow(name, basis, bcls, status, scls, action, first=False):
    n = (lambda x: f' data-n="{x}"') if first else (lambda x: "")
    return f"""<tr><td{n(6)}>{name}</td><td><span class="pill {bcls}"{n(7)}>{basis}</span></td>
<td><span class="lnk small"{n(8)}>Download template</span></td><td><span class="pill {scls}"{n(9)}>{status}</span></td>
<td style="text-align:right"><span{n(10)}>{action}</span></td></tr>"""

html = page("SC-26", "Document kit by segment", "M5 · Member · Tier 1 · #15", "/projects/the-last-ferry/dossier", f"""
<div class="row" style="justify-content:space-between;align-items:flex-start">
  <div data-n="3"><h1>Project document kit</h1><div class="sub">The checklist changes by segment. This project: <span class="pill p-info">Segment A — shot in Vietnam, released abroad</span></div></div>
  <div data-n="12" style="width:230px"><div class="row" style="justify-content:space-between"><span class="small muted">Document kit</span><b>3 / 7</b></div><div class="bar" style="margin-top:6px"><i style="width:43%"></i></div></div>
</div>
<div class="row" style="align-items:center;gap:8px;margin-top:12px" data-n="4"><span class="small muted">View checklist for:</span><span class="chip on">A · this project</span><span class="chip">B</span><span class="chip">C</span></div>
<div class="row" style="gap:18px;margin-top:12px;align-items:flex-start">
  <div style="flex:1" class="col">
    <div class="card" style="padding:4px 6px" data-n="5">
      <div style="padding:8px 10px 2px;font-weight:700">Filming permit — Article 13</div>
      <table class="t">
        <tr><th>Document</th><th>Basis</th><th>Template</th><th>Status</th><th></th></tr>
        {drow("Permit application letter", "Required by law", "p-bad", "Present", "p-ok", '<span class="lnk small">View</span>', True)}
        {drow("Synopsis + full script (Vietnamese)", "Required by law", "p-bad", "Needs fixing", "p-warn", '<span class="btn sm">Draft bilingual</span>')}
        {drow("Service agreement with a Vietnamese company", "Required by law", "p-bad", "Pending", "p-info", '<span class="lnk small">View request</span>')}
        {drow("Undertaking not to breach Article 9", "Required by law", "p-bad", "Missing", "p-mute", '<span class="btn sm g">Upload</span>')}
      </table>
      <div style="padding:10px 10px 2px;font-weight:700">Working with provinces and the crew</div>
      <table class="t">
        {drow("Notice to the Provincial People's Committee where filming", "Commonly requested", "p-warn", "Present", "p-ok", '<span class="lnk small">View</span>')}
        {drow("Foreign crew list (full name, nationality, passport)", "Commonly requested", "p-warn", "Present", "p-ok", '<span class="lnk small">View</span>')}
        {drow("Permit to film inside the heritage site (Tràng An)", "Location-specific", "p-info", "Missing", "p-mute", '<span class="btn sm g">Upload</span>')}
      </table>
    </div>
    <div class="card" data-n="13" style="border-style:dashed;text-align:center;padding:18px;color:#5b626c">Drag and drop files here · PDF, DOCX, max 25 MB · the system suggests which item each file belongs to, you confirm</div>
  </div>
  <div style="width:290px;flex:none" class="card soft" data-n="11">
    <h3>Differences by segment</h3>
    <div class="small col" style="gap:8px">
      <div><b>A</b> · Permit to provide filmmaking services to foreign productions (Article 13) + agreement with a Vietnamese company.</div>
      <div><b>B</b> · Same as A if the foreign company shoots; plus film classification before release in Vietnam (phase 2).</div>
      <div><b>C</b> · Not shooting in Vietnam: service / employment contract with actors or suppliers. <span class="warn">Awaiting VFDA confirmation</span></div>
    </div>
  </div>
</div>
""", active="My projects", sidebar="Document kit", side_n=2)

add(dict(
 seq=15, sid="SC-26", name="Document kit by segment", group="M5", tier="Tier 1 — Must",
 module="M5", actor="Member", prio="Must", route="/projects/[id]/dossier",
 design_note="Checklist changes by A/B/C.",
 shown="Member clicks *Document kit* in the sidebar, *Upload* on `SC-27`, or *Continue your dossier* on the dashboard.",
 leave="Member uploads documents, opens the bilingual editor (`SC-28`), or views the partnership request (`SC-25`).",
 el=[
  (1, "Navigation bar", "Header", "static", "—", "—"),
  (2, "Project sidebar", "List", "static; *Document kit* selected", "—", "—"),
  (3, "Title + project segment", "Header", "`projects.segment`", "Yes", "—"),
  (4, "Switch checklist view A / B / C", "Toggle", "`segment_requirements` for the selected segment", "—", "view only; does not change the project's segment"),
  (5, "Document group", "Container", "`document_types.group`", "—", "—"),
  (6, "Document row", "List", "`document_slots` generated from `segment_requirements` + confirmed locations", "Yes", "—"),
  (7, "Basis label", "Text", "`document_types.basis` — Required by law / Commonly requested / Location-specific", "Yes", "enum, 3 values"),
  (8, "*Download template* link", "Link", "`document_templates` provided by VFDA", "—", "hidden when no template exists"),
  (9, "Document status", "Text", "`document_slots.status` — Present / Needs fixing / Pending / Missing", "Yes", "same status set as `SC-27`"),
  (10, "Row action", "Button / Link", "View / Upload / Draft bilingual / View request", "—", "—"),
  (11, "*Differences by segment* block", "Text", "`segment_requirements.summary` approved by VFDA", "Yes", "—"),
  (12, "Document kit progress", "Text + bar", "count of *Present* rows / total rows", "Yes", "—"),
  (13, "Drag-and-drop upload area", "Input (file)", "Supabase Storage, private bucket per project", "—", "PDF / DOCX, ≤ 25 MB; suggests item, user confirms"),
 ],
 st=[
  ("Default", "Two document groups with basis, template, status and action; segment differences block; upload area.", "Screen opens"),
  ("Empty (no data)", "New project: every row *Missing*; *Location-specific* rows not shown yet because no location is confirmed — a note reads *Added once you confirm a location*.", "No documents yet"),
  ("Loading", "Grey skeleton for the table; an upload shows a progress bar on its own row.", "Loading / uploading a file"),
  ("Error", "Wrong file type or over 25 MB: error right at the upload area, stating the limit. Upload fails midway: *Upload incomplete — try again*, no empty row is created.", "File check failed"),
  ("Success / confirmation", "Upload done: row status changes, green strip *Added to document kit — rechecking against Article 13* and `SC-27` is re-run.", "Upload succeeded"),
 ],
 ix=[
  ("Chip A / B / C", "tap", "View another segment's checklist (read-only)", "stays"),
  ("*Download template*", "tap", "Download bilingual template", "stays"),
  ("*Draft bilingual*", "tap", "—", "SC-28"),
  ("*View request*", "tap", "—", "SC-25"),
  ("*Upload* / drag-and-drop area", "tap / drop", "Upload, suggest item, user confirms", "stays"),
  ("Document kit progress", "tap", "—", "SC-27"),
 ],
 sr=[
  ("The checklist is **generated from the `segment_requirements` table** by segment, plus *location-specific* documents for confirmed locations — nothing hard-coded.", "Function list — note #15"),
  ("Every document carries a **basis label**: *Required by law* / *Commonly requested* / *Location-specific*. Never present everything as mandatory.", "Honesty principle"),
  ("Status set shared with `SC-27`; the 4 Article 13 rows always match across both screens.", "Consistency principle"),
  ("Files are stored in a private bucket; only project members can read them; every download is logged.", "Security"),
  ("The suggested item for a file is only a suggestion — **the user confirms** before it is assigned.", "Human-decides principle"),
 ],
 fr=[("F-M5-01", "Document checklist by segment"), ("F-M5-02", "Upload and replace documents"), ("F-M5-03", "Per-item status")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the table becomes a list of cards; the segment differences block collapses into an expandable section.", "The drag-and-drop area has a *Choose file* button for users who don't use a mouse.", "Basis and status labels always include text."],
 oq=[("[NEEDS CLARIFICATION: document checklist for segment C — needs confirmation from the VFDA Legal Board]", True),
     ("[NEEDS CLARIFICATION: are \"Foreign crew list\" and \"Provincial People's Committee notice\" mandatory anywhere, or just common practice]", False)],
), html)

# =====================================================================  16 · SC-28
def para(k, en, vi, st, scls, reviewed, first=False):
    n = (lambda x: f' data-n="{x}"') if first else (lambda x: "")
    return f"""<div class="row" style="gap:0;border-bottom:1px solid #e8ebee;align-items:stretch">
<div style="width:36px;flex:none;padding:10px 0;text-align:center;color:#8a9099;font-size:12px">{k}</div>
<div style="flex:1;padding:10px 12px;font-size:13px;line-height:1.55;background:#fafbfc"{n(5)}>{en}</div>
<div style="flex:1;padding:10px 12px;font-size:13px;line-height:1.55;{'box-shadow:inset 0 0 0 2px #1f5fbf;' if first else ''}"{n(6)}>{vi}
<div class="row" style="justify-content:space-between;margin-top:6px;align-items:center"><span class="pill {scls}"{n(7)}>{st}</span>{'' if reviewed else f'<span class="btn sm g"{n(8)}>✓ Proofread</span>'}</div></div></div>"""

html = page("SC-28", "Bilingual draft editor (Vietnamese–English)", "M5 · Member · Tier 1 · #16", "/projects/the-last-ferry/bilingual/synopsis", f"""
<div class="row" style="justify-content:space-between;align-items:center">
  <div class="row" style="gap:10px;align-items:center"><div data-n="3" class="field" style="width:360px">Synopsis (Article 13 cl.3 — item b) ▾</div></div>
  <div data-n="4" style="width:260px"><div class="row" style="justify-content:space-between"><span class="small muted">Proofread</span><b>6 / 14 paragraphs</b></div><div class="bar" style="margin-top:6px"><i style="width:43%"></i></div></div>
</div>
<div class="banner b-warn small" data-n="10" style="margin-top:12px"><b>DRAFT — machine translation.</b> Every page of the exported PDF carries a DRAFT watermark; paragraphs not yet proofread are also flagged. Item b only counts as <i>Present</i> once all 14/14 paragraphs are proofread.</div>
<div class="row" style="gap:16px;margin-top:12px;align-items:flex-start">
  <div style="flex:1" class="card" >
    <div class="row" style="gap:0;border-bottom:1px solid #dce0e5;font-size:12px;font-weight:700;color:#5b626c;text-transform:uppercase;letter-spacing:.05em">
      <div style="width:36px"></div><div style="flex:1;padding:6px 12px">Source · English</div><div style="flex:1;padding:6px 12px">Vietnamese · edit in place</div></div>
    {para(4, "In 1972, an old ferryman named Tư carries villagers across the river at dawn, between limestone karsts that rise straight out of the water.", "Năm 1972, ông Tư — một người lái đò già — chở dân làng qua sông lúc bình minh, giữa những khối núi đá vôi dựng đứng từ mặt nước.", "Machine translation · not proofread", "p-warn", False, True)}
    {para(5, "One night, soldiers ask him to take them across in secret. He agrees, knowing the risk.", "Một đêm, mấy người lính nhờ ông đưa họ qua sông trong bí mật. Ông nhận lời, dù biết rõ hiểm nguy.", "Proofread · Lena P. · Thu H.", "p-ok", True)}
    {para(6, "Decades later, his granddaughter Mi-rae returns from Seoul and finds the ferry still tied at the old landing.", "Nhiều năm sau, cháu gái ông là Mi-rae từ Seoul trở về và thấy con đò vẫn buộc ở bến cũ.", "Proofread · Thu H.", "p-ok", True)}
    <div class="row small" style="justify-content:space-between;padding:10px 12px;align-items:center"><span data-n="13">☑ Sync scrolling of both columns</span><span class="muted">Paragraphs 4–6 / 14</span></div>
  </div>
  <div style="width:260px;flex:none" class="col">
    <div class="card" data-n="9"><h3>Project glossary</h3><div class="small col" style="gap:4px"><div>ferry → <b>đò</b> (not "phà")</div><div>ferryman → <b>người lái đò</b></div><div>landing → <b>bến</b></div><div>karst → <b>núi đá vôi</b></div><div class="lnk">+ Add term</div></div></div>
    <span class="btn" data-n="11">Export two-column PDF</span>
    <span class="btn g" data-n="12">Save</span>
    <div class="small muted">Autosaved at 10:51. Every edit is logged with who changed which paragraph.</div>
  </div>
</div>
""", active="My projects", sidebar="Bilingual drafts", side_n=2)

add(dict(
 seq=16, sid="SC-28", name="Bilingual draft editor (Vietnamese–English)", group="M5", tier="Tier 1 — Must",
 module="M5", actor="Member", prio="Must", route="/projects/[id]/bilingual/[doc]",
 design_note="Two-column view with editing.",
 shown="Member clicks *Draft Vietnamese version* on `SC-27` or *Draft bilingual* on `SC-26`.",
 leave="Member finishes proofreading and exports the PDF, or returns to the document kit.",
 el=[
  (1, "Navigation bar", "Header", "static", "—", "—"),
  (2, "Project sidebar", "List", "static; *Bilingual drafts* selected", "—", "—"),
  (3, "Document picker", "Toggle (dropdown)", "`bilingual_docs` — Synopsis / Full script for scenes shot in Vietnam / Application letter / Undertaking", "Yes", "project documents only"),
  (4, "Proofreading progress", "Text + bar", "count of `bilingual_paragraphs.reviewed_by IS NOT NULL`", "Yes", "—"),
  (5, "Source column", "Text", "`bilingual_paragraphs.source_text`", "Yes", "read-only"),
  (6, "Vietnamese column", "Input (textarea per paragraph)", "`bilingual_paragraphs.target_text`", "Yes", "must not be empty; editing a proofread paragraph resets it to *not proofread*"),
  (7, "Paragraph status", "Text", "`machine` / `reviewed` + proofreader's name", "Yes", "always has text"),
  (8, "*✓ Proofread* button", "Button", "writes `reviewed_by`, `reviewed_at`", "—", "only shown on paragraphs not yet proofread"),
  (9, "Project glossary", "List", "`project_glossary`", "No", "one translation per source term"),
  (10, "*DRAFT* warning strip", "Text", "static + number of paragraphs not proofread", "Yes", "hidden once 100% proofread"),
  (11, "*Export two-column PDF* button", "Button", "generated with `@react-pdf/renderer`", "—", "every page watermarked *DRAFT — REQUIRES PROOFREADING* (F-M5-05); unreviewed paragraphs also flagged"),
  (12, "*Save* button", "Button", "static; autosave enabled", "—", "—"),
  (13, "Sync scroll switch", "Toggle", "UI preference", "—", "on by default"),
 ],
 st=[
  ("Default", "Two columns aligned by paragraph: source on the left (read-only), Vietnamese on the right (editable), each paragraph with a status.", "Open a document that has a source"),
  ("Empty (no data)", "No source yet: *Upload the English script to get started* + upload area. Source present but not translated: *Create Vietnamese draft* button.", "No source / not translated"),
  ("Loading", "Creating the draft: paragraphs appear one by one with *Translating paragraph 4 / 14*.", "Calls `F-M5-04`"),
  ("Error", "One paragraph fails to translate: it is left empty with *Could not translate — retry this paragraph*; other paragraphs remain usable. Save error: *Not saved — your text is still on screen*.", "Translation error / save error"),
  ("Success / confirmation", "All 14/14 paragraphs: the warning strip is replaced by a green strip *Fully proofread. Item b has been updated in the dossier check.*", "Fully proofread"),
 ],
 ix=[
  ("Document picker", "tap", "Open another document", "stays"),
  ("Vietnamese field", "type", "Autosaves after 2 seconds of inactivity; if the paragraph was proofread → back to *not proofread*", "stays"),
  ("*✓ Proofread* button", "tap", "Records who proofread and when", "stays"),
  ("*+ Add term*", "tap", "Adds to the glossary; highlights paragraphs where the term was translated differently", "stays"),
  ("*Export two-column PDF* button", "tap", "Download PDF", "stays"),
  ("When 14/14 paragraphs are done", "—", "Updates item b", "SC-27"),
 ],
 sr=[
  ("The script for scenes shot in Vietnam must have a **Vietnamese version** — this is why the screen exists.", "Cinema Law 2022 (Law No. 05/2022/QH15), Article 13 cl.3"),
  ("Machine translation is **always** a *draft*. Only a person can mark a paragraph *proofread*; item b is *Present* only at 100% of paragraphs.", "Human-decides principle"),
  ("Editing a proofread paragraph **clears** its proofread mark.", "Data integrity"),
  ("Glossary terms are applied on translation and re-translation.", "Terminology consistency"),
  ("Every page of the exported PDF carries the watermark *DRAFT — REQUIRES PROOFREADING*; paragraphs not yet proofread are additionally flagged. CINEMATCH never produces a document presented as final.", "Function List F-M5-05"),
 ],
 fr=[("F-M5-04", "Generate Vietnamese draft"), ("F-M5-05", "Export two-column comparison PDF"), ("F-M5-06", "Mark as proofread")],
 resp=["Minimum supported width: **768px** — two-column editing needs a wide screen. Below 768px it switches to single-column mode, each paragraph showing the source above and the Vietnamese below.", "Edit fields have `lang=\"vi\"`; the source column has `lang` set to the source language.", "Paragraph status is always spelled out in text."],
 oq=[("[NEEDS CLARIFICATION: must the proofreader be Vietnamese / a certified translator, and must the proofreader be named in the submitted dossier]", False),
     ("[NEEDS CLARIFICATION: which machine translation service to use — the script is the production's confidential document]", True)],
), html)

# =====================================================================  17 · SC-29
# axis: 22/09/2026 .. 20/03/2027 -> 0..100%
from datetime import date
T0, T1 = date(2026, 9, 22), date(2027, 3, 22)
pos = lambda d: round((d - T0).days / (T1 - T0).days * 100, 2)
MON = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
M = [(date(2026, 11, 15), "Partner confirmed", "15/11"), (date(2026, 12, 20), "Vietnamese version done", "20/12"),
     (date(2027, 1, 27), "SAFE DEADLINE", "27/01"), (date(2027, 2, 16), "Latest deadline", "16/02"),
     (date(2027, 3, 15), "SHOOT DAY 1", "15/03")]
marks = ""
for i, (d, t, s) in enumerate(M):
    strong = t in ("SAFE DEADLINE", "SHOOT DAY 1")
    col = "#a52a1f" if t == "SAFE DEADLINE" else ("#0d366b" if strong else "#5b626c")
    dn = ' data-n="7"' if i == 0 else ""
    marks += f'''<div style="position:absolute;left:{pos(d)}%;top:0;transform:translateX(-50%);text-align:center;width:100px"{dn}>
<div style="width:{16 if strong else 12}px;height:{16 if strong else 12}px;border-radius:50%;background:{col};margin:{0 if strong else 2}px auto 6px;border:2px solid #fff;box-shadow:0 0 0 1px {col}"></div>
<div style="font-size:{12.5 if strong else 12}px;font-weight:{800 if strong else 700};color:{col}">{t}</div><div class="small muted">{s}</div></div>'''
ticks = "".join(f'<div style="position:absolute;left:{pos(date(y,m,1))}%;top:0;height:100%;border-left:1px dashed #d5d9de"><span class="small muted" style="position:absolute;top:-18px;left:-14px"{nb(6, m==11)}>{MON[m]}&nbsp;{str(y)[2:]}</span></div>'
                for y, m in [(2026, 10), (2026, 11), (2026, 12), (2027, 1), (2027, 2), (2027, 3)])
fav_a, fav_b = pos(date(2027, 1, 27)), pos(date(2027, 2, 16))
rev_b = pos(date(2027, 3, 8))
tet_a, tet_b = pos(date(2027, 2, 5)), pos(date(2027, 2, 10))

html = page("SC-29", "20-day countdown", "M5 · Member · Tier 1 · #17", "/projects/the-last-ferry/timeline", f"""
<div class="row" style="gap:14px;align-items:stretch">
  <div class="card" data-n="3" style="width:200px"><div class="small muted">First shooting day</div><div style="font-weight:800;font-size:18px">15/03/2027 ✎</div></div>
  <div class="card" data-n="4" style="width:200px"><div class="small muted">Safety buffer before shooting</div><div style="font-weight:800;font-size:18px">7 days ▾</div></div>
  <div class="card" data-n="5" style="flex:1;border:2px solid #a52a1f;background:#fdf6f5"><div class="row" style="justify-content:space-between;align-items:center"><div><div class="small" style="color:#a52a1f;font-weight:700;letter-spacing:.05em">SAFE SUBMISSION DEADLINE</div><div style="font-weight:800;font-size:26px;color:#7d1f16">27/01/2027</div></div><div style="text-align:right"><div style="font-size:30px;font-weight:800;color:#7d1f16">127</div><div class="small">days left</div></div></div>
  <div class="small">Submit by this date and, even with one resubmission (20 + 20 days), you still get a result by 08/03.</div></div>
</div>
<div class="card" style="margin-top:16px;padding:34px 30px 22px">
  <div style="position:relative;height:250px">
    {ticks}
    <div style="position:absolute;left:0;right:0;top:34px;height:3px;background:#c5cad1"></div>
    <div data-n="10" style="position:absolute;left:0;top:14px;height:210px;border-left:2px solid #1c2026"><span class="small" style="position:absolute;top:-2px;left:6px;font-weight:700;white-space:nowrap">Today 22/09</span></div>
    <div data-n="11" style="position:absolute;left:{tet_a}%;width:{tet_b-tet_a}%;top:112px;height:112px;background:repeating-linear-gradient(45deg,#fbf0dc 0 6px,#f5e1b8 6px 12px);border-radius:4px"><span class="small warn" style="position:absolute;top:2px;left:50%;transform:translateX(-50%)">Tết</span></div>
    <div style="position:absolute;top:26px;left:0;right:0;height:80px">{marks}</div>
    <div style="position:absolute;right:{100-fav_a+2.6}%;top:140px;height:22px;line-height:22px;font-size:12px;font-weight:700;color:#0d366b;white-space:nowrap">Smooth path · submit 27/01 → result 16/02</div>
    <div data-n="8" style="position:absolute;left:{fav_a}%;width:{fav_b-fav_a}%;top:140px;height:22px;background:#0d366b;border-radius:4px"></div>
    <div style="position:absolute;right:{100-fav_a+2.6}%;top:176px;height:22px;line-height:22px;font-size:12px;font-weight:700;color:#4f6485;white-space:nowrap">One resubmission · 20 + 20 days → result 08/03</div>
    <div data-n="9" style="position:absolute;left:{fav_a}%;width:{rev_b-fav_a}%;top:176px;height:22px;background:#6f86a8;border-radius:4px"></div>
  </div>
  <div class="row" style="gap:14px;margin-top:8px;align-items:flex-start">
    <div class="banner b-warn small" style="flex:1"><b>Lunar New Year (Tết) 2027 (expected 05–10/02) falls within the processing period.</b> Office closures may delay the result — which is why you should submit by the safe deadline.</div>
    <div class="banner b-bad small" style="flex:1">Submit on the <b>latest deadline, 16/02,</b> and need a resubmission → expected result <b>28/03 — after the first shooting day</b>.</div>
  </div>
</div>
<div class="row" style="justify-content:space-between;align-items:center;margin-top:14px">
  <div class="small muted" data-n="12" style="flex:1;padding-right:24px">Basis: Article 13 clause 4, Cinema Law 2022 (Law No. 05/2022/QH15) — 20 days from receipt of a complete, valid dossier; up to 20 more days if the script must be revised or supplemented.</div>
  <span class="btn g" data-n="13">Remind me by email · Add to calendar</span>
</div>
""", active="My projects", sidebar="Countdown", side_n=2)

add(dict(
 seq=17, sid="SC-29", name="20-day countdown", group="M5", tier="Tier 1 — Must",
 module="M5", actor="Member", prio="Must", route="/projects/[id]/timeline",
 design_note="Timeline counting back from the shoot, emphasising the submission deadline.",
 shown="Member clicks the deadline strip on `SC-12`, *Countdown* in the sidebar, or the deadline link on `SC-27`.",
 leave="Member changes the first shooting day / safety buffer, turns on reminders, or moves to the document kit.",
 el=[
  (1, "Navigation bar", "Header", "static", "—", "—"),
  (2, "Project sidebar", "List", "static; *Countdown* selected", "—", "—"),
  (3, "First shooting day (editable)", "Input (date)", "`projects.shooting_start_date`", "Yes", "after today"),
  (4, "Safety buffer", "Toggle (dropdown)", "`projects.buffer_days` — 0 / 7 / 14 / 21", "Yes", "default 7"),
  (5, "*Safe submission deadline* card", "Text", "`F-M2-17`: first shooting day − buffer − 20 − 20; days remaining", "Yes", "most prominent element on screen"),
  (6, "Timeline axis", "Chart (timeline)", "from today to after the first shooting day, monthly ticks", "Yes", "—"),
  (7, "Milestone", "Chart marker", "`timeline_milestones` — partner confirmed, Vietnamese version done, safe deadline, latest deadline, first shooting day", "Yes", "overdue milestones turn red"),
  (8, "Smooth-path bar", "Chart bar", "submission date → +20 days", "Yes", "—"),
  (9, "One-resubmission bar", "Chart bar", "submission date → +40 days", "Yes", "—"),
  (10, "Today line", "Chart marker", "current date", "—", "—"),
  (11, "Holiday band within processing period", "Chart band + Text", "`public_holidays` (Lunar New Year (Tết), 30/4–1/5, 2/9…)", "No", "only shown when it falls in the processing window; marked *expected* until the official calendar is out"),
  (12, "Article 13 cl.4 basis line", "Text", "static", "Yes", "—"),
  (13, "*Remind me by email · Add to calendar* button", "Button", "Resend + `.ics` file", "—", "—"),
 ],
 st=[
  ("Default", "Three top cards (first shooting day, buffer, safe submission deadline), timeline with milestones, two path bars, Tết band, two warnings.", "First shooting day set"),
  ("Empty (no data)", "No first shooting day: the axis is replaced by *Enter your first shooting day to calculate the deadline* + date field. Segment C: *Segment C projects don't need an Article 13 filming permit — no countdown*.", "No date / segment C"),
  ("Loading", "**Not applicable** — calculated instantly from the first shooting day; changing the date redraws the axis immediately.", "—"),
  ("Error", "First shooting day too close (safe deadline has passed): card 5 changes to *Safe submission deadline passed 12 days ago* + red warning and a *Book a VFDA consultation* button. Bad news is never hidden.", "Safe deadline < today"),
  ("Success / confirmation", "Reminders on → green strip *We'll remind you 30, 14 and 3 days before 27/01/2027* and the `.ics` file downloads.", "Reminders turned on"),
 ],
 ix=[
  ("First shooting day", "tap", "Edit date; all milestones recalculated; deadline strip on `SC-12` updated", "stays"),
  ("Safety buffer", "tap", "Change buffer days; recalculate", "stays"),
  ("A milestone", "tap", "Opens the related screen (partner confirmed → `SC-25`, Vietnamese version → `SC-28`)", "SC-25 / SC-28"),
  ("*Remind me by email* button", "tap", "Creates email reminders, downloads `.ics`", "stays"),
 ],
 sr=[
  ("**Safe submission deadline** = first shooting day − buffer − 20 − 20 days: room for **one resubmission** under Article 13 cl.4. This is the most emphasised figure.", "Function list — note #17; Article 13 cl.4"),
  ("Always show the consequence of submitting late (e.g. *result after the first shooting day*). Never soften bad news.", "Honesty principle"),
  ("The **same calculation function** is used by `SC-12`, `SC-27` and this screen.", "Consistency principle"),
  ("Public holidays are read from the `public_holidays` table; dates without an official calendar are clearly marked *expected*.", "No-guessing principle"),
  ("Calculated in **calendar days** until the VFDA Legal Board confirms the method (see open questions).", "Interim assumption"),
 ],
 fr=[("F-M2-17", "Calculate the 20-day milestone and countdown milestones"), ("F-M2-18", "Show both paths"), ("F-M5-07", "Enter planned shooting date"), ("F-M5-08", "Two-path timeline"), ("F-SYS-08", "Deadline reminder emails")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the horizontal axis becomes a vertical list of milestones; the safe submission deadline card stays on top.", "The timeline has a table alternative (milestone – date – days remaining) for screen readers.", "The safe deadline stands out through font size and border, not red alone."],
 oq=[("[NEEDS CLARIFICATION: are the \"20 days\" calendar days or working days — if working days, the safe deadline moves about 3 weeks earlier]", True),
     ("[NEEDS CLARIFICATION: official Lunar New Year (Tết) 2027 holiday dates — update once announced]", False)],
), html)

# =====================================================================  18 · SC-17
C = [("Tràng An", "Ninh Bình", 91), ("Lan Hạ Bay", "Hải Phòng", 86), ("Son River — Phong Nha", "Quảng Trị", 74)]
ROWS = [("Visual match to brief", ["✓", "✓", "✓"]), ("Crew size 15–50", ["✓", "✓", "△"]),
        ("Night shooting", ["△ site board permit", "✓", "to verify"]), ("Truck access", ["✓ to the landing", "△ by boat", "to verify"]),
        ("Lodging within 20 km", ["✓", "✓", "✓"]), ("Weather in 03/2027", ["✓ dry, cool", "△ fog", "✓"]),
        ("Permit complexity", ["high · heritage site", "medium", "high · national park"]), ("Provincial readiness", ["78", "72", "69"])]
def cell(v):
    if v.startswith("✓"): return f'<span class="ok">{v}</span>'
    if v.startswith("△"): return f'<span class="warn">{v}</span>'
    if v == "to verify": return f'<span class="bad" style="font-weight:400">{v}</span>'
    return v
head = "".join(f'<th style="text-transform:none;letter-spacing:0;font-size:13px;color:#1c2026;background:#fff"{nb(3, i==0)}><div class="ph" style="height:64px;margin-bottom:6px">photo</div><b>{n}</b><div class="small muted" style="font-weight:400">{p}</div><div style="margin-top:4px"><span style="font-size:18px;font-weight:800;color:#0d366b"{nb(4, i==0)}>{s}</span> <span class="small muted" style="font-weight:400">match score</span></div></th>' for i, (n, p, s) in enumerate(C))
body = ""
for ri, (lab, vals) in enumerate(ROWS):
    tdl = f'<td style="font-weight:700;background:#fafbfc"{nb(6, ri==0) or nb(8, lab=="Provincial readiness")}>{lab}</td>'
    tds = "".join(f'<td{nb(7, (ri==1 and ci==2))}>{cell(v)}</td>' for ci, v in enumerate(vals))
    body += f"<tr>{tdl}{tds}<td style='background:#fafbfc'></td></tr>"
body += '<tr><td style="background:#fafbfc"></td>' + "".join(f'<td><span class="btn sm {"" if i==0 else "g"}"{nb(10, i==0)}>{"Set as primary" if i==0 else "Set as backup"}</span> <span class="lnk small"{nb(12, i==0)}>Remove</span></td>' for i in range(3)) + '<td style="background:#fafbfc"></td></tr>'

html = page("SC-17", "Location comparison (up to 4)", "M3 · Member · Tier 2 · #18", "/locations/compare?ids=trang-an,lan-ha,song-son", f"""
<div class="row" style="justify-content:space-between;align-items:center" data-n="2"><div><h1>Compare 3 / 4 locations</h1><div class="sub">Based on The Last Ferry's brief · shooting month 03/2027</div></div><span class="btn g" data-n="11">Download comparison PDF</span></div>
<div class="card" style="margin-top:14px;padding:4px 6px">
<table class="t" style="table-layout:fixed">
  <tr><th style="width:210px;background:#fff"></th>{head}<th style="width:150px;background:#fff" data-n="5"><div class="ph" style="height:150px;border-style:dashed;background:#fafbfc;color:#5b626c">+ Add location<br>(1 slot left)</div></th></tr>
  {body}
</table>
</div>
<div class="small muted" data-n="9" style="margin-top:10px"><span class="ok">✓</span> meets &nbsp;·&nbsp; <span class="warn">△</span> caution &nbsp;·&nbsp; <span class="bad" style="font-weight:400">to verify</span> = no confirmed data yet; the system does not guess</div>
""", active="Locations", sidebar=None)

add(dict(
 seq=18, sid="SC-17", name="Location comparison (up to 4)", group="Tier 2", tier="Tier 2 — Should",
 module="M3", actor="Guest / Member", prio="Should", route="/locations/compare",
 design_note="Source M3·2.",
 prio_note="Screen List v2.0 puts `SC-17` at **Must**; the function list places it in **Tier 2 — Should**. This spec follows the function list.",
 shown="User clicks *View comparison* on `SC-14`, or the *Locations* gauge on `SC-12`.",
 leave="User sets a primary / backup location, downloads the PDF, or opens a location's details.",
 el=[
  (1, "Navigation bar", "Header", "static", "—", "—"),
  (2, "*Compare n / 4* title + context", "Header", "number of columns; current query and shooting month", "—", "—"),
  (3, "Location column", "List", "`locations.name`, `provinces.name`, `cover_image`", "—", "2–4 columns"),
  (4, "Match score", "Text", "`F-M3-08` for the current query", "—", "—"),
  (5, "Add-location slot", "Button", "static", "—", "hidden when 4 columns are filled"),
  (6, "Criteria row", "List", "8 fixed criteria", "—", "fixed order"),
  (7, "Value cell", "Text", "`✓` / `△` / *to verify* + short note", "**Yes**", "never blank — missing data shows *to verify*"),
  (8, "*Provincial readiness* row", "Text", "`v_province_readiness.score`", "—", "same source as `SC-18`"),
  (9, "Symbol legend", "Text", "static", "Yes", "—"),
  (10, "*Set as primary* / *Set as backup* button", "Button", "writes `project_shortlist.role` = primary / backup", "—", "at most 1 primary location per scene; login required"),
  (11, "*Download comparison PDF* button", "Button", "generates PDF", "—", "login required"),
  (12, "*Remove* link", "Link", "removes from the basket", "—", "—"),
 ],
 st=[
  ("Default", "Table of 8 criteria × 2–4 columns, an empty 4th slot to add one, set buttons under each column.", "Basket has ≥ 2 locations"),
  ("Empty (no data)", "Basket has 0–1 locations: *You need at least two locations to compare* + button back to `SC-14`.", "Basket < 2"),
  ("Loading", "Grey skeleton in the shape of the table.", "Loading"),
  ("Error", "*Couldn't load comparison data. Your basket is still saved.* + *Try again*.", "Query error"),
  ("Success / confirmation", "Set → green strip *Tràng An set as primary location* and the *Locations* gauge goes up.", "Writes `F-M3-18`"),
 ],
 ix=[
  ("Location name at top of column", "tap", "—", "SC-16"),
  ("*+ Add location* slot", "tap", "Back to results to pick more", "SC-14"),
  ("*Set as primary* / *backup* button", "tap", "Not logged in → `SC-04`; logged in → saved to the project", "SC-12"),
  ("*Download comparison PDF* button", "tap", "Generate PDF", "stays"),
  ("*Remove*", "tap", "Remove column", "stays"),
  ("*Provincial readiness* row value", "tap", "—", "SC-18"),
 ],
 sr=[
  ("At most **4 locations**; the basket is kept for the session.", "Function list — Tier 2 #18"),
  ("**Every cell is meets, caution, or to verify — never blank.** *To verify* = no data yet; the system does not guess.", "No-guessing principle"),
  ("Weather is based on the project's **shooting month**, not the annual average.", "TL5 §M3"),
  ("Primary and **backup** are set separately — productions always need a plan B for outdoor locations.", "Production practice"),
  ("The table scrolls horizontally in its own frame; the criteria column is pinned.", "Layout"),
 ],
 fr=[("F-M3-16", "Select up to four locations"), ("F-M3-17", "Comparison table by criteria"), ("F-M3-18", "Add to shortlist")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the table scrolls horizontally in its own frame, with the criteria column pinned on the left.", "✓ / △ symbols always come with a text legend; the three states remain distinguishable in black-and-white print.", "The table uses `<table>` with `<th scope>`."],
 oq=[("[NEEDS CLARIFICATION: data source for the *Night shooting* and *Weather by month* criteria — no matching field in `locations` yet]", True)],
), html)

# =====================================================================  19 · SC-18
html = page("SC-18", "Provincial readiness index", "M3 · Guest / VFDA · Tier 2 · #19", "/provinces/ninh-binh", f"""
<div class="small muted">Locations › Provinces</div>
<div class="row" style="justify-content:space-between;align-items:flex-end;margin-top:6px">
  <div data-n="2"><h1>Ninh Bình</h1><div class="sub">After the 2025 merger: covers the former Ninh Bình, Hà Nam and Nam Định</div></div>
  <div class="small muted" data-n="12">Updated 21/09/2026 · recalculated nightly</div>
</div>
<div class="row" style="gap:16px;margin-top:14px;align-items:stretch">
  <div class="card hl" data-n="3" style="width:230px;text-align:center"><div class="small muted">Readiness index</div><div style="font-size:54px;font-weight:800;color:#0d366b;line-height:1.1">78</div><div class="small">/ 100</div><div class="small lnk" data-n="7" style="margin-top:8px">How the index is calculated →</div></div>
  <div class="card" data-n="4" style="flex:1"><div class="row" style="justify-content:space-between"><b>Quarterly trend</b><span class="small muted">Q4/25 → Q3/26</span></div>
    <svg width="100%" height="110" viewBox="0 0 400 110" preserveAspectRatio="none"><line x1="0" y1="100" x2="400" y2="100" stroke="#e1e4e8"/><polyline points="20,78 140,64 260,52 380,34" fill="none" stroke="#0d366b" stroke-width="3"/><circle cx="380" cy="34" r="5" fill="#0d366b"/>
    <text x="20" y="94" font-size="11" fill="#6b727c">61</text><text x="140" y="80" font-size="11" fill="#6b727c">67</text><text x="260" y="68" font-size="11" fill="#6b727c">72</text><text x="360" y="26" font-size="12" font-weight="700" fill="#0d366b">78</text></svg></div>
  <div class="card" data-n="10" style="width:260px"><b>Neighbouring provinces</b><div class="small col" style="gap:5px;margin-top:6px"><div class="row" style="justify-content:space-between"><span>Quảng Ninh</span><b>81</b></div><div class="row" style="justify-content:space-between"><span>Ninh Bình</span><b style="color:#0d366b">78</b></div><div class="row" style="justify-content:space-between"><span>Hải Phòng</span><b>72</b></div><div class="row" style="justify-content:space-between"><span>Thanh Hóa</span><b class="muted">— insufficient data</b></div></div></div>
</div>
<div class="row" style="gap:16px;margin-top:14px;align-items:flex-start">
  <div class="card" data-n="5" style="flex:1.3;padding:4px 6px">
    <table class="t"><tr><th>Component</th><th>Value</th><th>Score</th><th>Sample size</th></tr>
      <tr><td>Locations verified by VFDA</td><td>14 locations</td><td><b>85</b></td><td class="small muted">—</td></tr>
      <tr><td>Verified suppliers active in the province</td><td>6 organisations</td><td><b>70</b></td><td class="small muted">—</td></tr>
      <tr><td>Provincial response time to notices</td><td>avg 3.5 working days</td><td><b>80</b></td><td class="small"><span class="warn" data-n="6">n = 9 · small sample</span></td></tr>
      <tr><td>Partnership requests answered within 72 hours</td><td>83%</td><td><b>76</b></td><td class="small muted">n = 23</td></tr>
      <tr><td>Government contact verified in the last 12 months</td><td>100%</td><td><b>—</b></td><td class="small muted">condition</td></tr>
    </table>
    <div class="small muted" style="padding:6px 10px">Calculated from activity data on CINEMATCH, not a subjective rating of the province.</div>
  </div>
  <div style="flex:1" class="col">
    <div class="card" data-n="8"><b>Featured locations</b><div class="small col" style="gap:4px;margin-top:6px"><div class="lnk">Tràng An — Scenic Landscape Complex</div><div class="lnk">Tam Cốc – Bích Động</div><div class="lnk">Phát Diệm Stone Cathedral</div><div class="lnk">Vân Long Lagoon</div></div></div>
    <div class="card" data-n="9"><b>Suppliers active in the province</b><div class="small" style="margin-top:6px">Bến Xưa Production Services · Tràng An Boat Crew · +4</div></div>
    <span class="btn" data-n="11">View 14 locations in Ninh Bình</span>
  </div>
</div>
""", active="Locations", logged=False)

add(dict(
 seq=19, sid="SC-18", name="Provincial readiness index", group="Tier 2", tier="Tier 2 — Should",
 module="M3", actor="Guest / VFDA Staff", prio="Should", route="/provinces/[slug]",
 design_note="Source M3·3.",
 prio_note="Screen List v2.0 puts `SC-18` at **Must**; the function list places it in **Tier 2 — Should**. This spec follows the function list.",
 shown="User clicks the *Provincial readiness* block on `SC-16`, the *Provincial readiness* row on `SC-17`, or the province name in the breadcrumb.",
 leave="User views locations in the province (`SC-14` filtered), opens a location (`SC-16`) or a supplier (`SC-20`).",
 el=[
  (1, "Navigation bar", "Header", "static", "—", "—"),
  (2, "Province name + 2025 merger note", "Header", "`provinces.name`, `provinces.merged_from[]`", "Yes", "list of 34 provinces and cities"),
  (3, "Composite index", "Text", "`v_province_readiness.score`", "Yes", "0–100; insufficient data → *—*"),
  (4, "Quarterly trend", "Chart (line)", "`province_readiness_snapshots`, last 4 quarters", "No", "quarterly axis, last point emphasised"),
  (5, "Components table", "List", "5 components in `v_province_readiness`", "Yes", "each component shows raw value and score"),
  (6, "Sample size / confidence", "Text", "number of records used in the calculation", "Yes", "n < 10 → *small sample* label"),
  (7, "*How the index is calculated* link", "Link", "formula explanation page", "—", "—"),
  (8, "Featured locations", "List", "province's `locations`, sorted by interest", "No", "max 4"),
  (9, "Suppliers active in the province", "List", "`organization_provinces`", "No", "Verified organisations only"),
  (10, "Neighbouring provinces", "List", "`provinces.neighbors[]` + score", "No", "provinces lacking data show *insufficient data*"),
  (11, "*View n locations in province* button", "Button", "static", "—", "—"),
  (12, "Last updated line", "Text", "`v_province_readiness.computed_at`", "Yes", "—"),
 ],
 st=[
  ("Default", "Large index, trend and neighbouring provinces on the top row; components table and lists below.", "Province has enough data"),
  ("Empty (no data)", "Province lacks data: index shows *—* with *Not enough data to calculate (at least 5 verified locations needed)*; the location list still shows if any.", "Below data threshold"),
  ("Loading", "Grey skeleton for the index and table (page is pre-rendered, refreshed nightly).", "Internal navigation"),
  ("Error", "Province doesn't exist (e.g. old name) → redirect to the new post-merger province, with the line *Quảng Nam is now part of Đà Nẵng City*.", "Old / wrong slug"),
  ("Success / confirmation", "**Not applicable** — read-only screen.", "—"),
 ],
 ix=[
  ("*How the index is calculated*", "tap", "Open the explanation page", "stays"),
  ("Featured location", "tap", "—", "SC-16"),
  ("Supplier", "tap", "—", "SC-20"),
  ("Neighbouring province", "tap", "—", "SC-18 (other province)"),
  ("*View n locations* button", "tap", "Open results filtered by province", "SC-14"),
 ],
 sr=[
  ("The index is **calculated only from data generated on the platform** (first-party), not a subjective rating of the province.", "Team idea review — provincial index redefined"),
  ("Always show the **sample size**; n < 10 gets a *small sample* label. Below the minimum threshold, no score is shown.", "Data honesty principle"),
  ("Formula and weights are published at *How the index is calculated*.", "Anti-black-box principle"),
  ("Province list follows the **34 units after the 2025 merger**; old slugs redirect to the new province.", "2025 resolution on merging administrative units"),
  ("The *government contact verified in the last 12 months* component is a **condition** for having a score, not a points component.", "TL5 §M3"),
 ],
 fr=[("F-M3-19", "Calculate index from platform data"), ("F-M3-20", "Province page and navigation into search")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: all blocks stack vertically; the composite index sits on top.", "The trend chart has an alternative data table.", "The *small sample* label is text, not colour alone."],
 oq=[("[NEEDS CLARIFICATION: does VFDA agree to publish the provincial index — it may be sensitive for low-scoring provinces]", True),
     ("[NEEDS CLARIFICATION: minimum data threshold for showing the index]", False)],
), html)

# =====================================================================  20 · SC-32
def prov(name, steps_done, status, scls, body, n=False):
    a = (lambda x: f' data-n="{x}"') if n else (lambda x: "")
    labels = ["Notice drafted", "Sent by VFDA", "Province received", "Province replied"]
    st = ""
    for i, l in enumerate(labels):
        cls = "done" if i < steps_done else ("" if i == steps_done else "off")
        st += f'<div class="col" style="align-items:center;gap:3px;width:110px"><div class="dot {cls}">{"✓" if i < steps_done else i+1}</div><div class="small" style="text-align:center">{l}</div></div>'
        if i < 3:
            st += f'<div class="line {"" if i < steps_done-1 else "off"}" style="margin-bottom:32px"></div>'
    return f"""<div class="card"{a(4)}><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">{name}</h2><span class="pill {scls}"{a(6)}>{status}</span></div>
<div class="step" style="margin:12px 0 6px"{a(5)}>{st}</div><div class="small"{a(7)}>{body}</div></div>"""

html = page("SC-32", "Provincial People's Committee notice", "M7 · Member · Tier 2 · #20", "/projects/the-last-ferry/provinces", f"""
<div class="row" style="justify-content:space-between;align-items:flex-start">
  <div data-n="3"><h1>Coordinating with provinces</h1><div class="sub" style="max-width:640px">VFDA notifies the Provincial People's Committee of each province where you plan to shoot, so local authorities are aware and can offer support.</div></div>
  <div class="row" style="gap:10px"><span class="btn g" data-n="11">+ Add province</span></div>
</div>
<div class="banner b-info small" data-n="12" style="margin-top:12px"><b>Note:</b> this notice helps the province prepare; it <b>does not replace the permit</b> from the Ministry of Culture, Sports and Tourism (MoCST) under Article 13.</div>
<div class="row" style="gap:16px;margin-top:14px;align-items:flex-start">
  <div style="flex:1.3" class="col">
    {prov("Ninh Bình", 4, "Received", "p-ok", "<b>Reply 20/09:</b> The province will support the shoot. The crew should meet the <b>Tràng An Landscape Complex Management Board</b> before scouting. <span class='lnk'>Next step: add to document kit →</span>", True)}
    {prov("Hải Phòng", 2, "Waiting", "p-info", "Sent by VFDA 20/09. Replies usually take 3–7 working days.")}
    <div class="card soft small" style="display:flex;justify-content:space-between;align-items:center"><span>Quảng Trị (Son River — Phong Nha) · backup · not sent</span><span class="btn sm" data-n="10">Ask VFDA to send notice</span></div>
  </div>
  <div style="flex:1" class="card" data-n="8">
    <div class="row" style="justify-content:space-between"><h3>Notice preview</h3><span class="small muted">Vietnamese letter · Hải Phòng</span></div>
    <div style="border:1px solid #dce0e5;border-radius:6px;padding:14px;font-size:12.5px;line-height:1.6;background:#fffefb">
      <div style="text-align:center;font-weight:700">HIỆP HỘI … VFDA</div>
      <div style="margin-top:8px"><b>Kính gửi:</b> Ủy ban nhân dân thành phố Hải Phòng</div>
      <div><b>V/v:</b> Thông báo đoàn làm phim nước ngoài dự kiến quay tại địa phương</div>
      <div data-n="9" style="margin-top:8px;padding:8px;background:#f3f5f7;border-radius:4px">Dự án: <b>The Last Ferry</b> (phim truyện, Hàn Quốc)<br>Thời gian dự kiến: 15/03 – 01/04/2027<br>Địa điểm: Vịnh Lan Hạ (Cát Bà) · Quy mô đoàn: 15–50 người<br>Đơn vị dịch vụ Việt Nam: Bến Xưa Production Services</div>
      <div style="margin-top:8px" class="muted">… rest of the letter drafted by VFDA from its template …</div>
    </div>
  </div>
</div>
""", active="My projects", sidebar="Provinces", side_n=2)

add(dict(
 seq=20, sid="SC-32", name="Provincial People's Committee notice", group="Tier 2", tier="Tier 2 — Should",
 module="M7", actor="Member", prio="Should", route="/projects/[id]/provinces",
 design_note="Source M7·1.",
 prio_note="Screen List v2.0 puts `SC-32` at **Must**; the function list places it in **Tier 2 — Should**. This spec follows the function list.",
 shown="Member clicks *I'm interested in this location* on `SC-16`, *Provinces* in the sidebar, or a *province replied* notification.",
 leave="Member adds a province, asks VFDA to send a notice, or opens the next step from a province's reply.",
 el=[
  (1, "Navigation bar", "Header", "static", "—", "—"),
  (2, "Project sidebar", "List", "static; *Provinces* selected", "—", "—"),
  (3, "Title + purpose", "Header + Text", "static", "—", "—"),
  (4, "Province card", "Container", "`province_notices` for the project", "—", "one card per province"),
  (5, "4-step progress", "Chart (stepper)", "`drafted_at`, `sent_at`, `received_at`, `responded_at`", "Yes", "exactly 4 steps"),
  (6, "Reply status", "Text", "`province_notices.response` — Received / More info needed / Cannot support at this time / Waiting", "Yes", "enum; always has text"),
  (7, "Reply content + next step", "Text", "`province_notices.response_note` entered by VFDA from the province's official letter", "—", "—"),
  (8, "Notice letter preview", "Container", "`notice_templates` template drafted by VFDA", "—", "read-only for members"),
  (9, "Project details included in the notice", "Text", "`projects.*`, confirmed locations, confirmed partners", "Yes", "must include: project, dates, location, crew size, Vietnamese company"),
  (10, "*Ask VFDA to send notice* button", "Button", "creates `province_notices` with status `requested`", "—", "requires shooting dates and a location in the province"),
  (11, "*+ Add province* button", "Button", "static", "—", "—"),
  (12, "*Does not replace the permit* note", "Text", "static", "Yes", "always shown"),
 ],
 st=[
  ("Default", "One card per province with 4-step progress and reply; letter preview on the right.", "Project has at least one notice"),
  ("Empty (no data)", "No notices yet: *No province has been notified yet. Click \"I'm interested in this location\" on a location, or Add province.* + *Add province* button.", "0 notices"),
  ("Loading", "Grey skeleton for province cards.", "Loading"),
  ("Error", "Required information missing (e.g. no shooting date): send button disabled with the reason *A first shooting day is needed before notifying*. Send error: *Couldn't send the request to VFDA — try again*.", "Missing data / write error"),
  ("Success / confirmation", "Request sent → new province card at step 1 with *VFDA will send the notice within 2 working days*. Province replies → in-app notification and email.", "Request created / reply received"),
 ],
 ix=[
  ("*+ Add province* button", "tap", "Choose from the 34 provinces and cities; suggestions from confirmed locations", "stays"),
  ("*Ask VFDA to send notice* button", "tap", "Creates a request for VFDA (`F-M7-02`)", "stays"),
  ("*Next step: add to document kit*", "tap", "—", "SC-26"),
  ("Province card", "tap", "Switch the preview to that province", "stays"),
 ],
 sr=[
  ("Notices are **sent by VFDA**, not directly by the production — VFDA is the point of contact with provinces.", "TL3 — VFDA's role"),
  ("Always show the note: the notice **does not replace the permit** from MoCST.", "Honesty principle"),
  ("The province's reply is one of **three final statuses** (Received / More info needed / Cannot support at this time — enum `received`, `info_needed`, `cannot_support`), entered by VFDA from the actual official letter.", "F-M7-03"),
  ("Response time is recorded and used for the provincial readiness index on `SC-18`.", "F-M3-19"),
  ("The preview uses real project data; if a required field is missing, sending is blocked.", "Data integrity"),
 ],
 fr=[("F-M7-01", "Mark interest in a location"), ("F-M7-02", "Generate and send notice"), ("F-M7-03", "Province replies with three statuses"), ("F-M7-04", "Status tracking page")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the preview collapses into a *View notice* button; the 4-step progress becomes a vertical list.", "Progress is an `<ol>` with `aria-current=\"step\"`.", "Reply status has text, not colour alone."],
 oq=[("[NEEDS CLARIFICATION: does VFDA have the authority / established practice to send notices to Provincial People's Committees, and what is the official letter template]", True),
     ("[NEEDS CLARIFICATION: should the notice go to the Provincial People's Committee or the provincial Department of Culture]", True)],
), html)
