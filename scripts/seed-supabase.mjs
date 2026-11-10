#!/usr/bin/env node
// Load data/seed into the Supabase dev database (specs/003-sys-core research R7, contracts/scripts.contract.md).
// Usage: export SUPABASE_DB_URL='postgresql://…'   (in the terminal only — never in a file)
//        node scripts/seed-supabase.mjs [--reset] [--force]
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { parseCsv } from '../lib/db/client.js';
import { guardDatabaseUrl, userReferenceColumns, rekeySeed, buildSeedSql } from './lib/seed-plan.mjs';
import { maskSecrets, readDatabaseState, loadSeed } from './lib/seed-db.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = new Set(process.argv.slice(2));
const url = process.env.SUPABASE_DB_URL || '';

function fail(message) {
  console.error(`✗ ${maskSecrets(message, url)}`);
  process.exit(1);
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
// The URL stays in this process: no command-line argument, no file. Supabase signs its server certificate with
// its own root CA, so the connection is encrypted without verifying the chain (research R7).
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
client.on('error', (err) => fail(`connection lost: ${err.message}`));
try {
  await client.connect();
} catch (err) {
  fail(`cannot connect: ${err.message}`);
}
let state;
try {
  state = await readDatabaseState(client);
} catch (err) {
  await client.end().catch(() => {});
  fail(`cannot read the database: ${err.message}`);
}
const { authUsers, databaseHasData } = state;

const seedDir = path.join(ROOT, 'data/seed');
const tables = fs.readdirSync(seedDir).filter(f => /^\d{2}_.*\.csv$/.test(f)).sort().map(f => {
  const [header, ...rows] = parseCsv(fs.readFileSync(path.join(seedDir, f), 'utf8'));
  return { table: f.replace(/^\d+_/, '').replace(/\.csv$/, ''), columns: header.map(h => h.trim()), rows };
});
// M2 plan D14: sample files after the main seed (data/seed/samples/<table>_samples.csv), loaded into the same table
const sampleDir = path.join(seedDir, 'samples');
if (fs.existsSync(sampleDir)) {
  for (const f of fs.readdirSync(sampleDir).filter(n => /^[a-z_]+_samples\.csv$/.test(n)).sort()) {
    const [header, ...rows] = parseCsv(fs.readFileSync(path.join(sampleDir, f), 'utf8'));
    tables.push({ table: f.replace(/_samples\.csv$/, ''), columns: header.map(h => h.trim()), rows });
  }
}
const schemaSql = fs.readdirSync(path.join(ROOT, 'data/schema')).filter(f => /^schema-.*\.sql$/.test(f)).sort()
  .map(f => fs.readFileSync(path.join(ROOT, 'data/schema', f), 'utf8')).join('\n');

const { tables: seed, rekeyed } = rekeySeed(tables, authUsers, userReferenceColumns(schemaSql));
let sql;
try {
  sql = buildSeedSql({ tables: seed, reset: args.has('--reset'), databaseHasData });
  await loadSeed(client, sql, url);
} catch (err) {
  await client.end().catch(() => {});
  fail(err.message);
}
await client.end();

for (const t of seed) console.log(`  ${t.table.padEnd(28)} ${t.rows.length}`);
for (const r of rekeyed) console.log(`  re-keyed ${r.email} → Auth account, role ${r.role}`);
console.log(`✓ seed loaded in ${((Date.now() - started) / 1000).toFixed(1)} s`);
