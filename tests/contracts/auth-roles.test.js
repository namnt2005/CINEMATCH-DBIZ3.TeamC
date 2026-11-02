import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const loadMiddleware = () => import('../../middleware.js');
const loadTesting = () => import('../../lib/supabase/testing.js');

function fakeSession(role) {
  const userId = role ? '11111111-1111-4111-8111-111111111111' : null;
  return {
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: role ? { role, account_status: 'active' } : null, error: null }) }) }) })
  };
}

const request = (path, headers = {}) => new Request(`http://localhost:3000${path}`, { headers });

describe('/admin/* is for VFDA staff only (T034, FR-004, D5, BR-001)', () => {
  afterEach(async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    (await loadTesting()).resetSupabaseClientsForTests();
  });

  test('FR-004: a member gets 403 on /admin/locations and on /api/admin/locations (mock role, offline)', async () => {
    const { middleware } = await loadMiddleware();
    for (const path of ['/admin/locations', '/api/admin/locations']) {
      const res = await middleware(request(path, { 'x-mock-role': 'member' }));
      assert.equal(res.status, 403, path);
    }
  });

  test('FR-004: with Supabase, a member session gets 403 even when sending x-mock-role: vfda_staff', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    (await loadTesting()).setSupabaseClientsForTests({ user: fakeSession('member') });
    const { middleware } = await loadMiddleware();
    for (const path of ['/admin/locations', '/api/admin/locations']) {
      const res = await middleware(request(path, { 'x-mock-role': 'vfda_staff' }));
      assert.equal(res.status, 403, path);
    }
  });

  test('D5: vfda_staff and admin pass through to /admin/*', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    const { middleware } = await loadMiddleware();
    for (const role of ['vfda_staff', 'admin']) {
      (await loadTesting()).setSupabaseClientsForTests({ user: fakeSession(role) });
      const res = await middleware(request('/admin/locations'));
      assert.notEqual(res.status, 403, role);
      assert.ok(!res.headers.get('location'), `${role} is not redirected`);
    }
  });

  test('FR-002: a guest opening /admin/locations is sent to /login with next', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    (await loadTesting()).setSupabaseClientsForTests({ user: fakeSession(null) });
    const { middleware } = await loadMiddleware();
    const res = await middleware(request('/admin/locations'));
    assert.ok([302, 307].includes(res.status));
    assert.match(res.headers.get('location'), /\/login\?next=%2Fadmin%2Flocations/);
  });

  test('BR-001: public pages are not blocked by the admin gate', async () => {
    const { middleware } = await loadMiddleware();
    const res = await middleware(request('/locations/trang-an', { 'x-mock-role': 'member' }));
    assert.notEqual(res.status, 403);
  });
});
