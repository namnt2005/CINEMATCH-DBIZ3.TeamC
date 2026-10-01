# -*- coding: utf-8 -*-
"""Screens 8–14: M2 (Article 13 dossier), M3 (description, results, detail), M4 (directory, profile, requests)."""
from base import page

SCREENS = []


def add(spec, html):
    SCREENS.append((spec, html))


# =====================================================================  8 · SC-27
def item(n_row, n_st, n_chk, n_act, letter, title, pill, pillcls, checks, action):
    a = lambda k: f' data-n="{k}"' if k else ""
    return f"""<tr><td style="width:34px;font-weight:800;color:#0d366b"{a(n_row)}>{letter}</td>
<td><b>{title}</b><div class="small muted" style="margin-top:4px"{a(n_chk)}>{checks}</div></td>
<td style="width:130px"><span class="pill {pillcls}"{a(n_st)}>{pill}</span></td>
<td style="width:190px;text-align:right"><span{a(n_act)}>{action}</span></td></tr>"""

html = page("SC-27", "Article 13 dossier completeness check", "M2 · Member · Tier 1 · #8", "/projects/the-last-ferry/dossier-check", f"""
<div class="row" style="justify-content:space-between;align-items:flex-start">
  <div data-n="3"><h1>Dossier completeness check</h1><div class="sub">Checks the 4 components required by <b>Article 13 clause 3, Cinema Law 2022 (Law No. 05/2022/QH15)</b> · checked at 09:15 today</div></div>
  <div data-n="4" style="width:260px"><div class="row" style="justify-content:space-between"><span class="small muted">Complete</span><b>1 / 4</b></div><div class="bar" style="margin-top:6px"><i style="width:25%"></i></div></div>
</div>
<div class="banner b-bad" data-n="5" style="margin-top:14px"><b>Not ready to submit.</b> 3 components are still missing. The 20-day processing period only starts once the authority receives a <b>complete, valid dossier</b>.</div>
<div class="row" style="gap:18px;margin-top:14px;align-items:flex-start">
  <div class="card" style="flex:1;padding:4px 6px">
  <table class="t">
   <tr><th></th><th>Component under Article 13 cl.3</th><th>Status</th><th></th></tr>
   {item(6, 7, 8, 9, "a", "Application for a filming permit, on the MoCST form", "✓ Present", "p-ok", "Uploaded 10/09 · Auto-check: correct form, all pages present. <b>Signature and seal: needs human review</b>", '<span class="lnk">View file</span>')}
   {item(None, None, None, None, "b", "Synopsis and detailed script of the scenes shot in Vietnam, in Vietnamese", "✎ Needs fixing", "p-warn", "English version: present · <b class='bad'>Vietnamese version: missing</b> · 6/14 passages reviewed", '<span class="btn sm">Draft Vietnamese version</span>')}
   {item(None, None, None, None, "c", "Service agreement or contract with a Vietnamese entity", "⏳ Pending", "p-info", "Bến Xưa Production Services has responded — partnership not yet confirmed", '<span class="btn sm g">View collaboration request</span>')}
   {item(None, None, None, None, "d", "Written commitment not to breach Article 9 of the Cinema Law", "○ Missing", "p-bad", "A bilingual commitment template is provided by VFDA", '<span class="lnk">Download template</span> &nbsp;<span class="btn sm g">Upload</span>')}
  </table>
  </div>
  <div style="width:300px;flex:none" class="col">
    <div class="card soft" data-n="10"><h3>Where to submit, how long it takes</h3><div class="small col" style="gap:5px"><div>Licensing authority: <b>Ministry of Culture, Sports and Tourism (MoCST)</b></div><div>Processing time: <b>20 days</b> from receipt of a complete, valid dossier; up to <b>20 more days</b> if the script must be revised or supplemented (Article 13 cl.4).</div><div class="lnk">View project countdown →</div></div></div>
    <span class="btn g" data-n="11">Re-run check</span>
  </div>
</div>
<div class="disc" data-n="12">This result only checks which components are present or missing. It is not legal advice and does not replace review by the competent authority.</div>
""", active="My projects", sidebar="Article 13 dossier", side_n=2)

add(dict(
 seq=8, sid="SC-27", name="Article 13 dossier completeness check", group="M2", tier="Tier 1 — Must",
 module="M2", actor="Member", prio="Must", route="/projects/[id]/dossier-check",
 design_note="Checklist with a status for each item.",
 split_note="In the previous Screen List, `SC-27` covered both *dossier completeness* and *content review*. Content review has moved to `SC-48`. `SC-27` now only checks the 4 components under Article 13 clause 3.",
 shown="The member clicks the *Dossier & permits* gauge on `SC-12`, the *Article 13 dossier* item in the sidebar, or has just uploaded a document on `SC-26`.",
 leave="The member clicks a component's action (draft the Vietnamese version, view the collaboration request, upload) or opens the countdown.",
 el=[
  (1, "Navigation bar", "Header", "static", "—", "—"),
  (2, "Project sidebar", "List", "static; *Article 13 dossier* item selected", "—", "—"),
  (3, "Title + legal basis + check time", "Header + Text", "static + `DOSSIER_CHECK — computed on read; the time shown is the time of the check`", "Yes", "—"),
  (4, "Progress x / 4", "Text + bar", "count of components with status *Present*", "Yes", "0–4"),
  (5, "Verdict banner", "Text", "derived from progress: 4/4 → *All components present*; any missing → *Not ready to submit*", "Yes", "never use the words *passed* or *approved*"),
  (6, "Component rows (a, b, c, d)", "List", "the project's `document_slot` of type `art13_*`", "Yes", "exactly 4 rows, ordered a–d as in Article 13 cl.3"),
  (7, "Status label", "Text", "`document_slot.state` — `present` / `needs_fix` / `pending` / `missing`", "Yes", "always icon plus text"),
  (8, "Check details", "Text", "`DOSSIER_CHECK` — computed on read: which parts were checked automatically and which need a person", "—", "must clearly separate *auto-checked* from *needs human review*"),
  (9, "Component action", "Button / Link", "by status: View file / Draft Vietnamese version / View collaboration request / Download template + Upload", "—", "—"),
  (10, "*Where to submit, how long it takes* block", "Text", "static; wording approved by the VFDA Legal Board", "Yes", "quotes Article 13 cl.4 accurately"),
  (11, "*Re-run check* button", "Button", "static", "—", "—"),
  (12, "Disclaimer", "Text", "static", "Yes", "always shown"),
 ],
 st=[
  ("Default", "Progress, verdict banner, table of 4 components with status and action, authority & processing-time block.", "Screen opens"),
  ("Empty (no data)", "No documents yet: all 4 rows at *○ Missing*, red *Not ready to submit* banner, each row offers *Download template* and *Upload*.", "Project has no uploads"),
  ("Loading", "Grey placeholders for the 4 rows; title and processing-time block show immediately as they are static.", "Loading status"),
  ("Error", "A file cannot be read: that row switches to *✎ Needs fixing* with the reason *File is corrupted or password-protected — upload an unlocked PDF*. Page load failure: *Couldn't load dossier status* + *Try again*.", "Bad file / query error"),
  ("Success / confirmation", "4/4 complete: banner turns green *All 4 components under Article 13 cl.3 are present. Next step: check the countdown and submit well before the deadline.* — never uses the word *passed*.", "4/4 components *Present*"),
 ],
 ix=[
  ("*View file* (row a)", "tap", "Opens a file preview", "stays"),
  ("*Draft Vietnamese version* (row b)", "tap", "—", "SC-28"),
  ("*View collaboration request* (row c)", "tap", "—", "SC-25"),
  ("*Download template* / *Upload* (row d)", "tap", "Downloads the bilingual template / opens the document kit upload area", "SC-26"),
  ("*View project countdown*", "tap", "—", "SC-29"),
  ("*Re-run check* button", "tap", "Re-runs `F-M2-08`, updates the gauge", "stays"),
 ],
 sr=[
  ("Exactly **4 components** under Article 13 clause 3, kept in order a–d; nothing added, nothing merged.", "Cinema Law 2022, Article 13 cl.3"),
  ("Four statuses: **Present / Needs fixing / Pending / Missing** — always icon plus text, never colour alone.", "Screen list file — note #8"),
  ("Each row clearly separates *what the machine checked* from *what needs human review*. The machine must **not** declare a signature or seal valid.", "No-guessing principle"),
  ("The completeness check is **deterministic** (rule-based) and does not use a language model.", "TL5 §M2"),
  ("Row c status is synced with the collaboration request: it only becomes *Present* once the request is **confirmed** and the agreement has been uploaded.", "M4 ↔ M2 link"),
  ("Row b only becomes *Present* once **all passages** of the Vietnamese version have been reviewed on `SC-28`.", "M5 ↔ M2 link"),
 ],
 fr=[("F-M2-08", "Check the four components under Article 13"), ("F-M2-09", "Show missing items"), ("F-M2-10", "Update the compliance gauge"), ("F-M5-03", "Per-component status")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the table becomes 4 stacked cards (letter, name, status, details, button); the processing-time block moves below.", "The table uses a real `<table>`; statuses have full text for screen readers.", "The verdict banner is a `role=\"status\"` region."],
 oq=[("[NEEDS CLARIFICATION: are the \"20 days\" in Article 13 cl.4 working days or calendar days — this directly affects the countdown]", True),
     ("[NEEDS CLARIFICATION: which application form is currently in force, and may VFDA provide a bilingual version of it]", True)],
), html)

# =====================================================================  9 · SC-15
html = page("SC-15", "Scene description (AI Matching input)", "M3 · Guest / Member · Tier 1 · #9", "/locations/describe", f"""
<div class="row" style="justify-content:space-between;align-items:flex-end" data-n="2">
  <div><h1>Describe the scene you need</h1><div class="sub">Write it as you would for a location scout. The system reads your description, you confirm it, then we search.</div></div>
  <div class="tabs" style="border:none"><span class="on">By description</span><span>By filters</span></div>
</div>
<div class="row" style="gap:22px;margin-top:14px;align-items:flex-start">
  <div style="flex:1.25" class="col">
    <div class="field" data-n="3" style="min-height:130px;line-height:1.6;font-size:14.5px">A ferry landing at dawn among limestone karsts, set in the 1970s. A waterside fishing village, around 30 extras. We also need night scenes with lanterns on the boats.</div>
    <div class="row" data-n="4" style="gap:6px;flex-wrap:wrap"><span class="small muted">Try to mention:</span><span class="chip dash">scene type ✓</span><span class="chip dash">period ✓</span><span class="chip dash">time of day ✓</span><span class="chip dash">water? ✓</span><span class="chip dash">terrain ✓</span><span class="chip dash">crew size ✓</span><span class="chip dash">constraints ✓</span></div>
    <div class="row" style="gap:10px"><span class="btn g" data-n="5">Analyse description</span><span class="small muted">41 words · about 5 seconds</span></div>
    <div class="card soft" data-n="12"><div class="small muted">Examples of good descriptions</div><div class="small">"Old town street with tiled roofs and lanterns, night shoot, 10 people, need to close traffic for 2 hours." · "Terraced rice fields at harvest, drone shots, September–October."</div></div>
  </div>
  <div style="flex:1" class="card hl" data-n="6">
    <h2>What the system understood</h2>
    <div class="small muted" style="margin-bottom:10px">Click a tag to edit it, × to remove it. The search only uses what is shown here.</div>
    <div class="col" style="gap:9px;font-size:13px">
      <div class="row" style="gap:8px;align-items:center"><span style="width:118px" class="muted">Scene type</span><span class="chip on" data-n="7">river landing ×</span><span class="chip on">waterside village ×</span></div>
      <div class="row" style="gap:8px;align-items:center"><span style="width:118px" class="muted">Period</span><span class="chip on">1970s ×</span></div>
      <div class="row" style="gap:8px;align-items:center"><span style="width:118px" class="muted">Time of day</span><span class="chip on">dawn ×</span><span class="chip on">night ×</span></div>
      <div class="row" style="gap:8px;align-items:center"><span style="width:118px" class="muted">Water</span><span class="chip on">river / lake ×</span></div>
      <div class="row" style="gap:8px;align-items:center"><span style="width:118px" class="muted">Terrain</span><span class="chip on">limestone karst ×</span></div>
      <div class="row" style="gap:8px;align-items:center"><span style="width:118px" class="muted">Crew size</span><span class="chip on">15–50 ×</span></div>
      <div class="row" style="gap:8px;align-items:center"><span style="width:118px" class="muted">Constraints</span><span class="chip on">night shoot ×</span><span class="chip dash">+ add</span></div>
    </div>
    <div class="banner b-warn small" data-n="8" style="margin-top:12px">"<b>fishing village</b>" is not in the catalogue — mapped to "<b>waterside village</b>". <span class="lnk">Change</span></div>
    <div class="hr"></div>
    <div class="g2">
      <div data-n="9"><div class="lab">Planned shooting month</div><div class="field">03 / 2027</div></div>
      <div data-n="10"><div class="lab">Link to project</div><div class="field">The Last Ferry ▾</div></div>
    </div>
    <span class="btn" data-n="11" style="width:100%;margin-top:14px;height:42px">Find matching locations</span>
  </div>
</div>
""", active="Locations")

add(dict(
 seq=9, sid="SC-15", name="Scene description (AI Matching input)", group="M3", tier="Tier 1 — Must",
 module="M3", actor="Guest / Member", prio="Must", route="/locations/describe",
 design_note="Free-text input with structure hints.",
 shown="The user clicks *Where should we shoot each scene?* on `SC-01`, *Locations* in the navigation bar, or *Edit description* on `SC-14`.",
 leave="The user clicks *Find matching locations* (to `SC-14`) or switches to the *By filters* tab.",
 el=[
  (1, "Navigation bar", "Header", "static", "—", "—"),
  (2, "Title + mode switch", "Header + Toggle", "static: By description / By filters", "—", "—"),
  (3, "Scene description box", "Input (textarea)", "`location_query.scene_description`", "Yes", "10–1000 characters (Function List F-M3-10)"),
  (4, "Structure hints (chips)", "List", "7 attribute groups; a chip ticks ✓ automatically once the description covers it", "—", "hints only, never blocking"),
  (5, "*Analyse description* button", "Button", "calls `F-M3-11`", "—", "disabled under 10 characters"),
  (6, "*What the system understood* block", "Container", "`location_query.attributes` (JSONB)", "Yes", "only values from the catalogue (`F-M3-12`)"),
  (7, "Attribute tag", "Toggle (edit / remove chip)", "one value in `attributes`", "—", "accepts catalogue values only"),
  (8, "Mapping warning", "Text", "term not in the catalogue and the value it was mapped to", "—", "always shown when a mapping occurs; has a *Change* button"),
  (9, "Planned shooting month", "Input (month/year)", "`location_query.shoot_month`; prefilled from `project.shoot_date`", "No", "valid month, not in the past"),
  (10, "Link to project", "Toggle (dropdown)", "`location_query.project_id`", "No", "user's own projects only; hidden for guests"),
  (11, "*Find matching locations* button", "Button", "static", "—", "disabled when the attribute block is empty"),
  (12, "Examples of good descriptions", "Text", "static", "—", "—"),
 ],
 st=[
  ("Default", "Empty description box with examples; *What the system understood* block greyed out with the line *Analyse your description to see what the system understood*. The mockup shows the state after analysis.", "Page opens"),
  ("Empty (no data)", "Analysis finished but no attributes extracted: *We couldn't understand the description — try stating the scene type and terrain* + switch to *By filters*.", "Empty extraction result"),
  ("Loading", "*Analyse description* button shows a spinner; the attribute block shows 7 grey placeholder rows.", "Calling `F-M3-11`"),
  ("Error", "*Couldn't analyse right now.* + *Try again* + a *Search by filters* option. The typed description is kept.", "Model error / timeout"),
  ("Success / confirmation", "Attribute block filled, *Find matching locations* enabled. Clicking search → `SC-14`.", "Extraction succeeded"),
 ],
 ix=[
  ("Description box", "type", "Ticks ✓ the matching hint chips", "stays"),
  ("*Analyse description* button", "tap", "Calls `F-M3-11`, validates against the `F-M3-12` catalogue", "stays"),
  ("Attribute tag", "tap", "Opens the list of values in the same group to change it", "stays"),
  ("× on a tag", "tap", "Removes the attribute from the query", "stays"),
  ("*Change* in the mapping warning", "tap", "Pick another catalogue value", "stays"),
  ("*By filters* tab", "tap", "Opens results with the filter panel", "SC-14"),
  ("*Find matching locations* button", "tap", "Saves the query, runs `F-M3-08` scoring", "SC-14"),
 ],
 sr=[
  ("**Two separate steps:** the language model only *extracts attributes*; *ranking* is done by the deterministic scorer in the database. The model never proposes location names itself.", "TL4 — hybrid M3 design"),
  ("Users **can see and edit** every attribute before searching. The search only uses the attributes shown in the block.", "Anti-black-box principle"),
  ("Every attribute must come from the fixed catalogue; unknown terms are **mapped** to the nearest value and flagged clearly, never silently dropped.", "F-M3-12"),
  ("Guests can use it too; the *Link to project* field is shown to members only.", "TL4 §3"),
 ],
 fr=[("F-M3-10", "Scene description input"), ("F-M3-11", "Extract structured attributes"), ("F-M3-12", "Validate attributes against the catalogue")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the *What the system understood* block moves below the description box; the *Find* button sticks to the bottom of the screen.", "Attribute tags are `<button>` elements with full labels (*Remove attribute: river landing*).", "The mapping warning is announced via `aria-live`."],
 oq=[("[NEEDS CLARIFICATION: fixed attribute catalogue (scene type, terrain, period…) — who approves and maintains it]", True),
     ],
), html)

# =====================================================================  10 · SC-14
def res(k, name, prov, score, why, warn, cmp_on, first=False):
    n = (lambda x: f' data-n="{x}"') if first else (lambda x: "")
    return f"""<div class="card" style="display:flex;gap:12px"{n(5)}>
<div class="ph" style="width:118px;height:92px;flex:none">photo · {name.split(' —')[0]}</div>
<div style="flex:1;min-width:0"><div class="row" style="justify-content:space-between;align-items:center">
<b><span style="display:inline-block;width:20px;height:20px;border-radius:10px;background:#0d366b;color:#fff;font-size:11px;text-align:center;line-height:20px;margin-right:6px">{k}</span>{name}</b>
<span style="font-weight:800;font-size:18px;color:#0d366b"{n(6)}>{score}</span></div>
<div class="small muted" style="margin:0 0 4px 26px">{prov}</div>
<div class="small" style="margin-left:26px"{n(7)}><span class="ok">Matches:</span> {why}</div>
<div class="small" style="margin-left:26px;margin-top:2px"{n(8)}>{warn}</div>
<div class="small" style="margin:6px 0 0 26px"{n(9)}>{'☑' if cmp_on else '☐'} Compare</div></div></div>"""

html = page("SC-14", "Location suggestions (list + map)", "M3 · Guest / Member · Tier 1 · #10", "/locations?q=8f3a&m=2027-03", f"""
<div class="row" style="align-items:center;gap:10px;flex-wrap:wrap" data-n="2"><span class="small muted">For description:</span><span class="chip on">river landing</span><span class="chip on">waterside village</span><span class="chip on">1970s</span><span class="chip on">dawn</span><span class="chip on">night</span><span class="chip on">limestone karst</span><span class="chip on">15–50</span><span class="lnk">Edit description</span></div>
<div class="row" style="align-items:center;gap:10px;margin-top:10px" data-n="3"><span class="small muted">Refine:</span><span class="chip">Region: all ▾</span><span class="chip on">Shooting month: 03/2027 ▾</span><span class="chip">Only locations open to productions</span></div>
<div class="row" style="gap:18px;margin-top:14px;align-items:flex-start">
  <div style="flex:1.15" class="col">
    <div class="row" style="justify-content:space-between;align-items:center" data-n="4"><b>4 locations above threshold</b><span class="chip">Sort: match score ▾</span></div>
    {res(1, "Tràng An Landscape Complex", "Ninh Bình · North", 91, "riverside limestone karsts, boat landing, waterside village, room for a crew of 15–50", '<span class="warn">Note:</span> lunar months 1–3 are festival season, very crowded', True, True)}
    {res(2, "Lan Hạ Bay — Cát Bà", "Hải Phòng · North", 86, "limestone karsts over water, floating fishing village, dawn scenery", '<span class="warn">Not a match:</span> sea water, not a river', True)}
    {res(3, "Son River — Phong Nha", "Quảng Trị · Central", 74, "river ferry landing, limestone karsts", '<span class="warn">No data yet:</span> truck access', False)}
    {res(4, "Cái Răng Floating Market", "Cần Thơ · South", 63, "river life, activity at dawn", '<span class="warn">Not a match:</span> no limestone karsts', False)}
    <div class="small" data-n="13">Can't find the right location? <span class="lnk">Ask VFDA for more suggestions →</span></div>
  </div>
  <div style="flex:1" class="col">
    <div class="map" data-n="10" style="height:520px">
      <div class="small muted" style="position:absolute;left:12px;top:10px">OpenStreetMap</div>
      <div class="pin" data-n="11" style="left:170px;top:96px"><span>1</span></div>
      <div class="pin" style="left:236px;top:80px"><span>2</span></div>
      <div class="pin" style="left:238px;top:236px"><span>3</span></div>
      <div class="pin" style="left:150px;top:448px"><span>4</span></div>
    </div>
    <div class="card hl" data-n="12" style="display:flex;justify-content:space-between;align-items:center"><span><b>Comparing 2 / 4</b> · Tràng An, Lan Hạ Bay</span><span class="btn sm">View comparison →</span></div>
  </div>
</div>
""", active="Locations")

add(dict(
 seq=10, sid="SC-14", name="Location suggestions (list + map)", group="M3", tier="Tier 1 — Must",
 module="M3", actor="Guest / Member", prio="Must", route="/locations",
 design_note="Shows match score and why it matches.",
 rename_note="`SC-14` was previously called *Location search* (filters + grid + map). It is now the **shared results** screen for two entry points: from a description (`SC-15`) or from filters. The list + map structure is unchanged.",
 shown="The user clicks *Find matching locations* on `SC-15`, picks the *By filters* tab, or opens a shared results link.",
 leave="The user opens a location (`SC-16`) or opens the comparison (`SC-17`).",
 el=[
  (1, "Navigation bar", "Header", "static", "—", "—"),
  (2, "Query summary + *Edit description*", "List (chip) + Link", "`location_query.attributes`", "—", "—"),
  (3, "Additional filters", "Toggle", "region, shooting month, only locations open to productions", "No", "written to the URL (`nuqs`)"),
  (4, "Result count + sort", "Text + Toggle", "count of results above threshold; sort by score / name / distance", "—", "—"),
  (5, "Result card", "List", "`location.name_en`, `province.name`, `province.region`, `location_image.image_url (first approved)`", "—", "`published` locations only"),
  (6, "Match score", "Text", "`F-M3-08` — 0–100 score computed in the database", "—", "only cards scoring ≥ 40 are shown"),
  (7, "Why it matches", "Text", "generated from the matched criteria — not written by a language model", "**Yes**", "at least one reason; no reason, no card"),
  (8, "Not a match / notes", "Text", "unmatched criteria, missing data, seasonal warnings for the shooting month", "No", "*No data yet* is distinct from *Not a match*"),
  (9, "Compare checkbox", "Toggle (checkbox)", "session comparison basket", "—", "max 4"),
  (10, "Map", "Map", "Leaflet + OpenStreetMap; coordinates `location.lat, location.lng`", "—", "—"),
  (11, "Numbered pin", "Map marker", "one pin per card, **same number as the card**", "—", "pin number = card number"),
  (12, "Comparison tray", "Container", "comparison basket", "—", "hidden when the basket is empty"),
  (13, "*Ask VFDA for more suggestions* link", "Link", "static", "—", "—"),
 ],
 st=[
  ("Default", "Query summary, additional filters, numbered card list on the left, map with matching numbered pins on the right, comparison tray.", "Results ≥ 40 points"),
  ("Empty (no data)", "No card ≥ 40 points: show the 3 closest locations under the heading *No locations reach the threshold — here are the 3 closest*, each card stating the unmatched criteria; *Ask VFDA for suggestions* button. Never a blank page.", "0 results above threshold"),
  ("Loading", "Grey placeholders the size of the cards; the map keeps the old pins until new data arrives.", "Scoring"),
  ("Error", "*Couldn't load results. Your description and filters have been kept.* + *Try again*.", "Query error"),
  ("Success / confirmation", "Ticking *Compare* → tray updates to *Comparing n / 4*. Ticking a 5th: *Maximum 4 locations — remove one to add another*.", "Added to basket"),
 ],
 ix=[
  ("*Edit description*", "tap", "Carries the current query", "SC-15"),
  ("Additional filters", "tap", "Re-scores immediately, no Search button; written to the URL", "stays"),
  ("Result card", "tap", "—", "SC-16"),
  ("Map pin", "tap", "Scrolls to and highlights the card with the same number", "stays"),
  ("*Compare* checkbox", "tap", "Adds to / removes from the basket", "stays"),
  ("*View comparison*", "tap", "—", "SC-17"),
  ("*Ask VFDA for more suggestions*", "tap", "Books a session, attaching the query", "SC-33"),
 ],
 sr=[
  ("Every card **must** show a match score **and** why it matches; reasons are generated from criteria, not written by a language model.", "Screen list file — note #10; anti-black-box"),
  ("Three kinds of information are kept apart: *Matches* / *Not a match* / *No data yet*. Missing data is **never** counted as a match or a mismatch.", "No-guessing principle"),
  ("Map pins carry the **same number** as the cards — users can link a card to its location without hovering.", "Fixes old mockup: unnumbered pins"),
  ("Display threshold is 40 points; below it, switch to a guided empty state.", "TL5 §M3"),
  ("Seasonal warnings are computed from the **project's shooting month**, not shown generically.", "TL5 §M3"),
  ("Province names follow the list of **34 units after the 2025 reorganisation** (e.g. Phong Nha is in Quảng Trị, no longer Quảng Bình).", "2025 administrative reorganisation resolution"),
 ],
 fr=[("F-M3-07", "Multi-criteria filters"), ("F-M3-08", "Scoring and ranking"), ("F-M3-09", "Results grid with why it matches"), ("F-M3-14", "Map"), ("F-M3-16", "Select up to four locations")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the map becomes a *List | Map* toggle; the comparison tray sticks to the bottom of the screen.", "The match score is always a number, never colour alone.", "The card list is a full alternative to the map for non-mouse users."],
 oq=[("[NEEDS CLARIFICATION: criterion weights in the scoring formula — VFDA to approve before configuring `scoring_weights`]", True),
     ("[NEEDS CLARIFICATION: the 40-point threshold is a proposal and needs tuning once real data is available]", False)],
), html)

# =====================================================================  11 · SC-16
html = page("SC-16", "Location detail", "M3 · Member · Tier 1 · #11", "/locations/trang-an", f"""
<div class="small muted" data-n="2">Locations › Ninh Bình › Tràng An</div>
<div class="row" style="gap:20px;margin-top:10px;align-items:flex-start">
  <div style="flex:1.35" class="col">
    <div class="row" style="gap:8px" data-n="3"><div class="ph" style="flex:1;height:250px">main photo · Tràng An boat landing in early morning</div><div class="col" style="gap:8px;width:120px"><div class="ph" style="height:78px">photo 2</div><div class="ph" style="height:78px">photo 3</div><div class="ph" style="height:78px">+ 9 photos</div></div></div>
    <div class="row" style="justify-content:space-between;align-items:flex-start">
      <div data-n="5"><h1>Tràng An Landscape Complex</h1><div class="sub">Quần thể danh thắng Tràng An · Ninh Bình</div></div>
      <span class="pill p-ok" data-n="4" style="font-size:12.5px;padding:5px 10px">● Open to productions</span>
    </div>
    <div class="banner b-info small" data-n="6"><b>91 / 100 match</b> with the description for The Last Ferry — riverside limestone karsts, boat landing, waterside village, room for a crew of 15–50.</div>
    <div class="small" data-n="7" style="line-height:1.6">A network of rivers, through-caves and flooded valleys between limestone massifs, with boat landings and riverside villages. UNESCO World Heritage Site (mixed cultural and natural).</div>
    <div class="g2">
      <div class="card soft" data-n="8"><h3>Logistics</h3><div class="small col" style="gap:3px"><div>Crew capacity: <b>15–50 people</b></div><div>Nearest airport: Nội Bài, <b>~115 km</b></div><div>Lodging within 20 km: <b>yes</b></div><div>Trucks: <b>up to the boat landing</b>, not onto the river</div></div></div>
      <div class="card soft" data-n="9"><h3>Seasons and permits</h3><div class="small col" style="gap:3px"><div><span class="warn">Crowded:</span> lunar months 1–3 (festival season)</div><div>Heritage area: permit from the <b>Landscape Complex Management Board</b></div><div>Drones: separate permit required</div><div class="muted">Data verified by VFDA 06/2026</div></div></div>
    </div>
  </div>
  <div style="flex:1" class="col">
    <div class="card" data-n="10"><h3>Local authority contact <span class="pill p-ok">verified</span></h3><div class="small col" style="gap:3px"><div>Ninh Bình Department of Culture and Sports</div><div>Culture Management Division · Ms N. T. H.</div><div>Phone: 0229 3•• ••• · Email: •••@ninhbinh.gov.vn</div><div class="muted">Visible to logged-in members only</div></div></div>
    <div class="card" data-n="11"><div class="row" style="justify-content:space-between;align-items:center"><h3 style="margin:0">Ninh Bình province readiness</h3><span style="font-size:22px;font-weight:800;color:#0d366b">78</span></div>
      <div class="small col" style="gap:3px;margin-top:6px"><div>14 verified locations · 6 verified suppliers</div><div>Local response to notifications: avg <b>3.5 working days</b></div><div class="lnk">View province index →</div></div></div>
    <div class="card" data-n="12"><div class="map" style="height:120px;margin-bottom:8px"><div class="pin" style="left:48%;top:36%"><span>•</span></div></div>
      <div class="small"><b>Nearby within 30 km:</b> <span class="lnk">Hoa Lư Ancient Capital · 4 km</span> · <span class="lnk">Tam Cốc – Bích Động · 7 km</span> · <span class="lnk">Bái Đính Pagoda · 10 km</span></div></div>
    <div class="row" style="gap:10px"><span class="btn g" data-n="13">Add to comparison</span><span class="btn" data-n="14">I'm interested</span></div>
  </div>
</div>
""", active="Locations")

add(dict(
 seq=11, sid="SC-16", name="Location detail", group="M3", tier="Tier 1 — Must",
 module="M3", actor="Guest / Member", prio="Must", route="/locations/[slug]",
 design_note="Location information and the province's readiness.",
 shown="The user clicks a card on `SC-14`, a column on `SC-17`, a featured location on `SC-18`, or opens a shared link.",
 leave="The user adds it to the comparison, clicks *I'm interested*, opens the province index, or moves to a nearby location.",
 el=[
  (1, "Navigation bar", "Header", "static", "—", "—"),
  (2, "Breadcrumb", "Text", "Locations › `province.name` › `location.name_en`", "—", "—"),
  (3, "Photo gallery", "Image", "`location_image.image_url (first approved)` + `location_image` (approved)", "Yes", "`published` photos only"),
  (4, "Intake status badge", "Text", "`location.availability` — `open` / `survey_in_progress` / `paused`, shown as *Open* / *Scouting crew on site* / *Temporarily closed* (M3 BR-010)", "Yes", "updated by VFDA"),
  (5, "English + Vietnamese name + province", "Header", "`location.name_vi`, `name_en`, `province.name`", "Yes", "—"),
  (6, "Match score for the project", "Text", "`F-M3-08` for the query linked to the open project", "No", "shown only when arriving from search results"),
  (7, "Description", "Text", "`location.desc_en`", "Yes", "—"),
  (8, "*Logistics* block", "List", "`crew_capacity_band`, `nearest_airport_km`, `accommodation_within_20km`, `truck_access`", "Yes", "missing data → *no data yet*"),
  (9, "*Seasons and permits* block", "List", "`avoid_months`, `permit_notes`, `drone_note`, `verified_at`", "Yes", "same as above"),
  (10, "*Local authority contact* block", "Container", "`authority_contact`", "Yes (members)", "**Guests: RLS returns 0 rows, the table is not queried**"),
  (11, "*Province readiness* block", "Text", "`v_province_readiness.readiness_index` and its 3 main components", "Yes", "same source as `SC-18`"),
  (12, "Mini map + nearby within 30 km", "Map + List", "PostGIS `ST_DWithin` on `location.lat, location.lng`", "No", "max 5, sorted by distance"),
  (13, "*Add to comparison* button", "Button", "static", "—", "disabled when the basket holds 4"),
  (14, "*I'm interested* button", "Button", "static", "—", "requires login and a project"),
 ],
 st=[
  ("Default", "The mockup shows the **member view**: the contact is shown in full. For guests, block 10 is replaced by a dashed box *Local authority contacts are visible to members only* + *Sign up free* / *Log in* buttons.", "Open a published location"),
  ("Empty (no data)", "No published nearby locations: *No published locations within 30 km yet.* Province lacks index data: block 11 reads *Not enough data to calculate the province index*.", "Empty query"),
  ("Loading", "Grey placeholders for photos and blocks (page is pre-rendered; only appears on in-app navigation).", "Loading"),
  ("Error", "Location does not exist or is unpublished → dedicated 404 page with a button back to `SC-14`.", "`status != published`"),
  ("Success / confirmation", "*I'm interested* → green banner *Saved to The Last Ferry. VFDA will notify the Ninh Bình Provincial People's Committee* + a tracking link.", "Writes `F-M7-01`"),
 ],
 ix=[
  ("Thumbnail / *+ 9 photos*", "tap", "Swaps the main photo / opens the full-screen gallery", "stays"),
  ("Province name in breadcrumb / *View province index*", "tap", "—", "SC-18"),
  ("Nearby location", "tap", "—", "SC-16 (another location)"),
  ("*Add to comparison* button", "tap", "Adds to the basket", "stays"),
  ("*I'm interested* button", "tap", "Not logged in → `SC-04`; logged in → pick a project, record interest, create a local notification request", "SC-32"),
  ("*Sign up free* (guest)", "tap", "Remembers the page to return to", "SC-04"),
 ],
 sr=[
  ("**The contact block must not be hidden by the UI alone.** For guests, the app does not query `authority_contact`; RLS returns 0 rows. Verification: the page source in a private window shows no phone number.", "Database-layer security principle"),
  ("The province readiness block uses the **same view** `v_province_readiness` as `SC-18`.", "Screen list file — note #11"),
  ("Every logistics and seasonal fact shows *when VFDA verified it*; if missing, show *no data yet*.", "No-guessing principle"),
  ("The mockup uses sample organisation names; phone numbers / emails in the image are masked — not real data.", "Mockup note"),
 ],
 fr=[("F-M3-13", "Location profile display"), ("F-M3-14", "Map and nearby locations"), ("F-M3-15", "Local authority contact block"), ("F-M3-19", "Province index from platform data"), ("F-M7-01", "Express interest in a location")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: thumbnails become a horizontal scroll strip; the right column moves below; the two buttons stick to the bottom of the screen.", "Photos have `alt` text describing the location.", "The status badge has text, not just a coloured dot."],
 oq=[("[NEEDS CLARIFICATION: procedure for filming permits inside the Tràng An heritage area — VFDA to confirm the contact and displayed wording]", False),
     ("[NEEDS CLARIFICATION: re-verification cycle for local authority contacts — proposed 12 months]", False)],
), html)

# =====================================================================  12 · SC-19
GROUPS = [("Full production services", 18), ("Permits and paperwork", 9), ("Casting", 7), ("Crew", 22),
          ("Camera and lighting rental", 15), ("Studios and interiors", 5), ("Location scouting and management", 11), ("Transport and logistics", 13),
          ("Crew lodging and catering", 16), ("Interpreting and bilingual coordination", 10), ("Insurance and legal", 4), ("Post-production, sound, VFX", 8)]
glist = "".join(f'<div class="row" style="justify-content:space-between;padding:6px 10px;border-radius:6px;{"background:#e3eaf5;color:#0d366b;font-weight:700" if i==0 else ""}"><span>{g}</span><span class="muted">{c}</span></div>' for i, (g, c) in enumerate(GROUPS))

def org(name, prov, svc, ver, meta, first=False, unver=False):
    n = (lambda x: f' data-n="{x}"') if first else (lambda x: "")
    badge = '<span class="pill p-mute"' + (' data-n="12"' if unver else '') + '>Not verified</span>' if unver else f'<span class="ver"{n(8)}>✓ VFDA Verified · {ver}</span>'
    return f"""<div class="card" style="display:flex;gap:14px;align-items:center"{n(7)}><div class="ph" style="width:64px;height:64px;flex:none">logo</div>
<div style="flex:1"><div class="row" style="gap:10px;align-items:center"><b style="font-size:15px">{name}</b>{badge}</div>
<div class="small" style="margin-top:3px"{n(9)}>{prov} · {svc}</div><div class="small muted"{n(10)}>{meta}</div></div>
<span class="btn sm"{n(11)}>Send request</span></div>"""

html = page("SC-19", "Partner directory (12 service groups)", "M4 · Guest / Member · Tier 1 · #12", "/partners?g=production-service", f"""
<div class="row" style="justify-content:space-between;align-items:center" data-n="2"><div><h1>Vietnamese supplier directory</h1><div class="sub">Companies eligible to act as service partners for foreign productions</div></div><div class="field ph" style="width:300px">Search by name or service…</div></div>
<div class="row" style="gap:18px;margin-top:14px;align-items:flex-start">
  <div style="width:250px;flex:none" class="card" data-n="3"><div class="small muted" style="padding:0 10px 6px;letter-spacing:.05em;text-transform:uppercase">12 service groups</div><div class="small">{glist}</div></div>
  <div style="flex:1" class="col">
    <div class="row" style="gap:10px;align-items:center"><span class="chip" data-n="4">Province: Ninh Bình ▾</span><span class="chip" data-n="5">Language: Korean ▾</span><span class="chip on" data-n="6">☑ VFDA Verified only</span><span class="small muted" style="margin-left:auto">Full production services · 3 / 18</span></div>
    {org("Bến Xưa Production Services", "Hà Nội · Ninh Bình · Hải Phòng", "full production, permits", "06/2026", "12 international projects · works in EN, KO", True)}
    {org("Đò Ngang Film Services", "Huế · Đà Nẵng · Quảng Trị", "full production, location scouting", "03/2026", "7 international projects · works in EN, FR")}
    {org("Mekong Frame Co.", "Cần Thơ · Hồ Chí Minh City", "full production, logistics", "", "Awaiting VFDA verification", unver=True)}
    <div class="banner b-info small" data-n="13"><b>What does VFDA Verified mean?</b> VFDA has checked the business licence, the legal representative and at least 2 reference projects. The badge is valid for 12 months. It is not a guarantee of service quality.</div>
  </div>
</div>
""", active="Partners")

add(dict(
 seq=12, sid="SC-19", name="Partner directory (12 service groups)", group="M4", tier="Tier 1 — Must",
 module="M4", actor="Guest / Member", prio="Must", route="/partners",
 design_note="Filters, VFDA Verified badge.",
 shown="The user clicks *Partners* in the navigation bar, the *Who is the Vietnamese partner named on the contract?* item on `SC-01`, or the *Partners* gauge on `SC-12` when there are no requests yet.",
 leave="The user opens an organisation profile (`SC-20`) or clicks *Send request* (`SC-23`).",
 el=[
  (1, "Navigation bar", "Header", "static", "—", "—"),
  (2, "Title + search box", "Header + Input", "accent-insensitive search on `organisation.org_name`, `services`", "No", "max 80 characters"),
  (3, "12 service groups list", "List", "`organisation.service_groups` — fixed enum of 12 values, with organisation counts", "Yes", "groups cannot be added freely"),
  (4, "Province filter", "Toggle (dropdown)", "`organization_provinces` — 34 provinces", "No", "written to the URL"),
  (5, "Working language filter", "Toggle (dropdown)", "`organisation_member_layer.working_languages[]`", "No", "ISO 639-1 codes"),
  (6, "*VFDA Verified only* switch", "Toggle", "`organisation.verified_until >= today`", "No", "on by default"),
  (7, "Organisation card", "List", "`organisation.org_name`, `logo`", "—", "public layer"),
  (8, "VFDA Verified badge + verification month", "Text", "`organisation.verified_at`", "—", "shown only while within its 12-month validity"),
  (9, "Provinces and services", "Text", "`organization_provinces`, `organization_services`", "Yes", "public layer"),
  (10, "International project count and languages", "Text", "`organisation_member_layer.intl_project_count`, `working_languages`", "—", "**member layer** — guests do not see this line"),
  (11, "*Send request* button", "Button", "static", "—", "requires login and a project"),
  (12, "*Not verified* label", "Text", "organisation not yet verified by VFDA", "—", "shown only when switch 6 is off"),
  (13, "*What does VFDA Verified mean* explainer", "Text", "static; wording approved by VFDA", "Yes", "—"),
 ],
 st=[
  ("Default", "Left column with 12 groups, first group selected; filters on top; list of organisation cards; Verified explainer banner.", "Page opens"),
  ("Empty (no data)", "Group/filters return no organisations: *No matching organisations in Ninh Bình yet. Try removing some filters, or ask VFDA for an introduction.* + the two corresponding buttons.", "0 results"),
  ("Loading", "The 12 groups list shows immediately (static); grey placeholders for organisation cards.", "Loading"),
  ("Error", "*Couldn't load the organisation list.* + *Try again*; filters are kept.", "Query error"),
  ("Success / confirmation", "No write action on this screen; sending a request happens on `SC-23`.", "—"),
 ],
 ix=[
  ("A service group", "tap", "Re-filters, written to the URL", "stays"),
  ("Province / language filter", "tap", "Re-filters immediately", "stays"),
  ("*VFDA Verified only* switch", "tap", "Shows / hides unverified organisations", "stays"),
  ("Organisation card", "tap", "—", "SC-20"),
  ("*Send request* button", "tap", "Not logged in → `SC-04`; logged in → compose request", "SC-23"),
 ],
 sr=[
  ("**The 12 service groups are a fixed enum** so VFDA can aggregate figures by province. The list in the mockup is a **proposal** pending VFDA's official names.", "TL5 §M4"),
  ("Three information layers enforced by **RLS on three separate tables**: public (name, services, provinces, badge) / member (capabilities, project count, languages) / after acceptance (prices, past clients, contacts).", "Database-layer security principle"),
  ("The *VFDA Verified only* switch is **on by default**: foreign productions need an eligible entity to sign the agreement under Article 13.", "Cinema Law 2022, Article 13"),
  ("The Verified badge expires after 12 months (`F-M4-11`); the explainer states clearly that it is **not a quality guarantee**.", "TL5 §M4"),
  ("No open self-registration for suppliers in the early phase — VFDA invites them and enters their data.", "TL4 §8"),
 ],
 fr=[("F-M4-02", "Public-level profile"), ("F-M4-03", "Member-level profile"), ("F-M4-05", "Browse by the twelve service groups"), ("F-M4-06", "Filter by province and verification badge"), ("F-M4-07", "Search")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the 12 groups become a dropdown at the top of the page; filters collapse into a *Filters* button.", "The Verified badge is text, not just an icon.", "Logos have `alt` set to the organisation name."],
 oq=[("[NEEDS CLARIFICATION: VFDA to confirm the official names of the 12 service groups (mockup uses a proposed list)]", True),
     ("[NEEDS CLARIFICATION: written criteria for granting the VFDA Verified badge]", True)],
), html)

# =====================================================================  13 · SC-20
html = page("SC-20", "Partner profile", "M4 · Member · Tier 1 · #13", "/partners/ben-xua-production", f"""
<div class="small muted" data-n="2">Partners › Full production services › Bến Xưa Production Services</div>
<div class="row" style="gap:20px;margin-top:12px;align-items:flex-start">
  <div style="flex:1.4" class="col">
    <div class="row" style="gap:16px;align-items:center">
      <div class="ph" style="width:84px;height:84px;flex:none">logo</div>
      <div data-n="3"><h1>Bến Xưa Production Services</h1><div class="sub">Limited liability company · founded 2014 · Hà Nội</div></div>
    </div>
    <div class="row" style="gap:10px;flex-wrap:wrap"><span class="ver" data-n="4">✓ VFDA Verified 12/06/2026 · valid until 06/2027</span><span class="pill p-info" data-n="6">Eligible to sign service agreements (Article 13)</span></div>
    <div class="small" data-n="5"><b>Provinces:</b> Hà Nội · Ninh Bình · Hải Phòng · Quảng Ninh &nbsp;·&nbsp; <b>Services:</b> full production, permits and paperwork, location scouting &nbsp;·&nbsp; <b>Languages:</b> EN, KO</div>
    <div class="card" data-n="7"><h3>Capabilities</h3><div class="small" style="line-height:1.6">Production coordination for foreign feature films and commercials in northern Vietnam: filming permits in heritage areas, boat hire and local extras, and Korean–Vietnamese interpreters on set full-time.</div></div>
    <div data-n="8"><h3>Past projects <span class="muted" style="font-weight:400" data-n="9">· 12 international projects (titles kept confidential)</span></h3>
      <div class="g3"><div><div class="ph" style="height:96px">behind-the-scenes photo</div><div class="small" style="margin-top:4px">Feature film · South Korea · 2025 · 18 shooting days in Ninh Bình</div></div>
      <div><div class="ph" style="height:96px">behind-the-scenes photo</div><div class="small" style="margin-top:4px">Commercial · Japan · 2025 · 4 days in Hạ Long</div></div>
      <div><div class="ph" style="height:96px">behind-the-scenes photo</div><div class="small" style="margin-top:4px">Documentary · France · 2024 · 9 days in Hà Nội</div></div></div></div>
  </div>
  <div style="flex:1" class="col">
    <div class="card" data-n="12"><h3>What you can see</h3>
      <div class="col small" style="gap:6px">
        <div class="row" style="justify-content:space-between"><span>1 · Public</span><span class="ok">✓ visible</span></div>
        <div class="row" style="justify-content:space-between"><span>2 · Logged-in members</span><span class="ok">✓ visible</span></div>
        <div class="row" style="justify-content:space-between"><span>3 · After request is accepted</span><span class="bad">locked</span></div>
      </div></div>
    <div class="card soft" data-n="10"><h3>What VFDA checked</h3><div class="small col" style="gap:3px"><div><span class="ok">✓</span> Business registration certificate</div><div><span class="ok">✓</span> Legal representative</div><div><span class="ok">✓</span> 2 reference projects contacted and confirmed</div><div class="muted">Not covered: quality or pricing</div></div></div>
    <div class="card" data-n="11" style="border-style:dashed;background:#fafbfc"><h3>🔒 Rates · Past clients · Direct contacts</h3><div class="small muted">Unlocked once Bến Xưa accepts your collaboration request and you agree to the non-disclosure agreement (NDA).</div></div>
    <span class="btn" data-n="13" style="height:42px">Send collaboration request</span>
  </div>
</div>
""", active="Partners")

add(dict(
 seq=13, sid="SC-20", name="Partner profile", group="M4", tier="Tier 1 — Must",
 module="M4", actor="Guest / Member", prio="Must", route="/partners/[slug]",
 design_note="Organisation profile with three permission-based visibility layers.",
 fix_note="In the old mockup set, the organisation profile was drawn inside the `SC-19` image. `SC-20` now has its own mockup.",
 shown="The user clicks an organisation card on `SC-19`, or the partner name in a request on `SC-25`.",
 leave="The user clicks *Send collaboration request* (`SC-23`) or returns to the directory.",
 el=[
  (1, "Navigation bar", "Header", "static", "—", "—"),
  (2, "Breadcrumb", "Text", "Partners › service group › organisation name", "—", "—"),
  (3, "Logo + organisation name + legal entity", "Header", "`organisation.org_name`, `legal_form`, `founded_year`, `hq_province`", "Yes", "public layer"),
  (4, "VFDA Verified badge + validity", "Text", "`organisation.verified_at`, `verified_until`", "—", "hidden once expired"),
  (5, "Provinces, services, languages", "Text", "`organization_provinces`, `organization_services`, `working_languages`", "Yes", "public layer"),
  (6, "*Eligible to sign service agreements (Article 13)* badge", "Text", "`organisation.art13_eligible` — confirmed by VFDA", "—", "only VFDA can switch it on"),
  (7, "*Capabilities* block", "Text", "`organisation_member_layer.capability_desc_en`", "—", "**member layer**"),
  (8, "Past projects (portfolio)", "List + Image", "`organization_portfolio` — type, country, year, days, filming place", "—", "**member layer**; no project titles"),
  (9, "International project count", "Text", "`organisation_member_layer.intl_project_count`", "—", "member layer"),
  (10, "*What VFDA checked* block", "List", "`verification_checks` from the latest verification", "Yes", "also states what was **not** checked"),
  (11, "Locked layer 3 block", "Container", "`organization_profiles_accepted` — rates, past clients, contacts", "—", "RLS: only unlocked with an `accepted` request and an agreed NDA"),
  (12, "Three-layer indicator", "List", "computed from the viewer's permissions", "Yes", "reflects actual permissions"),
  (13, "*Send collaboration request* button", "Button", "static", "—", "hidden when a request is already open — replaced by *View request*"),
 ],
 st=[
  ("Default", "The mockup shows the **member view** (layers 1 and 2 open, layer 3 locked). For guests: blocks 7, 8, 9 are replaced by a box *Log in to see capabilities and past projects*.", "Open an organisation profile"),
  ("Empty (no data)", "Organisation has no portfolio: *This organisation hasn't added reference projects yet.* Empty capabilities block: hide the block, no empty box.", "Missing layer 2 data"),
  ("Loading", "Grey placeholders for the capabilities and portfolio blocks; the public layer is pre-rendered.", "Loading"),
  ("Error", "Organisation hidden or not found → dedicated 404 with a button back to `SC-19`.", "Not found"),
  ("Success / confirmation", "Once the request is accepted and the NDA agreed: block 11 reveals rates, past clients and contacts; the layer 3 indicator switches to *✓ visible*.", "Request `accepted` + NDA"),
 ],
 ix=[
  ("*Send collaboration request* button", "tap", "Not logged in → `SC-04`; logged in → compose request", "SC-23"),
  ("Portfolio photo", "tap", "Opens a large view", "stays"),
  ("Service group in breadcrumb", "tap", "—", "SC-19"),
  ("Locked layer 3 block", "tap", "Explains how to unlock it", "stays"),
 ],
 sr=[
  ("The three information layers are enforced by **RLS on three tables**, not by hiding columns in the UI.", "Database-layer security principle"),
  ("The portfolio **does not name projects** at the member layer — many production contracts contain confidentiality clauses.", "TL5 §M4"),
  ("The *Eligible to sign service agreements (Article 13)* badge can only be switched on by VFDA, and is decisive for segment A productions.", "Cinema Law 2022, Article 13 cl.3"),
  ("The *What VFDA checked* block also states what was **not** checked (quality, pricing) to avoid it being read as a guarantee.", "Accountability principle"),
  ("Two-way reviews belong to phase 2 (M8) — **not** on this screen in the MVP.", "MVP scope"),
 ],
 fr=[("F-M4-02", "Public-level profile"), ("F-M4-03", "Member-level profile"), ("F-M4-04", "Accepted-level profile"), ("F-M4-12", "Send request entry point")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the right column moves below the introduction; the *Send request* button sticks to the bottom of the screen.", "The lock icon is accompanied by explanatory text.", "The three-layer indicator is a list with text statuses, not colour alone."],
 oq=[("[NEEDS CLARIFICATION: criteria for VFDA to grant the *Eligible to sign service agreements* badge — which registered business lines qualify]", True),
     ("[NEEDS CLARIFICATION: can an organisation choose to hide its international project count]", False)],
), html)

# =====================================================================  14 · SC-25
html = page("SC-25", "Collaboration request + status tracking", "M4 · Member / Partner · Tier 1 · #14", "/requests/rq-0917", f"""
<div class="row" style="gap:18px;align-items:flex-start">
  <div style="width:250px;flex:none" class="col" data-n="3">
    <b>Project requests</b>
    <div class="card hl" style="padding:10px 12px"><b class="small">Bến Xưa Production Services</b><div class="row" style="justify-content:space-between;margin-top:4px"><span class="pill p-info" data-n="4">Partner responded</span><span class="small muted">2 hrs</span></div></div>
    <div class="card" style="padding:10px 12px"><b class="small">Đò Ngang Film Services</b><div class="row" style="justify-content:space-between;margin-top:4px"><span class="pill p-mute">Sent</span><span class="small muted">3 days</span></div></div>
    <div class="card" style="padding:10px 12px"><b class="small">Lam Hà Casting</b><div class="row" style="justify-content:space-between;margin-top:4px"><span class="pill p-bad">Declined</span><span class="small muted">08/09</span></div></div>
  </div>
  <div style="flex:1" class="col">
    <div class="row" style="justify-content:space-between;align-items:center"><h1 style="font-size:22px">Bến Xưa Production Services</h1><span class="lnk">View partner profile →</span></div>
    <div class="card" data-n="5">
      <div class="step">
        <div class="col" style="align-items:center;gap:4px;width:130px"><div class="dot done">✓</div><div class="small"><b>Sent</b></div><div class="small muted">20/09 · 14:10</div></div>
        <div class="line" style="margin-bottom:38px"></div>
        <div class="col" style="align-items:center;gap:4px;width:150px"><div class="dot done">✓</div><div class="small"><b>Partner responded</b></div><div class="small muted">22/09 · 08:35</div></div>
        <div class="line off" style="margin-bottom:38px"></div>
        <div class="col" style="align-items:center;gap:4px;width:130px"><div class="dot">3</div><div class="small"><b>Confirmed</b></div><div class="small muted">waiting for you</div></div>
      </div>
    </div>
    <div class="card soft small" data-n="6"><b>Request:</b> full production + permits · Project The Last Ferry (segment A) · 18 shooting days, planned 15/03–01/04/2027 · Tràng An, Lan Hạ Bay · crew 15–50</div>
    <div class="row" style="gap:16px;align-items:flex-start">
      <div class="col" style="flex:1;gap:10px" data-n="7">
        <div class="card small" style="background:#f3f5f7"><b>Lena Park · 20/09</b><div>We need a local production service partner for 18 shooting days in March 2027, including the permit application under Article 13.</div></div>
        <div class="card small" style="border-color:#0d366b"><b>Bến Xưa · 22/09</b><div>We can take on the project. We propose a 3-day location scout in November 2026. A quote will follow once both sides have signed a non-disclosure agreement.</div></div>
        <div class="field ph" data-n="12">Write a message…</div>
      </div>
      <div style="width:290px;flex:none" class="col">
        <div class="card" data-n="8"><div class="row" style="justify-content:space-between"><b>Partner's response</b><span class="pill p-ok">Accepted</span></div><div class="small" style="margin-top:4px">3-day scout · 11/2026<br>Quote: after NDA</div></div>
        <div class="card" data-n="9"><div class="row" style="gap:8px;align-items:flex-start"><span style="width:16px;height:16px;border:1.5px solid #8a9099;border-radius:3px;flex:none;margin-top:2px"></span><span class="small">I agree to the <span class="lnk">Non-disclosure agreement</span> with Bến Xưa (unlocks rates and direct contacts)</span></div></div>
        <span class="btn" data-n="10">Confirm partnership</span>
        <div class="row" style="gap:8px" data-n="11"><span class="btn q" style="flex:1">Decline</span><span class="btn q" style="flex:1">Propose changes</span></div>
        <div class="small muted" data-n="13">On confirmation: Bến Xưa becomes the project's Vietnamese entity; item <b>c</b> in <i>Dossier completeness check</i> switches to awaiting the signed agreement.</div>
      </div>
    </div>
  </div>
</div>
""", active="My projects", sidebar="Partners", side_n=2)

add(dict(
 seq=14, sid="SC-25", also="SC-24", name="Collaboration request + status tracking", group="M4", tier="Tier 1 — Must",
 module="M4", actor="Member / Partner", prio="Must", route="/requests/[id]",
 design_note="Statuses: Sent → Partner responded → Confirmed.",
 merge_note="This screen uses a list–detail layout: the left column is the project's request inbox (`SC-24`), the rest is the detail of one request (`SC-25`). The mockup is filed under `SC-25`; `SC-24` has no separate image.",
 shown="The member clicks the *Partners* gauge on `SC-12`, the *Partners* item in the sidebar, a *partner responded* notification, or has just sent a request on `SC-23`.",
 leave="The member confirms, declines, proposes changes, or switches to another request in the left column.",
 el=[
  (1, "Navigation bar", "Header", "static", "—", "—"),
  (2, "Project sidebar", "List", "static; *Partners* item selected", "—", "—"),
  (3, "Project request list", "List", "`collab_request` by `project_id`", "—", "sorted by most recently updated"),
  (4, "Status on each request", "Text", "`collab_request.status` — `pending` / `under_review` / `info_requested` / `accepted` / `declined` / `confirmed` / `withdrawn`, shown as *Sent*, *Partner responded* or *Confirmed* (M4 §5.1 FR-014)", "Yes", "always with text"),
  (5, "3-step bar", "Chart (stepper)", "timestamps `collab_request.sent_at`, `responded_at`, `confirmed_at`", "Yes", "exactly 3 steps: Sent → Partner responded → Confirmed"),
  (6, "Request summary", "Text", "`collab_request.services[]`, project, dates, locations, crew size", "Yes", "—"),
  (7, "Message thread", "List", "`collab_message`", "—", "shown in the author's original language"),
  (8, "Partner response card", "Container", "`collab_request.response_note` — accepted / counter-proposal / declined + message", "—", "shown from step 2 onwards"),
  (9, "NDA consent checkbox", "Toggle (checkbox)", "`nda_acceptance` — NDA version, timestamp", "Yes (to confirm)", "must be ticked to enable *Confirm partnership*"),
  (10, "*Confirm partnership* button", "Button", "static", "—", "enabled only when the partner has accepted and the NDA is ticked"),
  (11, "*Decline* / *Propose changes* buttons", "Button", "static", "—", "*Decline* asks for a reason (optional)"),
  (12, "Message composer", "Input", "`collab_message.body`", "No", "1–2000 characters"),
  (13, "Note on consequences of confirming", "Text", "static", "—", "always shown next to the confirm button"),
 ],
 st=[
  ("Default", "The mockup shows step 2 (*Partner responded*, accepted). At step 1: the response card is replaced by *Waiting for Bến Xưa to respond — usually within 72 hours*, confirm button hidden.", "Open a request"),
  ("Empty (no data)", "The project has sent no requests: left column shows *No requests yet*; the detail area is replaced by a *Find a partner in the directory* link (`SC-19`).", "0 requests"),
  ("Loading", "Grey placeholders for the message thread; the 3-step bar shows immediately.", "Loading"),
  ("Error", "Message failed to send: the message is greyed out with *Not sent — Try again*. Confirmation failed: *Couldn't confirm; the request keeps its previous status*.", "Write error"),
  ("Success / confirmation", "Clicking *Confirm partnership* → step 3 fills in, green banner *Confirmed with Bến Xưa. Upload the signed service agreement to the document kit to complete item c under Article 13.* The *Partners* gauge goes to 100%.", "Confirmed successfully"),
 ],
 ix=[
  ("A request in the left column", "tap", "Opens that request's details", "SC-25 (another request)"),
  ("*View partner profile*", "tap", "—", "SC-20"),
  ("Message composer", "type + Enter", "Sends the message, notifies the partner (`F-M4-15`)", "stays"),
  ("*Non-disclosure agreement* link", "tap", "Opens the full NDA text", "stays"),
  ("*Confirm partnership* button", "tap", "`collab_request.status = confirmed` and `confirmed_at` set (M4 BR-005); updates the Partners gauge; item c on `SC-27` becomes *pending* until the signed agreement is uploaded (M4 BR-006)", "stays"),
  ("*Decline* button", "tap", "Asks for a reason, `status = declined`", "stays"),
  ("*Propose changes* button", "tap", "Opens the form to change services / dates", "SC-23"),
 ],
 sr=[
  ("Exactly **3 steps** are shown: *Sent → Partner responded → Confirmed*. Declined / withdrawn are end states, not steps.", "Screen list file — note #14"),
  ("Only the **sender** (the production) can click *Confirm*; the partner only responds. Every status change notifies the other side.", "TL5 §M4"),
  ("Confirming **requires** NDA consent; only after the NDA is agreed is layer 3 of the partner profile unlocked (RLS).", "F-M4-17"),
  ("Confirming a partnership does **not** automatically mark Article 13 item c as *Present* — the signed agreement must still be uploaded.", "No-guessing principle"),
  ("Every view of an attached document is recorded in the access log (`F-M4-18`).", "TL5 §M4"),
 ],
 fr=[("F-M4-13", "Request inbox"), ("F-M4-14", "Respond to a request"), ("F-M4-15", "Notify both sides of the outcome"), ("F-M4-16", "Update the partner gauge"), ("F-M4-17", "Display and accept the agreement")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the list column becomes its own screen; the detail opens when a request is selected; the confirm button sticks to the bottom.", "The 3-step bar is an ordered list (`<ol>`) with `aria-current=\"step\"`.", "The NDA consent is a real `checkbox` with a clickable label."],
 oq=[("[NEEDS CLARIFICATION: will VFDA provide a standard NDA template, or does each partner use its own NDA]", True),
     ("[NEEDS CLARIFICATION: after how many days without a response does a request expire automatically]", False)],
), html)
