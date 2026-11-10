import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The public requirements library on node:sqlite (T072; FR-015, FR-016, US-5 Sc1, D15, D17; SC-30, SC-31 SR-281..SR-293).
// The expected sets are computed from the seed and sample files, not copied from the code.
const lib = () => import('../../lib/db/requirements.js');

function csvRows(path) {
  const text = readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8').trim();
  const out = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch; }
    else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); out.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  row.push(cell); out.push(row);
  const [head, ...body] = out;
  return body.map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
const ALL = [...csvRows('data/seed/17_legal_rule.csv'), ...csvRows('data/seed/samples/legal_rule_samples.csv')];
const inForce = ALL.filter(r => r.status === 'approved' && r.is_active === 'true');
const codesFor = (segment) => inForce.filter(r => JSON.parse(r.segments).includes(segment)).map(r => r.rule_code).sort();

describe('Requirements library (T072, FR-015)', () => {
  test('US-5 Sc1: segment A lists exactly the approved, active revisions whose segments include A, with both texts and the citation', async () => {
    const { listRequirements } = await lib();
    const out = await listRequirements({ segment: 'A' });
    assert.deepEqual(out.rules.map(r => r.rule_code).sort(), codesFor('A'));
    for (const r of out.rules) {
      for (const k of ['title_vi', 'title_en', 'description_vi', 'description_en', 'citation', 'rule_version', 'rule_slug', 'topic', 'severity']) {
        assert.ok(typeof r[k] === 'string' && r[k].trim(), `${r.rule_code}.${k}`);
      }
      assert.equal(r.is_sample, true, `${r.rule_code} is a sample (D15)`);
      assert.ok(r.segments.includes('A'));
      assert.equal(r.approved_by, undefined, 'the approver id is not public');
    }
  });

  test('segment C leaves out the rules for A and B only (A13-DOSSIER, A9-SECRET); drafts and retired rules never appear (SR-281)', async () => {
    const { listRequirements } = await lib();
    const out = await listRequirements({ segment: 'C' });
    const codes = out.rules.map(r => r.rule_code);
    assert.deepEqual(codes.slice().sort(), codesFor('C'));
    for (const c of ['A13-DOSSIER', 'A9-SECRET', 'A9-MAP', 'A9-DRUG', 'A9-HERIT', 'A9-ANIMAL', 'A9-FLAG']) assert.ok(!codes.includes(c), c);
    assert.equal(new Set(codes).size, codes.length, 'one card per code: the draft revision 2 of A9-HIST is not listed');
  });

  test('topic counts cover the 7 topics (0 kept), the topic filter narrows the list, the rule set line has the version in force', async () => {
    const { listRequirements } = await lib();
    const all = await listRequirements({});
    assert.equal(all.rules.length, inForce.length);
    assert.equal(all.total, inForce.length);
    assert.equal(all.rule_version, '2026.08');
    assert.deepEqual(Object.keys(all.counts).sort(), ['dossier', 'heritage', 'history', 'privacy', 'public_order', 'religion', 'security']);
    for (const [topic, n] of Object.entries(all.counts)) assert.equal(n, inForce.filter(r => r.topic === topic).length, topic);
    const history = await listRequirements({ topic: 'history' });
    assert.deepEqual(history.rules.map(r => r.rule_code).sort(), inForce.filter(r => r.topic === 'history').map(r => r.rule_code).sort());
    assert.deepEqual(history.counts, all.counts, 'the counts do not shrink with the topic filter');
    const topics = all.rules.map(r => r.topic);
    assert.deepEqual(topics, topics.slice().sort(), 'cards sorted by topic (SC-30 Default)');
  });

  test('an unknown topic or segment is a validation error', async () => {
    const { listRequirements } = await lib();
    await assert.rejects(listRequirements({ topic: 'weather' }), (e) => e.code === 'VALIDATION_ERROR' && Boolean(e.fields?.topic));
    await assert.rejects(listRequirements({ segment: 'D' }), (e) => e.code === 'VALIDATION_ERROR' && Boolean(e.fields?.segment));
  });
});

describe('One rule page (T072, FR-016, SC-31)', () => {
  test('the revision in force with both descriptions, guidance and citation — not the draft revision 2 of A9-HIST', async () => {
    const { getRequirement } = await lib();
    const out = await getRequirement('a9-hist');
    const expected = inForce.find(r => r.rule_code === 'A9-HIST');
    assert.equal(out.rule.revision, 1);
    assert.equal(out.rule.retired, false);
    for (const k of ['title_vi', 'title_en', 'description_vi', 'description_en', 'guidance_vi', 'guidance_en', 'citation', 'rule_version', 'approved_at']) {
      assert.equal(out.rule[k], expected[k], k);
    }
    assert.equal(out.rule.approved_by, undefined);
  });

  test('related rules: at most 3, approved and in force, same topic, never the rule itself (#12)', async () => {
    const { getRequirement } = await lib();
    const out = await getRequirement('a9-mil');
    assert.ok(out.related.length >= 1 && out.related.length <= 3);
    const ok = new Set(inForce.filter(r => r.topic === 'security' && r.rule_code !== 'A9-MIL').map(r => r.rule_code));
    for (const r of out.related) assert.ok(ok.has(r.rule_code), r.rule_code);
  });

  test('SR-293: a retired rule still opens from an old link, marked retired with the version and date it was retired', async () => {
    const { getRequirement } = await lib();
    const out = await getRequirement('a9-map');
    assert.equal(out.rule.retired, true);
    assert.equal(out.rule.retired_version, '2026.08');
    assert.match(out.rule.retired_at, /^2026-08-28/);
    assert.deepEqual(out.related, [], 'no related rules or pre-check from a retired rule');
  });

  test('a draft-only code or an unknown slug → NOT_FOUND (SC-31 Empty)', async () => {
    const { getRequirement } = await lib();
    for (const slug of ['a9-drug', 'a9-animal', 'no-such-rule']) {
      await assert.rejects(getRequirement(slug), (e) => e.code === 'NOT_FOUND', slug);
    }
  });
});
