import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { callAdmin, freshDatabase, MUI_NE, TRANG_AN, locationRow, validLocationBody, VALID_CONTACT } from './admin-helpers.js';

// The 9 handlers of contracts/admin-locations.contract.md
const HANDLERS = [
  ['list', 'GET', {}],
  ['list', 'POST', { body: validLocationBody() }],
  ['one', 'GET', { id: MUI_NE }],
  ['one', 'PUT', { id: MUI_NE, body: { desc_en: 'Changed' } }],
  ['one', 'DELETE', { id: MUI_NE }],
  ['contact', 'PUT', { id: MUI_NE, body: VALID_CONTACT }],
  ['verify', 'POST', { id: MUI_NE }],
  ['publish', 'POST', { id: MUI_NE }],
  ['unpublish', 'POST', { id: TRANG_AN, body: {} }]
];

describe('Admin API role gate (T009, FR-001..FR-005, contract §0, BR-008)', () => {
  beforeEach(freshDatabase);

  test('FR-001..FR-005: without x-mock-role every admin handler answers 401 and changes nothing', async () => {
    for (const [route, method, options] of HANDLERS) {
      const res = await callAdmin(route, method, { ...options, role: null });
      assert.equal(res.status, 401, `${method} ${route}`);
      assert.equal((await res.json()).error, 'UNAUTHENTICATED');
    }
    assert.equal(locationRow(TRANG_AN).intake_status, 'published', 'Nothing was unpublished');
  });

  test('FR-001..FR-005: a member calling the admin API gets 403 and no location data', async () => {
    for (const [route, method, options] of HANDLERS) {
      const res = await callAdmin(route, method, { ...options, role: 'member' });
      assert.equal(res.status, 403, `${method} ${route}`);
      const raw = await res.text();
      assert.equal(JSON.parse(raw).error, 'FORBIDDEN');
      assert.ok(!raw.includes('Mũi Né') && !raw.includes('Phan Văn Lộc'), `${method} ${route} leaks no data`);
    }
    assert.equal(locationRow(TRANG_AN).intake_status, 'published', 'Nothing was unpublished');
  });

  test('FR-001..FR-005: other signed-in roles (vfda_legal, partner, admin) also get 403 — vfda_staff only (research Open question 5)', async () => {
    for (const role of ['vfda_legal', 'partner', 'admin']) {
      const res = await callAdmin('list', 'GET', { role });
      assert.equal(res.status, 403, role);
    }
  });

  test('FR-001: vfda_staff is let through', async () => {
    const res = await callAdmin('list', 'GET');
    assert.equal(res.status, 200);
  });

  test('BR-008: DELETE is refused with 405 even for vfda_staff, and the location is kept', async () => {
    const res = await callAdmin('one', 'DELETE', { id: MUI_NE });
    assert.equal(res.status, 405);

    const data = await res.json();
    assert.equal(data.error, 'METHOD_NOT_ALLOWED');
    assert.match(data.message, /never deleted/i);
    assert.match(data.message, /BR-008/);
    assert.ok(locationRow(MUI_NE), 'Mũi Né is still in the database');
  });
});
