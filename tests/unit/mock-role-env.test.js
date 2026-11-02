import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSessionRole } from '../../lib/auth/session.js';

const STAFF = { 'x-mock-role': 'vfda_staff' };
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

function withNodeEnv(value) {
  if (value === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = value;
}

describe('x-mock-role works only under NODE_ENV=test (T072, FR-004, BR-002, research R6)', () => {
  afterEach(() => withNodeEnv(ORIGINAL_NODE_ENV));

  test('npm test runs the suite with NODE_ENV=test, so the offline tests keep their mock roles', () => {
    assert.equal(ORIGINAL_NODE_ENV, 'test');
  });

  test('FR-004: under NODE_ENV=test the header sets the role', () => {
    const session = resolveSessionRole(STAFF, { NODE_ENV: 'test' });
    assert.equal(session.role, 'vfda_staff');
    assert.equal(session.isAuthenticated, true);
  });

  test('BR-002: in development, production or with NODE_ENV unset the header grants nothing', () => {
    for (const env of [{ NODE_ENV: 'development' }, { NODE_ENV: 'production' }, {}]) {
      const session = resolveSessionRole(STAFF, env);
      assert.equal(session.role, 'guest', JSON.stringify(env));
      assert.equal(session.isAuthenticated, false, JSON.stringify(env));
      assert.equal(session.userId, null, JSON.stringify(env));
    }
  });

  test('Research R4: in development the ignored header does not override MOCK_AUTH_DEFAULT_ROLE (unchanged dev default)', () => {
    const session = resolveSessionRole({ 'x-mock-role': 'vfda_staff' }, { NODE_ENV: 'development', MOCK_AUTH_DEFAULT_ROLE: 'member' });
    assert.equal(session.role, 'member');
  });

  test('FR-004: getSession on the sqlite source ignores the header when NODE_ENV is development', async () => {
    withNodeEnv('development');
    const { getSession } = await import('../../lib/auth/session.js');
    const session = await getSession({ headers: STAFF });
    assert.equal(session.role, 'guest');
  });

  test('FR-004: the admin API refuses a request that only carries x-mock-role outside tests → 401', async () => {
    withNodeEnv('development');
    const { GET } = await import('../../app/api/admin/locations/route.js');
    const res = await GET(new Request('http://localhost:3000/api/admin/locations', { headers: STAFF }));
    assert.equal(res.status, 401);
  });

  test('FR-004: the /admin gate sends a request with only x-mock-role to sign-in outside tests', async () => {
    withNodeEnv('production');
    const { middleware } = await import('../../middleware.js');
    const res = await middleware(new Request('http://localhost:3000/admin/locations', { headers: STAFF }));
    const location = res.headers.get('location');
    assert.ok(location, `redirected to sign-in, got status ${res.status} with no redirect`);
    assert.equal(new URL(location).pathname, '/login');
  });
});
