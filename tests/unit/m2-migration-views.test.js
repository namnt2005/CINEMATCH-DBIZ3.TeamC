import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Static checks of the views re-created by 20261108000100_m2_check.sql (T048, analysis I3; FR-010, BR-005).
const FILE = path.join('supabase', 'migrations', '20261108000100_m2_check.sql');
const read = () => fs.readFileSync(FILE, 'utf8');

describe('Views in the M2 migration (T048)', () => {
  test('public.v_dossier_check is exactly the PostgreSQL rendering of lib/db/dossier-view.sql, readable by no API role', async () => {
    const { renderDossierView } = await import('../../lib/dossier/render-view.js');
    const sql = read();
    assert.match(sql, /CREATE (OR REPLACE )?VIEW public\.v_dossier_check AS/);
    assert.ok(sql.includes(renderDossierView('postgres').trim()), 'migration view differs from renderDossierView("postgres")');
    assert.match(sql, /REVOKE ALL ON public\.v_dossier_check FROM PUBLIC, anon, authenticated;/);
    assert.doesNotMatch(sql, /GRANT [^;]*ON public\.v_dossier_check/);
  });

  test('FR-010: app.project_readiness is re-created after v_dossier_check, from the current template, with the member view and its grant', async () => {
    const { renderView } = await import('../../lib/readiness/render-view.js');
    const sql = read();
    const dossierAt = sql.search(/CREATE (OR REPLACE )?VIEW public\.v_dossier_check/);
    const readinessAt = sql.search(/CREATE (OR REPLACE )?VIEW app\.project_readiness AS/);
    assert.ok(dossierAt >= 0 && readinessAt > dossierAt);
    assert.ok(sql.includes(renderView('postgres').trim()));
    assert.match(sql, /DROP VIEW IF EXISTS public\.v_project_readiness;[\s\S]*DROP VIEW IF EXISTS app\.project_readiness;/);
    assert.match(sql, /CREATE VIEW public\.v_project_readiness AS\s+SELECT \* FROM app\.project_readiness WHERE app\.is_project_member\(project_id\);/);
    assert.match(sql, /GRANT SELECT ON public\.v_project_readiness TO authenticated;/);
  });
});
