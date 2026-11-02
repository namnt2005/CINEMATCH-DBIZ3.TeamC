#!/usr/bin/env node
// Load data/seed into the Supabase dev database (specs/003-sys-core research R7, contracts/scripts.contract.md).
// Usage: export SUPABASE_DB_URL='postgresql://…'   (in the terminal only — never in a file)
//        node scripts/seed-supabase.mjs [--reset] [--force]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseCsv } from '../lib/db/client.js';
import { guardDatabaseUrl, maskUrl, userReferenceColumns, rekeySeed, buildSeedSql } from './lib/seed-plan.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = new Set(process.argv.slice(2));
const url = process.env.SUPABASE_DB_URL || '';

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

/** Runs SQL through the Supabase CLI; the URL goes as an argument array, never through a shell or a file. */
function runSql({ sql, file }) {
  const cli = ['--yes', 'supabase', 'db', 'query', '--db-url', url, '--output-format', 'json'];
  const res = spawnSync('npx', file ? [...cli, '--file', file] : [...cli, sql], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const text = `${res.stdout || ''}${res.stderr || ''}`.split(url).join(maskUrl(url));
  if (res.status !== 0) fail(`Supabase CLI failed:\n${text.trim()}`);
  const start = res.stdout.search(/[[{]/);
  if (start < 0) return [];
  const parsed = JSON.parse(res.stdout.slice(start));
  return Array.isArray(parsed) ? parsed : parsed.rows || parsed.data || parsed.result || [];
}

const linked = {
  projectRef: fs.existsSync(path.join(ROOT, 'supabase/.temp/project-ref'))
    ? fs.readFileSync(path.join(ROOT, 'supabase/.temp/project-ref'), 'utf8').trim() : null,
  projectName: fs.existsSync(path.join(ROOT, 'supabase/.temp/linked-project.json'))
    ? JSON.parse(fs.readFileSync(path.join(ROOT, 'supabase/.temp/linked-project.json'), 'utf8')).name : null
};
const guard = guardDatabaseUrl(url, { ...linked, force: args.has('--force') });
if (!guard.ok) fail(guard.reason);
console.log(`→ ${guard.masked} (${guard.reason})`);

const started = Date.now();
const authUsers = runSql({ sql: 'select id::text as id, email from auth.users' });
const [counts] = runSql({ sql: 'select (select count(*) from public.location) as locations, (select count(*) from public.user_account) as accounts' });
// Any account row counts: accounts made with "Add user" get re-keyed seed rows with the same id, so --reset is needed
const databaseHasData = Number(counts?.locations || 0) > 0 || Number(counts?.accounts || 0) > 0;

const seedDir = path.join(ROOT, 'data/seed');
const tables = fs.readdirSync(seedDir).filter(f => /^\d{2}_.*\.csv$/.test(f)).sort().map(f => {
  const [header, ...rows] = parseCsv(fs.readFileSync(path.join(seedDir, f), 'utf8'));
  return { table: f.replace(/^\d+_/, '').replace(/\.csv$/, ''), columns: header.map(h => h.trim()), rows };
});
const schemaSql = fs.readdirSync(path.join(ROOT, 'data/schema')).filter(f => /^schema-.*\.sql$/.test(f)).sort()
  .map(f => fs.readFileSync(path.join(ROOT, 'data/schema', f), 'utf8')).join('\n');

const { tables: seed, rekeyed } = rekeySeed(tables, authUsers, userReferenceColumns(schemaSql));
let sql;
try {
  sql = buildSeedSql({ tables: seed, reset: args.has('--reset'), databaseHasData });
} catch (err) {
  fail(err.message);
}

const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cinematch-seed-')), 'seed.sql');
fs.writeFileSync(file, sql);
try {
  runSql({ file });
} finally {
  fs.rmSync(path.dirname(file), { recursive: true, force: true });
}

for (const t of seed) console.log(`  ${t.table.padEnd(28)} ${t.rows.length}`);
for (const r of rekeyed) console.log(`  re-keyed ${r.email} → Auth account, role ${r.role}`);
console.log(`✓ seed loaded in ${((Date.now() - started) / 1000).toFixed(1)} s`);
