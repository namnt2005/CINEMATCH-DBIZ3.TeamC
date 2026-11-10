import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Static checks of the app_update_project replacement in 20261108000100_m2_check.sql (T058, analysis I3; decision D10).
const FILE = path.join('supabase', 'migrations', '20261108000100_m2_check.sql');
const read = () => fs.readFileSync(FILE, 'utf8').replace(/--[^\n]*/g, '');

describe('app_update_project in the M2 migration (T058)', () => {
  test('same signature, SECURITY DEFINER, empty search_path; buffer_days only 0, 7, 14, 21', () => {
    const sql = read();
    const m = sql.match(/CREATE OR REPLACE FUNCTION public\.app_update_project\(p_project_id uuid, p_fields jsonb\)([\s\S]*?)AS \$\$([\s\S]*?)\$\$;/i);
    assert.ok(m, 'app_update_project(p_project_id uuid, p_fields jsonb)');
    assert.match(m[1], /SECURITY DEFINER/);
    assert.match(m[1], /SET search_path = ''/);
    assert.match(m[2], /buffer_days/);
    assert.match(m[2], /IN \(0, 7, 14, 21\)/);
    assert.match(m[2], /VALIDATION_ERROR/);
  });

  test('still owner or edit, never an archived project; grants as in the M0 migration', () => {
    const sql = read();
    const body = sql.match(/FUNCTION public\.app_update_project\(p_project_id uuid, p_fields jsonb\)[\s\S]*?AS \$\$([\s\S]*?)\$\$;/i)[1];
    assert.match(body, /NOT IN \('owner', 'edit'\)[\s\S]*FORBIDDEN/);
    assert.match(body, /ARCHIVED/);
    assert.match(body, /NAME_TAKEN/);
    assert.match(sql, /REVOKE ALL ON FUNCTION public\.app_update_project\(uuid, jsonb\) FROM PUBLIC, anon;/);
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.app_update_project\(uuid, jsonb\) TO authenticated;/);
  });
});
