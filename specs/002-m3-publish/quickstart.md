# Quickstart: validate location publishing (M3 US-3, SC-35)

Feature: `002-m3-publish` · API details: [contracts/admin-locations.contract.md](contracts/admin-locations.contract.md) · Rules: [data-model.md](data-model.md)

## Prerequisites

- Node.js 22 or later, `npm install` done on branch `002-m3-publish`.
- No key is needed. The database is the in-memory seed: **every change below is lost when the server restarts** (decision D1), so a restart is also the way to start again from a clean seed.

## 1. Automated tests

```bash
npm test
```

Expected: every test passes, including the US-3 tests created by `/speckit-tasks` (BR-004 trigger, BR-008 no delete, audit rows, role gate). The seed counts of `tests/foundational/seed-verification.test.js` (11 locations: 9 published, 1 awaiting contact, 1 unpublished) still pass, because admin tests use their own fresh database.

## 2. Manual scenarios (dev server)

```bash
npm run dev
```

Send `-H 'x-mock-role: vfda_staff'` with every admin request below; the acting staff member is the mock staff user ([research.md](research.md) R3).

| # | Scenario | Request | Expected |
|---|---|---|---|
| 1 | Role gate | `GET /api/admin/locations` without the header, then with `x-mock-role: member` | 401, then 403 |
| 2 | List every status (FR-001) | `GET /api/admin/locations` | 200; `counts` = all 11, published 9, awaiting_contact 1, unpublished 1; `cua-van` (unpublished) is listed |
| 3 | Search without diacritics | `GET /api/admin/locations?q=mui ne` | `mui-ne` is listed |
| 4 | Create with 20 fields (FR-002) | `POST /api/admin/locations` with the body of contract §3 | 201, `intake_status = awaiting_contact`, `published = false`; one `location.create` audit row |
| 5 | Validation | same body with `lat: 30` and `scene_types: []` | 422 naming both fields; no audit row |
| 6 | Publish refused (US-3 Scenario 1, BR-004) | `POST /api/admin/locations/<new id>/publish` | 409 `UNVERIFIED_CONTACT` with `blocked_reason`; status unchanged; no audit row |
| 7 | Save and verify the contact (FR-004) | `PUT …/authority-contact`, then `POST …/authority-contact/verify` | contact saved as not verified, then verified by the mock staff user with a time; audit rows `location.update`, `location.contact_verify` |
| 8 | Publish (FR-005) | `POST …/publish` | 200, published; `location.publish` row; the location appears in `GET /api/locations/<slug>` |
| 9 | Contact edited while published (D4) | `PUT …/authority-contact` with a new phone | still published; `GET /api/locations/<slug>/authority-contact` as `member` → 404; SC-16 member view says the contact awaits re-verification |
| 10 | Unpublish, never delete (BR-008) | `POST …/unpublish`, then `DELETE /api/admin/locations/<id>` | 200 unpublished, `location.unpublish` row; `GET /api/locations/<slug>` → 404; DELETE → 405; the row is still in the admin list |
| 11 | Publish again | verify the contact again, then `POST …/publish` | 200 published; `location.contact_verify` and `location.publish` rows |
| 12 | Availability (BR-010) | `PUT /api/admin/locations/<id>` with `availability: "paused"` | 200; one `location.availability` row; the location stays published with its label |
| 13 | Database constraint, not only the API | in a unit test: `UPDATE location SET intake_status = 'published', published = 'true'` for `mui-ne` | refused by `trg_location_publish_needs_contact` |
| 14 | Audit is append-only (M10 BR-005) | in a unit test: `UPDATE audit_log …` or `DELETE FROM audit_log …` | refused by `trg_audit_log_append_only` |

## 3. SC-35 in the browser

Open `http://localhost:3000/admin/locations`. A browser cannot send `x-mock-role`; until [research.md](research.md) Open question 2 is answered, start the server with `MOCK_AUTH_DEFAULT_ROLE=vfda_staff npm run dev` (interim choice) or use a header extension.

Check against `docs/screens/screen-spec-SC-35.md`: counts and filters; the editor shows the 20 fields, including *Night shooting* and *Rainy months*; *Publish* is disabled with its reason while the contact is not verified (`aria-describedby`); *Unpublish* asks for confirmation; there is no *Delete*; photos are read-only (D3); the audit note is shown.

## 4. Spec and environment checks

```bash
uv run tools/start_feature.py --check
python3 data/schema/load_check.py
```

Both must pass; this feature changes neither `docs/spec/` nor `data/`.

## 5. Results

### macOS — 30/10/2026, Nam Tran (Node.js 26, Chrome headless)

| Part | Result |
|---|---|
| §1 `npm test` | 160 passed, 0 failed (36 suites) |
| §2 scenarios 1–14 | Covered by automated tests, all green: 1 `admin-auth`; 2–3 `admin-locations-list`; 4–5, 12 `admin-locations-edit`; 6, 8, 10–11 `admin-publish`; 7, 9 `admin-contact`; 13 `publish-trigger`; 14 `audit-log`. Scenarios 1, 4, 6, 7, 8 also run with curl on `npm run dev`: member 403, create 201, publish refused 409 `UNVERIFIED_CONTACT`, contact saved then verified, publish 200, the new location in `GET /api/locations/search` |
| §3 SC-35 in a browser | `MOCK_AUTH_DEFAULT_ROLE=vfda_staff npm run dev`: empty Save shows an error per required field; the 20 fields saved; *Publish* disabled with *Authority contact not verified (M3 BR-004)*; verification dialog → *✓ verified by Nguyễn Thị Thu Hà, 30/10/2026*; Publish → *… is now visible in location search*; the new location appears on `/locations` |
| §4 checks | `start_feature.py --check` OK; `load_check.py` SQLite PASS |

### Windows

Not run yet: needs a team member on Windows (task T030 stays open).
