import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Static checks of the rule functions in 20261108000100_m2_check.sql (T017, analysis I3; BR-002, BR-008, FR-003, FR-004, Q13, D9).
const FILE = path.join('supabase', 'migrations', '20261108000100_m2_check.sql');
const read = () => fs.readFileSync(FILE, 'utf8').replace(/--[^\n]*/g, '');
const NAMES = ['app_save_rule_draft', 'app_revise_rule', 'app_sign_rule', 'app_retire_rule'];
function fn(sql, name) {
  const m = sql.match(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\(([\\s\\S]*?)AS (\\$\\w*\\$)([\\s\\S]*?)\\2`));
  assert.ok(m, `function public.${name} not found`);
  return { header: m[1], body: m[3] };
}

describe('Rule functions in the M2 migration (T017)', () => {
  test('SECURITY DEFINER, empty search_path, granted to authenticated only', () => {
    const sql = read();
    for (const name of NAMES) {
      const { header } = fn(sql, name);
      assert.match(header, /SECURITY DEFINER/, name);
      assert.match(header, /SET search_path = ''/, name);
      assert.match(sql, new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\([^)]*\\) FROM PUBLIC, anon;`), name);
      assert.match(sql, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\([^)]*\\) TO authenticated;`), name);
    }
  });

  test('D9: every rule function checks the role is exactly vfda_legal (not the admin hierarchy of app.has_role)', () => {
    const sql = read();
    for (const name of NAMES) {
      const { body } = fn(sql, name);
      assert.match(body, /app\.current_role\(\) <> 'vfda_legal'|app\.current_role\(\) = 'vfda_legal'/, name);
      assert.doesNotMatch(body, /app\.has_role\('vfda_legal'\)/, name);
    }
  });

  test('BR-002: signing does not pre-check the citation — the CHECK refuses; sign and retire make a version with app.next_rule_version()', () => {
    const sql = read();
    const sign = fn(sql, 'app_sign_rule').body;
    assert.doesNotMatch(sign, /citation IS NULL[\s\S]{0,80}RAISE/);
    for (const name of ['app_sign_rule', 'app_retire_rule']) {
      const { body } = fn(sql, name);
      assert.match(body, /app\.next_rule_version\(\)/, name);
      assert.match(body, /INSERT INTO public\.rule_set_version/, name);
    }
    assert.match(sign, /retired_version/);
  });

  test('one audit_log row per function; no DELETE (BR-008)', () => {
    const sql = read();
    const actions = { app_save_rule_draft: 'rule.save', app_revise_rule: 'rule.revise', app_sign_rule: 'rule.sign', app_retire_rule: 'rule.retire' };
    for (const [name, action] of Object.entries(actions)) {
      const { body } = fn(sql, name);
      assert.match(body, new RegExp(`INSERT INTO public\\.audit_log[\\s\\S]*'${action.replace('.', '\\.')}'`), name);
      assert.doesNotMatch(body, /\bDELETE\b/, name);
    }
  });
});
