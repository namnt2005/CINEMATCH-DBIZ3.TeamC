import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Static checks of the pre-check and content-check functions in 20261108000100_m2_check.sql (T034, analysis I3;
// BR-001, BR-004, BR-007, FR-012, FR-014, D11, research R7).
const FILE = path.join('supabase', 'migrations', '20261108000100_m2_check.sql');
const read = () => fs.readFileSync(FILE, 'utf8').replace(/--[^\n]*/g, '');
function fn(sql, name) {
  const m = sql.match(new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}\\(([\\s\\S]*?)AS (\\$\\w*\\$)([\\s\\S]*?)\\2`));
  assert.ok(m, `function public.${name} not found`);
  return { header: m[1], body: m[3] };
}

describe('Pre-check functions in the M2 migration (T034)', () => {
  test('all three are SECURITY DEFINER with an empty search_path', () => {
    const sql = read();
    for (const name of ['app_record_precheck', 'app_save_content_check', 'app_review_finding']) {
      const { header } = fn(sql, name);
      assert.match(header, /SECURITY DEFINER/, name);
      assert.match(header, /SET search_path = ''/, name);
    }
  });

  test('app_record_precheck is for the System actor only (service_role), never for users', () => {
    const sql = read();
    assert.match(sql, /REVOKE ALL ON FUNCTION public\.app_record_precheck\([^)]*\) FROM PUBLIC, anon, authenticated;/);
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.app_record_precheck\([^)]*\) TO service_role;/);
    assert.doesNotMatch(sql, /GRANT EXECUTE ON FUNCTION public\.app_record_precheck\([^)]*\) TO authenticated/);
  });

  test('BR-004: app_record_precheck recomputes the level with the Q4 thresholds; BR-001: refuses a revision not in force; D11: stores the dropped count and codes', () => {
    const { body } = fn(read(), 'app_record_precheck');
    assert.match(body, />= 2[\s\S]*'high'/);
    assert.match(body, /= 1[\s\S]*>= 3[\s\S]*'medium'/);
    assert.match(body, /status = 'approved'|rule_version <=/);
    assert.match(body, /VALIDATION_ERROR/);
    assert.match(body, /dropped_count/);
    assert.match(body, /dropped_rule_codes/);
  });

  test('R7: app_save_content_check checks the current version, owner/edit, archived, and that every quote is in the text it does not store', () => {
    const { header, body } = fn(read(), 'app_save_content_check');
    assert.match(header, /p_text text/i);
    assert.match(body, /RULE_SET_CHANGED/);
    assert.match(body, /ARCHIVED/);
    assert.match(body, /FORBIDDEN/);
    assert.match(body, /strpos\(p_text|position\(/);
    assert.doesNotMatch(body, /INSERT INTO public\.\w+ \([^)]*\bp_text\b/);
  });

  test('FR-014: app_review_finding needs owner or edit and sets reviewed with the note', () => {
    const { body } = fn(read(), 'app_review_finding');
    assert.match(body, /FORBIDDEN/);
    assert.match(body, /finding_status = 'reviewed'/);
    assert.match(body, /reviewer_note/);
  });

  test('app_save_content_check and app_review_finding are granted to authenticated, not anon', () => {
    const sql = read();
    for (const name of ['app_save_content_check', 'app_review_finding']) {
      assert.match(sql, new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\([^)]*\\) FROM PUBLIC, anon;`), name);
      assert.match(sql, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\([^)]*\\) TO authenticated;`), name);
    }
  });
});
