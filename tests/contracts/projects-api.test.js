import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase, useFakes, resetFakes } from './supabase-fake.js';

// POST and GET /api/projects (FR-001, FR-003, BR-001; specs/005-m0-workspace contracts/projects-api.contract.md)
const ME = '11111111-1111-4111-8111-111111111111';
const NEW_ID = '33333333-3333-4333-8333-333333333333';
const P1 = '44444444-4444-4444-8444-444444444444';
const P2 = '55555555-5555-4555-8555-555555555555';
const P3 = '66666666-6666-4666-8666-666666666666';
const provinces = Array.from({ length: 34 }, (_, i) => ({ province_id: i + 1, name: `Province ${i + 1}`, slug: `p${i + 1}`, region: 'north' }));

function client({ user = { id: ME }, rpc = {} } = {}) {
  return fakeSupabase({
    user,
    rpc: { app_create_project: () => ({ data: NEW_ID, error: null }), ...rpc },
    tables: {
      user_account: [{ user_id: ME, role: 'member', account_status: 'active', email: 'me@example.test' }],
      province: provinces,
      project_member: [
        { project_id: P1, user_id: ME, permission: 'owner', invite_status: 'accepted' },
        { project_id: P2, user_id: ME, permission: 'view', invite_status: 'accepted' },
        { project_id: P3, user_id: ME, permission: 'edit', invite_status: 'accepted' }
      ],
      project: [
        { project_id: P1, project_name: 'One', format: 'feature', segment: 'A', stage: 'draft', shoot_date: null, updated_at: '2026-11-02T10:00:00+07:00' },
        { project_id: P2, project_name: 'Two', format: 'tv', segment: 'C', stage: 'preparing', shoot_date: '2027-01-01', updated_at: '2026-11-01T10:00:00+07:00' },
        { project_id: P3, project_name: 'Three', format: 'tv', segment: 'B', stage: 'archived', shoot_date: null, updated_at: '2026-10-01T10:00:00+07:00' }
      ],
      // Numbers no route could compute from the rows above: they must come from the view
      v_project_readiness: [
        { project_id: P1, readiness_total: '42.50', next_action_primary: 'locations.choose_backup' },
        { project_id: P2, readiness_total: '12.34', next_action_primary: 'partners.confirm' },
        { project_id: P3, readiness_total: '99.00', next_action_primary: 'done' }
      ]
    }
  });
}
const post = async (body) => (await import('../../app/api/projects/route.js')).POST(new Request('http://localhost:3000/api/projects', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
}));
const get = async (qs = '') => (await import('../../app/api/projects/route.js')).GET(new Request(`http://localhost:3000/api/projects${qs}`));
const VALID = { project_name: 'The Night Ferry', format: 'feature', segment: 'A' };

describe('POST /api/projects (T015, FR-001)', () => {
  afterEach(resetFakes);

  test('FR-001: a guest gets 401 and nothing is created', async () => {
    const c = client({ user: null });
    await useFakes({ user: c });
    assert.equal((await post(VALID)).status, 401);
    assert.ok(!c.calls.some(q => q.rpc));
  });

  test('FR-001, D2: 201 { project_id } through app_create_project, never a direct insert', async () => {
    const c = client();
    await useFakes({ user: c });
    const res = await post({ ...VALID, project_name: '  The Night Ferry ', provinces: [3, 1] });
    assert.equal(res.status, 201);
    assert.deepEqual(await res.json(), { project_id: NEW_ID });
    const call = c.calls.find(q => q.rpc === 'app_create_project');
    assert.equal(call.args.p_project_name, 'The Night Ferry');
    assert.equal(call.args.p_segment, 'A');
    assert.deepEqual(call.args.p_provinces, [1, 3]);
    assert.ok(!c.calls.some(q => q.op === 'insert'), 'no direct insert');
  });

  test('FR-001: 422 VALIDATION_ERROR with every field error, and no call to the database function', async () => {
    const c = client();
    await useFakes({ user: c });
    const res = await post({ project_name: '', format: 'x' });
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error, 'VALIDATION_ERROR');
    assert.deepEqual(Object.keys(body.fields).sort(), ['format', 'project_name', 'segment']);
    assert.ok(!c.calls.some(q => q.rpc));
  });

  for (const code of ['NAME_TAKEN', 'NO_ORGANISATION']) {
    test(`FR-001: 409 ${code} when the database function refuses`, async () => {
      await useFakes({ user: client({ rpc: { app_create_project: () => ({ data: null, error: { code: 'P0001', message: code } }) } }) });
      const res = await post(VALID);
      assert.equal(res.status, 409);
      assert.equal((await res.json()).error, code);
    });
  }
});

describe('GET /api/projects (T015, FR-003, BR-001, BR-005)', () => {
  afterEach(resetFakes);

  test('FR-003: a guest gets 401', async () => {
    await useFakes({ user: client({ user: null }) });
    assert.equal((await get()).status, 401);
  });

  test('BR-001: every card carries readiness_total and next_action_primary read from the view', async () => {
    await useFakes({ user: client() });
    const body = await (await get()).json();
    const one = body.projects.find(p => p.project_id === P1);
    assert.equal(one.readiness_total, 42.5);
    assert.equal(one.next_action_primary, 'locations.choose_backup');
    assert.equal(one.permission, 'owner');
  });

  test('BR-005: archived projects are out of the default list, shown with ?stage=archived; counts per stage', async () => {
    await useFakes({ user: client() });
    const all = await (await get()).json();
    assert.deepEqual(all.projects.map(p => p.project_id), [P1, P2]);
    assert.deepEqual(all.counts, { draft: 1, preparing: 1, archived: 1 });
    const archived = await (await get('?stage=archived')).json();
    assert.deepEqual(archived.projects.map(p => p.project_id), [P3]);
  });

  test('FR-003: an unknown stage is refused with 422', async () => {
    await useFakes({ user: client() });
    assert.equal((await get('?stage=shot')).status, 422);
  });
});
