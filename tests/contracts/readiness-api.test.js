import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase, useFakes, resetFakes } from './supabase-fake.js';

// GET /api/projects/:id/readiness (FR-005, BR-001, US-2 Scenario 3; contracts/projects-api.contract.md)
const ME = '11111111-1111-4111-8111-111111111111';
const MINE = '44444444-4444-4444-8444-444444444444';
const OTHER = '77777777-7777-4777-8777-777777777777';
const VIEW_ROW = { project_id: MINE, segment: 'A', readiness_total: '68.75', next_action_primary: 'content.review_findings', content_score: '80.00', gauges_counted: 4 };

function client({ user = { id: ME }, viewFails = false } = {}) {
  const c = fakeSupabase({
    user,
    tables: {
      user_account: [{ user_id: ME, role: 'member', account_status: 'active' }],
      // the PostgreSQL view already filters to the caller's projects (app.is_project_member)
      v_project_readiness: [VIEW_ROW]
    }
  });
  if (!viewFails) return c;
  const from = c.from;
  c.from = (table) => {
    if (table !== 'v_project_readiness') return from(table);
    const failing = { select: () => failing, eq: () => failing, in: () => failing,
      maybeSingle: async () => ({ data: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } }),
      then: (ok) => Promise.resolve({ data: null, error: { code: '57014', message: 'timeout' } }).then(ok) };
    return failing;
  };
  return c;
}
const get = async (id) => (await import('../../app/api/projects/[id]/readiness/route.js')).GET(
  new Request(`http://localhost:3000/api/projects/${id}/readiness`), { params: { id } });

describe('GET /api/projects/:id/readiness (T028, FR-005, US-2 Scenario 3)', () => {
  afterEach(resetFakes);

  test('FR-005: a guest gets 401', async () => {
    await useFakes({ user: client({ user: null }) });
    assert.equal((await get(MINE)).status, 401);
  });

  test('BR-001: a member gets the view row as the view gives it (numbers as numbers)', async () => {
    await useFakes({ user: client() });
    const res = await get(MINE);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.readiness_total, 68.75);
    assert.equal(body.content_score, 80);
    assert.equal(body.next_action_primary, 'content.review_findings');
  });

  test('RLS: a project the caller is not a member of is 404', async () => {
    await useFakes({ user: client() });
    assert.equal((await get(OTHER)).status, 404);
  });

  test('US-2 Scenario 3: when the view fails the answer is 503 READINESS_UNAVAILABLE, never a 0 %', async () => {
    await useFakes({ user: client({ viewFails: true }) });
    const res = await get(MINE);
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.error, 'READINESS_UNAVAILABLE');
    assert.equal(body.readiness_total, undefined);
  });
});
