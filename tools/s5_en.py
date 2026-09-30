# -*- coding: utf-8 -*-
"""Screens 27–31 (added 30/09/2026): SC-13 Project settings, SC-30 Requirements library,
SC-31 Requirement detail, SC-37 Admin — Legal rule base, SC-35 Admin — Locations."""
from base import page

SCREENS = []

TIER_MUST = "Added 30/09/2026 — Must"
TIER_SHOULD = "Added 30/09/2026 — Should"


def add(spec, html):
    SCREENS.append((spec, html))


def nb(k):
    return f' data-n="{k}"' if k else ""


ADMIN_MENU = ["Overview", "Locations", "Verification", "Legal rules", "Moderation",
              "Demand index", "Reports", "Audit log"]


def admin_page(sid, title, meta, route, menu_active, body, user, initials, role, menu_n=2):
    """Admin layout: standard top nav (signed in as a VFDA user) + left admin menu inside content."""
    links = "".join(f'<a class="{"on" if m == menu_active else ""}">{m}</a>' for m in ADMIN_MENU)
    menu = (f'<div class="side" data-n="{menu_n}" style="width:196px">'
            f'<div class="pj">VFDA back office</div><div class="pn" style="font-size:13.5px">{role}</div>{links}</div>')
    content = (f'<div class="row" style="gap:0;margin:-26px -34px -32px;align-items:stretch">{menu}'
               f'<div style="flex:1;padding:22px 26px 28px;min-width:0">{body}</div></div>')
    html = page(sid, title, meta, route, content, active=None)
    return html.replace('<span class="avatar">LP</span>Lena Park',
                        f'<span class="avatar">{initials}</span>{user}')


# =====================================================================  27 · SC-13
def mrow(ini, name, email, perm, pcls, status, scls, first=False):
    n = (lambda x: f' data-n="{x}"') if first else (lambda x: "")
    return f"""<tr><td{n(17)}><div class="row" style="gap:8px;align-items:center"><span class="avatar" style="width:26px;height:26px;font-size:11px">{ini}</span>
<div><div>{name}</div><div class="small muted">{email}</div></div></div></td>
<td><span class="pill {pcls}"{n(18)}>{perm}</span></td><td><span class="pill {scls}"{n(19)}>{status}</span></td></tr>"""


html = page("SC-13", "Project settings", "M0 · Member · Added 30/09/2026", "/projects/the-last-ferry/settings", f"""
<div data-n="3"><h1>Project settings</h1><div class="sub">The Last Ferry · Harbour Line Films · you are the <b>owner</b> of this project</div></div>
<div class="row" style="gap:20px;margin-top:16px;align-items:flex-start">
  <div style="flex:1.08" class="col">
    <div class="card" data-n="4">
      <h2>Project details</h2>
      <div class="col" style="gap:11px">
        <div data-n="5"><div class="lab">Project name</div><div class="field">The Last Ferry</div></div>
        <div class="g2">
          <div data-n="6"><div class="lab">Format</div><div class="field" style="background:#f6f8fa;color:#5b626c">Feature film</div><div class="hint">Set when the project was created</div></div>
          <div data-n="7"><div class="lab">First shooting day in Vietnam</div><div class="field">15/03/2027</div><div class="hint">166 days from today · drives the countdown</div></div>
        </div>
        <div data-n="8"><div class="lab">Logline <span class="opt">(optional)</span></div><div class="field" style="min-height:54px">In 1972 an old ferryman carries villagers between the limestone karsts of Ninh Bình; decades later his granddaughter returns from Seoul.</div><div class="hint">127 / 500 characters</div></div>
        <div class="row" style="justify-content:space-between;align-items:center">
          <div data-n="9"><span class="lab" style="margin:0">Stage</span> &nbsp;<span class="pill p-info">Preparing</span></div>
          <div class="row" style="gap:10px;align-items:center" data-n="10"><span class="small muted">Last saved 22/09/2026 17:30</span><span class="btn">Save changes</span></div>
        </div>
      </div>
    </div>
    <div class="card" data-n="11">
      <div class="row" style="justify-content:space-between;align-items:baseline"><h2>Segment</h2><span class="lnk small" data-n="15">Not sure? Redo the 4 questions</span></div>
      <div class="small muted" style="margin-bottom:8px">The segment decides which gauges, documents and deadlines apply to this project.</div>
      <div class="col" style="gap:7px" data-n="12">
        <div class="card hl" style="padding:9px 12px"><b>◉ A</b> · Shoot in Vietnam, release abroad <span class="pill p-mute" style="margin-left:6px">current</span></div>
        <div class="card" style="padding:9px 12px">○ <b>B</b> · Shoot in Vietnam, release in Vietnam</div>
        <div class="card" style="padding:9px 12px">○ <b>C</b> · Hire Vietnamese services only, no shooting in Vietnam</div>
      </div>
      <div class="banner b-info small" style="margin-top:10px" data-n="13">Changing segment <b>never deletes</b> what you have entered. Documents, answers and requests that no longer apply are hidden, and come back if you change back.</div>
      <div style="margin-top:10px;text-align:right"><span class="btn g dis" data-n="14" style="color:#fff">Change segment</span></div>
    </div>
  </div>
  <div style="flex:1" class="col">
    <div class="card" data-n="16" style="padding:14px 16px 10px">
      <div class="row" style="justify-content:space-between;align-items:baseline"><h2>Members and invitations</h2><span class="small muted">4 people</span></div>
      <table class="t">
        <tr><th>Person</th><th>Permission</th><th>Status</th></tr>
        <tr><td><div class="row" style="gap:8px;align-items:center"><span class="avatar" style="width:26px;height:26px;font-size:11px">LP</span><div><div>Lena Park <span class="small muted">(you)</span></div><div class="small muted">lena.park@harbourline.example.kr</div></div></div></td><td><span class="pill p-info">Owner</span></td><td><span class="pill p-ok">Accepted</span></td></tr>
        {mrow("MP", "Park Min-jun", "minjun.park@harbourline.example.kr", "Edit", "p-info", "Accepted", "p-ok", True)}
        {mrow("JH", "Han Ji-woo", "jiwoo.han@harbourline.example.kr", "Edit", "p-info", "Accepted", "p-ok")}
        {mrow("SK", "<span class='muted'>Invited 27/09/2026</span>", "seo.yeon.kim@harbourline.example.kr", "View", "p-mute", "Pending", "p-warn")}
      </table>
      <div class="lab" style="margin-top:12px">Invite someone <span class="opt">(owner only)</span></div>
      <div class="row" style="gap:8px;align-items:flex-start">
        <div style="flex:1" data-n="20"><div class="field" style="color:#8a9099">name@company.example.kr</div></div>
        <div style="width:112px" data-n="21"><div class="field">Edit ▾</div></div>
        <span class="btn" data-n="22">Send invitation</span>
      </div>
      <div class="hint">View = read only · Edit = can change the project, its documents and settings.</div>
    </div>
    <div class="card" data-n="23" style="border-color:#eab9b3">
      <h2>Archive project</h2>
      <div class="small" style="margin-bottom:10px">An archived project becomes <b>read-only</b> for every member and leaves your project list. Nothing is deleted: documents, partner requests and provincial notices are kept. Projects cannot be deleted.</div>
      <div style="text-align:right"><span class="btn q" data-n="24" style="color:#a52a1f;border-color:#eab9b3;font-weight:700">Archive project…</span></div>
    </div>
  </div>
</div>
""", active="My projects", sidebar="Settings", side_n=2)

add(dict(
 seq=27, sid="SC-13", name="Project settings", group="M0", tier=TIER_MUST,
 module="M0", actor="Member (edit permission; invitations by the owner only)", prio="Must",
 route="/projects/[id]/settings",
 design_note="Change segment, invite members.",
 new_note="**Screen Spec added 30/09/2026.** `SC-13` was in Screen List v2.0 but had no mockup; it now reflects M0 BR-005 (archive, never delete) and M1 BR-004 (a segment change never deletes data).",
 shown="A project member clicks *Settings* in the project sidebar on any project screen (for example `SC-12` or `SC-26`).",
 leave="The member goes back to another project screen through the sidebar (for example `SC-12`), redoes the segment questions on `SC-02`, or archives the project and lands on `SC-10`.",
 el=[
  (1, "Navigation bar", "Header", "static; *My projects* selected", "—", "—"),
  (2, "Project sidebar", "List", "static; *Settings* selected", "—", "—"),
  (3, "Title + project and the viewer's role", "Header", "`project_name`, the viewer's `permission` (owner / edit / view)", "—", "—"),
  (4, "*Project details* card", "Container", "static", "—", "read-only for members with *view* permission and for archived projects"),
  (5, "Project name", "Input", "`project_name`", "Yes", "1–200 characters"),
  (6, "Format", "Text (read-only)", "`format` — Feature film / Documentary / Commercial / TV programme / Music video", "—", "not editable here: F-M0-02 does not list `format` as an input"),
  (7, "First shooting day in Vietnam", "Input (date)", "`shoot_date`; days remaining computed on screen for display only", "No", "must be after today"),
  (8, "Logline", "Input (multi-line)", "`logline`", "No", "max 500 characters; live counter"),
  (9, "Stage", "Text", "`stage` — draft / preparing / archived", "—", "changed to *archived* only through row 24"),
  (10, "*Save changes* button + last saved time", "Button + Text", "`updated_at`", "—", "disabled until a field changes; enabled only for *edit* permission"),
  (11, "*Segment* card", "Container", "static", "—", "—"),
  (12, "Segment choice A / B / C", "Toggle (single choice)", "current `segment`; selection becomes `new_segment`", "Yes", "enum A / B / C; the current value is pre-selected"),
  (13, "*Nothing is deleted* note", "Text", "static; reflects `data_retained` (always true)", "—", "—"),
  (14, "*Change segment* button", "Button", "static", "—", "disabled until a segment other than the current one is selected; opens a confirmation dialog"),
  (15, "*Redo the 4 questions* link", "Link", "static", "—", "—"),
  (16, "*Members and invitations* card", "Container", "project members of this project", "—", "—"),
  (17, "Member row", "List", "member name and `invitee_email`", "—", "only members of this project (Row Level Security)"),
  (18, "Permission", "Text", "`permission` — view / edit; the creator is shown as *Owner*", "—", "enum"),
  (19, "Invitation status", "Text", "`invite_status` — pending / accepted", "—", "enum"),
  (20, "Invitee email", "Input (email)", "`invitee_email`", "Yes", "valid email, max 254 characters; not already a member or pending invitee of this project"),
  (21, "Invitee permission", "Toggle (dropdown)", "`permission` — View / Edit", "Yes", "enum; default *Edit*"),
  (22, "*Send invitation* button", "Button", "static", "—", "shown to the owner only (F-M0-04); disabled until rows 20–21 are valid"),
  (23, "*Archive project* card", "Container", "static text explaining read-only archive", "—", "hidden when the project is already archived"),
  (24, "*Archive project…* button", "Button", "sets `stage` = archived after confirmation", "—", "*edit* permission only; confirmation dialog repeats that nothing is deleted"),
 ],
 st=[
  ("Default", "Details, segment and members for the project; the owner also sees the invite row. The mockup shows the owner's view.", "Open `/projects/[id]/settings`"),
  ("Empty (no data)", "The owner is the only member: the members table shows one row and the line *Only you are on this project — invite your line producer or co-producer.*", "No other members or invitations"),
  ("Loading", "Grey skeletons in the three cards; buttons disabled until the project has loaded.", "Loading the project"),
  ("Error", "Invalid first shooting day: message under the field *Must be after today*. Save fails: red strip *Couldn't save — your changes are kept*. Email already invited: message under the email field. Segment change fails: the current segment stays selected and a red strip explains the change was not applied.", "Validation / database write error"),
  ("Success / confirmation", "Save: green strip *Project details saved*. Invitation: new row with status *Pending* and strip *Invitation sent to …*. Segment change: strip *Segment changed to B — 3 items no longer apply and are hidden, nothing was deleted*. Archive: goes to `SC-10` with strip *The Last Ferry archived — find it under Archived*.", "Save / invite / change segment / archive succeeded"),
 ],
 ix=[
  ("Project sidebar item", "tap", "Opens that project screen", "SC-12"),
  ("*Save changes* button", "tap", "Updates the project details and `updated_at`; if another member saved in between, last write wins and a toast names who", "stays"),
  ("Segment option", "tap", "Selects `new_segment`; enables *Change segment*", "stays"),
  ("*Change segment* button", "tap", "Confirmation dialog listing what will be hidden (not deleted); on confirm sets the segment and returns the new `journey_config`", "stays"),
  ("*Redo the 4 questions* link", "tap", "Opens the router with this project as context", "SC-02"),
  ("*Send invitation* button", "tap", "Creates a member row with `invite_status` = pending and sends the invitation email", "stays"),
  ("*Archive project…* button", "tap", "Confirmation dialog; on confirm sets `stage` = archived and closes the project for editing", "SC-10"),
 ],
 sr=[
  ("Only members with **edit** permission can change details, segment or stage; members with **view** permission see this screen read-only.", "M0 FR-002 (F-M0-02)"),
  ("Only the **owner** can invite people, with *view* or *edit* permission.", "M0 FR-004 (F-M0-04)"),
  ("A segment change **never deletes** documents or answers: items that no longer apply are hidden, not removed, and reappear if the segment is changed back.", "M1 BR-004"),
  ("After a segment change the gauges and weights are read again from `segment_requirements`; this screen never computes scores.", "M0 BR-001, M0 BR-004"),
  ("Projects are **archived, never deleted**. An archived project (`stage = archived`) is read-only for its members, leaves the project list and keeps its documents, requests and notices. There is no *Delete project* action.", "M0 BR-005"),
 ],
 fr=[("F-M0-02", "Edit project details, including the first shooting day and the stage (archive)"),
     ("F-M0-04", "Invite people by email with view or edit permission"),
     ("F-M1-03", "Change the project's segment without deleting data")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the project sidebar collapses into a menu button; the two columns stack (details, segment, members, archive).",
       "The members table becomes a list of cards (name, email, permission, status).",
       "The segment choice is a radio group with a visible label; the archive and segment confirmations are `dialog`s with a focus trap, closed with Esc.",
       "Permission and status labels always include text, not only colour."],
 oq=[("[NEEDS CLARIFICATION: Can people outside the producer organisation (a lawyer, a freelance line producer) be invited to a project?]", False, "Client (VFDA)", 3),
     ("[NEEDS CLARIFICATION: can the owner change a member's permission, remove a member or cancel a pending invitation? F-M0-04 only covers inviting]", False, "Group C"),
     ("[NEEDS CLARIFICATION: can an archived project be restored to *preparing*, and by whom?]", False, "Client (VFDA)")],
), html)


# =====================================================================  28 · SC-30
TOPICS = [("security", "National security &amp; defence", 2), ("history", "History", 1),
          ("religion", "Religion &amp; beliefs", 1), ("privacy", "Real persons &amp; privacy", 1),
          ("dossier", "Dossier (Article 13)", 1), ("public_order", "Public order &amp; ethics", 0),
          ("heritage", "Heritage sites", 0)]
SEV = {"notice": ("Needs attention", "p-warn"), "action": ("Action required", "p-bad")}


def rcard(code, title, topic, sev, cit, ver, summary, first=False):
    n = (lambda x: f' data-n="{x}"') if first else (lambda x: "")
    lab, cls = SEV[sev]
    return f"""<div class="card">
<div class="row" style="justify-content:space-between;gap:30px"><b{n(7)}>{title}</b><span class="pill {cls}"{n(9)}>{lab}</span></div>
<div class="small" style="margin:4px 0 6px"{n(8)}><span class="kbd">{code}</span> · <span class="muted">{topic}</span></div>
<div class="small" style="color:#3b424c">{summary}</div>
<div class="row small" style="justify-content:space-between;margin-top:8px;align-items:center"><span class="muted"{n(10)}>Citation: {cit}</span></div>
<div class="row small" style="justify-content:space-between;margin-top:2px;align-items:center"><span class="muted"{n(11)}>Rule version {ver}</span><span class="lnk small"{n(12)}>Read the rule →</span></div>
</div>"""


topic_list = "".join(
    f'<div class="row" style="justify-content:space-between;padding:6px 10px;border-radius:6px;{"color:#8a9099;" if c == 0 else ""}">'
    f'<span>{t}</span><span class="small muted">{c}</span></div>' for _, t, c in TOPICS)

html = page("SC-30", "Requirements library", "M2 · Guest · Added 30/09/2026", "/requirements", f"""
<div class="row" style="justify-content:space-between;align-items:flex-start">
  <div><h1 data-n="2">Requirements library</h1>
  <div class="sub" data-n="3">Content and dossier rules written and signed by the <b>VFDA Legal Board</b> · rule set <span class="kbd">2026.08</span> · 6 rules in force</div></div>
  <div class="card soft" data-n="13" style="width:330px;padding:11px 14px"><div class="small">Want to know which of these rules your story touches?</div><span class="btn sm" style="margin-top:7px">Check a 200-word summary — free, no sign-up</span></div>
</div>
<div class="row" style="gap:22px;margin-top:16px;align-items:flex-start">
  <div style="width:250px;flex:none" class="col">
    <div data-n="4"><div class="lab">Topic</div>
      <div class="card" style="padding:6px">
        <div class="row" style="justify-content:space-between;padding:6px 10px;border-radius:6px;background:#e3eaf5;color:#0d366b;font-weight:700"><span>All topics</span><span class="small">6</span></div>
        {topic_list}
      </div></div>
    <div data-n="5"><div class="lab">Segment</div><div class="row" style="gap:6px"><span class="chip on">All</span><span class="chip">A</span><span class="chip">B</span><span class="chip">C</span></div>
      <div class="hint">A · shoot here, release abroad · B · release in Vietnam · C · services only</div></div>
  </div>
  <div style="flex:1" class="col" data-n="6">
    <div class="small muted">Showing 6 rules · sorted by topic</div>
    <div class="g2">
      {rcard("A9-MIL", "Military uniforms, weapons or installations on screen", "National security &amp; defence", "action", "Law 05/2022/QH15, Art. 9", "2026.06", "Scenes with uniforms, prop weapons or military sites and how they are portrayed.", True)}
      {rcard("A9-LONG", "Border areas, border markers and border guard posts", "National security &amp; defence", "action", "Law 05/2022/QH15, Art. 9", "2026.08", "Scenes set at or near national borders, including dramatised cross-border movement.")}
      {rcard("A9-HIST", "Historical figures and events", "History", "notice", "Law 05/2022/QH15, Art. 9", "2026.07", "Portrayal of Vietnamese historical figures, periods and events.")}
      {rcard("A9-RELIG", "Religious sites and practices", "Religion &amp; beliefs", "notice", "Law 05/2022/QH15, Art. 9", "2026.07", "Scenes filmed at places of worship or showing religious ceremonies.")}
      {rcard("A9-PERSON", "Real, identifiable persons", "Real persons &amp; privacy", "notice", "Law 05/2022/QH15, Art. 9", "2026.08", "Stories that depict living or recently deceased people who can be recognised.")}
      {rcard("A13-DOSSIER", "Four dossier components under Article 13, clause 3", "Dossier (Article 13)", "action", "Law 05/2022/QH15, Art. 13(3)", "2026.06", "The documents a foreign production must file through its Vietnamese service company.")}
    </div>
  </div>
</div>
<div class="disc" data-n="14"><b>This library explains the rules the platform checks against; it is not legal advice and does not replace the decision of the competent authority.</b> Only rules signed by the VFDA Legal Board are listed. Descriptions and points to consider are written by the Board.</div>
""", active="Permits", logged=False)

add(dict(
 seq=28, sid="SC-30", name="Requirements library", group="M2", tier=TIER_SHOULD,
 module="M2", actor="Guest", prio="Should", route="/requirements",
 design_note="Browse rules by topic.",
 new_note="**Screen Spec added 30/09/2026.** `SC-30` was in Screen List v2.0 (Should) but had no mockup. `SC-12` links to it as *View the regulations library*.",
 shown="A visitor clicks *Permits* → *Requirements library* in the top navigation, *View the regulations library* on `SC-12`, or a citation link on `SC-48`.",
 leave="The visitor opens one rule (`SC-31`) or starts a content pre-check (`SC-03`).",
 el=[
  (1, "Navigation bar", "Header", "static; *Permits* selected; guest view", "—", "—"),
  (2, "Title", "Header", "static", "—", "—"),
  (3, "Rule set line", "Text", "current `rule_version` and the number of rules in `rules` (approved rules only)", "—", "—"),
  (4, "Topic filter with counts", "Toggle (single choice)", "`topic` — security / history / religion / privacy / dossier / public_order / heritage, shown with readable labels; count of approved rules per topic", "No", "one of the 7 topic values or *All topics*; a topic with 0 rules stays visible, greyed, and shows the empty message when chosen"),
  (5, "Segment filter", "Toggle (single choice)", "`segment` — A / B / C", "No", "enum A / B / C or *All*"),
  (6, "Rule card list", "List", "`rules` (`legal_rule_public[]`) — approved, active rules only", "—", "draft and retired rules never listed"),
  (7, "Rule title", "Text", "`title_en` (or `title_vi` when the interface is in Vietnamese)", "Yes", "—"),
  (8, "Rule code and topic label", "Text", "`rule_code`, `topic`", "Yes", "—"),
  (9, "Severity label", "Text", "`severity` — notice → *Needs attention*, action → *Action required*", "Yes", "enum, 2 values"),
  (10, "Citation", "Text", "`citation`", "Yes", "never empty for a listed rule (M2 BR-002)"),
  (11, "Rule version", "Text", "`rule_version` in which this rule was last activated", "Yes", "—"),
  (12, "*Read the rule* link", "Link", "`rule_slug`", "—", "—"),
  (13, "Pre-check call to action", "Button", "static", "—", "—"),
  (14, "Disclaimer", "Text", "static", "—", "always shown"),
 ],
 st=[
  ("Default", "All approved rules as cards, sorted by topic; topic counts on the left.", "Open `/requirements`"),
  ("Empty (no data)", "A topic or segment with no approved rule: *No rules in force for this topic yet. The VFDA Legal Board adds rules as they are signed.* and a link back to *All topics*.", "Filter returns 0 rules"),
  ("Loading", "Grey skeletons sized like 4 rule cards; filters stay usable.", "Loading the rules"),
  ("Error", "*Couldn't load the requirements library — try again*, with a *Retry* button; no stale or cached rules are shown as current.", "Query failed"),
  ("Success / confirmation", "Not applicable — read-only screen; choosing a filter simply updates the list and the page URL.", "—"),
 ],
 ix=[
  ("Topic filter", "tap", "Filters the list by `topic`; the choice is kept in the page URL", "stays"),
  ("Segment filter", "tap", "Filters the list by `segment`; the choice is kept in the page URL", "stays"),
  ("Rule card / *Read the rule*", "tap", "Opens the rule page", "SC-31"),
  ("*Check a 200-word summary* button", "tap", "Opens the content pre-check", "SC-03"),
 ],
 sr=[
  ("Only **approved rules in force** are listed; drafts and retired rules are never public.", "M2 FR-015 (F-M2-15)"),
  ("Every listed rule shows its citation; a rule without a citation cannot be active and therefore cannot appear.", "M2 BR-002"),
  ("The words *approved*, *accepted*, *legally compliant* and *safe* are not used to describe a user's content on this screen.", "M2 BR-003"),
  ("Topics use the fixed topic list of the rule base (7 values) with readable labels, so the library and the admin rule base (`SC-37`) always group rules the same way.", "M2 §5.1 FR-001, FR-002"),
  ("The screen can be viewed without an account.", "M2 US-5"),
 ],
 fr=[("F-M2-15", "Public library of approved rules, filterable by topic and segment")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the topic list becomes a horizontal chip row above the cards; cards stack in one column.",
       "Filters are real buttons with `aria-pressed`; the count is read with the label (e.g. *History, 1 rule*).",
       "Severity labels always include text, not only colour."],
 oq=[("[NEEDS CLARIFICATION: F-M2-15 filters by segment, but a legal rule has no segment field (M2 §6). Who decides which rules apply to segments A, B and C, and where is it stored?]", False, "Client (VFDA Legal Board)"),
     ("[NEEDS CLARIFICATION: M2 §5.1 declares the public `topic` filter as `VARCHAR(60)` while the rule base uses the 7-value topic enum; confirm the library uses the same enum]", False, "Group C")],
), html)


# =====================================================================  29 · SC-31
html = page("SC-31", "Requirement detail", "M2 · Guest · Added 30/09/2026", "/requirements/a9-hist", f"""
<div class="small" data-n="2"><span class="lnk small">Requirements library</span> <span class="muted">›</span> <span class="lnk small">History</span> <span class="muted">›</span> A9-HIST</div>
<div class="row" style="justify-content:space-between;align-items:flex-start;margin-top:8px">
  <div>
    <h1 data-n="3">Historical figures and events</h1>
    <div class="row" style="gap:8px;align-items:center;margin-top:6px" data-n="4"><span class="kbd">A9-HIST</span><span class="pill p-mute">History</span><span class="pill p-warn">Needs attention</span></div>
  </div>
  <div class="card soft small" data-n="5" style="width:330px;padding:10px 14px">
    <div>Rule version <span class="kbd">2026.07</span> · in force since <b>20/07/2026</b></div>
    <div class="muted" style="margin-top:3px">Signed by the VFDA Legal Board. Earlier check results keep the version they used.</div>
  </div>
</div>
<div class="row" style="gap:20px;margin-top:16px;align-items:flex-start">
  <div style="flex:1" class="col">
    <div class="g2" style="gap:0;border:1px solid #dce0e5;border-radius:8px">
      <div style="padding:14px 16px;border-right:1px solid #dce0e5" data-n="6">
        <div class="small muted" style="text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">English</div>
        <h3>What the rule covers</h3>
        <div style="font-size:13.5px;line-height:1.55">Films may portray the historical figures and events of Vietnam. Content that distorts history, denies the achievements of the revolution or offends national heroes is prohibited under Article 9 of the Cinema Law 2022.</div>
      </div>
      <div style="padding:14px 16px;background:#fafbfc;border-radius:0 8px 0 0" data-n="7">
        <div class="small muted" style="text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Tiếng Việt</div>
        <h3>Phạm vi của quy tắc</h3>
        <div style="font-size:13.5px;line-height:1.55">Phim được phép thể hiện nhân vật và sự kiện lịch sử của Việt Nam. Nội dung xuyên tạc lịch sử, phủ nhận thành tựu cách mạng, xúc phạm anh hùng dân tộc bị cấm theo Điều 9 Luật Điện ảnh 2022.</div>
      </div>
      <div style="padding:14px 16px;border-right:1px solid #dce0e5;border-top:1px solid #dce0e5" data-n="8">
        <h3>Points to consider</h3>
        <div style="font-size:13.5px;line-height:1.55">State the historical period, your perspective and the sources you rely on in the detailed script. Mark which characters are fictional and which are real.</div>
      </div>
      <div style="padding:14px 16px;background:#fafbfc;border-top:1px solid #dce0e5;border-radius:0 0 8px 0">
        <h3>Điểm cần cân nhắc</h3>
        <div style="font-size:13.5px;line-height:1.55">Nêu rõ giai đoạn lịch sử, góc nhìn và nguồn tư liệu trong kịch bản chi tiết. Ghi rõ nhân vật nào là hư cấu, nhân vật nào có thật.</div>
      </div>
    </div>
    <div class="card" data-n="9" style="border-left:4px solid #0d366b">
      <div class="small muted" style="text-transform:uppercase;letter-spacing:.06em">Legal basis</div>
      <div style="margin-top:4px"><b>Law 05/2022/QH15 — Cinema Law 2022, Article 9</b> (prohibited content in cinematographic activities)</div>
      <div class="small muted" style="margin-top:4px">Luật Điện ảnh số 05/2022/QH15, Điều 9 · The specific clause will be added by the VFDA Legal Board.</div>
    </div>
    <div class="small muted" style="font-style:italic">Sample wording for the mockup — the official text is written by the VFDA Legal Board.</div>
  </div>
  <div style="width:300px;flex:none" class="col">
    <div class="card" data-n="10">
      <h3>Does your story touch this rule?</h3>
      <div class="small" style="margin-bottom:8px">Paste a 200-word summary; findings always cite the rule they come from.</div>
      <span class="btn sm">Check my summary</span>
    </div>
    <div class="card" data-n="11">
      <h3>Questions about this rule?</h3>
      <div class="small" style="margin-bottom:8px">Book a consultation with VFDA (members).</div>
      <span class="btn sm g">Book a VFDA consultation</span>
    </div>
    <div class="card soft" data-n="12">
      <h3>Related rules</h3>
      <div class="col small" style="gap:6px"><span class="lnk small">A9-MIL · Military uniforms, weapons or installations</span><span class="lnk small">A9-PERSON · Real, identifiable persons</span></div>
    </div>
  </div>
</div>
<div class="disc" data-n="13"><b>This page explains a rule the platform checks against; it is not legal advice and does not replace the decision of the competent authority.</b></div>
""", active="Permits", logged=False)

add(dict(
 seq=29, sid="SC-31", name="Requirement detail", group="M2", tier=TIER_SHOULD,
 module="M2", actor="Guest", prio="Should", route="/requirements/[slug]",
 design_note="Bilingual description with citation.",
 new_note="**Screen Spec added 30/09/2026.** `SC-31` was in Screen List v2.0 (Should) but had no mockup.",
 shown="A visitor opens a rule from `SC-30`, follows a rule code or citation from `SC-48`, or opens a shared rule link.",
 leave="The visitor goes back to the library (`SC-30`), opens a related rule (`SC-31`), starts a pre-check (`SC-03`) or books a VFDA consultation (`SC-33`).",
 el=[
  (1, "Navigation bar", "Header", "static; *Permits* selected; guest view", "—", "—"),
  (2, "Breadcrumb", "Link", "static + `topic` + `rule_code`", "—", "—"),
  (3, "Rule title", "Header", "`title_en` / `title_vi` by interface language", "Yes", "—"),
  (4, "Rule code, topic and severity", "Text", "`rule_code`, `topic`, `severity` (notice → *Needs attention*, action → *Action required*)", "Yes", "enum values shown with readable labels"),
  (5, "Rule version box", "Text", "`rule_version`, `approved_at` of the version in force", "Yes", "—"),
  (6, "Description — English", "Text", "`description_en`", "Yes", "—"),
  (7, "Description — Vietnamese", "Text", "`description_vi`", "Yes", "—"),
  (8, "*Points to consider* — English and Vietnamese", "Text", "`guidance_en`, `guidance_vi`", "Yes", "—"),
  (9, "Legal basis (citation)", "Text", "`citation`", "Yes", "never empty (M2 BR-002)"),
  (10, "*Check my summary* card", "Button", "static", "—", "—"),
  (11, "*Book a VFDA consultation* card", "Button", "static", "—", "guests are asked to sign in first"),
  (12, "Related rules", "List", "other approved rules with the same or a nearby `topic`", "—", "approved rules only; max 3"),
  (13, "Disclaimer", "Text", "static", "—", "always shown"),
 ],
 st=[
  ("Default", "Bilingual description and points to consider side by side, citation, version box and actions.", "Open `/requirements/[slug]`"),
  ("Empty (no data)", "Unknown slug, or a rule that is a draft: *This rule does not exist or is not public* with a link to `SC-30`. A **retired** rule opened from an old link shows its last text with a grey strip *Retired on … — no longer checked* and no pre-check button.", "`rule_slug` not found / not approved / retired"),
  ("Loading", "Grey skeleton for the two language columns and the citation box.", "Loading the rule"),
  ("Error", "*Couldn't load this rule — try again* with *Retry*.", "Query failed"),
  ("Success / confirmation", "Not applicable — read-only screen; no user action changes data here.", "—"),
 ],
 ix=[
  ("Breadcrumb *Requirements library* / topic", "tap", "Back to the library, filtered by the topic when the topic is clicked", "SC-30"),
  ("*Check my summary* button", "tap", "Opens the pre-check", "SC-03"),
  ("*Book a VFDA consultation* button", "tap", "Signed in: opens booking; guest: sign in first", "SC-33"),
  ("Related rule link", "tap", "Opens that rule", "SC-31"),
  ("*EN / VI* in the navigation bar", "tap", "Switches the interface language; both language columns stay visible", "stays"),
 ],
 sr=[
  ("One public page per approved rule, always showing **both languages** and the citation.", "M2 FR-016 (F-M2-16)"),
  ("A rule without a citation cannot be active, so this page never shows a rule without a legal basis.", "M2 BR-002"),
  ("Retired rules are never deleted; an old link still opens and is clearly marked *Retired*.", "M2 BR-008"),
  ("The version shown is the one in force; findings on `SC-48` keep the version they cited, even after the rule changes.", "M2 BR-007, M2 BR-008"),
  ("Text on this page is written by the VFDA Legal Board; the system never generates or rewrites it.", "M2 BR-001"),
 ],
 fr=[("F-M2-16", "Public page per rule with bilingual description and citation")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: English and Vietnamese stack (interface language first); the right-hand cards move below the citation.",
       "Each language block carries a `lang` attribute (`en` / `vi`) for screen readers.",
       "The citation box is a labelled region (*Legal basis*)."],
 oq=[("[NEEDS CLARIFICATION: the specific clause of Article 9 for each rule is to be filled in `rules.citation` by the VFDA Legal Board; the mockup only goes to Article level]", False, "Client (VFDA Legal Board)", 8),
     ("[NEEDS CLARIFICATION: should the public rule page list earlier versions of the rule and what changed between them?]", False, "Client (VFDA Legal Board)")],
), html)


# =====================================================================  30 · SC-37
RULES = [
    ("A9-HERIT", "Filming inside a protected heritage zone", "Heritage sites", "Draft", "p-mute", "—", "Edit", True),
    ("A9-DRUG", "Depiction of drug use", "Public order", "Draft", "p-mute", "—", "Edit", False),
    ("A9-LONG", "Border areas, markers and border guard posts", "Security", "Approved", "p-ok", "2026.08", "Retire", False),
    ("A9-PERSON", "Real, identifiable persons", "Privacy", "Approved", "p-ok", "2026.08", "Retire", False),
    ("A9-HIST", "Historical figures and events", "History", "Approved", "p-ok", "2026.07", "Retire", False),
    ("A9-RELIG", "Religious sites and practices", "Religion", "Approved", "p-ok", "2026.07", "Retire", False),
    ("A9-MIL", "Military uniforms, weapons or installations", "Security", "Approved", "p-ok", "2026.06", "Retire", False),
    ("A13-DOSSIER", "Four dossier components, Art. 13(3)", "Dossier", "Approved", "p-ok", "2026.06", "Retire", False),
]


def rule_rows():
    out, first_ok = [], True
    for code, title, topic, st, cls, ver, act, sel in RULES:
        bg = ' style="background:#eef3fa"' if sel else ""
        n8 = nb(8) if sel else ""
        n9 = nb(9) if sel else ""
        n10 = ""
        if act == "Retire" and first_ok:
            n10, first_ok = nb(10), False
        out.append(f'<tr{bg}><td style="white-space:nowrap"><span class="kbd">{code}</span></td><td>{title}<div class="small muted">{topic}</div></td>'
                   f'<td><span class="pill {cls}"{n8}>{st}</span></td><td class="small"><span{n9}>{ver}</span></td>'
                   f'<td style="text-align:right"><span class="lnk small"{n10}>{act}</span></td></tr>')
    return "".join(out)


body = f"""
<div class="row" style="justify-content:space-between;align-items:flex-start">
  <div data-n="3"><h1>Legal rule base</h1><div class="sub small">Rule set in force <span class="kbd">2026.08</span> · 6 approved · 2 drafts · 0 retired</div></div>
  <span class="btn" data-n="4">+ New rule</span>
</div>
<div class="row" style="gap:18px;margin-top:14px;align-items:flex-start">
  <div style="flex:1;min-width:0" class="col">
    <div class="row" style="gap:10px;align-items:center">
      <div data-n="5" style="width:190px"><div class="field">All topics ▾</div></div>
      <div class="row" style="gap:6px" data-n="6"><span class="chip on">All 8</span><span class="chip">Draft 2</span><span class="chip">Approved 6</span><span class="chip">Retired 0</span></div>
    </div>
    <div class="card" style="padding:2px 4px" data-n="7">
      <table class="t"><tr><th>Code</th><th>Rule</th><th>Status</th><th>Version</th><th></th></tr>{rule_rows()}</table>
    </div>
    <div class="card soft" data-n="22">
      <h3>Rule-set versions</h3>
      <table class="t small" style="font-size:12.5px">
        <tr><td><span class="kbd">2026.08</span></td><td>28/08/2026</td><td>A9-LONG, A9-PERSON activated</td><td class="muted">Trần Minh Quân</td></tr>
        <tr><td><span class="kbd">2026.07</span></td><td>20/07/2026</td><td>A9-HIST, A9-RELIG activated</td><td class="muted">Trần Minh Quân</td></tr>
        <tr><td><span class="kbd">2026.06</span></td><td>15/06/2026</td><td>A13-DOSSIER, A9-MIL activated</td><td class="muted">Trần Minh Quân</td></tr>
      </table>
    </div>
  </div>
  <div style="width:452px;flex:none" class="card hl" data-n="11">
    <div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">Edit rule</h2><span class="pill p-mute">Draft · not in force</span></div>
    <div class="col" style="gap:9px;margin-top:10px">
      <div class="g2" style="gap:8px">
        <div data-n="12"><div class="lab">Rule code</div><div class="field">A9-HERIT</div></div>
        <div data-n="13"><div class="lab">Topic</div><div class="field">Heritage sites ▾</div></div>
      </div>
      <div data-n="14" class="row" style="gap:8px;align-items:center"><span class="lab" style="margin:0">Severity</span><span class="chip on">Needs attention · notice</span><span class="chip">Action required · action</span></div>
      <div data-n="15"><div class="lab">Title · EN / VI</div><div class="field" style="padding:6px 10px">Filming inside a protected heritage zone</div><div class="field" style="padding:6px 10px;margin-top:4px">Quay phim trong khu vực di sản được bảo vệ</div></div>
      <div data-n="16"><div class="lab">Description · EN / VI</div><div class="g2" style="gap:6px"><div class="field small" style="min-height:48px">Scenes filmed inside a protected zone of a recognised heritage site…</div><div class="field small" style="min-height:48px">Cảnh quay trong vùng bảo vệ của di sản đã được công nhận…</div></div></div>
      <div data-n="17"><div class="lab">Points to consider · EN / VI</div><div class="g2" style="gap:6px"><div class="field small" style="min-height:40px">Name the zone and the scenes filmed there…</div><div class="field small" style="min-height:40px">Nêu rõ vùng bảo vệ và các cảnh quay…</div></div></div>
      <div data-n="18"><div class="lab" style="color:#a52a1f">Citation (legal basis) — required to sign</div><div class="field" style="color:#8a9099;border:2px solid #a52a1f">e.g. Law 05/2022/QH15, Art. 9</div></div>
      <div class="small" data-n="19" style="background:#f6f8fa;border-radius:6px;padding:7px 10px">Author: <b>Trần Minh Quân</b> · last edited 29/09/2026 16:05<br>Approver: set by whoever signs. <span class="warn">Whether the approver must differ from the author awaits the VFDA Legal Board.</span></div>
      <div class="row" style="justify-content:space-between;align-items:center">
        <span class="btn g" data-n="20">Save draft</span>
        <span class="btn dis" data-n="21">Approve and sign</span>
      </div>
      <div class="small bad" style="margin-top:-2px;text-align:right">Cannot sign: citation is missing</div>
    </div>
  </div>
</div>
<div class="small muted" style="margin-top:12px" data-n="23">Every save, signature and retirement is written to the audit log with your name and the time. Rules are retired, never deleted.</div>
"""
html = admin_page("SC-37", "Admin — Legal rule base", "M2 · VFDA Legal · Added 30/09/2026", "/admin/legal-rules",
                  "Legal rules", body, "Trần Minh Quân", "MQ", "Legal Board")

add(dict(
 seq=30, sid="SC-37", name="Admin — Legal rule base", group="M2", tier=TIER_MUST,
 module="M2", actor="VFDA Legal (Legal Board)", prio="Must", route="/admin/legal-rules",
 design_note="Write, sign, version rules.",
 new_note="**Screen Spec added 30/09/2026.** `SC-37` is a Must screen that had no mockup (Screen List: *Must screens still without a mockup*). The M2 checks cannot run without it.",
 shown="A VFDA Legal Board member signs in and chooses *Legal rules* in the admin menu (from `SC-34` or any admin screen).",
 leave="The officer moves to another admin screen through the menu (for example `SC-41` to see the audit trail) or opens the public page of a rule (`SC-31`).",
 el=[
  (1, "Navigation bar", "Header", "static; signed in as a VFDA Legal Board member", "—", "—"),
  (2, "Admin menu", "List", "static; *Legal rules* selected", "—", "items shown according to the user's role"),
  (3, "Title + rule-set summary", "Header", "current `rule_version`; counts of `rules` by status", "—", "—"),
  (4, "*+ New rule* button", "Button", "static", "—", "opens an empty editor with status *draft*"),
  (5, "Topic filter", "Toggle (dropdown)", "`filter_topic` — security / history / religion / privacy / dossier / public_order / heritage", "No", "enum or *All topics*"),
  (6, "Status filter with counts", "Toggle (single choice)", "`filter_status` — draft / approved / retired", "No", "enum or *All*"),
  (7, "Rule table", "List", "`rules` (`legal_rule[]`): `rule_code`, `title_en`, `topic`", "—", "visible to the `vfda_legal` role only (Row Level Security)"),
  (8, "Rule status", "Text", "status — Draft / Approved / Retired; *Approved* means `is_active` = true", "—", "enum"),
  (9, "Rule version", "Text", "`version` / `rule_version` in which the rule was activated", "—", "*—* for drafts"),
  (10, "Row action *Edit* / *Retire*", "Link", "draft → *Edit*; approved → *Retire* (confirmation dialog); retired → *View*", "—", "*Retire* needs a confirmation; retired rules are read-only"),
  (11, "Rule editor", "Container", "the selected rule", "—", "editable only while the rule is a draft"),
  (12, "Rule code", "Input", "`rule_code`", "Yes", "max 40 characters, capitals, digits and hyphens; unique"),
  (13, "Topic", "Toggle (dropdown)", "`topic`", "Yes", "one of the 7 topic values"),
  (14, "Severity", "Toggle (single choice)", "`severity` — notice (*Needs attention*) / action (*Action required*)", "Yes", "enum, 2 values"),
  (15, "Title EN / VI", "Input (2 fields)", "`title_en`, `title_vi`", "Yes", "max 200 characters each; both required"),
  (16, "Description EN / VI", "Input (multi-line, 2 fields)", "`description_en`, `description_vi`", "Yes", "both required"),
  (17, "Points to consider EN / VI", "Input (multi-line, 2 fields)", "`guidance_en`, `guidance_vi`", "Yes", "both required"),
  (18, "Citation", "Input", "`citation`", "Yes", "max 200 characters; required to sign — highlighted when missing"),
  (19, "Author and approver line", "Text", "author, last edit time; `approver_id` and `approved_at` once signed", "—", "—"),
  (20, "*Save draft* button", "Button", "static", "—", "enabled when a field changed"),
  (21, "*Approve and sign* button", "Button", "records `approver_id`, `approved_at`, sets `is_active`", "—", "disabled while `citation` or any required field is empty (database CHECK)"),
  (22, "Rule-set version history", "List", "`rule_version`, `created_at`, `created_by` and the rules activated in each", "—", "newest first; read-only"),
  (23, "Audit note", "Text", "static", "—", "always shown"),
 ],
 st=[
  ("Default", "All rules in the table, the selected rule in the editor, version history below the table.", "Open `/admin/legal-rules`"),
  ("Empty (no data)", "No rules yet: the table shows *No rules yet — create the first rule* with *+ New rule*; version history reads *No rule set in force yet*. A filter with no match shows *No rules for this filter*.", "0 rules / filter returns 0"),
  ("Loading", "Grey skeleton rows in the table; the editor shows a skeleton until the rule has loaded.", "Loading rules"),
  ("Error", "Signing refused by the database: red strip *Cannot sign — citation missing* and the citation field outlined. Duplicate rule code: message under the code field. Save fails: *Couldn't save — your text is kept*.", "CHECK constraint / unique constraint / write error"),
  ("Success / confirmation", "Signed: strip *A9-HERIT signed — rule set 2026.09 is now in force*, status turns *Approved*, a new row appears in the version history. Retired: status *Retired*, strip *Rule retired — past results still show its text*. Saved draft: *Draft saved*.", "Sign / retire / save succeeded"),
 ],
 ix=[
  ("Admin menu item", "tap", "Opens that admin screen", "SC-34"),
  ("Topic / status filter", "tap", "Filters the table", "stays"),
  ("Rule row / *Edit*", "tap", "Loads the rule into the editor", "stays"),
  ("*+ New rule* button", "tap", "Empty editor, status draft", "stays"),
  ("*Save draft* button", "tap", "Saves the draft and writes an audit record", "stays"),
  ("*Approve and sign* button", "tap", "Confirmation dialog; on confirm records the approver, activates the rule, creates a new rule-set version and writes an audit record", "stays"),
  ("*Retire* link", "tap", "Confirmation dialog; on confirm sets status *retired*, removes the rule from future checks and writes an audit record", "stays"),
  ("Rule code of an approved rule", "tap", "Opens its public page in a new tab", "SC-31"),
  ("Audit note", "tap", "Opens the audit log filtered to legal rules (admin role)", "SC-41"),
 ],
 sr=[
  ("A rule becomes active only when it has a **citation and an approver**; enforced by a database CHECK constraint, not only by the disabled button.", "M2 BR-002, M2 FR-003 (F-M2-03)"),
  ("Every activation creates a **new rule-set version**; every later check records the version it used.", "M2 FR-004 (F-M2-04), M2 BR-007"),
  ("Rules are **retired, never deleted** (`status = retired`); findings keep showing the text of the rule version they cited. There is no *Delete* action.", "M2 BR-008"),
  ("Only the VFDA Legal Board writes and signs rules; developers and the language model never change rule text.", "M2 US-3, M2 BR-001"),
  ("Every save, signature and retirement writes one audit record in the same transaction.", "M10 BR-005 (F-M10-08)"),
 ],
 fr=[("F-M2-01", "List rules filtered by topic and status"),
     ("F-M2-02", "Create and edit bilingual rules with citation and severity"),
     ("F-M2-03", "Sign (approve) a rule; activation refused without citation or approver"),
     ("F-M2-04", "New rule-set version on every activation; version history"),
     ("F-M10-08", "Audit record for every save, signature and retirement")],
 resp=["Minimum supported width: **360px** (admin work is expected on desktop; below 1024px the editor opens full screen over the table).",
       "The admin menu collapses into a menu button on narrow screens.",
       "Required fields are marked in the label text, not only by colour; the missing citation message is linked to the field with `aria-describedby`.",
       "Sign and retire confirmations are `dialog`s with a focus trap."],
 oq=[("[NEEDS CLARIFICATION: Must rule signing require two different people (author ≠ approver)?]", True, "Client (VFDA Legal Board)", 2),
     ("[NEEDS CLARIFICATION: when an approved rule needs a correction, is a new draft revision created while the signed text stays in force, and does retiring a rule also create a new rule-set version?]", True, "Client (VFDA Legal Board)"),
     ("[NEEDS CLARIFICATION: format of `rule_version` (the mockups use year.month, e.g. 2026.08) when more than one rule is signed in the same month]", False, "Group C")],
), html)


# =====================================================================  31 · SC-35
LOCS = [
    ("Mũi Né Sand Dunes", "Lâm Đồng", "Awaiting contact", "p-warn", '<span class="bad">Not verified</span>', "3 · 1 pending", "Edit", True),
    ("Tràng An Landscape Complex", "Ninh Bình", "Published", "p-ok", '<span class="ok">✓ 14/06/2026</span>', "6", "Unpublish", False),
    ("Tam Cốc – Bích Động", "Ninh Bình", "Published", "p-ok", '<span class="ok">✓ 02/07/2026</span>', "4", "Unpublish", False),
    ("Hạ Long Bay", "Quảng Ninh", "Published", "p-ok", '<span class="ok">✓ 12/04/2026</span>', "5", "Unpublish", False),
    ("Hội An Ancient Town", "Đà Nẵng", "Published", "p-ok", '<span class="ok">✓ 20/05/2026</span>', "5", "Unpublish", False),
    ("Đồng Văn Karst Plateau", "Tuyên Quang", "Published", "p-ok", '<span class="ok">✓ 18/08/2026</span>', "1 · 1 pending", "Unpublish", False),
]


def loc_rows():
    out, first_pub = [], True
    for name, prov, st, cls, ver, ph, act, sel in LOCS:
        bg = ' style="background:#eef3fa"' if sel else ""
        n11 = ""
        if act == "Unpublish" and first_pub:
            n11, first_pub = nb(11), False
        out.append(f'<tr{bg}><td><b>{name}</b></td><td>{prov}</td><td><span class="pill {cls}"{nb(8) if sel else ""}>{st}</span></td>'
                   f'<td><span{nb(9) if sel else ""}>{ver}</span></td><td><span{nb(10) if sel else ""}>{ph}</span></td>'
                   f'<td style="text-align:right"><span class="lnk small"{n11}>{act}</span></td></tr>')
    return "".join(out)


def photo(label, st, cls, src, right, n_status=None, n_src=None):
    return (f'<div class="row" style="gap:9px;align-items:center"><div class="ph" style="width:64px;height:44px;flex:none">{label}</div>'
            f'<div class="small" style="line-height:1.35"><span class="pill {cls}"{nb(n_status)}>{st}</span>'
            f'<div{nb(n_src)}>{src}<br><span class="muted">{right}</span></div></div></div>')


body = f"""
<div class="row" style="justify-content:space-between;align-items:flex-start">
  <div data-n="3"><h1>Locations</h1><div class="sub small">10 locations · 9 published · 1 awaiting a verified authority contact · 0 unpublished</div></div>
  <span class="btn" data-n="4">+ New location</span>
</div>
<div class="row" style="gap:10px;align-items:center;margin-top:12px">
  <div class="row" style="gap:6px" data-n="5"><span class="chip on">All 10</span><span class="chip">Awaiting contact 1</span><span class="chip">Published 9</span><span class="chip">Unpublished 0</span></div>
  <div class="row" style="gap:8px;margin-left:auto" data-n="6"><div class="field" style="color:#8a9099;width:230px">Search by name (accents optional)</div><div class="field" style="width:160px">All provinces ▾</div></div>
</div>
<div class="card" style="padding:2px 4px;margin-top:10px" data-n="7">
  <table class="t"><tr><th>Location</th><th>Province</th><th>Status</th><th>Authority contact</th><th>Photos</th><th></th></tr>{loc_rows()}</table>
  <div class="small muted" style="padding:6px 10px">Showing 6 of 10</div>
</div>
<div class="card hl" style="margin-top:14px" data-n="12">
  <div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">Mũi Né Sand Dunes <span class="small muted" style="font-weight:400">· Đồi cát Mũi Né</span></h2><span class="pill p-warn">Awaiting contact · not published</span></div>
  <div class="row" style="gap:16px;margin-top:10px;align-items:flex-start">
    <div style="flex:1.25" class="col" data-n="13">
      <div class="lab" style="margin:0">Details <span class="opt">(18 fields of the data-entry template)</span></div>
      <div class="g2" style="gap:6px 8px">
        <div class="field small" style="padding:6px 9px">Đồi cát Mũi Né</div><div class="field small" style="padding:6px 9px">Mũi Né Sand Dunes</div>
        <div class="field small" style="padding:6px 9px">Lâm Đồng ▾ · Mũi Né</div><div class="field small" style="padding:6px 9px">10.9476, 108.2856</div>
      </div>
      <div data-n="14" class="row" style="gap:5px;flex-wrap:wrap"><span class="chip on">Dunes</span><span class="chip on">Sea</span><span class="chip on">Village</span><span class="chip dash">+ scene type</span></div>
      <div data-n="15" class="small" style="background:#f6f8fa;border-radius:6px;padding:7px 10px;line-height:1.6">Crew capacity <b>15–50</b> · Lodging within 20 km <b>Yes</b> · Grid power <b>Yes</b> · Truck access <b>Yes</b><br>Months to avoid <b>Oct–Nov</b> · Permit complexity <b>Low</b> · Airport <b>200 km</b></div>
      <div data-n="16" class="small lnk">Descriptions VI / EN and restriction note ▸</div>
    </div>
    <div style="flex:1" class="col" data-n="17">
      <div class="lab" style="margin:0">Photos</div>
      {photo("01.jpg", "Approved", "p-ok", "VFDA field visit 2026-09", "VFDA owned", n_status=20)}
      {photo("02.jpg", "Pending", "p-warn", "Lâm Đồng tourism office", "Licensed to VFDA, non-commercial", n_src=21)}
      {photo("03.jpg", "Hidden", "p-bad", "Unknown photographer", "No usage right given")}
      <span class="btn sm g" data-n="22" style="align-self:flex-start">+ Add photo</span>
    </div>
    <div style="flex:1.1" class="col" data-n="18">
      <div class="lab" style="margin:0">Local authority contact</div>
      <div class="small" style="line-height:1.55"><b>UBND phường Mũi Né</b><br>Phan Văn Lộc · +84 000 000 125<br><span class="muted">no email given</span></div>
      <div class="banner b-warn small" data-n="19" style="padding:8px 10px">Not verified. Call the office, confirm the person and number, then mark verified — your name and the time are recorded.<div style="margin-top:6px"><span class="btn sm">Mark contact as verified</span></div></div>
    </div>
  </div>
  <div class="row" style="justify-content:flex-end;align-items:center;gap:30px;margin-top:12px;border-top:1px solid #e1e4e8;padding-top:12px">
    <span class="small bad" data-n="23">Cannot publish: the authority contact is not verified</span>
    <span class="btn g" data-n="24">Save</span><span class="btn dis" data-n="25">Publish</span>
  </div>
</div>
<div class="small muted" style="margin-top:10px" data-n="26">Every save, verification, publish and unpublish is written to the audit log. Locations are unpublished, never deleted.</div>
"""
html = admin_page("SC-35", "Admin — Locations", "M3 · VFDA Staff · Added 30/09/2026", "/admin/locations",
                  "Locations", body, "Nguyễn Thị Thu Hà", "TH", "VFDA staff")

add(dict(
 seq=31, sid="SC-35", name="Admin — Locations", group="M3", tier=TIER_MUST,
 module="M3", actor="VFDA Staff", prio="Must", route="/admin/locations",
 design_note="Add, edit, verify, publish.",
 new_note="**Screen Spec added 30/09/2026.** `SC-35` is a Must screen that had no mockup (Screen List: *Must screens still without a mockup*). Location search (`SC-14`) has nothing to show without it.",
 shown="VFDA staff sign in and choose *Locations* in the admin menu (from `SC-34` or any admin screen).",
 leave="Staff move to another admin screen through the menu (for example `SC-34`), open the public page of a published location (`SC-16`), or open the audit log (`SC-41`).",
 el=[
  (1, "Navigation bar", "Header", "static; signed in as VFDA staff", "—", "—"),
  (2, "Admin menu", "List", "static; *Locations* selected", "—", "items shown according to the user's role"),
  (3, "Title + counts by status", "Header", "counts of `locations` by `intake_status`", "—", "—"),
  (4, "*+ New location* button", "Button", "static", "—", "opens an empty editor; a new location starts as `awaiting_contact`"),
  (5, "Status filter", "Toggle (single choice)", "`intake_status` — awaiting_contact / published / unpublished", "No", "enum or *All*"),
  (6, "Search and province filter", "Input + Toggle (dropdown)", "`filter` — name (with or without Vietnamese diacritics), `province_id` from the 34-province list", "No", "search max 200 characters"),
  (7, "Location table", "List", "`locations` (`location_admin[]`) including unpublished ones", "—", "visible to the `vfda_staff` role only (Row Level Security)"),
  (8, "Location status", "Text", "`intake_status` — Awaiting contact / Published / Unpublished", "—", "enum"),
  (9, "Authority contact verification", "Text", "`contact_verified`, `verified_at`", "—", "*Not verified* when `contact_verified` = false"),
  (10, "Photo count", "Text", "count of photos; number with `image_status` = pending", "—", "—"),
  (11, "Row action *Edit* / *Unpublish* / *Publish*", "Link", "published → *Unpublish*; awaiting_contact → *Edit*; unpublished → *Publish again*", "—", "*Unpublish* needs a confirmation dialog"),
  (12, "Location editor", "Container", "the selected location", "—", "—"),
  (13, "Names, province, district, coordinates", "Input (several fields)", "`name_vi`, `name_en`, `province_id`, `district`, `lat`, `lng`", "Yes", "names max 200 characters; province from the 34-province list; `lat` / `lng` inside Vietnam; district optional"),
  (14, "Scene types", "Toggle (multiple choice)", "`scene_types` — karst / river / village / rice_field / sea / floating_village / cave / jungle / old_town / market / rice_terrace / mountain / dunes / mangrove", "Yes", "at least 1; only enum values"),
  (15, "Logistics, season and permit complexity", "Input (several fields)", "`crew_capacity`, `lodging_20km`, `grid_power`, `truck_access`, `months_to_avoid`, `permit_complexity`, `airport_km`", "Yes", "`crew_capacity` u15 / 15_50 / o50; months 1–12; `permit_complexity` low / medium / high; `months_to_avoid` and `airport_km` optional"),
  (16, "Descriptions and restriction note", "Input (multi-line)", "`desc_vi`, `desc_en`, `restriction_note`", "Yes", "both descriptions required; restriction note optional"),
  (17, "*Photos* section", "Container", "location photos", "—", "—"),
  (18, "*Local authority contact* section", "Input (several fields)", "`authority_name`, `contact_name`, `contact_phone`, `contact_email`", "Yes", "office max 200, name max 120, phone max 20 characters; email optional, valid format"),
  (19, "Verification status + *Mark contact as verified*", "Button", "sets `contact_verified` = true, `verified_by` = current staff member, `verified_at` = now", "—", "confirmation dialog; any edit of the contact resets it to *Not verified*"),
  (20, "Photo status", "Text", "`image_status` — pending / approved / hidden", "—", "only *approved* photos are shown publicly"),
  (21, "Photo source and usage right", "Text", "`image_source`, `usage_right`", "Yes", "both required when a photo is added"),
  (22, "*+ Add photo* button", "Input (file)", "`image_file` → `image_url`", "—", "jpg / png, max 10 MB; source and usage right asked before upload"),
  (23, "Publish blocked reason", "Text", "`blocked_reason`", "—", "shown whenever *Publish* is disabled"),
  (24, "*Save* button", "Button", "static", "—", "enabled when a field changed; required fields valid"),
  (25, "*Publish* button", "Button", "sets `published` / `intake_status` = published", "—", "disabled while `contact_verified` = false (database CHECK)"),
  (26, "Audit note", "Text", "static", "—", "always shown"),
 ],
 st=[
  ("Default", "Location table (all statuses) and the selected location in the editor below. The mockup shows a location awaiting a verified contact.", "Open `/admin/locations`"),
  ("Empty (no data)", "No locations yet: *No locations yet — add the first one* with *+ New location*. A filter with no match (e.g. *Unpublished 0*): *No locations with this status*.", "0 locations / filter returns 0"),
  ("Loading", "Grey skeleton rows in the table; photo uploads show a progress bar on their own row.", "Loading / uploading"),
  ("Error", "Publish refused by the database: red strip with `blocked_reason` *Authority contact not verified*. Photo too large or wrong type: message at *+ Add photo* stating the limit. Save fails: *Couldn't save — your changes are kept*.", "CHECK constraint / file check / write error"),
  ("Success / confirmation", "Published: status *Published*, strip *Mũi Né Sand Dunes is now visible in location search*. Unpublished: status *Unpublished*, strip *Removed from search — shortlists that include it now show No longer published*. Verified: contact shows *✓ verified by Nguyễn Thị Thu Hà, 30/09/2026*.", "Publish / unpublish / verify succeeded"),
 ],
 ix=[
  ("Admin menu item", "tap", "Opens that admin screen", "SC-34"),
  ("Status filter / search / province", "tap / type", "Filters the table", "stays"),
  ("Location row / *Edit*", "tap", "Loads the location into the editor", "stays"),
  ("*+ New location* button", "tap", "Empty editor; status awaiting_contact", "stays"),
  ("*Mark contact as verified*", "tap", "Confirmation; records who verified and when; writes an audit record", "stays"),
  ("*+ Add photo*", "tap", "Asks for source and usage right, uploads, photo status *pending*", "stays"),
  ("*Save* button", "tap", "Saves the location; writes an audit record", "stays"),
  ("*Publish* button", "tap", "Publishes when the contact is verified; the database refuses otherwise; writes an audit record", "stays"),
  ("*Unpublish* link", "tap", "Confirmation dialog; sets `intake_status` = unpublished; writes an audit record", "stays"),
  ("Name of a published location", "tap", "Opens the public location page in a new tab", "SC-16"),
  ("Audit note", "tap", "Opens the audit log filtered to locations (admin role)", "SC-41"),
 ],
 sr=[
  ("A location **cannot be published until its local authority contact is verified**; enforced by a database CHECK constraint, and the reason is shown next to the disabled button.", "M3 BR-004, M3 FR-005 (F-M3-05)"),
  ("Locations are **unpublished, never deleted** (`intake_status = unpublished`); shortlists and provincial notices that refer to them keep them and show *No longer published*. There is no *Delete* action.", "M3 BR-008"),
  ("Every photo has a source and a usage right; photos are shown publicly only when their `image_status` is *approved*.", "M3 FR-003 (F-M3-03)"),
  ("The verification records **who** verified the contact and **when**; changing the contact clears the verification.", "M3 FR-004 (F-M3-04)"),
  ("Provinces use the 34 provincial-level units after the 2025 reorganisation.", "M3 BR-006"),
  ("Every save, verification, publish and unpublish writes one audit record in the same transaction.", "M10 BR-005 (F-M10-08)"),
 ],
 fr=[("F-M3-01", "List all locations including unpublished ones"),
     ("F-M3-02", "Create and edit a location with the 18 template fields"),
     ("F-M3-03", "Store photos with source, usage right and status"),
     ("F-M3-04", "Record and verify the local authority contact"),
     ("F-M3-05", "Publish blocked while the contact is not verified"),
     ("F-M10-08", "Audit record for every admin action on a location")],
 resp=["Minimum supported width: **360px** (admin work is expected on desktop; below 1024px the editor opens full screen over the table).",
       "The admin menu collapses into a menu button on narrow screens; the three editor sections stack.",
       "The disabled *Publish* button is linked to its reason with `aria-describedby`, so screen readers announce why.",
       "Status and photo labels always include text, not only colour; photos need a text alternative before publishing."],
 oq=[("[NEEDS CLARIFICATION: Re-verification cycle for authority contacts (proposed 12 months).]", False, "Client (VFDA)", 5),
     ("[NEEDS CLARIFICATION: who changes a photo's `image_status` from pending to approved when VFDA staff upload it themselves, and must a location have at least one approved photo before it can be published?]", False, "Client (VFDA)")],
), html)
