import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSessionRole } from '../../lib/auth/session.js';

const loadContacts = () => import('../../lib/db/contacts.js');
const TRANG_AN = '607132bd-b05b-52c6-900f-5f2928c17a9e';

// Local stand-in for Row Level Security on node:sqlite (plan.md Complexity Tracking):
// the third argument is the data access object, so the test can count queries.
function spyDb() {
  const calls = [];
  const db = {
    query: (sql) => { calls.push(sql); return []; },
    getOne: (sql) => { calls.push(sql); return null; }
  };
  return { calls, db };
}

describe('Authority contact role gate (T031, BR-005, SR-111)', () => {
  test('BR-005 / SR-111: a guest gets null and authority_contact is never queried', async () => {
    const { getAuthorityContact } = await loadContacts();
    const { calls, db } = spyDb();

    const result = getAuthorityContact(TRANG_AN, resolveSessionRole({}), db);

    assert.equal(result, null);
    assert.equal(calls.length, 0, 'No query may run for a guest');
  });

  test('BR-005: an unknown x-mock-role is treated as a guest and not queried', async () => {
    const { getAuthorityContact } = await loadContacts();
    const { calls, db } = spyDb();

    const result = getAuthorityContact(TRANG_AN, resolveSessionRole({ 'x-mock-role': 'superuser' }), db);

    assert.equal(result, null);
    assert.equal(calls.length, 0);
  });

  test('BR-005: a member session does query authority_contact', async () => {
    const { getAuthorityContact } = await loadContacts();
    const { calls, db } = spyDb();

    getAuthorityContact(TRANG_AN, resolveSessionRole({ 'x-mock-role': 'member' }), db);

    assert.ok(calls.some(sql => /authority_contact/i.test(sql)), 'Members reach the contact table');
  });

  test('BR-005 / SYS Clarifications Q1: every signed-in role gets the verified contact', async () => {
    const { getAuthorityContact } = await loadContacts();
    for (const role of ['member', 'partner', 'vfda_staff', 'vfda_legal', 'admin']) {
      const contact = getAuthorityContact(TRANG_AN, resolveSessionRole({ 'x-mock-role': role }));
      assert.equal(contact?.contact_name, 'Bùi Văn Thành', `${role} sees the contact`);
    }
  });
});
