# docs/screens/ — Screen Specs (Session 4, Step 4)

The 20 priority screens from the team's screen list file — **Tier 1: 17 screens (Must)**, **Tier 2: 3 screens (Should)**.
Each screen has one mockup `img/<SCREEN-ID>.png` and one `screen-spec-<SCREEN-ID>.md` following the Session 4 Screen Spec template.
Word copies are in `../word/screens/`.

**Reading the mockups:** each orange numbered badge on an image is the row with the same number in section 3 (*Element inventory*) of that screen's spec.
Badges and rows are machine-checked to match one-to-one on all 20 screens (256 elements, 100 screen-level rules).

| # | Tier | Screen | Screen ID | Module spec | Mockup | Spec |
|---|---|---|---|---|---|---|
| 1 | 1 | Landing — Introduction | SC-01 | `spec-M1.md` | [img](img/SC-01.png) | [spec](screen-spec-SC-01.md) |
| 2 | 1 | Sign up / Log in | SC-04 (+SC-05) | `spec-SYS.md` | [img](img/SC-04.png) | [spec](screen-spec-SC-04.md) |
| 3 | 1 | Segment router + A/B/C result | SC-02 | `spec-M1.md` | [img](img/SC-02.png) | [spec](screen-spec-SC-02.md) |
| 4 | 1 | Project list / Create new project | SC-10 (+SC-11) | `spec-M0.md` | [img](img/SC-10.png) | [spec](screen-spec-SC-10.md) |
| 5 | 1 | Readiness dashboard (5 gauges) | SC-12 | `spec-M0.md` | [img](img/SC-12.png) | [spec](screen-spec-SC-12.md) |
| 6 | 1 | Script content input (200-word pre-check) | SC-03 | `spec-M2.md` | [img](img/SC-03.png) | [spec](screen-spec-SC-03.md) |
| 7 | 1 | Content check results | SC-48 | `spec-M2.md` | [img](img/SC-48.png) | [spec](screen-spec-SC-48.md) |
| 8 | 1 | Article 13 dossier completeness check | SC-27 | `spec-M2.md` | [img](img/SC-27.png) | [spec](screen-spec-SC-27.md) |
| 9 | 1 | Scene description (AI Matching input) | SC-15 | `spec-M3.md` | [img](img/SC-15.png) | [spec](screen-spec-SC-15.md) |
| 10 | 1 | Location suggestions (list + map) | SC-14 | `spec-M3.md` | [img](img/SC-14.png) | [spec](screen-spec-SC-14.md) |
| 11 | 1 | Location detail | SC-16 | `spec-M3.md` | [img](img/SC-16.png) | [spec](screen-spec-SC-16.md) |
| 12 | 1 | Partner directory (12 service groups) | SC-19 | `spec-M4.md` | [img](img/SC-19.png) | [spec](screen-spec-SC-19.md) |
| 13 | 1 | Partner profile | SC-20 | `spec-M4.md` | [img](img/SC-20.png) | [spec](screen-spec-SC-20.md) |
| 14 | 1 | Collaboration request + status tracking | SC-25 | `spec-M4.md` | [img](img/SC-25.png) | [spec](screen-spec-SC-25.md) |
| 15 | 1 | Document kit by segment | SC-26 | `spec-M5.md` | [img](img/SC-26.png) | [spec](screen-spec-SC-26.md) |
| 16 | 1 | Bilingual draft editor (Vietnamese–English) | SC-28 | `spec-M5.md` | [img](img/SC-28.png) | [spec](screen-spec-SC-28.md) |
| 17 | 1 | 20-day countdown | SC-29 | `spec-M5.md` | [img](img/SC-29.png) | [spec](screen-spec-SC-29.md) |
| 18 | 2 | Location comparison (up to 4) | SC-17 | `spec-M3.md` | [img](img/SC-17.png) | [spec](screen-spec-SC-17.md) |
| 19 | 2 | Provincial readiness index | SC-18 | `spec-M3.md` | [img](img/SC-18.png) | [spec](screen-spec-SC-18.md) |
| 20 | 2 | Provincial People's Committee notice | SC-32 | `spec-M7.md` | [img](img/SC-32.png) | [spec](screen-spec-SC-32.md) |

## One project across all 20 screens

All mockups follow one fictional project, *The Last Ferry* (Harbour Line Films, Korea, segment A, first shooting day 15/03/2027), from the landing page to the provincial notice.
The numbers agree across screens: readiness 58%, safe submission deadline 27/01/2027, Tràng An match score 91, and so on.
Place names use the 34 provincial-level units after the 2025 reorganisation (e.g. Phong Nha is in Quảng Trị).

## Decisions to confirm before coding

- **Screen #7 — Article 9 or Article 13:** the screen list says *highlight risk points under Article 13*; the spec uses **Article 9** (prohibited content) for content risk, and Article 13 (dossier components) on screen #8.
- **Merged screens:** #2 covers `SC-04` + `SC-05`, #4 covers `SC-10` + `SC-11`, #14 covers `SC-25` + `SC-24` — one image per item of the screen list file.
- **Priority changes:** `SC-17`, `SC-18`, `SC-32` move from *Must* (Screen List v2.0) to *Should* (Tier 2).
- **Reconciled with the Function List:** description length 10–1000 characters (SC-15), upload limit 25 MB (SC-26), DRAFT watermark on every PDF page (SC-28), provincial reply values *Received / More info needed / Cannot support at this time* (SC-32).
- **Rule IDs:** screen-level rules are numbered by screen position (`SR-011` = screen #1, rule 1).

## Regenerating

The mockups are HTML/CSS rendered by Chromium, and the specs are generated from the same data, so text and badges cannot drift apart.

```
cd _tools && python3 build_docs.py --img
```
