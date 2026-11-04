# Contract: `v_project_readiness` (FR-005..FR-007, BR-001..BR-004)

Feature: `005-m0-workspace` · [data-model.md](../data-model.md) §3 · [research.md](../research.md) R1–R4

- The only place where gauge scores, the overall readiness and the next steps are computed (BR-001). Screens and APIs read its columns and never combine them except for display (rounding, labels).
- Gauges shown and counted come from the `GAUGE_*` rows of `segment_requirement` for the project's segment (BR-002, BR-004); equal weights among counted gauges (Q1).
- Each shown gauge has exactly one action code; `done` when the gauge is complete (BR-003); `logistics.phase2` always for Logistics.
- Members read only their projects' rows (PostgreSQL filter `app.is_project_member`); the System function `app_snapshot_readiness` reads all.
- The SQLite and PostgreSQL views are rendered from `lib/db/readiness-view.sql`; a test fails when the migration differs.
- Check value: seed project *The Last Ferry* → `readiness_total = 68.75` (its 2026-09-27 seed snapshot, from `seed_rules.readiness()`).
