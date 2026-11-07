# Contract: legal rule base (SC-37)

Feature: `008-m2-check` · [research.md](../research.md) R1, R6, R9 · FR-001..FR-004 · BR-002, BR-007, BR-008 · Q2, Q3, Q13, D2, D4, D6

Read routes: `vfda_legal` and `admin`; write routes: `vfda_legal` only (`403` otherwise, `401` guest). Every write writes one `audit_log` row in the same transaction.

| Route | Body / query | Answer |
|---|---|---|
| `GET /api/admin/legal-rules` | `?topic=&status=` | **200** `{ rule_version, counts: { draft, approved, retired }, rules: [{ rule_id, rule_code, revision, title_en, title_vi, topic, severity, status, rule_version, has_draft }] }` — the latest revision per code, plus a flag when a draft revision exists |
| `GET /api/admin/legal-rules/:id` | | **200** the revision with every field, `author`, `edited_at` (from the audit rows), `approved_by`, `approved_at`, and the code's other revisions `{ rule_id, revision, status, rule_version, retired_version }` |
| `POST /api/admin/legal-rules` | `{ rule_code, topic, severity, title_*, description_*, guidance_*, citation?, keywords_vi?, keywords_en? }` | **201** `{ rule_id, revision: 1, status: "draft" }`; 409 `CODE_EXISTS`; 422 |
| `PATCH /api/admin/legal-rules/:id` | the same fields except `rule_code` | **200** draft saved; 409 `NOT_DRAFT` (approved and retired revisions are read-only) |
| `POST /api/admin/legal-rules/:id/revise` | | **201** `{ rule_id, revision: n+1, status: "draft" }` — copy of the approved text; 409 `DRAFT_EXISTS`, 409 `NOT_APPROVED` |
| `POST /api/admin/legal-rules/:id/sign` | | **200** `{ rule_version, retired_rule_id }`; **422** `CITATION_REQUIRED` `fields.citation` — refused by the database CHECK (US-3 Sc1); 422 `VALIDATION_ERROR` for other empty required fields; 409 `NOT_DRAFT` |
| `POST /api/admin/legal-rules/:id/retire` | | **200** `{ rule_version }`; 409 `NOT_APPROVED` |
| `GET /api/admin/rule-set-versions` | | **200** `{ versions: [{ rule_version, created_at, created_by, signed: [rule_code], retired: [rule_code] }] }` newest first |

After `sign` and `retire` the System actor notifies the owners of non-archived projects whose latest compliance run used an older version (`rule_set.new_version`, R9); no check is re-run (Q3).

Guarantees tested: US-3 Sc1 (the CHECK refuses; the row stays `draft`); US-3 Sc2 (new version; the next pre-check and project check store it); one approved revision per code; the signed text stays in force while a revision is a draft (Q13); retire creates a version (Q13); no DELETE route or function (BR-008); author may sign (Q2); `admin` cannot sign.
