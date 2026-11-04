import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase, useFakes, resetFakes } from './supabase-fake.js';

// PATCH / archive / invitations / accept routes with the Supabase fake (FR-002, FR-004, BR-005, D3)
const ME = '11111111-1111-4111-8111-111111111111';
const P1 = '44444444-4444-4444-8444-444444444444';
const MEMBER = '88888888-8888-4888-8888-888888888888';
const fail = (message) => () => ({ data: null, error: { code: 'P0001', message } });

function fakes({ user = { id: ME }, rpc = {} } = {}) {
  const tables = {
    user_account: [{ user_id: ME, role: 'member', account_status: 'active', email: 'me@example.test' }],
    profile: [{ user_id: ME, full_name: 'Test Owner' }],
    project: [{ project_id: P1, project_name: 'One', stage: 'draft' }],
    project_member: [{ member_id: MEMBER, project_id: P1, user_id: null, invitee_email: 'me@example.test', permission: 'edit', invite_status: 'pending' }],
    email_delivery: []
  };
  const handlers = {
    app_update_project: () => ({ data: { project_id: P1, updated_at: '2026-11-03T10:00:00+07:00' }, error: null }),
    app_archive_project: () => ({ data: { project_id: P1, stage: 'archived' }, error: null }),
    app_invite_member: () => ({ data: '99999999-9999-4999-8999-999999999999', error: null }),
    app_accept_invitation: () => ({ data: P1, error: null }),
    ...rpc
  };
  const userClient = fakeSupabase({ user, tables, rpc: handlers });
  const admin = fakeSupabase({ user, store: userClient.tables, rpc: handlers });
  return { userClient, admin };
}
async function use(options) {
  const f = fakes(options);
  await useFakes({ user: f.userClient, admin: f.admin });
  return f;
}
const json = (method, body) => ({ method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
const route = (path) => import(`../../app/api/${path}/route.js`);
const patch = async (body) => (await route('projects/[id]')).PATCH(new Request(`http://localhost:3000/api/projects/${P1}`, json('PATCH', body)), { params: { id: P1 } });
const archive = async () => (await route('projects/[id]/archive')).POST(new Request(`http://localhost:3000/api/projects/${P1}/archive`, json('POST')), { params: { id: P1 } });
const invite = async (body) => (await route('projects/[id]/invitations')).POST(new Request(`http://localhost:3000/api/projects/${P1}/invitations`, json('POST', body)), { params: { id: P1 } });
const invitations = async () => (await route('invitations')).GET(new Request('http://localhost:3000/api/invitations'));
const accept = async (id = MEMBER) => (await route('invitations/[member_id]/accept')).POST(new Request(`http://localhost:3000/api/invitations/${id}/accept`, json('POST')), { params: { member_id: id } });

describe('Project member routes (T039, FR-002, FR-004, BR-005)', () => {
  afterEach(resetFakes);

  test('every route answers 401 to a guest', async () => {
    await use({ user: null });
    for (const res of [await patch({ logline: 'x' }), await archive(), await invite({ invitee_email: 'a@b.vn', permission: 'view' }), await invitations(), await accept()]) {
      assert.equal(res.status, 401);
    }
  });

  test('FR-002: PATCH goes through app_update_project with the checked fields only', async () => {
    const { userClient } = await use();
    const res = await patch({ logline: ' A ferry. ', stage: 'preparing', format: 'tv' });
    assert.equal(res.status, 200);
    assert.deepEqual(userClient.calls.find(c => c.rpc === 'app_update_project').args, { p_project_id: P1, p_fields: { logline: 'A ferry.', stage: 'preparing' } });
    assert.ok(!userClient.calls.some(c => c.op === 'update'), 'no direct update');
  });

  test('FR-002: 422 with fields; 403 FORBIDDEN for view; 409 ARCHIVED; 404 for a non-member; 409 NAME_TAKEN', async () => {
    await use();
    assert.equal((await patch({ stage: 'archived' })).status, 422);
    for (const [code, status] of [['FORBIDDEN', 403], ['ARCHIVED', 409], ['NOT_FOUND', 404], ['NAME_TAKEN', 409]]) {
      await resetFakes();
      await use({ rpc: { app_update_project: fail(code) } });
      const res = await patch({ logline: 'x' });
      assert.equal(res.status, status, code);
      assert.equal((await res.json()).error, code);
    }
  });

  test('BR-005: archive through app_archive_project; refused when already archived; DELETE answers 405', async () => {
    const { userClient } = await use();
    assert.equal((await archive()).status, 200);
    assert.ok(userClient.calls.some(c => c.rpc === 'app_archive_project'));
    await resetFakes();
    await use({ rpc: { app_archive_project: fail('ARCHIVED') } });
    assert.equal((await archive()).status, 409);
    const res = await (await route('projects/[id]')).DELETE(new Request(`http://localhost:3000/api/projects/${P1}`, { method: 'DELETE' }), { params: { id: P1 } });
    assert.equal(res.status, 405);
    assert.equal((await res.json()).error, 'METHOD_NOT_ALLOWED');
  });

  test('FR-004, D3: invite → 201 through app_invite_member and one queued email by the System client', async () => {
    const { userClient, admin } = await use();
    const res = await invite({ invitee_email: ' New@Example.VN ', permission: 'edit' });
    assert.equal(res.status, 201);
    assert.equal(userClient.calls.find(c => c.rpc === 'app_invite_member').args.p_email, 'new@example.vn');
    const queued = admin.calls.find(c => c.table === 'email_delivery' && c.op === 'insert');
    assert.equal(queued.values.template_id, 'project.invite');
    assert.equal(queued.values.delivery_status, 'queued');
    assert.equal(queued.values.notification_id, null);
  });

  test('FR-004: invite 422 for owner permission; 403 for a non-owner; 409 ALREADY_INVITED', async () => {
    await use();
    assert.equal((await invite({ invitee_email: 'a@b.vn', permission: 'owner' })).status, 422);
    for (const [code, status] of [['FORBIDDEN', 403], ['ALREADY_INVITED', 409]]) {
      await resetFakes();
      const { admin } = await use({ rpc: { app_invite_member: fail(code) } });
      assert.equal((await invite({ invitee_email: 'a@b.vn', permission: 'view' })).status, status, code);
      assert.ok(!admin.calls.some(c => c.table === 'email_delivery'), 'no email when refused');
    }
  });

  test('D3: GET /api/invitations lists the pending invitations of the caller\'s email; accept → 200, or 404', async () => {
    await use();
    const list = await (await invitations()).json();
    assert.deepEqual(list.invitations.map(i => [i.member_id, i.project_name, i.permission]), [[MEMBER, 'One', 'edit']]);
    const res = await accept();
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { project_id: P1 });
    await resetFakes();
    await use({ rpc: { app_accept_invitation: fail('NOT_FOUND') } });
    assert.equal((await accept()).status, 404);
  });
});
