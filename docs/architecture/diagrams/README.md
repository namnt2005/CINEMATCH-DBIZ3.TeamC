# docs/architecture/diagrams/ — Diagram images

This folder holds the picture version of each architecture diagram, redrawn in English from the Mermaid source (or, for the use cases, from the table) in the Markdown file next to it. The Markdown file is the source of truth; the picture is for readers, slides and the Word copies.

**Status:** images to be added by Group C. Save each image with **exactly** the file name below — the Markdown files already refer to these names.

| # | File name | Redraw from | Section |
|---|---|---|---|
| 1 | `CTX-01_Context-diagram.png` | `../context.md` | whole file |
| 2 | `CFG-01_System-configuration.png` | `../system-configuration.md` | whole file |
| 3 | `FLOW-01_System-usage-flow.png` | `../usage-flow.md` | sections 1–6 (one image, or one per actor if clearer) |
| 4 | `UC-01_Use-case-diagram.png` | `../use-case.md` | use case table |
| 5 | `SEQ-01_Sign-up-and-log-in.png` | `../sequence-diagrams.md` | SEQ-01 |
| 6 | `SEQ-02_200-word-pre-check.png` | `../sequence-diagrams.md` | SEQ-02 |
| 7 | `SEQ-03_Find-locations-from-scene-description.png` | `../sequence-diagrams.md` | SEQ-03 |
| 8 | `SEQ-04_View-local-authority-contact.png` | `../sequence-diagrams.md` | SEQ-04 |
| 9 | `SEQ-05_Compare-and-shortlist.png` | `../sequence-diagrams.md` | SEQ-05 |
| 10 | `SEQ-06_Collaboration-request.png` | `../sequence-diagrams.md` | SEQ-06 |
| 11 | `SEQ-07_VFDA-Verified.png` | `../sequence-diagrams.md` | SEQ-07 |
| 12 | `SEQ-08_Dossier-completeness-check.png` | `../sequence-diagrams.md` | SEQ-08 |
| 13 | `SEQ-09_Topic-screening.png` | `../sequence-diagrams.md` | SEQ-09 |
| 14 | `SEQ-10_Bilingual-dossier-generation.png` | `../sequence-diagrams.md` | SEQ-10 |
| 15 | `SEQ-11_Provincial-committee-notice.png` | `../sequence-diagrams.md` | SEQ-11 |
| 16 | `SEQ-12_Demand-index-and-quarterly-report.png` | `../sequence-diagrams.md` | SEQ-12 |

## Rules

- PNG, at least 1600 px wide, white background, English labels only.
- Draw exactly what the Mermaid source says — same nodes, arrows, labels and order. If the picture needs to differ, change the Markdown first.
- A quick way to get a first image: paste the Mermaid block into https://mermaid.live and export PNG, then tidy the layout in your drawing tool.
- After adding the images, the person who compared picture and source signs the *Verified by* line in the Markdown file.
