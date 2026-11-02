// Logic of `npm run check:supabase` (specs/003-sys-core research R8). Never prints a key.

/** Refuses missing, identical or swapped keys without echoing them. */
export function validateKeys({ publishableKey, secretKey }) {
  if (!publishableKey || !secretKey) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY in .env (see .env.example).');
  }
  if (publishableKey === secretKey) throw new Error('The publishable and secret keys are the same key: one of them is wrong (swapped?).');
  if (secretKey.startsWith('sb_publishable_')) throw new Error('SUPABASE_SECRET_KEY holds a publishable key: use the secret key (swapped?).');
  if (publishableKey.startsWith('sb_secret_')) throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY holds a secret key: never expose it (swapped?).');
}

async function count(client, table, filter) {
  let q = client.from(table).select('*').limit(5);
  if (filter) q = q.eq(...filter);
  const { data, error } = await q;
  if (error) return { rows: null, error: error.message };
  return { rows: data.length, error: null };
}

const CHECKS = [
  { name: 'anon reads 0 rows of authority_contact (BR-001)', client: 'anon', table: 'authority_contact', expect: 'none' },
  { name: 'anon reads 0 rows of profile', client: 'anon', table: 'profile', expect: 'none' },
  { name: 'anon reads 0 rows of consent', client: 'anon', table: 'consent', expect: 'none' },
  { name: 'anon reads 0 rows of audit_log', client: 'anon', table: 'audit_log', expect: 'none' },
  { name: 'anon reads province', client: 'anon', table: 'province', expect: 'some' },
  { name: 'anon reads published locations', client: 'anon', table: 'location', filter: ['intake_status', 'published'], expect: 'some' },
  { name: 'secret key reads authority_contact (the 0 above is RLS, not an empty table)', client: 'secret', table: 'authority_contact', expect: 'some' }
];

export async function runSupabaseChecks({ anonClient, secretClient }) {
  const lines = [];
  for (const c of CHECKS) {
    const { rows, error } = await count(c.client === 'anon' ? anonClient : secretClient, c.table, c.filter);
    const ok = !error && (c.expect === 'none' ? rows === 0 : rows > 0);
    lines.push({ name: c.name, ok, detail: error ? `error: ${error}` : `${rows} row(s)` });
  }
  return { ok: lines.every(l => l.ok), lines };
}
