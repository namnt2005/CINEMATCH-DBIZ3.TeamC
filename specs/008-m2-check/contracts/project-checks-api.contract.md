# Contract: project content check, dossier, timeline (SC-48 project, SC-27, SC-29)

Feature: `008-m2-check` · [research.md](../research.md) R4, R5, R7, R8 · FR-008..FR-010, FR-013, FR-014, FR-017, FR-018 · BR-005, BR-006 · Q1, D1

All routes: signed in; project members read (`404` for a project the caller is not on, as M0); a malformed id is 404.

| Route | Who | Body | Answer |
|---|---|---|---|
| `GET /api/projects/:id/content-checks/latest` | project members | | **200** `{ run_id, rule_version, run_at, current: boolean, findings: [{ finding_id, n, rule_code, revision, severity, title_*, citation, description_*, guidance_*, quoted_text, finding_status, reviewer_note }] }` — the text of the revision cited (BR-008); **200** `{ run_id: null }` when the project has no run |
| `POST /api/content-findings/:id/review` | owner or edit | `{ note? }` (≤ 1 000) | **200** `{ finding_id, finding_status: "reviewed", reviewer_note }`; 403 view member; 409 `ARCHIVED`; 422 |
| `GET /api/projects/:id/dossier` | project members | | **200** `{ segment, applies: boolean, checked_at, present, total: 4, completeness_pct, verdict: "complete" \| "not_ready", components: [{ letter, doc_code, name_vi, name_en, state: "present" \| "needs_fix" \| "pending" \| "missing", reason?, auto_checked: [key], needs_person: [key], action, template_url }] }` — order a–d; `applies = false` for segment C |
| `GET /api/projects/:id/timeline` | project members | `?submit=YYYY-MM-DD` optional | **200** `{ applies, shoot_date, buffer_days, buffer_start, latest, recommended, today, days_to_recommended, days_to_latest, recommended_passed, smooth: { submit, result_by }, resubmission: { submit, result_by_worst }, holidays: [{ name, start_date, end_date, expected }], milestones: [{ key, state, date? }] }`; `applies = false` for segment C; `shoot_date = null` → the empty state fields only |

Shoot date and buffer are changed through M0's `PATCH /api/projects/:id` (owner or edit), which this feature extends with `buffer_days` ∈ {0, 7, 14, 21} (422 `fields.buffer_days` otherwise; M0 question 2, D10; research R5); the timeline is recomputed on read (SC-29 Loading *not applicable*).

Guarantees tested:
- US-2 Sc1 on *Rice and Salt*: `present = 1`, `verdict = not_ready`, three components not present; US-2 Sc2 on *The Last Ferry*: component b `needs_fix`, never `present`;
- the dossier code imports no model code (BR-005);
- the Dossier gauge of M0 equals `completeness_pct` on every seed project (FR-010, SC-005);
- US-4 Sc1 (D1): 15/03/2027, buffer 7 → `latest = 2027-02-02`, `recommended = 2027-01-05`; `resubmission.result_by_worst` from 2027-01-05 = 2027-03-05, from 2027-02-02 = 2027-04-02 (M5 US-3); weekends and every `public_holiday` date skipped; `expected` holidays flagged;
- `smooth.result_by` = 20 and `resubmission.result_by_worst` = 40 working days after the submission (FR-018, both always present).
