// Helpers for the static migration tests (not a test file). Read-only; no database needed (decision D1).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
export const MIGRATIONS = path.join(ROOT, 'supabase', 'migrations');

export const FILES = {
  schema: '20261101000100_schema.sql',
  authLink: '20261101000200_auth_link.sql',
  grantsRls: '20261101000300_grants_rls.sql',
  rules: '20261101000400_rules.sql',
  search: '20261101000500_search_indexes.sql'
};

/** Text of one migration; fails the calling test with a clear message when it does not exist yet. */
export function migration(name) {
  const file = path.join(MIGRATIONS, FILES[name]);
  if (!fs.existsSync(file)) throw new Error(`Missing migration supabase/migrations/${FILES[name]}`);
  return fs.readFileSync(file, 'utf8');
}

export function allMigrations() {
  return Object.keys(FILES).map(migration).join('\n');
}

/** CREATE TABLE blocks of data/schema/schema-*.sql (or of any SQL text). */
export function parseTables(sql) {
  const tables = {};
  for (const [, name, body] of sql.matchAll(/CREATE TABLE (?:public\.)?(\w+) \(\n([\s\S]*?)\n\);/g)) {
    const lines = body.split('\n').map(l => l.trim().replace(/,$/, '')).filter(Boolean);
    tables[name] = {
      columns: lines.filter(l => !l.startsWith('CONSTRAINT')),
      constraints: lines.filter(l => l.startsWith('CONSTRAINT') && !l.includes('FOREIGN KEY')),
      foreignKeys: lines.filter(l => l.startsWith('CONSTRAINT') && l.includes('FOREIGN KEY'))
    };
  }
  return tables;
}

export function schemaSql() {
  const dir = path.join(ROOT, 'data', 'schema');
  return fs.readdirSync(dir).filter(f => /^schema-.*\.sql$/.test(f)).sort()
    .map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
}

export function schemaTables() {
  return parseTables(schemaSql());
}
