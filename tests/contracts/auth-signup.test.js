import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeAuthSupabase, authCalls, jsonRequest, useFakeSupabase, resetFakeSupabase, ACTIVE, UNSAFE_NEXT } from './auth-fakes.js';

const loadRoute = () => import('../../app/api/auth/sign-up/route.js');

const FORM = {
  full_name: 'Jane Doe', email: 'jane@harbourline.example', password: 'at-least-10-chars',
  org_name: 'Harbour Line Films', country: 'GB', crew_role: 'producer',
  website: 'https://harbourline.example', terms_accepted: true, locale: 'en'
};

async function signUp(body, client = fakeAuthSupabase()) {
  await useFakeSupabase(client);
  const { POST } = await loadRoute();
  const res = await POST(jsonRequest('/api/auth/sign-up', body));
  return { res, json: await res.json(), client };
}

describe('POST /api/auth/sign-up on SC-04 (T030, FR-001, US-1 Scenarios 1 and 3, BR-002..BR-004)', () => {
  afterEach(resetFakeSupabase);

  test('US-1 Scenario 1: a valid form creates an unverified account and answers 201 verification_sent', async () => {
    const { res, json, client } = await signUp(FORM);
    assert.equal(res.status, 201);
    assert.deepEqual(json, { status: 'verification_sent' });
    const [call] = authCalls(client, 'signUp');
    assert.equal(call.args.email, FORM.email);
    assert.equal(call.args.password, FORM.password, 'the password goes to Supabase Auth only (BR-004)');
  });

  test('FR-001 / BR-003: the user metadata carries the form fields and a server-chosen consent version', async () => {
    const { client } = await signUp(FORM);
    const meta = authCalls(client, 'signUp')[0].args.options.data;
    for (const key of ['full_name', 'org_name', 'country', 'crew_role', 'website', 'locale']) assert.equal(meta[key], FORM[key], key);
    assert.equal(typeof meta.consent_version, 'string');
    assert.ok(meta.consent_version.length > 0 && meta.consent_version.length <= 20, 'consent_version fits VARCHAR(20)');
  });

  test('BR-004: the password is never in the metadata nor in the answer', async () => {
    const { json, client } = await signUp(FORM);
    assert.ok(!JSON.stringify(authCalls(client, 'signUp')[0].args.options).includes(FORM.password));
    assert.ok(!JSON.stringify(json).includes(FORM.password));
  });

  test('BR-002 / BR-003: a role, a status or a consent version sent by the browser is ignored', async () => {
    const { res, client } = await signUp({ ...FORM, role: 'admin', account_status: 'active', consent_version: '0.0' });
    assert.equal(res.status, 201);
    const meta = authCalls(client, 'signUp')[0].args.options.data;
    assert.ok(!('role' in meta) && !('account_status' in meta));
    assert.notEqual(meta.consent_version, '0.0');
  });

  test('US-1 Scenario 2 / SC-04: the verification link comes back to /auth/callback on this site, then to the page that led here', async () => {
    const { client } = await signUp({ ...FORM, next: '/locations/trang-an' });
    const link = new URL(authCalls(client, 'signUp')[0].args.options.emailRedirectTo);
    assert.equal(link.origin, 'http://localhost:3000');
    assert.equal(link.pathname, '/auth/callback');
    assert.equal(link.searchParams.get('next'), '/locations/trang-an');
  });

  test('SR-025: without a safe next, the verification link leads to /locations (interim for SC-02, Open question 2)', async () => {
    for (const next of [undefined, ...UNSAFE_NEXT]) {
      const { client } = await signUp({ ...FORM, next });
      const link = new URL(authCalls(client, 'signUp')[0].args.options.emailRedirectTo);
      assert.equal(link.searchParams.get('next'), '/locations', String(next));
    }
  });

  test('US-1 Scenario 3: an email that already has an account → 409 EMAIL_TAKEN with "Log in?"', async () => {
    const { res, json } = await signUp({ ...FORM, email: ACTIVE.email });
    assert.equal(res.status, 409);
    assert.equal(json.error, 'EMAIL_TAKEN');
    assert.match(json.message, /already has an account/i);
    assert.match(json.message, /log in/i);
  });

  test('FR-001: an invalid form → 422 VALIDATION_ERROR with fields, and Supabase is not called', async () => {
    const { res, json, client } = await signUp({ ...FORM, password: 'short', country: 'Britain', terms_accepted: false });
    assert.equal(res.status, 422);
    assert.equal(json.error, 'VALIDATION_ERROR');
    assert.deepEqual(Object.keys(json.fields).sort(), ['country', 'password', 'terms_accepted']);
    assert.equal(authCalls(client, 'signUp').length, 0);
  });

  test('FR-001: a body that is not JSON → 400, Supabase is not called', async () => {
    const client = fakeAuthSupabase();
    await useFakeSupabase(client);
    const { POST } = await loadRoute();
    const res = await POST(new Request('http://localhost:3000/api/auth/sign-up', { method: 'POST', body: 'not json' }));
    assert.equal(res.status, 400);
    assert.equal(authCalls(client, 'signUp').length, 0);
  });
});
