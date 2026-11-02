import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { schemaSql } from './migration-helpers.js';

const loadPlan = () => import('../../scripts/lib/seed-plan.mjs');
const loadDb = () => import('../../scripts/lib/seed-db.mjs');

const LINKED = { projectRef: 'rhvgazgeqstqzarseqmi', projectName: 'cinematch-dev' };
const POOLER = 'postgresql://postgres.rhvgazgeqstqzarseqmi:s3cret-pass@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';
const DIRECT = 'postgresql://postgres:s3cret-pass@db.rhvgazgeqstqzarseqmi.supabase.co:5432/postgres';
const OTHER = 'postgresql://postgres.zzzzzzzzzzzzzzzzzzzz:s3cret-pass@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

const SEED_STAFF = '515529a9-46d9-559c-aab4-e5fb31eedeea';
const AUTH_STAFF = '99999999-9999-4999-8999-999999999999';

function tinySeed() {
  return [
    { table: 'user_account', columns: ['user_id', 'email', 'email_verified', 'role', 'account_status', 'created_at'],
      rows: [[SEED_STAFF, 'thuha.nguyen@vfda-demo.example.vn', 'true', 'vfda_staff', 'active', '2026-01-01T00:00:00+07:00']] },
    { table: 'location', columns: ['location_id', 'slug', 'name_en', 'published'], rows: [['L1', 'trang-an', "Tràng An's caves", 'true']] },
    { table: 'authority_contact', columns: ['location_id', 'contact_name', 'verified_by', 'contact_email'],
      rows: [['L1', 'Bùi Văn Thành', SEED_STAFF, '']] },
    { table: 'audit_log', columns: ['audit_log_id', 'action', 'admin_id', 'target_id'], rows: [['A1', 'location.publish', SEED_STAFF, 'L1']] }
  ];
}

describe('Seed loader plan (T017, research R7, D3, Constitution IV)', () => {
  test('R7: the guard accepts cinematch-dev in pooler and direct URL forms', async () => {
    const { guardDatabaseUrl } = await loadPlan();
    for (const url of [POOLER, DIRECT]) {
      const result = guardDatabaseUrl(url, LINKED);
      assert.equal(result.ok, true, url.slice(0, 30));
      assert.equal(result.ref, 'rhvgazgeqstqzarseqmi');
    }
  });

  test('R7: any other project is refused unless --force', async () => {
    const { guardDatabaseUrl } = await loadPlan();
    assert.equal(guardDatabaseUrl(OTHER, LINKED).ok, false);
    assert.equal(guardDatabaseUrl(OTHER, { ...LINKED, force: true }).ok, true);
    assert.equal(guardDatabaseUrl(POOLER, { ...LINKED, projectName: 'cinematch-prod' }).ok, false, 'the linked project must be cinematch-dev');
    assert.equal(guardDatabaseUrl('', LINKED).ok, false);
  });

  test('Constitution IV: the password never appears in any message', async () => {
    const { guardDatabaseUrl, maskUrl } = await loadPlan();
    assert.equal(maskUrl(POOLER), 'postgresql://***@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres');
    for (const url of [POOLER, OTHER]) {
      assert.ok(!JSON.stringify(guardDatabaseUrl(url, LINKED)).includes('s3cret-pass'));
    }
  });

  test('D3: the 20 user-id columns (user_account.user_id and its 19 foreign keys) are found in data/schema', async () => {
    const { userReferenceColumns } = await loadPlan();
    const columns = userReferenceColumns(schemaSql());
    assert.equal(columns.length, 20);
    assert.ok(columns.some(c => c.table === 'audit_log' && c.column === 'admin_id'));
    assert.ok(columns.some(c => c.table === 'authority_contact' && c.column === 'verified_by'));
    assert.ok(columns.some(c => c.table === 'profile' && c.column === 'user_id'));
  });

  test('D3: a seed account whose email exists in Auth takes the Auth id everywhere and keeps its seed role', async () => {
    const { userReferenceColumns, rekeySeed } = await loadPlan();
    const { tables, rekeyed } = rekeySeed(tinySeed(), [{ id: AUTH_STAFF, email: 'thuha.nguyen@vfda-demo.example.vn' }], userReferenceColumns(schemaSql()));

    const byName = Object.fromEntries(tables.map(t => [t.table, t]));
    assert.equal(byName.user_account.rows[0][0], AUTH_STAFF);
    assert.equal(byName.user_account.rows[0][3], 'vfda_staff');
    assert.equal(byName.authority_contact.rows[0][2], AUTH_STAFF);
    assert.equal(byName.audit_log.rows[0][2], AUTH_STAFF);
    assert.deepEqual(rekeyed, [{ email: 'thuha.nguyen@vfda-demo.example.vn', from: SEED_STAFF, to: AUTH_STAFF, role: 'vfda_staff' }]);
  });

  test('R7: the SQL is one transaction, quotes text, turns empty cells into NULL and lifts the publish trigger only during the load', async () => {
    const { buildSeedSql } = await loadPlan();
    const sql = buildSeedSql({ tables: tinySeed(), reset: false, databaseHasData: false });

    assert.match(sql.trim(), /^BEGIN;[\s\S]*COMMIT;$/);
    assert.ok(sql.includes("'Tràng An''s caves'"));
    assert.match(sql, /INSERT INTO public\.authority_contact[\s\S]*NULL\)/);
    const disable = sql.indexOf('ALTER TABLE public.location DISABLE TRIGGER trg_location_publish_needs_contact');
    const firstLocation = sql.indexOf('INSERT INTO public.location ');
    const enable = sql.indexOf('ALTER TABLE public.location ENABLE TRIGGER trg_location_publish_needs_contact');
    assert.ok(disable > -1 && disable < firstLocation && firstLocation < enable && enable < sql.indexOf('COMMIT;'));
  });

  test('R7: a database with data is refused without --reset; --reset truncates the application tables but never auth.*', async () => {
    const { buildSeedSql } = await loadPlan();
    assert.throws(() => buildSeedSql({ tables: tinySeed(), reset: false, databaseHasData: true }), /--reset/);
    const sql = buildSeedSql({ tables: tinySeed(), reset: true, databaseHasData: true });
    assert.match(sql, /TRUNCATE [\s\S]*public\.user_account[\s\S]*;/);
    assert.doesNotMatch(sql, /\bauth\./);
  });

  test('R7: the seed SQL runs as ONE parameterless client.query (simple query protocol, several statements)', async () => {
    const { loadSeed } = await loadDb();
    const calls = [];
    const client = { query: async (...args) => { calls.push(args); return {}; } };
    await loadSeed(client, 'BEGIN;\nSELECT 1;\nCOMMIT;', POOLER);
    assert.deepEqual(calls, [['BEGIN;\nSELECT 1;\nCOMMIT;']]);
  });

  test('R7 / Constitution IV: a failed load is rolled back and the error never shows the password', async () => {
    const { loadSeed } = await loadDb();
    const calls = [];
    const client = { query: async (sql) => {
      calls.push(sql);
      if (sql !== 'ROLLBACK') throw new Error(`insert failed on ${POOLER} with s3cret-pass`);
      return {};
    } };
    await assert.rejects(loadSeed(client, 'BEGIN;\nCOMMIT;', POOLER), (err) => {
      assert.ok(!err.message.includes('s3cret-pass'), err.message);
      assert.match(err.message, /insert failed/);
      return true;
    });
    assert.deepEqual(calls, ['BEGIN;\nCOMMIT;', 'ROLLBACK']);
  });

  test('R7: the database state is read with the same client (Auth accounts, existing data)', async () => {
    const { readDatabaseState } = await loadDb();
    const client = { query: async (sql) => (/auth\.users/.test(sql)
      ? { rows: [{ id: AUTH_STAFF, email: 'thuha.nguyen@vfda-demo.example.vn' }] }
      : { rows: [{ locations: '0', accounts: '1' }] }) };
    const state = await readDatabaseState(client);
    assert.deepEqual(state.authUsers, [{ id: AUTH_STAFF, email: 'thuha.nguyen@vfda-demo.example.vn' }]);
    assert.equal(state.databaseHasData, true);
  });

  test('Constitution IV: the loader uses pg with SUPABASE_DB_URL, never the CLI, never argv, never a log of the URL', () => {
    const src = fs.readFileSync('scripts/seed-supabase.mjs', 'utf8');
    assert.match(src, /from 'pg'/);
    assert.match(src, /process\.env\.SUPABASE_DB_URL/);
    assert.doesNotMatch(src, /child_process|spawn|npx|db query/);
    for (const line of src.split('\n').filter(l => /console\.\w+\(/.test(l) && /\burl\b/.test(l))) {
      assert.match(line, /maskSecrets\([^)]*\burl\b/, `unmasked log: ${line.trim()}`);
    }
  });
});
