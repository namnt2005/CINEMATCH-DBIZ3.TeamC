import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// One view body, rendered for both databases (BR-001, specs/005-m0-workspace/research.md R3)
// The newest migration that defines the view is the one databases run last (H1 re-created it on 05/11/2026)
const MIGRATION = (() => {
  const dir = path.join('supabase', 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
    .filter(f => /CREATE (OR REPLACE )?VIEW app\.project_readiness/.test(fs.readFileSync(path.join(dir, f), 'utf8')));
  return path.join(dir, files.at(-1) ?? '20261103000200_m0_readiness.sql');
})();
const render = async (dialect) => (await import('../../lib/readiness/render-view.js')).renderView(dialect);

function readMigration() {
  if (!fs.existsSync(MIGRATION)) throw new Error(`Missing migration ${MIGRATION}`);
  return fs.readFileSync(MIGRATION, 'utf8');
}
// SQL statements of the migration that mention `name`, comments removed
const statementsAbout = (sql, name) => sql.replace(/--[^\n]*/g, '').split(';').filter(s => s.includes(name));

describe('Readiness view template (T004, BR-001, RLS, research R3)', () => {
  test('BR-001: lib/db/readiness-view.sql exists and renders for sqlite and postgres with no placeholder left', async () => {
    assert.ok(fs.existsSync('lib/db/readiness-view.sql'), 'lib/db/readiness-view.sql missing');
    for (const dialect of ['sqlite', 'postgres']) {
      const sql = await render(dialect);
      assert.match(sql.trim(), /^SELECT\b/i, dialect);
      assert.doesNotMatch(sql, /\{\{|\}\}/, `${dialect}: placeholder left`);
    }
  });

  test('BR-001: the two renderings differ only in the list aggregate', async () => {
    const sqlite = (await render('sqlite')).split('\n');
    const postgres = (await render('postgres')).split('\n');
    assert.equal(sqlite.length, postgres.length);
    const differing = sqlite.map((line, i) => [line, postgres[i]]).filter(([a, b]) => a !== b);
    assert.ok(differing.length > 0, 'the list aggregate must differ');
    for (const [a, b] of differing) {
      assert.match(a, /group_concat/i, `sqlite line differs outside the aggregate: ${a}`);
      assert.match(b, /string_agg/i, `postgres line differs outside the aggregate: ${b}`);
    }
    assert.doesNotMatch(sqlite.join('\n'), /string_agg/i);
    assert.doesNotMatch(postgres.join('\n'), /group_concat/i);
  });

  test('BR-001: an unknown dialect is refused', async () => {
    const { renderView } = await import('../../lib/readiness/render-view.js');
    assert.throws(() => renderView('mysql'), /dialect/i);
  });

  test('BR-001: the migration defines app.project_readiness as exactly the PostgreSQL rendering', async () => {
    const sql = readMigration();
    assert.match(sql, /CREATE (OR REPLACE )?VIEW app\.project_readiness AS/);
    assert.ok(sql.includes((await render('postgres')).trim()), 'migration view differs from renderView("postgres")');
  });

  test('RLS: public.v_project_readiness returns only the projects the caller is a member of', () => {
    const sql = readMigration();
    assert.match(sql, /CREATE (OR REPLACE )?VIEW public\.v_project_readiness\b[\s\S]*?FROM app\.project_readiness[\s\S]*?WHERE app\.is_project_member\(project_id\)/);
  });

  test('RLS: v_project_readiness runs with its owner\'s rights (not security_invoker, which would show false 0 %)', () => {
    for (const s of statementsAbout(readMigration(), 'v_project_readiness')) {
      assert.doesNotMatch(s, /security_invoker\s*=\s*(true|on)/i);
    }
  });

  test('RLS: SELECT on v_project_readiness is granted to authenticated only, never to anon; app.project_readiness to no API role', () => {
    const sql = readMigration();
    assert.match(sql, /GRANT SELECT ON public\.v_project_readiness TO authenticated;/);
    assert.match(sql, /REVOKE ALL ON public\.v_project_readiness FROM [^;]*\banon\b/);
    for (const s of statementsAbout(sql, 'GRANT')) {
      if (s.includes('v_project_readiness')) assert.doesNotMatch(s, /\banon\b|\bPUBLIC\b/, s.trim());
      if (s.includes('app.project_readiness')) assert.doesNotMatch(s, /\banon\b|\bauthenticated\b|\bPUBLIC\b/, s.trim());
    }
  });
});
