# -*- coding: utf-8 -*-
"""Screens added 30/09/2026 (seq 21–26): SYS — forgot / reset password, my account,
notification centre, privacy policy, terms of use."""
from base import page

SCREENS = []


def add(spec, html):
    SCREENS.append((spec, html))


def dn(k):
    return f' data-n="{k}"' if k else ""


def fld(k, label, value, hint="", ph=False, opt=False, style=""):
    o = ' <span class="opt">(optional)</span>' if opt else ""
    h = f'<div class="hint">{hint}</div>' if hint else ""
    return (f'<div{dn(k)} style="{style}"><div class="lab">{label}{o}</div>'
            f'<div class="field{" ph" if ph else ""}">{value}</div>{h}</div>')


FOOT = ('<div class="foot"><span>© 2026 CINEMATCH · operated for VFDA</span>'
        '<span style="margin-left:auto">Privacy policy</span><span>Terms of use</span>'
        '<span>Contact VFDA</span></div>')

RESP_FORM = "Every field has a real `<label>`; errors are linked with `aria-describedby` and announced when they appear."

# =====================================================================  21 · SC-06
html = page("SC-06", "Forgot password", "SYS · Guest · Added 30/09/2026", "/forgot-password", f"""
<div class="row" style="gap:36px;align-items:flex-start;justify-content:center;padding:26px 0 30px">
  <div class="card" style="width:500px;padding:26px 30px">
    <div{dn(2)}><h1>Forgot your password?</h1>
      <div class="sub" style="margin-top:6px">Enter the email you signed up with. We will send you a single-use link to set a new password.</div></div>
    <div class="col" style="gap:14px;margin-top:20px">
      {fld(3, "Work email", "lena.park@harbourline.example.kr")}
      <span class="btn" data-n="4" style="height:42px">Send reset link</span>
      <div class="small muted" data-n="5">Remembered it? <span class="lnk">Back to Log in</span></div>
    </div>
  </div>
  <div class="col" style="width:380px;gap:14px">
    <div class="card soft" data-n="6">
      <h3>What happens next</h3>
      <div class="col" style="gap:7px;font-size:13.5px">
        <div><b>1.</b> Check your inbox for an email from CINEMATCH.</div>
        <div><b>2.</b> Open the link — it works <b>once</b>.</div>
        <div><b>3.</b> Choose a new password of at least 10 characters.</div>
      </div>
      <div class="hint" style="margin-top:10px">For your security we show the same message whether or not an account exists for this email.</div>
    </div>
    <div class="card" data-n="7">
      <h3>No longer have access to that email?</h3>
      <div class="small" style="color:#3b424c">VFDA staff can help you recover your account after checking who you are.</div>
      <div style="margin-top:8px"><span class="lnk">Contact VFDA →</span></div>
    </div>
  </div>
</div>
""", logged=False, footer=FOOT)

add(dict(
 seq=21, sid="SC-06", name="Forgot password", group="SYS", tier="Added 30/09/2026 — Must",
 module="SYS", actor="Guest", prio="Must", route="/forgot-password",
 design_note="Send a reset link.",
 new_note="New Screen Spec written 30/09/2026; the screen existed in Screen List v2.0 without a mockup.",
 shown="A guest clicks *Forgot password?* on the *Log in* tab of `SC-04` (`SC-05`), or *Send a new link* on an expired link in `SC-07`.",
 leave="The guest opens the reset link from the email (`SC-07`), goes back to `SC-04`, or asks VFDA for help on `SC-33`.",
 el=[
  (1, "Navigation bar (logged out)", "Header", "static; *EN | VI* switch and *Log in / Sign up*", "—", "—"),
  (2, "Title + explanation", "Header", "static (bilingual dictionary, F-SYS-06)", "—", "—"),
  (3, "Work email", "Input (email)", "FR-003 `email`", "Yes", "email format; ≤ 254 characters"),
  (4, "*Send reset link* button", "Button", "static", "—", "disabled while the email is empty or invalid"),
  (5, "*Back to Log in* link", "Link", "static", "—", "—"),
  (6, "*What happens next* block", "Text", "static", "—", "—"),
  (7, "*No longer have access to that email?* help", "Text + link", "static", "—", "—"),
 ],
 st=[
  ("Default", "Empty email field, *Send reset link* disabled until a valid email is typed (the mockup is pre-filled for illustration).", "Open `/forgot-password`"),
  ("Empty (no data)", "Not applicable — a one-field form with no data list.", "—"),
  ("Loading", "The button changes to *Sending…* and is disabled; the field is locked to prevent a second request.", "Click *Send reset link*"),
  ("Error", "Invalid format: *Enter a valid email address* under the field. Email provider down: *We couldn't send the email right now — try again in a minute*; the request is queued and retried (FR-008).", "Zod validation fails / email delivery fails"),
  ("Success / confirmation", "The form is replaced by *If an account exists for lena.park@harbourline.example.kr, we've sent a reset link* (`reset_status = sent`), with *Resend* locked for 60 seconds and *Back to Log in*.", "Request accepted by Supabase Auth"),
 ],
 ix=[
  ("Email field", "type", "Validates format on blur", "stays"),
  ("*Send reset link*", "tap", "Calls Supabase Auth password reset for `email`; sends the reset email (F-SYS-08)", "stays (confirmation message)"),
  ("Reset link in the email", "tap", "Opens the reset page with `reset_token`", "SC-07"),
  ("*Back to Log in*", "tap", "—", "SC-05"),
  ("*Contact VFDA*", "tap", "Opens the booking form", "SC-33"),
  ("*EN | VI* switch", "tap", "Switches all interface text, keeps the typed email (F-SYS-05)", "stays"),
 ],
 sr=[
  ("The confirmation message is **the same whether or not an account exists** for the email, so the page cannot be used to find out who has an account.", "Security"),
  ("The reset link is **single-use**; tokens and password handling are done by Supabase Auth only.", "SYS BR-004; FR-003"),
  ("A deactivated account (`account_status = deactivated`) gets the same neutral message but **no reset email** — a reset never reactivates it.", "SYS BR-005"),
  ("*Resend* is locked for 60 seconds after each send, as for the verification email.", "SYS §3 edge cases"),
 ],
 fr=[("F-SYS-03", "Request a single-use password reset link"), ("F-SYS-08", "Reset email from the authenticated domain"), ("F-SYS-05", "Language switch keeps the form")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the help blocks move below the form card.", RESP_FORM, "The email field uses `type=email` and `autocomplete=email`."],
 oq=[("[NEEDS CLARIFICATION: How long is a password reset link valid before it expires (e.g. 1 hour)?]", False, "Group C")],
), html)

# =====================================================================  22 · SC-07
html = page("SC-07", "Reset password", "SYS · Guest · Added 30/09/2026", "/reset-password?token=…", f"""
<div class="row" style="gap:36px;align-items:flex-start;justify-content:center;padding:26px 0 30px">
  <div class="card" style="width:500px;padding:26px 30px">
    <div{dn(2)}><h1>Choose a new password</h1>
      <div class="sub" style="margin-top:6px">For the account <b>lena.park@harbourline.example.kr</b></div></div>
    <div class="col" style="gap:14px;margin-top:20px">
      <div data-n="3"><div class="lab">New password</div><div class="field">••••••••••••••</div>
        <div class="hint">At least 10 characters · <span class="ok">✓ strong</span></div></div>
      <div data-n="4"><div class="lab">Repeat new password</div><div class="field">••••••••••••••</div>
        <div class="hint"><span class="ok">✓ matches</span></div></div>
      <span class="btn" data-n="5" style="height:42px">Save new password</span>
      <div class="hint" data-n="6">Saving signs you out on every other device.</div>
    </div>
  </div>
  <div class="col" style="width:380px;gap:10px">
    <div class="small muted" style="text-transform:uppercase;letter-spacing:.06em">When the link has expired or was already used</div>
    <div class="card" data-n="7" style="border-color:#eab9b3">
      <div class="banner b-bad" style="margin-bottom:10px"><b>This link has expired</b></div>
      <div class="small" style="color:#3b424c">Reset links work once. Request a new one and use the most recent email.</div>
      <span class="btn g" data-n="8" style="margin-top:12px;width:100%">Send a new link</span>
    </div>
  </div>
</div>
""", logged=False, footer=FOOT)

add(dict(
 seq=22, sid="SC-07", name="Reset password", group="SYS", tier="Added 30/09/2026 — Must",
 module="SYS", actor="Guest", prio="Must", route="/reset-password",
 design_note="Enter a new password.",
 new_note="New Screen Spec written 30/09/2026; the mockup shows the valid-link form (left) and the expired-link panel (right) that replaces it.",
 shown="A guest opens the reset link from the email sent by `SC-06`.",
 leave="The new password is saved and the user is signed in (to `SC-10`), or the link has expired and the user requests a new one on `SC-06`.",
 el=[
  (1, "Navigation bar (logged out)", "Header", "static", "—", "—"),
  (2, "Title + account email", "Header", "email of the account the `reset_token` belongs to", "Yes", "—"),
  (3, "New password", "Input (password)", "FR-003 `new_password` — sent to Supabase Auth, never stored by the app", "Yes", "≥ 10 characters, ≤ 72; strength meter"),
  (4, "Repeat new password", "Input (password)", "client-side only", "Yes", "must equal row 3"),
  (5, "*Save new password* button", "Button", "static", "—", "disabled until rows 3–4 are valid"),
  (6, "Sign-out note", "Text", "static", "—", "—"),
  (7, "Expired-link panel", "Container", "FR-003 `reset_status = expired`", "—", "shown instead of the form"),
  (8, "*Send a new link* button", "Button", "static", "—", "—"),
 ],
 st=[
  ("Default", "Form with the account email and two empty password fields (the mockup is pre-filled).", "Valid `reset_token` in the link"),
  ("Empty (no data)", "Not applicable — a form with no data list.", "—"),
  ("Loading", "*Checking your link…* skeleton while the token is verified; after submit the button shows *Saving…* and is disabled.", "Page opens / click *Save new password*"),
  ("Error", "Token expired or already used: the form is replaced by the expired-link panel (rows 7–8). Password too short or fields differ: message under the field; nothing is sent.", "`reset_status = expired` / validation fails"),
  ("Success / confirmation", "*Your password has been changed* (`reset_status = ok`); the user is signed in and taken to `SC-10` after 3 seconds, or at once with *Continue*.", "Supabase Auth accepts the new password"),
 ],
 ix=[
  ("New password fields", "type", "Live strength meter and match check", "stays"),
  ("*Save new password*", "tap", "Sends `reset_token` + `new_password` to Supabase Auth; ends other sessions", "SC-10"),
  ("*Send a new link*", "tap", "Opens the forgot-password form with the email pre-filled", "SC-06"),
  ("*EN | VI* switch", "tap", "Switches interface text; typed passwords are cleared for safety", "stays"),
 ],
 sr=[
  ("The reset token is verified and consumed by **Supabase Auth only**; a used or expired token always shows the expired-link panel.", "SYS BR-004; FR-003"),
  ("The new password follows the sign-up rule: **at least 10 characters**.", "SYS §5.1 FR-003"),
  ("A deactivated account cannot be reactivated through a password reset.", "SYS BR-005"),
  ("After a successful reset, all other sessions of the account are signed out.", "Security"),
 ],
 fr=[("F-SYS-03", "Set a new password with the single-use token"), ("F-SYS-02", "Sign the user in after the reset")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: one column; the expired-link panel takes the place of the form.", RESP_FORM, "Password fields use `autocomplete=new-password` and have a *Show* toggle with an accessible name."],
 oq=[("[NEEDS CLARIFICATION: SEQ-01 has no error branch (email provider down, expired link). Confirm the behaviour written in the edge cases.]", False, "Client (VFDA)", 4)],
), html)

# =====================================================================  23 · SC-08
html = page("SC-08", "My account", "SYS · Member · Added 30/09/2026", "/account", f"""
<div data-n="2"><h1>My account</h1><div class="sub">Your details, sign-in, language and the documents you accepted.</div></div>
<div class="row" style="gap:20px;margin-top:16px;align-items:flex-start">
  <div class="col" style="flex:1.35;gap:16px">
    <div class="card">
      <h2>Profile and organisation</h2>
      <div class="g2">
        {fld(3, "Full name", "Lena Park")}
        {fld(4, "Role in the crew", "Producer ▾")}
        {fld(5, "Organisation / production company", "Harbour Line Films")}
        {fld(6, "Country of headquarters", "South Korea (KR) ▾")}
      </div>
      <div class="row" style="gap:16px;margin-top:12px;align-items:flex-end">
        {fld(7, "Website or company profile", "https://harbourline.example.kr", opt=True, style="flex:1")}
        <span class="btn" data-n="8">Save changes</span>
      </div>
    </div>
    <div class="card">
      <h2>Sign-in</h2>
      <div class="row" style="gap:16px;align-items:flex-end">
        <div data-n="9" style="flex:1"><div class="lab">Email</div><div class="field" style="background:#f6f8fa">lena.park@harbourline.example.kr &nbsp;<span class="pill p-ok">Verified</span></div></div>
        <span class="btn g" data-n="10">Change password</span>
      </div>
      <div class="hint">We email you a single-use link to set a new password.</div>
    </div>
    <div class="card" style="border-color:#eab9b3" data-n="14">
      <h2 style="color:#a52a1f">Delete my account</h2>
      <div class="small" style="color:#3b424c">Your account is <b>deactivated at once</b> and you are signed out everywhere. Within <b>30 days</b> your name and email are replaced by anonymous values.
      Projects, uploads and approvals you created stay for your co-members and VFDA, shown as <i>Former member</i>. This cannot be undone.</div>
      <div class="row" style="gap:14px;margin-top:12px;align-items:flex-end">
        {fld(15, 'Type <span class="kbd">DELETE</span> to confirm', "DELE", style="flex:1")}
        <span class="btn dis" data-n="16">Delete my account</span>
      </div>
    </div>
  </div>
  <div class="col" style="flex:1;gap:16px">
    <div class="card" data-n="11">
      <h2>Language</h2>
      <div class="row" style="gap:8px"><span class="chip">Tiếng Việt</span><span class="chip on">English</span></div>
      <div class="hint">Used for every page and for emails we send you.</div>
    </div>
    <div class="card" data-n="12">
      <h2>Documents you accepted</h2>
      <table class="t"><tr><th>Document</th><th>Version</th><th>Accepted</th></tr>
        <tr><td><span class="lnk">Terms of use</span></td><td>2026-09-draft</td><td>18/09/2026 10:42</td></tr>
        <tr><td><span class="lnk">Privacy policy</span></td><td>2026-09-draft</td><td>18/09/2026 10:42</td></tr></table>
      <div class="hint">Recorded when you created your account.</div>
    </div>
    <div class="card soft" data-n="13">
      <h2>Notifications</h2>
      <div class="small" style="color:#3b424c">You get an in-app notification and an email for every event addressed to you — partner replies, provincial replies, consultation reminders.</div>
      <div style="margin-top:8px"><span class="lnk">Open the notification centre →</span></div>
    </div>
  </div>
</div>
""")

add(dict(
 seq=23, sid="SC-08", name="My account", group="SYS", tier="Added 30/09/2026 — Must",
 module="SYS", actor="Member", prio="Must", route="/account",
 design_note="Details and preferences.",
 new_note="New Screen Spec written 30/09/2026; includes the *Delete my account* area decided on 30/09/2026 (SYS BR-005).",
 shown="A signed-in user clicks their name in the navigation bar and chooses *My account*.",
 leave="The user saves and stays, opens `SC-09`, `SC-42` or `SC-43`, or deletes the account and is signed out to `SC-01`.",
 el=[
  (1, "Navigation bar", "Header", "static; avatar menu", "—", "—"),
  (2, "Title + explanation", "Header", "static", "—", "—"),
  (3, "Full name", "Input", "`full_name`", "Yes", "2–120 characters"),
  (4, "Role in the crew", "Toggle (dropdown)", "`crew_role` — Producer / Director / Production coordinator / Line producer / Other", "Yes", "enum, 5 values"),
  (5, "Organisation / production company", "Input", "`org_name`", "Yes", "2–200 characters"),
  (6, "Country of headquarters", "Toggle (dropdown)", "`country` — ISO 3166-1 alpha-2", "Yes", "only codes from the list"),
  (7, "Website or company profile", "Input", "`website`", "No", "valid URL if provided; ≤ 300 characters"),
  (8, "*Save changes* button", "Button", "static", "—", "enabled only when a field changed and all are valid"),
  (9, "Email (read-only)", "Text", "`email` + `email_verified`", "Yes", "—"),
  (10, "*Change password* button", "Button", "static; sends a reset link (FR-003)", "—", "—"),
  (11, "Language choice", "Toggle", "`locale` — vi / en", "Yes", "enum, 2 values"),
  (12, "Documents you accepted", "Table", "`consent_version` + acceptance timestamp (CONSENT)", "Yes", "read-only"),
  (13, "Notifications block", "Text + link", "static", "—", "—"),
  (14, "*Delete my account* area", "Container", "static explanation of SYS BR-005", "—", "—"),
  (15, "Deletion confirmation", "Input", "client-side only", "Yes (to delete)", "must equal *DELETE* exactly"),
  (16, "*Delete my account* button", "Button", "sets `account_status = deactivated` (FR-004)", "—", "disabled until row 15 matches"),
 ],
 st=[
  ("Default", "All sections filled from the account; *Save changes* disabled until something changes; *Delete my account* disabled.", "Open `/account`"),
  ("Empty (no data)", "Not applicable — every required field was collected at sign-up. An account without an organisation (created before `org_name` became required) shows the field empty with *Please add your organisation*.", "—"),
  ("Loading", "Grey skeleton for each card; on save the button shows *Saving…*; on delete the whole page is locked with *Deleting your account…*.", "Page opens / save / delete"),
  ("Error", "Invalid field: message under it, nothing saved. Save fails: *Your changes were not saved — try again*, typed values kept. Delete fails: *Your account was not deleted* and nothing changes.", "Validation / server error"),
  ("Success / confirmation", "Save: green strip *Changes saved*. Language: the page re-renders in the chosen language. Delete: signed out and taken to `SC-01` with *Your account has been deleted*.", "Save / language change / delete succeeded"),
 ],
 ix=[
  ("*Save changes*", "tap", "Updates `full_name`, `crew_role`, `org_name`, `country`, `website`", "stays"),
  ("*Change password*", "tap", "Sends a single-use reset link to the account email; shows *Check your inbox*", "stays"),
  ("Language chip", "tap", "Saves `locale`, sets the `locale` cookie, re-renders the page", "stays"),
  ("Document link", "tap", "Opens the document version that was accepted", "SC-43 / SC-42"),
  ("*Open the notification centre*", "tap", "—", "SC-09"),
  ("*Delete my account*", "tap", "Sets `account_status = deactivated`, ends every session, schedules anonymisation within 30 days", "SC-01"),
 ],
 sr=[
  ("The email is the sign-in identity and one account per email; it is **shown read-only** here.", "SYS §3 US-1"),
  ("The role is **not shown as editable**; it is set in the database and changed only by an admin.", "SYS BR-002; FR-004"),
  ("*Delete my account* deactivates at once and removes all access; name, email and phone are anonymised within 30 days; projects, uploads, access logs and approvals stay and show *Former member*. **No hard delete.**", "SYS BR-005"),
  ("Deletion requires typing *DELETE* exactly; the button stays disabled until it matches.", "SYS BR-005 (irreversible action)"),
  ("Consent records are read-only; the table lists each accepted document version with its timestamp.", "SYS BR-003"),
 ],
 fr=[("F-SYS-01", "Edit the account details collected at sign-up"), ("F-SYS-03", "Change password by reset link"), ("F-SYS-04", "Deactivate the account (`account_status`)"), ("F-SYS-05", "Choose and remember the interface language")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: one column; order is Profile, Sign-in, Language, Documents, Notifications, Delete.", RESP_FORM, "The delete area is a separate landmark with a heading; the confirmation field states the exact word in its label."],
 oq=[("[NEEDS CLARIFICATION: SYS BR-005 anonymises name, email and phone, but SYS §5.1 has no phone field for an account — which phone field is meant?]", False, "Client (VFDA)"),
     ("[NEEDS CLARIFICATION: May a member turn off email notifications (per event type or all), or is every notification always emailed?]", False, "Client (VFDA)")],
), html)

# =====================================================================  24 · SC-09
def nrow(unread, when, kind, text, proj, first=False):
    n = (lambda x: f' data-n="{x}"') if first else (lambda x: "")
    dot = ('<span style="width:9px;height:9px;border-radius:5px;background:#1f5fbf;display:inline-block"'
           f'{n(6)}></span>') if unread else '<span style="width:9px;display:inline-block"></span>'
    bg = "background:#f5f8fd;" if unread else ""
    act = f'<span class="lnk small"{n(9)}>Mark as read</span>' if unread else '<span class="small muted">Read</span>'
    return f"""<div class="row" style="{bg}gap:14px;align-items:center;padding:13px 16px;border-bottom:1px solid #e8ebee"{n(5)}>
<div style="width:40px;flex:none;display:flex;justify-content:center">{dot}</div>
<div style="flex:1;min-width:0"><div class="small muted"{n(7)}>{kind} · {proj}</div><div style="{'font-weight:700' if unread else ''}">{text}</div></div>
<div class="small muted" style="width:130px;text-align:right">{when}</div>
<div style="width:70px;text-align:right"><span class="btn sm g"{n(8)}>Open</span></div>
<div style="width:92px;text-align:right">{act}</div></div>"""

html = page("SC-09", "Notification centre", "SYS · Member · Added 30/09/2026", "/notifications?unread=0", f"""
<div class="row" style="justify-content:space-between;align-items:flex-end">
  <div data-n="2"><h1>Notifications <span class="pill p-info" style="font-size:13px;vertical-align:middle">3 unread</span></h1><div class="sub">Newest first. Only you can see your notifications.</div></div>
  <span class="btn q" data-n="4">✓ Mark all as read</span>
</div>
<div class="tabs" data-n="3" style="margin-top:14px"><span class="on">All</span><span>Unread (3)</span></div>
<div class="card" style="padding:0;margin-top:14px">
  {nrow(True, "30/09/2026 09:12", "Collaboration request", "Bến Xưa Production Services responded to your request — review and confirm", "The Last Ferry", True)}
  {nrow(True, "29/09/2026 16:40", "Provincial notice", "Ninh Bình replied <i>More info needed</i> to your Provincial People's Committee notice", "The Last Ferry")}
  {nrow(True, "29/09/2026 10:00", "VFDA consultation", "Reminder: consultation with Nguyễn Thị Thu Hà tomorrow, 01/10/2026 at 10:00", "The Last Ferry")}
  {nrow(False, "26/09/2026 14:05", "Collaboration request", "Your request to Đò Ngang Film Services was closed as <i>withdrawn</i> — the organisation is no longer active", "The Last Ferry")}
  {nrow(False, "24/09/2026 08:31", "Provincial notice", "VFDA sent your notice to the Provincial People's Committee of Ninh Bình", "The Last Ferry")}
  {nrow(False, "18/09/2026 10:44", "Account", "Welcome to CINEMATCH — your email is verified", "—")}
</div>
<div class="row" style="justify-content:center;margin-top:14px"><span class="btn q" data-n="10">Show older notifications</span></div>
""")

add(dict(
 seq=24, sid="SC-09", name="Notification centre", group="SYS", tier="Added 30/09/2026 — Must",
 module="SYS", actor="Member", prio="Must", route="/notifications",
 design_note="List of notifications.",
 new_note="New Screen Spec written 30/09/2026. Partner and VFDA roles use the same screen for their own notifications.",
 shown="A signed-in user opens *Notifications* from the avatar menu, follows the link in a notification email, or clicks *Open the notification centre* on `SC-08`.",
 leave="The user opens a notification and goes to the screen it is about (e.g. `SC-25`, `SC-32`, `SC-33`), or stays after marking notifications as read.",
 el=[
  (1, "Navigation bar", "Header", "static", "—", "—"),
  (2, "Title + unread count", "Header", "FR-009 `unread_count`", "Yes", "—"),
  (3, "*All* / *Unread* filter", "Toggle", "FR-009 `unread_only`", "No", "boolean; kept in the URL"),
  (4, "*Mark all as read* button", "Button", "sets `read_at` on every unread notification of the user", "—", "hidden when `unread_count` = 0"),
  (5, "Notification row", "List", "FR-009 `notification`, newest first by `created_at`", "Yes", "only the user's own (`recipient_id`)"),
  (6, "Unread marker", "Icon", "`read_at` is empty", "—", "text alternative *Unread*"),
  (7, "Event label + project", "Text", "`event_type` (readable label) + project name from `payload`", "Yes", "—"),
  (8, "*Open* button", "Button", "target screen from `payload`", "—", "—"),
  (9, "*Mark as read* link", "Link", "sets `read_at`", "—", "shown on unread rows only"),
  (10, "*Show older notifications*", "Button", "next page of FR-009 `notification`", "—", "hidden when no older rows"),
 ],
 st=[
  ("Default", "Up to 20 notifications, newest first; unread rows tinted and bold with a blue marker; unread count in the title.", "Open `/notifications`"),
  ("Empty (no data)", "*No notifications yet — we'll tell you when a partner, a province or VFDA replies.* With the *Unread* filter and nothing unread: *You're all caught up*.", "No notifications / no unread ones"),
  ("Loading", "Six grey skeleton rows; *Show older notifications* shows a spinner while loading.", "Page opens / next page"),
  ("Error", "*We couldn't load your notifications — try again* with a *Retry* button; marking as read fails: the row returns to unread with a short message.", "Query or update fails"),
  ("Success / confirmation", "After *Mark all as read*: every row turns to *Read*, the count disappears, and a short strip reads *All notifications marked as read*.", "Update succeeded"),
 ],
 ix=[
  ("*Unread* tab", "tap", "Reloads with `unread_only = true`", "stays"),
  ("*Mark all as read*", "tap", "Sets `read_at` for all unread; count goes to 0", "stays"),
  ("*Open* on a collaboration-request row", "tap", "Marks as read, opens the request", "SC-25"),
  ("*Open* on a provincial-notice row", "tap", "Marks as read, opens the project's provinces page", "SC-32"),
  ("*Open* on a consultation row", "tap", "Marks as read, opens the booking", "SC-33"),
  ("*Mark as read*", "tap", "Sets `read_at` for that row", "stays"),
  ("*Show older notifications*", "tap", "Loads the next 20", "stays"),
 ],
 sr=[
  ("A user reads **only their own** notifications; enforced by Row Level Security on `recipient_id`.", "SYS BR-001; FR-009"),
  ("Notifications are listed **newest first** with an unread count.", "SYS §3 US-4"),
  ("Every event addressed to a user creates exactly one in-app notification; the matching email is sent separately and may be retried.", "SYS FR-007; FR-008"),
  ("A notification about an archived project opens it **read-only**; one about a deactivated organisation still opens the closed request.", "M0 BR-005; M4 BR-008"),
 ],
 fr=[("F-SYS-07", "Show the in-app notifications created for the user"), ("F-SYS-09", "List newest first, unread filter, mark as read")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: date moves under the text; *Open* becomes a tap on the whole row; *Mark as read* moves into a row menu.", "The unread marker has a text alternative; the unread count is announced when it changes (`aria-live=polite`).", "The list is a real `<ul>`; each row is reachable with the keyboard."],
 oq=[("[NEEDS CLARIFICATION: Which `event_type` values exist in the MVP and what readable label does each get? SYS §5.1 declares the field but not its values.]", False, "Group C")],
), html)


# =====================================================================  policy / terms helpers
def legal_head(k2, title):
    return f"""
<div class="row" style="justify-content:space-between;align-items:flex-start">
  <div data-n="2" style="max-width:760px"><h1>{title}</h1>
    <div class="banner b-warn" style="margin-top:8px"><b>Draft for review by the VFDA Legal Board</b> — this text is a placeholder and is not yet in force.</div></div>
  <div class="col" style="gap:10px;align-items:flex-end">
    <div class="row" style="gap:6px" data-n="4"><span class="chip">Tiếng Việt</span><span class="chip on">English</span></div>
    <div class="small muted" data-n="3" style="text-align:right">Version <b>2026-09-draft</b> · dated 30/09/2026<br>Effective date: <i>to be set on approval</i> · <span class="lnk">Earlier versions</span></div>
  </div>
</div>"""


def toc(k, items):
    li = "".join(f'<div style="padding:5px 0"><span class="lnk">{i + 1}. {t}</span></div>' for i, t in enumerate(items))
    return f'<div class="card soft" data-n="{k}" style="width:250px;flex:none;padding:12px 14px"><div class="lab">On this page</div>{li}</div>'


def sec(i, title, body, k=None):
    return f'<div{dn(k)} style="margin-bottom:14px"><h3>{i}. {title}</h3><div style="font-size:13.5px;color:#3b424c">{body}</div></div>'


# =====================================================================  25 · SC-42
P_TOC = ["Who we are", "What we collect", "Data stored without personal data", "Who can see your data", "Deleting your account", "Your consent"]
html = page("SC-42", "Privacy policy", "SYS · Guest · Added 30/09/2026", "/privacy", f"""
{legal_head(2, "Privacy policy")}
<div class="row" style="gap:26px;margin-top:18px;align-items:flex-start">
  {toc(5, P_TOC)}
  <div style="flex:1;min-width:0">
    <div data-n="6">
      {sec(1, "Who we are", "CINEMATCH is operated for the Vietnam Film Development Association (VFDA) to help film crews prepare a shoot in Vietnam.")}
      {sec(2, "What we collect", "When you create an account: your full name, work email, company name, country, crew role and, if you give it, your website. We also keep the projects and documents you add.")}
    </div>
    <div class="card soft" data-n="7" style="margin-bottom:14px">
      <h3>3. Data stored without personal data</h3>
      <div style="font-size:13.5px;color:#3b424c">Texts you submit to the content pre-check and the scene searches you confirm are stored <b>without your name, email or any other personal data</b>. Scene searches feed only aggregate statistics about what producers look for, and are never used to train a model.</div>
    </div>
    {sec(4, "Who can see your data", "Your projects are visible only to their members. Local authority contacts and partners' private information are filtered in the database by role, not only hidden on screen.")}
    <div class="card" data-n="8" style="margin-bottom:14px">
      <h3>5. Deleting your account</h3>
      <div style="font-size:13.5px;color:#3b424c">You can delete your account in <span class="lnk">My account</span>. It is deactivated at once; your name, email and phone are replaced by anonymous values within 30 days. Projects, uploads and approvals stay for the other people who rely on them and show <i>Former member</i>.</div>
    </div>
    <div class="card hl" data-n="9">
      <h3>6. Your consent</h3>
      <div style="font-size:13.5px;color:#3b424c">You accept this policy when you <span class="lnk">create an account</span>. We record the <b>version</b> you accepted and the <b>date and time</b>. If you are signed in, your record is shown in <span class="lnk">My account</span>.</div>
    </div>
  </div>
</div>
""", logged=False, footer=FOOT)

add(dict(
 seq=25, sid="SC-42", name="Privacy policy", group="SYS", tier="Added 30/09/2026 — Must",
 module="SYS", actor="Guest", prio="Must", route="/privacy",
 design_note="Bilingual, consent recorded.",
 new_note="New Screen Spec written 30/09/2026. The policy text in the mockup is a short placeholder, marked as a draft for review by the VFDA Legal Board.",
 shown="Anyone clicks *Privacy policy* in the page footer, in the consent line of `SC-04`, or in *Documents you accepted* on `SC-08`.",
 leave="The reader goes back, opens `SC-04` to create an account, `SC-08` to delete an account, or `SC-43`.",
 el=[
  (1, "Navigation bar", "Header", "static; logged out or in", "—", "—"),
  (2, "Title + draft banner", "Header", "static; banner shown while the version is a draft", "Yes", "—"),
  (3, "Version and date", "Text", "document version = `consent_version` value; date of the version", "Yes", "≤ 20 characters"),
  (4, "Language switch VI / EN", "Toggle", "`locale`", "Yes", "enum vi / en"),
  (5, "Table of contents", "List", "section headings of the current version", "—", "—"),
  (6, "Policy sections", "Text", "policy text of the current version, per `locale`", "Yes", "both languages must exist before publishing"),
  (7, "*Data stored without personal data* section", "Text", "static text of the current version", "Yes", "—"),
  (8, "*Deleting your account* section", "Text + link", "static text of the current version", "Yes", "—"),
  (9, "*Your consent* box", "Text + link", "signed in: `consent_version` + acceptance timestamp; guest: explanation", "Yes", "—"),
 ],
 st=[
  ("Default", "Current version in the user's language, table of contents on the left, draft banner while the Legal Board has not approved it.", "Open `/privacy`"),
  ("Empty (no data)", "Not applicable — the page is static text; publishing requires both language versions.", "—"),
  ("Loading", "Not applicable — the page is rendered on the server with its text; switching language reloads it in place.", "—"),
  ("Error", "Requested earlier version not found: *This version does not exist — showing the current version*.", "Unknown `?version=` parameter"),
  ("Success / confirmation", "Signed in: the consent box reads *You accepted version 2026-09-draft on 18/09/2026 at 10:42*.", "Signed-in user with a consent record"),
 ],
 ix=[
  ("Language switch", "tap", "Shows the same version in the other language, keeps the scroll position", "stays"),
  ("Table of contents entry", "tap", "Scrolls to the section", "stays"),
  ("*Earlier versions*", "tap", "Lists past versions with dates; opens one read-only", "stays"),
  ("*My account* link", "tap", "Signed in: opens the account page; guest: log in first", "SC-08"),
  ("*create an account* link", "tap", "—", "SC-04"),
  ("Footer *Terms of use*", "tap", "—", "SC-43"),
 ],
 sr=[
  ("Acceptance is stored with the **document version and timestamp**; the page always shows which version is current.", "SYS BR-003"),
  ("Pre-check texts and confirmed scene searches are described as **stored without personal data** and never used to train a model.", "M3 BR-009; M2 FR-007"),
  ("Account deletion is described exactly as decided: deactivated at once, anonymised within 30 days, records kept as *Former member*.", "SYS BR-005"),
  ("The text is shown in Vietnamese and English; a version is published only when both languages exist.", "SYS FR-005; FR-006"),
  ("The text is a **draft** until approved by the VFDA Legal Board; the draft banner stays until then.", "Group C decision 30/09/2026"),
 ],
 fr=[("F-SYS-01", "Policy accepted at sign-up; version recorded in `consent_version`"), ("F-SYS-05", "Show the policy in Vietnamese or English")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the table of contents becomes a collapsible *On this page* menu above the text.", "Headings use a proper outline (`h1` → `h3`) so screen readers can jump between sections.", "Line length is kept under about 80 characters for readability."],
 oq=[("[NEEDS CLARIFICATION: How long are pre-check texts kept, and may they be used to improve the rule base? (same question as spec-M2.md question 6)]", True, "Client (VFDA)"),
     ("[NEEDS CLARIFICATION: Does one `consent_version` cover both the privacy policy and the terms of use, or does each document need its own version and acceptance record?]", False, "Client (VFDA Legal Board)")],
), html)

# =====================================================================  26 · SC-43
T_TOC = ["Who may use CINEMATCH", "Accounts and roles", "Information, not legal approval", "Partner content", "Ending your account", "Acceptance"]
html = page("SC-43", "Terms of use", "SYS · Guest · Added 30/09/2026", "/terms", f"""
{legal_head(2, "Terms of use")}
<div class="row" style="gap:26px;margin-top:18px;align-items:flex-start">
  {toc(5, T_TOC)}
  <div style="flex:1;min-width:0">
    <div data-n="6">
      {sec(1, "Who may use CINEMATCH", "Film professionals preparing or supporting a shoot in Vietnam. You must give true details about yourself and your company.")}
      {sec(2, "Accounts and roles", "A new account is a member account. Partner, VFDA staff, Legal Board and admin roles are granted only by a VFDA admin; every grant is recorded.")}
      {sec(3, "Information, not legal approval", "Checks and checklists help you prepare. They cite rules written by the VFDA Legal Board, but only the competent authority approves a permit.")}
      {sec(4, "Partner content", "Profile text and photos published by partners are reviewed by VFDA before they are shown; the last approved version stays public meanwhile.")}
      {sec(5, "Ending your account", "You may delete your account at any time in <span class='lnk'>My account</span>. VFDA may deactivate an account that breaks these terms. Accounts are deactivated, never erased; see the <span class='lnk'>Privacy policy</span>.")}
    </div>
    <div class="card hl" data-n="7">
      <h3>6. Acceptance</h3>
      <div style="font-size:13.5px;color:#3b424c">You accept these terms by ticking the box when you <span class="lnk">create an account</span>. We record the version and the date and time you accepted.</div>
      <div class="banner b-info" style="margin-top:10px" data-n="8">Signed in as Lena Park: you accepted version <b>2026-09-draft</b> on 18/09/2026 at 10:42.</div>
    </div>
  </div>
</div>
""", logged=True, footer=FOOT)

add(dict(
 seq=26, sid="SC-43", name="Terms of use", group="SYS", tier="Added 30/09/2026 — Must",
 module="SYS", actor="Guest", prio="Must", route="/terms",
 design_note="Bilingual.",
 new_note="New Screen Spec written 30/09/2026. The terms text in the mockup is a short placeholder, marked as a draft for review by the VFDA Legal Board. The mockup shows a signed-in visitor so the acceptance record (row 8) is visible.",
 shown="Anyone clicks *Terms of use* in the page footer, in the consent line of `SC-04`, or in *Documents you accepted* on `SC-08`.",
 leave="The reader goes back, opens `SC-04` to create an account, `SC-08`, or `SC-42`.",
 el=[
  (1, "Navigation bar", "Header", "static; logged out or in", "—", "—"),
  (2, "Title + draft banner", "Header", "static; banner shown while the version is a draft", "Yes", "—"),
  (3, "Version and date", "Text", "document version = `consent_version` value; date of the version", "Yes", "≤ 20 characters"),
  (4, "Language switch VI / EN", "Toggle", "`locale`", "Yes", "enum vi / en"),
  (5, "Table of contents", "List", "section headings of the current version", "—", "—"),
  (6, "Terms sections", "Text", "terms text of the current version, per `locale`", "Yes", "both languages must exist before publishing"),
  (7, "*Acceptance* section", "Text + link", "static text of the current version", "Yes", "—"),
  (8, "Acceptance record", "Text", "`consent_version` + acceptance timestamp of the signed-in user", "—", "shown to signed-in users only"),
 ],
 st=[
  ("Default", "Current version in the user's language, table of contents, draft banner while not approved.", "Open `/terms`"),
  ("Empty (no data)", "Not applicable — static text; a version is published only with both languages.", "—"),
  ("Loading", "Not applicable — rendered on the server with its text.", "—"),
  ("Error", "Requested earlier version not found: *This version does not exist — showing the current version*.", "Unknown `?version=` parameter"),
  ("Success / confirmation", "Signed in: row 8 shows the version and time the user accepted. If that is older than the current version, it reads *You accepted an earlier version (…)* with a link to it.", "Signed-in user with a consent record"),
 ],
 ix=[
  ("Language switch", "tap", "Shows the same version in the other language, keeps the scroll position", "stays"),
  ("Table of contents entry", "tap", "Scrolls to the section", "stays"),
  ("*My account* link", "tap", "Signed in: opens the account page; guest: log in first", "SC-08"),
  ("*Privacy policy* link", "tap", "—", "SC-42"),
  ("*create an account* link", "tap", "—", "SC-04"),
 ],
 sr=[
  ("Acceptance is recorded with the **version and timestamp** at sign-up; the terms box on `SC-04` must be ticked to create an account.", "SYS BR-003; FR-001"),
  ("The text states that partner and VFDA roles are granted only by an admin.", "SYS BR-002"),
  ("The text never calls a check result *approved*, *accepted*, *legally compliant* or *safe*.", "M2 BR-003"),
  ("The text matches the decided behaviour for partner content and account deletion.", "M10 BR-001; SYS BR-005"),
  ("The text is a **draft** until approved by the VFDA Legal Board; shown in Vietnamese and English.", "SYS FR-005; Group C decision 30/09/2026"),
 ],
 fr=[("F-SYS-01", "Terms accepted at sign-up; version recorded in `consent_version`"), ("F-SYS-05", "Show the terms in Vietnamese or English")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the table of contents becomes a collapsible *On this page* menu above the text.", "Headings use a proper outline (`h1` → `h3`).", "The acceptance record is plain text, not colour-only."],
 oq=[("[NEEDS CLARIFICATION: When the terms get a new version, must existing members accept it again (e.g. at their next sign-in) before continuing?]", False, "Client (VFDA Legal Board)")],
), html)
