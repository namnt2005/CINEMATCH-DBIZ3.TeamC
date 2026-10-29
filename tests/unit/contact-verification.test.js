import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const loadContacts = () => import('../../lib/db/contacts.js');
const member = { role: 'member', isAuthenticated: true };

const TRANG_AN = '607132bd-b05b-52c6-900f-5f2928c17a9e';

describe('Authority contact verification (T030, BR-004)', () => {
  test('BR-004: a verified contact is returned with verified_by and verified_at', async () => {
    const { getAuthorityContact } = await loadContacts();
    const contact = getAuthorityContact(TRANG_AN, member);

    assert.ok(contact, 'trang-an has a verified contact');
    assert.equal(contact.contact_verified, true);
    assert.ok(contact.verified_by, 'verified_by is recorded');
    assert.match(String(contact.verified_at), /^2026-05-20/);
  });

  test('BR-004: an unverified contact (mui-ne) is never returned, even to a member', async () => {
    const { getAuthorityContact } = await loadContacts();
    const { getLocationBySlug } = await import('../../lib/db/locations.js');
    const muiNe = getLocationBySlug('mui-ne');

    assert.equal(getAuthorityContact(muiNe.location_id, member), null);
  });

  // The 12-month re-verification cycle is Open Question 5 (spec §10) and is not asserted here:
  // seed ca-mau-cape was verified in 2016 and must still be returned until VFDA decides.
  test('BR-004: an old verification date alone does not hide a contact (Open Question 5)', async () => {
    const { getAuthorityContact } = await loadContacts();
    const { getLocationBySlug } = await import('../../lib/db/locations.js');
    const caMau = getLocationBySlug('ca-mau-cape');

    assert.ok(getAuthorityContact(caMau.location_id, member));
  });
});
