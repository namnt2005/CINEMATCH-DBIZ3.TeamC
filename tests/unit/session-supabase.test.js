import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const loadSession = () => import('../../lib/auth/session.js');
const loadTesting = () => import('../../lib/supabase/testing.js');

// Fake @supabase/ssr user client: auth.getUser() and one user_account row
function fakeUserClient({ userId, row }) {
  return {
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: null }) },
    from: (table) => ({
      select: () => ({
        eq: (col, val) => ({
          maybeSingle: async () => ({ data: table === 'user_account' && row && val === userId ? row : null, error: null })
        })
      })
    })
  };
}

const MEMBER_ID = '11111111-1111-4111-8111-111111111111';

describe('getSession() on both sources (T006, FR-004, BR-005, research R6)', () => {
  afterEach(async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    (await loadTesting()).resetSupabaseClientsForTests();
  });

  test('R6: on the sqlite source the mock role still works (offline tests)', async () => {
    const { getSession } = await loadSession();
    const session = await getSession({ headers: new Headers({ 'x-mock-role': 'vfda_staff' }) });
    assert.equal(session.role, 'vfda_staff');
    assert.equal(session.isAuthenticated, true);
  });

  test('FR-004: on Supabase the role comes from user_account, and x-mock-role is ignored', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    (await loadTesting()).setSupabaseClientsForTests({
      user: fakeUserClient({ userId: MEMBER_ID, row: { role: 'member', account_status: 'active' } })
    });
    const { getSession } = await loadSession();
    const session = await getSession({ headers: new Headers({ 'x-mock-role': 'admin' }) });
    assert.equal(session.role, 'member');
    assert.equal(session.userId, MEMBER_ID);
  });

  test('BR-005: a deactivated account is a guest with no access', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    (await loadTesting()).setSupabaseClientsForTests({
      user: fakeUserClient({ userId: MEMBER_ID, row: { role: 'vfda_staff', account_status: 'deactivated' } })
    });
    const { getSession } = await loadSession();
    const session = await getSession({ headers: new Headers() });
    assert.equal(session.role, 'guest');
    assert.equal(session.isAuthenticated, false);
  });

  test('FR-004: with no Supabase session the visitor is a guest, whatever header is sent', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    (await loadTesting()).setSupabaseClientsForTests({ user: fakeUserClient({ userId: null }) });
    const { getSession } = await loadSession();
    const session = await getSession({ headers: new Headers({ 'x-mock-role': 'vfda_staff' }) });
    assert.equal(session.role, 'guest');
  });
});
