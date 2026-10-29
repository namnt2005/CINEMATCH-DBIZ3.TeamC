import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getDb } from '../../lib/db/client.js';
import {
  callAdmin, callPublic, freshDatabase, auditRows, locationRow, STAFF_ID, MUI_NE, TRANG_AN, CUA_VAN
} from './admin-helpers.js';

const BLOCKED = 'Authority contact not verified (M3 BR-004).';

describe('Publish and unpublish (T013, US-3 Scenario 1, FR-005, BR-004, BR-008, SR-311, SR-312, contract §7–§8)', () => {
  beforeEach(freshDatabase);

  test('BR-004 / US-3 Scenario 1: publishing Mũi Né (contact not verified) is blocked with the reason, and nothing changes', async () => {
    const res = await callAdmin('publish', 'POST', { id: MUI_NE });
    assert.equal(res.status, 409);

    const data = await res.json();
    assert.equal(data.error, 'UNVERIFIED_CONTACT');
    assert.equal(data.blocked_reason, BLOCKED);
    assert.match(data.message, /BR-004/);

    const row = locationRow(MUI_NE);
    assert.equal(row.intake_status, 'awaiting_contact');
    assert.ok(['false', '0', 0, false].includes(row.published));
    assert.equal(auditRows(MUI_NE, 'location.publish').length, 0, 'A refused publish writes no audit row');
    assert.equal((await callPublic('mui-ne')).status, 404, 'Still not public');
  });

  test('BR-004: the admin detail keeps showing why Mũi Né cannot be published', async () => {
    await callAdmin('publish', 'POST', { id: MUI_NE });
    const detail = await (await callAdmin('one', 'GET', { id: MUI_NE })).json();
    assert.equal(detail.can_publish, false);
    assert.equal(detail.blocked_reason, BLOCKED);
  });

  test('FR-005 / BR-004: once the contact is verified, publishing works, writes one location.publish row and the page goes public', async () => {
    assert.equal((await callAdmin('verify', 'POST', { id: MUI_NE })).status, 200);

    const res = await callAdmin('publish', 'POST', { id: MUI_NE });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.intake_status, 'published');
    assert.equal(data.published, true);
    assert.equal(data.blocked_reason, null);

    const rows = auditRows(MUI_NE, 'location.publish');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].admin_id, STAFF_ID);
    assert.equal(rows[0].target_id, MUI_NE);
    assert.ok(rows[0].logged_at);
    assert.equal((await callPublic('mui-ne')).status, 200);
  });

  test('FR-005: publishing a location that is already published is refused with 409 INVALID_TRANSITION and no audit row', async () => {
    const before = auditRows(TRANG_AN, 'location.publish').length;
    const res = await callAdmin('publish', 'POST', { id: TRANG_AN });
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error, 'INVALID_TRANSITION');
    assert.equal(auditRows(TRANG_AN, 'location.publish').length, before);
  });

  test('BR-008: unpublishing keeps the record intact, writes one location.unpublish row and removes it from the public site', async () => {
    const before = locationRow(TRANG_AN);
    const res = await callAdmin('unpublish', 'POST', { id: TRANG_AN, body: { reason: 'Heritage works in progress.' } });
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.intake_status, 'unpublished');
    assert.equal(data.published, false);

    const after = locationRow(TRANG_AN);
    assert.ok(after, 'The row still exists');
    for (const field of ['slug', 'name_vi', 'name_en', 'desc_en', 'scene_types', 'lat', 'lng', 'rainy_months', 'night_shooting_allowed']) {
      assert.equal(after[field], before[field], `${field} unchanged`);
    }
    assert.equal(after.blocked_reason, 'Heritage works in progress.', 'Optional reason kept (interim, research Open question 3)');
    assert.equal(getDb().prepare('SELECT count(*) AS n FROM location').get().n, 11);

    const rows = auditRows(TRANG_AN, 'location.unpublish');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].admin_id, STAFF_ID);

    assert.equal((await callPublic('trang-an')).status, 404);
    const listed = (await (await callAdmin('list', 'GET')).json()).locations.find(l => l.location_id === TRANG_AN);
    assert.equal(listed?.intake_status, 'unpublished', 'Still listed for staff');
  });

  test('BR-008: the unpublish reason is optional', async () => {
    const res = await callAdmin('unpublish', 'POST', { id: TRANG_AN, body: {} });
    assert.equal(res.status, 200);
    assert.equal(locationRow(TRANG_AN).intake_status, 'unpublished');
  });

  test('BR-008: only a published location can be unpublished (409 INVALID_TRANSITION, no audit row)', async () => {
    const res = await callAdmin('unpublish', 'POST', { id: MUI_NE, body: {} });
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error, 'INVALID_TRANSITION');
    assert.equal(auditRows(MUI_NE, 'location.unpublish').length, 0);
  });

  test('BR-008 / FR-005: an unpublished location with a verified contact can be published again, with one location.publish row', async () => {
    const before = auditRows(CUA_VAN, 'location.publish').length;
    const res = await callAdmin('publish', 'POST', { id: CUA_VAN });
    assert.equal(res.status, 200);
    assert.equal(locationRow(CUA_VAN).intake_status, 'published');
    assert.equal(auditRows(CUA_VAN, 'location.publish').length, before + 1);
  });

  test('SR-317: every publish and unpublish leaves exactly one audit row each', async () => {
    await callAdmin('unpublish', 'POST', { id: TRANG_AN, body: {} });
    await callAdmin('publish', 'POST', { id: TRANG_AN });
    await callAdmin('unpublish', 'POST', { id: TRANG_AN, body: {} });

    const actions = auditRows(TRANG_AN)
      .filter(r => ['location.publish', 'location.unpublish'].includes(r.action))
      .filter(r => r.logged_at > '2026-10-01')
      .map(r => r.action);
    assert.equal(actions.length, 3);
    assert.equal(actions.filter(a => a === 'location.unpublish').length, 2);
    assert.equal(actions.filter(a => a === 'location.publish').length, 1);
  });
});
