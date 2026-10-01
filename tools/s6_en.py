# -*- coding: utf-8 -*-
"""Screens 32–36 (added 30/09/2026): M4 partner self-service (SC-21, SC-22), send request (SC-23),
admin verification queue (SC-36), M7 consultation booking (SC-33)."""
from base import page

SCREENS = []


def add(spec, html):
    SCREENS.append((spec, html))


# 12 service groups: enum code -> readable label (labels as on SC-19; official names still open, M4 §10 #1)
SG = [("full_production", "Full production services"), ("permits_paperwork", "Permits and paperwork"),
      ("casting", "Casting"), ("crew", "Crew"), ("camera_lighting", "Camera and lighting rental"),
      ("studios_interiors", "Studios and interiors"), ("location_management", "Location scouting and management"),
      ("transport_logistics", "Transport and logistics"), ("lodging_catering", "Crew lodging and catering"),
      ("interpreting", "Interpreting and bilingual coordination"), ("insurance_legal", "Insurance and legal"),
      ("post_production", "Post-production, sound, VFX")]


def tick(on):
    """Checkbox square."""
    if on:
        return ('<span style="width:15px;height:15px;border:1.5px solid #0d366b;background:#0d366b;border-radius:3px;'
                'flex:none;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:10px">✓</span>')
    return '<span style="width:15px;height:15px;border:1.5px solid #8a9099;border-radius:3px;flex:none;display:inline-block"></span>'


def topnav(items, active, initials, name, n=1, extra=""):
    """Top navigation for a non-member user (partner / VFDA staff); the default nav in base.py is Lena Park's."""
    links = "".join(f'<a class="{"on" if a == active else ""}">{a}</a>' for a in items)
    return (f'<div style="margin:-26px -34px 22px"><div class="nav" data-n="{n}"><span class="logo">CINEMATCH</span>{extra}{links}'
            f'<span class="r"><span><b>EN</b> | VI</span><span class="row" style="gap:8px;align-items:center">'
            f'<span class="avatar">{initials}</span>{name}</span></span></div></div>')


PARTNER_NAV = ["Locations", "Partners", "Permits", "Requests", "My organisation"]


def pnav(active="My organisation"):
    return topnav(PARTNER_NAV, active, "HT", "Huỳnh Minh Tuấn · Mekong Frame Co.")


ADMIN_MENU = ["Overview", "Locations", "Verification", "Legal rules", "Moderation", "Demand index", "Reports", "Audit log"]


def admin(active, main, menu_n=2):
    """Admin layout: own header (row 1) + left admin menu (row menu_n) + main area."""
    links = "".join(f'<a class="{"on" if t == active else ""}">{t}</a>' for t in ADMIN_MENU)
    head = ('<div class="nav" data-n="1"><span class="logo">CINEMATCH</span><span class="pill p-info">VFDA admin</span>'
            '<span class="r"><span><b>EN</b> | VI</span><span class="row" style="gap:8px;align-items:center">'
            '<span class="avatar">TH</span>Nguyễn Thị Thu Hà · VFDA staff</span></span></div>')
    return (f'<div style="margin:-26px -34px -32px">{head}<div class="body">'
            f'<div class="side" data-n="{menu_n}"><div class="pj">Administration</div><div class="pn">VFDA workspace</div>{links}</div>'
            f'<div class="main">{main}</div></div></div>')


# =====================================================================  32 · SC-21
chips21 = "".join(f'<span class="chip {"on" if c in ("full_production", "transport_logistics") else ""}">'
                  f'{"✓ " if c in ("full_production", "transport_logistics") else ""}{l}</span>' for c, l in SG)
html = page("SC-21", "My organisation profile", "M4 · Partner · Added 30/09/2026", "/partners/me", f"""
{pnav()}
<div class="row" style="justify-content:space-between;align-items:flex-start">
  <div data-n="2"><h1>My organisation profile</h1><div class="sub">Mekong Frame Co. · three visibility layers — each section below says who can see it. <span class="pill p-ok">Active</span></div></div>
  <div class="banner b-warn small" data-n="3" style="width:420px"><b>Not verified yet.</b> Your verification request was submitted on 24/09/2026 and is waiting for VFDA review. <span class="lnk small">View request →</span></div>
</div>
<div class="row" style="gap:18px;margin-top:14px;align-items:flex-start">
  <div style="flex:1.6" class="col">
    <div class="card">
      <div class="row" style="justify-content:space-between"><h2>Layer 1 · Public</h2><span class="small muted">Anyone, including guests</span></div>
      <div class="row" style="gap:12px">
        <div data-n="4" style="flex:1"><div class="lab">Organisation name</div><div class="field">Mekong Frame Co.</div></div>
        <div data-n="5" style="flex:1.3" class="row"><div style="flex:1.2"><div class="lab">Legal form</div><div class="field">Công ty TNHH ▾</div></div><div style="flex:.8"><div class="lab">Founded</div><div class="field">2019</div></div><div style="flex:1"><div class="lab">Head office</div><div class="field">Cần Thơ ▾</div></div></div>
      </div>
      <div data-n="6" style="margin-top:12px"><div class="lab">Service groups <span class="opt">(fixed list of 12 — choose at least one)</span></div><div class="row" style="gap:6px;flex-wrap:wrap">{chips21}</div></div>
      <div data-n="7" style="margin-top:12px"><div class="lab">Provinces you work in</div><div class="field"><span class="chip on">Cần Thơ ×</span> <span class="chip on">Thành phố Hồ Chí Minh ×</span> <span class="muted small">+ add province</span></div></div>
    </div>
    <div class="card">
      <div class="row" style="justify-content:space-between"><h2>Layer 2 · Signed-in members</h2><span class="small muted">Producers with an account</span></div>
      <div data-n="8"><div class="row" style="justify-content:space-between;align-items:center"><div class="lab">Capability description</div><div class="tabs" style="border:none"><span class="on" style="padding:2px 10px">EN</span><span style="padding:2px 10px">VI</span></div></div>
        <div class="field" style="min-height:62px;line-height:1.5">Production and logistics in the Mekong Delta: river boats and floating-market access in Cái Răng, crew transport between Cần Thơ and Ho Chi Minh City, local fixers who speak English.</div></div>
      <div data-n="9" class="row small" style="gap:8px;align-items:center;margin-top:6px"><span class="pill p-warn">Pending review</span><span class="muted">Edited 28/09/2026 · the version approved on 14/09/2026 stays public until VFDA approves this one.</span></div>
      <div class="row" style="gap:16px;margin-top:12px;align-items:flex-start">
        <div data-n="10" style="width:250px"><div class="lab">Working languages</div><div class="row" style="gap:6px"><span class="chip on">✓ EN</span><span class="chip">VI</span><span class="chip dash">+ add</span></div></div>
        <div data-n="11" style="flex:1"><div class="lab">Portfolio photos <span class="opt">(no project titles)</span></div><div class="row" style="gap:8px"><div class="ph" style="width:92px;height:56px">photo · approved</div><div class="ph" style="width:92px;height:56px">photo · approved</div><div class="ph" style="width:92px;height:56px;border:2px solid #efd3a0">photo · pending</div><div class="ph" style="width:56px;height:56px;background:#fff;border-style:dashed">+ add</div></div></div>
      </div>
    </div>
    <div class="card">
      <div class="row" style="justify-content:space-between"><h2>Layer 3 · After an accepted request + NDA</h2><span class="small muted">Only that producer, only after both steps</span></div>
      <div class="row" style="gap:14px;align-items:flex-start">
        <div data-n="12" style="flex:1.2"><div class="lab">Rate card</div><table class="t" style="font-size:12.5px"><tr><td style="padding:5px 6px">Line producer / day</td><td style="padding:5px 6px;text-align:right">6,500,000 VND</td></tr><tr><td style="padding:5px 6px">Fixer / day</td><td style="padding:5px 6px;text-align:right">3,000,000 VND</td></tr></table><span class="lnk small">+ add line</span></div>
        <div data-n="13" style="flex:1"><div class="lab">Past clients</div><div class="row" style="gap:6px;flex-wrap:wrap"><span class="chip">Kestrel Pictures ×</span><span class="chip">Northwind Documentary ×</span></div></div>
        <div data-n="14" style="flex:1"><div class="lab">Direct contact</div><div class="field small" style="line-height:1.5">Huỳnh Minh Tuấn<br>+84 000 000 123<br>tuan.huynh@mekongframe.example.vn</div></div>
      </div>
    </div>
  </div>
  <div style="flex:1" class="col">
    <div class="card" data-n="15"><div class="row" style="justify-content:space-between;align-items:center"><h3 style="margin:0">Preview as</h3><div class="row" style="gap:4px"><span class="chip on">Guest</span><span class="chip">Member</span><span class="chip">Accepted</span></div></div>
      <div class="card soft" style="margin-top:10px;display:flex;gap:12px;align-items:center"><div class="ph" style="width:52px;height:52px;flex:none">logo</div><div><b>Mekong Frame Co.</b> <span class="pill p-mute">Not verified</span><div class="small">Cần Thơ · Thành phố Hồ Chí Minh</div><div class="small muted">Full production services · Transport and logistics</div></div></div>
      <div class="small muted" style="margin-top:6px">Guests see layer 1 only. Pending changes are not in the preview until approved.</div></div>
    <div class="card" data-n="16"><h3>Changes waiting for VFDA</h3>
      <table class="t" style="font-size:12.5px"><tr><td style="padding:6px">Capability description (EN)</td><td style="padding:6px"><span class="pill p-warn">Pending review</span></td></tr><tr><td style="padding:6px">1 portfolio photo</td><td style="padding:6px"><span class="pill p-warn">Pending review</span></td></tr></table>
      <div class="small muted" style="margin-top:6px">VFDA reviews profile text and photos before they are shown. If VFDA hides a change, you get the reason and can edit it.</div></div>
    <span class="btn" data-n="17" style="height:42px">Save changes</span>
    <div class="card" data-n="18" style="border-color:#eab9b3"><h3 class="bad" style="font-weight:700">Deactivate organisation</h3><div class="small">Removes Mekong Frame Co. from the directory. Nothing is deleted: open requests are closed as <i>withdrawn</i> and the producers are told; the document access log is kept.</div><span class="btn q sm" style="margin-top:8px;color:#a52a1f;border-color:#eab9b3">Deactivate…</span></div>
  </div>
</div>
""", nav_n=None)

add(dict(
 seq=32, sid="SC-21", name="My organisation profile", group="M4", tier="Added 30/09/2026 — Must",
 module="M4", actor="Partner", prio="Must", route="/partners/me",
 design_note="Create and edit the profile.",
 new_note="New Screen Spec written on 30/09/2026; SC-21 had no spec or mockup in the first set of 20.",
 shown="The partner accepts VFDA's invitation and signs in for the first time, clicks *My organisation* in the navigation bar, or opens a *VFDA reviewed your profile change* notification.",
 leave="The partner saves and stays, opens the verification request (`SC-22`), switches to the request inbox (`SC-25`), or deactivates the organisation.",
 el=[
  (1, "Navigation bar (partner)", "Header", "static; *My organisation* selected", "—", "—"),
  (2, "Title + organisation status", "Header + Text", "`org_name`, `org_status` — active / deactivated", "Yes", "—"),
  (3, "Verification status strip", "Text + link", "latest `verification_request.status` (pending / approved / rejected) and `verified_until`", "—", "shows the rejection reason when the last request was rejected"),
  (4, "Organisation name", "Input", "`org_name` — layer 1 (public)", "Yes", "1–200 characters"),
  (5, "Legal form, founded year, head office province", "Input + Toggle (dropdown)", "`legal_form`, `founded_year`, `hq_province` — layer 1", "Yes", "founded year 4 digits, not in the future; province from the 34-province list"),
  (6, "Service groups (12)", "Toggle (multi-select chips)", "`service_groups` — ENUM(full_production, permits_paperwork, casting, crew, camera_lighting, studios_interiors, location_management, transport_logistics, lodging_catering, interpreting, insurance_legal, post_production)[]", "Yes", "at least one; only values of the fixed enum (M4 BR-002)"),
  (7, "Provinces", "Input (multi-select)", "`provinces` — INTEGER[] of province IDs", "Yes", "at least one; IDs from the 34-province list"),
  (8, "Capability description EN / VI", "Input (text area, two tabs)", "`capability_desc_en`, `capability_desc_vi` — layer 2 (members)", "No", "free text; goes to moderation when changed (M10 BR-001)"),
  (9, "*Pending review* label + last approved note", "Text", "moderation item `content_status` = pending (content type `org_profile`)", "—", "shown only while a change is pending"),
  (10, "Working languages", "Toggle (multi-select chips)", "`working_languages` — CHAR(2)[] ISO 639-1 codes", "No", "ISO 639-1 codes only"),
  (11, "Portfolio photos", "Input (image upload) + List", "`portfolio` of the member layer; each photo carries its moderation status", "No", "JPG / PNG; no project titles in captions (member layer rule on `SC-20`)"),
  (12, "Rate card", "Input (table)", "`rate_card` — JSONB, layer 3", "No", "amount ≥ 0, currency VND"),
  (13, "Past clients", "Input (tags)", "`past_clients` — TEXT[], layer 3", "No", "—"),
  (14, "Direct contact", "Input (text area)", "`direct_contact` — layer 3", "No", "—"),
  (15, "*Preview as* Guest / Member / Accepted", "Toggle + Container", "`public_profile`, `member_profile`, `private_profile` outputs of F-M4-02..04", "—", "shows approved content only"),
  (16, "*Changes waiting for VFDA* list", "List", "moderation items of this organisation with `content_status`", "—", "empty list is hidden"),
  (17, "*Save changes* button", "Button", "static", "—", "disabled until something changed and fields 4–7 are valid"),
  (18, "*Deactivate organisation* block", "Button + Text", "sets `org_status = deactivated`", "—", "confirmation dialog: type the organisation name"),
 ],
 st=[
  ("Default", "Three layer sections on the left, preview, pending-changes list, save button and deactivate block on the right, as in the mockup (capability text and one photo pending review).", "Page opens"),
  ("Empty (no data)", "First visit after the VFDA invitation: only the organisation name entered by VFDA is filled; every other section shows a short hint of what to add, the preview shows the name only, the pending list is hidden.", "New organisation"),
  ("Loading", "Grey placeholders in the three sections; *Save changes* shows *Saving…* and is disabled while a save runs.", "Page load / save"),
  ("Error", "Field errors under each field (e.g. *Choose at least one service group*). Save failure: *Couldn't save — your edits are kept on this page, try again*. Upload failure on a photo: error on that thumbnail only.", "Validation / write error"),
  ("Success / confirmation", "Green strip *Saved. Structured fields are live; text and photo changes are waiting for VFDA review — the last approved version stays public.* After deactivation: red banner *Mekong Frame Co. is deactivated*, all fields read-only, organisation no longer listed on `SC-19`.", "Saved / deactivated"),
 ],
 ix=[
  ("*View request* in the verification strip", "tap", "Opens the verification request (new request if none or rejected)", "SC-22"),
  ("Service group chip", "tap", "Selects / deselects the group", "stays"),
  ("*Preview as* chip", "tap", "Switches the preview to that layer", "stays"),
  ("*Save changes* button", "tap", "Saves layer fields; text and photo changes create moderation items (F-M10-01)", "stays"),
  ("*Deactivate…* button", "tap", "Confirmation dialog explaining BR-008; on confirm `org_status = deactivated`, open requests closed as *withdrawn*, producers notified", "stays"),
  ("*Requests* in the navigation bar", "tap", "Opens the request inbox", "SC-25"),
  ("*Partners* in the navigation bar", "tap", "Opens the directory to see how the profile is listed", "SC-19"),
 ],
 sr=[
  ("The three layers are three tables with separate RLS policies; the form mirrors them as three sections and says who can see each.", "M4 BR-001"),
  ("Service groups come only from the fixed 12-value enum; an organisation cannot add its own group.", "M4 BR-002"),
  ("Profile text and photos wait in moderation; until VFDA approves, the last approved version stays public and the change shows *Pending review*.", "M10 BR-001"),
  ("If VFDA hides a change, the reason is shown to the partner next to the item.", "M10 BR-002"),
  ("*Deactivate organisation* never deletes: `org_status = deactivated`, open requests are closed as *withdrawn* with the producer notified, the document access log is kept.", "M4 BR-008"),
  ("The Verified badge and the Article 13 eligibility flag are not editable here; only VFDA sets them (`SC-36`).", "M4 BR-004"),
 ],
 fr=[("F-M4-01", "Create and edit the organisation profile across the three layers"), ("F-M4-02", "Preview of the public layer"),
     ("F-M4-03", "Preview of the member layer"), ("F-M4-04", "Preview of the accepted layer"),
     ("F-M10-01", "Text and photo changes enter the moderation queue")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the right column moves below the form; the preview collapses into a *Preview* button; *Save changes* sticks to the bottom.", "Each layer section is a `<fieldset>` whose `<legend>` names the layer and who can see it.", "*Pending review* is text, not only a colour; the deactivate dialog traps focus and needs typed confirmation."],
 oq=[("[NEEDS CLARIFICATION: Official names of the 12 service groups (the mockup uses a proposed list).]", True, "Client (VFDA)", 1),
     ("[NEEDS CLARIFICATION: Do changes to structured fields (service groups, provinces, rate card) also wait in moderation, or only profile text and photos?]", False, "Client (VFDA)")],
), html)

# =====================================================================  33 · SC-22
html = page("SC-22", "Submit verification", "M4 · Partner · Added 30/09/2026", "/partners/me/verify", f"""
{pnav()}
<div data-n="2"><div class="small muted">My organisation › Verification</div><h1 style="margin-top:4px">Apply for VFDA Verified</h1><div class="sub">Send VFDA your business registration and at least two reference projects. VFDA reviews them and decides.</div></div>
<div class="row" style="gap:18px;margin-top:16px;align-items:flex-start">
  <div style="flex:1.5" class="col">
    <div class="card soft" data-n="3" style="display:flex;gap:14px;align-items:center"><div class="ph" style="width:52px;height:52px;flex:none">logo</div><div><b>Mekong Frame Co.</b> · Công ty TNHH · founded 2019 · Cần Thơ<div class="small muted">Full production services · Transport and logistics · Cần Thơ, Thành phố Hồ Chí Minh</div></div><span class="lnk small" style="margin-left:auto">Edit profile</span></div>
    <div class="card" data-n="4"><h2>1 · Business registration certificate</h2>
      <div class="row" style="gap:12px;align-items:center;border:1px solid #dce0e5;border-radius:6px;padding:10px 12px"><span class="pill p-bad">PDF</span><div style="flex:1"><b class="small">mekong-frame-business-registration.pdf</b><div class="small muted">2.4 MB · uploaded 24/09/2026 09:12</div></div><span class="lnk small">Replace</span><span class="lnk small" style="color:#a52a1f">Remove</span></div>
      <div class="hint">PDF only, up to 25 MB. Stored privately; only you and VFDA staff can open it.</div></div>
    <div class="card"><h2>2 · Reference projects <span class="muted" style="font-weight:400;font-size:13px">(at least 2)</span></h2>
      <div class="col" style="gap:8px" data-n="5">
        <div class="row" style="gap:10px;align-items:center"><span class="dot done" style="width:22px;height:22px;font-size:11px">1</span><div class="field" style="flex:1">Mangrove Song — feature film, Vietnam, 2025 · 12 shooting days in Cần Thơ</div><span class="muted">✕</span></div>
        <div class="row" style="gap:10px;align-items:center"><span class="dot done" style="width:22px;height:22px;font-size:11px">2</span><div class="field" style="flex:1">Floating Market — commercial, South Korea, 2026 · 3 days in Cái Răng</div><span class="muted">✕</span></div>
        <div class="row" style="gap:10px;align-items:center"><span class="dot off" style="width:22px;height:22px;font-size:11px">3</span><div class="field" style="flex:1;color:#8a9099">Title — type, country, year · what you did (optional third reference)</div><span class="muted">✕</span></div>
      </div>
      <span class="btn g sm" data-n="6" style="margin-top:10px">+ Add reference project</span>
      <div class="hint">Write what VFDA can check: title, type, country, year and your role. Titles here are seen by VFDA only, never shown on your profile.</div></div>
    <div class="row" style="gap:12px;align-items:center">
      <div class="card soft small" data-n="7" style="flex:1;padding:10px 14px"><span class="ok">✓</span> Registration PDF &nbsp;·&nbsp; <span class="ok">✓</span> 2 references &nbsp;·&nbsp; <span class="ok">✓</span> Groups and provinces set</div>
      <span class="lnk" data-n="9" style="margin-left:14px">Cancel</span>
      <span class="btn" data-n="8" style="height:42px">Submit for verification</span>
    </div>
  </div>
  <div style="flex:1" class="col">
    <div class="card soft" data-n="10"><h3>What VFDA checks — and what it does not</h3><div class="small col" style="gap:4px"><div><span class="ok">✓</span> Business registration certificate</div><div><span class="ok">✓</span> Legal representative</div><div><span class="ok">✓</span> Reference projects, contacted and confirmed</div><div class="muted">Not covered: quality of service or prices.</div><div class="muted" style="margin-top:4px">Written criteria are being finalised with VFDA.</div></div></div>
    <div class="card" data-n="11"><h3>After you submit</h3>
      <div class="col small" style="gap:8px">
        <div class="row" style="gap:10px"><span class="dot" style="width:22px;height:22px;font-size:11px">1</span><div><b>Submitted</b> — VFDA staff are notified.</div></div>
        <div class="row" style="gap:10px"><span class="dot off" style="width:22px;height:22px;font-size:11px">2</span><div><b>VFDA decides</b> — approved, or rejected with a written reason you can act on.</div></div>
        <div class="row" style="gap:10px"><span class="dot off" style="width:22px;height:22px;font-size:11px">3</span><div><b>Badge valid 12 months</b> — reminder 30 days before it ends; apply again here to renew.</div></div>
      </div></div>
    <div class="card" data-n="12"><h3>Verification history</h3><div class="small muted">No earlier requests. Your first request will appear here with its status.</div></div>
  </div>
</div>
""", nav_n=None)

add(dict(
 seq=33, sid="SC-22", name="Submit verification", group="M4", tier="Added 30/09/2026 — Must",
 module="M4", actor="Partner", prio="Must", route="/partners/me/verify",
 design_note="Upload documents and reference projects.",
 new_note="New Screen Spec written on 30/09/2026; SC-22 had no spec or mockup in the first set of 20.",
 shown="The partner clicks the verification strip on `SC-21`, opens a *your badge expires in 30 days* reminder (F-M4-11), or opens a *verification rejected* notification to apply again.",
 leave="The partner submits the request (and stays on the page, now read-only with status *Pending*) or cancels back to `SC-21`.",
 el=[
  (1, "Navigation bar (partner)", "Header", "static; *My organisation* selected", "—", "—"),
  (2, "Breadcrumb + title + purpose", "Header + Text", "static", "—", "—"),
  (3, "Organisation summary", "Text", "`org_id` with `org_name`, `legal_form`, `founded_year`, `hq_province`, `service_groups`, `provinces` (read-only)", "Yes", "—"),
  (4, "Business registration certificate", "Input (file)", "`business_license` — FILE, private storage", "Yes", "PDF only, ≤ 25 MB"),
  (5, "Reference project rows", "Input (list)", "`reference_projects` — TEXT[]", "Yes", "at least 2 non-empty rows; empty rows are ignored"),
  (6, "*+ Add reference project* button", "Button", "static", "—", "—"),
  (7, "Submission checklist", "Text", "computed from fields 3–5", "—", "each item turns green when met"),
  (8, "*Submit for verification* button", "Button", "creates the request; returns `verification_request_id`", "—", "disabled until checklist 7 is complete or while a request is pending"),
  (9, "*Cancel* link", "Link", "static", "—", "—"),
  (10, "*What VFDA checks — and what it does not* block", "Text", "static; wording approved by VFDA", "Yes", "must state that quality and prices are not checked"),
  (11, "*After you submit* steps", "List", "static", "—", "—"),
  (12, "Verification history", "List", "earlier `verification_request` rows of this organisation: `status`, decision date, `reason`", "—", "newest first"),
 ],
 st=[
  ("Default", "Organisation summary, upload, reference rows, checklist and submit button on the left; what VFDA checks, next steps and history on the right, as in the mockup.", "Page opens with no pending request"),
  ("Empty (no data)", "No file and no references yet: upload area shows *Drop the PDF here or choose a file*, two empty reference rows, checklist items grey, submit disabled; history shows *No earlier requests*.", "First application"),
  ("Loading", "Upload shows a progress bar on the file row; *Submit* shows *Submitting…* and the form is locked.", "Uploading / submitting"),
  ("Error", "Wrong type or over 25 MB: error on the file row stating the limit. Fewer than two references: *Add at least two reference projects*. Submit failure: *Couldn't send — nothing was submitted, try again*.", "Validation / upload / write error"),
  ("Success / confirmation", "Banner *Sent to VFDA on 24/09/2026. You'll be notified of the decision.*; the form turns read-only with status *Pending*; the request appears in the history and on `SC-21`. After a rejection, the reason is shown at the top and the form opens again pre-filled.", "Request created / previous request rejected"),
 ],
 ix=[
  ("Business registration file row", "tap / drop", "Uploads the PDF to private storage", "stays"),
  ("*+ Add reference project*", "tap", "Adds an empty row", "stays"),
  ("✕ on a reference row", "tap", "Removes the row", "stays"),
  ("*Submit for verification*", "tap", "Creates the request with status `pending`; VFDA staff are notified", "stays"),
  ("*Edit profile* / *Cancel*", "tap", "—", "SC-21"),
 ],
 sr=[
  ("A request needs a business registration PDF (≤ 25 MB) and at least two reference projects; the submit button stays disabled until both are present.", "M4 FR-008"),
  ("Only one request per organisation can be *pending* at a time; while it is pending the form is read-only.", "M4 §4.3 (SEQ-07)"),
  ("The block *What VFDA checks* also states what is not checked (quality, prices) so the badge is not read as a guarantee.", "M4 BR-004"),
  ("The badge, once granted, is valid 12 months; the renewal reminder 30 days before expiry leads back to this screen.", "M4 BR-004"),
  ("Documents are stored privately: only the organisation's partner users and VFDA staff can open them.", "M4 BR-001"),
 ],
 fr=[("F-M4-08", "Submit the verification request with documents and references"), ("F-M4-11", "Renewal entry point after the expiry reminder")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the right column moves below the submit button; reference rows take full width.", "The upload area has a *Choose file* button for keyboard users; progress is announced with `aria-live`.", "Checklist items use a text tick plus the words, not colour alone."],
 oq=[("[NEEDS CLARIFICATION: Written criteria for awarding VFDA Verified.]", True, "Client (VFDA)", 2),
     ("[NEEDS CLARIFICATION: Does VFDA need a named contact person for each reference project to confirm it, and may the partner share that person's details with VFDA?]", False, "Client (VFDA)")],
), html)

# =====================================================================  34 · SC-23
chips23 = "".join(f'<span class="chip {"on" if c == "transport_logistics" else ""}">{"✓ " if c == "transport_logistics" else ""}{l}</span>'
                  for c, l in [("transport_logistics", "Transport and logistics"), ("lodging_catering", "Crew lodging and catering")])
html = page("SC-23", "Send collaboration request", "M4 · Member · Added 30/09/2026", "/partners/halongmarine/request", f"""
<div class="small muted" data-n="2">Partners › Transport and logistics › Hạ Long Marine Logistics › Send request</div>
<div class="row" style="gap:20px;margin-top:12px;align-items:flex-start">
  <div style="flex:1.5" class="col">
    <h1>Send a collaboration request</h1>
    <div class="card" data-n="3" style="display:flex;gap:14px;align-items:center"><div class="ph" style="width:56px;height:56px;flex:none">logo</div><div><div class="row" style="gap:10px;align-items:center"><b style="font-size:15px">Hạ Long Marine Logistics</b><span class="ver">✓ VFDA Verified · valid until 04/2027</span></div><div class="small">Quảng Ninh · Hải Phòng · Transport and logistics, Crew lodging and catering · works in EN, ZH</div></div></div>
    <div class="g2">
      <div data-n="4"><div class="lab">For project</div><div class="field">The Last Ferry ▾</div><div class="hint">Your active projects only · Quiet Harbour Blues also available</div></div>
      <div class="card soft small" data-n="5" style="padding:10px 12px"><b>The Last Ferry</b> · feature · segment A<br>First shooting day <b>15/03/2027</b> · crew 15–50<br>Locations: Tràng An (Ninh Bình), Lan Hạ Bay (Hải Phòng)</div>
    </div>
    <div data-n="6"><div class="lab">Services you need from them</div><div class="row" style="gap:6px;flex-wrap:wrap">{chips23}<span class="chip dash">+ other service group</span></div><div class="hint">Their service groups are listed first; choose at least one.</div></div>
    <div data-n="7"><div class="lab">Note to the partner <span class="opt">(optional)</span></div><div class="field" style="min-height:92px;line-height:1.5">We need two boats with drivers for 6 shooting days on Lan Hạ Bay (dawn and dusk), plus transfers for about 30 crew between Cát Bà and the set. Dates in March 2027 to be fixed after the scout.</div><div class="hint" style="text-align:right">191 / 1000</div></div>
    <div class="row" style="gap:14px;align-items:center;justify-content:flex-end"><span class="lnk" data-n="11" style="margin-left:24px">Cancel</span><span class="btn" data-n="10" style="height:42px">Send request</span></div>
  </div>
  <div style="flex:1" class="col">
    <div class="banner b-warn small" data-n="8"><b>Not an Article 13 signing partner.</b> Hạ Long Marine Logistics is not marked as eligible to sign the service agreement under Article 13. You can still hire them for boats and lodging; the agreement itself must be with an eligible company — your project already has an open request with Bến Xưa Production Services.</div>
    <div class="card" data-n="9"><h3>What happens next</h3>
      <div class="col small" style="gap:8px">
        <div class="row" style="gap:10px"><span class="dot" style="width:22px;height:22px;font-size:11px">1</span><div><b>Sent</b> — Hạ Long Marine is notified in the app and by email.</div></div>
        <div class="row" style="gap:10px"><span class="dot off" style="width:22px;height:22px;font-size:11px">2</span><div><b>Partner responds</b> — accepts, declines or asks for more information.</div></div>
        <div class="row" style="gap:10px"><span class="dot off" style="width:22px;height:22px;font-size:11px">3</span><div><b>You confirm</b> — after you accept the non-disclosure agreement (NDA).</div></div>
      </div>
      <div class="hr" style="margin:10px 0"></div>
      <div class="small">🔒 Rates, past clients and direct contact unlock only after they accept <b>and</b> you accept the NDA. Nothing confidential is shared by sending this request.</div>
      <div class="small muted" style="margin-top:6px">A request with no reply after 14 days expires; you can withdraw it at any time.</div></div>
  </div>
</div>
""", active="Partners")

add(dict(
 seq=34, sid="SC-23", name="Send collaboration request", group="M4", tier="Added 30/09/2026 — Must",
 module="M4", actor="Member", prio="Must", route="/partners/[slug]/request",
 design_note="Choose a project and write a note.",
 new_note="New Screen Spec written on 30/09/2026; SC-23 had no spec or mockup in the first set of 20. It is also opened by *Propose changes* on `SC-25`.",
 shown="A signed-in member clicks *Send request* on an organisation card in `SC-19`, *Send collaboration request* on `SC-20`, or *Propose changes* on `SC-25`.",
 leave="The member sends the request and lands on its tracking page (`SC-25`), or cancels back to the partner profile (`SC-20`).",
 el=[
  (1, "Navigation bar", "Header", "static; *Partners* selected", "—", "—"),
  (2, "Breadcrumb", "Text", "Partners › service group › organisation › Send request", "—", "—"),
  (3, "Recipient organisation summary", "Text", "`org_id` → public layer: `org_name`, Verified badge (`verified_until`), provinces, `service_groups`, `working_languages`", "Yes", "—"),
  (4, "Project selector", "Toggle (dropdown)", "`project_id` — the member's projects that are not archived", "Yes", "must be a project the member belongs to; archived projects are not listed (M0 BR-005)"),
  (5, "Project summary", "Text", "project name, format, segment, first shooting day, crew size band, shortlisted locations (read-only)", "—", "—"),
  (6, "Requested service groups", "Toggle (multi-select chips)", "`services` — ENUM[] from the 12 service groups", "Yes", "at least one; the organisation's own groups listed first"),
  (7, "Note to the partner", "Input (text area)", "`note` — TEXT", "No", "max 1000 characters, live counter"),
  (8, "Article 13 eligibility notice", "Text", "`art13_eligible` of the organisation + open requests of the project", "—", "shown only when the organisation is not eligible"),
  (9, "*What happens next* block", "List + Text", "static: 3 steps, NDA and unlock explanation, expiry note", "Yes", "—"),
  (10, "*Send request* button", "Button", "creates the request; returns `request_id`, `status` = pending", "—", "disabled until 4 and 6 are valid"),
  (11, "*Cancel* link", "Link", "static", "—", "—"),
 ],
 st=[
  ("Default", "Recipient summary, project selector with the first active project pre-selected, services, note, and the side blocks, as in the mockup.", "Page opens"),
  ("Empty (no data)", "The member has no active project: the form is replaced by *A request is tied to a project. Create a project first.* with a button to create one (`SC-11`).", "0 active projects"),
  ("Loading", "*Send request* shows *Sending…* and the form is locked; project summary shows a grey placeholder while the selected project loads.", "Sending / switching project"),
  ("Error", "Duplicate: *You already have an open request with this partner for The Last Ferry* + *View request* link (`SC-25`). Note over 1000 characters: counter turns red, send disabled. Write failure: *Couldn't send — nothing was sent, try again*.", "Duplicate / validation / write error"),
  ("Success / confirmation", "Redirect to the new request on `SC-25` at step 1 *Sent* with the toast *Request sent to Hạ Long Marine Logistics*; the partner gets an in-app notification and an email.", "Request created"),
 ],
 ix=[
  ("Project selector", "tap", "Lists the member's active projects; changes the project summary", "stays"),
  ("Service group chip", "tap", "Selects / deselects", "stays"),
  ("*Send request* button", "tap", "Creates the request (`status = pending`), notifies the partner in-app and by email", "SC-25"),
  ("*View request* in the duplicate error", "tap", "Opens the open request", "SC-25"),
  ("*Cancel* / organisation name in breadcrumb", "tap", "—", "SC-20"),
  ("Service group in breadcrumb", "tap", "—", "SC-19"),
  ("*Create a project* (empty state)", "tap", "—", "SC-11"),
 ],
 sr=[
  ("Every request is tied to exactly one project of the member; guests are sent to `SC-04` first.", "M4 FR-012"),
  ("Only one open request per project and partner: a second one is refused with *You already have an open request with this partner*.", "M4 §3 Edge cases"),
  ("Archived projects cannot send requests; they are read-only.", "M0 BR-005"),
  ("Sending shares nothing confidential; the accepted layer and project documents open only after acceptance and the NDA (`SC-25`).", "M4 BR-001"),
  ("A confirmed request with a non-eligible organisation does not complete Article 13 component c; the notice says so up front.", "M4 BR-006"),
  ("Deactivated organisations cannot receive requests; the profile shows *No longer active* instead of this form.", "M4 BR-008"),
 ],
 fr=[("F-M4-12", "Create the collaboration request with project, services and note"), ("F-M4-15", "Notify the partner in-app and by email on sending")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the side column moves below the form; *Send request* sticks to the bottom of the screen.", "The note counter is announced with `aria-live=\"polite\"` when the limit is near.", "Service chips are real checkboxes with labels."],
 oq=[("[NEEDS CLARIFICATION: After how many days does an unanswered request expire?]", False, "Client (VFDA)", 5)],
), html)

# =====================================================================  35 · SC-36
def qrow(org, sub, status, cls, when, on=False, n=False):
    a = ' data-n="5"' if n else ""
    style = "border:2px solid #0d366b;padding:9px 11px" if on else "padding:10px 12px"
    return (f'<div class="card"{a} style="{style}"><div class="row" style="justify-content:space-between;align-items:center">'
            f'<b class="small">{org}</b><span class="pill {cls}">{status}</span></div><div class="small muted" style="margin-top:3px">{sub} · {when}</div></div>')

main36 = f"""
<div class="row" style="justify-content:space-between;align-items:flex-end" data-n="3"><div><h1>Verification queue</h1><div class="sub">Partner applications for the VFDA Verified badge</div></div><div class="small muted">1 pending · oldest waiting 6 days</div></div>
<div class="row" style="gap:8px;margin-top:12px" data-n="4"><span class="chip on">All · 8</span><span class="chip">Pending · 1</span><span class="chip">Approved · 6</span><span class="chip">Rejected · 1</span></div>
<div class="row" style="gap:18px;margin-top:14px;align-items:flex-start">
  <div style="width:260px;flex:none" class="col" >
    {qrow("Mekong Frame Co.", "Cần Thơ", "Pending", "p-warn", "24/09/2026", on=True, n=True)}
    {qrow("Hội An Casting House", "Đà Nẵng", "Rejected", "p-bad", "15/09/2026")}
    {qrow("Bến Xưa Production Services", "Hà Nội", "Approved", "p-ok", "12/06/2026")}
    {qrow("Hạ Long Marine Logistics", "Quảng Ninh", "Approved", "p-ok", "02/04/2026")}
    {qrow("Đò Ngang Film Services", "Huế", "Approved", "p-ok", "20/03/2026")}
  </div>
  <div style="flex:1" class="col">
    <div class="card" data-n="6"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">Mekong Frame Co.</h2><span class="pill p-warn">Pending since 24/09/2026</span></div>
      <div class="small" style="margin-top:4px">Công ty TNHH · founded 2019 · head office Cần Thơ · provinces Cần Thơ, Thành phố Hồ Chí Minh<br>Full production services · Transport and logistics · submitted by Huỳnh Minh Tuấn</div></div>
    <div class="g2">
      <div class="card" data-n="7"><h3>Business registration</h3><div class="row" style="gap:10px;align-items:center"><span class="pill p-bad">PDF</span><div class="small" style="flex:1">business-registration.pdf<div class="muted">2.4 MB</div></div><span class="btn g sm">Open</span></div></div>
      <div class="card" data-n="8"><h3>Reference projects · 2</h3><div class="small col" style="gap:3px"><div>1 · Mangrove Song (VN, 2025)</div><div>2 · Floating Market (KR, 2026)</div></div></div>
    </div>
    <div class="card soft" data-n="9"><h3>Review guide</h3><div class="small col" style="gap:5px">
      <div class="row" style="gap:8px">{tick(True)} Business registration matches the organisation name and legal form</div>
      <div class="row" style="gap:8px">{tick(True)} Legal representative identified</div>
      <div class="row" style="gap:8px">{tick(False)} Both reference projects contacted and confirmed</div>
      <div class="muted">Guide only — not stored. Written criteria are pending VFDA approval.</div></div></div>
    <div class="card" data-n="10" style="display:flex;gap:10px;align-items:flex-start"><span style="width:34px;height:20px;border-radius:10px;background:#c5cad1;flex:none;position:relative;margin-top:1px"><span style="position:absolute;left:2px;top:2px;width:16px;height:16px;border-radius:8px;background:#fff"></span></span><div class="small"><b>Eligible to sign service agreements (Article 13)</b><div class="muted">Off. Switch on only when the organisation meets the Article 13 criteria; shown on its public profile.</div></div></div>
    <div class="row" style="gap:14px;align-items:stretch">
      <div class="card" data-n="11" style="flex:1"><span class="btn" style="width:100%">Approve — VFDA Verified</span><div class="small muted" style="margin-top:6px">Badge valid 30/09/2026 → <b>30/09/2027</b> (12 months). Reminder to the partner 30 days before.</div></div>
      <div class="card" data-n="12" style="flex:1.3"><div class="lab">Reason for rejection <span class="opt">(required to reject — sent to the partner)</span></div><div class="field" style="min-height:44px;color:#8a9099">e.g. The registration shows a different legal name…</div><span class="btn q sm" style="margin-top:8px;color:#a52a1f;border-color:#eab9b3">Reject</span></div>
    </div>
    <div class="small muted" data-n="13">Your decision is written to the audit log with your name, the time, and the reason — audit records cannot be edited or deleted.</div>
  </div>
</div>"""
html = page("SC-36", "Admin — Verification queue", "M4 · VFDA staff · Added 30/09/2026", "/admin/verification", admin("Verification", main36), nav_n=None)

add(dict(
 seq=35, sid="SC-36", name="Admin — Verification queue", group="M4", tier="Added 30/09/2026 — Must",
 module="M4", actor="VFDA Staff", prio="Must", route="/admin/verification",
 design_note="Review organisation verification.",
 new_note="New Screen Spec written on 30/09/2026; SC-36 was listed in the Screen List as a Must screen still without a mockup.",
 shown="VFDA staff open *Verification* in the admin menu, or a *new verification request* email / in-app notification.",
 leave="Staff approve or reject the selected request and move to the next one, or switch to another admin section.",
 el=[
  (1, "Admin header", "Header", "static; signed-in staff name and role `vfda_staff`", "—", "—"),
  (2, "Admin menu", "List", "static; *Verification* selected", "—", "—"),
  (3, "Title + queue summary", "Header + Text", "count of `pending` requests and age of the oldest", "—", "—"),
  (4, "Status filter", "Toggle (chips)", "`status_filter` — ENUM(pending, approved, rejected) or All, with counts", "No", "enum values only"),
  (5, "Request list", "List", "`queue` — `verification_request[]`: organisation, head office, `status`, date", "—", "pending first, then newest decision first"),
  (6, "Organisation header of the selected request", "Text", "`org_name`, `legal_form`, `founded_year`, `hq_province`, `provinces`, `service_groups`, submitting user", "Yes", "—"),
  (7, "Business registration document", "Text + Button", "`business_license` (private storage)", "Yes", "opens in a new tab for staff only"),
  (8, "Reference projects", "List", "`reference_projects`", "Yes", "—"),
  (9, "Review guide", "List (checkboxes)", "static guide; ticks are not stored", "—", "—"),
  (10, "*Eligible to sign service agreements (Article 13)* switch", "Toggle", "`art13_eligible`", "No", "only `vfda_staff` / `admin` can change it"),
  (11, "*Approve* button + validity preview", "Button + Text", "`decision = approved` → `verified`, `verified_at`, `verified_until` = `verified_at` + 12 months", "—", "only for `pending` requests"),
  (12, "Rejection reason + *Reject* button", "Input (text area) + Button", "`reason` with `decision = rejected`", "Yes (to reject)", "Reject disabled while the reason is empty"),
  (13, "Audit log note", "Text", "static; audit record per decision (`action`, `admin_id`, `target_id`, `logged_at`)", "—", "—"),
 ],
 st=[
  ("Default", "Queue on the left with the oldest pending request selected; its documents, references, review guide, Article 13 switch and the two decision panels on the right, as in the mockup.", "Page opens"),
  ("Empty (no data)", "No pending requests: *Nothing waiting for review.* The detail area is replaced by a short list of badges expiring in the next 30 days.", "0 pending with filter *Pending*"),
  ("Loading", "Grey placeholders in the list and detail; after a click on *Approve* / *Reject* both buttons are disabled until the save ends.", "Loading / deciding"),
  ("Error", "Reject with an empty reason: *A reason is required to reject* under the field. Save failure: *Decision not saved — nothing was changed and no audit record was written*. Request already decided by a colleague: *Lê Hoàng Phúc decided this request at 10:42* and the panel reloads read-only.", "Validation / write error / concurrent decision"),
  ("Success / confirmation", "Green strip *Mekong Frame Co. is VFDA Verified until 30/09/2027 — the partner has been notified*, or *Rejected — the reason was sent to the partner*; the request moves to Approved / Rejected and the next pending request opens.", "Decision saved"),
 ],
 ix=[
  ("Status filter chip", "tap", "Re-filters the list", "stays"),
  ("Request in the list", "tap", "Opens that request's detail; decided requests are read-only with decider, date and reason", "stays"),
  ("*Open* business registration", "tap", "Opens the PDF in a new tab", "stays"),
  ("*Approve* button", "tap", "Confirmation; sets `verified_at`, `verified_until` (+12 months), notifies the partner, writes the audit record", "stays"),
  ("*Reject* button", "tap", "Saves the reason, notifies the partner, writes the audit record", "stays"),
  ("Organisation name in the header", "tap", "Opens the public profile in a new tab", "SC-20"),
  ("*Moderation* in the admin menu", "tap", "Opens the moderation queue", "SC-38"),
 ],
 sr=[
  ("Only `vfda_staff` and `admin` can open this screen and decide; the list shows every organisation's requests.", "M4 FR-009"),
  ("Rejecting requires a written reason, which is sent to the partner; who decided and when is recorded.", "M4 FR-010"),
  ("An approved badge is valid 12 months from the decision; the badge states what was checked and what was not.", "M4 BR-004"),
  ("Every decision and every change of the Article 13 switch writes one audit record in the same transaction; audit records cannot be edited or deleted.", "M10 BR-005"),
  ("The review guide ticks are a working aid, not stored evidence, until VFDA's written criteria exist.", "M4 §10 #2"),
 ],
 fr=[("F-M4-09", "Queue of verification requests filterable by status"), ("F-M4-10", "Approve or reject with a mandatory reason, recording who and when"),
     ("F-M4-11", "Sets the 12-month validity that drives the reminder and expiry"), ("F-M10-08", "Audit record for every decision")],
 resp=["Minimum supported width: **360px**.", "Admin screens are designed for desktop; below 1024px the admin menu becomes a drop-down and the list and detail stack (list first).", "The Article 13 switch is a real `switch` role with its label; decision buttons have distinct text, not only colour.", "Focus moves to the next request's heading after a decision."],
 oq=[("[NEEDS CLARIFICATION: Written criteria for awarding VFDA Verified.]", True, "Client (VFDA)", 2),
     ("[NEEDS CLARIFICATION: Criteria for the *eligible to sign a service agreement under Article 13* flag.]", True, "Client (VFDA)", 3)],
), html)

# =====================================================================  36 · SC-33
TOPICS = [("dossier", "Article 13 dossier"), ("locations", "Locations"), ("partners", "Vietnamese partners"),
          ("provincial_notice", "Provincial notice"), ("general", "General question")]
DAYS = [("Mon", "12/10"), ("Tue", "13/10"), ("Wed", "14/10"), ("Thu", "15/10"), ("Fri", "16/10")]
HANOI = ["09:00", "10:00", "11:00", "14:00", "15:00"]
TAKEN = {(0, 1), (1, 3), (2, 0), (2, 4), (4, 2)}


def slot_cell(d, h):
    hn = HANOI[h]
    seoul = f"{int(hn[:2]) + 2:02d}:00"
    if (d, h) == (3, 1):
        return (f'<div data-n="7" style="border:1px solid #0d366b;background:#0d366b;color:#fff;border-radius:6px;padding:5px 0;text-align:center">'
                f'<b>{seoul}</b><div style="font-size:11px;color:#cfd9e8">{hn} Hanoi</div></div>')
    if (d, h) in TAKEN:
        return ('<div style="border:1px dashed #d5d9de;border-radius:6px;padding:5px 0;text-align:center;color:#a0a6ae">'
                f'<s>{seoul}</s><div style="font-size:11px">taken</div></div>')
    return (f'<div style="border:1px solid #c5cad1;border-radius:6px;padding:5px 0;text-align:center"><b>{seoul}</b>'
            f'<div style="font-size:11px;color:#8a9099">{hn} Hanoi</div></div>')


grid = "".join(f'<div class="col" style="gap:6px"><div class="small" style="text-align:center"><b>{dn}</b> {dd}</div>'
               + "".join(slot_cell(i, h) for h in range(len(HANOI))) + "</div>" for i, (dn, dd) in enumerate(DAYS))
topics = "".join(f'<span class="chip {"on" if c == "dossier" else ""}">{"● " if c == "dossier" else ""}{l}</span>' for c, l in TOPICS)

html = page("SC-33", "Book a VFDA consultation", "M7 · Member · Added 30/09/2026", "/consult", f"""
<div data-n="2"><h1>Book a consultation with VFDA</h1><div class="sub">Talk to a VFDA officer about what the tools can't answer. Times are shown in your own time zone.</div></div>
<div class="row" style="gap:20px;margin-top:16px;align-items:flex-start">
  <div style="flex:1.6" class="col">
    <div data-n="3"><div class="lab">Topic</div><div class="row" style="gap:6px;flex-wrap:wrap">{topics}</div></div>
    <div class="row" style="gap:14px;align-items:flex-end">
      <div data-n="4" style="width:360px"><div class="lab">Your time zone</div><div class="field">Asia/Seoul (UTC+9) ▾</div><div class="hint">Detected from your browser · VFDA works in Asia/Ho_Chi_Minh (UTC+7), 2 hours behind you.</div></div>
      <div data-n="5" class="row" style="gap:8px;align-items:center;margin-left:auto;margin-bottom:22px"><span class="btn q sm">‹</span><b class="small">12 – 16 October 2026</b><span class="btn q sm">›</span></div>
    </div>
    <div class="card" data-n="6"><div class="g5" style="gap:10px">{grid}</div>
      <div class="small muted" style="margin-top:10px">Bold = your time (Seoul) · grey = VFDA office time (Hanoi). Taken slots cannot be chosen.</div></div>
  </div>
  <div style="flex:1" class="col">
    <div class="card hl" data-n="8"><h3>Your request</h3>
      <table class="t" style="font-size:13px">
        <tr><td style="padding:6px 4px;color:#5b626c">Topic</td><td style="padding:6px 4px"><b>Article 13 dossier</b></td></tr>
        <tr><td style="padding:6px 4px;color:#5b626c">Your time</td><td style="padding:6px 4px"><b>Thu 15/10/2026 · 12:00</b> Seoul</td></tr>
        <tr><td style="padding:6px 4px;color:#5b626c">VFDA time</td><td style="padding:6px 4px">Thu 15/10/2026 · 10:00 Hanoi</td></tr>
        <tr><td style="padding:6px 4px;color:#5b626c">Officer</td><td style="padding:6px 4px">Assigned by VFDA on confirmation</td></tr>
      </table>
      <div class="small muted" style="margin-top:8px">VFDA confirms or proposes another time. You and the officer both get a reminder 24 hours before, each in your own time zone.</div></div>
    <span class="btn" data-n="9" style="height:42px">Request this slot</span>
    <div class="card" data-n="10"><h3>Your bookings</h3>
      <div class="row small" style="justify-content:space-between;align-items:center"><div><b>Tue 06/10 · 10:00 Seoul</b> (08:00 Hanoi)<div class="muted">Article 13 dossier · with Lê Hoàng Phúc</div></div><span class="pill p-ok">Confirmed</span></div></div>
  </div>
</div>
""", active=None)

add(dict(
 seq=36, sid="SC-33", name="Book a VFDA consultation", group="M7", tier="Added 30/09/2026 — Should",
 module="M7", actor="Member", prio="Should", route="/consult",
 design_note="Topic and time slot.",
 new_note="New Screen Spec written on 30/09/2026; SC-33 had no spec or mockup in the first set of 20.",
 shown="A signed-in member clicks *Contact VFDA* in the footer, *Contact VFDA for an invitation* on `SC-04`, or an *Ask VFDA* link on a project screen; guests are sent to `SC-04` first.",
 leave="The member requests a slot and stays on the page with the booking listed under *Your bookings*, or leaves through the navigation bar.",
 el=[
  (1, "Navigation bar", "Header", "static", "—", "—"),
  (2, "Title + purpose", "Header + Text", "static", "—", "—"),
  (3, "Topic", "Toggle (single-select chips)", "`topic` — ENUM(dossier, locations, partners, provincial_notice, general)", "Yes", "exactly one value of the enum"),
  (4, "Time zone", "Toggle (dropdown)", "`timezone` — IANA name, VARCHAR(40); default from the browser", "Yes", "must be a valid IANA time zone"),
  (5, "Week navigation", "Button", "static", "—", "past weeks disabled"),
  (6, "Slot grid", "List (calendar)", "offered slots for the week, each shown in the member's time zone with the Hanoi time below; taken slots greyed", "—", "past and taken slots cannot be chosen"),
  (7, "Selected slot", "Toggle", "`slot_start` — TIMESTAMPTZ stored in UTC", "Yes", "one slot; must still be free when sent"),
  (8, "*Your request* summary", "Text", "topic, time in `timezone`, time in Asia/Ho_Chi_Minh, officer (`officer_id`, empty until confirmed)", "—", "—"),
  (9, "*Request this slot* button", "Button", "creates the booking; returns `booking_id`", "—", "disabled until 3, 4 and 7 are set"),
  (10, "*Your bookings* list", "List", "the member's bookings: `slot_start` in `timezone`, `topic`, officer, `booking_status` — confirmed / rescheduled / waiting", "—", "upcoming first"),
 ],
 st=[
  ("Default", "Topic chips, time zone, week grid with the next available week, summary and *Your bookings*, as in the mockup.", "Page opens"),
  ("Empty (no data)", "No free slot in the shown week: *No free times this week* with *Next week ›*. No bookings yet: *Your bookings* shows *None yet*.", "0 free slots / 0 bookings"),
  ("Loading", "Grey placeholders in the grid while a week loads; *Request this slot* shows *Sending…* and is disabled.", "Week change / sending"),
  ("Error", "Slot taken meanwhile: *That time was just booked — pick another*; the grid refreshes. Unknown time zone: error under the field. Write failure: *Couldn't send — nothing was booked, try again*.", "Conflict / validation / write error"),
  ("Success / confirmation", "Banner *Request sent — VFDA will confirm and assign an officer*; the booking appears under *Your bookings* as *Waiting for VFDA*. When VFDA confirms or reschedules, an in-app notification and email show the time in both time zones.", "Booking created / VFDA response"),
 ],
 ix=[
  ("Topic chip", "tap", "Selects the topic", "stays"),
  ("Time zone dropdown", "tap", "Changes the zone; the grid and summary re-render in the new zone", "stays"),
  ("‹ / › week buttons", "tap", "Loads the previous / next week", "stays"),
  ("Free slot", "tap", "Selects it and fills the summary", "stays"),
  ("*Request this slot*", "tap", "Creates the booking, notifies VFDA staff", "stays"),
  ("*Log in* (guest redirect)", "tap", "—", "SC-04"),
 ],
 sr=[
  ("`slot_start` is stored in UTC with the member's IANA `timezone`; every time on screen and in messages is shown in the reader's own zone, with Hanoi time alongside for the member.", "M7 FR-005"),
  ("A booking is a request until VFDA staff confirm or reschedule it and assign an officer; the member sees the status.", "M7 FR-006"),
  ("Both sides get a reminder 24 hours before the consultation.", "M7 FR-007"),
  ("The topic is one of five fixed values so VFDA can route and count requests.", "M7 §5.1 FR-005"),
  ("Only signed-in members can book; a deactivated account has no access and cannot book.", "SYS BR-005"),
 ],
 fr=[("F-M7-05", "Book by topic and slot with time-zone handling"), ("F-M7-06", "Show VFDA's confirmation / rescheduling and the assigned officer"),
     ("F-M7-07", "Explain and trigger the 24-hour reminders")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the week grid becomes one day at a time with day tabs; the summary and button stick to the bottom.", "Each slot is a button whose accessible name includes both times (e.g. *Thursday 15 October, 12:00 Seoul, 10:00 Hanoi*).", "Taken slots are disabled buttons with the word *taken*, not only a strike-through."],
 oq=[("[NEEDS CLARIFICATION: Which days and hours does VFDA offer for consultations, and how long is one slot?]", True, "Client (VFDA)"),
     ("[NEEDS CLARIFICATION: How is the consultation held (video call, phone, at the VFDA office) and who sends the joining details?]", False, "Client (VFDA)")],
), html)
