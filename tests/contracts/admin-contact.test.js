import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  callAdmin, callPublic, freshDatabase, auditRows, locationRow, validLocationBody, VALID_CONTACT,
  STAFF_ID, MUI_NE, TRANG_AN
} from './admin-helpers.js';
import { getDb } from '../../lib/db/client.js';

const contactRow = (id) => getDb().prepare('SELECT * FROM authority_contact WHERE location_id = ?').get(id);

async function createLocation() {
  const res = await callAdmin('list', 'POST', { body: validLocationBody() });
  assert.equal(res.status, 201);
  return (await res.json()).location_id;
}

describe('Authority contact on SC-35 (T012, FR-004, SR-314, D4, contract §5–§6)', () => {
  beforeEach(freshDatabase);

  test('FR-004 / SR-314: saving a contact records it as not verified, by the acting staff member, with one location.update row', async () => {
    const id = await createLocation();
    const res = await callAdmin('contact', 'PUT', { id, body: VALID_CONTACT });
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.contact_verified, false);
    assert.equal(data.verified_at, null);
    assert.equal(data.verified_by_name, 'Nguyễn Thị Thu Hà', 'interim, research Open questions 1 and 9');

    const row = contactRow(id);
    assert.equal(row.contact_phone, '+84 000 000 120');
    assert.equal(row.verified_by, STAFF_ID);
    assert.equal(auditRows(id, 'location.update').length, 1);
  });

  test('FR-004: marking the contact as verified records who and when, with one location.contact_verify row', async () => {
    const res = await callAdmin('verify', 'POST', { id: MUI_NE });
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.contact_verified, true);
    assert.equal(data.verified_by_name, 'Nguyễn Thị Thu Hà');
    assert.ok(data.verified_at, 'verified_at is set');

    const row = contactRow(MUI_NE);
    assert.equal(row.verified_by, STAFF_ID);
    assert.ok(['true', '1', 1, true].includes(row.contact_verified));
    assert.equal(auditRows(MUI_NE, 'location.contact_verify').length, 1);
  });

  test('FR-004: verifying a location that has no contact is refused with 409 NO_CONTACT and no audit row', async () => {
    const id = await createLocation();
    const res = await callAdmin('verify', 'POST', { id });
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error, 'NO_CONTACT');
    assert.equal(auditRows(id, 'location.contact_verify').length, 0);
  });

  test('FR-004: an invalid contact is refused with 422 naming the fields, and nothing is saved', async () => {
    const res = await callAdmin('contact', 'PUT', { id: MUI_NE, body: { ...VALID_CONTACT, contact_phone: '', contact_email: 'nope' } });
    assert.equal(res.status, 422);
    const data = await res.json();
    assert.ok(data.fields.contact_phone);
    assert.ok(data.fields.contact_email);
    assert.equal(contactRow(MUI_NE).contact_phone, '+84 000 000 109', 'Old phone kept');
  });

  test('SR-314: editing a verified contact clears the verification', async () => {
    const res = await callAdmin('contact', 'PUT', { id: TRANG_AN, body: { ...VALID_CONTACT, contact_phone: '+84 000 000 199' } });
    assert.equal(res.status, 200);
    const row = contactRow(TRANG_AN);
    assert.ok(['false', '0', 0, false].includes(row.contact_verified));
    assert.equal(row.verified_at, null);
  });

  test('D4: a published location whose contact is edited stays published, and the public side stops showing the contact', async () => {
    await callAdmin('contact', 'PUT', { id: TRANG_AN, body: { ...VALID_CONTACT, contact_phone: '+84 000 000 199' } });

    assert.equal(locationRow(TRANG_AN).intake_status, 'published');

    const detail = await callPublic('trang-an');
    assert.equal(detail.status, 200);
    assert.equal((await detail.json()).has_verified_contact, false);

    const contact = await callPublic('trang-an', { contact: true, role: 'member' });
    assert.equal(contact.status, 404, 'An unverified contact is not given to members');
  });
});
