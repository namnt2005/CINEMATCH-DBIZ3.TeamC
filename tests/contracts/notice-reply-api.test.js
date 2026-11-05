import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase, useFakes, resetFakes } from './supabase-fake.js';

// POST /api/notices/:id/reply with the Supabase fake (T028, FR-003, BR-003, D3)
const MEMBER = '11111111-1111-4111-8111-111111111111';
const STAFF = '22222222-2222-4222-8222-222222222222';
const NOTICE = '66666666-6666-4666-8666-666666666666';
const fail = (message) => () => ({ data: null, error: { code: 'P0001', message } });
async function use({ user = { id: MEMBER }, rpc = {} } = {}) {
  const tables = { user_account: [{ user_id: MEMBER, role: 'member', account_status: 'active' }, { user_id: STAFF, role: 'vfda_staff', account_status: 'active' }] };
  const handlers = { app_record_province_reply: () => ({ data: { response: 'received' }, error: null }), ...rpc };
  const userClient = fakeSupabase({ user, tables, rpc: handlers });
  const admin = fakeSupabase({ user, store: userClient.tables, rpc: handlers });
  await useFakes({ user: userClient, admin });
  return userClient;
}
const reply = async (body, id = NOTICE) => (await import('../../app/api/notices/[id]/reply/route.js')).POST(
  new Request(`http://localhost:3000/api/notices/${id}/reply`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }), { params: { id } });

describe('POST /api/notices/:id/reply (T028)', () => {
  afterEach(resetFakes);

  test('401 guest; 404 malformed id', async () => {
    await use({ user: null });
    assert.equal((await reply({ response: 'received' })).status, 401);
    await resetFakes();
    await use();
    assert.equal((await reply({ response: 'received' }, 'nope')).status, 404);
  });

  test('BR-003: a value other than the three is 422 before any call', async () => {
    const c = await use();
    const res = await reply({ response: 'approved' });
    assert.equal(res.status, 422);
    assert.equal((await res.json()).fields.response, 'notices.error.response_invalid');
    assert.ok(!c.calls.some(x => x.rpc));
  });

  test('D3: a member and a staff member both record through app_record_province_reply, with the note as entered', async () => {
    for (const id of [MEMBER, STAFF]) {
      await resetFakes();
      const c = await use({ user: { id } });
      const res = await reply({ response: 'info_needed', note: ' Cần lịch quay. ' });
      assert.equal(res.status, 200, id);
      assert.deepEqual(c.calls.find(x => x.rpc === 'app_record_province_reply').args, { p_interest_id: NOTICE, p_response: 'info_needed', p_note: ' Cần lịch quay. ' });
    }
  });

  test('403 for view; 409 INVALID_STATE before the download; 404 for a non-member', async () => {
    for (const [code, status] of [['FORBIDDEN', 403], ['INVALID_STATE', 409], ['NOT_FOUND', 404]]) {
      await resetFakes();
      await use({ rpc: { app_record_province_reply: fail(code) } });
      assert.equal((await reply({ response: 'received' })).status, status, code);
    }
  });
});
