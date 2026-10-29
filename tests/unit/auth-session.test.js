import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSessionRole } from '../../lib/auth/session.js';

describe('Session Authorization Helper (lib/auth/session.js)', () => {
  test('resolves authenticated member when x-mock-role is member', () => {
    const headers = { 'x-mock-role': 'member' };
    const session = resolveSessionRole(headers);
    assert.equal(session.role, 'member');
    assert.equal(session.isAuthenticated, true);
  });

  test('resolves guest when x-mock-role is guest', () => {
    const headers = { 'x-mock-role': 'guest' };
    const session = resolveSessionRole(headers);
    assert.equal(session.role, 'guest');
    assert.equal(session.isAuthenticated, false);
  });

  test('defaults to guest when x-mock-role header is missing or null', () => {
    const session1 = resolveSessionRole({});
    assert.equal(session1.role, 'guest');
    assert.equal(session1.isAuthenticated, false);

    const session2 = resolveSessionRole(null);
    assert.equal(session2.role, 'guest');
    assert.equal(session2.isAuthenticated, false);
  });

  test('resolves authenticated vfda_staff when x-mock-role is vfda_staff', () => {
    const headers = { 'x-mock-role': 'vfda_staff' };
    const session = resolveSessionRole(headers);
    assert.equal(session.role, 'vfda_staff');
    assert.equal(session.isAuthenticated, true);
  });

  test('resolves the other signed-in roles of ck_user_account_role (partner, vfda_legal, admin)', () => {
    for (const role of ['partner', 'vfda_legal', 'admin']) {
      const session = resolveSessionRole({ 'x-mock-role': role });
      assert.equal(session.role, role);
      assert.equal(session.isAuthenticated, true);
    }
  });

  test('treats an unknown x-mock-role as guest', () => {
    const session = resolveSessionRole({ 'x-mock-role': 'superuser' });
    assert.equal(session.role, 'guest');
    assert.equal(session.isAuthenticated, false);
  });
});
