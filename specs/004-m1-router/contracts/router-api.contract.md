# Contract: router API (FR-002, BR-001..BR-003, US-1, US-2)

Feature: `004-m1-router` · [research.md](../research.md) R2, R3, R6 · No sign-in needed. Error bodies: `{ "error": CODE, "message": English text, "fields"?: { field: dictionary key } }`; screens show the user's language from the code (SYS FR-006).

## POST `/api/router/decisions` — store a result (US-1, D3)

Request: the four answers (data-model §2).

```json
{ "q1_shoot_in_vn": true, "q2_release": "abroad", "q3_producer": "foreign", "q4_needs": ["locations", "crew"] }
```

- The server validates the answers, reads the current rules, recomputes the segment (never takes one from the request), stores one `segment_decision` row under the session key of the `cm_router_session` cookie (created on first use, http-only, `SameSite=Lax`, 30 days).
- **201** `{ "segment_decision_id", "segment": "A" | "B" | "C" | null, "decided_by": [1,2,3], "matched": true, "requirements": { "needed": [{ code, label }], "not_needed": [...] }, "caveat": false }` — `caveat` is true for C (Clarifications Q2). Labels in the language of the request.
- **422** `VALIDATION_ERROR` with `fields`; nothing stored.
- No match → **201** with `segment: null`, `matched: false`, `decided_by: []` (the row is stored, R3).

## PATCH `/api/router/decisions/:id` — override (US-2, BR-003)

Request `{ "segment_override": "B" }`.

- Only a row stored under the same session key (cookie) → else **404** `NOT_FOUND` (does not reveal other sessions' rows).
- Always allowed (BR-003): sets `segment_override` and `segment` to the card; the card equal to the rule result clears the override (`segment_override` null, `segment` = rule result).
- **200** `{ "segment_decision_id", "segment", "segment_override", "requirements", "caveat" }`.
- **422** for a value outside A, B, C.

## Not in this contract

Changing a saved project's segment (FR-003, US-3) — with M0.
