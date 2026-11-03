import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase, useFakes, resetFakes } from './supabase-fake.js';
import { post, patch, sessionCookie, YES_ABROAD_FOREIGN } from './router-helpers.js';

const store = () => import('../../app/api/router/decisions/route.js');
const override = () => import('../../app/api/router/decisions/[id]/route.js');

async function storedA() {
  const { POST } = await store();
  const res = await POST(post(YES_ABROAD_FOREIGN));
  const { segment_decision_id: id } = await res.json();
  return { id, cookie: sessionCookie(res).value };
}
const rowOf = async (id) => {
  const { getOne } = await import('../../lib/db/client.js');
  return { ...getOne('SELECT segment, segment_override FROM segment_decision WHERE segment_decision_id = ?', [id]) };
};
const send = async (id, body, cookie) => (await override()).PATCH(patch(id, body, { cookie }), { params: { id } });

describe('PATCH /api/router/decisions/:id — override on node:sqlite (T019, FR-002, BR-003, US-2)', () => {
  test('US-2 Scenario 1: result A, the user picks B → the result becomes B and segment_override = B is recorded', async () => {
    const { id, cookie } = await storedA();
    const res = await send(id, { segment_override: 'B' }, cookie);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.segment, 'B');
    assert.equal(body.segment_override, 'B');
    assert.ok(body.requirements.needed.some(r => r.code === 'FILM_CLASSIFICATION'), 'the list follows the picked segment');
    assert.deepEqual(await rowOf(id), { segment: 'B', segment_override: 'B' });
  });

  test('BR-003: every override is allowed and recorded — B, then C (with the caveat), then back', async () => {
    const { id, cookie } = await storedA();
    for (const s of ['C', 'B', 'C']) {
      const body = await (await send(id, { segment_override: s }, cookie)).json();
      assert.equal(body.segment_override, s);
      assert.equal(body.caveat, s === 'C');
      assert.deepEqual(await rowOf(id), { segment: s, segment_override: s });
    }
  });

  test('BR-003: picking the segment the table gave clears the override', async () => {
    const { id, cookie } = await storedA();
    await send(id, { segment_override: 'C' }, cookie);
    const body = await (await send(id, { segment_override: 'A' }, cookie)).json();
    assert.equal(body.segment, 'A');
    assert.equal(body.segment_override, null);
    assert.deepEqual(await rowOf(id), { segment: 'A', segment_override: null });
  });

  test('BR-003: a result that matched no rule can be overridden too', async () => {
    const { POST } = await store();
    const res = await POST(post({ q1_shoot_in_vn: true, q2_release: 'abroad', q3_producer: 'vietnamese', q4_needs: [] }));
    const { segment_decision_id: id } = await res.json();
    await send(id, { segment_override: 'A' }, sessionCookie(res).value);
    assert.deepEqual(await rowOf(id), { segment: 'A', segment_override: 'A' });
  });

  test('research R6: another session, or no session, cannot change the row → 404, unchanged', async () => {
    const { id } = await storedA();
    assert.equal((await send(id, { segment_override: 'B' }, 'not-the-owner')).status, 404);
    assert.equal((await send(id, { segment_override: 'B' }, '')).status, 404);
    assert.deepEqual(await rowOf(id), { segment: 'A', segment_override: null });
  });

  test('BR-003: a value outside A, B, C → 422, unchanged', async () => {
    const { id, cookie } = await storedA();
    const res = await send(id, { segment_override: 'D' }, cookie);
    assert.equal(res.status, 422);
    assert.equal((await res.json()).error, 'VALIDATION_ERROR');
    assert.deepEqual(await rowOf(id), { segment: 'A', segment_override: null });
  });
});

describe('PATCH /api/router/decisions/:id on Supabase (T019, System client)', () => {
  afterEach(resetFakes);

  test('BR-003: the override is written by the System client on the row of the same session', async () => {
    const admin = fakeSupabase({
      tables: {
        segment_rule: [{ segment_rule_id: 'r1', q1_shoot_in_vn: true, q2_release: 'abroad', q3_producer: 'foreign', result_segment: 'A', version: '2026.1' }],
        segment_requirement: [{ segment: 'B', requirement_code: 'FILM_CLASSIFICATION', label_vi: 'Phân loại', label_en: 'Classification', needed: true }],
        segment_decision: [{ segment_decision_id: 'd1', session_key: 'session:abc123', project_id: null, segment_rule_id: 'r1', q1_shoot_in_vn: true, q2_release: 'abroad', q3_producer: 'foreign', q4_needs: [], segment: 'A', segment_override: null, decided_by: [1, 2, 3], journey_config: null }]
      }
    });
    await useFakes({ user: fakeSupabase(), admin });
    const res = await send('d1', { segment_override: 'B' }, 'abc123');
    assert.equal(res.status, 200);
    assert.equal(admin.tables.segment_decision[0].segment_override, 'B');
    assert.equal(admin.tables.segment_decision[0].segment, 'B');
  });
});
