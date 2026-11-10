import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase, useFakes, resetFakes } from './supabase-fake.js';

// The timeline routes with the Supabase fake (T056; contracts/project-checks-api.contract.md; FR-017, FR-018, BR-006, D1, D10).
const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const PROJECT = '44444444-4444-4444-8444-444444444444';
const fail = (message) => () => ({ data: null, error: { code: 'P0001', message } });

function fakes(user, rpc = {}) {
  const tables = {
    user_account: [{ user_id: OWNER, role: 'member', account_status: 'active' }, { user_id: OTHER, role: 'member', account_status: 'active' }],
    project: [{ project_id: PROJECT, project_name: 'The Last Ferry', segment: 'A', stage: 'preparing', shoot_date: '2027-03-15', buffer_days: 7 }],
    project_member: [{ project_id: PROJECT, user_id: OWNER, permission: 'owner', invite_status: 'accepted' }],
    public_holiday: [{ name: 'Tết Dương lịch 2027', start_date: '2027-01-01', end_date: '2027-01-01', is_expected: false },
      { name: 'Tết Nguyên đán 2027', start_date: '2027-02-05', end_date: '2027-02-10', is_expected: true }],
    collab_request: [{ request_id: 'r1', project_id: PROJECT, status: 'accepted', confirmed_at: null }],
    bilingual_paragraph: [{ project_id: PROJECT, doc_code: 'A13_SCRIPT_VI', idx: 1, status: 'machine' }]
  };
  const handlers = { app_update_project: (args) => ({ data: { project_id: args.p_project_id, updated_at: '2026-11-10T10:00:00+07:00' }, error: null }), ...rpc };
  const userClient = fakeSupabase({ user, tables, rpc: handlers });
  const admin = fakeSupabase({ user, store: userClient.tables, rpc: handlers });
  return { userClient, admin };
}
async function use(user, rpc) { const f = fakes(user, rpc); await useFakes({ user: f.userClient, admin: f.admin }); return f; }
const req = (url, method = 'GET', body) => new Request(`http://localhost:3000${url}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
const timeline = async (id) => (await import('../../app/api/projects/[id]/timeline/route.js')).GET(req(`/api/projects/${id}/timeline`), { params: { id } });
const patch = async (body) => (await import('../../app/api/projects/[id]/route.js')).PATCH(req(`/api/projects/${PROJECT}`, 'PATCH', body), { params: { id: PROJECT } });

describe('Timeline routes (T056)', () => {
  afterEach(async () => { await resetFakes(); });

  test('GET timeline → recommended 05/01/2027, latest 02/02/2027, both paths, Tết expected, milestone states', async () => {
    await use({ id: OWNER });
    const res = await timeline(PROJECT);
    assert.equal(res.status, 200);
    const t = await res.json();
    assert.equal(t.applies, true);
    assert.equal(t.recommended, '2027-01-05');
    assert.equal(t.latest, '2027-02-02');
    assert.equal(t.resubmission.result_by_worst, '2027-03-05');
    assert.ok(t.holidays.find(h => h.start_date === '2027-02-05').expected);
    const ms = Object.fromEntries(t.milestones.map(m => [m.key, m]));
    assert.equal(ms.partner_confirmed.state, 'open', 'accepted, not confirmed');
    assert.equal(ms.vietnamese_done.state, 'open', 'a passage is not proofread');
    assert.doesNotMatch(JSON.stringify(Object.keys(t)), /safe/i);
  });

  test('GET timeline: 401 guest, 404 non-member and malformed id', async () => {
    await use(null);
    assert.equal((await timeline(PROJECT)).status, 401);
    await resetFakes();
    await use({ id: OTHER });
    assert.equal((await timeline(PROJECT)).status, 404);
    assert.equal((await timeline('x')).status, 404);
  });

  test('D10: PATCH with buffer_days 14 → 200 through app_update_project; 5 → 422 before the RPC', async () => {
    const { userClient } = await use({ id: OWNER });
    assert.equal((await patch({ buffer_days: 14 })).status, 200);
    assert.equal(userClient.calls.find(c => c.rpc === 'app_update_project').args.p_fields.buffer_days, 14);
    const bad = await patch({ buffer_days: 5 });
    assert.equal(bad.status, 422);
    assert.equal((await bad.json()).fields.buffer_days, 'projects.error.buffer_days');
  });
});
