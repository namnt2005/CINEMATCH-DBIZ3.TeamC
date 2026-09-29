# Screen List — CINEMATCH

> Source: System Design v2.0, sheet *5. Screen List*, textualised in Session 4 Step 2.
> **Updated 22/09/2026** to match the team's list of 20 priority screens (Tier 1: 17 · Tier 2: 3):
> `SC-48` added; `SC-03`, `SC-14`, `SC-27` narrowed or renamed; `SC-17`, `SC-18`, `SC-32` moved to *Should*.

| | |
|---|---|
| Screens in total | 48 |
| In MVP scope | 44 |
| Out of MVP scope | 4 |
| With mockup + Screen Spec | 20 (section 2) |

## 1. Screens in MVP scope

| Actor | Module | Screen ID | Screen name | Screen overview | Route | Segment | Priority |
|---|---|---|---|---|---|---|---|
| Guest | M1 — Segment router | SC-01 | Landing — Introduction | "Remove the uncertainty" positioning; entry to the router and the pre-check | `/` | A,B,C | Must |
| Guest | M1 — Segment router | SC-02 | Segment router + A/B/C result | Four questions; result can be confirmed or changed | `/start` | A,B,C | Must |
| Guest | M2 — Content and dossier checks | SC-03 | Script content input (200-word pre-check) | Input only; result on `SC-48` | `/pre-check` | A,B | Must |
| Guest | SYS — Platform foundation | SC-04 | Sign up / Log in | Create an account with company details; the *Log in* tab is `SC-05` | `/signup` | A,B,C | Must |
| Guest | SYS — Platform foundation | SC-05 | Log in | Tab of `SC-04` | `/login` | A,B,C | Must |
| Guest | SYS — Platform foundation | SC-06 | Forgot password | Send a reset link | `/forgot-password` | A,B,C | Must |
| Guest | SYS — Platform foundation | SC-07 | Reset password | Enter a new password | `/reset-password` | A,B,C | Must |
| Member | SYS — Platform foundation | SC-08 | My account | Details and preferences | `/account` | A,B,C | Must |
| Member | SYS — Platform foundation | SC-09 | Notification centre | List of notifications | `/notifications` | A,B,C | Must |
| Member | M0 — Project workspace | SC-10 | Project list / Create new project | List + *New project* panel (`SC-11`) | `/projects` | A,B,C | Must |
| Member | M0 — Project workspace | SC-11 | Create project | Panel inside `SC-10` | `/projects?new=1` | A,B,C | Must |
| Member | M0 — Project workspace | SC-12 | Readiness dashboard (5 gauges) | Five gauges and the next step for each | `/projects/[id]` | A,B,C | Must |
| Member | M0 — Project workspace | SC-13 | Project settings | Change segment, invite members | `/projects/[id]/settings` | A,B,C | Must |
| Guest | M3 — Location discovery | SC-14 | Location suggestions (list + map) | Match score and reasons; entered from a description or from filters | `/locations` | A,B | Must |
| Guest | M3 — Location discovery | SC-15 | Scene description (AI Matching input) | Describe a scene, confirm the extracted attributes | `/locations/describe` | A,B | Must |
| Guest | M3 — Location discovery | SC-16 | Location detail | Location profile, gated authority contact, provincial readiness | `/locations/[slug]` | A,B | Must |
| Guest | M3 — Location discovery | SC-17 | Location comparison (up to 4) | Compare up to four locations | `/locations/compare` | A,B | Should |
| Guest | M3 — Location discovery | SC-18 | Provincial readiness index | Index from platform data, locations in the province | `/provinces/[slug]` | A,B | Should |
| Guest | M4 — Vietnamese service partners | SC-19 | Partner directory (12 service groups) | Twelve service groups, filters, VFDA Verified | `/partners` | A,B,C | Must |
| Guest | M4 — Vietnamese service partners | SC-20 | Partner profile | Three visibility layers by permission | `/partners/[slug]` | A,B,C | Must |
| Partner | M4 — Vietnamese service partners | SC-21 | My organisation profile | Create and edit the profile | `/partners/me` | — | Must |
| Partner | M4 — Vietnamese service partners | SC-22 | Submit verification | Upload documents and reference projects | `/partners/me/verify` | — | Must |
| Member | M4 — Vietnamese service partners | SC-23 | Send collaboration request | Choose a project and write a note | `/partners/[slug]/request` | A,B,C | Must |
| Member / Partner | M4 — Vietnamese service partners | SC-24 | Request inbox | Left column of `SC-25` | `/requests` | A,B,C | Must |
| Member / Partner | M4 — Vietnamese service partners | SC-25 | Collaboration request + status tracking | Sent → Partner responded → Confirmed; NDA | `/requests/[id]` | A,B,C | Must |
| Member | M5 — Dossier kit | SC-26 | Document kit by segment | Document list that changes with A/B/C; uploads | `/projects/[id]/dossier` | A,B | Must |
| Member | M2 — Content and dossier checks | SC-27 | Article 13 dossier completeness check | Four-component checklist with a status per item | `/projects/[id]/dossier-check` | A,B | Must |
| Member | M5 — Dossier kit | SC-28 | Bilingual draft editor (Vietnamese–English) | Two columns, paragraph-level proofreading | `/projects/[id]/bilingual/[doc]` | A,B | Must |
| Member | M5 — Dossier kit | SC-29 | 20-day countdown | Safe submission deadline, two scenarios | `/projects/[id]/timeline` | A,B | Must |
| Guest | M2 — Content and dossier checks | SC-30 | Requirements library | Browse rules by topic | `/requirements` | A,B,C | Should |
| Guest | M2 — Content and dossier checks | SC-31 | Requirement detail | Bilingual description with citation | `/requirements/[slug]` | A,B,C | Should |
| Member | M7 — VFDA support | SC-32 | Provincial People's Committee notice | Notice status and provincial reply | `/projects/[id]/provinces` | A,B | Should |
| Member | M7 — VFDA support | SC-33 | Book a VFDA consultation | Topic and time slot | `/consult` | A,B,C | Should |
| VFDA Staff | M10 — VFDA back office | SC-34 | Admin — Overview | Admin home | `/admin` | — | Should |
| VFDA Staff | M3 — Location discovery | SC-35 | Admin — Locations | Add, edit, verify, publish | `/admin/locations` | — | Must |
| VFDA Staff | M4 — Vietnamese service partners | SC-36 | Admin — Verification queue | Review organisation verification | `/admin/verification` | — | Must |
| VFDA Legal | M2 — Content and dossier checks | SC-37 | Admin — Legal rule base | Write, sign, version rules | `/admin/legal-rules` | — | Must |
| VFDA Staff | M10 — VFDA back office | SC-38 | Admin — Content moderation | Queue of content awaiting review | `/admin/moderation` | — | Should |
| VFDA Staff | M10 — VFDA back office | SC-39 | Admin — Demand index | Six indicators and charts | `/admin/demand` | — | Should |
| VFDA Staff | M10 — VFDA back office | SC-40 | Admin — Quarterly report | Generate and export the PDF report | `/admin/reports` | — | Should |
| Admin | M10 — VFDA back office | SC-41 | Admin — Audit log | Search admin actions | `/admin/audit` | — | Should |
| Guest | SYS — Platform foundation | SC-42 | Privacy policy | Bilingual, consent recorded | `/privacy` | A,B,C | Must |
| Guest | SYS — Platform foundation | SC-43 | Terms of use | Bilingual | `/terms` | A,B,C | Must |
| Guest / Member | M2 — Content and dossier checks | SC-48 | Content check results | **New.** Attention level, highlighted passages, citations, points to consider | `/pre-check/r/[id]` | A,B | Must |

## 2. The 20 screens with a mockup and a Screen Spec

| # | Tier | Group | Screen (as in the team's screen list file) | Screen ID | Note |
|---|---|---|---|---|---|
| 1 | 1 | Onboarding | Landing / Introduction | SC-01 | |
| 2 | 1 | Onboarding | Sign up / Log in | SC-04 | covers `SC-05` |
| 3 | 1 | Onboarding | Segment router (M1) + A/B/C result | SC-02 | |
| 4 | 1 | M0 | Project list / Create new project | SC-10 | covers `SC-11` |
| 5 | 1 | M0 | Readiness dashboard (5 gauges) | SC-12 | |
| 6 | 1 | M2 | Script content input (200-word pre-check) | SC-03 | result moved to `SC-48` |
| 7 | 1 | M2 | Content check results | SC-48 | new ID |
| 8 | 1 | M2 | Article 13 dossier completeness check | SC-27 | |
| 9 | 1 | M3 | Scene description (AI Matching input) | SC-15 | |
| 10 | 1 | M3 | Location suggestions (list + map) | SC-14 | |
| 11 | 1 | M3 | Location detail | SC-16 | |
| 12 | 1 | M4 | Partner directory (12 service groups) | SC-19 | |
| 13 | 1 | M4 | Partner profile | SC-20 | |
| 14 | 1 | M4 | Collaboration request + status tracking | SC-25 | covers `SC-24` |
| 15 | 1 | M5 | Document kit by segment | SC-26 | |
| 16 | 1 | M5 | Bilingual draft editor (Vietnamese–English) | SC-28 | |
| 17 | 1 | M5 | 20-day countdown | SC-29 | |
| 18 | 2 | M3·2 | Location comparison (up to 4) | SC-17 | |
| 19 | 2 | M3·3 | Provincial readiness index | SC-18 | |
| 20 | 2 | M7·1 | Provincial People's Committee notice | SC-32 | |

**Must screens still without a mockup:** `SC-35`, `SC-36`, `SC-37` (admin tools for locations, verification and legal rules). The modules cannot run without them — see the MVP Scope backlog item 7.

## 3. Screens out of MVP scope

| Actor | Module | Screen ID | Screen name | Screen overview | Route | Segment | Priority |
|---|---|---|---|---|---|---|---|
| Member | M6 — Entry logistics | SC-44 | Logistics — equipment, visas, drones | Three questionnaires on one pattern | `/logistics/*` | A,B | Could |
| Member | M6 — Entry logistics | SC-45 | Cost reference | Price ranges and policy status | `/costs` | A,B,C | Could |
| Guest | M8 — Evidence and promotion | SC-46 | Projects shot in Vietnam | Shareable public page | `/showcase` | A,B,C | Could |
| Member | M9 — Classification | SC-47 | Classification pre-check | For segment B | `/projects/[id]/classification` | B | Could |

## 4. Shared interface states

These ten states are **not separate screens**; they are handled once in the layout and reused everywhere:
loading (skeleton) · no results · offline · server error · page not found · session expired · not allowed ·
maintenance · confirm leaving with unsaved changes · save succeeded / failed.

## 5. Roles and access

| Role code | Name | Access |
|---|---|---|
| `guest` | Visitor not signed in | Public content: location library, public partner layer, requirements library, 200-word pre-check. |
| `member` | Registered filmmaker | Create and manage projects; see local authority contacts; send collaboration requests; run dossier checks. |
| `partner` | Vietnamese supplier | As member, plus manage its organisation profile and respond to requests. |
| `vfda_staff` | VFDA staff | Manage locations, review verification, moderate content, send provincial notices, view indicators, generate reports. |
| `vfda_legal` | VFDA Legal Board | As vfda_staff, plus the only role that can write and sign legal rules. |
| `admin` | System administrator | Full access, including the audit log and account management. |
