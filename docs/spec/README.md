# docs/spec/ — Spec Documents (Session 4, Step 5)

One file per module, following the Session 4 Spec Document template (11 sections + completion checklist).
Word copies are in `../word/specs/`.
[`spec-document.md`](spec-document.md) is the index of the nine files: where each template section lives, the entities (section 5.1) and all business rules (section 6) in one place.

| File | Module ID | Module | FR rows | Screen Specs used | Open questions |
|---|---|---|---|---|---|
| [`spec-SYS.md`](spec-SYS.md) | SYS | Platform foundation — accounts, roles, bilingual UI, notifications, search | 11 (10 Must) | SC-04, SC-06, SC-07, SC-08, SC-09, SC-42, SC-43 | 11 (2 blocking) |
| [`spec-M1.md`](spec-M1.md) | M1 | Segment router | 3 (3 Must) | SC-01, SC-02, SC-13 | 4 (3 blocking) |
| [`spec-M0.md`](spec-M0.md) | M0 | Project workspace and readiness dashboard | 9 (8 Must) | SC-10, SC-12, SC-13 | 6 (1 blocking) |
| [`spec-M2.md`](spec-M2.md) | M2 | Content pre-check and Article 13 dossier check | 18 (16 Must) | SC-03, SC-27, SC-29, SC-30, SC-31, SC-37, SC-48 | 14 (7 blocking) |
| [`spec-M3.md`](spec-M3.md) | M3 | Location discovery | 20 (15 Must) | SC-14, SC-15, SC-16, SC-17, SC-18, SC-35 | 10 (4 blocking) |
| [`spec-M4.md`](spec-M4.md) | M4 | Vietnamese service partners | 19 (17 Must) | SC-19, SC-20, SC-21, SC-22, SC-23, SC-25, SC-36 | 8 (4 blocking) |
| [`spec-M5.md`](spec-M5.md) | M5 | Dossier kit, bilingual drafts and countdown | 8 (8 Must) | SC-26, SC-28, SC-29 | 7 (3 blocking) |
| [`spec-M7.md`](spec-M7.md) | M7 | VFDA support — provincial notices and consultations | 7 (0 Must) | SC-32, SC-33 | 6 (4 blocking) |
| [`spec-M10.md`](spec-M10.md) | M10 | VFDA back office — moderation, demand index, quarterly report, audit log | 9 (3 Must) | SC-34, SC-38, SC-39, SC-40, SC-41 | 8 (1 blocking) |
| **Total** |  |  | **104** |  | **74 (29 blocking)** |

## How to read a Spec Document

- **FR IDs restart in each module** (`FR-001` …) and map one-to-one to the DBIZ2 Subfunction ID: `FR-008` in `spec-M3.md` is `F-M3-08`. Screen Specs cite both.
- **Section 4** diagrams are marked *Textualised* (from a DBIZ2 figure), *Excerpt* (part of one) or *Derived* (no DBIZ2 figure existed). Derived diagrams and the decision diamonds added in Step 3 were confirmed by the Client, except the new M10 diagram, which is marked as a Group C proposal.
- **Section 9** lists the test values used until the Client confirms a number, so every acceptance scenario can be turned into a test today.
- **Section 10** lists every open point as `[NEEDS CLARIFICATION: …]` with an owner. Questions raised on a screen are folded into the module's list: a duplicate is marked *also raised in SC-xx*; a new one is marked *from SC-xx*.
- **Section 11.1 Reconciliation** lists every place where the design differs from the DBIZ2 Function List, instead of changing it silently.

## Out of scope for this release

- **M6, M8, M9** are *Won't* (see `../prd.md` section 4.4).

## Regenerating

The module files are generated from `tools/specs_a.py`, `specs_b.py` and `specs_c.py` by `python3 tools/build_docs.py --mermaid`; this README and `spec-document.md` by `python3 tools/build_index.py`.
