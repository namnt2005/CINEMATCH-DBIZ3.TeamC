import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseCsv, query } from '../../lib/db/client.js';

// Sample rules (T070, decisions D14, D15, D16): about 25 rules in all — the 9 seed rules plus a separate generated file —
// all marked as samples until the VFDA Legal Board writes the real ones.
const SAMPLES = 'data/seed/samples/legal_rule_samples.csv';
function read(file) {
  const [head, ...rows] = parseCsv(fs.readFileSync(file, 'utf8'));
  return { head, rows: rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]]))) };
}
const seedFile = (table) => path.join('data/seed', fs.readdirSync('data/seed').find(f => new RegExp(`^\\d+_${table}\\.csv$`).test(f)));
const MARK = '(mẫu — chờ Ban Pháp chế VFDA kiểm)';

describe('Sample rules (T070)', () => {
  test('D14: the sample file exists, generated, with the columns of legal_rule', () => {
    assert.ok(fs.existsSync(SAMPLES), SAMPLES);
    assert.ok(fs.existsSync('data/seed/generate_samples.py'), 'generator');
    assert.deepEqual(read(SAMPLES).head, read(seedFile('legal_rule')).head);
  });

  test('D14: seed + samples make about 25 rules; codes and slugs unique across both files', () => {
    const all = [...read(seedFile('legal_rule')).rows, ...read(SAMPLES).rows];
    assert.ok(all.length >= 24 && all.length <= 26, `${all.length} rules`);
    const key = (r) => `${r.rule_code}#${r.revision}`;
    assert.equal(new Set(all.map(key)).size, all.length, 'rule_code + revision unique');
    assert.equal(new Set(all.map(r => `${r.rule_slug}#${r.revision}`)).size, all.length, 'rule_slug + revision unique');
    const seedCodes = new Set(read(seedFile('legal_rule')).rows.map(r => r.rule_code));
    for (const r of read(SAMPLES).rows) assert.equal(seedCodes.has(r.rule_code), false, `${r.rule_code} also in the main seed`);
  });

  test('D15, D16: every sample is marked; approved samples carry a marked clause-level citation, a Legal Board approver, a version, keywords and segments', () => {
    const legal = new Set(read(seedFile('user_account')).rows.filter(u => u.role === 'vfda_legal').map(u => u.user_id));
    const versions = new Set(read(seedFile('rule_set_version')).rows.map(v => v.rule_version));
    const samples = read(SAMPLES).rows;
    assert.ok(samples.length >= 15);
    for (const r of samples) {
      assert.equal(r.is_sample, 'true', r.rule_code);
      if (r.status !== 'approved') continue;
      assert.ok(r.citation.endsWith(MARK), `${r.rule_code}: ${r.citation}`);
      assert.match(r.citation, /Điều 9 khoản \d+ điểm [a-zđ]/, `${r.rule_code}: down to the clause and point`);
      assert.ok(legal.has(r.approved_by), `${r.rule_code}: approver is a Legal Board member`);
      assert.ok(versions.has(r.rule_version), `${r.rule_code}: version ${r.rule_version}`);
      assert.ok(JSON.parse(r.keywords_vi).length && JSON.parse(r.keywords_en).length, `${r.rule_code}: keywords`);
      assert.ok(JSON.parse(r.segments).length >= 1, `${r.rule_code}: segments`);
    }
  });

  test('D14: the node:sqlite database holds the seed and the sample rules', () => {
    const n = Number(query('SELECT COUNT(*) AS n FROM legal_rule')[0].n);
    assert.equal(n, read(seedFile('legal_rule')).rows.length + read(SAMPLES).rows.length);
  });

  test('D14: the samples do not change the 50 main seed files', () => {
    // 49 → 50 on 11/11/2026 (approved by Nam Tran): M5 D1 added the seed file of location_document_type
    assert.equal(fs.readdirSync('data/seed').filter(f => /^\d+_.+\.csv$/.test(f)).length, 50);
  });
});
