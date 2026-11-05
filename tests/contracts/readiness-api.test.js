import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase, useFakes, resetFakes } from './supabase-fake.js';

// GET /api/projects/:id/readiness (FR-005, BR-001, US-2 Scenario 3; contracts/projects-api.contract.md)
const ME = '11111111-1111-4111-8111-111111111111';
const MINE = '44444444-4444-4444-8444-444444444444';
const OTHER = '77777777-7777-4777-8777-777777777777';
const VIEW_ROW = {
  project_id: MINE, segment: 'A', content_score: '80.00', locations_score: '100.00', partners_score: '70.00', dossier_score: '25.00', logistics_score: null,
  gauges_shown: 'content,locations,partners,dossier,logistics', gauges_counted: 4, readiness_total: '68.75',
  content_action: 'content.review_findings', locations_action: 'done', partners_action: 'partners.confirm', dossier_action: 'dossier.add_missing',
  logistics_action: 'logistics.phase2', content_open_findings: 1, dossier_missing: 'A13_ART9_COMMITMENT,A13_SCRIPT_VI', next_action_primary: 'content.review_findings'
};

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

  test('BR-001, H3: a member gets the view row under the spec names gauge_scores (object) and next_actions (array)', async () => {
    await useFakes({ user: client() });
    const res = await get(MINE);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.readiness_total, 68.75);
    assert.deepEqual(body.gauge_scores, { content: 80, locations: 100, partners: 70, dossier: 25, logistics: null });
    assert.deepEqual(body.next_actions, ['content.review_findings', 'done', 'partners.confirm', 'dossier.add_missing', 'logistics.phase2']);
    assert.deepEqual(body.gauges_shown, ['content', 'locations', 'partners', 'dossier', 'logistics']);
    assert.equal(body.gauges_counted, 4);
    assert.equal(body.next_action_primary, 'content.review_findings');
    assert.deepEqual(body.details, { content_open_findings: 1, dossier_missing: ['A13_ART9_COMMITMENT', 'A13_SCRIPT_VI'] });
    assert.equal(body.content_score, undefined, 'the flat view columns stay inside the server');
  });

  test('BR-002, H3: a gauge not shown for the segment has no key in gauge_scores and no entry in next_actions', async () => {
    const row = { ...VIEW_ROW, segment: 'C', dossier_score: null, dossier_action: null, gauges_shown: 'content,locations,partners,logistics', gauges_counted: 3, dossier_missing: null };
    const c = fakeSupabase({ user: { id: ME }, tables: { user_account: [{ user_id: ME, role: 'member', account_status: 'active' }], v_project_readiness: [row] } });
    await useFakes({ user: c });
    const body = await (await get(MINE)).json();
    assert.deepEqual(Object.keys(body.gauge_scores), ['content', 'locations', 'partners', 'logistics']);
    assert.equal(body.next_actions.length, 4);
    assert.deepEqual(body.details.dossier_missing, []);
  });

  test('RLS: a project the caller is not a member of is 404', async () => {
    await useFakes({ user: client() });
    assert.equal((await get(OTHER)).status, 404);
  });

  test('RLS: a malformed project id is 404, not a database error (found on cinematch-dev, 05/11/2026)', async () => {
    const c = client();
    await useFakes({ user: c });
    assert.equal((await get('undefined')).status, 404);
    assert.ok(!c.calls.some(q => q.table === 'v_project_readiness'), 'the view is not asked');
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
