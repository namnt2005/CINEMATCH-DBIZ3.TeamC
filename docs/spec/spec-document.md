# Spec Document — CINEMATCH (index)

CINEMATCH has one Spec Document **per module**, not one single file. This file is the entry point that the Session 6 setup guide and `AGENTS.md` name as `docs/spec/spec-document.md`: it lists the eight module files and tells a reader, human or agent, where each section of the Session 4 template lives.

It adds no requirement of its own. If this index and a module file ever disagree, **the module file wins**.

*DBIZ3 · Group C · Session 4 Spec Documents, indexed in Session 6 · 29/09/2026*

## 1. The eight module Spec Documents

| Module | File | Scope | Functional requirements | Business rules | User stories | Screens (§7) |
|---|---|---|---|---|---|---|
| SYS | [`spec-SYS.md`](spec-SYS.md) | Platform foundation — accounts, roles, bilingual UI, notifications, search | 11 | 4 | 4 | SC-04 |
| M1 | [`spec-M1.md`](spec-M1.md) | Segment router | 3 | 4 | 3 | SC-01, SC-02 |
| M0 | [`spec-M0.md`](spec-M0.md) | Project workspace and readiness dashboard | 9 | 4 | 3 | SC-10, SC-12 |
| M2 | [`spec-M2.md`](spec-M2.md) | Content pre-check and Article 13 dossier check | 18 | 7 | 5 | SC-03, SC-27, SC-29, SC-48 |
| M3 | [`spec-M3.md`](spec-M3.md) | Location discovery | 20 | 7 | 5 | SC-14, SC-15, SC-16, SC-17, SC-18 |
| M4 | [`spec-M4.md`](spec-M4.md) | Vietnamese service partners | 19 | 7 | 4 | SC-19, SC-20, SC-25 |
| M5 | [`spec-M5.md`](spec-M5.md) | Dossier kit, bilingual drafts and countdown | 8 | 5 | 3 | SC-26, SC-28, SC-29 |
| M7 | [`spec-M7.md`](spec-M7.md) | VFDA support — provincial notices and consultations | 7 | 4 | 3 | SC-32 |
| **Total** | | | **95** | **42** | **30** | 20 screens |

Module `M10` (VFDA back office) has no Spec Document yet, and `M6`, `M8`, `M9` are *Won't* for this release — see [`README.md`](README.md) in this folder.

## 2. Where each template section lives

Every module file follows the same Session 4 template, so the same section number means the same thing in every file.

| Section | Content | Where to read it |
|---|---|---|
| §1 | Purpose and scope | each `spec-<MODULE>.md` |
| §2 | Actors | each `spec-<MODULE>.md` |
| §3 | User scenarios and acceptance criteria (`US-n`, Given/When/Then) | each `spec-<MODULE>.md` |
| §4 | Flows: usage flow and sequence diagrams (Mermaid) | each `spec-<MODULE>.md` |
| §5 | Functional requirements (`FR-nnn` = DBIZ2 `F-<MODULE>-nn`) | each `spec-<MODULE>.md` |
| §5.1 | **Input / Output contract** — every field with its type and required mark | each `spec-<MODULE>.md`, under §5 |
| §5.2 | Business rules (`BR-nnn`) | each `spec-<MODULE>.md`, under §5 |
| §6 | **Key entities** — the nouns the module stores | each `spec-<MODULE>.md`; consolidated in section 3 below and in `data/01-entity-dictionary.md` |
| §7 | Screens involved | each `spec-<MODULE>.md`; the Screen Specs are in `docs/screens/` |
| §8 | Success criteria (`SC-nnn`) | each `spec-<MODULE>.md` |
| §9 | Assumptions | each `spec-<MODULE>.md` |
| §10 | Open questions (`[NEEDS CLARIFICATION]`) | each `spec-<MODULE>.md` |
| §11 | Traceability to DBIZ2, with §11.1 Reconciliation | each `spec-<MODULE>.md` |

**Reading §5.1 or §6 for the whole product** means opening all eight files in the order of the table in section 1. Functional requirement IDs restart in every file, so always quote them with the file name: “`FR-008` in `spec-M3.md`”.

## 3. Key entities by module (consolidated §6)

This is the list of entities as the Spec Documents name them. The Session 5 data model in `data/` resolves duplicates and naming conflicts between modules and is the authoritative list for building the database (47 entities, 43 stored tables).

| Entity (as named in §6) | Declared in | Relationships (as written in §6) |
|---|---|---|
| UserAccount | `spec-SYS.md` | has one Profile |
| Profile | `spec-SYS.md` | belongs to UserAccount; belongs to ProducerOrganisation |
| ProducerOrganisation | `spec-SYS.md` | has many Profiles; has many Projects (M0) |
| Consent | `spec-SYS.md` | belongs to UserAccount |
| Notification | `spec-SYS.md` | belongs to UserAccount |
| EmailDelivery | `spec-SYS.md` | may relate to a Notification |
| SegmentRule | `spec-M1.md` | used by SegmentDecision |
| SegmentRequirement | `spec-M1.md` | belongs to a segment |
| SegmentDecision | `spec-M1.md` | belongs to Project (M0) once saved |
| Project | `spec-M0.md` | belongs to ProducerOrganisation; has many ProjectMembers |
| ProjectMember | `spec-M0.md` | belongs to Project and UserAccount |
| ProjectProvince | `spec-M0.md` | belongs to Project |
| ReadinessView | `spec-M0.md` | derived from M2, M3, M4, M5 data |
| ReadinessSnapshot | `spec-M0.md` | belongs to Project |
| LegalRule | `spec-M2.md` | belongs to RuleSetVersion |
| RuleSetVersion | `spec-M2.md` | has many LegalRules |
| PrecheckRun (brief) | `spec-M2.md` | has many PrecheckFindings; may belong to a Project |
| PrecheckFinding | `spec-M2.md` | belongs to PrecheckRun |
| ComplianceRun | `spec-M2.md` | has many ComplianceFindings; belongs to Project |
| ComplianceFinding | `spec-M2.md` | belongs to ComplianceRun |
| DossierCheck | `spec-M2.md` | derived from DocumentSlots (M5) |
| LicensingTimeline | `spec-M2.md` | derived from Project.shoot_date |
| Location | `spec-M3.md` | belongs to Province; has many LocationImages; has one AuthorityContact |
| LocationImage | `spec-M3.md` | belongs to Location |
| AuthorityContact | `spec-M3.md` | belongs to Location |
| Province | `spec-M3.md` | has many Locations |
| LocationQuery | `spec-M3.md` | may belong to Project |
| ProjectShortlist | `spec-M3.md` | belongs to Project and Location |
| ProvinceReadiness | `spec-M3.md` | derived from Locations, Organisations, Notices |
| Organisation | `spec-M4.md` | has many OrganisationServices, OrganisationProvinces |
| OrganisationMemberLayer | `spec-M4.md` | belongs to Organisation |
| OrganisationPrivateLayer | `spec-M4.md` | belongs to Organisation |
| VerificationRequest | `spec-M4.md` | belongs to Organisation |
| CollabRequest | `spec-M4.md` | belongs to Project and Organisation; has many CollabMessages |
| CollabMessage | `spec-M4.md` | belongs to CollabRequest |
| NdaAcceptance | `spec-M4.md` | belongs to CollabRequest |
| DocumentAccessLog | `spec-M4.md` | belongs to Document (M5) |
| DocumentType | `spec-M5.md` | has many DocumentSlots |
| DocumentSlot | `spec-M5.md` | belongs to Project; has many Documents |
| Document | `spec-M5.md` | belongs to DocumentSlot |
| BilingualDocument | `spec-M5.md` | has many BilingualParagraphs |
| BilingualParagraph | `spec-M5.md` | belongs to BilingualDocument |
| ProjectGlossary | `spec-M5.md` | belongs to Project |
| PublicHoliday | `spec-M5.md` | used by the timeline |
| LocationInterest | `spec-M7.md` | belongs to Project and Location |
| ProvinceNotice | `spec-M7.md` | belongs to LocationInterest |
| ConsultationBooking | `spec-M7.md` | belongs to UserAccount |

47 entity declarations across eight modules. Where two modules describe the same thing under different names, `data/01-entity-dictionary.md` records the conflict and the proposed resolution.

## 4. Related documents

| Document | Path |
|---|---|
| MVP scope and priorities | `docs/mvp-scope.md` |
| Function List (95 subfunctions) | `docs/function-list.md` |
| Screen List (48 screens) | `docs/screen-list.md` |
| Architecture diagrams | `docs/architecture/` |
| Screen Specs and mockups | `docs/screens/` |
| Data model and seed data | `data/` |
| Word copies of the Spec Documents | `docs/word/specs/` |
