import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseCsv } from '../../lib/db/client.js';

// Finding verification (T025, M2 BR-001, FR-012, US-1 Scenario 2, D11): a finding is kept only when it cites an approved,
// active rule with a citation and an approver, and quotes a passage that appears verbatim in the summary. Rules come from
// the seed file (found by table name); the summary is invented.
const verify = () => import('../../lib/content-check/verify.js');

function seed(table) {
  const file = fs.readdirSync('data/seed').find(f => new RegExp(`^\\d+_${table}\\.csv$`).test(f));
  const [head, ...rows] = parseCsv(fs.readFileSync(path.join('data/seed', file), 'utf8'));
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
const RULES = seed('legal_rule');
const status = (code) => RULES.find(r => r.rule_code === code)?.status;
const TEXT = 'In 1979 a fisherman guides soldiers to a border post at night. Years later the soldiers return to the border post to thank him.';
const run = async (pairs, rules = RULES) => (await verify()).verifyFindings({ text: TEXT, pairs, rules });

describe('Finding verification (T025)', () => {
  test('the seed has the cases the test needs (approved, draft, retired)', () => {
    assert.equal(status('A9-MIL'), 'approved');
    assert.equal(status('A9-HERIT'), 'draft');
    assert.equal(status('A9-MAP'), 'retired');
  });

  test('a kept finding cites an approved rule and carries its span: text.slice(start, end) === quote', async () => {
    const out = await run([{ rule_code: 'A9-MIL', quoted_text: 'guides soldiers to a border post' }]);
    assert.equal(out.kept.length, 1);
    const f = out.kept[0];
    assert.equal(f.rule_code, 'A9-MIL');
    assert.ok(f.citation, 'citation of the rule');
    assert.equal(TEXT.slice(f.span_start, f.span_end), 'guides soldiers to a border post');
    assert.equal(out.dropped_count, 0);
    assert.deepEqual(out.dropped_rule_codes, []);
  });

  test('BR-001 / US-1 Sc2: unknown, draft and retired codes are dropped and counted, never shown', async () => {
    const out = await run([
      { rule_code: 'A9-NAVY', quoted_text: 'soldiers' },          // not a rule (invented by the model)
      { rule_code: 'A9-HERIT', quoted_text: 'border post' },      // draft, not signed
      { rule_code: 'A9-MAP', quoted_text: 'border post' }         // retired
    ]);
    assert.deepEqual(out.kept, []);
    assert.equal(out.dropped_count, 3);
    assert.deepEqual([...out.dropped_rule_codes].sort(), ['A9-HERIT', 'A9-MAP', 'A9-NAVY']);
  });

  test('BR-001: a rule without a citation or without an approver is dropped even if marked approved', async () => {
    const tampered = RULES.map(r => (r.rule_code === 'A9-MIL' ? { ...r, citation: '' } : r.rule_code === 'A9-LONG' ? { ...r, approved_by: '' } : r));
    const out = await run([{ rule_code: 'A9-MIL', quoted_text: 'soldiers' }, { rule_code: 'A9-LONG', quoted_text: 'border post' }], tampered);
    assert.deepEqual(out.kept, []);
    assert.deepEqual([...out.dropped_rule_codes].sort(), ['A9-LONG', 'A9-MIL']);
  });

  test('FR-012: a quote that is not verbatim in the text is dropped (different case, invented words, empty, over 500 characters)', async () => {
    const out = await run([
      { rule_code: 'A9-MIL', quoted_text: 'Guides Soldiers' },
      { rule_code: 'A9-MIL', quoted_text: 'tanks cross the river' },
      { rule_code: 'A9-LONG', quoted_text: '   ' },
      { rule_code: 'A9-LONG', quoted_text: 'x'.repeat(501) }
    ]);
    assert.deepEqual(out.kept, []);
    assert.equal(out.dropped_count, 4);
    assert.deepEqual([...out.dropped_rule_codes].sort(), ['A9-LONG', 'A9-MIL']);
  });

  test('a repeated quote of the same rule takes the next occurrence; exact duplicates are merged', async () => {
    const out = await run([
      { rule_code: 'A9-LONG', quoted_text: 'border post' },
      { rule_code: 'A9-LONG', quoted_text: 'border post' },
      { rule_code: 'A9-LONG', quoted_text: 'border post' }
    ]);
    const spans = out.kept.map(f => f.span_start);
    assert.equal(out.kept.length, 2, 'two occurrences in the text');
    assert.equal(new Set(spans).size, 2);
    assert.deepEqual(spans, [TEXT.indexOf('border post'), TEXT.indexOf('border post', TEXT.indexOf('border post') + 1)]);
  });

  test('D11: the result keeps the count and the codes of dropped findings, never their text', async () => {
    const secret = 'tanks cross the river at dawn';
    const out = await run([{ rule_code: 'A9-MIL', quoted_text: secret }, { rule_code: 'A9-NAVY', quoted_text: 'soldiers' }]);
    assert.equal(out.dropped_count, 2);
    assert.deepEqual([...out.dropped_rule_codes].sort(), ['A9-MIL', 'A9-NAVY']);
    assert.equal(JSON.stringify(out).includes(secret), false);
  });
});
