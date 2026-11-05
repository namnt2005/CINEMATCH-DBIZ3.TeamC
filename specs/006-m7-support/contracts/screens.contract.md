# Contract: screens SC-32 (member and staff), SC-33, SC-16 button

Feature: `006-m7-support` · Screen specs `docs/screens/screen-spec-SC-32.md`, `SC-33.md` · Every text from `lib/i18n` (`notices.*`, `consult.*`). Differences from the screen specs are listed in research.md Open questions 1–4.

## SC-32 member `/projects/[id]/provinces`

Elements:
- project sidebar with *Provinces* (added to `ProjectNav`);
- title and purpose;
- one card per province: name, locations, 4-step progress (drafted · reviewed by VFDA · downloaded and sent by you · province replied), reply status (Received / More info needed / Cannot support at this time / Waiting) with date and note;
- letter preview of the selected province (read-only, Vietnamese then English, BR-002 sentence);
- per card, the action the state allows:
  - draft: *Ask VFDA to review*, disabled with *A first shooting day is needed before notifying* when it is missing (US-1 Scenario 2);
  - submitted: *Waiting for VFDA review*;
  - changes requested: the staff note and *Ask VFDA to review again*;
  - approved: recipient choice (Provincial People's Committee / Department of Culture) with *Download Word (.docx)* and *Download PDF* (print page);
  - downloaded: *Record the province's reply*, with three choices and a note;
- *+ Add province*: a location of the project's shortlist in a province with no notice;
- the *Does not replace the permit* note, always shown.

States:
- Empty: *No province has been notified yet…*;
- Loading;
- Error: *Couldn't send the request to VFDA — try again*, input kept;
- Success: *VFDA will review the letter within 2 working days*.

*view* members and archived projects: read-only; they can download an approved letter but do not record it (only owner / *edit* set the recipient, analysis I4).

## SC-32 staff `/admin/notices` (`vfda_staff`, `admin`)

Elements:
- tabs Submitted (default) / Changes requested / Approved;
- per notice: project, province, submitted date, the letter preview;
- *Approve*;
- *Request changes* with a required note;
- for downloaded notices, *Record the province's reply*.

Every review shows *Recorded in the audit log*.

## SC-33 `/consultation` (signed-in members; guests → `/login?next=%2Fconsultation`)

Elements:
- title and purpose;
- topic chips (5);
- time zone dropdown (IANA, default from the browser);
- 1–3 preferred start times (date and time in the chosen zone, *+ Add another time* up to three) with the Hanoi time shown under each;
- *Send request*, disabled until a topic, a zone and one valid time are set;
- *Your requests*: topic, times in the member's zone, status *Waiting for VFDA* / confirmed / rescheduled.

States:
- Success: *Request sent — VFDA will reply by email with a proposed time*;
- Email failed or not configured: *Request saved — VFDA will see it; the email could not be sent*;
- Error: field messages; *Couldn't send — nothing was saved, try again*.

No slot grid (BR-005).

## SC-16 button

*I'm interested in this location* for members with an owner / *edit* project: choose the project, then *Open the province page* (SC-32). Guests: *Sign in to tell the province*.
