import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Static checks of supabase/migrations/20261108000100_m2_check.sql — Phase 2 part (T004, analysis I3): columns and keys of
// D2–D4, D11, D15, D17 for the pushed database, the read policies of data-model §7, revoked direct writes, the version
// helper. The function bodies have their own tests (T017, T034, T048, T058).
const FILE = path.join('supabase', 'migrations', '20261108000100_m2_check.sql');
const M2_TABLES = ['rule_set_version', 'legal_rule', 'precheck_run', 'precheck_finding', 'compliance_run', 'compliance_finding'];
function read() {
  if (!fs.existsSync(FILE)) throw new Error(`Missing migration ${FILE}`);
  return fs.readFileSync(FILE, 'utf8').replace(/--[^\n]*/g, '');
}

describe('Migration 20261108000100_m2_check.sql — Phase 2 (T004)', () => {
  test('D2, D4, D15, D17: legal_rule gets revision, retired_version, keywords, segments and is_sample if missing', () => {
    const sql = read();
    for (const col of ['revision', 'retired_version', 'keywords_vi', 'keywords_en', 'segments', 'is_sample']) {
      assert.match(sql, new RegExp(`ALTER TABLE public\\.legal_rule[\\s\\S]*?ADD COLUMN IF NOT EXISTS ${col}\\b`), col);
    }
  });

  test('D2: the unique and foreign keys on rule_code are dropped before the new keys; findings point at rule_id', () => {
    const sql = read();
    const dropFk = sql.search(/DROP CONSTRAINT IF EXISTS fk_precheck_finding_rule_code/);
    const dropUq = sql.search(/DROP CONSTRAINT IF EXISTS uq_legal_rule_rule_code\b/);
    assert.ok(dropFk >= 0 && dropUq > dropFk, 'foreign keys on rule_code go first, then the unique key');
    assert.match(sql, /DROP CONSTRAINT IF EXISTS fk_compliance_finding_rule_code/);
    assert.match(sql, /uq_legal_rule_rule_code_revision UNIQUE \(rule_code, revision\)/);
    assert.match(sql, /uq_legal_rule_rule_slug_revision UNIQUE \(rule_slug, revision\)/);
    assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS uq_legal_rule_one_approved ON public\.legal_rule \(rule_code\) WHERE status = 'approved'/);
    for (const t of ['precheck_finding', 'compliance_finding']) {
      assert.match(sql, new RegExp(`ALTER TABLE public\\.${t}[\\s\\S]*?ADD COLUMN IF NOT EXISTS rule_id uuid`, 'i'), t);
      assert.match(sql, new RegExp(`fk_${t}_rule_id FOREIGN KEY \\(rule_id\\) REFERENCES public\\.legal_rule \\(rule_id\\)`), t);
    }
  });

  test('Q6 (D3): the text columns of precheck_finding are dropped; D11: the dropped-findings columns are added with their check', () => {
    const sql = read();
    for (const col of ['quoted_text', 'explanation_vi', 'explanation_en', 'rule_code']) {
      assert.match(sql, new RegExp(`ALTER TABLE public\\.precheck_finding[\\s\\S]*?DROP COLUMN IF EXISTS ${col}\\b`), col);
    }
    for (const col of ['dropped_count', 'dropped_rule_codes']) {
      assert.match(sql, new RegExp(`ALTER TABLE public\\.precheck_run[\\s\\S]*?ADD COLUMN IF NOT EXISTS ${col}\\b`), col);
    }
    assert.match(sql, /ck_precheck_run_dropped_count CHECK \(dropped_count >= 0\)/);
  });

  test('data-model §7: the read policies are (re)created and anon gets no new grant', () => {
    const sql = read();
    for (const name of ['rls_rule_set_version_select_signed_in', 'rls_precheck_run_select_member', 'rls_compliance_run_select_member']) {
      assert.match(sql, new RegExp(`DROP POLICY IF EXISTS ${name}`), name);
      assert.match(sql, new RegExp(`CREATE POLICY ${name}`), name);
    }
    assert.doesNotMatch(sql, /GRANT [^;]* TO anon\b/);
  });

  test('R6, BR-008: direct writes revoked on the six M2 tables; no DELETE grant or statement on them', () => {
    const sql = read();
    for (const t of M2_TABLES) assert.match(sql, new RegExp(`REVOKE INSERT, UPDATE, DELETE ON public\\.${t} FROM anon, authenticated`), t);
    assert.doesNotMatch(sql, /DELETE FROM public\.(legal_rule|rule_set_version|precheck_run|precheck_finding|compliance_run|compliance_finding)\b/);
    assert.doesNotMatch(sql, /GRANT[^;]*\bDELETE\b/);
  });

  test('D6: app.next_rule_version() is SECURITY DEFINER with an empty search_path', () => {
    const sql = read();
    const m = sql.match(/CREATE OR REPLACE FUNCTION app\.next_rule_version\(\)([\s\S]*?)AS \$\$/);
    assert.ok(m, 'app.next_rule_version');
    assert.match(m[1], /SECURITY DEFINER/);
    assert.match(m[1], /SET search_path = ''/);
  });
});
