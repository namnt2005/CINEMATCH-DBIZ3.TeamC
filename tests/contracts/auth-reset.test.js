import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeAuthSupabase, authCalls, jsonRequest, useFakeSupabase, resetFakeSupabase, ACTIVE, DEACTIVATED } from './auth-fakes.js';

const route = (name) => import(`../../app/api/auth/${name}/route.js`);

async function post(name, body, client = fakeAuthSupabase()) {
  await useFakeSupabase(client);
  const { POST } = await route(name);
  const res = await POST(jsonRequest(`/api/auth/${name}`, body));
  return { res, json: await res.json(), client };
}

describe('Forgot password on SC-06 (T033, FR-003, SR-211..214, BR-004, BR-005)', () => {
  afterEach(resetFakeSupabase);

  test('FR-003: a known active email → 200 sent, and Supabase Auth sends one reset link back to this site', async () => {
    const { res, json, client } = await post('forgot-password', { email: ACTIVE.email });
    assert.equal(res.status, 200);
    assert.deepEqual(json, { status: 'sent' });
    const calls = authCalls(client, 'resetPasswordForEmail');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].email, ACTIVE.email);
    const link = new URL(calls[0].options.redirectTo);
    assert.equal(link.origin, 'http://localhost:3000');
    assert.equal(link.pathname, '/reset-password');
  });

  test('SR-211: the answer is identical whether or not an account exists for the email', async () => {
    const known = await post('forgot-password', { email: ACTIVE.email });
    const unknown = await post('forgot-password', { email: 'nobody@harbourline.example' });
    assert.equal(known.res.status, unknown.res.status);
    assert.deepEqual(known.json, unknown.json);
    assert.ok(!JSON.stringify(unknown.json).includes('nobody@harbourline.example'));
  });

  test('SR-213 / BR-005: a deactivated account gets the same neutral answer but no reset email', async () => {
    const { res, json, client } = await post('forgot-password', { email: DEACTIVATED.email });
    assert.equal(res.status, 200);
    assert.deepEqual(json, { status: 'sent' });
    assert.equal(authCalls(client, 'resetPasswordForEmail').length, 0);
  });

  test('SR-213: the email is matched without regard to case or spaces', async () => {
    const { client } = await post('forgot-password', { email: `  ${DEACTIVATED.email.toUpperCase()} ` });
    assert.equal(authCalls(client, 'resetPasswordForEmail').length, 0);
  });
});

describe('Reset password on SC-07 (T033, FR-003, SR-221..224, BR-004, BR-005)', () => {
  afterEach(resetFakeSupabase);

  test('FR-003: with the recovery session from the link, a new password of 10+ characters is saved → 200 ok', async () => {
    const client = fakeAuthSupabase({ currentUser: ACTIVE });
    const { res, json } = await post('reset-password', { new_password: 'new-password-42' }, client);
    assert.equal(res.status, 200);
    assert.deepEqual(json, { status: 'ok' });
    assert.deepEqual(authCalls(client, 'updateUser').map(c => c.args), [{ password: 'new-password-42' }]);
  });

  test('SR-224: after a successful reset, every other session of the account is signed out', async () => {
    const client = fakeAuthSupabase({ currentUser: ACTIVE });
    await post('reset-password', { new_password: 'new-password-42' }, client);
    assert.deepEqual(authCalls(client, 'signOut').map(c => c.args), [{ scope: 'others' }]);
  });

  test('SR-222: the new password follows the sign-up rule (10 to 72); nothing is sent otherwise', async () => {
    for (const bad of ['a'.repeat(9), 'a'.repeat(73), '', undefined]) {
      const client = fakeAuthSupabase({ currentUser: ACTIVE });
      const { res, json } = await post('reset-password', { new_password: bad }, client);
      assert.equal(res.status, 422, String(bad?.length));
      assert.ok(json.fields?.new_password);
      assert.equal(authCalls(client, 'updateUser').length, 0);
    }
  });

  test('SR-221: an expired or used link (no recovery session) → 410 LINK_EXPIRED', async () => {
    const client = fakeAuthSupabase({ currentUser: null });
    const { res, json } = await post('reset-password', { new_password: 'new-password-42' }, client);
    assert.equal(res.status, 410);
    assert.equal(json.error, 'LINK_EXPIRED');
    assert.equal(authCalls(client, 'updateUser').length, 0);
  });

  test('SR-223 / BR-005: a deactivated account cannot be reactivated by a reset → 403, password unchanged', async () => {
    const client = fakeAuthSupabase({ currentUser: DEACTIVATED });
    const { res, json } = await post('reset-password', { new_password: 'new-password-42' }, client);
    assert.equal(res.status, 403);
    assert.equal(json.error, 'ACCOUNT_DEACTIVATED');
    assert.equal(authCalls(client, 'updateUser').length, 0);
  });

  test('BR-004: the new password is never returned', async () => {
    const client = fakeAuthSupabase({ currentUser: ACTIVE });
    const { json } = await post('reset-password', { new_password: 'new-password-42' }, client);
    assert.ok(!JSON.stringify(json).includes('new-password-42'));
  });
});
