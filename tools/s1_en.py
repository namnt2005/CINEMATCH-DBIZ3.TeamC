# -*- coding: utf-8 -*-
"""Screens 1–7: Onboarding, M0, M2 (content input & results)."""
from base import page, gauge

SCREENS = []


def add(spec, html):
    SCREENS.append((spec, html))


# =====================================================================  1 · SC-01
html = page("SC-01", "Landing — Introduction", "Onboarding · M1 · Guest · Tier 1 · #1", "/", f"""
<div class="row" style="gap:40px;align-items:stretch">
  <div style="flex:1.25" class="col">
    <div class="small muted" style="letter-spacing:.08em;text-transform:uppercase">For international film crews shooting in Vietnam</div>
    <h1 data-n="4" style="font-size:34px;line-height:1.2;max-width:620px">Know everything you need to shoot in Vietnam — before you book your flights.</h1>
    <p data-n="5" class="sub" style="font-size:16px;max-width:600px;margin:0">Permits, locations, the mandatory local partner and submission deadlines — all in one progress board for your project.</p>
    <div class="row" style="gap:12px;margin-top:6px">
      <span class="btn" data-n="6" style="height:44px;font-size:15px">Get started — 4 questions, 1 minute →</span>
      <span class="btn g" data-n="7" style="height:44px;font-size:15px">Quick content check · no sign-up needed</span>
    </div>
    <div class="banner b-info" data-n="9" style="margin-top:10px;max-width:640px">
      <b>Why prepare early?</b> Under Article 13 of the Cinema Law 2022 (Law No. 05/2022/QH15), foreign crews must have a service agreement with a Vietnamese entity, submit the script of the scenes shot in Vietnam in Vietnamese, and obtain a permit from the Ministry of Culture, Sports and Tourism (MoCST) — processing takes <b>20 days</b> from receipt of a complete, valid dossier.
    </div>
  </div>
  <div style="flex:1" class="card soft" data-n="8">
    <h2 style="margin-bottom:12px">Four things every film crew is unsure about</h2>
    <div class="col" style="gap:10px">
      <div class="card"><b>Does our content run into any regulations?</b><div class="sub">→ Content pre-check against a VFDA-approved rule set</div></div>
      <div class="card"><b>Where should we shoot each scene?</b><div class="sub">→ Describe the scene, get locations with match reasons</div></div>
      <div class="card"><b>Who is the Vietnamese partner named on the contract?</b><div class="sub">→ Supplier directory with the VFDA Verified badge</div></div>
      <div class="card"><b>What is the latest date to submit the dossier?</b><div class="sub">→ Countdown from your first shooting day</div></div>
    </div>
  </div>
</div>
<div class="hr" style="margin:26px 0 18px"></div>
<h2>Your journey on CINEMATCH</h2>
<div class="g5" data-n="10" style="margin-top:8px">
  <div class="card"><div class="pill p-info">Step 1</div><h3 style="margin-top:8px">Identify your segment</h3><div class="sub small">A · B · C decides the paperwork you need</div></div>
  <div class="card"><div class="pill p-info">Step 2</div><h3 style="margin-top:8px">Pre-check content</h3><div class="sub small">Spot points of attention early</div></div>
  <div class="card"><div class="pill p-info">Step 3</div><h3 style="margin-top:8px">Choose locations</h3><div class="sub small">Based on your scene descriptions</div></div>
  <div class="card"><div class="pill p-info">Step 4</div><h3 style="margin-top:8px">Confirm a Vietnamese partner</h3><div class="sub small">The entity named on the agreement</div></div>
  <div class="card"><div class="pill p-info">Step 5</div><h3 style="margin-top:8px">Submit the dossier on time</h3><div class="sub small">All 4 components, bilingual</div></div>
</div>
<div class="row" data-n="11" style="margin-top:20px;align-items:center;gap:12px">
  <div class="ph" style="width:64px;height:40px">logo</div>
  <div class="sub">Operated with <b>VFDA</b>. The legal rule set is drafted and signed off by the VFDA Legal Board; location data is verified by VFDA.</div>
</div>
""", active=None, logged=False, lang_n=2, auth_n=3,
footer='<div class="foot" data-n="12"><span>Privacy policy</span><span>Terms of use</span><span>Contact VFDA</span><span style="margin-left:auto">© CINEMATCH</span></div>')

add(dict(
 seq=1, sid="SC-01", name="Landing — Introduction", group="Onboarding", tier="Tier 1 — Must",
 module="M1", actor="Guest", prio="Must", route="/",
 design_note="Convey the positioning \"removing uncertainty\", not \"location lookup\".",
 shown="The user opens `cinematch.vn` for the first time — from search, from a link sent by VFDA, or from a film promotion event.",
 leave="The user clicks *Get started* (to the segment router `SC-02`) or *Quick content check* (to `SC-03`).",
 el=[
  (1, "Navigation bar", "Header", "static: CINEMATCH · Locations · Partners · Permits · My projects", "—", "—"),
  (2, "Language switch EN | VI", "Toggle", "static; value stored in the `locale` cookie", "—", "accepts only `en` / `vi`"),
  (3, "Log in / Sign up", "Button", "static; shown only when not logged in", "—", "—"),
  (4, "Positioning headline", "Header", "static, bilingual, from the display dictionary `F-SYS-06`", "Yes", "—"),
  (5, "Lead sentence", "Text", "static, bilingual", "Yes", "—"),
  (6, "*Get started — 4 questions, 1 minute* button", "Button", "static", "—", "—"),
  (7, "*Quick content check* button", "Button", "static", "—", "—"),
  (8, "*Four things every film crew is unsure about* block", "List", "static: 4 questions → 4 modules (M2, M3, M4, M5)", "Yes", "exactly 4 items, each with one question and one entry point"),
  (9, "Article 13 legal basis strip", "Text", "static; wording approved by the VFDA Legal Board", "Yes", "must quote Article 13 of the Cinema Law 2022 and the 20-day deadline accurately"),
  (10, "5-step journey", "List", "static", "—", "fixed order 1→5"),
  (11, "VFDA partnership line", "Text + Image", "static; VFDA logo (once permitted)", "—", "—"),
  (12, "Footer", "List", "static: Privacy policy · Terms · Contact VFDA", "—", "—"),
 ],
 st=[
  ("Default", "Positioning headline on the left, the four-uncertainties block on the right, Article 13 strip, 5-step journey, VFDA line, footer — exactly as in the mockup.", "Page opens"),
  ("Empty (no data)", "**Not applicable** — all content is static and server-rendered; there is no list that can be empty.", "—"),
  ("Loading", "**Not applicable** to the main content (static page). Only the button being clicked switches to a pending state during navigation.", "Click a button"),
  ("Error", "If the VFDA logo fails to load: show the text *VFDA* instead of the image, no broken frame. Navigation errors use the system's generic error page.", "Image error / network error"),
  ("Success / confirmation", "**Not applicable** — the page writes no data. Goes straight to `SC-02` or `SC-03`.", "—"),
 ],
 ix=[
  ("*Get started* button", "tap", "Opens the segment router", "SC-02"),
  ("*Quick content check* button", "tap", "Opens the pre-check form, no login required", "SC-03"),
  ("*Where should we shoot each scene?* item", "tap", "Opens the scene description box", "SC-15"),
  ("*Who is the Vietnamese partner…* item", "tap", "Opens the partner directory", "SC-19"),
  ("*What is the latest date…* item", "tap", "No project yet → opens the router to create a project first", "SC-02"),
  ("Log in / Sign up", "tap", "—", "SC-04"),
  ("EN | VI", "tap", "Switches language, keeps scroll position", "stays"),
  ("Footer", "tap", "—", "SC-42 / SC-43"),
 ],
 sr=[
  ("The first message is **removing uncertainty**, not *location lookup*. The location search box does **not** appear on the landing page.", "Screen list file — note #1"),
  ("Each item in the *Four things every film crew is unsure about* block must lead to exactly one live module. Modules not yet built must not be promoted on the landing page.", "No-empty-promises principle"),
  ("The Article 13 strip only states the provision whose wording has been approved by the VFDA Legal Board; no further interpretation.", "TL3 — division of responsibilities"),
  ("Two primary buttons: one leads into the router (high commitment), one lets users try immediately without signing up (low commitment).", "TL4 §3"),
  ("The page is statically pre-rendered on the server (SSG) so search engines can read it; `hreflang` tags for both languages.", "TL4 §7"),
 ],
 fr=[("F-M1-01", "Entry to the segment router"), ("F-M2-05", "Entry to the pre-check without login"), ("F-SYS-05", "VI/EN language switch"), ("F-SYS-06", "Bilingual content from the display dictionary")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the *Four things every film crew is unsure about* block moves below the headline; the two buttons stack vertically at full width; the 5-step journey becomes a vertical list.", "Headline at least 28px on phones; text contrast ≥ 4.5:1.", "Both buttons are real `<a>` elements, reachable with Tab in reading order."],
 oq=[("[NEEDS CLARIFICATION: does VFDA allow its logo and association name on the landing page, and what is the official wording]", True),
     ("[NEEDS CLARIFICATION: default language on a guest's first visit — follow the browser, or always EN since the main users are international crews]", False)],
), html)

# =====================================================================  2 · SC-04
html = page("SC-04", "Sign up / Log in", "Onboarding · M-SYS · Guest · Tier 1 · #2", "/signup", f"""
<div class="row" style="gap:40px;align-items:flex-start">
  <div style="flex:1;padding-top:10px" class="col" data-n="1">
    <h1 style="font-size:28px">A free account for film crews</h1>
    <div class="sub" style="font-size:15px">An account unlocks what guests can't see:</div>
    <div class="col" style="gap:8px;margin-top:4px">
      <div class="card soft"><b>Local authority contacts</b><div class="sub small">Verified by VFDA, linked to each location</div></div>
      <div class="card soft"><b>Send collaboration requests</b><div class="sub small">To Vietnamese suppliers eligible to sign the service agreement</div></div>
      <div class="card soft"><b>Project progress board</b><div class="sub small">Five gauges, countdown, bilingual document kit</div></div>
    </div>
  </div>
  <div style="flex:1.05" class="card" >
    <div class="tabs" data-n="2"><span class="on">Create account</span><span>Log in</span></div>
    <div class="col" style="gap:12px;margin-top:16px">
      <div class="g2">
        <div data-n="3"><div class="lab">Full name</div><div class="field">Lena Park</div></div>
        <div data-n="4"><div class="lab">Work email</div><div class="field">lena@harbourline.kr</div></div>
      </div>
      <div data-n="5"><div class="lab">Password</div><div class="field">••••••••••••</div><div class="hint">At least 10 characters · <span class="ok">✓ strong</span></div></div>
      <div class="g2">
        <div data-n="6"><div class="lab">Organisation / production company</div><div class="field">Harbour Line Films</div></div>
        <div data-n="7"><div class="lab">Country of headquarters</div><div class="field">South Korea ▾</div></div>
      </div>
      <div class="g2">
        <div data-n="8"><div class="lab">Role in the crew</div><div class="field">Producer ▾</div></div>
        <div data-n="9"><div class="lab">Website or company profile <span class="opt">(optional)</span></div><div class="field ph">https://…</div></div>
      </div>
      <div data-n="10" class="row" style="gap:8px;align-items:flex-start"><span style="width:16px;height:16px;border:1.5px solid #0d366b;background:#0d366b;border-radius:3px;flex:none;margin-top:2px"></span><span class="small">I agree to the <span class="lnk">Terms of use</span> and <span class="lnk">Privacy policy</span>.</span></div>
      <span class="btn" data-n="11" style="height:42px">Create account</span>
      <div class="small muted" data-n="13">Already have an account? <span class="lnk">Log in</span></div>
      <div class="hr" style="margin:4px 0"></div>
      <div class="small" data-n="12"><b>Are you a service supplier in Vietnam?</b> Partner accounts are invited and verified by VFDA. <span class="lnk">Contact VFDA for an invitation →</span></div>
    </div>
  </div>
</div>
""", logged=False, nav_n=None)

add(dict(
 seq=2, sid="SC-04", also="SC-05", name="Sign up / Log in", group="Onboarding", tier="Tier 1 — Must",
 module="M-SYS", actor="Guest", prio="Must", route="/signup · /login",
 design_note="Also collect organisation / production company details.",
 merge_note="This screen merges `SC-04 Sign up` and `SC-05 Log in` per the screen list file (#2). Both share one layout and differ only in the selected tab. Routes stay separate: `/signup` opens the *Create account* tab, `/login` opens the *Log in* tab. `SC-05` has no separate image file.",
 shown="A guest clicks *Log in* / *Sign up* in the navigation bar, or is redirected here when using a feature that requires an account (viewing contacts, sending requests, saving results).",
 leave="Account created and email verified, or login successful — returns to the page that led here (the `next` parameter); defaults to `SC-02` for new accounts and `SC-10` for existing ones.",
 el=[
  (1, "Account value block", "List", "static: 3 benefits", "—", "—"),
  (2, "*Create account* / *Log in* tabs", "Toggle", "static; tab selected by route", "—", "—"),
  (3, "Full name", "Input", "`profiles.full_name`", "Yes", "2–80 characters"),
  (4, "Work email", "Input", "`auth.users.email`", "Yes", "email format; not already in the system"),
  (5, "Password", "Input (password)", "sent directly to Supabase Auth, not stored by the app", "Yes", "≥ 10 characters; strength meter"),
  (6, "Organisation / production company", "Input", "`organizations_producer.name`", "Yes", "2–120 characters"),
  (7, "Country of headquarters", "Toggle (dropdown)", "`organizations_producer.country` — ISO 3166-1 alpha-2 code", "Yes", "only codes from the list"),
  (8, "Role in the crew", "Toggle (dropdown)", "`profiles.crew_role` — Producer / Director / Production coordinator / Line producer / Other", "Yes", "enum"),
  (9, "Website or company profile", "Input", "`organizations_producer.website`", "No", "valid URL if provided"),
  (10, "Terms consent checkbox", "Toggle (checkbox)", "`consents` — stores terms version and timestamp", "Yes", "must be ticked to enable the Create account button"),
  (11, "*Create account* button", "Button", "static", "—", "disabled while any required field is invalid"),
  (12, "Entry for Vietnamese suppliers", "Text + link", "static", "—", "—"),
  (13, "*Already have an account? Log in* line", "Text + link", "static", "—", "—"),
 ],
 st=[
  ("Default", "*Create account* tab open, empty form (the mockup is pre-filled for illustration). On the *Log in* tab: Email, Password, a *Forgot password?* link (→ `SC-06`), and a *Log in* button.", "Open `/signup` or `/login`"),
  ("Empty (no data)", "**Not applicable** — a form with no data list.", "—"),
  ("Loading", "The *Create account* button changes to *Creating…* and is disabled; all fields are temporarily locked to prevent double submission.", "Click Create account / Log in"),
  ("Error", "Errors under each field (e.g. *This email already has an account — Log in?*). Wrong password: *Email or password is incorrect* — without saying which one. Entered data is kept, except the password.", "Zod validation fails / Supabase Auth returns an error"),
  ("Success / confirmation", "*Check your inbox* screen: *We've sent a verification link to lena@harbourline.kr*, with a *Resend* button (locked for 60 seconds).", "Account created"),
 ],
 ix=[
  ("*Log in* tab", "tap", "Switches form, changes URL to `/login`", "SC-05 (same layout)"),
  ("Email field", "type", "Validates format on blur", "stays"),
  ("*Create account* button", "tap", "Calls Supabase Auth `signUp`, creates `profiles` + `organizations_producer`", "stays (Check your inbox screen)"),
  ("Verification link in the email", "tap", "Verifies and creates a login session", "SC-02"),
  ("*Forgot password?* (Log in tab)", "tap", "—", "SC-06"),
  ("Terms / Policy links", "tap", "Open in a new tab", "SC-43 / SC-42"),
  ("*Contact VFDA for an invitation*", "tap", "Opens the booking form with topic *General* (`general`) and the note *Supplier registration*", "SC-33"),
 ],
 sr=[
  ("Passwords, password hashing and JWTs are **handled by Supabase Auth**; the app does not implement them itself.", "TL5 §M-SYS"),
  ("The default role after sign-up is `member`. **There is no self-registration path for the `partner` role** — suppliers are invited and verified by VFDA.", "TL4 §8"),
  ("Organisation details are mandatory: VFDA needs to know *which organisation* is preparing to shoot, not just *which person*.", "Screen list file — note #2"),
  ("Terms consent is stored with the document **version** and timestamp, so it can be proven later.", "Personal data protection"),
  ("After login, return to the page that led here (`next`); accept internal paths only, to block open redirects.", "Security"),
 ],
 fr=[("F-SYS-01", "Account sign-up"), ("F-SYS-02", "Log in"), ("F-SYS-03", "Forgot password entry"), ("F-SYS-04", "Assign default role `member`"), ("F-SYS-08", "Verification email")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the value block on the left collapses into a one-line summary above the form; two-column field pairs stack into one column.", "Every field has a real `<label>` and the correct `autocomplete` value (`email`, `new-password`, `organization`).", "Error messages are linked via `aria-describedby` and announced when they appear."],
 oq=[("[NEEDS CLARIFICATION: should the production organisation be verified (e.g. via IMDb Pro or a business licence) before local authority contacts are shown]", True),
     ("[NEEDS CLARIFICATION: allow Google / Apple sign-in — less friction, but the organisation name is not captured up front]", False)],
), html)

# =====================================================================  3 · SC-02
q = lambda n, t, opts, sel, multi=False: f"""
<div class="card" data-n="{n}"><div class="row" style="justify-content:space-between"><div class="small muted">Question {n-2} / 4</div><span class="lnk small" {'data-n="7"' if n==3 else ''}>Edit</span></div>
<h3 style="margin-top:4px">{t}</h3><div class="row" style="gap:6px;flex-wrap:wrap">{''.join(f'<span class="chip {"on" if o in sel else ""}">{"☑ " if multi and o in sel else ("☐ " if multi else "")}{o}</span>' for o in opts)}</div></div>"""
html = page("SC-02", "Segment router + A/B/C result", "Onboarding · M1 · Guest · Tier 1 · #3", "/start", f"""
<div class="row" style="justify-content:space-between;align-items:center;margin-bottom:14px">
  <div><h1>Which segment is your project in?</h1><div class="sub">Your segment decides which paperwork you need. You can always change it.</div></div>
  <div data-n="2" style="width:220px"><div class="small muted" style="text-align:right">4 / 4 answered</div><div class="bar"><i style="width:100%"></i></div></div>
</div>
<div class="row" style="gap:22px">
  <div class="col" style="flex:1">
    {q(3, "Will you shoot scenes in Vietnam?", ["Yes", "No — only hiring people or services"], ["Yes"])}
    {q(4, "Where will the film mainly be released?", ["Outside Vietnam", "In Vietnam", "Both"], ["Outside Vietnam"])}
    {q(5, "Who is the producing entity?", ["Foreign company", "Vietnamese company", "Co-production"], ["Foreign company"])}
    {q(6, "What do you need from Vietnam?", ["Locations", "Crew", "Cast", "Equipment", "Logistics"], ["Locations", "Crew", "Logistics"], True)}
  </div>
  <div class="col" style="flex:1.1">
    <div class="card hl" data-n="8">
      <div class="small muted">Result</div>
      <div class="row" style="align-items:center;gap:12px;margin:4px 0 6px"><span style="font-size:40px;font-weight:800;color:#0d366b;line-height:1">A</span><h2 style="margin:0;font-size:20px">Shoot in Vietnam, release abroad</h2></div>
      <div class="small" data-n="9" style="color:#3b424c">Based on answers <b>1, 2 and 3</b>. Question 4 is only used to suggest partners.</div>
      <div class="hr"></div>
      <div data-n="10">
        <h3>What this means</h3>
        <div class="col" style="gap:5px;font-size:13.5px">
          <div><span class="ok">Required</span> · Permit to provide filmmaking services to foreign parties (Article 13)</div>
          <div><span class="ok">Required</span> · Service agreement with a Vietnamese entity</div>
          <div><span class="ok">Required</span> · Script of the scenes shot in Vietnam, in Vietnamese</div>
          <div><span class="muted" style="font-weight:700">Not required</span> · Film classification for distribution in Vietnam (segment B)</div>
        </div>
      </div>
      <span class="btn" data-n="11" style="margin-top:14px;height:42px;width:100%">That's right — create a segment A project</span>
    </div>
    <div data-n="12"><div class="small muted" style="margin:2px 0 6px">Not right? Choose another:</div>
      <div class="g2">
        <div class="card"><b>B</b> · Shoot and release in Vietnam<div class="sub small">Adds a film classification step before release</div></div>
        <div class="card"><b>C</b> · Only hiring cast or a service<div class="sub small">No shooting in Vietnam</div></div>
      </div></div>
    <div class="small" data-n="13">Still unsure? <span class="lnk">Ask VFDA in 15 minutes →</span></div>
  </div>
</div>
""", logged=False)

add(dict(
 seq=3, sid="SC-02", name="Segment router + A/B/C result", group="Onboarding", tier="Tier 1 — Must",
 module="M1", actor="Guest", prio="Must", route="/start",
 design_note="3–4 short questions; the result screen lets users confirm or change.",
 shown="The user clicks *Get started* on `SC-01`, or has just verified a new account on `SC-04`.",
 leave="The user confirms the segment (to project creation `SC-10`) or picks a different segment and confirms.",
 el=[
  (1, "Navigation bar", "Header", "static", "—", "—"),
  (2, "Progress indicator", "Text + bar", "number of questions answered / 4", "—", "—"),
  (3, "Question 1 — Shooting in Vietnam?", "Toggle (single choice)", "`segment_answers.q1_shoot_in_vn`", "Yes", "Yes / No"),
  (4, "Question 2 — Release market", "Toggle (single choice)", "`segment_answers.q2_release`", "Yes (if question 1 = Yes)", "abroad / vietnam / both"),
  (5, "Question 3 — Producing entity", "Toggle (single choice)", "`segment_answers.q3_producer`", "Yes (if question 1 = Yes)", "foreign / vietnamese / coproduction"),
  (6, "Question 4 — Needs", "Toggle (multiple choice)", "`segment_answers.q4_needs[]`", "No", "subset of the 5 values"),
  (7, "*Edit* answer link", "Button", "static; on every question", "—", "—"),
  (8, "Segment result card", "Container", "computed from the decision table `segment_rules` (no language model)", "Yes", "exactly one of A / B / C"),
  (9, "Classification reason", "Text", "the answers that determined the result", "Yes", "must cite question numbers"),
  (10, "*What this means* block", "List", "`segment_requirements` for the segment", "Yes", "each line labelled Required / Not required"),
  (11, "*That's right — create a segment A project* button", "Button", "static", "—", "—"),
  (12, "The other two segment cards", "Button", "static", "—", "—"),
  (13, "*Ask VFDA* link", "Button", "static", "—", "—"),
 ],
 st=[
  ("Default", "First visit: only question 1 is shown; answering each question reveals the next; the result block appears once the required questions are answered. The mockup shows the completed 4/4 state.", "Page opens"),
  ("Empty (no data)", "No questions answered: the right column shows a faded placeholder *Your result will appear here after question 3*.", "First page visit"),
  ("Loading", "**Not applicable** to segment classification (computed instantly in the browser from the preloaded decision table). The create project button has a pending state when clicked.", "—"),
  ("Error", "Contradictory answers that match no rule (e.g. not shooting in VN but needing *Locations*) → *We couldn't classify this — choose directly or ask VFDA*, showing all three A/B/C cards.", "No rule matches"),
  ("Success / confirmation", "Confirming while logged in → `SC-10` with the *Create new project* panel pre-filled with the segment. Not logged in → `SC-04`, selection kept in the session.", "Segment confirmed"),
 ],
 ix=[
  ("Option within a question", "tap", "Records the answer, reveals the next question, recalculates the result", "stays"),
  ("*Edit* link", "tap", "Reopens that question; result recalculates immediately", "stays"),
  ("*That's right — create a segment A project* button", "tap", "Saves `projects.segment`; if not logged in, keeps it in the session", "SC-10 (or SC-04)"),
  ("Card B or C", "tap", "Switches the result to that segment, records `segment_override = true`", "stays"),
  ("*Ask VFDA*", "tap", "Opens booking with topic *Segment identification*", "SC-33"),
 ],
 sr=[
  ("At most **4 questions**; question 4 does not affect the segment.", "Screen list file — note #3"),
  ("The segment is computed with a **deterministic decision table** (`segment_rules`), not a language model — the same answers always give the same result.", "Explainability principle"),
  ("The result **always** comes with the reason (which questions decided it) and a *Required / Not required* list.", "No-black-box principle"),
  ("Users can always change the segment; manual choices are recorded (`segment_override`) so VFDA can see where the router misclassifies.", "TL4 §2"),
  ("The *Required / Not required* list is read from the VFDA-approved `segment_requirements` table, not hard-coded.", "TL5 §M1"),
 ],
 fr=[("F-M1-01", "Segment selection screen"), ("F-M1-02", "Record selection and configure the journey"), ("F-M1-03", "Change segment")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: questions are shown one at a time (step by step); the result card takes the full screen when done.", "Options are real `radio` / `checkbox` groups, with a `fieldset` + `legend` per question.", "Segment letters A/B/C are always paired with their full name — users should never have to guess the meaning."],
 oq=[("[NEEDS CLARIFICATION: decision table for the *co-production* case (question 3) — classify as A or B, and is a separate segment needed]", True),
     ("[NEEDS CLARIFICATION: does segment C really need no permit at all when a foreign crew only hires Vietnamese cast to shoot abroad]", True)],
), html)

# =====================================================================  4 · SC-10
html = page("SC-10", "Project list / Create new project", "M0 · Member · Tier 1 · #4", "/projects?new=1", f"""
<div class="row" style="gap:24px;align-items:flex-start">
  <div style="flex:1" class="col">
    <div class="row" style="justify-content:space-between;align-items:center" data-n="2"><h1>My projects</h1><span class="btn">+ New project</span></div>
    <div class="tabs" data-n="3"><span class="on">In preparation (2)</span><span>Shot (0)</span><span>Archived</span></div>
    <div class="card" data-n="4">
      <div class="row" style="justify-content:space-between"><div><h2 style="margin:0">The Last Ferry</h2><div class="sub small">Feature film · <span class="pill p-info">Segment A</span></div></div>
      <div data-n="5" style="text-align:right"><div style="font-size:22px;font-weight:800">58%</div><div class="small muted">ready</div></div></div>
      <div class="bar" style="margin:10px 0"><i style="width:58%"></i></div>
      <div class="row small" style="justify-content:space-between">
        <span data-n="6">First shooting day <b>15/03/2027</b> · 174 days left</span>
        <span data-n="7" class="muted">Next step: <b style="color:#1c2026">Finish the Vietnamese script</b></span>
      </div>
    </div>
    <div class="card">
      <div class="row" style="justify-content:space-between"><div><h2 style="margin:0">Saigon Night Market — TVC</h2><div class="sub small">Commercial · <span class="pill p-info">Segment C</span></div></div>
      <div style="text-align:right"><div style="font-size:22px;font-weight:800">80%</div><div class="small muted">ready</div></div></div>
      <div class="bar" style="margin:10px 0"><i style="width:80%"></i></div>
      <div class="row small" style="justify-content:space-between"><span>First shooting day <b>not set</b></span><span class="muted">Next step: <b style="color:#1c2026">Awaiting reply from Mekong Frame Co.</b></span></div>
    </div>
  </div>
  <div style="width:430px;flex:none" class="card hl" data-n="8">
    <div class="row" style="justify-content:space-between"><h2>Create new project</h2><span class="muted">✕</span></div>
    <div class="col" style="gap:11px">
      <div data-n="9"><div class="lab">Project name</div><div class="field ph">e.g. The Last Ferry</div></div>
      <div data-n="10"><div class="lab">Format</div><div class="field">Feature film ▾</div></div>
      <div data-n="11"><div class="lab">Segment</div><div class="field">A · Shoot in VN, release abroad ▾</div><div class="hint">Pre-filled from your router answers · <span class="lnk">redo the router</span></div></div>
      <div data-n="12"><div class="lab">Planned first shooting day in Vietnam</div><div class="field ph">dd/mm/yyyy</div><div class="hint">Used to calculate the countdown. Leave blank if unknown.</div></div>
      <div class="g2">
        <div data-n="13"><div class="lab">Shooting days in VN</div><div class="field ph">e.g. 18</div></div>
        <div data-n="14"><div class="lab">Crew size in VN</div><div class="field">15–50 people ▾</div></div>
      </div>
      <div data-n="15"><div class="lab">Planned provinces / cities <span class="opt">(optional)</span></div><div class="field ph">Choose from 34 provinces and cities…</div></div>
      <div class="row" style="gap:10px;justify-content:flex-end" data-n="16"><span class="btn q">Cancel</span><span class="btn dis">Create project</span></div>
    </div>
  </div>
</div>
""", active="My projects")

add(dict(
 seq=4, sid="SC-10", also="SC-11", name="Project list / Create new project", group="M0", tier="Tier 1 — Must",
 module="M0", actor="Member", prio="Must", route="/projects · /projects?new=1",
 design_note="Project list and new project creation on the same screen.",
 merge_note="This screen merges `SC-10 Project list` and `SC-11 Create project` per the screen list file (#4). Project creation is a panel that opens to the right of the list (route `?new=1`), not a separate page. `SC-11` has no separate image file.",
 shown="A member clicks *My projects*, has just logged in with an account that already has projects, or has just confirmed a segment on `SC-02` (the create project panel opens automatically, pre-filled with the segment).",
 leave="The member opens a project card (to `SC-12`) or successfully creates a new project (to that project's `SC-12`).",
 el=[
  (1, "Navigation bar", "Header", "static; *My projects* selected", "—", "—"),
  (2, "Title + *+ New project* button", "Header + Button", "static", "—", "—"),
  (3, "Project status tabs", "Toggle", "`projects.stage` — preparing / shot / archived, with counts", "—", "—"),
  (4, "Project card", "List", "`projects.name`, `projects.format`, `projects.segment`", "—", "only projects the user is a member of (Row Level Security (RLS))"),
  (5, "Readiness on the card", "Text + bar", "`v_project_readiness.overall_score`", "—", "0–100"),
  (6, "First shooting day and days remaining", "Text", "`projects.shooting_start_date`", "—", "none → *not set*"),
  (7, "Next step on the card", "Text", "`F-M0-07` — highest-priority task", "—", "always one sentence"),
  (8, "*Create new project* panel", "Container", "static", "—", "—"),
  (9, "Project name", "Input", "`projects.name`", "Yes", "2–120 characters; unique among the organisation's projects"),
  (10, "Format", "Toggle (dropdown)", "`projects.format` — Feature film / Documentary / Commercial / TV programme / Music video", "Yes", "enum"),
  (11, "Segment", "Toggle (dropdown)", "`projects.segment`, pre-filled from `SC-02`", "Yes", "A / B / C"),
  (12, "Planned first shooting day", "Input (date)", "`projects.shooting_start_date`", "No", "must be after today"),
  (13, "Shooting days in Vietnam", "Input (number)", "`projects.shoot_days_vn`", "No", "integer 1–365"),
  (14, "Crew size in Vietnam", "Toggle (dropdown)", "`projects.crew_size_band` — <15 / 15–50 / >50", "No", "enum"),
  (15, "Planned provinces / cities", "Toggle (multiple choice)", "`project_provinces` — list of 34 provincial-level administrative units", "No", "only codes from the list"),
  (16, "*Cancel* / *Create project* buttons", "Button", "static", "—", "*Create project* disabled until the 3 required fields are valid"),
 ],
 st=[
  ("Default", "Project cards on the left; the create project panel is closed. The mockup shows the panel open.", "Open `/projects`"),
  ("Empty (no data)", "No projects: the list is replaced by a *You have no projects yet* block and a *Create your first project* button; the panel opens automatically if the user just came through the router.", "User has no projects"),
  ("Loading", "Grey skeletons sized like 2 project cards; the create project panel is usable immediately since it doesn't depend on data.", "Loading list"),
  ("Error", "Project creation fails: red strip on the panel *Couldn't create the project. Your input has been kept.* Duplicate name: error right under the Name field.", "DB write error / duplicate name"),
  ("Success / confirmation", "Panel closes and goes to the new project's `SC-12`; green strip *Project The Last Ferry created*.", "Project created"),
 ],
 ix=[
  ("Project card", "tap", "—", "SC-12"),
  ("*+ New project* button", "tap", "Opens the panel, adds `?new=1` to the URL", "stays"),
  ("Status tab", "tap", "Filters the list", "stays"),
  ("*redo the router* link", "tap", "—", "SC-02"),
  ("*Create project* button", "tap", "Creates `projects`, assigns the creator as `owner`, generates the gauges for the segment", "SC-12"),
  ("*Cancel* / ✕ button", "tap", "Closes the panel; asks for confirmation if something was typed", "stays"),
 ],
 sr=[
  ("Only **3 required fields** (name, format, segment). Everything else can be added later — users aren't expected to know it all up front.", "Friction-reduction principle"),
  ("The province list uses the **34 provincial-level units after the 2025 merger**; old names (e.g. Quảng Nam, Hà Giang) are accepted in search and mapped to the new province.", "2025 provincial merger resolution"),
  ("Project cards always show **one** next step — from the same source as the dashboard.", "TL4 §4"),
  ("The project creator is the `owner`; only project members can see the project (RLS on `projects` and `project_members`).", "Database-level security principle"),
 ],
 fr=[("F-M0-01", "Create project"), ("F-M0-03", "My projects list"), ("F-M0-07", "Next step on the card"), ("F-M1-02", "Receive segment from the router")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the *Create new project* panel opens full screen instead of on the right.", "The panel is a `dialog` with a title, focus trap, and closes with Esc.", "Percentages always come with a number, not just bar length."],
 oq=[("[NEEDS CLARIFICATION: can a project change segment after dossier data exists, and how is the old data handled]", False),
     ("[NEEDS CLARIFICATION: can people outside the organisation (e.g. lawyers, freelance line producers) be invited to a project]", False)],
), html)

# =====================================================================  5 · SC-12
def dial(n_attrs, title, pct, nxt, btn, off=False):
    return f"""<div class="card" style="text-align:center;{ 'background:#f6f8fa' if off else ''}" {n_attrs}>
<div style="font-weight:700;font-size:13.5px;min-height:36px">{title}</div>{gauge(pct, title, off=off)}
<div style="text-align:left;margin-top:6px"><div class="small muted" style="letter-spacing:.05em;font-size:11px;font-weight:700">NEXT STEP</div>
<div class="small" style="min-height:52px">{nxt}</div></div>{btn}</div>"""

html = page("SC-12", "Readiness dashboard", "M0 · Member · Tier 1 · #5", "/projects/the-last-ferry", f"""
<div class="row" style="justify-content:space-between;align-items:flex-start">
  <div data-n="3"><div class="small muted">Project</div><h1>The Last Ferry <span class="pill p-info" style="vertical-align:middle">Segment A</span></h1><div class="sub">Feature film · Harbour Line Films (South Korea)</div></div>
  <div data-n="4" class="card soft" style="text-align:right;padding:10px 14px"><div class="small muted">First shooting day in Vietnam</div><div style="font-weight:800;font-size:18px">15/03/2027</div><div class="small"><b>174 days</b> left</div></div>
</div>
<div class="card" data-n="5" style="margin-top:14px">
  <div class="row" style="align-items:center;gap:18px"><div style="font-weight:700;width:190px">Overall readiness</div><div class="bar" style="flex:1;height:12px"><i style="width:58%"></i></div><div style="font-size:24px;font-weight:800;color:#0d366b">58%</div></div>
</div>
<div class="g5" style="margin-top:14px">
  {dial('data-n="6"', "Content &amp; compliance", 70, '<span data-n="7">Review 1 open point of attention (historical setting)</span>', '<span class="btn sm g" data-n="8" style="margin-top:8px">Open results</span>')}
  {dial("", "Locations", 85, "Pick 1 backup location for the night scene", '<span class="btn sm g" style="margin-top:8px">Compare</span>')}
  {dial("", "Partners", 60, "Bến Xưa has replied — review the proposal and confirm", '<span class="btn sm g" style="margin-top:8px">View request</span>')}
  {dial("", "Dossier &amp; permits", 40, "Missing the Vietnamese script and the Article 9 undertaking", '<span class="btn sm g" style="margin-top:8px">Open dossier</span>')}
  {dial('data-n="9"', "Logistics", 0, "Coming in phase 2: equipment, visas, drones", '<span class="btn sm dis" style="margin-top:8px">Coming soon</span>', off=True)}
</div>
<div class="row" style="gap:14px;margin-top:14px;align-items:stretch">
  <div class="banner b-warn" data-n="10" style="flex:1.2"><b>Safe submission deadline: 27/01/2027 — 127 days left.</b><br>Counted back from the first shooting day, allowing for one dossier resubmission (20 + 20 days) and a 7-day buffer. <span class="lnk">View countdown →</span></div>
  <div class="card" data-n="11" style="flex:1"><h3>Recent activity</h3>
    <div class="small col" style="gap:4px"><div>· Bến Xưa Production Services replied to the collaboration request — 2 hours ago</div><div>· Ninh Bình Provincial People's Committee acknowledged the notification — 18/09</div><div>· Tràng An added to the shortlist — 15/09</div></div></div>
</div>
<div class="row" style="justify-content:flex-end;margin-top:14px"><span class="btn g" data-n="12">Book a consultation with VFDA</span></div>
""", active="My projects", sidebar="Overview", side_n=2)

add(dict(
 seq=5, sid="SC-12", name="Readiness dashboard (5 gauges)", group="M0", tier="Tier 1 — Must",
 module="M0", actor="Member", prio="Must", route="/projects/[id]",
 design_note="The central screen; every module writes data here.",
 shown="A member opens a project from `SC-10`, has just created a project, or returns from any screen within the project.",
 leave="The member clicks a gauge button, the deadline strip, an activity item, or an item in the project sidebar.",
 el=[
  (1, "Navigation bar", "Header", "static", "—", "—"),
  (2, "Project sidebar", "List", "static: 10 items; *Overview* selected", "—", "—"),
  (3, "Project name + segment + organisation", "Header", "`projects.name`, `projects.segment`, `organizations_producer.name`", "Yes", "—"),
  (4, "First shooting day + countdown", "Text", "`projects.shooting_start_date`", "No", "none → *not set* and a *Set date* button"),
  (5, "Overall readiness", "Text + bar", "`v_project_readiness.overall_score`", "Yes", "0–100, integer"),
  (6, "Gauges (5)", "Chart (gauge)", "`v_project_readiness` — one `*_score` column per gauge", "Yes", "number of gauges shown depends on the segment — see SR"),
  (7, "*Next step* sentence", "Text", "`F-M0-07` — rule-generated, no language model", "Yes", "always present; when done, shows *Complete*"),
  (8, "Gauge action button", "Button", "static; target per gauge", "—", "—"),
  (9, "*Logistics* gauge (not yet available)", "Chart (gauge)", "static", "—", "shows `—`, not 0%"),
  (10, "Safe submission deadline strip", "Text", "`F-M5-08` — safe submission date and days remaining", "No", "hidden when there is no first shooting day or for segment C"),
  (11, "Recent activity", "List", "project `activity_log`, 3 latest items", "No", "—"),
  (12, "*Book a consultation with VFDA* button", "Button", "static", "—", "—"),
 ],
 st=[
  ("Default", "Project name, countdown, overall bar, 5 gauges with next steps, deadline strip, recent activity.", "Open a project with data"),
  ("Empty (no data)", "Newly created project: all gauges at 0%, the first gauge's next step is *Start with a content pre-check*; activity shows *No activity yet*; the deadline strip is replaced by *Set a first shooting day to calculate the deadline*.", "Project just created"),
  ("Loading", "Project name appears immediately; grey skeletons for the overall bar and the 5 gauges.", "Loading the score view"),
  ("Error", "Scores can't be calculated: each gauge shows `—` with the line *Couldn't calculate readiness. Your project data is safe.* plus *Try again*. **Never show a fake 0%.**", "View error / timeout"),
  ("Success / confirmation", "Returning after completing a task on another screen: the corresponding gauge rises with a short animation, green strip *Readiness updated*.", "Score changes"),
 ],
 ix=[
  ("*Content & compliance* gauge / button", "tap", "—", "SC-48"),
  ("*Locations* gauge / button", "tap", "—", "SC-17"),
  ("*Partners* gauge / button", "tap", "—", "SC-25"),
  ("*Dossier & permits* gauge / button", "tap", "—", "SC-27"),
  ("*Logistics* gauge", "tap", "Not clickable; caption *Phase 2*", "stays"),
  ("Deadline strip", "tap", "—", "SC-29"),
  ("Activity item", "tap", "Opens the related object", "SC-25 / SC-32 / SC-17"),
  ("*Book a consultation with VFDA* button", "tap", "—", "SC-33"),
  ("Sidebar item", "tap", "—", "corresponding screen"),
 ],
 sr=[
  ("**The *Next step* sentence is the primary information**; the percentage is secondary. This sentence is never empty.", "TL4 §4"),
  ("Scores are computed by the DB view `v_project_readiness`, **not in the browser** — every place shows the same number.", "TL5 §M0"),
  ("Number of gauges by segment: segment C has **no** *Dossier & permits* gauge; weights are read from `segment_requirements`.", "TL4 §2"),
  ("A gauge that doesn't apply shows `—`, not 0% — these are two different things.", "No-guessing principle"),
  ("Every module writes to the dashboard via the `readiness_changed` event; the dashboard never reads other modules' tables directly.", "Screen list file — note #5"),
  ("The deadline strip uses **the same calculation function** as `SC-29`; the two screens must never show different dates.", "Consistency principle"),
 ],
 fr=[("F-M0-05", "Calculate the five gauge scores"), ("F-M0-06", "Display the dashboard"), ("F-M0-07", "Suggest the next step"), ("F-M0-08", "Periodic readiness snapshots"), ("F-M5-08", "Deadline from the countdown")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the sidebar becomes a dropdown menu at the top of the page; the 5 gauges become a vertical list, one per row (small gauge on the left, next step on the right).", "The *Next step* sentence must never be truncated with an ellipsis.", "Each gauge has `role=\"meter\"` with `aria-valuenow` and a full text label."],
 oq=[("[NEEDS CLARIFICATION: weights of the five gauges in the overall score per segment — VFDA to approve before they are written to `segment_requirements`]", True),
     ("[NEEDS CLARIFICATION: the 7-day buffer before the first shooting day is a proposed figure — can users change it themselves]", False)],
), html)

# =====================================================================  6 · SC-03
html = page("SC-03", "Script content input (200-word pre-check)", "M2 · Guest · Tier 1 · #6", "/pre-check", f"""
<div class="row" style="gap:26px;align-items:flex-start">
  <div style="flex:1.6" class="col">
    <div data-n="2"><h1>Content pre-check</h1><div class="sub">Paste your story summary, up to 200 words. You'll get back the points the review board usually looks at closely — with the relevant provisions. No sign-up needed.</div></div>
    <div class="row" style="justify-content:space-between;align-items:flex-end">
      <div class="lab" style="margin:0">Story summary</div>
      <div data-n="5" class="row" style="gap:6px;align-items:center"><span class="small muted">Language</span><span class="chip on">English</span><span class="chip">Tiếng Việt</span></div>
    </div>
    <div class="field" data-n="3" style="min-height:190px;line-height:1.6">In 1972, an old ferryman carries villagers across a river between limestone karsts at dawn. One night, soldiers ask him to take them across in secret. Decades later, his granddaughter returns from Seoul to find the ferry he refused to abandon. The film follows two timelines: the war-era crossing and the present-day village preparing for the ferry to be replaced by a bridge. Scenes include the river at dawn, a night crossing with lanterns, a village festival, and a riverside funeral.</div>
    <div class="row" style="justify-content:space-between"><div data-n="6" class="row" style="gap:6px;flex-wrap:wrap"><span class="small muted">Worth mentioning:</span><span class="chip dash">historical period ✓</span><span class="chip dash">real people?</span><span class="chip dash">religious scenes, funerals ✓</span><span class="chip dash">military vehicles ✓</span></div>
      <div data-n="4" class="small"><b>96</b> / 200 words</div></div>
    <div class="card soft" data-n="7">
      <h3>Three quick questions <span class="muted" style="font-weight:400">(optional — they make the result more accurate)</span></h3>
      <div class="col" style="gap:6px;font-size:13.5px">
        <div class="row" style="justify-content:space-between"><span>Are real historical figures named?</span><span><span class="chip">Yes</span> <span class="chip on">No</span></span></div>
        <div class="row" style="justify-content:space-between"><span>Any scenes with military uniforms, weapons or vehicles?</span><span><span class="chip on">Yes</span> <span class="chip">No</span></span></div>
        <div class="row" style="justify-content:space-between"><span>Any scenes shot inside heritage sites, temples or pagodas?</span><span><span class="chip">Yes</span> <span class="chip">No</span> <span class="chip on">Not sure</span></span></div>
      </div>
    </div>
    <div class="row" style="align-items:center;gap:16px">
      <span class="btn" data-n="8" style="height:44px;font-size:15px">Check content</span>
      <span class="small muted" data-n="9">Your summary is used only for the check — never published or shared with third parties.</span>
    </div>
  </div>
  <div style="flex:1" class="col">
    <div class="card" data-n="10"><h3>What is it checked against?</h3>
      <div class="small col" style="gap:6px"><div>A rule set drafted and signed off by the <b>VFDA Legal Board</b>.</div><div>Current version: <span class="kbd">2026.08</span> · 24 rules</div><div>Main basis: <b>Article 9 of the Cinema Law 2022</b> (prohibited content in cinematographic activities).</div><div class="lnk">View the regulations library →</div></div></div>
    <div class="card soft"><h3>What you get</h3><div class="small col" style="gap:4px"><div>· Attention level: Low / Medium / High</div><div>· The exact passages highlighted</div><div>· Cited provisions for each point</div><div>· Points to consider, written by VFDA</div></div></div>
    <div class="small muted" data-n="11" style="border-top:1px solid #e1e4e8;padding-top:10px">This is a preparation aid. It is not legal advice and does not replace the decision of the competent authority.</div>
  </div>
</div>
""", active="Permits", logged=False)

add(dict(
 seq=6, sid="SC-03", name="Script content input (200-word pre-check)", group="M2", tier="Tier 1 — Must",
 module="M2", actor="Guest", prio="Must", route="/pre-check",
 design_note="Simple form, quick to fill in.",
 split_note="In the previous Screen List, `SC-03` contained both the input and the results. Per the screen list file (#6 and #7), the results were split into a new screen `SC-48 Content check results`. `SC-03` now covers input only.",
 shown="A guest clicks *Quick content check* on `SC-01`, or clicks *Edit summary and re-check* on `SC-48`.",
 leave="The user clicks *Check content* and gets the results on `SC-48`.",
 el=[
  (1, "Navigation bar", "Header", "static", "—", "—"),
  (2, "Title + description", "Header + Text", "static", "—", "—"),
  (3, "Story summary box", "Input (textarea)", "`precheck_runs.summary_text`", "Yes", "20–200 words (word count); trim extra whitespace"),
  (4, "Word counter", "Text", "real-time count", "—", "red above 200, blocks submission"),
  (5, "Summary language selector", "Toggle", "`precheck_runs.lang` — en / vi", "Yes", "auto-detected from content, user can change"),
  (6, "Worth-mentioning hints", "List (chip)", "static; chips auto-tick ✓ when the topic is detected in the text", "—", "hints only, never block submission"),
  (7, "Three quick questions", "Toggle (single choice ×3)", "`precheck_runs.flags` — real_person, military, heritage_site", "No", "Yes / No / Not sure"),
  (8, "*Check content* button", "Button", "static", "—", "disabled below 20 or above 200 words"),
  (9, "Privacy line", "Text", "static", "Yes", "always shown next to the button"),
  (10, "*What is it checked against?* block", "Text", "`ruleset_versions.current`, count of approved `rules`", "Yes", "must show the rule set version"),
  (11, "Disclaimer line", "Text", "static", "Yes", "always shown"),
 ],
 st=[
  ("Default", "Empty summary box with placeholder text, counter at 0 / 200, check button disabled. The mockup shows a pasted 96-word summary.", "Page opens"),
  ("Empty (no data)", "Empty box: placeholder *e.g. A coastal village in the 1990s…*; the basis block is still fully shown.", "Page opens"),
  ("Loading", "Button changes to *Checking… (about 10–20 seconds)*; input locked; a *Cancel* button is available.", "Click check"),
  ("Error", "Red line under the button: *We couldn't run the check right now. Your summary is still here — try again in a few minutes.* Per-IP limit reached: *You've used all of today's checks — create a free account to continue.*", "API error / timeout / rate limit"),
  ("Success / confirmation", "Goes to `SC-48` with the results.", "Check complete"),
 ],
 ix=[
  ("Summary box", "type", "Counts words; ticks hint chips when topics are detected", "stays"),
  ("Language chip", "tap", "Changes the analysis language", "stays"),
  ("Quick question", "tap", "Records the flag", "stays"),
  ("*Check content* button", "tap", "Calls `F-M2-06`, logs the run via `F-M2-07`", "SC-48"),
  ("*View the regulations library*", "tap", "—", "SC-30"),
 ],
 sr=[
  ("**No sign-up needed** to use it. This is the platform's main conversion point.", "TL4 §3"),
  ("The 200-word limit is deliberate: enough to identify the topics, not enough for users to paste a whole script into a public tool.", "Data minimisation principle"),
  ("The three quick questions are **optional**; *Not sure* is a valid answer and is treated as no information.", "No-guessing principle"),
  ("Always show the rule set version that will be used — results must be traceable to the exact version.", "TL5 §M2"),
 ],
 fr=[("F-M2-05", "Summary input box"), ("F-M2-06", "Submit for review"), ("F-M2-07", "Log the pre-check run")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: the right column moves below the check button; the disclaimer line always sits right under the button.", "The summary box has a real `<label>`; the counter is announced via `aria-live=\"polite\"`.", "Hint chips don't convey information by colour alone — they carry a text ✓ mark."],
 oq=[("[NEEDS CLARIFICATION: how long are guest summaries kept, and are they used to improve the rule set — privacy policy wording needed]", True),
     ("[NEEDS CLARIFICATION: daily pre-check limit per IP]", False)],
), html)

# =====================================================================  7 · SC-48
html = page("SC-48", "Content check results", "M2 · Guest / Member · Tier 1 · #7", "/pre-check/r/8f3a", f"""
<div class="row" style="justify-content:space-between;align-items:flex-end">
  <div data-n="2"><h1>Content pre-check results</h1><div class="sub small">Checked at 10:42 · 22/09/2026 · Rule set <span class="kbd">2026.08</span> · 96 words · English</div></div>
  <span class="btn q" data-n="11">Edit summary and re-check</span>
</div>
<div class="row" style="gap:16px;margin-top:14px;align-items:stretch">
  <div class="card" data-n="3" style="flex:1.2">
    <div class="small muted">Attention level</div>
    <div class="row" style="gap:6px;margin-top:8px">
      <div style="flex:1;text-align:center;padding:8px;border-radius:6px;background:#eceef1;color:#8a9099">Low</div>
      <div style="flex:1;text-align:center;padding:8px;border-radius:6px;background:#fbf0dc;color:#6e4200;font-weight:800;border:2px solid #c98a1a">Medium</div>
      <div style="flex:1;text-align:center;padding:8px;border-radius:6px;background:#eceef1;color:#8a9099">High</div>
    </div>
  </div>
  <div class="card" data-n="4" style="flex:1"><div class="row" style="gap:20px"><div><div style="font-size:26px;font-weight:800">2</div><div class="small">points <span class="warn">Needs attention</span></div></div><div><div style="font-size:26px;font-weight:800">0</div><div class="small">points <span class="bad">Action required</span></div></div></div>
  <div class="small muted" style="margin-top:6px">No Action required points found under rule set 2026.08.</div></div>
</div>
<div class="row" style="gap:18px;margin-top:16px;align-items:flex-start">
  <div class="card" data-n="5" style="flex:1;line-height:1.75;font-size:14px">
    <div class="small muted" style="margin-bottom:6px">The summary you submitted</div>
    <mark data-n="6">In 1972</mark><sup class="warn">1</sup>, an old ferryman carries villagers across a river between limestone karsts at dawn. One night, <mark>soldiers ask him to take them across in secret</mark><sup class="warn">2</sup>. Decades later, his granddaughter returns from Seoul to find the ferry he refused to abandon. The film follows two timelines: <mark>the war-era crossing</mark><sup class="warn">1</sup> and the present-day village preparing for the ferry to be replaced by a bridge. Scenes include the river at dawn, a night crossing with lanterns, a village festival, and a riverside funeral.
  </div>
  <div class="col" style="flex:1.05">
    <div class="card" data-n="7">
      <div class="row" style="justify-content:space-between"><b>1 · Wartime historical setting</b><span class="pill p-warn" data-n="8">Needs attention</span></div>
      <div class="small muted" style="margin:4px 0" data-n="9">Citation: Article 9, Cinema Law 2022 · Rule code <span class="kbd">ART9-HIST</span></div>
      <div class="small" data-n="10"><b>Points to consider (written by the VFDA Legal Board):</b> state the perspective and historical sources clearly in the detailed script; be ready to explain them if the review board asks.</div>
    </div>
    <div class="card">
      <div class="row" style="justify-content:space-between"><b>2 · Soldiers and military vehicles on screen</b><span class="pill p-warn">Needs attention</span></div>
      <div class="small muted" style="margin:4px 0">Citation: Article 9, Cinema Law 2022 · Decree 131/2022/ND-CP · Code <span class="kbd">PERM-MIL</span></div>
      <div class="small"><b>Points to consider:</b> list the scenes with military uniforms and prop weapons; props may require separate arrangements with local authorities.</div>
    </div>
    <div class="row" style="gap:10px"><span class="btn" data-n="12">Save to project</span><span class="btn g" data-n="13">Ask the VFDA Legal Board</span></div>
  </div>
</div>
<div class="disc" data-n="14"><b style="color:#7d1f16">This is a dossier preparation aid. It is not legal advice and does not replace the decision of the competent authority.</b> The rule set is drafted and signed off by the VFDA Legal Board; the system does not interpret the law on its own.</div>
""", active="Permits", logged=False)

add(dict(
 seq=7, sid="SC-48", name="Content check results", group="M2", tier="Tier 1 — Must",
 module="M2", actor="Guest / Member", prio="Must", route="/pre-check/r/[id]",
 design_note="Highlight risk points, suggest how to adjust.",
 new_note="**New Screen ID.** Screen List v2.0 did not have this screen (results were part of `SC-03`). `SC-48` has been added to `docs/screen-list.md`.",
 law_note="The screen list file says *\"highlight risk points under Article 13\"*. The mockup and spec use **Article 9** for content, because Article 9 of the Cinema Law 2022 defines prohibited content; Article 13 defines the dossier components and is checked on `SC-27`. Group C adopted this interpretation, and the Screen List note was updated to match.",
 shown="A pre-check finishes from `SC-03`, or a member reopens a saved check from the *Content & compliance* gauge on `SC-12`.",
 leave="The user edits and re-checks (`SC-03`), saves to a project (`SC-12`, login required) or books a consultation (`SC-33`).",
 el=[
  (1, "Navigation bar", "Header", "static", "—", "—"),
  (2, "Title + check run details", "Header + Text", "`precheck_runs.created_at`, `ruleset_version`, word count, language", "Yes", "must include the rule set version"),
  (3, "Attention level scale", "Chart (3 levels)", "computed deterministically from number of findings × severity (`F-M2-06`)", "Yes", "Low / Medium / High — no 0–100 score"),
  (4, "Point count by level", "Text", "count of `precheck_findings` by `severity`", "Yes", "—"),
  (5, "Submitted text", "Text", "`precheck_runs.summary_text`", "Yes", "shown verbatim, unedited"),
  (6, "Highlighted passage", "Text (highlight)", "`precheck_findings.span_start/end`, finding number", "—", "yellow = Needs attention, red = Action required; always with a number"),
  (7, "Finding card", "List", "`precheck_findings` + `rules.title`", "—", "shown only with a valid citation"),
  (8, "Severity label", "Text", "`rules.severity`", "Yes", "Needs attention / Action required"),
  (9, "Provision citation + rule code", "Text", "`rules.citation`, `rules.code`", "**Yes**", "**no citation, no finding shown** (`F-M2-12`)"),
  (10, "Points to consider", "Text", "`rules.guidance_vi/en` — written by the VFDA Legal Board", "Yes", "taken verbatim from the rule; **not** written by a language model"),
  (11, "*Edit summary and re-check* button", "Button", "static", "—", "—"),
  (12, "*Save to project* button", "Button", "static", "—", "requires login and at least one project"),
  (13, "*Ask the VFDA Legal Board* button", "Button", "static", "—", "—"),
  (14, "Disclaimer", "Text", "static", "**Yes**", "fixed at the bottom of the screen, never collapsed"),
 ],
 st=[
  ("Default", "Attention level scale, point counts by level, numbered highlighted text on the left, finding cards on the right, disclaimer at the bottom.", "At least 1 finding"),
  ("Empty (no data)", "No findings: scale at *Low*, line *No content needing attention found under rule set 2026.08*. **Never** say *passed*, *permitted* or *safe*.", "0 findings"),
  ("Loading", "When reopening a saved check: grey skeletons for both columns. (New checks wait on `SC-03`.)", "Loading check run"),
  ("Error", "A finding with an invalid citation is **dropped from the list** and logged for VFDA; if all findings are dropped: *We couldn't complete this check — try again or ask VFDA*. Never show a finding without a citation.", "Citation verification fails / load error"),
  ("Success / confirmation", "Click *Save to project* → green strip *Saved to The Last Ferry* and the *Content & compliance* gauge is updated.", "Saved successfully"),
 ],
 ix=[
  ("Highlighted passage", "tap", "Scrolls to and highlights the finding card with the same number", "stays"),
  ("Finding card", "tap", "Expands the full rule text; re-highlights the related passage", "stays"),
  ("*Edit summary and re-check* button", "tap", "Carries over the previous text", "SC-03"),
  ("*Save to project* button", "tap", "Not logged in → `SC-04` then back; logged in → choose a project, save the check run", "SC-12"),
  ("*Ask the VFDA Legal Board* button", "tap", "Opens booking, topic *Script content*, attaches the check run ID", "SC-33"),
  ("Rule code", "tap", "Opens regulation details", "SC-31"),
 ],
 sr=[
  ("**Every finding comes with a cited provision; if it can't be cited, it isn't shown.** Citations are matched by code against the `rules` table before display.", "TL5 §M2 — anti-fabrication"),
  ("Results use a **3-level scale**, not a 0–100 score: a precise number from a language model creates false certainty.", "No-guessing principle"),
  ("**Adjustment suggestions** are only *points to consider* taken verbatim from VFDA-written rules. The system **never** rewrites film content itself.", "Screen list file — note #7; TL3"),
  ("**Banned wording:** *approved*, *accepted*, *legally compliant*, *safe* — even when there are no findings.", "Legal liability principle"),
  ("Highlights always come with a number — information is never conveyed by colour alone.", "Accessibility"),
  ("Each check run stores `ruleset_version` so it can be explained later after the rule set changes.", "TL5 §M2"),
 ],
 fr=[("F-M2-06", "Review and return preliminary warnings"), ("F-M2-11", "Call the model with the rule set"), ("F-M2-12", "Verify citations by code"), ("F-M2-13", "Display findings with provisions"), ("F-M2-14", "Mark as reviewed (once saved to a project)")],
 resp=["Minimum supported width: **360px**.", "Narrow screens: submitted text on top, finding cards below; tapping a number in a highlight scrolls to the matching card.", "Highlights use `<mark>` with a `<sup>` number; screen readers announce *point of attention number 1*.", "Provision citations are selectable, copyable text."],
 oq=[("[NEEDS CLARIFICATION: the specific clause of Article 9 for each rule is to be filled in `rules.citation` by the VFDA Legal Board; the mockup only goes to Article level]", False),
     ("[NEEDS CLARIFICATION: thresholds for mapping number of findings × severity to Low / Medium / High]", True)],
), html)
