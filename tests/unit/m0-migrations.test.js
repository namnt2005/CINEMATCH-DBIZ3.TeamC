import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Static checks of the two M0 migrations (BR-001, BR-005, FR-008, specs/005-m0-workspace research R6, R10)
const OWNER = '20261103000100_m0_owner.sql';
const READINESS = '20261103000200_m0_readiness.sql';
const FUNCTIONS = ['app_create_project', 'app_update_project', 'app_archive_project', 'app_invite_member', 'app_accept_invitation', 'app_snapshot_readiness'];
const WRITES_REFUSED_WHEN_ARCHIVED = ['app_update_project', 'app_archive_project', 'app_invite_member'];

function read(name) {
  const file = path.join('supabase', 'migrations', name);
  if (!fs.existsSync(file)) throw new Error(`Missing migration supabase/migrations/${name}`);
  return fs.readFileSync(file, 'utf8');
}
const withoutComments = (sql) => sql.replace(/--[^\n]*/g, '');

/** Header (up to AS $$) and body (between the dollar quotes) of public.<name>(...). */
function fn(sql, name) {
  const m = sql.match(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\(([\\s\\S]*?)AS (\\$\\w*\\$)([\\s\\S]*?)\\2`));
  assert.ok(m, `function public.${name} not found`);
  return { header: m[1], body: m[3] };
}
const grantsOf = (sql, name) => withoutComments(sql).split(';').filter(s => new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\(`).test(s));

describe('M0 migrations (T006, BR-001, BR-005, FR-008, research R6, R10)', () => {
  test('D2: 20261103000100_m0_owner.sql replaces ck_project_member_permission with owner, view, edit', () => {
    const sql = read(OWNER);
    assert.match(sql, /DROP CONSTRAINT (IF EXISTS )?ck_project_member_permission/);
    const check = sql.match(/ADD CONSTRAINT ck_project_member_permission CHECK \(permission IN \(([^)]*)\)\)/);
    assert.ok(check, 'new ck_project_member_permission not found');
    assert.deepEqual(check[1].split(',').map(v => v.trim().replace(/'/g, '')).sort(), ['edit', 'owner', 'view']);
  });

  for (const name of FUNCTIONS) {
    test(`research R6: ${name} is SECURITY DEFINER with an empty search_path`, () => {
      const { header } = fn(read(READINESS), name);
      assert.match(header, /SECURITY DEFINER/);
      assert.match(header, /SET search_path = ''/);
    });
  }

  test('research R6: the five member functions are executable by authenticated, never by anon or PUBLIC', () => {
    const sql = read(READINESS);
    for (const name of FUNCTIONS.filter(n => n !== 'app_snapshot_readiness')) {
      const grants = grantsOf(sql, name);
      assert.ok(grants.some(g => /\bTO authenticated\b/.test(g)), `${name}: no grant to authenticated`);
      for (const g of grants) assert.doesNotMatch(g, /\banon\b|\bPUBLIC\b/, `${name}: ${g.trim()}`);
      assert.match(sql, new RegExp(`REVOKE (ALL|EXECUTE) ON FUNCTION public\\.${name}\\([^)]*\\) FROM PUBLIC`), `${name}: PostgreSQL grants EXECUTE to PUBLIC by default`);
    }
  });

  test('FR-008: app_snapshot_readiness is executable by service_role only', () => {
    const sql = read(READINESS);
    const grants = grantsOf(sql, 'app_snapshot_readiness');
    assert.ok(grants.some(g => /\bTO service_role\b/.test(g)), 'no grant to service_role');
    for (const g of grants) assert.doesNotMatch(g, /\banon\b|\bauthenticated\b|\bPUBLIC\b/, g.trim());
    assert.match(sql, /REVOKE (ALL|EXECUTE) ON FUNCTION public\.app_snapshot_readiness\([^)]*\) FROM PUBLIC/);
  });

  test('FR-008, research R10: the nightly snapshot is scheduled at 00:05 Vietnam time only when pg_cron exists', () => {
    const sql = withoutComments(read(READINESS));
    const blocks = [...sql.matchAll(/DO (\$\w*\$)([\s\S]*?)\1/g)].map(m => m[2]);
    const guarded = blocks.find(b => b.includes('cron.schedule'));
    assert.ok(guarded, 'cron.schedule must sit inside a DO block');
    assert.match(guarded, /pg_cron/, 'the DO block checks that pg_cron is available');
    assert.match(guarded, /IF\b[\s\S]*pg_cron[\s\S]*THEN[\s\S]*cron\.schedule/);
    assert.match(guarded, /'5 17 \* \* \*'/);
    assert.match(guarded, /app_snapshot_readiness/);
    const outside = blocks.reduce((rest, b) => rest.replace(b, ''), sql);
    assert.doesNotMatch(outside, /cron\.schedule/, 'cron.schedule outside the guard');
  });

  test('BR-005: neither M0 migration deletes anything or grants DELETE', () => {
    for (const name of [OWNER, READINESS]) {
      assert.doesNotMatch(withoutComments(read(name)), /\bDELETE\b/i, name);
    }
  });

  for (const name of WRITES_REFUSED_WHEN_ARCHIVED) {
    test(`BR-005: ${name} refuses an archived project with ARCHIVED`, () => {
      const { body } = fn(read(READINESS), name);
      assert.match(body, /'archived'/);
      assert.match(body, /ARCHIVED/);
    });
  }

  test('BR-005: app_archive_project only sets stage = archived', () => {
    const { body } = fn(read(READINESS), 'app_archive_project');
    assert.match(body, /UPDATE public\.project\s+SET stage = 'archived'/);
  });

  test('FR-008, BR-005: app_snapshot_readiness skips archived projects and projects already recorded for the date', () => {
    const { body } = fn(read(READINESS), 'app_snapshot_readiness');
    assert.match(body, /INSERT INTO public\.readiness_snapshot/);
    assert.match(body, /FROM app\.project_readiness/);
    assert.match(body, /'archived'/);
    assert.match(body, /NOT EXISTS|ON CONFLICT/);
  });
});
