import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getDb } from '../../lib/db/client.js';
import {
  callAdmin, callPublic, freshDatabase, auditRows, locationRow, validLocationBody, STAFF_ID, TRANG_AN
} from './admin-helpers.js';

const locationCount = () => getDb().prepare('SELECT count(*) AS n FROM location').get().n;
const allAudit = () => getDb().prepare('SELECT count(*) AS n FROM audit_log').get().n;

describe('POST /api/admin/locations and PUT /:id (T011, FR-002, BR-010, SR-316, SR-317, contract §3–§4)', () => {
  beforeEach(freshDatabase);

  test('FR-002: creating with the 20 fields gives a new awaiting_contact location and one location.create audit row', async () => {
    const res = await callAdmin('list', 'POST', { body: validLocationBody() });
    assert.equal(res.status, 201);

    const created = await res.json();
    assert.equal(created.intake_status, 'awaiting_contact');
    assert.equal(created.published, false);
    assert.equal(created.slug, 'van-long-wetland-nature-reserve');

    const detail = await (await callAdmin('one', 'GET', { id: created.location_id })).json();
    assert.equal(detail.night_shooting_allowed, 'ask');
    assert.deepEqual(detail.rainy_months, [6, 7, 8]);
    assert.deepEqual(detail.months_to_avoid, [7, 8]);

    const rows = auditRows(created.location_id, 'location.create');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].admin_id, STAFF_ID);
    assert.ok(rows[0].logged_at, 'logged_at is set');
  });

  test('FR-002 / BR-004: a new location never starts published, whatever the body says', async () => {
    const res = await callAdmin('list', 'POST', {
      body: validLocationBody({ intake_status: 'published', published: true })
    });
    assert.equal(res.status, 201);
    const created = await res.json();
    assert.equal(locationRow(created.location_id).intake_status, 'awaiting_contact');
  });

  test('FR-002: creating without required fields fails with a clear error per field, and nothing is written', async () => {
    const body = validLocationBody();
    delete body.name_en;
    delete body.lat;
    body.scene_types = [];
    const before = { locations: locationCount(), audit: allAudit() };

    const res = await callAdmin('list', 'POST', { body });
    assert.equal(res.status, 422);

    const data = await res.json();
    assert.equal(data.error, 'VALIDATION_ERROR');
    for (const field of ['name_en', 'lat', 'scene_types']) {
      assert.equal(typeof data.fields[field], 'string', `${field} is named`);
      assert.ok(data.fields[field].length > 0, `${field} has a message`);
    }
    assert.equal(locationCount(), before.locations, 'No location created');
    assert.equal(allAudit(), before.audit, 'No audit row');
  });

  test('FR-002: a second location with the same English name is refused with 409 SLUG_TAKEN (interim, research Open question 4)', async () => {
    assert.equal((await callAdmin('list', 'POST', { body: validLocationBody() })).status, 201);
    const res = await callAdmin('list', 'POST', { body: validLocationBody() });
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error, 'SLUG_TAKEN');
  });

  test('FR-002 / SR-317: editing fields writes one location.update row and keeps the status', async () => {
    const res = await callAdmin('one', 'PUT', { id: TRANG_AN, body: { desc_en: 'Limestone karsts and caves.' } });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).desc_en, 'Limestone karsts and caves.');
    assert.equal(auditRows(TRANG_AN, 'location.update').length, 1);
    assert.equal(locationRow(TRANG_AN).intake_status, 'published');
  });

  test('BR-010: changing availability writes one location.availability row; a paused location stays published with its label', async () => {
    const res = await callAdmin('one', 'PUT', { id: TRANG_AN, body: { availability: 'paused' } });
    assert.equal(res.status, 200);
    assert.equal(auditRows(TRANG_AN, 'location.availability').length, 1);
    assert.equal(auditRows(TRANG_AN, 'location.update').length, 0, 'availability alone is not a location.update');

    const publicRes = await callPublic('trang-an');
    assert.equal(publicRes.status, 200);
    assert.equal((await publicRes.json()).availability, 'paused');
  });

  test('SR-317: a save that changes nothing, or an invalid save, writes no audit row', async () => {
    const before = auditRows(TRANG_AN).length;
    const current = locationRow(TRANG_AN);

    assert.equal((await callAdmin('one', 'PUT', { id: TRANG_AN, body: { name_en: current.name_en } })).status, 200);
    const invalid = await callAdmin('one', 'PUT', { id: TRANG_AN, body: { lat: 30 } });
    assert.equal(invalid.status, 422);
    assert.ok((await invalid.json()).fields.lat);

    assert.equal(auditRows(TRANG_AN).length, before);
    assert.equal(Number(locationRow(TRANG_AN).lat), Number(current.lat), 'lat unchanged');
  });
});
