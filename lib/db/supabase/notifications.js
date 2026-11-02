import { randomUUID } from 'node:crypto';
import { userDb, systemDb, rows } from './util.js';
import { nowInVietnam } from '../audit.js';
import { PAGE_SIZE, asNotification } from '../notification-shape.js';

/**
 * Writes are the System actor's (D2): the secret-key client inserts the notification and the queued email
 * (FR-007, FR-008, SR-243). Reads and *mark as read* run as the user, so Row Level Security keeps them to
 * the user's own rows (SR-241); the code filters on recipient_id as well.
 */
export async function notify({ recipientId, eventType, payload = {} }) {
  const db = await systemDb();
  const account = rows(await db.from('user_account').select('email, account_status').eq('user_id', recipientId).maybeSingle());
  const notificationId = randomUUID();
  rows(await db.from('notification').insert({
    notification_id: notificationId, recipient_id: recipientId, event_type: eventType, payload, created_at: nowInVietnam(), read_at: null
  }));
  if (account && account.account_status !== 'deactivated') {
    rows(await db.from('email_delivery').insert({
      email_delivery_id: randomUUID(), notification_id: notificationId, template_id: eventType,
      recipient_email: account.email, variables: payload, delivery_status: 'queued', provider_message_id: null
    }));
  }
  return { notification_id: notificationId };
}

export async function unreadCount(userId) {
  const db = await userDb();
  const { count } = await db.from('notification').select('notification_id', { count: 'exact', head: true })
    .eq('recipient_id', userId).is('read_at', null);
  return count ?? 0;
}

export async function listNotifications(userId, { unreadOnly = false, before = null } = {}) {
  const db = await userDb();
  let q = db.from('notification').select('notification_id, recipient_id, event_type, payload, created_at, read_at').eq('recipient_id', userId);
  if (unreadOnly) q = q.is('read_at', null);
  if (before) q = q.lt('created_at', before);
  const list = rows(await q.order('created_at', { ascending: false }).limit(PAGE_SIZE + 1));
  return {
    notifications: list.slice(0, PAGE_SIZE).map(asNotification),
    has_more: list.length > PAGE_SIZE,
    unread_count: await unreadCount(userId)
  };
}

export async function markRead(userId, { ids, all }) {
  const db = await userDb();
  // Only read_at is sent: the column grant allows nothing else (data-model §4)
  let q = db.from('notification').update({ read_at: nowInVietnam() }).eq('recipient_id', userId).is('read_at', null);
  if (!all) q = q.in('notification_id', ids);
  rows(await q);
  return { unread_count: await unreadCount(userId) };
}
