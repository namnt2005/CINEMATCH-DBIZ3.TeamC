import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeAuthSupabase, authCalls, jsonRequest, useFakeSupabase, resetFakeSupabase, ACTIVE, DEACTIVATED, UNSAFE_NEXT } from './auth-fakes.js';

const route = (name) => import(`../../app/api/auth/${name}/route.js`);

async function post(name, body, client = fakeAuthSupabase()) {
  await useFakeSupabase(client);
  const { POST } = await route(name);
  const res = await POST(jsonRequest(`/api/auth/${name}`, body));
  return { res, json: await res.json(), client };
}

describe('Sign-in, sign-out and resend on SC-04 / SC-05 (T032, FR-002, SR-025, BR-004, BR-005)', () => {
  afterEach(resetFakeSupabase);

  test('FR-002: the right email and password sign in and answer 200 with the redirect', async () => {
    const { res, json, client } = await post('sign-in', { email: ACTIVE.email, password: ACTIVE.password });
    assert.equal(res.status, 200);
    assert.equal(json.redirect, '/locations');
    assert.equal(client.currentUser?.id, ACTIVE.id, 'a session was started');
  });

  test('SR-025: after sign-in the user returns to the page that led here, query string kept', async () => {
    for (const next of ['/locations/trang-an', '/admin/locations?status=published', '/locations?q=hang%20dong']) {
      const { json } = await post('sign-in', { email: ACTIVE.email, password: ACTIVE.password, next });
      assert.equal(json.redirect, next);
    }
  });

  test('SR-025: an external or malformed next is refused (no open redirect); the user goes to /locations', async () => {
    for (const next of UNSAFE_NEXT) {
      const { res, json } = await post('sign-in', { email: ACTIVE.email, password: ACTIVE.password, next });
      assert.equal(res.status, 200, next);
      assert.equal(json.redirect, '/locations', next);
    }
  });

  test('SC-04 Error: a wrong password and an unknown email get the same 401 answer, which does not say which one', async () => {
    const wrongPassword = await post('sign-in', { email: ACTIVE.email, password: 'not-the-password' });
    const unknownEmail = await post('sign-in', { email: 'nobody@harbourline.example', password: 'not-the-password' });
    for (const { res } of [wrongPassword, unknownEmail]) assert.equal(res.status, 401);
    assert.deepEqual(wrongPassword.json, unknownEmail.json, 'identical body: the email cannot be probed');
    assert.equal(wrongPassword.json.error, 'INVALID_CREDENTIALS');
    assert.match(wrongPassword.json.message, /email or password is incorrect/i);
  });

  test('SC-04 Error: the answer never repeats the email, the password or Supabase wording', async () => {
    for (const email of [ACTIVE.email, 'nobody@harbourline.example']) {
      const { json } = await post('sign-in', { email, password: 'not-the-password' });
      const text = JSON.stringify(json).toLowerCase();
      for (const leak of [email, 'not-the-password', 'user not found', 'invalid login credentials', 'not registered', 'no account']) {
        assert.ok(!text.includes(leak), `leaks "${leak}"`);
      }
    }
  });

  test('BR-005: a deactivated account → 403 ACCOUNT_DEACTIVATED and the new session is closed again', async () => {
    const { res, json, client } = await post('sign-in', { email: DEACTIVATED.email, password: DEACTIVATED.password });
    assert.equal(res.status, 403);
    assert.equal(json.error, 'ACCOUNT_DEACTIVATED');
    assert.ok(authCalls(client, 'signOut').length >= 1);
    assert.equal(client.currentUser, null);
  });

  test('BR-005: a deactivated account with a WRONG password gets the generic 401, not 403 (no status probing)', async () => {
    const { res, json } = await post('sign-in', { email: DEACTIVATED.email, password: 'not-the-password' });
    assert.equal(res.status, 401);
    assert.equal(json.error, 'INVALID_CREDENTIALS');
  });

  test('BR-004: the password is passed to Supabase Auth only and never returned', async () => {
    const { json, client } = await post('sign-in', { email: ACTIVE.email, password: ACTIVE.password });
    assert.equal(authCalls(client, 'signInWithPassword')[0].args.password, ACTIVE.password);
    assert.ok(!JSON.stringify(json).includes(ACTIVE.password));
  });

  test('FR-002: sign-out ends the session → 200', async () => {
    const client = fakeAuthSupabase({ currentUser: ACTIVE });
    const { res } = await post('sign-out', {}, client);
    assert.equal(res.status, 200);
    assert.equal(authCalls(client, 'signOut').length, 1);
    assert.equal(client.currentUser, null);
  });

  test('SC-04 edge case: resend verification answers 200 with the same body for a known and an unknown email', async () => {
    const known = await post('resend-verification', { email: ACTIVE.email });
    const unknown = await post('resend-verification', { email: 'nobody@harbourline.example' });
    assert.equal(known.res.status, 200);
    assert.equal(unknown.res.status, 200);
    assert.deepEqual(known.json, unknown.json);
  });

  test('SC-04 edge case: resend still answers 200 when the email provider is down (no account enumeration)', async () => {
    const { res } = await post('resend-verification', { email: ACTIVE.email }, fakeAuthSupabase({ resendFails: true }));
    assert.equal(res.status, 200);
  });
});

describe('Return to the page that led to sign-in (SR-025, FR-002)', () => {
  test('SR-025: safeNext keeps internal paths with their query and refuses everything else', async () => {
    const { safeNext } = await import('../../lib/auth/next.js');
    assert.equal(safeNext('/admin/locations?status=published'), '/admin/locations?status=published');
    assert.equal(safeNext('/locations/trang-an'), '/locations/trang-an');
    for (const next of [undefined, null, '', ...UNSAFE_NEXT]) assert.equal(safeNext(next), '/locations', String(next));
  });

  test('SR-025: a guest sent to sign-in from an admin page keeps the query string in next', async () => {
    const { middleware } = await import('../../middleware.js');
    const res = await middleware(new Request('http://localhost:3000/admin/locations?status=published'));
    const target = new URL(res.headers.get('location'));
    assert.equal(target.pathname, '/login');
    assert.equal(target.searchParams.get('next'), '/admin/locations?status=published');
  });
});
