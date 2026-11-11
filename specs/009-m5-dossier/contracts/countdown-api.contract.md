# Contract: M5 countdown entry point (FR-007, FR-008, BR-005)

Feature: `009-m5-dossier` · [research.md](../research.md) R11 · US-3 Sc1–2 · BR-005, Q7

M5's FR-008 asks for a `timeline_view`. SC-29 and M2's `GET /api/projects/:id/timeline` already compute it with the one shared calculation; M5 exposes it under its own entry point without a second calculation (analysis C1).

| Route | Who | Body | Answer |
|---|---|---|---|
| `GET /api/projects/:id/countdown` | project members | `?submit=YYYY-MM-DD` optional | **200** `{ timeline_view }`, where `timeline_view` is exactly the body of M2's `GET /api/projects/:id/timeline` from `getTimeline()` (shoot date, buffer, latest, recommended, both paths, holidays with `expected`, milestones, `recommended_passed`); 404 non-member or malformed id; `force-dynamic` |

The shooting day and the buffer (FR-007) are still set through M0's `PATCH /api/projects/:id` (owner or edit; after today; 0 / 7 / 14 / 21); this route echoes the stored values.

**Guarantees tested** (tests/unit/m5-countdown.test.js — red until the route exists):
- **BR-005**: for *The Last Ferry* and *Quiet Harbour Blues*, `timeline_view` equals `licensingTimeline()` computed in the test from the seed project and `public_holiday`.
- **US-3 Sc1**: *The Last Ferry* (15/03/2027, buffer 7) → `recommended = 2027-01-05`, `latest = 2027-02-02`; from `submit=2027-02-02`, `resubmission.result_by_worst = 2027-04-02`, after the shooting day.
- **US-3 Sc2**: the Tết 2027 band in the window has `expected: true`.
- **FR-008**: both paths always present; late milestones flagged.
- **Edge case**: *Quiet Harbour Blues* → `recommended_passed` with the number of days.
- **Static**: `app/api/projects/[id]/countdown/route.js` imports `getTimeline` and no date-counting code; lib/documents/ and lib/drafts/ import no date-counting code.
