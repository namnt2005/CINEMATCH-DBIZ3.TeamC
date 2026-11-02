import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const loadCheck = () => import('../../scripts/lib/supabase-check.mjs');

// Fake supabase-js client: from(table).select('*', { count: 'exact' }).limit(n) (+ .eq) resolves to
// { data, count, error }. A table given as an Error-like { code } object answers with that error.
const DENIED = { code: '42501', message: 'permission denied for table authority_contact' };
function fakeClient(byTable) {
  return {
    from(table) {
      const value = byTable[table] ?? [];
      const result = Array.isArray(value)
        ? { data: value.slice(0, 1), count: value.length, error: null }
        : { data: null, count: null, error: value };
      const chain = { select: () => chain, limit: () => chain, eq: () => chain, then: (ok, ko) => Promise.resolve(result).then(ok, ko) };
      return chain;
    }
  };
}

const ONE = [{ id: 1 }];
const rowsOf = (n) => Array.from({ length: n }, (_, i) => ({ id: i }));
const PUBLISHED = 9;
// T013: anon has no GRANT on these four tables, so the real answer is permission denied
const SAFE_ANON = { authority_contact: DENIED, profile: DENIED, consent: DENIED, audit_log: DENIED, province: rowsOf(34), location: rowsOf(PUBLISHED) };
const run = async (anon, secret = { authority_contact: ONE }, expected = { publishedLocations: PUBLISHED }) =>
  (await loadCheck()).runSupabaseChecks({ anonClient: fakeClient(anon), secretClient: fakeClient(secret), expected });

describe('npm run check:supabase logic (T018, BR-001, US-2 Scenario 1, research R8)', () => {
  test('BR-001: PASS when the publishable key reads no contact and the secret key does', async () => {
    const report = await run(SAFE_ANON);
    assert.equal(report.ok, true, JSON.stringify(report.lines));
    assert.ok(report.lines.every(l => l.ok));
  });

  test('BR-001 / US-2 Scenario 1: FAIL when the publishable key can read an authority contact', async () => {
    const report = await run({ ...SAFE_ANON, authority_contact: ONE });
    assert.equal(report.ok, false);
    assert.ok(report.lines.some(l => !l.ok && /authority_contact/.test(l.name)));
  });

  test('R8: FAIL when the secret key reads no contact either (an empty table would hide a broken RLS)', async () => {
    const report = await run(SAFE_ANON, {});
    assert.equal(report.ok, false);
  });

  test('BR-001: FAIL when anon can read profiles, consents or the audit log', async () => {
    for (const table of ['profile', 'consent', 'audit_log']) {
      const report = await run({ ...SAFE_ANON, [table]: ONE });
      assert.equal(report.ok, false, table);
    }
  });

  test('R8: refuses swapped or identical keys and never prints a key', async () => {
    const { validateKeys } = await loadCheck();
    assert.throws(() => validateKeys({ publishableKey: 'sb_secret_abc', secretKey: 'sb_secret_abc' }), /same|swapped/i);
    assert.throws(() => validateKeys({ publishableKey: 'sb_publishable_x', secretKey: 'sb_publishable_y' }), /secret/i);
    try {
      validateKeys({ publishableKey: 'sb_publishable_SHOWME', secretKey: 'sb_publishable_SHOWME' });
    } catch (err) {
      assert.ok(!err.message.includes('SHOWME'));
    }
    assert.doesNotThrow(() => validateKeys({ publishableKey: 'sb_publishable_x', secretKey: 'sb_secret_y' }));
  });

  test('T013: a table anon cannot read passes when blocked by GRANT (42501) or when RLS returns 0 rows, and says which', async () => {
    const report = await run({ ...SAFE_ANON, consent: [] });
    const line = (t) => report.lines.find(l => l.name.includes(t));
    assert.equal(report.ok, true);
    assert.match(line('authority_contact').detail, /blocked by GRANT/);
    assert.match(line('consent').detail, /0 rows by RLS/);
  });

  test('R8: any other error on a protected table is a FAIL, not a pass', async () => {
    const report = await run({ ...SAFE_ANON, profile: { code: 'PGRST301', message: 'JWT expired' } });
    assert.equal(report.ok, false);
    assert.match(report.lines.find(l => l.name.includes('profile')).detail, /JWT expired/);
  });

  test('R8: province and public locations print the exact total, not a page of 5', async () => {
    const report = await run(SAFE_ANON);
    assert.match(report.lines.find(l => l.name.includes('province')).detail, /\b34 rows\b/);
    assert.match(report.lines.find(l => l.name.includes('location')).detail, /\b9 rows\b/);
  });

  test('BR-008: the public location count must equal the published locations of the seed', async () => {
    const report = await run({ ...SAFE_ANON, location: rowsOf(11) });
    assert.equal(report.ok, false);
    assert.match(report.lines.find(l => !l.ok).detail, /11 rows.*9 published/);
  });

  test('R8: the seed has 9 published locations (mui-ne awaits a contact, cua-van is unpublished) (data/seed/21_location.csv)', async () => {
    const { seedPublishedLocations } = await loadCheck();
    assert.equal(seedPublishedLocations(), 9);
  });

  test('R8: the secret-key line explains what it proves', async () => {
    const report = await run(SAFE_ANON);
    const line = report.lines.find(l => l.name.startsWith('secret key'));
    assert.doesNotMatch(line.name, /the 0 above is RLS/);
    assert.match(line.name, /not an empty table/);
  });
});
