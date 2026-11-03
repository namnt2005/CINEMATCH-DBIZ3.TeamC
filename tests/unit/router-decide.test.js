import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCsv } from '../../lib/db/client.js';

const load = () => import('../../lib/router/decide.js');

// The seed decision table, typed the way the data layer returns it
function seed(file, row) {
  const [header, ...rows] = parseCsv(fs.readFileSync(`data/seed/${file}`, 'utf8'));
  return rows.map(r => row(Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? '']))));
}
const RULES = seed('07_segment_rule.csv', r => ({
  segment_rule_id: r.segment_rule_id, q1_shoot_in_vn: r.q1_shoot_in_vn === 'true', q2_release: r.q2_release || null,
  q3_producer: r.q3_producer || null, result_segment: r.result_segment, version: r.version
}));
const REQUIREMENTS = seed('08_segment_requirement.csv', r => ({ ...r, needed: r.needed === 'true' }));
const NEEDS = ['locations', 'crew', 'cast', 'equipment', 'logistics'];
const subsets = (list) => list.reduce((acc, item) => [...acc, ...acc.map(s => [...s, item])], [[]]);
const ask = (q1, q2 = null, q3 = null, q4 = []) => ({ q1_shoot_in_vn: q1, q2_release: q2, q3_producer: q3, q4_needs: q4 });
const rule = (id, q1, q2, q3, seg, version = '2026.1') => ({ segment_rule_id: id, q1_shoot_in_vn: q1, q2_release: q2, q3_producer: q3, result_segment: seg, version });

describe('decide() — segment from the decision table (T008, FR-002, BR-001, BR-002, US-1, Clarifications Q1–Q2)', () => {
  test('US-1 Scenario 1: Yes, outside Vietnam, foreign company → A, based on answers 1, 2 and 3', async () => {
    const { decide } = await load();
    const d = decide(ask(true, 'abroad', 'foreign', ['locations', 'crew']), RULES);
    assert.equal(d.segment, 'A');
    assert.equal(d.matched, true);
    assert.deepEqual(d.decided_by, [1, 2, 3]);
    assert.equal(d.segment_rule_id, 'bfc3aa20-4f48-5eb7-98b6-f07cb86713ed');
  });

  test('US-1 Scenario 3 / BR-001: the same answers always give the same result', async () => {
    const { decide } = await load();
    const answers = ask(true, 'vietnam', 'foreign', ['crew']);
    const first = decide(answers, RULES);
    for (let i = 0; i < 20; i += 1) assert.deepEqual(decide(answers, RULES), first);
    assert.deepEqual(decide(answers, [...RULES].reverse()), first, 'row order does not matter');
  });

  test('BR-001: the result comes from the table — change a row and the result changes with no code change', async () => {
    const { decide } = await load();
    const table = [rule('x1', true, 'abroad', 'foreign', 'A'), rule('x2', false, null, null, 'C')];
    assert.equal(decide(ask(true, 'abroad', 'foreign'), table).segment, 'A');
    const changed = [rule('x1', true, 'abroad', 'foreign', 'B'), rule('x2', false, null, null, 'C')];
    assert.equal(decide(ask(true, 'abroad', 'foreign'), changed).segment, 'B');
  });

  test('BR-001: only the current version is used; versions compare as numbers (2026.10 is newer than 2026.9)', async () => {
    const { decide, currentRules } = await load();
    assert.equal(decide(ask(true, 'abroad', 'foreign'), RULES).segment_rule_id, 'bfc3aa20-4f48-5eb7-98b6-f07cb86713ed', 'not the 2025.12 rule');
    const table = [rule('old', true, 'both', 'foreign', 'A', '2026.9'), rule('new', true, 'both', 'foreign', 'B', '2026.10')];
    assert.deepEqual(currentRules(table).map(r => r.segment_rule_id), ['new']);
    assert.equal(decide(ask(true, 'both', 'foreign'), table).segment, 'B');
    const onlyOld = [rule('old', true, 'both', 'vietnamese', 'B', '2025.12'), rule('cur', false, null, null, 'C', '2026.1')];
    assert.equal(decide(ask(true, 'both', 'vietnamese'), onlyOld).matched, false, 'a superseded rule never decides');
  });

  test('BR-002: question 4 never changes the segment — every subset of needs gives the same result', async () => {
    const { decide } = await load();
    const sets = [ask(true, 'abroad', 'foreign'), ask(true, 'vietnam', 'vietnamese'), ask(true, 'both', 'foreign'), ask(true, 'abroad', 'coproduction')];
    for (const base of sets) {
      const expected = decide(base, RULES);
      for (const q4 of subsets(NEEDS)) assert.deepEqual(decide({ ...base, q4_needs: q4 }, RULES), expected, `${JSON.stringify(base)} + ${q4}`);
    }
    // Not shooting in Vietnam: every subset without "locations" stays C (the "locations" case is the spec's edge case below)
    for (const q4 of subsets(NEEDS.filter(n => n !== 'locations'))) assert.equal(decide(ask(false, null, null, q4), RULES).segment, 'C', String(q4));
  });

  test('Spec §3 edge case (analysis H1, to be confirmed): No + needs Locations matches no rule — never another letter', async () => {
    const { decide } = await load();
    for (const q4 of subsets(NEEDS).filter(s => s.includes('locations'))) {
      const d = decide(ask(false, null, null, q4), RULES);
      assert.equal(d.matched, false, String(q4));
      assert.equal(d.segment, null);
    }
  });

  test('Clarifications Q2: not shooting in Vietnam → C, based on answer 1 only', async () => {
    const { decide } = await load();
    const d = decide(ask(false, null, null, ['cast']), RULES);
    assert.equal(d.segment, 'C');
    assert.deepEqual(d.decided_by, [1]);
  });

  test('Clarifications Q1: co-production → A for every release market', async () => {
    const { decide } = await load();
    for (const q2 of ['abroad', 'vietnam', 'both']) assert.equal(decide(ask(true, q2, 'coproduction'), RULES).segment, 'A', q2);
  });

  test('Spec §3 edge case: answers that match no rule give no segment, no rule and no reason', async () => {
    const { decide } = await load();
    const d = decide(ask(true, 'abroad', 'vietnamese'), RULES);
    assert.deepEqual(d, { segment: null, segment_rule_id: null, decided_by: [], matched: false });
  });

  test('US-1 Scenario 2: the Needed / Not needed list comes from segment_requirement, in the page language', async () => {
    const { splitRequirements } = await load();
    const vi = splitRequirements('A', REQUIREMENTS, 'vi');
    assert.deepEqual(vi.needed.map(r => r.code).sort(), ['ART13_LICENCE', 'VN_SERVICE_AGREEMENT']);
    assert.deepEqual(vi.not_needed.map(r => r.code), ['FILM_CLASSIFICATION']);
    assert.equal(vi.needed.find(r => r.code === 'ART13_LICENCE').label, 'Giấy phép quay phim sử dụng bối cảnh tại Việt Nam');
    assert.equal(splitRequirements('A', REQUIREMENTS, 'en').needed.find(r => r.code === 'ART13_LICENCE').label, 'Filming licence (Article 13)');
    const swapped = REQUIREMENTS.map(r => (r.segment === 'A' && r.requirement_code === 'FILM_CLASSIFICATION' ? { ...r, needed: true } : r));
    assert.ok(splitRequirements('A', swapped, 'en').needed.some(r => r.code === 'FILM_CLASSIFICATION'), 'table data, not code');
    assert.deepEqual(splitRequirements(null, REQUIREMENTS, 'en'), { needed: [], not_needed: [] });
  });

  test('Clarifications Q2: segment C carries the legal caveat; A and B do not', async () => {
    const { needsLegalCaveat } = await load();
    assert.equal(needsLegalCaveat('C'), true);
    assert.equal(needsLegalCaveat('A'), false);
    assert.equal(needsLegalCaveat('B'), false);
    assert.equal(needsLegalCaveat(null), false);
  });

  test('research R7: the journey configuration — needed, not needed, the needs of question 4, and gauges from the requirements', async () => {
    const { journeyConfig } = await load();
    const a = journeyConfig('A', REQUIREMENTS, ['locations', 'crew']);
    assert.deepEqual(a.needs, ['locations', 'crew']);
    assert.deepEqual(a.gauges, ['content', 'locations', 'partners', 'dossier']);
    assert.ok(a.needed.includes('ART13_LICENCE') && a.not_needed.includes('FILM_CLASSIFICATION'));
    assert.deepEqual(journeyConfig('C', REQUIREMENTS, []).gauges, ['content', 'locations', 'partners'], 'no licence → no dossier gauge');
    assert.equal(journeyConfig(null, REQUIREMENTS, []), null);
  });

  test('BR-001: decide.js runs in the browser too — it imports nothing from the server', () => {
    const source = fs.readFileSync('lib/router/decide.js', 'utf8');
    assert.doesNotMatch(source, /from ['"](node:|\.\.\/db\/|\.\.\/supabase\/|next\/)/);
  });
});
