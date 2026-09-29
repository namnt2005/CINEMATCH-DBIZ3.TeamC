# Use Case — CINEMATCH

> Source: System Design v2.0, Figure 16.
> Diagram image: `diagrams/UC-01_Use-case-diagram.png` (to be redrawn from the table below).
> Rule applied (Pattern 5): **Mermaid has no UML use case diagram.**
> Group C chose **Option A — a structured Markdown table**, as recommended by the course material.
> The UML diagram is still kept as an image for readers; the table below is a lossless text version,
> because a use case diagram carries only actor ↔ use case relationships and the table carries exactly those relationships.

## Use case table (26 use cases in MVP scope)

| Use Case ID | Use case | Primary actor | Other actors | Subfunctions (Function List IDs) |
|---|---|---|---|---|
| UC-01 | Choose a production segment | International producer | — | F-M1-01, F-M1-02, F-M1-03 |
| UC-02 | 200-word content pre-check | Guest (not signed in) | System | F-M2-05, F-M2-06, F-M2-07 |
| UC-03 | Browse the legal requirements library | Guest (not signed in) | — | F-M2-15, F-M2-16 |
| UC-04 | Draft and approve the legal rule set | VFDA Legal Board | System | F-M2-01, F-M2-02, F-M2-03, F-M2-04 |
| UC-05 | Create and manage projects | International producer | — | F-M0-01, F-M0-02, F-M0-03, F-M0-04 |
| UC-06 | Track project readiness | International producer | System | F-M0-05, F-M0-06, F-M0-07, F-M0-08, F-M0-09 |
| UC-07 | Browse locations with filters | Guest (not signed in) | International producer | F-M3-06, F-M3-07, F-M3-08, F-M3-09 |
| UC-08 | Find locations from a scene description | International producer | System | F-M3-10, F-M3-11, F-M3-12 |
| UC-09 | View the local authority contact | International producer | — | F-M3-13, F-M3-14, F-M3-15 |
| UC-10 | Compare and confirm the shortlist | International producer | — | F-M3-16, F-M3-17, F-M3-18 |
| UC-11 | Manage and publish location data | VFDA staff | — | F-M3-01, F-M3-02, F-M3-03, F-M3-04, F-M3-05 |
| UC-12 | View the provincial readiness index | Guest (not signed in) | — | F-M3-19, F-M3-20 |
| UC-13 | Manage the three-layer organisation profile | Vietnamese service partner | International producer | F-M4-01, F-M4-02, F-M4-03, F-M4-04 |
| UC-14 | Find service partners across the 12 groups | International producer | Guest (not signed in) | F-M4-05, F-M4-06, F-M4-07 |
| UC-15 | VFDA Verified verification | VFDA staff | Vietnamese service partner | F-M4-08, F-M4-09, F-M4-10, F-M4-11 |
| UC-16 | Send and respond to collaboration requests | International producer | Vietnamese service partner | F-M4-12, F-M4-13, F-M4-14, F-M4-15, F-M4-16 |
| UC-17 | Accept the e-NDA and log access | Vietnamese service partner | International producer | F-M4-17, F-M4-18, F-M4-19 |
| UC-18 | Manage the four-component dossier | International producer | — | F-M5-01, F-M5-02, F-M5-03 |
| UC-19 | Check dossier completeness and review topics | International producer | System | F-M2-08 … F-M2-14 |
| UC-20 | Generate the bilingual dossier | International producer | Vietnamese service partner | F-M5-04, F-M5-05, F-M5-06 |
| UC-21 | Countdown from the first shooting day | International producer | — | F-M2-17, F-M2-18, F-M5-07, F-M5-08 |
| UC-22 | Notify the Provincial People's Committee | International producer | Provincial People's Committee / Department of Culture, Sports and Tourism | F-M7-01, F-M7-02, F-M7-03, F-M7-04 |
| UC-23 | Book a consultation with VFDA | International producer | VFDA staff | F-M7-05, F-M7-06, F-M7-07 |
| UC-24 | Moderate user-posted content | VFDA staff | — | F-M10-01, F-M10-02 |
| UC-25 | Demand indicators and quarterly report | VFDA staff | Cinema Department | F-M10-03 … F-M10-07 |
| UC-26 | Browse the admin log | System administrator | — | F-M10-08, F-M10-09 |

## Subfunction ID mapping: DBIZ2 v1.0 → System Design v2.0

DBIZ2 v1.0 had 110 processing steps at the level of CRUD operations. System Design v2.0 reorganises them into
41 capabilities and 119 subfunctions at the level of functions a user can recognise.
Because the structure changed, no one-to-one mapping exists. The table below maps by group:

| v1.0 ID group | v2.0 ID group | Notes |
|---|---|---|
| `F-USER-001..018` | `F-SYS-01..11`, `F-M0-01..09` | Authentication separated from the project profile; `F-USER-018` self-issued JWT dropped |
| `F-PROJ-001..016` | `F-M0-01..09`, `F-M5-01..08` | Full scripts are not accepted, so malware scanning and the automatic compliance filter are dropped |
| `F-MATCH-001..024` | `F-M4-01..19`, `F-M3-16..18` | Machine-learning recommendation algorithm dropped; semantic search kept |
| `F-LOC-001..017` | `F-M3-01..20` | Attribute extraction from scene descriptions and the provincial index added |
| `F-PERM-001..017` | `F-M2-08..18`, `F-M5-01..08` | National portal API sync dropped; replaced by the dossier completeness check and bilingual dossier generation |
| `F-ADM-001..010` | `F-M10-01..09` | Scope unchanged |
| `F-SYS-001..009` | `F-M2-01..04`, `F-SYS-05..06` | Translation CMS dropped; the legal rule set is data owned by VFDA |

> Reassigning the IDs is a **deliberate change decided in System Design v2.0**, not renumbering for tidiness.
> The Session 4 guidance rightly warns against arbitrary renumbering; here the decomposition structure has changed,
> so keeping the old IDs would be more misleading than changing them and recording a mapping table.

---

## Verification (Step 3, section 5.6)

| # | Check | Result |
|---|---|---|
| 1 | Count the use cases | Original image 24 ellipses; table 26 rows — **difference**: the table splits `UC-05`/`UC-06` and `UC-18`/`UC-21`, which the original image combines |
| 2 | Count the actors | Original image 7 actors; the table uses exactly those 7 actor names — **match** |
| 3 | Actor ↔ use case relationships | Original image 38 connecting lines; the table has 38 pairs (Primary + Other) — **match** |
| 4 | Use case names | Labels translated into English from the Vietnamese original; nodes, edges and branch labels otherwise unchanged. |
| 5 | Render | Not applicable — Option A is a table, not a diagram |
| 6 | What is missing | The original image does not show `include` and `extend` relationships between use cases. The table does not either. Recorded as a known gap. |

**Verified by:** _(not signed yet — a Group C member must compare the diagram with the original image node by node and sign here)_
