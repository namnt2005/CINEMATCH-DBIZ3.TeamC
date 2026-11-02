import { randomUUID } from 'node:crypto';
import { query, getOne, withTransaction } from '../client.js';
import { nowInVietnam } from '../audit.js';
import { PAGE_SIZE, asNotification } from '../notification-shape.js';

// Events created in the same millisecond still keep their order (newest first, SR-242)
let lastStamp = '';
function stamp() {
  let now = nowInVietnam();
  if (now <= lastStamp) now = new Date(Date.parse(lastStamp) + 1 + 7 * 3600 * 1000).toISOString().replace('Z', '+07:00');
  lastStamp = now;
  return now;
}

/** One notification and, unless the recipient is deactivated, one queued email (FR-007, FR-008, SR-243). */
export function notify({ recipientId, eventType, payload = {} }) {
  const account = getOne('SELECT email, account_status FROM user_account WHERE user_id = ?', [recipientId]);
  const notificationId = randomUUID();
  withTransaction((db) => {
    db.prepare('INSERT INTO notification (notification_id, recipient_id, event_type, payload, created_at, read_at) VALUES (?, ?, ?, ?, ?, NULL)')
      .run(notificationId, recipientId, eventType, JSON.stringify(payload), stamp());
    if (account && account.account_status !== 'deactivated') {
      db.prepare('INSERT INTO email_delivery (email_delivery_id, notification_id, template_id, recipient_email, variables, delivery_status, provider_message_id) VALUES (?, ?, ?, ?, ?, ?, NULL)')
        .run(randomUUID(), notificationId, eventType, account.email, JSON.stringify(payload), 'queued');
    }
  });
  return { notification_id: notificationId };
}

export function unreadCount(userId) {
  return Number(getOne('SELECT COUNT(*) AS n FROM notification WHERE recipient_id = ? AND (read_at IS NULL OR read_at = \'\')', [userId]).n);
}

export function listNotifications(userId, { unreadOnly = false, before = null } = {}) {
  const where = ['recipient_id = ?'];
  const params = [userId];
  if (unreadOnly) where.push("(read_at IS NULL OR read_at = '')");
  if (before) { where.push('created_at < ?'); params.push(before); }
  const rows = query(`SELECT * FROM notification WHERE ${where.join(' AND ')} ORDER BY created_at DESC, notification_id DESC LIMIT ?`, [...params, PAGE_SIZE + 1]);
  return {
    notifications: rows.slice(0, PAGE_SIZE).map(asNotification),
    has_more: rows.length > PAGE_SIZE,
    unread_count: unreadCount(userId)
  };
}

/** Sets read_at on the user's own unread rows only (SR-241). */
export function markRead(userId, { ids, all }) {
  const now = nowInVietnam();
  if (all) {
    query("UPDATE notification SET read_at = ? WHERE recipient_id = ? AND (read_at IS NULL OR read_at = '')", [now, userId]);
  } else {
    const marks = ids.map(() => '?').join(', ');
    query(`UPDATE notification SET read_at = ? WHERE recipient_id = ? AND (read_at IS NULL OR read_at = '') AND notification_id IN (${marks})`, [now, userId, ...ids]);
  }
  return { unread_count: unreadCount(userId) };
}
