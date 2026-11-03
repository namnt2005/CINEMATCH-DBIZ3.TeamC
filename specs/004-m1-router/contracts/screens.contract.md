# Contract: screens SC-01 and SC-02

Feature: `004-m1-router` · Screen specs: `docs/screens/screen-spec-SC-01.md`, `screen-spec-SC-02.md` · Decisions D2, D4 · All text from `lib/i18n` (`landing.*`, `router.*`).

## SC-01 Landing (`/`) — FR-001, Clarifications Q3

| # | Element | In this feature |
|---|---|---|
| 1–3 | Navigation, EN \| VI, Log in / Sign up | site header (SYS) |
| 4–5 | Headline, lead | yes |
| 6 | *Get started — 4 questions, 1 minute* | link to `/start` |
| 7 | *Quick content check* | shown, *coming soon*, not a link (M2 not built) |
| 8 | *Four things every film crew is unsure about* | 4 items; *Where should we shoot each scene?* → `/locations/match`; the 3 others *coming soon* |
| 9 | Article 13 strip | **hidden** until the Legal Board approves the wording (SR-013) |
| 10 | 5-step journey | yes, fixed order 1→5 |
| 11 | VFDA line and logo | **not shown** (Q3) |
| 12 | Footer | Privacy policy · Terms; no *Contact VFDA*; no *operated for VFDA* on this page (Q3) |

The page contains no "VFDA" text and no image (test). Narrow screens (≤ 360 px): one column, buttons full width.

## SC-02 Router (`/start`) — FR-001, FR-002, BR-001..BR-003, US-1, US-2

| # | Element | Behaviour |
|---|---|---|
| 2 | Progress *Answered n / 4* | counts answered questions |
| 3–6 | Questions 1–4 | `fieldset` + `legend`, radio (1–3) / checkbox (4); question 2 and 3 only after q1 = Yes; q4 always optional |
| 7 | *Edit* on each answered question | reopens it; result recomputed at once |
| 8 | Result card | letter + full name; appears when the required answers are complete |
| 9 | Reason | *Based on answers 1, 2 and 3* (from `decided_by`); *Question 4 only suggests partners* |
| 10 | *What this means* | *Needed* / *Not needed* lines from `segment_requirement`; for C ends with *Not legal advice — confirm with VFDA* (Q2) |
| 11 | *That's right — create a segment X project* | guest → `/signup?next=/start`; member → note *project creation comes in a later step* (D4) |
| 12 | The other two cards | override (PATCH); the picked card becomes the result, marked *chosen by you* |
| 13 | *Ask VFDA* | *coming soon* (SC-33 not built) |

States: Empty (*Your result will appear here after question 3*), no match (*We couldn't classify this — choose directly or ask VFDA*, three cards), store failure (result still shown, short *not saved — try again* note; nothing blocks the user).
