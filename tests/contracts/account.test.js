import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase, useFakes, resetFakes } from './supabase-fake.js';

const ME = '11111111-1111-4111-8111-111111111111';
const ORG = '33333333-3333-4333-8333-333333333333';

function tables() {
  return {
    user_account: [{ user_id: ME, email: 'lena.park@harbourline.example.kr', email_verified: true, role: 'member', account_status: 'active' }],
    profile: [{ user_id: ME, full_name: 'Lena Park', crew_role: 'producer', locale: 'en', producer_org_id: ORG }],
    producer_organisation: [{ producer_org_id: ORG, org_name: 'Harbour Line Films', country: 'KR', website: null }],
    consent: [
      { user_id: ME, consent_version: '2026.1', accepted_at: '2026-08-30T10:01:00+07:00' },
      { user_id: ME, consent_version: '2026.2', accepted_at: '2026-09-20T08:15:00+07:00' }
    ]
  };
}

// The user client sees the user's rows; the System client (secret key) runs the anonymisation
function setup({ signedIn = true } = {}) {
  const shared = tables();
  const user = fakeSupabase({
    user: signedIn ? { id: ME, email: 'lena.park@harbourline.example.kr' } : null,
    tables: shared,
    rpc: {
      app_deactivate_my_account: (_args, { data }) => {
        data.user_account[0].account_status = 'deactivated';
        return { data: { user_id: ME, account_status: 'deactivated' }, error: null };
      }
    }
  });
  const admin = fakeSupabase({
    store: user.tables,
    rpc: {
      app_anonymise_deactivated: (_args, { data }) => {
        for (const p of data.profile) p.full_name = 'Former member';
        for (const u of data.user_account) if (u.account_status === 'deactivated') u.email = `former-member-${u.user_id}@anonymised.example`;
        return { data: 1, error: null };
      }
    }
  });
  return { user, admin };
}

const call = async (method, path, body) => {
  const mod = await import(`../../app/api/account${path}/route.js`);
  const init = { method, headers: { 'content-type': 'application/json' } };
  if (body !== undefined) init.body = JSON.stringify(body);
  return mod[method](new Request(`http://localhost:3000/api/account${path}`, init));
};

describe('My account — SC-08 (T050, FR-004, FR-005, BR-002, BR-003, BR-005, SR-231..SR-235)', () => {
  afterEach(resetFakes);

  test('SR-231 / SR-235: GET shows the account, the organisation and the accepted versions; a guest gets 401', async () => {
    await useFakes(setup({ signedIn: false }));
    assert.equal((await call('GET', '')).status, 401);
    await resetFakes();
    await useFakes(setup());
    const res = await call('GET', '');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.email, 'lena.park@harbourline.example.kr');
    assert.equal(body.email_verified, true);
    assert.equal(body.role, 'member');
    assert.equal(body.full_name, 'Lena Park');
    assert.deepEqual(body.organisation, { org_name: 'Harbour Line Films', country: 'KR', website: null });
    assert.deepEqual(body.consents.map(c => c.consent_version), ['2026.2', '2026.1'], 'newest first');
  });

  test('SC-08 #8: PATCH saves name, crew role, organisation, country, website and language', async () => {
    const { user, admin } = setup();
    await useFakes({ user, admin });
    const res = await call('PATCH', '', { full_name: 'Lena J. Park', crew_role: 'director', org_name: 'Harbour Line Studio', country: 'gb', website: 'https://harbourline.example', locale: 'vi' });
    assert.equal(res.status, 200);
    const profile = user.tables.profile[0];
    assert.deepEqual([profile.full_name, profile.crew_role, profile.locale], ['Lena J. Park', 'director', 'vi']);
    assert.deepEqual(user.tables.producer_organisation[0], { producer_org_id: ORG, org_name: 'Harbour Line Studio', country: 'GB', website: 'https://harbourline.example' });
    assert.match(res.headers.get('set-cookie') || '', /locale=vi/, 'FR-005: the language cookie follows');
  });

  test('SR-231 / SR-232 / BR-002: email, role or status cannot be changed → 422, nothing saved', async () => {
    const { user, admin } = setup();
    await useFakes({ user, admin });
    for (const body of [{ email: 'x@y.vn' }, { role: 'admin' }, { account_status: 'active' }, { full_name: '' }, { crew_role: 'gaffer' }]) {
      const res = await call('PATCH', '', body);
      assert.equal(res.status, 422, JSON.stringify(body));
    }
    assert.equal(user.tables.user_account[0].role, 'member');
    assert.equal(user.tables.profile[0].full_name, 'Lena Park');
  });

  test('SR-234: deletion needs DELETE typed exactly', async () => {
    const { user, admin } = setup();
    await useFakes({ user, admin });
    for (const confirm of [undefined, 'delete', 'DELETE ', 'yes']) {
      assert.equal((await call('POST', '/deactivate', { confirm })).status, 422, String(confirm));
    }
    assert.equal(user.tables.user_account[0].account_status, 'active');
  });

  test('BR-005: deletion deactivates at once, signs out everywhere, and anonymises name and email', async () => {
    const { user, admin } = setup();
    await useFakes({ user, admin });
    const res = await call('POST', '/deactivate', { confirm: 'DELETE' });
    assert.equal(res.status, 200);
    assert.equal(user.tables.user_account[0].account_status, 'deactivated');
    assert.ok(user.calls.some(c => c.rpc === 'app_deactivate_my_account'), 'deactivated by the user\'s own call');
    assert.ok(user.calls.some(c => c.auth === 'signOut' && c.args?.scope === 'global'), 'every session ends');
    assert.ok(admin.calls.some(c => c.rpc === 'app_anonymise_deactivated'), 'anonymised by the System client');
    assert.equal(user.tables.profile[0].full_name, 'Former member');
    assert.match(user.tables.user_account[0].email, /^former-member-/);
    const authUpdate = admin.calls.find(c => c.authAdmin === 'updateUserById');
    assert.equal(authUpdate.id, ME);
    assert.match(authUpdate.attrs.email, /^former-member-.*@anonymised\.example$/, 'the sign-in email is replaced too');
    assert.ok(authUpdate.attrs.ban_duration, 'the identity can no longer sign in');
    assert.deepEqual(authUpdate.attrs.user_metadata, {}, 'the sign-up metadata (name, company) is cleared');
  });

  test('BR-005: after deletion the account is a guest (no access)', async () => {
    const { user, admin } = setup();
    await useFakes({ user, admin });
    await call('POST', '/deactivate', { confirm: 'DELETE' });
    const { getSession } = await import('../../lib/auth/session.js');
    assert.equal((await getSession()).isAuthenticated, false);
  });
});
