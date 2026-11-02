// Online RLS tests against the Supabase dev project (cinematch-dev). NOT part of `npm test` (decision D1).
// Run: npm run test:rls  (= node --env-file=.env --test tests/rls/*.test.js)
// Needs in .env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY,
// the migrations pushed and the seed loaded (specs/003-sys-core/quickstart.md, Slice 1).
// Accounts made here are test fixtures: created with the admin API (no email is sent) and removed afterwards.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const CONSENT_VERSION = '2026-11-01';
const options = { auth: { persistSession: false, autoRefreshToken: false } };

let anon;
let admin;
const created = [];

async function createTestAccount(metadata) {
  const email = `rls-${randomUUID()}@example.test`;
  const password = `${randomUUID()}Aa1`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: metadata });
  if (error) throw new Error(`createUser failed: ${error.message}`);
  created.push(data.user.id);
  return { id: data.user.id, email, password };
}

async function signedInClient({ email, password }) {
  const client = createClient(URL, PUBLISHABLE, options);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed: ${error.message}`);
  return client;
}

const SIGNUP_METADATA = {
  full_name: 'RLS Test Producer', crew_role: 'producer', org_name: 'RLS Test Films', country: 'GB',
  locale: 'en', consent_version: CONSENT_VERSION
};

describe('Row Level Security on cinematch-dev (npm run test:rls)', () => {
  before(() => {
    const missing = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY'].filter(n => !process.env[n]);
    assert.deepEqual(missing, [], `Set ${missing.join(', ')} in .env (see .env.example)`);
    anon = createClient(URL, PUBLISHABLE, options);
    admin = createClient(URL, SECRET, options);
  });

  after(async () => {
    for (const id of created) {
      for (const table of ['consent', 'profile', 'user_account']) {
        await admin.from(table).delete().eq('user_id', id);
      }
      await admin.auth.admin.deleteUser(id);
    }
  });

  test('BR-001 / US-2 Scenario 1: with the publishable key, authority_contact returns 0 rows', async () => {
    const { data, error } = await anon.from('authority_contact').select('*');
    assert.equal(error, null, error?.message);
    assert.equal(data.length, 0);
  });

  test('BR-001: the 0 rows come from RLS — the secret key does see the contacts', async () => {
    const { data, error } = await admin.from('authority_contact').select('location_id');
    assert.equal(error, null, error?.message);
    assert.ok(data.length > 0, 'seed loaded');
  });

  test('BR-001: with the publishable key, profiles, consents and the audit log return 0 rows', async () => {
    for (const table of ['profile', 'consent', 'audit_log']) {
      const { data, error } = await anon.from(table).select('*').limit(5);
      assert.equal(error, null, `${table}: ${error?.message}`);
      assert.equal(data.length, 0, table);
    }
  });

  test('US-2 Scenario 2: a signed-in member reads the verified contacts of published locations', async () => {
    const member = await signedInClient(await createTestAccount(SIGNUP_METADATA));
    const { data, error } = await member.from('authority_contact').select('location_id, contact_verified');
    assert.equal(error, null, error?.message);
    assert.ok(data.length > 0);
    assert.ok(data.every(r => r.contact_verified === true));
  });

  test("BR-001 / M4: a member cannot read another organisation's private layer (no accepted request with NDA)", async () => {
    const { data: all, error: adminError } = await admin.from('organisation_private_layer').select('org_id');
    assert.equal(adminError, null, adminError?.message);
    assert.ok(all.length > 0, 'private layers exist in the seed');

    const member = await signedInClient(await createTestAccount(SIGNUP_METADATA));
    const { data, error } = await member.from('organisation_private_layer').select('*');
    assert.equal(error, null, error?.message);
    assert.equal(data.length, 0);
  });

  test('BR-002: a new account is always member, even when the sign-up metadata claims another role', async () => {
    const account = await createTestAccount({ ...SIGNUP_METADATA, role: 'admin', account_status: 'active', user_id: randomUUID() });
    const { data, error } = await admin.from('user_account').select('user_id, role, account_status, email_verified').eq('user_id', account.id).single();
    assert.equal(error, null, error?.message);
    assert.equal(data.role, 'member');
    assert.equal(data.account_status, 'active');
  });

  test('BR-002: a member cannot change their own role', async () => {
    const account = await createTestAccount(SIGNUP_METADATA);
    const member = await signedInClient(account);
    await member.from('user_account').update({ role: 'admin' }).eq('user_id', account.id);
    const { data } = await admin.from('user_account').select('role').eq('user_id', account.id).single();
    assert.equal(data.role, 'member');
  });

  test('BR-003 / FR-001: sign-up stores the consent with its version and the time of acceptance', async () => {
    const startedAt = Date.now();
    const account = await createTestAccount(SIGNUP_METADATA);
    const { data, error } = await admin.from('consent').select('consent_version, accepted_at').eq('user_id', account.id);
    assert.equal(error, null, error?.message);
    assert.equal(data.length, 1);
    assert.equal(data[0].consent_version, CONSENT_VERSION);
    const acceptedAt = Date.parse(data[0].accepted_at);
    assert.ok(Math.abs(acceptedAt - startedAt) < 120_000, 'accepted_at is the time of sign-up');

    const { data: profile } = await admin.from('profile').select('full_name, crew_role').eq('user_id', account.id).single();
    assert.equal(profile?.full_name, 'RLS Test Producer');
  });
});
