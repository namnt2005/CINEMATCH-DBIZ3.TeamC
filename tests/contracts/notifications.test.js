import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase, useFakes, resetFakes } from './supabase-fake.js';

const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const row = (id, recipient, created_at, read_at = null) => ({ notification_id: id, recipient_id: recipient, event_type: 'collab_request.new', payload: { project: 'The Last Ferry' }, created_at, read_at });

function client(user = { id: ME }) {
  return fakeSupabase({
    user,
    tables: {
      user_account: [{ user_id: ME, role: 'member', account_status: 'active' }],
      notification: [
        row('n1', ME, '2026-09-01T10:00:00+07:00'),
        row('n2', ME, '2026-09-03T10:00:00+07:00', '2026-09-03T11:00:00+07:00'),
        row('n3', ME, '2026-09-02T10:00:00+07:00'),
        row('x1', OTHER, '2026-09-04T10:00:00+07:00')
      ]
    }
  });
}

const get = async (qs = '') => (await import('../../app/api/notifications/route.js')).GET(new Request(`http://localhost:3000/api/notifications${qs}`));
const read = async (body) => (await import('../../app/api/notifications/read/route.js')).POST(new Request('http://localhost:3000/api/notifications/read', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));

describe('GET /api/notifications and POST /api/notifications/read (T048, FR-009, US-4 Scenario 2, SR-241, SR-242)', () => {
  afterEach(resetFakes);

  test('FR-009: a guest gets 401', async () => {
    await useFakes({ user: client(null) });
    assert.equal((await get()).status, 401);
    assert.equal((await read({ all: true })).status, 401);
  });

  test('US-4 Scenario 2: own notifications, newest first, with the unread count', async () => {
    const c = client();
    await useFakes({ user: c });
    const res = await get();
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.notifications.map(n => n.notification_id), ['n2', 'n3', 'n1']);
    assert.equal(body.unread_count, 2);
    assert.ok(c.calls.some(q => q.table === 'notification' && q.filters.some(([k, col, v]) => k === 'eq' && col === 'recipient_id' && v === ME)), 'SR-241: own rows asked for');
  });

  test('SC-09 #3: unread_only=true lists unread rows only', async () => {
    await useFakes({ user: client() });
    const body = await (await get('?unread_only=true')).json();
    assert.deepEqual(body.notifications.map(n => n.notification_id), ['n3', 'n1']);
  });

  test('FR-009: mark one as read changes only read_at of the user\'s own row', async () => {
    const c = client();
    await useFakes({ user: c });
    const res = await read({ ids: ['n1', 'x1'] });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).unread_count, 1);
    const update = c.calls.find(q => q.table === 'notification' && q.op === 'update');
    assert.deepEqual(Object.keys(update.values), ['read_at']);
    assert.ok(c.tables.notification.find(n => n.notification_id === 'n1').read_at);
    assert.equal(c.tables.notification.find(n => n.notification_id === 'x1').read_at, null, 'SR-241: another user\'s row is untouched');
  });

  test('SC-09 #4: mark all as read → unread count 0', async () => {
    const c = client();
    await useFakes({ user: c });
    const body = await (await read({ all: true })).json();
    assert.equal(body.unread_count, 0);
    assert.equal(c.tables.notification.find(n => n.notification_id === 'x1').read_at, null);
  });

  test('FR-009: a body with neither ids nor all → 422', async () => {
    await useFakes({ user: client() });
    assert.equal((await read({ ids: 'n1' })).status, 422);
  });
});
