# -*- coding: utf-8 -*-
"""Screens 37–41: M10 VFDA back office (overview, moderation, demand index, quarterly report, audit log).
Added 30/09/2026. Admin layout: own top bar + left admin menu (no public navigation)."""
from base import page

SCREENS = []

META = "M10 · {} · Added 30/09/2026"
TIER = "Added 30/09/2026 — Should"

ADMIN_MENU = [("Overview", "SC-34", ""), ("Locations", "SC-35", "1"), ("Verification", "SC-36", "1"),
              ("Legal rules", "SC-37", "2"), ("Moderation", "SC-38", "5"), ("Demand index", "SC-39", ""),
              ("Reports", "SC-40", ""), ("Audit log", "SC-41", "")]

MENU_IX = [("Admin menu", "tap an item", "Opens that admin screen", "SC-34 / SC-35 / SC-36 / SC-37 / SC-38 / SC-39 / SC-40 / SC-41")]

STAFF = ("Nguyễn Thị Thu Hà", "VFDA staff", "TH")
ADMIN = ("Vũ Đức Anh", "Admin", "ĐA")


def add(spec, html):
    SCREENS.append((spec, html))


def admin_page(sid, title, who, route, content, active, user=STAFF):
    name, role, ini = user
    bar = (f'<div class="nav" data-n="1"><span class="logo">CINEMATCH</span>'
           f'<span class="pill p-info" style="font-size:12px">VFDA back office</span>'
           f'<span class="r"><span><b>EN</b> | VI</span><span class="row" style="gap:8px;align-items:center">'
           f'<span class="avatar">{ini}</span>{name}<span class="pill p-mute">{role}</span></span>'
           f'<span class="lnk">Log out</span></span></div>')
    def cnt(c):
        return f'<span class="pill p-warn">{c}</span>' if c else ""
    links = "".join(
        f'<a class="{"on" if t == active else ""}" style="display:flex;justify-content:space-between">'
        f'<span>{t}</span>{cnt(c)}</a>'
        for t, _, c in ADMIN_MENU)
    side = (f'<div class="side" data-n="2"><div class="pj">Admin area</div>'
            f'<div class="pn">VFDA back office</div>{links}'
            f'<div class="small muted" style="padding:18px 10px 0">Visible to roles <span class="kbd">vfda_staff</span>, '
            f'<span class="kbd">vfda_legal</span>, <span class="kbd">admin</span></div></div>')
    inner = (f'<div style="margin:-26px -34px -32px">{bar}<div class="body">{side}'
             f'<div class="main">{content}</div></div></div>')
    return page(sid, title, META.format(who), route, inner, active=None, nav_n=None)


BAR_ROW = ('<div style="display:grid;grid-template-columns:{lw}px 1fr 34px;gap:8px;align-items:center;font-size:12.5px;margin-top:5px">'
           '<span>{label}</span><div class="bar" style="height:10px"><i style="width:{pct}%;{col}"></i></div>'
           '<b style="text-align:right">{v}</b></div>')


def bars(rows, lw=112, mx=None, col=""):
    mx = mx or max(v for _, v in rows)
    return "".join(BAR_ROW.format(lw=lw, label=l, pct=round(v * 100 / mx), v=v, col=col) for l, v in rows)


# =====================================================================  37 · SC-34
def tile(n, title, count, unit, detail, link, tone="p-warn", owner=""):
    return f"""<div class="card" data-n="{n}">
  <div class="row" style="justify-content:space-between;align-items:center"><span class="small muted" style="text-transform:uppercase;letter-spacing:.05em">{title}</span><span class="pill {tone}">{owner}</span></div>
  <div class="row" style="align-items:baseline;gap:8px;margin-top:6px"><span style="font-size:30px;font-weight:800">{count}</span><span class="sub">{unit}</span></div>
  <div class="small" style="margin-top:4px;min-height:38px">{detail}</div>
  <div class="lnk small" style="margin-top:6px">{link} →</div></div>"""


html = admin_page("SC-34", "Admin — Overview", "VFDA Staff", "/admin", f"""
<div class="row" style="justify-content:space-between;align-items:flex-end" data-n="3">
  <div><h1>Good morning, Thu Hà</h1><div class="sub">Work waiting for VFDA teams · Wednesday 30/09/2026, 08:30</div></div>
  <span class="small muted">Counts refresh when the page opens</span>
</div>
<div class="g4" style="margin-top:18px">
  {tile(4, "Moderation queue", "5", "items pending", "Oldest: organisation profile of <b>Mekong Frame Co.</b>, waiting 4 days", "Review content", "p-info", "VFDA staff")}
  {tile(5, "Verification queue", "1", "request pending", "<b>Mekong Frame Co.</b> — business registration + 2 reference projects", "Open verification queue", "p-info", "VFDA staff")}
  {tile(6, "Locations awaiting contact", "1", "location", "<b>Mũi Né Sand Dunes</b>, Lâm Đồng — cannot be published until the authority contact is verified", "Open locations", "p-info", "VFDA staff")}
  {tile(7, "Draft legal rules", "2", "rules", "<span class='kbd'>A9-DRUG</span> <span class='kbd'>A9-HERIT</span> — no citation or approver yet", "Open legal rule base", "p-mute", "VFDA Legal Board")}
</div>
<div class="row" style="gap:16px;margin-top:16px;align-items:stretch">
  <div class="card" style="flex:1.35" data-n="8">
    <div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">Latest admin actions</h2><span class="lnk small" data-n="9">Open audit log →</span></div>
    <table class="t" style="margin-top:8px">
      <tr><th>Time</th><th>Person</th><th>Action</th><th>Target</th></tr>
      <tr><td style="white-space:nowrap">30/09 08:12</td><td>Nguyễn Thị Thu Hà</td><td><span class="kbd">content.approve</span></td><td>Location photo · Hạ Long Bay</td></tr>
      <tr><td style="white-space:nowrap">29/09 16:05</td><td>Nguyễn Thị Thu Hà</td><td><span class="kbd">content.hide</span></td><td>Location photo · Mũi Né Sand Dunes</td></tr>
      <tr><td style="white-space:nowrap">29/09 11:20</td><td>Lê Hoàng Phúc</td><td><span class="kbd">org.verify.approve</span></td><td>Hạ Long Marine Logistics</td></tr>
      <tr><td style="white-space:nowrap">28/09 15:42</td><td>Trần Minh Quân</td><td><span class="kbd">rule.sign</span></td><td>Legal rule A9-PERSON v2026.08</td></tr>
    </table>
    <div class="hint">Read-only. Records cannot be edited or deleted by any role.</div>
  </div>
  <div class="col" style="flex:1;gap:16px">
    <div class="card soft" data-n="10">
      <div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">Demand index · Q3 2026</h2><span class="lnk small">Open →</span></div>
      <div class="g3" style="margin-top:10px">
        <div><div style="font-size:22px;font-weight:800">31</div><div class="small muted">projects created</div></div>
        <div><div style="font-size:22px;font-weight:800">7</div><div class="small muted">origin countries</div></div>
        <div><div style="font-size:22px;font-weight:800">6</div><div class="small muted">confirmed partnerships</div></div>
      </div>
      <div class="hint">Platform data only · 01/07/2026–30/09/2026</div>
    </div>
    <div class="card" data-n="11">
      <div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">Quarterly report · Q3 2026</h2><span class="pill p-mute">Not drafted</span></div>
      <div class="small" style="margin-top:6px">The quarter ends today. Draft the commentary, have it reread, then export the PDF.</div>
      <span class="btn g sm" style="margin-top:10px">Prepare Q3 2026 report</span>
    </div>
  </div>
</div>
""", "Overview")

add(dict(
 seq=37, sid="SC-34", name="Admin — Overview", group="M10", tier=TIER,
 module="M10", actor="VFDA Staff", prio="Should", route="/admin",
 design_note="Admin home",
 new_note="**New Screen Spec (30/09/2026).** `SC-34` was in the Screen List without a mockup; written with the M10 Spec Document.",
 shown="A VFDA staff member, VFDA Legal Board member or admin signs in and opens the admin area, or clicks *Overview* in the admin menu of any admin screen (`SC-35` … `SC-41`).",
 leave="Each tile opens the queue it counts: `SC-38`, `SC-36`, `SC-35` or `SC-37`; the side panels open `SC-39`, `SC-40` and `SC-41`.",
 el=[
  (1, "Admin top bar", "Header", "static; signed-in user's `profiles.full_name` and role (`user_accounts.role`)", "—", "shown only to `vfda_staff`, `vfda_legal`, `admin`"),
  (2, "Admin menu", "List", "static: Overview · Locations · Verification · Legal rules · Moderation · Demand index · Reports · Audit log, with pending counts", "—", "items the role cannot open are hidden"),
  (3, "Greeting and date", "Header", "signed-in user's first name; server date", "—", "—"),
  (4, "*Moderation queue* tile", "Text + Link", "count of `moderation_queue` items with `content_status = pending`; oldest `submitted_at`", "Yes", "integer ≥ 0"),
  (5, "*Verification queue* tile", "Text + Link", "count of `verification_request` with `status_filter = pending` (M4 FR-009)", "Yes", "integer ≥ 0"),
  (6, "*Locations awaiting contact* tile", "Text + Link", "count of locations with `intake_status = awaiting_contact` (M3 FR-002)", "Yes", "integer ≥ 0"),
  (7, "*Draft legal rules* tile", "Text + Link", "count of `legal_rule` with `filter_status = draft` (M2 FR-001)", "Yes", "integer ≥ 0; link opens `SC-37` only for `vfda_legal`"),
  (8, "*Latest admin actions* panel", "List", "last 4 `audit_entries`: `logged_at`, `admin_id` → name, `action`, `target_id` → readable label", "—", "newest first; read-only"),
  (9, "*Open audit log* link", "Link", "static", "—", "shown to `admin` only (F-M10-09)"),
  (10, "*Demand index* summary", "Text + Link", "`demand_index` for the current quarter: indicator 1 total, indicator 2 country count, indicator 5 confirmed count", "—", "values below 5 records read *Not enough data* (M10 BR-003)"),
  (11, "*Quarterly report* status", "Text + Button", "current quarter's report: none / drafted / reread (`reread_by`) / exported (`report_pdf_url`)", "—", "—"),
 ],
 st=[
  ("Default", "Four work tiles with counts and the oldest item, latest admin actions on the left, demand summary and quarterly report status on the right — as in the mockup.", "Admin area opens"),
  ("Empty (no data)", "Every queue empty: tiles show **0** and *Nothing waiting*; the audit panel reads *No admin actions yet*; the demand summary reads *Not enough data* for the quarter.", "Fresh environment / all queues cleared"),
  ("Loading", "Grey skeleton in each tile and panel; each tile loads on its own, so a slow count never blocks the others.", "Page opens"),
  ("Error", "A count that fails shows *Count unavailable — retry* in that tile only; the other tiles and panels stay usable.", "One query fails"),
  ("Success / confirmation", "**Not applicable** — the overview only reads; decisions are taken on the screens it links to.", "—"),
 ],
 ix=[
  ("*Moderation queue* tile", "tap", "Opens the queue filtered to pending items, oldest first", "SC-38"),
  ("*Verification queue* tile", "tap", "Opens pending verification requests", "SC-36"),
  ("*Locations awaiting contact* tile", "tap", "Opens locations filtered to `awaiting_contact`", "SC-35"),
  ("*Draft legal rules* tile", "tap", "Opens draft rules (VFDA Legal Board only)", "SC-37"),
  ("*Open audit log*", "tap", "—", "SC-41"),
  ("*Demand index* summary", "tap", "Opens the index for the current quarter", "SC-39"),
  ("*Prepare Q3 2026 report*", "tap", "Opens the report for the current quarter", "SC-40"),
 ] + MENU_IX,
 sr=[
  ("The admin area is reachable only by the roles `vfda_staff`, `vfda_legal` and `admin`; other roles get the not-authorised page.", "M10 FR-004; SYS BR-002"),
  ("Each tile counts from the owning module's own status field — M10 moderation, M4 verification, M3 `intake_status`, M2 rule status — never from a copy.", "Spec M10 §1 (Out of scope: those screens belong to M2, M3, M4)"),
  ("A location counted as *awaiting contact* cannot be published until its authority contact is verified; the tile says so.", "M3 BR-004"),
  ("The latest-actions panel is read-only and shows no edit or delete control; the full search is on `SC-41`.", "M10 BR-005"),
  ("Demand figures on this screen follow the same sample-size rule as `SC-39`.", "M10 BR-003"),
 ],
 fr=[("F-M10-01", "Count of content awaiting review"), ("F-M10-04", "Current-quarter demand summary"), ("F-M10-09", "Latest audit entries and link to the search"),
     ("F-M4-09", "Count of pending verification requests"), ("F-M3-01", "Count of locations not yet published"), ("F-M2-01", "Count of draft legal rules")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the admin menu collapses behind a *Menu* button; the four tiles stack two by two, then one per row; side panels move below the audit panel.",
       "Every count is text, not colour alone; tiles are links reachable with Tab in reading order.", "The audit table becomes a list of cards (time, person, action, target) below 600px."],
 oq=[("[NEEDS CLARIFICATION: May VFDA staff (not only admins) read the latest audit entries on the overview, given that the audit log search F-M10-09 is for admins?]", False, "Client (VFDA)")],
), html)


# =====================================================================  38 · SC-38
def qrow(k, typ, target, who, when, sel=False, tag="", first=False):
    n = (lambda x: f' data-n="{x}"') if first else (lambda x: "")
    bg = "background:#e3eaf5;border-left:3px solid #0d366b;" if sel else "border-left:3px solid transparent;"
    return f"""<div style="{bg}padding:9px 10px;border-bottom:1px solid #e8ebee">
  <div class="row" style="justify-content:space-between;gap:6px"><span class="pill {'p-info' if typ == 'Organisation profile' else 'p-mute'}">{typ}</span><span class="small muted">{when}</span></div>
  <div style="font-weight:700;margin-top:4px">{target}</div>
  <div class="small muted">by {who}</div>{tag}</div>"""


html = admin_page("SC-38", "Admin — Content moderation", "VFDA Staff", "/admin/moderation", f"""
<div class="row" style="justify-content:space-between;align-items:flex-end" data-n="3">
  <div><h1>Content moderation</h1><div class="sub">Partner-published content waits here until it is approved. Until then the last approved version stays public.</div></div>
  <span class="pill p-warn">5 pending · oldest first</span>
</div>
<div class="row" style="gap:8px;margin-top:14px;align-items:center" data-n="4"><span class="small muted">Content type:</span><span class="chip on">All · 5</span><span class="chip">Organisation profile · 3</span><span class="chip">Location photo · 2</span></div>
<div class="row" style="gap:16px;margin-top:12px;align-items:flex-start">
  <div class="card" style="width:300px;flex:none;padding:0" data-n="5">
    {qrow(1, "Organisation profile", "Mekong Frame Co.", "Huỳnh Minh Tuấn", "26/09 10:05", tag='<div style="margin-top:5px"><span class="pill p-warn" data-n="6">Updated after submission</span></div>')}
    {qrow(2, "Location photo", "Tràng An Landscape Complex", "Đỗ Văn Khải · Đò Ngang Film Services", "27/09 15:40")}
    {qrow(3, "Organisation profile", "Bến Xưa Production Services", "Phạm Ngọc Lan", "28/09 09:12", sel=True)}
    {qrow(4, "Location photo", "Hội An Ancient Town", "Huỳnh Minh Tuấn · Mekong Frame Co.", "29/09 11:30")}
    {qrow(5, "Organisation profile", "Đò Ngang Film Services", "Đỗ Văn Khải", "29/09 17:02")}
  </div>
  <div style="flex:1;min-width:0" class="col">
    <div class="card">
      <div class="row" style="justify-content:space-between;align-items:flex-start" data-n="7">
        <div><div class="small muted">Organisation profile · <span class="kbd">org_profile</span></div><h2 style="margin:2px 0 0">Bến Xưa Production Services <span class="ver">✓ VFDA Verified</span></h2>
        <div class="small muted">Submitted 28/09/2026 09:12 by Phạm Ngọc Lan · changed fields: capability description (EN), provinces</div></div>
        <span class="lnk small" style="white-space:nowrap">View public profile ↗</span>
      </div>
      <div class="g2" style="margin-top:12px" data-n="8">
        <div><div class="lab">Public now — approved 12/08/2026</div>
          <div class="field" style="min-height:108px;background:#f6f8fa">Line production and permits for foreign crews in Ninh Bình and Hà Nội. Local fixers, a crew of 40 and our own grip truck.<div class="hint" style="margin-top:8px">Provinces: Ninh Bình, Hà Nội</div></div></div>
        <div><div class="lab">Submitted version</div>
          <div class="field" style="min-height:108px">Line production and permits for foreign crews in Ninh Bình, Hà Nội <mark>and Quảng Ninh</mark>. Local fixers, a crew of <mark>60</mark> and our own grip truck<mark>, plus a drone team with licensed pilots</mark>.<div class="hint" style="margin-top:8px">Provinces: Ninh Bình, Hà Nội, <mark>Quảng Ninh</mark></div></div></div>
      </div>
      <div class="banner b-info small" style="margin-top:12px" data-n="9">Visitors keep seeing the version approved on 12/08/2026 until you decide. Approved changes are public within one minute.</div>
    </div>
    <div class="card">
      <h3>Decision</h3>
      <div data-n="10"><div class="lab">Reason <span class="opt">(required to hide — sent to the author)</span></div>
        <div class="field" style="color:#8a9099;min-height:58px">e.g. The drone team needs the licence numbers before it can be listed.</div></div>
      <div class="row" style="justify-content:space-between;align-items:center;margin-top:12px">
        <span class="small muted" data-n="13">Your decision and an audit record are saved together.</span>
        <div class="row" style="gap:10px"><span class="btn q" data-n="12" style="color:#a52a1f;border-color:#eab9b3">Hide with reason</span><span class="btn" data-n="11">Approve</span></div>
      </div>
    </div>
  </div>
</div>
""", "Moderation")

add(dict(
 seq=38, sid="SC-38", name="Admin — Content moderation", group="M10", tier=TIER,
 module="M10", actor="VFDA Staff", prio="Should", route="/admin/moderation",
 design_note="Queue of content awaiting review",
 new_note="**New Screen Spec (30/09/2026).** Written with the M10 Spec Document. Content types limited to `org_profile` and `location_image`; `showcase` waits for phase 2.",
 shown="Staff click the *Moderation queue* tile or the menu item on `SC-34`, or open the admin menu from any admin screen.",
 leave="Staff decide item after item and stay; *View public profile* opens `SC-20` (or `SC-16` for a location photo); the menu leads back to `SC-34`.",
 el=[
  (1, "Admin top bar", "Header", "static; signed-in user and role", "—", "—"),
  (2, "Admin menu", "List", "static; *Moderation* selected, pending count", "—", "—"),
  (3, "Title and pending count", "Header", "count of `moderation_queue` items with `content_status = pending`", "Yes", "—"),
  (4, "Content type filter", "Toggle", "`content_type` — All / Organisation profile (`org_profile`) / Location photo (`location_image`), with counts", "No", "enum; `showcase` not offered in this release"),
  (5, "Queue list", "List", "`moderation_queue`: `content_type`, target name, `submitted_by` → name, `submitted_at`", "Yes", "oldest `submitted_at` first"),
  (6, "*Updated after submission* label", "Text", "item edited again before review; queue keeps only the latest version", "—", "—"),
  (7, "Item header", "Header + Link", "`content_id` → organisation name or location name; `submitted_by`, `submitted_at`; changed fields", "Yes", "—"),
  (8, "Public now / submitted comparison", "Text", "last approved version vs submitted version (e.g. `capability_desc_en`, `provinces`); changes highlighted", "Yes", "for `location_image`: the photo with `image_source` and `usage_right`"),
  (9, "Public-version note", "Text", "date of the last approval of this content", "Yes", "—"),
  (10, "Reason", "Input (multi-line)", "`reason`", "Required when hiding", "required when `decision = hidden`; 10–1000 characters"),
  (11, "*Approve* button", "Button", "`decision = approved` → `content_status = approved`, `audit_log_id`", "—", "—"),
  (12, "*Hide with reason* button", "Button", "`decision = hidden` → `content_status = hidden`, reason sent to the author, `audit_log_id`", "—", "refused without a reason: *A reason is required to hide content*"),
  (13, "Audit note", "Text", "static", "—", "—"),
 ],
 st=[
  ("Default", "Queue on the left (oldest first), selected item on the right with the public and submitted versions side by side, reason box and the two decision buttons.", "Screen opens; first item selected"),
  ("Empty (no data)", "*Nothing waiting for review* with the date of the last decision; the detail area is hidden.", "No item with `content_status = pending` (or none of the filtered type)"),
  ("Loading", "Skeleton rows in the queue; the detail shows a skeleton while the item and its approved version load. Buttons are disabled while a decision is saving.", "Queue loads / decision saving"),
  ("Error", "*Hide* without a reason: *A reason is required to hide content* under the reason box, nothing saved. Save failure: *Decision not saved — nothing changed* (decision and audit record are committed together or not at all).", "Validation / write failure"),
  ("Success / confirmation", "Green strip *Approved — public within one minute* or *Hidden — the reason was sent to Phạm Ngọc Lan*; the item leaves the queue and the next one opens.", "Decision saved"),
 ],
 ix=[
  ("Content type chip", "tap", "Filters the queue", "stays"),
  ("Queue item", "tap", "Opens the item in the detail area", "stays"),
  ("*View public profile*", "tap", "Opens the public page (new tab) for an organisation profile", "SC-20"),
  ("*View public profile* (location photo)", "tap", "Opens the location page (new tab)", "SC-16"),
  ("*Approve*", "tap", "Saves `approved`, writes `content.approve` to the audit log, opens the next item", "stays"),
  ("*Hide with reason*", "tap", "Checks the reason, saves `hidden`, notifies the author, writes the audit record, opens the next item", "stays"),
 ] + MENU_IX,
 sr=[
  ("Partner-published profile text and photos are public only after approval; until then the last approved version stays public.", "M10 BR-001"),
  ("Hiding requires a written reason, which is sent to the author.", "M10 BR-002"),
  ("Every decision writes one audit record naming the staff member, the item and the time, in the same transaction as the decision.", "M10 BR-005; F-M10-08"),
  ("Only `org_profile` and `location_image` are moderated; locations themselves are published on `SC-35`.", "Spec M10 §5.1 FR-001 note; §9"),
  ("The queue is oldest first and keeps only the latest version of an item edited again before review, labelled *Updated after submission*.", "Spec M10 §9 (test value); §3 edge cases"),
 ],
 fr=[("F-M10-01", "Queue of content awaiting review, filter by type"), ("F-M10-02", "Approve or hide with a reason"), ("F-M10-08", "Audit record for each decision")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the queue and the detail become two steps (list → item, with *Back to queue*); the two versions stack, *Public now* first.",
       "Highlighted changes are also marked for screen readers (*inserted*); colour is never the only signal.", "The reason box has a visible label and its error is announced (`aria-live`)."],
 oq=[("[NEEDS CLARIFICATION: Must profile edits by an already verified partner also go through moderation, or only the first publication?]", False, "Client (VFDA)", 4),
     ],
), html)


# =====================================================================  39 · SC-39
def ind(n, num, title, source, body, sample, extra=""):
    return f"""<div class="card" data-n="{n}" style="padding:12px 14px">
  <h3 style="margin:0"><span class="muted">{num}</span> {title}</h3>
  <div class="row" style="gap:8px;align-items:center;margin:4px 0 6px">{sample}<span class="small muted">{source}</span></div>{body}{extra}</div>"""


def smp(txt, n=None):
    dn = f' data-n="{n}"' if n else ""
    return f'<span class="pill p-mute"{dn}>{txt}</span>'


NODATA = ('<div class="ph" style="height:128px;margin-top:6px;flex-direction:column;gap:4px">'
          '<b style="color:#5b626c;font-size:13px">Not enough data — no data source yet</b>'
          '<span>{}</span></div>')

funnel = "".join(
    f'<div style="margin-top:7px"><div class="row small" style="justify-content:space-between"><span>{l}</span><b>{v} <span class="muted" style="font-weight:400">{p}</span></b></div>'
    f'<div class="bar" style="height:12px;margin-top:3px"><i style="width:{w}%"></i></div></div>'
    for l, v, p, w in [("Projects created", 31, "", 100), ("→ sent ≥ 1 collaboration request", 17, "55 %", 55), ("→ confirmed partnership", 6, "19 %", 19)])

html = admin_page("SC-39", "Admin — Demand index", "VFDA Staff", "/admin/demand?period=quarter&q=2026-Q3", f"""
<div class="row" style="justify-content:space-between;align-items:flex-end">
  <div data-n="3"><h1>Vietnam Film Demand Index</h1><div class="sub">Six indicators from the platform's own data · Q3 2026 (01/07/2026–30/09/2026)</div></div>
  <span class="btn" data-n="14">Prepare quarterly report →</span>
</div>
<div class="row" style="gap:14px;margin-top:14px;align-items:center">
  <div class="tabs" data-n="4" style="border:1px solid #dce0e5;border-radius:6px"><span>Month</span><span class="on">Quarter</span><span>Year</span></div>
  <div data-n="5"><div class="field" style="width:230px">Q3 2026 ▾</div></div>
  <div class="tabs" data-n="6" style="margin-left:auto;border:0"><span class="on">Charts</span><span>Data table</span></div>
</div>
<div class="g3" style="margin-top:14px">
  {ind(7, "1", "Projects by segment and format", "segment and format of projects created",
       bars([("Segment A", 19), ("Segment B", 8), ("Segment C", 4)], 100) + '<div class="hr" style="margin:8px 0"></div>' + bars([("Feature film", 12), ("Documentary", 9), ("Commercial", 5), ("TV programme", 3), ("Music video", 2)], 100, 19, "background:#6d8fbf"),
       smp("n = 31 projects", 13))}
  {ind(8, "2", "Origin market of producers", "producer country",
       bars([("South Korea", 8), ("Japan", 6), ("France", 5), ("Australia", 4), ("United Kingdom", 3), ("United States", 3), ("Other (1 country)", 2)], 108),
       smp("n = 31 projects"))}
  {ind(9, "3", "Top provinces and scene types", "project provinces · location queries",
       bars([("Ninh Bình", 11), ("Quảng Ninh", 9), ("Lào Cai", 7), ("Đà Nẵng", 6), ("TP. Hồ Chí Minh", 5)], 116) +
       '<div class="small muted" style="margin-top:3px">+ 5 more provinces · <span class="lnk">show top 10</span></div><div class="hr" style="margin:8px 0"></div>' +
       bars([("Karst", 41), ("River", 33), ("Old town", 22), ("Rice terrace", 18), ("Sea", 14)], 116, None, "background:#6d8fbf"),
       smp("n = 54 links · 142 queries"))}
  {ind(10, "4", "Budget scale of location needs", "no source field", NODATA.format("Open question 1 in the M10 Spec Document"), smp("n = 0"))}
  {ind(11, "5", "Conversion: project → request → partnership", "collaboration request status", funnel + '<div class="hint">26 collaboration requests sent in the period</div>', smp("n = 31 projects"))}
  {ind(12, "6", "Most reported bottleneck", "no source field", NODATA.format("Open question 1 in the M10 Spec Document"), smp("n = 0"))}
</div>
<div class="small muted" style="margin-top:12px" data-n="15">Computed from CINEMATCH records only — no box office or tourism data. Indicators built from fewer than 5 records read <i>Not enough data</i>. Location queries carry no personal data. Updated 30/09/2026 08:00.</div>
""", "Demand index")

add(dict(
 seq=39, sid="SC-39", name="Admin — Demand index", group="M10", tier=TIER,
 module="M10", actor="VFDA Staff", prio="Should", route="/admin/demand",
 design_note="Six indicators and charts",
 new_note="**New Screen Spec (30/09/2026).** Written with the M10 Spec Document. Indicators 4 and 6 are shown as *no data source yet* until open question 1 of the M10 Spec Document is decided.",
 shown="Staff click the *Demand index* summary on `SC-34`, the menu item, or *Open in demand index* on `SC-40`.",
 leave="Staff click *Prepare quarterly report* (to `SC-40`) or leave through the admin menu.",
 el=[
  (1, "Admin top bar", "Header", "static; signed-in user and role", "—", "—"),
  (2, "Admin menu", "List", "static; *Demand index* selected", "—", "—"),
  (3, "Title and period", "Header", "`period_start`, `period_end` of the selected period", "Yes", "—"),
  (4, "Period granularity", "Toggle", "`period` — Month / Quarter / Year", "Yes", "enum `month`, `quarter`, `year`"),
  (5, "Period picker", "Toggle (dropdown)", "`period_start`, `period_end` derived from the choice (e.g. Q3 2026 = 01/07/2026–30/09/2026)", "Yes", "`period_start` ≤ `period_end`; not after the current period"),
  (6, "Charts / Data table switch", "Toggle", "`dashboard_view` — same figures as charts or as a table (indicator, value, sample size, source)", "—", "—"),
  (7, "Indicator 1 — projects by segment and format", "Chart", "`demand_index` from `projects.segment`, `projects.format` created in the period", "Yes", "counts; *Not enough data* below 5 records"),
  (8, "Indicator 2 — origin market", "Chart", "`demand_index` from `producer_organisation.country` (ISO code shown as country name)", "Yes", "same rule"),
  (9, "Indicator 3 — top 10 provinces and scene types", "Chart", "`demand_index` from `project_province.province_id` (34-province list) and `location_query.attributes.scene_types` (readable labels)", "Yes", "same rule"),
  (10, "Indicator 4 — budget scale", "Text", "no source field yet", "Yes", "always *Not enough data — no data source yet* until a field exists"),
  (11, "Indicator 5 — conversion", "Chart", "`demand_index` from projects → `collab_request` sent → `collab_request.status = confirmed`", "Yes", "percentages only when the base has ≥ 5 records"),
  (12, "Indicator 6 — most reported bottleneck", "Text", "no source field yet", "Yes", "same as row 10"),
  (13, "Sample size label", "Text", "number of records each indicator was computed from", "Yes", "shown on every indicator (M10 BR-003)"),
  (14, "*Prepare quarterly report* button", "Button", "static", "—", "shown when the Quarter view is selected; disabled when the period has no data"),
  (15, "Data-source note", "Text", "static; time of the last aggregation", "—", "—"),
 ],
 st=[
  ("Default", "Q3 2026 selected, six indicator cards in charts view, each with its sample size; indicators 4 and 6 read *Not enough data — no data source yet*.", "Screen opens (current quarter)"),
  ("Empty (no data)", "A period with no records: every indicator reads *Not enough data*, sample sizes read *n = 0*, and *Prepare quarterly report* is disabled with *No figures for this period*.", "Period without data"),
  ("Loading", "Skeleton cards with the text *Computing indicators for September 2026…*; the period controls stay usable.", "Period changed / screen opens"),
  ("Error", "*The indicators could not be computed — try again.* No partial figures are shown.", "Aggregation query fails"),
  ("Success / confirmation", "**Not applicable** — the screen only reads; changing the period recomputes every indicator for that period (e.g. September 2026: indicators with fewer than 5 records switch to *Not enough data*).", "—"),
 ],
 ix=[
  ("Month / Quarter / Year", "tap", "Changes the granularity; the picker offers matching periods", "stays"),
  ("Period picker", "choose", "Recomputes all six indicators for the chosen period", "stays"),
  ("Charts / Data table", "tap", "Switches the view; figures stay the same", "stays"),
  ("*show top 10* link in indicator 3", "tap", "Expands the list to ten provinces", "stays"),
  ("*Prepare quarterly report*", "tap", "Opens the report for the selected quarter", "SC-40"),
 ] + MENU_IX,
 sr=[
  ("Every indicator shows the number of records it was computed from; below 5 records it shows *Not enough data* instead of a value.", "M10 BR-003"),
  ("Indicators are built from the platform's own data only; no external source.", "F-M10-03; Spec M10 §1 Out of scope"),
  ("The screen is visible to the roles `vfda_staff` and `admin` only.", "M10 FR-004"),
  ("Indicators 4 and 6 are never estimated: until a source field exists they read *Not enough data — no data source yet*.", "Spec M10 §10 question 1"),
  ("A *brief* counts as a project with its location queries; location queries carry no personal data.", "Spec M10 §9; M3 BR-009"),
 ],
 fr=[("F-M10-03", "Six indicators aggregated for the period"), ("F-M10-04", "Charts and data table"), ("F-M10-05", "Month / quarter / year filter")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: indicator cards stack one per row; indicator 3 shows provinces and scene types one under the other.",
       "Every chart has the *Data table* view as its text alternative; bar values are printed as numbers.", "Sample-size labels are read out with each indicator title."],
 oq=[("[NEEDS CLARIFICATION: Indicator 4 (budget scale of location needs) and indicator 6 (bottleneck most reported) need fields that no function collects today. Add a budget band and a *main obstacle* question to project creation, or drop the two indicators?]", True, "Group C", 1),
     ("[NEEDS CLARIFICATION: Is indicator 2 (origin market) counted per project or per producer organisation — a company with three projects in the quarter counts once or three times?]", False, "Client (VFDA)")],
), html)


# =====================================================================  40 · SC-40
def ref(t, n=None):
    dn = f' data-n="{n}"' if n else ""
    return f'<span class="pill p-info" style="font-size:10.5px;padding:1px 5px"{dn}>{t}</span>'


html = admin_page("SC-40", "Admin — Quarterly report", "VFDA Staff", "/admin/reports/2026-q3", f"""
<div class="row" style="justify-content:space-between;align-items:flex-end">
  <div data-n="3"><h1>Quarterly report — Q3 2026</h1><div class="sub">Vietnam Film Demand Index · 01/07/2026–30/09/2026 · for the Cinema Department and the Provincial People's Committees</div></div>
  <span class="btn g" data-n="5">↻ Draft commentary again</span>
</div>
<div class="step" style="margin-top:14px;max-width:760px" data-n="4">
  <span class="dot done">✓</span><span class="small" style="margin:0 8px">Figures</span><span class="line"></span>
  <span class="dot done">✓</span><span class="small" style="margin:0 8px">Commentary drafted</span><span class="line off"></span>
  <span class="dot">3</span><span class="small" style="margin:0 8px"><b>Reread</b></span><span class="line off"></span>
  <span class="dot off">4</span><span class="small muted" style="margin:0 8px">Export PDF</span>
</div>
<div class="row" style="gap:16px;margin-top:14px;align-items:flex-start">
  <div style="flex:1;min-width:0" class="col">
    <div class="banner b-warn small" data-n="9">Drafted by the language model on 30/09/2026 08:41 from the figures on the right. Read and correct it before export — it is never sent as written.</div>
    <div class="g2">
      <div data-n="6"><div class="lab">Nhận xét (tiếng Việt)</div>
        <div class="field" style="min-height:300px;line-height:1.6">Trong quý III/2026, CINEMATCH ghi nhận <b>31</b> dự án mới {ref("I1")}, trong đó <b>19</b> dự án thuộc nhóm A {ref("I1")}. Hàn Quốc là thị trường đông nhất với <b>8</b> dự án {ref("I2")}. Ninh Bình là tỉnh được quan tâm nhiều nhất (<b>11</b> dự án) {ref("I3")}; cảnh núi đá vôi được tìm nhiều nhất (<b>41</b> lượt) {ref("I3")}. <b>6</b> dự án đã xác nhận đối tác Việt Nam, tương đương <b>19 %</b> {ref("I5")}. Chưa có nguồn dữ liệu về quy mô ngân sách và điểm nghẽn {ref("I4")} {ref("I6")}.</div></div>
      <div data-n="7"><div class="lab">Commentary (English)</div>
        <div class="field" style="min-height:300px;line-height:1.6">In Q3 2026 CINEMATCH recorded <b>31</b> new projects {ref("I1")}, <b>19</b> of them in segment A {ref("I1")}. South Korea was the largest origin market with <b>8</b> projects {ref("I2")}. Ninh Bình was the most requested province (<b>11</b> projects) {ref("I3")}; karst was the most searched scene type (<b>41</b> queries) {ref("I3")}. <b>6</b> projects confirmed a Vietnamese partner, a conversion of <b>19 %</b> {ref("I5")}. Budget scale and bottlenecks cannot be reported yet: no data source {ref("I4")} {ref("I6")}.</div></div>
    </div>
    <div class="row small" style="gap:8px;align-items:center">{ref("I5", 8)}<span class="muted">Every number carries a reference to the indicator it came from — click it to highlight the row in <i>Figures used</i>. A number typed without a reference is flagged before export.</span></div>
  </div>
  <div style="width:318px;flex:none" class="col">
    <div class="card soft" data-n="10" style="padding:12px 14px">
      <div class="row" style="justify-content:space-between"><h3 style="margin:0">Figures used</h3><span class="lnk small">Open in demand index →</span></div>
      <table class="t" style="margin-top:6px;font-size:12.5px">
        <tr><th>Ref</th><th>Indicator</th><th>n</th></tr>
        <tr><td>I1</td><td>31 projects · A 19 / B 8 / C 4</td><td>31</td></tr>
        <tr><td>I2</td><td>South Korea 8 · Japan 6 · France 5</td><td>31</td></tr>
        <tr style="background:#fdf6e3"><td>I3</td><td>Ninh Bình 11 · karst 41</td><td style="white-space:nowrap">54 / 142</td></tr>
        <tr><td>I4</td><td class="muted">No data source yet</td><td>0</td></tr>
        <tr><td>I5</td><td>31 → 17 → 6 (19 %)</td><td>31</td></tr>
        <tr><td>I6</td><td class="muted">No data source yet</td><td>0</td></tr>
      </table>
    </div>
    <div class="card" style="padding:12px 14px">
      <div data-n="11"><div class="lab">Reread by</div><div class="field" style="color:#8a9099">Choose the staff member who reread it ▾</div>
        <div class="hint">Records your name and the time. Required before export.</div></div>
      <span class="btn dis" data-n="12" style="width:100%;margin-top:12px">Export VFDA-branded PDF</span>
      <div class="small warn" data-n="13" style="margin-top:8px">A staff member must reread the report first.</div>
      <div class="hint">VFDA staff send the PDF by e-mail outside the platform.</div>
    </div>
  </div>
</div>
""", "Reports")

add(dict(
 seq=40, sid="SC-40", name="Admin — Quarterly report", group="M10", tier=TIER,
 module="M10", actor="VFDA Staff", prio="Should", route="/admin/reports",
 design_note="Generate and export the PDF report",
 new_note="**New Screen Spec (30/09/2026).** Written with the M10 Spec Document; the reread gate (`reread_by`, M10 BR-004) is a Group C addition recorded in its §11.1.",
 shown="Staff click *Prepare quarterly report* on `SC-39`, *Prepare Q3 2026 report* on `SC-34`, or *Reports* in the admin menu.",
 leave="Staff export the PDF and stay; *Open in demand index* goes to `SC-39`; the menu leads elsewhere.",
 el=[
  (1, "Admin top bar", "Header", "static; signed-in user and role", "—", "—"),
  (2, "Admin menu", "List", "static; *Reports* selected", "—", "—"),
  (3, "Report title and period", "Header", "`report_id` → period (quarter, `period_start`–`period_end`)", "Yes", "—"),
  (4, "Progress steps", "Text", "Figures → Commentary drafted (`narrative_vi`, `narrative_en`) → Reread (`reread_by`) → Export (`report_pdf_url`)", "—", "—"),
  (5, "*Draft commentary* button", "Button", "calls the draft from `demand_index` (F-M10-06)", "—", "disabled when the period has no data"),
  (6, "Vietnamese commentary", "Input (multi-line)", "`narrative_vi`", "Yes", "not empty for export; every number keeps a reference to its indicator"),
  (7, "English commentary", "Input (multi-line)", "`narrative_en`", "Yes", "same as row 6"),
  (8, "Figure reference", "Link", "reference from a number to its indicator (I1–I6) in `demand_index`", "Yes", "a number without a reference is flagged before export"),
  (9, "Model-draft notice", "Text", "draft time; static wording", "Yes", "—"),
  (10, "*Figures used* panel", "List", "`demand_index` the draft was built from: value and sample size per indicator", "Yes", "same sample-size rule as `SC-39` (M10 BR-003)"),
  (11, "*Reread by*", "Toggle (dropdown)", "`reread_by` — staff member (UUID) and time", "Yes", "a user with role `vfda_staff`"),
  (12, "*Export VFDA-branded PDF* button", "Button", "`report_pdf_url`", "—", "disabled until `reread_by` is set"),
  (13, "Export gate message", "Text", "static: *A staff member must reread the report first*", "—", "shown while `reread_by` is empty"),
 ],
 st=[
  ("Default", "Commentary drafted in both languages with a reference chip after every number, figures panel on the right, reread not yet recorded, export disabled with the gate message.", "Draft exists, not reread"),
  ("Empty (no data)", "Period without data: *No figures for this period — the report cannot be drafted*; both editors and all buttons are disabled.", "Every indicator below 5 records"),
  ("Loading", "*Drafting commentary…* in both editors; *Building the PDF…* on the export button.", "Draft requested / export requested"),
  ("Error", "Model unavailable: *Draft unavailable — write it by hand*; editors stay empty and editable, figures and export still work. Export without reread: *A staff member must reread the report first*.", "Model call fails / export refused"),
  ("Success / confirmation", "Green strip *Report exported — VFDA_Q3-2026_demand-index.pdf* with a download link; the export is written to the audit log; step 4 turns complete.", "PDF exported"),
 ],
 ix=[
  ("Figure reference chip", "tap", "Highlights the indicator row in *Figures used*", "stays"),
  ("*Open in demand index*", "tap", "Opens the index for the same quarter", "SC-39"),
  ("*Draft commentary again*", "tap", "Asks for confirmation, then replaces both drafts", "stays"),
  ("Commentary editors", "type", "Saves the draft as the user types", "stays"),
  ("*Reread by*", "choose", "Records `reread_by` and the time; enables export", "stays"),
  ("*Export VFDA-branded PDF*", "tap", "Builds the PDF, stores `report_pdf_url`, writes the audit record, offers the download", "stays"),
 ] + MENU_IX,
 sr=[
  ("A report can be exported only after a named staff member has marked it reread; the model draft is never sent as written.", "M10 BR-004"),
  ("Every number in the commentary carries a reference to the indicator it came from.", "F-M10-06; Spec M10 §5.1 FR-006 note"),
  ("Indicators with no data source are reported as such in the commentary, never estimated.", "M10 BR-003; Spec M10 §10 question 1"),
  ("Each export writes an audit record in the same transaction.", "M10 BR-005; §3 US-3"),
  ("The platform only produces the PDF; VFDA staff send it by e-mail outside the platform.", "Spec M10 §1 Out of scope; §9"),
 ],
 fr=[("F-M10-06", "Vietnamese and English commentary with figure references"), ("F-M10-07", "Export of the reread report as a VFDA-branded PDF"), ("F-M10-08", "Audit record for the export")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the two editors become tabs (VI | EN); *Figures used* and the reread box move below the editors.",
       "Reference chips are links with text (*indicator 5*) for screen readers.", "The disabled export button carries the gate message as its accessible description."],
 oq=[("[NEEDS CLARIFICATION: Who must reread and sign the quarterly report before it is sent — any staff member, or a named VFDA leader?]", False, "Client (VFDA)", 2),
     ("[NEEDS CLARIFICATION: If the commentary is edited after the reread is recorded, must the reread be recorded again before export?]", False, "Group C")],
), html)


# =====================================================================  41 · SC-41
def arow(t, who, role, act, target, rid, first=False):
    n = (lambda x: f' data-n="{x}"') if first else (lambda x: "")
    return (f'<tr><td>{t}</td><td>{who} <span class="small muted">· {role}</span></td>'
            f'<td><span class="kbd"{n(13)}>{act}</span></td><td><span class="lnk"{n(14)}>{target}</span></td>'
            f'<td class="small muted" style="font-family:DejaVu Sans Mono,monospace">{rid}</td></tr>')


html = admin_page("SC-41", "Admin — Audit log", "Admin", "/admin/audit?actor=thuha&from=2026-09-01&to=2026-09-30", f"""
<div class="row" style="justify-content:space-between;align-items:flex-end" data-n="3">
  <div><h1>Audit log</h1><div class="sub">Every administrative action on CINEMATCH, newest first.</div></div>
</div>
<div class="banner b-info small" style="margin-top:12px" data-n="4">🔒 Records are append-only: no role, including admin, can edit or delete them. Each record is committed together with the action it describes.</div>
<div class="card soft" style="margin-top:14px;padding:12px 14px">
  <div class="row" style="gap:12px;align-items:flex-end">
    <div data-n="5" style="flex:1.3"><div class="lab">Person</div><div class="field">Nguyễn Thị Thu Hà · VFDA staff ▾</div></div>
    <div data-n="6" style="flex:1.1"><div class="lab">Action</div><div class="field">All actions ▾</div></div>
    <div data-n="7" style="width:150px"><div class="lab">From</div><div class="field">01/09/2026</div></div>
    <div data-n="8" style="width:150px"><div class="lab">To</div><div class="field">30/09/2026</div></div>
    <span class="btn" data-n="9">Search</span><span class="lnk small" data-n="10" style="padding-bottom:9px;margin-left:16px">Clear filters</span>
  </div>
</div>
<div class="row" style="justify-content:space-between;margin-top:14px"><b data-n="11">7 records · Nguyễn Thị Thu Hà · 01/09/2026–30/09/2026</b><span class="small muted">Sorted by time, newest first</span></div>
<div class="card" style="padding:4px 6px;margin-top:8px" data-n="12">
  <table class="t">
    <tr><th>Time</th><th>Person</th><th>Action</th><th>Target</th><th>Record</th></tr>
    {arow("30/09/2026 08:12", "Nguyễn Thị Thu Hà", "VFDA staff", "content.approve", "Location photo · Hạ Long Bay", "a41f…9c02", True)}
    {arow("29/09/2026 16:05", "Nguyễn Thị Thu Hà", "VFDA staff", "content.hide", "Location photo · Mũi Né Sand Dunes", "93be…11d7")}
    {arow("25/09/2026 10:47", "Nguyễn Thị Thu Hà", "VFDA staff", "org.verify.approve", "Đò Ngang Film Services", "5c20…e8a4")}
    {arow("22/09/2026 14:30", "Nguyễn Thị Thu Hà", "VFDA staff", "location.contact.verify", "Tràng An Landscape Complex, Ninh Bình", "0d7e…4b19")}
    {arow("18/09/2026 09:05", "Nguyễn Thị Thu Hà", "VFDA staff", "location.publish", "Tam Coc – Bich Dong, Ninh Bình", "e612…a03f")}
    {arow("11/09/2026 15:22", "Nguyễn Thị Thu Hà", "VFDA staff", "content.approve", "Organisation profile · Bến Xưa Production Services", "7fa9…2c55")}
    {arow("03/09/2026 11:40", "Nguyễn Thị Thu Hà", "VFDA staff", "org.verify.approve", "Bến Xưa Production Services", "b3c1…70de")}
  </table>
</div>
<div class="row small" style="justify-content:space-between;align-items:center;margin-top:10px" data-n="15"><span class="muted">Showing 1–7 of 7</span><span class="row" style="gap:6px"><span class="btn q sm">‹ Previous</span><span class="btn q sm">Next ›</span></span></div>
""", "Audit log", user=ADMIN)

add(dict(
 seq=41, sid="SC-41", name="Admin — Audit log", group="M10", tier=TIER,
 module="M10", actor="Admin", prio="Should", route="/admin/audit",
 design_note="Search admin actions",
 new_note="**New Screen Spec (30/09/2026).** Written with the M10 Spec Document. The four typed filters replace the DBIZ2 `filter JSONB` (M10 §11.1).",
 shown="An admin clicks *Open audit log* on `SC-34` or *Audit log* in the admin menu.",
 leave="The admin opens the target of a record (`SC-38`, `SC-35` or `SC-36`) or leaves through the admin menu.",
 el=[
  (1, "Admin top bar", "Header", "static; signed-in user (Vũ Đức Anh) and role", "—", "—"),
  (2, "Admin menu", "List", "static; *Audit log* selected", "—", "*Audit log* shown to `admin` only"),
  (3, "Title", "Header", "static", "—", "—"),
  (4, "Append-only notice", "Text", "static", "Yes", "—"),
  (5, "Person filter", "Toggle (dropdown, searchable)", "`actor_id` — users with role `vfda_staff`, `vfda_legal` or `admin`", "No", "an existing user; empty = everyone"),
  (6, "Action filter", "Toggle (dropdown)", "`action` — action codes present in the log", "No", "max 60 characters; empty = all actions"),
  (7, "From", "Input (date)", "`from_date`", "No", "dd/mm/yyyy; on or before *To*"),
  (8, "To", "Input (date)", "`to_date`", "No", "dd/mm/yyyy; on or after *From*; not after today"),
  (9, "*Search* button", "Button", "runs the search → `audit_entries`", "—", "—"),
  (10, "*Clear filters* link", "Link", "static", "—", "—"),
  (11, "Result count and active filters", "Text", "count of `audit_entries` for the filters", "Yes", "—"),
  (12, "Results table", "List", "`audit_entries`: `logged_at`, `admin_id` → name and role, `action`, `target_id`, `audit_log_id`", "Yes", "newest `logged_at` first; no edit or delete control"),
  (13, "Action code", "Text", "`action`", "Yes", "e.g. `content.approve`, `location.publish`"),
  (14, "Target link", "Link", "`target_id` → readable label of the organisation, location, content item or rule", "—", "plain text when the target is no longer published or deactivated"),
  (15, "Pagination", "Button", "page of `audit_entries`", "—", "50 records per page"),
 ],
 st=[
  ("Default", "Filters for person, action, from and to; the matching records newest first; append-only notice above — as in the mockup (Nguyễn Thị Thu Hà, September 2026).", "Admin runs a search"),
  ("Empty (no data)", "*No admin actions match these filters* with a *Clear filters* link; the table is hidden.", "No matching record"),
  ("Loading", "Skeleton rows in the table; the *Search* button shows a pending state.", "Search running"),
  ("Error", "*From* after *To*: *The start date must be on or before the end date* under the date fields, no search sent. Search failure: *The log could not be searched — try again.*", "Validation / query failure"),
  ("Success / confirmation", "**Not applicable** — the audit log is read-only; no action on this screen writes data.", "—"),
 ],
 ix=[
  ("Filters + *Search*", "tap", "Runs the search with the four typed filters", "stays"),
  ("*Clear filters*", "tap", "Resets the filters and shows the latest records", "stays"),
  ("Target link (content item)", "tap", "Opens the moderation item", "SC-38"),
  ("Target link (location)", "tap", "Opens the location in the admin list", "SC-35"),
  ("Target link (organisation)", "tap", "Opens the organisation's verification record", "SC-36"),
  ("*Previous* / *Next*", "tap", "Pages through the results", "stays"),
 ] + MENU_IX,
 sr=[
  ("Audit records are append-only: no role, including admin, can update or delete them; the screen offers no edit or delete control.", "M10 BR-005"),
  ("One record is written for every administrative action by a database trigger in the same transaction; an action whose record fails is rolled back.", "F-M10-08; Spec M10 §4.3, §3 edge cases"),
  ("Search is available to the role `admin` only.", "F-M10-09 (actor Admin)"),
  ("Results are listed newest first and filtered only by person, action type, from and to.", "Spec M10 §3 US-4; §11.1"),
  ("Records about accounts that were deleted keep their entries; the person appears as *Former member* after anonymisation.", "SYS BR-005"),
 ],
 fr=[("F-M10-08", "Records written for every admin action (shown here)"), ("F-M10-09", "Search by person, action type and time")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: filters stack in one column behind a *Filters* button; each record becomes a card (time, person, action, target).",
       "The table has a caption and header cells (`th scope`); action codes are also read as text.", "Date fields accept typed dates as well as the picker."],
 oq=[("[NEEDS CLARIFICATION: How long are audit records kept (proposed: for the life of the platform)?]", False, "Client (VFDA)", 3),
     ("[NEEDS CLARIFICATION: The specs name only the action codes `content.approve` and `location.publish`; the full list of action codes (verification, contact check, hide, role grant, rule signing, report export) must be fixed before the Action filter can be built.]", False, "Group C")],
), html)
