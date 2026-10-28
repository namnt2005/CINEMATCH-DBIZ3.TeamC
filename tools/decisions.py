"""Group C decisions on the blocking open questions (session of 28/10/2026).

Source data for build_docs.py. Each entry closes one open question in
Spec Document §10 and is printed in the spec's `## Clarifications` section
(Spec Kit convention). Every decision is PROVISIONAL: the team uses it to
build, and the owner named in §10 (usually VFDA) still confirms it before launch.

Key: (module, question number in §10). `match` is a word that must appear in
the question text, so a renumbered question fails the build instead of
silently attaching the wrong answer.
"""

DATE = "2026-10-28"
STATUS = "Decided (provisional, VFDA to confirm)"

DECISIONS = {
    # ---------------------------------------------------------------- SYS
    ("SYS", 1): ("verified", "No company verification is needed. Any signed-in member sees local authority contacts."),
    ("SYS", 9): ("pre-check", "Pre-check text is never stored; only its hash (`synopsis_hash`) is kept, and it is not used to improve the rule base. Same decision as M2 question 6."),
    # ---------------------------------------------------------------- M0
    ("M0", 1): ("Weights", "Equal weights. Segments A and B: four gauges at 25% each. Segment C: three gauges at 33.3% each. The Logistics gauge has weight 0 in the overall score in every segment (it is shown but not counted)."),
    # ---------------------------------------------------------------- M1
    ("M1", 1): ("Co-production", "Co-production is classified as segment A (full licence path)."),
    ("M1", 2): ("segment C", "Segment C needs no shooting licence, but the result shows a checklist of the usual commercial documents (service contract, crew visas) with the caveat *not legal advice — confirm with VFDA*."),
    ("M1", 3): ("logo", "The landing page does not mention VFDA at all (no logo, no association name) until VFDA gives written approval."),
    # ---------------------------------------------------------------- M2
    ("M2", 1): ("20-day", "Working days: weekends and dates of type PUBLIC_HOLIDAY are excluded when counting the 20 days. Same decision as M5 question 7."),
    ("M2", 2): ("two different", "One person is enough to sign a rule (author may equal approver). The audit log still records who signed."),
    ("M2", 3): ("re-checked", "Notify only. Open projects are not re-checked automatically; their owners get a notification and the Content gauge drops 30 points until the producer re-runs the check."),
    ("M2", 4): ("Thresholds", "Keep the test thresholds: High = 2 or more *action* findings; Medium = 1 *action* finding or 3 or more *notice* findings; otherwise Low."),
    ("M2", 6): ("pre-check", "Pre-check text is not stored (hash only) and is not used to improve the rule base. Same decision as SYS question 9."),
    ("M2", 9): ("application form", "Use *Mẫu số 01, Phụ lục I* of Circular 17/2022/TT-BVHTTDL (in force from 15/02/2023, amended by Circular 11/2023/TT-BVHTTDL) — application for a licence to provide film shooting services using Vietnamese locations — plus the *Phụ lục IV* commitment on Article 9. The team prepares an unofficial English reading aid; VFDA confirms the version before launch."),
    ("M2", 13): ("correction", "Correcting an approved rule creates a new draft revision; the signed text stays in force until the revision is signed. Retiring a rule creates a new rule-set version."),
    # ---------------------------------------------------------------- M3
    ("M3", 1): ("Weights", "Scene fit first: scene fit 35%, season 15%, crew 15%, logistics 15%, permit 10%, availability 10%."),
    ("M3", 2): ("catalogue", "The team keeps `config/scene-catalog.json` (with a `version` number) and changes it only through a reviewed pull request approved by the M3 owner; VFDA confirms the content before launch."),
    ("M3", 3): ("night shooting", "Add two LOCATION fields: `night_shooting_allowed` (yes / no / ask) and `rainy_months` (list of month numbers 1–12). VFDA staff fill them when verifying a location."),
    ("M3", 4): ("provincial index", "The provincial index is shown to signed-in members only, never on public pages, and always with its sample size."),
    # ---------------------------------------------------------------- M4
    ("M4", 1): ("12 service groups", "Keep the 12 proposed service groups and add a standard Vietnamese label to each."),
    ("M4", 2): ("Verified", "VFDA Verified is awarded on legal documents only (valid business registration certificate). It is valid for 12 months."),
    ("M4", 3): ("Article 13", "The flag `art13_eligible` is set only when the business registration lists a film-service business line and VFDA confirms it. The profile shows the disclaimer *not legal advice*."),
    ("M4", 4): ("NDA", "One standard, mutual, bilingual NDA with a version number. The team drafts it; VFDA reviews it before launch."),
    # ---------------------------------------------------------------- M5
    ("M5", 1): ("segment C", "Minimum list for segment C: crew passports and visas, service contract with the Vietnamese partner, shooting schedule with locations, and a local permit when shooting in a public place. Marked *awaiting VFDA confirmation*."),
    ("M5", 3): ("translation", "Only the paid Google Gemini API (data not used for training) may process real scripts, and only after the user ticks a consent box. The free tier is used with synthetic sample scripts only."),
    ("M5", 7): ("20 days", "Working days (weekends and PUBLIC_HOLIDAY excluded). Same decision as M2 question 1."),
    # ---------------------------------------------------------------- M7
    ("M7", 1): ("mandate", "The system does not send notices on VFDA's behalf. It produces a notice draft that the crew downloads and sends themselves."),
    ("M7", 2): ("addressed", "Follows from question 1: the crew chooses the recipient (People's Committee or provincial Department of Culture) when downloading the draft."),
    ("M7", 3): ("Automatic", "No automatic sending. A VFDA staff member reviews the draft in SC-32 before the crew can download the final version."),
    ("M7", 5): ("consultations", "No slot calendar in the MVP. The crew sends a consultation request; VFDA staff reply with a proposed time by email."),
    # ---------------------------------------------------------------- M10
    ("M10", 1): ("Indicator 4", "Deferred to after the MVP. Indicators 4 and 6 stay in the spec, marked *post-launch*; no new project fields are added now."),
}
