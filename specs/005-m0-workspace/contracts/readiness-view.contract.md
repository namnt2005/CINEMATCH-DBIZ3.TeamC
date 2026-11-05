# Contract: `v_project_readiness` (FR-005..FR-007, BR-001..BR-004)

Feature: `005-m0-workspace` · [data-model.md](../data-model.md) §3 · [research.md](../research.md) R1–R4

- The only place where gauge scores, the overall readiness and the next steps are computed (BR-001). Screens and APIs read its columns and never combine them except for display (rounding, labels).
- Gauges shown and counted come from the `GAUGE_*` rows of `segment_requirement` for the project's segment (BR-002, BR-004); equal weights among counted gauges (Q1).
- Each shown gauge has exactly one action code; `done` when the gauge is complete (BR-003); `logistics.phase2` always for Logistics.
- Members read only their projects' rows (PostgreSQL filter `app.is_project_member`); the System function `app_snapshot_readiness` reads all.
- The SQLite and PostgreSQL views are rendered from `lib/db/readiness-view.sql`; a test fails when the migration differs.
- Check value: seed project *The Last Ferry* → `readiness_total = 68.75` (its 2026-09-27 seed snapshot, from `seed_rules.readiness()`).

## API shape (decision H3, Nam Tran, 05/11/2026)

The view keeps its flat columns (data-model §3). `GET /api/projects/:id/readiness` renames them to the outputs of spec-M0 §4.2 and §5.1 (FR-005, FR-007), computing nothing (`toApiReadiness()` in `lib/db/project-shape.js`):

```json
{
  "project_id": "…", "segment": "A",
  "gauges_shown": ["content", "locations", "partners", "dossier", "logistics"],
  "gauges_counted": 4,
  "readiness_total": 68.75,
  "gauge_scores": { "content": 80, "locations": 100, "partners": 70, "dossier": 25, "logistics": null },
  "next_actions": ["content.review_findings", "done", "partners.confirm", "dossier.add_missing", "logistics.phase2"],
  "next_action_primary": "content.review_findings",
  "details": { "content_open_findings": 1, "dossier_missing": ["A13_ART9_COMMITMENT", "A13_SCRIPT_VI", "A13_SERVICE_AGREEMENT"] }
}
```

- `gauge_scores` has one key per shown gauge (no `dossier` key for segment C, BR-002); `null` = not scored, shown as `—`.
- `next_actions[i]` is the one next step of `gauges_shown[i]` (BR-003).
- Checked by `tests/contracts/readiness-api.test.js` and `tests/unit/readiness-api-shape.test.js`.
