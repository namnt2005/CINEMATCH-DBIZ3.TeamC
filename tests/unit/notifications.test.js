import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase, useFakes, resetFakes } from '../contracts/supabase-fake.js';

const loadNotifications = () => import('../../lib/db/notifications.js');

const PARK = '4ef79de6-8efb-58f7-8514-9c0532345ac4';       // Lena Park, member, 3 seed notifications (1 unread)
const SOPHIE = '95f36904-6141-5469-8c63-712a80a4295e';     // Sophie Laurent, member, 2 unread
const DEACTIVATED = '2e513ee3-0d58-52f1-b847-91de33b554ce'; // the seed's deactivated account

describe('notify() and the notification list on node:sqlite (T047, FR-007, FR-008, FR-009, SR-241..243)', () => {
  test('SR-243: one event gives exactly one notification and one queued email, with event type and payload', async () => {
    const { notify, listNotifications } = await loadNotifications();
    const { query } = await import('../../lib/db/client.js');
    const before = query('SELECT COUNT(*) AS n FROM email_delivery')[0].n;
    const { notification_id } = await notify({ recipientId: SOPHIE, eventType: 'collab_request.accepted', payload: { request: 'c7', org: 'Bến Xưa' } });
    assert.ok(notification_id);
    const row = (await listNotifications(SOPHIE)).notifications.find(n => n.notification_id === notification_id);
    assert.equal(row.event_type, 'collab_request.accepted');
    assert.deepEqual(row.payload, { request: 'c7', org: 'Bến Xưa' });
    assert.equal(row.read_at, null);
    const emails = query('SELECT * FROM email_delivery WHERE notification_id = ?', [notification_id]);
    assert.equal(emails.length, 1);
    assert.equal(emails[0].delivery_status, 'queued');
    assert.equal(emails[0].template_id, 'collab_request.accepted');
    assert.equal(emails[0].recipient_email, 'sophie.laurent@lumierenord.example.fr');
    assert.equal(query('SELECT COUNT(*) AS n FROM email_delivery')[0].n, before + 1);
  });

  test('FR-008: a deactivated recipient gets the notification but no email (BR-005)', async () => {
    const { notify } = await loadNotifications();
    const { query } = await import('../../lib/db/client.js');
    const { notification_id } = await notify({ recipientId: DEACTIVATED, eventType: 'verification.expiring', payload: { days_left: 7 } });
    assert.equal(query('SELECT COUNT(*) AS n FROM notification WHERE notification_id = ?', [notification_id])[0].n, 1);
    assert.equal(query('SELECT COUNT(*) AS n FROM email_delivery WHERE notification_id = ?', [notification_id])[0].n, 0);
  });

  test('FR-009 / SR-242: own notifications only, newest first, with the unread count', async () => {
    const { listNotifications } = await loadNotifications();
    const { notifications, unread_count } = await listNotifications(PARK);
    assert.ok(notifications.length >= 3);
    assert.ok(notifications.every(n => n.recipient_id === PARK), 'SR-241');
    const times = notifications.map(n => n.created_at);
    assert.deepEqual(times, [...times].sort().reverse());
    assert.equal(unread_count, notifications.filter(n => n.read_at === null).length);
    const unread = await listNotifications(PARK, { unreadOnly: true });
    assert.ok(unread.notifications.every(n => n.read_at === null));
  });

  test('FR-009: mark as read touches only the user\'s own unread rows and only read_at', async () => {
    const { listNotifications, markRead } = await loadNotifications();
    const sophieRow = (await listNotifications(SOPHIE)).notifications.find(n => n.read_at === null);
    const parkUnread = (await listNotifications(PARK)).notifications.find(n => n.read_at === null);
    // PARK tries to mark SOPHIE's row: nothing happens to it
    await markRead(PARK, { ids: [sophieRow.notification_id] });
    assert.equal((await listNotifications(SOPHIE)).notifications.find(n => n.notification_id === sophieRow.notification_id).read_at, null);
    const result = await markRead(PARK, { ids: [parkUnread.notification_id] });
    const after = (await listNotifications(PARK)).notifications.find(n => n.notification_id === parkUnread.notification_id);
    assert.ok(after.read_at);
    assert.equal(after.event_type, parkUnread.event_type);
    assert.equal(result.unread_count, (await listNotifications(PARK)).unread_count);
    await markRead(SOPHIE, { all: true });
    assert.equal((await listNotifications(SOPHIE)).unread_count, 0);
  });

  test('SC-09 #10: 20 per page, older rows on request', async () => {
    const { notify, listNotifications } = await loadNotifications();
    for (let i = 0; i < 22; i += 1) await notify({ recipientId: SOPHIE, eventType: 'province_notice.received', payload: { province: `P${i}` } });
    const first = await listNotifications(SOPHIE);
    assert.equal(first.notifications.length, 20);
    assert.equal(first.has_more, true);
    const older = await listNotifications(SOPHIE, { before: first.notifications.at(-1).created_at });
    assert.ok(older.notifications.length >= 1);
    assert.ok(older.notifications.every(n => n.created_at < first.notifications.at(-1).created_at));
  });
});

describe('notify() on Supabase (T047, D2: System client)', () => {
  afterEach(resetFakes);

  test('SR-243: the System client inserts one notification and one queued email', async () => {
    const admin = fakeSupabase({ tables: { user_account: [{ user_id: SOPHIE, email: 'sophie.laurent@lumierenord.example.fr', account_status: 'active' }], notification: [], email_delivery: [] } });
    await useFakes({ user: fakeSupabase(), admin });
    const { notify } = await loadNotifications();
    await notify({ recipientId: SOPHIE, eventType: 'collab_request.new', payload: { project: 'The Last Ferry' } });
    assert.equal(admin.tables.notification.length, 1);
    assert.equal(admin.tables.notification[0].recipient_id, SOPHIE);
    assert.equal(admin.tables.email_delivery.length, 1);
    assert.equal(admin.tables.email_delivery[0].delivery_status, 'queued');
  });
});
