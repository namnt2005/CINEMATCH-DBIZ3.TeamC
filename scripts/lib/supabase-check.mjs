// Logic of `npm run check:supabase` (specs/003-sys-core research R8). Never prints a key.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from '../../lib/db/client.js';

/** Refuses missing, identical or swapped keys without echoing them. */
export function validateKeys({ publishableKey, secretKey }) {
  if (!publishableKey || !secretKey) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY in .env (see .env.example).');
  }
  if (publishableKey === secretKey) throw new Error('The publishable and secret keys are the same key: one of them is wrong (swapped?).');
  if (secretKey.startsWith('sb_publishable_')) throw new Error('SUPABASE_SECRET_KEY holds a publishable key: use the secret key (swapped?).');
  if (publishableKey.startsWith('sb_secret_')) throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY holds a secret key: never expose it (swapped?).');
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Published locations in data/seed/NN_location.csv: what anon must see on the public location table. */
export function seedPublishedLocations(root = ROOT) {
  // The NN prefix is the load order and moves when a table is added (M0 readiness_source, 05/11/2026)
  const file = fs.readdirSync(path.join(root, 'data/seed')).find(f => /^\d{2}_location\.csv$/.test(f));
  const [header, ...rows] = parseCsv(fs.readFileSync(path.join(root, 'data/seed', file), 'utf8'));
  const col = (name) => header.findIndex(h => h.trim() === name);
  const status = col('intake_status');
  const published = col('published');
  return rows.filter(r => r[status] === 'published' && /^(true|1)$/i.test(r[published] ?? '')).length;
}

const isGrantDenial = (error) => error?.code === '42501' || /permission denied/i.test(error?.message || '');

/** Exact number of rows the client may see (count: 'exact' reads Content-Range, not a page of rows). */
async function count(client, table, filter) {
  let q = client.from(table).select('*', { count: 'exact' }).limit(1);
  if (filter) q = q.eq(...filter);
  const { count: total, error } = await q;
  return { total: error ? null : total ?? 0, error };
}

// anon has SELECT only on province, location, location_image, legal_rule, organisation (T013, data-model §4)
const PROTECTED = [
  ['authority_contact', 'BR-001'],
  ['profile', 'BR-001'],
  ['consent', 'BR-003'],
  ['audit_log', 'M10 BR-005']
];

function protectedLine(table, rule, { total, error }) {
  const name = `anon cannot read ${table} (${rule})`;
  if (error) {
    if (isGrantDenial(error)) return { name, ok: true, detail: 'blocked by GRANT (42501 permission denied)' };
    return { name, ok: false, detail: `unexpected error: ${error.message || error.code}` };
  }
  if (total === 0) return { name, ok: true, detail: '0 rows by RLS' };
  return { name, ok: false, detail: `${total} row(s) readable by anon` };
}

function rowsLine(name, { total, error }, expected) {
  if (error) return { name, ok: false, detail: `error: ${error.message || error.code}` };
  if (expected === undefined) return { name, ok: total > 0, detail: `${total} rows` };
  return { name, ok: total === expected, detail: `${total} rows; the seed has ${expected} published` };
}

/**
 * @param {{ anonClient, secretClient, expected?: { publishedLocations?: number } }} args
 *        expected.publishedLocations: published locations of the seed (seedPublishedLocations()).
 */
export async function runSupabaseChecks({ anonClient, secretClient, expected = {} }) {
  const lines = [];
  for (const [table, rule] of PROTECTED) lines.push(protectedLine(table, rule, await count(anonClient, table)));
  lines.push(rowsLine('anon reads province', await count(anonClient, 'province')));
  // No filter: Row Level Security alone must reduce the table to the published locations (BR-008)
  lines.push(rowsLine('anon reads public locations (BR-008)', await count(anonClient, 'location'), expected.publishedLocations));
  lines.push(rowsLine('secret key reads authority_contact (the table has rows, so the anon result above is access control, not an empty table)',
    await count(secretClient, 'authority_contact')));
  return { ok: lines.every(l => l.ok), lines };
}
