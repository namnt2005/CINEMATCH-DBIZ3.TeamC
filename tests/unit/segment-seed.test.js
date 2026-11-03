import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCsv } from '../../lib/db/client.js';

// The decision table as VFDA approves it: data/seed, read directly (no app code involved)
function table(file) {
  const [header, ...rows] = parseCsv(fs.readFileSync(`data/seed/${file}`, 'utf8'));
  return rows.map(r => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ''])));
}
const RULES = table('07_segment_rule.csv');
const REQUIREMENTS = table('08_segment_requirement.csv');
const CURRENT = '2026.1';
const RELEASES = ['abroad', 'vietnam', 'both'];
const PRODUCERS = ['foreign', 'vietnamese', 'coproduction'];
const ANSWER_SETS = [
  { q1: 'false', q2: '', q3: '' },
  ...RELEASES.flatMap(q2 => PRODUCERS.map(q3 => ({ q1: 'true', q2, q3 })))
];
// A rule column left empty accepts any answer (the C rule: questions 2 and 3 are not asked)
const matches = (rule, a) => rule.q1_shoot_in_vn === a.q1
  && (rule.q2_release === '' || rule.q2_release === a.q2)
  && (rule.q3_producer === '' || rule.q3_producer === a.q3);
const resultFor = (a, version = CURRENT) => RULES.filter(r => r.version === version && matches(r, a)).map(r => r.result_segment);

describe('Segment decision table in data/seed (T002, BR-001, FR-002, Clarifications Q1–Q2, plan D1)', () => {
  test('BR-001: every rule gives exactly one segment, A, B or C', () => {
    for (const rule of RULES) assert.ok(['A', 'B', 'C'].includes(rule.result_segment), rule.segment_rule_id);
  });

  test('BR-001: within one version no answer set matches two rules (the same answers always give one segment)', () => {
    for (const version of new Set(RULES.map(r => r.version))) {
      for (const a of ANSWER_SETS) assert.ok(resultFor(a, version).length <= 1, `${version} ${JSON.stringify(a)}`);
    }
  });

  test('BR-001: the current version is 2026.1; the superseded 2025.12 rule is kept', () => {
    const versions = [...new Set(RULES.map(r => r.version))];
    assert.ok(versions.includes(CURRENT));
    assert.ok(versions.includes('2025.12'));
  });

  test('Clarifications Q1: co-production gives A whatever the release market', () => {
    for (const q2 of RELEASES) assert.deepEqual(resultFor({ q1: 'true', q2, q3: 'coproduction' }), ['A'], q2);
  });

  test('Clarifications Q2: not shooting in Vietnam gives C, with no shooting licence', () => {
    assert.deepEqual(resultFor({ q1: 'false', q2: '', q3: '' }), ['C']);
    const licence = REQUIREMENTS.find(r => r.segment === 'C' && r.requirement_code === 'ART13_LICENCE');
    assert.equal(licence?.needed, 'false');
  });

  test('Clarifications Q2: segment C lists the usual commercial documents — service contract and crew visas — as needed', () => {
    for (const code of ['SERVICE_CONTRACT', 'CREW_VISA']) {
      const row = REQUIREMENTS.find(r => r.segment === 'C' && r.requirement_code === code);
      assert.ok(row, `C / ${code} missing`);
      assert.equal(row.needed, 'true', code);
      assert.ok(row.label_vi && row.label_en, `${code} labels`);
    }
  });

  test('FR-002: A, B and C each have a Needed / Not needed list', () => {
    for (const segment of ['A', 'B', 'C']) assert.ok(REQUIREMENTS.some(r => r.segment === segment), segment);
  });
});
