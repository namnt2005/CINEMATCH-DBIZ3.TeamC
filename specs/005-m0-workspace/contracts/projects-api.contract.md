# Contract: projects API (FR-001..FR-004, FR-008, BR-005)

Feature: `005-m0-workspace` · Signed-in members only (401 otherwise). Error bodies `{ error, message, fields? }` (English message; screens translate from the code). Writes go through the functions of [research.md](../research.md) R6.

| Route | Body / query | Answer |
|---|---|---|
| `POST /api/projects` | `{ project_name, format, segment, shoot_date?, shoot_days_vn?, crew_size_band?, provinces?, logline? }` | **201** `{ project_id }`; creator = owner; 422 `VALIDATION_ERROR` with `fields`; 409 `NAME_TAKEN` (same organisation); 409 `NO_ORGANISATION` |
| `GET /api/projects?stage=` | `draft` \| `preparing` \| `archived` | **200** `{ counts, projects: [{ project_id, project_name, format, segment, stage, shoot_date, readiness_total, next_action_primary, permission }] }`, member projects only; default excludes `archived` (BR-005) |
| `GET /api/projects/:id` | | **200** project, the caller's permission, members (owner and editors see emails), readiness row of the view; 404 for a non-member |
| `PATCH /api/projects/:id` | `{ project_name?, shoot_date?, logline?, stage? (draft/preparing) }` | **200**; 403 `FORBIDDEN` for *view*; 409 `ARCHIVED`; 422; last write wins (`updated_at`) |
| `POST /api/projects/:id/archive` | | **200**; 403 for *view*; 409 when already archived. No DELETE route (405) |
| `POST /api/projects/:id/invitations` | `{ invitee_email, permission: view \| edit }` | **201** pending member + queued email; 403 when not owner; 409 `ALREADY_INVITED` |
| `GET /api/invitations` | | **200** pending invitations for the caller's account email: project name, permission |
| `POST /api/invitations/:member_id/accept` | | **200**; 404 when the invitation is not for the caller's email |
| `GET /api/projects/:id/readiness` | | **200** `{ gauges_shown, gauges_counted, readiness_total, gauge_scores, next_actions, next_action_primary, details }` ([readiness-view.contract.md](readiness-view.contract.md) §API shape, H3); 404 non-member or malformed id; 503 `READINESS_UNAVAILABLE` when the view fails (the screen shows `—`) |

Nightly: `app_snapshot_readiness(current_date)` (pg_cron) / `npm run snapshot` — one `readiness_snapshot` per non-archived project per date.
