import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSessionRole } from '../../lib/auth/session.js';

const STAFF_ID = '515529a9-46d9-559c-aab4-e5fb31eedeea';
const OTHER_STAFF_ID = '74749444-a35e-5c4b-892b-2f8cb8cf80b9';

describe('Mock staff session (T002, FR-004 verified_by, M10 FR-008 admin_id, research R3–R4)', () => {
  test('FR-004 / M10 FR-008: x-mock-role vfda_staff carries the default seed staff id (interim, research Open question 1)', () => {
    const session = resolveSessionRole({ 'x-mock-role': 'vfda_staff' }, {});
    assert.equal(session.role, 'vfda_staff');
    assert.equal(session.isAuthenticated, true);
    assert.equal(session.userId, STAFF_ID);
  });

  test('FR-004: MOCK_STAFF_USER_ID chooses another seed staff account', () => {
    const session = resolveSessionRole({ 'x-mock-role': 'vfda_staff' }, { MOCK_STAFF_USER_ID: OTHER_STAFF_ID });
    assert.equal(session.userId, OTHER_STAFF_ID);
  });

  test('Other roles carry no staff id', () => {
    assert.equal(resolveSessionRole({ 'x-mock-role': 'member' }, {}).userId, null);
    assert.equal(resolveSessionRole({}, {}).userId, null);
  });

  test('Research R4: with no header the dev server uses MOCK_AUTH_DEFAULT_ROLE (interim, research Open question 2)', () => {
    const session = resolveSessionRole({}, { MOCK_AUTH_DEFAULT_ROLE: 'vfda_staff' });
    assert.equal(session.role, 'vfda_staff');
    assert.equal(session.userId, STAFF_ID);
  });

  test('Research R4: the header always wins over MOCK_AUTH_DEFAULT_ROLE', () => {
    const session = resolveSessionRole({ 'x-mock-role': 'member' }, { MOCK_AUTH_DEFAULT_ROLE: 'vfda_staff' });
    assert.equal(session.role, 'member');
  });

  test('Research R4 (analysis M3): MOCK_AUTH_DEFAULT_ROLE is ignored in production, so a stray setting never grants a role', () => {
    const session = resolveSessionRole({}, { NODE_ENV: 'production', MOCK_AUTH_DEFAULT_ROLE: 'vfda_staff' });
    assert.equal(session.role, 'guest');
    assert.equal(session.isAuthenticated, false);
  });

  test('BR-005: with neither header nor default, or an unknown default, the session stays guest', () => {
    assert.equal(resolveSessionRole({}, {}).role, 'guest');
    assert.equal(resolveSessionRole({}, { MOCK_AUTH_DEFAULT_ROLE: 'superuser' }).role, 'guest');
  });
});
