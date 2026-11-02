import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeAuthSupabase, authCalls, useFakeSupabase, resetFakeSupabase, ACTIVE, UNSAFE_NEXT } from './auth-fakes.js';

const loadRoute = () => import('../../app/auth/callback/route.js');

async function callback(query, client = fakeAuthSupabase({ codes: { 'good-code': ACTIVE, 'good-hash': ACTIVE } })) {
  await useFakeSupabase(client);
  const { GET } = await loadRoute();
  const res = await GET(new Request(`http://localhost:3000/auth/callback?${query}`));
  const location = res.headers.get('location');
  return { res, client, target: location ? new URL(location, 'http://localhost:3000') : null };
}

describe('GET /auth/callback — email verification link (T031, US-1 Scenario 2, FR-002, SR-025)', () => {
  afterEach(resetFakeSupabase);

  test('US-1 Scenario 2: a valid code starts the session and returns to the page that led to sign-up', async () => {
    const { res, client, target } = await callback('code=good-code&next=%2Flocations%2Ftrang-an');
    assert.ok(res.status >= 300 && res.status < 400, `redirect, got ${res.status}`);
    assert.equal(target.origin, 'http://localhost:3000');
    assert.equal(target.pathname, '/locations/trang-an');
    assert.deepEqual(authCalls(client, 'exchangeCodeForSession').map(c => c.code), ['good-code']);
  });

  test('US-1 Scenario 2: a token_hash link (email template) is verified the same way', async () => {
    const { target, client } = await callback('token_hash=good-hash&type=signup&next=%2Flocations');
    assert.equal(target.pathname, '/locations');
    assert.equal(authCalls(client, 'verifyOtp')[0].args.token_hash, 'good-hash');
  });

  test('Open question 2 (interim for SC-02): without next the user lands on /locations', async () => {
    const { target } = await callback('code=good-code');
    assert.equal(target.pathname, '/locations');
  });

  test('SR-025: an external next is refused; the user stays on this site at /locations', async () => {
    for (const next of UNSAFE_NEXT) {
      const { target } = await callback(`code=good-code&next=${encodeURIComponent(next)}`);
      assert.equal(target.origin, 'http://localhost:3000', next);
      assert.equal(target.pathname, '/locations', next);
    }
  });

  test('SC-04 edge case: an expired or used link → /login?error=link_expired, no session', async () => {
    const { target, client } = await callback('code=used-code&next=%2Flocations%2Ftrang-an');
    assert.equal(target.pathname, '/login');
    assert.equal(target.searchParams.get('error'), 'link_expired');
    assert.equal(client.currentUser, null);
  });

  test('SC-04 edge case: a link with neither code nor token → /login?error=link_expired', async () => {
    const { target } = await callback('next=%2Flocations');
    assert.equal(target.pathname, '/login');
    assert.equal(target.searchParams.get('error'), 'link_expired');
  });
});
