import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getDb } from '../../lib/db/client.js';

// The rule-set version label (T006, decision D6, FR-004, M2 question 14): YYYY.MM for the first version of a month in
// Vietnam time, then YYYY.MM.02, .03…; text order equals time order, so MAX(rule_version) names the newest.
const version = () => import('../../lib/legal/version.js');

describe('Rule-set version label (T006)', () => {
  test('first version of a month is YYYY.MM in Vietnam time (17:30 UTC on 30/11 is already December in Vietnam)', async () => {
    const { nextRuleVersion } = await version();
    assert.equal(nextRuleVersion(['2026.06', '2026.07', '2026.08'], new Date('2026-11-09T03:00:00Z')), '2026.11');
    assert.equal(nextRuleVersion([], new Date('2026-11-30T17:30:00Z')), '2026.12');
  });

  test('later versions of the same month are .02, .03 … .10', async () => {
    const { nextRuleVersion } = await version();
    const now = new Date('2026-11-09T03:00:00Z');
    assert.equal(nextRuleVersion(['2026.11'], now), '2026.11.02');
    assert.equal(nextRuleVersion(['2026.11', '2026.11.02'], now), '2026.11.03');
    const nine = ['2026.11', ...[2, 3, 4, 5, 6, 7, 8, 9].map(n => `2026.11.0${n}`)];
    assert.equal(nextRuleVersion(nine, now), '2026.11.10');
  });

  test('text order is time order, so MAX names the newest', () => {
    const labels = ['2026.08', '2026.11', '2026.11.02', '2026.11.09', '2026.11.10', '2026.12'];
    assert.deepEqual([...labels].sort(), labels);
  });

  test('the SQL twin used by node:sqlite gives the same label', async () => {
    const { nextRuleVersion, nextRuleVersionSql } = await version();
    const now = new Date('2026-11-09T03:00:00Z');
    const db = getDb();
    const sqlLabel = db.prepare(nextRuleVersionSql()).get({ now: now.toISOString() }).label;
    const existing = db.prepare('SELECT rule_version FROM rule_set_version').all().map(r => r.rule_version);
    assert.equal(sqlLabel, nextRuleVersion(existing, now));
  });
});
