import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase, useFakes, resetFakes } from './supabase-fake.js';

// Collaboration request routes with the Supabase fake (T048, FR-012..FR-015, BR-005, BR-008; contracts/requests-api.contract.md).
const OWNER = '11111111-1111-4111-8111-111111111111';
const VIEWER = '22222222-2222-4222-8222-222222222222';
const PARTNER = '33333333-3333-4333-8333-333333333333';
const PROJECT = '44444444-4444-4444-8444-444444444444';
const ORG = '55555555-5555-4555-8555-555555555555';
const REQ = '66666666-6666-4666-8666-666666666666';
const OLD = '77777777-7777-4777-8777-777777777777';
const fail = (message) => () => ({ data: null, error: { code: 'P0001', message } });

function fakes({ user = { id: OWNER }, rpc = {} } = {}) {
  const tables = {
    user_account: [{ user_id: OWNER, role: 'member', account_status: 'active', email: 'owner@example.test' },
      { user_id: VIEWER, role: 'member', account_status: 'active', email: 'viewer@example.test' },
      { user_id: PARTNER, role: 'partner', account_status: 'active', email: 'partner@example.test' }],
    profile: [{ user_id: OWNER, full_name: 'Owner' }, { user_id: PARTNER, full_name: 'Partner' }],
    project: [{ project_id: PROJECT, project_name: 'Lantern Street', format: 'feature', shoot_date: '2027-06-01', crew_size_band: 'o50', stage: 'preparing' }],
    project_member: [{ project_id: PROJECT, user_id: OWNER, permission: 'owner', invite_status: 'accepted' },
      { project_id: PROJECT, user_id: VIEWER, permission: 'view', invite_status: 'accepted' }],
    organisation: [{ org_id: ORG, slug: 'benxua', org_name: 'Bến Xưa Production Services', service_groups: ['full_production'], provinces: [19],
      verified_at: '2026-06-12T11:00:00+07:00', verified_until: '2099-06-12', art13_eligible: true, org_status: 'active' }],
    organisation_user: [{ org_id: ORG, user_id: PARTNER, added_at: '2026-06-10T10:30:00+07:00' }],
    collab_request: [
      { request_id: REQ, project_id: PROJECT, org_id: ORG, services: ['full_production'], note: 'Night market', status: 'accepted', response_note: 'Yes',
        sent_at: '2026-10-01T09:30:00+07:00', responded_at: '2026-10-02T15:10:00+07:00', confirmed_at: null },
      { request_id: OLD, project_id: PROJECT, org_id: ORG, services: ['crew'], note: null, status: 'declined', response_note: null,
        sent_at: '2026-09-01T09:30:00+07:00', responded_at: '2026-09-02T15:10:00+07:00', confirmed_at: null }],
    collab_message: [{ message_id: 'm1', request_id: REQ, author_id: PARTNER, created_at: '2026-10-02T15:10:00+07:00', body: 'Yes' }],
    nda_acceptance: [{ nda_acceptance_id: 'n1', request_id: REQ, party: 'partner', nda_version: 'NDA-2026.1', accepted: true, accepted_at: '2026-10-02T15:10:00+07:00' }],
    document_slot: [{ project_id: PROJECT, doc_code: 'A13_SERVICE_AGREEMENT', state: 'missing' }],
    notification: [], email_delivery: []
  };
  const handlers = {
    app_send_collab_request: () => ({ data: { request_id: 'new-req', status: 'pending', step: 1 }, error: null }),
    app_respond_collab_request: () => ({ data: { request_id: REQ, status: 'under_review' }, error: null }),
    app_accept_nda: () => ({ data: { request_id: REQ, producer: true }, error: null }),
    app_confirm_collab_request: () => ({ data: { request_id: REQ, status: 'confirmed', confirmed_at: '2026-11-06T10:00:00+07:00' }, error: null }),
    app_withdraw_collab_request: () => ({ data: { request_id: REQ, status: 'withdrawn' }, error: null }),
    app_post_collab_message: () => ({ data: { message_id: 'm2', created_at: '2026-11-06T10:00:00+07:00' }, error: null }),
    app_deactivate_org: () => ({ data: { org_status: 'deactivated', withdrawn: [REQ] }, error: null }),
    ...rpc
  };
  const userClient = fakeSupabase({ user, tables, rpc: handlers });
  const admin = fakeSupabase({ user, store: userClient.tables, rpc: handlers });
  return { userClient, admin };
}
async function use(options) { const f = fakes(options); await useFakes({ user: f.userClient, admin: f.admin }); return f; }
const req = (url, method = 'GET', body) => new Request(`http://localhost:3000${url}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
const route = (p) => import(`../../app/api/${p}/route.js`);
const send = async (body) => (await route('requests')).POST(req('/api/requests', 'POST', body));
const list = async (qs) => (await route('requests')).GET(req(`/api/requests${qs}`));
const one = async (id) => (await route('requests/[id]')).GET(req(`/api/requests/${id}`), { params: { id } });
const act = async (action, id, body = {}) => (await route(`requests/[id]/${action}`)).POST(req(`/api/requests/${id}/${action}`, 'POST', body), { params: { id } });
const deactivate = async (body) => (await route('partners/me/deactivate')).POST(req('/api/partners/me/deactivate', 'POST', body));
const rpcCall = (client, name) => client.calls.find(c => c.rpc === name);

describe('Collaboration request routes (T048)', () => {
  afterEach(resetFakes);

  test('POST /api/requests: 201 through app_send_collab_request; 401 guest; 422 before any RPC', async () => {
    const { userClient } = await use();
    const res = await send({ project_id: PROJECT, org_id: ORG, services: ['full_production'], note: 'Night market' });
    assert.equal(res.status, 201);
    assert.deepEqual(await res.json(), { request_id: 'new-req', status: 'pending', step: 1 });
    assert.deepEqual(rpcCall(userClient, 'app_send_collab_request').args, { p_project_id: PROJECT, p_org_id: ORG, p_services: ['full_production'], p_note: 'Night market' });
    await resetFakes();
    const v = await use();
    for (const body of [{ project_id: PROJECT, org_id: ORG, services: [] }, { project_id: PROJECT, org_id: ORG, services: ['visa'] },
      { project_id: 'x', org_id: ORG, services: ['crew'] }, { project_id: PROJECT, org_id: ORG, services: ['crew'], note: 'x'.repeat(1001) }]) {
      const r = await send(body);
      assert.equal(r.status, 422, JSON.stringify(body).slice(0, 60));
      assert.ok((await r.json()).fields);
    }
    assert.equal(v.userClient.calls.some(c => c.rpc), false);
    await resetFakes();
    await use({ user: null });
    assert.equal((await send({ project_id: PROJECT, org_id: ORG, services: ['crew'] })).status, 401);
  });

  test('database refusals map to their statuses (BR-005, BR-008, M0 BR-005)', async () => {
    for (const [code, status] of [['OPEN_REQUEST_EXISTS', 409], ['ORG_DEACTIVATED', 409], ['ARCHIVED', 409], ['FORBIDDEN', 403], ['NOT_FOUND', 404]]) {
      await use({ rpc: { app_send_collab_request: fail(code) } });
      const res = await send({ project_id: PROJECT, org_id: ORG, services: ['crew'] });
      assert.equal(res.status, status, code);
      assert.equal((await res.json()).error, code);
      await resetFakes();
    }
    for (const [action, rpcName, code, status] of [['respond', 'app_respond_collab_request', 'NDA_REQUIRED', 422], ['confirm', 'app_confirm_collab_request', 'INVALID_STATE', 409],
      ['withdraw', 'app_withdraw_collab_request', 'INVALID_STATE', 409], ['nda', 'app_accept_nda', 'INVALID_STATE', 409]]) {
      await use({ user: { id: action === 'respond' ? PARTNER : OWNER }, rpc: { [rpcName]: fail(code) } });
      const body = action === 'respond' ? { decision: 'accepted', nda_accepted: true } : action === 'nda' ? { nda_version: 'NDA-2026.1', accepted: true } : {};
      assert.equal((await act(action, REQ, body)).status, status, `${action} ${code}`);
      await resetFakes();
    }
  });

  test('respond: the RPC gets the decision, the note and the current NDA version; invalid decisions are 422', async () => {
    const { userClient } = await use({ user: { id: PARTNER } });
    assert.equal((await act('respond', REQ, { decision: 'accepted', nda_accepted: true, note: 'Yes' })).status, 200);
    assert.deepEqual(rpcCall(userClient, 'app_respond_collab_request').args,
      { p_request_id: REQ, p_decision: 'accepted', p_note: 'Yes', p_nda_accepted: true, p_nda_version: 'NDA-2026.1' });
    assert.equal((await act('respond', REQ, { decision: 'confirmed' })).status, 422, 'the partner cannot confirm');
    assert.equal((await act('respond', REQ, { decision: 'under_review', note: 'x'.repeat(2001) })).status, 422);
  });

  test('nda: accepted:false or another version is 422 (analysis U3); messages 1–2000 characters', async () => {
    await use();
    assert.equal((await act('nda', REQ, { nda_version: 'NDA-2026.1', accepted: false })).status, 422);
    assert.equal((await act('nda', REQ, { nda_version: 'NDA-1999.1', accepted: true })).status, 422);
    assert.equal((await act('nda', REQ, { nda_version: 'NDA-2026.1', accepted: true })).status, 200);
    assert.equal((await act('messages', REQ, { body: '' })).status, 422);
    assert.equal((await act('messages', REQ, { body: 'x'.repeat(2001) })).status, 422);
    const ok = await act('messages', REQ, { body: 'Thanks' });
    assert.equal(ok.status, 201);
    assert.deepEqual(await ok.json(), { message_id: 'm2', created_at: '2026-11-06T10:00:00+07:00' });
  });

  test('GET /api/requests/:id: the shape of the contract, for the owner', async () => {
    await use();
    const res = await one(REQ);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'accepted');
    assert.equal(body.step, 3, 'accepted, the producer NDA not ticked yet (D7)');
    assert.equal(body.final, false);
    assert.deepEqual(body.nda, { version: 'NDA-2026.1', producer: false, partner: true });
    assert.deepEqual(body.can, { respond: false, accept_nda: true, confirm: false, withdraw: true, message: true });
    assert.equal(body.component_c, 'missing');
    assert.equal(body.organisation.slug, 'benxua');
    assert.equal(body.project.project_name, 'Lantern Street');
    assert.deepEqual(body.messages.map(m => [m.author, m.body]), [['partner', 'Yes']]);
    assert.equal(typeof body.quiet_days, 'number');
    assert.equal((await one('not-a-uuid')).status, 404);
  });

  test('GET lists: one project, most recently updated first; outgoing for a member; incoming for a partner', async () => {
    await use();
    let body = await (await list(`?project_id=${PROJECT}`)).json();
    assert.deepEqual(body.requests.map(r => r.request_id), [REQ, OLD]);
    body = await (await list('?direction=outgoing')).json();
    assert.deepEqual(body.requests.map(r => r.request_id).sort(), [OLD, REQ].sort());
    assert.equal(body.requests[0].project.project_name, 'Lantern Street');
    assert.equal((await list('?direction=incoming')).status, 403, 'a member has no inbox');
    await resetFakes();
    await use({ user: { id: PARTNER } });
    body = await (await list('?direction=incoming')).json();
    assert.deepEqual(body.requests.map(r => r.request_id), [REQ, OLD], 'open ones first');
    assert.equal((await list('?direction=outgoing')).status, 403, 'analysis C3: a partner has no outgoing list');
  });

  test('BR-008: POST /api/partners/me/deactivate checks the typed name first, then answers the withdrawn count', async () => {
    const { userClient } = await use({ user: { id: PARTNER } });
    assert.equal((await deactivate({ typed_name: '' })).status, 422);
    const res = await deactivate({ typed_name: 'Bến Xưa Production Services' });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { org_status: 'deactivated', withdrawn: 1 });
    assert.deepEqual(rpcCall(userClient, 'app_deactivate_org').args, { p_org_id: ORG, p_typed_name: 'Bến Xưa Production Services' });
  });
});
