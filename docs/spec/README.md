# docs/spec/ — Spec Documents (Session 4, Step 5)

One file per module, following the Session 4 Spec Document template (11 sections + completion checklist).
Word copies are in `../word/specs/`.
[`spec-document.md`](spec-document.md) is the index of the eight files: where each template section lives, and the key entities of every module in one table.

| File | Module ID | Module | FR rows | Screen Specs used | Open questions |
|---|---|---|---|---|---|
| [`spec-SYS.md`](spec-SYS.md) | SYS | Platform foundation — accounts, roles, bilingual UI, notifications, search | 11 (10 Must) | SC-04 | 5 (2 blocking) |
| [`spec-M1.md`](spec-M1.md) | M1 | Segment router | 3 (3 Must) | SC-01, SC-02 | 5 (5 blocking) |
| [`spec-M0.md`](spec-M0.md) | M0 | Project workspace and readiness dashboard | 9 (8 Must) | SC-10, SC-12 | 5 (3 blocking) |
| [`spec-M2.md`](spec-M2.md) | M2 | Content pre-check and Article 13 dossier check | 18 (16 Must) | SC-03, SC-48, SC-27, SC-29 | 12 (11 blocking) |
| [`spec-M3.md`](spec-M3.md) | M3 | Location discovery | 20 (15 Must) | SC-15, SC-14, SC-16, SC-17, SC-18 | 9 (8 blocking) |
| [`spec-M4.md`](spec-M4.md) | M4 | Vietnamese service partners | 19 (17 Must) | SC-19, SC-20, SC-25 | 10 (9 blocking) |
| [`spec-M5.md`](spec-M5.md) | M5 | Dossier kit, bilingual drafts and countdown | 8 (8 Must) | SC-26, SC-28, SC-29 | 8 (5 blocking) |
| [`spec-M7.md`](spec-M7.md) | M7 | VFDA support — provincial notices and consultations | 7 (0 Must) | SC-32 | 6 (5 blocking) |
| **Total** | | | **95** | | **48 blocking** |

## How to read a Spec Document

- **FR IDs restart in each module** (`FR-001` …) and map one-to-one to the DBIZ2 Subfunction ID: `FR-008` in `spec-M3.md` is `F-M3-08`. Screen Specs cite both.
- **Section 4** diagrams are marked *Textualised* (from a DBIZ2 figure), *Excerpt* (part of one) or *Derived* (no DBIZ2 figure existed). Derived diagrams and decision diamonds added in Step 3 must be confirmed by the Client — they are listed in section 10.
- **Section 11.1 Reconciliation** lists every place where the 20-screen design differs from the DBIZ2 Function List, instead of changing it silently.
- **Checklist items left unticked** are left unticked on purpose, with the reason written next to them.

## Not covered yet

- **M10 — VFDA back office** (moderation, demand index, quarterly report, audit log viewer): *Should* in the MVP Scope, no screens in the 20-screen set, so no Spec Document yet. The audit **log write** (`F-M10-08`) is referenced by M2 and M4 as a dependency.
- **M6, M8, M9** are *Won't* for this release.
