import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fakeSupabase, useFakes, resetFakes } from './supabase-fake.js';

// Provincial notice routes with the Supabase fake (T014, FR-001, FR-002, BR-001, D7, contracts/notices-api.contract.md)
const MEMBER = '11111111-1111-4111-8111-111111111111';
const STAFF = '22222222-2222-4222-8222-222222222222';
const PROJECT = '44444444-4444-4444-8444-444444444444';
const DRAFT = '55555555-5555-4555-8555-555555555555';
const APPROVED = '66666666-6666-4666-8666-666666666666';
const LOCATION = '77777777-7777-4777-8777-777777777777';
const fail = (message) => () => ({ data: null, error: { code: 'P0001', message } });

function fakes({ user = { id: MEMBER }, role = 'member', rpc = {} } = {}) {
  const tables = {
    user_account: [{ user_id: MEMBER, role: 'member', account_status: 'active' }, { user_id: STAFF, role, account_status: 'active' }],
    project: [{ project_id: PROJECT, project_name: 'Rice and Salt', shoot_date: '2027-05-10', stage: 'preparing' }],
    province: [{ province_id: 19, name: 'Ninh Bình' }],
    location_interest: [{ interest_id: DRAFT, project_id: PROJECT, location_id: LOCATION }, { interest_id: APPROVED, project_id: PROJECT, location_id: LOCATION }],
    province_notice: [
      { interest_id: DRAFT, province_id: 19, project_summary: 'Rice and Salt — documentary.', review_status: 'draft', delivery_status: null },
      { interest_id: APPROVED, province_id: 19, project_summary: 'Rice and Salt — documentary.', review_status: 'approved', delivery_status: 'queued' }
    ]
  };
  const handlers = {
    app_express_interest: () => ({ data: { interest_id: DRAFT, notice_id: DRAFT, created: true }, error: null }),
    app_submit_notice: () => ({ data: { review_status: 'submitted' }, error: null }),
    app_mark_notice_downloaded: () => ({ data: { delivery_status: 'downloaded', recipient: 'peoples_committee', sent_at: '2026-11-06T10:00:00+07:00' }, error: null }),
    app_review_notice: () => ({ data: { review_status: 'approved' }, error: null }),
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
const req = (url, method = 'GET', body) => new Request(`http://localhost:3000${url}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
const route = (p) => import(`../../app/api/${p}/route.js`);
const interests = async (body, id = PROJECT) => (await route('projects/[id]/interests')).POST(req(`/api/projects/${id}/interests`, 'POST', body), { params: { id } });
const submit = async (id) => (await route('notices/[id]/submit')).POST(req(`/api/notices/${id}/submit`, 'POST'), { params: { id } });
const download = async (id, body) => (await route('notices/[id]/download')).POST(req(`/api/notices/${id}/download`, 'POST', body), { params: { id } });
const letter = async (id, recipient = 'peoples_committee') => (await route('notices/[id]/letter')).GET(req(`/api/notices/${id}/letter?format=docx&recipient=${recipient}`), { params: { id } });
const staffList = async () => (await route('admin/notices')).GET(req('/api/admin/notices?status=submitted'));
const review = async (id, body) => (await route('admin/notices/[id]/review')).POST(req(`/api/admin/notices/${id}/review`, 'POST', body), { params: { id } });

describe('Notice routes (T014)', () => {
  afterEach(resetFakes);

  test('every route answers 401 to a guest', async () => {
    await use({ user: null });
    for (const res of [await interests({ location_id: LOCATION }), await submit(DRAFT), await download(APPROVED, { recipient: 'peoples_committee' }),
      await letter(APPROVED), await staffList(), await review(DRAFT, { decision: 'approve' })]) {
      assert.equal(res.status, 401);
    }
  });

  test('a malformed id is 404 before any database call', async () => {
    const { userClient } = await use();
    for (const res of [await submit('undefined'), await download('undefined', { recipient: 'peoples_committee' }), await letter('undefined')]) assert.equal(res.status, 404);
    assert.ok(!userClient.calls.some(c => c.rpc || (c.table && c.table !== 'user_account')));
  });

  test('FR-001, FR-002: the interest goes through app_express_interest; a project_summary in the body is ignored', async () => {
    const { userClient } = await use();
    const res = await interests({ location_id: LOCATION, project_summary: 'Anything the browser writes' });
    assert.equal(res.status, 201);
    assert.deepEqual(await res.json(), { interest_id: DRAFT, notice_id: DRAFT, created: true });
    assert.deepEqual(userClient.calls.find(c => c.rpc === 'app_express_interest').args, { p_project_id: PROJECT, p_location_id: LOCATION });
  });

  test('US-1 Scenario 2: submit without a first shooting day is 422 SHOOT_DATE_REQUIRED', async () => {
    await use({ rpc: { app_submit_notice: fail('SHOOT_DATE_REQUIRED') } });
    const res = await submit(DRAFT);
    assert.equal(res.status, 422);
    assert.equal((await res.json()).error, 'SHOOT_DATE_REQUIRED');
  });

  test('BR-001: a notice VFDA has not approved cannot be downloaded (404) nor recorded (404)', async () => {
    const { userClient } = await use({ rpc: { app_mark_notice_downloaded: fail('NOT_FOUND') } });
    assert.equal((await letter(DRAFT)).status, 404);
    assert.equal((await download(DRAFT, { recipient: 'peoples_committee' })).status, 404);
    assert.ok(userClient.calls.some(c => c.rpc === 'app_mark_notice_downloaded'), 'the database decides');
  });

  test('BR-001, BR-002: once approved, the letter downloads as a .docx attachment', async () => {
    await use();
    const res = await letter(APPROVED);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    assert.match(res.headers.get('content-disposition'), /^attachment; filename="notice-[a-z0-9-]+\.docx"$/);
    assert.ok((await res.arrayBuffer()).byteLength > 0);
  });

  test('D7, U2: reading the letter records nothing — no function call and no update', async () => {
    const { userClient, admin } = await use();
    await letter(APPROVED);
    for (const c of [...userClient.calls, ...admin.calls]) {
      assert.ok(!c.rpc, `unexpected rpc ${c.rpc}`);
      assert.notEqual(c.op, 'update');
    }
  });

  test('D7: POST download records the recipient through app_mark_notice_downloaded; view → 403; bad recipient → 422 with no call', async () => {
    const { userClient } = await use();
    const ok = await download(APPROVED, { recipient: 'culture_department' });
    assert.equal(ok.status, 200);
    assert.deepEqual(userClient.calls.find(c => c.rpc === 'app_mark_notice_downloaded').args, { p_interest_id: APPROVED, p_recipient: 'culture_department' });
    await resetFakes();
    const second = await use();
    assert.equal((await download(APPROVED, { recipient: 'ministry' })).status, 422);
    assert.ok(!second.userClient.calls.some(c => c.rpc));
    await resetFakes();
    await use({ rpc: { app_mark_notice_downloaded: fail('FORBIDDEN') } });
    assert.equal((await download(APPROVED, { recipient: 'culture_department' })).status, 403);
  });

  test('U2: the print page reads the letter and calls no recording function', () => {
    const file = 'app/projects/[id]/provinces/[noticeId]/print/page.js';
    assert.ok(fs.existsSync(file), `${file} missing`);
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /markDownloaded|app_mark_notice_downloaded|\/download/);
  });

  test('R6: the staff queue and the review are for vfda_staff and admin only', async () => {
    await use();
    assert.equal((await staffList()).status, 403);
    assert.equal((await review(DRAFT, { decision: 'approve' })).status, 403);
    for (const role of ['vfda_staff', 'admin']) {
      await resetFakes();
      await use({ user: { id: STAFF }, role });
      assert.equal((await staffList()).status, 200, role);
    }
  });

  test('R6: a request for changes without a note is 422 NOTE_REQUIRED, before any call; approve goes through app_review_notice', async () => {
    const { userClient } = await use({ user: { id: STAFF }, role: 'vfda_staff' });
    const res = await review(DRAFT, { decision: 'request_changes', note: ' ' });
    assert.equal(res.status, 422);
    assert.equal((await res.json()).error, 'NOTE_REQUIRED');
    assert.ok(!userClient.calls.some(c => c.rpc));
    assert.equal((await review(DRAFT, { decision: 'approve' })).status, 200);
    assert.deepEqual(userClient.calls.find(c => c.rpc === 'app_review_notice').args, { p_interest_id: DRAFT, p_decision: 'approve', p_note: null });
  });
});
