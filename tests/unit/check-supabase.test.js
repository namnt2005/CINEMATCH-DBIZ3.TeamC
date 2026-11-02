import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const loadCheck = () => import('../../scripts/lib/supabase-check.mjs');

// Fake supabase-js client: from(table).select('*').limit(n) (+ .eq) resolves to the rows given per table
function fakeClient(rowsByTable) {
  return {
    from(table) {
      const rows = rowsByTable[table] ?? [];
      const result = { data: rows, error: null };
      const chain = { select: () => chain, limit: () => chain, eq: () => chain, then: (ok, ko) => Promise.resolve(result).then(ok, ko) };
      return chain;
    }
  };
}

const ONE = [{ id: 1 }];
const SAFE_ANON = { authority_contact: [], profile: [], consent: [], audit_log: [], province: ONE, location: ONE };

describe('npm run check:supabase logic (T018, BR-001, US-2 Scenario 1, research R8)', () => {
  test('BR-001: PASS when the publishable key reads no contact and the secret key does', async () => {
    const { runSupabaseChecks } = await loadCheck();
    const report = await runSupabaseChecks({ anonClient: fakeClient(SAFE_ANON), secretClient: fakeClient({ authority_contact: ONE }) });
    assert.equal(report.ok, true);
    assert.ok(report.lines.every(l => l.ok));
  });

  test('BR-001 / US-2 Scenario 1: FAIL when the publishable key can read an authority contact', async () => {
    const { runSupabaseChecks } = await loadCheck();
    const report = await runSupabaseChecks({
      anonClient: fakeClient({ ...SAFE_ANON, authority_contact: ONE }),
      secretClient: fakeClient({ authority_contact: ONE })
    });
    assert.equal(report.ok, false);
    assert.ok(report.lines.some(l => !l.ok && /authority_contact/.test(l.name)));
  });

  test('R8: FAIL when the secret key reads no contact either (an empty table would hide a broken RLS)', async () => {
    const { runSupabaseChecks } = await loadCheck();
    const report = await runSupabaseChecks({ anonClient: fakeClient(SAFE_ANON), secretClient: fakeClient({}) });
    assert.equal(report.ok, false);
  });

  test('BR-001: FAIL when anon can read profiles, consents or the audit log', async () => {
    const { runSupabaseChecks } = await loadCheck();
    for (const table of ['profile', 'consent', 'audit_log']) {
      const report = await runSupabaseChecks({ anonClient: fakeClient({ ...SAFE_ANON, [table]: ONE }), secretClient: fakeClient({ authority_contact: ONE }) });
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
});
