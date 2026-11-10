import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseCsv } from '../../lib/db/client.js';

// The M2 seed and schema after D2–D4 and D11 (T003): rule revisions, keywords, findings that cite a revision, and
// pre-check rows that hold no text of the summary (Clarifications Q6). Seed files are found by table name.
function seed(table) {
  const file = fs.readdirSync('data/seed').find(f => new RegExp(`^\\d+_${table}\\.csv$`).test(f));
  assert.ok(file, `seed file of ${table}`);
  const [head, ...rows] = parseCsv(fs.readFileSync(path.join('data/seed', file), 'utf8'));
  return { head, rows: rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]]))) };
}
const schema = fs.readFileSync('data/schema/schema-M2.sql', 'utf8');
function columns(table) {
  const body = schema.match(new RegExp(`CREATE TABLE ${table} \\(([\\s\\S]*?)\\n\\);`))[1];
  return body.split('\n').map(l => l.trim()).filter(l => /^[a-z_]+ [A-Z]/.test(l)).map(l => l.split(' ')[0]);
}
const TEXT_COLUMNS = ['synopsis_text', 'summary_text', 'synopsis', 'text', 'quoted_text', 'explanation_vi', 'explanation_en'];
const json = (v) => (v ? JSON.parse(v) : null);

describe('M2 seed and schema (T003)', () => {
  test('Q6: precheck_run keeps the hash and no text column; precheck_finding keeps only the rule revision and the span', () => {
    const run = columns('precheck_run');
    assert.ok(run.includes('synopsis_hash'));
    for (const c of TEXT_COLUMNS) assert.equal(run.includes(c), false, `precheck_run.${c}`);
    assert.deepEqual(columns('precheck_finding'), ['brief_id', 'rule_id', 'span_start', 'span_end']);
  });

  test('Q6: no pre-check row in the seed holds a sentence (no cell with four or more words)', () => {
    for (const table of ['precheck_run', 'precheck_finding']) {
      for (const row of seed(table).rows) {
        for (const [col, v] of Object.entries(row)) assert.ok(String(v).trim().split(/\s+/).length < 4, `${table}.${col}: ${v}`);
      }
    }
  });

  test('D2: one row per revision — revision ≥ 1, keys (rule_code, revision) and (rule_slug, revision), no unique rule_code', () => {
    assert.ok(columns('legal_rule').includes('revision'));
    assert.match(schema, /UNIQUE \(rule_code, revision\)/);
    assert.match(schema, /UNIQUE \(rule_slug, revision\)/);
    assert.doesNotMatch(schema, /UNIQUE \(rule_code\)/);
    for (const r of seed('legal_rule').rows) assert.ok(Number(r.revision) >= 1, r.rule_code);
  });

  test('Q13 / BR-008: at most one approved revision per code; a draft revision 2 of an approved rule; retired ⇔ retired_version', () => {
    const rules = seed('legal_rule').rows;
    const approved = {};
    for (const r of rules.filter(r => r.status === 'approved')) approved[r.rule_code] = (approved[r.rule_code] || 0) + 1;
    for (const [code, n] of Object.entries(approved)) assert.equal(n, 1, code);
    assert.ok(rules.some(r => r.status === 'draft' && Number(r.revision) === 2 && approved[r.rule_code] === 1), 'signed text in force while revision 2 is a draft');
    for (const r of rules) assert.equal(r.status === 'retired', Boolean(r.retired_version), r.rule_code);
    assert.ok(rules.find(r => r.rule_code === 'A9-MAP').retired_version, 'A9-MAP retired in a version');
  });

  test('D4: keywords are JSON arrays of 1–60-character strings, at most 30; one approved rule has none', () => {
    assert.ok(columns('legal_rule').includes('keywords_vi') && columns('legal_rule').includes('keywords_en'), 'keyword columns exist (the test is not vacuous)');
    const rules = seed('legal_rule').rows;
    for (const r of rules) {
      for (const k of ['keywords_vi', 'keywords_en']) {
        const list = json(r[k]);
        if (list === null) continue;
        assert.ok(Array.isArray(list) && list.length <= 30, `${r.rule_code}.${k}`);
        for (const w of list) assert.ok(typeof w === 'string' && w.length >= 1 && w.length <= 60, `${r.rule_code}.${k}: ${w}`);
      }
    }
    assert.ok(rules.some(r => r.status === 'approved' && !json(r.keywords_vi)?.length && !json(r.keywords_en)?.length), 'boundary: never matched in fallback');
  });

  test('BR-001 / BR-007: every finding cites a revision that was approved in the version of its run', () => {
    const rules = Object.fromEntries(seed('legal_rule').rows.map(r => [r.rule_id, r]));
    const runs = Object.fromEntries(seed('precheck_run').rows.map(r => [r.brief_id, r]));
    const cruns = Object.fromEntries(seed('compliance_run').rows.map(r => [r.run_id, r]));
    assert.deepEqual(columns('compliance_finding').filter(c => c === 'rule_code'), []);
    assert.ok(columns('compliance_finding').includes('rule_id') && columns('compliance_finding').includes('quoted_text'));
    const signedBy = (rule, version) => rule && rule.rule_version && rule.rule_version <= version && (!rule.retired_version || rule.retired_version > version);
    for (const f of seed('precheck_finding').rows) assert.ok(signedBy(rules[f.rule_id], runs[f.brief_id].rule_version), `precheck ${f.brief_id}`);
    for (const f of seed('compliance_finding').rows) assert.ok(signedBy(rules[f.rule_id], cruns[f.run_id].rule_version), `compliance ${f.finding_id}`);
  });

  test('BR-002, BR-008: the signature and is_active checks are still in the schema', () => {
    assert.match(schema, /ck_legal_rule_approved_needs_signature CHECK \(status <> 'approved' OR \(citation IS NOT NULL AND approved_by IS NOT NULL\)\)/);
    assert.match(schema, /ck_legal_rule_active_matches_status/);
  });

  test('D11: dropped findings counted on the run — codes only, 0 ⇔ [], no level ⇒ something dropped and no finding', () => {
    const findings = new Set(seed('precheck_finding').rows.map(f => f.brief_id));
    for (const r of seed('precheck_run').rows) {
      const codes = json(r.dropped_rule_codes);
      const n = Number(r.dropped_count);
      assert.ok(Array.isArray(codes) && new Set(codes).size === codes.length, r.brief_id);
      assert.ok(n >= 0 && (n === 0) === (codes.length === 0) && codes.length <= n, r.brief_id);
      if (!r.attention_level) { assert.ok(n > 0, r.brief_id); assert.equal(findings.has(r.brief_id), false); }
    }
  });

  test('D15, D17 (T069): is_sample and segments exist; every seed rule is a sample; segments are distinct values of A, B, C', () => {
    assert.ok(columns('legal_rule').includes('is_sample'), 'is_sample column');
    assert.ok(columns('legal_rule').includes('segments'), 'segments column');
    for (const r of seed('legal_rule').rows) {
      assert.equal(r.is_sample, 'true', r.rule_code);
      const seg = json(r.segments);
      assert.ok(Array.isArray(seg) && seg.length >= 1 && new Set(seg).size === seg.length && seg.every(x => ['A', 'B', 'C'].includes(x)), `${r.rule_code}: ${r.segments}`);
    }
    assert.deepEqual(json(seed('legal_rule').rows.find(r => r.rule_code === 'A13-DOSSIER').segments).sort(), ['A', 'B'], 'the Article 13 dossier rule applies to segments A and B');
  });
});
