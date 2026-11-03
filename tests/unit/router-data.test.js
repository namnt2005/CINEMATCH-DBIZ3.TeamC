import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase, useFakes, resetFakes } from '../contracts/supabase-fake.js';

const load = () => import('../../lib/db/router.js');
const RULE_A = 'bfc3aa20-4f48-5eb7-98b6-f07cb86713ed';   // 2026.1: true, abroad, foreign → A
const RULE_OLD = '96c5cf45-c10e-5a23-a7ee-ab11fc6b54ea'; // 2025.12, superseded
const ANSWERS = { q1_shoot_in_vn: true, q2_release: 'abroad', q3_producer: 'foreign', q4_needs: ['locations'] };
const DECISION_A = { segment: 'A', segment_rule_id: RULE_A, decided_by: [1, 2, 3], matched: true };
const JOURNEY = { needed: ['ART13_LICENCE'], not_needed: [], needs: ['locations'], gauges: ['content', 'locations', 'partners', 'dossier'] };

describe('Router data on node:sqlite (T004, FR-002, BR-001, BR-003, research R6, R8)', () => {
  test('BR-001: getRouterData returns the rules of the current version only, typed, and every requirement', async () => {
    const { getRouterData } = await load();
    const { rules, requirements } = await getRouterData();
    assert.ok(rules.length >= 5);
    assert.ok(rules.every(r => r.version === '2026.1'));
    assert.ok(!rules.some(r => r.segment_rule_id === RULE_OLD), 'superseded rule never offered');
    const c = rules.find(r => r.result_segment === 'C');
    assert.equal(c.q1_shoot_in_vn, false);
    assert.equal(c.q2_release, null);
    assert.ok(requirements.some(r => r.segment === 'A' && r.requirement_code === 'ART13_LICENCE' && r.needed === true));
    assert.ok(requirements.every(r => typeof r.needed === 'boolean' && r.label_vi && r.label_en));
  });

  test('D3: saveDecision stores one row under the session key, with the answers and no project', async () => {
    const { saveDecision } = await load();
    const { query } = await import('../../lib/db/client.js');
    const { segment_decision_id: id } = await saveDecision({ sessionKey: 'session:t004a', answers: ANSWERS, decision: DECISION_A, journeyConfig: JOURNEY });
    const rows = query('SELECT * FROM segment_decision WHERE segment_decision_id = ?', [id]);
    assert.equal(rows.length, 1);
    const row = rows[0];
    assert.equal(row.session_key, 'session:t004a');
    assert.equal(row.project_id, null);
    assert.equal(row.segment_rule_id, RULE_A);
    assert.equal(row.segment, 'A');
    assert.equal(row.segment_override, null);
    assert.deepEqual(JSON.parse(row.q4_needs), ['locations']);
    assert.deepEqual(JSON.parse(row.decided_by), [1, 2, 3]);
    assert.deepEqual(JSON.parse(row.journey_config), JOURNEY);
  });

  test('BR-003: overrideDecision records the override on the row of the same session; the rule\'s own segment clears it', async () => {
    const { saveDecision, overrideDecision } = await load();
    const { getOne } = await import('../../lib/db/client.js');
    const { segment_decision_id: id } = await saveDecision({ sessionKey: 'session:t004b', answers: ANSWERS, decision: DECISION_A, journeyConfig: JOURNEY });
    const changed = await overrideDecision({ sessionKey: 'session:t004b', id, segment: 'B' });
    assert.equal(changed.segment_override, 'B');
    assert.equal(changed.segment, 'B');
    let row = getOne('SELECT segment, segment_override FROM segment_decision WHERE segment_decision_id = ?', [id]);
    assert.deepEqual({ ...row }, { segment: 'B', segment_override: 'B' });
    await overrideDecision({ sessionKey: 'session:t004b', id, segment: 'A' });
    row = getOne('SELECT segment, segment_override FROM segment_decision WHERE segment_decision_id = ?', [id]);
    assert.deepEqual({ ...row }, { segment: 'A', segment_override: null });
  });

  test('BR-003: another session cannot change the row', async () => {
    const { saveDecision, overrideDecision } = await load();
    const { getOne } = await import('../../lib/db/client.js');
    const { segment_decision_id: id } = await saveDecision({ sessionKey: 'session:t004c', answers: ANSWERS, decision: DECISION_A, journeyConfig: JOURNEY });
    assert.equal(await overrideDecision({ sessionKey: 'session:someone-else', id, segment: 'C' }), null);
    assert.equal(getOne('SELECT segment_override FROM segment_decision WHERE segment_decision_id = ?', [id]).segment_override, null);
  });

  test('research R3: an answer set that matches no rule is stored with no segment and no rule', async () => {
    const { saveDecision } = await load();
    const { getOne } = await import('../../lib/db/client.js');
    const { segment_decision_id: id } = await saveDecision({
      sessionKey: 'session:t004d', answers: { q1_shoot_in_vn: true, q2_release: 'abroad', q3_producer: 'vietnamese', q4_needs: [] },
      decision: { segment: null, segment_rule_id: null, decided_by: [], matched: false }, journeyConfig: null
    });
    const row = getOne('SELECT segment, segment_rule_id FROM segment_decision WHERE segment_decision_id = ?', [id]);
    assert.deepEqual({ ...row }, { segment: null, segment_rule_id: null });
  });
});

describe('Router data on Supabase (T004, plan: System client for guests)', () => {
  afterEach(resetFakes);

  test('D2 of 003: guests read the table and store decisions through the System client, never the user client', async () => {
    const admin = fakeSupabase({
      tables: {
        segment_rule: [
          { segment_rule_id: RULE_A, q1_shoot_in_vn: true, q2_release: 'abroad', q3_producer: 'foreign', result_segment: 'A', version: '2026.1' },
          { segment_rule_id: RULE_OLD, q1_shoot_in_vn: true, q2_release: 'abroad', q3_producer: 'foreign', result_segment: 'A', version: '2025.12' }
        ],
        segment_requirement: [{ segment: 'A', requirement_code: 'ART13_LICENCE', label_vi: 'Giấy phép', label_en: 'Licence', needed: true }],
        segment_decision: []
      }
    });
    const user = fakeSupabase();
    await useFakes({ user, admin });
    const { getRouterData, saveDecision, overrideDecision } = await load();
    const { rules } = await getRouterData();
    assert.deepEqual(rules.map(r => r.segment_rule_id), [RULE_A]);
    const { segment_decision_id: id } = await saveDecision({ sessionKey: 'session:t004e', answers: ANSWERS, decision: DECISION_A, journeyConfig: JOURNEY });
    assert.equal(admin.tables.segment_decision.length, 1);
    assert.equal(admin.tables.segment_decision[0].session_key, 'session:t004e');
    assert.equal(admin.tables.segment_decision[0].project_id ?? null, null);
    await overrideDecision({ sessionKey: 'session:t004e', id, segment: 'C' });
    assert.equal(admin.tables.segment_decision[0].segment_override, 'C');
    assert.equal(user.calls.length, 0);
  });
});
